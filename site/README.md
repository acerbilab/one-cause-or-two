# The landing page

A single static page, with no framework and no build step, in the film's visual style.
It will be published with GitHub Pages at <https://acerbilab.github.io/one-cause-or-two/>.

| Path | Contents |
|---|---|
| `index.html` | The page: the film, "Try it yourself", findings, related work, methods, citation, follow links |
| `css/style.css` | Styles; the palette and type follow the film |
| `js/observer.js` | The Bayesian causal-inference observer and the assumed and found shapes, ported from `film/src/lib/math.ts` and the film's scenes 5 and 7 |
| `js/main.js` | The interactive balance, the two findings figures, the transcript, "Copy BibTeX", "Share the film" |
| `assets/` | Poster frame, social-card image, favicon |
| `fonts/` | Nunito, JetBrains Mono and STIX Two (SIL Open Font License), served from the page itself |
| `media/` | The film and its captions (ignored by git; see below) |

## The film

The video is not in git. The page plays `media/film-clean.mp4` with the caption track
`media/film.vtt`, and builds its transcript from the same captions.

- **Locally:** copy them from a render.

  ```sh
  mkdir -p site/media
  cp film/out/film-clean.mp4 film/out/film.vtt site/media/
  ```

- **Deployed:** `.github/workflows/pages.yml` downloads both files from a GitHub release.
  Every release must carry `film-clean.mp4` and `film.vtt`, and also `film.mp4` (burned-in
  captions), which the page's download link points to. `film.vtt` is written by
  `film/tts/make_voice.py`, next to `film.srt`.

## Preview

```sh
python -m http.server 8000 -d site
```

Then open <http://127.0.0.1:8000>. Opening `index.html` as a file does not work: the page
loads JavaScript modules and fetches the captions.

## Deploy

GitHub Pages must be enabled with "GitHub Actions" as the source. Then run the workflow
*Deploy the landing page* from the Actions tab, optionally with a release tag (the default is
the latest release).

Some links work only once the repo is public and has a release: "Open in Colab", the
notebook and the source on GitHub, and the film downloads in "Reuse the film".

## When the film changes

- **Poster and social card.** `assets/poster.jpg` is frame 178 of the film (the two thought
  bubbles), and `assets/og.jpg` is a 1200×630 crop of the same frame. To remake them:

  ```sh
  cd film
  npm run stills -- Film 178 --clean --full     # out/stills/Film-178-clean.png
  ```

  Then save the frame as a 1600×900 JPEG for the poster and crop it to 1200×630 for the
  card.
- **Findings figures and the demo** are drawn from `js/observer.js`. Its display parameters
  match the film's; if the film's shapes change, change them here too.
