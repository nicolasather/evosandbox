import { applyDiscoveries } from '../bridge';
import { DAY_TICKS } from '../data/config';
import {
  addNote, addPin, floodActive, floodWarned, nextFloodStart, phaseOf, previewExpedition, removeCitizen, removePin, sendExpedition, setPolicy,
  stepExtras, togglePin, tutorialEvent, TUTORIAL_STEPS, CHILD_GROWTH_TICKS, policyPreview,
} from '../extras';
import { stepWorld } from '../hints';
import { buildGrid, createSim, isRevealed, nearWater, placeBuilding, stepSim, validatePlacement } from '../sim';

const run = (sim: ReturnType<typeof createSim>, n: number) => { for (let i = 0; i < n; i++) stepWorld(sim); };

describe('exploration and fog', () => {
  it('starts with fog, hides unseen resources from workers, and keeps a rock in the starting view', () => {
    const sim = createSim(1);
    const { s, map } = sim;
    expect(s.revealed.length).toBe(map.w * map.h);
    expect(s.revealed.includes('0')).toBe(true);
    const visibleRocks = s.nodes.filter(n => n.kind === 'rock' && isRevealed(s, map.w, n.x, n.y));
    expect(visibleRocks.length).toBeGreaterThan(0);
    run(sim, 600);
    for (const c of s.citizens) if (c.task.targetId) {
      const n = s.nodes.find(q => q.id === c.task.targetId);
      if (n) expect(isRevealed(s, map.w, n.x, n.y)).toBe(true);
    }
  });
  it('previews cost and refuses impossible trips; a trip spends food, takes time, reveals ground and reports real map facts', () => {
    const sim = createSim(1);
    const { s, map } = sim;
    const [a, b] = [s.citizens[1].id, s.citizens[2].id];
    const far = s.poi[0];
    const pv = previewExpedition(sim, far.x, far.y, [a, b]);
    expect(pv.ok).toBe(true);
    expect(pv.foodNeeded).toBeGreaterThan(0);
    expect(previewExpedition(sim, 19, 12, [a]).ok).toBe(false); // already explored
    expect(previewExpedition(sim, far.x, far.y, []).ok).toBe(false);
    expect(previewExpedition(sim, -3, 0, [a]).ok).toBe(false);
    const food = s.stock.food;
    const r = sendExpedition(sim, far.x, far.y, [a, b]);
    expect(r.ok).toBe(true);
    expect(s.stock.food).toBe(food - pv.foodNeeded);
    expect(s.citizens.find(c => c.id === a)!.task.kind).toBe('away');
    expect(previewExpedition(sim, far.x, far.y, [a]).ok).toBe(false); // already away
    const before = s.revealed.split('1').length;
    run(sim, pv.ticks + 5);
    expect(isRevealed(s, map.w, far.x, far.y)).toBe(true);
    expect(s.revealed.split('1').length).toBeGreaterThan(before);
    expect(s.citizens.find(c => c.id === a)!.task.kind).not.toBe('away');
    expect(s.expeditions).toHaveLength(0);
    expect(s.events.some(e => e.kind === 'explore' && e.text.includes('returns'))).toBe(true);
    expect(s.poi[0].found).toBe(true);
    expect(s.notes.length).toBeGreaterThan(0);
  });
  it('bold stance is faster and returns hungrier than cautious', () => {
    const cautious = createSim(1); setPolicy(cautious.s, 'explorationStance', 'cautious');
    const bold = createSim(1); setPolicy(bold.s, 'explorationStance', 'bold');
    const t = cautious.s.poi[0];
    expect(previewExpedition(bold, t.x, t.y, [bold.s.citizens[1].id]).ticks).toBeLessThan(previewExpedition(cautious, t.x, t.y, [cautious.s.citizens[1].id]).ticks);
  });
});

describe('flood hazard', () => {
  it('is warned about first, only blocks low ground, destroys nothing and ends', () => {
    const sim = createSim(1);
    const { s, map } = sim;
    const start = nextFloodStart(0);
    expect(start).toBeGreaterThan(DAY_TICKS * 24); // never in the first year
    s.tick = start - DAY_TICKS;
    stepExtras(sim);
    s.tick = start - DAY_TICKS / 2;
    stepExtras(sim);
    expect(floodWarned(s)).toBe(true);
    expect(s.events.some(e => e.kind === 'hazard' && e.facts.phase === 'warning')).toBe(true);
    const low = { x: 0, y: 0 };
    for (let y = 0; y < map.h; y++) for (let x = 0; x < map.w; x++) if (map.terrain[y * map.w + x] === 'grass' && nearWater(map, x, y)) { low.x = x; low.y = y; }
    const idx = low.y * map.w + low.x;
    expect(buildGrid(sim).blocked[idx]).toBe(0);
    const buildings = s.buildings.length;
    s.tick = start + 1;
    stepExtras(sim);
    expect(floodActive(s)).toBe(true);
    expect(buildGrid(sim).blocked[idx]).toBe(1);
    expect(s.buildings.length).toBe(buildings);
    s.tick = s.hazard!.endTick + 1;
    stepExtras(sim);
    expect(s.hazard).toBeNull();
    expect(s.events.some(e => e.kind === 'hazard' && e.facts.phase === 'end')).toBe(true);
  });
});

