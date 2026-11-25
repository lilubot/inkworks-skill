---
name: inkworks
description: "Builds interactive 3D Engineering Intent and Product DNA workbenches for fabricated assemblies (refrigerated counters, wine coolers, custom kitchen equipment, architectural metalwork, and CAD subassemblies) in the Inkworks technical-drawing style. Features direct GLTF/GLB CAD ingestion, EMJAC ERP material mapping, a collapsible Assembly -> Subassembly -> Part model tree, native 0-100% exploded views with dashed trace lines, interactive standards-badged callouts, a persistent granular subsystem timeline, and a live bidirectional YAML/JSON Engineering Standards and Engineer-Inputs inspector. Default Creo Parametric theme in DESIGN.md impeccable format, with sheet workbench and clean figure card layouts, headless Playwright smoke tests, and 60 fps walkthrough recording."
---

# Inkworks

Inkworks turns real manufacturing assemblies, CAD exports (`.glb` / `.gltf` / STEP via ingestion), and governed ERP standards into interactive 3D Engineering Intent workbenches for EMJAC, Harmonic Environments, SDI, and Custom Kitchen Equipment teams.

Every assembly renders in a zero-build, offline three.js technical-drawing viewport (defaulting to the `creo` theme): 3-step toon solids, 30-degree ink feature edges, constant-pixel silhouette outlines, native exploded views with dashed trace lines, clickable standards-badged callouts, a collapsible `Assembly -> Subassembly -> Part` model tree, a persistent granular subsystem timeline, and a live bidirectional YAML/JSON Engineering Standards & Product DNA inspector.

## What you get

| Path | What it is |
| --- | --- |
| `kit/` | Complete static workbench. Copy it, add an assembly and `.glb`/spec, serve it. No build step; three.js r169 is vendored |
| `kit/js/kit.js` | 3D drawing and CAD engine: 3-step toon solids, 30-degree edges, silhouette outlines, pan/orbit camera with `flyToNode()` and named presets, raycasting `pick()`, `applyInkStyle()`, and hierarchical `createAssemblyTree()` with native exploded view and granular timeline evaluation |
| `kit/js/gltf-loader.js` | Offline zero-dependency GLTF 2.0 / binary `.glb` loader built on vendored three.js r169; preserves nested hierarchies and merges `node.extras` / `mesh.extras` / `material.extras` into `userData` |
| `kit/js/materials.js` | Theme-aware EMJAC Engineering Material Registry mapping ERP stock codes (`8012-4`, `8041-4`, `8285` ferritic 430, `8027-4`, `8300`, `ss_304_11ga_angle`, `ss_304_20ga_mill`, `9-78-1..6`, `non_metal_ure`, `non_metal_tempered`, `wood_blocking`, buyouts) and live Gauge-vs-Finish architectural finish switching |
| `kit/js/sheet.js` | Workbench shell: 5-pillar `sheet` layout, embeddable `figure` card, interactive standards-badged 2-column callouts, model tree controls, explode slider, granular bottom timeline, idle-render throttling (`SETTLE = 1.5s`), and `window.__sheet` runtime API |
| `kit/js/inspector.js` | Live syntax-highlighted YAML (default) / JSON Engineering Standards & Product DNA inspector, status filters (`All`, `Standards`, `Options`, `Buyouts`), interactive Engineer-Provided Options bar, Copy button, and bidirectional 3D selection sync |
| `kit/js/theme.js` | Loads a Stitch / impeccable `DESIGN.md` theme into CSS tokens, Google Fonts, semantic status hues, and 3D materials; defaults to `creo` with `drafting.md` fallback |
| `kit/themes/*.md` | Built-in `DESIGN.md` themes: `creo` (default), `drafting`, `blueprint`, `patent` |
| `kit/js/assemblies/counter_087837.js` | Flagship EMJAC Refrigerated Counter (`WO 087837-032`, `PL=CN`, Item `A328`) loading `kit/assets/counter_087837_032.glb` and `kit/data/counter_087837.spec.json` |
| `kit/js/assemblies/starter.js` | Minimal commented Engineering Intent assembly template showing GLB ingestion, nested subassembly tree, explode vectors, callouts, and companion spec binding |
| `kit/tools/ingest_cad.py` | Converts STEP / STL / OBJ / GLB CAD assemblies into normalized Inkworks `.glb` files with embedded hierarchical node `extras` metadata |
| `scripts/new_project.py` | Scaffolds a new project folder from `starter` or `counter_087837` with `--theme creo` (copied to project `DESIGN.md`) |
| `kit/tools/smoke.py` | Playwright end-to-end verification across `sheet` and `figure` layouts at desktop and phone sizes |
| `kit/tools/shoot.py` | Headless screenshots at any viewport size with optional `--js` setup |
| `kit/tools/design_check.sh` | Runs `impeccable detect` across themes at desktop and phone widths (`?play=0`) |
| `kit/tools/record.py` | Frame-exact 60 fps walkthrough clip recorder using a plan in `kit/tools/clips/` |
| `references/assembly-api.md` | Complete API reference for assemblies, `kit.js`, `gltf-loader.js`, `materials.js`, `AssemblyTree`, exploded view, callouts, DOM IDs, and `window.__sheet` |
| `references/mechanism-api.md` | Legacy redirect and migration table from cyclic mechanisms to Engineering Intent assemblies |
| `references/look.md` | Visual specification for the `creo` workbench (`sheet`) and `figure` card |
| `references/themes.md` | `DESIGN.md` token keys, theme-aware EMJAC materials, and the impeccable workflow |
| `references/clips.md` | Recording silent 60 fps engineering walkthrough clips |
| `references/lessons.md` | Engineering pitfalls and fixes baked into the kit |

