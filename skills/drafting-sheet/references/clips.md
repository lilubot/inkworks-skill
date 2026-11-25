# Walkthrough clips and sound

## Recording

`kit/tools/record.py` makes a frame-exact 60 fps 1920x1080 clip of the live page.

- **Virtual clock.** `performance.now`, `Date.now`, `requestAnimationFrame`, `setTimeout` and CSS animations are replaced before the page loads, and step exactly 1/60 s per video frame. The clip is perfectly smooth however long each screenshot takes (about 3 to 10 frames a second of real time).
- **Real input.** A drawn ink arrow cursor follows a scripted path with eased, slightly arced moves, and a red ring blooms on each press. Playwright's real mouse events do the clicking and dragging, so the slider, the orbit, the chart scrub and every button behave exactly as they do for a person.
- **Viewport** 1600x900 at 1.2x device scale, scaled to 1920x1080 by ffmpeg (lanczos), H.264 CRF 16, `yuv420p`, `+faststart`.
- **WebKit** headless renders WebGL at full speed on macOS. A screenshot occasionally stalls; the recorder retries it (the clock is paused, so the frame is identical).

```bash
python3 kit/serve.py 9081 &
python3 kit/tools/record.py /tmp/check --plan kit/tools/clips/pump_figure.py --url "http://localhost:9081/?m=pump" --frames-every 30   # stills, ~40 s
python3 kit/tools/record.py out/pump.mp4 --plan kit/tools/clips/pump_figure.py --url "http://localhost:9081/?m=pump"                  # the clip, ~5 min
```

### Writing a plan

A plan is a Python file with `build(rects, Script, centre)` returning a `Script`. `rects` has the live positions (CSS px) of `next`, `prev`, `play`, `drive` (the slider), `chart`, `stage`, lists `focus`, `speeds`, `phases`, `actions`, and `toggles` keyed by layer.

```python
s = Script(start=(1100, 700))
s.wait(3.2)                                   # let the intro dolly finish
s.move(centre(r["next"]), 1.1).wait(0.15).click()
s.drag(thumb(85), 1.7)                        # press, move, release
return s
```

A good 40 second order: idle while the camera settles, step through the phases, play, push the input up and hold while the rate climbs, orbit out and back with two equal drags (orbit damping keeps turning after release), toggle the housing off and on, scrub the chart or use an action, follow another unit, drop to the slowest speed, rest the cursor off the model and hold.

Always check a `--frames-every 30` contact sheet before the full render: look at both ends of the stroke and both ends of the orbit.

Clips are silent by default. Add sound only when asked.

## Sound

The page's state is deterministic under the virtual clock, so a dry run of the same plan gives the exact per-frame state of the video:

```bash
python3 kit/tools/record.py x --plan kit/tools/clips/engine_sheet.py --url "http://localhost:9081/?m=engine" --dry --log out/state.json
python3 kit/tools/engine_sound.py out/state.json out/engine.mp4 out/engine-sound.mp4
```

The log fields are `[rate, input, theta, slow, playing]` per frame. `engine_sound.py` is the worked example for an inline-4:

- Real-speed sound, not slowed with the picture: firing rate = rpm / 30 Hz, so the pitch follows the tachometer.
- Smooth pressure pulses (tau 0.45 ms; at 1.1 ms the harmonics roll off and high rpm becomes a pure hum) plus a short noise burst per firing, slightly different per cylinder for the idle burble.
- Exhaust resonances (75, 155, 330, 720, 1650, 2600 Hz) and a short pipe comb, crossfaded dark to bright with load.
- Load = throttle plus acceleration, so the rev roars and then settles. Volume follows load and rpm (idle about 11 dB under full revs).
- Intake roar from band-passed noise with the throttle, a faint valve-train tick, gentle tanh saturation, a small room, loudness-normalised to about -16 LUFS on mux.

For another machine, write its own script from the same log: a pump is a hiss on each delivery and a soft clunk at the end of each stroke; a gearbox is mesh whine at teeth x rpm. Check the result with a spectrogram (`ffmpeg ... showspectrumpic`) before handing it over.
