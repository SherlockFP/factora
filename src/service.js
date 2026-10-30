/* Tatlı Tycoon — servis döngüsü matematiği.
 *
 * Sahneden bağımsız saf fonksiyonlar: seviye eğrisi, yükseltme/personel
 * maliyeti, kombo çarpanı, tatlı saati (rush) zamanlayıcısı ve servis ödemesi.
 * Node ile doğrudan test edilebilir:  node src/service.js
 */

export const MAX_LEVEL = 10;

export const TUNING = {
  maxLevel: MAX_LEVEL,

  /* seviye başına servis değeri: +%50 */
  valuePerLevel: 0.5,

  /* yükseltme: fiyatın %75'i, her seviyede x1.75 */
  upgradeBase: 0.75,
  upgradeGrowth: 1.75,

  /* kuyruk: 2 kişi, her 2 seviyede +1, en fazla 6 */
  queueBase: 2,
  queuePerLevels: 2,
  queueMax: 6,

  /* sabır: 26 sn, seviye başına +1.4 sn. Çocuk oyuncu tezgaha yürürken
     müşteri kaçmasın; 11 sn 7 yaş için acımasızdı (55 kaçan / 0 servis). */
  patienceBase: 26,
  patiencePerLevel: 1.4,

  /* hızlı servis bonusu: beklemeden servis edersen +%50'ye kadar */
  speedBonusMax: 0.5,

  /* müşteri geliş aralığı: 3.6 sn, seviye ile hızlanır */
  spawnGapBase: 3.6,
  spawnGapPerLevel: 0.085,
  spawnDoubleChance: 0.35,

  /* kombo: servis başına +0.12, tavan x2.5, 5 sn içinde devam etmeli */
  comboStep: 0.12,
  comboMax: 2.5,
  comboWindow: 5,

  /* tatlı saati: her 110 sn'de 18 sn boyunca kalabalık + x1.6 ödeme */
  rushEvery: 110,
  rushDuration: 18,
  rushPay: 1.6,
  rushGap: 0.5,

  /* personel: seviye 3'te açılır, otomatik servis %65 öder */
  staffLevel: 3,
  staffCostMult: 5,
  staffPay: 0.65,
  staffInterval: 4.2,

  /* pasif gelir: sahip olunan tezgahların servis değerinin %3.5'i /sn */
  passiveRate: 0.035,
  offlineMult: 0.5,
  offlineCapHours: 4,
};

const clampLevel = (level) => {
  const n = Math.floor(Number(level));
  return Number.isFinite(n) ? Math.min(TUNING.maxLevel, Math.max(1, n)) : 1;
};

/* --- seviye eğrisi --- */
export function levelServeValue(base, level) {
  const b = Number(base) || 0;
  return b * (1 + TUNING.valuePerLevel * (clampLevel(level) - 1));
}

export function levelQueue(level) {
  return Math.min(TUNING.queueMax, TUNING.queueBase + Math.floor((clampLevel(level) - 1) / TUNING.queuePerLevels));
}

export function levelPatience(level) {
  return TUNING.patienceBase + TUNING.patiencePerLevel * (clampLevel(level) - 1);
}

export function levelSpawnGap(level) {
  return TUNING.spawnGapBase / (1 + TUNING.spawnGapPerLevel * (clampLevel(level) - 1));
}

export function upgradeCost(basePrice, level) {
  const lv = clampLevel(level);
  if (lv >= TUNING.maxLevel) return Infinity;
  return Math.round((Number(basePrice) || 0) * TUNING.upgradeBase * Math.pow(TUNING.upgradeGrowth, lv - 1));
}

export function staffCost(basePrice) {
  return Math.round((Number(basePrice) || 0) * TUNING.staffCostMult);
}

/* --- ödeme --- */
export function servePayout(base, level, opts) {
  const o = opts || {};
  const combo = Math.min(TUNING.comboMax, Math.max(1, Number(o.combo) || 1));
  const speed = Math.min(1, Math.max(0, Number(o.speed) || 0));
  const rush = o.rush ? TUNING.rushPay : 1;
  const value = levelServeValue(base, level) * combo * (1 + TUNING.speedBonusMax * speed) * rush;
  return Math.max(1, Math.floor(value));
}

/* 1 = hiç beklemeden servis, 0 = sabrın sonuna kadar bekletilmiş */
export function speedFactor(waited, patience) {
  const p = Number(patience) || 1;
  return Math.min(1, Math.max(0, 1 - (Number(waited) || 0) / p));
}

/* --- kombo --- */
export function createCombo() {
  let count = 0;
  let timer = 0;
  let windowBonus = 0;
  const api = {
    hit() {
      count += 1;
      timer = api.window;
      return api.mult;
    },
    /* yetenek yükseltmesi kombo penceresini uzatır */
    setWindowBonus(sec) {
      windowBonus = Math.max(0, Number(sec) || 0);
      if (timer > api.window) timer = api.window;
    },
    miss() {
      count = 0;
      timer = 0;
    },
    update(dt) {
      if (timer <= 0) return;
      timer -= Number(dt) || 0;
      if (timer <= 0) {
        timer = 0;
        count = 0;
      }
    },
    reset() {
      count = 0;
      timer = 0;
    },
    get count() { return count; },
    get mult() { return Math.min(TUNING.comboMax, 1 + TUNING.comboStep * count); },
    get timer() { return Math.max(0, timer); },
    get window() { return TUNING.comboWindow + windowBonus; },
  };
  return api;
}

