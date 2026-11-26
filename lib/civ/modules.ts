import { DAY_TICKS } from './data/config';
import { activeSeason, capacity, dayOf, doneBuildings, foodDays, foodPerDay, hasCapability, isNight, nextRand, pushEvent, sleepCapacity, type CivSim } from './sim';
import { revealAround } from './extras';
import type { Citizen, CivState, FamilyMember, ModuleId, ResourceId, TradeRoute, Visitor } from './types';

/* ============================================================================
   OPTIONAL MODULES (master design Part II, items the design marks P2/P3). Each one is
   behind a switch in `settings.modules`, never blocks the core loop, and only reads or
   changes the same plain state as the rest of the simulation:
     trade    - prices that follow scarcity, trade routes, caravans
     governance - laws with benefits AND costs, adopted at an assembly
     family   - parents, children and life stages (child, adult, elder)
     climate  - temperature, clothing and shelter, campfire fuel
     hunting  - game herds, domestic animals in pens
     visitors - craftspeople, messengers, migrating households
     water    - a stored resource drawn from wells
   ========================================================================== */

export type { ModuleId };
export const MODULES: { id: ModuleId; label: string; what: string }[] = [
  { id: 'trade', label: 'Trade, prices and caravans', what: 'Prices follow scarcity; routes and caravans need a market and roads.' },
  { id: 'governance', label: 'Laws and governance', what: 'Laws have a benefit and a cost; an assembly allows two at a time.' },
  { id: 'family', label: 'Families and life stages', what: 'Parents, children who grow up, elders who retire.' },
  { id: 'climate', label: 'Temperature and fuel', what: 'Cold nights and winters; clothing, shelter and a fuelled fire keep people warm.' },
  { id: 'hunting', label: 'Hunting and herding', what: 'Game herds that can be overhunted; animal pens that need feeding.' },
  { id: 'visitors', label: 'More visitors', what: 'Craftspeople who teach, messengers with news, households that ask to stay.' },
  { id: 'water', label: 'Water supply', what: 'Stored water from wells; thirst and dry fields if it runs out.' },
];
export const defaultModules = (): Record<ModuleId, boolean> => ({ trade: true, governance: true, family: true, climate: true, hunting: true, visitors: true, water: true });
export const moduleOn = (s: CivState, id: ModuleId) => s.settings.modules?.[id] !== false;

/* ---------- trade: prices, routes, caravans ---------- */

const TRADE_GOODS: ResourceId[] = ['food', 'wood', 'stone'];
const BASE_PRICE: Record<ResourceId, number> = { food: 1, wood: 1, stone: 1.5, tools: 4 };

/** Scarcity moves the price: a nearly empty store is expensive to fill, a nearly full one is cheap. Always between 0.6x and 1.6x. */
export function priceOf(s: CivState, res: ResourceId): number {
  const fill = capacity(s) > 0 ? s.stock[res] / capacity(s) : 0.5;
  return Math.round(BASE_PRICE[res] * Math.min(1.6, Math.max(0.6, 1.6 - fill * 1.2)) * 100) / 100;
}

/** How many units of `want` the partner asks for `n` units of `give`, with a 10% margin in their favour. */
export function quote(s: CivState, give: ResourceId, want: ResourceId, n: number): number {
  return Math.max(1, Math.ceil((n * priceOf(s, give) * 1.1) / priceOf(s, want)));
}

const roadCount = (s: CivState) => doneBuildings(s, 'road').length;
export const canRoute = (s: CivState) => doneBuildings(s, 'market').length > 0 && roadCount(s) >= 3;
const PARTNERS = ['the river villages', 'the northern camp', 'the eastern herders', 'the stone traders'];

export function proposeRoute(s: CivState): Omit<TradeRoute, 'id' | 'nextTick'> | null {
  if (!moduleOn(s, 'trade') || !canRoute(s)) return null;
  const sorted = [...TRADE_GOODS].sort((a, b) => s.stock[b] - s.stock[a]);
  const surplus = sorted[0]; const scarce = sorted[sorted.length - 1];
  if (surplus === scarce) return null;
  const n = 3;
  return { partner: PARTNERS[(s.routes.length + dayOf(s.tick)) % PARTNERS.length], give: { res: scarce, n }, want: { res: surplus, n: quote(s, scarce, surplus, n) }, everyDays: 3 };
}

