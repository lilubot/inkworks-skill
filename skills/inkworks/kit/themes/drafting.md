---
name: Drafting sheet
description: An engineering drawing that moves. Ink on white grid paper.
colors:
  paper: "#f8f9fb"
  desk: "#e7ebf1"
  ink: "#161b26"
  ink-2: "#4a5263"
  ink-3: "#687082"
  rule: "#cfd6e0"
  rule-soft: "#e4e9f0"
  grid: "rgba(70, 110, 160, .06)"
  grid-major: "rgba(70, 110, 160, .11)"
  accent: "#e5482f"
  hue-blue: "#2f7de1"
  hue-ochre: "#d98e04"
  hue-red: "#e5482f"
  hue-grey: "#7b8494"
  mat-steel: "#c3ccd8"
  mat-alloy: "#eef1f5"
  mat-dark: "#a4afbe"
  mat-valve: "#dde3ec"
  mat-ceramic: "#ffffff"
  mat-rubber: "#8f98a7"
  mat-copper: "#d39a63"
  mat-glass: "rgba(141, 188, 242, 0.26)"
  ghost-fill: "rgba(107, 138, 176, 0.035)"
typography:
  display:
    fontFamily: "Instrument Serif, Iowan Old Style, Georgia, serif"
    fontSize: "40px"
    fontWeight: 400
    lineHeight: 0.95
  body:
    fontFamily: "Geist, Helvetica Neue, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
    lineHeight: 1.45
  body-medium:
    fontFamily: "Geist, Helvetica Neue, system-ui, sans-serif"
    fontSize: "12.5px"
    fontWeight: 500
  body-strong:
    fontFamily: "Geist, Helvetica Neue, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 600
  mono:
    fontFamily: "Geist Mono, ui-monospace, Menlo, monospace"
    fontSize: "11px"
    fontWeight: 400
  mono-medium:
    fontFamily: "Geist Mono, ui-monospace, Menlo, monospace"
    fontSize: "12px"
    fontWeight: 500
---

## Overview

The default Inkworks look: a technical drawing that happens to move. White grid paper, one ink, light grey toon-shaded parts with ink outlines, and four phase hues that mean the same thing everywhere on the page.

## Colors

Ink on paper carries everything. `ink-3` is the lightest text and still clears 4.5:1 on the paper. The four `hue-*` slots are phase colours, named for the API (`HUES.blue` and so on), and the kit darkens them toward the ink wherever they are used as text. `accent` is the redline, the gauge needle, timing marks and the headline phrase. `mat-*` are the 3D toon materials; nothing is darker than `mat-rubber`, or it reads as a hole in the paper.

## Typography

Instrument Serif for the headline (one italic accent phrase), phase names and the title block. Geist for body text and controls, Geist Mono for captions, readouts, chart text and anything numeric.

## Do's and Don'ts

- Do keep one meaning per hue across the 3D model, the chart, the list dots and the readouts.
- Do show heat by lerping a material toward red, not with emissive glow.
- Don't add shadows, environment maps or post effects. It is a drawing, not a render.
- Don't use em dashes in copy.
