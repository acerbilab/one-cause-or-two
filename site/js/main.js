import {causalInference, curvePath, FLAT_SIGMA, gauss, noiseFound, priorAssumed, priorFound, visibleRange} from './observer.js';

const C = {
	text: '#F4F1EA',
	dim: '#A9B1D6',
	sight: '#5CC8FF',
	sound: '#6EE7A0',
	belief: '#FFB547',
	prior: '#C39BFF',
	fox: '#E8703A',
	foxLight: '#F6EDE0',
};
const NS = 'http://www.w3.org/2000/svg';
const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function el(tag, attrs = {}, parent) {
	const e = document.createElementNS(NS, tag);
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
	if (parent) parent.appendChild(e);
	return e;
}
const set = (e, attrs) => {
	for (const [k, v] of Object.entries(attrs)) e.setAttribute(k, v);
};
const ease = (t) => (t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2);
const lerp = (a, b, t) => a + (b - a) * t;

/** Font size in viewBox units that renders at least `minPx` CSS pixels. */
function fontFor(svg, viewW, base, minPx) {
	const scale = svg.getBoundingClientRect().width / viewW || 1;
	return Math.max(base, minPx / scale);
}

/** Shared gradient and glow definitions for a belief hill of one colour. */
function hillDefs(defs, id, color, fill) {
	const g = el('linearGradient', {id: `${id}-fill`, x1: 0, y1: 0, x2: 0, y2: 1}, defs);
	el('stop', {offset: 0, 'stop-color': color, 'stop-opacity': fill}, g);
	el('stop', {offset: 1, 'stop-color': color, 'stop-opacity': 0.04}, g);
	const f = el('filter', {id: `${id}-glow`, x: '-20%', y: '-50%', width: '140%', height: '200%'}, defs);
	el('feGaussianBlur', {stdDeviation: 6}, f);
}

/** A belief hill: gradient fill, soft glow and a crisp line. Call `.draw(f)` to update. */
function makeHill(parent, defs, id, color, {fill = 0.42, stroke = 4, dashed = false, glow = true} = {}) {
	hillDefs(defs, id, color, fill);
	const g = el('g', {}, parent);
	const area = fill > 0 ? el('path', {fill: `url(#${id}-fill)`}, g) : null;
	const halo = glow ? el('path', {stroke: color, 'stroke-width': stroke * 2.4, fill: 'none', opacity: 0.5, filter: `url(#${id}-glow)`}, g) : null;
	const line = el('path', {stroke: color, 'stroke-width': stroke, fill: 'none', 'stroke-linejoin': 'round', 'stroke-linecap': 'round'}, g);
	if (dashed) line.setAttribute('stroke-dasharray', '10 9');
	return {
		g,
		draw(f, toX, baseY, yScale, u0, u1) {
			const [a, b] = visibleRange(f, u0, u1);
			const d = curvePath(f, a, b, toX, baseY, yScale, false, 200);
			if (area) area.setAttribute('d', curvePath(f, a, b, toX, baseY, yScale, true, 200));
			if (halo) halo.setAttribute('d', d);
			line.setAttribute('d', d);
		},
	};
}

function label(parent, text, attrs) {
	const t = el('text', {
		'font-weight': 800,
		'paint-order': 'stroke',
		stroke: 'rgba(8,12,34,0.7)',
		'stroke-linejoin': 'round',
		...attrs,
	}, parent);
	t.textContent = text;
	return t;
}

function groundLine(parent, defs, id, x0, x1, y, tick) {
	const g = el('linearGradient', {id, x1: 0, x2: 1, y1: 0, y2: 0}, defs);
	[[0, 0], [0.1, 0.7], [0.9, 0.7], [1, 0]].forEach(([o, a]) => el('stop', {offset: o, 'stop-color': C.text, 'stop-opacity': a}, g));
	el('rect', {x: x0, y: y - 1.5, width: x1 - x0, height: 3, fill: `url(#${id})`}, parent);
	if (tick !== undefined) el('line', {x1: tick, x2: tick, y1: y - 8, y2: y + 8, stroke: C.text, 'stroke-width': 3, opacity: 0.8}, parent);
}

