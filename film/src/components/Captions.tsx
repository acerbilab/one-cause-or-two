import React from 'react';
import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {timeline} from '../lib/timeline';
import {C, FONT} from '../theme';

/** Burned-in captions. `offset` is the global frame at which the current composition starts. */
export const Captions: React.FC<{offset?: number}> = ({offset = 0}) => {
	const frame = useCurrentFrame() + offset;
	const cap = timeline.captions.find((c) => frame >= c.from && frame < c.from + c.duration + 6);
	if (!cap) return null;
	const local = frame - cap.from;
	const next = timeline.captions.find((c) => c.from > cap.from);
	const gapToNext = next ? next.from - (cap.from + cap.duration) : 99;
	const fadeOutStart = cap.duration + Math.min(6, Math.max(0, gapToNext - 1));
	const opacity = Math.min(
		interpolate(local, [0, 4], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
		interpolate(local, [fadeOutStart - 4, fadeOutStart], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
	);
	const lift = interpolate(local, [0, 6], [8, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	return (
		<AbsoluteFill style={{justifyContent: 'flex-end', alignItems: 'center', paddingBottom: 46, pointerEvents: 'none'}}>
			<div
				style={{
					opacity,
					transform: `translateY(${lift}px)`,
					maxWidth: 1560,
					padding: '10px 26px 13px',
					borderRadius: 18,
					background: 'rgba(7, 10, 28, 0.62)',
					color: C.text,
					fontFamily: FONT,
					fontWeight: 800,
					fontSize: 46,
					lineHeight: 1.18,
					textAlign: 'center',
					letterSpacing: 0.2,
					textShadow: '0 2px 8px rgba(0,0,0,0.5)',
				}}
			>
				{cap.text}
			</div>
		</AbsoluteFill>
	);
};
