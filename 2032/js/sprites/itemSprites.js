/* =========================================================
   ITEM SPRITES — 임시(코드로 그린) 픽셀 가구
   items.js의 sprite.temp 값이 "proc:<id>"이면 여기 함수로 그리고,
   CONFIG.USE_FINAL_ASSETS가 true이고 sprite.final 이미지가 있으면 그 PNG를 대신 써요.
   draw(c, W, H, rot, st, env) : 스프라이트 상자 (0,0)~(W,H) 안에 그려요.
   over(...) : 앉거나 누운 캐릭터보다 앞에 와야 하는 부분(이불, 등받이)
   ========================================================= */
window.ItemSprites = (function () {
  const O = "#3a2418";
  const C = {
    wood: "#b9793f", woodL: "#d69a5c", woodD: "#7a4a22", woodDD: "#4a2a12",
    white: "#fbf6ec", cream: "#efe4cc", grey: "#a9a39a", greyD: "#5c5752", greyL: "#d8d3ca", black: "#2b2b33",
    pink: "#f2a7bb", pinkD: "#d77a95", pinkL: "#ffd2de", blue: "#8fb3e8", blueD: "#5f86c6", blueL: "#c9dcf7",
    green: "#5a9e3a", greenD: "#3b6e2a", greenL: "#8cc867", yellow: "#f4c542", orange: "#e8883a", red: "#d9483a",
    mint: "#9fdcc4", mintD: "#5fb393", lilac: "#c8b6ef", lilacD: "#9a84d6", glass: "#bfe3f5", steel: "#c9ccd4", steelD: "#8a8e99"
  };
  let c; // ctx
  const r = (x, y, w, h, col) => { c.fillStyle = col; c.fillRect(x, y, w, h); };
  const box = (x, y, w, h, fill, line = O) => { r(x, y, w, h, line); r(x + 1, y + 1, w - 2, h - 2, fill); };
  const p = (x, y, col) => r(x, y, 1, 1, col);
  const hl = (x, y, w, col) => r(x, y, w, 1, col);
  const vl = (x, y, h, col) => r(x, y, 1, h, col);

  /* ---------- seats (rot: 0 ↓, 1 ←, 2 ↑, 3 →) ---------- */
  function seat(W, H, rot, fab, fabD, opts = {}) {
    const leg = opts.leg || C.woodD, arms = opts.arms !== false;
    if (rot === 0) {
      box(0, 0, W, 15, fabD);           // 등받이
      hl(2, 2, W - 4, fab);
      box(0, 11, W, 14, fab);           // 좌석
      for (let x = 16; x < W - 1; x += 16) vl(x, 12, 9, fabD);
      hl(1, 12, W - 2, "#ffffff55");
      if (arms) { box(0, 7, 5, 18, fabD); box(W - 5, 7, 5, 18, fabD); }
      r(2, 25, 2, 2, leg); r(W - 4, 25, 2, 2, leg);
    } else if (rot === 2) {
      box(0, 0, W, 14, fab);
      for (let x = 16; x < W - 1; x += 16) vl(x, 1, 10, fabD);
      if (arms) { box(0, 0, 5, 18, fabD); box(W - 5, 0, 5, 18, fabD); }
      r(2, H - 2, 2, 2, leg); r(W - 4, H - 2, 2, 2, leg);
    } else {
      const mirror = rot === 3;
      if (mirror) { c.save(); c.translate(W, 0); c.scale(-1, 1); }
      box(W - 7, 0, 7, H - 2, fabD);     // 등받이(오른쪽)
      vl(W - 5, 2, H - 6, fab);
      box(0, 10, W - 5, H - 13, fab);    // 좌석 (세로)
      for (let y = 10 + 16; y < H - 6; y += 16) hl(1, y, W - 7, fabD);
      hl(1, 11, W - 7, "#ffffff55");
      if (arms) { box(0, 6, W - 3, 7, fabD); hl(1, 7, W - 5, fab); }
      r(1, H - 2, 2, 2, leg); r(W - 3, H - 2, 2, 2, leg);
      if (mirror) c.restore();
    }
  }
  function seatOver(W, H, rot, fab, fabD, opts = {}) {
    if (rot === 2) { box(0, H - 11, W, 9, fabD); hl(2, H - 9, W - 4, fab); if (opts.arms !== false) { box(0, H - 16, 5, 14, fabD); box(W - 5, H - 16, 5, 14, fabD); } }
    if ((rot === 1 || rot === 3) && opts.arms !== false) { const mirror = rot === 3; if (mirror) { c.save(); c.translate(W, 0); c.scale(-1, 1); } box(0, H - 8, W - 3, 7, fabD); hl(1, H - 7, W - 5, fab); if (mirror) c.restore(); }
  }
  function chair(W, H, rot, col, colD, cushion) {
    if (rot === 0) { box(2, 0, W - 4, 14, col); hl(4, 3, W - 8, colD); box(1, 11, W - 2, 8, cushion || col); vl(3, 19, 5, colD); vl(W - 4, 19, 5, colD); }
    else if (rot === 2) { box(1, 2, W - 2, 8, cushion || col); vl(3, 10, 6, colD); vl(W - 4, 10, 6, colD); }
    else { const m = rot === 3; if (m) { c.save(); c.translate(W, 0); c.scale(-1, 1); } box(1, 6, W - 4, 8, cushion || col); box(W - 5, 0, 4, 18, col); vl(2, 14, 6, colD); vl(W - 4, 18, 4, colD); if (m) c.restore(); }
  }
  function chairOver(W, H, rot, col, colD) { if (rot === 2) { box(2, H - 12, W - 4, 11, col); hl(4, H - 9, W - 8, colD); } }

  const D = {};
  const OVER = {};

  /* ---------- 거실 ---------- */
  D.sofa = (W, H, rot) => seat(W, H, rot, C.pink, C.pinkD);
  OVER.sofa = (W, H, rot) => seatOver(W, H, rot, C.pink, C.pinkD);
  D.armchair = (W, H, rot) => seat(W, H, rot, C.mint, C.mintD);
  OVER.armchair = (W, H, rot) => seatOver(W, H, rot, C.mint, C.mintD);
  D.tv = (W, H, rot, st, env) => {
    box(0, 0, W, 17, C.black); r(13, 17, 6, 2, C.greyD); r(9, 18, 14, 2, C.black);
    if (st.on) {
      const t = Math.floor(env.t / 300) % 4, cols = [["#7ec8ff", "#ffd2de"], ["#9fe0a8", "#fff1a8"], ["#ffb38a", "#c9dcf7"], ["#d6b8ff", "#9fe0a8"]][t];
      r(2, 2, W - 4, 13, cols[0]); r(4, 9, 10, 6, cols[1]); r(18, 4, 8, 4, "#ffffffaa"); p(W - 4, 14, "#ff5a5a");
    } else { r(2, 2, W - 4, 13, "#34404e"); r(4, 3, 6, 1, "#4c5c6e"); p(W - 4, 14, "#8a2a2a"); }
  };
  D.tvtable = (W, H) => { box(0, 3, W, H - 3, C.wood); r(1, 4, W - 2, 3, C.woodL); box(3, 8, W / 2 - 4, 7, C.woodD); box(W / 2 + 1, 8, W / 2 - 4, 7, C.woodD); p(W / 4, 11, C.yellow); p(3 * W / 4, 11, C.yellow); };
  D.coffeetable = (W, H) => { box(0, 2, W, 7, C.woodL); hl(1, 3, W - 2, "#f0c08a"); r(2, 9, 2, H - 9, C.woodD); r(W - 4, 9, 2, H - 9, C.woodD); hl(4, H - 4, W - 8, C.woodD); };
  D.bookshelf = (W, H) => {
    box(0, 0, W, H, C.woodD); r(2, 2, W - 4, H - 4, C.woodDD);
    const bc = ["#d9483a", "#f4c542", "#5f86c6", "#5a9e3a", "#f2a7bb", "#9a84d6", "#e8883a", "#fbf6ec"];
    for (let s = 0; s < 3; s++) {
      const y = 3 + s * 12; hl(1, y + 10, W - 2, C.wood);
      let x = 3, k = s * 3; while (x < W - 4) { const w = 2 + ((k * 7) % 3), h = 7 + (k % 3); r(x, y + 10 - h, w, h, bc[k % bc.length]); x += w + ((k % 4 === 0) ? 2 : 0); k++; }
    }
  };
  D.floorlamp = (W, H, rot, st) => { r(7, 9, 2, H - 12, C.greyD); box(4, H - 3, 8, 3, C.greyD); box(2, 0, 12, 10, st.on ? "#fff1a8" : C.cream); hl(3, 8, 10, st.on ? "#f4c542" : C.greyL); };
  D.rug = (W, H, rot) => {
    r(1, 1, W - 2, H - 2, "#e9b7a6"); r(3, 3, W - 6, H - 6, "#f6d6c4");
    for (let x = 6; x < W - 6; x += 6) for (let y = 6; y < H - 6; y += 6) p(x + ((y / 6) % 2) * 3, y, "#e9967a");
    for (let x = 1; x < W - 1; x += 2) { p(x, 0, "#e9b7a6"); p(x, H - 1, "#e9b7a6"); }
  };
  D.rug2 = (W, H) => { r(1, 1, W - 2, H - 2, C.blueL); for (let y = 3; y < H - 2; y += 4) hl(2, y, W - 4, C.blue); r(1, 1, W - 2, 1, C.blueD); r(1, H - 2, W - 2, 1, C.blueD); };
  D.plant = (W, H, rot, st) => {
    const dry = st.dry;
    const lc = dry ? ["#9a9a4a", "#7a7a3a"] : [C.greenL, C.green];
    box(4, H - 9, 8, 9, "#c96a3a"); hl(5, H - 8, 6, "#e8885a");
    const leaves = [[7, 2, 3, 8], [3, 6, 4, 6], [10, 5, 4, 7], [1, 10, 4, 4], [11, 10, 4, 4], [6, 8, 4, 8]];
    leaves.forEach(([x, y, w, h], i) => { const dy = dry ? 3 : 0; r(x, y + dy, w, h - dy, lc[i % 2]); p(x, y + dy, C.greenD); });
    vl(8, H - 14, 6, C.greenD);
  };
  D.speaker = (W, H, rot, st, env) => { box(3, 2, 10, H - 2, C.black); const pulse = st.on && Math.floor(env.t / 250) % 2; r(5, 5, 6, 6, pulse ? "#7a7a8a" : C.greyD); p(7, 7, C.black); p(8, 8, C.black); r(6, H - 7, 4, 4, C.greyD); };
  D.window = (W, H, rot, st, env) => {
    box(0, 0, W, H - 2, C.white);
    const sky = env.night ? ["#1e2a52", "#2e3d6e"] : ["#9fd4f5", "#c9ebff"];
    r(2, 2, W - 4, H - 7, sky[0]); r(2, 2, W - 4, 5, sky[1]);
    if (env.night) { p(6, 6, "#fff3cf"); p(20, 9, "#fff3cf"); p(25, 5, "#fff3cf"); r(22, 12, 3, 3, "#fff1a8"); }
    else { r(5, 8, 7, 2, "#ffffff"); r(7, 7, 4, 1, "#ffffff"); r(18, 14, 8, 2, "#ffffff"); }
    vl(W / 2, 2, H - 7, C.white); hl(2, (H - 5) / 2, W - 4, C.white); box(-1, H - 4, W + 2, 4, C.cream);
  };
  D.cushion = (W, H) => { box(2, H - 9, 12, 8, C.yellow); hl(3, H - 8, 10, "#fbe08a"); p(8, H - 5, "#c9a02a"); };

  /* ---------- 주방 ---------- */
  D.fridge = (W, H, rot, st) => {
    box(1, 0, 14, H, C.white); hl(2, 13, 12, C.greyL); vl(12, 3, 7, C.greyD); vl(12, 16, 9, C.greyD);
    if (st.open) {
      r(2, 14, 12, H - 15, "#e9f3f7"); hl(2, 22, 12, C.greyL); hl(2, 29, 12, C.greyL);
      r(3, 18, 3, 4, C.red); r(7, 19, 2, 3, C.green); r(10, 17, 3, 5, C.yellow); r(4, 26, 4, 3, C.orange); r(9, 25, 4, 4, "#ffffff");
      box(-3, 13, 5, H - 13, C.white);
    }
  };
  function counterBase(W, H) { box(0, 6, W, H - 6, C.cream); r(0, 4, W, 4, O); r(1, 5, W - 2, 2, "#e0d0b0"); box(2, 10, W - 4, H - 12, "#d9c7a3"); p(W / 2, 13, C.woodD); }
  D.counter = (W, H) => { counterBase(W, H); r(3, 1, 4, 3, C.woodL); p(9, 3, C.red); p(10, 3, C.red); };
  D.sink = (W, H, rot, st, env) => { counterBase(W, H); r(3, 5, 10, 2, C.steelD); r(4, 5, 8, 1, "#9fc0d0"); vl(8, 0, 4, C.steelD); hl(8, 0, 3, C.steelD); if (st.on) { const k = Math.floor(env.t / 200) % 3; vl(10, 1, 4, "#7ec8ff"); p(5 + k, 4, "#ffffff"); p(11 - k, 3, "#ffffff"); } };
  D.stove = (W, H, rot, st, env) => {
    box(0, 6, W, H - 6, C.greyL); r(0, 4, W, 4, O); r(1, 5, W - 2, 2, C.black);
    const on = st.on, k = Math.floor(env.t / 200) % 2;
    p(4, 5, on ? (k ? "#ff5a3a" : "#ffb03a") : C.greyD); p(11, 5, on ? (k ? "#ffb03a" : "#ff5a3a") : C.greyD);
    box(2, 10, W - 4, H - 13, C.greyD); r(3, 11, W - 6, 2, "#ffffff44");
    if (on) { box(1, 0, 9, 5, "#3a3a44"); r(10, 2, 5, 1, "#3a3a44"); p(3 + k, 2, C.yellow); p(6 - k, 2, C.orange); }
  };
  D.microwave = (W, H, rot, st, env) => { box(0, 0, W, H, C.white); r(2, 2, 9, H - 4, st.on ? (Math.floor(env.t / 300) % 2 ? "#ffe79a" : "#ffd36a") : "#3a4048"); r(12, 2, 2, 2, C.greyD); r(12, 5, 2, 1, C.green); };
  D.dtable = (W, H, rot) => { box(0, 0, W, H - 10, C.woodL); r(1, 1, W - 2, 2, "#f0c08a"); hl(1, H - 11, W - 2, C.wood); r(2, H - 10, 2, 10, C.woodD); r(W - 4, H - 10, 2, 10, C.woodD); };
  D.dchair = (W, H, rot) => chair(W, H, rot, C.woodL, C.woodD, C.pinkL);
  OVER.dchair = (W, H, rot) => chairOver(W, H, rot, C.woodL, C.woodD);
  D.coffeemachine = (W, H, rot, st, env) => { box(2, 0, 12, H, C.black); r(4, 2, 8, 3, C.greyD); p(10, 3, st.on ? C.green : C.red); r(6, 7, 4, 1, C.steel); if (st.on) { box(5, 9, 6, 4, C.white); if (Math.floor(env.t / 250) % 2) p(7, 8, "#ffffff"); } };
  D.cupboard = (W, H, rot, st) => { box(0, 0, W, H, C.wood); r(1, 1, W - 2, 2, C.woodL); if (st.open) { r(2, 4, W - 4, H - 6, C.woodDD); for (let x = 4; x < W - 4; x += 5) box(x, H - 7, 4, 4, C.white); } else { box(2, 4, W / 2 - 3, H - 6, C.woodL); box(W / 2 + 1, 4, W / 2 - 3, H - 6, C.woodL); p(W / 2 - 3, H / 2, C.woodDD); p(W / 2 + 2, H / 2, C.woodDD); } };
  D.toaster = (W, H, rot, st) => { box(3, 2, 10, H - 2, C.steel); hl(5, 3, 2, C.black); hl(9, 3, 2, C.black); p(11, 5, C.red); if (st.on) { r(5, 0, 2, 3, "#e8b26a"); r(9, 0, 2, 3, "#e8b26a"); } };

  /* ---------- 침실 ---------- */
  D.bed = (W, H, rot) => {
    if (rot === 0) { box(0, 0, W, 10, C.woodD); box(1, 6, W - 2, H - 7, C.white); box(4, 9, W - 8, 9, C.cream); hl(5, 10, W - 10, "#ffffff"); r(2, H - 2, 3, 2, C.woodDD); r(W - 5, H - 2, 3, 2, C.woodDD); }
    else { box(0, 0, 8, H, C.woodD); box(5, 2, W - 6, H - 3, C.white); box(8, 6, 10, H - 12, C.cream); vl(9, 7, H - 14, "#ffffff"); }
  };
  OVER.bed = (W, H, rot, st) => {
    if (rot === 0) { box(1, 20, W - 2, H - 22, C.blue); hl(2, 21, W - 4, C.blueL); for (let y = 26; y < H - 4; y += 6) hl(3, y, W - 6, C.blueD); }
    else { box(18, 2, W - 19, H - 4, C.blue); vl(19, 3, H - 6, C.blueL); for (let x = 24; x < W - 3; x += 6) vl(x, 4, H - 8, C.blueD); }
  };
  D.nightstand = (W, H, rot, st) => { box(1, 4, 14, H - 4, C.wood); r(2, 5, 12, 2, C.woodL); box(3, 9, 10, H - 11, C.woodD); p(8, 12, C.yellow); if (st.thing) { const t = st.thing; if (t === 1) { r(4, 1, 6, 3, C.red); hl(4, 2, 6, C.white); } if (t === 2) { box(5, 0, 4, 5, C.glass); } if (t === 3) { box(4, 1, 7, 4, C.greyD); r(5, 2, 2, 2, C.white); } } };
  D.wardrobe = (W, H, rot, st) => { box(0, 0, W, H, C.woodL); r(1, 1, W - 2, 3, C.wood); if (st.open) { r(2, 5, W - 4, H - 8, C.woodDD); hl(3, 8, W - 6, C.steel); const cs = [C.pink, C.blue, C.yellow, C.mint, C.lilac, C.white]; cs.forEach((cc, i) => r(4 + i * 4, 9, 3, 14 + (i % 2) * 3, cc)); } else { box(2, 5, W / 2 - 3, H - 8, C.wood); box(W / 2 + 1, 5, W / 2 - 3, H - 8, C.wood); vl(W / 2 - 3, H / 2 - 2, 4, C.woodDD); vl(W / 2 + 2, H / 2 - 2, 4, C.woodDD); } r(2, H - 3, W - 4, 3, C.woodD); };
  D.mirror = (W, H, rot, st, env) => { box(2, 0, 12, H - 3, C.woodL); r(4, 2, 8, H - 8, C.glass); r(5, 3, 2, 8, "#ffffff"); p(9, 12, "#ffffff"); box(1, H - 4, 14, 4, C.woodD); if (st.on && Math.floor(env.t / 300) % 2) { p(10, 5, C.yellow); p(5, 16, C.yellow); } };
  D.vanity = (W, H) => { box(6, 0, W - 12, 15, C.white); r(8, 2, W - 16, 11, C.glass); r(9, 3, 3, 6, "#ffffff"); box(0, 14, W, 9, C.white); r(1, 15, W - 2, 2, C.pinkL); box(2, 23, 4, H - 23, C.white); box(W - 6, 23, 4, H - 23, C.white); r(4, 12, 2, 3, C.pink); r(W - 6, 11, 2, 4, C.lilac); p(W - 9, 13, C.red); };
  D.desklamp = (W, H, rot, st) => { box(4, H - 2, 8, 2, C.greyD); vl(7, 4, H - 6, C.greyD); box(5, 0, 8, 5, st.on ? "#fff1a8" : C.steel); };
  D.moodlight = (W, H, rot, st, env) => { const k = Math.floor(env.t / 600) % 3; box(4, 0, 8, H - 2, st.on ? ["#ffd2de", "#fff1a8", "#c9dcf7"][k] : C.cream); box(3, H - 3, 10, 3, C.wood); };

  /* ---------- 서재 ---------- */
  D.desk = (W, H) => { box(0, 2, W, 6, C.wood); hl(1, 3, W - 2, C.woodL); box(1, 8, 12, H - 8, C.woodD); hl(3, 12, 8, C.wood); hl(3, 17, 8, C.wood); r(W - 4, 8, 2, H - 8, C.woodD); };
  D.ochair = (W, H, rot) => { const col = C.black, d = "#47475a"; if (rot === 0) { box(2, 0, 12, 13, d); hl(4, 2, 8, col); box(1, 11, 14, 7, d); vl(7, 18, 4, C.greyD); hl(3, 21, 10, C.greyD); } else if (rot === 2) { box(1, 1, 14, 7, d); vl(7, 8, 6, C.greyD); hl(3, 14, 10, C.greyD); } else { const m = rot === 3; if (m) { c.save(); c.translate(W, 0); c.scale(-1, 1); } box(1, 6, 11, 7, d); box(10, 0, 5, 16, d); vl(6, 13, 6, C.greyD); hl(2, 19, 10, C.greyD); if (m) c.restore(); } };
  OVER.ochair = (W, H, rot) => { if (rot === 2) { box(2, H - 13, 12, 10, "#47475a"); hl(4, H - 10, 8, C.black); } };
  D.laptop = (W, H, rot, st, env) => { box(2, 0, 12, 7, C.steelD); r(3, 1, 10, 5, st.on ? (Math.floor(env.t / 200) % 2 ? "#cde9ff" : "#b5dcff") : "#3a4048"); if (st.on) { hl(4, 2, 5, "#5f86c6"); hl(4, 4, 7, "#5f86c6"); } box(0, 6, 16, 3, C.steel); };
  D.monitor = (W, H, rot, st, env) => { box(0, 0, 16, 11, C.black); r(1, 1, 14, 9, st.on ? "#9fd4f5" : "#34404e"); if (st.on) { r(2, 2, 6, 3, "#ffffff"); r(9, 5, 5, 4, "#f2a7bb"); } r(7, 11, 2, 3, C.greyD); r(4, 14, 8, 2, C.black); };
  D.book = (W, H) => { box(3, H - 6, 10, 3, C.red); box(4, H - 9, 9, 3, C.blueD); box(3, H - 12, 9, 3, C.yellow); hl(5, H - 5, 6, C.white); };
  D.headphones = (W, H) => { r(4, 0, 8, 2, C.black); vl(3, 1, 4, C.black); vl(12, 1, 4, C.black); box(1, 4, 4, 4, C.pink); box(11, 4, 4, 4, C.pink); };
  D.mug = (W, H) => { box(5, H - 7, 6, 7, C.white); r(11, H - 5, 2, 3, O); hl(6, H - 6, 4, "#8a5a2b"); p(7, H - 4, C.pink); };

  /* ---------- 추가 소품 ---------- */
  D.vase = (W, H) => { box(5, H - 7, 6, 7, C.blueL); hl(6, H - 5, 4, C.blue); vl(6, 3, H - 9, C.green); vl(9, 4, H - 10, C.green); [[5, 1, C.pink], [9, 2, C.yellow], [7, 0, C.red]].forEach(([x, y, cc]) => { r(x - 1, y, 3, 3, cc); p(x, y + 1, C.white); }); };
  D.frame = (W, H) => { box(1, 0, 14, 13, C.woodL); r(3, 2, 10, 9, "#fff3cf"); r(3, 8, 10, 3, C.greenL); r(5, 4, 2, 3, C.blue); p(5, 3, O); p(6, 3, O); r(9, 4, 2, 3, C.pink); p(9, 3, O); p(10, 3, O); p(8, 3, C.red); };
  D.clock = (W, H, rot, st, env) => {
    box(2, 0, 12, 12, C.white); r(3, 1, 10, 10, "#fffaf0"); p(8, 1, O); p(8, 10, O); p(3, 6, O); p(12, 6, O);
    const d = new Date(); const ang = (v, n) => v / n * Math.PI * 2 - Math.PI / 2;
    const hand = (a, len, col) => { for (let i = 0; i <= len; i++) p(Math.round(8 + Math.cos(a) * i), Math.round(6 + Math.sin(a) * i), col); };
    hand(ang(d.getHours() % 12 + d.getMinutes() / 60, 12), 2, O); hand(ang(d.getMinutes(), 60), 3, C.red);
  };
  D.walldeco = (W, H) => { for (let x = 0; x < W; x++) p(x, 1 + Math.round(Math.sin(x / W * Math.PI) * 3), C.greyD); const fl = [C.pink, C.yellow, C.mint, C.lilac, C.blue]; for (let i = 0; i < 5; i++) { const x = 2 + i * 6, y = 2 + Math.round(Math.sin((x + 2) / W * Math.PI) * 3); c.fillStyle = fl[i]; c.beginPath(); c.moveTo(x, y); c.lineTo(x + 5, y); c.lineTo(x + 2.5, y + 6); c.fill(); } };
  D.wallshelf = (W, H) => { box(0, H - 4, W, 4, C.wood); r(2, H - 9, 4, 5, C.green); r(3, H - 12, 2, 3, C.greenL); box(9, H - 10, 5, 6, C.pinkL); r(17, H - 11, 2, 7, C.red); r(19, H - 10, 2, 6, C.blue); r(21, H - 12, 2, 8, C.yellow); box(25, H - 8, 5, 4, C.white); };
  D.doll = (W, H) => { r(3, 1, 3, 3, "#b07a4a"); r(10, 1, 3, 3, "#b07a4a"); box(3, 2, 10, 8, "#c98a5a"); p(6, 5, O); p(9, 5, O); r(7, 6, 2, 2, "#f0d0b0"); box(4, 9, 8, H - 9, "#c98a5a"); r(6, 10, 4, 2, C.red); };
  D.catfig = (W, H, rot, st, env) => { const blink = Math.floor(env.t / 2400) % 6 === 0; r(4, 1, 2, 2, C.white); r(10, 1, 2, 2, C.white); box(3, 2, 10, 7, C.white); p(6, 5, blink ? C.white : O); p(9, 5, blink ? C.white : O); p(7, 6, C.pink); box(4, 8, 9, H - 8, C.white); vl(13, 6 + (Math.floor(env.t / 500) % 2), 4, C.greyL); p(4, 2, C.pinkL); p(11, 2, C.pinkL); };
  D.console = (W, H, rot, st) => { box(1, H - 7, 14, 7, C.white); r(4, H - 6, 8, 5, st.on ? "#9fe0a8" : C.black); box(0, H - 6, 4, 5, "#ff7aa2"); box(12, H - 6, 4, 5, "#7ec8ff"); };
  D.laptopbag = (W, H) => { box(2, 3, 12, H - 3, C.greyD); r(3, 4, 10, 2, "#77737a"); r(5, 0, 6, 1, C.black); vl(5, 0, 4, C.black); vl(10, 0, 4, C.black); p(8, 8, C.yellow); };
  D.plate = (W, H) => { box(2, H - 5, 12, 4, C.white); r(4, H - 7, 4, 3, C.orange); r(8, H - 6, 4, 2, C.greenL); p(6, H - 7, C.red); };
  D.flowerpot = (W, H, rot, st) => {
    box(3, H - 8, 10, 8, "#7a8ad8"); hl(4, H - 7, 8, "#9aa8f0");
    const dy = st.dry ? 2 : 0;
    vl(6, 6 + dy, H - 14 - dy, C.green); vl(10, 4 + dy, H - 12 - dy, C.green); r(7, 10 + dy, 3, 2, C.greenL);
    [[6, 4, C.pink], [10, 2, C.yellow], [3, 8, C.red], [13, 7, C.lilac]].forEach(([x, y, cc]) => { r(x - 1, y + dy, 3, 3, st.dry ? "#c9a87a" : cc); p(x, y + 1 + dy, C.white); });
  };
  D.curtain = (W, H) => { r(0, 0, W, 3, C.woodD); for (let i = 0; i < 2; i++) { const x = i ? W - 9 : 0; r(x, 2, 9, H - 4, C.pink); for (let k = 1; k < 9; k += 3) vl(x + k, 3, H - 6, C.pinkD); r(x, H - 14, 9, 2, C.pinkL); } };
  D.trash = (W, H) => { box(3, 3, 10, H - 3, C.greyL); r(2, 1, 12, 3, C.greyD); for (let x = 5; x < 12; x += 3) vl(x, 6, H - 8, C.grey); };

  function draw(ctx, id, W, H, rot, st, env) { c = ctx; (D[id] || ((w, h) => box(0, 0, w, h, "#ff00ff")))(W, H, rot, st || {}, env || { t: 0 }); }
  function drawOver(ctx, id, W, H, rot, st, env) { if (!OVER[id]) return false; c = ctx; OVER[id](W, H, rot, st || {}, env || { t: 0 }); return true; }
  const hasOver = id => !!OVER[id];

  // 카탈로그 아이콘 (정적, 캐시)
  const icons = new Map();
  function icon(def, size = 40) {
    const k = def.id + size;
    if (icons.has(k)) return icons.get(k);
    const W = def.w * 16, H = def.sh;
    const cv = document.createElement("canvas"); const sc = Math.max(1, Math.floor(size / Math.max(W, H))) || 1;
    cv.width = W; cv.height = H;
    const x = cv.getContext("2d"); draw(x, def.id, W, H, 0, { on: true }, { t: 0, night: false }); drawOver(x, def.id, W, H, 0, {}, { t: 0 });
    icons.set(k, cv); return cv;
  }
  return { draw, drawOver, hasOver, icon, COLORS: C };
})();
