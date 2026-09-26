# Notes: facts, simplifications, open questions

What the film claims, where each claim comes from, what is simplified for a general
audience, and what should be checked by a person before the film is posted.

## Claims and their sources

The paper is Liu, Holland, Ma & Acerbi (2026), *PLOS Computational Biology* 22(5):
e1014251, transcribed in [acerbilab/pubs-llms](https://github.com/acerbilab/pubs-llms/blob/main/publications/liu2026distilling_main.md).

| Claim in the film | Source | Notes |
|---|---|---|
| Combining two senses, weighted by how sharp each one is, gives a guess sharper than either alone. | Ernst & Banks (2002), Nature; Alais & Burr (2004), Current Biology | Credited on screen. Ernst & Banks is vision + touch; Alais & Burr is vision + hearing. The amber hill is the exact precision-weighted product of the two hills. |
| On TV, voices seem to come from the lips, not the speakers. | The ventriloquist effect (paper refs 4, 11) | Standard illustration. |
| "One cause, or two?" is called causal inference; a leading theory (the Bayesian brain) weighs the odds. | Körding et al. (2007), PLoS ONE; paper Introduction | "A leading theory" keeps it a hypothesis, not a fact. |
| Close together: probably one cause; far apart: probably two; in between: hedge your bets. | Bayesian causal inference; paper Results | The animation computes the Körding et al. observer live. "Hedging" fits the study's finding that probability matching and model averaging beat all-or-nothing model selection. |
| Blurry guesses get pulled toward the prior. | Bayes' rule; paper Fig 2B | The low-reliability flashes show the strongest pull toward the centre. Auditory answers showed no net pull; the paper attributes this to a stretching of the auditory range. The film makes no claim about sound here. |
| Scientists often assume equal blur everywhere and a bell-curve prior. | Paper, "Prior and noise assumptions" | The paper says past studies "often assume a Gaussian, uniform, or Gaussian-uniform mixture prior … coupled with constant ('homoskedastic') sensory noise". "Often" matches the paper; do not strengthen it to "most". |
| The experiment: brief flashes, short beeps from hidden speakers, a cursor, same place yes/no. | Paper, Methods | Flashes were single-frame (16.7 ms) Gaussian spots at three widths. Tones were 25 ms, 900–1100 Hz, from 7 speakers behind a black cloth at 0°, ±5°, ±10°, ±15°. A white fixation cross was always shown. The cursor was not reset between trials, which the film shows as it slides from where it was left. |
| One trial with both questions (where was it? same place?). | Paper, Methods | A simplification: in the study, single-sense trials, two-sense localization trials and same/different trials came in separate blocks, and each trial asked one question. The film shows a flash, a beep, then a flash and a beep together, and asks both questions about the pair. |
| Fifteen volunteers; nearly 45,000 answers (counter: 44,600). | Paper, Methods | 44,600 trials were collected and 18 were discarded. The design was 3,000 trials per person. |
| Senses are sharpest straight ahead, "as expected", but the blur soon levels off. | Paper Fig 4 and Discussion | That noise grows away from the centre was known (paper refs 47–49, 79–83); "as expected" says so. The new part is the shape: a steep rise just off centre, then a plateau, within the tested range (±20° for sight, ±15° for sound). |
| Expectations: probably straight ahead, but maybe anywhere — a sharp peak on a broad hill. | Paper Fig 4C; Gaussian-Laplace prior | The spike is the Laplace component and the hill is the Gaussian one. |
| Distilled into simple formulas, they explain our volunteers' answers better than the standard assumptions. | Paper Figs 7 and 9; Limitations | The best distilled model beats the standard model by thousands of BIC points. That comparison rests on one dataset (15 people, one experiment), and the paper leaves testing other datasets to future work. "Our volunteers" keeps the claim to this dataset; do not widen it to "people" or strengthen it to "far better". The formulas shown are the study's families: σ(s) = σ₀ + k₁(1 − e^(−k₂\|s\|)) and a Gaussian + Laplace prior. The authors commit to the qualitative shapes, not to these exact formulas. |
| The pins in scene 7 sit at the study's pivot locations. | Paper, Methods | 0°, 0.1°, 0.3°, 1°, 2°, 4°, 6°, 8°, 10°, 15°, 20° (mirrored). The 45° pivot lies outside the picture. |

## Simplifications

- **All curves are illustrative.** They are drawn with display parameters chosen to
  match the shapes, not with the fitted values. That includes the belief hills, the blur
  widths, the prior, and the causal-inference demonstration (sight σ = 3, sound σ = 5,
  prior σ = 20, P(one cause) = 0.65).
- **The blur rises more gently than in the fits.** The hills stand 8 units apart, and the
  blur is drawn as σ(u) = 1 + 2.8(1 − e^(−0.15\|u\|)), so the two hills next to the centre
  come out visibly narrower than the outer four. The fitted curves in paper Fig 4 rise
  more steeply; at this spacing they would draw every off-centre hill at the same width.
- **The inset "spread of volunteers' answers"** is a schematic of paper Fig 2C (the
  standard model misses the dip in response variability straight ahead) and Figs 8C/10C
  (the distilled model captures it). The dots are not data points.
- **The scene 4 balance** shows the probability of a common cause. That probability
  depends on the prior over whether the signals share a cause, which the film does not
  discuss. The film's "prior" (scene 5 onward) is the prior over *where* things are,
  which is the one the study inferred.
- **Left out on purpose:** the auditory range recalibration (ρ_A ≈ 4/3), and the finding
  that noise is higher when both senses are presented (β_V, β_A > 1). Both are real
  findings but would need their own explanation.
- **Marmot and fox:** alpine marmots give alarm whistles and are hunted by foxes. The
  characters are stylized.

## Check before posting

- **Listen to the whole film.** I could not hear the audio. Automated checks:
  - every narration clip was transcribed back with Whisper and matches the script;
  - the level, peak and spectrum of every sound file were measured;
  - the final mix's levels were measured.

  The score and sound effects are synthesized in code, so it is worth judging whether
  they sound good.
- **Upload limits:** check each platform's current limits for length and format. The film
  is 2:31.7, in 16:9; vertical platforms (Reels, TikTok, Shorts) would need a 9:16
  re-layout.
- **Voice:** "Helen", a professional voice from the ElevenLabs Voice Library, voiced
  with `eleven_multilingual_v2`, one take per scene. To switch voices, change
  `"elevenlabs"` in `narration.json`, delete `tts/takes/<voice>/` or name the scenes with
  `--only`, then re-run `tts/make_voice.py` and `tts/verify_voice.py`. The film re-times
  itself.
- **Music:** put a track at `public/music.mp3` to replace the synthesized score. It is
  ducked under the narration automatically.
