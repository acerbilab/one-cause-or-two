import React from 'react';
import {useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Backdrop, fieldX, GroundLine, Hill, Label} from '../components/Diagram';
import {BalanceScale} from '../components/Scale';
import {BLUR_ROW_Y, BlurRow, CloudIcon, EyeEarIcon, IngredientCard, ROW_B_BASE, Stamp} from '../components/Ingredients';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, lerp, spr} from '../lib/anim';
import {causalInference, gauss} from '../lib/math';
import {C, FONT, MATH} from '../theme';
import {Bets, INFER_BASE, INFER_YS, OBS, tiltFor, U_MID} from './S4Infer';

const T = cues('ingredients');

// The usual assumptions: the same blur everywhere and a bell-curve prior.
export const FLAT_SIGMA = 2.6;
export const BELL_SD = 11;
export const PRIOR_YS = 5200;

// "Blurry guesses get pulled toward the prior": a sharp and a blurry guess at the same spot.
const PULL = {u: 16, sharp: 2, blurry: 8, priorSd: 12, ys: 900};
const posteriorMean = (u: number, s: number) => (u / s ** 2) / (1 / s ** 2 + 1 / PULL.priorSd ** 2);

export const S5Ingredients: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {g1, g2, g3, g4, g5} = T;

	// g1: "How far apart is too far?" asked over the previous scene's picture
	const ci = causalInference({xV: 0, xA: U_MID, ...OBS});
	const peak = {u: 0, v: 0};
	for (let u = -10; u <= 30; u += 0.25) {
		const v = ci.posteriorA(u);
		if (v > peak.v) Object.assign(peak, {u, v});
	}
	const cardsAt = g1.start + Math.round(g1.dur * 0.6);
	const handoff = 1 - ease(f, cardsAt - 6, cardsAt + 12);
	const gapQ = ease(f, g1.start + 4, g1.start + 14);

	const card1 = spr(f, cardsAt, {damping: 13});
	const card2 = spr(f, cardsAt + 10, {damping: 13});
	const hl1 = ease(f, g2.start, g2.start + 8) * (1 - ease(f, g3.start, g3.start + 8));
	const hl2 = ease(f, g3.start, g3.start + 8) * (1 - ease(f, g4.start, g4.start + 8));

	// unknown shapes wobble; in g4 they snap to the simplest assumptions
	const rowA = ease(f, g2.start + 2, g2.start + 16);
	const rowB = ease(f, g3.start + 2, g3.start + 16);
	const snap = spr(f, g4.start + Math.round(g4.dur * 0.42), {damping: 16, stiffness: 140});
	const snapB = spr(f, g4.start + Math.round(g4.dur * 0.72), {damping: 16, stiffness: 140});
	const sigmaUnknown = (u: number) => 2.6 + 1.5 * noise2D('blurrow', u * 0.07, f * 0.03);
	const sigma = (u: number) => lerp(sigmaUnknown(u), FLAT_SIGMA, snap);
	const priorUnknown = (u: number) => gauss(u, 0, 13) * Math.max(0.2, 1 + 0.45 * noise2D('prior', u * 0.09, f * 0.025));
	// g3: the pull toward the prior (the prior calms into a smooth hill for the demo)
	const pullAt = g3.start + Math.round(g3.dur * 0.45);
	const calm = ease(f, pullAt - 12, pullAt);
	const prior = (u: number) => lerp(lerp(priorUnknown(u), gauss(u, 0, 13), calm), gauss(u, 0, BELL_SD), snapB);
	const demo = ease(f, pullAt - 8, pullAt + 2) * (1 - ease(f, g4.start + 2, g4.start + 12));
	const slide = ease(f, pullAt + 6, pullAt + 34);
	const muSharp = lerp(PULL.u, posteriorMean(PULL.u, PULL.sharp), slide);
	const muBlurry = lerp(PULL.u, posteriorMean(PULL.u, PULL.blurry), slide);

	const snapAt = g4.start + Math.round(g4.dur * 0.42);
	const snapBAt = g4.start + Math.round(g4.dur * 0.72);
	const stamp1 = ease(f, snapAt + 6, snapAt + 14);
	const stamp2 = ease(f, snapBAt + 6, snapBAt + 14);
	const question = spr(f, g5.start + Math.round(g5.dur * 0.55), {damping: 9});
	const shakeX = question > 0.01 ? Math.sin(f * 1.7) * 4 * (1 - ease(f, g5.end, g5.end + 12)) : 0;
	const mathNote = ease(f, g5.start + 2, g5.start + 12);
	const out = ease(f, T._end - 16, T._end);

	return (
		<SceneShell sceneId="ingredients" standalone={standalone}>
			<Backdrop frame={f} id="s5bd" />
			{/* the previous scene's scale and hills, with the question of how far is too far */}
			<g opacity={handoff}>
				<BalanceScale tilt={tiltFor(ci.p1)} values={[`${Math.round(ci.p1 * 100)}%`, `${Math.round((1 - ci.p1) * 100)}%`]} />
				<GroundLine y={INFER_BASE} id="s5gl0" />
				<Hill id="s5v" f={(u) => gauss(u, 0, OBS.sV)} color={C.sight} baseY={INFER_BASE} yScale={INFER_YS} opacity={0.75} />
				<Hill id="s5a" f={(u) => gauss(u, U_MID, OBS.sA)} color={C.sound} baseY={INFER_BASE} yScale={INFER_YS} opacity={0.75} />
				<Hill id="s5b" f={ci.posteriorA} color={C.belief} baseY={INFER_BASE} yScale={INFER_YS} fill={0.45} stroke={6} u0={-14} u1={34} />
				{f < 14 && <Bets ci={ci} opacity={1 - ease(f, 0, 14)} labels={1 - ease(f, 0, 10)} id="s5" />}
				<g opacity={1 - ease(f, 0, 14)}>
					<text x={960} y={112} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={76} fill={C.text} letterSpacing={2}>
						causal inference
					</text>
					<text x={960} y={172} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={36} fill={C.prior}>
						the Bayesian brain: weigh the odds
					</text>
					<Label x={fieldX(0) - 64} y={INFER_BASE - gauss(0, 0, OBS.sV) * INFER_YS + 6} text="sight" color={C.sight} size={32} anchor="end" />
					<Label x={fieldX(U_MID) + 70} y={INFER_BASE - gauss(0, 0, OBS.sA) * INFER_YS + 4} text="sound" color={C.sound} size={32} anchor="start" />
					<Label x={fieldX(peak.u)} y={INFER_BASE - peak.v * INFER_YS - 26} text="your guess" color={C.belief} size={34} />
				</g>
				<g opacity={gapQ}>
					<line x1={fieldX(0)} y1={INFER_BASE + 34} x2={fieldX(U_MID)} y2={INFER_BASE + 34} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
					<path d={`M${fieldX(0) + 14},${INFER_BASE + 24} L${fieldX(0)},${INFER_BASE + 34} L${fieldX(0) + 14},${INFER_BASE + 44}`} stroke={C.text} strokeWidth={4} fill="none" strokeLinecap="round" />
					<path d={`M${fieldX(U_MID) - 14},${INFER_BASE + 24} L${fieldX(U_MID)},${INFER_BASE + 34} L${fieldX(U_MID) - 14},${INFER_BASE + 44}`} stroke={C.text} strokeWidth={4} fill="none" strokeLinecap="round" />
					<Label x={fieldX(U_MID / 2)} y={INFER_BASE + 86} text="too far?" size={36} pop={spr(f, g1.start + 4)} />
				</g>
			</g>

			<g opacity={1 - out}>
				<IngredientCard x={120} y={70} w={820} n={1} title="How blurry, and where?" color={C.sight} pop={card1} highlight={hl1} icon={<EyeEarIcon />} />
				<IngredientCard x={980} y={70} w={820} n={2} title="What's expected?" color={C.prior} pop={card2} highlight={hl2} icon={<CloudIcon />} />

				{/* ingredient 1: how blurry a guess is at each position */}
				<BlurRow sigma={sigma} opacity={rowA} unknown={rowA * (1 - snap)} frame={f} />
				<Label x={150} y={BLUR_ROW_Y - 30} text="blur" color={C.sight} size={34} anchor="start" opacity={rowA} />

				{/* ingredient 2: the prior over where things are */}
				<GroundLine y={ROW_B_BASE} opacity={rowB} id="s5gl" />
				<Hill id="s5p" f={prior} color={C.prior} baseY={ROW_B_BASE} yScale={PRIOR_YS} opacity={rowB} fill={0.4} />
				<Label x={150} y={ROW_B_BASE - 30} text="prior" color={C.prior} size={34} anchor="start" opacity={rowB} />
				<Label x={fieldX(0)} y={ROW_B_BASE + 44} text="where things usually are" size={32} weight={800} color={C.dim} opacity={rowB * (1 - snapB)} />

				{/* blurry guesses get pulled toward the prior; sharp ones barely move */}
				{demo > 0.001 && (
					<g opacity={demo}>
						<Hill id="s5ps" f={(u) => gauss(u, muSharp, PULL.sharp)} color={C.sight} baseY={ROW_B_BASE} yScale={PULL.ys} fill={0.3} />
						<Hill id="s5pb" f={(u) => gauss(u, muBlurry, PULL.blurry)} color="#9FDBFF" baseY={ROW_B_BASE} yScale={PULL.ys} fill={0.22} />
						{slide > 0.02 && (
							<g stroke="#9FDBFF" strokeWidth={4} fill="none" strokeLinecap="round">
								<line x1={fieldX(PULL.u)} y1={ROW_B_BASE - 70} x2={fieldX(muBlurry) + 8} y2={ROW_B_BASE - 70} />
								<path d={`M${fieldX(muBlurry) + 22},${ROW_B_BASE - 80} L${fieldX(muBlurry) + 8},${ROW_B_BASE - 70} L${fieldX(muBlurry) + 22},${ROW_B_BASE - 60}`} />
							</g>
						)}
						<Label x={fieldX(PULL.u) + 70} y={ROW_B_BASE - 190} text="sharp guess" size={36} color={C.sight} anchor="start" />
						<Label x={fieldX(PULL.u) + 150} y={ROW_B_BASE - 40} text="blurry guess" size={36} color="#9FDBFF" anchor="start" />
					</g>
				)}

				{/* "convenient for the math" */}
				<g opacity={mathNote}>
					<text x={fieldX(-20)} y={BLUR_ROW_Y - 150} textAnchor="middle" fontFamily={MATH} fontStyle="italic" fontSize={44} fill={C.text}>
						σ(s) = σ₀
					</text>
					<text x={fieldX(-18)} y={ROW_B_BASE - 120} textAnchor="middle" fontFamily={MATH} fontStyle="italic" fontSize={44} fill={C.text}>
						p(s) = N(0, σ²)
					</text>
				</g>
				<g transform={`translate(${shakeX},0)`}>
					<Stamp x={1440} y={420} text="ASSUMED" t={stamp1} size={84} angle={-8} />
					<Stamp x={1400} y={770} text="ASSUMED" t={stamp2} size={84} angle={6} />
				</g>
				<Label x={960} y={690} text="?" size={150} color={C.belief} pop={question} opacity={Math.min(1, question * 1.5)} />
			</g>
			<rect x={0} y={0} width={1920} height={1080} fill="#05081A" opacity={out} />

			<Sfx src="sfx/pop.wav" at={cardsAt} volume={0.35} />
			<Sfx src="sfx/pop.wav" at={cardsAt + 10} volume={0.35} />
			<Sfx src="sfx/slide.wav" at={pullAt + 6} volume={0.3} />
			<Sfx src="sfx/snap.wav" at={snapAt} volume={0.4} />
			<Sfx src="sfx/snap.wav" at={snapBAt} volume={0.4} />
			<Sfx src="sfx/stamp.wav" at={snapAt + 8} volume={0.6} />
			<Sfx src="sfx/stamp.wav" at={snapBAt + 8} volume={0.6} />
		</SceneShell>
	);
};
