// 3일차(완성본): 이 서버를 실행한 PC 의 네트워크 연결, 방화벽 켜짐 여부, Windows 기록의 경고·오류 건수를 "읽기만" 합니다.
// 서버(src/server.mjs 의 GET /api/pc-security)에서만 불러 쓰고, 브라우저 화면은 이 파일을 직접 쓰지 않습니다.
// - 방화벽·보안 설정을 바꾸는 명령은 없습니다. 실행하는 명령은 아래 고정 목록(읽기 전용)뿐이고, 셸을 거치지 않으며 시간 제한이 있습니다.
// - 관리자 권한이 필요한 항목(예: Security 기록)은 읽지 않습니다. 권한이 모자라 못 읽으면 바꾸려 하지 않고 이유 코드와 함께 확인 불가로 둡니다.
// - 경고·오류 건수는 운영체제가 남긴 기록의 개수일 뿐 침해·공격 탐지 결과가 아닙니다. 기록 내용(메시지)은 읽지도 내보내지도 않습니다.
// - IP·MAC 주소는 개인정보라 내보내지 않고, 인터페이스 이름과 종류만 줍니다.
import os from 'node:os';
import { execFile } from 'node:child_process';

export const COMMAND_TIMEOUT_MS = 8000;
export const EVENT_WINDOW_HOURS = 24;

const POWERSHELL = 'powershell.exe';
const UTF8_PRELUDE = '[Console]::OutputEncoding=[Text.Encoding]::UTF8;$ErrorActionPreference=\'Stop\';';
const psArgs = (script) => ['-NoProfile', '-NonInteractive', '-Command', UTF8_PRELUDE + script];

// ---- 읽기 전용 고정 명령 목록 (여기에 없는 명령은 실행하지 않습니다) ----
export const COMMANDS = Object.freeze({
  darwinPorts: Object.freeze({ file: '/usr/sbin/networksetup', args: ['-listallhardwareports'] }),
  darwinFirewall: Object.freeze({ file: '/usr/libexec/ApplicationFirewall/socketfilterfw', args: ['--getglobalstate'] }),
  winAdapters: Object.freeze({ file: POWERSHELL, args: psArgs("Get-NetAdapter | Where-Object Status -eq 'Up' | Select-Object Name,PhysicalMediaType | ConvertTo-Json -Compress") }),
  winFirewall: Object.freeze({ file: POWERSHELL, args: psArgs('Get-NetFirewallProfile | Select-Object Name,Enabled | ConvertTo-Json -Compress') }),
  // 로그 이름과 단계(2=오류, 3=경고)는 아래 상수에서만 만들고 바깥 입력을 넣지 않습니다.
  winEvents: (logName) => Object.freeze({
    file: POWERSHELL,
    args: psArgs(
      `$s=(Get-Date).AddHours(-${EVENT_WINDOW_HOURS});`
      + `function C($l){try{@(Get-WinEvent -FilterHashtable @{LogName='${logName}';Level=$l;StartTime=$s} -ErrorAction Stop).Count}catch{if($_.FullyQualifiedErrorId -like 'NoMatchingEventsFound*'){0}else{throw}}};`
      + '[pscustomobject]@{Error=(C 2);Warning=(C 3)} | ConvertTo-Json -Compress',
    ),
  }),
});
const WIN_LOGS = Object.freeze({ system: 'System', application: 'Application' });

const now = () => new Date().toISOString();
const unavailable = (reason) => ({ status: 'unavailable', reason, at: now() });

function classify(error, stderr) {
  if (error?.code === 'ENOENT') return 'NOT_SUPPORTED';
  if (error?.code === 'EACCES' || error?.code === 'EPERM') return 'PERMISSION_DENIED';
  if (error?.killed === true || typeof error?.signal === 'string') return 'TIMEOUT';
  if (/access is denied|unauthorized|permission|액세스가 거부|권한/iu.test(`${stderr ?? ''} ${error?.message ?? ''}`)) return 'PERMISSION_DENIED';
  return 'READ_FAILED';
}

// 기본 실행기: 셸 없이 고정 파일과 인자만 실행. 오류 원문은 내보내지 않고 이유 코드만 돌려줍니다.
export function defaultRun({ file, args }) {
  return new Promise((done) => {
    execFile(file, args, { timeout: COMMAND_TIMEOUT_MS, windowsHide: true, maxBuffer: 256 * 1024, encoding: 'utf8' }, (error, stdout, stderr) => {
      done(error ? { ok: false, reason: classify(error, stderr) } : { ok: true, stdout: String(stdout) });
    });
  });
}

const asArray = (value) => (Array.isArray(value) ? value : value == null ? [] : [value]);
function parseJson(text) {
  try { return JSON.parse(text); } catch { return undefined; }
}

