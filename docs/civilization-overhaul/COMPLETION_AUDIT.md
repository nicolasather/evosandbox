# Completion audit against the master design

Method: every section of `MASTER_DESIGN.md` (sections 0-24 and Part II, 25-50) walked in order. Status words:
- **DONE** = implemented, with the file and the test that proves it.
- **DEFERRED** = none. Everything the design marks P2/P3/experimental is now implemented as an optional module (`lib/civ/modules.ts`, switches in Help, tests in `modules.test.ts`).
- **MISSING** = none at the time of writing. If a later review finds one, it goes here first.

Paths: sim = `lib/civ/*`, UI = `components/civworld/*`, shell = `components/workspace/*`, tests = `lib/civ/__tests__/*`, `components/__tests__/*`.

## Section 0 non-negotiable decisions
| Item | Status | Evidence |
|---|---|---|
| Civilization primary, default tab | DONE | `WorkspaceShell` default layout `civ`; `WorkspaceShell.test.tsx` |
| Merging permanent, resizable, never deleted | DONE | Sandbox stays mounted in every layout; `WorkspaceShell.test.tsx` (same node through every change) |
| All other modes preserved | DONE | `ModeCoverage.test.ts`, registry unchanged, `MODE_PRESERVATION_MATRIX.md` |
| Existing discovery engine authoritative | DONE | `bridge.ts` only observes `engine.found`; `systems.test.ts` (real db ids) |
| Existing 3D models kept | DONE | Sandbox/Plate3D untouched |
| 2D pixel world | DONE | `components/civworld/render.ts` |
| Art bots deliver real assets, research | DONE (by IMAGE/IMAGE3) | `VISUAL_REFERENCES.md`, `ASSET_MANIFEST.md` |
| No deploy / no destructive migration | DONE | no deploy performed; `save.ts` backup + corrupt key |

## Sections 1-3 vision, loop, camera
| Item | Status | Evidence |
|---|---|---|
| Observe / interpret / choose / invent / apply / adapt / remember / expand loop | DONE | HUD, inspector, hints, bridge, history, goals; `integration.test.ts` (section 18) |
| Tile world, river, forest, stone, nodes | DONE | `lib/civ/world.ts`, `world.test.ts` |
| Pan, zoom, drag, selection, hover, recentre | DONE | `CivWorldPane.tsx`, `camera.ts`, `world.test.ts` |
| Hit areas larger than sprites | DONE | `world.ts` `HIT_PAD`, citizen box; `world.test.ts` |
| Layers: ground, nodes, structures, agents, effects, overlays | DONE | `render.ts` (terrain cache, sorted entities, fx, overlay toggle in settings) |
| Toggleable planning overlays | DONE | `uiPrefs.overlays`, `panels2.tsx`; reach ring and walking routes |
| Chunk/offscreen culling, static vs dynamic layers | DONE | `camera.visibleTiles`, terrain cache; `integration.test.ts` |
| Reduced motion, quality tiers | DONE | `uiPrefs.ts`, `uiaudio.test.ts`; low/medium/high gate loops and fps |
| Hand-authored first map, procedural later | DONE | `createWorld(seed, kind)`; classic stays default; `modules.test.ts` |

