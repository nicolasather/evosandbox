import { BUILDINGS } from './data/buildings';
import {
  BUSH_REGROW_TICKS, CITIZEN, COOKED_FOOD_MULT, DAY_TICKS, EVENT_LOG_MAX, FARM_REGROW_TICKS, MAX_CITIZENS,
  ARRIVAL_MIN_TICKS, NIGHT_FRACTION, REFUND_FRACTION, SHELTER_SLEEPERS, STOCK, TOOL_GATHER_MULT,
} from './data/config';
import { nearestOf, pathTo, reachFrom, ringAround, type Grid, type Reach } from './path';
import {
  JOB_CATEGORIES, RESOURCES, type BuildingState, type CivEvent, type CivState, type Citizen, type EventKind, type JobCategory,
  type NodeState, type ResourceId, type Stock, type Task,
} from './types';
import { fireLit, coldFactor, isYieldBuilding, isRestDay, lawBuildMult, lawCostMult, lawGatherMult, moduleOn, thirsty } from './modules';
import { childPressure, floodActive, focusBonus, reachFor, stockLimit } from './extras';
import { createWorld, type MapKind, isLand, tileAt, type WorldMap } from './world';

/* ============================================================================
   CIV SIM — deterministic settlement simulation (master design §4, §14, §32).
   Pure functions over plain data. No React, no canvas, no wall clock, no Math.random:
   a given (seed, command log) always yields the same settlement. Rendering reads
   this state and never decides an outcome.
   ========================================================================== */

export interface CivSim { map: WorldMap; s: CivState }

const NAMES = ['Ayo', 'Bran', 'Cael', 'Dara', 'Esme', 'Fenn', 'Gael', 'Hana', 'Ivo', 'Jora', 'Kest', 'Lira', 'Mako', 'Nia'];
const TRAITS: Citizen['trait'][] = ['diligent', 'curious', 'cautious'];

export function nextRand(s: CivState): number {
  s.rng = (s.rng + 0x6d2b79f5) >>> 0;
  let t = s.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}

/** Extra urgency for a nearly empty store, so a low-priority good never stays at zero while a high-priority one piles up. */
const scarcity = (stock: number) => (stock < 12 ? Math.round(16 * (1 - stock / 12)) : 0);

const FOG_RADIUS = 9;
export const isRevealed = (s: CivState, w: number, x: number, y: number) => s.revealed[y * w + x] === '1';

function initialFog(map: WorldMap, fire: { x: number; y: number }): string {
  let out = '';
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) out += Math.hypot(x - fire.x, y - fire.y) <= FOG_RADIUS ? '1' : '0';
  return out;
}

/** Points of interest sit on the unseen edges of the map; the layout is a pure function of the seeded stream. */
function makePois(map: WorldMap, s: CivState): CivState['poi'] {
  const kinds: CivState['poi'][number]['kind'][] = ['stone_ridge', 'fertile_meadow', 'clay_deposit', 'abandoned_camp'];
  const spots: [number, number][] = [[33, 6], [4, 8], [35, 24], [6, 26]];
  return kinds.map((kind, i) => {
    const [bx, by] = spots[i];
    let x = bx; let y = by;
    for (let k = 0; k < 20 && (map.terrain[y * map.w + x] === 'water'); k++) { y--; }
    x += Math.floor(nextRand(s) * 3) - 1;
    return { id: `poi-${i}`, kind, x: Math.max(0, Math.min(map.w - 1, x)), y: Math.max(0, Math.min(map.h - 1, y)), found: false };
  });
}

const newId = (s: CivState, p: string) => `${p}-${s.nextId++}`;
const emptyStock = (): Stock => ({ food: 0, wood: 0, stone: 0, tools: 0 });

export const dayOf = (tick: number) => Math.floor(tick / DAY_TICKS) + 1;
export const timeOfDay = (tick: number) => (tick % DAY_TICKS) / DAY_TICKS;
export const isNight = (tick: number) => timeOfDay(tick) >= 1 - NIGHT_FRACTION;

/** Gentle seasons: six days each. Winter stops berry regrowth and makes people hungrier; nothing else changes. */
export const SEASONS = ['Spring', 'Summer', 'Autumn', 'Winter'] as const;
export const SEASON_DAYS = 6;
export const activeSeason = (s: CivState) => (s.settings.seasons === 'off' ? 'Summer' : seasonOf(s.tick));
export const seasonOf = (tick: number): (typeof SEASONS)[number] => SEASONS[Math.floor((dayOf(tick) - 1) / SEASON_DAYS) % 4];

export function pushEvent(s: CivState, kind: EventKind, facts: CivEvent['facts'], text: string) {
  s.events.push({ id: s.events.length ? s.events[s.events.length - 1].id + 1 : 1, kind, tick: s.tick, facts, text });
  if (s.events.length > EVENT_LOG_MAX) s.events.splice(0, s.events.length - EVENT_LOG_MAX);
}

function makeCitizen(s: CivState, x: number, y: number): Citizen {
  const name = NAMES[(s.nextId + Math.floor(nextRand(s) * NAMES.length)) % NAMES.length];
  return {
    id: newId(s, 'c'), name, age: 'adult', trait: TRAITS[Math.floor(nextRand(s) * TRAITS.length)],
    x, y, px: x, py: y, facing: 's', dist: 0, hunger: 10 + Math.floor(nextRand(s) * 20), energy: 85 + Math.floor(nextRand(s) * 15),
    carrying: null, task: { kind: 'idle', reason: 'Just arrived' }, path: [], commitUntil: 0, home: null,
    skill: { gather: 1, build: 1, craft: 1 }, override: null, idleReason: '', usingTool: false,
    born: -(10 + (s.nextId % 20)) * DAY_TICKS,
  };
}

