# Assembly API

An Inkworks assembly is an ES module in `kit/js/assemblies/<name>.js` that default-exports a plain object. The workbench (`kit/js/main.js` + `kit/js/sheet.js`) reads its metadata, constructs the 5-pillar CAD workbench DOM (or `figure` card), awaits `build(kit, api)`, binds the hierarchical Assembly Tree (`Assembly -> Subassembly -> Part`), drives stage progression and exploded views, renders interactive standards-badged callouts, and synchronizes bidirectional selection with the live YAML/JSON Engineering Standards Inspector (`kit/js/inspector.js`).

`kit/js/assemblies/starter.js` is the minimal commented template. `kit/js/assemblies/counter_087837.js` is the flagship EMJAC Refrigerated Counter (`WO 087837-032`) worked example backed by a real binary `.glb` (`kit/assets/counter_087837_032.glb`) and harvested standards spec (`kit/data/counter_087837.spec.json`).

---

## Top-level assembly export

| Field | Required | Meaning |
| --- | --- | --- |
| `meta` | yes | `{ id, division, wo, item, productLine, fig, caption, title, pageTitle, lede, alt, layout, titleBlock: { title, dwg, scale, rev } }` |
| `view` | yes | Camera framing, orbit bounds, explode bounding box, and optional custom `presets` |
| `stages` | yes | Ordered array of build / Engineering DNA stages |
| `layers` | | Assembly-specific layer toggles `[{ key, label, on }]` (the workbench appends `traces`, `callouts`, `orbit`; include `ghostShell` or handle `setLayer('ghostShell', on)`) |
| `options` | | Live Engineer-Provided Options rendered in the inspector `#optionsBar` |
| `specUrl` | | Optional relative URL to a JSON companion spec (e.g. `'data/counter_087837.spec.json'`); alternatively return `spec` directly from `build()` |
| `async build(kit, api)` | yes | Loads `.glb` or constructs geometry, builds the hierarchical `tree`, and returns the live model object |

### `meta`

```js
meta: {
  id: 'counter_087837',
  division: 'EMJAC',
  wo: '087837-032',
  item: 'A328',
  productLine: 'CN',
  fig: 'WO 087837-032',
  caption: 'REF COUNTER · PL=CN · ITEM A328 · 188 DXFs',
  title: 'Refrigerated Chef Counter <em>087837-032</em>',
  pageTitle: 'EMJAC 087837-032 · Engineering Intent Workbench',
  lede: '14ga 304 #4 field-jointed top, ferritic 18ga 430 magnetic door/gasket physics, and 7 WO-direct buyout subsystems.',
  alt: 'Interactive 3D CAD assembly of EMJAC Refrigerated Counter 087837-032',
  layout: 'sheet',
  titleBlock: { title: 'REF COUNTER 087837-032', dwg: 'EMJAC-CN-087837-032', scale: 'NTS', rev: 'v2.1' },
}
```

### `view`

```js
view: {
  target: [0, 0.45, 0],
  dir: [6.8, 4.2, 8.5],
  radius: 2.8,
  radiusFigure: 2.9,
  radiusCompact: 3.4,
  minDist: 1.5,
  maxDist: 18,
  box: [[-2.4, -0.2, -1.2], [2.4, 1.8, 1.4]], // covers full exploded travel so callouts stay clear
  presets: {
    iso:   { target: [0, 0.45, 0], dir: [6.8, 4.2, 8.5] },
    front: { target: [0, 0.45, 0], dir: [0, 0.2, 10] },
    side:  { target: [0, 0.45, 0], dir: [10, 0.4, 0] },
    top:   { target: [0, 0.45, 0], dir: [0, 10, 0.01] },
  },
}
```

`sheet.js` centers `view.target` inside the free stage rectangle between the left rail and right inspector using `camera.setViewOffset`, and recomputes framing on resize and font load.

### `stages`

```js
stages: [
  {
    id: 'envelope',
    name: 'Structural Envelope & 144" Top Law',
    short: '01 Envelope',
    color: HUES.blue,
    summary: '14ga 304 #4 top (8012-4, 40/41 SOs) split at >138" field joint under the 144" sheet ceiling.',
    range: [0.0, 0.25],
    explode: 0.0,               // optional target explode value (0..1) or null to keep user override
    focusNode: 'sub_top_envelope',
    cameraPreset: 'iso',
    specSection: 'locked_standards.top_envelope',
  },
]
```

### `options` (Engineer-Provided Inputs)

