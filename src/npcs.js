/* Tatlı Tycoon — müşteri sistemi.
 *
 * Eski dekoratif NPC'lerin yerini alır: müşteriler sahip olunan tezgahlara
 * yürür, kuyruğa girer, sabır halkası dolunca servis bekler. Oyuncu tezgahın
 * yanında `serve(i)` çağırınca kuyruğun önündeki müşteri memnun ayrılır.
 *
 * createNpcSystem(THREE, {
 *   scene, stations,            // [{x,z,emoji}] tezgah konumları
 *   getOwned: () => owned[],    // null = sahipsiz
 *   getLevel: (i) => 1,         // kuyruk kapasitesi / sabır
 *   onServed: (i, npc, wait) => {},
 *   onLost:   (i, npc) => {},
 *   count: 14,
 * }) -> { group, npcs, update(dt), serve(i), queueLen(i), queueInfo(i), reset() }
 */

import { TUNING, levelQueue, levelPatience, levelSpawnGap } from './service.js?v=7';

const SHIRTS = [0xff7a59, 0x54b8ff, 0x6fdc4f, 0xffb340, 0xb06bff, 0xff5b9d, 0x2ec4b6, 0xffd400];
const SKINS = [0xffd9b0, 0xf1c27d, 0xc68642, 0x8d5524, 0xffe0bd];
const HATS = [0xff5b5b, 0x54b8ff, 0x6fdc4f, 0xffb340, 0xb06bff, 0x2ec4b6];

const EDGE = 17;
const WALK_SPEED = 2.5;
const LEAVE_TIME = 7;

/* Müşteri çeşitliliği: parkta herkes aynı boyda olmaz. Çocuk daha kısa ve
   kafası büyük, yetişkin normal, uzun olan sırık gibi. */
const VARIANTS = [
  { s: 1.00, body: 1.00, head: 1.00, w: 5 },  // yetişkin
  { s: 0.78, body: 0.92, head: 1.16, w: 3 },  // çocuk
  { s: 1.07, body: 1.03, head: 0.95, w: 2 },  // uzun
];
const VARIANT_TOTAL = VARIANTS.reduce((n, v) => n + v.w, 0);
function pickVariant(){
  let r = Math.random() * VARIANT_TOTAL;
  for (const v of VARIANTS){ r -= v.w; if (r <= 0) return v; }
  return VARIANTS[0];
}

