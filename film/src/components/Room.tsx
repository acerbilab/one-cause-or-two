import React from 'react';
import {random} from 'remotion';
import {Marmot} from './Characters';
import {C, FONT} from '../theme';

export const TV_RECT = {x: 510, y: 205, w: 900, h: 506};

/** Dim living room around a TV. The screen content is drawn separately on top. */
export const LivingRoom: React.FC<{frame: number; lamp?: number}> = ({frame, lamp = 1}) => {
	const flick = 0.96 + 0.04 * Math.sin(frame * 0.31) * Math.sin(frame * 0.07);
	return (
		<g>
			<defs>
				<linearGradient id="wall" x1="0" y1="0" x2="0" y2="1">
					<stop offset="0" stopColor="#12173A" />
					<stop offset="1" stopColor="#1B2150" />
				</linearGradient>
				<radialGradient id="lampglow" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stopColor={C.belief} stopOpacity={0.45} />
					<stop offset="0.4" stopColor={C.belief} stopOpacity={0.12} />
					<stop offset="1" stopColor={C.belief} stopOpacity={0} />
				</radialGradient>
				<radialGradient id="tvglow" cx="0.5" cy="0.5" r="0.5">
					<stop offset="0" stopColor="#7FA8FF" stopOpacity={0.22} />
					<stop offset="1" stopColor="#7FA8FF" stopOpacity={0} />
				</radialGradient>
			</defs>
			<rect x={0} y={0} width={1920} height={1080} fill="url(#wall)" />
			{/* wallpaper dots */}
			{Array.from({length: 60}, (_, i) => (
				<circle key={i} cx={(i % 12) * 170 + 60 + ((Math.floor(i / 12) % 2) * 85)} cy={Math.floor(i / 12) * 150 + 60} r={4} fill="#262D63" />
			))}
			<ellipse cx={960} cy={460} rx={900} ry={520} fill="url(#tvglow)" />
			{/* floor */}
			<rect x={0} y={830} width={1920} height={250} fill="#0D1130" />
			<rect x={0} y={826} width={1920} height={8} fill="#232A5E" />
			{/* floor lamp */}
			<g opacity={lamp}>
				<circle cx={190} cy={330} r={330 * flick} fill="url(#lampglow)" />
				<rect x={186} y={380} width={8} height={450} fill="#2A2F5E" />
				<ellipse cx={190} cy={832} rx={60} ry={10} fill="#2A2F5E" />
				<path d="M120,380 L260,380 L225,270 L155,270Z" fill="#E8B46A" />
				<path d="M120,380 L260,380 L250,360 L130,360Z" fill="#FFD28A" opacity={0.8} />
			</g>
			{/* plant */}
			<g transform="translate(1745,832)">
				<path d="M-50,0 L-40,-90 L40,-90 L50,0Z" fill="#3A2F5E" />
				{Array.from({length: 11}, (_, i) => {
					const a = -Math.PI / 2 + (i - 5) * 0.24;
					const len = 140 + random(`pl${i}`) * 110;
					const tipX = Math.cos(a) * len * 0.85;
					const tipY = -90 + Math.sin(a) * len;
					return (
						<g key={i}>
							<path d={`M0,-90 Q${Math.cos(a) * len * 0.4},${-90 + Math.sin(a) * len * 0.6} ${tipX},${tipY}`} stroke="#2A5550" strokeWidth={5} strokeLinecap="round" fill="none" />
							<ellipse cx={tipX} cy={tipY} rx={13} ry={30} transform={`rotate(${(a * 180) / Math.PI + 90},${tipX},${tipY})`} fill="#3A7068" />
						</g>
					);
				})}
			</g>
			{/* TV stand */}
			<rect x={560} y={760} width={800} height={70} rx={10} fill="#2A2350" />
			<rect x={580} y={775} width={360} height={40} rx={6} fill="#221C44" />
			<rect x={980} y={775} width={360} height={40} rx={6} fill="#221C44" />
		</g>
	);
};

