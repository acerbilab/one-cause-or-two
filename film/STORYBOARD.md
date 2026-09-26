# One Cause or Two? — storyboard

A 2:20 animated short for social media about multisensory causal inference and the
study *Distilling noise characteristics and prior expectations in multisensory causal
inference* (Liu, Holland, Ma & Acerbi, PLOS Computational Biology, 2026).

**Audience.** An educated general audience scrolling a feed, often with the sound off.
No prior knowledge of statistics or neuroscience is assumed; every idea is carried by a
picture first and by words second.

**Format.** 1920×1080, 30 fps, 141.8 s.
Narration by a local text-to-speech voice (Kokoro, `af_heart`). Burned-in captions in
the main render (most feeds autoplay muted), a clean render without captions, and an
`.srt` file.

## The spine

A marmot on lookout at dusk sees a flicker in the grass and hears a rustle in the
bushes. Is it one thing (a fox) or two (the wind and a bird)? The film uses her dilemma
to build, one picture at a time, the idea that the brain combines the senses as a
statistician would: it weighs how blurry each sense is, what it expects, and whether
the signals share a cause. It then shows how the study inferred the two ingredients of
that calculation from people's answers instead of assuming them, and ends back in the
meadow, where the marmot gets it right.

**Recurring motif: the belief hill.** Every guess is drawn as a glowing hill on a
ground line: the peak is the best guess, the width is the uncertainty ("the wider it
is, the less sure you are"). Hills sit directly under what they refer to. Sight is
blue, sound is green, the brain's combined guess is the warm accent (amber), the prior
is lavender. The same rule draws blur in the later scenes (a row of small hills, one
per direction), and in the last scene the prior found by the study, a sharp peak on a
broad hill, becomes the mountain straight ahead at dawn.

**Straight ahead is the centre of the screen.** Point-of-view shots and diagrams put
"straight ahead" at x = 960, which is where the lab's fixation cross sits and where the
study's findings live (sharpest senses and strongest expectations straight ahead).

## Style guide

- **Look:** flat vector illustration with soft glows and layered parallax, in the
  spirit of Kurzgesagt; character acting and a closing gag in the spirit of a Pixar
  short. Everything is drawn in code (SVG); there are no image assets.
- **Colour:** deep indigo night (`#0B1026`), layered mountain blues, warm-white text
  (`#F4F1EA`). Semantic colours: sight `#5CC8FF`, sound `#6EE7A0`, combined guess
  `#FFB547`, prior `#C39BFF`. The warm accent moves with the story: amber belief hills
  and a lamp at night, a gold horizon and warm rim light at dawn. The diagram scenes keep
  a faint mountain silhouette at the bottom of the frame, so they stay in her world.
- **Type:** Nunito (display, labels, captions), JetBrains Mono (numbers, citations),
  STIX Two italic (the two formulas). Labels are short and stay up at least 2.5 s.
- **Motion:** springs and eased curves only. Scene changes grow out of the content: a
  dive into the marmot's eye, a pull-back that reveals a TV, a fox and a bird carried
  from the meadow onto a balance, a curve that becomes a mountain.
- **Sound:** the flicker is always silent and the rustle always audible; sight and
  sound stay separate in the soundtrack as they are in the story. Spatial sounds are
  panned to where they appear on screen. The lab beeps use the real stimulus (25 ms
  tones between 900 and 1100 Hz). Crickets at night, a quiet dawn at the end, and a
  synthesized score ducked under the voice.

## Scenes

Times are from the recorded narration; `src/generated/timeline.json` is the source of
truth and re-times the film when the narration changes.

### 1. Cold open — 0:00–0:11

Side view of an alpine meadow at dusk: stars, a low moon, three layers of snow-capped
mountains, swaying grass, a bush on the right, a boulder with a burrow at its foot. The
marmot stands sentinel on the boulder, nibbling a flower. Crickets.

| Line | Narration | Picture |
|---|---|---|
| c1 | A flicker in the grass. | A silent blue shimmer in the grass right of centre. Her ear twitches; the nibbling stops. |
| c2 | A rustle in the bushes. | The bush shakes; green sound arcs; rustle panned right. She startles, eyes wide, and drops the flower. |
| c3 | One thing, or two? | Time slows, colour drains, the camera moves in to a medium shot. Two equal thought bubbles, open together for about 2 s: a fox, *or* the wind plus a bird. |
| c4 | Get it wrong, and you're dinner. | Bubbles pop. Two large eyes glint in the dark grass for about 2 s. A gulp, a bead of sweat. |
| c5 | Your brain solves this puzzle all day long. | A constant-rate dive into her pupil until it fills the frame. |

### 2. Noisy senses — 0:11–0:30

Her point of view over the night meadow, opening like an eye. A thin ground line fades
in with a tick at the centre labelled *straight ahead*.

| Line | Narration | Picture |
|---|---|---|
| b1 | Trouble is, every sense is a bit blurry. | The flicker and the rustle smear sideways into soft blurs. |
| b2 | Eyes tell you roughly where something is. | Blue dots fall from the flicker and pile into a narrow heap that becomes a blue hill. *sight* |
| b3 | Ears, even more roughly. | Green dots from the bush pile into a wider, lower hill. *sound* |
| b4 | Picture each guess as a hill: the wider it is, the less sure you are. | The heaps melt into smooth hills. *best guess* at the blue peak; width brackets: *less sure* across the green hill, *more sure* across the blue one. |
| b5 | If both come from one fox, combine them, trusting the sharper sense more. | A fox icon, dashed lines to both peaks; an amber hill emerges, closer to the blue one. |
| b6 | Together, they beat either sense alone. | The amber hill is narrower than both: *sharper than either*. Corner credit: *Ernst & Banks 2002 · Alais & Burr 2004*. |

The dot heaps are exact Gaussian quantiles and the amber hill is the exact product of
the two (the precision-weighted average).

### 3. Merging, and the catch — 0:30–0:45

| Line | Narration | Picture |
|---|---|---|
| k1 | We merge our senses all the time. | Pull back: the meadow is on a TV in a dim living room (floor lamp, speakers, plant). |
| — | *(TV)* "Good evening." | Static; the channel changes to *Marmot News* (ticker: *FOX OR BIRD?*). The anchor (the marmot, in a tie) says it, with a speech bubble for muted viewers. |
| k2 | On TV, voices seem to come from the lips, not the speakers. | *heard here* circles the anchor's mouth; green sound particles leave both speakers (*sound comes from here* / *and here*) and travel to the lips. |
| k3 | But what if the flicker was just the wind, and the rustle, a bird? | Static back to the meadow, and the camera pushes into the TV. A gust bends the grass where the flicker was (*wind*); a bird hops onto the bush and chirps (*bird*). |
| k4 | Merge them, and you'd dodge a fox that isn't there. | The amber hill still stands between them; the other hills dim and a dashed ghost fox with a question mark appears above the amber peak. |

### 4. Causal inference — 0:45–1:05

| Line | Narration | Picture |
|---|---|---|
| i1 | So before merging, the brain must ask: one cause, or two? | The meadow dissolves into a dark diagram space as a balance assembles. The ghost fox floats up and becomes solid in the *one cause* pan; the bird flies from its bush to the *two causes* pan. |
| i2 | It's called causal inference. | Title typesets: **causal inference**. |
| i3 | A leading theory, the Bayesian brain, says we weigh the odds. | Subtitle: *the Bayesian brain: weigh the odds*. The beam wobbles. Small mono easter egg: Bayes' rule for the one-cause hypothesis. |
| i4 | Close together? Probably one cause: merge. | Hills below: sight at the centre, sound close by. The scale tips to *one cause* (85%); the amber *your guess* is one merged bump. |
| i5 | Far apart? Probably two: keep them separate. | The sound slides far away: *two causes* (98%); the guess stays with the sound. |
| i6 | In between? You hedge your bets. | The sound comes back halfway: the scale nearly balances (44% / 56%) and the guess splits into two bumps. Under the amber curve, faint dashed bumps show the two bets it mixes, each weighted by its odds: *merge* and *separate*. They fade in the first frames of the next scene. |

The tilt, the percentages and the amber curve are computed live from the standard
Bayesian causal-inference observer (Körding et al., 2007): the amber curve is the
posterior over where the sound came from, a mixture of the "one cause" and "two
causes" answers weighted by their probabilities.

### 5. Two ingredients — 1:05–1:25

| Line | Narration | Picture |
|---|---|---|
| g1 | How far apart is too far? That depends on two ingredients. | Over the last picture, an arrow between sight and sound, *too far?* below it. The scale folds away; two cards: *① How blurry, and where?* *② What's expected?* |
| g2 | How blurry each sense is, in every direction. | A row of seven small blue hills, one per direction, their widths wobbling under question marks. |
| g3 | And where it expects things to be: its prior. Blurry guesses get pulled toward it. | A lavender, wobbling *prior* below: *where things usually are*. It calms into a smooth hill; a sharp and a blurry guess at the same spot: the blurry one slides a long way toward the centre, the sharp one barely moves, and the result holds. |
| g4 | Scientists often assume equal blur everywhere, and a plain bell curve. | The hills snap to one width, then the prior to a bell curve; a rubber stamp slams down on each: **ASSUMED**, **ASSUMED**. |
| g5 | Convenient for the math. But is it true? | The two formulas appear (σ(s) = σ₀, p(s) = N(0, σ²)); a question mark pops on top of the bell curve; the stamps shake. |

### 6. The experiment — 1:25–1:38

| Line | Narration | Picture |
|---|---|---|
| e1 | To find out, we put people in the marmot's place. | The lab from behind the chair: a black cloth screen with a fixation cross, foam on the walls, a chin rest. The marmot's silhouette in the chair hops off, and a person sits down in her place (both rim-lit by the screen). |
| e2 | Brief flashes. Short beeps. | A sharp flash; a beep from one of seven speakers hidden behind the cloth (revealed as dashed outlines); then a blurry flash and a beep together, their positions left marked with dashed rings. |
| e3 | Where was it? Same place, or not? | The thin cursor with arrowheads slides from where it was left to the flash and clicks; *Same place? Yes / No*: the two rings are visibly apart, *No*. |
| e4 | Fifteen volunteers. Nearly forty-five thousand answers. | The room shrinks into one of fifteen tiles, each running its own trials. *15 volunteers* and a counter to *44,600 answers*; the answers stream down as dots. |

### 7. Let the data draw — 1:38–2:00

| Line | Narration | Picture |
|---|---|---|
| d1 | Instead of assuming the shapes, we let the data draw them. | The lab's answers fly up into two panels: the row of blur hills, and a prior curve held by pins. The pins slide until the shapes settle; dashed ghosts keep the assumed shapes (equal widths, bell curve) for comparison. |
| d2 | Our senses are sharpest straight ahead, as expected, but the blur soon levels off. | Blur hills: much narrower than assumed in the centre (*sharpest straight ahead*), wider to the sides, and no wider at the edges (*levels off*). |
| d3 | Our expectations? Probably straight ahead, but maybe anywhere: a sharp peak on a broad hill. | Against the ghost bell curve, a lavender spike on a broad hill: *probably straight ahead* / *but maybe anywhere*. |
| d4 | Distilled into simple formulas, they explain our volunteers' answers better than the standard assumptions. | The pins drop away; the formulas appear: σ(s) = σ₀ + k₁(1 − e^(−k₂\|s\|)) and *Gaussian + Laplace*. The panels dim behind a card centred on straight ahead: *spread of volunteers' answers* (*volunteers*) dips straight ahead; the *standard model* line misses the dip, the *distilled model* curve follows it. |

The pins sit at the study's pivot locations (0°, 0.1°, 0.3°, 1°, 2°, 4°, 6°, 8°, 10°,
15°, 20°, mirrored; the 45° pivot lies outside the picture).

