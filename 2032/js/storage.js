/* =========================================================
   STORAGE — 저장 / 불러오기 / 손상 복구
   - 저장할 때마다 바로 전 정상 데이터를 백업 키에 남겨요.
   - 불러온 데이터가 깨졌으면 백업 → 기본값 순서로 복구해요.
   - 빠진 값은 기본값으로 채워서(마이그레이션) 오래된 저장도 열려요.
   ========================================================= */
window.SaveStore = (function () {
  const VERSION = 1;
  let uidSeq = 1;
  const uid = () => "i" + Date.now().toString(36) + (uidSeq++).toString(36);

  function defaultRoom(id) {
    const meta = ROOMS.find(r => r.id === id);
    return {
      wall: meta.wall, floor: meta.floor,
      items: (DEFAULT_LAYOUTS[id] || []).map(([itemId, x, y, rot]) => ({ uid: uid(), id: itemId, x, y, rot: rot || 0, z: 0, state: {} }))
    };
  }
  function defaultStory() { return { prologue: false, rooms: {}, roomEps: {}, daily: {}, slots: {}, days: 0, placed: {}, report: false, epilogue: false, ch2Hint: false, names: { geon: "건주", chan: "찬슬" } }; }
  function defaults() {
    const rooms = {}; ROOMS.forEach(r => rooms[r.id] = defaultRoom(r.id));
    return {
      version: VERSION, savedAt: null,
      rooms,
      storage: Object.assign({}, DEFAULT_STORAGE),
      coins: CONFIG.START_COINS,
      chars: {
        geon: { look: Object.assign({}, CHAR_DATA.DEFAULT_LOOKS.geon), room: "living", x: 104, y: 120, dir: "down", act: null },
        chan: { look: Object.assign({}, CHAR_DATA.DEFAULT_LOOKS.chan), room: "living", x: 136, y: 120, dir: "down", act: null }
      },
      control: "chan",
      lastRoom: "living",
      settings: { music: false, volume: 0.4, sfx: true, night: false, autoLife: true, grid: true },
      stats: { actions: 0, hug: 0, highfive: 0, episodes: 0 },
      unlocked: {},
      story: defaultStory()
    };
  }
  function valid(d) {
    return d && typeof d === "object" && d.rooms && typeof d.rooms === "object" && d.chars && d.chars.geon && d.chars.chan;
  }
  function sanitize(d) {
    const base = defaults();
    const out = Object.assign({}, base, d);
    out.settings = Object.assign({}, base.settings, d.settings || {});
    out.stats = Object.assign({}, base.stats, d.stats || {});
    out.storage = Object.assign({}, d.storage || {});
    out.unlocked = Object.assign({}, d.unlocked || {});
    const bs = defaultStory(), ds = d.story && typeof d.story === "object" ? d.story : {};
    out.story = Object.assign(bs, ds); ["rooms", "roomEps", "daily", "slots", "placed"].forEach(k => { if (!out.story[k] || typeof out.story[k] !== "object") out.story[k] = {}; });
    out.story.names = Object.assign({ geon: "건주", chan: "찬슬" }, ds.names || {});
    out.coins = Number.isFinite(d.coins) ? Math.max(0, d.coins) : base.coins;
    ROOMS.forEach(r => {
      const room = d.rooms[r.id];
      if (!room || !Array.isArray(room.items)) { out.rooms[r.id] = base.rooms[r.id]; return; }
      out.rooms[r.id] = {
        wall: WALLPAPERS.some(w => w.id === room.wall) ? room.wall : base.rooms[r.id].wall,
        floor: FLOORS.some(f => f.id === room.floor) ? room.floor : base.rooms[r.id].floor,
        items: room.items.filter(it => it && ITEM_BY_ID[it.id] && Number.isFinite(it.x) && Number.isFinite(it.y))
          .map(it => ({ uid: it.uid || uid(), id: it.id, x: it.x | 0, y: it.y | 0, rot: ITEM_BY_ID[it.id].rots.includes(it.rot) ? it.rot : 0, z: it.z | 0, state: it.state && typeof it.state === "object" ? it.state : {} }))
      };
    });
    ["geon", "chan"].forEach(id => {
      const c = Object.assign({}, base.chars[id], d.chars[id] || {});
      c.look = Object.assign({}, base.chars[id].look, (d.chars[id] || {}).look || {});
      if (!ROOMS.some(r => r.id === c.room)) c.room = "living";
      if (!Number.isFinite(c.x) || !Number.isFinite(c.y)) { c.x = base.chars[id].x; c.y = base.chars[id].y; }
      out.chars[id] = c;
    });
    if (!["geon", "chan"].includes(out.control)) out.control = "chan";
    if (!ROOMS.some(r => r.id === out.lastRoom)) out.lastRoom = "living";
    out.version = VERSION;
    return out;
  }
  let lastStatus = "ok";
  function load() {
    const tryKey = k => { try { const raw = localStorage.getItem(k); if (!raw) return null; const d = JSON.parse(raw); return valid(d) ? sanitize(d) : "bad"; } catch (e) { return "bad"; } };
    const main = tryKey(CONFIG.SAVE_KEY);
    if (main && main !== "bad") { lastStatus = "ok"; return main; }
    const bak = tryKey(CONFIG.BACKUP_KEY);
    if (bak && bak !== "bad") { lastStatus = main === "bad" ? "restored" : "ok"; return bak; }
    lastStatus = main === "bad" ? "reset" : "new";
    return defaults();
  }
  function save(data) {
    data.savedAt = new Date().toISOString();
    let json;
    try { json = JSON.stringify(data); } catch (e) { return { ok: false, reason: "serialize" }; }
    try {
      const prev = localStorage.getItem(CONFIG.SAVE_KEY);
      if (prev) { try { JSON.parse(prev); localStorage.setItem(CONFIG.BACKUP_KEY, prev); } catch (e) { } }
      localStorage.setItem(CONFIG.SAVE_KEY, json);
      return { ok: true };
    } catch (e) {
      // 용량 초과: 백업을 지우고 한 번 더 시도
      try { localStorage.removeItem(CONFIG.BACKUP_KEY); localStorage.setItem(CONFIG.SAVE_KEY, json); return { ok: true, noBackup: true }; }
      catch (e2) { return { ok: false, reason: "quota" }; }
    }
  }
  function reset() { try { localStorage.removeItem(CONFIG.SAVE_KEY); localStorage.removeItem(CONFIG.BACKUP_KEY); } catch (e) { } }
  return { load, save, reset, defaults, defaultRoom, uid, status: () => lastStatus };
})();
