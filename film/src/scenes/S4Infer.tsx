import React from 'react';
import {useCurrentFrame} from 'remotion';
import {Backdrop, fieldX, GroundLine, Hill, Label} from '../components/Diagram';
import {BalanceScale, SCALE} from '../components/Scale';
import {POV, PovMeadow} from '../components/Pov';
import {Bird, FoxIcon} from '../components/Characters';
import {CUES, FUSED, HILL_SCALE} from './S2Blur';
import {PHANTOM} from './S3Catch';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, lerp, spr} from '../lib/anim';
import {causalInference, gauss} from '../lib/math';
import {C, FONT, MONO} from '../theme';

const T = cues('infer');

// Observer used for the demonstration (field units): sharp sight, blurrier sound,
// a broad prior straight ahead, and a mild prior preference for "one cause".
export const OBS = {sV: 3, sA: 5, sP: 20, pCommon: 0.65};
export const INFER_BASE = 870;
export const INFER_YS = 1350;
const U_CLOSE = 3;
const U_FAR = 21;
export const U_MID = 12.5;

/** Where the sound sits over time: close, then far, then in between. */
export const soundU = (f: number) => {
	const {i5, i6} = T;
	let u = U_CLOSE;
	u = lerp(u, U_FAR, ease(f, i5.start + 2, i5.start + 34));
	u = lerp(u, U_MID, ease(f, i6.start + 2, i6.start + 30));
	return u;
};

export const tiltFor = (p1: number) => -(p1 - 0.5) * 2 * 11;

/** "Hedge your bets": the merged and the separate answer under your guess, as faint dashed bumps. */
export const Bets: React.FC<{ci: ReturnType<typeof causalInference>; opacity: number; labels: number; id: string}> = ({ci, opacity, labels, id}) => (
	<g>
		<Hill id={`${id}bm`} f={(u) => ci.p1 * gauss(u, ci.mu1, ci.sd1)} color={C.belief} baseY={INFER_BASE} yScale={INFER_YS} opacity={0.85 * opacity} fill={0} stroke={3} dashed glow={false} u0={-14} u1={34} />
		<Hill id={`${id}bs`} f={(u) => (1 - ci.p1) * gauss(u, ci.muA2, ci.sdA2)} color={C.belief} baseY={INFER_BASE} yScale={INFER_YS} opacity={0.85 * opacity} fill={0} stroke={3} dashed glow={false} u0={-14} u1={34} />
		<Label x={fieldX(ci.mu1)} y={INFER_BASE + 50} text="merge" color={C.belief} size={32} opacity={labels} />
		<Label x={fieldX(ci.muA2)} y={INFER_BASE + 50} text="separate" color={C.belief} size={32} opacity={labels} />
	</g>
);

const Title: React.FC<{f: number; start: number; text: string; y: number; size: number; color?: string; weight?: number}> = ({
	f,
	start,
	text,
	y,
	size,
	color = C.text,
	weight = 900,
}) => (
	<text x={960} y={y} textAnchor="middle" fontFamily={FONT} fontWeight={weight} fontSize={size} fill={color} letterSpacing={2}>
		{text.split('').map((ch, i) => {
			const p = spr(f, start + i * 1.3, {damping: 12, stiffness: 180});
			return (
				<tspan key={i} opacity={p} dy={0}>
					{ch}
				</tspan>
			);
		})}
	</text>
);

