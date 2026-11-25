'use client';

import { useState } from 'react';
import { BUILDINGS, BUILD_ORDER } from '@/lib/civ/data/buildings';
import { SPEEDS } from '@/lib/civ/data/config';
import { computeAlerts } from '@/lib/civ/hints';
import type { CivRuntime } from '@/lib/civ/runtime';
import { JOB_LABEL, jobStatuses, needWord, timeLabel } from '@/lib/civ/selectors';
import { capacity, dayOf, foodDays, hasCapability } from '@/lib/civ/sim';
import { JOB_CATEGORIES, type CivEvent, type JobCategory } from '@/lib/civ/types';
import { BUILDING_LABEL, NODE_LABEL, TILE, type Hit } from '@/lib/civ/world';

/* React panels around the settlement canvas. They read simulation state through the
   runtime and issue commands to it; they never contain game rules. */

export type DrawerId = 'build' | 'jobs' | 'log' | 'help';

const PRIORITY_NAMES = ['Off', 'Low', 'Normal', 'High'];

/* ---------- top HUD ---------- */

export function Hud({ rt, onFocus }: { rt: CivRuntime; onFocus: (x: number, y: number) => void }) {
  const s = rt.state;
  const cap = capacity(s);
  const days = foodDays(s);
  const alerts = computeAlerts(s).slice(0, 2);
  return (
    <div className="cw-hud">
      <div className="cw-hud-row" role="group" aria-label="Settlement">
        <span className="cw-chip" title="Day and time of day">Day {dayOf(s.tick)} · {timeLabel(s.tick)}</span>
        <span className="cw-chip" title="People">People {s.citizens.length}</span>
        <span className="cw-chip" title="Food in store / capacity, and days it will last">Food {s.stock.food}/{cap} <small>({days.toFixed(1)}d)</small></span>
        <span className="cw-chip" title="Wood in store / capacity">Wood {s.stock.wood}/{cap}</span>
        <span className="cw-chip" title="Stone in store / capacity">Stone {s.stock.stone}/{cap}</span>
        {hasCapability(s, 'stone_tool') && <span className="cw-chip" title="Tools made">Tools {s.stock.tools}</span>}
        <span className="cw-spacer" />
        <div className="cw-clock" role="group" aria-label="Simulation speed">
          <button type="button" aria-pressed={rt.paused} onClick={() => rt.togglePause()} title="Pause or resume (Space)">{rt.userPaused ? 'Play' : rt.paused ? 'Paused' : 'Pause'}</button>
          {SPEEDS.map(v => <button key={v} type="button" aria-pressed={rt.speed === v && !rt.userPaused} onClick={() => { if (rt.userPaused) rt.togglePause(); rt.setSpeed(v); }}>{v}x</button>)}
        </div>
      </div>
      {rt.paused && !rt.userPaused && <div className="cw-banner" role="status">Paused while you craft in Merging. Change this in Help.</div>}
      {alerts.map(a => (
        <button key={a.id} type="button" className={`cw-alert cw-alert-${a.severity}`} onClick={() => a.focus && onFocus(a.focus.x, a.focus.y)}>
          <b>{a.severity === 'critical' ? 'Critical' : 'Warning'}:</b> {a.text}
        </button>
      ))}
    </div>
  );
}

/* ---------- bottom toolbar ---------- */

export function Toolbar({ drawer, setDrawer, home }: { drawer: DrawerId | null; setDrawer: (d: DrawerId | null) => void; home: () => void }) {
  const item = (id: DrawerId, label: string) => (
    <button type="button" aria-pressed={drawer === id} onClick={() => setDrawer(drawer === id ? null : id)}>{label}</button>
  );
  return (
    <div className="cw-toolbar" role="toolbar" aria-label="Settlement tools">
      {item('build', 'Build')}{item('jobs', 'Jobs')}{item('log', 'History')}{item('help', 'Help')}
      <button type="button" onClick={home} title="Recentre on the campfire (Home)">Recentre</button>
    </div>
  );
}

