# Gameplay Systems — MVP contract

## Citizen loop

Named citizens use deterministic utility priorities: urgent need, assigned work priority, then nearest feasible task. MVP actions are idle, walk, gather, carry, build, eat, rest and socialize. A task must explain its blocker: missing input, tool, worker, storage, path or capacity.

## Resource loop

Every resource has a source, sink, storage rule and unit. Gathering creates loose goods; carrying moves them; storage protects them; production consumes inputs and creates outputs. Full storage pauses or redirects safely.

## Building loop

Blueprint → reserve site → deliver inputs → construction stages → completed building → functional output. Buildings use stable asset IDs from `ASSET_MANIFEST.md`; missing art falls back without changing simulation state.

## Discovery bridge

The existing merge/discovery engine remains authoritative. A valid discovery emits one event and unlocks a capability or recipe mapping; it never silently grants a completed building.

## Hints and history

Hints trigger only from real conditions and have observation, suggestion and guidance levels. Events store tick, actors, location, cause, consequence and related asset/discovery IDs.
