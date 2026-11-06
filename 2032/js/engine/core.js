/* =========================================================
   CORE — 방 격자, 가구 위치 계산, 배치 판정, 길찾기
   방 = 14×11 타일(16px). 0~2행은 벽, 3~10행은 바닥.
   ========================================================= */
window.G = window.G || {};
(function (G) {
  const T = 16, COLS = 14, ROWS = 11, WALL = 3;
  Object.assign(G, { T, COLS, ROWS, WALL, RW: COLS * T, RH: ROWS * T });
  G.S = null;           // 저장 데이터
  G.mode = "live";      // live | edit
  G.room = "living";
  G.t = 0;

  G.def = it => ITEM_BY_ID[it.id];
  G.items = (roomId) => G.S.rooms[roomId || G.room].items;
  G.findItem = (uid, roomId) => G.items(roomId).find(i => i.uid === uid);

  /* ---------- geometry ---------- */
  G.fp = (it, ov) => {
    const d = G.def(it); const rot = ov && ov.rot !== undefined ? ov.rot : it.rot;
    const odd = rot % 2 === 1;
    return { x: ov && ov.x !== undefined ? ov.x : it.x, y: ov && ov.y !== undefined ? ov.y : it.y, w: odd ? d.h : d.w, h: odd ? d.w : d.h };
  };
  G.spriteH = (d, rot) => rot % 2 === 1 ? d.w * T + (d.sh - d.h * T) : d.sh;
  G.surfaceUnder = (it, ov) => {
    const f = G.fp(it, ov); const d = G.def(it);
    if (d.layer !== "top") return null;
    return G.items().find(o => o.uid !== it.uid && G.def(o).surface > 0 && G.def(o).layer === "floor" && contains(G.fp(o), f)) || null;
  };
  function contains(a, b) { return b.x >= a.x && b.y >= a.y && b.x + b.w <= a.x + a.w && b.y + b.h <= a.y + a.h; }
  function overlap(a, b) { return a.x < b.x + b.w && b.x < a.x + a.w && a.y < b.y + b.h && b.y < a.y + a.h; }
  G.overlap = overlap; G.contains = contains;

  // 화면상 스프라이트 위치 (px)
  G.spriteRect = (it, ov) => {
    const d = G.def(it), f = G.fp(it, ov), rot = ov && ov.rot !== undefined ? ov.rot : it.rot;
    const W = f.w * T, H = G.spriteH(d, rot);
    let lift = 0;
    if (d.layer === "top") { const s = G.surfaceUnder(it, ov); if (s) lift = G.def(s).surface; }
    const bottom = (f.y + f.h) * T - lift;
    return { x: f.x * T, y: bottom - H, w: W, h: H, bottom, lift };
  };
  G.depth = (it, ov) => {
    const d = G.def(it), f = G.fp(it, ov);
    let base = (f.y + f.h) * T;
    if (d.layer === "top") { const s = G.surfaceUnder(it, ov); base = s ? (G.fp(s).y + G.fp(s).h) * T + 0.3 : base - 0.2; }
    return base + (it.z || 0) * 0.01 + (d.layer === "top" ? 0.02 : 0);
  };

  /* ---------- placement rules ---------- */
  // returns {ok, reason}
  G.canPlace = (it, x, y, rot, roomId) => {
    const d = G.def(it); const ov = { x, y, rot };
    const f = G.fp(it, ov); const list = G.items(roomId).filter(o => o.uid !== it.uid);
    if (!d.rots.includes(rot)) return { ok: false, reason: "회전할 수 없는 아이템이에요" };
    if (f.x < 0 || f.x + f.w > COLS || f.y + f.h > ROWS) return { ok: false, reason: "방 밖이에요" };
    const isWall = d.layer === "wall" || d.layer === "curtain";
    if (isWall) {
      if (f.y < 0 || f.y + f.h > WALL) return { ok: false, reason: "벽에만 걸 수 있어요" };
      if (list.some(o => G.def(o).layer === d.layer && overlap(G.fp(o), f))) return { ok: false, reason: "다른 벽 장식과 겹쳐요" };
      return { ok: true };
    }
    if (f.y < WALL) return { ok: false, reason: "벽을 뚫고 놓을 수 없어요" };
    if (d.layer === "rug") {
      if (list.some(o => G.def(o).layer === "rug" && overlap(G.fp(o), f))) return { ok: false, reason: "러그끼리 겹쳐요" };
      return { ok: true };
    }
    if (d.layer === "floor") {
      if (list.some(o => G.def(o).layer === "floor" && overlap(G.fp(o), f))) return { ok: false, reason: "다른 가구와 겹쳐요" };
      if (list.some(o => G.def(o).layer === "top" && !G.surfaceUnder(o) && overlap(G.fp(o), f))) return { ok: false, reason: "바닥 소품과 겹쳐요" };
      return { ok: true };
    }
    // top
    if (list.some(o => G.def(o).layer === "top" && overlap(G.fp(o), f))) return { ok: false, reason: "다른 소품과 겹쳐요" };
    const floors = list.filter(o => G.def(o).layer === "floor" && overlap(G.fp(o), f));
    if (floors.length === 0) return { ok: true };
    if (floors.length === 1 && G.def(floors[0]).surface > 0 && contains(G.fp(floors[0]), f)) return { ok: true };
    return { ok: false, reason: "윗면이 있는 가구 위나 빈 바닥에만 놓을 수 있어요" };
  };

  /* ---------- blocked grid (movement) ---------- */
  G.blocked = () => {
    const g = []; for (let y = 0; y < ROWS; y++) { g.push(new Array(COLS).fill(y < WALL)); }
    G.items().forEach(o => { const d = G.def(o); if (d.layer !== "floor") return; const f = G.fp(o); for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) if (g[y]) g[y][x] = true; });
    return g;
  };
  G.isFree = (tx, ty, grid) => tx >= 0 && ty >= WALL && tx < COLS && ty < ROWS && !(grid || G.blocked())[ty][tx];

  /* ---------- A* path (8방향, 모서리 끼기 금지) ---------- */
  G.path = (sx, sy, tx, ty, grid) => {
    grid = grid || G.blocked();
    if (!G.isFree(tx, ty, grid)) return null;
    const key = (x, y) => y * COLS + x;
    const open = [[sx, sy]], came = {}, gs = { [key(sx, sy)]: 0 }, fs = { [key(sx, sy)]: 0 };
    const h = (x, y) => Math.max(Math.abs(x - tx), Math.abs(y - ty));
    const closed = new Set();
    let guard = 0;
    while (open.length && guard++ < 4000) {
      open.sort((a, b) => fs[key(a[0], a[1])] - fs[key(b[0], b[1])]);
      const [cx, cy] = open.shift(); const ck = key(cx, cy);
      if (cx === tx && cy === ty) { const p = [[cx, cy]]; let k = ck; while (came[k] !== undefined) { k = came[k]; p.unshift([k % COLS, (k / COLS) | 0]); } return p; }
      closed.add(ck);
      for (let dy = -1; dy <= 1; dy++) for (let dx = -1; dx <= 1; dx++) {
        if (!dx && !dy) continue;
        const nx = cx + dx, ny = cy + dy;
        if (!G.isFree(nx, ny, grid) && !(nx === sx && ny === sy)) continue;
        if (dx && dy && (!G.isFree(cx + dx, cy, grid) || !G.isFree(cx, cy + dy, grid))) continue;
        const nk = key(nx, ny); if (closed.has(nk)) continue;
        const ng = gs[ck] + (dx && dy ? 1.42 : 1);
        if (gs[nk] === undefined || ng < gs[nk]) { came[nk] = ck; gs[nk] = ng; fs[nk] = ng + h(nx, ny); if (!open.some(o => o[0] === nx && o[1] === ny)) open.push([nx, ny]); }
      }
    }
    return null;
  };
  G.nearestFree = (tx, ty, grid, avoid) => {
    grid = grid || G.blocked();
    let best = null, bd = 1e9;
    for (let y = WALL; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (G.isFree(x, y, grid) && !(avoid && avoid(x, y))) { const d = Math.abs(x - tx) + Math.abs(y - ty) * 1.01; if (d < bd) { bd = d; best = [x, y]; } }
    return best;
  };
  // 타일 → 발 위치(px)
  G.tileFeet = (tx, ty) => ({ x: tx * T + 8, y: ty * T + 12 });
  G.feetTile = (x, y) => [Math.max(0, Math.min(COLS - 1, Math.floor(x / T))), Math.max(0, Math.min(ROWS - 1, Math.floor((y - 2) / T)))];

  /* ---------- stats & unlock ---------- */
  G.isUnlocked = d => !d.unlock || G.S.unlocked[d.id] || (G.S.stats[d.unlock.stat] || 0) >= d.unlock.n;
  G.checkUnlocks = () => {
    ITEMS.forEach(d => { if (d.unlock && !G.S.unlocked[d.id] && (G.S.stats[d.unlock.stat] || 0) >= d.unlock.n) { G.S.unlocked[d.id] = true; G.S.storage[d.id] = (G.S.storage[d.id] || 0) + 1; G.ui && G.ui.toast(`새 아이템 획득: ${d.name}! 보관함을 확인하세요`, "gift"); } });
  };
})(window.G);