### 8. Resolution — 2:00–2:22

| Line | Narration | Picture |
|---|---|---|
| r1 | Every moment, your brain is betting on what goes with what. | The prior curve rises and fills into the central mountain, a snowy peak with a lit and a shaded face; dawn comes up behind it (gold horizon) and the meadow rises into view, the marmot back on her boulder with a new flower, rim-lit by the sunrise. |
| r2 | One cause, or two? Now we know a little more about how it decides. | Calm wide shot; the sun clears the ridge. |
| — | *(no narration)* | A flicker and a rustle from the same spot. Above it, a blue and a green hill merge into one amber hill: one cause. A big bubble: a fox and "!". She whistles the alarm and dives into the burrow (dust puff). A fox leaps onto the empty boulder, looks around, turns to us, ears drooping; soft *womp womp*. |
| — | *(end card)* | The iris closes on the fox, then slides down to the burrow, where the marmot's eyes peek out and blink; it closes. **One cause or two?** over a drawn-on amber prior curve. Liu, Holland, Ma & Acerbi (2026) · *Distilling noise characteristics and prior expectations in multisensory causal inference* · PLOS Computational Biology · doi.org/10.1371/journal.pcbi.1014251. Then, large and amber, the landing page **acerbilab.github.io/one-cause-or-two**, and one line: University of Helsinki · New York University · Research Council of Finland · ELLIS Institute Finland. No logos. |

## Build pipeline

1. `narration.json` → `tts/make_voice.py` → `public/voice/*.wav`,
   `src/generated/timeline.json`, `out/film.srt`.
2. `tts/verify_voice.py` transcribes every clip back with Whisper to catch dropped or
   garbled words.
3. `tts/make_audio.py` synthesizes the sound effects, the ambience and the score.
4. Remotion (`src/`): one composition per scene plus the master `Film`; stills via
   `npm run stills`, final renders via `npm run render` and `npm run render:clean`,
   each followed by `scripts/master.mjs` (loudness normalisation to −16 LUFS, −1.5 dBTP).
