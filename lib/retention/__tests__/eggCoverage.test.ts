import fs from 'fs';
import path from 'path';
import { EGGS } from '../eggs';

/* Every egg in the catalogue must have a trigger in the detector, not just a definition. A static guard against orphan eggs. */
describe('Easter eggs have triggers', () => {
  const src = fs.readFileSync(path.join(__dirname, '..', 'eggs.ts'), 'utf8');
  it.each(EGGS.map(e => e.id))('%s is referenced by a trigger', id => {
    const mentions = src.split(`'${id}'`).length - 1;
    expect(mentions).toBeGreaterThanOrEqual(2); // its definition, plus at least one trigger
  });
});
