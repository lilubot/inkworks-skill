#!/usr/bin/env bash
# impeccable's design detector on a running Inkworks page, per theme, at desktop and phone width.
#   tools/design_check.sh "http://localhost:9081/?m=engine"            # project DESIGN.md, else every built-in theme
#   tools/design_check.sh "http://localhost:9081/?m=engine" creo patent
# Exit 1 on any finding. Advisories are not counted. Pages are scanned paused (?play=0) so
# colour transitions mid-animation do not read as low contrast.
# The justified ignores live in .impeccable/config.json next to index.html: run from there.
# IMPECCABLE overrides the command (default: npx -y impeccable).
set -u
here=$(cd "$(dirname "$0")/.." && pwd)
url=$1; shift
if [ $# -gt 0 ]; then themes=$*
elif [ -f "$here/DESIGN.md" ]; then themes=project
else themes=$(cd "$here/themes" && ls *.md | sed 's/\.md$//'); fi
case $url in *\?*) sep='&' ;; *) sep='?' ;; esac
cd "$here" || exit 2
fail=0
for t in $themes; do
  for v in 1280x800 390x844; do
    out=$(${IMPECCABLE:-npx -y impeccable} detect --no-advisory --quiet --viewport "$v" "$url${sep}theme=$t&play=0" 2>&1 | tail -1)
    echo "$t $v: ${out:-clean}"
    [ -z "$out" ] || fail=1
  done
done
exit $fail
