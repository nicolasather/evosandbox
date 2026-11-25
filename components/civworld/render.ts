import { NODE_SPRITE, TILE, isWater, tileAt, type Building, type Pick, type ResourceNode, type Terrain, type WorldMap } from '@/lib/civ/world';
import type { Camera, Size } from '@/lib/civ/camera';
import type { AssetStore } from './assets';

/* Canvas renderer for the settlement. It only reads world state; it never decides
   outcomes. Static terrain is cached on an offscreen canvas and rebuilt only when
   the map or a loaded asset changes; sprites and effects are drawn per frame. */

const FLAT: Record<Terrain, string> = { grass: '#5d8a3a', dirt: '#8a5a3a', water: '#2f6f94', path: '#a98350', sand: '#d3b878' };
const DEEP = '#245b7d';

function drawTile(ctx: CanvasRenderingContext2D, assets: AssetStore, m: WorldMap, t: Terrain, x: number, y: number) {
  const px = x * TILE;
  const py = y * TILE;
  let id: string | null = null;
  if (t === 'grass') id = 'terrain_grass';
  else if (t === 'dirt') id = 'terrain_dirt';
  else if (t === 'path') id = 'terrain_path';
  else if (t === 'water' && !isWater(tileAt(m, x, y - 1)) && tileAt(m, x, y - 1) !== null) id = 'terrain_shore_water';
  const img = id ? assets.get(id) : null;
  if (img) { ctx.drawImage(img, px, py, TILE, TILE); return; }
  // placeholder: flat colour with a light dither so it reads as ground
  ctx.fillStyle = t === 'water' && isWater(tileAt(m, x, y - 1)) && isWater(tileAt(m, x, y + 1)) ? DEEP : FLAT[t];
  ctx.fillRect(px, py, TILE, TILE);
  ctx.fillStyle = 'rgba(255,255,255,0.06)';
  for (let i = 0; i < 6; i++) ctx.fillRect(px + ((i * 11 + x * 7) % 28), py + ((i * 17 + y * 5) % 28), 2, 2);
}

/** Build (or rebuild) the cached ground layer for the whole map. */
export function buildTerrainLayer(m: WorldMap, assets: AssetStore): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = m.w * TILE;
  c.height = m.h * TILE;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) drawTile(ctx, assets, m, m.terrain[y * m.w + x], x, y);
  return c;
}

