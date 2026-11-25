/* =========================================================================
   Inkworks: 3D rendering & engineering assembly kit
   Ink-outlined toon parts, hidden-line ghosts, GLTF/GLB styling, camera flight
   & presets, raycasting pick, and hierarchical Assembly -> Subassembly -> Part
   tree with staged exploded view, dashed trace lines, and granular timeline.
   ========================================================================= */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader, loadGLB, parseGLB } from './gltf-loader.js';
import {
  MATERIAL_CATALOG,
  ARCHITECTURAL_FINISHES,
  resolveMaterialCode,
  getMaterialSpec,
  createMaterialRegistry,
} from './materials.js';
import { theme, themeId, inkA, THEMES, isDarkTheme } from './theme.js';

export {
  THREE,
  GLTFLoader,
  loadGLB,
  parseGLB,
  MATERIAL_CATALOG,
  ARCHITECTURAL_FINISHES,
  resolveMaterialCode,
  getMaterialSpec,
  createMaterialRegistry,
  theme,
  themeId,
  inkA,
  THEMES,
  isDarkTheme,
};

export const D2R = Math.PI / 180;
export const mod = (a, n) => ((a % n) + n) % n;
export const clamp01 = (x) => Math.min(1, Math.max(0, x));
export const smooth = (a, b, x) => { const t = clamp01((x - a) / (b - a)); return t * t * (3 - 2 * t); };

export const INK_HEX = theme.css['--ink'];
export const PAPER_HEX = theme.css['--paper'];
export const ACCENT_HEX = theme.accent;
/** The four phase/status hues, from the theme. */
export const HUES = { ...theme.hues };

const BUILTIN_CAMERA_DIRS = {
  iso: [0.78, 0.42, 0.88],
  front: [0, 0.08, 1],
  back: [0, 0.08, -1],
  side: [1, 0.08, 0],
  right: [1, 0.08, 0],
  left: [-1, 0.08, 0],
  top: [0, 1, 0.02],
  plan: [0, 1, 0.02],
};

function toVec3(v, fallback = null) {
  if (!v) return fallback ? fallback.clone() : new THREE.Vector3();
  if (v.isVector3) return v.clone();
  if (Array.isArray(v)) return new THREE.Vector3(v[0] || 0, v[1] || 0, v[2] || 0);
  if (typeof v === 'object' && 'x' in v) return new THREE.Vector3(v.x || 0, v.y || 0, v.z || 0);
  return fallback ? fallback.clone() : new THREE.Vector3();
}

