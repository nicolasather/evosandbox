# Workspace UX (implemented in `components/workspace/`)

- Tab strip: **Civilization** (default) | **Merging** | **Modes**. Merging is permanent and never unmounted.
- Layout states: `civ` (world only, Merging collapsed to a handle), `split` (world + Merging side by side, draggable divider, 28-72% width), `merge` (Merging fills the workspace, world one click away), `float`-style maximize is `merge`. Narrow screens (<820px): bottom drawer / tab switch instead of columns.
- Persistence: `evo.workspace.v1` stores `{ layout, splitPct }` only; invalid or out-of-range values are discarded on read.
- The Merging pane is a CSS containing block (`transform: translateZ(0)`) so Sandbox's fixed layers stay inside it. Resizing changes the pane's width only; it is never re-parented or remounted, so the craft session survives.
- The simulation clock lives outside the shell and keeps running in every layout.
- Keys: `Esc` on the divider restores the previous layout; divider is focusable and moves with arrow keys.
