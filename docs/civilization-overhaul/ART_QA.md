# Civilization Art QA

Date: 2026-11-26  
Build: localhost `npm run dev`, `http://localhost:3000/sandbox`  
Method: opened Civilization, skipped onboarding, inspected the rendered settlement at default zoom and 2× zoom. The initial camera visibly exercised grass, dirt, trees, berry nodes, citizens, campfire, farm plots, shelter-scale structure, HUD icons, and path. Assets marked **not seen** are not failures: the current starting camera does not place every manifest family in view and many new families are not yet wired into the renderer.

| Asset / family | Seen in game | Issue | Fix / code handoff |
|---|---:|---|---|
| `terrain_grass`, `grass-soft-*` | Yes / partial | Base grass is readable; soft variants not distinguishable in this view. | No art fix; wire scatter variants for review. |
| `terrain_dirt`, `dirt-grass-edge-*` | Yes / partial | Dirt is warm and readable; edge masks were not independently observable. | No art fix; exercise all four masks in a transition map. |
| `terrain_shore_water`, `terrain_water_deep`, sand | No | No water/shore in initial camera. | Code-side screenshot needed with river chunk. |
| `terrain_path`, `path-edge-variants`, cart-road variants | Yes / partial | Vertical path is clean but appears narrow at default zoom. | Verify intended 1-tile width; no art change. |
| `prop_tree`, tree variants/seasons | Yes / partial | Base tree silhouette and anchor read correctly; variants not shown. | No art fix; add seasonal preview scene. |
| flowers, bushes, stumps, reeds, orchard | No | Not placed in starting camera. | Code-side placement fixture needed. |
| berry/wood/stone resource states | Berry yes; others no | Berry nodes render strongly; wood/stone not visible. | No art fix; use resource-state fixture. |
| `fx_campfire_sheet`, static | Yes | Flame, logs, smoke read at 2× with correct bottom anchor. | No fix. |
| shore foam, grass wind, smoke, forge/chimney smoke | No | Not visible in current scene. | Code-side effect fixture needed. |
| weather rain/frost/splash, fireflies, sparks, harvest sparkle, lanterns | No | Not visible in current scene. | Code-side weather/event fixture needed. |
| gatherer directional/actions | Yes | Citizens are legible; feet align with terrain grid. | No fix. |
| hunter/builder/toolmaker/elder/child sheets | Builder/elder partial; rest no | Role sheets are not all spawned by the starting simulation. | Code-side role fixture; hunter/child are delivered but unused. |
| trader directional/portrait | No | Visitor not present in initial state. | Code-side trader event fixture. |
| villager variety/actions expanded | No | New variants/actions are not wired into the visible starting scene. | Code-side action-cycle fixture. |
| final role portraits and villager portraits | No | Portraits appear only in drawers/events, not initial map. | Open People/Event drawer for screenshot QA. |
| shelter/storage/workshop/granary/forge sheets | Shelter partial; others no | Shelter-scale structure reads larger than citizens; other buildings not placed. | No art fix; build each in a fixture map. |
| house/kiln/rack/pen/trading post/large workshop | No | New buildings are not in starting settlement. | Code-side build-menu/placed-building fixture. |
| records hall/town hall/public well/wall/gate/bridge | No | Complex-settlement assets not in starting settlement. | Code-side later-era fixture. |
| goat/sheep/deer/rabbit/dog/chicken/fish | No | Wildlife/domestic animals are not spawned in initial camera. | Code-side wildlife fixture; art files are present. |
| event cards and Part II cards | No | Cards render only when event/history UI opens. | Open History/Trade/event drawers for review. |
| building thumbnails, era badges, emotes | HUD icons yes; thumbnails/badges no | Resource HUD icons look crisp; build-menu assets not exercised. | Code-side Build panel fixture; prefer `ui_building_thumbnails_v2`. |
| seasonal grass/tree and dawn/night tint | Day scene only | Day tint is coherent; seasonal variants not selectable in current UI. | Code-side season/tint toggle fixture. |

## Visual verdict

The visible starting scene passes the shared scale, palette, outline and anchor bar. The largest remaining QA gap is wiring/coverage: the initial map does not exercise most later-era assets, so those rows cannot honestly be marked seen. No art-side correction was warranted from the localhost screenshot. The one concrete code-side issue is fixture coverage: add a debug/gallery map or deterministic QA seed that places every asset family and exposes event/build/season states.
