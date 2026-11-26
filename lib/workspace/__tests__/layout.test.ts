import { DEFAULT_PREFS, SPLIT_MAX, SPLIT_MIN, clampSplit, paneRects, parsePrefs, serializePrefs, tabOf } from '../layout';

describe('workspace layout prefs', () => {
  it('falls back to defaults for missing, corrupt or wrong-typed storage', () => {
    expect(parsePrefs(null)).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('{nope')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs('42')).toEqual(DEFAULT_PREFS);
    expect(parsePrefs(JSON.stringify({ layout: 'sideways', splitPct: 'wide' }))).toEqual(DEFAULT_PREFS);
  });
  it('clamps an out-of-range split and ignores unknown fields', () => {
    expect(parsePrefs(JSON.stringify({ layout: 'split', splitPct: 5, extra: 1 }))).toEqual({ layout: 'split', splitPct: SPLIT_MIN });
    expect(clampSplit(999)).toBe(SPLIT_MAX);
    expect(clampSplit(Number.NaN)).toBe(DEFAULT_PREFS.splitPct);
  });
  it('round-trips', () => {
    const p = { layout: 'merge' as const, splitPct: 55 };
    expect(parsePrefs(serializePrefs(p))).toEqual(p);
  });
  it('maps layouts to tabs and rectangles', () => {
    expect(tabOf('civ')).toBe('civilization');
    expect(tabOf('split')).toBe('civilization');
    expect(tabOf('merge')).toBe('merging');
    const s = paneRects({ layout: 'split', splitPct: 40 });
    expect(s.civ.size + s.merge.size).toBe(100);
    expect(s.merge.start).toBe(60);
    expect(paneRects({ layout: 'civ', splitPct: 40 }).merge.visible).toBe(false);
    expect(paneRects({ layout: 'dock', splitPct: 40 }).civ.visible).toBe(true);
    expect(paneRects({ layout: 'dock', splitPct: 40 }).merge.visible).toBe(true);
    expect(paneRects({ layout: 'overlay', splitPct: 40 }).civ.visible).toBe(true);
    expect(parsePrefs(JSON.stringify({ layout: 'overlay', splitPct: 40 })).layout).toBe('overlay');
    expect(paneRects({ layout: 'merge', splitPct: 40 }).civ.visible).toBe(false);
  });
});
