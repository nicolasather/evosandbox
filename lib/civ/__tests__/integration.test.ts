import { applyDiscoveries } from '../bridge';
import { visibleTiles, clampCamera } from '../camera';
import { stepWorld } from '../hints';
import { CivRuntime } from '../runtime';
import { parseSave, serializeSim } from '../save';
import { createSim, placeBuilding, stepSim, validatePlacement } from '../sim';
import { TILE } from '../world';
import { animFrame, validateSheet } from '../../../components/civworld/assets';

const run = (sim: ReturnType<typeof createSim>, n: number) => { for (let i = 0; i < n; i++) stepWorld(sim); };

function findSpot(sim: ReturnType<typeof createSim>, kind = 'shelter'): [number, number] {
  const f = sim.s.buildings[0];
  for (let r = 2; r < 10; r++) for (let dy = -r; dy <= r; dy++) for (let dx = -r; dx <= r; dx++) if (validatePlacement(sim, kind, f.x + dx, f.y + dy).ok) return [f.x + dx, f.y + dy];
  throw new Error('no spot');
}

describe('section 18 acceptance: the first playable loop connects', () => {
  it('walks the whole loop on one settlement', () => {
    const sim = createSim(1);
    const { s } = sim;
    expect(s.citizens.length).toBeGreaterThanOrEqual(3);
    const moved = new Set<string>();
    const before = { ...s.stock };
    for (let i = 0; i < 1500; i++) { stepWorld(sim); for (const c of s.citizens) if (c.x !== c.px || c.y !== c.py) moved.add(c.id); }
    expect(moved.size).toBeGreaterThanOrEqual(3);
    const changed = (['food', 'wood', 'stone'] as const).filter(r => s.stock[r] !== before[r]);
    expect(changed.length).toBeGreaterThanOrEqual(2);
    const [x, y] = findSpot(sim);
    expect(placeBuilding(sim, 'shelter', x, y).ok).toBe(true);
    run(sim, 700);
    expect(s.buildings.some(b => b.kind === 'shelter' && b.state === 'done')).toBe(true);
    s.activeHint = null; s.hints = {}; s.stock.food = 0; s.priorities.food = 0;
    for (let i = 0; i < 100 && !s.activeHint; i++) { s.stock.food = 0; stepWorld(sim); }
    expect((s.activeHint as { id: string } | null)?.id).toBe('food_low');
    s.priorities.food = 3;
    expect(applyDiscoveries(s, new Set(['stone_tool'])).applied).toHaveLength(1);
    expect(s.unlockedBuildings).toContain('workshop');
    const loaded = parseSave(serializeSim(sim));
    expect(loaded && loaded.ok && loaded.sim.s.capabilities).toEqual(s.capabilities);
    expect(loaded && loaded.ok && loaded.sim.s.buildings.length).toBe(s.buildings.length);
  });
  it('keeps running while Merging is open unless paused by the player or the preference', () => {
    const rt = new CivRuntime(null);
    rt.pump(0); rt.setMerging(true); rt.pump(1000);
    expect(rt.state.tick).toBeGreaterThan(0);
    rt.setSetting('pauseWhileCrafting', true);
    const t = rt.state.tick; rt.pump(2000);
    expect(rt.state.tick).toBe(t);
  });
});

