'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { BUILDINGS } from '@/lib/civ/data/buildings';
import { TICKS_PER_SECOND } from '@/lib/civ/data/config';
import type { CivRuntime } from '@/lib/civ/runtime';
import { validatePlacement } from '@/lib/civ/sim';
import { clampCamera, clampZoom, recenter, screenToWorld, zoomAt, type Camera, type Size } from '@/lib/civ/camera';
import { TILE, hitTest, type Hit, type MapLike } from '@/lib/civ/world';
import { AssetStore } from './assets';
import db from '@/data/db.json';
import { CivAudio, soundForEvent } from '@/lib/civ/audio';
import { UI_PREFS_KEY, animationOn, parseUiPrefs, qualityFlags, serializeUiPrefs, type UiPrefs } from '@/lib/civ/uiPrefs';
import { SaveSection, FamilySection, GovernanceSection, MapSection, ModulesSection, TradeDrawer } from './panels3';
import { ExplorePanel, NotesSection, PinsSection, PoliciesSection, SettingsSection, TutorialTip } from './panels2';
import { BuildDrawer, GoalsDrawer, HelpDrawer, Hud, HintCard, DiscoveryToast, Inspector, JobsDrawer, JournalDrawer, LogDrawer, Notice, MigrantCard, Toolbar, TradeCard, type DrawerId, type Tool } from './panels';
import { buildTerrainLayer, drawFrame, type Ghost } from './render';
import { useCivVersion } from './useCiv';

/* The settlement viewport: canvas rendering, pan/zoom, hover, selection and build placement.
   React owns the panels; the canvas draws straight from the runtime's simulation state. */

const START_ZOOM = 2;
const CAM_KEY = 'evo.civworld.cam';

function loadCam(): Camera {
  const fallback = { cx: 19.5 * TILE, cy: 12.5 * TILE, zoom: START_ZOOM };
  try {
    const o = JSON.parse(window.localStorage.getItem(CAM_KEY) ?? 'null') as Partial<Camera> | null;
    if (o && Number.isFinite(o.cx) && Number.isFinite(o.cy) && Number.isFinite(o.zoom)) return { cx: Number(o.cx), cy: Number(o.cy), zoom: clampZoom(Number(o.zoom)) };
  } catch { /* use the default */ }
  return fallback;
}
const saveCam = (c: Camera) => { try { window.localStorage.setItem(CAM_KEY, JSON.stringify(c)); } catch { /* not remembered */ } };

/** Discovery display names come from the existing catalogue; the settlement never keeps its own copy. */
const DISCOVERY_NAMES: Record<string, string> = Object.fromEntries((db as { nodes: { id: string; n: string }[] }).nodes.map(n => [n.id, n.n]));
const TICK_MS = 1000 / TICKS_PER_SECOND;

export function CivWorldPane({ visible, rt }: { visible: boolean; rt: CivRuntime | null }) {
  if (!rt) return <div className="cw-root" data-visible={visible ? '1' : '0'} />;
  return <CivWorld visible={visible} rt={rt} />;
}

