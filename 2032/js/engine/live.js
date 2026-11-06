/* =========================================================
   LIVE — 캐릭터 이동, 길찾기 이동, 가구 상호작용, 두 캐릭터 상호작용, 자율 행동
   ========================================================= */
(function (G) {
  const { T, COLS, ROWS, WALL } = G;
  const L = G.live = { chars: {}, input: { up: 0, down: 0, left: 0, right: 0, run: 0 } };
  const now = () => G.t;
  const ROT_DIR = ["down", "left", "up", "right"];
  const SEAT_DY = 7;
  const rand = (a, b) => a + Math.random() * (b - a);

  class Char {
    constructor(id) {
      this.id = id; const s = G.S.chars[id];
      this.x = s.x; this.y = s.y; this.dir = s.dir || "down";
      this.path = null; this.onArrive = null; this.act = null; this.reserve = null;
      this.walkT = 0; this.moving = false; this.running = false; this.follow = false;
      this.blinkAt = now() + rand(1500, 4000); this.autoAt = now() + rand(3000, 7000); this.autoEnd = 0;
      this.bubble = null; this.fxAt = 0;
      this.pose = { dir: this.dir, legs: "stand", arms: "down", face: "normal" };
    }
    tile() { return G.feetTile(this.x, this.y); }
    depth() { return this.act && this.act.place && this.act.place.depth !== undefined ? this.act.place.depth : this.y; }
    get name() { return G.S.story.names[this.id]; }
  }
  L.Char = Char;
  L.init = () => { L.chars = { geon: new Char("geon"), chan: new Char("chan") }; L.ensureFree(); L.restoreActs(); };
  L.ctrl = () => L.chars[G.S.control];
  L.partner = (c) => L.chars[c.id === "geon" ? "chan" : "geon"];
  L.say = (c, text, ms = 2600) => { if (G.story && G.story.active) return; c.bubble = { text, until: now() + ms }; };

  /* ---------- helpers ---------- */
  const rectOf = it => { const t = (G.def(it).layer === "top" && G.surfaceUnder(it)) || it; return G.fp(t); };
  function dirToward(fx, fy, rect) {
    const cx = (rect.x + rect.w / 2) * T, cy = (rect.y + rect.h / 2) * T;
    const dx = cx - fx, dy = cy - (fy - 6);
    if (Math.abs(dx) > Math.abs(dy) * 1.1) return dx < 0 ? "left" : "right";
    return dy < 0 ? "up" : "down";
  }
  function dirToPoint(fx, fy, tx, ty) { const dx = tx - fx, dy = ty - fy; if (Math.abs(dx) >= Math.abs(dy)) return dx < 0 ? "left" : "right"; return dy < 0 ? "up" : "down"; }
  function takenKeys(c) { const o = L.partner(c); const s = new Set(); if (o.act && o.act.place && o.act.place.key) s.add(o.act.place.key); if (o.reserve) s.add(o.reserve); return s; }
  function otherTile(c) { const o = L.partner(c); const t = o.path && o.path.length ? o.path[o.path.length - 1] : o.tile(); return t; }
  function sideTiles(f, rot) {
    const below = [], above = [], left = [], right = [];
    for (let x = f.x; x < f.x + f.w; x++) { below.push([x, f.y + f.h]); above.push([x, f.y - 1]); }
    for (let y = f.y; y < f.y + f.h; y++) { left.push([f.x - 1, y]); right.push([f.x + f.w, y]); }
    const order = { 0: [below, left, right, above], 1: [left, below, above, right], 2: [above, left, right, below], 3: [right, below, above, left] }[rot || 0];
    return order;
  }
  function pickTile(c, groups, grid, avoidKeys) {
    const [cx, cy] = c.tile(); const ot = otherTile(c);
    for (const g of groups) {
      const ok = g.filter(([x, y]) => G.isFree(x, y, grid) && !(ot[0] === x && ot[1] === y) && !(avoidKeys && avoidKeys.has("floor:" + x + "," + y)))
        .map(t => ({ t, p: (t[0] === cx && t[1] === cy) ? [[cx, cy]] : G.path(cx, cy, t[0], t[1], grid) })).filter(o => o.p);
      if (ok.length) { ok.sort((a, b) => a.p.length - b.p.length); return ok[0].t; }
    }
    return null;
  }
  function adjFree(c, tx, ty, grid, prefer) {
    const cand = [[tx, ty + 1], [tx - 1, ty], [tx + 1, ty], [tx, ty - 1]];
    if (prefer) cand.sort((a, b) => (a[0] === prefer[0] && a[1] === prefer[1] ? -1 : 0) - (b[0] === prefer[0] && b[1] === prefer[1] ? -1 : 0));
    return pickTile(c, [cand], grid);
  }
  const DV = { down: [0, 1], up: [0, -1], left: [-1, 0], right: [1, 0] };
  const isSeat = it => G.def(it).approach === "seat";

  /* ---------- resolve where to go for an action ---------- */
  function resolve(c, it, aid, force = {}) {
    const A = ACTIONS[aid], d = G.def(it), grid = G.blocked(), taken = takenKeys(c);
    const standAt = (target, msgIfNone) => {
      const f = G.fp(target); const dd = G.def(target);
      let groups;
      if (dd.layer === "wall" || dd.layer === "curtain") { const g = []; for (let x = f.x - 1; x <= f.x + f.w; x++) g.push([x, WALL]); groups = [g.filter(([x]) => x >= f.x && x < f.x + f.w), g]; }
      else groups = sideTiles(f, target.rot);
      const t = pickTile(c, groups, grid);
      if (!t) return { err: msgIfNone || "가까이 갈 수 있는 자리가 없어요" };
      const p = G.tileFeet(t[0], t[1]);
      return { walk: t, place: { x: p.x, y: p.y, dir: dirToward(p.x, p.y, f), legs: "stand", key: "floor:" + t[0] + "," + t[1] } };
    };
    const seatAt = (seatIt, tile) => {
      const f = G.fp(seatIt); let tiles = [];
      for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) tiles.push([x, y]);
      if (tile) tiles = tiles.filter(t => t[0] === tile[0] && t[1] === tile[1]);
      tiles = tiles.filter(([x, y]) => !taken.has("seat:" + seatIt.uid + ":" + x + "," + y) && !taken.has("whole:" + seatIt.uid));
      if (!tiles.length) return { err: "자리가 이미 차 있어요" };
      const [cx, cy] = c.tile(); tiles.sort((a, b) => Math.hypot(a[0] - cx, a[1] - cy) - Math.hypot(b[0] - cx, b[1] - cy));
      const dir = ROT_DIR[seatIt.rot];
      for (const [sx, sy] of tiles) {
        const fv = DV[dir]; const front = [sx + fv[0], sy + fv[1]];
        const w = adjFree(c, sx, sy, grid, front);
        if (!w) continue;
        return { walk: w, place: { x: sx * T + 8, y: sy * T + SEAT_DY + (dir === "up" ? 2 : 0), dir, legs: "sit", depth: G.depth(seatIt) + 0.5, key: "seat:" + seatIt.uid + ":" + sx + "," + sy, seated: true, back: w }, seatUid: seatIt.uid };
      }
      return { err: "앉으러 가는 길이 막혀 있어요" };
    };

    switch (A.pos) {
      case "stand": return standAt((d.layer === "top" && G.surfaceUnder(it)) || it);
      case "seat": return seatAt(it, force.seatTile);
      case "lie": {
        const f = G.fp(it); const R = G.spriteRect(it); let spots = [];
        if (it.id === "bed") {
          if (it.rot === 0) spots = [{ x: f.x * T + 8, y: R.y + 8, kind: "bedV" }, { x: f.x * T + 24, y: R.y + 8, kind: "bedV" }];
          else spots = [{ x: R.x + 18, y: f.y * T + 9, kind: "bedH" }, { x: R.x + 18, y: f.y * T + 24, kind: "bedH" }];
          spots.forEach((s, i) => s.key = "bed:" + it.uid + ":" + i);
        } else {
          if (it.rot % 2 === 0) spots = [{ x: f.x * T + f.w * 8, y: f.y * T + (it.rot === 2 ? -2 : 6), kind: "flatH" }];
          else spots = [{ x: f.x * T + 8, y: f.y * T + 26, kind: "flatV" }];
          spots[0].key = "whole:" + it.uid;
        }
        spots = spots.filter(s => !taken.has(s.key) && !(s.key.startsWith("whole") ? [...taken].some(k => k.includes(it.uid)) : taken.has("whole:" + it.uid)));
        if (!spots.length) return { err: "누울 자리가 없어요" };
        const sp = spots[0];
        const w = pickTile(c, sideTiles(f, it.rot === 2 ? 2 : 0), grid);
        if (!w) return { err: "가까이 갈 수 있는 자리가 없어요" };
        return { walk: w, place: { x: sp.x, y: sp.y + 6, dir: "down", lie: { kind: sp.kind, x: sp.x, y: sp.y }, depth: G.depth(it) + (it.id === "bed" ? 0.5 : 0.9), key: sp.key, back: w } };
      }
      case "floor": case "floorlie": {
        let tiles = [];
        if (d.layer === "rug" || (d.layer === "top" && !G.surfaceUnder(it))) { const f = G.fp(it); for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) tiles.push([x, y]); }
        let t = null;
        if (tiles.length) t = pickTile(c, [tiles], grid, taken);
        if (!t && d.layer !== "rug") { const r = standAt((d.layer === "top" && G.surfaceUnder(it)) || it); if (r.err) return r; t = r.walk; r.place.legs = A.pos === "floor" ? "sit" : "stand"; if (A.pos === "floor") { r.place.key = "floor:" + t[0] + "," + t[1]; return r; } }
        if (!t) return { err: "앉을 빈자리가 없어요" };
        const p = G.tileFeet(t[0], t[1]);
        if (A.pos === "floorlie") return { walk: t, place: { x: p.x, y: p.y, dir: "down", lie: { kind: "flatH", x: p.x, y: p.y - 4 }, depth: p.y - 2, key: "floor:" + t[0] + "," + t[1] } };
        return { walk: t, place: { x: p.x, y: p.y - 1, dir: "down", legs: "sit", key: "floor:" + t[0] + "," + t[1] } };
      }
      case "tvseat": {
        const tv = it.id === "tv" ? it : G.items().find(o => o.id === "tv");
        if (!tv) return { err: "이 방에는 TV가 없어요. 꾸미기 모드에서 TV를 놓아 주세요" };
        const tf = G.fp(tv), tcx = (tf.x + tf.w / 2) * T, tcy = (tf.y + 1) * T;
        let seats = isSeat(it) ? [it] : G.items().filter(isSeat);
        if (force.seatUid) seats = seats.filter(s => s.uid === force.seatUid);
        seats = seats.map(s => { const f = G.fp(s), sx = (f.x + f.w / 2) * T, sy = (f.y + f.h / 2) * T; const v = DV[ROT_DIR[s.rot]]; const dot = (tcx - sx) * v[0] + (tcy - sy) * v[1]; return { s, score: (dot > 0 ? 0 : 200) + Math.hypot(tcx - sx, tcy - sy) }; }).sort((a, b) => a.score - b.score);
        for (const { s } of seats) { const r = seatAt(s, force.seatTile); if (!r.err) { r.tv = tv.uid; return r; } }
        const r = standAt(tv); if (r.err) return r; r.tv = tv.uid; return r;
      }
      case "chair": {
        const surf = d.surface > 0 ? it : G.surfaceUnder(it);
        if (!surf) { const r = standAt(it); r.noChair = true; return r; }
        const sf = G.fp(surf);
        let chairs = G.items().filter(o => isSeat(o) && G.fp(o).w === 1 && G.fp(o).h === 1).filter(o => { const f = G.fp(o); const adjH = (f.y >= sf.y && f.y < sf.y + sf.h) && (f.x === sf.x - 1 || f.x === sf.x + sf.w); const adjV = (f.x >= sf.x && f.x < sf.x + sf.w) && (f.y === sf.y - 1 || f.y === sf.y + sf.h); return adjH || adjV; });
        if (force.seatUid) chairs = chairs.filter(o => o.uid === force.seatUid);
        if (d.layer === "top") chairs.sort((a, b) => Math.abs(G.fp(a).x - it.x) - Math.abs(G.fp(b).x - it.x));
        for (const ch of chairs) { const r = seatAt(ch); if (!r.err) { r.surface = surf.uid; r.place.dir = dirToward(r.place.x, r.place.y + 6, sf); return r; } }
        const r = standAt(surf); if (!r.err) { r.surface = surf.uid; r.noChair = true; } return r;
      }
    }
    return { err: "할 수 없는 행동이에요" };
  }
  L.resolve = resolve;

  /* ---------- walking ---------- */
  L.walkTo = (c, tx, ty, onArrive) => {
    const grid = G.blocked(); const [sx, sy] = c.tile();
    if (sx === tx && sy === ty) { c.path = [[tx, ty]]; c.onArrive = onArrive; return true; }
    const p = G.path(sx, sy, tx, ty, grid);
    if (!p) { c.path = null; return false; }
    c.path = p.slice(1); c.onArrive = onArrive; return true;
  };

  /* ---------- actions ---------- */
  L.start = (c, it, aid, force = {}) => {
    if (G.mode !== "live") return;
    const A = ACTIONS[aid]; if (!A) return;
    L.stop(c, { silent: true });
    const res = resolve(c, it, aid, force);
    if (res.err) { if (c === L.ctrl()) G.ui.toast(res.err, "warn"); return false; }
    c.reserve = res.place.key;
    const go = () => begin(c, it, aid, res, force);
    if (force.instant) { const p = G.tileFeet(res.walk[0], res.walk[1]); c.x = p.x; c.y = p.y; go(); return true; }
    if (!L.walkTo(c, res.walk[0], res.walk[1], go)) { c.reserve = null; if (c === L.ctrl()) G.ui.toast("가는 길이 막혀 있어요", "warn"); return false; }
    c.running = c === L.ctrl() && L.input.run;
    return true;
  };
  function begin(c, it, aid, res, force) {
    c.reserve = null;
    if (!G.findItem(it.uid)) return;
    const A = ACTIONS[aid];
    c.act = { aid, uid: it.uid, steps: A.steps, i: 0, t0: now(), place: res.place, tv: res.tv, surface: res.surface, loop: !!A.loop, linked: force.linked || null, back: res.place.back || res.walk, autoEnd: force.autoEnd || 0 };
    c.x = res.place.x; c.y = res.place.y; c.dir = res.place.dir;
    if (res.noChair && c === L.ctrl()) L.say(c, "의자가 없어서 서서 할게요");
    applyStep(c);
    G.story && G.story.onAction(c, it, aid);
    G.ui.refreshLive();
  }
  function itemOf(c) { return c.act ? G.findItem(c.act.uid) : null; }
  function applyStep(c) {
    const a = c.act, s = a.steps[a.i], it = itemOf(c); if (!it) return;
    a.ts = now();
    if (s.state) Object.assign(it.state, s.state);
    if (s.toggle) { it.state[s.toggle] = !it.state[s.toggle]; L.say(c, it.state[s.toggle] ? "불 켰다!" : "불 껐다", 1400); }
    if (s.water) { it.state.dry = false; it.state.watered = Date.now(); }
    if (s.cycle) it.state[s.cycle] = ((it.state[s.cycle] || 0) % 3) + 1;
    if (s.tvOn && a.tv) { const tv = G.findItem(a.tv); if (tv) tv.state.on = true; }
    if (s.devicesOn && a.surface) G.items().forEach(o => { if ((o.id === "laptop" || o.id === "monitor") && G.surfaceUnder(o) && G.surfaceUnder(o).uid === a.surface) o.state.on = true; });
    if (s.dressup) setTimeout(() => G.ui.openDressup(c.id, () => { if (c.act && c.act.uid === it.uid) L.finish(c); }), 500);
    if (s.fx === "fridge") L.say(c, FRIDGE_MSGS[Math.floor(Math.random() * FRIDGE_MSGS.length)], 2600);
    if (s.fx === "window") L.say(c, G.S.settings.night ? "별이 반짝반짝" : "오늘 하늘 진짜 맑다", 2600);
    if (s.fx === "clock") { const d = new Date(); L.say(c, `지금은 ${d.getHours()}시 ${d.getMinutes()}분!`, 2000); }
    if (s.fx === "ding") L.say(c, "띵!", 900);
    if (it.id === "plant" || it.id === "flowerpot") { if (a.aid === "plantlook") L.say(c, it.state.dry ? "목말라 보여… 물 줘야겠다" : "쑥쑥 크고 있어!", 2000); }
    G.sfx && G.sfx("blip");
  }
  L.finish = (c, opts = {}) => {
    const a = c.act; if (!a) return;
    const A = ACTIONS[a.aid], it = itemOf(c);
    const lasted = now() - a.t0;
    if (it && A.end) Object.assign(it.state, A.end);
    if (a.aid === "watchtv" && a.tv) { const tv = G.findItem(a.tv); const o = L.partner(c); if (tv && !(o.act && o.act.tv === a.tv)) tv.state.on = false; }
    if (a.aid === "work" && a.surface) { const o = L.partner(c); if (!(o.act && o.act.surface === a.surface)) G.items().forEach(x => { if ((x.id === "laptop" || x.id === "monitor") && G.surfaceUnder(x) && G.surfaceUnder(x).uid === a.surface) x.state.on = false; }); }
    if (a.aid === "study" && it) it.state.on = it.state.on; // 스탠드는 켠 채로
    if (!opts.silent && (!A.loop || lasted > 1500)) {
      G.S.coins += A.coins || 0; G.S.stats.actions = (G.S.stats.actions || 0) + 1;
      if (A.coins) G.spawn("coin", c.x - 2, c.y - 30, { vx: 0, vy: -10, life: 900 });
      if (A.msg) L.say(c, A.msg, 2200);
      G.checkUnlocks(); G.ui.coins(); G.sfx && G.sfx("coin");
    }
    const back = a.back; c.act = null;
    if (a.place && (a.place.seated || a.place.lie) && back) { const p = G.tileFeet(back[0], back[1]); c.x = p.x; c.y = p.y; }
    if (a.place && a.place.legs === "sit" && !a.place.seated) { c.y += 1; }
    c.autoEnd = 0;
    if (a.linked && !opts.fromLink) { const o = L.chars[a.linked]; if (o.act && o.act.linked === c.id) L.finish(o, { fromLink: true, silent: opts.silent }); }
    G.dirty && G.dirty();
    G.ui.refreshLive();
  };
  L.stop = (c, opts = {}) => { c.path = null; c.onArrive = null; c.reserve = null; if (c.act) L.finish(c, opts); };

  /* custom steps (두 캐릭터 상호작용용) */
  function custom(c, steps, o = {}) {
    c.act = { aid: "_duo", custom: true, steps, i: 0, t0: now(), place: { x: c.x, y: c.y, dir: c.dir, legs: "stand" }, loop: false, back: null, onEnd: o.onEnd };
    c.act.ts = now();
  }

  /* ---------- duo ---------- */
  L.duo = (id) => {
    const a = L.ctrl(), b = L.partner(a); const D = DUO_ACTIONS.find(x => x.id === id);
    if (id === "follow") { b.follow = !b.follow; L.stop(b, { silent: true }); G.ui.toast(b.follow ? `${b.name}가 따라와요` : "함께 걷기 끝", "info"); G.ui.refreshLive(); return; }
    if (id === "wave") {
      L.stop(a, { silent: true }); L.stop(b, { silent: true });
      [a, b].forEach(c => custom(c, [{ look: "partner", arms: ["wave1", "wave2"], face: "happy", dur: 2000 }]));
      L.say(a, "안녕~", 1600); setTimeout(() => L.say(b, "반가워!", 1600), 500); return;
    }
    if (["face", "highfive", "hug", "come"].includes(id)) {
      L.stop(a, { silent: true }); L.stop(b, { silent: true }); b.follow = false;
      const grid = G.blocked(); let [ax, ay] = a.tile();
      if (!G.isFree(ax, ay, grid)) { const nf = G.nearestFree(ax, ay, grid); if (!nf) return; [ax, ay] = nf; }
      const ap = G.tileFeet(ax, ay); a.x = ap.x; a.y = ap.y;
      const cand = [[ax + 1, ay], [ax - 1, ay], [ax, ay + 1], [ax, ay - 1]];
      const [bx, by] = b.tile(); cand.sort((p, q) => (Math.abs(p[0] - bx) + Math.abs(p[1] - by)) - (Math.abs(q[0] - bx) + Math.abs(q[1] - by)));
      if (id !== "come") cand.sort((p, q) => (p[1] === ay ? 0 : 1) - (q[1] === ay ? 0 : 1));
      let ok = false;
      for (const t of cand) { if (!G.isFree(t[0], t[1], grid)) continue; if (L.walkTo(b, t[0], t[1], () => arrive())) { ok = true; break; } }
      if (!ok) { G.ui.toast("둘이 만날 자리가 없어요", "warn"); return; }
      function arrive() {
        const dx = a.x - b.x, dy = a.y - b.y;
        a.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "left" : "right") : (dy > 0 ? "up" : "down");
        b.dir = Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? "right" : "left") : (dy > 0 ? "down" : "up");
        if (id === "come") { L.say(b, "왔어!", 1400); custom(b, [{ look: "partner", face: "happy", dur: 900 }]); return; }
        const horiz = Math.abs(dx) > Math.abs(dy);
        const nudge = (n) => { if (horiz) { const s = Math.sign(dx); a.x -= s * n; b.x += s * n; } else { const s = Math.sign(dy); a.y -= s * n; b.y += s * n; } a.act && (a.act.place.x = a.x, a.act.place.y = a.y); b.act && (b.act.place.x = b.x, b.act.place.y = b.y); };
        if (id === "face") { [a, b].forEach(c => custom(c, [{ look: "partner", face: "happy", fx: "hearts", dur: 2000 }])); }
        if (id === "highfive") {
          [a, b].forEach(c => custom(c, [{ look: "partner", arms: ["up"], dur: 450 }, { look: "partner", arms: ["up"], face: "happy", fx: "spark", dur: 1100 }]));
          nudge(2); setTimeout(() => { L.say(a, "짝!", 900); G.spawn("spark", (a.x + b.x) / 2 - 2, Math.min(a.y, b.y) - 30, { vy: -6 }); G.sfx && G.sfx("clap"); }, 450);
          reward(D);
        }
        if (id === "hug") { nudge(4); [a, b].forEach(c => custom(c, [{ look: "partner", arms: ["hug"], face: "closed", fx: "hearts", dur: 2600 }])); reward(D); }
      }
      return;
    }
    if (id === "sitside" || id === "tvtogether") {
      const pair = findSeatPair(a, id === "tvtogether");
      if (pair.err) { G.ui.toast(pair.err, "warn"); return; }
      L.stop(a, { silent: true }); L.stop(b, { silent: true }); b.follow = false;
      const aid = id === "tvtogether" ? "watchtv" : "sit";
      const okA = L.start(a, pair.s1, aid, { seatTile: pair.t1, seatUid: pair.s1.uid, linked: b.id });
      const okB = okA && L.start(b, pair.s2, aid, { seatTile: pair.t2, seatUid: pair.s2.uid, linked: a.id });
      if (!okB) { L.stop(a, { silent: true }); G.ui.toast("둘이 앉을 자리로 갈 수 없어요", "warn"); return; }
      reward(D); setTimeout(() => L.say(b, id === "tvtogether" ? "오늘은 뭐 볼까?" : "옆자리 찜!", 1800), 1200);
      return;
    }
    if (id === "eattogether") {
      const tables = G.items().filter(o => G.def(o).layer === "floor" && G.def(o).surface > 0 && ["dtable", "coffeetable", "desk"].includes(o.id));
      for (const tb of tables) {
        const sf = G.fp(tb);
        const chairs = G.items().filter(o => isSeat(o) && G.fp(o).w === 1 && G.fp(o).h === 1).filter(o => { const f = G.fp(o); return ((f.y >= sf.y && f.y < sf.y + sf.h) && (f.x === sf.x - 1 || f.x === sf.x + sf.w)) || ((f.x >= sf.x && f.x < sf.x + sf.w) && (f.y === sf.y - 1 || f.y === sf.y + sf.h)); });
        if (chairs.length >= 2) {
          L.stop(a, { silent: true }); L.stop(b, { silent: true }); b.follow = false;
          if (L.start(a, tb, "eat", { seatUid: chairs[0].uid }) && L.start(b, tb, "eat", { seatUid: chairs[1].uid })) { reward(D); setTimeout(() => L.say(a, "잘 먹겠습니다!", 1600), 1500); return; }
        }
      }
      G.ui.toast("이 방에 의자 두 개가 붙은 식탁이 없어요", "warn"); return;
    }
  };
  function reward(D) { if (D.stat) { G.S.stats[D.stat] = (G.S.stats[D.stat] || 0) + 1; } if (D.coins) { G.S.coins += D.coins; G.ui.coins(); } G.checkUnlocks(); G.dirty && G.dirty(); }
  function findSeatPair(a, needTv) {
    const seats = G.items().filter(isSeat);
    const tv = G.items().find(o => o.id === "tv");
    if (needTv && !tv) return { err: "이 방에는 TV가 없어요" };
    const pairs = [];
    seats.forEach(s => { const f = G.fp(s); const tiles = []; for (let y = f.y; y < f.y + f.h; y++) for (let x = f.x; x < f.x + f.w; x++) tiles.push([x, y]); for (let i = 0; i + 1 < tiles.length; i++) pairs.push({ s1: s, t1: tiles[i], s2: s, t2: tiles[i + 1] }); });
    for (let i = 0; i < seats.length; i++) for (let j = i + 1; j < seats.length; j++) { const p = G.fp(seats[i]), q = G.fp(seats[j]); if (p.w === 1 && p.h === 1 && q.w === 1 && q.h === 1 && Math.abs(p.x - q.x) + Math.abs(p.y - q.y) === 1 && seats[i].rot === seats[j].rot) pairs.push({ s1: seats[i], t1: [p.x, p.y], s2: seats[j], t2: [q.x, q.y] }); }
    if (!pairs.length) return { err: "나란히 앉을 소파나 붙어 있는 의자가 없어요" };
    const [ax, ay] = a.tile();
    const score = pr => { let s = Math.hypot(pr.t1[0] - ax, pr.t1[1] - ay); if (needTv) { const tf = G.fp(tv); const v = DV[ROT_DIR[pr.s1.rot]]; const dot = ((tf.x + tf.w / 2) - pr.t1[0]) * v[0] + ((tf.y + 0.5) - pr.t1[1]) * v[1]; s += dot > 0 ? 0 : 100; } return s; };
    pairs.sort((p, q) => score(p) - score(q));
    return pairs[0];
  }

  /* ---------- nearby interactables ---------- */
  L.nearby = (c) => {
    const [tx, ty] = c.tile(); const out = [];
    G.items().forEach(it => {
      const d = G.def(it); if (!d.actions.length) return;
      let dist;
      if (d.layer === "wall" || d.layer === "curtain") { const f = G.fp(it); if (ty > WALL + 1) return; dist = tx < f.x ? f.x - tx : tx >= f.x + f.w ? tx - (f.x + f.w - 1) : 0; dist = Math.max(dist, ty - WALL); }
      else { const f = rectOf(it); const dx = tx < f.x ? f.x - tx : tx >= f.x + f.w ? tx - (f.x + f.w - 1) : 0; const dy = ty < f.y ? f.y - ty : ty >= f.y + f.h ? ty - (f.y + f.h - 1) : 0; dist = Math.max(dx, dy); }
      if (dist <= 1) out.push({ it, dist: dist + (d.layer === "top" ? -0.1 : 0) + (d.layer === "rug" ? 0.3 : 0) });
    });
    return out.sort((a, b) => a.dist - b.dist).map(o => o.it);
  };

  /* ---------- per-frame update ---------- */
  function blockedAt(x, y, grid, self) {
    const pts = [[x - 5, y - 3], [x + 5, y - 3], [x - 5, y], [x + 5, y]];
    for (const [px, py] of pts) { const tx = Math.floor(px / T), ty = Math.floor(py / T); if (tx < 0 || tx >= COLS || ty >= ROWS || ty < WALL || grid[ty][tx]) return true; }
    const o = L.partner(self); if (!o.act && Math.abs(o.x - x) < 9 && Math.abs(o.y - y) < 5 && Math.hypot(o.x - x, o.y - y) < Math.hypot(o.x - self.x, o.y - self.y)) return true;
    return false;
  }
  L.update = (dt) => {
    if (G.mode !== "live") { Object.values(L.chars).forEach(c => posePassive(c)); return; }
    const grid = G.blocked();
    const ctrl = L.ctrl();
    // 키보드 이동
    const locked = G.story && G.story.active;
    const I = locked ? { up: 0, down: 0, left: 0, right: 0, run: 0 } : L.input; const kx = (I.right ? 1 : 0) - (I.left ? 1 : 0), ky = (I.down ? 1 : 0) - (I.up ? 1 : 0);
    ctrl.moving = false;
    if (kx || ky) {
      if (ctrl.act) L.stop(ctrl);
      ctrl.path = null; ctrl.onArrive = null; ctrl.reserve = null;
      const sp = (I.run ? 92 : 50) * dt / 1000; const n = Math.hypot(kx, ky);
      const nx = ctrl.x + kx / n * sp, ny = ctrl.y + ky / n * sp;
      if (!blockedAt(nx, ctrl.y, grid, ctrl)) ctrl.x = nx;
      if (!blockedAt(ctrl.x, ny, grid, ctrl)) ctrl.y = ny;
      ctrl.dir = Math.abs(kx) > 0 && !(ky && ctrl.dir !== "left" && ctrl.dir !== "right" && Math.abs(ky) > 0 && false) ? (kx < 0 ? "left" : "right") : (ky < 0 ? "up" : "down");
      if (ky && !kx) ctrl.dir = ky < 0 ? "up" : "down";
      ctrl.moving = true; ctrl.running = !!I.run;
    }
    Object.values(L.chars).forEach(c => {
      // 경로 이동
      if (c.path && c.path.length) {
        const [tx, ty] = c.path[0]; const p = G.tileFeet(tx, ty);
        const dx = p.x - c.x, dy = p.y - c.y, dist = Math.hypot(dx, dy);
        const run = c.running || (c === ctrl && I.run) || (c.follow && Math.hypot(ctrl.x - c.x, ctrl.y - c.y) > 60);
        const sp = (run ? 92 : 50) * dt / 1000;
        if (dist <= sp) { c.x = p.x; c.y = p.y; c.path.shift(); }
        else { c.x += dx / dist * sp; c.y += dy / dist * sp; }
        if (Math.abs(dx) > 0.5 || Math.abs(dy) > 0.5) c.dir = Math.abs(dx) > Math.abs(dy) ? (dx < 0 ? "left" : "right") : (dy < 0 ? "up" : "down");
        c.moving = true; c.running = run;
        if (!c.path.length) { c.path = null; const cb = c.onArrive; c.onArrive = null; c.moving = false; c.running = false; cb && cb(); }
      } else if (c !== ctrl) c.moving = false;
      // 행동 진행
      if (c.act) {
        const a = c.act, s = a.steps[a.i];
        const last = a.i === a.steps.length - 1;
        if (!(last && a.loop) && s.dur && now() - a.ts >= s.dur) {
          if (!last) { a.i++; if (a.custom) a.ts = now(); else applyStep(c); }
          else { if (a.custom) { c.act = null; a.onEnd && a.onEnd(); } else L.finish(c); }
        }
        if (c.act && c.act.autoEnd && now() > c.act.autoEnd) L.finish(c);
        if (c.act && !c.act.custom && !G.findItem(c.act.uid)) { c.act = null; }
      }
      // 따라가기
      if (c.follow && c !== ctrl && !c.act) {
        const d = Math.hypot(ctrl.x - c.x, ctrl.y - c.y);
        if (d > 26 && (!c.path || now() - (c.followAt || 0) > 600)) {
          c.followAt = now(); const [tx, ty] = ctrl.tile(); const t = G.nearestFree(tx, ty + 1, grid, (x, y) => x === tx && y === ty);
          if (t) L.walkTo(c, t[0], t[1], null);
        }
      }
      // 자율 행동
      if (c !== ctrl && G.S.settings.autoLife && !c.follow && !locked) autonomous(c);
      fxFor(c);
      updatePose(c);
    });
  };
  function autonomous(c) {
    if (c.act || c.path) return;
    if (now() < c.autoAt) return;
    c.autoAt = now() + rand(7000, 14000);
    const skip = ["clothes", "lamp", "putthing", "trash", "cupboard", "fridge"];
    const opts = [];
    G.items().forEach(it => G.def(it).actions.forEach(aid => { if (!skip.includes(aid)) opts.push([it, aid]); }));
    if (Math.random() < 0.25 || !opts.length) { const grid = G.blocked(); for (let k = 0; k < 10; k++) { const x = Math.floor(rand(0, COLS)), y = Math.floor(rand(WALL, ROWS)); if (G.isFree(x, y, grid)) { L.walkTo(c, x, y, null); break; } } return; }
    const [it, aid] = opts[Math.floor(Math.random() * opts.length)];
    if (L.start(c, it, aid, { autoEnd: 0 }) && ACTIONS[aid].loop) { const set = () => { if (c.act) c.act.autoEnd = now() + rand(6000, 12000); else setTimeout(set, 400); }; set(); }
  }
  function fxFor(c) {
    if (!c.act) return; const s = c.act.steps[c.act.i]; if (!s.fx || now() < c.fxAt) return;
    c.fxAt = now() + 520;
    const P = c.act.place || {}; const hx = P.lie ? P.lie.x : c.x, hy = P.lie ? P.lie.y - 6 : c.y - 26;
    const it = c.act.custom ? null : G.findItem(c.act.uid); const R = it ? G.spriteRect(it) : null;
    switch (s.fx) {
      case "zzz": G.spawn("z", hx + 4, hy - 4, { vx: 6, vy: -8, life: 1800 }); break;
      case "notes": G.spawn("note", hx + (Math.random() < .5 ? -10 : 6), hy, { vy: -12, life: 1500 }); break;
      case "hearts": G.spawn("heart", hx - 2 + rand(-6, 6), hy - 2, { vy: -12, life: 1300 }); break;
      case "spark": G.spawn("spark", hx - 2 + rand(-8, 8), hy + rand(-4, 6), { vy: -6, life: 900 }); break;
      case "sparkle": G.spawn("spark", hx - 2 + rand(-10, 10), hy + rand(0, 14), { vy: -4, vx: 0, life: 800 }); break;
      case "steam": if (R) G.spawn("puff", R.x + R.w / 2 + rand(-4, 2), R.y - 2, { vy: -10, life: 1300 }); break;
      case "bubbles": if (R) G.spawn("bubble", R.x + rand(2, R.w - 4), R.y + 2, { vy: -9, life: 1200 }); break;
      case "water": if (R) G.spawn("drop", R.x + R.w / 2 + rand(-4, 2), R.y + 2, { vy: 16, vx: 0, life: 700 }); break;
    }
  }
  function posePassive(c) { c.moving = false; updatePose(c); }
  function updatePose(c) {
    const P = { dir: c.dir, legs: "stand", arms: "down", face: "normal" };
    const t = now();
    if (t > c.blinkAt) { if (t > c.blinkAt + 140) c.blinkAt = t + rand(2200, 4800); else P.face = "blink"; }
    if (c.talkUntil && t < c.talkUntil && !(c.act && c.act.steps[c.act.i].face)) P.face = Math.floor(t / 160) % 2 ? "surprise" : "normal";
    if (c.act) {
      const a = c.act, s = a.steps[a.i], pl = a.place || {};
      const el = t - (a.ts || a.t0);
      let dir = pl.dir || c.dir;
      if (s.look === "item") { const it = G.findItem(a.uid); if (it) { const f = rectOf(it); dir = G.def(it).layer === "wall" || G.def(it).layer === "curtain" ? "up" : dirToward(c.x, c.y, f); } }
      else if (s.look === "seat") dir = pl.dir;
      else if (s.look === "tv") { const tv = a.tv && G.findItem(a.tv); dir = pl.seated ? pl.dir : (tv ? dirToward(c.x, c.y, G.fp(tv)) : pl.dir); }
      else if (s.look === "partner") { const o = L.partner(c); dir = dirToPoint(c.x, c.y, o.x, o.y); }
      else if (s.look) dir = s.look;
      c.dir = dir; P.dir = dir;
      P.legs = s.legs === "lie" ? "stand" : (pl.legs === "sit" ? "sit" : (s.legs || "stand"));
      if (s.arms) P.arms = s.arms[Math.floor(el / 320) % s.arms.length];
      if (s.prop) P.prop = s.prop;
      if (s.face) P.face = s.face === "blink" ? (Math.floor(el / 900) % 3 === 0 ? "blink" : "normal") : s.face;
      if (s.hp) P.headphones = true;
      if (s.bob) P.bob = Math.floor(el / 300) % 2;
      if (pl.lie) P.lie = pl.lie;
      if (pl.legs === "sit" && P.dir === "up") P.legs = "sit";
    } else if (c.moving) {
      const k = Math.floor(t / (c.running ? 95 : 150)) % 2;
      P.legs = c.running ? (k ? "runA" : "runB") : (k ? "walkA" : "walkB");
      P.arms = k ? "swingA" : "swingB";
      P.bob = c.running ? k : 0;
    }
    c.pose = P;
  }

  /* ---------- clicks ---------- */
  L.charAt = (px, py) => Object.values(L.chars).find(c => { const x = c.pose.lie ? c.pose.lie.x : c.x, y = c.pose.lie ? c.pose.lie.y + 8 : c.y; return px >= x - 7 && px <= x + 7 && py >= y - 22 && py <= y + 1; });
  L.click = (px, py) => {
    if (G.story && G.story.active) return;
    const ctrl = L.ctrl();
    const hitC = L.charAt(px, py);
    if (hitC && hitC !== ctrl) { L.setControl(hitC.id); return; }
    if (hitC === ctrl && ctrl.act) { G.ui.showItemActions(null); return; }
    const it = G.render.itemAt(px, py);
    if (it && G.def(it).actions.length && G.def(it).layer !== "rug") { G.ui.showItemActions(it); return; }
    const tx = Math.floor(px / T), ty = Math.floor(py / T);
    if (it && G.def(it).layer === "rug" && G.isFree(tx, ty)) { /* 러그 위 빈칸은 걷기 */ }
    else if (it && G.def(it).actions.length) { G.ui.showItemActions(it); return; }
    const grid = G.blocked();
    let t = G.isFree(tx, ty, grid) ? [tx, ty] : G.nearestFree(tx, Math.max(WALL, ty), grid);
    if (!t) return;
    L.stop(ctrl); ctrl.running = L.input.run || ctrl.runToggle;
    if (L.walkTo(ctrl, t[0], t[1], null)) G.spawn("spark", t[0] * T + 6, t[1] * T + 8, { vy: 0, vx: 0, life: 400, col: "#ffffff" });
    G.ui.showItemActions(null);
  };
  L.setControl = (id) => { G.S.control = id; const c = L.chars[id]; c.follow = false; L.partner(c).path = L.partner(c).path; G.ui.refreshLive(); G.ui.toast(`${c.name} 조작 중`, "info"); };

  /* ---------- room / mode housekeeping ---------- */
  L.ensureFree = () => {
    const grid = G.blocked(); const used = [];
    Object.values(L.chars).forEach(c => {
      if (c.act) return;
      let [tx, ty] = c.tile();
      if (!G.isFree(tx, ty, grid) || used.some(u => u[0] === tx && u[1] === ty)) { const t = G.nearestFree(tx, ty, grid, (x, y) => used.some(u => u[0] === x && u[1] === y)); if (t) { const p = G.tileFeet(t[0], t[1]); c.x = p.x; c.y = p.y; [tx, ty] = t; } }
      if (c.x < 6 || c.x > G.RW - 6 || c.y < WALL * T + 4 || c.y > G.RH) { const t = G.nearestFree(6, 9, grid); const p = G.tileFeet(t[0], t[1]); c.x = p.x; c.y = p.y; [tx, ty] = t; }
      used.push([tx, ty]);
    });
  };
  L.enterRoom = () => {
    const grid = G.blocked();
    Object.values(L.chars).forEach(c => { c.act = null; c.path = null; c.onArrive = null; c.reserve = null; });
    const a = G.nearestFree(6, 9, grid); const b = G.nearestFree(7, 9, grid, (x, y) => a && x === a[0] && y === a[1]);
    if (a) { const p = G.tileFeet(a[0], a[1]); L.chars.geon.x = p.x; L.chars.geon.y = p.y; L.chars.geon.dir = "up"; }
    if (b) { const p = G.tileFeet(b[0], b[1]); L.chars.chan.x = p.x; L.chars.chan.y = p.y; L.chars.chan.dir = "up"; }
  };
  L.stopAll = (silent = true) => Object.values(L.chars).forEach(c => L.stop(c, { silent }));
  L.persist = () => {
    Object.values(L.chars).forEach(c => {
      const s = G.S.chars[c.id];
      s.x = Math.round(c.x); s.y = Math.round(c.y); s.dir = c.dir; s.room = G.room;
      s.act = c.act && !c.act.custom && ACTIONS[c.act.aid] && ACTIONS[c.act.aid].loop ? { aid: c.act.aid, uid: c.act.uid, key: c.act.place && c.act.place.key, back: c.act.back } : null;
      if (s.act && c.act.place && c.act.place.seated) { s.act.seat = c.act.place.key.split(":").pop().split(",").map(Number); s.act.seatUid = c.act.place.key.split(":")[1]; }
    });
  };
  L.restoreActs = () => {
    ["geon", "chan"].forEach(id => {
      const s = G.S.chars[id].act; if (!s) return; const it = G.findItem(s.uid); if (!it) return;
      const c = L.chars[id];
      const force = { instant: true }; if (s.seat) { force.seatTile = s.seat; force.seatUid = s.seatUid; }
      if (s.back) { const p = G.tileFeet(s.back[0], s.back[1]); c.x = p.x; c.y = p.y; }
      try { L.start(c, it, s.aid, force); } catch (e) { }
    });
  };
})(window.G);