/* ---------- drawers ---------- */

export function BuildDrawer({ rt, onPick, active }: { rt: CivRuntime; onPick: (kind: string) => void; active: string | null }) {
  const s = rt.state;
  return (
    <div className="cw-drawer-body">
      <h3>Build</h3>
      <p className="cw-note">Only what your people know how to build is listed. Place it with a click; builders and materials come from the settlement.</p>
      {BUILD_ORDER.map(id => {
        const d = BUILDINGS[id];
        const unlocked = !d.requires || s.unlockedBuildings.includes(id) || hasCapability(s, d.requires);
        const costs = Object.entries(d.cost) as [keyof typeof s.stock, number][];
        const afford = costs.every(([k, n]) => s.stock[k] >= n);
        return (
          <button key={id} type="button" className="cw-card" disabled={!unlocked} aria-pressed={active === id} onClick={() => onPick(id)}>
            <strong>{d.name}</strong>
            <span>{d.description}</span>
            <span>{d.purpose}</span>
            <span className="cw-cost">
              {costs.map(([k, n]) => <em key={k} data-short={s.stock[k] < n ? '1' : '0'}>{n} {k}</em>)}
              {unlocked && !afford && <i> (not enough yet)</i>}
            </span>
            {!unlocked && <span className="cw-locked">Locked: {d.unlockHint}</span>}
          </button>
        );
      })}
    </div>
  );
}

export function JobsDrawer({ rt }: { rt: CivRuntime }) {
  const s = rt.state;
  const st = jobStatuses(s);
  return (
    <div className="cw-drawer-body">
      <h3>Jobs</h3>
      <p className="cw-note">Set how much each kind of work matters. People choose the best feasible task themselves and walk to it.</p>
      {st.map(j => (
        <div key={j.cat} className="cw-job">
          <div className="cw-job-head"><strong>{JOB_LABEL[j.cat]}</strong><span>{j.workers} working</span></div>
          <div className="cw-seg" role="radiogroup" aria-label={`${JOB_LABEL[j.cat]} priority`}>
            {PRIORITY_NAMES.map((name, level) => (
              <button key={name} type="button" role="radio" aria-checked={j.priority === level} onClick={() => rt.setPriority(j.cat, level)}>{name}</button>
            ))}
          </div>
          {j.blocked && j.priority > 0 && <div className="cw-blocked">Blocked: {j.blocked}</div>}
        </div>
      ))}
    </div>
  );
}

const LOG_FILTERS: { id: string; label: string; kinds: CivEvent['kind'][] }[] = [
  { id: 'all', label: 'All', kinds: [] },
  { id: 'people', label: 'People', kinds: ['founded', 'arrival', 'milestone', 'first_harvest'] },
  { id: 'inventions', label: 'Inventions', kinds: ['discovery', 'capability', 'first_craft'] },
  { id: 'buildings', label: 'Buildings', kinds: ['building_started', 'building_done'] },
  { id: 'problems', label: 'Problems', kinds: ['shortage', 'recovery', 'hint'] },
];

export function LogDrawer({ rt }: { rt: CivRuntime }) {
  const [filter, setFilter] = useState('all');
  const f = LOG_FILTERS.find(x => x.id === filter) ?? LOG_FILTERS[0];
  const list = [...rt.state.events].reverse().filter(e => f.kinds.length === 0 || f.kinds.includes(e.kind)).slice(0, 80);
  return (
    <div className="cw-drawer-body">
      <h3>History</h3>
      <div className="cw-seg" role="radiogroup" aria-label="Filter history">
        {LOG_FILTERS.map(x => <button key={x.id} type="button" role="radio" aria-checked={filter === x.id} onClick={() => setFilter(x.id)}>{x.label}</button>)}
      </div>
      <ol className="cw-log">
        {list.map(e => <li key={e.id}><small>Day {dayOf(e.tick)}</small> {e.text}</li>)}
        {list.length === 0 && <li>Nothing here yet.</li>}
      </ol>
    </div>
  );
}