// ─── Play with it ──────────────────────────────────────────────────────────────

const FOX_PATHS = [
	'M-10,0 C-60,6 -86,-20 -70,-44 C-60,-58 -44,-50 -36,-38 C-30,-28 -20,-22 -10,-22Z',
	'M-34,0 C-40,-40 -26,-78 2,-86 C28,-80 38,-40 30,0Z',
	'M-18,-76 C-20,-110 10,-126 30,-112 L52,-96 C40,-84 18,-78 -2,-78Z',
	'M-10,-104 L-6,-134 L8,-110Z',
	'M6,-112 L18,-138 L24,-110Z',
];

function foxIcon(parent, s) {
	const g = el('g', {transform: `translate(-8,-4) scale(${s})`, fill: C.fox}, parent);
	FOX_PATHS.forEach((d) => el('path', {d}, g));
	el('path', {d: 'M-2,-60 C10,-66 24,-44 18,-6 L0,-6 C4,-30 2,-48 -2,-60Z', fill: C.foxLight}, g);
	el('circle', {cx: 52, cy: -96, r: 4.5, fill: '#2B1B14'}, g);
	return g;
}

function windBirdIcon(parent, s) {
	const g = el('g', {transform: `scale(${s / 0.62})`}, parent);
	const w = el('g', {transform: 'translate(-24,-26) scale(0.32)', fill: 'none', stroke: '#AEB9E8', 'stroke-linecap': 'round'}, g);
	el('path', {d: 'M-120,0 C-70,-6 -20,-4 10,-18 C40,-30 44,-62 18,-66 C-6,-70 -12,-44 6,-36', 'stroke-width': 12}, w);
	el('path', {d: 'M-150,40 C-90,36 -30,40 30,32', 'stroke-width': 11}, w);
	const b = el('g', {transform: 'translate(22,-4) scale(0.8)'}, g);
	el('path', {d: 'M-24,-22 L-52,-34 L-48,-18 L-24,-12Z', fill: '#9C5E2E'}, b);
	el('ellipse', {cx: 0, cy: -20, rx: 28, ry: 21, fill: '#C9823F'}, b);
	el('ellipse', {cx: 8, cy: -13, rx: 17, ry: 12, fill: '#F2C48A'}, b);
	el('ellipse', {cx: -6, cy: -24, rx: 16, ry: 10, transform: 'rotate(-18 -6 -24)', fill: '#9C5E2E'}, b);
	el('circle', {cx: 20, cy: -36, r: 15, fill: '#C9823F'}, b);
	el('path', {d: 'M33,-40 L48,-36 L33,-33Z', fill: '#F5B942'}, b);
	el('path', {d: 'M33,-33 L46,-32 L33,-30Z', fill: '#E09A2B'}, b);
	el('circle', {cx: 25, cy: -39, r: 3.4, fill: '#1A1426'}, b);
	return g;
}

