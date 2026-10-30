/* Tatlı Tycoon — plaza decoration builder.
   buildDecor(THREE, helpers) → THREE.Group (attached to helpers.scene, already positioned).
   userData.animated: water discs (caller rotates them); userData.signBoard: entrance board mesh.
   userData.interactives: [{id, object3D, radius, near, label, onInteract(state), onNear(state, dt)}]
   userData.updateInteractives(dt, playerPos, state): her karede çağrılır, tüm animasyonu sürer.
   Layout: plaza 38x38, fence ±19, station pads at the 10 given spots (keep 2.5 clear),
   corridor x=0 from z=12 to z=-6 stays walkable — only the fountain sits in it (path splits around). */
export function buildDecor(THREE, helpers){
  const { scene, M, G, add } = helpers;

  /* geometry lookup with fallbacks when helpers.G lacks a key */
  const FB = {
    box:   () => new THREE.BoxGeometry(1, 1, 1),
    cyl:   () => new THREE.CylinderGeometry(.5, .5, 1, 12),
    cyl24: () => new THREE.CylinderGeometry(.5, .5, 1, 20),
    sph:   () => new THREE.SphereGeometry(.5, 12, 10),
    sphLo: () => new THREE.SphereGeometry(.5, 8, 6),
    cone:  () => new THREE.ConeGeometry(.5, 1, 10),
    torus: () => new THREE.TorusGeometry(.5, .2, 8, 18),
    capsule: () => THREE.CapsuleGeometry ? new THREE.CapsuleGeometry(.5, 1, 4, 10) : new THREE.CylinderGeometry(.5, .5, 1, 10),
    plane: () => new THREE.PlaneGeometry(1, 1),
  };
  const fb = {};
  const geo = (k) => (G && G[k]) || fb[k] || (fb[k] = (FB[k] || FB.box)());

  const root = new THREE.Group();
  root.userData.animated = [];
  root.userData.signBoard = null;
  root.userData.interactives = [];
  const reg = (o) => { o.near = false; root.userData.interactives.push(o); return o; };

  const put = (parent, k, mat, x, y, z, sx, sy, sz) => {
    let m = add ? add(parent, geo(k), mat, x, y, z, sx, sy, sz) : null;
    if (!m){
      m = new THREE.Mesh(geo(k), mat);
      m.position.set(x || 0, y || 0, z || 0);
      if (sx !== undefined) m.scale.set(sx, sy === undefined ? sx : sy, sz === undefined ? sx : sz);
      parent.add(m);
    }
    m.castShadow = true;
    m.receiveShadow = true;
    return m;
  };

  /* saturated kid palette */
  const stone  = M(0xdcd4c6), stoneD = M(0xbbb1a0), wood = M(0xb07b45), woodD = M(0x8a5a30),
        metal  = M(0x59606c), cream  = M(0xfff6e3), soil = M(0x6b4a2f), leaf  = M(0x4fbf5f),
        leaf2  = M(0x7fe08a), terra  = M(0xe07a4f), gold = M(0xffcf3d, {emissive:0x8a5e00, emissiveIntensity:.3}),
        glow   = M(0xfff0a8, {emissive:0xffdd55, emissiveIntensity:.85}),
        water  = M(0x57d7ff, {transparent:true, opacity:.85, emissive:0x1b6d8a, emissiveIntensity:.25}),
        rope = M(0x8a5a30);
  const POP = [M(0xff5b5b), M(0xffd400), M(0x3aa0ff), M(0x4fbf5f), M(0xb06bff), M(0xff8ad0)];

  /* ---------- interaction runtime (all driven by updateInteractives) ---------- */
  const rt = { t: 0, fountain: null };
  const flags = [], balloons = [], swings = [];
  let signG = null, signMat = null;

  /* ---------- central fountain (0,0) ---------- */
  {
    const g = new THREE.Group();
    put(g, 'cyl', stoneD, 0, .15, 0, 4.6, .3, 4.6);
    put(g, 'cyl', stone, 0, .5, 0, 4.0, .6, 4.0);
    const w1 = put(g, 'cyl24', water, 0, .76, 0, 3.7, .06, 3.7);
    put(g, 'cyl', stoneD, 0, 1.4, 0, .7, 1.6, .7);
    const bowl = put(g, 'cone', stoneD, 0, 1.95, 0, 1.9, .5, 1.9);
    bowl.rotation.x = Math.PI;
    put(g, 'cyl', stone, 0, 2.3, 0, 2.1, .2, 2.1);
    const w2 = put(g, 'cyl24', water, 0, 2.36, 0, 1.75, .05, 1.75);
    put(g, 'cyl', gold, 0, 2.62, 0, .3, .5, .3);
    put(g, 'sph', gold, 0, 3.0, 0, .55);
    /* boosted jet ring — hidden until the player interacts */
    const ring = new THREE.Group();
    for (let i = 0; i < 6; i++){
      const a = i / 6 * Math.PI * 2;
      put(ring, 'sphLo', gold, Math.cos(a) * 2.6, 1.5, Math.sin(a) * 2.6, .34);
    }
    ring.visible = false;
    g.add(ring);
    g.position.set(0, 0, 0);
    root.add(g);
    root.userData.animated = [w1, w2];
    const f = { g, w1, w2, ring, boost: 0, base: [w1.scale.clone(), w2.scale.clone()] };
    rt.fountain = f;
    reg({
      id: 'fountain', object3D: g, radius: 3.2, label: 'Fıskiye',
      onInteract(state){ f.boost = 3; state.fountainBoost = 3; },
      onNear(state, dt){
        if (f.boost > 0) f.boost = Math.max(0, f.boost - dt);
        if ('fountainBoost' in state) state.fountainBoost = f.boost;   // caller reads, we own the countdown
        const on = f.boost > 0;
        f.ring.visible = on;
        f.w1.rotation.y += dt * (on ? 2.6 : 0);         // caller still adds its own idle spin
        f.w2.rotation.y -= dt * (on ? 3.4 : 0);
        const s = on ? 1 + 0.07 * Math.min(1, f.boost) : 1;
        f.w1.scale.set(f.base[0].x * s, f.base[0].y * s, f.base[0].z * s);
        f.w2.scale.set(f.base[1].x * s, f.base[1].y * (on ? 1.8 : 1), f.base[1].z * s);
        if (on){
          f.ring.rotation.y += dt * 4;
          f.ring.position.y = Math.sin(rt.t * 6) * .25;
        }
      },
    });
  }

  /* ---------- taş döşeli yürüyüş yolu (spawn → çeşme → tezgah sıraları) ----------
     Dokulu düzlemler: tek karelik dokuyu tekrarlayarak kesintisiz taş görünümü verir. */
  const pathTexture = (repX, repY) => {
    const c = document.createElement('canvas');
    c.width = c.height = 128;
    const q = c.getContext('2d');
    q.fillStyle = '#efd7ab';
    q.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 4; i++) for (let j = 0; j < 4; j++){
      q.fillStyle = (i + j) % 2 ? '#f7e5c1' : '#e9cf9f';
      q.fillRect(i * 32 + 2, j * 32 + 2, 28, 28);
      q.fillStyle = 'rgba(255,255,255,.4)';
      q.fillRect(i * 32 + 2, j * 32 + 2, 28, 3);
      q.fillStyle = 'rgba(150,120,70,.12)';
      q.fillRect(i * 32 + 2, j * 32 + 28, 28, 2);
    }
    const t = new THREE.CanvasTexture(c);
    t.wrapS = t.wrapT = THREE.RepeatWrapping;
    t.repeat.set(repX, repY);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 4;
    return new THREE.MeshLambertMaterial({ map: t });
  };
  const pavePlane = (mat, cx, cz, w, d) => {
    const p = new THREE.Mesh(new THREE.PlaneGeometry(w, d), mat);
    p.rotation.x = -Math.PI / 2;
    p.position.set(cx, .065, cz);
    p.receiveShadow = true;
    root.add(p);
    return p;
  };
  pavePlane(pathTexture(2, 5), 0, 12.55, 3, 8.1);      // spawn koridoru, z 8.5..16.6
  pavePlane(pathTexture(20, 2), 0, 0, 33, 2.4);        // doğu-batı ekseni
  pavePlane(pathTexture(2, 1), 0, 2.9, 3, 1.2);        // çeşme → kuzey boşluğu
  pavePlane(pathTexture(2, 1), 0, -2.9, 3, 1.2);       // çeşme → güney boşluğu
  /* bordür */
  for (const x of [-1.6, 1.6]) put(root, 'box', stoneD, x, .05, 12.55, .22, .1, 8.1);
  for (const z of [-1.3, 1.3]) put(root, 'box', stoneD, 0, .05, z, 33, .1, .22);

  /* ---------- benches (wood + metal) ---------- */
  const bench = (x, z, ry) => {
    const g = new THREE.Group();
    put(g, 'box', wood, 0, .46, 0, 1.9, .14, .6);
    put(g, 'box', wood, 0, .78, -.26, 1.9, .5, .12).rotation.x = -.12;
    put(g, 'box', metal, -.75, .23, 0, .12, .46, .55);
    put(g, 'box', metal, .75, .23, 0, .12, .46, .55);
    g.position.set(x, 0, z);
    g.rotation.y = ry;
    root.add(g);
  };
  for (const [x, z] of [[3.3,3.3],[-3.3,3.3],[3.3,-3.3],[-3.3,-3.3],[16,3],[16,-3],[-16,3],[-16,-3]])
    bench(x, z, Math.atan2(-x, -z));

  /* ---------- extra lamp posts along the middle paths ---------- */
  const lamps = [[-4.5,-2.2],[4.5,-2.2],[-10,2.2],[10,2.2],[-5.5,9.5],[5.5,9.5],[-5.5,15.5],[5.5,15.5],[-11.5,12.5],[11.5,12.5]];
  for (const [x, z] of lamps){
    const g = new THREE.Group();
    put(g, 'cyl', metal, 0, 1.5, 0, .16, 3.0, .16);
    put(g, 'sph', glow, 0, 3.15, 0, .5);
    put(g, 'cone', metal, 0, 3.55, 0, .55, .4, .55);
    g.position.set(x, 0, z);
    root.add(g);
  }

  /* ---------- bunting strings between lamp posts ---------- */
  const pennants = (ax, az, bx, bz, n) => {
    const dx = bx - ax, dz = bz - az, len = Math.hypot(dx, dz), yaw = Math.atan2(-dz, dx);
    put(root, 'box', rope, (ax + bx) / 2, 2.75, (az + bz) / 2, len, .04, .04).rotation.y = yaw;
    for (let i = 0; i < n; i++){
      const t = (i + 1) / (n + 1);
      put(root, 'cone', POP[i % POP.length], ax + dx * t, 2.45, az + dz * t, .6, .7, .08)
        .rotation.set(0, yaw, Math.PI);
    }
  };
  /* strings routed off the x=0 corridor (spawn→south pads stays clear) */
  pennants(-5.5, 9.5, -11.5, 12.5, 4);
  pennants(5.5, 9.5, 11.5, 12.5, 4);
  pennants(-5.5, 15.5, -11.5, 12.5, 4);
  pennants(5.5, 15.5, 11.5, 12.5, 4);
  pennants(-10, 2.2, -4.5, -2.2, 3);
  pennants(10, 2.2, 4.5, -2.2, 3);

  /* ---------- planters with flowers ---------- */
  const planters = [[-2.8,3.6],[2.8,3.6],[-2.8,-3.6],[2.8,-3.6],[-9.2,9.2],[9.2,9.2],[-9.2,-9.2],[9.2,-9.2],[-11.5,16.2],[11.5,16.2]];
  planters.forEach(([x, z], i) => {
    const g = new THREE.Group();
    put(g, 'box', wood, 0, .27, 0, 1.6, .54, .9);
    put(g, 'box', soil, 0, .55, 0, 1.45, .06, .75);
    for (let f = 0; f < 3; f++)
      put(g, 'sphLo', POP[(i + f * 2) % POP.length], -.45 + f * .45, .73, 0, .34);
    g.position.set(x, 0, z);
    g.rotation.y = (i % 2) * Math.PI / 2;
    root.add(g);
  });

  /* ---------- potted trees on the plaza ---------- */
  const pottedTree = (x, z) => {
    const g = new THREE.Group();
    put(g, 'cyl', terra, 0, .35, 0, .8, .7, .8);
    put(g, 'cyl', woodD, 0, .95, 0, .18, 1.0, .18);
    put(g, 'sph', leaf, 0, 1.9, 0, 1.4);
    put(g, 'sph', leaf2, 0, 2.45, 0, .95);
    g.position.set(x, 0, z);
    root.add(g);
  };
  for (const [x, z] of [[-16,12],[16,12],[-16,-12],[16,-12],[-7.5,16],[7.5,16]]) pottedTree(x, z);

  /* ---------- market stalls (pure decoration, not tied to stations) ---------- */
  /* balloon cart */
  {
    const g = new THREE.Group();
    put(g, 'box', POP[0], 0, .75, 0, 1.5, .9, 1.0);
    put(g, 'box', cream, 0, 1.25, 0, 1.55, .12, 1.05);
    put(g, 'cyl', metal, -.55, .33, 0, .65, .16, .65).rotation.z = Math.PI / 2;
    put(g, 'cyl', metal, .55, .33, 0, .65, .16, .65).rotation.z = Math.PI / 2;
    put(g, 'cyl', metal, 0, 2.1, 0, .08, 1.7, .08);
    [[0,3.0,0],[.35,2.85,.15],[-.35,2.9,.1],[.15,2.75,-.3],[-.2,2.7,-.25]]
      .forEach(([bx, by, bz], i) => balloons.push({
        m: put(g, 'sph', POP[(i + 1) % POP.length], bx, by, bz, .45), s: .45, t: 0, alive: true,
      }));
    g.position.set(-9, 0, 1.5);
    root.add(g);
    reg({
      id: 'balloons', object3D: g, radius: 2.4, label: 'Balon Arabası',
      onInteract(){
        let n = 0;
        for (const b of balloons){
          if (b.t <= 0 && n++ < 3) b.t = 2;          // 3 balon: patla, 2 sn sonra geri gel
        }
      },
      onNear(state, dt){
        for (const b of balloons){
          if (b.t > 0){
            b.t = Math.max(0, b.t - dt);
            b.m.scale.setScalar(b.t > 0 ? 0 : b.s);   // patladı → 2 sn yok → geri gel
          } else if (b.m.scale.x !== b.s){
            b.m.scale.setScalar(b.s);
          }
        }
      },
    });
  }
  /* flower stand */
  {
    const g = new THREE.Group();
    put(g, 'box', POP[3], 0, .5, 0, 1.6, 1.0, 1.0);
    put(g, 'box', wood, 0, 1.06, 0, 1.7, .14, 1.1);
    [-.5, 0, .5].forEach((bx, i) => {
      put(g, 'cyl', POP[(i + 2) % POP.length], bx, 1.28, 0, .34, .36, .34);
      put(g, 'sph', POP[(i + 4) % POP.length], bx, 1.62, 0, .5);
    });
    g.position.set(9, 0, 1.5);
    root.add(g);
  }
  /* ice-cream cooler + cone prop */
  {
    const g = new THREE.Group();
    put(g, 'box', cream, 0, .55, 0, 1.4, .9, 1.0);
    put(g, 'box', POP[2], 0, 1.06, 0, 1.5, .18, 1.1);
    put(g, 'box', POP[2], 0, .25, 0, 1.45, .16, .95);
    put(g, 'cone', wood, .95, .55, 0, .7, 1.1, .7).rotation.z = Math.PI;
    put(g, 'sph', POP[5], .95, 1.3, 0, .75);
    g.position.set(-14, 0, 12);
    root.add(g);
  }
  /* hat stand */
  {
    const g = new THREE.Group();
    put(g, 'box', wood, 0, .5, 0, 1.5, .9, 1.0);
    [-.45, .05, .45].forEach((hx, i) => {
      put(g, 'cyl', POP[i], hx, 1.12, 0, .7, .08, .7);
      put(g, 'cone', POP[(i + 1) % POP.length], hx, 1.3, 0, .5, .36, .5);
    });
    g.position.set(14, 0, 12);
    root.add(g);
  }
  /* small A-frame signboard near spawn */
  {
    const g = new THREE.Group();
    put(g, 'box', POP[4], 0, .72, -.1, 1.1, 1.3, .08).rotation.x = .2;
    put(g, 'box', POP[1], 0, .72, .1, 1.1, 1.3, .08).rotation.x = -.2;
    g.position.set(-4.2, 0, 13.6);
    g.rotation.y = .35;
    root.add(g);
  }

  /* ---------- big entrance sign frame over the north entrance ---------- */
  {
    const g = new THREE.Group();
    put(g, 'cyl', metal, -3, 2.7, 0, .3, 5.4, .3);
    put(g, 'cyl', metal, 3, 2.7, 0, .3, 5.4, .3);
    put(g, 'box', POP[0], 0, 4.4, -.12, 7.0, 2.4, .18);
    const board = put(g, 'box', cream, 0, 4.4, .05, 6.4, 2.0, .16);
    put(g, 'sph', gold, -3, 5.55, 0, .55);
    put(g, 'sph', gold, 3, 5.55, 0, .55);
    g.position.set(0, 0, 17);
    root.add(g);
    board.material = cream.clone();          // own material so the glow pulse can't leak onto shared cream
    board.material.emissive.setHex(0xffe066);
    board.material.emissiveIntensity = 0;
    root.userData.signBoard = board;
    signMat = board.material;
    signG = g;
    let bounce = 0;
    reg({
      id: 'sign', object3D: g, radius: 4, label: 'Giriş Tabelası',
      onInteract(){ bounce = .6; },
      onNear(state, dt){
        const target = state.near === true ? .55 + Math.sin(rt.t * 3) * .25 : 0;
        signMat.emissiveIntensity += (target - signMat.emissiveIntensity) * Math.min(1, dt * 8);
        if (bounce > 0){
          bounce = Math.max(0, bounce - dt);
          signG.position.y = Math.sin((1 - bounce / .6) * Math.PI) * .45;
        } else if (signG.position.y !== 0) signG.position.y = 0;
      },
    });
  }

  /* ---------- 3 flagpoles ---------- */
  [[-16, 6.8], [16, 6.8], [0, -12]].forEach(([x, z], i) => {
    const g = new THREE.Group();
    const poleMat = M(0x59606c, { emissive: 0xffd400, emissiveIntensity: 0 });
    put(g, 'cyl', poleMat, 0, 2.4, 0, .22, 4.8, .22);
    put(g, 'sph', gold, 0, 4.92, 0, .42);
    const pivot = new THREE.Group();
    pivot.position.set(0, 4.0, 0);
    put(pivot, 'box', [POP[0], POP[2], POP[3]][i], 1.05, 0, 0, 2.1, 1.15, .06);
    g.add(pivot);
    g.position.set(x, 0, z);
    root.add(g);
    flags.push({ g, pivot, poleMat, spin: 0, ph: i * 1.7 });
  });
  flags.forEach((f, i) => reg({
    id: 'flag' + i,
    object3D: f.g,
    radius: 2.4,
    label: 'Bayrak ' + (i + 1),
    onInteract(){ f.spin = 1.2; },
    onNear(state, dt){
      f.pivot.rotation.z = Math.sin(rt.t * 2 + f.ph) * .13;      // idle wave
      if (f.spin > 0){
        f.spin = Math.max(0, f.spin - dt);
        f.pivot.rotation.y = (1 - f.spin / 1.2) * Math.PI * 2;   // full turn on interact
        f.poleMat.emissiveIntensity = Math.min(1, f.spin * 1.6);
      } else {
        f.pivot.rotation.y = 0;
        f.poleMat.emissiveIntensity = 0;
      }
    },
  }));

  /* ---------- wishing well by the spawn ---------- */
  {
    const g = new THREE.Group();
    put(g, 'cyl', stoneD, 0, .28, 0, 2.2, .56, 2.2);
    put(g, 'cyl', stone, 0, .6, 0, 1.9, .16, 1.9);
    put(g, 'cyl24', water, 0, .58, 0, 1.7, .05, 1.7);
    put(g, 'cyl', woodD, -.95, 1.55, 0, .18, 2.0, .18);
    put(g, 'cyl', woodD, .95, 1.55, 0, .18, 2.0, .18);
    put(g, 'box', terra, 0, 2.55, 0, 2.5, .16, 1.2);
    put(g, 'sph', gold, 0, 2.72, 0, .3);
    const coin = put(g, 'cyl', gold, 0, .9, 0, .34, .07, .34);
    coin.rotation.x = Math.PI / 2;
    coin.visible = false;
    g.position.set(3.6, 0, 10.6);
    root.add(g);
    let cd = 0, coinT = 0;
    reg({
      id: 'well', object3D: g, radius: 2.2, label: 'Dilek Kuyusu',
      onInteract(state){
        if (cd > 0) return;                       // shortcut: 8 s locale cooldown, no UI hint yet
        cd = 8; coinT = .7; coin.visible = true;
        state.wellCoins = (state.wellCoins || 0) + 1;
      },
      onNear(state, dt){
        if (cd > 0) cd = Math.max(0, cd - dt);
        if (coinT > 0){
          coinT = Math.max(0, coinT - dt);
          const k = 1 - coinT / .7;
          coin.position.y = .9 + Math.sin(k * Math.PI) * 1.5;
          coin.rotation.y += dt * 14;
          if (coinT === 0){ coin.visible = false; coin.position.y = .9; }
        }
      },
    });
  }

  /* ---------- swing set ---------- */
  {
    const g = new THREE.Group();
    put(g, 'cyl', woodD, -1.8, 1.3, 0, .18, 2.6, .18);
    put(g, 'cyl', woodD, 1.8, 1.3, 0, .18, 2.6, .18);
    put(g, 'cyl', woodD, 0, 2.55, 0, .16, 3.8, .16).rotation.z = Math.PI / 2;
    [-.95, .95].forEach((sx, i) => {
      const p = new THREE.Group();
      p.position.set(sx, 2.5, 0);
      put(p, 'cyl', rope, -.35, -1.0, 0, .07, 2.0, .07);
      put(p, 'cyl', rope, .35, -1.0, 0, .07, 2.0, .07);
      put(p, 'box', POP[i ? 2 : 5], 0, -2.0, 0, .9, .12, .5);
      g.add(p);
      swings.push({ p, ph: i * 2.1, wild: 0 });
    });
    g.position.set(-12.6, 0, 11.5);
    g.rotation.y = .3;
    root.add(g);
    reg({
      id: 'swing', object3D: g, radius: 3, label: 'Salıncaklar',
      onInteract(){ for (const s of swings) s.wild = 2; },
      onNear(state, dt){
        for (const s of swings){
          if (s.wild > 0) s.wild = Math.max(0, s.wild - dt);
          const amp = .2 + (s.wild > 0 ? .55 : 0);
          const spd = 2.2 + (s.wild > 0 ? 5.5 : 0);
          s.p.rotation.x = Math.sin(rt.t * spd + s.ph) * amp;
        }
      },
    });
  }

  /* ---------- ground details ---------- */
  for (const [x, z] of [[-4,-9],[5,11],[11,-3]]) put(root, 'cyl', metal, x, .035, z, 1.2, .05, 1.2);
  for (const [x, z, r] of [[-10.8,0.2,.3],[10.8,0.2,-.4],[-11.8,14.2,.2],[15.2,13.2,-.3]])
    put(root, 'box', wood, x, .36, z, .75, .72, .75).rotation.y = r;
  for (const [x, z] of [[-8.6,3.0],[-15,10.8],[8.4,-2.0]]){
    put(root, 'cyl', woodD, x, .45, z, .62, .9, .62);
    put(root, 'cyl', metal, x, .45, z, .66, .12, .66);
  }

  /* ---------- interaction driver ---------- */
  const inter = root.userData.interactives;
  root.userData.updateInteractives = (dt, playerPos, state) => {
    rt.t += dt;
    for (const o of inter){
      const p = o.object3D.position;
      const dx = playerPos.x - p.x, dz = playerPos.z - p.z;
      o.near = dx * dx + dz * dz <= o.radius * o.radius;
      state.near = o.near;
      o.onNear(state, dt);
    }
  };

  if (scene && scene.add) scene.add(root);
  return root;
}