export function establishRoute(sim: CivSim): { ok: true } | { ok: false; reason: string } {
  const { s } = sim;
  if (!moduleOn(s, 'trade')) return { ok: false, reason: 'The trade module is switched off' };
  if (doneBuildings(s, 'market').length === 0) return { ok: false, reason: 'A route needs a market' };
  if (roadCount(s) < 3) return { ok: false, reason: 'A route needs at least 3 road tiles' };
  if (s.routes.length >= 2) return { ok: false, reason: 'Two routes is the most the settlement can keep up' };
  const p = proposeRoute(s);
  if (!p) return { ok: false, reason: 'Nothing to trade: no surplus and no shortage' };
  s.routes.push({ ...p, id: `r-${s.nextId++}`, nextTick: s.tick + p.everyDays * DAY_TICKS });
  pushEvent(s, 'trade', { outcome: 'route', partner: p.partner }, `A trade route is agreed with ${p.partner}: ${p.give.n} ${p.give.res} for ${p.want.n} ${p.want.res} every ${p.everyDays} days.`);
  return { ok: true };
}

export function cancelRoute(s: CivState, id: string) {
  const r = s.routes.find(x => x.id === id);
  if (!r) return;
  s.routes = s.routes.filter(x => x.id !== id);
  pushEvent(s, 'trade', { outcome: 'route_ended', partner: r.partner }, `The route with ${r.partner} is ended.`);
}

/** Routes trade on schedule; a missed exchange says why and never takes goods it cannot pay for. */
export function stepRoutes(sim: CivSim) {
  const { s } = sim;
  if (!moduleOn(s, 'trade')) return;
  for (const r of s.routes) {
    if (s.tick < r.nextTick) continue;
    r.nextTick = s.tick + r.everyDays * DAY_TICKS;
    const need = quote(s, r.give.res, r.want.res, r.give.n);
    const pay = Math.min(need, r.want.n);
    if (s.stock[r.want.res] < pay) { pushEvent(s, 'trade', { outcome: 'route_missed', partner: r.partner }, `The caravan from ${r.partner} found too little ${r.want.res} to trade and went home.`); continue; }
    if (capacity(s) - s.stock[r.give.res] < r.give.n) { pushEvent(s, 'trade', { outcome: 'route_full' }, `No room to keep the ${r.give.res} from ${r.partner}.`); continue; }
    s.stock[r.want.res] -= pay; s.stock[r.give.res] += r.give.n;
    pushEvent(s, 'trade', { outcome: 'route_done', partner: r.partner }, `${r.partner}: received ${r.give.n} ${r.give.res} for ${pay} ${r.want.res}.`);
  }
}

/* ---------- other visitors ---------- */

const visitorGap = (s: CivState) => {
  const last = [...s.events].reverse().find(e => e.kind === 'trade' && (e.facts.outcome === 'arrived' || e.facts.visit === true));
  return last ? s.tick - last.tick : Infinity;
};

/** One visitor at a time, chosen by what the settlement has. Called from the tick; the clock decides when. */
export function maybeSpecialVisitor(sim: CivSim) {
  const { s } = sim;
  if (s.visitor || s.tick % DAY_TICKS !== Math.floor(DAY_TICKS / 3) || dayOf(s.tick) < 5 || visitorGap(s) < DAY_TICKS * 3) return;
  const day = Math.floor(s.tick / DAY_TICKS);
  let v: Visitor | null = null;
  const base = { id: `v-${s.nextId++}`, arrivedTick: s.tick, leavesTick: s.tick + DAY_TICKS / 2 };
  if (moduleOn(s, 'trade') && canRoute(s) && doneBuildings(s, 'storage').length > 0 && day % 4 === 0) {
    const surplus = [...TRADE_GOODS].sort((a, b) => s.stock[b] - s.stock[a])[0]; const scarce = [...TRADE_GOODS].sort((a, b) => s.stock[a] - s.stock[b])[0];
    if (surplus !== scarce && s.stock[surplus] >= 20) v = { ...base, kind: 'caravan', give: { res: scarce, n: 9 }, want: { res: surplus, n: quote(s, scarce, surplus, 9) } };
  }
  if (!v && moduleOn(s, 'visitors')) {
    if (doneBuildings(s, 'workshop').length + doneBuildings(s, 'forge').length > 0 && day % 5 === 1 && sleepCapacity(s) > 0) v = { ...base, kind: 'craftsperson', give: { res: 'tools', n: 0 }, want: { res: 'food', n: 3 } };
    else if (s.poi.some(p => !p.found) && day % 5 === 3) v = { ...base, kind: 'messenger', give: { res: 'food', n: 0 }, want: { res: 'food', n: 0 } };
  }
  if (!v) return;
  s.visitor = v;
  const text = v.kind === 'caravan' ? 'A caravan arrives with goods to exchange in bulk.' : v.kind === 'craftsperson' ? 'A travelling craftsperson asks for food and a roof in return for teaching what they know.' : 'A messenger brings news of a nearby place.';
  pushEvent(s, 'trade', { outcome: 'arrived', kind: v.kind, visit: true }, text);
}

