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
