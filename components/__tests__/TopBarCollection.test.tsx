/* eslint-disable @typescript-eslint/no-explicit-any -- test doubles are deliberately partial */
import { render, fireEvent } from '@testing-library/react';
import { TopBar } from '@/components/TopBar';

/* The Collection is a top-bar feature: its tile appears once unlocked, and pressing it opens the drawer. */
describe('TopBar Collection tile', () => {
  const engine = {
    stats: () => ({ core: 5, coreTotal: 200, hidden: 0, hiddenTotal: 0, combos: 0, failed: 0, eras: 1, eraTotal: 14, routesFound: 0, routesTotal: 0, requiredFound: 0, requiredTotal: 0 }),
    db: { eras: [{ id: 'e1', name: 'Era1' }], nodes: [] },
    erasReached: () => [{ id: 'e1', name: 'Era1' }],
    currentEra: () => ({ name: 'Era1', id: 'e1' }),
    has: () => true,
    eraProgress: () => ({ required: 0, requiredDone: 0, complete: false, name: 'Era1' }),
    search: () => ({ hits: [], hiddenMatches: 0 }),
    subscribe: () => () => {},
    getVersion: () => 0,
  } as any;

  const base = {
    engine, view: 'work' as const, onView: () => {}, onOpen: () => {}, onReset: () => {}, onShortcuts: () => {},
    onJournal: () => {}, onWorld: () => {}, onHub: () => {}, onTrade: () => {}, onLab: () => {}, onMuseum: () => {},
  };

  it('shows the tile only when Collection is unlocked, and opens the drawer when pressed', () => {
    const onCollection = jest.fn();
    const locked = render(<TopBar {...base} unlocks={{ has: () => false, fresh: () => false, opened: () => {} }} onCollection={onCollection} />);
    expect(locked.container.querySelector('#collection-open')).toBeNull();
    locked.unmount();

    const { container } = render(<TopBar {...base} unlocks={{ has: (id: string) => id === 'collection', fresh: () => false, opened: () => {} }} onCollection={onCollection} />);
    const tile = container.querySelector('#collection-open') as HTMLButtonElement;
    expect(tile).not.toBeNull();
    fireEvent.click(tile);
    expect(onCollection).toHaveBeenCalledTimes(1);
  });
});
