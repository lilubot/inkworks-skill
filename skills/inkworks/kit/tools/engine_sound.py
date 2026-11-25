"""Code-synthesised inline-4 engine sound, driven by a clip's own per-frame state, muxed onto the video.

    python3 tools/record.py x --plan tools/clips/engine_sheet.py --url "http://localhost:9081/?m=engine" --dry --log state.json
    python3 tools/engine_sound.py state.json engine.mp4 engine-sound.mp4 [--wav engine-sound.wav]

The sound is the engine at REAL speed (what you'd hear standing next to it), not slowed with the
visuals: firing rate = rpm / 30 Hz (4 cylinders, 2 firings per crank turn), so it follows the
tachometer. Throttle and acceleration set the load: more load = louder, brighter, more intake roar.
Log fields per frame: [rate (rpm), input (throttle 0..1), theta, slow, playing].
Needs numpy, scipy and ffmpeg. Use it as the pattern for other machines' sound tracks.
"""
import argparse, json, subprocess
import numpy as np
from scipy import signal

SR = 48000


def smooth1(x, ms):
    a = np.exp(-1.0 / (SR * ms / 1000))
    return signal.lfilter([1 - a], [1, -a], x, zi=[x[0] * a])[0]


def bp(x, f, q):
    b, a = signal.iirpeak(f, q, SR)
    return signal.lfilter(b, a, x)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("log")
    ap.add_argument("video")
    ap.add_argument("out")
    ap.add_argument("--wav", default="")
    ap.add_argument("--seed", type=int, default=7)
    a = ap.parse_args()
    rng = np.random.default_rng(a.seed)

    d = json.load(open(a.log))
    fps, fr = d["fps"], np.array(d["frames"], dtype=float)
    dur = len(fr) / fps
    n = int(dur * SR)
    t = np.arange(n) / SR
    ft = np.arange(len(fr)) / fps
    rpm = smooth1(np.interp(t, ft, fr[:, 0]), 15)
    thr = smooth1(np.interp(t, ft, fr[:, 1]), 60)
    # a living engine is never perfectly steady
    rpm *= 1 + 0.004 * np.sin(2 * np.pi * 0.7 * t) + 0.003 * smooth1(rng.standard_normal(n), 120) * 40

    # load: throttle plus how hard the engine is accelerating; settles back when rpm holds
    accel = np.gradient(rpm) * SR                      # rpm per second
    load = np.clip(0.18 + 0.55 * thr + accel / 5200, 0, 1)
    load = smooth1(load, 140)

    # ---- firing pulses: one every 180 crank degrees ----
    crank = np.cumsum(rpm / 60 * 360 / SR)
    k = np.floor(crank / 180).astype(np.int64)
    fire = np.flatnonzero(np.diff(k) > 0) + 1
    cyl_gain = np.array([1.0, 0.84, 0.94, 0.79])        # small cylinder-to-cylinder differences = the burble
    amp = cyl_gain[k[fire] % 4] * (1 + 0.07 * rng.standard_normal(len(fire)))
    amp *= 0.55 + 0.6 * load[fire]
    imp = np.zeros(n)
    imp[fire] = amp

    # smooth pressure pulse (t/tau e^(1-t/tau)) + a short burst of combustion noise per firing
    kt = np.arange(int(0.012 * SR)) / SR
    tau = 0.00045
    pulse = signal.fftconvolve(imp, (kt / tau) * np.exp(1 - kt / tau))[:n]
    env = signal.fftconvolve(imp, np.exp(-kt / 0.0032))[:n]
    burst = env * smooth1(rng.standard_normal(n), 0.08) * 0.9

    x = pulse + burst
    # exhaust system: a few broad resonances + a short pipe comb
    body = (0.8 * bp(x, 75, 1.2) + 0.8 * bp(x, 155, 1.8) + 0.7 * bp(x, 330, 2.5)
            + 0.5 * bp(x, 720, 2.2) + 0.25 * bp(x, 1650, 1.6) + 0.1 * bp(x, 2600, 1.4))
    dly = int(0.0047 * SR)
    comb = signal.lfilter([1.0], np.r_[1.0, np.zeros(dly - 1), -0.38], body)
    low = signal.sosfilt(signal.butter(2, 140, "lowpass", fs=SR, output="sos"), x) * 2.2

    # brightness rises with load and rpm: crossfade a dark and a bright version
    dark = signal.sosfilt(signal.butter(2, 650, "lowpass", fs=SR, output="sos"), comb)
    bright = signal.sosfilt(signal.butter(2, 4200, "lowpass", fs=SR, output="sos"), comb)
    mixb = np.clip(load * 0.8 + (rpm - 900) / 9000, 0, 1)
    exhaust = dark * (1 - mixb) + bright * mixb + low

    # intake roar (throttle open) and mechanical hiss (rpm)
    noise = rng.standard_normal(n)
    intake = signal.sosfilt(signal.butter(2, [380, 1900], "bandpass", fs=SR, output="sos"), noise)
    intake *= (0.02 + 0.22 * thr * load) * (0.7 + 0.3 * env / (env.max() + 1e-9) * 6).clip(0, 1.6)
    mech = signal.sosfilt(signal.butter(2, 3200, "highpass", fs=SR, output="sos"), noise[::-1].copy())
    cam = 0.6 + 0.4 * np.maximum(0, np.sin(crank * np.pi / 180 * 2)) ** 8   # valve-train tick, twice per turn
    mech *= 0.012 * (rpm / 6000) * cam

    y = exhaust / np.percentile(np.abs(exhaust), 99.5) * 0.5 + intake + mech
    # idle sits well below the rev: volume follows load and rpm
    y *= (0.30 + 0.70 * load) * (0.5 + 0.5 * np.clip(rpm / 5400, 0, 1))
    y = np.tanh(2.2 * y) / np.tanh(2.2)

    # small room + slight stereo width
    ir_t = np.arange(int(0.5 * SR)) / SR
    irl = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.11)
    irr = rng.standard_normal(len(ir_t)) * np.exp(-ir_t / 0.11)
    irl[: int(0.008 * SR)] = 0
    irr[: int(0.011 * SR)] = 0
    rl = signal.fftconvolve(y, irl)[:n]
    rr = signal.fftconvolve(y, irr)[:n]
    rs = 0.16 * np.abs(y).max() / max(np.abs(rl).max(), 1e-9)
    shift = int(0.0005 * SR)
    L = y + rs * rl
    R = np.r_[np.zeros(shift), y[:-shift]] + rs * rr

    fade = np.ones(n)
    fi, fo = int(0.35 * SR), int(1.2 * SR)
    fade[:fi] = np.linspace(0, 1, fi) ** 2
    fade[-fo:] = np.linspace(1, 0, fo) ** 1.5
    st = np.stack([L, R], 1) * fade[:, None]
    st = signal.sosfilt(signal.butter(2, 28, "highpass", fs=SR, output="sos"), st, axis=0)   # no DC/sub rumble
    st /= np.abs(st).max() / 0.89

    wav = a.wav or a.out.rsplit(".", 1)[0] + ".wav"
    from scipy.io import wavfile
    wavfile.write(wav, SR, (st * 32767).astype(np.int16))
    print(f"wrote {wav}: {dur:.2f}s, {len(fire)} firings, rpm {rpm.min():.0f}-{rpm.max():.0f}")

    subprocess.run([
        "ffmpeg", "-v", "error", "-y", "-i", a.video, "-i", wav,
        "-map", "0:v", "-map", "1:a", "-c:v", "copy",
        "-af", "loudnorm=I=-16:TP=-1.5:LRA=11", "-ar", "48000", "-c:a", "aac", "-b:a", "192k",
        "-shortest", "-movflags", "+faststart", a.out,
    ], check=True)
    print(f"wrote {a.out}")


if __name__ == "__main__":
    main()
