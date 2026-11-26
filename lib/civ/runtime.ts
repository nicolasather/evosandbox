import { applyDiscoveries } from './bridge';
import { AUTOSAVE_TICKS, SPEEDS, TICKS_PER_SECOND, type Speed } from './data/config';
import { askMoreHint, dismissHint, stepWorld } from './hints';
import { CIV_BACKUP_KEY, CIV_CORRUPT_KEY, CIV_SAVE_KEY, parseSave, serializeSim } from './save';
import { addNote, addPin, previewExpedition, removeNote, removePin, sendExpedition, setPolicy, skipTutorial, togglePin, tutorialEvent } from './extras';
import { acceptMigrant, declineMigrant, toggleBuildingPause, acceptTrade, assignOverride, cancelBuilding, createSim, declineTrade, placeBuilding, setPriority, type CivSim } from './sim';
import type { CivState, JobCategory, Policies, Settings } from './types';

/* ============================================================================
   CIV RUNTIME — the clock and the single owner of the live settlement. It lives
   outside React (components subscribe through useSyncExternalStore) and outside the
   render loop: simulation advances on a fixed tick, drawing runs independently.
   Rules (master design §4.1):
   - pause, 1x/2x/4x, and an optional "pause while crafting" preference;
   - the simulation keeps running while Merging is open unless one of those pauses it;
   - when the browser tab is hidden the simulation pauses (explicit rule, never a
     silent catch-up that burns through resources).
   ========================================================================== */

export interface LoadNotice { kind: 'corrupt' | 'migrated' | 'newer'; reason: string }

const TICK_MS = 1000 / TICKS_PER_SECOND;
const MAX_CATCHUP = 6;

export class CivRuntime {
  sim: CivSim;
  speed: Speed = 1;
  userPaused = false;
  /** Set by the workspace shell while Merging is on screen. */
  merging = false;
  notice: LoadNotice | null = null;
  /** Wall-clock time of the last tick, for smooth interpolation while drawing. */
  lastTickAt = 0;
  private version = 0;
  private listeners = new Set<() => void>();
  private timer: ReturnType<typeof setInterval> | null = null;
  private last = 0;
  private acc = 0;
  private storage: Storage | null;
  private lastSavedTick = 0;

  constructor(storage: Storage | null = null, seed = 1) {
    this.storage = storage;
    this.sim = createSim(seed);
    this.load();
  }

  /* ----- external store contract ----- */
  subscribe = (cb: () => void) => { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; };
  getVersion = () => this.version;
  private bump() { this.version++; this.listeners.forEach(l => l()); }

  get state(): CivState { return this.sim.s; }
  get paused(): boolean { return this.userPaused || (this.state.settings.pauseWhileCrafting && this.merging); }

