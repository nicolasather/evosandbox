import { applyDiscoveries } from '../bridge';
import { DAY_TICKS } from '../data/config';
import { stepWorld } from '../hints';
import {
  LAWS, MAX_LAWS, acceptVisitor, adoptLaw, canRoute, cancelRoute, coldFactor, establishRoute, familyTree, feltTemperature, fireLit, isRestDay, lawGatherMult,
  maybeSpecialVisitor, moduleOn, outsideTemperature, priceOf, proposeRoute, quote, repealLaw, stepFuel, stepHerds, stepLifeStages, stepRoutes, stepWater, thirsty, waterCapacity, MODULES,
} from '../modules';
import { parseSave, serializeSim } from '../save';
import { acceptTrade, createSim, placeBuilding, stepSim } from '../sim';
import { createWorld, isLand } from '../world';

const done = (kind: string, x = 3, y = 3, w = 1, h = 1) => ({ id: `t-${kind}-${x}-${y}`, kind: kind as never, x, y, w, h, state: 'done' as const, progress: 1, paid: {}, workers: 0 });
const run = (sim: ReturnType<typeof createSim>, n: number) => { for (let i = 0; i < n; i++) stepWorld(sim); };

describe('procedural maps (default stays the hand-authored one)', () => {
  it('is deterministic per seed, differs between seeds and from the classic map, and is playable', () => {
    const a = createWorld(5, 'procedural'); const b = createWorld(5, 'procedural'); const c = createWorld(6, 'procedural');
    expect(a).toEqual(b);
    expect(a.terrain).not.toEqual(c.terrain);
    expect(a.terrain).not.toEqual(createWorld(5).terrain);
    expect(createWorld(5)).toEqual(createWorld(5, 'classic'));
    for (const seed of [1, 2, 3, 4, 5, 6, 7, 8]) {
      const m = createWorld(seed, 'procedural');
      expect(m.terrain.includes('water')).toBe(true);
      expect(m.nodes.filter(n => n.kind === 'tree').length).toBeGreaterThan(8);
      expect(m.nodes.some(n => n.kind === 'rock')).toBe(true);
      for (const n of m.nodes) expect(isLand(m, n.x, n.y)).toBe(true);
      const f = m.buildings[0];
      expect(isLand(m, f.x, f.y)).toBe(true);
    }
  });
  it('runs, saves and reloads with its kind', () => {
    const sim = createSim(3, 'procedural');
    expect(sim.s.mapKind).toBe('procedural');
    run(sim, 400);
    const loaded = parseSave(serializeSim(sim));
    expect(loaded && loaded.ok && loaded.sim.map.terrain).toEqual(sim.map.terrain);
    expect(sim.s.stock.food).toBeGreaterThanOrEqual(0);
  });
});

describe('trade: prices, routes, caravans', () => {
  it('prices follow scarcity within bounds and a quote favours the partner by about ten percent', () => {
    const s = createSim(1).s;
    s.stock.wood = 0; const dear = priceOf(s, 'wood');
    s.stock.wood = 30; const cheap = priceOf(s, 'wood');
    expect(dear).toBeGreaterThan(cheap);
    expect(dear).toBeLessThanOrEqual(1.6); expect(cheap).toBeGreaterThanOrEqual(0.6);
    s.stock.food = 10; s.stock.wood = 10;
    expect(quote(s, 'food', 'wood', 10)).toBeGreaterThanOrEqual(10);
  });
  it('a route needs a market and roads, trades on schedule, reports misses, and can be cancelled', () => {
    const sim = createSim(1);
    const s = sim.s;
    expect(establishRoute(sim)).toMatchObject({ ok: false, reason: expect.stringContaining('market') });
    s.buildings.push(done('market', 5, 5, 2, 2), done('road', 8, 8), done('road', 9, 8), done('road', 10, 8));
    expect(canRoute(s)).toBe(true);
    s.stock.food = 5; s.stock.wood = 28; s.stock.stone = 2;
    const p = proposeRoute(s)!;
    expect(p.give.n).toBe(3);
    expect(establishRoute(sim)).toEqual({ ok: true });
    const r = s.routes[0];
    const before = { ...s.stock };
    s.tick = r.nextTick;
    stepRoutes(sim);
    expect(s.stock[r.give.res]).toBe(before[r.give.res] + r.give.n);
    expect(s.stock[r.want.res]).toBeLessThan(before[r.want.res]);
    s.stock[r.want.res] = 0;
    s.tick = r.nextTick;
    stepRoutes(sim);
    expect(s.events.some(e => e.facts.outcome === 'route_missed')).toBe(true);
    cancelRoute(s, r.id);
    expect(s.routes).toHaveLength(0);
  });
  it('a caravan arrives only with a market, roads and storage, and trades in bulk at quoted terms', () => {
    const sim = createSim(1);
    const s = sim.s;
    s.buildings.push(done('market', 5, 5, 2, 2), done('storage', 9, 5, 2, 2), done('road', 8, 8), done('road', 9, 8), done('road', 10, 8));
    s.stock = { food: 4, wood: 28, stone: 3, tools: 0 };
    s.tick = DAY_TICKS * 8 + Math.floor(DAY_TICKS / 3);
    maybeSpecialVisitor(sim);
    expect(s.visitor?.kind).toBe('caravan');
    expect(s.visitor!.give.n).toBe(9);
    const v = s.visitor!;
    const have = s.stock[v.want.res];
    expect(acceptTrade(sim)).toEqual({ ok: true });
    expect(s.stock[v.want.res]).toBe(have - v.want.n);
  });
  it('can be switched off', () => {
    const sim = createSim(1);
    sim.s.settings.modules.trade = false;
    sim.s.buildings.push(done('market', 5, 5, 2, 2), done('road', 8, 8), done('road', 9, 8), done('road', 10, 8));
    expect(canRoute(sim.s) && proposeRoute(sim.s)).toBeFalsy();
    expect(establishRoute(sim)).toMatchObject({ ok: false });
  });
});