function setupDemo() {
	const svg = document.getElementById('demo');
	if (!svg) return;
	const inputs = {sV: document.getElementById('sv'), sA: document.getElementById('sa'), pCommon: document.getElementById('pc')};
	const verdict = document.getElementById('verdict');
	const DEFAULTS = {uA: 12.5, sV: 3, sA: 5, pCommon: 0.65};
	const state = {...DEFAULTS};
	let tilt = 0;
	let tiltV = 0;
	let L = null; // layout, rebuilt when the width class changes
	let parts = null;
	let touched = false;

	const layoutFor = (compact) =>
		compact
			? {W: 600, H: 570, cx: 300, fx: 11, umax: 24, base: 500, ys: 820, pivotY: 64, arm: 165, drop: 88, pan: 64, icon: 0.4, font: 25, minPx: 12.5}
			: {W: 1000, H: 572, cx: 500, fx: 15, umax: 26, base: 505, ys: 880, pivotY: 84, arm: 220, drop: 100, pan: 84, icon: 0.5, font: 26, minPx: 13};

	function build() {
		const hadFocus = parts && document.activeElement === parts.handle;
		const compact = svg.parentElement.getBoundingClientRect().width < 620;
		L = layoutFor(compact);
		L.toX = (u) => L.cx + u * L.fx;
		state.uA = Math.max(-L.umax, Math.min(L.umax, state.uA));
		L.fs = fontFor(svg, L.W, L.font, L.minPx) || L.font;
		svg.replaceChildren(svg.querySelector('desc'));
		set(svg, {viewBox: `0 0 ${L.W} ${L.H}`});
		const defs = el('defs', {}, svg);

		// the balance
		const bal = el('g', {}, svg);
		const colH = L.drop + 44;
		el('rect', {x: L.cx - 7, y: L.pivotY, width: 14, height: colH, rx: 5, fill: '#8F96C8'}, bal);
		el('path', {d: `M${L.cx - 60},${L.pivotY + colH + 14} L${L.cx + 60},${L.pivotY + colH + 14} L${L.cx + 40},${L.pivotY + colH - 4} L${L.cx - 40},${L.pivotY + colH - 4}Z`, fill: '#8F96C8'}, bal);
		const pans = [0, 1].map((i) => {
			const g = el('g', {}, bal);
			const l1 = el('line', {stroke: C.dim, 'stroke-width': 2.5, opacity: 0.8}, g);
			const l2 = el('line', {stroke: C.dim, 'stroke-width': 2.5, opacity: 0.8}, g);
			const body = el('g', {}, g);
			if (i === 0) foxIcon(body, L.icon);
			else windBirdIcon(body, L.icon);
			el('path', {d: `M${-L.pan},0 L${L.pan},0 Q${L.pan * 0.77},${L.pan * 0.33} 0,${L.pan * 0.35} Q${-L.pan * 0.77},${L.pan * 0.33} ${-L.pan},0Z`, fill: '#D9DCF0'}, body);
			el('rect', {x: -L.pan, y: -3, width: 2 * L.pan, height: 6, rx: 3, fill: C.text}, body);
			const name = label(g, i === 0 ? 'one cause' : 'two causes', {'text-anchor': 'middle', fill: C.text, 'font-size': L.fs * 1.05, 'stroke-width': L.fs * 0.16});
			const pct = label(g, '', {'text-anchor': 'middle', fill: C.text, 'font-size': L.fs * 1.05, 'font-family': "'JetBrains Mono', monospace", 'font-weight': 600, 'stroke-width': L.fs * 0.16});
			return {l1, l2, body, name, pct};
		});
		const beam = el('line', {stroke: '#D9DCF0', 'stroke-width': 9, 'stroke-linecap': 'round'}, bal);
		el('circle', {cx: L.cx, cy: L.pivotY, r: 13, fill: C.text}, bal);
		el('circle', {cx: L.cx, cy: L.pivotY, r: 5, fill: '#8F96C8'}, bal);

		// the ground and the hills
		groundLine(svg, defs, 'demo-gl', Math.max(8, L.toX(-31)), Math.min(L.W - 8, L.toX(31)), L.base, L.cx);
		label(svg, 'straight ahead', {x: L.cx, y: L.base + L.fs * 1.35, 'text-anchor': 'middle', fill: C.dim, 'font-size': L.fs * 0.85, 'font-weight': 700, 'stroke-width': 0});
		const hills = {
			sight: makeHill(svg, defs, 'dv', C.sight, {fill: 0.3}),
			sound: makeHill(svg, defs, 'da', C.sound, {fill: 0.3}),
			guess: makeHill(svg, defs, 'db', C.belief, {fill: 0.45, stroke: 5}),
		};
		hills.sight.g.setAttribute('opacity', 0.8);
		hills.sound.g.setAttribute('opacity', 0.8);
		const lbl = {
			sight: label(svg, 'sight', {fill: C.sight, 'font-size': L.fs, 'stroke-width': L.fs * 0.16}),
			sound: label(svg, 'sound', {fill: C.sound, 'font-size': L.fs, 'stroke-width': L.fs * 0.16}),
			guess: label(svg, 'your guess', {'text-anchor': 'middle', fill: C.belief, 'font-size': L.fs * 1.05, 'stroke-width': L.fs * 0.16}),
		};

		// the drag handle, on the ground line under the sound
		const handle = el('g', {class: 'handle', tabindex: 0, role: 'slider', 'aria-label': 'Where the sound came from', 'aria-valuemin': -L.umax, 'aria-valuemax': L.umax}, svg);
		el('rect', {x: -40, y: -40, width: 80, height: 80, fill: 'transparent'}, handle);
		el('circle', {class: 'ring', r: 17, fill: '#0B1026', stroke: C.sound, 'stroke-width': 3}, handle);
		el('path', {d: 'M-7,-4 L-3,-4 L3,-9 L3,9 L-3,4 L-7,4Z', fill: C.sound}, handle);
		el('path', {d: 'M6,-5 Q10,0 6,5', stroke: C.sound, 'stroke-width': 2, fill: 'none', 'stroke-linecap': 'round'}, handle);
		const hint = el('g', {fill: C.sound}, handle);
		const hy = 44 + L.fs * 0.3;
		label(hint, 'drag', {y: hy, 'text-anchor': 'middle', fill: C.sound, 'font-size': L.fs * 0.8, 'stroke-width': 0});
		const tw = L.fs * 1.35;
		const th = L.fs * 0.3;
		el('path', {d: `M${-tw},${hy - th * 1.2} l${-th * 1.6},${-th} l0,${th * 2}Z M${tw},${hy - th * 1.2} l${th * 1.6},${-th} l0,${th * 2}Z`}, hint);
		if (touched) hint.setAttribute('opacity', 0);

		parts = {pans, beam, hills, lbl, handle, hint};
		render();
		if (hadFocus) handle.focus();
	}

	function render() {
		const {sV, sA, pCommon, uA} = state;
		const ci = causalInference({xV: 0, xA: uA, sV, sA, sP: 20, pCommon});
		const {pans, beam, hills, lbl, handle} = parts;

		// balance: negative tilt lowers the "one cause" pan
		const a = (tilt * Math.PI) / 180;
		const ends = [
			[L.cx - Math.cos(a) * L.arm, L.pivotY - Math.sin(a) * L.arm],
			[L.cx + Math.cos(a) * L.arm, L.pivotY + Math.sin(a) * L.arm],
		];
		set(beam, {x1: ends[0][0], y1: ends[0][1], x2: ends[1][0], y2: ends[1][1]});
		const p = Math.round(ci.p1 * 100);
		ends.forEach(([x, y], i) => {
			const pan = pans[i];
			set(pan.l1, {x1: x, y1: y, x2: x - L.pan * 0.85, y2: y + L.drop});
			set(pan.l2, {x1: x, y1: y, x2: x + L.pan * 0.85, y2: y + L.drop});
			pan.body.setAttribute('transform', `translate(${x},${y + L.drop})`);
			set(pan.name, {x, y: y + L.drop + L.fs * 1.9});
			set(pan.pct, {x, y: y + L.drop + L.fs * 3.05});
			pan.pct.textContent = `${i === 0 ? p : 100 - p}%`;
		});

		// hills
		hills.sight.draw((u) => gauss(u, 0, sV), L.toX, L.base, L.ys, -32, 32);
		hills.sound.draw((u) => gauss(u, uA, sA), L.toX, L.base, L.ys, -32, 32);
		hills.guess.draw(ci.posteriorA, L.toX, L.base, L.ys, -32, 32);

		// labels: sight and sound on opposite sides, "your guess" over the amber peak
		const side = uA >= 0 ? 1 : -1;
		const vTop = L.base - gauss(0, 0, sV) * L.ys;
		const aTop = L.base - gauss(0, 0, sA) * L.ys;
		set(lbl.sight, {x: L.toX(0) - side * (sV * L.fx * 0.9 + 8), y: vTop + L.fs * 0.4, 'text-anchor': side > 0 ? 'end' : 'start'});
		set(lbl.sound, {x: L.toX(uA) + side * (sA * L.fx * 0.9 + 8), y: aTop + L.fs * 0.4, 'text-anchor': side > 0 ? 'start' : 'end'});
		let peakU = 0;
		let peakV = 0;
		for (let u = -32; u <= 32; u += 0.25) {
			const v = ci.posteriorA(u);
			if (v > peakV) {
				peakV = v;
				peakU = u;
			}
		}
		// lift "your guess" above the sight label when the amber peak sits next to the blue one
		const guessTop = Math.abs(peakU) < 2.5 * sV ? Math.min(L.base - peakV * L.ys, vTop - L.fs * 0.9) : L.base - peakV * L.ys;
		set(lbl.guess, {x: Math.max(L.fs * 3, Math.min(L.W - L.fs * 3, L.toX(peakU))), y: guessTop - L.fs * 0.8});

		handle.setAttribute('transform', `translate(${L.toX(uA)},${L.base})`);
		const deg = Math.round(Math.abs(uA));
		handle.setAttribute('aria-valuenow', Math.round(uA));
		const where = deg === 0 ? 'at the flash' : `${deg} degrees ${uA > 0 ? 'right' : 'left'} of the flash`;
		handle.setAttribute('aria-valuetext', `${where}, ${p}% one cause`);

		const text = ci.p1 >= 0.7 ? ['Probably one cause: merge them.', C.belief] : ci.p1 <= 0.3 ? ['Probably two causes: keep them separate.', C.sound] : ['Could be either: hedge your bets.', C.text];
		if (verdict.textContent !== text[0]) {
			verdict.textContent = text[0];
			verdict.style.color = text[1];
		}
		return ci.p1;
	}

	// the beam swings to its new balance on a spring
	let raf = 0;
	function update() {
		const p1 = render();
		const target = -(p1 - 0.5) * 2 * 11;
		if (reduceMotion) {
			tilt = target;
			render();
			return;
		}
		if (!raf) raf = requestAnimationFrame(step);
	}
	function step() {
		raf = 0;
		const p1 = causalInference({xV: 0, xA: state.uA, sV: state.sV, sA: state.sA, sP: 20, pCommon: state.pCommon}).p1;
		const target = -(p1 - 0.5) * 2 * 11;
		tiltV = (tiltV + (target - tilt) * 0.08) * 0.82;
		tilt += tiltV;
		render();
		if (Math.abs(target - tilt) > 0.02 || Math.abs(tiltV) > 0.02) raf = requestAnimationFrame(step);
	}

	function markTouched() {
		if (touched) return;
		touched = true;
		parts.hint.setAttribute('opacity', 0);
	}
	const toU = (clientX) => {
		const pt = new DOMPoint(clientX, 0).matrixTransform(svg.getScreenCTM().inverse());
		return Math.max(-L.umax, Math.min(L.umax, (pt.x - L.cx) / L.fx));
	};
	let dragging = false;
	let pending = null; // a touch that started off the handle: a drag only once it moves sideways
	const startDrag = (e) => {
		dragging = true;
		pending = null;
		svg.setPointerCapture(e.pointerId);
		state.uA = toU(e.clientX);
		markTouched();
		update();
	};
	svg.addEventListener('pointerdown', (e) => {
		const pt = new DOMPoint(e.clientX, e.clientY).matrixTransform(svg.getScreenCTM().inverse());
		const onHandle = e.target.closest('.handle');
		if (!onHandle && pt.y < L.pivotY + L.drop + L.fs * 3.5) return; // the balance area is not a drag target
		if (e.pointerType === 'touch' && !onHandle) {
			pending = {x: e.clientX, y: e.clientY};
			return;
		}
		startDrag(e);
		e.preventDefault();
	});
	svg.addEventListener('pointermove', (e) => {
		if (pending) {
			const dx = Math.abs(e.clientX - pending.x);
			if (dx > 8 && dx > Math.abs(e.clientY - pending.y)) startDrag(e);
			return;
		}
		if (!dragging) return;
		state.uA = toU(e.clientX);
		update();
	});
	svg.addEventListener('pointerup', (e) => {
		if (pending) {
			// a tap places the sound
			state.uA = toU(e.clientX);
			markTouched();
			update();
		}
		dragging = false;
		pending = null;
	});
	svg.addEventListener('pointercancel', () => {
		dragging = false;
		pending = null;
	});
	svg.addEventListener('keydown', (e) => {
		if (!e.target.closest('.handle')) return;
		const steps = {ArrowLeft: -1, ArrowDown: -1, ArrowRight: 1, ArrowUp: 1, PageDown: -5, PageUp: 5};
		if (e.key in steps) state.uA = Math.max(-L.umax, Math.min(L.umax, state.uA + steps[e.key]));
		else if (e.key === 'Home') state.uA = -L.umax;
		else if (e.key === 'End') state.uA = L.umax;
		else return;
		e.preventDefault();
		markTouched();
		update();
	});
	for (const [k, input] of Object.entries(inputs)) {
		input.addEventListener('input', () => {
			state[k] = Number(input.value);
			update();
		});
	}
	document.getElementById('reset').addEventListener('click', () => {
		Object.assign(state, DEFAULTS);
		for (const [k, input] of Object.entries(inputs)) input.value = DEFAULTS[k];
		update();
	});

	build();
	tilt = -(causalInference({xV: 0, xA: state.uA, sV: state.sV, sA: state.sA, sP: 20, pCommon: state.pCommon}).p1 - 0.5) * 22;
	render();
	let lastW = svg.parentElement.getBoundingClientRect().width;
	new ResizeObserver(() => {
		const w = svg.parentElement.getBoundingClientRect().width;
		if (Math.abs(w - lastW) > 4) {
			lastW = w;
			build();
		}
	}).observe(svg.parentElement);
}

