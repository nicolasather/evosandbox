import { act, fireEvent, render, screen } from '@testing-library/react';
import { WorkspaceShell } from '../workspace/WorkspaceShell';
import { WORKSPACE_KEY } from '@/lib/workspace/layout';

let mounts = 0;
jest.mock('../Sandbox', () => {
  // eslint-disable-next-line @typescript-eslint/no-require-imports
  const React = require('react');
  return {
    Sandbox: ({ openHubSignal }: { openHubSignal?: number }) => {
      React.useEffect(() => { mounts += 1; }, []);
      return <div data-testid="sandbox" data-hub={openHubSignal} />;
    },
  };
});
jest.mock('../civworld/CivWorldPane', () => ({ CivWorldPane: () => <div data-testid="civ" /> }));

beforeAll(() => {
  window.matchMedia = window.matchMedia || ((q: string) => ({ matches: false, media: q, addEventListener: () => {}, removeEventListener: () => {} })) as never;
});
beforeEach(() => { mounts = 0; window.localStorage.clear(); });

describe('WorkspaceShell', () => {
  it('keeps Merging mounted through every layout change and remembers the layout', () => {
    render(<WorkspaceShell onLaunchMode={() => {}} />);
    const sandbox = screen.getByTestId('sandbox');
    for (const name of ['Split', 'Maximize', 'Collapse']) {
      act(() => { fireEvent.click(screen.getByRole('button', { name })); });
      expect(screen.getByTestId('sandbox')).toBe(sandbox);
    }
    act(() => { fireEvent.click(screen.getByRole('button', { name: 'Split' })); });
    expect(mounts).toBe(1);
    expect(JSON.parse(window.localStorage.getItem(WORKSPACE_KEY) as string).layout).toBe('split');
  });

  it('parks Merging (hidden, inert) when collapsed and shows the Merging tab when maximized', () => {
    render(<WorkspaceShell onLaunchMode={() => {}} />);
    expect(document.getElementById('ws-pane-merge')?.getAttribute('data-visible')).toBe('0');
    fireEvent.click(screen.getByRole('tab', { name: 'Merging' }));
    expect(document.getElementById('ws-pane-merge')?.getAttribute('data-visible')).toBe('1');
    expect(document.getElementById('ws-pane-civ')?.getAttribute('data-visible')).toBe('0');
  });

  it('Modes tab opens Merging and signals the hub', () => {
    render(<WorkspaceShell onLaunchMode={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: 'Modes' }));
    expect(screen.getByTestId('sandbox').getAttribute('data-hub')).toBe('1');
  });

  it('survives a corrupt saved layout', () => {
    window.localStorage.setItem(WORKSPACE_KEY, '{broken');
    render(<WorkspaceShell onLaunchMode={() => {}} />);
    expect(document.getElementById('workspace')?.getAttribute('data-layout')).toBe('civ');
  });
});
