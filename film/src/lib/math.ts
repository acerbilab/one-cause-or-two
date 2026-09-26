// Probability densities and the Bayesian observer used by the diagrams.
// Units are "field units" u: horizontal position in the scene, 0 = straight ahead.

export const gauss = (x: number, mu: number, sigma: number) =>
	Math.exp(-0.5 * ((x - mu) / sigma) ** 2) / (sigma * Math.sqrt(2 * Math.PI));

export const laplace = (x: number, mu: number, b: number) => Math.exp(-Math.abs(x - mu) / b) / (2 * b);

/** Precision-weighted combination of two Gaussian cues (forced fusion). */
export const fuse = (m1: number, s1: number, m2: number, s2: number) => {
	const w1 = 1 / s1 ** 2;
	const w2 = 1 / s2 ** 2;
	return {mu: (m1 * w1 + m2 * w2) / (w1 + w2), sigma: Math.sqrt(1 / (w1 + w2))};
};

export type CIParams = {
	xV: number;
	xA: number;
	sV: number;
	sA: number;
	sP: number; // prior width (prior centred at 0)
	pCommon: number;
};

/**
 * Bayesian causal inference for a visual and an auditory cue (Körding et al., 2007),
 * with Gaussian noise and a Gaussian prior centred straight ahead.
 * Returns the posterior probability of a common cause and the posterior over the
 * auditory source location, a mixture of the "one cause" and "two causes" answers.
 */
export const causalInference = ({xV, xA, sV, sA, sP, pCommon}: CIParams) => {
	const a = sV ** 2;
	const b = sA ** 2;
	const c = sP ** 2;
	const D = a * b + a * c + b * c;
	const like1 = Math.exp((-0.5 * ((xV - xA) ** 2 * c + xV ** 2 * b + xA ** 2 * a)) / D) / (2 * Math.PI * Math.sqrt(D));
	const like2 =
		Math.exp(-0.5 * (xV ** 2 / (a + c) + xA ** 2 / (b + c))) / (2 * Math.PI * Math.sqrt((a + c) * (b + c)));
	const p1 = (pCommon * like1) / (pCommon * like1 + (1 - pCommon) * like2);
	const prec1 = 1 / a + 1 / b + 1 / c;
	const mu1 = (xV / a + xA / b) / prec1;
	const sd1 = Math.sqrt(1 / prec1);
	const precA2 = 1 / b + 1 / c;
	const muA2 = xA / b / precA2;
	const sdA2 = Math.sqrt(1 / precA2);
	return {
		p1,
		mu1,
		sd1,
		muA2,
		sdA2,
		/** posterior density over the sound's source location */
		posteriorA: (s: number) => p1 * gauss(s, mu1, sd1) + (1 - p1) * gauss(s, muA2, sdA2),
	};
};

/** Distilled noise shape from the study: sharpest straight ahead, levelling off. */
export const expNoise = (s: number, s0 = 1.2, k1 = 2.6, k2 = 0.35) => s0 + k1 * (1 - Math.exp(-k2 * Math.abs(s)));

/** Distilled prior shape from the study: Gaussian + Laplace mixture. */
export const gaussLaplacePrior = (s: number, sigma = 11, b = 0.9, w = 0.35) =>
	(1 - w) * gauss(s, 0, sigma) + w * laplace(s, 0, b);

/** SVG path for y = f(u) over [u0, u1], filled down to the baseline. */
export const curvePath = (
	f: (u: number) => number,
	u0: number,
	u1: number,
	toX: (u: number) => number,
	baseY: number,
	yScale: number,
	closed = true,
	samples = 240,
) => {
	let d = '';
	for (let i = 0; i <= samples; i++) {
		const u = u0 + ((u1 - u0) * i) / samples;
		const x = toX(u);
		const y = baseY - f(u) * yScale;
		d += `${i === 0 ? 'M' : 'L'}${x.toFixed(1)},${y.toFixed(1)}`;
	}
	if (closed) d += `L${toX(u1).toFixed(1)},${baseY}L${toX(u0).toFixed(1)},${baseY}Z`;
	return d;
};

/** Inverse standard normal CDF (Acklam's rational approximation, |error| < 1.2e-9). */
export const probit = (p: number) => {
	const a = [-39.6968302866538, 220.946098424521, -275.928510446969, 138.357751867269, -30.6647980661472, 2.50662827745924];
	const b = [-54.4760987982241, 161.585836858041, -155.698979859887, 66.8013118877197, -13.2806815528857];
	const c = [-0.00778489400243029, -0.322396458041136, -2.40075827716184, -2.54973253934373, 4.37466414146497, 2.93816398269878];
	const d = [0.00778469570904146, 0.32246712907004, 2.445134137143, 3.75440866190742];
	const lo = 0.02425;
	if (p < lo) {
		const q = Math.sqrt(-2 * Math.log(p));
		return (((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
	}
	if (p > 1 - lo) {
		const q = Math.sqrt(-2 * Math.log(1 - p));
		return -(((((c[0] * q + c[1]) * q + c[2]) * q + c[3]) * q + c[4]) * q + c[5]) / ((((d[0] * q + d[1]) * q + d[2]) * q + d[3]) * q + 1);
	}
	const q = p - 0.5;
	const r = q * q;
	return ((((((a[0] * r + a[1]) * r + a[2]) * r + a[3]) * r + a[4]) * r + a[5]) * q) / (((((b[0] * r + b[1]) * r + b[2]) * r + b[3]) * r + b[4]) * r + 1);
};
