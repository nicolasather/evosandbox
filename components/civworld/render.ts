import { BUILDINGS } from '@/lib/civ/data/buildings';
import { DAY_TICKS, NIGHT_FRACTION } from '@/lib/civ/data/config';
import type { BuildingState, Citizen, CivState, NodeState } from '@/lib/civ/types';
import { NODE_SPRITE, TILE, isWater, tileAt, type Hit, type Terrain, type WorldMap } from '@/lib/civ/world';
import { visibleTiles, type Camera, type Size } from '@/lib/civ/camera';
import type { AssetStore } from './assets';
import { ambientAnimals, buildingFx, groundDecor, seasonIndex, weatherOverlay, workDust, worldDecor } from './decor';
import { activeSeason, hasCapability, capacity } from '@/lib/civ/sim';
import { phaseOf } from '@/lib/civ/extras';

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
  if (t === 'grass' || t === 'path') {
    // low-noise variants scattered by a stable per-tile hash break up the visible repetition
    const h = (x * 31 + y * 17 + x * y * 7) % 10;
    const soft = h === 0 ? 'terrain_grass_soft_a' : h === 1 ? 'terrain_grass_soft_b' : 'terrain_grass';
    const base = assets.get(soft) ?? assets.get('terrain_grass');
    if (base) ctx.drawImage(base, px, py, TILE, TILE);
    else { ctx.fillStyle = FLAT.grass; ctx.fillRect(px, py, TILE, TILE); }
    if (t === 'grass') {
      // soft transition where the dirt clearing meets grass: the overlay carries the dirt on the side that touches it
      const dirs: [string, number, number][] = [['north', 0, -1], ['east', 1, 0], ['south', 0, 1], ['west', -1, 0]];
      for (const [d, dx, dy] of dirs) if (tileAt(m, x + dx, y + dy) === 'dirt') { const e = assets.get(`terrain_dirt_edge_${d}`); if (e) ctx.drawImage(e, px, py, TILE, TILE); }
      if (base) return;
    } else {
      const pimg = assets.get('terrain_path');
      if (pimg) { ctx.drawImage(pimg, px, py, TILE, TILE); return; }
    }
    if (base && t === 'path') return;
  } else if (t === 'dirt') id = 'terrain_dirt';
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
export function buildTerrainLayer(m: WorldMap, assets: AssetStore, season = -1): HTMLCanvasElement {
  const c = document.createElement('canvas');
  c.width = m.w * TILE;
  c.height = m.h * TILE;
  const ctx = c.getContext('2d');
  if (!ctx) return c;
  ctx.imageSmoothingEnabled = false;
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    drawTile(ctx, assets, m, m.terrain[y * m.w + x], x, y);
    // autumn and winter recolour the grass from the season strip (frame 0 autumn, 1 winter)
    if (season >= 0 && m.terrain[y * m.w + x] === 'grass') { const g = assets.get('terrain_grass_seasons'); if (g) ctx.drawImage(g, season * 32, 0, 32, 32, x * TILE, y * TILE, TILE, TILE); }
  }
  groundDecor(ctx, assets, m);
  return c;
}

