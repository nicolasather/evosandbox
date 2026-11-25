import { capacity, doneBuildings, foodDays, hasCapability } from './sim';
import type { CivState } from './types';

/* Emergent goals and project cards (master design section 41). Suggestions come from
   the settlement's actual bottlenecks: when food is critical nothing optional is
   offered ahead of it, and every goal can simply be ignored. */

export interface Goal {
  id: string;
  kind: 'survival' | 'infrastructure' | 'discovery' | 'community';
  title: string;
  detail: string;
  done: boolean;
}

export function goalsFor(s: CivState): Goal[] {
  const list: Goal[] = [];
  const reserveOk = foodDays(s) >= s.settings.foodReserveDays;
  list.push({ id: 'food_reserve', kind: 'survival', title: `Keep ${s.settings.foodReserveDays} days of food in reserve`, detail: 'Raise the Food priority, or add a second food source.', done: reserveOk });
  const hasShelter = s.buildings.some(b => b.kind === 'shelter');
  list.push({ id: 'shelter', kind: 'infrastructure', title: 'Build a shelter', detail: 'Open Build and place a Shelter near the fire.', done: doneBuildings(s, 'shelter').length > 0 });
  list.push({ id: 'dry_goods', kind: 'discovery', title: 'Find a way to keep supplies dry', detail: 'Experiment in Merging. A discovery can unlock protected storage.', done: hasCapability(s, 'food_storage') });
  if (hasCapability(s, 'food_storage')) list.push({ id: 'storage', kind: 'infrastructure', title: 'Build a storage building', detail: `Raises capacity above ${capacity(s)}.`, done: doneBuildings(s, 'storage').length > 0 });
  list.push({ id: 'shape_stone', kind: 'discovery', title: 'Learn to shape stone', detail: 'Experiment in Merging with what you have gathered.', done: hasCapability(s, 'stone_tool') });
  if (hasCapability(s, 'stone_tool')) {
    list.push({ id: 'workshop', kind: 'infrastructure', title: 'Build a workshop', detail: 'A worker there turns wood and stone into tools.', done: doneBuildings(s, 'workshop').length > 0 });
    list.push({ id: 'first_tool', kind: 'infrastructure', title: 'Make the first tool', detail: 'Turn the Tools job on once the workshop stands.', done: s.milestones.includes('first_craft') });
  }
  list.push({ id: 'plant', kind: 'discovery', title: 'Learn to plant', detail: 'Wild berries will not last forever. Look for a way to grow food.', done: hasCapability(s, 'agriculture') });
  if (hasCapability(s, 'agriculture')) list.push({ id: 'farm', kind: 'infrastructure', title: 'Till a farm plot', detail: 'A plot regrows food for as long as it is worked.', done: doneBuildings(s, 'farm').length > 0 });
  list.push({ id: 'people_8', kind: 'community', title: 'Grow to 8 people', detail: 'Newcomers stay only where there is a bed and food in reserve.', done: s.citizens.length >= 8 });
  void hasShelter;
  return list;
}

/** What to show: when food is critical only survival goals are suggested; otherwise the next few unfinished goals. */
export function suggestedGoals(s: CivState, max = 4): Goal[] {
  const all = goalsFor(s).filter(g => !g.done);
  if (foodDays(s) < 1) return all.filter(g => g.kind === 'survival').slice(0, max);
  return all.slice(0, max);
}
