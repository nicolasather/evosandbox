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

- Character frame contract starts at 32×32 px, transparent background, 2-direction sample first.
- Keep feet anchored at y=31; do not move the pivot between frames.
- Use 1–2 px clusters for facial features and tool highlights; avoid noisy single-pixel dithering.
- Idle: 2 frames; walk: 4 frames; work: 4 frames. Loops must preserve silhouette and avoid foot sliding.
- Sprite sheets must ship with JSON metadata naming rows, frames, directions, anchor, palette, and license.

## Coordination

IMAGE3 owns citizen/character assets and gameplay content. IMAGE owns environments/buildings/effects. Any asset that departs from this guide gets reviewed before integration.

