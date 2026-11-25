/* =========================================================================
   Inkworks themes: the one place a page's colours, fonts and 3D materials live.
   Pick with ?theme=<id>, else <body data-theme>, else 'drafting'.
   Resolved before any mechanism loads, so HUES (from kit.js) already carry the theme
   when a mechanism captures them at import time. That is also why a mechanism cannot
   pick its own theme: set data-theme in index.html (new_project.py --theme) instead.

   Each theme:
     css    CSS custom properties written onto :root (sheet.css only reads variables)
     fonts  Google Fonts css2 query, injected as one <link>
     hues   the four phase hues; keep one meaning per hue across the page
     accent redline, needle, timing marks, headline <em>
     mat    3D toon materials (same keys as kit.M) and glass opacity
     ghost  hidden-line housing fill colour and opacity
   ========================================================================= */

const DRAFTING = {
  label: 'Drafting sheet',
  css: {
    '--paper': '#f8f9fb', '--desk': '#e7ebf1',
    '--ink': '#161b26', '--ink-2': '#4a5263', '--ink-3': '#8a93a3',
    '--rule': '#cfd6e0', '--rule-soft': '#e4e9f0',
    '--grid': 'rgba(70, 110, 160, .06)', '--grid-major': 'rgba(70, 110, 160, .11)',
    '--sans': '"Geist", "Helvetica Neue", system-ui, sans-serif',
    '--mono': '"Geist Mono", ui-monospace, Menlo, monospace',
    '--serif': '"Instrument Serif", "Iowan Old Style", Georgia, serif',
  },
  fonts: 'family=Geist:wght@400;500;600&family=Geist+Mono:wght@400;500&family=Instrument+Serif:ital@0;1',
  hues: { blue: '#2f7de1', ochre: '#d98e04', red: '#e5482f', grey: '#7b8494' },
  accent: '#e5482f',
  mat: { steel: '#c3ccd8', alloy: '#eef1f5', dark: '#a4afbe', valve: '#dde3ec', ceramic: '#ffffff', rubber: '#8f98a7', copper: '#d39a63', glass: '#8dbcf2', glassOpacity: 0.26 },
  ghost: { fill: '#6b8ab0', opacity: 0.035 },
};

export const THEMES = {
  drafting: DRAFTING,

  // the engine page's original look: white ink on cyanotype navy
  blueprint: {
    label: 'Blueprint',
    css: {
      '--paper': '#123a6d', '--desk': '#0c2a52',
      '--ink': '#eaf2ff', '--ink-2': '#bccde9', '--ink-3': '#86a0c8',
      '--rule': '#3f6699', '--rule-soft': '#2a5186',
      '--grid': 'rgba(220, 235, 255, .07)', '--grid-major': 'rgba(220, 235, 255, .15)',
      '--sans': '"Archivo", "Helvetica Neue", system-ui, sans-serif',
      '--mono': '"JetBrains Mono", ui-monospace, Menlo, monospace',
      '--serif': '"Archivo Narrow", "Archivo", system-ui, sans-serif',
    },
    fonts: 'family=Archivo:wght@400;500;600&family=Archivo+Narrow:ital,wght@0,500;1,500&family=JetBrains+Mono:wght@400;500',
    hues: { blue: '#63c7ff', ochre: '#ffc24a', red: '#ff6f5c', grey: '#a6b6d0' },
    accent: '#ff6f5c',
    mat: { steel: '#2f5a94', alloy: '#4573b0', dark: '#244c82', valve: '#3b67a3', ceramic: '#5a88c4', rubber: '#1e4275', copper: '#c48a52', glass: '#9fd6ff', glassOpacity: 0.16 },
    ghost: { fill: '#dbe8ff', opacity: 0.05 },
  },

  // 19th century patent drawing: sepia ink on ivory, engraved serif
  patent: {
    label: 'Patent drawing',
    css: {
      '--paper': '#f5eedc', '--desk': '#e4d8bb',
      '--ink': '#33251a', '--ink-2': '#5c4a38', '--ink-3': '#978369',
      '--rule': '#d5c6a4', '--rule-soft': '#e7dcc3',
      '--grid': 'rgba(120, 90, 50, .05)', '--grid-major': 'rgba(120, 90, 50, .1)',
      '--sans': '"Libre Caslon Text", Georgia, serif',
      '--mono': '"Courier Prime", "Courier New", monospace',
      '--serif': '"IM Fell English", "Libre Caslon Text", Georgia, serif',
    },
    fonts: 'family=IM+Fell+English:ital@0;1&family=Libre+Caslon+Text:wght@400;700&family=Courier+Prime',
    hues: { blue: '#3d6e8c', ochre: '#b7832b', red: '#a63f2a', grey: '#8b7e69' },
    accent: '#a63f2a',
    mat: { steel: '#d9ccb0', alloy: '#f3ebd8', dark: '#c3b393', valve: '#e7dcc5', ceramic: '#fcf7ea', rubber: '#b2a181', copper: '#c99158', glass: '#9cb9c2', glassOpacity: 0.22 },
    ghost: { fill: '#8a6d45', opacity: 0.04 },
  },

  // Creo Parametric graphics window: grey shaded solids on the light blue-grey viewport,
  // sketch cyan, PTC green for the active feature, red for cuts
  creo: {
    label: 'Creo',
    css: {
      '--paper': '#eef2f7', '--desk': '#d7dfe9',
      '--ink': '#1d2733', '--ink-2': '#4b5869', '--ink-3': '#8693a4',
      '--rule': '#c5cfdb', '--rule-soft': '#dde4ed',
      '--grid': 'rgba(40, 90, 150, .045)', '--grid-major': 'rgba(40, 90, 150, .085)',
      '--sans': '"IBM Plex Sans", "Segoe UI", system-ui, sans-serif',
      '--mono': '"IBM Plex Mono", Consolas, monospace',
      '--serif': '"IBM Plex Sans Condensed", "IBM Plex Sans", system-ui, sans-serif',
    },
    fonts: 'family=IBM+Plex+Sans:wght@400;500;600&family=IBM+Plex+Sans+Condensed:ital,wght@0,500;1,500&family=IBM+Plex+Mono:wght@400;500',
    hues: { blue: '#0f9bd7', ochre: '#4caf3e', red: '#d8443a', grey: '#7c8898' },
    accent: '#4caf3e',
    mat: { steel: '#b7bec8', alloy: '#d6dbe2', dark: '#9aa3b0', valve: '#c7cdd5', ceramic: '#eceff3', rubber: '#8c95a2', copper: '#c78f5c', glass: '#8cc4ec', glassOpacity: 0.24 },
    ghost: { fill: '#4d7fb3', opacity: 0.04 },
  },
};

const q = new URLSearchParams(location.search).get('theme');
export const themeId = THEMES[q] ? q : THEMES[document.body.dataset.theme] ? document.body.dataset.theme : 'drafting';
export const theme = THEMES[themeId];

/** Ink at an alpha, for canvas and SVG strokes that used to hard-code rgba(22,27,38,a). */
export function inkA(a) {
  const h = theme.css['--ink'];
  return `rgba(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)}, ${a})`;
}

const root = document.documentElement.style;
for (const [k, v] of Object.entries({ ...theme.css, '--in': theme.hues.blue, '--co': theme.hues.ochre, '--pw': theme.accent, '--ex': theme.hues.grey })) root.setProperty(k, v);
document.body.dataset.theme = themeId;
const link = document.createElement('link');
link.rel = 'stylesheet';
link.href = `https://fonts.googleapis.com/css2?${theme.fonts}&display=swap`;
document.head.appendChild(link);
