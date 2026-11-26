import { DAY_TICKS, NIGHT_FRACTION } from '@/lib/civ/data/config';
import { activeSeason, doneBuildings, hasCapability } from '@/lib/civ/sim';
import type { CivState } from '@/lib/civ/types';
import { TILE, tileAt, type WorldMap } from '@/lib/civ/world';
import type { AssetStore } from './assets';
import { animFrame } from './assets';

/* Scenery, ambient life, weather and seasonal looks. Everything here is cosmetic: it reads state and never decides anything.
   Each piece uses a delivered sheet and silently does nothing if the file is missing. Quality tiers gate the busy parts. */

const hash = (x: number, y: number, k = 0) => ((x * 73856093) ^ (y * 19349663) ^ (k * 83492791)) >>> 0;

/** Draw one cell of a strip (cells laid out left to right) with its bottom-centre at (cx, by), or its top-left at (cx, by) when `topLeft`. */
export function cell(ctx: CanvasRenderingContext2D, assets: AssetStore, id: string, frame: number, cx: number, by: number, topLeft = false) {
  const img = assets.get(id);
  const spec = assets.spec(id);
  if (!img || !spec) return false;
  const f = Math.max(0, Math.min((spec.frames ?? 1) - 1, frame));
  ctx.drawImage(img, f * spec.w, 0, spec.w, spec.h, topLeft ? cx : Math.round(cx - spec.w / 2), topLeft ? by : Math.round(by - (spec.h - 1)), spec.w, spec.h);
  return true;
}

export const seasonIndex = (s: CivState) => ({ Spring: -1, Summer: -1, Autumn: 0, Winter: 1 } as Record<string, number>)[activeSeason(s)];

/** Static scenery laid into the cached ground layer: flowers, bushes, reeds, shore foam, path edges. Seeded per tile. */
export function groundDecor(ctx: CanvasRenderingContext2D, assets: AssetStore, m: WorldMap) {
  for (let y = 0; y < m.h; y++) for (let x = 0; x < m.w; x++) {
    const t = m.terrain[y * m.w + x];
    const h = hash(x, y);
    const px = x * TILE; const py = y * TILE;
    if (t === 'grass' && h % 13 === 3) cell(ctx, assets, 'veg_flowers', h % 4, px, py, true);
    else if (t === 'grass' && h % 29 === 5) cell(ctx, assets, 'veg_bushes', (h >> 3) % 4, px, py, true);
    else if (t === 'sand' && h % 3 === 0) cell(ctx, assets, 'veg_reeds', (h >> 2) % 4, px, py, true);
    else if (t === 'path' && h % 2 === 0) cell(ctx, assets, 'terrain_path_edge', (h >> 1) % 4, px, py, true);
    else if (t === 'water' && tileAt(m, x, y - 1) === 'sand' && h % 2 === 0) cell(ctx, assets, 'fx_shore_foam', (h >> 1) % 4, px, py, true);
  }
}

/** Things that depend on the game: stumps, irrigation, fences, orchards, bridge, wall and gate, market stalls. Drawn under people. */
export function worldDecor(ctx: CanvasRenderingContext2D, assets: AssetStore, m: WorldMap, s: CivState, x0: number, x1: number, y0: number, y1: number) {
  for (const st of s.stumps ?? []) {
    const x = st % m.w; const y = Math.floor(st / m.w);
    if (x >= x0 && x <= x1 && y >= y0 && y <= y1 && s.revealed[st] === '1') cell(ctx, assets, 'veg_stumps', hash(x, y) % 4, x * TILE, y * TILE, true);
  }
  const irrigated = hasCapability(s, 'irrigation');
  for (const b of s.buildings) {
    if (b.state !== 'done' || b.x + b.w < x0 || b.x > x1 || b.y < y0 || b.y > y1) continue;
    if (b.kind === 'farm') {
      if (irrigated) for (let i = 0; i < b.w; i++) cell(ctx, assets, 'terrain_irrigation', i % 4, (b.x + i) * TILE, (b.y + b.h) * TILE, true);
      cell(ctx, assets, 'prop_fence', hash(b.x, b.y) % 3, (b.x + b.w) * TILE + 4, (b.y + b.h) * TILE + 8);
      cell(ctx, assets, 'veg_orchard', activeSeason(s) === 'Autumn' ? 1 : 0, (b.x + b.w) * TILE + 34, (b.y + b.h) * TILE + 4);
    }
    if (b.kind === 'animal_pen') cell(ctx, assets, 'prop_fence', 1, (b.x + b.w / 2) * TILE, (b.y + b.h) * TILE + 6);
    if (b.kind === 'market') cell(ctx, assets, 'prop_market', hash(b.x, b.y) % 3, (b.x + b.w) * TILE + 20, (b.y + b.h) * TILE);
    if (b.kind === 'well') cell(ctx, assets, 'prop_well', hash(b.x, b.y) % 3, (b.x + 0.5) * TILE, (b.y + 1) * TILE + 4);
  }
  if (hasCapability(s, 'trade')) cell(ctx, assets, 'prop_bridge', 0, 12 * TILE, 21 * TILE + 8); // a crossing for the traders, at the river bend
  if (doneBuildings(s, 'assembly').length > 0) {
    const f = s.buildings[0];
    cell(ctx, assets, 'prop_wall_gate', 1, (f.x + 1) * TILE + 16, (f.y + 5) * TILE);
    cell(ctx, assets, 'prop_wall_gate', 0, (f.x - 1) * TILE + 16, (f.y + 5) * TILE);
    cell(ctx, assets, 'prop_wall_gate', 0, (f.x + 3) * TILE + 16, (f.y + 5) * TILE);
  }
}

