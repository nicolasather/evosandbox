'use client';

import { useCallback, useEffect, useRef, useState, useSyncExternalStore, type KeyboardEvent, type PointerEvent } from 'react';
import { Sandbox } from '../Sandbox';
import { CivWorldPane } from '../civworld/CivWorldPane';
import { getCivRuntime } from '../civworld/useCiv';
import type { CivRuntime } from '@/lib/civ/runtime';
import type { ModeId } from '@/lib/modes/types';
import {
  DEFAULT_PREFS, SPLIT_MAX, SPLIT_MIN, WORKSPACE_KEY, clampSplit, paneRects, parsePrefs, serializePrefs, tabOf,
  type LayoutMode, type WorkspacePrefs,
} from '@/lib/workspace/layout';

/* ============================================================================
   WORKSPACE SHELL — the persistent tab strip around Civilization and Merging.
   The shell owns layout only (never game rules). Merging (the existing
   Sandbox, untouched) is mounted once and stays mounted in every layout: it is
   resized with CSS and parked off-screen when collapsed, never re-parented or
   unmounted, so a craft in progress and the bench survive every layout change.
   Its pane is a CSS containing block (transform) so the fixed layers inside
   Sandbox stay within the pane. See docs/civilization-overhaul/WORKSPACE_UX.md.
   ========================================================================== */

const MIN_MERGE_PX = 560;
const DOCK_W = 380; // real width of the compact dock
const DOCK_VIRTUAL = 760; // Merging lays itself out at this width, then is scaled to fit the dock
const DOCK_SCALE = DOCK_W / DOCK_VIRTUAL;
const NARROW_QUERY = '(max-width: 819px)';
const subscribeNarrow = (cb: () => void) => {
  const mq = window.matchMedia(NARROW_QUERY);
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
};
const useNarrow = () => useSyncExternalStore(subscribeNarrow, () => window.matchMedia(NARROW_QUERY).matches, () => false);

function readPrefs(): WorkspacePrefs {
  try { return parsePrefs(window.localStorage.getItem(WORKSPACE_KEY)); } catch { return { ...DEFAULT_PREFS }; }
}