/** The visitor kinds that are not plain trades are accepted here. Returns a message for the player. */
export function acceptVisitor(sim: CivSim): { ok: true; message: string } | { ok: false; reason: string } {
  const { s } = sim;
  const v = s.visitor;
  if (!v) return { ok: false, reason: 'Nobody is visiting' };
  if (v.kind === 'craftsperson') {
    if (s.stock.food < v.want.n) return { ok: false, reason: `Needs ${v.want.n} food for the visit` };
    s.stock.food -= v.want.n;
    for (const c of s.citizens) { c.skill.craft = Math.min(5, c.skill.craft + 0.5); c.skill.build = Math.min(5, c.skill.build + 0.3); }
    pushEvent(s, 'trade', { outcome: 'taught' }, 'The craftsperson stays a few days and teaches a better way of working. Everyone is a little more skilled.');
    s.visitor = null;
    return { ok: true, message: 'Skills improved' };
  }
  if (v.kind === 'messenger') {
    const p = s.poi.find(x => !x.found);
    if (p) {
      revealAround(sim, p.x, p.y, 6);
      p.found = true;
      s.notes.push({ id: `note-${s.nextId++}`, x: p.x, y: p.y, text: `news: ${p.kind.replace('_', ' ')}` });
    }
    pushEvent(s, 'trade', { outcome: 'news' }, p ? 'The messenger describes a place nearby. It is marked on the map.' : 'The messenger has nothing new to tell.');
    s.visitor = null;
    return { ok: true, message: 'News received' };
  }
  return { ok: false, reason: 'Use the trade buttons for traders and caravans' };
}

/* ---------- governance ---------- */

export type LawId = 'rest_day' | 'communal_store' | 'apprenticeship' | 'public_works';
export const LAWS: Record<LawId, { name: string; benefit: string; cost: string }> = {
  rest_day: { name: 'Day of rest', benefit: 'Every sixth day nobody works and everyone recovers; mood improves.', cost: 'One working day in six is lost.' },
  communal_store: { name: 'Communal store', benefit: 'Food is shared and kept together: spoilage is halved.', cost: 'Gathering is 5% slower.' },
  apprenticeship: { name: 'Apprenticeship', benefit: 'Skills grow twice as fast.', cost: 'Gathering is 10% slower while people learn.' },
  public_works: { name: 'Public works', benefit: 'Construction is 25% faster.', cost: 'Every new building costs 10% more wood.' },
};
export const MAX_LAWS = 2;

export function adoptLaw(s: CivState, id: LawId): { ok: true } | { ok: false; reason: string } {
  if (!moduleOn(s, 'governance')) return { ok: false, reason: 'The governance module is switched off' };
  if (doneBuildings(s, 'assembly').length === 0) return { ok: false, reason: 'Laws are decided at an assembly. Build one first.' };
  if (s.laws.includes(id)) return { ok: false, reason: 'Already in force' };
  if (s.laws.length >= MAX_LAWS) return { ok: false, reason: `At most ${MAX_LAWS} laws at a time: repeal one first` };
  s.laws.push(id);
  pushEvent(s, 'milestone', { law: id }, `The assembly adopts the ${LAWS[id].name.toLowerCase()}. ${LAWS[id].cost}`);
  return { ok: true };
}
export function repealLaw(s: CivState, id: LawId) {
  if (!s.laws.includes(id)) return;
  s.laws = s.laws.filter(l => l !== id);
  pushEvent(s, 'milestone', { law: id, repealed: true }, `The ${LAWS[id].name.toLowerCase()} is repealed.`);
}
export const lawOn = (s: CivState, id: LawId) => moduleOn(s, 'governance') && s.laws.includes(id);
export const isRestDay = (s: CivState) => lawOn(s, 'rest_day') && dayOf(s.tick) % 6 === 0;
/** Multiplier on gathering speed from laws (below 1 is slower). */
export const lawGatherMult = (s: CivState) => (lawOn(s, 'communal_store') ? 0.95 : 1) * (lawOn(s, 'apprenticeship') ? 0.9 : 1);
export const lawBuildMult = (s: CivState) => (lawOn(s, 'public_works') ? 1.25 : 1);
export const lawCostMult = (s: CivState) => (lawOn(s, 'public_works') ? 1.1 : 1);

