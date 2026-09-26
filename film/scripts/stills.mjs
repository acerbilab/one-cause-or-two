// Render stills for review from one bundle.
//
//   node scripts/stills.mjs <compositionId> <frame>... [--full] [--clean]
//
// A frame can be a number, seconds ("12.5s"), or a narration line id with an
// optional offset ("c3", "c3+10", "b5-4") for scene compositions like "S1-cold".
// Stills go to out/stills/ at half resolution unless --full is given. --clean renders the
// Film composition without captions (for poster frames).

import {bundle} from '@remotion/bundler';
import {renderStill, selectComposition} from '@remotion/renderer';
import fs from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const full = args.includes('--full');
const clean = args.includes('--clean');
const [compId, ...frameArgs] = args.filter((a) => !a.startsWith('--'));
if (!compId || frameArgs.length === 0) {
	console.error('usage: node scripts/stills.mjs <compositionId> <frame>... [--full] [--clean]');
	process.exit(1);
}

const timeline = JSON.parse(fs.readFileSync('src/generated/timeline.json', 'utf8'));
const sceneId = compId.includes('-') ? compId.slice(compId.indexOf('-') + 1) : null;
const scene = timeline.scenes.find((s) => s.id === sceneId);

const toFrame = (a) => {
	if (/^\d+$/.test(a)) return Number(a);
	if (/^[\d.]+s$/.test(a)) return Math.round(parseFloat(a) * timeline.fps);
	const m = a.match(/^([a-z]\d+|end)([+-]\d+)?$/);
	if (m && scene) {
		const base = m[1] === 'end' ? scene.duration - 1 : scene.lines.find((l) => l.id === m[1])?.start;
		if (base === undefined) throw new Error(`no line ${m[1]} in scene ${sceneId}`);
		return Math.max(0, Math.min(scene.duration - 1, base + Number(m[2] ?? 0)));
	}
	throw new Error(`bad frame spec ${a}`);
};

const t0 = Date.now();
const serveUrl = await bundle({entryPoint: path.resolve('src/index.ts')});
const inputProps = clean ? {captions: false} : {};
const composition = await selectComposition({serveUrl, id: compId, inputProps});
fs.mkdirSync('out/stills', {recursive: true});
for (const a of frameArgs) {
	const frame = toFrame(a);
	const output = `out/stills/${compId}-${a.replace(/[+]/g, 'p')}${clean ? '-clean' : ''}.png`;
	await renderStill({serveUrl, composition, frame, output, inputProps, imageFormat: 'png', scale: full ? 1 : 0.5});
	console.log(`${output} (frame ${frame})`);
}
console.log(`done in ${((Date.now() - t0) / 1000).toFixed(1)}s`);
