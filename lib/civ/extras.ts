import { DAY_TICKS } from './data/config';
import { SEASON_DAYS, doneBuildings, foodDays, hasCapability, nextRand, pushEvent, sleepCapacity, type CivSim } from './sim';
import type { Citizen, CivState, MapNote, Pin, Policies } from './types';

/* ============================================================================
   EXTRAS — the Part II systems that sit on top of the core loop (master design
   sections 26-48): exploration, hazards, a child cohort, policies, player pins and
   map notes, settlement phases, and the onboarding tutorial. Pure functions over the
   same state; nothing here touches React or the canvas.
   ========================================================================== */

/* ---------- exploration (section 36) ---------- */

const EXPLORE_REVEAL = 8;

export interface ExpeditionPreview { ticks: number; days: number; foodNeeded: number; risk: string; ok: boolean; reason?: string }

export function previewExpedition(sim: CivSim, tx: number, ty: number, party: string[]): ExpeditionPreview {
  const { s, map } = sim;
  const fire = s.buildings[0];
  const dist = Math.hypot(tx - fire.x, ty - fire.y);
  const pace = s.policies.explorationStance === 'cautious' ? 1.4 : s.policies.explorationStance === 'bold' ? 0.7 : 1;
  const ticks = Math.ceil(dist * 4 * pace) * 2;
  const foodNeeded = Math.max(1, Math.ceil(dist / 5) * party.length);
  const risk = s.policies.explorationStance === 'bold' ? 'Faster, but the party returns hungry' : s.policies.explorationStance === 'cautious' ? 'Slow and safe' : 'Steady pace';
  const base = { ticks, days: ticks / DAY_TICKS, foodNeeded, risk };
  if (tx < 0 || ty < 0 || tx >= map.w || ty >= map.h) return { ...base, ok: false, reason: 'Outside the map' };
  if (party.length < 1 || party.length > 2) return { ...base, ok: false, reason: 'Send one or two people' };
  for (const id of party) {
    const c = s.citizens.find(x => x.id === id);
    if (!c || c.task.kind === 'away') return { ...base, ok: false, reason: 'Someone is not available' };
    if (c.hunger >= 80) return { ...base, ok: false, reason: `${c.name} is too hungry to travel` };
  }
  if (s.stock.food < foodNeeded) return { ...base, ok: false, reason: `Needs ${foodNeeded} food for the trip` };
  if (s.revealed[ty * map.w + tx] === '1') return { ...base, ok: false, reason: 'Already explored. Pick unexplored ground' };
  return { ...base, ok: true };
}

export function sendExpedition(sim: CivSim, tx: number, ty: number, party: string[]): { ok: true; id: string } | { ok: false; reason: string } {
  const { s } = sim;
  const p = previewExpedition(sim, tx, ty, party);
  if (!p.ok) return { ok: false, reason: p.reason ?? 'Cannot go' };
  s.stock.food -= p.foodNeeded;
  const id = `x-${s.nextId++}`;
  s.expeditions.push({ id, party, tx, ty, departTick: s.tick, returnTick: s.tick + p.ticks, stance: s.policies.explorationStance, foodTaken: p.foodNeeded });
  for (const cid of party) {
    const c = s.citizens.find(x => x.id === cid)!;
    c.task = { kind: 'away', targetId: id, reason: 'Exploring beyond the camp' };
    c.path = [];
    if (c.carrying) c.carrying = null;
  }
  pushEvent(s, 'explore', { target: `${tx},${ty}`, party: party.length }, 'An expedition sets out toward unexplored ground.');
  return { ok: true, id };
}

export function revealAround(sim: CivSim, cx: number, cy: number, r = EXPLORE_REVEAL) {
  const { s, map } = sim;
  const chars = s.revealed.split('');
  let added = 0;
  for (let y = Math.max(0, cy - r); y <= Math.min(map.h - 1, cy + r); y++) for (let x = Math.max(0, cx - r); x <= Math.min(map.w - 1, cx + r); x++) {
    if (Math.hypot(x - cx, y - cy) <= r && chars[y * map.w + x] !== '1') { chars[y * map.w + x] = '1'; added++; }
  }
  s.revealed = chars.join('');
  return added;
}

