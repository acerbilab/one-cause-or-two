import React from 'react';
import {interpolateColors, random, useCurrentFrame} from 'remotion';
import {noise2D} from '@remotion/noise';
import {Backdrop, fieldX, GroundLine, Hill, Label} from '../components/Diagram';
import {BlurRow} from '../components/Ingredients';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, lerp, spr} from '../lib/anim';
import {curvePath, gauss, laplace} from '../lib/math';
import {C, MATH, MONO} from '../theme';
import {BELL_SD, FLAT_SIGMA} from './S5Ingredients';

const T = cues('draw');

// The study's pivot locations (degrees), mirrored; 45° lies outside the picture.
const PIVOTS = [0, 0.1, 0.3, 1, 2, 4, 6, 8, 10, 15, 20];
const PIVOTS_ALL = [...PIVOTS.slice(1).map((p) => -p).reverse(), ...PIVOTS];

// Shapes found by the study (display parameters)
export const noiseFound = (u: number) => 1.0 + 2.8 * (1 - Math.exp(-0.15 * Math.abs(u)));
export const priorFound = (u: number) => 0.88 * gauss(u, 0, 11) + 0.12 * laplace(u, 0, 1.0);
export const priorAssumed = (u: number) => gauss(u, 0, BELL_SD);

// Panel geometry
const BLUR7_Y = 400;
export const PRIOR_BASE = 850;
export const PRIOR_YS = 4000;

