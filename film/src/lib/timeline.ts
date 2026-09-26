import raw from '../generated/timeline.json';

export type TimelineLine = {
	id: string;
	text: string;
	caption: string;
	file: string;
	start: number; // frame offset within the scene
	duration: number;
	seconds: number;
};

export type TimelineScene = {
	id: string;
	title: string;
	from: number;
	duration: number;
	lines: TimelineLine[];
};

export type Caption = {text: string; from: number; duration: number};

export type Timeline = {
	fps: number;
	voice: string;
	speed: number;
	totalFrames: number;
	scenes: TimelineScene[];
	captions: Caption[];
};

export const timeline = raw as Timeline;

export const getScene = (id: string): TimelineScene => {
	const s = timeline.scenes.find((x) => x.id === id);
	if (!s) throw new Error(`Unknown scene ${id}`);
	return s;
};

export type Cue = {start: number; end: number; dur: number};

/** Frame positions (relative to the scene) of every narration line in a scene. */
export const cues = (sceneId: string): Record<string, Cue> & {_end: number} => {
	const s = getScene(sceneId);
	const out: Record<string, Cue> = {};
	for (const l of s.lines) {
		out[l.id] = {start: l.start, end: l.start + l.duration, dur: l.duration};
	}
	return Object.assign(out, {_end: s.duration});
};
