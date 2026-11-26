# Asset Manifest — Evolution Sandbox Civilization Overhaul

> Tracks all generated pixel-art assets, dimensions, animation metadata, and owners.

## Environment & Terrain (`IMAGE` — Gemini Role)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `terrain_grass` | `public/civilization/terrain/grass.png` | Static tile | 32×32 | 1 | — | — | Top-left | Seamless grass base |
| `terrain_grass_soft_variants` | `public/civilization/terrain/grass-soft-{a,b}.png` | Static tile variants | 32x32 | 2 | — | — | Top-left | Lower-noise grass alternatives for chunk scatter |
| `terrain_dirt` | `public/civilization/terrain/dirt.png` | Static tile | 32×32 | 1 | — | — | Top-left | Seamless dirt base |
| `terrain_dirt_edge_masks` | `public/civilization/terrain/dirt-grass-edge-{north,east,south,west}.png` | Edge mask set | 32x32 | 4 | — | — | Top-left | Transition overlays to soften clearing edges |
| `terrain_shore_water` | `public/civilization/terrain/shore_water.png` | Static tile | 32×32 | 1 | — | — | Top-left | Grass-to-water shore transition |
| `terrain_path` | `public/civilization/terrain/path.png` | Static tile | 32×32 | 1 | — | — | Top-left | Packed dirt path on grass |
| `prop_rock` | `public/civilization/terrain/rock.png` | Static sprite | 32×32 | 1 | — | — | Bottom-center | Transparent bg, warm outline |
| `prop_tree` | `public/civilization/terrain/tree.png` | Static sprite | 48×64 | 1 | — | — | Bottom-center | Transparent bg, top-left light |
| `fx_campfire_sheet` | `public/civilization/effects/campfire-sheet.png` | Spritesheet | 192×32 (32×32 cells) | 6 | 8 FPS (125ms) | Yes | Bottom-center | Fire + rising smoke |
| `fx_campfire_static` | `public/civilization/effects/campfire-static.png` | Static fallback | 32×32 | 1 | — | — | Bottom-center | Reduced-motion fallback |

---

### Environment follow-up (`IMAGE3`)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `fx_campfire_sheet_v2` | `public/civilization/effects/campfire-sheet.png` | Spritesheet | 192x32 (32x32 cells) | 6 | 8 FPS (125ms) | Yes | (16,31) | Detailed shaded flame, logs, embers, and smoke; metadata adjacent |
| `fx_campfire_static_v2` | `public/civilization/effects/campfire-static.png` | Static fallback | 32x32 | 1 | — | — | (16,31) | Reduced-motion fallback from the same palette |
| `fx_campfire_preview_4x` | `public/civilization/effects/campfire-4x-preview.png` | Review preview | 768x128 | 6 | — | — | — | Nearest-neighbor 4x preview; review-only |

## Character follow-up (`IMAGE3`)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `char_villager_sample_32x48` | `public/civilization/characters/villager-sample-32x48.png` | Spritesheet | 256x96 (32x48 cells) | 8 | provisional | Yes | (16,47) | East/west rows; idle/walk/work frame contract in adjacent metadata |
| `char_villager_portraits_sample` | `public/civilization/characters/villager-portraits-sample-48x48.png` | Portrait strip | 288x48 (48x48 cells) | 6 | — | — | Center | Six initial role samples |
| `char_villager_sample_preview_4x` | `public/civilization/characters/villager-sample-4x-preview.png` | Review preview | 1024x384 | 8 | — | — | — | Nearest-neighbor 4x preview; review-only |
| `char_villager_portraits_preview_4x` | `public/civilization/characters/villager-portraits-4x-preview.png` | Review preview | 1152x192 | 6 | — | — | — | Nearest-neighbor 4x preview; review-only |

### Directional character batch (`IMAGE3`)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `char_gatherer_directional_32x48` | `public/civilization/characters/gatherer-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | provisional | Yes | (16,47) | N/S/E/W rows; idle 2, walk 4, work 4 |
| `char_gatherer_directional_preview_4x` | `public/civilization/characters/gatherer-directions-4x-preview.png` | Review preview | 1280x768 | 40 | — | — | — | Nearest-neighbor 4x preview |
| `char_gatherer_actions_32x48` | `public/civilization/characters/gatherer-actions-32x48.png` | Action sheet | 96x192 (32x48 cells) | 12 | provisional | — | (16,47) | N/S/E/W carry, eat, sleep states |
| `char_gatherer_actions_preview_4x` | `public/civilization/characters/gatherer-actions-4x-preview.png` | Review preview | 384x768 | 12 | — | — | — | Nearest-neighbor 4x preview |

