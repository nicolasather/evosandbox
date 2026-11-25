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
  terrain_grass: { url: `${BASE}/terrain/grass.png`, w: 32, h: 32 },
  terrain_dirt: { url: `${BASE}/terrain/dirt.png`, w: 32, h: 32 },
  terrain_shore_water: { url: `${BASE}/terrain/shore_water.png`, w: 32, h: 32 },
  terrain_path: { url: `${BASE}/terrain/path.png`, w: 32, h: 32 },
  prop_rock: { url: `${BASE}/terrain/rock.png`, w: 32, h: 32 },
  prop_tree: { url: `${BASE}/terrain/tree.png`, w: 48, h: 64 },
  fx_campfire_sheet: { url: `${BASE}/effects/campfire-sheet.png`, w: 32, h: 32, frames: 6, fps: 8 },
  fx_campfire_static: { url: `${BASE}/effects/campfire-static.png`, w: 32, h: 32 },
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
