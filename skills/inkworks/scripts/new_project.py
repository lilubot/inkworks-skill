#!/usr/bin/env python3
"""Start a new Inkworks project from the kit.

  python3 scripts/new_project.py ../how-a-lock-works --name lock --from starter --layout sheet
  python3 scripts/new_project.py ./pump-page --from pump --layout figure --theme blueprint

Copies kit/ (page shell, css, js kit, vendored three.js, tools) into DEST, copies the chosen
example mechanism to js/mechanisms/<name>.js (renamed id), and points index.html at it.
The other example mechanisms are copied too (under js/mechanisms/examples/) as references.
Stdlib only.
"""
import argparse, re, shutil, sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIT = HERE.parent / "kit"


def main():
    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dest")
    ap.add_argument("--name", help="mechanism file name, e.g. lock (default: --from)")
    ap.add_argument("--from", dest="src", default="starter", choices=["starter", "engine", "pump", "regen"])
    ap.add_argument("--layout", choices=["sheet", "figure"], default=None, help="default layout (else the mechanism's own)")
    themes = sorted(p.stem for p in (KIT / "themes").glob("*.md"))
    ap.add_argument("--theme", choices=themes, default="drafting",
                    help="starting theme, copied to DEST/DESIGN.md: the page's theme and impeccable's design context")
    ap.add_argument("--force", action="store_true", help="allow a non-empty destination")
    a = ap.parse_args()

    name = re.sub(r"[^a-z0-9_-]", "-", (a.name or a.src).lower()).strip("-") or "mechanism"
    dest = Path(a.dest).resolve()
    if dest.exists() and any(dest.iterdir()) and not a.force:
        sys.exit(f"{dest} is not empty (use --force)")

    shutil.copytree(KIT, dest, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store"))
    mech_dir = dest / "js" / "mechanisms"
    ex_dir = mech_dir / "examples"
    ex_dir.mkdir(exist_ok=True)
    for f in ("starter.js", "engine.js", "pump.js", "regen.js"):
        src = mech_dir / f
        if src.exists():
            text = src.read_text()
            (ex_dir / f).write_text(text.replace("from '../kit.js'", "from '../../kit.js'"))
            src.unlink()
    body = (KIT / "js" / "mechanisms" / f"{a.src}.js").read_text()
    body = re.sub(r"id: '[^']*'", f"id: '{name}'", body, count=1)
    (mech_dir / f"{name}.js").write_text(body)

    index = dest / "index.html"
    html = index.read_text()
    # the project's DESIGN.md is its theme (data-theme="project"); impeccable reads and edits the same file
    design = dest / "DESIGN.md"
    if not design.exists():
        shutil.copyfile(KIT / "themes" / f"{a.theme}.md", design)
    attrs = f'data-mechanism="{name}" data-theme="project"' + (f' data-layout="{a.layout}"' if a.layout else "")
    html = re.sub(r"<body[^>]*>", f"<body {attrs}>", html, count=1)
    index.write_text(html)

    print(f"new Inkworks project in {dest}")
    print(f"  mechanism: js/mechanisms/{name}.js (from {a.src})   layout: {a.layout or 'mechanism default'}   theme: DESIGN.md (from {a.theme})")
    print(f"  serve:     python3 {dest / 'serve.py'} 9081   ->  http://localhost:9081/")
    print(f"  check:     python3 {dest / 'tools/smoke.py'} --url http://localhost:9081/")


if __name__ == "__main__":
    main()
