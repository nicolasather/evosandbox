// Live accessibility checks and the final art screenshots in headless Chrome (DevTools protocol).
// Usage: dev server on :3111, then `node docs/civilization-overhaul/e2e/a11y-live.mjs`.
// Writes docs/civilization-overhaul/screens/desktop_*.png and prints one JSON result object on stdout.
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP = process.argv[2] ?? 'http://localhost:3111/sandbox';
const out = new URL('../screens/', import.meta.url);
const port = 9334;
const profile = mkdtempSync(join(tmpdir(), 'civ-a11y-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', '--window-size=1280,800', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* starting */ } }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let id = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(new URL(name, out), Buffer.from(r.result.data, 'base64')); console.error('saved', name); };
const key = async (k, code, vk) => { const text = k === 'Enter' ? '\r' : k === ' ' ? ' ' : k.length === 1 ? k : undefined; await send('Input.dispatchKeyEvent', { type: 'keyDown', key: k, code, windowsVirtualKeyCode: vk, text }); await send('Input.dispatchKeyEvent', { type: 'keyUp', key: k, code, windowsVirtualKeyCode: vk }); await sleep(150); };
mkdirSync(out, { recursive: true });
const result = {};

await send('Emulation.setDeviceMetricsOverride', { width: 1280, height: 800, deviceScaleFactor: 1, mobile: false });
await send('Page.navigate', { url: APP });
for (let i = 0; i < 60; i++) { await sleep(1500); if (await evalJs('!!(window.__civworld && document.querySelector(".cw-canvas"))')) break; }
await evalJs('localStorage.setItem("evo.workspace.v1", JSON.stringify({layout:"civ",splitPct:45})); localStorage.setItem("evo.civworld.cam", JSON.stringify({cx:600,cy:400,zoom:2})); window.__civworld.state.tutorial.done = true; 1');
await send('Page.reload');
await sleep(4000);
for (let i = 0; i < 40; i++) { await sleep(500); if (await evalJs('!!document.querySelector(".cw-canvas")')) break; }
await sleep(1500);
await shot('desktop_main.png');

