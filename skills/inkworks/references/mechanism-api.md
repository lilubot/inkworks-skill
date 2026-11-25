# Mechanism API (Legacy Redirect)

Inkworks has transitioned from cyclic single-driver mechanisms (`kit/js/mechanisms/*.js`) to hierarchical **Engineering Intent Assemblies** (`kit/js/assemblies/*.js`).

Read the full, current API specification in [assembly-api.md](assembly-api.md).

## Migration summary

| Legacy mechanism concept | Current assembly concept |
| --- | --- |
| `kit/js/mechanisms/<name>.js` (`?m=`) | `kit/js/assemblies/<name>.js` (`?a=` or `?m=` alias) |
| `cycle`, `state.theta`, `driver`, `speeds`, `gauge`, `plot` | Removed; replaced by ordered `stages[]`, `explode` (`0..1`), nested `tree`, and live `options[]` |
| `phases[]` with one-word `nick` | `stages[]` with `id`, `name`, `short`, `color`, `summary`, `range`, `explode`, `focusNode`, `cameraPreset`, `specSection` |
| Procedural primitives only (`kit.part()`) | Direct GLTF/GLB CAD ingestion (`kit/tools/ingest_cad.py` + `kit.loadGLB()` + `kit.applyInkStyle()`) plus procedural helpers and EMJAC `kit.materials` registry |
| Static readouts (`<dl>`) | Live Companion YAML/JSON Engineering Standards & Product DNA Inspector (`kit/js/inspector.js`) with bidirectional 3D selection sync |
| Non-interactive callouts | Clickable, standards-badged callouts (`locked`, `engineer_input`, `buyout`) linked to tree nodes and `specPath` |
| Default theme `drafting` | Default theme `creo` (`kit/themes/creo.md`) |

All new projects created with `scripts/new_project.py` scaffold from `kit/js/assemblies/starter.js` or `kit/js/assemblies/counter_087837.js` with `DESIGN.md` initialized from `creo` by default.
