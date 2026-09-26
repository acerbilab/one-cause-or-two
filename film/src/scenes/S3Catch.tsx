import React from 'react';
import {Easing, useCurrentFrame} from 'remotion';
import {POV, PovMeadow} from '../components/Pov';
import {SoundArcs, WindSwirl} from '../components/Props';
import {Bird, FoxIcon} from '../components/Characters';
import {fieldX, GroundLine, Hill, Label} from '../components/Diagram';
import {LivingRoom, NewsAnchor, Speaker, Static, TV_RECT, TVBezel} from '../components/Room';
import {SceneProps, SceneShell, Sfx} from '../components/SceneShell';
import {cues} from '../lib/timeline';
import {ease, lerp, spr} from '../lib/anim';
import {gauss} from '../lib/math';
import {C, FONT, MONO} from '../theme';
import {CUES, FUSED, HILL_SCALE} from './S2Blur';

const T = cues('catch');

// Where the phantom fox stands (above the merged hill); the next scene picks it up from here
const F_PEAK_Y = POV.base - gauss(0, 0, FUSED.sigma) * HILL_SCALE;
export const PHANTOM = {x: fieldX(FUSED.mu) - 6, y: F_PEAK_Y - 24, qx: fieldX(FUSED.mu) + 100, qy: F_PEAK_Y - 118};

// Timing shared with the next scene (the phantom fox and the bird fly to the scale)
export const catchBeats = () => {
	const {k3, k4} = T;
	return {windAt: k3.start + 6, birdAt: k3.start + Math.round(k3.dur * 0.56), phantomAt: k4.start + 4};
};

