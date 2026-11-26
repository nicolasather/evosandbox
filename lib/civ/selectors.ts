import { CITIZEN } from './data/config';
import { capacity, doneBuildings, foodDays, foodPerDay, hasCapability, sleepCapacity } from './sim';
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
      else if (doneBuildings(s, 'workshop').length + doneBuildings(s, 'forge').length === 0) blocked = 'Needs a workshop';
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

/** One aggregate mood with its contributors, so it can always be explained (master design section 34). */
export function moodOf(s: CivState): { score: number; label: string; contributors: string[] } {
  const n = Math.max(1, s.citizens.length);
  const hunger = s.citizens.reduce((a, c) => a + c.hunger, 0) / n;
  const energy = s.citizens.reduce((a, c) => a + c.energy, 0) / n;
  const beds = s.citizens.length <= 0 ? 1 : Math.min(1, (sleepCapacity(s) || 0) / n);
  const contributors: string[] = [];
  let score = 70;
  score -= Math.max(0, hunger - 30) * 0.5; if (hunger > 55) contributors.push('hunger');
  score -= Math.max(0, 60 - energy) * 0.4; if (energy < 40) contributors.push('tiredness');
  score += beds * 15; if (beds < 1) contributors.push('not enough beds'); else contributors.push('everyone has a bed');
  if (s.milestones.includes('festival')) { score += 5; contributors.push('the harvest festival'); }
  if (s.milestones.includes('workload_unrest')) { score -= 10; contributors.push('heavy workload'); }
  score = Math.max(0, Math.min(100, Math.round(score)));
  return { score, label: score >= 70 ? 'Good' : score >= 45 ? 'Fair' : 'Low', contributors };
}

/** Food at a glance: stock, eating rate, trend over the last days, and what is held in reserve. */
export function foodSummary(s: CivState) {
  const perDay = foodPerDay(s);
  const log = s.foodLog;
  const trend = log.length >= 2 ? log[log.length - 1] - log[0] : 0;
  return { stock: s.stock.food, perDay, days: foodDays(s), trend, reserve: Math.floor(perDay * s.settings.foodReserveDays * 0.5), gathered: s.counters.gathered.food, eaten: s.counters.consumed.food, spoiled: s.counters.spoiled };
}

/** An approximate look ahead (never omniscient): the next season, when it starts and what it changes. */
export function forecastFor(s: CivState): { next: string; daysLeft: number; text: string } {
  if (s.settings.seasons === 'off') return { next: 'none', daysLeft: 0, text: 'Seasons are switched off: conditions stay steady.' };
  const day = Math.floor(s.tick / 240);
  const inSeason = day % 6;
  const idx = Math.floor(day / 6) % 4;
  const names = ['Spring', 'Summer', 'Autumn', 'Winter'];
  const next = names[(idx + 1) % 4];
  const daysLeft = 6 - inSeason;
  const effects: Record<string, string> = {
    Spring: 'Berries regrow again. Rain may raise the river in the second year.',
    Summer: 'Mild: steady work and regrowth.',
    Autumn: 'Last chance to build up food before winter.',
    Winter: 'Berries stop growing and everyone eats a little more.',
  };
  return { next, daysLeft, text: `${next} in about ${daysLeft} days. ${effects[next]}` };
}
