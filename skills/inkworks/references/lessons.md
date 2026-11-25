# Lessons

Engineering lessons collected while building and refactoring Inkworks into a CAD-ready 3D Engineering Intent workbench, and the exact fixes that stay in the kit.

## Layout and framing

- **Callouts piled onto the rails.** Fixed screen offsets break as soon as a user orbits or pans. Lay callouts out every frame: project anchor points to screen space, sort by X, split into left and right columns outside the assembly's projected bounding box, push labels apart by a fixed vertical gap, then clamp back inside the free stage rect.
- **The assembly hid behind side rails.** Center `view.target` inside the free stage rectangle between the left model tree and right YAML/JSON inspector using `camera.setViewOffset`, and fit camera distance to that free rectangle rather than the full window. Recompute on resize and after `document.fonts.ready`.
- **Exploded subassemblies clipped out of frame.** At `100%` explode, doors, aprons, tops, and buyouts travel well past the assembled footprint. Set `view.box` (or use `tree.getExplodedBounds()`) to cover full exploded travel, and inspect stills at both `0%` and `100%` explode.
- **Dark materials collapsed into black holes on light viewports.** On light `creo` and `drafting` backgrounds, toon albedo darker than about `#8c95a2` loses edge contrast and reads as a flat blotch. Calibrate dark metals (like blackened steel or rubber gaskets) in `materials.js` so 30-degree ink feature lines still read clearly.

## 3D ingestion, materials, and hierarchy

- **Offline GLB loading without CDN dependencies.** Vendoring a standalone ES module `gltf-loader.js` built directly against vendored Three.js r169 guarantees zero external network calls, works in air-gapped shop-floor environments, and preserves `node.extras`, `mesh.extras`, and `material.extras` verbatim in `object3d.userData`.
- **Styling GLBs without breaking selection or hierarchy.** `kit.applyInkStyle(root)` attaches edge and inverted-hull silhouette meshes as `__inkHelper` children rather than replacing parent groups or overwriting `userData`. Raycasting (`kit.pick()`) ignores `__inkHelper` meshes and walks up to the owning tree node cleanly.
- **Gauge-vs-Finish decoupling in `materials.js`.** Architectural finish switching (`setArchitecturalFinish()`) must only re-skin eligible exposed panels while keeping physics-locked materials immutable: ferritic 18ga 430 (`8285`) magnetic gasket surfaces, structural 11ga angles, 20ga mill internal liners, urethane insulation, and buyout hardware never change when an architect selects powdercoat or brass.
- **Persistent per-node tree state across timeline scrubbing.** Users toggle visibility, ghosting, isolation, and scoped explode on individual subassemblies and parts. `tree.evaluateTimeline(t)` drives stage progression and default explode curves while respecting explicit user overrides so scrubbing the bottom timeline never wipes out a manual hide or isolate state.

## Stage progression and idle rendering

- **Stepping backward jumped forward.** `stepStage(-1)` must clamp or step directly to the previous stage boundary rather than wrapping arbitrarily. Always treat build stages as an ordered engineering sequence (`0..N-1`) with explicit stage ranges.
- **Continuous rendering timed out automated design checks.** `impeccable detect` (`design_check.sh`) waits for the browser main thread to go idle. Throttling the animation loop after `SETTLE = 1.5s` of no camera motion, no tween, and paused playback (`?play=0`) keeps CPU usage at zero when idle and makes automated visual gates fast and reliable.

## Tooling and repo integrity

- **rAF freezes under the virtual clock** in `record.py`, which also freezes `wait_for_function` calls that rely on animation frames. Poll on an interval (`polling=100`) and pre-roll a few virtual ticks before measuring bounding boxes.
- **WebKit screenshots occasionally stall at 1080p.** Retry screenshots with a 20 s timeout; under the paused virtual clock, the retried frame is bit-identical.
- **Timeline scrub misses on phone viewports** when the bottom timeline sits below the fold. Always call `scroll_into_view_if_needed()` before driving mouse drags in `smoke.py`.
- **Strict skill frontmatter and em-dash checks.** `tests/check.mjs` parses `SKILL.md` YAML frontmatter in strict mode, verifies every referenced `scripts/`, `assets/`, or `references/` path exists on disk, checks all `.js`/`.mjs` with `node --check` and `.py` with `ast.parse`, and rejects any em dash in `SKILL.md`.