const POI_TEXT: Record<string, string> = {
  stone_ridge: 'a stone ridge with plenty of rock',
  fertile_meadow: 'a fertile meadow with deep soil',
  clay_deposit: 'a clay deposit by the water',
  abandoned_camp: 'an abandoned campsite with old tool traces',
};

/** Called every tick: bring back parties whose time is up, reveal the ground, record a report from real map data. */
export function stepExpeditions(sim: CivSim) {
  const { s, map } = sim;
  const fire = s.buildings[0];
  for (const x of [...s.expeditions]) {
    if (s.tick < x.returnTick) continue;
    s.expeditions.splice(s.expeditions.indexOf(x), 1);
    const added = revealAround(sim, x.tx, x.ty);
    const seenNodes = s.nodes.filter(n => n.amount > 0 && Math.hypot(n.x - x.tx, n.y - x.ty) <= EXPLORE_REVEAL).length;
    const found = s.poi.filter(p => !p.found && Math.hypot(p.x - x.tx, p.y - x.ty) <= EXPLORE_REVEAL);
    const lines: string[] = [`${added} tiles mapped`, `${seenNodes} resource nodes in view`];
    for (const p of found) {
      p.found = true;
      lines.push(`found ${POI_TEXT[p.kind]}`);
      if (p.kind === 'abandoned_camp') { s.stock.stone += 2; lines.push('(+2 stone from old traces)'); }
      if (p.kind === 'stone_ridge') for (let k = 0; k < 3; k++) {
        const nx = p.x + k - 1; const ny = p.y + 1;
        if (map.terrain[ny * map.w + nx] === 'grass' && !s.nodes.some(n => n.x === nx && n.y === ny)) s.nodes.push({ id: `rock-poi-${p.id}-${k}`, kind: 'rock', x: nx, y: ny, amount: 30, max: 30, workers: 0 });
      }
      if (!s.notes.some(n => n.x === p.x && n.y === p.y)) s.notes.push({ id: `note-${s.nextId++}`, x: p.x, y: p.y, text: POI_TEXT[p.kind] });
    }
    for (const cid of x.party) {
      const c = s.citizens.find(q => q.id === cid);
      if (!c) continue;
      c.x = c.px = fire.x; c.y = c.py = fire.y + 1;
      c.hunger = Math.min(100, c.hunger + (x.stance === 'bold' ? 25 : 10));
      c.task = { kind: 'idle', reason: 'Back from the expedition' };
      c.commitUntil = 0;
    }
    pushEvent(s, 'explore', { target: `${x.tx},${x.ty}`, tiles: added, nodes: seenNodes, pois: found.length }, `The expedition returns: ${lines.join(', ')}.`);
  }
}

/* ---------- hazards: a signposted flood (section 37.1) ---------- */

const FLOOD_WARNING_TICKS = DAY_TICKS / 2;
const FLOOD_LENGTH = DAY_TICKS / 3;

const yearTicks = () => SEASON_DAYS * 4 * DAY_TICKS; // lazy: sim.ts and this file import each other

/** The first flood is in the second year, on day 4 of spring: never in the opening hours. */
export function nextFloodStart(tick: number): number {
  const k = Math.max(1, Math.floor(tick / yearTicks()));
  let start = k * yearTicks() + 3 * DAY_TICKS;
  if (tick >= start + FLOOD_LENGTH) start += yearTicks();
  return start;
}

export function floodActive(s: CivState): boolean { return !!s.hazard && s.tick >= s.hazard.startTick && s.tick < s.hazard.endTick; }
export function floodWarned(s: CivState): boolean { return !!s.hazard && s.tick >= s.hazard.warnTick && s.tick < s.hazard.startTick; }

