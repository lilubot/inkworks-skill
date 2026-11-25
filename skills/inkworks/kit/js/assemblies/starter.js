/* =========================================================================
   Inkworks Engineering Intent Starter Assembly Template
   Copy this file to `js/assemblies/<product>.js` (or run `new_project.py`).

   Demonstrates BOTH workflows in one clean minimal template:
     1. Direct CAD GLB ingestion (`kit.loadGLB` + `kit.applyInkStyle`) — set
        `GLB_URL` to your exported `.glb` from `kit/tools/ingest_cad.py`.
     2. Hierarchical Assembly -> Subassembly -> Part binding via
        `kit.createAssemblyTree`, EMJAC `kit.materials` ERP codes, exploded
        vectors, standards-badged callouts, and live Engineer Options synced
        to the companion YAML / JSON Inspector.
   ========================================================================= */
import { HUES } from '../kit.js';

// To load a real CAD assembly generated via `kit/tools/ingest_cad.py`, point GLB_URL
// at your `.glb` asset (e.g. `new URL('../../assets/my_product.glb', import.meta.url).href`).
const GLB_URL = null;

const STAGES = [
  {
    id: 'stage_01_envelope',
    name: '01 · Structural Envelope',
    short: 'ENVELOPE',
    color: HUES.blue,
    range: [0.0, 0.34],
    explode: 0.0,
    focusNode: 'sub_enclosure',
    cameraPreset: 'iso',
    specSection: 'locked_standards.envelope',
    summary:
      '14ga 304 #4 worktop (ERP 8012-4) over an 18ga 304 #4 welded body (ERP 8041-4) and 16ga 1-5/8" OD tube legs (ERP 8300).',
  },
  {
    id: 'stage_02_magnetic_door',
    name: '02 · Magnetic 430 Door Stack',
    short: 'DOOR 430',
    color: HUES.red,
    range: [0.34, 0.67],
    explode: 0.45,
    focusNode: 'sub_door_stack',
    cameraPreset: 'front',
    specSection: 'locked_standards.magnetic_430_law',
    summary:
      '18ga 304 #4 outer door face paired with an 18ga ferritic 430 inner liner (ERP 8285) so the perimeter magnetic gasket adheres reliably.',
  },
  {
    id: 'stage_03_exploded_buyouts',
    name: '03 · Buyout Hardware & Exploded BOM',
    short: 'EXPLODE',
    color: HUES.ochre,
    range: [0.67, 1.0],
    explode: 0.9,
    focusNode: 'sub_buyouts',
    cameraPreset: 'iso',
    specSection: 'buyout_subsystems',
    summary:
      'Full exploded view showing nested subassemblies, dashed trace lines, and WO-direct buyout hardware (Carel PJEZSNH100 controller).',
  },
];

function makeStarterSpec() {
  return {
    schema_version: 'inkworks.engineering_intent.v1',
    product_identity: {
      division: 'EMJAC',
      product_line: 'CN',
      anchor_wo: 'STARTER-001',
      description: 'MODULAR REFRIGERATED CABINET STARTER',
    },
    locked_standards: {
      envelope: {
        TOP: { gauge: '14ga', thickness_in: 0.075, erp_code: '8012-4', substrate: 'ss_304_no4', rule_status: 'verified_standard' },
        BODY: { gauge: '18ga', thickness_in: 0.05, erp_code: '8041-4', substrate: 'ss_304_no4', rule_status: 'verified_standard' },
        LEG: { gauge: '16ga', od_in: 1.625, erp_code: '8300', substrate: 'ss_304_no4', rule_status: 'verified_standard' },
      },
      magnetic_430_law: {
        DOOR_FRONT: { gauge: '18ga', erp_code: '8041-4', substrate: 'ss_304_no4', rule_status: 'verified_standard' },
        DOOR_BACK: { gauge: '18ga', erp_code: '8285', substrate: 'ss_430', rule_status: 'verified_standard' },
      },
      bend_table: {
        k_factor: 0.5,
        dominant_radii_in: [0.03, 0.08],
      },
    },
    buyout_subsystems: {
      controls_thermostat: {
        sku: 'Carel PJEZSNH100',
        attribution: 'wo_direct',
        node_id: 'part_controller',
      },
    },
    engineer_inputs: {
      active_selection: {
        architectural_finish: '304_no4',
        buyout_scope: 'emjac_supplied',
      },
      options: {
        architectural_finish: {
          label: 'Exterior Finish',
          default: '304_no4',
        },
        buyout_scope: {
          label: 'Buyout Scope',
          default: 'emjac_supplied',
        },
      },
    },
  };
}

