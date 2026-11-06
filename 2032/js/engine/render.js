/* =========================================================
   RENDER — 방, 가구, 캐릭터, 효과, 조명, 편집 표시
   1배율 오프스크린 캔버스에 그린 뒤 정수 배율로 확대해요.
   ========================================================= */
(function (G) {
  const { T, COLS, ROWS, WALL, RW, RH } = G;
  const off = document.createElement("canvas"); off.width = RW; off.height = RH;
  const ctx = off.getContext("2d");
  const lightCv = document.createElement("canvas"); lightCv.width = RW; lightCv.height = RH;
  const lctx = lightCv.getContext("2d");
  const finalImgs = {};
  G.render = {};

  function finalImage(path) {
    if (!CONFIG.USE_FINAL_ASSETS) return null;
    if (finalImgs[path] === undefined) { const im = new Image(); finalImgs[path] = null; im.onload = () => finalImgs[path] = im; im.onerror = () => finalImgs[path] = false; im.src = path; }
    return finalImgs[path] || null;
  }

  function drawRoomBase() {
    const r = G.S.rooms[G.room];
    const wp = WALLPAPERS.find(w => w.id === r.wall) || WALLPAPERS[0];
    const fl = FLOORS.find(f => f.id === r.floor) || FLOORS[0];
    // wall
    ctx.fillStyle = wp.a; ctx.fillRect(0, 0, RW, WALL * T);
    ctx.fillStyle = wp.b; for (let x = 0; x < RW; x += 8) ctx.fillRect(x, 0, 4, WALL * T);
    ctx.fillStyle = wp.line; for (let x = 2; x < RW; x += 16) for (let y = 6; y < WALL * T - 6; y += 12) ctx.fillRect(x + ((y / 12) % 2) * 8, y, 1, 1);
    ctx.fillStyle = "#4a2a12"; ctx.fillRect(0, 0, RW, 2);
    ctx.fillStyle = "#b9793f"; ctx.fillRect(0, WALL * T - 4, RW, 4); ctx.fillStyle = "#7a4a22"; ctx.fillRect(0, WALL * T - 1, RW, 1);
    // floor
    const fy = WALL * T;
    ctx.fillStyle = fl.a; ctx.fillRect(0, fy, RW, RH - fy);
    if (fl.check) { ctx.fillStyle = fl.b; for (let y = 0; y < ROWS - WALL; y++) for (let x = 0; x < COLS; x++) if ((x + y) % 2) ctx.fillRect(x * T, fy + y * T, T, T); }
    else if (fl.soft) { ctx.fillStyle = fl.b; for (let y = fy; y < RH; y += 3) for (let x = (y % 2) * 2; x < RW; x += 5) ctx.fillRect(x, y, 1, 1); }
    else {
      for (let y = fy; y < RH; y += 8) { ctx.fillStyle = fl.line; ctx.fillRect(0, y, RW, 1); const off = ((y - fy) / 8) % 2 ? 0 : 24; ctx.fillStyle = fl.line; for (let x = off; x < RW; x += 48) ctx.fillRect(x, y, 1, 8); ctx.fillStyle = fl.b; ctx.fillRect(0, y + 1, RW, 1); }
    }
    ctx.fillStyle = "rgba(0,0,0,.12)"; ctx.fillRect(0, fy, RW, 2);
    // 문 매트 (아래 중앙)
    ctx.fillStyle = "#7a4a22"; ctx.fillRect(6 * T, RH - 4, 2 * T, 4); ctx.fillStyle = "#c98d55"; ctx.fillRect(6 * T + 2, RH - 3, 2 * T - 4, 2);
  }

  const env = () => ({ t: G.t, night: G.S.settings.night });
  function drawItem(it, ov, alpha) {
    const d = G.def(it); const rot = ov && ov.rot !== undefined ? ov.rot : it.rot;
    const R = G.spriteRect(it, ov);
    const img = finalImage(d.sprite.final);
    if (alpha !== undefined) ctx.globalAlpha = alpha;
    if (img) ctx.drawImage(img, R.x, R.y, R.w, R.h);
    else { ctx.save(); ctx.translate(R.x, R.y); ItemSprites.draw(ctx, d.id, R.w, R.h, rot, it.state, env()); ctx.restore(); }
    ctx.globalAlpha = 1;
  }
  function drawItemOver(it) {
    const d = G.def(it); if (!ItemSprites.hasOver(d.id)) return;
    const R = G.spriteRect(it); ctx.save(); ctx.translate(R.x, R.y); ItemSprites.drawOver(ctx, d.id, R.w, R.h, it.rot, it.state, env()); ctx.restore();
  }

  /* ---------- characters ---------- */
  function charFrame(c) {
    const look = G.S.chars[c.id].look;
    return CharSprites.render(c.id, look, c.pose);
  }
  function drawChar(c) {
    const P = c.pose;
    const look = G.S.chars[c.id].look;
    if (P.lie) {
      const L = P.lie;
      if (L.kind === "bedV") {
        const head = CharSprites.head(c.id, look, { face: P.face, headphones: P.headphones });
        ctx.drawImage(head, Math.round(L.x - 12), Math.round(L.y - 4));
      } else {
        const f = CharSprites.render(c.id, look, Object.assign({}, P, { dir: "down", legs: "stand", arms: "down", lie: undefined }));
        ctx.save(); ctx.translate(Math.round(L.x), Math.round(L.y)); if (L.kind === "flatV") { ctx.drawImage(f, -12, -16); } else { ctx.rotate(-Math.PI / 2); ctx.drawImage(f, -12, -15); } ctx.restore();
      }
      return;
    }
    const x = Math.round(c.x), y = Math.round(c.y);
    if (P.legs !== "sit") { ctx.fillStyle = "rgba(40,20,10,.25)"; ctx.fillRect(x - 5, y - 1, 10, 2); ctx.fillRect(x - 4, y - 2, 8, 1); }
    ctx.drawImage(charFrame(c), x - 12, y - 24);
  }
  function drawMarker(c) {
    // 조작 중인 캐릭터 머리 위 화살표
    const bob = Math.floor(G.t / 300) % 2;
    let x = Math.round(c.x), y = Math.round(c.y) - 30 - bob;
    if (c.pose.lie) { x = Math.round(c.pose.lie.x); y = Math.round(c.pose.lie.y) - 14 - bob; }
    else if (c.pose.legs === "sit") y += 2;
    ctx.fillStyle = "#3a2418"; ctx.fillRect(x - 3, y - 1, 7, 1); ctx.fillRect(x - 2, y + 2, 5, 1); ctx.fillRect(x - 1, y + 3, 3, 1);
    ctx.fillStyle = "#ffd84a"; ctx.fillRect(x - 3, y, 7, 2); ctx.fillRect(x - 2, y + 2, 5, 1); ctx.fillRect(x - 1, y + 3, 3, 1); ctx.fillRect(x, y + 4, 1, 1);
  }

  /* ---------- particles ---------- */
  const PIX = {
    z: ["###", "..#", ".#.", "###"],
    note: ["..##", "..#.", "..#.", "###.", "##.."],
    heart: [".#.#.", "#####", "#####", ".###.", "..#.."],
    spark: ["..#..", ".###.", "#####", ".###.", "..#.."],
    drop: [".#.", "###", ".#."],
    bubble: [".#.", "#.#", ".#."],
    puff: ["##", "##"],
    coin: [".##.", "####", "####", ".##."]
  };
  const PCOL = { z: "#5f86c6", note: "#9a5ad8", heart: "#ff6f8c", spark: "#f4c542", drop: "#5ab0f0", bubble: "#9fd4f5", puff: "#ffffff", coin: "#ffcf3a" };
  G.fx = [];
  G.spawn = (kind, x, y, o = {}) => G.fx.push(Object.assign({ kind, x, y, vx: (Math.random() - .5) * 8, vy: -14, life: 1400, age: 0, col: PCOL[kind] }, o));
  function drawFx(dt) {
    G.fx = G.fx.filter(p => (p.age += dt) < p.life);
    G.fx.forEach(p => {
      p.x += p.vx * dt / 1000; p.y += p.vy * dt / 1000;
      const a = 1 - p.age / p.life; const m = PIX[p.kind]; if (!m) return;
      ctx.globalAlpha = Math.min(1, a * 1.6);
      ctx.fillStyle = p.col;
      m.forEach((row, j) => { for (let i = 0; i < row.length; i++) if (row[i] === "#") ctx.fillRect(Math.round(p.x) + i, Math.round(p.y) + j, 1, 1); });
      ctx.globalAlpha = 1;
    });
  }

  /* ---------- lighting ---------- */
  function lightPos(it) {
    const R = G.spriteRect(it); const d = G.def(it);
    return { x: R.x + R.w / 2, y: R.y + Math.min(8, R.h / 3), r: d.light };
  }
  function drawLighting() {
    if (!G.S.settings.night) return;
    lctx.globalCompositeOperation = "source-over"; lctx.clearRect(0, 0, RW, RH);
    lctx.fillStyle = "rgba(18,22,58,0.58)"; lctx.fillRect(0, 0, RW, RH);
    lctx.globalCompositeOperation = "destination-out";
    G.items().forEach(it => {
      const d = G.def(it);
      let L = null;
      if (d.light && it.state.on) L = lightPos(it);
      if (d.id === "tv" && it.state.on) { const R = G.spriteRect(it); L = { x: R.x + R.w / 2, y: R.y + 8, r: 30 }; }
      if ((d.id === "laptop" || d.id === "monitor") && it.state.on) { const R = G.spriteRect(it); L = { x: R.x + R.w / 2, y: R.y + 4, r: 18 }; }
      if (d.id === "window") { const R = G.spriteRect(it); L = { x: R.x + R.w / 2, y: R.y + R.h, r: 14 }; }
      if (!L) return;
      const g = lctx.createRadialGradient(L.x, L.y, 2, L.x, L.y, L.r);
      g.addColorStop(0, "rgba(0,0,0,1)"); g.addColorStop(0.6, "rgba(0,0,0,.7)"); g.addColorStop(1, "rgba(0,0,0,0)");
      lctx.fillStyle = g; lctx.beginPath(); lctx.arc(L.x, L.y, L.r, 0, Math.PI * 2); lctx.fill();
    });
    lctx.globalCompositeOperation = "source-over";
    ctx.drawImage(lightCv, 0, 0);
    // 따뜻한 불빛
    ctx.globalCompositeOperation = "lighter";
    G.items().forEach(it => { const d = G.def(it); if (d.light && it.state.on) { const L = lightPos(it); const g = ctx.createRadialGradient(L.x, L.y, 1, L.x, L.y, L.r * 0.8); g.addColorStop(0, "rgba(255,200,90,.28)"); g.addColorStop(1, "rgba(255,200,90,0)"); ctx.fillStyle = g; ctx.fillRect(L.x - L.r, L.y - L.r, L.r * 2, L.r * 2); } });
    ctx.globalCompositeOperation = "source-over";
  }

  /* ---------- edit overlays ---------- */
  function drawGrid() {
    ctx.fillStyle = "rgba(58,36,24,.13)";
    for (let x = 0; x <= COLS; x++) ctx.fillRect(x * T, 0, 1, RH);
    for (let y = 0; y <= ROWS; y++) ctx.fillRect(0, y * T, RW, 1);
    ctx.fillStyle = "rgba(58,36,24,.35)"; ctx.fillRect(0, WALL * T, RW, 1);
  }
  function tint(f, col) { ctx.fillStyle = col; ctx.fillRect(f.x * T, f.y * T, f.w * T, f.h * T); }
  function outline(R, col) {
    const on = Math.floor(G.t / 250) % 2;
    ctx.fillStyle = col;
    for (let x = R.x - 1; x <= R.x + R.w; x += 2) { ctx.fillRect(x + on, R.y - 1, 1, 1); ctx.fillRect(x + on, R.y + R.h, 1, 1); }
    for (let y = R.y - 1; y <= R.y + R.h; y += 2) { ctx.fillRect(R.x - 1, y + on, 1, 1); ctx.fillRect(R.x + R.w, y + on, 1, 1); }
  }

  G.render.frame = (dt, view) => {
    drawRoomBase();
    const E = G.editor || {};
    const editing = G.mode === "edit";
    const drag = editing && E.drag;
    if (editing && G.S.settings.grid) drawGrid();
    if (editing && E.preview) E.preview.forEach(([x, y]) => { ctx.fillStyle = "rgba(90,180,90,.35)"; ctx.fillRect(x * T + 5, y * T + 5, 6, 6); });

    const items = G.items();
    const isDragged = it => drag && drag.uid === it.uid;
    // 1) 깔개
    items.filter(it => G.def(it).layer === "rug" && !isDragged(it)).sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(it => drawItem(it));
    // 2) 벽 장식 → 커튼
    items.filter(it => G.def(it).layer === "wall" && !isDragged(it)).sort((a, b) => (a.z || 0) - (b.z || 0)).forEach(it => drawItem(it));
    items.filter(it => G.def(it).layer === "curtain" && !isDragged(it)).forEach(it => drawItem(it));
    // 3) 깊이 정렬: 가구, 소품, 캐릭터, 덮개
    const list = [];
    items.forEach(it => { const L = G.def(it).layer; if ((L === "floor" || L === "top") && !isDragged(it)) { list.push({ d: G.depth(it), f: () => drawItem(it) }); if (ItemSprites.hasOver(it.id)) list.push({ d: G.depth(it) + 0.8, f: () => drawItemOver(it) }); } });
    Object.values(G.live.chars).forEach(c => { list.push({ d: c.depth(), f: () => drawChar(c) }); });
    list.sort((a, b) => a.d - b.d).forEach(o => o.f());
    drawFx(dt);
    drawLighting();
    if (G.mode === "live") { const c = G.live.ctrl(); if (c) drawMarker(c); }

    if (editing) {
      if (drag) {
        const it = G.findItem(drag.uid); if (it) {
          const ov = { x: drag.x, y: drag.y, rot: it.rot };
          tint(G.fp(it, ov), drag.valid ? "rgba(90,200,110,.35)" : "rgba(230,70,70,.42)");
          drawItem(it, ov, drag.valid ? 0.9 : 0.55);
          if (!drag.valid) { const R = G.spriteRect(it, ov); ctx.fillStyle = "rgba(230,60,60,.35)"; ctx.fillRect(R.x, R.y, R.w, R.h); }
        }
      } else if (E.sel) {
        const it = G.findItem(E.sel); if (it) { tint(G.fp(it), "rgba(255,216,74,.22)"); outline(G.spriteRect(it), "#ffd84a"); }
      }
    }
    // 화면으로 확대
    const v = view.getContext("2d"); v.imageSmoothingEnabled = false;
    v.drawImage(off, 0, 0, view.width, view.height);
  };
  G.render.itemAt = (px, py) => {
    // 위에 그려진 것부터 (덮개 제외)
    const items = G.items().slice();
    const order = it => { const L = G.def(it).layer; return L === "rug" ? -1e6 + (it.z || 0) : L === "wall" ? -5e5 : L === "curtain" ? -4e5 : G.depth(it); };
    items.sort((a, b) => order(b) - order(a));
    for (const it of items) { const R = G.spriteRect(it); if (px >= R.x && px < R.x + R.w && py >= R.y && py < R.y + R.h) return it; }
    return null;
  };
  G.render.off = off;
})(window.G);
