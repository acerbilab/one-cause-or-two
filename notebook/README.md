# Notebook

`one_cause_or_two.ipynb` works through the question of Liu, Holland, Ma & Acerbi (2026) in
miniature: a Bayesian causal-inference observer with eccentricity-dependent sensory noise,
fitted to a simulated participant with [PyBADS](https://acerbilab.github.io/pybads/) and
compared with a constant-noise model using [PyVBMC](https://acerbilab.github.io/pyvbmc/).

[Open it in Colab](https://colab.research.google.com/github/acerbilab/one-cause-or-two/blob/main/notebook/one_cause_or_two.ipynb),
or run it locally with Python 3.10 or later, from the repository root:

```sh
python -m venv notebook/.venv
notebook/.venv/Scripts/python -m pip install pybads pyvbmc numpy scipy matplotlib jupyterlab   # bin/ instead of Scripts/ on macOS and Linux
notebook/.venv/Scripts/python -m jupyter lab notebook/one_cause_or_two.ipynb
```
