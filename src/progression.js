/* Tatlı Tycoon — kalıcı prestij merdiveni.
 * Her rebirth sadece çarpan değil, yeni içerik açar. Saf mantık: DOM/THREE/import yok.
 * node src/progression.js
 */

const TIERS = [
  { tier: 0, at: 0, id: 'plaza', name: 'Ana Plaza', desc: '6 tezgah: ilk tatlı dükkanın.', unlocks: [] },
  { tier: 1, at: 1, id: 'bolge2', name: 'Bölge 2', desc: 'Güneydeki 4 yeni tezgah açılır.', unlocks: ['bolge2'] },
  { tier: 2, at: 2, id: 'personel-yildizi', name: 'Personel Yıldızı', desc: 'Personel 3 yıldıza kadar yükselir; yıldız başına +%10.', unlocks: ['personelYildizi'] },
  { tier: 3, at: 3, id: 'altin-tezgah', name: 'Altın Tezgah', desc: 'Her rebirth bir tezgahı altına çevirir: 2x ödeme.', unlocks: ['altinTezgah'] },
  { tier: 4, at: 5, id: 'pet-yuvasi', name: 'Pet Yuvası', desc: 'İkinci pet yuvası açılır.', unlocks: ['petYuvasi'] },
  { tier: 5, at: 8, id: 'gokkusagi', name: 'Gökkuşağı Modu', desc: 'Plaza gökkuşağına boyanır; müşteri akışı +%25.', unlocks: ['gokkusagi'] },
  { tier: 6, at: 12, id: 'imparatorluk', name: 'Tatlı İmparatorluğu', desc: 'Tatlı tacı + kalıcı 2x ödeme.', unlocks: ['imparatorluk'] },
];

const MILESTONES = [
  { id: 'yumurta-3', at: 3, name: 'Bedava Pet Yumurtası', desc: 'Rebirth 3: bir pet yumurtası hediye.', reward: 'freeEgg' },
  { id: 'tatli-saati-5', at: 5, name: '30 Dakika Tatlı Saati', desc: 'Rebirth 5: 30 dakika boyunca tatlı saati hep açık.', reward: 'rushAlwaysOn30' },
];

const PASSIVE_PER_REBIRTH = 0.02;
const DISCOUNT_PER_REBIRTH = 0.08;
const DISCOUNT_CAP = 0.4;

const clampRebirths = (n) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.max(0, v) : 0;
};
const clampInt = (n, def, lo, hi) => {
  const v = Math.floor(Number(n));
  return Number.isFinite(v) ? Math.min(hi, Math.max(lo, v)) : def;
};
const round4 = (v) => Math.round(v * 10000) / 10000;
const rebirthsOf = (state) => clampRebirths(state && typeof state === 'object' ? state.rebirths : state);
const tierFor = (r) => {
  let found = TIERS[0];
  for (const t of TIERS) if (t.at <= r) found = t;
  return found;
};
const cloneTier = (t) => ({
  tier: t.tier, at: t.at, id: t.id, name: t.name, desc: t.desc, unlocks: t.unlocks.slice(),
});

