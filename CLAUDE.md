# CLAUDE.md

## What this is

*One cause or two?* is a 2:20 animated short for social media, aimed at an educated general
audience. It explains how the brain decides whether a sight and a sound come from the same
thing (multisensory causal inference), and presents the study *Distilling noise
characteristics and prior expectations in multisensory causal inference* (Liu S, Holland T,
Ma WJ & Acerbi L, PLOS Computational Biology 22(5): e1014251, 2026,
[doi:10.1371/journal.pcbi.1014251](https://doi.org/10.1371/journal.pcbi.1014251)). A
transcription of the paper is in
[acerbilab/pubs-llms](https://github.com/acerbilab/pubs-llms/blob/main/publications/liu2026distilling_main.md).

Everything in the film is generated in code:

- the pictures are SVG, animated with [Remotion](https://www.remotion.dev);
- the narration comes from ElevenLabs text-to-speech (the voice "Helen"), and the TV
  anchor's line from local text-to-speech (Kokoro);
- the sound effects and the score are synthesized with NumPy.

`PLAN.md`, when present, holds the current plan and status. It is kept out of git. Read it
first.

## Layout

| Path | Contents |
|---|---|
| `film/narration.json` | Words, pauses and voice; the single source of truth for timing |
| `film/STORYBOARD.md` | The film scene by scene: narration, pictures, transitions |
| `film/NOTES.md` | Source for every claim, simplifications, checks before posting |
| `film/tts/` | `make_voice.py` (narration and timeline), `verify_voice.py` (Whisper check), `make_audio.py` (effects, ambience, score) |
| `film/src/` | `Film.tsx` (master composition), `scenes/` (one component per scene), `components/`, `lib/` (timeline access, animation helpers, maths) |
| `film/scripts/` | `stills.mjs` (review stills), `master.mjs` (loudness normalisation of a render) |
| `film/public/voice/`, `film/public/sfx/` | Generated audio |
| `film/out/` | Renders, stills, review sheets (ignored) |
| `site/` | The landing page: static HTML, CSS and JS, no build step (`site/README.md`) |
| `site/media/` | The film and its captions for local preview (ignored; deployed from a release) |
| `notebook/` | Colab notebook: the study in miniature, fitted with PyBADS and compared with PyVBMC |
| `.github/workflows/pages.yml` | Deploys `site/` to GitHub Pages, run by hand |

## Commands

Run from `film/`:

```sh
npm install
python -m venv tts/.venv
tts/.venv/Scripts/python -m pip install "kokoro>=0.9.4" soundfile faster-whisper scipy pillow

tts/.venv/Scripts/python tts/make_voice.py              # narration -> public/voice, src/generated/timeline.json, out/film.srt + .vtt
tts/.venv/Scripts/python tts/make_voice.py --only blur  # re-take a scene (or the scene of a line id); --timeline-only: re-time from existing clips
tts/.venv/Scripts/python tts/eleven.py voices --type non-default   # ElevenLabs helpers: models, voices, auditions (see its docstring)
tts/.venv/Scripts/python tts/verify_voice.py            # transcribe every clip back with Whisper
tts/.venv/Scripts/python tts/make_audio.py              # all sound; --only score (etc.) for one file
npx tsc --noEmit
npm run stills -- S5-ingredients g3+40 g4+10            # stills at offsets from narration lines -> out/stills/
npm run stills -- Film 178 --clean --full               # a full-size frame of the whole film, without captions
npm run render                                          # out/film.mp4 with captions, then mastered to -16 LUFS
npm run render:clean                                    # out/film-clean.mp4 without captions
```

Compositions: `Film` (the whole film; props `captions`, `music`), and `S1-cold` … `S8-end`
(each scene alone, with captions).

## How the film works

- **Timing comes from the audio.**
  - `make_voice.py` measures each spoken line and writes `src/generated/timeline.json`. A
    scene lasts `lead + Σ(gap + line) + tail`.
  - Scenes never hard-code times. They take `cues('<sceneId>')` and animate relative to line
    ids (`c1.start`, `b4.end`, …).
  - After changing the narration, re-run `make_audio.py`, because the score follows the scene
    boundaries.
  - The film runs about 2:20, a length that suits social media. It is a target, not a
    hard limit.
- **The narration is voiced one scene at a time** (`"engine": "elevenlabs"` in
  `narration.json`, with the voice and its settings).
  - Each scene is one ElevenLabs take, conditioned on the previous take's audio. Each line
    is cut out of the take at the quietest point of the pauses around it, and the scene is
    levelled as a whole, so the delivery flows from line to line.
  - Takes are saved in `tts/takes/<voice>/` with their character timings, and reused while
    a scene's text is unchanged. `--only` re-takes a scene with a new seed; that costs
    credits.
  - The API key is read from `ELEVENLABS_API_KEY` or `~/.config/elevenlabs/api_key`, and
    is never printed or committed.
  - Use only models that ElevenLabs does not flag as alpha, beta or preview: the paid
    plan's commercial licence excludes them. The voice is a professional clone trained on
    `eleven_multilingual_v2`.
  - With `"engine": "kokoro"`, lines are voiced one by one with Kokoro, and a line marked
    `"keep": true` is a hand-picked take that is regenerated only when named with `--only`.
- **Text-to-speech needs checking.** Run `verify_voice.py` after re-voicing. It transcribes
  each line on its own, so Whisper mishears some short lines that are fine in context
  ("Ears" as "is", "hedge" as "head"); if in doubt, transcribe the uncut scene take.
- **The audio in `film/public/` is generated.**
  - Without it (for example in a fresh clone), run `make_voice.py`, `verify_voice.py` and
    `make_audio.py` before rendering. Renders skip missing sounds silently.
  - New narration takes change the line durations, so the film re-times itself and
    `src/generated/timeline.json` changes with them.
- **Scenes hand off continuously.**
  - A scene's first frames redraw the previous scene's final state. For example, the meadow
    dissolves into the balance scale, and the prior curve becomes the mountain.
  - When changing how a scene ends, update how the next one starts. Check each cut by
    rendering the `Film` composition at `scene.from - 1` and `scene.from`.
  - Shared geometry lives in exported constants that later scenes import: `MEADOW`, `POV`,
    `CUES`/`FUSED`/`HILL_SCALE`, `PHANTOM`, `OBS`, `FLAT_SIGMA`/`BELL_SD`,
    `priorFound`/`noiseFound`.
- **The curves are computed, not hand-drawn.** `src/lib/math.ts` holds:
  - the Gaussian cue combination;
  - the Bayesian causal-inference observer (Körding et al., 2007) that drives the diagrams.

  Its parameters are chosen for display. They are not the paper's fitted values
  (`NOTES.md`).
- **Audio cannot be judged from code.** Levels come from `scripts/master.mjs`, and
  intelligibility from transcribing the final mix with Whisper. Whether it sounds good is for
  a person to judge.

## The landing page

- `site/` is plain HTML, CSS and JavaScript modules. Preview it with
  `python -m http.server 8000 -d site`; from `file://` the modules and the caption fetch
  fail.
- `site/js/observer.js` ports the film's observer (`film/src/lib/math.ts`) and the display
  shapes of scene 7. Keep the two in step.
- The page plays `site/media/film-clean.mp4` with `site/media/film.vtt`, and builds its
  transcript from the same captions. Neither file is in git: the Pages workflow downloads
  them from a release, so every release must carry both.
- The page's claims follow the same accuracy rules as the film's.

## The notebook

- `notebook/one_cause_or_two.ipynb` is committed with its outputs, so GitHub shows the
  figures. After editing it, re-run it end to end and save the outputs:
  `notebook/.venv/Scripts/python -m jupyter nbconvert --to notebook --execute --inplace --ExecutePreprocessor.timeout=1800 notebook/one_cause_or_two.ipynb`
  (the venv setup is in `notebook/README.md`). Seeds are fixed, so a re-run reproduces the
  numbers.
- It takes several minutes, most of it in PyVBMC, and it is CPU-heavy: run it alone.
- Claims about the paper must come from the paper's text. The figure descriptions in the
  pubs-llms transcription are machine-written readings of the figures, not the authors'
  statements.

## Visual language

- **Belief hills:** a guess is a hill standing on a ground line, and the wider it is, the
  less sure. Semantic colours:
  - sight `#5CC8FF`;
  - sound `#6EE7A0`;
  - combined guess `#FFB547`;
  - prior `#C39BFF`.

  All on a deep indigo night (`#0B1026`). Straight ahead is the centre of the screen
  (x = 960).
- **Type:** Nunito for display, labels and captions; JetBrains Mono for numbers and
  citations; STIX Two italic for formulas.
  - Captions are 46 px.
  - Anything a viewer must read is at least 32 px and stays on screen at least 2.5 s.
  - Use the `Hill` and `Label` components: `Hill` trims flat tails, and `Label` starts its
    leader line at the edge of the text.
- **Motion:** springs and eased curves only (`src/lib/anim.ts`). Transitions grow out of the
  content.

## Accuracy

Every claim must match the paper. `NOTES.md` maps claims to sources and lists the
simplifications. Keep the hedges that are there for accuracy, such as "often assume",
"as expected" and "a leading theory".

When describing how the paper's models were fitted, be exact: BADS fitted the models with
up to 20 parameters, and CMA-ES the 40-parameter semiparametric fits.

## Tooling notes

- To check the landing page without the browser extension, `site/scripts/shot.mjs` drives
  Remotion's headless Chrome over the DevTools protocol: screenshots at any width, console
  errors, scripted interactions (`site/README.md`).
- Remotion's bundled ffmpeg (`node_modules/@remotion/compositor-*/`) lacks the `fps` and
  `select` filters. To pull frames from a render, use PyAV (installed in the venv with
  faster-whisper) together with Pillow.
- The Python scripts set `HF_HOME` to `tts/models`, where the Kokoro and Whisper weights
  are cached. `tts/eleven.py` uses only the standard library for its API calls.
- **`make_audio.py` is regenerable, but not bit-identically.**
  - All its jobs draw from one seeded random generator, so running a subset with `--only`
    gives different random details than a full run.
  - The TV anchor's line comes from Kokoro, which is not deterministic.
- **Remotion API** (version 4.0.529):
  - use `Html5Audio` (`Audio` is deprecated) and `trimBefore` (`startFrom` is
    deprecated);
  - `remotion.config.ts` sets the bt709 colour space. Without it, renders are tagged as
    full-range bt470bg.
