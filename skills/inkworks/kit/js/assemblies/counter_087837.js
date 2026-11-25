/* =========================================================================
   Assembly: EMJAC Custom Refrigerated Chef's Counter (Anchor WO 087837-032)
   Loads the hierarchical binary GLTF 2.0 (`assets/counter_087837_032.glb`)
   via `kit.loadGLB()`, applies theme-aware Inkworks toon shading + CAD ink
   edges via `kit.applyInkStyle()`, and binds the full Assembly -> Subassembly
   -> Part hierarchy, Magnetic 430 physics, 144" field-joint shipping law,
   granular build stages, standards-badged callouts, and live Engineer Options.
   ========================================================================= */
import { HUES } from '../kit.js';

const GLB_URL = new URL('../../assets/counter_087837_032.glb', import.meta.url).href;
const SPEC_URL = new URL('../../data/counter_087837.spec.json', import.meta.url).href;

const STAGES = [
  {
    id: 'stage_01_envelope',
    name: 'Top Envelope & 144" Field Joint',
    short: 'TOP 14GA',
    color: HUES.blue,
    range: [0.0, 0.2],
    explode: 0.0,
    focusNode: 'sub_top_envelope',
    cameraPreset: 'iso',
    specSection: 'locked_standards.physics_and_sheet_laws.top_sheet_ceiling',
    summary:
      '14ga 304 #4 worktop (ERP 8012-4, 40/41 = 97.6% verified) with 6" integral backsplash, drop-in cutouts, and a field-joint seam triggered at >138" under the hard 144" sheet ceiling (Series A–D 96" + Series H–J 72").',
  },
  {
    id: 'stage_02_base_thermal',
    name: '1023 Refrigerated Base & Thermal Shell',
    short: 'BASE 1023',
    color: HUES.ochre,
    range: [0.2, 0.4],
    explode: 0.15,
    focusNode: 'sub_ref_base_1023',
    cameraPreset: 'iso',
    specSection: 'section_dna.1023',
    summary:
      '2-opening refrigerated base (1023, 21.0 parts/skel): 11ga structural angles (29/29 = 100%), 16ga 1-5/8" OD tube legs (8300, 38/38 = 100%), 18ga ends (42/42 = 100%), 20ga cavity liner, and 1.000" urethane INSUL (74 qty in anchor WO).',
  },
  {
    id: 'stage_03_mag430_doors',
    name: 'Magnetic 430 Physics & Door Stack',
    short: 'MAG 430',
    color: HUES.red,
    range: [0.4, 0.6],
    explode: 0.45,
    focusNode: 'sub_doors_mag430',
    cameraPreset: 'front',
    specSection: 'locked_standards.physics_and_sheet_laws.magnetic_430_law',
    summary:
      'Ferritic 430 Physics Law: 1018 DOOR FRONT is 18ga 304 #4 (32/32 = 100%), while DOOR BACK (32/32), GASKET FRAME (17/17), and 1009 MULLION FRONT (16/16) are 100% ferritic 18ga 430 (8285) so magnetic gaskets adhere, backed by 20ga mill MULLION_BU (25/25) and 1039 PVC thermal breaks.',
  },
  {
    id: 'stage_04_subsystems',
    name: 'Cold Pan 1041, Sink 1030 & Apron 1043',
    short: 'PAN / SINK',
    color: HUES.blue,
    range: [0.6, 0.8],
    explode: 0.25,
    focusNode: 'sub_cold_pan_1041',
    cameraPreset: 'iso',
    specSection: 'section_dna.1041',
    summary:
      'Drop-in 1041 insulated cold pan (liner + 8 urethane panels + cold-wall coil), fabricated 1030 sink bowl (14ga SINK END 27/27 & EAR 24/24 = 100%), and 1043 lighted access apron (18ga 304 #4, 43/44 = 97.7%) with 1019 compressor louvers.',
  },
  {
    id: 'stage_05_exploded_bom',
    name: 'Shelves 1020, 7 Buyouts & Exploded BOM',
    short: 'BOM / EXPLODE',
    color: HUES.grey,
    range: [0.8, 1.0],
    explode: 0.85,
    focusNode: 'sub_buyouts',
    cameraPreset: 'iso',
    specSection: 'buyout_subsystems',
    summary:
      '1020 overshelf/undershelf (18ga 304 #4, 36/36 = 100%) + 14ga hat channels (28/29 = 96.6%) and 7 WO-direct buyout subsystems (Carel PJEZSNH100 shared across 30 SOs, RACO #232, SSOV3S130/MKC-1, evap coil, plumbing, cam-lift hinges, LED).',
  },
];

