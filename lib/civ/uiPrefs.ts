/* Per-device display and audio preferences for the settlement (master design sections 8.4, 15, 45).
   They live under their own key and never touch simulation state. Out-of-range or unknown values fall back to defaults. */

export const UI_PREFS_KEY = 'evo.civworld.ui.v1';

export type Quality = 'low' | 'medium' | 'high';
export type HintMode = 'bubbles' | 'compact' | 'off';

export interface AudioPrefs { master: number; effects: number; ambience: number; muted: boolean }
export interface UiPrefs { quality: Quality; uiScale: number; compact: boolean; hints: HintMode; reduceMotion: boolean; overlays: boolean; audio: AudioPrefs }

export const DEFAULT_UI: UiPrefs = {
  quality: 'high', uiScale: 1, compact: false, hints: 'bubbles', reduceMotion: false, overlays: false,
  audio: { master: 0.6, effects: 0.8, ambience: 0.4, muted: true }, // muted until the player turns sound on
};

export const UI_SCALES = [0.9, 1, 1.15, 1.3] as const;

const clamp01 = (n: unknown, d: number) => (typeof n === 'number' && Number.isFinite(n) ? Math.min(1, Math.max(0, n)) : d);
const isObj = (x: unknown): x is Record<string, unknown> => typeof x === 'object' && x !== null && !Array.isArray(x);

export function parseUiPrefs(raw: string | null | undefined): UiPrefs {
  if (!raw) return JSON.parse(JSON.stringify(DEFAULT_UI)) as UiPrefs;
  try {
    const o = JSON.parse(raw) as unknown;
    if (!isObj(o)) return JSON.parse(JSON.stringify(DEFAULT_UI)) as UiPrefs;
    const a = isObj(o.audio) ? o.audio : {};
    return {
      quality: o.quality === 'low' || o.quality === 'medium' || o.quality === 'high' ? o.quality : DEFAULT_UI.quality,
      uiScale: (UI_SCALES as readonly number[]).includes(o.uiScale as number) ? (o.uiScale as number) : 1,
      compact: o.compact === true,
      hints: o.hints === 'compact' || o.hints === 'off' || o.hints === 'bubbles' ? o.hints : 'bubbles',
      reduceMotion: o.reduceMotion === true,
      overlays: o.overlays === true,
      audio: {
        master: clamp01(a.master, DEFAULT_UI.audio.master), effects: clamp01(a.effects, DEFAULT_UI.audio.effects),
        ambience: clamp01(a.ambience, DEFAULT_UI.audio.ambience), muted: a.muted === false ? false : true,
      },
    };
  } catch {
    return JSON.parse(JSON.stringify(DEFAULT_UI)) as UiPrefs;
  }
}

export const serializeUiPrefs = (p: UiPrefs) => JSON.stringify(p);

/** What each quality tier draws (master design section 15). */
export function qualityFlags(q: Quality) {
  return { waterAndFoam: q !== 'low', smoke: q !== 'low', dust: q !== 'low', wind: q === 'high', wildlife: q === 'high', birds: q === 'high', rain: q !== 'low', maxFps: q === 'low' ? 20 : 60 };
}

/** Animation runs only if neither the system setting nor the player's own setting asks for reduced motion. */
export const animationOn = (systemReduced: boolean, p: UiPrefs) => !systemReduced && !p.reduceMotion;
