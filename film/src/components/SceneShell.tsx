import React from 'react';
import {AbsoluteFill, getStaticFiles, Html5Audio, Sequence, staticFile} from 'remotion';
import {getScene} from '../lib/timeline';
import {C, H, W} from '../theme';
import {Captions} from './Captions';

const STATIC = new Set(getStaticFiles().map((f) => f.name));
export const hasStatic = (name: string) => STATIC.has(name);

/** Narration clips for one scene, placed at their timeline positions. */
export const Narration: React.FC<{sceneId: string}> = ({sceneId}) => {
	const scene = getScene(sceneId);
	return (
		<>
			{scene.lines.map((l) =>
				hasStatic(l.file) ? (
					<Sequence key={l.id} from={l.start} durationInFrames={l.duration + 3} name={`voice ${l.id}`} layout="none">
						<Html5Audio src={staticFile(l.file)} />
					</Sequence>
				) : null,
			)}
		</>
	);
};

/** A sound effect at frame `at` (relative to the enclosing sequence). Silently skipped if the file is missing. */
export const Sfx: React.FC<{src: string; at: number; volume?: number; duration?: number; name?: string}> = ({
	src,
	at,
	volume = 1,
	duration = 150,
	name,
}) => {
	if (!hasStatic(src)) return null;
	return (
		<Sequence from={Math.round(at)} durationInFrames={duration} name={name ?? src} layout="none">
			<Html5Audio src={staticFile(src)} volume={volume} />
		</Sequence>
	);
};

export type SceneProps = {standalone?: boolean};

/** Full-frame SVG canvas plus the scene's narration; captions only when rendered on its own. */
export const SceneShell: React.FC<{
	sceneId: string;
	standalone?: boolean;
	children: React.ReactNode;
	overlay?: React.ReactNode;
	style?: React.CSSProperties;
	background?: string;
}> = ({sceneId, standalone, children, overlay, style, background = C.night}) => {
	const scene = getScene(sceneId);
	return (
		<AbsoluteFill style={{background}}>
			<AbsoluteFill style={style}>
				<svg viewBox={`0 0 ${W} ${H}`} width={W} height={H} style={{position: 'absolute', inset: 0}}>
					{children}
				</svg>
				{overlay}
			</AbsoluteFill>
			<Narration sceneId={sceneId} />
			{standalone && <Captions offset={scene.from} />}
		</AbsoluteFill>
	);
};
