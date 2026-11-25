import { DAY_TICKS } from '../data/config';
import { createSim, stepSim } from '../sim';

it('prints a 6-day settlement curve (balance probe, not an assertion of exact numbers)', () => {
  const sim = createSim(1);
  const rows: string[] = [];
  for (let d = 1; d <= 6; d++) {
    for (let i = 0; i < DAY_TICKS; i++) stepSim(sim);
    const s = sim.s;
    rows.push(`day ${d}: food ${s.stock.food} wood ${s.stock.wood} stone ${s.stock.stone} hunger ${Math.round(s.citizens.reduce((a, c) => a + c.hunger, 0) / s.citizens.length)} energy ${Math.round(s.citizens.reduce((a, c) => a + c.energy, 0) / s.citizens.length)}`);
  }
  console.log(rows.join('\n'));
  expect(sim.s.citizens.every(c => c.hunger < 100)).toBe(true);
});
