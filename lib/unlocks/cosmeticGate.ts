import { ERA_IDS } from './registry';

/* ============================================================================
   COSMETIC GATE — rarer cosmetics appear later in history.

   The shop lists every cosmetic a player could ever get, so a new player used to
   see all of them at once. Now a cosmetic's rarity sets the era it is offered
   from. Anything the player already owns is always shown (and can always be
   equipped), so nothing is ever taken away.

   Pure data + one function. The catalogue (data/retention/cosmetic-shop.json)
   is not changed.
   ========================================================================== */

/** The era (id in ERA_IDS) a cosmetic of each rarity is offered from. `null`: from the start. */
export const RARITY_ERA: Record<string, string | null> = {
  common: null,
  uncommon: 'trade',
  rare: 'metallurgy',
};

/** Is a cosmetic offered in the shop at this era? Owned items are always offered. */
export function cosmeticOpen(rarity: string, eraIndex: number, owned: boolean): boolean {
  if (owned) return true;
  const era = RARITY_ERA[rarity];
  if (era === undefined || era === null) return true;
  const need = ERA_IDS.indexOf(era as (typeof ERA_IDS)[number]);
  return need < 0 || eraIndex >= need;
}
