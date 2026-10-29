/* Tatlı Tycoon — plaza decoration builder.
   buildDecor(THREE, helpers) → THREE.Group (attached to helpers.scene, already positioned).
   userData.animated: water discs (caller rotates them); userData.signBoard: entrance board mesh.
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
        pathM  = M(0xffdf9e), rope = M(0x8a5a30);
  const POP = [M(0xff5b5b), M(0xffd400), M(0x3aa0ff), M(0x4fbf5f), M(0xb06bff), M(0xff8ad0)];

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
    g.position.set(0, 0, 0);
    root.add(g);
    root.userData.animated = [w1, w2];
  }

  /* ---------- colored walkway: spawn → fountain → station rows, plus E–W axis ----------
     Ground-height only (0.08 tall); segments stop outside every pad's 2.5 radius. */
  put(root, 'box', pathM, 0, .04, 12.55, 3, .08, 8.1);   // spawn corridor, z 8.5..16.6
  put(root, 'box', pathM, 0, .04, 2.9, 3, .08, 1.2);     // fountain → north pad gap
  put(root, 'box', pathM, 0, .04, -2.9, 3, .08, 1.2);    // fountain → south pad gap
  put(root, 'box', pathM, 0, .04, 0, 33, .08, 2.4);      // east–west plaza axis

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
      .forEach(([bx, by, bz], i) => put(g, 'sph', POP[(i + 1) % POP.length], bx, by, bz, .45));
    g.position.set(-9, 0, 1.5);
    root.add(g);
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
    root.userData.signBoard = board;
  }

  /* ---------- ground details ---------- */
  for (const [x, z] of [[-4,-9],[5,11],[11,-3]]) put(root, 'cyl', metal, x, .035, z, 1.2, .05, 1.2);
  for (const [x, z, r] of [[-10.8,0.2,.3],[10.8,0.2,-.4],[-11.8,14.2,.2],[15.2,13.2,-.3]])
    put(root, 'box', wood, x, .36, z, .75, .72, .75).rotation.y = r;
  for (const [x, z] of [[-8.6,3.0],[-15,10.8],[8.4,-2.0]]){
    put(root, 'cyl', woodD, x, .45, z, .62, .9, .62);
    put(root, 'cyl', metal, x, .45, z, .66, .12, .66);
  }

  if (scene && scene.add) scene.add(root);
  return root;
}