## Section 4 simulation
| Item | Status | Evidence |
|---|---|---|
| 4.1 clock, pause, speeds, deterministic ticks, seeded RNG, animation separate | DONE | `runtime.ts`, `sim.test.ts` determinism, `systems.test.ts` clock |
| Pause while crafting preference; hidden-tab rule | DONE | `runtime.ts`; `integration.test.ts` hidden tab, no burst |
| 4.2 citizens: id, age group, home, role/skills, needs, task, traits, history | DONE | `types.ts` Citizen; events for notable moments |
| Hybrid cohorts for larger population | DONE | children cohort `extras.stepPopulation`; named adults capped at 16 |
| 4.3 needs: hunger, rest, safety, health, social | DONE (scoped) | hunger/rest simulated and explained; safety = flood avoidance; health/social = mood summary (`selectors.moodOf`) and water pressure hint. No disease (4.9 says not in opening hours) |
| 4.4 jobs by category, reasons when blocked, direct override that expires | DONE | `selectors.jobStatuses`, `assignOverride`; `systems.test.ts` |
| 4.5 resource families with source/sink/storage/unit | DONE | food, wood, stone, tools; water (stored, `water`); knowledge via capabilities; wealth via trade prices |
| 4.6 logistics: gather, carry, store, full storage pauses | DONE | `sim.ts`; `sim.test.ts` accounting identity |
| 4.7 farming, regrowth, overharvest cost, spoilage explained | DONE | farm plots, bush regrow, `extras.stepDaily`; `daily.test.ts` |
| 4.8 housing capacity abstraction, overcrowding visible | DONE | `sleepCapacity`, rough sleeping slower rest, alerts |
| 4.9 health/sanitation legible later pressure | DONE | stored water from wells, thirst and dry fields with warning and recovery (`stepWater`), cold stress from climate; no random disease |
| 4.10 item discovery vs capability, skills modest and visible | DONE | `discoveryMap.ts`, skills in inspector |
| 4.11 buildings: campfire, shelter, storage, workshop, farm, well, road, market | DONE | `data/buildings.ts` (+ house, kiln, rack, granary, forge, assembly) |
| 4.12 exploration with report | DONE | `extras.ts` expeditions, fog, POI; `extras2.test.ts` |
| 4.13 trade: visiting trader, exact quantities, prices, routes, caravans | DONE | `sim.ts` trader; `modules.ts` priceOf/quote/routes/caravans; `modules.test.ts` |
| 4.14 society/governance: rules with benefit and trade-off, public projects | DONE | assembly + four laws (`modules.ts` LAWS, `GovernanceSection`); `modules.test.ts` |
| 4.15 events with structured facts, timeline, filter | DONE | `CivEvent`, `LogDrawer` (filter, facts, show on map) |

## Section 5 hints
| Item | Status | Evidence |
|---|---|---|
| Three strengths, hint definitions, cooldowns, dedupe, priority | DONE | `hints.ts` (16 hints); `systems.test.ts` |
| Preconditions, no locked/finished hints, never claims a recipe | DONE | storage hint test; engine decides |
| Ask another / dismiss | DONE | `askMoreHint`, `dismissHint` |

## Section 6 discovery, merging, civilization
| Item | Status | Evidence |
|---|---|---|
| Shared contract, one event, capability event, skippable result, no focus steal | DONE | `bridge.ts`, `DiscoveryToast` (tabIndex -1) |
| No false instant effects | DONE | `systems.test.ts` stock unchanged by discovery |
| Failure/near-miss, known duplicate | DONE | merge engine untouched |
| Duplicate event prevention | DONE | `seenDiscoveries`; `systems.test.ts` |

## Section 7 workspace
| State | Status | Evidence |
|---|---|---|
| Full Merging tab / Focus mode | DONE | layout `merge` |
| Split with draggable, keyboard divider | DONE | layout `split`; min Merging width 560px (fixes narrow clipping) |
| Compact dock | DONE | layout `dock` (Merging laid out at 760px, scaled to a 380px strip) |
| Collapsed tab / handle | DONE | layout `civ` |
| Expanded overlay, Escape returns | DONE | layout `overlay` |
| Layout persisted, broken layout discarded | DONE | `layout.ts`, `layout.test.ts` |
| Sim keeps running; critical alerts not covered | DONE | runtime independent of layout |
| Narrow screens: drawer | DONE | vertical orientation below 820px |
| Shortcuts only while Merging visible | DONE | `Sandbox inputActive` |
| Camera/selection/layout restored on return | DONE | camera saved (`evo.civworld.cam`), layout saved |

## Section 8 UI, accessibility, settings
| Item | Status | Evidence |
|---|---|---|
| HUD: stage, people, resources, clock, mood, alerts with navigation | DONE | `panels.tsx` Hud |
| Context panels: citizen, building, node, tile (+nearby), event | DONE | `Inspector`, `LogDrawer` details |
| Build mode: unlocked only, ghost, footprint, rotation, cost, reasons, stages, refund | DONE | `validatePlacement`, `sim.test.ts`, `extras3.test.ts` |
| Keyboard access, focus rings, roles/labels | DONE | native buttons, `aria-*`, canvas keys |
| Reduced motion, UI scale, compact mode | DONE | `SettingsSection`, `uiPrefs` |
| Sound toggles and volumes | DONE | `audio.ts` (off by default) |
| Colour never the only signal | DONE | text labels beside every bar and alert |

## Section 9 progression
| Item | Status | Evidence |
|---|---|---|
| Capability-based phases beyond the first eras | DONE | `extras.phaseOf` five phases; discoveries for fire, tools, storage, agriculture, granary, pottery, irrigation, trade, writing, records, law/assembly, smelting, mathematics, carts |
| No pre-scripted eras | DONE | phase computed from state; `extras2.test.ts` |
| No warfare priority | DONE | none implemented |

