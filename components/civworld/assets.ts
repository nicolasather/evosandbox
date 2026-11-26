/* Asset loader for the settlement canvas. Keyed by the stable ids in
   docs/civilization-overhaul/ASSET_MANIFEST.md. A file that is missing or fails
   to decode resolves to null and the renderer draws a placeholder instead, so a
   bad asset never crashes the game (master design §15). */

export interface AssetSpec {
  url: string;
  /** Sprite cell size in px (a sheet's cell, not the whole sheet). */
  w: number;
  h: number;
  frames?: number;
  fps?: number;
}

const BASE = '/civilization';

export const ASSET_SPECS: Record<string, AssetSpec> = {
  // delivered by IMAGE / IMAGE3 (see ASSET_MANIFEST.md)
  terrain_grass: { url: `${BASE}/terrain/grass.png`, w: 32, h: 32 },
  terrain_dirt: { url: `${BASE}/terrain/dirt.png`, w: 32, h: 32 },
  terrain_shore_water: { url: `${BASE}/terrain/shore_water.png`, w: 32, h: 32 },
  terrain_path: { url: `${BASE}/terrain/path.png`, w: 32, h: 32 },
  prop_rock: { url: `${BASE}/terrain/rock.png`, w: 32, h: 32 },
  prop_tree: { url: `${BASE}/terrain/tree.png`, w: 48, h: 64 },
  fx_campfire_sheet: { url: `${BASE}/effects/campfire-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_campfire_static: { url: `${BASE}/effects/campfire-static.png`, w: 32, h: 32 },
  fx_shore_water: { url: `${BASE}/effects/shore-water-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_grass_wind: { url: `${BASE}/effects/grass-wind-sheet.png`, w: 32, h: 32, frames: 4, fps: 8 },
  fx_smoke: { url: `${BASE}/effects/smoke-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  char_gatherer_directional: { url: `${BASE}/characters/gatherer-directions-32x48.png`, w: 32, h: 48, frames: 10 },
  // construction-stage sheets: 3 frames of 64x64 (foundation, frame, finished), anchor (32,57)
  bld_shelter: { url: `${BASE}/buildings/shelter-stages.png`, w: 64, h: 64, frames: 3 },
  bld_storage: { url: `${BASE}/buildings/storage-stages.png`, w: 64, h: 64, frames: 3 },
  bld_workshop: { url: `${BASE}/buildings/workshop-stages.png`, w: 64, h: 64, frames: 3 },
  // resource state sheets: full, partial, depleted (48x48, anchor (24,43))
  res_berry_states: { url: `${BASE}/resources/berry-states.png`, w: 48, h: 48, frames: 3 },
  res_woodpile_states: { url: `${BASE}/resources/woodpile-states.png`, w: 48, h: 48, frames: 3 },
  res_stonepile_states: { url: `${BASE}/resources/stonepile-states.png`, w: 48, h: 48, frames: 3 },
  // role sheets share the gatherer layout: 10 cols (idle 0-1, walk 2-5, work 6-9) x 4 rows (S,N,E,W)
  char_builder_directional: { url: `${BASE}/characters/builder-directions-32x48.png`, w: 32, h: 48, frames: 10 },
  char_toolmaker_directional: { url: `${BASE}/characters/toolmaker-directions-32x48.png`, w: 32, h: 48, frames: 10 },
  char_elder_directional: { url: `${BASE}/characters/elder-directions-32x48.png`, w: 32, h: 48, frames: 10 },
  char_hunter_directional: { url: `${BASE}/characters/hunter-directions-32x48.png`, w: 32, h: 48, frames: 10 },
  char_child_directional: { url: `${BASE}/characters/child-directions-32x48.png`, w: 32, h: 48, frames: 10 },
  char_gatherer_actions: { url: `${BASE}/characters/gatherer-actions-32x48.png`, w: 32, h: 48, frames: 3 },
  // delivered paths; procedural placeholders remain only as a defensive fallback for load/decode failures
  terrain_water_deep: { url: `${BASE}/water/water_deep_sheet.png`, w: 32, h: 32, frames: 6, fps: 6 },
  fx_build_dust: { url: `${BASE}/effects/fx_build_dust.png`, w: 32, h: 32, frames: 6, fps: 10 },
  fx_sleep_z: { url: `${BASE}/effects/fx_sleep_z.png`, w: 32, h: 32, frames: 4, fps: 3 },
  ui_emote_hungry: { url: `${BASE}/ui/emote_hungry.png`, w: 16, h: 16 },
  ui_emote_tired: { url: `${BASE}/ui/emote_tired.png`, w: 16, h: 16 },
  ui_emote_idea: { url: `${BASE}/ui/emote_idea.png`, w: 16, h: 16 },
  ui_emote_alert: { url: `${BASE}/ui/emote_alert.png`, w: 16, h: 16 },
  bld_granary: { url: `${BASE}/buildings/granary-era2-stages.png`, w: 64, h: 64, frames: 3 },
  bld_forge: { url: `${BASE}/buildings/forge-era2-stages.png`, w: 64, h: 64, frames: 3 },
  bld_farm_growth: { url: `${BASE}/buildings/farm-growth-stages.png`, w: 64, h: 64, frames: 4 },
  terrain_grass_soft_a: { url: `${BASE}/terrain/grass-soft-a.png`, w: 32, h: 32 },
  terrain_grass_soft_b: { url: `${BASE}/terrain/grass-soft-b.png`, w: 32, h: 32 },
  terrain_dirt_edge_north: { url: `${BASE}/terrain/dirt-grass-edge-north.png`, w: 32, h: 32 },
  terrain_dirt_edge_east: { url: `${BASE}/terrain/dirt-grass-edge-east.png`, w: 32, h: 32 },
  terrain_dirt_edge_south: { url: `${BASE}/terrain/dirt-grass-edge-south.png`, w: 32, h: 32 },
  terrain_dirt_edge_west: { url: `${BASE}/terrain/dirt-grass-edge-west.png`, w: 32, h: 32 },
  bld_shelter_large: { url: `${BASE}/buildings/shelter-96.png`, w: 96, h: 96 },
  bld_market: { url: `${BASE}/buildings/trading-post-stages.png`, w: 64, h: 64, frames: 3 },
  terrain_cart_road: { url: `${BASE}/terrain/cart-road-variants.png`, w: 32, h: 32, frames: 4 },
  animal_deer_walk: { url: `${BASE}/animals/deer-walk.png`, w: 32, h: 48, frames: 4, fps: 6 },
  animal_rabbit_walk: { url: `${BASE}/animals/rabbit-walk.png`, w: 32, h: 48, frames: 4, fps: 6 },
  bld_assembly: { url: `${BASE}/buildings/town-hall-stages.png`, w: 64, h: 64, frames: 3 },
  bld_well: { url: `${BASE}/buildings/public-well-stages.png`, w: 64, h: 64, frames: 3 },
  bld_records_hall: { url: `${BASE}/buildings/records-hall-stages.png`, w: 64, h: 64, frames: 3 },
  bld_house: { url: `${BASE}/buildings/house-stages.png`, w: 64, h: 64, frames: 3 },
  bld_pottery_kiln: { url: `${BASE}/buildings/pottery-kiln-stages.png`, w: 64, h: 64, frames: 3 },
  bld_drying_rack: { url: `${BASE}/buildings/drying-rack-stages.png`, w: 64, h: 64, frames: 3 },
  bld_animal_pen: { url: `${BASE}/buildings/animal-pen-stages.png`, w: 64, h: 64, frames: 3 },
  animal_goat_walk: { url: `${BASE}/animals/goat-walk.png`, w: 32, h: 48, frames: 4, fps: 6 },
  animal_sheep_walk: { url: `${BASE}/animals/sheep-walk.png`, w: 32, h: 48, frames: 4, fps: 6 },
  // scenery, season looks, animals, effects and UI strips (cell sizes from each sheet's metadata)
  veg_flowers: { url: `${BASE}/vegetation/flowers-variants.png`, w: 32, h: 32, frames: 4 },
  veg_bushes: { url: `${BASE}/vegetation/bushes-variants.png`, w: 32, h: 32, frames: 4 },
  veg_reeds: { url: `${BASE}/vegetation/reeds-variants.png`, w: 32, h: 32, frames: 4 },
  veg_stumps: { url: `${BASE}/vegetation/stumps-variants.png`, w: 32, h: 32, frames: 4 },
  veg_orchard: { url: `${BASE}/vegetation/orchard-variants.png`, w: 64, h: 64, frames: 2 },
  veg_granary_state: { url: `${BASE}/vegetation/granary-full-empty.png`, w: 64, h: 64, frames: 2 },
  terrain_path_edge: { url: `${BASE}/terrain/path-edge-variants.png`, w: 32, h: 32, frames: 4 },
  terrain_irrigation: { url: `${BASE}/terrain/irrigation-channel-variants.png`, w: 32, h: 32, frames: 4 },
  terrain_grass_seasons: { url: `${BASE}/terrain/grass-seasons.png`, w: 32, h: 32, frames: 3 },
  terrain_tree_seasons: { url: `${BASE}/terrain/tree-seasons.png`, w: 48, h: 64, frames: 3 },
  terrain_tree_variants: { url: `${BASE}/terrain/tree-variants.png`, w: 48, h: 64, frames: 3 },
  terrain_rock_variants: { url: `${BASE}/terrain/rock-variants.png`, w: 32, h: 32, frames: 3 },
  terrain_water_quiet: { url: `${BASE}/water/water-deep-quiet.png`, w: 32, h: 32 },
  fx_shore_foam: { url: `${BASE}/effects/shore-foam-variants.png`, w: 32, h: 32, frames: 4 },
  prop_fence: { url: `${BASE}/props/fence-variants.png`, w: 64, h: 64, frames: 3 },
  prop_market: { url: `${BASE}/props/market-variants.png`, w: 64, h: 64, frames: 3 },
  prop_well: { url: `${BASE}/props/well-variants.png`, w: 64, h: 64, frames: 3 },
  prop_bridge: { url: `${BASE}/props/bridge-variants.png`, w: 64, h: 64, frames: 2 },
  prop_wall_gate: { url: `${BASE}/props/stone-wall-gate-variants.png`, w: 64, h: 64, frames: 2 },
  animal_fish: { url: `${BASE}/animals/fish-swim.png`, w: 32, h: 32, frames: 4, fps: 8 },
  animal_chicken_walk: { url: `${BASE}/animals/chicken-walk.png`, w: 32, h: 48, frames: 4, fps: 7 },
  animal_dog_walk: { url: `${BASE}/animals/dog-walk.png`, w: 32, h: 48, frames: 4, fps: 7 },
  fx_chimney_smoke: { url: `${BASE}/effects/chimney-smoke-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_forge_smoke: { url: `${BASE}/effects/forge-smoke-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_sparks: { url: `${BASE}/effects/sparks-sheet.png`, w: 32, h: 32, frames: 6, fps: 10 },
  fx_harvest_sparkle: { url: `${BASE}/effects/harvest-sparkle-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_lanterns: { url: `${BASE}/effects/lanterns-sheet.png`, w: 32, h: 32, frames: 6, fps: 6 },
  fx_fireflies: { url: `${BASE}/effects/fireflies-sheet.png`, w: 32, h: 32, frames: 6, fps: 6 },
  fx_weather_rain: { url: `${BASE}/effects/weather-rain-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_rain_splash: { url: `${BASE}/effects/rain-splash-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_weather_frost: { url: `${BASE}/effects/weather-frost-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_dust: { url: `${BASE}/effects/dust-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_tint: { url: `${BASE}/effects/dawn-night-tint-sheet.png`, w: 32, h: 32, frames: 4 },
  bld_house_variants: { url: `${BASE}/buildings/house-variants.png`, w: 64, h: 64, frames: 3 },
  bld_terraced: { url: `${BASE}/buildings/terraced-fields-stages.png`, w: 64, h: 64, frames: 3 },
  bld_loom: { url: `${BASE}/buildings/loom-stages.png`, w: 64, h: 64, frames: 3 },
  bld_workshop_large: { url: `${BASE}/buildings/workshop-large-96.png`, w: 96, h: 96 },
  char_trader_directional: { url: `${BASE}/characters/trader-directions-32x48.png`, w: 32, h: 48, frames: 4 },
  char_actions_expanded: { url: `${BASE}/characters/villager-actions-expanded-32x48.png`, w: 32, h: 48, frames: 10 },
  char_villager_variety: { url: `${BASE}/characters/villager-variety-32x48.png`, w: 32, h: 48, frames: 6 },
  terrain_sand: { url: `${BASE}/terrain/sand.png`, w: 32, h: 32 },
  bld_farm: { url: `${BASE}/buildings/farm.png`, w: 96, h: 64 },
  portrait_villager_a: { url: `${BASE}/portraits/villager_a.png`, w: 48, h: 48 },
  portrait_villager_b: { url: `${BASE}/portraits/villager_b.png`, w: 48, h: 48 },
  portrait_villager_c: { url: `${BASE}/portraits/villager_c.png`, w: 48, h: 48 },
  portrait_villager_d: { url: `${BASE}/portraits/villager_d.png`, w: 48, h: 48 },
};

/** A sheet that does not match its contract is reported and replaced by the placeholder instead of being drawn wrongly. */
export function validateSheet(spec: AssetSpec, naturalW: number, naturalH: number): string | null {
  const frames = spec.frames ?? 1;
  if (naturalH < spec.h) return `height ${naturalH} is smaller than the ${spec.h}px cell`;
  if (frames > 1 && naturalW < spec.w * frames && naturalH < spec.h * frames) return `width ${naturalW} holds fewer than ${frames} frames of ${spec.w}px`;
  if (frames <= 1 && naturalW < spec.w) return `width ${naturalW} is smaller than the ${spec.w}px cell`;
  return null;
}

/** Frame to draw for a looping sheet: strictly in order, and always frame 0 (the static fallback) when animation is off. */
export function animFrame(frames: number, fps: number, nowMs: number, animate: boolean): number {
  if (!animate || frames <= 1) return 0;
  return Math.floor((nowMs / 1000) * fps) % frames;
}

export class AssetStore {
  private images = new Map<string, HTMLImageElement | null>();
  private listeners = new Set<() => void>();
  /** Bumped whenever an image finishes, so cached layers know to rebuild. */
  version = 0;
  /** Human-readable problems found while loading, for the QA report. */
  warnings: string[] = [];

  constructor(specs: Record<string, AssetSpec> = ASSET_SPECS) {
    if (typeof Image === 'undefined') return;
    for (const [id, spec] of Object.entries(specs)) {
      this.images.set(id, null);
      const img = new Image();
      img.onload = () => {
        const warn = validateSheet(spec, img.naturalWidth, img.naturalHeight);
        if (warn) {
          this.warnings.push(`${id}: ${warn}`);
          if (typeof console !== 'undefined') console.warn(`[civworld] asset ${id}: ${warn}; using the placeholder`);
          this.images.set(id, null);
          return;
        }
        this.images.set(id, img);
        this.bump();
      };
      img.onerror = () => { this.images.set(id, null); };
      img.src = spec.url;
    }
  }

  get(id: string): HTMLImageElement | null { return this.images.get(id) ?? null; }
  spec(id: string): AssetSpec | undefined { return ASSET_SPECS[id]; }
  subscribe(cb: () => void): () => void { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  private bump() { this.version++; this.listeners.forEach(l => l()); }
}