export function HelpDrawer({ rt }: { rt: CivRuntime }) {
  const st = rt.state.settings;
  return (
    <div className="cw-drawer-body">
      <h3>Help and settings</h3>
      <p className="cw-note">You guide the settlement; people do the routine work. Watch for hints from villagers. Open Merging to invent: a discovery unlocks what your people can do, it does not hand over finished goods.</p>
      <ul className="cw-keys">
        <li><kbd>Arrows</kbd> pan, <kbd>+</kbd> <kbd>-</kbd> zoom, <kbd>Home</kbd> recentre</li>
        <li>Click a person, building, tree or tile to inspect it. <kbd>Esc</kbd> clears or cancels building.</li>
        <li><kbd>Space</kbd> pause or resume</li>
      </ul>
      <label className="cw-check"><input type="checkbox" checked={st.pauseWhileCrafting} onChange={e => rt.setSetting('pauseWhileCrafting', e.target.checked)} /> Pause the settlement while Merging is open</label>
      <label className="cw-field">Work intensity
        <select value={st.workIntensity} onChange={e => rt.setSetting('workIntensity', e.target.value as typeof st.workIntensity)}>
          <option value="relaxed">Relaxed: slower, less tiring</option>
          <option value="normal">Normal</option>
          <option value="intense">Intense: faster, more tiring</option>
        </select>
      </label>
      <label className="cw-field">Food reserve target: {st.foodReserveDays} days
        <input type="range" min={1} max={8} value={st.foodReserveDays} onChange={e => rt.setSetting('foodReserveDays', Number(e.target.value))} />
      </label>
      <p className="cw-note">Animation follows your system reduce-motion setting. The simulation pauses when the tab is hidden.</p>
    </div>
  );
}

/* ---------- inspector ---------- */

function Bar({ label, value, good }: { label: string; value: number; good?: boolean }) {
  const pct = Math.round(Math.max(0, Math.min(100, value)));
  return (
    <div className="cw-bar" role="img" aria-label={`${label}: ${pct} of 100`}>
      <span>{label}</span><i><b style={{ width: `${pct}%` }} data-good={good ? '1' : '0'} /></i><em>{pct}</em>
    </div>
  );
}

