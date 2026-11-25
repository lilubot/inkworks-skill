"""Pump on the figure layout: step the three phases, pump faster, orbit, barrel off, let air out, slow down. ~42 s."""


def build(r, Script, c):
    d = r["drive"]
    thumb = lambda v: (d["x"] + 9 + (d["w"] - 18) * v / 100, d["y"] + d["h"] / 2)
    st = r["stage"]

    s = Script(start=(st["w"] * 0.62, st["h"] * 0.62))
    s.wait(3.2)
    s.move(c(r["next"]), 1.1).wait(0.15).click()            # step: up -> squeeze -> deliver
    s.wait(2.0).click()
    s.wait(2.0).click()
    s.wait(2.0).move(c(r["play"]), 0.5).wait(0.1).click()
    s.wait(0.8).move(c(r["speeds"][2]), 0.9).wait(0.1).click()          # real speed
    s.wait(0.8).move(thumb(40), 1.0).wait(0.2).drag(thumb(90), 1.6)    # pump harder
    s.wait(4.0)
    s.move((640, 560), 1.0).wait(0.15).drag((470, 545), 1.9)           # orbit out ...
    s.wait(0.9).drag((642, 561), 1.9)                                  # ... and back
    s.wait(0.6).move(c(r["toggles"]["barrel"]), 1.1).wait(0.1).click() # barrel off: see the piston bare
    s.wait(3.0).click()
    s.wait(0.6).move(c(r["actions"][0]), 1.1).wait(0.1).click()       # let air out
    s.wait(3.2).move(c(r["speeds"][0]), 1.0).wait(0.1).click()          # 1/4 speed
    s.wait(0.4).move((st["w"] * 0.66, st["h"] * 0.55), 1.2)
    s.wait(4.0)
    return s
