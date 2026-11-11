'use client';
import { memo, type ReactElement } from 'react';
import type { CharacterId } from '@/lib/characters/types';

/* Three line-drawn creatures, engraved in the same thin bone-coloured stroke as the game's own art (no flat fills, no cartoon outlines).
   Every rig exposes the same named joints (`data-joint`) so one clip retargets to each: root (the wrapper), body, head, eye (inside the head),
   armL, armR, legs, tail, prop and fx (small effect marks switched on by a clip).
   Kip   — a rock-carapaced, many-limbed creature: faceted shell, five jointed limbs, a sensing ring instead of a face (ochre accent).
   Vex   — a tall, angular wire figure on springing legs with one slit eye, a whip-cable tail and an antenna (copper accent).
   Orra  — a floating lantern-bell with trailing filaments, an orbiting ring and three apertures (teal accent). */

const INK = 'var(--ink-0, #0e0d0b)';
const OCHRE = '#d1a057', COPPER = '#cf7a47', TEAL = '#7fb8b0', RED = '#c8645a', BLUE = '#9bbfd0';

/** the tiny effect marks, all hand-drawn strokes; a clip switches them on with data-fx on the rig root */
function Fx({ x, y, accent }: { x: number; y: number; accent: string }) {
  return (
    <g transform={`translate(${x} ${y})`}>
      <g data-joint="fx" style={{ stroke: accent }}>
        <g className="fx fx-stars">{[[-13, -12], [13, -14], [0, -21]].map(([a, b]) => <path key={a} transform={`translate(${a} ${b})`} d="M0 -3.4 L1 -1 L3.4 0 L1 1 L0 3.4 L-1 1 L-3.4 0 L-1 -1 Z" />)}</g>
        <g className="fx fx-tears" style={{ stroke: BLUE }}><path d="M-9 3 q-2.6 4 0 6 q2.6 -2 0 -6 Z" /><path d="M9 3 q-2.6 4 0 6 q2.6 -2 0 -6 Z" /><path d="M-9 12 v4 M9 12 v4" /></g>
        <g className="fx fx-zzz"><path d="M9 -10 h6 l-6 6.5 h6" /><path d="M17 -19 h4 l-4 4.5 h4" /></g>
        <g className="fx fx-bubble"><circle cx="9" cy="-9" r="1.4" /><circle cx="13" cy="-14" r="2.1" /><path d="M16 -22 q-4 -1 -3 -5 q1 -4 5 -3 q3 -4 8 -1 q5 1 3 6 q1 4 -4 4 q-3 2 -6 0 q-3 1 -3 -1 Z" /></g>
        <g className="fx fx-sweat" style={{ stroke: BLUE }}><path d="M14 -6 q-3 4 0 6 q3 -2 0 -6 Z" /></g>
        <g className="fx fx-anger" style={{ stroke: RED }}><path d="M8 -14 q3.5 0 3.5 3.5 M8 -9 q3.5 0 3.5 -3.5 M15 -14 q-3.5 0 -3.5 3.5 M15 -9 q-3.5 0 -3.5 -3.5" /></g>
        <g className="fx fx-hearts" style={{ stroke: RED }}><path d="M12 -10 c-6 -5 -3 -9 0 -6 c3 -3 6 1 0 6 Z" /><path d="M-12 -14 c-4 -3 -2 -6 0 -4 c2 -2 4 1 0 4 Z" /></g>
        <g className="fx fx-question"><path d="M9 -18 q0 -5 4 -5 q4 0 4 4 q0 3 -4 4 v2.5 M13 -8 v.4" /></g>
        <g className="fx fx-exclaim"><path d="M13 -24 v9 M13 -11 v.6" /></g>
        <g className="fx fx-sparkle"><path d="M13 -18 v7 M9.5 -14.5 h7" /><path d="M-13 -12 v4.5 M-15.3 -9.8 h4.6" /></g>
        <g className="fx fx-swirl"><path d="M-9 -17 q4.5 -7 9 0 q4.5 7 9 0" /><path d="M-6 -23 q3 -5 6 0 q3 5 6 0" /></g>
        <g className="fx fx-note"><path d="M10 -9 v-10 l7 -2 v10 M10 -9 a2.4 1.8 0 1 1 -.01 0 M17 -11 a2.4 1.8 0 1 1 -.01 0" /></g>
        <g className="fx fx-blush" style={{ stroke: RED }}><path d="M-12 5 l2.4 -3.4 M-8.5 5 l2.4 -3.4 M8.5 5 l2.4 -3.4 M12 5 l2.4 -3.4" /></g>
        <g className="fx fx-dust"><path d="M-14 14 q-4 -3 0 -6 q3 -4 7 -1 M12 14 q4 -3 0 -6 q-3 -4 -7 -1 M0 16 q3 -4 6 0" /></g>
        <g className="fx fx-smile"><path d="M-5 7 Q0 11.5 5 7" /></g>
        <g className="fx fx-laugh"><path d="M-6 6 Q0 14 6 6 Z" /></g>
        <g className="fx fx-frown"><path d="M-5 10 Q0 5.5 5 10" /></g>
      </g>
    </g>
  );
}