export function createProgression(opts) {
  opts = opts && typeof opts === 'object' ? opts : {};
  const stations = Array.isArray(opts.stations) ? opts.stations : null;
  let mainIndices = stations
    ? stations.map((s, i) => (s && typeof s === 'object' && s.zone === 0 ? i : -1)).filter((i) => i >= 0)
    : [];
  if (!mainIndices.length) {
    const count = clampInt(opts.mainCount, 6, 1, 64);
    mainIndices = Array.from({ length: count }, (_, i) => i);
  }

  let claimed = new Set();

  function getTier(state) {
    const t = tierFor(rebirthsOf(state));
    return Object.assign(cloneTier(t), { rebirths: rebirthsOf(state) });
  }

  function nextUnlock(state) {
    const r = rebirthsOf(state);
    const next = TIERS.find((t) => t.at > r);
    if (!next) return null;
    return Object.assign(cloneTier(next), { remaining: next.at - r });
  }

  function rebirthBonus(rebirths) {
    const r = clampRebirths(rebirths);
    const mult = 1 + r * 0.35 + Math.floor(r / 3) * 0.15;
    const priceDiscount = Math.min(DISCOUNT_CAP, r * DISCOUNT_PER_REBIRTH);
    const exact = r > 0 ? TIERS.find((t) => t.at === r) : null;
    return {
      mult: round4(mult),
      priceDiscount: round4(priceDiscount),
      newUnlock: exact ? cloneTier(exact) : null,
    };
  }

  function permanentPerks(rebirths) {
    const r = clampRebirths(rebirths);
    const t = tierFor(r);
    const perks = [];
    if (r > 0) {
      perks.push({
        id: 'kalici-tatli', kind: 'payout', name: 'Kalıcı Tatlılık',
        desc: 'Her rebirth +%2 kalıcı ödeme.', add: round4(PASSIVE_PER_REBIRTH * r),
      });
    }
    if (t.tier >= 1) {
      perks.push({ id: 'bolge2', kind: 'zone', name: 'Bölge 2', desc: 'Güney bölgesi açık.', zone: 2, stations: 4 });
    }
    if (t.tier >= 2) {
      perks.push({ id: 'personel-yildizi', kind: 'staffStars', name: 'Personel Yıldızı', desc: 'Personel 1-3 yıldız.', maxStars: 3, perStar: 0.1 });
    }
    if (t.tier >= 3) {
      perks.push({ id: 'altin-tezgah', kind: 'golden', name: 'Altın Tezgah', desc: 'Altın tezgah 2x öder.', slots: r, payMult: 2 });
    }
    if (t.tier >= 4) {
      perks.push({ id: 'pet-yuvasi', kind: 'petSlots', name: 'Pet Yuvası', desc: 'İkinci pet yuvası.', slots: 2 });
    }
    if (t.tier >= 5) {
      perks.push({ id: 'gokkusagi', kind: 'rainbow', name: 'Gökkuşağı Modu', desc: 'Gökkuşağı plaza + hızlı müşteri.', spawnBoost: 0.25 });
    }
    if (t.tier >= 6) {
      perks.push({ id: 'imparatorluk', kind: 'empire', name: 'Tatlı İmparatorluğu', desc: 'Taç + kalıcı 2x.', payMult: 2, crown: true });
    }
    return perks;
  }

  function canRebirth(state) {
    const s = state && typeof state === 'object' ? state : {};
    const owned = Array.isArray(s.owned) ? s.owned : null;
    if (!owned) return false;
    return mainIndices.every((i) => owned[i] != null);
  }

  function claimMilestones(rebirths) {
    const r = clampRebirths(rebirths);
    const out = [];
    for (const m of MILESTONES) {
      if (r >= m.at && !claimed.has(m.id)) {
        claimed.add(m.id);
        out.push({ id: m.id, at: m.at, name: m.name, desc: m.desc, reward: m.reward });
      }
    }
    return out;
  }

  function serialize() {
    return { v: 1, claimed: Array.from(claimed) };
  }

  function load(data) {
    claimed = new Set();
    const list = data && typeof data === 'object' && Array.isArray(data.claimed) ? data.claimed : [];
    for (const id of list) {
      if (typeof id === 'string' && MILESTONES.some((m) => m.id === id)) claimed.add(id);
    }
  }

  return { getTier, nextUnlock, rebirthBonus, permanentPerks, canRebirth, claimMilestones, serialize, load };
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('progression.js');
if (isMain) {
  const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); };
  const stations = Array.from({ length: 10 }, (_, i) => ({ zone: i < 6 ? 0 : 1 }));
  const p = createProgression({ stations });

  let prevMult = -1;
  let prevDisc = -1;
  for (let r = 0; r <= 15; r++) {
    const b = p.rebirthBonus(r);
    ok(b.mult > prevMult, 'çarpan artmalı r=' + r);
    ok(b.priceDiscount <= 0.4 + 1e-9, 'indirim tavanı r=' + r);
    ok(b.priceDiscount >= prevDisc, 'indirim düşmemeli r=' + r);
    prevMult = b.mult;
    prevDisc = b.priceDiscount;
    const perks = p.permanentPerks(r);
    ok(Array.isArray(perks), 'perk listesi r=' + r);
    for (const q of perks) {
      ok(JSON.stringify(JSON.parse(JSON.stringify(q))) === JSON.stringify(q), 'perk JSON r=' + r);
    }
  }
  ok(p.rebirthBonus(0).mult === 1, 'çarpan 0');
  ok(p.rebirthBonus(1).mult === 1.35, 'çarpan 1');
  ok(p.rebirthBonus(3).mult === 2.2, 'çarpan 3');
  ok(p.rebirthBonus(15).mult === 7, 'çarpan 15');
  ok(p.rebirthBonus(5).priceDiscount === 0.4, 'indirim 5te tavan');
  ok(p.permanentPerks(0).length === 0, '0 rebirth perksiz');

  const gates = [[1, 'bolge2'], [2, 'personel-yildizi'], [3, 'altin-tezgah'], [5, 'pet-yuvasi'], [8, 'gokkusagi'], [12, 'imparatorluk']];
  for (const [at, id] of gates) {
    const hit = p.rebirthBonus(at).newUnlock;
    ok(hit && hit.id === id, 'kilit tam eşikte ' + id);
    for (let r = 0; r <= 15; r++) {
      if (r === at) continue;
      const other = p.rebirthBonus(r).newUnlock;
      ok(!other || other.id !== id, 'kilit bir kez ' + id + ' r=' + r);
    }
  }
  ok(p.getTier({ rebirths: 4 }).id === 'altin-tezgah', 'kademe 4');
  ok(p.getTier({ rebirths: 12 }).id === 'imparatorluk', 'kademe 12');
  const nxt = p.nextUnlock({ rebirths: 4 });
  ok(nxt.at === 5 && nxt.remaining === 1 && nxt.id === 'pet-yuvasi', 'sıradaki kilit');
  ok(p.nextUnlock({ rebirths: 99 }) === null, 'tepe kademe');
  ok(p.permanentPerks(15).some((q) => q.kind === 'empire' && q.payMult === 2), 'imparatorluk x2');

  const st = { owned: new Array(10).fill(null) };
  ok(p.canRebirth(st) === false, 'boş plazada rebirth yok');
  st.owned[0] = 'me'; st.owned[1] = 'me'; st.owned[2] = 'me'; st.owned[3] = 'me'; st.owned[4] = 'me';
  ok(p.canRebirth(st) === false, '6. ana tezgah eksik');
  st.owned[5] = 'me';
  ok(p.canRebirth(st) === true, 'ana plaza tamam');
  ok(p.canRebirth({ owned: [1, 1, 1, 1, 1, 1] }) === true, 'kısa sahiplik');
  ok(p.canRebirth({}) === false, 'sahiplik yok');

  ok(p.claimMilestones(3).map((m) => m.id).join() === 'yumurta-3', '3. ödül');
  ok(p.claimMilestones(3).length === 0, '3. ödül tekrar etmez');
  const snap = JSON.parse(JSON.stringify(p.serialize()));
  const q = createProgression({ stations });
  q.load(snap);
  ok(q.claimMilestones(3).length === 0, 'yükleme sonrası tekrar yok');
  const five = q.claimMilestones(5);
  ok(five.length === 1 && five[0].reward === 'rushAlwaysOn30', '5. ödül bir kez');
  ok(q.claimMilestones(12).length === 0, 'ödül listesi bitti');

  const junk = [null, undefined, 'x', 42, [], {}, { rebirths: 'abc' }, { rebirths: -9 }, { rebirths: Infinity }, { rebirths: 1e9 }, { owned: 'x' }];
  for (const bad of junk) {
    const t = p.getTier(bad);
    ok(Number.isInteger(t.tier), 'getTier çöp');
    const b = p.rebirthBonus(bad);
    ok(Number.isFinite(b.mult) && b.priceDiscount <= 0.4, 'bonus çöp');
    ok(Array.isArray(p.permanentPerks(bad)), 'perk çöp');
    ok(typeof p.canRebirth(bad) === 'boolean', 'canRebirth çöp');
    ok(p.nextUnlock(bad) === null || typeof p.nextUnlock(bad).at === 'number', 'nextUnlock çöp');
    q.load(bad);
    ok(Array.isArray(q.serialize().claimed), 'load çöp');
  }

  console.log('PASS progression: 7 kademe, rebirth 0-15 çarpan ' + p.rebirthBonus(0).mult + '→' + p.rebirthBonus(15).mult +
    ', indirim tavan %' + Math.round(p.rebirthBonus(15).priceDiscount * 100) +
    ', kilitler tek seferde, ödüller tek sefer, serialize/load, çöp girdi güvenli');
}
