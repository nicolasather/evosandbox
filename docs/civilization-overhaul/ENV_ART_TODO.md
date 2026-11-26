# Environment Art Regeneration Queue (`IMAGE` — Gemini Role)

> Ordered backlog of remaining hand-authored environment assets to replace with generated pixel art once the image-generator quota resets. All replacements preserve exact filenames, dimensions, frame counts, anchors, and IDs from `ASSET_MANIFEST.md`.

## Completed (Generated Pixel Art on `main`)
- **Batch 0 (Terrain & Props):** `terrain/grass.png` (32×32, 1f), `terrain/dirt.png` (32×32, 1f), `terrain/shore_water.png` (32×32, 1f), `terrain/path.png` (32×32, 1f), `terrain/rock.png` (32×32, 1f), `terrain/tree.png` (48×64, 1f)
- **Batch 1 (Core Buildings, polished in `1144f5f`):** `buildings/shelter-96.png` (96×96, 1f), `buildings/shelter-stages.png` (192×64, 3f), `buildings/storage-stages.png` (192×64, 3f), `buildings/workshop-stages.png` (192×64, 3f), `buildings/house-stages.png` (192×64, 3f)
- **Batch 2 (Core Animated FX, `e94101c`):** `effects/campfire-sheet.png` (192×32, 6f) + `campfire-static.png` (32×32, 1f), `effects/smoke-sheet.png` (192×32, 6f), `effects/shore-water-sheet.png` (192×32, 6f)

---

## Remaining Queue (In Regeneration Order)

### Batch 3 — Remaining Core FX & Water
| File | Size | Frames | Notes |
|---|---|---|---|
| `public/civilization/effects/grass-wind-sheet.png` | 128×32 (32×32 cells) | 4 | Wind sway loop |
| `public/civilization/water/water_deep_sheet.png` | 128–256×32 (32×32 cells) | 4–8 | Seamless deep water loop |
| `public/civilization/effects/weather-rain-sheet.png` | 192×32 (32×32 cells) | 6 | Low-opacity rain streaks |
| `public/civilization/effects/weather-frost-sheet.png` | 192×32 (32×32 cells) | 6 | Pale frost sparkle loop |

### Batch 4 — Resource Nodes & Farm
| File | Size | Frames | Notes |
|---|---|---|---|
| `public/civilization/resources/berry-states.png` | 144×48 (48×48 cells) | 3 | Full, partial, depleted |
| `public/civilization/resources/woodpile-states.png` | 144×48 (48×48 cells) | 3 | Full, partial, depleted |
| `public/civilization/resources/stonepile-states.png` | 144×48 (48×48 cells) | 3 | Full, partial, depleted |
| `public/civilization/buildings/farm.png` | 96×64 | 1 | 3×2 farm plot |
| `public/civilization/buildings/farm-growth-stages.png` | 288×64 (96×64 cells) | 3 | Soil, sprouts, ripe crop |

### Batch 5 — Era 2 & Settlement Buildings
| File | Size | Frames | Notes |
|---|---|---|---|
| `public/civilization/buildings/granary-era2-stages.png` | 192×64 (64×64 cells) | 3 | Foundation, frame, granary |
| `public/civilization/buildings/forge-era2-stages.png` | 192×64 (64×64 cells) | 3 | Foundation, frame, forge |
| `public/civilization/buildings/pottery-kiln-stages.png` | 192×64 (64×64 cells) | 3 | 1×1 kiln stages |
| `public/civilization/buildings/drying-rack-stages.png` | 192×64 (64×64 cells) | 3 | 1×1 drying rack stages |
| `public/civilization/buildings/animal-pen-stages.png` | 192×64 (64×64 cells) | 3 | 2×1 animal pen stages |

### Batch 6 — Village & Complex Settlement Buildings
| File | Size | Frames | Notes |
|---|---|---|---|
| `public/civilization/buildings/trading-post-stages.png` | 192×64 (64×64 cells) | 3 | 2×2 trading post |
| `public/civilization/buildings/workshop-large-96.png` | 96×96 | 1 | 3×2 large workshop |
| `public/civilization/buildings/records-hall-stages.png` | 192×64 (64×64 cells) | 3 | 2×2 records hall |
| `public/civilization/buildings/town-hall-stages.png` | 192×64 (64×64 cells) | 3 | 3×2 town hall |
| `public/civilization/buildings/public-well-stages.png` | 192×64 (64×64 cells) | 3 | 1×1 public well |
| `public/civilization/buildings/house-variants.png` | 192×64 (64×64 cells) | 3 | Wattle, stone, painted |
| `public/civilization/buildings/terraced-fields-stages.png` | 192×64 (64×64 cells) | 3 | 3×2 terraced fields |
| `public/civilization/buildings/loom-stages.png` | 192×64 (64×64 cells) | 3 | 1×1 loom |