/* ---------- family and life stages ---------- */

export const ELDER_AFTER_DAYS = 40;
export const familyOf = (s: CivState, id: string) => s.family.find(f => f.id === id);

/** Everyone who ever lived in the settlement is in the family log, with parents when known. */
export function ensureFamily(s: CivState) {
  for (const c of s.citizens) if (!s.family.some(f => f.id === c.id)) s.family.push({ id: c.id, name: c.name, parents: [], born: c.born ?? 0, stage: c.age });
}

export function recordBirth(s: CivState, name: string, id: string): FamilyMember {
  ensureFamily(s);
  const adults = s.citizens.filter(c => c.age === 'adult');
  const parents = adults.length >= 2 ? [adults[(s.nextId) % adults.length].id, adults[(s.nextId + 1) % adults.length].id] : adults.map(a => a.id).slice(0, 2);
  const m: FamilyMember = { id, name, parents: [...new Set(parents)], born: s.tick, stage: 'child' };
  s.family.push(m);
  return m;
}

/** Adults who have lived long enough become elders: slower work, but they teach. */
export function stepLifeStages(sim: CivSim) {
  const { s } = sim;
  if (!moduleOn(s, 'family') || s.tick % DAY_TICKS !== 0) return;
  ensureFamily(s);
  for (const c of s.citizens as Citizen[]) {
    if (c.age === 'adult' && (c.born ?? 0) !== undefined && s.tick - (c.born ?? 0) >= ELDER_AFTER_DAYS * DAY_TICKS) {
      c.age = 'elder';
      const f = s.family.find(x => x.id === c.id); if (f) f.stage = 'elder';
      pushEvent(s, 'milestone', { elder: c.name }, `${c.name} has become an elder. They work more slowly now, and teach.`);
    }
  }
}

export function familyTree(s: CivState): { name: string; stage: string; parents: string[]; children: string[] }[] {
  ensureFamily(s);
  const name = (id: string) => s.family.find(f => f.id === id)?.name ?? id;
  return s.family.map(f => ({ name: f.name, stage: f.stage, parents: f.parents.map(name), children: s.family.filter(k => k.parents.includes(f.id)).map(k => k.name) }));
}

/* ---------- climate: temperature, clothing, shelter, fuel ---------- */

const SEASON_TEMP: Record<string, number> = { Spring: 12, Summer: 22, Autumn: 10, Winter: -2 };
const FUEL_MAX = 10;

export function outsideTemperature(s: CivState): number {
  if (!moduleOn(s, 'climate')) return 15;
  return SEASON_TEMP[activeSeason(s)] - (isNight(s.tick) ? 6 : 0);
}

export const fireLit = (s: CivState) => !moduleOn(s, 'climate') || (s.buildings[0].amount ?? FUEL_MAX) > 0;

/** What a person actually feels: clothing, a roof overhead and a lit fire all add warmth. */
export function feltTemperature(s: CivState, c: Citizen): { temp: number; because: string[] } {
  const because: string[] = [];
  let t = outsideTemperature(s);
  if (!moduleOn(s, 'climate')) return { temp: t, because };
  if (hasCapability(s, 'clothing')) { t += 5; because.push('clothing'); }
  if (doneBuildings(s, 'loom').length > 0) { t += 3; because.push('woven cloth'); }
  const home = c.task.kind === 'rest' ? s.buildings.find(b => b.id === c.task.targetId) : null;
  if (home && (home.kind === 'shelter' || home.kind === 'house')) { t += 8; because.push('a roof'); }
  const fire = s.buildings[0];
  if (fireLit(s) && Math.hypot(c.x - fire.x, c.y - fire.y) <= 4) { t += 4; because.push('the fire'); }
  return { temp: t, because };
}
export const coldFactor = (s: CivState, c: Citizen) => (moduleOn(s, 'climate') && feltTemperature(s, c).temp < 0 ? 1.5 : 1);

