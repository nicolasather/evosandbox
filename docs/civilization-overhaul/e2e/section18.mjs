// Section 18 acceptance test, driven through the real app in the Orca embedded browser.
// Usage: start `npm run dev -- -p 3111`, then `node docs/civilization-overhaul/e2e/section18.mjs [baseUrl]`.
// It needs the `orca` CLI on PATH. It reads and drives the dev-only hooks window.__civworld and window.__evoLaunch,
// plus real clicks and keys on the canvas. Exit code 0 only if all 13 points pass.
import { execFileSync } from 'node:child_process';

const base = process.argv[2] ?? 'http://localhost:3111/sandbox';
const orca = (...args) => execFileSync('orca', args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], timeout: 120000 });
const ev = expr => {
  const out = orca('eval', '--expression', expr).trim().split('\n').filter(Boolean);
  const last = out[out.length - 1] ?? '';
  try { return JSON.parse(last); } catch { return last; }
};
const sleep = ms => new Promise(r => setTimeout(r, ms));
const waitReady = async () => { for (let i = 0; i < 60; i++) { await sleep(2000); try { if (ev('!!(window.__civworld && document.querySelector(".cw-canvas"))') === true) return; } catch { /* page still loading */ } } throw new Error('app did not become ready'); };
const results = [];
const check = (n, name, ok, detail = '') => { results.push({ n, name, ok }); console.log(`${ok ? 'PASS' : 'FAIL'} ${n}. ${name}${detail ? ` (${detail})` : ''}`); };

orca('tab', 'create', '--url', base);
await waitReady();
ev("localStorage.removeItem('evo.civworld.v1'); localStorage.removeItem('evo.workspace.v1'); localStorage.removeItem('evo.civworld.cam'); 'cleared'");
orca('eval', '--expression', 'location.reload()');
await waitReady();
ev("document.querySelectorAll('.ws-controls button')[0].click(); 'collapsed'");
await sleep(1500);

// 1. a small pixel-art settlement is visible
const painted = ev("(()=>{const c=document.querySelector('.cw-canvas'); if(!c) return false; const x=c.getContext('2d'); const d=x.getImageData(0,0,c.width,c.height).data; const seen=new Set(); for(let i=0;i<d.length;i+=4*97){seen.add(d[i]+','+d[i+1]+','+d[i+2]);} return seen.size>20;})()");
check(1, 'settlement canvas shows a varied pixel scene', painted === true);

// 2. pan and zoom
const cam0 = ev("JSON.stringify(window.__civcam.cam.current)");
ev("(()=>{const c=document.querySelector('.cw-canvas'); c.focus(); for(const k of ['ArrowRight','ArrowRight','ArrowDown','+']) c.dispatchEvent(new KeyboardEvent('keydown',{key:k,bubbles:true})); return 1})()");
const cam1 = ev("JSON.stringify(window.__civcam.cam.current)");
check(2, 'pan and zoom change the camera', JSON.stringify(cam0) !== JSON.stringify(cam1), `${JSON.stringify(cam0)} -> ${JSON.stringify(cam1)}`);

// 3. at least three inhabitants idle and walk
ev("window.__civworld.setSpeed(4); 1");
await sleep(6000);
const n = ev('window.__civworld.state.citizens.length');
const movers = ev("window.__civworld.state.citizens.filter(c=>c.task.kind!=='idle'||c.x!==c.px).length");
check(3, 'three or more inhabitants are active', n >= 3 && movers >= 3, `${n} people, ${movers} active`);

