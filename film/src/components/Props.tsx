import React from 'react';
import {random} from 'remotion';
import {C} from '../theme';

/** A leafy bush lit from the upper right; `shake` in [-1, 1] rocks it about its base. */
export const Bush: React.FC<{x: number; y: number; s?: number; shake?: number; tint?: [string, string, string]}> = ({
	x,
	y,
	s = 1,
	shake = 0,
	tint = ['#132446', '#2D4C7E', '#0D1934'],
}) => {
	// leaf clumps arranged in a dome
	const clumps = Array.from({length: 16}, (_, i) => {
		const a = Math.PI * (0.05 + (0.9 * i) / 15);
		const rr = 118 + (random(`bk${i}`) - 0.5) * 30;
		return {cx: -Math.cos(a) * rr * 1.25, cy: -Math.sin(a) * rr * 0.95 - 20, r: 34 + random(`br${i}`) * 22};
	});
	const inner = [
		{cx: -60, cy: -60, r: 70},
		{cx: 20, cy: -90, r: 80},
		{cx: 80, cy: -50, r: 60},
		{cx: -10, cy: -30, r: 70},
	];
	const all = [...clumps, ...inner];
	return (
		<g transform={`translate(${x},${y}) scale(${s}) rotate(${shake * 4},0,0) translate(${shake * 6},0)`}>
			{/* rim light: highlight shapes offset toward the moon, covered by the body shifted away */}
			{all.map((b, i) => (
				<circle key={`h${i}`} cx={b.cx + 5} cy={b.cy - 7} r={b.r} fill={tint[1]} />
			))}
			{all.map((b, i) => (
				<circle key={i} cx={b.cx - 2} cy={b.cy + 3} r={b.r} fill={tint[0]} />
			))}
			{Array.from({length: 26}, (_, i) => (
				<ellipse
					key={`l${i}`}
					cx={(random(`bl${i}`) - 0.5) * 250}
					cy={-24 - random(`bly${i}`) * 150}
					rx={9}
					ry={4.5}
					transform={`rotate(${random(`blr${i}`) * 180})`}
					fill={tint[2]}
					opacity={0.6}
				/>
			))}
		</g>
	);
};

/** The marmot's lookout boulder, with the burrow entrance at its foot. `x, y` = centre of the flat top. */
export const Boulder: React.FC<{x: number; y: number; s?: number; hole?: boolean}> = ({x, y, s = 1, hole = true}) => (
	<g transform={`translate(${x},${y}) scale(${s})`}>
		<path d="M-190,190 C-215,120 -170,20 -95,4 C-40,-6 55,-8 110,6 C185,26 215,120 196,190 Z" fill={C.rock} />
		<path d="M-150,40 C-110,10 -40,2 30,2 C-10,20 -80,30 -140,70 Z" fill={C.rockHi} opacity={0.8} />
		<path d="M120,30 C175,60 200,120 196,190 L120,190 C140,130 140,80 120,30Z" fill={C.rockDark} opacity={0.7} />
		<path d="M-60,70 L-30,100 L-38,130" stroke={C.rockDark} strokeWidth={4} fill="none" strokeLinecap="round" />
		<path d="M60,90 L78,120" stroke={C.rockDark} strokeWidth={4} fill="none" strokeLinecap="round" />
		{hole && (
			<g>
				<ellipse cx={-20} cy={186} rx={78} ry={30} fill="#0A0E22" />
				<path d="M-98,186 C-90,160 50,160 58,186" stroke={C.rockDark} strokeWidth={8} fill="none" />
			</g>
		)}
	</g>
);

/** A few bright sparks in the grass: the silent visual flicker. */
export const Shimmer: React.FC<{x: number; y: number; t: number; color?: string; size?: number}> = ({
	x,
	y,
	t,
	color = C.sight,
	size = 1,
}) => {
	if (t <= 0 || t >= 1) return null;
	const env = Math.sin(t * Math.PI);
	return (
		<g transform={`translate(${x},${y}) scale(${size})`} opacity={env}>
			<circle r={70} fill={color} opacity={0.18} />
			<circle r={34} fill={color} opacity={0.25} />
			{Array.from({length: 7}, (_, i) => {
				const a = random(`sh${i}`) * Math.PI * 2;
				const d = 12 + random(`shd${i}`) * 46;
				const r = 3 + random(`shr${i}`) * 5;
				const tw = 0.4 + 0.6 * Math.abs(Math.sin(t * 14 + i));
				return (
					<g key={i} transform={`translate(${Math.cos(a) * d},${Math.sin(a) * d * 0.6})`} opacity={tw}>
						<path d={`M0,${-r * 2.4} L${r * 0.5},0 L0,${r * 2.4} L${-r * 0.5},0Z`} fill="#E8F7FF" />
						<path d={`M${-r * 2.4},0 L0,${r * 0.5} L${r * 2.4},0 L0,${-r * 0.5}Z`} fill="#E8F7FF" />
					</g>
				);
			})}
		</g>
	);
};

/** Expanding sound arcs, drawn toward angle `dir` (radians; 0 = right). */
export const SoundArcs: React.FC<{
	x: number;
	y: number;
	t: number; // frames since onset
	count?: number;
	color?: string;
	dir?: number;
	spread?: number;
	period?: number;
	maxR?: number;
	life?: number;
	width?: number;
}> = ({x, y, t, count = 3, color = C.sound, dir = Math.PI, spread = 1.2, period = 9, maxR = 150, life = 40, width = 6}) => {
	if (t < 0) return null;
	return (
		<g transform={`translate(${x},${y})`}>
			{Array.from({length: count}, (_, i) => {
				const lt = t - i * period;
				if (lt < 0 || lt > life) return null;
				const p = lt / life;
				const r = 24 + p * maxR;
				const a0 = dir - spread / 2;
				const a1 = dir + spread / 2;
				const d = `M${Math.cos(a0) * r},${Math.sin(a0) * r} A${r},${r} 0 0 1 ${Math.cos(a1) * r},${Math.sin(a1) * r}`;
				return <path key={i} d={d} stroke={color} strokeWidth={width * (1 - p * 0.5)} fill="none" strokeLinecap="round" opacity={(1 - p) ** 1.3} />;
			})}
		</g>
	);
};

/** Stylised gust lines: loops of wind that travel to the right. */
export const WindSwirl: React.FC<{x: number; y: number; t: number; life?: number; s?: number}> = ({x, y, t, life = 60, s = 1}) => {
	if (t < 0 || t > life) return null;
	const p = t / life;
	const env = Math.sin(p * Math.PI);
	const paths = [
		'M-160,0 C-90,-6 -30,-4 10,-18 C40,-30 44,-62 18,-66 C-6,-70 -12,-44 6,-36',
		'M-200,34 C-120,30 -40,34 40,26',
		'M-130,-40 C-80,-44 -40,-44 0,-50',
	];
	return (
		<g transform={`translate(${x + p * 140 * s},${y}) scale(${s})`} opacity={env * 0.85}>
			{paths.map((d, i) => (
				<path
					key={i}
					d={d}
					stroke="#DDE6FF"
					strokeWidth={6 - i}
					fill="none"
					strokeLinecap="round"
					pathLength={1}
					strokeDasharray={`${0.25 + 0.75 * Math.min(1, p * 2.2)} 2`}
					strokeDashoffset={-Math.max(0, p * 2.2 - 1.2)}
				/>
			))}
		</g>
	);
};