export function stepHazard(sim: CivSim) {
  const { s } = sim;
  if (!s.hazard) {
    const start = nextFloodStart(s.tick);
    if (s.tick >= start - FLOOD_WARNING_TICKS) s.hazard = { kind: 'flood', warnTick: start - FLOOD_WARNING_TICKS, startTick: start, endTick: start + FLOOD_LENGTH, phase: 'scheduled' };
    else return;
  }
  const h = s.hazard;
  if (h.phase === 'scheduled' && s.tick >= h.warnTick) {
    h.phase = 'warned';
    pushEvent(s, 'hazard', { phase: 'warning' }, 'Heavy rain upstream. The river will rise: low ground by the water may flood. Work there will pause, nothing will be lost.');
  }
  if (h.phase === 'warned' && s.tick >= h.startTick) {
    h.phase = 'active';
    pushEvent(s, 'hazard', { phase: 'start' }, 'The river is over its banks. People stay on higher ground until it falls.');
  }
  if (s.tick >= h.endTick) {
    pushEvent(s, 'hazard', { phase: 'end' }, 'The water has fallen. Work by the river can start again.');
    s.hazard = null;
  }
}

/* ---------- children and elders (section 33) ---------- */

export const CHILD_GROWTH_TICKS = DAY_TICKS * 6;

export function childPressure(s: CivState): number { return s.children.length * 0.5; }

/** A birth needs a free bed and a food reserve; children later become named adults. Never instant, never free. */
export function stepPopulation(sim: CivSim) {
  const { s } = sim;
  if (s.tick % DAY_TICKS !== 0 || s.tick === 0) return;
  const beds = sleepCapacity(s);
  const people = s.citizens.length + s.children.length;
  if (people < beds && foodDays(s) >= s.settings.foodReserveDays && s.citizens.length >= 2 && s.children.length < 3 && Math.floor(s.tick / DAY_TICKS) % 3 === 0) {
    s.children.push(s.tick);
    pushEvent(s, 'birth', { children: s.children.length }, 'A child is born in the settlement. There is room and food enough.');
  }
  const grown = s.children.filter(b => s.tick - b >= CHILD_GROWTH_TICKS);
  if (grown.length) {
    s.children = s.children.filter(b => s.tick - b < CHILD_GROWTH_TICKS);
    for (let i = 0; i < grown.length; i++) {
      const fire = s.buildings[0];
      const c = makeAdult(s, fire.x, fire.y + 1);
      s.citizens.push(c);
      pushEvent(s, 'birth', { name: c.name, adult: true }, `${c.name} has grown up and joins the workers.`);
    }
  }
}

function makeAdult(s: CivState, x: number, y: number): Citizen {
  const names = ['Ori', 'Pia', 'Quin', 'Rue', 'Sol', 'Tavi'];
  return {
    id: `c-${s.nextId++}`, name: names[Math.floor(nextRand(s) * names.length)], age: 'adult', trait: 'curious', x, y, px: x, py: y, facing: 's', dist: 0,
    hunger: 20, energy: 90, carrying: null, task: { kind: 'idle', reason: 'Just grown' }, path: [], commitUntil: 0, home: null,
    skill: { gather: 1, build: 1, craft: 1 }, override: null, idleReason: '', usingTool: false,
  };
}

/** A citizen who becomes unavailable: reservations are released and nobody keeps walking to a ghost (section 48). */
export function removeCitizen(sim: CivSim, id: string): boolean {
  const { s } = sim;
  const i = s.citizens.findIndex(c => c.id === id);
  if (i < 0) return false;
  s.citizens.splice(i, 1);
  for (const x of s.expeditions) x.party = x.party.filter(p => p !== id);
  s.expeditions = s.expeditions.filter(x => x.party.length > 0);
  s.counters.deaths += 1;
  pushEvent(s, 'milestone', { removed: id }, 'Someone is gone from the settlement. Their work is picked up by the others.');
  return true;
}

/* ---------- policies (section 35) ---------- */

