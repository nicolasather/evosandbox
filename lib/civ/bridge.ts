import { DISCOVERY_MAP, type CapabilityMapping } from './data/discoveryMap';
import { pushEvent } from './sim';
import type { CivState } from './types';

/* ============================================================================
   DISCOVERY BRIDGE (master design §6, §14.3). The existing merge engine stays the
   only authority on what has been discovered. The bridge only OBSERVES the engine's
   discovered set, records each mapped discovery exactly once, and turns it into
   capabilities (unlocks). It never hands out goods and never creates recipes.
   ========================================================================== */

export interface BridgeResult { applied: CapabilityMapping[] }

export function applyDiscoveries(s: CivState, found: ReadonlySet<string> | readonly string[]): BridgeResult {
  const has = (id: string) => (found instanceof Set ? found.has(id) : (found as readonly string[]).includes(id));
  const applied: CapabilityMapping[] = [];
  for (const m of DISCOVERY_MAP) {
    if (!has(m.discoveryId) || s.seenDiscoveries.includes(m.discoveryId)) continue;
    if (m.requires && !m.requires.every(has)) continue; // retried on a later sync once the prerequisite is known
    s.seenDiscoveries.push(m.discoveryId);
    s.capabilities.push({ id: m.capability, fromDiscovery: m.discoveryId, tick: s.tick });
    for (const g of m.grants) {
      if (g.type === 'unlock_building' && !s.unlockedBuildings.includes(g.buildingId)) s.unlockedBuildings.push(g.buildingId);
    }
    pushEvent(s, 'discovery', { discovery: m.discoveryId, capability: m.capability }, m.message);
    applied.push(m);
  }
  return { applied };
}
