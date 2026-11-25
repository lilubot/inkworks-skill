# Changelog

## Unreleased

- Themes are `DESIGN.md` files in the impeccable / Stitch format (`kit/themes/*.md`), read at load by `kit/js/theme.js`. Four built-ins: `drafting` (default), `blueprint`, `patent`, `creo`. A project's own `DESIGN.md` is its theme (`new_project.py --theme` copies one in), so impeccable commands edit the page's look directly. Pick with `?theme=`. The gauge, plot, chart, leaders and 3D materials no longer hard-code colours or fonts; fonts load per family from the theme's typography.
- `kit/tools/design_check.sh` runs impeccable's detector per theme at desktop and phone width; `kit/.impeccable/config.json` keeps the justified ignores. See `references/themes.md`.
- Accessibility: hint text (`ink-3`) darkened to clear 4.5:1; phase hues and the accent are mixed toward the ink wherever they are text, including the cylinder balloons and filled instance tags; labels, block heads, title block and balloon numbers are at least 11px. The drafting look shifts slightly as a result.
- `?play=0` starts the page paused.
- Callouts take an optional `show(state)` to hide a label while its part does not exist yet.
- Phase list wraps to two rows past five phases; the chart key merges phases that share a colour and key.
- The pump's gauge face and needle follow the theme.
- New example mechanism `regen`: a parametric feature tree rebuilding a flanged hub.

## 1.1.0 (2026-11-25)

- Renamed from Drafting Sheet to Inkworks. The skill is now `inkworks`, the repo `Moh4696/inkworks-skill` (the old URL redirects) and the no-Node installer clones to `~/.inkworks-skill`. If you installed 1.0.0, remove the old `drafting-sheet` skill and install again.

## 1.0.0 (2026-11-25)

First release.

- `kit/`: the engine page split into a rendering kit (`kit.js`), the page around a mechanism (`sheet.js`) and one file per machine.
- Two layouts: `sheet` (drawing border, phase panel, instruments, cycle chart) and `figure` (the model alone on a card with instance tags, a status line and a control strip).
- Three mechanisms: `starter` (slider-crank, every field commented), `engine` (inline-4 four-stroke), `pump` (bike floor pump with a check valve whose opening moves as the tyre fills).
- Tools: `smoke.py` (drives every control in both layouts at three sizes), `shoot.py`, `record.py` (frame-exact 60 fps clips from plan files), `engine_sound.py`.
- `scripts/new_project.py` scaffolds a project from any of the three.