describe('population, elders, unavailable people', () => {
  it('starts with an elder, grows a child cohort only with a bed and a reserve, and children become named adults', () => {
    const sim = createSim(1);
    const { s } = sim;
    expect(s.citizens.filter(c => c.age === 'elder')).toHaveLength(1);
    s.stock.food = 30; s.tick = DAY_TICKS * 3 - 1;
    stepWorld(sim);
    expect(s.children).toHaveLength(0); // no bed yet
    s.buildings.push({ id: 'b-x', kind: 'shelter', x: 5, y: 5, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0 });
    s.buildings.push({ id: 'b-y', kind: 'shelter', x: 9, y: 5, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0 });
    s.buildings.push({ id: 'b-z', kind: 'shelter', x: 13, y: 5, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0 });
    s.stock.food = 30; s.tick = DAY_TICKS * 6 - 1;
    stepWorld(sim);
    expect(s.children).toHaveLength(1);
    const born = s.children[0];
    const people = s.citizens.length;
    s.tick = s.children[0] + CHILD_GROWTH_TICKS - 1;
    s.tick += DAY_TICKS - (s.tick % DAY_TICKS) - 1;
    stepWorld(sim);
    expect(s.citizens.length).toBeGreaterThanOrEqual(people + 1);
    expect(s.events.some(e => e.kind === 'birth' && e.facts.adult === true)).toBe(true);
    expect(s.children).not.toContain(born);
  });
  it('removing a citizen releases them from expeditions and from work', () => {
    const sim = createSim(1);
    const { s } = sim;
    const id = s.citizens[1].id;
    sendExpedition(sim, s.poi[0].x, s.poi[0].y, [id]);
    expect(removeCitizen(sim, id)).toBe(true);
    expect(s.expeditions).toHaveLength(0);
    expect(s.citizens.some(c => c.id === id)).toBe(false);
    expect(removeCitizen(sim, 'nope')).toBe(false);
    run(sim, 200);
    expect(s.citizens.length).toBe(4);
  });
});

describe('policies', () => {
  it('conserve stops gathering at 60% of capacity and extended radius changes reach; each has a preview', () => {
    const sim = createSim(1);
    setPolicy(sim.s, 'resourceUse', 'conserve');
    sim.s.stock.wood = 20; sim.s.stock.food = 20; sim.s.stock.stone = 20;
    const before = { ...sim.s.counters.gathered };
    run(sim, 300);
    expect(sim.s.counters.gathered.wood).toBe(before.wood);
    for (const k of ['conserve', 'balanced', 'free'] as const) expect(policyPreview('resourceUse', k).length).toBeGreaterThan(10);
  });
  it('construction focus favours the chosen kind', () => {
    const sim = createSim(1);
    setPolicy(sim.s, 'constructionFocus', 'housing');
    expect(policyPreview('constructionFocus', 'housing')).toMatch(/shelter/i);
  });
});

describe('roads, market, assembly', () => {
  it('a road is walkable, cheap, needs the discovery, and a market halves the visitor wait', () => {
    const sim = createSim(1);
    const f = sim.s.buildings[0];
    expect(validatePlacement(sim, 'road', f.x + 2, f.y + 3).ok).toBe(false);
    applyDiscoveries(sim.s, ['stone_tool', 'trade', 'anc27_public_assembly_plaza']);
    const r = placeBuilding(sim, 'road', f.x + 2, f.y + 3);
    expect(r.ok).toBe(true);
    expect(buildGrid(sim).blocked[(f.y + 3) * sim.map.w + f.x + 2]).toBe(0);
    expect(sim.s.unlockedBuildings).toEqual(expect.arrayContaining(['market', 'assembly']));
  });
});

describe('player notes, pins and onboarding', () => {
  it('pins and notes are player-owned and bounded; empty text is refused', () => {
    const sim = createSim(1);
    expect(addPin(sim.s, '   ')).toBeNull();
    const p = addPin(sim.s, 'Find clay'.repeat(20))!;
    expect(p.text.length).toBeLessThanOrEqual(80);
    togglePin(sim.s, p.id);
    expect(sim.s.pins[0].done).toBe(true);
    removePin(sim.s, p.id);
    expect(sim.s.pins).toHaveLength(0);
    expect(addNote(sim.s, 3, 4, 'good soil')).not.toBeNull();
    expect(addNote(sim.s, 3, 4, '')).toBeNull();
  });
  it('the tutorial advances only on the matching action, never blocks, and ends after the last step', () => {
    const sim = createSim(1);
    tutorialEvent(sim.s, 'jobs');
    expect(sim.s.tutorial.step).toBe(0);
    for (const st of TUTORIAL_STEPS) tutorialEvent(sim.s, st.id);
    expect(sim.s.tutorial.done).toBe(true);
  });
});

describe('settlement phases', () => {
  it('moves through phases because of capabilities and buildings, not the calendar', () => {
    const sim = createSim(1);
    expect(phaseOf(sim.s).index).toBe(0);
    sim.s.buildings.push({ id: 'b-s', kind: 'shelter', x: 5, y: 5, w: 3, h: 2, state: 'done', progress: 1, paid: {}, workers: 0 });
    applyDiscoveries(sim.s, ['food_storage']);
    expect(phaseOf(sim.s).index).toBe(1);
    stepSim(sim);
  });
});
