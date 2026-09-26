import React, {useMemo} from 'react';
import {useCurrentFrame} from 'remotion';
import {DotPile, IrisMask, makePile, POV, PovMeadow} from '../components/Pov';
import {Shimmer, SoundArcs} from '../components/Props';
import {FoxIcon} from '../components/Characters';
import {fieldX, GroundLine, Hill, Label} from '../components/Diagram';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, easeOut, lerp, shake, soft, spr} from '../lib/anim';
import {fuse, gauss} from '../lib/math';
import {C, MONO} from '../theme';

const T = cues('blur');

// The two cues and their noise (field units). Shared with the next scene.
export const CUES = {
	uV: POV.flickerU,
	sV: 4,
	uA: POV.bushU,
	sA: 6,
};
export const FUSED = fuse(CUES.uV, CUES.sV, CUES.uA, CUES.sA);
export const HILL_SCALE = 2340; // px per unit density at full size
const BIN = 1;
const N = 60;
const PILE_SCALE = N * BIN * 16; // a dot pile of N dots of diameter 16 px, as a density scale

export const S2Blur: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {b1, b2, b3, b4, b5, b6} = T;
	const dotsV = useMemo(() => makePile(CUES.uV, CUES.sV, N, BIN, 'pv'), []);
	const dotsA = useMemo(() => makePile(CUES.uA, CUES.sA, N, BIN, 'pa'), []);

	const reveal = ease(f, 0, 30, 0, 1);
	const flickerX = fieldX(CUES.uV);
	const bushX = fieldX(CUES.uA);

	// b1: every sense is a bit blurry — the cue smears into ghost copies
	const smearV = ease(f, b1.start + 6, b1.start + 30) * (1 - ease(f, b2.start + 20, b2.start + 36));
	const smearA = ease(f, b1.start + 26, b1.start + 48) * (1 - ease(f, b3.start + 20, b3.start + 36));
	const dim = ease(f, b2.start - 6, b2.start + 12) * 0.85;
	const ground = soft(f, b2.start - 4, 20);

	// b2/b3: dots pile up, then melt into smooth hills
	const melt = ease(f, b4.start - 6, b4.start + 20);
	const yScale = lerp(PILE_SCALE, HILL_SCALE, ease(f, b4.start, b4.start + 26));
	const hillV = ease(f, b2.start + 40, b2.start + 58);
	const hillA = ease(f, b3.start + 36, b3.start + 54);

	// b5/b6: one fox → the hills combine into the amber belief
	const fox = spr(f, b5.start + 2, {damping: 13});
	const combine = ease(f, b5.start + 36, b5.start + 70);
	const ghost = 1 - 0.62 * combine;
	const glowPulse = 1 + 0.25 * Math.max(0, Math.sin((f - b6.start) * 0.18)) * ease(f, b6.start, b6.start + 10);

	const vPeakY = POV.base - gauss(0, 0, CUES.sV) * HILL_SCALE;
	const aPeakY = POV.base - gauss(0, 0, CUES.sA) * HILL_SCALE;
	const vHalf = POV.base - (gauss(0, 0, CUES.sV) * HILL_SCALE) / 2;
	const vHalfW = 1.1774 * CUES.sV;
	const aHalf = POV.base - (gauss(0, 0, CUES.sA) * HILL_SCALE) / 2;
	const halfW = 1.1774 * CUES.sA; // half width at half maximum
	const fPeakY = POV.base - gauss(0, 0, FUSED.sigma) * HILL_SCALE;

	return (
		<SceneShell sceneId="blur" standalone={standalone}>
			<PovMeadow
				frame={f}
				dim={dim}
				bushShake={shake(f, b1.start + 24, 1.3, 0.1) * 1.2}
				gusts={[{x: flickerX, start: b1.start + 4, strength: 0.4, width: 40, life: 24}]}
			>
				{/* the flicker and its smeared copies */}
				<Shimmer x={flickerX} y={POV.flickerY} t={(f - b1.start - 4) / 34} size={0.8} />
				<defs>
					<filter id="smear" x="-50%" y="-200%" width="200%" height="500%">
						<feGaussianBlur stdDeviation="14 6" />
					</filter>
				</defs>
				<ellipse cx={flickerX} cy={POV.flickerY} rx={24 + CUES.sV * 26 * 1.6 * smearV} ry={22} fill={C.sight} opacity={0.5 * smearV} filter="url(#smear)" />
				<SoundArcs x={bushX - 50} y={POV.bushY - 95} t={f - b1.start - 24} count={3} dir={Math.PI * 1.1} spread={1.4} maxR={130} life={30} period={7} width={5} />
				<SoundArcs x={bushX + 45} y={POV.bushY - 100} t={f - b1.start - 26} count={3} dir={-0.1} spread={1.3} maxR={110} life={28} period={7} width={5} />
				<ellipse cx={bushX} cy={POV.bushY - 80} rx={30 + CUES.sA * 26 * 1.6 * smearA} ry={26} fill={C.sound} opacity={0.4 * smearA} filter="url(#smear)" />
			</PovMeadow>

			<GroundLine y={POV.base} opacity={ground} />
			<Label x={960} y={POV.base + 46} text="straight ahead" size={30} weight={800} color={C.dim} opacity={ground * (1 - ease(f, b4.start, b4.start + 12)) * 0.9} />

			{/* dots → hills */}
			<DotPile dots={dotsV} frame={f} start={b2.start + 2} from={{x: flickerX, y: POV.flickerY}} baseY={POV.base} binU={BIN} color={C.sight} opacity={1 - melt} />
			<DotPile dots={dotsA} frame={f} start={b3.start + 2} from={{x: bushX, y: POV.bushY - 90}} baseY={POV.base} binU={BIN} color={C.sound} opacity={1 - melt} />
			<Hill id="hv" f={(u) => gauss(u, CUES.uV, CUES.sV)} color={C.sight} baseY={POV.base} yScale={yScale} opacity={hillV * ghost} fill={0.38 * (0.3 + 0.7 * melt)} />
			<Hill id="ha" f={(u) => gauss(u, CUES.uA, CUES.sA)} color={C.sound} baseY={POV.base} yScale={yScale} opacity={hillA * ghost} fill={0.38 * (0.3 + 0.7 * melt)} />

			<Label x={flickerX - 150} y={POV.base - 150 * (yScale / HILL_SCALE) - 20} text="sight" color={C.sight} size={40} pop={spr(f, b2.start + 30)} opacity={hillV * ghost} />
			<Label x={bushX + 190} y={POV.base - 95 * (yScale / HILL_SCALE) - 10} text="sound" color={C.sound} size={40} pop={spr(f, b3.start + 30)} opacity={hillA * ghost} />

			{/* b4: reading a hill */}
			{(() => {
				const o = ease(f, b4.start + 20, b4.start + 32) * (1 - ease(f, b5.start, b5.start + 12));
				if (o <= 0) return null;
				const bx0 = fieldX(CUES.uA - halfW);
				const bx1 = fieldX(CUES.uA + halfW);
				const grow = ease(f, b4.start + 44, b4.start + 64);
				return (
					<g opacity={o}>
						<Label x={flickerX - 40} y={vPeakY - 70} text="best guess" size={34} color={C.text} to={{x: flickerX, y: vPeakY - 6}} pop={spr(f, b4.start + 20)} />
						<g opacity={grow}>
							<line x1={lerp(bushX, bx0, grow)} y1={aHalf} x2={lerp(bushX, bx1, grow)} y2={aHalf} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
							<path d={`M${bx0 + 14},${aHalf - 10} L${bx0},${aHalf} L${bx0 + 14},${aHalf + 10}`} stroke={C.text} strokeWidth={4} fill="none" strokeLinecap="round" opacity={grow} />
							<path d={`M${bx1 - 14},${aHalf - 10} L${bx1},${aHalf} L${bx1 - 14},${aHalf + 10}`} stroke={C.text} strokeWidth={4} fill="none" strokeLinecap="round" opacity={grow} />
							<Label x={bx1 + 24} y={aHalf + 52} text="less sure" size={34} anchor="start" pop={spr(f, b4.start + 50)} />
						</g>
						<g opacity={ease(f, b4.start + 58, b4.start + 70)}>
							<line x1={fieldX(CUES.uV - vHalfW)} y1={vHalf} x2={fieldX(CUES.uV + vHalfW)} y2={vHalf} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
							<line x1={fieldX(CUES.uV - vHalfW)} y1={vHalf - 10} x2={fieldX(CUES.uV - vHalfW)} y2={vHalf + 10} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
							<line x1={fieldX(CUES.uV + vHalfW)} y1={vHalf - 10} x2={fieldX(CUES.uV + vHalfW)} y2={vHalf + 10} stroke={C.text} strokeWidth={4} strokeLinecap="round" />
							<Label x={fieldX(CUES.uV - vHalfW) - 20} y={vHalf + 12} text="more sure" size={34} anchor="end" pop={spr(f, b4.start + 58)} />
						</g>
					</g>
				);
			})()}

			{/* b5: one fox makes both signals */}
			{fox > 0.001 && (
				<g opacity={fox * (1 - ease(f, b6.start + 10, b6.start + 24))}>
					<line x1={fieldX(FUSED.mu)} y1={470} x2={flickerX} y2={vPeakY - 8} stroke={C.belief} strokeWidth={3} strokeDasharray="8 8" opacity={0.8} />
					<line x1={fieldX(FUSED.mu)} y1={470} x2={bushX} y2={aPeakY - 8} stroke={C.belief} strokeWidth={3} strokeDasharray="8 8" opacity={0.8} />
					<FoxIcon x={fieldX(FUSED.mu) - 10} y={470} s={0.75 * fox} />
				</g>
			)}
			<Hill id="hf" f={(u) => gauss(u, FUSED.mu, FUSED.sigma)} color={C.belief} baseY={POV.base} yScale={HILL_SCALE * combine} opacity={combine} fill={0.5} stroke={5 * glowPulse} />
			<Label x={fieldX(FUSED.mu)} y={fPeakY - 34} text="combined" color={C.belief} size={40} pop={spr(f, b5.start + 60)} opacity={ease(f, b5.start + 56, b5.start + 66) * (1 - ease(f, b6.start, b6.start + 10))} />
			<Label x={fieldX(FUSED.mu)} y={fPeakY - 34} text="sharper than either" color={C.belief} size={40} pop={spr(f, b6.start + 4)} opacity={ease(f, b6.start + 2, b6.start + 12)} />
			<Label x={140} y={900} text="Ernst & Banks 2002 · Alais & Burr 2004" size={26} weight={400} font={MONO} anchor="start" color={C.dim} opacity={ease(f, b6.start + 6, b6.start + 20) * 0.8} />

			<IrisMask r={reveal * 900} />
			<Sfx src="sfx/rustle_R.wav" at={b1.start + 24} volume={0.6} />
			<Sfx src="sfx/pile_v.wav" at={b2.start + 2} volume={0.35} />
			<Sfx src="sfx/pile_a.wav" at={b3.start + 2} volume={0.35} />
			<Sfx src="sfx/chime.wav" at={b5.start + 40} volume={0.4} />
		</SceneShell>
	);
};
