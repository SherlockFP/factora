export function createAudioJuice(audioCtx, opts = {}) {
  const ctx = audioCtx;
  const vol = typeof opts.volume === 'number' ? opts.volume : 0.25;
  const master = ctx && ctx.state !== 'closed' ? ctx.createGain() : null;
  if (master) {
    master.gain.value = vol;
    master.connect(ctx.destination);
  }

  let muted = false;
  let step = 0;
  let coinAt = -1;
  let warnAt = -1;

  const live = () => !!ctx && ctx.state === 'running' && master !== null;

  function voice(type, freq, t0, dur, level, endFreq) {
    if (!live()) return;
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = type;
    o.frequency.setValueAtTime(freq, t0);
    if (endFreq !== undefined) o.frequency.exponentialRampToValueAtTime(endFreq, t0 + dur);
    g.gain.setValueAtTime(level, t0);
    g.gain.exponentialRampToValueAtTime(0.0008, t0 + dur);
    o.connect(g).connect(master);
    o.start(t0);
    o.stop(t0 + dur + 0.02);
  }

  function coinStreak() {
    if (!live()) return;
    const t = ctx.currentTime;
    step = t - coinAt > 0.45 ? 0 : Math.min(12, step + 1);
    coinAt = t;
    voice('square', 660 + 55 * step, t, 0.07, 0.085);
  }

  function comboBreak(level) {
    const lvl = Math.min(10, Math.max(1, level || 1));
    voice('sine', 400, ctx && ctx.currentTime, 0.22, 0.06 + 0.006 * lvl, 160);
  }

  function levelUp(level) {
    const k = 1 + 0.02 * (Math.min(12, Math.max(1, level || 1)) - 1);
    const t = ctx && ctx.currentTime;
    [523, 659, 784, 1046].forEach((f, i) => voice('triangle', f * k, t + i * 0.09, 0.22, 0.11));
  }

  function vipArrive() {
    if (!live()) return;
    const t = ctx.currentTime;
    [1200, 1600].forEach((f) => {
      const o = ctx.createOscillator();
      const g = ctx.createGain();
      const lfo = ctx.createOscillator();
      const lg = ctx.createGain();
      o.type = 'sine';
      o.frequency.setValueAtTime(f, t);
      g.gain.setValueAtTime(0.06, t);
      lfo.frequency.setValueAtTime(16, t);
      lg.gain.setValueAtTime(0.05, t);
      lfo.connect(lg).connect(g.gain);
      o.connect(g).connect(master);
      g.gain.exponentialRampToValueAtTime(0.0008, t + 0.35);
      o.start(t);
      lfo.start(t);
      o.stop(t + 0.37);
      lfo.stop(t + 0.37);
    });
  }

  function patienceWarn() {
    if (!live()) return;
    const t = ctx.currentTime;
    if (t - warnAt < 0.25) return;
    warnAt = t;
    voice('sine', 880, t, 0.05, 0.06);
  }

  function rebirth() {
    if (!live()) return;
    const t = ctx.currentTime;
    voice('sawtooth', 220, t, 1.2, 0.11, 880);
    [440, 554, 659].forEach((f) => voice('triangle', f, t + 0.9, 0.95, 0.045));
  }

  function achievement() {
    const t = ctx && ctx.currentTime;
    voice('sine', 880, t, 0.18, 0.09);
    voice('sine', 1320, t + 0.1, 0.18, 0.09);
  }

  function setMuted(bool) {
    muted = !!bool;
    if (master) master.gain.setValueAtTime(muted ? 0 : vol, ctx.currentTime);
  }

  function update() {
    if (ctx && ctx.currentTime - coinAt > 0.45) step = 0;
  }

  return { coinStreak, comboBreak, levelUp, vipArrive, patienceWarn, rebirth, achievement, setMuted, update };
}
