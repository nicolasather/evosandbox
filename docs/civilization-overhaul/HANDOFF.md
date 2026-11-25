# HANDOFF

Maintained by CODE (lead dev). Art bots append to ASSET_MANIFEST.md only.

- **Current slice:** 0-10 done; polish and art re-review ongoing
- **Owner:** CODE
- **Implemented:** Slice 2: `lib/civ/world.ts` (seeded 40x30 map, hit testing), `lib/civ/camera.ts`, `components/civworld/{assets,render,CivWorldPane}` canvas renderer with pan/zoom/hover/select/recenter, keyboard controls, AssetStore with missing-file fallback to placeholders. Slice 1: `components/workspace/WorkspaceShell.tsx` (Civilization | Merging | Modes tabs; Collapse/Split/Maximize; draggable+keyboard divider; narrow screens use a bottom drawer), `lib/workspace/layout.ts` (pure prefs, key `evo.workspace.v1`), `components/civworld/CivWorldPane.tsx` (placeholder), `Sandbox` gained optional `openHubSignal` prop, `AppRoot` default mode renders the shell. Sandbox stays mounted in every layout. Slice 0: docs structure, REPOSITORY_AUDIT.md, MODE_PRESERVATION_MATRIX.md, DECISIONS.md D-001..D-007, ASSET_MANIFEST.md (provisional contract), WORKSPACE_UX.md
- **Files changed:** app/_workspace.css, app/globals.css, components/AppRoot.tsx, components/Sandbox.tsx, components/workspace/*, components/civworld/*, lib/workspace/*, tests, docs/civilization-overhaul/*
- **Assets received:** terrain (grass, dirt, path, shore_water, rock, tree), fx campfire sheet, villager sample 32x32 + portraits (see ASSET_MANIFEST)
- **Assets pending:** terrain palette sample (IMAGE), character scale test (IMAGE3)
- **Tests:** typecheck clean; eslint clean on new files; jest WorkspaceShell (4) + layout (4) + Sandbox/ModeHub/TopBar suites pass
- **Known issues:** Pre-existing failing test lib/civilization/lifelines/__tests__/integration.test.ts (expects Civilization subtitle Lifelines, registry says Settlements; untouched by this work). Farm, sand, portraits, hunter and child art not delivered or not yet used. Sandbox uses viewport media queries, so at narrow split widths (<~500px) its desktop layout can clip (guide cards). Split min is 34%; use Maximize on small windows. Pre-existing lint error at Sandbox.tsx:86 (guideOn effect), not mine. Sandbox window-level keyboard shortcuts stay active while Merging is hidden (to review in Slice 10).
- **Decisions needed:** none (all provisional decisions are recorded in DECISIONS.md)
- **Next small task:** act on IMAGE/IMAGE3 re-review of screens/ round 2; optional P2 items listed in DECISIONS D-008

## Systems map (lib/civ)
types.ts state; sim.ts tick, citizens, construction, trader, seasons; path.ts BFS; hints.ts hints, alerts, stepWorld; bridge.ts discovery bridge; goals.ts; selectors.ts; save.ts (evo.civworld.v1 plus backup and corrupt keys); runtime.ts clock (pause, 1/2/4x, pause-while-crafting, hidden-tab pause); data/* tuning, buildings, DISCOVERY_MAP (real db ids).
UI: components/civworld (canvas renderer, panels, asset loader with fallbacks), components/workspace (shell).
