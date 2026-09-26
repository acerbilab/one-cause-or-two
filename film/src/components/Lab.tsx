import React from 'react';
import {random} from 'remotion';
import {C, FONT} from '../theme';

// Screen geometry: the black cloth spans ±23°; stimuli are placed at x = 960 + 30·deg.
export const CLOTH = {x: 250, y: 170, w: 1420, h: 480};
export const MID_Y = CLOTH.y + CLOTH.h / 2;
export const degX = (deg: number) => 960 + deg * 30;
export const SPEAKERS = [-15, -10, -5, 0, 5, 10, 15];

/** Acoustic foam wedges on a wall panel. */
const Foam: React.FC<{x: number; y: number; w: number; h: number}> = ({x, y, w, h}) => {
	const s = 44;
	const cols = Math.floor(w / s);
	const rows = Math.floor(h / s);
	return (
		<g>
			<rect x={x} y={y} width={w} height={h} fill="#1A1D48" />
			{Array.from({length: cols * rows}, (_, i) => {
				const cx = x + (i % cols) * s;
				const cy = y + Math.floor(i / cols) * s;
				const flip = (Math.floor(i / cols) + (i % cols)) % 2 === 0;
				return (
					<path
						key={i}
						d={flip ? `M${cx},${cy + s} L${cx + s / 2},${cy} L${cx + s},${cy + s}Z` : `M${cx},${cy} L${cx + s},${cy} L${cx + s / 2},${cy + s}Z`}
						fill={flip ? '#272B62' : '#1F2354'}
					/>
				);
			})}
		</g>
	);
};

export const LabRoom: React.FC<{glow?: number}> = ({glow = 1}) => (
	<g>
		<rect x={0} y={0} width={1920} height={1080} fill="#10133A" />
		<Foam x={0} y={60} w={200} h={760} />
		<Foam x={1720} y={60} w={200} h={760} />
		<rect x={0} y={820} width={1920} height={260} fill="#090A1E" />
		{/* screen glow on the floor and walls */}
		<ellipse cx={960} cy={420} rx={900} ry={420} fill="#6F8BFF" opacity={0.09 * glow} />
		{/* wooden frame and black cloth */}
		<rect x={CLOTH.x - 22} y={CLOTH.y - 22} width={CLOTH.w + 44} height={CLOTH.h + 44} rx={8} fill="#2B2230" />
		<rect x={CLOTH.x} y={CLOTH.y} width={CLOTH.w} height={CLOTH.h} fill="#050510" />
		{Array.from({length: 18}, (_, i) => (
			<line
				key={i}
				x1={CLOTH.x + 40 + i * 78 + random(`fold${i}`) * 20}
				y1={CLOTH.y}
				x2={CLOTH.x + 30 + i * 78 + random(`fold2${i}`) * 30}
				y2={CLOTH.y + CLOTH.h}
				stroke="#0E0E20"
				strokeWidth={10}
				opacity={0.7}
			/>
		))}
		{/* fixation cross (present throughout the experiment) */}
		<g stroke="#F4F1EA" strokeWidth={4} opacity={0.9}>
			<line x1={950} y1={MID_Y} x2={970} y2={MID_Y} />
			<line x1={960} y1={MID_Y - 10} x2={960} y2={MID_Y + 10} />
		</g>
		{/* table */}
		<path d="M160,1080 L360,820 L1560,820 L1760,1080Z" fill="#1C1B3C" />
		<path d="M360,820 L1560,820 L1570,834 L350,834Z" fill="#23213F" />
	</g>
);

/** The seven speakers behind the cloth, revealed as outlines; `lit` highlights one. */
export const HiddenSpeakers: React.FC<{reveal: number; lit?: number | null; litT?: number}> = ({reveal, lit = null, litT = 0}) => (
	<g>
		{SPEAKERS.map((d) => {
			const on = lit === d ? litT : 0;
			const o = Math.max(reveal * 0.35, on);
			if (o <= 0.01) return null;
			return (
				<g key={d} transform={`translate(${degX(d)},${MID_Y + 110})`} opacity={o}>
					<rect x={-36} y={-50} width={72} height={100} rx={10} fill="none" stroke={on > 0 ? C.sound : '#8A93C9'} strokeWidth={3} strokeDasharray="7 6" />
					<circle cx={0} cy={10} r={22} fill="none" stroke={on > 0 ? C.sound : '#8A93C9'} strokeWidth={3} strokeDasharray="5 5" />
				</g>
			);
		})}
	</g>
);

