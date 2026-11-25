import type { BuildingKind, NodeKind, WorldMap } from './world';

/* ============================================================================
   CIV STATE — everything the simulation owns, as plain JSON-serialisable data.
   Nothing here imports React or the canvas. The map terrain is regenerated from
   `seed`; only the mutable parts (node amounts, buildings) are saved.
   ========================================================================== */

export type ResourceId = 'food' | 'wood' | 'stone' | 'tools';
export const RESOURCES: readonly ResourceId[] = ['food', 'wood', 'stone', 'tools'];
export type Stock = Record<ResourceId, number>;

/** Job categories the player prioritises (0 = off, 1 = low, 2 = normal, 3 = high). */
export type JobCategory = 'food' | 'wood' | 'stone' | 'build' | 'craft';
export const JOB_CATEGORIES: readonly JobCategory[] = ['food', 'wood', 'stone', 'build', 'craft'];
export type Priorities = Record<JobCategory, number>;

export type TaskKind = 'idle' | 'walk' | 'gather' | 'deposit' | 'eat' | 'rest' | 'build' | 'craft';

export interface Task {
  kind: TaskKind;
  /** What the walk is for / which node or building the work targets. */
  purpose?: TaskKind;
  targetId?: string;
  /** Tile the citizen is heading for. */
  tx?: number;
  ty?: number;
  /** Ticks of work left in the current cycle. */
  left?: number;
  /** Short, player-facing reason for the choice ("Eating because hunger is high"). */
  reason: string;
}

export type AgeGroup = 'adult' | 'elder';

export interface Citizen {
  id: string;
  name: string;
  age: AgeGroup;
  trait: 'diligent' | 'curious' | 'cautious';
  /** Tile position (fractional while walking) and the previous position for smooth drawing. */
  x: number;
  y: number;
  px: number;
  py: number;
  facing: 'e' | 'w' | 'n' | 's';
  /** Total tiles walked: drives the walk cycle so feet never slide. */
  dist: number;
  hunger: number; // 0 fed .. 100 starving
  energy: number; // 100 rested .. 0 exhausted
  carrying: { res: ResourceId; n: number } | null;
  task: Task;
  path: [number, number][];
  /** Task commitment: the citizen will not switch jobs before this tick unless a need becomes urgent. */
  commitUntil: number;
  home: string | null;
  skill: Record<'gather' | 'build' | 'craft', number>;
  /** One-off player override that expires; autonomous assignment is the default. */
  override: { category: JobCategory; until: number } | null;
  /** Why the citizen is not working, when it is idle. */
  idleReason: string;
  /** Tool in hand (affects gather speed). */
  usingTool: boolean;
}

export interface NodeState { id: string; kind: NodeKind; x: number; y: number; amount: number; max: number; workers: number }

export type BuildState = 'site' | 'done';
export interface BuildingState {
  id: string;
  kind: BuildingKind | 'farm';
  x: number;
  y: number;
  w: number;
  h: number;
  state: BuildState;
  /** 0..1 while a site. */
  progress: number;
  /** Cost already paid, kept for the cancel refund rule. */
  paid: Partial<Stock>;
  workers: number;
  /** farm plots regrow a harvest; workshops report why they are idle. */
  amount?: number;
  max?: number;
  note?: string;
}

export type EventKind =
  | 'founded' | 'discovery' | 'capability' | 'building_started' | 'building_done' | 'first_craft' | 'first_harvest'
  | 'shortage' | 'recovery' | 'arrival' | 'milestone' | 'hint' | 'trade' | 'season';

export interface CivEvent {
  id: number;
  kind: EventKind;
  tick: number;
  /** Structured facts are the source of truth; `text` is just a rendering of them. */
  facts: Record<string, string | number | boolean | null>;
  text: string;
}

export interface Capability { id: string; fromDiscovery: string; tick: number }

export interface HintState { lastShown: number; shownCount: number; resolved: boolean }
export interface ActiveHint { id: string; level: 'observation' | 'suggestion' | 'guidance'; speaker: string; text: string; tick: number }

export interface Visitor {
  id: string;
  kind: 'trader';
  arrivedTick: number;
  leavesTick: number;
  /** What the visitor offers and what they ask for, in whole units. */
  give: { res: ResourceId; n: number };
  want: { res: ResourceId; n: number };
}

export interface Settings {
  pauseWhileCrafting: boolean;
  workIntensity: 'relaxed' | 'normal' | 'intense';
  foodReserveDays: number;
}

export interface CivState {
  v: 1;
  seed: number;
  tick: number;
  rng: number;
  nextId: number;
  stock: Stock;
  priorities: Priorities;
  citizens: Citizen[];
  nodes: NodeState[];
  buildings: BuildingState[];
  /** Discovery ids the bridge has already recorded: each applies exactly once. */
  seenDiscoveries: string[];
  capabilities: Capability[];
  unlockedBuildings: string[];
  events: CivEvent[];
  hints: Record<string, HintState>;
  activeHint: ActiveHint | null;
  visitor: Visitor | null;
  alerts: string[];
  milestones: string[];
  settings: Settings;
  /** Cumulative counters used by milestones and tests. */
  counters: { gathered: Stock; consumed: Stock; crafted: number; deaths: number };
}

/** The runtime view the renderer wants: a WorldMap whose nodes/buildings mirror the state. */
export interface RuntimeWorld { map: WorldMap }
