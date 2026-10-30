const DEFAULT_SPEC = [
  ['stall-1', 'İlk tezgahını aç', 'Bir tezgah satın al.', 1, 'stations'],
  ['stall-2', 'İkinci tezgahı aç', 'İkinci tezgahını da aç.', 2, 'stations'],
  ['rate-20', 'Saniyede 20 para kazan', 'Saniyede 20 para kazanacak kadar tezgah aç.', 20, 'rate'],
  ['stall-3', 'Üç tezgah aç', 'Toplam üç tezgahın olsun.', 3, 'stations'],
  ['rate-100', 'Saniyede 100 para kazan', 'Saniyede 100 para kazan.', 100, 'rate'],
  ['pet-1', 'İlk petini al', 'Yanına bir pet al.', 1, 'pets'],
  ['stall-5', 'Beş tezgah aç', 'Toplam beş tezgahın olsun.', 5, 'stations'],
  ['rate-1000', 'Saniyede 1.000 para kazan', 'Saniyede 1.000 para kazan.', 1000, 'rate'],
  ['multi-1', 'Bir arkadaşınla oyna', 'Arkadaşınla birlikte oyna.', 1, 'multi'],
  ['stall-7', 'Yedi tezgah aç', 'Toplam yedi tezgahın olsun.', 7, 'stations'],
  ['rate-10000', 'Saniyede 10.000 para kazan', 'Saniyede 10.000 para kazan.', 10000, 'rate'],
  ['stall-all', 'Tüm tezgahları aç', 'Bütün tezgahları satın al.', 0, 'stations'],
];

