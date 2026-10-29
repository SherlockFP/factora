/* NPC customers — walking shoppers for the tycoon plaza.
 *
 * createNpcSystem(THREE, opts) -> { group, npcs, update(dt) }
 *
 * opts:
 *   count   max NPCs (default 8)
 *   owned   array of station ownership (game's state.owned: null = unowned).
 *           NPCs only walk to owned stations; with none owned they wander the plaza.
 *   scene   optional THREE.Scene; adds `group` to it (otherwise caller adds `group`)
 */

const SHIRTS = [0xff7a59, 0x54b8ff, 0x6fdc4f, 0xffb340, 0xb06bff, 0xff5b9d, 0x2ec4b6, 0xffd400];
const SKINS = [0xffd9b0, 0xf1c27d, 0xc68642, 0x8d5524, 0xffe0bd];
const HATS = [0xff5b5b, 0x54b8ff, 0x6fdc4f, 0xffb340, 0xb06bff, 0x2ec4b6];

/* plaza stalls: (0,6) (-7,6) (7,6) (-13,6) (13,6) (-7,-6) (7,-6) (-13,-6) (13,-6) (0,-6) */
const STATIONS = [
  { x: 0, z: 6 }, { x: -7, z: 6 }, { x: 7, z: 6 }, { x: -13, z: 6 }, { x: 13, z: 6 },
  { x: -7, z: -6 }, { x: 7, z: -6 }, { x: -13, z: -6 }, { x: 13, z: -6 }, { x: 0, z: -6 },
];

const LIMIT = 17;          // fence half-width minus a little
const SEP = 1.2;           // keep this much space between NPCs
const WALK_SPEED = 2.2;    // units/sec
const STATION_REACH = 1.6; // stop this far from the stall center
const PAUSE_BASE = 1.5;    // seconds at a stall
const JUMP_LEN = 0.45;     // one hop
const JUMP_H = 0.45;

