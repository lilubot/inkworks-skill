/* =========================================================================
   Inkworks: Live YAML / JSON Engineering Standards & Product DNA Inspector
   Zero-dependency syntax-highlighted YAML & JSON renderer with collapsible
   sections, status filtering (Locked Standard / Engineer Input / Buyout),
   interactive Engineer-Provided Options bar, copy-to-clipboard, and
   bidirectional 3D <-> Tree <-> Spec selection sync.
   ========================================================================= */

const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const STATUS_LABELS = {
  locked: 'LOCKED STD',
  engineer_input: 'ENG INPUT',
  buyout: 'BUYOUT',
};

/** Normalize arbitrary status strings from recipes/nodes into our 3 canonical buckets. */
export function normalizeStatus(raw) {
  if (!raw) return null;
  const s = String(raw).toLowerCase();
  if (s === 'locked' || s.includes('verified') || s.includes('standard') || s === 'invariant') return 'locked';
  if (s === 'engineer_input' || s.includes('engineer') || s.includes('option') || s.includes('gate')) return 'engineer_input';
  if (s === 'buyout' || s.includes('bought') || s.includes('vendor')) return 'buyout';
  return null;
}

/** Infer semantic status from key name or object fields. */
function inferStatus(key, val, inherited = null) {
  if (val && typeof val === 'object' && !Array.isArray(val)) {
    const explicit = normalizeStatus(val.standardStatus || val.standard_status || val.status || val.classification || val.kind);
    if (explicit) return explicit;
  }
  const k = String(key || '').toLowerCase();
  if (k === 'locked_standards' || k === 'standards' || k === 'bend_table' || k === 'gauge_stack' || k === 'physics_laws') return 'locked';
  if (k === 'engineer_inputs' || k === 'engineer_options' || k === 'options' || k === 'gate_1_inputs') return 'engineer_input';
  if (k === 'buyouts' || k === 'buyout_subsystems' || k === 'bought_items') return 'buyout';
  return inherited;
}

/** Resolve a dot/bracket path inside an object. */
export function getAtPath(obj, path) {
  if (!obj || !path) return undefined;
  const parts = String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  let cur = obj;
  for (const p of parts) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[p];
  }
  return cur;
}

/** Mutate an object at a dot path, creating intermediate objects if needed. */
export function setAtPath(obj, path, value) {
  if (!obj || !path) return false;
  const parts = String(path).replace(/\[(\d+)\]/g, '.$1').split('.').filter(Boolean);
  if (!parts.length) return false;
  let cur = obj;
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i];
    if (cur[p] == null || typeof cur[p] !== 'object') cur[p] = {};
    cur = cur[p];
  }
  cur[parts[parts.length - 1]] = value;
  return true;
}

/** Plain YAML serializer for clipboard copy & raw export. */
export function toPlainYAML(value, indent = 0) {
  const pad = '  '.repeat(indent);
  if (value === null || value === undefined) return 'null';
  if (typeof value === 'boolean' || typeof value === 'number') return String(value);
  if (typeof value === 'string') return formatYamlScalar(value);
  if (Array.isArray(value)) {
    if (value.length === 0) return '[]';
    if (value.every(isPrimitive) && value.length <= 6 && value.map(String).join(', ').length < 56) {
      return `[${value.map((v) => formatYamlScalar(v)).join(', ')}]`;
    }
    return value.map((item) => {
      if (isPrimitive(item)) return `${pad}- ${formatYamlScalar(item)}`;
      const entries = Object.entries(item);
      if (!entries.length) return `${pad}- {}`;
      const [k0, v0] = entries[0];
      const rest = entries.slice(1);
      const firstVal = isInlineValue(v0)
        ? `${pad}- ${formatKey(k0)}: ${formatInlineYaml(v0)}`
        : `${pad}- ${formatKey(k0)}:\n${toPlainYAML(v0, indent + 2)}`;
      if (!rest.length) return firstVal;
      const tail = rest.map(([k, v]) => (
        isInlineValue(v)
          ? `${pad}  ${formatKey(k)}: ${formatInlineYaml(v)}`
          : `${pad}  ${formatKey(k)}:\n${toPlainYAML(v, indent + 2)}`
      )).join('\n');
      return `${firstVal}\n${tail}`;
    }).join('\n');
  }
  const entries = Object.entries(value);
  if (!entries.length) return '{}';
  return entries.map(([k, v]) => {
    if (isInlineValue(v)) return `${pad}${formatKey(k)}: ${formatInlineYaml(v)}`;
    return `${pad}${formatKey(k)}:\n${toPlainYAML(v, indent + 1)}`;
  }).join('\n');
}