function drawNode(ctx: CanvasRenderingContext2D, assets: AssetStore, n: ResourceNode) {
  const s = NODE_SPRITE[n.kind];
  const bx = n.x * TILE + TILE / 2;
  const by = (n.y + 1) * TILE;
  const img = n.kind === 'tree' ? assets.get('prop_tree') : n.kind === 'rock' ? assets.get('prop_rock') : null;
  if (img) { ctx.drawImage(img, bx - s.w / 2, by - s.h, s.w, s.h); return; }
  if (n.kind === 'bush') {
    ctx.fillStyle = '#2f6b34'; ctx.beginPath(); ctx.ellipse(bx, by - 9, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    ctx.fillStyle = '#c2413b';
    for (const [dx, dy] of [[-6, -11], [2, -14], [7, -8], [-2, -6]]) ctx.fillRect(bx + dx, by + dy, 3, 3);
  } else if (n.kind === 'rock') {
    ctx.fillStyle = '#8b8b86'; ctx.fillRect(bx - 11, by - 16, 22, 14);
  } else {
    ctx.fillStyle = '#5a3b26'; ctx.fillRect(bx - 3, by - 20, 6, 20);
    ctx.fillStyle = '#2f7a35'; ctx.beginPath(); ctx.arc(bx, by - 34, 18, 0, Math.PI * 2); ctx.fill();
  }
}

function drawBuilding(ctx: CanvasRenderingContext2D, assets: AssetStore, b: Building, now: number, animate: boolean) {
  const px = b.x * TILE;
  const py = b.y * TILE;
  if (b.kind === 'campfire') {
    const sheet = assets.get('fx_campfire_sheet');
    const still = assets.get('fx_campfire_static');
    const spec = assets.spec('fx_campfire_sheet');
    if (sheet && spec && animate) {
      const f = Math.floor((now / 1000) * (spec.fps ?? 8)) % (spec.frames ?? 1);
      ctx.drawImage(sheet, f * spec.w, 0, spec.w, spec.h, px, py, TILE * b.w, TILE * b.h);
    } else if (still || sheet) {
      ctx.drawImage((still ?? sheet) as HTMLImageElement, 0, 0, 32, 32, px, py, TILE, TILE);
    } else {
      ctx.fillStyle = '#e8943a'; ctx.beginPath(); ctx.arc(px + 16, py + 20, 8, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  ctx.fillStyle = '#7a5a3a'; ctx.fillRect(px, py, b.w * TILE, b.h * TILE);
  ctx.fillStyle = '#b0803c'; ctx.fillRect(px, py - 10, b.w * TILE, 14);
}

export interface FrameState {
  cam: Camera;
  view: Size;
  dpr: number;
  now: number;
  animate: boolean;
  hover: Pick | null;
  selected: Pick | null;
}

const sameTarget = (a: Pick | null, b: Pick | null) =>
  !!a && !!b && a.type === b.type && (a.type === 'node' ? a.node.id === (b as typeof a).node.id
    : a.type === 'building' ? a.building.id === (b as typeof a).building.id
      : a.x === (b as typeof a).x && a.y === (b as typeof a).y);

function outline(ctx: CanvasRenderingContext2D, p: Pick, color: string, lw: number) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  if (p.type === 'tile') ctx.strokeRect(p.x * TILE + 0.5, p.y * TILE + 0.5, TILE - 1, TILE - 1);
  else if (p.type === 'node') {
    const s = NODE_SPRITE[p.node.kind];
    ctx.strokeRect(p.node.x * TILE + TILE / 2 - s.w / 2, (p.node.y + 1) * TILE - s.h, s.w, s.h);
  } else ctx.strokeRect(p.building.x * TILE, p.building.y * TILE, p.building.w * TILE, p.building.h * TILE);
}

export function drawFrame(ctx: CanvasRenderingContext2D, m: WorldMap, assets: AssetStore, ground: HTMLCanvasElement | null, f: FrameState) {
  const { cam, view, dpr } = f;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  ctx.imageSmoothingEnabled = false;
  ctx.fillStyle = '#10150f';
  ctx.fillRect(0, 0, view.w, view.h);
  ctx.save();
  // snap the camera to whole screen pixels so pixel art never shimmers
  ctx.translate(Math.round(view.w / 2 - cam.cx * cam.zoom), Math.round(view.h / 2 - cam.cy * cam.zoom));
  ctx.scale(cam.zoom, cam.zoom);
  if (ground) ctx.drawImage(ground, 0, 0);

  // visible tile range, with a margin for tall sprites
  const x0 = Math.floor((cam.cx - view.w / cam.zoom / 2) / TILE) - 2;
  const x1 = Math.ceil((cam.cx + view.w / cam.zoom / 2) / TILE) + 2;
  const y0 = Math.floor((cam.cy - view.h / cam.zoom / 2) / TILE) - 1;
  const y1 = Math.ceil((cam.cy + view.h / cam.zoom / 2) / TILE) + 3;
  type Drawable = { y: number; draw: () => void };
  const list: Drawable[] = [];
  for (const n of m.nodes) if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1) list.push({ y: n.y + 1, draw: () => drawNode(ctx, assets, n) });
  for (const b of m.buildings) if (b.x >= x0 && b.x <= x1 && b.y >= y0 && b.y <= y1) list.push({ y: b.y + b.h, draw: () => drawBuilding(ctx, assets, b, f.now, f.animate) });
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.draw();

  if (f.hover && !sameTarget(f.hover, f.selected)) outline(ctx, f.hover, 'rgba(255,255,255,0.55)', 1);
  if (f.selected) outline(ctx, f.selected, '#ffd166', 2);
  ctx.restore();
}
