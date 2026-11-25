import { BUILDINGS } from '@/lib/civ/data/buildings';
import { DAY_TICKS, NIGHT_FRACTION } from '@/lib/civ/data/config';
import type { BuildingState, Citizen, CivState, NodeState } from '@/lib/civ/types';
import { NODE_SPRITE, TILE, isWater, tileAt, type Hit, type Terrain, type WorldMap } from '@/lib/civ/world';
import type { Camera, Size } from '@/lib/civ/camera';
import type { AssetStore } from './assets';

/* Canvas renderer for the settlement. It only READS simulation state; it never decides
   outcomes. Static terrain is cached on an offscreen canvas and rebuilt only when a
   loaded asset changes; sprites, effects and overlays are drawn per frame. Every asset
   has a procedural placeholder so a missing or broken file never crashes the game. */

const FLAT: Record<Terrain, string> = { grass: '#5d8a3a', dirt: '#8a5a3a', water: '#2f6f94', path: '#a98350', sand: '#d3b878' };
const DEEP = '#245b7d';

function drawTile(ctx: CanvasRenderingContext2D, assets: AssetStore, m: WorldMap, t: Terrain, x: number, y: number) {
  const px = x * TILE;
  const py = y * TILE;
  let id: string | null = null;
  if (t === 'grass') id = 'terrain_grass';
  else if (t === 'dirt') id = 'terrain_dirt';
  else if (t === 'path') id = 'terrain_path';
  else if (t === 'sand') id = 'terrain_sand';
  else if (t === 'water' && !isWater(tileAt(m, x, y - 1)) && tileAt(m, x, y - 1) !== null) id = 'terrain_shore_water';
  const img = id ? assets.get(id) : null;
  if (img) { ctx.drawImage(img, px, py, TILE, TILE); return; }
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

function drawNode(ctx: CanvasRenderingContext2D, assets: AssetStore, n: NodeState) {
  const s = NODE_SPRITE[n.kind];
  const bx = n.x * TILE + TILE / 2;
  const by = (n.y + 1) * TILE;
  const img = n.kind === 'tree' ? assets.get('prop_tree') : n.kind === 'rock' ? assets.get('prop_rock') : assets.get('prop_berry_bush');
  if (img) { ctx.drawImage(img, bx - s.w / 2, by - s.h, s.w, s.h); return; }
  if (n.kind === 'bush') {
    ctx.fillStyle = '#2f6b34'; ctx.beginPath(); ctx.ellipse(bx, by - 9, 12, 9, 0, 0, Math.PI * 2); ctx.fill();
    if (n.amount > 0) {
      ctx.fillStyle = '#c2413b';
      for (const [dx, dy] of [[-6, -11], [2, -14], [7, -8], [-2, -6]]) ctx.fillRect(bx + dx, by + dy, 3, 3);
    }
  } else if (n.kind === 'rock') {
    ctx.fillStyle = '#8b8b86'; ctx.fillRect(bx - 11, by - 16, 22, 14);
  } else {
    ctx.fillStyle = '#5a3b26'; ctx.fillRect(bx - 3, by - 20, 6, 20);
    ctx.fillStyle = '#2f7a35'; ctx.beginPath(); ctx.arc(bx, by - 34, 18, 0, Math.PI * 2); ctx.fill();
  }
}

const PLACEHOLDER_COLOR: Record<string, [string, string]> = {
  shelter: ['#8a6a3c', '#b8863c'], storage: ['#7a5a3a', '#9c7a4a'], workshop: ['#6d6a62', '#a05a32'], farm: ['#6b4a2c', '#3f7a35'],
};

function drawBuilding(ctx: CanvasRenderingContext2D, assets: AssetStore, b: BuildingState, now: number, animate: boolean) {
  const px = b.x * TILE;
  const py = b.y * TILE;
  const w = b.w * TILE;
  const h = b.h * TILE;
  if (b.kind === 'campfire') {
    const sheet = assets.get('fx_campfire_sheet');
    const still = assets.get('fx_campfire_static');
    const spec = assets.spec('fx_campfire_sheet');
    if (sheet && spec && animate) {
      const f = Math.floor((now / 1000) * (spec.fps ?? 8)) % (spec.frames ?? 1);
      ctx.drawImage(sheet, f * spec.w, 0, spec.w, spec.h, px, py, TILE, TILE);
    } else if (still || sheet) {
      ctx.drawImage((still ?? sheet) as HTMLImageElement, 0, 0, 32, 32, px, py, TILE, TILE);
    } else {
      ctx.fillStyle = '#e8943a'; ctx.beginPath(); ctx.arc(px + 16, py + 20, 8, 0, Math.PI * 2); ctx.fill();
    }
    return;
  }
  const def = BUILDINGS[b.kind];
  const site = b.state === 'site';
  // construction stages (blueprint -> foundation -> frame -> finished): stage art is optional, finished art is the fallback
  const stage = site ? (b.progress < 0.34 ? 1 : 2) : 0;
  const img = (stage ? assets.get(`${def.visualAssetId}_stage${stage}`) : null) ?? assets.get(def.visualAssetId);
  ctx.save();
  if (site) ctx.globalAlpha = 0.45 + 0.5 * b.progress;
  if (img) {
    ctx.drawImage(img, px, py + h - img.height);
  } else {
    const [base, accent] = PLACEHOLDER_COLOR[b.kind] ?? ['#777', '#999'];
    if (b.kind === 'farm') {
      ctx.fillStyle = base; ctx.fillRect(px, py, w, h);
      ctx.fillStyle = accent;
      const full = (b.amount ?? 0) / Math.max(1, b.max ?? 1);
      for (let i = 0; i < b.w * 2; i++) for (let j = 0; j < b.h; j++) {
        const sx = px + 4 + i * 14;
        const sy = py + 6 + j * 28;
        ctx.fillRect(sx, sy + 12 - Math.round(10 * full), 4, Math.max(2, Math.round(10 * full)));
      }
    } else {
      ctx.fillStyle = 'rgba(0,0,0,0.25)'; ctx.fillRect(px + 3, py + h - 6, w - 4, 8);
      ctx.fillStyle = base; ctx.fillRect(px + 2, py + 14, w - 4, h - 16);
      ctx.fillStyle = accent; ctx.beginPath(); ctx.moveTo(px - 2, py + 16); ctx.lineTo(px + w / 2, py - 10); ctx.lineTo(px + w + 2, py + 16); ctx.closePath(); ctx.fill();
      ctx.fillStyle = 'rgba(0,0,0,0.35)'; ctx.fillRect(px + w / 2 - 5, py + h - 20, 10, 18);
    }
  }
  ctx.restore();
  if (site) {
    ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.setLineDash([4, 3]); ctx.lineWidth = 1;
    ctx.strokeRect(px + 0.5, py + 0.5, w - 1, h - 1); ctx.setLineDash([]);
    ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px + 2, py - 6, w - 4, 5);
    ctx.fillStyle = '#ffd166'; ctx.fillRect(px + 3, py - 5, Math.round((w - 6) * b.progress), 3);
  } else if (b.kind === 'workshop' && b.note) {
    ctx.fillStyle = '#e07a5f'; ctx.fillRect(px + w - 9, py - 12, 7, 7);
  }
}

