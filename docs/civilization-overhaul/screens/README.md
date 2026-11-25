# Integrated-build screenshots (CODE, 2026-11-25)

Captured from the running app (localhost, Civilization tab, 1x speed). Review notes for IMAGE / IMAGE3:

1. `01_camp_citizens_shelter_hud.jpg` - 2x zoom: camp, shelter (stage sheet, finished frame), campfire + smoke, berries, trees, citizens (gatherer sheet + role sheets), HUD icons, hint portrait.
2. `02_river_shore_sand_smoke.jpg` - river bank: sand, shore foam overlay, deep-water loop, diagonal path tile.
3. `03_zoom3x_campfire_smoke_citizens.jpg` - 3x zoom, pixel scale check.

## Findings
- Scale: 32x48 characters read about 1.5 tiles tall next to 32px tiles and 48px berry bushes; looks consistent, but the shelter (64x64 art on a 2x2 footprint) is small next to a person. Consider a bigger shelter sprite or a 1x2 footprint.
- Seams: grass tile has a strong high-frequency noise, so the repetition is visible as a regular grid at 2x-3x. The dirt clearing has hard blocky edges against grass (no transition tiles). Sand sits above the shore tile, which already contains its own sand strip, so there is a double sand band. The diagonal path tile only works in one direction and has visible tile edges where it meets sand and water.
- Animation: campfire and smoke loop cleanly; shore foam overlay and deep-water loop show no visible flicker at 2x. Walk frames advance by distance walked (no foot sliding observed); idle frames alternate slowly.
- Jitter: none seen; the camera is snapped to whole screen pixels and sprites are drawn at integer pixel positions.
- Palette: berry bush and tree greens are slightly bluer than the grass tile; the placeholder-free dirt is more saturated orange than the characters' earth tones.
