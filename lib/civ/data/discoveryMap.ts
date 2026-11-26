/* Discovery -> capability mapping (master design §14.3). Keys are REAL discovery ids from
   data/db.json; the merge engine remains the only authority on whether a discovery
   happened. A discovery with no entry simply has no effect in the settlement.
   Grants only unlock the ability to do something; nothing here ever hands out goods. */

export type Grant =
  | { type: 'unlock_building'; buildingId: string }
  | { type: 'unlock_action'; actionId: 'cook_food' | 'make_tools' | 'better_gathering' }
  | { type: 'knowledge'; note: string };

export interface CapabilityMapping {
  discoveryId: string;
  capability: string;
  grants: Grant[];
  /** Other discoveries that must already be known for the grant to apply (all-of). */
  requires?: string[];
  /** Flavour only; the structured event is the real record. */
  message: string;
}

export const DISCOVERY_MAP: CapabilityMapping[] = [
  { discoveryId: 'controlled_fire', capability: 'controlled_fire', grants: [{ type: 'unlock_action', actionId: 'cook_food' }],
    message: 'Your people can keep a fire alive and cook on it: the same food goes further.' },
  { discoveryId: 'stone_tool', capability: 'stone_tool', grants: [{ type: 'unlock_building', buildingId: 'workshop' }, { type: 'unlock_action', actionId: 'make_tools' }],
    message: 'Your people have figured out a sharper way to shape wood. A workshop can now turn materials into tools.' },
  { discoveryId: 'food_storage', capability: 'food_storage', grants: [{ type: 'unlock_building', buildingId: 'storage' }],
    message: 'Someone has found a way to keep food dry and safe. A storage building can now be raised.' },
  { discoveryId: 'agriculture', capability: 'agriculture', grants: [{ type: 'unlock_building', buildingId: 'farm' }],
    message: 'Planting and harvesting on purpose: farm plots can now be tilled.' },
  { discoveryId: 'farming_tools', capability: 'farming_tools', requires: ['agriculture'], grants: [{ type: 'unlock_action', actionId: 'better_gathering' }],
    message: 'Better tools for working the soil make every harvest a little easier.' },
  { discoveryId: 'anc27_raised_timber_granary', capability: 'granary', grants: [{ type: 'unlock_building', buildingId: 'granary' }],
    message: 'Raised floors keep the harvest dry and away from pests. A granary can now be built.' },
  { discoveryId: 'smelting', capability: 'smelting', requires: ['stone_tool'], grants: [{ type: 'unlock_building', buildingId: 'forge' }],
    message: 'Your people have learned to get metal out of rock. A forge can now be built.' },
  { discoveryId: 'trade', capability: 'trade', grants: [{ type: 'unlock_building', buildingId: 'market' }],
    message: 'Exchanging surplus for what you lack is now an idea your people share. A market can be built.' },
  { discoveryId: 'anc27_public_assembly_plaza', capability: 'assembly', grants: [{ type: 'unlock_building', buildingId: 'assembly' }],
    message: 'A shared place to meet and decide. An assembly can now be built.' },
  { discoveryId: 'pottery', capability: 'pottery', grants: [{ type: 'unlock_building', buildingId: 'pottery_kiln' }],
    message: 'Fired clay vessels keep goods safe. A pottery kiln can now be built.' },
  { discoveryId: 'irrigation', capability: 'irrigation', requires: ['agriculture'], grants: [{ type: 'knowledge', note: 'Irrigation: farm plots hold a bigger harvest.' }],
    message: 'Channels carry river water to the fields. Farm plots give a larger harvest.' },
  { discoveryId: 'record_keeping', capability: 'records', grants: [{ type: 'unlock_building', buildingId: 'records_hall' }],
    message: 'Marks and tallies on durable surfaces: a records hall can now be built.' },
  { discoveryId: 'mathematics', capability: 'mathematics', grants: [{ type: 'knowledge', note: 'Mathematics: numbers are understood in the abstract.' }],
    message: 'Counting becomes calculating. A new kind of thinking is available.' },
  { discoveryId: 'anc27_wattle_and_daub_hut', capability: 'dwelling', grants: [{ type: 'unlock_building', buildingId: 'house' }],
    message: 'Woven walls plastered with clay make a lasting home. Houses can now be built.' },
  { discoveryId: 'food_processing', capability: 'food_processing', grants: [{ type: 'unlock_building', buildingId: 'drying_rack' }],
    message: 'Food can be dried and kept. A drying rack can now be built.' },
  { discoveryId: 'anc27_hand_dug_shaft_well', capability: 'well', grants: [{ type: 'unlock_building', buildingId: 'well' }],
    message: 'Digging down finds clean water. A well can now be dug.' },
  { discoveryId: 'cart', capability: 'cart', grants: [{ type: 'knowledge', note: 'Carts: people carry one more unit per trip.' }],
    message: 'A wheeled cart carries more than two arms can. Each trip hauls one more unit.' },
  { discoveryId: 'cordage', capability: 'cordage', grants: [{ type: 'knowledge', note: 'Cordage: lashing and binding are now understood.' }],
    message: 'Twisted fibre makes strong cord. Not much changes yet, but binding is understood.' },
  { discoveryId: 'shelter', capability: 'shelter_craft', grants: [{ type: 'knowledge', note: 'Shelter craft is understood by the settlement.' }],
    message: 'The settlement now understands what makes a shelter sturdy.' },
];
