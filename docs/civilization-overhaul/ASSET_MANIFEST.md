# Asset Manifest — Evolution Sandbox Civilization Overhaul

> Tracks all generated pixel-art assets, dimensions, animation metadata, and owners.

## Environment & Terrain (`IMAGE` — Gemini Role)

| Asset ID | Path | Type | Dimensions | Frames | FPS / Duration | Loop | Anchor | Notes |
|---|---|---|---|---|---|---|---|---|
| `terrain_grass` | `public/civilization/terrain/grass.png` | Static tile | 32×32 | 1 | — | — | Top-left | Seamless grass base |
| `terrain_dirt` | `public/civilization/terrain/dirt.png` | Static tile | 32×32 | 1 | — | — | Top-left | Seamless dirt base |
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

| `char_hunter_directional_32x48` | `public/civilization/characters/hunter-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | provisional | Yes | (16,47) | N/S/E/W; shared detailed base pending role overlay |
| `char_builder_directional_32x48` | `public/civilization/characters/builder-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | provisional | Yes | (16,47) | N/S/E/W; shared detailed base pending role overlay |
| `char_toolmaker_directional_32x48` | `public/civilization/characters/toolmaker-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | provisional | Yes | (16,47) | N/S/E/W; shared detailed base pending role overlay |
| `char_elder_directional_32x48` | `public/civilization/characters/elder-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | provisional | Yes | (16,47) | N/S/E/W; shared detailed base pending role overlay |
| `char_child_directional_32x48` | `public/civilization/characters/child-directions-32x48.png` | Spritesheet | 320x192 (32x48 cells) | 40 | provisional | Yes | (16,47) | N/S/E/W; shared detailed base pending role overlay |

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
