"""Check the narration by transcribing every clip back with Whisper.

Text-to-speech can silently drop or garble words (for example words missing
from its pronunciation dictionary), so each clip in public/voice is
transcribed and compared word by word with its script line.

Usage:  python tts/verify_voice.py [--model small.en]
"""

import argparse
import json
import os
import re
from difflib import SequenceMatcher
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
os.environ.setdefault("HF_HOME", str(ROOT / "tts" / "models"))

# Whisper writes numbers as digits; the script spells them out.
DIGITS_TO_WORDS = [(r"45,?000", "forty-five thousand"), (r"\b15\b", "fifteen")]


def words(text: str):
    text = text.lower().replace("’", "'")
    for pattern, spelled in DIGITS_TO_WORDS:
        text = re.sub(pattern, spelled, text)
    text = re.sub(r"[^a-z0-9' -]", " ", text).replace("-", " ")
    return [w for w in text.split() if w]


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--model", default="small.en")
    args = ap.parse_args()

    from faster_whisper import WhisperModel

    model = WhisperModel(args.model, device="cpu", compute_type="int8")
    spec = json.loads((ROOT / "narration.json").read_text(encoding="utf-8"))
    worst = []
    for scene in spec["scenes"]:
        for line in scene["lines"]:
            wav = ROOT / "public" / "voice" / f"{line['id']}.wav"
            segments, _ = model.transcribe(str(wav), language="en", beam_size=5)
            heard = " ".join(s.text.strip() for s in segments)
            ref, hyp = words(line["text"]), words(heard)
            ratio = SequenceMatcher(None, ref, hyp).ratio()
            flag = "" if ratio > 0.92 else "   <-- CHECK"
            print(f"{line['id']:4s} {ratio:4.2f}  heard: {heard}{flag}", flush=True)
            worst.append((ratio, line["id"]))
    worst.sort()
    print("\nLowest agreement:", ", ".join(f"{i} ({r:.2f})" for r, i in worst[:5]), flush=True)


if __name__ == "__main__":
    main()
