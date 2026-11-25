/* =========================================================================
   Inkworks themes. A theme is a DESIGN.md (the impeccable / Stitch format: YAML
   frontmatter tokens + prose), so impeccable can write, critique and polish it.
     ?theme=<id>  ->  themes/<id>.md        (built-ins: drafting, blueprint, patent, creo)
     ?theme=project or <body data-theme="project">  ->  ./DESIGN.md   (a project's own)
   else <body data-theme>, else 'drafting'. drafting.md is always loaded as the base,
   so a theme only needs the keys it changes. Token keys: references/themes.md.

   Resolved with top-level await before any mechanism loads, so HUES (kit.js) already
   carry the theme when a mechanism captures them at import time.
   ========================================================================= */

/** Frontmatter of a DESIGN.md: nested maps of scalars, which is all the format uses. */
export function parseFrontmatter(text) {
  const m = /^---\r?\n([\s\S]*?)\r?\n---/.exec(text);
  const root = {};
  if (!m) return root;
  const stack = [{ indent: -1, obj: root }];
  for (const raw of m[1].split(/\r?\n/)) {
    const line = raw.replace(/\s+#(?=[^"']*$).*$/, '');   // trailing comment, not a quoted "#hex"
    if (!line.trim() || line.trim().startsWith('#')) continue;
    const kv = /^(\s*)([^:]+?):\s*(.*)$/.exec(line);
    if (!kv) continue;
    const indent = kv[1].length;
    while (indent <= stack[stack.length - 1].indent) stack.pop();
    const parent = stack[stack.length - 1].obj;
    const key = kv[2].trim().replace(/^["']|["']$/g, '');
    if (kv[3] === '') { parent[key] = {}; stack.push({ indent, obj: parent[key] }); continue; }
    const v = kv[3].trim();
    parent[key] = /^["'].*["']$/.test(v) ? v.slice(1, -1) : (v !== '' && !isNaN(+v) ? +v : v);
  }
  return root;
}

/** "rgba(r, g, b, a)" -> ['#rrggbb', a]; hex passes through with the default opacity. */
function splitAlpha(c, a = 1) {
  const m = /rgba?\(\s*(\d+)[\s,]+(\d+)[\s,]+(\d+)(?:[\s,/]+([\d.]+))?\s*\)/.exec(c);
  if (!m) return [c, a];
  return ['#' + [m[1], m[2], m[3]].map((n) => (+n).toString(16).padStart(2, '0')).join(''), m[4] != null ? +m[4] : a];
}

/** One Google Fonts css2 URL per family (a non-Google family then fails alone). Italic for the display family. */
function fontUrls(typo) {
  const fam = new Map();
  for (const [role, t] of Object.entries(typo)) {
    if (!t?.fontFamily) continue;
    const name = t.fontFamily.split(',')[0].trim().replace(/^["']|["']$/g, '');
    const f = fam.get(name) || { w: new Set(), ital: false };
    f.w.add(+(t.fontWeight || 400));
    if (role === 'display') f.ital = true;
    fam.set(name, f);
  }
  return [...fam].map(([name, f]) => {
    const w = [...f.w].sort((a, b) => a - b);
    const axis = f.ital ? `ital,wght@${[...w.map((x) => `0,${x}`), ...w.map((x) => `1,${x}`)].join(';')}` : `wght@${w.join(';')}`;
    return `https://fonts.googleapis.com/css2?family=${name.replace(/ /g, '+')}:${axis}&display=swap`;
  });
}

async function load(url) {
  const r = await fetch(url, { cache: 'no-store' });
  if (!r.ok) throw new Error(`${url}: HTTP ${r.status}`);
  return parseFrontmatter(await r.text());
}

const base = new URL('../themes/', import.meta.url);
const asked = new URLSearchParams(location.search).get('theme') || document.body.dataset.theme || 'drafting';
const id = /^[a-z0-9-]+$/i.test(asked) ? asked : 'drafting';
const fallback = await load(new URL('drafting.md', base));
let fm = fallback;
if (id !== 'drafting') {
  try { fm = await load(id === 'project' ? new URL('DESIGN.md', document.baseURI) : new URL(`${id}.md`, base)); }
  catch (e) { console.warn(`Inkworks theme '${id}' not loaded, using drafting.`, e.message); }
}
const missing = Object.keys(fallback.colors).filter((k) => !(k in (fm.colors || {})));
if (fm !== fallback && missing.length) console.warn(`Inkworks theme '${id}' has no ${missing.join(', ')}; using drafting values.`);

const c = { ...fallback.colors, ...fm.colors };
const ft = fallback.typography;
const ty = fm.typography ? { display: ft.display, body: ft.body, mono: ft.mono, ...fm.typography } : ft;   // extra roles only add font weights
const [glass, glassOpacity] = splitAlpha(c['mat-glass'], 0.26);
const [ghostFill, ghostOpacity] = splitAlpha(c['ghost-fill'], 0.035);

export const themeId = id;
export const theme = {
  label: fm.name || id,
  css: {
    '--paper': c.paper, '--desk': c.desk,
    '--ink': c.ink, '--ink-2': c['ink-2'], '--ink-3': c['ink-3'],
    '--rule': c.rule, '--rule-soft': c['rule-soft'],
    '--grid': c.grid, '--grid-major': c['grid-major'],
    '--serif': ty.display.fontFamily, '--sans': ty.body.fontFamily, '--mono': ty.mono.fontFamily,
  },
  hues: { blue: c['hue-blue'], ochre: c['hue-ochre'], red: c['hue-red'], grey: c['hue-grey'] },
  accent: c.accent,
  mat: {
    steel: c['mat-steel'], alloy: c['mat-alloy'], dark: c['mat-dark'], valve: c['mat-valve'],
    ceramic: c['mat-ceramic'], rubber: c['mat-rubber'], copper: c['mat-copper'], glass, glassOpacity,
  },
  ghost: { fill: ghostFill, opacity: ghostOpacity },
  fonts: fontUrls(ty),
};

/** Ink at an alpha, for canvas and SVG strokes. The ink token must be #rrggbb. */
export function inkA(a) {
  const h = theme.css['--ink'];
  return `rgba(${parseInt(h.slice(1, 3), 16)}, ${parseInt(h.slice(3, 5), 16)}, ${parseInt(h.slice(5, 7), 16)}, ${a})`;
}

const rootStyle = document.documentElement.style;
for (const [k, v] of Object.entries({ ...theme.css, '--in': theme.hues.blue, '--co': theme.hues.ochre, '--pw': theme.accent, '--ex': theme.hues.grey })) rootStyle.setProperty(k, v);
document.body.dataset.theme = id;
for (const href of theme.fonts) {
  const link = document.createElement('link');
  link.rel = 'stylesheet';
  link.href = href;
  document.head.appendChild(link);
}