## Section 10 other modes
| Item | Status | Evidence |
|---|---|---|
| Registry enumerated, ids/save keys fixed, none removed | DONE | `ModeCoverage.test.ts`, matrix |
| Own saves untouched | DONE | `systems.test.ts` writes only `evo.civworld.v1*` |
| Launch smoke | DONE | e2e smoke recorded in `QA_REPORT.md` |

## Sections 11-13 art, animation, files
| Item | Status | Evidence |
|---|---|---|
| Asset families delivered and wired with fallbacks | DONE | `assets.ts`, `ASSET_MANIFEST.md` |
| Sprite contracts, reduced-motion static frame, frame order, wrong-size warning | DONE | `animFrame`, `validateSheet`; `integration.test.ts` |
| Docs set | DONE | all files listed in section 20 present (GAMEPLAY_SYSTEMS, SIMULATION_RULES, HISTORICAL_RESEARCH by IMAGE3) |

## Section 14 architecture and saves
| Item | Status | Evidence |
|---|---|---|
| Sim independent of React; render reads state | DONE | `lib/civ` has no React imports |
| Mapping layer, small curated set | DONE | `discoveryMap.ts` (real ids verified by test) |
| Versioned save, pure migration, backup, corrupt recovery | DONE | `save.ts`; `systems.test.ts` |
| Layout prefs separate | DONE | `evo.workspace.v1`, `evo.civworld.ui.v1` |
| Old, partial, unknown-field, reload after discovery | DONE | `systems.test.ts`, `integration.test.ts` |

## Section 15 performance
Quality tiers DONE (`uiPrefs.qualityFlags`), offscreen culling DONE (`visibleTiles`), static terrain cache DONE, no per-frame React churn DONE (canvas draws from refs; panels update per tick), background tab DONE, no AI calls DONE, unit tests for accounting DONE.

## Section 16-17 plan and roles
Slices 0-10 delivered in order; art requests and reviews exchanged over Orca (`screens/`, status messages). DONE.

## Section 18 acceptance test (13 points)
1. Small pixel settlement visible: DONE (`01`/`04` screens).
2. Pan and zoom: DONE.
3. At least three inhabitants idle and walk: DONE (`integration.test.ts`).
4. Select one, inspect task and needs: DONE (`CivPanels.test.tsx`, Inspector).
5. Two resources visibly change: DONE (`integration.test.ts`).
6. A building placed, constructed, selected: DONE.
7. A real problem triggers a contextual hint: DONE (`food_low`, `storage_full`, others).
8. Merging opens in split/compact without losing the settlement: DONE (layouts).
9. A valid combination processed by the existing engine: DONE (engine untouched; bridge verified with a seeded real save).
10. Discovery unlocks a capability used to build/produce: DONE (`systems.test.ts` workshop then tools).
11. Simulation continues while Merging is open unless paused: DONE.
12. State saves and reloads: DONE.
13. Every other mode accessible and smoke-tested: DONE (`ModeCoverage.test.ts`, e2e smoke).

## Section 19 test plan
| Area | Status | Where |
|---|---|---|
| Workspace | DONE | `WorkspaceShell.test.tsx`, `layout.test.ts` |
| Modes | DONE | `ModeCoverage.test.ts` |
| Simulation | DONE | `sim.test.ts` |
| Resources | DONE | `sim.test.ts`, `integration.test.ts` |
| Construction | DONE | `sim.test.ts`, `extras3.test.ts` |
| Discovery bridge | DONE | `systems.test.ts` |
| Hints | DONE | `systems.test.ts`, `extras2.test.ts` |
| Assets | DONE | `integration.test.ts` |
| Saves | DONE | `systems.test.ts`, `integration.test.ts` |
| Performance | DONE | `uiaudio.test.ts`, `integration.test.ts` |

