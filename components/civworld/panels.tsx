'use client';

import { useState } from 'react';
import { BUILDINGS, BUILD_ORDER } from '@/lib/civ/data/buildings';
import { SPEEDS } from '@/lib/civ/data/config';
import { computeAlerts } from '@/lib/civ/hints';
import type { CivRuntime } from '@/lib/civ/runtime';
import { JOB_LABEL, forecastFor, foodSummary, jobStatuses, moodOf, needWord, timeLabel } from '@/lib/civ/selectors';
import { acceptTradeLabel } from './tradeLabel';
import { PhaseChip } from './panels2';
import { BUILDING_FRAME, EMOTE_FRAME, SpriteIcon, TRIGGER_FRAME, eventCard, hintIconFor } from './SpriteIcon';
import { ClimateChips } from './panels3';
import { DISCOVERY_MAP } from '@/lib/civ/data/discoveryMap';
import { goalsFor, suggestedGoals } from '@/lib/civ/goals';
import { capacity, dayOf, doneBuildings, foodDays, hasCapability, seasonOf, sleepCapacity, tradePreview } from '@/lib/civ/sim';
import { JOB_CATEGORIES, type CivEvent, type JobCategory } from '@/lib/civ/types';
import { BUILDING_LABEL, NODE_LABEL, TILE, type Hit } from '@/lib/civ/world';

/* React panels around the settlement canvas. They read simulation state through the
   runtime and issue commands to it; they never contain game rules. */

export type DrawerId = 'build' | 'jobs' | 'goals' | 'trade' | 'journal' | 'log' | 'help';

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
        <span className="cw-chip" title="Day, season and time of day">Day {dayOf(s.tick)} · {seasonOf(s.tick)} · {timeLabel(s.tick)}</span>
        <span className="cw-chip" title="People, and children still growing up">People {s.citizens.length}{s.children.length > 0 ? ` +${s.children.length}` : ''}</span>
        <PhaseChip rt={rt} />
        <MoodChip rt={rt} />
        <ClimateChips rt={rt} />
        <span className="cw-chip" title={foodTitle(s)}><i className="cw-ico" data-i="food" aria-hidden="true" />Food {s.stock.food}/{cap} <small>({days.toFixed(1)}d)</small></span>
        <span className="cw-chip" title="Wood in store / capacity"><i className="cw-ico" data-i="wood" aria-hidden="true" />Wood {s.stock.wood}/{cap}</span>
        <span className="cw-chip" title="Stone in store / capacity"><i className="cw-ico" data-i="stone" aria-hidden="true" />Stone {s.stock.stone}/{cap}</span>
        {hasCapability(s, 'stone_tool') && <span className="cw-chip" title="Tools made"><i className="cw-ico" data-i="tools" aria-hidden="true" />Tools {s.stock.tools}</span>}
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

const foodTitle = (s: CivRuntime['state']) => {
  const f = foodSummary(s);
  return `Stored ${f.stock}. Eating about ${f.perDay.toFixed(1)} a day. Reserve held back for emergencies: ${f.reserve}. Trend over recent days: ${f.trend > 0 ? 'rising' : f.trend < 0 ? 'falling' : 'steady'}. Gathered ${f.gathered}, eaten ${f.eaten}, spoiled ${f.spoiled}.`;
};

export function MoodChip({ rt }: { rt: CivRuntime }) {
  const m = moodOf(rt.state);
  return <span className="cw-chip" data-opt="1" title={`Mood ${m.score}/100. Because of: ${m.contributors.join(', ')}`}>Mood {m.label}</span>;
}

