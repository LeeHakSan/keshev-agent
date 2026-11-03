# 케셰브(KESHEV) 실행 안내 한 장

내 PC 의 보안 상태를 보여 주는 로컬 앱입니다. **이 안내만 보고 처음부터 실행**할 수 있게 썼습니다. 앱은 PC 를 **읽기만** 하고 방화벽·보안 설정은 바꾸지 않습니다. 설치할 npm 패키지는 없습니다.

## 먼저 알아 둘 것: 화면의 값은 두 종류입니다

| 표시 | 뜻 |
|---|---|
| **실측** | 이 PC 에서 방금 직접 읽은 값 (CPU·메모리·디스크, 네트워크, 방화벽). 값마다 읽은 시각이 붙습니다. |
| **예제(demo)** | 설명용 값입니다. 실제 로그인·기기·세션·기록이 아닙니다. |
| **확인 불가** | 읽지 못한 값입니다. 정상도 안전도 아닙니다. 이유가 함께 적힙니다. |

## 준비물

| 준비물 | 내용 | 확인 |
|---|---|---|
| Node.js | 22~24 버전 (수업 기준 24.19.0). 없으면 https://nodejs.org 에서 설치 | `node -v` 에 `v22`~`v24` 로 시작하는 값이 나오면 됩니다 |
| Git | 저장소를 받을 때 씁니다 | `git --version` |
| 브라우저 | Chrome 에서 확인했습니다 | |

## 따라 하기 (6단계)

터미널(Mac: 터미널, Windows: PowerShell)을 엽니다.

**1. 저장소를 받습니다.**

```sh
git clone https://github.com/LeeHakSan/keshev-agent.git
```

**2. 폴더 안으로 두 번 들어갑니다.** 앱은 `keshev-agent` 안의 `on-client` 폴더에 있습니다.

```sh
cd keshev-agent/on-client
```

Windows 에서는 `cd keshev-agent\on-client` 입니다. 맞게 들어왔으면 `package.json` 이 보여야 합니다(Mac: `ls`, Windows: `dir`).

**3. (선택) 파일에 문법 오류가 없는지 봅니다.**

```sh
npm run check
```

아무것도 출력되지 않고 끝나면 정상입니다.

**4. 앱을 켭니다. 처음에는 예제 모드를 권합니다.**

```sh
npm run demo
```

터미널에 다음 한 줄이 나오면 켜진 것입니다. **이 터미널은 닫지 말고 그대로 둡니다.**

```text
케셰브 예제: http://127.0.0.1:5189
```

**5. 브라우저에서 `http://127.0.0.1:5189` 를 엽니다.** 왼쪽에 「보호 현황」「업무 앱」「보안 기록」 메뉴가 보이면 성공입니다. 「보호 현황」의 학생 카드 맨 위에 「핵심 3가지 한눈에 보기」(기록 보기 · 내 PC 상태 · 위험 알림)가 있고, **「내 PC 상태」의 CPU·메모리·디스크 값은 실측**입니다.

**6. 끕니다.** 앱을 켠 터미널을 클릭한 뒤 `Ctrl+C` 를 누릅니다. 다시 켜려면 4번부터 하면 됩니다.

### 실제 연결 모드(`npm start`)로 켜면

`npm start` 는 기존 서버·에이전트에 연결하는 모드입니다. 연결할 곳이 없으면 위쪽에 **빨간 「연결 없음」 안내가 뜨는 것이 정상**입니다. 오류가 아닙니다. 이때도 「내 PC 상태」의 실측값은 나옵니다. 터미널에는 `케셰브 연결 확인: http://127.0.0.1:5189` 가 나옵니다.

## 막혔을 때

| 보이는 것 | 뜻 | 할 일 |
|---|---|---|
| `node: command not found` / `'node'은(는) 인식되지 않습니다` | Node.js 가 없음 | https://nodejs.org 에서 설치한 뒤 터미널을 **새로** 열고 `node -v` |
| `npm error enoent Could not read package.json` | 폴더를 잘못 들어옴 (`keshev-agent` 에서 실행하면 이렇게 나옵니다) | `cd on-client` 로 한 번 더 들어간 뒤 `package.json` 이 보이는지 확인하고 다시 실행 |
| `Error: listen EADDRINUSE … 127.0.0.1:5189` (긴 오류) | **이미 앱이 켜져 있음** (예전에 켠 것) | 먼저 켠 터미널을 찾아 `Ctrl+C`. 못 찾으면 다른 번호로 켭니다: Mac `ON_PORT=5190 npm run demo` 후 주소를 `5190` 으로. Windows PowerShell `$env:ON_PORT=5190; npm run demo` (이 방법은 Windows 에서 확인하지 못했습니다) |
| 브라우저 "연결할 수 없음" | 앱이 꺼져 있음 | 터미널에 `케셰브 …: http://127.0.0.1:5189` 가 있는지 보고, 없으면 4번 |
| 화면이 예전 모양이거나 `NOT_FOUND`, "지원하지 않는 주소입니다" | **예전 코드로 켜진 앱**이 아직 떠 있음 | `Ctrl+C` 로 끄고 4번부터 다시 |
| 빨간 「연결 없음」 | `npm start` 에서는 정상 | 화면을 보려면 `npm run demo` |
| 「Windows System/Application 기록」이 확인 불가 | Mac 에서는 정상 (Windows 에서만 읽는 항목) | 할 일 없음 |
| 「내 PC 상태」가 조회 실패 | 화면에 실패한 항목과 **다음에 할 일**이 나옵니다 | 그대로 따르고 「다시 조회」. 서버를 끈 채 누르면 같은 화면이 나옵니다 |
| `v21` 이하 또는 `v25` 이상 | 범위 밖 | 22~24 로 설치. 24.19.0 이 수업 기준입니다 |

그래도 안 되면 새 폴더를 만들지 말고 **오류 문구 전체를 그대로 복사**해서 AI 나 담당자에게 보여 주세요.

## 이 안내를 어디서 확인했나

| 항목 | 상태 |
|---|---|
| macOS · Node v24.22.0 · npm 11.19.1 · Git 2.50.1 · Chrome | **확인함.** 새 빈 폴더에 저장소를 받아 위 순서대로 실행했습니다 (`npm run check`, `npm start`, `npm run demo`, `Ctrl+C` 와 같은 `SIGINT` 로 종료, 같은 포트 두 번 켜기) |
| 다른 사람이 안내만 보고 따라 한 결과 | **미확인.** 위 확인은 작성자가 한 것입니다 |
| Windows (PowerShell, `tools/start-alekov.ps1`) | **미확인.** 제공 안내는 `powershell -NoProfile -ExecutionPolicy Bypass -File .\tools\start-alekov.ps1` 이지만 실행해 보지 못했습니다 |
| Node 24.19.0 / 22.x / 23.x | **미확인** |
| Git 없이 GitHub 의 「Download ZIP」으로 받기 | **미확인** |

## 더 읽을 곳

- 자세한 설명서(구성도·오류 표·미확인 목록): [`on-client/docs/STUDENT_RUNBOOK.md`](on-client/docs/STUDENT_RUNBOOK.md)
- 단계별 기능 점검과 같은 결과를 다시 만드는 순서: [`on-client/docs/STUDENT_FEATURE_CHECKLIST.md`](on-client/docs/STUDENT_FEATURE_CHECKLIST.md)
- 제공 시작 틀(0.2.14) 안내: `on-client/README.md`, `on-client/docs/STUDENT_LAUNCH_GUIDE.md`
