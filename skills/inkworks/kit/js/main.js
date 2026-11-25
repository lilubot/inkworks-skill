import { createSheet } from './sheet.js';

// Assembly selection: ?a=name or ?m=name, else <body data-assembly> (default counter_087837)
const q = new URLSearchParams(location.search);
const fallback = document.body.dataset.assembly || document.body.dataset.mechanism || 'counter_087837';
let name = q.get('a') || q.get('m') || fallback;
if (!/^[a-z0-9_-]+(\/[a-z0-9_-]+)?$/i.test(name)) name = fallback;

try {
  const mod = await import(`./assemblies/${name}.js`);
  const assembly = mod.default || mod.assembly || mod;
  await createSheet(assembly);
} catch (err) {
  console.error(`Inkworks: failed to load assembly '${name}'`, err);
  const el = document.createElement('p');
  el.className = 'nojs';
  el.textContent = `Could not load assembly "${name}": ${err?.message || err}`;
  document.body.appendChild(el);
}
