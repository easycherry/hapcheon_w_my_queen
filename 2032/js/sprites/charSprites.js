/* =========================================================
   CHARACTER SPRITES — 레이어 합성식 픽셀 캐릭터 렌더러
   한 프레임 = 24×26 캔버스 (캐릭터 본체 16×20 + 모자/손/소품 여유 공간)
   발 아래 중앙(12, 24)이 기준점이에요.
   최종 PNG 스프라이트 시트로 바꾸고 싶으면 CONFIG.USE_FINAL_ASSETS를 켜고
   assets/characters/ 에 같은 규격의 시트를 넣으면 돼요 (README 참고).
   ========================================================= */
window.CharSprites = (function () {
  const D = window.CHAR_DATA;
  const FW = 24, FH = 26, OX = 4, OY = 4;
  const SKIN = "#ffe2c6", EYE = "#1b1414", BLUSH = "#ff9aa8", MOUTH = "#b0413e", WHITE = "#ffffff", TIE = "#1b1414";
  const cache = new Map();

  const find = (list, id) => list.find(o => o.id === id) || list[0];

  function colorsOf(look) {
    const hc = find(D.HAIR_COLORS, look.hairColor), tc = find(D.COLORS, look.topColor);
    return { K: hc.c, H: hc.h, X: tc.l, x: tc.d, L: find(D.BOTTOMS, look.bottom).c, F: find(D.SHOES, look.shoes).c,
      A: SKIN, S: SKIN, E: EYE, R: BLUSH, M: MOUTH, W: WHITE, T: TIE };
  }

  /* ---------- grid helpers ---------- */
  function Grid() {
    const g = { px: {} };
    g.set = (x, y, c) => { if (c) g.px[(x + OX) + "," + (y + OY)] = c; };
    g.del = (x, y) => { delete g.px[(x + OX) + "," + (y + OY)]; };
    g.get = (x, y) => g.px[(x + OX) + "," + (y + OY)];
    g.rows = (rows, y0, map) => rows.forEach((r, j) => { for (let i = 0; i < r.length; i++) { const k = r[i]; if (k !== "." && map[k]) g.set(i, y0 + j, map[k]); } });
    g.hline = (x0, x1, y, c) => { for (let x = x0; x <= x1; x++) g.set(x, y, c); };
    return g;
  }

  /* ---------- hair masks ---------- */
  function capMask(L, R) {
    const m = {};
    const put = (x, y, k = "K") => { m[x + "," + y] = k; };
    for (let x = L + 3; x <= R - 3; x++) put(x, 1);
    for (let x = L + 1; x <= R - 1; x++) put(x, 2);
    for (let x = L; x <= R; x++) put(x, 3);
    for (let y = 4; y <= 6; y++) for (let x = L - 1; x <= R + 1; x++) put(x, y);
    put(L + 2, 4, "H"); put(R - 2, 4, "H");
    const mid = (L + R) >> 1;
    [L + 1, mid, mid + 1, R - 1].forEach(x => delete m[x + "," + 6]); // 앞머리 사이 이마
    return { m, put, mid };
  }
  function frontHair(style, faceId) {
    const f = D.FACE[faceId];
    if (style === "orig") {
      const m = {};
      D.ORIGINAL_HAIR[faceId].forEach((r, y) => { for (let x = 0; x < 16; x++) if (r[x] !== ".") m[x + "," + y] = r[x]; });
      return m;
    }
    const { L, R } = f;
    const { m, put, mid } = capMask(L, R);
    const side = (y0, y1, dx = 1) => { for (let y = y0; y <= y1; y++) { put(L - dx, y); put(R + dx, y); } };
    if (style === "short") side(7, 8);
    if (style === "bob") { side(7, 11); put(L, 11); put(R, 11); }
    if (style === "long") { side(7, 14); side(9, 14, 2); }
    if (style === "pony") { side(7, 8); for (let x = R - 1; x <= R + 1; x++) put(x, 0); for (let x = R - 2; x <= R + 2; x++) put(x, 1); put(R + 2, 2); put(R + 2, 3); }
    if (style === "bun") { side(7, 8); for (let x = mid - 1; x <= mid + 2; x++) { put(x, -1); put(x, 0); } put(mid, -2); put(mid + 1, -2); put(mid, -1, "H"); }
    if (style === "pig") { side(7, 9); [8, 9, 10].forEach(y => { put(L - 2, y); put(L - 3, y); put(R + 2, y); put(R + 3, y); }); }
    return m;
  }
  // 옆·뒤 모습에서 '원래 머리'는 비슷한 스타일로 표현
  const viewStyle = (style, faceId) => style !== "orig" ? style : (faceId === "chan" ? "pony" : "long");
  const hairLen = s => ({ short: 8, bob: 11, long: 14, pony: 8, bun: 8, pig: 9 }[s] || 9);

  /* ---------- body templates ---------- */
  const BODY_FRONT = ["....XXXWTWXXX...", "...XxXXWTWXXxX..", "..AXxXXXTXXXxXA.", "..AXxXXXTXXXxXA.", "...XxXXXXXXXxX.."];
  const BODY_BACK = ["....XXXXXXXXX...", "...XxXXXXXXXxX..", "..AXxXXXXXXXxXA.", "..AXxXXXXXXXxXA.", "...XxXXXXXXXxX.."];
  const BODY_SIDE = [".....XXXXXX.....", "....XXXXXXXx....", "....XXXXXXXx....", "....XXXAXXXx....", "....XxXAXXXx...."];
  const LEGS = {
    front: { stand: ["....LLLLLLLL....", "....LLL..LLL....", "....FFF..FFF...."], walkA: ["....LLLLLLLL....", "...LLL....LLL...", "...FF......FF..."], walkB: ["....LLLLLLLL....", "....LLL..LLL....", "....FFF..FFF...."],
      runA: ["....LLLLLLLL....", "..LLL......LLL..", "..FF........FF.."], runB: ["....LLLLLLLL....", "....LLL..LLL....", "....FFF..FFF...."], sit: ["...LLLLLLLLLL...", "....FFF..FFF...."], sitBack: ["....LLLLLLLL...."] },
    side: { stand: [".....LLLLLL.....", ".....LLL.LL.....", "....FFF..FF....."], walkA: [".....LLLLLL.....", "....LL....LL....", "...FF.....FF...."], walkB: [".....LLLLLL.....", ".....LLL.LL.....", "....FFF..FF....."],
      runA: [".....LLLLLL.....", "...LL......LL...", "..FF.......FF..."], runB: [".....LLLLLL.....", ".....LLL.LL.....", "....FFF..FF....."], sit: ["...LLLLLLLL.....", "...LL...........", "..FFF..........."] }
  };

  function applyTop(g, style, view, map) {
    if (view === "side") {
      if (style === "shirt") { g.set(5, 12, map.W); g.set(4, 13, map.T); g.set(4, 14, map.T); }
      if (style === "hoodie") { g.set(9, 12, map.x); g.set(10, 12, map.x); g.set(10, 13, map.x); }
      if (style === "knit" || style === "dress") g.hline(4, 11, 16, map.x);
      return;
    }
    if (view === "back") {
      if (style === "hoodie") { g.hline(5, 11, 12, map.x); g.hline(6, 10, 13, map.x); }
      if (style === "knit") g.hline(3, 13, 16, map.x);
      return;
    }
    // front
    if (style === "tee" || style === "knit" || style === "dress") {
      [7, 8, 9].forEach(x => g.set(x, 12, SKIN)); g.set(8, 13, SKIN);
      for (let y = 13; y <= 15; y++) [7, 8, 9].forEach(x => { if (!(x === 8 && y === 13)) g.set(x, y, map.X); });
      if (style === "knit") { g.hline(3, 13, 16, map.x); g.set(6, 12, map.x); g.set(10, 12, map.x); }
      if (style === "dress") { g.set(8, 14, "#f28daf"); g.set(7, 14, "#f28daf"); g.set(9, 14, "#f28daf"); }
    }
    if (style === "hoodie") {
      g.hline(4, 12, 12, map.x); [7, 8, 9].forEach(x => g.set(x, 12, map.X));
      g.set(7, 13, WHITE); g.set(9, 13, WHITE); g.set(8, 13, map.X); g.set(7, 14, WHITE); g.set(9, 14, WHITE);
      for (let y = 14; y <= 15; y++) g.set(8, y, map.X);
      g.hline(6, 10, 16, map.x);
    }
  }

  function drawLegs(g, view, legs, look, map) {
    const isDress = look.top === "dress";
    const set = LEGS[view === "back" ? "front" : view];
    let rows = set[legs] || set.stand;
    if (legs === "sit" && view === "back") rows = set.sitBack || rows;
    if (isDress) {
      // 치마 + 다리
      if (view === "side") {
        g.rows([".....XXXXXXx....", "....XXXXXXXXx..."], 16, { X: map.X, x: map.x });
        if (legs === "sit") g.rows(["...SSSSS........", "..FFF..........."], 18, { S: SKIN, F: map.F });
        else { const r = rows.slice(1).map(s => s.replace(/L/g, "S")); g.rows(r, 18, { S: SKIN, F: map.F }); }
      } else {
        g.rows(["...XxXXXXXXXxX..", "..XXXXXXXXXXXXX."], 16, { X: map.X, x: map.x });
        if (legs === "sit") { if (view !== "back") g.rows(["....FFF..FFF...."], 18, { F: map.F }); }
        else { const r = rows.slice(1).map(s => s.replace(/L/g, "S")); g.rows(r, 18, { S: SKIN, F: map.F }); }
      }
      return;
    }
    g.rows(rows, 17, { L: map.L, F: map.F });
  }

  function drawArms(g, view, arms, map) {
    const A = SKIN, X = map.X;
    if (view === "side") {
      if (arms === "down" || !arms) return;
      g.del(7, 15); g.del(7, 16); g.set(7, 15, X); g.set(7, 16, map.x);
      if (arms === "front1" || arms === "front2" || arms === "hug") {
        const y = arms === "front2" ? 15 : 14;
        g.set(6, y, X); g.set(5, y, X); g.set(4, y, A); g.set(3, y, A);
        if (arms === "hug") { g.set(6, 13, X); g.set(5, 13, X); g.set(4, 13, A); g.set(3, 13, A); g.set(2, 13, A); }
      } else if (arms === "up" || arms === "wave1" || arms === "wave2") {
        const dx = arms === "wave2" ? -1 : 0;
        g.set(6, 12, X); g.set(5, 11, X); g.set(4 + dx, 10, A); g.set(4 + dx, 9, A);
      } else if (arms === "mouth") {
        g.set(6, 13, X); g.set(5, 12, X); g.set(4, 11, A);
      } else if (arms === "swingA") { g.del(7, 15); g.del(7, 16); g.set(6, 15, A); g.set(5, 16, A); }
      else if (arms === "swingB") { g.del(7, 15); g.del(7, 16); g.set(9, 15, A); g.set(9, 16, A); }
      return;
    }
    if (arms === "down" || !arms) return;
    // remove default hands
    [[2, 14], [2, 15], [14, 14], [14, 15]].forEach(([x, y]) => g.del(x, y));
    const left = (kind) => {
      if (kind === "down") { g.set(2, 14, A); g.set(2, 15, A); }
      if (kind === "up") { g.set(3, 12, X); g.set(2, 11, X); g.set(1, 10, A); g.set(2, 10, A); g.set(1, 9, A); }
      if (kind === "swing") { g.set(2, 13, A); g.set(2, 14, A); }
      if (kind === "low") { g.set(2, 15, A); g.set(2, 16, A); }
    };
    const right = (kind) => {
      if (kind === "down") { g.set(14, 14, A); g.set(14, 15, A); }
      if (kind === "up") { g.set(13, 12, X); g.set(13, 11, X); g.set(14, 10, A); g.set(13, 10, A); g.set(14, 9, A); }
      if (kind === "wave2") { g.set(13, 12, X); g.set(14, 11, X); g.set(15, 10, A); g.set(14, 10, A); g.set(15, 9, A); }
      if (kind === "swing") { g.set(14, 13, A); g.set(14, 14, A); }
      if (kind === "low") { g.set(14, 15, A); g.set(14, 16, A); }
      if (kind === "mouth") { g.set(13, 13, X); g.set(12, 12, X); g.set(11, 12, A); g.set(11, 11, A); }
    };
    if (view === "back") {
      if (arms === "front1" || arms === "front2") { const y = arms === "front1" ? 14 : 15; g.set(2, y, X); g.set(14, y, X); }
      else if (arms === "up") { left("up"); right("up"); }
      else if (arms === "wave1") { left("down"); right("up"); }
      else if (arms === "wave2") { left("down"); right("wave2"); }
      else { left("down"); right("down"); }
      return;
    }
    switch (arms) {
      case "up": left("up"); right("up"); break;
      case "wave1": left("down"); right("up"); break;
      case "wave2": left("down"); right("wave2"); break;
      case "front1": case "front2": { const y = arms === "front1" ? 15 : 16; g.set(5, y, A); g.set(10, y, A); g.set(4, 15, map.x); g.set(11, 15, map.x); break; }
      case "mouth": left("down"); right("mouth"); break;
      case "swingA": left("swing"); right("low"); break;
      case "swingB": left("low"); right("swing"); break;
      case "hug": g.set(3, 13, X); g.set(13, 13, X); g.set(4, 14, A); g.set(12, 14, A); break;
      default: left("down"); right("down");
    }
  }

  function drawFace(g, faceId, face, view) {
    const f = D.FACE[faceId];
    if (view === "back") return;
    if (view === "side") {
      for (let y = 6; y <= 11; y++) for (let x = f.L; x <= f.R - (y === 11 ? 1 : 0); x++) g.set(x, y, SKIN);
      g.set(f.L - 1, 9, SKIN); // 코
      const ex = f.L + 1;
      if (face === "closed" || face === "blink") g.set(ex, 9, EYE);
      else if (face === "happy") { g.set(ex - 1, 9, EYE); g.set(ex, 8, EYE); g.set(ex + 1, 9, EYE); }
      else { g.set(ex, 8, EYE); g.set(ex, 9, EYE); }
      g.set(ex + 1, 10, BLUSH); g.set(f.L, 11, MOUTH);
      if (face === "happy" || face === "surprise") g.set(f.L, 10, MOUTH);
      return;
    }
    g.rows([6, 7, 8, 9, 10, 11].map(y => f.rows[y]), 6, { S: SKIN, E: EYE, R: BLUSH, M: MOUTH });
    const [e1, e2] = f.eyes;
    if (face === "blink" || face === "closed") { [e1, e2].forEach(e => { g.set(e, 8, SKIN); g.set(e, 9, EYE); }); if (face === "closed") { g.set(e1 - 1, 9, EYE); g.set(e2 + 1, 9, EYE); } }
    if (face === "happy") { [e1, e2].forEach(e => { g.set(e, 9, SKIN); g.set(e - 1, 9, EYE); g.set(e + 1, 9, EYE); g.set(e, 8, EYE); }); f.mouth.forEach(x => g.set(x, 11, MOUTH)); }
    if (face === "surprise") { f.mouth.forEach(x => g.set(x, 10, SKIN)); g.set(f.mouth[0], 10, MOUTH); g.set(f.mouth[1], 10, MOUTH); g.set(f.mouth[0], 11, MOUTH); g.set(f.mouth[1], 11, MOUTH); }
  }

  function drawHair(g, look, faceId, view, map) {
    const f = D.FACE[faceId];
    const hk = { K: map.K, H: map.H };
    if (view === "front") {
      const m = frontHair(look.hair, faceId);
      for (const k in m) { const [x, y] = k.split(",").map(Number); g.set(x, y, hk[m[k]]); }
      return;
    }
    const style = viewStyle(look.hair, faceId);
    const { L, R } = f;
    const { m, put, mid } = capMask(L, R);
    if (view === "back") {
      for (let y = 6; y <= 11; y++) for (let x = L - 1; x <= R + 1; x++) put(x, y);
      delete m[(L - 1) + ",11"]; delete m[(R + 1) + ",11"];
      const len = hairLen(style);
      if (style === "long") for (let y = 12; y <= len; y++) for (let x = L; x <= R; x++) put(x, y);
      if (style === "bob") for (let x = L; x <= R; x++) put(x, 12);
      if (style === "pony") { for (let x = R - 1; x <= R + 1; x++) put(x, 0); for (let x = R - 2; x <= R + 2; x++) put(x, 1); put(mid, 12); put(mid + 1, 12); put(mid, 13); put(mid + 1, 13); }
      if (style === "bun") { for (let x = mid - 1; x <= mid + 2; x++) { put(x, -1); put(x, 0); } put(mid, -2); put(mid + 1, -2); }
      if (style === "pig") [8, 9, 10].forEach(y => { put(L - 2, y); put(L - 3, y); put(R + 2, y); put(R + 3, y); });
      m[(L + 3) + ",5"] = "H";
    } else { // side (왼쪽 보기)
      for (let y = 6; y <= 6; y++) for (let x = L - 1; x <= R + 1; x++) put(x, y);
      delete m[(L + 1) + ",6"];
      const len = hairLen(style);
      for (let y = 7; y <= len; y++) for (let x = mid + 1; x <= R + 1; x++) put(x, y);
      if (style === "long") for (let y = 12; y <= len; y++) put(R + 2, y);
      if (style === "pony") { put(R + 2, 6); put(R + 3, 7); put(R + 3, 8); put(R + 2, 9); put(R + 3, 9); }
      if (style === "bun") { for (let x = mid + 1; x <= mid + 4; x++) { put(x, 0); put(x, 1); } put(mid + 2, -1); put(mid + 3, -1); }
      if (style === "pig") [8, 9, 10].forEach(y => { put(R + 2, y); put(R + 3, y); });
      // 옆모습 얼굴 쪽 머리카락은 비우기
      for (let y = 7; y <= 11; y++) for (let x = L - 1; x <= mid; x++) delete m[x + "," + y];
    }
    for (const k in m) { const [x, y] = k.split(",").map(Number); g.set(x, y, hk[m[k]]); }
  }

  function drawAccessory(g, look, faceId, view, map) {
    const f = D.FACE[faceId], { L, R } = f, mid = (L + R) >> 1;
    const acc = look.acc;
    if (acc === "glasses" && view !== "back") {
      const c = "#5a3a1a";
      if (view === "side") { const ex = L + 1; g.set(ex - 1, 8, c); g.set(ex + 1, 8, c); g.set(ex - 1, 9, c); g.set(ex + 1, 9, c); g.hline(ex + 2, mid + 1, 8, c); }
      else { f.eyes.forEach(e => { g.set(e - 1, 8, c); g.set(e + 1, 8, c); g.set(e - 1, 9, c); g.set(e + 1, 9, c); }); g.hline(f.eyes[0] + 2, f.eyes[1] - 2, 8, c); }
    }
    if (acc === "ribbon") { const c = "#e23b5a", d = "#a8213c", x0 = view === "side" ? mid + 2 : R - 1; [[0, 2], [2, 2], [0, 3], [1, 3], [2, 3], [0, 4], [2, 4]].forEach(([dx, dy]) => g.set(x0 + dx, dy, dx === 1 ? d : c)); }
    if (acc === "flower") { const x0 = view === "side" ? mid + 2 : R; g.set(x0, 3, "#ffd84a"); [[-1, 3], [1, 3], [0, 2], [0, 4]].forEach(([dx, dy]) => g.set(x0 + dx, dy, "#ff8fb1")); }
    if (acc === "beret") { const c = "#b0413e", d = "#7c2a2a"; g.set(mid, -1, d); for (let x = L + 1; x <= R - 1; x++) g.set(x, 0, c); for (let x = L; x <= R + 1; x++) g.set(x, 1, c); for (let x = L - 1; x <= R + 1; x++) { g.set(x, 2, c); g.set(x, 3, d); } }
    if (acc === "cap") {
      const c = "#4a7fd8", d = "#2f5aa8";
      for (let x = L + 2; x <= R - 2; x++) g.set(x, 0, c); for (let x = L; x <= R; x++) { g.set(x, 1, c); g.set(x, 2, c); } for (let x = L - 1; x <= R + 1; x++) g.set(x, 3, c);
      if (view === "front") for (let x = L - 1; x <= R + 1; x++) g.set(x, 4, d);
      if (view === "side") for (let x = L - 4; x <= mid; x++) g.set(x, 4, d);
      if (view === "back") g.set(mid, 4, d);
    }
    if (acc === "blush" && view === "front") f.blush.forEach(x => { g.set(x, 10, "#ff6f8c"); g.set(x + (x < 8 ? -1 : 1), 10, "#ff9aa8"); });
    if (acc === "earmuff") { const c = "#ffffff", d = "#f28daf"; for (let x = L; x <= R; x++) g.set(x, 1, d); [L - 2, L - 1].forEach(x => [7, 8, 9].forEach(y => g.set(x, y, c))); if (view !== "side") [R + 1, R + 2].forEach(x => [7, 8, 9].forEach(y => g.set(x, y, c))); }
  }

  function drawHeadphones(g, faceId, view) {
    const { L, R } = D.FACE[faceId]; const c = "#3b3b48", p = "#ff7aa2";
    for (let x = L; x <= R; x++) g.set(x, 0, c);
    g.set(L - 1, 1, c); g.set(R + 1, 1, c);
    for (let y = 2; y <= 6; y++) { g.set(L - 1, y, c); if (view !== "side") g.set(R + 1, y, c); }
    if (view === "side") { const mx = (L + R) >> 1; [7, 8, 9].forEach(y => { g.set(mx, y, p); g.set(mx + 1, y, p); }); }
    else[7, 8, 9].forEach(y => { g.set(L - 2, y, p); g.set(L - 1, y, p); g.set(R + 1, y, p); g.set(R + 2, y, p); });
  }

  function drawProp(g, prop, view, arms) {
    if (!prop) return;
    const P = (pts, c) => pts.forEach(([x, y]) => g.set(x, y, c));
    if (view === "back") { if (prop === "can") P([[14, 14], [15, 14], [15, 13]], "#5aa86a"); return; }
    if (view === "side") {
      if (prop === "can") { P([[1, 13], [2, 13], [3, 13], [1, 14], [2, 14], [3, 14]], "#5aa86a"); P([[0, 12], [-1, 11]], "#3d8a50"); P([[-2, 12], [-2, 14]], "#7ec8ff"); }
      if (prop === "book") { P([[2, 13], [2, 14], [2, 15], [3, 13], [3, 15]], "#b0413e"); P([[3, 14]], "#fff3cf"); }
      if (prop === "phone") P([[3, 13], [3, 14]], "#2b2b33");
      if (prop === "mug") { P([[3, 10], [3, 11], [2, 10], [2, 11]], "#ffffff"); P([[2, 9]], "#c7a07a"); }
      if (prop === "plate" || prop === "snack") P([[1, 14], [2, 14], [3, 14]], "#ffffff");
      return;
    }
    if (prop === "book") { P([[5, 13], [6, 13], [9, 13], [10, 13], [5, 14], [10, 14], [5, 15], [10, 15]], "#b0413e"); P([[6, 14], [7, 14], [8, 14], [9, 14], [6, 15], [9, 15]], "#fff3cf"); P([[7, 15], [8, 15]], "#e8dab0"); P([[7, 13], [8, 13]], "#7c2a2a"); }
    if (prop === "phone") { P([[7, 13], [8, 13], [7, 14], [8, 14], [7, 15], [8, 15]], "#2b2b33"); P([[7, 14]], "#9fd4f5"); }
    if (prop === "mug") {
      if (arms === "mouth") { P([[10, 9], [11, 9], [12, 9], [10, 10], [11, 10], [12, 10]], "#ffffff"); P([[13, 10]], "#ffffff"); P([[10, 8], [11, 8], [12, 8]], "#8a5a2b"); }
      else { P([[7, 14], [8, 14], [9, 14], [7, 15], [8, 15], [9, 15]], "#ffffff"); P([[10, 14]], "#ffffff"); P([[7, 13], [8, 13], [9, 13]], "#8a5a2b"); }
    }
    if (prop === "snack" || prop === "plate") {
      P([[5, 16], [6, 16], [7, 16], [8, 16], [9, 16], [10, 16]], "#ffffff"); P([[6, 15], [7, 15], [8, 15], [9, 15]], prop === "snack" ? "#e8883a" : "#f4c542");
      if (arms === "mouth") P([[10, 11], [10, 10]], "#e8883a");
    }
    if (prop === "controller") { P([[5, 15], [6, 15], [7, 15], [8, 15], [9, 15], [10, 15], [6, 16], [9, 16]], "#4a4a58"); P([[6, 15]], "#ff7aa2"); P([[9, 15]], "#7ec8ff"); }
    if (prop === "can") { P([[11, 14], [12, 14], [13, 14], [11, 15], [12, 15], [13, 15]], "#5aa86a"); P([[14, 13], [15, 12]], "#3d8a50"); }
    if (prop === "cloth") P([[6, 15], [7, 15], [8, 15], [9, 15]], "#ff9aa8");
  }

  /* ---------- main renderer ---------- */
  function render(faceId, look, o) {
    const key = faceId + "|" + JSON.stringify(look) + "|" + JSON.stringify(o);
    if (cache.has(key)) return cache.get(key);
    const dir = o.dir || "down";
    const view = dir === "down" ? "front" : dir === "up" ? "back" : "side";
    const map = colorsOf(look);
    const g = Grid();
    const legs = o.legs || "stand";

    if (view === "back") drawFace(g, faceId, o.face, view);
    // 몸
    const body = view === "front" ? BODY_FRONT : view === "back" ? BODY_BACK : BODY_SIDE;
    g.rows(body, 12, { X: map.X, x: map.x, W: WHITE, T: TIE, A: SKIN });
    applyTop(g, look.top, view, map);
    drawLegs(g, view, legs, look, map);
    // 머리 (긴 머리 뒷부분이 몸보다 뒤에 오도록: 앞모습은 얼굴→머리, 몸은 덮지 않게)
    if (view === "front") {
      drawFace(g, faceId, o.face, view);
      const m = frontHair(look.hair, faceId);
      for (const k in m) { const [x, y] = k.split(",").map(Number); if (y >= 12 && g.get(x, y)) continue; g.set(x, y, m[k] === "H" ? map.H : map.K); }
    } else if (view === "side") {
      drawFace(g, faceId, o.face, view);
      drawHair(g, look, faceId, view, map);
    } else {
      drawHair(g, look, faceId, view, map);
      if (look.hair === "long" || (look.hair === "orig" && faceId === "geon")) {
        // 등을 덮는 긴 머리 다시 칠하기
        const { L, R } = D.FACE[faceId];
        for (let y = 12; y <= 14; y++) for (let x = L; x <= R; x++) g.set(x, y, map.K);
      }
    }
    drawArms(g, view, o.arms, map);
    drawAccessory(g, look, faceId, view, map);
    if (o.headphones) drawHeadphones(g, faceId, view);
    drawProp(g, o.prop, view, o.arms);

    const c = document.createElement("canvas"); c.width = FW; c.height = FH;
    const x = c.getContext("2d");
    const sy = (legs === "sit" ? 2 : 0) + (o.bob || 0);
    for (const k in g.px) { const [px, py] = k.split(",").map(Number); x.fillStyle = g.px[k]; x.fillRect(px, py + sy - (legs === "sit" ? 0 : 0), 1, 1); }
    let out = c;
    if (dir === "right") {
      out = document.createElement("canvas"); out.width = FW; out.height = FH;
      const y = out.getContext("2d"); y.translate(FW, 0); y.scale(-1, 1); y.drawImage(c, 0, 0);
    }
    if (cache.size > 1500) cache.clear();
    cache.set(key, out);
    return out;
  }

  // 머리만 (침대에서 이불 덮고 누웠을 때)
  function head(faceId, look, o) {
    const full = render(faceId, look, Object.assign({}, o, { dir: "down", arms: "down", legs: "stand" }));
    const c = document.createElement("canvas"); c.width = FW; c.height = 17;
    c.getContext("2d").drawImage(full, 0, 0, FW, 17, 0, 0, FW, 17);
    return c;
  }

  function portrait(faceId, look, scale = 4, o = {}) {
    const f = render(faceId, look, Object.assign({ dir: "down", face: "happy" }, o));
    const c = document.createElement("canvas"); c.width = FW * scale; c.height = FH * scale;
    const x = c.getContext("2d"); x.imageSmoothingEnabled = false; x.drawImage(f, 0, 0, c.width, c.height);
    return c;
  }

  return { render, head, portrait, FW, FH };
})();
