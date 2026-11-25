import { applyDiscoveries } from '../bridge';
import { DISCOVERY_MAP } from '../data/discoveryMap';
import { HINTS, computeAlerts, dismissHint, evaluateHints, askMoreHint, stepWorld } from '../hints';
import { CivRuntime } from '../runtime';
import { CIV_BACKUP_KEY, CIV_CORRUPT_KEY, CIV_SAVE_KEY, migrateState, parseSave, serializeSim } from '../save';
import { jobStatuses } from '../selectors';
import { createSim, hasCapability, placeBuilding, stepSim, validatePlacement } from '../sim';
import db from '@/data/db.json';

const run = (sim: ReturnType<typeof createSim>, n: number) => { for (let i = 0; i < n; i++) stepWorld(sim); };

class MemStorage implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('discovery bridge', () => {
  it('only maps discoveries that exist in the real discovery database', () => {
    const ids = new Set((db as { nodes: { id: string }[] }).nodes.map(n => n.id));
    for (const m of DISCOVERY_MAP) expect(ids.has(m.discoveryId)).toBe(true);
  });
  it('applies a known discovery exactly once and unlocks a capability, not goods', () => {
    const sim = createSim(1);
    const stock = { ...sim.s.stock };
    const first = applyDiscoveries(sim.s, new Set(['stone', 'stone_tool']));
    expect(first.applied.map(a => a.discoveryId)).toEqual(['stone_tool']);
    expect(hasCapability(sim.s, 'stone_tool')).toBe(true);
    expect(sim.s.unlockedBuildings).toContain('workshop');
    expect(sim.s.stock).toEqual(stock);
    const again = applyDiscoveries(sim.s, new Set(['stone_tool']));
    expect(again.applied).toHaveLength(0);
    expect(sim.s.events.filter(e => e.kind === 'discovery')).toHaveLength(1);
  });
  it('ignores discoveries with no mapping and waits for prerequisites', () => {
    const sim = createSim(1);
    expect(applyDiscoveries(sim.s, ['fire', 'wood']).applied).toHaveLength(0);
    expect(applyDiscoveries(sim.s, ['farming_tools']).applied).toHaveLength(0);
    expect(applyDiscoveries(sim.s, ['farming_tools', 'agriculture']).applied.map(a => a.discoveryId).sort()).toEqual(['agriculture', 'farming_tools']);
  });
  it('a discovery makes a building placeable; the building still costs materials and workers', () => {
    const sim = createSim(1);
    const f = sim.s.buildings[0];
    let spot: [number, number] | null = null;
    for (let r = 2; r < 9 && !spot; r++) for (let dy = -r; dy <= r && !spot; dy++) for (let dx = -r; dx <= r && !spot; dx++) {
      if (validatePlacement(sim, 'shelter', f.x + dx, f.y + dy).ok) spot = [f.x + dx, f.y + dy];
    }
    expect(spot).not.toBeNull();
    const [x, y] = spot as [number, number];
    expect(validatePlacement(sim, 'workshop', x, y).ok).toBe(false);
    applyDiscoveries(sim.s, ['stone_tool']);
    sim.s.stock.stone = 10;
    const r = placeBuilding(sim, 'workshop', x, y);
    expect(r.ok).toBe(true);
    expect(sim.s.buildings.find(b => b.kind === 'workshop')?.state).toBe('site');
    run(sim, 900);
    expect(sim.s.buildings.find(b => b.kind === 'workshop')?.state).toBe('done');
    // with a workshop and a worker, tools get made from wood and stone
    sim.s.stock.wood = 20; sim.s.stock.stone = 10;
    run(sim, 900);
    expect(sim.s.stock.tools).toBeGreaterThan(0);
  });
});

