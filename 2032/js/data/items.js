/* =========================================================
   ITEMS — 가구·소품 데이터 파일
   새 아이템을 추가하려면 ITEMS 배열에 한 줄을 넣고,
   js/sprites/itemSprites.js에 같은 id로 그림 함수를 추가하거나
   assets/items/<id>.png 를 넣고 config.js의 USE_FINAL_ASSETS를 켜세요.

   속성
   id            아이템 ID
   name / desc   이름 / 설명
   cat           카테고리 (CATEGORIES의 id)
   rooms         설치 가능한 방 ("all" 또는 방 id 배열)
   w, h          가로·세로 크기 (타일, 회전 0 기준)
   sh            스프라이트 높이(px) — 바닥 면적보다 위로 솟은 높이 포함
   layer         rug(깔개) / floor(가구, 통과 불가) / top(작은 소품, 가구 위·바닥 가능) / wall(벽) / curtain(커튼)
   rots          가능한 회전값 (0 ↓ 앞, 1 ← 왼쪽, 2 ↑ 뒤, 3 → 오른쪽)
   surface       윗면 높이(px). 0보다 크면 top 아이템을 올릴 수 있어요
   actions       상호작용 목록 (js/data/actions.js의 id)
   approach      캐릭터가 접근하는 위치: seat / bed / front / below / onrug / near
   price         ♥ 가격 (0이면 처음부터 받는 기본 아이템)
   unlock        획득 조건 {stat, n, text}
   light         조명 반경(px) — 켜져 있을 때 밤에 빛나요
   sprite        {temp: 임시 그림, final: 최종 이미지 경로}
   ========================================================= */
window.CATEGORIES = [
  { id: "furniture", name: "가구" },
  { id: "electronics", name: "전자제품" },
  { id: "lighting", name: "조명" },
  { id: "props", name: "인테리어 소품" },
  { id: "plants", name: "식물" },
  { id: "kitchen", name: "주방용품" },
  { id: "bedding", name: "침구" },
  { id: "deco", name: "장식품" }
];

window.ROOMS = [
  { id: "living", name: "거실", wall: "cream", floor: "oak" },
  { id: "kitchen", name: "주방", wall: "mint", floor: "tile" },
  { id: "bedroom", name: "침실", wall: "pink", floor: "oak" },
  { id: "study", name: "서재", wall: "sky", floor: "walnut" }
];

window.WALLPAPERS = [
  { id: "cream", name: "크림", a: "#f6ead2", b: "#efdcb8", line: "#e3cba0" },
  { id: "pink", name: "딸기우유", a: "#fbe0e6", b: "#f6cdd8", line: "#eab4c3" },
  { id: "mint", name: "민트", a: "#dff3ea", b: "#c9eadb", line: "#aedac6" },
  { id: "sky", name: "하늘", a: "#e0ecfb", b: "#cddff6", line: "#b2cbed" },
  { id: "lemon", name: "레몬", a: "#fdf3c8", b: "#f8e7a2", line: "#ecd57a" },
  { id: "lilac", name: "라일락", a: "#ece4fa", b: "#ddd0f4", line: "#c7b5ea" }
];
window.FLOORS = [
  { id: "oak", name: "원목", a: "#d9a066", b: "#c98d55", line: "#a8703e" },
  { id: "walnut", name: "월넛", a: "#9a6440", b: "#8a5634", line: "#6a3e22" },
  { id: "tile", name: "체크 타일", a: "#f4efe6", b: "#dcd3c4", line: "#c8bca8", check: true },
  { id: "mint", name: "민트 장판", a: "#c7e6d6", b: "#b5dbc7", line: "#98c8b0" },
  { id: "carpet", name: "회색 카펫", a: "#c9c4cc", b: "#bdb7c0", line: "#a8a2ac", soft: true }
];