// ─── What we found: assumed shapes turn into the found ones when scrolled into view ───

const HALO_U = [-24, -16, -8, 0, 8, 16, 24];

function setupBlurFigure() {
	const svg = document.getElementById('fig-blur');
	if (!svg) return null;
	const W = 560;
	const base = 176;
	const toX = (u) => 280 + u * 10.5;
	const px = 6.6;
	const ys = 330;
	let parts;

	const hillPath = (u, s, closed) => {
		let d = '';
		const x0 = toX(u);
		for (let k = 0; k <= 60; k++) {
			const v = -3 * s + (6 * s * k) / 60;
			d += `${k ? 'L' : 'M'}${(x0 + v * px).toFixed(1)},${(base - gauss(v, 0, s) * ys).toFixed(1)}`;
		}
		return closed ? `${d}L${(x0 + 3 * s * px).toFixed(1)},${base}L${(x0 - 3 * s * px).toFixed(1)},${base}Z` : d;
	};

	function build() {
		const fs = fontFor(svg, W, 17, 12.5);
		svg.replaceChildren();
		const defs = el('defs', {}, svg);
		groundLine(svg, defs, 'fb-gl', 14, W - 14, base, undefined);
		const ghosts = el('g', {fill: 'none', stroke: '#A9DDFF', 'stroke-width': 2.2, 'stroke-dasharray': '7 6', opacity: 0.75}, svg);
		HALO_U.forEach((u) => el('path', {d: hillPath(u, FLAT_SIGMA, false)}, ghosts));
		const solid = HALO_U.map((u) => {
			const g = el('g', {}, svg);
			return {
				u,
				area: el('path', {fill: C.sight, opacity: 0.25}, g),
				line: el('path', {fill: 'none', stroke: C.sight, 'stroke-width': 3, 'stroke-linejoin': 'round'}, g),
				dot: el('circle', {cx: toX(u), cy: base, r: 3.5, fill: '#FFFFFF'}, g),
			};
		});
		label(svg, 'straight ahead', {x: toX(0), y: base + fs * 1.5, 'text-anchor': 'middle', fill: C.dim, 'font-size': fs, 'font-weight': 700, 'stroke-width': 0});
		label(svg, 'left', {x: toX(-24), y: base + fs * 1.5, 'text-anchor': 'middle', fill: C.dim, 'font-size': fs, 'font-weight': 700, 'stroke-width': 0});
		label(svg, 'right', {x: toX(24), y: base + fs * 1.5, 'text-anchor': 'middle', fill: C.dim, 'font-size': fs, 'font-weight': 700, 'stroke-width': 0});
		const sharp = label(svg, 'sharpest', {x: toX(0), y: fs * 1.2, 'text-anchor': 'middle', fill: C.text, 'font-size': fs, 'stroke-width': fs * 0.16});
		const level = label(svg, 'levels off', {x: toX(20), y: base - 62, 'text-anchor': 'middle', fill: C.text, 'font-size': fs, 'stroke-width': fs * 0.16});
		parts = {solid, sharp, level};
	}

	function draw(t) {
		for (const h of parts.solid) {
			const s = lerp(FLAT_SIGMA, noiseFound(h.u), t);
			h.area.setAttribute('d', hillPath(h.u, s, true));
			h.line.setAttribute('d', hillPath(h.u, s, false));
		}
		const lt = Math.max(0, (t - 0.6) / 0.4);
		parts.sharp.setAttribute('opacity', lt);
		parts.level.setAttribute('opacity', lt);
	}
	build();
	return {build, draw};
}

