# Lessons

Things that went wrong while building the engine and the pump, and what fixed them.

## Layout and framing

- **Callouts piled onto the panels.** Fixed offsets per label never survive an orbit. Lay them out every frame: project the anchor points, sort by x, split into a left and a right column, push apart by a fixed gap, then pull the stack back inside the free region.
- **The model hid behind the side panels.** Centre it in the free region with `camera.setViewOffset` and fit the distance to that region, not to the window. Recompute on resize and after fonts load.
- **Parts left the frame at the end of the stroke.** The pump's handle travels to nearly twice the pump's height. Make `view.box` cover full travel, and check stills at both ends of the cycle, not just the start.
- **The right column overflowed at 1280x720.** Put the title block inside the instruments column with `margin-top: auto`, hide hints on short screens, and put extra action buttons in the transport row instead of adding a row.
- **Dark parts became holes.** On white paper anything darker than about `#8f98a7` reads as a black blob. The tyre first used `#59606e` and dominated the frame.

## Motion and state

- **Back went forward.** Stepping back from just inside a phase jumped 540 degrees forward. `jumpTo(target, dir)` must take a direction: -1 always goes backwards, 0 takes the shortest way round.
- **Particles raced while paused or ran backwards when scrubbed.** Advance streams and accumulate heat or pressure by how far theta moved this frame, ignore jumps over half a cycle, and never use wall time.
- **Accumulating state and scrubbing.** The pump's tyre only fills while theta moves forward through the delivery phase; scrubbing back does not empty it. Say so in the code.
- **Spring length.** A valve spring compresses as the valve opens: `scale.y = rest - lift`, with the spring's base on the head, not the valve.
- **Phase bounds that move.** The pump's check valve opens where the barrel pressure reaches the tyre's. Computing that angle every frame in `bounds(state)` makes the chart, the phase panel and the step buttons all agree, and the moving red band is the best teaching moment on the page.

## Drawing

- **Plots squashed when their CSS aspect changed.** Size a canvas from its bounding box on every layout, never from fixed attributes.
- **A plot loop drew a line back across.** When a phase ends exactly at the cycle length, do not wrap that last point to 0.
- **Additive sparks vanished on white.** Use normal blending and a texture with its own dark red rays.
- **Emissive heat washed out.** Lerp the material colour toward red instead.

## Tooling

- **rAF freezes under the virtual clock**, and so does any `wait_for_function` that polls on animation frames. Poll on an interval (`polling=100`) and pre-roll a few frames before measuring the page.
- **WebKit screenshots stall about once in 100 frames at 1080p.** Retry with a 20 s timeout; the paused clock makes the retried frame identical.
- **The smoke test's chart scrub missed on phones** because the chart was below the fold. Scroll the element into view before driving it with the mouse.
- **ffmpeg builds without libwebp** cannot write animated WebP. Encode README animations with Pillow from PNG frames.
