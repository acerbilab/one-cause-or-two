"""ElevenLabs text-to-speech: models, voices, and short auditions.

The API key is read from $ELEVENLABS_API_KEY, or else from ~/.config/elevenlabs/api_key.
It is never printed or written anywhere else.

Usage:  python tts/eleven.py models
        python tts/eleven.py voices
        python tts/eleven.py audition --voices ID1,ID2 --model MODEL [--lines c1,c2,b4]
        python tts/eleven.py design --description "..." --tag us    # Voice Design previews
        python tts/eleven.py save --preview us_2 --name "Narrator"   # keep one as a voice
"""

import argparse
import json
import os
import sys
import urllib.error
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
API = "https://api.elevenlabs.io"


def api_key():
    key = os.environ.get("ELEVENLABS_API_KEY")
    if not key:
        path = Path.home() / ".config" / "elevenlabs" / "api_key"
        if not path.exists():
            sys.exit(f"No ElevenLabs API key: set ELEVENLABS_API_KEY or create {path}")
        key = path.read_text(encoding="ascii").strip()
    return key


def request(method, path, body=None, accept="application/json"):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("xi-api-key", api_key())
    req.add_header("Accept", accept)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=120) as r:
            return r.read()
    except urllib.error.HTTPError as e:
        sys.exit(f"ElevenLabs {method} {path}: HTTP {e.code} {e.read().decode(errors='replace')[:400]}")


def speak(text, voice_id, model_id, settings=None, previous_text=None, next_text=None, seed=None, fmt="mp3_44100_128"):
    """Audio bytes for one piece of text."""
    body = {"text": text, "model_id": model_id}
    if settings:
        body["voice_settings"] = settings
    if previous_text:
        body["previous_text"] = previous_text
    if next_text:
        body["next_text"] = next_text
    if seed is not None:
        body["seed"] = seed
    return request("POST", f"/v1/text-to-speech/{voice_id}?output_format={fmt}", body, accept="audio/mpeg")


def lines_by_id():
    n = json.loads((ROOT / "narration.json").read_text(encoding="utf-8"))
    return {l["id"]: l["text"] for s in n["scenes"] for l in s["lines"]}


def cmd_models(_):
    for m in json.loads(request("GET", "/v1/models")):
        if not m.get("can_do_text_to_speech"):
            continue
        rates = m.get("model_rates") or {}
        cost = rates.get("character_cost_multiplier", m.get("token_cost_factor"))
        flags = [k for k in ("requires_alpha_access", "can_be_finetuned") if m.get(k)]
        langs = len(m.get("languages") or [])
        print(f"{m['model_id']:28s} cost x{cost}  langs {langs:2d}  {' '.join(flags):22s} {m.get('name', '')}")
        desc = (m.get("description") or "").strip().replace("\n", " ")
        if desc:
            print(f"    {desc[:160]}")


def cmd_voices(_):
    data = json.loads(request("GET", "/v2/voices?page_size=100&voice_type=default"))
    for v in data.get("voices", []):
        lab = v.get("labels") or {}
        tags = ", ".join(f"{k}={lab[k]}" for k in ("gender", "age", "accent", "descriptive", "description", "use_case") if lab.get(k))
        print(f"{v['voice_id']}  {v['name'][:28]:28s} [{v.get('category', '')}] {tags}")
        if v.get("description"):
            print(f"    {v['description'].strip()[:160]}")


def cmd_audition(args):
    lines = lines_by_id()
    ids = [x for x in args.lines.split(",") if x]
    text = "\n\n".join(lines[i] for i in ids)
    out = ROOT / "out" / "voice-samples" / "eleven"
    out.mkdir(parents=True, exist_ok=True)
    names = {v["voice_id"]: v["name"] for v in json.loads(request("GET", "/v2/voices?page_size=100&voice_type=default")).get("voices", [])}
    for vid in [x for x in args.voices.split(",") if x]:
        audio = speak(text, vid, args.model, seed=args.seed)
        name = names.get(vid, vid).split(" ")[0].split("-")[0].lower()
        path = out / f"{name}_{args.model}.mp3"
        path.write_bytes(audio)
        print(f"{path.relative_to(ROOT)}  ({len(text)} characters)", flush=True)


def cmd_design(args):
    """Voice Design: previews of new voices from a description, read on lines of the script."""
    import base64

    lines = lines_by_id()
    text = " ".join(lines[i] for i in args.lines.split(",") if i)
    body = {"voice_description": args.description, "text": text, "model_id": args.model}
    if args.seed is not None:
        body["seed"] = args.seed
    res = json.loads(request("POST", "/v1/text-to-voice/design", body))
    out = ROOT / "out" / "voice-samples" / "eleven" / "design"
    out.mkdir(parents=True, exist_ok=True)
    index = out / "previews.json"
    known = json.loads(index.read_text(encoding="utf-8")) if index.exists() else []
    for k, p in enumerate(res.get("previews", [])):
        ext = "mp3" if "mpeg" in p.get("media_type", "audio/mpeg") else "wav"
        path = out / f"{args.tag}_{k + 1}.{ext}"
        path.write_bytes(base64.b64decode(p["audio_base_64"]))
        known.append({"file": path.name, "generated_voice_id": p["generated_voice_id"], "description": args.description, "model": args.model})
        print(f"{path.relative_to(ROOT)}  {p.get('duration_secs', 0):.1f} s", flush=True)
    index.write_text(json.dumps(known, indent=2), encoding="utf-8")


def cmd_save(args):
    """Keep a designed preview as a voice on the account."""
    index = ROOT / "out" / "voice-samples" / "eleven" / "design" / "previews.json"
    entry = next(e for e in json.loads(index.read_text(encoding="utf-8")) if e["file"].startswith(args.preview))
    res = json.loads(request("POST", "/v1/text-to-voice", {
        "voice_name": args.name, "voice_description": entry["description"], "generated_voice_id": entry["generated_voice_id"],
    }))
    print(f"saved {args.name}: voice_id {res['voice_id']}")


def main():
    ap = argparse.ArgumentParser()
    sub = ap.add_subparsers(dest="cmd", required=True)
    sub.add_parser("models")
    sub.add_parser("voices")
    a = sub.add_parser("audition")
    a.add_argument("--voices", required=True)
    a.add_argument("--model", required=True)
    a.add_argument("--lines", default="c1,c2,c3,c4,b4,d3,r2")
    a.add_argument("--seed", type=int, default=7)
    d = sub.add_parser("design")
    d.add_argument("--description", required=True)
    d.add_argument("--tag", required=True, help="file prefix for the previews")
    d.add_argument("--model", default="eleven_multilingual_ttv_v2")
    d.add_argument("--lines", default="c1,c2,c3,c4,b4,r2")
    d.add_argument("--seed", type=int, default=None)
    s = sub.add_parser("save")
    s.add_argument("--preview", required=True, help="preview file name, e.g. us_2")
    s.add_argument("--name", required=True)
    args = ap.parse_args()
    {"models": cmd_models, "voices": cmd_voices, "audition": cmd_audition, "design": cmd_design, "save": cmd_save}[args.cmd](args)


if __name__ == "__main__":
    main()
