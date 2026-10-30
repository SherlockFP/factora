/* Tatlı Tycoon — 10 tezgah için 10 farklı mini oyun.
 * DOM/THREE yok; sadece mantık. index.html çizer, bu dosya puanlar.
 * Doğrudan test:  node src/minigames.js
 */

const KINDS = ['stand', 'oven', 'icecream', 'juice', 'cake', 'donut', 'choco', 'candy', 'rainbow', 'castle'];

const clamp01 = (v) => (v < 0 ? 0 : v > 1 ? 1 : Number(v) || 0);
const isObj = (v) => v !== null && typeof v === 'object';
const gradeOf = (s) => (s >= 0.95 ? 'PERFECT' : s >= 0.7 ? 'GOOD' : s >= 0.4 ? 'OK' : 'MISS');
const labelOf = (s) => (s >= 0.95 ? 'MÜKEMMEL' : s >= 0.7 ? 'İYİ' : s >= 0.4 ? 'OLSUN' : 'KAÇTI');
const miss = () => ({ done: true, score: 0, label: 'MISS', grade: 'MISS', failed: true });
const sweep = (t, speed) => 1 - Math.abs(((t * speed) % 2) - 1);
const yOf = (ch, s) => 1 - (ch.t - s.at) / s.dur;

const payout = (score) => 0.5 + clamp01(score) * 1.5;