function CivWorld({ visible, rt }: { visible: boolean; rt: CivRuntime }) {
  const version = useCivVersion(rt);
  // display and sound preferences live on this device only (never in the simulation save)
  const [ui, setUiState] = useState<UiPrefs>(() => { try { return parseUiPrefs(window.localStorage.getItem(UI_PREFS_KEY)); } catch { return parseUiPrefs(null); } });
  const uiRef = useRef(ui);
  const audio = useMemo(() => new CivAudio(ui.audio), []); // eslint-disable-line react-hooks/exhaustive-deps
  const setUi = useCallback((p: UiPrefs) => {
    setUiState(p); uiRef.current = p; audio.setPrefs(p.audio);
    try { window.localStorage.setItem(UI_PREFS_KEY, serializeUiPrefs(p)); } catch { /* not remembered */ }
  }, [audio]);
  const [tool, setTool] = useState<Tool>('none');
  const [target, setTarget] = useState<{ tx: number; ty: number } | null>(null);
  const [noteText, setNoteText] = useState('');
  const lastEvent = useRef(rt.state.events.length ? rt.state.events[rt.state.events.length - 1].id : 0);
  // a quiet sound for story events only, each once
  useEffect(() => {
    const evs = rt.state.events;
    for (const e of evs) if (e.id > lastEvent.current) { const snd = soundForEvent(e.kind); if (snd) audio.play(snd); }
    if (evs.length) lastEvent.current = Math.max(lastEvent.current, evs[evs.length - 1].id);
  }, [version, rt, audio]);
  const map = rt.sim.map;
  const mapSize: Size = useMemo(() => ({ w: map.w * TILE, h: map.h * TILE }), [map]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const assets = useMemo(() => new AssetStore(), []);
  const ground = useRef<HTMLCanvasElement | null>(null);
  const groundVersion = useRef(-1);
  const view = useRef<Size>({ w: 800, h: 600 });
  const dpr = useRef(1);
  // the last camera position is remembered per device, so coming back from another tab or mode lands where you were
  const cam = useRef<Camera>(loadCam());
  const hover = useRef<Hit | null>(null);
  const ghost = useRef<Ghost | null>(null);
  const follow = useRef<string | null>(null);
  const reduced = useRef(false);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  useEffect(() => {
    if (process.env.NODE_ENV !== 'production') (window as unknown as { __civcam?: unknown }).__civcam = { cam, view };
  }, []);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [drawer, setDrawer] = useState<DrawerId | null>(null);
  const [buildKind, setBuildKind] = useState<string | null>(null);
  const [ghostMsg, setGhostMsg] = useState<string>('');
  const rotated = useRef(false);
  const [zoomLabel, setZoomLabel] = useState(START_ZOOM);
  const live = useRef({ selected: null as Hit | null, visible, drawer: null as DrawerId | null });
  useEffect(() => { live.current = { selected, visible, drawer }; }, [selected, visible, drawer]);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mq.matches;
    const on = () => { reduced.current = mq.matches; };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;
    const fit = () => {
      const r = host.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) return;
      view.current = { w: r.width, h: r.height };
      dpr.current = Math.min(2, window.devicePixelRatio || 1);
      canvas.width = Math.round(r.width * dpr.current);
      canvas.height = Math.round(r.height * dpr.current);
      cam.current = clampCamera(cam.current, view.current, mapSize);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(host);
    return () => ro.disconnect();
  }, [mapSize]);

  // drawing loop: runs only while the pane is on screen and the tab is visible
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    let lastDraw = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const lv = live.current;
      if (!lv.visible || document.hidden) return;
      if (now - lastDraw < 1000 / qualityFlags(uiRef.current.quality).maxFps - 1) return; // low quality caps the frame rate
      lastDraw = now;
      if (!ground.current || groundVersion.current !== assets.version) {
        ground.current = buildTerrainLayer(rt.sim.map, assets);
        groundVersion.current = assets.version;
      }
      if (follow.current) {
        const c = rt.state.citizens.find(q => q.id === follow.current);
        if (c) cam.current = clampCamera({ ...cam.current, cx: cam.current.cx + ((c.x + 0.5) * TILE - cam.current.cx) * 0.12, cy: cam.current.cy + ((c.y + 0.5) * TILE - cam.current.cy) * 0.12 }, view.current, mapSize);
        else follow.current = null;
      }
      const alpha = rt.paused ? 1 : Math.max(0, Math.min(1, (now - rt.lastTickAt) / (TICK_MS / rt.speed)));
      drawFrame(ctx, rt.sim.map, rt.state, assets, ground.current, {
        cam: cam.current, view: view.current, dpr: dpr.current, now, alpha, animate: animationOn(reduced.current, uiRef.current), quality: uiRef.current.quality,
        hover: hover.current, selected: lv.selected, ghost: ghost.current, overlays: lv.drawer === 'build' || uiRef.current.overlays,
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [rt, assets, mapSize]);

  const posOf = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };
  const hitAt = (sx: number, sy: number): Hit | null => {
    const w = screenToWorld(cam.current, view.current, sx, sy);
    const m: MapLike = { w: map.w, h: map.h, terrain: map.terrain, nodes: rt.state.nodes, buildings: rt.state.buildings };
    return hitTest(m, w.x, w.y, rt.state.citizens);
  };
  const ghostAt = (sx: number, sy: number) => {
    if (!buildKind) { ghost.current = null; return; }
    const w = screenToWorld(cam.current, view.current, sx, sy);
    const d = BUILDINGS[buildKind];
    const gx = Math.floor(w.x / TILE) - Math.floor(d.footprint.w / 2);
    const gy = Math.floor(w.y / TILE) - Math.floor(d.footprint.h / 2);
    const v = validatePlacement(rt.sim, buildKind, gx, gy, rotated.current);
    ghost.current = { kind: buildKind, x: gx, y: gy, valid: v.ok, far: v.ok && v.far };
    const msg = v.ok ? (v.far ? 'Valid, but far from the camp: long carrying routes' : 'Valid: click to place') : v.reason;
    setGhostMsg(prev => (prev === msg ? prev : msg));
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    if (e.button === 2) { setBuildKind(null); ghost.current = null; return; }
    e.currentTarget.setPointerCapture(e.pointerId);
    follow.current = null;
    drag.current = { x: e.clientX, y: e.clientY, cx: cam.current.cx, cy: cam.current.cy, moved: false };
  };
  const onPointerMove = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    if (d) {
      const dx = e.clientX - d.x;
      const dy = e.clientY - d.y;
      if (!d.moved && Math.hypot(dx, dy) > 4) d.moved = true;
      if (d.moved) cam.current = clampCamera({ ...cam.current, cx: d.cx - dx / cam.current.zoom, cy: d.cy - dy / cam.current.zoom }, view.current, mapSize);
      return;
    }
    const { sx, sy } = posOf(e);
    hover.current = buildKind ? null : hitAt(sx, sy);
    ghostAt(sx, sy);
  };
  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    saveCam(cam.current);
    if (!d || d.moved) return;
    const { sx, sy } = posOf(e);
    if (buildKind) {
      ghostAt(sx, sy);
      const g = ghost.current;
      if (g) {
        const r = rt.place(buildKind, g.x, g.y, rotated.current);
        if (r.ok && buildKind === 'shelter') rt.tutorial('shelter');
        if (r.ok) { if (!e.shiftKey) { setBuildKind(null); ghost.current = null; setGhostMsg(''); } } else setGhostMsg(r.reason);
      }
      return;
    }
    if (tool === 'explore') { const w = screenToWorld(cam.current, view.current, sx, sy); setTarget({ tx: Math.floor(w.x / TILE), ty: Math.floor(w.y / TILE) }); return; }
    if (tool === 'note') {
      const w = screenToWorld(cam.current, view.current, sx, sy);
      if (rt.note(Math.floor(w.x / TILE), Math.floor(w.y / TILE), noteText || 'Note')) { setTool('none'); setNoteText(''); }
      return;
    }
    const picked = hitAt(sx, sy);
    if (picked?.type === 'citizen') rt.tutorial('select');
    setSelected(picked);
  };
  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    const { sx, sy } = posOf(e);
    cam.current = zoomAt(cam.current, view.current, mapSize, cam.current.zoom + (e.deltaY < 0 ? 1 : -1), sx, sy);
    setZoomLabel(cam.current.zoom);
    saveCam(cam.current);
  };
  const zoomBy = (dz: number) => {
    cam.current = zoomAt(cam.current, view.current, mapSize, cam.current.zoom + dz, view.current.w / 2, view.current.h / 2);
    setZoomLabel(cam.current.zoom);
  };
  const focusOn = useCallback((x: number, y: number) => {
    follow.current = null;
    cam.current = recenter({ x: x + TILE / 2, y: y + TILE / 2 }, cam.current.zoom, view.current, mapSize);
  }, [mapSize]);
  const goHome = useCallback(() => {
    const fire = rt.state.buildings[0];
    follow.current = null;
    cam.current = recenter({ x: (fire.x + 0.5) * TILE, y: (fire.y + 0.5) * TILE }, START_ZOOM, view.current, mapSize);
    setZoomLabel(cam.current.zoom);
  }, [rt, mapSize]);
  const cancelBuild = () => { setBuildKind(null); ghost.current = null; setGhostMsg(''); };
  const onKey = (e: KeyboardEvent<HTMLElement>) => {
    if ((e.target as HTMLElement).closest('input,select,textarea,button')) { if (e.key === 'Escape' && buildKind) { cancelBuild(); e.preventDefault(); } return; }
    const step = 48 / cam.current.zoom;
    const move = (dx: number, dy: number) => { follow.current = null; cam.current = clampCamera({ ...cam.current, cx: cam.current.cx + dx, cy: cam.current.cy + dy }, view.current, mapSize); };
    if (e.key === 'ArrowLeft') move(-step, 0);
    else if (e.key === 'ArrowRight') move(step, 0);
    else if (e.key === 'ArrowUp') move(0, -step);
    else if (e.key === 'ArrowDown') move(0, step);
    else if (e.key === '+' || e.key === '=') zoomBy(1);
    else if (e.key === '-') zoomBy(-1);
    else if (e.key === 'Home') goHome();
    else if ((e.key === 'r' || e.key === 'R') && buildKind) { rotated.current = !rotated.current; setGhostMsg(m => m + ' (rotated)'); }
    else if (e.key === ' ') rt.togglePause();
    else if (e.key === 'Escape') { if (buildKind) cancelBuild(); else setSelected(null); }
    else return;
    e.preventDefault();
  };

  const pickBuild = (kind: string) => { rotated.current = false; setDrawer(null); setBuildKind(kind); setSelected(null); setGhostMsg('Move over the map to place it. Esc cancels.'); };
  const openDrawer = (d: DrawerId | null) => { if (d === 'jobs') rt.tutorial('jobs'); setDrawer(d); };
  const drawerBody = drawer === 'build' ? <BuildDrawer rt={rt} onPick={pickBuild} active={buildKind} />
    : drawer === 'jobs' ? <JobsDrawer rt={rt} />
      : drawer === 'trade' ? <TradeDrawer rt={rt} />
      : drawer === 'goals' ? <><GoalsDrawer rt={rt} /><PinsSection rt={rt} /></>
        : drawer === 'journal' ? <><JournalDrawer rt={rt} names={DISCOVERY_NAMES} /><NotesSection rt={rt} onFocus={focusOn} /><FamilySection rt={rt} /></>
      : drawer === 'log' ? <LogDrawer rt={rt} onFocus={focusOn} />
        : drawer === 'help' ? <><HelpDrawer rt={rt} /><PoliciesSection rt={rt} /><GovernanceSection rt={rt} /><ModulesSection rt={rt} /><MapSection rt={rt} /><SaveSection rt={rt} /><SettingsSection ui={ui} setUi={setUi} /></> : null;

  return (
    <div className="cw-root" data-visible={visible ? '1' : '0'} data-compact={ui.compact ? '1' : '0'} style={{ ['--cw-scale' as string]: ui.uiScale }} ref={hostRef} onKeyDown={onKey}>
      <canvas ref={canvasRef} className="cw-canvas" tabIndex={0} role="application" data-build={buildKind ? '1' : '0'}
        aria-label="Settlement map. Arrow keys pan, plus and minus zoom, Home recentres, Space pauses."
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onPointerLeave={() => { hover.current = null; }} onWheel={onWheel} onContextMenu={e => e.preventDefault()} />
      <Hud rt={rt} onFocus={focusOn} />
      <div className="cw-tools" role="group" aria-label="Map view">
        <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in">+</button>
        <span className="cw-zoom" aria-live="polite">{zoomLabel}x</span>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out">-</button>
      </div>
      {buildKind && (
        <div className="cw-buildbar" role="status">
          <strong>Placing {BUILDINGS[buildKind].name}</strong> {ghostMsg} <button type="button" onClick={cancelBuild}>Cancel</button>
        </div>
      )}
      {selected && !buildKind && <Inspector rt={rt} sel={selected} onClose={() => setSelected(null)} onFollow={id => { follow.current = id; }} />}
      <HintCard rt={rt} mode={ui.hints} />
      <TutorialTip rt={rt} />
      {tool === 'note' && <div className="cw-buildbar" role="status"><label>Note text <input aria-label="Note text" maxLength={60} value={noteText} onChange={e => setNoteText(e.target.value)} /></label> Click the map to place it. <button type="button" onClick={() => setTool('none')}>Cancel</button></div>}
      {tool === 'explore' && !target && <div className="cw-buildbar" role="status">Click unexplored (dark) ground to plan an expedition. <button type="button" onClick={() => setTool('none')}>Cancel</button></div>}
      {target && <ExplorePanel rt={rt} target={target} onClose={() => { setTarget(null); setTool('none'); }} />}
      <TradeCard rt={rt} />
      <MigrantCard rt={rt} />
      <DiscoveryToast rt={rt} />
      <Notice rt={rt} />
      {drawerBody && <aside className="cw-drawer" aria-label={drawer ?? ''}>{drawerBody}<button type="button" className="cw-drawer-close" onClick={() => setDrawer(null)}>Close</button></aside>}
      <Toolbar drawer={drawer} setDrawer={openDrawer} home={goHome} tool={tool} setTool={setTool} />
    </div>
  );
}
