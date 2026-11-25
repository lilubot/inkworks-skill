# The look

The Drafting Sheet is a technical drawing that happens to move. Keep these values; the CSS tokens live on `:root` in `kit/css/sheet.css`.

## Paper and ink

| Token | Value | Use |
| --- | --- | --- |
| `--paper` | `#f8f9fb` | Sheet and card background |
| `--ink` | `#161b26` | Text, rules, outlines, filled buttons |
| `--ink-2` / `--ink-3` | `#4a5263` / `#8a93a3` | Body text / hints, axis labels |
| `--rule` / `--rule-soft` | `#cfd6e0` / `#e4e9f0` | Borders / readout separators |
| Grid | `rgba(70,110,160,.06)` every 20px, `.11` every 100px | The paper |

## Phase hues

Blue `#2f7de1`, ochre `#d98e04`, red `#e5482f`, grey `#7b8494` (`HUES` in `kit.js`). Re-map their meaning per machine (intake, compression, power, exhaust; or fill, squeeze, deliver), but keep the hues and keep one meaning per hue across the whole page. Red doubles as the accent: the headline's `<em>`, the gauge needle and redline, timing marks, sparks.

## Type

- **Instrument Serif** for the headline (one italic red phrase), phase names, the big italic phase number and the title block.
- **Geist** for body text, labels and controls.
- **Geist Mono** for captions, readouts, chart text, the status line and anything numeric (`font-variant-numeric: tabular-nums`).

## 3D parts

- `MeshToonMaterial` with a 3-step ramp `[150, 205, 255]`, nearest filtering. Hemisphere light 1.5 plus one directional at 2.2. No shadows, no environment map, no post effects.
- Every solid is `part()`: ink feature edges (30 degree threshold) plus a constant-pixel silhouette outline.
- Palette: steel `#c3ccd8`, alloy `#eef1f5`, dark `#a4afbe`, valve `#dde3ec`, ceramic `#ffffff`, rubber `#8f98a7`, copper `#d39a63`, glass `#8dbcf2` at 0.26 opacity. Nothing darker than rubber, or it turns into a black hole on white.
- Housings are `ghost()`: fill at 0.035 and dashed ink edges, toggled by a layer.
- Fluids are translucent volumes coloured by phase plus `stream()` dots. Heat lerps a material's colour toward red.
- Sprites use normal blending; additive blending disappears on white paper.
- Show motion with red timing marks on anything that rotates.

## Sheet layout

- A fixed border 10px in, an inner 1.5px ink frame 18px further in, zone numbers 1 to 8 along the top and bottom, letters A to E down the sides.
- Grid `300px 1fr 280px` columns. Top bar across: figure tag (ink box) and caption on the left, layer checkboxes on the right. Left column: headline and lede, then block A (phase panel). Right column, spanning down: block B (instruments, controls, transport, title block pinned to the bottom). Bottom, under the stage: block C (cycle chart, key folded into its header).
- Blocks are open datasheet sections: a 2px ink top rule, a small boxed letter and a mono caps label. No cards, no rounded corners, no shadows.
- Controls: square checkbox toggles, ink-bordered segmented buttons (`.on` fills ink), round transport buttons with the play button filled.
- Short screens (under 820px tall) shrink type and hide hints; under 960px wide the stage becomes a sticky top half and the blocks stack.

## Figure layout

- A rounded card (18px radius) inset 16px on a slightly darker desk `#e7ebf1`, the grid inside the card only.
- Top left: status line `Shown at 1/60 speed · running` and a chip with the followed unit and its phase in the phase colour. Top right: the headline at 27px and the layer toggles.
- Instance tags (`Cyl 1`) float above each unit with a dashed leader down to it; the followed one fills with its phase colour. Click a tag to follow it.
- Bottom strip: transport, speed buttons, the input slider, any actions, the unit selector, and `Drag to orbit` on the right.
- Callouts reach further out (70px) so the labels sit in two clean columns either side.

## Copy

- Headline: "How a *thing* does its job" with one phrase in red italic.
- Phase text: what moves, what it does to the fluid or the load, and why it matters. Two or three sentences, plain words.
- Nicknames are one word in quotes (`"suck"`, `"squeeze"`, `"bang"`, `"blow"`).
- No em dashes anywhere.
