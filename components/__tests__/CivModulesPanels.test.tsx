import { fireEvent, render, screen } from '@testing-library/react';
import { CivRuntime } from '@/lib/civ/runtime';
import { FamilySection, GovernanceSection, MapSection, ModulesSection, TradeDrawer, ClimateChips } from '../civworld/panels3';

describe('optional module panels', () => {
  it('module switches change settings and are remembered', () => {
    const rt = new CivRuntime(null);
    const { rerender } = render(<ModulesSection rt={rt} />);
    fireEvent.click(screen.getByLabelText(/Trade, prices and caravans/));
    expect(rt.state.settings.modules.trade).toBe(false);
    rerender(<ModulesSection rt={rt} />);
    fireEvent.click(screen.getByLabelText(/Trade, prices and caravans/));
    expect(rt.state.settings.modules.trade).toBe(true);
  });
  it('the map section starts a procedural settlement only after confirmation, keeping a backup', () => {
    const store = new Map<string, string>();
    const storage = { getItem: (k: string) => store.get(k) ?? null, setItem: (k: string, v: string) => { store.set(k, v); }, removeItem: (k: string) => { store.delete(k); }, clear: () => store.clear(), key: () => null, length: 0 } as unknown as Storage;
    const rt = new CivRuntime(storage);
    render(<MapSection rt={rt} />);
    const btn = screen.getByRole('button', { name: 'Start a new settlement' }) as HTMLButtonElement;
    expect(btn.disabled).toBe(true);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'procedural' } });
    fireEvent.change(screen.getByLabelText('Seed'), { target: { value: '7' } });
    fireEvent.click(screen.getByRole('checkbox'));
    fireEvent.click(btn);
    expect(rt.state.mapKind).toBe('procedural');
    expect(rt.state.seed).toBe(7);
    expect(store.get('evo.civworld.v1.backup')).toBeTruthy();
  });
  it('trade shows prices and explains what a route needs; governance shows benefit and cost and refuses without an assembly; families and climate chips render', () => {
    const rt = new CivRuntime(null);
    render(<><TradeDrawer rt={rt} /><GovernanceSection rt={rt} /><FamilySection rt={rt} /><ClimateChips rt={rt} /></>);
    expect(screen.getByText(/needs a market and at least 3 road tiles/)).toBeTruthy();
    expect(screen.getAllByText(/Benefit:/).length).toBeGreaterThan(0);
    fireEvent.click(screen.getAllByRole('button', { name: 'Adopt' })[0]);
    expect(screen.getAllByText(/assembly/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/Water /)).toBeTruthy();
    expect(screen.getByText(/°C/)).toBeTruthy();
  });
});
