import React from 'react';
import {Easing, random, useCurrentFrame} from 'remotion';
import {Cursor, degX, Flash, HiddenSpeakers, LabRoom, MID_Y, SamePrompt, Volunteer} from '../components/Lab';
import {SoundArcs} from '../components/Props';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, lerp, spr} from '../lib/anim';
import {C, FONT, MONO} from '../theme';

const T = cues('lab');

// 5 × 3 grid of volunteers for the montage
const COLS = 5;
const ROWS = 3;
const TILE = {w: 320, h: 180, gap: 22};
const GRID_X0 = (1920 - (COLS * TILE.w + (COLS - 1) * TILE.gap)) / 2;
const GRID_Y0 = 215;
const tilePos = (i: number) => ({
	x: GRID_X0 + (i % COLS) * (TILE.w + TILE.gap),
	y: GRID_Y0 + Math.floor(i / COLS) * (TILE.h + TILE.gap),
});
const CENTER_TILE = 7;

const MiniLab: React.FC<{i: number; f: number; t0: number}> = ({i, f, t0}) => {
	const {x, y} = tilePos(i);
	const period = 16 + Math.floor(random(`p${i}`) * 10);
	const k = Math.floor((f - t0 + i * 5) / period);
	const phase = ((f - t0 + i * 5) % period) / period;
	const isFlash = random(`kind${i}-${k}`) > 0.45;
	const px = x + 40 + random(`pos${i}-${k}`) * (TILE.w - 80);
	return (
		<g>
			<rect x={x} y={y} width={TILE.w} height={TILE.h} rx={12} fill="#0B0D24" stroke="#262A5A" strokeWidth={2} />
			<rect x={x + 20} y={y + 16} width={TILE.w - 40} height={96} fill="#050510" />
			<ellipse cx={x + TILE.w / 2} cy={y + TILE.h - 22} rx={26} ry={30} fill="#05060F" />
			<path d={`M${x + TILE.w / 2 - 70},${y + TILE.h} C${x + TILE.w / 2 - 60},${y + TILE.h - 26} ${x + TILE.w / 2 + 60},${y + TILE.h - 26} ${x + TILE.w / 2 + 70},${y + TILE.h}Z`} fill="#05060F" />
			{f >= t0 && isFlash && phase < 0.35 && <circle cx={px} cy={y + 64} r={10 + random(`sz${i}-${k}`) * 18} fill={C.sight} opacity={0.9 * (1 - phase / 0.35)} />}
			{f >= t0 && !isFlash && phase < 0.5 && (
				<SoundArcs x={px} y={y + 90} t={phase * 30} count={2} dir={-Math.PI / 2} spread={1.6} maxR={30} life={15} period={5} width={3} />
			)}
		</g>
	);
};

