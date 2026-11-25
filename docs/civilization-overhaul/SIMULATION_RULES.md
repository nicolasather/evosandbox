# Simulation Rules — MVP

- Simulation advances on deterministic seeded ticks; rendering and animation are independent.
- Pause, normal and fast speeds are explicit. Background tabs reduce rendering work and never silently consume large resources.
- Citizens have hunger, rest, safety, health and social pressures; no hidden meters or random opening-hour disease.
- Work is feasible only when prerequisites, travel access, inputs and output storage are valid.
- Population growth requires housing capacity and adequate food; no unexplained instant growth.
- Resources may regrow or deplete according to their node profile. Overharvest has visible consequences.
- Construction and production are idempotent: retries cannot duplicate goods, discoveries or timeline events.
- Save data stores versioned simulation state, stable citizen IDs, event history and seeded randomness; art failure never corrupts saves.
- Hazards require a cause, warning, response and understandable outcome.
