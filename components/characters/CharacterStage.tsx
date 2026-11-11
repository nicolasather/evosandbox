'use client';
import { useCallback, useEffect, useRef, useState, useSyncExternalStore } from 'react';
import { useHasMounted } from '@/lib/useHasMounted';
import { CharacterRig } from './CharacterRig';
import { CharacterDisclosure, CharacterSettings } from './CharacterSettings';
import { CharacterPrankTag, CharacterSpeechBubble } from './CharacterSpeechBubble';
import { CharacterUnlockCeremony } from './CharacterUnlockCeremony';
import { actionRegistry } from '@/lib/characters/actions';
import { playClip, type Playing } from '@/lib/characters/animator';
import { attachRetentionBridge } from '@/lib/characters/bridge';
import { characterBus, emitCrew, provideCrewContext, setCrewMode } from '@/lib/characters/bus';
import { getClip } from '@/lib/characters/clips';
import { CrewDirector, type Performance } from '@/lib/characters/director';
import { crewProgress } from '@/lib/characters/progress';
import { CHARACTERS, CREW } from '@/lib/characters/registry';
import type { ShownLine } from '@/lib/characters/speech';
import { crewStore } from '@/lib/characters/store';
import { CHARACTER_IDS, PRIORITY_RANK, type CharacterId, type CharacterMode, type Priority } from '@/lib/characters/types';
import { benchElement } from '@/lib/craft/bus';

/* ============================================================================
   THE CREW STAGE — mounted ONCE, from AppRoot, so it survives every mode swap.
   It owns the single scheduler tick, the clip playback and the only speech bubble.
   The lane never takes the pointer; only the small hit button around each creature does.
   ========================================================================== */

const EMOTES: { label: string; clip: string }[] = [
  { label: 'Cheer', clip: 'cheer-two-arm' }, { label: 'Wave', clip: 'guide-wave-over' }, { label: 'Think', clip: 'guide-think-pose' }, { label: 'Nap', clip: 'transform-sleep-mode' },
];

interface Slot { play: Playing; prio: Priority; solid: boolean }

const GIFT: Record<CharacterId, { clips: string[]; id: string; text: string }> = {
  kip: { clips: ['object-catch', 'item-hug', 'cheer-hop-clap'], id: 'kip.gift', text: 'For me? Thank you!' },
  vex: { clips: ['object-catch', 'item-hide-behind-back', 'prank-innocent-whistle'], id: 'vex.gift', text: 'Mine now. Thanks.' },
  orra: { clips: ['object-catch', 'object-inspect-close', 'cheer-two-arm'], id: 'orra.gift', text: 'How thoughtful. Noted.' },
};

const DEV = process.env.NEXT_PUBLIC_ENABLE_DEV_TOOLS === 'true' && process.env.NEXT_PUBLIC_DEPLOY_ENV !== 'production';

