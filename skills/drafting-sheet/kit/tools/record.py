"""Frame-exact 60 fps walkthrough clip of a Drafting Sheet page (silent), for X / socials.

The page clock is virtual: performance.now, Date.now, requestAnimationFrame, setTimeout and CSS
animations advance exactly 1/60 s per video frame, so the clip is smooth however slow each
screenshot is. A drawn cursor follows a scripted path and REAL mouse events drive the page, so
every click, slider drag, orbit and chart scrub in the video is the page actually responding.

The choreography lives in a plan file (tools/clips/*.py) with a build(rects) function.

  python3 serve.py 9081 &
  python3 tools/record.py out.mp4 --plan tools/clips/engine_sheet.py --url "http://localhost:9081/?m=engine"
  python3 tools/record.py /tmp/check --plan ... --frames-every 30           # stills only, fast check
  python3 tools/record.py x --plan ... --dry --log state.json               # per-frame state, for a sound track

Needs: pip install playwright && playwright install webkit; ffmpeg on PATH.
Viewport 1600x900 at 1.2x device scale, scaled to 1920x1080.
"""
import argparse, importlib.util, json, math, os, subprocess, sys, time
from playwright.sync_api import TimeoutError as PlaywrightTimeout, sync_playwright

FPS = 60
W, H, SCALE = 1600, 900, 1.2

CLOCK = """
(() => {
  const realNow = performance.now.bind(performance);
  let vt = realNow();
  const dateOffset = Date.now() - vt;
  const queue = new Map(); let nextId = 1;
  const timers = new Map(); let tid = 1;
  performance.now = () => vt;
  Date.now = () => Math.round(dateOffset + vt);
  window.requestAnimationFrame = (cb) => { const id = nextId++; queue.set(id, cb); return id; };
  window.cancelAnimationFrame = (id) => { queue.delete(id); };
  window.setTimeout = (fn, ms = 0, ...a) => { const id = tid++; timers.set(id, { at: vt + (+ms || 0), fn, a }); return id; };
  window.clearTimeout = (id) => { timers.delete(id); };
  window.__step = (dtMs) => {
    vt += dtMs;
    const due = [...timers.entries()].filter(([, t]) => t.at <= vt).sort((x, y) => x[1].at - y[1].at);
    for (const [id, t] of due) { timers.delete(id); try { t.fn(...t.a); } catch (e) { console.error(e); } }
    const cbs = [...queue.values()]; queue.clear();
    for (const cb of cbs) { try { cb(vt); } catch (e) { console.error(e); } }
    for (const an of document.getAnimations()) {
      if (an.__v0 === undefined) { an.__v0 = vt; an.pause(); }
      const t = vt - an.__v0, end = an.effect ? an.effect.getComputedTiming().endTime : 0;
      if (t >= end) an.finish(); else an.currentTime = t;
    }
  };
})();
"""

# drawn cursor: ink arrow with a white keyline, a red ring that blooms on press
CURSOR = """
(() => {
  const el = document.createElement('div');
  el.id = '__cur';
  el.innerHTML = `<svg width="26" height="30" viewBox="0 0 26 30"><path d="M3 2 L3 23 L8.6 17.8 L12.4 26.6 L16.2 25 L12.5 16.4 L20 16.4 Z"
      fill="#161b26" stroke="#fff" stroke-width="1.8" stroke-linejoin="round"/></svg><i></i>`;
  const css = document.createElement('style');
  css.textContent = `#__cur{position:fixed;left:0;top:0;z-index:99999;pointer-events:none;will-change:transform}
    #__cur svg{position:absolute;left:-3px;top:-2px;filter:drop-shadow(0 2px 3px rgba(22,27,38,.25));transform-origin:3px 2px}
    #__cur i{position:absolute;left:-18px;top:-18px;width:36px;height:36px;border-radius:50%;border:2px solid #e5482f;opacity:0}`;
  document.head.appendChild(css); document.body.appendChild(el);
  const svg = el.querySelector('svg'), ring = el.querySelector('i');
  window.__cursor = (x, y, press, ringK) => {
    el.style.transform = `translate(${x}px, ${y}px)`;
    svg.style.transform = `scale(${press ? 0.88 : 1})`;
    if (ringK >= 0 && ringK <= 1) { ring.style.opacity = String(0.9 * (1 - ringK)); ring.style.transform = `scale(${0.45 + 0.9 * ringK})`; }
    else ring.style.opacity = '0';
  };
})();
"""

