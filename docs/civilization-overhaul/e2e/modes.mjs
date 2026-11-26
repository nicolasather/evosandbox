// Opens every existing game mode through the real app, leaves it running for a minute, checks for runtime errors, and returns to the workspace.
// Usage: dev server on :3111, then `node docs/civilization-overhaul/e2e/modes.mjs [seconds]`. Prints a markdown table.
import { execFileSync } from 'node:child_process';
const base = 'http://localhost:3111/sandbox';
const seconds = Number(process.argv[2] ?? 60);
const orca = (...a) => execFileSync('orca', a, { encoding: 'utf8', timeout: 180000 });
const ev = e => { const l = orca('eval', '--expression', e).trim().split('\n').filter(Boolean); const x = l[l.length - 1] ?? ''; try { return JSON.parse(x); } catch { return x; } };
const sleep = ms => new Promise(r => setTimeout(r, ms));
orca('tab', 'create', '--url', base);
for (let i = 0; i < 60; i++) { await sleep(2000); try { if (ev('!!window.__evoLaunch') === true) break; } catch { /* loading */ } }
ev("window.__errs=[]; window.addEventListener('error', e => window.__errs.push(String(e.message))); window.addEventListener('unhandledrejection', e => window.__errs.push('rejection: ' + String(e.reason))); 1");
const rows = [];
for (const m of ['survival', 'civilization', 'archaeology', 'escape-room', 'decipher', 'alien-archaeology', 'reverse-evolution', 'minimum-path']) {
  ev(`window.__evoLaunch('${m}'); window.__errs.length = 0; 1`);
  await sleep(4000);
  const before = ev('document.body.innerText.length');
  // light interaction: press Space (continues cinematic gates) and click the first visible button
  ev("document.dispatchEvent(new KeyboardEvent('keydown', {key: ' ', bubbles: true})); 1");
  await sleep(Math.max(2000, seconds * 1000 - 8000));
  const buttons = ev("document.querySelectorAll('button').length");
  const errors = ev('JSON.stringify(window.__errs)');
  const alive = ev('document.body.innerText.length > 40');
  const title = String(ev("(document.querySelector('h1,h2,[role=heading]')||{}).textContent || document.title")).replace(/\s+/g, ' ').slice(0, 40);
  ev("window.__evoLaunch('main-evolution'); 1");
  await sleep(2500);
  const back = ev("!!document.getElementById('workspace')");
  const errList = typeof errors === 'string' ? JSON.parse(errors) : errors;
  rows.push({ m, alive, back, errors: errList.length, buttons, title, text: before });
  console.log(`| ${m} | ${alive === true ? 'opens' : 'BLANK'} | ${seconds}s, ${buttons} controls, "${title}" | ${errList.length} errors | ${back === true ? 'returns to workspace' : 'DID NOT RETURN'} |`);
}
const bad = rows.filter(r => r.alive !== true || r.back !== true || r.errors > 0);
console.log(bad.length ? `\n${bad.length} mode(s) need attention` : '\nall 8 modes ok');
process.exit(bad.length ? 1 : 0);
