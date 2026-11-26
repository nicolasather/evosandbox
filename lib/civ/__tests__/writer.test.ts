import { CivRuntime } from '../runtime';
import { CIV_SAVE_KEY } from '../save';

class Mem implements Storage {
  private m = new Map<string, string>();
  get length() { return this.m.size; }
  clear() { this.m.clear(); }
  getItem(k: string) { return this.m.has(k) ? (this.m.get(k) as string) : null; }
  key(i: number) { return [...this.m.keys()][i] ?? null; }
  removeItem(k: string) { this.m.delete(k); }
  setItem(k: string, v: string) { this.m.set(k, v); }
}

describe('two tabs, one save', () => {
  it('the second tab never overwrites the first tab save while the first is alive, and takes over when it is the active tab', () => {
    const store = new Mem();
    const a = new CivRuntime(store);
    a.save();
    for (let i = 0; i < 80; i++) a.tickOnce();
    a.save();
    const written = store.getItem(CIV_SAVE_KEY);
    const b = new CivRuntime(store);
    expect(b.readOnly).toBe(true);
    for (let i = 0; i < 80; i++) b.tickOnce();
    b.save();
    expect(store.getItem(CIV_SAVE_KEY)).toBe(written); // unchanged: b was read-only
    // b becomes the visible tab: it reads what a saved, then takes over
    (b as unknown as { onVisibility: () => void }).onVisibility();
    expect(b.readOnly).toBe(false);
    expect(b.state.tick).toBeGreaterThanOrEqual(a.state.tick - 1);
    b.tickOnce(); b.save();
    expect(store.getItem(CIV_SAVE_KEY)).not.toBe(written);
    expect(a.readOnly).toBe(true);
  });
  it('a stale writer claim (closed tab) is taken over after the timeout', () => {
    const store = new Mem();
    store.setItem('evo.civworld.v1.writer', JSON.stringify({ id: 'gone', at: Date.now() - 60000 }));
    const r = new CivRuntime(store);
    expect(r.readOnly).toBe(false);
  });
});