# every element a plan may aim at; missing ones come back as null
RECTS = """() => {
  const q = (s) => { const e = document.querySelector(s); if (!e) return null; const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; };
  const all = (s) => [...document.querySelectorAll(s)].map((e) => { const b = e.getBoundingClientRect(); return { x: b.left, y: b.top, w: b.width, h: b.height }; });
  const togs = {}; document.querySelectorAll('.tog').forEach((e) => { const b = e.getBoundingClientRect(); togs[e.dataset.layer] = { x: b.left, y: b.top, w: b.width, h: b.height }; });
  return { next: q('#nextBtn'), prev: q('#prevBtn'), play: q('#playBtn'), drive: q('#drive'), chart: q('#chart'),
           focus: all('#focusSeg button'), speeds: all('#slowSeg button'), phases: all('#phaseList li'),
           actions: all('.act'), toggles: togs, stage: q('#stage'), viewport: { w: innerWidth, h: innerHeight } };
}"""


def ease(k):
    k = min(max(k, 0.0), 1.0)
    return 4 * k * k * k if k < 0.5 else 1 - (-2 * k + 2) ** 3 / 2


def centre(r):
    return (r["x"] + r["w"] / 2, r["y"] + r["h"] / 2)


class Script:
    """A timeline of cursor moves and mouse button events, in seconds and CSS px."""

    def __init__(self, start):
        self.moves, self.events = [], []
        self.pos, self.t = start, 0.0

    def wait(self, s):
        self.t += s
        return self

    def move(self, to, dur=0.9, fn=ease):
        self.moves.append((self.t, self.t + dur, self.pos, to, fn))
        self.pos, self.t = to, self.t + dur
        return self

    def click(self, hold=0.12):
        self.events += [(self.t, "down"), (self.t + hold, "up")]
        self.t += hold
        return self

    def drag(self, to, dur, fn=ease):
        self.events.append((self.t, "down"))
        self.t += 0.1
        self.move(to, dur, fn)
        self.events.append((self.t + 0.08, "up"))
        self.t += 0.08
        return self

    def at(self, t):
        x, y = self.pos if not self.moves else self.moves[0][2]
        for t0, t1, a, b, fn in self.moves:
            if t < t0:
                break
            k = fn((t - t0) / (t1 - t0)) if t1 > t0 else 1.0
            dx, dy = b[0] - a[0], b[1] - a[1]
            n = math.hypot(dx, dy) or 1.0
            lift = math.sin(math.pi * k) * 0.06 * n          # a soft arc: hand-made, not ruler-straight
            sgn = 1 if dx >= 0 else -1
            x = a[0] + dx * k + (-dy / n) * lift * sgn
            y = a[1] + dy * k + (dx / n) * lift * sgn * 0.5
        return x, y


def load_plan(path):
    spec = importlib.util.spec_from_file_location("plan", path)
    mod = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(mod)
    return mod