export function createQuestSystem(opts = {}) {
  opts = opts && typeof opts === 'object' ? opts : {};
  const stations = Array.isArray(opts.stations) ? opts.stations : [];
  const rewardFor = (k) => {
    const s = stations[Math.min(k, stations.length - 1)];
    return Math.round((s && Number.isFinite(s.p) && s.p > 0 ? s.p : 100) * 0.8);
  };
  const allGoal = Math.max(1, stations.length);
  /* Zincir, tezgah sayısından uzun olamaz: son adım "hepsini aç" olur. */
  const chainLength = stations.length > 0
    ? Math.min(DEFAULT_SPEC.length, Math.max(1, stations.length))
    : DEFAULT_SPEC.length;
  const spec = DEFAULT_SPEC.length <= chainLength
    ? DEFAULT_SPEC
    : DEFAULT_SPEC.slice(0, chainLength - 1).concat([DEFAULT_SPEC[DEFAULT_SPEC.length - 1]]);
  const defaults = spec.map(([id, title, desc, goal, type], k) => ({
    id, title, desc, type,
    goal: id === 'stall-all' ? allGoal : goal,
    reward: rewardFor(k),
  }));
  const defs = Array.isArray(opts.definitions) && opts.definitions.length
    ? opts.definitions.map((d, k) => ({ ...d, reward: Number.isFinite(d.reward) ? d.reward : rewardFor(k) }))
    : defaults;

  const keys = { stations: 'owned', rate: 'rate', pets: 'pets', coins: 'coins' };
  /* shortcut: çok oyunculu görev, arkadaşı olmayan çocuk için kalıcı duvar olmasın —
     çevrimiçi değilse 3 dakika sonra otomatik geçilir. */
  const SOLO_SKIP = 180;
  const met = (q, s) => {
    if (q.type !== 'multi') return Number(s[keys[q.type]] || 0) >= q.goal;
    if (s.online) return true;
    return Number(s.soloFor || 0) >= SOLO_SKIP;
  };

  let index = 0;
  let justCompleted = [];
  const api = {
    update(dt, stats) {
      const s = stats && typeof stats === 'object' ? stats : {};
      justCompleted = [];
      while (index < defs.length && met(defs[index], s)) {
        const q = defs[index++];
        justCompleted.push(q.id);
        if (typeof api.onComplete === 'function') api.onComplete(q);
      }
      return justCompleted.slice();
    },
    getState(stats) {
      const active = defs[index] || null;
      let progress = 0;
      if (active && stats && typeof stats === 'object') {
        progress = active.type === 'multi'
          ? (stats.online ? 1 : 0)
          : Number(stats[keys[active.type]] || 0);
      }
      return {
        index,
        active,
        progress: Math.min(progress, active ? active.goal : 0),
        completedCount: index,
        total: defs.length,
        justCompleted: justCompleted.slice(),
      };
    },
    /* Eski kayıtlarda görev indeksi yoksa: zaten hak edilmiş adımları ödülsüz geç. */
    fastForward(stats) {
      const s = stats && typeof stats === 'object' ? stats : {};
      while (index < defs.length && met(defs[index], s)) index++;
      justCompleted = [];
      return index;
    },
    complete(id) {
      const q = defs[index];
      if (!q || q.id !== id) return false;
      index++;
      justCompleted = [q.id];
      if (typeof api.onComplete === 'function') api.onComplete(q);
      return true;
    },
    reset() {
      index = 0;
      justCompleted = [];
    },
    serialize() {
      return { v: 1, index };
    },
    load(data) {
      let n = data && typeof data === 'object' ? data.index : 0;
      n = Number.isInteger(n) ? Math.min(Math.max(n, 0), defs.length) : 0;
      index = n;
      justCompleted = [];
    },
    onComplete: typeof opts.onComplete === 'function' ? opts.onComplete : null,
  };
  return api;
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('quests.js');
if (isMain) {
  const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); };
  const ids = DEFAULT_SPEC.map((d) => d[0]);
  const stations = Array.from({ length: 12 }, (_, i) => ({ n: 'T' + (i + 1), p: 50 * Math.pow(2, i), i: i + 1 }));
  const sys = createQuestSystem({ stations });
  const seen = [];
  sys.onComplete = (q) => seen.push(q);
  ok(sys.getState().total === 12 && sys.getState().index === 0, 'fresh state');
  ok(sys.update(1 / 60, { owned: 0, rate: 0, pets: 0, online: false, coins: 0 }).length === 0, 'no early completion');

  let guard = 0;
  while (sys.getState().index < 12) {
    const q = sys.getState().active;
    ok(!!q, 'active quest exists');
    const s = { owned: 0, rate: 0, pets: 0, online: false, coins: 0 };
    if (q.type === 'stations') s.owned = q.goal;
    else if (q.type === 'rate') s.rate = q.goal;
    else if (q.type === 'pets') s.pets = q.goal;
    else if (q.type === 'multi') s.online = true;
    else if (q.type === 'coins') s.coins = q.goal;
    const done = sys.update(1 / 60, s);
    ok(done.length === 1 && done[0] === q.id, 'completes ' + q.id);
    ok(++guard < 50, 'no runaway');
  }
  ok(sys.getState().active === null && sys.getState().completedCount === 12, 'all complete');
  ok(seen.map((q) => q.id).join() === ids.join(), 'in order');
  ok(new Set(ids).size === 12, 'unique ids');
  seen.forEach((q, i) => {
    ok(q.reward > 0, 'positive reward ' + q.id);
    ok(q.reward === Math.round(stations[Math.min(i, stations.length - 1)].p * 0.8), 'reward scale ' + q.id);
    if (i) ok(q.reward > seen[i - 1].reward, 'increasing reward ' + q.id);
  });

  const small = createQuestSystem({ stations: [{ p: 10 }, { p: 20 }, { p: 40 }] });
  ok(small.getState().total === 3, 'chain clamps to station count');
  small.load({ index: 3 });
  ok(small.getState().index === 3 && small.getState().active === null, 'short chain clamps');
  small.reset();
  ok(small.getState().active.id === 'stall-1' && small.serialize().index === 0, 'reset');
  const smallSeen = [];
  small.onComplete = (q) => smallSeen.push(q);
  small.update(1 / 60, { owned: 1 });
  small.update(1 / 60, { owned: 2 });
  small.update(1 / 60, { owned: 3 });
  ok(smallSeen.length === 3, 'short chain completes');
  ok(smallSeen[2].id === 'stall-all' && smallSeen[2].goal === 3, 'all-goal count');

  const stale = createQuestSystem({ stations });
  stale.fastForward({ owned: 2, rate: 0, pets: 0, online: false });
  ok(stale.getState().index === 2, 'fast-forward skips earned quests');
  ok(stale.getState().justCompleted.length === 0, 'fast-forward pays nothing');
  const activeProgress = stale.getState({ owned: 2, rate: 7, pets: 0, online: false });
  ok(activeProgress.progress === 7 && activeProgress.active.id === ids[2], 'progress reads stats');

  const early = createQuestSystem({ stations });
  early.complete('stall-3');
  ok(early.getState().index === 0, 'complete rejects inactive');
  ok(early.complete('stall-1') && early.getState().index === 1, 'complete accepts active');
  early.update(1 / 60, { owned: 1 });
  early.update(1 / 60, { owned: 2 });
  const round = JSON.parse(JSON.stringify(early.serialize()));
  const loaded = createQuestSystem({ stations });
  loaded.load(round);
  ok(loaded.getState().index === 2, 'round-trip index');
  ok(loaded.getState().active.id === ids[2], 'round-trip active');

  const junk = createQuestSystem({ stations });
  for (const bad of [null, undefined, 'nope', 42, [], {}, { index: 'x' }, { index: -5 }, { index: 999 }, { index: 1.5 }]) {
    junk.load(bad);
    ok(Number.isInteger(junk.getState().index), 'junk load safe');
    ok(junk.getState().index >= 0 && junk.getState().index <= 12, 'junk load clamped');
  }
  junk.update(1 / 60);
  junk.update(1 / 60, null);
  junk.update(1 / 60, {});
  ok(junk.getState().index === 0, 'no stats no completion');

  console.log('PASS quests: 12 in order, rewards 0.8x scaled, serialize/load round-trip, junk safe');
}
