import React from 'react';
import {interpolateColors, random} from 'remotion';
import {C, W, H} from '../theme';

// Sky palettes, top to horizon. `mood` blends dusk (0) → night (1) → dawn (2).
const PALETTES = {
	dusk: ['#0A1030', '#18215A', '#33357A', '#6E4F86', '#C9747A'],
	night: ['#060A1C', '#0C1234', '#141C4A', '#1E2760', '#2A3272'],
	dawn: ['#152463', '#34408A', '#7A5D9C', '#D98A8C', '#FFC58A'],
};

const blend = (mood: number, i: number) => {
	const m = Math.max(0, Math.min(2, mood));
	return interpolateColors(m, [0, 1, 2], [PALETTES.dusk[i], PALETTES.night[i], PALETTES.dawn[i]]);
};

const STARS = Array.from({length: 170}, (_, i) => ({
	x: random(`sx${i}`) * W,
	y: Math.pow(random(`sy${i}`), 1.6) * H * 0.62,
	r: 0.6 + random(`sr${i}`) ** 3 * 2.2,
	phase: random(`sp${i}`) * Math.PI * 2,
	speed: 0.03 + random(`ss${i}`) * 0.06,
}));

export const Sky: React.FC<{
	frame: number;
	mood?: number;
	stars?: number;
	moon?: {x: number; y: number; r?: number} | null;
	sun?: {x: number; y: number; r?: number; opacity: number} | null;
	id?: string;
}> = ({frame, mood = 0, stars = 1, moon = {x: 1560, y: 170, r: 46}, sun = null, id = 'sky'}) => {
	const stops = [0, 1, 2, 3, 4].map((i) => blend(mood, i));
	const starVis = stars * (mood <= 1 ? 1 : Math.max(0, 1 - (mood - 1) * 1.4));
	return (
		<g>
			<defs>
				<linearGradient id={`${id}-grad`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={stops[0]} />
					<stop offset="0.3" stopColor={stops[1]} />
					<stop offset="0.55" stopColor={stops[2]} />
					<stop offset="0.72" stopColor={stops[3]} />
					<stop offset="0.86" stopColor={stops[4]} />
				</linearGradient>
				<radialGradient id={`${id}-moonglow`}>
					<stop offset="0" stopColor={C.moon} stopOpacity={0.35} />
					<stop offset="0.35" stopColor={C.moon} stopOpacity={0.08} />
					<stop offset="1" stopColor={C.moon} stopOpacity={0} />
				</radialGradient>
				<radialGradient id={`${id}-sunglow`}>
					<stop offset="0" stopColor="#FFE3A3" stopOpacity={0.9} />
					<stop offset="0.25" stopColor="#FFC074" stopOpacity={0.35} />
					<stop offset="1" stopColor="#FF9A6B" stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={0} y={0} width={W} height={H} fill={`url(#${id}-grad)`} />
			{starVis > 0.01 &&
				STARS.map((s, i) => {
					const tw = 0.55 + 0.45 * Math.sin(frame * s.speed + s.phase);
					return <circle key={i} cx={s.x} cy={s.y} r={s.r} fill="#FFFFFF" opacity={starVis * tw * (0.35 + 0.65 * (1 - s.y / (H * 0.62)))} />;
				})}
			{moon && (
				<g>
					<circle cx={moon.x} cy={moon.y} r={(moon.r ?? 46) * 6} fill={`url(#${id}-moonglow)`} />
					<circle cx={moon.x} cy={moon.y} r={moon.r ?? 46} fill={C.moon} />
					<circle cx={moon.x - 14} cy={moon.y - 10} r={9} fill="#E2D6B8" opacity={0.7} />
					<circle cx={moon.x + 15} cy={moon.y + 12} r={6} fill="#E2D6B8" opacity={0.6} />
					<circle cx={moon.x + 8} cy={moon.y - 20} r={4} fill="#E2D6B8" opacity={0.5} />
				</g>
			)}
			{sun && sun.opacity > 0 && (
				<g opacity={sun.opacity}>
					<circle cx={sun.x} cy={sun.y} r={(sun.r ?? 60) * 7} fill={`url(#${id}-sunglow)`} />
					<circle cx={sun.x} cy={sun.y} r={sun.r ?? 60} fill="#FFE7B0" />
				</g>
			)}
		</g>
	);
};
