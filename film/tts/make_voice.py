"""Generate the narration with Kokoro TTS and derive the film timeline from it.

Reads ../narration.json and writes:
  public/voice/<line_id>.wav    one 48 kHz mono clip per narration line
  src/generated/timeline.json   scene and line frame positions, captions
  out/film.srt                  subtitles for platforms that take a caption file

Scene durations are derived from the spoken audio: each scene lasts
lead + sum(gap + line duration) + tail, so re-voicing the script (another
voice, another speed, edited lines) re-times the whole film automatically.

Usage:  python tts/make_voice.py [--only c1,c2] [--voice af_heart] [--speed 1.0]
"""

import argparse
import json
import math
import os
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("HF_HOME", str(ROOT / "tts" / "models"))

import numpy as np  # noqa: E402
import soundfile as sf  # noqa: E402
from scipy.signal import resample_poly  # noqa: E402

SR_TTS = 24000
SR_OUT = 48000
TARGET_RMS_DB = -20.0  # loudness of voiced segments
PEAK_CEILING_DB = -1.0
PRE_ROLL = 0.05  # seconds kept before speech onset
POST_ROLL = 0.12  # seconds kept after speech offset


def db_to_lin(db):
    return 10.0 ** (db / 20.0)


def trim_and_level(audio: np.ndarray, sr: int) -> np.ndarray:
    """Trim leading/trailing silence and level the clip to a common loudness."""
    win = int(0.02 * sr)
    env = np.sqrt(np.convolve(audio ** 2, np.ones(win) / win, mode="same"))
    thresh = max(env.max(), 1e-9) * db_to_lin(-40.0)  # 40 dB below the loudest syllable
    voiced = np.nonzero(env > thresh)[0]
    if voiced.size == 0:
        return audio
    start = max(0, voiced[0] - int(PRE_ROLL * sr))
    end = min(audio.size, voiced[-1] + int(POST_ROLL * sr))
    clip = audio[start:end].astype(np.float64)
    active = env[start:end] > thresh
    rms = np.sqrt(np.mean(clip[active] ** 2)) if active.any() else np.sqrt(np.mean(clip ** 2))
    clip *= db_to_lin(TARGET_RMS_DB) / max(rms, 1e-9)
    peak = np.abs(clip).max()
    if peak > db_to_lin(PEAK_CEILING_DB):
        clip *= db_to_lin(PEAK_CEILING_DB) / peak
    # 5 ms fades so clip edges never click
    fade = int(0.005 * sr)
    clip[:fade] *= np.linspace(0, 1, fade)
    clip[-fade:] *= np.linspace(1, 0, fade)
    return clip.astype(np.float32)


def synthesize(pipeline, text: str, voice: str, speed: float) -> np.ndarray:
    chunks = []
    for result in pipeline(text, voice=voice, speed=speed, split_pattern=r"\n+"):
        audio = result.audio if hasattr(result, "audio") else result[2]
        if audio is None:
            continue
        chunks.append(audio.detach().cpu().numpy() if hasattr(audio, "detach") else np.asarray(audio))
    if not chunks:
        raise RuntimeError(f"Kokoro returned no audio for: {text!r}")
    return np.concatenate(chunks)


def split_caption(text: str, max_chars: int = 50):
    """Split a caption into chunks short enough for one or two lines on screen."""
    if len(text) <= max_chars:
        return [text]
    # prefer breaking after sentence ends, then colons/commas, nearest to the middle
    candidates = [m.end() for m in re.finditer(r"[.?!:;,] ", text)]
    if not candidates:
        candidates = [m.start() for m in re.finditer(r" ", text)]
    mid = len(text) / 2
    cut = min(candidates, key=lambda i: abs(i - mid))
    left, right = text[:cut].strip(), text[cut:].strip()
    return split_caption(left, max_chars) + split_caption(right, max_chars)


def merge_short(chunks, dur, min_seconds=1.2, max_chars=62):
    total = sum(len(c) for c in chunks)
    out = list(chunks)
    changed = True
    while changed and len(out) > 1:
        changed = False
        for i, c in enumerate(out):
            if dur * len(c) / total >= min_seconds:
                continue
            # merge with the shorter neighbour, if the result still fits one caption line
            j = i + 1 if i == 0 else i - 1 if i == len(out) - 1 else (i - 1 if len(out[i - 1]) < len(out[i + 1]) else i + 1)
            a, b = sorted((i, j))
            merged = f"{out[a]} {out[b]}"
            if len(merged) <= max_chars:
                out[a:b + 1] = [merged]
                changed = True
                break
    return out


