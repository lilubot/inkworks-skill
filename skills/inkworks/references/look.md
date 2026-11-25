# The look

An Inkworks page is a CAD engineering workbench styled like a crisp technical drawing. The default theme is `creo` (`kit/themes/creo.md`), modelled after a Creo Parametric graphics window; `drafting`, `blueprint`, and `patent` share the exact same token contract (`references/themes.md`). Across every theme: flat toon shading, dark ink feature edges, constant-pixel silhouette outlines, no drop shadows or bloom, and zero cyclic-machine filler.

## Default palette (`creo`)

| Token | Value | Use |
| --- | --- | --- |
| `--paper` / `--desk` | `#eef2f7` / `#d7dfe9` | Viewport and workbench surface / outer desk in `figure` layout |
| `--ink` | `#1d2733` | Primary typography, datasheet rules, 3D ink edges and silhouettes |
| `--ink-2` / `--ink-3` | `#4b5869` / `#626e7c` | Secondary descriptions / muted metadata (`ink-3` clears 4.5:1 on `--paper`) |
| `--rule` / `--rule-soft` | `#c5cfdb` / `#dde4ed` | Panel borders and hairline separators |
| Grid | `rgba(40, 90, 150, .045)` every 20px, `.085` every 100px | Subtle orthographic drawing grid |

## Semantic status hues

The four hue slots (`HUES` in `kit.js`) maintain one consistent meaning across the 3D scene, callout badges, assembly tree status dots, timeline tracks, and YAML/JSON inspector:

- `hue-blue` (`#0f9bd7` in `creo`): **Locked Standard** (verified EMJAC invariant gauge, ERP code, bend deduction, or physics law).
- `hue-ochre` (`#4caf3e` PTC green in `creo`, also `--accent`): **Active Build / Selected** (active stage highlight, selected 3D node, active tree row).
- `hue-red` (`#d8443a` in `creo`): **Engineer Input** (Gate-1 configurable option, cutout, field-joint split, or architectural finish override).
- `hue-grey` (`#7c8898` in `creo`): **Buyout / Reference** (WO-direct vendor hardware, controls, refrigeration components, or non-active context).

## Typography

- **IBM Plex Sans Condensed** (`--serif` / display role in `creo`): assembly headline, active stage title, title block.
- **IBM Plex Sans** (`--sans` / body role): model tree rows, stage summaries, controls, option selectors.
- **IBM Plex Mono** (`--mono` / mono role): WO and item badges, ERP stock codes, gauge pills, explode percentage, YAML/JSON spec inspector, and all numeric dimensions (`font-variant-numeric: tabular-nums`).

## 3D drawing rules

- `MeshToonMaterial` with a 3-step nearest-filtered gradient ramp, hemisphere light plus one directional key light. No shadows, no environment maps, no post-processing bloom.
- Every solid part (procedural or GLB-imported via `kit.applyInkStyle()`) carries crisp 30-degree `EdgesGeometry` feature lines and a constant-pixel inverted-hull silhouette outline (`__inkHelper` children that leave `userData` and hierarchy untouched).
- Materials come from `kit/js/materials.js` keyed by EMJAC/Harmonic/SDI ERP stock codes (`8012-4` 14ga 304 #4, `8041-4` 18ga 304 #4, `8285` ferritic magnetic 18ga 430, `8027-4` 16ga, `8300` leg tubing, `ss_304_11ga_angle`, `ss_304_20ga_mill`, `non_metal_ure` urethane insulation, `non_metal_tempered` IG glass, `wood_blocking`, `buyout_hardware`, `9-78-1..6` powdercoat, and architectural finishes). Luminance stays calibrated so dark parts never collapse into black holes on light viewports.
- Cutaway housings use `ghost()` (faint translucent fill plus dashed ink edges) or per-node tree ghosting.
- Exploded assemblies optionally draw dashed assembly trace lines from each node's assembled centroid to its exploded centroid.

## Two layouts

### `sheet` (default: full engineering workbench)

- **Top bar:** Division / Product / WO badge (`#assemblyBadge`, e.g. `EMJAC · WO 087837-032`), camera preset buttons (`Iso`, `Front`, `Side`, `Top`, `Reset`), display layer toggles (`Ghost Shell`, `Traces`, `Labels`, `Orbit`), and theme switcher (`Creo`, `Drafting`, `Blueprint`, `Patent`).
- **Left rail:**
  - **Build Stage Narrative & Transport:** Stage number, stage name, concise engineering summary, clickable stage list, `Prev` / `Play-Pause` / `Next` controls.
  - **Explode Control:** `0%` to `100%` slider (`#explodeRange`), quick preset buttons (`0%`, `50%`, `100%`), and Global vs. Selected-Subsystem scope toggle (`#explodeScopeBtn`).
  - **Hierarchical Model Tree (`#assemblyTree`):** Collapsible `Assembly -> Subassembly -> Part` outline with status dot and per-node visibility, ghost/cutaway, and isolate controls.
- **Center 3D stage (`#stage`):** Maximum unobstructed viewport with interactive, clickable, standards-badged drafting callouts laid out in two de-overlapped columns with SVG elbow leaders. Each callout displays balloon number, part name, compact spec pill (e.g. `14ga 304 #4 · 8012-4` or `18ga 430 · MAG`), and status color (`locked`, `engineer_input`, `buyout`).
- **Bottom bar (`#timeline`):** Scrubbable multi-track nested subsystem timeline showing Assembly / Subassembly / Part build and explode tracks across stages with a live playhead.
- **Right companion panel (Engineering Standards & Product DNA Inspector):**
  - Syntax-highlighted **YAML (default) <-> JSON** toggle, Copy button, and status filter tabs (`All`, `Standards`, `Options`, `Buyouts`).
  - **Engineer-Provided Options bar (`#optionsBar`):** Live dropdowns, toggles, and segmented controls (field-joint split, architectural finish, cutout toggles, buyout scope) that mutate both the 3D scene and the companion spec in real time.
  - **Bidirectional selection sync:** Clicking any spec line highlights the matching 3D node(s), tree row, and callout; clicking in 3D, the tree, or a callout scrolls and highlights the matching spec block.

Open datasheet aesthetic throughout: crisp 1px/2px ink rules, tabular monospace readouts, zero generic SaaS card shadows or gradients. Below `960px` width the stage pins cleanly above stacked panels.

### `figure` (embeddable presentation card)

- Rounded drawing card (`18px` radius) inset on `--desk`, with the engineering grid inside the card only.
- Top bar: compact assembly badge + active stage chip on the left; headline and display toggles on the right.
- Center 3D model with 2-column de-overlapped standards-badged callouts.
- Slim bottom strip: stage transport (`Prev` / `Play-Pause` / `Next`), explode slider (`0-100%`), camera reset, and `Drag to orbit · Right-drag to pan`.

## Engineering copy rules

- Write for manufacturing, sheet-metal, and CAD engineers.
- Name real ERP stock codes (`8012-4`, `8285`, `8041-4`, `8300`), sheet gauges, K-factors (`K=0.5`), bend radii (`0.030"`, `0.080"`), Creo section codes (`1009`, `1018`, `1023`, `1030`, `1041`, `1043`), and empirical SO support ratios (e.g. `40/41 SOs · 97.6%`).
- Distinguish clearly between **Locked Standards** (non-negotiable manufacturing or physics laws) and **Engineer Inputs** (Gate-1 order parameters).
- Keep stage summaries to two or three direct, factual sentences. No marketing fluff, no cyclic-machine analogies, and no em dashes in `SKILL.md`.
