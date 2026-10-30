/* Tatlı Tycoon — ilk 10 dakika akışı. DOM/Three.js'e dokunmaz.
 * node src/onboarding.js ile kendi kendini test eder. */

const noop = () => {};
const pick = (o, k) => (o && typeof o[k] === 'function') ? o[k].bind(o) : noop;
const num = (v) => Number.isFinite(Number(v)) ? Number(v) : 0;
const has = (c, i) => Array.isArray(c.owned) && c.owned[i] !== null && c.owned[i] !== undefined && c.owned[i] !== false;
const ownedCount = (c) => Array.isArray(c.owned) ? c.owned.filter((o) => o !== null && o !== undefined && o !== false).length : 0;
const levelOf = (c, i) => (Array.isArray(c.levels) && Number(c.levels[i])) || 1;
const anchor = (c, i) => (Array.isArray(c.stationPositions) && c.stationPositions[i]) || c.playerPos || { x: 0, y: 2, z: 0};
const nearStation = (c, i, r) => {
  const p = c.playerPos, s = Array.isArray(c.stationPositions) ? c.stationPositions[i] : null;
  return !!p && !!s && Math.hypot(num(p.x) - num(s.x), num(p.z) - num(s.z)) <= (r || 3.6);
};

const STEPS = [
  {
    id: 'varis', goal: '',
    enter(b) { b.ui.setGoal(''); b.world.moveCameraTo(b.panPos, 2500); },
    done(b) { return b.time >= 2.8; },
    exit(b, c) { b.world.moveCameraTo(c.playerPos || b.panPos, 700); b.ui.pulse(b.signId); },
  },
  {
    id: 'ilk-adim', goal: 'Ok işaretini takip et',
    enter(b) { b.world.pointArrow(0); },
    done(b, c) { return nearStation(c, 0); },
    skipIf: (c) => has(c, 0),
    exit(b) { b.world.pointArrow(null); b.world.highlightPad(0, true); b.ui.toast('İşte ilk tezgahın!'); },
  },
  {
    id: 'ilk-satis', goal: "Müşteri gelince SERVİS'e bas",
    enter(b, c) { if (!has(c, 0) && !b.granted) { b.granted = true; b.onGrantFirst(); } },
    done(b, c) { return num(c.serves) >= 1; },
    skipIf: (c) => ownedCount(c) >= 2,
    exit(b, c) { b.ui.floater('💰', anchor(c, 0), '#ffd400'); b.ui.toast('İlk paranı kazandın!'); },
  },
  {
    id: 'yukselt', goal: 'Tezgahını yükselt',
    enter(b) { b.world.pointArrow(null); b.ui.pulse(b.upgradeId); },
    done(b, c) { return levelOf(c, 0) >= 2; },
    skipIf: (c) => ownedCount(c) >= 2,
    exit(b, c) { b.ui.floater('SEVİYE 2', anchor(c, 0), '#ffd400'); b.ui.toast('Seviye 2! Daha çok müşteri, daha çok para'); },
  },
  {
    id: 'ikinci', goal: 'İkinci tezgahı aç',
    enter(b) { b.world.pointArrow(1); },
    done(b, c) { return ownedCount(c) >= 2; },
    exit(b) { b.world.pointArrow(null); b.world.highlightPad(1, true); b.ui.toast('İkinci tezgah açıldı!'); },
  },
  {
    id: 'kombo', goal: '3 müşteriyi üst üste servis et',
    enter(b) { b.world.pointArrow(null); },
    done(b, c) { return num(c.combo) >= 3; },
    exit(b) { b.ui.toast('KOMBO! Ard arda servis = daha çok para'); },
  },
  {
    id: 'bolge', goal: 'Bölge 2 kapısını gör',
    enter(b) { b.world.pointArrow(null); },
    /* shortcut: varsayılan portal konumu; index.html opts.zone2 ile gerçeğini verir */
    done(b, c) {
      const g = b.zone2 || c.zone2 || { x: -16.5, z: 0 }, p = c.playerPos;
      return !!p && Math.hypot(num(p.x) - num(g.x), num(p.z) - num(g.z)) <= 9;
    },
    exit(b) { b.ui.toast('Bölge 2: daha büyük dükkanlar'); },
  },
];