const SHELL_NODES = [
  'sub_top_envelope',
  'part_base_end_left',
  'part_base_end_right',
  'part_base_wrapper_back',
  'part_apron_fascia',
  'part_apron_access_panel',
  'part_compressor_louver_1019',
  'part_ref_door_l_front',
  'part_ref_door_r_front',
  'part_amb_door_l_front',
  'part_amb_door_r_front',
];

const INSULATION_NODES = [
  'part_base_insul_ure',
  'part_cold_pan_insul_8pc',
  'part_ref_door_l_insul',
  'part_ref_door_r_insul',
];

const SERIES_HJ_NODES = [
  'part_top_right',
  'part_top_blank_sink',
  'part_base_end_right',
  'part_amb_door_l_front',
  'part_amb_door_r_front',
  'sub_sink_1030',
  'part_apron_access_panel',
  'part_undershelf_sink_bay',
  'part_buyout_sink_plumbing',
];

export default {
  id: 'counter_087837',
  specUrl: './data/counter_087837.spec.json',
  meta: {
    id: 'counter_087837',
    division: 'EMJAC',
    wo: '087837-032',
    item: 'A328',
    productLine: 'CN',
    fig: 'WO 087837-032',
    caption: 'EMJAC Custom Chef & Large Counters · PL=CN · 188 DXFs · 6 Weld Series',
    title: 'Refrigerated Chef’s Counter <em>087837-032</em>',
    pageTitle: 'EMJAC Ref Counter WO 087837-032 · Engineering Intent & Standards',
    lede:
      '168" custom refrigerated counter decomposed into 8 Creo subassemblies, 27 verified shop standards, ferritic 430 magnetic door physics, 144" field-joint law, and 7 WO-direct buyout subsystems.',
    alt: 'Interactive 3D CAD assembly of EMJAC Custom Refrigerated Counter WO 087837-032 with exploded subassemblies and engineering standards',
    layout: 'sheet',
    titleBlock: {
      title: 'REF COUNTER · ITEM A328',
      dwg: 'WO-087837-032',
      scale: '1:24',
      rev: 'v2.1',
    },
  },
  view: {
    target: [0, 0.95, 0],
    dir: [1.35, 0.92, 2.25],
    radius: 4.15,
    radiusFigure: 3.95,
    radiusCompact: 4.7,
    minDist: 3.0,
    maxDist: 34,
    box: [[-3.6, 0, -0.8], [3.6, 2.45, 0.85]],
    presets: {
      iso: { target: [0, 0.95, 0], dir: [1.35, 0.92, 2.25], dist: 14.5 },
      front: { target: [0, 0.95, 0], dir: [0, 0.14, 1], dist: 14.2 },
      side: { target: [0, 0.95, 0], dir: [1, 0.22, 0.1], dist: 11.0 },
      top: { target: [0, 0.95, 0], dir: [0, 1, 0.08], dist: 15.2 },
    },
  },
  stages: STAGES,
  layers: [
    { key: 'ghostShell', label: 'Ghost Shell', on: false },
    { key: 'insulation', label: 'Insulation', on: true },
    { key: 'buyouts', label: 'Buyouts', on: true },
    { key: 'mag430Focus', label: '430 Mag Focus', on: false },
  ],
  options: [
    {
      key: 'shipping_split',
      label: 'Field-Joint Split',
      specPath: 'engineer_inputs.options.shipping_split',
      type: 'segmented',
      value: 'multi_series',
      choices: [
        { value: 'multi_series', label: 'Multi-Series (>138")' },
        { value: 'single_piece', label: 'Single (<=138")' },
      ],
    },
    {
      key: 'architectural_finish',
      label: 'Exterior Finish',
      specPath: 'engineer_inputs.options.architectural_finish',
      type: 'select',
      value: '304_no4',
      choices: [
        { value: '304_no4', label: '304 #4 Standard (8041-4)' },
        { value: 'powdercoat_black', label: 'Powdercoat Dark (9-78-2)' },
        { value: '316_coastal', label: '316 Coastal Marine' },
        { value: 'satin_brass_bronze', label: 'Satin Brass / Bronze' },
      ],
    },
    {
      key: 'drop_in_cutouts',
      label: 'Top Cutouts',
      specPath: 'engineer_inputs.options.drop_in_cutouts',
      type: 'select',
      value: 'both',
      choices: [
        { value: 'both', label: 'Cold Pan 1041 + Sink 1030' },
        { value: 'cold_pan_only', label: 'Cold Pan 1041 Only' },
        { value: 'sink_only', label: 'Sink 1030 Only' },
        { value: 'flat_top', label: 'Solid Prep Top' },
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

  async build(kit, api = {}) {
    const { THREE, scene } = kit;
    const root = new THREE.Group();
    root.name = 'counter_087837_root';
    scene.add(root);

    // Load companion Engineering Intent JSON + real binary GLB in parallel
    const [specResp, gltf] = await Promise.all([
      fetch(SPEC_URL),
      kit.loadGLB(GLB_URL),
    ]);
    const spec = specResp.ok ? await specResp.json() : { product_identity: { anchor_wo: '087837-032' } };

    // Restyle imported GLB meshes with theme-aware Inkworks toon + CAD ink edges + silhouettes
    kit.applyInkStyle(gltf.scene, {
      materialRegistry: kit.materials,
      edges: 30,
      outline: true,
      defaultMaterial: '8041-4',
    });
    root.add(gltf.scene);

    // Build hierarchical Assembly -> Subassembly -> Part tree directly from GLB scene graph
    const tree = kit.createAssemblyTree({ root: gltf.scene, stages: STAGES });
    tree.fromObject3D(gltf.scene, { defaultStage: 0 });

    // Record base explodeVecs so shipping split option can cleanly augment Series H-J separation
    const baseExplodeVec = new Map();
    for (const node of tree.getFlatList()) {
      baseExplodeVec.set(node.id, [...(node.explodeVec || [0, 0, 0])]);
    }

    // Active engineer option state
    const activeOpts = {
      shipping_split: 'multi_series',
      architectural_finish: '304_no4',
      drop_in_cutouts: 'both',
      buyout_scope: 'emjac_supplied',
    };
    const activeLayers = {
      ghostShell: false,
      insulation: true,
      buyouts: true,
      mag430Focus: false,
    };

    function syncCutouts() {
      const mode = activeOpts.drop_in_cutouts;
      const showColdPan = mode === 'both' || mode === 'cold_pan_only';
      const showSink = mode === 'both' || mode === 'sink_only';

      tree.setVisible('sub_cold_pan_1041', showColdPan, { recursive: true });
      tree.setVisible('part_top_blank_cold_pan', !showColdPan);

      tree.setVisible('sub_sink_1030', showSink, { recursive: true });
      tree.setVisible('part_buyout_sink_plumbing', showSink && activeLayers.buyouts);
      tree.setVisible('part_top_blank_sink', !showSink);

      if (!activeLayers.insulation) {
        tree.setVisible('part_cold_pan_insul_8pc', false);
      }
      if (!activeLayers.buyouts) {
        tree.setVisible('part_cold_pan_evap_coil', false);
      }
    }

    function syncShippingSplit() {
      const isSplit = activeOpts.shipping_split === 'multi_series';
      tree.setVisible('part_top_field_joint', isSplit);
      for (const nid of SERIES_HJ_NODES) {
        const node = tree.getNode(nid);
        if (!node) continue;
        const base = baseExplodeVec.get(nid) || [0, 0, 0];
        node.explodeVec = [base[0] + (isSplit ? 0.22 : 0.0), base[1], base[2]];
      }
    }

    function syncBuyoutScope() {
      const ghostBuyouts = activeOpts.buyout_scope === 'dealer_supplied';
      tree.setGhost('sub_buyouts', ghostBuyouts, { recursive: true });
      tree.setGhost('part_cold_pan_evap_coil', ghostBuyouts);
    }

    function setLayer(key, on) {
      activeLayers[key] = Boolean(on);
      if (key === 'ghostShell') {
        for (const nid of SHELL_NODES) {
          tree.setGhost(nid, Boolean(on), { recursive: true });
        }
      } else if (key === 'insulation') {
        for (const nid of INSULATION_NODES) {
          const isCpIns = nid === 'part_cold_pan_insul_8pc';
          const cpAllowed = activeOpts.drop_in_cutouts === 'both' || activeOpts.drop_in_cutouts === 'cold_pan_only';
          tree.setVisible(nid, Boolean(on) && (!isCpIns || cpAllowed));
        }
      } else if (key === 'buyouts') {
        const showSink = activeOpts.drop_in_cutouts === 'both' || activeOpts.drop_in_cutouts === 'sink_only';
        const showCp = activeOpts.drop_in_cutouts === 'both' || activeOpts.drop_in_cutouts === 'cold_pan_only';
        tree.setVisible('sub_buyouts', Boolean(on), { recursive: true });
        if (on && !showSink) tree.setVisible('part_buyout_sink_plumbing', false);
        tree.setVisible('part_cold_pan_evap_coil', Boolean(on) && showCp);
      } else if (key === 'mag430Focus') {
        if (on) {
          tree.isolate('sub_doors_mag430', { mode: 'ghost' });
          tree.setExplode(Math.max(tree.getExplode(), 0.55), 'sub_doors_mag430');
        } else {
          tree.isolate(null);
          tree.setExplode(null, 'sub_doors_mag430');
        }
      }
      tree.apply();
    }

    function onOptionChange(key, value, _state, liveSpec) {
      activeOpts[key] = value;
      const targetSpec = liveSpec || spec;
      if (!targetSpec.engineer_inputs) targetSpec.engineer_inputs = {};
      if (!targetSpec.engineer_inputs.active_selection) targetSpec.engineer_inputs.active_selection = {};
      targetSpec.engineer_inputs.active_selection[key] = value;

      if (key === 'architectural_finish') {
        // Gauge-vs-Finish Decoupling: updates exterior architectural panels while keeping
        // 14ga worktop (8012-4), ferritic 18ga 430 (8285), 11ga/20ga structure, and buyouts locked!
        kit.materials.setArchitecturalFinish(value, { includeTop: false });
      } else if (key === 'shipping_split') {
        syncShippingSplit();
      } else if (key === 'drop_in_cutouts') {
        syncCutouts();
      } else if (key === 'buyout_scope') {
        syncBuyoutScope();
      }
      tree.apply();
    }

    // Apply initial clean state (hide optional blank plates, enable field-joint split)
    syncCutouts();
    syncShippingSplit();
    syncBuyoutScope();
    tree.apply();

    // Dynamic world-space callout anchor tracker (follows live exploded positions!)
    const nodeAnchor = (nodeId, offset = [0, 0, 0]) => (vec3) => {
      const c = tree.getWorldCenter(nodeId, vec3);
      if (c) {
        vec3.x += offset[0];
        vec3.y += offset[1];
        vec3.z += offset[2];
        return vec3;
      }
      return vec3.set(offset[0], offset[1] + 1.0, offset[2]);
    };

    const callouts = [
      {
        n: 1,
        id: 'co_top_14ga',
        nodeId: 'part_top_left',
        specPath: 'locked_standards.role_gauge_matrix.TOP',
        name: '14ga 304 #4 Worktop',
        spec: '8012-4 · 97.6% (40/41)',
        status: 'locked',
        compact: true,
        at: nodeAnchor('part_top_left', [-0.7, 0.08, 0.35]),
      },
      {
        n: 2,
        id: 'co_field_joint',
        nodeId: 'part_top_field_joint',
        specPath: 'locked_standards.physics_and_sheet_laws.top_sheet_ceiling',
        name: 'Field-Joint Split (>138")',
        spec: '144" CEILING · 6 SERIES',
        status: 'engineer_input',
        compact: true,
        at: nodeAnchor('part_top_field_joint', [0, 0.14, 0.3]),
        show: () => activeOpts.shipping_split === 'multi_series',
      },
      {
        n: 3,
        id: 'co_mag_430_door',
        nodeId: 'part_ref_door_l_back_430',
        specPath: 'locked_standards.physics_and_sheet_laws.magnetic_430_law',
        name: '1018 Magnetic 430 Door Stack',
        spec: '8285 · 18ga 430 · 100%',
        status: 'locked',
        compact: true,
        at: nodeAnchor('part_ref_door_l_back_430', [-0.25, 0.05, 0.15]),
      },
      {
        n: 4,
        id: 'co_mullion_430',
        nodeId: 'part_mullion_front_430',
        specPath: 'locked_standards.role_gauge_matrix.MULLION_BU',
        name: '1009 Mullion & 1039 Break',
        spec: '430 FRONT / 20ga MILL BU',
        status: 'locked',
        compact: false,
        at: nodeAnchor('part_mullion_front_430', [0, 0.0, 0.12]),
      },
      {
        n: 5,
        id: 'co_cold_pan',
        nodeId: 'part_cold_pan_liner_1041',
        specPath: 'section_dna.1041',
        name: '1041 Insulated Cold Pan',
        spec: 'PAN + 8 URETHANE · 17/52',
        status: 'locked',
        compact: true,
        at: nodeAnchor('part_cold_pan_liner_1041', [0, 0.12, 0.0]),
        show: () => activeOpts.drop_in_cutouts === 'both' || activeOpts.drop_in_cutouts === 'cold_pan_only',
      },
      {
        n: 6,
        id: 'co_sink_1030',
        nodeId: 'part_sink_bowl_1030',
        specPath: 'section_dna.1030',
        name: '1030 Fabricated Sink Bowl',
        spec: '14ga END/EAR · 100%',
        status: 'locked',
        compact: true,
        at: nodeAnchor('part_sink_bowl_1030', [0.15, 0.25, 0.0]),
        show: () => activeOpts.drop_in_cutouts === 'both' || activeOpts.drop_in_cutouts === 'sink_only',
      },
      {
        n: 7,
        id: 'co_insul_ure',
        nodeId: 'part_base_insul_ure',
        specPath: 'locked_standards.role_gauge_matrix.INSUL',
        name: '1.000" Urethane INSUL',
        spec: '74 QTY IN WO · NON-SM',
        status: 'locked',
        compact: false,
        at: nodeAnchor('part_base_insul_ure', [-0.4, 0.2, -0.35]),
        show: () => activeLayers.insulation,
      },
      {
        n: 8,
        id: 'co_legs_angles',
        nodeId: 'part_base_legs_8300',
        specPath: 'locked_standards.role_gauge_matrix.LEG',
        name: '11ga Frame & 16ga Legs',
        spec: '8300 TUBE · 38/38 (100%)',
        status: 'locked',
        compact: false,
        at: nodeAnchor('part_base_legs_8300', [1.6, -0.04, 0.35]),
      },
      {
        n: 9,
        id: 'co_overshelf_1020',
        nodeId: 'part_overshelf_deck',
        specPath: 'locked_standards.role_gauge_matrix.SHELF',
        name: '1020 Overshelf & Channels',
        spec: '18ga 304 #4 · 14ga CH',
        status: 'locked',
        compact: false,
        at: nodeAnchor('part_overshelf_deck', [-0.4, 0.22, -0.1]),
      },
      {
        n: 10,
        id: 'co_buyout_carel',
        nodeId: 'part_buyout_carel_ctrl',
        specPath: 'buyout_subsystems.subsystems.controls_thermostat',
        name: 'Carel PJEZSNH100 & Buyouts',
        spec: '7 WO-DIRECT · 30 SOs',
        status: 'buyout',
        compact: true,
        at: nodeAnchor('part_buyout_carel_ctrl', [-0.1, 0.05, 0.15]),
        show: () => activeLayers.buyouts,
      },
    ];

    const readouts = [
      { label: 'Anchor WO', value: () => '087837-032 · A328 ($81,348)' },
      { label: 'Issued Flats', value: () => '188 DXFs · 6 Weld Series' },
      { label: 'Finish', value: () => activeOpts.architectural_finish },
      { label: 'Bend Table', value: () => 'K=0.5 · R 0.030"/0.080"' },
    ];

    return {
      root,
      tree,
      spec,
      callouts,
      readouts,
      pose(_t, _dt, _state) {
        tree.apply();
      },
      setLayer,
      onOptionChange,
      onSelectNode(nodeId) {
        if (nodeId && api?.onAssemblyEvent) {
          api.onAssemblyEvent('select', nodeId);
        }
      },
    };
  },
};