export function createSim(seed = 1, kind: MapKind = 'classic'): CivSim {
  const map = createWorld(seed, kind);
  const fire = map.buildings[0];
  const s: CivState = {
    v: 1, seed, mapKind: kind, tick: 0, rng: seed * 2654435761 >>> 0, nextId: 1,
    stock: { ...STOCK.start }, priorities: { food: 3, wood: 2, stone: 1, build: 3, craft: 2 },
    citizens: [],
    nodes: map.nodes.map(n => ({ id: n.id, kind: n.kind, x: n.x, y: n.y, amount: n.amount, max: n.amount, workers: 0 })),
    buildings: [{ id: fire.id, kind: 'campfire', x: fire.x, y: fire.y, w: 1, h: 1, state: 'done', progress: 1, paid: {}, workers: 0 }],
    seenDiscoveries: [], capabilities: [], unlockedBuildings: ['shelter'], events: [], hints: {}, activeHint: null, visitor: null, revealed: '', expeditions: [], poi: [], hazard: null, children: [], foodLog: [], migrant: null, family: [], routes: [], laws: [], water: 20, pins: [], notes: [],
    policies: { resourceUse: 'balanced', constructionFocus: 'none', explorationStance: 'balanced', gatheringRadius: 'extended', knowledgeFocus: 'open' },
    tutorial: { step: 0, done: false }, alerts: [],
    milestones: [], settings: { pauseWhileCrafting: false, workIntensity: 'normal', foodReserveDays: 3, seasons: 'on', modules: { trade: true, governance: true, family: true, climate: true, hunting: true, visitors: true, water: true } },
    counters: { gathered: emptyStock(), consumed: emptyStock(), crafted: 0, deaths: 0, spoiled: 0 },
  };
  for (let i = 0; i < 5; i++) {
    const a = (i / 5) * Math.PI * 2;
    s.citizens.push(makeCitizen(s, fire.x + Math.round(Math.cos(a) * 2), fire.y + Math.round(Math.sin(a) * 2)));
  }
  s.citizens[0].age = 'elder';
  s.revealed = initialFog(map, fire);
  s.poi = makePois(map, s);
  pushEvent(s, 'founded', { people: 5 }, 'Five people, one of them an elder, gather around a fire by the river and decide to stay.');
  return { map, s };
}

/* ---------- derived values (selectors) ---------- */

/** Low ground: land within two tiles of the river, the only ground a flood can reach. */
export function nearWater(map: WorldMap, x: number, y: number): boolean {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tileAt(map, x + dx, y + dy) === 'water') return true;
  return false;
}

export const doneBuildings = (s: CivState, kind: string) => s.buildings.filter(b => b.kind === kind && b.state === 'done');
export const capacity = (s: CivState) => STOCK.baseCapacity + STOCK.perStorage * doneBuildings(s, 'storage').length + 60 * doneBuildings(s, 'granary').length + 20 * doneBuildings(s, 'pottery_kiln').length;
export const hasCapability = (s: CivState, id: string) => s.capabilities.some(c => c.id === id);
/** Beds in finished shelters. Without one, people sleep rough by the fire and recover slowly. */
export const sleepCapacity = (s: CivState) => SHELTER_SLEEPERS * doneBuildings(s, 'shelter').length + 4 * doneBuildings(s, 'house').length;
export const foodPerDay = (s: CivState) => Math.max(1, s.citizens.length + childPressure(s)) * ((CITIZEN.hungerPerTick * DAY_TICKS) / CITIZEN.eatRelief);
export const foodDays = (s: CivState) => s.stock.food / foodPerDay(s);

export function buildGrid(sim: CivSim): Grid {
  const { map, s } = sim;
  const blocked = new Uint8Array(map.w * map.h);
  const flooding = !!s.hazard && s.tick >= s.hazard.startTick && s.tick < s.hazard.endTick;
  for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) {
    if (!isLand(map, x, y) || (flooding && nearWater(map, x, y))) blocked[y * map.w + x] = 1;
  }
  for (const n of s.nodes) if (n.amount > 0 || n.kind === 'bush') blocked[n.y * map.w + n.x] = 1;
  for (const b of s.buildings) {
    if (b.kind === 'road' || (isYieldBuilding(b.kind) && b.state === 'done')) continue;
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) blocked[(b.y + j) * map.w + b.x + i] = 1;
  }
  return { w: map.w, h: map.h, blocked };
}

/** Where goods are dropped off and food is eaten: the campfire and finished storage. */
const dropPoints = (s: CivState) => s.buildings.filter(b => b.state === 'done' && (b.kind === 'campfire' || b.kind === 'storage'));

const access = (g: Grid, b: { x: number; y: number; w: number; h: number; kind: string }): [number, number][] => {
  if (isYieldBuilding(b.kind)) {
    const t: [number, number][] = [];
    for (let j = 0; j < b.h; j++) for (let i = 0; i < b.w; i++) t.push([b.x + i, b.y + j]);
    return t;
  }
  return ringAround(g, b.x, b.y, b.w, b.h);
};

/* ---------- placement and construction ---------- */

export type PlacementResult = { ok: true; far: boolean } | { ok: false; reason: string };

