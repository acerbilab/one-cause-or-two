"""ElevenLabs text-to-speech: models, voices, and short auditions.

The API key is read from $ELEVENLABS_API_KEY, or else from ~/.config/elevenlabs/api_key.
It is never printed or written anywhere else.

Usage:  python tts/eleven.py models
        python tts/eleven.py voices
        python tts/eleven.py audition --voices ID1,ID2 --model MODEL [--lines c1,c2,b4]
        python tts/eleven.py script --voice ID [--only c4,i6]       # whole narration, line by line
        python tts/eleven.py scenes --voice ID                      # whole narration, one take per scene
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


def request(method, path, body=None, accept="application/json", with_headers=False):
    data = json.dumps(body).encode() if body is not None else None
    req = urllib.request.Request(API + path, data=data, method=method)
    req.add_header("xi-api-key", api_key())
    req.add_header("Accept", accept)
    if data is not None:
        req.add_header("Content-Type", "application/json")
    try:
        with urllib.request.urlopen(req, timeout=180) as r:
            return (r.read(), dict(r.headers)) if with_headers else r.read()
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


def all_voices(kind=None):
    q = "/v2/voices?page_size=100" + (f"&voice_type={kind}" if kind else "")
    return json.loads(request("GET", q)).get("voices", [])


def cmd_voices(args):
    data = {"voices": all_voices(args.type)}
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
    names = {v["voice_id"]: v["name"] for v in all_voices()}
    settings = {"stability": args.stability, "similarity_boost": 0.75, "style": args.style, "use_speaker_boost": True, "speed": args.speed}
    for vid in [x for x in args.voices.split(",") if x]:
        audio = speak(text, vid, args.model, settings=settings, seed=args.seed)
        name = names.get(vid, vid).split(" ")[0].split("-")[0].lower()
        path = out / f"{name}_{args.model}.mp3"
        path.write_bytes(audio)
        print(f"{path.relative_to(ROOT)}  ({len(text)} characters)", flush=True)


def decode_mp3(data, sr_out=48000):
    """Mono float32 samples at sr_out from MP3 bytes."""
    import io

    import av
    import numpy as np

    c = av.open(io.BytesIO(data))
    res = av.AudioResampler(format="flt", layout="mono", rate=sr_out)
    chunks = [r.to_ndarray().ravel() for fr in c.decode(audio=0) for r in res.resample(fr)]
    chunks += [r.to_ndarray().ravel() for r in res.resample(None)]
    return np.concatenate(chunks).astype(np.float32)


def write_mp3(path, samples, sr):
    import av
    import numpy as np

    out = av.open(str(path), "w")
    st = out.add_stream("libmp3lame", rate=sr)
    st.layout = "mono"
    fr = av.AudioFrame.from_ndarray(samples[None, :].astype(np.float32), format="flt", layout="mono")
    fr.sample_rate = sr
    for p in st.encode(fr):
        out.mux(p)
    for p in st.encode(None):
        out.mux(p)
    out.close()


def cmd_script(args):
    """The whole narration in one voice, line by line with its neighbours as context,
    laid out with the film's pauses as one listening track."""
    import numpy as np

    sys.path.insert(0, str(ROOT / "tts"))
    from make_voice import trim_and_level

    sr = 48000
    n = json.loads((ROOT / "narration.json").read_text(encoding="utf-8"))
    flat = [(s, l) for s in n["scenes"] for l in s["lines"]]
    only = {x for x in args.only.split(",") if x}
    name = args.name or {v["voice_id"]: v["name"] for v in all_voices()}.get(args.voice, args.voice).split(" ")[0].lower()
    out = ROOT / "out" / "voice-samples" / "eleven" / "script" / name
    out.mkdir(parents=True, exist_ok=True)
    settings = {"stability": args.stability, "similarity_boost": 0.75, "style": args.style, "use_speaker_boost": True, "speed": args.speed}
    for k, (_, line) in enumerate(flat):
        path = out / f"{line['id']}.mp3"
        if only and line["id"] not in only:
            continue
        if path.exists() and not only:
            continue
        prev = flat[k - 1][1]["text"] if k > 0 else None
        nxt = flat[k + 1][1]["text"] if k + 1 < len(flat) else None
        path.write_bytes(speak(line["text"], args.voice, args.model, settings, prev, nxt, seed=args.seed + k))
        print(f"{line['id']:4s} {line['text']}", flush=True)
    track = []
    for scene in n["scenes"]:
        track.append(np.zeros(int(scene.get("lead", 0.0) * sr), np.float32))
        for i, line in enumerate(scene["lines"]):
            if i > 0:
                track.append(np.zeros(int(line.get("gap", 0.0) * sr), np.float32))
            track.append(trim_and_level(decode_mp3((out / f"{line['id']}.mp3").read_bytes(), sr), sr))
        track.append(np.zeros(int(scene.get("tail", 0.0) * sr), np.float32))
    full = np.concatenate(track)
    dest = out.parent / f"{name}_full_script.mp3"
    write_mp3(dest, full, sr)
    print(f"{dest.relative_to(ROOT)}  {full.size / sr:.1f} s")


