import { HINT_GLOBAL_COOLDOWN } from './data/config';
import { stepExtras } from './extras';
import { capacity, doneBuildings, foodDays, hasCapability, isNight, maybeVisitor, pushEvent, seasonOf, sleepCapacity, stepSim, type CivSim } from './sim';
import type { ActiveHint, CivState } from './types';
import { TILE } from './world';

/* ============================================================================
   HINTS, ALERTS AND EVENTS (master design §5, §4.15). Villagers notice REAL
   constraints in the simulation and say so in human language. A hint never claims a
   combination is valid (the merge engine decides) and never names a recipe: it
   describes a problem, suggests a direction, and at most points at the capability or
   building that is already unlocked. Hints only trigger when their preconditions are
   true, have cooldowns, escalate in strength when ignored, and resolve when the
   problem is gone.
   ========================================================================== */

export type HintLevel = 'observation' | 'suggestion' | 'guidance';
const LEVELS: HintLevel[] = ['observation', 'suggestion', 'guidance'];

export interface HintDef {
  id: string;
  /** Preconditions: the hint is only eligible while this is true. */
  trigger: (sim: CivSim) => boolean;
  /** Resolved when the underlying problem is fixed (also stops eligibility). */
  resolved: (sim: CivSim) => boolean;
  priority: number; // higher first: survival, then new capabilities, then optional ideas
  speakerRole: 'gatherer' | 'builder' | 'elder' | 'toolmaker';
  cooldownTicks: number;
  repeat: 'once' | 'cooldown';
  text: (sim: CivSim) => Record<HintLevel, string>;
}

const nearestTreeDist = (sim: CivSim) => {
  const f = sim.s.buildings[0];
  let best = Infinity;
  for (const n of sim.s.nodes) if (n.kind === 'tree' && n.amount > 0) best = Math.min(best, Math.hypot(n.x - f.x, n.y - f.y));
  return best;
};
const pctFull = (s: CivState) => Math.max(s.stock.food, s.stock.wood, s.stock.stone) / capacity(s);

