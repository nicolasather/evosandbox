# Civilization Overhaul — Shared Art Direction v0.1

## Master direction

Warm, readable 2D pixel art for a living early settlement. Use a consistent 3/4 top-down camera, modular sprites, and a compact pixel grid that stays legible at game zoom. Characters are small but expressive: clear head/torso/legs separation, strong silhouettes, restrained outlines, and role props that read in one glance.

## Palette and light

- Natural warm earths: moss greens, ochre, clay, bark brown, river blue.
- Dark slate UI context: `#171923` / `#271f2c` for contrast.
- Light comes from top-left; cast shadows fall down-right.
- Outlines are deep plum-brown, never pure black.
- Reserve bright gold for discoveries, selected objects, and readable role accents.

## Pixel and animation rules

- Terrain tiles remain 32×32 px; character frame contract is 32×48 px, transparent background, with 4-direction rows.
- Keep character feet anchored at y=47; the extra 16 px above the tile height provides readable head/prop silhouette while preserving a 32 px world-footprint grid.
- Use 1–2 px clusters for facial features and tool highlights; avoid noisy single-pixel dithering.
- Idle: 2 frames; walk: 4 frames; work: 4 frames. Loops must preserve silhouette and avoid foot sliding.
- Sprite sheets must ship with JSON metadata naming rows, frames, directions, anchor, palette, and license.

## Coordination

IMAGE3 owns citizen/character assets and gameplay content. IMAGE owns environments/buildings/effects. Any asset that departs from this guide gets reviewed before integration.

## Character production notes (IMAGE3)

- First six silhouettes: gatherer (satchel/berry sprig), hunter (short spear), builder (mallet/plank), toolmaker (stone hammer), elder (staff), child (smaller body and quicker idle).
- Keep role props outside the torso silhouette where possible so the same base can be recolored and animated without changing the feet anchor.
- The current detailed sample uses `#271f2c` outline, moss-green clothing, ochre/gold accents, bark-brown boots, and muted skin tones to match the terrain batch.
- Character sheets ship with adjacent metadata for stable asset ID, frame size, rows, directions, anchor, loop names, palette, and license.

