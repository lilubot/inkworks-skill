# How this was built

- **Built with:** Claude Opus 5.5 in Claude Code, by exploraX, 2026-11-24 to 2026-11-25.
- **Inputs:** an interactive 3D page about how a car engine works, built and restyled in the same session, and its 43 second walkthrough clip with a code-synthesised engine sound.
- **Process.**
  - The engine page was first built in a navy blueprint style, then restyled to white drafting paper at the user's request.
  - The user asked for it to be saved as a reusable template named "Drafting Sheet".
  - The next day the user asked for the skill to also make clean figure-only versions of the page, and to open-source it. They chose a standalone repo, both layouts, and a second machine to prove the split.
  - The page was split into a rendering kit, the page shell and one file per machine. A bike floor pump and a commented starter were added, along with the scaffolding script, the smoke test and a recorder generalised to plan files.
- **Tested:** `smoke.py` passed for all three mechanisms in both layouts at 1440x900, 1280x720 and 390x844. Both 60 fps demo clips were recorded with no page errors.

## Prompt to recreate this repo

> Build an open-source agent skill, `drafting-sheet`, for interactive 3D "how it works" pages that look like an engineering drawing. Ship it as a standalone repo, installable with `npx skills add`, plus Claude Code, Codex, Cursor and Gemini manifests and a no-Node shell installer.
>
> **The look.**
> - White grid paper (`#f8f9fb`, faint blue-grey 20px and 100px grid), ink `#161b26`.
> - Instrument Serif headline with one red italic phrase, Geist body, Geist Mono for numbers.
> - three.js r169 vendored: toon-shaded light grey parts with ink feature edges, a constant-pixel silhouette outline, hidden-line dashed casings, translucent glass for manifolds and barrels, and particle streams for gas and air.
> - Four phase hues: blue `#2f7de1`, ochre `#d98e04`, red `#e5482f`, grey `#7b8494`.
> - Numbered drafting-balloon labels in two de-overlapped columns, laid out every frame.
>
> **The architecture.** A kit plus one mechanism file per machine.
> - The mechanism supplies:
>   - geometry and closed-form kinematics from one driver angle;
>   - phases, with optional bounds computed from state;
>   - instances with phase offsets;
>   - a driver (slider to rate to degrees per second) and slow-motion divisors;
>   - a gauge, an x-y loop plot and a cycle chart;
>   - layers, actions, callouts, readouts, tag anchors and a camera view box.
> - The kit builds the DOM, state, loop, controls, charts, labels and tags.
>
> **Two layouts.**
> - `sheet`: border with zone letters, phase panel, instruments, title block, and a scrubbable cycle chart.
> - `figure`: the model alone on a rounded card, with unit tags and dashed leaders, a status line "Shown at 1/60 speed · running", a phase chip and a slim control strip.
>
> **Three mechanisms.**
> - A commented slider-crank starter.
> - An inline-4 four-stroke engine: firing order 1-3-4-2, cam lobes extruded from the valve-lift profile, spark, gas colour by stroke, exhaust heat, timing belt, P-V loop.
> - A bike floor pump: cup seal, ball check valve, hose, wheel and gauge. The delivery phase starts where barrel pressure reaches tyre pressure, so it moves later as the tyre fills, and there is a "Let air out" action.
>
> **Tools.**
> - `smoke.py`: drives every control in both layouts at three sizes.
> - `shoot.py`: headless stills.
> - `record.py`: frame-exact 60 fps clips under a virtual clock, with a drawn cursor and real mouse events from plan files, plus a `--dry --log` state dump.
> - `engine_sound.py`: a real-speed inline-4 sound synthesised from that log.
> - `scripts/new_project.py`: scaffolding.
>
> **Checks.** CI runs the manifest and frontmatter checks, an installer test, and a headless Chromium smoke test of all mechanisms. No em dashes anywhere.
