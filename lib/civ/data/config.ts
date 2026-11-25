/* Tuning values for the settlement simulation. All numbers are illustrative and live
   here (not in logic) so balance can change without rewriting systems. */

/** Simulation ticks per real second at 1x. Drawing runs independently on rAF. */
export const TICKS_PER_SECOND = 4;
export const SPEEDS = [1, 2, 4] as const;
export type Speed = (typeof SPEEDS)[number];

export const DAY_TICKS = 240;
/** Fraction of the day (from the end) that counts as night. */
export const NIGHT_FRACTION = 0.3;

export const CITIZEN = {
  /** Tiles per tick while walking. */
  speed: 0.5,
  hungerPerTick: 0.2,
  energyPerTick: 0.1,
  sleepRecoverPerTick: 0.6,
  roughSleepRecoverPerTick: 0.25,
  eatAt: 55,
  urgentHunger: 80,
  starvingAt: 100,
  tiredAt: 30,
  rested: 92,
  eatRelief: 55,
  carryCap: 3,
  gatherTicks: 6,
  buildStepTicks: 4,
  craftTicks: 10,
  /** Min ticks a citizen sticks with a job unless a need becomes urgent (prevents oscillation). */
  commitTicks: 10,
  /** Never walk further than this many tiles for one trip (unless nothing is closer). */
  reach: 22,
} as const;

export const STOCK = {
  baseCapacity: 30,
  perStorage: 40,
  /** Stocks the settlement starts with: generous so the opening teaches without punishing. */
  start: { food: 8, wood: 14, stone: 4, tools: 0 },
} as const;

export const BUSH_REGROW_TICKS = 60;
export const FARM_REGROW_TICKS = 30;
export const COOKED_FOOD_MULT = 1.5;
export const TOOL_GATHER_MULT = 1.5;
export const SHELTER_SLEEPERS = 3;
export const CAMPFIRE_SLEEPERS = 2;
export const REFUND_FRACTION = 0.75;
export const MAX_CITIZENS = 12;
export const ARRIVAL_MIN_TICKS = DAY_TICKS * 2;
export const EVENT_LOG_MAX = 200;
export const HINT_GLOBAL_COOLDOWN = 80;
export const AUTOSAVE_TICKS = 40;