describe('hints and alerts', () => {
  it('stays quiet when nothing is wrong and never repeats a hint inside its cooldown', () => {
    const sim = createSim(1);
    run(sim, 40);
    expect(sim.s.activeHint).toBeNull();
    sim.s.stock.food = 0;
    sim.s.priorities.food = 0;
    for (let i = 0; i < 100 && !sim.s.activeHint; i++) { sim.s.stock.food = 0; stepWorld(sim); }
    const h = sim.s.activeHint;
    expect(h?.id).toBe('food_low');
    expect(h?.level).toBe('observation');
    dismissHint(sim.s);
    evaluateHints(sim);
    expect(sim.s.activeHint).toBeNull();
    const shown = Object.values(sim.s.hints).reduce((a, x) => a + x.shownCount, 0);
    run(sim, 30);
    expect(Object.values(sim.s.hints).reduce((a, x) => a + x.shownCount, 0)).toBe(shown);
  });
  it('escalates on request, resolves when the problem is gone, and records it', () => {
    const sim = createSim(1);
    sim.s.stock.food = 0;
    sim.s.priorities.food = 0;
    for (let i = 0; i < 100 && !sim.s.activeHint; i++) { sim.s.stock.food = 0; stepWorld(sim); }
    expect(sim.s.activeHint?.id).toBe('food_low');
    askMoreHint(sim);
    expect(sim.s.activeHint?.level).toBe('suggestion');
    askMoreHint(sim);
    expect(sim.s.activeHint?.level).toBe('guidance');
    sim.s.stock.food = 30;
    evaluateHints(sim);
    expect(sim.s.activeHint).toBeNull();
    expect(sim.s.hints.food_low.resolved).toBe(true);
  });
  it('does not point at the storage building before it is known, and never names a recipe', () => {
    const sim = createSim(1);
    const def = HINTS.find(h => h.id === 'storage_full')!;
    const locked = def.text(sim).guidance;
    expect(locked).toMatch(/Merging/);
    expect(locked).not.toMatch(/food_storage|recipe/i);
    applyDiscoveries(sim.s, ['food_storage']);
    expect(def.text(sim).guidance).toMatch(/Storage building/);
  });
  it('derives alerts from state and clears them when fixed', () => {
    const sim = createSim(1);
    sim.s.stock.food = 0;
    expect(computeAlerts(sim.s).some(a => a.severity === 'critical')).toBe(true);
    sim.s.stock.food = 20;
    expect(computeAlerts(sim.s).some(a => a.id.startsWith('food'))).toBe(false);
  });
  it('explains blocked jobs', () => {
    const sim = createSim(1);
    const st = jobStatuses(sim.s);
    expect(st.find(j => j.cat === 'craft')?.blocked).toMatch(/Stone Tool/);
    expect(st.find(j => j.cat === 'build')?.blocked).toMatch(/Nothing to build/);
    sim.s.stock.wood = 30;
    expect(jobStatuses(sim.s).find(j => j.cat === 'wood')?.blocked).toMatch(/full/);
  });
});

