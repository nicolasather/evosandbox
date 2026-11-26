"""Lists delivered art files that the game never references (backlog item 10). Run from the repo root: python docs/civilization-overhaul/e2e/unused-assets.py"""
import glob
import os

root = 'public/civilization'
files = [f.replace(os.sep, '/') for f in glob.glob(root + '/**/*.png', recursive=True) if 'preview' not in f]
src = ''
for p in glob.glob('components/civworld/*.ts*') + ['app/_workspace.css']:
    src += open(p, encoding='utf8').read()
unused = sorted(f for f in files if os.path.basename(f) not in src)
print(len(files), 'art files;', len(unused), 'not referenced by the game')
groups = {}
for f in unused:
    groups.setdefault(f.split('/')[2], []).append(os.path.basename(f))
for k, v in sorted(groups.items()):
    print(f'{k} ({len(v)}):', ', '.join(v))