function Kip() {
  return (
    <>
      <g data-joint="legs">
        {['M37 76 L29 85 L32 95 m-3 0 h6', 'M50 78 L50 87 L48 96 m-3 0 h6', 'M63 76 L71 85 L68 95 m-3 0 h6'].map(d => <path key={d} d={d} />)}
        <circle cx="29" cy="85" r="1.5" fill={INK} /><circle cx="71" cy="85" r="1.5" fill={INK} /><circle cx="50" cy="87" r="1.5" fill={INK} />
      </g>
      <g data-joint="body">
        <path d="M50 40 L72 49 L79 66 L67 79 L33 79 L21 66 L28 49 Z" fill={INK} strokeWidth="1.6" />
        <path d="M50 40 L50 52 M28 49 L40 56 M72 49 L60 56 M21 66 L35 64 M79 66 L65 64 M33 79 L42 70 M67 79 L58 70" opacity=".6" />
        <path d="M44 62 l3 -2 l3 2 l3 -2 l3 2" stroke={OCHRE} />
        <path d="M30 71 l3 2 M36 74 l2 3 M62 74 l2 3 M68 71 l3 2 M45 74 l1 2.6 M54 74 l1 2.6" opacity=".5" />
      </g>
      <g data-joint="armL"><path d="M28 55 L15 57 L8 69 L12 79 M12 79 l-3.4 2 M12 79 l.6 -4.6" /><circle cx="15" cy="57" r="1.6" fill={INK} /></g>
      <g data-joint="armR"><path d="M72 55 L85 57 L92 69 L88 79 M88 79 l3.4 2 M88 79 l-.6 -4.6" /><circle cx="85" cy="57" r="1.6" fill={INK} /></g>
      <g data-joint="head">
        <path d="M37 46 Q50 27 63 46" fill={INK} />
        <path d="M42 41 Q50 33 58 41" opacity=".55" />
        <g data-joint="eye"><circle cx="50" cy="40" r="4.6" stroke={OCHRE} fill={INK} /><circle cx="50.6" cy="40.2" r="1.3" fill={OCHRE} stroke="none" /></g>
      </g>
      <g data-joint="tail" style={{ stroke: OCHRE }}><path d="M38 28 Q50 14 62 28" /><path d="M43.5 23 Q50 15.5 56.5 23" opacity=".75" /><path d="M34 33 Q28 24 31 17 M66 33 Q72 24 69 17" opacity=".5" /></g>
      <g data-joint="prop" style={{ stroke: OCHRE }}><path d="M62 52 l5 -4 l8 2 l3 6 l-4 5 l-9 0 Z" fill={INK} /><path d="M66 53 l4 2 M70 50 l1 5" opacity=".6" /></g>
      <Fx x={50} y={38} accent={OCHRE} />
    </>
  );
}

function Vex() {
  return (
    <>
      <g data-joint="legs" style={{ stroke: COPPER }}>
        <path d="M45 67 L37 76 L46 81 L37 89 L42 97 m-4 0 h8" /><path d="M55 67 L63 76 L54 81 L63 89 L58 97 m-4 0 h8" />
        <circle cx="37" cy="76" r="1.4" fill={INK} /><circle cx="63" cy="76" r="1.4" fill={INK} />
      </g>
      <g data-joint="body">
        <rect x="42" y="43" width="16" height="25" rx="4" fill={INK} strokeWidth="1.6" />
        <path d="M42 52 h16 M42 60 h16" opacity=".7" /><path d="M46 46 v3 M54 46 v3 M46 55 v3 M54 55 v3 M46 63 v3 M54 63 v3" stroke={COPPER} opacity=".8" />
      </g>
      <g data-joint="armL"><path d="M42 47 L30 53 L25 65 M25 65 l-3 2.6 M25 65 l4 2" /><circle cx="30" cy="53" r="1.4" fill={INK} /></g>
      <g data-joint="armR"><path d="M58 47 L70 53 L75 65 M75 65 l3 2.6 M75 65 l-4 2" /><circle cx="70" cy="53" r="1.4" fill={INK} /></g>
      <g data-joint="head">
        <path d="M42 41 L58 41 L55 24 L45 24 Z" fill={INK} strokeWidth="1.6" />
        <path d="M55 24 L63 9" /><circle cx="63.6" cy="7.8" r="1.8" stroke={COPPER} fill={INK} />
        <g data-joint="eye"><circle cx="50" cy="32.5" r="5.6" stroke={COPPER} fill={INK} /><path d="M50 28 v9" strokeWidth="1.2" /></g>
      </g>
      <g data-joint="tail" style={{ stroke: COPPER }}><path d="M50 68 Q74 76 79 60 Q83 46 73 42" /><circle cx="72" cy="41.6" r="2.4" fill={INK} /></g>
      <g data-joint="prop" style={{ stroke: COPPER }}><path d="M66 50 l6 -3 l7 3 v8 l-7 3 l-6 -3 Z" fill={INK} /><path d="M66 50 l6 3 l7 -3 M72 53 v8" opacity=".6" /></g>
      <Fx x={50} y={31} accent={COPPER} />
    </>
  );
}

