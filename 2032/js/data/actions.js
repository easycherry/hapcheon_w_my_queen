/* =========================================================
   ACTIONS — 가구별 캐릭터 행동 정의
   pos   : 캐릭터가 서는/앉는 위치를 정하는 방식
           stand(가구 앞에 서기) / seat(가구에 앉기) / lie(눕기) / floor(바닥에 앉기)
           floorlie(바닥에 눕기) / tvseat(TV 보이는 자리에 앉기) / chair(책상·식탁 의자에 앉기)
   steps : 순서대로 실행되는 애니메이션 단계
           look  : item(가구 쪽 보기) / down / up / left / right / seat(앉은 방향)
           legs  : stand / sit / lie
           arms  : 프레임 배열 — 번갈아 재생 (down, up, wave1, wave2, front1, front2, mouth, hug)
           prop  : book / phone / mug / snack / plate / can / controller / cloth
           face  : normal / blink / happy / closed / surprise
           fx    : zzz / notes / hearts / steam / bubbles / sparkle / water / ding
           dur   : 지속 시간(ms). 마지막 단계는 loop:true면 '그만하기'를 누를 때까지 유지
           state : 가구 상태 바꾸기 (on/open 등), toggle : 상태 뒤집기
   ========================================================= */
window.ACTIONS = {
  sit: { label: "앉기", pos: "seat", loop: true, coins: 2, steps: [{ look: "seat", legs: "sit" }] },
  lie: { label: "눕기", pos: "lie", loop: true, coins: 2, steps: [{ legs: "lie" }] },
  sleep: { label: "잠자기", pos: "lie", loop: true, coins: 5, msg: "새근새근… 좋은 꿈 꿔요", steps: [{ legs: "lie", face: "closed", fx: "zzz" }] },
  watchtv: { label: "TV 보기", pos: "tvseat", loop: true, coins: 4, steps: [{ look: "tv", legs: "sit", tvOn: true }] },
  tidy: { label: "주변 정리하기", pos: "stand", coins: 3, msg: "TV 테이블 주변이 반짝반짝해졌어요", steps: [{ look: "item", arms: ["front1", "front2"], prop: "cloth", fx: "sparkle", dur: 2600 }] },
  snack: { label: "간식 먹기", pos: "floor", coins: 4, msg: "냠냠, 과자 한 봉지 뚝딱!", steps: [{ look: "down", legs: "sit", arms: ["mouth", "front1"], prop: "snack", dur: 3200, face: "happy" }] },
  pickbook: { label: "책 골라 읽기", pos: "stand", loop: true, coins: 4, steps: [{ look: "item", arms: ["up"], dur: 900 }, { look: "down", arms: ["front1"], prop: "book", face: "blink" }] },
  lamp: { label: "조명 켜기/끄기", pos: "stand", coins: 1, toggleLabel: ["조명 켜기", "조명 끄기"], steps: [{ look: "item", arms: ["front1"], dur: 450, toggle: "on" }] },
  floorsit: { label: "바닥에 앉기", pos: "floor", loop: true, coins: 2, steps: [{ look: "down", legs: "sit" }] },
  rest: { label: "누워서 쉬기", pos: "floorlie", loop: true, coins: 3, steps: [{ legs: "lie", face: "blink" }] },
  plantlook: { label: "식물 구경", pos: "stand", coins: 2, steps: [{ look: "item", face: "happy", fx: "hearts", dur: 2200 }] },
  water: { label: "물 주기", pos: "stand", coins: 5, msg: "물을 듬뿍! 잎이 쫑긋 섰어요", steps: [{ look: "item", arms: ["front1"], prop: "can", fx: "water", dur: 2400, state: { dry: false }, water: true }] },
  music: { label: "음악 듣기", pos: "stand", loop: true, coins: 3, steps: [{ look: "item", arms: ["front1"], dur: 500, state: { on: true } }, { look: "down", face: "happy", fx: "notes", bob: true }], end: { on: false } },
  windowlook: { label: "창밖 구경", pos: "stand", coins: 2, steps: [{ look: "up", dur: 3200, fx: "window" }] },
  fridge: { label: "냉장고 열기", pos: "stand", coins: 3, steps: [{ look: "item", arms: ["front1"], dur: 600, state: { open: true } }, { look: "item", arms: ["front1", "front2"], dur: 2400, fx: "fridge" }], end: { open: false } },
  dishes: { label: "설거지", pos: "stand", coins: 6, msg: "뽀득뽀득, 설거지 끝!", steps: [{ look: "item", arms: ["front1", "front2"], fx: "bubbles", dur: 4200, state: { on: true } }], end: { on: false } },
  cook: { label: "요리하기", pos: "stand", coins: 6, msg: "보글보글, 요리 완성!", steps: [{ look: "item", arms: ["front1", "front2"], fx: "steam", dur: 4600, state: { on: true } }, { look: "down", face: "happy", fx: "sparkle", dur: 900 }], end: { on: false } },
  heat: { label: "음식 데우기", pos: "stand", coins: 3, msg: "띵! 따끈따끈하게 데워졌어요", steps: [{ look: "item", arms: ["front1"], dur: 600 }, { look: "item", dur: 2400, state: { on: true } }, { look: "down", fx: "ding", face: "happy", dur: 800 }], end: { on: false } },
  eat: { label: "식사하기", pos: "chair", coins: 6, msg: "잘 먹었습니다!", steps: [{ look: "seat", legs: "sit", arms: ["mouth", "front1"], prop: "plate", face: "happy", dur: 4200 }] },
  coffee: { label: "커피 만들기", pos: "stand", coins: 4, msg: "라떼 한 잔 완성", steps: [{ look: "item", arms: ["front1", "front2"], fx: "steam", dur: 2200, state: { on: true } }, { look: "down", arms: ["mouth", "down"], prop: "mug", face: "happy", dur: 2600, state: { on: false } }] },
  cupboard: { label: "식기 꺼내기", pos: "stand", coins: 2, steps: [{ look: "up", arms: ["up"], dur: 900, state: { open: true } }, { look: "down", arms: ["front1"], prop: "plate", dur: 1200, state: { open: false } }] },
  toast: { label: "토스트 만들기", pos: "stand", coins: 3, steps: [{ look: "item", arms: ["front1"], dur: 700 }, { look: "item", dur: 1800, state: { on: true }, fx: "steam" }, { look: "down", arms: ["mouth"], prop: "snack", fx: "ding", dur: 1800, state: { on: false } }] },
  putthing: { label: "물건 올려놓기", pos: "stand", coins: 2, steps: [{ look: "item", arms: ["front1"], dur: 900, cycle: "thing" }] },
  clothes: { label: "옷 고르기", pos: "stand", coins: 2, steps: [{ look: "item", arms: ["front1"], dur: 700, state: { open: true }, dressup: true }], end: { open: false } },
  mirror: { label: "거울 보기", pos: "stand", coins: 2, msg: "오늘 코디 합격!", steps: [{ look: "item", fx: "sparkle", dur: 2600, state: { on: true } }], end: { on: false } },
  getready: { label: "준비하기", pos: "stand", coins: 3, msg: "외출 준비 완료!", steps: [{ look: "item", arms: ["up", "front1"], fx: "sparkle", dur: 3000 }] },
  work: { label: "작업하기", pos: "chair", loop: true, coins: 6, steps: [{ look: "seat", legs: "sit", arms: ["front1", "front2"], devicesOn: true }] },
  type: { label: "노트북 사용하기", pos: "chair", loop: true, coins: 6, steps: [{ look: "seat", legs: "sit", arms: ["front1", "front2"], state: { on: true } }], end: { on: false } },
  screen: { label: "화면 보기", pos: "chair", loop: true, coins: 4, steps: [{ look: "seat", legs: "sit", face: "blink", state: { on: true } }], end: { on: false } },
  read: { label: "독서하기", pos: "stand", loop: true, coins: 4, steps: [{ look: "item", arms: ["front1"], dur: 600 }, { look: "down", arms: ["front1"], prop: "book", face: "blink" }] },
  study: { label: "공부하기", pos: "chair", loop: true, coins: 6, steps: [{ look: "seat", legs: "sit", arms: ["front1"], prop: "book", state: { on: true } }] },
  headphones: { label: "음악 듣기", pos: "stand", loop: true, coins: 3, steps: [{ look: "item", arms: ["front1"], dur: 500 }, { look: "down", face: "happy", hp: true, fx: "notes", bob: true }] },
  drink: { label: "음료 마시기", pos: "stand", coins: 2, msg: "후루룩, 따뜻하다", steps: [{ look: "item", arms: ["front1"], dur: 500 }, { look: "down", arms: ["mouth", "mouth", "front1"], prop: "mug", face: "happy", dur: 2600 }] },
  smell: { label: "꽃향기 맡기", pos: "stand", coins: 2, msg: "음~ 꽃향기", steps: [{ look: "item", face: "closed", fx: "hearts", dur: 2000 }] },
  photo: { label: "사진 보기", pos: "stand", coins: 2, msg: "우리 사진, 언제 봐도 좋다", steps: [{ look: "up", face: "happy", fx: "hearts", dur: 2400 }] },
  clock: { label: "시간 보기", pos: "stand", coins: 1, steps: [{ look: "up", dur: 1400, fx: "clock" }] },
  hugdoll: { label: "인형 안기", pos: "stand", coins: 2, steps: [{ look: "down", arms: ["hug"], face: "happy", fx: "hearts", dur: 2200 }] },
  pet: { label: "쓰다듬기", pos: "stand", coins: 2, msg: "냐옹~", steps: [{ look: "item", arms: ["front1", "front2"], face: "happy", fx: "hearts", dur: 2200 }] },
  play: { label: "게임하기", pos: "floor", loop: true, coins: 4, steps: [{ look: "down", legs: "sit", arms: ["front1", "front2"], prop: "controller", face: "happy", state: { on: true } }], end: { on: false } },
  eatplate: { label: "먹기", pos: "stand", coins: 3, msg: "맛있다!", steps: [{ look: "down", arms: ["mouth", "front1"], prop: "snack", face: "happy", dur: 2600 }] },
  trash: { label: "쓰레기 버리기", pos: "stand", coins: 2, msg: "깔끔!", steps: [{ look: "item", arms: ["front1"], dur: 1000, fx: "sparkle" }] }
};

window.FRIDGE_MSGS = [
  "우유가 하나 남았네… 내일 장 보러 가자!",
  "언니가 좋아하는 딸기가 있다!",
  "어제 남은 떡볶이 발견!",
  "텅… 배달시킬까?",
  "케이크 한 조각이 숨어 있어요",
  "김치통이 세 개나 있다",
  "맥주 두 캔, 주말용!",
  "누가 푸딩 먹었어?!"
];

// 두 캐릭터 상호작용
window.DUO_ACTIONS = [
  { id: "face", label: "서로 마주 보기", need: "near" },
  { id: "wave", label: "손 흔들기", need: "none" },
  { id: "highfive", label: "하이파이브", need: "near", stat: "highfive", coins: 5 },
  { id: "hug", label: "포옹", need: "near", stat: "hug", coins: 5 },
  { id: "come", label: "이리 와!", need: "none" },
  { id: "follow", label: "함께 걷기", need: "none" },
  { id: "sitside", label: "나란히 앉기", need: "seat2", coins: 4 },
  { id: "tvtogether", label: "함께 TV 보기", need: "tv", coins: 6 },
  { id: "eattogether", label: "함께 식사하기", need: "table", coins: 8 }
];
