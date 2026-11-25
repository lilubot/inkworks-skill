"""Walkthrough plan for EMJAC Refrigerated Counter 087837-032 on the sheet layout.

Steps through build stages, orbits the 3D viewport, toggles cutaway shell,
and returns to a clean resting frame (~24 s).
"""


def build(r, Script, c):
    st = r["stage"]
    s = Script(start=(st["x"] + st["w"] * 0.58, st["y"] + st["h"] * 0.68))
    s.wait(2.0)

    if r.get("next"):
        s.move(c(r["next"]), 0.9).wait(0.15).click()
        s.wait(1.8).click()
        s.wait(1.8).click()
        s.wait(1.8).click()

    cx = st["x"] + st["w"] * 0.50
    cy = st["y"] + st["h"] * 0.54
    s.move((cx, cy), 1.0).wait(0.15).drag((cx - 180, cy - 30), 2.0)
    s.wait(1.0).drag((cx + 180, cy + 30), 2.0)

    togs = r.get("toggles") or {}
    if "ghostShell" in togs:
        s.wait(0.6).move(c(togs["ghostShell"]), 0.9).wait(0.15).click()
        s.wait(1.6).click()

    s.wait(0.5).move((st["x"] + st["w"] * 0.72, st["y"] + st["h"] * 0.74), 1.0)
    s.wait(2.5)
    return s
