import React from 'react';
import {C} from '../theme';
import {blinkAt} from '../lib/anim';

export type MarmotProps = {
	x: number;
	y: number; // feet
	s?: number;
	facing?: 1 | -1;
	frame: number;
	look?: {x: number; y: number}; // pupil offset, each in [-1, 1]
	headTurn?: number; // [-1, 1]
	blink?: number; // overrides the automatic blink when given
	alarm?: number; // 0..1 wide eyes, raised brows, stretched pose
	chew?: number; // 0..1 chewing intensity
	flowerDrop?: number | null; // null: no flower; 0 held → 1 fallen
	mouth?: 'closed' | 'open' | 'o';
	squash?: number; // + squash, - stretch
	sweat?: number; // 0..1
	rimOpacity?: number;
	rimColor?: string;
	tie?: boolean;
	id?: string;
};

/** Screen position of the near pupil, through the same transforms the Marmot uses. */
export const marmotPupil = ({x, y, s = 1, facing = 1, frame, look = {x: 0.3, y: 0}, headTurn = 0, alarm = 0, squash = 0}: MarmotProps) => {
	const breathe = 1 + 0.012 * Math.sin(frame * 0.12);
	const sx = (1 + 0.16 * squash) * (1 - 0.03 * alarm);
	const sy = (1 - 0.16 * squash) * breathe * (1 + 0.05 * alarm);
	// pupil in head space (face shift + look offset), then rotated about the neck
	const px = 44 + headTurn * 5 + look.x * 3.6;
	const py = -246 + look.y * 3.6;
	const a = (headTurn * 7 * Math.PI) / 180;
	const dx = px - 18;
	const dy = py + 195;
	const hx = 18 + dx * Math.cos(a) - dy * Math.sin(a);
	const hy = -195 + dx * Math.sin(a) + dy * Math.cos(a);
	return {x: x + s * facing * sx * hx, y: y + s * sy * hy};
};

