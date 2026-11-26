import type { ResourceId } from '../types';

/* Building definitions (master design §31.2). Visual asset ids are the stable ids in
   docs/civilization-overhaul/ASSET_MANIFEST.md. */

export interface BuildingDef {
  id: 'shelter' | 'storage' | 'workshop' | 'farm' | 'granary' | 'forge' | 'road' | 'market' | 'assembly' | 'house' | 'pottery_kiln' | 'drying_rack' | 'well';
  name: string;
  description: string;
  footprint: { w: number; h: number };
  cost: Partial<Record<ResourceId, number>>;
  /** Ticks of one builder's work to finish. */
  buildTicks: number;
  workerSlots: number;
  /** Capability id that must be unlocked (null = available from the start). */
  requires: string | null;
  /** Terrain the footprint may sit on. */
  terrain: ('grass' | 'dirt' | 'sand' | 'path')[];
  unlockHint: string;
  visualAssetId: string;
  /** Row of the sprite sheet cell that sits on the footprint's bottom edge (default 57). */
  anchorY?: number;
  /** What it does, in the inspector. */
  purpose: string;
}

export const BUILDINGS: Record<string, BuildingDef> = {
  shelter: {
    id: 'shelter', name: 'Shelter', description: 'A simple roofed place to sleep out of the weather.',
    footprint: { w: 3, h: 2 }, cost: { wood: 10 }, buildTicks: 28, workerSlots: 2, requires: null,
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Available from the start.', visualAssetId: 'bld_shelter',
    purpose: 'Sleeps 3 people. Rested people work longer.',
  },
  storage: {
    id: 'storage', name: 'Storage', description: 'A covered store that keeps goods safe and close.',
    footprint: { w: 2, h: 2 }, cost: { wood: 12, stone: 4 }, buildTicks: 36, workerSlots: 2, requires: 'food_storage',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover Food Storage in Merging.', visualAssetId: 'bld_storage',
    purpose: 'Raises how much of each good the settlement can keep by 40.',
  },
  workshop: {
    id: 'workshop', name: 'Workshop', description: 'A work yard where tools are made.',
    footprint: { w: 2, h: 2 }, cost: { wood: 14, stone: 8 }, buildTicks: 44, workerSlots: 1, requires: 'stone_tool',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover Stone Tool in Merging.', visualAssetId: 'bld_workshop',
    purpose: 'A worker turns 2 wood and 1 stone into a tool. Tools speed up gathering.',
  },
  farm: {
    id: 'farm', name: 'Farm plot', description: 'Tilled ground that gives food again and again.',
    footprint: { w: 3, h: 2 }, cost: { wood: 6 }, buildTicks: 30, workerSlots: 2, requires: 'agriculture',
    terrain: ['grass', 'dirt'], unlockHint: 'Discover Agriculture in Merging.', visualAssetId: 'bld_farm',
    purpose: 'Regrows a harvest of food that workers gather.',
  },
  granary: {
    id: 'granary', name: 'Granary', description: 'A raised, ventilated store for the harvest.',
    footprint: { w: 2, h: 2 }, cost: { wood: 20, stone: 6 }, buildTicks: 52, workerSlots: 2, requires: 'granary',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover the Raised Timber Granary in Merging.', visualAssetId: 'bld_granary', anchorY: 60,
    purpose: 'Raises how much of each good the settlement can keep by 60.',
  },
  forge: {
    id: 'forge', name: 'Forge', description: 'A hot work yard where metal is worked.',
    footprint: { w: 2, h: 2 }, cost: { wood: 16, stone: 12 }, buildTicks: 60, workerSlots: 1, requires: 'smelting',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover Smelting in Merging.', visualAssetId: 'bld_forge', anchorY: 60,
    purpose: 'Like a workshop, but a worker makes 2 tools per cycle.',
  },
  road: {
    id: 'road', name: 'Road', description: 'Packed stone and gravel that people walk faster on.',
    footprint: { w: 1, h: 1 }, cost: { stone: 1 }, buildTicks: 6, workerSlots: 1, requires: 'stone_tool',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover Stone Tool in Merging.', visualAssetId: 'bld_road',
    purpose: 'Walkers move 50% faster on it. Shift-click to lay several.',
  },
  market: {
    id: 'market', name: 'Market', description: 'A place where traders stop more often.',
    footprint: { w: 2, h: 2 }, cost: { wood: 18, stone: 6 }, buildTicks: 48, workerSlots: 2, requires: 'trade',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover Trade in Merging.', visualAssetId: 'bld_market',
    purpose: 'Visiting traders come twice as often.',
  },
  assembly: {
    id: 'assembly', name: 'Assembly', description: 'A shared gathering place where the community decides things together.',
    footprint: { w: 3, h: 2 }, cost: { wood: 24, stone: 14 }, buildTicks: 70, workerSlots: 2, requires: 'assembly',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover the Public Assembly Plaza in Merging.', visualAssetId: 'bld_assembly',
    purpose: 'A community project: the settlement can hold 4 more people.',
  },
  house: {
    id: 'house', name: 'House', description: 'A permanent dwelling of wattle and daub.',
    footprint: { w: 2, h: 2 }, cost: { wood: 18, stone: 4 }, buildTicks: 50, workerSlots: 2, requires: 'dwelling',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover the Wattle-and-Daub Hut in Merging.', visualAssetId: 'bld_house',
    purpose: 'Sleeps 4 people, in comfort.',
  },
  pottery_kiln: {
    id: 'pottery_kiln', name: 'Pottery kiln', description: 'A small kiln for firing clay vessels.',
    footprint: { w: 1, h: 1 }, cost: { wood: 6, stone: 8 }, buildTicks: 30, workerSlots: 1, requires: 'pottery',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover Pottery in Merging.', visualAssetId: 'bld_pottery_kiln',
    purpose: 'Fired vessels let the settlement keep 20 more of every good.',
  },
  drying_rack: {
    id: 'drying_rack', name: 'Drying rack', description: 'A frame for drying food so it keeps.',
    footprint: { w: 1, h: 1 }, cost: { wood: 5 }, buildTicks: 14, workerSlots: 1, requires: 'food_processing',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover Food Processing in Merging.', visualAssetId: 'bld_drying_rack',
    purpose: 'Preserved food goes 20% further when eaten.',
  },
  well: {
    id: 'well', name: 'Well', description: 'A hand-dug shaft that gives clean water close to camp.',
    footprint: { w: 1, h: 1 }, cost: { wood: 4, stone: 6 }, buildTicks: 26, workerSlots: 1, requires: 'well',
    terrain: ['grass', 'dirt', 'sand', 'path'], unlockHint: 'Discover the Hand-Dug Shaft Well in Merging.', visualAssetId: 'bld_well',
    purpose: 'Reliable water: the settlement can hold 2 more people.',
  },
};

export const BUILD_ORDER = ['shelter', 'house', 'storage', 'workshop', 'farm', 'road', 'well', 'drying_rack', 'pottery_kiln', 'granary', 'forge', 'market', 'assembly'] as const;