export function makeKit(canvas) {
  const INK = new THREE.Color(INK_HEX);

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true, alpha: true, preserveDrawingBuffer: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.setClearColor(0x000000, 0);          // transparent: the CSS grid paper shows through
  renderer.outputColorSpace = THREE.SRGBColorSpace;

  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 0.05, 400);
  const controls = new OrbitControls(camera, canvas);
  controls.enableDamping = true;
  controls.dampingFactor = 0.08;
  controls.enablePan = true;
  controls.screenSpacePanning = true;
  controls.autoRotateSpeed = 0.6;

  scene.add(new THREE.HemisphereLight(0xffffff, 0x8a96aa, 1.5));
  const sun = new THREE.DirectionalLight(0xffffff, 2.2);
  sun.position.set(4, 8, 6);
  scene.add(sun);

  // three-step toon ramp: flat "hand-coloured drawing" shading
  const ramp = new THREE.DataTexture(new Uint8Array([150, 150, 150, 255, 205, 205, 205, 255, 255, 255, 255, 255]), 3, 1);
  ramp.minFilter = ramp.magFilter = THREE.NearestFilter;
  ramp.needsUpdate = true;

  const toon = (hex, extra = {}) => new THREE.MeshToonMaterial({
    color: hex, gradientMap: ramp, polygonOffset: true, polygonOffsetFactor: 1, polygonOffsetUnits: 1, ...extra,
  });

  // Theme-aware Engineering Material Registry
  const materials = createMaterialRegistry({ ramp, theme, INK });

  /** Legacy shared materials preserved for backward compatibility. */
  const M = {
    steel: toon(theme.mat.steel),
    alloy: toon(theme.mat.alloy),
    dark: toon(theme.mat.dark),
    valve: toon(theme.mat.valve),
    ceramic: toon(theme.mat.ceramic),
    rubber: toon(theme.mat.rubber),
    copper: toon(theme.mat.copper),
    glass: toon(theme.mat.glass, { transparent: true, opacity: theme.mat.glassOpacity, depthWrite: false, polygonOffset: false }),
  };

  const lineMat = materials.getEdgeMaterial('normal');
  const ghostLine = materials.getEdgeMaterial('ghost');
  const ghostFill = new THREE.MeshBasicMaterial({
    color: theme.ghost.fill, transparent: true, opacity: theme.ghost.opacity, depthWrite: false, side: THREE.DoubleSide,
  });

  // silhouette: inverted hull pushed out by a constant number of screen pixels (uPx set by layout)
  const outlineMat = materials.getOutlineMaterial('normal');

  /** Keep all outline shader thicknesses (normal, highlight, hover) synchronized with viewport pixel size. */
  function syncOutlinePx(uPx) {
    materials.syncOutlinePx(uPx);
  }

  /** A solid procedural part: toon mesh + ink feature edges + silhouette outline. */
  function part(geo, mat, { edges = 30, outline = true, materialCode = null } = {}) {
    const g = new THREE.Group();
    const resolvedMat = typeof mat === 'string' ? materials.get(mat, 'normal') : mat;
    const mesh = new THREE.Mesh(geo, resolvedMat);
    if (materialCode || typeof mat === 'string') {
      mesh.userData.materialCode = materials.resolveCode(materialCode || mat);
    }
    g.add(mesh);

    let edgeLines = null;
    if (edges) {
      edgeLines = new THREE.LineSegments(new THREE.EdgesGeometry(geo, edges), lineMat);
      edgeLines.computeLineDistances();
      edgeLines.userData.__inkHelper = true;
      edgeLines.userData.__inkRole = 'edges';
      mesh.add(edgeLines);
    }

    let outlineMesh = null;
    if (outline && !resolvedMat?.transparent) {
      outlineMesh = new THREE.Mesh(geo, outlineMat);
      outlineMesh.userData.__inkHelper = true;
      outlineMesh.userData.__inkRole = 'outline';
      mesh.add(outlineMesh);
    }

    mesh.userData.__inkStyled = true;
    mesh.userData.__ink = {
      code: mesh.userData.materialCode || '8041-4',
      origCode: mesh.userData.materialCode || '8041-4',
      edges: edgeLines,
      outline: outlineMesh,
      isGlass: Boolean(resolvedMat?.transparent),
      customNormalMat: typeof mat === 'string' ? null : resolvedMat,
    };
    return g;
  }

  /** Hidden-line ghost: barely-there fill + dashed ink edges. */
  function ghost(geo, threshold = 30) {
    const g = new THREE.Group();
    g.add(new THREE.Mesh(geo, ghostFill));
    const l = new THREE.LineSegments(new THREE.EdgesGeometry(geo, threshold), ghostLine);
    l.computeLineDistances();
    l.userData.__inkHelper = true;
    l.userData.__inkRole = 'edges';
    g.add(l);
    return g;
  }

  /** Dashed rings along a tube curve, so a translucent pipe still reads as a pipe. */
  function ghostRings(curve, r, count = 5) {
    const g = new THREE.Group();
    const frames = curve.computeFrenetFrames(24, false);
    for (let i = 0; i < count; i++) {
      const k = Math.round(i / (count - 1) * 24);
      const c = curve.getPointAt(k / 24), n = frames.normals[k], b = frames.binormals[k];
      const ring = [];
      for (let j = 0; j <= 24; j++) {
        const a = j / 24 * Math.PI * 2;
        ring.push(c.clone().addScaledVector(n, Math.cos(a) * r).addScaledVector(b, Math.sin(a) * r));
      }
      const l = new THREE.Line(new THREE.BufferGeometry().setFromPoints(ring), ghostLine);
      l.computeLineDistances();
      l.userData.__inkHelper = true;
      g.add(l);
    }
    return g;
  }

  /** A short accent line. */
  function markLine(len, r0, color = ACCENT_HEX) {
    const g = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, r0, 0), new THREE.Vector3(0, r0 + len, 0)]);
    const l = new THREE.Line(g, new THREE.LineBasicMaterial({ color }));
    l.userData.__inkHelper = true;
    return l;
  }

  /** Ink ring (LineLoop) in the XZ plane. */
  function inkRing(r, y = 0, mat = lineMat, seg = 48) {
    const l = new THREE.LineLoop(new THREE.BufferGeometry().setFromPoints(
      Array.from({ length: seg }, (_, k) => new THREE.Vector3(Math.cos(k / seg * Math.PI * 2) * r, y, Math.sin(k / seg * Math.PI * 2) * r)),
    ), mat);
    l.userData.__inkHelper = true;
    return l;
  }

  // ---------- GLB / Hierarchy Ink Styling ----------
  function findInheritedMaterialCode(obj) {
    let cur = obj;
    while (cur) {
      if (cur.userData?.materialCode) return cur.userData.materialCode;
      if (cur.userData?.gltfMaterialExtras?.materialCode) return cur.userData.gltfMaterialExtras.materialCode;
      if (cur.userData?.gltfExtras?.materialCode) return cur.userData.gltfExtras.materialCode;
      if (cur.userData?.gltfMaterialName) return cur.userData.gltfMaterialName;
      cur = cur.parent;
    }
    return obj.material?.name || null;
  }

  /**
   * Restyles any imported GLB/GLTF hierarchy (or procedural group) with Inkworks
   * 3-step toon shading, crisp feature edges, and constant-px silhouette outlines
   * while preserving every mesh's partId, subassemblyId, nodeId, and userData.
   */
  function applyInkStyle(root, {
    materialRegistry = materials,
    edges = 30,
    outline = true,
    defaultMaterial = '8041-4',
    forceRestyle = false,
  } = {}) {
    if (!root) return root;
    const meshes = [];
    root.traverse((obj) => {
      if (obj.isMesh && !obj.userData?.__inkHelper) meshes.push(obj);
    });

    for (const mesh of meshes) {
      if (mesh.userData.__inkStyled && !forceRestyle) continue;

      const rawCode = findInheritedMaterialCode(mesh) || defaultMaterial;
      const code = materialRegistry.resolveCode(rawCode);
      const spec = materialRegistry.getSpec(code);
      const isGlass = spec.category === 'glazing' || spec.opacity < 0.99;

      mesh.userData.materialCode = code;
      mesh.material = materialRegistry.get(code, 'normal');

      // Remove stale ink helpers if forceRestyle
      if (forceRestyle) {
        const stale = mesh.children.filter((c) => c.userData?.__inkHelper);
        for (const s of stale) mesh.remove(s);
      }

      const edgeAngle = edges === false ? 0 : (spec.edgeThreshold ?? edges ?? 30);
      let edgeLines = null;
      if (edgeAngle && mesh.geometry) {
        const edgeGeo = new THREE.EdgesGeometry(mesh.geometry, edgeAngle);
        edgeLines = new THREE.LineSegments(edgeGeo, materialRegistry.getEdgeMaterial('normal'));
        edgeLines.computeLineDistances(); // enables instant swap to LineDashedMaterial on ghost()
        edgeLines.userData.__inkHelper = true;
        edgeLines.userData.__inkRole = 'edges';
        mesh.add(edgeLines);
      }

      let outlineMesh = null;
      if (outline && !isGlass && mesh.geometry) {
        outlineMesh = new THREE.Mesh(mesh.geometry, materialRegistry.getOutlineMaterial('normal'));
        outlineMesh.userData.__inkHelper = true;
        outlineMesh.userData.__inkRole = 'outline';
        mesh.add(outlineMesh);
      }

      mesh.userData.__inkStyled = true;
      mesh.userData.__ink = {
        code,
        origCode: code,
        edges: edgeLines,
        outline: outlineMesh,
        isGlass,
        registry: materialRegistry,
      };
    }

    return root;
  }

  // ---------- Camera Flight & Named Presets ----------
  const defaultView = {
    target: new THREE.Vector3(0, 0, 0),
    dir: new THREE.Vector3(...BUILTIN_CAMERA_DIRS.iso).normalize(),
    dist: 12,
    presets: {},
  };

  let cameraFlight = null;
  controls.addEventListener('start', () => { cameraFlight = null; });

  function setDefaultView({ target, dir, dist, presets } = {}) {
    if (target) defaultView.target.copy(toVec3(target));
    if (dir) defaultView.dir.copy(toVec3(dir)).normalize();
    if (typeof dist === 'number' && dist > 0) defaultView.dist = dist;
    if (presets && typeof presets === 'object') defaultView.presets = { ...presets };
  }

  function flyTo(target, dir, dist, { duration = 0.55 } = {}) {
    const startTarget = controls.target.clone();
    const startPos = camera.position.clone();
    const curOffset = startPos.clone().sub(startTarget);
    const curDist = Math.max(0.1, curOffset.length());
    const curDir = curOffset.clone().normalize();

    const endTarget = target ? toVec3(target) : startTarget.clone();
    const endDir = dir ? toVec3(dir).normalize() : curDir;
    let endDist = typeof dist === 'number' && dist > 0 ? dist : curDist;
    endDist = Math.min(Math.max(endDist, controls.minDistance || 0.2), controls.maxDistance || 200);
    const endPos = endTarget.clone().addScaledVector(endDir, endDist);

    if (duration <= 0) {
      controls.target.copy(endTarget);
      camera.position.copy(endPos);
      cameraFlight = null;
      controls.update();
      return;
    }

    cameraFlight = {
      startTarget,
      endTarget,
      startPos,
      endPos,
      t: 0,
      duration,
    };
  }

  function flyToNode(nodeOrObj, { padding = 1.55, dir = null, duration = 0.55 } = {}) {
    const obj = nodeOrObj?.object3d || nodeOrObj;
    if (!obj || !obj.isObject3D) return;
    obj.updateWorldMatrix(true, true);
    const box = new THREE.Box3();
    const tmpBox = new THREE.Box3();
    obj.traverse((child) => {
      if (!child.isMesh || child.userData?.__inkHelper || !child.visible) return;
      if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
      tmpBox.copy(child.geometry.boundingBox).applyMatrix4(child.matrixWorld);
      box.union(tmpBox);
    });
    if (box.isEmpty()) return;
    const center = new THREE.Vector3();
    const sphere = new THREE.Sphere();
    box.getCenter(center);
    box.getBoundingSphere(sphere);
    const vFov = camera.fov * D2R;
    const minTan = Math.min(Math.tan(vFov / 2), Math.tan(vFov / 2) * Math.max(0.4, camera.aspect));
    const dist = Math.max(controls.minDistance || 1, (sphere.radius * padding) / Math.max(0.1, minTan));
    flyTo(center, dir, dist, { duration });
  }

  function setCameraPreset(presetName, presetsOrOpts = {}) {
    const key = String(presetName || 'iso').toLowerCase();
    const isPresetsMap = presetsOrOpts && typeof presetsOrOpts === 'object'
      && !('duration' in presetsOrOpts) && !('dist' in presetsOrOpts) && !('presets' in presetsOrOpts);
    const customPresets = isPresetsMap ? presetsOrOpts : (presetsOrOpts?.presets || defaultView.presets);
    const duration = isPresetsMap ? 0.5 : (presetsOrOpts?.duration ?? 0.5);
    const overrideDist = isPresetsMap ? undefined : presetsOrOpts?.dist;

    if (key === 'reset') {
      flyTo(defaultView.target, defaultView.dir, overrideDist ?? defaultView.dist, { duration });
      return;
    }

    const custom = customPresets?.[key] || defaultView.presets?.[key];
    if (custom) {
      if (Array.isArray(custom)) {
        flyTo(defaultView.target, custom, overrideDist ?? defaultView.dist, { duration });
      } else {
        flyTo(
          custom.target ?? defaultView.target,
          custom.dir ?? BUILTIN_CAMERA_DIRS[key] ?? defaultView.dir,
          overrideDist ?? custom.dist ?? defaultView.dist,
          { duration },
        );
      }
      return;
    }

    const dir = key === 'iso' ? defaultView.dir : (BUILTIN_CAMERA_DIRS[key] || defaultView.dir);
    flyTo(defaultView.target, dir, overrideDist ?? defaultView.dist, { duration });
  }

  function updateCamera(dt) {
    if (!cameraFlight) return false;
    cameraFlight.t = Math.min(1, cameraFlight.t + Math.max(dt, 0) / cameraFlight.duration);
    const u = cameraFlight.t;
    const e = u < 0.5 ? 4 * u * u * u : 1 - Math.pow(-2 * u + 2, 3) / 2;
    controls.target.lerpVectors(cameraFlight.startTarget, cameraFlight.endTarget, e);
    camera.position.lerpVectors(cameraFlight.startPos, cameraFlight.endPos, e);
    if (cameraFlight.t >= 1) cameraFlight = null;
    return true;
  }

  function isCameraAnimating() {
    return cameraFlight !== null;
  }

  // ---------- Raycasting Hit-Test ----------
  const raycaster = new THREE.Raycaster();
  const ndcVec = new THREE.Vector2();

  function findAncestryIds(obj) {
    let nodeId = null, partId = null, subassemblyId = null;
    let cur = obj;
    while (cur) {
      const ud = cur.userData || {};
      if (!nodeId && ud.nodeId) nodeId = ud.nodeId;
      if (!partId && ud.partId) partId = ud.partId;
      if (!subassemblyId && ud.subassemblyId) subassemblyId = ud.subassemblyId;
      cur = cur.parent;
    }
    return { nodeId: nodeId || partId || subassemblyId, partId, subassemblyId };
  }

  function isObjectChainVisible(obj) {
    let cur = obj;
    while (cur) {
      if (!cur.visible) return false;
      cur = cur.parent;
    }
    return true;
  }

  /**
   * Raycast at normalized device coordinates (ndcX in -1..1, ndcY in -1..1).
   * Returns closest non-helper visible mesh hit with nodeId / partId / subassemblyId.
   */
  function pick(ndcX, ndcY, roots = null) {
    ndcVec.set(ndcX, ndcY);
    raycaster.setFromCamera(ndcVec, camera);
    const targets = roots ? (Array.isArray(roots) ? roots : [roots]) : scene.children;
    const hits = raycaster.intersectObjects(targets, true);
    for (const hit of hits) {
      const obj = hit.object;
      if (!obj || !obj.isMesh || obj.userData?.__inkHelper) continue;
      if (!isObjectChainVisible(obj)) continue;
      const ids = findAncestryIds(obj);
      return {
        nodeId: ids.nodeId,
        partId: ids.partId,
        subassemblyId: ids.subassemblyId,
        mesh: obj,
        object: obj,
        point: hit.point.clone(),
        distance: hit.distance,
        userData: obj.userData,
      };
    }
    return null;
  }

  /**
   * Raycast from DOM client coordinates (e.g. PointerEvent.clientX, PointerEvent.clientY).
   */
  function pickClient(clientX, clientY, roots = null) {
    const rect = canvas.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    const ndcX = ((clientX - rect.left) / rect.width) * 2 - 1;
    const ndcY = -((clientY - rect.top) / rect.height) * 2 + 1;
    return pick(ndcX, ndcY, roots);
  }

  // ---------- Hierarchical Assembly Tree + Exploded View + Granular Timeline ----------
  function createAssemblyTree({ root = null, stages = [], traceColor = null } = {}) {
    const nodeMap = new Map();     // id -> node
    const rootIds = [];
    let stageList = Array.isArray(stages) ? stages.slice() : [];
    let selectedId = null;
    let hoveredId = null;
    let isolatedId = null;
    let isolateMode = 'dim';       // 'dim' | 'hide' | 'ghost'
    let globalExplode = 0;
    let showTraces = true;
    let timelineProgress = 0;
    let activeStageIdx = 0;
    let version = 0;
    const listeners = new Set();

    // Container for dynamic dashed exploded-view trace lines
    const traceGroup = new THREE.Group();
    traceGroup.name = '__ink_explode_traces';
    traceGroup.userData.__inkHelper = true;
    const traceMat = new THREE.LineDashedMaterial({
      color: traceColor ? new THREE.Color(traceColor) : INK.clone(),
      transparent: true,
      opacity: 0.72,
      dashSize: 0.1,
      gapSize: 0.06,
    });
    const traceLines = new Map(); // nodeId -> THREE.Line
    let attachedRoot = null;

    function ensureTraceHost(objRoot) {
      const host = objRoot || root || scene;
      if (traceGroup.parent !== host) {
        if (traceGroup.parent) traceGroup.parent.remove(traceGroup);
        host.add(traceGroup);
      }
      attachedRoot = host;
    }

    function emit(reason = 'update') {
      version++;
      const snap = getState();
      for (const fn of listeners) {
        try { fn(snap, reason); } catch (e) { console.error(e); }
      }
    }

    function computeLocalRestCenter(obj) {
      if (!obj) return new THREE.Vector3();
      const box = new THREE.Box3();
      const tmp = new THREE.Box3();
      const invRoot = new THREE.Matrix4();
      obj.updateWorldMatrix(true, true);
      invRoot.copy(obj.matrixWorld).invert();
      const rel = new THREE.Matrix4();
      obj.traverse((child) => {
        if (!child.isMesh || child.userData?.__inkHelper) return;
        if (!child.geometry.boundingBox) child.geometry.computeBoundingBox();
        rel.multiplyMatrices(invRoot, child.matrixWorld);
        tmp.copy(child.geometry.boundingBox).applyMatrix4(rel);
        box.union(tmp);
      });
      if (box.isEmpty()) return new THREE.Vector3();
      return box.getCenter(new THREE.Vector3());
    }

    function tagMeshesForNode(node) {
      if (!node.object3d) return;
      // Find nearest ancestor subassemblyId
      let subId = node.kind === 'subassembly' ? node.id : null;
      let cur = node.parentId ? nodeMap.get(node.parentId) : null;
      while (!subId && cur) {
        if (cur.kind === 'subassembly') subId = cur.id;
        cur = cur.parentId ? nodeMap.get(cur.parentId) : null;
      }
      const partId = node.kind === 'part' ? node.id : null;

      node.object3d.userData.nodeId = node.id;
      if (partId) node.object3d.userData.partId = partId;
      if (subId) node.object3d.userData.subassemblyId = subId;

      // Tag direct primitive meshes belonging to this object3d (without clobbering child nodes)
      const visit = (o) => {
        if (o !== node.object3d && o.userData?.nodeId && o.userData.nodeId !== node.id) return;
        if (o.isMesh && !o.userData?.__inkHelper) {
          o.userData.nodeId = node.id;
          if (partId) o.userData.partId = partId;
          if (subId) o.userData.subassemblyId = subId;
        }
        for (const ch of o.children) {
          if (!ch.userData?.__inkHelper) visit(ch);
        }
      };
      visit(node.object3d);
    }

    function addNode(def) {
      if (!def || !def.id) throw new Error('AssemblyTree.addNode: node.id is required');
      const id = String(def.id);
      const obj = def.object3d || null;
      const ev = Array.isArray(def.explodeVec) ? [def.explodeVec[0] || 0, def.explodeVec[1] || 0, def.explodeVec[2] || 0] : [0, 0, 0];

      const node = {
        id,
        name: def.name || id,
        kind: def.kind || (def.parentId ? 'part' : 'assembly'),
        parentId: def.parentId ?? null,
        children: [],
        object3d: obj,
        materialCode: def.materialCode ? materials.resolveCode(def.materialCode) : null,
        standardStatus: def.standardStatus || 'locked',
        explodeVec: ev,
        explodeOrder: typeof def.explodeOrder === 'number' ? def.explodeOrder : 0,
        stage: typeof def.stage === 'number' ? def.stage : 0,
        specPath: def.specPath || null,
        erpCode: def.erpCode || (def.materialCode ? materials.getSpec(def.materialCode).erpCode : null),
        meta: { ...(def.meta || {}) },

        // Rest spatial metadata
        _restPos: obj ? obj.position.clone() : new THREE.Vector3(),
        _restLocalCenter: obj ? computeLocalRestCenter(obj) : new THREE.Vector3(),
        _materialOverride: null,

        // User-persistent overrides (survive timeline/stage scrubbing)
        _userVisible: null,
        _userGhost: null,
        _userExplode: null,

        // Stage-driven defaults
        _stageVisible: true,
        _stageGhost: false,
        _stageHighlight: false,

        // Resolved effective state (read by UI)
        visible: def.visible !== false,
        ghost: Boolean(def.ghost),
        explode: null,
        highlighted: false,
        dimmed: false,
      };

      if (def.visible === false) node._userVisible = false;
      if (def.ghost === true) node._userGhost = true;

      nodeMap.set(id, node);
      if (node.parentId && nodeMap.has(node.parentId)) {
        const p = nodeMap.get(node.parentId);
        if (!p.children.includes(id)) p.children.push(id);
      } else {
        if (!rootIds.includes(id)) rootIds.push(id);
      }
      tagMeshesForNode(node);
      return node;
    }

    /**
     * Automatically builds a nested Assembly -> Subassembly -> Part hierarchy
     * from an imported GLB / Three.js Object3D tree, reading `obj.userData`
     * metadata and merging optional per-id `overrides`.
     */
    function fromObject3D(objRoot, { overrides = {}, defaultStage = 0 } = {}) {
      if (!objRoot) return treeApi;
      ensureTraceHost(objRoot);

      const walk = (obj, parentNodeId, depth) => {
        if (obj.userData?.__inkHelper) return;
        const ud = obj.userData || {};
        const rawId = ud.id || obj.name || `node_${nodeMap.size}`;
        const ov = overrides[rawId] || overrides[obj.name] || {};

        // Determine whether this Object3D represents a meaningful tree node
        const nonHelperChildren = obj.children.filter((c) => !c.userData?.__inkHelper);
        const isWrapperScene = depth === 0 && !ud.kind && !ov.kind && nonHelperChildren.length === 1 && !obj.isMesh;
        if (isWrapperScene) {
          walk(nonHelperChildren[0], parentNodeId, depth);
          return;
        }

        const inferredKind = ov.kind || ud.kind || (
          parentNodeId == null ? 'assembly'
            : (obj.isMesh && nonHelperChildren.length === 0 ? 'part' : (depth === 1 ? 'subassembly' : 'part'))
        );

        const matCode = ov.materialCode || ud.materialCode || ud.gltfMaterialExtras?.materialCode || ud.gltfMaterialName || null;
        const node = addNode({
          id: ov.id || rawId,
          name: ov.name || ud.label || ud.displayName || ud.name || obj.name || rawId,
          kind: inferredKind,
          parentId: parentNodeId,
          object3d: obj,
          materialCode: matCode,
          standardStatus: ov.standardStatus || ud.standardStatus || 'locked',
          explodeVec: ov.explodeVec || ud.explodeVec || [0, 0, 0],
          explodeOrder: ov.explodeOrder ?? ud.explodeOrder ?? 0,
          stage: ov.stage ?? ud.stage ?? defaultStage,
          specPath: ov.specPath || ud.specPath || null,
          erpCode: ov.erpCode || ud.erpCode || null,
          meta: { ...(ud.meta || {}), ...(ov.meta || {}), creoSection: ov.creoSection || ud.creoSection || null },
          visible: ov.visible,
          ghost: ov.ghost,
        });

        for (const ch of nonHelperChildren) {
          walk(ch, node.id, depth + 1);
        }
      };

      walk(objRoot, null, 0);
      apply();
      emit('build');
      return treeApi;
    }

    function getDescendants(id, out = []) {
      const node = nodeMap.get(id);
      if (!node) return out;
      for (const cid of node.children) {
        out.push(cid);
        getDescendants(cid, out);
      }
      return out;
    }

    function getAncestors(id) {
      const out = [];
      let cur = nodeMap.get(id);
      while (cur && cur.parentId) {
        out.push(cur.parentId);
        cur = nodeMap.get(cur.parentId);
      }
      return out;
    }

    function getSubtreeSet(id) {
      if (!id || !nodeMap.has(id)) return null;
      const set = new Set([id]);
      for (const cid of getDescendants(id)) set.add(cid);
      return set;
    }

    function applyMeshVariant(mesh, variant, overrideCode = null) {
      const ink = mesh.userData?.__ink;
      if (!ink) return;
      const reg = ink.registry || materials;
      const code = overrideCode ? reg.resolveCode(overrideCode) : (ink.code || '8041-4');

      if (variant === 'ghost') {
        mesh.material = reg.get(code, 'ghost');
        if (ink.edges) {
          ink.edges.material = reg.getEdgeMaterial('ghost');
          ink.edges.visible = true;
        }
        if (ink.outline) ink.outline.visible = false;
        return;
      }

      if (variant === 'dim') {
        mesh.material = reg.get(code, 'dim');
        if (ink.edges) {
          ink.edges.material = reg.getEdgeMaterial('dim');
          ink.edges.visible = true;
        }
        if (ink.outline) ink.outline.visible = false;
        return;
      }

      if (variant === 'highlight') {
        mesh.material = reg.get(code, 'highlight');
        if (ink.edges) {
          ink.edges.material = reg.getEdgeMaterial('highlight');
          ink.edges.visible = true;
        }
        if (ink.outline) {
          ink.outline.material = reg.getOutlineMaterial('highlight');
          ink.outline.visible = !ink.isGlass;
        }
        return;
      }

      if (variant === 'hover') {
        mesh.material = ink.customNormalMat || reg.get(code, 'normal');
        if (ink.edges) {
          ink.edges.material = reg.getEdgeMaterial('hover');
          ink.edges.visible = true;
        }
        if (ink.outline) {
          ink.outline.material = reg.getOutlineMaterial('hover');
          ink.outline.visible = !ink.isGlass;
        }
        return;
      }

      // normal
      mesh.material = ink.customNormalMat || reg.get(code, 'normal');
      if (ink.edges) {
        ink.edges.material = reg.getEdgeMaterial('normal');
        ink.edges.visible = true;
      }
      if (ink.outline) {
        ink.outline.material = reg.getOutlineMaterial('normal');
        ink.outline.visible = !ink.isGlass;
      }
    }

    function getDirectMeshes(node) {
      if (!node.object3d) return [];
      const list = [];
      const walk = (o) => {
        if (o !== node.object3d && o.userData?.nodeId && o.userData.nodeId !== node.id) return;
        if (o.isMesh && !o.userData?.__inkHelper) list.push(o);
        for (const ch of o.children) {
          if (!ch.userData?.__inkHelper) walk(ch);
        }
      };
      walk(node.object3d);
      return list;
    }

    function maxExplodeOrder() {
      let m = 0;
      for (const n of nodeMap.values()) {
        if (n.explodeOrder > m) m = n.explodeOrder;
      }
      return m;
    }

    function resolveExplodeFactor(node, inheritedExplode, maxOrd) {
      const raw = node._userExplode !== null ? node._userExplode : inheritedExplode;
      const t = clamp01(raw);
      if (t <= 0) return 0;
      if (t >= 1) return 1;
      if (maxOrd <= 0 || node.explodeOrder <= 0) return smooth(0, 1, t);
      // Staged peel-off: lower explodeOrder starts immediately; higher starts slightly later, all finish by 1.0
      const orderFrac = clamp01(node.explodeOrder / maxOrd);
      const start = orderFrac * 0.32;
      const end = Math.min(1, start + 0.68);
      return smooth(start, end, t);
    }

    const tmpWorldRest = new THREE.Vector3();
    const tmpWorldNow = new THREE.Vector3();
    const tmpLocalOffset = new THREE.Vector3();
    const tmpInvTrace = new THREE.Matrix4();

    function updateTraceLines() {
      traceGroup.visible = showTraces;
      if (!showTraces) return;

      const host = attachedRoot || root || scene;
      host.updateWorldMatrix(true, true);
      traceGroup.updateWorldMatrix(true, false);
      tmpInvTrace.copy(traceGroup.matrixWorld).invert();

      for (const node of nodeMap.values()) {
        const obj = node.object3d;
        const existing = traceLines.get(node.id);
        if (!obj || !node.visible) {
          if (existing) existing.visible = false;
          continue;
        }
        tmpLocalOffset.copy(obj.position).sub(node._restPos);
        if (tmpLocalOffset.lengthSq() < 0.0004) {
          if (existing) existing.visible = false;
          continue;
        }

        // Compute world start (rest position inside parent's current frame) -> world end (current position)
        const parentMat = obj.parent ? obj.parent.matrixWorld : new THREE.Matrix4();
        tmpWorldNow.copy(node._restLocalCenter).applyMatrix4(obj.matrixWorld);

        // Rest center in parent space: restPos + (obj.localCenter rotated/scaled by obj)
        const savedPos = obj.position.clone();
        obj.position.copy(node._restPos);
        obj.updateMatrix();
        const restWorldMat = new THREE.Matrix4().multiplyMatrices(parentMat, obj.matrix);
        tmpWorldRest.copy(node._restLocalCenter).applyMatrix4(restWorldMat);
        obj.position.copy(savedPos);
        obj.updateMatrix();

        // Convert to traceGroup local space
        tmpWorldRest.applyMatrix4(tmpInvTrace);
        tmpWorldNow.applyMatrix4(tmpInvTrace);

        let line = existing;
        if (!line) {
          const geo = new THREE.BufferGeometry().setFromPoints([tmpWorldRest.clone(), tmpWorldNow.clone()]);
          line = new THREE.Line(geo, traceMat);
          line.userData.__inkHelper = true;
          line.userData.__inkRole = 'trace';
          traceGroup.add(line);
          traceLines.set(node.id, line);
        } else {
          const pos = line.geometry.attributes.position;
          pos.setXYZ(0, tmpWorldRest.x, tmpWorldRest.y, tmpWorldRest.z);
          pos.setXYZ(1, tmpWorldNow.x, tmpWorldNow.y, tmpWorldNow.z);
          pos.needsUpdate = true;
        }
        line.computeLineDistances();
        line.visible = true;
      }
    }

    function apply() {
      const isoSet = isolatedId ? getSubtreeSet(isolatedId) : null;
      const isoAncestors = isolatedId ? new Set(getAncestors(isolatedId)) : null;
      const selSet = selectedId ? getSubtreeSet(selectedId) : null;
      const hovSet = hoveredId ? getSubtreeSet(hoveredId) : null;
      const maxOrd = maxExplodeOrder();

      const visit = (id, parentVisible, parentGhost, inheritedExplode) => {
        const node = nodeMap.get(id);
        if (!node) return;

        // Effective visibility
        const ownVis = node._userVisible !== null ? node._userVisible : node._stageVisible;
        let vis = parentVisible && ownVis;
        if (isoSet && isolateMode === 'hide') {
          if (!isoSet.has(id) && !isoAncestors.has(id)) vis = false;
        }
        node.visible = vis;

        // Effective ghost
        const ownGhost = node._userGhost !== null ? node._userGhost : node._stageGhost;
        let isGhost = parentGhost || ownGhost;
        if (isoSet && isolateMode === 'ghost' && !isoSet.has(id) && !isoAncestors.has(id)) {
          isGhost = true;
        }
        node.ghost = isGhost;

        // Effective highlight & dim
        const isSelected = Boolean(selSet && selSet.has(id));
        const isHovered = Boolean(hovSet && hovSet.has(id));
        const isStageHi = node._stageHighlight;
        node.highlighted = isSelected || isStageHi;

        const isDimmed = Boolean(isoSet && isolateMode === 'dim' && !isoSet.has(id) && !isoAncestors.has(id));
        node.dimmed = isDimmed;

        // Effective explode
        const effectiveRawExplode = node._userExplode !== null ? node._userExplode : inheritedExplode;
        node.explode = node._userExplode;
        const factor = resolveExplodeFactor(node, inheritedExplode, maxOrd);

        if (node.object3d) {
          node.object3d.visible = vis;
          const [ex, ey, ez] = node.explodeVec;
          node.object3d.position.set(
            node._restPos.x + ex * factor,
            node._restPos.y + ey * factor,
            node._restPos.z + ez * factor,
          );

          const variant = isGhost ? 'ghost'
            : isDimmed ? 'dim'
            : (isSelected || isStageHi) ? 'highlight'
            : isHovered ? 'hover'
            : 'normal';

          for (const mesh of getDirectMeshes(node)) {
            applyMeshVariant(mesh, variant, node._materialOverride);
          }
        }

        for (const cid of node.children) {
          visit(cid, vis, isGhost, effectiveRawExplode);
        }
      };

      for (const rid of rootIds) visit(rid, true, false, globalExplode);
      updateTraceLines();
    }

    function getFlatList() {
      const out = [];
      const walk = (id, depth) => {
        const node = nodeMap.get(id);
        if (!node) return;
        out.push({ node, depth });
        for (const cid of node.children) walk(cid, depth + 1);
      };
      for (const rid of rootIds) walk(rid, 0);
      return out;
    }

    function getNodes() {
      return getFlatList().map((e) => e.node);
    }

    function setVisible(id, visible, { recursive = true } = {}) {
      const node = nodeMap.get(id);
      if (!node) return;
      node._userVisible = Boolean(visible);
      if (recursive) {
        for (const cid of getDescendants(id)) {
          const ch = nodeMap.get(cid);
          if (ch) ch._userVisible = Boolean(visible);
        }
      }
      apply();
      emit('visibility');
    }

    function setGhost(id, ghostFlag, { recursive = true } = {}) {
      const node = nodeMap.get(id);
      if (!node) return;
      node._userGhost = Boolean(ghostFlag);
      if (recursive) {
        for (const cid of getDescendants(id)) {
          const ch = nodeMap.get(cid);
          if (ch) ch._userGhost = Boolean(ghostFlag);
        }
      }
      apply();
      emit('ghost');
    }

    function isolate(id, { mode = 'dim' } = {}) {
      isolatedId = id && nodeMap.has(id) ? id : null;
      isolateMode = mode || 'dim';
      apply();
      emit('isolate');
    }

    function select(id) {
      selectedId = id && nodeMap.has(id) ? id : null;
      apply();
      emit('select');
    }

    function hover(id) {
      const next = id && nodeMap.has(id) ? id : null;
      if (next === hoveredId) return;
      hoveredId = next;
      apply();
      emit('hover');
    }

    function setExplode(val, scopeNodeId = null) {
      if (scopeNodeId) {
        const node = nodeMap.get(scopeNodeId);
        if (!node) return;
        node._userExplode = val === null || val === undefined ? null : clamp01(Number(val));
      } else {
        globalExplode = clamp01(Number(val) || 0);
      }
      apply();
      emit('explode');
    }

    function getExplode(nodeId = null) {
      if (nodeId) {
        const n = nodeMap.get(nodeId);
        return n && n._userExplode !== null ? n._userExplode : globalExplode;
      }
      return globalExplode;
    }

    function setTracesVisible(flag) {
      showTraces = Boolean(flag);
      apply();
      emit('traces');
    }

    function setMaterialOverride(id, materialCode, { recursive = true } = {}) {
      const node = nodeMap.get(id);
      if (!node) return;
      const code = materialCode ? materials.resolveCode(materialCode) : null;
      const applyCode = (n) => {
        n._materialOverride = code;
        for (const mesh of getDirectMeshes(n)) {
          if (mesh.userData.__ink) {
            mesh.userData.__ink.code = code || mesh.userData.__ink.origCode || n.materialCode || '8041-4';
          }
        }
      };
      applyCode(node);
      if (recursive) {
        for (const cid of getDescendants(id)) {
          const ch = nodeMap.get(cid);
          if (ch) applyCode(ch);
        }
      }
      apply();
      emit('material');
    }

    function resetStates() {
      selectedId = null;
      hoveredId = null;
      isolatedId = null;
      globalExplode = 0;
      for (const n of nodeMap.values()) {
        n._userVisible = null;
        n._userGhost = null;
        n._userExplode = null;
        n._stageVisible = true;
        n._stageGhost = false;
        n._stageHighlight = false;
      }
      apply();
      emit('reset');
    }

    function setStages(stagesArr) {
      stageList = Array.isArray(stagesArr) ? stagesArr.slice() : [];
    }

    /**
     * Evaluates granular nested Assembly -> Subassembly -> Part state across stages.
     * Preserves explicit user tree overrides (`_userVisible`, `_userGhost`, `_userExplode`).
     */
    function evaluateTimeline(t, stageIdOrStages = null) {
      const stagesArr = Array.isArray(stageIdOrStages) ? stageIdOrStages : stageList;
      const explicitStageId = typeof stageIdOrStages === 'string' || typeof stageIdOrStages === 'number'
        ? stageIdOrStages
        : null;

      const count = stagesArr.length;
      const normT = count > 0 && t > 1 ? clamp01(t / count) : clamp01(t || 0);
      timelineProgress = normT;

      if (!count) {
        apply();
        return { stageIndex: 0, stage: null, progress: normT };
      }

      let idx = 0;
      if (typeof explicitStageId === 'number') {
        idx = Math.max(0, Math.min(count - 1, explicitStageId));
      } else if (typeof explicitStageId === 'string') {
        const found = stagesArr.findIndex((s) => s.id === explicitStageId);
        idx = found >= 0 ? found : 0;
      } else {
        for (let i = 0; i < count; i++) {
          const [r0, r1] = stagesArr[i].range || [i / count, (i + 1) / count];
          if (normT >= r0 - 1e-6 && (normT < r1 || i === count - 1)) { idx = i; break; }
        }
      }
      activeStageIdx = idx;
      const st = stagesArr[idx];

      // Build fast lookup sets for stage directives
      const focusIds = new Set();
      const rawFocus = [].concat(st.focusNodes || [], st.focusNode || []).filter(Boolean);
      for (const fid of rawFocus) {
        focusIds.add(fid);
        for (const cid of getDescendants(fid)) focusIds.add(cid);
      }

      const ghostIds = new Set();
      for (const gid of st.ghostNodes || []) {
        ghostIds.add(gid);
        for (const cid of getDescendants(gid)) ghostIds.add(cid);
      }

      const hiddenIds = new Set();
      for (const hid of st.hiddenNodes || []) {
        hiddenIds.add(hid);
        for (const cid of getDescendants(hid)) hiddenIds.add(cid);
      }

      for (const node of nodeMap.values()) {
        node._stageHighlight = focusIds.has(node.id);
        node._stageGhost = ghostIds.has(node.id);
        let vis = !hiddenIds.has(node.id);
        if (st.progressive && node.stage > idx) vis = false;
        node._stageVisible = vis;
      }

      apply();
      return { stageIndex: idx, stage: st, progress: normT };
    }

    function getWorldCenter(id, outVec = new THREE.Vector3()) {
      const node = nodeMap.get(id);
      if (!node || !node.object3d) return outVec.set(0, 0, 0);
      node.object3d.updateWorldMatrix(true, false);
      return outVec.copy(node._restLocalCenter).applyMatrix4(node.object3d.matrixWorld);
    }

    function getExplodedBounds(outBox = new THREE.Box3()) {
      outBox.makeEmpty();
      const tmp = new THREE.Box3();
      const host = attachedRoot || root || scene;
      host.updateWorldMatrix(true, true);
      for (const node of nodeMap.values()) {
        if (!node.visible || !node.object3d) continue;
        for (const mesh of getDirectMeshes(node)) {
          if (!mesh.geometry.boundingBox) mesh.geometry.computeBoundingBox();
          tmp.copy(mesh.geometry.boundingBox).applyMatrix4(mesh.matrixWorld);
          outBox.union(tmp);
        }
      }
      return outBox;
    }

    function findBySpecPath(specPath) {
      if (!specPath) return [];
      const target = String(specPath);
      const matches = [];
      for (const node of nodeMap.values()) {
        if (!node.specPath) continue;
        if (node.specPath === target || node.specPath.startsWith(`${target}.`) || target.startsWith(`${node.specPath}.`)) {
          matches.push(node);
        }
      }
      return matches;
    }

    function getState() {
      return {
        version,
        selectedId,
        hoveredId,
        isolatedId,
        isolateMode,
        globalExplode,
        showTraces,
        timelineProgress,
        activeStageIdx,
      };
    }

    const treeApi = {
      traceGroup,
      addNode,
      fromObject3D,
      setStages,
      getNodes,
      getFlatList,
      getRoots: () => rootIds.map((id) => nodeMap.get(id)),
      getRootIds: () => rootIds.slice(),
      getNode: (id) => nodeMap.get(id) || null,
      getChildren: (id) => (nodeMap.get(id)?.children || []).map((cid) => nodeMap.get(cid)).filter(Boolean),
      findBySpecPath,
      setVisible,
      setGhost,
      isolate,
      clearIsolate: () => isolate(null),
      select,
      highlight: select,
      hover,
      setExplode,
      getExplode,
      setTracesVisible,
      setShowTraces: setTracesVisible,
      setMaterialOverride,
      resetStates,
      evaluateTimeline,
      getWorldCenter,
      getNodeWorldCenter: getWorldCenter,
      getExplodedBounds,
      apply,
      getState,
      onChange(fn) {
        listeners.add(fn);
        return () => listeners.delete(fn);
      },
    };

    if (root) ensureTraceHost(root);
    return treeApi;
  }

  // ---------- geometry helpers (preserved for procedural parts) ----------
  /** Cylinder whose axis runs along X. */
  const xCyl = (r, len, seg = 32, open = false) => new THREE.CylinderGeometry(r, r, len, seg, 1, open).rotateZ(Math.PI / 2);
  /** rotation.x that points a "-Z feature" at direction (dy, dz). */
  const aimX = (dy, dz) => Math.atan2(dy, -dz);
  /** Spur gear outline extruded along X. */
  function gearGeometry(r, teeth, depth, hole = 0.18, toothH = 0.05) {
    const s = new THREE.Shape();
    for (let k = 0; k <= teeth * 4; k++) {
      const a = (k / (teeth * 4)) * Math.PI * 2;
      const rr = (k % 4 < 2) ? r : r - toothH;
      k === 0 ? s.moveTo(rr * Math.cos(a), rr * Math.sin(a)) : s.lineTo(rr * Math.cos(a), rr * Math.sin(a));
    }
    if (hole) { const h = new THREE.Path(); h.absarc(0, 0, hole, 0, Math.PI * 2, true); s.holes.push(h); }
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 16 });
    g.rotateY(Math.PI / 2);
    g.translate(-depth / 2, 0, 0);
    return g;
  }
  /** Coil spring of unit height along +Y (scale.y to compress it). */
  function springGeometry(r = 0.07, turns = 6, wire = 0.009) {
    const pts = [];
    const N = turns * 20;
    for (let k = 0; k <= N; k++) {
      const a = (k / N) * turns * Math.PI * 2;
      pts.push(new THREE.Vector3(Math.cos(a) * r, k / N, Math.sin(a) * r));
    }
    return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), N * 2, wire, 5);
  }
  /** 2D convex hull of [x, y] points. */
  function hull(pts) {
    pts = pts.slice().sort((a, b) => a[0] - b[0] || a[1] - b[1]);
    const cross = (o, a, b) => (a[0] - o[0]) * (b[1] - o[1]) - (a[1] - o[1]) * (b[0] - o[0]);
    const lo = [], up = [];
    for (const p of pts) { while (lo.length >= 2 && cross(lo[lo.length - 2], lo[lo.length - 1], p) <= 0) lo.pop(); lo.push(p); }
    for (let k = pts.length - 1; k >= 0; k--) { const p = pts[k]; while (up.length >= 2 && cross(up[up.length - 2], up[up.length - 1], p) <= 0) up.pop(); up.push(p); }
    up.pop(); lo.pop();
    return lo.concat(up);
  }

  // ---------- flashes and flow ----------
  let flashTex = null;
  function flashTexture() {
    if (flashTex) return flashTex;
    const cv = document.createElement('canvas'); cv.width = cv.height = 128;
    const x = cv.getContext('2d');
    const g = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    g.addColorStop(0, 'rgba(255,252,235,1)'); g.addColorStop(0.22, 'rgba(255,201,58,.95)'); g.addColorStop(0.6, 'rgba(229,72,47,.35)'); g.addColorStop(1, 'rgba(229,72,47,0)');
    x.fillStyle = g; x.fillRect(0, 0, 128, 128);
    x.strokeStyle = 'rgba(229,72,47,.95)'; x.lineWidth = 3.5;
    for (let k = 0; k < 8; k++) {
      const a = k * Math.PI / 4, r = k % 2 ? 34 : 60;
      x.beginPath(); x.moveTo(64, 64); x.lineTo(64 + Math.cos(a) * r, 64 + Math.sin(a) * r); x.stroke();
    }
    flashTex = new THREE.CanvasTexture(cv);
    flashTex.colorSpace = THREE.SRGBColorSpace;
    return flashTex;
  }
  function flash(size = 0.001) {
    const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: flashTexture(), color: 0xffffff, transparent: true, depthWrite: false, depthTest: false }));
    sp.scale.setScalar(size);
    sp.renderOrder = 5;
    return sp;
  }

  const dotTex = (() => {
    const cv = document.createElement('canvas'); cv.width = cv.height = 32;
    const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.beginPath(); x.arc(16, 16, 13, 0, Math.PI * 2); x.fill();
    return new THREE.CanvasTexture(cv);
  })();
  const tmp = new THREE.Vector3();
  function stream(points, color, { count = 30, size = 6, parent = null } = {}) {
    const curve = new THREE.CatmullRomCurve3(points, false, 'centripetal');
    const geo = new THREE.BufferGeometry().setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(count * 3), 3));
    const mat = new THREE.PointsMaterial({ color, size, sizeAttenuation: false, map: dotTex, alphaTest: 0.01, transparent: true, opacity: 0, depthWrite: false });
    const pts = new THREE.Points(geo, mat);
    pts.renderOrder = 3;
    if (parent) parent.add(pts);
    const t = Array.from({ length: count }, (_, k) => (k + Math.random() * 0.6) / count);
    const s = {
      points: pts, curve, mat, t,
      advance(dt) {
        const pos = geo.attributes.position;
        for (let k = 0; k < count; k++) {
          t[k] = mod(t[k] + dt, 1);
          curve.getPointAt(t[k], tmp);
          pos.setXYZ(k, tmp.x, tmp.y, tmp.z);
        }
        pos.needsUpdate = true;
      },
    };
    s.advance(0);
    return s;
  }

  return {
    THREE, renderer, scene, camera, controls, INK, theme, themeId, isDarkTheme,
    ramp, toon, M, materials, lineMat, ghostLine, ghostFill, outlineMat, syncOutlinePx,
    GLTFLoader, loadGLB, parseGLB,
    applyInkStyle, createAssemblyTree,
    setDefaultView, flyTo, flyToNode, setCameraPreset, updateCamera, isCameraAnimating,
    pick, pickClient,
    part, ghost, ghostRings, markLine, inkRing,
    xCyl, aimX, gearGeometry, springGeometry, hull,
    flash, flashTexture, stream,
    D2R, mod, clamp01, smooth, HUES,
  };
}
