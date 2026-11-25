#!/usr/bin/env python3
"""Scaffold a new Inkworks Engineering Intent 3D project from the kit.

  python3 scripts/new_project.py ../wine-cooler-087836 --name wine_cooler --from starter --theme creo
  python3 scripts/new_project.py ./counter-review --from counter_087837 --layout sheet --theme creo

Copies kit/ (workbench shell, CSS, 3D kit, offline GLB loader, EMJAC material registry,
YAML/JSON inspector, vendored three.js r169, and QA tools) into DEST, copies the chosen
template assembly to js/assemblies/<name>.js with an updated id, copies the chosen theme
to DEST/DESIGN.md, and wires index.html to load it. Stdlib only.
"""
import argparse
import re
import shutil
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
KIT = HERE.parent / "kit"


def available_assemblies():
    asm_dir = KIT / "js" / "assemblies"
    if not asm_dir.exists():
        return ["starter", "counter_087837"]
    found = sorted(p.stem for p in asm_dir.glob("*.js"))
    return found or ["starter", "counter_087837"]


def rewrite_example_imports(text):
    text = re.sub(r"from\s+['\"]\.\./([^'\"]+)['\"]", r"from '../../\1'", text)
    text = re.sub(r"(['\"])\.\./\.\./(assets|data)/", r"\1../../../\2/", text)
    return text


def main():
    assemblies = available_assemblies()
    themes = sorted(p.stem for p in (KIT / "themes").glob("*.md"))
    default_theme = "creo" if "creo" in themes else (themes[0] if themes else "creo")
    default_src = "starter" if "starter" in assemblies else assemblies[0]

    ap = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    ap.add_argument("dest", help="target directory for the new Inkworks project")
    ap.add_argument("--name", help="assembly module name, e.g. wine_cooler (default: --from)")
    ap.add_argument("--from", dest="src", default=default_src, choices=assemblies,
                    help=f"starting assembly template (default: {default_src})")
    ap.add_argument("--layout", choices=["sheet", "figure"], default=None,
                    help="default layout override (else the assembly's own meta.layout)")
    ap.add_argument("--theme", choices=themes, default=default_theme,
                    help=f"starting theme copied to DEST/DESIGN.md (default: {default_theme})")
    ap.add_argument("--force", action="store_true", help="allow scaffolding into a non-empty destination")
    a = ap.parse_args()

    name = re.sub(r"[^a-z0-9_-]", "_", (a.name or a.src).lower()).strip("_-") or "assembly"
    dest = Path(a.dest).resolve()
    if dest.exists() and any(dest.iterdir()) and not a.force:
        sys.exit(f"{dest} is not empty (use --force)")

    shutil.copytree(KIT, dest, dirs_exist_ok=True, ignore=shutil.ignore_patterns("__pycache__", "*.pyc", ".DS_Store"))

    asm_dir = dest / "js" / "assemblies"
    asm_dir.mkdir(parents=True, exist_ok=True)
    src_file = KIT / "js" / "assemblies" / f"{a.src}.js"
    if not src_file.exists():
        sys.exit(f"template assembly not found: {src_file}")

    ex_dir = asm_dir / "examples"
    ex_dir.mkdir(exist_ok=True)
    for existing in sorted(asm_dir.glob("*.js")):
        (ex_dir / existing.name).write_text(rewrite_example_imports(existing.read_text()))
        existing.unlink()

    body = src_file.read_text()
    body = re.sub(r"(id\s*:\s*['\"])[^'\"]*(['\"])", rf"\g<1>{name}\2", body, count=1)
    (asm_dir / f"{name}.js").write_text(body)

    # Copy starter theme to project DESIGN.md (data-theme="project"); impeccable reads/edits this file
    design = dest / "DESIGN.md"
    if not design.exists():
        shutil.copyfile(KIT / "themes" / f"{a.theme}.md", design)

    index = dest / "index.html"
    html = index.read_text()
    attrs = f'data-assembly="{name}" data-theme="project"'
    if a.layout:
        attrs += f' data-layout="{a.layout}"'
    html = re.sub(r"<body[^>]*>", f"<body {attrs}>", html, count=1)
    index.write_text(html)

    print(f"Created Inkworks Engineering Intent project in {dest}")
    print(f"  assembly: js/assemblies/{name}.js (from {a.src})")
    print(f"  layout:   {a.layout or 'assembly default (sheet)'}")
    print(f"  theme:    DESIGN.md (from {a.theme})")
    print(f"  serve:    python3 {dest / 'serve.py'} 9081  ->  http://localhost:9081/")
    print(f"  smoke:    python3 {dest / 'tools' / 'smoke.py'} --url http://localhost:9081/ --browser chromium")
    print(f"  design:   bash {dest / 'tools' / 'design_check.sh'} http://localhost:9081/")


if __name__ == "__main__":
    main()
