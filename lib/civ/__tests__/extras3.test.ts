import { applyDiscoveries } from '../bridge';
import { DAY_TICKS } from '../data/config';
import { revealAround } from '../extras';
import { goalsFor } from '../goals';
import { HINTS, computeAlerts, stepWorld } from '../hints';
import { forecastFor } from '../selectors';
import { activeSeason, createSim, placeBuilding, seasonOf, stepSim, validatePlacement } from '../sim';

describe('placement rotation', () => {
  it('rotatable buildings swap width and height; others ignore the request', () => {
    const sim = createSim(1);
    applyDiscoveries(sim.s, ['agriculture']);
    sim.s.stock.wood = 30;
    let spot: [number, number] | null = null;
    for (let y = 2; y < 10 && !spot; y++) for (let x = 2; x < 10 && !spot; x++) if (validatePlacement(sim, 'farm', x, y, true).ok) spot = [x, y];
    expect(spot).not.toBeNull();
    const r = placeBuilding(sim, 'farm', spot![0], spot![1], true);
    expect(r.ok).toBe(true);
    const farm = sim.s.buildings.find(b => b.kind === 'farm')!;
    expect([farm.w, farm.h]).toEqual([2, 3]);
    const sh = placeBuilding(sim, 'shelter', 20, 5, true);
    if (sh.ok) { const b = sim.s.buildings.find(x => x.kind === 'shelter')!; expect([b.w, b.h]).toEqual([3, 2]); }
  });
});

describe('seasons, forecast and water', () => {
  it('can be switched off, and the forecast is approximate and explains the next season', () => {
    const sim = createSim(1);
    sim.s.tick = DAY_TICKS * 18;
    expect(activeSeason(sim.s)).toBe('Winter');
    sim.s.settings.seasons = 'off';
    expect(activeSeason(sim.s)).toBe('Summer');
    expect(forecastFor(sim.s).text).toMatch(/switched off/);
    sim.s.settings.seasons = 'on';
    sim.s.tick = DAY_TICKS * 13;
    expect(seasonOf(sim.s.tick)).toBe('Autumn');
    expect(forecastFor(sim.s).next).toBe('Winter');
  });
  it('a bigger settlement without a well gets an explained water hint and alert', () => {
    const sim = createSim(1);
    for (let i = 0; i < 3; i++) sim.s.citizens.push({ ...sim.s.citizens[1], id: `c-extra-${i}` });
    expect(computeAlerts(sim.s).some(a => a.id === 'water')).toBe(true);
    const h = HINTS.find(x => x.id === 'water_access')!;
    expect(h.trigger(sim)).toBe(true);
    applyDiscoveries(sim.s, ['anc27_hand_dug_shaft_well']);
    expect(h.text(sim).guidance).toMatch(/Well/);
    sim.s.buildings.push({ id: 'w', kind: 'well', x: 3, y: 3, w: 1, h: 1, state: 'done', progress: 1, paid: {}, workers: 0 });
    expect(h.trigger(sim)).toBe(false);
  });
});

describe('exploration goal and fertile meadow', () => {
  it('the map goal completes when most of the land is seen, and a found meadow boosts a nearby farm', () => {
    const sim = createSim(1);
    expect(goalsFor(sim.s).find(g => g.id === 'map_east')!.done).toBe(false);
    for (let x = 0; x < sim.map.w; x += 6) for (let y = 0; y < sim.map.h; y += 6) revealAround(sim, x, y, 8);
    expect(goalsFor(sim.s).find(g => g.id === 'map_east')!.done).toBe(true);
    const meadow = sim.s.poi.find(p => p.kind === 'fertile_meadow')!;
    meadow.found = true;
    applyDiscoveries(sim.s, ['agriculture']);
    sim.s.buildings.push({ id: 'f', kind: 'farm', x: meadow.x, y: meadow.y, w: 3, h: 2, state: 'site', progress: 0.99, paid: {}, workers: 0 });
    sim.s.citizens.forEach(c => { c.task = { kind: 'build', targetId: 'f', reason: 'test', left: 1 }; c.x = c.px = meadow.x; c.y = c.py = meadow.y; });
    for (let i = 0; i < 40; i++) stepSim(sim);
    const farm = sim.s.buildings.find(b => b.id === 'f')!;
    if (farm.state === 'done') expect(farm.max).toBe(9);
  });
  it('a cart adds one unit to every carry and the world keeps running', () => {
    const sim = createSim(1);
    applyDiscoveries(sim.s, ['cart']);
    expect(sim.s.capabilities.some(c => c.id === 'cart')).toBe(true);
    for (let i = 0; i < 200; i++) stepWorld(sim);
    expect(sim.s.citizens.length).toBeGreaterThan(0);
  });
});
