// 이 파일은 학생이 같은 프로젝트에서 이어서 구현합니다.
// 제공 UI를 받은 것만으로 단계 완료를 인정하지 않습니다.

// ---------- 13단계: 로그인 사용자·기기·세션 표시 (renderIdentity 에서만 씁니다) ----------
// 기기·세션 상태는 문구 뒤에 서버가 준 원래 값(코드)을 괄호로 함께 보여 줍니다. 모르는 값은 확인 불가입니다.
const DEVICE_STATUS_TEXT = Object.freeze({ compliant: '보안 기준 충족', noncompliant: '보안 기준 미충족', unknown: '확인 불가' });
const SESSION_STATUS_TEXT = Object.freeze({ active: '활성', expired: '만료', revoked: '철회됨', unknown: '확인 불가' });
// 정상처럼 보이면 안 되는 값: 색이 아니라 글자(주의)로도 구분합니다.
const ATTENTION_STATUS = new Set(['noncompliant', 'expired', 'revoked']);
const MODE_NOTICE_TEXT = Object.freeze({
  demo: '예제 자료(demo): 실제 로그인·기기·세션이 아닙니다.',
  disconnected: '연결 없음(disconnected): 서버에 연결되어 있지 않습니다.',
  unknown: '확인 불가(unknown): 연결 상태를 확인할 수 없습니다.',
});

function identityNode(tag, text, className) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text !== undefined) node.textContent = text;
  return node;
}

function identityText(value) {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
}

// 상태 값 하나를 "문구(원래 값)" 글자로 바꿉니다. 정해진 값이 아니면 확인 불가로 둡니다.
function identityStatus(table, value) {
  if (typeof value === 'string' && Object.hasOwn(table, value)) {
    const warning = ATTENTION_STATUS.has(value) ? '주의 · ' : '';
    return `${warning}${table[value]}(${value})`;
  }
  return identityText(value) ? `확인 불가(${value})` : '확인 불가';
}

// 입력 자료 하나를 읽습니다. 형식이 틀리면 확인 불가로 취급하고, 정상·빈 목록으로 바꾸지 않습니다.
function identityResource(resource) {
  const ok = resource !== null && typeof resource === 'object';
  const status = ok && ['loading', 'ok', 'error'].includes(resource.status) ? resource.status : 'invalid';
  return {
    status,
    mode: ok && typeof resource.mode === 'string' ? resource.mode : null,
    data: ok ? resource.data : undefined,
    error: ok && resource.error !== null && typeof resource.error === 'object' ? resource.error : null,
  };
}

// 불러오는 중·연결 실패·형식 오류일 때 보여 줄 줄을 만듭니다. 값이 정상적으로 온 경우에는 null 을 돌려줍니다.
function identityStateLine(resource, dataValid) {
  if (resource.status === 'loading') return identityNode('p', '불러오는 중입니다.', 'student-identity-loading');
  if (resource.status === 'error') {
    return identityNode('p', `연결 실패: ${identityText(resource.error?.message) ?? '서버가 오류 설명을 보내지 않았습니다.'}`, 'student-identity-error');
  }
  if (resource.status !== 'ok' || !dataValid) {
    return identityNode('p', '확인 불가: 서버 응답을 읽을 수 없습니다.', 'student-identity-unknown');
  }
  return null;
}

// 구역 하나(제목 + 연결 방식 안내 + 상태 줄 또는 값)를 만듭니다. 연결 방식 안내는 loading·error 에서도 함께 보여 줍니다.
function identityGroup(title, resource, dataValid, buildValues) {
  const group = identityNode('section', undefined, 'student-identity-group');
  group.append(identityNode('h4', title));
  if (resource.mode !== null && Object.hasOwn(MODE_NOTICE_TEXT, resource.mode)) {
    group.append(identityNode('p', MODE_NOTICE_TEXT[resource.mode], 'student-identity-mode'));
  }
  const line = identityStateLine(resource, dataValid);
  group.append(line ?? buildValues());
  return group;
}

function identityRow(list, term, description) {
  list.append(identityNode('dt', term), identityNode('dd', description));
}

function identityNamed(item) {
  const label = identityText(item?.label);
  const id = identityText(item?.id);
  if (label && id) return `${label} (${id})`;
  return label ?? id ?? '확인 불가';
}

// ---------- 14단계: 업무 앱 접근 요청 결과 표시 (renderDecision 에서만 씁니다) ----------
// 판정은 한국어 뜻과 서버가 준 원래 값(코드)을 함께 보여 줍니다. 네 값이 아니면 확인 불가로 둡니다.
const DECISION_TEXT = Object.freeze({
  allow: { label: '접근 허용(allow)', note: '정책상 접근이 허용된다는 판정입니다. 실제 앱 접속 성공을 보장하지 않습니다.' },
  deny: { label: '접근 거부(deny)', note: '정책상 접근이 거부되었습니다.' },
  challenge: { label: '추가 확인 필요(challenge)', note: '추가 인증 또는 확인이 필요합니다. 이 앱이 추가 인증을 대신 수행하지 않습니다.' },
  unknown: { label: '판정 확인 불가(unknown)', note: '서버가 판정을 확인하지 못했습니다. 허용으로 간주하지 않습니다.' },
});
const DECISION_MODE_NOTICE = Object.freeze({
  demo: '예제 자료(demo): 실제 접근 판정이 아닙니다.',
  disconnected: '연결 없음(disconnected): 서버에 연결되어 있지 않습니다.',
  unknown: '확인 불가(unknown): 연결 상태를 확인할 수 없습니다.',
});
// 서버 응답 형식을 확인하지 못했다는 뜻의 오류 코드입니다. 이것은 거부도 허용도 아닌 확인 불가입니다.
const UNVERIFIED_ERROR_CODES = new Set(['CONTRACT_MISMATCH', 'ENGINE_RESULT_UNVERIFIED']);

// 판정 시각은 서버가 준 원래 값을 그대로 적고, 읽을 수 있으면 한국 시각을 괄호로 덧붙입니다.
function decisionTime(value) {
  const raw = identityText(value);
  if (raw === null) return '확인 불가';
  const time = new Date(raw);
  if (Number.isNaN(time.getTime())) return raw;
  return `${raw} (한국 시각 ${time.toLocaleString('ko-KR', { timeZone: 'Asia/Seoul', hour12: false })})`;
}

function decisionRow(list, term, description) {
  list.append(identityNode('dt', term), identityNode('dd', description));
}

// ---------- 15단계: 접속 기록과 XDR 경보 목록·상세 (renderEvents 에서만 씁니다) ----------
// 종류·접속 상태는 한국어 뜻 뒤에 서버가 준 원래 값(코드)을 괄호로 함께 보여 줍니다. 모르는 값은 확인 불가입니다.
const EVENT_KIND_TEXT = Object.freeze({ access: '접속 기록', xdr: 'XDR 경보' });
const EVENT_ACCESS_TEXT = Object.freeze({ allowed: '허용됨', denied: '거부됨', unknown: '확인 불가' });
const EVENT_MODE_NOTICE = Object.freeze({
  demo: '예제 자료(demo): 실제 접속 기록과 XDR 경보가 아닙니다.',
  disconnected: '연결 없음(disconnected): 서버에 연결되어 있지 않습니다.',
  unknown: '확인 불가(unknown): 연결 상태를 확인할 수 없습니다.',
});
const EVENT_ALL = 'all'; // 걸러 보기 전체 값
const EVENT_NO_APP = ''; // appId 가 없는 기록(앱을 확인할 수 없음)을 고르는 값
let eventsFilterCount = 0; // 선택 상자마다 겹치지 않는 id 를 만들 때만 씁니다.

function eventsKindText(kind) {
  if (typeof kind === 'string' && Object.hasOwn(EVENT_KIND_TEXT, kind)) return `${EVENT_KIND_TEXT[kind]}(${kind})`;
  return identityText(kind) ? `확인 불가(${kind})` : '확인 불가';
}

function eventsAppText(appId) {
  return identityText(appId) ?? '앱을 확인할 수 없음(appId 없음)';
}

function eventsAccessValue(event) {
  return typeof event?.state?.access === 'string' ? event.state.access : '';
}

function eventsAccessText(value) {
  if (Object.hasOwn(EVENT_ACCESS_TEXT, value)) return `${EVENT_ACCESS_TEXT[value]}(${value})`;
  return value === '' ? '확인 불가' : `확인 불가(${value})`;
}

// 받은 배열은 고치지 않고 복사해서 at 기준 최신순으로 정렬합니다. 읽을 수 없는 시각은 맨 뒤입니다.
function eventsSorted(list) {
  const time = (event) => { const t = Date.parse(event.at); return Number.isFinite(t) ? t : -Infinity; };
  return [...list].sort((a, b) => {
    const ta = time(a);
    const tb = time(b);
    return ta === tb ? 0 : tb > ta ? 1 : -1;
  });
}

// 선택 상자 하나: 눈에 보이는 label 과 aria-label 이 같은 이름이고, 첫 값은 all 입니다.
function eventsFilter(title, options, onChange) {
  eventsFilterCount += 1;
  const id = `student-events-filter-${eventsFilterCount}`;
  const wrap = identityNode('div', undefined, 'student-events-filter');
  const label = identityNode('label', title);
  label.setAttribute('for', id);
  const select = identityNode('select');
  select.setAttribute('id', id);
  select.setAttribute('aria-label', title);
  for (const [value, text] of options) {
    const option = identityNode('option', text);
    option.setAttribute('value', value);
    select.append(option);
  }
  select.addEventListener('change', () => onChange(select.value));
  wrap.append(label, select);
  return wrap;
}

// 근거·규칙처럼 { id, text } 줄 목록입니다. 형식이 틀린 줄은 확인 불가로 보이게 합니다.
function eventsTextList(list, emptyText) {
  if (!Array.isArray(list) || list.length === 0) return identityNode('p', emptyText, 'student-event-empty');
  const ul = identityNode('ul');
  for (const item of list) {
    const id = identityText(item?.id);
    const text = identityText(item?.text);
    ul.append(identityNode('li', id && text ? `${id}: ${text}` : '확인 불가: 형식이 맞지 않는 줄입니다.'));
  }
  return ul;
}

// 선택한 기록의 상세: 근거·규칙과 세 상태(접속·세션·기기)를 따로 보여 줍니다.
function eventsDetail(event) {
  const detail = identityNode('section', undefined, 'student-event-detail');
  detail.setAttribute('data-student-event-detail', event.id);
  detail.setAttribute('aria-label', `기록 ${event.id}의 근거·규칙·상태`);
  const info = identityNode('dl');
  decisionRow(info, '사건 ID', event.id);
  decisionRow(info, '앱', eventsAppText(event.appId));
  decisionRow(info, '종류', eventsKindText(event.kind));
  decisionRow(info, '시각', decisionTime(event.at));
  detail.append(info);
  detail.append(identityNode('h5', '근거'));
  detail.append(eventsTextList(event.evidence, '서버가 근거를 보내지 않았습니다.'));
  detail.append(identityNode('h5', '규칙'));
  detail.append(eventsTextList(event.rules, '서버가 규칙을 보내지 않았습니다.'));
  detail.append(identityNode('h5', '상태'));
  const states = identityNode('dl');
  decisionRow(states, '접속 상태(state.access)', eventsAccessText(eventsAccessValue(event)));
  decisionRow(states, '세션 상태(state.session)', identityStatus(SESSION_STATUS_TEXT, event.state?.session));
  decisionRow(states, '기기 상태(state.device)', identityStatus(DEVICE_STATUS_TEXT, event.state?.device));
  detail.append(states);
  // 16단계: 이 단계에서는 어떤 조치도 실행 연결이 없으므로, 서버가 조치를 알려 주면 요청을 보내지 않는 비활성 안내 버튼만 둡니다.
  // supportedActions 가 비어 있으면 조치 영역 자체를 만들지 않습니다.
  const actions = Array.isArray(event.supportedActions) ? event.supportedActions.map(identityText).filter((action) => action !== null) : [];
  if (actions.length > 0) {
    detail.append(identityNode('h5', '조치'));
    const row = identityNode('div', undefined, 'student-event-actions');
    for (const action of actions) {
      const unsupported = identityNode('button', `${action} 미지원`);
      unsupported.setAttribute('type', 'button');
      unsupported.disabled = true;
      unsupported.setAttribute('disabled', '');
      unsupported.setAttribute('aria-disabled', 'true');
      row.append(unsupported);
    }
    detail.append(row);
    detail.append(identityNode('p', '조치 실행 연결은 준비 중입니다. 아직 지원하지 않는 조치이며, 이 화면은 조치 요청을 보내지 않습니다.', 'student-event-actions-note'));
  }
  return detail;
}

