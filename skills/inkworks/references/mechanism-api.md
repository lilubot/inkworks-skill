# Mechanism file API

A mechanism is one ES module in `kit/js/mechanisms/` that default-exports a plain object. The page (`kit/js/sheet.js`) reads its metadata to build the DOM, calls `build(kit, api)` once, then calls `model.pose(theta, dt, state)` every frame. `starter.js` is the shortest complete example; `engine.js` shows several instances, `pump.js` shows moving phase bounds, mechanism state and an action button.

## Top-level fields

| Field | Required | Meaning |
| --- | --- | --- |
| `id` | yes | Short name, matches the file name |
| `meta.pageTitle` | | Browser tab title |
| `meta.fig`, `meta.caption` | yes | Sheet top bar, e.g. `Fig. 01` and `Inline-4 · four-stroke petrol · cutaway` |
| `meta.title` | yes | Headline HTML. Wrap one phrase in `<em>` for the red italic |
| `meta.lede` | yes | One or two sentences under the headline (sheet layout) |
| `meta.titleBlock` | yes | `{ title, dwg, scale? }` for the title block (sheet layout) |
| `meta.alt` | | Accessible name for the 3D canvas |
| `meta.layout` | | `'sheet'` or `'figure'`: this mechanism's default |
| `cycle` | yes | Driver degrees per full cycle (360 for most, 720 for a four-stroke) |
| `start` | | Initial theta |
| `phases` | yes | Array of `{ name, nick, list, short, key, color, text }`. `name` big title, `nick` the one-word nickname, `list` the phase-list button, `short` the chart label (caps), `key` the chart legend, `color` one of `HUES`, `text` 2 to 3 sentences |
| `bounds(state)` | | Phase start angles, length = phases. Omit for equal slices. Called every frame, so bounds may depend on `state.mech` |
| `instances` | yes | `{ count, label, short, offset[] }`. `offset[i]` is where unit i sits in the cycle (engine `[0, 540, 180, 360]` fires 1-3-4-2). One unit: `count: 1, offset: [0]` |
| `driver` | yes | The reader's input and the rate it drives, below |
| `speeds`, `speed` | yes | Slow-motion divisors shown as buttons (`[200, 60, 12]`, `[4, 2, 1]`; 1 shows as `1x`) and the default |
| `gauge` | | Sheet layout dial: `{ max, red?, minor, major, tick?(v), label, unit, value(state), readout?(v) }` |
| `plot` | | Sheet layout x-y loop: `{ label, x(phi, state) -> 0..1, y(phi, state), yUnit, xTicks: [left, mid, right], yMin }`. Drawn per phase in phase colours with a dot for the followed unit |
| `chart` | | `{ label, note, markers: [{ at, kind: 'spark' or 'tick' }] }`. `at` may be a function of state |
| `layers` | | Toggle buttons the mechanism handles: `[{ key, label, on }]`. Labels and Orbit are added by the page |
| `actions` | | Extra buttons: `[{ label, run(state, api) }]`, e.g. the pump's "Let air out" |
| `view` | yes | Camera, below |
| `compactCallouts` | | Callout numbers to keep on phones |
| `build(kit, api)` | yes | Builds the model and returns it, below |

### driver

```js
driver: {
  inputLabel: 'Accelerator',            // slider label
  inputHint: 'Opens the throttle...',   // one line under it (sheet layout)
  input: 0.15,                          // slider start, 0..1
  start: 850,                           // optional starting rate
  target: (x) => 800 + 5600 * x ** 1.15, // rate the input asks for (rpm, strokes/min...)
  inputFormat: (x) => `${...}`,         // optional slider readout (default: percent)
  inertia: 1.4,                         // how fast the rate follows (per second)
  degPerSec: (rate) => rate / 60 * 360, // rate -> driver degrees per second at 1x
}
```

Each frame: `state.rate` eases toward `target(state.input)`, then `theta += degPerSec(rate) / state.slow * dt` while playing.

### view

