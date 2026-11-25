---
name: inkworks
description: Builds interactive 3D "how it works" explainer pages for any machine or mechanism (engines, pumps, locks, gearboxes, turbines, printers, hearts) in the Inkworks look, a white engineering drawing with ink-outlined three.js parts, numbered balloon labels and a cycle you can slow down, step, scrub and orbit. Two layouts, a full drafting sheet with instruments and a cycle chart, or a clean figure card with the model alone. You write one mechanism file of geometry, kinematics and words, the kit does the rest. Also records a frame-exact 60 fps walkthrough clip with a visible cursor and can add a code-synthesised sound track. Use for "3D explainer of how X works", "interactive simulation of an engine", "animated cutaway", "inkworks", "drafting sheet", "blueprint style 3D page", "explain this mechanism in 3D", or a clip of one for X or YouTube.
---

# Inkworks

A page made this way is an engineering drawing that moves. One machine, drawn in light grey parts with ink outlines on white grid paper, labelled with numbered drafting balloons, running through its cycle slowly enough to follow. People can pause it, step one phase at a time, scrub a chart, follow one cylinder, open the throttle and orbit the camera.

It started as a four-cylinder engine and was then split into a reusable kit and one small file per machine. The second machine, a bicycle floor pump, proved the split works. Both ship here as worked examples.

## What you get

| Path | What it is |
| --- | --- |
| `kit/` | A complete page. Copy it, add a mechanism, serve it. No build step, three.js is vendored |
| `kit/js/kit.js` | Rendering kit: toon parts with ink edges and outlines, hidden-line ghosts, flow particles, flashes, gears, springs |
| `kit/js/sheet.js` | Everything around the machine: DOM, state, loop, both layouts, controls, gauge, charts, labels, tags |
| `kit/js/mechanisms/starter.js` | The smallest complete mechanism (a slider-crank), every field commented. Start here |
| `kit/js/mechanisms/engine.js` | Inline-4 four-stroke engine: 4 instances with phase offsets, valvetrain, spark, gas, heat |
| `kit/js/mechanisms/pump.js` | Bike floor pump: 1 instance, phase bounds that move with state, mechanism state, an action button |
| `kit/tools/smoke.py` | Clicks every control in both layouts at three sizes and fails on any page error |
| `kit/tools/shoot.py` | Headless stills at any size |
| `kit/tools/record.py` | Frame-exact 60 fps clip with a drawn cursor and real mouse events, from a plan in `kit/tools/clips/` |
| `kit/tools/engine_sound.py` | Example sound track synthesised from the clip's per-frame state |
| `scripts/new_project.py` | Copies the kit into a new folder with a renamed mechanism and a chosen layout |
| `references/mechanism-api.md` | Every field a mechanism file can set, and what the page does with it |
| `references/look.md` | The visual spec for both layouts. Keep it |
| `references/clips.md` | Recording the walkthrough and adding sound |
| `references/lessons.md` | Things that broke while building this, and the fixes |

Needs a browser and Python 3 for the static server. The tools need `pip install playwright && playwright install webkit`, ffmpeg for clips, and numpy plus scipy for sound.

## Workflow

1. **Pin the machine down.** Before any code, settle: what it is, who it is for, what single value drives it (crank angle, handle stroke, gear turn, heartbeat), how many repeated units it has (cylinders, pistons, chambers), what the phases of one cycle are called, and what the reader controls (throttle, pumping speed, load). If the user has a reference to answer, ask what it looks like so the page stays visibly different from it.
2. **Start the project.** `python3 scripts/new_project.py <dest> --name <machine> --from starter` (or `--from engine` / `--from pump` when the new machine is close to one). Add `--layout figure` for the clean card. Serve it with `python3 <dest>/serve.py <port>`.
3. **Write the kinematics first.** Closed-form functions of the driver angle only: positions, valve lifts, pressures, volumes. If you cannot write a part's position as a function of the angle, the page cannot scrub or step it. State that accumulates (a tyre filling, heat) goes in `state.mech` and only advances when the angle moves forward.
4. **Build the parts.** Use `kit.part()` for solids, `kit.ghost()` for housings and casings, `M.glass` for anything see-through that holds the action (manifolds, barrels, hoses), `kit.stream()` for flowing fluid. Keep to the material palette in `references/look.md`.
5. **Words.** Phase names with a one-word nickname, two or three plain sentences per phase that say what moves and why, labels for 8 to 14 parts, 3 to 5 live readouts. Write for a curious 14 year old. No em dashes.
6. **Frame it.** Set `view.target`, `view.dir` and `view.box` (the bounding box of everything that moves, at full travel), then tune `radius`, `radiusFigure` and `radiusCompact` until nothing leaves the frame at either end of the cycle.
7. **Check.** Run `kit/tools/smoke.py` (all checks must pass), then look at stills from `kit/tools/shoot.py` at 1440x900, 1280x720 and 390x844 in both layouts. Look at both ends of the stroke, not just the start.
8. **Clip (optional).** Copy a plan from `kit/tools/clips/`, adapt it, check with `--frames-every 30`, then render. Clips are silent unless the user asks for sound; see `references/clips.md`.

## The rules

1. **One driver variable.** Everything on screen comes from `state.theta`. Play, step, scrub, the recorder and the sound track only ever move theta. No wall-clock animation inside `pose()`, apart from smoothing that uses `dt`.
2. **Phases are honest.** Phase boundaries come from the physics. If they move (the pump's delivery starts later as the tyre fills), compute them in `bounds(state)`; never fake a fixed split.
3. **Show the inside.** Housings are hidden-line ghosts or translucent glass, never opaque shells. The interesting part must be visible from the default camera.
4. **Colour means phase.** The four hues mean the same thing everywhere on the page: 3D gas, chart rows, list dots, tags, readouts. Heat is shown by lerping a material's colour to red, not by emissive glow, which washes out on white.
5. **Labels never pile up.** Callouts are laid out every frame in two columns. Point each one at a part that is visible from the default view, and give the compact list for phones.
6. **Drawing, not render.** Light greys, ink outlines, flat toon light, no shadows, no environment maps, no post effects.
7. **Real behaviour.** Use the real mechanism: real firing order, real valve timing, real check valve logic. Simplify numbers, never the logic, and say so in the text when you round.

## Two layouts

- **sheet** (default for most): grid paper, ink border with zone letters, title, phase panel with readouts (A), instruments with gauge, input slider, speed buttons, x-y plot, transport and title block (B), cycle chart you can scrub (C). Best for a page people explore.
- **figure**: the model alone on a rounded card, labels both sides, instance tags with dashed leaders above the units, a status line ("Shown at 1/60 speed · running"), a phase chip, and a slim control strip. Best for embeds, posts and clips.

Pick with `meta.layout` in the mechanism, `data-layout` on `<body>`, or `?layout=` in the URL. Both are always available, so show the user both.
