import React from 'react';
import {Easing, interpolateColors, useCurrentFrame} from 'remotion';
import {Sky} from '../components/Sky';
import {Mountains} from '../components/Mountains';
import {Grass, Ground} from '../components/Grass';
import {Boulder, Bush, Shimmer, SoundArcs} from '../components/Props';
import {Fox, FoxFace, FoxIcon, Marmot} from '../components/Characters';
import {Backdrop, Hill, ThoughtBubble} from '../components/Diagram';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, easeIn, lerp, spr} from '../lib/anim';
import {fuse, gauss} from '../lib/math';
import {C, FONT, MONO} from '../theme';
import {MEADOW} from './S1ColdOpen';
import {priorFound, PRIOR_BASE, PRIOR_YS} from './S7Draw';

const T = cues('end');

// The measured prior becomes the mountain straight ahead.
const MTN = {base: 668, xs: 40, ys: 4150};
const CUE = {x: 1250, y: 876};
const HOLE = {x: MEADOW.boulder.x - 20 * MEADOW.boulder.s, y: MEADOW.boulder.y + 186 * MEADOW.boulder.s};
const EYES = {x: HOLE.x, y: HOLE.y - 10}; // the marmot peeking out of the burrow
const SIGN = {x: CUE.x, y: 640, xs: 14, ys: 900}; // the "one cause" sign over the cue
const ONE = fuse(0, 3, 0, 5);

const ridgeY = (u: number, base: number, ys: number) => base - priorFound(u) * ys;

const ridge = (xs: number, base: number, ys: number, u0 = -30, u1 = 30, n = 300) => {
	let d = '';
	for (let i = 0; i <= n; i++) {
		const u = u0 + ((u1 - u0) * i) / n;
		d += `${i === 0 ? 'M' : 'L'}${(960 + u * xs).toFixed(1)},${ridgeY(u, base, ys).toFixed(1)}`;
	}
	return d;
};

/** Snow on the top ~40% of the central spike, split into a lit (sun side) and a shaded half. */
const snowcap = (xs: number, base: number, ys: number) => {
	const apex = ridgeY(0, base, ys);
	const shoulder = ridgeY(1.8, base, ys);
	const snowLine = apex + 0.42 * (shoulder - apex);
	let uS = 0;
	for (let u = 0; u <= 4; u += 0.01) {
		if (ridgeY(u, base, ys) >= snowLine) {
			uS = u;
			break;
		}
	}
	const jag = [6, 14, 3, 12, 2, 9, 0];
	const half = (sign: 1 | -1) => {
		let d = `M960,${apex.toFixed(1)}`;
		for (let k = 1; k <= 30; k++) {
			const u = (uS * k) / 30;
			d += `L${(960 + sign * u * xs).toFixed(1)},${ridgeY(u, base, ys).toFixed(1)}`;
		}
		for (let k = 0; k < jag.length; k++) {
			const u = uS * (1 - k / (jag.length - 1));
			d += `L${(960 + sign * u * xs).toFixed(1)},${(snowLine + jag[k]).toFixed(1)}`;
		}
		return d + 'Z';
	};
	return {lit: half(1), shade: half(-1)};
};