function setupPriorFigure() {
	const svg = document.getElementById('fig-prior');
	if (!svg) return null;
	const W = 560;
	const base = 176;
	const toX = (u) => 280 + u * 8.6;
	const ys = 1720;
	let parts;
	const morph = (t) => (u) => Math.exp(lerp(Math.log(priorAssumed(u)), Math.log(priorFound(u)), t));

	function build() {
		const fs = fontFor(svg, W, 17, 12.5);
		svg.replaceChildren();
		const defs = el('defs', {}, svg);
		groundLine(svg, defs, 'fp-gl', 14, W - 14, base, toX(0));
		const ghost = makeHill(svg, defs, 'fpg', C.prior, {fill: 0, stroke: 2.2, dashed: true, glow: false});
		ghost.g.setAttribute('opacity', 0.7);
		ghost.draw(priorAssumed, toX, base, ys, -31, 31);
		const prior = makeHill(svg, defs, 'fpp', C.prior, {fill: 0.4, stroke: 3.5});
		label(svg, 'straight ahead', {x: toX(0), y: base + fs * 1.5, 'text-anchor': 'middle', fill: C.dim, 'font-size': fs, 'font-weight': 700, 'stroke-width': 0});
		const peak = label(svg, 'probably straight ahead', {x: toX(0) + 18, y: base - priorFound(0) * ys + fs * 0.6, 'text-anchor': 'start', fill: C.text, 'font-size': fs, 'stroke-width': fs * 0.16});
		const tail = label(svg, 'but maybe anywhere', {x: toX(-19), y: base - priorFound(19) * ys - fs * 2.2, 'text-anchor': 'middle', fill: C.text, 'font-size': fs, 'stroke-width': fs * 0.16});
		parts = {prior, peak, tail};
	}
	function draw(t) {
		parts.prior.draw(morph(t), toX, base, ys, -31, 31);
		const lt = Math.max(0, (t - 0.6) / 0.4);
		parts.peak.setAttribute('opacity', lt);
		parts.tail.setAttribute('opacity', lt);
	}
	build();
	return {build, draw};
}