/* --- tatlı saati --- */
export function createRush() {
  let since = 0;
  let active = false;
  let left = 0;
  const api = {
    /* 'start' | 'end' | null döner */
    update(dt) {
      const d = Math.max(0, Number(dt) || 0);
      if (!active) {
        since += d;
        if (since >= TUNING.rushEvery) {
          active = true;
          left = TUNING.rushDuration;
          since = 0;
          return 'start';
        }
        return null;
      }
      left -= d;
      if (left <= 0) {
        active = false;
        left = 0;
        return 'end';
      }
      return null;
    },
    reset() {
      since = 0;
      active = false;
      left = 0;
    },
    get active() { return active; },
    get remaining() { return Math.max(0, left); },
    get nextIn() { return active ? 0 : Math.max(0, TUNING.rushEvery - since); },
  };
  return api;
}

const isMain = typeof process !== 'undefined' && process.argv && process.argv[1] && process.argv[1].endsWith('service.js');
if (isMain) {
  const ok = (cond, msg) => { if (!cond) throw new Error('FAIL: ' + msg); };
  const near = (a, b, eps, msg) => ok(Math.abs(a - b) <= (eps || 1e-6), msg + ' (' + a + ' vs ' + b + ')');

  /* seviye eğrisi */
  near(levelServeValue(100, 1), 100, 1e-6, 'level1 value');
  near(levelServeValue(100, 10), 550, 1e-6, 'level10 value');
  ok(levelServeValue(100, 0) === 100 && levelServeValue(100, 99) === 550, 'level clamp');
  ok(levelQueue(1) === 2 && levelQueue(3) === 3 && levelQueue(10) === 6, 'queue curve');
  ok(levelPatience(1) === 26 && levelPatience(10) > 36, 'patience curve');
  ok(levelSpawnGap(10) < levelSpawnGap(1), 'spawn gap speeds up');

  /* maliyetler */
  const c1 = upgradeCost(100, 1);
  const c2 = upgradeCost(100, 2);
  ok(c1 === 75 && c2 === 131, 'upgrade costs ' + c1 + ',' + c2);
  ok(upgradeCost(100, 9) > upgradeCost(100, 8), 'upgrade costs grow');
  ok(upgradeCost(100, 10) === Infinity, 'max level');
  ok(staffCost(100) === 500, 'staff cost');

  /* ödeme */
  ok(servePayout(10, 1) === 10, 'base payout');
  ok(servePayout(10, 1, { combo: 1.5, speed: 1 }) === 22, 'combo + speed payout');
  ok(servePayout(10, 1, { combo: 99 }) === 25, 'combo capped');
  ok(servePayout(10, 1, { rush: true }) === 16, 'rush payout');
  ok(servePayout(1, 1, { combo: 1 }) === 1, 'minimum 1');
  near(speedFactor(0, 10), 1, 1e-9, 'speed at arrival');
  near(speedFactor(10, 10), 0, 1e-9, 'speed at timeout');
  near(speedFactor(20, 10), 0, 1e-9, 'speed clamped');

  /* kombo */
  const combo = createCombo();
  ok(combo.mult === 1, 'combo starts at 1');
  combo.hit(); combo.hit();
  near(combo.mult, 1.24, 1e-9, 'combo ramps');
  for (let i = 0; i < 40; i++) combo.hit();
  ok(combo.mult === TUNING.comboMax, 'combo caps');
  combo.update(4.9);
  ok(combo.count === 42, 'combo survives inside window');
  combo.update(0.2);
  ok(combo.mult === 1 && combo.count === 0, 'combo expires');
  combo.hit();
  combo.miss();
  ok(combo.mult === 1, 'miss resets');

  /* tatlı saati */
  const rush = createRush();
  let starts = 0, ends = 0;
  for (let i = 0; i < 109; i++) { if (rush.update(1) === 'start') starts++; }
  ok(starts === 0, 'rush waits its turn');
  ok(rush.update(1) === 'start', 'rush starts');
  ok(rush.active, 'rush active');
  for (let i = 0; i < 18; i++) { if (rush.update(1) === 'end') ends++; }
  ok(ends === 1 && !rush.active, 'rush ends');

  /* kaba denge tahmini: her tezgah ~30 servis, 3.2 sn'de bir, ortalama x1.5 kombo */
  const prices = [15, 60, 200, 650, 2000, 6000, 18000, 55000, 160000, 500000];
  const values = [2, 7, 24, 80, 260, 900, 3000, 10000, 32000, 110000];
  let totalServes = 0;
  for (let i = 1; i < prices.length; i++) totalServes += prices[i] / (values[i - 1] * 1.5);
  const minutes = (totalServes * 3.2) / 60;
  ok(minutes > 6 && minutes < 30, 'serve loop length is playable (' + minutes.toFixed(1) + ' min)');

  console.log('PASS service: levels, costs, payout, combo, rush; tahmini tur ~' + minutes.toFixed(1) + ' dk');
}
