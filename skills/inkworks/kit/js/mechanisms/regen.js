/* =========================================================================
   Mechanism: a parametric feature tree regenerating (Creo-style).
   Driver variable theta = regen progress. One cycle = 360 = one full pass down the model tree.
   Each phase is one feature in tree order; every solid on screen is a pure function of phi
   and the active parameters, so stepping and scrubbing replay the regen exactly.
   Parameter edits (bolt count, family-table instance) only take effect at the next regen,
   the way a modified dimension waits for Regenerate in Creo.
   Simplified: the page replays the whole tree each pass (like Regenerate All); real Creo starts
   at the first modified feature. Volumes ignore the rib/round overlap (a few grams).
   ========================================================================= */
import { HUES, D2R, mod, clamp01, smooth } from '../kit.js';

// ---------- family table: 1 scene unit = 40 mm ----------
const FAMILY = [
  { name: 'HUB-S', R: 1.6, HUB: 0.6, H: 1.0, BORE: 0.3, T: 0.3 },
  { name: 'HUB-M', R: 2.0, HUB: 0.75, H: 1.4, BORE: 0.38, T: 0.35 },
  { name: 'HUB-L', R: 2.4, HUB: 0.9, H: 1.8, BORE: 0.45, T: 0.4 },
];
const BOLTS = [3, 4, 5, 6, 8, 10, 12];
const MM = 40;
const KG_PER_U3 = (MM / 1000) ** 3 * 7850;   // steel
const RIB_W = 0.12;

/** Relations, as they would be written in Tools > Relations. */
function derive(fam, N) {
  const f = FAMILY[fam];
  const BC = (f.R + f.HUB) / 2;                 // BC = (OD + HUB) / 2   (radii here)
  const HR = 0.055 * f.R;                       // bolt hole radius scales with the flange
  const RR = 0.2 * f.HUB;                       // round radius
  const RIB_L = BC - HR - 0.08 - f.HUB;         // rib stops short of the bolt holes
  const RIB_H = 0.7 * f.H;
  return { ...f, N, BC, HR, RR, RIB_L, RIB_H, fam };
}

// ---------- tree order and timing ----------
const B = [0, 45, 95, 150, 195, 255, 305];
const prog = (phi, k) => clamp01((phi - B[k]) / ((B[k + 1] ?? 360) - B[k]));

/** Everything the regen has done by phi: the single source for geometry, mass and readouts. */
function regen(phi, p) {
  const sk = prog(phi, 0), ex = prog(phi, 1), rv = prog(phi, 2), bo = prog(phi, 3), pa = prog(phi, 4), ri = prog(phi, 5), ro = prog(phi, 6);
  const top = p.T + p.H;
  const boreTip = top + 0.5 - smooth(0, 0.75, bo) * (top + 0.9);          // cutter tip height
  const boreFrac = clamp01((top - boreTip) / top);
  const holeTip = p.T + 0.5 - smooth(0, 0.4, pa) * (p.T + 0.9);
  const hole1 = clamp01((p.T - holeTip) / p.T);
  const holes = hole1 < 1 ? 0 : 1 + Math.floor(clamp01((pa - 0.45) / 0.5) * (p.N - 1) + 1e-6);
  const rib1 = smooth(0, 0.4, ri);
  const ribs = ri <= 0 ? 0 : rib1 < 1 ? 1 : 1 + Math.floor(clamp01((ri - 0.45) / 0.5) * (p.N - 1) + 1e-6);
  return {
    sk, ex, rv,
    profile: smooth(0, 0.3, rv), sweep: smooth(0.3, 1, rv),
    bo, boreTip, boreFrac, boreCut: boreFrac >= 1,
    pa, holeTip, hole1, holes,
    ri, rib1, ribs,
    ro, roll: smooth(0, 0.85, ro),
  };
}

function volume(phi, p) {
  const r = regen(phi, p);
  const ribArea = 0.5 * (p.RIB_L + 0.02) * p.RIB_H;
  const filletA = p.RR * p.RR * (1 - Math.PI / 4), filletRc = p.HUB + 0.2234 * p.RR;   // Pappus
  const cutHoles = r.holes > 0 ? r.holes : r.hole1;
  const ribVol = r.ribs > 1 ? r.ribs : r.ribs ? r.rib1 ** 2 : 0;   // rib 1 grows in both directions
  return Math.PI * p.R ** 2 * p.T * r.ex
    + Math.PI * p.HUB ** 2 * p.H * r.sweep
    - Math.PI * p.BORE ** 2 * (p.T + p.H) * r.boreFrac
    - cutHoles * Math.PI * p.HR ** 2 * p.T
    + ribVol * ribArea * RIB_W
    + r.roll * 2 * Math.PI * filletRc * filletA;
}
const massOf = (phi, s) => volume(phi, s.mech.active ?? derive(1, 6)) * KG_PER_U3;

