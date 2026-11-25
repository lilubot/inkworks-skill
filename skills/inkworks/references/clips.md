# Walkthrough clips

`kit/tools/record.py` records a frame-exact 60 fps 1920x1080 walkthrough clip (silent MP4) of any live Inkworks workbench or figure card.

## How recording works

- **Virtual clock.** `performance.now`, `Date.now`, `requestAnimationFrame`, `setTimeout`, and CSS animations are intercepted before page load and stepped exactly 1/60 s per video frame. Output stays smooth regardless of software WebGL frame render time.
- **Real input.** A drawn ink arrow cursor follows a scripted, gently arced path with a click bloom ring while Playwright dispatches real mouse events. Orbit drags, stage clicks, explode sweeps, tree selections, and option toggles behave identically to interactive use.
- **Output format.** `1600x900` viewport at `1.2x` device scale, scaled to `1920x1080` via ffmpeg (`lanczos`), H.264 CRF 16, `yuv420p`, `+faststart`.

## Commands

```bash
python3 kit/serve.py 9081 &
# Quick contact-sheet check (every 30th frame as PNG, ~30 s)
python3 kit/tools/record.py /tmp/check --plan kit/tools/clips/counter_sheet.py --url "http://localhost:9081/?a=counter_087837&play=0" --frames-every 30
# Full 60 fps MP4 walkthrough
python3 kit/tools/record.py out/counter_087837.mp4 --plan kit/tools/clips/counter_sheet.py --url "http://localhost:9081/?a=counter_087837&play=0"
```

## Writing a clip plan

A clip plan is a Python file in `kit/tools/clips/` exporting `build(rects, Script, centre)` that returns a `Script`:

```python
def build(r, Script, c):
    st = r["stage"]
    s = Script(start=(st["x"] + st["w"] * 0.55, st["y"] + st["h"] * 0.65))
    s.wait(1.8)                                        # settle default assembled view
    if r.get("next"):
        s.move(c(r["next"]), 0.9).wait(0.15).click()   # advance build stage
        s.wait(1.6).click()
    s.move((st["x"] + st["w"] * 0.52, st["y"] + st["h"] * 0.52), 0.9)
    s.drag((st["x"] + st["w"] * 0.36, st["y"] + st["h"] * 0.46), 1.8)  # orbit
    s.wait(1.2)
    return s
```

A clean 30 to 40 second engineering walkthrough order:

1. Hold briefly on the default assembled `creo` view so the WO badge, standards callouts, and YAML Product DNA register.
2. Step through key build stages (`#nextBtn`) or scrub the bottom subsystem timeline.
3. Sweep the explode view (`0% -> 100%`) so nested subassemblies, magnetic 430 door/gasket layers, and dashed trace lines open cleanly.
4. Orbit smoothly around the exploded assembly with balanced drags, then toggle an Engineer-Provided Option (e.g. architectural finish or shipping split) so both the 3D scene and live YAML/JSON update together.
5. Return to the `Iso` or `Reset` camera preset and hold for 2 to 3 seconds at the end.

Always inspect a `--frames-every 30` still set before running a full MP4 render to confirm no callout overlaps or clipped geometry at full explode.
