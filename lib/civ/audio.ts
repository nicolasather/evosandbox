import type { AudioPrefs } from './uiPrefs';
import type { EventKind } from './types';

/* Audio (master design section 45): original, synthesised tones only (no samples, no copyrighted music),
   quiet confirmations, never a constant reward sound, separate master / effects / ambience volumes and a mute.
   Sound is OFF until the player turns it on (browsers also require a gesture). The pure parts are tested; the
   Web Audio part is a thin wrapper that does nothing when the API is missing. */

export type SoundId = 'discovery' | 'built' | 'hint' | 'warning' | 'trade' | 'arrival' | 'explore';

/** Which events make a sound. Duplicate discoveries never reach here because the bridge records each once. */
export function soundForEvent(kind: EventKind): SoundId | null {
  switch (kind) {
    case 'discovery': return 'discovery';
    case 'building_done': return 'built';
    case 'hint': return 'hint';
    case 'shortage': case 'hazard': return 'warning';
    case 'trade': return 'trade';
    case 'arrival': case 'birth': return 'arrival';
    case 'explore': return 'explore';
    default: return null;
  }
}

/** Effective gain for a bus: muted is silence, otherwise master x bus. */
export function gainFor(a: AudioPrefs, bus: 'effects' | 'ambience'): number {
  return a.muted ? 0 : Math.min(1, Math.max(0, a.master * a[bus]));
}

const TONES: Record<SoundId, { f: number[]; d: number }> = {
  discovery: { f: [523, 659, 784], d: 0.16 }, built: { f: [196, 262], d: 0.14 }, hint: { f: [440], d: 0.1 },
  warning: { f: [247, 220], d: 0.22 }, trade: { f: [392, 330], d: 0.1 }, arrival: { f: [330, 392], d: 0.12 }, explore: { f: [294, 349], d: 0.12 },
};

/** Never play the same sound twice within this window, so bursts of events cannot become noise. */
export const MIN_GAP_MS = 400;

export class CivAudio {
  private ctx: AudioContext | null = null;
  private last = new Map<SoundId, number>();
  private amb: { src: AudioBufferSourceNode; gain: GainNode } | null = null;
  prefs: AudioPrefs;

  constructor(prefs: AudioPrefs) { this.prefs = prefs; }

  setPrefs(p: AudioPrefs) {
    this.prefs = p;
    if (this.amb) this.amb.gain.gain.value = gainFor(p, 'ambience') * 0.08;
    if (p.muted) this.stopAmbience(); else this.startAmbience();
  }

  private ensure(): AudioContext | null {
    if (this.ctx) return this.ctx;
    const C = typeof window !== 'undefined' ? (window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext) : undefined;
    if (!C) return null;
    try { this.ctx = new C(); } catch { this.ctx = null; }
    return this.ctx;
  }

  play(id: SoundId, now = Date.now()) {
    const g = gainFor(this.prefs, 'effects');
    if (g <= 0) return false;
    const prev = this.last.get(id) ?? -Infinity;
    if (now - prev < MIN_GAP_MS) return false;
    this.last.set(id, now);
    const ctx = this.ensure();
    if (!ctx) return false;
    const t = TONES[id];
    let at = ctx.currentTime;
    for (const f of t.f) {
      const o = ctx.createOscillator(); const e = ctx.createGain();
      o.type = 'sine'; o.frequency.value = f;
      e.gain.setValueAtTime(0.0001, at); e.gain.exponentialRampToValueAtTime(Math.max(0.0002, g * 0.15), at + 0.02); e.gain.exponentialRampToValueAtTime(0.0001, at + t.d);
      o.connect(e).connect(ctx.destination); o.start(at); o.stop(at + t.d + 0.02);
      at += t.d * 0.8;
    }
    return true;
  }

  startAmbience() {
    if (this.amb || gainFor(this.prefs, 'ambience') <= 0) return;
    const ctx = this.ensure();
    if (!ctx) return;
    const buf = ctx.createBuffer(1, ctx.sampleRate * 2, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * 0.5;
    const src = ctx.createBufferSource(); src.buffer = buf; src.loop = true;
    const lp = ctx.createBiquadFilter(); lp.type = 'lowpass'; lp.frequency.value = 500;
    const gain = ctx.createGain(); gain.gain.value = gainFor(this.prefs, 'ambience') * 0.08;
    src.connect(lp).connect(gain).connect(ctx.destination); src.start();
    this.amb = { src, gain };
  }

  stopAmbience() { try { this.amb?.src.stop(); } catch { /* already stopped */ } this.amb = null; }
}
