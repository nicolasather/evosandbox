'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { BUILDINGS } from '@/lib/civ/data/buildings';
import { TICKS_PER_SECOND } from '@/lib/civ/data/config';
import type { CivRuntime } from '@/lib/civ/runtime';
import { validatePlacement } from '@/lib/civ/sim';
import { clampCamera, recenter, screenToWorld, zoomAt, type Camera, type Size } from '@/lib/civ/camera';
import { TILE, hitTest, type Hit, type MapLike } from '@/lib/civ/world';
import { AssetStore } from './assets';
import { BuildDrawer, HelpDrawer, Hud, HintCard, Inspector, JobsDrawer, LogDrawer, Notice, Toolbar, type DrawerId } from './panels';
import { buildTerrainLayer, drawFrame, type Ghost } from './render';
import { useCivVersion } from './useCiv';

/* The settlement viewport: canvas rendering, pan/zoom, hover, selection and build placement.
   React owns the panels; the canvas draws straight from the runtime's simulation state. */

const START_ZOOM = 2;
const TICK_MS = 1000 / TICKS_PER_SECOND;

export function CivWorldPane({ visible, rt }: { visible: boolean; rt: CivRuntime | null }) {
  if (!rt) return <div className="cw-root" data-visible={visible ? '1' : '0'} />;
  return <CivWorld visible={visible} rt={rt} />;
}

function CivWorld({ visible, rt }: { visible: boolean; rt: CivRuntime }) {
  useCivVersion(rt);
  const map = rt.sim.map;
  const mapSize: Size = useMemo(() => ({ w: map.w * TILE, h: map.h * TILE }), [map]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const assets = useMemo(() => new AssetStore(), []);
  const ground = useRef<HTMLCanvasElement | null>(null);
  const groundVersion = useRef(-1);
  const view = useRef<Size>({ w: 800, h: 600 });
  const dpr = useRef(1);
  const cam = useRef<Camera>({ cx: 19.5 * TILE, cy: 12.5 * TILE, zoom: START_ZOOM });
  const hover = useRef<Hit | null>(null);
  const ghost = useRef<Ghost | null>(null);
  const follow = useRef<string | null>(null);
  const reduced = useRef(false);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const [selected, setSelected] = useState<Hit | null>(null);
  const [drawer, setDrawer] = useState<DrawerId | null>(null);
  const [buildKind, setBuildKind] = useState<string | null>(null);
  const [ghostMsg, setGhostMsg] = useState<string>('');
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
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      const lv = live.current;
      if (!lv.visible || document.hidden) return;
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
        cam: cam.current, view: view.current, dpr: dpr.current, now, alpha, animate: !reduced.current,
        hover: hover.current, selected: lv.selected, ghost: ghost.current, overlays: lv.drawer === 'build',
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
    const v = validatePlacement(rt.sim, buildKind, gx, gy);
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
    if (!d || d.moved) return;
    const { sx, sy } = posOf(e);
    if (buildKind) {
      ghostAt(sx, sy);
      const g = ghost.current;
      if (g) {
        const r = rt.place(buildKind, g.x, g.y);
        if (r.ok) { if (!e.shiftKey) { setBuildKind(null); ghost.current = null; setGhostMsg(''); } } else setGhostMsg(r.reason);
      }
      return;
    }
    setSelected(hitAt(sx, sy));
  };
  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    const { sx, sy } = posOf(e);
    cam.current = zoomAt(cam.current, view.current, mapSize, cam.current.zoom + (e.deltaY < 0 ? 1 : -1), sx, sy);
    setZoomLabel(cam.current.zoom);
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
    else if (e.key === ' ') rt.togglePause();
    else if (e.key === 'Escape') { if (buildKind) cancelBuild(); else setSelected(null); }
    else return;
    e.preventDefault();
  };

  const pickBuild = (kind: string) => { setBuildKind(kind); setSelected(null); setGhostMsg('Move over the map to place it. Esc cancels.'); };
  const drawerBody = drawer === 'build' ? <BuildDrawer rt={rt} onPick={pickBuild} active={buildKind} />
    : drawer === 'jobs' ? <JobsDrawer rt={rt} />
      : drawer === 'log' ? <LogDrawer rt={rt} />
        : drawer === 'help' ? <HelpDrawer rt={rt} /> : null;

  return (
    <div className="cw-root" data-visible={visible ? '1' : '0'} ref={hostRef} onKeyDown={onKey}>
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
      <HintCard rt={rt} />
      <Notice rt={rt} />
      {drawerBody && <aside className="cw-drawer" aria-label={drawer ?? ''}>{drawerBody}<button type="button" className="cw-drawer-close" onClick={() => setDrawer(null)}>Close</button></aside>}
      <Toolbar drawer={drawer} setDrawer={setDrawer} home={goHome} />
    </div>
  );
}
