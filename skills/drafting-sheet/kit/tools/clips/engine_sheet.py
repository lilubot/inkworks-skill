"""Engine on the sheet layout: step strokes, floor it, orbit, casing off, scrub, follow cyl 3, 1/200. ~43 s."""


def build(r, Script, c):
    d = r["drive"]
    thumb = lambda v: (d["x"] + 9 + (d["w"] - 18) * v / 100, d["y"] + d["h"] / 2)
    ch = r["chart"]
    chart_at = lambda deg, row: (ch["x"] + 52 + (ch["w"] - 58) * deg / 720, ch["y"] + 4 + (ch["h"] - 20) / 4 * (row + 0.5))
    st = r["stage"]

    s = Script(start=(st["w"] * 0.69, st["h"] * 0.78))
    s.wait(3.4)
    s.move(c(r["next"]), 1.1).wait(0.15).click()            # step through cylinder 1's strokes
    s.wait(1.9).click()
    s.wait(1.9).click()
    s.wait(1.9).move(c(r["play"]), 0.55).wait(0.1).click()
    s.wait(1.0).move(thumb(15), 1.0).wait(0.2).drag(thumb(85), 1.7)   # floor it
    s.wait(1.6)
    s.move((770, 650), 1.0).wait(0.15).drag((585, 625), 2.0)          # orbit out ...
    s.wait(1.0).drag((772, 651), 2.0)                                  # ... and back (equal drags: damping)
    s.wait(0.6).move(c(r["toggles"]["casing"]), 1.0).wait(0.1).click()
    s.wait(1.6)
    s.move(chart_at(150, 1), 1.1).wait(0.15).drag(chart_at(560, 1), 2.6)
    s.wait(0.9).move(c(r["focus"][2]), 1.0).wait(0.1).click()        # follow cylinder 3
    s.wait(1.4).move(c(r["speeds"][0]), 1.0).wait(0.1).click()       # 1/200
    s.wait(1.5).move(c(r["toggles"]["casing"]), 1.0).wait(0.1).click()
    s.wait(0.4).move((1180, 760), 1.2)
    s.wait(3.0)
    return s