```js
options: [
  {
    key: 'finish',
    label: 'Architectural Finish',
    specPath: 'engineer_inputs.architectural_finish',
    type: 'select',             // 'select' | 'toggle' | 'segmented' | 'range'
    value: '304_no4',
    choices: [
      { value: '304_no4', label: '304 #4 Standard' },
      { value: '316_coastal', label: '316 Coastal' },
      { value: 'powdercoat_slate', label: 'Slate Powdercoat' },
      { value: 'satin_brass_bronze', label: 'Satin Brass' },
    ],
  },
]
```

Changing an option in `#optionsBar` calls `model.onOptionChange(key, value, state, spec)` and re-renders the live YAML/JSON inspector so the 3D scene and contract never drift.

---

## `async build(kit, api)` return object

| Field | Required | Meaning |
| --- | --- | --- |
| `root` | yes | `THREE.Object3D` root group (added to `kit.scene` automatically if not already attached) |
| `tree` | yes | Hierarchical `AssemblyTree` instance from `kit.createAssemblyTree(...)` |
| `spec` | yes | Plain JS object rendered by `inspector.js` as YAML or JSON |
| `callouts` | yes | Array of interactive standards-badged callout descriptors |
| `pose(t, dt, state)` | yes | Evaluates timeline/stage animation for progress `t` (`0..1`) and current `state` |
| `setLayer(key, on, state)` | | Handles assembly-defined layer toggles (e.g. `'ghostShell'`) |
| `onOptionChange(key, value, state, spec)` | | Updates 3D geometry/materials and mutates `spec` when an engineer option changes |
| `onSelectNode(nodeId, state)` | | Optional hook invoked whenever a node is selected from 3D, tree, callout, or YAML/JSON |
| `readouts` | | Optional compact key/value telemetry pills |

### Callout item shape

```js
{
  n: 1,
  id: 'cal_top_14ga',
  nodeId: 'sub_top_envelope',
  specPath: 'locked_standards.top_envelope',
  name: '14ga 304 #4 Top & Field Joint',
  spec: '14ga 304 #4 · 8012-4 · 97.6%',
  status: 'locked',          // 'locked' | 'engineer_input' | 'buyout'
  compact: true,             // keep visible on phone viewports (< 700px)
  at(v, state) { return tree.getWorldCenter('sub_top_envelope', v); },
  show(state) { return true; },
}
```

---

## Core 3D Kit (`kit/js/kit.js`)

`makeKit(canvas)` returns the live 3D kit with pan-enabled `OrbitControls` (`enablePan = true`, `screenSpacePanning = true`) and re-exports GLB and material helpers:

| Export / Member | Signature & Behavior |
| --- | --- |
| `THREE`, `scene`, `camera`, `controls`, `renderer` | Vendored Three.js r169 and live WebGL context |
| `materials` | Live theme-aware `MaterialRegistry` instance (`createMaterialRegistry`) |
| `loadGLB`, `parseGLB`, `GLTFLoader` | Offline GLTF 2.0 / binary `.glb` loader (`kit/js/gltf-loader.js`) |
| `applyInkStyle(root, opts?)` | Restyles any imported GLB hierarchy with 3-step toon materials from `kit.materials`, 30-degree ink feature edges, and constant-pixel silhouette hulls attached as `__inkHelper` children without altering `userData` or hierarchy (`opts`: `{ materialRegistry?, edges=30, outline=true, defaultMaterial='8041-4' }`) |
| `createAssemblyTree(opts?)` | Creates a hierarchical `AssemblyTree` engine (`opts`: `{ root?, stages?, traceColor? }`) |
| `setDefaultView({ target, dir, dist, presets })` | Registers base camera view and optional named presets |
| `flyTo(target, dir, dist, { duration }?)` | Smoothly tweens camera position and orbit target |
| `flyToNode(nodeOrObj, { padding, dir, duration }?)` | Computes bounding sphere of a node or `Object3D` and smoothly frames it |
| `setCameraPreset(name, presetsOrOpts?)` | Transitions to `'iso'`, `'front'`, `'back'`, `'side'`, `'left'`, `'top'`, or `'reset'` |
| `updateCamera(dt)` / `isCameraAnimating()` | Advances camera tween (`returns boolean` active flag so idle-render throttling knows when settled) |
| `pick(ndcX, ndcY, roots?)` | Raycasts ignoring `__inkHelper` meshes; returns `{ nodeId, partId, subassemblyId, object, mesh, point, distance, userData } | null` |
| `pickClient(clientX, clientY, roots?)` | Converts pointer client coordinates to NDC and delegates to `pick()` |
| `part(geo, mat, { edges, outline }?)` | Procedural toon solid + feature edges + constant-pixel silhouette |
| `ghost(geo)` | Translucent hidden-line shell with dashed ink edges |
| `toon(hex)`, `M`, `lineMat`, `ghostLine`, `INK`, `HUES` | Base drawing primitives and theme-driven color slots |

