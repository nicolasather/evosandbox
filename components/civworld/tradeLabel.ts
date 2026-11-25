import type { tradePreview } from '@/lib/civ/sim';

type Preview = NonNullable<ReturnType<typeof tradePreview>>;

/** The exact quantities, shown before the player confirms anything. */
export const acceptTradeLabel = (p: Preview): string => `Offers ${p.give.n} ${p.give.res} for ${p.want.n} ${p.want.res}.`;
