import React from 'react';
import {interpolateColors, random} from 'remotion';
import {W} from '../theme';

type Peak = {x: number; h: number; w: number};

// Stylised ridge: the max of rounded triangular peaks plus a little seeded jaggedness.
const ridgeY = (x: number, base: number, peaks: Peak[], seed: string) => {
	let h = 0;
	for (const p of peaks) {
		const d = Math.abs(x - p.x) / p.w;
		if (d < 1) h = Math.max(h, p.h * (1 - Math.pow(d, 1.15)) ** 1.25);
	}
	const j = (random(`${seed}${Math.round(x / 18)}`) - 0.5) * 6;
	return base - h + j;
};

const ridgePath = (base: number, peaks: Peak[], seed: string, bottom: number, x0 = -200, x1 = W + 200) => {
	let d = `M${x0},${bottom}`;
	for (let x = x0; x <= x1; x += 12) d += `L${x},${ridgeY(x, base, peaks, seed).toFixed(1)}`;
	return d + `L${x1},${bottom}Z`;
};

// Snow caps: the part of each tall peak within `depth` px of its summit, with a jagged lower edge.
const capPath = (base: number, p: Peak, seed: string, depth: number) => {
	const pts: string[] = [];
	const lower: string[] = [];
	const span = p.w * 0.36;
	for (let x = p.x - span; x <= p.x + span; x += 8) {
		const y = ridgeY(x, base, [p], seed);
		const summit = base - p.h;
		if (y < summit + depth) {
			pts.push(`${x.toFixed(1)},${y.toFixed(1)}`);
			const cut = summit + depth * (0.75 + 0.35 * random(`${seed}c${Math.round(x)}`));
			lower.unshift(`${x.toFixed(1)},${Math.max(y, cut).toFixed(1)}`);
		}
	}
	if (pts.length < 3) return '';
	return `M${pts.join('L')}L${lower.join('L')}Z`;
};

const FAR: Peak[] = [
	{x: 80, h: 250, w: 360},
	{x: 420, h: 330, w: 420},
	{x: 760, h: 240, w: 300},
	{x: 1080, h: 300, w: 380},
	{x: 1420, h: 360, w: 460},
	{x: 1800, h: 260, w: 360},
];
const MID: Peak[] = [
	{x: -40, h: 190, w: 420},
	{x: 520, h: 150, w: 460},
	{x: 980, h: 210, w: 520},
	{x: 1560, h: 170, w: 480},
	{x: 2000, h: 200, w: 420},
];

export const Mountains: React.FC<{
	horizon: number;
	shift?: number; // parallax offset in px (far layer moves least)
	dawn?: number; // 0 night palette → 1 dawn palette
	snow?: boolean;
	layers?: {far?: boolean; mid?: boolean; near?: boolean};
}> = ({horizon, shift = 0, dawn = 0, snow = true, layers = {far: true, mid: true, near: true}}) => {
	const far = interpolateColors(dawn, [0, 1], ['#2A3574', '#6B5A9A']);
	const farSnow = interpolateColors(dawn, [0, 1], ['#5B6AB0', '#F2C6B6']);
	const mid = interpolateColors(dawn, [0, 1], ['#1F295E', '#4B4480']);
	const near = interpolateColors(dawn, [0, 1], ['#172049', '#332F63']);
	return (
		<g>
			<g transform={`translate(${shift * 0.25},0)`} display={layers.far === false ? 'none' : undefined}>
				<path d={ridgePath(horizon - 40, FAR, 'far', horizon + 400)} fill={far} />
				{snow && FAR.filter((p) => p.h > 280).map((p, i) => <path key={i} d={capPath(horizon - 40, p, 'far', 70)} fill={farSnow} opacity={0.9} />)}
			</g>
			<g transform={`translate(${shift * 0.5},0)`} display={layers.mid === false ? 'none' : undefined}>
				<path d={ridgePath(horizon + 30, MID, 'mid', horizon + 400)} fill={mid} />
			</g>
			<g transform={`translate(${shift * 0.75},0)`} display={layers.near === false ? 'none' : undefined}>
				<path
					d={`M-200,${horizon + 400} L-200,${horizon + 70} C 300,${horizon + 20} 700,${horizon + 90} 1100,${horizon + 60} C 1500,${horizon + 30} 1800,${horizon + 80} ${W + 200},${horizon + 55} L${W + 200},${horizon + 400}Z`}
					fill={near}
				/>
			</g>
		</g>
	);
};