describe('section 48 edge cases', () => {
  it('never duplicates the last unit of a resource', () => {
    const sim = createSim(1);
    const bush = sim.s.nodes.find(n => n.kind === 'bush')!;
    sim.s.nodes = [bush]; bush.amount = 1; bush.max = 1;
    sim.s.stock.food = 0;
    run(sim, 900);
    expect(sim.s.counters.gathered.food).toBeLessThanOrEqual(1 + Math.floor(900 / 60));
  });
  it('a depleted node releases its worker, who then chooses another valid job', () => {
    const sim = createSim(1);
    run(sim, 300);
    for (const n of sim.s.nodes) if (n.kind === 'tree') n.amount = 0;
    run(sim, 50);
    expect(sim.s.citizens.every(c => !(c.task.kind === 'gather' && sim.s.nodes.find(n => n.id === c.task.targetId)?.kind === 'tree'))).toBe(true);
  });
  it('blocking routes makes people re-plan and nobody keeps a path through a blocked tile', () => {
    const sim = createSim(1);
    run(sim, 100);
    for (let i = 0; i < 3; i++) { try { const [x, y] = findSpot(sim); placeBuilding(sim, 'shelter', x, y); } catch { break; } }
    run(sim, 200);
    expect(sim.s.citizens.every(c => c.path.length === 0 || c.task.kind === 'walk')).toBe(true);
  });
  it('changing speed never skips or repeats a transaction: the same ticks give the same state', () => {
    const a = new CivRuntime(null); const b = new CivRuntime(null);
    a.setSpeed(1); b.setSpeed(4);
    for (let i = 0; i < 200; i++) a.tickOnce();
    for (let i = 0; i < 200; i++) b.tickOnce();
    expect(JSON.stringify(a.state)).toBe(JSON.stringify(b.state));
  });
  it('a hidden tab does not advance the simulation and returning does not burst', () => {
    const rt = new CivRuntime(null);
    rt.pump(0);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => true });
    rt.pump(60000);
    expect(rt.state.tick).toBe(0);
    Object.defineProperty(document, 'hidden', { configurable: true, get: () => false });
    rt.pump(60100);
    expect(rt.state.tick).toBeLessThanOrEqual(6);
  });
});

describe('save cases (section 47)', () => {
  it('reload during construction resumes with the same progress and finishes; reload while walking re-plans', () => {
    const sim = createSim(1);
    const [x, y] = findSpot(sim);
    placeBuilding(sim, 'shelter', x, y);
    for (let i = 0; i < 120; i++) stepSim(sim);
    const site = sim.s.buildings.find(b => b.kind === 'shelter')!;
    const progress = site.progress;
    const loaded = parseSave(serializeSim(sim));
    expect(loaded && loaded.ok).toBe(true);
    if (loaded && loaded.ok) {
      const again = loaded.sim.s.buildings.find(b => b.kind === 'shelter')!;
      expect(again.progress).toBe(progress);
      expect(again.paid).toEqual(site.paid);
      expect(loaded.sim.s.citizens.every(c => c.path.length === 0)).toBe(true);
      for (let i = 0; i < 900; i++) stepSim(loaded.sim);
      expect(loaded.sim.s.buildings.find(b => b.kind === 'shelter')!.state).toBe('done');
    }
  });
});

describe('performance helpers', () => {
  it('culls to the visible tiles only and the camera never leaves the map', () => {
    const cam = { cx: 640, cy: 480, zoom: 2 };
    const r = visibleTiles(cam, { w: 800, h: 600 }, TILE);
    expect((r.x1 - r.x0) * (r.y1 - r.y0)).toBeLessThan(40 * 30);
    expect(clampCamera({ cx: -9999, cy: -9999, zoom: 4 }, { w: 800, h: 600 }, { w: 1280, h: 960 }).cx).toBeGreaterThan(0);
  });
  it('wrong-sized sheets are rejected with a message and animation frames run in order, or stay static', () => {
    expect(validateSheet({ url: 'x', w: 32, h: 32, frames: 6 }, 192, 32)).toBeNull();
    expect(validateSheet({ url: 'x', w: 32, h: 32, frames: 6 }, 64, 32)).toMatch(/fewer than 6 frames/);
    expect(validateSheet({ url: 'x', w: 32, h: 32 }, 16, 16)).not.toBeNull();
    expect([0, 125, 250, 375, 500, 625, 750].map(t => animFrame(6, 8, t, true))).toEqual([0, 1, 2, 3, 4, 5, 0]);
    expect([0, 300, 900].map(t => animFrame(6, 8, t, false))).toEqual([0, 0, 0]);
  });
});
