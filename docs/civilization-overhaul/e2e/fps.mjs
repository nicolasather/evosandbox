// Measures the cost of drawing one settlement frame with 200 citizens at each quality tier (dev build hook window.__civperf).
// Draw cost is independent of how the browser throttles requestAnimationFrame, so max fps = 1000 / ms per frame.
// Usage: dev server on :3111, then `node docs/civilization-overhaul/e2e/fps.mjs`.
import { execFileSync } from 'node:child_process';
const base = process.argv[2] ?? 'http://localhost:3111/sandbox';
const orca = (...a) => execFileSync('orca', a, { encoding: 'utf8', timeout: 120000 });
const ev = e => { const l = orca('eval', '--expression', e).trim().split('\n').filter(Boolean); const x = l[l.length - 1] ?? ''; try { return JSON.parse(x); } catch { return x; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
const ready = async () => { for (let i = 0; i < 60; i++) { await sleep(2000); try { if (ev('!!(window.__civworld && document.querySelector(".cw-canvas"))') === true) return; } catch { /* loading */ } } };
orca('tab', 'create', '--url', base);
await ready();
const out = {};
for (const n of [5, 200]) for (const q of ['low', 'medium', 'high']) {
  ev(`(()=>{const p=JSON.parse(localStorage.getItem('evo.civworld.ui.v1')||'{}'); p.quality='${q}'; localStorage.setItem('evo.civworld.ui.v1', JSON.stringify(p)); return 1})()`);
  orca('eval', '--expression', 'location.reload()');
  await ready();
  ev("document.querySelectorAll('.ws-controls button')[0].click(); 1");
  ev(`(()=>{const w=window.__civworld; w.state.citizens=w.state.citizens.filter(c=>!String(c.id).startsWith('bulk-')); const b=w.state.citizens[1]; for(let i=0;i<${n - 5};i++) w.state.citizens.push({...b, id:'bulk-'+i, name:'P'+i, x:b.x+(i%9), y:b.y+(i%6), px:b.x, py:b.y, path:[], task:{kind:'idle',reason:''}}); w.setSpeed(2); window.__civperf={n:0,total:0}; return w.state.citizens.length})()`);
  await sleep(6000);
  const p = ev('JSON.stringify(window.__civperf)'); const o = typeof p === 'string' ? JSON.parse(p) : p;
  const ms = o.n ? o.total / o.n : NaN;
  out[`${n}-${q}`] = { msPerFrame: Math.round(ms * 100) / 100, maxFps: Math.round(1000 / ms) };
  console.log(`${n} citizens, ${q}: ${out[`${n}-${q}`].msPerFrame} ms/frame over ${o.n} frames (up to ${out[`${n}-${q}`].maxFps} fps)`);
}
console.log(JSON.stringify(out));
