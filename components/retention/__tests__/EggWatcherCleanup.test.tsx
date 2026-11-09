import { render } from '@testing-library/react';
import { createEngine } from '@/lib/engine';
import { playDb } from '@/lib/processing';
import { EggWatcher } from '../EggWatcher';

/* The Easter-egg watcher listens to the whole window. Once it leaves the bench, every listener it added must be removed. */
describe('EggWatcher cleanup', () => {
  const EVENTS = ['pointerdown', 'pointermove', 'click', 'dblclick', 'pointerover', 'keydown', 'change'];

  it('removes every window listener it adds when unmounted', () => {
    const add = jest.spyOn(window, 'addEventListener');
    const remove = jest.spyOn(window, 'removeEventListener');
    const clear = jest.spyOn(window, 'clearInterval');
    const { unmount } = render(<EggWatcher engine={createEngine(playDb)} active />);
    const added = add.mock.calls.map(c => c[0]).filter(t => EVENTS.includes(t as string));
    expect(added.length).toBe(EVENTS.length);
    unmount();
    const removed = remove.mock.calls.map(c => c[0]).filter(t => EVENTS.includes(t as string));
    for (const t of EVENTS) expect(removed).toContain(t);
    expect(clear).toHaveBeenCalled();
    add.mockRestore(); remove.mockRestore(); clear.mockRestore();
  });
});