export const Marmot: React.FC<MarmotProps> = ({
	x,
	y,
	s = 1,
	facing = 1,
	frame,
	look = {x: 0.3, y: 0},
	headTurn = 0,
	blink,
	alarm = 0,
	chew = 0,
	flowerDrop = null,
	mouth = 'closed',
	squash = 0,
	sweat = 0,
	rimOpacity = 0.5,
	rimColor = C.rim,
	tie = false,
	id = 'm',
}) => {
	const bl = blink ?? blinkAt(frame, 97, 13);
	const breathe = 1 + 0.012 * Math.sin(frame * 0.12);
	const stretch = 1 + 0.05 * alarm;
	const sx = (1 + 0.16 * squash) * (1 - 0.03 * alarm);
	const sy = (1 - 0.16 * squash) * breathe * stretch;
	const jaw = chew * Math.max(0, Math.sin(frame * 1.15)) * 2.2;
	const eyeScale = 1 + 0.22 * alarm;
	const pupilR = 1 - 0.22 * alarm;
	const lx = look.x * 3.6;
	const ly = look.y * 3.6;
	const brow = -5 * alarm;
	const earLift = -4 * alarm;
	const ht = headTurn * 7;
	const face = headTurn * 5;

	const eye = (cx: number, cy: number, rx: number, ry: number, pr: number, key: string) => (
		<g key={key}>
			<clipPath id={`${id}-${key}-clip`}>
				<ellipse cx={cx} cy={cy} rx={rx * eyeScale} ry={ry * eyeScale} />
			</clipPath>
			<ellipse cx={cx} cy={cy} rx={rx * eyeScale} ry={ry * eyeScale} fill="#E8ECF8" />
			<g clipPath={`url(#${id}-${key}-clip)`}>
				<circle cx={cx + lx} cy={cy + ly} r={pr * pupilR} fill={C.eye} />
				<circle cx={cx + lx + pr * 0.35} cy={cy + ly - pr * 0.45} r={pr * 0.36} fill="#FFFFFF" />
				<rect x={cx - rx * 1.4} y={cy - ry * eyeScale - 2} width={rx * 2.8} height={(ry * eyeScale * 2 + 4) * bl} fill={C.fur} />
			</g>
		</g>
	);

	const flower =
		flowerDrop === null ? null : (
			<g
				transform={
					flowerDrop > 0
						? `translate(${flowerDrop * 40},${flowerDrop * flowerDrop * 190}) rotate(${flowerDrop * 110},60,-160)`
						: `rotate(${chew * Math.sin(frame * 1.15) * 2.5},38,-112)`
				}
			>
				<path d="M38,-112 C58,-140 80,-170 96,-204" stroke="#5FA35A" strokeWidth={4.5} fill="none" strokeLinecap="round" />
				<path d="M66,-152 C78,-152 86,-160 85,-170 C75,-166 69,-160 66,-152Z" fill="#6DB866" />
				{[0, 72, 144, 216, 288].map((a) => (
					<circle key={a} cx={100 + Math.cos((a * Math.PI) / 180) * 8} cy={-212 + Math.sin((a * Math.PI) / 180) * 8} r={7} fill="#FFE066" />
				))}
				<circle cx={100} cy={-212} r={5} fill="#F6A93B" />
			</g>
		);

	return (
		<g transform={`translate(${x},${y}) scale(${s * facing},${s})`}>
			<g transform={`scale(${sx},${sy})`}>
				<clipPath id={`${id}-body`}>
					<path d="M-72,-8 C-92,-72 -80,-152 -40,-192 C-14,-214 32,-214 54,-190 C84,-152 90,-72 74,-8 C44,8 -42,8 -72,-8 Z" />
				</clipPath>
				{/* tail and back foot */}
				<ellipse cx={-68} cy={-34} rx={36} ry={17} transform="rotate(-28 -68 -34)" fill={C.furDark} />
				<ellipse cx={-26} cy={-7} rx={27} ry={10} fill={C.furDark} />
				{/* body */}
				<path d="M-72,-8 C-92,-72 -80,-152 -40,-192 C-14,-214 32,-214 54,-190 C84,-152 90,-72 74,-8 C44,8 -42,8 -72,-8 Z" fill={C.fur} />
				<g clipPath={`url(#${id}-body)`}>
					<ellipse cx={-86} cy={-86} rx={46} ry={130} fill={C.furShade} opacity={0.75} />
					<ellipse cx={22} cy={-90} rx={42} ry={76} fill={C.furLight} />
				</g>
				<path d="M54,-190 C84,-152 90,-72 74,-8" stroke={rimColor} strokeWidth={3} fill="none" opacity={rimOpacity} />
				{tie && (
					<g>
						<path d="M20,-172 L36,-172 L43,-144 L28,-120 L13,-144Z" fill="#E0484F" />
						<path d="M16,-186 L40,-186 L36,-171 L20,-171Z" fill="#B93A40" />
					</g>
				)}
				<ellipse cx={32} cy={-6} rx={29} ry={11} fill={C.furDark} />
				{/* forelimbs held against the chest, paws together (sentinel pose) */}
				<path d="M4,-166 C10,-146 18,-130 30,-118" stroke={C.furShade} strokeWidth={21} fill="none" strokeLinecap="round" />
				<path d="M44,-168 C52,-148 54,-132 48,-117" stroke={C.furDark} strokeWidth={23} fill="none" strokeLinecap="round" />
				<ellipse cx={36} cy={-110} rx={17} ry={10} fill={C.furDark} />
				<path d="M26,-104 L25,-99 M34,-102 L33,-97 M42,-102 L42,-97" stroke={C.nose} strokeWidth={2} strokeLinecap="round" opacity={0.6} />

				{/* head */}
				<g transform={`rotate(${ht},18,-195)`}>
					<g transform={`translate(0,${earLift})`}>
						<circle cx={-14} cy={-270} r={16} fill={C.furDark} />
						<circle cx={-14} cy={-270} r={8.5} fill={C.earIn} />
						<circle cx={40} cy={-274} r={16} fill={C.furDark} />
						<circle cx={40} cy={-274} r={8.5} fill={C.earIn} />
					</g>
					<clipPath id={`${id}-head`}>
						<ellipse cx={18} cy={-232} rx={64} ry={54} />
					</clipPath>
					<ellipse cx={18} cy={-232} rx={64} ry={54} fill={C.fur} />
					<g clipPath={`url(#${id}-head)`}>
						<ellipse cx={-46} cy={-232} rx={42} ry={64} fill={C.furShade} opacity={0.7} />
						<ellipse cx={42} cy={-266} rx={28} ry={12} fill={C.furLight} opacity={0.35} />
					</g>
					<path d="M60,-270 C78,-256 84,-236 80,-214" stroke={rimColor} strokeWidth={3} fill="none" opacity={rimOpacity} />
					<g transform={`translate(${face},0)`}>
						<ellipse cx={4} cy={-206} rx={20} ry={13} fill={C.furLight} opacity={0.45} />
						<g transform={`translate(0,${jaw})`}>
							<ellipse cx={50} cy={-212} rx={34} ry={24} fill={C.furLight} />
							{mouth === 'open' && <ellipse cx={76} cy={-207} rx={7} ry={7} fill={C.nose} />}
							{mouth === 'o' && <ellipse cx={80} cy={-207} rx={5} ry={6} fill={C.nose} />}
							{mouth !== 'o' && <rect x={72} y={-212} width={9} height={8} rx={2} fill="#FFFFFF" opacity={mouth === 'open' ? 1 : 0.9} />}
							<path d="M76,-219 L76,-213 M66,-209 Q71,-206 76,-213 Q81,-206 86,-209" stroke={C.nose} strokeWidth={2.6} fill="none" strokeLinecap="round" />
							<g stroke="#FFFFFF" strokeWidth={1.6} opacity={0.4} strokeLinecap="round">
								<line x1={62} y1={-216} x2={104} y2={-226} />
								<line x1={62} y1={-211} x2={106} y2={-210} />
								<line x1={60} y1={-206} x2={100} y2={-194} />
							</g>
						</g>
						<path d="M67,-231 Q76,-237 85,-231 Q82,-222 76,-220 Q70,-222 67,-231Z" fill={C.nose} />
						{eye(4, -249, 10, 12.5, 7.4, 'far')}
						{eye(44, -246, 12.5, 13.5, 8.6, 'near')}
						<g transform={`translate(0,${brow})`} stroke={C.furDark} strokeWidth={4} fill="none" strokeLinecap="round">
							<path d={`M32,-${268 - alarm * 2} Q44,-${274 + alarm * 2} 56,-${268 - alarm * 2}`} />
							<path d={`M-6,-${270 - alarm * 2} Q4,-${275 + alarm * 2} 14,-${270 - alarm * 2}`} />
						</g>
					</g>
				</g>
				{flowerDrop !== null && flowerDrop <= 0 && flower}
				{sweat > 0 && (
					<path
						d="M-44,-286 C-52,-272 -56,-262 -50,-256 C-44,-251 -36,-256 -38,-264 C-39,-272 -44,-286 -44,-286Z"
						fill="#A9DBFF"
						opacity={sweat}
						transform={`translate(0,${(1 - sweat) * -10})`}
					/>
				)}
			</g>
			{flowerDrop !== null && flowerDrop > 0 && flower}
		</g>
	);
};