Needs a browser and Python 3 for `kit/serve.py`. Verification tools need `pip install playwright && python3 -m playwright install chromium` (or `webkit`), plus `ffmpeg` for 60 fps MP4 clips.

## Workflow

1. **Pin down the engineering DNA.** Before writing code, collect the real product data: division (`EMJAC`, `Harmonic`, `SDI`, `CKE`), Work Order / Item ID, Creo section codes, hierarchical subassembly breakdown (`Assembly -> Subassembly -> Part`), locked ERP stock codes and sheet gauges (with SO support ratios), bend table parameters, buyout items, and Gate-1 Engineer-Provided Options (dimensions, field-joint shipping splits, architectural finishes, cutouts, buyout scope). Never invent manufacturing metrics.
2. **Scaffold the project.** Run `python3 scripts/new_project.py <dest> --name <assembly> --from starter --theme creo` (or `--from counter_087837` when extending a multi-section counter). Add `--layout figure` for an embeddable card. Serve with `python3 <dest>/serve.py 9081`.
3. **Ingest CAD geometry to `.glb`.** Convert STEP, STL, OBJ, or existing GLTF/GLB CAD exports using `python3 kit/tools/ingest_cad.py <input> -o <dest>/assets/<assembly>.glb` so each node carries `id`, `kind`, `materialCode`, `standardStatus`, `explodeVec`, `explodeOrder`, `stage`, and `specPath` in `node.extras`. Load it with `kit.loadGLB()` and style it with `kit.applyInkStyle(root)` so every mesh inherits 3-step toon shading, 30-degree edges, and silhouettes without altering `userData`.
4. **Map EMJAC materials and Gauge-vs-Finish rules.** Assign canonical ERP codes from `kit/js/materials.js` (`8012-4` 14ga 304 #4, `8041-4` 18ga 304 #4, `8285` ferritic magnetic 18ga 430, `8027-4` 16ga, `8300` legs, `ss_304_11ga_angle`, `ss_304_20ga_mill`, `non_metal_ure`, `non_metal_tempered`, `wood_blocking`, `buyout_hardware`). Wire live architectural finish options to `kit.materials.setArchitecturalFinish()` so exterior panels update while physics-locked 430 magnetic surfaces, structural angles, insulation, and buyouts stay locked.
5. **Bind the hierarchical tree, stages, and exploded view.** Populate `kit.createAssemblyTree({ root, stages })` via `tree.fromObject3D(root)`. Author ordered build stages (`stages[]`) with `range`, `explode`, `focusNode`, `cameraPreset`, and `specSection`. Verify that `tree.evaluateTimeline(t)` preserves explicit user visibility, ghost, isolate, and explode overrides while scrubbing.
6. **Author the companion YAML/JSON spec and interactive callouts.** Put the complete product DNA in `data/<assembly>.spec.json` separating `locked_standards`, `engineer_inputs`, and `buyouts`. Link every callout (`status: 'locked' | 'engineer_input' | 'buyout'`, compact ERP/gauge pill) and every interactive option (`options[]`) via matching `nodeId` and `specPath` so clicking in 3D, the model tree, callouts, or the YAML/JSON inspector stays bidirectionally synced.
7. **Frame assembled and exploded states.** Set `view.target`, `view.dir`, `view.presets` (`iso`, `front`, `side`, `top`), and `view.box` large enough to bound the assembly at `100%` explode so two-column callouts stay clear of moving subassemblies at desktop and phone widths.
8. **Verify visually and programmatically.** Run `python3 kit/tools/smoke.py --url "http://localhost:9081/" --browser chromium`, `bash kit/tools/design_check.sh "http://localhost:9081/"`, and `node tests/check.mjs`. Capture and inspect stills via `kit/tools/shoot.py` at `1440x900` and `390x844` in `creo` and `drafting` themes across assembled (`0%`), exploded (`100%`), isolated-subsystem, and `figure` states.
9. **Record a walkthrough clip (optional).** Adapt a plan in `kit/tools/clips/`, verify frames with `--frames-every 30`, then render the 60 fps MP4 (`references/clips.md`).

## Core rules

1. **Zero cyclic-machine filler.** Never add dial gauges, P-V or x-y loop plots, RPM/throttle sliders, slow-motion speed divisors, or colloquial nicknames. Every control serves CAD inspection, build progression, explosion, or Gate-1 configuration.
2. **Real fabrication data only.** Cite actual ERP material codes, gauges, bend radii, Creo section IDs, buyout part numbers, and empirical SO support counts. Separate locked manufacturing standards from engineer-provided inputs explicitly.
3. **Preserve hierarchy and persistent state.** Keep `Assembly -> Subassembly -> Part` nesting intact from CAD import through `AssemblyTree`, timeline rows, and inspector selection. Never overwrite a user's manual hide, ghost, isolate, or explode override during stage scrubbing.
4. **Crisp CAD drawing style.** Flat 3-step toon shading, 30-degree feature edges, constant-pixel ink silhouettes, no shadows, no environment maps, and no glow/bloom. Keep materials calibrated above the dark luminance floor so edges remain legible.
5. **Interactive, non-overlapping callouts.** Lay callouts out every frame in two de-overlapped columns outside the assembly bounds. Every callout is clickable, standards-badged, and synced to a tree node and `specPath`; mark essential callouts `compact: true` for phones.
6. **Theme through `DESIGN.md`.** Default to `creo`; keep `drafting`, `blueprint`, and `patent` functional via `?theme=`. Take all colors from theme tokens and `kit.materials`, never hard-coded hex strings in layout code.
7. **Repo hygiene.** Never use em dashes in `SKILL.md`. Keep `SKILL.md` frontmatter strict YAML and ensure every referenced path exists so `tests/check.mjs` passes cleanly.

## Two layouts

- **sheet** (default): Full 5-pillar CAD engineering workbench with top bar (WO badge, camera presets, display toggles, theme switcher), left rail (build stages, explode 0-100% control, collapsible model tree), center 3D viewport with interactive standards-badged callouts, bottom scrubbable nested subsystem timeline, and right live YAML/JSON Engineering Standards Inspector with interactive Engineer Options.
- **figure**: Clean embeddable presentation card with assembly badge, stage chip, 3D viewport, two-column standards-badged callouts, and slim transport plus explode strip.

Select with `meta.layout`, `<body data-layout>`, or `?layout=sheet|figure`.

## Themes

A theme is a `DESIGN.md` in impeccable / Stitch format (`references/themes.md`), loaded by `kit/js/theme.js` and editable directly with `$impeccable critique`, `polish`, or `colorize`:

- `creo` (default): Creo Parametric blue-grey viewport (`#eef2f7`), dark slate ink, sketch cyan (`hue-blue`), PTC green active accent (`hue-ochre`), IBM Plex.
- `drafting`: White engineering paper, dark ink, Instrument Serif and Geist.
- `blueprint`: White ink on cyanotype navy, Archivo and JetBrains Mono.
- `patent`: Sepia ink on ivory stock, IM Fell English and Courier Prime.

A scaffolded project uses its root `DESIGN.md` (`<body data-theme="project">`); `?theme=<id>` previews any built-in theme.
