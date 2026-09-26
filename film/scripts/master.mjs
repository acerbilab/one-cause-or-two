// Master the audio of a rendered film for social media: two-pass EBU R128 loudness
// normalisation to -16 LUFS integrated, -1.5 dBTP true peak. The video stream is copied.
//
//   node scripts/master.mjs out/film.mp4            (in place)
//   node scripts/master.mjs in.mp4 out.mp4

import {spawnSync} from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';

const [input, outputArg] = process.argv.slice(2);
if (!input) {
	console.error('usage: node scripts/master.mjs <input.mp4> [output.mp4]');
	process.exit(1);
}
const output = outputArg ?? input;

// Remotion ships its own ffmpeg in a platform-specific package
const remotionDir = path.resolve('node_modules/@remotion');
const pkg = fs.readdirSync(remotionDir).find((d) => d.startsWith('compositor-'));
const ffmpeg = path.join(remotionDir, pkg, process.platform === 'win32' ? 'ffmpeg.exe' : 'ffmpeg');

const TARGET = 'I=-16:TP=-1.5:LRA=11';

/** Loudness report of a file (ffmpeg prints the JSON to stderr). */
const measure = (file) => {
	const p = spawnSync(ffmpeg, ['-hide_banner', '-i', file, '-vn', '-af', `loudnorm=${TARGET}:print_format=json`, '-f', 'null', '-'], {encoding: 'utf8'});
	return JSON.parse(p.stderr.slice(p.stderr.lastIndexOf('{'), p.stderr.lastIndexOf('}') + 1));
};

const m = measure(input);
console.log(`measured: ${m.input_i} LUFS, ${m.input_tp} dBTP, LRA ${m.input_lra}`);

// Second pass with the measured values. If a purely linear gain would push the true peak
// over the target, loudnorm falls back to gentle dynamic processing.
const tmp = output.replace(/\.mp4$/, '.mastering.mp4');
const filter = `loudnorm=${TARGET}:measured_I=${m.input_i}:measured_TP=${m.input_tp}:measured_LRA=${m.input_lra}:measured_thresh=${m.input_thresh}:offset=${m.target_offset}:linear=true`;
const p = spawnSync(
	ffmpeg,
	['-hide_banner', '-y', '-i', input, '-map', '0:v', '-map', '0:a', '-c:v', 'copy', '-af', filter, '-ar', '48000', '-c:a', 'aac', '-b:a', '256k', '-movflags', '+faststart', tmp],
	{encoding: 'utf8'},
);
if (p.status !== 0) {
	console.error(p.stderr.slice(-2000));
	process.exit(1);
}
fs.renameSync(tmp, output);

const after = measure(output);
console.log(`mastered: ${after.input_i} LUFS, ${after.input_tp} dBTP  ->  ${output}`);
