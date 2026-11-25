'use client';

import { useCallback, useEffect, useMemo, useRef, useState, type KeyboardEvent, type PointerEvent, type WheelEvent } from 'react';
import { BUILDING_LABEL, NODE_LABEL, TILE, createWorld, hitTest, type Pick } from '@/lib/civ/world';
import { clampCamera, recenter, screenToWorld, zoomAt, type Camera, type Size } from '@/lib/civ/camera';
import { AssetStore } from './assets';
import { buildTerrainLayer, drawFrame } from './render';

/* The settlement viewport: canvas rendering, pan/zoom, hover and selection.
   React owns only the panels; the canvas draws from the world state directly. */

const START_ZOOM = 2;

function describe(p: Pick | null): { title: string; lines: string[] } | null {
  if (!p) return null;
  if (p.type === 'node') return { title: NODE_LABEL[p.node.kind], lines: [`Remaining: ${p.node.amount}`, `Tile ${p.node.x}, ${p.node.y}`] };
  if (p.type === 'building') return { title: BUILDING_LABEL[p.building.kind], lines: [`Footprint ${p.building.w} x ${p.building.h}`, 'Gathering place for the settlement'] };
  return { title: `${p.terrain[0].toUpperCase()}${p.terrain.slice(1)}`, lines: [p.terrain === 'water' ? 'Cannot build or walk here' : 'Open ground', `Tile ${p.x}, ${p.y}`] };
}

export function CivWorldPane({ visible }: { visible: boolean }) {
  const world = useMemo(() => createWorld(1), []);
  const mapSize: Size = useMemo(() => ({ w: world.w * TILE, h: world.h * TILE }), [world]);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const hostRef = useRef<HTMLDivElement>(null);
  const assets = useMemo(() => new AssetStore(), []);
  const ground = useRef<HTMLCanvasElement | null>(null);
  const groundVersion = useRef(-1);
  const view = useRef<Size>({ w: 800, h: 600 });
  const dpr = useRef(1);
  const cam = useRef<Camera>({ cx: 19.5 * TILE, cy: 12.5 * TILE, zoom: START_ZOOM });
  const hover = useRef<Pick | null>(null);
  const reduced = useRef(false);
  const drag = useRef<{ x: number; y: number; cx: number; cy: number; moved: boolean } | null>(null);
  const [selected, setSelected] = useState<Pick | null>(null);
  const selectedRef = useRef<Pick | null>(null);
  useEffect(() => { selectedRef.current = selected; }, [selected]);
  const visibleRef = useRef(visible);
  useEffect(() => { visibleRef.current = visible; }, [visible]);
  const [zoomLabel, setZoomLabel] = useState(START_ZOOM);

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
    reduced.current = mq.matches;
    const on = () => { reduced.current = mq.matches; };
    mq.addEventListener('change', on);
    return () => mq.removeEventListener('change', on);
  }, []);

  // size the canvas to its pane
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

  // render loop: runs only while the pane is on screen and the tab is visible
  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (!canvas || !ctx) return;
    let raf = 0;
    const frame = (now: number) => {
      raf = requestAnimationFrame(frame);
      if (!visibleRef.current || document.hidden) return;
      if (!ground.current || groundVersion.current !== assets.version) {
        ground.current = buildTerrainLayer(world, assets);
        groundVersion.current = assets.version;
      }
      drawFrame(ctx, world, assets, ground.current, {
        cam: cam.current, view: view.current, dpr: dpr.current, now, animate: !reduced.current,
        hover: hover.current, selected: selectedRef.current,
      });
    };
    raf = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(raf);
  }, [world, assets]);

  const worldAt = (e: { clientX: number; clientY: number }) => {
    const r = canvasRef.current!.getBoundingClientRect();
    return { sx: e.clientX - r.left, sy: e.clientY - r.top };
  };

  const onPointerDown = (e: PointerEvent<HTMLCanvasElement>) => {
    e.currentTarget.setPointerCapture(e.pointerId);
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
    const { sx, sy } = worldAt(e);
    const w = screenToWorld(cam.current, view.current, sx, sy);
    hover.current = hitTest(world, w.x, w.y);
  };
  const onPointerUp = (e: PointerEvent<HTMLCanvasElement>) => {
    const d = drag.current;
    drag.current = null;
    if (e.currentTarget.hasPointerCapture(e.pointerId)) e.currentTarget.releasePointerCapture(e.pointerId);
    if (d && !d.moved) {
      const { sx, sy } = worldAt(e);
      const w = screenToWorld(cam.current, view.current, sx, sy);
      setSelected(hitTest(world, w.x, w.y));
    }
  };
  const onWheel = (e: WheelEvent<HTMLCanvasElement>) => {
    const { sx, sy } = worldAt(e);
    cam.current = zoomAt(cam.current, view.current, mapSize, cam.current.zoom + (e.deltaY < 0 ? 1 : -1), sx, sy);
    setZoomLabel(cam.current.zoom);
  };
  const zoomBy = (dz: number) => {
    cam.current = zoomAt(cam.current, view.current, mapSize, cam.current.zoom + dz, view.current.w / 2, view.current.h / 2);
    setZoomLabel(cam.current.zoom);
  };
  const goHome = useCallback(() => {
    const fire = world.buildings[0];
    cam.current = recenter({ x: (fire.x + 0.5) * TILE, y: (fire.y + 0.5) * TILE }, START_ZOOM, view.current, mapSize);
    setZoomLabel(cam.current.zoom);
  }, [world, mapSize]);
  const onKey = (e: KeyboardEvent<HTMLCanvasElement>) => {
    const step = 48 / cam.current.zoom;
    const move = (dx: number, dy: number) => { cam.current = clampCamera({ ...cam.current, cx: cam.current.cx + dx, cy: cam.current.cy + dy }, view.current, mapSize); };
    if (e.key === 'ArrowLeft') move(-step, 0);
    else if (e.key === 'ArrowRight') move(step, 0);
    else if (e.key === 'ArrowUp') move(0, -step);
    else if (e.key === 'ArrowDown') move(0, step);
    else if (e.key === '+' || e.key === '=') zoomBy(1);
    else if (e.key === '-') zoomBy(-1);
    else if (e.key === 'Home') goHome();
    else if (e.key === 'Escape') setSelected(null);
    else return;
    e.preventDefault();
  };

  const info = describe(selected);

  return (
    <div className="cw-root" data-visible={visible ? '1' : '0'} ref={hostRef}>
      <canvas ref={canvasRef} className="cw-canvas" tabIndex={0} role="application"
        aria-label="Settlement map. Arrow keys pan, plus and minus zoom, Home recentres."
        onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={onPointerUp} onPointerCancel={onPointerUp}
        onPointerLeave={() => { hover.current = null; }} onWheel={onWheel} onKeyDown={onKey} />
      <div className="cw-tools" role="group" aria-label="Map view">
        <button type="button" onClick={() => zoomBy(1)} aria-label="Zoom in">+</button>
        <span className="cw-zoom" aria-live="polite">{zoomLabel}x</span>
        <button type="button" onClick={() => zoomBy(-1)} aria-label="Zoom out">-</button>
        <button type="button" onClick={goHome} aria-label="Recentre on the campfire" title="Recentre">Home</button>
      </div>
      {info && (
        <div className="cw-info" role="status">
          <strong>{info.title}</strong>
          {info.lines.map(l => <span key={l}>{l}</span>)}
          <button type="button" onClick={() => setSelected(null)} aria-label="Clear selection">Close</button>
        </div>
      )}
    </div>
  );
}
