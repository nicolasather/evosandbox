import { fireEvent, render, screen } from '@testing-library/react';
import { CivRuntime } from '@/lib/civ/runtime';
import { DEFAULT_UI } from '@/lib/civ/uiPrefs';
import { BuildDrawer, GoalsDrawer, HelpDrawer, HintCard, Hud, JobsDrawer, LogDrawer } from '../civworld/panels';
import { ExplorePanel, PinsSection, PoliciesSection, SettingsSection, TutorialTip } from '../civworld/panels2';

describe('settlement panels', () => {
  it('HUD shows resources, season, phase, people and speed controls; pause works', () => {
    const rt = new CivRuntime(null);
    render(<Hud rt={rt} onFocus={() => {}} />);
    expect(screen.getByText(/People 5/)).toBeTruthy();
    expect(screen.getByText(/Small human group/)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: /Pause/ }));
    expect(rt.userPaused).toBe(true);
  });
  it('Build lists locked buildings with how to unlock them; Jobs explains blocked work; Goals and Log render', () => {
    const rt = new CivRuntime(null);
    const { unmount } = render(<BuildDrawer rt={rt} onPick={() => {}} active={null} />);
    expect(screen.getByText(/Discover Food Storage in Merging/)).toBeTruthy();
    unmount();
    render(<><JobsDrawer rt={rt} /><GoalsDrawer rt={rt} /><LogDrawer rt={rt} /><HelpDrawer rt={rt} /></>);
    expect(screen.getAllByText(/Needs the Stone Tool/).length).toBeGreaterThan(0);
    expect(screen.getByText(/Keep 3 days of food/)).toBeTruthy();
  });
  it('policies show their effect and only change on Confirm', () => {
    const rt = new CivRuntime(null);
    render(<PoliciesSection rt={rt} />);
    fireEvent.change(screen.getByLabelText('Resource use'), { target: { value: 'conserve' } });
    expect(screen.getByText(/60% full/)).toBeTruthy();
    expect(rt.state.policies.resourceUse).toBe('balanced');
    fireEvent.click(screen.getAllByRole('button', { name: 'Confirm' })[0]);
    expect(rt.state.policies.resourceUse).toBe('conserve');
  });
  it('settings expose quality, size, compact, hints, motion and sound; sound is off by default', () => {
    const changes: unknown[] = [];
    render(<SettingsSection ui={DEFAULT_UI} setUi={p => changes.push(p)} />);
    expect((screen.getByLabelText(/Sound on/) as HTMLInputElement).checked).toBe(false);
    fireEvent.change(screen.getByLabelText('Visual quality'), { target: { value: 'low' } });
    expect(changes.length).toBe(1);
  });
  it('pins can be added and removed; the expedition panel shows cost before sending', () => {
    const rt = new CivRuntime(null);
    const { unmount } = render(<PinsSection rt={rt} />);
    fireEvent.change(screen.getByLabelText('New project'), { target: { value: 'Find clay' } });
    fireEvent.click(screen.getByRole('button', { name: 'Pin' }));
    expect(rt.state.pins).toHaveLength(1);
    unmount();
    const t = rt.state.poi[0];
    render(<ExplorePanel rt={rt} target={{ tx: t.x, ty: t.y }} onClose={() => {}} />);
    expect(screen.getByText(/food\./)).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Send' }));
    expect(rt.state.expeditions).toHaveLength(1);
  });
  it('the tutorial tip never blocks and can be skipped; hints honour the dialogue mode', () => {
    const rt = new CivRuntime(null);
    const { rerender } = render(<TutorialTip rt={rt} />);
    fireEvent.click(screen.getByRole('button', { name: 'Skip' }));
    expect(rt.state.tutorial.done).toBe(true);
    rerender(<TutorialTip rt={rt} />);
    expect(screen.queryByText(/Getting started/)).toBeNull();
    rt.state.activeHint = { id: 'food_low', role: 'gatherer', level: 'observation', speaker: 'Ivo', text: 'We are eating faster than we gather.', tick: 1 };
    const off = render(<HintCard rt={rt} mode="off" />);
    expect(off.container.textContent).toBe('');
    off.unmount();
    render(<HintCard rt={rt} mode="compact" />);
    expect(screen.getByRole('button', { name: /Ivo/ })).toBeTruthy();
  });
});
