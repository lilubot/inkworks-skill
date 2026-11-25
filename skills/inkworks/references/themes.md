# Themes

A theme is a `DESIGN.md` in the impeccable / Google Stitch format: YAML frontmatter tokens followed by prose. The same file drives both the rendered page (`kit/js/theme.js`) and impeccable's design context, so `$impeccable critique`, `polish`, `colorize`, or `typeset` edit the file the page renders from directly.

- Built-in themes live in `kit/themes/<id>.md`: `creo` (default), `drafting`, `blueprint`, `patent`.
- A project scaffolded with `scripts/new_project.py --theme <id>` receives a copy as `DESIGN.md` at its root and `<body data-theme="project">`. From then on the project's `DESIGN.md` is its theme.
- `?theme=<id>` previews any built-in theme over the project's own; `?theme=project` forces `DESIGN.md`.
- `drafting.md` is always loaded first as the fallback base. Any theme that omits a token inherits the drafting value and logs missing keys to the console.

`kit/js/theme.js` parses the frontmatter (nested maps of scalars; always quote `#rrggbb` colors because an unquoted `#` begins a YAML comment) and exports:

- `theme`: resolved token object (`colors`, `typography`, `mat`).
- `themeId`: active theme ID (`'creo'`, `'drafting'`, `'blueprint'`, `'patent'`, or `'project'`).
- `THEMES`: `['creo', 'drafting', 'blueprint', 'patent']`.
- `isDarkTheme`: boolean luminance flag (true for `blueprint`, used by materials and inspector contrast rules).
- `inkA(alpha)`: returns `rgba(...)` string for the active `ink` color at `alpha`.
- `parseFrontmatter(text)`: standalone YAML frontmatter parser.

## Token keys

### colors

| Key | Used for |
| --- | --- |
| `paper`, `desk` | Workbench / sheet background; outer desk around the `figure` card |
| `ink`, `ink-2`, `ink-3` | Primary text, borders, CAD ink outlines; secondary body copy; muted labels and hints (`ink` must be `#rrggbb`; `ink-3` must clear 4.5:1 on `paper`) |
| `rule`, `rule-soft` | Structural datasheet rules and hairline separators |
| `grid`, `grid-major` | Viewport engineering grid (20px minor, 100px major) using low-alpha `rgba()` |
| `accent` | Active selection highlight, primary emphasis, active stage indicator |
| `hue-blue`, `hue-ochre`, `hue-red`, `hue-grey` | Four semantic status/stage slots mapped into `HUES` (`hue-blue` = locked standard / sketch cyan in Creo, `hue-ochre` = active build / PTC green in Creo, `hue-red` = engineer input / cut / warning, `hue-grey` = buyout / reference) |
| `mat-steel`, `mat-alloy`, `mat-dark`, `mat-valve`, `mat-ceramic`, `mat-rubber`, `mat-copper` | Base 3D toon material anchors consumed by `kit.js` and `materials.js` |
| `mat-glass` | Translucent tempered glass / viewing glazing (`rgba()` alpha sets opacity, default `0.26`) |
| `ghost-fill` | Cutaway / hidden-line housing fill (`rgba()` alpha sets opacity, default `0.035`) |

Hues and the accent are fill colors. Wherever they render as foreground text or badges, the kit mixes them with `ink` so bright hues remain legible against light viewports.

### typography

| Key | Becomes |
| --- | --- |
| `display` | `--serif`: workbench headline, stage title, title block |
| `body` | `--sans`: UI controls, model tree labels, stage narrative |
| `mono` | `--mono`: WO/item badges, ERP stock codes, YAML/JSON inspector, dimensions, tabular numbers |
| any other role | Appends its `fontWeight` to that family's Google Fonts request (e.g. `body-strong: 600`) |

Each font family loads in one Google Fonts stylesheet built from the declared weights. Only list weights the family actually publishes; unavailable families fall back cleanly to the next entry in the stack.

## Theme-aware EMJAC materials

`kit/js/materials.js` (`createMaterialRegistry({ ramp, theme, INK })`) blends ERP material definitions (304 #4 stainless, ferritic 430 `8285`, 11ga structural angles, 20ga mill liners, urethane insulation, tempered IG glass, wood blocking, buyout hardware, architectural finishes) against the active theme so solids never clip into unreadable black blobs on light viewports (`creo`, `drafting`, `patent`) or vanish on dark viewports (`blueprint`).

## Making a theme with impeccable

1. **Pick or create a direction.** Run `$impeccable` new-work or `impeccable world <id> --print` to produce a `DESIGN.md` with color and typography tokens.
2. **Map tokens to Inkworks keys.** Keep the prose sections, then map background/surface to `paper`/`desk`, text ramp to `ink`/`ink-2`/`ink-3`, primary emphasis to `accent`, four distinguishable status colors to `hue-blue`/`hue-ochre`/`hue-red`/`hue-grey`, and display/body/mono fonts to `typography`. Calibrate `mat-*` so solids contrast cleanly with `ink` outlines.
3. **Save and reload.** Save as `DESIGN.md` in the project root (or `kit/themes/<id>.md` for a built-in) and reload with `?theme=project` or `?theme=<id>`.
4. **Verify.** Run `kit/tools/design_check.sh "<url>"` and inspect screenshots from `kit/tools/shoot.py` in both `sheet` and `figure` layouts, assembled and exploded.

## Checking a theme

`kit/tools/design_check.sh "<page url>"` runs `impeccable detect` at `1280x800` and `390x844` across every built-in theme (or `project` when `DESIGN.md` sits next to `index.html`), paused via `?play=0`. It exits 1 on any finding; advisories are not counted. Set `IMPECCABLE` to a local CLI binary path to skip `npx`.

Paused pages stop redrawing once idle for `SETTLE = 1.5s`, letting the browser main thread settle cleanly for automated design scans.

`kit/.impeccable/config.json` stores justified built-in ignores:

- `overused-font: geist mono`: preserved for the `drafting` theme's technical readout voice.
- `cramped-padding`: open datasheet sections under a top ink rule mask the grid without card chrome.
- `cream-palette`: intentional ivory paper stock for the `patent` theme.

Fix all other findings before shipping. Add an ignore only when a theme's brief explicitly demands it.