const FEATURE = ['DTM + Sketch 1', 'Extrude 1', 'Revolve 1', 'Hole 1', 'Pattern 1 (Hole 2)', 'Pattern 2 (Rib 1)', 'Round 1'];
const C = { sk: HUES.blue, add: HUES.ochre, cut: HUES.red, fin: HUES.grey };

export default {
  id: 'regen',
  meta: {
    pageTitle: 'How a Parametric Feature Tree Regenerates',
    fig: 'Fig. 03',
    caption: 'Parametric solid · model tree · regeneration',
    title: 'How a <em>feature tree</em> rebuilds a part',
    lede: 'A Creo part is a recipe, not a shape. Every regen replays the tree top to bottom, so changing one number reshapes everything downstream.',
    titleBlock: { title: 'Flanged hub', dwg: 'PRT-HUB-0003', scale: '1:2' },
    alt: 'Interactive 3D flanged hub being regenerated feature by feature from a parametric model tree',
    layout: 'sheet',
  },
  cycle: 360,
  start: 20,
  phases: [
    { name: 'Datums and sketch', nick: 'plan', list: '1', short: 'SKETCH', key: 'Sketch 1', color: C.sk,
      text: 'Every part starts from three datum planes, FRONT, TOP and RIGHT, crossing at the origin. Sketch 1 sits on TOP: a circle for the flange and a dashed construction circle where the bolts will go. Nothing is solid yet, it is a plan with dimensions.' },
    { name: 'Extrude the flange', nick: 'push', list: '2', short: 'EXTRUDE', key: 'Extrude', color: C.add,
      text: 'Creo takes the closed circle from Sketch 1 and pushes it straight up by the thickness dimension. This disc is the first solid feature, so everything after it can grab its faces and edges.' },
    { name: 'Revolve the hub', nick: 'spin', list: '3', short: 'REVOLVE', key: 'Revolve', color: C.add,
      text: 'A rectangle is sketched on FRONT, then swept 360 degrees round the centre to make the hub. The revolve also leaves axis A_1 behind. Its bottom sits on the flange top, so Extrude 1 is its parent.' },
    { name: 'Bore the centre', nick: 'drill', list: '4', short: 'BORE', key: 'Hole', color: C.cut,
      text: 'A hole is placed on the hub top and made coaxial with A_1, so it stays centred whatever size the hub becomes. Creo subtracts a cylinder through both the hub and the flange.' },
    { name: 'Pattern the bolt holes', nick: 'copy', list: '5', short: 'PATTERN', key: 'Hole pattern', color: C.cut,
      text: 'One bolt hole is cut on the bolt circle, then an axis pattern copies it round A_1. The count is a parameter and the circle comes from a relation, BC = (OD + HUB) / 2, so one edit moves every hole.' },
    { name: 'Add the ribs', nick: 'brace', list: '6', short: 'RIBS', key: 'Rib pattern', color: C.add,
      text: 'A triangular rib braces the hub against the flange, then gets patterned halfway between the holes. A relation ties the rib count to the bolt count, so more bolts means more ribs without touching the rib.' },
    { name: 'Round the edges', nick: 'soften', list: '7', short: 'ROUND', key: 'Round', color: C.fin,
      text: 'Last, a round rolls a ball along the edge where the hub meets the flange and fills the sharp corner. Rounds go at the end because they need finished edges. Put one earlier and a later cut could eat its edge and fail the regen.' },
  ],
  bounds: () => B,
  instances: { count: 1, label: 'Model', short: 'Model', offset: [0] },
  driver: {
    inputLabel: 'Regen pace',
    inputHint: 'How fast the regen walks the tree, in passes per minute.',
    input: 0.3,
    target: (x) => 2 + 18 * x,
    inputFormat: (x) => `${(2 + 18 * x).toFixed(1)}/min`,
    inertia: 2,
    degPerSec: (rpm) => (rpm / 60) * 360,
  },
  speeds: [4, 2, 1],
  speed: 1,
  gauge: { max: 6, minor: 0.25, major: 1, label: 'MASS · KG', unit: 'kg', value: (s) => massOf(s.phi[0], s), readout: (v) => v.toFixed(2) },
  plot: { label: 'Part mass through the tree', x: (phi) => phi / 360, y: (phi, s) => massOf(phi, s), yUnit: 'kg', xTicks: ['Sketch 1', 'model tree', 'Round 1'], yMin: 2 },
  chart: { label: 'Model tree', note: 'Drag to scrub the regen. Red features cut, ochre ones add, so the mass line steps up and down.', markers: [] },
  layers: [
    { key: 'datums', label: 'Datums', on: true },
    { key: 'sketch', label: 'Sketches', on: true },
    { key: 'tools', label: 'Tool bodies', on: true },
  ],
  actions: [
    { label: 'More bolts', run: (s) => { const p = s.mech.pending; p.N = BOLTS[(BOLTS.indexOf(p.N) + 1) % BOLTS.length]; } },
    { label: 'Next size', run: (s) => { const p = s.mech.pending; p.fam = (p.fam + 1) % FAMILY.length; } },
    { label: 'Regenerate', run: (s) => { s.theta = Math.floor(s.theta / 360 + 1) * 360 + 0.01; } },
  ],
  view: { target: [0, 0.8, 0], dir: [1.5, 1.25, 2.1], radius: 3.3, radiusFigure: 3.2, radiusCompact: 3.8, minDist: 5, maxDist: 30,
    box: [[-2.8, -0.1, -2.8], [2.8, 2.9, 2.8]] },
  compactCallouts: [3, 4, 5, 8, 10],

  build(kit, { state }) {
    const { THREE, part, ghost, toon, scene, INK, theme } = kit;
    const T = theme.mat;
    const root = new THREE.Group();
    scene.add(root);
    state.mech.pending = { fam: 1, N: 6 };
    let cur = derive(1, 6);
    state.mech.active = cur;
    let lastPass = Math.floor(state.theta / 360);

    const DS = THREE.DoubleSide;
    const mats = {
      flange: toon(T.steel, { side: DS }), hub: toon(T.alloy, { side: DS }),
      rib: toon(T.valve, { side: DS }), fillet: toon(T.alloy, { side: DS }),
    };
    const base = new Map(Object.values(mats).map((m) => [m, m.color.clone()]));
    const cutMat = toon(HUES.red, { transparent: true, opacity: 0.28, depthWrite: false, polygonOffset: false });
    const ballMat = toon(T.dark, { transparent: true, opacity: 0.45, depthWrite: false, polygonOffset: false });
    const sketchMat = new THREE.LineBasicMaterial({ color: HUES.blue });
    const constrMat = new THREE.LineDashedMaterial({ color: HUES.blue, dashSize: 0.08, gapSize: 0.06 });
    const axisMat = new THREE.LineDashedMaterial({ color: INK, transparent: true, opacity: 0.7, dashSize: 0.18, gapSize: 0.06 });
    const dotMat = toon(HUES.red);

    /* ---------- datums: FRONT (XY), TOP (XZ), RIGHT (YZ), csys ---------- */
    const datums = new THREE.Group();
    root.add(datums);
    const front = ghost(new THREE.PlaneGeometry(5.4, 3.2)); front.position.y = 1.2;
    const right = ghost(new THREE.PlaneGeometry(5.4, 3.2)); right.position.y = 1.2; right.rotation.y = Math.PI / 2;
    const topP = ghost(new THREE.PlaneGeometry(5.4, 5.4)); topP.rotation.x = -Math.PI / 2;
    datums.add(front, right, topP);
    [[1, 0, 0], [0, 1, 0], [0, 0, 1]].forEach((d) => datums.add(new THREE.Line(
      new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3(...d).multiplyScalar(0.45)]),
      new THREE.LineBasicMaterial({ color: INK }))));
    const axis = new THREE.Line(new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.4, 0), new THREE.Vector3(0, 3.0, 0)]), axisMat);
    axis.computeLineDistances();
    root.add(axis);

    /* ---------- sketches ---------- */
    const sketches = new THREE.Group();
    root.add(sketches);
    const circlePts = (r, y, n = 96) => Array.from({ length: n + 1 }, (_, k) => new THREE.Vector3(Math.cos(k / n * Math.PI * 2) * r, y, Math.sin(k / n * Math.PI * 2) * r));
    const flangeCircle = new THREE.Line(new THREE.BufferGeometry(), sketchMat);
    const boltCircle = new THREE.Line(new THREE.BufferGeometry(), constrMat);
    const profile = new THREE.Line(new THREE.BufferGeometry(), sketchMat);   // revolve section, rides the sweep
    sketches.add(flangeCircle, boltCircle, profile);

    /* ---------- solids: memoised by parameters, swapped by visibility ---------- */
    const solids = new THREE.Group();
    root.add(solids);
    const cache = new Map();
    function cached(key, make) {
      let g = cache.get(key);
      if (!g) { g = make(); g.visible = false; solids.add(g); cache.set(key, g); }
      return g;
    }
    const circlePath = (x, y, r, hole) => { const s = hole ? new THREE.Path() : new THREE.Shape(); s.absarc(x, y, r, 0, Math.PI * 2, hole); return s; };

    const flangeOf = (p, holes, bore) => cached(`f${p.fam}/${p.N}/${holes}/${bore}`, () => {
      const s = circlePath(0, 0, p.R, false);
      if (bore) s.holes.push(circlePath(0, 0, p.BORE, true));
      for (let i = 0; i < holes; i++) { const a = i / p.N * Math.PI * 2; s.holes.push(circlePath(p.BC * Math.cos(a), -p.BC * Math.sin(a), p.HR, true)); }
      const g = new THREE.ExtrudeGeometry(s, { depth: p.T, bevelEnabled: false, curveSegments: 40 }).rotateX(-Math.PI / 2);
      return part(g, mats.flange);
    });

    // revolve a closed (r, y) profile by deg, with section caps while the sweep is open
    function revolved(pts, deg, mat) {
      const g = new THREE.Group();
      const len = deg * D2R;
      g.add(part(new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), Math.max(2, Math.round(deg / 5)), 0, len), mat));
      if (deg < 360) {
        const sh = new THREE.Shape(pts.map(([r, y]) => new THREE.Vector2(r, y)));
        [0, len].forEach((a) => g.add(part(new THREE.ShapeGeometry(sh).rotateY(-Math.PI / 2 + a), mat, { outline: false })));
      }
      return g;
    }
    const hubPts = (p, bore) => bore
      ? [[p.BORE, p.T], [p.HUB, p.T], [p.HUB, p.T + p.H], [p.BORE, p.T + p.H], [p.BORE, p.T]]
      : [[0, p.T], [p.HUB, p.T], [p.HUB, p.T + p.H], [0, p.T + p.H], [0, p.T]];
    const hubOf = (p, deg, bore) => cached(`h${p.fam}/${deg}/${bore}`, () => revolved(hubPts(p, bore), deg, mats.hub));
    const filletOf = (p, deg) => cached(`r${p.fam}/${deg}`, () => {
      const pts = [[p.HUB, p.T], [p.HUB + p.RR, p.T]];
      for (let k = 1; k <= 12; k++) { const a = -Math.PI / 2 - k / 12 * Math.PI / 2; pts.push([p.HUB + p.RR + p.RR * Math.cos(a), p.T + p.RR + p.RR * Math.sin(a)]); }
      pts.push([p.HUB, p.T]);
      return revolved(pts, deg, mats.fillet);
    });
    const ribsOf = (p) => cached(`b${p.fam}/${p.N}`, () => {
      const g = new THREE.Group();
      const sh = new THREE.Shape([new THREE.Vector2(-0.02, 0), new THREE.Vector2(p.RIB_L, 0), new THREE.Vector2(-0.02, p.RIB_H)]);
      const geo = new THREE.ExtrudeGeometry(sh, { depth: RIB_W, bevelEnabled: false }).translate(0, 0, -RIB_W / 2);
      for (let i = 0; i < p.N; i++) {
        const pivot = new THREE.Group();
        pivot.rotation.y = -(i + 0.5) / p.N * Math.PI * 2;
        const rib = part(geo, mats.rib);
        rib.position.set(p.HUB, p.T, 0);
        pivot.add(rib);
        g.add(pivot);
      }
      return g;
    });
    // pattern-member dots, Creo-style: where the copies will land
    const dotsOf = (p, kind) => cached(`d${kind}${p.fam}/${p.N}`, () => {
      const g = new THREE.Group();
      const geo = new THREE.SphereGeometry(0.045, 12, 8);
      for (let i = 0; i < p.N; i++) {
        const a = (i + (kind === 'r' ? 0.5 : 0)) / p.N * Math.PI * 2;
        const r = kind === 'r' ? p.HUB + p.RIB_L * 0.4 : p.BC;
        const d = new THREE.Mesh(geo, dotMat);
        d.position.set(r * Math.cos(a), p.T + (kind === 'r' ? p.RIB_H * 0.35 : 0) + 0.06, r * Math.sin(a));
        g.add(d);
      }
      return g;
    });

    /* ---------- tool bodies: the cutters and the rolling ball ---------- */
    const tools = new THREE.Group();
    root.add(tools);
    const boreCutter = part(new THREE.CylinderGeometry(1, 1, 1, 32).translate(0, 0.5, 0), cutMat, { outline: false });
    const holeCutter = part(new THREE.CylinderGeometry(1, 1, 1, 24).translate(0, 0.5, 0), cutMat, { outline: false });
    const ball = part(new THREE.SphereGeometry(1, 24, 16), ballMat, { outline: false });
    tools.add(boreCutter, holeCutter, ball);

    function rebuildSketches(p) {
      flangeCircle.geometry.dispose(); flangeCircle.geometry = new THREE.BufferGeometry().setFromPoints(circlePts(p.R, 0.004));
      boltCircle.geometry.dispose(); boltCircle.geometry = new THREE.BufferGeometry().setFromPoints(circlePts(p.BC, 0.004));
      boltCircle.computeLineDistances();
      profile.geometry.dispose();
      profile.geometry = new THREE.BufferGeometry().setFromPoints(hubPts(p, false).map(([r, y]) => new THREE.Vector3(0, y, r)));
    }
    rebuildSketches(cur);

    const layers = { datums: true, sketch: true, tools: true };
    let shown = [];
    const tint = (m, hex, k) => { m.color.copy(base.get(m)).lerp(new THREE.Color(hex), Math.min(1, 0.4 * k)); };
    const glow = (a) => smooth(0, 0.1, a) * (1 - smooth(0.85, 1, a));   // the feature being built glows, then cools

    function pose(theta, dt, s) {
      // parameter edits land at the start of the next pass, like Regenerate after Modify
      const pass = Math.floor(theta / 360);
      if (pass !== lastPass) {
        lastPass = pass;
        const { fam, N } = s.mech.pending;
        if (fam !== cur.fam || N !== cur.N) { cur = derive(fam, N); s.mech.active = cur; rebuildSketches(cur); }
      }
      const p = cur, phi = mod(theta, 360), r = regen(phi, p);

      shown.forEach((g) => { g.visible = false; });
      shown = [];
      const show = (g) => { g.visible = true; shown.push(g); return g; };

      // sketches
      flangeCircle.geometry.setDrawRange(0, Math.round(smooth(0, 0.6, r.sk) * 97));
      boltCircle.geometry.setDrawRange(0, Math.round(smooth(0.45, 1, r.sk) * 97));
      profile.visible = r.rv > 0 && r.rv < 1;
      profile.geometry.setDrawRange(0, Math.round(r.profile * 5));
      profile.rotation.y = r.sweep * Math.PI * 2;

      // solids
      if (r.ex > 0) show(flangeOf(p, r.holes, r.boreCut)).scale.y = Math.max(0.002, r.ex);
      const deg = Math.round(r.sweep * 72) * 5;
      if (deg > 0) show(hubOf(p, deg, r.boreCut));
      if (r.ribs > 0) {
        show(ribsOf(p)).children.forEach((pv, i) => {
          pv.visible = i < r.ribs;
          const k = i === 0 ? Math.max(0.01, r.rib1) : 1;
          pv.children[0].scale.set(k, k, 1);
        });
      }
      const fdeg = Math.round(r.roll * 72) * 5;
      if (fdeg > 0) show(filletOf(p, fdeg));

      // pattern previews
      if (layers.tools && r.pa > 0 && r.pa < 1) show(dotsOf(p, 'h')).children.forEach((d, i) => { d.visible = i >= r.holes; });
      if (layers.tools && r.ri > 0 && r.ri < 1) show(dotsOf(p, 'r')).children.forEach((d, i) => { d.visible = i >= r.ribs; });

      // tool bodies
      boreCutter.visible = r.bo > 0 && r.bo < 1;
      boreCutter.scale.set(p.BORE, p.T + p.H + 0.5, p.BORE);
      boreCutter.position.y = r.boreTip;
      holeCutter.visible = r.pa > 0 && r.pa < 0.45;
      holeCutter.scale.set(p.HR, p.T + 0.6, p.HR);
      holeCutter.position.set(p.BC, r.holeTip, 0);
      cutMat.opacity = 0.28 * (r.bo > 0 && r.bo < 1 ? 1 - smooth(0.75, 1, r.bo) : 1);
      ball.visible = r.ro > 0 && r.roll < 1;
      ball.scale.setScalar(p.RR);
      const ba = r.roll * Math.PI * 2;
      ball.position.set((p.HUB + p.RR) * Math.sin(ba), p.T + p.RR, (p.HUB + p.RR) * Math.cos(ba));

      // phase hue on whatever the current feature touches
      tint(mats.flange, C.add, glow(r.ex));
      mats.flange.color.lerp(new THREE.Color(C.cut), Math.min(1, 0.35 * (glow(r.bo) + glow(r.pa))));
      tint(mats.hub, C.add, glow(r.rv));
      mats.hub.color.lerp(new THREE.Color(C.cut), 0.35 * glow(r.bo));
      tint(mats.rib, C.add, glow(r.ri));
      tint(mats.fillet, C.fin, 1.5 * glow(r.ro));

      tools.visible = layers.tools;
      sketches.visible = layers.sketch;
      datums.visible = layers.datums;
      axis.visible = layers.datums && r.rv > 0.3;
    }

    const at = (fn) => (v) => fn(v, cur);
    return {
      root,
      pose,
      setLayer(key, on) { layers[key] = on; },
      // a label appears once its feature has started regenerating (show() is optional in the API)
      callouts: [
        { n: 1, name: 'Datum plane TOP', at: at((v) => v.set(2.5, 0, -2.5)) },
        { n: 2, name: 'Datum plane FRONT', at: at((v) => v.set(-2.5, 2.6, 0)) },
        { n: 3, name: 'Sketch 1', at: at((v, p) => v.set(-p.R * 0.71, 0, p.R * 0.71)) },
        { n: 4, name: 'Extrude 1 · flange', at: at((v, p) => v.set(p.R * 0.82, p.T, p.R * 0.55)), from: B[1] },
        { n: 5, name: 'Revolve 1 · hub', at: at((v, p) => v.set(-p.HUB * 0.5, p.T + p.H * 0.6, p.HUB * 0.87)), from: B[2] },
        { n: 6, name: 'Axis A_1', at: at((v) => v.set(0, 2.95, 0)), from: B[2] + 15 },
        { n: 7, name: 'Hole 1 · bore', at: at((v, p) => v.set(-p.BORE * 0.7, p.T + p.H, p.BORE * 0.7)), from: B[3] },
        { n: 8, name: 'Pattern 1 · bolt holes', at: at((v, p) => v.set(p.BC, p.T, 0)), from: B[4] },
        { n: 9, name: 'Pattern 2 · ribs', at: at((v, p) => { const a = 0.5 / p.N * Math.PI * 2, rr = p.HUB + p.RIB_L * 0.3; return v.set(rr * Math.cos(a), p.T + p.RIB_H * 0.3, rr * Math.sin(a)); }), from: B[5] },
        { n: 10, name: 'Round 1', at: at((v, p) => v.set(-(p.HUB + p.RR * 0.3) * 0.8, p.T + p.RR * 0.3, (p.HUB + p.RR * 0.3) * 0.6)), from: B[6] },
      ].map((c) => (c.from ? { ...c, show: (s) => mod(s.theta, 360) >= c.from } : c)),
      readouts: [
        { label: 'Feature', value: ({ phase }) => FEATURE[phase] },
        { label: 'Instance', value: () => `${cur.name} · ${cur.N} bolts` },
        { label: 'Bolt circle', value: () => `Ø${Math.round(cur.BC * 2 * MM)} mm` },
        { label: 'Mass', value: ({ phi }) => `${(volume(phi, cur) * KG_PER_U3).toFixed(2)} kg` },
        { label: 'Model', value: ({ s, phase }) => {
          const q = s.mech.pending;
          if (q.fam !== cur.fam || q.N !== cur.N) return { text: `${FAMILY[q.fam].name}, ${q.N} bolts pending`, cls: 'hot' };
          return phase < 6 ? 'Regenerating' : { text: 'Regenerated', cls: 'on' };
        } },
      ],
    };
  },
};
