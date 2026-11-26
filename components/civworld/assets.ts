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
  // still to be delivered: conventional paths, procedural placeholders are drawn until the files exist
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
  bld_house: { url: `${BASE}/buildings/house-stages.png`, w: 64, h: 64, frames: 3 },
  bld_pottery_kiln: { url: `${BASE}/buildings/pottery-kiln-stages.png`, w: 64, h: 64, frames: 3 },
  bld_drying_rack: { url: `${BASE}/buildings/drying-rack-stages.png`, w: 64, h: 64, frames: 3 },
  bld_animal_pen: { url: `${BASE}/buildings/animal-pen-stages.png`, w: 64, h: 64, frames: 3 },
  animal_goat_walk: { url: `${BASE}/animals/goat-walk.png`, w: 32, h: 48, frames: 4, fps: 6 },
  animal_sheep_walk: { url: `${BASE}/animals/sheep-walk.png`, w: 32, h: 48, frames: 4, fps: 6 },
  terrain_sand: { url: `${BASE}/terrain/sand.png`, w: 32, h: 32 },
  bld_farm: { url: `${BASE}/buildings/farm.png`, w: 96, h: 64 },
  portrait_villager_a: { url: `${BASE}/portraits/villager_a.png`, w: 48, h: 48 },
  portrait_villager_b: { url: `${BASE}/portraits/villager_b.png`, w: 48, h: 48 },
  portrait_villager_c: { url: `${BASE}/portraits/villager_c.png`, w: 48, h: 48 },
  portrait_villager_d: { url: `${BASE}/portraits/villager_d.png`, w: 48, h: 48 },
};

export class AssetStore {
  private images = new Map<string, HTMLImageElement | null>();
  private listeners = new Set<() => void>();
  /** Bumped whenever an image finishes, so cached layers know to rebuild. */
  version = 0;

  constructor(specs: Record<string, AssetSpec> = ASSET_SPECS) {
    if (typeof Image === 'undefined') return;
    for (const [id, spec] of Object.entries(specs)) {
      this.images.set(id, null);
      const img = new Image();
      img.onload = () => { this.images.set(id, img); this.bump(); };
      img.onerror = () => { this.images.set(id, null); };
      img.src = spec.url;
    }
  }

  get(id: string): HTMLImageElement | null { return this.images.get(id) ?? null; }
  spec(id: string): AssetSpec | undefined { return ASSET_SPECS[id]; }
  subscribe(cb: () => void): () => void { this.listeners.add(cb); return () => { this.listeners.delete(cb); }; }
  private bump() { this.version++; this.listeners.forEach(l => l()); }
}