const ROW: Record<Citizen['facing'], number> = { s: 0, n: 1, e: 2, w: 3 };

function drawCitizen(ctx: CanvasRenderingContext2D, assets: AssetStore, c: Citizen, alpha: number, now: number, animate: boolean) {
  const ix = c.px + (c.x - c.px) * alpha;
  const iy = c.py + (c.y - c.py) * alpha;
  const fx = Math.round(ix * TILE + TILE / 2);
  const fy = Math.round((iy + 1) * TILE - 2);
  const kind = c.task.kind;
  const working = kind === 'gather' || kind === 'build' || kind === 'craft';
  const sleeping = kind === 'rest';
  ctx.fillStyle = 'rgba(0,0,0,0.22)'; ctx.beginPath(); ctx.ellipse(fx, fy, 9, 3.5, 0, 0, Math.PI * 2); ctx.fill();
  const sheet = assets.get('char_gatherer_directional');
  const spec = assets.spec('char_gatherer_directional');
  if (sheet && spec) {
    let col = 0;
    if (kind === 'walk') col = 2 + (Math.floor(c.dist * 2) % 4); // frame follows distance walked: no foot sliding
    else if (working) col = animate ? 6 + (Math.floor(now / 170) % 4) : 6;
    else col = animate ? Math.floor(now / 700) % 2 : 0;
    ctx.globalAlpha = sleeping ? 0.7 : 1;
    ctx.drawImage(sheet, col * spec.w, ROW[c.facing] * spec.h, spec.w, spec.h, fx - 16, fy - 47, spec.w, spec.h);
    ctx.globalAlpha = 1;
  } else {
    const bob = kind === 'walk' && animate ? Math.round(Math.sin(c.dist * Math.PI)) : 0;
    ctx.fillStyle = '#3f4859'; ctx.fillRect(fx - 4, fy - 12 + bob, 3, 11); ctx.fillRect(fx + 1, fy - 12 + bob, 3, 11);
    ctx.fillStyle = '#4a704f'; ctx.fillRect(fx - 6, fy - 26 + bob, 12, 15);
    ctx.fillStyle = '#da9a63'; ctx.fillRect(fx - 4, fy - 36 + bob, 8, 9);
    ctx.fillStyle = '#271f2c'; ctx.fillRect(fx - 4, fy - 37 + bob, 8, 3);
    if (working) { ctx.fillStyle = '#6a4a2a'; ctx.fillRect(fx + (c.facing === 'w' ? -10 : 7), fy - 32 + (Math.floor(now / 170) % 2) * 3, 2, 14); }
  }
  if (c.carrying) {
    ctx.fillStyle = c.carrying.res === 'food' ? '#c2413b' : c.carrying.res === 'wood' ? '#8a5a2a' : '#9a9a94';
    ctx.fillRect(fx - 3, fy - 54, 6, 6);
  }
  if (sleeping) { ctx.fillStyle = '#cfe0ff'; ctx.font = '9px monospace'; ctx.fillText('z', fx + 8, fy - 40 - (Math.floor(now / 500) % 2) * 2); }
}