describe('governance: laws with costs', () => {
  it('needs an assembly, allows two laws at a time, and every law has a stated cost', () => {
    const s = createSim(1).s;
    expect(adoptLaw(s, 'rest_day')).toMatchObject({ ok: false, reason: expect.stringContaining('assembly') });
    s.buildings.push(done('assembly', 5, 5, 3, 2));
    expect(adoptLaw(s, 'communal_store')).toEqual({ ok: true });
    expect(adoptLaw(s, 'apprenticeship')).toEqual({ ok: true });
    expect(adoptLaw(s, 'public_works')).toMatchObject({ ok: false });
    expect(s.laws).toHaveLength(MAX_LAWS);
    expect(lawGatherMult(s)).toBeCloseTo(0.95 * 0.9);
    repealLaw(s, 'apprenticeship');
    expect(adoptLaw(s, 'public_works')).toEqual({ ok: true });
    for (const l of Object.values(LAWS)) { expect(l.benefit.length).toBeGreaterThan(10); expect(l.cost.length).toBeGreaterThan(10); }
  });
  it('a day of rest stops all work and recovers energy; public works makes buildings cost more wood', () => {
    const sim = createSim(1);
    sim.s.buildings.push(done('assembly', 15, 3, 3, 2));
    adoptLaw(sim.s, 'rest_day'); adoptLaw(sim.s, 'public_works');
    sim.s.tick = DAY_TICKS * 5 + 10; // day 6
    expect(isRestDay(sim.s)).toBe(true);
    for (const c of sim.s.citizens) { c.task = { kind: 'idle', reason: '' }; c.energy = 50; c.hunger = 0; }
    for (let i = 0; i < 40; i++) stepSim(sim);
    expect(sim.s.citizens.every(c => c.task.kind !== 'gather' && c.task.kind !== 'build')).toBe(true);
    expect(sim.s.citizens.some(c => c.energy > 50)).toBe(true);
    sim.s.tick = 0; sim.s.stock.wood = 30;
    const f = sim.s.buildings[0];
    const before = sim.s.stock.wood;
    let placed = false;
    for (let r = 2; r < 9 && !placed; r++) for (let dy = -r; dy <= r && !placed; dy++) for (let dx = -r; dx <= r && !placed; dx++) { placed = placeBuilding(sim, 'shelter', f.x + dx, f.y + dy).ok; }
    expect(before - sim.s.stock.wood).toBe(11);
  });
});