| `char_hunter_directional_32x48` | `public/civilization/characters/hunter-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | final | Yes | (16,47) | N/S/E/W; spear/leather overlay |
| `char_builder_directional_32x48` | `public/civilization/characters/builder-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | final | Yes | (16,47) | N/S/E/W; mallet/plank overlay |
| `char_toolmaker_directional_32x48` | `public/civilization/characters/toolmaker-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | final | Yes | (16,47) | N/S/E/W; hammer/apron overlay |
| `char_elder_directional_32x48` | `public/civilization/characters/elder-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | final | Yes | (16,47) | N/S/E/W; staff/grey-hair overlay |
| `char_child_directional_32x48` | `public/civilization/characters/child-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | final | Yes | (16,47) | N/S/E/W; smaller body/larger head overlay |

### Buildings (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `bld_shelter_stages` | `public/civilization/buildings/shelter-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed hut |
| `bld_shelter_large` | `public/civilization/buildings/shelter-96.png` | Completed building | 96x96 | 1 | — | — | (48,89) | Screenshot-review scale variant; use on 3x2 footprint |
| `bld_storage_stages` | `public/civilization/buildings/storage-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed storage |
| `bld_workshop_stages` | `public/civilization/buildings/workshop-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed workshop |
| `bld_granary_era2_stages` | `public/civilization/buildings/granary-era2-stages.png` | Era-2 construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,60) | Foundation, frame, completed granary |
| `bld_forge_era2_stages` | `public/civilization/buildings/forge-era2-stages.png` | Era-2 construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,60) | Foundation, frame, completed forge |

### Resource nodes (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `resource_berry_states` | `public/civilization/resources/berry-states.png` | State sheet | 144x48 (48x48 cells) | 3 | — | — | (24,43) | Full, partial, depleted |
| `resource_woodpile_states` | `public/civilization/resources/woodpile-states.png` | State sheet | 144x48 (48x48 cells) | 3 | — | — | (24,43) | Full, partial, depleted |
| `resource_stonepile_states` | `public/civilization/resources/stonepile-states.png` | State sheet | 144x48 (48x48 cells) | 3 | — | — | (24,43) | Full, partial, depleted |

### Environment loops (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `fx_shore_water` | `public/civilization/effects/shore-water-sheet.png` | Animation sheet | 192x32 | 6 | 8 FPS | Yes | (16,31) | Shore ripple/foam loop |
| `fx_grass_wind` | `public/civilization/effects/grass-wind-sheet.png` | Animation sheet | 128x32 | 4 | 8 FPS | Yes | (16,31) | Wind sway loop |
| `fx_smoke` | `public/civilization/effects/smoke-sheet.png` | Animation sheet | 192x32 | 6 | 8 FPS | Yes | (16,31) | Campfire smoke loop |

### UI hint and emote icons (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `ui_hint_icons_24` | `public/civilization/ui/hint-icons-24.png` | Icon strip | 192x24 (24x24 cells) | 8 | — | — | Center | Thought, warning, food, storage, water, build, discovery, danger |

### Final portraits (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `character_role_portraits_final_64` | `public/civilization/characters/role-portraits-final-64.png` | Portrait strip | 384x64 (64x64 cells) | 6 | — | — | (32,59) | Gatherer, hunter, builder, toolmaker, elder, child |

