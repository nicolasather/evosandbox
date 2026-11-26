/* ============================================================================
   CIV WORLD — the settlement map and its pure queries. No React, no canvas,
   no randomness at call time: the map is hand-authored plus a seeded scatter,
   so a given seed always yields the same world (master design §4.1, §14.1).
   ========================================================================== */

export const TILE = 32;

export type Terrain = 'grass' | 'dirt' | 'water' | 'path' | 'sand';
export type NodeKind = 'tree' | 'bush' | 'rock' | 'game';
export type BuildingKind = 'campfire' | 'shelter' | 'storage' | 'workshop' | 'farm' | 'granary' | 'forge' | 'road' | 'market' | 'assembly' | 'house' | 'pottery_kiln' | 'drying_rack' | 'well' | 'records_hall' | 'animal_pen';

export interface ResourceNode { id: string; kind: NodeKind; x: number; y: number; amount: number }
export interface Building { id: string; kind: BuildingKind; x: number; y: number; w: number; h: number }

export interface WorldMap {
  seed: number;
  w: number;
  h: number;
  terrain: Terrain[];
  nodes: ResourceNode[];
  buildings: Building[];
}

/** Sprite footprint in world pixels, anchored bottom-centre of the node's tile. Used for drawing and hit areas. */
export const NODE_SPRITE: Record<NodeKind, { w: number; h: number }> = {
  tree: { w: 48, h: 64 },
  bush: { w: 32, h: 32 },
  rock: { w: 32, h: 32 },
  game: { w: 32, h: 48 },
};
export const NODE_LABEL: Record<NodeKind, string> = { tree: 'Tree', bush: 'Berry bush', rock: 'Stone outcrop', game: 'Game herd' };
export const BUILDING_LABEL: Record<BuildingKind, string> = { campfire: 'Campfire', shelter: 'Shelter', storage: 'Storage', workshop: 'Workshop', farm: 'Farm plot', granary: 'Granary', forge: 'Forge', road: 'Road', market: 'Market', assembly: 'Assembly', house: 'House', pottery_kiln: 'Pottery kiln', drying_rack: 'Drying rack', well: 'Well', records_hall: 'Records hall', animal_pen: 'Animal pen' };

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export const tileAt = (m: WorldMap, x: number, y: number): Terrain | null =>
  x < 0 || y < 0 || x >= m.w || y >= m.h ? null : m.terrain[y * m.w + x];

export const isWater = (t: Terrain | null): boolean => t === 'water';

/** Whether a tile can be walked on / built on: in bounds, not water. */
export const isLand = (m: WorldMap, x: number, y: number): boolean => {
  const t = tileAt(m, x, y);
  return t !== null && t !== 'water';
};

/** The small hand-authored starting region: a wavy river across the south, a dirt clearing around the campfire, a path to the river. */
export type MapKind = 'classic' | 'procedural';