/** Side-view fox, facing right, origin at the feet. `pose`: 0 standing → 1 leaping. */
export const Fox: React.FC<{x: number; y: number; s?: number; facing?: 1 | -1; pose?: number; headTurn?: number; frame: number; hideHead?: boolean}> = ({
	x,
	y,
	s = 1,
	facing = 1,
	pose = 0,
	headTurn = 0,
	frame,
	hideHead = false,
}) => {
	const legSwing = pose * 38;
	const tailWave = Math.sin(frame * 0.2) * 4 * (1 - pose);
	const paw = '#2B1B14';
	const leg = (lx: number, ang: number, key: string) => (
		<g key={key} transform={`rotate(${ang},${lx},-72)`}>
			<rect x={lx - 8} y={-78} width={16} height={70} rx={8} fill={C.foxDark} />
			<rect x={lx - 8} y={-30} width={16} height={24} rx={8} fill={paw} />
		</g>
	);
	return (
		<g transform={`translate(${x},${y}) scale(${s * facing},${s})`}>
			<g transform={`rotate(${-pose * 8},0,-80)`}>
				{leg(-78, legSwing, 'bl1')}
				{leg(-52, legSwing * 0.8, 'bl2')}
				<path
					d="M-96,-92 C-150,-86 -205,-60 -236,-104 C-252,-138 -214,-164 -180,-140 C-158,-124 -126,-114 -96,-116 Z"
					fill={C.fox}
					transform={`rotate(${tailWave - pose * 12},-96,-104)`}
				/>
				<path
					d="M-236,-104 C-252,-138 -214,-164 -188,-146 C-206,-134 -222,-120 -236,-104Z"
					fill={C.foxLight}
					transform={`rotate(${tailWave - pose * 12},-96,-104)`}
				/>
				<path d="M-104,-76 C-116,-126 -40,-142 40,-136 C94,-132 116,-106 104,-74 C84,-48 -84,-48 -104,-76Z" fill={C.fox} />
				<path d="M-60,-128 C-10,-138 50,-136 80,-124 C40,-128 -10,-126 -60,-118Z" fill="#F08A52" opacity={0.7} />
				{leg(56, -legSwing, 'fl1')}
				{leg(82, -legSwing * 0.8, 'fl2')}
				<path d="M70,-84 C92,-90 110,-104 114,-126 C122,-94 106,-66 78,-60 Z" fill={C.foxLight} />
				<g transform={`translate(96,-128) rotate(${headTurn * 12},10,10)`} opacity={hideHead ? 0 : 1}>
					<path d="M8,-34 L16,-86 L42,-44Z" fill={C.fox} />
					<path d="M14,-44 L18,-74 L33,-47Z" fill={paw} />
					<path d="M38,-46 L54,-94 L68,-42Z" fill={C.fox} />
					<path d="M44,-50 L54,-82 L61,-48Z" fill={paw} />
					<path d="M-6,4 C2,-40 52,-58 86,-36 L128,-12 C122,4 84,16 48,14 C22,14 -2,14 -6,4Z" fill={C.fox} />
					<path d="M44,12 C74,14 108,6 128,-10 C104,22 62,28 44,12Z" fill={C.foxLight} />
					<circle cx={128} cy={-12} r={7} fill={paw} />
					<path d="M60,-30 Q70,-37 80,-30 Q70,-26 60,-30Z" fill={paw} />
				</g>
			</g>
		</g>
	);
};

