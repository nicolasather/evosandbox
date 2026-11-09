import { ERA_IDS } from '../registry';
import { cosmeticOpen, RARITY_ERA } from '../cosmeticGate';

describe('cosmetic gate: rarer cosmetics are offered later in history', () => {
  const at = (id: string) => ERA_IDS.indexOf(id as (typeof ERA_IDS)[number]);

  it('common cosmetics are offered from the start', () => {
    expect(RARITY_ERA.common).toBeNull();
    expect(cosmeticOpen('common', 0, false)).toBe(true);
  });

  it('uncommon cosmetics wait for Trade, rare ones for Metallurgy', () => {
    expect(cosmeticOpen('uncommon', at('agriculture'), false)).toBe(false);
    expect(cosmeticOpen('uncommon', at('trade'), false)).toBe(true);
    expect(cosmeticOpen('rare', at('trade'), false)).toBe(false);
    expect(cosmeticOpen('rare', at('metallurgy'), false)).toBe(true);
  });

  it('an owned cosmetic is always offered, so nothing is taken away', () => {
    expect(cosmeticOpen('rare', 0, true)).toBe(true);
  });

  it('an unknown rarity is never hidden', () => {
    expect(cosmeticOpen('legendary', 0, false)).toBe(true);
  });
});