export function policyPreview<K extends keyof Policies>(key: K, value: Policies[K]): string {
  const table: Record<string, string> = {
    'resourceUse:conserve': 'Workers stop gathering a good once the store is 60% full, so finite nodes last longer. Expansion is slower.',
    'resourceUse:balanced': 'Workers gather until the store is full.',
    'resourceUse:free': 'Workers gather freely, even pulling a node to empty. Faster growth, nodes run out sooner.',
    'constructionFocus:housing': 'Builders favour shelters first.',
    'constructionFocus:storage': 'Builders favour storage and granaries first.',
    'constructionFocus:production': 'Builders favour workshops, forges and farms first.',
    'constructionFocus:infrastructure': 'Builders favour roads, markets and assemblies first.',
    'constructionFocus:none': 'Builders take sites by distance only.',
    'explorationStance:cautious': 'Expeditions are about 40% slower and return rested.',
    'explorationStance:balanced': 'Expeditions travel at a steady pace.',
    'explorationStance:bold': 'Expeditions are about 30% faster and return hungry.',
    'gatheringRadius:local': 'Workers only fetch from nearby (12 tiles): shorter carrying, fewer sources.',
    'gatheringRadius:extended': 'Workers fetch from up to 44 tiles away: more sources, longer trips.',
    'knowledgeFocus:open': 'No topic is highlighted.',
    'knowledgeFocus:tools': 'Hints lean toward tools and workshops. Recipes are unchanged.',
    'knowledgeFocus:food': 'Hints lean toward food and storage. Recipes are unchanged.',
    'knowledgeFocus:shelter': 'Hints lean toward shelter and building. Recipes are unchanged.',
  };
  return table[`${key}:${value}`] ?? '';
}

export function setPolicy<K extends keyof Policies>(s: CivState, key: K, value: Policies[K]) { s.policies[key] = value; }

export const reachFor = (s: CivState) => (s.policies.gatheringRadius === 'local' ? 12 : 22);
export const stockLimit = (s: CivState, cap: number) => (s.policies.resourceUse === 'conserve' ? Math.floor(cap * 0.6) : cap);

const FOCUS_KINDS: Record<Policies['constructionFocus'], string[]> = {
  housing: ['shelter'], storage: ['storage', 'granary'], production: ['workshop', 'forge', 'farm'], infrastructure: ['road', 'market', 'assembly'], none: [],
};
export const focusBonus = (s: CivState, kind: string) => (FOCUS_KINDS[s.policies.constructionFocus].includes(kind) ? 8 : 0);

/* ---------- pins and map notes (sections 41, 42) ---------- */

export function addPin(s: CivState, text: string): Pin | null {
  const t = text.trim().slice(0, 80);
  if (!t) return null;
  const p = { id: `pin-${s.nextId++}`, text: t, done: false };
  s.pins.push(p);
  return p;
}
export function togglePin(s: CivState, id: string) { const p = s.pins.find(x => x.id === id); if (p) p.done = !p.done; }
export function removePin(s: CivState, id: string) { s.pins = s.pins.filter(p => p.id !== id); }
export function addNote(s: CivState, x: number, y: number, text: string): MapNote | null {
  const t = text.trim().slice(0, 60);
  if (!t) return null;
  const n = { id: `note-${s.nextId++}`, x, y, text: t };
  s.notes.push(n);
  return n;
}
export function removeNote(s: CivState, id: string) { s.notes = s.notes.filter(n => n.id !== id); }

/* ---------- settlement phases (section 9) ---------- */

export const PHASES = ['Small human group', 'Permanent settlement', 'Growing village', 'Complex settlement', 'Later development'] as const;

/** Phase comes from what the settlement can do and has built, never from a calendar. */
export function phaseOf(s: CivState): { index: number; name: string; next: string } {
  const has = (id: string) => hasCapability(s, id);
  let i = 0;
  if (doneBuildings(s, 'shelter').length > 0 && (has('food_storage') || has('agriculture'))) i = 1;
  if (i >= 1 && (doneBuildings(s, 'workshop').length + doneBuildings(s, 'farm').length >= 2 || has('trade')) && s.citizens.length >= 6) i = 2;
  if (i >= 2 && (has('writing') || has('record_keeping') || has('assembly')) && doneBuildings(s, 'storage').length + doneBuildings(s, 'granary').length > 0) i = 3;
  if (i >= 3 && (has('smelting') || has('mathematics'))) i = 4;
  const nexts = [
    'Build a shelter and learn to store or grow food.',
    'Run two workshops or farms (or learn to trade) and reach 6 people.',
    'Learn to keep records or build a public assembly, and have protected storage.',
    'Work metal or learn mathematics.',
    'Choose your own direction.',
  ];
  return { index: i, name: PHASES[i], next: nexts[i] };
}