  /* ----- clock ----- */
  start() {
    if (this.timer || typeof window === 'undefined') return;
    this.last = performance.now();
    this.timer = setInterval(() => this.pump(performance.now()), 50);
    window.addEventListener('pagehide', this.onHide);
    document.addEventListener('visibilitychange', this.onVisibility);
  }
  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
    if (typeof window !== 'undefined') {
      window.removeEventListener('pagehide', this.onHide);
      document.removeEventListener('visibilitychange', this.onVisibility);
    }
    this.save();
  }
  private onHide = () => this.save();
  private onVisibility = () => { if (document.hidden) this.save(); else { this.last = performance.now(); this.acc = 0; } };

  /** Advance by wall-clock time. Exposed so tests can drive it deterministically. */
  pump(now: number) {
    const dt = now - this.last;
    this.last = now;
    if (typeof document !== 'undefined' && document.hidden) return;
    if (this.paused) { this.acc = 0; return; }
    this.acc += dt * this.speed;
    let n = 0;
    while (this.acc >= TICK_MS && n < MAX_CATCHUP) {
      this.acc -= TICK_MS;
      this.tickOnce();
      n++;
    }
    if (n === MAX_CATCHUP) this.acc = 0; // a long stall never turns into a burst of free time
    if (n > 0) { this.lastTickAt = now; this.bump(); }
  }

  /** One simulation tick (used by the clock and by tests). */
  tickOnce() {
    stepWorld(this.sim);
    if (this.sim.s.tick - this.lastSavedTick >= AUTOSAVE_TICKS) this.save();
  }

  /* ----- player commands (each bumps the version so panels refresh) ----- */
  setSpeed(v: Speed) { if (SPEEDS.includes(v)) { this.speed = v; this.bump(); } }
  togglePause() { this.userPaused = !this.userPaused; this.bump(); }
  setMerging(on: boolean) { if (this.merging !== on) { this.merging = on; if (on) tutorialEvent(this.state, 'merging'); this.bump(); } }
  setSetting<K extends keyof Settings>(k: K, v: Settings[K]) { this.state.settings[k] = v; this.save(); this.bump(); }
  setPriority(cat: JobCategory, level: number) { setPriority(this.state, cat, level); this.bump(); }
  override(citizenId: string, cat: JobCategory | null) { assignOverride(this.state, citizenId, cat); this.bump(); }
  place(kind: string, x: number, y: number) { const r = placeBuilding(this.sim, kind, x, y); if (r.ok) this.save(); this.bump(); return r; }
  cancel(id: string) { const r = cancelBuilding(this.sim, id); this.bump(); return r; }
  preview(tx: number, ty: number, party: string[]) { return previewExpedition(this.sim, tx, ty, party); }
  explore(tx: number, ty: number, party: string[]) { const r = sendExpedition(this.sim, tx, ty, party); this.bump(); return r; }
  policy<K extends keyof Policies>(k: K, v: Policies[K]) { setPolicy(this.state, k, v); this.save(); this.bump(); }
  pin(text: string) { const p = addPin(this.state, text); this.bump(); return p; }
  togglePin(id: string) { togglePin(this.state, id); this.bump(); }
  removePin(id: string) { removePin(this.state, id); this.bump(); }
  note(x: number, y: number, text: string) { const n = addNote(this.state, x, y, text); this.bump(); return n; }
  removeNote(id: string) { removeNote(this.state, id); this.bump(); }
  tutorial(id: string) { const before = this.state.tutorial.step; tutorialEvent(this.state, id); if (this.state.tutorial.step !== before) this.bump(); }
  skipTutorial() { skipTutorial(this.state); this.bump(); }
  welcome() { const ok = acceptMigrant(this.sim); this.bump(); return ok; }
  turnAway() { declineMigrant(this.sim); this.bump(); }
  pauseBuilding(id: string) { toggleBuildingPause(this.state, id); this.bump(); }
  accept() { const r = acceptTrade(this.sim); this.bump(); return r; }
  decline() { declineTrade(this.sim); this.bump(); }
  dismissHint() { dismissHint(this.state); this.bump(); }
  moreHint() { askMoreHint(this.sim); this.bump(); }

  /** Called with the merge engine's discovered ids. Safe to call repeatedly: each mapped discovery applies once. */
  syncDiscoveries(found: ReadonlySet<string> | readonly string[]) {
    const r = applyDiscoveries(this.state, found);
    if (r.applied.length) { this.save(); this.bump(); }
    return r.applied;
  }

  /* ----- save / load ----- */
  save() {
    if (!this.storage) return;
    try {
      this.storage.setItem(CIV_SAVE_KEY, serializeSim(this.sim));
      this.lastSavedTick = this.state.tick;
    } catch { /* storage full or blocked: the game keeps running, it just is not remembered */ }
  }

  private load() {
    if (!this.storage) return;
    let raw: string | null = null;
    try { raw = this.storage.getItem(CIV_SAVE_KEY); } catch { return; }
    const r = parseSave(raw);
    if (!r) return;
    if (!r.ok) {
      // never silently reset: keep the original bytes and tell the player
      try { if (raw !== null) this.storage.setItem(CIV_CORRUPT_KEY, raw); } catch { /* ignore */ }
      this.notice = { kind: r.reason.includes('newer') ? 'newer' : 'corrupt', reason: r.reason };
      return;
    }
    try { if (raw !== null) this.storage.setItem(CIV_BACKUP_KEY, raw); } catch { /* ignore */ }
    this.sim = r.sim;
    this.lastSavedTick = r.sim.s.tick;
    if (r.migrated) this.notice = { kind: 'migrated', reason: 'Your settlement was updated to the current format. A backup was kept.' };
  }

  /** Start a brand-new settlement. The previous (possibly corrupt) bytes stay under the backup keys. */
  startFresh(seed = 1) {
    this.sim = createSim(seed);
    this.notice = null;
    this.save();
    this.bump();
  }
  dismissNotice() { this.notice = null; this.bump(); }
}