export function validatePlacement(sim: CivSim, kind: string, x: number, y: number, rot = false): PlacementResult {
  const def = BUILDINGS[kind];
  const { map, s } = sim;
  if (!def) return { ok: false, reason: 'Unknown building' };
  if (def.requires && !hasCapability(s, def.requires) && !s.unlockedBuildings.includes(kind)) return { ok: false, reason: def.unlockHint };
  const { w, h } = rot && def.rotatable ? { w: def.footprint.h, h: def.footprint.w } : def.footprint;
  for (let j = 0; j < h; j++) for (let i = 0; i < w; i++) {
    const t = tileAt(map, x + i, y + j);
    if (t === null) return { ok: false, reason: 'Outside the map' };
    if (t === 'water') return { ok: false, reason: 'Cannot build on water' };
    if (!def.terrain.includes(t)) return { ok: false, reason: `A ${def.name.toLowerCase()} needs grass or dirt` };
    if (s.nodes.some(n => n.amount > 0 && n.x === x + i && n.y === y + j)) return { ok: false, reason: 'A tree, bush or rock is in the way' };
    if (s.buildings.some(b => x + i >= b.x && x + i < b.x + b.w && y + j >= b.y && y + j < b.y + b.h)) return { ok: false, reason: 'Another building is there' };
  }
  const g = buildGrid(sim);
  const fire = s.buildings[0];
  const who = s.citizens[0];
  const r = reachFrom(g, who ? Math.round(who.x) : fire.x, who ? Math.round(who.y) : fire.y);
  const ring = ringAround(g, x, y, w, h);
  if (!nearestOf(g, r, ring)) return { ok: false, reason: 'No path reaches this spot' };
  for (const [k, v] of Object.entries(def.cost)) if (s.stock[k as ResourceId] < (v ?? 0)) return { ok: false, reason: `Not enough ${k}: needs ${v}` };
  const far = Math.hypot(x - fire.x, y - fire.y) > 12;
  return { ok: true, far };
}

export function placeBuilding(sim: CivSim, kind: string, x: number, y: number, rot = false): { ok: true; id: string } | { ok: false; reason: string } {
  const v = validatePlacement(sim, kind, x, y, rot);
  if (!v.ok) return v;
  const def = BUILDINGS[kind];
  const { s } = sim;
  const paid: Partial<Stock> = {};
  for (const [k, n0] of Object.entries(def.cost)) { const n = k === 'wood' ? Math.ceil((n0 ?? 0) * lawCostMult(s)) : n0 ?? 0; s.stock[k as ResourceId] -= n; paid[k as ResourceId] = n; }
  const b: BuildingState = { id: newId(s, 'b'), kind: kind as BuildingState['kind'], x, y, w: rot && def.rotatable ? def.footprint.h : def.footprint.w, h: rot && def.rotatable ? def.footprint.w : def.footprint.h, state: 'site', progress: 0, paid, workers: 0 };
  s.buildings.push(b);
  pushEvent(s, 'building_started', { building: kind, x, y }, `Work begins on a ${def.name.toLowerCase()}.`);
  return { ok: true, id: b.id };
}

/** Cancelling a site returns REFUND_FRACTION of what was paid (rounded down). Finished buildings cannot be cancelled. */
export function cancelBuilding(sim: CivSim, id: string): { ok: boolean; refunded: Partial<Stock> } {
  const { s } = sim;
  const i = s.buildings.findIndex(b => b.id === id && b.state === 'site');
  if (i < 0) return { ok: false, refunded: {} };
  const b = s.buildings[i];
  const refunded: Partial<Stock> = {};
  for (const [k, n] of Object.entries(b.paid)) {
    const back = Math.floor((n ?? 0) * REFUND_FRACTION);
    refunded[k as ResourceId] = back;
    s.stock[k as ResourceId] = Math.min(capacity(s), s.stock[k as ResourceId] + back);
  }
  s.buildings.splice(i, 1);
  for (const c of s.citizens) if (c.task.targetId === id) interrupt(c, 'The building was cancelled');
  return { ok: true, refunded };
}

export function setPriority(s: CivState, cat: JobCategory, level: number) { s.priorities[cat] = Math.max(0, Math.min(3, Math.round(level))); }

export function assignOverride(s: CivState, citizenId: string, category: JobCategory | null) {
  const c = s.citizens.find(x => x.id === citizenId);
  if (!c) return;
  c.override = category ? { category, until: s.tick + DAY_TICKS } : null;
  c.commitUntil = 0;
}

/* ---------- citizens ---------- */

function interrupt(c: Citizen, why: string) {
  c.task = { kind: 'idle', reason: why };
  c.path = [];
  c.commitUntil = 0;
}

function setWalk(c: Citizen, reach: Reach, g: Grid, goal: { x: number; y: number }, purpose: Task['kind'], targetId: string | undefined, reason: string, left: number) {
  c.path = pathTo(g, reach, goal.x, goal.y);
  c.task = { kind: 'walk', purpose, targetId, tx: goal.x, ty: goal.y, left, reason };
}

interface Option { score: number; goal: { x: number; y: number }; purpose: Task['kind']; targetId?: string; reason: string; left: number; cat?: JobCategory }

const PRIORITY_WORDS = ['off', 'low priority', 'normal priority', 'high priority'];

function sleepSpot(sim: CivSim, c: Citizen, occupancy: Map<string, number>): BuildingState | null {
  const { s } = sim;
  const home = c.home ? s.buildings.find(b => b.id === c.home && b.state === 'done') : null;
  if (home) return home;
  for (const b of [...doneBuildings(s, 'shelter'), ...doneBuildings(s, 'house')]) if ((occupancy.get(b.id) ?? 0) < (b.kind === 'house' ? 4 : SHELTER_SLEEPERS)) return b;
  return s.buildings[0];
}