export default {
  id: 'starter',
  meta: {
    id: 'starter',
    division: 'EMJAC',
    wo: 'STARTER-001',
    item: 'TEMPLATE',
    productLine: 'CN',
    fig: 'STARTER-001',
    caption: 'Engineering Intent starter template · GLB + hierarchical standards binding',
    title: 'Modular Cabinet <em>Starter Assembly</em>',
    pageTitle: 'Inkworks · Engineering Intent Assembly Starter',
    lede:
      'Minimal reference template demonstrating GLB ingestion, EMJAC ERP material codes, nested Assembly -> Subassembly -> Part hierarchy, exploded view, and live YAML/JSON sync.',
    alt: 'Interactive 3D CAD starter cabinet demonstrating Inkworks engineering standards workflow',
    layout: 'sheet',
    titleBlock: {
      title: 'STARTER CABINET',
      dwg: 'ASM-STARTER-001',
      scale: '1:12',
      rev: 'v1.0',
    },
  },
  view: {
    target: [0, 0.85, 0],
    dir: [1.5, 1.0, 2.2],
    radius: 2.3,
    radiusFigure: 2.2,
    radiusCompact: 2.7,
    minDist: 2.5,
    maxDist: 20,
    box: [[-1.3, 0, -0.8], [1.3, 1.75, 0.8]],
    presets: {
      iso: { target: [0, 0.85, 0], dir: [1.5, 1.0, 2.2], dist: 7.8 },
      front: { target: [0, 0.85, 0], dir: [0, 0.12, 1], dist: 7.5 },
      side: { target: [0, 0.85, 0], dir: [1, 0.15, 0.08], dist: 7.5 },
      top: { target: [0, 0.85, 0], dir: [0, 1, 0.08], dist: 8.5 },
    },
  },
  stages: STAGES,
  layers: [
    { key: 'ghostShell', label: 'Ghost Shell', on: false },
    { key: 'buyouts', label: 'Buyouts', on: true },
  ],
  options: [
    {
      key: 'architectural_finish',
      label: 'Exterior Finish',
      specPath: 'engineer_inputs.options.architectural_finish',
      type: 'select',
      value: '304_no4',
      choices: [
        { value: '304_no4', label: '304 #4 Standard (8041-4)' },
        { value: 'powdercoat_black', label: 'Powdercoat Dark (9-78-2)' },
        { value: 'satin_brass_bronze', label: 'Satin Brass / Bronze' },
      ],
    },
    {
      key: 'buyout_scope',
      label: 'Buyout Scope',
      specPath: 'engineer_inputs.options.buyout_scope',
      type: 'segmented',
      value: 'emjac_supplied',
      choices: [
        { value: 'emjac_supplied', label: 'Emjac Supplied' },
        { value: 'dealer_supplied', label: 'Dealer (Ghost)' },
      ],
    },
  ],

  async build(kit) {
    const { THREE, scene } = kit;
    const root = new THREE.Group();
    root.name = 'asm_starter_cabinet';
    scene.add(root);

    const spec = makeStarterSpec();
    let tree;

    if (GLB_URL) {
      // Workflow A: Direct CAD GLB ingestion (`ingest_cad.py` -> `kit.loadGLB`)
      const gltf = await kit.loadGLB(GLB_URL);
      kit.applyInkStyle(gltf.scene, {
        materialRegistry: kit.materials,
        edges: 30,
        outline: true,
        defaultMaterial: '8041-4',
      });
      root.add(gltf.scene);
      tree = kit.createAssemblyTree({ root: gltf.scene, stages: STAGES });
      tree.fromObject3D(gltf.scene, { defaultStage: 0 });
    } else {
      // Workflow B: Procedural Three.js geometry using the exact same EMJAC Material Registry
      // and `applyInkStyle` pipeline so imported GLBs and parametric parts behave identically.
      const makeMesh = (id, name, geo, matCode, extra = {}) => {
        const mesh = new THREE.Mesh(geo, kit.materials.get(matCode));
        mesh.name = id;
        mesh.userData = {
          id,
          name,
          kind: 'part',
          materialCode: matCode,
          standardStatus: 'locked',
          ...extra,
        };
        return mesh;
      };

      const subEnc = new THREE.Group();
      subEnc.name = 'sub_enclosure';
      subEnc.userData = {
        id: 'sub_enclosure',
        name: '01 · Structural Enclosure',
        kind: 'subassembly',
        explodeVec: [0, 0, 0],
        stage: 0,
        specPath: 'locked_standards.envelope',
      };

      const topMesh = makeMesh('part_top_14ga', '14ga 304 #4 Worktop (8012-4)', new THREE.BoxGeometry(2.2, 0.1, 1.3), '8012-4', {
        explodeVec: [0, 0.55, 0], explodeOrder: 2, stage: 0, specPath: 'locked_standards.envelope.TOP',
      });
      topMesh.position.set(0, 1.5, 0);

      const bodyMesh = makeMesh('part_body_18ga', '18ga 304 #4 Cabinet Body (8041-4)', new THREE.BoxGeometry(2.05, 1.15, 1.15), '8041-4', {
        explodeVec: [0, 0, -0.25], explodeOrder: 1, stage: 0, specPath: 'locked_standards.envelope.BODY',
      });
      bodyMesh.position.set(0, 0.87, -0.02);

      const legsGroup = new THREE.Group();
      legsGroup.name = 'part_legs_8300';
      legsGroup.userData = {
        id: 'part_legs_8300',
        name: '16ga 1-5/8" Tube Legs (8300)',
        kind: 'part',
        materialCode: '8300',
        standardStatus: 'locked',
        explodeVec: [0, -0.45, 0],
        explodeOrder: 2,
        stage: 0,
        specPath: 'locked_standards.envelope.LEG',
      };
      const legGeo = new THREE.CylinderGeometry(0.045, 0.045, 0.3, 16);
      for (const lx of [-0.9, 0.9]) {
        for (const lz of [-0.46, 0.46]) {
          const m = new THREE.Mesh(legGeo, kit.materials.get('8300'));
          m.position.set(lx, 0.15, lz);
          m.userData = { materialCode: '8300' };
          legsGroup.add(m);
        }
      }
      subEnc.add(topMesh, bodyMesh, legsGroup);

      const subDoor = new THREE.Group();
      subDoor.name = 'sub_door_stack';
      subDoor.userData = {
        id: 'sub_door_stack',
        name: '02 · Magnetic 430 Door Stack',
        kind: 'subassembly',
        explodeVec: [0, 0, 0.45],
        stage: 1,
        specPath: 'locked_standards.magnetic_430_law',
      };

      const doorBack = makeMesh('part_door_back_430', 'DOOR BACK · 18ga 430 Magnetic (8285)', new THREE.BoxGeometry(1.78, 0.96, 0.04), '8285', {
        explodeVec: [0, 0, 0.32], explodeOrder: 2, stage: 1, specPath: 'locked_standards.magnetic_430_law.DOOR_BACK',
      });
      doorBack.position.set(0, 0.88, 0.58);

      const doorInsul = makeMesh('part_door_insul', '1.000" Urethane Door Core', new THREE.BoxGeometry(1.72, 0.9, 0.06), 'non_metal_ure', {
        explodeVec: [0, 0, 0.56], explodeOrder: 3, stage: 1, specPath: 'locked_standards.magnetic_430_law',
      });
      doorInsul.position.set(0, 0.88, 0.63);

      const doorFront = makeMesh('part_door_front_304', 'DOOR FRONT · 18ga 304 #4 (8041-4)', new THREE.BoxGeometry(1.84, 1.0, 0.04), '8041-4', {
        explodeVec: [0, 0, 0.82], explodeOrder: 4, stage: 1, specPath: 'locked_standards.magnetic_430_law.DOOR_FRONT',
      });
      doorFront.position.set(0, 0.88, 0.68);
      subDoor.add(doorBack, doorInsul, doorFront);

      const subBuy = new THREE.Group();
      subBuy.name = 'sub_buyouts';
      subBuy.userData = {
        id: 'sub_buyouts',
        name: '03 · WO-Direct Buyout Hardware',
        kind: 'subassembly',
        standardStatus: 'buyout',
        explodeVec: [-0.2, 0.1, 0.45],
        stage: 2,
        specPath: 'buyout_subsystems',
      };

      const ctrl = makeMesh('part_controller', 'Carel PJEZSNH100 Controller', new THREE.BoxGeometry(0.28, 0.12, 0.16), 'buyout_hardware', {
        standardStatus: 'buyout', explodeVec: [-0.25, 0.18, 0.65], explodeOrder: 3, stage: 2, specPath: 'buyout_subsystems.controls_thermostat',
      });
      ctrl.position.set(-0.72, 1.38, 0.58);
      subBuy.add(ctrl);

      root.userData = {
        id: 'asm_starter_cabinet',
        name: 'Starter Modular Cabinet',
        kind: 'assembly',
        specPath: 'product_identity',
      };
      root.add(subEnc, subDoor, subBuy);
      kit.applyInkStyle(root, { materialRegistry: kit.materials, edges: 30, outline: true, defaultMaterial: '8041-4' });

      tree = kit.createAssemblyTree({ root, stages: STAGES });
      tree.fromObject3D(root, { defaultStage: 0 });
    }

    const nodeAnchor = (nodeId, offset = [0, 0, 0]) => (vec3) => {
      const c = tree.getWorldCenter(nodeId, vec3);
      if (c) {
        vec3.x += offset[0];
        vec3.y += offset[1];
        vec3.z += offset[2];
        return vec3;
      }
      return vec3.set(offset[0], offset[1] + 0.8, offset[2]);
    };

    const callouts = [
      {
        n: 1,
        id: 'co_top',
        nodeId: 'part_top_14ga',
        specPath: 'locked_standards.envelope.TOP',
        name: '14ga 304 #4 Worktop',
        spec: '8012-4 · LOCKED',
        status: 'locked',
        compact: true,
        at: nodeAnchor('part_top_14ga', [0.3, 0.08, 0.2]),
      },
      {
        n: 2,
        id: 'co_mag_430',
        nodeId: 'part_door_back_430',
        specPath: 'locked_standards.magnetic_430_law.DOOR_BACK',
        name: '18ga 430 Magnetic Liner',
        spec: '8285 · FERRITIC MAG',
        status: 'locked',
        compact: true,
        at: nodeAnchor('part_door_back_430', [0.3, 0.0, 0.1]),
      },
      {
        n: 3,
        id: 'co_ctrl',
        nodeId: 'part_controller',
        specPath: 'buyout_subsystems.controls_thermostat',
        name: 'Carel PJEZSNH100',
        spec: 'WO-DIRECT BUYOUT',
        status: 'buyout',
        compact: true,
        at: nodeAnchor('part_controller', [-0.1, 0.06, 0.1]),
      },
    ];

    return {
      root,
      tree,
      spec,
      callouts,
      pose() {
        tree.apply();
      },
      setLayer(key, on) {
        if (key === 'ghostShell') {
          tree.setGhost('part_top_14ga', Boolean(on));
          tree.setGhost('part_body_18ga', Boolean(on));
          tree.setGhost('part_door_front_304', Boolean(on));
        } else if (key === 'buyouts') {
          tree.setVisible('sub_buyouts', Boolean(on), { recursive: true });
        }
        tree.apply();
      },
      onOptionChange(key, value, _state, liveSpec) {
        const target = liveSpec || spec;
        if (!target.engineer_inputs.active_selection) target.engineer_inputs.active_selection = {};
        target.engineer_inputs.active_selection[key] = value;

        if (key === 'architectural_finish') {
          kit.materials.setArchitecturalFinish(value, { includeTop: false });
        } else if (key === 'buyout_scope') {
          tree.setGhost('sub_buyouts', value === 'dealer_supplied', { recursive: true });
        }
        tree.apply();
      },
    };
  },
};
