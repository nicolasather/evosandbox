import { RESOURCES } from '../types';
import { DAY_TICKS } from '../data/config';
import { capacity, cancelBuilding, createSim, placeBuilding, setPriority, stepSim, validatePlacement } from '../sim';

const run = (sim: ReturnType<typeof createSim>, n: number) => { for (let i = 0; i < n; i++) stepSim(sim); };
const snapshot = (sim: ReturnType<typeof createSim>) => JSON.stringify(sim.s);

describe('civ simulation', () => {
  it('is deterministic: same seed and ticks give an identical settlement', () => {
    const a = createSim(3); const b = createSim(3);
    run(a, 800); run(b, 800);
    expect(snapshot(a)).toBe(snapshot(b));
    const c = createSim(4); run(c, 800);
    expect(snapshot(c)).not.toBe(snapshot(a));
  });

  it('never lets a stockpile go negative or above capacity, and citizens stay on open ground', () => {
    const sim = createSim(1);
    for (let i = 0; i < 2400; i++) {
      stepSim(sim);
      for (const r of RESOURCES) {
        expect(sim.s.stock[r]).toBeGreaterThanOrEqual(0);
        expect(sim.s.stock[r]).toBeLessThanOrEqual(capacity(sim.s));
      }
    }
    for (const c of sim.s.citizens) {
      expect(sim.map.terrain[Math.round(c.y) * sim.map.w + Math.round(c.x)]).not.toBe('water');
    }
  });

  it('runs the gather -> carry -> store -> consume loop: food and wood change through visible actions', () => {
    const sim = createSim(1);
    const start = { ...sim.s.stock };
    run(sim, DAY_TICKS * 2);
    expect(sim.s.counters.gathered.food + sim.s.counters.gathered.wood).toBeGreaterThan(0);
    expect(sim.s.counters.consumed.food).toBeGreaterThan(0);
    expect(sim.s.stock).not.toEqual(start);
    expect(sim.s.citizens.some(c => c.x !== c.px || c.y !== c.py || c.task.kind !== 'idle')).toBe(true);
  });

  it('accounts for every unit: stock change = gathered - consumed - spent on buildings/tools', () => {
    const sim = createSim(1);
    const before = { ...sim.s.stock };
    run(sim, 600);
    for (const r of ['food', 'wood', 'stone'] as const) {
      expect(sim.s.stock[r]).toBe(before[r] + sim.s.counters.gathered[r] - sim.s.counters.consumed[r]);
    }
  });

  it('turns an idle crew with every job off into explained idleness', () => {
    const sim = createSim(1);
    for (const k of ['food', 'wood', 'stone', 'build', 'craft'] as const) setPriority(sim.s, k, 0);
    run(sim, 40);
    expect(sim.s.citizens.every(c => c.task.kind === 'idle' || c.task.kind === 'walk' || c.task.kind === 'eat' || c.task.kind === 'rest')).toBe(true);
    expect(sim.s.citizens.some(c => c.idleReason.includes('switched on'))).toBe(true);
  });
});

describe('construction', () => {
  const nearFire = (sim: ReturnType<typeof createSim>) => {
    const f = sim.s.buildings[0];
    for (let r = 2; r < 8; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) {
      if (validatePlacement(sim, 'shelter', f.x + dx, f.y + dy).ok) return [f.x + dx, f.y + dy] as const;
    }
    throw new Error('no spot');
  };
  it('rejects water, occupied tiles, locked and unaffordable buildings with a specific reason', () => {
    const sim = createSim(1);
    const water = sim.map.terrain.findIndex(t => t === 'water');
    const wx = water % sim.map.w; const wy = Math.floor(water / sim.map.w);
    const r = validatePlacement(sim, 'shelter', wx, wy);
    expect(r.ok).toBe(false);
    expect(!r.ok && r.reason).toMatch(/water/i);
    const f = sim.s.buildings[0];
    expect(validatePlacement(sim, 'shelter', f.x, f.y)).toMatchObject({ ok: false });
    const [sx, sy] = nearFire(sim);
    expect(validatePlacement(sim, 'workshop', sx, sy)).toMatchObject({ ok: false, reason: expect.stringContaining('Stone Tool') });
    const spot = nearFire(sim);
    sim.s.stock.wood = 3;
    expect(validatePlacement(sim, 'shelter', spot[0], spot[1])).toMatchObject({ ok: false, reason: expect.stringContaining('wood') });
  });
  it('deducts cost on confirm, builds with workers, finishes, and refunds on cancel', () => {
    const sim = createSim(1);
    const [x, y] = nearFire(sim);
    const wood0 = sim.s.stock.wood;
    const placed = placeBuilding(sim, 'shelter', x, y);
    expect(placed.ok).toBe(true);
    expect(sim.s.stock.wood).toBe(wood0 - 10);
    run(sim, 500);
    const b = sim.s.buildings.find(q => q.kind === 'shelter');
    expect(b?.state).toBe('done');
    // a second site, cancelled straight away, returns 75% of the cost
    const [x2, y2] = nearFire(sim);
    const second = placeBuilding(sim, 'shelter', x2, y2);
    expect(second.ok).toBe(true);
    const before = sim.s.stock.wood;
    const res = cancelBuilding(sim, (second as { id: string }).id);
    expect(res.ok).toBe(true);
    expect(sim.s.stock.wood).toBe(Math.min(capacity(sim.s), before + 7));
    expect(sim.s.buildings.some(q => q.id === (second as { id: string }).id)).toBe(false);
  });
});