/** Speaker box; `cone` pulses with the sound. */
export const Speaker: React.FC<{x: number; y: number; cone?: number}> = ({x, y, cone = 0}) => (
	<g transform={`translate(${x},${y})`}>
		<rect x={-62} y={-150} width={124} height={300} rx={14} fill="#1C1A3C" stroke="#2E2B5C" strokeWidth={4} />
		<circle cx={0} cy={-80} r={26} fill="#0E0D24" stroke="#35326A" strokeWidth={4} />
		<circle cx={0} cy={40} r={46 + cone * 3} fill="#0E0D24" stroke="#35326A" strokeWidth={5} />
		<circle cx={0} cy={40} r={14} fill="#2E2B5C" />
	</g>
);

/** The bezel drawn around the TV screen rect. */
export const TVBezel: React.FC<{r: {x: number; y: number; w: number; h: number}; opacity?: number}> = ({r, opacity = 1}) => (
	<g opacity={opacity}>
		<rect x={r.x - 18} y={r.y - 18} width={r.w + 36} height={r.h + 36} rx={16} fill="none" stroke="#0A0A18" strokeWidth={36} />
		<rect x={r.x - 36} y={r.y - 36} width={r.w + 72} height={r.h + 72} rx={22} fill="none" stroke="#24234A" strokeWidth={4} />
		<rect x={r.x + r.w / 2 - 60} y={r.y + r.h + 36} width={120} height={20} fill="#0A0A18" />
	</g>
);

/** Channel content: the marmot as a news anchor. Drawn in 1920×1080 channel space. */
export const NewsAnchor: React.FC<{frame: number; talking: boolean}> = ({frame, talking}) => {
	const open = talking && Math.sin(frame * 1.25) > -0.1;
	return (
		<g>
			<defs>
				<linearGradient id="studio" x1="0" y1="0" x2="1" y2="1">
					<stop offset="0" stopColor="#1F3E8C" />
					<stop offset="1" stopColor="#0E1B4A" />
				</linearGradient>
			</defs>
			<rect x={0} y={0} width={1920} height={1080} fill="url(#studio)" />
			{Array.from({length: 7}, (_, i) => (
				<rect key={i} x={200 + i * 240} y={120} width={150} height={520} fill="#2A4FA3" opacity={0.25} />
			))}
			<circle cx={1520} cy={330} r={170} fill="#2E5CC0" opacity={0.35} />
			<Marmot frame={frame} x={900} y={1010} s={2.35} look={{x: 0.9, y: 0.25}} headTurn={0.35} mouth={open ? 'open' : 'closed'} rimOpacity={0.2} tie id="anchor" />
			{/* desk */}
			<path d="M0,760 L1920,760 L1920,1080 L0,1080Z" fill="#101B45" />
			<rect x={0} y={752} width={1920} height={16} fill="#3860C8" />
			{/* lower third */}
			<rect x={70} y={818} width={760} height={96} fill="#E0484F" />
			<text x={100} y={884} fontFamily={FONT} fontWeight={900} fontSize={62} fill="#FFFFFF">
				MARMOT NEWS
			</text>
			<rect x={70} y={914} width={1780} height={100} fill="#0B1233" />
			<text x={100} y={988} fontFamily={FONT} fontWeight={900} fontSize={72} fill="#F4F1EA">
				FOX OR BIRD?
			</text>
		</g>
	);
};

/** A few frames of analogue static for a channel change. */
export const Static: React.FC<{frame: number; opacity: number}> = ({frame, opacity}) => {
	if (opacity <= 0) return null;
	return (
		<g opacity={opacity}>
			<rect x={0} y={0} width={1920} height={1080} fill="#2A2A3A" />
			{Array.from({length: 90}, (_, i) => (
				<rect
					key={i}
					x={0}
					y={random(`st${i}-${frame}`) * 1080}
					width={1920}
					height={2 + random(`sth${i}-${frame}`) * 10}
					fill="#D8D8E8"
					opacity={random(`sto${i}-${frame}`) * 0.6}
				/>
			))}
		</g>
	);
};
