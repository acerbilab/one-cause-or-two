# One cause or two?

An animated short about how the brain decides whether a sight and a sound come from the
same thing, and about the study *Distilling noise characteristics and prior expectations
in multisensory causal inference* (Liu, Holland, Ma & Acerbi, PLOS Computational
Biology, 2026, [doi:10.1371/journal.pcbi.1014251](https://doi.org/10.1371/journal.pcbi.1014251)).

**Watch it** on [YouTube](https://www.youtube.com/watch?v=Je3AaCCAd54) or on
[its landing page](https://acerbilab.github.io/one-cause-or-two/), which also has an
interactive version of the brain's decision and the study's findings.

| Folder | Contents |
|---|---|
| `film/` | The film: script, narration, sound and animation, all generated in code. See [`film/README.md`](film/README.md). |
| `site/` | The landing page: the film, an interactive version of the observer, the findings, and the lab's tools. See [`site/README.md`](site/README.md). |
| `notebook/` | A Colab notebook that fits a miniature version of the study's models to simulated data with PyBADS and compares them with PyVBMC. |

## How the film was made

The film was made with [Claude Code](https://claude.com/claude-code), Anthropic's AI coding
assistant, running [Claude Opus 5.5](https://www.anthropic.com/claude-opus-5-5). Luigi
Acerbi directed it, chose the story and the science, and checked every claim against the
paper. Claude drafted the script and the storyboard, and wrote all the code. It turned out
to be an enthusiastic science communicator and kept inflating our findings, despite the
caveats in the paper.

- **Script.** [`film/narration.json`](film/narration.json) holds every spoken line.
  [`film/NOTES.md`](film/NOTES.md) traces each claim to the paper and lists the
  simplifications made for a general audience. Independent reviews, also by Claude, checked
  the script against the paper and critiqued the rendered frames.
- **Pictures.** Everything on screen is SVG drawn in code and animated with
  [Remotion](https://www.remotion.dev). The curves come from the maths: the belief hills
  combine as Gaussians, and the causal-inference diagrams run the Bayesian observer of
  Körding et al. (2007), with parameters chosen for display.
  [`film/STORYBOARD.md`](film/STORYBOARD.md) describes the film scene by scene.
- **Narration.** Text-to-speech with [ElevenLabs](https://elevenlabs.io), one continuous
  take per scene, cut into lines at the pauses; the TV anchor's line comes from
  [Kokoro](https://huggingface.co/hexgrad/Kokoro-82M), run locally. Every line is
  transcribed back with Whisper to catch dropped or garbled words.
- **Sound.** The effects, the ambience and the score are synthesized with NumPy.
- **Timing.** The narration sets the timing: each scene animates relative to its spoken
  lines, so rewording a line re-times the film.

[`film/README.md`](film/README.md) explains how to rebuild it.

## Licence

- **Code** (everything that generates the film, the page and the notebook): [MIT](LICENSE).
- **The film** (the rendered video, its narration and sound, and the images made from it):
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **The narration** was generated with ElevenLabs and is also subject to the
  [ElevenLabs terms](https://elevenlabs.io/terms-of-use).
- **Fonts** in `site/fonts/`: SIL Open Font License, with each font's licence alongside.
- Rebuilding the film uses [Remotion](https://www.remotion.dev), which has its own licence:
  free for individuals, non-profits and small companies, while larger companies need a paid
  one.