export interface Ghost { kind: string; x: number; y: number; valid: boolean; far: boolean }

export interface FrameState {
  cam: Camera;
  view: Size;
  dpr: number;
  now: number;
  /** 0..1 progress between the last and next simulation tick, for smooth movement. */
  alpha: number;
  animate: boolean;
  hover: Hit | null;
  selected: Hit | null;
  ghost: Ghost | null;
  /** Planning aid: show the comfortable gathering reach around the camp. */
  overlays: boolean;
}

const sameTarget = (a: Hit | null, b: Hit | null) =>
  !!a && !!b && a.type === b.type && (a.type === 'node' ? a.node.id === (b as typeof a).node.id
    : a.type === 'building' ? a.building.id === (b as typeof a).building.id
      : a.type === 'citizen' ? a.id === (b as typeof a).id
        : a.x === (b as typeof a).x && a.y === (b as typeof a).y);

function outline(ctx: CanvasRenderingContext2D, p: Hit, s: CivState, color: string, lw: number, alpha: number) {
  ctx.strokeStyle = color; ctx.lineWidth = lw;
  if (p.type === 'tile') ctx.strokeRect(p.x * TILE + 0.5, p.y * TILE + 0.5, TILE - 1, TILE - 1);
  else if (p.type === 'node') {
    const sp = NODE_SPRITE[p.node.kind];
    ctx.strokeRect(p.node.x * TILE + TILE / 2 - sp.w / 2, (p.node.y + 1) * TILE - sp.h, sp.w, sp.h);
  } else if (p.type === 'building') ctx.strokeRect(p.building.x * TILE, p.building.y * TILE, p.building.w * TILE, p.building.h * TILE);
  else {
    const c = s.citizens.find(q => q.id === p.id);
    if (!c) return;
    const ix = c.px + (c.x - c.px) * alpha;
    const iy = c.py + (c.y - c.py) * alpha;
    ctx.beginPath(); ctx.ellipse(Math.round(ix * TILE + TILE / 2), Math.round((iy + 1) * TILE - 2), 13, 5, 0, 0, Math.PI * 2); ctx.stroke();
  }
}

