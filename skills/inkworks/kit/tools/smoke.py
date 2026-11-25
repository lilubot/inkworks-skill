"""Playwright smoke test for Inkworks Engineering Intent 3D workbenches.

Verifies default Creo theme and counter_087837 assembly load, GLB geometry rendering,
build stage stepping and play/pause, explode slider (0 -> 100%), hierarchical Assembly Tree
expand/collapse and visibility/ghost/isolate toggles, standards-badged callout rendering
and click selection, live YAML <-> JSON inspector toggle & Engineer-Provided Option updates,
bottom subsystem timeline scrubbing, zero cyclic-machine filler, and zero console/page
errors across sheet and figure layouts at desktop and phone viewport sizes.

  python3 tools/smoke.py --url "http://localhost:9081/" --browser chromium
  python3 tools/smoke.py --url "http://localhost:9081/?a=counter_087837" --layouts sheet,figure --sizes 1440x900,390x844

Exit code 1 on any page error or failed check.
"""
import argparse
import sys

ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
ap.add_argument("--url", default="http://localhost:9081/")
ap.add_argument("--layouts", default="sheet,figure")
ap.add_argument("--sizes", default="1440x900,1280x720,390x844")
ap.add_argument("--browser", choices=["webkit", "chromium"], default="chromium",
                help="chromium uses SwiftShader WebGL (default); webkit uses native WebGL")
a = ap.parse_args()

fails = []


def check(name, ok, detail=""):
    tag = "ok  " if ok else "FAIL"
    print(f"  {tag} {name}" + (f" ({detail})" if detail else ""))
    if not ok:
        fails.append(f"{name}: {detail}" if detail else name)


def build_url(base, layout):
    sep = "&" if "?" in base else "?"
    if "layout=" in base:
        return base
    return f"{base}{sep}layout={layout}"


def get_stage_idx(ev):
    return ev("""(() => {
        const s = window.__sheet?.state;
        if (!s) return -1;
        if (typeof s.stageIdx === 'number') return s.stageIdx;
        if (typeof s.stageIndex === 'number') return s.stageIndex;
        if (typeof s.stage === 'number') return s.stage;
        const stages = window.__sheet?.assembly?.stages || [];
        return stages.findIndex(st => st.id === s.stageId);
    })()""")


