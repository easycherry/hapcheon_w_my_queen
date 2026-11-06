# 2032: 우리의 6년 뒤 — 픽셀 라이프 시뮬레이션

건주·찬슬 두 캐릭터가 함께 사는 집을 꾸미고, 직접 움직이며 생활하는 픽셀 게임이에요.
캐릭터는 합천 여행 사이트(Our First Travel)의 16×20 픽셀 캐릭터를 그대로 가져와 레이어로 나눴어요.

## 이야기 구성
PROLOGUE(2032년으로의 초대) → CHAPTER 1 우리의 집(네 방 둘러보기, 가구를 처음 쓸 때 방 이야기) →
CHAPTER 2 오늘의 일상(아침·점심·오후·저녁·주말·잠들기 전, 시간대별 에피소드 10개씩) →
CHAPTER 3 우리가 함께 사는 방식(가구를 들이고 쓰면 생활 이야기) → CHAPTER 4 미래 생활 보고서 → EPILOGUE
- 대사·에피소드는 `js/data/story.js`에서 고치거나 추가해요. 이름은 캐릭터 꾸미기 화면에서 바꿔요.

## 실행
- 폴더째 GitHub 저장소에 올리고 Pages를 켜면 `index.html`이 바로 열려요. (빌드 필요 없음)
- 내 컴퓨터에서는 `index.html`을 더블클릭해도 돼요.

## 폴더 구조
| 경로 | 내용 |
|---|---|
| `js/data/items.js` | 가구·소품 데이터 (ID, 이름, 카테고리, 설치 가능한 방, 크기, 회전, 상호작용, 가격/획득 조건, 스프라이트 경로) + 처음 배치 |
| `js/data/actions.js` | 가구별 캐릭터 행동 (위치·애니메이션 단계·효과), 두 캐릭터 상호작용 |
| `js/data/story.js` | 시나리오: 프롤로그, 방 소개, 일상 에피소드 60개, 방 에피소드 24개, 가구 배치 문구, 보고서, 에필로그 |
| `js/story.js` | 대화창·장면 전환·챕터 진행 엔진 |
| `js/data/characters.js` | 캐릭터 원본 픽셀, 머리·옷·액세서리 옵션 |
| `js/sprites/charSprites.js` | 캐릭터 프레임 합성 (4방향, 걷기/뛰기/앉기/눕기, 팔 동작, 소품) |
| `js/sprites/itemSprites.js` | 임시 가구 픽셀 그림 |
| `js/engine/*` | 격자·충돌·길찾기(core), 그리기(render), 생활 모드(live), 꾸미기 모드(editor) |
| `js/storage.js` | 저장·불러오기·백업 복구 |
| `js/feedback.js` | 피드백 저장 모듈 (localStorage + 외부 전송 어댑터) |
| `js/config.js` | 개발자 설정 |
| `assets/` | 최종 PNG 이미지 넣는 곳 |

## 새 가구 추가
1. `js/data/items.js`의 `ITEMS`에 한 줄 추가
2. `assets/items/<id>.png`를 넣고 `config.js`에서 `USE_FINAL_ASSETS: true` (또는 `itemSprites.js`에 같은 id로 그림 함수 추가)
3. 필요한 행동은 `js/data/actions.js`에 추가

## 피드백 확인
- 주소 끝에 `#developer`를 붙이고 `config.js`의 `DEV_PIN`(기본 2032)을 입력하면 피드백 관리 화면이 열려요.
- **GitHub에 올린 버전은 피드백이 쓴 사람의 브라우저에만 저장돼요.** 다른 사람 피드백을 받으려면
  `config.js`의 `FEEDBACK.ENDPOINT`에 Google Apps Script 웹앱이나 Formspree 같은 주소를 넣으세요. (JSON을 POST 해요)
- claude.ai 아티팩트로 연 버전은 아티팩트 공유 저장소에 저장돼서, 주인이 `#developer`에서 볼 수 있어요.
- `DEV_PIN`은 브라우저 안에서만 확인하는 간단한 잠금이에요. 진짜 보안 장치는 아니에요.

## 조작
- 생활(LIVE): 방향키/WASD 이동, Shift 달리기, 바닥 클릭 이동, 가구 클릭·근처에서 노란 버튼, E 사용, Esc 그만하기, Tab 캐릭터 바꾸기, 1~4 방 이동
- 꾸미기(EDIT): 가구 선택 후 드래그, R 회전, C 복사, Delete 삭제, Ctrl+Z/Ctrl+Y 실행 취소/다시 실행
- 모바일: 방향 패드, 달리기·사용 버튼, 터치로 가구 끌기

폰트: Galmuri (SIL Open Font License, `fonts/Galmuri-LICENSE.txt`)
