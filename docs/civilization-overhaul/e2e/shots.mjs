// Takes screenshots at exact phone and tablet viewports with headless Chrome and the DevTools protocol.
// Usage: dev server on :3111, then `node docs/civilization-overhaul/e2e/shots.mjs` (writes docs/civilization-overhaul/screens/mobile_*.png).
import { spawn } from 'node:child_process';
import { mkdirSync, writeFileSync, mkdtempSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const CHROME = process.env.CHROME ?? 'C:/Program Files/Google/Chrome/Application/chrome.exe';
const APP = process.argv[2] ?? 'http://localhost:3111/sandbox';
const out = new URL('../screens/', import.meta.url);
const port = 9333;
const profile = mkdtempSync(join(tmpdir(), 'civ-shots-'));
const chrome = spawn(CHROME, ['--headless=new', '--disable-gpu', `--remote-debugging-port=${port}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' });
const sleep = ms => new Promise(r => setTimeout(r, ms));
let target;
for (let i = 0; i < 40 && !target; i++) { await sleep(500); try { target = (await (await fetch(`http://127.0.0.1:${port}/json`)).json()).find(t => t.type === 'page'); } catch { /* starting */ } }
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise(r => { ws.onopen = r; });
let id = 0; const pending = new Map();
ws.onmessage = m => { const d = JSON.parse(m.data); if (d.id && pending.has(d.id)) { pending.get(d.id)(d); pending.delete(d.id); } };
const send = (method, params = {}) => new Promise(res => { const i = ++id; pending.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const evalJs = async expr => (await send('Runtime.evaluate', { expression: expr, returnByValue: true, awaitPromise: true })).result?.result?.value;
const shot = async name => { const r = await send('Page.captureScreenshot', { format: 'png' }); writeFileSync(new URL(name, out), Buffer.from(r.result.data, 'base64')); console.log('saved', name); };
mkdirSync(out, { recursive: true });

for (const [w, h, mobile, tag] of [[375, 740, true, '375'], [768, 1000, true, '768']]) {
  await send('Emulation.setDeviceMetricsOverride', { width: w, height: h, deviceScaleFactor: 1, mobile });
  await send('Emulation.setTouchEmulationEnabled', { enabled: true });
  await send('Page.navigate', { url: APP });
  for (let i = 0; i < 60; i++) { await sleep(1500); if (await evalJs('!!(window.__civworld && document.querySelector(".cw-canvas"))')) break; }
  await evalJs('localStorage.setItem("evo.workspace.v1", JSON.stringify({layout:"civ",splitPct:45})); window.__civworld.state.tutorial.done = true; 1');
  await sleep(1500);
  await shot(`mobile_${tag}_civ.png`);
  console.log(tag, 'viewport', await evalJs('innerWidth + "x" + innerHeight'), 'overflow-x', await evalJs('document.documentElement.scrollWidth > innerWidth'));
  await evalJs('[...document.querySelectorAll(".cw-toolbar button")][0].click(); 1');
  await sleep(700);
  await shot(`mobile_${tag}_build_drawer.png`);
  await evalJs('[...document.querySelectorAll(".ws-controls button")].find(b=>/Split/.test(b.textContent)).click(); 1');
  await sleep(4000);
  await shot(`mobile_${tag}_split.png`);
  console.log(tag, 'clipped controls', await evalJs('[...document.querySelectorAll(".ws-tabs button, .cw-toolbar button")].filter(b=>b.getBoundingClientRect().right>innerWidth+1).map(b=>b.textContent).join(",")'));
}
ws.close(); chrome.kill();