/** Front-facing fox face, used when the fox looks at the camera. Origin at the face centre. */
export const FoxFace: React.FC<{x: number; y: number; s?: number; blink?: number; droop?: number}> = ({x, y, s = 1, blink = 0, droop = 0}) => {
	const paw = '#2B1B14';
	return (
		<g transform={`translate(${x},${y}) scale(${s})`}>
			<g transform={`rotate(${-droop * 30},-40,-70)`}>
				<path d="M-66,-50 L-84,-150 L-18,-86Z" fill={C.fox} />
				<path d="M-60,-66 L-72,-128 L-30,-88Z" fill={paw} />
			</g>
			<g transform={`rotate(${droop * 30},40,-70)`}>
				<path d="M66,-50 L84,-150 L18,-86Z" fill={C.fox} />
				<path d="M60,-66 L72,-128 L30,-88Z" fill={paw} />
			</g>
			<path d="M-82,-24 C-82,-80 -40,-100 0,-100 C40,-100 82,-80 82,-24 C72,22 30,62 0,70 C-30,62 -72,22 -82,-24Z" fill={C.fox} />
			<path d="M-82,-24 C-60,10 -30,30 0,70 C-34,62 -70,26 -82,-24Z" fill={C.foxLight} />
			<path d="M82,-24 C60,10 30,30 0,70 C34,62 70,26 82,-24Z" fill={C.foxLight} />
			<path d="M-18,40 C-10,30 10,30 18,40 C10,52 -10,52 -18,40Z" fill={paw} />
			<ellipse cx={-30} cy={-26} rx={10} ry={12 * (1 - blink)} fill={paw} />
			<ellipse cx={30} cy={-26} rx={10} ry={12 * (1 - blink)} fill={paw} />
			<circle cx={-27} cy={-30} r={3.2} fill="#FFFFFF" opacity={1 - blink} />
			<circle cx={33} cy={-30} r={3.2} fill="#FFFFFF" opacity={1 - blink} />
			<path d={`M-40,${-48 + droop * 6} L-18,${-44 - droop * 4}`} stroke={C.foxDark} strokeWidth={5} strokeLinecap="round" />
			<path d={`M40,${-48 + droop * 6} L18,${-44 - droop * 4}`} stroke={C.foxDark} strokeWidth={5} strokeLinecap="round" />
		</g>
	);
};

