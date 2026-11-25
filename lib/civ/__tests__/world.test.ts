import { TILE, createWorld, hitTest, isLand, tileAt } from '../world';
import { clampCamera, clampZoom, screenToWorld, zoomAt } from '../camera';

describe('civ world', () => {
  it('is deterministic for a seed and differs across seeds', () => {
    expect(createWorld(7)).toEqual(createWorld(7));
    expect(createWorld(7).nodes).not.toEqual(createWorld(8).nodes);
  });
  it('has water, land, resource nodes and a campfire, and never puts a node on water or the fire', () => {
    const m = createWorld(1);
    expect(m.terrain.includes('water')).toBe(true);
    expect(m.nodes.length).toBeGreaterThan(20);
    for (const n of m.nodes) {
      expect(isLand(m, n.x, n.y)).toBe(true);
      expect(n.x === m.buildings[0].x && n.y === m.buildings[0].y).toBe(false);
    }
    expect(tileAt(m, -1, 0)).toBeNull();
  });
  it('hit-tests buildings first, then taller sprites, then tiles, and misses outside the map', () => {
    const m = createWorld(1);
    const fire = m.buildings[0];
    const p = hitTest(m, fire.x * TILE + 16, fire.y * TILE + 16);
    expect(p?.type).toBe('building');
    const tree = m.nodes.find(n => n.kind === 'tree') as typeof m.nodes[number];
    // a point in the canopy, above the tile, still selects the tree
    const pt = hitTest(m, tree.x * TILE + 16, (tree.y + 1) * TILE - 50);
    expect(pt?.type === 'node' && pt.node.kind === 'tree').toBe(true);
    expect(hitTest(m, -5, 10)).toBeNull();
    const empty = hitTest(m, 0.5, (m.h - 1) * TILE + 0.5);
    expect(empty?.type).toBe('tile');
  });
});

describe('civ camera', () => {
  const view = { w: 800, h: 600 };
  const map = { w: 1280, h: 960 };
  it('clamps the camera over the map and centres a map smaller than the view', () => {
    const c = clampCamera({ cx: -500, cy: 5000, zoom: 2 }, view, map);
    expect(c.cx).toBe(200);
    expect(c.cy).toBe(960 - 150);
    expect(clampCamera({ cx: 0, cy: 0, zoom: 1 }, { w: 2000, h: 2000 }, map)).toEqual({ cx: 640, cy: 480, zoom: 1 });
  });
  it('keeps the point under the cursor fixed while zooming', () => {
    const c = { cx: 640, cy: 480, zoom: 1 };
    const before = screenToWorld(c, view, 300, 200);
    const z = zoomAt(c, view, map, 2, 300, 200);
    const after = screenToWorld(z, view, 300, 200);
    expect(after.x).toBeCloseTo(before.x, 5);
    expect(after.y).toBeCloseTo(before.y, 5);
  });
  it('clamps zoom to its range', () => {
    expect(clampZoom(99)).toBe(4);
    expect(clampZoom(0)).toBe(1);
  });
});