function decide(sim: CivSim, g: Grid, c: Citizen, occupancy: Map<string, number>, workers: Map<string, number>) {
  const { s } = sim;
  const reach = reachFrom(g, Math.round(c.x), Math.round(c.y));
  const opts: Option[] = [];
  // people avoid standing on the same tile: free spots are preferred, a shared spot is used only when nothing else is open
  const occ = new Set(s.citizens.filter(o => o !== c && (o.task.kind === 'gather' || o.task.kind === 'build' || o.task.kind === 'craft')).map(o => Math.round(o.y) * sim.map.w + Math.round(o.x)));
  const pickNear = (goals: readonly [number, number][]) => nearestOf(g, reach, goals.filter(([x, y]) => !occ.has(y * sim.map.w + x))) ?? nearestOf(g, reach, goals);
  const cap = capacity(s);
  const drops = dropPoints(s);
  const nearestDrop = () => {
    let best: { x: number; y: number; d: number; id: string } | null = null;
    for (const d of drops) {
      const n = nearestOf(g, reach, access(g, d));
      if (n && (!best || n.d < best.d)) best = { ...n, id: d.id };
    }
    return best;
  };

  // 1. needs
  if (c.carrying) {
    const d = nearestDrop();
    if (d) opts.push({ score: 90, goal: d, purpose: 'deposit', targetId: d.id, reason: `Carrying ${c.carrying.res} to the store`, left: 2 });
  }
  // the reserve is for emergencies: ordinary hunger waits when only the reserve is left, real hunger never does
  const reserveUnits = Math.floor(foodPerDay(s) * s.settings.foodReserveDays * 0.5);
  if (c.hunger >= CITIZEN.eatAt && s.stock.food > 0 && (s.stock.food > reserveUnits || c.hunger >= CITIZEN.urgentHunger)) {
    const d = nearestDrop();
    if (d) opts.push({ score: c.hunger >= CITIZEN.urgentHunger ? 140 : 70 + (c.hunger - CITIZEN.eatAt), goal: d, purpose: 'eat', targetId: d.id, left: 3,
      reason: c.hunger >= CITIZEN.urgentHunger ? 'Eating because hunger is critical' : 'Eating because hunger is high' });
  }
  const sleepy = c.energy <= CITIZEN.tiredAt || (isNight(s.tick) && c.energy < 80);
  if (sleepy) {
    const spot = sleepSpot(sim, c, occupancy);
    const n = spot ? nearestOf(g, reach, access(g, spot)) : null;
    if (spot && n) opts.push({ score: c.energy <= CITIZEN.tiredAt ? 120 : 60, goal: n, purpose: 'rest', targetId: spot.id, left: 9999,
      reason: c.energy <= CITIZEN.tiredAt ? 'Resting because they are worn out' : 'Resting because it is night' });
  }

  // 2. jobs
  const consider = (cat: JobCategory, prio: number) => {
    if (prio <= 0 || isRestDay(s)) return; // a day of rest by law: nobody takes a job
    const boost = c.override?.category === cat ? 30 : 0;
    const base = prio * 10 + boost;
    if (cat === 'food') {
      if (s.stock.food >= stockLimit(s, cap)) return;
      // once the reserve is comfortable, at most half the people work on food: the rest are free for wood, stone and building
      const isFood = (id?: string) => !!id && (s.nodes.some(n => n.id === id && (n.kind === 'bush' || n.kind === 'game')) || s.buildings.some(b => b.id === id && isYieldBuilding(b.kind)));
      const onFood = s.citizens.filter(o => o !== c && (o.task.kind === 'gather' || (o.task.kind === 'walk' && o.task.purpose === 'gather')) && isFood(o.task.targetId)).length;
      if (foodDays(s) >= s.settings.foodReserveDays + 2 && onFood >= Math.ceil(s.citizens.length / 2)) return;
      const need = foodDays(s) < s.settings.foodReserveDays ? 14 : 0;
      for (const n of s.nodes) if (n.kind === 'bush' && n.amount > 0 && (workers.get(n.id) ?? 0) < 2) pushNode(n, base + need, 'food');
      if (moduleOn(s, 'hunting') && hasCapability(s, 'hunting')) for (const n of s.nodes) if (n.kind === 'game' && n.amount > 0 && (workers.get(n.id) ?? 0) < 1) pushNode(n, base - 2, 'food');
      for (const b of [...doneBuildings(s, 'farm'), ...doneBuildings(s, 'animal_pen')]) if (!b.paused && (b.amount ?? 0) > 0 && (workers.get(b.id) ?? 0) < BUILDINGS[b.kind].workerSlots) pushBuilding(b, base + 6 + (foodDays(s) < s.settings.foodReserveDays ? 14 : 0), 'gather', 'food', 'Harvesting the farm plot');
    } else if (cat === 'wood') {
      if (s.stock.wood >= stockLimit(s, cap)) return;
      const need = scarcity(s.stock.wood);
      for (const n of s.nodes) if (n.kind === 'tree' && n.amount > 0 && (workers.get(n.id) ?? 0) < 2) pushNode(n, base + need, 'wood');
    } else if (cat === 'stone') {
      if (s.stock.stone >= stockLimit(s, cap)) return;
      const need = scarcity(s.stock.stone);
      for (const n of s.nodes) if (n.kind === 'rock' && n.amount > 0 && (workers.get(n.id) ?? 0) < 2) pushNode(n, base + need, 'stone');
    } else if (cat === 'build') {
      for (const b of s.buildings) if (b.state === 'site' && (workers.get(b.id) ?? 0) < BUILDINGS[b.kind].workerSlots) pushBuilding(b, base + 6, 'build', undefined, `Building a ${BUILDINGS[b.kind].name.toLowerCase()}`);
    } else if (cat === 'craft') {
      if (!hasCapability(s, 'stone_tool') || s.stock.tools >= 6 || s.stock.wood < 2 || s.stock.stone < 1) return;
      for (const b of [...doneBuildings(s, 'workshop'), ...doneBuildings(s, 'forge')]) if ((workers.get(b.id) ?? 0) < BUILDINGS[b.kind].workerSlots) pushBuilding(b, base + (b.kind === 'forge' ? 2 : 0), 'craft', undefined, b.kind === 'forge' ? 'Making tools at the forge' : 'Making a tool at the workshop');
    }
    function pushNode(n: NodeState, score: number, res: ResourceId) {
      const near = pickNear(ringAround(g, n.x, n.y, 1, 1));
      if (!near || near.d > reachFor(s) * 2) return;
      if (!isRevealed(s, sim.map.w, n.x, n.y)) return; // unexplored ground hides its resources
      if (floodActive(s) && nearWater(sim.map, n.x, n.y)) return;
      opts.push({ score: score - near.d * 0.6, goal: near, purpose: 'gather', targetId: n.id, left: CITIZEN.gatherTicks, cat,
        reason: `Gathering ${res} (${PRIORITY_WORDS[s.priorities[cat]]})` });
    }
    function pushBuilding(b: BuildingState, score: number, purpose: Task['kind'], _res: ResourceId | undefined, reason: string) {
      if (b.paused) return; // switched off by the player
      const near = pickNear(access(g, b));
      if (!near) return;
      if (purpose === 'build') score += focusBonus(s, b.kind);
      opts.push({ score: score - near.d * 0.6, goal: near, purpose, targetId: b.id, left: purpose === 'craft' ? CITIZEN.craftTicks : CITIZEN.buildStepTicks, cat, reason });
    }
  };
  for (const cat of JOB_CATEGORIES) consider(cat, s.priorities[cat]);

  // continuity: a small bonus for staying on the same job prevents flip-flopping on near-ties
  for (const o of opts) if (o.targetId && o.targetId === c.task.targetId) o.score += 5;

  opts.sort((a, b) => b.score - a.score);
  const best = opts[0];
  if (!best) {
    c.task = { kind: 'idle', reason: 'Waiting' };
    c.idleReason = idleReason(sim, c);
    return;
  }
  c.idleReason = '';
  const urgent = best.purpose === 'eat' && c.hunger >= CITIZEN.urgentHunger;
  c.commitUntil = s.tick + (urgent ? 0 : CITIZEN.commitTicks);
  const target = best.targetId;
  if (target && best.purpose !== 'deposit' && best.purpose !== 'eat' && best.purpose !== 'rest') workers.set(target, (workers.get(target) ?? 0) + 1);
  if (best.purpose === 'rest' && target) occupancy.set(target, (occupancy.get(target) ?? 0) + 1);
  setWalk(c, reach, g, best.goal, best.purpose, best.targetId, best.reason, best.left);
  if (c.path.length === 0) startWork(c);
}