/** Small sitting-fox pictogram for thought bubbles and scale pans. */
export const FoxIcon: React.FC<{x: number; y: number; s?: number; ghost?: boolean; color?: string}> = ({x, y, s = 1, ghost = false, color = C.fox}) => {
	const fill = ghost ? 'none' : color;
	const stroke = ghost ? C.text : 'none';
	const sw = ghost ? 4 : 0;
	const dash = ghost ? '10 8' : undefined;
	return (
		<g transform={`translate(${x},${y}) scale(${s})`} fill={fill} stroke={stroke} strokeWidth={sw} strokeDasharray={dash} strokeLinejoin="round">
			<path d="M-10,0 C-60,6 -86,-20 -70,-44 C-60,-58 -44,-50 -36,-38 C-30,-28 -20,-22 -10,-22Z" />
			<path d="M-34,0 C-40,-40 -26,-78 2,-86 C28,-80 38,-40 30,0Z" />
			<path d="M-18,-76 C-20,-110 10,-126 30,-112 L52,-96 C40,-84 18,-78 -2,-78Z" />
			<path d="M-10,-104 L-6,-134 L8,-110Z" />
			<path d="M6,-112 L18,-138 L24,-110Z" />
			{!ghost && <path d="M-2,-60 C10,-66 24,-44 18,-6 L0,-6 C4,-30 2,-48 -2,-60Z" fill={C.foxLight} />}
			{!ghost && <circle cx={52} cy={-96} r={4.5} fill="#2B1B14" />}
		</g>
	);
};

/** A small round songbird. `hop` in [0,1] lifts it; `chirp` opens the beak. */
export const Bird: React.FC<{x: number; y: number; s?: number; facing?: 1 | -1; hop?: number; chirp?: number; blink?: number}> = ({
	x,
	y,
	s = 1,
	facing = 1,
	hop = 0,
	chirp = 0,
	blink = 0,
}) => (
	<g transform={`translate(${x},${y - hop * 26}) scale(${s * facing},${s})`}>
		<path d="M-24,-22 L-52,-34 L-48,-18 L-24,-12Z" fill="#9C5E2E" />
		<line x1={-4} y1={-2} x2={-8} y2={14} stroke="#E0A458" strokeWidth={3} strokeLinecap="round" />
		<line x1={6} y1={-2} x2={8} y2={14} stroke="#E0A458" strokeWidth={3} strokeLinecap="round" />
		<ellipse cx={0} cy={-20} rx={28} ry={21} fill="#C9823F" />
		<ellipse cx={8} cy={-13} rx={17} ry={12} fill="#F2C48A" />
		<ellipse cx={-6} cy={-24} rx={16} ry={10} transform="rotate(-18 -6 -24)" fill="#9C5E2E" />
		<circle cx={20} cy={-36} r={15} fill="#C9823F" />
		<path d={`M33,${-40 - chirp * 3} L48,-36 L33,-33Z`} fill="#F5B942" />
		<path d={`M33,-33 L46,${-32 + chirp * 5} L33,-30Z`} fill="#E09A2B" />
		<ellipse cx={25} cy={-39} rx={3.4} ry={3.4 * (1 - blink)} fill={C.eye} />
		<circle cx={26} cy={-40.5} r={1.1} fill="#FFFFFF" opacity={1 - blink} />
	</g>
);
