/* =========================================================================
   Inkworks: 3D Engineering Intent Workbench Shell
   Owns the 5-pillar CAD workbench layout (sheet & figure), hierarchical
   assembly tree UI, granular nested subsystem timeline, interactive
   standards-badged callouts, exploded view controls, camera presets,
   live YAML/JSON inspector binding, and idle-render throttling.
   ========================================================================= */
import {
  makeKit, THREE, D2R, clamp01,
  INK_HEX, PAPER_HEX, ACCENT_HEX, HUES, theme, themeId, inkA,
} from './kit.js';
import { createInspector, normalizeStatus, setAtPath } from './inspector.js';

const $ = (id) => document.getElementById(id);
const h = (html) => {
  const t = document.createElement('template');
  t.innerHTML = html.trim();
  return t.content.firstChild;
};
const esc = (s) => String(s ?? '').replace(/[&<>"]/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));

const ICON = {
  prev: '<svg viewBox="0 0 24 24"><path d="M6 5v14M19 5 9 12l10 7z"/></svg>',
  next: '<svg viewBox="0 0 24 24"><path d="M18 5v14M5 5l10 7-10 7z"/></svg>',
  pause: '<svg viewBox="0 0 24 24" class="i-pause"><path d="M8 5v14M16 5v14"/></svg>',
  play: '<svg viewBox="0 0 24 24" class="i-play"><path d="M7 5l12 7-12 7z"/></svg>',
};

const BUILTIN_THEMES = [
  { id: 'creo', label: 'Creo' },
  { id: 'drafting', label: 'Drafting' },
  { id: 'blueprint', label: 'Blueprint' },
  { id: 'patent', label: 'Patent' },
];

const CAMERA_PRESETS = [
  { id: 'iso', label: 'Iso' },
  { id: 'front', label: 'Front' },
  { id: 'side', label: 'Side' },
  { id: 'top', label: 'Top' },
  { id: 'reset', label: 'Reset' },
];

// Expose theme red hue token for buyout badges/callouts across all themes
if (theme?.hues?.red) {
  document.documentElement.style.setProperty('--red', theme.hues.red);
}

/** Normalize stages into contiguous [t0, t1] ranges over [0, 1]. */
function normalizeStages(rawStages = []) {
  const list = rawStages.length ? rawStages : [{
    id: 'overview', name: 'Assembly Overview', short: 'Overview',
    color: HUES.blue, summary: 'Complete 3D engineering assembly.',
  }];
  const n = list.length;
  return list.map((s, idx) => {
    const t0 = Array.isArray(s.range) ? clamp01(s.range[0]) : idx / n;
    const t1 = Array.isArray(s.range) ? clamp01(s.range[1]) : (idx + 1) / n;
    return {
      ...s,
      idx,
      id: s.id || `stage_${idx}`,
      name: s.name || `Stage ${idx + 1}`,
      short: s.short || s.name || `S${idx + 1}`,
      color: s.color || [HUES.blue, HUES.ochre, HUES.red, HUES.grey][idx % 4],
      summary: s.summary || s.text || '',
      t0,
      t1: Math.max(t1, t0 + 0.001),
    };
  });
}

/** Resolve active stage index for normalized timeline t in [0, 1]. */
function stageIndexAt(t, stages) {
  const x = clamp01(t);
  for (let i = stages.length - 1; i >= 0; i--) {
    if (x >= stages[i].t0 - 1e-6) return i;
  }
  return 0;
}

/** Create a lightweight fallback tree adapter if an assembly does not return a kit AssemblyTree. */
function makeFallbackTree(root) {
  const nodes = [];
  const byId = new Map();
  if (root) {
    const id = root.userData?.id || root.name || 'assembly_root';
    const n = {
      id, name: root.userData?.name || root.name || 'Assembly', kind: 'assembly',
      parentId: null, children: [], object3d: root, visible: true, ghost: false,
      standardStatus: 'locked', explode: 0,
    };
    nodes.push(n);
    byId.set(id, n);
  }
  return {
    getNodes: () => nodes,
    getRoots: () => nodes.filter((n) => !n.parentId),
    getNode: (id) => byId.get(id) || null,
    getChildren: (id) => byId.get(id)?.children || [],
    setVisible(id, v) { const n = byId.get(id); if (n) { n.visible = v; if (n.object3d) n.object3d.visible = v; } },
    setGhost(id, g) { const n = byId.get(id); if (n) n.ghost = g; },
    isolate() {},
    highlight() {},
    hover() {},
    setExplode() {},
    setTracesVisible() {},
    resetStates() {},
    evaluateTimeline() {},
    getExplodedBounds(box) { return box ? box.setFromObject(root) : new THREE.Box3().setFromObject(root); },
  };
}

export async function createSheet(assembly, { layout: forcedLayout } = {}) {
  const q = new URLSearchParams(location.search);
  const meta = assembly.meta || {};
  const layoutName = forcedLayout || q.get('layout') || document.body.dataset.layout || meta.layout || 'sheet';
  document.body.dataset.layout = layoutName;
  const figure = layoutName === 'figure';

  const stages = normalizeStages(assembly.stages);
  document.documentElement.style.setProperty('--n-stages', String(stages.length));
  stages.forEach((s, k) => document.documentElement.style.setProperty(`--st${k}`, s.color));
  if (meta.pageTitle) document.title = meta.pageTitle;
  else if (meta.title) document.title = `${meta.title.replace(/<[^>]+>/g, '')} | Inkworks`;

  // Load companion JSON spec if assembly specifies specUrl
  let fetchedSpec = null;
  if (assembly.specUrl) {
    try {
      const resp = await fetch(assembly.specUrl, { cache: 'no-store' });
      if (resp.ok) fetchedSpec = await resp.json();
    } catch (e) {
      console.warn('Inkworks: could not fetch specUrl', assembly.specUrl, e);
    }
  }

  /* ---------------- state ---------------- */
  const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const layerDefs = buildLayerDefs(assembly.layers);
  const layers = {};
  layerDefs.forEach((l) => { layers[l.key] = l.on !== false; });

  const optionDefs = (assembly.options || []).map((o) => ({ ...o }));
  const options = {};
  optionDefs.forEach((o) => { options[o.key] = o.value; });

  const state = {
    t: clamp01(assembly.start ?? 0),
    stageIndex: 0,
    stageId: stages[0].id,
    playing: !reduceMotion && q.get('play') === '1',
    explode: clamp01(assembly.initialExplode ?? 0),
    explodeScope: 'all',          // 'all' | 'selected'
    selectedNodeId: null,
    selectedSpecPath: null,
    hoveredNodeId: null,
    isolatedNodeId: null,
    layers,
    options,
    tween: null,                  // timeline tween { from, to, t, dur }
    explodeTween: null,           // explode tween { from, to, t, dur, scopeId }
    scrubbing: false,
    format: 'yaml',
    filter: 'all',
    assembly: {},                 // assembly-private scratch state
  };
  state.stageIndex = stageIndexAt(state.t, stages);
  state.stageId = stages[state.stageIndex].id;

  const api = {
    state,
    stages,
    spec: fetchedSpec,
    stageIndexAt: (t = state.t) => stageIndexAt(t, stages),
    requestRender: () => { wake = true; },
  };

  /* ---------------- DOM ---------------- */
  buildDom(assembly, stages, layerDefs, figure);

  /* ---------------- 3D ---------------- */
  const stageEl = $('stage');
  const canvasEl = $('gl');
  const kit = makeKit(canvasEl);
  const { renderer, scene, camera, controls } = kit;
  const V = assembly.view || {};
  const TARGET = new THREE.Vector3(...(V.target || [0, 0.8, 0]));
  const VIEW_DIR = new THREE.Vector3(...(V.dir || [0.65, 0.42, 0.72])).normalize();
  controls.target.copy(TARGET);
  controls.minDistance = V.minDist ?? 1.5;
  controls.maxDistance = V.maxDist ?? 32;

  const model = (await assembly.build(kit, api)) || {};
  if (model.root && !model.root.parent) scene.add(model.root);

  const tree = model.tree
    || (kit.createAssemblyTree && model.root ? kit.createAssemblyTree({ root: model.root, stages }) : makeFallbackTree(model.root));
  if (tree.setStages && stages.length) tree.setStages(stages);

  let activeSpec = model.spec || fetchedSpec || {};
  // Sync initial options into spec if specPath is set
  for (const opt of optionDefs) {
    if (opt.specPath && activeSpec) {
      const cur = opt.value;
      if (cur !== undefined) setAtPath(activeSpec, opt.specPath, cur);
    }
  }

  /* ---------------- link maps (Node <-> SpecPath <-> Callout) ---------------- */
  const linkMap = new Map();       // specPath -> { nodeId, status }
  const nodeToPaths = new Map();   // nodeId -> [specPath]
  const registerLink = (specPath, nodeId, status) => {
    if (!specPath) return;
    const norm = normalizeStatus(status);
    if (!linkMap.has(specPath) || (nodeId && !linkMap.get(specPath).nodeId)) {
      linkMap.set(specPath, { nodeId: nodeId || null, status: norm });
    }
    if (nodeId) {
      const arr = nodeToPaths.get(nodeId) || [];
      if (!arr.includes(specPath)) arr.push(specPath);
      nodeToPaths.set(nodeId, arr);
    }
  };

  const allTreeNodes = tree.getNodes ? tree.getNodes() : [];
  allTreeNodes.forEach((n) => registerLink(n.specPath, n.id, n.standardStatus));
  const CALLOUTS = (model.callouts || []).map((c, idx) => ({
    n: c.n ?? (idx + 1),
    id: c.id || `callout_${idx + 1}`,
    nodeId: c.nodeId || null,
    specPath: c.specPath || null,
    name: c.name || `Item ${idx + 1}`,
    spec: c.spec || '',
    status: normalizeStatus(c.status) || 'locked',
    compact: c.compact !== false,
    stage: c.stage ?? null,
    at: c.at,
    show: c.show,
  }));
  CALLOUTS.forEach((c) => registerLink(c.specPath, c.nodeId, c.status));

  /* ---------------- wake / idle-render throttling ---------------- */
  const SETTLE = 1.5;
  let quiet = 0;
  let lastSig = '';
  let wake = true;
  let treeRev = 0;
  let scopedExplodeNodeId = null;
  const requestWake = () => { wake = true; };
  controls.addEventListener('start', requestWake);
  controls.addEventListener('change', requestWake);
  addEventListener('resize', requestWake);
  tree.onChange?.(() => { treeRev += 1; wake = true; });
  kit.materials?.onChange?.(() => { treeRev += 1; wake = true; });

  /* ---------------- Inspector (Right Companion Panel) ---------------- */
  let inspector = null;
  if (!figure) {
    inspector = createInspector({
      codeEl: $('specCode'),
      optionsEl: $('optionsBar'),
      formatSegEl: $('inspectorFormat'),
      filterSegEl: $('inspectorFilters'),
      copyBtnEl: $('inspectorCopy'),
      statusEl: $('specMetaStatus'),
      spec: activeSpec,
      options: optionDefs,
      linkMap,
      nodeToPaths,
      onSelectSpec({ path, nodeId, focusCamera }) {
        state.selectedSpecPath = path;
        if (nodeId) {
          selectNode(nodeId, { specPath: path, focusCamera, scrollSpec: false });
        } else {
          requestWake();
        }
      },
      onOptionChange(key, value) {
        applyOptionChange(key, value, { fromInspector: true });
      },
      onFormatChange(fmt) {
        state.format = fmt;
      },
      onFilterChange(flt) {
        state.filter = flt;
      },
    });
  }

  function applyOptionChange(key, value, { fromInspector = false } = {}) {
    state.options[key] = value;
    const def = optionDefs.find((o) => o.key === key);
    if (def) def.value = value;
    if (def?.specPath && activeSpec) setAtPath(activeSpec, def.specPath, value);

    const updated = model.onOptionChange?.(key, value, state, activeSpec);
    if (updated && typeof updated === 'object') activeSpec = updated;

    if (inspector) {
      if (!fromInspector) inspector.setOptionValue(key, value, { silent: true });
      inspector.setSpec(activeSpec, { flash: def?.specPath || null });
    }
    tree.apply?.();
    renderTree();
    requestWake();
  }

  /* ---------------- Hierarchical Assembly Tree UI ---------------- */
  const treeEl = $('assemblyTree');
  const expandedNodes = new Set();
  // Expand root assembly and top-level subassemblies by default
  const treeRoots = tree.getRoots ? tree.getRoots() : allTreeNodes.filter((n) => !n.parentId);
  treeRoots.forEach((r) => expandedNodes.add(r.id));

  function expandAncestorsOf(nodeId) {
    let cur = tree.getNode?.(nodeId);
    while (cur && cur.parentId) {
      expandedNodes.add(cur.parentId);
      cur = tree.getNode?.(cur.parentId);
    }
  }

  function renderTree() {
    if (!treeEl) return;
    const roots = tree.getRoots ? tree.getRoots() : [];
    const rows = [];

    function walk(node, depth) {
      const children = (tree.getChildren ? tree.getChildren(node.id) : node.children) || [];
      const hasKids = children.length > 0;
      const isExp = expandedNodes.has(node.id);
      const isSel = state.selectedNodeId === node.id;
      const isHidden = node.visible === false;
      const isGhost = node.ghost === true;
      const isIso = state.isolatedNodeId === node.id;
      const status = normalizeStatus(node.standardStatus) || 'locked';
      const code = node.erpCode || node.materialCode || '';

      const cls = [
        'tree-node',
        isSel ? 'selected' : '',
        isHidden ? 'hidden-node' : '',
        isGhost ? 'ghosted' : '',
        isIso ? 'isolated' : '',
      ].filter(Boolean).join(' ');

      rows.push(
        `<div class="${cls}" data-node-id="${esc(node.id)}" data-kind="${esc(node.kind || 'part')}" style="--depth:${depth}">` +
          `<button type="button" class="tree-expand${hasKids ? '' : ' leaf'}" data-act="expand" aria-label="${isExp ? 'Collapse' : 'Expand'} ${esc(node.name)}">${isExp ? '▾' : '▸'}</button>` +
          `<span class="status-dot" data-status="${status}" title="${status}"></span>` +
          `<span class="tree-label" title="${esc(node.name)}">${esc(node.name)}</span>` +
          (code ? `<span class="tree-code" title="${esc(code)}">${esc(code)}</span>` : '') +
          `<span class="tree-acts">` +
            `<button type="button" class="tree-act tree-vis${isHidden ? ' off' : ''}" data-act="vis" title="${isHidden ? 'Show' : 'Hide'}" aria-label="Toggle visibility ${esc(node.name)}">${isHidden ? '–' : 'V'}</button>` +
            `<button type="button" class="tree-act tree-ghost" data-act="ghost" title="Ghost / Cutaway" aria-label="Toggle ghost ${esc(node.name)}">G</button>` +
            `<button type="button" class="tree-act tree-iso" data-act="iso" title="Isolate" aria-label="Isolate ${esc(node.name)}">I</button>` +
          `</span>` +
        `</div>`
      );
      if (hasKids && isExp) {
        children.forEach((child) => walk(typeof child === 'string' ? tree.getNode(child) : child, depth + 1));
      }
    }

    roots.forEach((r) => walk(r, 0));
    treeEl.innerHTML = rows.join('');
  }

  if (treeEl) {
    treeEl.addEventListener('click', (e) => {
      const row = e.target.closest('.tree-node');
      if (!row) return;
      const nodeId = row.dataset.nodeId;
      const btn = e.target.closest('button[data-act]');
      if (btn) {
        e.stopPropagation();
        const act = btn.dataset.act;
        if (act === 'expand') {
          if (expandedNodes.has(nodeId)) expandedNodes.delete(nodeId);
          else expandedNodes.add(nodeId);
          renderTree();
          renderTimeline();
          return;
        }
        if (act === 'vis') {
          const n = tree.getNode?.(nodeId);
          setNodeVisibility(nodeId, n ? n.visible === false : true);
          return;
        }
        if (act === 'ghost') {
          const n = tree.getNode?.(nodeId);
          setNodeGhost(nodeId, n ? !n.ghost : true);
          return;
        }
        if (act === 'iso') {
          isolateNode(state.isolatedNodeId === nodeId ? null : nodeId);
          return;
        }
      }
      selectNode(nodeId, { focusCamera: e.detail >= 2, scrollSpec: true });
    });
  }

  $('treeResetBtn')?.addEventListener('click', () => {
    state.isolatedNodeId = null;
    state.selectedNodeId = null;
    state.selectedSpecPath = null;
    state.explodeScope = 'all';
    tree.resetStates?.();
    tree.setExplode?.(state.explode, null);
    updateScopeButton();
    renderTree();
    renderTimeline();
    updateCalloutSelectionClasses();
    inspector?.highlight({ nodeId: null, specPath: null, scroll: false });
    requestWake();
  });

  /* ---------------- Node Selection / Visibility / Ghost / Isolate ---------------- */
  function setNodeVisibility(nodeId, visible) {
    tree.setVisible?.(nodeId, visible, { recursive: true });
    tree.apply?.();
    renderTree();
    requestWake();
  }

  function setNodeGhost(nodeId, ghosted) {
    tree.setGhost?.(nodeId, ghosted, { recursive: true });
    tree.apply?.();
    renderTree();
    requestWake();
  }

  function isolateNode(nodeIdOrNull) {
    state.isolatedNodeId = nodeIdOrNull || null;
    tree.isolate?.(state.isolatedNodeId, { mode: 'ghost' });
    tree.apply?.();
    renderTree();
    requestWake();
  }

  function selectNode(nodeId, { specPath = null, focusCamera = false, scrollSpec = true } = {}) {
    state.selectedNodeId = nodeId || null;
    const node = nodeId ? tree.getNode?.(nodeId) : null;
    const resolvedPath = specPath || node?.specPath || (nodeId ? nodeToPaths.get(nodeId)?.[0] : null) || null;
    state.selectedSpecPath = resolvedPath;

    if (nodeId) expandAncestorsOf(nodeId);
    tree.highlight?.(state.selectedNodeId);
    tree.apply?.();
    model.onSelectNode?.(state.selectedNodeId, state);

    if (focusCamera && node && kit.flyToNode) {
      kit.flyToNode(node.object3d || node, { padding: 1.55, duration: 0.65 });
    }

    updateScopeButton();
    renderTree();
    renderTimeline();
    updateCalloutSelectionClasses();

    if (inspector && scrollSpec) {
      inspector.highlight({ nodeId: state.selectedNodeId, specPath: resolvedPath, scroll: true });
    }
    if (treeEl && state.selectedNodeId) {
      const row = treeEl.querySelector(`.tree-node[data-node-id="${CSS.escape(state.selectedNodeId)}"]`);
      if (row) row.scrollIntoView({ block: 'nearest' });
    }
    requestWake();
  }

  function setHoverNode(nodeId) {
    if (state.hoveredNodeId === nodeId) return;
    state.hoveredNodeId = nodeId || null;
    tree.hover?.(state.hoveredNodeId);
    updateCalloutSelectionClasses();
    requestWake();
  }

  /* ---------------- Granular Nested Subsystem Timeline ---------------- */
  const timelineBodyEl = $('timelineTrack');
  const timelinePlayheadEl = $('timelinePlayhead');
  const timelineEl = $('timeline');

  function deriveTimelineRows() {
    if (Array.isArray(model.tracks) && model.tracks.length) return model.tracks;
    const rows = [];
    const roots = tree.getRoots ? tree.getRoots() : [];
    const stageMap = new Map(stages.map((s) => [s.id, s]));

    function visit(node, depth) {
      const children = (tree.getChildren ? tree.getChildren(node.id) : node.children) || [];
      const st = stageMap.get(node.stage) || stages[0];
      const segs = [];
      if (node.kind === 'assembly') {
        stages.forEach((s) => segs.push({ t0: s.t0, t1: s.t1, color: s.color, kind: 'stage' }));
      } else {
        segs.push({ t0: st.t0, t1: 1, color: st.color, kind: 'build' });
        if (node.explodeVec && (node.explodeVec[0] || node.explodeVec[1] || node.explodeVec[2])) {
          const exStage = stages[stages.length - 1];
          segs.push({ t0: exStage.t0, t1: exStage.t1, color: HUES.ochre, kind: 'explode' });
        }
      }
      rows.push({
        nodeId: node.id,
        label: node.name,
        kind: node.kind || 'part',
        status: normalizeStatus(node.standardStatus) || 'locked',
        depth,
        segments: segs,
      });
      // Include subassemblies always, and include parts when parent is selected or expanded (bounded for clarity)
      const showKids = depth === 0 || (depth === 1 && (state.selectedNodeId === node.id || expandedNodes.has(node.id)));
      if (showKids) {
        children.forEach((ch) => {
          const cn = typeof ch === 'string' ? tree.getNode(ch) : ch;
          if (cn) visit(cn, depth + 1);
        });
      }
    }
    roots.forEach((r) => visit(r, 0));
    return rows;
  }

  function renderTimeline() {
    if (!timelineBodyEl) return;
    const rows = deriveTimelineRows();
    timelineBodyEl.innerHTML = rows.map((r) => {
      const isSel = state.selectedNodeId === r.nodeId;
      const segsHtml = (r.segments || []).map((seg) => {
        const left = (clamp01(seg.t0) * 100).toFixed(2);
        const width = Math.max(2, (clamp01(seg.t1) - clamp01(seg.t0)) * 100).toFixed(2);
        const cls = seg.kind === 'explode' ? 'tl-seg explode-seg' : 'tl-seg';
        return `<span class="${cls}" style="left:${left}%;width:${width}%;--seg-c:${seg.color || HUES.blue}"></span>`;
      }).join('');
      return `<div class="tl-row${isSel ? ' selected' : ''}" data-node-id="${esc(r.nodeId)}" data-kind="${esc(r.kind)}" style="--depth:${r.depth}">` +
        `<div class="tl-row-name" title="${esc(r.label)}"><span class="status-dot" data-status="${r.status}"></span>${esc(r.label)}</div>` +
        `<div class="tl-track">${segsHtml}</div>` +
      `</div>`;
    }).join('');
    updateTimelinePlayhead();
  }

  function updateTimelinePlayhead() {
    if (timelinePlayheadEl) {
      timelinePlayheadEl.style.setProperty('--t', clamp01(state.t).toFixed(4));
    }
  }

  // Timeline scrubbing + row selection + axis stage jump
  if (timelineEl) {
    timelineEl.querySelectorAll('.tl-tick').forEach((tick) => {
      tick.addEventListener('click', () => setStage(+tick.dataset.stageIdx));
    });
  }
  if (timelineBodyEl) {
    let scrubWasPlaying = false;
    const gutterWidth = () => (innerWidth <= 960 ? 118 : 156);
    const scrubFromEvent = (e) => {
      const r = timelineBodyEl.getBoundingClientRect();
      const g = gutterWidth();
      const frac = clamp01((e.clientX - r.left - g) / Math.max(1, r.width - g));
      setProgress(frac);
    };
    timelineBodyEl.addEventListener('pointerdown', (e) => {
      const r = timelineBodyEl.getBoundingClientRect();
      const g = gutterWidth();
      if (e.clientX - r.left < g) {
        const row = e.target.closest('.tl-row');
        if (row) selectNode(row.dataset.nodeId, { scrollSpec: true });
        return;
      }
      timelineBodyEl.setPointerCapture(e.pointerId);
      state.scrubbing = true;
      state.tween = null;
      scrubWasPlaying = state.playing;
      setPlaying(false);
      scrubFromEvent(e);
    });
    timelineBodyEl.addEventListener('pointermove', (e) => {
      if (state.scrubbing) scrubFromEvent(e);
    });
    const endScrub = () => {
      if (!state.scrubbing) return;
      state.scrubbing = false;
      if (scrubWasPlaying) setPlaying(true);
      updateStagePanel(true);
    };
    timelineBodyEl.addEventListener('pointerup', endScrub);
    timelineBodyEl.addEventListener('pointercancel', endScrub);
  }

  /* ---------------- Transport & Stage Controls ---------------- */
  const playBtn = $('playBtn');
  function setPlaying(p) {
    state.playing = Boolean(p);
    if (playBtn) {
      playBtn.classList.toggle('paused', !state.playing);
      playBtn.setAttribute('aria-label', state.playing ? 'Pause' : 'Play');
    }
    updateStagePanel(true);
    requestWake();
  }
  playBtn?.addEventListener('click', () => {
    state.tween = null;
    setPlaying(!state.playing);
  });

  function setProgress(t01) {
    state.t = clamp01(t01);
    const idx = stageIndexAt(state.t, stages);
    state.stageIndex = idx;
    state.stageId = stages[idx].id;
    tree.evaluateTimeline?.(state.t, state.stageId);
    updateTimelinePlayhead();
    updateStagePanel();
    requestWake();
  }

  function setStage(indexOrId, { animate = true } = {}) {
    let idx = typeof indexOrId === 'number'
      ? ((indexOrId % stages.length) + stages.length) % stages.length
      : stages.findIndex((s) => s.id === indexOrId);
    if (idx < 0) idx = 0;
    const st = stages[idx];
    const targetT = clamp01(st.t0 + (st.t1 - st.t0) * 0.15);

    setPlaying(false);
    if (animate && Math.abs(targetT - state.t) > 0.002) {
      state.tween = { from: state.t, to: targetT, t: 0, dur: 0.45 };
    } else {
      state.tween = null;
      state.t = targetT;
    }
    state.stageIndex = idx;
    state.stageId = st.id;

    if (typeof st.explode === 'number') {
      setExplode(st.explode, { scope: 'all', animate });
    }
    if (st.cameraPreset) {
      setCameraPreset(st.cameraPreset);
    }
    if (st.focusNode) {
      selectNode(st.focusNode, { specPath: st.specSection || null, focusCamera: false, scrollSpec: true });
    } else if (st.specSection && inspector) {
      inspector.highlight({ specPath: st.specSection, scroll: true });
    }
    updateStagePanel(true);
    requestWake();
  }

  function stepStage(dir) {
    setStage((state.stageIndex + dir + stages.length) % stages.length, { animate: true });
  }

  $('nextBtn')?.addEventListener('click', () => stepStage(1));
  $('prevBtn')?.addEventListener('click', () => stepStage(-1));

  const stageListEls = [...document.querySelectorAll('#stageList li')];
  stageListEls.forEach((li) => {
    li.tabIndex = 0;
    const go = () => setStage(+li.dataset.stageIdx);
    li.addEventListener('click', go);
    li.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); go(); }
    });
  });

  addEventListener('keydown', (e) => {
    if (e.target.closest('input, select, button, textarea, [tabindex]')) return;
    if (e.code === 'Space') { e.preventDefault(); setPlaying(!state.playing); }
    if (e.key === 'ArrowRight') stepStage(1);
    if (e.key === 'ArrowLeft') stepStage(-1);
    if (e.key === 'Escape' && state.selectedNodeId) selectNode(null);
  });

  /* ---------------- Explode Controls (0% - 100%, Global or Scoped) ---------------- */
  const explodeRange = $('explodeRange');
  const explodeValEl = $('explodeVal');
  const explodeScopeBtn = $('explodeScopeBtn');

  function updateScopeButton() {
    if (!explodeScopeBtn) return;
    const canScope = Boolean(state.selectedNodeId);
    if (!canScope) state.explodeScope = 'all';
    const isSel = state.explodeScope === 'selected' && canScope;
    const selName = canScope ? (tree.getNode?.(state.selectedNodeId)?.name || 'Node') : '';
    explodeScopeBtn.classList.toggle('on', isSel);
    explodeScopeBtn.textContent = isSel ? `Scope: ${selName.slice(0, 14)}` : 'Scope: All';
    explodeScopeBtn.disabled = !canScope;
  }

  function syncExplodeUI(val) {
    const pct = Math.round(clamp01(val) * 100);
    if (explodeRange) {
      explodeRange.value = String(pct);
      explodeRange.style.setProperty('--fill', `${pct}%`);
    }
    if (explodeValEl) explodeValEl.textContent = `${pct}%`;
    document.querySelectorAll('#explodePresets button').forEach((b) => {
      b.classList.toggle('on', Math.abs(+b.dataset.explode - pct) <= 1);
    });
  }

  function setExplode(val01, { scope = null, animate = false } = {}) {
    const target = clamp01(val01);
    if (scope === 'all' || scope === 'selected') state.explodeScope = scope;
    const scopeId = state.explodeScope === 'selected' ? state.selectedNodeId : null;
    if (scopedExplodeNodeId && scopedExplodeNodeId !== scopeId) {
      tree.setExplode?.(null, scopedExplodeNodeId);
    }
    scopedExplodeNodeId = scopeId;
    if (animate && Math.abs(target - state.explode) > 0.005) {
      state.explodeTween = { from: state.explode, to: target, t: 0, dur: 0.45, scopeId };
    } else {
      state.explodeTween = null;
      state.explode = target;
      tree.setExplode?.(state.explode, scopeId);
      syncExplodeUI(state.explode);
    }
    requestWake();
  }

  explodeRange?.addEventListener('input', () => {
    setExplode(+explodeRange.value / 100, { animate: false });
  });

  document.querySelectorAll('#explodePresets button').forEach((b) => {
    b.addEventListener('click', () => setExplode(+b.dataset.explode / 100, { animate: true }));
  });

  explodeScopeBtn?.addEventListener('click', () => {
    if (!state.selectedNodeId) return;
    const nextScope = state.explodeScope === 'selected' ? 'all' : 'selected';
    state.explodeScope = nextScope;
    updateScopeButton();
    setExplode(state.explode, { scope: nextScope, animate: false });
  });

  syncExplodeUI(state.explode);
  updateScopeButton();

  /* ---------------- Camera Presets, Layers & Theme Switcher ---------------- */
  function setCameraPreset(name) {
    document.querySelectorAll('#cameraPresets button').forEach((b) => {
      b.classList.toggle('on', b.dataset.preset === name && name !== 'reset');
    });
    if (kit.setCameraPreset) {
      kit.setCameraPreset(name, V.presets || {});
    } else {
      const dirs = {
        iso: VIEW_DIR,
        front: new THREE.Vector3(0, 0.08, 1).normalize(),
        side: new THREE.Vector3(1, 0.08, 0).normalize(),
        top: new THREE.Vector3(0, 1, 0.02).normalize(),
        reset: VIEW_DIR,
      };
      const d = dirs[name] || VIEW_DIR;
      controls.target.copy(TARGET);
      camera.position.copy(TARGET).addScaledVector(d, fitDist);
      controls.update();
    }
    requestWake();
  }

  document.querySelectorAll('#cameraPresets button').forEach((b) => {
    b.addEventListener('click', () => setCameraPreset(b.dataset.preset));
  });

  function setLayer(key, on) {
    layers[key] = Boolean(on);
    document.querySelectorAll(`.tog[data-layer="${CSS.escape(key)}"]`).forEach((b) => {
      b.classList.toggle('on', layers[key]);
      b.setAttribute('aria-pressed', String(layers[key]));
    });
    applyLayers();
    requestWake();
  }

  document.querySelectorAll('.tog').forEach((b) => {
    b.addEventListener('click', () => setLayer(b.dataset.layer, !layers[b.dataset.layer]));
  });

  function applyLayers() {
    for (const l of layerDefs) {
      if (l.key !== 'callouts' && l.key !== 'orbit' && l.key !== 'traces') {
        model.setLayer?.(l.key, layers[l.key], state);
      }
    }
    if ('traces' in layers) {
      tree.setTracesVisible?.(layers.traces);
      model.setLayer?.('traces', layers.traces, state);
    }
    stageEl.classList.toggle('no-callouts', !layers.callouts);
    controls.autoRotate = Boolean(layers.orbit);
  }
  applyLayers();

  function setTheme(nextThemeId) {
    const url = new URL(location.href);
    url.searchParams.set('theme', nextThemeId);
    location.href = url.toString();
  }

  document.querySelectorAll('#themeSeg button').forEach((b) => {
    b.classList.toggle('on', b.dataset.theme === themeId);
    b.addEventListener('click', () => {
      if (b.dataset.theme !== themeId) setTheme(b.dataset.theme);
    });
  });

  /* ---------------- 3D Canvas Raycasting (Click to Select Mesh) ---------------- */
  let ptrDown = null;
  canvasEl.addEventListener('pointerdown', (e) => {
    ptrDown = { x: e.clientX, y: e.clientY, t: performance.now() };
  });
  canvasEl.addEventListener('pointerup', (e) => {
    if (!ptrDown) return;
    const dx = e.clientX - ptrDown.x;
    const dy = e.clientY - ptrDown.y;
    const dtMs = performance.now() - ptrDown.t;
    ptrDown = null;
    if (Math.hypot(dx, dy) > 5 || dtMs > 400) return; // orbit/pan drag, not click
    if (!kit.pickClient) return;
    const hit = kit.pickClient(e.clientX, e.clientY, model.root ? [model.root] : undefined);
    if (hit && hit.nodeId) {
      selectNode(hit.nodeId, { focusCamera: e.detail >= 2, scrollSpec: true });
    } else if (state.selectedNodeId) {
      selectNode(null, { scrollSpec: false });
    }
  });

  /* ---------------- Stage Panel & Optional Readouts ---------------- */
  let shownStage = -1;
  const roBox = $('readout');
  const readoutEls = (model.readouts || []).map((r) => {
    if (!roBox) return null;
    const row = h(`<div><dt>${esc(r.label)}</dt><dd></dd></div>`);
    roBox.appendChild(row);
    return row.lastChild;
  });

  function updateStagePanel(force = false) {
    const s = stageIndexAt(state.t, stages);
    state.stageIndex = s;
    state.stageId = stages[s].id;
    if (force || s !== shownStage) {
      shownStage = s;
      const d = stages[s];
      const set = (id, v) => { const el = $(id); if (el) el.textContent = v; };
      set('stageNum', String(s + 1).padStart(2, '0'));
      set('stageName', d.name);
      set('stageSummary', d.summary);
      set('chipStage', `${String(s + 1).padStart(2, '0')} · ${d.name}`);
      document.body.style.setProperty('--accent', d.color);
      stageListEls.forEach((li) => li.classList.toggle('on', +li.dataset.stageIdx === s));
    }
    const stEl = $('stageStatus');
    if (stEl) {
      stEl.textContent = state.tween ? 'stepping' : state.scrubbing ? 'scrubbing' : state.playing ? 'playing' : 'paused';
    }
    const ctx = { t: state.t, stageIndex: s, stageId: stages[s].id, state, api };
    (model.readouts || []).forEach((r, k) => {
      const el = readoutEls[k];
      if (!el) return;
      const v = typeof r.value === 'function' ? r.value(ctx) : r.value;
      const text = typeof v === 'string' ? v : v.text;
      if (el.textContent !== text) el.textContent = text;
    });
  }

  /* ---------------- Interactive Standards-Badged Callouts ---------------- */
  const calloutLayer = $('callouts');
  const leaderSvg = $('leaders');
  const SVGNS = 'http://www.w3.org/2000/svg';

  CALLOUTS.forEach((c) => {
    const pillHtml = c.spec ? `<span class="spec-pill">${esc(c.spec)}</span>` : '';
    c.el = h(
      `<button type="button" class="callout" data-callout-id="${esc(c.id)}"` +
      `${c.nodeId ? ` data-node-id="${esc(c.nodeId)}"` : ''}` +
      `${c.specPath ? ` data-spec-path="${esc(c.specPath)}"` : ''}` +
      ` data-status="${esc(c.status)}">` +
      `<span class="bn">${esc(c.n)}</span>` +
      `<span class="c-body"><span class="nm">${esc(c.name)}</span>${pillHtml}</span>` +
      `</button>`
    );
    c.el.addEventListener('click', (e) => {
      e.stopPropagation();
      if (c.nodeId) {
        const already = state.selectedNodeId === c.nodeId;
        selectNode(c.nodeId, { specPath: c.specPath, focusCamera: already || e.detail >= 2, scrollSpec: true });
      } else if (c.specPath && inspector) {
        inspector.highlight({ specPath: c.specPath, scroll: true });
      }
    });
    c.el.addEventListener('pointerenter', () => setHoverNode(c.nodeId));
    c.el.addEventListener('pointerleave', () => setHoverNode(null));
    calloutLayer.appendChild(c.el);

    c.line = document.createElementNS(SVGNS, 'polyline');
    c.line.setAttribute('fill', 'none');
    c.line.setAttribute('stroke', inkA(0.58));
    c.line.setAttribute('stroke-width', '1');
    leaderSvg.appendChild(c.line);

    c.dot = document.createElementNS(SVGNS, 'circle');
    c.dot.setAttribute('r', '2.5');
    c.dot.setAttribute('fill', INK_HEX);
    leaderSvg.appendChild(c.dot);
  });

  function updateCalloutSelectionClasses() {
    CALLOUTS.forEach((c) => {
      const sel = Boolean(state.selectedNodeId && c.nodeId === state.selectedNodeId);
      const hov = Boolean(state.hoveredNodeId && c.nodeId === state.hoveredNodeId);
      c.el.classList.toggle('selected', sel);
      c.el.classList.toggle('hovered', hov);
      if (sel || hov) {
        c.line.setAttribute('stroke', INK_HEX);
        c.line.setAttribute('stroke-width', sel ? '1.8' : '1.4');
        c.dot.setAttribute('r', sel ? '3.4' : '3');
      } else {
        c.line.setAttribute('stroke', inkA(0.55));
        c.line.setAttribute('stroke-width', '1');
        c.dot.setAttribute('r', '2.4');
      }
    });
  }

  const cv3 = new THREE.Vector3();
  const dynBox = new THREE.Box3();
  const boxCorners = Array.from({ length: 8 }, () => new THREE.Vector3());
  const baseMin = new THREE.Vector3(...(V.box?.[0] || [-1.8, 0, -0.7]));
  const baseMax = new THREE.Vector3(...(V.box?.[1] || [1.8, 1.5, 0.7]));
  const toScreen = (v, W, H) => [(v.x * 0.5 + 0.5) * W, (-v.y * 0.5 + 0.5) * H];

  function footprint(W, H) {
    let mn = baseMin;
    let mx = baseMax;
    if (tree.getExplodedBounds && model.root) {
      tree.getExplodedBounds(dynBox);
      if (!dynBox.isEmpty()) {
        mn = dynBox.min;
        mx = dynBox.max;
      }
    }
    let idx = 0;
    for (const x of [mn.x, mx.x]) {
      for (const y of [mn.y, mx.y]) {
        for (const z of [mn.z, mx.z]) {
          boxCorners[idx++].set(x, y, z);
        }
      }
    }
    let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
    boxCorners.forEach((p) => {
      cv3.copy(p).project(camera);
      const [x, y] = toScreen(cv3, W, H);
      minX = Math.min(minX, x); maxX = Math.max(maxX, x);
      minY = Math.min(minY, y); maxY = Math.max(maxY, y);
    });
    return { minX, maxX, minY, maxY };
  }

  function calloutVisible(c, compact) {
    if (compact && !c.compact && c.nodeId !== state.selectedNodeId) return false;
    if (c.stage != null) {
      const allowed = Array.isArray(c.stage) ? c.stage : [c.stage];
      if (!allowed.includes(state.stageId) && !allowed.includes(state.stageIndex)) return false;
    }
    if (c.show && !c.show(state)) return false;
    // Hide callout if its linked node is explicitly hidden
    if (c.nodeId) {
      const n = tree.getNode?.(c.nodeId);
      if (n && n.visible === false) return false;
    }
    return true;
  }

  function placeCallouts(W, H) {
    if (!layers.callouts || !CALLOUTS.length) return;
    const { minX, maxX, minY, maxY } = footprint(W, H);
    const compact = W < 700;
    const items = CALLOUTS.filter((c) => calloutVisible(c, compact));

    CALLOUTS.forEach((c) => {
      c.el.style.opacity = '0';
      c.el.style.pointerEvents = 'none';
      c.line.style.opacity = '0';
      c.dot.style.opacity = '0';
    });

    const shown = [];
    items.forEach((c) => {
      if (typeof c.at === 'function') {
        c.at(cv3, state);
      } else if (c.nodeId && tree.getWorldCenter) {
        tree.getWorldCenter(c.nodeId, cv3);
      } else {
        return;
      }
      cv3.project(camera);
      if (cv3.z >= 1 || cv3.z <= -1) return;
      [c.ax, c.ay] = toScreen(cv3, W, H);
      shown.push(c);
    });

    const fL = compact ? 6 : free.x + 6;
    const fR = compact ? W - 6 : free.x + free.w - 6;
    const yTop = free.y + 14;
    const yBot = free.y + free.h - 14;
    const gap = compact ? 23 : 27;

    // Wide horizontal assemblies (e.g. 168" counters) fill the center width, leaving
    // generous drafting margin above and below the model. Place callouts in the 4 outer
    // perimeter bands (top-left, top-right, bottom-left, bottom-right) so they never
    // overlap the 3D geometry. For narrower models or wide figure cards, use 2 side columns.
    const wideModel = !compact && !figure && (maxX - minX) > free.w * 0.56 && (minY - yTop > 48 || yBot - maxY > 48);

    const placeBand = (list, left, colX, bandTop, bandBot) => {
      if (!list.length) return;
      list.sort((a, b) => a.ay - b.ay);
      let y = -Infinity;
      list.forEach((c) => {
        c.ly = Math.max(c.ay, y + gap, bandTop);
        y = c.ly;
      });
      const over = y - bandBot;
      if (over > 0) list.forEach((c) => { c.ly -= over; });
      for (let k = list.length - 2; k >= 0; k--) {
        list[k].ly = Math.min(list[k].ly, list[k + 1].ly - gap);
      }
      if (list[0].ly < bandTop) {
        const shift = bandTop - list[0].ly;
        list.forEach((c) => { c.ly += shift; });
      }
      list.forEach((c) => {
        c.el.classList.toggle('left', left);
        const w = c.el.offsetWidth;
        const ex = left ? Math.max(fL, colX - w) : Math.min(fR - w, colX);
        const anchorX = left ? ex + w : ex;
        c.el.style.transform = `translate(${ex.toFixed(1)}px, ${(c.ly - 11).toFixed(1)}px)`;
        const elbow = left ? anchorX + 10 : anchorX - 10;
        c.line.setAttribute(
          'points',
          `${c.ax.toFixed(1)},${c.ay.toFixed(1)} ${elbow.toFixed(1)},${c.ly.toFixed(1)} ${anchorX.toFixed(1)},${c.ly.toFixed(1)}`
        );
        c.dot.setAttribute('cx', c.ax.toFixed(1));
        c.dot.setAttribute('cy', c.ay.toFixed(1));
        c.el.style.opacity = '1';
        c.el.style.pointerEvents = 'auto';
        c.line.style.opacity = '1';
        c.dot.style.opacity = '1';
      });
    };

    if (wideModel) {
      const midY = (minY + maxY) * 0.5;
      const topList = shown.filter((c) => c.ay < midY);
      const botList = shown.filter((c) => c.ay >= midY);
      const splitLR = (arr) => {
        const s = arr.slice().sort((a, b) => a.ax - b.ax);
        const h = Math.ceil(s.length / 2);
        return [s.slice(0, h), s.slice(h)];
      };
      const [tL, tR] = splitLR(topList);
      const [bL, bR] = splitLR(botList);
      const topBandBot = Math.max(yTop + Math.max(tL.length, tR.length) * gap, minY - 12);
      const botBandTop = Math.min(yBot - Math.max(bL.length, bR.length) * gap, maxY + 14);
      const wTopL = Math.max(0, ...tL.map((c) => c.el.offsetWidth));
      const wBotL = Math.max(0, ...bL.map((c) => c.el.offsetWidth));
      const wTopR = Math.max(0, ...tR.map((c) => c.el.offsetWidth));
      const wBotR = Math.max(0, ...bR.map((c) => c.el.offsetWidth));
      // Keep labels anchored cleanly at the outer left & right margins of the viewport
      placeBand(tL, true, fL + wTopL, yTop, Math.min(topBandBot, midY - 20));
      placeBand(tR, false, fR - wTopR, yTop, Math.min(topBandBot, midY - 20));
      placeBand(bL, true, fL + wBotL, Math.max(botBandTop, midY + 20), yBot);
      placeBand(bR, false, fR - wBotR, Math.max(botBandTop, midY + 20), yBot);
    } else {
      shown.sort((a, b) => a.ax - b.ax);
      const half = Math.ceil(shown.length / 2);
      const sides = { L: shown.slice(0, half), R: shown.slice(half) };
      const wL = Math.max(0, ...sides.L.map((c) => c.el.offsetWidth));
      const wR = Math.max(0, ...sides.R.map((c) => c.el.offsetWidth));
      const reach = figure ? 56 : 24;
      const colL = Math.max(fL + wL, Math.min(minX - (compact ? 6 : reach), fL + free.w * 0.42));
      const colR = Math.min(fR - wR, Math.max(maxX + (compact ? 6 : reach), fR - free.w * 0.42));
      const bandBot = Math.min(yBot, Math.max(maxY, minY + Math.max(sides.L.length, sides.R.length) * gap) + 12);
      placeBand(sides.L, true, colL, yTop, bandBot);
      placeBand(sides.R, false, colR, yTop, bandBot);
    }
  }

  /* ---------------- layout: center 3D model in unobstructed free region ---------------- */
  let vw = 0, vh = 0, fitDist = 10;
  const free = { x: 0, y: 0, w: 0, h: 0 };

  function layout() {
    const r = stageEl.getBoundingClientRect();
    vw = Math.max(1, r.width);
    vh = Math.max(1, r.height);
    renderer.setSize(vw, vh, false);
    camera.aspect = vw / vh;

    let fx = 0, fy = 0, fw = vw, fh = vh;
    const rect = (sel) => document.querySelector(sel)?.getBoundingClientRect();
    if (figure) {
      const card = rect('.card');
      const head = rect('.fig-head');
      const foot = rect('.fig-foot');
      if (card) {
        fx = card.left - r.left + 12;
        fw = Math.max(120, card.width - 24);
        fy = (head ? head.bottom : card.top) - r.top + 6;
        fh = Math.max(120, (foot ? foot.top : card.bottom) - r.top - 6 - fy);
      }
    } else if (innerWidth > 960) {
      const left = rect('.tree-panel');
      const right = rect('.inspector-panel');
      const head = rect('.topbar');
      const foot = rect('.timeline-panel');
      if (left && right && head && foot) {
        fx = left.right + 8;
        fw = Math.max(200, right.left - 8 - fx);
        fy = head.bottom + 6;
        fh = Math.max(200, foot.top - 8 - fy);
      }
    }
    Object.assign(free, { x: fx, y: fy, w: fw, h: fh });
    const offX = (fx + fw / 2) - vw / 2;
    const offY = (fy + fh / 2) - vh / 2;
    camera.setViewOffset(vw, vh, -offX, -offY, vw, vh);
    camera.updateProjectionMatrix();

    const vFov = camera.fov * D2R;
    const tanV = Math.tan(vFov / 2) * (fh / vh);
    const tanH = Math.tan(vFov / 2) * camera.aspect * (fw / vw);
    const baseRad = V.radius ?? 2.8;
    const radius = innerWidth < 700
      ? (V.radiusCompact ?? baseRad * 1.2)
      : figure
        ? (V.radiusFigure ?? baseRad * 1.12)
        : baseRad;
    fitDist = radius / Math.max(0.05, Math.min(tanV, tanH));
    fitDist = Math.min(Math.max(fitDist, controls.minDistance + 0.4), controls.maxDistance);
    kit.setDefaultView?.({ target: V.target || [0, 0.8, 0], dir: V.dir || [0.65, 0.42, 0.72], dist: fitDist, presets: V.presets });
    if (kit.outlineMat?.uniforms?.uPx) {
      kit.outlineMat.uniforms.uPx.value = (2 * Math.tan(vFov / 2) / vh) * 1.35;
    }
    requestWake();
  }
  addEventListener('resize', layout);
  if (document.fonts) document.fonts.ready.then(layout);

  /* ---------------- initial pose & render loop ---------------- */
  renderTree();
  renderTimeline();
  setPlaying(state.playing);
  updateStagePanel(true);

  const clock = new THREE.Clock();
  let intro = reduceMotion ? 1 : 0;
  layout();
  camera.position.copy(TARGET).addScaledVector(VIEW_DIR, fitDist * (intro < 1 ? 1.32 : 1.0));
  controls.update();
  let lastFit = fitDist;
  const tmpV = new THREE.Vector3();

  // Initial evaluation before first render
  tree.evaluateTimeline?.(state.t, state.stageId);
  tree.setExplode?.(state.explode, null);
  model.pose?.(state.t, 0, state);

  const signature = () => [
    state.t.toFixed(4),
    state.explode.toFixed(4),
    treeRev,
    state.selectedNodeId || '',
    state.hoveredNodeId || '',
    state.isolatedNodeId || '',
    JSON.stringify(state.layers),
    JSON.stringify(state.options),
    vw, vh, fitDist.toFixed(3),
    camera.position.toArray().map((v) => v.toFixed(4)).join(),
    controls.target.toArray().map((v) => v.toFixed(4)).join(),
  ].join('|');

  function frame() {
    const rawDt = clock.getDelta();
    const dt = Math.min(rawDt, 0.05);
    const camAnim = kit.isCameraAnimating ? kit.isCameraAnimating() : false;
    const sig = signature();
    const busy = wake || sig !== lastSig || state.playing || state.tween || state.explodeTween || state.scrubbing || intro < 1 || layers.orbit || camAnim;

    if (busy) {
      quiet = 0;
      wake = false;
      lastSig = sig;
    } else if ((quiet += rawDt) > SETTLE) {
      requestAnimationFrame(frame);
      return;
    }

    // Timeline tween or playback
    if (state.tween) {
      const tw = state.tween;
      tw.t += dt / tw.dur;
      const k = tw.t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * tw.t);
      state.t = clamp01(tw.from + (tw.to - tw.from) * k);
      if (tw.t >= 1) state.tween = null;
      tree.evaluateTimeline?.(state.t, stages[stageIndexAt(state.t, stages)].id);
      updateTimelinePlayhead();
    } else if (state.playing) {
      const durationSec = assembly.playbackSeconds ?? 18;
      state.t = (state.t + dt / durationSec) % 1;
      tree.evaluateTimeline?.(state.t, stages[stageIndexAt(state.t, stages)].id);
      updateTimelinePlayhead();
    }

    // Explode tween
    if (state.explodeTween) {
      const ew = state.explodeTween;
      ew.t += dt / ew.dur;
      const k = ew.t >= 1 ? 1 : 0.5 - 0.5 * Math.cos(Math.PI * ew.t);
      state.explode = clamp01(ew.from + (ew.to - ew.from) * k);
      tree.setExplode?.(state.explode, ew.scopeId);
      syncExplodeUI(state.explode);
      if (ew.t >= 1) state.explodeTween = null;
    }

    model.pose?.(state.t, dt, state);

    // Camera intro settle / smooth flyTo / resize refit
    const flew = kit.updateCamera ? kit.updateCamera(dt) : false;
    if (!flew && intro < 1) {
      intro = Math.min(1, intro + dt / 1.1);
      const e = 1 - Math.pow(1 - intro, 3);
      tmpV.copy(camera.position).sub(controls.target).normalize();
      camera.position.copy(controls.target).addScaledVector(tmpV, fitDist * (1.32 - 0.32 * e));
    } else if (!flew && Math.abs(fitDist - lastFit) > 0.01) {
      tmpV.copy(camera.position).sub(controls.target).multiplyScalar(fitDist / lastFit);
      camera.position.copy(controls.target).add(tmpV);
    }
    lastFit = fitDist;

    controls.update();
    renderer.render(scene, camera);

    placeCallouts(vw, vh);
    updateStagePanel();
    requestAnimationFrame(frame);
  }
  requestAnimationFrame(frame);

  // Public scripting & QA handle (used by smoke.py, shoot.py, record.py)
  window.__sheet = {
    state,
    assembly,
    model,
    kit,
    tree,
    inspector,
    setStage,
    stepStage,
    setPlaying,
    setProgress,
    setExplode,
    selectNode,
    setNodeVisibility,
    setNodeGhost,
    isolateNode,
    setOption: (key, value) => applyOptionChange(key, value, { fromInspector: false }),
    setCameraPreset,
    setLayer,
    setInspectorFormat: (fmt) => { state.format = fmt; inspector?.setFormat(fmt); },
    setInspectorFilter: (flt) => { state.filter = flt; inspector?.setFilter(flt); },
    setTheme,
    layout,
  };
  return window.__sheet;
}

