import { render } from '@testing-library/react';
import { createEngine } from '@/lib/engine';
import { playDb } from '@/lib/processing';
import { RetentionLayer } from '../RetentionLayer';

/* The optional layer mounts each system only once its unlock holds, and the bench no longer draws a coin or sticker HUD. */

jest.mock('../Companion', () => { const R = jest.requireActual('react'); return { Companion: () => R.createElement('div', { 'data-testid': 'companion' }) }; });
jest.mock('../EggWatcher', () => { const R = jest.requireActual('react'); return { EggWatcher: () => R.createElement('div', { 'data-testid': 'egg' }) }; });
jest.mock('../EventLayer', () => { const R = jest.requireActual('react'); return { EventLayer: () => R.createElement('div', { 'data-testid': 'events' }) }; });
jest.mock('../NpcEncounter', () => { const R = jest.requireActual('react'); return { NpcEncounter: () => R.createElement('div', { 'data-testid': 'npc' }) }; });
jest.mock('../Hub', () => ({ Hub: () => null }));
jest.mock('../ShareCard', () => ({ ShareCard: () => null }));
jest.mock('../CosmeticApplier', () => ({ CosmeticApplier: () => null }));

describe('RetentionLayer gating', () => {
  const none = { has: () => false };
  const all = { has: () => true };

  it('mounts no optional system before its unlock', () => {
    const { queryByTestId } = render(<RetentionLayer engine={createEngine(playDb)} version={0} entered view="work" busy={false} unlocks={none} />);
    expect(queryByTestId('companion')).toBeNull();
    expect(queryByTestId('egg')).toBeNull();
    expect(queryByTestId('events')).toBeNull();
    expect(queryByTestId('npc')).toBeNull();
  });

  it('mounts each system once its unlock holds, on the bench', () => {
    const { getByTestId, queryByTestId } = render(<RetentionLayer engine={createEngine(playDb)} version={0} entered view="work" busy={false} unlocks={all} />);
    expect(queryByTestId('companion')).toBeNull(); // the corner companion is now the global crew stage, mounted in AppRoot
    expect(getByTestId('egg')).toBeTruthy();
    expect(getByTestId('events')).toBeTruthy();
    expect(getByTestId('npc')).toBeTruthy();
  });

  it('keeps the Easter-egg watcher off while the player is not on the bench', () => {
    const { queryByTestId } = render(<RetentionLayer engine={createEngine(playDb)} version={0} entered view="arch" busy={false} unlocks={all} />);
    expect(queryByTestId('egg')).toBeNull();
  });

  it('draws no persistent coin or sticker control on the bench', () => {
    const { container } = render(<RetentionLayer engine={createEngine(playDb)} version={0} entered view="work" busy={false} unlocks={all} />);
    expect(container.querySelector('.rpill')).toBeNull();
    expect(container.querySelector('.rpill-row')).toBeNull();
  });
});
