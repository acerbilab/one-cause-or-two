# One cause or two?

An animated short about how the brain decides whether a sight and a sound come from the
same thing, and about the study *Distilling noise characteristics and prior expectations
in multisensory causal inference* (Liu, Holland, Ma & Acerbi, PLOS Computational
Biology, 2026, [doi:10.1371/journal.pcbi.1014251](https://doi.org/10.1371/journal.pcbi.1014251)).

| Folder | Contents |
|---|---|
| `film/` | The film: script, narration, sound and animation, all generated in code. See [`film/README.md`](film/README.md). |
| `site/` | The landing page: the film, an interactive version of the observer, the findings, and the lab's tools. See [`site/README.md`](site/README.md). |
| `notebook/` | A Colab notebook that fits a miniature version of the study's models to simulated data with PyBADS and compares them with PyVBMC. |

## Licence

- **Code** (everything that generates the film, the page and the notebook): [MIT](LICENSE).
- **The film** (the rendered video, its narration and sound, and the images made from it):
  [CC BY 4.0](https://creativecommons.org/licenses/by/4.0/).
- **Fonts** in `site/fonts/`: SIL Open Font License, with each font's licence alongside.
- Rebuilding the film uses [Remotion](https://www.remotion.dev), which has its own licence:
  free for individuals, non-profits and small companies, while larger companies need a paid
  one.
