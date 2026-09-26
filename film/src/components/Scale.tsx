import React from 'react';
import {Bird, FoxIcon} from './Characters';
import {Label} from './Diagram';
import {C, MONO} from '../theme';

export const SCALE = {x: 960, y: 250, arm: 330, drop: 160};

/**
 * A balance weighing "one cause" (left) against "two causes" (right).
 * `tilt` in degrees: negative lowers the left pan.
 */
export const BalanceScale: React.FC<{
	tilt: number;
	build?: number; // 0..1 assembly
	iconL?: number; // 0..1
	iconR?: number;
	labels?: number;
	opacity?: number;
	spread?: number; // 0..1 pans slide apart (hand-off to the next scene)
	values?: [string, string] | null; // odds shown under the pan labels
	valueOpacity?: number;
}> = ({tilt, build = 1, iconL = 1, iconR = 1, labels = 1, opacity = 1, spread = 0, values = null, valueOpacity = 1}) => {
	if (opacity <= 0.001) return null;
	const a = (tilt * Math.PI) / 180;
	const {x, y, arm, drop} = SCALE;
	const armNow = arm * (0.3 + 0.7 * build) + spread * 160;
	const lx = x - Math.cos(a) * armNow;
	const ly = y - Math.sin(a) * armNow;
	const rx = x + Math.cos(a) * armNow;
	const ry = y + Math.sin(a) * armNow;
	const pan = (px: number, py: number, key: string, icon: React.ReactNode, iconO: number, label: string, value?: string) => (
		<g key={key}>
			<line x1={px} y1={py} x2={px - 88} y2={py + drop} stroke={C.dim} strokeWidth={3} opacity={0.8 * build} />
			<line x1={px} y1={py} x2={px + 88} y2={py + drop} stroke={C.dim} strokeWidth={3} opacity={0.8 * build} />
			<g transform={`translate(${px},${py + drop})`} opacity={build}>
				<g opacity={iconO} transform={`scale(${0.5 + 0.5 * iconO})`}>
					{icon}
				</g>
				<path d="M-104,0 L104,0 Q80,34 0,36 Q-80,34 -104,0Z" fill="#D9DCF0" />
				<rect x={-104} y={-4} width={208} height={8} rx={4} fill="#F4F1EA" />
			</g>
			<Label x={px} y={py + drop + 84} text={label} size={36} opacity={labels * build} />
			{value && <Label x={px} y={py + drop + 128} text={value} size={34} weight={600} font={MONO} opacity={valueOpacity * build} />}
		</g>
	);
	return (
		<g opacity={opacity}>
			{/* column and base */}
			<g opacity={build}>
				<rect x={x - 9} y={y} width={18} height={250} rx={6} fill="#8F96C8" />
				<path d={`M${x - 90},${y + 268} L${x + 90},${y + 268} L${x + 60},${y + 240} L${x - 60},${y + 240}Z`} fill="#8F96C8" />
			</g>
			{pan(
				lx,
				ly,
				'L',
				<FoxIcon x={-14} y={-6} s={0.62} />,
				iconL,
				'one cause',
				values?.[0],
			)}
			{pan(
				rx,
				ry,
				'R',
				<g>
					<g transform="translate(-24,-26) scale(0.32)">
						<path d="M-120,0 C-70,-6 -20,-4 10,-18 C40,-30 44,-62 18,-66 C-6,-70 -12,-44 6,-36" stroke="#AEB9E8" strokeWidth={12} fill="none" strokeLinecap="round" />
						<path d="M-150,40 C-90,36 -30,40 30,32" stroke="#AEB9E8" strokeWidth={11} fill="none" strokeLinecap="round" />
					</g>
					<Bird x={22} y={-4} s={0.8} />
				</g>,
				iconR,
				'two causes',
				values?.[1],
			)}
			{/* beam */}
			<g opacity={build}>
				<line x1={lx} y1={ly} x2={rx} y2={ry} stroke="#D9DCF0" strokeWidth={12} strokeLinecap="round" />
				<circle cx={x} cy={y} r={18} fill="#F4F1EA" />
				<circle cx={x} cy={y} r={7} fill="#8F96C8" />
				<path d={`M${x - 12},${y - 16} L${x},${y - 44} L${x + 12},${y - 16}Z`} fill="#F4F1EA" />
			</g>
		</g>
	);
};