/* =========================================================================
   DOM Generation (Zero cyclic filler — pure CAD engineering workbench)
   ========================================================================= */
function buildLayerDefs(assemblyLayers = []) {
  const list = [...assemblyLayers];
  const has = (k) => list.some((l) => l.key === k);
  if (!has('ghostShell')) list.unshift({ key: 'ghostShell', label: 'Ghost Shell', on: false });
  if (!has('traces')) list.push({ key: 'traces', label: 'Traces', on: true });
  if (!has('callouts')) list.push({ key: 'callouts', label: 'Labels', on: true });
  if (!has('orbit')) list.push({ key: 'orbit', label: 'Orbit', on: false });
  return list;
}

function buildDom(assembly, stages, layerDefs, figure) {
  const m = assembly.meta || {};
  const woBadge = m.fig || [m.division, m.wo ? `WO ${m.wo}` : ''].filter(Boolean).join(' · ') || 'EMJAC · CAD';
  const layerBtns = layerDefs
    .map((l) => `<button type="button" class="tog${l.on !== false ? ' on' : ''}" data-layer="${esc(l.key)}" aria-pressed="${l.on !== false}">${esc(l.label)}</button>`)
    .join('');

  const camBtns = CAMERA_PRESETS
    .map((p) => `<button type="button" data-preset="${p.id}"${p.id === 'iso' ? ' class="on"' : ''}>${p.label}</button>`)
    .join('');

  const themeBtns = BUILTIN_THEMES
    .map((t) => `<button type="button" data-theme="${t.id}">${t.label}</button>`)
    .join('');

  const transport = `<div class="transport">
      <button type="button" class="tbtn" id="prevBtn" title="Previous build stage" aria-label="Previous build stage">${ICON.prev}</button>
      <button type="button" class="tbtn play paused" id="playBtn" aria-label="Play">${ICON.pause}${ICON.play}</button>
      <button type="button" class="tbtn" id="nextBtn" title="Next build stage" aria-label="Next build stage">${ICON.next}</button>
    </div>`;

  const explodePresets = `<div class="seg seg-compact" id="explodePresets" role="group" aria-label="Explode presets">
      <button type="button" data-explode="0" class="on">0%</button>
      <button type="button" data-explode="50">50%</button>
      <button type="button" data-explode="100">100%</button>
    </div>`;

  const stageHtml = `<div class="stage" id="stage">
      <canvas id="gl" aria-label="${esc(m.alt || 'Interactive 3D CAD assembly')}"></canvas>
      <svg class="leaders" id="leaders"></svg>
      <div class="callouts" id="callouts"></div>
    </div>`;

  if (figure) {
    document.body.insertAdjacentHTML('afterbegin', `
      <div class="card" aria-hidden="true"></div>
      ${stageHtml}
      <main class="fig">
        <header class="fig-head">
          <div class="fig-status">
            <span class="wo-badge" id="assemblyBadge">${esc(woBadge)}</span>
            <div class="chip"><span>Stage</span> <b id="chipStage">01 · ${esc(stages[0].name)}</b></div>
          </div>
          <div class="fig-title">
            <h1>${m.title || '3D Assembly'}</h1>
            <div class="toggles" role="group" aria-label="Display layers">${layerBtns}</div>
          </div>
        </header>
        <footer class="fig-foot">
          ${transport}
          <div class="ctrl-inline">
            <label for="explodeRange">Explode</label>
            <input type="range" id="explodeRange" min="0" max="100" value="0">
            <span id="explodeVal">0%</span>
          </div>
          ${explodePresets}
          <div class="seg seg-compact" id="cameraPresets" role="group" aria-label="Camera presets">
            <button type="button" data-preset="iso" class="on">Iso</button>
            <button type="button" data-preset="front">Front</button>
            <button type="button" data-preset="reset">Reset</button>
          </div>
          <span class="orbit-hint">Drag orbit · Right-drag pan · Click part</span>
        </footer>
      </main>`);
    return;
  }

  const zones = (n, letters) => Array.from({ length: n }, (_, i) => `<span>${letters ? String.fromCharCode(65 + i) : i + 1}</span>`).join('');
  const tb = m.titleBlock || { title: m.id || 'ASSEMBLY', dwg: m.wo || 'DWG-001', scale: 'NTS', rev: 'v1' };
  const stageCols = stages.length > 4 ? Math.ceil(stages.length / 2) : stages.length;

  document.body.insertAdjacentHTML('afterbegin', `
    <div class="sheet" aria-hidden="true">
      <div class="zones zones-top">${zones(8)}</div><div class="zones zones-bottom">${zones(8)}</div>
      <div class="zones zones-left">${zones(5, true)}</div><div class="zones zones-right">${zones(5, true)}</div>
    </div>
    ${stageHtml}
    <main class="layout">
      <header class="topbar">
        <div class="top-id">
          <span class="wo-badge" id="assemblyBadge">${esc(woBadge)}</span>
          <div class="top-meta">
            <h1 class="top-title">${m.title || '3D Engineering Assembly'}</h1>
            ${m.caption ? `<span class="top-cap">${esc(m.caption)}</span>` : ''}
          </div>
        </div>
        <div class="top-controls">
          <div class="top-group">
            <span class="lbl">View</span>
            <div class="seg seg-compact" id="cameraPresets" role="group" aria-label="Camera presets">${camBtns}</div>
          </div>
          <div class="toggles" role="group" aria-label="Display layers">${layerBtns}</div>
          <div class="top-group">
            <span class="lbl">Theme</span>
            <div class="seg seg-compact" id="themeSeg" role="group" aria-label="Theme switcher">${themeBtns}</div>
          </div>
        </div>
      </header>

      <section class="block tree-panel" aria-label="Assembly tree and build stages">
        <div class="block-head">
          <span class="ph-n">A</span><span>Build Stages &amp; Model Tree</span>
          <span class="stage-status head-spacer" id="stageStatus">paused</span>
        </div>
        <div class="stage-box" aria-live="polite">
          <div class="stage-head-row">
            <span class="stage-num" id="stageNum">01</span>
            <span class="stage-name" id="stageName">${esc(stages[0].name)}</span>
          </div>
          <p class="stage-summary" id="stageSummary">${esc(stages[0].summary)}</p>
          <div class="stage-bar">
            ${transport}
            <span class="lbl">${stages.length} stages</span>
          </div>
          <ol class="stage-list" id="stageList" style="grid-template-columns: repeat(${stageCols}, 1fr)">
            ${stages.map((s, k) => `<li data-stage-idx="${k}" title="${esc(s.name)}"><i style="background:${s.color}"></i>${esc(s.short)}</li>`).join('')}
          </ol>
        </div>

        <div class="explode-box">
          <div class="explode-head">
            <label for="explodeRange">Exploded View</label>
            <span class="explode-val" id="explodeVal">0%</span>
          </div>
          <input type="range" id="explodeRange" min="0" max="100" value="0">
          <div class="explode-actions">
            ${explodePresets}
            <button type="button" class="scope-btn" id="explodeScopeBtn" disabled>Scope: All</button>
          </div>
        </div>

        <div class="tree-head">
          <span>Assembly Hierarchy</span>
          <button type="button" class="tree-reset-btn" id="treeResetBtn" title="Reset visibility, ghost and isolation">Reset</button>
        </div>
        <div class="assembly-tree" id="assemblyTree" role="tree" aria-label="Assembly hierarchy"></div>
        <dl class="readout" id="readout"></dl>
      </section>

      <section class="block timeline-panel" aria-label="Nested subsystem timeline">
        <div class="block-head">
          <span class="ph-n">B</span><span>Subsystem Build &amp; Explode Timeline</span>
          <ul class="tl-key" aria-label="Stage key">
            ${stages.map((s) => `<li><i style="background:${s.color}"></i>${esc(s.short)}</li>`).join('')}
          </ul>
        </div>
        <div class="timeline" id="timeline">
          <div class="tl-axis">
            <div class="tl-axis-lbl">Subsystem / Part</div>
            <div class="tl-axis-ticks">
              ${stages.map((s, k) => `<div class="tl-tick" data-stage-idx="${k}" title="Jump to ${esc(s.name)}">${String(k + 1).padStart(2, '0')} ${esc(s.short)}</div>`).join('')}
            </div>
          </div>
          <div class="tl-body" id="timelineTrack"></div>
          <div class="tl-playhead" id="timelinePlayhead" style="--t:0"></div>
        </div>
      </section>

      <section class="block inspector-panel" aria-label="Engineering standards inspector">
        <div class="block-head">
          <span class="ph-n">C</span><span>Product DNA &amp; Standards</span>
          <div class="inspector-tools">
            <div class="seg seg-compact" id="inspectorFormat" role="group" aria-label="Spec format">
              <button type="button" data-format="yaml" class="on">YAML</button>
              <button type="button" data-format="json">JSON</button>
            </div>
            <button type="button" class="copy-btn" id="inspectorCopy">Copy</button>
          </div>
        </div>

        <div class="inspector-filters" id="inspectorFilters" role="group" aria-label="Filter specification">
          <button type="button" data-filter="all" class="on">All</button>
          <button type="button" data-filter="locked">Standards</button>
          <button type="button" data-filter="engineer_input">Options</button>
          <button type="button" data-filter="buyout">Buyouts</button>
        </div>

        <div class="options-bar" id="optionsBar" hidden></div>

        <div class="spec-wrap">
          <div class="spec-meta">
            <span id="specMetaStatus">YAML · Full DNA</span>
            <span>Click line → 3D</span>
          </div>
          <div class="spec-code-scroll" id="specCode" role="region" aria-label="Engineering specification code"></div>
        </div>

        <div class="title-block" aria-label="Drawing title block">
          <div class="tb-main"><span>Assembly</span><b>${esc(tb.title)}</b></div>
          <div class="tb-grid">
            <div><span>WO / Dwg</span><b>${esc(tb.dwg)}</b></div>
            <div><span>Scale</span><b>${esc(tb.scale || 'NTS')}</b></div>
            <div><span>Rev</span><b>${esc(tb.rev || 'v2.1')}</b></div>
          </div>
        </div>
      </section>
    </main>`);
}