/** Ambient animals that live in the scene: fish in the river, chickens by houses, a dog by the pen. Never counted in the economy. */
export function ambientAnimals(list: { y: number; draw: () => void }[], ctx: CanvasRenderingContext2D, assets: AssetStore, m: WorldMap, s: CivState, now: number) {
  const fr = (n: number, fps: number) => animFrame(n, fps, now, true);
  for (let i = 0; i < 3; i++) {
    const row = 21 + Math.round(Math.sin(i) * 0);
    const fx = ((now / 90 + i * 400) % (m.w * TILE + 64)) - 32;
    if (tileAt(m, Math.floor(fx / TILE), row) === 'water') list.push({ y: row, draw: () => { cell(ctx, assets, 'animal_fish', fr(4, 8), fx, (row + 1) * TILE - 4); } });
  }
  const houses = [...doneBuildings(s, 'house'), ...doneBuildings(s, 'shelter')];
  if (houses[0]) {
    const h0 = houses[0];
    const cx = (h0.x + h0.w + 1) * TILE + Math.sin(now / 1800) * 14;
    list.push({ y: h0.y + h0.h, draw: () => { cell(ctx, assets, 'animal_chicken_walk', 2 + (Math.floor(now / 150) % 2), cx, (h0.y + h0.h) * TILE + 6); } });
  }
  const pen = doneBuildings(s, 'animal_pen')[0];
  if (pen) list.push({ y: pen.y + 2, draw: () => { cell(ctx, assets, 'animal_dog_walk', 2 + (Math.floor(now / 140) % 2), (pen.x + pen.w) * TILE + 12 + Math.sin(now / 1200) * 18, (pen.y + 1) * TILE + 10); } });
}

/** Little effects on buildings that are working or celebrating. */
export function buildingFx(list: { y: number; draw: () => void }[], ctx: CanvasRenderingContext2D, assets: AssetStore, s: CivState, now: number, night: boolean) {
  const fr = (n: number, fps: number, off = 0) => animFrame(n, fps, now + off * 125, true);
  const festival = s.events.some(e => e.facts.festival === true && s.tick - e.tick < DAY_TICKS);
  for (const b of s.buildings) {
    if (b.state !== 'done') continue;
    const bx = (b.x + b.w / 2) * TILE; const by = (b.y + b.h) * TILE;
    if (b.kind === 'house' || b.kind === 'shelter') list.push({ y: b.y + b.h + 0.1, draw: () => { cell(ctx, assets, 'fx_chimney_smoke', fr(6, 8, b.x), bx + 10, by - 40); } });
    if (b.kind === 'forge') list.push({ y: b.y + b.h + 0.1, draw: () => { cell(ctx, assets, 'fx_forge_smoke', fr(6, 8), bx + 10, by - 44); if (b.workers > 0) cell(ctx, assets, 'fx_sparks', fr(6, 10), bx - 8, by - 10); } });
    if (b.kind === 'farm' && (b.amount ?? 0) >= (b.max ?? 1) * 0.67 && b.workers > 0) list.push({ y: b.y + b.h + 0.1, draw: () => { cell(ctx, assets, 'fx_harvest_sparkle', fr(6, 8), bx, by - 8); } });
    if (festival && (b.kind === 'assembly' || b.kind === 'campfire')) list.push({ y: b.y + b.h + 0.2, draw: () => { cell(ctx, assets, 'fx_lanterns', fr(6, 6), bx, by - 30); } });
    if (night && b.kind === 'house') list.push({ y: b.y + b.h + 0.1, draw: () => { ctx.fillStyle = 'rgba(255,200,90,0.35)'; ctx.fillRect(bx - 4, by - 22, 8, 8); } });
  }
}

/** Weather and light over the whole view, in screen space. */
export function weatherOverlay(ctx: CanvasRenderingContext2D, assets: AssetStore, s: CivState, view: { w: number; h: number }, now: number, quality: 'low' | 'medium' | 'high', animate: boolean) {
  if (quality === 'low' || !animate) return;
  const t = (s.tick % DAY_TICKS) / DAY_TICKS;
  const night = t >= 1 - NIGHT_FRACTION;
  const raining = !!s.hazard && s.hazard.phase !== 'scheduled';
  if (raining) {
    const sheet = assets.get('fx_weather_rain');
    if (sheet && quality === 'high') {
      const f = animFrame(6, 8, now, true);
      for (let y = 0; y < view.h; y += 64) for (let x = 0; x < view.w; x += 64) ctx.drawImage(sheet, f * 32, 0, 32, 32, x, y, 64, 64);
    }
  } else if (activeSeason(s) === 'Winter') {
    const frost = assets.get('fx_weather_frost');
    if (frost && quality === 'high') for (let y = 0; y < view.h; y += 96) for (let x = 0; x < view.w; x += 96) ctx.drawImage(frost, animFrame(6, 4, now, true) * 32, 0, 32, 32, x + ((x * 7 + y) % 40), y, 48, 48);
  }
  if (night && quality === 'high') {
    const ff = assets.get('fx_fireflies');
    if (ff) for (let i = 0; i < 6; i++) ctx.drawImage(ff, animFrame(6, 6, now + i * 300, true) * 32, 0, 32, 32, (i * 173 + Math.floor(now / 40)) % Math.max(1, view.w), (i * 97 + 40) % Math.max(1, view.h), 32, 32);
  }
  void hash;
}
