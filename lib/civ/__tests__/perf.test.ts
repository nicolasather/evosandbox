import { stepWorld } from '../hints';
import { createSim } from '../sim';

/* Performance (backlog item 6): the simulation with 200 citizens. Rendering FPS is measured in the browser
   (see QA_REPORT.md); here the per-tick cost of the pure simulation is bounded so the fixed 4 Hz clock always has headroom. */

describe('simulation cost with 200 citizens', () => {
  it('stays inside the tick budget (250 ms at 4 Hz) with a wide margin', () => {
    const sim = createSim(1);
    const base = sim.s.citizens[1];
    for (let i = 0; i < 195; i++) sim.s.citizens.push({ ...base, id: `c-bulk-${i}`, name: `P${i}`, x: base.x + (i % 7), y: base.y + (i % 5), px: base.x, py: base.y, path: [], task: { kind: 'idle', reason: '' } });
    expect(sim.s.citizens.length).toBe(200);
    const times: number[] = [];
    for (let i = 0; i < 120; i++) { const t0 = performance.now(); stepWorld(sim); times.push(performance.now() - t0); }
    times.sort((a, b) => a - b);
    const avg = times.reduce((a, b) => a + b, 0) / times.length;
    const p95 = times[Math.floor(times.length * 0.95)];
    console.log(`200 citizens: avg ${avg.toFixed(2)} ms/tick, p95 ${p95.toFixed(2)} ms/tick`);
    expect(avg).toBeLessThan(120);
    for (const r of ['food', 'wood', 'stone'] as const) expect(sim.s.stock[r]).toBeGreaterThanOrEqual(0);
  });
});
