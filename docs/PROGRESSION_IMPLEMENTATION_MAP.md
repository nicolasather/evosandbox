# Progression and performance: implementation map

This maps every optional feature, what mounts before its unlock, the timers and listeners behind each one, and the save keys that must stay compatible. Source of truth: the code in this repository.

## 1. Unlock rules

All unlocks derive from engine progress (`progressOf` in `lib/unlocks/useUnlocks.ts`): discoveries made (primitives excluded) and the furthest era reached. Nothing optional is stored as a separate counter.

| Feature (`lib/unlocks/registry.ts`) | Rule | Gates |
|---|---|---|
| archive | 8 discoveries | Archive tab |
| companion | 8 discoveries | Companion on the bench |
| graph | 8 discoveries | Graph tab |
| quiz | 8 discoveries | Corner questions |
| journal | 12 discoveries | Journal |
| collection | 20 discoveries | Top-bar Collection tile and drawer |
| hub, mode:survival | 20 discoveries | Mode Hub, Survival |
| goals | 20 discoveries | Goals tab (daily objectives, achievements) |
| timeline | Settlement | Timeline tab |
| visitors | Settlement | Visitor (NPC) encounters, Visitors tab |
| museum, world | Agriculture | Museum, World chip |
| mode:archaeology, mode:civilization | Civilization | Modes |
| trade | Trade | Trade button |
| eggs | Trade | Easter-egg watcher |
| mode:decipher | Trade | Decipher mode |
| mode:escape-room | Metallurgy | Escape Room |
| lab | Science | Laboratory |
| events | 50 discoveries and Science | Global scenarios (event layer) |
| puzzles | Science | Puzzles |
| mode:reverse-evolution | Industry | Reverse Evolution |
| minpath | Electric | Minimum Path |
| mode:alien-archaeology | Computing | Alien Archaeology |

Derived gates that are not features:
- **Techniques** (`lib/unlocks/techniqueGate.ts`): learned techniques from the Fire, Settlement, Agriculture and Metallurgy bands show in the rail once that era is reached. The first two bands are always shown. The engine still records every learned technique.
- **Cosmetics** (`lib/unlocks/cosmeticGate.ts`): uncommon from Trade, rare from Metallurgy. Owned cosmetics are always listed.

## 2. Components mounted before their unlock

Before the change, `components/Sandbox.tsx` rendered every optional view and layer whenever the workspace was entered. Now:

| Component | Before | After |
|---|---|---|
| `ArchiveView` | always mounted (hidden with CSS) | mounted only while `view === 'arch'` |
| `TimelineView` | always mounted | mounted only while `view === 'time'` |
| `GraphView` | always mounted | mounted only while `view === 'graph'` |
| `EventLayer` | always mounted | only with the `events` feature |
| `Companion` | always mounted | only with `companion`; its nudge timer runs only on the bench |
| `EggWatcher` | always mounted, global listeners and a 250 ms poll | only with `eggs`, and only on the bench |
| `NpcEncounter` | always mounted | only with `visitors` |
| Coin pill and sticker wheel | always drawn on the bench | removed from the bench; the Collection drawer holds them |
| Collection drawer | opened from the bench pill | opened from the top-bar tile (and the `C` key) |

## 3. Timers, listeners and loops

| Source | What runs | Cleanup |
|---|---|---|
| `EggWatcher` | 7 window listeners and a 250 ms interval | all removed and cleared on unmount (test: `EggWatcherCleanup.test.tsx`) |
| `Companion` | `retention` bus subscription, nudge interval 15 s, mood timeouts | cleared on unmount; interval only while `visible` |
| `NpcEncounter` | bus subscription, encounter timeout | cleared on unmount; cooldown six minutes |
| `EventLayer` | 30 s clock for scenario windows | cleared on unmount |
| `ArchiveView` | `StatsCounter` (framer-motion) | framer-motion pauses animation when off screen and when the tab is hidden |
| Mode Hub cards | one `verifiedPacket` fetch per card, only when the packet flag is on | cancelled on unmount |

## 4. Repeated work reduced

- `ArchiveView`: the reach set, the per-era totals (one pass over the catalogue) and the filtered, sorted list are memoized on `engine` and `version`, and on the filter and era for the list. The list no longer re-filters on every render.
- `ActionRail`: learned techniques are filtered by their band's era on each engine change, not stored separately.

## 5. Save keys (must stay compatible)

| Key | Written by | Notes |
|---|---|---|
| engine save (discoveries, routes, eras) | `lib/engine.ts` and its store | unchanged; every unlock is derived from it |
| unlock memory (`told`, `opened`) | `lib/unlocks/store.ts` | unchanged key and shape; parser accepts old and garbage input |
| retention store (coins, owned, equipped, eggs, npcs, daily, achievements) | `lib/retention/store.ts` | unchanged; the Start-over path does not reset it |

No migration was needed: no key was renamed, and no new stored field is required for an old save to load.

## 6. Performance measurements

Only one number was taken: the DOM size of the workspace on a fresh profile in the current production build, 1,088 nodes. A baseline build of commit `5b9190f` could not be produced in this environment (Turbopack rejects the shared `node_modules` link; the webpack build also failed), so no before/after comparison exists. Frame rate was not sampled because the browser pane does not run `requestAnimationFrame` while it is hidden.
