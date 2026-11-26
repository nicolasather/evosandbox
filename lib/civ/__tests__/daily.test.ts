import { DAY_TICKS } from '../data/config';
import { stepDaily } from '../extras';
import { stepWorld } from '../hints';
import { foodSummary, moodOf } from '../selectors';
import { acceptMigrant, createSim, declineMigrant, toggleBuildingPause } from '../sim';

describe('daily upkeep', () => {
  it('spoils exposed food and says why; storage cuts the loss; the food log tracks the trend', () => {
    const sim = createSim(1);
    sim.s.stock.food = 30; sim.s.tick = DAY_TICKS;
    stepDaily(sim);
    expect(sim.s.stock.food).toBeLessThan(30);
    expect(sim.s.counters.spoiled).toBeGreaterThan(0);
    expect(sim.s.events.some(e => e.kind === 'spoilage' && /open/.test(e.text))).toBe(true);
    const exposedLoss = 30 - sim.s.stock.food;
    const guarded = createSim(1);
    guarded.s.buildings.push({ id: 'b-s', kind: 'storage', x: 3, y: 3, w: 2, h: 2, state: 'done', progress: 1, paid: {}, workers: 0 });
    guarded.s.stock.food = 30; guarded.s.tick = DAY_TICKS;
    stepDaily(guarded);
    expect(30 - guarded.s.stock.food).toBeLessThan(exposedLoss);
    expect(foodSummary(sim.s).spoiled).toBe(sim.s.counters.spoiled);
    expect(sim.s.foodLog.length).toBe(1);
  });
  it('postpones the first harvest festival when food is short and holds it when there is a surplus', () => {
    const sim = createSim(1);
    sim.s.buildings.push({ id: 'b-f', kind: 'farm', x: 3, y: 3, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0, amount: 6, max: 6 });
    sim.s.stock.food = 0; sim.s.tick = DAY_TICKS;
    stepDaily(sim);
    expect(sim.s.events.some(e => /postponed/.test(e.text))).toBe(true);
    sim.s.stock.food = 30; sim.s.tick = DAY_TICKS * 2;
    stepDaily(sim);
    expect(sim.s.events.some(e => e.facts.festival === true)).toBe(true);
    expect(sim.s.stock.food).toBeLessThanOrEqual(30); // a memory, not a bonus
  });
  it('overwork is a visible trade-off and mood always explains itself', () => {
    const sim = createSim(1);
    sim.s.settings.workIntensity = 'intense';
    for (const c of sim.s.citizens) c.energy = 20;
    sim.s.tick = DAY_TICKS;
    stepDaily(sim);
    expect(sim.s.events.some(e => /unhappy with the workload/.test(e.text))).toBe(true);
    const m = moodOf(sim.s);
    expect(m.contributors.length).toBeGreaterThan(0);
    expect(m.score).toBeLessThan(moodOf(createSim(1).s).score);
  });
  it('an elder teaches over time', () => {
    const sim = createSim(1);
    const before = sim.s.citizens.filter(c => c.age === 'adult').reduce((a, c) => a + c.skill.gather, 0);
    sim.s.tick = DAY_TICKS; stepDaily(sim);
    expect(sim.s.citizens.filter(c => c.age === 'adult').reduce((a, c) => a + c.skill.gather, 0)).toBeGreaterThan(before);
  });
});

describe('newcomers are offers, not gifts', () => {
  it('an offer appears only with a free bed and a reserve, changes nothing until accepted, and declining is free', () => {
    const sim = createSim(1);
    sim.s.buildings.push({ id: 'b-1', kind: 'shelter', x: 3, y: 3, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0 });
    sim.s.buildings.push({ id: 'b-2', kind: 'shelter', x: 8, y: 3, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0 });
    sim.s.stock.food = 30; sim.s.tick = DAY_TICKS * 2 - 1;
    stepWorld(sim);
    expect(sim.s.migrant).not.toBeNull();
    const people = sim.s.citizens.length;
    expect(acceptMigrant(sim)).toBe(true);
    expect(sim.s.citizens.length).toBe(people + 1);
    expect(sim.s.migrant).toBeNull();
    sim.s.migrant = { id: 'm-x', name: 'Test', arrivedTick: 0, leavesTick: 99999 };
    const stock = { ...sim.s.stock };
    declineMigrant(sim);
    expect(sim.s.citizens.length).toBe(people + 1);
    expect(sim.s.stock).toEqual(stock);
    expect(sim.s.events.some(e => /no hard feelings/.test(e.text))).toBe(true);
  });
  it('cannot be accepted without a free bed', () => {
    const sim = createSim(1);
    sim.s.migrant = { id: 'm-y', name: 'Nia', arrivedTick: 0, leavesTick: 9999 };
    expect(acceptMigrant(sim)).toBe(false);
  });
});

describe('workplaces can be paused by the player', () => {
  it('a paused farm gets no workers', () => {
    const sim = createSim(1);
    sim.s.buildings.push({ id: 'b-farm', kind: 'farm', x: 14, y: 16, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0, amount: 6, max: 6 });
    toggleBuildingPause(sim.s, 'b-farm');
    expect(sim.s.buildings.find(b => b.id === 'b-farm')!.paused).toBe(true);
    for (let i = 0; i < 300; i++) stepWorld(sim);
    expect(sim.s.citizens.some(c => c.task.targetId === 'b-farm' && c.task.kind === 'gather')).toBe(false);
  });
});