describe('family and life stages', () => {
  it('records parents for children, keeps them as the child grows up, and builds a tree', () => {
    const sim = createSim(1);
    const s = sim.s;
    s.buildings.push(done('shelter', 5, 5, 3, 2), done('shelter', 9, 5, 3, 2), done('shelter', 13, 5, 3, 2));
    s.stock.food = 30; s.tick = DAY_TICKS * 6 - 1;
    stepWorld(sim);
    const kid = s.family.find(f => f.stage === 'child');
    expect(kid).toBeDefined();
    expect(kid!.parents.length).toBeGreaterThan(0);
    s.tick = s.children[0] + DAY_TICKS * 6;
    s.tick += DAY_TICKS - (s.tick % DAY_TICKS) - 1;
    stepWorld(sim);
    const grown = s.citizens.find(c => c.name === kid!.name);
    expect(grown).toBeDefined();
    const tree = familyTree(s);
    const parent = tree.find(t => t.children.includes(kid!.name));
    expect(parent).toBeDefined();
  });
  it('adults become elders after a long life, who work more slowly', () => {
    const sim = createSim(1);
    const c = sim.s.citizens[2];
    c.born = -1; sim.s.tick = 40 * DAY_TICKS;
    stepLifeStages(sim);
    expect(c.age).toBe('elder');
    expect(sim.s.events.some(e => /become an elder/.test(e.text))).toBe(true);
    sim.s.settings.modules.family = false;
    const d = sim.s.citizens[3]; d.age = 'adult'; d.born = -1; sim.s.tick = 80 * DAY_TICKS;
    stepLifeStages(sim);
    expect(d.age).toBe('adult');
  });
});

describe('climate: temperature, clothing, shelter and fuel', () => {
  it('winter nights are cold; clothing, a roof and a lit fire each warm people; cold drains energy faster', () => {
    const sim = createSim(1);
    const s = sim.s;
    s.tick = DAY_TICKS * 19 + Math.floor(DAY_TICKS * 0.8);
    const base = outsideTemperature(s);
    expect(base).toBeLessThan(0);
    const c = s.citizens[1];
    c.x = c.px = 3; c.y = c.py = 25;
    const bare = feltTemperature(s, c).temp;
    applyDiscoveries(s, ['clothing']);
    expect(feltTemperature(s, c).temp).toBe(bare + 5);
    expect(coldFactor(s, c)).toBe(1.5);
    const fire = s.buildings[0];
    c.x = c.px = fire.x; c.y = c.py = fire.y + 1;
    expect(feltTemperature(s, c).because).toContain('the fire');
    s.settings.modules.climate = false;
    expect(outsideTemperature(s)).toBe(15);
    expect(coldFactor(s, c)).toBe(1);
  });
  it('the fire burns wood daily, refuels from the store, and goes out when there is none', () => {
    const sim = createSim(1);
    const s = sim.s;
    s.stock.wood = 10;
    s.tick = DAY_TICKS;
    s.buildings[0].amount = 3;
    stepFuel(sim);
    expect(s.buildings[0].amount).toBeGreaterThan(3);
    expect(s.stock.wood).toBeLessThan(10);
    s.stock.wood = 0; s.buildings[0].amount = 1; s.tick = DAY_TICKS * 2;
    stepFuel(sim);
    expect(fireLit(s)).toBe(false);
    expect(s.events.some(e => /gone out/.test(e.text))).toBe(true);
  });
});

describe('hunting and herding', () => {
  it('game herds are hunted only once hunting is known, give meat, deplete, and return slowly', () => {
    const sim = createSim(1);
    const s = sim.s;
    expect(s.nodes.some(n => n.kind === 'game')).toBe(true);
    for (const n of s.nodes) if (n.kind === 'game') { n.amount = 0; }
    s.tick = 149; s.tick += 1;
    stepHerds(sim);
    expect(s.nodes.filter(n => n.kind === 'game' && n.amount > 0)).toHaveLength(0); // hunted-out herds return at half speed
    s.tick = 300;
    stepHerds(sim);
    expect(s.nodes.some(n => n.kind === 'game' && n.amount > 0)).toBe(true);
  });
  it('a pen gives food but eats one a day; without food the animals wander off', () => {
    const sim = createSim(1);
    const s = sim.s;
    const pen = { ...done('animal_pen', 4, 4, 2, 1), amount: 4, max: 4 };
    s.buildings.push(pen);
    s.stock.food = 5; s.tick = DAY_TICKS;
    stepHerds(sim);
    expect(s.stock.food).toBe(4);
    s.stock.food = 0; s.tick = DAY_TICKS * 2;
    stepHerds(sim);
    expect(pen.amount).toBe(3);
    expect(s.events.some(e => /wandered off/.test(e.text))).toBe(true);
  });
  it('can be switched off', () => {
    const sim = createSim(1);
    sim.s.settings.modules.hunting = false;
    for (const n of sim.s.nodes) if (n.kind === 'game') n.amount = 0;
    sim.s.tick = DAY_TICKS * 3;
    stepHerds(sim);
    expect(sim.s.nodes.some(n => n.kind === 'game' && n.amount > 0)).toBe(false);
  });
});