/** The hand-authored first map is the default; a procedural map is the same ingredients laid out from the seed. */
export function createWorld(seed = 1, kind: MapKind = 'classic'): WorldMap {
  const w = 40;
  const h = 30;
  const rnd = mulberry32(seed);
  const terrain: Terrain[] = new Array(w * h).fill('grass');
  const set = (x: number, y: number, t: Terrain) => { if (x >= 0 && y >= 0 && x < w && y < h) terrain[y * w + x] = t; };

  const proc = kind === 'procedural';
  // procedural: the camp, the river's course and the woods all come from the seed; classic keeps the authored values
  const cx = proc ? 12 + Math.floor(rnd() * 16) : 19;
  const cy = proc ? 7 + Math.floor(rnd() * 5) : 12;
  const riverBase = proc ? cy + 9 + Math.floor(rnd() * 3) : 21;
  const amp = proc ? 1 + rnd() * 2.2 : 2;
  const wave = proc ? 3 + rnd() * 3 : 4.5;
  const phase = proc ? rnd() * 6 : 0;
  // river: three tiles deep, meandering by column
  for (let x = 0; x < w; x++) {
    const mid = riverBase + Math.round(Math.sin(x / wave + phase) * amp);
    for (let d = -1; d <= 1; d++) set(x, mid + d, 'water');
    set(x, mid - 2, 'sand');
  }
  // dirt clearing
  for (let y = cy - 3; y <= cy + 3; y++) for (let x = cx - 4; x <= cx + 4; x++) {
    const d = Math.hypot((x - cx) / 4.5, (y - cy) / 3.2);
    if (d < 1 && rnd() > 0.15) set(x, y, 'dirt');
  }
  // path from the clearing down to the river bank
  for (let y = cy + 3; y < h; y++) {
    const col = cx + 1 + Math.round((y - cy) / 6);
    const t = terrain[y * w + col];
    if (t === 'water') break;
    set(col, y, 'path'); // runs down to the shore and stops there
    if (t === 'sand') break;
  }

  const nodes: ResourceNode[] = [];
  const taken = new Set<number>();
  const free = (x: number, y: number) => x >= 0 && y >= 0 && x < w && y < h && terrain[y * w + x] === 'grass' && !taken.has(y * w + x);
  let n = 0;
  const place = (kind: NodeKind, x: number, y: number, amount: number) => {
    if (!free(x, y)) return false;
    taken.add(y * w + x);
    nodes.push({ id: `${kind}-${n++}`, kind, x, y, amount });
    return true;
  };
  // woods in the north-west and east, berry bushes by the clearing, stones north-east
  const scatter = (kind: NodeKind, count: number, x0: number, y0: number, x1: number, y1: number, amount: number) => {
    let guard = 0;
    while (count > 0 && guard++ < 400) {
      if (place(kind, x0 + Math.floor(rnd() * (x1 - x0 + 1)), y0 + Math.floor(rnd() * (y1 - y0 + 1)), amount)) count--;
    }
  };
  if (proc) {
    // woods and stone in seeded patches: some seeds are forest-heavy, some open
    const patch = (n: number, kind2: NodeKind, amount: number) => {
      const px = 2 + Math.floor(rnd() * 30); const py = 1 + Math.floor(rnd() * 14);
      scatter(kind2, n, px, py, Math.min(w - 2, px + 9), Math.min(riverBase - 5, py + 7), amount);
    };
    for (let i = 0; i < 3; i++) patch(10 + Math.floor(rnd() * 12), 'tree', 40);
    for (let i = 0; i < 2; i++) patch(3 + Math.floor(rnd() * 4), 'rock', 30);
  } else {
    scatter('tree', 26, 1, 2, 13, 16, 40);
    scatter('tree', 14, 28, 3, 38, 17, 40);
    scatter('tree', 6, 14, 1, 26, 3, 40);
  }
  scatter('bush', 7, Math.max(1, cx - 7), Math.max(1, cy - 4), Math.min(w - 2, cx + 8), Math.min(h - 2, cy + 5), 12);
  if (!proc) scatter('rock', 6, 28, 2, 37, 8, 30);
  // a small grove inside the starting view, so wood does not depend on exploring at once
  for (const [dx, dy] of [[-7, -3], [-8, -1], [-6, -6], [7, -2], [8, 1], [-3, -7], [4, -7], [-8, 4]]) place('tree', cx + dx, cy + dy, 40);
  // a couple of outcrops inside the starting view so stone is never out of reach at the start
  place('rock', cx + 6, cy - 5, 30);
  place('rock', cx - 6, cy + 5, 30);

  // wild herds at the far edges: they only matter once people know how to hunt
  scatter('game', 4, Math.min(w - 8, cx + 9), Math.max(1, cy - 3), w - 2, Math.min(h - 2, cy + 5), 3);
  scatter('game', 3, 1, Math.max(1, cy - 3), Math.max(2, cx - 10), Math.min(h - 2, cy + 5), 3);

  const buildings: Building[] = [{ id: 'campfire-0', kind: 'campfire', x: cx, y: cy, w: 1, h: 1 }];
  taken.add(cy * w + cx);
  // keep the fire's tile free of nodes
  const keep = nodes.filter(nd => !(nd.x === cx && nd.y === cy));
  return { seed, w, h, terrain, nodes: keep, buildings };
}

/* ---------- hit testing ---------- */

export type Hit =
  | { type: 'citizen'; id: string }
  | { type: 'node'; node: ResourceNode }
  | { type: 'building'; building: Building }
  | { type: 'tile'; x: number; y: number; terrain: Terrain };

/** Pad (world px) added around sprites so small objects are easy to select. */
const HIT_PAD = 4;

const nodeRect = (nd: ResourceNode) => {
  const s = NODE_SPRITE[nd.kind];
  const bottom = (nd.y + 1) * TILE;
  const cxp = nd.x * TILE + TILE / 2;
  return { l: cxp - s.w / 2 - HIT_PAD, r: cxp + s.w / 2 + HIT_PAD, t: bottom - s.h - HIT_PAD, b: bottom + HIT_PAD };
};
const buildingRect = (b: Building) => ({ l: b.x * TILE - HIT_PAD, r: (b.x + b.w) * TILE + HIT_PAD, t: (b.y - 1) * TILE - HIT_PAD, b: (b.y + b.h) * TILE + HIT_PAD });

/** Anything with a grid, terrain and entities: the static map, or the map with live state swapped in. */
export type MapLike = Pick<WorldMap, 'w' | 'h' | 'terrain' | 'nodes' | 'buildings'>;

/** Topmost thing under a world-pixel point: buildings, then nodes (nearest to the viewer first), then the tile. */
export interface PickCitizen { id: string; x: number; y: number }

export function hitTest(m: MapLike, wx: number, wy: number, citizens: readonly PickCitizen[] = []): Hit | null {
  if (wx < 0 || wy < 0 || wx >= m.w * TILE || wy >= m.h * TILE) return null;
  // people first: nearest to the viewer (largest y) wins; the box is generous around a 32x48 sprite
  let who: PickCitizen | null = null;
  for (const c of citizens) {
    const cx = c.x * TILE + TILE / 2;
    const feet = (c.y + 1) * TILE;
    if (wx >= cx - 14 && wx <= cx + 14 && wy >= feet - 46 && wy <= feet + 4 && (!who || c.y > who.y)) who = c;
  }
  if (who) return { type: 'citizen', id: who.id };
  for (const b of m.buildings) {
    const r = buildingRect(b);
    if (wx >= r.l && wx <= r.r && wy >= r.t && wy <= r.b) return { type: 'building', building: b };
  }
  let best: ResourceNode | null = null;
  for (const nd of m.nodes) {
    const r = nodeRect(nd);
    if (wx >= r.l && wx <= r.r && wy >= r.t && wy <= r.b && (!best || nd.y > best.y)) best = nd;
  }
  if (best) return { type: 'node', node: best };
  const x = Math.floor(wx / TILE);
  const y = Math.floor(wy / TILE);
  return { type: 'tile', x, y, terrain: m.terrain[y * m.w + x] };
}