---

## Hierarchical Assembly Tree & Exploded View

`const tree = kit.createAssemblyTree({ root, stages })` manages nested `assembly -> subassembly -> part` nodes with persistent per-node state across timeline scrubbing and exploded views.

### Node schema

```js
{
  id: 'sub_doors_mag430',
  name: '1018 Ref Doors & 430 Magnetic Stack',
  kind: 'subassembly',          // 'assembly' | 'subassembly' | 'part'
  parentId: 'counter_087837',
  children: ['part_door_front', 'part_door_back_430', 'part_gasket_frame_430'],
  object3d: threeGroupOrMesh,
  materialCode: '8285',
  standardStatus: 'locked',     // 'locked' | 'engineer_input' | 'buyout'
  explodeVec: [0, 0, 0.55],     // world/local translation offset at explode = 1.0
  explodeOrder: 2,              // staggered peel order
  stage: 'doors_mag430',        // stage ID when node enters build sequence
  specPath: 'locked_standards.magnetic_430_law',
  erpCode: '8285',
  meta: {},
  visible: true,
  ghost: false,
  explode: null,                // null inherits global explode; 0..1 overrides locally
  highlighted: false,
  dimmed: false,
}
```

### Tree methods

- **Ingestion & structure:** `fromObject3D(root, { overrides?, defaultStage? })`, `addNode(def)`, `setStages(stages)`, `getNodes()`, `getFlatList()`, `getRoots()`, `getNode(id)`, `getChildren(id)`, `findBySpecPath(specPath)`.
- **Per-node display state:** `setVisible(id, bool, { recursive=true }?)`, `setGhost(id, bool, { recursive=true }?)`, `isolate(id | null, { mode='dim'|'hide'|'ghost' }?)`, `highlight(id | null)` / `select(id | null)`, `hover(id | null)`, `setMaterialOverride(id, code, { recursive=true }?)`, `resetStates()`.
- **Exploded view & traces:** `setExplode(val, scopeNodeId = null)` (`0..1`, or `null` to clear a scoped override), `getExplode(nodeId?)`, `setTracesVisible(bool)` (alias `setShowTraces(bool)`), `getWorldCenter(id, outVec?)`, `getExplodedBounds(outBox?)`.
- **Granular timeline & sync:** `evaluateTimeline(t, stageIdOrStages?)` (evaluates nested stage progression while preserving explicit user visibility, ghost, isolate, and explode overrides), `apply()`, `getState()`, `onChange(fn)`.

---

## GLTF / GLB Ingestion (`kit/js/gltf-loader.js` & `kit/tools/ingest_cad.py`)

### Runtime loader (`gltf-loader.js`)

Zero-dependency offline ES module built on vendored Three.js r169:

- `new GLTFLoader()`: `.load(url, onLoad, onProgress, onError)`, `.loadAsync(url)`, `.parse(data, path, onLoad, onError)`, `.parseAsync(data, path)`.
- `loadGLB(url, options?) -> Promise<{ scene, scenes, nodes, nodesByName, materials, meshes, asset, extras, json }>`.
- `parseGLB(arrayBuffer, options?) -> { scene, scenes, nodes, nodesByName, materials, meshes, asset, extras, json }`.

Parses nested node hierarchies, TRS and 4x4 matrix transforms, multi-primitive meshes, indices, `POSITION`/`NORMAL`/`TEXCOORD_0`/`COLOR_0`, interleaved strides, and merges `node.extras`, `mesh.extras`, and `material.extras` directly into `object3d.userData` (`gltfExtras`, `gltfMaterialName`, plus promoted keys `id`, `kind`, `materialCode`, `standardStatus`, `explodeVec`, `explodeOrder`, `stage`, `specPath`).

### CAD-to-GLB ingestion script (`kit/tools/ingest_cad.py`)

Converts STEP (`.stp`/`.step`), STL (`.stl`), OBJ (`.obj`), or existing GLTF/GLB assemblies into normalized Inkworks `.glb` files with embedded hierarchical node `extras` and optional manifest JSON, ready to drop into `kit/assets/` and load with `kit.loadGLB()`. Uses OCCT / trimesh when installed and falls back cleanly for native GLB/OBJ/STL re-tagging with zero external runtime fetches.

---

## EMJAC Material Loader & Registry (`kit/js/materials.js`)

Exports: `MATERIAL_CATALOG`, `ARCHITECTURAL_FINISHES`, `resolveMaterialCode(codeOrAlias)`, `getMaterialSpec(codeOrAlias)`, `createMaterialRegistry({ ramp, theme, INK })`.

### Canonical ERP stock & material codes

