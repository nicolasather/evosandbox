import { bottomS, edgeAt, glidePath, makeGeo, normalise, pointAt, REST_ROT, restRot, rotDelta, sFromPoint } from '../perimeter';

const g = makeGeo(1000, 700, 100, 0); // A = 900, V = 600, P = 3000

describe('the border the crew walks', () => {
  it('can hang a little past the screen edge, feet on the border', () => {
    const h = makeGeo(1000, 700, 60, 4);
    expect(pointAt(h, 0)).toMatchObject({ x: -4, y: 644, edge: 'bottom' });
    expect(pointAt(h, h.A)).toMatchObject({ x: 944, edge: 'right' });
    expect(bottomS(h, 500, 0)).toBe(504);
    expect(h.P).toBe(2 * h.A + 2 * h.V);
  });
  it('is one closed loop: floor, up the right, along the top, down the left', () => {
    expect(g.P).toBe(3000);
    expect(pointAt(g, 0)).toMatchObject({ x: 0, y: 600, edge: 'bottom' });
    expect(pointAt(g, 900)).toMatchObject({ x: 900, y: 600, edge: 'right' });
    expect(pointAt(g, 1500)).toMatchObject({ x: 900, y: 0, edge: 'top' });
    expect(pointAt(g, 2400)).toMatchObject({ x: 0, y: 0, edge: 'left' });
    expect(pointAt(g, 3000)).toEqual(pointAt(g, 0));
    expect(pointAt(g, -1)).toEqual(pointAt(g, 2999));
  });
  it('never jumps: a step of one px moves it by about one px, everywhere, including the corners', () => {
    for (let s = -3100; s < 6200; s += 1) {
      const a = pointAt(g, s), b = pointAt(g, s + 1);
      expect(Math.hypot(a.x - b.x, a.y - b.y)).toBeLessThanOrEqual(1.0001);
    }
  });
  it('turns the creature a quarter for every corner it rounds, in either direction', () => {
    expect(rotDelta(g, 100, 1000)).toBeCloseTo(-90, 5);
    expect(rotDelta(g, 100, 1600)).toBeCloseTo(-180, 5);
    expect(rotDelta(g, 1000, 100)).toBeCloseTo(90, 5);
    expect(rotDelta(g, 100, 3000 + 1000)).toBeCloseTo(-450, 5);
    // standing anywhere, the tilt is a function of the place alone, so any route to a place ends at the same tilt
    for (const s of [10, 880, 905, 1100, 1480, 1700, 2380, 2500, 2990]) expect((((restRot(g, s) - restRot(g, s + 3000)) % 360) + 360 + 1e-6) % 360).toBeLessThan(1e-3);
    expect(restRot(g, 450)).toBeCloseTo(0, 5);
    expect(restRot(g, 1200)).toBeCloseTo(-90, 5);
    expect(restRot(g, 2700)).toBeCloseTo(-270, 5);
    expect(rotDelta(g, 100, 800)).toBeCloseTo(0, 5);
    expect(REST_ROT[edgeAt(g, 1000)]).toBe(-90);
  });
  it('a glide is a smooth ordered path whose turn is eased over each corner', () => {
    for (const [a, b] of [[100, 2000], [2900, 500], [1400, 200], [0, 3200]]) {
      const path = glidePath(g, a, b, 0);
      expect(path[0].offset).toBe(0);
      expect(path[path.length - 1].offset).toBe(1);
      for (let i = 1; i < path.length; i++) {
        expect(path[i].offset).toBeGreaterThanOrEqual(path[i - 1].offset);
        // no frame-to-frame leap in place or in tilt: that is what a "teleport" would be
        const run = Math.abs(path[i].offset - path[i - 1].offset) * Math.abs(b - a);
        expect(Math.hypot(path[i].x - path[i - 1].x, path[i].y - path[i - 1].y)).toBeLessThanOrEqual(run + 0.5);
        expect(Math.abs(path[i].rot - path[i - 1].rot)).toBeLessThanOrEqual(90.0001);
      }
    }
  });
  it('folds a position back into one lap without moving it', () => {
    const n = normalise(g, 4500, -450);
    expect(n.s).toBe(1500);
    expect(n.rot).toBeCloseTo(-90, 5);
    expect(pointAt(g, n.s)).toEqual(pointAt(g, 4500));
  });
  it('finds where on the border a point is, and never a lap away from where it was', () => {
    for (const s of [10, 450, 905, 1300, 1999, 2500, 2990]) {
      const p = pointAt(g, s);
      expect(sFromPoint(g, p.x, p.y, s)).toBeCloseTo(s, 5);
      expect(sFromPoint(g, p.x, p.y, s + 3000)).toBeCloseTo(s + 3000, 5);
    }
    expect(bottomS(g, 400, 3100)).toBe(3400);
    expect(bottomS(g, 5000, 10)).toBe(900);
  });
});
