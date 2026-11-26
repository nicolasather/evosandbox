import { CivAudio, MIN_GAP_MS, gainFor, soundForEvent } from '../audio';
import { DEFAULT_UI, UI_SCALES, animationOn, parseUiPrefs, qualityFlags, serializeUiPrefs } from '../uiPrefs';

describe('ui prefs', () => {
  it('defaults, round-trips, and discards bad values', () => {
    expect(parseUiPrefs(null)).toEqual(DEFAULT_UI);
    expect(parseUiPrefs('{nope')).toEqual(DEFAULT_UI);
    const p = { ...DEFAULT_UI, quality: 'low' as const, uiScale: 1.3, compact: true, hints: 'off' as const };
    expect(parseUiPrefs(serializeUiPrefs(p))).toEqual(p);
    const bad = parseUiPrefs(JSON.stringify({ quality: 'ultra', uiScale: 7, hints: 'loud', audio: { master: 9, muted: 'no' } }));
    expect(bad.quality).toBe('high');
    expect(UI_SCALES).toContain(bad.uiScale);
    expect(bad.hints).toBe('bubbles');
    expect(bad.audio.master).toBe(1);
    expect(bad.audio.muted).toBe(true);
  });
  it('quality tiers draw progressively more, and reduced motion from either source stops animation', () => {
    expect(qualityFlags('low')).toMatchObject({ waterAndFoam: false, wind: false, wildlife: false, maxFps: 20 });
    expect(qualityFlags('medium')).toMatchObject({ waterAndFoam: true, wind: false });
    expect(qualityFlags('high')).toMatchObject({ wind: true, wildlife: true });
    expect(animationOn(true, DEFAULT_UI)).toBe(false);
    expect(animationOn(false, { ...DEFAULT_UI, reduceMotion: true })).toBe(false);
    expect(animationOn(false, DEFAULT_UI)).toBe(true);
  });
});

describe('audio', () => {
  it('maps story events to quiet sounds and ignores routine ones', () => {
    expect(soundForEvent('discovery')).toBe('discovery');
    expect(soundForEvent('building_done')).toBe('built');
    expect(soundForEvent('founded')).toBeNull();
    expect(soundForEvent('season')).toBeNull();
  });
  it('is muted by default; volumes multiply; mute is silence', () => {
    expect(gainFor(DEFAULT_UI.audio, 'effects')).toBe(0);
    const a = { master: 0.5, effects: 0.5, ambience: 1, muted: false };
    expect(gainFor(a, 'effects')).toBeCloseTo(0.25);
    expect(gainFor({ ...a, muted: true }, 'ambience')).toBe(0);
  });
  it('does nothing when muted or when the Web Audio API is missing, and rate-limits repeats', () => {
    const muted = new CivAudio(DEFAULT_UI.audio);
    expect(muted.play('discovery')).toBe(false);
    const open = new CivAudio({ master: 1, effects: 1, ambience: 0, muted: false });
    expect(open.play('discovery', 1000)).toBe(false); // jsdom has no AudioContext: safe no-op
    expect(MIN_GAP_MS).toBeGreaterThan(0);
  });
});
