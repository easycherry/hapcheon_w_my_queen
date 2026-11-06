/* =========================================================
   STORY ENGINE — 대화창, 타이틀 카드, 프롤로그, 방 소개, 오늘의 일상,
                  가구 배치·사용 이야기, 미래 생활 보고서, 에필로그
   ========================================================= */
(function (G) {
  const $ = s => document.querySelector(s);
  const esc = s => String(s).replace(/[&<>"']/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
  const St = G.story = { active: false, busy: false };
  const S = () => G.S.story;
  const L = () => G.live;
  const wait = ms => new Promise(r => setTimeout(r, ms));
  const names = () => S().names;

  /* ---------- 진행 상태 ---------- */
  St.progress = () => {
    const s = S();
    const rooms = ROOMS.filter(r => s.rooms[r.id]).length;
    const slots = STORY.SLOTS.filter(x => s.slots[x.id]).length;
    const daily = Object.keys(s.daily).length;
    const roomEps = Object.keys(s.roomEps).length;
    const placed = Object.keys(s.placed).length;
    const ch1 = rooms >= 4, ch2 = slots >= 6, ch3 = placed >= 1 && roomEps >= 3;
    let cur = "ch1"; if (ch1) cur = "ch2"; if (ch1 && ch2) cur = "ch3"; if (ch1 && ch2 && ch3) cur = "ch4"; if (s.report) cur = "epilogue";
    return { rooms, slots, daily, roomEps, placed, ch1, ch2, ch3, reportReady: ch1 && ch2 && ch3, cur };
  };
  St.dailyUnlocked = () => St.progress().ch1;

  /* ---------- 대화창 ---------- */
  const dlg = $("#dlg"), dName = $("#dlgName"), dText = $("#dlgText"), dPor = $("#dlgPor");
  let advance = null, typing = null, skipAll = false;
  function speaker(code) {
    if (code === "g") return { name: names().geon, cls: "g", id: "geon" };
    if (code === "c") return { name: names().chan, cls: "c", id: "chan" };
    if (code === "s") return { name: "SYSTEM", cls: "s" };
    return { name: "", cls: "n" };
  }
  function typeLine(text) {
    return new Promise(res => {
      let i = 0; dText.textContent = "";
      clearInterval(typing);
      typing = setInterval(() => { i += 1; dText.textContent = text.slice(0, i); if (i >= text.length) { clearInterval(typing); typing = null; } }, 26);
      advance = () => {
        if (typing) { clearInterval(typing); typing = null; dText.textContent = text; return; }
        advance = null; res();
      };
    });
  }
  function charOf(code) { return code === "g" ? L().chars.geon : L().chars.chan; }
  St.dialog = async (lines, o = {}) => {
    dlg.hidden = false; dlg.classList.toggle("small", !!o.small);
    $("#dlgSkip").hidden = !o.skippable;
    skipAll = false;
    for (const ln of lines) {
      if (skipAll) break;
      if (Array.isArray(ln)) {
        const [k, a, b, c] = ln;
        if (k === "do") { const it = G.items().find(x => x.id === c && G.def(x).actions.includes(b)); if (it) L().start(charOf(a), it, b); }
        if (k === "stop") L().stop(charOf(a), { silent: true });
        if (k === "duo") { const keep = G.S.control; G.S.control = "chan"; L().duo(a); G.S.control = keep; await wait(1800); }
        if (k === "wait") await wait(a);
        continue;
      }
      const code = ln[0], text = ln.slice(2);
      const sp = speaker(code);
      // 캐릭터가 방 아래쪽에 있으면 대화창을 위로 올려서 가리지 않게
      const ys = Object.values(L().chars).map(c => c.pose && c.pose.lie ? c.pose.lie.y : c.y);
      const low = ys.some(y => y > G.RH * 0.56);
      dlg.className = "dlg " + sp.cls + (o.small ? " small" : "") + (low ? " top" : "");
      dName.textContent = sp.name; dName.hidden = !sp.name;
      if (sp.id) { dPor.hidden = false; const x = dPor.getContext("2d"); x.clearRect(0, 0, 24, 26); x.drawImage(CharSprites.render(sp.id, G.S.chars[sp.id].look, { dir: "down", face: /[!?…]|ㅋ|좋|사랑|맛있/.test(text) ? "happy" : "normal" }), 0, 0); const c = charOf(code); c.blinkAt = G.t; }
      else dPor.hidden = true;
      if (sp.id) { const c = charOf(code); c.talkUntil = G.t + 1200; }
      await typeLine(text);
    }
    dlg.hidden = true; advance = null;
  };
  dlg.addEventListener("click", e => { if (e.target.closest("#dlgSkip")) return; advance && advance(); });
  $("#dlgSkip").onclick = e => { e.stopPropagation(); skipAll = true; St.skipDay = true; advance && advance(); advance && advance(); };
  addEventListener("keydown", e => {
    if (dlg.hidden || !advance) return;
    if (e.code === "Space" || e.code === "Enter" || e.code === "KeyE") { e.preventDefault(); e.stopImmediatePropagation(); advance(); }
  }, true);

  /* ---------- 타이틀 카드 ---------- */
  St.card = (big, small, ms = 1700, o = {}) => new Promise(res => {
    const c = $("#card"); c.innerHTML = `${o.kicker ? `<div class="k">${esc(o.kicker)}</div>` : ""}<div class="b">${esc(big)}</div>${small ? `<div class="s">${esc(small)}</div>` : ""}`;
    c.className = "card-ov" + (o.dark ? " dark" : ""); c.hidden = false;
    let done = false; const fin = () => { if (done) return; done = true; c.hidden = true; res(); };
    c.onclick = fin; setTimeout(fin, ms);
  });

  /* ---------- 공통: 이야기 모드 진입/종료 ---------- */
  async function begin() {
    St.active = true; document.body.classList.add("story");
    if (G.mode !== "live") G.ui.setMode("live", true);
    L().stopAll(true); Object.values(L().chars).forEach(c => { c.follow = false; });
    St.prevNight = G.S.settings.night;
  }
  function finish() {
    St.active = false; document.body.classList.remove("story");
    G.S.settings.night = St.prevNight; G.ui.refreshAll(); St.refreshBar(); G.dirty();
  }

  /* ---------- 에피소드 실행 ---------- */
  function hasItems(ep) { const items = G.S.rooms[ep.room].items; return ep.acts.every(([, aid, id]) => items.some(i => i.id === id && ITEM_BY_ID[id].actions.includes(aid))); }
  St.playEpisode = async (ep, o = {}) => {
    if (ep.room !== G.room) G.ui.setRoom(ep.room, true);
    L().stopAll(true); L().enterRoom();
    G.S.settings.night = o.night !== undefined ? o.night : (STORY.SLOTS.find(s => s.id === ep.slot) || {}).night || false;
    G.ui.refreshTop();
    await St.card(ep.time, ep.title, 1600, { kicker: o.kicker });
    for (const [who, aid, id] of ep.acts) {
      const it = G.items().find(i => i.id === id && G.def(i).actions.includes(aid));
      if (it) L().start(charOf(who), it, aid, { instant: true });
    }
    await wait(350);
    await St.dialog(ep.lines, { skippable: o.skippable });
    S().daily[ep.id] = true; S().slots[ep.slot] = true;
    G.S.stats.episodes = Object.keys(S().daily).length;
    G.dirty();
  };

  /* ---------- CHAPTER 2: 오늘의 일상 ---------- */
  function pick(slotId) {
    const all = STORY.DAILY.filter(e => e.slot === slotId);
    let pool = all.filter(hasItems); if (!pool.length) pool = all;
    const unseen = pool.filter(e => !S().daily[e.id]);
    const from = unseen.length ? unseen : pool;
    return from[Math.floor(Math.random() * from.length)];
  }
  St.runDay = async (onlySlot) => {
    if (St.busy) return; St.busy = true;
    const startRoom = G.room;
    await begin(); St.skipDay = false;
    if (!onlySlot) await St.card("오늘의 일상", "2032년의 어느 하루", 1900, { kicker: "CHAPTER 2", dark: true });
    const slots = onlySlot ? STORY.SLOTS.filter(s => s.id === onlySlot) : STORY.SLOTS;
    for (const sl of slots) {
      if (St.skipDay) break;
      const ep = pick(sl.id);
      await St.playEpisode(ep, { kicker: sl.name, skippable: !onlySlot });
      L().stopAll(true);
    }
    if (!onlySlot && !St.skipDay) { S().days += 1; await St.card("하루 끝", "2032년의 어느 하루가 지나갔다", 2000, { dark: true }); }
    if (G.room !== startRoom) G.ui.setRoom(startRoom, true);
    L().enterRoom();
    finish(); St.busy = false;
    const p = St.progress();
    if (p.reportReady && !S().report) G.ui.confirm("미래 생활 보고서가 도착했어요", "2032년의 두 사람에 대한 생활 통계가 준비됐어요. 지금 볼까요?", "보고서 보기", () => St.openReport(), { green: true });
    else if (!p.ch3 && p.ch2) St.hint("CHAPTER 3: '꾸미기'에서 우리 집에 가구를 들이고, 플레이 모드에서 가구를 사용해 보세요.");
  };

  /* ---------- CHAPTER 1: 방 소개 ---------- */
  St.onRoom = async (roomId) => {
    if (!G.S || S().rooms[roomId] || St.active || !S().prologue) return;
    S().rooms[roomId] = true; G.dirty();
    St.active = true; document.body.classList.add("story");
    const intro = STORY.ROOM_INTRO[roomId];
    await St.card(intro.title, "", 1200, { kicker: "CHAPTER 1 · 우리의 집" });
    await St.dialog(intro.lines);
    St.active = false; document.body.classList.remove("story");
    St.refreshBar();
    const p = St.progress();
    if (p.ch1 && !S().ch2Hint) { S().ch2Hint = true; G.dirty(); setTimeout(() => G.ui.confirm("CHAPTER 2 · 오늘의 일상", "네 개의 방을 모두 둘러봤어요. 이제 2032년의 어느 하루를 아침부터 잠들기 전까지 따라가 볼까요?", "오늘의 일상 시작", () => St.runDay(), { green: true }), 400); }
    else if (!p.ch1) St.hint(`다른 방도 둘러보세요 (${p.rooms}/4)`);
  };

  /* ---------- 가구 사용 → 방 에피소드 ---------- */
  St.onAction = (c, it, aid) => {
    if (St.active || !G.S || c !== L().ctrl()) return;
    const ep = STORY.ROOM_EPS.find(e => e.room === G.room && e.items.includes(it.id) && e.acts.includes(aid) && !S().roomEps[e.id]);
    if (!ep) return;
    S().roomEps[ep.id] = true; G.dirty();
    setTimeout(async () => { if (St.active) return; St.active = true; document.body.classList.add("story", "soft"); await St.dialog(ep.lines, { small: true }); St.active = false; document.body.classList.remove("story", "soft"); St.refreshBar(); }, 700);
  };

  /* ---------- 가구 배치 (CHAPTER 3) ---------- */
  const josa = (w, a, b) => { const ch = w.charCodeAt(w.length - 1); if (ch < 0xac00 || ch > 0xd7a3) return w + a; return w + ((ch - 0xac00) % 28 ? a : b); };
  St.onPlace = (it) => {
    if (!G.S) return;
    const d = G.def(it); const room = ROOMS.find(r => r.id === G.room).name;
    const first = !S().placed[d.id]; S().placed[d.id] = (S().placed[d.id] || 0) + 1; G.dirty();
    if (!first || St.active) return;
    const lines = [`s:${room}에 새로운 ${josa(d.name, "이", "가")} 생겼다.`, "n:" + (STORY.PLACE[d.id] || "우리 집이 조금 더 우리다워졌다.")];
    St.dialog(lines, { small: true }).then(() => St.refreshBar());
  };

  /* ---------- 힌트 & 스토리 바 ---------- */
  St.hint = (t) => G.ui.toast(t, "gift");
  St.refreshBar = () => {
    if (!G.S || !$("#chapTxt")) return;
    const p = St.progress(); const C = STORY.CHAPTERS.find(c => c.id === p.cur);
    let goal = "";
    if (p.cur === "ch1") goal = `방 둘러보기 ${p.rooms}/4`;
    if (p.cur === "ch2") goal = `오늘의 일상 시간대 ${p.slots}/6`;
    if (p.cur === "ch3") goal = `가구 들이기 ${Math.min(p.placed, 1)}/1 · 가구 이야기 ${Math.min(p.roomEps, 3)}/3`;
    if (p.cur === "ch4") goal = "미래 생활 보고서가 도착했어요";
    if (p.cur === "epilogue") goal = "이야기는 계속돼요";
    $("#chapTxt").innerHTML = `<b>${C.name}</b> ${esc(C.title)}<small>${esc(goal)}</small>`;
    const db = $("#dayBtn"); db.disabled = !p.ch1; db.title = p.ch1 ? "" : "네 개의 방을 먼저 둘러보세요";
    $("#reportBtn").hidden = !p.reportReady;
  };

  /* ---------- 이야기 시트 ---------- */
  St.openSheet = () => {
    const p = St.progress(); const s = S();
    const row = (c, state, body) => `<div class="chrow ${state}"><div class="chh"><b>${c.name}</b> ${esc(c.title)}<span class="st">${state === "done" ? "완료" : state === "now" ? "진행 중" : "잠김"}</span></div>${body || ""}</div>`;
    const st = (ok, now) => ok ? "done" : now ? "now" : "lock";
    let h = "";
    h += row(STORY.CHAPTERS[0], "done", `<div class="chips"><button class="chip" data-sx="prologue">프롤로그 다시 보기</button></div>`);
    h += row(STORY.CHAPTERS[1], st(p.ch1, true), `<div class="muted">방 둘러보기 ${p.rooms}/4 · 가구 이야기 ${p.roomEps}/${STORY.ROOM_EPS.length}</div><div class="chips">${ROOMS.map(r => `<button class="chip ${s.rooms[r.id] ? "on" : ""}" data-sroom="${r.id}">${r.name}${s.rooms[r.id] ? " ✓" : ""}</button>`).join("")}</div>`);
    h += row(STORY.CHAPTERS[2], st(p.ch2, p.ch1), `<div class="muted">시간대 ${p.slots}/6 · 본 에피소드 ${p.daily}/${STORY.DAILY.length} · 보낸 하루 ${s.days}일</div><div class="chips"><button class="chip on" data-sx="day" ${p.ch1 ? "" : "disabled"}>하루 전체 보기 ▶</button>${STORY.SLOTS.map(sl => `<button class="chip" data-slot1="${sl.id}" ${p.ch1 ? "" : "disabled"}>${sl.name}${s.slots[sl.id] ? " ✓" : ""}</button>`).join("")}</div>`);
    h += row(STORY.CHAPTERS[3], st(p.ch3, p.ch1 && p.ch2), `<div class="muted">새로 들인 가구 ${p.placed}종 · 가구 이야기 ${p.roomEps}개<br>'꾸미기'에서 가구를 놓고, 플레이 모드에서 가구를 처음 쓰면 이야기가 나와요.</div>`);
    h += row(STORY.CHAPTERS[4], st(s.report, p.reportReady), `<div class="chips"><button class="chip" data-sx="report" ${p.reportReady ? "" : "disabled"}>보고서 보기</button></div>`);
    h += row(STORY.CHAPTERS[5], st(s.epilogue, s.report), `<div class="chips"><button class="chip" data-sx="epilogue" ${s.report ? "" : "disabled"}>에필로그 보기</button></div>`);
    $("#storyBody").innerHTML = h; $("#storySheet").hidden = false;
    document.querySelectorAll("[data-sx]").forEach(b => b.onclick = () => { $("#storySheet").hidden = true; const k = b.dataset.sx; if (k === "prologue") St.prologue(true); if (k === "day") St.runDay(); if (k === "report") St.openReport(); if (k === "epilogue") St.openEpilogue(); });
    document.querySelectorAll("[data-slot1]").forEach(b => b.onclick = () => { $("#storySheet").hidden = true; St.runDay(b.dataset.slot1); });
    document.querySelectorAll("[data-sroom]").forEach(b => b.onclick = () => { $("#storySheet").hidden = true; G.ui.setRoom(b.dataset.sroom); });
  };
  $("#storyClose").onclick = () => $("#storySheet").hidden = true;
  $("#storySheet").addEventListener("click", e => { if (e.target.id === "storySheet") $("#storySheet").hidden = true; });

  /* ---------- PROLOGUE ---------- */
  St.prologue = async (replay) => {
    const cine = $("#cine"); cine.hidden = false; cine.innerHTML = ""; cine.classList.remove("out");
    for (const t of STORY.PROLOGUE) {
      const p = document.createElement("p"); cine.appendChild(p);
      for (let i = 1; i <= t.length; i++) { p.textContent = t.slice(0, i); await wait(55); }
      await wait(900);
    }
    await wait(700);
    cine.classList.add("out"); await wait(700); cine.hidden = true;
    if (!S().prologue) { S().prologue = true; G.dirty(); }
    if (!replay) {
      // 캐릭터 등장
      const c = L().chars; const t1 = G.nearestFree(6, 10), t2 = G.nearestFree(7, 10, null, (x, y) => t1 && x === t1[0] && y === t1[1]);
      if (t1) { const p = G.tileFeet(t1[0], t1[1]); c.geon.x = p.x; c.geon.y = p.y; }
      if (t2) { const p = G.tileFeet(t2[0], t2[1]); c.chan.x = p.x; c.chan.y = p.y; }
      const g1 = G.nearestFree(6, 7), g2 = G.nearestFree(7, 7, null, (x, y) => g1 && x === g1[0] && y === g1[1]);
      if (g1) L().walkTo(c.geon, g1[0], g1[1], () => { c.geon.dir = "right"; }); if (g2) L().walkTo(c.chan, g2[0], g2[1], () => { c.chan.dir = "left"; });
      await wait(1500);
      await St.onRoom(G.room);
    }
  };

  /* ---------- CHAPTER 4: 보고서 ---------- */
  St.openReport = () => {
    const s = S(), st = G.S.stats;
    const furn = Object.values(G.S.rooms).reduce((n, r) => n + r.items.length, 0);
    $("#rpStats").innerHTML = STORY.REPORT.stats.map(([k, v]) => `<div class="rp"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
    $("#rpPlay").innerHTML = [["함께 지나간 2032년의 하루", `${s.days}일`], ["함께 본 일상 에피소드", `${Object.keys(s.daily).length}개`], ["집 안에서 함께한 생활 행동", `${st.actions || 0}번`], ["포옹", `${st.hug || 0}번`], ["하이파이브", `${st.highfive || 0}번`], ["우리 집에 놓인 가구", `${furn}개`]].map(([k, v]) => `<div class="rp small"><span>${esc(k)}</span><b>${esc(v)}</b></div>`).join("");
    $("#rpEnd").innerHTML = STORY.REPORT.ending.map(t => `<p>${esc(t)}</p>`).join("");
    s.report = true; G.dirty();
    location.hash = "report";
  };
  /* ---------- EPILOGUE ---------- */
  St.openEpilogue = () => { S().epilogue = true; G.dirty(); location.hash = "epilogue"; };
  St.playEpilogue = async () => {
    const box = $("#epText"); box.innerHTML = ""; $("#epTbc").hidden = true; $("#epActs").hidden = true;
    for (const t of STORY.EPILOGUE) { const p = document.createElement("p"); p.className = "fadein"; p.textContent = t; box.appendChild(p); await wait(2200); }
    $("#epTbc").hidden = false; await wait(1200); $("#epActs").hidden = false;
  };
})(window.G);
