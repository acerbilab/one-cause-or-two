import React from 'react';
import {AbsoluteFill, Html5Audio, interpolate, Sequence, staticFile} from 'remotion';
import {Captions} from './components/Captions';
import {hasStatic} from './components/SceneShell';
import {getScene, timeline} from './lib/timeline';
import {SCENES} from './scenes';
import {C} from './theme';

export type FilmProps = {captions?: boolean; music?: boolean};

// Narration intervals in global frames, used to duck the music under the voice.
const VOICE = timeline.scenes.flatMap((s) => s.lines.map((l) => [s.from + l.start, s.from + l.start + l.duration] as const));

const duck = (frame: number) => {
	let d = 0;
	for (const [a, b] of VOICE) {
		const near = Math.min(
			interpolate(frame, [a - 8, a], [0, 1], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
			interpolate(frame, [b, b + 14], [1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'}),
		);
		d = Math.max(d, near);
	}
	return d;
};

/** Music: public/music.mp3 if present, otherwise the generated score, otherwise silence. */
const Music: React.FC = () => {
	const src = hasStatic('music.mp3') ? 'music.mp3' : hasStatic('sfx/score.wav') ? 'sfx/score.wav' : null;
	if (!src) return null;
	const end = timeline.totalFrames;
	return (
		<Html5Audio
			src={staticFile(src)}
			volume={(f) =>
				(src === 'music.mp3' ? 0.5 : 0.8) *
				(1 - 0.45 * duck(f)) *
				interpolate(f, [0, 20, end - 45, end], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'})
			}
		/>
	);
};

/** Night crickets while we are in the meadow, and dawn air at the end. */
const Ambience: React.FC = () => {
	const cat = getScene('catch');
	const line = (sceneId: string, id: string) => {
		const s = getScene(sceneId);
		const l = s.lines.find((x) => x.id === id)!;
		return {start: s.from + l.start, end: s.from + l.start + l.duration};
	};
	const tvStart = line('catch', 'k1').start + 20;
	const backInMeadow = line('catch', 'k3').start - 12;
	const meadowEnd = cat.from + cat.duration + 20;
	const dawnFrom = line('end', 'r1').start - 20;
	const dawnTo = timeline.totalFrames - 100;
	const fadeIO = (f: number, a: number, b: number, fin = 20, fout = 24) =>
		interpolate(f, [a, a + fin, b - fout, b], [0, 1, 1, 0], {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'});
	if (!hasStatic('sfx/crickets.wav')) return null;
	return (
		<>
			<Sequence from={0} durationInFrames={tvStart} name="crickets">
				<Html5Audio src={staticFile('sfx/crickets.wav')} volume={(f) => 0.55 * fadeIO(f, -20, tvStart)} />
			</Sequence>
			<Sequence from={backInMeadow} durationInFrames={meadowEnd - backInMeadow} name="crickets (back in the meadow)">
				<Html5Audio src={staticFile('sfx/crickets.wav')} trimBefore={600} volume={(f) => 0.55 * fadeIO(f, 0, meadowEnd - backInMeadow)} />
			</Sequence>
			{hasStatic('sfx/dawn.wav') && (
				<Sequence from={dawnFrom} durationInFrames={dawnTo - dawnFrom} name="dawn">
					<Html5Audio src={staticFile('sfx/dawn.wav')} volume={(f) => 0.6 * fadeIO(f, 0, dawnTo - dawnFrom, 40, 40)} />
				</Sequence>
			)}
		</>
	);
};

export const Film: React.FC<FilmProps> = ({captions = true, music = true}) => (
	<AbsoluteFill style={{background: C.night}}>
		{SCENES.map(({id, Component}) => {
			const s = getScene(id);
			return (
				<Sequence key={id} from={s.from} durationInFrames={s.duration} name={s.title}>
					<Component />
				</Sequence>
			);
		})}
		{music && <Music />}
		<Ambience />
		{captions && <Captions />}
	</AbsoluteFill>
);