export function drawFrame(ctx: CanvasRenderingContext2D, map: WorldMap, s: CivState, assets: AssetStore, ground: HTMLCanvasElement | null, f: FrameState) {
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

  const x0 = Math.floor((cam.cx - view.w / cam.zoom / 2) / TILE) - 2;
  const x1 = Math.ceil((cam.cx + view.w / cam.zoom / 2) / TILE) + 2;
  const y0 = Math.floor((cam.cy - view.h / cam.zoom / 2) / TILE) - 2;
  const y1 = Math.ceil((cam.cy + view.h / cam.zoom / 2) / TILE) + 3;

  // water shimmer on deep tiles (cheap line glints; static when reduced motion is on)
  if (f.animate) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
      if (tileAt(map, x, y) === 'water' && isWater(tileAt(map, x, y - 1))) {
        const o = Math.floor(f.now / 400 + x * 3 + y * 5) % 4;
        ctx.fillRect(x * TILE + 4 + o * 6, y * TILE + 10 + (x % 2) * 10, 8, 1);
      }
    }
  }

  if (f.overlays) {
    const fire = s.buildings[0];
    ctx.strokeStyle = 'rgba(255,209,102,0.35)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(fire.x * TILE + 16, fire.y * TILE + 16, 12 * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  type Drawable = { y: number; draw: () => void };
  const list: Drawable[] = [];
  for (const n of s.nodes) if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1) list.push({ y: n.y + 1, draw: () => drawNode(ctx, assets, n) });
  for (const b of s.buildings) {
    if (b.x + b.w >= x0 && b.x <= x1 && b.y >= y0 && b.y <= y1) {
      list.push({ y: b.kind === 'farm' && b.state === 'done' ? b.y - 1 : b.y + b.h, draw: () => drawBuilding(ctx, assets, b, f.now, f.animate) });
    }
  }
  for (const c of s.citizens) {
    const iy = c.py + (c.y - c.py) * f.alpha;
    list.push({ y: iy + 1, draw: () => drawCitizen(ctx, assets, c, f.alpha, f.now, f.animate) });
  }
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.draw();

  if (f.ghost) {
    const def = BUILDINGS[f.ghost.kind];
    const gw = def.footprint.w * TILE;
    const gh = def.footprint.h * TILE;
    ctx.fillStyle = f.ghost.valid ? (f.ghost.far ? 'rgba(255,193,7,0.35)' : 'rgba(76,175,80,0.35)') : 'rgba(229,57,53,0.40)';
    ctx.fillRect(f.ghost.x * TILE, f.ghost.y * TILE, gw, gh);
    ctx.strokeStyle = f.ghost.valid ? (f.ghost.far ? '#ffc107' : '#66bb6a') : '#ef5350'; ctx.lineWidth = 2;
    ctx.strokeRect(f.ghost.x * TILE + 1, f.ghost.y * TILE + 1, gw - 2, gh - 2);
  }
  if (f.hover && !sameTarget(f.hover, f.selected)) outline(ctx, f.hover, s, 'rgba(255,255,255,0.55)', 1, f.alpha);
  if (f.selected) outline(ctx, f.selected, s, '#ffd166', 2, f.alpha);
  ctx.restore();

  // night: a soft cool tint that eases in and out (visual only; the sim decides what night means)
  const t = (s.tick % DAY_TICKS) / DAY_TICKS;
  const start = 1 - NIGHT_FRACTION;
  const night = t >= start ? Math.min(1, (t - start) / 0.06, (1 - t) / 0.04) : 0;
  if (night > 0) { ctx.fillStyle = `rgba(12,20,52,${(0.42 * night).toFixed(3)})`; ctx.fillRect(0, 0, view.w, view.h); }
}
