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

export function createStudentView() {
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
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
