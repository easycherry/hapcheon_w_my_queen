/* =========================================================
   AUDIO — 직접 합성하는 8비트 배경음악과 효과음 (외부 음원 없음)
   ========================================================= */
(function (G) {
  let ac = null, master = null, musicGain = null, timer = null, step = 0, nextAt = 0;
  const ensure = () => {
    if (ac) return ac;
    const AC = window.AudioContext || window.webkitAudioContext; if (!AC) return null;
    ac = new AC(); master = ac.createGain(); master.gain.value = 0.5; master.connect(ac.destination);
    musicGain = ac.createGain(); musicGain.gain.value = 0; musicGain.connect(master);
    return ac;
  };
  const N = n => 440 * Math.pow(2, (n - 69) / 12);
  function tone(freq, t, dur, type, gainNode, vol) {
    const o = ac.createOscillator(), g = ac.createGain();
    o.type = type; o.frequency.value = freq; g.gain.setValueAtTime(vol, t); g.gain.exponentialRampToValueAtTime(0.0008, t + dur);
    o.connect(g); g.connect(gainNode); o.start(t); o.stop(t + dur + 0.02);
  }
  // 따뜻한 동네 느낌 멜로디 (C major, 16분음표 32스텝 × 4마디)
  const MEL = [72, 0, 76, 0, 79, 0, 76, 77, 76, 0, 74, 0, 72, 0, 0, 0, 69, 0, 72, 0, 74, 0, 72, 74, 76, 0, 79, 0, 77, 0, 0, 0,
    72, 0, 76, 0, 79, 0, 81, 79, 77, 0, 76, 0, 74, 0, 0, 0, 71, 0, 74, 0, 77, 0, 76, 74, 72, 0, 0, 0, 0, 0, 0, 0];
  const BASS = [48, 55, 52, 55, 45, 52, 48, 52, 41, 48, 45, 48, 43, 50, 47, 50];
  const SPB = 60 / 104 / 2; // 8분음표 길이
  function schedule() {
    if (!ac) return;
    while (nextAt < ac.currentTime + 0.25) {
      const m = MEL[step % MEL.length]; if (m) tone(N(m), nextAt, SPB * 1.6, "square", musicGain, 0.05);
      if (step % 4 === 0) tone(N(BASS[(step / 4) % BASS.length]), nextAt, SPB * 3.2, "triangle", musicGain, 0.12);
      if (step % 8 === 4) tone(N(84), nextAt, 0.04, "square", musicGain, 0.012);
      step++; nextAt += SPB;
    }
  }
  G.music = {
    set(on) {
      if (on) {
        if (!ensure()) return; if (ac.state === "suspended") ac.resume();
        musicGain.gain.cancelScheduledValues(ac.currentTime); musicGain.gain.linearRampToValueAtTime(G.S.settings.volume, ac.currentTime + 0.4);
        if (!timer) { nextAt = ac.currentTime + 0.1; timer = setInterval(schedule, 90); }
      } else if (ac) { musicGain.gain.linearRampToValueAtTime(0, ac.currentTime + 0.3); setTimeout(() => { if (!G.S.settings.music) { clearInterval(timer); timer = null; } }, 400); }
    },
    volume(v) { if (ac && G.S.settings.music) musicGain.gain.linearRampToValueAtTime(v, ac.currentTime + 0.1); }
  };
  G.sfx = (kind) => {
    if (!G.S || !G.S.settings.sfx) return; if (!ensure()) return; if (ac.state === "suspended") ac.resume();
    const t = ac.currentTime;
    if (kind === "blip") tone(N(84), t, 0.06, "square", master, 0.04);
    if (kind === "coin") { tone(N(88), t, 0.07, "square", master, 0.05); tone(N(95), t + 0.07, 0.12, "square", master, 0.05); }
    if (kind === "place") { tone(N(60), t, 0.08, "triangle", master, 0.2); tone(N(67), t + 0.05, 0.08, "triangle", master, 0.15); }
    if (kind === "nope") { tone(N(50), t, 0.12, "square", master, 0.05); tone(N(46), t + 0.1, 0.16, "square", master, 0.05); }
    if (kind === "clap") { tone(N(96), t, 0.05, "square", master, 0.06); tone(N(100), t + 0.04, 0.08, "square", master, 0.05); }
    if (kind === "mode") tone(N(76), t, 0.1, "triangle", master, 0.15);
  };
})(window.G);
