import React from 'react';
import {C, FONT} from '../theme';
import {curvePath} from '../lib/math';

// Field coordinates: u = 0 is straight ahead, u = ±30 spans the usable width.
export const FIELD_CX = 960;
export const FIELD_SCALE = 26;
export const fieldX = (u: number) => FIELD_CX + u * FIELD_SCALE;
export const fieldU = (x: number) => (x - FIELD_CX) / FIELD_SCALE;

/** A glowing probability "hill" standing on the ground line. */
export const Hill: React.FC<{
	f: (u: number) => number;
	color: string;
	baseY: number;
	yScale: number;
	opacity?: number;
	u0?: number;
	u1?: number;
	id: string;
	fill?: number;
	stroke?: number;
	dashed?: boolean;
	glow?: boolean;
	toX?: (u: number) => number;
}> = ({f, color, baseY, yScale, opacity = 1, u0 = -32, u1 = 32, id, fill = 0.42, stroke = 5, dashed = false, glow = true, toX = fieldX}) => {
	if (opacity <= 0.001) return null;
	// draw only where the hill has visible height, so flat tails don't paint over the ground line
	const n = 400;
	let peak = 0;
	for (let i = 0; i <= n; i++) peak = Math.max(peak, f(u0 + ((u1 - u0) * i) / n));
	let a = u0;
	let b = u1;
	for (let i = 0; i <= n; i++) {
		const u = u0 + ((u1 - u0) * i) / n;
		if (f(u) > peak * 0.006) {
			a = u;
			break;
		}
	}
	for (let i = n; i >= 0; i--) {
		const u = u0 + ((u1 - u0) * i) / n;
		if (f(u) > peak * 0.006) {
			b = u;
			break;
		}
	}
	const area = curvePath(f, a, b, toX, baseY, yScale, true);
	const line = curvePath(f, a, b, toX, baseY, yScale, false);
	return (
		<g opacity={opacity}>
			<defs>
				<linearGradient id={`${id}-fill`} x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor={color} stopOpacity={fill} />
					<stop offset="1" stopColor={color} stopOpacity={0.04} />
				</linearGradient>
				<filter id={`${id}-glow`} x="-20%" y="-50%" width="140%" height="200%">
					<feGaussianBlur stdDeviation="7" />
				</filter>
			</defs>
			{fill > 0 && <path d={area} fill={`url(#${id}-fill)`} />}
			{glow && <path d={line} stroke={color} strokeWidth={stroke * 2.4} fill="none" opacity={0.55} filter={`url(#${id}-glow)`} />}
			<path d={line} stroke={color} strokeWidth={stroke} fill="none" strokeLinejoin="round" strokeLinecap="round" strokeDasharray={dashed ? '14 12' : undefined} />
		</g>
	);
};

/** The thin ground line the hills stand on, with a tick for "straight ahead". */
export const GroundLine: React.FC<{y: number; opacity?: number; tick?: boolean; x0?: number; x1?: number; id?: string}> = ({
	y,
	opacity = 1,
	tick = true,
	x0 = 130,
	x1 = 1790,
	id = 'gl',
}) => (
	<g opacity={opacity}>
		<defs>
			<linearGradient id={`${id}-g`} x1="0" x2="1" y1="0" y2="0">
				<stop offset="0" stopColor={C.text} stopOpacity={0} />
				<stop offset="0.12" stopColor={C.text} stopOpacity={0.7} />
				<stop offset="0.88" stopColor={C.text} stopOpacity={0.7} />
				<stop offset="1" stopColor={C.text} stopOpacity={0} />
			</linearGradient>
		</defs>
		<rect x={x0} y={y - 1.5} width={x1 - x0} height={3} fill={`url(#${id}-g)`} />
		{tick && <line x1={FIELD_CX} y1={y - 9} x2={FIELD_CX} y2={y + 9} stroke={C.text} strokeWidth={3} opacity={0.8} />}
	</g>
);

