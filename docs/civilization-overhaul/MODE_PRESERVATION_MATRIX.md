# Mode preservation matrix

Registry: `lib/modes/registry.ts`; switch: `components/AppRoot.tsx` (`useState<ModeId>`, no URL routes; every mode is entered from the Mode Hub inside Sandbox). Verified count: **9**, all `available`. Never hardcode the count; read the registry.

| ModeId | Visible name | Entry component (AppRoot) | Save key | Core mechanic | Overhaul policy |
|---|---|---|---|---|---|
| `main-evolution` | Main Evolution (The Timeline) | `Sandbox` (default) | `evo.sandbox.v1` (+ `evo.bench.v1`, `evo.unlocks.v1`, `evo.knowledge.v1`) | Combine raw materials into discoveries (the Merging engine) | Becomes the **Merging tab**; Sandbox kept mounted; engine untouched |
| `survival` | Survival (Adapt) | `SurvivalMode` | `evo.survival.v1` | Keep a prehistoric group alive on a generated map | Untouched |
| `civilization` | Civilization (Settlements) | `Sandbox variant="civilization"`; Lifelines/Legacy components in `components/civilization/` | `evo.civilization.v1`, `evo.civilization.lifelines.v2`, `…campaign.v2`, `evo.civilization.guide.v1` | Merging bench with its own guide; Lifelines chapters; legacy allocation sim | Kept as-is, still launchable. The NEW live-settlement Civilization is the primary tab of the workspace with its own save `evo.civworld.v1` |
| `archaeology` | Archaeologist (Recover) | `ArchaeologyMode` | `evo.archaeology.v1` | Excavate and interpret a site | Untouched |
| `escape-room` | Historical Escape Room | `EscapeRoomMode` | `evo.escaperoom.v1` | Puzzle rooms in historical settings | Untouched |
| `decipher` | Decipher (Read the Lost) | `DecipherMode` | `evo.decipher.v1` | Decode scripts | Untouched |
| `alien-archaeology` | Alien Archaeology | `AlienArchaeologyMode` | `evo.alienarchaeology.v1` | Interpret unknown artefacts | Untouched |
| `reverse-evolution` | Reverse Evolution | `ReverseEvolutionMode` | `evo.reverseevolution.v1` | Deconstruct a smartphone to stone | Untouched |
| `minimum-path` | Minimum Path (Shortest Route) | `MinimumPathMode` (+ in-Sandbox `minpath` view) | `evo.minimumpath.v1` | Shortest route through the discovery graph | Untouched |

Shared keys that must never be rewritten by the civ world: `evo.profile.v1`, `evo.museum.v1`, `evo.trade.v1`, `evo.retention.v1`, `evo.characters.v1`, `evo.learn.v1`, `evo.notebook.v1`, `evo.theme`, `evo.quality`, `evo.scene`, `evo.flag.*`, `es.modepackets.*`.

Regression checks after workspace slices: the Merging tab still shows the Mode Hub; each mode id still launches from the hub and returns; no write to any key above from the civ world (`lib/civ/__tests__/preservation.test.ts`).
