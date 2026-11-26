# QA report

Per-slice results (typecheck / lint / tests / browser checks) are appended here by CODE.

| Slice | Date | typecheck | lint | tests | browser check | notes |
|---|---|---|---|---|---|---|
| 1 | 2026-11-25 | pass | pass (new files) | pass | Orca browser on localhost: split layout, landing film and bench render inside the Merging pane; divider visible | Chrome extension unavailable, used Orca embedded browser |
| 3-9 | 2026-11-25 | pass | pass (new files; one pre-existing Sandbox.tsx error) | 412 pass, 1 pre-existing fail (lifelines registry subtitle) | Orca browser: citizens walk, carry and sleep with real sprites, build ghost invalid/valid, shelter built with real stage art, seeded discoveries (stone_tool, food_storage) unlocked Workshop and Storage through the bridge | dev-server CSS cache needed a touch once |
| Final (item 13) | 2026-11-26 | pass | 0 errors, 0 warnings | full jest: see "Totals" below | `e2e/section18.mjs` 13/13; `e2e/modes.mjs` 8/8 modes open, run 30 s, 0 errors, return to the workspace; `next build` passes | stale browser tabs from earlier runs had to be closed before the e2e (a 200-citizen autosave from the perf run leaked into check 3) |

## Totals
Full `npx jest --testTimeout=30000`: 217 suites, 1928 tests, all passing (final run after the art and lint pass). The perf test now asserts the median tick (under 120 ms) and p95 (under the 250 ms budget) after warm-up, so a busy machine's scheduler pauses do not move it; see `lib/civ/__tests__/perf.test.ts`. Browser e2e: 13/13 acceptance checks plus 8/8 modes.

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

### Correction to the ART verification above (CODE, same day)
That check confirmed files exist and resolve; it did not confirm each one is drawn. A code scan then found nine loaded assets that no code requested (`fx_tint`, `terrain_water_quiet`, `res_woodpile_states`, `ui_emote_idea`, `fx_rain_splash`, `fx_dust`, `bld_terraced_fields_stages`, `char_villager_actions_expanded`, `char_villager_variety_32x48`). They are now drawn (see ASSET_MANIFEST.md, "Art drawn in-game"), and the villager samples and superseded thumbnails and portraits are removed. Checked again after the change: `tsc` clean, `next build` passes, jest 217/217 suites (1928 tests), `e2e/section18.mjs` 13/13, lint 0 errors and 0 warnings.

## Accessibility, live pass (CODE, 2026-11-26)
Run with `node docs/civilization-overhaul/e2e/a11y-live.mjs` (headless Chrome, dev server on :3111, 1280x800). Each check was run in the browser, not only in unit tests.

| Check | Result |
|---|---|
| Keyboard-only tab order through the workspace | 29 distinct stops (tabs, layout buttons, map, pause and speed, HUD warning, zoom, toolbar, Merging, Crew settings). Every stop has an accessible name and a visible focus ring. The Next.js dev overlay is excluded: it is development tooling, not game UI. |
| Keyboard pan, zoom, pause | Arrow keys pan (the camera position is now remembered, as with the pointer). `+` zooms. Space toggles pause. All pass. |
| Keyboard build | Enter on Build opens the drawer; Enter on Shelter selects it; Tab to the map; arrows move the placement outline, validated like the pointer; Enter places it. A shelter was placed on the first valid try. |
| Escape | Closes an open drawer even when focus is on one of its buttons (fixed: it previously did nothing from a focused control). |
| Contrast, live computed colours | 28 visible text elements in the settlement pane and drawers. Lowest ratio 9.73:1 (WCAG AA needs 4.5:1). No failures. The static palette tests in `CivAccessibility.test.tsx` also pass. |
| Accessible names | No unnamed button, input or canvas in the pane or drawers. The map's label now also describes the build keys. |
| Reduced motion | With the sim paused, the picture changes between two samples 1.2 s apart when motion is on (fire, smoke, birds), and is pixel-identical when `prefers-reduced-motion: reduce` is emulated. The gate is also unit-tested (`uiaudio.test.ts`). |
| Colour-blind safety | Checked on the screenshots: every warning and alert carries words ("Warning: Food reserve is 1.8 days", "Locked: ..."), resources carry numbers and labels, and priorities are text segments. No status depends on colour alone. Not tested with a simulated colour-vision filter. |
| Screen-reader labels | Verified in the DOM. Live regions are covered by `CivAccessibility.test.tsx`. No real screen reader was run. |

Gaps found and fixed in this pass: keyboard placement did not exist (placing a building needed the pointer); Escape did not close a drawer from a focused button; the keyboard camera position was not remembered.

## Final art review (CODE, 2026-11-26), default quality tier
Screenshots (1280x800, default tier), in `docs/civilization-overhaul/screens/`:
- `desktop_main.png`: settlement with people, houses, campfire, farms, trees, bushes and the rest of the terrain. The new art reads correctly.
- `desktop_build_drawer.png`: build drawer with the building thumbnails (v3) and their costs and unlock hints.
- `desktop_night.png`: night (the HUD reads "Night"). Before this pass the night tint was too weak to read as night. It now has a cool wash on top of the tint sheet; the change is visible in the saved screenshot.
- `desktop_keyboard_build.png`: after the keyboard-only shelter placement.

Not changed, and not art: small red and green squares scattered on the grass are map notes and pins (`render.ts`, notes drawn as small coloured rectangles), and the "1 Issue" badge bottom left is the Next.js development overlay, not part of the game.
