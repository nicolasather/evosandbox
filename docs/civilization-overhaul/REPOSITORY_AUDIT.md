# Repository audit (Slice 0)

Source: code at `main` (4ddd763). The live app (https://evosandbox.vercel.app/) is built from `main`; there is no other long-lived integration branch (`origin/chore/secret-scan-readme-note` is a docs-only side branch). Owner override of the design's git rules: commit straight to `main`, never force-push, no manual deploys.

## Stack
Next.js 16 (App Router; `AGENTS.md` says read `node_modules/next/dist/docs/` before touching framework APIs), React 19, TypeScript, jest + jsdom, framer-motion, `ogl` (WebGL for 3D item plates), Supabase/Sentry/Vercel analytics (server side). Scripts: `npm run typecheck`, `npm run lint`, `npx jest <path>`, `npm run build`.

## Answers to master design §22
1. **Where are the modes?** `main` only. Registry: `lib/modes/registry.ts` (9 modes, see MODE_PRESERVATION_MATRIX.md). Mode switch: `components/AppRoot.tsx` (`useState<ModeId>`; the whole app is `/`, modes are NOT URL routes). The Mode Hub card grid is `components/ModeHub.tsx`, rendered inside `Sandbox`.
2. **Exact names:** see matrix. There are **9** modes, all `status: 'available'`.
3. **Merging = Main Evolution = `components/Sandbox.tsx`** (default mount; also mounted as `variant="civilization"` for the `civilization` mode id). It owns the landing film, TopBar, Bench/Workbench (`components/Workbench.tsx`, drag/merge), InventoryRail, graph/archive/timeline/museum views and the mode hub. State: the `Engine` (`lib/engine.ts`) held by `useSandbox()` (`lib/useSandbox.ts`), saved to `localStorage['evo.sandbox.v1']` via `Engine.save()/load()`; bench layout `evo.bench.v1`; craft session in `lib/craft/session.ts` + `lib/craft/benchMemory.ts`. **Unmounting Sandbox loses the in-progress craft and replays the landing, so the workspace shell must keep Sandbox mounted.**
4. **Existing Civilization code?** Three things share the name: (a) mode id `civilization` renders `Sandbox variant="civilization"` (merging bench with its own guide); (b) `components/civilization/LegacyCivilization.tsx` + `lib/civilization/{simulate,store,generate,memory,types}.ts`, a turn-based allocation sim (save `evo.civilization.v1`); (c) `CivilizationMode.tsx` + `lib/civilization/lifelines/*` ("Lifelines" chapters, saves `evo.civilization.lifelines*.v2`). **None is reusable as the new live settlement sim**; all stay untouched. New code lives in `lib/civ/` (pure sim) and `components/civworld/` so it cannot collide.
5. **Initial discovery IDs for capabilities:** chosen in Slice 7 from real ids in `data/db.json`. The bridge keys off the engine's discovered set (`engine.found`), subscribing via `engine.subscribe`; the engine is not modified.
6. **3D item models:** procedural, not asset files: `lib/visual3d/*` (geometry/materials/families/GLB loader) rendered by `components/Plate3D.tsx` / `Reconstruction3D.tsx` via `ogl`; data in `data/visuals_assets.json`. Untouched; Merging keeps them.
7. **Rendering approach:** plain `<canvas>` 2D, no new engine dependency. Simulation is pure TS in `lib/civ/` (deterministic fixed tick, seeded RNG), exposed through an external store (`useSyncExternalStore`, the same pattern as `Engine`); React is used only for panels/HUD.
8. **Can Merging be hosted in a resizable panel without remount?** Yes, with caveats. Sandbox assumes it owns the viewport (`html,body{height:100%;overflow:hidden}`, `#app{height:100%}`, `position:fixed` layers such as `#mtabs`, `.sx-tray`, toasts). Plan: keep it mounted permanently inside a pane that is a CSS containing block (`transform: translateZ(0)`), resize by CSS width only (never re-parent), hide with `visibility`/size, not unmount. Verified in-browser in Slice 1 (HANDOFF/QA_REPORT).
9. **Saves that stay untouched:** every `evo.*` / `es.*` key (matrix). New keys: `evo.civworld.v1` (versioned sim save, own namespace) and `evo.workspace.v1` (layout prefs only, never mixed with sim state).
10. **Smallest complete loop:** gather berries+wood -> store -> eat; place a shelter; a bridged discovery unlocks one building; the sim keeps running while Merging is open (= master design §18).

## Risks / discrepancies
- README is stale versus the app (9 modes, Lifelines, museum, retention). Code is the truth.
- Global CSS targets `body > …` and `#app`; embedding Sandbox in a pane needs containment checks.
- `CharacterStage` (crew) is mounted in `AppRoot` above all modes; the shell must not break it.
- The landing film lives inside Sandbox; with Civilization as default tab first-time visitors would not see it (decision D-003).
- No secrets found in reviewed files; `.env*` is not tracked.
