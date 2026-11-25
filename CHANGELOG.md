# Changelog

## 1.1.0 (2026-11-25)

- Renamed from Drafting Sheet to Inkworks. The skill is now `inkworks`, the repo `Moh4696/inkworks-skill` (the old URL redirects) and the no-Node installer clones to `~/.inkworks-skill`. If you installed 1.0.0, remove the old `drafting-sheet` skill and install again.

## 1.0.0 (2026-11-25)

First release.

- `kit/`: the engine page split into a rendering kit (`kit.js`), the page around a mechanism (`sheet.js`) and one file per machine.
- Two layouts: `sheet` (drawing border, phase panel, instruments, cycle chart) and `figure` (the model alone on a card with instance tags, a status line and a control strip).
- Three mechanisms: `starter` (slider-crank, every field commented), `engine` (inline-4 four-stroke), `pump` (bike floor pump with a check valve whose opening moves as the tyre fills).
- Tools: `smoke.py` (drives every control in both layouts at three sizes), `shoot.py`, `record.py` (frame-exact 60 fps clips from plan files), `engine_sound.py`.
- `scripts/new_project.py` scaffolds a project from any of the three.