function idleReason(sim: CivSim, c: Citizen): string {
  const { s } = sim;
  if (JOB_CATEGORIES.every(k => s.priorities[k] === 0)) return 'No jobs are switched on';
  const cap = capacity(s);
  if (s.priorities.food > 0 && s.stock.food >= cap && s.priorities.wood === 0 && s.priorities.stone === 0) return 'Storage is full';
  if (c.carrying) return `Holding ${c.carrying.res} with nowhere to put it`;
  if (s.priorities.food > 0 && !s.nodes.some(n => n.kind === 'bush' && n.amount > 0)) return 'No berries left within reach';
  if (s.priorities.wood > 0 && !s.nodes.some(n => n.kind === 'tree' && n.amount > 0)) return 'No trees left to chop';
  return 'No reachable work right now';
}

function startWork(c: Citizen) {
  const t = c.task;
  const purpose = t.purpose ?? 'idle';
  c.task = { ...t, kind: purpose, left: t.left };
  c.path = [];
}

/* ---------- the tick ---------- */

export function stepSim(sim: CivSim): void {
  const { s } = sim;
  s.tick++;
  const g = buildGrid(sim);

  // worker bookkeeping derived fresh each tick so it can never drift
  const workers = new Map<string, number>();
  const occupancy = new Map<string, number>();
  for (const c of s.citizens) {
    const t = c.task;
    if (!t.targetId) continue;
    const p = t.kind === 'walk' ? t.purpose : t.kind;
    if (p === 'gather' || p === 'build' || p === 'craft') workers.set(t.targetId, (workers.get(t.targetId) ?? 0) + 1);
    if (p === 'rest') occupancy.set(t.targetId, (occupancy.get(t.targetId) ?? 0) + 1);
  }

  // site worker counts are exposed on the buildings so the renderer can show dust and the inspector can explain
  for (const b of s.buildings) b.workers = workers.get(b.id) ?? 0;

  // tools in hand: the first N workers (stable id order) carry one tool each
  s.citizens.forEach((c, i) => { c.usingTool = i < s.stock.tools; });

  const intensity = s.settings.workIntensity === 'intense' ? 1.25 : s.settings.workIntensity === 'relaxed' ? 0.8 : 1;
  for (const c of s.citizens) {
    c.px = c.x; c.py = c.y;
    c.hunger = Math.min(100, c.hunger + CITIZEN.hungerPerTick * (c.task.kind === 'rest' ? 0.6 : 1) * (activeSeason(s) === 'Winter' ? 1.15 : 1));
    if (isRestDay(s) && c.task.kind === 'idle') c.energy = Math.min(100, c.energy + 0.2);
    if (c.task.kind !== 'rest') c.energy = Math.max(0, c.energy - CITIZEN.energyPerTick * coldFactor(s, c) * (s.settings.workIntensity === 'intense' ? 1.4 : s.settings.workIntensity === 'relaxed' ? 0.7 : 1));
    if (c.override && c.override.until <= s.tick) c.override = null;
    runTask(sim, g, c, intensity, workers, occupancy);
  }

  // world regrowth
  for (const n of s.nodes) {
    if (n.kind === 'bush' && n.amount < n.max && activeSeason(s) !== 'Winter' && s.tick % BUSH_REGROW_TICKS === 0 && (workers.get(n.id) ?? 0) === 0) n.amount++;
  }
  for (const b of s.buildings) {
    if (b.kind === 'farm' && b.state === 'done' && (b.amount ?? 0) < (b.max ?? 0) && s.tick % FARM_REGROW_TICKS === 0 && !thirsty(s)) b.amount = (b.amount ?? 0) + 1;
    if (b.kind === 'animal_pen' && b.state === 'done' && (b.amount ?? 0) < (b.max ?? 0) && s.tick % 40 === 0 && s.stock.food > 0) b.amount = (b.amount ?? 0) + 1;
  }
  s.nodes = s.nodes.filter(n => n.kind === 'bush' || n.amount > 0);

  maybeArrival(sim);
  if (s.migrant && s.tick >= s.migrant.leavesTick) declineMigrant(sim);
  updateMilestones(sim);
  if (s.tick % DAY_TICKS === 0 && s.tick > 0) {
    const season = seasonOf(s.tick);
    if (s.settings.seasons !== 'off' && seasonOf(s.tick - 1) !== season) {
      const log = s.foodLog;
      const report = seasonOf(s.tick - 1) === 'Winter' && log.length >= 2 ? ` Winter report: food went from ${log[0]} to ${log[log.length - 1]}.` : '';
      pushEvent(s, 'season', { season }, (season === 'Winter' ? 'Winter begins. Berries stop growing and everyone eats a little more.' : `${season} begins.`) + report);
    }
  }
}

