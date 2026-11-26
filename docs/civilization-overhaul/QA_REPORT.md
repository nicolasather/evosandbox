# QA report

Per-slice results (typecheck / lint / tests / browser checks) are appended here by CODE.

| Slice | Date | typecheck | lint | tests | browser check | notes |
|---|---|---|---|---|---|---|
| 1 | 2026-11-25 | pass | pass (new files) | pass | Orca browser on localhost: split layout, landing film and bench render inside the Merging pane; divider visible | Chrome extension unavailable, used Orca embedded browser |
| 3-9 | 2026-11-25 | pass | pass (new files; one pre-existing Sandbox.tsx error) | 412 pass, 1 pre-existing fail (lifelines registry subtitle) | Orca browser: citizens walk, carry and sleep with real sprites, build ghost invalid/valid, shelter built with real stage art, seeded discoveries (stone_tool, food_storage) unlocked Workshop and Storage through the bridge | dev-server CSS cache needed a touch once |
| Final (item 13) | 2026-11-26 | pass | 0 errors, 21 warnings (frozen modes' React Compiler rules reported as warnings, see HANDOFF) | full jest: see "Totals" below | `e2e/section18.mjs` 13/13; `e2e/modes.mjs` 8/8 modes open, run 30 s, 0 errors, return to the workspace; `next build` passes | stale browser tabs from earlier runs had to be closed before the e2e (a 200-citizen autosave from the perf run leaked into check 3) |

## Totals
Filled in from the last full `npx jest --testTimeout=30000` run: see the line at the end of this file.

## Performance (item 6)
Measured in the browser with the e2e FPS script and in jest (`lib/civ/__tests__/perf.test.ts`):
- Simulation tick, 200 citizens: 10.8 ms average, 14.4 ms p95 (budget 250 ms).
- Canvas at 200 citizens: 50.7 fps on the default tier; draw cost about 1 ms per frame on every tier. Earlier low-tier readings of 3.3 fps were a measurement artifact (hidden canvas baseline 1.2 fps).
- Tiers low/medium/high gate loops and effects; offscreen tiles are culled; a hidden tab pauses with no catch-up burst; React state is not touched per frame.

## Section 19 test plan coverage
| Area | Where |
|---|---|
| Workspace | `WorkspaceShell.test.tsx` |
| Modes preserved | `ModeCoverage.test.ts`, `e2e/modes.mjs` |
| Simulation determinism | `sim.test.ts`, `systems.test.ts` |
| Resources, construction | `sim.test.ts`, `daily.test.ts`, `extras*.test.ts` |
| Discovery bridge | `systems.test.ts`, `integration.test.ts` |
| Hints | `systems.test.ts`, `integration.test.ts` |
| Assets | `unused-assets.py` plus `integration.test.ts` |
| Saves | `saves2.test.ts`, `writer.test.ts` |
| Performance | `perf.test.ts` |
| Accessibility | `CivAccessibility.test.tsx` |
| Balance | `balance.test.ts` (30 in-game days, headless) |
| Optional modules | `modules.test.ts`, `CivModulesPanels.test.tsx` |
| Browser acceptance (13 points) | `e2e/section18.mjs` |
