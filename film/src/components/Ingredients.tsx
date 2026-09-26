import React from 'react';
import {fieldX} from './Diagram';
import {C, FONT} from '../theme';

export const ROW_A_Y = 530; // row of flickers with blur halos
export const ROW_B_BASE = 860; // ground line of the prior
export const HALO_U = [-24, -16, -8, 0, 8, 16, 24];

/** A card naming one ingredient. */
export const IngredientCard: React.FC<{
	x: number;
	y: number;
	w?: number;
	h?: number;
	n: number;
	title: string;
	color: string;
	pop: number;
	highlight?: number;
	icon: React.ReactNode;
}> = ({x, y, w = 760, h = 170, n, title, color, pop, highlight = 0, icon}) => {
	if (pop <= 0.001) return null;
	return (
		<g transform={`translate(${x + w / 2},${y + h / 2}) scale(${0.7 + 0.3 * pop}) translate(${-w / 2},${-h / 2})`} opacity={pop}>
			<rect x={0} y={0} width={w} height={h} rx={28} fill="#141C4A" stroke={color} strokeWidth={3 + highlight * 3} strokeOpacity={0.5 + 0.5 * highlight} />
			<circle cx={62} cy={h / 2} r={34} fill={color} />
			<text x={62} y={h / 2 + 15} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={42} fill="#0B1026">
				{n}
			</text>
			<g transform={`translate(160,${h / 2})`}>{icon}</g>
			<text x={250} y={h / 2 + 16} fontFamily={FONT} fontWeight={800} fontSize={46} fill={C.text}>
				{title}
			</text>
		</g>
	);
};

export const EyeEarIcon: React.FC = () => (
	<g>
		<path d="M-44,-6 Q-22,-30 0,-6 Q-22,18 -44,-6Z" fill="none" stroke={C.sight} strokeWidth={5} strokeLinejoin="round" />
		<circle cx={-22} cy={-6} r={7} fill={C.sight} />
		<path d="M14,-30 C44,-34 50,4 30,14 C22,18 24,30 14,32" fill="none" stroke={C.sound} strokeWidth={6} strokeLinecap="round" />
		<path d="M22,-12 C30,-12 32,0 24,4" fill="none" stroke={C.sound} strokeWidth={5} strokeLinecap="round" />
	</g>
);

export const CloudIcon: React.FC = () => (
	<g>
		<path d="M-40,14 C-58,14 -58,-12 -40,-12 C-40,-32 -12,-38 -4,-22 C4,-40 36,-36 36,-14 C54,-14 56,14 36,14Z" fill="none" stroke={C.prior} strokeWidth={5} strokeLinejoin="round" />
		<path d="M-26,6 Q-2,-26 22,6" fill="none" stroke={C.prior} strokeWidth={4} strokeLinecap="round" />
	</g>
);

/** A row of flicker points, each with a halo whose radius is the sense's blur at that position. */
export const HaloRow: React.FC<{sigma: (u: number) => number; opacity?: number; unknown?: number; frame: number; pxPerUnit?: number}> = ({
	sigma,
	opacity = 1,
	unknown = 0,
	frame,
	pxPerUnit = 18,
}) => {
	if (opacity <= 0.001) return null;
	return (
		<g opacity={opacity}>
			<defs>
				<radialGradient id="halo">
					<stop offset="0" stopColor="#CFE9FF" stopOpacity={0.55} />
					<stop offset="0.6" stopColor={C.sight} stopOpacity={0.22} />
					<stop offset="1" stopColor={C.sight} stopOpacity={0} />
				</radialGradient>
			</defs>
			{HALO_U.map((u, i) => {
				const r = sigma(u) * pxPerUnit;
				return (
					<g key={u}>
						<circle cx={fieldX(u)} cy={ROW_A_Y} r={r * 1.35} fill="url(#halo)" />
						<circle cx={fieldX(u)} cy={ROW_A_Y} r={r} fill="none" stroke={C.sight} strokeWidth={2.5} strokeDasharray="6 7" opacity={0.7} />
						<circle cx={fieldX(u)} cy={ROW_A_Y} r={6} fill="#FFFFFF" />
						{unknown > 0.01 && (
							<text
								x={fieldX(u)}
								y={ROW_A_Y - r - 16 + Math.sin(frame * 0.2 + i) * 4}
								textAnchor="middle"
								fontFamily={FONT}
								fontWeight={900}
								fontSize={34}
								fill={C.text}
								opacity={unknown}
							>
								?
							</text>
						)}
					</g>
				);
			})}
		</g>
	);
};