/* ---------- onboarding (section 27.1) ---------- */

export const TUTORIAL_STEPS = [
  { id: 'select', text: 'Click a villager to see what they are doing and why.' },
  { id: 'jobs', text: 'Open Jobs and choose what matters most: food, wood or stone.' },
  { id: 'shelter', text: 'Open Build and place a Shelter near the fire.' },
  { id: 'merging', text: 'Open Merging beside the world and try combining materials. A discovery unlocks what your people can do.' },
] as const;

export function tutorialEvent(s: CivState, id: string) {
  if (s.tutorial.done) return;
  if (TUTORIAL_STEPS[s.tutorial.step]?.id === id) {
    s.tutorial.step++;
    if (s.tutorial.step >= TUTORIAL_STEPS.length) s.tutorial.done = true;
  }
}
export function skipTutorial(s: CivState) { s.tutorial.done = true; }

/* ---------- one call per tick ---------- */

/** Once a day: weather and storage, the food log, teaching, the first festival, and the cost of overwork. */
export function stepDaily(sim: CivSim) {
  const { s } = sim;
  if (s.tick === 0 || s.tick % DAY_TICKS !== 0) return;
  // exposed food spoils a little; protected storage cuts the loss (explained in the event, never silent)
  const protectedStore = doneBuildings(s, 'storage').length + doneBuildings(s, 'granary').length + doneBuildings(s, 'drying_rack').length > 0;
  if (s.stock.food > 10) {
    const lost = Math.floor((s.stock.food - 10) * (protectedStore ? 0.02 : 0.1));
    if (lost > 0) {
      s.stock.food -= lost;
      s.counters.spoiled += lost;
      if (lost >= 2) pushEvent(s, 'spoilage', { lost, protectedStore }, protectedStore ? `${lost} food spoiled despite the store.` : `Rain and damp spoiled ${lost} food left in the open. Protected storage would cut this.`);
    }
  }
  s.foodLog.push(s.stock.food);
  if (s.foodLog.length > 6) s.foodLog.shift();
  // knowledge passes on: an elder teaches the least skilled adult
  const elder = s.citizens.find(c => c.age === 'elder');
  const pupil = [...s.citizens].filter(c => c.age === 'adult').sort((a, b) => a.skill.gather + a.skill.build + a.skill.craft - (b.skill.gather + b.skill.build + b.skill.craft))[0];
  if (elder && pupil) { const step = doneBuildings(s, 'records_hall').length ? 0.1 : 0.05; pupil.skill.gather = Math.min(5, pupil.skill.gather + step); pupil.skill.build = Math.min(5, pupil.skill.build + step); }
  // the first harvest festival happens only when there is food to spare, and the history says why it was postponed
  if (doneBuildings(s, 'farm').length > 0 && !s.milestones.includes('festival')) {
    if (foodDays(s) >= s.settings.foodReserveDays + 1) {
      s.milestones.push('festival');
      pushEvent(s, 'milestone', { festival: true }, 'The first harvest. Everyone gathers by the fire to share it. It gives no bonus, it is simply remembered.');
    } else if (!s.milestones.includes('festival_postponed')) {
      s.milestones.push('festival_postponed');
      pushEvent(s, 'milestone', { festival: false }, 'The harvest feast is postponed: there is not enough food to spare yet.');
    }
  }
  // intense work wears people down: a visible trade-off with a way out
  const avg = s.citizens.reduce((a, c) => a + c.energy, 0) / Math.max(1, s.citizens.length);
  if (s.settings.workIntensity === 'intense' && avg < 45 && !s.milestones.includes('workload_unrest')) {
    s.milestones.push('workload_unrest');
    pushEvent(s, 'milestone', { energy: Math.round(avg) }, 'Some people are unhappy with the workload. Keep it, or set work intensity back to normal in Help.');
  }
  if (s.settings.workIntensity !== 'intense') s.milestones = s.milestones.filter(m => m !== 'workload_unrest');
}

export function stepExtras(sim: CivSim) {
  stepDaily(sim);
  stepExpeditions(sim);
  stepHazard(sim);
  stepPopulation(sim);
}