### Batch 7 — Infrastructure, Vegetation & Terrain Variants
| File | Size | Frames | Notes |
|---|---|---|---|
| `public/civilization/props/stone-wall-gate-variants.png` | 128×64 (64×64 cells) | 2 | Stone wall & gate |
| `public/civilization/props/bridge-variants.png` | 128×64 (64×64 cells) | 2 | 3×1 bridge variants |
| `public/civilization/vegetation/orchard-variants.png` | 128×64 (64×64 cells) | 2 | Young & fruiting orchard |
| `public/civilization/vegetation/granary-full-empty.png` | 128×64 (64×64 cells) | 2 | Empty & stocked states |
| `public/civilization/vegetation/flowers-variants.png` | 128×32 (32×32 cells) | 4 | Flower clusters |
| `public/civilization/vegetation/bushes-variants.png` | 128×32 (32×32 cells) | 4 | Berry/green bushes |
| `public/civilization/vegetation/stumps-variants.png` | 128×32 (32×32 cells) | 4 | Cut stumps |
| `public/civilization/vegetation/reeds-variants.png` | 128×32 (32×32 cells) | 4 | Riverbank reeds |
| `public/civilization/terrain/irrigation-channel-variants.png` | 128×32 (32×32 cells) | 4 | Straight, bend, junction, end |
| `public/civilization/terrain/cart-road-variants.png` | 128×32 (32×32 cells) | 4 | Wheel-rut cart road |
| `public/civilization/terrain/grass-seasons.png` | 96×32 (32×32 cells) | 3 | Autumn, winter, dawn |
| `public/civilization/terrain/tree-seasons.png` | 144×64 (48×64 cells) | 3 | Autumn, winter, dawn |

### Batch 8 — Animals & Wildlife
| File | Size | Frames | Notes |
|---|---|---|---|
| `public/civilization/animals/goat-walk.png` | 128×48 (32×48 cells) | 4 | Idle + walk |
| `public/civilization/animals/sheep-walk.png` | 128×48 (32×48 cells) | 4 | Idle + walk |
| `public/civilization/animals/deer-walk.png` | 128×48 (32×48 cells) | 4 | Idle + walk |
| `public/civilization/animals/rabbit-walk.png` | 128×48 (32×48 cells) | 4 | Idle + walk |
| `public/civilization/animals/dog-walk.png` | 128×48 (32×48 cells) | 4 | Idle + walk |
| `public/civilization/animals/chicken-walk.png` | 128×48 (32×48 cells) | 4 | Idle + walk |
| `public/civilization/animals/fish-swim.png` | 128×32 (32×32 cells) | 4 | River fish swim |

### Batch 9 — Secondary Environmental FX
| File | Size | Frames | Notes |
|---|---|---|---|
| `public/civilization/effects/forge-smoke-sheet.png` | 192×32 (32×32 cells) | 6 | Forge chimney smoke |
| `public/civilization/effects/chimney-smoke-sheet.png` | 192×32 (32×32 cells) | 6 | Shared chimney smoke |
| `public/civilization/effects/rain-splash-sheet.png` | 192×32 (32×32 cells) | 6 | Rain impact splash |
| `public/civilization/effects/fireflies-sheet.png` | 192×32 (32×32 cells) | 6 | Night fireflies |
| `public/civilization/effects/dust-sheet.png` | 192×32 (32×32 cells) | 6 | Construction/gather dust |
| `public/civilization/effects/sparks-sheet.png` | 192×32 (32×32 cells) | 6 | Forge/tool sparks |
| `public/civilization/effects/harvest-sparkle-sheet.png` | 192×32 (32×32 cells) | 6 | Harvest sparkle |
| `public/civilization/effects/lanterns-sheet.png` | 192×32 (32×32 cells) | 6 | Festival lanterns |
| `public/civilization/effects/shore-foam-variants.png` | 128×32 (32×32 cells) | 4 | Shore foam edges |
| `public/civilization/effects/dawn-night-tint-sheet.png` | 128×32 (32×32 cells) | 4 | Seasonal/time-of-day tints |