function runTask(sim: CivSim, g: Grid, c: Citizen, intensity: number, workers: Map<string, number>, occupancy: Map<string, number>) {
  const { s } = sim;
  const t = c.task;
  const weak = (c.hunger >= CITIZEN.starvingAt ? 0.5 : 1) * (c.age === 'elder' ? 0.85 : 1) * (thirsty(s) ? 0.8 : 1);
  if (t.kind === 'away') return; // on an expedition: the expedition system owns this person

  if (t.kind === 'idle') {
    if (s.tick >= c.commitUntil || c.hunger >= CITIZEN.urgentHunger) decide(sim, g, c, occupancy, workers);
    // an idle citizen with a fresh task starts moving next tick
    return;
  }

  // urgent hunger interrupts anything except eating and walking to eat
  if (t.kind !== 'eat' && !(t.kind === 'walk' && t.purpose === 'eat') && c.hunger >= CITIZEN.urgentHunger && s.stock.food > 0 && c.task.reason !== 'Eating because hunger is critical') {
    interrupt(c, 'Interrupted by hunger');
    decide(sim, g, c, occupancy, workers);
    return;
  }

  if (t.kind === 'walk') {
    const step = CITIZEN.speed * weak;
    const onRoad = s.buildings.some(b => b.kind === 'road' && b.state === 'done' && b.x === Math.round(c.x) && b.y === Math.round(c.y));
    let budget = onRoad ? step * 1.5 : step;
    while (budget > 0 && c.path.length) {
      const [nx, ny] = c.path[0];
      const dx = nx - c.x;
      const dy = ny - c.y;
      const dist = Math.hypot(dx, dy);
      if (Math.abs(dx) >= Math.abs(dy) && Math.abs(dx) > 0.01) c.facing = dx > 0 ? 'e' : 'w';
      else if (Math.abs(dy) > 0.01) c.facing = dy > 0 ? 's' : 'n';
      if (dist <= budget + 1e-6) { c.x = nx; c.y = ny; c.path.shift(); c.dist += dist; budget -= dist; } else { c.x += (dx / dist) * budget; c.y += (dy / dist) * budget; c.dist += budget; budget = 0; }
    }
    if (c.path.length === 0) startWork(c);
    return;
  }

  // work tasks
  if (t.kind === 'gather') {
    const n = s.nodes.find(x => x.id === t.targetId);
    const farm = !n ? s.buildings.find(b => b.id === t.targetId && isYieldBuilding(b.kind)) : null;
    const src = n ?? farm;
    if (!src || (src.amount ?? 0) <= 0) { finishGather(c, 'The source ran out'); return; }
    t.left = (t.left ?? CITIZEN.gatherTicks) - weak * intensity * lawGatherMult(s) * (c.usingTool ? TOOL_GATHER_MULT : 1) * (1 + (c.skill.gather - 1) * 0.1);
    if (t.left > 0) return;
    const res: ResourceId = farm ? 'food' : n!.kind === 'bush' || n!.kind === 'game' ? 'food' : n!.kind === 'tree' ? 'wood' : 'stone';
    src.amount = (src.amount ?? 0) - 1;
    if (!c.carrying) c.carrying = { res, n: 0 };
    if (c.carrying.res === res) c.carrying.n += n && n.kind === 'game' ? 3 : 1;
    c.skill.gather = Math.min(5, c.skill.gather + 0.01);
    t.left = CITIZEN.gatherTicks;
    if (c.carrying.n >= CITIZEN.carryCap + (hasCapability(s, 'cart') ? 1 : 0) || (src.amount ?? 0) <= 0) finishGather(c, 'Carrying a full load');
    return;
  }

  if (t.kind === 'deposit') {
    if (c.carrying) {
      const room = Math.max(0, capacity(s) - s.stock[c.carrying.res]);
      const put = Math.min(room, c.carrying.n);
      s.stock[c.carrying.res] += put;
      s.counters.gathered[c.carrying.res] += put;
      if (put > 0 && c.carrying.res === 'food' && !s.milestones.includes('first_harvest')) {
        s.milestones.push('first_harvest');
        pushEvent(s, 'first_harvest', { by: c.name }, `${c.name} brings in the first food for the settlement.`);
      }
      c.carrying = null;
    }
    interrupt(c, 'Unloaded at the store');
    return;
  }

  if (t.kind === 'eat') {
    t.left = (t.left ?? 3) - 1;
    if (t.left > 0) return;
    if (s.stock.food > 0) {
      s.stock.food -= 1;
      s.counters.consumed.food += 1;
      c.hunger = Math.max(0, c.hunger - CITIZEN.eatRelief * (hasCapability(s, 'controlled_fire') && fireLit(s) ? COOKED_FOOD_MULT : 1) * (doneBuildings(s, 'drying_rack').length ? 1.2 : 1));
    }
    interrupt(c, 'Finished eating');
    return;
  }

  if (t.kind === 'rest') {
    const home = s.buildings.find(b => b.id === t.targetId);
    const sheltered = !!home && (home.kind === 'shelter' || home.kind === 'house');
    c.energy = Math.min(100, c.energy + (sheltered ? CITIZEN.sleepRecoverPerTick : CITIZEN.roughSleepRecoverPerTick));
    if (sheltered && !c.home) c.home = home!.id;
    if (c.energy >= CITIZEN.rested && !(isNight(s.tick) && c.energy < 100)) interrupt(c, 'Rested');
    else if (c.hunger >= CITIZEN.urgentHunger && s.stock.food > 0) interrupt(c, 'Woken by hunger');
    return;
  }

  if (t.kind === 'build') {
    const b = s.buildings.find(x => x.id === t.targetId && x.state === 'site');
    if (!b) { interrupt(c, 'The site is finished'); return; }
    t.left = (t.left ?? CITIZEN.buildStepTicks) - weak * intensity * lawBuildMult(s) * (1 + (c.skill.build - 1) * 0.1);
    if (t.left > 0) return;
    const def = BUILDINGS[b.kind];
    b.progress = Math.min(1, b.progress + CITIZEN.buildStepTicks / def.buildTicks);
    c.skill.build = Math.min(5, c.skill.build + 0.02);
    t.left = CITIZEN.buildStepTicks;
    if (b.progress >= 1) completeBuilding(sim, b, c);
    return;
  }

  if (t.kind === 'craft') {
    const b = s.buildings.find(x => x.id === t.targetId && x.state === 'done');
    if (!b) { interrupt(c, 'The workshop is gone'); return; }
    if (s.stock.wood < 2 || s.stock.stone < 1) { b.note = s.stock.wood < 2 ? 'Missing wood' : 'Missing stone'; interrupt(c, b.note); return; }
    b.note = undefined;
    t.left = (t.left ?? CITIZEN.craftTicks) - weak * intensity * (1 + (c.skill.craft - 1) * 0.1);
    if (t.left > 0) return;
    const made = b.kind === 'forge' ? 2 : 1;
    s.stock.wood -= 2; s.stock.stone -= 1; s.stock.tools += made; s.counters.crafted += made;
    c.skill.craft = Math.min(5, c.skill.craft + 0.05);
    if (!s.milestones.includes('first_craft')) {
      s.milestones.push('first_craft');
      pushEvent(s, 'first_craft', { by: c.name }, `${c.name} finishes the first tool made in the settlement.`);
    }
    interrupt(c, 'Finished a tool');
    return;
  }
}