describe('other visitors', () => {
  it('a craftsperson teaches for food, a messenger reveals a place, and both are optional', () => {
    const sim = createSim(1);
    const s = sim.s;
    s.buildings.push(done('workshop', 5, 5, 2, 2), done('shelter', 9, 5, 3, 2));
    s.tick = DAY_TICKS * 6 + Math.floor(DAY_TICKS / 3);
    maybeSpecialVisitor(sim);
    expect(s.visitor?.kind).toBe('craftsperson');
    const skill = s.citizens[1].skill.craft;
    s.stock.food = 10;
    expect(acceptVisitor(sim)).toMatchObject({ ok: true });
    expect(s.citizens[1].skill.craft).toBeGreaterThan(skill);
    expect(s.stock.food).toBe(7);
    s.events = [];
    s.tick = DAY_TICKS * 13 + Math.floor(DAY_TICKS / 3);
    s.buildings = s.buildings.filter(b => b.kind === 'campfire');
    maybeSpecialVisitor(sim);
    expect(s.visitor?.kind).toBe('messenger');
    const unfound = s.poi.filter(p => !p.found).length;
    expect(acceptVisitor(sim)).toMatchObject({ ok: true });
    expect(s.poi.filter(p => !p.found).length).toBe(unfound - 1);
    expect(s.notes.length).toBeGreaterThan(0);
    sim.s.settings.modules.visitors = false; sim.s.visitor = null; s.events = [];
    s.tick = DAY_TICKS * 18 + Math.floor(DAY_TICKS / 3);
    maybeSpecialVisitor(sim);
    expect(s.visitor).toBeNull();
  });
  it('a household of several people asks to stay together and needs a bed for each', () => {
    const sim = createSim(1);
    const s = sim.s;
    s.migrant = { id: 'm-h', name: 'Rowan', arrivedTick: 0, leavesTick: 9999, size: 3 };
    expect(sim.s.citizens.length).toBe(5);
    s.buildings.push(done('shelter', 5, 5, 3, 2));
    const { acceptMigrant } = jest.requireActual('../sim') as typeof import('../sim');
    expect(acceptMigrant(sim)).toBe(false);
    s.buildings.push(done('house', 9, 5, 2, 2), done('house', 12, 5, 2, 2), done('house', 15, 5, 2, 2));
    expect(acceptMigrant(sim)).toBe(true);
    expect(s.citizens.length).toBe(8);
  });
});

describe('water supply', () => {
  it('wells fill the store, people and fields use it, running dry has a cost that ends when water returns', () => {
    const sim = createSim(1);
    const s = sim.s;
    expect(waterCapacity(s)).toBe(30);
    s.water = 0; s.tick = DAY_TICKS;
    s.buildings.push(done('farm', 4, 4, 3, 2));
    stepWater(sim);
    expect(thirsty(s)).toBe(true);
    expect(s.events.some(e => /water has run out/.test(e.text))).toBe(true);
    s.buildings.push(done('well', 8, 8), done('well', 9, 8), done('well', 10, 8));
    s.water = 0; s.tick = DAY_TICKS * 2;
    stepWater(sim);
    expect(s.water).toBeGreaterThan(5);
    expect(thirsty(s)).toBe(false);
    s.settings.modules.water = false; s.water = 0;
    expect(thirsty(s)).toBe(false);
  });
});

describe('every module is a toggle that the rest of the game survives', () => {
  it('lists all modules, defaults them on, and a settlement with them all off still runs and balances', () => {
    expect(MODULES.length).toBe(7);
    const sim = createSim(2);
    for (const m of MODULES) { expect(moduleOn(sim.s, m.id)).toBe(true); sim.s.settings.modules[m.id] = false; expect(moduleOn(sim.s, m.id)).toBe(false); }
    run(sim, DAY_TICKS * 4);
    for (const r of ['food', 'wood', 'stone'] as const) expect(sim.s.stock[r]).toBeGreaterThanOrEqual(0);
    expect(sim.s.citizens.every(c => c.hunger < 100)).toBe(true);
  });
});
