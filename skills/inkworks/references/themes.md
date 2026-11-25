# Themes

A theme is a `DESIGN.md`: the impeccable / Google Stitch format, YAML frontmatter tokens followed by prose. The same file is the page's theme and impeccable's design context, so `$impeccable critique`, `polish`, `colorize` or `typeset` edit the file the page renders from.

- Built-ins live in `kit/themes/<id>.md`: `drafting` (default), `blueprint`, `patent`, `creo`.
- A project made with `new_project.py --theme <id>` gets a copy as `DESIGN.md` at its root and `<body data-theme="project">`. From then on the project's `DESIGN.md` is its theme.
- `?theme=<id>` previews any built-in over the project's own; `?theme=project` forces `DESIGN.md`.
- `drafting.md` is always loaded first as the base. A theme that leaves out a key gets the drafting value and the console says which keys were missing.

`kit/js/theme.js` reads the frontmatter (nested maps of scalars; quote every colour, since an unquoted `#` starts a YAML comment).

## Token keys

### colors

| Key | Used for |
| --- | --- |
| `paper`, `desk` | Sheet and card background; the desk around the figure card |
| `ink`, `ink-2`, `ink-3` | Text, rules, outlines; body text; hints. `ink` must be `#rrggbb`. `ink-3` must clear 4.5:1 on `paper` |
| `rule`, `rule-soft` | Borders; readout separators |
| `grid`, `grid-major` | The paper grid, 20px and 100px. Use a low-alpha `rgba()` |
| `accent` | Headline phrase, gauge needle and redline, timing marks |
| `hue-blue`, `hue-ochre`, `hue-red`, `hue-grey` | The four phase hue slots. Names match the `HUES` API, not the colour: in `creo`, `hue-ochre` is green |
| `mat-steel`, `mat-alloy`, `mat-dark`, `mat-valve`, `mat-ceramic`, `mat-rubber`, `mat-copper` | 3D toon materials |
| `mat-glass` | Translucent volumes. `rgba()` alpha is the opacity (default 0.26) |
| `ghost-fill` | Hidden-line housing fill. `rgba()` alpha is the opacity (default 0.035) |

Hues and the accent are fill colours. Wherever they become text the kit mixes them 62% with `ink`, so a light hue still reads; you do not need a separate text colour.

### typography

| Key | Becomes |
| --- | --- |
| `display` | `--serif`: headline, phase names, title block. Its family also loads in italic |
| `body` | `--sans`: body text and controls |
| `mono` | `--mono`: captions, readouts, charts, numbers |
| any other role | Adds its `fontWeight` to that family's download (e.g. `body-strong: 600`) |

Each family loads as one Google Fonts request built from the weights the roles use. Only list weights the family has: Google rejects a request for a missing weight. A family Google does not serve simply falls back to the next one in the stack.

## Making a theme with impeccable

1. **Pick or make the world.** Run `$impeccable` new-work for a fresh direction, or `impeccable world <id> --print` to start from a catalog world (needs an impeccable account). Either way you get a `DESIGN.md` with impeccable's own colour and type keys.
2. **Map it onto the keys above.** Copy the prose sections as they are. Translate the tokens: its background and surface colours to `paper` and `desk`, its text ramp to `ink` / `ink-2` / `ink-3`, its accent to `accent`, four distinguishable colours to the hue slots, and its display, body and mono families to the three type roles. Then choose the `mat-*` greys: lighter than the ink on light paper, darker than the ink on dark paper, so the ink outlines carry the shapes.
3. **Save it** as the project's `DESIGN.md` (or `kit/themes/<id>.md` for a built-in) and reload.
4. **Check it** with `tools/design_check.sh` (below) and look at stills of both layouts at both ends of the cycle.

The drawing rules in `look.md` hold in every theme: one meaning per hue, ink outlines, flat toon light, no shadows or glow, nothing that vanishes against the paper.

## Checking a theme

`kit/tools/design_check.sh "<page url>"` runs `impeccable detect` on the running page at 1280x800 and 390x844, once per theme (the project's `DESIGN.md`, or every built-in in the skill's kit), paused with `?play=0`. It exits 1 on any finding; advisories are not counted. Set `IMPECCABLE` to a local CLI path to skip `npx`.

`design_check.sh` scans paused pages. A paused page stops drawing once nothing has changed for 1.5 s, which lets the main thread go idle; the detector waits for that before it scans. Without it, `engine` (about 28 ms a frame in the detector's software WebGL) never went idle and timed out.

`kit/.impeccable/config.json` holds the ignores the built-in themes need, each with its reason:

- `overused-font: geist mono`: the drafting sheet's readout voice is its identity.
- `cream-palette` and `cramped-padding` on page scans: the patent theme's ivory is its brief, and the datasheet blocks are open sections under a top rule whose 90% paper fill only masks the grid.

The detector's `codex-grid-background` advisory also fires. It is advisory only, and the grid is the drawing surface the rule itself exempts. Add an ignore only for a finding the theme's brief deliberately asks for, with `impeccable ignores add-value <rule> <value> --reason "..."`. Fix everything else.
