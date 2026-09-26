import React, {useMemo} from 'react';
import {interpolateColors, random} from 'remotion';
import {noise2D} from '@remotion/noise';
import {W} from '../theme';

/** A localised disturbance of the grass: a twitch (flicker) or a travelling gust (wind). */
export type Gust = {
	x: number; // centre (px)
	start: number; // frame
	strength: number; // radians of bend at the centre
	width?: number; // px
	speed?: number; // px per frame (travelling gust)
	life?: number; // frames
};

const gustBend = (x: number, frame: number, gusts: Gust[]) => {
	let b = 0;
	for (const g of gusts) {
		const t = frame - g.start;
		const life = g.life ?? 30;
		if (t < 0 || t > life) continue;
		const cx = g.x + (g.speed ?? 0) * t;
		const w = g.width ?? 90;
		const d = (x - cx) / w;
		const env = Math.sin((t / life) * Math.PI);
		b += g.strength * Math.exp(-d * d) * env * (g.speed ? 1 : Math.sin(t * 0.9));
	}
	return b;
};

type Blade = {x: number; y: number; h: number; w: number; row: number; seed: number; lean: number};

export const Grass: React.FC<{
	frame: number;
	top: number; // y of the back row
	bottom?: number;
	rows?: number;
	perRow?: number;
	gusts?: Gust[];
	sway?: number; // ambient sway amplitude (radians)
	calm?: number; // 0..1 slows the ambient motion (time slowing down)
	colors?: [string, string]; // back row, front row
	x0?: number;
	x1?: number;
	seed?: string;
	heightScale?: number;
}> = ({
	frame,
	top,
	bottom = 1080,
	rows = 4,
	perRow = 110,
	gusts = [],
	sway = 0.07,
	calm = 0,
	colors = ['#22326A', '#0C1330'],
	x0 = -40,
	x1 = W + 40,
	seed = 'grass',
	heightScale = 1,
}) => {
	const blades = useMemo(() => {
		const out: Blade[] = [];
		for (let r = 0; r < rows; r++) {
			const y = top + ((bottom - top) * (r + 0.4)) / rows;
			for (let i = 0; i < perRow; i++) {
				const k = r * 1000 + i;
				out.push({
					x: x0 + ((x1 - x0) * (i + random(`${seed}x${k}`))) / perRow,
					y: y + (random(`${seed}y${k}`) - 0.5) * 18,
					h: (46 + random(`${seed}h${k}`) * 70) * (0.75 + (0.5 * r) / Math.max(1, rows - 1)) * heightScale,
					w: 7 + random(`${seed}w${k}`) * 6,
					row: r,
					seed: random(`${seed}s${k}`) * 100,
					lean: (random(`${seed}l${k}`) - 0.5) * 0.3,
				});
			}
		}
		return out;
	}, [rows, perRow, top, bottom, x0, x1, seed, heightScale]);

	const t = frame * (1 - 0.85 * calm);
	return (
		<g>
			{blades.map((b, i) => {
				const amb = noise2D('sway', b.x * 0.002 + t * 0.012, b.seed) * sway + Math.sin(t * 0.05 + b.x * 0.01) * sway * 0.4;
				const bend = b.lean + amb + gustBend(b.x, frame, gusts);
				const tipX = b.x + Math.sin(bend) * b.h;
				const tipY = b.y - Math.cos(bend) * b.h;
				const midX = b.x + Math.sin(bend * 0.5) * b.h * 0.55;
				const midY = b.y - Math.cos(bend * 0.5) * b.h * 0.55;
				const col = interpolateColors(b.row, [0, rows - 1], colors);
				return (
					<path
						key={i}
						d={`M${(b.x - b.w / 2).toFixed(1)},${b.y.toFixed(1)} Q${(midX - b.w / 4).toFixed(1)},${midY.toFixed(1)} ${tipX.toFixed(1)},${tipY.toFixed(1)} Q${(midX + b.w / 4).toFixed(1)},${midY.toFixed(1)} ${(b.x + b.w / 2).toFixed(1)},${b.y.toFixed(1)}Z`}
						fill={col}
					/>
				);
			})}
		</g>
	);
};

/** Solid ground under the grass so gaps between blades never show the sky. */
export const Ground: React.FC<{top: number; color: string; bottom?: number}> = ({top, color, bottom = 1080}) => (
	<path d={`M-50,${top + 30} C 500,${top - 10} 1300,${top + 20} ${W + 50},${top} L${W + 50},${bottom} L-50,${bottom}Z`} fill={color} />
);
