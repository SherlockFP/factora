import { createAudioJuice } from './audio_juice.js';

let failed = 0;
const ok = (cond, name) => {
  if (cond) console.log('PASS ' + name);
  else { failed++; console.log('FAIL ' + name); }
};

function fakeCtx() {
  const oscs = [];
  const gains = [];
  const param = (v) => ({
    value: v,
    setValueAtTime(x) { this.value = x; },
    exponentialRampToValueAtTime(x) { this.value = x; },
  });
  const node = () => ({ connect(n) { return n; }, start() {}, stop() {} });
  return {
    state: 'running',
    currentTime: 0,
    destination: {},
    oscs,
    gains,
    createOscillator() {
      const o = Object.assign(node(), { type: 'sine', frequency: param(440) });
      oscs.push(o);
      return o;
    },
    createGain() {
      const g = Object.assign(node(), { gain: param(1) });
      gains.push(g);
      return g;
    },
  };
}

{
  const c = fakeCtx();
  const j = createAudioJuice(c);
  let threw = null;
  try {
    j.coinStreak(10);
    j.comboBreak(4);
    j.levelUp(3);
    j.vipArrive();
    j.patienceWarn();
    j.rebirth();
    j.achievement();
    j.setMuted(true);
    j.setMuted(false);
    j.update(0.016);
  } catch (e) { threw = e; }
  ok(!threw, 'all methods run without throwing');
  ok(c.gains[0] && c.gains[0].gain.value === 0.25, 'master gain is 0.25');
}

{
  const c = fakeCtx();
  const j = createAudioJuice(c);
  const freqs = [];
  for (let i = 0; i < 5; i++) {
    c.currentTime += 0.1;
    const before = c.oscs.length;
    j.coinStreak(5);
    freqs.push(c.oscs[before].frequency.value);
  }
  ok(freqs[0] === 660, 'coinStreak starts at 660 Hz');
  ok(freqs.every((f, i) => i === 0 || f > freqs[i - 1]), 'coinStreak pitch rises across 5 calls');
}

{
  const c = fakeCtx();
  const j = createAudioJuice(c);
  const before = c.oscs.length;
  j.patienceWarn();
  c.currentTime = 0.1;
  j.patienceWarn();
  c.currentTime = 0.249;
  j.patienceWarn();
  c.currentTime = 0.25;
  j.patienceWarn();
  ok(c.oscs.length - before === 2, 'patienceWarn throttled to 1 per 250ms');
}

{
  const j = createAudioJuice(null);
  let threw = null;
  try {
    j.coinStreak(1);
    j.comboBreak(1);
    j.levelUp(1);
    j.vipArrive();
    j.patienceWarn();
    j.rebirth();
    j.achievement();
    j.setMuted(true);
    j.update(0.016);
  } catch (e) { threw = e; }
  ok(!threw, 'null audioCtx safe');
}

{
  const c = fakeCtx();
  c.state = 'suspended';
  const j = createAudioJuice(c);
  let threw = null;
  try { j.coinStreak(1); j.levelUp(1); j.vipArrive(); j.patienceWarn(); } catch (e) { threw = e; }
  ok(!threw && c.oscs.length === 0, 'suspended audioCtx no-ops');
}

{
  const c = fakeCtx();
  c.state = 'closed';
  const j = createAudioJuice(c);
  let threw = null;
  try { j.coinStreak(1); j.rebirth(); } catch (e) { threw = e; }
  ok(!threw && c.oscs.length === 0, 'closed audioCtx no-ops');
}

console.log(failed ? failed + ' FAILED' : 'ALL PASS');
process.exitCode = failed ? 1 : 0;
