/* ============================================================================
   WORKSPACE LAYOUT — pure state for the tab/split shell (components/workspace).
   Layout preferences only: never mixed with civilization simulation state, and
   a broken or out-of-range saved value is discarded rather than trusted.
   ========================================================================== */

/** civ: world only, Merging parked; split: both visible; merge: Merging fills the workspace. */
export type LayoutMode = 'civ' | 'dock' | 'split' | 'overlay' | 'merge';

export interface WorkspacePrefs {
  layout: LayoutMode;
  /** Share of the workspace given to Merging while split, in percent. */
  splitPct: number;
}

export const WORKSPACE_KEY = 'evo.workspace.v1';
export const SPLIT_MIN = 34;
export const SPLIT_MAX = 72;
export const DEFAULT_PREFS: WorkspacePrefs = { layout: 'civ', splitPct: 45 };

const LAYOUTS: readonly LayoutMode[] = ['civ', 'dock', 'split', 'overlay', 'merge'];

export const clampSplit = (pct: number): number =>
  Number.isFinite(pct) ? Math.min(SPLIT_MAX, Math.max(SPLIT_MIN, Math.round(pct * 10) / 10)) : DEFAULT_PREFS.splitPct;

/** Parse a stored value; anything that is not exactly a valid layout falls back to the default. */
export function parsePrefs(raw: string | null | undefined): WorkspacePrefs {
  if (!raw) return { ...DEFAULT_PREFS };
  try {
    const o = JSON.parse(raw) as Partial<WorkspacePrefs> | null;
    if (!o || typeof o !== 'object') return { ...DEFAULT_PREFS };
    const layout = LAYOUTS.includes(o.layout as LayoutMode) ? (o.layout as LayoutMode) : DEFAULT_PREFS.layout;
    const splitPct = typeof o.splitPct === 'number' ? clampSplit(o.splitPct) : DEFAULT_PREFS.splitPct;
    return { layout, splitPct };
  } catch {
    return { ...DEFAULT_PREFS };
  }
}

export const serializePrefs = (p: WorkspacePrefs): string => JSON.stringify({ layout: p.layout, splitPct: clampSplit(p.splitPct) });

/** The tab a layout belongs to: the world tab covers `civ` and `split`. */
export const tabOf = (l: LayoutMode): 'civilization' | 'merging' => (l === 'merge' ? 'merging' : 'civilization');

/** Where the divider sits (percent from the start edge) and each pane's rectangle, in percent. */
export interface PaneRects {
  civ: { start: number; size: number; visible: boolean };
  merge: { start: number; size: number; visible: boolean };
}

export function paneRects(p: WorkspacePrefs): PaneRects {
  switch (p.layout) {
    case 'split': {
      const m = clampSplit(p.splitPct);
      return { civ: { start: 0, size: 100 - m, visible: true }, merge: { start: 100 - m, size: m, visible: true } };
    }
    case 'dock':
      // a narrow strip: Merging is drawn at a readable virtual width and scaled down (see the shell)
      return { civ: { start: 0, size: 100, visible: true }, merge: { start: 70, size: 30, visible: true } };
    case 'overlay':
      return { civ: { start: 0, size: 100, visible: true }, merge: { start: 4, size: 92, visible: true } };
    case 'merge':
      return { civ: { start: 0, size: 100, visible: false }, merge: { start: 0, size: 100, visible: true } };
    default:
      // Merging stays laid out at its split size, parked past the end edge, so it is never remounted or measured at zero.
      return { civ: { start: 0, size: 100, visible: true }, merge: { start: 100, size: clampSplit(p.splitPct), visible: false } };
  }
}