function Orra() {
  return (
    <>
      <g data-joint="legs" style={{ stroke: TEAL }}>
        <path d="M38 66 q-3 7 1 13 q3 6 -1 12" /><path d="M44 67 q-2 8 1 14 q2 6 0 12" /><path d="M50 68 q-1 8 1 15 q1 6 -1 11" /><path d="M56 67 q2 8 -1 14 q-2 6 0 12" /><path d="M62 66 q3 7 -1 13 q-3 6 1 12" />
      </g>
      <g data-joint="body">
        <path d="M29 56 Q33 66 39 58 Q45 67 50 58 Q55 67 61 58 Q67 66 71 56 Z" fill={INK} strokeWidth="1.6" />
        <path d="M35 58 q15 5 30 0" opacity=".55" /><circle cx="41" cy="61" r="1" fill={TEAL} stroke="none" /><circle cx="59" cy="61" r="1" fill={TEAL} stroke="none" />
      </g>
      <g data-joint="armL"><path d="M33 53 L21 59 L15 71 m-2.4 0 l2.4 -3 l2.4 3 l-2.4 3 Z" /></g>
      <g data-joint="armR"><path d="M67 53 L79 59 L85 71 m-2.4 0 l2.4 -3 l2.4 3 l-2.4 3 Z" /></g>
      <g data-joint="head">
        <path d="M29 56 Q29 32 50 30 Q71 32 71 56" fill={INK} strokeWidth="1.6" />
        <path d="M35 53 Q35 38 50 36 Q65 38 65 53" opacity=".5" />
        <path d="M41 33 L44 23 L50 31 L56 23 L59 33" stroke={TEAL} />
        <circle cx="41.5" cy="45" r="2.1" /><circle cx="58.5" cy="45" r="2.1" />
        <g data-joint="eye"><circle cx="50" cy="42" r="3.8" stroke={TEAL} fill={INK} /><circle cx="50.5" cy="41.5" r=".9" fill={TEAL} stroke="none" /></g>
      </g>
      <g data-joint="tail" style={{ stroke: TEAL }}><ellipse cx="50" cy="48" rx="31" ry="7" strokeDasharray="7 3.5" opacity=".9" /><circle cx="81" cy="48" r="1.8" fill={INK} /></g>
      <g data-joint="prop" style={{ stroke: TEAL }}><rect x="64" y="52" width="14" height="10" rx="1.5" fill={INK} /><path d="M67 56 h8 M67 59 h5" opacity=".6" /></g>
      <Fx x={50} y={42} accent={TEAL} />
    </>
  );
}

const RIGS: Record<CharacterId, () => ReactElement> = { kip: Kip, vex: Vex, orra: Orra };

/** The drawn creature. `data-joint="root"` is the wrapper the animator moves; decorative, so hidden from assistive tech. */
export const CharacterRig = memo(function CharacterRig({ id, size = 96 }: { id: CharacterId; size?: number }) {
  const Art = RIGS[id];
  return (
    <div className="crew-rig" data-char={id} data-joint="root" style={{ width: size, height: size }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size} focusable="false" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><Art /></svg>
    </div>
  );
});

/** A faint outline for the locked rows in the settings panel (non-interactive). */
export function CharacterSilhouette({ id, size = 40 }: { id: CharacterId; size?: number }) {
  const Art = RIGS[id];
  return (
    <div className="crew-sil" data-char={id} style={{ width: size, height: size, opacity: 0.45 }} aria-hidden="true">
      <svg viewBox="0 0 100 100" width={size} height={size} focusable="false" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><Art /></svg>
    </div>
  );
}