```js
view: {
  target: [0, 1.15, 0],     // what the camera orbits
  dir: [6.4, 4, -9],        // direction from target to camera (normalised for you)
  radius: 3.9,              // how much of the scene to fit, sheet layout
  radiusFigure: 3.75,       // figure layout (default radius * 1.15)
  radiusCompact: 4.7,       // phones (default radius * 1.2)
  minDist: 7, maxDist: 30,  // orbit zoom limits
  box: [[x0, y0, z0], [x1, y1, z1]],   // bounding box of everything at full travel; callout columns sit outside it
}
```

The layout centres `target` in the free area between the panels (or inside the card) with `camera.setViewOffset`, and picks the distance that fits `radius`.

## build(kit, api)

`kit` is everything from `kit/js/kit.js`:

| Name | Use |
| --- | --- |
| `THREE`, `scene`, `camera`, `controls`, `renderer` | three.js r169 and the live scene |
| `part(geo, mat, { edges, outline })` | Solid: toon mesh + ink feature edges + silhouette outline |
| `ghost(geo)` | Hidden-line housing: faint fill + dashed edges |
| `ghostRings(curve, r, n)` | Dashed rings along a translucent tube |
| `inkRing(r, y, mat?, seg?)` | Ink circle in the XZ plane (piston rings, focus rings) |
| `markLine(len, r0)` | Red timing mark that makes rotation visible |
| `stream(points, color, { count, size, parent })` | Particle flow along a path; move with `.advance(fraction)`, fade with `.mat.opacity` |
| `flash(size)` | Spark/impact sprite; scale it in `pose()` |
| `xCyl(r, len)`, `aimX(dy, dz)` | Cylinder along X; rotation that aims a -Z feature |
| `gearGeometry(r, teeth, depth)`, `springGeometry(r, turns, wire)`, `hull(points)` | Gears, coil springs (scale.y to compress), belts |
| `toon(hex)`, `M` | Material maker and the shared palette: `steel alloy dark valve ceramic rubber copper glass` |
| `lineMat`, `ghostLine`, `INK`, `HUES`, `D2R`, `mod`, `clamp01`, `smooth` | Helpers |

`api` is `{ state, phaseOf(phi), phiOf(i), bounds(), cycle }`.

`state` holds: `theta`, `phi[i]` (each unit's angle in the cycle, already offset), `playing`, `input`, `rate`, `slow`, `focus`, `layers`, `tween`, `scrubbing`, and `mech` (yours).

### The returned model

| Field | Required | Meaning |
| --- | --- | --- |
| `root` | | The group you built (added to the scene if you did not) |
| `pose(theta, dt, state)` | yes | Place every part for this angle. Use `state.phi[i]` for per-unit angles. Tie particle movement and accumulation to how far theta moved this frame (`theta - lastTheta`), never to `dt`, so scrubbing and stepping stay correct |
| `callouts` | yes | `[{ n, name, at(v, state), show?(state) }]`: `at` writes the world point the leader touches (use `obj.localToWorld(v.set(...))` for moving parts). Optional `show` hides the label while it returns false, e.g. before the part exists |
| `readouts` | | `[{ label, value(ctx) }]`, `ctx = { phi, i, s, phase, api }`. Return a string, or `{ text, cls }` with `cls` `'on'` (blue) or `'hot'` (red) |
| `setLayer(key, on)` | | Show or hide what each layer toggle controls |
| `tagAnchor(i, v, where)` | if count > 1 | World point for unit i's tag: `'below'` (sheet balloons), `'above'` (figure tags) and `'point'` (where the figure tag's dashed leader ends) |
| `focusChanged(i, state)` | | Called when the reader follows another unit |

## URL and page switches

- `?m=pump` picks a mechanism file (`?m=examples/engine` inside a scaffolded project).
- `?layout=figure` or `?layout=sheet` overrides the layout.
- `?theme=drafting|blueprint|patent|creo` overrides the theme (else `<body data-theme>`, else `drafting`). See `kit/js/theme.js`.
- `window.__sheet` = `{ state, model, mech, kit, api, setFocus, jumpTo, setPlaying, layout }` for scripted shots, the recorder and the console.
- Keyboard: Space plays and pauses, the left and right arrows step one phase.