(function () {
  const S = id => ({ temp: "proc:" + id, final: "assets/items/" + id + ".png" });
  const A = ["living", "kitchen", "bedroom", "study"];
  const ITEMS = [
    // ── 거실 ──
    { id: "sofa", name: "소파", desc: "둘이 앉아도 넉넉한 3인용 딸기우유 소파. 누워서 쉴 수도 있어요.", cat: "furniture", rooms: ["living", "bedroom", "study"], w: 3, h: 1, sh: 27, layer: "floor", rots: [0, 1, 2, 3], actions: ["sit", "lie", "watchtv"], approach: "seat", price: 120 },
    { id: "armchair", name: "1인용 의자", desc: "푹신한 민트색 1인용 의자.", cat: "furniture", rooms: "all", w: 1, h: 1, sh: 27, layer: "floor", rots: [0, 1, 2, 3], actions: ["sit"], approach: "seat", price: 60 },
    { id: "tv", name: "TV", desc: "주말 영화 담당. TV 테이블 위에 올려 주세요.", cat: "electronics", rooms: ["living", "bedroom", "study"], w: 2, h: 1, sh: 20, layer: "top", rots: [0], actions: ["watchtv"], approach: "front", price: 150 },
    { id: "tvtable", name: "TV 테이블", desc: "TV와 소품을 올려두는 낮은 서랍장.", cat: "furniture", rooms: "all", w: 2, h: 1, sh: 18, layer: "floor", rots: [0], surface: 11, actions: ["tidy"], approach: "front", price: 60 },
    { id: "coffeetable", name: "커피 테이블", desc: "소파 앞 낮은 테이블. 간식 타임!", cat: "furniture", rooms: "all", w: 2, h: 1, sh: 14, layer: "floor", rots: [0], surface: 6, actions: ["snack"], approach: "front", price: 50 },
    { id: "bookshelf", name: "책장", desc: "좋아하는 책이 가득한 책장.", cat: "furniture", rooms: "all", w: 2, h: 1, sh: 40, layer: "floor", rots: [0], actions: ["pickbook"], approach: "front", price: 90 },
    { id: "floorlamp", name: "스탠드", desc: "밤에 켜면 방이 따뜻해져요.", cat: "lighting", rooms: "all", w: 1, h: 1, sh: 32, layer: "floor", rots: [0], actions: ["lamp"], approach: "near", light: 46, price: 40 },
    { id: "rug", name: "러그", desc: "포근한 살구색 러그. 위에 앉거나 누워서 쉴 수 있어요.", cat: "props", rooms: "all", w: 3, h: 2, sh: 32, layer: "rug", rots: [0, 1], actions: ["floorsit", "rest"], approach: "onrug", price: 45 },
    { id: "rug2", name: "줄무늬 러그", desc: "하늘색 줄무늬 러그.", cat: "props", rooms: "all", w: 3, h: 2, sh: 32, layer: "rug", rots: [0, 1], actions: ["floorsit", "rest"], approach: "onrug", price: 45 },
    { id: "plant", name: "화분", desc: "물을 주면 잎이 쫑긋 서요. 오래 안 주면 시들어요.", cat: "plants", rooms: "all", w: 1, h: 1, sh: 26, layer: "floor", rots: [0], actions: ["plantlook", "water"], approach: "near", price: 30 },
    { id: "speaker", name: "스피커", desc: "드라이브 플레이리스트를 틀어요.", cat: "electronics", rooms: "all", w: 1, h: 1, sh: 22, layer: "floor", rots: [0], actions: ["music"], approach: "near", price: 70 },
    { id: "window", name: "창문", desc: "낮에는 하늘, 밤에는 별이 보여요.", cat: "props", rooms: "all", w: 2, h: 2, sh: 32, layer: "wall", rots: [0], actions: ["windowlook"], approach: "below", price: 60 },
    { id: "cushion", name: "쿠션", desc: "바닥에 놓고 앉는 노란 방석.", cat: "props", rooms: "all", w: 1, h: 1, sh: 10, layer: "top", rots: [0], actions: ["floorsit"], approach: "onself", price: 15 },
    // ── 주방 ──
    { id: "fridge", name: "냉장고", desc: "열 때마다 뭐가 들었는지 궁금한 냉장고.", cat: "kitchen", rooms: ["kitchen", "living"], w: 1, h: 1, sh: 36, layer: "floor", rots: [0], actions: ["fridge"], approach: "front", price: 140 },
    { id: "sink", name: "싱크대", desc: "설거지는 같이 하면 금방 끝나요.", cat: "kitchen", rooms: ["kitchen"], w: 1, h: 1, sh: 24, layer: "floor", rots: [0], actions: ["dishes"], approach: "front", price: 80 },
    { id: "counter", name: "조리대", desc: "재료를 손질하는 조리대. 위에 주방 소품을 올릴 수 있어요.", cat: "kitchen", rooms: ["kitchen"], w: 1, h: 1, sh: 24, layer: "floor", rots: [0], surface: 18, actions: ["cook"], approach: "front", price: 50 },
    { id: "stove", name: "가스레인지", desc: "오늘 저녁은 뭐 해 먹지?", cat: "kitchen", rooms: ["kitchen"], w: 1, h: 1, sh: 24, layer: "floor", rots: [0], actions: ["cook"], approach: "front", price: 90 },
    { id: "microwave", name: "전자레인지", desc: "남은 음식 데우기 담당.", cat: "electronics", rooms: ["kitchen"], w: 1, h: 1, sh: 12, layer: "top", rots: [0], actions: ["heat"], approach: "front", price: 60 },
    { id: "dtable", name: "식탁", desc: "마주 보고 밥 먹는 식탁. 옆에 의자를 두세요.", cat: "furniture", rooms: ["kitchen", "living"], w: 2, h: 1, sh: 22, layer: "floor", rots: [0, 1], surface: 12, actions: ["eat"], approach: "front", price: 90 },
    { id: "dchair", name: "식탁 의자", desc: "식탁 옆에 두는 원목 의자.", cat: "furniture", rooms: "all", w: 1, h: 1, sh: 24, layer: "floor", rots: [0, 1, 2, 3], actions: ["sit"], approach: "seat", price: 30 },
    { id: "coffeemachine", name: "커피 머신", desc: "아침마다 라떼 두 잔.", cat: "kitchen", rooms: ["kitchen", "study", "living"], w: 1, h: 1, sh: 14, layer: "top", rots: [0], actions: ["coffee"], approach: "front", price: 80 },
    { id: "cupboard", name: "찬장", desc: "그릇을 꺼내는 벽 찬장.", cat: "kitchen", rooms: ["kitchen"], w: 2, h: 1, sh: 16, layer: "wall", rots: [0], actions: ["cupboard"], approach: "below", price: 60 },
    { id: "toaster", name: "토스터", desc: "띵! 노릇노릇 토스트.", cat: "kitchen", rooms: ["kitchen"], w: 1, h: 1, sh: 9, layer: "top", rots: [0], actions: ["toast"], approach: "front", price: 35 },
    // ── 침실 ──
    { id: "bed", name: "침대", desc: "푹신한 더블 침대. 누우면 이불을 덮어 줘요.", cat: "bedding", rooms: ["bedroom", "living", "study"], w: 2, h: 3, sh: 52, layer: "floor", rots: [0, 1], actions: ["lie", "sleep"], approach: "bed", price: 180 },
    { id: "nightstand", name: "협탁", desc: "침대 옆 작은 탁자. 물건을 올려둘 수 있어요.", cat: "furniture", rooms: "all", w: 1, h: 1, sh: 18, layer: "floor", rots: [0], surface: 12, actions: ["putthing"], approach: "near", price: 35 },
    { id: "wardrobe", name: "옷장", desc: "열면 캐릭터 옷을 갈아입을 수 있어요.", cat: "furniture", rooms: ["bedroom", "living", "study"], w: 2, h: 1, sh: 42, layer: "floor", rots: [0], actions: ["clothes"], approach: "front", price: 110 },
    { id: "mirror", name: "전신거울", desc: "오늘 코디 확인!", cat: "props", rooms: "all", w: 1, h: 1, sh: 34, layer: "floor", rots: [0], actions: ["mirror"], approach: "front", price: 50 },
    { id: "vanity", name: "화장대", desc: "외출 전 준비하는 화장대.", cat: "furniture", rooms: ["bedroom"], w: 2, h: 1, sh: 34, layer: "floor", rots: [0], actions: ["getready"], approach: "front", price: 100 },
    // ── 서재 ──
    { id: "desk", name: "책상", desc: "앞에 의자를 두면 앉아서 작업해요. 노트북·모니터를 올려 주세요.", cat: "furniture", rooms: "all", w: 2, h: 1, sh: 24, layer: "floor", rots: [0], surface: 16, actions: ["work"], approach: "front", price: 80 },
    { id: "ochair", name: "사무용 의자", desc: "바퀴 달린 의자. 책상 앞에 두세요.", cat: "furniture", rooms: "all", w: 1, h: 1, sh: 22, layer: "floor", rots: [0, 1, 2, 3], actions: ["sit"], approach: "seat", price: 45 },
    { id: "laptop", name: "노트북", desc: "타닥타닥. 책상 위에 올리면 앉아서 작업해요.", cat: "electronics", rooms: "all", w: 1, h: 1, sh: 9, layer: "top", rots: [0], actions: ["type"], approach: "front", price: 120 },
    { id: "monitor", name: "모니터", desc: "큰 화면으로 보는 모니터.", cat: "electronics", rooms: "all", w: 1, h: 1, sh: 16, layer: "top", rots: [0], actions: ["screen"], approach: "front", price: 90 },
    { id: "book", name: "책", desc: "읽다 만 책 세 권.", cat: "props", rooms: "all", w: 1, h: 1, sh: 12, layer: "top", rots: [0], actions: ["read"], approach: "front", price: 15 },
    { id: "desklamp", name: "책상 스탠드", desc: "공부할 때 켜는 작은 스탠드.", cat: "lighting", rooms: "all", w: 1, h: 1, sh: 13, layer: "top", rots: [0], actions: ["study", "lamp"], approach: "front", light: 32, price: 30 },
    { id: "headphones", name: "헤드폰", desc: "쓰면 음악이 흘러나와요.", cat: "electronics", rooms: "all", w: 1, h: 1, sh: 8, layer: "top", rots: [0], actions: ["headphones"], approach: "front", price: 50 },
    { id: "mug", name: "머그컵", desc: "따뜻한 음료가 든 머그컵.", cat: "kitchen", rooms: "all", w: 1, h: 1, sh: 8, layer: "top", rots: [0], actions: ["drink"], approach: "front", price: 10 },
    // ── 추가 아이템 ──
    { id: "vase", name: "꽃병", desc: "식탁이나 협탁 위에 어울리는 꽃병.", cat: "deco", rooms: "all", w: 1, h: 1, sh: 14, layer: "top", rots: [0], actions: ["smell"], approach: "front", price: 25 },
    { id: "frame", name: "액자", desc: "둘이 찍은 사진이 들어 있어요.", cat: "deco", rooms: "all", w: 1, h: 1, sh: 14, layer: "wall", rots: [0], actions: ["photo"], approach: "below", price: 20 },
    { id: "clock", name: "벽시계", desc: "지금 실제 시간을 가리켜요.", cat: "deco", rooms: "all", w: 1, h: 1, sh: 12, layer: "wall", rots: [0], actions: ["clock"], approach: "below", price: 25 },
    { id: "walldeco", name: "벽 장식", desc: "알록달록 가랜드.", cat: "deco", rooms: "all", w: 2, h: 1, sh: 10, layer: "wall", rots: [0], actions: [], approach: "below", price: 20 },
    { id: "wallshelf", name: "작은 선반", desc: "벽에 다는 소품 선반.", cat: "furniture", rooms: "all", w: 2, h: 1, sh: 14, layer: "wall", rots: [0], actions: [], approach: "below", price: 30 },
    { id: "doll", name: "인형", desc: "곰돌이 인형. 꼭 안아줄 수 있어요.", cat: "deco", rooms: "all", w: 1, h: 1, sh: 14, layer: "top", rots: [0], actions: ["hugdoll"], approach: "front", price: 30 },
    { id: "catfig", name: "고양이 장식품", desc: "가끔 눈을 깜빡이는 하얀 고양이.", cat: "deco", rooms: "all", w: 1, h: 1, sh: 13, layer: "top", rots: [0], actions: ["pet"], approach: "front", price: 0, unlock: { stat: "actions", n: 15, text: "생활 행동 15번 하기" } },
    { id: "moodlight", name: "작은 조명", desc: "색이 천천히 바뀌는 무드등.", cat: "lighting", rooms: "all", w: 1, h: 1, sh: 10, layer: "top", rots: [0], actions: ["lamp"], approach: "front", light: 28, price: 25 },
    { id: "console", name: "게임기", desc: "둘이 하는 협동 게임.", cat: "electronics", rooms: "all", w: 1, h: 1, sh: 8, layer: "top", rots: [0], actions: ["play"], approach: "front", price: 0, unlock: { stat: "highfive", n: 1, text: "하이파이브 한 번 하기" } },
    { id: "laptopbag", name: "노트북 가방", desc: "출근 준비 완료.", cat: "props", rooms: "all", w: 1, h: 1, sh: 12, layer: "top", rots: [0], actions: [], approach: "front", price: 20 },
    { id: "plate", name: "음식 접시", desc: "맛있는 한 접시. 먹을 수 있어요.", cat: "kitchen", rooms: "all", w: 1, h: 1, sh: 7, layer: "top", rots: [0], actions: ["eatplate"], approach: "front", price: 15 },
    { id: "flowerpot", name: "화분과 꽃", desc: "물을 주면 꽃이 활짝 펴요.", cat: "plants", rooms: "all", w: 1, h: 1, sh: 24, layer: "floor", rots: [0], actions: ["plantlook", "water"], approach: "near", price: 35 },
    { id: "curtain", name: "커튼", desc: "창문 위에 겹쳐 다는 커튼.", cat: "deco", rooms: "all", w: 2, h: 2, sh: 32, layer: "curtain", rots: [0], actions: [], approach: "below", price: 30 },
    { id: "trash", name: "휴지통", desc: "정리 정돈의 시작.", cat: "props", rooms: "all", w: 1, h: 1, sh: 14, layer: "floor", rots: [0], actions: ["trash"], approach: "near", price: 15 }
  ];
  ITEMS.forEach(it => { it.sprite = it.sprite || S(it.id); if (it.rooms === "all") it.rooms = A.slice(); it.surface = it.surface || 0; });
  window.ITEMS = ITEMS;
  window.ITEM_BY_ID = Object.fromEntries(ITEMS.map(i => [i.id, i]));

  // 처음 집에 놓여 있는 배치 (x, y = 타일 좌표, 벽은 0~2행, 바닥은 3~10행)
  window.DEFAULT_LAYOUTS = {
    living: [
      ["window", 2, 0], ["curtain", 2, 0], ["frame", 6, 1], ["clock", 11, 0], ["walldeco", 8, 0],
      ["floorlamp", 0, 3], ["tvtable", 5, 3], ["tv", 5, 3], ["speaker", 8, 3], ["bookshelf", 11, 3],
      ["rug", 4, 6], ["coffeetable", 5, 6], ["sofa", 4, 8, 2], ["armchair", 9, 6, 1], ["plant", 13, 9], ["cushion", 2, 7]
    ],
    kitchen: [
      ["cupboard", 1, 1], ["cupboard", 3, 1], ["window", 9, 0], ["clock", 6, 0],
      ["fridge", 0, 3], ["counter", 1, 3], ["coffeemachine", 1, 3], ["sink", 2, 3], ["stove", 3, 3], ["counter", 4, 3], ["microwave", 4, 3], ["counter", 5, 3], ["toaster", 5, 3],
      ["dtable", 8, 6], ["plate", 8, 6], ["vase", 9, 6], ["dchair", 7, 6, 3], ["dchair", 10, 6, 1], ["trash", 13, 3], ["flowerpot", 13, 9]
    ],
    bedroom: [
      ["window", 6, 0], ["curtain", 6, 0], ["walldeco", 1, 0], ["frame", 10, 1],
      ["bed", 1, 3], ["nightstand", 3, 3], ["desklamp", 3, 3], ["floorlamp", 0, 9], ["vanity", 6, 3], ["mirror", 8, 3], ["wardrobe", 11, 3],
      ["rug", 5, 7], ["doll", 12, 9], ["plant", 13, 9]
    ],
    study: [
      ["window", 3, 0], ["frame", 7, 1], ["wallshelf", 10, 1],
      ["plant", 0, 3], ["desk", 2, 3], ["laptop", 2, 3], ["mug", 3, 3], ["ochair", 2, 4, 2], ["desk", 6, 3], ["monitor", 6, 3], ["desklamp", 7, 3], ["ochair", 6, 4, 2],
      ["nightstand", 9, 3], ["headphones", 9, 3], ["bookshelf", 11, 3], ["rug2", 5, 7], ["armchair", 9, 7, 1], ["book", 10, 9], ["trash", 13, 10]
    ]
  };
  window.DEFAULT_STORAGE = { cushion: 1, moodlight: 1, laptopbag: 1 };
})();
