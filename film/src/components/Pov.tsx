import React from 'react';
import {random} from 'remotion';
import {Sky} from './Sky';
import {Mountains} from './Mountains';
import {Grass, Ground, Gust} from './Grass';
import {Bush} from './Props';
import {fieldX} from './Diagram';
import {probit} from '../lib/math';
import {C} from '../theme';

// The marmot's point of view: the meadow straight ahead, with "straight ahead" at x = 960.
export const POV = {
	horizon: 470,
	groundTop: 590,
	base: 820, // ground line the hills stand on
	flickerU: -4,
	bushU: 6,
	flickerY: 712,
	bushY: 742,
	bushS: 0.78,
};

export const PovMeadow: React.FC<{
	frame: number;
	dim?: number; // darkening for the diagram layer
	gusts?: Gust[];
	bushShake?: number;
	calm?: number;
	behindBush?: React.ReactNode;
	children?: React.ReactNode; // drawn between the far and near grass
}> = ({frame, dim = 0, gusts = [], bushShake = 0, calm = 0, behindBush, children}) => (
	<g>
		<Sky frame={frame} mood={0.55} moon={{x: 1660, y: 150, r: 38}} id="povsky" />
		<Mountains horizon={POV.horizon} />
		<Ground top={POV.groundTop} color="#131B40" />
		<Grass frame={frame} top={POV.groundTop + 6} bottom={690} rows={3} perRow={150} heightScale={0.45} colors={['#26386F', '#1C2A58']} seed="povfar" calm={calm} />
		{behindBush}
		<Bush x={fieldX(POV.bushU)} y={POV.bushY} s={POV.bushS} shake={bushShake} />
		<Grass
			frame={frame}
			top={690}
			bottom={800}
			rows={3}
			perRow={130}
			heightScale={0.75}
			colors={['#1E2C5A', '#141E45']}
			seed="povmid"
			gusts={gusts}
			calm={calm}
		/>
		{children}
		<defs>
			<linearGradient id="povdim" x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#060A1E" stopOpacity={0.35} />
				<stop offset="0.55" stopColor="#060A1E" stopOpacity={0.55} />
				<stop offset="1" stopColor="#060A1E" stopOpacity={0.9} />
			</linearGradient>
		</defs>
		<rect x={0} y={0} width={1920} height={1080} fill="url(#povdim)" opacity={dim} />
		<rect x={0} y={800} width={1920} height={280} fill="#070B20" opacity={0.6 + dim * 0.4} />
	</g>
);

/** Eye-shaped reveal from a solid colour (an eye opening). `r` = vertical radius in px. */
export const IrisMask: React.FC<{r: number; color?: string; cx?: number; cy?: number}> = ({r, color = C.eye, cx = 960, cy = 540}) => {
	if (r > 1300) return null;
	const rx = r * 1.6;
	return (
		<path
			d={`M-10,-10H1930V1090H-10Z M${cx - rx},${cy} a${rx},${r} 0 1,0 ${2 * rx},0 a${rx},${r} 0 1,0 ${-2 * rx},0Z`}
			fill={color}
			fillRule="evenodd"
		/>
	);
};

export type Dot = {u: number; bin: number; stack: number; order: number; jitter: number};

/**
 * Dots that pile up into a histogram of a Gaussian: positions at evenly spaced quantiles
 * (so the pile has exactly the right shape), falling in a shuffled order.
 */
export const makePile = (mu: number, sigma: number, n: number, binU: number, seed: string): Dot[] => {
	const us = Array.from({length: n}, (_, i) => mu + sigma * probit((i + 0.5) / n));
	const order = us.map((_, i) => i).sort((a, b) => random(`${seed}o${a}`) - random(`${seed}o${b}`));
	const rank = new Array(n);
	order.forEach((idx, k) => (rank[idx] = k));
	const counts = new Map<number, number>();
	const dots: Dot[] = [];
	for (let k = 0; k < n; k++) {
		const idx = order[k];
		const bin = Math.round(us[idx] / binU);
		const stack = counts.get(bin) ?? 0;
		counts.set(bin, stack + 1);
		dots.push({u: us[idx], bin, stack, order: rank[idx], jitter: random(`${seed}j${idx}`) - 0.5});
	}
	return dots;
};

export const DotPile: React.FC<{
	dots: Dot[];
	frame: number;
	start: number; // first dot starts falling
	every?: number; // frames between dots
	fall?: number; // frames to fall
	from: {x: number; y: number};
	baseY: number;
	binU: number;
	r?: number;
	color: string;
	opacity?: number;
}> = ({dots, frame, start, every = 1.1, fall = 16, from, baseY, binU, r = 8, color, opacity = 1}) => {
	if (opacity <= 0.001) return null;
	return (
		<g opacity={opacity}>
			{dots.map((d, i) => {
				const t0 = start + d.order * every;
				const t = (frame - t0) / fall;
				if (t <= 0) return null;
				const p = Math.min(1, t);
				const tx = fieldX(d.bin * binU);
				const ty = baseY - r - d.stack * (2 * r) - 1;
				const sx = from.x + d.jitter * 30;
				const x = sx + (tx - sx) * p;
				const y = from.y + (ty - from.y) * p * p;
				return (
					<g key={i}>
						<circle cx={x} cy={y} r={r * 1.7} fill={color} opacity={0.18} />
						<circle cx={x} cy={y} r={r} fill={color} />
					</g>
				);
			})}
		</g>
	);
};