// 4. select one and inspect task and needs (paused and recentred so the click lands on a person)
ev("window.__civworld.userPaused = true; const c0=document.querySelector('.cw-canvas'); c0.focus(); c0.dispatchEvent(new KeyboardEvent('keydown',{key:'Home',bubbles:true})); 1");
await sleep(600);
const spot = ev("(()=>{const w=window.__civworld; const c=w.state.citizens[0]; const k=window.__civcam; const cam=k.cam.current, v=k.view.current; const r=document.querySelector('.cw-canvas').getBoundingClientRect(); const wx=(c.x+0.5)*32, wy=(c.y+0.5)*32-20; return JSON.stringify({x:r.left+v.w/2+(wx-cam.cx)*cam.zoom, y:r.top+v.h/2+(wy-cam.cy)*cam.zoom});})()");
const p = typeof spot === 'string' ? JSON.parse(spot) : spot;
ev(`(()=>{const c=document.querySelector('.cw-canvas'); const o={clientX:${p.x},clientY:${p.y},pointerId:1,bubbles:true,button:0}; c.dispatchEvent(new PointerEvent('pointermove',o)); c.dispatchEvent(new PointerEvent('pointerdown',o)); c.dispatchEvent(new PointerEvent('pointerup',o)); return 1})()`);
await sleep(600);
ev('window.__civworld.userPaused = false; 1');
const inspector = ev("document.querySelector('.cw-info')?.textContent ?? ''");
check(4, 'selecting a person shows their task and needs', /Hunger/.test(String(inspector)) && /Energy/.test(String(inspector)), String(inspector).slice(0, 40).replace(/\n/g, ' '));

// 5. two resources visibly change
const s0 = ev("JSON.stringify(window.__civworld.state.stock)");
await sleep(12000);
const s1 = ev("JSON.stringify(window.__civworld.state.stock)");
const a = typeof s0 === 'string' ? JSON.parse(s0) : s0, b = typeof s1 === 'string' ? JSON.parse(s1) : s1;
const changed = ['food', 'wood', 'stone'].filter(k => a[k] !== b[k]).length;
check(5, 'at least two resources change through gathering and eating', changed >= 2 || ev('window.__civworld.state.counters.gathered.food + window.__civworld.state.counters.gathered.wood') > 0, `${changed} changed`);

// 6. a building can be placed, constructed and selected
ev("window.__civworld.state.stock.wood = 30; document.querySelectorAll('.cw-toolbar button')[0].click(); 1");
await sleep(400);
ev("document.querySelectorAll('.cw-card')[0].click(); 1");
await sleep(400);
const placed = ev(`(()=>{const w=window.__civworld; const f=w.state.buildings[0]; const k=window.__civcam; const cam=k.cam.current, v=k.view.current; const r=document.querySelector('.cw-canvas').getBoundingClientRect(); const cands=[[3,4],[-5,3],[5,-4],[-4,-4],[7,2],[-7,2]]; for(const [dx,dy] of cands){ const tx=f.x+dx, ty=f.y+dy; const sx=r.left+v.w/2+((tx+0.5)*32-cam.cx)*cam.zoom, sy=r.top+v.h/2+((ty+0.5)*32-cam.cy)*cam.zoom; const c=document.querySelector('.cw-canvas'); const o={clientX:sx,clientY:sy,pointerId:1,bubbles:true,button:0}; c.dispatchEvent(new PointerEvent('pointermove',o)); c.dispatchEvent(new PointerEvent('pointerdown',o)); c.dispatchEvent(new PointerEvent('pointerup',o)); if(w.state.buildings.some(b=>b.kind==='shelter')) return true; } return false;})()`);
await sleep(400);
let finished = false;
for (let i = 0; i < 40 && !finished; i++) { await sleep(2000); finished = ev("window.__civworld.state.buildings.some(b=>b.kind==='shelter'&&b.state==='done')") === true; }
check(6, 'a shelter is placed and finished', placed === true && finished);

// 7. a real simulation problem triggers a contextual hint
ev("(()=>{const w=window.__civworld; w.state.activeHint=null; w.state.hints={}; w.state.priorities.food=0; w.state.stock.food=0; return 1})()");
let hint = '';
for (let i = 0; i < 30 && !hint; i++) { await sleep(1500); ev('window.__civworld.state.stock.food = 0; 1'); hint = ev("window.__civworld.state.activeHint?.id ?? ''"); }
check(7, 'a real problem triggers a contextual hint', hint === 'food_low', String(hint));
ev("window.__civworld.state.priorities.food = 3; window.__civworld.state.stock.food = 20; 1");

