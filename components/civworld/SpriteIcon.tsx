import type { CSSProperties } from 'react';

const BASE = '/civilization';

/** Strip sheets used by the HUD and drawers: one row of equal square cells. */
const SHEETS = {
  building: { url: `${BASE}/ui/building-thumbnails-16-v3.png`, cell: 16, count: 16 },
  era: { url: `${BASE}/ui/era-badges-24.png`, cell: 24, count: 5 },
  hint: { url: `${BASE}/ui/hint-icons-24.png`, cell: 24, count: 8 },
  emote: { url: `${BASE}/ui/emotes-expanded-16.png`, cell: 16, count: 8 },
  eventA: { url: `${BASE}/events/event-cards.png`, cell: 96, count: 4 },
  eventB: { url: `${BASE}/events/part2-event-cards.png`, cell: 64, count: 6 },
  eventC: { url: `${BASE}/events/event-trigger-cards.png`, cell: 64, count: 12 },
} as const;
export type SheetId = keyof typeof SHEETS;

/** Frame order of each strip, from the asset metadata. */
export const BUILDING_FRAME: Record<string, number> = {
  shelter: 0, house: 1, storage: 2, workshop: 3, farm: 4, road: 5, well: 6, drying_rack: 7,
  pottery_kiln: 8, granary: 9, forge: 10, market: 11, assembly: 12, records_hall: 14,
};
export const HINT_FRAME = { thought: 0, warning: 1, food: 2, storage: 3, water: 4, build: 5, discovery: 6, danger: 7 } as const;

/** A pixel-art frame drawn from a strip sheet, scaled by whole numbers so it stays crisp. */
export function SpriteIcon({ sheet, frame, size, label }: { sheet: SheetId; frame: number; size: number; label?: string }) {
  const s = SHEETS[sheet];
  const style: CSSProperties = {
    display: 'inline-block', flex: 'none', width: size, height: size, imageRendering: 'pixelated',
    backgroundImage: `url(${s.url})`, backgroundRepeat: 'no-repeat',
    backgroundSize: `${s.count * size}px ${size}px`, backgroundPosition: `${-frame * size}px 0`,
  };
  return <span className="cw-sprite" style={style} role={label ? 'img' : undefined} aria-label={label} aria-hidden={label ? undefined : true} />;
}

/** The card that illustrates a history entry, or null when no art fits it. */
export function eventCard(kind: string, facts: Record<string, unknown>): { sheet: SheetId; frame: number } | null {
  switch (kind) {
    case 'first_harvest': return { sheet: 'eventA', frame: 0 };
    case 'hazard': return facts.phase === 'warning' ? { sheet: 'eventB', frame: 2 } : { sheet: 'eventA', frame: 1 };
    case 'arrival': case 'trade': return { sheet: 'eventA', frame: 2 };
    case 'shortage': return { sheet: 'eventA', frame: 3 };
    case 'milestone': case 'discovery': return { sheet: 'eventB', frame: 5 };
    default: return null;
  }
}

export const hintIconFor = (level: string, id: string): number => {
  if (/food|hungry|berry|harvest/.test(id)) return HINT_FRAME.food;
  if (/stor|stock|full/.test(id)) return HINT_FRAME.storage;
  if (/water|well|thirst/.test(id)) return HINT_FRAME.water;
  if (/build|shelter|house|work/.test(id)) return HINT_FRAME.build;
  if (/discover|idea|tool/.test(id)) return HINT_FRAME.discovery;
  return level === 'guidance' ? HINT_FRAME.warning : HINT_FRAME.thought;
};

/** Frames of the trigger-card strip, keyed by the hint that fires on that trigger. */
export const TRIGGER_FRAME: Record<string, number> = {
  food_low: 0, food_critical: 0, storage_full: 1, wood_far: 2, missing_tool: 3, new_resource: 4, housing_full: 5,
  work_fatigue: 7, trader_visit: 8, water_access: 9, water_low: 9, site_unstaffed: 10,
};
export const EMOTE_FRAME = { hungry: 0, tired: 1, idea: 2, alert: 3, happy: 4, question: 5, sweat: 6, heart: 7 } as const;