export const HINTS: HintDef[] = [
  {
    id: 'food_low', priority: 100, speakerRole: 'gatherer', cooldownTicks: 120, repeat: 'cooldown',
    trigger: ({ s }) => foodDays(s) < Math.min(1.5, s.settings.foodReserveDays),
    resolved: ({ s }) => foodDays(s) >= s.settings.foodReserveDays,
    text: () => ({
      observation: 'We are eating faster than we gather. The pile by the fire is thin.',
      suggestion: 'More hands on the berries would help, before anything else.',
      guidance: 'Raise the Food priority in Jobs so more of us gather berries.',
    }),
  },
  {
    id: 'no_shelter', priority: 80, speakerRole: 'builder', cooldownTicks: 200, repeat: 'cooldown',
    trigger: ({ s }) => doneBuildings(s, 'shelter').length === 0 && !s.buildings.some(b => b.kind === 'shelter') && (isNight(s.tick) || s.tick > 300),
    resolved: ({ s }) => s.buildings.some(b => b.kind === 'shelter'),
    text: () => ({
      observation: 'Sleeping on bare ground by the fire leaves everyone worn out by morning.',
      suggestion: 'A roof of branches would let us rest properly.',
      guidance: 'Open Build and place a Shelter near the fire. It costs wood.',
    }),
  },
  {
    id: 'housing_full', priority: 70, speakerRole: 'builder', cooldownTicks: 300, repeat: 'cooldown',
    trigger: ({ s }) => doneBuildings(s, 'shelter').length > 0 && s.citizens.length > sleepCapacity(s),
    resolved: ({ s }) => s.citizens.length <= sleepCapacity(s),
    text: ({ s }) => ({
      observation: `Not everyone has a place to sleep: ${s.citizens.length} of us and room for ${sleepCapacity(s)}.`,
      suggestion: 'Another shelter would stop us sleeping rough.',
      guidance: 'Build one more Shelter. Newcomers will only stay where there is room.',
    }),
  },
  {
    id: 'storage_full', priority: 60, speakerRole: 'elder', cooldownTicks: 240, repeat: 'cooldown',
    trigger: ({ s }) => pctFull(s) >= 0.95 && doneBuildings(s, 'storage').length === 0,
    resolved: ({ s }) => doneBuildings(s, 'storage').length > 0 || pctFull(s) < 0.8,
    text: ({ s }) => (hasCapability(s, 'food_storage')
      ? {
        observation: 'Our pile is overflowing and the rain gets at what we leave out.',
        suggestion: 'We know how to keep things dry now. A proper store would help.',
        guidance: 'Place a Storage building from the Build panel.',
      }
      : {
        observation: 'The rain keeps soaking the supplies we leave outside.',
        suggestion: 'We should find a way to keep supplies dry. Maybe the Merging bench knows something.',
        guidance: 'A covered place for goods might solve this. Try combining what you have in Merging.',
      }),
  },
  {
    id: 'wood_far', priority: 40, speakerRole: 'gatherer', cooldownTicks: 400, repeat: 'cooldown',
    trigger: sim => nearestTreeDist(sim) > 11 && sim.s.priorities.wood > 0,
    resolved: sim => nearestTreeDist(sim) <= 9,
    text: () => ({
      observation: 'The trees near camp are gone. Fetching wood means a long walk now.',
      suggestion: 'Building closer to the far woods would cut the carrying.',
      guidance: 'Select a worker to see how far they walk; place new buildings nearer to what you gather.',
    }),
  },
  {
    id: 'workshop_ready', priority: 50, speakerRole: 'toolmaker', cooldownTicks: 300, repeat: 'once',
    trigger: ({ s }) => hasCapability(s, 'stone_tool') && !s.buildings.some(b => b.kind === 'workshop'),
    resolved: ({ s }) => s.buildings.some(b => b.kind === 'workshop'),
    text: () => ({
      observation: 'Someone worked out how to shape stone. We have nowhere to do it properly.',
      suggestion: 'A work yard would let us make tools instead of just talking about them.',
      guidance: 'Place a Workshop from the Build panel. A worker there turns wood and stone into tools.',
    }),
  },
  {
    id: 'farm_ready', priority: 45, speakerRole: 'elder', cooldownTicks: 300, repeat: 'once',
    trigger: ({ s }) => hasCapability(s, 'agriculture') && !s.buildings.some(b => b.kind === 'farm'),
    resolved: ({ s }) => s.buildings.some(b => b.kind === 'farm'),
    text: () => ({
      observation: 'We have learned that seeds can be planted. The berry bushes will not last forever.',
      suggestion: 'Tilled ground by the river could feed us year after year.',
      guidance: 'Place a Farm plot from the Build panel on grass or dirt.',
    }),
  },
  {
    id: 'winter_prep', priority: 55, speakerRole: 'elder', cooldownTicks: 400, repeat: 'cooldown',
    trigger: ({ s }) => seasonOf(s.tick) === 'Autumn' && foodDays(s) < s.settings.foodReserveDays + 2,
    resolved: ({ s }) => foodDays(s) >= s.settings.foodReserveDays + 2 || seasonOf(s.tick) === 'Winter',
    text: () => ({
      observation: 'We have enough for now, but not for the cold months.',
      suggestion: 'The berries stop in winter. We should lay by more food while they last.',
      guidance: 'Raise the Food priority and the food reserve target in Help before winter arrives.',
    }),
  },
  {
    id: 'missing_tool', priority: 35, speakerRole: 'toolmaker', cooldownTicks: 400, repeat: 'once',
    trigger: ({ s }) => hasCapability(s, 'stone_tool') && doneBuildings(s, 'workshop').length > 0 && s.stock.tools === 0 && s.priorities.craft === 0,
    resolved: ({ s }) => s.stock.tools > 0 || s.priorities.craft > 0,
    text: () => ({
      observation: 'This work would be easier with a proper tool.',
      suggestion: 'The workshop stands idle. Someone could be making tools there.',
      guidance: 'Turn the Tools job on in Jobs; a worker makes one tool from 2 wood and 1 stone.',
    }),
  },
  {
    id: 'idle_crew', priority: 30, speakerRole: 'gatherer', cooldownTicks: 300, repeat: 'cooldown',
    trigger: ({ s }) => s.tick > 120 && s.citizens.filter(c => c.task.kind === 'idle' && c.idleReason).length >= 2,
    resolved: ({ s }) => s.citizens.filter(c => c.task.kind === 'idle' && c.idleReason).length < 2,
    text: ({ s }) => {
      const why = s.citizens.find(c => c.idleReason)?.idleReason ?? 'nothing to do';
      return {
        observation: `Some of us are standing about: ${why.toLowerCase()}.`,
        suggestion: 'Check the Jobs panel. Something may be switched off.',
        guidance: 'Turn up a job priority, or build something for us to work on.',
      };
    },
  },
];

const hintState = (s: CivState, id: string) => (s.hints[id] ??= { lastShown: -Infinity as number, shownCount: 0, resolved: false });

function show(sim: CivSim, def: HintDef, level: HintLevel) {
  const { s } = sim;
  const st = hintState(s, def.id);
  const speaker = s.citizens.find(c => c.task.kind !== 'rest')?.name ?? 'Someone';
  const h: ActiveHint = { id: def.id, role: def.speakerRole, level, speaker, text: def.text(sim)[level], tick: s.tick };
  s.activeHint = h;
  st.lastShown = s.tick;
  st.shownCount++;
  pushEvent(s, 'hint', { hint: def.id, level }, `${speaker}: "${h.text}"`);
}

