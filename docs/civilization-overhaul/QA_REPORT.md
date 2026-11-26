# QA report

Per-slice results (typecheck / lint / tests / browser checks) are appended here by CODE.

| Slice | Date | typecheck | lint | tests | browser check | notes |
|---|---|---|---|---|---|---|
| 1 | 2026-11-25 | pass | pass (new files) | pass | Orca browser on localhost: split layout, landing film and bench render inside the Merging pane; divider visible | Chrome extension unavailable, used Orca embedded browser |
| 3-9 | 2026-11-25 | pass | pass (new files; one pre-existing Sandbox.tsx error) | 412 pass, 1 pre-existing fail (lifelines registry subtitle) | Orca browser: citizens walk, carry and sleep with real sprites, build ghost invalid/valid, shelter built with real stage art, seeded discoveries (stone_tool, food_storage) unlocked Workshop and Storage through the bridge | dev-server CSS cache needed a touch once |
| Final (item 13) | 2026-11-26 | pass | 0 errors, 21 warnings (frozen modes' React Compiler rules reported as warnings, see HANDOFF) | full jest: see "Totals" below | `e2e/section18.mjs` 13/13; `e2e/modes.mjs` 8/8 modes open, run 30 s, 0 errors, return to the workspace; `next build` passes | stale browser tabs from earlier runs had to be closed before the e2e (a 200-citizen autosave from the perf run leaked into check 3) |

## Totals
Full `npx jest --testTimeout=30000`: 217 suites, 1928 tests, 1927 pass. The one failure is `perf.test.ts` (200-citizen tick budget, 122.9 ms average against a 120 ms test bound) when 217 suites run in parallel on a loaded machine; alone it passes at about 11 ms. Civilization-specific: `lib/civ`, `CivPanels`, `CivModulesPanels`, `CivAccessibility`, `WorkspaceShell`, `ModeCoverage` = 282 tests, all passing. Browser e2e: 13/13 acceptance checks plus 8/8 modes.

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

## ART backlog verification (origin/main `78da670`, 2026-11-26)

The ART backlog items 2–9 were rechecked against the manifest, loader, and delivered files. The loader has 100 conventional PNG references; all 100 resolve under `public/civilization/`, and no referenced file is zero bytes.

| ART item | Verification | Result |
|---|---|---|
| 2. Era visual upgrades | Era building/state sheets, bridge, wall/gate, town hall, records hall, loom, forge, orchard, granary and thumbnails are present and registered. | DONE |
| 3. Animals | Goat, sheep, deer, rabbit, dog, chicken and fish sheets are present; ambient/wildlife drawing is wired. | DONE |
| 4. Character variety | Role direction sheets, expanded actions, variety strip, trader and portraits are present; role/age selection and actions are wired. | DONE |
| 5. Effects | Campfire, smoke, weather, rain splash, frost, dust, sparks, harvest sparkle, fireflies, lanterns, chimney/forge smoke and tint sheets are present. | DONE |
| 6. UI art | Resource/tool icons, emotes, building thumbnails v3, era badges, hint/trigger cards and event cards are present and consumed by `SpriteIcon`. | DONE |
| 7. Terrain polish | Seasonal/soft grass, dirt-edge masks, sand, path/road/bridge variants, water, shore foam, flowers, bushes, reeds, stumps and tree/rock variants are present. | DONE |
| 8. Screenshot review | Screens 01–04 and README findings were reviewed; terrain round-two fixes pass, with no new screenshot currently on main. | DONE |
| 9. Manifest accuracy | Stable IDs, dimensions, frames and anchors match `ASSET_SPECS`; all 100 loader paths resolve. | DONE |

The 11 files listed as unused in the manifest are legacy/sample/superseded variants, not missing deliverables; the active replacements are wired. Procedural fallback code remains intentionally for runtime resilience, not because an ART asset is absent.