function drawNode(ctx: CanvasRenderingContext2D, assets: AssetStore, n: NodeState, season = -1) {
  const s = NODE_SPRITE[n.kind];
  const bx = n.x * TILE + TILE / 2;
  const by = (n.y + 1) * TILE;
  const ratio = n.max > 0 ? n.amount / n.max : 0;
  const state = ratio > 0.5 ? 0 : ratio > 0 ? 1 : 2; // full, partial, depleted
  if (n.kind === 'game') {
    const deer = assets.get('animal_deer_walk');
    if (n.amount <= 0) return;
    if (deer) ctx.drawImage(deer, 0, 0, 32, 48, bx - 16, by - 47, 32, 48);
    else { ctx.fillStyle = '#8a6a3c'; ctx.fillRect(bx - 9, by - 20, 18, 12); ctx.fillRect(bx + 5, by - 28, 6, 10); }
    return;
  }
  const sheetId = n.kind === 'bush' ? 'res_berry_states' : n.kind === 'rock' ? 'res_stonepile_states' : null;
  const sheet = sheetId ? assets.get(sheetId) : null;
  if (sheet) { ctx.drawImage(sheet, state * 48, 0, 48, 48, bx - 24, by - 43 - 1, 48, 48); return; }
  const hv = (n.x * 31 + n.y * 17) % 3;
  if (n.kind === 'tree') {
    const ss = assets.get('terrain_tree_seasons'); const tv = assets.get('terrain_tree_variants');
    const sIdx = season >= 0 ? season : -1;
    const src = sIdx >= 0 && ss ? ss : tv;
    if (src) { ctx.drawImage(src, (sIdx >= 0 && ss ? sIdx : hv) * 48, 0, 48, 64, bx - 24, by - 64, 48, 64); return; }
  }
  if (n.kind === 'rock') { const rv = assets.get('terrain_rock_variants'); if (rv && !assets.get('res_stonepile_states')) { ctx.drawImage(rv, hv * 32, 0, 32, 32, bx - 16, by - 32, 32, 32); return; } }
  const img = n.kind === 'tree' ? assets.get('prop_tree') : n.kind === 'rock' ? assets.get('prop_rock') : null;
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
  animal_pen: ['#7a5a3a', '#a08a60'], records_hall: ['#8a7a60', '#5a7a9a'], house: ['#9a7a52', '#b46a3a'], pottery_kiln: ['#8a5a48', '#c0704a'], drying_rack: ['#7a5a3a', '#b8a060'], well: ['#7d7d78', '#4a7aa0'], market: ['#8a6a3c', '#c0503a'], assembly: ['#8a7a60', '#6a8a5a'],
  granary: ['#8a7a4c', '#c9a85a'], forge: ['#5a5550', '#c0562a'], shelter: ['#8a6a3c', '#b8863c'], storage: ['#7a5a3a', '#9c7a4a'], workshop: ['#6d6a62', '#a05a32'], farm: ['#6b4a2c', '#3f7a35'],
};

