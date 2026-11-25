<h1 align="center">Inkworks</h1>

<p align="center">Interactive 3D Engineering Intent &amp; Product DNA workbenches in a crisp CAD technical-drawing style, built by your coding agent.</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/license-MIT-24292f?style=flat" alt="MIT License" /></a>
  &nbsp;
  <img src="https://img.shields.io/badge/agents-Claude%20Code%20%C2%B7%20Codex%20%C2%B7%20Cursor%20%C2%B7%20Gemini%20%C2%B7%20OpenCode-24292f?style=flat" alt="Works with Claude Code, Codex, Cursor, Gemini CLI and OpenCode" />
  &nbsp;
  <a href="https://github.com/Moh4696/inkworks-skill/actions/workflows/check.yml"><img src="https://github.com/Moh4696/inkworks-skill/actions/workflows/check.yml/badge.svg" alt="Checks" /></a>
</p>

Inkworks turns real manufacturing assemblies, ERP standards, and CAD geometry (`.glb` / `.gltf` or parametric Three.js) into interactive 3D engineering workbenches designed for **EMJAC**, **Harmonic Environments**, **SDI**, and **Custom Kitchen Equipment** engineering teams.

Every assembly renders in a clean, offline, zero-build technical drawing viewport (defaulting to the Creo Parametric `creo` theme) with 3-step toon solids, 30-degree ink feature edges, constant-pixel silhouettes, native exploded views with dashed trace lines, interactive standards-badged callouts, a collapsible `Assembly -> Subassembly -> Part` model tree, a persistent granular subsystem timeline, and a **live bidirectional YAML/JSON Engineering Standards & Product DNA Inspector**.

## Five Engineering Pillars