/** The campfire burns wood every day (twice as much in winter); with no wood it goes out and nobody can cook or warm up. */
export function stepFuel(sim: CivSim) {
  const { s } = sim;
  if (!moduleOn(s, 'climate') || s.tick % DAY_TICKS !== 0 || s.tick === 0) return;
  const fire = s.buildings[0];
  if (fire.amount === undefined) fire.amount = FUEL_MAX;
  const burn = activeSeason(s) === 'Winter' ? 2 : 1;
  fire.amount = Math.max(0, fire.amount - burn);
  if (fire.amount <= 4 && s.stock.wood > 0) {
    const add = Math.min(s.stock.wood, FUEL_MAX - fire.amount);
    s.stock.wood -= add; fire.amount += add;
  }
  if (fire.amount === 0 && !s.milestones.includes('fire_out')) { s.milestones.push('fire_out'); pushEvent(s, 'hazard', { phase: 'fire_out' }, 'The fire has gone out: there is no wood to keep it. People are colder, and cooking has stopped.'); }
  if (fire.amount > 0 && s.milestones.includes('fire_out')) { s.milestones = s.milestones.filter(m => m !== 'fire_out'); pushEvent(s, 'recovery', { fire: true }, 'The fire is lit again.'); }
}

/* ---------- hunting and herding ---------- */

export const GAME_REGROW_TICKS = 150;
export const PEN_REGROW_TICKS = 40;
export const isYieldBuilding = (kind: string) => kind === 'farm' || kind === 'animal_pen';

/** Pens need feeding each day; if the food is not there, animals wander off. A herd that is hunted out comes back only slowly. */
export function stepHerds(sim: CivSim) {
  const { s } = sim;
  if (!moduleOn(s, 'hunting')) return;
  for (const n of s.nodes) if (n.kind === 'game' && n.amount < n.max && s.tick % (n.amount === 0 ? GAME_REGROW_TICKS * 2 : GAME_REGROW_TICKS) === 0) n.amount++;
  if (s.tick % DAY_TICKS !== 0 || s.tick === 0) return;
  for (const b of doneBuildings(s, 'animal_pen')) {
    if (s.stock.food >= 1) { s.stock.food -= 1; s.counters.consumed.food += 1; }
    else if ((b.amount ?? 0) > 0) { b.amount = (b.amount ?? 0) - 1; pushEvent(s, 'shortage', { pen: b.id }, 'There was no food for the animals in the pen, and one wandered off.'); }
  }
}

/* ---------- water ---------- */

export const WATER_BASE_CAP = 30;
export const waterCapacity = (s: CivState) => WATER_BASE_CAP + 20 * doneBuildings(s, 'well').length;

/** Water is drawn from wells (and a little is carried from the river); people and fields use it; running dry has a visible cost. */
export function stepWater(sim: CivSim) {
  const { s } = sim;
  if (!moduleOn(s, 'water') || s.tick % DAY_TICKS !== 0 || s.tick === 0) return;
  const wells = doneBuildings(s, 'well').length;
  const people = s.citizens.reduce((a) => a + 1, 0) + s.children.length * 0.5;
  const farms = doneBuildings(s, 'farm').length;
  const need = people + 2 * farms;
  // people carry water from the river (up to ten a day); wells add much more and are needed once the settlement outgrows the carrying
  s.water = Math.min(waterCapacity(s), s.water + Math.min(need, 10) + 8 * wells);
  s.water = Math.max(0, s.water - need);
  if (s.water === 0 && !s.milestones.includes('dry')) { s.milestones.push('dry'); pushEvent(s, 'shortage', { water: 0 }, 'The water has run out. People are thirsty and the fields are dry. Dig a well or build fewer fields.'); }
  if (s.water > 5 && s.milestones.includes('dry')) { s.milestones = s.milestones.filter(m => m !== 'dry'); pushEvent(s, 'recovery', { water: s.water }, 'There is water again.'); }
}
export const thirsty = (s: CivState) => moduleOn(s, 'water') && s.water <= 0;

/* ---------- one call per tick ---------- */

export function stepModules(sim: CivSim) {
  stepRoutes(sim);
  maybeSpecialVisitor(sim);
  stepLifeStages(sim);
  stepFuel(sim);
  stepHerds(sim);
  stepWater(sim);
  void nextRand; void foodDays; void foodPerDay;
}