/** A rubber stamp that slams down. */
export const Stamp: React.FC<{x: number; y: number; text: string; t: number; angle?: number; color?: string; size?: number}> = ({
	x,
	y,
	text,
	t,
	angle = -9,
	color = C.stamp,
	size = 110,
}) => {
	if (t <= 0) return null;
	const s = 1 + 1.2 * Math.max(0, 1 - t) ** 2;
	const w = text.length * size * 0.66 + 70;
	const h = size * 1.4;
	return (
		<g transform={`translate(${x},${y}) rotate(${angle}) scale(${s})`} opacity={Math.min(1, t * 2.5)}>
			<defs>
				<filter id="ink">
					<feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves={2} seed={4} result="n" />
					<feDisplacementMap in="SourceGraphic" in2="n" scale={5} />
				</filter>
			</defs>
			<g filter="url(#ink)">
				<rect x={-w / 2} y={-h / 2} width={w} height={h} rx={18} fill="none" stroke={color} strokeWidth={12} />
				<text x={0} y={size * 0.36} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={size} fill={color} letterSpacing={6}>
					{text}
				</text>
			</g>
		</g>
	);
};

export const BLUR_ROW_Y = 470; // baseline of the row of small blur hills

/**
 * Blur drawn with the film's own rule (wider hill = less sure): one small hill per
 * position across the field, its width set by `sigma(u)`.
 */
export const BlurRow: React.FC<{
	sigma: (u: number) => number;
	opacity?: number;
	unknown?: number;
	frame: number;
	baseY?: number;
	pxPerUnit?: number;
	yScale?: number;
	ghost?: boolean; // dashed outline only: an earlier assumption shown for comparison
}> = ({sigma, opacity = 1, unknown = 0, frame, baseY = BLUR_ROW_Y, pxPerUnit = 16, yScale = 330, ghost = false}) => {
	if (opacity <= 0.001) return null;
	return (
		<g opacity={opacity}>
			{!ghost && <line x1={fieldX(-29)} y1={baseY} x2={fieldX(29)} y2={baseY} stroke={C.text} strokeWidth={2} opacity={0.35} />}
			{HALO_U.map((u, i) => {
				const s = sigma(u);
				const x0 = fieldX(u);
				const toX = (v: number) => x0 + v * pxPerUnit;
				let d = '';
				const n = 80;
				for (let k = 0; k <= n; k++) {
					const v = -3 * s + (6 * s * k) / n;
					const y = baseY - (Math.exp(-0.5 * (v / s) ** 2) / (s * Math.sqrt(2 * Math.PI))) * yScale;
					d += `${k === 0 ? 'M' : 'L'}${toX(v).toFixed(1)},${y.toFixed(1)}`;
				}
				const peakY = baseY - yScale / (s * Math.sqrt(2 * Math.PI));
				return (
					<g key={u}>
						{!ghost && <path d={`${d}L${toX(3 * s)},${baseY}L${toX(-3 * s)},${baseY}Z`} fill={C.sight} opacity={0.28} />}
						<path d={d} stroke={ghost ? '#A9DDFF' : C.sight} strokeWidth={ghost ? 3 : 4} strokeDasharray={ghost ? '9 8' : undefined} fill="none" strokeLinejoin="round" />
						{!ghost && <circle cx={x0} cy={baseY} r={5} fill="#FFFFFF" />}
						{unknown > 0.01 && (
							<text x={x0} y={peakY - 14 + Math.sin(frame * 0.2 + i) * 4} textAnchor="middle" fontFamily={FONT} fontWeight={900} fontSize={34} fill={C.text} opacity={unknown}>
								?
							</text>
						)}
					</g>
				);
			})}
		</g>
	);
};
