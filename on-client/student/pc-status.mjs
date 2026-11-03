// 2일차(완성본): 이 서버를 실행한 PC 의 CPU·메모리·디스크를 일반 권한으로 한 번 잽니다.
// 서버(src/server.mjs 의 GET /api/pc-status)에서만 불러 쓰고, 브라우저 화면은 이 파일을 직접 쓰지 않습니다.
// 값마다 단위와 잰 시각(at)을 붙이고, 못 읽은 값은 예시 값으로 채우지 않고 status:'unavailable' 과 이유 코드를 줍니다.
import os from 'node:os';
import { statfs } from 'node:fs/promises';

export const CPU_SAMPLE_MS = 250;

const wait = (ms) => new Promise((done) => setTimeout(done, ms));
const round1 = (value) => Math.round(value * 10) / 10;

function cpuTimes() {
  const cpus = os.cpus();
  if (!Array.isArray(cpus) || cpus.length === 0) return null;
  let idle = 0;
  let total = 0;
  for (const { times } of cpus) {
    idle += times.idle;
    total += times.user + times.nice + times.sys + times.idle + times.irq;
  }
  return { idle, total };
}

// 두 번 읽은 CPU 누적 시간의 차이로 그 구간의 평균 사용률을 셉니다.
async function readCpu(sampleMs) {
  const before = cpuTimes();
  if (before === null) return { status: 'unavailable', reason: 'NOT_SUPPORTED', at: new Date().toISOString() };
  await wait(sampleMs);
  const after = cpuTimes();
  const at = new Date().toISOString();
  if (after === null) return { status: 'unavailable', reason: 'READ_FAILED', at };
  const total = after.total - before.total;
  const idle = after.idle - before.idle;
  if (!(total > 0) || idle < 0) return { status: 'unavailable', reason: 'READ_FAILED', at };
  const percent = round1(Math.min(100, Math.max(0, (1 - idle / total) * 100)));
  return { status: 'ok', percent, unit: '%', windowMs: sampleMs, at };
}

function readMemory() {
  const at = new Date().toISOString();
  const total = os.totalmem();
  const free = os.freemem();
  if (!Number.isFinite(total) || !Number.isFinite(free) || total <= 0 || free < 0 || free > total) {
    return { status: 'unavailable', reason: 'READ_FAILED', at };
  }
  const used = total - free;
  return { status: 'ok', usedBytes: used, totalBytes: total, percent: round1((used / total) * 100), unit: 'bytes', at };
}

const DISK_ERROR_REASON = Object.freeze({ EACCES: 'PERMISSION_DENIED', EPERM: 'PERMISSION_DENIED', ENOENT: 'NOT_FOUND' });

// 서버를 실행한 폴더가 있는 디스크의 남은 공간입니다. 일반 사용자가 쓸 수 있는 블록(bavail) 기준입니다.
async function readDisk(path) {
  try {
    const stat = await statfs(path);
    const at = new Date().toISOString();
    const free = Number(stat.bavail) * Number(stat.bsize);
    const total = Number(stat.blocks) * Number(stat.bsize);
    if (!Number.isFinite(free) || !Number.isFinite(total) || total <= 0 || free < 0 || free > total) {
      return { status: 'unavailable', reason: 'READ_FAILED', at };
    }
    return { status: 'ok', freeBytes: free, totalBytes: total, freePercent: round1((free / total) * 100), unit: 'bytes', at };
  } catch (error) {
    // 경로나 원문 오류 문장은 내보내지 않고 정해 둔 이유 코드만 줍니다.
    const reason = typeof error?.code === 'string' && Object.hasOwn(DISK_ERROR_REASON, error.code) ? DISK_ERROR_REASON[error.code] : 'READ_FAILED';
    return { status: 'unavailable', reason, at: new Date().toISOString() };
  }
}

export async function readPcStatus({ path = process.cwd(), sampleMs = CPU_SAMPLE_MS } = {}) {
  const [cpu, memory, disk] = await Promise.all([readCpu(sampleMs), Promise.resolve(readMemory()), readDisk(path)]);
  return { source: 'measured', platform: os.platform(), measuredAt: new Date().toISOString(), cpu, memory, disk };
}