// ---- 네트워크 ----
function activeInterfaces(interfaces) {
  const names = [];
  for (const [name, list] of Object.entries(interfaces ?? {})) {
    const hasIpv4 = asArray(list).some((a) => !a.internal && (a.family === 'IPv4' || a.family === 4) && typeof a.address === 'string' && !a.address.startsWith('169.254.'));
    if (hasIpv4) names.push(name);
  }
  return names;
}

function darwinKinds(stdout) {
  const kinds = new Map();
  for (const [, port, device] of stdout.matchAll(/Hardware Port:\s*(.+)\r?\nDevice:\s*(\S+)/gu)) {
    kinds.set(device, /wi-?fi|wireless|airport/iu.test(port) ? 'wireless' : /ethernet|lan/iu.test(port) ? 'wired' : 'unknown');
  }
  return kinds;
}

function windowsKinds(stdout) {
  const kinds = new Map();
  const rows = parseJson(stdout);
  for (const row of asArray(rows)) {
    if (typeof row?.Name !== 'string') continue;
    const media = String(row.PhysicalMediaType ?? '');
    kinds.set(row.Name, /802\.11|wireless|wi-?fi/iu.test(media) ? 'wireless' : /802\.3|ethernet/iu.test(media) ? 'wired' : 'unknown');
  }
  return kinds;
}

async function readNetwork({ platform, run, interfaces }) {
  const names = activeInterfaces(interfaces());
  // 종류(유선·무선)를 못 알아내도 연결 여부 자체는 알려 줍니다. 종류만 unknown 입니다.
  let kinds = new Map();
  const command = platform === 'darwin' ? COMMANDS.darwinPorts : platform === 'win32' ? COMMANDS.winAdapters : null;
  if (command !== null && names.length > 0) {
    const result = await run(command);
    if (result.ok) kinds = platform === 'darwin' ? darwinKinds(result.stdout) : windowsKinds(result.stdout);
  }
  return {
    status: 'ok', at: now(), connected: names.length > 0,
    interfaces: names.slice(0, 8).map((name) => ({ name, kind: kinds.get(name) ?? 'unknown' })),
  };
}

// ---- 방화벽 (읽기만) ----
const toEnabled = (value) => {
  if (value === true || value === 1 || value === 'True') return true;
  if (value === false || value === 0 || value === 'False') return false;
  return null; // NotConfigured 등은 켜짐/꺼짐으로 단정하지 않습니다.
};

async function readFirewall({ platform, run }) {
  if (platform === 'darwin') {
    const result = await run(COMMANDS.darwinFirewall);
    if (!result.ok) return unavailable(result.reason);
    const state = /State\s*=\s*(\d)/u.exec(result.stdout)?.[1];
    if (state === undefined) return unavailable('READ_FAILED');
    return { status: 'ok', at: now(), profiles: [{ name: 'macOS 방화벽', enabled: state !== '0' }] };
  }
  if (platform === 'win32') {
    const result = await run(COMMANDS.winFirewall);
    if (!result.ok) return unavailable(result.reason);
    const rows = asArray(parseJson(result.stdout)).filter((row) => typeof row?.Name === 'string');
    if (rows.length === 0) return unavailable('READ_FAILED');
    return { status: 'ok', at: now(), profiles: rows.slice(0, 6).map((row) => ({ name: row.Name, enabled: toEnabled(row.Enabled) })) };
  }
  return unavailable('NOT_SUPPORTED');
}

// ---- Windows 기록(System·Application)의 최근 경고·오류 건수 ----
async function readWindowsLog({ platform, run }, logName) {
  if (platform !== 'win32') return unavailable('WINDOWS_ONLY');
  const result = await run(COMMANDS.winEvents(logName));
  if (!result.ok) return unavailable(result.reason);
  const row = parseJson(result.stdout);
  const count = (value) => (Number.isInteger(value) && value >= 0 ? value : null);
  const errors = count(row?.Error);
  const warnings = count(row?.Warning);
  if (errors === null || warnings === null) return unavailable('READ_FAILED');
  return { status: 'ok', at: now(), windowHours: EVENT_WINDOW_HOURS, errors, warnings };
}

export async function readPcSecurity({ platform = os.platform(), run = defaultRun, interfaces = () => os.networkInterfaces() } = {}) {
  const context = { platform, run, interfaces };
  const [network, firewall, system, application] = await Promise.all([
    readNetwork(context).catch(() => unavailable('READ_FAILED')),
    readFirewall(context).catch(() => unavailable('READ_FAILED')),
    readWindowsLog(context, WIN_LOGS.system).catch(() => unavailable('READ_FAILED')),
    readWindowsLog(context, WIN_LOGS.application).catch(() => unavailable('READ_FAILED')),
  ]);
  return { source: 'measured', platform, measuredAt: now(), network, firewall, events: { system, application } };
}