function mulberry32(a) {
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const DEFS = {
  stand: { name: 'Limonata Standı', tag: 'Zamanlama', dur: 3, keys: ['SPACE'], hint: 'İbreyi yeşil alanda durdur' },
  oven: { name: 'Kurabiye Fırını', tag: 'Sayma', dur: 3.5, keys: ['SPACE'], hint: 'Kurabiyeleri yanmadan dokun' },
  icecream: { name: 'Dondurma Arabası', tag: 'Katman', dur: 3.4, keys: ['SPACE'], hint: 'Toplar külahın üstündeyken dokun' },
  juice: { name: 'Meyve Suyu Barı', tag: 'Karıştır', dur: 2, keys: ['A', 'D'], hint: 'A ve D ile hızlı karıştır' },
  cake: { name: 'Pasta Atölyesi', tag: 'Süsleme', dur: 3.2, keys: ['TAP'], hint: 'Hedeflere sırayla dokun' },
  donut: { name: 'Donut Kulesi', tag: 'Dizme', dur: 3.6, keys: ['1-4'], hint: 'Sırayı hatırla, aynen diz' },
  choco: { name: 'Çikolata Fabrikası', tag: 'Sıcaklık', dur: 3.5, keys: ['HOLD'], hint: 'Basılı tut, tatlı bantta bırak' },
  candy: { name: 'Şeker Diyarı', tag: 'Eşleştir', dur: 4, keys: ['TAP'], hint: 'Aynı şekerleri eşleştir' },
  rainbow: { name: 'Gökkuşağı Kafe', tag: 'Renk sırası', dur: 3.8, keys: ['1-4'], hint: 'Yanıp sönen renkleri tekrarla' },
  castle: { name: 'Tatlı Krallığı', tag: 'Finale', dur: 4, keys: ['SPACE'], hint: 'Önce durdur, sonra tam 4 kez dokun' },
};

const BUILD = {
  stand(ch) { ch.pos = 0; ch.hitScore = 0; },
  oven(ch) { ch.cookies = [0, 1, 2].map((i) => ({ at: 0.4 + i * 0.95, win: 0.55, tapped: false })); ch.taps = 0; },
  icecream(ch) { ch.scoops = [0, 1, 2].map((i) => ({ at: 0.3 + i * 0.95, dur: 0.6, caught: false })); },
  juice(ch) { ch.alts = 0; ch.wrong = 0; ch.last = null; },
  cake(ch, rng) {
    ch.targets = [0, 1, 2, 3, 4].map((i) => ({ x: 0.15 + rng() * 0.7, y: 0.15 + rng() * 0.7, at: 0.3 + i * 0.5, win: 0.5, hit: false }));
    ch.hits = 0; ch.misses = 0;
  },
  donut(ch, rng) { ch.pattern = Array.from({ length: 4 }, () => Math.floor(rng() * 4)); ch.progress = 0; ch.wrongs = 0; ch.show = 1.2; },
  choco(ch) { ch.heat = 0; ch.holding = false; ch.released = false; ch.rel = 0; ch.band = [0.6, 0.8]; },
  candy(ch, rng) {
    const v = [0, 0, 1, 1, 2, 2];
    for (let i = v.length - 1; i > 0; i--) { const j = Math.floor(rng() * (i + 1)); [v[i], v[j]] = [v[j], v[i]]; }
    ch.cards = v; ch.matched = [false, false, false, false, false, false]; ch.first = null; ch.pairs = 0; ch.attempts = 0;
  },
  rainbow(ch, rng) { ch.sequence = Array.from({ length: 4 }, () => Math.floor(rng() * 4)); ch.progress = 0; ch.wrongs = 0; ch.show = 1.8; },
  castle(ch) { ch.pos = 0; ch.aScore = null; ch.taps = 0; ch.n = 4; },
};

const countScore = (ch) => (ch.taps === ch.n ? 1 : ch.taps < ch.n ? ch.taps / ch.n : clamp01(1 - (ch.taps - ch.n) * 0.2));
const castleScore = (ch) => (ch.aScore === null ? 0 : (ch.aScore + countScore(ch)) / 2);

const SCORE = {
  stand: (ch) => ch.hitScore,
  oven: (ch) => ch.taps / 3,
  icecream: (ch) => ch.scoops.filter((s) => s.caught).length / 3,
  juice: (ch) => clamp01(ch.alts / 6 - ch.wrong * 0.05),
  cake: (ch) => clamp01(ch.hits / 5 - ch.misses * 0.03),
  donut: (ch) => clamp01((ch.progress / 4) * (1 - Math.min(0.4, ch.wrongs * 0.1))),
  choco: (ch) => (ch.released ? ch.rel : 0),
  candy: (ch) => clamp01((ch.pairs / 3) * (1 - Math.min(0.3, ch.attempts * 0.05))),
  rainbow: (ch) => clamp01((ch.progress / 4) * (1 - Math.min(0.4, ch.wrongs * 0.1))),
  castle: castleScore,
};

const TICK = {
  stand(ch) { ch.pos = sweep(ch.t, 0.9); },
  castle(ch) {
    if (ch.t < 1.5) ch.pos = sweep(ch.t, 1.1);
    if (ch.t >= 3.6 && !ch.done) finish(ch, castleScore(ch));
  },
  choco(ch, dt) {
    if (!ch.holding) return;
    ch.heat += (Number(dt) || 0) * 0.35;
    if (ch.heat >= 1.05) finish(ch, 0.1, true);
  },
};

const PRESS = {
  stand(ch) {
    ch.hitScore = Math.abs(ch.pos - 0.5) <= 0.07 ? 1 : Math.abs(ch.pos - 0.5) <= 0.18 ? 0.72 : 0;
    return finish(ch, ch.hitScore);
  },
  oven(ch) {
    const c = ch.cookies.find((c) => !c.tapped && ch.t >= c.at && ch.t <= c.at + c.win);
    if (c) { c.tapped = true; ch.taps++; }
    return live(ch);
  },
  icecream(ch) {
    const s = ch.scoops.find((s) => !s.caught && ch.t >= s.at && yOf(ch, s) <= 0.3 && yOf(ch, s) > 0.02);
    if (s) s.caught = true;
    return live(ch);
  },
  juice(ch, input) {
    const key = typeof input === 'string' ? input : isObj(input) ? input.key : null;
    if (typeof key !== 'string') return miss();
    const k = key.toLowerCase();
    if (k !== 'a' && k !== 'd') { ch.wrong++; return live(ch); }
    if (k !== ch.last) { ch.alts++; ch.last = k; } else ch.wrong++;
    return live(ch);
  },
  cake(ch, input) {
    if (!isObj(input) || !Number.isFinite(input.x) || !Number.isFinite(input.y)) return miss();
    const tg = ch.targets.find((t) => !t.hit && ch.t >= t.at && ch.t <= t.at + t.win);
    if (tg && Math.hypot(input.x - tg.x, input.y - tg.y) <= 0.17) { tg.hit = true; ch.hits++; }
    else ch.misses++;
    return live(ch);
  },
  donut(ch, input) {
    if (!isObj(input) || !Number.isInteger(input.index)) return miss();
    if (ch.t < ch.show) return live(ch);
    const i = input.index;
    if (i < 0 || i > 3) return miss();
    if (ch.pattern[ch.progress] === i) { ch.progress++; if (ch.progress >= 4) return finish(ch, SCORE.donut(ch)); }
    else ch.wrongs++;
    return live(ch);
  },
  choco(ch, input) {
    if (!isObj(input) || typeof input.down !== 'boolean') return miss();
    if (input.down) { ch.holding = true; return live(ch); }
    if (!ch.holding) return live(ch);
    ch.holding = false; ch.released = true;
    const d = ch.heat < ch.band[0] ? ch.band[0] - ch.heat : ch.heat > ch.band[1] ? ch.heat - ch.band[1] : 0;
    ch.rel = d <= 0 ? 1 : clamp01(1 - d / 0.25) * 0.9;
    return finish(ch, ch.rel);
  },
  candy(ch, input) {
    if (!isObj(input) || !Number.isInteger(input.index)) return miss();
    const i = input.index;
    if (i < 0 || i > 5) return miss();
    if (ch.matched[i] || ch.first === i) return live(ch);
    if (ch.first === null) { ch.first = i; return live(ch); }
    const a = ch.first; ch.first = null;
    if (ch.cards[a] === ch.cards[i]) {
      ch.matched[a] = true; ch.matched[i] = true; ch.pairs++;
      if (ch.pairs >= 3) return finish(ch, SCORE.candy(ch));
    } else ch.attempts++;
    return live(ch);
  },
  rainbow(ch, input) {
    if (!isObj(input) || !Number.isInteger(input.index)) return miss();
    if (ch.t < ch.show) return live(ch);
    const i = input.index;
    if (i < 0 || i > 3) return miss();
    if (ch.sequence[ch.progress] === i) { ch.progress++; if (ch.progress >= 4) return finish(ch, SCORE.rainbow(ch)); }
    else ch.wrongs++;
    return live(ch);
  },
  castle(ch) {
    if (ch.aScore === null && ch.t < 1.5) {
      const d = Math.abs(ch.pos - 0.5);
      ch.aScore = d <= 0.05 ? 1 : d <= 0.15 ? 0.7 : 0;
      return live(ch);
    }
    ch.taps++;
    return live(ch);
  },
};

const TAP_KINDS = { stand: 1, oven: 1, icecream: 1, cake: 1, castle: 1 };

function live(ch) {
  return { done: false, score: SCORE[ch.kind](ch), label: '', grade: '', failed: false };
}

function resultOf(ch) {
  return { done: true, score: ch.score, label: ch.label, grade: gradeOf(ch.score), perfect: ch.score >= 0.95, failed: ch.failed };
}

function finish(ch, score, failed) {
  ch.done = true;
  ch.state = 'done';
  ch.score = clamp01(score);
  ch.label = labelOf(ch.score);
  ch.grade = gradeOf(ch.score);
  ch.perfect = ch.score >= 0.95;
  ch.failed = failed === undefined ? ch.score < 0.5 : !!failed;
  return resultOf(ch);
}

export function createMinigames(opts) {
  const o = opts || {};
  const baseSeed = Number.isFinite(Number(o.seed)) ? Number(o.seed) >>> 0 : 1;
  let seq = 0;

  function get(kind) {
    const d = DEFS[kind];
    return d ? { kind, ...d, payout } : null;
  }

  function start(kind, ctx) {
    const d = DEFS[kind];
    if (!d) return null;
    const c = ctx || {};
    const seed = Number.isFinite(Number(c.seed)) ? Number(c.seed) >>> 0 : (baseSeed + ++seq * 0x9E3779B1) >>> 0;
    const ch = { kind, t: 0, duration: d.dur, state: 'play', done: false, score: 0, label: '', failed: false, seed };
    BUILD[kind](ch, mulberry32(seed));
    return ch;
  }

  function press(ch, input) {
    if (!ch || typeof ch !== 'object' || ch.done) return miss();
    if (TAP_KINDS[ch.kind] && !isObj(input)) return miss();
    return PRESS[ch.kind](ch, input);
  }

  function update(ch, dt) {
    if (!ch || typeof ch !== 'object') return miss();
    if (ch.done) return resultOf(ch);
    const d = Number(dt);
    ch.t += Number.isFinite(d) && d > 0 ? d : 0;
    const tick = TICK[ch.kind];
    if (tick) tick(ch, d);
    if (!ch.done && ch.t >= ch.duration) finish(ch, SCORE[ch.kind](ch));
    return ch.done ? resultOf(ch) : live(ch);
  }

  function cancel(ch) {
    if (ch && typeof ch === 'object' && !ch.done) {
      ch.done = true;
      ch.cancelled = true;
      ch.state = 'cancelled';
      ch.score = clamp01(SCORE[ch.kind](ch));
      ch.label = labelOf(ch.score);
      ch.grade = gradeOf(ch.score);
      ch.perfect = ch.score >= 0.95;
      ch.failed = ch.score < 0.5;
      return resultOf(ch);
    }
    return null;
  }

  return { get, start, press, update, cancel };
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('minigames.js');
if (isMain) {
  const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); };
  const m = createMinigames({ seed: 20261030 });

  const ideal = {
    stand: (ch) => {
      while (!ch.done && !(ch.pos >= 0.47 && ch.pos <= 0.53)) m.update(ch, 0.01);
      m.press(ch, {});
    },
    oven: (ch) => {
      while (!ch.done) {
        m.update(ch, 0.01);
        if (ch.cookies.some((c) => !c.tapped && ch.t >= c.at && ch.t <= c.at + c.win)) m.press(ch, {});
      }
    },
    icecream: (ch) => {
      while (!ch.done) {
        m.update(ch, 0.01);
        if (ch.scoops.some((s) => !s.caught && ch.t >= s.at && yOf(ch, s) <= 0.3 && yOf(ch, s) > 0.02)) m.press(ch, {});
      }
    },
    juice: (ch) => {
      let i = 0;
      while (!ch.done) { m.update(ch, 0.05); if (i < 8) m.press(ch, { key: i++ % 2 ? 'd' : 'a' }); }
    },
    cake: (ch) => {
      for (const tg of ch.targets) {
        while (!ch.done && ch.t < tg.at) m.update(ch, 0.01);
        if (!ch.done) m.press(ch, { x: tg.x, y: tg.y });
      }
      while (!ch.done) m.update(ch, 0.01);
    },
    donut: (ch) => {
      while (!ch.done && ch.t < ch.show + 0.05) m.update(ch, 0.01);
      for (const idx of ch.pattern) { if (ch.done) break; m.press(ch, { index: idx }); }
    },
    choco: (ch) => {
      m.press(ch, { down: true });
      while (!ch.done && ch.heat < 0.65) m.update(ch, 0.01);
      m.press(ch, { down: false });
    },
    candy: (ch) => {
      const groups = [0, 1, 2].map((v) => ch.cards.map((c, i) => [c, i]).filter((a) => a[0] === v).map((a) => a[1]));
      for (const [a, b] of groups) { if (ch.done) break; m.update(ch, 0.01); m.press(ch, { index: a }); m.press(ch, { index: b }); }
    },
    rainbow: (ch) => {
      while (!ch.done && ch.t < ch.show + 0.05) m.update(ch, 0.01);
      for (const idx of ch.sequence) { if (ch.done) break; m.press(ch, { index: idx }); }
    },
    castle: (ch) => {
      while (!ch.done && !(ch.pos >= 0.47 && ch.pos <= 0.53)) m.update(ch, 0.01);
      m.press(ch, {});
      for (let i = 0; i < ch.n; i++) m.press(ch, {});
      while (!ch.done) m.update(ch, 0.01);
    },
  };

  for (const kind of KINDS) {
    const ch = m.start(kind);
    ok(ch && ch.kind === kind && ch.duration >= 2 && ch.duration <= 4, 'start ' + kind);
    ideal[kind](ch);
    ok(ch.done, kind + ' ideal terminates');
    ok(ch.score >= 0.9, kind + ' ideal score ' + ch.score.toFixed(3));
    ok(ch.grade === 'PERFECT' && ch.label === 'MÜKEMMEL', kind + ' perfect label ' + ch.label);

    const idle = m.start(kind);
    let guard = 0;
    while (!idle.done && guard++ < 1000) m.update(idle, 0.05);
    ok(idle.done && guard < 1000, kind + ' idle terminates');
    ok(idle.score <= 0.5, kind + ' idle score ' + idle.score.toFixed(3));
    ok(idle.label === 'KAÇTI', kind + ' idle label ' + idle.label);

    const c = m.start(kind);
    m.cancel(c);
    ok(c.done && c.cancelled && c.state === 'cancelled', kind + ' cancel state');
    const after = m.press(c, {});
    ok(after.done && after.score === 0 && after.label === 'MISS', kind + ' press after cancel');

    const bad = m.start(kind);
    const wrong = m.press(bad, 42);
    ok(wrong.done && wrong.score === 0 && wrong.label === 'MISS', kind + ' wrong input type');
  }

  ok(m.get('castle').payout(0) === 0.5 && m.get('castle').payout(1) === 2, 'payout scale');
  ok(m.get('nope') === null, 'unknown kind get null');
  ok(m.start('nope') === null, 'unknown kind start null');
  ok(m.update(null, 0.1).label === 'MISS', 'update null safe');
  ok(m.cancel(null) === null, 'cancel null safe');

  const p = createMinigames({ seed: 7 });
  const a = p.start('donut'), b = p.start('donut');
  ok(a.seed !== b.seed, 'seeds differ per round');
  ok(JSON.stringify(a.pattern) === JSON.stringify(p.start('donut', { seed: a.seed }).pattern), 'seed deterministic');

  console.log('PASS minigames: 10/10 ideal >= 0.9 (PERFECT), idle <= 0.5 (KAÇTI), cancel + bad input safe');
}