export const S3Catch: React.FC<SceneProps> = ({standalone}) => {
	const f = useCurrentFrame();
	const {k1, k2, k3, k4} = T;
	const flickerX = fieldX(CUES.uV);
	const bushX = fieldX(CUES.uA);

	// k1: pull back — the meadow was on a TV; k2: ventriloquism; then back into the meadow
	const easeTV = Easing.bezier(0.6, 0, 0.2, 1);
	const tv = ease(f, k1.start - 2, k1.start + 30, 0, 1, easeTV) - ease(f, k2.end + 16, k3.start + 6, 0, 1, easeTV);
	const scr = {
		x: lerp(0, TV_RECT.x, tv),
		y: lerp(0, TV_RECT.y, tv),
		w: lerp(1920, TV_RECT.w, tv),
		h: lerp(1080, TV_RECT.h, tv),
	};
	const k = scr.w / 1920;
	const flipIn = k1.end + 4;
	const flipOut = k2.end + 10;
	const onNews = f >= flipIn + 5 && f < flipOut + 3;
	const staticO = (f >= flipIn && f < flipIn + 6) || (f >= flipOut && f < flipOut + 5) ? 1 : 0;
	const talking = f > flipIn + 10 && f < k2.end + 6;
	const greeting = ease(f, flipIn + 10, flipIn + 16) * (1 - ease(f, k2.start + 20, k2.start + 30));
	const spk = ease(f, k1.start + 10, k1.start + 30);
	const heardAt = k2.start + Math.round(k2.dur * 0.12);
	const fromAt = k2.start + Math.round(k2.dur * 0.4);
	const lblHeard = ease(f, heardAt, heardAt + 10);
	const lblFrom = ease(f, fromAt, fromAt + 10);
	const room = 1 - ease(f, k2.end + 14, k2.end + 24);
	const speakerT = f - (flipIn + 8);
	// anchor's mouth, from channel space into the TV rectangle
	const mouth = {x: TV_RECT.x + (900 + 88 * 2.35) * (TV_RECT.w / 1920), y: TV_RECT.y + (1010 - 207 * 2.35) * (TV_RECT.w / 1920)};

	// k3: the flicker was the wind, the rustle a bird
	const {windAt, birdAt, phantomAt} = catchBeats();
	const windLbl = ease(f, windAt + 10, windAt + 20);
	const birdPop = spr(f, birdAt, {damping: 10, stiffness: 140});
	const birdLbl = ease(f, birdAt + 10, birdAt + 20);
	const hop = f > birdAt + 18 && f < birdAt + 44 ? Math.abs(Math.sin((f - birdAt - 18) * 0.25)) : 0;
	const chirp = f > birdAt + 8 && f < birdAt + 50 && (f - birdAt - 8) % 14 < 6 ? 1 : 0;
	const vBack = ease(f, windAt, windAt + 14);
	const aBack = ease(f, birdAt, birdAt + 14);
	// k4: merging them puts a fox where there is none
	const phantom = spr(f, phantomAt, {damping: 12});
	const pulse = 1 + 0.3 * Math.max(0, Math.sin((f - k4.start) * 0.2)) * ease(f, k4.start, k4.start + 8);

	const fPeakY = F_PEAK_Y;
	const hush = 1 - 0.45 * phantom; // the other curves step back when the phantom appears

	const meadow = (
		<g>
			<PovMeadow
				frame={f}
				dim={lerp(0.85, 0.55, Math.max(vBack, aBack) * (1 - ease(f, k4.start, k4.start + 12)))}
				gusts={[{x: flickerX - 260, start: windAt, strength: 0.5, width: 120, speed: 9, life: 60}]}
				behindBush={<Bird x={bushX + 20} y={POV.bushY - 150 + (1 - birdPop) * 80} s={1.25} facing={-1} hop={hop} chirp={chirp} />}
			>
				<WindSwirl x={flickerX - 150} y={POV.flickerY - 30} t={f - windAt} life={70} s={1.1} />
			</PovMeadow>
			<SoundArcs x={bushX - 10} y={POV.bushY - 210} t={chirp ? f - birdAt - 8 : -1} count={2} dir={Math.PI * 1.15} spread={1.1} maxR={90} life={20} period={6} width={4} />
			<GroundLine y={POV.base} />
			<Hill id="c-hv" f={(u) => gauss(u, CUES.uV, CUES.sV)} color={C.sight} baseY={POV.base} yScale={HILL_SCALE} opacity={(0.38 + 0.4 * vBack) * hush} />
			<Hill id="c-ha" f={(u) => gauss(u, CUES.uA, CUES.sA)} color={C.sound} baseY={POV.base} yScale={HILL_SCALE} opacity={(0.38 + 0.4 * aBack) * hush} />
			<Hill id="c-hf" f={(u) => gauss(u, FUSED.mu, FUSED.sigma)} color={C.belief} baseY={POV.base} yScale={HILL_SCALE} fill={0.5} stroke={5 * pulse} />
			{/* labels carried over from the previous scene, fading out */}
			<Label x={fieldX(FUSED.mu)} y={fPeakY - 34} text="sharper than either" color={C.belief} size={40} opacity={1 - ease(f, 0, 10)} />
			<Label x={140} y={900} text="Ernst & Banks 2002 · Alais & Burr 2004" size={26} weight={400} font={MONO} anchor="start" color={C.dim} opacity={(1 - ease(f, 0, 12)) * 0.8} />
			<Label x={flickerX - 150} y={POV.base - 170} text="sight" color={C.sight} size={40} opacity={0.38 * (1 - ease(f, 0, 10))} />
			<Label x={bushX + 190} y={POV.base - 105} text="sound" color={C.sound} size={40} opacity={0.38 * (1 - ease(f, 0, 10))} />
			<Label x={flickerX - 170} y={POV.flickerY - 110} text="wind" size={40} color={C.text} opacity={windLbl} pop={spr(f, windAt + 10)} />
			<Label x={bushX + 150} y={POV.bushY - 190} text="bird" size={40} color={C.text} opacity={birdLbl} pop={spr(f, birdAt + 10)} />
			{phantom > 0.001 && (
				<g>
					<FoxIcon x={PHANTOM.x} y={PHANTOM.y} s={0.95 * phantom} ghost />
					<Label x={PHANTOM.qx} y={PHANTOM.qy} text="?" size={96} color={C.belief} pop={phantom} />
				</g>
			)}
		</g>
	);

	return (
		<SceneShell sceneId="catch" standalone={standalone}>
			<g opacity={Math.max(0, tv) * room}>
				<LivingRoom frame={f} lamp={1} />
				<g opacity={spk}>
					<Speaker x={330} y={610} cone={talking ? Math.max(0, Math.sin(f * 1.25)) : 0} />
					<Speaker x={1590} y={610} cone={talking ? Math.max(0, Math.sin(f * 1.25)) : 0} />
				</g>
			</g>
			<defs>
				<clipPath id="screen">
					<rect x={scr.x} y={scr.y} width={scr.w} height={scr.h} />
				</clipPath>
			</defs>
			<g clipPath="url(#screen)">
				<g transform={`translate(${scr.x},${scr.y}) scale(${k})`}>
					{onNews ? <NewsAnchor frame={f} talking={talking} /> : meadow}
					<Static frame={f} opacity={staticO} />
				</g>
			</g>
			<TVBezel r={scr} opacity={Math.max(0, tv) * room} />
			{/* the anchor's greeting, captioned for muted viewers */}
			{greeting > 0 && (
				<g opacity={greeting} transform={`translate(${mouth.x + 60},${mouth.y - 120})`}>
					<rect x={0} y={-50} width={270} height={74} rx={24} fill="#F4F1EA" />
					<path d="M20,20 L-6,52 L46,22Z" fill="#F4F1EA" />
					<text x={135} y={0} textAnchor="middle" fontFamily={FONT} fontWeight={800} fontSize={36} fill="#16183A">
						Good evening!
					</text>
				</g>
			)}
			{talking && (
				<g opacity={room}>
					<SoundArcs x={345} y={650} t={speakerT % 36} count={3} dir={0} spread={1.3} maxR={150} life={34} period={9} width={7} />
					<SoundArcs x={1575} y={650} t={speakerT % 36} count={3} dir={Math.PI} spread={1.3} maxR={150} life={34} period={9} width={7} />
				</g>
			)}
			{f > fromAt && f < k2.end + 14 && (
				<g opacity={room}>
					{Array.from({length: 12}, (_, i) => {
						const side = i % 2 === 0 ? -1 : 1;
						const t = (f - fromAt - Math.floor(i / 2) * 7) / 24;
						if (t <= 0 || t >= 1) return null;
						const sx = side < 0 ? 380 : 1540;
						const sy = 650;
						const cx = (sx + mouth.x) / 2;
						const cy = 330;
						const x = (1 - t) ** 2 * sx + 2 * (1 - t) * t * cx + t * t * mouth.x;
						const y = (1 - t) ** 2 * sy + 2 * (1 - t) * t * cy + t * t * mouth.y;
						return (
							<g key={i} opacity={Math.min(1, t * 4) * (1 - t * 0.3)}>
								<circle cx={x} cy={y} r={14} fill={C.sound} opacity={0.25} />
								<circle cx={x} cy={y} r={7} fill={C.sound} />
							</g>
						);
					})}
				</g>
			)}
			{lblHeard > 0 && (
				<g opacity={lblHeard * room}>
					<circle cx={mouth.x} cy={mouth.y} r={26 + 4 * Math.sin(f * 0.3)} fill="none" stroke={C.belief} strokeWidth={4} />
					<Label x={mouth.x + 170} y={mouth.y + 70} text="heard here" size={36} color={C.belief} to={{x: mouth.x + 24, y: mouth.y + 12}} pop={spr(f, heardAt)} />
				</g>
			)}
			<Label x={360} y={418} text="sound comes from here" size={36} color={C.sound} opacity={lblFrom * room} pop={spr(f, fromAt)} />
			<Label x={1590} y={420} text="and here" size={36} color={C.sound} opacity={lblFrom * room} pop={spr(f, fromAt + 4)} />

			<Sfx src="sfx/whoosh.wav" at={k1.start - 2} volume={0.35} />
			<Sfx src="sfx/static.wav" at={flipIn} volume={0.35} />
			<Sfx src="sfx/tv_evening.wav" at={flipIn + 8} volume={0.8} />
			<Sfx src="sfx/static.wav" at={flipOut} volume={0.3} />
			<Sfx src="sfx/whoosh.wav" at={k2.end + 16} volume={0.35} />
			<Sfx src="sfx/wind.wav" at={windAt - 4} volume={0.55} />
			<Sfx src="sfx/chirp_R.wav" at={birdAt + 8} volume={0.7} />
		</SceneShell>
	);
};
