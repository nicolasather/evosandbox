# HANDOFF

Maintained by CODE (lead developer). Art bots append to `ASSET_MANIFEST.md` only. The audit of the whole design is in `COMPLETION_AUDIT.md`.

- **Current slice:** 0-10 implemented and pushed to `main`; completion audit in progress of final verification (full jest, lint, build, localhost smoke).
- **Owner:** CODE
- **What exists:** workspace shell (tabs, collapse, dock, split, overlay, maximize), canvas settlement, deterministic simulation, citizens with needs and jobs, resources, build system with stages and rotation, discovery bridge (real db ids), hints, alerts, history, goals, journal, pins and map notes, seasons, flood hazard, exploration with fog, visiting trader, newcomer offers, child cohort, policies, quality tiers, UI scale, compact mode, audio (off by default), tutorial.
- **Art status:** delivered and wired: terrain (soft grass, dirt edges, sand, shore, water loops, path, cart road), props, campfire and smoke, buildings with construction stages (shelter large, house, storage, workshop, granary, forge, kiln, drying rack, trading post as market, town hall as assembly, public well, records hall, farm growth), resource states (berry, stone pile), citizen role sheets and action poses, portraits, emotes and HUD icons, animals (goat, sheep, deer, rabbit as ambient wildlife).
- **Art delivered but not used yet:** woodpile states, hunter and child roles, animal pen, irrigation channel tiles, stone wall/gate, bridge variants, workshop-large 96px (workshop footprint is 2x2).
- **Tests:** `npx jest lib/civ lib/workspace components/__tests__/{WorkspaceShell,CivPanels,ModeCoverage}` (all passing at last run); `npm run typecheck`; `npx eslint lib/civ components/civworld components/workspace`.
- **Known issues:** pre-existing lint error at `components/Sandbox.tsx` (guideOn effect). Disk on the dev machine was nearly full during this work (full `next build` needs about 700 MB free).
- **Decisions:** see `DECISIONS.md` (D-001 to D-010 and later additions).
- **Next small task:** act on any IMAGE/IMAGE3 review of `screens/`; pick up items from the deferred list in `COMPLETION_AUDIT.md` (P3 systems).

## Systems map
- `lib/civ/types.ts` state; `sim.ts` tick, citizens, construction, trader, newcomers, seasons; `path.ts` BFS; `hints.ts` hints, alerts, `stepWorld`; `extras.ts` exploration, flood, children, policies, pins, notes, phases, tutorial, daily upkeep; `bridge.ts` discovery bridge; `goals.ts`; `selectors.ts` (jobs, mood, food summary, forecast); `save.ts` (`evo.civworld.v1`, backup, corrupt copy); `runtime.ts` clock; `uiPrefs.ts` and `audio.ts` device preferences; `data/*` tuning, buildings, `DISCOVERY_MAP`.
- UI: `components/civworld` (canvas renderer `render.ts`, asset loader `assets.ts`, panels `panels.tsx`, `panels2.tsx`, pane `CivWorldPane.tsx`); `components/workspace/WorkspaceShell.tsx`.
- Keys written: `evo.civworld.v1`, `evo.civworld.v1.backup`, `evo.civworld.v1.corrupt`, `evo.civworld.ui.v1`, `evo.civworld.cam`, `evo.workspace.v1`. No other mode key is ever written.
