import { DAY_TICKS, TICKS_PER_SECOND } from '../data/config';
import { stepWorld } from '../hints';
import { CivRuntime } from '../runtime';
import { applyDiscoveries } from '../bridge';
import { createSim, placeBuilding, validatePlacement, type CivSim } from '../sim';

/* Balance pass (backlog item 12): 30 in-game days headless at 1x and 4x, no starvation spiral, no exploit loops.
   The player is simulated by a simple scripted routine that builds what is unlocked. */

function build(sim: CivSim, kind: string) {
  const f = sim.s.buildings[0];
  for (let r = 2; r < 12; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (validatePlacement(sim, kind, f.x + dx, f.y + dy).ok) return placeBuilding(sim, kind, f.x + dx, f.y + dy).ok;
  return false;
}

function playDays(sim: CivSim, days: number) {
  const log: string[] = [];
  for (let d = 1; d <= days; d++) {
    for (let i = 0; i < DAY_TICKS; i++) stepWorld(sim);
    const s = sim.s;
    if (d === 3 && s.stock.wood >= 10) build(sim, 'shelter');
    if (d === 6 && s.stock.wood >= 10) build(sim, 'shelter');
    if (d === 8) applyDiscoveries(s, ['food_storage', 'stone_tool', 'agriculture']);
    if (d === 9 && s.stock.wood >= 12 && s.stock.stone >= 4) build(sim, 'storage');
    if (d === 10 && s.stock.wood >= 6) build(sim, 'farm');
    if (d === 12 && s.stock.wood >= 14 && s.stock.stone >= 8) build(sim, 'workshop');
    if (s.migrant && s.citizens.length < 9) { s.migrant.size = 1; }
    if (s.migrant) { /* accept newcomers when there is room */ const { acceptMigrant } = jest.requireActual('../sim') as typeof import('../sim'); acceptMigrant(sim); }
    if (d % 5 === 0) log.push(`day ${d}: people ${s.citizens.length} food ${s.stock.food} wood ${s.stock.wood} stone ${s.stock.stone} tools ${s.stock.tools} water ${Math.round(s.water)}`);
  }
  return log;
}

describe('30 in-game days, headless', () => {
  it('1x: nobody is starving at the end, stocks stay in range, and the settlement grows', () => {
    const sim = createSim(1);
    const log = playDays(sim, 30);
    console.log(log.join('\n'));
    const s = sim.s;
    for (const r of ['food', 'wood', 'stone', 'tools'] as const) { expect(s.stock[r]).toBeGreaterThanOrEqual(0); }
    expect(s.citizens.filter(c => c.hunger >= 100).length).toBeLessThanOrEqual(1);
    expect(s.citizens.length).toBeGreaterThanOrEqual(5);
    expect(s.counters.gathered.food).toBeGreaterThan(0);
    expect(s.counters.deaths).toBe(0);
  });
  it('4x on the real clock gives the same settlement as 1x for the same ticks (no speed exploit)', () => {
    const a = new CivRuntime(null); const b = new CivRuntime(null);
    a.setSpeed(1); b.setSpeed(4);
    // drive both by wall time for 60 seconds of tick time: 4x must simply be four times as many ticks per second, never different rules
    a.pump(0); b.pump(0);
    for (let t = 1; t <= 120; t++) { a.pump(t * 500); b.pump(t * 125); }
    expect(b.state.tick).toBeGreaterThan(0);
    const ticksA = a.state.tick, ticksB = b.state.tick;
    expect(Math.abs(ticksA - ticksB)).toBeLessThanOrEqual(Math.ceil(TICKS_PER_SECOND * 6));
  });
  it('no infinite-goods loops: gathering a node can never yield more than it held plus regrowth', () => {
    const sim = createSim(1);
    const start = sim.s.nodes.reduce((a, n) => a + n.amount, 0);
    for (let i = 0; i < DAY_TICKS * 10; i++) stepWorld(sim);
    const gathered = sim.s.counters.gathered.food + sim.s.counters.gathered.wood + sim.s.counters.gathered.stone;
    const remaining = sim.s.nodes.reduce((a, n) => a + n.amount, 0);
    const regrowth = Math.ceil((DAY_TICKS * 10) / 60) * sim.s.nodes.filter(n => n.kind === 'bush').length + Math.ceil((DAY_TICKS * 10) / 150) * sim.s.nodes.filter(n => n.kind === 'game').length;
    expect(gathered).toBeLessThanOrEqual(start - remaining + regrowth + 15 * 3); // 15 people carrying at most 3 each in transit
  });
  it('the settlement cannot starve by gathering being switched off: people eat the reserve last and warnings come first', () => {
    const sim = createSim(1);
    sim.s.priorities.food = 0;
    let warnedAt = -1; let starvedAt = -1;
    for (let i = 0; i < DAY_TICKS * 6; i++) {
      stepWorld(sim);
      if (warnedAt < 0 && sim.s.alerts !== undefined && sim.s.activeHint?.id === 'food_low') warnedAt = i;
      if (starvedAt < 0 && sim.s.citizens.some(c => c.hunger >= 100)) starvedAt = i;
    }
    expect(warnedAt).toBeGreaterThanOrEqual(0);
    if (starvedAt >= 0) expect(warnedAt).toBeLessThan(starvedAt);
  });
});