/** Run every few ticks. Resolves the active hint when its problem is gone, otherwise offers the best eligible hint. */
export function evaluateHints(sim: CivSim): void {
  const { s } = sim;
  if (s.activeHint) {
    const def = HINTS.find(h => h.id === s.activeHint!.id);
    if (!def || def.resolved(sim) || !def.trigger(sim)) {
      if (def && def.resolved(sim)) { hintState(s, def.id).resolved = true; pushEvent(s, 'recovery', { hint: def.id }, 'That problem has been dealt with.'); }
      s.activeHint = null;
    }
    return;
  }
  const lastAny = Math.max(...Object.values(s.hints).map(h => h.lastShown), -Infinity);
  if (s.tick - lastAny < HINT_GLOBAL_COOLDOWN) return;
  const eligible = HINTS.filter(d => {
    const st = s.hints[d.id];
    if (d.resolved(sim) && !d.trigger(sim)) return false;
    if (!d.trigger(sim)) return false;
    if (st && d.repeat === 'once' && st.shownCount > 0) return false;
    if (st && s.tick - st.lastShown < d.cooldownTicks) return false;
    return true;
  }).sort((a, b) => b.priority - a.priority);
  const def = eligible[0];
  if (!def) return;
  const st = hintState(s, def.id);
  show(sim, def, LEVELS[Math.min(st.shownCount, LEVELS.length - 1)]);
}

/** The player dismisses the current hint; it will not return before its cooldown. */
export function dismissHint(s: CivState) {
  if (!s.activeHint) return;
  hintState(s, s.activeHint.id).lastShown = s.tick;
  s.activeHint = null;
}

/** The player asks for a stronger version of the current hint. */
export function askMoreHint(sim: CivSim) {
  const { s } = sim;
  if (!s.activeHint) return;
  const def = HINTS.find(h => h.id === s.activeHint!.id);
  if (!def) return;
  const next = LEVELS[Math.min(LEVELS.indexOf(s.activeHint.level) + 1, LEVELS.length - 1)];
  s.activeHint = { ...s.activeHint, level: next, text: def.text(sim)[next] };
}

export interface Alert { id: string; severity: 'info' | 'warning' | 'critical'; text: string; focus?: { x: number; y: number } }

/** Alerts are derived from state (never stored) so they cannot go stale; only important problems appear. */
export function computeAlerts(s: CivState): Alert[] {
  const out: Alert[] = [];
  const fire = s.buildings[0];
  const days = foodDays(s);
  if (days < 1) out.push({ id: 'food_critical', severity: 'critical', text: `Food will run out in ${Math.max(0, days).toFixed(1)} days`, focus: { x: fire.x * TILE, y: fire.y * TILE } });
  else if (days < s.settings.foodReserveDays) out.push({ id: 'food_low', severity: 'warning', text: `Food reserve is ${days.toFixed(1)} days`, focus: { x: fire.x * TILE, y: fire.y * TILE } });
  if (pctFull(s) >= 0.95) out.push({ id: 'storage_full', severity: 'warning', text: 'Storage is full: gathering of that good has stopped' });
  if (sleepCapacity(s) > 0 && s.citizens.length > sleepCapacity(s)) out.push({ id: 'housing_full', severity: 'warning', text: `Only ${sleepCapacity(s)} places to sleep for ${s.citizens.length} people` });
  const starving = s.citizens.filter(c => c.hunger >= 100).length;
  if (starving) out.push({ id: 'starving', severity: 'critical', text: `${starving} ${starving === 1 ? 'person is' : 'people are'} too hungry to work well` });
  return out;
}

/** One full tick of the world: simulation, shortage/recovery events, then hints. */
export function stepWorld(sim: CivSim): void {
  stepSim(sim);
  const { s } = sim;
  if (s.tick % 10 === 0) {
    const days = foodDays(s);
    const inShortage = s.milestones.includes('shortage_open');
    if (days < 1 && !inShortage && s.tick > 60) {
      s.milestones.push('shortage_open');
      pushEvent(s, 'shortage', { food: s.stock.food, days: Number(days.toFixed(2)) }, 'Food is running short. Everyone is feeling it.');
    } else if (days >= s.settings.foodReserveDays && inShortage) {
      s.milestones.splice(s.milestones.indexOf('shortage_open'), 1);
      pushEvent(s, 'recovery', { food: s.stock.food }, 'The food reserve has recovered.');
    }
  }
  stepExtras(sim);
  maybeVisitor(sim);
  if (s.tick % 20 === 0) evaluateHints(sim);
}