function finishGather(c: Citizen, why: string) {
  c.task = { kind: 'idle', reason: why };
  c.commitUntil = 0;
}

function completeBuilding(sim: CivSim, b: BuildingState, by: Citizen) {
  const { s } = sim;
  b.state = 'done';
  b.progress = 1;
  if (b.kind === 'animal_pen') { b.max = 4; b.amount = 4; }
  if (b.kind === 'farm') {
    const meadow = s.poi.some(p => p.kind === 'fertile_meadow' && p.found && Math.hypot(p.x - b.x, p.y - b.y) <= 6);
    b.max = (hasCapability(s, 'irrigation') ? 9 : 6) + (meadow ? 3 : 0); // fertile ground found by an expedition
    b.amount = b.max;
  }
  const def = BUILDINGS[b.kind];
  pushEvent(s, 'building_done', { building: b.kind, x: b.x, y: b.y, by: by.name }, `${by.name} and the others finish the ${def.name.toLowerCase()}.`);
  const key = `first_${b.kind}`;
  if (!s.milestones.includes(key)) s.milestones.push(key);
  for (const c of s.citizens) if (c.task.targetId === b.id && (c.task.kind === 'build' || c.task.purpose === 'build')) interrupt(c, 'The building is finished');
}

function maybeArrival(sim: CivSim) {
  const { s } = sim;
  if (s.tick % DAY_TICKS !== 0 || s.tick < ARRIVAL_MIN_TICKS || s.citizens.length >= MAX_CITIZENS + 4 * doneBuildings(s, 'assembly').length + 2 * doneBuildings(s, 'well').length) return;
  const last = [...s.events].reverse().find(e => e.kind === 'arrival');
  if (last && s.tick - last.tick < ARRIVAL_MIN_TICKS) return;
  const free = sleepCapacity(s) - s.citizens.length - s.children.length;
  if (free <= 0 || foodDays(s) < s.settings.foodReserveDays) return;
  if (s.migrant) return;
  const name = NAMES[(s.nextId + Math.floor(nextRand(s) * NAMES.length)) % NAMES.length];
  // sometimes a whole household asks to stay: two or three people, each needing a bed
  const beds = free;
  const size = moduleOn(s, 'visitors') && beds >= 2 && nextRand(s) < 0.5 ? Math.min(3, beds) : 1;
  s.migrant = { id: newId(s, 'm'), name, arrivedTick: s.tick, leavesTick: s.tick + DAY_TICKS, size };
  pushEvent(s, 'arrival', { name, offer: true }, size > 1 ? `${name}'s household of ${size} arrives and asks to stay. They would need ${size} beds and about ${size} food a day.` : `${name} arrives and asks to stay. There is a free bed and food enough. They would eat about one food a day.`);
}