export function createOnboarding(opts = {}) {
  opts = opts && typeof opts === 'object' ? opts : {};
  const b = {
    ui: { setGoal: pick(opts.ui, 'setGoal'), toast: pick(opts.ui, 'toast'), floater: pick(opts.ui, 'floater'), pulse: pick(opts.ui, 'pulse') },
    world: { pointArrow: pick(opts.world, 'pointArrow'), highlightPad: pick(opts.world, 'highlightPad'), moveCameraTo: pick(opts.world, 'moveCameraTo') },
    onGrantFirst: typeof opts.onGrantFirst === 'function' ? opts.onGrantFirst : noop,
    panPos: opts.panPos && typeof opts.panPos === 'object' ? opts.panPos : { x: 0, y: 24, z: 20 },
    signId: opts.signId || 'shopSign',
    upgradeId: opts.upgradeId || 'spUp',
    zone2: opts.zone2 && typeof opts.zone2 === 'object' ? opts.zone2 : null,
    time: 0, granted: false, flags: Object.create(null),
  };
  let index = 0, active = false;

  const finish = () => { active = false; b.world.pointArrow(null); b.ui.setGoal(''); };

  function enter(i, ctx) {
    const s = STEPS[i];
    if (!s) return finish();
    b.world.pointArrow(null);
    b.world.highlightPad(0, false);
    b.world.highlightPad(1, false);
    b.ui.setGoal(s.goal || '');
    if (typeof s.enter === 'function') s.enter(b, ctx);
    if (typeof opts.onStep === 'function') opts.onStep(s.id);
  }

  function advance(ctx) {
    index += 1;
    if (index >= STEPS.length) finish(); else enter(index, ctx);
  }

  const api = {
    start() {
      b.time = 0;
      if (index >= STEPS.length) { active = false; b.ui.setGoal(''); return api; }
      active = true;
      enter(index, {});
      return api;
    },
    stop() {
      active = false;
      b.world.pointArrow(null);
      b.ui.setGoal('');
      return api;
    },
    update(dt, ctx) {
      if (!active) return;
      const c = ctx && typeof ctx === 'object' ? ctx : {};
      b.time += Math.max(0, num(dt));
      for (let guard = 0; guard <= STEPS.length; guard++) {
        if (index >= STEPS.length) return finish();
        const s = STEPS[index];
        if (s.done && s.done(b, c)) {
          b.flags[s.id] = true;
          if (typeof s.exit === 'function') s.exit(b, c);
          advance(c);
          continue;
        }
        if (s.skipIf && s.skipIf(c)) {
          b.flags[s.id] = true;
          advance(c);
          continue;
        }
        break;
      }
    },
    getStep() {
      const s = STEPS[index];
      return { index, id: s ? s.id : 'serbest', goal: s ? s.goal : '', active };
    },
    skip() {
      if (index >= STEPS.length) return api;
      b.flags[STEPS[index].id] = true;
      advance({});
      return api;
    },
    serialize() {
      const flags = {};
      for (const k of Object.keys(b.flags)) if (b.flags[k]) flags[k] = true;
      return { v: 1, step: index, flags };
    },
    load(data) {
      const d = data && typeof data === 'object' && !Array.isArray(data) ? data : {};
      const n = Number(d.step);
      index = Number.isInteger(n) ? Math.min(Math.max(n, 0), STEPS.length) : 0;
      b.flags = Object.create(null);
      if (d.flags && typeof d.flags === 'object' && !Array.isArray(d.flags)) {
        for (const s of STEPS) if (d.flags[s.id] === true) b.flags[s.id] = true;
      }
      b.granted = !!b.flags['ilk-satis'];
      b.time = 0;
      active = index < STEPS.length;
      return api;
    },
  };
  return api;
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('onboarding.js');
if (isMain) {
  const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); };
  const mk = (ow) => {
    const log = [], arrows = [];
    const ob = createOnboarding(Object.assign({
      ui: { setGoal: (t) => log.push('goal:' + t), toast: (t) => log.push('toast:' + t), floater: () => log.push('floater'), pulse: (e) => log.push('pulse:' + e) },
      world: { pointArrow: (i) => arrows.push(i), highlightPad: (i, on) => log.push('pad' + i + ':' + on), moveCameraTo: () => log.push('cam') },
      onStep: (id) => log.push('step:' + id),
    }, ow || {}));
    const sim = {
      owned: new Array(10).fill(null), levels: new Array(10).fill(1),
      serves: 0, combo: 0, coins: 40,
      playerPos: { x: 0, z: 12 },
      stationPositions: [{ x: 0, z: 6 }, { x: -7, z: 6 }],
    };
    const intro = () => { ob.start(); ob.update(1, sim); ob.update(1, sim); ob.update(1, sim); };
    const arrive = () => { sim.playerPos = { x: 0, z: 7 }; ob.update(1 / 60, sim); };
    return { ob, log, arrows, sim, intro, arrive };
  };

  /* tam akış */
  const t = mk();
  t.ob.start();
  ok(t.ob.getStep().id === 'varis' && t.ob.getStep().goal === '' && t.ob.getStep().active, 'start varis, goal hidden');
  t.ob.update(1, t.sim); t.ob.update(1, t.sim);
  ok(t.ob.getStep().id === 'varis', 'intro waits');
  t.ob.update(1, t.sim);
  ok(t.ob.getStep().id === 'ilk-adim' && t.log.includes('goal:Ok işaretini takip et'), 'intro → first goal');
  ok(t.arrows.includes(0), 'arrow station 0');
  t.arrive();
  ok(t.ob.getStep().id === 'ilk-satis' && t.log.includes('toast:İşte ilk tezgahın!'), 'arrival toast');
  ok(t.log.includes('pad0:true'), 'arrival highlights pad');
  t.sim.serves = 1;
  t.ob.update(1 / 60, t.sim);
  ok(t.ob.getStep().id === 'yukselt' && t.log.includes('toast:İlk paranı kazandın!'), 'first serve reward');
  t.sim.levels[0] = 2;
  t.ob.update(1 / 60, t.sim);
  ok(t.ob.getStep().id === 'ikinci' && t.arrows[t.arrows.length - 1] === 1, 'upgrade → arrow station 1');
  t.sim.owned[0] = 'me';
  t.ob.update(1 / 60, t.sim);
  ok(t.ob.getStep().id === 'ikinci', 'one station not enough');
  t.sim.owned[1] = 'me';
  t.ob.update(1 / 60, t.sim);
  ok(t.ob.getStep().id === 'kombo', 'second station → kombo');
  t.sim.combo = 3;
  t.ob.update(1 / 60, t.sim);
  ok(t.ob.getStep().id === 'bolge' && t.log.includes('toast:KOMBO! Ard arda servis = daha çok para'), 'combo → bolge');
  t.sim.playerPos = { x: -16.5, z: 0 };
  t.ob.update(1 / 60, t.sim);
  ok(t.ob.getStep().id === 'serbest' && !t.ob.getStep().active, 'gate ends onboarding');
  ok(t.ob.getStep().goal === '', 'goal falls back');
  const order = t.log.filter((l) => l.startsWith('step:')).map((l) => l.slice(5)).join();
  ok(order === 'varis,ilk-adim,ilk-satis,yukselt,ikinci,kombo,bolge', 'in order: ' + order);

  /* erken satın alma: 2 tezgah → 2-4 atlanır */
  const e = mk();
  e.intro(); e.arrive();
  ok(e.ob.getStep().id === 'ilk-satis', 'at ilk-satis');
  e.sim.owned[0] = 'me'; e.sim.owned[1] = 'me';
  e.ob.update(1 / 60, e.sim);
  ok(e.ob.getStep().id === 'kombo', 'buy 2nd jumps to kombo, got ' + e.ob.getStep().id);
  ok(!e.log.includes('toast:İlk paranı kazandın!'), 'skipped step no reward toast');

  /* tek tezgah erken atlamaz */
  const o = mk();
  o.intro(); o.arrive();
  o.sim.owned[0] = 'me';
  o.ob.update(1 / 60, o.sim);
  ok(o.ob.getStep().id === 'ilk-satis', 'one station keeps ilk-satis');

  /* ilk tezgah zaten varsa ilk-adim atlanır, hibe çağrılmaz */
  let grants = 0;
  const g = mk({ onGrantFirst: () => grants++ });
  g.ob.load({ step: 1 });
  g.sim.owned[0] = 'me';
  g.ob.update(1 / 60, g.sim);
  ok(g.ob.getStep().id === 'ilk-satis' && grants === 0, 'owned station skips ilk-adim, no grant');
  const g2 = mk({ onGrantFirst: () => grants++ });
  g2.ob.load({ step: 2 });
  g2.ob.start();
  g2.ob.update(1 / 60, g2.sim);
  ok(grants === 1, 'grant called once on ilk-satis entry, got ' + grants);

  /* skip() */
  const s = mk();
  s.ob.start(); s.ob.skip();
  ok(s.ob.getStep().id === 'ilk-adim', 'skip advances one step');

  /* serialize/load */
  const ser = JSON.parse(JSON.stringify(t.ob.serialize()));
  ok(ser.v === 1 && ser.step === 7, 'serialize terminal');
  const mid = mk();
  mid.ob.load({ v: 1, step: 3, flags: { 'varis': true, 'ilk-adim': true, 'ilk-satis': true } });
  ok(mid.ob.getStep().id === 'yukselt' && mid.ob.getStep().active, 'load mid-run');
  const rt = mk();
  rt.ob.load(JSON.parse(JSON.stringify(mid.ob.serialize())));
  ok(rt.ob.getStep().index === 3 && rt.ob.getStep().id === 'yukselt', 'round-trip');
  const term = mk();
  term.ob.load(ser);
  ok(term.ob.getStep().id === 'serbest' && !term.ob.getStep().active, 'load terminal off');
  term.ob.start();
  ok(!term.ob.getStep().active, 'start after finish stays off');

  /* çöp girdi */
  const j = mk();
  for (const bad of [null, undefined, 'nope', 42, [], {}, { step: 'x' }, { step: -5 }, { step: 999 }, { step: 2.5 }, { step: 3, flags: 'bad' }, { step: 3, flags: [] }, { step: 3, flags: { 'yukselt': 'yes' } }]) {
    j.ob.load(bad);
    const st = j.ob.getStep();
    ok(Number.isInteger(st.index) && st.index >= 0 && st.index <= STEPS.length, 'junk load clamped');
  }
  j.ob.start();
  for (const badCtx of [undefined, null, 42, 'x', [], {}]) j.ob.update(1 / 60, badCtx);
  ok(Number.isInteger(j.ob.getStep().index), 'junk ctx safe');
  const bare = createOnboarding();
  bare.start(); bare.update(1, null); bare.update(1, null); bare.update(1, null); bare.skip();
  ok(bare.getStep().index === 2, 'bare setup runs, got ' + bare.getStep().index);

  console.log('PASS onboarding: ' + STEPS.length + ' adım sırayla, erken alım 2-4 atlar, hibe bir kez, serialize/load turu, çöp girdi güvenli');
}