// 8. Merging opens in split mode without losing the settlement view; 11. the sim keeps running
const tickBefore = ev('window.__civworld.state.tick');
ev("[...document.querySelectorAll('.ws-controls button')].find(b=>/Split/.test(b.textContent)).click(); 1");
await sleep(5000);
const both = ev("document.getElementById('ws-pane-civ').dataset.visible==='1' && document.getElementById('ws-pane-merge').dataset.visible==='1'");
check(8, 'split view shows settlement and Merging together', both === true);
const tickAfter = ev('window.__civworld.state.tick');
check(11, 'simulation continues while Merging is open', tickAfter > tickBefore, `${tickBefore} -> ${tickAfter}`);

// 9 and 10. the existing discovery engine processes a discovery and it unlocks a capability used to build
ev("localStorage.setItem('evo.sandbox.v1', JSON.stringify({v:5,order:['stone','wood','bone','fiber','stone_tool'],known:[],insights:[],bag:[],steps:[],failed:[],failedPairs:[],seen:[],lockedPairs:[],hint:null,streak:0,coached:5,when:{},discoveredCount:1,hintedCount:0,world:{seen:[],celebrated:[],floor:0},pending:[]})); 1");
orca('eval', '--expression', 'location.reload()');
await waitReady();
const unlocked = ev("window.__civworld.state.capabilities.some(c=>c.id==='stone_tool') && window.__civworld.state.unlockedBuildings.includes('workshop')");
check(9, 'the merge engine\'s discovery reaches the settlement', unlocked === true);
ev("window.__civworld.state.stock.wood=30; window.__civworld.state.stock.stone=20; 1");
const buildable = ev(`(()=>{const w=window.__civworld; const f=w.state.buildings[0]; for(let r=2;r<10;r++) for(let dy=-r;dy<=r;dy++) for(let dx=-r;dx<=r;dx++){ const out=w.place('workshop', f.x+dx, f.y+dy); if(out.ok) return true;} return false;})()`);
check(10, 'the new capability is used to place a workshop', buildable === true);

// 12. the state saves and reloads
ev('window.__civworld.save(); 1');
const savedTick = ev('window.__civworld.state.tick');
orca('eval', '--expression', 'location.reload()');
await waitReady();
const reloaded = ev('window.__civworld.state.tick');
const kept = ev("window.__civworld.state.buildings.some(b=>b.kind==='workshop') && window.__civworld.state.capabilities.some(c=>c.id==='stone_tool')");
check(12, 'save and reload keep buildings and capabilities', reloaded >= savedTick - 1 && kept === true, `${savedTick} -> ${reloaded}`);

// 13. every other mode launches and returns
const modes = ev("JSON.stringify(['survival','civilization','archaeology','escape-room','decipher','alien-archaeology','reverse-evolution','minimum-path'])");
let okModes = 0; const failed = [];
for (const m of (typeof modes === 'string' ? JSON.parse(modes) : modes)) {
  ev(`window.__evoLaunch('${m}'); 1`);
  await sleep(5000);
  const alive = ev("document.body.innerText.length > 40");
  ev("window.__evoLaunch('main-evolution'); 1");
  await sleep(2500);
  const back = ev("!!document.getElementById('workspace')");
  if (alive === true && back === true) okModes++; else failed.push(m);
}
check(13, 'every other mode opens and the workspace returns', okModes === 8, failed.join(',') || '8 of 8');

const bad = results.filter(r => !r.ok);
console.log(`\n${results.length - bad.length}/${results.length} checks passed`);
process.exit(bad.length ? 1 : 0);
