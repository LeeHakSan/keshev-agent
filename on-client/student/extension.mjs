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
    renderEvents() { return '학생 구현 대기: 본인 접속·XDR 기록을 연결하세요.'; },
    renderStatus() { return '학생 구현 대기: 기기·세션·알림과 연결 점검 상태를 구분하세요.'; },
    renderVulnerabilities() { return '학생 구현 대기: 정확한 설치 버전·OSV 출처·조회 시각·부분 결과·조회 실패를 구분하세요.'; },
    renderAiConnection() { return '학생 구현 대기: 모델 응답 점검과 실제 사건 설명을 구분하고 AI 오류·취소·수동 복구를 안내하세요.'; },
    renderExplanation() { return '학생 구현 대기: 선택한 사건의 근거·규칙·현재 상태와 AI 설명을 연결하세요. 제안은 자동 실행하지 않습니다.'; },
    renderAction() { return '학생 구현 대기: 현재 사건·조치·실제 대상·사람 확인·ACK와 원천 효과·unknown을 구분하세요.'; },
  };
}
