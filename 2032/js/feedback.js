/* =========================================================
   FEEDBACK — 피드백 저장 모듈 (독립 모듈)
   지금은 브라우저 localStorage에 저장해요.
   CONFIG.FEEDBACK.ENDPOINT를 채우면 같은 내용을 서버로도 POST 해요.
   다른 저장소(Firebase, Supabase 등)를 붙이려면 RemoteAdapter.send만 바꾸면 돼요.
   ========================================================= */
window.FeedbackStore = (function () {
  const KEY = () => CONFIG.FEEDBACK_KEY;
  function read() {
    try { const v = JSON.parse(localStorage.getItem(KEY()) || "[]"); return Array.isArray(v) ? v.filter(x => x && typeof x.message === "string") : []; }
    catch (e) { return []; }
  }
  function write(list) {
    try { localStorage.setItem(KEY(), JSON.stringify(list)); return true; } catch (e) { return false; }
  }
  // ① claude.ai 아티팩트로 열었을 때: 아티팩트 공유 저장소(db)에 저장 → 주인(개발자)이 #developer에서 확인
  let dbP = null;
  const getDb = () => {
    if (!window.claude || typeof window.claude.use !== "function") return Promise.resolve(null);
    if (!dbP) dbP = Promise.all([window.claude.use("db"), window.claude.use("user")]).then(([db, user]) => db && user ? { db, user } : null).catch(() => null);
    return dbP;
  };
  const ArtifactAdapter = {
    async available() { return !!(await getDb()); },
    async send(entry) {
      const h = await getDb(); if (!h) throw new Error("no db");
      const id = await h.user.id(); const ref = h.db.doc("feedback/" + id);
      let prev = []; try { const snap = await ref.get(); const d = snap && (typeof snap.data === "function" ? snap.data() : snap); prev = (d && d.entries) || []; } catch (e) { }
      await ref.set({ entries: prev.concat([entry]).slice(-30), updatedAt: entry.createdAt });
      return true;
    },
    async list() {
      const h = await getDb(); if (!h) return null;
      try {
        const snap = await h.db.collection("feedback").get();
        const docs = snap.docs ? snap.docs.map(d => (typeof d.data === "function" ? d.data() : d)) : (Array.isArray(snap) ? snap.map(d => d.data || d) : []);
        return docs.flatMap(d => (d && d.entries) || []).map(e => Object.assign({}, e, { delivered: true, remote: true }));
      } catch (e) { return null; }
    }
  };
  // ② GitHub(합천 사이트 안)에서: 합천 사이트와 같은 Supabase kv 테이블에 저장
  const SB = () => CONFIG.SUPABASE && CONFIG.SUPABASE.URL && CONFIG.SUPABASE.KEY ? CONFIG.SUPABASE : null;
  const sbHeaders = () => ({ apikey: SB().KEY, Authorization: "Bearer " + SB().KEY, "Content-Type": "application/json" });
  const SupabaseAdapter = {
    enabled: () => !!SB() && !(window.claude && window.claude.use),
    async send(entry) {
      const res = await fetch(SB().URL + "/rest/v1/kv", { method: "POST", headers: Object.assign(sbHeaders(), { Prefer: "resolution=merge-duplicates,return=minimal" }), body: JSON.stringify({ key: "2032/feedback/" + entry.id, data: entry }) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return true;
    },
    async list() {
      if (!SupabaseAdapter.enabled()) return null;
      try {
        const res = await fetch(SB().URL + "/rest/v1/kv?select=data&key=like." + encodeURIComponent("2032/feedback/*"), { headers: sbHeaders() });
        if (!res.ok) return null;
        return (await res.json()).map(r => Object.assign({}, r.data, { delivered: true, remote: true }));
      } catch (e) { return null; }
    },
    async remove(id) { try { await fetch(SB().URL + "/rest/v1/kv?key=eq." + encodeURIComponent("2032/feedback/" + id), { method: "DELETE", headers: sbHeaders() }); } catch (e) { } }
  };
  // ③ 그 밖의 곳: CONFIG.FEEDBACK.ENDPOINT로 POST
  const EndpointAdapter = {
    enabled: () => !!(CONFIG.FEEDBACK && CONFIG.FEEDBACK.ENDPOINT),
    async send(entry) {
      const res = await fetch(CONFIG.FEEDBACK.ENDPOINT, { method: "POST", headers: { "Content-Type": "text/plain;charset=utf-8" }, body: JSON.stringify(entry) });
      if (!res.ok) throw new Error("HTTP " + res.status);
      return true;
    }
  };
  const RemoteAdapter = {
    enabled: () => EndpointAdapter.enabled() || SupabaseAdapter.enabled() || !!(window.claude && window.claude.use),
    async send(entry) {
      if (await ArtifactAdapter.available()) return ArtifactAdapter.send(entry);
      if (SupabaseAdapter.enabled()) return SupabaseAdapter.send(entry);
      if (EndpointAdapter.enabled()) return EndpointAdapter.send(entry);
      throw new Error("no remote");
    }
  };
  async function submit({ name, message, rating }) {
    const entry = {
      id: "fb_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
      name: (name || "").trim().slice(0, 40),
      message: String(message || "").trim().slice(0, 3000),
      rating: rating ? Number(rating) : null,
      createdAt: new Date().toISOString(),
      delivered: false
    };
    if (!entry.message) throw new Error("empty");
    const list = read(); list.push(entry);
    const saved = write(list);
    let delivered = false;
    if (RemoteAdapter.enabled()) {
      try { await RemoteAdapter.send(entry); delivered = true; entry.delivered = true; write(list); } catch (e) { delivered = false; }
    }
    return { entry, saved, delivered, remoteConfigured: RemoteAdapter.enabled() };
  }
  function list() { return read().sort((a, b) => b.createdAt.localeCompare(a.createdAt)); }
  function remove(id) { write(read().filter(x => x.id !== id)); if (SupabaseAdapter.enabled()) SupabaseAdapter.remove(id); }
  function clear() { write([]); }
  function exportJSON() {
    const blob = new Blob([JSON.stringify({ exportedAt: new Date().toISOString(), count: read().length, feedback: list() }, null, 2)], { type: "application/json" });
    const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "2032-feedback-" + new Date().toISOString().slice(0, 10) + ".json"; a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  }
  function mailtoLink(entry) {
    const to = CONFIG.FEEDBACK && CONFIG.FEEDBACK.DEVELOPER_EMAIL; if (!to) return "";
    const stars = entry.rating ? "★".repeat(entry.rating) + "\n" : "";
    return "mailto:" + encodeURIComponent(to) + "?subject=" + encodeURIComponent("[2032] 개발자에게 한 마디" + (entry.name ? " - " + entry.name : "")) + "&body=" + encodeURIComponent(stars + entry.message + "\n\n" + new Date(entry.createdAt).toLocaleString("ko-KR"));
  }
  async function listAll() {
    const local = list(); const remote = (await ArtifactAdapter.list()) || (await SupabaseAdapter.list());
    if (!remote) return { items: local, remote: false };
    const seen = new Set(remote.map(r => r.id));
    return { items: remote.concat(local.filter(l => !seen.has(l.id))).sort((a, b) => b.createdAt.localeCompare(a.createdAt)), remote: true };
  }
  return { submit, list, listAll, remove, clear, exportJSON, mailtoLink, RemoteAdapter };
})();
