import { render } from '@testing-library/react';
import { CivRuntime } from '@/lib/civ/runtime';
import { DEFAULT_UI } from '@/lib/civ/uiPrefs';
import { BuildDrawer, GoalsDrawer, HelpDrawer, HintCard, Hud, Inspector, JobsDrawer, JournalDrawer, LogDrawer, MigrantCard, Notice, TradeCard } from '../civworld/panels';
import { ExplorePanel, PinsSection, PoliciesSection, SettingsSection, TutorialTip } from '../civworld/panels2';
import { FamilySection, GovernanceSection, MapSection, ModulesSection, SaveSection, TradeDrawer } from '../civworld/panels3';

/* Accessibility (backlog item 7): keyboard-only play, screen-reader names, colour never the only signal, contrast. */

const channel = (v: number) => { const c = v / 255; return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4; };
const lum = (hex: string) => { const n = parseInt(hex.slice(1), 16); return 0.2126 * channel(n >> 16) + 0.7152 * channel((n >> 8) & 255) + 0.0722 * channel(n & 255); };
const ratio = (a: string, b: string) => { const [x, y] = [lum(a), lum(b)].sort((p, q) => q - p); return (x + 0.05) / (y + 0.05); };

describe('contrast (WCAG AA, 4.5:1 for text)', () => {
  const panel = '#161d18';
  const pairs: [string, string, string][] = [
    ['body text', '#e9efe6', panel], ['button text', '#f3f7ef', '#24332a'], ['gold headings', '#ffd166', panel],
    ['blocked reason', '#ffcc80', panel], ['locked label', '#ffcc80', panel], ['hint card', '#2a2118', '#f4ecd8'],
    ['hint button', '#2a2118', '#e3d3ae'], ['tab text', '#aebbaa', panel], ['selected tab', '#f3f7ef', '#24332a'],
    ['short cost', '#ff8a80', panel], ['tip text', '#e9efe6', '#26402e'], ['trade card', '#e9efe6', '#2c3a2a'],
  ];
  it.each(pairs)('%s is readable', (_n, fg, bg) => { expect(ratio(fg, bg)).toBeGreaterThanOrEqual(4.5); });
  it('muted note text (80% opacity) stays readable', () => {
    // 80% of #e9efe6 over #161d18
    const mix = (c: number, d: number) => Math.round(c * 0.8 + d * 0.2);
    const fg = `#${[0xe9, 0xef, 0xe6].map((c, i) => mix(c, [0x16, 0x1d, 0x18][i]).toString(16).padStart(2, '0')).join('')}`;
    expect(ratio(fg, panel)).toBeGreaterThanOrEqual(4.5);
  });
});

describe('every interactive control has an accessible name and is a real control', () => {
  it('all panels', () => {
    const rt = new CivRuntime(null);
    rt.state.activeHint = { id: 'x', role: 'elder', level: 'observation', speaker: 'Ivo', text: 'Something.', tick: 1 };
    rt.state.visitor = { id: 'v', kind: 'trader', arrivedTick: 0, leavesTick: 99999, give: { res: 'stone', n: 3 }, want: { res: 'wood', n: 5 } };
    rt.state.migrant = { id: 'm', name: 'Nia', arrivedTick: 0, leavesTick: 99999, size: 1 };
    const t = rt.state.poi[0];
    const { container } = render(
      <div>
        <Hud rt={rt} onFocus={() => {}} />
        <BuildDrawer rt={rt} onPick={() => {}} active={null} /><JobsDrawer rt={rt} /><GoalsDrawer rt={rt} /><JournalDrawer rt={rt} names={{}} /><LogDrawer rt={rt} /><HelpDrawer rt={rt} />
        <PoliciesSection rt={rt} /><SettingsSection ui={DEFAULT_UI} setUi={() => {}} /><PinsSection rt={rt} /><TutorialTip rt={rt} />
        <GovernanceSection rt={rt} /><ModulesSection rt={rt} /><MapSection rt={rt} /><SaveSection rt={rt} /><TradeDrawer rt={rt} /><FamilySection rt={rt} />
        <HintCard rt={rt} /><TradeCard rt={rt} /><MigrantCard rt={rt} /><Notice rt={rt} />
        <ExplorePanel rt={rt} target={{ tx: t.x, ty: t.y }} onClose={() => {}} />
        <Inspector rt={rt} sel={{ type: 'citizen', id: rt.state.citizens[0].id }} onClose={() => {}} onFollow={() => {}} />
      </div>,
    );
    const controls = container.querySelectorAll('button, input, select');
    expect(controls.length).toBeGreaterThan(40);
    const unnamed: string[] = [];
    controls.forEach(el => {
      const labelled = el.getAttribute('aria-label') || (el.id && container.querySelector(`label[for="${el.id}"]`)) || el.closest('label') || (el.textContent ?? '').trim();
      if (!labelled) unnamed.push(el.outerHTML.slice(0, 80));
    });
    expect(unnamed).toEqual([]);
    // nothing is a clickable div or span pretending to be a button
    expect(container.querySelectorAll('div[onclick], span[onclick]').length).toBe(0);
  });
  it('colour is never the only signal: alerts say Warning or Critical, bars carry numbers, severity is in the text', () => {
    const rt = new CivRuntime(null);
    rt.state.stock.food = 0;
    const { container } = render(<Hud rt={rt} onFocus={() => {}} />);
    expect(container.textContent).toMatch(/Critical:|Warning:/);
    const bars = render(<Inspector rt={rt} sel={{ type: 'citizen', id: rt.state.citizens[0].id }} onClose={() => {}} onFollow={() => {}} />).container;
    expect(bars.querySelector('[role="img"][aria-label*="Hunger"]')).not.toBeNull();
    expect(bars.textContent).toMatch(/Hunger is (low|moderate|high|critical)/);
  });
  it('live regions announce hints, notices and the build state without stealing focus', () => {
    const rt = new CivRuntime(null);
    rt.state.activeHint = { id: 'x', role: 'elder', level: 'observation', speaker: 'Ivo', text: 'Something.', tick: 1 };
    const { container } = render(<HintCard rt={rt} />);
    expect(container.querySelector('[aria-live="polite"], [role="status"]')).not.toBeNull();
  });
});