### Late content: trader, weather and event art (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `char_trader_directional_32x48` | `public/civilization/characters/trader-directions-32x48.png` | Direction strip | 128x48 (32x48 cells) | 4 | — | — | (16,47) | N/E/S/W visiting trader with cap, satchel and walking staff |
| `char_trader_directional_preview_4x` | `public/civilization/characters/trader-directions-4x-preview.png` | Review preview | 512x192 | 4 | — | — | — | Nearest-neighbor 4x preview |
| `char_trader_portrait_64` | `public/civilization/characters/trader-portrait-64.png` | Portrait | 64x64 | 1 | — | — | (32,59) | Named visitor/trader portrait fallback |
| `char_trader_portrait_preview_4x` | `public/civilization/characters/trader-portrait-4x-preview.png` | Review preview | 256x256 | 1 | — | — | — | Nearest-neighbor 4x preview |
| `fx_weather_rain` | `public/civilization/effects/weather-rain-sheet.png` | Weather overlay sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Low-opacity rain streaks for cosmetic rain and flood warning |
| `fx_weather_frost` | `public/civilization/effects/weather-frost-sheet.png` | Weather overlay sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Pale frost sparkle/ground edge loop |
| `event_timeline_cards` | `public/civilization/events/event-cards.png` | Event illustration strip | 384x96 (96x96 cells) | 4 | — | — | Center | First harvest, heavy rain, trader arrival, food shortage |
| `event_timeline_cards_preview_4x` | `public/civilization/events/event-cards-4x-preview.png` | Review preview | 1536x384 | 4 | — | — | — | Nearest-neighbor 4x preview |

### Permanent settlement environment (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `bld_house_stages` | `public/civilization/buildings/house-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed household house; 2x2 footprint |
| `bld_pottery_kiln_stages` | `public/civilization/buildings/pottery-kiln-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed kiln; 1x1 footprint |
| `bld_drying_rack_stages` | `public/civilization/buildings/drying-rack-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed drying rack; 1x1 footprint |
| `bld_animal_pen_stages` | `public/civilization/buildings/animal-pen-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed pen; 2x1 footprint |
| `animal_goat_walk` | `public/civilization/animals/goat-walk.png` | Walk sheet | 128x48 (32x48 cells) | 4 | 6 FPS | Yes | (16,47) | Idle pair + walk pair, transparent background |
| `animal_sheep_walk` | `public/civilization/animals/sheep-walk.png` | Walk sheet | 128x48 (32x48 cells) | 4 | 6 FPS | Yes | (16,47) | Idle pair + walk pair, transparent background |

### Growing village environment (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `terrain_irrigation_channel` | `public/civilization/terrain/irrigation-channel-variants.png` | Tile variant strip | 128x32 (32x32 cells) | 4 | — | — | Top-left | Straight, bend, junction and end channel tiles |
| `terrain_cart_road_variants` | `public/civilization/terrain/cart-road-variants.png` | Tile variant strip | 128x32 (32x32 cells) | 4 | — | — | Top-left | Packed cart-road variants with wheel-rut detail |
| `bld_trading_post_stages` | `public/civilization/buildings/trading-post-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed trading post; 2x2 footprint |
| `bld_workshop_large` | `public/civilization/buildings/workshop-large-96.png` | Completed building | 96x96 | 1 | — | — | (48,89) | Larger workshop variant; 3x2 footprint |
| `animal_deer_walk` | `public/civilization/animals/deer-walk.png` | Walk sheet | 128x48 (32x48 cells) | 4 | 6 FPS | Yes | (16,47) | Idle pair + walk pair for huntable wildlife |
| `animal_rabbit_walk` | `public/civilization/animals/rabbit-walk.png` | Walk sheet | 128x48 (32x48 cells) | 4 | 6 FPS | Yes | (16,47) | Idle pair + walk pair for huntable wildlife |

### Complex settlement environment (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `bld_records_hall_stages` | `public/civilization/buildings/records-hall-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed records hall/library; 2x2 footprint |
| `bld_town_hall_stages` | `public/civilization/buildings/town-hall-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed town hall; 3x2 footprint |
| `bld_public_well_stages` | `public/civilization/buildings/public-well-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed public well; 1x1 footprint |
| `prop_stone_wall_gate` | `public/civilization/props/stone-wall-gate-variants.png` | Prop variant strip | 128x64 (64x64 cells) | 2 | — | — | (32,57) | Stone wall and gate variants; 1x1 tile pieces |
| `bld_bridge_variants` | `public/civilization/props/bridge-variants.png` | Infrastructure variant strip | 128x64 (64x64 cells) | 2 | — | — | (32,57) | Bridge variants for a 3x1 crossing footprint |