// 1. keyboard-only: walk the tab order and record each stop
await evalJs('document.activeElement && document.activeElement.blur(); 1');
const stops = [];
const focusInfo = `(() => {
  const e = document.activeElement; if (!e || e === document.body) return null;
  const cs = getComputedStyle(e);
  const ring = (cs.outlineStyle !== 'none' && parseFloat(cs.outlineWidth) > 0) || cs.boxShadow !== 'none';
  const name = e.getAttribute('aria-label') || (e.labels && e.labels[0] && e.labels[0].textContent) || e.textContent.trim() || e.getAttribute('title') || '';
  return { tag: e.tagName, name: name.slice(0, 50), ring, inCiv: !!e.closest('.cw-root') };
})()`;
for (let i = 0; i < 60; i++) {
  await send('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await send('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(60);
  const s = await evalJs(focusInfo);
  if (s && s.tag !== 'NEXTJS-PORTAL') stops.push(s); // the Next.js dev overlay is not part of the game
}
const uniq = [...new Map(stops.map(s => [s.tag + s.name, s])).values()];
result.keyboard = {
  stops: stops.length,
  distinct: uniq.length,
  unnamed: uniq.filter(s => !s.name).map(s => s.tag),
  withoutVisibleFocus: uniq.filter(s => !s.ring).map(s => `${s.tag}:${s.name}`),
  sample: uniq.slice(0, 40).map(s => `${s.tag}:${s.name}`),
};

// 2. keyboard play: canvas pan, zoom, pause, open a drawer by Enter, close with Escape
const cam0 = await evalJs('localStorage.getItem("evo.civworld.cam")');
await evalJs('document.querySelector(".cw-canvas").focus(); 1');
await key('ArrowRight', 'ArrowRight', 39);
await key('ArrowRight', 'ArrowRight', 39);
const cam1 = await evalJs('localStorage.getItem("evo.civworld.cam")');
await key('+', 'Equal', 187);
const zoomed = await evalJs('JSON.parse(localStorage.getItem("evo.civworld.cam")).zoom');
const p0 = await evalJs('window.__civworld.paused');
await key(' ', 'Space', 32);
const p1 = await evalJs('window.__civworld.paused');
result.keyboardPlay = { panChanged: cam0 !== cam1, zoomBefore: 2, zoomAfterPlus: zoomed, spacePauses: p0 !== p1 };
await evalJs('(() => { const b = [...document.querySelectorAll("button")].find(x => /^build$/i.test(x.textContent.trim())); if (b) b.focus(); return !!b; })()');
await key('Enter', 'Enter', 13);
result.keyboardPlay.drawerOpens = await evalJs('!!document.querySelector(".cw-drawer")');
await sleep(400);
await shot('desktop_build_drawer.png');
await key('Escape', 'Escape', 27);
result.keyboardPlay.escapeCloses = !(await evalJs('!!document.querySelector(".cw-drawer")'));

// 2b. keyboard-only build: open Build, choose Shelter with Enter, focus the map, arrows move the outline, Enter places it
await evalJs('(() => { const b = [...document.querySelectorAll("button")].find(x => /^build$/i.test(x.textContent.trim())); if (b) b.focus(); return 1; })()');
await key('Enter', 'Enter', 13);
await evalJs('(() => { const b = [...document.querySelectorAll(".cw-drawer button")].find(x => /^shelter/i.test(x.textContent.trim())); if (b) b.focus(); return !!b; })()');
await key('Enter', 'Enter', 13);
const before = await evalJs('window.__civworld.state.buildings.length');
await evalJs('(() => { const c = document.querySelector(".cw-canvas"); c.focus(); return 1; })()');
let placed = false; let tries = 0;
for (; tries < 60 && !placed; tries++) {
  await key(['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'][Math.floor(tries / 3) % 4], 'Arrow', 0);
  const msg = await evalJs('(document.querySelector(".cw-buildbar") || {}).textContent || ""');
  if (/Valid/.test(msg)) { await key('Enter', 'Enter', 13); placed = (await evalJs('window.__civworld.state.buildings.length')) > before; }
}
result.keyboardBuild = { placed, tries, buildingsBefore: before, buildingsAfter: await evalJs('window.__civworld.state.buildings.length') };
await shot('desktop_keyboard_build.png');

// 3. contrast, live computed colours on the settlement pane (text against its nearest painted background)
result.contrast = await evalJs(`(() => {
  const lum = c => { const v = c.map(x => { x /= 255; return x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4; }); return 0.2126 * v[0] + 0.7152 * v[1] + 0.0722 * v[2]; };
  const rgb = s => (s.match(/[\\d.]+/g) || []).map(Number);
  const bgOf = el => { for (let e = el; e; e = e.parentElement) { const c = rgb(getComputedStyle(e).backgroundColor); if (c.length < 4 || c[3] > 0.5) return c.slice(0, 3); } return [255, 255, 255]; };
  const els = [...document.querySelectorAll('.cw-root button, .cw-root span, .cw-root p, .cw-root strong, .cw-root em, .cw-root li, .cw-root label, .cw-root small, .cw-root h3')]
    .filter(e => e.offsetParent && [...e.childNodes].some(n => n.nodeType === 3 && n.textContent.trim()));
  const failing = []; let min = 99;
  for (const e of els) {
    const cs = getComputedStyle(e); const fg = rgb(cs.color).slice(0, 3); const bg = bgOf(e);
    const L1 = lum(fg), L2 = lum(bg); const r = (Math.max(L1, L2) + 0.05) / (Math.min(L1, L2) + 0.05);
    const fs = parseFloat(cs.fontSize); const large = fs >= 18.66 || (fs >= 14 && parseInt(cs.fontWeight) >= 700);
    min = Math.min(min, r);
    if (r < (large ? 3 : 4.5)) failing.push(r.toFixed(2) + ' ' + e.textContent.trim().slice(0, 40) + ' [' + cs.color + ' on ' + bg.join(',') + ']');
  }
  return { checked: els.length, minRatio: +min.toFixed(2), failingCount: failing.length, failing: failing.slice(0, 20) };
})()`);

// 4. accessible names on every control in the settlement pane and its drawers
result.names = await evalJs(`(() => {
  const bad = [];
  for (const e of document.querySelectorAll('.cw-root button, .cw-root input, .cw-root select, .cw-root textarea, .cw-root canvas, .cw-drawer button')) {
    const name = e.getAttribute('aria-label') || e.getAttribute('aria-labelledby') || (e.labels && e.labels.length) || e.textContent.trim() || e.getAttribute('title');
    if (!name && e.offsetParent) bad.push(e.tagName + ' ' + (e.className || ''));
  }
  return { unnamed: bad };
})()`);

// 5. reduced motion: with the sim paused, the picture only moves when motion is on (fire, smoke, birds, dust)
const sample = `(() => { const d = document.querySelector('.cw-canvas').toDataURL(); return d.length + ':' + d.slice(-300); })()`;
await evalJs('(() => { const r = window.__civworld; if (!r.paused) r.togglePause(); return 1; })()');
await sleep(800);
const motionA = await evalJs(sample); await sleep(1200); const motionB = await evalJs(sample);
await send('Emulation.setEmulatedMedia', { features: [{ name: 'prefers-reduced-motion', value: 'reduce' }] });
await sleep(800);
const reduceA = await evalJs(sample); await sleep(1200); const reduceB = await evalJs(sample);
result.reducedMotion = { mediaMatches: await evalJs('matchMedia("(prefers-reduced-motion: reduce)").matches'), pictureMovesNormally: motionA !== motionB, pictureStillWhenReduced: reduceA === reduceB };
await send('Emulation.setEmulatedMedia', { features: [] });
await evalJs('(() => { const r = window.__civworld; if (r.paused) r.togglePause(); return 1; })()');

// 6. night view at the default tier: move the clock into the night part of the day
await evalJs('(() => { const r = window.__civworld; if (r.paused) r.togglePause(); r.state.tick = Math.floor(r.state.tick / 240) * 240 + 200; return r.state.tick; })()');
// the clock runs on from here; wait a moment so the HUD and the canvas both show the night
await sleep(4000);
await shot('desktop_night.png');
result.nightTick = await evalJs('window.__civworld.state.tick % 240');

console.log(JSON.stringify(result, null, 1));
ws.close();
chrome.kill();