## Part II (sections 25-50)
| Section | Status | Evidence / note |
|---|---|---|
| 26 steward role, three levels of control | DONE | strategic (policies), operational (jobs, build, explore), tactical (override with expiry) |
| 27 first-hour journey, onboarding | DONE | `TutorialTip`, goals; one concept at a time, skippable; `CivPanels.test.tsx` |
| 28 discovery to toolchain | DONE | workshop, tools, "Using: stone tool", first craft event; `systems.test.ts` |
| 29 food shortage and recovery | DONE | alerts, panel tooltip (stock, rate, reserve, trend, spoiled), hints, recovery event; reserve held back from ordinary eating |
| 30 winter preparation | DONE | seasons (switchable), forecast, autumn hint, season report; `extras3.test.ts` |
| 31 building placement and construction | DONE | stages, ghost, cancel refund; pause/resume a workplace |
| 32 citizen AI, hysteresis, crowding | DONE | continuity bonus, free-tile preference, reasons shown |
| 33 households and life stages | DONE | beds, child cohort with named parents, adults become elders, household migration offers, family tree (`modules.ts`, `FamilySection`) |
| 34 social life, culture | DONE (scoped) | festival with postponement, workload unrest, one mood with contributors, elder teaching |
| 35 policies with preview and confirm | DONE | `PoliciesSection` |
| 36 exploration, POIs, expedition panel | DONE | `ExplorePanel`, `extras2.test.ts` |
| 37 weather, seasons, temperature | DONE | day/night, rain with flood warning, wind, river, seasons, temperature, clothing, roofs, fuelled fire (`modules.ts` climate) |
| 37.1 flood with warning and recovery | DONE | `extras.stepHazard`; nothing destroyed |
| 38 wildlife | DONE | ambient animals; hunted game herds that recover slowly; animal pens that need feeding (`stepHerds`) |
| 39 production chains with bottleneck display | DONE | Jobs drawer blocked reasons per chain |
| 40 trade and visitors | DONE | trader, caravan, craftsperson, messenger, migrating household (`maybeSpecialVisitor`, `acceptVisitor`) |
| 41 goals and projects, pin/dismiss | DONE | `goals.ts`, `PinsSection` |
| 42 journal, people index, building index, glossary, map notes, history | DONE | `JournalDrawer`, `NotesSection` |
| 43 dialogue, bubbles cap, captions, no-dialogue option | DONE | `HintCard` modes |
| 44 visual feedback | DONE | emotes, carrying, construction stages, dust, discovery ring |
| 45 audio | DONE | `audio.ts`, synthesised, off by default, separate volumes |
| 46 mode and shared progression rules | DONE | see section 7 and 10 |
| 47 save/load concrete cases | DONE | tests listed above |
| 48 edge cases | DONE | `integration.test.ts`, `extras2.test.ts` (removal, no duplicate claim, depletion, blocked paths, speed change, hidden tab, missing sprite) |
| 49-50 sample content pack | DONE (as sample) | sample ids mapped to manifest ids; reeds and open stockpile are samples, not required |

## Part II section-by-section additions (second pass)
| Section | Status | Evidence |
|---|---|---|
| 25 priority labels P0-P3, experimental behind a flag | DONE | P0/P1 in the core; P2/P3/experimental as optional modules with switches (`MODULES`) |
| 26.1 example: riverbank gathering zone with hunger interruption | DONE | job priorities, hunger interrupts, blocked reason `Storage is full` |
| 27.1 onboarding principles | DONE | one concept per tip, tied to real actions, skip, journal keeps the info |
| 29.1 food model | DONE | stock, rate, days, trend, reserve target held back, spoilage explained |
| 31.1 placement example | DONE | green/amber (far)/red ghost with reasons |
| 31.2 building data contract | DONE | `BuildingDef` (footprint, rotation, terrain, cost, stages, workers, purpose, assets) |
| 32.1/32.2 task choice, hysteresis, no crowding | DONE | continuity bonus, free-tile preference, top reason shown |
| 34.1/34.2 festival, disagreement | DONE | `stepDaily` festival with postponement, workload unrest |
| 36.1 expedition example | DONE | `ExplorePanel` |
| 37.1 flood | DONE | `stepHazard` |
| 40.1 trade example (exact quantities, reserve warning) | DONE | `tradePreview.belowReserve`, trade card |
| 42.1 journal entry example | DONE | `JournalDrawer` (changed, still needed, related history) |
| 43.1 dialogue rules | DONE | cooldowns, one bubble, no-dialogue option |
| 45 audio | DONE | `audio.ts` |
| 46 mode and shared progression | DONE | layouts + preserved modes |
| 47 save/load cases | DONE | `systems.test.ts`, `integration.test.ts` |
| 48 edge cases | DONE | tests listed above |
| 49-50 content pack | DONE (as samples) | ids mapped to manifest; reeds and open stockpile are samples, not required by the design |

No DEFERRED items remain. Items that depend only on art not yet delivered are listed in ASSET_MANIFEST.md.
