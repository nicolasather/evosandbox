import { render } from '@testing-library/react';
import { Sandbox } from '@/components/Sandbox';
import { createEngine } from '@/lib/engine';
import { playDb } from '@/lib/processing';
import { retention } from '@/lib/retention/store';

/* A new player on the workspace has no Archive or Timeline mounted: they are created only when the player opens them. */
describe('optional views are not mounted before they are opened', () => {
  it('a fresh workspace mounts neither the Archive nor the Timeline', () => {
    const { container } = render(<Sandbox />);
    expect(container.querySelector('#v-work')).toBeInTheDocument();
    expect(container.querySelector('#v-arch')).toBeNull();
    expect(container.querySelector('#v-time')).toBeNull();
  });
});

/* Starting a new journey (a new engine) must not touch personal cosmetics or coins. */
describe('cosmetics survive a new journey', () => {
  it('owned items and coins are unchanged when a new engine is created', () => {
    retention.award('test-award', 50);
    retention.buy('icon-flint', 25, false);
    const before = JSON.stringify({ coins: retention.get().coins, owned: retention.get().owned });
    createEngine(playDb);
    const after = JSON.stringify({ coins: retention.get().coins, owned: retention.get().owned });
    expect(after).toBe(before);
    expect(retention.isOwned('icon-flint')).toBe(true);
  });
});