export const S7Draw: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {d1, d2, d3, d4} = T;

	const panels = ease(f, 0, 14);
	// d1: the data pull the pins from the assumed shapes to the measured ones.
	// Each pin has its own timing; between pins the timing is interpolated, so the
	// curve moves smoothly and ends exactly on the measured shape.
	const pinT = (p: number, which: string) => {
		const t0 = d1.start + 16 + random(`${which}${p}`) * 26;
		return ease(f, t0, t0 + 34);
	};
	const settle = 1 - ease(f, d1.end, d1.end + 20);
	const interp = (u: number, g: (p: number) => number) => {
		const uc = Math.max(PIVOTS_ALL[0], Math.min(PIVOTS_ALL[PIVOTS_ALL.length - 1], u));
		const k = Math.max(1, PIVOTS_ALL.findIndex((p) => p >= uc));
		const a = PIVOTS_ALL[k - 1];
		const b = PIVOTS_ALL[k];
		return lerp(g(a), g(b), b === a ? 0 : (uc - a) / (b - a));
	};
	const jig = (p: number, which: string) => noise2D(which, p * 0.3, f * 0.12) * settle;
	const noiseNow = (u: number) =>
		lerp(FLAT_SIGMA, noiseFound(u), interp(u, (p) => pinT(p, 'n'))) + 0.25 * interp(u, (p) => jig(p, 'n'));
	const priorNow = (u: number) =>
		Math.exp(lerp(Math.log(priorAssumed(u)), Math.log(priorFound(u)), interp(u, (p) => pinT(p, 'p')))) *
		(1 + 0.08 * interp(u, (p) => jig(p, 'p')));
	const priorPin = priorNow;
	const pinsOn = ease(f, d1.start + 6, d1.start + 16) * (1 - ease(f, d4.start + 10, d4.start + 40));

	// d2: labels for the blur
	const lblSharp = ease(f, d2.start + 12, d2.start + 22);
	const lvlAt = d2.start + Math.round(d2.dur * 0.66);
	const lblLevel = ease(f, lvlAt, lvlAt + 10);
	const focusA = ease(f, d2.start - 6, d2.start + 8) * (1 - ease(f, d3.start - 6, d3.start + 6));
	// d3: the prior
	const peakAt = d3.start + Math.round(d3.dur * 0.2);
	const hillAt = d3.start + Math.round(d3.dur * 0.46);
	const lblPeak = ease(f, peakAt, peakAt + 10);
	const lblHill = ease(f, hillAt, hillAt + 10);
	const focusB = ease(f, d3.start - 6, d3.start + 8) * (1 - ease(f, d4.start - 6, d4.start + 6));
	// d4: distilled into formulas
	const formulaA = ease(f, d4.start + 22, d4.start + 36);
	const formulaB = ease(f, d4.start + 40, d4.start + 54);
	const betterAt = d4.start + Math.round(d4.dur * 0.42); // "…explain our volunteers' answers…"
	const ghosts = 1 - ease(f, betterAt, betterAt + 20);
	const better = ease(f, betterAt, betterAt + 14);
	const exit = ease(f, T._end - 26, T._end);

	const dimA = (1 - 0.55 * focusB) * (1 - 0.45 * better);
	const dimB = (1 - 0.55 * focusA) * (1 - 0.45 * better);

	// incoming data: the lab's answers (resting where the previous scene left them) fly up
	// into the two panels, changing colour on the way
	const dataDots = Array.from({length: 90}, (_, i) => {
		const toNoise = i % 2 === 0;
		const pv = toNoise ? [-24, -16, -8, 0, 8, 16, 24][Math.floor(i / 2) % 7] : PIVOTS_ALL[Math.floor(i / 2) % PIVOTS_ALL.length];
		const t0 = d1.start + 2 + random(`dd${i}`) * 34;
		const t = Math.min(1, Math.max(0, (f - t0) / 22));
		if (t >= 1) return null;
		const x0 = 960 + (random(`tx${i}`) - 0.5) * 900;
		const tx = fieldX(pv);
		const ty = toNoise ? BLUR7_Y - 330 / (noiseNow(pv) * Math.sqrt(2 * Math.PI)) : PRIOR_BASE - priorNow(pv) * PRIOR_YS;
		const from = i % 2 ? C.sight : C.sound;
		const to = toNoise ? C.sight : C.prior;
		return (
			<circle
				key={i}
				cx={lerp(x0, tx, t)}
				cy={lerp(900, ty, t * (2 - t))}
				r={6}
				fill={interpolateColors(t, [0, 1], [from, to])}
				opacity={1 - t * 0.7}
			/>
		);
	});

	return (
		<SceneShell sceneId="draw" standalone={standalone}>
			<Backdrop frame={f} id="s7bd" />
			<rect x={0} y={0} width={1920} height={1080} fill="#05081A" opacity={1 - panels} />

			{/* ─── blur panel: one small hill per position, as in the ingredients scene ─── */}
			<g opacity={panels * dimA * (1 - exit)}>
				<Label x={150} y={BLUR7_Y - 40} text="blur" color={C.sight} size={36} anchor="start" />
				<BlurRow sigma={() => FLAT_SIGMA} frame={f} baseY={BLUR7_Y} ghost opacity={0.6 * ghosts} />
				<BlurRow sigma={noiseNow} frame={f} baseY={BLUR7_Y} />
				<Label x={960} y={BLUR7_Y + 50} text="sharpest straight ahead" size={32} color={C.text} opacity={lblSharp * (1 - formulaA)} pop={spr(f, d2.start + 12)} />
				<Label x={fieldX(-20)} y={BLUR7_Y + 50} text="levels off" size={32} color={C.text} opacity={lblLevel * (1 - formulaA)} pop={spr(f, lvlAt)} />
				<Label x={fieldX(20)} y={BLUR7_Y + 50} text="levels off" size={32} color={C.text} opacity={lblLevel * (1 - formulaA)} pop={spr(f, lvlAt)} />
				<text x={fieldX(17)} y={BLUR7_Y + 62} textAnchor="middle" fontFamily={MATH} fontStyle="italic" fontSize={40} fill={C.text} opacity={formulaA}>
					σ(s) = σ₀ + k₁(1 − e
					<tspan dy={-16} fontSize={27}>
						−k₂|s|
					</tspan>
					<tspan dy={16}>)</tspan>
				</text>
			</g>

			{/* ─── prior panel ─── */}
			<g opacity={panels * dimB}>
				<Label x={150} y={PRIOR_BASE - 60} text="prior" color={C.prior} size={36} anchor="start" opacity={1 - exit} />
				<g opacity={1 - exit}>
					<GroundLine y={PRIOR_BASE} id="s7glb" />
				</g>
				<Hill id="s7ghost" f={priorAssumed} color={C.prior} baseY={PRIOR_BASE} yScale={PRIOR_YS} opacity={0.45 * ghosts * (1 - exit)} fill={0} stroke={3} dashed glow={false} />
				<Hill id="s7prior" f={priorNow} color={C.prior} baseY={PRIOR_BASE} yScale={PRIOR_YS} fill={0.4} u0={-30} u1={30} />
				{PIVOTS_ALL.map((p) => (
					<circle key={p} cx={fieldX(p)} cy={PRIOR_BASE - priorPin(p) * PRIOR_YS} r={6} fill="#FFFFFF" stroke={C.prior} strokeWidth={2} opacity={pinsOn} />
				))}
				<g opacity={1 - exit}>
					<Label x={fieldX(0) + 120} y={PRIOR_BASE - priorFound(0) * PRIOR_YS + 30} text="probably straight ahead" size={32} anchor="start" opacity={lblPeak * (1 - formulaB)} to={{x: fieldX(0) + 14, y: PRIOR_BASE - priorFound(0) * PRIOR_YS + 16}} pop={spr(f, peakAt)} />
					<Label x={fieldX(-17)} y={PRIOR_BASE - priorFound(15) * PRIOR_YS - 110} text="but maybe anywhere" size={32} opacity={lblHill * (1 - formulaB)} to={{x: fieldX(-13), y: PRIOR_BASE - priorFound(13) * PRIOR_YS - 8}} pop={spr(f, hillAt)} />
					<text x={fieldX(-19)} y={PRIOR_BASE - 170} textAnchor="middle" fontFamily={MATH} fontStyle="italic" fontSize={38} fill={C.text} opacity={formulaB}>
						Gaussian + Laplace
					</text>
				</g>
			</g>

			{dataDots}

			{/* standard vs distilled: how scattered the volunteers' answers were, and each model's prediction */}
			{better > 0.001 && (
				<g opacity={better * (1 - exit)}>
					<rect x={380} y={34} width={1160} height={300} rx={26} fill="rgba(8,12,34,0.9)" stroke="#34427E" strokeWidth={3} />
					<Label x={960} y={88} text="spread of volunteers' answers" size={34} weight={800} color={C.dim} />
					<line x1={640} y1={300 - 2.95 * 62} x2={1280} y2={300 - 2.95 * 62} stroke={C.dim} strokeWidth={5} strokeDasharray="14 10" />
					<Label x={1300} y={300 - 2.95 * 62 + 11} text="standard model" size={34} weight={800} color={C.dim} anchor="start" />
					<path
						d={curvePath((i) => 1.6 + 0.9 * (1 - Math.exp(-0.9 * Math.abs(i))), -3.2, 3.2, (i) => 960 + i * 100, 300, 62, false, 120)}
						stroke={C.belief}
						strokeWidth={6}
						fill="none"
					/>
					<Label x={1300} y={300 - 2.46 * 62 + 40} text="distilled model" size={34} weight={800} color={C.belief} anchor="start" />
					{[2.46, 2.33, 2.1, 1.62, 2.14, 2.31, 2.47].map((sd, i) => (
						<circle key={i} cx={960 + (i - 3) * 100} cy={300 - sd * 62} r={11} fill="#FFFFFF" />
					))}
					<Label x={632} y={300 - 2.46 * 62 + 11} text="volunteers" size={30} weight={800} color="#FFFFFF" anchor="end" />
					<Label x={960} y={318} text="straight ahead" size={26} weight={700} color={C.dim} />
				</g>
			)}

			<Sfx src="sfx/pile_v.wav" at={d1.start + 4} volume={0.3} />
			<Sfx src="sfx/pile_a.wav" at={d1.start + 18} volume={0.3} />
			<Sfx src="sfx/chime.wav" at={d4.start + 22} volume={0.35} />
			<Sfx src="sfx/chime.wav" at={d4.start + 40} volume={0.35} />
		</SceneShell>
	);
};