function isPrimitive(v) {
  return v === null || v === undefined || typeof v !== 'object';
}

function isInlineValue(v) {
  if (isPrimitive(v)) return true;
  if (Array.isArray(v)) {
    if (v.length === 0) return true;
    return v.every(isPrimitive) && v.length <= 5 && v.map(String).join(', ').length < 48;
  }
  return Object.keys(v).length === 0;
}

function formatKey(k) {
  return /^[A-Za-z0-9_.-]+$/.test(k) ? k : JSON.stringify(k);
}

function formatYamlScalar(v) {
  if (v === null || v === undefined) return 'null';
  if (typeof v === 'boolean' || typeof v === 'number') return String(v);
  const s = String(v);
  if (s === '' || /^[\s]|[\s]$/.test(s) || /[:#\[\]{}&*!|>'"%@`]/.test(s) || /^(true|false|null|yes|no|on|off)$/i.test(s) || (!isNaN(+s) && s.trim() !== '')) {
    return JSON.stringify(s);
  }
  return s;
}

function formatInlineYaml(v) {
  if (Array.isArray(v)) return `[${v.map((x) => formatYamlScalar(x)).join(', ')}]`;
  if (v && typeof v === 'object') return '{}';
  return formatYamlScalar(v);
}

function renderScalarHtml(v, format) {
  if (v === null || v === undefined) return `<span class="syn-null">null</span>`;
  if (typeof v === 'boolean') return `<span class="syn-bool">${v}</span>`;
  if (typeof v === 'number') return `<span class="syn-num">${v}</span>`;
  const raw = format === 'json' ? JSON.stringify(v) : formatYamlScalar(v);
  return `<span class="syn-str">${esc(raw)}</span>`;
}

function renderInlineArrayHtml(arr, format) {
  const items = arr.map((x) => renderScalarHtml(x, format)).join('<span class="syn-punc">, </span>');
  return `<span class="syn-punc">[</span>${items}<span class="syn-punc">]</span>`;
}

/**
 * Create the Engineering Standards & Product DNA Inspector bound to DOM slots.
 */
export function createInspector({
  codeEl,
  optionsEl,
  formatSegEl,
  filterSegEl,
  copyBtnEl,
  statusEl,
  spec = {},
  options = [],
  linkMap = new Map(),       // specPath -> { nodeId, status }
  nodeToPaths = new Map(),   // nodeId -> [specPath, ...]
  onSelectSpec = () => {},
  onOptionChange = () => {},
  onFormatChange = () => {},
  onFilterChange = () => {},
} = {}) {
  const state = {
    format: 'yaml',          // 'yaml' | 'json'
    filter: 'all',           // 'all' | 'locked' | 'engineer_input' | 'buyout'
    spec,
    options: options.map((o) => ({ ...o })),
    collapsed: new Set(),
    selectedPath: null,
    selectedNodeId: null,
    flashedPath: null,
  };

  let flashTimer = null;

  /** Build path -> { nodeId, status } resolution including object-level node_id metadata. */
  function resolveLink(path, val, inheritedNodeId = null, inheritedStatus = null, key = '') {
    const mapped = linkMap.get(path);
    const objNodeId = (val && typeof val === 'object' && !Array.isArray(val))
      ? (val.nodeId || val.node_id || val.subassembly_id || null)
      : null;
    const nodeId = mapped?.nodeId || objNodeId || inheritedNodeId || null;
    const status = mapped?.status || inferStatus(key, val, inheritedStatus);
    return { nodeId, status };
  }

  /** Determine if a subtree contains at least one branch matching the active filter. */
  function matchesFilter(key, val, path, inheritedNodeId, inheritedStatus) {
    if (state.filter === 'all') return true;
    const { status } = resolveLink(path, val, inheritedNodeId, inheritedStatus, key);
    if (status === state.filter) return true;
    if (val && typeof val === 'object') {
      if (Array.isArray(val)) {
        return val.some((item, idx) => matchesFilter('', item, `${path}[${idx}]`, inheritedNodeId, status));
      }
      return Object.entries(val).some(([ck, cv]) =>
        matchesFilter(ck, cv, path ? `${path}.${ck}` : ck, inheritedNodeId, status));
    }
    return false;
  }

  /** Filter spec object recursively for copy/JSON export when a filter tab is active. */
  function getFilteredSpec() {
    if (state.filter === 'all' || !state.spec || typeof state.spec !== 'object') return state.spec;
    function filterVal(val, key, path, inheritedNodeId, inheritedStatus) {
      const { nodeId, status } = resolveLink(path, val, inheritedNodeId, inheritedStatus, key);
      if (status === state.filter) return val;
      if (!val || typeof val !== 'object') return undefined;
      if (Array.isArray(val)) {
        const items = val
          .map((item, idx) => filterVal(item, '', `${path}[${idx}]`, nodeId, status))
          .filter((x) => x !== undefined);
        return items.length ? items : undefined;
      }
      const out = {};
      for (const [k, v] of Object.entries(val)) {
        const p = path ? `${path}.${k}` : k;
        const fv = filterVal(v, k, p, nodeId, status);
        if (fv !== undefined) out[k] = fv;
      }
      return Object.keys(out).length ? out : undefined;
    }
    return filterVal(state.spec, '', '', null, null) || {};
  }

  /** Build structured rendered lines for YAML view. */
  function buildYamlLines(root) {
    const lines = [];
    const emit = (indent, html, meta) => {
      lines.push({ lineNo: lines.length + 1, indent, html, ...meta });
    };

    function walkObject(obj, basePath, indent, inheritedNodeId, inheritedStatus) {
      const entries = Object.entries(obj);
      for (const [k, v] of entries) {
        const path = basePath ? `${basePath}.${k}` : k;
        if (!matchesFilter(k, v, path, inheritedNodeId, inheritedStatus)) continue;
        const { nodeId, status } = resolveLink(path, v, inheritedNodeId, inheritedStatus, k);
        const keyHtml = `<span class="syn-key">${esc(formatKey(k))}</span><span class="syn-punc">:</span>`;
        const badge = (indent === 0 || (v && typeof v === 'object' && (v.nodeId || v.node_id || linkMap.has(path)))) && status
          ? `<span class="spec-badge" data-status="${status}">${STATUS_LABELS[status]}</span>`
          : '';

        if (isInlineValue(v)) {
          const valHtml = Array.isArray(v)
            ? (v.length ? renderInlineArrayHtml(v, 'yaml') : '<span class="syn-punc">[]</span>')
            : (v && typeof v === 'object' ? '<span class="syn-punc">{}</span>' : renderScalarHtml(v, 'yaml'));
          emit(indent, `${keyHtml} ${valHtml}${badge}`, { path, nodeId, status, collapsible: false });
        } else {
          const isCollapsed = state.collapsed.has(path);
          const count = Array.isArray(v) ? `${v.length} items` : `${Object.keys(v).length} keys`;
          const preview = isCollapsed ? ` <span class="syn-dim">{ ${count} }</span>` : '';
          emit(indent, `${keyHtml}${preview}${badge}`, { path, nodeId, status, collapsible: true, collapsed: isCollapsed });
          if (!isCollapsed) {
            if (Array.isArray(v)) walkArray(v, path, indent + 1, nodeId, status);
            else walkObject(v, path, indent + 1, nodeId, status);
          }
        }
      }
    }

    function walkArray(arr, basePath, indent, inheritedNodeId, inheritedStatus) {
      arr.forEach((item, idx) => {
        const path = `${basePath}[${idx}]`;
        if (!matchesFilter('', item, path, inheritedNodeId, inheritedStatus)) return;
        const { nodeId, status } = resolveLink(path, item, inheritedNodeId, inheritedStatus, '');
        if (isPrimitive(item)) {
          emit(indent, `<span class="syn-punc">-</span> ${renderScalarHtml(item, 'yaml')}`, { path, nodeId, status, collapsible: false });
        } else if (Array.isArray(item)) {
          const isCollapsed = state.collapsed.has(path);
          emit(indent, `<span class="syn-punc">-</span>${isCollapsed ? ` <span class="syn-dim">[ ${item.length} ]</span>` : ''}`, {
            path, nodeId, status, collapsible: true, collapsed: isCollapsed,
          });
          if (!isCollapsed) walkArray(item, path, indent + 1, nodeId, status);
        } else {
          const entries = Object.entries(item);
          if (!entries.length) {
            emit(indent, `<span class="syn-punc">- {}</span>`, { path, nodeId, status, collapsible: false });
            return;
          }
          const isCollapsed = state.collapsed.has(path);
          const [k0, v0] = entries[0];
          const p0 = `${path}.${k0}`;
          const badge = (item.nodeId || item.node_id || linkMap.has(path)) && status
            ? `<span class="spec-badge" data-status="${status}">${STATUS_LABELS[status]}</span>`
            : '';
          if (isCollapsed) {
            const label = isPrimitive(v0) ? ` ${renderScalarHtml(v0, 'yaml')}` : '';
            emit(indent, `<span class="syn-punc">-</span> <span class="syn-key">${esc(formatKey(k0))}</span><span class="syn-punc">:</span>${label} <span class="syn-dim">… ${entries.length} keys</span>${badge}`, {
              path, nodeId, status, collapsible: true, collapsed: true,
            });
            return;
          }
          if (isInlineValue(v0)) {
            const v0Html = Array.isArray(v0)
              ? (v0.length ? renderInlineArrayHtml(v0, 'yaml') : '<span class="syn-punc">[]</span>')
              : (v0 && typeof v0 === 'object' ? '<span class="syn-punc">{}</span>' : renderScalarHtml(v0, 'yaml'));
            emit(indent, `<span class="syn-punc">-</span> <span class="syn-key">${esc(formatKey(k0))}</span><span class="syn-punc">:</span> ${v0Html}${badge}`, {
              path, nodeId, status, collapsible: entries.length > 1, collapsed: false,
            });
          } else {
            emit(indent, `<span class="syn-punc">-</span> <span class="syn-key">${esc(formatKey(k0))}</span><span class="syn-punc">:</span>${badge}`, {
              path, nodeId, status, collapsible: true, collapsed: false,
            });
            if (Array.isArray(v0)) walkArray(v0, p0, indent + 2, nodeId, status);
            else walkObject(v0, p0, indent + 2, nodeId, status);
          }
          for (let j = 1; j < entries.length; j++) {
            const [kj, vj] = entries[j];
            const pj = `${path}.${kj}`;
            const childLink = resolveLink(pj, vj, nodeId, status, kj);
            if (isInlineValue(vj)) {
              const vjHtml = Array.isArray(vj)
                ? (vj.length ? renderInlineArrayHtml(vj, 'yaml') : '<span class="syn-punc">[]</span>')
                : (vj && typeof vj === 'object' ? '<span class="syn-punc">{}</span>' : renderScalarHtml(vj, 'yaml'));
              emit(indent + 1, `<span class="syn-key">${esc(formatKey(kj))}</span><span class="syn-punc">:</span> ${vjHtml}`, {
                path: pj, nodeId: childLink.nodeId, status: childLink.status, collapsible: false,
              });
            } else {
              const cCol = state.collapsed.has(pj);
              emit(indent + 1, `<span class="syn-key">${esc(formatKey(kj))}</span><span class="syn-punc">:</span>${cCol ? ' <span class="syn-dim">{ … }</span>' : ''}`, {
                path: pj, nodeId: childLink.nodeId, status: childLink.status, collapsible: true, collapsed: cCol,
              });
              if (!cCol) {
                if (Array.isArray(vj)) walkArray(vj, pj, indent + 2, childLink.nodeId, childLink.status);
                else walkObject(vj, pj, indent + 2, childLink.nodeId, childLink.status);
              }
            }
          }
        }
      });
    }

    if (root && typeof root === 'object') {
      if (Array.isArray(root)) walkArray(root, '', 0, null, null);
      else walkObject(root, '', 0, null, null);
    }
    return lines;
  }

  /** Build structured rendered lines for JSON view. */
  function buildJsonLines(root) {
    const lines = [];
    const emit = (indent, html, meta) => {
      lines.push({ lineNo: lines.length + 1, indent, html, ...meta });
    };

    function walk(val, path, keyLabel, indent, isLast, inheritedNodeId, inheritedStatus) {
      const comma = isLast ? '' : '<span class="syn-punc">,</span>';
      const prefix = keyLabel !== null
        ? `<span class="syn-key">${esc(JSON.stringify(keyLabel))}</span><span class="syn-punc">: </span>`
        : '';
      const { nodeId, status } = resolveLink(path, val, inheritedNodeId, inheritedStatus, keyLabel || '');

      if (isInlineValue(val)) {
        const valHtml = Array.isArray(val)
          ? (val.length ? renderInlineArrayHtml(val, 'json') : '<span class="syn-punc">[]</span>')
          : (val && typeof val === 'object' ? '<span class="syn-punc">{}</span>' : renderScalarHtml(val, 'json'));
        emit(indent, `${prefix}${valHtml}${comma}`, { path, nodeId, status, collapsible: false });
        return;
      }

      const isArr = Array.isArray(val);
      const open = isArr ? '[' : '{';
      const close = isArr ? ']' : '}';
      const isCollapsed = state.collapsed.has(path);
      const badge = (indent === 1 || (val && typeof val === 'object' && (val.nodeId || val.node_id || linkMap.has(path)))) && status
        ? `<span class="spec-badge" data-status="${status}">${STATUS_LABELS[status]}</span>`
        : '';

      if (isCollapsed) {
        const count = isArr ? val.length : Object.keys(val).length;
        emit(indent, `${prefix}<span class="syn-punc">${open}</span> <span class="syn-dim">… ${count}</span> <span class="syn-punc">${close}</span>${comma}${badge}`, {
          path, nodeId, status, collapsible: true, collapsed: true,
        });
        return;
      }

      emit(indent, `${prefix}<span class="syn-punc">${open}</span>${badge}`, {
        path, nodeId, status, collapsible: Boolean(path), collapsed: false,
      });

      if (isArr) {
        const vis = val.map((item, idx) => ({ item, idx, p: `${path}[${idx}]` }))
          .filter(({ item, p }) => matchesFilter('', item, p, nodeId, status));
        vis.forEach(({ item, p }, i) => walk(item, p, null, indent + 1, i === vis.length - 1, nodeId, status));
      } else {
        const vis = Object.entries(val)
          .map(([k, v]) => ({ k, v, p: path ? `${path}.${k}` : k }))
          .filter(({ k, v, p }) => matchesFilter(k, v, p, nodeId, status));
        vis.forEach(({ k, v, p }, i) => walk(v, p, k, indent + 1, i === vis.length - 1, nodeId, status));
      }

      emit(indent, `<span class="syn-punc">${close}</span>${comma}`, { path, nodeId, status, collapsible: false });
    }

    if (root && typeof root === 'object') {
      walk(root, '', null, 0, true, null, null);
    }
    return lines;
  }

  /** Render the syntax-highlighted YAML/JSON code lines. */
  function renderCode() {
    if (!codeEl) return;
    const lines = state.format === 'json' ? buildJsonLines(state.spec) : buildYamlLines(state.spec);
    if (!lines.length) {
      codeEl.innerHTML = `<div class="spec-empty">No ${esc(state.filter)} entries in current assembly specification.</div>`;
      return;
    }

    const activePath = state.selectedPath;
    const activeNode = state.selectedNodeId;
    const html = lines.map((ln) => {
      const isDirectMatch = Boolean(activePath && (ln.path === activePath || (ln.path && ln.path.startsWith(`${activePath}.`))));
      const isNodeMatch = Boolean(!activePath && activeNode && ln.nodeId === activeNode);
      const isActive = isDirectMatch || isNodeMatch;
      const isFlashed = Boolean(state.flashedPath && ln.path === state.flashedPath);
      const cls = [
        'spec-line',
        ln.nodeId ? 'linked' : '',
        isActive ? 'active' : '',
        isFlashed ? 'flashed' : '',
      ].filter(Boolean).join(' ');
      const foldBtn = ln.collapsible
        ? `<button type="button" class="spec-fold" data-fold-path="${esc(ln.path)}" aria-label="${ln.collapsed ? 'Expand' : 'Collapse'} ${esc(ln.path)}">${ln.collapsed ? '▸' : '▾'}</button>`
        : '<span class="spec-fold-spacer"></span>';
      return `<div class="${cls}" data-spec-path="${esc(ln.path || '')}"${ln.nodeId ? ` data-node-id="${esc(ln.nodeId)}"` : ''}${ln.status ? ` data-status="${ln.status}"` : ''}>` +
        `<span class="spec-ln">${ln.lineNo}</span>` +
        `${foldBtn}` +
        `<span class="spec-code" style="--ind:${ln.indent}">${ln.html}</span>` +
        `</div>`;
    }).join('');
    codeEl.innerHTML = html;

    if (statusEl) {
      const modeLabel = state.format.toUpperCase();
      const filterLabel = state.filter === 'all' ? 'Full DNA' : STATUS_LABELS[state.filter];
      statusEl.textContent = `${modeLabel} · ${filterLabel} · ${lines.length} lines`;
    }
  }

  /** Render the Engineer-Provided Options bar. */
  function renderOptions() {
    if (!optionsEl) return;
    if (!state.options.length) {
      optionsEl.hidden = true;
      return;
    }
    optionsEl.hidden = false;
    const rows = state.options.map((opt) => {
      const id = `opt_${opt.key}`;
      if (opt.type === 'toggle') {
        const checked = Boolean(opt.value);
        return `<div class="opt-row" data-option-key="${esc(opt.key)}">` +
          `<span class="opt-lbl">${esc(opt.label)}</span>` +
          `<button type="button" class="opt-toggle${checked ? ' on' : ''}" id="${id}" data-option-key="${esc(opt.key)}" aria-pressed="${checked}">${checked ? 'ON' : 'OFF'}</button>` +
          `</div>`;
      }
      if (opt.type === 'segmented' && Array.isArray(opt.choices)) {
        const btns = opt.choices.map((ch) => (
          `<button type="button" class="${ch.value === opt.value ? 'on' : ''}" data-option-key="${esc(opt.key)}" data-option-val="${esc(ch.value)}">${esc(ch.label)}</button>`
        )).join('');
        return `<div class="opt-row opt-row-stack" data-option-key="${esc(opt.key)}">` +
          `<span class="opt-lbl">${esc(opt.label)}</span>` +
          `<div class="seg seg-compact">${btns}</div>` +
          `</div>`;
      }
      if (opt.type === 'select' && Array.isArray(opt.choices)) {
        const optsHtml = opt.choices.map((ch) => (
          `<option value="${esc(ch.value)}"${ch.value === opt.value ? ' selected' : ''}>${esc(ch.label)}</option>`
        )).join('');
        return `<div class="opt-row" data-option-key="${esc(opt.key)}">` +
          `<label class="opt-lbl" for="${id}">${esc(opt.label)}</label>` +
          `<select class="opt-select" id="${id}" data-option-key="${esc(opt.key)}">${optsHtml}</select>` +
          `</div>`;
      }
      if (opt.type === 'range') {
        const min = opt.min ?? 0, max = opt.max ?? 100, step = opt.step ?? 1;
        const unit = opt.unit || '';
        return `<div class="opt-row opt-row-stack" data-option-key="${esc(opt.key)}">` +
          `<div class="opt-range-head"><label class="opt-lbl" for="${id}">${esc(opt.label)}</label><span class="opt-val" id="${id}_val">${esc(opt.value)}${esc(unit)}</span></div>` +
          `<input type="range" id="${id}" data-option-key="${esc(opt.key)}" min="${min}" max="${max}" step="${step}" value="${esc(opt.value)}">` +
          `</div>`;
      }
      return '';
    }).join('');
    optionsEl.innerHTML = `<div class="opt-head"><span class="spec-badge" data-status="engineer_input">ENG INPUT</span><span>Live Parameters</span></div><div class="opt-list">${rows}</div>`;
  }

  /* ---------------- event wiring ---------------- */
  if (formatSegEl) {
    formatSegEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-format]');
      if (!btn) return;
      setFormat(btn.dataset.format);
    });
  }

  if (filterSegEl) {
    filterSegEl.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-filter]');
      if (!btn) return;
      setFilter(btn.dataset.filter);
    });
  }

  if (copyBtnEl) {
    copyBtnEl.addEventListener('click', async () => {
      const filtered = getFilteredSpec();
      const text = state.format === 'json'
        ? JSON.stringify(filtered, null, 2)
        : toPlainYAML(filtered);
      let ok = false;
      try {
        if (navigator.clipboard?.writeText) {
          await navigator.clipboard.writeText(text);
          ok = true;
        }
      } catch { /* fallback below */ }
      if (!ok) {
        const ta = document.createElement('textarea');
        ta.value = text;
        ta.style.cssText = 'position:fixed;left:-9999px;top:0';
        document.body.appendChild(ta);
        ta.select();
        try { document.execCommand('copy'); ok = true; } catch { /* noop */ }
        ta.remove();
      }
      const prev = copyBtnEl.textContent;
      copyBtnEl.textContent = ok ? 'Copied' : 'Copy failed';
      setTimeout(() => { copyBtnEl.textContent = prev; }, 1200);
    });
  }

  if (codeEl) {
    codeEl.addEventListener('click', (e) => {
      const fold = e.target.closest('.spec-fold');
      if (fold) {
        e.stopPropagation();
        const p = fold.dataset.foldPath;
        if (state.collapsed.has(p)) state.collapsed.delete(p);
        else state.collapsed.add(p);
        renderCode();
        return;
      }
      const row = e.target.closest('.spec-line');
      if (!row) return;
      const path = row.dataset.specPath || null;
      const nodeId = row.dataset.nodeId || null;
      state.selectedPath = path;
      state.selectedNodeId = nodeId;
      renderCode();
      onSelectSpec({ path, nodeId, focusCamera: e.detail >= 2 });
    });
  }

  if (optionsEl) {
    optionsEl.addEventListener('click', (e) => {
      const tog = e.target.closest('.opt-toggle');
      if (tog) {
        const key = tog.dataset.optionKey;
        const opt = state.options.find((o) => o.key === key);
        if (!opt) return;
        applyOption(key, !opt.value);
        return;
      }
      const segBtn = e.target.closest('button[data-option-val]');
      if (segBtn) {
        applyOption(segBtn.dataset.optionKey, segBtn.dataset.optionVal);
      }
    });
    optionsEl.addEventListener('change', (e) => {
      const sel = e.target.closest('select[data-option-key]');
      if (sel) applyOption(sel.dataset.optionKey, sel.value);
    });
    optionsEl.addEventListener('input', (e) => {
      const rng = e.target.closest('input[type="range"][data-option-key]');
      if (rng) applyOption(rng.dataset.optionKey, +rng.value);
    });
  }

  function applyOption(key, value) {
    const opt = state.options.find((o) => o.key === key);
    if (!opt) return;
    opt.value = value;
    if (opt.specPath) {
      setAtPath(state.spec, opt.specPath, value);
      flashPath(opt.specPath);
    }
    renderOptions();
    renderCode();
    onOptionChange(key, value, opt);
  }

  function flashPath(path) {
    state.flashedPath = path;
    if (flashTimer) clearTimeout(flashTimer);
    flashTimer = setTimeout(() => {
      state.flashedPath = null;
      renderCode();
    }, 1100);
  }

  function expandAncestors(path) {
    if (!path) return;
    const parts = path.split('.');
    let cur = '';
    for (let i = 0; i < parts.length; i++) {
      cur = cur ? `${cur}.${parts[i]}` : parts[i];
      state.collapsed.delete(cur);
    }
  }

  function setFormat(fmt) {
    const next = fmt === 'json' ? 'json' : 'yaml';
    state.format = next;
    if (formatSegEl) {
      formatSegEl.querySelectorAll('button[data-format]').forEach((b) => {
        b.classList.toggle('on', b.dataset.format === next);
      });
    }
    renderCode();
    onFormatChange(next);
  }

  function setFilter(filter) {
    const allowed = new Set(['all', 'locked', 'engineer_input', 'buyout']);
    const next = allowed.has(filter) ? filter : 'all';
    state.filter = next;
    if (filterSegEl) {
      filterSegEl.querySelectorAll('button[data-filter]').forEach((b) => {
        b.classList.toggle('on', b.dataset.filter === next);
      });
    }
    renderCode();
    onFilterChange(next);
  }

  function setSpec(nextSpec, { flash = null } = {}) {
    state.spec = nextSpec || {};
    if (flash) flashPath(flash);
    renderCode();
  }

  function setOptionValue(key, value, { silent = false } = {}) {
    const opt = state.options.find((o) => o.key === key);
    if (!opt) return;
    opt.value = value;
    if (opt.specPath) {
      setAtPath(state.spec, opt.specPath, value);
      flashPath(opt.specPath);
    }
    renderOptions();
    renderCode();
    if (!silent) onOptionChange(key, value, opt);
  }

  function highlight({ nodeId = null, specPath = null, scroll = true } = {}) {
    let targetPath = specPath || null;
    if (!targetPath && nodeId && nodeToPaths.has(nodeId)) {
      targetPath = nodeToPaths.get(nodeId)[0] || null;
    }
    state.selectedNodeId = nodeId || null;
    state.selectedPath = targetPath;
    if (targetPath) expandAncestors(targetPath);
    renderCode();
    if (scroll && codeEl && (targetPath || nodeId)) {
      const sel = targetPath
        ? `.spec-line[data-spec-path="${CSS.escape(targetPath)}"]`
        : `.spec-line[data-node-id="${CSS.escape(nodeId)}"]`;
      const row = codeEl.querySelector(sel);
      if (row) row.scrollIntoView({ block: 'center', behavior: 'smooth' });
    }
  }

  function getRawText() {
    const filtered = getFilteredSpec();
    return state.format === 'json' ? JSON.stringify(filtered, null, 2) : toPlainYAML(filtered);
  }

  renderOptions();
  renderCode();

  return {
    state,
    setFormat,
    setFilter,
    setSpec,
    setOptionValue,
    highlight,
    renderCode,
    renderOptions,
    getRawText,
  };
}
