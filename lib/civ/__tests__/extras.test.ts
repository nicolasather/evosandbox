import { suggestedGoals, goalsFor } from '../goals';
import { stepWorld } from '../hints';
import { DAY_TICKS } from '../data/config';
import { acceptTrade, createSim, declineTrade, maybeVisitor, seasonOf, tradePreview } from '../sim';
import { applyDiscoveries } from '../bridge';

describe('goals', () => {
  it('suggests discovery and building projects, and only survival goals while food is critical', () => {
    const sim = createSim(1);
    sim.s.stock.food = 30;
    const ids = suggestedGoals(sim.s, 10).map(g => g.id);
    expect(ids).toContain('shelter');
    expect(ids).toContain('dry_goods');
    sim.s.stock.food = 0;
    expect(suggestedGoals(sim.s, 10).every(g => g.kind === 'survival')).toBe(true);
  });
  it('marks goals done from real state, and reveals the build step once the capability exists', () => {
    const sim = createSim(1);
    sim.s.stock.food = 30;
    expect(goalsFor(sim.s).find(g => g.id === 'storage')).toBeUndefined();
    applyDiscoveries(sim.s, ['food_storage']);
    expect(goalsFor(sim.s).find(g => g.id === 'dry_goods')?.done).toBe(true);
    expect(goalsFor(sim.s).find(g => g.id === 'storage')?.done).toBe(false);
  });
});

describe('seasons', () => {
  it('cycles through four gentle seasons and records the change', () => {
    expect(seasonOf(0)).toBe('Spring');
    expect(seasonOf(DAY_TICKS * 6)).toBe('Summer');
    expect(seasonOf(DAY_TICKS * 18)).toBe('Winter');
    expect(seasonOf(DAY_TICKS * 24)).toBe('Spring');
    const sim = createSim(1);
    for (let i = 0; i < DAY_TICKS * 7 + 2; i++) stepWorld(sim);
    expect(sim.s.events.some(e => e.kind === 'season' && e.facts.season === 'Summer')).toBe(true);
  });
});

describe('visiting trader', () => {
  const setup = () => {
    const sim = createSim(1);
    sim.s.tick = DAY_TICKS * 5 + DAY_TICKS / 2;
    sim.s.stock = { food: 20, wood: 28, stone: 2, tools: 0 };
    maybeVisitor(sim);
    return sim;
  };
  it('arrives only with a real surplus and a real shortage, and shows exact quantities', () => {
    const sim = setup();
    expect(sim.s.visitor).not.toBeNull();
    const p = tradePreview(sim.s)!;
    expect(p.give.res).toBe('stone');
    expect(p.want.res).toBe('wood');
    const quiet = createSim(1);
    quiet.s.tick = DAY_TICKS * 5 + DAY_TICKS / 2;
    quiet.s.stock = { food: 10, wood: 10, stone: 10, tools: 0 };
    maybeVisitor(quiet);
    expect(quiet.s.visitor).toBeNull();
  });
  it('accepting moves exactly the offered quantities and is recorded; declining changes nothing', () => {
    const sim = setup();
    const before = { ...sim.s.stock };
    const { give, want } = sim.s.visitor!;
    expect(acceptTrade(sim)).toEqual({ ok: true });
    expect(sim.s.stock[want.res]).toBe(before[want.res] - want.n);
    expect(sim.s.stock[give.res]).toBe(before[give.res] + give.n);
    expect(sim.s.visitor).toBeNull();
    expect(sim.s.events.some(e => e.kind === 'trade' && e.facts.outcome === 'accepted')).toBe(true);
    const again = setup();
    const snapshot = { ...again.s.stock };
    declineTrade(again);
    expect(again.s.stock).toEqual(snapshot);
  });
  it('refuses a trade the settlement cannot afford and the visitor leaves after the window', () => {
    const sim = setup();
    sim.s.stock[sim.s.visitor!.want.res] = 0;
    expect(acceptTrade(sim)).toMatchObject({ ok: false });
    sim.s.tick = sim.s.visitor!.leavesTick;
    maybeVisitor(sim);
    expect(sim.s.visitor).toBeNull();
  });
});