| Category | Canonical Codes |
| --- | --- |
| **Stainless 304 / 316** | `8012-4` (14ga 304 #4), `8012-0` (14ga 304 X), `8027-4` (16ga 304 #4), `8041-4` (18ga 304 #4), `8067-0` (12ga 304 X), `8300` (16ga 1-5/8" leg tube), `8302` (18ga 1-1/4" brace tube), `ss_304_11ga_angle` (11ga structural angle), `ss_304_20ga_mill` (20ga mill/PG liner & backup), `ss_304_no8_mirror`, `ss_316_coastal` |
| **Magnetic 430 (Ferritic)** | `8285` (18ga 430 ferritic magnetic: door backs, gasket frames, mullion fronts) |
| **Gauge-Decoupled Powdercoat** | `9-78-1` (20ga), `9-78-2` (18ga), `9-78-3` (16ga), `9-78-4` (14ga), `9-78-5` (12ga), `9-78-6` (11ga) |
| **Architectural Finishes** | `satin_brass_bronze`, `blackened_steel`, `powdercoat_slate`, `powdercoat_ivory` |
| **Non-Metals & Buyouts** | `non_metal_ure` (urethane insulation), `non_metal_tempered` (0.750" IG glass), `gasket_magnetic`, `wood_blocking`, `buyout_hardware`, `buyout_copper`, `buyout_led` |

### Registry methods & Gauge-vs-Finish decoupling

- `.get(code, variant = 'normal' | 'highlight' | 'dim' | 'ghost')`
- `.getSpec(code)`, `.resolveCode(code)`
- `.getEdgeMaterial(variant)`, `.getOutlineMaterial(variant)`
- `.setArchitecturalFinish(finishId, { includeTop? })` with preset IDs `'304_no4'`, `'316_coastal'`, `'powdercoat_black'`, `'powdercoat_slate'`, `'satin_brass_bronze'`, `'ss_304_no8_mirror'`. Automatically preserves physics-locked materials (`8285` magnetic 430, insulation, 11ga/20ga structure, buyouts) while switching eligible exterior panels.
- `.getArchitecturalFinish()`, `.listMaterials()`, `.listFinishes()`, `.onChange(fn)`.

---

## URL Parameters, DOM IDs & `window.__sheet`

### URL query overrides

- `?a=<name>` (or `?m=<name>` alias): loads `kit/js/assemblies/<name>.js` (defaults to `<body data-assembly="counter_087837">`).
- `?layout=sheet` or `?layout=figure`: selects full workbench or embeddable presentation card.
- `?theme=creo|drafting|blueprint|patent|project`: overrides `<body data-theme="creo">`.
- `?play=1`: starts stage playback immediately (default is paused at stage 0 so CAD inspection and `design_check.sh` stay idle cleanly; `?play=0` explicitly keeps playback paused).

### Stable DOM hooks

- **Top bar:** `#assemblyBadge`, `#cameraPresets button[data-preset="iso|front|side|top|reset"]`, `.tog[data-layer]`, `#themeSeg button[data-theme]`
- **3D stage:** `#stage`, `#gl`, `#leaders`, `#callouts`, `.callout[data-node-id][data-status]`
- **Left rail:** `#stageNum`, `#stageName`, `#stageSummary`, `#stageList li[data-stage-idx]`, `#prevBtn`, `#playBtn`, `#nextBtn`, `#explodeRange`, `#explodeVal`, `#explodePresets button[data-explode]`, `#explodeScopeBtn`, `#assemblyTree` (`.tree-node[data-node-id]`, `.tree-expand`, `.tree-vis`, `.tree-ghost`, `.tree-iso`)
- **Bottom timeline:** `#timeline`, `#timelineTrack`, `.tl-row[data-node-id]`, `#timelinePlayhead`
- **Right inspector:** `#inspectorFormat button[data-format="yaml|json"]`, `#inspectorCopy`, `#inspectorFilters button[data-filter="all|locked|engineer_input|buyout"]`, `#optionsBar [data-option-key]`, `#specCode` (`.spec-line[data-spec-path]`)

### `window.__sheet` runtime API

Exposed for `smoke.py`, `shoot.py`, `record.py`, and console inspection:

```js
window.__sheet = {
  state, assembly, model, kit, tree, inspector,
  setStage, stepStage, setPlaying, setProgress,
  setExplode, selectNode, setNodeVisibility, setNodeGhost, isolateNode,
  setOption, setCameraPreset, setLayer,
  setInspectorFormat, setInspectorFilter, setTheme, layout,
};
```

Keyboard shortcuts: `Space` plays/pauses stage progression; `Left` / `Right` arrows step stages; `Escape` clears active selection/isolation.
