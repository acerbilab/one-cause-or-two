import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {Sky} from '../components/Sky';
import {Mountains} from '../components/Mountains';
import {Grass, Ground} from '../components/Grass';
import {Boulder, Bush, Shimmer, SoundArcs} from '../components/Props';
import {Bird, FoxIcon, Marmot, MarmotProps, marmotPupil} from '../components/Characters';
import {Label, ThoughtBubble} from '../components/Diagram';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, easeIn, shake, spr} from '../lib/anim';
import {C} from '../theme';

const T = cues('cold');

// Positions shared with the closing scene (the same meadow at dawn).
export const MEADOW = {
	horizon: 600,
	groundTop: 700,
	boulder: {x: 500, y: 716, s: 1.12},
	marmot: {x: 506, y: 716, s: 1.2},
	flicker: {x: 1215, y: 872},
	bush: {x: 1590, y: 836, s: 1.3},
};


export const S1ColdOpen: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {c1, c2, c3, c4, c5} = T;

	// Story beats
	const alert = spr(f, c1.start + 4, {damping: 12});
	const startled = spr(f, c2.start + 6, {damping: 10, stiffness: 160});
	const freeze = ease(f, c3.start - 4, c3.start + 10) * (1 - ease(f, c4.start + 4, c4.start + 16));
	// both hypotheses stay open together for ~2 s, then the threat holds for ~2 s
	const bubbleA = spr(f, c3.start - 6, {damping: 11}) * (1 - spr(f, c4.start + 8, {damping: 20}));
	const bubbleB = spr(f, c3.start + 2, {damping: 11}) * (1 - spr(f, c4.start + 8, {damping: 20}));
	const glint = ease(f, c4.start + 12, c4.start + 18) * (1 - ease(f, c5.start + 14, c5.start + 20));
	const gulp = spr(f, c4.start + 20, {damping: 8, stiffness: 200});

	const look = {
		x: 0.2 + alert * 0.6 + startled * 0.3,
		y: 0.1 + alert * 0.35 - startled * 0.3,
	};
	const flowerDrop = ease(f, c2.start + 10, c2.start + 34, 0, 1, easeIn);
	const hop = Math.sin(Math.min(1, Math.max(0, (f - c2.start - 4) / 10)) * Math.PI) * 16;
	const pushing = f >= c5.start + 6;
	const marmot: MarmotProps = {
		frame: f,
		x: MEADOW.marmot.x,
		y: MEADOW.marmot.y - hop,
		s: MEADOW.marmot.s,
		look,
		headTurn: startled * 0.5,
		alarm: Math.max(alert * 0.35, startled),
		chew: 1 - alert,
		flowerDrop,
		squash: Math.sin(gulp * Math.PI) * 0.12,
		sweat: ease(f, c4.start + 18, c4.start + 28) * (1 - ease(f, c5.start - 10, c5.start)),
		mouth: f > c4.start + 16 && f < c4.start + 30 ? 'open' : 'closed',
		blink: pushing ? 0 : undefined,
	};

	// Camera: a slow drift; a medium shot for the question and the threat; then a
	// constant-rate (log-linear) dive into the marmot's pupil.
	const drift = ease(f, 0, T._end, 0, 1);
	const med = ease(f, c3.start - 12, c3.start + 14);
	const push = ease(f, c5.start + 6, T._end, 0, 1, Easing.in(Easing.quad));
	const zoom = (1.0 + drift * 0.04) * (1 + 0.22 * med) * Math.pow(180, push);
	const eye = marmotPupil(marmot);
	// early in the push the focal point slides onto the pupil, then the zoom takes over
	const centre = Math.min(1, push * 3);
	const baseX = 960 - 100 * med;
	const baseY = 540 + 20 * med;
	const focusX = baseX + (eye.x - baseX) * centre;
	const focusY = baseY + (eye.y - baseY) * centre;
	const camera = `translate(960,540) scale(${zoom}) translate(${-focusX},${-focusY})`;

	return (
		<SceneShell sceneId="cold" standalone={standalone} style={{filter: `saturate(${1 - freeze * 0.3}) brightness(${1 - freeze * 0.1})`}}>
			<g transform={camera}>
				<Sky frame={f} mood={0} />
				<Mountains horizon={MEADOW.horizon} shift={-drift * 30} />
				<Ground top={MEADOW.groundTop} color="#141C42" />
				<Grass frame={f} top={MEADOW.groundTop + 10} bottom={870} rows={3} perRow={120} colors={['#23336B', '#17224C']} calm={freeze} seed="back" />
				<Bush x={MEADOW.bush.x} y={MEADOW.bush.y} s={MEADOW.bush.s} shake={shake(f, c2.start, 1.3, 0.08) * 1.8} />
				<Grass
					frame={f}
					top={820}
					bottom={930}
					rows={2}
					perRow={110}
					colors={['#1A274F', '#121B3E']}
					calm={freeze}
					seed="mid"
					gusts={[{x: MEADOW.flicker.x, start: c1.start - 4, strength: 0.6, width: 70, life: 30}]}
				/>
				<Shimmer x={MEADOW.flicker.x} y={MEADOW.flicker.y - 10} t={(f - c1.start + 4) / 38} size={1.45} />
				<SoundArcs x={MEADOW.bush.x - 90} y={MEADOW.bush.y - 130} t={f - c2.start} count={4} dir={Math.PI * 1.05} spread={1.5} maxR={210} life={34} period={7} />
				<SoundArcs x={MEADOW.bush.x + 60} y={MEADOW.bush.y - 150} t={f - c2.start - 3} count={3} dir={-0.2} spread={1.2} maxR={150} life={30} period={7} />
				{/* fox eyes glinting in the dark grass */}
				{glint > 0 && (
					<g transform={`translate(${MEADOW.flicker.x + 20},${MEADOW.flicker.y - 70}) scale(2.7)`}>
						{[-22, 22].map((dx) => (
							<g key={dx} transform={`translate(${dx},0) scale(1,${glint})`}>
								<ellipse rx={16} ry={7} fill="#E9F77E" opacity={0.25} />
								<path d="M-11,0 Q0,-7 11,0 Q0,7 -11,0Z" fill="#F2FF9E" />
								<ellipse rx={2.2} ry={5} fill="#12160A" />
							</g>
						))}
					</g>
				)}
				<Boulder x={MEADOW.boulder.x} y={MEADOW.boulder.y} s={MEADOW.boulder.s} />
				<Marmot {...marmot} />
				<Grass frame={f} top={930} bottom={1100} rows={2} perRow={90} colors={['#0F1735', '#090E26']} calm={freeze} seed="front" heightScale={1.3} />

				{/* Two hypotheses */}
				<ThoughtBubble x={330} y={285} r={96} pop={bubbleA} tail={{x: 470, y: 460}}>
					<FoxIcon x={318} y={353} s={1.0} />
				</ThoughtBubble>
				<ThoughtBubble x={760} y={265} r={96} pop={bubbleB} tail={{x: 600, y: 450}}>
					<g transform="translate(700,240) scale(0.55)">
						<path d="M-120,0 C-70,-6 -20,-4 10,-18 C40,-30 44,-62 18,-66 C-6,-70 -12,-44 6,-36" stroke="#7C8BC4" strokeWidth={10} fill="none" strokeLinecap="round" />
						<path d="M-150,40 C-90,36 -30,40 30,32" stroke="#7C8BC4" strokeWidth={9} fill="none" strokeLinecap="round" />
					</g>
					<Bird x={800} y={327} s={1.35} />
				</ThoughtBubble>
				<Label x={545} y={297} text="or" size={44} opacity={Math.min(bubbleA, bubbleB)} color={C.text} />
			</g>
			{/* edge vignette while time stands still */}
			<defs>
				<radialGradient id="vig" cx="0.5" cy="0.5" r="0.75">
					<stop offset="0.55" stopColor="#000" stopOpacity={0} />
					<stop offset="1" stopColor="#000" stopOpacity={0.75} />
				</radialGradient>
			</defs>
			<rect x={0} y={0} width={1920} height={1080} fill="url(#vig)" opacity={0.35 + freeze * 0.65} />
			<rect x={0} y={0} width={1920} height={1080} fill={C.eye} opacity={ease(f, T._end - 8, T._end)} />
			<Sfx src="sfx/rustle_R.wav" at={c2.start} volume={0.9} />
			<Sfx src="sfx/whoosh.wav" at={c5.start + 8} volume={0.5} />
		</SceneShell>
	);
};