### ART backlog: era upgrades (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `bld_house_variants` | `public/civilization/buildings/house-variants.png` | Variant sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Wattle, stone and painted house styles; 2x2 footprint |
| `bld_terraced_fields_stages` | `public/civilization/buildings/terraced-fields-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, terraces, planted field; 3x2 footprint |
| `bld_loom_stages` | `public/civilization/buildings/loom-stages.png` | Construction sheet | 192x64 (64x64 cells) | 3 | — | — | (32,57) | Foundation, frame, completed loom; 1x1 footprint |
| `prop_orchard_variants` | `public/civilization/vegetation/orchard-variants.png` | Variant strip | 128x64 (64x64 cells) | 2 | — | — | (32,57) | Young and fruiting orchard trees |
| `bld_granary_full_empty` | `public/civilization/vegetation/granary-full-empty.png` | State strip | 128x64 (64x64 cells) | 2 | — | — | (32,57) | Empty and stocked granary states |
| `fx_forge_smoke` | `public/civilization/effects/forge-smoke-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Forge chimney smoke loop |

### ART backlog: domestic animals and wildlife (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `animal_dog_walk` | `public/civilization/animals/dog-walk.png` | Walk sheet | 128x48 (32x48 cells) | 4 | 7 FPS | Yes | (16,47) | Herding dog idle/walk loop |
| `animal_chicken_walk` | `public/civilization/animals/chicken-walk.png` | Walk sheet | 128x48 (32x48 cells) | 4 | 7 FPS | Yes | (16,47) | Chicken idle/walk loop |
| `animal_fish_swim` | `public/civilization/animals/fish-swim.png` | Swim sheet | 128x32 (32x32 cells) | 4 | 8 FPS | Yes | (16,24) | River fish swim loop |

### ART backlog: character variety and actions (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `char_villager_variety_32x48` | `public/civilization/characters/villager-variety-32x48.png` | Variety strip | 192x48 (32x48 cells) | 6 | — | — | (16,47) | Six skin-tone/hair-colour variants |
| `char_villager_actions_expanded` | `public/civilization/characters/villager-actions-expanded-32x48.png` | Action strip | 320x48 (32x48 cells) | 10 | 8 FPS | No | (16,47) | Carry wood/stone/food, build, sow, harvest, cook, fish, hunt, teach |

