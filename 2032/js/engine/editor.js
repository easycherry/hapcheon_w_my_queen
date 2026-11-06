/* =========================================================
   EDITOR — 방 꾸미기: 선택, 드래그(격자 맞춤), 회전, 복사, 앞뒤 순서,
            보관함, 삭제, 실행 취소/다시 실행, 구매
   ========================================================= */
(function (G) {
  const { T, COLS, ROWS, WALL } = G;
  const E = G.editor = { sel: null, drag: null, preview: null, hist: {}, redo: {} };

  const snap = () => JSON.stringify({ items: G.items(), storage: G.S.storage });
  const H = () => (E.hist[G.room] = E.hist[G.room] || []);
  const R = () => (E.redo[G.room] = E.redo[G.room] || []);
  E.push = () => { const h = H(); h.push(snap()); if (h.length > 60) h.shift(); E.redo[G.room] = []; G.ui.refreshEdit(); };
  function restore(s) { const o = JSON.parse(s); G.S.rooms[G.room].items = o.items; G.S.storage = o.storage; if (E.sel && !G.findItem(E.sel)) E.sel = null; G.dirty(); G.ui.refreshEdit(); G.ui.refreshCatalog(); }
  E.undo = () => { const h = H(); if (!h.length) return G.ui.toast("되돌릴 작업이 없어요", "info"); R().push(snap()); restore(h.pop()); G.sfx && G.sfx("blip"); };
  E.redoAct = () => { const r = R(); if (!r.length) return G.ui.toast("다시 실행할 작업이 없어요", "info"); H().push(snap()); restore(r.pop()); G.sfx && G.sfx("blip"); };
  E.canUndo = () => H().length > 0; E.canRedo = () => R().length > 0;
  // 구매는 되돌리기 대상이 아니므로, 기록 속 보관함에도 반영
  function addToHistoryStorage(id, n) { [H(), R()].forEach(arr => arr.forEach((s, i) => { const o = JSON.parse(s); o.storage[id] = (o.storage[id] || 0) + n; arr[i] = JSON.stringify(o); })); }

  const selItem = () => E.sel && G.findItem(E.sel);
  E.select = (uid) => { E.sel = uid; G.ui.refreshEdit(); };

  /* ---------- pointer ---------- */
  E.down = (px, py) => {
    const it = G.render.itemAt(px, py);
    if (!it) { E.select(null); return; }
    E.select(it.uid);
    const f = G.fp(it);
    E.drag = { uid: it.uid, ox: px - f.x * T, oy: py - f.y * T, x: it.x, y: it.y, sx: it.x, sy: it.y, valid: true, moved: false, px, py };
  };
  E.move = (px, py) => {
    const d = E.drag; if (!d) return;
    if (!d.moved && Math.hypot(px - d.px, py - d.py) < 3) return;
    d.moved = true;
    const it = G.findItem(d.uid); const f = G.fp(it);
    let x = Math.round((px - d.ox) / T), y = Math.round((py - d.oy) / T);
    x = Math.max(0, Math.min(COLS - f.w, x)); y = Math.max(0, Math.min(ROWS - f.h, y));
    if (x !== d.x || y !== d.y) { d.x = x; d.y = y; d.valid = G.canPlace(it, x, y, it.rot).ok; }
  };
  E.up = () => {
    const d = E.drag; if (!d) return; E.drag = null;
    if (!d.moved) return;
    const it = G.findItem(d.uid);
    const chk = G.canPlace(it, d.x, d.y, it.rot);
    if (!chk.ok) { G.ui.toast(chk.reason + " — 원래 자리로 돌아갔어요", "warn"); G.sfx && G.sfx("nope"); return; }
    if (d.x === d.sx && d.y === d.sy) return;
    E.push();
    // 가구 위의 소품도 함께 이동
    const riders = G.def(it).surface > 0 ? G.items().filter(o => G.def(o).layer === "top" && G.surfaceUnder(o) && G.surfaceUnder(o).uid === it.uid) : [];
    const dx = d.x - it.x, dy = d.y - it.y;
    it.x = d.x; it.y = d.y;
    riders.forEach(o => { o.x += dx; o.y += dy; });
    G.dirty(); G.sfx && G.sfx("place");
  };

  /* ---------- tools ---------- */
  E.rotate = () => {
    const it = selItem(); if (!it) return;
    const d = G.def(it); if (d.rots.length < 2) return G.ui.toast(`${d.name}은(는) 회전할 수 없어요`, "info");
    const i = d.rots.indexOf(it.rot); const next = d.rots[(i + 1) % d.rots.length];
    // 회전 후 크기가 바뀌면 들어맞는 근처 위치 찾기
    const tries = [[0, 0], [-1, 0], [0, -1], [-1, -1], [1, 0], [0, 1], [-2, 0], [0, -2], [-2, -1], [-1, -2]];
    for (const [dx, dy] of tries) { if (G.canPlace(it, it.x + dx, it.y + dy, next).ok) { E.push(); it.x += dx; it.y += dy; it.rot = next; G.dirty(); G.sfx && G.sfx("place"); return; } }
    G.ui.toast("돌릴 공간이 부족해요", "warn"); G.sfx && G.sfx("nope");
  };
  E.layer = (dir) => { const it = selItem(); if (!it) return; E.push(); it.z = (it.z || 0) + dir; G.dirty(); G.ui.toast(dir > 0 ? "앞으로 가져왔어요" : "뒤로 보냈어요", "info"); };
  E.store = () => {
    const it = selItem(); if (!it) return;
    E.push();
    const riders = G.items().filter(o => G.def(o).layer === "top" && G.surfaceUnder(o) && G.surfaceUnder(o).uid === it.uid);
    [it, ...riders].forEach(o => { G.S.storage[o.id] = (G.S.storage[o.id] || 0) + 1; });
    const ids = new Set([it.uid, ...riders.map(r => r.uid)]);
    G.S.rooms[G.room].items = G.items().filter(o => !ids.has(o.uid));
    E.sel = null; G.dirty(); G.ui.refreshEdit(); G.ui.refreshCatalog();
    G.ui.toast(riders.length ? `${G.def(it).name}와 위의 소품을 보관함에 넣었어요` : `${G.def(it).name}을(를) 보관함에 넣었어요`, "info");
  };
  E.remove = () => {
    const it = selItem(); if (!it) return; const d = G.def(it);
    const refund = Math.floor((d.price || 0) / 2);
    G.ui.confirm(`${d.name}을(를) 버릴까요?`, refund ? `반값 ♥${refund}을 돌려받아요. 보관함으로 옮기면 나중에 다시 쓸 수 있어요.` : "보관함으로 옮기면 나중에 다시 쓸 수 있어요.", "버리기", () => {
      E.push();
      const riders = G.items().filter(o => G.def(o).layer === "top" && G.surfaceUnder(o) && G.surfaceUnder(o).uid === it.uid);
      riders.forEach(o => G.S.storage[o.id] = (G.S.storage[o.id] || 0) + 1);
      const ids = new Set([it.uid, ...riders.map(r => r.uid)]);
      G.S.rooms[G.room].items = G.items().filter(o => !ids.has(o.uid));
      G.S.coins += refund; E.sel = null; G.dirty(); G.ui.coins(); G.ui.refreshEdit(); G.ui.refreshCatalog();
      if (riders.length) G.ui.toast("위에 있던 소품은 보관함으로 옮겼어요", "info");
    });
  };
  function firstSpot(proto, near) {
    const d = ITEM_BY_ID[proto.id]; const cands = [];
    for (let y = -1; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (G.canPlace(proto, x, y, proto.rot).ok) cands.push([x, y]);
    if (!cands.length) return null;
    const isTop = d.layer === "top";
    const score = ([x, y]) => {
      let s = near ? Math.abs(x - near[0]) + Math.abs(y - near[1]) : Math.abs(x - 6) + Math.abs(y - 6) * 0.8;
      if (isTop && !G.surfaceUnder(Object.assign({}, proto, { x, y }))) s += 30;
      return s;
    };
    cands.sort((a, b) => score(a) - score(b)); return cands[0];
  }
  E.validSpots = (id) => {
    const proto = { uid: "__p", id, x: 0, y: 0, rot: 0, z: 0, state: {} }; const out = [];
    for (let y = -1; y < ROWS; y++) for (let x = 0; x < COLS; x++) if (G.canPlace(proto, x, y, 0).ok) { const f = G.fp(proto, { x, y }); for (let j = f.y; j < f.y + f.h; j++) for (let i = f.x; i < f.x + f.w; i++) out.push([i, j]); }
    const seen = new Set(); return out.filter(([x, y]) => { const k = x + "," + y; if (seen.has(k)) return false; seen.add(k); return true; });
  };
  E.place = (id, near) => {
    const d = ITEM_BY_ID[id];
    if (!d.rooms.includes(G.room)) return G.ui.toast(`${d.name}은(는) ${d.rooms.map(r => ROOMS.find(x => x.id === r).name).join("·")}에만 놓을 수 있어요`, "warn");
    if (!(G.S.storage[id] > 0)) return G.ui.toast("보관함에 없어요. 먼저 구매해 주세요", "warn");
    const proto = { uid: "__p", id, x: 0, y: 0, rot: d.rots[0], z: 0, state: {} };
    const spot = firstSpot(proto, near);
    if (!spot) { G.sfx && G.sfx("nope"); return G.ui.toast("이 방에는 놓을 자리가 없어요", "warn"); }
    E.push();
    G.S.storage[id]--; if (!G.S.storage[id]) delete G.S.storage[id];
    const it = { uid: SaveStore.uid(), id, x: spot[0], y: spot[1], rot: proto.rot, z: 0, state: {} };
    G.items().push(it); E.sel = it.uid; G.dirty(); G.ui.refreshEdit(); G.ui.refreshCatalog(); G.sfx && G.sfx("place");
    if (G.story && !G.S.story.placed[id]) G.story.onPlace(it); else G.ui.toast(`${d.name}을(를) 놓았어요. 끌어서 옮겨 보세요`, "info");
    return it;
  };
  E.buy = (id, then) => {
    const d = ITEM_BY_ID[id];
    if (!G.isUnlocked(d)) return G.ui.toast(`획득 조건: ${d.unlock.text}`, "warn");
    if (G.S.coins < d.price) { G.sfx && G.sfx("nope"); return G.ui.toast(`♥가 ${d.price - G.S.coins}개 부족해요. 플레이 모드에서 생활하면 모여요`, "warn"); }
    G.S.coins -= d.price; G.S.storage[id] = (G.S.storage[id] || 0) + 1; addToHistoryStorage(id, 1);
    G.dirty(); G.ui.coins(); G.ui.refreshCatalog(); G.sfx && G.sfx("coin");
    if (then) then(); else G.ui.toast(`${d.name} 구매 완료! 보관함에 넣었어요`, "info");
  };
  E.copy = () => {
    const it = selItem(); if (!it) return; const d = G.def(it);
    const go = () => {
      const proto = { uid: "__p", id: it.id, x: it.x, y: it.y, rot: it.rot, z: it.z, state: {} };
      const spot = firstSpot(proto, [it.x + 1, it.y]);
      if (!spot) { G.sfx && G.sfx("nope"); return G.ui.toast("복사본을 놓을 자리가 없어요", "warn"); }
      E.push(); G.S.storage[it.id]--; if (!G.S.storage[it.id]) delete G.S.storage[it.id];
      const n = { uid: SaveStore.uid(), id: it.id, x: spot[0], y: spot[1], rot: it.rot, z: it.z || 0, state: {} };
      G.items().push(n); E.sel = n.uid; G.dirty(); G.ui.refreshEdit(); G.ui.refreshCatalog(); G.sfx && G.sfx("place");
    };
    if (G.S.storage[it.id] > 0) return go();
    if (d.unlock || !d.price) return G.ui.toast("보관함에 하나 더 있어야 복사할 수 있어요", "warn");
    G.ui.confirm(`${d.name} 하나 더 살까요?`, `보관함에 남은 게 없어서 ♥${d.price}로 하나 더 사서 복사해요.`, `♥${d.price} 사고 복사`, () => E.buy(it.id, go));
  };
  E.resetRoom = () => {
    G.ui.confirm(`${ROOMS.find(r => r.id === G.room).name}을(를) 처음 모습으로 되돌릴까요?`, "지금 놓인 가구는 보관함으로 들어가고, 처음 배치가 다시 놓여요. 실행 취소로 되돌릴 수 있어요.", "초기화", () => {
      E.push(); G.live.stopAll();
      G.items().forEach(o => G.S.storage[o.id] = (G.S.storage[o.id] || 0) + 1);
      const fresh = SaveStore.defaultRoom(G.room);
      fresh.items.forEach(o => { if (G.S.storage[o.id] > 0) { G.S.storage[o.id]--; if (!G.S.storage[o.id]) delete G.S.storage[o.id]; } });
      G.S.rooms[G.room] = fresh; E.sel = null; G.live.ensureFree(); G.dirty(); G.ui.refreshEdit(); G.ui.refreshCatalog(); G.ui.toast("방을 처음 모습으로 되돌렸어요", "info");
    });
  };
  E.setStyle = (kind, id) => { E.push(); G.S.rooms[G.room][kind] = id; G.dirty(); };
})(window.G);