/** A short label with an optional leader line to a point. */
export const Label: React.FC<{
	x: number;
	y: number;
	text: string;
	color?: string;
	size?: number;
	opacity?: number;
	anchor?: 'start' | 'middle' | 'end';
	weight?: number;
	pop?: number; // 0..1 spring for scale-in
	to?: {x: number; y: number};
	font?: string;
	italic?: boolean;
	letterSpacing?: number;
}> = ({x, y, text, color = C.text, size = 34, opacity = 1, anchor = 'middle', weight = 800, pop = 1, to, font = FONT, italic = false, letterSpacing = 0}) => {
	if (opacity <= 0.001) return null;
	// leader line from the nearest edge of the text's box to the target
	let lead: {x: number; y: number} | null = null;
	if (to) {
		const w = text.length * size * 0.52;
		const left = anchor === 'start' ? x : anchor === 'end' ? x - w : x - w / 2;
		const right = left + w;
		const top = y - size * 0.78;
		const bottom = y + size * 0.22;
		if (to.x > right + 4) lead = {x: right + 8, y: Math.max(top, Math.min(bottom, to.y))};
		else if (to.x < left - 4) lead = {x: left - 8, y: Math.max(top, Math.min(bottom, to.y))};
		else lead = {x: Math.max(left, Math.min(right, to.x)), y: to.y > y ? bottom + 6 : top - 6};
	}
	return (
		<g opacity={opacity}>
			{to && lead && <line x1={lead.x} y1={lead.y} x2={to.x} y2={to.y} stroke={color} strokeWidth={2.5} opacity={0.7} strokeLinecap="round" />}
			<g transform={`translate(${x},${y}) scale(${0.6 + 0.4 * pop})`}>
				<text
					x={0}
					y={0}
					textAnchor={anchor}
					fontFamily={font}
					fontWeight={weight}
					fontSize={size}
					fill={color}
					fontStyle={italic ? 'italic' : 'normal'}
					letterSpacing={letterSpacing}
					style={{paintOrder: 'stroke', stroke: 'rgba(8,12,34,0.65)', strokeWidth: size * 0.16, strokeLinejoin: 'round'}}
				>
					{text}
				</text>
			</g>
		</g>
	);
};

/** Cloud-shaped thought bubble with trailing dots toward `tail`. Content is drawn centred at (x, y). */
export const ThoughtBubble: React.FC<{
	x: number;
	y: number;
	r?: number;
	pop: number; // 0..1
	tail?: {x: number; y: number};
	children?: React.ReactNode;
	fill?: string;
}> = ({x, y, r = 110, pop, tail, children, fill = '#F4F1EA'}) => {
	if (pop <= 0.001) return null;
	const lobes = 9;
	let d = '';
	for (let i = 0; i <= lobes; i++) {
		const a = (i / lobes) * Math.PI * 2;
		const px = x + Math.cos(a) * r * 1.18;
		const py = y + Math.sin(a) * r * 0.9;
		if (i === 0) d += `M${px},${py}`;
		else {
			const am = ((i - 0.5) / lobes) * Math.PI * 2;
			d += `Q${x + Math.cos(am) * r * 1.5},${y + Math.sin(am) * r * 1.18} ${px},${py}`;
		}
	}
	return (
		<g transform={`translate(${x},${y}) scale(${pop}) translate(${-x},${-y})`}>
			{tail &&
				[0.28, 0.16, 0.08].map((f, i) => {
					const t = 0.55 + i * 0.18;
					return <circle key={i} cx={x + (tail.x - x) * t} cy={y + (tail.y - y) * t} r={r * f} fill={fill} opacity={0.95} />;
				})}
			<path d={d + 'Z'} fill={fill} />
			<g>{children}</g>
		</g>
	);
};

const BACK_RIDGE = (() => {
	const peaks = [
		{x: 60, h: 190, w: 300},
		{x: 380, h: 260, w: 360},
		{x: 700, h: 170, w: 260},
		{x: 1010, h: 230, w: 320},
		{x: 1360, h: 280, w: 380},
		{x: 1760, h: 200, w: 320},
	];
	let d = 'M-20,1100';
	for (let x = -20; x <= 1940; x += 14) {
		let h = 0;
		for (const p of peaks) {
			const t = Math.abs(x - p.x) / p.w;
			if (t < 1) h = Math.max(h, p.h * (1 - t ** 1.15) ** 1.25);
		}
		d += `L${x},${(1000 - h).toFixed(1)}`;
	}
	return d + 'L1940,1100Z';
})();

/** Dark backdrop for the diagram scenes: deep gradient, a few stars, a soft central glow, faint mountains. */
export const Backdrop: React.FC<{frame: number; glow?: string; id?: string; mountains?: number}> = ({frame, glow = '#2A3A8C', id = 'bd', mountains = 1}) => (
	<g>
		<defs>
			<linearGradient id={`${id}-g`} x1="0" y1="0" x2="0" y2="1">
				<stop offset="0" stopColor="#080C24" />
				<stop offset="1" stopColor="#111842" />
			</linearGradient>
			<radialGradient id={`${id}-r`} cx="0.5" cy="0.45" r="0.6">
				<stop offset="0" stopColor={glow} stopOpacity={0.35} />
				<stop offset="1" stopColor={glow} stopOpacity={0} />
			</radialGradient>
		</defs>
		<rect x={0} y={0} width={1920} height={1080} fill={`url(#${id}-g)`} />
		<rect x={0} y={0} width={1920} height={1080} fill={`url(#${id}-r)`} />
		{Array.from({length: 60}, (_, i) => {
			const x = (i * 733) % 1920;
			const y = (i * 397) % 1080;
			return <circle key={i} cx={x} cy={y} r={1 + (i % 3) * 0.5} fill="#FFFFFF" opacity={0.12 + 0.12 * Math.sin(frame * 0.05 + i)} />;
		})}
		{mountains > 0 && <path d={BACK_RIDGE} fill="#1E2A66" opacity={0.55 * mountains} />}
	</g>
);
