import fs from 'fs';
import path from 'path';
import { MODES } from '@/lib/modes/registry';

/* Regression guard for the Civilization overhaul (master design sections 10, 19): the workspace shell
   must not drop, rename or re-key any existing mode. */

const APP_ROOT = fs.readFileSync(path.join(process.cwd(), 'components', 'AppRoot.tsx'), 'utf8');

const EXPECTED: Record<string, string> = {
  'main-evolution': 'evo.sandbox.v1',
  survival: 'evo.survival.v1',
  civilization: 'evo.civilization.v1',
  archaeology: 'evo.archaeology.v1',
  'escape-room': 'evo.escaperoom.v1',
  decipher: 'evo.decipher.v1',
  'alien-archaeology': 'evo.alienarchaeology.v1',
  'reverse-evolution': 'evo.reverseevolution.v1',
  'minimum-path': 'evo.minimumpath.v1',
};

describe('mode preservation', () => {
  it('keeps every audited mode id and save key', () => {
    expect(Object.fromEntries(MODES.map(m => [m.id, m.saveKey]))).toEqual(EXPECTED);
  });
  it('every available mode still has an entry branch in AppRoot (main-evolution is the default workspace)', () => {
    for (const m of MODES.filter(x => x.status === 'available' && x.id !== 'main-evolution')) {
      expect(APP_ROOT).toContain(`mode === '${m.id}'`);
    }
    expect(APP_ROOT).toContain('<WorkspaceShell');
  });
  it('the civilization world never uses another mode save namespace', () => {
    const src = fs.readFileSync(path.join(process.cwd(), 'lib', 'civ', 'save.ts'), 'utf8');
    for (const key of Object.values(EXPECTED)) expect(src).not.toContain(`'${key}'`);
    expect(src).toContain("'evo.civworld.v1'");
  });
});