// 목록 전체: 상태에 따라 불러오는 중·실패·빈 목록·목록을 다르게 보여 줍니다. 호출마다 새로 만들어 이전 목록과 상세가 남지 않습니다.
function eventsView(input) {
  const { status, mode, data, error } = input !== null && typeof input === 'object' ? input : {};
  const root = identityNode('section', undefined, 'student-events');
  root.setAttribute('aria-label', '내 접속 기록과 XDR 경보');
  if (typeof mode === 'string' && Object.hasOwn(EVENT_MODE_NOTICE, mode)) {
    root.append(identityNode('p', EVENT_MODE_NOTICE[mode], 'student-events-mode'));
  }

  if (status === 'loading') {
    root.append(identityNode('p', '기록을 불러오는 중입니다.', 'student-events-loading'));
    return root;
  }
  if (status === 'error') {
    // 조회 실패는 빈 목록이 아닙니다. 기록을 확인하지 못했으므로 이전 목록은 보여 주지 않습니다.
    root.append(identityNode('p', `기록을 불러오지 못했습니다: ${identityText(error?.message) ?? '서버가 오류 설명을 보내지 않았습니다.'}`, 'student-events-error'));
    root.append(identityNode('p', '기록을 확인하지 못해 이전 목록은 보여 주지 않습니다.', 'student-events-note'));
    if (typeof error?.code === 'string' && UNVERIFIED_ERROR_CODES.has(error.code)) {
      root.append(identityNode('p', '확인 불가: 서버 응답을 확인하지 못해 기록을 알 수 없습니다.', 'student-events-unverified'));
    }
    return root;
  }
  if (status !== 'ok' || !Array.isArray(data)) {
    root.append(identityNode('p', '확인 불가: 서버 응답을 읽을 수 없어 기록을 보여 줄 수 없습니다.', 'student-events-unverified'));
    return root;
  }
  if (data.length === 0) {
    root.append(identityNode('p', '표시할 기록이 없습니다.', 'student-events-empty'));
    root.append(identityNode('p', '서버가 알려 준 내 기록이 없습니다. 조회 범위는 본인의 최근 40건입니다.', 'student-events-note'));
    return root;
  }

  const received = data.length;
  const rows = eventsSorted(data.filter((event) => event !== null && typeof event === 'object' && identityText(event.id) !== null));
  const skipped = received - rows.length;
  root.append(identityNode('p', '이 목록은 내 접속 기록과 서버에 이미 저장된 XDR 경보입니다. 최근 40건까지이며 다른 직원의 기록이나 전체 로그가 아닙니다.', 'student-events-scope'));
  if (skipped > 0) root.append(identityNode('p', `형식이 맞지 않는 기록 ${skipped}건은 표시하지 않았습니다.`, 'student-events-note'));

  // 걸러 보기 상태와 상세 선택은 이 요소 안에만 있습니다. 새 자료가 오면 요소가 새로 만들어져 초기화됩니다.
  const picked = { kind: EVENT_ALL, app: EVENT_ALL, access: EVENT_ALL, detail: null };
  const kinds = [...new Set(rows.map((event) => event.kind).filter((value) => typeof value === 'string'))].sort();
  const apps = [...new Set(rows.map((event) => identityText(event.appId)).filter((value) => value !== null))].sort();
  const accesses = [...new Set(rows.map(eventsAccessValue))].sort();
  const options = {
    kind: [[EVENT_ALL, '전체'], ...kinds.map((value) => [value, eventsKindText(value)])],
    app: [[EVENT_ALL, '전체'], ...apps.map((value) => [value, value]), ...(rows.some((event) => identityText(event.appId) === null) ? [[EVENT_NO_APP, eventsAppText(null)]] : [])],
    access: [[EVENT_ALL, '전체'], ...accesses.map((value) => [value, eventsAccessText(value)])],
  };
  const results = identityNode('div', undefined, 'student-events-results');
  results.setAttribute('aria-live', 'polite');

  // 받은 배열 안에서만 걸러 목록을 다시 그립니다. 서버에는 다시 묻지 않습니다.
  const draw = (focusId) => {
    const shown = rows.filter((event) => (picked.kind === EVENT_ALL || event.kind === picked.kind)
      && (picked.app === EVENT_ALL || (identityText(event.appId) ?? EVENT_NO_APP) === picked.app)
      && (picked.access === EVENT_ALL || eventsAccessValue(event) === picked.access));
    if (picked.detail !== null && !shown.some((event) => event.id === picked.detail)) picked.detail = null;
    results.textContent = '';
    results.append(identityNode('p', `표시 ${shown.length}건 / 받은 기록 ${rows.length}건`, 'student-events-count'));
    if (shown.length === 0) {
      results.append(identityNode('p', '선택한 조건에 맞는 기록이 없습니다.', 'student-events-filtered-empty'));
      return;
    }
    const list = identityNode('ul', undefined, 'student-event-list');
    let focusTarget = null;
    for (const event of shown) {
      const item = identityNode('li', undefined, 'student-event-row');
      item.setAttribute('data-student-event-id', event.id);
      item.append(identityNode('p', identityText(event.summary) ?? '요약을 확인할 수 없음', 'student-event-summary'));
      item.append(identityNode('p', `사건 ID: ${event.id} · 시각: ${decisionTime(event.at)} · 종류: ${eventsKindText(event.kind)} · 앱: ${eventsAppText(event.appId)}`, 'student-event-meta'));
      const button = identityNode('button', `${event.id} 상세`);
      button.setAttribute('type', 'button');
      button.setAttribute('aria-expanded', String(picked.detail === event.id));
      button.addEventListener('click', () => {
        picked.detail = picked.detail === event.id ? null : event.id;
        draw(event.id);
      });
      if (event.id === focusId) focusTarget = button;
      item.append(button);
      if (picked.detail === event.id) item.append(eventsDetail(event));
      list.append(item);
    }
    results.append(list);
    // 목록을 다시 그려도 키보드 위치가 사라지지 않게, 방금 누른 상세 버튼으로 되돌립니다.
    if (focusTarget && typeof focusTarget.focus === 'function') focusTarget.focus();
  };

  const filters = identityNode('div', undefined, 'student-events-filters');
  filters.append(
    eventsFilter('기록 종류', options.kind, (value) => { picked.kind = value; draw(null); }),
    eventsFilter('업무 앱', options.app, (value) => { picked.app = value; draw(null); }),
    eventsFilter('접속 상태', options.access, (value) => { picked.access = value; draw(null); }),
  );
  root.append(filters, results);
  draw(null);
  return root;
}

// ---------- 16단계: 기기·세션·알림·도움정보와 오류·빈 화면 (renderStatus 에서만 씁니다) ----------
const STATUS_MODE_NOTICE = Object.freeze({
  demo: '예제 자료(demo): 실제 기기·세션·알림이 아닙니다.',
  disconnected: '연결 없음(disconnected): 서버에 연결되어 있지 않습니다.',
  unknown: '확인 불가(unknown): 연결 상태를 확인할 수 없습니다.',
});
const STATUS_RESOURCE_TEXT = Object.freeze({
  me: '로그인 정보', apps: '업무 앱', events: '접속 기록', devices: '기기', sessions: '세션', access: '접속 판정', diagnostics: '도움정보', vulnerabilities: '취약점',
});
const STATUS_TIMEOUT_CODES = new Set(['TIMEOUT', 'REQUEST_TIMEOUT', 'ENGINE_TIMEOUT', 'WB_CLCO_TIMEOUT']);
const STATUS_RETRY_TEXT = '다시 시도는 위쪽 다시 불러오기 버튼을 직접 누르세요. 이 화면은 자동으로 다시 요청하지 않습니다.';
// 열쇠·토큰·비밀번호처럼 보이는 글자는 화면과 복사 내용에서 가립니다.
const STATUS_SECRET = /Bearer\s+\S+|sk-[A-Za-z0-9_-]{8,}|-----BEGIN [A-Z ]*PRIVATE KEY-----|(?:api[_ -]?key|authorization|password|passwd|secret|token|비밀번호|토큰|열쇠)\s*[:=]\s*\S+|eyJ[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]{10,}\.[A-Za-z0-9_-]*|[A-Za-z0-9+/_-]{40,}/giu;

// 화면과 복사에 쓰는 글자 하나를 안전하게 만듭니다. 글자·숫자만 받고, 비밀값 모양은 가리며, 길이를 줄입니다.
function statusSafe(value, max = 200) {
  const raw = typeof value === 'number' && Number.isFinite(value) ? String(value) : identityText(value);
  if (raw === null) return null;
  return raw.replace(STATUS_SECRET, '[가림]').slice(0, max);
}

function statusIsTimeout(error) {
  return (typeof error?.code === 'string' && STATUS_TIMEOUT_CODES.has(error.code)) || /시간.{0,6}초과/u.test(identityText(error?.message) ?? '');
}

// 입력 자료 하나를 읽습니다. idle(아직 요청 전)도 구분합니다. 형식이 틀리면 확인 불가로 취급합니다.
function statusResource(resource) {
  const ok = resource !== null && typeof resource === 'object';
  return {
    status: ok && ['idle', 'loading', 'ok', 'error'].includes(resource.status) ? resource.status : 'invalid',
    mode: ok && typeof resource.mode === 'string' ? resource.mode : null,
    data: ok ? resource.data : undefined,
    error: ok && resource.error !== null && typeof resource.error === 'object' ? resource.error : null,
  };
}

// 자료 하나(기기·세션·도움정보)의 구역: 불러오는 중·실패·빈 목록·목록을 서로 다른 문장으로 보여 줍니다.
function statusGroup(title, noun, resource, topMode, empty, buildRows) {
  const group = identityNode('section', undefined, 'student-status-group');
  group.append(identityNode('h4', title));
  if (resource.mode !== null && resource.mode !== topMode && Object.hasOwn(STATUS_MODE_NOTICE, resource.mode)) {
    group.append(identityNode('p', STATUS_MODE_NOTICE[resource.mode], 'student-status-mode'));
  }
  if (resource.status === 'loading') {
    group.append(identityNode('p', `${noun}를 불러오는 중입니다.`, 'student-status-loading'));
  } else if (resource.status === 'error') {
    // 조회 실패는 빈 목록이 아닙니다. 무엇을 불러오지 못했는지와 서버 message, 다시 시도 방법을 알립니다.
    group.append(identityNode('p', `${noun}를 불러오지 못했습니다: ${statusSafe(resource.error?.message, 300) ?? '서버가 오류 설명을 보내지 않았습니다.'}`, 'student-status-error'));
    if (statusIsTimeout(resource.error)) group.append(identityNode('p', '시간 초과: 서버가 정해진 시간 안에 응답하지 않았습니다.', 'student-status-timeout'));
    if (typeof resource.error?.code === 'string' && UNVERIFIED_ERROR_CODES.has(resource.error.code)) {
      group.append(identityNode('p', '확인 불가: 서버 응답을 확인하지 못해 내용을 알 수 없습니다.', 'student-status-unverified'));
    }
    group.append(identityNode('p', STATUS_RETRY_TEXT, 'student-status-retry'));
  } else if (resource.status === 'ok' && Array.isArray(resource.data)) {
    group.append(resource.data.length === 0 ? identityNode('p', empty, 'student-status-empty') : buildRows(resource.data));
  } else if (resource.status === 'idle') {
    group.append(identityNode('p', `${noun}는 아직 요청하지 않았습니다.`, 'student-status-idle'));
  } else {
    group.append(identityNode('p', `확인 불가: ${noun} 응답을 읽을 수 없습니다.`, 'student-status-unverified'));
  }
  return group;
}

function statusList(items, line) {
  const list = identityNode('ul');
  for (const item of items) list.append(identityNode('li', line(item)));
  return list;
}

// 도움정보에서 안내한 여섯 값만 꺼냅니다. 그 밖의 항목(예: AI 설정)은 화면에도 복사에도 쓰지 않습니다.
function statusDiagnosticsFields(data) {
  if (data === null || typeof data !== 'object') return null;
  const engine = data.engine !== null && typeof data.engine === 'object' ? data.engine : {};
  return [
    ['requestId', '요청 ID', statusSafe(data.requestId)],
    ['component', '구성요소', statusSafe(data.component)],
    ['version', '버전', statusSafe(data.version)],
    ['checkedAt', '확인 시각', statusSafe(data.checkedAt)],
    ['engine.mode', '엔진 모드', statusSafe(engine.mode)],
    ['engine.code', '엔진 코드', statusSafe(engine.code)],
  ];
}

