'use client';

import { useState } from 'react';
import { SpriteIcon } from './SpriteIcon';
import { TUTORIAL_STEPS, phaseOf, policyPreview } from '@/lib/civ/extras';
import type { CivRuntime } from '@/lib/civ/runtime';
import type { Policies } from '@/lib/civ/types';
import { UI_SCALES, type UiPrefs } from '@/lib/civ/uiPrefs';
import { dayOf } from '@/lib/civ/sim';

/* Panels for the Part II systems: onboarding, policies, display and sound settings, pins, notes, expeditions. */

export function TutorialTip({ rt }: { rt: CivRuntime }) {
  const t = rt.state.tutorial;
  if (t.done) return null;
  const step = TUTORIAL_STEPS[t.step];
  if (!step) return null;
  return (
    <div className="cw-tip" role="status">
      <small>Getting started {t.step + 1} of {TUTORIAL_STEPS.length}</small>
      <span>{step.text}</span>
      <button type="button" onClick={() => rt.skipTutorial()}>Skip</button>
    </div>
  );
}

export function PhaseChip({ rt }: { rt: CivRuntime }) {
  const p = phaseOf(rt.state);
  return <span className="cw-chip" data-opt="1" title={`Next: ${p.next}`}><SpriteIcon sheet="era" frame={p.index} size={24} /> {p.name}</span>;
}

const POLICY_OPTIONS: { key: keyof Policies; label: string; values: string[] }[] = [
  { key: 'resourceUse', label: 'Resource use', values: ['conserve', 'balanced', 'free'] },
  { key: 'constructionFocus', label: 'Construction focus', values: ['none', 'housing', 'storage', 'production', 'infrastructure'] },
  { key: 'explorationStance', label: 'Exploration stance', values: ['cautious', 'balanced', 'bold'] },
  { key: 'gatheringRadius', label: 'Gathering radius', values: ['local', 'extended'] },
  { key: 'knowledgeFocus', label: 'Knowledge focus', values: ['open', 'tools', 'food', 'shelter'] },
];

/** Each policy shows its effect BEFORE it is confirmed; nothing teleports, behaviour changes gradually. */
export function PoliciesSection({ rt }: { rt: CivRuntime }) {
  const p = rt.state.policies;
  const [draft, setDraft] = useState<Partial<Policies>>({});
  return (
    <div className="cw-drawer-body">
      <h3>Policies</h3>
      {POLICY_OPTIONS.map(o => {
        const val = (draft[o.key] ?? p[o.key]) as string;
        const changed = val !== p[o.key];
        return (
          <div key={o.key} className="cw-field">
            <label>{o.label}
              <select value={val} onChange={e => setDraft({ ...draft, [o.key]: e.target.value })}>
                {o.values.map(v => <option key={v} value={v}>{v}</option>)}
              </select>
            </label>
            <span className="cw-note">{policyPreview(o.key, val as never)}</span>
            {changed && (
              <span className="cw-hint-actions">
                <button type="button" onClick={() => { rt.policy(o.key, val as never); setDraft(d => { const n = { ...d }; delete n[o.key]; return n; }); }}>Confirm</button>
                <button type="button" onClick={() => setDraft(d => { const n = { ...d }; delete n[o.key]; return n; })}>Keep current</button>
              </span>
            )}
          </div>
        );
      })}
    </div>
  );
}

export function SettingsSection({ ui, setUi }: { ui: UiPrefs; setUi: (p: UiPrefs) => void }) {
  const a = ui.audio;
  const setAudio = (patch: Partial<UiPrefs['audio']>) => setUi({ ...ui, audio: { ...a, ...patch } });
  return (
    <div className="cw-drawer-body">
      <h3>Display and sound</h3>
      <label className="cw-field">Visual quality
        <select value={ui.quality} onChange={e => setUi({ ...ui, quality: e.target.value as UiPrefs['quality'] })}>
          <option value="low">Low: no ambient loops, 20 fps</option>
          <option value="medium">Medium: water, smoke and dust</option>
          <option value="high">High: everything, including wind and wildlife</option>
        </select>
      </label>
      <label className="cw-field">Interface size
        <select value={ui.uiScale} onChange={e => setUi({ ...ui, uiScale: Number(e.target.value) })}>
          {UI_SCALES.map(s => <option key={s} value={s}>{Math.round(s * 100)}%</option>)}
        </select>
      </label>
      <label className="cw-check"><input type="checkbox" checked={ui.compact} onChange={e => setUi({ ...ui, compact: e.target.checked })} /> Compact mode (smaller bars, fewer words)</label>
      <label className="cw-check"><input type="checkbox" checked={ui.reduceMotion} onChange={e => setUi({ ...ui, reduceMotion: e.target.checked })} /> Reduce motion (also follows your system setting)</label>
      <label className="cw-check"><input type="checkbox" checked={ui.overlays} onChange={e => setUi({ ...ui, overlays: e.target.checked })} /> Planning overlays (gathering reach and walking routes)</label>
      <label className="cw-field">Villager hints
        <select value={ui.hints} onChange={e => setUi({ ...ui, hints: e.target.value as UiPrefs['hints'] })}>
          <option value="bubbles">Speech bubbles</option>
          <option value="compact">Compact notification only</option>
          <option value="off">No dialogue (still listed in History)</option>
        </select>
      </label>
      <label className="cw-check"><input type="checkbox" checked={!a.muted} onChange={e => setAudio({ muted: !e.target.checked })} /> Sound on</label>
      {(['master', 'effects', 'ambience'] as const).map(k => (
        <label key={k} className="cw-field">{k[0].toUpperCase() + k.slice(1)} volume
          <input type="range" min={0} max={1} step={0.05} value={a[k]} onChange={e => setAudio({ [k]: Number(e.target.value) })} />
        </label>
      ))}
    </div>
  );
}

