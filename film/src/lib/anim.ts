import {Easing, interpolate, spring, SpringConfig} from 'remotion';
import {noise2D} from '@remotion/noise';
import {FPS} from '../theme';

/** 0→1 spring that starts at `start` (frames). */
export const spr = (frame: number, start: number, config: Partial<SpringConfig> = {}, durationInFrames?: number) =>
	spring({frame: frame - start, fps: FPS, config: {damping: 14, stiffness: 120, mass: 0.9, ...config}, durationInFrames});

/** Soft spring without overshoot. */
export const soft = (frame: number, start: number, durationInFrames = 24) =>
	spring({frame: frame - start, fps: FPS, config: {damping: 200}, durationInFrames});

const inOut = Easing.bezier(0.45, 0, 0.2, 1);

/** Eased interpolation between two frames, clamped. */
export const ease = (
	frame: number,
	start: number,
	end: number,
	from = 0,
	to = 1,
	easing: (t: number) => number = inOut,
) =>
	interpolate(frame, [start, end], [from, to], {
		easing,
		extrapolateLeft: 'clamp',
		extrapolateRight: 'clamp',
	});

export const easeOut = Easing.bezier(0.16, 1, 0.3, 1);
export const easeIn = Easing.bezier(0.7, 0, 0.84, 0);

/** Fade in over `inF` frames at `start`, fade out over `outF` frames ending at `end`. */
export const fadeWindow = (frame: number, start: number, end: number, inF = 10, outF = 10) =>
	Math.min(ease(frame, start, start + inF), 1 - ease(frame, end - outF, end));

/** Smooth organic wobble in [-1, 1]. */
export const wobble = (seed: string, frame: number, speed = 0.02, offset = 0) => noise2D(seed, frame * speed, offset);

export const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
export const clamp01 = (t: number) => Math.max(0, Math.min(1, t));

/** Decaying oscillation after an impulse at `start` (e.g. a bush that was shaken). */
export const shake = (frame: number, start: number, freq = 0.9, decay = 0.09) => {
	const t = frame - start;
	if (t < 0) return 0;
	return Math.sin(t * freq) * Math.exp(-t * decay);
};

/** Periodic blink: returns eyelid closure 0..1. */
export const blinkAt = (frame: number, period = 110, phase = 0) => {
	const t = (frame + phase) % period;
	if (t < 0 || t > 6) return 0;
	return Math.sin((t / 6) * Math.PI);
};
