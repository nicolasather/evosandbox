'use client';

import { useSyncExternalStore } from 'react';
import { CivRuntime } from '@/lib/civ/runtime';

/* One live settlement per page. Created lazily on the client (never during server
   render), so saved state can never cause a hydration mismatch. */

let runtime: CivRuntime | null = null;

export function getCivRuntime(): CivRuntime {
  if (!runtime) {
    let storage: Storage | null = null;
    try { storage = window.localStorage; } catch { storage = null; }
    runtime = new CivRuntime(storage);
  }
  return runtime;
}

/** Re-render when the runtime announces a change (about once per simulation tick while running). */
export function useCivVersion(rt: CivRuntime): number {
  return useSyncExternalStore(rt.subscribe, rt.getVersion, () => 0);
}