### ART backlog: environmental effects (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `fx_rain_splash` | `public/civilization/effects/rain-splash-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Rain impact splash loop |
| `fx_fireflies` | `public/civilization/effects/fireflies-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Night firefly glints |
| `fx_dust` | `public/civilization/effects/dust-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Construction/gathering dust puff |
| `fx_sparks` | `public/civilization/effects/sparks-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Forge/tool sparks |
| `fx_harvest_sparkle` | `public/civilization/effects/harvest-sparkle-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Harvest completion sparkle |
| `fx_festival_lanterns` | `public/civilization/effects/lanterns-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Festival lantern shimmer |
| `fx_chimney_smoke` | `public/civilization/effects/chimney-smoke-sheet.png` | Animation sheet | 192x32 (32x32 cells) | 6 | 8 FPS | Yes | (16,31) | Shared smoke loop for occupied chimneys |

### ART backlog: UI art (`IMAGE3` follow-up)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `ui_building_thumbnails` | `public/civilization/ui/building-thumbnails-16.png` | Thumbnail strip | 256x16 (16x16 cells) | 16 | — | — | Center | Shelter through town hall build-menu thumbnails |
| `ui_era_badges` | `public/civilization/ui/era-badges-24.png` | Badge strip | 120x24 (24x24 cells) | 5 | — | — | Center | Camp, village, town, complex and legacy badges |
| `ui_emotes_expanded` | `public/civilization/ui/emotes-expanded-16.png` | Emote strip | 128x16 (16x16 cells) | 8 | — | — | Center | Hungry, tired, idea, alert, happy, question, sweat, heart |

## Integration contract and placeholders (maintained by `CODE`, the lead developer)

Provisional contract (DECISIONS.md D-004): tile 32x32, 3/4 top-down, light from top-left, character cell 32x48 anchored bottom-centre, nearest-neighbour, transparent backgrounds. Owners keep their own rows above; CODE edits only this section. The renderer uses the **Asset ID** column above as the stable key (`components/civworld/assets.ts`). Missing or failed files fall back to a procedurally drawn placeholder, never a crash.

Placeholder ids the renderer already asks for (rows above are used as soon as the file exists in `public/civilization/`):

| id | placeholder drawn until a file exists | wanted from |
|---|---|---|
| `terrain_grass` `terrain_dirt` `terrain_shore_water` `terrain_path` | flat colour + dither | IMAGE (delivered) |
| `terrain_water_deep` `terrain_sand` | flat colour | IMAGE |
| `prop_tree` `prop_rock` | trunk+canopy / boulder | IMAGE (delivered) |
| `prop_berry_bush` | berry bush | IMAGE |
| `bld_campfire` `bld_shelter` `bld_storage` `bld_workshop` | coloured box + roof | IMAGE |
| `char_villager_{idle,walk,work}_{s,n,e,w}_{N}f` | two-colour figure | IMAGE3 |
| `fx_campfire_sheet` / `fx_campfire_static` | flame glyph | IMAGE (delivered) |

---

## Required-asset checklist (maintained by `CODE`)

The loader (`components/civworld/assets.ts`) already requests every file below at its conventional path. Drop the PNG at that path and it is used on the next load, with no code change; a missing file falls back to a procedural placeholder. Anchors: buildings and props are drawn **bottom-left of the footprint** (buildings) or **bottom-centre of the tile** (props/characters). Sizes are in px at 1x (tile = 32). Status: DONE = delivered and wired, TODO = placeholder drawn.

| id | path | size (cell) | frames | anchor | status |
|---|---|---|---|---|---|
| `terrain_grass` `terrain_dirt` `terrain_path` `terrain_shore_water` | `terrain/{grass,dirt,path,shore_water}.png` | 32x32 | 1 | top-left | DONE |
| `terrain_sand` | `terrain/sand.png` | 32x32 | 1 | top-left | DONE |
| `terrain_water_deep` (animated, 4-8f, seamless) | `water/water_deep_sheet.png` | 32x32 cells | 4-8 | top-left | DONE |
| `prop_tree` `prop_rock` | `terrain/{tree,rock}.png` | 48x64 / 32x32 | 1 | bottom-centre | DONE |
| `res_berry_states` `res_woodpile_states` `res_stonepile_states` (full, partial, depleted) | `resources/*-states.png` | 48x48 cells | 3 | (24,43) | DONE (berry + stonepile drawn on bush/rock nodes; woodpile not yet used) |
| `fx_campfire_sheet` `fx_campfire_static` | `effects/campfire-{sheet,static}.png` | 32x32 | 6 @ 8fps | bottom-centre | DONE |
| `char_gatherer_directional` | `characters/gatherer-directions-32x48.png` | 32x48 | 10 cols x 4 rows (S,N,E,W); idle 0-1, walk 2-5, work 6-9 | (16,47) | DONE |
| `bld_shelter` `bld_storage` `bld_workshop` | `buildings/*-stages.png` | 64x64 cells, 3 stages | foundation, frame, finished | (32,57) at footprint bottom-centre | DONE |
| `bld_farm` | `buildings/farm.png` | 96x64 (3x2 tiles) | 1 | bottom-left | DONE |
| `bld_farm` (+ stages) | `buildings/farm.png` | 96x64 | 1 | bottom-left | DONE |
| `portrait_villager_{a,b,c,d}` | `portraits/villager_{a..d}.png` | 48x48 | 1 | n/a | DONE |
| `char_<role>_directional` builder, toolmaker, elder, hunter, child | `characters/<role>-directions-32x48.png` | 32x48, same layout as gatherer | 10x4 | (16,47) | DONE (builder, toolmaker, elder used by job and age; hunter, child not yet used) |
| `char_gatherer_actions` carry, eat, sleep | `characters/gatherer-actions-32x48.png` | 32x48 | 3 cols x 4 dirs | (16,47) | DONE |
| `fx_smoke_loop` `fx_build_dust` `fx_sleep_z` | `effects/*.png` | 32x32 | 4-6 | bottom-centre | DONE |
| `ui_icon_{food,wood,stone,tools}` | `ui/icon_*.png` | 16x16 | 1 | n/a | DONE |
| `ui_emote_{hungry,tired,idea,alert}` | `ui/emote_*.png` | 16x16 | 1 | n/a | DONE |

Review rules still apply: nearest-neighbour, transparent background, top-left light, same palette as ART_DIRECTION.md, no labels inside cells, static fallback for every animation.
