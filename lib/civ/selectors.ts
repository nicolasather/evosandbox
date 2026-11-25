import { CITIZEN } from './data/config';
import { capacity, doneBuildings, foodDays, hasCapability } from './sim';
import type { Citizen, CivState, JobCategory } from './types';
import { JOB_CATEGORIES } from './types';

/* Read-only summaries for panels. They explain WHY something is not happening
   (master design §4.4): missing tool, no worker, no input, full storage, no resource. */

export interface JobStatus { cat: JobCategory; workers: number; priority: number; blocked: string | null }

const catOf = (c: Citizen, s: CivState): JobCategory | null => {
  const t = c.task;
  const p = t.kind === 'walk' ? t.purpose : t.kind;
  if (p === 'build') return 'build';
  if (p === 'craft') return 'craft';
  if (p === 'gather') {
    const n = s.nodes.find(x => x.id === t.targetId);
    if (n) return n.kind === 'bush' ? 'food' : n.kind === 'tree' ? 'wood' : 'stone';
    return 'food'; // farm plot
  }
  return null;
};

export function jobStatuses(s: CivState): JobStatus[] {
  const cap = capacity(s);
  const count: Record<JobCategory, number> = { food: 0, wood: 0, stone: 0, build: 0, craft: 0 };
  for (const c of s.citizens) { const k = catOf(c, s); if (k) count[k]++; }
  return JOB_CATEGORIES.map(cat => {
    const priority = s.priorities[cat];
    let blocked: string | null = null;
    if (priority === 0) blocked = 'Switched off';
    else if (cat === 'food') {
      if (s.stock.food >= cap) blocked = 'Storage is full';
      else if (!s.nodes.some(n => n.kind === 'bush' && n.amount > 0) && !doneBuildings(s, 'farm').some(f => (f.amount ?? 0) > 0)) blocked = 'No food within reach (bushes regrow slowly)';
    } else if (cat === 'wood') {
      if (s.stock.wood >= cap) blocked = 'Storage is full';
      else if (!s.nodes.some(n => n.kind === 'tree' && n.amount > 0)) blocked = 'No trees left to chop';
    } else if (cat === 'stone') {
      if (s.stock.stone >= cap) blocked = 'Storage is full';
      else if (!s.nodes.some(n => n.kind === 'rock' && n.amount > 0)) blocked = 'No stone outcrops left';
    } else if (cat === 'build') {
      if (!s.buildings.some(b => b.state === 'site')) blocked = 'Nothing to build: place something in Build';
    } else if (cat === 'craft') {
      if (!hasCapability(s, 'stone_tool')) blocked = 'Needs the Stone Tool discovery (Merging)';
      else if (doneBuildings(s, 'workshop').length === 0) blocked = 'Needs a workshop';
      else if (s.stock.wood < 2) blocked = 'Missing wood';
      else if (s.stock.stone < 1) blocked = 'Missing stone';
      else if (s.stock.tools >= 6) blocked = 'Tool stock is full';
    }
    return { cat, workers: count[cat], priority, blocked };
  });
}

export const JOB_LABEL: Record<JobCategory, string> = { food: 'Food', wood: 'Wood', stone: 'Stone', build: 'Build', craft: 'Tools' };

export function timeLabel(tick: number): string {
  const t = (tick % 240) / 240;
  return t < 0.08 ? 'Dawn' : t < 0.62 ? 'Day' : t < 0.7 ? 'Dusk' : 'Night';
}

export const needWord = (v: number, invert = false) => {
  const x = invert ? 100 - v : v;
  return x >= CITIZEN.urgentHunger ? 'critical' : x >= CITIZEN.eatAt ? 'high' : x >= 30 ? 'moderate' : 'low';
};

export function reserveSummary(s: CivState) {
  return { days: foodDays(s), capacity: capacity(s) };
}