export const S8End: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {r1, r2} = T;
	const g0 = r2.end + 16; // start of the closing gag

	// 1. the prior curve rises into the mountain; dawn comes up around it
	const morph = ease(f, 4, r1.start + 16, 0, 1, Easing.bezier(0.5, 0, 0.2, 1));
	const world = ease(f, r1.start - 6, r1.start + 30);
	const xs = lerp(26, MTN.xs, morph);
	const base = lerp(PRIOR_BASE, MTN.base, morph);
	const ys = lerp(PRIOR_YS, MTN.ys, morph);
	const line = ridge(xs, base, ys);
	const bottom = lerp(base, base + 420, ease(f, 6, r1.start + 10));
	const area = `${line}L${960 + 30 * xs},${bottom}L${960 - 30 * xs},${bottom}Z`;
	// shadow face: left of a jagged ridge line that runs from the summit down and to the left
	const apexY = ridgeY(0, base, ys);
	const ridgeLine = [0, 0.18, 0.34, 0.52, 0.7, 1].map((t, k) => {
		const y = apexY + (bottom - apexY) * t;
		const x = 960 - 210 * t ** 1.3 * (xs / MTN.xs) + (k % 2 ? 10 : -6) * t;
		return `L${x.toFixed(1)},${y.toFixed(1)}`;
	});
	const shadeSide = `${ridge(xs, base, ys, -30, 0, 150)}${ridgeLine.join('')}L${960 - 30 * xs},${bottom}Z`;
	const body = ease(f, 8, r1.start + 12);
	const snow = snowcap(xs, base, ys);
	const snowOn = ease(f, r1.start + 6, r1.start + 20);
	const rise = ease(f, r1.start - 10, r1.start + 34, 0, 1, Easing.bezier(0.3, 0, 0.1, 1));
	const groundShift = (1 - rise) * 420;
	const sunY = lerp(430, 196, ease(f, r1.start, g0 - 10, 0, 1, Easing.bezier(0.3, 0, 0.3, 1)));
	const gold = ease(f, r1.start, r1.start + 90);

	// 2. the gag: flicker and rustle from the same spot → one cause → run
	const cueFlicker = (f - g0) / 34;
	const signIn = ease(f, g0 + 6, g0 + 16) * (1 - ease(f, g0 + 72, g0 + 82));
	const merge = ease(f, g0 + 18, g0 + 34);
	const alarm = ease(f, g0 + 20, g0 + 26);
	const bubble = spr(f, g0 + 30, {damping: 11}) * (1 - ease(f, g0 + 64, g0 + 70));
	const whistle = f >= g0 + 54 && f < g0 + 68;
	const hopUp = Math.sin(Math.min(1, Math.max(0, (f - g0 - 66) / 8)) * Math.PI) * 30;
	const dive = ease(f, g0 + 70, g0 + 84, 0, 1, easeIn);
	const mx = lerp(MEADOW.marmot.x, HOLE.x, dive);
	const my = lerp(MEADOW.marmot.y - hopUp, HOLE.y + 10, dive);
	const ms = MEADOW.marmot.s * lerp(1, 0.35, dive);
	const marmotGone = f > g0 + 84;
	const dust = Math.min(1, Math.max(0, (f - g0 - 80) / 18));

	const leap = ease(f, g0 + 84, g0 + 102, 0, 1, Easing.bezier(0.3, 0, 0.6, 1));
	const foxOn = f >= g0 + 84;
	const fx = lerp(CUE.x + 60, MEADOW.boulder.x + 40, leap);
	const fy = lerp(CUE.y + 90, MEADOW.boulder.y + 4, leap) - Math.sin(leap * Math.PI) * 240;
	const landed = f >= g0 + 102;
	const lookAround = landed ? Math.sin((f - g0 - 104) * 0.2) * ease(f, g0 + 104, g0 + 110) * (1 - ease(f, g0 + 122, g0 + 126)) : 0;
	const facing = f >= g0 + 126;
	const droop = ease(f, g0 + 134, g0 + 144);
	const faceAt = {x: fx - 128, y: fy - 138};

	// iris: close on the fox, slide down to the burrow where the marmot peeks out, close
	const irisA = ease(f, g0 + 148, g0 + 162, 0, 1, Easing.in(Easing.cubic));
	const irisB = ease(f, g0 + 166, g0 + 178);
	const irisC = ease(f, g0 + 196, g0 + 206, 0, 1, Easing.in(Easing.quad));
	const irisR = lerp(lerp(lerp(1500, 180, irisA), 108, irisB), 0, irisC);
	const irisX = lerp(faceAt.x, EYES.x, irisB);
	const irisY = lerp(faceAt.y, EYES.y, irisB);
	const peek = ease(f, g0 + 172, g0 + 178);
	const peekBlink = f >= g0 + 186 && f < g0 + 190;
	const card = ease(f, g0 + 206, g0 + 218);
	const more = ease(f, g0 + 226, g0 + 238);

	return (
		<SceneShell sceneId="end" standalone={standalone}>
			<Backdrop frame={f} id="s8bd" />
			<g opacity={world}>
				<Sky frame={f} mood={2} moon={null} sun={{x: 1540, y: sunY, r: 56, opacity: 1}} id="s8sky" />
				<defs>
					<linearGradient id="s8gold" x1="0" y1="0" x2="0" y2="1">
						<stop offset="0" stopColor="#FFC46B" stopOpacity={0} />
						<stop offset="0.7" stopColor="#FFB35C" stopOpacity={0.3} />
						<stop offset="1" stopColor="#FFD08A" stopOpacity={0.62} />
					</linearGradient>
				</defs>
				<rect x={0} y={230} width={1920} height={360} fill="url(#s8gold)" opacity={gold} />
				<Mountains horizon={MEADOW.horizon} dawn={1} layers={{far: true, mid: false, near: false}} />
			</g>
			{/* the prior, becoming the mountain: starts exactly as the previous scene drew it */}
			<defs>
				<linearGradient id="s8prior" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={C.prior} stopOpacity={0.4} />
					<stop offset="1" stopColor={C.prior} stopOpacity={0.04} />
				</linearGradient>
				<filter id="s8glow" x="-20%" y="-50%" width="140%" height="200%">
					<feGaussianBlur stdDeviation="7" />
				</filter>
			</defs>
			<path d={`${line}L${960 + 30 * xs},${base}L${960 - 30 * xs},${base}Z`} fill="url(#s8prior)" opacity={1 - body} />
			<path d={area} fill="#5A4C8E" opacity={body} />
			<path d={shadeSide} fill="#463B77" opacity={body * morph} />
			<path d={line} stroke={C.prior} strokeWidth={12} fill="none" opacity={0.55 * (1 - body)} filter="url(#s8glow)" />
			<path d={line} stroke={interpolateColors(morph, [0, 1], [C.prior, '#FFD6A8'])} strokeWidth={lerp(5, 3, morph)} fill="none" opacity={lerp(1, 0.7, morph) * (1 - ease(f, r1.start + 10, r1.start + 40))} />
			{morph > 0.8 && (
				<g opacity={snowOn}>
					<path d={snow.shade} fill="#CDBCE0" />
					<path d={snow.lit} fill="#FFF0E0" />
				</g>
			)}

			{/* the meadow rises into view */}
			<g transform={`translate(0,${groundShift})`} opacity={world}>
				<Ground top={MEADOW.groundTop} color="#2A2B5C" />
				<Grass frame={f} top={MEADOW.groundTop + 10} bottom={870} rows={3} perRow={120} colors={['#4B4A86', '#34346A']} seed="back" />
				<Bush x={MEADOW.bush.x} y={MEADOW.bush.y} s={MEADOW.bush.s} tint={['#303A6E', '#6A6AA8', '#252B58']} />
				<Grass
					frame={f}
					top={820}
					bottom={930}
					rows={2}
					perRow={110}
					colors={['#3A3B74', '#2B2C5E']}
					seed="mid"
					gusts={[{x: CUE.x, start: g0 - 4, strength: 0.6, width: 70, life: 30}]}
				/>
				<Shimmer x={CUE.x} y={CUE.y - 14} t={cueFlicker} size={1.45} />
				<SoundArcs x={CUE.x} y={CUE.y - 60} t={f - g0 - 2} count={4} dir={-Math.PI / 2} spread={2.4} maxR={190} life={30} period={6} width={7} />
				<Boulder x={MEADOW.boulder.x} y={MEADOW.boulder.y} s={MEADOW.boulder.s} />
				{/* dust puff from the burrow */}
				{dust > 0 && dust < 1 && (
					<g opacity={1 - dust}>
						{[-60, -25, 15, 50].map((dx, i) => (
							<circle key={i} cx={HOLE.x + dx * (0.6 + dust)} cy={HOLE.y - 10 - dust * 40 - (i % 2) * 12} r={16 + dust * 22} fill="#B7A9C9" />
						))}
					</g>
				)}
				{!marmotGone && (
					<g opacity={1 - ease(f, g0 + 80, g0 + 84)}>
						<Marmot
							frame={f}
							x={mx}
							y={my}
							s={ms}
							look={{x: alarm > 0 ? 1 : 0.2, y: alarm > 0 ? 0.3 : 0.1}}
							headTurn={alarm * 0.4}
							alarm={alarm}
							chew={1 - alarm}
							flowerDrop={f < g0 + 22 ? 0 : ease(f, g0 + 22, g0 + 44, 0, 1, easeIn)}
							mouth={whistle ? 'o' : 'closed'}
							squash={dive > 0 ? -0.25 * (1 - dive) : 0}
							rimOpacity={0.6}
							rimColor="#FFC98A"
							id="m8"
						/>
					</g>
				)}
				{whistle && (
					<g transform={`translate(${MEADOW.marmot.x + 130},${MEADOW.marmot.y - 300})`}>
						{[0, 1, 2].map((i) => (
							<path key={i} d={`M${i * 26},${-i * 8} q14,-20 0,-40`} stroke="#FFF3D6" strokeWidth={5} fill="none" strokeLinecap="round" opacity={0.9 - i * 0.2} />
						))}
					</g>
				)}
				{foxOn && <Fox frame={f} x={fx} y={fy} s={0.9} facing={-1} pose={landed ? 0 : 1} headTurn={lookAround} hideHead={facing} />}
				{facing && <FoxFace x={faceAt.x} y={faceAt.y} s={0.62} blink={f > g0 + 130 && f < g0 + 134 ? 1 : 0} droop={droop} />}
				<Grass frame={f} top={930} bottom={1100} rows={2} perRow={90} colors={['#23244F', '#181A3E']} seed="front" heightScale={1.3} />
				{/* the marmot peeks out of the burrow, safe */}
				{peek > 0 && (
					<g transform={`translate(${EYES.x},${EYES.y})`} opacity={peek}>
						<ellipse cx={0} cy={4} rx={62} ry={24} fill="#05060F" />
						{[-17, 17].map((dx) => (
							<g key={dx} transform={`translate(${dx},0) scale(1,${peekBlink ? 0.1 : 1})`}>
								<ellipse rx={10} ry={12} fill="#F4F1EA" />
								<circle cx={4} cy={-3} r={6} fill={C.eye} />
							</g>
						))}
					</g>
				)}
			</g>

			{/* the "one cause" sign: sight and sound from the same spot merge into one hill */}
			{signIn > 0.001 && (
				<g opacity={signIn}>
					<line x1={SIGN.x - 150} y1={SIGN.y} x2={SIGN.x + 150} y2={SIGN.y} stroke={C.text} strokeWidth={3} opacity={0.6} />
					<Hill id="s8v" f={(u) => gauss(u, 0, 3)} color={C.sight} baseY={SIGN.y} yScale={SIGN.ys} opacity={1 - 0.7 * merge} toX={(u) => SIGN.x + u * SIGN.xs} u0={-10} u1={10} />
					<Hill id="s8a" f={(u) => gauss(u, 0, 5)} color={C.sound} baseY={SIGN.y} yScale={SIGN.ys} opacity={1 - 0.7 * merge} toX={(u) => SIGN.x + u * SIGN.xs} u0={-10} u1={10} />
					<Hill id="s8b" f={(u) => gauss(u, 0, ONE.sigma)} color={C.belief} baseY={SIGN.y} yScale={SIGN.ys * merge} opacity={merge} fill={0.5} toX={(u) => SIGN.x + u * SIGN.xs} u0={-10} u1={10} />
				</g>
			)}
			<ThoughtBubble x={MEADOW.marmot.x + 240} y={MEADOW.marmot.y - 470} r={96} pop={bubble} tail={{x: MEADOW.marmot.x + 80, y: MEADOW.marmot.y - 310}}>
				<FoxIcon x={MEADOW.marmot.x + 226} y={MEADOW.marmot.y - 404} s={0.85} />
				<text x={MEADOW.marmot.x + 300} y={MEADOW.marmot.y - 460} fontFamily={FONT} fontWeight={900} fontSize={80} fill={C.stamp}>
					!
				</text>
			</ThoughtBubble>

			{/* iris out, then the end card */}
			{irisR < 1400 && (
				<path
					d={`M-10,-10H1930V1090H-10Z M${irisX - irisR},${irisY} a${irisR},${irisR} 0 1,0 ${2 * irisR},0 a${irisR},${irisR} 0 1,0 ${-2 * irisR},0Z`}
					fill="#05081A"
					fillRule="evenodd"
				/>
			)}
			{card > 0 && (
				<g opacity={card}>
					<rect x={0} y={0} width={1920} height={1080} fill="#05081A" />
					<text x={960} y={300} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={120} fill={C.text}>
						One cause or two?
					</text>
					<path d={ridge(10, 390, 900, -30, 30)} stroke={C.belief} strokeWidth={5} fill="none" opacity={0.9} strokeDasharray="1400" strokeDashoffset={1400 * (1 - ease(f, g0 + 210, g0 + 236))} />
					<text x={960} y={490} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={40} fill={C.text}>
						Liu, Holland, Ma &amp; Acerbi (2026)
					</text>
					<text x={960} y={544} textAnchor="middle" fontFamily={FONT} fontWeight={600} fontStyle="italic" fontSize={32} fill={C.dim}>
						Distilling noise characteristics and prior expectations in multisensory causal inference
					</text>
					<text x={960} y={596} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={32} fill={C.dim}>
						PLOS Computational Biology ·{' '}
						<tspan fontFamily={MONO} fontWeight={400}>
							doi.org/10.1371/journal.pcbi.1014251
						</tspan>
					</text>
					{/* the landing page, then the institutions behind the study */}
					<g opacity={more}>
						<text x={960} y={770} textAnchor="middle" fontFamily={MONO} fontWeight={700} fontSize={64} fill={C.belief}>
							acerbilab.github.io/one-cause-or-two
						</text>
						{/* the institutions: the senior authors' first, where the study was led; then funding and research environment */}
						<text x={960} y={890} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={32} fill={C.dim}>
							University of Helsinki · New York University · Harvard University
						</text>
						<text x={960} y={940} textAnchor="middle" fontFamily={FONT} fontWeight={700} fontSize={32} fill={C.dim}>
							Research Council of Finland · ELLIS Institute Finland
						</text>
					</g>
				</g>
			)}

			<Sfx src="sfx/rustle_R.wav" at={g0 + 2} volume={0.7} />
			<Sfx src="sfx/chime.wav" at={g0 + 22} volume={0.3} />
			<Sfx src="sfx/whistle.wav" at={g0 + 54} volume={0.8} />
			<Sfx src="sfx/dive.wav" at={g0 + 76} volume={0.7} />
			<Sfx src="sfx/whoosh.wav" at={g0 + 84} volume={0.5} />
			<Sfx src="sfx/thud.wav" at={g0 + 102} volume={0.7} />
			<Sfx src="sfx/sad_trombone_soft.wav" at={g0 + 134} volume={0.5} />
		</SceneShell>
	);
};