1. **Hierarchical 3D Model Viewing & CAD Ingestion** — Offline GLTF 2.0 / binary `.glb` loader (`gltf-loader.js`) plus `kit/tools/ingest_cad.py`, pan/orbit camera with `Iso`, `Front`, `Side`, `Top`, `Reset` presets, smooth `flyToNode()` focus, and theme-aware EMJAC material mapping (`materials.js` covering 304 #4, ferritic magnetic 430 `8285`, 11ga angles, 20ga mill liners, urethane insulation, tempered IG glass, wood blocking, buyouts, and live architectural finishes).
2. **Interactive Standards-Badged Callouts** — Clickable two-column de-overlapped drafting callouts showing part names, compact gauge/ERP stock pills (e.g. `14ga 304 #4 · 8012-4` or `18ga 430 · MAG`), and semantic status colors (`Locked Standard`, `Engineer Input`, `Buyout`).
3. **Hierarchical Model Tree & Persistent Granular Timeline** — Collapsible `Assembly -> Subassembly -> Part` tree with per-node visibility, ghost/cutaway, and isolation controls paired with a multi-track bottom timeline that preserves explicit user visibility/explode overrides while scrubbing build stages.
4. **Native Exploded View (`0%–100%`)** — Global or per-subassembly explosion along authored vectors with staggered peel order, quick `0%` / `50%` / `100%` presets, and toggleable dashed assembly trace lines.
5. **Live Companion YAML / JSON Standards Inspector** — Syntax-highlighted YAML (default) with one-click JSON toggle, Copy button, status filter tabs (`All`, `Standards`, `Options`, `Buyouts`), live **Engineer-Provided Option** controls that update both the 3D scene and spec contract, and full bidirectional selection sync between 3D parts, tree nodes, callouts, and YAML/JSON paths.

## Flagship Reference Model: EMJAC Refrigerated Counter `087837-032`

Ships out of the box (`kit/js/assemblies/counter_087837.js`, `kit/assets/counter_087837_032.glb`, `kit/data/counter_087837.spec.json`) showcasing authentic harvested fabrication DNA (`WO 087837-032`, `PL=CN`, Item `A328`, 188 DXFs, 274 made rows, 17 bought rows):

- **14ga 304 #4 Top Law** (`8012-4`, 40/41 = 97.6% verified) and **>138" Field-Joint Shipping Split** under the 144" sheet ceiling.
- **Magnetic 430 Physics Law:** `DOOR FRONT` in 18ga 304 #4 (`8041-4`) paired with 100% ferritic 18ga 430 (`8285`) on `DOOR BACK`, `GASKET FRAME`, and `MULLION FRONT` so magnetic gaskets adhere reliably.
- **Modular Creo Section Subassemblies:** `1023` Refrigerated Base, `1018`/`1015`/`1009`/`1039` Doors & Mullions, `1041` Insulated Cold Pan, `1030` Fabricated Sink Bowl, `1043` Lighted Access Apron, `1020` Overshelf/Undershelf, and 7 WO-direct buyout subsystems (Carel `PJEZSNH100`, `RACO #232`, `SSOV3S130`, evap coil, hinges/gaskets, drain, LED).
- **Live Gauge-vs-Finish Decoupling:** Toggle architectural finish, field-joint shipping split, cutouts, and buyout scope live while locked structural and magnetic 430 standards remain protected.

## Install

```bash
npx skills add Moh4696/inkworks-skill
```

Uses the [`npx skills`](https://github.com/vercel-labs/skills) CLI (Node 22.20+) for Claude Code, Codex, Cursor, Gemini CLI, OpenCode, and more. Start a new agent session afterwards.

<details>
<summary>Claude Code plugin</summary>

```
/plugin marketplace add Moh4696/inkworks-skill
/plugin install inkworks-skill@inkworks-skill
```

</details>

<details>
<summary>Codex plugin</summary>

```bash
codex plugin marketplace add Moh4696/inkworks-skill
codex plugin add inkworks-skill@inkworks-skill
```

</details>

<details>
<summary>Without Node</summary>

```bash
curl -fsSL https://raw.githubusercontent.com/Moh4696/inkworks-skill/main/install.sh | bash
```

Clones the repo to `~/.inkworks-skill` and links the skill into every agent it finds. Run again to update; `--uninstall` removes it.

</details>

## Layouts & Themes

Every page supports two layouts via `?layout=`:

| Layout | What is on it | Best for |
| --- | --- | --- |
| `sheet` (default) | Top bar (WO badge, camera presets, display toggles, theme switcher), left rail (build stages, explode slider, hierarchical model tree), center 3D viewport with interactive standards callouts, bottom granular subsystem timeline, and right YAML/JSON Engineering Standards Inspector | Engineering review, Gate-1 signoff, shop-floor reference |
| `figure` | Rounded card with assembly badge, stage chip, 3D viewport, two-column standards callouts, and slim transport + explode strip | Embeds, design packets, stakeholder clips |

Every page supports `DESIGN.md` themes in the [impeccable](https://impeccable.style) / Stitch format via `?theme=`:

- **`creo`** (default): Creo Parametric blue-grey viewport (`#eef2f7`), dark slate ink, sketch cyan, PTC green active highlight, IBM Plex.
- **`drafting`**: White engineering paper, crisp ink, Instrument Serif and Geist.
- **`blueprint`**: White ink on cyanotype navy, Archivo and JetBrains Mono.
- **`patent`**: Sepia ink on ivory stock, IM Fell English and Courier Prime.

## Try it

```bash
git clone https://github.com/Moh4696/inkworks-skill && cd inkworks-skill/skills/inkworks
python3 kit/serve.py 9081
# http://localhost:9081/                              (default: counter_087837, creo theme, sheet layout)
# http://localhost:9081/?a=counter_087837&layout=figure
# http://localhost:9081/?a=starter&theme=drafting
```

Scaffold a new engineering assembly project:

```bash
python3 scripts/new_project.py ~/wine-cooler-087836 --name wine_cooler --from starter --theme creo --layout sheet
```

Ingest a STEP / STL / OBJ / GLB CAD file into a tagged Inkworks `.glb`:

```bash
python3 kit/tools/ingest_cad.py path/to/assembly.step -o kit/assets/my_assembly.glb
```

Run headless browser verification and design gates (`pip install -r requirements.txt` and `python3 -m playwright install chromium` or `webkit`):

```bash
python3 kit/tools/smoke.py --url "http://localhost:9081/" --browser chromium
bash kit/tools/design_check.sh "http://localhost:9081/"
node ../../tests/check.mjs
```

## License

[MIT License](LICENSE) · Copyright (c) 2026 exploraX. three.js is vendored under its own MIT licence (`skills/inkworks/kit/vendor/three/LICENSE`).