/* Yumuşak zemin gölgesi: müşteri havada durmasın, yere bassın. */
function makeShadowTexture(THREE){
  const c = document.createElement('canvas');
  c.width = 64; c.height = 64;
  const g = c.getContext('2d');
  const grd = g.createRadialGradient(32, 32, 2, 32, 32, 31);
  grd.addColorStop(0, 'rgba(52,34,12,0.42)');
  grd.addColorStop(0.55, 'rgba(52,34,12,0.20)');
  grd.addColorStop(1, 'rgba(52,34,12,0)');
  g.fillStyle = grd;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

export function createNpcSystem(THREE, opts = {}) {
  const scene = opts.scene || null;
  const stations = Array.isArray(opts.stations) ? opts.stations : [];
  const getOwned = typeof opts.getOwned === 'function' ? opts.getOwned : () => null;
  const getLevel = typeof opts.getLevel === 'function' ? opts.getLevel : () => 1;
  const onServed = typeof opts.onServed === 'function' ? opts.onServed : () => {};
  const onLost = typeof opts.onLost === 'function' ? opts.onLost : () => {};
  const onArrive = typeof opts.onArrive === 'function' ? opts.onArrive : () => {};
  const getPlayer = typeof opts.getPlayer === 'function' ? opts.getPlayer : null;
  const getQueueBonus = typeof opts.getQueueBonus === 'function' ? opts.getQueueBonus : () => 0;
  const queueCap = (i) => levelQueue(getLevel(i)) + Math.max(0, getQueueBonus() | 0);
  const count = Math.max(0, Math.floor(opts.count === undefined ? 14 : opts.count));

  const geo = {
    body: new THREE.CapsuleGeometry(0.38, 0.58, 4, 10),
    head: new THREE.SphereGeometry(0.40, 14, 10),
    eye: new THREE.SphereGeometry(0.055, 7, 5),
    arm: new THREE.CapsuleGeometry(0.11, 0.28, 3, 8),
    foot: new THREE.CylinderGeometry(0.14, 0.14, 0.16, 10),
    capCrown: new THREE.CylinderGeometry(0.29, 0.31, 0.18, 12),
    capBrim: new THREE.BoxGeometry(0.33, 0.06, 0.26),
    cone: new THREE.ConeGeometry(0.27, 0.52, 10),
    pom: new THREE.SphereGeometry(0.09, 8, 6),
    ring: new THREE.TorusGeometry(0.34, 0.045, 6, 20),
    bag: new THREE.BoxGeometry(0.34, 0.36, 0.16),
    strap: new THREE.BoxGeometry(0.06, 0.62, 0.05),
  };

  const skinMats = SKINS.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1e1e1e });
  const dark = new THREE.MeshLambertMaterial({ color: 0x3a3a3a });
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });
  const moodMats = {
    happy: new THREE.MeshBasicMaterial({ color: 0x4cb42f }),
    angry: new THREE.MeshBasicMaterial({ color: 0xff5b5b }),
  };

  const root = new THREE.Group();
  root.name = 'customers';
  if (scene) scene.add(root);

  const shadowMat = new THREE.MeshBasicMaterial({
    map: makeShadowTexture(THREE), transparent: true, depthWrite: false, opacity: 0.9,
  });
  const shadowGeo = new THREE.PlaneGeometry(1.3, 1.3);
  const glassesGeo = new THREE.TorusGeometry(0.095, 0.018, 5, 12);

  const bubbleCache = new Map();
  function bubbleTexture(symbol) {
    if (bubbleCache.has(symbol)) return bubbleCache.get(symbol);
    const c = document.createElement('canvas');
    c.width = 128; c.height = 128;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(255,253,247,0.96)';
    g.beginPath();
    if (g.roundRect) g.roundRect(8, 8, 112, 96, 26);
    else g.rect(8, 8, 112, 96);
    g.fill();
    g.beginPath();
    g.moveTo(52, 100); g.lineTo(64, 122); g.lineTo(76, 100);
    g.fill();
    g.font = '68px system-ui,sans-serif';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(symbol, 64, 56);
    const tex = new THREE.CanvasTexture(c);
    tex.colorSpace = THREE.SRGBColorSpace;
    bubbleCache.set(symbol, tex);
    return tex;
  }

  function mk(geometry, material, x, y, z) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    return m;
  }  function buildAvatar(){
    const g = new THREE.Group();
    const v = pickVariant();
    const shirt = new THREE.MeshLambertMaterial({ color: pick(SHIRTS) });
    const body = mk(geo.body, shirt, 0, 0.86, 0);
    body.scale.setScalar(v.body);
    g.add(body);
    const headY = 1.58 + 0.06 * v.head;
    const head = mk(geo.head, pick(skinMats), 0, headY, 0);
    head.scale.setScalar(v.head);
    g.add(head);
    const eyeY = headY + 0.06 * v.head;
    const eyeX = 0.14 * v.head, eyeZ = 0.34 * v.head;
    g.add(mk(geo.eye, eyeMat, -eyeX, eyeY, eyeZ));
    g.add(mk(geo.eye, eyeMat, eyeX, eyeY, eyeZ));
    g.add(mk(geo.foot, dark, -0.15, 0.08, 0));
    g.add(mk(geo.foot, dark, 0.15, 0.08, 0));

    const armL = new THREE.Group();
    const armR = new THREE.Group();
    armL.position.set(-0.46, 1.14, 0);
    armR.position.set(0.46, 1.14, 0);
    armL.add(mk(geo.arm, shirt, 0, -0.22, 0));
    armR.add(mk(geo.arm, shirt, 0, -0.22, 0));
    g.add(armL);
    g.add(armR);

    const hat = Math.floor(Math.random() * 4);
    if (hat === 1) {
      const c = new THREE.MeshLambertMaterial({ color: pick(HATS) });
      g.add(mk(geo.capCrown, c, 0, headY + 0.28 * v.head, 0));
      g.add(mk(geo.capBrim, c, 0, headY + 0.23 * v.head, 0.29 * v.head));
    } else if (hat === 2) {
      const c = new THREE.MeshLambertMaterial({ color: pick(HATS) });
      g.add(mk(geo.cone, c, 0, headY + 0.58 * v.head, 0));
      g.add(mk(geo.pom, white, 0, headY + 0.87 * v.head, 0));
    }

    /* aksesuar: gözlük, sırt çantası ya da saç bağı */
    const acc = Math.random();
    if (acc < 0.18) {
      const gm = new THREE.MeshLambertMaterial({ color: 0x2a2a30 });
      const gl = new THREE.Mesh(glassesGeo, gm);
      const gr = new THREE.Mesh(glassesGeo, gm);
      gl.position.set(-eyeX, eyeY, eyeZ + 0.02);
      gr.position.set(eyeX, eyeY, eyeZ + 0.02);
      g.add(gl, gr);
    } else if (acc < 0.34) {
      const bagMat = new THREE.MeshLambertMaterial({ color: pick(HATS) });
      const bag = mk(geo.bag, bagMat, 0, 1.02, -0.34);
      bag.rotation.x = -0.16;
      g.add(bag);
      const strap = mk(geo.strap, bagMat, 0, 1.3, -0.18);
      strap.rotation.x = 0.28;
      g.add(strap);
    } else if (acc < 0.46) {
      const bowMat = new THREE.MeshLambertMaterial({ color: pick(HATS) });
      const bl = mk(geo.pom, bowMat, -0.14 * v.head, headY + 0.3 * v.head, 0);
      bl.scale.setScalar(1.6);
      const br = mk(geo.pom, bowMat, 0.14 * v.head, headY + 0.3 * v.head, 0);
      br.scale.setScalar(1.6);
      g.add(bl, br);
      g.add(mk(geo.pom, white, 0, headY + 0.3 * v.head, 0.05));
    }

    /* yumuşak gölge: bob sırasında yerde kalsın diye ayrı izlenir */
    const shadow = new THREE.Mesh(shadowGeo, shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.y = 0.02;
    shadow.renderOrder = -1;
    g.add(shadow);


    const bubble = new THREE.Sprite(new THREE.SpriteMaterial({
      map: bubbleTexture('🍰'), transparent: true, depthWrite: false, depthTest: false,
    }));
    bubble.scale.set(0.85, 0.85, 1);
    bubble.position.y = 2.45;
    bubble.visible = false;
    g.add(bubble);

    const ring = new THREE.Mesh(geo.ring, new THREE.MeshBasicMaterial({
      color: 0x4cb42f, transparent: true, opacity: 0.95, depthWrite: false,
    }));
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 2.16;
    ring.visible = false;
    g.add(ring);

    g.traverse((o) => { if (o.isMesh) o.castShadow = false; });
    g.visible = false;
    root.add(g);

    return { obj: g, armL, armR, bubble, ring, shadow, baseScale: v.s };
  }

  const pick = (a) => a[Math.floor(Math.random() * a.length)];

  const queues = stations.map(() => []);
  const timers = stations.map(() => -1);

  const npcs = [];
  for (let i = 0; i < count; i++) {
    const n = Object.assign(buildAvatar(), {
      x: 0, z: 0, yaw: 0, faceYaw: 0, phase: Math.random() * 6.28,
      state: 'idle', station: -1, slot: 0, wait: 0, patience: 1,
      timer: 0, exitX: 0, exitZ: 0, speed: WALK_SPEED * (0.9 + Math.random() * 0.25),
    });
    npcs.push(n);
  }

  const owned = (i) => {
    const o = getOwned();
    return !!(o && o[i] !== null && o[i] !== undefined);
  };

  function slotPos(i, k) {
    const s = stations[i] || { x: 0, z: 0 };
    const side = k % 2 === 0 ? -0.45 : 0.45;
    return { x: s.x + side, z: s.z + 2.35 + k * 1.08 };
  }

  function edgePoint() {
    const a = Math.random() * Math.PI * 2;
    return { x: Math.cos(a) * (EDGE - 0.6), z: Math.sin(a) * (EDGE - 0.6) };
  }

  /* Müşteri tezgahın 7-10 birim uzağından gelir: hem hızlı ulaşır hem de
     plazanın öbür ucundan yürümek zorunda kalmaz. Oyuncunun bulunduğu yön
     ters çevrilir ki doğrudan kameranın içine yürümesinler. */
  function approachPoint(s) {
    let a = Math.random() * Math.PI * 2;
    const p = getPlayer ? getPlayer() : null;
    if (p) {
      const toPlayer = Math.atan2(p.z - s.z, p.x - s.x);
      a = toPlayer + Math.PI + (Math.random() - 0.5) * 2.2;
    }
    const r = 7 + Math.random() * 3;
    return {
      x: Math.max(-EDGE + 1, Math.min(EDGE - 1, s.x + Math.cos(a) * r)),
      z: Math.max(-EDGE + 1, Math.min(EDGE - 1, s.z + Math.sin(a) * r)),
    };
  }

  function reindex(i) {
    const q = queues[i];
    for (let k = 0; k < q.length; k++) q[k].slot = k;
  }

  function dismiss(n, mood) {
    if (n.station >= 0) {
      const q = queues[n.station];
      const at = q.indexOf(n);
      if (at >= 0) {
        q.splice(at, 1);
        reindex(n.station);
      }
      if (mood === 'angry' && at >= 0) onLost(n.station, n);
    }
    n.state = 'leave';
    n.timer = LEAVE_TIME;
    n.vip = false;
    n.obj.scale.setScalar(n.baseScale);
    n.bubble.visible = true;
    n.bubble.material.color.setHex(0xffffff);
    n.bubble.material.map = bubbleTexture(mood === 'angry' ? '😞' : '😋');
    n.bubble.material.needsUpdate = true;
    n.ring.visible = false;
    const p = edgePoint();
    n.exitX = p.x;
    n.exitZ = p.z;
    n.station = -1;
  }

  function spawn(i) {
    const free = npcs.find((n) => n.state === 'idle');
    if (!free) return null;
    const s = stations[i] || { x: 0, z: 0 };
    const p = approachPoint(s);
    const q = queues[i];
    if (q.length >= queueCap(i)) return null;
    free.station = i;
    free.slot = q.length;
    free.wait = 0;
    free.vip = Math.random() < 0.12;
    free.patience = levelPatience(getLevel(i)) * (free.vip ? 0.8 : 1);
    free.state = 'walk';
    free.timer = 0;
    free.cheer = 0;
    free.bubbleTag = null;
    free.ring.material.color.setHex(free.vip ? 0xffc400 : 0x4cb42f);
    free.x = p.x;
    free.z = p.z;
    free.yaw = Math.atan2(s.x - p.x, s.z - p.z);
    free.faceYaw = free.yaw;
    free.obj.position.set(p.x, 0, p.z);
    free.obj.visible = true;
    free.obj.rotation.y = free.yaw;
    free.ring.visible = false;
    free.bubble.visible = true;
    free.bubble.material.map = bubbleTexture((s && s.emoji) || '🍰');
    free.bubble.material.color.setHex(free.vip ? 0xffe14d : 0xffffff);
    free.bubble.material.needsUpdate = true;
    free.obj.scale.setScalar(free.baseScale * (free.vip ? 1.1 : 1));
    q.push(free);
    return free;
  }

  function update(dt) {
    const d = Math.min(Math.max(dt || 0, 0), 0.1);
    const rush = !!opts.isRush && opts.isRush();

    /* --- doğma saatleri --- */
    for (let i = 0; i < stations.length; i++) {
      if (!owned(i)) {
        if (queues[i].length) {
          for (const n of queues[i].slice()) dismiss(n, 'sad');
          queues[i].length = 0;
        }
        timers[i] = -1;
        continue;
      }
      const cap = queueCap(i);
      if (timers[i] < 0) timers[i] = 0.5 + Math.random() * 1.2;
      if (queues[i].length >= cap) continue;
      timers[i] -= d;
      if (timers[i] <= 0) {
        const gap = levelSpawnGap(getLevel(i)) * (0.8 + Math.random() * 0.45);
        timers[i] = gap * (rush ? TUNING.rushGap : 1);
        spawn(i);
        if (queues[i].length < cap && Math.random() < TUNING.spawnDoubleChance) spawn(i);
      }
    }

    /* --- müşteri hareketi --- */
    for (const n of npcs) {
      if (n.state === 'idle') continue;

      if (n.state === 'leave') {
        n.timer -= d;
        if (n.cheer > 0) n.cheer -= d;
        const dx = n.exitX - n.x, dz = n.exitZ - n.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.35) {
          const step = Math.min(dist, n.speed * d);
          n.x += dx / dist * step;
          n.z += dz / dist * step;
          n.faceYaw = Math.atan2(dx, dz);
          n.phase += d * 11;
        } else if (n.timer > 1) {
          n.timer = 1;
        }
        if (n.timer <= 0) {
          n.state = 'idle';
          n.obj.visible = false;
          n.ring.visible = false;
          n.bubble.visible = false;
          continue;
        }
        animate(n, d, 0);
        continue;
      }

      const target = n.station >= 0 ? slotPos(n.station, n.slot) : null;
      if (!target) { n.state = 'idle'; n.obj.visible = false; continue; }

      if (n.state === 'walk') {
        const dx = target.x - n.x, dz = target.z - n.z;
        const dist = Math.hypot(dx, dz);
        if (dist <= 0.22) {
          n.state = 'queue';
          n.wait = 0;
          n.bubble.visible = true;
          n.ring.visible = true;
          onArrive(n.station, n);
          n.faceYaw = Math.atan2(
            (stations[n.station].x - n.x),
            (stations[n.station].z - n.z),
          );
        } else {
          const step = Math.min(dist, n.speed * d);
          n.x += dx / dist * step;
          n.z += dz / dist * step;
          n.faceYaw = Math.atan2(dx, dz);
          n.phase += d * 10;
        }
      } else if (n.state === 'queue') {
        /* kuyruk ilerledikçe hedefe doğru kay */
        const dx = target.x - n.x, dz = target.z - n.z;
        const dist = Math.hypot(dx, dz);
        if (dist > 0.05) {
          n.x += dx * Math.min(1, d * 6);
          n.z += dz * Math.min(1, d * 6);
        }
        /* sabır yalnızca oyuncu tezgahın yanındayken azalır:
           uzaktaki dükkanların kuyruğu seni bekler, ceza yemez. */
        const p = getPlayer ? getPlayer() : null;
        const sdef = stations[n.station] || { x: 0, z: 0 };
        const near = !p || Math.hypot(p.x - sdef.x, p.z - sdef.z) < 10;
        if (near) n.wait += d;
        const left = Math.max(0, 1 - n.wait / n.patience);
        n.ring.scale.setScalar(Math.max(0.05, left));
        n.ring.material.color.setHex(n.vip ? (left > 0.3 ? 0xffc400 : 0xff5b5b) : left > 0.55 ? 0x4cb42f : left > 0.28 ? 0xffb300 : 0xff5b5b);
        n.ring.material.opacity = 0.55 + 0.45 * left;
        /* sabrın son çeyreğinde balon "gecikiyorum" der */
        const wantTag = left < 0.3 ? '⏳' : null;
        if (!n.vip && n.bubbleTag !== wantTag){
          n.bubbleTag = wantTag;
          n.bubble.material.map = bubbleTexture(wantTag || ((stations[n.station] && stations[n.station].emoji) || '🍰'));
          n.bubble.material.needsUpdate = true;
        }
        if (n.wait >= n.patience) dismiss(n, 'angry');
      }

      animate(n, d, n.state === 'queue' ? n.wait / n.patience : 0);
    }
  }

  function animate(n, d, urgency) {
    if (n.state === 'leave' && n.cheer > 0) {
      const t = 1 - n.cheer / 0.7;
      n.armL.rotation.x = -2.4;
      n.armR.rotation.x = -2.4;
      n.obj.position.set(n.x, Math.sin(t * Math.PI) * 0.5, n.z);
      n.obj.rotation.y = n.yaw + t * Math.PI * 2;
      return;
    }
    const walking = n.state === 'walk' || n.state === 'leave';
    if (walking) {
      const swing = Math.sin(n.phase);
      n.armL.rotation.x = swing * 0.8;
      n.armR.rotation.x = -swing * 0.8;
      n.obj.position.set(n.x, Math.abs(Math.sin(n.phase)) * 0.05, n.z);
    } else if (n.state === 'queue') {
      const fidget = Math.sin(n.phase + urgency * 12) * 0.12;
      n.armL.rotation.x += (-fidget - n.armL.rotation.x) * Math.min(1, d * 8);
      n.armR.rotation.x += (fidget - n.armR.rotation.x) * Math.min(1, d * 8);
      n.obj.position.set(n.x, urgency > 0.85 ? Math.abs(Math.sin(n.phase * 2.4)) * 0.07 : 0, n.z);
      n.phase += d * 2.2;
    }
    const da = Math.atan2(Math.sin(n.faceYaw - n.yaw), Math.cos(n.faceYaw - n.yaw));
    n.yaw += da * Math.min(1, d * 8);
    n.obj.rotation.y = n.yaw;
    /* gölge zıplamayla birlikte havalanmasın */
    if (n.shadow) n.shadow.position.y = 0.02 - n.obj.position.y;
  }

  /* --- servis --- */
  function serve(i) {
    const q = queues[i];
    if (!q || !q.length) return null;
    const n = q.shift();
    reindex(i);
    const wait = n.wait;
    const patience = n.patience;
    n.station = -1;
    n.state = 'leave';
    n.timer = LEAVE_TIME;
    n.cheer = 0.7;
    n.obj.scale.setScalar(n.baseScale);
    n.bubble.visible = true;
    n.bubble.material.map = bubbleTexture('😋');
    n.bubble.material.needsUpdate = true;
    n.ring.visible = false;
    const p = edgePoint();
    n.exitX = p.x;
    n.exitZ = p.z;
    onServed(i, n, wait, patience);
    return n;
  }

  const queueLen = (i) => (queues[i] ? queues[i].length : 0);
  const queueInfo = (i) => {
    const q = queues[i] || [];
    if (!q.length) return null;
    const front = q[0];
    return { len: q.length, wait: front.wait, patience: front.patience, ratio: 1 - front.wait / front.patience, vip: !!front.vip };
  };

  function reset() {
    for (const n of npcs) {
      n.state = 'idle';
      n.obj.visible = false;
      n.ring.visible = false;
      n.bubble.visible = false;
      n.station = -1;
    }
    for (const q of queues) q.length = 0;
    for (let i = 0; i < timers.length; i++) timers[i] = -1;
  }

  return { group: root, npcs, update, serve, queueLen, queueInfo, reset, slotPos };
}
