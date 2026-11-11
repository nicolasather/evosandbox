/* The crew lives on the edge of the screen: it walks the rectangle's perimeter, feet against the border. One number, `s`
   (px along the loop), says where a creature is; this file turns it into a position and a tilt, and builds the keyframes
   for gliding from one `s` to another. Pure maths, no DOM, so it can be tested.
   Coordinates are viewport px, box top-left. */

export type Edge = 'bottom' | 'right' | 'top' | 'left';

export interface Geo {
  /** viewport size */
  W: number;
  H: number;
  /** creature box size, and how far past the screen's border the box reaches (its feet are right on the border) */
  S: number;
  out: number;
  /** the box's top-left can be anywhere in [x0, x1] x [y0, y1] */
  x0: number; x1: number; y0: number; y1: number;
  /** length of the bottom and top runs, and of the two side runs */
  A: number;
  V: number;
  /** whole loop */
  P: number;
}

export const makeGeo = (W: number, H: number, S: number, out = 0): Geo => {
  const x0 = 0 - out + 0, x1 = Math.max(x0 + 1, W - S + out), y0 = 0 - out + 0, y1 = Math.max(y0 + 1, H - S + out);
  const A = x1 - x0, V = y1 - y0;
  return { W, H, S, out, x0, x1, y0, y1, A, V, P: 2 * A + 2 * V };
};

/** where a point `s` along the loop is (box top-left, viewport px) and which edge it is on. The loop is unbounded: s wraps. */
export function pointAt(g: Geo, s: number): { x: number; y: number; edge: Edge } {
  const u = ((s % g.P) + g.P) % g.P;
  if (u < g.A) return { x: g.x0 + u, y: g.y1, edge: 'bottom' };
  if (u < g.A + g.V) return { x: g.x1, y: g.y1 - (u - g.A), edge: 'right' };
  if (u < 2 * g.A + g.V) return { x: g.x1 - (u - g.A - g.V), y: g.y0, edge: 'top' };
  return { x: g.x0, y: g.y0 + (u - 2 * g.A - g.V), edge: 'left' };
}

export const edgeAt = (g: Geo, s: number): Edge => pointAt(g, s).edge;

/** the tilt (deg, CSS clockwise) a creature rests at on each edge: feet toward the border */
export const REST_ROT: Record<Edge, number> = { bottom: 0, right: -90, top: -180, left: -270 };

const clamp01 = (v: number) => (v < 0 ? 0 : v > 1 ? 1 : v);

/** the corners of one lap, as offsets along the loop */
const corners = (g: Geo): number[] => [g.A, g.A + g.V, 2 * g.A + g.V, g.P];

/** How far (deg) the creature has turned going from s0 to s: -90 for every corner it rounds, eased over a window of `c` px each side. */
export function rotDelta(g: Geo, s0: number, s: number, c = g.S * 0.5): number {
  const lo = Math.min(s0, s) - c, hi = Math.max(s0, s) + c;
  let acc = 0;
  for (let q = Math.floor(lo / g.P) - 1; q <= Math.ceil(hi / g.P) + 1; q++) {
    for (const cp of corners(g)) {
      const p = q * g.P + cp;
      if (p + c < lo || p - c > hi) continue;
      acc += clamp01((s - (p - c)) / (2 * c)) - clamp01((s0 - (p - c)) / (2 * c));
    }
  }
  return -90 * acc;
}

/** The tilt a creature has when it is simply standing at s (partly turned if it is mid-corner): measured from the middle of the floor, where it is upright. */
export function restRot(g: Geo, s: number): number {
  const ref = Math.floor(s / g.P) * g.P + g.A / 2;
  return rotDelta(g, ref, s);
}

export interface PathPoint { offset: number; x: number; y: number; rot: number }

/** Keyframes for gliding along the loop from s0 to s1: a point at each end and three at every corner crossed (before, at, after),
 *  so the creature runs straight along each edge and pivots smoothly round each corner. */
export function glidePath(g: Geo, s0: number, s1: number, rot0: number, c = g.S * 0.5): PathPoint[] {
  const span = s1 - s0;
  if (Math.abs(span) < 0.5) { const p = pointAt(g, s0); return [{ offset: 0, ...p, rot: rot0 }, { offset: 1, ...p, rot: rot0 }]; }
  const lo = Math.min(s0, s1), hi = Math.max(s0, s1);
  const marks = new Set<number>([s0, s1]);
  for (let q = Math.floor(lo / g.P) - 1; q <= Math.ceil(hi / g.P) + 1; q++) {
    for (const cp of corners(g)) {
      const p = q * g.P + cp;
      for (const m of [p - c, p, p + c]) if (m > lo && m < hi) marks.add(m);
    }
  }
  const ordered = [...marks].sort((a, b) => (span > 0 ? a - b : b - a));
  return ordered.map(s => {
    const p = pointAt(g, s);
    return { offset: Math.max(0, Math.min(1, (s - s0) / span)), x: p.x, y: p.y, rot: rot0 + rotDelta(g, s0, s, c) };
  });
}

/** Fold a position back into one lap and the tilt into (-180, 180], without changing where or how it appears. */
export function normalise(g: Geo, s: number, rot: number): { s: number; rot: number } {
  return { s: ((s % g.P) + g.P) % g.P, rot: rot - 360 * Math.round(rot / 360) };
}

/** The point on the loop nearest to a viewport (x, y) box position, as the `s` closest to `near` (so it never jumps a lap). */
export function sFromPoint(g: Geo, x: number, y: number, near: number): number {
  const segs: { d: number; u: number }[] = [];
  const cx = Math.max(g.x0, Math.min(g.x1, x));
  segs.push({ d: Math.hypot(x - cx, y - g.y1), u: cx - g.x0 });
  const ry = Math.max(g.y0, Math.min(g.y1, y));
  segs.push({ d: Math.hypot(x - g.x1, y - ry), u: g.A + (g.y1 - ry) });
  segs.push({ d: Math.hypot(x - cx, y - g.y0), u: g.A + g.V + (g.x1 - cx) });
  segs.push({ d: Math.hypot(x - g.x0, y - ry), u: 2 * g.A + g.V + (ry - g.y0) });
  const best = segs.reduce((a, b) => (b.d < a.d ? b : a));
  return best.u + g.P * Math.round((near - best.u) / g.P);
}

/** The closest `s` to `near` that sits at horizontal position x on the bottom edge (for walking to a thing on the ground). */
export function bottomS(g: Geo, x: number, near: number): number {
  const u = Math.max(0, Math.min(g.A, x - g.x0));
  return u + g.P * Math.round((near - u) / g.P);
}