def srt_time(t: float) -> str:
    ms = int(round(t * 1000))
    h, ms = divmod(ms, 3600_000)
    m, ms = divmod(ms, 60_000)
    s, ms = divmod(ms, 1000)
    return f"{h:02d}:{m:02d}:{s:02d},{ms:03d}"


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", default="", help="comma-separated line ids to (re)generate")
    ap.add_argument("--voice", default=None)
    ap.add_argument("--speed", type=float, default=None)
    ap.add_argument("--timeline-only", action="store_true", help="skip TTS, rebuild timeline from existing clips")
    args = ap.parse_args()

    spec = json.loads((ROOT / "narration.json").read_text(encoding="utf-8"))
    fps = spec["fps"]
    voice = args.voice or spec["voice"]
    speed = args.speed or spec["speed"]
    only = {s for s in args.only.split(",") if s}

    voice_dir = ROOT / "public" / "voice"
    voice_dir.mkdir(parents=True, exist_ok=True)

    pipeline = None
    if not args.timeline_only:
        from kokoro import KPipeline

        lang = voice[0]  # 'a' = American English, 'b' = British English
        pipeline = KPipeline(lang_code=lang, repo_id="hexgrad/Kokoro-82M")

    timeline = {"fps": fps, "voice": voice, "speed": speed, "scenes": [], "captions": []}
    t_scene = 0.0
    frame_cursor = 0
    srt_entries = []

    for scene in spec["scenes"]:
        lines_out = []
        t = scene.get("lead", 0.0)
        for i, line in enumerate(scene["lines"]):
            wav_path = voice_dir / f"{line['id']}.wav"
            # "keep": a hand-picked take (e.g. the one Whisper heard correctly) is never overwritten
            locked = line.get("keep", False) and wav_path.exists() and line["id"] not in only
            if pipeline is not None and not locked and (not only or line["id"] in only):
                raw = synthesize(pipeline, line["text"], voice, speed)
                clip = trim_and_level(raw, SR_TTS)
                clip = resample_poly(clip, SR_OUT // SR_TTS, 1).astype(np.float32)
                sf.write(wav_path, clip, SR_OUT, subtype="PCM_16")
                print(f"  {line['id']}: {clip.size / SR_OUT:5.2f}s  {line['text']}", flush=True)
            if not wav_path.exists():
                sys.exit(f"missing clip {wav_path}; run without --timeline-only first")
            dur = sf.info(wav_path).frames / sf.info(wav_path).samplerate
            t += line.get("gap", 0.0) if i > 0 else 0.0
            start_f = round(t * fps)
            dur_f = math.ceil(dur * fps)
            lines_out.append({
                "id": line["id"],
                "text": line["text"],
                "caption": line.get("caption", line["text"]),
                "file": f"voice/{line['id']}.wav",
                "start": start_f,  # frame offset within the scene
                "duration": dur_f,
                "seconds": round(dur, 3),
            })
            # captions: split long lines, timing proportional to characters; a chunk that
            # would be on screen for under ~1.2 s is merged back into its neighbour
            chunks = merge_short(split_caption(line.get("caption", line["text"])), dur)
            total_chars = sum(len(c) for c in chunks)
            c_start = t_scene + t
            for c in chunks:
                c_dur = dur * len(c) / total_chars
                timeline["captions"].append({
                    "text": c,
                    "from": frame_cursor + round((c_start - t_scene) * fps),
                    "duration": max(1, round(c_dur * fps)),
                })
                srt_entries.append((c_start, c_start + c_dur, c))
                c_start += c_dur
            t += dur
        t += scene.get("tail", 0.0)
        scene_frames = math.ceil(t * fps)
        timeline["scenes"].append({
            "id": scene["id"],
            "title": scene["title"],
            "from": frame_cursor,
            "duration": scene_frames,
            "lines": lines_out,
        })
        frame_cursor += scene_frames
        t_scene = frame_cursor / fps

    timeline["totalFrames"] = frame_cursor
    gen_dir = ROOT / "src" / "generated"
    gen_dir.mkdir(parents=True, exist_ok=True)
    (gen_dir / "timeline.json").write_text(json.dumps(timeline, indent=1), encoding="utf-8")

    out_dir = ROOT / "out"
    out_dir.mkdir(exist_ok=True)
    with open(out_dir / "film.srt", "w", encoding="utf-8") as f:
        for k, (a, b, text) in enumerate(srt_entries, 1):
            f.write(f"{k}\n{srt_time(a)} --> {srt_time(b)}\n{text}\n\n")

    total = frame_cursor / fps
    print(f"\nTotal: {total:.1f}s ({frame_cursor} frames)", flush=True)
    for s in timeline["scenes"]:
        print(f"  {s['id']:12s} {s['from'] / fps:6.1f}s  +{s['duration'] / fps:5.1f}s", flush=True)


if __name__ == "__main__":
    main()