/** The player accepts a newcomer: only then does the population grow. */
export function acceptMigrant(sim: CivSim): boolean {
  const { s } = sim;
  if (!s.migrant) return false;
  const size = s.migrant.size ?? 1;
  if (sleepCapacity(s) - s.citizens.length - s.children.length < size) return false;
  const fire = s.buildings[0];
  for (let i = 0; i < size; i++) {
    const c = makeCitizen(s, fire.x, fire.y + 1);
    if (i === 0) c.name = s.migrant.name;
    s.citizens.push(c);
  }
  pushEvent(s, 'arrival', { name: s.migrant.name, people: s.citizens.length, size }, size > 1 ? `${s.migrant.name}'s household of ${size} joins the settlement.` : `${s.migrant.name} joins the settlement.`);
  s.migrant = null;
  return true;
}

/** Declining costs nothing: the visitor leaves without hard feelings. */
export function declineMigrant(sim: CivSim) {
  const { s } = sim;
  if (!s.migrant) return;
  pushEvent(s, 'arrival', { name: s.migrant.name, declined: true }, `${s.migrant.name} moves on, with no hard feelings.`);
  s.migrant = null;
}

export function toggleBuildingPause(s: CivState, id: string) { const b = s.buildings.find(x => x.id === id && x.state === 'done'); if (b) b.paused = !b.paused; }

function updateMilestones(sim: CivSim) {
  const { s } = sim;
  for (const n of [8, 10, 12]) {
    const key = `pop_${n}`;
    if (s.citizens.length >= n && !s.milestones.includes(key)) {
      s.milestones.push(key);
      pushEvent(s, 'milestone', { people: n }, `The settlement now has ${n} people.`);
    }
  }
}

export function totalStock(s: CivState): number { return RESOURCES.reduce((a, r) => a + s.stock[r], 0); }

/* ---------- visiting trader (master design section 40) ---------- */

const TRADE_RES: ResourceId[] = ['food', 'wood', 'stone'];

/** A trader arrives only when there is a real surplus to offer and a real shortage to fill. Never silently changes stock. */
export function maybeVisitor(sim: CivSim) {
  const { s } = sim;
  if (s.visitor) {
    if (s.tick >= s.visitor.leavesTick) { pushEvent(s, 'trade', { outcome: 'left' }, 'The trader moves on.'); s.visitor = null; }
    return;
  }
  if (s.tick % DAY_TICKS !== Math.floor(DAY_TICKS / 2) || dayOf(s.tick) < 4) return;
  const last = [...s.events].reverse().find(e => e.kind === 'trade');
  if (last && s.tick - last.tick < DAY_TICKS * (doneBuildings(s, 'market').length ? 1.5 : 3)) return;
  const surplus = [...TRADE_RES].sort((a, b) => s.stock[b] - s.stock[a])[0];
  const scarce = [...TRADE_RES].sort((a, b) => s.stock[a] - s.stock[b])[0];
  if (surplus === scarce || s.stock[surplus] < 14 || s.stock[scarce] > 12) return;
  const n = 4 + Math.floor(nextRand(s) * 3);
  s.visitor = { id: newId(s, 'v'), kind: 'trader', arrivedTick: s.tick, leavesTick: s.tick + DAY_TICKS / 2, give: { res: scarce, n }, want: { res: surplus, n: n + 2 } };
  pushEvent(s, 'trade', { outcome: 'arrived', give: scarce, want: surplus }, 'A traveller arrives with goods we may need.');
}

export type TradeResult = { ok: true } | { ok: false; reason: string };

/** What accepting would leave behind, shown before confirmation. */
export function tradePreview(s: CivState) {
  const v = s.visitor;
  if (!v) return null;
  const after = s.stock[v.want.res] - v.want.n;
  const belowReserve = v.want.res === 'food' && after / foodPerDay(s) < s.settings.foodReserveDays;
  return { give: v.give, want: v.want, enough: s.stock[v.want.res] >= v.want.n, room: capacity(s) - s.stock[v.give.res] >= v.give.n, belowReserve };
}

export function acceptTrade(sim: CivSim): TradeResult {
  const { s } = sim;
  const p = tradePreview(s);
  if (!p || !s.visitor) return { ok: false, reason: 'Nobody is trading right now' };
  if (!p.enough) return { ok: false, reason: `Not enough ${s.visitor.want.res}` };
  if (!p.room) return { ok: false, reason: `No room to keep ${s.visitor.give.res}` };
  s.stock[s.visitor.want.res] -= s.visitor.want.n;
  s.stock[s.visitor.give.res] += s.visitor.give.n;
  pushEvent(s, 'trade', { outcome: 'accepted', gave: s.visitor.want.res, got: s.visitor.give.res, n: s.visitor.give.n }, `Traded ${s.visitor.want.n} ${s.visitor.want.res} for ${s.visitor.give.n} ${s.visitor.give.res}.`);
  s.visitor = null;
  return { ok: true };
}

export function declineTrade(sim: CivSim) {
  const { s } = sim;
  if (!s.visitor) return;
  pushEvent(s, 'trade', { outcome: 'declined' }, 'The trader is turned away and leaves without hard feelings.');
  s.visitor = null;
}