function drawBuilding(ctx: CanvasRenderingContext2D, assets: AssetStore, b: BuildingState, now: number, animate: boolean, phase = 0, hasCap: (id: string) => boolean = () => false, foodFull = false) {
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
  if (b.kind === 'road') {
    ctx.globalAlpha = b.state === 'site' ? 0.5 : 1;
    const cart = assets.get('terrain_cart_road');
    if (cart) { ctx.drawImage(cart, ((b.x * 3 + b.y) % 4) * 32, 0, 32, 32, px, py, TILE, TILE); ctx.globalAlpha = 1; return; }
    ctx.fillStyle = '#8d7b5a'; ctx.fillRect(px, py, TILE, TILE);
    ctx.fillStyle = '#a89572'; for (let i = 0; i < 5; i++) ctx.fillRect(px + 3 + ((i * 9) % 22), py + 4 + ((i * 13) % 22), 5, 3);
    ctx.globalAlpha = 1;
    return;
  }
  const def = BUILDINGS[b.kind];
  // farm plots show their growth: seed (new site), growing, ripe, harvested (nothing left to gather)
  const terraced = b.kind === 'farm' && hasCap('irrigation') ? assets.get('bld_terraced') : null;
  const growth = terraced ?? (b.kind === 'farm' ? assets.get('bld_farm_growth') : null);
  if (growth) {
    const ratio = (b.amount ?? 0) / Math.max(1, b.max ?? 1);
    // terraced sheet: 0 foundation, 1 terraces, 2 planted; growth sheet: 0 seed, 1 growing, 2 ripe, 3 harvested
    const stage = terraced ? (b.state === 'site' ? 0 : ratio > 0 ? 2 : 1) : b.state === 'site' ? 0 : ratio > 0.66 ? 2 : ratio > 0 ? 1 : 3;
    ctx.save();
    if (b.state === 'site') ctx.globalAlpha = 0.5 + 0.5 * b.progress;
    for (let i = 0; i < Math.ceil(b.w / 2); i++) {
      const gx = px + Math.min(i * 64, b.w * TILE - 64);
      ctx.drawImage(growth, stage * 64, 0, 64, 64, gx, py + h - 6 - 57, 64, 64);
    }
    ctx.restore();
    if (b.state === 'site') { ctx.fillStyle = 'rgba(0,0,0,0.55)'; ctx.fillRect(px + 2, py - 6, w - 4, 5); ctx.fillStyle = '#ffd166'; ctx.fillRect(px + 3, py - 5, Math.round((w - 6) * b.progress), 3); }
    return;
  }
  const site = b.state === 'site';
  // construction stages from the sheet: frame 0 foundation, 1 frame, 2 finished; anchor (32,57) sits at the footprint's bottom centre
  const large = b.kind === 'shelter' && !site ? assets.get('bld_shelter_large') : b.kind === 'workshop' && !site && phase >= 2 ? assets.get('bld_workshop_large') : null;
  if (large) {
    ctx.drawImage(large, px + w / 2 - 48, py + h - 6 - 89);
    return;
  }
  // finished houses show how advanced the settlement is (wattle, then stone, then painted); granaries show full or empty
  if (!site && b.kind === 'house') { const hv = assets.get('bld_house_variants'); if (hv) { ctx.drawImage(hv, (hasCap('records') ? 2 : hasCap('stone_tool') ? 1 : 0) * 64, 0, 64, 64, px + w / 2 - 32, py + h - 6 - 57, 64, 64); return; } }
  if (!site && b.kind === 'granary') { const gs = assets.get('veg_granary_state'); if (gs) { ctx.drawImage(gs, (foodFull ? 0 : 1) * 64, 0, 64, 64, px + w / 2 - 32, py + h - 6 - 57, 64, 64); return; } }
  const sheet = assets.get(def.visualAssetId);
  const frame = site ? (b.progress < 0.5 ? 0 : 1) : 2;
  const img = sheet && sheet.width >= 192 ? null : sheet;
  ctx.save();
  if (site) ctx.globalAlpha = 0.45 + 0.5 * b.progress;
  if (sheet && sheet.width >= 192) {
    ctx.drawImage(sheet, frame * 64, 0, 64, 64, px + w / 2 - 32, py + h - 6 - (def.anchorY ?? 57), 64, 64);
  } else if (img) {
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

/** Lays the tint tile over the view at a strength; frames are 0 dusk, 1 winter night, 2 dawn, 3 day. */
function paintTint(ctx: CanvasRenderingContext2D, tint: HTMLImageElement, view: { w: number; h: number }, strength: number, frame: number) {
  ctx.save();
  ctx.globalAlpha = Math.min(1, strength);
  for (let y = 0; y < view.h; y += 64) for (let x = 0; x < view.w; x += 64) ctx.drawImage(tint, frame * 32, 0, 32, 32, x, y, 64, 64);
  ctx.restore();
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
  const role = c.age === 'elder' ? 'elder' : kind === 'build' || (kind === 'walk' && c.task.purpose === 'build') ? 'builder'
    : kind === 'craft' || (kind === 'walk' && c.task.purpose === 'craft') ? 'toolmaker' : 'gatherer';
  const sheet = assets.get(`char_${role}_directional`) ?? assets.get('char_gatherer_directional');
  const spec = assets.spec(`char_${role}_directional`) ?? assets.spec('char_gatherer_directional');
  const poses = assets.get('char_gatherer_actions');
  const pose = sleeping ? 2 : kind === 'eat' ? 1 : c.carrying && kind === 'walk' ? 0 : -1;
  // side-on figures use the expanded action strip (frame order in its metadata); north and south keep the directional sheets
  const expanded = assets.get('char_actions_expanded');
  const exFrame = !expanded || sleeping || kind === 'eat' ? -1
    : kind === 'walk' && c.carrying ? ({ wood: 0, stone: 1, food: 9 } as Record<string, number>)[c.carrying.res] ?? -1
    : working ? (kind === 'gather' ? 4 : 2) : -1;
  if (expanded && exFrame >= 0 && (c.facing === 'e' || c.facing === 'w')) {
    ctx.save();
    if (c.facing === 'w') { ctx.translate(fx, 0); ctx.scale(-1, 1); ctx.translate(-fx, 0); }
    ctx.drawImage(expanded, exFrame * 32, 0, 32, 48, fx - 16, fy - 47, 32, 48);
    ctx.restore();
  } else if (poses && pose >= 0) {
    ctx.drawImage(poses, pose * 32, ROW[c.facing] * 48, 32, 48, fx - 16, fy - 47, 32, 48);
  } else if (sheet && spec) {
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
  const zz = assets.get('fx_sleep_z');
  if (sleeping) {
    if (zz && animate) ctx.drawImage(zz, (Math.floor(now / 330) % 4) * 32, 0, 32, 32, fx - 4, fy - 72, 32, 32);
    else if (zz) ctx.drawImage(zz, 0, 0, 32, 32, fx - 4, fy - 72, 32, 32);
    else { ctx.fillStyle = '#cfe0ff'; ctx.font = '9px monospace'; ctx.fillText('z', fx + 8, fy - 40 - (Math.floor(now / 500) % 2) * 2); }
  } else {
    // a small thought mark when a need is pressing: world-first information, with exact numbers in the inspector
    const em = c.hunger >= 55 ? 'ui_emote_hungry' : c.energy <= 30 ? 'ui_emote_tired' : c.task.kind === 'craft' ? 'ui_emote_idea' : c.task.kind === 'idle' && c.idleReason ? 'ui_emote_alert' : null;
    const img = em ? assets.get(em) : null;
    if (img) ctx.drawImage(img, fx + 4, fy - 62, 16, 16);
  }
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
  /** low: no ambient loops, medium: water and smoke, high: everything including wind and wildlife. */
  quality: 'low' | 'medium' | 'high';
}

function nearWaterTile(map: WorldMap, x: number, y: number): boolean {
  for (let dy = -2; dy <= 2; dy++) for (let dx = -2; dx <= 2; dx++) if (tileAt(map, x + dx, y + dy) === 'water') return true;
  return false;
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

  const { x0, x1, y0, y1 } = visibleTiles(cam, view, TILE);

  // looping environment sheets (shore foam, wind in the grass). Reduced motion draws frame 0 only, so nothing flickers.
  const mid = f.quality !== 'low';
  const hi = f.quality === 'high';
  const shore = mid ? assets.get('fx_shore_water') : null;
  const wind = hi ? assets.get('fx_grass_wind') : null;
  if (shore || wind) {
    for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
      const t = tileAt(map, x, y);
      if (shore && t === 'water' && tileAt(map, x, y - 1) !== null && !isWater(tileAt(map, x, y - 1))) {
        const fr = f.animate ? Math.floor(f.now / 125) % 6 : 0;
        ctx.drawImage(shore, fr * 32, 0, 32, 32, x * TILE, y * TILE, TILE, TILE);
      } else if (wind && t === 'grass' && (x * 7 + y * 13) % 9 === 0) {
        const fr = f.animate ? (Math.floor(f.now / 125) + x + y) % 4 : 0;
        ctx.drawImage(wind, fr * 32, 0, 32, 32, x * TILE, y * TILE, TILE, TILE);
      }
    }
  }

  // deep water: the delivered loop when available (frame 0 under reduced motion), else cheap line glints
  const still = assets.get('terrain_water_quiet');
  const deep = mid ? (f.animate ? assets.get('terrain_water_deep') : still ?? assets.get('terrain_water_deep')) : null;
  if (deep) {
    const fr = f.animate && deep.width >= 192 ? Math.floor(f.now / 160) % 6 : 0;
    for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
      if (tileAt(map, x, y) === 'water' && isWater(tileAt(map, x, y - 1)) && isWater(tileAt(map, x, y + 1))) ctx.drawImage(deep, fr * 32, 0, 32, 32, x * TILE, y * TILE, TILE, TILE);
    }
  }
  if (f.animate && !deep && mid) {
    ctx.fillStyle = 'rgba(255,255,255,0.10)';
    for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
      if (tileAt(map, x, y) === 'water' && isWater(tileAt(map, x, y - 1))) {
        const o = Math.floor(f.now / 400 + x * 3 + y * 5) % 4;
        ctx.fillRect(x * TILE + 4 + o * 6, y * TILE + 10 + (x % 2) * 10, 8, 1);
      }
    }
  }

  if (f.overlays) {
    ctx.strokeStyle = 'rgba(120,200,255,0.55)'; ctx.lineWidth = 1;
    for (const c of s.citizens) {
      if (c.path.length === 0) continue;
      ctx.beginPath(); ctx.moveTo(c.x * TILE + 16, c.y * TILE + 16);
      for (const [px2, py2] of c.path) ctx.lineTo(px2 * TILE + 16, py2 * TILE + 16);
      ctx.stroke();
    }
    const fire = s.buildings[0];
    ctx.strokeStyle = 'rgba(255,209,102,0.35)'; ctx.setLineDash([6, 6]); ctx.lineWidth = 1;
    ctx.beginPath(); ctx.arc(fire.x * TILE + 16, fire.y * TILE + 16, 12 * TILE, 0, Math.PI * 2); ctx.stroke(); ctx.setLineDash([]);
  }

  type Drawable = { y: number; draw: () => void };
  const list: Drawable[] = [];
  const phaseIdx = phaseOf(s).index;
  const hc = (id: string) => hasCapability(s, id);
  const foodFull = s.stock.food >= capacity(s) * 0.5;
  worldDecor(ctx, assets, map, s, x0, x1, y0, y1);
  for (const n of s.nodes) if (n.x >= x0 && n.x <= x1 && n.y >= y0 && n.y <= y1 && s.revealed[n.y * map.w + n.x] === '1') list.push({ y: n.y + 1, draw: () => drawNode(ctx, assets, n, seasonIndex(s)) });
  for (const b of s.buildings) {
    if (b.x + b.w >= x0 && b.x <= x1 && b.y >= y0 && b.y <= y1) {
      list.push({ y: b.kind === 'farm' && b.state === 'done' ? b.y - 1 : b.y + b.h, draw: () => drawBuilding(ctx, assets, b, f.now, f.animate, phaseIdx, hc, foodFull) });
    }
  }
  // ambient wildlife (cosmetic, no resource accounting): a goat and a sheep wander the eastern meadow in high quality
  if (hi && f.animate) {
    const spots: [string, number, number][] = [['animal_goat_walk', 31, 9], ['animal_sheep_walk', 33, 12], ['animal_deer_walk', 6, 9], ['animal_rabbit_walk', 5, 14]];
    spots.forEach(([id, bx, by], i) => {
      const sheet = assets.get(id);
      if (!sheet || s.revealed[by * map.w + bx] !== '1') return;
      const ph = f.now / 5000 + i * 2;
      const wx = bx * TILE + Math.sin(ph) * 40;
      const moving = Math.cos(ph) > -0.3;
      const fr = moving ? 2 + (Math.floor(f.now / 166) % 2) : Math.floor(f.now / 600) % 2;
      list.push({ y: by + 1, draw: () => ctx.drawImage(sheet, fr * 32, 0, 32, 48, Math.round(wx), by * TILE - 20, 32, 48) });
    });
  }
  for (const c of s.citizens) {
    const iy = c.py + (c.y - c.py) * f.alpha;
    list.push({ y: iy + 1, draw: () => drawCitizen(ctx, assets, c, f.alpha, f.now, f.animate) });
  }
  const dust = assets.get('fx_build_dust');
  if (dust && f.animate && mid) {
    for (const b of s.buildings) {
      if (b.state === 'site' && b.workers > 0 && b.x + b.w >= x0 && b.x <= x1 && b.y >= y0 && b.y <= y1) {
        list.push({ y: b.y + b.h + 0.5, draw: () => ctx.drawImage(dust, (Math.floor(f.now / 100) % 6) * 32, 0, 32, 32, b.x * TILE + b.w * TILE / 2 - 16, (b.y + b.h) * TILE - 30, 32, 32) });
      }
    }
  }
  const smoke = assets.get('fx_smoke');
  if (smoke && f.animate && mid) {
    const fire = s.buildings[0];
    list.push({ y: fire.y + 2, draw: () => ctx.drawImage(smoke, (Math.floor(f.now / 125) % 6) * 32, 0, 32, 32, fire.x * TILE, fire.y * TILE - 26, TILE, TILE) });
  }
  if (mid) buildingFx(list, ctx, assets, s, f.now, (s.tick % DAY_TICKS) / DAY_TICKS >= 1 - NIGHT_FRACTION);
  if (mid && f.animate && f.quality !== 'low') workDust(list, ctx, assets, s, f.now);
  if (hi && f.animate) ambientAnimals(list, ctx, assets, map, s, f.now);
  // a visiting trader waits by the fire (and a caravan stands beside the market)
  if (s.visitor && (s.visitor.kind === 'trader' || s.visitor.kind === 'caravan') && assets.get('char_trader_directional')) {
    const fire = s.buildings[0];
    list.push({ y: fire.y + 2, draw: () => { const tr = assets.get('char_trader_directional')!; ctx.drawImage(tr, 2 * 32, 0, 32, 48, (fire.x + 2) * TILE, (fire.y + 2) * TILE - 46, 32, 48); } });
  }
  list.sort((a, b) => a.y - b.y);
  for (const d of list) d.draw();

  // a new discovery gets a short, subtle reaction at the fire, not a screen takeover
  const lastFind = [...s.events].reverse().find(e => e.kind === 'discovery');
  if (lastFind && s.tick - lastFind.tick < 80 && f.animate) {
    const fire = s.buildings[0];
    const k = (s.tick - lastFind.tick) / 80;
    ctx.strokeStyle = `rgba(255,209,102,${(0.8 * (1 - k)).toFixed(2)})`; ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(fire.x * TILE + 16, fire.y * TILE + 16, 10 + k * 40, 0, Math.PI * 2); ctx.stroke();
  }

  // ambient life: a few birds cross the map by day (cosmetic only, no resource accounting, still when motion is reduced)
  if (f.animate && hi) {
    const tod = (s.tick % DAY_TICKS) / DAY_TICKS;
    if (tod < 1 - NIGHT_FRACTION) {
      ctx.strokeStyle = 'rgba(30,30,30,0.7)'; ctx.lineWidth = 1;
      for (let i = 0; i < 3; i++) {
        const bx = ((f.now / 55 + i * 430) % (map.w * TILE + 160)) - 80;
        const by = 60 + i * 150 + Math.sin(f.now / 700 + i) * 10;
        const flap = Math.floor(f.now / 160 + i) % 2 ? 2 : -2;
        ctx.beginPath(); ctx.moveTo(bx - 4, by + flap); ctx.lineTo(bx, by); ctx.lineTo(bx + 4, by + flap); ctx.stroke();
      }
    }
  }

  // flood: low ground by the river is tinted while the water is up, and outlined during the warning
  if (s.hazard && (s.hazard.phase === 'active' || s.hazard.phase === 'warned')) {
    for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
      if (tileAt(map, x, y) !== 'water' && tileAt(map, x, y) !== null && nearWaterTile(map, x, y)) {
        if (s.hazard.phase === 'active') { ctx.fillStyle = 'rgba(40,110,170,0.38)'; ctx.fillRect(x * TILE, y * TILE, TILE, TILE); }
        else { ctx.strokeStyle = 'rgba(255,193,7,0.5)'; ctx.lineWidth = 1; ctx.strokeRect(x * TILE + 0.5, y * TILE + 0.5, TILE - 1, TILE - 1); }
      }
    }
  }
  // map notes the player (or an expedition) left
  for (const n of s.notes) {
    if (n.x < x0 || n.x > x1 || n.y < y0 || n.y > y1) continue;
    ctx.fillStyle = '#ffd166'; ctx.fillRect(n.x * TILE + 14, n.y * TILE + 4, 2, 22);
    ctx.fillStyle = '#e07a5f'; ctx.fillRect(n.x * TILE + 16, n.y * TILE + 4, 10, 7);
  }
  // fog of war: ground nobody has seen is dark and hides what is on it
  ctx.fillStyle = 'rgba(8,10,8,0.86)';
  for (let y = Math.max(0, y0); y < Math.min(map.h, y1); y++) for (let x = Math.max(0, x0); x < Math.min(map.w, x1); x++) {
    if (s.revealed[y * map.w + x] !== '1') ctx.fillRect(x * TILE, y * TILE, TILE, TILE);
  }

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
  weatherOverlay(ctx, assets, s, view, f.now, f.quality, f.animate);
  if (s.hazard && s.hazard.phase !== 'scheduled' && f.animate && f.quality !== 'low') {
    ctx.strokeStyle = 'rgba(190,210,235,0.45)'; ctx.lineWidth = 1;
    for (let i = 0; i < 70; i++) {
      const rx = (i * 97 + Math.floor(f.now / 12)) % Math.max(1, Math.floor(view.w));
      const ry = (i * 53 + Math.floor(f.now / 5)) % Math.max(1, Math.floor(view.h));
      ctx.beginPath(); ctx.moveTo(rx, ry); ctx.lineTo(rx - 3, ry + 9); ctx.stroke();
    }
  }
  const tint = f.quality === 'low' ? null : assets.get('fx_tint');
  if (tint && night > 0) paintTint(ctx, tint, view, night, activeSeason(s) === 'Winter' ? 1 : 0);
  // the sheet alone reads as dusk; a cool wash on top makes night clearly night (the fallback when the sheet is absent is the same wash)
  if (night > 0) { ctx.fillStyle = `rgba(12,20,52,${((tint ? 0.2 : 0.28) * night).toFixed(3)})`; ctx.fillRect(0, 0, view.w, view.h); }
  if (tint && t < 0.06) paintTint(ctx, tint, view, (1 - t / 0.06) * 0.5, 2);
}