export function MigrantCard({ rt }: { rt: CivRuntime }) {
  const m = rt.state.migrant;
  if (!m) return null;
  const s = rt.state;
  const beds = sleepCapacity(s) - s.citizens.length - s.children.length;
  return (
    <div className="cw-trade" role="region" aria-label="Newcomer">
      <strong>{m.name} asks to stay</strong>
      <span>{m.size > 1 ? `${m.size} people together. ` : ''}Needs {m.size ?? 1} bed(s) ({Math.max(0, beds)} free) and about {m.size ?? 1} food a day. Your reserve is {foodDays(s).toFixed(1)} days.</span>
      <div className="cw-hint-actions">
        <button type="button" disabled={beds < (m.size ?? 1)} onClick={() => rt.welcome()}>Welcome</button>
        <button type="button" onClick={() => rt.turnAway()}>Decline</button>
      </div>
    </div>
  );
}

export type Tool = 'none' | 'explore' | 'note';

export function Toolbar({ drawer, setDrawer, home, tool, setTool }: { drawer: DrawerId | null; setDrawer: (d: DrawerId | null) => void; home: () => void; tool: Tool; setTool: (t: Tool) => void }) {
  const item = (id: DrawerId, label: string) => (
    <button type="button" aria-pressed={drawer === id} onClick={() => setDrawer(drawer === id ? null : id)}>{label}</button>
  );
  return (
    <div className="cw-toolbar" role="toolbar" aria-label="Settlement tools">
      {item('build', 'Build')}{item('jobs', 'Jobs')}{item('goals', 'Goals')}{item('trade', 'Trade')}{item('journal', 'Journal')}{item('log', 'History')}{item('help', 'Help')}
      <button type="button" aria-pressed={tool === 'explore'} onClick={() => setTool(tool === 'explore' ? 'none' : 'explore')} title="Pick unexplored ground to send an expedition">Explore</button>
      <button type="button" aria-pressed={tool === 'note'} onClick={() => setTool(tool === 'note' ? 'none' : 'note')} title="Flag a place on the map">Note</button>
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
            <strong>{BUILDING_FRAME[id] !== undefined && <SpriteIcon sheet="building" frame={BUILDING_FRAME[id]} size={32} />} {d.name}</strong>
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

export function GoalsDrawer({ rt }: { rt: CivRuntime }) {
  const s = rt.state;
  const next = suggestedGoals(s, 6);
  const done = goalsFor(s).filter(g => g.done);
  return (
    <div className="cw-drawer-body">
      <h3>Goals</h3>
      <p className="cw-note">Suggestions follow what the settlement actually needs. Ignore any of them.</p>
      {next.length === 0 && <p>Nothing pressing. Choose your own direction.</p>}
      {next.map(g => <div key={g.id} className="cw-goal"><strong>{g.title}</strong><span>{g.detail}</span><small>{g.kind}</small></div>)}
      {done.length > 0 && <><h3>Done</h3><ul className="cw-keys">{done.map(g => <li key={g.id}>{g.title}</li>)}</ul></>}
    </div>
  );
}

const GRANT_TEXT: Record<string, string> = {
  workshop: 'A workshop can now be built.', storage: 'Protected storage can now be built.', farm: 'Farm plots can now be tilled.',
  cook_food: 'Food goes further when cooked.', make_tools: 'Tools can be made at a workshop.', better_gathering: 'Gathering is a little easier.',
};

/** Knowledge journal: what the settlement learned, what it changed, and what is still needed to use it (master design section 42). */
export function JournalDrawer({ rt, names }: { rt: CivRuntime; names: Record<string, string> }) {
  const s = rt.state;
  const known = DISCOVERY_MAP.filter(m => s.seenDiscoveries.includes(m.discoveryId));
  return (
    <div className="cw-drawer-body">
      <h3>Journal</h3>
      {known.length === 0 && <p className="cw-note">Nothing recorded yet. Inventions made in Merging that your people can use appear here.</p>}
      {known.map(m => {
        const needs: string[] = [];
        for (const g of m.grants) {
          if (g.type === 'unlock_building') {
            const have = s.buildings.some(b => b.kind === g.buildingId && b.state === 'done');
            if (!have) needs.push('a suitable site', 'construction materials', 'an available builder');
          }
        }
        const events = s.events.filter(e => e.facts.discovery === m.discoveryId || (e.kind === 'building_done' && m.grants.some(g => g.type === 'unlock_building' && g.buildingId === e.facts.building)));
        return (
          <div key={m.discoveryId} className="cw-goal">
            <strong>{names[m.discoveryId] ?? m.discoveryId}</strong>
            <span>What changed: {m.grants.map(g => (g.type === 'knowledge' ? g.note : GRANT_TEXT[g.type === 'unlock_building' ? g.buildingId : g.actionId])).join(' ')}</span>
            {needs.length > 0 && <span>Still needed: {needs.join(', ')}</span>}
            {events.map(e => <small key={e.id}>Day {dayOf(e.tick)}: {e.text}</small>)}
          </div>
        );
      })}
      <h3>Buildings</h3>
      <ul className="cw-keys">
        {BUILD_ORDER.map(id => {
          const d = BUILDINGS[id];
          const n = doneBuildings(s, id).length;
          const open = !d.requires || s.unlockedBuildings.includes(id) || hasCapability(s, d.requires);
          return <li key={id}>{d.name}: {n > 0 ? `${n} built` : open ? 'known, not built' : 'not yet known'}</li>;
        })}
      </ul>
      <h3>People</h3>
      <ul className="cw-keys">{s.citizens.map(c => <li key={c.id}>{c.name}: {c.age}, {c.trait}{c.home ? ', has a bed' : ''}</li>)}{s.children.length > 0 && <li>{s.children.length} children growing up</li>}</ul>
      <h3>Glossary</h3>
      <ul className="cw-keys">
        <li><b>Reserve</b>: days of food left at the current rate of eating.</li>
        <li><b>Capacity</b>: how much of each good the settlement can keep. Full means gathering that good stops.</li>
        <li><b>Priority</b>: how much a kind of work matters when people choose a task.</li>
      </ul>
    </div>
  );
}

/** A short, skippable note when Merging unlocks something. It never takes keyboard focus. */
export function DiscoveryToast({ rt }: { rt: CivRuntime }) {
  const [dismissed, setDismissed] = useState(0);
  const s = rt.state;
  const e = [...s.events].reverse().find(x => x.kind === 'discovery');
  if (!e || e.id === dismissed || s.tick - e.tick > 80) return null;
  return (
    <div className="cw-toast" role="status" aria-live="polite">
      <strong>New capability</strong>
      <span>{e.text}</span>
      <button type="button" tabIndex={-1} onClick={() => setDismissed(e.id)}>Skip</button>
    </div>
  );
}

export function TradeCard({ rt }: { rt: CivRuntime }) {
  const v = rt.state.visitor;
  const p = tradePreview(rt.state);
  const [msg, setMsg] = useState('');
  if (!v || !p) return null;
  return (
    <div className="cw-trade" role="region" aria-label="Visiting trader">
      <strong>{v.kind === 'caravan' ? 'A caravan has arrived' : v.kind === 'craftsperson' ? 'A craftsperson is visiting' : v.kind === 'messenger' ? 'A messenger has arrived' : 'A trader has stopped by'}</strong>
      {v.kind === 'craftsperson' && <span>Teaches a better way of working in return for {v.want.n} food and a place to stay.</span>}
      {v.kind === 'messenger' && <span>Brings news of a nearby place.</span>}
      {(v.kind === 'trader' || v.kind === 'caravan') && <span>{acceptTradeLabel(p)}</span>}
      {p.belowReserve && <span className="cw-blocked">This would leave your food below the reserve target.</span>}
      {!p.enough && <span className="cw-blocked">You do not have enough to offer.</span>}
      {msg && <span className="cw-blocked">{msg}</span>}
      <div className="cw-hint-actions">
        <button type="button" disabled={(v.kind === 'trader' || v.kind === 'caravan') && (!p.enough || !p.room)} onClick={() => { const r = v.kind === 'trader' || v.kind === 'caravan' ? rt.accept() : rt.receiveVisitor(); if (!r.ok) setMsg(r.reason); }}>Accept</button>
        <button type="button" onClick={() => rt.decline()}>Decline</button>
      </div>
    </div>
  );
}

const LOG_FILTERS: { id: string; label: string; kinds: CivEvent['kind'][] }[] = [
  { id: 'all', label: 'All', kinds: [] },
  { id: 'people', label: 'People', kinds: ['founded', 'arrival', 'milestone', 'first_harvest', 'season', 'trade'] },
  { id: 'inventions', label: 'Inventions', kinds: ['discovery', 'capability', 'first_craft'] },
  { id: 'buildings', label: 'Buildings', kinds: ['building_started', 'building_done'] },
  { id: 'problems', label: 'Problems', kinds: ['shortage', 'recovery', 'hint'] },
];

export function LogDrawer({ rt, onFocus }: { rt: CivRuntime; onFocus?: (x: number, y: number) => void }) {
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
        {list.map(e => (
          <li key={e.id}>
            {(() => { const c = eventCard(e.kind, e.facts); return c ? <SpriteIcon sheet={c.sheet} frame={c.frame} size={48} /> : null; })()}
            <small>Day {dayOf(e.tick)}</small> {e.text}
            <details>
              <summary>What happened</summary>
              <ul className="cw-keys">{Object.entries(e.facts).map(([k, v]) => <li key={k}>{k}: {String(v)}</li>)}</ul>
              {onFocus && typeof e.facts.x === 'number' && typeof e.facts.y === 'number' && <button type="button" onClick={() => onFocus(Number(e.facts.x) * 32, Number(e.facts.y) * 32)}>Show on map</button>}
            </details>
          </li>
        ))}
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
      <p className="cw-note">Forecast: {forecastFor(rt.state).text}</p>
      <label className="cw-check"><input type="checkbox" checked={st.seasons !== 'off'} onChange={e => rt.setSetting('seasons', e.target.checked ? 'on' : 'off')} /> Seasons (turn off for a steady sandbox)</label>
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
        <span className="cw-villager" data-v={c.id.length % 4} aria-hidden="true" />
        <strong>{c.name} <SpriteIcon sheet="emote" size={16} frame={c.hunger >= 55 ? EMOTE_FRAME.hungry : c.energy <= 30 ? EMOTE_FRAME.tired : c.task.kind === 'idle' ? EMOTE_FRAME.question : EMOTE_FRAME.happy} /></strong>
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
        {b.state === 'done' && (b.kind === 'workshop' || b.kind === 'forge' || b.kind === 'farm') && <button type="button" onClick={() => rt.pauseBuilding(b.id)}>{b.paused ? 'Resume work here' : 'Pause work here'}</button>}
        {b.paused && <span>Paused by you: nobody works here.</span>}
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
        <span>Nearby: {s.nodes.filter(n => n.amount > 0 && Math.hypot(n.x - sel.x, n.y - sel.y) <= 6).length} resources within 6 tiles</span>
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

export function HintCard({ rt, mode = 'bubbles' }: { rt: CivRuntime; mode?: 'bubbles' | 'compact' | 'off' }) {
  const h = rt.state.activeHint;
  if (!h || mode === 'off') return null;
  if (mode === 'compact') return <button type="button" className="cw-alert cw-hint-compact" onClick={() => rt.dismissHint()}>{h.speaker}: {h.text} (dismiss)</button>;
  return (
    <div className="cw-hint" role="status" aria-live="polite">
      <span className="cw-portrait" data-role={h.role} aria-hidden="true" />
      {TRIGGER_FRAME[h.id] !== undefined && <SpriteIcon sheet="eventC" frame={TRIGGER_FRAME[h.id]} size={48} />}
      <div>
        <strong><SpriteIcon sheet="hint" frame={hintIconFor(h.level, h.id)} size={24} /> {h.speaker}</strong>
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
