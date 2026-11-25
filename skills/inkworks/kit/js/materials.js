/* =========================================================================
   Inkworks: Engineering Material Loader & Registry
   Maps EMJAC / Harmonic Environments / SDI ERP stock codes and architectural
   finishes into theme-aware 3-step Inkworks toon materials, CAD edge/silhouette
   styles, highlight/dim/ghost variants, and live Gauge-vs-Finish decoupled
   architectural finish switching.
   ========================================================================= */
import * as THREE from 'three';

/**
 * Canonical EMJAC / Harmonic / SDI material catalog.
 * ERP codes & thicknesses match recipes/standards.v1.json and harvested
 * Counter 087837-032 / Wine Cooler 087836-001 engineering specs.
 */
export const MATERIAL_CATALOG = Object.freeze({
  // ---- Austenitic 304 Stainless Sheet & Tubing ----
  '8012-4': Object.freeze({
    code: '8012-4',
    erpCode: '8012-4',
    name: '14ga 304 #4 Brushed Stainless',
    shortLabel: '14ga 304 #4 · 8012-4',
    gauge: 14,
    thicknessIn: 0.075,
    alloy: '304',
    finish: '#4 Brushed',
    category: 'stainless_304',
    architecturalZone: 'top',
    hex: '#d2d8e1',
    blueprintHex: '#4674b2',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '8012-0': Object.freeze({
    code: '8012-0',
    erpCode: '8012-0',
    name: '14ga 304 Mill (Ungrained)',
    shortLabel: '14ga 304 X · 8012-0',
    gauge: 14,
    thicknessIn: 0.075,
    alloy: '304',
    finish: 'Mill / Ungrained',
    category: 'structural',
    architecturalZone: null,
    hex: '#b9c2cf',
    blueprintHex: '#356099',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '8027-4': Object.freeze({
    code: '8027-4',
    erpCode: '8027-4',
    name: '16ga 304 #4 Brushed Stainless',
    shortLabel: '16ga 304 #4 · 8027-4',
    gauge: 16,
    thicknessIn: 0.060,
    alloy: '304',
    finish: '#4 Brushed',
    category: 'stainless_304',
    architecturalZone: 'exterior',
    hex: '#cad2dc',
    blueprintHex: '#3f6ca8',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '8041-4': Object.freeze({
    code: '8041-4',
    erpCode: '8041-4',
    name: '18ga 304 #4 Brushed Stainless',
    shortLabel: '18ga 304 #4 · 8041-4',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: '304',
    finish: '#4 Brushed',
    category: 'stainless_304',
    architecturalZone: 'exterior',
    hex: '#c3ccd8',
    blueprintHex: '#3a66a1',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '8067-0': Object.freeze({
    code: '8067-0',
    erpCode: '8067-0',
    name: '12ga 304 Mill Heavy Plate',
    shortLabel: '12ga 304 X · 8067-0',
    gauge: 12,
    thicknessIn: 0.105,
    alloy: '304',
    finish: 'Mill / Flat Backup',
    category: 'structural',
    architecturalZone: null,
    hex: '#a5b0bf',
    blueprintHex: '#2b538a',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '8300': Object.freeze({
    code: '8300',
    erpCode: '8300',
    name: '16ga 304 Round Tube 1-5/8" OD',
    shortLabel: '16ga Leg Tube · 8300',
    gauge: 16,
    thicknessIn: 0.060,
    alloy: '304',
    finish: '#3 Polish Tube',
    category: 'structural',
    architecturalZone: null,
    hex: '#bec7d4',
    blueprintHex: '#39639c',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '8302': Object.freeze({
    code: '8302',
    erpCode: '8302',
    name: '18ga 304 Round Tube 1-1/4" OD',
    shortLabel: '18ga Brace · 8302',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: '304',
    finish: '#3 Polish Tube',
    category: 'structural',
    architecturalZone: null,
    hex: '#b4becb',
    blueprintHex: '#345e96',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'ss_304_11ga_angle': Object.freeze({
    code: 'ss_304_11ga_angle',
    erpCode: '11GA-ANG',
    name: '11ga Stainless Structural Angle',
    shortLabel: '11ga Struct Angle',
    gauge: 11,
    thicknessIn: 0.120,
    alloy: '304',
    finish: 'HRAP Structural',
    category: 'structural',
    architecturalZone: null,
    hex: '#94a0b0',
    blueprintHex: '#264b80',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'ss_304_20ga_mill': Object.freeze({
    code: 'ss_304_20ga_mill',
    erpCode: '20GA-MILL',
    name: '20ga Mill / PG Liner & Backup',
    shortLabel: '20ga Mill / PG',
    gauge: 20,
    thicknessIn: 0.036,
    alloy: '304 / PG',
    finish: '2B Mill / Paint-Grip',
    category: 'structural',
    architecturalZone: null,
    hex: '#aeb8c6',
    blueprintHex: '#31598f',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'ss_304_no8_mirror': Object.freeze({
    code: 'ss_304_no8_mirror',
    erpCode: '304-#8',
    name: '304 #8 Mirror Architectural Stainless',
    shortLabel: '304 #8 Mirror',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: '304',
    finish: '#8 Mirror',
    category: 'architectural',
    architecturalZone: 'exterior',
    hex: '#e8edf4',
    blueprintHex: '#5c8bc7',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'ss_316_coastal': Object.freeze({
    code: 'ss_316_coastal',
    erpCode: '316-4',
    name: '316 Coastal Marine #4 Stainless',
    shortLabel: '316 #4 Coastal',
    gauge: 14,
    thicknessIn: 0.075,
    alloy: '316',
    finish: '#4 Marine Brushed',
    category: 'architectural',
    architecturalZone: 'top',
    hex: '#c6d3dc',
    blueprintHex: '#4278b0',
    opacity: 1,
    edgeThreshold: 30,
  }),

  // ---- Magnetic Ferritic 430 Stainless (EMJAC Magnetic Gasket Law) ----
  '8285': Object.freeze({
    code: '8285',
    erpCode: '8285',
    name: '18ga 430 Magnetic Ferritic Stainless',
    shortLabel: '18ga 430 MAG · 8285',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: '430 (Ferritic)',
    finish: '#4 Magnetic',
    category: 'magnetic_430',
    architecturalZone: null, // LOCKED PHYSICS: never overwritten by architectural finish
    hex: '#89b4d4',
    blueprintHex: '#4f88bf',
    opacity: 1,
    edgeThreshold: 30,
  }),

  // ---- Gauge-Decoupled Powdercoat / Architectural Series (9-78-1..6) ----
  '9-78-1': Object.freeze({
    code: '9-78-1',
    erpCode: '9-78-1',
    name: '20ga Architectural Powdercoat Sheet',
    shortLabel: '20ga Finish · 9-78-1',
    gauge: 20,
    thicknessIn: 0.036,
    alloy: '304 / CRS',
    finish: 'Powdercoat Decoupled',
    category: 'powdercoat',
    architecturalZone: 'exterior',
    hex: '#a9b5c4',
    blueprintHex: '#386299',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '9-78-2': Object.freeze({
    code: '9-78-2',
    erpCode: '9-78-2',
    name: '18ga Architectural Powdercoat Sheet',
    shortLabel: '18ga Finish · 9-78-2',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: '304 / CRS',
    finish: 'Powdercoat Decoupled',
    category: 'powdercoat',
    architecturalZone: 'exterior',
    hex: '#a2afbf',
    blueprintHex: '#365f96',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '9-78-3': Object.freeze({
    code: '9-78-3',
    erpCode: '9-78-3',
    name: '16ga Architectural Powdercoat Sheet',
    shortLabel: '16ga Finish · 9-78-3',
    gauge: 16,
    thicknessIn: 0.060,
    alloy: '304 / CRS',
    finish: 'Powdercoat Decoupled',
    category: 'powdercoat',
    architecturalZone: 'exterior',
    hex: '#9ba8b8',
    blueprintHex: '#335c91',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '9-78-4': Object.freeze({
    code: '9-78-4',
    erpCode: '9-78-4',
    name: '14ga Architectural Powdercoat Sheet',
    shortLabel: '14ga Finish · 9-78-4',
    gauge: 14,
    thicknessIn: 0.075,
    alloy: '304 / CRS',
    finish: 'Powdercoat Decoupled',
    category: 'powdercoat',
    architecturalZone: 'exterior',
    hex: '#94a1b2',
    blueprintHex: '#30588c',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '9-78-5': Object.freeze({
    code: '9-78-5',
    erpCode: '9-78-5',
    name: '12ga Architectural Powdercoat Plate',
    shortLabel: '12ga Finish · 9-78-5',
    gauge: 12,
    thicknessIn: 0.105,
    alloy: '304 / CRS',
    finish: 'Powdercoat Decoupled',
    category: 'powdercoat',
    architecturalZone: 'exterior',
    hex: '#8c99aa',
    blueprintHex: '#2d5385',
    opacity: 1,
    edgeThreshold: 30,
  }),
  '9-78-6': Object.freeze({
    code: '9-78-6',
    erpCode: '9-78-6',
    name: '11ga Architectural Structural',
    shortLabel: '11ga Finish · 9-78-6',
    gauge: 11,
    thicknessIn: 0.120,
    alloy: '304 / CRS',
    finish: 'Powdercoat Structural',
    category: 'powdercoat',
    architecturalZone: 'exterior',
    hex: '#8592a3',
    blueprintHex: '#2a4e80',
    opacity: 1,
    edgeThreshold: 30,
  }),

  // ---- Specialty Architectural Finishes ----
  'satin_brass_bronze': Object.freeze({
    code: 'satin_brass_bronze',
    erpCode: 'ARCH-BRZ',
    name: 'Satin Brass / Architectural Bronze',
    shortLabel: 'Satin Brass / Bronze',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: 'C260 / PVD',
    finish: 'Satin Brushed',
    category: 'architectural',
    architecturalZone: 'exterior',
    hex: '#cbb082',
    blueprintHex: '#8d7a55',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'blackened_steel': Object.freeze({
    code: 'blackened_steel',
    erpCode: 'ARCH-BLK',
    name: 'Blackened Steel / Matte Black Powdercoat',
    shortLabel: 'Blackened Steel',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: 'CRS / Patina',
    finish: 'Matte Blackened',
    category: 'architectural',
    architecturalZone: 'exterior',
    hex: '#5d6673',
    blueprintHex: '#1f3f6e',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'powdercoat_slate': Object.freeze({
    code: 'powdercoat_slate',
    erpCode: 'PC-SLATE',
    name: 'Architectural Slate Powdercoat',
    shortLabel: 'Slate Powdercoat',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: '304 / PC',
    finish: 'Fine Texture Slate',
    category: 'architectural',
    architecturalZone: 'exterior',
    hex: '#7b8a9e',
    blueprintHex: '#2c548a',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'powdercoat_ivory': Object.freeze({
    code: 'powdercoat_ivory',
    erpCode: 'PC-IVORY',
    name: 'Architectural Warm Ivory Powdercoat',
    shortLabel: 'Ivory Powdercoat',
    gauge: 18,
    thicknessIn: 0.050,
    alloy: '304 / PC',
    finish: 'Satin Ivory',
    category: 'architectural',
    architecturalZone: 'exterior',
    hex: '#e5dfd3',
    blueprintHex: '#567cb0',
    opacity: 1,
    edgeThreshold: 30,
  }),

  // ---- Thermal, Glazing, Elastomer, Wood & Buyout Hardware ----
  'non_metal_ure': Object.freeze({
    code: 'non_metal_ure',
    erpCode: 'INSUL-URE',
    name: 'Rigid Urethane Insulation (0.750"–1.000")',
    shortLabel: 'Urethane INSUL',
    gauge: null,
    thicknessIn: 1.0,
    alloy: 'Polyurethane Foam',
    finish: 'Foil / Rigid Board',
    category: 'insulation',
    architecturalZone: null,
    hex: '#e5c176',
    blueprintHex: '#9e844a',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'non_metal_tempered': Object.freeze({
    code: 'non_metal_tempered',
    erpCode: 'GLS-0750-IG',
    name: '0.750" Tempered Insulated Glazing (IG)',
    shortLabel: '0.750" IG Glass',
    gauge: null,
    thicknessIn: 0.75,
    alloy: 'Tempered Low-E',
    finish: 'Clear IG Unit',
    category: 'glazing',
    architecturalZone: null,
    hex: '#92c9ec',
    blueprintHex: '#7bbef2',
    opacity: 0.28,
    edgeThreshold: 30,
  }),
  'gasket_magnetic': Object.freeze({
    code: 'gasket_magnetic',
    erpCode: 'GSK-MAG',
    name: 'Magnetic EPDM Door Gasket & Thermal Break',
    shortLabel: 'Magnetic Gasket',
    gauge: null,
    thicknessIn: 0.625,
    alloy: 'EPDM / Ferrite',
    finish: 'Extruded Seal',
    category: 'elastomer',
    architecturalZone: null,
    hex: '#616b78',
    blueprintHex: '#204270',
    opacity: 1,
    edgeThreshold: 35,
  }),
  'wood_blocking': Object.freeze({
    code: 'wood_blocking',
    erpCode: 'BLK-1500',
    name: '1.500" Structural Wood Blocking',
    shortLabel: '1.500" Wood Block',
    gauge: null,
    thicknessIn: 1.5,
    alloy: 'Kiln-Dried Lumber',
    finish: 'Structural Core',
    category: 'wood',
    architecturalZone: null,
    hex: '#cbb08c',
    blueprintHex: '#827158',
    opacity: 1,
    edgeThreshold: 30,
  }),
  'buyout_hardware': Object.freeze({
    code: 'buyout_hardware',
    erpCode: 'BUYOUT',
    name: 'WO-Direct Buyout Hardware & Controls',
    shortLabel: 'Buyout Hardware',
    gauge: null,
    thicknessIn: null,
    alloy: 'OEM Assembly',
    finish: 'Factory Supplied',
    category: 'buyout',
    architecturalZone: null,
    hex: '#8496ad',
    blueprintHex: '#436fa6',
    opacity: 1,
    edgeThreshold: 28,
  }),
  'buyout_copper': Object.freeze({
    code: 'buyout_copper',
    erpCode: 'BUYOUT-REF',
    name: 'Refrigeration Evap Coil & Solenoid (Copper)',
    shortLabel: 'Evap / Copper',
    gauge: null,
    thicknessIn: null,
    alloy: 'Cu / Brass',
    finish: 'Brazed Refrigeration',
    category: 'buyout',
    architecturalZone: null,
    hex: '#cf8e5a',
    blueprintHex: '#b37d4b',
    opacity: 1,
    edgeThreshold: 28,
  }),
  'buyout_led': Object.freeze({
    code: 'buyout_led',
    erpCode: 'BUYOUT-LED',
    name: 'LED Light Strip & Diffuser (Apron 1043)',
    shortLabel: 'LED Strip 1043',
    gauge: null,
    thicknessIn: null,
    alloy: 'Al / Polycarbonate',
    finish: '3000K Warm Diffused',
    category: 'buyout',
    architecturalZone: null,
    hex: '#f5edcf',
    blueprintHex: '#8ab4e6',
    opacity: 1,
    edgeThreshold: 30,
  }),
});

/**
 * Aliases normalizing standards.v1.json keys, GLTF material names, and shorthand tags
 * into canonical MATERIAL_CATALOG keys.
 */
const ALIASES = Object.freeze({
  // standards.v1.json keys
  'ss304-14-4': '8012-4',
  'ss304_14_4': '8012-4',
  '14ga_304_4': '8012-4',
  '14ga_304': '8012-4',
  'ss_304_14ga_no4': '8012-4',
  '8012_4': '8012-4',
  'ss304-14-x': '8012-0',
  '14ga_304_x': '8012-0',
  '8012_0': '8012-0',
  'ss304-16-4': '8027-4',
  'ss304_16_4': '8027-4',
  '16ga_304_4': '8027-4',
  '16ga_304': '8027-4',
  'ss_304_16ga_no4': '8027-4',
  '8027_4': '8027-4',
  'ss304-18-4': '8041-4',
  'ss304_18_4': '8041-4',
  '18ga_304_4': '8041-4',
  '18ga_304': '8041-4',
  'ss_304_18ga_no4': '8041-4',
  '8041_4': '8041-4',
  'ss304-12-x': '8067-0',
  '12ga_304_x': '8067-0',
  '12ga_304': '8067-0',
  '8067_0': '8067-0',
  'ss304-tube-1.625-16': '8300',
  '16ga_leg_tube': '8300',
  '16ga_tube': '8300',
  'leg_tube': '8300',
  'ss304-tube-1.25-18': '8302',
  '18ga_brace_tube': '8302',
  '11ga_angle': 'ss_304_11ga_angle',
  'ss304-11-angle': 'ss_304_11ga_angle',
  '8069-0': 'ss_304_11ga_angle',
  '20ga_mill': 'ss_304_20ga_mill',
  '20ga_pg': 'ss_304_20ga_mill',
  'ss304-20-x': 'ss_304_20ga_mill',
  '8055-0': 'ss_304_20ga_mill',
  '304_no8': 'ss_304_no8_mirror',
  'mirror_ss': 'ss_304_no8_mirror',
  '316_coastal': 'ss_316_coastal',
  '316_no4': 'ss_316_coastal',
  'ss_316_14ga': 'ss_316_coastal',

  // Magnetic 430
  'ss430-18-4': '8285',
  'ss430_18_4': '8285',
  '18ga_430': '8285',
  '18ga_430_mag': '8285',
  'ss_430_18ga': '8285',
  'mag_430': '8285',
  'magnetic_430': '8285',

  // Powdercoat 9-78-1..6
  '9_78_1': '9-78-1',
  '9_78_2': '9-78-2',
  '9_78_3': '9-78-3',
  '9_78_4': '9-78-4',
  '9_78_5': '9-78-5',
  '9_78_6': '9-78-6',

  // Specialty finishes
  'satin_brass': 'satin_brass_bronze',
  'architectural_bronze': 'satin_brass_bronze',
  'bronze': 'satin_brass_bronze',
  'matte_black': 'blackened_steel',
  'powdercoat_black': 'blackened_steel',
  'black_powdercoat': 'blackened_steel',
  'powdercoat_custom': 'powdercoat_slate',
  'custom_powdercoat': 'powdercoat_slate',
  'powdercoat_white': 'powdercoat_ivory',

  // Non-metals & buyouts
  'insul_urethane': 'non_metal_ure',
  'urethane': 'non_metal_ure',
  'insulation': 'non_metal_ure',
  'insul': 'non_metal_ure',
  'ig_glass': 'non_metal_tempered',
  'glass_0750': 'non_metal_tempered',
  'tempered_glass': 'non_metal_tempered',
  'glass': 'non_metal_tempered',
  'magnetic_gasket': 'gasket_magnetic',
  'gasket': 'gasket_magnetic',
  'thermal_break': 'gasket_magnetic',
  'blocking': 'wood_blocking',
  'plywood_blocking': 'wood_blocking',
  'buyout': 'buyout_hardware',
  'hardware': 'buyout_hardware',
  'buyout_controls': 'buyout_hardware',
  'evap_coil': 'buyout_copper',
  'refrigeration_coil': 'buyout_copper',
  'copper_line': 'buyout_copper',
  'copper': 'buyout_copper',
  'led_light': 'buyout_led',
  'light_strip': 'buyout_led',
  'led': 'buyout_led',
});

/**
 * Selectable architectural finish presets for live Gauge-vs-Finish Decoupling.
 * Notice: magnetic 430 (8285), urethane insulation, 11ga/20ga structural, and
 * buyouts are never altered by architectural finishes.
 */
export const ARCHITECTURAL_FINISHES = Object.freeze([
  Object.freeze({
    id: '304_no4',
    label: '304 #4 Standard Stainless',
    shortLabel: '304 #4 Std',
    erpNote: '8012-4 / 8041-4 (NSF standard)',
    hex: null, // restores each catalog entry's native stainless color
    blueprintHex: null,
    targets: 'all_exterior',
  }),
  Object.freeze({
    id: '316_coastal',
    label: '316 Coastal Marine #4',
    shortLabel: '316 Coastal',
    erpNote: '316L alloy override (coastal / marine NSF)',
    hex: '#c2d4de',
    blueprintHex: '#457cb5',
    targets: 'all_exterior',
  }),
  Object.freeze({
    id: 'powdercoat_slate',
    label: 'Custom Powdercoat (Slate)',
    shortLabel: 'Slate PC',
    erpNote: '9-78-x fascia finish (14ga top stays 304 #4)',
    hex: '#7e8fa3',
    blueprintHex: '#2f5a91',
    targets: 'fascia_only',
  }),
  Object.freeze({
    id: 'powdercoat_black',
    label: 'Blackened Steel / Matte Black',
    shortLabel: 'Blackened',
    erpNote: '9-78-x matte black fascia (14ga top stays 304 #4)',
    hex: '#626c7a',
    blueprintHex: '#204273',
    targets: 'fascia_only',
  }),
  Object.freeze({
    id: 'satin_brass_bronze',
    label: 'Satin Brass / Architectural Bronze',
    shortLabel: 'Satin Brass',
    erpNote: 'Harmonic/EMJAC brass fascia (14ga top stays 304 #4)',
    hex: '#cbb082',
    blueprintHex: '#8d7a55',
    targets: 'fascia_only',
  }),
  Object.freeze({
    id: 'ss_304_no8_mirror',
    label: '304 #8 Mirror Polish',
    shortLabel: '304 #8 Mirror',
    erpNote: 'Architectural #8 mirror exterior panels',
    hex: '#e7edf5',
    blueprintHex: '#5c8bc7',
    targets: 'fascia_only',
  }),
]);

/**
 * Resolves any ERP code, standards.v1.json key, or GLTF material name
 * (e.g. "MAT_8012_4", "SS304-14-4", "8285", "non_metal_ure") to a canonical catalog key.
 */
export function resolveMaterialCode(codeOrAlias) {
  if (!codeOrAlias || typeof codeOrAlias !== 'string') return '8041-4';
  const raw = codeOrAlias.trim();
  if (MATERIAL_CATALOG[raw]) return raw;

  const stripped = raw.replace(/^(mat|material|emjac|erp)[_:\-\s]+/i, '');
  if (MATERIAL_CATALOG[stripped]) return stripped;

  const lower = stripped.toLowerCase();
  if (MATERIAL_CATALOG[lower]) return lower;
  if (ALIASES[lower]) return ALIASES[lower];

  const dashNorm = lower.replace(/[_\s]+/g, '-');
  if (MATERIAL_CATALOG[dashNorm]) return MATERIAL_CATALOG[dashNorm].code;
  if (ALIASES[dashNorm]) return ALIASES[dashNorm];

  const underNorm = lower.replace(/[-\s]+/g, '_');
  if (ALIASES[underNorm]) return ALIASES[underNorm];

  // Substring heuristics for arbitrary CAD STEP->GLB material names
  if (/8285|430|mag/.test(lower)) return '8285';
  if (/8012|14\s*ga/.test(lower)) return '8012-4';
  if (/8027|16\s*ga/.test(lower)) return '8027-4';
  if (/8041|18\s*ga/.test(lower)) return '8041-4';
  if (/8067|12\s*ga/.test(lower)) return '8067-0';
  if (/11\s*ga|angle/.test(lower)) return 'ss_304_11ga_angle';
  if (/20\s*ga|liner|backup/.test(lower)) return 'ss_304_20ga_mill';
  if (/8300|leg/.test(lower)) return '8300';
  if (/ure|insul|foam/.test(lower)) return 'non_metal_ure';
  if (/glass|glaz|temper/.test(lower)) return 'non_metal_tempered';
  if (/gasket|epdm|seal|rubber/.test(lower)) return 'gasket_magnetic';
  if (/wood|block/.test(lower)) return 'wood_blocking';
  if (/copper|evap|coil/.test(lower)) return 'buyout_copper';
  if (/led|light/.test(lower)) return 'buyout_led';
  if (/brass|bronze/.test(lower)) return 'satin_brass_bronze';
  if (/black|charcoal/.test(lower)) return 'blackened_steel';
  if (/buyout|carel|raco|hinge|drain/.test(lower)) return 'buyout_hardware';

  return '8041-4';
}

export function getMaterialSpec(codeOrAlias) {
  return MATERIAL_CATALOG[resolveMaterialCode(codeOrAlias)];
}

function hexLuminance(hex) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#' || hex.length < 7) return 0.9;
  const r = parseInt(hex.slice(1, 3), 16) / 255;
  const g = parseInt(hex.slice(3, 5), 16) / 255;
  const b = parseInt(hex.slice(5, 7), 16) / 255;
  return 0.2126 * r + 0.7152 * g + 0.0722 * b;
}

/**
 * Creates a theme-aware MaterialRegistry bound to a kit's toon ramp, theme, and INK color.
 */
export function createMaterialRegistry({ ramp, theme, INK }) {
  const darkPaper = hexLuminance(theme?.css?.['--paper']) < 0.35;
  const themeSteel = new THREE.Color(theme?.mat?.steel || '#c3ccd8');
  const themeAccent = new THREE.Color(theme?.accent || '#4caf3e');
  const themeBlue = new THREE.Color(theme?.hues?.blue || '#0f9bd7');
  const paperColor = new THREE.Color(theme?.css?.['--paper'] || '#eef2f7');
  const inkColor = INK ? INK.clone() : new THREE.Color(theme?.css?.['--ink'] || '#1d2733');

  // Detect warm parchment theme (patent) so neutral stainless blends softly with paper stock
  const isWarmParchment = !darkPaper && (paperColor.r - paperColor.b) > 0.06;

  let currentFinishId = '304_no4';
  const listeners = new Set();
  const cache = new Map(); // code -> { normal, highlight, dim, ghost }

  function computeBaseColor(spec, finishPreset, includeTop = false) {
    let hex = darkPaper ? spec.blueprintHex : spec.hex;

    // Apply live architectural finish override ONLY to eligible architectural zones
    if (finishPreset && finishPreset.id !== '304_no4' && spec.architecturalZone) {
      const eligible = finishPreset.targets === 'all_exterior'
        || spec.architecturalZone === 'exterior'
        || (includeTop && spec.architecturalZone === 'top');
      if (eligible) {
        hex = darkPaper ? (finishPreset.blueprintHex || hex) : (finishPreset.hex || hex);
      }
    }

    const col = new THREE.Color(hex);
    if (isWarmParchment && (spec.category === 'stainless_304' || spec.category === 'structural')) {
      col.lerp(themeSteel, 0.42);
    }
    return col;
  }

  function computeHighlightColor(baseColor) {
    return baseColor.clone().lerp(themeAccent, darkPaper ? 0.55 : 0.48);
  }

  function computeDimColor(baseColor) {
    return baseColor.clone().lerp(paperColor, 0.55);
  }

  // Shared edge & outline materials across variants
  const edgeMats = {
    normal: new THREE.LineBasicMaterial({ color: inkColor, transparent: true, opacity: 0.86 }),
    highlight: new THREE.LineBasicMaterial({ color: themeAccent.clone().lerp(inkColor, darkPaper ? 0.05 : 0.2), transparent: true, opacity: 1.0 }),
    hover: new THREE.LineBasicMaterial({ color: themeBlue.clone(), transparent: true, opacity: 0.96 }),
    dim: new THREE.LineBasicMaterial({ color: inkColor, transparent: true, opacity: 0.2 }),
    ghost: new THREE.LineDashedMaterial({ color: inkColor, transparent: true, opacity: 0.42, dashSize: 0.09, gapSize: 0.07 }),
  };

  const ghostFillMat = new THREE.MeshBasicMaterial({
    color: theme?.ghost?.fill || '#4d7fb3',
    transparent: true,
    opacity: theme?.ghost?.opacity ?? 0.045,
    depthWrite: false,
    side: THREE.DoubleSide,
  });

  const sharedPxUniform = { value: 0.002 };

  function makeOutlineShader(color, pxScale = 1.0) {
    return new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: color.clone() },
        uPx: sharedPxUniform,
        uScale: { value: pxScale },
      },
      vertexShader: /* glsl */`
        uniform float uPx;
        uniform float uScale;
        void main() {
          vec4 mv = modelViewMatrix * vec4(position, 1.0);
          vec3 n = normalize(normalMatrix * normal);
          mv.xyz += n * (uPx * uScale) * max(-mv.z, 0.1);
          gl_Position = projectionMatrix * mv;
        }`,
      fragmentShader: /* glsl */`
        uniform vec3 uColor;
        void main() { gl_FragColor = vec4(uColor, 1.0); }`,
      side: THREE.BackSide,
    });
  }

  const outlineMats = {
    normal: makeOutlineShader(inkColor, 1.0),
    highlight: makeOutlineShader(themeAccent.clone().lerp(inkColor, darkPaper ? 0.05 : 0.12), 1.35),
    hover: makeOutlineShader(themeBlue, 1.2),
  };

  function getOrCreateBundle(code) {
    const canonical = resolveMaterialCode(code);
    if (cache.has(canonical)) return cache.get(canonical);

    const spec = MATERIAL_CATALOG[canonical];
    const finishPreset = ARCHITECTURAL_FINISHES.find((f) => f.id === currentFinishId);
    const baseCol = computeBaseColor(spec, finishPreset, false);
    const isGlass = spec.category === 'glazing' || spec.opacity < 0.99;

    const normal = new THREE.MeshToonMaterial({
      name: `ink_${canonical}_normal`,
      color: baseCol,
      gradientMap: ramp,
      transparent: isGlass,
      opacity: isGlass ? (theme?.mat?.glassOpacity ?? spec.opacity) : 1,
      depthWrite: !isGlass,
      polygonOffset: !isGlass,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const highlight = new THREE.MeshToonMaterial({
      name: `ink_${canonical}_highlight`,
      color: computeHighlightColor(baseCol),
      gradientMap: ramp,
      transparent: isGlass,
      opacity: isGlass ? Math.min(0.62, (spec.opacity || 0.28) + 0.22) : 1,
      depthWrite: !isGlass,
      polygonOffset: !isGlass,
      polygonOffsetFactor: 1,
      polygonOffsetUnits: 1,
    });

    const dim = new THREE.MeshToonMaterial({
      name: `ink_${canonical}_dim`,
      color: computeDimColor(baseCol),
      gradientMap: ramp,
      transparent: true,
      opacity: isGlass ? 0.08 : 0.22,
      depthWrite: false,
      polygonOffset: false,
    });

    const bundle = { code: canonical, spec, normal, highlight, dim, ghost: ghostFillMat };
    cache.set(canonical, bundle);
    return bundle;
  }

  function emitChange(info) {
    for (const fn of listeners) {
      try { fn(info); } catch (e) { console.error(e); }
    }
  }

  return {
    resolveCode: resolveMaterialCode,
    getSpec: getMaterialSpec,

    get(codeOrAlias, variant = 'normal') {
      const b = getOrCreateBundle(codeOrAlias);
      return b[variant] || b.normal;
    },

    getEdgeMaterial(variant = 'normal') {
      return edgeMats[variant] || edgeMats.normal;
    },

    getOutlineMaterial(variant = 'normal') {
      return outlineMats[variant] || outlineMats.normal;
    },

    syncOutlinePx(uPx) {
      sharedPxUniform.value = uPx;
    },

    setArchitecturalFinish(finishId, { includeTop = false } = {}) {
      const preset = ARCHITECTURAL_FINISHES.find((f) => f.id === finishId) || ARCHITECTURAL_FINISHES[0];
      currentFinishId = preset.id;
      const affectedCodes = [];

      for (const [code, bundle] of cache.entries()) {
        if (!bundle.spec.architecturalZone) continue;
        const nextBase = computeBaseColor(bundle.spec, preset, includeTop);
        bundle.normal.color.copy(nextBase);
        bundle.highlight.color.copy(computeHighlightColor(nextBase));
        bundle.dim.color.copy(computeDimColor(nextBase));
        affectedCodes.push(code);
      }

      const info = { type: 'finish', finishId: currentFinishId, label: preset.label, affectedCodes };
      emitChange(info);
      return info;
    },

    getArchitecturalFinish() {
      return currentFinishId;
    },

    listMaterials() {
      return Object.values(MATERIAL_CATALOG);
    },

    listFinishes() {
      return ARCHITECTURAL_FINISHES.slice();
    },

    onChange(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
  };
}