function setupFigures() {
	const figs = [
		[document.getElementById('fig-blur'), setupBlurFigure()],
		[document.getElementById('fig-prior'), setupPriorFigure()],
	].filter(([, f]) => f);
	for (const [svg, fig] of figs) {
		let t = reduceMotion ? 1 : 0;
		fig.draw(t);
		if (!reduceMotion) {
			const io = new IntersectionObserver(
				(entries) => {
					if (!entries.some((e) => e.isIntersecting)) return;
					io.disconnect();
					const start = performance.now() + 300;
					const tick = (now) => {
						t = ease(Math.min(1, Math.max(0, (now - start) / 1800)));
						fig.draw(t);
						if (t < 1) requestAnimationFrame(tick);
					};
					requestAnimationFrame(tick);
				},
				{threshold: 0.6},
			);
			io.observe(svg);
		}
		let lastW = svg.getBoundingClientRect().width;
		new ResizeObserver(() => {
			const w = svg.getBoundingClientRect().width;
			if (Math.abs(w - lastW) > 4) {
				lastW = w;
				fig.build();
				fig.draw(t);
			}
		}).observe(svg);
	}
}

// ─── Transcript, from the film's captions ───────────────────────────────────────

async function setupTranscript() {
	const box = document.getElementById('transcript');
	if (!box) return;
	const src = document.querySelector('#film track')?.getAttribute('src');
	try {
		const res = await fetch(src);
		if (!res.ok) throw new Error(res.statusText);
		const cues = [];
		for (const block of (await res.text()).replace(/\r/g, '').split(/\n\n+/)) {
			const m = block.match(/(?:(\d+):)?(\d+):([\d.]+) --> (?:(\d+):)?(\d+):([\d.]+)[^\n]*\n([\s\S]+)/);
			if (!m) continue;
			const t = (h, mi, s) => Number(h || 0) * 3600 + Number(mi) * 60 + Number(s);
			cues.push({start: t(m[1], m[2], m[3]), end: t(m[4], m[5], m[6]), text: m[7].replace(/\n/g, ' ').trim()});
		}
		if (!cues.length) throw new Error('no captions');
		// pauses within a scene are at most 0.6 s, so a longer one starts a new paragraph
		const paras = [];
		cues.forEach((c, i) => {
			if (i === 0 || c.start - cues[i - 1].end > 0.7) paras.push([]);
			paras[paras.length - 1].push(c.text);
		});
		box.replaceChildren(
			...paras.map((p) => {
				const e = document.createElement('p');
				e.textContent = p.join(' ');
				return e;
			}),
		);
	} catch {
		box.replaceChildren(Object.assign(document.createElement('p'), {textContent: 'The transcript is not available right now.'}));
	}
}

