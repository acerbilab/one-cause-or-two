import React from 'react';
import {Composition} from 'remotion';
import {Film} from './Film';
import {getScene, timeline} from './lib/timeline';
import {SCENES} from './scenes';
import {FPS, H, W} from './theme';

export const RemotionRoot: React.FC = () => (
	<>
		<Composition
			id="Film"
			component={Film}
			durationInFrames={timeline.totalFrames}
			fps={FPS}
			width={W}
			height={H}
			defaultProps={{captions: true, music: true}}
		/>
		{SCENES.map(({id, key, Component}) => (
			<Composition
				key={id}
				id={`${key}-${id}`}
				component={Component}
				durationInFrames={getScene(id).duration}
				fps={FPS}
				width={W}
				height={H}
				defaultProps={{standalone: true}}
			/>
		))}
	</>
);