export const S4Infer: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {i1, i2, i3, i4} = T;

	const build = spr(f, 10, {damping: 15, stiffness: 90});
	// the phantom fox and the bird are carried from the meadow onto the pans
	const foxLand = i1.start + Math.round(i1.dur * 0.72);
	const birdLand = i1.start + Math.round(i1.dur * 0.9);
	const foxFly = ease(f, foxLand - 26, foxLand, 0, 1);
	const birdFly = ease(f, birdLand - 26, birdLand, 0, 1);
	const iconL = f >= foxLand ? 1 : 0;
	const iconR = f >= birdLand ? spr(f, birdLand - 4, {damping: 16}) : 0;
	const handoff = 1 - ease(f, 2, 26);
	const weigh = ease(f, i3.start + 4, i3.start + 14) * (1 - ease(f, i4.start - 10, i4.start + 2));
	const hills = ease(f, i4.start - 6, i4.start + 12);

	const uA = soundU(f);
	const ci = causalInference({xV: 0, xA: uA, ...OBS});
	const tilt = hills * tiltFor(ci.p1) + weigh * 7 * Math.sin((f - i3.start) * 0.22);

	// the amber belief: posterior over where the sound came from
	let peakU = 0;
	let peakV = 0;
	for (let u = -10; u <= 30; u += 0.25) {
		const v = ci.posteriorA(u);
		if (v > peakV) {
			peakV = v;
			peakU = u;
		}
	}
	// i6: the two bets inside your guess, each weighted by its odds
	const bets = ease(f, T.i6.start + 4, T.i6.start + 16);
	const vTop = INFER_BASE - gauss(0, 0, OBS.sV) * INFER_YS;
	const aTop = INFER_BASE - gauss(0, 0, OBS.sA) * INFER_YS;
	const pct = (p: number) => `${Math.round(p * 100)}%`;

	return (
		<SceneShell sceneId="infer" standalone={standalone}>
			<Backdrop frame={f} id="s4bd" />
			{/* the meadow from the previous scene dissolves into the diagram */}
			{handoff > 0 && (
				<g opacity={handoff}>
					<PovMeadow frame={f + 460} dim={0.85} />
					<GroundLine y={POV.base} id="s4pgl" />
					<Hill id="s4pv" f={(u) => gauss(u, CUES.uV, CUES.sV)} color={C.sight} baseY={POV.base} yScale={HILL_SCALE} opacity={0.78 * 0.55} />
					<Hill id="s4pa" f={(u) => gauss(u, CUES.uA, CUES.sA)} color={C.sound} baseY={POV.base} yScale={HILL_SCALE} opacity={0.78 * 0.55} />
					<Hill id="s4pf" f={(u) => gauss(u, FUSED.mu, FUSED.sigma)} color={C.belief} baseY={POV.base} yScale={HILL_SCALE} fill={0.5} />
					<Label x={fieldX(CUES.uV) - 170} y={POV.flickerY - 110} text="wind" size={40} />
					<Label x={fieldX(CUES.uA) + 150} y={POV.bushY - 190} text="bird" size={40} />
					<Label x={PHANTOM.qx} y={PHANTOM.qy} text="?" size={96} color={C.belief} />
				</g>
			)}

			<Title f={f} start={i2.start + 2} text="causal inference" y={112} size={76} />
			<g opacity={ease(f, i3.start + 12, i3.start + 22)}>
				<text x={960} y={172} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={36} fill={C.prior}>
					the Bayesian brain: weigh the odds
				</text>
			</g>

			<BalanceScale
				tilt={tilt}
				build={build}
				iconL={iconL}
				iconR={iconR}
				labels={Math.min(iconL, iconR)}
				values={[pct(ci.p1), pct(1 - ci.p1)]}
				valueOpacity={hills}
			/>

			{f < foxLand && (
				<g>
					<g opacity={1 - foxFly}>
						<FoxIcon
							x={lerp(PHANTOM.x, SCALE.x - SCALE.arm - 14, foxFly)}
							y={lerp(PHANTOM.y, SCALE.y + SCALE.drop - 6, foxFly) - Math.sin(foxFly * Math.PI) * 80}
							s={lerp(0.95, 0.62, foxFly)}
							ghost
						/>
					</g>
					<g opacity={foxFly}>
						<FoxIcon
							x={lerp(PHANTOM.x, SCALE.x - SCALE.arm - 14, foxFly)}
							y={lerp(PHANTOM.y, SCALE.y + SCALE.drop - 6, foxFly) - Math.sin(foxFly * Math.PI) * 80}
							s={lerp(0.95, 0.62, foxFly)}
						/>
					</g>
				</g>
			)}
			{f < birdLand && (
				<Bird
					x={lerp(fieldX(CUES.uA) + 20, SCALE.x + SCALE.arm + 46, birdFly)}
					y={lerp(POV.bushY - 150, SCALE.y + SCALE.drop - 4, birdFly) - Math.sin(birdFly * Math.PI) * 120}
					s={lerp(1.25, 0.9, birdFly)}
					facing={birdFly > 0.5 ? 1 : -1}
					hop={birdFly > 0 && birdFly < 1 ? 0.5 + 0.5 * Math.sin(f * 1.6) : 0}
				/>
			)}
			<GroundLine y={INFER_BASE} opacity={hills} id="s4gl" />
			<Hill id="s4v" f={(u) => gauss(u, 0, OBS.sV)} color={C.sight} baseY={INFER_BASE} yScale={INFER_YS} opacity={hills * 0.75} />
			<Hill id="s4a" f={(u) => gauss(u, uA, OBS.sA)} color={C.sound} baseY={INFER_BASE} yScale={INFER_YS} opacity={hills * 0.75} />
			<Hill id="s4b" f={ci.posteriorA} color={C.belief} baseY={INFER_BASE} yScale={INFER_YS} opacity={hills} fill={0.45} stroke={6} u0={-14} u1={34} />
			{bets > 0.001 && <Bets ci={ci} opacity={bets} labels={bets} id="s4" />}
			<Label x={fieldX(0) - 64} y={vTop + 6} text="sight" color={C.sight} size={32} opacity={hills} anchor="end" />
			<Label x={fieldX(uA) + 70} y={aTop + 4} text="sound" color={C.sound} size={32} opacity={hills} anchor="start" />
			<Label x={fieldX(peakU)} y={INFER_BASE - peakV * INFER_YS - 26} text="your guess" color={C.belief} size={34} opacity={hills} />

			{/* easter egg: Bayes' rule for the common-cause hypothesis */}
			<Label
				x={130}
				y={908}
				anchor="start"
				text="P(one cause | sight, sound) ∝ P(sight, sound | one cause) · P(one cause)"
				size={20}
				weight={400}
				font={MONO}
				color={C.dim}
				opacity={ease(f, i3.start + 16, i3.start + 30) * (1 - ease(f, i4.start + 20, i4.start + 34)) * 0.85}
			/>
			<Sfx src="sfx/pop.wav" at={foxLand} volume={0.4} />
			<Sfx src="sfx/chirp_R.wav" at={birdLand - 20} volume={0.35} />
			<Sfx src="sfx/pop.wav" at={birdLand} volume={0.4} />
			<Sfx src="sfx/creak.wav" at={i3.start + 6} volume={0.35} />
			<Sfx src="sfx/slide.wav" at={T.i5.start + 2} volume={0.35} />
			<Sfx src="sfx/slide.wav" at={T.i6.start + 2} volume={0.35} />
		</SceneShell>
	);
};