def scene_take(text, voice_id, model_id, settings, seed, previous_request_ids=None, next_text=None, sr=24000, previous_text=None):
    """One take of a whole scene: 16-bit PCM samples, character timings and the request id.

    previous_request_ids (valid for 2 h) conditions the take on earlier audio; without them,
    previous_text gives at least the preceding words."""
    import base64

    import numpy as np

    body = {"text": text, "model_id": model_id, "voice_settings": settings, "seed": seed}
    if previous_request_ids:
        body["previous_request_ids"] = previous_request_ids
    elif previous_text:
        body["previous_text"] = previous_text
    if next_text:
        body["next_text"] = next_text
    raw, headers = request("POST", f"/v1/text-to-speech/{voice_id}/with-timestamps?output_format=pcm_{sr}", body, with_headers=True)
    res = json.loads(raw)
    pcm = np.frombuffer(base64.b64decode(res["audio_base64"]), dtype="<i2").astype(np.float32) / 32768.0
    rid = next((v for k, v in headers.items() if k.lower() == "request-id"), None)
    return pcm, res["alignment"], rid


def split_scene(pcm, alignment, spans, sr=24000):
    """Cut each line (a character span of the scene text) out of a scene take, inside the pauses.

    Returns, per line, the samples from just before the first word to where the last word
    has died away, with short fades; and the take's noise floor in dB below its peak."""
    import numpy as np

    hop = int(0.01 * sr)
    n = pcm.size // hop
    frames = pcm[: n * hop].reshape(n, hop)
    db = 10 * np.log10(np.mean(frames ** 2, axis=1) + 1e-12)
    db -= db.max()
    starts = np.array(alignment["character_start_times_seconds"])
    ends = np.array(alignment["character_end_times_seconds"])
    chars = alignment["characters"]
    speech = -35.0  # dB below the take's peak: clearly voiced
    t_on, t_off = [], []
    for a, b in spans:
        idx = [i for i in range(a, b) if chars[i].isalnum()]
        t_on.append(starts[idx[0]])
        t_off.append(ends[idx[-1]])
    # the noise floor: the quietest tenth of the frames in the pauses between lines
    pause = np.concatenate([db[int(t_off[k] * 100) + 5: int(t_on[k + 1] * 100) - 5] for k in range(len(spans) - 1)] or [db])
    floor = float(np.percentile(pause, 10)) if pause.size else float(np.percentile(db, 5))
    # the boundary between two lines is the quietest point of the pause between them
    # (smoothed over 30 ms), searched a little beyond the aligned pause because the
    # character timings can be off by a few tens of milliseconds
    smooth = np.convolve(db, np.ones(3) / 3, mode="same")
    bounds = []
    for k in range(len(spans) - 1):
        lo = int(max(t_on[k], t_off[k] - 0.05) * 100)
        hi = int(min(t_off[k + 1], t_on[k + 1] + 0.05) * 100)
        bounds.append((lo + int(np.argmin(smooth[lo:hi]))) / 100 if hi > lo else (t_off[k] + t_on[k + 1]) / 2)
    out, cuts = [], []
    for k in range(len(spans)):
        # a line owns the audio between the boundaries on either side of it; nothing is
        # searched for or kept beyond them, however short the pauses are
        start = bounds[k - 1] if k > 0 else 0.0
        stop = bounds[k] if k + 1 < len(spans) else pcm.size / sr
        lo = int(max(start, t_on[k] - 0.15) * 100)
        hi = int(min(t_off[k], t_on[k] + 0.15) * 100)
        voiced = np.nonzero(db[lo:hi] > speech)[0]
        onset = (lo + voiced[0]) / 100 if voiced.size else t_on[k]
        lo = int(max(t_on[k], t_off[k] - 0.15) * 100)
        hi = int(min(n, stop * 100, (t_off[k] + 0.25) * 100))
        voiced = np.nonzero(db[lo:hi] > speech)[0]
        offset = (lo + voiced[-1] + 1) / 100 if voiced.size else t_off[k]
        next_on = t_on[k + 1] if k + 1 < len(spans) else pcm.size / sr
        head = max(onset - 0.04, start)
        # the tail runs until the sound reaches the floor, at most 250 ms, and never into
        # the next line or a breath before it (energy rising again)
        limit = min(offset + 0.25, stop)
        f = int(offset * 100)
        best = f
        while f < int(limit * 100) and f < n:
            if db[f] < db[best]:
                best = f
            if db[f] <= floor + 3 or db[f] > db[best] + 6:
                break
            f += 1
        tail = max(best, int(offset * 100)) / 100
        cuts.append((head, tail))
        clip = pcm[int(head * sr): int(tail * sr)].copy()
        fin, fout = int(0.01 * sr), int(0.045 * sr)
        clip[:fin] *= np.sin(np.linspace(0, np.pi / 2, fin)) ** 2
        clip[-fout:] *= np.cos(np.linspace(0, np.pi / 2, fout)) ** 2
        out.append(clip)
    return out, floor, cuts


