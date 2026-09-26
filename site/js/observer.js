// Densities and the Bayesian causal-inference observer, ported from the film
// (film/src/lib/math.ts). Positions are in degrees; 0 is straight ahead.

export const gauss = (x, mu, sigma) =>
	Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));

export const laplace = (x, mu, b) => Math.exp(-Math.abs(x - mu) / b) / (2 * b);

/**
 * Bayesian causal inference for a visual and an auditory cue (Körding et al., 2007),
 * with Gaussian noise and a Gaussian prior centred straight ahead.
 * Returns the posterior probability of a common cause and the posterior over the
 * sound's source location, a mixture of the "one cause" and "two causes" answers.
 */
export function causalInference({xV, xA, sV, sA, sP, pCommon}) {
	const a = sV ** 2;
	const b = sA ** 2;
	const c = sP ** 2;
	const D = a * b + a * c + b * c;
	const like1 = Math.exp((-0.5 * ((xV - xA) ** 2 * c + xV ** 2 * b + xA ** 2 * a)) / D) / (2 * Math.PI * Math.sqrt(D));
	const like2 = Math.exp(-0.5 * (xV ** 2 / (a + c) + xA ** 2 / (b + c))) / (2 * Math.PI * Math.sqrt((a + c) * (b + c)));
	const p1 = (pCommon * like1) / (pCommon * like1 + (1 - pCommon) * like2);
	const prec1 = 1 / a + 1 / b + 1 / c;
	const mu1 = (xV / a + xA / b) / prec1;
	const sd1 = Math.sqrt(1 / prec1);
	const precA2 = 1 / b + 1 / c;
	const muA2 = xA / b / precA2;
	const sdA2 = Math.sqrt(1 / precA2);
	return {
		p1,
		posteriorA: (s) => p1 * gauss(s, mu1, sd1) + (1 - p1) * gauss(s, muA2, sdA2),
	};
}

// Shapes drawn in the film's "let the data draw" scene. Display parameters chosen to show
// the shapes the study found, not its fitted values.
export const FLAT_SIGMA = 2.6;
export const BELL_SD = 11;
export const noiseFound = (u) => 1.0 + 2.8 * (1 - Math.exp(-0.15 * Math.abs(u)));
export const priorFound = (u) => 0.88 * gauss(u, 0, 11) + 0.12 * laplace(u, 0, 1.0);
export const priorAssumed = (u) => gauss(u, 0, BELL_SD);

/** SVG path for y = f(u) over [u0, u1]; closed down to the baseline unless `closed` is false. */
export function curvePath(f, u0, u1, toX, baseY, yScale, closed = true, samples = 240) {
	let d = '';
	for (let i = 0; i <= samples; i++) {
		const u = u0 + ((u1 - u0) * i) / samples;
		d += `${i === 0 ? 'M' : 'L'}${toX(u).toFixed(1)},${(baseY - f(u) * yScale).toFixed(1)}`;
	}
	if (closed) d += `L${toX(u1).toFixed(1)},${baseY}L${toX(u0).toFixed(1)},${baseY}Z`;
	return d;
}

/** The range where f is visibly above zero, so flat tails don't paint over the ground line. */
export function visibleRange(f, u0, u1, frac = 0.006, n = 400) {
	let peak = 0;
	for (let i = 0; i <= n; i++) peak = Math.max(peak, f(u0 + ((u1 - u0) * i) / n));
	let a = u0;
	let b = u1;
	for (let i = 0; i <= n; i++) {
		const u = u0 + ((u1 - u0) * i) / n;
		if (f(u) > peak * frac) {
			a = u;
			break;
		}
	}
	for (let i = n; i >= 0; i--) {
		const u = u0 + ((u1 - u0) * i) / n;
		if (f(u) > peak * frac) {
			b = u;
			break;
		}
	}
	return [a, b];
}