export function Inspector({ rt, sel, onClose, onFollow }: { rt: CivRuntime; sel: Hit; onClose: () => void; onFollow: (id: string) => void }) {
  const s = rt.state;
  let body: React.ReactNode = null;
  if (sel.type === 'citizen') {
    const c = s.citizens.find(x => x.id === sel.id);
    if (!c) return null;
    const home = c.home ? 'a shelter' : 'the campfire (sleeping rough)';
    body = (
      <>
        <strong>{c.name}</strong>
        <span>{c.age === 'elder' ? 'Elder' : 'Adult'} · {c.trait}</span>
        <span>Now: {c.task.kind === 'idle' ? (c.idleReason || 'Waiting') : c.task.reason}</span>
        {c.carrying && <span>Carrying {c.carrying.n} {c.carrying.res}</span>}
        {c.usingTool && <span>Using: stone tool</span>}
        <Bar label="Hunger" value={c.hunger} /><span className="cw-note">Hunger is {needWord(c.hunger)}</span>
        <Bar label="Energy" value={c.energy} good />
        <span>Sleeps at {home}</span>
        <span>Skills: gather {c.skill.gather.toFixed(1)}, build {c.skill.build.toFixed(1)}, craft {c.skill.craft.toFixed(1)}</span>
        <div className="cw-seg" role="group" aria-label="Ask for a one-off priority (lasts a day)">
          {JOB_CATEGORIES.map((k: JobCategory) => (
            <button key={k} type="button" aria-pressed={c.override?.category === k} onClick={() => rt.override(c.id, c.override?.category === k ? null : k)}>{JOB_LABEL[k]}</button>
          ))}
        </div>
        <button type="button" onClick={() => onFollow(c.id)}>Follow</button>
      </>
    );
  } else if (sel.type === 'building') {
    const b = s.buildings.find(x => x.id === sel.building.id);
    if (!b) return null;
    const label = BUILDING_LABEL[b.kind];
    const def = b.kind === 'campfire' ? null : BUILDINGS[b.kind];
    body = (
      <>
        <strong>{label}</strong>
        <span>{b.state === 'site' ? `Under construction: ${Math.round(b.progress * 100)}%` : b.kind === 'campfire' ? 'Warmth, cooking and the place everyone gathers.' : def?.purpose}</span>
        {b.state === 'site' && <span>{b.workers > 0 ? 'Builders at work' : s.priorities.build === 0 ? 'Blocked: Build jobs are switched off' : 'Waiting for a builder'}</span>}
        {b.kind === 'workshop' && <span>{b.note ? `Idle: ${b.note}` : `Tools made: ${s.stock.tools}`}</span>}
        {b.kind === 'farm' && b.state === 'done' && <span>Harvest ready: {b.amount ?? 0} of {b.max ?? 0}</span>}
        {b.kind === 'storage' && <span>Raises capacity to {capacity(s)} of each good</span>}
        {b.state === 'site' && <button type="button" onClick={() => { rt.cancel(b.id); onClose(); }}>Cancel construction (75% of materials returned)</button>}
      </>
    );
  } else if (sel.type === 'node') {
    const n = s.nodes.find(x => x.id === sel.node.id);
    if (!n) return null;
    body = (
      <>
        <strong>{NODE_LABEL[n.kind]}</strong>
        <span>Remaining: {n.amount} of {n.max}</span>
        <span>{n.kind === 'bush' ? 'Berries slowly regrow.' : 'Does not regrow.'}</span>
        <span>{n.workers > 0 ? `${n.workers} working here` : 'Nobody is working here'}</span>
      </>
    );
  } else {
    body = (
      <>
        <strong>{sel.terrain[0].toUpperCase() + sel.terrain.slice(1)}</strong>
        <span>{sel.terrain === 'water' ? 'Cannot build or walk here' : 'Open ground: can be built on'}</span>
        <span>Tile {sel.x}, {sel.y}</span>
      </>
    );
  }
  return (
    <div className="cw-info" role="region" aria-label="Selection">
      {body}
      <button type="button" onClick={onClose} aria-label="Clear selection">Close</button>
    </div>
  );
}

/* ---------- hints and notices ---------- */

export function HintCard({ rt }: { rt: CivRuntime }) {
  const h = rt.state.activeHint;
  if (!h) return null;
  return (
    <div className="cw-hint" role="status" aria-live="polite">
      <span className="cw-portrait" aria-hidden="true">{h.speaker[0]}</span>
      <div>
        <strong>{h.speaker}</strong>
        <p>{h.text}</p>
        <div className="cw-hint-actions">
          {h.level !== 'guidance' && <button type="button" onClick={() => rt.moreHint()}>Any ideas?</button>}
          <button type="button" onClick={() => rt.dismissHint()}>Dismiss</button>
        </div>
      </div>
    </div>
  );
}

export function Notice({ rt }: { rt: CivRuntime }) {
  const n = rt.notice;
  if (!n) return null;
  return (
    <div className="cw-notice" role="alert">
      {n.kind === 'migrated' ? <span>{n.reason}</span> : (
        <span>
          Your saved settlement could not be loaded ({n.reason}). The original is kept safe under the browser key evo.civworld.v1.corrupt.
          {' '}A new settlement is running; it will not overwrite your other modes.
        </span>
      )}
      {n.kind === 'migrated' ? <button type="button" onClick={() => rt.dismissNotice()}>OK</button>
        : <><button type="button" onClick={() => rt.dismissNotice()}>Continue with the new settlement</button></>}
    </div>
  );
}

export const TILE_PX = TILE;