export function WorkspaceShell({ onLaunchMode }: { onLaunchMode: (mode: ModeId) => void }) {
  const [prefs, setPrefs] = useState<WorkspacePrefs>(DEFAULT_PREFS);
  const [ready, setReady] = useState(false);
  const [rt, setRt] = useState<CivRuntime | null>(null);
  const [hubSignal, setHubSignal] = useState(0);
  const narrow = useNarrow();
  const stageRef = useRef<HTMLDivElement>(null);
  const previous = useRef<LayoutMode>('civ');

  // Saved layout is read after mount so server and first client render agree.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { setPrefs(readPrefs()); setReady(true); }, []);
  // The settlement runtime is created on the client only and ticks in every layout, Merging open or not.
  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { const r = getCivRuntime(); r.start(); setRt(r); return () => r.stop(); }, []);
  useEffect(() => {
    if (!ready) return;
    try { window.localStorage.setItem(WORKSPACE_KEY, serializePrefs(prefs)); } catch { /* storage blocked: the layout is simply not remembered */ }
  }, [prefs, ready]);

  const setLayout = useCallback((layout: LayoutMode) => {
    setPrefs(p => {
      if (p.layout !== layout) previous.current = p.layout;
      return { ...p, layout };
    });
  }, []);

  const tab = tabOf(prefs.layout);
  // Sandbox lays itself out from the viewport, not its pane, so Merging never gets narrower than MIN_MERGE_PX:
  // a split that would squeeze it is widened (the divider can still be dragged wider, never thinner than this).
  const [stageW, setStageW] = useState(0);
  useEffect(() => {
    const el = stageRef.current;
    if (!el || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => setStageW(el.getBoundingClientRect().width));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const effPct = stageW > 0 && !narrow ? Math.min(SPLIT_MAX + 8, Math.max(prefs.splitPct, (MIN_MERGE_PX / stageW) * 100)) : prefs.splitPct;
  const rects = paneRects({ ...prefs, splitPct: Math.min(80, effPct) });
  // Merging being on screen is what "pause while crafting" means
  const mergeOn = rects.merge.visible;
  useEffect(() => { rt?.setMerging(mergeOn); }, [rt, mergeOn]);
  const onDiscoveries = useCallback((found: ReadonlySet<string>) => { rt?.syncDiscoveries(found); }, [rt]);
  const vertical = narrow; // on a narrow screen Merging is a bottom drawer instead of a side column
  const axis = (r: { start: number; size: number }) => (vertical
    ? { top: `${r.start}%`, height: `${r.size}%`, left: 0, width: '100%' }
    : { left: `${r.start}%`, width: `${r.size}%`, top: 0, height: '100%' });

  const dragging = useRef(false);
  const onDividerDown = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = true;
    e.currentTarget.setPointerCapture(e.pointerId);
  };
  const onDividerMove = (e: PointerEvent<HTMLDivElement>) => {
    if (!dragging.current || !stageRef.current) return;
    const r = stageRef.current.getBoundingClientRect();
    const pos = vertical ? (e.clientY - r.top) / r.height : (e.clientX - r.left) / r.width;
    setPrefs(p => ({ ...p, splitPct: clampSplit((1 - pos) * 100) }));
  };
  const onDividerUp = (e: PointerEvent<HTMLDivElement>) => {
    dragging.current = false;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
  };
  const onDividerKey = (e: KeyboardEvent<HTMLDivElement>) => {
    const grow = vertical ? 'ArrowUp' : 'ArrowLeft';
    const shrink = vertical ? 'ArrowDown' : 'ArrowRight';
    if (e.key === grow) setPrefs(p => ({ ...p, splitPct: clampSplit(p.splitPct + 3) }));
    else if (e.key === shrink) setPrefs(p => ({ ...p, splitPct: clampSplit(p.splitPct - 3) }));
    else if (e.key === 'Escape') setLayout(previous.current === 'split' ? 'civ' : previous.current);
    else return;
    e.preventDefault();
  };

  // The expanded overlay is temporary: Escape (or the backdrop) returns to the layout it covered.
  useEffect(() => {
    if (prefs.layout !== 'overlay') return;
    const onKey = (e: globalThis.KeyboardEvent) => { if (e.key === 'Escape') setLayout(previous.current === 'overlay' ? 'civ' : previous.current); };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [prefs.layout, setLayout]);

  const mergeStyle = prefs.layout === 'dock' && !vertical
    ? { right: 0, top: 0, bottom: 0, width: DOCK_W }
    : prefs.layout === 'overlay'
      ? { left: '4%', width: '92%', top: '3%', height: '94%', boxShadow: '0 12px 48px rgba(0,0,0,.6)', border: '1px solid #3b5142', borderRadius: 10, zIndex: 8 }
      : axis(rects.merge);
  const dockInner = prefs.layout === 'dock' && !vertical
    ? { width: DOCK_VIRTUAL, height: `${100 / DOCK_SCALE}%`, transform: `scale(${DOCK_SCALE})`, transformOrigin: '0 0' }
    : { width: '100%', height: '100%' };

  const openModes = () => { setLayout('merge'); setHubSignal(n => n + 1); };

  return (
    <div id="workspace" className="ws" data-layout={prefs.layout} data-orient={vertical ? 'v' : 'h'} data-ready={ready ? '1' : '0'}>
      <div className="ws-tabs" role="tablist" aria-label="Workspace">
        <button type="button" role="tab" id="ws-tab-civ" aria-selected={tab === 'civilization'} aria-controls="ws-pane-civ"
          className="ws-tab" onClick={() => setLayout(prefs.layout === "split" || prefs.layout === "dock" ? prefs.layout : "civ")}>Civilization</button>
        <button type="button" role="tab" id="ws-tab-merge" aria-selected={tab === 'merging'} aria-controls="ws-pane-merge"
          className="ws-tab" onClick={() => setLayout('merge')}>Merging</button>
        <button type="button" className="ws-tab ws-tab-modes" onClick={openModes} title="Open the Mode Hub">Modes</button>
        <span className="ws-spacer" />
        <div className="ws-controls" role="group" aria-label="Merging panel">
          <button type="button" aria-pressed={prefs.layout === 'civ'} onClick={() => setLayout('civ')} title="Collapse Merging, settlement fills the screen">Collapse</button>
          <button type="button" aria-pressed={prefs.layout === 'dock'} onClick={() => setLayout('dock')} title="Compact dock: a narrow Merging strip beside the settlement">Dock</button>
          <button type="button" aria-pressed={prefs.layout === 'split'} onClick={() => setLayout('split')} title="Settlement and Merging side by side">Split</button>
          <button type="button" aria-pressed={prefs.layout === 'overlay'} onClick={() => setLayout('overlay')} title="Larger Merging overlay above the settlement (Escape returns)">Overlay</button>
          <button type="button" aria-pressed={prefs.layout === 'merge'} onClick={() => setLayout('merge')} title="Merging fills the workspace">Maximize</button>
        </div>
      </div>

      <div className="ws-stage" ref={stageRef}>
        <section id="ws-pane-civ" role="tabpanel" aria-labelledby="ws-tab-civ" className="ws-pane ws-pane-civ"
          style={axis(rects.civ)} data-visible={rects.civ.visible ? '1' : '0'}>
          <CivWorldPane visible={rects.civ.visible} rt={rt} />
        </section>

        <section id="ws-pane-merge" role="tabpanel" aria-labelledby="ws-tab-merge" className="ws-pane ws-pane-merge"
          style={mergeStyle} data-visible={rects.merge.visible ? '1' : '0'} aria-hidden={!rects.merge.visible}
          inert={!rects.merge.visible}>
          <div className="ws-dock-inner" style={dockInner}>
            <Sandbox inputActive={rects.merge.visible} onLaunchMode={onLaunchMode} openHubSignal={hubSignal} onDiscoveries={onDiscoveries} />
          </div>
        </section>

        {prefs.layout === 'overlay' && <div className="ws-backdrop" onClick={() => setLayout(previous.current === 'overlay' ? 'civ' : previous.current)} />}
        {prefs.layout === 'split' && (
          <div className="ws-divider" role="separator" tabIndex={0} aria-orientation={vertical ? 'horizontal' : 'vertical'}
            aria-label="Resize Merging panel" aria-valuemin={SPLIT_MIN} aria-valuemax={SPLIT_MAX} aria-valuenow={Math.round(prefs.splitPct)}
            style={vertical ? { top: `${100 - rects.merge.size}%` } : { left: `${100 - rects.merge.size}%` }}
            onPointerDown={onDividerDown} onPointerMove={onDividerMove} onPointerUp={onDividerUp} onPointerCancel={onDividerUp}
            onKeyDown={onDividerKey} />
        )}

        {prefs.layout === 'civ' && (
          <button type="button" className="ws-handle" onClick={() => setLayout('split')} aria-label="Open Merging beside the settlement">
            Merging
          </button>
        )}
      </div>
    </div>
  );
}