// ─── Copy BibTeX ────────────────────────────────────────────────────────────────

function setupCopy() {
	for (const btn of document.querySelectorAll('[data-copy]')) {
		const label0 = btn.textContent;
		const source = document.getElementById(btn.dataset.copy);
		let timer = 0;
		btn.addEventListener('click', async () => {
			try {
				await navigator.clipboard.writeText(source.textContent);
				btn.textContent = 'Copied';
			} catch {
				const range = document.createRange();
				range.selectNodeContents(source);
				getSelection().removeAllRanges();
				getSelection().addRange(range);
				btn.textContent = 'Selected: press Ctrl+C or ⌘C';
			}
			clearTimeout(timer);
			timer = setTimeout(() => (btn.textContent = label0), 2000);
		});
	}
}

// ─── Share the film ─────────────────────────────────────────────────────────────

function setupShare() {
	const btn = document.getElementById('share');
	if (!btn) return;
	const url = document.querySelector('link[rel="canonical"]')?.href || location.href;
	const data = {title: 'One cause or two?', text: 'A short film about how the brain decides whether a sight and a sound go together.', url};
	const label0 = btn.textContent;
	let timer = 0;
	btn.parentElement.hidden = false;
	btn.addEventListener('click', async () => {
		if (navigator.share) {
			try {
				await navigator.share(data);
				return;
			} catch (e) {
				if (e.name === 'AbortError') return; // the viewer closed the share sheet
			}
		}
		try {
			await navigator.clipboard.writeText(url);
			btn.textContent = 'Link copied';
		} catch {
			btn.textContent = url;
		}
		clearTimeout(timer);
		timer = setTimeout(() => (btn.textContent = label0), 2500);
	});
}

// ─── Full screen for the demo ───────────────────────────────────────────────────

function setupFullscreen() {
	const fig = document.querySelector('figure.demo');
	const btn = document.getElementById('demo-fs');
	if (!fig || !btn || !document.fullscreenEnabled) return; // e.g. iPhones: fullscreen is for video only
	btn.hidden = false;
	btn.addEventListener('click', () => {
		if (document.fullscreenElement) document.exitFullscreen();
		else fig.requestFullscreen().catch(() => {});
	});
	document.addEventListener('fullscreenchange', () => {
		const on = document.fullscreenElement === fig;
		const text = on ? 'Exit full screen' : 'Full screen';
		btn.setAttribute('aria-label', text);
		btn.title = text;
		btn.classList.toggle('on', on);
	});
}

setupDemo();
setupFigures();
setupTranscript();
setupCopy();
setupShare();
setupFullscreen();