// 「도움정보 복사」: 사용자가 누를 때만 복사합니다. 복사에 실패하면 성공이라고 쓰지 않고 직접 복사할 수 있게 값을 보여 줍니다.
function statusCopyBox(fields) {
  const box = identityNode('div', undefined, 'student-status-copy');
  const button = identityNode('button', '도움정보 복사');
  button.setAttribute('type', 'button');
  const feedback = identityNode('p', undefined, 'student-status-copy-result');
  feedback.setAttribute('role', 'status');
  const fallback = identityNode('textarea', undefined, 'student-status-copy-fallback');
  fallback.setAttribute('readonly', '');
  fallback.setAttribute('aria-label', '직접 복사할 도움정보');
  fallback.hidden = true;
  if (fields === null) {
    button.disabled = true;
    button.setAttribute('aria-disabled', 'true');
    feedback.textContent = '복사할 도움정보가 없습니다. 제공 화면의 「도움정보 불러오기」로 먼저 불러오세요.';
  } else {
    feedback.textContent = '이 정보는 도움을 요청할 때 쓰도록 복사하는 것입니다. 누를 때만 복사하고 어디에도 전송하지 않습니다.';
    const text = fields.map(([key, , value]) => `${key}: ${value ?? '확인 불가'}`).join('\n');
    button.addEventListener('click', async () => {
      try {
        if (typeof navigator === 'undefined' || !navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('clipboard_unavailable');
        await navigator.clipboard.writeText(text);
        feedback.textContent = '도움정보 6개 값을 복사했습니다. 비밀값은 포함하지 않습니다.';
        fallback.hidden = true;
      } catch {
        feedback.textContent = '자동으로 복사하지 못했습니다. 아래 내용을 직접 선택해 복사하세요.';
        fallback.textContent = text;
        fallback.hidden = false;
        if (typeof fallback.focus === 'function') fallback.focus();
        if (typeof fallback.select === 'function') fallback.select();
      }
    });
  }
  box.append(button, feedback, fallback);
  return box;
}

function statusDiagnostics(resource) {
  const group = identityNode('section', undefined, 'student-status-group');
  group.append(identityNode('h4', '도움정보(진단)'));
  let fields = null;
  if (resource.status === 'idle') {
    group.append(identityNode('p', '도움정보를 아직 불러오지 않았습니다. 제공 화면의 「도움정보 불러오기」를 누르면 여기에 표시됩니다.', 'student-status-idle'));
  } else if (resource.status === 'loading') {
    group.append(identityNode('p', '도움정보를 불러오는 중입니다.', 'student-status-loading'));
  } else if (resource.status === 'error') {
    group.append(identityNode('p', `도움정보를 불러오지 못했습니다: ${statusSafe(resource.error?.message, 300) ?? '서버가 오류 설명을 보내지 않았습니다.'}`, 'student-status-error'));
    if (statusIsTimeout(resource.error)) group.append(identityNode('p', '시간 초과: 서버가 정해진 시간 안에 응답하지 않았습니다.', 'student-status-timeout'));
    group.append(identityNode('p', STATUS_RETRY_TEXT, 'student-status-retry'));
  } else if (resource.status === 'ok' && statusDiagnosticsFields(resource.data) !== null) {
    fields = statusDiagnosticsFields(resource.data);
    const list = identityNode('dl');
    for (const [key, term, value] of fields) decisionRow(list, `${term}(${key})`, value ?? '확인 불가');
    group.append(list);
  } else {
    group.append(identityNode('p', '확인 불가: 도움정보 응답을 읽을 수 없습니다.', 'student-status-unverified'));
  }
  group.append(statusCopyBox(fields));
  return group;
}

// 알림: 항목마다 어느 자료(resource)의 알림인지, 안전한 code, message 를 보여 줍니다.
function statusNotifications(list) {
  const group = identityNode('section', undefined, 'student-status-group');
  group.append(uiHeading('위험 알림'));
  group.append(uiNote('서버가 알려 준 기기·세션·기록의 주의 항목을 모았습니다. 침해나 공격을 판정한 결과가 아닙니다.', 'student-status-scope'));
  if (!Array.isArray(list)) {
    group.append(identityNode('p', '확인 불가: 알림 목록을 읽을 수 없습니다.', 'student-status-unverified'));
  } else if (list.length === 0) {
    group.append(identityNode('p', '주의할 알림이 없습니다.', 'student-status-empty'));
  } else {
    group.append(statusList(list, (item) => {
      const resource = typeof item?.resource === 'string' && Object.hasOwn(STATUS_RESOURCE_TEXT, item.resource) ? `${STATUS_RESOURCE_TEXT[item.resource]}(${item.resource})` : '확인 불가';
      const code = typeof item?.code === 'string' && /^[A-Za-z0-9_.-]{1,64}$/u.test(item.code) ? item.code : '확인 불가';
      return `자료: ${resource} · 코드: ${code} · ${statusSafe(item?.message, 300) ?? '메시지 없음'}`;
    }));
  }
  return group;
}

// 상태 칸 전체. 호출마다 새로 만들어 이전 오류 안내가 남지 않으며, 자동으로 다시 요청하지 않습니다.
// ---------- 완성본 2일차: 내 PC 상태(CPU·메모리·디스크) 실측과 최근 5번 비교 (statusView 에서만 씁니다) ----------
// 값은 서버(GET /api/pc-status)가 이 서버를 실행한 PC 에서 일반 권한으로 잰 것입니다. 예제(demo) 자료가 아닙니다.
// 못 읽은 값은 예시 값으로 채우지 않고 확인 불가와 이유를 보여 줍니다. 추이는 이 화면을 연 동안만 메모리에 있습니다.
const PC_HISTORY_MAX = 5;
const PC_REASON_TEXT = Object.freeze({
  NOT_SUPPORTED: '이 PC 에서는 읽을 수 없는 항목입니다.',
  PERMISSION_DENIED: '일반 권한으로는 읽을 수 없었습니다. 관리자 권한은 쓰지 않습니다.',
  NOT_FOUND: '읽을 위치를 찾지 못했습니다.',
  READ_FAILED: '값을 읽지 못했거나 믿을 수 없는 값이라 쓰지 않았습니다.',
  UNVERIFIED: '서버 응답의 형식을 확인할 수 없어 쓰지 않았습니다.',
  WINDOWS_ONLY: '이 항목은 Windows 에서만 읽습니다.',
  TIMEOUT: '읽는 데 시간이 너무 오래 걸려 중단했습니다.',
});
const pcState = { api: null, onChange: null, phase: 'idle', seq: 0, errorCode: null, history: [] };

const pcFinite = (value) => typeof value === 'number' && Number.isFinite(value);
const pcTime = (iso) => {
  const date = typeof iso === 'string' ? new Date(iso) : null;
  if (date === null || Number.isNaN(date.getTime())) return null;
  const two = (n) => String(n).padStart(2, '0');
  return `${two(date.getHours())}:${two(date.getMinutes())}:${two(date.getSeconds())}`;
};
const pcGb = (bytes) => `${(bytes / 1024 ** 3).toFixed(1)} GB`;
const pcUnavailable = (raw) => ({
  ok: false,
  reason: raw !== null && typeof raw === 'object' && typeof raw.reason === 'string' && Object.hasOwn(PC_REASON_TEXT, raw.reason) ? raw.reason : 'UNVERIFIED',
  time: pcTime(raw?.at),
});

// 서버가 준 값 하나를 믿을 수 있는 모양일 때만 쓰고, 아니면 확인 불가로 둡니다.
function pcMetric(raw, valid, pick) {
  if (raw === null || typeof raw !== 'object' || raw.status !== 'ok') return pcUnavailable(raw);
  const time = pcTime(raw.at);
  if (time === null || !valid(raw)) return pcUnavailable(raw);
  return { ok: true, time, ...pick(raw) };
}

function pcSample(data) {
  if (data === null || typeof data !== 'object' || data.source !== 'measured') return null;
  return {
    platform: ['darwin', 'win32', 'linux'].includes(data.platform) ? data.platform : null,
    cpu: pcMetric(data.cpu, (c) => pcFinite(c.percent) && c.percent >= 0 && c.percent <= 100 && pcFinite(c.windowMs) && c.windowMs > 0,
      (c) => ({ percent: c.percent, windowMs: c.windowMs })),
    memory: pcMetric(data.memory, (m) => pcFinite(m.usedBytes) && pcFinite(m.totalBytes) && m.totalBytes > 0 && m.usedBytes >= 0 && m.usedBytes <= m.totalBytes && pcFinite(m.percent),
      (m) => ({ usedBytes: m.usedBytes, totalBytes: m.totalBytes, percent: m.percent })),
    disk: pcMetric(data.disk, (d) => pcFinite(d.freeBytes) && pcFinite(d.totalBytes) && d.totalBytes > 0 && d.freeBytes >= 0 && d.freeBytes <= d.totalBytes && pcFinite(d.freePercent),
      (d) => ({ freeBytes: d.freeBytes, totalBytes: d.totalBytes, freePercent: d.freePercent })),
  };
}

// 요청은 한 번에 하나만 하고, 더 새 요청이 시작되면 예전 응답은 버립니다.
function pcRequest(state, path, parse, max, redraw) {
  if (state.api === null || state.phase === 'loading') return;
  const seq = ++state.seq;
  state.phase = 'loading';
  state.errorCode = null;
  if (redraw) state.onChange?.();
  Promise.resolve(state.api.get(path)).then((result) => {
    if (seq !== state.seq) return;
    const sample = result?.ok === true ? parse(result.data) : null;
    if (sample !== null) {
      state.history = [sample, ...state.history].slice(0, max);
      state.phase = 'done';
    } else {
      state.errorCode = result?.ok === false ? aiSafeCode(result.error) ?? 'UNVERIFIED' : 'UNVERIFIED';
      state.phase = 'error';
    }
  }).catch(() => {
    if (seq !== state.seq) return;
    state.errorCode = 'UNVERIFIED';
    state.phase = 'error';
  }).then(() => { if (seq === state.seq) state.onChange?.(); });
}
const pcMeasure = (redraw) => pcRequest(pcState, '/api/pc-status', pcSample, PC_HISTORY_MAX, redraw);

// 직전 측정과 비교합니다. 둘 중 하나라도 확인 불가면 비교하지 않습니다.
function pcDelta(current, previous, read, format) {
  if (previous === undefined) return '비교 불가 (직전 측정 없음)';
  if (!current.ok || !previous.ok) return '비교 불가 (확인 불가 값 포함)';
  const diff = Math.round((read(current) - read(previous)) * 10) / 10;
  if (diff === 0) return '변화 없음';
  return `${diff > 0 ? '+' : '−'}${format(Math.abs(diff))}`;
}

function pcRow(table, label, metric, valueText, detail, deltaText) {
  const row = identityNode('tr');
  row.append(identityNode('th', label));
  row.lastChild.setAttribute('scope', 'row');
  row.append(identityNode('td', metric.ok ? valueText : '확인 불가'));
  row.append(identityNode('td', metric.time ?? '확인 불가'));
  row.append(identityNode('td', deltaText));
  row.append(identityNode('td', metric.ok ? detail : PC_REASON_TEXT[metric.reason]));
  table.append(row);
}

// 표 칸이 서로 붙어 읽기 어려워서 여백과 줄을 지정합니다. 제공 style.css 는 바꾸지 않습니다.
function pcStyleTable(table) {
  table.style.width = '100%';
  table.style.borderCollapse = 'collapse';
  table.style.margin = '8px 0';
  for (const row of table.children) {
    for (const cell of row.children) {
      cell.style.padding = '6px 10px';
      cell.style.textAlign = 'left';
      cell.style.verticalAlign = 'top';
      cell.style.borderBottom = '1px solid var(--border)';
    }
  }
  return table;
}

function pcLatestTable(latest, previous) {
  const table = identityNode('table', undefined, 'student-pc-table');
  table.setAttribute('aria-label', '내 PC 상태 값 표');
  const head = identityNode('tr');
  for (const title of ['항목', '값', '잰 시각', '직전 대비', '설명']) {
    head.append(identityNode('th', title));
    head.lastChild.setAttribute('scope', 'col');
  }
  table.append(head);
  const { cpu, memory, disk } = latest;
  pcRow(table, 'CPU 사용률', cpu, cpu.ok ? `${cpu.percent} %` : '', cpu.ok ? `${cpu.windowMs / 1000}초 동안의 평균입니다.` : '',
    pcDelta(cpu, previous?.cpu, (m) => m.percent, (n) => `${n.toFixed(1)}%p`));
  pcRow(table, '메모리 사용량', memory, memory.ok ? `${pcGb(memory.usedBytes)} / ${pcGb(memory.totalBytes)} (${memory.percent} %)` : '',
    '운영체제가 알려 준 남은 메모리를 뺀 값입니다.', pcDelta(memory, previous?.memory, (m) => m.percent, (n) => `${n.toFixed(1)}%p`));
  pcRow(table, '디스크 남은 공간', disk, disk.ok ? `${pcGb(disk.freeBytes)} / ${pcGb(disk.totalBytes)} (남은 ${disk.freePercent} %)` : '',
    '이 서버를 실행한 폴더가 있는 디스크입니다.', pcDelta(disk, previous?.disk, (m) => m.freeBytes / 1024 ** 3, (n) => `${n.toFixed(1)} GB`));
  return pcStyleTable(table);
}

function pcHistoryTable(history) {
  const table = identityNode('table', undefined, 'student-pc-history');
  table.setAttribute('aria-label', '최근 PC 상태 측정 표');
  const head = identityNode('tr');
  for (const title of ['잰 시각', 'CPU 사용률', '메모리 사용률', '디스크 남은 공간']) {
    head.append(identityNode('th', title));
    head.lastChild.setAttribute('scope', 'col');
  }
  table.append(head);
  for (const sample of history) {
    const row = identityNode('tr');
    row.append(identityNode('td', sample.cpu.time ?? '확인 불가'));
    row.append(identityNode('td', sample.cpu.ok ? `${sample.cpu.percent} %` : '확인 불가'));
    row.append(identityNode('td', sample.memory.ok ? `${sample.memory.percent} %` : '확인 불가'));
    row.append(identityNode('td', sample.disk.ok ? pcGb(sample.disk.freeBytes) : '확인 불가'));
    table.append(row);
  }
  return pcStyleTable(table);
}

// ---------- 완성본 4일차: 화면 정리(핵심 3가지 먼저), 다시 조회·대기 표시, 실패 화면, 키보드 ----------
// 색과 크기는 제공 style.css 의 변수(var(--...))를 쓰되, 제공 CSS 파일은 바꾸지 않고 이 파일 안에서 정합니다.
// 실패하면 예시 값으로 채우지 않고 실패한 항목·이유·다음에 할 일을 보여 줍니다. 직전 성공 값은 "직전 값"이라고 따로 표시합니다.
const PC_ITEMS = Object.freeze(['CPU 사용률', '메모리 사용량', '디스크 남은 공간']);
const SEC_ITEMS = Object.freeze(['네트워크 연결', '방화벽 설정', 'Windows System 기록', 'Windows Application 기록']);
const UI_NOT_APPLICABLE = new Set(['WINDOWS_ONLY', 'NOT_SUPPORTED']);
const UI_STEP_BY_REASON = Object.freeze({
  PERMISSION_DENIED: '관리자 권한으로 바꾸거나 설정을 고치지 마세요. 일반 권한으로 읽은 항목만 쓰고, 꼭 필요하면 담당자에게 확인하세요.',
  TIMEOUT: '잠시 뒤 「다시 조회」를 한 번 눌러 보세요.',
  NOT_FOUND: '서버를 프로젝트 폴더(on-client)에서 실행했는지 확인한 뒤 「다시 조회」를 누르세요.',
  READ_FAILED: '「다시 조회」를 눌러 보세요. 계속되면 이 항목은 확인 불가로 두고 넘어가세요.',
  UNVERIFIED: '서버를 껐다 켠 뒤(터미널에서 Ctrl+C, 다시 실행) 「다시 조회」를 누르세요.',
});
const UI_RETRY_AFTER_RELOAD = '화면을 새로고침한 뒤 「다시 조회」를 누르세요. 계속되면 서버를 껐다 켜세요.';
const UI_STEP_BY_CODE = Object.freeze({
  NETWORK_ERROR: '서버가 꺼졌을 수 있습니다. 서버를 켠 터미널을 확인하고, 꺼졌다면 `npm run demo`(또는 `npm start`)로 다시 켠 뒤 「다시 조회」를 누르세요.',
  TIMEOUT: '잠시 기다린 뒤 「다시 조회」를 한 번 누르세요. 계속되면 PC 가 바쁜지 확인하세요.',
  NOT_FOUND: '서버가 이 기능이 없는 예전 코드로 켜져 있을 수 있습니다. 서버를 Ctrl+C 로 끄고 다시 실행한 뒤 「다시 조회」를 누르세요.',
  INVALID_RESPONSE: UI_RETRY_AFTER_RELOAD,
  CANCELLED: UI_RETRY_AFTER_RELOAD,
  UNVERIFIED: UI_RETRY_AFTER_RELOAD,
});
const UI_STEP_DEFAULT = '「다시 조회」를 눌러 보세요. 계속되면 오류 코드를 복사해 AI 에게 보여 주세요.';

function uiStyle(node, props) {
  Object.assign(node.style, props);
  return node;
}
function uiPanel(tag, className) {
  return uiStyle(identityNode(tag, undefined, className), {
    border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px 16px', margin: '12px 0', background: 'var(--surface)',
  });
}
function uiHeading(text, tag = 'h4') {
  return uiStyle(identityNode(tag, text), { fontSize: tag === 'h3' ? '1.15rem' : '1.05rem', margin: '0 0 8px' });
}
function uiNote(text, className) {
  return uiStyle(identityNode('p', text, className), { color: 'var(--muted)', fontSize: '0.9rem', margin: '6px 0' });
}
// 조회 중에도 키보드 포커스가 남도록 disabled 대신 aria-disabled 를 씁니다(누르면 아무 일도 하지 않음).
// 화면이 다시 그려질 때 이 버튼에 포커스가 있었다면 새 버튼으로 포커스를 되돌립니다.
function uiButton(label, busyLabel, key, busy, onClick) {
  const button = identityNode('button', busy ? busyLabel : label);
  button.type = 'button';
  button.setAttribute('data-student-key', key);
  if (busy) button.setAttribute('aria-disabled', 'true');
  uiStyle(button, { minHeight: '40px', padding: '8px 16px', fontSize: '1rem', cursor: busy ? 'progress' : 'pointer', margin: '8px 8px 0 0' });
  button.addEventListener('click', () => { if (!busy) onClick(); });
  if (globalThis.document?.activeElement?.getAttribute?.('data-student-key') === key) queueMicrotask(() => button.focus());
  return button;
}

// 실패 화면: 실패한 항목, 이유, 다음에 할 일. urgent 는 요청 전체가 실패한 경우(즉시 알림).
function uiFailure({ urgent, title, failed, steps }) {
  const box = uiStyle(identityNode('div', undefined, 'student-failure'), {
    borderLeft: `4px solid ${urgent ? 'var(--deny)' : 'var(--challenge)'}`, background: urgent ? 'var(--deny-soft)' : 'var(--challenge-soft)',
    padding: '8px 12px', margin: '8px 0', borderRadius: 'var(--radius)',
  });
  if (urgent) box.setAttribute('role', 'alert');
  box.append(uiStyle(identityNode('p', title), { fontWeight: '700', margin: '0 0 4px' }));
  const list = identityNode('ul');
  for (const item of failed) list.append(identityNode('li', `${item.label} — ${item.why}`));
  box.append(list);
  box.append(uiStyle(identityNode('p', '다음에 할 일'), { fontWeight: '700', margin: '8px 0 4px' }));
  const todo = identityNode('ol');
  for (const step of steps) todo.append(identityNode('li', step));
  box.append(todo);
  return box;
}

function uiRequestFailure(items, code) {
  return uiFailure({
    urgent: true,
    title: '조회에 실패했습니다. 아래 값은 읽지 못했고, 예시 값으로 대신하지 않았습니다.',
    failed: items.map((label) => ({ label, why: `요청 전체가 실패했습니다 (오류 코드: ${code})` })),
    steps: [UI_STEP_BY_CODE[code] ?? UI_STEP_DEFAULT],
  });
}

// 항목 하나씩 읽지 못한 경우. Windows 전용처럼 이 PC 에 해당 없는 항목은 실패로 세지 않고 따로 안내합니다.
function uiItemFailures(pairs) {
  const failed = []; const steps = new Set(); const notApplicable = [];
  for (const [label, metric] of pairs) {
    if (metric.ok) continue;
    if (UI_NOT_APPLICABLE.has(metric.reason)) { notApplicable.push(label); continue; }
    failed.push({ label, why: PC_REASON_TEXT[metric.reason] });
    steps.add(UI_STEP_BY_REASON[metric.reason] ?? UI_STEP_DEFAULT);
  }
  const nodes = [];
  if (failed.length > 0) nodes.push(uiFailure({ urgent: false, title: '읽지 못한 항목이 있습니다. 예시 값으로 대신하지 않았습니다.', failed, steps: [...steps] }));
  if (notApplicable.length > 0) nodes.push(uiNote(`이 PC 에서 해당 없는 항목: ${notApplicable.join(', ')} (확인 불가로 표시했고 조치는 필요 없습니다)`, 'student-pc-scope'));
  return nodes;
}

function uiStatusLine(text) {
  const line = uiStyle(identityNode('p', text, 'student-pc-loading'), { margin: '6px 0', fontWeight: '600' });
  line.setAttribute('role', 'status');
  return line;
}

function pcStatusSection() {
  if (pcState.phase === 'idle') pcMeasure(false);
  const busy = pcState.phase === 'loading';
  const section = uiPanel('section', 'student-pc-status');
  section.setAttribute('aria-label', '내 PC 상태');
  if (busy) section.setAttribute('aria-busy', 'true');
  section.append(uiHeading('내 PC 상태'));
  section.append(uiNote('실측값: 이 서버를 실행한 PC 에서 일반 권한으로 잰 값입니다. 예제(demo) 자료와 다르며, 값마다 단위와 잰 시각을 붙였습니다.', 'student-pc-note'));
  if (pcState.api === null) {
    section.append(uiFailure({ urgent: true, title: '조회하지 못했습니다. 예시 값으로 대신하지 않았습니다.',
      failed: PC_ITEMS.map((label) => ({ label, why: '측정을 요청할 통로가 없어 재지 않았습니다.' })), steps: [UI_RETRY_AFTER_RELOAD] }));
    return section;
  }
  const latest = pcState.history[0];
  if (pcState.phase === 'error') section.append(uiRequestFailure(PC_ITEMS, pcState.errorCode));
  if (busy) section.append(uiStatusLine(latest === undefined ? '조회 중입니다…' : '다시 조회하는 중입니다. 아래는 직전에 읽은 값입니다.'));
  if (latest !== undefined) {
    if (pcState.phase === 'error') section.append(uiStyle(identityNode('p', `아래는 직전에 읽은 값(${latest.cpu.time ?? '시각 확인 불가'})이며 지금 값이 아닙니다.`, 'student-pc-stale'), { fontWeight: '600', margin: '6px 0' }));
    section.append(pcLatestTable(latest, pcState.history[1]));
    for (const node of uiItemFailures([[PC_ITEMS[0], latest.cpu], [PC_ITEMS[1], latest.memory], [PC_ITEMS[2], latest.disk]])) section.append(node);
    const notes = ['작업 관리자·활동 상태 보기와 값이 조금 다를 수 있습니다. 집계 방식과 갱신 간격이 다르기 때문입니다.'];
    if (latest.platform === 'darwin') notes.push('macOS 는 캐시로 쓰는 메모리를 남은 메모리에서 빼서 알려 주므로, 메모리 사용량이 활동 상태 보기보다 높게 보일 수 있습니다.');
    for (const text of notes) section.append(uiNote(text, 'student-pc-scope'));
    if (pcState.history.length > 1) {
      section.append(uiNote(`최근 측정 (최신순, 최대 ${PC_HISTORY_MAX}번, 화면을 새로고침하면 사라집니다)`, 'student-pc-scope'));
      section.append(pcHistoryTable(pcState.history));
    }
    if (pcState.phase === 'done') section.append(uiStatusLine(`조회 완료: ${latest.cpu.time ?? '시각 확인 불가'} 기준`));
  }
  section.append(uiNote('화면을 열 때 한 번 조회하고, 그 뒤에는 「다시 조회」 버튼을 직접 누를 때만 조회합니다.', 'student-pc-scope'));
  section.append(uiButton('PC 상태 다시 조회', '조회 중…', 'pc', busy, () => pcMeasure(true)));
  return section;
}

// ---------- 완성본 3일차: 연결과 기록 (네트워크·방화벽·Windows 기록 건수. 읽기만 하고 설정은 바꾸지 않음) ----------
// 값은 서버(GET /api/pc-security)가 이 서버를 실행한 PC 에서 읽은 것입니다. 예제(demo) 자료가 아닙니다.
// 경고·오류 건수는 침해·공격 탐지 결과가 아닙니다. SDP 연결 상태는 PC 조회 결과와 섞지 않고 따로 보여 줍니다.
const SEC_PLATFORM_TEXT = Object.freeze({ darwin: 'macOS', win32: 'Windows', linux: 'Linux' });
const SEC_KIND_TEXT = Object.freeze({ wired: '유선', wireless: '무선', unknown: '종류 확인 불가' });
const SEC_SDP_TEXT = Object.freeze({
  connected: 'SDP 서버: 연결됨(connected). 서버가 알려 준 연결 상태이며, 이 화면이 SDP 서버를 따로 확인한 것은 아닙니다.',
  disconnected: 'SDP 서버: SDP 미연결(disconnected).',
  demo: 'SDP 서버: 예제(demo) 자료입니다. 실제 SDP 서버에 연결된 것이 아닙니다.',
  unknown: 'SDP 서버: 확인 불가(unknown).',
});
const secState = { api: null, onChange: null, phase: 'idle', seq: 0, errorCode: null, history: [] };

const secName = (value) => (typeof value === 'string' && /^[\p{L}\p{N} _.:()-]{1,40}$/u.test(value) ? value : null);
const secCount = (value) => Number.isInteger(value) && value >= 0 && value <= 10_000_000;
const secLog = (raw) => pcMetric(raw, (e) => secCount(e.errors) && secCount(e.warnings) && pcFinite(e.windowHours) && e.windowHours > 0,
  (e) => ({ errors: e.errors, warnings: e.warnings, windowHours: e.windowHours }));

function secSample(data) {
  if (data === null || typeof data !== 'object' || data.source !== 'measured') return null;
  return {
    platform: Object.hasOwn(SEC_PLATFORM_TEXT, data.platform) ? data.platform : null,
    network: pcMetric(data.network,
      (n) => typeof n.connected === 'boolean' && Array.isArray(n.interfaces) && n.interfaces.length <= 8
        && n.interfaces.every((i) => i !== null && typeof i === 'object' && Object.hasOwn(SEC_KIND_TEXT, i.kind)),
      (n) => ({ connected: n.connected, interfaces: n.interfaces.map((i) => ({ name: secName(i.name), kind: i.kind })) })),
    firewall: pcMetric(data.firewall,
      (f) => Array.isArray(f.profiles) && f.profiles.length >= 1 && f.profiles.length <= 6
        && f.profiles.every((p) => p !== null && typeof p === 'object' && (typeof p.enabled === 'boolean' || p.enabled === null)),
      (f) => ({ profiles: f.profiles.map((p) => ({ name: secName(p.name), enabled: p.enabled })) })),
    system: secLog(data.events?.system),
    application: secLog(data.events?.application),
  };
}
const secLoad = (redraw) => pcRequest(secState, '/api/pc-security', secSample, 1, redraw);

function secRow(table, label, metric, valueText, detail, platform) {
  const row = identityNode('tr');
  row.append(identityNode('th', label));
  row.lastChild.setAttribute('scope', 'row');
  row.append(identityNode('td', metric.ok ? valueText : '확인 불가'));
  row.append(identityNode('td', metric.time ?? '확인 불가'));
  let reason = detail;
  if (!metric.ok) {
    reason = metric.reason === 'WINDOWS_ONLY'
      ? `이 항목은 Windows 에서만 읽습니다. 서버가 실행 중인 PC(${SEC_PLATFORM_TEXT[platform] ?? '운영체제 확인 불가'})에서는 읽지 않았습니다.`
      : PC_REASON_TEXT[metric.reason];
  }
  row.append(identityNode('td', reason));
  table.append(row);
}

function secTable(sample) {
  const table = identityNode('table', undefined, 'student-sec-table');
  table.setAttribute('aria-label', '연결과 기록 값 표');
  const head = identityNode('tr');
  for (const title of ['항목', '값', '읽은 시각', '설명']) {
    head.append(identityNode('th', title));
    head.lastChild.setAttribute('scope', 'col');
  }
  table.append(head);
  const { network, firewall, system, application, platform } = sample;
  secRow(table, '네트워크 연결', network,
    network.ok ? (network.connected ? `연결됨 · ${network.interfaces.map((i) => `${i.name ?? '이름 확인 불가'}(${SEC_KIND_TEXT[i.kind]})`).join(', ')}` : '연결 안 됨') : '',
    '이 PC 의 인터페이스에 IPv4 설정이 있는지만 봅니다. 인터넷에 실제로 닿는지는 확인하지 않았습니다. IP·MAC 주소는 보여 주지 않습니다.', platform);
  const anyOff = firewall.ok && firewall.profiles.some((p) => p.enabled === false);
  secRow(table, '방화벽 설정', firewall,
    firewall.ok ? `${anyOff ? '주의 · ' : ''}${firewall.profiles.map((p) => `${p.name ?? '이름 확인 불가'} ${p.enabled === true ? '켜짐' : p.enabled === false ? '꺼짐' : '확인 불가'}`).join(' · ')}` : '',
    '읽기만 했고 설정은 바꾸지 않았습니다.', platform);
  for (const [label, metric] of [['Windows System 기록', system], ['Windows Application 기록', application]]) {
    secRow(table, label, metric, metric.ok ? `오류 ${metric.errors}건 · 경고 ${metric.warnings}건 (최근 ${metric.windowHours}시간)` : '',
      '침해나 공격 탐지 결과가 아닙니다. 기록의 개수일 뿐이며 기록 내용은 읽지 않았습니다.', platform);
  }
  return pcStyleTable(table);
}

function securitySection(mode) {
  if (secState.phase === 'idle') secLoad(false);
  const busy = secState.phase === 'loading';
  const section = uiPanel('section', 'student-sec-status');
  section.setAttribute('aria-label', '연결과 기록');
  if (busy) section.setAttribute('aria-busy', 'true');
  section.append(uiHeading('연결과 기록'));
  section.append(uiNote('실측값: 이 서버를 실행한 PC 에서 읽기만 한 값입니다. 방화벽·보안 설정은 바꾸지 않고, 관리자 권한이 필요한 항목은 읽지 않습니다. 예제(demo) 자료와 다릅니다.', 'student-pc-note'));
  section.append(uiStyle(identityNode('p', '주의: 경고·오류 건수는 운영체제가 남긴 기록의 개수일 뿐이며, 침해나 공격을 탐지한 결과가 아닙니다.', 'student-sec-warning'), { fontWeight: '600', margin: '6px 0' }));
  // PC 조회 결과와 섞지 않는 SDP 연결 상태
  const sdp = identityNode('div', undefined, 'student-sdp');
  sdp.append(uiStyle(identityNode('p', SEC_SDP_TEXT[Object.hasOwn(SEC_SDP_TEXT, mode) ? mode : 'unknown'], 'student-sdp-state'), { fontWeight: '600', margin: '6px 0' }));
  sdp.append(uiNote('SDP 연결 상태는 아래 PC 조회 결과와 별개입니다. SDP 가 연결되지 않아도 아래 값은 이 PC 에서 읽은 실측값이고, PC 조회가 성공했다고 SDP 가 연결된 것은 아닙니다.', 'student-pc-scope'));
  section.append(sdp);
  if (secState.api === null) {
    section.append(uiFailure({ urgent: true, title: '조회하지 못했습니다. 예시 값으로 대신하지 않았습니다.',
      failed: SEC_ITEMS.map((label) => ({ label, why: '읽기를 요청할 통로가 없어 읽지 않았습니다.' })), steps: [UI_RETRY_AFTER_RELOAD] }));
    return section;
  }
  const latest = secState.history[0];
  if (secState.phase === 'error') section.append(uiRequestFailure(SEC_ITEMS, secState.errorCode));
  if (busy) section.append(uiStatusLine(latest === undefined ? '조회 중입니다…' : '다시 조회하는 중입니다. 아래는 직전에 읽은 값입니다.'));
  if (latest !== undefined) {
    if (secState.phase === 'error') section.append(uiStyle(identityNode('p', `아래는 직전에 읽은 값(${latest.network.time ?? '시각 확인 불가'})이며 지금 값이 아닙니다.`, 'student-pc-stale'), { fontWeight: '600', margin: '6px 0' }));
    section.append(secTable(latest));
    for (const node of uiItemFailures([[SEC_ITEMS[0], latest.network], [SEC_ITEMS[1], latest.firewall], [SEC_ITEMS[2], latest.system], [SEC_ITEMS[3], latest.application]])) section.append(node);
    if (secState.phase === 'done') section.append(uiStatusLine(`조회 완료: ${latest.network.time ?? '시각 확인 불가'} 기준`));
  }
  section.append(uiNote('화면을 열 때 한 번 조회하고, 그 뒤에는 「다시 조회」 버튼을 직접 누를 때만 조회합니다.', 'student-pc-scope'));
  section.append(uiButton('연결·기록 다시 조회', '조회 중…', 'sec', busy, () => secLoad(true)));
  return section;
}

// 핵심 3가지(기록 보기 → 내 PC 상태 → 위험 알림)를 한 줄 요약으로 먼저 보여 줍니다.
const UI_SOURCE_TEXT = Object.freeze({ demo: '예제(demo) 자료', disconnected: '연결 없음', connected: '서버가 알려 준 값', unknown: '확인 불가' });

function uiTile(order, title, badge) {
  const tile = uiStyle(identityNode('section', undefined, 'student-tile'), {
    border: '1px solid var(--border)', borderRadius: 'var(--radius)', padding: '12px', background: 'var(--bg)',
  });
  tile.setAttribute('aria-label', `${order}. ${title}`);
  tile.append(uiHeading(`${order}. ${title}`));
  if (badge) tile.append(uiStyle(identityNode('p', badge, 'student-tile-badge'), { color: 'var(--muted)', fontSize: '0.85rem', margin: '0 0 6px' }));
  return tile;
}
function uiBig(text, muted) {
  return uiStyle(identityNode('p', text, 'student-tile-value'), { fontSize: '1.4rem', fontWeight: '700', margin: '2px 0', color: muted ? 'var(--muted)' : 'var(--text)' });
}
function uiSmall(text) {
  return uiStyle(identityNode('p', text), { color: 'var(--muted)', fontSize: '0.85rem', margin: '2px 0' });
}

function summarySection(notifications, mode) {
  const section = identityNode('section', undefined, 'student-summary');
  section.setAttribute('aria-label', '핵심 3가지 한눈에 보기');
  section.append(uiHeading('핵심 3가지 한눈에 보기', 'h3'));
  section.append(uiNote('이 PC 의 상태를 읽어 보여 줍니다. 「실측」은 이 PC 에서 직접 읽은 값이고, 「예제(demo)」는 설명용 값입니다. 값 옆의 시각은 읽은 시각입니다. Tab 키로 버튼에 이동하고 Enter 키로 누릅니다.', 'student-summary-help'));
  const busy = pcState.phase === 'loading' || secState.phase === 'loading';
  section.append(uiButton('전체 다시 조회', '조회 중…', 'all', busy, () => {
    pcRequest(pcState, '/api/pc-status', pcSample, PC_HISTORY_MAX, false);
    secLoad(false);
    pcState.onChange?.();
  }));
  const grid = uiStyle(identityNode('div', undefined, 'student-tiles'), { display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '12px', margin: '12px 0' });

  const records = uiTile(1, '기록 보기');
  records.append(uiBig('보안 기록', true));
  records.append(uiSmall('접속·XDR 기록 목록과 상세는 왼쪽 메뉴 「보안 기록」에서 봅니다. 이 칸은 기록 건수를 세지 않습니다.'));
  grid.append(records);

  const pc = uiTile(2, '내 PC 상태', '실측 · 이 PC 에서 읽은 값');
  const latest = pcState.history[0];
  if (pcState.api === null) pc.append(uiBig('확인 불가', true), uiSmall('측정을 요청할 통로가 없습니다.'));
  else if (latest === undefined) pc.append(uiBig(pcState.phase === 'error' ? '조회 실패' : '조회 중…', true), uiSmall(pcState.phase === 'error' ? '아래 「내 PC 상태」의 실패 안내를 보세요. 예시 값은 쓰지 않았습니다.' : '값을 읽는 중입니다.'));
  else {
    const line = (label, metric, text) => pc.append(uiBig(`${label} ${metric.ok ? text : '확인 불가'}`, !metric.ok));
    line('CPU', latest.cpu, `${latest.cpu.percent} %`);
    line('메모리', latest.memory, `${latest.memory.percent} % 사용`);
    line('디스크', latest.disk, `${pcGb(latest.disk.freeBytes)} 남음`);
    pc.append(uiSmall(pcState.phase === 'error' ? `직전에 읽은 값 (${latest.cpu.time ?? '시각 확인 불가'}) · 최근 조회 실패` : `${latest.cpu.time ?? '시각 확인 불가'}에 읽음`));
  }
  grid.append(pc);

  const alerts = uiTile(3, '위험 알림', UI_SOURCE_TEXT[Object.hasOwn(UI_SOURCE_TEXT, mode) ? mode : 'unknown']);
  if (!Array.isArray(notifications)) alerts.append(uiBig('확인 불가', true), uiSmall('알림 목록을 읽을 수 없습니다.'));
  else alerts.append(uiBig(notifications.length === 0 ? '주의할 알림 없음' : `주의 · ${notifications.length}건`, false), uiSmall('기기·세션·기록에서 서버가 알려 준 주의 항목 수입니다. 침해나 공격 판정이 아닙니다.'));
  grid.append(alerts);
  section.append(grid);
  return section;
}

function statusView(input) {
  const { devices, sessions, notifications, diagnostics, mode } = input !== null && typeof input === 'object' ? input : {};
  const root = identityNode('section', undefined, 'student-status');
  root.setAttribute('aria-label', '핵심 3가지와 기기·세션·알림·도움정보');
  const topMode = typeof mode === 'string' ? mode : null;
  root.append(summarySection(notifications, topMode));
  root.append(uiHeading('자세히 보기', 'h3'));
  root.append(pcStatusSection());
  root.append(statusNotifications(notifications));
  root.append(securitySection(topMode));
  if (topMode !== null && Object.hasOwn(STATUS_MODE_NOTICE, topMode)) root.append(identityNode('p', STATUS_MODE_NOTICE[topMode], 'student-status-mode'));
  root.append(statusGroup('기기', '기기 정보', statusResource(devices), topMode, '등록된 기기가 없습니다.', (rows) => statusList(rows, (device) => `${identityNamed(device)} · ${identityStatus(DEVICE_STATUS_TEXT, device?.status)}`)));
  root.append(identityNode('p', '기기는 내 이름으로 등록되고 회수되지 않은 기기이며 100개까지 보입니다.', 'student-status-scope'));
  root.append(statusGroup('세션', '세션 정보', statusResource(sessions), topMode, '현재 연결이 없습니다.', (rows) => statusList(rows, (session) => `${identityText(session?.id) ?? '확인 불가'} · ${identityStatus(SESSION_STATUS_TEXT, session?.status)}`)));
  root.append(identityNode('p', '세션은 지금 검증된 연결 한 개만 보입니다. 지난 세션 목록이 아닙니다.', 'student-status-scope'));
  root.append(statusDiagnostics(statusResource(diagnostics)));
  return root;
}

// ---------- 17단계: 앱 안 AI 연결 점검과 사건 설명 기초 (renderAiConnection·renderExplanation 에서만 씁니다) ----------
// 연결 점검(모델 목록 응답)과 실제 사건 설명 실행은 서로 다른 일입니다. 점검이 ok 여도 사건 설명이 된 것처럼 쓰지 않습니다.
const AI_AUTHORIZATION_TEXT = Object.freeze({
  test: '시험 연결 점검(test): 실제 앱 권한을 확인한 것이 아닙니다.',
  verified: '앱 권한 확인 후 점검(verified): 그 시각 기준 앱 권한 확인과 모델 응답입니다.',
});
const AI_MODE_NOTICE = Object.freeze({
  demo: '예제 자료(demo): 실제 AI 연결이 아닙니다.',
  disconnected: '연결 없음(disconnected): 서버에 연결되어 있지 않습니다.',
  unknown: '확인 불가(unknown): 연결 상태를 확인할 수 없습니다.',
});
const AI_ASK_ADMIN = '담당자에게 계정 연결과 앱 권한 확인을 요청하세요.';
const AI_RETRY_LATER = '잠시 뒤 직접 다시 점검하세요.';
// 오류 코드 → [원인, 안내]. 모르는 코드는 확인 불가입니다. 원문 오류나 열쇠는 쓰지 않고 안전한 code·message 만 보여 줍니다.
const AI_ERROR_KIND = Object.freeze({
  ON_AI_PROVISIONING_PENDING: ['권한 준비 중', `학생 앱 이용 권한의 발급·연결이 준비 중입니다. 운영 측 준비가 끝나기 전에는 나올 수 있으며 학생 잘못이 아닙니다. ${AI_ASK_ADMIN}`],
  AI_REQUEST_UNVERIFIED: ['확인 불가', `AI 연결 또는 응답을 확인할 수 없습니다. 연결 완료로 보지 않습니다. ${AI_RETRY_LATER} 계속되면 ${AI_ASK_ADMIN}`],
  SUBJECT_SCOPE_UNVERIFIED: ['확인 불가', `현재 로그인과 사건·프로젝트의 연결을 확인할 수 없습니다. ${AI_ASK_ADMIN}`],
  WB_CLCO_AUTH_REQUIRED: ['인증 실패', '앱 전용 인증을 확인할 수 없습니다. 계정 연결을 다시 확인하고, 계속되면 담당자에게 확인하세요.'],
  WB_CLCO_ACCESS_BLOCKED: ['접근 제한', '학생 앱 AI 이용이 제한됐습니다. 계정 연결을 다시 확인하고 담당자에게 이용 권한을 확인하세요.'],
  ON_AI_AUTHORIZATION_CHANGED: ['권한 변경', '점검 도중 AI 이용 권한 내용이 바뀌었습니다. 담당자에게 현재 권한을 확인한 뒤 직접 다시 점검하세요.'],
  WB_CLCO_COHORT_BUDGET_EXHAUSTED: ['반 사용량 소진', '반의 AI 사용량이 소진됐습니다. 담당자에게 확인하세요.'],
  WB_CLCO_LIMIT_REACHED: ['이용 한도 도달', 'AI 이용 한도에 도달했습니다. 담당자에게 확인하세요.'],
  WB_CLCO_SESSION_CLOSED: ['이용 시간 아님', '지금은 AI 이용 시간이 아닙니다. 이용 시간을 확인하세요.'],
  WB_CLCO_RATE_LIMITED: ['요청 제한', `AI 요청이 잠시 제한됐습니다. ${AI_RETRY_LATER}`],
  WB_CLCO_TIMEOUT: ['시간 초과', `AI 응답 시간이 초과됐습니다. ${AI_RETRY_LATER}`],
  REQUEST_TIMEOUT: ['시간 초과', `서버의 AI 응답 시간이 초과됐습니다. ${AI_RETRY_LATER}`],
  ENGINE_TIMEOUT: ['시간 초과', `서버의 확인 시간이 초과됐습니다. ${AI_RETRY_LATER}`],
  TIMEOUT: ['시간 초과', `응답 시간이 초과됐습니다. ${AI_RETRY_LATER}`],
  NETWORK_ERROR: ['네트워크 오류', `서버에 연결할 수 없습니다. ${AI_RETRY_LATER}`],
  WB_CLCO_NETWORK_ERROR: ['네트워크 오류', `AI 서비스까지 네트워크로 연결하지 못했습니다. ${AI_RETRY_LATER}`],
  WB_CLCO_SERVER_UNAVAILABLE: ['네트워크 오류', `AI 서비스가 일시적으로 응답하지 않습니다. ${AI_RETRY_LATER}`],
  WB_CLCO_CANCELLED: ['취소', '점검을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.'],
  CANCELLED: ['취소', '점검을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.'],
  REQUEST_CANCELLED: ['취소', '점검을 취소했습니다. 이전 응답은 현재 결과가 아닙니다.'],
  ON_AI_MODEL_LIST_EMPTY: ['쓸 수 있는 모델 없음', '현재 앱 권한으로 쓸 수 있는 AI 모델이 없습니다. 담당자에게 모델 허용 설정 확인을 요청하세요.'],
  MODEL_NOT_CONFIGURED: ['모델 설정 없음', '서버에 사용할 AI 모델이 설정되어 있지 않습니다. 담당자에게 모델 설정 확인을 요청하세요.'],
  ON_AI_INVALID_OUTPUT: ['응답 확인 불가', 'AI 응답의 형식이나 근거를 확인할 수 없습니다. 기존 기록은 그대로입니다.'],
  ON_AI_INVALID_INPUT: ['입력 확인 불가', '설명에 필요한 사건 근거·규칙을 확인할 수 없습니다. 기존 기록은 그대로입니다.'],
});
const AI_RECHECK_TEXT = '자동으로 다시 점검하지 않습니다. 다시 점검은 제공 화면의 「AI 연결 점검」 버튼을 직접 누르세요.';

// 안전한 오류 코드만 그대로 보여 줍니다. 모양이 이상하면 확인 불가로 둡니다.
function aiSafeCode(error) {
  return typeof error?.code === 'string' && /^[A-Za-z0-9_.-]{1,64}$/u.test(error.code) ? error.code : null;
}

// 연결 점검 화면: 호출마다 새로 만들어 이전 점검 결과와 오류 안내가 남지 않습니다. idle 이 오면 점검 전으로 돌아갑니다.
function aiConnectionView(input) {
  const { status, mode, data, error, checkedAt, explanationAccepted } = input !== null && typeof input === 'object' ? input : {};
  const root = identityNode('section', undefined, 'student-ai-connection');
  root.setAttribute('aria-label', 'AI 연결 점검 결과');
  if (typeof mode === 'string' && Object.hasOwn(AI_MODE_NOTICE, mode)) root.append(identityNode('p', AI_MODE_NOTICE[mode], 'student-ai-mode'));

  if (status === 'idle') {
    root.append(identityNode('p', 'AI 연결 점검 전', 'student-ai-idle'));
    root.append(identityNode('p', '아직 점검하지 않았고, 사건 설명도 실행하지 않았습니다. 점검은 제공 화면의 「AI 연결 점검」 버튼을 직접 눌러 시작합니다. 자동으로 점검하지 않습니다.', 'student-ai-note'));
    return root;
  }
  if (status === 'loading') {
    root.append(identityNode('p', 'AI 연결 점검 중', 'student-ai-loading'));
    root.append(identityNode('p', '점검 결과가 올 때까지 이전 결과는 보이지 않습니다. 사건 설명은 아직 실행하지 않았습니다.', 'student-ai-note'));
    return root;
  }
  if (status === 'error') {
    const code = aiSafeCode(error);
    const kind = code !== null && Object.hasOwn(AI_ERROR_KIND, code) ? AI_ERROR_KIND[code] : ['확인 불가', '원인을 확인할 수 없습니다. 연결 성공으로 보지 않습니다. 담당자에게 알려 주세요.'];
    root.append(identityNode('p', `AI 연결 점검 실패: ${kind[0]}`, 'student-ai-error'));
    root.append(identityNode('p', `오류 코드(error.code): ${code ?? '확인 불가'}`, 'student-ai-code'));
    root.append(identityNode('p', `메시지(error.message): ${statusSafe(error?.message, 300) ?? '서버가 메시지를 보내지 않았습니다.'}`, 'student-ai-message'));
    root.append(identityNode('p', kind[1], 'student-ai-guide'));
    root.append(identityNode('p', '연결 점검이 실패했으므로 사건 설명도 확인되지 않았습니다.', 'student-ai-note'));
    root.append(identityNode('p', AI_RECHECK_TEXT, 'student-ai-retry'));
    return root;
  }

  const authorization = typeof data?.audienceAuthorization === 'string' ? data.audienceAuthorization : null;
  if (status === 'ok' && data !== null && typeof data === 'object' && authorization !== null && Object.hasOwn(AI_AUTHORIZATION_TEXT, authorization)) {
    root.append(identityNode('p', `AI 연결 점검 결과: ${AI_AUTHORIZATION_TEXT[authorization]}`, 'student-ai-ok'));
    const list = identityNode('dl');
    decisionRow(list, '점검 종류(audienceAuthorization)', authorization === 'test' ? '시험 연결 점검(test)' : '앱 권한 확인 후 점검(verified)');
    decisionRow(list, '응답 모델 수(modelCount)', Number.isInteger(data.modelCount) && data.modelCount >= 0 ? String(data.modelCount) : '확인 불가');
    decisionRow(list, '점검 시각(checkedAt)', decisionTime(checkedAt));
    root.append(list);
    // 모델 목록 응답은 연결 점검일 뿐입니다. 사건 설명을 실행했다고 읽히게 쓰지 않습니다.
    root.append(identityNode('p', explanationAccepted === false || explanationAccepted === undefined
      ? '연결만 점검했습니다. 사건 설명은 아직 실행하지 않았습니다. 모델 목록 응답은 사건 설명이 아닙니다. 사건 설명은 보안 기록에서 「AI 설명 요청」으로 따로 요청하고 확인합니다.'
      : '확인 불가: explanationAccepted 값이 이 단계의 계약(false)과 다릅니다. 사건 설명이 실행됐다고 표시하지 않습니다.', 'student-ai-note'));
    root.append(identityNode('p', AI_RECHECK_TEXT, 'student-ai-retry'));
    return root;
  }
  root.append(identityNode('p', '확인 불가: AI 연결 점검 응답을 읽을 수 없습니다. 연결 성공으로 보지 않습니다.', 'student-ai-unverified'));
  root.append(identityNode('p', '사건 설명도 확인되지 않았습니다.', 'student-ai-note'));
  return root;
}

// ---------- 18단계: 근거에 연결된 AI 사건 설명 (renderExplanation) ----------
const STATUS_STATE_VALUES = Object.freeze({
  access: Object.freeze({ allowed: 1, denied: 1 }),
  session: Object.freeze({ active: 1, expired: 1, revoked: 1 }),
  device: Object.freeze({ compliant: 1, noncompliant: 1 }),
});
const EXPLAIN_STATE_NAMES = Object.freeze([['access', '접속'], ['session', '세션'], ['device', '기기']]);
const EXPLAIN_NO_ACTIONS = '연동 시스템이 지원하는 조치가 없어 제안이 없습니다(정상).';
const EXPLAIN_NO_PROPOSAL = 'AI 가 제안한 조치가 없습니다.';
const EXPLAIN_RECORD_KEPT = '기록은 그대로입니다. AI 설명이 실패해도 업무 앱 판정과 보안 기록은 계속 동작하며, 과제 실패가 아닙니다.';
const EXPLAIN_REFERENCE = 'AI 설명은 참고 정보입니다. 사실 판단은 근거 글과 연동 시스템이 알려 준 상태로 하며, 설명·제안만으로 보안 조치가 실행되지는 않습니다.';

// 설명 안에서 쓰는 id·글 한 줄을 안전하게 읽습니다. 형식이 틀리면 null 입니다.
function explainRows(list) {
  if (!Array.isArray(list)) return null;
  const rows = [];
  for (const row of list) {
    const id = identityText(row?.id);
    const text = statusSafe(row?.text, 500);
    if (id === null || text === null) return null;
    rows.push({ id, text });
  }
  return rows;
}

// 설명이 이 기록에 속하는지 검사합니다. 맞지 않으면 사유를 돌려주고, 없는 근거 ID 를 만들어 맞추지 않습니다.
function explainCheck(event, data) {
  if (event === null || typeof event !== 'object' || identityText(event.id) === null) return { reason: '선택한 기록을 확인할 수 없습니다.' };
  const evidence = explainRows(event.evidence);
  const rules = explainRows(event.rules);
  if (evidence === null || rules === null) return { reason: '기록의 근거·규칙을 확인할 수 없습니다.' };
  if (data === null || typeof data !== 'object' || statusSafe(data.summary, 1500) === null || data.summary.trim() === '') return { reason: 'AI 요약을 확인할 수 없습니다.' };
  if (data.executed !== false) return { reason: 'AI 응답이 조치를 이미 실행했다고 하거나 실행 여부를 확인할 수 없어 쓸 수 없습니다.' };
  if (data.requiresHumanConfirmation !== true) return { reason: '사람 확인이 필요하다는 표시가 없어 쓸 수 없습니다.' };
  const known = new Map(evidence.map((row) => [row.id, row.text]));
  const cited = Array.isArray(data.evidenceIds) ? data.evidenceIds.map((id) => identityText(id)) : [];
  if (cited.length === 0 || cited.some((id) => id === null) || new Set(cited).size !== cited.length) return { reason: '인용한 근거 ID 를 확인할 수 없습니다.' };
  const missing = cited.filter((id) => !known.has(id));
  if (missing.length > 0) return { reason: `근거가 이 기록과 맞지 않습니다. 이 기록에 없는 근거 ID: ${missing.join(', ')}` };
  const supported = Array.isArray(event.supportedActions) ? event.supportedActions.map((a) => identityText(a)) : null;
  if (supported === null || supported.includes(null)) return { reason: '기록의 지원 조치를 확인할 수 없습니다.' };
  if (!Array.isArray(data.proposals)) return { reason: '제안 목록을 확인할 수 없습니다.' };
  const proposals = [];
  for (const item of data.proposals) {
    const action = identityText(item?.action);
    const reason = statusSafe(item?.reason, 500);
    const refs = Array.isArray(item?.evidenceIds) ? item.evidenceIds.map((id) => identityText(id)) : [];
    if (action === null || reason === null || !supported.includes(action) || refs.length === 0 || refs.some((id) => id === null || !known.has(id))) {
      return { reason: '제안이 이 기록의 지원 조치나 근거와 맞지 않아 쓸 수 없습니다.' };
    }
    proposals.push({ action, reason, refs });
  }
  return { evidence: cited.map((id) => ({ id, text: known.get(id) })), rules, proposals, supported, summary: statusSafe(data.summary, 1500) };
}

function explainList(rows, title) {
  const section = identityNode('section', undefined, 'student-ai-group');
  section.append(identityNode('h5', title));
  const list = identityNode('ul');
  for (const row of rows) list.append(identityNode('li', `${row.id} — ${row.text}`));
  section.append(list);
  return section;
}

// 사건 설명: 성공이고 이 기록의 근거와 맞을 때만 data-student-explanation-event 표식을 붙입니다.
// 호출마다 새로 만들기 때문에 다른 기록·새로고침·실패 뒤에는 이전 설명과 표식이 남지 않습니다.
function aiExplanationView(input) {
  const { event, explanation, checkedAt } = input !== null && typeof input === 'object' ? input : {};
  const res = explanation !== null && typeof explanation === 'object' ? explanation : {};
  const root = identityNode('section', undefined, 'student-ai-explanation');
  root.setAttribute('aria-label', '사건 AI 설명');
  if (typeof res.mode === 'string' && Object.hasOwn(AI_MODE_NOTICE, res.mode)) root.append(identityNode('p', AI_MODE_NOTICE[res.mode], 'student-ai-mode'));

  // 실패는 선택한 기록이 없어도 먼저 보여 줍니다.
  if (res.status === 'error') {
    const code = aiSafeCode(res.error);
    root.append(identityNode('p', `AI 설명 실패: ${code ?? '확인 불가'} · ${statusSafe(res.error?.message, 300) ?? '서버가 메시지를 보내지 않았습니다.'}`, 'student-ai-error'));
    if (code === 'ON_AI_INVALID_OUTPUT') root.append(identityNode('p', '실패 이유: 근거가 부족하거나 맞지 않거나, 조치를 이미 실행했다고 답한 설명은 쓸 수 없습니다.', 'student-ai-reason'));
    else if (code === 'ON_AI_INVALID_INPUT') root.append(identityNode('p', '실패 이유: 설명에 필요한 사건 근거·규칙을 확인할 수 없습니다.', 'student-ai-reason'));
    root.append(identityNode('p', EXPLAIN_RECORD_KEPT, 'student-ai-note'));
    return root;
  }
  if (res.status === 'loading') {
    root.append(identityNode('p', 'AI 설명을 요청하는 중입니다.', 'student-ai-loading'));
    return root;
  }
  if (event === null || event === undefined) {
    root.append(identityNode('p', '보안 기록에서 기록을 먼저 고르세요.', 'student-ai-idle'));
    return root;
  }
  if (res.status === 'idle' || res.status === undefined) {
    root.append(identityNode('p', '이 기록의 AI 설명을 아직 요청하지 않았습니다. 보안 기록에서 「AI 설명 요청」을 누르세요.', 'student-ai-idle'));
    return root;
  }
  const checked = res.status === 'ok' ? explainCheck(event, res.data) : { reason: 'AI 설명 응답을 읽을 수 없습니다.' };
  if (checked.reason !== undefined) {
    root.append(identityNode('p', `확인 불가: 이 AI 설명은 쓸 수 없습니다. ${checked.reason}`, 'student-ai-unverified'));
    root.append(identityNode('p', EXPLAIN_RECORD_KEPT, 'student-ai-note'));
    return root;
  }

  root.setAttribute('data-student-explanation-event', identityText(event.id));
  root.append(identityNode('h4', 'AI 설명(참고용)'));
  const info = identityNode('dl');
  decisionRow(info, '사건 ID', identityText(event.id));
  decisionRow(info, '설명 시각', decisionTime(checkedAt));
  root.append(info);
  root.append(identityNode('p', `AI 요약: ${checked.summary}`, 'student-ai-summary'));
  root.append(explainList(checked.evidence, '인용한 근거 (근거 ID — 근거 글)'));
  root.append(explainList(checked.rules, '규칙 (규칙 ID — 규칙 글)'));

  // unknown 은 안전·정상으로 바꾸지 않고 확인 불가로 나열합니다. 값이 없거나 이상한 것도 확인 불가입니다.
  const unknowns = [];
  for (const [key, name] of EXPLAIN_STATE_NAMES) {
    const value = event.state !== null && typeof event.state === 'object' ? event.state[key] : undefined;
    const known = Object.hasOwn(STATUS_STATE_VALUES[key], String(value));
    if (value === 'unknown') unknowns.push(`${name}: 확인 불가(unknown)`);
    else if (!known) unknowns.push(`${name}: 확인 불가(값 없음 또는 알 수 없는 값)`);
  }
  const stateGroup = identityNode('section', undefined, 'student-ai-group');
  stateGroup.append(identityNode('h5', '확인 불가 상태'));
  if (unknowns.length === 0) stateGroup.append(identityNode('p', '없음'));
  else {
    const list = identityNode('ul');
    for (const line of unknowns) list.append(identityNode('li', line));
    stateGroup.append(list);
  }
  root.append(stateGroup);

  const proposalGroup = identityNode('section', undefined, 'student-ai-group');
  proposalGroup.append(identityNode('h5', 'AI 제안'));
  if (checked.proposals.length === 0) {
    proposalGroup.append(identityNode('p', checked.supported.length === 0 ? EXPLAIN_NO_ACTIONS : EXPLAIN_NO_PROPOSAL, 'student-ai-no-proposal'));
  } else {
    const list = identityNode('ul');
    for (const item of checked.proposals) list.append(identityNode('li', `조치: ${item.action} · 이유: ${item.reason} · 근거 ID: ${item.refs.join(', ')} · 사람 확인이 필요하며 실행되지 않았습니다.`));
    proposalGroup.append(list);
  }
  root.append(proposalGroup);
  root.append(identityNode('p', EXPLAIN_REFERENCE, 'student-ai-note'));
  return root;
}

// ---------- 19단계: AI 조치 제안과 연동 시스템 처리 결과 (renderAction) ----------
// 조치 제안·사람 확인·서버 접수(ACK)·실제 효과 확인은 서로 다른 단계입니다. 이 화면은 버튼과 요청을 만들지 않고 받은 상태만 보여 줍니다.
const ACTION_STATUS_TEXT = Object.freeze({
  idle: '아직 미실행(idle)',
  loading: '조치 준비 또는 결과 조회 중(loading)',
  prepared: '준비됨 · 미실행(prepared)',
  executing: '서버에 전달 중(executing)',
  pending: '서버 접수·처리 중(pending)',
  denied: '연동 시스템 거절(denied)',
  failed: '연동 시스템 실패(failed)',
  unknown: '결과 불명(unknown)',
  expired: '확인 기한 지남(expired)',
  error: '요청 처리 안 됨(error)',
});
const ACTION_STATUS_NOTE = Object.freeze({
  idle: '조치 준비 버튼이 보이지 않는 것은 정상일 수 있습니다. 기록의 지원 조치(supportedActions)가 비어 있으면 연동 시스템이 지원하는 조치가 없어 실제 처리 경로가 열리지 않습니다.',
  loading: '결과가 아직 확인되지 않았습니다.',
  prepared: '아직 서버에 전달하지 않았습니다. 사람이 아래 대상과 조치를 확인한 뒤 제공 화면의 「대상과 조치를 확인했으며 집행합니다」 버튼을 직접 눌러야 전달됩니다.',
  executing: '결과가 아직 없습니다. 효과는 확인되지 않았습니다.',
  pending: '서버가 요청을 받았다는 표시(ACK)일 뿐 효과를 확인한 것이 아닙니다. 결과가 아직 확인되지 않았습니다. 제공 화면의 「원천 결과만 재조회」로 결과만 다시 조회하세요.',
  denied: '연동 시스템이 이 조치를 허용하지 않았습니다. 효과가 적용되지 않았습니다.',
  failed: '연동 시스템이 조치를 처리하지 못했습니다. 효과가 확인되지 않았습니다.',
  unknown: '성공으로도 효과 없음으로도 판단하지 않습니다. 이미 전달된 조치일 수 있으니 제공 화면의 「원천 결과만 재조회」로 결과만 다시 조회하세요.',
  expired: '이번 준비로는 집행할 수 없습니다. 현재 기록에서 조치를 다시 준비하고 대상을 확인하세요.',
  error: '요청이 처리되지 않았습니다. 아래 오류 코드와 메시지를 확인하세요.',
});
const ACTION_SCREEN_NOTE = '조치 준비·집행·결과 재조회·조치 화면 취소는 제공 화면의 버튼으로 합니다. 이 화면은 조치를 요청하지 않으며, 「조치 화면 취소」도 이미 서버에 전달된 조치 효과를 되돌리지 않습니다.';

function actionValue(value, max = 200) {
  return statusSafe(value, max);
}

// 효과 확인은 succeeded 이면서 observation.effectApplied === true, 관측 시각, receiptId 가 모두 있을 때만 입니다.
function actionConfirmed(input, receipt) {
  const observation = input.observation !== null && typeof input.observation === 'object' ? input.observation : null;
  return input.status === 'succeeded' && observation !== null && observation.effectApplied === true
    && actionValue(observation.observedAt) !== null && actionValue(receipt?.receiptId) !== null;
}

function actionView(input) {
  const s = input !== null && typeof input === 'object' ? input : {};
  const status = typeof s.status === 'string' && Object.hasOwn(ACTION_STATUS_TEXT, s.status) ? s.status : s.status === 'succeeded' ? 'succeeded' : null;
  const event = s.event !== null && typeof s.event === 'object' ? s.event : null;
  const receipt = s.receipt !== null && typeof s.receipt === 'object' ? s.receipt : null;
  const target = s.target !== null && typeof s.target === 'object' ? s.target : null;
  const observation = s.observation !== null && typeof s.observation === 'object' ? s.observation : null;
  const eventId = actionValue(event?.id);
  const actionId = actionValue(s.actionId);
  const requestId = actionValue(receipt?.requestId);
  const root = identityNode('section', undefined, 'student-action');
  root.setAttribute('aria-label', '조치 상태');

  // 접수 정보가 현재 사건·조치와 다르면 그 결과를 쓰지 않습니다.
  const mismatch = receipt !== null && ((receipt.eventId !== undefined && actionValue(receipt.eventId) !== eventId)
    || (receipt.actionId !== undefined && actionValue(receipt.actionId) !== actionId));
  const confirmed = !mismatch && actionConfirmed(s, receipt);
  // succeeded 인데 효과를 확인하지 못했거나 알 수 없는 상태값이면 결과 불명으로 처리합니다.
  const shown = mismatch || status === null || (status === 'succeeded' && !confirmed) ? 'unknown' : status;

  let headline = confirmed ? '효과 확인(succeeded)' : ACTION_STATUS_TEXT[shown];
  let note = confirmed ? '연동 시스템이 효과를 관측했습니다.' : ACTION_STATUS_NOTE[shown];
  if (mismatch) note = '확인 불가: 받은 접수 정보가 현재 사건·조치와 맞지 않아 이 결과를 쓰지 않습니다. ' + ACTION_STATUS_NOTE.unknown;
  else if (status === null) note = `확인 불가: 알 수 없는 상태값입니다. ${ACTION_STATUS_NOTE.unknown}`;
  else if (status === 'succeeded' && !confirmed) note = `연동 시스템 관측으로 효과 적용(effectApplied: true)을 확인하지 못해 효과 확인으로 표시하지 않습니다. ${ACTION_STATUS_NOTE.unknown}`;
  root.append(identityNode('p', `조치 상태: ${headline}`, confirmed ? 'student-action-confirmed' : 'student-action-status'));
  root.append(identityNode('p', note, 'student-action-note'));

  const message = actionValue(s.message, 300);
  if (message !== null && message !== '') root.append(identityNode('p', `서버 메시지: ${message}`, 'student-action-message'));
  if (s.error !== null && typeof s.error === 'object') {
    root.append(identityNode('p', `오류 코드(error.code): ${aiSafeCode(s.error) ?? '확인 불가'}`, 'student-action-error'));
    root.append(identityNode('p', `오류 메시지(error.message): ${actionValue(s.error.message, 300) ?? '서버가 메시지를 보내지 않았습니다.'}`, 'student-action-error'));
  }

  // 받은 범위에서만 표시합니다. 확인 번호(confirmationId)는 입력에서 읽지도 보관하지도 않습니다.
  const list = identityNode('dl');
  const row = (label, value) => { if (value !== null && value !== undefined && value !== '') decisionRow(list, label, String(value)); };
  row('사건 ID(event.id)', eventId);
  const evidenceIds = Array.isArray(event?.evidence) ? event.evidence.map((e) => actionValue(e?.id)).filter((id) => id !== null) : [];
  if (evidenceIds.length > 0) row('근거 ID(evidence)', evidenceIds.join(', '));
  row('조치(actionId)', actionId);
  row('실제 대상(target.id)', actionValue(target?.id));
  row('대상 세대(target.generation)', actionValue(target?.generation));
  row('요청 ID(requestId)', requestId);
  row('접수증 ID(receiptId)', actionValue(receipt?.receiptId));
  row('버전(version)', actionValue(receipt?.version));
  if (shown === 'prepared' || shown === 'expired') row('사람 확인 기한(confirmationExpiresAt)', s.confirmationExpiresAt === undefined || s.confirmationExpiresAt === null ? null : decisionTime(s.confirmationExpiresAt));
  if (confirmed) {
    row('관측 시각(observedAt)', decisionTime(observation.observedAt));
    row('실제 효과(effectApplied)', 'true');
  }
  if (list.children.length > 0) root.append(list);

  if (receipt?.replayed === true) root.append(identityNode('p', '같은 요청의 결과를 다시 돌려준 응답입니다(replayed: true). 새로 집행한 것이 아닙니다.', 'student-action-note'));
  if (receipt?.superseded === true) root.append(identityNode('p', '이전 조회는 최신 결과를 대신하지 않습니다(superseded).', 'student-action-note'));
  root.append(identityNode('p', ACTION_SCREEN_NOTE, 'student-action-note'));

  // 속성은 현재 사건에 묶인 정상 상태(준비·전달 중·접수·효과 확인)를 그렸을 때만 붙입니다. 실패·불명·만료·오류·idle 에는 붙이지 않습니다.
  const drawn = !mismatch && (confirmed || ['prepared', 'executing', 'pending'].includes(shown));
  if (drawn && eventId !== null && requestId !== null) {
    root.setAttribute('data-student-action-event', eventId);
    root.setAttribute('data-student-action-request', requestId);
  }
  return root;
}

// ---------- 20단계: 설치 패키지 버전과 알려진 취약점(OSV) 조회 결과 (renderVulnerabilities) ----------
// 조회 실패·미조회는 "취약점 없음"이 아닙니다. 조회 결과가 없다는 사실만으로 패키지나 앱이 안전하다고 보장할 수 없습니다.
const VULN_SCAN_TEXT = Object.freeze({
  complete: ['모두 조회(complete)', '조회 대상 패키지를 모두 조회했습니다.'],
  partial: ['일부 조회 실패(partial)', '일부 패키지는 조회하지 못했습니다. 조회하지 못한 패키지는 취약점이 없다는 뜻이 아닙니다. 이미 받은 취약점 ID는 그대로 보여 줍니다.'],
  not_checked: ['아직 조회 안 함(not_checked)', '승인된 공개 조회 대상 패키지가 없어 조회하지 않았습니다. 조회 대상은 운영자가 준비합니다.'],
  not_configured: ['조회 준비 미완료(not_configured)', '조회 대상 프로젝트 설정이 필요해 조회하지 않았습니다. 설정은 운영자가 준비하며 이 화면에서 바꾸지 않습니다.'],
  unverifiable: ['lock 파일 확인 불가(unverifiable)', 'package-lock.json 을 확인할 수 없어 조회하지 않았습니다.'],
});
const VULN_PACKAGE_TEXT = Object.freeze({
  known_vulnerabilities: '알려진 항목 있음(known_vulnerabilities)',
  none_found: '알려진 항목 없음(none_found)',
});
const VULN_MODE_NOTICE = Object.freeze({
  demo: '예제 자료(demo): 실제 프로젝트의 조회 결과가 아닙니다.',
  disconnected: '연결 없음(disconnected): 서버에 연결되어 있지 않습니다.',
  unknown: '확인 불가(unknown): 연결 상태를 확인할 수 없습니다.',
});
const VULN_ERROR_GUIDE = Object.freeze({
  CANCELLED: '조회를 취소했습니다. 이전 결과는 현재 확인 결과가 아닙니다.',
  REQUEST_CANCELLED: '조회를 취소했습니다. 이전 결과는 현재 확인 결과가 아닙니다.',
  TIMEOUT: '조회 응답이 늦어 중단했습니다. 잠시 뒤 직접 다시 조회하세요.',
  REQUEST_TIMEOUT: '조회 응답이 늦어 중단했습니다. 잠시 뒤 직접 다시 조회하세요.',
  SERVICE_UNAVAILABLE: '지금은 조회를 처리할 수 없습니다. 잠시 뒤 직접 다시 조회하세요.',
  CONTRACT_MISMATCH: '조회 응답 형식을 확인할 수 없어 결과를 표시하지 않습니다.',
});
const VULN_NOT_SAFE = '조회 결과가 없다는 사실만으로 해당 패키지나 앱 전체가 안전하다고 보장할 수 없습니다. OSV는 알려진 취약점 데이터베이스입니다.';
const VULN_HASH = /^[0-9a-f]{64}$/u;
const VULN_EXACT_VERSION = /^\d+\.\d+\.\d+(?:[-+][0-9A-Za-z.+-]+)?$/u;

function vulnTime(value) {
  const text = identityText(value);
  return text === null ? '확인 불가' : decisionTime(text);
}

function vulnFindings(list) {
  if (!Array.isArray(list)) return null;
  const out = [];
  for (const item of list) {
    const id = statusSafe(item?.id, 160);
    const modified = identityText(item?.modified);
    if (id === null || modified === null) return null;
    out.push({ id, modified });
  }
  return out;
}

function vulnPackageRow(pkg) {
  const row = identityNode('tr');
  const name = statusSafe(pkg?.name, 214);
  const versionText = identityText(pkg?.version);
  const exact = versionText !== null && VULN_EXACT_VERSION.test(versionText);
  if (name !== null) row.setAttribute('data-student-package-name', name);
  // 버전 범위(^1.2.0 등)나 형식이 틀린 값은 설치 버전으로 표시하지 않습니다.
  if (exact) row.setAttribute('data-student-package-version', versionText);
  const findings = vulnFindings(pkg?.vulnerabilities);
  const found = findings !== null && findings.length > 0;
  let statusText;
  if (pkg?.status === 'known_vulnerabilities' && found) statusText = VULN_PACKAGE_TEXT.known_vulnerabilities;
  else if (pkg?.status === 'none_found' && findings !== null && findings.length === 0) statusText = `${VULN_PACKAGE_TEXT.none_found} · 조회 범위(OSV, 조회 시각 기준)에서 알려진 항목이 없다는 뜻이며 안전을 보장하지 않습니다.`;
  else if (pkg?.status === 'unverifiable') statusText = found ? '일부 확인 · 전체 조회 확인 불가(unverifiable)' : '조회 확인 불가(unverifiable) · 취약점이 없다는 뜻이 아닙니다.';
  else statusText = '확인 불가 · 조회 상태를 읽을 수 없습니다. 취약점이 없다는 뜻이 아닙니다.';
  const idCell = identityNode('td');
  if (found) {
    const ul = identityNode('ul');
    for (const f of findings) ul.append(identityNode('li', `${f.id} · 수정 시각(modified): ${decisionTime(f.modified)}`));
    idCell.append(ul);
  } else idCell.append(identityNode('span', pkg?.status === 'none_found' ? '알려진 항목 없음' : '받은 항목 없음'));
  const cells = [
    name ?? '확인 불가',
    exact ? versionText : '설치 버전 확인 불가',
    statusText,
  ];
  for (const text of cells) row.append(identityNode('td', text));
  row.append(idCell);
  row.append(identityNode('td', statusSafe(pkg?.source, 200) ?? '확인 불가'));
  row.append(identityNode('td', vulnTime(pkg?.checkedAt)));
  return row;
}

function vulnPackageTable(packages) {
  const table = identityNode('table');
  table.setAttribute('aria-label', '설치 패키지별 조회 결과');
  const head = identityNode('thead');
  const headRow = identityNode('tr');
  for (const label of ['패키지', '설치 버전(lock 기준)', '조회 상태', '취약점 ID · 수정 시각', '출처', '패키지 조회 시각']) headRow.append(identityNode('th', label));
  head.append(headRow);
  table.append(head);
  const body = identityNode('tbody');
  for (const pkg of packages) body.append(vulnPackageRow(pkg));
  table.append(body);
  return table;
}

// 호출마다 새로 만들어서 조회 중·오류·다시 조회 뒤에 이전 표가 남지 않습니다.
function vulnerabilitiesView(input) {
  const { status, mode, data, error } = input !== null && typeof input === 'object' ? input : {};
  const root = identityNode('section', undefined, 'student-vulnerabilities');
  root.setAttribute('aria-label', '설치 패키지 취약점 조회 결과');
  if (typeof mode === 'string' && Object.hasOwn(VULN_MODE_NOTICE, mode)) root.append(identityNode('p', VULN_MODE_NOTICE[mode], 'student-vuln-mode'));

  if (status === 'idle') {
    root.append(identityNode('p', '조회 전', 'student-vuln-idle'));
    root.append(identityNode('p', '아직 조회하지 않았습니다. 제공 화면의 「설치 패키지 조회」 버튼을 직접 눌러 조회합니다. 조회하지 않은 것은 취약점이 없다는 뜻이 아닙니다.', 'student-vuln-note'));
    return root;
  }
  if (status === 'loading') {
    root.append(identityNode('p', '조회 중', 'student-vuln-loading'));
    root.append(identityNode('p', '이전 결과는 현재 결과가 아니므로 표시하지 않습니다.', 'student-vuln-note'));
    return root;
  }
  if (status === 'error') {
    const code = aiSafeCode(error);
    root.append(identityNode('p', `조회 실패: ${statusSafe(error?.message, 300) ?? '서버가 메시지를 보내지 않았습니다.'}`, 'student-vuln-error'));
    root.append(identityNode('p', `오류 코드(error.code): ${code ?? '확인 불가'}`, 'student-vuln-code'));
    if (code !== null && Object.hasOwn(VULN_ERROR_GUIDE, code)) root.append(identityNode('p', VULN_ERROR_GUIDE[code], 'student-vuln-guide'));
    root.append(identityNode('p', '조회 실패는 취약점이 없다는 뜻이 아닙니다. 이전 결과는 현재 결과로 표시하지 않습니다. 다시 조회는 제공 화면의 「설치 패키지 조회」 버튼을 직접 누르세요.', 'student-vuln-note'));
    return root;
  }

  const scan = status === 'ok' && data !== null && typeof data === 'object' && typeof data.status === 'string' && Object.hasOwn(VULN_SCAN_TEXT, data.status) ? data : null;
  if (scan === null) {
    root.append(identityNode('p', '확인 불가: 조회 결과를 읽을 수 없습니다.', 'student-vuln-unverified'));
    root.append(identityNode('p', '취약점이 없다는 뜻이 아닙니다. 제공 화면의 「설치 패키지 조회」 버튼으로 직접 다시 조회하세요.', 'student-vuln-note'));
    return root;
  }
  const [label, meaning] = VULN_SCAN_TEXT[scan.status];
  root.append(identityNode('p', `조회 상태: ${label}`, 'student-vuln-status'));
  root.append(identityNode('p', meaning, 'student-vuln-note'));

  // 전달된 값만 보여 줍니다. 해시는 64자리 16진수일 때만 그대로 보여 줍니다.
  const list = identityNode('dl');
  if (scan.lockfileVersion !== undefined) decisionRow(list, 'lockfileVersion', identityText(String(scan.lockfileVersion)) ?? '확인 불가');
  if (scan.lockfileHash !== undefined) decisionRow(list, 'lockfileHash', typeof scan.lockfileHash === 'string' && VULN_HASH.test(scan.lockfileHash) ? scan.lockfileHash : '확인 불가');
  if (scan.checkedAt !== undefined) decisionRow(list, '조회 시각(checkedAt)', vulnTime(scan.checkedAt));
  if (scan.excluded !== null && typeof scan.excluded === 'object' && Number.isSafeInteger(scan.excluded.count)) decisionRow(list, '조회에서 제외된 패키지', `${scan.excluded.count}건 · 제외된 패키지는 조회하지 않았습니다.`);
  if (list.children.length > 0) root.append(list);

  const packages = Array.isArray(scan.packages) ? scan.packages : [];
  if (packages.length === 0) {
    root.append(identityNode('p', scan.status === 'complete' ? '조회한 패키지가 없습니다.' : '조회한 패키지가 없어 표시할 결과가 없습니다. 조회하지 않은 것은 취약점이 없다는 뜻이 아닙니다.', 'student-vuln-empty'));
  } else {
    root.append(identityNode('p', '설치 버전은 package-lock.json 과 설치된 node_modules 의 메타데이터를 대조한 정확한 버전이며, ^1.2.0 같은 버전 범위가 아닙니다.', 'student-vuln-note'));
    root.append(vulnPackageTable(packages));
  }
  root.append(identityNode('p', VULN_NOT_SAFE, 'student-vuln-note'));
  return root;
}

export function createStudentView(host) {
  // 2일차: 화면이 허락한 조회 통로(api.get)와 다시 그리기(onChange)를 받아 내 PC 상태 측정에 씁니다.
  Object.assign(pcState, {
    api: typeof host?.api?.get === 'function' ? host.api : null,
    onChange: typeof host?.onChange === 'function' ? host.onChange : null,
    phase: 'idle', seq: pcState.seq + 1, errorCode: null, history: [],
  });
  Object.assign(secState, {
    api: pcState.api, onChange: pcState.onChange,
    phase: 'idle', seq: secState.seq + 1, errorCode: null, history: [],
  });
  return {
    renderIdentity(input) {
      const { me, devices, sessions } = input ?? {};
      const mine = identityResource(me);
      const deviceList = identityResource(devices);
      const sessionList = identityResource(sessions);
      const root = identityNode('section', undefined, 'student-identity');
      root.setAttribute('aria-label', '로그인 사용자·기기·세션');

      const meData = mine.data;
      const meValid = meData !== null && typeof meData === 'object'
        && meData.user !== null && typeof meData.user === 'object'
        && meData.device !== null && typeof meData.device === 'object'
        && meData.session !== null && typeof meData.session === 'object';
      root.append(identityGroup('현재 로그인', mine, meValid, () => {
        const list = identityNode('dl');
        identityRow(list, '사용자', identityNamed(meData.user));
        identityRow(list, '현재 기기', identityNamed(meData.device));
        identityRow(list, '기기 상태', identityStatus(DEVICE_STATUS_TEXT, meData.device.status));
        identityRow(list, '현재 세션', identityText(meData.session.id) ?? '확인 불가');
        identityRow(list, '세션 상태', identityStatus(SESSION_STATUS_TEXT, meData.session.status));
        return list;
      }));

      const deviceValid = Array.isArray(deviceList.data);
      root.append(identityGroup('내 기기 목록', deviceList, deviceValid, () => {
        if (deviceList.data.length === 0) return identityNode('p', '서버가 알려 준 기기가 없습니다.', 'student-identity-empty');
        const list = identityNode('ul');
        for (const device of deviceList.data) {
          list.append(identityNode('li', `${identityNamed(device)} · ${identityStatus(DEVICE_STATUS_TEXT, device?.status)}`));
        }
        return list;
      }));

      const sessionValid = Array.isArray(sessionList.data);
      root.append(identityGroup('내 세션 목록', sessionList, sessionValid, () => {
        if (sessionList.data.length === 0) return identityNode('p', '서버가 알려 준 세션이 없습니다.', 'student-identity-empty');
        const list = identityNode('ul');
        for (const session of sessionList.data) {
          list.append(identityNode('li', `${identityText(session?.id) ?? '확인 불가'} · ${identityStatus(SESSION_STATUS_TEXT, session?.status)}`));
        }
        return list;
      }));
      return root;
    },
    renderDecision(input) {
      const { status, mode, data, error, appId } = input !== null && typeof input === 'object' ? input : {};
      const root = identityNode('section', undefined, 'student-decision');
      root.setAttribute('aria-label', '업무 앱 접근 판정');
      const asked = identityText(appId);
      // 연결 방식 안내는 요청 전·요청 중·오류에서도 함께 보여 줍니다.
      if (typeof mode === 'string' && Object.hasOwn(DECISION_MODE_NOTICE, mode)) {
        root.append(identityNode('p', DECISION_MODE_NOTICE[mode], 'student-decision-mode'));
      }

      if (status === 'idle') {
        root.append(identityNode('p', '앱을 골라 접속을 요청하세요.', 'student-decision-idle'));
        return root;
      }
      if (status === 'loading') {
        root.append(identityNode('p', `판정 확인 중${asked ? `: ${asked}` : ''}`, 'student-decision-loading'));
        return root;
      }
      if (status === 'error') {
        // 요청 실패는 거부 판정이 아닙니다. 서버가 판정을 돌려주지 못했다는 뜻이며 허용도 아닙니다.
        root.append(identityNode('p', `요청 실패: ${identityText(error?.message) ?? '서버가 오류 설명을 보내지 않았습니다.'}`, 'student-decision-error'));
        root.append(identityNode('p', '이것은 접근 거부(deny) 판정이 아니며, 접근이 허용된 것도 아닙니다. 서버가 판정을 돌려주지 못했습니다.', 'student-decision-note'));
        if (typeof error?.code === 'string' && UNVERIFIED_ERROR_CODES.has(error.code)) {
          root.append(identityNode('p', '확인 불가: 서버 응답을 확인하지 못해 판정을 알 수 없습니다.', 'student-decision-unverified'));
        }
        if (asked) root.append(identityNode('p', `요청한 앱: ${asked}`));
        return root;
      }

      // ok 이거나 알 수 없는 상태: 판정이 정해진 모양일 때만 판정을 보여 주고, 아니면 확인 불가로 둡니다.
      const valid = status === 'ok' && data !== null && typeof data === 'object';
      // 선택한 앱과 판정 대상 앱이 둘 다 있고 같을 때만 이 판정을 그 앱의 판정으로 씁니다.
      const sameApp = valid && asked !== null && identityText(data.appId) === asked;
      const known = valid && sameApp && typeof data.decision === 'string' && Object.hasOwn(DECISION_TEXT, data.decision);
      const decision = known ? data.decision : 'unknown';
      const info = DECISION_TEXT[decision];

      root.append(identityNode('p', `판정: ${info.label}${decision === 'unknown' && valid && typeof data.decision === 'string' && !known ? ` · 서버 값 "${data.decision}"은 알 수 없는 값입니다` : ''}`, `student-decision-label student-decision-${decision}`));
      root.append(identityNode('p', info.note, 'student-decision-note'));
      if (valid && !sameApp) {
        root.append(identityNode('p', `선택한 앱(${asked ?? '없음'})과 판정 대상 앱(${identityText(data.appId) ?? '없음'})이 달라 이 판정을 사용할 수 없습니다.`, 'student-decision-mismatch'));
      } else if (!valid) {
        root.append(identityNode('p', '서버 응답을 읽을 수 없습니다.', 'student-decision-unverified'));
      }
      const list = identityNode('dl');
      // 다른 앱의 판정이 오면 그 앱의 이유·시각은 보여 주지 않습니다(선택한 앱의 판정이 아니므로).
      decisionRow(list, '대상 앱', (sameApp && identityText(data.appId)) || asked || '확인 불가');
      decisionRow(list, '판정 이유', sameApp ? (identityText(data.reason) ?? '서버가 이유를 보내지 않았습니다.') : '확인 불가');
      decisionRow(list, '판정 시각', sameApp ? decisionTime(data.checkedAt) : '확인 불가');
      root.append(list);
      return root;
    },
    renderEvents(input) { return eventsView(input); },
    renderStatus(input) { return statusView(input); },
    renderVulnerabilities(input) { return vulnerabilitiesView(input); },
    renderAiConnection(input) { return aiConnectionView(input); },
    renderExplanation(input) { return aiExplanationView(input); },
    renderAction(input) { return actionView(input); },
  };
}
