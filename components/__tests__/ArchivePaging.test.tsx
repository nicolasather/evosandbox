import { fireEvent, render } from '@testing-library/react';
import { ArchiveView } from '../ArchiveView';
import { createEngine } from '@/lib/engine';
import { playDb } from '@/lib/processing';

jest.setTimeout(60_000);

/* The Archive draws one page of cards at a time; "Show more" adds the next page. Nothing is dropped from the list. */
describe('Archive paging', () => {
  it('renders a page of cards and reveals more on request', () => {
    const engine = createEngine(playDb);
    const { container, getByText } = render(<ArchiveView engine={engine} version={0} active onOpen={() => {}} />);
    const cards = () => container.querySelectorAll('#arch-grid .card').length;
    const total = engine.db.nodes.filter(n => !n.hidden || engine.has(n.id)).length;
    expect(cards()).toBeLessThanOrEqual(120);
    if (total > 120) {
      const more = getByText(/Show \d+ more/);
      fireEvent.click(more);
      expect(cards()).toBeGreaterThan(120);
    }
  });
});
