"""Synthesize the film's sound effects, ambience and score (no audio assets needed).

Writes stereo 48 kHz WAVs to public/sfx/. The score follows the scene boundaries in
src/generated/timeline.json, so run tts/make_voice.py first.

Usage:  python tts/make_audio.py [--only name1,name2]
"""

import argparse
import json
import os
from pathlib import Path

import numpy as np
import soundfile as sf
from scipy.signal import butter, fftconvolve, sosfilt

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("HF_HOME", str(ROOT / "tts" / "models"))
OUT = ROOT / "public" / "sfx"
SR = 48000
rng = np.random.default_rng(7)


# ── helpers ──────────────────────────────────────────────────────────────────
def t_axis(dur):
    return np.arange(int(dur * SR)) / SR


def env_adsr(n, a=0.005, d=0.05, s=0.6, r=0.1, sustain_time=None):
    a_n, d_n, r_n = int(a * SR), int(d * SR), int(r * SR)
    s_n = max(0, n - a_n - d_n - r_n) if sustain_time is None else int(sustain_time * SR)
    e = np.concatenate([
        np.linspace(0, 1, a_n, endpoint=False),
        np.linspace(1, s, d_n, endpoint=False),
        np.full(s_n, s),
        np.linspace(s, 0, r_n),
    ])
    return np.pad(e, (0, max(0, n - e.size)))[:n]


def exp_decay(n, tau):
    return np.exp(-np.arange(n) / (tau * SR))