def shoot(page, tries=4):
    for k in range(tries):
        try:
            return page.screenshot(type="png", timeout=20000)
        except PlaywrightTimeout:
            print(f"  screenshot stalled, retry {k + 1}", flush=True)   # WebKit stalls ~1 in 100 at 1080p
    sys.exit("screenshot kept stalling")


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("out", help=".mp4 path, or a folder with --frames-every")
    ap.add_argument("--plan", required=True, help="choreography file with build(rects, Script, centre)")
    ap.add_argument("--url", default="http://localhost:9081/")
    ap.add_argument("--crf", type=int, default=16)
    ap.add_argument("--frames-every", type=int, default=0, help="only save every Nth frame as PNG (quick check)")
    ap.add_argument("--max-seconds", type=float, default=180)
    ap.add_argument("--log", default="", help="write per-frame state [rate, input, theta, slow, playing] as JSON (sound tracks)")
    ap.add_argument("--dry", action="store_true", help="no screenshots, just run the timeline (use with --log)")
    args = ap.parse_args()
    plan = load_plan(args.plan)

    ff = None
    if args.dry:
        pass
    elif args.frames_every:
        os.makedirs(args.out, exist_ok=True)
    else:
        os.makedirs(os.path.dirname(os.path.abspath(args.out)), exist_ok=True)
        ff = subprocess.Popen([
            "ffmpeg", "-v", "error", "-y", "-f", "image2pipe", "-framerate", str(FPS), "-c:v", "png", "-i", "-",
            "-vf", "scale=1920:1080:flags=lanczos", "-c:v", "libx264", "-preset", "slow", "-crf", str(args.crf),
            "-pix_fmt", "yuv420p", "-profile:v", "high", "-level", "4.2", "-r", str(FPS), "-movflags", "+faststart", args.out,
        ], stdin=subprocess.PIPE)

    with sync_playwright() as p:
        browser = p.webkit.launch()
        page = browser.new_page(viewport={"width": W, "height": H}, device_scale_factor=SCALE)
        errors = []
        page.on("pageerror", lambda e: errors.append(str(e)))
        page.on("console", lambda m: m.type == "error" and errors.append(m.text))
        page.add_init_script(CLOCK)
        sep = "&" if "?" in args.url else "?"
        page.goto(f"{args.url}{sep}rec={time.time()}", wait_until="networkidle")
        # rAF is frozen under the virtual clock, so poll on an interval, then pre-roll a few frames
        page.wait_for_function("window.__sheet !== undefined", timeout=30000, polling=100)
        page.evaluate("document.fonts.ready")
        page.wait_for_timeout(600)
        for _ in range(3):
            page.evaluate("(dt) => window.__step(dt)", 0.001)
        page.evaluate("window.__sheet.layout()")
        page.evaluate(CURSOR)
        s = plan.build(page.evaluate(RECTS), Script, centre)
        end = min(s.t, args.max_seconds)
        print(f"plan: {end:.1f}s, {int(end * FPS)} frames", flush=True)

        dt = 1000 / FPS
        events = sorted(s.events)
        ei, pressed, last_press = 0, False, -9.0
        n, started, log = 0, time.monotonic(), []
        x, y = s.at(0)
        page.mouse.move(x, y)
        while n / FPS <= end:
            t = n / FPS
            nx, ny = s.at(t)
            if (nx, ny) != (x, y):
                x, y = nx, ny
                page.mouse.move(x, y)
            while ei < len(events) and events[ei][0] <= t:
                if events[ei][1] == "down":
                    page.mouse.down(); pressed = True; last_press = t
                else:
                    page.mouse.up(); pressed = False
                ei += 1
            ring = (t - last_press) / 0.45
            page.evaluate("([x, y, p, k]) => window.__cursor(x, y, p, k)", [x, y, pressed, ring if ring <= 1 else -1])
            page.evaluate("(dt) => window.__step(dt)", dt)
            if args.log:
                log.append(page.evaluate("(() => { const s = window.__sheet.state; return [s.rate, s.input, s.theta, s.slow, s.playing ? 1 : 0]; })()"))
            if args.dry:
                pass
            elif ff:
                ff.stdin.write(shoot(page))
            elif n % args.frames_every == 0:
                with open(os.path.join(args.out, f"f{n:05d}.png"), "wb") as fh:
                    fh.write(shoot(page))
            n += 1
            if n % 300 == 0:
                st = page.evaluate("(() => { const s = window.__sheet.state; return `rate ${Math.round(s.rate)} focus ${s.focus + 1} slow ${s.slow} playing ${s.playing}`; })()")
                print(f"  {t:5.1f}s  {n} frames  ({time.monotonic() - started:.0f}s real)  {st}", flush=True)
        browser.close()
    if ff:
        ff.stdin.close()
        ff.wait()
    if args.log:
        with open(args.log, "w") as fh:
            json.dump({"fps": FPS, "fields": ["rate", "input", "theta", "slow", "playing"], "frames": log}, fh)
        print(f"logged {len(log)} frames to {args.log}")
    print(f"wrote {args.out}: {n} frames, {n / FPS:.2f}s")
    print("\n".join(errors) if errors else "no page errors")


if __name__ == "__main__":
    main()
