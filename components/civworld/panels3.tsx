'use client';

import { useState } from 'react';
import { LAWS, MODULES, canRoute, familyTree, moduleOn, outsideTemperature, priceOf, proposeRoute, waterCapacity, type LawId } from '@/lib/civ/modules';
import type { CivRuntime } from '@/lib/civ/runtime';

/* Panels for the optional modules: trade, governance, families, map and module switches. */

export function ModulesSection({ rt }: { rt: CivRuntime }) {
  return (
    <div className="cw-drawer-body">
      <h3>Optional systems</h3>
      <p className="cw-note">Each one can be switched off. The core loop never needs any of them.</p>
      {MODULES.map(m => (
        <label key={m.id} className="cw-check" title={m.what}>
          <input type="checkbox" checked={moduleOn(rt.state, m.id)} onChange={e => rt.setModule(m.id, e.target.checked)} /> {m.label}
        </label>
      ))}
    </div>
  );
}

export function MapSection({ rt }: { rt: CivRuntime }) {
  const [kind, setKind] = useState<'classic' | 'procedural'>('classic');
  const [seed, setSeed] = useState(1);
  const [sure, setSure] = useState(false);
  return (
    <div className="cw-drawer-body">
      <h3>New settlement</h3>
      <label className="cw-field">Map
        <select value={kind} onChange={e => setKind(e.target.value as 'classic' | 'procedural')}>
          <option value="classic">The first map (hand-authored)</option>
          <option value="procedural">A new land from a seed (river, woods, stone)</option>
        </select>
      </label>
      <label className="cw-field">Seed
        <input type="number" aria-label="Seed" min={1} max={999999} value={seed} onChange={e => setSeed(Math.max(1, Math.floor(Number(e.target.value) || 1)))} />
      </label>
      <label className="cw-check"><input type="checkbox" checked={sure} onChange={e => setSure(e.target.checked)} /> I understand the current settlement is kept only as a backup copy</label>
      <button type="button" disabled={!sure} onClick={() => { rt.startFresh(seed, kind); setSure(false); }}>Start a new settlement</button>
    </div>
  );
}

export function SaveSection({ rt }: { rt: CivRuntime }) {
  const [msg, setMsg] = useState('');
  const download = () => {
    const blob = new Blob([rt.exportFile()], { type: 'application/json' });
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `evosandbox-settlement-day-${Math.floor(rt.state.tick / 240) + 1}.json`;
    a.click();
    URL.revokeObjectURL(a.href);
    setMsg('Exported. Keep the file somewhere safe.');
  };
  const pick = async (f: File | undefined) => {
    if (!f) return;
    const r = rt.importFile(await f.text());
    setMsg(r.ok ? 'Imported. The previous settlement was kept as a backup copy.' : `Not imported: ${r.reason}`);
  };
  return (
    <div className="cw-drawer-body">
      <h3>Save file</h3>
      <p className="cw-note">Your settlement saves in this browser. Export it to keep a copy or move it to another device.</p>
      <button type="button" onClick={download}>Export settlement</button>
      <label className="cw-field">Import settlement
        <input type="file" accept="application/json,.json" aria-label="Import settlement file" onChange={e => { void pick(e.target.files?.[0]); e.target.value = ''; }} />
      </label>
      {msg && <span className="cw-note" role="status">{msg}</span>}
    </div>
  );
}

export function TradeDrawer({ rt }: { rt: CivRuntime }) {
  const s = rt.state;
  const [msg, setMsg] = useState('');
  const p = proposeRoute(s);
  return (
    <div className="cw-drawer-body">
      <h3>Trade</h3>
      {!moduleOn(s, 'trade') && <p className="cw-note">The trade module is switched off.</p>}
      <p className="cw-note">Prices follow scarcity: what you lack costs more, what you have plenty of costs less.</p>
      <ul className="cw-keys">{(['food', 'wood', 'stone'] as const).map(r => <li key={r}>{r}: price {priceOf(s, r).toFixed(2)} ({s.stock[r]} in store)</li>)}</ul>
      <h3>Routes</h3>
      {!canRoute(s) && <p className="cw-note">A route needs a market and at least 3 road tiles.</p>}
      {s.routes.map(r => (
        <div key={r.id} className="cw-goal">
          <strong>{r.partner}</strong>
          <span>{r.give.n} {r.give.res} for {r.want.n} {r.want.res} every {r.everyDays} days</span>
          <button type="button" onClick={() => rt.dropRoute(r.id)}>End route</button>
        </div>
      ))}
      {p && s.routes.length < 2 && (
        <div className="cw-goal">
          <span>Offer: {p.partner} will send {p.give.n} {p.give.res} for {p.want.n} {p.want.res} every {p.everyDays} days.</span>
          <button type="button" onClick={() => { const r = rt.openRoute(); setMsg(r.ok ? '' : r.reason); }}>Agree to this route</button>
        </div>
      )}
      {msg && <span className="cw-blocked">{msg}</span>}
    </div>
  );
}

export function GovernanceSection({ rt }: { rt: CivRuntime }) {
  const s = rt.state;
  const [msg, setMsg] = useState('');
  if (!moduleOn(s, 'governance')) return null;
  return (
    <div className="cw-drawer-body">
      <h3>Laws</h3>
      <p className="cw-note">Laws are decided at an assembly and always cost something. At most two at a time.</p>
      {(Object.keys(LAWS) as LawId[]).map(id => {
        const on = s.laws.includes(id);
        return (
          <div key={id} className="cw-goal">
            <strong>{LAWS[id].name}{on ? ' (in force)' : ''}</strong>
            <span>Benefit: {LAWS[id].benefit}</span>
            <span>Cost: {LAWS[id].cost}</span>
            <button type="button" onClick={() => { if (on) rt.repeal(id); else { const r = rt.adopt(id); setMsg(r.ok ? '' : r.reason); } }}>{on ? 'Repeal' : 'Adopt'}</button>
          </div>
        );
      })}
      {msg && <span className="cw-blocked">{msg}</span>}
    </div>
  );
}

export function FamilySection({ rt }: { rt: CivRuntime }) {
  const s = rt.state;
  if (!moduleOn(s, 'family')) return null;
  const tree = familyTree(s);
  return (
    <div className="cw-drawer-body">
      <h3>Families</h3>
      <ul className="cw-keys">
        {tree.map(t => (
          <li key={t.name}>{t.name} ({t.stage}){t.parents.length > 0 ? `, child of ${t.parents.join(' and ')}` : ''}{t.children.length > 0 ? `; children: ${t.children.join(', ')}` : ''}</li>
        ))}
      </ul>
    </div>
  );
}

/** Water and temperature, shown only while their modules are on. */
export function ClimateChips({ rt }: { rt: CivRuntime }) {
  const s = rt.state;
  return (
    <>
      {moduleOn(s, 'water') && <span className="cw-chip" data-opt="1" title={`Stored water. Wells fill it, people and fields use it. Capacity ${waterCapacity(s)}.`}>Water {Math.round(s.water)}/{waterCapacity(s)}</span>}
      {moduleOn(s, 'climate') && <span className="cw-chip" data-opt="1" title="Outside temperature. Clothing, a roof and a lit fire keep people warm.">{outsideTemperature(s)}°C</span>}
    </>
  );
}

export const _canRoute = canRoute;
