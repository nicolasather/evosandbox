import { createSim, type CivSim } from './sim';
import type { CivState } from './types';
import { createWorld } from './world';

/* Versioned save for the civilization world (own namespace; never touches any other mode's
   key). Migration is a pure function; a corrupt or unreadable save is never silently reset:
   the caller keeps the original bytes and offers recovery. */

export const CIV_SAVE_KEY = 'evo.civworld.v1';
export const CIV_BACKUP_KEY = 'evo.civworld.v1.backup';
export const CIV_CORRUPT_KEY = 'evo.civworld.v1.corrupt';
export const SAVE_VERSION = 1;

export interface SaveFile { v: number; state: CivState }

export const serializeSim = (sim: CivSim): string => JSON.stringify({ v: SAVE_VERSION, state: sim.s } satisfies SaveFile);

export type LoadResult =
  | { ok: true; sim: CivSim; migrated: boolean }
  | { ok: false; reason: string };

const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

/** Fill anything an older or partial save lacks from a fresh settlement, keep unknown fields, reject structurally broken data. */
export function migrateState(raw: unknown): { ok: true; state: CivState; migrated: boolean } | { ok: false; reason: string } {
  if (!isObj(raw)) return { ok: false, reason: 'Save is not an object' };
  const fileV = typeof raw.v === 'number' ? raw.v : 0;
  if (fileV > SAVE_VERSION) return { ok: false, reason: `Save is from a newer version (${fileV})` };
  const st = isObj(raw.state) ? raw.state : raw; // v0 prototypes stored the state at top level
  if (typeof st.seed !== 'number' || !Array.isArray(st.citizens) || !Array.isArray(st.nodes) || !Array.isArray(st.buildings)) {
    return { ok: false, reason: 'Save is missing the settlement data' };
  }
  const fresh = createSim(st.seed, st.mapKind === 'procedural' ? 'procedural' : 'classic').s;
  const merged = { ...fresh, ...st, v: 1 } as CivState;
  merged.stock = { ...fresh.stock, ...(isObj(st.stock) ? st.stock : {}) } as CivState['stock'];
  merged.priorities = { ...fresh.priorities, ...(isObj(st.priorities) ? st.priorities : {}) } as CivState['priorities'];
  merged.settings = { ...fresh.settings, ...(isObj(st.settings) ? st.settings : {}) } as CivState['settings'];
  merged.counters = { ...fresh.counters, ...(isObj(st.counters) ? st.counters : {}) } as CivState['counters'];
  for (const k of ['seenDiscoveries', 'capabilities', 'unlockedBuildings', 'events', 'alerts', 'milestones'] as const) {
    if (!Array.isArray(merged[k])) (merged as unknown as Record<string, unknown>)[k] = (fresh as unknown as Record<string, unknown>)[k];
  }
  if (!isObj(merged.hints)) merged.hints = {};
  if (!merged.unlockedBuildings.includes('shelter')) merged.unlockedBuildings.push('shelter');
  for (const c of merged.citizens) { if (typeof c.dist !== 'number') c.dist = 0; if (!c.facing) c.facing = 's'; if (!c.skill) c.skill = { gather: 1, build: 1, craft: 1 }; }
  // a citizen mid-walk saved a path through tiles that may have changed: drop it and let them re-decide
  for (const c of merged.citizens) { c.path = []; if (c.task && c.task.kind === 'walk') c.task = { kind: 'idle', reason: 'Resuming' }; }
  const migrated = fileV !== SAVE_VERSION || st !== raw.state;
  return { ok: true, state: merged, migrated };
}

export function parseSave(text: string | null): LoadResult | null {
  if (text === null || text === '') return null;
  let data: unknown;
  try { data = JSON.parse(text); } catch { return { ok: false, reason: 'Save is not valid JSON' }; }
  const m = migrateState(data);
  if (!m.ok) return m;
  return { ok: true, sim: { map: createWorld(m.state.seed, m.state.mapKind === 'procedural' ? 'procedural' : 'classic'), s: m.state }, migrated: m.migrated };
}

/* ---------- export and import (a file the player keeps) ---------- */

export const EXPORT_KIND = 'evosandbox-civworld';

/** A self-describing file: kind, version, when, and the same save payload the game keeps. */
export function exportText(sim: CivSim, now = new Date()): string {
  return JSON.stringify({ kind: EXPORT_KIND, exportedAt: now.toISOString(), file: JSON.parse(serializeSim(sim)) }, null, 1);
}

export type ImportResult = { ok: true; sim: CivSim } | { ok: false; reason: string };

/** Validates before anything is replaced: wrong file, wrong version or damaged data is refused with a reason and nothing changes. */
export function parseImport(text: string): ImportResult {
  let o: unknown;
  try { o = JSON.parse(text); } catch { return { ok: false, reason: 'That file is not valid JSON' }; }
  if (!isObj(o) || o.kind !== EXPORT_KIND) return { ok: false, reason: 'That file is not an Evolution Sandbox settlement export' };
  const r = parseSave(JSON.stringify(o.file));
  if (!r) return { ok: false, reason: 'The file holds no settlement' };
  if (!r.ok) return { ok: false, reason: r.reason };
  return { ok: true, sim: r.sim };
}