def bandpass(x, lo, hi, order=4):
    sos = butter(order, [lo, hi], btype="band", fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def lowpass(x, hi, order=4):
    sos = butter(order, hi, btype="low", fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def highpass(x, lo, order=4):
    sos = butter(order, lo, btype="high", fs=SR, output="sos")
    return sosfilt(sos, x, axis=0)


def pan(mono, p):
    """Equal-power pan, p in [-1 (left), 1 (right)]."""
    a = (p + 1) * np.pi / 4
    return np.stack([mono * np.cos(a), mono * np.sin(a)], axis=1)


def normalize(x, peak_db=-6.0):
    peak = np.abs(x).max()
    return x * (10 ** (peak_db / 20) / peak) if peak > 0 else x


def fade(x, fin=0.005, fout=0.02):
    n_in, n_out = int(fin * SR), int(fout * SR)
    x = x.copy()
    if n_in:
        x[:n_in] *= np.linspace(0, 1, n_in)[:, None] if x.ndim == 2 else np.linspace(0, 1, n_in)
    if n_out:
        x[-n_out:] *= np.linspace(1, 0, n_out)[:, None] if x.ndim == 2 else np.linspace(1, 0, n_out)
    return x


def reverb(x, seconds=2.2, wet=0.3, bright=6000):
    """Convolution with a decaying-noise impulse response (stereo)."""
    n = int(seconds * SR)
    ir = rng.standard_normal((n, 2)) * np.exp(-np.arange(n) / (seconds * SR / 6.5))[:, None]
    ir = lowpass(ir, bright, order=2)
    ir /= np.sqrt((ir ** 2).sum(axis=0, keepdims=True))
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    y = np.stack([fftconvolve(x[:, c], ir[:, c]) for c in range(2)], axis=1)  # length N + M - 1
    y = np.pad(y, ((0, x.shape[0] + n - y.shape[0]), (0, 0)))
    dry = np.pad(x, ((0, n), (0, 0)))
    return dry * (1 - wet) + y * wet


def save(name, x, peak_db=-6.0, rev=None):
    if x.ndim == 1:
        x = np.stack([x, x], axis=1)
    if rev:
        x = reverb(x, *rev)
    x = fade(normalize(x, peak_db), 0.002, 0.03)
    OUT.mkdir(parents=True, exist_ok=True)
    sf.write(OUT / f"{name}.wav", x.astype(np.float32), SR, subtype="PCM_16")
    print(f"  {name}.wav  {x.shape[0] / SR:5.2f}s", flush=True)


def midi(m):
    return 440.0 * 2 ** ((m - 69) / 12)


# ── sound effects ────────────────────────────────────────────────────────────
def rustle(dur=0.9):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    x = bandpass(noise, 1800, 7000)
    # bursts of leaves: random amplitude modulation
    am = np.zeros(n)
    for _ in range(26):
        c = rng.uniform(0.02, dur - 0.08) * SR
        w = rng.uniform(0.01, 0.05) * SR
        am += np.exp(-0.5 * ((np.arange(n) - c) / w) ** 2) * rng.uniform(0.4, 1)
    return x * am * env_adsr(n, 0.02, 0.1, 0.8, 0.3)


def whoosh(dur=0.8, lo=300, hi=2500):
    n = int(dur * SR)
    noise = rng.standard_normal(n)
    out = np.zeros(n)
    steps = 40
    for k in range(steps):
        a, b = k * n // steps, (k + 1) * n // steps
        p = k / steps
        fc = lo + (hi - lo) * np.sin(np.pi * p)
        seg = bandpass(noise[max(0, a - 2000): b], fc * 0.6, min(fc * 1.6, 20000), order=2)[-(b - a):]
        out[a:b] = seg
    return out * np.sin(np.pi * np.linspace(0, 1, n)) ** 1.5


def ticks(times, f0=1400, spread=300, dur=None, tau=0.018, pan_spread=0.5):
    dur = dur or (max(times) + 0.2)
    out = np.zeros((int(dur * SR), 2))
    for t in times:
        n = int(0.06 * SR)
        f = f0 + rng.uniform(-spread, spread)
        s = np.sin(2 * np.pi * f * t_axis(0.06)) * exp_decay(n, tau)
        i = int(t * SR)
        out[i: i + n] += pan(s, rng.uniform(-pan_spread, pan_spread))[: out.shape[0] - i]
    return out


def bell(freqs=(880, 1320, 2640), dur=1.6, tau=0.45):
    t = t_axis(dur)
    n = t.size
    x = sum(np.sin(2 * np.pi * f * t) * exp_decay(n, tau / (1 + i * 0.6)) / (1 + i) for i, f in enumerate(freqs))
    return x * env_adsr(n, 0.004, 0.02, 1, 0.1)


def chirp_bird(n_chirps=3):
    out = np.zeros(int(0.9 * SR))
    for k in range(n_chirps):
        d = rng.uniform(0.07, 0.11)
        t = t_axis(d)
        f = np.linspace(rng.uniform(3200, 3800), rng.uniform(4600, 5400), t.size)
        ph = 2 * np.pi * np.cumsum(f) / SR
        s = np.sin(ph + 0.8 * np.sin(2 * np.pi * 42 * t)) * np.sin(np.pi * t / d) ** 2
        i = int((0.04 + k * 0.22) * SR)
        out[i: i + s.size] += s
    return out


def beep(freq=1000.0, dur=0.025):
    """The experiment's auditory stimulus: a 25 ms tone (900-1100 Hz)."""
    t = t_axis(dur)
    s = np.sin(2 * np.pi * freq * t)
    r = int(0.002 * SR)
    s[:r] *= np.linspace(0, 1, r)
    s[-r:] *= np.linspace(1, 0, r)
    return np.pad(s, (0, int(0.05 * SR)))


def beeps_many(dur=3.4, n=26):
    """Many volunteers' trials at once: stimulus beeps at random times and places."""
    out = np.zeros((int(dur * SR), 2))
    for t in np.sort(rng.uniform(0, dur - 0.2, n)):
        b = pan(beep(rng.uniform(900, 1100)), rng.uniform(-0.8, 0.8))
        i = int(t * SR)
        out[i: i + b.shape[0]] += b[: out.shape[0] - i]
    return out


def click():
    n = int(0.06 * SR)
    out = np.zeros(n)
    for off in (0, int(0.028 * SR)):
        k = int(0.0015 * SR)
        out[off: off + k] += highpass(rng.standard_normal(k), 2000) * np.linspace(1, 0, k)
    return out


def knock(f=180, dur=0.25):
    t = t_axis(dur)
    s = np.sin(2 * np.pi * f * t) * exp_decay(t.size, 0.035) + 0.3 * highpass(rng.standard_normal(t.size), 1500) * exp_decay(t.size, 0.004)
    return s


def pop():
    t = t_axis(0.12)
    f = np.linspace(700, 320, t.size)
    return np.sin(2 * np.pi * np.cumsum(f) / SR) * exp_decay(t.size, 0.03)


def stamp():
    t = t_axis(0.5)
    thump = np.sin(2 * np.pi * np.cumsum(np.linspace(110, 55, t.size)) / SR) * exp_decay(t.size, 0.09)
    slap = bandpass(rng.standard_normal(t.size), 400, 5000) * exp_decay(t.size, 0.012)
    return thump + 0.6 * slap


def static(dur=0.3):
    n = int(dur * SR)
    return bandpass(rng.standard_normal(n), 800, 9000) * env_adsr(n, 0.003, 0.02, 0.9, 0.06)


def wind(dur=2.6):
    n = int(dur * SR)
    x = lowpass(rng.standard_normal(n), 900)
    swell = np.sin(np.pi * np.linspace(0, 1, n)) ** 2
    wob = 1 + 0.3 * np.sin(2 * np.pi * 1.3 * t_axis(dur))
    return bandpass(x, 120, 1400) * swell * wob


def whistle():
    """Alpine-marmot style alarm whistle: a sharp high note with a slight downward glide."""
    d = 0.42
    t = t_axis(d)
    f = 2900 - 500 * (t / d) ** 1.5
    ph = 2 * np.pi * np.cumsum(f) / SR
    s = np.sin(ph) + 0.25 * np.sin(2 * ph)
    return s * env_adsr(t.size, 0.012, 0.05, 0.85, 0.18)


def thud():
    t = t_axis(0.4)
    return np.sin(2 * np.pi * np.cumsum(np.linspace(90, 45, t.size)) / SR) * exp_decay(t.size, 0.07) + 0.25 * lowpass(
        rng.standard_normal(t.size), 1200
    ) * exp_decay(t.size, 0.02)


def dive():
    w = whoosh(0.45, 900, 200)
    t = thud()
    out = np.zeros(int(0.9 * SR))
    out[: w.size] += w
    i = int(0.32 * SR)
    out[i: i + t.size] += 0.8 * t[: out.size - i]
    return out


def womp():
    """A soft 'womp womp': three descending muted-brass notes, the last one wavering."""
    out = np.zeros(int(1.9 * SR))
    for k, (m, d) in enumerate([(58, 0.32), (57, 0.32), (56, 0.9)]):
        t = t_axis(d)
        vib = 1 + (0.012 * np.sin(2 * np.pi * 5.5 * t) if k == 2 else 0)
        ph = 2 * np.pi * np.cumsum(midi(m) * vib) / SR
        saw = sum(np.sin(h * ph) / h for h in range(1, 9))
        s = lowpass(saw, 1400) * env_adsr(t.size, 0.03, 0.08, 0.7, 0.15)
        i = int((k * 0.36) * SR)
        out[i: i + s.size] += s
    return out


def crickets(dur=46.0):
    out = np.zeros((int(dur * SR), 2))
    for _ in range(int(dur * 7)):
        f = rng.uniform(4200, 5200)
        start = rng.uniform(0, dur - 0.3)
        p = rng.uniform(-0.8, 0.8)
        amp = rng.uniform(0.2, 1.0)
        for k in range(rng.integers(3, 6)):
            d = 0.018
            t = t_axis(d)
            s = np.sin(2 * np.pi * f * t) * np.sin(np.pi * t / d) * amp
            i = int((start + k * 0.035) * SR)
            out[i: i + s.size] += pan(s, p)[: out.shape[0] - i]
    breeze = lowpass(rng.standard_normal((out.shape[0], 2)), 400) * 0.6
    return out + breeze


def dawn(dur=19.0):
    out = lowpass(rng.standard_normal((int(dur * SR), 2)), 500) * 0.5
    for _ in range(9):
        c = chirp_bird(rng.integers(1, 3)) * 0.35
        i = int(rng.uniform(1, dur - 1) * SR)
        out[i: i + c.size] += pan(c, rng.uniform(-0.9, 0.9))[: out.shape[0] - i]
    return out


def tv_voice():
    """The news anchor's line, in a different Kokoro voice, filtered to sound like a TV."""
    from kokoro import KPipeline

    p = KPipeline(lang_code="b", repo_id="hexgrad/Kokoro-82M")
    a = np.concatenate([r.audio.numpy() for r in p("Good evening.", voice="bm_george", speed=1.0)])
    from scipy.signal import resample_poly

    a = resample_poly(a, 2, 1)
    a = bandpass(a, 280, 3800)
    a = np.tanh(a / np.abs(a).max() * 1.6)
    return a


# ── score ────────────────────────────────────────────────────────────────────
CHORDS = {
    "D": [50, 57, 62, 66, 69],
    "Dadd9": [50, 57, 62, 64, 66],
    "A/C#": [49, 57, 61, 64, 69],
    "A": [45, 57, 61, 64, 69],
    "Bm": [47, 54, 59, 62, 66],
    "Bm9": [47, 54, 59, 61, 62],
    "G": [43, 55, 59, 62, 67],
    "Gmaj7": [43, 55, 59, 62, 66],
    "F#sus": [42, 54, 59, 61, 66],
    "Em7": [40, 55, 59, 62, 64],
    "Dmaj9": [50, 57, 61, 64, 66],
}


def pad_voice(notes, dur, attack=1.2, release=1.8):
    t = t_axis(dur + release)
    n = t.size
    out = np.zeros((n, 2))
    for m in notes:
        f = midi(m)
        for c, det in enumerate((-0.12, 0.12)):
            ph = 2 * np.pi * f * (1 + det / 100) * t
            tone = np.sin(ph) + 0.25 * np.sin(2 * ph) + 0.08 * np.sin(3 * ph)
            out[:, c] += tone / (1 + (m - 40) / 30)
    e = np.minimum(1, t / attack) * np.where(t > dur, np.exp(-(t - dur) / (release / 3)), 1)
    out *= e[:, None]
    return lowpass(out, 2400, order=2)


def pluck(m, dur=1.2, bright=1.0):
    t = t_axis(dur)
    f = midi(m)
    ph = 2 * np.pi * f * t
    s = (np.sin(ph) + 0.35 * bright * np.sin(2 * ph) + 0.12 * bright * np.sin(3 * ph)) * exp_decay(t.size, 0.28)
    s *= env_adsr(t.size, 0.003, 0.01, 1, 0.05)
    return s


def score(timeline):
    fps = timeline["fps"]
    total = timeline["totalFrames"] / fps + 2.5
    scenes = {s["id"]: s for s in timeline["scenes"]}

    def at(scene, line=None, off=0.0):
        s = scenes[scene]
        base = s["from"] / fps
        if line is None:
            return base + off
        ln = next(l for l in s["lines"] if l["id"] == line)
        return base + ln["start"] / fps + off

    def end_of(scene):
        s = scenes[scene]
        return (s["from"] + s["duration"]) / fps

    # (time, chord, pad gain, pluck density per beat, pluck brightness)
    plan = [
        (0.0, "Bm9", 0.55, 0.0, 0.0),
        (at("cold", "c3"), "Gmaj7", 0.6, 0.0, 0.0),
        (at("cold", "c4"), "F#sus", 0.7, 0.0, 0.0),
        (at("cold", "c5"), "Bm9", 0.6, 0.0, 0.0),
        (at("blur"), "Dadd9", 0.55, 0.5, 0.6),
        (at("blur", "b4"), "A/C#", 0.55, 0.5, 0.6),
        (at("blur", "b5"), "Bm", 0.55, 0.6, 0.7),
        (at("blur", "b6"), "G", 0.6, 0.6, 0.8),
        (at("catch"), "Em7", 0.5, 0.5, 0.6),
        (at("catch", "k3"), "G", 0.55, 0.75, 0.9),
        (at("catch", "k4"), "A", 0.55, 0.75, 0.9),
        (at("infer"), "Bm", 0.5, 0.5, 0.6),
        (at("infer", "i3"), "G", 0.5, 0.5, 0.6),
        (at("infer", "i4"), "D", 0.5, 0.6, 0.7),
        (at("infer", "i5"), "A/C#", 0.5, 0.6, 0.7),
        (at("infer", "i6"), "Bm", 0.5, 0.6, 0.7),
        (at("ingredients"), "G", 0.5, 0.5, 0.6),
        (at("ingredients", "g4"), "A", 0.55, 0.5, 0.6),
        (at("ingredients", "g5"), "F#sus", 0.35, 0.0, 0.0),
        (at("lab"), "Bm9", 0.4, 0.25, 0.4),
        (at("lab", "e4"), "Em7", 0.5, 1.0, 0.7),
        (at("draw"), "D", 0.5, 0.75, 0.8),
        (at("draw", "d2"), "A/C#", 0.55, 0.75, 0.8),
        (at("draw", "d3"), "Bm", 0.55, 0.75, 0.9),
        (at("draw", "d4"), "G", 0.6, 1.0, 1.0),
        (at("draw", "d4", 3.0), "A", 0.6, 1.0, 1.0),
        (at("end"), "Dmaj9", 0.6, 0.5, 0.7),
        (at("end", "r2"), "G", 0.55, 0.5, 0.7),
        (at("end", "r2", 5.0), "Dadd9", 0.25, 0.0, 0.0),
        (end_of("end") - 3.6, "Dmaj9", 0.7, 0.0, 0.0),
    ]
    beat = 60 / 84
    out = np.zeros((int(total * SR), 2))
    for k, (t0, ch, g, dens, bright) in enumerate(plan):
        t1 = plan[k + 1][0] if k + 1 < len(plan) else total - 1.5
        dur = max(0.3, t1 - t0)
        pv = pad_voice(CHORDS[ch], dur) * g
        i = int(t0 * SR)
        out[i: i + pv.shape[0]] += pv[: out.shape[0] - i]
        if dens > 0:
            notes = sorted(CHORDS[ch][1:]) + [CHORDS[ch][2] + 12]
            step = beat / 2
            nsteps = int(dur / step)
            for j in range(nsteps):
                if rng.uniform() > dens:
                    continue
                m = notes[(j * 2 + k) % len(notes)] + (12 if j % 8 == 7 else 0)
                s = pluck(m, 1.2, bright) * 0.16
                ii = int((t0 + j * step) * SR)
                out[ii: ii + s.size] += pan(s, np.sin(j * 0.9) * 0.5)[: out.shape[0] - ii]
    # a hush for the stamp and for the fox's landing
    for t_hush, length in [(at("ingredients", "g4") + scenes["ingredients"]["lines"][3]["duration"] / fps - 0.1, 0.9)]:
        a, b = int(t_hush * SR), int((t_hush + length) * SR)
        ramp = np.ones(out.shape[0])
        ramp[a:b] = 0.25
        out *= lowpass(ramp, 8, order=1)[:, None]
    out = reverb(out, 3.0, 0.35, 5000)
    return out[: int(total * SR)]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="")
    args = ap.parse_args()
    only = {s for s in args.only.split(",") if s}
    timeline = json.loads((ROOT / "src" / "generated" / "timeline.json").read_text(encoding="utf-8"))
    fps = timeline["fps"]

    pile_times = [(16 + 1.1 * k) / fps for k in range(60)]
    jobs = {
        "rustle_R": lambda: (pan(rustle(), 0.55), -5, (1.2, 0.15)),
        "whoosh": lambda: (whoosh(), -8, (1.5, 0.2)),
        "pile_v": lambda: (ticks(pile_times, 1500, 250), -9, (1.2, 0.2)),
        "pile_a": lambda: (ticks(pile_times, 820, 150, tau=0.03), -9, (1.2, 0.2)),
        "chime": lambda: (bell((784, 1175, 2350)), -8, (2.0, 0.3)),
        "wind": lambda: (pan(wind(), -0.3), -6, (1.5, 0.2)),
        "chirp_R": lambda: (pan(chirp_bird(3), 0.4), -7, (1.2, 0.2)),
        "static": lambda: (static(), -10, None),
        "pop": lambda: (pop(), -8, (0.8, 0.15)),
        "creak": lambda: (np.concatenate([knock(170), knock(150)]), -9, (1.0, 0.2)),
        "slide": lambda: (whoosh(0.45, 400, 1400), -10, (1.0, 0.2)),
        "snap": lambda: (knock(420, 0.12), -9, (0.8, 0.15)),
        "stamp": lambda: (stamp(), -4, (0.8, 0.12)),
        "beep_R": lambda: (pan(beep(1000.0), 0.45), -8, (0.5, 0.08)),
        "click": lambda: (click(), -10, None),
        "ticker": lambda: (
            ticks(list(np.cumsum(0.035 + 0.25 * np.linspace(0, 1, 34) ** 2)), 2200, 100, tau=0.006, pan_spread=0.1),
            -14,
            None,
        ),
        "beeps_many": lambda: (beeps_many(), -12, (0.6, 0.1)),
        "whistle": lambda: (whistle(), -5, (1.4, 0.2)),
        "dive": lambda: (dive(), -7, (0.8, 0.12)),
        "thud": lambda: (thud(), -6, (0.8, 0.12)),
        "sad_trombone_soft": lambda: (womp(), -10, (1.5, 0.2)),
        "crickets": lambda: (crickets(), -20, None),
        "dawn": lambda: (dawn(), -20, (1.5, 0.2)),
        "tv_evening": lambda: (tv_voice(), -4, (0.4, 0.08)),
        "score": lambda: (score(timeline), -14, None),
    }
    for name, job in jobs.items():
        if only and name not in only:
            continue
        x, peak, rev = job()
        # pad bare arrays that are shorter than the reverb tail
        save(name, x, peak, rev)


if __name__ == "__main__":
    main()
