# One Cause or Two?

A 2:20 animated short for social media about multisensory causal inference and the
study *Distilling noise characteristics and prior expectations in multisensory causal
inference* (Liu, Holland, Ma & Acerbi, PLOS Computational Biology, 2026). Everything is
generated in code:

- the pictures are SVG, animated with [Remotion](https://www.remotion.dev);
- the narration comes from a local text-to-speech model ([Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), Apache-2.0);
- the sound effects and the score are synthesized with NumPy.

- `STORYBOARD.md` — the film scene by scene: narration, pictures, transitions.
- `NOTES.md` — sources for every claim, simplifications, and what to check before
  posting.

## Outputs

| File | What |
|---|---|
| `out/film.mp4` | The film with burned-in captions (for feeds that autoplay muted) |
| `out/film-clean.mp4` | The same without captions (for platforms that take a caption file) |
| `out/film.srt` | Captions as subtitles |
| `out/film.vtt` | The same captions as WebVTT, for the landing page |
| `out/voice-samples/` | The opening lines in seven Kokoro voices, for choosing a narrator |

## Rebuilding

Requirements: Node 18+ and Python 3.10–3.12. Remotion downloads its own headless Chrome
and ffmpeg.

```sh
npm install
python -m venv tts/.venv
tts/.venv/Scripts/python -m pip install "kokoro>=0.9.4" soundfile faster-whisper scipy
```

The pipeline, in order:

```sh
# 1. narration → public/voice/*.wav, src/generated/timeline.json, out/film.srt and .vtt
tts/.venv/Scripts/python tts/make_voice.py
# 2. transcribe the narration back to catch dropped or garbled words
tts/.venv/Scripts/python tts/verify_voice.py
# 3. sound effects, ambience and score → public/sfx/*.wav (the score follows the timeline)
tts/.venv/Scripts/python tts/make_audio.py
# 4. review stills, then render
npm run stills -- S4-infer i4+30 i6+40     # scene composition, frames by narration line
npm run stills -- Film 178 --clean --full   # whole film, no captions, full size
npm run render          # renders, then masters the audio to -16 LUFS (scripts/master.mjs)
npm run render:clean
```

`narration.json` is the single source of truth for the words and their timing. Each
scene lasts `lead + Σ(gap + spoken line) + tail`, so editing a line or changing the
voice re-times the whole film. A line marked `"keep": true` is a hand-picked take and is
only regenerated when named with `--only`.

`npm run studio` opens Remotion Studio for scrubbing through the film. Each scene is also
its own composition (`S1-cold` … `S8-end`) with captions, for previews and stills.

## Layout

```
narration.json          words, pauses and voice
tts/                    narration, verification and audio synthesis (Python)
src/Film.tsx            the master composition: scenes, music ducking, ambience, captions
src/scenes/             one component per scene
src/components/         characters, meadow, diagrams, lab, TV room
src/lib/                timeline access, animation helpers, the Bayesian observer
public/voice, public/sfx  generated audio
scripts/stills.mjs      renders review stills from a single bundle
scripts/master.mjs      two-pass loudness normalisation of a rendered film (video copied)
```
