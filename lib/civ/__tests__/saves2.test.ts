import { CivRuntime } from '../runtime';
import { CIV_BACKUP_KEY, EXPORT_KIND, exportText, migrateState, parseImport, serializeSim } from '../save';
import { createSim } from '../sim';
import { stepWorld } from '../hints';

class Mem implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('export and import', () => {
  it('round-trips a running settlement through a file', () => {
    const sim = createSim(4, 'procedural');
    for (let i = 0; i < 300; i++) stepWorld(sim);
    const text = exportText(sim, new Date('2026-11-26T00:00:00Z'));
    expect(JSON.parse(text).kind).toBe(EXPORT_KIND);
    const back = parseImport(text);
    expect(back.ok).toBe(true);
    if (back.ok) {
      expect(back.sim.s.tick).toBe(sim.s.tick);
      expect(back.sim.s.stock).toEqual(sim.s.stock);
      expect(back.sim.map.terrain).toEqual(sim.map.terrain);
    }
  });
  it('refuses wrong, damaged and newer files with a reason and changes nothing', () => {
    expect(parseImport('not json')).toMatchObject({ ok: false });
    expect(parseImport(JSON.stringify({ kind: 'something-else' }))).toMatchObject({ ok: false, reason: expect.stringContaining('not an Evolution Sandbox') });
    expect(parseImport(JSON.stringify({ kind: EXPORT_KIND, file: { v: 1, state: { seed: 1 } } }))).toMatchObject({ ok: false });
    expect(parseImport(JSON.stringify({ kind: EXPORT_KIND, file: { v: 99, state: {} } }))).toMatchObject({ ok: false, reason: expect.stringContaining('newer') });
    const store = new Mem();
    const rt = new CivRuntime(store);
    for (let i = 0; i < 50; i++) rt.tickOnce();
    const tick = rt.state.tick;
    expect(rt.importFile('{"kind":"evosandbox-civworld","file":{}}')).toMatchObject({ ok: false });
    expect(rt.state.tick).toBe(tick);
  });
  it('importing replaces the settlement but keeps the previous one as a backup copy', () => {
    const store = new Mem();
    const rt = new CivRuntime(store);
    for (let i = 0; i < 100; i++) rt.tickOnce();
    const before = serializeSim(rt.sim);
    const other = createSim(9);
    for (let i = 0; i < 10; i++) stepWorld(other);
    expect(rt.importFile(exportText(other))).toEqual({ ok: true });
    expect(rt.state.seed).toBe(9);
    expect(store.getItem(CIV_BACKUP_KEY)).toBe(before);
  });
});

describe('migration and independence', () => {
  it('upgrades an old save that lacks every module field and keeps unknown fields', () => {
    const fresh = JSON.parse(serializeSim(createSim(1))).state;
    for (const k of ['family', 'routes', 'laws', 'water', 'mapKind', 'migrant', 'foodLog', 'revealed', 'poi', 'policies', 'tutorial', 'pins', 'notes']) delete fresh[k];
    delete fresh.settings.modules;
    fresh.legacyThing = 'keep';
    const m = migrateState({ v: 1, state: fresh });
    expect(m.ok).toBe(true);
    if (m.ok) {
      expect(m.state.settings.modules.trade).toBe(true);
      expect(Array.isArray(m.state.family)).toBe(true);
      expect(m.state.water).toBeGreaterThan(0);
      expect(m.state.mapKind).toBeDefined();
      expect((m.state as unknown as { legacyThing: string }).legacyThing).toBe('keep');
    }
  });
  it('a corrupt save is preserved byte for byte, never overwritten, and other modes keys are never touched', () => {
    const store = new Mem();
    store.setItem('evo.survival.v1', 'S'); store.setItem('evo.sandbox.v1', 'M'); store.setItem('evo.civilization.v1', 'L');
    store.setItem('evo.civworld.v1', '{broken');
    const rt = new CivRuntime(store);
    rt.tickOnce(); rt.save(); rt.exportFile();
    expect(store.getItem('evo.civworld.v1.corrupt')).toBe('{broken');
    expect(store.getItem('evo.survival.v1')).toBe('S');
    expect(store.getItem('evo.sandbox.v1')).toBe('M');
    expect(store.getItem('evo.civilization.v1')).toBe('L');
  });
});
