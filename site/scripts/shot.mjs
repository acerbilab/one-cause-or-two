// Screenshot a page with headless Chrome and print its console messages and exceptions.
//
//   node site/scripts/shot.mjs <url> <out.png> [width] [--full] [--height=900] [--eval=file.js] [--wait=2500]
//
// --full sets the viewport to the page's full height, so everything is "in view" (scroll-
// triggered animations run); --eval runs a script in the page after load and prints what it
// returns (it may be an async IIFE). Widths under 600 emulate a phone (touch, mobile).
// Uses the headless Chrome that Remotion downloads into film/node_modules on the first render
// or still, and Node's built-in WebSocket (Node 22 or later).

import {spawn} from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

const here = path.dirname(fileURLToPath(import.meta.url));
const CHROME = path.resolve(
	here,
	'../../film/node_modules/.remotion/chrome-headless-shell/win64/chrome-headless-shell-win64/chrome-headless-shell.exe',
);
const args = process.argv.slice(2);
const [url, out, widthArg] = args.filter((a) => !a.startsWith('--'));
if (!url || !out) {
	console.error('usage: node site/scripts/shot.mjs <url> <out.png> [width] [--full] [--height=900] [--eval=file.js] [--wait=2500]');
	process.exit(1);
}
if (!fs.existsSync(CHROME)) {
	console.error(`no headless Chrome at ${CHROME}; render a still in film/ first (npm run stills -- ...)`);
	process.exit(1);
}
const opt = (k, d) => (args.find((a) => a.startsWith(`--${k}=`)) || `=${d}`).split('=').slice(1).join('=');
const full = args.includes('--full');
const width = Number(widthArg || 1280);
const height = Number(opt('height', 900));
const wait = Number(opt('wait', 2500));
const evalFile = opt('eval', '');
const port = 9333 + Math.floor(Math.random() * 500);
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'shot-'));
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const chrome = spawn(CHROME, [`--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, '--no-first-run', '--hide-scrollbars', '--mute-audio', 'about:blank'], {stdio: 'ignore'});
let target;
for (let i = 0; i < 50 && !target; i++) {
	try {
		target = (await (await fetch(`http://127.0.0.1:${port}/json/list`)).json()).find((t) => t.type === 'page');
	} catch {}
	if (!target) await sleep(200);
}
if (!target) {
	chrome.kill();
	console.error('headless Chrome did not start');
	process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => ws.addEventListener('open', r));
let id = 0;
const pending = new Map();
const logs = [];
let loaded = false;
ws.addEventListener('message', (m) => {
	const msg = JSON.parse(m.data);
	if (msg.id && pending.has(msg.id)) {
		pending.get(msg.id)(msg);
		pending.delete(msg.id);
		return;
	}
	const p = msg.params;
	if (msg.method === 'Page.loadEventFired') loaded = true;
	if (msg.method === 'Runtime.consoleAPICalled') logs.push(`console.${p.type}: ${p.args.map((a) => a.value ?? a.description).join(' ')}`);
	if (msg.method === 'Runtime.exceptionThrown') logs.push(`EXCEPTION: ${p.exceptionDetails.exception?.description || p.exceptionDetails.text}`);
	if (msg.method === 'Log.entryAdded') logs.push(`log.${p.entry.level}: ${p.entry.text} ${p.entry.url || ''}`);
});
const send = (method, params = {}) =>
	new Promise((r) => {
		const i = ++id;
		pending.set(i, r);
		ws.send(JSON.stringify({id: i, method, params}));
	});
const evaluate = async (expression) => {
	const r = await send('Runtime.evaluate', {expression, awaitPromise: true, returnByValue: true});
	if (r.result?.exceptionDetails) logs.push(`EVAL ERROR: ${r.result.exceptionDetails.exception?.description}`);
	return r.result?.result?.value;
};

await send('Runtime.enable');
await send('Page.enable');
await send('Log.enable');
const mobile = width < 600;
await send('Emulation.setDeviceMetricsOverride', {width, height, deviceScaleFactor: 1, mobile});
if (mobile) await send('Emulation.setTouchEmulationEnabled', {enabled: true});
await send('Page.navigate', {url});
while (!loaded) await sleep(50);
await sleep(400);
if (full) {
	const h = await evaluate('document.documentElement.scrollHeight');
	await send('Emulation.setDeviceMetricsOverride', {width, height: h, deviceScaleFactor: 1, mobile});
}
if (evalFile) {
	const v = await evaluate(fs.readFileSync(evalFile, 'utf8'));
	if (v !== undefined) console.log('eval ->', typeof v === 'string' ? v : JSON.stringify(v));
}
await sleep(wait);
const shot = await send('Page.captureScreenshot', {format: 'png'});
fs.writeFileSync(out, Buffer.from(shot.result.data, 'base64'));
console.log(`${out} (${width} px wide)`);
for (const l of logs) console.log(l);
ws.close();
chrome.kill();
await sleep(300);
try {
	fs.rmSync(profile, {recursive: true, force: true});
} catch {}