export function CharacterStage({ mode, gate }: { mode: CharacterMode; gate: boolean }) {
  const save = useSyncExternalStore(crewStore.subscribe, crewStore.get, crewStore.getServer);
  const mounted = useHasMounted();
  const [ready, setReady] = useState(mode !== 'main-evolution');
  const [line, setLine] = useState<ShownLine | null>(null);
  const [prankFor, setPrankFor] = useState<CharacterId | null>(null);
  const [appeared, setAppeared] = useState<Partial<Record<CharacterId, boolean>>>({ kip: true });
  const [ceremony, setCeremony] = useState<CharacterId | null>(null);
  const [panel, setPanel] = useState(false);
  const [ask, setAsk] = useState(false);
  const [tucked, setTucked] = useState(false);
  const [emote, setEmote] = useState<{ id: CharacterId; mode: CharacterMode } | null>(null);
  const emoteFor = emote && emote.mode === mode ? emote.id : null;
  const setEmoteFor = (id: CharacterId | null) => setEmote(id ? { id, mode } : null);
  const osReduced = useSyncExternalStore(
    cb => { const mq = window.matchMedia('(prefers-reduced-motion: reduce)'); mq.addEventListener('change', cb); return () => mq.removeEventListener('change', cb); },
    () => window.matchMedia('(prefers-reduced-motion: reduce)').matches, () => false);
  const [debugLog, setDebugLog] = useState<string[]>([]);

  const director = useRef<CrewDirector | null>(null);
  const actors = useRef<Partial<Record<CharacterId, HTMLElement | null>>>({});
  const pos = useRef<Record<CharacterId, number>>({ kip: 0, vex: 0, orra: 0 });
  const slots = useRef<Partial<Record<CharacterId, Slot>>>({});
  const idle = useRef<Partial<Record<CharacterId, Playing>>>({});
  const timers = useRef(new Set<number>());
  const pending = useRef<CharacterId[]>([]);
  const gateRef = useRef(gate);
  const modeRef = useRef(mode);
  const pointerDown = useRef(false);
  const reducedRef = useRef(false);
  const readyRef = useRef(false);
  const settingsBtn = useRef<HTMLButtonElement>(null);
  const clickTimer = useRef(0);
  const pressTimer = useRef(0);
  const pressed = useRef(false);
  const prankTimer = useRef(0);
  const held = useRef<Partial<Record<CharacterId, Playing>>>({});
  const ptr = useRef({ x: -1, y: -1 });
  const merging = useRef(false);
  const fleeAt = useRef<Partial<Record<CharacterId, number>>>({});
  const clicks = useRef<Partial<Record<CharacterId, number[]>>>({});
  const roaming = useRef<Partial<Record<CharacterId, boolean>>>({});
  const epoch = useRef(0);
  const dragItem = useRef(0);

  const reduced = osReduced || save.settings.reducedMotion;
  const size = () => (typeof window !== 'undefined' && window.innerWidth <= 720 ? 80 : 128);
  const amp = () => (typeof window !== 'undefined' && window.innerWidth <= 720 ? 0.65 : 1);

  /* a stable director, created on first use (not during render) */
  const dir = useCallback((): CrewDirector => {
    if (!director.current) director.current = new CrewDirector({ reducedMotion: () => reducedRef.current });
    return director.current;
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    const id = window.setTimeout(() => { timers.current.delete(id); fn(); }, ms);
    timers.current.add(id);
    return id;
  }, []);

  const rootOf = (c: CharacterId): HTMLElement | null => actors.current[c]?.querySelector<HTMLElement>('[data-joint="root"]') ?? null;

  const homeX = useCallback((c: CharacterId) => {
    const w = window.innerWidth, s = size();
    const i = CHARACTER_IDS.indexOf(c);
    return Math.max(4, w - 52 - (s + 6) * (i + 1));
  }, []);
  const place = useCallback((c: CharacterId, x: number) => {
    const w = window.innerWidth, s = size();
    const px = Math.max(4, Math.min(w - s - 4, x)); // the whole width of the screen is theirs
    pos.current[c] = px;
    const el = actors.current[c];
    if (el) el.style.left = `${px}px`;
  }, []);
  const face = useCallback((c: CharacterId, d: 1 | -1) => {
    actors.current[c]?.querySelector<HTMLElement>('.crew-flip')?.setAttribute('data-facing', d < 0 ? 'left' : 'right');
  }, []);

  /* ── playback ─────────────────────────────────────────────────── */

  const startIdle = useCallback((c: CharacterId) => {
    if (reducedRef.current || idle.current[c] || slots.current[c]) return;
    const clip = getClip('idle-breathe'); const el = rootOf(c);
    if (clip && el) idle.current[c] = playClip(el, clip, { char: c, unit: size(), amp: amp(), reduced: false });
  }, []);
  const stopIdle = useCallback((c: CharacterId) => { idle.current[c]?.cancel(); delete idle.current[c]; }, []);

  const cancelAll = useCallback(() => {
    epoch.current++; roaming.current = {};
    for (const t of timers.current) window.clearTimeout(t);
    timers.current.clear();
    for (const c of CHARACTER_IDS) { slots.current[c]?.play.cancel(); delete slots.current[c]; held.current[c]?.release(); delete held.current[c]; stopIdle(c); dir().clearPlaying(c); }
    dir().speech.clear();
  }, [dir, stopIdle]);

  /** Play one clip for one or more creatures on one shared timeline. Resolves when the lead's clip ends (or is cancelled). */
  const play = useCallback((cast: CharacterId[], clipId: string, prio: Priority, travelDir?: 1 | -1, hint?: 'toward-cursor' | 'away-cursor', quiet = false): Promise<'done' | 'cancelled' | 'skipped'> => {
    const clip = getClip(clipId);
    if (!clip || !readyRef.current) return Promise.resolve('skipped');
    for (const c of cast) {
      const cur = slots.current[c];
      if (cur && (PRIORITY_RANK[cur.prio] > PRIORITY_RANK[prio] || (cur.solid && PRIORITY_RANK[cur.prio] === PRIORITY_RANK[prio]))) return Promise.resolve('skipped');
    }
    let lead: Promise<'done' | 'cancelled'> = Promise.resolve('done');
    cast.forEach((c, role) => {
      slots.current[c]?.play.cancel(); stopIdle(c);
      held.current[c]?.release(); delete held.current[c];
      const el = rootOf(c);
      const w = window.innerWidth, s = size();
      const toCursor: 1 | -1 = ptr.current.x >= pos.current[c] + s / 2 ? 1 : -1;
      const edge: 1 | -1 = pos.current[c] > w - s - 70 ? -1 : pos.current[c] < 64 ? 1 : (Math.random() < 0.5 ? 1 : -1);
      const d: 1 | -1 = travelDir ?? (hint === 'toward-cursor' ? toCursor : hint === 'away-cursor' ? (toCursor === 1 ? -1 : 1) : edge);
      if (clip.travel) face(c, clip.travel * d >= 0 ? 1 : -1);
      const p = playClip(el, clip, {
        char: c, unit: size(), amp: amp(), role, dir: d, reduced: reducedRef.current,
        onTravel: dx => place(c, pos.current[c] + dx),
      });
      const slot: Slot = { play: p, prio, solid: !clip.interruptible };
      slots.current[c] = slot;
      if (!quiet) dir().markPlaying(c, clip.durationMs * CHARACTERS[c].retarget.speed); // running about is not "busy": the director may still cast them
      p.finished.then(() => { if (slots.current[c] === slot) { delete slots.current[c]; if (!quiet) dir().clearPlaying(c); if (clip.holdEnd) held.current[c] = p; else startIdle(c); } });
      if (role === 0) lead = p.finished;
    });
    return lead;
  }, [dir, face, place, startIdle, stopIdle]);

  const walkTo = useCallback(async (c: CharacterId, x: number) => {
    for (let i = 0; i < 12; i++) {
      const dx = x - pos.current[c];
      if (Math.abs(dx) < size() * 0.5) return;
      const r = await play([c], 'walk-hurry', 'normal', dx > 0 ? 1 : -1);
      if (r !== 'done') return;
    }
  }, [play]);

  /** The crew's default state: running about the whole screen, hopping, chasing each other, stopping only for a breather. */
  const wander = useCallback(async (c: CharacterId) => {
    if (roaming.current[c]) return;
    roaming.current[c] = true;
    const my = epoch.current;
    const RUN = ['walk-hurry', 'walk-hurry', 'walk-bouncy', 'walk-zigzag', 'jump-long', 'walk-hurry', 'walk-bouncy'];
    const BREATHER = ['jump-small', 'walk-stop-skid', 'recover-roll', 'cheer-two-arm', 'jump-sideflip', 'jump-spin', 'cheer-spin-burst'];
    const free = () => {
      const d = dir();
      return my === epoch.current && readyRef.current && !reducedRef.current && !merging.current && d.safe() && d.active().includes(c) && crewStore.get().settings.ambientSkits && !gateRef.current;
    };
    try {
      for (let trip = 0; trip < 40 && free(); trip++) {
        const w = window.innerWidth, s = size(), h = window.innerHeight;
        const others = CHARACTER_IDS.filter(o => o !== c && actors.current[o]);
        let target = 4 + Math.random() * Math.max(1, w - s - 8);
        if (others.length && Math.random() < 0.3) target = pos.current[others[Math.floor(Math.random() * others.length)]] + (Math.random() < 0.5 ? -s * 0.8 : s * 0.8); // chase someone
        if (Math.abs(target - pos.current[c]) < s * 1.2) target = pos.current[c] + (pos.current[c] > w / 2 ? -1 : 1) * (s * 2 + Math.random() * w * 0.25);
        const el = actors.current[c];
        if (el) el.style.bottom = `${Math.round(Math.random() * Math.min(h * 0.32, 240))}px`; // up and down the screen too, not only along the floor
        for (let i = 0; i < 14 && Math.abs(target - pos.current[c]) > s * 0.45; i++) {
          if (!free() || slots.current[c]) return;
          const r = await play([c], RUN[Math.floor(Math.random() * RUN.length)], 'ambient', target > pos.current[c] ? 1 : -1, undefined, true);
          if (r !== 'done') return;
        }
        if (!free() || slots.current[c]) return;
        if (Math.random() < 0.65) {
          const r = await play([c], BREATHER[Math.floor(Math.random() * BREATHER.length)], 'ambient', undefined, undefined, true);
          if (r !== 'done') return;
        } else await new Promise<void>(res => window.setTimeout(res, 200 + Math.random() * 500));
      }
    } finally { if (my === epoch.current) roaming.current[c] = false; }
  }, [dir, play]);

  /** Someone gave one of them something (an inventory item or a bench piece dropped on them): they catch it, react, and the others come running. */
  const receive = useCallback((c: CharacterId) => {
    const d = dir();
    if (!readyRef.current || !d.active().includes(c)) return;
    const g = GIFT[c];
    d.speech.offer({ speakerId: c, lineId: g.id, text: g.text, priority: 'major', expiresAt: Date.now() + 3000, voiceCueId: `vc.${c}.${g.id}` }, true);
    void (async () => { for (const id of g.clips) { if (await play([c], id, 'major') !== 'done') break; } })();
    for (const o of d.active().filter(x => x !== c)) {
      void (async () => { await walkTo(o, pos.current[c] + (pos.current[o] > pos.current[c] ? 1 : -1) * size() * 0.9); void play([o], 'emotion-curious', 'normal'); })();
    }
  }, [dir, play, walkTo]);
  const giveAt = useCallback((x: number, y: number) => {
    for (const c of CHARACTER_IDS) {
      const r = actors.current[c]?.getBoundingClientRect(); if (!r || !r.width) continue;
      if (x >= r.left - 18 && x <= r.right + 18 && y >= r.top - 18 && y <= r.bottom + 18) { receive(c); return; }
    }
  }, [receive]);

  /** A real, opt-in bench turn: plan (validate), walk, pick up, carry, then ask the Workbench to combine through its normal path. */
  const runMerge = useCallback(async (p: Performance) => {
    const c = p.characterId;
    const plan = await actionRegistry.run(p.mode, 'bench.tryRandomMerge', { phase: 'plan' });
    if (!plan.ok) return; // nothing legal / not safe: skip, no nagging
    merging.current = true;
    try {
    const inv = document.getElementById('inv')?.getBoundingClientRect();
    const bench = benchElement()?.getBoundingClientRect();
    await play([c], 'emotion-curious', 'normal');
    if (inv) await walkTo(c, inv.left + inv.width / 2 - size() / 2);
    if (await play([c], 'object-squat-pickup', 'normal') !== 'done') return;
    if (bench) {
      const target = bench.left + bench.width / 2 - size() / 2;
      for (let i = 0; i < 10 && Math.abs(target - pos.current[c]) > size() * 0.5; i++) {
        if (await play([c], 'object-carry-walk', 'normal', target > pos.current[c] ? 1 : -1) !== 'done') return;
      }
    }
    const hold = play([c], 'mode-puzzle-hold-breath', 'normal');
    const run = await actionRegistry.run(p.mode, 'bench.tryRandomMerge', { phase: 'run' });
    void hold;
    if (!run.ok) { await play([c], 'emotion-apologetic', 'normal'); }
    else if (run.data?.outcome === 'fail') { await play([c], 'emotion-embarrassed', 'normal'); crewStore.bump(`${c}>vex`, 'patience'); }
    else await play([c], 'object-place-carefully', 'normal');
    await walkTo(c, homeX(c));
    } finally { merging.current = false; }
  }, [homeX, play, walkTo]);

  const perform = useCallback((p: Performance) => {
    const d = dir();
    const go = () => {
      if (!d.active().includes(p.characterId)) return;
      if (p.actionId === 'bench.tryRandomMerge') { void runMerge(p); return; }
      if (p.speech) d.speech.offer(p.speech, p.source === 'ui');
      if (p.prank) { setPrankFor(p.characterId); window.clearTimeout(prankTimer.current); prankTimer.current = window.setTimeout(() => setPrankFor(null), 2600); }
      void play(p.cast, p.clipId, p.priority, undefined, p.hint).then(r => {
        if (r !== 'skipped' && p.cast.length > 1) { crewStore.bump(`${p.cast[0]}>${p.cast[1]}`, p.clipId.startsWith('fight') ? 'rivalry' : 'trust'); }
      });
      if (p.actionId === 'bench.returnItemHome') {
        later(async () => {
          const r = await actionRegistry.run(p.mode, 'bench.returnItemHome');
          if (r.ok) { crewStore.bump('vex>kip', 'debt'); later(() => { void play(['vex'], 'prank-innocent-whistle', 'ambient'); }, 1200); }
        }, 900);
      }
      if (p.followUp) later(() => { void play(p.cast, p.followUp!.clipId, 'ambient'); }, p.followUp.delayMs);
      if (DEV) setDebugLog(l => [`${new Date().toLocaleTimeString()} ${p.eventId} -> ${p.characterId}:${p.clipId}`, ...l].slice(0, 8));
    };
    if (p.delayMs > 0) later(go, p.delayMs); else go();
  }, [dir, later, play, runMerge]);

  /* ── wiring: bus, bridge, scheduler tick, context ─────────────── */

  useEffect(() => { reducedRef.current = reduced; if (reduced) cancelAll(); else for (const c of CHARACTER_IDS) if (appeared[c]) startIdle(c); }, [reduced, cancelAll, startIdle, appeared]);
  // keep the director in step with the save
  useEffect(() => {
    const d = dir();
    d.setSettings(save.settings); d.disclosureSeen = save.disclosureSeen;
    d.setRoster(CHARACTER_IDS.filter(c => save.unlocked[c] !== undefined && (appeared[c] || c === 'kip')));
    if (!save.settings.enabled) cancelAll();
  }, [save, appeared, dir, cancelAll]);

  // mode change: cancel everything, tell the director, announce
  useEffect(() => {
    modeRef.current = mode; setCrewMode(mode);
    const d = dir(); d.setMode(mode);
    cancelAll();
    for (const c of CHARACTER_IDS) if (appeared[c]) startIdle(c);
    if (mode !== 'main-evolution') readyRef.current = true;
    emitCrew(mode, 'mode-switch', { to: mode }, 'ui');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);
  useEffect(() => { gateRef.current = gate; }, [gate]);

  // the characters never fire before the game is ready; any event from the game proves it is
  useEffect(() => {
    const off = characterBus.on(e => {
      if (e.id === 'app-enter') { readyRef.current = true; setReady(true); }
      if (e.id === 'inventory-drag-item') dragItem.current = Date.now();
      for (const p of dir().handle(e)) perform(p);
    });
    const offBridge = attachRetentionBridge();
    return () => { off(); offBridge(); };
  }, [dir, perform]);

  // what the stage itself knows about the player's state
  useEffect(() => provideCrewContext(() => ({
    hidden: document.hidden,
    dragging: pointerDown.current,
    typing: (() => { const a = document.activeElement as HTMLElement | null; return !!a && (a.tagName === 'INPUT' || a.tagName === 'TEXTAREA' || a.tagName === 'SELECT' || a.isContentEditable); })(),
    modalOpen: !!document.querySelector('[aria-modal="true"]:not([hidden])'),
    gateOpen: gateRef.current,
    guideActive: !!document.querySelector('.guide-glow, .sx-guide, [data-guide-step]'),
  })), []);

  // real progress → roster. Kip is there from the start; the others arrive with a ceremony, once.
  useEffect(() => {
    const apply = () => {
      for (const id of crewProgress.earned()) {
        const fresh = crewStore.unlock(id);
        if ((fresh || !crewStore.get().ceremonySeen[id]) && id !== 'kip' && !pending.current.includes(id)) pending.current.push(id);
      }
      for (const c of CHARACTER_IDS) if (crewStore.get().ceremonySeen[c]) setAppeared(a => (a[c] ? a : { ...a, [c]: true }));
    };
    apply();
    return crewProgress.subscribe(apply);
  }, []);

  // input, visibility, gaze, resize
  useEffect(() => {
    const d = dir();
    let raf = 0; let gx = 0, gy = 0;
    const move = (e: PointerEvent) => {
      d.noteInput(); gx = e.clientX; gy = e.clientY; ptr.current = { x: gx, y: gy };
      if (raf || reducedRef.current) return;
      raf = requestAnimationFrame(() => {
        raf = 0;
        for (const c of CHARACTER_IDS) {
          const el = actors.current[c]; if (!el) continue;
          const r = el.getBoundingClientRect();
          const dx = gx - (r.left + r.width / 2), dy = gy - (r.top + r.height * 0.45);
          const dist = Math.hypot(dx, dy);
          const k = dist > 700 ? 0 : 3 / Math.max(40, dist);
          // write straight to the eye (no CSS variable on a parent, so no style-recalc fan-out) and only when it visibly moved
          if (dist < 90 && !merging.current && !slots.current[c] && !pointerDown.current && Date.now() - (fleeAt.current[c] ?? 0) > 22_000 && Math.random() < 0.08) {
            fleeAt.current[c] = Date.now(); void play([c], 'screen-flee-cursor', 'ambient', undefined, 'away-cursor');
          }
          const eye = el.querySelector<HTMLElement>('[data-joint="eye"]');
          const v = `${Math.round(dx * k * 2) / 2}px ${Math.round(dy * k * 2) / 2}px`;
          if (eye && eye.style.translate !== v) eye.style.translate = v;
        }
      });
    };
    const down = () => { pointerDown.current = true; d.noteInput(); };
    const up = (e: PointerEvent) => {
      pointerDown.current = false; d.noteInput();
      // an inventory item let go over one of them is a gift
      if (dragItem.current && Date.now() - dragItem.current < 30_000) { dragItem.current = 0; giveAt(e.clientX, e.clientY); }
    };
    const piece = (e: Event) => { const { x, y } = (e as CustomEvent<{ x: number; y: number }>).detail; giveAt(x, y); };
    window.addEventListener('evo:piece-drop', piece);
    const key = () => d.noteInput();
    let lastScroll = 0;
    const scroll = () => { d.noteInput(); const n = Date.now(); if (n - lastScroll > 8000) { lastScroll = n; emitCrew(modeRef.current, 'page-scroll', undefined, 'ui'); } };
    const vis = () => {
      if (document.hidden) cancelAll();
      else { for (const c of CHARACTER_IDS) if (appeared[c]) startIdle(c); emitCrew(modeRef.current, 'app-return-focus', undefined, 'ui'); }
    };
    const resize = () => { for (const c of CHARACTER_IDS) place(c, homeX(c)); };
    window.addEventListener('pointermove', move, { passive: true });
    window.addEventListener('pointerdown', down, { passive: true });
    window.addEventListener('pointerup', up, { passive: true });
    window.addEventListener('pointercancel', up, { passive: true });
    window.addEventListener('keydown', key, { passive: true });
    window.addEventListener('wheel', key, { passive: true });
    window.addEventListener('scroll', scroll, { passive: true, capture: true });
    document.addEventListener('visibilitychange', vis);
    window.addEventListener('resize', resize);
    return () => {
      window.removeEventListener('pointermove', move); window.removeEventListener('pointerdown', down);
      window.removeEventListener('pointerup', up); window.removeEventListener('pointercancel', up); window.removeEventListener('evo:piece-drop', piece);
      window.removeEventListener('keydown', key); window.removeEventListener('wheel', key);
      window.removeEventListener('scroll', scroll, { capture: true } as EventListenerOptions);
      document.removeEventListener('visibilitychange', vis); window.removeEventListener('resize', resize);
      if (raf) cancelAnimationFrame(raf);
    };
  }, [dir, cancelAll, startIdle, appeared, place, homeX, play, giveAt]);

  // THE scheduler: one timer for the whole crew
  useEffect(() => {
    const d = dir();
    const tick = () => {
      if (!readyRef.current) return;
      for (const p of d.tick()) perform(p);
      // between performances they are never standing about: off running somewhere
      for (const c of d.active()) if (!roaming.current[c] && !slots.current[c] && !held.current[c]) void wander(c);
      // ceremony queue: only at a quiet moment
      if (!ceremonyBusy.current && pending.current.length && d.calm() && !gateRef.current) {
        const id = pending.current.shift()!;
        ceremonyBusy.current = true;
        setAppeared(a => ({ ...a, [id]: true }));
        setCeremony(id);
        later(() => {
          place(id, homeX(id)); face(id, -1);
          void play([id], 'transform-unlock-evolution', 'major');
          emitCrew(modeRef.current, 'crew-arrive-together', { characterId: id }, 'crew');
        }, 120);
        later(() => { crewStore.markCeremony(id); setCeremony(null); ceremonyBusy.current = false; }, 4200);
      }
      // the one-time note about bench turns, asked at a natural idle moment
      const s = crewStore.get();
      const want = s.settings.enabled && !s.disclosureSeen && actionRegistry.has(modeRef.current, 'bench.tryRandomMerge') && d.calm() && d.idleFor() > 20_000 && d.active().includes('kip');
      setAsk(a => (a === want ? a : want));
      const t = gateRef.current || !!document.querySelector('[aria-modal="true"]:not([hidden])');
      setTucked(x => (x === t ? x : t));
    };
    const ceremonyBusy = { current: false };
    const id = window.setInterval(tick, 1000);
    const sub = d.speech.subscribe(setLine);
    return () => { window.clearInterval(id); sub(); };
  }, [dir, perform, later, place, homeX, face, play, wander]);

  // set the home slots when creatures first appear
  useEffect(() => {
    if (!mounted) return;
    for (const c of CHARACTER_IDS) if (appeared[c] && !pos.current[c]) { place(c, homeX(c)); startIdle(c); }
  }, [mounted, appeared, ready, place, homeX, startIdle]);

  // unmount: kill every timeline, timer and subscription
  useEffect(() => () => { cancelAll(); }, [cancelAll]);

  /* ── the creature's own controls ──────────────────────────────── */

  const poke = (c: CharacterId, id: string) => emitCrew(modeRef.current, id, { characterId: c }, 'ui');
  const onClick = (c: CharacterId, now: number) => {
    if (pressed.current) { pressed.current = false; return; }
    const recent = [...(clicks.current[c] ?? []).filter(t => now - t < 2600), now];
    clicks.current[c] = recent;
    if (recent.length >= 4) { clicks.current[c] = []; window.clearTimeout(clickTimer.current); clickTimer.current = 0; void play([c], 'screen-annoyed-clicks', 'major'); return; }
    if (recent.length === 3) { window.clearTimeout(clickTimer.current); clickTimer.current = 0; void play([c], 'screen-repeat-clicks', 'normal'); return; }
    if (clickTimer.current) { window.clearTimeout(clickTimer.current); clickTimer.current = 0; poke(c, 'character-double-click'); return; }
    clickTimer.current = window.setTimeout(() => { clickTimer.current = 0; poke(c, 'character-click'); }, 260);
  };
  const onKey = (c: CharacterId, e: React.KeyboardEvent) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); poke(c, 'character-keyboard-activate'); }
    else if (e.key === 'Escape') setEmoteFor(null);
    else if (e.key === 'ContextMenu' || (e.key === 'F10' && e.shiftKey)) { e.preventDefault(); setEmoteFor(c); }
  };
  const pressStart = (c: CharacterId) => { pressed.current = false; window.clearTimeout(pressTimer.current); pressTimer.current = window.setTimeout(() => { pressed.current = true; setEmoteFor(c); }, 550); };
  const pressEnd = () => window.clearTimeout(pressTimer.current);
  useEffect(() => () => { window.clearTimeout(pressTimer.current); window.clearTimeout(clickTimer.current); window.clearTimeout(prankTimer.current); }, []);

  if (!mounted || !save.settings.enabled) return null;
  const visible = CREW.filter(c => save.unlocked[c.id] !== undefined && appeared[c.id] && save.settings.perCharacter[c.id]);

  return (
    <>
      <div className="crew-lane" data-tucked={tucked || !ready ? '1' : undefined} data-mode={mode}>
        {visible.map(c => (
          <div key={c.id} className="crew-actor" data-char={c.id} ref={el => { actors.current[c.id] = el; }}>
            <div className="crew-flip" data-facing="right"><CharacterRig id={c.id} size={size()} /></div>
            <button type="button" className="crew-hit" aria-label={`${c.name}, ${c.role}. Activate for a reaction.`}
              onClick={e => onClick(c.id, e.timeStamp)} onKeyDown={e => onKey(c.id, e)}
              onPointerDown={() => pressStart(c.id)} onPointerUp={pressEnd} onPointerLeave={() => { pressEnd(); poke(c.id, 'pointer-leaves-character'); }}
              onPointerEnter={() => poke(c.id, 'pointer-near-character')} />
            {line?.speakerId === c.id && !tucked && <CharacterSpeechBubble line={line} />}
            {prankFor === c.id && <CharacterPrankTag />}
            {emoteFor === c.id && (
              <div className="crew-emotes" role="group" aria-label={`${c.name} emotes`}>
                {EMOTES.map(e => <button key={e.clip} type="button" onClick={() => { setEmoteFor(null); void play([c.id], e.clip, 'normal'); }}>{e.label}</button>)}
                <button type="button" onClick={() => setEmoteFor(null)} aria-label="Close emotes">×</button>
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="crew-sr" aria-live="polite" role="status">{line && save.settings.dialogue ? `${CHARACTERS[line.speakerId].name}: ${line.text}` : ''}</div>
      <button ref={settingsBtn} type="button" className="crew-chip" aria-label="Crew settings" aria-expanded={panel} aria-haspopup="dialog" onClick={() => setPanel(p => !p)}>
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true"><circle cx="12" cy="9" r="3.2" /><path d="M5 20c.6-3.6 3.4-5.4 7-5.4s6.4 1.8 7 5.4" /></svg>
      </button>
      {panel && <CharacterSettings save={save} onClose={() => { setPanel(false); settingsBtn.current?.focus(); }} />}
      {ask && !panel && <CharacterDisclosure onAnswer={a => { crewStore.acceptDisclosure(a); setAsk(false); }} />}
      {ceremony && <CharacterUnlockCeremony id={ceremony} />}
      {DEV && debugLog.length > 0 && <div className="crew-debug">{debugLog.join('\n')}</div>}
    </>
  );
}