export function PinsSection({ rt }: { rt: CivRuntime }) {
  const [text, setText] = useState('');
  const s = rt.state;
  return (
    <div className="cw-drawer-body">
      <h3>Your projects</h3>
      <form className="cw-hint-actions" onSubmit={e => { e.preventDefault(); if (rt.pin(text)) setText(''); }}>
        <input aria-label="New project" maxLength={80} value={text} onChange={e => setText(e.target.value)} placeholder="Name a goal to pin" />
        <button type="submit">Pin</button>
      </form>
      {s.pins.map(p => (
        <div key={p.id} className="cw-hint-actions">
          <label className="cw-check"><input type="checkbox" checked={p.done} onChange={() => rt.togglePin(p.id)} /> <span style={{ textDecoration: p.done ? 'line-through' : 'none' }}>{p.text}</span></label>
          <button type="button" aria-label={`Remove ${p.text}`} onClick={() => rt.removePin(p.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

export function NotesSection({ rt, onFocus }: { rt: CivRuntime; onFocus: (x: number, y: number) => void }) {
  const s = rt.state;
  return (
    <div className="cw-drawer-body">
      <h3>Map notes</h3>
      {s.notes.length === 0 && <p className="cw-note">Use the Note tool to flag a place, or explore: finds are noted for you.</p>}
      {s.notes.map(n => (
        <div key={n.id} className="cw-hint-actions">
          <button type="button" onClick={() => onFocus(n.x * 32, n.y * 32)}>{n.text}</button>
          <button type="button" aria-label={`Remove note ${n.text}`} onClick={() => rt.removeNote(n.id)}>Remove</button>
        </div>
      ))}
    </div>
  );
}

/** Expedition planning (master design section 36.1): cost, time and risk are shown before anyone leaves. */
export function ExplorePanel({ rt, target, onClose }: { rt: CivRuntime; target: { tx: number; ty: number }; onClose: () => void }) {
  const s = rt.state;
  const able = s.citizens.filter(c => c.task.kind !== 'away' && c.age === 'adult');
  const [sel, setSel] = useState<string[]>(able.slice(0, 2).map(c => c.id));
  const [msg, setMsg] = useState('');
  const pv = rt.preview(target.tx, target.ty, sel);
  const toggle = (id: string) => setSel(cur => (cur.includes(id) ? cur.filter(x => x !== id) : cur.length < 2 ? [...cur, id] : cur));
  return (
    <div className="cw-trade" role="region" aria-label="Plan an expedition">
      <strong>Expedition to {target.tx}, {target.ty}</strong>
      {able.map(c => <label key={c.id} className="cw-check"><input type="checkbox" checked={sel.includes(c.id)} onChange={() => toggle(c.id)} /> {c.name}</label>)}
      <span>About {pv.days.toFixed(1)} days there and back, {pv.foodNeeded} food. {pv.risk}.</span>
      {!pv.ok && <span className="cw-blocked">{pv.reason}</span>}
      {msg && <span className="cw-blocked">{msg}</span>}
      <div className="cw-hint-actions">
        <button type="button" disabled={!pv.ok} onClick={() => { const r = rt.explore(target.tx, target.ty, sel); if (r.ok) onClose(); else setMsg(r.reason); }}>Send</button>
        <button type="button" onClick={onClose}>Cancel</button>
      </div>
      <small>Day {dayOf(s.tick)}: the map is only as good as what people have seen.</small>
    </div>
  );
}