def scene_text(texts):
    """A scene's lines joined into one request, and each line's character span in it."""
    text, spans = "", []
    for t in texts:
        if text:
            text += " "
        spans.append((len(text), len(text) + len(t)))
        text += t
    return text, spans


def scene_gain(clips, sr, target_db=-20.0, ceiling_db=-1.0):
    """One gain for a whole scene: voiced RMS to target_db, peaks under ceiling_db (dBFS).
    Levelling the scene, not each line, keeps the take's line-to-line dynamics."""
    import numpy as np

    allv = np.concatenate(clips)
    win = int(0.02 * sr)
    env = np.sqrt(np.convolve(allv ** 2, np.ones(win) / win, mode="same"))
    active = env > env.max() * 10 ** (-40 / 20)
    gain = 10 ** (target_db / 20) / max(np.sqrt(np.mean(allv[active] ** 2)), 1e-9)
    return min(gain, 10 ** (ceiling_db / 20) / max(np.abs(allv).max(), 1e-9))


def cmd_scenes(args):
    """The whole narration as one take per scene, each line cut out in the pauses and
    levelled with its scene, laid out with the film's pauses as one listening track."""
    import numpy as np
    import soundfile as sf
    from scipy.signal import resample_poly

    sr = 24000
    n = json.loads((ROOT / "narration.json").read_text(encoding="utf-8"))
    name = args.name or {v["voice_id"]: v["name"] for v in all_voices()}.get(args.voice, args.voice).split(" ")[0].lower()
    out = ROOT / "out" / "voice-samples" / "eleven" / "scenes" / name
    (out / "lines").mkdir(parents=True, exist_ok=True)
    settings = {"stability": args.stability, "similarity_boost": 0.75, "style": 0.0, "use_speaker_boost": True, "speed": args.speed}
    prev_ids = []
    report = []
    track = []
    for k, scene in enumerate(n["scenes"]):
        text, spans = scene_text([l["text"] for l in scene["lines"]])
        nxt = n["scenes"][k + 1]["lines"][0]["text"] if k + 1 < len(n["scenes"]) else None
        saved = out / f"{scene['id']}.json"
        if args.reuse and saved.exists() and json.loads(saved.read_text(encoding="utf-8"))["text"] == text:
            pcm = sf.read(out / f"{scene['id']}.wav", dtype="float32")[0]
            meta = json.loads(saved.read_text(encoding="utf-8"))
            alignment, rid = meta["alignment"], meta["request_id"]
        else:
            pcm, alignment, rid = scene_take(text, args.voice, args.model, settings, args.seed + k, prev_ids[-1:] or None, nxt, sr)
            sf.write(out / f"{scene['id']}.wav", pcm, sr)
            saved.write_text(json.dumps({"text": text, "request_id": rid, "alignment": alignment}), encoding="utf-8")
        prev_ids.append(rid)
        clips, floor, _ = split_scene(pcm, alignment, spans, sr)
        gain = scene_gain(clips, sr)
        report.append(f"{scene['id']:12s} {pcm.size / sr:5.1f} s take, floor {floor:5.0f} dB below peak, request {'ok' if rid else 'missing'}")
        print(report[-1], flush=True)
        track.append(np.zeros(int(scene.get("lead", 0.0) * sr), np.float32))
        for i, (line, clip) in enumerate(zip(scene["lines"], clips)):
            clip = (clip * gain).astype(np.float32)
            sf.write(out / "lines" / f"{line['id']}.wav", clip, sr)
            if i > 0:
                track.append(np.zeros(int(line.get("gap", 0.0) * sr), np.float32))
            track.append(clip)
        track.append(np.zeros(int(scene.get("tail", 0.0) * sr), np.float32))
    full = resample_poly(np.concatenate(track), 2, 1).astype(np.float32)
    dest = out.parent / f"{name}_scene_takes.mp3"
    write_mp3(dest, full, 2 * sr)
    print(f"{dest.relative_to(ROOT)}  {full.size / (2 * sr):.1f} s")


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
    v = sub.add_parser("voices")
    v.add_argument("--type", default="default", help="default, non-default, personal, community, workspace")
    a = sub.add_parser("audition")
    a.add_argument("--voices", required=True)
    a.add_argument("--model", required=True)
    a.add_argument("--lines", default="c1,c2,c3,c4,b4,d3,r2")
    a.add_argument("--seed", type=int, default=7)
    a.add_argument("--stability", type=float, default=0.5)
    a.add_argument("--style", type=float, default=0.0)
    a.add_argument("--speed", type=float, default=1.0)
    sc = sub.add_parser("script")
    sc.add_argument("--voice", required=True, help="voice_id")
    sc.add_argument("--name", default=None)
    sc.add_argument("--model", default="eleven_multilingual_v2")
    sc.add_argument("--stability", type=float, default=0.45)
    sc.add_argument("--style", type=float, default=0.0)
    sc.add_argument("--speed", type=float, default=0.95)
    sc.add_argument("--seed", type=int, default=100)
    sc.add_argument("--only", default="", help="comma-separated line ids to (re)generate")
    st = sub.add_parser("scenes")
    st.add_argument("--voice", required=True, help="voice_id")
    st.add_argument("--name", default=None)
    st.add_argument("--model", default="eleven_multilingual_v2")
    st.add_argument("--stability", type=float, default=0.5)
    st.add_argument("--speed", type=float, default=0.95)
    st.add_argument("--seed", type=int, default=200)
    st.add_argument("--reuse", action="store_true", help="re-cut the saved scene takes instead of generating new ones")
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
    {"models": cmd_models, "voices": cmd_voices, "audition": cmd_audition, "script": cmd_script, "scenes": cmd_scenes, "design": cmd_design, "save": cmd_save}[args.cmd](args)


if __name__ == "__main__":
    main()
