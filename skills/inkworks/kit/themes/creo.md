---
name: Creo
description: The Creo Parametric graphics window. Grey shaded solids, sketch cyan, PTC green for the active feature.
colors:
  paper: "#eef2f7"
  desk: "#d7dfe9"
  ink: "#1d2733"
  ink-2: "#4b5869"
  ink-3: "#626e7c"
  rule: "#c5cfdb"
  rule-soft: "#dde4ed"
  grid: "rgba(40, 90, 150, .045)"
  grid-major: "rgba(40, 90, 150, .085)"
  accent: "#4caf3e"
  hue-blue: "#0f9bd7"
  hue-ochre: "#4caf3e"
  hue-red: "#d8443a"
  hue-grey: "#7c8898"
  mat-steel: "#b7bec8"
  mat-alloy: "#d6dbe2"
  mat-dark: "#9aa3b0"
  mat-valve: "#c7cdd5"
  mat-ceramic: "#eceff3"
  mat-rubber: "#8c95a2"
  mat-copper: "#c78f5c"
  mat-glass: "rgba(140, 196, 236, 0.24)"
  ghost-fill: "rgba(77, 127, 179, 0.04)"
typography:
  display:
    fontFamily: "IBM Plex Sans Condensed, IBM Plex Sans, system-ui, sans-serif"
    fontSize: "40px"
    fontWeight: 500
  body:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontSize: "13px"
    fontWeight: 400
  body-medium:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontWeight: 500
  body-strong:
    fontFamily: "IBM Plex Sans, Segoe UI, system-ui, sans-serif"
    fontWeight: 600
  mono:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontSize: "11px"
    fontWeight: 400
  mono-medium:
    fontFamily: "IBM Plex Mono, Consolas, monospace"
    fontWeight: 500
---

## Overview

Inkworks as a Creo user sees a part: the light blue-grey viewport, grey shaded solids with dark edges, cyan sketch geometry and green for whatever is being built right now. It fits CAD and manufacturing pages, and the `regen` example most of all.

## Colors

The hue slots carry Creo meanings. `hue-blue` is sketch cyan, `hue-ochre` is the PTC green used for the active or adding feature, `hue-red` is cuts and errors, `hue-grey` is finishing and inactive. `accent` is the same green. Green is too light for text on the viewport, so the kit darkens it toward the ink wherever a hue becomes text.

## Typography

IBM Plex throughout: Sans Condensed for the headline, Sans for body text, Mono for dimensions and readouts. Close to the engineering-software feel without copying PTC's own fonts.

## Do's and Don'ts

- Do use green only for the feature being built, so it reads as Creo's selection highlight.
- Don't use PTC logos or product marks. The theme borrows the palette, not the brand.
