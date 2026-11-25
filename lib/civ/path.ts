/* Grid pathfinding for citizens. Uniform-cost BFS on a 4-connected tile grid: the map is
   small and the answers must be deterministic, so no heuristics and no randomness. */

export interface Grid { w: number; h: number; blocked: Uint8Array }

export const idx = (g: Grid, x: number, y: number) => y * g.w + x;
export const inBounds = (g: Grid, x: number, y: number) => x >= 0 && y >= 0 && x < g.w && y < g.h;
export const open = (g: Grid, x: number, y: number) => inBounds(g, x, y) && g.blocked[idx(g, x, y)] === 0;

const DIRS: [number, number][] = [[1, 0], [-1, 0], [0, 1], [0, -1]];

export interface Reach { dist: Int32Array; from: Int32Array }

/** Distance field from a start tile (-1 = unreachable). The start is always treated as open so a citizen standing on a blocked tile can leave it. */
export function reachFrom(g: Grid, sx: number, sy: number): Reach {
  const dist = new Int32Array(g.w * g.h).fill(-1);
  const from = new Int32Array(g.w * g.h).fill(-1);
  const q: number[] = [];
  const s = idx(g, sx, sy);
  dist[s] = 0;
  q.push(s);
  for (let i = 0; i < q.length; i++) {
    const cur = q[i];
    const cx = cur % g.w;
    const cy = (cur - cx) / g.w;
    for (const [dx, dy] of DIRS) {
      const nx = cx + dx;
      const ny = cy + dy;
      if (!open(g, nx, ny)) continue;
      const n = idx(g, nx, ny);
      if (dist[n] !== -1) continue;
      dist[n] = dist[cur] + 1;
      from[n] = cur;
      q.push(n);
    }
  }
  return { dist, from };
}

/** The reachable tile with the smallest distance among `goals`, or null. */
export function nearestOf(g: Grid, r: Reach, goals: readonly [number, number][]): { x: number; y: number; d: number } | null {
  let best: { x: number; y: number; d: number } | null = null;
  for (const [x, y] of goals) {
    if (!inBounds(g, x, y)) continue;
    const d = r.dist[idx(g, x, y)];
    if (d >= 0 && (!best || d < best.d)) best = { x, y, d };
  }
  return best;
}

/** Walk the `from` links back to the start; returns tiles after the start up to and including the target. */
export function pathTo(g: Grid, r: Reach, tx: number, ty: number): [number, number][] {
  const out: [number, number][] = [];
  let cur = idx(g, tx, ty);
  if (r.dist[cur] < 0) return out;
  while (r.from[cur] !== -1) {
    out.push([cur % g.w, Math.floor(cur / g.w)]);
    cur = r.from[cur];
  }
  return out.reverse();
}

/** Tiles around a rectangle from which something on it can be reached (4-neighbour ring). */
export function ringAround(g: Grid, x: number, y: number, w: number, h: number): [number, number][] {
  const out: [number, number][] = [];
  for (let i = -1; i <= w; i++) for (let j = -1; j <= h; j++) {
    const inside = i >= 0 && i < w && j >= 0 && j < h;
    const corner = (i === -1 || i === w) && (j === -1 || j === h);
    if (inside || corner) continue;
    if (inBounds(g, x + i, y + j)) out.push([x + i, y + j]);
  }
  return out;
}
