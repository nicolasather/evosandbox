import type { ResourceId } from '../types';

/* Building definitions (master design §31.2). Visual asset ids are the stable ids in
   docs/civilization-overhaul/ASSET_MANIFEST.md. */

export interface BuildingDef {
  id: 'shelter' | 'storage' | 'workshop' | 'farm';
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
  /** What it does, in the inspector. */
  purpose: string;
}

export const BUILDINGS: Record<string, BuildingDef> = {
  shelter: {
    id: 'shelter', name: 'Shelter', description: 'A simple roofed place to sleep out of the weather.',
    footprint: { w: 2, h: 2 }, cost: { wood: 10 }, buildTicks: 28, workerSlots: 2, requires: null,
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
};

export const BUILD_ORDER = ['shelter', 'storage', 'workshop', 'farm'] as const;