/** A Gaussian blob flashed on the cloth (the visual stimulus). */
export const Flash: React.FC<{x: number; t: number; size: number; id: string}> = ({x, t, size, id}) => {
	if (t <= 0 || t >= 1) return null;
	const o = t < 0.15 ? t / 0.15 : (1 - t) / 0.85;
	return (
		<g opacity={o}>
			<defs>
				<radialGradient id={id}>
					<stop offset="0" stopColor="#FFFFFF" stopOpacity={0.95} />
					<stop offset="0.35" stopColor="#CFE3FF" stopOpacity={0.55} />
					<stop offset="1" stopColor={C.sight} stopOpacity={0} />
				</radialGradient>
			</defs>
			<circle cx={x} cy={MID_Y} r={size} fill={`url(#${id})`} />
		</g>
	);
};

/** The response cursor: a thin vertical line with arrowheads, locked to the midline. */
export const Cursor: React.FC<{x: number; opacity?: number; click?: number}> = ({x, opacity = 1, click = 0}) => (
	<g opacity={opacity}>
		<line x1={x} y1={MID_Y - 70} x2={x} y2={MID_Y + 70} stroke="#FFFFFF" strokeWidth={3} />
		<path d={`M${x - 10},${MID_Y + 58} l-12,8 l12,8Z`} fill="#FFFFFF" />
		<path d={`M${x + 10},${MID_Y + 58} l12,8 l-12,8Z`} fill="#FFFFFF" />
		{click > 0 && <circle cx={x} cy={MID_Y} r={20 + click * 40} fill="none" stroke="#FFFFFF" strokeWidth={3} opacity={1 - click} />}
	</g>
);

/** "Same place?" prompt with Yes / No buttons; `choice` 0..1 highlights "No". */
export const SamePrompt: React.FC<{pop: number; choice: number}> = ({pop, choice}) => {
	if (pop <= 0.001) return null;
	return (
		<g transform={`translate(960,${MID_Y - 110}) scale(${0.8 + 0.2 * pop})`} opacity={pop}>
			<text x={0} y={-40} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={48} fill={C.text}>
				Same place?
			</text>
			<g transform="translate(-120,30)">
				<rect x={-90} y={-36} width={180} height={72} rx={16} fill="#1E2250" stroke="#8A93C9" strokeWidth={3} />
				<text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={38} fill={C.text}>
					Yes
				</text>
			</g>
			<g transform="translate(120,30)">
				<rect x={-90} y={-36} width={180} height={72} rx={16} fill={choice > 0.5 ? C.belief : '#1E2250'} stroke={choice > 0.5 ? C.belief : '#8A93C9'} strokeWidth={3} />
				<text x={0} y={14} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={38} fill={choice > 0.5 ? '#0B1026' : C.text}>
					No
				</text>
			</g>
		</g>
	);
};

/**
 * Seated volunteer seen from behind, with a rim of screen light around the silhouette.
 * `swap` 0..1: the marmot hops off to the left, then a person slides in and sits down.
 */
export const Volunteer: React.FC<{swap: number}> = ({swap}) => {
	const rim = {stroke: '#7C93FF', strokeWidth: 5, strokeOpacity: 0.45, paintOrder: 'stroke' as const};
	// marmot: hop up and away (first half of the swap)
	const m = Math.min(1, swap / 0.55);
	const mx = -360 * m;
	const my = -Math.sin(m * Math.PI) * 120;
	// person: slides in from the right and settles (second half)
	const p = Math.max(0, (swap - 0.35) / 0.65);
	const px = 420 * (1 - p) ** 2;
	const py = Math.sin(Math.min(1, p * 1.25) * Math.PI) * -18;
	return (
		<g>
			{/* chin rest posts */}
			<rect x={818} y={690} width={14} height={260} rx={6} fill="#2E3150" />
			<rect x={1088} y={690} width={14} height={260} rx={6} fill="#2E3150" />
			<rect x={812} y={684} width={296} height={14} rx={7} fill="#3A3E66" />
			{m < 1 && (
				<g transform={`translate(${mx},${my})`} opacity={1 - Math.max(0, (m - 0.7) / 0.3)}>
					<path d="M770,1080 C750,960 810,870 905,856 L1015,856 C1110,870 1170,960 1150,1080Z" fill="#05060F" style={rim} />
					<circle cx={902} cy={728} r={17} fill="#05060F" style={rim} />
					<circle cx={1018} cy={728} r={17} fill="#05060F" style={rim} />
					<ellipse cx={960} cy={800} rx={100} ry={86} fill="#05060F" style={rim} />
				</g>
			)}
			{p > 0 && (
				<g transform={`translate(${px},${py})`} opacity={Math.min(1, p * 3)}>
					<path d="M700,1080 C700,930 780,880 880,868 L1040,868 C1140,880 1220,930 1220,1080Z" fill="#05060F" style={rim} />
					<ellipse cx={960} cy={790} rx={92} ry={112} fill="#05060F" style={rim} />
				</g>
			)}
		</g>
	);
};