describe('saves', () => {
  it('round-trips a running settlement exactly (reload after discovery)', () => {
    const sim = createSim(2);
    run(sim, 500);
    applyDiscoveries(sim.s, ['stone_tool']);
    const parsed = parseSave(serializeSim(sim));
    expect(parsed && parsed.ok).toBe(true);
    if (parsed && parsed.ok) {
      expect(parsed.sim.s.stock).toEqual(sim.s.stock);
      expect(parsed.sim.s.capabilities).toEqual(sim.s.capabilities);
      expect(parsed.sim.s.seenDiscoveries).toEqual(sim.s.seenDiscoveries);
      expect(parsed.sim.s.tick).toBe(sim.s.tick);
      expect(parsed.migrated).toBe(false);
      const before = parsed.sim.s.events.filter(e => e.kind === 'discovery').length;
      applyDiscoveries(parsed.sim.s, ['stone_tool']);
      for (let i = 0; i < 100; i++) stepSim(parsed.sim);
      expect(parsed.sim.s.events.filter(e => e.kind === 'discovery').length).toBe(before);
    }
  });
  it('migrates a partial or older save, keeping unknown fields and filling missing ones', () => {
    const sim = createSim(1);
    const partial = JSON.parse(serializeSim(sim)).state;
    delete partial.hints; delete partial.settings; partial.futureField = 7;
    const m = migrateState({ v: 0, ...partial });
    expect(m.ok).toBe(true);
    if (m.ok) {
      expect(m.state.settings.foodReserveDays).toBeGreaterThan(0);
      expect((m.state as unknown as { futureField: number }).futureField).toBe(7);
      expect(m.migrated).toBe(true);
    }
  });
  it('rejects corrupt or newer saves instead of guessing', () => {
    expect(parseSave('{nope')).toMatchObject({ ok: false });
    expect(parseSave(JSON.stringify({ v: 1, state: { seed: 1 } }))).toMatchObject({ ok: false });
    expect(parseSave(JSON.stringify({ v: 99, state: {} }))).toMatchObject({ ok: false });
    expect(parseSave(null)).toBeNull();
  });
  it('runtime keeps the original bytes of a corrupt save and never touches other modes keys', () => {
    const store = new MemStorage();
    store.setItem('evo.sandbox.v1', 'MAIN');
    store.setItem('evo.survival.v1', 'SURV');
    store.setItem(CIV_SAVE_KEY, '{broken');
    const rt = new CivRuntime(store);
    expect(rt.notice?.kind).toBe('corrupt');
    expect(store.getItem(CIV_CORRUPT_KEY)).toBe('{broken');
    rt.save();
    expect(store.getItem(CIV_CORRUPT_KEY)).toBe('{broken');
    expect(store.getItem('evo.sandbox.v1')).toBe('MAIN');
    expect(store.getItem('evo.survival.v1')).toBe('SURV');
    const store2 = new MemStorage();
    const a = new CivRuntime(store2); a.save();
    const b = new CivRuntime(store2);
    expect(store2.getItem(CIV_BACKUP_KEY)).not.toBeNull();
    expect(b.state.tick).toBe(a.state.tick);
  });
  it('writes only its own keys', () => {
    const store = new MemStorage();
    const rt = new CivRuntime(store);
    for (let i = 0; i < 100; i++) rt.tickOnce();
    rt.save();
    for (let i = 0; i < store.length; i++) expect(store.key(i)).toMatch(/^evo\.civworld\.v1/);
  });
});

describe('runtime clock', () => {
  it('advances by wall time, honours pause, speed and pause-while-crafting, and never bursts after a stall', () => {
    const rt = new CivRuntime(null);
    rt.pump(0);
    rt.pump(1000);
    const t1 = rt.state.tick;
    expect(t1).toBeGreaterThan(0);
    rt.togglePause();
    rt.pump(5000);
    expect(rt.state.tick).toBe(t1);
    rt.togglePause();
    rt.pump(6000);
    expect(rt.state.tick).toBeGreaterThan(t1);
    const t2 = rt.state.tick;
    rt.setSetting('pauseWhileCrafting', true);
    rt.setMerging(true);
    expect(rt.paused).toBe(true);
    rt.pump(7000);
    expect(rt.state.tick).toBe(t2);
    rt.setMerging(false);
    rt.pump(8000);
    const t3 = rt.state.tick;
    expect(t3).toBeGreaterThan(t2);
    rt.pump(80000);
    expect(rt.state.tick - t3).toBeLessThanOrEqual(6);
  });
  it('runs the sim while Merging is open when the preference is off', () => {
    const rt = new CivRuntime(null);
    rt.pump(0);
    rt.setMerging(true);
    rt.pump(1000);
    expect(rt.state.tick).toBeGreaterThan(0);
  });
  it('syncing discoveries through the runtime is idempotent', () => {
    const rt = new CivRuntime(null);
    expect(rt.syncDiscoveries(new Set(['stone_tool']))).toHaveLength(1);
    expect(rt.syncDiscoveries(new Set(['stone_tool']))).toHaveLength(0);
  });
});
