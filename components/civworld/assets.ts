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
  char_gatherer_directional: { url: `${BASE}/characters/gatherer-directions-32x48.png`, w: 32, h: 48, frames: 10 },
  // still to be delivered: conventional paths, procedural placeholders are drawn until the files exist
  terrain_sand: { url: `${BASE}/terrain/sand.png`, w: 32, h: 32 },
  prop_berry_bush: { url: `${BASE}/vegetation/berry_bush.png`, w: 32, h: 32 },
  bld_shelter: { url: `${BASE}/buildings/shelter.png`, w: 64, h: 96 },
  bld_shelter_stage1: { url: `${BASE}/buildings/shelter_stage1.png`, w: 64, h: 96 },
  bld_shelter_stage2: { url: `${BASE}/buildings/shelter_stage2.png`, w: 64, h: 96 },
  bld_storage: { url: `${BASE}/buildings/storage.png`, w: 64, h: 96 },
  bld_storage_stage1: { url: `${BASE}/buildings/storage_stage1.png`, w: 64, h: 96 },
  bld_storage_stage2: { url: `${BASE}/buildings/storage_stage2.png`, w: 64, h: 96 },
  bld_workshop: { url: `${BASE}/buildings/workshop.png`, w: 64, h: 96 },
  bld_workshop_stage1: { url: `${BASE}/buildings/workshop_stage1.png`, w: 64, h: 96 },
  bld_workshop_stage2: { url: `${BASE}/buildings/workshop_stage2.png`, w: 64, h: 96 },
  bld_farm: { url: `${BASE}/buildings/farm.png`, w: 96, h: 64 },
  bld_farm_stage1: { url: `${BASE}/buildings/farm_stage1.png`, w: 96, h: 64 },
  bld_farm_stage2: { url: `${BASE}/buildings/farm_stage2.png`, w: 96, h: 64 },
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