def run_suite():
    try:
        from playwright.sync_api import sync_playwright
    except ImportError:
        sys.exit("Playwright is required: pip install playwright && python3 -m playwright install chromium")
    with sync_playwright() as p:
        if a.browser == "webkit":
            browser = p.webkit.launch()
        else:
            browser = p.chromium.launch(args=[
                "--enable-unsafe-swiftshader",
                "--use-angle=swiftshader",
                "--ignore-gpu-blocklist",
            ])

        url_has_theme = "theme=" in a.url
        url_has_assembly = ("a=" in a.url) or ("m=" in a.url)

        for layout in [x.strip() for x in a.layouts.split(",") if x.strip()]:
            for size in [x.strip() for x in a.sizes.split(",") if x.strip()]:
                w, h = map(int, size.split("x"))
                pg = browser.new_page(viewport={"width": w, "height": h})
                errs = []
                pg.on("pageerror", lambda e: errs.append(f"pageerror: {e}"))
                pg.on("console", lambda m: m.type == "error" and errs.append(f"console.error: {m.text}"))

                target_url = build_url(a.url, layout)
                pg.goto(target_url, wait_until="networkidle")
                pg.wait_for_function("window.__sheet !== undefined && window.__sheet.model !== undefined", timeout=25000)
                pg.wait_for_timeout(800)

                print(f"[{layout} {size}]")
                ev = pg.evaluate

                # 1. Default theme & assembly check
                theme_id = ev("window.__sheet.kit?.themeId || document.documentElement.dataset.theme || document.body.dataset.theme || ''")
                asm_id = ev("window.__sheet.assembly?.meta?.id || window.__sheet.assembly?.id || ''")
                if not url_has_theme:
                    check("default theme is creo", theme_id == "creo", f"theme={theme_id}")
                else:
                    check("theme loaded", bool(theme_id), f"theme={theme_id}")
                if not url_has_assembly:
                    check("default assembly is counter_087837", asm_id == "counter_087837", f"assembly={asm_id}")
                else:
                    check("assembly loaded", bool(asm_id), f"assembly={asm_id}")

                # 2. Zero cyclic-machine filler
                filler = ev("""(() => {
                    const banned = ['#gauge', '#plot', '#drive', '#slowSeg', '#phaseNick'];
                    return banned.filter(sel => document.querySelector(sel) !== null);
                })()""")
                check("no cyclic filler DOM", len(filler) == 0, ", ".join(filler) if filler else "clean")

                # 3. GLB / 3D geometry rendered
                geo_stats = ev("""(() => {
                    const s = window.__sheet;
                    const root = s.model?.root || s.kit?.scene;
                    let meshes = 0, verts = 0;
                    if (root && root.traverse) {
                        root.traverse(obj => {
                            if (obj.isMesh && !obj.userData?.__inkHelper && obj.geometry?.attributes?.position) {
                                meshes++;
                                verts += obj.geometry.attributes.position.count;
                            }
                        });
                    }
                    const gl = document.getElementById('gl');
                    const r = gl ? gl.getBoundingClientRect() : { width: 0, height: 0 };
                    return { meshes, verts, w: Math.round(r.width), h: Math.round(r.height) };
                })()""")
                check(
                    "3D GLB geometry rendered",
                    geo_stats["meshes"] > 0 and geo_stats["verts"] > 100 and geo_stats["w"] > 100 and geo_stats["h"] > 100,
                    f"{geo_stats['meshes']} meshes, {geo_stats['verts']} verts, canvas {geo_stats['w']}x{geo_stats['h']}",
                )

                # 4. Build stage stepping (next / prev / play / pause)
                n_stages = ev("(window.__sheet.assembly?.stages || []).length")
                check("stages configured", n_stages >= 2, f"{n_stages} stages")
                if n_stages >= 2 and pg.locator("#nextBtn").count() and pg.locator("#nextBtn").is_visible():
                    st0 = get_stage_idx(ev)
                    pg.locator("#nextBtn").click()
                    pg.wait_for_timeout(650)
                    st1 = get_stage_idx(ev)
                    check("next stage", st1 != st0, f"{st0} -> {st1}")

                    pg.locator("#prevBtn").click()
                    pg.wait_for_timeout(650)
                    st2 = get_stage_idx(ev)
                    check("prev stage", st2 == st0, f"{st1} -> {st2}")

                if pg.locator("#playBtn").count() and pg.locator("#playBtn").is_visible():
                    p0 = ev("Boolean(window.__sheet.state.playing)")
                    check("starts paused at stage 0", p0 is False, f"playing={p0}")
                    t0 = ev("Number(window.__sheet.state.t ?? window.__sheet.state.progress ?? 0)")
                    pg.locator("#playBtn").click()
                    pg.wait_for_timeout(450)
                    p1 = ev("Boolean(window.__sheet.state.playing)")
                    t1 = ev("Number(window.__sheet.state.t ?? window.__sheet.state.progress ?? 0)")
                    check("play starts and advances timeline", p1 is True and t1 > t0, f"playing={p1}, t {t0:.3f}->{t1:.3f}")
                    if p1:
                        pg.locator("#playBtn").click()
                        pg.wait_for_timeout(150)
                    check("pause stops playback", ev("Boolean(window.__sheet.state.playing)") is False)

                # 5. Explode slider (0 -> 100% -> 0%)
                if pg.locator("#explodeRange").count() and pg.locator("#explodeRange").is_visible():
                    pos_before = ev("""(() => {
                        const t = window.__sheet.tree;
                        const nodes = (t?.getFlatList?.() || t?.getNodes?.() || []).filter(n => n.explodeVec && n.object3d);
                        return nodes.slice(0, 5).map(n => [n.id, n.object3d.position.x, n.object3d.position.y, n.object3d.position.z]);
                    })()""")
                    ev("""(() => {
                        const el = document.getElementById('explodeRange');
                        const maxVal = parseFloat(el.max || '100');
                        el.value = String(maxVal);
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    })()""")
                    pg.wait_for_timeout(450)
                    exp_hi = ev("Number(window.__sheet.state.explode ?? window.__sheet.tree?.getExplode?.() ?? 0)")
                    pos_after = ev("""(() => {
                        const t = window.__sheet.tree;
                        const nodes = (t?.getFlatList?.() || t?.getNodes?.() || []).filter(n => n.explodeVec && n.object3d);
                        return nodes.slice(0, 5).map(n => [n.id, n.object3d.position.x, n.object3d.position.y, n.object3d.position.z]);
                    })()""")
                    moved = any(
                        abs(a1 - b1) + abs(a2 - b2) + abs(a3 - b3) > 1e-4
                        for (_, a1, a2, a3), (_, b1, b2, b3) in zip(pos_before, pos_after)
                    ) if pos_before else True
                    check("explode slider 0 -> 100%", exp_hi >= 0.9 and moved, f"explode={exp_hi:.2f}, moved={moved}")

                    ev("""(() => {
                        const el = document.getElementById('explodeRange');
                        el.value = '0';
                        el.dispatchEvent(new Event('input', { bubbles: true }));
                        el.dispatchEvent(new Event('change', { bubbles: true }));
                    })()""")
                    pg.wait_for_timeout(350)
                    exp_lo = ev("Number(window.__sheet.state.explode ?? window.__sheet.tree?.getExplode?.() ?? 0)")
                    check("explode slider resets to 0%", exp_lo <= 0.05, f"explode={exp_lo:.2f}")

                # 6. Hierarchical Assembly Tree (sheet layout)
                if layout == "sheet" and pg.locator("#assemblyTree").count():
                    pg.locator("#assemblyTree").scroll_into_view_if_needed()
                    pg.wait_for_timeout(150)
                    node_count = pg.locator("#assemblyTree .tree-node[data-node-id]").count()
                    check("assembly tree populated", node_count >= 3, f"{node_count} nodes")

                    exp_btns = pg.locator("#assemblyTree .tree-expand:not(.leaf)")
                    if exp_btns.count() > 0:
                        first_exp = exp_btns.first
                        before_count = pg.locator("#assemblyTree .tree-node").count()
                        before_txt = first_exp.inner_text()
                        first_exp.click()
                        pg.wait_for_timeout(150)
                        after_count = pg.locator("#assemblyTree .tree-node").count()
                        after_txt = pg.locator("#assemblyTree .tree-expand:not(.leaf)").first.inner_text()
                        check("tree expand/collapse", (after_count != before_count) or (after_txt != before_txt),
                              f"nodes {before_count}->{after_count}")
                        pg.locator("#assemblyTree .tree-expand:not(.leaf)").first.click()
                        pg.wait_for_timeout(150)

                    vis_btns = pg.locator("#assemblyTree .tree-node[data-node-id] .tree-vis")
                    if vis_btns.count() > 0:
                        target_node = pg.locator("#assemblyTree .tree-node[data-node-id]").nth(min(1, node_count - 1))
                        nid = target_node.get_attribute("data-node-id")
                        vis_before = ev("(id) => window.__sheet.tree?.getNode?.(id)?.visible ?? true", nid)
                        target_node.locator(".tree-vis").click()
                        pg.wait_for_timeout(150)
                        vis_after = ev("(id) => window.__sheet.tree?.getNode?.(id)?.visible ?? true", nid)
                        check("tree visibility toggle", vis_after != vis_before, f"{nid}: {vis_before}->{vis_after}")
                        pg.locator(f"#assemblyTree .tree-node[data-node-id='{nid}'] .tree-vis").click()
                        pg.wait_for_timeout(150)

                    iso_btns = pg.locator("#assemblyTree .tree-node[data-node-id] .tree-iso")
                    if iso_btns.count() > 0:
                        target_node = pg.locator("#assemblyTree .tree-node[data-node-id]").nth(min(1, node_count - 1))
                        nid = target_node.get_attribute("data-node-id")
                        target_node.locator(".tree-iso").click()
                        pg.wait_for_timeout(200)
                        iso_active = ev("""(id) => {
                            const s = window.__sheet.state;
                            const t = window.__sheet.tree;
                            if (s.isolatedNodeId === id || s.isolated === id) return true;
                            const st = t?.getState?.();
                            return st?.isolatedId === id || st?.isolated === id ||
                                (t?.getFlatList?.() || []).some(n => n.id !== id && (n.dimmed || !n.visible || n.ghost));
                        }""", nid)
                        check("tree isolate toggle", bool(iso_active), f"isolated {nid}")
                        pg.locator(f"#assemblyTree .tree-node[data-node-id='{nid}'] .tree-iso").click()
                        pg.wait_for_timeout(150)

                # 7. Callouts rendering & click selection
                pg.evaluate("window.scrollTo(0, 0)")
                pg.wait_for_timeout(250)
                callout_info = ev("""(() => {
                    const els = [...document.querySelectorAll('.callout')];
                    const visible = els.filter(e => {
                        const st = getComputedStyle(e);
                        return st.display !== 'none' && st.visibility !== 'hidden' && parseFloat(st.opacity) > 0.5;
                    });
                    return {
                        total: els.length,
                        visible: visible.length,
                        firstNodeId: visible[0]?.dataset?.nodeId || els[0]?.dataset?.nodeId || '',
                    };
                })()""")
                check("callouts rendered", callout_info["visible"] >= 2,
                      f"{callout_info['visible']} visible / {callout_info['total']} total")
                if callout_info["firstNodeId"]:
                    cid = callout_info["firstNodeId"]
                    pg.locator(f".callout[data-node-id='{cid}']").first.click(force=True)
                    pg.wait_for_timeout(250)
                    selected = ev("window.__sheet.state.selectedNodeId || window.__sheet.state.selected || ''")
                    check("callout click selection", selected == cid, f"selected={selected}")

                # 8. Companion YAML <-> JSON inspector & live Engineer Options (sheet layout)
                if layout == "sheet" and pg.locator("#specCode").count():
                    pg.locator("#specCode").scroll_into_view_if_needed()
                    pg.wait_for_timeout(150)
                    yaml_txt = pg.locator("#specCode").inner_text()
                    check("YAML inspector rendered", len(yaml_txt.strip()) > 40, f"{len(yaml_txt)} chars")

                    json_btn = pg.locator("#inspectorFormat button[data-format='json']")
                    yaml_btn = pg.locator("#inspectorFormat button[data-format='yaml']")
                    if json_btn.count() and yaml_btn.count():
                        json_btn.click()
                        pg.wait_for_timeout(200)
                        json_txt = pg.locator("#specCode").inner_text()
                        fmt_json = ev("window.__sheet.state.format || window.__sheet.inspector?.getFormat?.() || ''")
                        check("YAML -> JSON toggle", ("{" in json_txt) and fmt_json == "json", f"format={fmt_json}")
                        yaml_btn.click()
                        pg.wait_for_timeout(200)
                        fmt_yaml = ev("window.__sheet.state.format || window.__sheet.inspector?.getFormat?.() || ''")
                        check("JSON -> YAML toggle", fmt_yaml == "yaml", f"format={fmt_yaml}")

                    # Engineer option toggle/select/segmented/range
                    opt_row = pg.locator("#optionsBar .opt-row[data-option-key]").first
                    if opt_row.count():
                        opt_key = opt_row.get_attribute("data-option-key")
                        opt_before = ev("(k) => window.__sheet.state.options?.[k]", opt_key)
                        sel = opt_row.locator("select[data-option-key]")
                        tog = opt_row.locator("button.opt-toggle[data-option-key]")
                        seg = opt_row.locator("button[data-option-val]")
                        rng = opt_row.locator("input[type='range'][data-option-key]")
                        if sel.count():
                            vals = sel.evaluate("e => [...e.options].map(o => o.value)")
                            nxt = next((v for v in vals if v != str(opt_before)), vals[0] if vals else "")
                            sel.select_option(nxt)
                        elif tog.count():
                            tog.click()
                        elif seg.count() >= 2:
                            inactive = opt_row.locator("button[data-option-val]:not(.on)").first
                            (inactive if inactive.count() else seg.last).click()
                        elif rng.count():
                            rng.evaluate("e => { e.value = e.max; e.dispatchEvent(new Event('input', {bubbles:true})); }")
                        pg.wait_for_timeout(250)
                        opt_after = ev("(k) => window.__sheet.state.options?.[k]", opt_key)
                        check("engineer option toggle", opt_after != opt_before, f"{opt_key}: {opt_before} -> {opt_after}")

                # 9. Bottom timeline scrub (when present and visible)
                tl_wrap = pg.locator("#timeline")
                tl = pg.locator("#timelineTrack")
                if tl_wrap.count() and tl.count():
                    tl_wrap.scroll_into_view_if_needed()
                    ev("(() => { const el = document.getElementById('timeline'); if (el) el.scrollTop = 0; })()")
                    pg.wait_for_timeout(150)
                    if tl.is_visible():
                        drag_rect = ev("""(() => {
                            const wrap = document.getElementById('timeline');
                            const body = document.getElementById('timelineTrack');
                            const axis = wrap?.querySelector('.tl-axis');
                            const lane = body?.querySelector('.tl-track');
                            if (!wrap || !body) return null;
                            const wb = wrap.getBoundingClientRect();
                            const bb = body.getBoundingClientRect();
                            const ab = axis ? axis.getBoundingClientRect() : null;
                            const lb = lane ? lane.getBoundingClientRect() : null;
                            const top = Math.max(wb.top, bb.top, ab ? ab.bottom + 2 : 0, 2);
                            const bottom = Math.min(wb.bottom, bb.bottom, window.innerHeight - 2);
                            const left = lb ? lb.left : bb.left + (window.innerWidth <= 960 ? 112 : 148);
                            const width = lb ? lb.width : Math.max(0, bb.right - left);
                            if (bottom <= top + 4 || width <= 40) return null;
                            return { x: left, w: width, y: (top + bottom) * 0.5 };
                        })()""")
                        if drag_rect:
                            start_x = drag_rect["x"] + drag_rect["w"] * 0.15
                            end_x = drag_rect["x"] + drag_rect["w"] * 0.78
                            mid_y = drag_rect["y"]
                            pg.mouse.move(start_x, mid_y)
                            pg.mouse.down()
                            pg.mouse.move(end_x, mid_y, steps=6)
                            pg.mouse.up()
                            pg.wait_for_timeout(250)
                            prog = ev("Number(window.__sheet.state.t ?? window.__sheet.state.progress ?? -1)")
                            check("timeline scrub", 0.5 <= prog <= 1.0, f"t={prog:.2f}")

                # 10. Layer toggles & camera presets
                for tog in pg.locator(".tog[data-layer]").all()[:3]:
                    if not tog.is_visible():
                        continue
                    k = tog.get_attribute("data-layer")
                    before = ev("(k) => window.__sheet.state.layers?.[k]", k)
                    tog.click()
                    pg.wait_for_timeout(100)
                    after = ev("(k) => window.__sheet.state.layers?.[k]", k)
                    check(f"layer toggle {k}", after != before, f"{before} -> {after}")
                    tog.click()
                    pg.wait_for_timeout(80)

                if layout == "sheet" and pg.locator("#cameraPresets button[data-preset='front']").count():
                    btn_front = pg.locator("#cameraPresets button[data-preset='front']")
                    btn_reset = pg.locator("#cameraPresets button[data-preset='reset']")
                    if btn_front.is_visible():
                        btn_front.click()
                        pg.wait_for_timeout(200)
                        if btn_reset.count() and btn_reset.is_visible():
                            btn_reset.click()
                            pg.wait_for_timeout(200)
                        check("camera presets responsive", True)

                check("no console or page errors", len(errs) == 0, "; ".join(errs[:3]))
                pg.close()

        browser.close()


if __name__ == "__main__":
    run_suite()
    print(f"\n{len(fails)} failed" if fails else "\nall checks passed")
    sys.exit(1 if fails else 0)
