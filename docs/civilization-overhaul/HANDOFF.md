# HANDOFF

Maintained by CODE (lead dev). Art bots append to ASSET_MANIFEST.md only.

- **Current slice:** 2 (static pixel world) done; starting 3 (citizen movement)
- **Owner:** CODE
- **Implemented:** Slice 2: `lib/civ/world.ts` (seeded 40x30 map, hit testing), `lib/civ/camera.ts`, `components/civworld/{assets,render,CivWorldPane}` canvas renderer with pan/zoom/hover/select/recenter, keyboard controls, AssetStore with missing-file fallback to placeholders. Slice 1: `components/workspace/WorkspaceShell.tsx` (Civilization | Merging | Modes tabs; Collapse/Split/Maximize; draggable+keyboard divider; narrow screens use a bottom drawer), `lib/workspace/layout.ts` (pure prefs, key `evo.workspace.v1`), `components/civworld/CivWorldPane.tsx` (placeholder), `Sandbox` gained optional `openHubSignal` prop, `AppRoot` default mode renders the shell. Sandbox stays mounted in every layout. Slice 0: docs structure, REPOSITORY_AUDIT.md, MODE_PRESERVATION_MATRIX.md, DECISIONS.md D-001..D-007, ASSET_MANIFEST.md (provisional contract), WORKSPACE_UX.md
- **Files changed:** app/_workspace.css, app/globals.css, components/AppRoot.tsx, components/Sandbox.tsx, components/workspace/*, components/civworld/*, lib/workspace/*, tests, docs/civilization-overhaul/*
- **Assets received:** terrain (grass, dirt, path, shore_water, rock, tree), fx campfire sheet, villager sample 32x32 + portraits (see ASSET_MANIFEST)
- **Assets pending:** terrain palette sample (IMAGE), character scale test (IMAGE3)
- **Tests:** typecheck clean; eslint clean on new files; jest WorkspaceShell (4) + layout (4) + Sandbox/ModeHub/TopBar suites pass
- **Known issues:** Sandbox uses viewport media queries, so at narrow split widths (<~500px) its desktop layout can clip (guide cards). Split min is 34%; use Maximize on small windows. Pre-existing lint error at Sandbox.tsx:86 (guideOn effect), not mine. Sandbox window-level keyboard shortcuts stay active while Merging is hidden (to review in Slice 10).
- **Decisions needed:** none (all provisional decisions are recorded in DECISIONS.md)
- **Next small task:** Slice 3: sim clock + citizens (lib/civ/sim)