export function createNpcSystem(THREE, opts = {}) {
  const owned = opts.owned;
  const count = Math.max(0, Math.floor(opts.count === undefined ? 8 : opts.count));

  const geo = {
    body: new THREE.CapsuleGeometry(0.4, 0.6, 4, 10),
    head: new THREE.SphereGeometry(0.42, 14, 10),
    eye: new THREE.SphereGeometry(0.055, 7, 5),
    arm: new THREE.CapsuleGeometry(0.12, 0.3, 3, 8),
    foot: new THREE.CylinderGeometry(0.15, 0.15, 0.16, 10),
    capCrown: new THREE.CylinderGeometry(0.3, 0.32, 0.18, 12),
    capBrim: new THREE.BoxGeometry(0.34, 0.06, 0.26),
    cone: new THREE.ConeGeometry(0.28, 0.55, 10),
    pom: new THREE.SphereGeometry(0.09, 8, 6),
  };
  const skins = SKINS.map((c) => new THREE.MeshLambertMaterial({ color: c }));
  const dark = new THREE.MeshLambertMaterial({ color: 0x2b2b2b });
  const eyeMat = new THREE.MeshLambertMaterial({ color: 0x1e1e1e });
  const white = new THREE.MeshLambertMaterial({ color: 0xffffff });

  const root = new THREE.Group();
  if (opts.scene) opts.scene.add(root);

  const pick = (a) => a[Math.floor(Math.random() * a.length)];
  const clamp = (v) => Math.max(-LIMIT, Math.min(LIMIT, v));
  const stationOwned = (i) => !owned || !!owned[i];

  function mk(geometry, material, x, y, z) {
    const m = new THREE.Mesh(geometry, material);
    m.position.set(x, y, z);
    m.castShadow = true;
    return m;
  }

  /* capsule body, sphere head, cylinder feet, swinging arms, small hat */
  function buildNpc() {
    const g = new THREE.Group();
    const shirt = new THREE.MeshLambertMaterial({ color: pick(SHIRTS) });

    g.add(mk(geo.body, shirt, 0, 0.9, 0));
    g.add(mk(geo.head, pick(skins), 0, 1.72, 0));
    g.add(mk(geo.eye, eyeMat, -0.15, 1.78, 0.36));
    g.add(mk(geo.eye, eyeMat, 0.15, 1.78, 0.36));
    g.add(mk(geo.foot, dark, -0.16, 0.08, 0));
    g.add(mk(geo.foot, dark, 0.16, 0.08, 0));

    const armL = new THREE.Group();
    const armR = new THREE.Group();
    armL.position.set(-0.5, 1.2, 0);
    armR.position.set(0.5, 1.2, 0);
    armL.add(mk(geo.arm, shirt, 0, -0.24, 0));
    armR.add(mk(geo.arm, shirt, 0, -0.24, 0));
    g.add(armL);
    g.add(armR);

    const hat = Math.floor(Math.random() * 3);
    if (hat === 1) {
      const c = new THREE.MeshLambertMaterial({ color: pick(HATS) });
      g.add(mk(geo.capCrown, c, 0, 2.02, 0));
      g.add(mk(geo.capBrim, c, 0, 1.96, 0.3));
    } else if (hat === 2) {
      const c = new THREE.MeshLambertMaterial({ color: pick(HATS) });
      g.add(mk(geo.cone, c, 0, 2.34, 0));
      g.add(mk(geo.pom, white, 0, 2.64, 0));
    }

    root.add(g);
    return { obj: g, armL, armR };
  }

  function pickTarget(n) {
    const free = [];
    for (let i = 0; i < STATIONS.length; i++) if (stationOwned(i)) free.push(i);

    if (free.length) {
      const s = STATIONS[free[Math.floor(Math.random() * free.length)]];
      n.tx = s.x;
      n.tz = s.z;
      n.station = true;
    } else {
      n.tx = (Math.random() * 2 - 1) * 15;
      n.tz = (Math.random() * 2 - 1) * 15;
      n.station = false;
    }
  }

  const npcs = [];
  for (let i = 0; i < count; i++) {
    const n = Object.assign(buildNpc(), {
      x: (Math.random() * 2 - 1) * 15,
      z: (Math.random() * 2 - 1) * 15,
      speed: WALK_SPEED * (0.8 + Math.random() * 0.4),   // ±20%
      pause: PAUSE_BASE * (0.75 + Math.random() * 0.5),
      yaw: Math.random() * Math.PI * 2,
      faceYaw: 0,
      phase: Math.random() * Math.PI * 2,
      state: 'walk',
      timer: 0,
      jumpT: JUMP_LEN * 2,                               // >= 2 hops means not jumping
      tx: 0,
      tz: 0,
      station: false,
    });
    pickTarget(n);
    n.faceYaw = n.yaw;
    n.obj.position.set(n.x, 0, n.z);
    npcs.push(n);
  }

  function update(dt) {
    dt = Math.min(Math.max(dt || 0, 0), 0.1);

    for (const n of npcs) {
      if (n.state === 'pause') {
        n.timer -= dt;
        n.jumpT += dt;
        if (n.timer <= 0) {
          n.state = 'walk';
          pickTarget(n);
        }
        continue;
      }

      const dx = n.tx - n.x;
      const dz = n.tz - n.z;
      const dist = Math.hypot(dx, dz);

      if (dist <= (n.station ? STATION_REACH : 0.35)) {
        if (n.station) {
          n.state = 'pause';
          n.timer = n.pause;
          n.jumpT = 0;
          n.faceYaw = Math.atan2(dx, dz);               // face the counter
        } else {
          pickTarget(n);
        }
        continue;
      }

      const step = Math.min(dist, n.speed * dt);
      n.x += dx / dist * step;
      n.z += dz / dist * step;
      n.phase += dt * 10;
      n.faceYaw = Math.atan2(dx, dz);
    }

    /* push apart so shoppers never stack */
    for (let i = 0; i < npcs.length; i++) {
      const a = npcs[i];
      for (let j = i + 1; j < npcs.length; j++) {
        const b = npcs[j];
        let dx = b.x - a.x;
        let dz = b.z - a.z;
        let d2 = dx * dx + dz * dz;
        if (d2 >= SEP * SEP) continue;
        if (d2 < 1e-6) {
          dx = 0.01 * (j - i);
          dz = 0.01;
          d2 = dx * dx + dz * dz;
        }
        const d = Math.sqrt(d2);
        const push = (SEP - d) * 0.5;
        a.x -= dx / d * push;
        a.z -= dz / d * push;
        b.x += dx / d * push;
        b.z += dz / d * push;
      }
    }

    for (const n of npcs) {
      n.x = clamp(n.x);
      n.z = clamp(n.z);

      const da = Math.atan2(Math.sin(n.faceYaw - n.yaw), Math.cos(n.faceYaw - n.yaw));
      n.yaw += da * Math.min(1, dt * 10);

      let y = 0;
      if (n.state === 'walk') {
        const swing = Math.sin(n.phase);
        n.armL.rotation.x = swing * 0.75;
        n.armR.rotation.x = -swing * 0.75;
        y = Math.abs(Math.sin(n.phase)) * 0.07;
      } else {
        const hopping = n.jumpT < JUMP_LEN * 2;          // exactly two hops
        y = hopping ? Math.abs(Math.sin(n.jumpT * Math.PI / JUMP_LEN)) * JUMP_H : 0;
        const raise = hopping ? -2.3 : 0;                // arms up while cheering
        n.armL.rotation.x += (raise - n.armL.rotation.x) * Math.min(1, dt * 14);
        n.armR.rotation.x += (raise - n.armR.rotation.x) * Math.min(1, dt * 14);
      }

      n.obj.position.set(n.x, y, n.z);
      n.obj.rotation.y = n.yaw;
    }
  }

  return { group: root, npcs, update };
}