export const S6Lab: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {e1, e2, e3, e4} = T;

	const lights = ease(f, 0, 24);
	const swap = ease(f, e1.start + Math.round(e1.dur * 0.4), e1.start + Math.round(e1.dur * 0.4) + 30, 0, 1, Easing.bezier(0.4, 0, 0.3, 1));

	// the stimuli: a flash alone, a beep alone, then a flash and a beep together (the trial
	// the questions are about), whose positions stay marked until the answer
	const flash1 = e2.start + 2;
	const beep1 = e2.start + 24;
	const both = e2.end + 4;
	const answered = e3.start + Math.round(e3.dur * 0.5) + 22;
	const marks = ease(f, both + 6, both + 14) * (1 - ease(f, answered + 12, answered + 22));
	const cursorOn = ease(f, e3.start - 8, e3.start);
	const cursorX = lerp(degX(-3), degX(6), ease(f, e3.start + 2, e3.start + 20, 0, 1, Easing.bezier(0.3, 0, 0.1, 1)));
	const click = f >= e3.start + 22 ? Math.min(1, (f - e3.start - 22) / 12) : 0;
	const prompt = spr(f, e3.start + Math.round(e3.dur * 0.5), {damping: 14}) * (1 - ease(f, e4.start - 4, e4.start + 6));
	const choice = f > e3.start + Math.round(e3.dur * 0.5) + 22 ? 1 : 0;

	// montage: the room shrinks into one of fifteen tiles
	const grid = ease(f, e4.start - 2, e4.start + 26, 0, 1, Easing.bezier(0.6, 0, 0.2, 1));
	const c = tilePos(CENTER_TILE);
	const k = lerp(1, TILE.w / 1920, grid);
	const tx = lerp(0, c.x, grid);
	const ty = lerp(0, c.y, grid); // tiles are 16:9, like the frame
	const counter = Math.round(44600 * ease(f, e4.start + 24, e4.end + 6, 0, 1, Easing.out(Easing.cubic)));
	const volunteers = ease(f, e4.start + 6, e4.start + 18);
	const answers = ease(f, e4.start + Math.round(e4.dur * 0.45), e4.start + Math.round(e4.dur * 0.45) + 10);
	const stream = ease(f, e4.end - 10, T._end - 6);
	const outro = 1 - ease(f, T._end - 16, T._end - 1);

	return (
		<SceneShell sceneId="lab" standalone={standalone}>
			<rect x={0} y={0} width={1920} height={1080} fill="#05081A" />
			{/* other volunteers */}
			<g opacity={grid * outro}>
				{Array.from({length: COLS * ROWS}, (_, i) => (i === CENTER_TILE ? null : <MiniLab key={i} i={i} f={f} t0={e4.start + 10} />))}
			</g>
			{/* the lab, which becomes the centre tile */}
			<g transform={`translate(${tx},${ty}) scale(${k})`} opacity={lights * outro}>
				<defs>
					<clipPath id="labclip">
						<rect x={0} y={0} width={1920} height={1080} />
					</clipPath>
				</defs>
				<g clipPath="url(#labclip)">
					<LabRoom glow={1} />
					<HiddenSpeakers
						reveal={ease(f, beep1 - 2, beep1 + 6) * (1 - ease(f, answered, answered + 12))}
						lit={f < both ? -5 : 10}
						litT={f < both ? ease(f, beep1, beep1 + 3) * (1 - ease(f, beep1 + 14, beep1 + 24)) : ease(f, both, both + 3) * (1 - ease(f, both + 14, both + 24))}
					/>
					<Flash x={degX(-9)} t={(f - flash1) / 10} size={70} id="fl1" />
					<SoundArcs x={degX(-5)} y={MID_Y + 110} t={f - beep1} count={3} dir={-Math.PI / 2} spread={2.2} maxR={130} life={24} period={5} width={6} />
					<Flash x={degX(6)} t={(f - both) / 10} size={150} id="fl2" />
					<SoundArcs x={degX(10)} y={MID_Y + 110} t={f - both} count={3} dir={-Math.PI / 2} spread={2.2} maxR={130} life={24} period={5} width={6} />
					{marks > 0 && (
						<g opacity={marks}>
							<circle cx={degX(6)} cy={MID_Y} r={36} fill="none" stroke={C.sight} strokeWidth={5} strokeDasharray="10 8" />
							<circle cx={degX(10)} cy={MID_Y + 110} r={48} fill="none" stroke={C.sound} strokeWidth={5} strokeDasharray="10 8" />
						</g>
					)}
					<Cursor x={cursorX} opacity={cursorOn * (1 - ease(f, e3.start + Math.round(e3.dur * 0.45), e3.start + Math.round(e3.dur * 0.45) + 8))} click={click} />
					<SamePrompt pop={prompt} choice={choice} />
					<Volunteer swap={swap} />
				</g>
				<rect x={0} y={0} width={1920} height={1080} fill="none" stroke="#262A5A" strokeWidth={2 / Math.max(k, 0.01)} opacity={grid} rx={12 / Math.max(k, 0.01)} />
			</g>

			{/* tally */}
			<g opacity={volunteers * (1 - stream * 0.6) * outro}>
				<text x={GRID_X0} y={150} fontFamily={FONT} fontWeight={900} fontSize={60} fill={C.text}>
					15 volunteers
				</text>
			</g>
			<g opacity={answers * (1 - stream * 0.6) * outro}>
				<text x={1920 - GRID_X0} y={150} textAnchor="end" fontFamily={MONO} fontWeight={600} fontSize={56} fill={C.belief}>
					{counter.toLocaleString('en-US')} answers
				</text>
			</g>
			{/* answers stream down as dots */}
			{stream > 0 &&
				Array.from({length: 90}, (_, i) => {
					const tile = tilePos(i % 15);
					const d = Math.max(0, stream * 1.6 - random(`sd${i}`) * 0.6);
					const x0 = tile.x + random(`sx${i}`) * TILE.w;
					const y0 = tile.y + TILE.h;
					const x = lerp(x0, 960 + (random(`tx${i}`) - 0.5) * 900, Math.min(1, d));
					const y = lerp(y0, 900, Math.min(1, d) ** 2);
					return <circle key={i} cx={x} cy={y} r={6} fill={i % 2 ? C.sight : C.sound} opacity={Math.min(1, d * 3)} />;
				})}

			<Sfx src="sfx/beep_R.wav" at={beep1} volume={0.6} />
			<Sfx src="sfx/beep_R.wav" at={both} volume={0.6} />
			<Sfx src="sfx/click.wav" at={e3.start + 22} volume={0.6} />
			<Sfx src="sfx/click.wav" at={e3.start + Math.round(e3.dur * 0.5) + 22} volume={0.6} />
			<Sfx src="sfx/whoosh.wav" at={e4.start - 2} volume={0.35} />
			<Sfx src="sfx/ticker.wav" at={e4.start + 24} volume={0.3} />
			<Sfx src="sfx/beeps_many.wav" at={e4.start + 10} volume={0.25} />
		</SceneShell>
	);
};
