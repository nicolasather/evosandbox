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

export type TaskKind = 'idle' | 'walk' | 'gather' | 'deposit' | 'eat' | 'rest' | 'build' | 'craft' | 'away';

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
  /** Birth tick (negative for the founders), used for life stages. */
  born?: number;
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
  /** The player switched this workplace off. */
  paused?: boolean;
  /** farm plots regrow a harvest; workshops report why they are idle. */
  amount?: number;
  max?: number;
  note?: string;
}

export type EventKind =
  | 'founded' | 'discovery' | 'capability' | 'building_started' | 'building_done' | 'first_craft' | 'first_harvest'
  | 'shortage' | 'recovery' | 'arrival' | 'milestone' | 'hint' | 'trade' | 'season' | 'explore' | 'hazard' | 'birth' | 'spoilage';

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
export interface ActiveHint { id: string; role: 'gatherer' | 'builder' | 'elder' | 'toolmaker'; level: 'observation' | 'suggestion' | 'guidance'; speaker: string; text: string; tick: number }

export interface Visitor {
  id: string;
  kind: 'trader' | 'caravan' | 'craftsperson' | 'messenger';
  arrivedTick: number;
  leavesTick: number;
  /** What the visitor offers and what they ask for, in whole units. */
  give: { res: ResourceId; n: number };
  want: { res: ResourceId; n: number };
}

export interface Expedition {
  id: string;
  party: string[];
  tx: number;
  ty: number;
  departTick: number;
  returnTick: number;
  stance: 'cautious' | 'balanced' | 'bold';
  foodTaken: number;
}

export interface PointOfInterest { id: string; kind: 'clay_deposit' | 'stone_ridge' | 'fertile_meadow' | 'abandoned_camp'; x: number; y: number; found: boolean }

/** A flood is warned about well before it starts, only blocks work on low ground, and destroys nothing. */
export interface Hazard { kind: 'flood'; warnTick: number; startTick: number; endTick: number; phase: 'scheduled' | 'warned' | 'active' }

export interface Pin { id: string; text: string; done: boolean }
export interface MapNote { id: string; x: number; y: number; text: string }

export interface Policies {
  resourceUse: 'conserve' | 'balanced' | 'free';
  constructionFocus: 'housing' | 'storage' | 'production' | 'infrastructure' | 'none';
  explorationStance: 'cautious' | 'balanced' | 'bold';
  gatheringRadius: 'local' | 'extended';
  knowledgeFocus: 'open' | 'tools' | 'food' | 'shelter';
}

export interface Migrant { id: string; name: string; arrivedTick: number; leavesTick: number; /** 1 to 3 people arrive together */ size: number }

export type ModuleId = 'trade' | 'governance' | 'family' | 'climate' | 'hunting' | 'visitors' | 'water';

export interface FamilyMember { id: string; name: string; parents: string[]; born: number; stage: 'child' | 'adult' | 'elder' }

export interface TradeRoute { id: string; partner: string; give: { res: ResourceId; n: number }; want: { res: ResourceId; n: number }; everyDays: number; nextTick: number }

export interface Settings {
  pauseWhileCrafting: boolean;
  workIntensity: 'relaxed' | 'normal' | 'intense';
  foodReserveDays: number;
  /** Seasons can be switched off for a steady sandbox. */
  seasons: 'on' | 'off';
  /** Optional systems: each can be switched off and none is needed for the core loop. */
  modules: Record<ModuleId, boolean>;
}

export interface CivState {
  v: 1;
  seed: number;
  /** 'classic' is the hand-authored first map; 'procedural' lays the same ingredients out from the seed. */
  mapKind: 'classic' | 'procedural';
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
  /** One char per tile, '1' = seen. Unseen ground hides its resources from the workers. */
  revealed: string;
  expeditions: Expedition[];
  poi: PointOfInterest[];
  hazard: Hazard | null;
  /** Birth ticks of children (a cohort, not individuals); they grow into named adults. */
  children: number[];
  /** Daily food stock, newest last, for the trend shown in the HUD. */
  foodLog: number[];
  /** Tile indexes where a tree was cut down: drawn as stumps. */
  stumps: number[];
  /** A newcomer who asks to stay: the player sees the extra demand and accepts or declines. */
  migrant: Migrant | null;
  family: FamilyMember[];
  routes: TradeRoute[];
  laws: string[];
  /** Stored water, drawn from wells. */
  water: number;
  pins: Pin[];
  notes: MapNote[];
  policies: Policies;
  tutorial: { step: number; done: boolean };
  alerts: string[];
  milestones: string[];
  settings: Settings;
  /** Cumulative counters used by milestones and tests. */
  counters: { gathered: Stock; consumed: Stock; crafted: number; deaths: number; spoiled: number };
}

/** The runtime view the renderer wants: a WorldMap whose nodes/buildings mirror the state. */
export interface RuntimeWorld { map: WorldMap }
