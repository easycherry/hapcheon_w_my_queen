/* =========================================================
   UI — 화면 전환, 패널, 입력, 저장 주기, 메인 루프
   ========================================================= */
(function (G) {
  const $ = s => document.querySelector(s), $$ = s => [...document.querySelectorAll(s)];
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const UI = G.ui = {};
  const L = () => G.live, E = () => G.editor;
  const view = $("#view");
  let scale = 1, cat = "all", catSel = null, focusUid = null, focusUntil = 0;
  const isTouch = matchMedia("(pointer:coarse)").matches || "ontouchstart" in window;
  if (isTouch) document.body.classList.add("touch");

  /* ---------- save ---------- */
  let saveTimer = null;
  G.dirty = () => { clearTimeout(saveTimer); saveTimer = setTimeout(() => doSave(false), 700); };
  function doSave(manual) {
    if (!G.S) return;
    L().persist(); G.S.lastRoom = G.room;
    const r = SaveStore.save(G.S);
    if (manual) UI.toast(r.ok ? `저장했어요 (${new Date().toLocaleTimeString("ko-KR", { hour: "2-digit", minute: "2-digit" })})` : "저장 공간이 부족해서 저장하지 못했어요", r.ok ? "info" : "warn");
    else if (!r.ok) UI.toast("저장 공간이 부족해요. 일부 진행이 저장되지 않았을 수 있어요", "warn");
  }
  setInterval(() => { if (G.S && !$("#game").hidden) doSave(false); }, 10000);
  addEventListener("visibilitychange", () => { if (document.hidden && G.S) doSave(false); });
  addEventListener("pagehide", () => G.S && doSave(false));

  /* ---------- toasts / confirm / info ---------- */
  UI.toast = (msg, kind = "info") => {
    const box = $("#toasts"); const t = document.createElement("div"); t.className = "toast " + kind; t.textContent = msg; box.appendChild(t);
    while (box.children.length > 3) box.firstChild.remove();
    setTimeout(() => t.remove(), kind === "gift" ? 4200 : 2600);
  };
  UI.confirm = (title, body, yes, onYes, opts = {}) => {
    $("#cfT").textContent = title; $("#cfB").innerHTML = opts.html ? body : esc(body);
    $("#cfYes").textContent = yes; $("#cfYes").className = "btn " + (opts.green ? "green" : "red");
    $("#cfNo").hidden = !!opts.noCancel; $("#confirm").hidden = false;
    $("#cfYes").onclick = () => { $("#confirm").hidden = true; onYes && onYes(); };
    $("#cfNo").onclick = () => { $("#confirm").hidden = true; };
  };
  UI.coins = () => { const el = $("#coins"); const v = "♥ " + G.S.coins; if (el.textContent !== v) { el.textContent = v; el.classList.remove("pop"); void el.offsetWidth; el.classList.add("pop"); } };

  /* ---------- screens ---------- */
  function show(id) { ["#title", "#game", "#feedback", "#dev", "#report", "#epilogue"].forEach(s => $(s).hidden = s !== id); window.scrollTo(0, 0); }
  function route() {
    const h = location.hash.replace("#", "");
    if (h === "developer") { openDev(); return; }
    if (h === "feedback") { openFeedback(); return; }
    if (h === "play" && (G.S.story.prologue || UI.entering)) { enterGame(); if (!UI.entering) G.story.onRoom(G.room); return; }
    if (h === "report") { show("#report"); return; }
    if (h === "epilogue") { show("#epilogue"); nightScene($("#epBg"), "#epilogue", true); G.story.playEpilogue(); return; }
    show("#title"); titleAnim();
  }
  addEventListener("hashchange", route);

  /* ---------- title ---------- */
  let titleRAF = null, lit = false;
  // 밤하늘 아래 작은 픽셀 하우스 (타이틀·에필로그 공용)
  function nightScene(cv, screenSel, allLit) {
    const x = cv.getContext("2d"); x.imageSmoothingEnabled = false;
    const W = 160, H = 120;
    const stars = Array.from({ length: 46 }, (_, i) => [(i * 37) % W, (i * 23) % 70, i % 5]);
    cancelAnimationFrame(titleRAF);
    const loop = t => {
      x.fillStyle = "#141a3a"; x.fillRect(0, 0, W, H); x.fillStyle = "#1e2752"; x.fillRect(0, 40, W, 50);
      stars.forEach(([sx, sy, k]) => { x.fillStyle = (Math.floor(t / 500) + k) % 5 === 0 ? "#fff3cf" : "#9aa6d8"; x.fillRect(sx, sy, 1, 1); });
      x.fillStyle = "#fff1a8"; x.fillRect(128, 14, 8, 8); x.fillStyle = "#141a3a"; x.fillRect(131, 12, 7, 7);
      x.fillStyle = "#2b3a2a"; x.fillRect(0, 92, W, 28); x.fillStyle = "#3b4f34"; for (let i = 0; i < W; i += 6) x.fillRect(i + ((i / 6) % 2) * 2, 93, 1, 2);
      // 집
      const on = allLit || lit;
      x.fillStyle = "#3a2e3a"; x.fillRect(56, 60, 48, 33); x.fillStyle = "#5a2a32"; for (let i = 0; i < 18; i++) x.fillRect(52 + i, 60 - i, 56 - i * 2, 1);
      x.fillStyle = "#2a1e22"; x.fillRect(90, 38, 6, 12);
      const win = (wx, wy, l) => { x.fillStyle = l ? "#ffd36a" : "#232846"; x.fillRect(wx, wy, 10, 8); x.fillStyle = l ? "#fff1a8" : "#2e3458"; x.fillRect(wx + 1, wy + 1, 4, 3); x.fillStyle = "#3a2e3a"; x.fillRect(wx + 5, wy, 1, 8); x.fillRect(wx, wy + 4, 10, 1); };
      win(61, 68, true); win(89, 68, on); x.fillStyle = on ? "#c98d55" : "#4a2a22"; x.fillRect(76, 76, 9, 17); x.fillStyle = "#ffd84a"; x.fillRect(83, 84, 1, 1);
      if (on) { x.fillStyle = "rgba(255,210,110,.12)"; x.fillRect(50, 62, 60, 40); x.fillStyle = "#ffd36a"; x.fillRect(74, 93, 13, 2); }
      // 창문 속 두 사람 실루엣
      if (on) { x.fillStyle = "#3a2418"; x.fillRect(91, 71, 2, 3); x.fillRect(95, 70, 2, 4); }
      x.fillStyle = "#2a3a5a"; x.fillRect(20, 76, 12, 17); x.fillStyle = "#3b4f34"; x.fillRect(14, 66, 24, 14); x.fillRect(122, 70, 20, 12); x.fillStyle = "#2a1e22"; x.fillRect(130, 82, 3, 11);
      if (!$(screenSel).hidden) titleRAF = requestAnimationFrame(loop);
    };
    titleRAF = requestAnimationFrame(loop);
  }
  function titleAnim() {
    lit = false; nightScene($("#titleBg"), "#title", false);
    const seen = G.S.story.prologue;
    $("#titleNote").textContent = seen && G.S.savedAt ? `지난번 저장: ${new Date(G.S.savedAt).toLocaleString("ko-KR", { month: "numeric", day: "numeric", hour: "2-digit", minute: "2-digit" })}` : "";
    $("#titleNote").hidden = !$("#titleNote").textContent;
    $("#startBtn").textContent = seen ? "다시 2032년으로" : "미래로 들어가기";
  }
  $("#startBtn").onclick = async () => {
    if (G.S.settings.music) G.music.set(true);
    $("#startBtn").disabled = true; lit = true; G.sfx && G.sfx("mode");
    await new Promise(r => setTimeout(r, 900));
    $("#startBtn").disabled = false;
    const first = !G.S.story.prologue;
    if (first) { $("#cine").hidden = false; $("#cine").innerHTML = ""; }
    UI.entering = true;
    if (location.hash !== "#play") { location.hash = "play"; await new Promise(r => setTimeout(r, 30)); } else enterGame();
    UI.entering = false;
    if (first) { await G.story.prologue(false); showHelp(); }
    else G.story.onRoom(G.room);
  };

  /* ---------- game ---------- */
  let gameReady = false;
  function enterGame() {
    show("#game"); cancelAnimationFrame(titleRAF);
    if (!gameReady) { gameReady = true; buildStatic(); requestAnimationFrame(loop); }
    resize(); UI.refreshAll();
  }
  function buildStatic() {
    $("#roomTabs").innerHTML = ROOMS.map((r, i) => `<button data-room="${r.id}">${r.name}<small style="display:none">${i + 1}</small></button>`).join("");
    $$("#roomTabs button").forEach(b => b.onclick = () => setRoom(b.dataset.room));
    $("#rbEdit").onclick = () => setMode("edit"); $("#rbLive").onclick = () => setMode("live");
    $("#rbReset").onclick = () => E().resetRoom(); $("#rbSave").onclick = () => doSave(true);
    $("#nightBtn").onclick = () => { G.S.settings.night = !G.S.settings.night; UI.refreshTop(); G.dirty(); };
    $("#musicBtn").onclick = () => { G.S.settings.music = !G.S.settings.music; G.music.set(G.S.settings.music); UI.refreshTop(); G.dirty(); };
    $("#menuBtn").onclick = openMenu;
    $("#toFeedback").onclick = () => location.hash = "feedback";
    $("#autoLife").onchange = e => { G.S.settings.autoLife = e.target.checked; G.dirty(); };
    $("#gridToggle").onchange = e => { G.S.settings.grid = e.target.checked; G.dirty(); };
    // edit tools
    $$("#tools [data-t]").forEach(b => b.onclick = () => ({ undo: E().undo, redo: E().redoAct, rotate: E().rotate, copy: E().copy, front: () => E().layer(1), back: () => E().layer(-1), store: E().store, remove: E().remove })[b.dataset.t]());
    $("#cats").innerHTML = [{ id: "all", name: "전체" }, { id: "storage", name: "보관함" }, ...CATEGORIES].map(c => `<button data-cat="${c.id}">${c.name}</button>`).join("");
    $$("#cats button").forEach(b => b.onclick = () => { cat = b.dataset.cat; UI.refreshCatalog(); });
    $("#wallChips").innerHTML = WALLPAPERS.map(w => `<button class="sw" data-wall="${w.id}" title="${w.name}" style="background:linear-gradient(90deg,${w.a} 50%,${w.b} 50%)"></button>`).join("");
    $("#floorChips").innerHTML = FLOORS.map(f => `<button class="sw" data-floor="${f.id}" title="${f.name}" style="background:linear-gradient(${f.a} 50%,${f.b} 50%)"></button>`).join("");
    $$("[data-wall]").forEach(b => b.onclick = () => { E().setStyle("wall", b.dataset.wall); UI.refreshEdit(); });
    $$("[data-floor]").forEach(b => b.onclick = () => { E().setStyle("floor", b.dataset.floor); UI.refreshEdit(); });
    // live
    $("#duoList").innerHTML = DUO_ACTIONS.map(d => `<button class="chip" data-duo="${d.id}">${d.label}</button>`).join("");
    $$("[data-duo]").forEach(b => b.onclick = () => L().duo(b.dataset.duo));
    $("#runBtn").onclick = () => { L().input.run = L().input.run ? 0 : 1; $("#runBtn").classList.toggle("on", !!L().input.run); };
    $("#useBtn").onclick = useNearest;
    // dpad
    $$("#dpad button").forEach(b => {
      const k = b.dataset.k;
      const on = e => { e.preventDefault(); L().input[k] = 1; b.classList.add("held"); b.setPointerCapture && b.setPointerCapture(e.pointerId); };
      const off = () => { L().input[k] = 0; b.classList.remove("held"); };
      b.addEventListener("pointerdown", on); b.addEventListener("pointerup", off); b.addEventListener("pointercancel", off); b.addEventListener("lostpointercapture", off);
    });
    $("#dayBtn").onclick = () => G.story.runDay();
    $("#storyBtn").onclick = () => G.story.openSheet();
    $("#reportBtn").onclick = () => G.story.openReport();
    initPointer();
    addEventListener("resize", resize);
    new ResizeObserver(resize).observe($("#stage"));
  }

  function setRoom(id, internal) {
    if (id === G.room) return;
    if (G.story.active && !internal) return UI.toast("이야기가 끝나면 이동할 수 있어요", "info");
    L().persist(); G.room = id; G.S.lastRoom = id; E().sel = null; E().drag = null; E().preview = null; catSel = null; focusUid = null;
    L().enterRoom(); G.dirty(); UI.refreshAll(); G.sfx && G.sfx("blip");
    if (!internal) G.story.onRoom(id);
  }
  function setMode(m, silent) {
    if (G.mode === m) return;
    if (G.story.active && !silent) return UI.toast("이야기가 끝나면 바꿀 수 있어요", "info");
    G.mode = m;
    if (m === "edit") { L().stopAll(true); Object.values(L().chars).forEach(c => { c.follow = false; }); }
    else { E().sel = null; E().drag = null; E().preview = null; catSel = null; L().ensureFree(); }
    G.sfx && G.sfx("mode"); UI.refreshAll();
    if (!silent) UI.toast(m === "edit" ? "꾸미기 모드: 가구를 끌어 옮기고, 카탈로그에서 새 가구를 놓아요. 캐릭터는 잠시 멈춰요" : "플레이 모드: 캐릭터를 움직이고 가구를 사용해요", "info");
  }
  UI.setMode = setMode; UI.setRoom = setRoom;

  /* ---------- canvas sizing & pointer ---------- */
  function resize() {
    if ($("#game").hidden) return;
    const stage = $("#stage"); const avail = stage.clientWidth - 12;
    const dpr = window.devicePixelRatio || 1;
    // 큰 화면은 정수 배율(선명), 작은 화면은 폭에 꽉 차게
    let k = avail * dpr / G.RW;
    if (k >= 4 * dpr || !isTouch) k = Math.max(1, Math.floor(k));
    const maxH = (window.innerHeight - 200) * dpr; if (!isTouch && k * G.RH > maxH) k = Math.max(1, Math.floor(maxH / G.RH));
    view.width = Math.round(G.RW * k); view.height = Math.round(G.RH * k);
    view.style.width = (G.RW * k / dpr) + "px"; view.style.height = (G.RH * k / dpr) + "px";
    scale = k / dpr;
  }
  function toRoom(e) { const r = view.getBoundingClientRect(); return [(e.clientX - r.left) / r.width * G.RW, (e.clientY - r.top) / r.height * G.RH]; }
  function initPointer() {
    let down = null;
    view.addEventListener("pointerdown", e => {
      if (G.story.active) return;
      const [x, y] = toRoom(e); down = { x, y, id: e.pointerId, moved: false };
      view.setPointerCapture(e.pointerId);
      if (G.mode === "edit") { E().down(x, y); UI.refreshEdit(); }
    });
    view.addEventListener("pointermove", e => {
      if (!down || e.pointerId !== down.id) return; const [x, y] = toRoom(e);
      if (Math.hypot(x - down.x, y - down.y) > 3) down.moved = true;
      if (G.mode === "edit") E().move(x, y);
    });
    const up = e => {
      if (!down || e.pointerId !== down.id) return; const [x, y] = toRoom(e);
      if (G.mode === "edit") { E().up(); UI.refreshEdit(); }
      else if (!down.moved) L().click(x, y);
      down = null;
    };
    view.addEventListener("pointerup", up); view.addEventListener("pointercancel", () => { if (G.mode === "edit" && E().drag) { E().drag = null; } down = null; });
  }

  /* ---------- keyboard ---------- */
  const KEYMAP = { ArrowUp: "up", KeyW: "up", ArrowDown: "down", KeyS: "down", ArrowLeft: "left", KeyA: "left", ArrowRight: "right", KeyD: "right" };
  addEventListener("keydown", e => {
    if ($("#game").hidden || G.story.active || /INPUT|TEXTAREA|SELECT/.test(document.activeElement.tagName) || !$("#dress").hidden || !$("#menu").hidden || !$("#confirm").hidden) return;
    if (e.code.startsWith("Digit") && +e.key >= 1 && +e.key <= 4) { setRoom(ROOMS[+e.key - 1].id); return; }
    if (G.mode === "live") {
      if (KEYMAP[e.code]) { L().input[KEYMAP[e.code]] = 1; e.preventDefault(); focusUid = null; }
      if (e.key === "Shift") L().input.run = 1;
      if (e.code === "KeyE" || e.code === "Space" || e.code === "Enter") { e.preventDefault(); useNearest(); }
      if (e.key === "Escape") { L().stop(L().ctrl()); focusUid = null; }
      if (e.key === "Tab") { e.preventDefault(); L().setControl(L().partner(L().ctrl()).id); }
    } else {
      const k = e.key.toLowerCase();
      if ((e.ctrlKey || e.metaKey) && k === "z") { e.preventDefault(); e.shiftKey ? E().redoAct() : E().undo(); return; }
      if ((e.ctrlKey || e.metaKey) && k === "y") { e.preventDefault(); E().redoAct(); return; }
      if (k === "r") E().rotate();
      if (k === "c" && !e.ctrlKey && !e.metaKey) E().copy();
      if (e.key === "Delete" || e.key === "Backspace") { e.preventDefault(); E().remove(); }
      if (e.key === "Escape") { E().select(null); }
    }
  });
  addEventListener("keyup", e => { if (KEYMAP[e.code]) L().input[KEYMAP[e.code]] = 0; if (e.key === "Shift" && !$("#runBtn").classList.contains("on")) L().input.run = 0; });
  addEventListener("blur", () => { const I = L().input; I.up = I.down = I.left = I.right = 0; });

  function useNearest() {
    if (G.mode !== "live") return;
    const c = L().ctrl();
    if (c.act) { L().stop(c); return; }
    const f = focusUid && G.findItem(focusUid);
    const it = f || L().nearby(c)[0];
    if (!it) return UI.toast("가까이에 사용할 수 있는 가구가 없어요", "info");
    L().start(c, it, G.def(it).actions[0]);
  }

  /* ---------- live panel ---------- */
  const actLabel = (it, aid) => { const A = ACTIONS[aid]; if (A.toggleLabel) return A.toggleLabel[it.state.on ? 1 : 0]; if (aid === "type" && it.id === "laptop") return "노트북 사용하기"; return A.label; };
  const stopLabel = c => { const a = c.act; if (!a) return ""; if (a.place && a.place.lie) return "일어나기"; if (a.place && a.place.legs === "sit") return "일어서기"; return "그만하기"; };
  const statusOf = c => { if (c.act && !c.act.custom) { const it = G.findItem(c.act.uid); return it ? `${G.def(it).name} · ${ACTIONS[c.act.aid].label}` : ""; } if (c.path) return "이동 중"; if (c.follow) return "따라가는 중"; return "쉬는 중"; };
  UI.showItemActions = (it) => { focusUid = it ? it.uid : null; focusUntil = G.t + 9000; UI.refreshLive(true); };
  let liveSig = "";
  UI.refreshLive = (force) => {
    if (!G.S || G.mode !== "live") return;
    const c = L().ctrl(); const near = L().nearby(c).slice(0, 4);
    const f = focusUid && G.findItem(focusUid);
    if (f && !near.includes(f)) near.unshift(f);
    const sig = [G.S.control, near.map(i => i.uid + JSON.stringify(i.state)).join(), c.act ? c.act.aid + c.act.uid : "", L().partner(c).follow, L().partner(c).act ? 1 : 0, statusOf(L().chars.geon), statusOf(L().chars.chan)].join("|");
    if (!force && sig === liveSig) return; liveSig = sig;
    $("#whoRow").innerHTML = ["geon", "chan"].map(id => `<button data-who="${id}" class="${G.S.control === id ? "on" : ""}"><canvas data-por="${id}" width="24" height="26" class="px"></canvas><span><b>${esc(G.S.story.names[id])}</b><small>${G.S.control === id ? "조작 중 · " : ""}${esc(statusOf(L().chars[id]))}</small></span></button>`).join("");
    $$("[data-por]").forEach(cv => { const x = cv.getContext("2d"); x.drawImage(CharSprites.render(cv.dataset.por, G.S.chars[cv.dataset.por].look, { dir: "down", face: "happy" }), 0, 0); });
    $$("[data-who]").forEach(b => b.onclick = () => L().setControl(b.dataset.who));
    let h = "";
    if (c.act && !c.act.custom) h += `<div class="actrow"><b>${esc(statusOf(c))}</b><div class="chips"><button class="chip stop" data-stop="1">${stopLabel(c)}</button></div></div>`;
    if (!near.length && !c.act) h += `<div class="muted">가구 가까이 가거나 가구를 눌러 보세요.</div>`;
    near.forEach(it => { const d = G.def(it); h += `<div class="actrow"><b>${esc(d.name)}${f === it ? " ✦" : ""}</b><div class="chips">${d.actions.map(a => `<button class="chip" data-use="${it.uid}" data-aid="${a}">${esc(actLabel(it, a))}</button>`).join("")}</div></div>`; });
    $("#actList").innerHTML = h;
    $$("[data-use]").forEach(b => b.onclick = () => { const it = G.findItem(b.dataset.use); if (it) L().start(L().ctrl(), it, b.dataset.aid); });
    $$("[data-stop]").forEach(b => b.onclick = () => L().stop(L().ctrl()));
    $$("[data-duo]").forEach(b => { b.classList.toggle("on", b.dataset.duo === "follow" && L().partner(c).follow); });
    $("#autoLife").checked = !!G.S.settings.autoLife;
  };

  /* ---------- overlay (bubbles, floating buttons) ---------- */
  const overlay = $("#overlay"); const bubbles = {}; let floatEl = null, floatSig = "";
  function overlayPos(x, y) { const r = view.getBoundingClientRect(), s = $("#stage").getBoundingClientRect(); return [r.left - s.left + x / G.RW * r.width, r.top - s.top + y / G.RH * r.height]; }
  function updateOverlay() {
    Object.values(L().chars).forEach(c => {
      let b = bubbles[c.id];
      if (c.bubble && G.t < c.bubble.until) {
        if (!b) { b = bubbles[c.id] = document.createElement("div"); b.className = "bubble"; overlay.appendChild(b); }
        if (b.textContent !== c.bubble.text) b.textContent = c.bubble.text;
        const hx = c.pose.lie ? c.pose.lie.x : c.x, hy = c.pose.lie ? c.pose.lie.y - 8 : c.y - (c.pose.legs === "sit" ? 26 : 30);
        const [x, y] = overlayPos(hx, hy); const sw = $("#stage").clientWidth, bw = b.offsetWidth; b.style.left = Math.max(bw / 2 + 4, Math.min(sw - bw / 2 - 4, x)) + "px"; b.style.top = Math.max(b.offsetHeight + 4, y) + "px";
      } else if (b) { b.remove(); delete bubbles[c.id]; }
    });
    // 떠 있는 상호작용 버튼
    let sig = "", html = "", pos = null;
    if (G.mode === "live" && !G.story.active) {
      const c = L().ctrl();
      if (focusUid && G.t > focusUntil && !c.path) focusUid = null;
      if (c.act && !c.act.custom) {
        sig = "stop" + c.act.aid + stopLabel(c);
        html = `<button class="stop" data-fstop="1">${stopLabel(c)}</button>`;
        const hx = c.act.place.lie ? c.act.place.lie.x : c.x, hy = c.act.place.lie ? c.act.place.lie.y - 12 : c.y - 34;
        pos = [hx, hy - (c.bubble && G.t < c.bubble.until ? 18 : 0)];
      } else if (!c.path || focusUid) {
        const f = focusUid && G.findItem(focusUid);
        const it = f || (!c.moving ? L().nearby(c)[0] : null);
        if (it) {
          const d = G.def(it); const R = G.spriteRect(it);
          sig = it.uid + d.actions.map(a => actLabel(it, a)).join();
          html = d.actions.slice(0, 3).map(a => `<button data-fuse="${it.uid}" data-aid="${a}">${esc(actLabel(it, a))}</button>`).join("");
          pos = [R.x + R.w / 2, Math.max(14, R.y - 2)];
        }
      }
    }
    if (sig !== floatSig) {
      floatSig = sig; if (floatEl) { floatEl.remove(); floatEl = null; }
      if (html) {
        floatEl = document.createElement("div"); floatEl.className = "float"; floatEl.innerHTML = html; overlay.appendChild(floatEl);
        floatEl.querySelectorAll("[data-fuse]").forEach(b => b.onclick = e => { e.stopPropagation(); const it = G.findItem(b.dataset.fuse); if (it) { focusUid = null; L().start(L().ctrl(), it, b.dataset.aid); } });
        floatEl.querySelectorAll("[data-fstop]").forEach(b => b.onclick = e => { e.stopPropagation(); L().stop(L().ctrl()); });
      }
    }
    if (floatEl && pos) {
      const [x, y] = overlayPos(pos[0], pos[1]); const sw = $("#stage").clientWidth;
      const w = floatEl.offsetWidth; floatEl.style.left = Math.max(w / 2 + 4, Math.min(sw - w / 2 - 4, x)) + "px"; floatEl.style.top = Math.max(floatEl.offsetHeight + 4, y) + "px";
    }
  }

  /* ---------- edit panel ---------- */
  UI.refreshEdit = () => {
    if (!G.S || G.mode !== "edit") return;
    const it = E().sel && G.findItem(E().sel);
    $$("#tools .sel").forEach(b => b.disabled = !it);
    $("#tools [data-t=undo]").disabled = !E().canUndo(); $("#tools [data-t=redo]").disabled = !E().canRedo();
    if (it) { const d = G.def(it); const f = G.fp(it); $("#selInfo").innerHTML = `<b>${esc(d.name)}</b> 선택됨 · ${f.w}×${f.h}칸${d.rots.length > 1 ? " · 회전 가능" : ""}<br><span class="muted">끌어서 옮기기 · 빨간색이면 놓을 수 없는 자리예요</span>`; }
    else $("#selInfo").innerHTML = "가구를 눌러 선택하고, 끌어서 옮기세요. 새 가구는 아래 카탈로그에서 골라요.";
    const room = G.S.rooms[G.room];
    $$("[data-wall]").forEach(b => b.classList.toggle("on", b.dataset.wall === room.wall));
    $$("[data-floor]").forEach(b => b.classList.toggle("on", b.dataset.floor === room.floor));
    $("#gridToggle").checked = !!G.S.settings.grid;
  };
  UI.refreshCatalog = () => {
    if (!G.S) return;
    $$("#cats button").forEach(b => b.classList.toggle("on", b.dataset.cat === cat));
    let list = ITEMS.slice();
    if (cat === "storage") list = list.filter(d => G.S.storage[d.id] > 0);
    else if (cat !== "all") list = list.filter(d => d.cat === cat);
    list.sort((a, b) => (b.rooms.includes(G.room) - a.rooms.includes(G.room)) || ((G.S.storage[b.id] > 0) - (G.S.storage[a.id] > 0)));
    const inv = $("#inv");
    inv.innerHTML = list.length ? list.map(d => { const n = G.S.storage[d.id] || 0; const lock = !G.isUnlocked(d); const no = !d.rooms.includes(G.room); return `<button class="slot ${lock ? "lock" : ""} ${no ? "no" : ""} ${catSel === d.id ? "on" : ""}" data-slot="${d.id}" title="${esc(d.name)}">${!n && !lock && d.price ? `<span class="pr">♥${d.price}</span>` : ""}<canvas data-ic="${d.id}"></canvas>${n ? `<span class="n">×${n}</span>` : ""}${lock ? `<span class="pr">🔒</span>` : ""}</button>`; }).join("") : `<div class="muted" style="grid-column:1/-1;color:#fff6dc;padding:8px">보관함이 비어 있어요</div>`;
    inv.querySelectorAll("[data-ic]").forEach(cv => { const src = ItemSprites.icon(ITEM_BY_ID[cv.dataset.ic]); cv.width = src.width; cv.height = src.height; cv.getContext("2d").drawImage(src, 0, 0); const s = Math.min(48 / src.width, 48 / src.height, 3); cv.style.width = src.width * s + "px"; cv.style.height = src.height * s + "px"; });
    inv.querySelectorAll("[data-slot]").forEach(b => b.onclick = () => { catSel = catSel === b.dataset.slot ? null : b.dataset.slot; UI.refreshCatalog(); });
    renderCard();
  };
  function renderCard() {
    const card = $("#itemCard");
    if (!catSel || G.mode !== "edit") { card.hidden = true; E().preview = null; return; }
    const d = ITEM_BY_ID[catSel]; const n = G.S.storage[d.id] || 0; const lock = !G.isUnlocked(d); const roomOk = d.rooms.includes(G.room);
    const roomsTxt = d.rooms.map(r => ROOMS.find(x => x.id === r).name).join(", ");
    let btns = "";
    if (lock) btns = `<span class="muted">🔒 획득 조건: ${esc(d.unlock.text)}</span>`;
    else {
      if (n > 0) btns += `<button class="btn green small" data-c="place" ${roomOk ? "" : "disabled"}>배치하기</button>`;
      if (d.price) btns += `<button class="btn small" data-c="${n > 0 ? "buy" : "buyplace"}" ${G.S.coins < d.price ? "disabled" : ""}>${n > 0 ? "하나 더 사기" : "사서 배치"} ♥${d.price}</button>`;
      if (!n && !d.price) btns += `<span class="muted">보관함에 없어요</span>`;
    }
    card.innerHTML = `<div class="ch"><canvas id="cardIc"></canvas><div><h4>${esc(d.name)}</h4><div class="meta">${CATEGORIES.find(c => c.id === d.cat).name} · ${d.w}×${d.h}칸 · 보관함 ${n}개${d.rots.length > 1 ? " · 회전 가능" : ""}</div></div></div>
      <p>${esc(d.desc)}</p>
      <div class="meta">설치 가능: ${roomsTxt}${roomOk ? "" : " <b style='color:#a8382e'>(이 방에는 못 놓아요)</b>"}<br>할 수 있는 행동: ${d.actions.length ? d.actions.map(a => ACTIONS[a].label).join(", ") : "장식용"}${d.layer === "top" ? "<br>책상·테이블 위나 빈 바닥에 놓을 수 있어요" : d.layer === "wall" || d.layer === "curtain" ? "<br>벽에 걸어요" : ""}</div>
      <div class="acts">${btns}</div>`;
    const src = ItemSprites.icon(d); const cv = $("#cardIc"); cv.width = src.width; cv.height = src.height; cv.getContext("2d").drawImage(src, 0, 0); cv.style.objectFit = "contain";
    card.hidden = false;
    E().preview = roomOk && !lock ? E().validSpots(d.id) : null;
    card.querySelectorAll("[data-c]").forEach(b => b.onclick = () => {
      const k = b.dataset.c;
      if (k === "place") { E().place(d.id); catSel = null; UI.refreshCatalog(); }
      if (k === "buy") E().buy(d.id);
      if (k === "buyplace") E().buy(d.id, () => { if (roomOk) E().place(d.id); else UI.toast(`구매 완료! ${roomsTxt}에서 놓을 수 있어요`, "info"); catSel = null; UI.refreshCatalog(); });
    });
  }

  /* ---------- top / all ---------- */
  UI.refreshTop = () => {
    const b = $("#modeBadge"); b.textContent = G.mode === "edit" ? "EDIT · 꾸미기" : "LIVE · 생활"; b.classList.toggle("edit", G.mode === "edit");
    $("#nightBtn").textContent = G.S.settings.night ? "☾" : "☀"; $("#nightBtn").classList.toggle("on", G.S.settings.night);
    $("#musicBtn").classList.toggle("on", !!G.S.settings.music);
    $("#rbEdit").classList.toggle("on", G.mode === "edit"); $("#rbLive").classList.toggle("on", G.mode === "live");
    $$("#roomTabs button").forEach(b => b.classList.toggle("on", b.dataset.room === G.room));
    $("#livePanel").hidden = G.mode !== "live"; $("#editPanel").hidden = G.mode !== "edit"; $("#livePad").style.visibility = G.mode === "live" ? "visible" : "hidden"; document.body.classList.toggle("editing", G.mode === "edit"); setTimeout(resize, 0);
    view.style.cursor = G.mode === "edit" ? "grab" : "pointer";
    UI.coins();
  };
  UI.refreshAll = () => { UI.refreshTop(); UI.refreshLive(true); UI.refreshEdit(); UI.refreshCatalog(); G.story.refreshBar(); };
  UI.showHelp = () => showHelp();

  /* ---------- menu ---------- */
  function openMenu() {
    $("#setMusic").checked = !!G.S.settings.music; $("#setVol").value = G.S.settings.volume; $("#setSfx").checked = !!G.S.settings.sfx;
    $("#menu").hidden = false;
  }
  $("#menu").addEventListener("click", e => { if (e.target.id === "menu") $("#menu").hidden = true; });
  $("#setMusic").onchange = e => { G.S.settings.music = e.target.checked; G.music.set(e.target.checked); UI.refreshTop(); G.dirty(); };
  $("#setVol").oninput = e => { G.S.settings.volume = +e.target.value; G.music.volume(+e.target.value); G.dirty(); };
  $("#setSfx").onchange = e => { G.S.settings.sfx = e.target.checked; G.dirty(); };
  $$("[data-m]").forEach(b => b.onclick = () => {
    const m = b.dataset.m; $("#menu").hidden = true;
    if (m === "dress") UI.openDressup(G.S.control);
    if (m === "help") showHelp();
    if (m === "feedback") location.hash = "feedback";
    if (m === "title") { doSave(false); location.hash = ""; route(); }
    if (m === "wipe") UI.confirm("정말 처음부터 다시 할까요?", "꾸민 방, 모은 ♥, 캐릭터 옷이 모두 처음 상태로 돌아가요. 피드백 기록은 지워지지 않아요.", "처음부터", () => { SaveStore.reset(); location.hash = ""; location.reload(); });
  });
  function showHelp() {
    const touch = isTouch;
    UI.confirm("조작법", `<b>LIVE · 생활 모드</b><br>${touch ? "왼쪽 방향 패드로 이동, 달리기 버튼으로 뛰기. 바닥을 누르면 그 자리로 걸어가요." : "방향키·WASD 이동, Shift 달리기, 바닥 클릭으로 이동."}<br>가구에 다가가거나 가구를 누르면 노란 버튼이 떠요. 누르면 캐릭터가 가서 직접 사용해요.<br>${touch ? "" : "E 사용 · Esc 그만하기 · Tab 캐릭터 바꾸기 · 1~4 방 이동<br>"}<br><b>EDIT · 꾸미기 모드</b><br>가구를 눌러 선택하고 끌어서 옮겨요. 회전·복사·앞뒤 순서·보관·삭제는 패널 버튼으로.${touch ? "" : " (R 회전, C 복사, Delete 삭제, Ctrl+Z 취소)"}<br>카탈로그에서 새 가구를 사서 놓아요. ♥는 생활하면 모여요.<br><br>진행은 자동 저장돼요.`, "알겠어요", null, { html: true, green: true, noCancel: true });
  }

  /* ---------- dress-up ---------- */
  let dressId = "chan", dressCb = null, dressRAF = null;
  UI.openDressup = (id, cb) => { dressId = id; dressCb = cb || null; $("#dress").hidden = false; renderDress(); animDress(); };
  function closeDress() { $("#dress").hidden = true; cancelAnimationFrame(dressRAF); const cb = dressCb; dressCb = null; cb && cb(); L() && UI.refreshLive(true); }
  $("#dDone").onclick = closeDress;
  $("#dress").addEventListener("click", e => { if (e.target.id === "dress") closeDress(); });
  $("#dReset").onclick = () => { G.S.chars[dressId].look = Object.assign({}, CHAR_DATA.DEFAULT_LOOKS[dressId]); G.dirty(); renderDress(); };
  function renderDress() {
    const D = CHAR_DATA, look = G.S.chars[dressId].look;
    $("#dTabs").innerHTML = D.CHARS.map(c => `<button data-dt="${c.id}" class="${c.id === dressId ? "on" : ""}">${esc(G.S.story.names[c.id])} <small>(${c.label})</small></button>`).join("");
    $$("[data-dt]").forEach(b => b.onclick = () => { dressId = b.dataset.dt; renderDress(); });
    $("#dName").textContent = G.S.story.names[dressId];
    const chipRow = (key, list) => `<div class="chips">${list.map(o => `<button class="chip ${look[key] === o.id ? "on" : ""}" data-lk="${key}" data-lv="${o.id}">${esc(o.name)}</button>`).join("")}</div>`;
    const swRow = (key, list, col) => `<div class="chips">${list.map(o => `<button class="sw ${look[key] === o.id ? "on" : ""}" data-lk="${key}" data-lv="${o.id}" title="${esc(o.name)}" style="background:${col(o)}"></button>`).join("")}</div>`;
    $("#dOpts").innerHTML = `<div class="sect-h">이름 (대화창에 표시돼요)</div><input class="field" id="dNameIn" maxlength="10" value="${esc(G.S.story.names[dressId])}">
      <div class="sect-h">머리 모양</div>${chipRow("hair", D.HAIR_STYLES)}
      <div class="sect-h">머리 색</div>${swRow("hairColor", D.HAIR_COLORS, o => o.c)}
      <div class="sect-h">상의</div>${chipRow("top", D.TOP_STYLES)}${swRow("topColor", D.COLORS, o => `linear-gradient(135deg,${o.l} 60%,${o.d} 60%)`)}
      <div class="sect-h">하의</div>${swRow("bottom", D.BOTTOMS, o => o.c)}
      <div class="sect-h">신발</div>${swRow("shoes", D.SHOES, o => o.c)}
      <div class="sect-h">액세서리</div>${chipRow("acc", D.ACCESSORIES)}`;
    $$("[data-lk]").forEach(b => b.onclick = () => { look[b.dataset.lk] = b.dataset.lv; G.dirty(); renderDress(); });
    $("#dNameIn").oninput = e => { const v = e.target.value.trim(); G.S.story.names[dressId] = v || (dressId === "geon" ? "건주" : "찬슬"); $("#dName").textContent = G.S.story.names[dressId]; G.dirty(); };
  }
  function animDress() {
    const cv = $("#dPrev"), x = cv.getContext("2d"); x.imageSmoothingEnabled = false;
    cancelAnimationFrame(dressRAF);
    const loop = t => {
      if ($("#dress").hidden) return;
      const dirs = ["down", "left", "up", "right"]; const dir = dirs[Math.floor(t / 1600) % 4]; const k = Math.floor(t / 180) % 2;
      x.clearRect(0, 0, 96, 104);
      x.drawImage(CharSprites.render(dressId, G.S.chars[dressId].look, { dir, legs: k ? "walkA" : "walkB", arms: k ? "swingA" : "swingB" }), 0, 0, 96, 104);
      dressRAF = requestAnimationFrame(loop);
    };
    dressRAF = requestAnimationFrame(loop);
  }

  /* ---------- feedback ---------- */
  const RATINGS = [[5, "⭐⭐⭐⭐⭐ 최고예요!"], [4, "⭐⭐⭐⭐ 재미있었어요!"], [3, "⭐⭐⭐ 괜찮았어요!"], [2, "⭐⭐ 조금 아쉬워요."], [1, "⭐ 더 개선하면 좋겠어요!"]];
  let rating = null;
  function openFeedback() {
    show("#feedback"); $("#fbForm").hidden = false; $("#fbDone").hidden = true; $("#fbErr").textContent = "";
    $("#fbRating").innerHTML = RATINGS.map(([v, t]) => `<button type="button" data-r="${v}" class="${rating === v ? "on" : ""}">${t}</button>`).join("");
    $$("[data-r]").forEach(b => b.onclick = () => { rating = rating === +b.dataset.r ? null : +b.dataset.r; $$("[data-r]").forEach(x => x.classList.toggle("on", +x.dataset.r === rating)); });
  }
  const backToGame = () => { location.hash = "play"; };
  $("#fbBack").onclick = backToGame; $("#fbAgain").onclick = backToGame;
  $("#fbForm").onsubmit = async e => {
    e.preventDefault();
    const msg = $("#fbMsg").value.trim();
    if (!msg) { $("#fbErr").textContent = "피드백 내용을 한 줄이라도 적어 주세요."; $("#fbMsg").focus(); return; }
    $("#fbSend").disabled = true;
    let r;
    try { r = await FeedbackStore.submit({ name: $("#fbName").value, message: msg, rating }); }
    catch (err) { $("#fbErr").textContent = "저장하지 못했어요. 다시 시도해 주세요."; $("#fbSend").disabled = false; return; }
    $("#fbSend").disabled = false;
    $("#fbForm").hidden = true; $("#fbDone").hidden = false;
    if (r.delivered) { $("#fbDoneT").textContent = "피드백이 무사히 도착했습니다!"; $("#fbDoneB").textContent = "이 세계를 함께 즐겨줘서 고마워요."; }
    else if (r.saved) { $("#fbDoneT").textContent = "피드백을 잘 받아 적었어요!"; $("#fbDoneB").textContent = "이 세계를 함께 즐겨줘서 고마워요. " + (r.remoteConfigured ? "지금은 전송이 안 돼서 이 기기에 먼저 보관해 뒀어요." : "아직 전송 서버가 연결되지 않아서, 이 기기에 날짜·시간과 함께 보관해 뒀어요."); }
    else { $("#fbDoneT").textContent = "저장 공간이 부족해요"; $("#fbDoneB").textContent = "아래 메일 버튼으로 보내 주세요."; }
    const mail = FeedbackStore.mailtoLink(r.entry); $("#fbMail").hidden = !mail; if (mail) $("#fbMail").href = mail;
    const art = $("#doneArt"); art.innerHTML = "";
    for (let i = 0; i < 14; i++) { const s = document.createElement("span"); s.textContent = i % 3 ? "♥" : "★"; s.style.left = (6 + Math.random() * 88) + "%"; s.style.color = i % 3 ? "#ff6f8c" : "#f4c542"; s.style.animationDelay = (Math.random() * 2) + "s"; art.appendChild(s); }
    $("#fbMsg").value = ""; $("#fbName").value = ""; rating = null;
  };

  /* ---------- developer inbox ---------- */
  let devOpen = false;
  function openDev() {
    show("#dev"); $("#devLock").hidden = devOpen; $("#devBody").hidden = !devOpen; if (devOpen) renderDev(); else setTimeout(() => $("#devPin").focus(), 50);
  }
  $("#devForm").onsubmit = e => { e.preventDefault(); if ($("#devPin").value === String(CONFIG.DEV_PIN)) { devOpen = true; $("#devPin").value = ""; openDev(); } else $("#devErr").textContent = "비밀번호가 달라요"; };
  let devItems = [];
  async function renderDev() {
    $("#devCount").textContent = "불러오는 중…";
    const r = await FeedbackStore.listAll(); const list = devItems = r.items;
    $("#devCount").textContent = `피드백 ${list.length}개${r.remote ? " (공유 저장소 포함)" : ""}`;
    $("#devList").innerHTML = list.length ? list.map(f => `<div class="fbitem"><div class="fh"><b>${esc(f.name || "익명")}</b><span>${new Date(f.createdAt).toLocaleString("ko-KR")}</span>${f.rating ? `<span>${"★".repeat(f.rating)}${"☆".repeat(5 - f.rating)}</span>` : ""}<span>${f.remote ? "전달됨" : f.delivered ? "서버 전송됨" : "이 기기 저장"}</span><span class="spacer"></span>${f.remote && window.claude ? "" : `<button class="btn small ghost" data-del="${f.id}">삭제</button>`}</div><p>${esc(f.message)}</p></div>`).join("") : `<p class="muted">아직 피드백이 없어요.</p>`;
    $$("[data-del]").forEach(b => b.onclick = () => { FeedbackStore.remove(b.dataset.del); setTimeout(renderDev, 400); });
  }
  function exportText(name, obj) {
    const text = JSON.stringify(obj, null, 2);
    try { const blob = new Blob([text], { type: "application/json" }); const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = name; document.body.appendChild(a); a.click(); a.remove(); } catch (e) { }
    // 다운로드가 막힌 환경(아티팩트 미리보기 등)을 위해 복사용 상자도 보여줘요
    let box = $("#devJson"); if (!box) { box = document.createElement("textarea"); box.id = "devJson"; box.className = "field"; box.rows = 8; box.readOnly = true; $("#devBody").appendChild(box); }
    box.value = text; box.focus(); box.select();
    UI.toast("JSON을 내보냈어요. 다운로드가 안 되면 아래 상자에서 복사하세요", "info");
  }
  $("#devExport").onclick = () => exportText("2032-feedback-" + new Date().toISOString().slice(0, 10) + ".json", { exportedAt: new Date().toISOString(), count: devItems.length, feedback: devItems });
  $("#devSaveExport").onclick = () => { L().persist(); exportText("2032-save-" + new Date().toISOString().slice(0, 10) + ".json", { save: G.S, feedback: FeedbackStore.list() }); };
  $("#devClear").onclick = () => UI.confirm("피드백을 모두 지울까요?", "이 기기에 저장된 피드백이 모두 사라져요. 먼저 JSON으로 내보내 두세요.", "모두 지우기", () => { FeedbackStore.clear(); renderDev(); });
  $("#devBack").onclick = () => { location.hash = "play"; };

  $("#rpBack").onclick = () => { location.hash = "play"; };
  $("#rpNext").onclick = () => G.story.openEpilogue();
  $("#epHome").onclick = () => { location.hash = "play"; };
  $("#epDev").onclick = () => { location.hash = "feedback"; };

  /* ---------- main loop ---------- */
  let last = performance.now(), uiTick = 0;
  function loop(ts) {
    const dt = Math.min(50, ts - last); last = ts;
    if (!$("#game").hidden) {
      G.t += dt;
      // 식물은 하루가 지나면 목말라요
      if (Math.floor(G.t / 5000) !== Math.floor((G.t - dt) / 5000)) G.items().forEach(it => { if ((it.id === "plant" || it.id === "flowerpot") && !it.state.dry && Date.now() - (it.state.watered || 0) > 24 * 3600 * 1000) { it.state.dry = true; } });
      L().update(dt);
      G.render.frame(dt, view);
      updateOverlay();
      if ((uiTick += dt) > 250) { uiTick = 0; UI.refreshLive(); }
    }
    requestAnimationFrame(loop);
  }

  /* ---------- boot ---------- */
  function boot() {
    try { if (window.self !== window.top) document.body.classList.add("embedded"); } catch (e) { document.body.classList.add("embedded"); }
    G.S = SaveStore.load();
    G.room = G.S.lastRoom; G.mode = "live";
    // 처음 설치 시 식물 물 준 시간 기록
    Object.values(G.S.rooms).forEach(r => r.items.forEach(it => { if ((it.id === "plant" || it.id === "flowerpot") && !it.state.watered) it.state.watered = Date.now(); }));
    L().init();
    const st = SaveStore.status();
    if (st === "restored") setTimeout(() => UI.toast("저장 데이터가 손상되어 바로 전 백업으로 복구했어요", "warn"), 400);
    if (st === "reset") setTimeout(() => UI.toast("저장 데이터를 읽을 수 없어서 처음 상태로 시작해요", "warn"), 400);
    document.fonts && document.fonts.load("12px Galmuri11");
    route();
    if (G.S.settings.music) { const kick = () => { G.music.set(true); removeEventListener("pointerdown", kick); }; addEventListener("pointerdown", kick); }
  }
  boot();
})(window.G);
