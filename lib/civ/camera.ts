/* Camera maths for the settlement viewport. Pure, so pan/zoom/clamp can be unit-tested. */

export interface Camera {
  /** World-pixel coordinate shown at the viewport centre. */
  cx: number;
  cy: number;
  /** Integer-friendly scale: screen pixels per world pixel. */
  zoom: number;
}

export const ZOOM_MIN = 1;
export const ZOOM_MAX = 4;

export const clampZoom = (z: number): number => Math.min(ZOOM_MAX, Math.max(ZOOM_MIN, Math.round(z * 4) / 4));

export interface Size { w: number; h: number }

/** Keep the view over the map: if the map is smaller than the viewport it is centred, otherwise the edge cannot leave the screen. */
export function clampCamera(c: Camera, view: Size, map: Size): Camera {
  const halfW = view.w / c.zoom / 2;
  const halfH = view.h / c.zoom / 2;
  const fix = (v: number, half: number, size: number) => (half * 2 >= size ? size / 2 : Math.min(size - half, Math.max(half, v)));
  return { zoom: c.zoom, cx: fix(c.cx, halfW, map.w), cy: fix(c.cy, halfH, map.h) };
}

export const screenToWorld = (c: Camera, view: Size, sx: number, sy: number) => ({
  x: c.cx + (sx - view.w / 2) / c.zoom,
  y: c.cy + (sy - view.h / 2) / c.zoom,
});

/** Zoom so the world point under (sx, sy) stays under the cursor. */
export function zoomAt(c: Camera, view: Size, map: Size, nextZoom: number, sx: number, sy: number): Camera {
  const z = clampZoom(nextZoom);
  if (z === c.zoom) return c;
  const before = screenToWorld(c, view, sx, sy);
  const moved = { zoom: z, cx: before.x - (sx - view.w / 2) / z, cy: before.y - (sy - view.h / 2) / z };
  return clampCamera(moved, view, map);
}

/** The recentre target: the map point of interest at a comfortable zoom. */
export const recenter = (focus: { x: number; y: number }, zoom: number, view: Size, map: Size): Camera =>
  clampCamera({ cx: focus.x, cy: focus.y, zoom: clampZoom(zoom) }, view, map);

/** Tile rectangle on screen (with a margin for tall sprites): everything outside it is never drawn (offscreen culling). */
export function visibleTiles(c: Camera, view: Size, tile: number, margin = 2) {
  return {
    x0: Math.floor((c.cx - view.w / c.zoom / 2) / tile) - margin,
    x1: Math.ceil((c.cx + view.w / c.zoom / 2) / tile) + margin,
    y0: Math.floor((c.cy - view.h / c.zoom / 2) / tile) - margin,
    y1: Math.ceil((c.cy + view.h / c.zoom / 2) / tile) + margin + 1,
  };
}
