
EVOLUTION SANDBOX
CIVILIZATION WORLD — EXPANDED GAME DESIGN BIBLE &amp; PRODUCTION PLAN
Version 3.0  |  Expanded game design bible, feature catalogue, worked examples and multi-agent production plan

Embedded visual concept. This is a direction reference, not a final approved screenshot, asset sheet or exact UI layout.
READ THIS FIRST — INSTRUCTIONS FOR CLAUDE
This document replaces the shorter v1 brief. Treat it as the master design specification for the proposed overhaul. Send this complete document, including its embedded image, to the Gemini and ChatGPT bots through Orca. Then send each bot the role-specific section below. Do not merely tell them that a document exists: make sure they receive the actual text and image, and ask them to acknowledge receipt.
If Orca supports direct bot-to-bot communication or shared project files, use those mechanisms. If it does not, create copy-ready messages for the owner to relay. Never claim that a bot received a file or message unless Orca confirms it.
Most important workflow rule: Claude must work in small, independently testable slices while Gemini and ChatGPT generate the next asset batches in parallel. Claude must NOT wait for all art to be finished before beginning implementation. Use temporary but clearly identified placeholders and stable asset contracts, then replace placeholders as approved assets arrive.
The public repository README currently describes a Next.js discovery/crafting experience and physical merging, but does not fully document the mode hub and the broader live experience described by the owner. Therefore, audit the exact branch, deployed application and all mode entry points before deciding what exists. The live application and owner-confirmed behavior take priority over stale documentation.
Repository: https://github.com/nicolasather/evosandbox
Live application: https://evosandbox.vercel.app/
0. NON-NEGOTIABLE PRODUCT DECISIONS
Civilization becomes the primary experience and the main place where the player spends time.
The existing Merging experience is NOT deleted, hidden permanently, or replaced. It remains a permanent, first-class tab/tool that can be opened, resized, docked, collapsed and restored while the civilization remains visible.
All other existing game modes remain available. Do not merge them into Civilization, remove them, or silently change their rules. Audit and preserve the exact current list; the owner has described the app as having around 9 or 10 modes, so do not hardcode an assumed count.
The existing discovery/crafting engine remains the authority for valid combinations and discoveries. Do not create a competing recipe database.
Keep the existing 3D models for discovered items wherever they are already used and technically available. New world visuals are primarily 2D pixel art.
Gemini and ChatGPT both generate actual visual assets, including animation-ready sprite sheets. Gemini owns environment/building/effects art; ChatGPT owns people/character animation/portraits and event art. They must coordinate one shared style.
Every major image batch must be preceded by online visual research: inspect at least five relevant examples, compare approaches, document URLs/creators/licensing and derive an original art direction. Research is not permission to copy another game's assets.
Claude is the implementation coordinator and works incrementally. Art generation and code implementation overlap in time through small contracts and handoffs.
No production deployment, destructive save migration, removal of a major system, or merge to main without owner approval.
1. PRODUCT VISION
Evolution Sandbox becomes a living human-civilization sandbox built around the existing spirit of discovery. The player guides a community from a small group of humans toward increasingly complex societies. People need food, water, shelter, tools, safety and social stability. They work, learn, invent, build, trade, explore, disagree, adapt and leave a visible history.
The player is not expected to micromanage every citizen. The player sets priorities, solves bottlenecks, chooses what to invent, decides where to expand and responds to important events. The inhabitants handle routine work through understandable autonomous behavior.
The distinctive hook is the connection between physical merging/crafting and civilization development: an invention is not just another entry in a collection. It changes what people can do, what they produce, which buildings they can construct and what new problems appear.
1.1 Design pillars
Pillar
What it means in play
What to avoid
Living world
The settlement is visible and active; people and buildings respond to simulation state.
A static background with counters.
Meaningful invention
Discoveries unlock practical capabilities and visible changes.
Crafting that only increases a collection number.
Legible simulation
The player can understand why food, population or production changes.
Opaque random outcomes and spreadsheet overload.
Human-scale stories
Named people, households, roles and events create attachment.
Thousands of meaningless NPCs.
Player agency
Set priorities, build, assign, explore, craft and make policy choices.
Constantly clicking individual villagers to keep them alive.
Historical possibility
Progression is grounded in real developments but allows alternate paths where plausible.
A rigid one-size-fits-all timeline.
Modular workspace
Civilization, Merging and other modes can coexist in the same app shell.
Forcing the player to abandon the settlement to craft.

2. THE CORE PLAY SESSION
2.1 Main gameplay loop
Observe: scan the settlement, resource stores, people and current problems.
Interpret: open a villager thought, settlement alert or building panel to understand a bottleneck.
Choose: decide whether to gather, build, reassign labour, explore, research, trade or invent.
Invent: open the Merging workspace without losing sight of the settlement; combine items through the existing engine.
Apply: the discovery unlocks a capability. The player chooses or the settlement begins a relevant production/construction action.
Adapt: the simulation reacts. New efficiencies, demands, side effects and opportunities appear.
Remember: important events are recorded in a timeline/history book so the civilization feels like it has a past.
Expand: use new capabilities to reach another local milestone or historical stage.
2.2 What makes a good session
A satisfying 10–20 minute session should contain at least one visible improvement, one meaningful choice and one understandable consequence. Example: food is adequate but storage is poor; a villager notices spoilage; the player experiments with materials and discovers a storage-related item; the new item unlocks a granary or preservation method; food loss decreases; the population can safely grow; the larger population then increases housing and water demand.
Do not require a specific recipe to be guessed with no feedback. The discovery system can retain experimentation, but contextual hints, near-miss feedback and alternative routes should help the player reason.
3. WORLD STRUCTURE AND CAMERA
3.1 World map
Use a tile-based or chunked world that can expand without generating one enormous image.
Start with a compact playable region containing a river or water source, forest, open ground, stone/ore deposits and a few resource nodes.
Terrain types should influence movement, building placement, gathering and environmental risk.
Use a consistent 3/4 top-down or isometric-like camera. Choose only after Gemini's reference study and Claude's renderer prototype.
Support pan, zoom, drag-to-pan, selection, hover inspection and a camera recenter button.
Important objects need selection hit areas larger than their visible sprite when necessary.
The first prototype can use a hand-authored small map. Procedural map generation is a later feature, not a blocker.
3.2 World layers
Layer
Contents
Interaction
Ground
Grass, dirt, sand, rock, shore, shallow/deep water.
Mostly visual; terrain affects placement and movement.
Natural resources
Trees, bushes, stone outcrops, animals, wild food.
Gather, deplete, regrow or migrate according to rules.
Structures
Shelters, houses, storage, farms, workshops, roads.
Select, inspect, construct, upgrade, repair.
Agents
Villagers and later animals/transport.
Select, follow, inspect, assign priority.
Effects
Fire, smoke, water flow, dust, weather, seasonal details.
Visual feedback; some effects communicate state.
Overlays
Work zones, building footprints, paths, resource reach, danger.
Toggleable planning aids.

3.3 Camera and rendering performance
Use a renderer appropriate to the existing Next.js architecture after inspecting the repository. A canvas/tile renderer may be appropriate for the map, with React for panels and controls. Do not move the whole app to a new engine without a demonstrated need. Render only visible chunks where possible; separate static terrain from dynamic agents/effects; cap animation work on low-quality settings; support reduced motion.
4. THE CIVILIZATION SIMULATION — SYSTEM DESIGN
4.1 Simulation clock
The simulation has a clear in-game clock with pause, normal speed and fast-forward controls.
Use deterministic simulation ticks and seeded randomness so bugs can be reproduced and saves remain stable.
Visual animation runs independently from economic simulation ticks. Do not calculate the economy every animation frame.
When the player opens Merging, the world should continue by default at the current simulation speed, with a clear pause control and an optional 'pause while crafting' preference.
When the browser tab is backgrounded, reduce rendering work. Decide whether simulation time pauses or advances based on an explicit game rule; do not silently consume large amounts of resources.
4.2 Population and citizens
Use a hybrid model. A small number of named, visible citizens are simulated as individuals. Larger population totals can be represented in cohorts/households so the simulation remains efficient.
Citizen field
Purpose
id / name
Stable identity for saves, history and selection.
age group
Child, adult, elder; exact age only where it matters.
household / home
Where the person belongs and sleeps.
role / skills
Current occupation and a few relevant skill levels.
needs
Hunger, rest, safety, health and social contact; avoid excessive meters.
current task
Gathering, carrying, building, farming, crafting, resting, socializing.
traits
A small number of readable tendencies such as diligent, curious or cautious.
relationships
Household and a few meaningful social links; not a giant social graph in MVP.
knowledge
Relevant learned skills or discovery contribution.
history
A short event record for notable citizens.

4.3 Needs and behavior
Citizens should choose from feasible actions using a simple utility/priority system, not a large language model call every few seconds. Each action has prerequisites, travel cost, resource cost, expected benefit and urgency.
Need / pressure
Example response
Player-level intervention
Hunger
Find available food, consume from household or communal store.
Increase food production, open a new food source, prioritize gathering.
Rest
Return home or use an available sleeping place.
Build housing / sleeping capacity; reduce overwork.
Safety
Avoid a danger zone or seek shelter.
Clear threat, build protection, change work zone.
Health
Rest, use available care or avoid unsafe conditions.
Improve water, food, sanitation or later medical capacity.
Social
Spend time near household/community.
Provide communal spaces and avoid excessive work pressure.

MVP behavior should be intentionally small: idle, walk, gather, carry, eat, work/build, rest and react. Add sophisticated personality-driven plans only after the core loop is reliable.
4.4 Jobs and labour allocation
The player sets work priorities by category or zone rather than manually commanding every person.
Each job has a required capability, workplace or resource node, output rate, input cost and worker capacity.
Citizens choose the highest-priority feasible task while considering urgent needs and travel distance.
If a job cannot run, show the reason: missing tool, no worker, no input, full storage, blocked path or unavailable resource.
Allow the player to assign a citizen directly as an override, but autonomous assignment remains the default.
4.5 Resources and inventory
Resource family
Early examples
Later uses
Food
Berries, meat, fish, gathered plants.
Farming, preservation, trade, population support.
Raw materials
Wood, stone, bone, fibre, clay.
Tools, shelters, construction, craft inputs.
Water
Accessible water, stored water.
Consumption, farming, sanitation, production.
Crafted goods
Tools, containers, rope, pottery.
Work efficiency, storage, buildings, trade.
Knowledge
Practical knowledge and discovery progress.
Unlocks, specialist roles, improved production.
Wealth/trade goods
Surplus materials and valued goods.
Trade and later social/economic systems.

Every resource needs a source, sink, storage rule and unit. Avoid hidden arbitrary conversions. A building's output must be explainable. Use a small number of resource types at first and expand only when they support a distinct decision.
4.6 Resource logistics
Gathering creates items at a node; carrying moves them to storage or a workplace.
Storage has capacity and may have preservation/protection properties.
Production buildings consume inputs from reachable storage and create outputs.
Travel distance and path access should matter, but do not simulate complex logistics in the first milestone.
If a store is full, production should pause or choose another valid destination, with a visible explanation.
4.7 Food, farming and ecology
Early food comes from gathering, hunting/fishing if the environment supports it, and opportunistic sources.
Agriculture should be a major capability unlock, not merely a new icon. It creates fields, planting/harvest cycles, seasonal yield and labour demands.
Food can spoil or be lost only when the player has a clear way to understand and mitigate it.
Trees and renewable natural resources can regrow over time; overharvesting should have a cost.
Animals and wildlife can be a later system. Do not build a full ecosystem simulator for MVP.
4.8 Housing and settlement capacity
Shelters/houses provide sleeping capacity and a housing score.
Overcrowding affects rest, health or happiness in a visible, gradual way.
Building placement must respect terrain, access and footprint.
Housing upgrades should reflect available materials and technologies.
Do not make every citizen require an individually placed bed in the first release; use capacity abstractions.
4.9 Health, sanitation and hazards
Introduce health and sanitation as later, legible pressures. Unsafe water, food shortage, crowding and severe weather can create risk. Do not add disease as random punishment in the opening hours. A hazard must have a cause, warning, response options and understandable outcome.
4.10 Knowledge, skills and technology
Distinguish item discovery from broad capabilities. A discovery may unlock a recipe, while a technology/capability may unlock a new production chain or institution.
Use the existing discovery graph and data as the source of truth for items and combinations.
Technology gates should be based on verified existing data and plausible prerequisites; do not invent a parallel recipe system.
Skills improve through relevant work, but skill bonuses should be modest and visible.
Some knowledge can be communal and persist across generations; specialist skills may need teaching or practice.
4.11 Buildings and construction
Building
Purpose
Example requirements
Unlock consequence
Campfire
Light, cooking/social gathering point.
Fire capability + fuel.
Cooking, warmth, communal gathering.
Shelter
Basic sleeping capacity.
Wood/fibre or available local materials.
Safer rest and population support.
Storage area
Protect and centralize goods.
Basic construction materials.
Less loss and better logistics.
Workshop
Craft/production workplace.
Tools/materials + relevant discovery.
Specialized production jobs.
Farm plot
Cultivate food.
Agriculture capability + suitable ground.
Seasonal food production.
Well / water point
Improve water access.
Water-related knowledge + materials.
More reliable settlement capacity.
Road/path
Improve movement.
Basic construction capability.
Lower travel time in developed areas.
Market/trading post
Exchange surplus goods.
Trade/social prerequisites.
Trade routes and specialized goods.

The list is a design proposal, not a command to add all buildings immediately. Claude must map every building to existing discovery IDs where possible and identify any new data requirements.
4.12 Exploration and map expansion
Nearby unexplored areas can contain resource nodes, fertile land, hazards or points of interest.
Exploration requires a citizen/task or a simple expedition assignment.
The player should receive a useful report: what was found, distance, risk and possible value.
New areas should extend the same world rather than switching to an unrelated minigame.
Keep exploration local and simple for MVP; distant regions and map-scale travel are later.
4.13 Trade and exchange
Trade is a mid-game feature. Start with a simple local exchange or visiting trader: surplus goods can be exchanged for a scarce resource. Later, support trade routes, prices influenced by supply/demand and agreements. Do not implement a full market economy before production and storage are stable.
4.14 Society, culture and governance
Social development should emerge from settlement size and capabilities rather than arbitrary era buttons. Later systems may include community rules, leadership, public projects, traditions, education, conflict resolution and cultural identity. Each policy should have a benefit and a trade-off. Avoid adding a huge abstract politics panel before the player has a settlement worth governing.
4.15 Events and the living history
Events are triggered by simulation state or meaningful milestones, not random notification spam.
Examples: first fire, first permanent shelter, food shortage, first harvest, workshop established, river flood, first trade, population milestone.
Each event stores structured facts: event type, date/tick, location, actors, cause, consequence and related discovery/building.
The UI can turn structured facts into concise narrative text. AI may help draft optional flavor text, but must not change game state or fabricate causal facts.
Provide a timeline/history panel that can be replayed or filtered by people, inventions, buildings and disasters.
5. THE VILLAGER HINT AND IDEA SYSTEM
5.1 Purpose
Villagers are the in-world tutorial and hint system. They should notice actual constraints and communicate them in human language. This is more immersive than a generic quest list and naturally teaches the player what the simulation needs.
5.2 Three hint strengths
Level
Example
Rule
Observation
“The rain keeps soaking the food we leave outside.”
Describes a real problem; no recipe reveal.
Suggestion
“We should find a way to keep supplies dry.”
Suggests a direction, still allows experimentation.
Guidance
“A covered storage place might solve this.”
More direct; requested or offered after repeated struggle.

5.3 Hint data contract
HintDefinition {  id, triggerId, eligibleEras, eligibleDiscoveryIds,  requiredResources?, requiredBuilding?, minimumSeverity?,  speakerRole?, level, dialogueKey, cooldownTicks,  resolutionCondition, priority, repeatPolicy}
Hints only trigger when their preconditions are true.
Do not hint at discoveries that are locked, unreachable or already completed.
Use cooldowns and deduplication so the same complaint does not repeat constantly.
Prioritize urgent survival problems, then useful new capabilities, then optional ideas.
Allow the player to ask for another hint or dismiss one.
The same problem can be expressed by different character roles, but dialogue must remain grounded in state.
6. DISCOVERY, MERGING AND CIVILIZATION — ONE CONNECTED SYSTEM
6.1 Shared discovery contract
Merging is the player's experimentation workspace. Civilization is where the results become useful. They must share discovery state and inventory through one authoritative store or a well-defined adapter.
Player opens Merging from the workspace tab or a compact dock.
The existing physical merge/craft interaction runs unchanged wherever possible.
The existing engine validates the combination and returns its existing discovery result.
The discovery event is written once to the shared progression state.
Civilization receives a capability event: recipe unlocked, tool available, building enabled, production method enabled, or knowledge milestone recorded.
The player sees a short, skippable discovery result and can return focus to the settlement.
A world-side consequence appears only if the relevant building, worker, resources and conditions exist.
6.2 Avoid false instant effects
Discovering a tool should not magically fill the town with that tool. It should unlock the ability to craft or produce it. The player may need to build a workshop, allocate materials and assign a worker before production begins. This keeps inventions meaningful.
6.3 Discovery categories and effects
Discovery outcome
Possible civilization effect
Hand tool
Unlocks a work action or increases gathering/build efficiency.
Container/storage item
Unlocks storage capacity or preservation options.
Construction material
Unlocks building variants and stronger structures.
Agricultural item/knowledge
Unlocks planting, harvesting or irrigation actions.
Transport item
Changes carrying/logistics efficiency.
Knowledge/communication
Unlocks research, coordination, record-keeping or social systems.

6.4 Failure and near-miss feedback
Preserve the existing assessment/probe/hint behavior from the merge engine.
When a combination fails, give a concise explanation by material/action logic where available; do not reveal hidden recipes outright.
If a discovery is already known, show a useful duplicate/known result rather than treating it as a dead click.
Never let a generated villager hint claim a combination is valid. The engine decides.
7. THE MULTITASKING WORKSPACE — KEEP MERGING VISIBLE
This is a core product requirement. The player should be able to watch the civilization while using Merging, similar to keeping a small Chrome side panel or split tab open.
7.1 Workspace model
The app has a persistent workspace/tab strip. Civilization is the default primary tab.
Merging is a permanent tab, not a modal that replaces the entire game.
Other existing game modes remain in the mode launcher and can retain their existing full-screen experiences.
Civilization and Merging can be displayed side-by-side, with the settlement remaining visible while the player experiments.
The user can drag the divider to resize panels, collapse Merging to a narrow dock, expand it, or maximize it temporarily.
Remember the user's last panel size and open/closed state per device, but do not persist a broken layout.
7.2 Required panel states
State
Behavior
Use case
Full Merging tab
Merging uses the main workspace; Civilization remains one click away.
Focused crafting session.
Split view
Civilization and Merging visible simultaneously; draggable divider.
Watch settlement while experimenting.
Compact dock
Merging becomes a narrow side panel or bottom drawer with essential merge controls.
Monitor world and make quick combinations.
Collapsed tab
Only a small Merging tab/handle remains; click to reopen.
Maximum settlement visibility.
Expanded overlay
Temporary larger overlay above the settlement; close returns to previous layout.
Complex multi-item combination.
Focus mode
One workspace fills the screen; other tabs remain accessible.
Small displays or detailed interaction.

7.3 Interaction rules
The settlement should continue running while Merging is open unless the player pauses it or enables 'pause while crafting'.
A clear pause/play and simulation-speed control must remain accessible.
Dragging items from the Merging inventory into the settlement is optional future behavior; do not implement until item-to-world semantics are defined.
A discovery made in Merging should trigger a small notification in the civilization panel without stealing keyboard focus.
Do not let the Merging panel cover critical resource alerts or the selected building inspector.
On narrow screens, use a bottom drawer or tab switch rather than forcing tiny unreadable split columns.
Keyboard focus and Escape behavior must be predictable; resizing must not break drag-and-drop merging.
7.4 Suggested desktop layout
┌──────────────────────────────────────────────────────────────────────┐│ Workspace tabs:  CIVILIZATION | MERGING | [other mode tabs/launcher] │├──────────────────────────────────────────────┬───────────────────────┤│                                              │ MERGING               ││          LIVE SETTLEMENT                     │                       ││                                              │   inventory / items   ││     citizens, buildings, terrain             │                       ││                                              │   physical merge area ││                                              │                       ││                                              │   discovery result    │├──────────────────────────────────────────────┴───────────────────────┤│ HUD: population | food | water | materials | time | pause/speed       │└──────────────────────────────────────────────────────────────────────┘     ← draggable divider →     [collapse] [expand] [maximize]
7.5 Implementation constraints
Do not rewrite Workbench or the merge engine just to make a split view. First identify the smallest safe way to host the existing Merging component in a resizable workspace shell. Keep drag state, pointer capture, keyboard shortcuts and craft session state intact when the panel is resized. If remounting the component would reset a craft in progress, preserve the session state outside the visual panel or avoid remounting.
8. USER INTERFACE AND INFORMATION DESIGN
8.1 Main HUD
Top strip: era/stage label, population, food, water and a small number of key resources.
Clock controls: pause, 1x, faster, current season/day where applicable.
Alerts: only important issues, with severity and direct navigation to the cause.
Avoid showing every resource all the time; allow a compact expandable resource drawer.
8.2 Context panels
Selection
Panel content
Citizen
Name, role, household, current task, needs summary, skill highlights, follow/focus button, assign/priority action.
Building
Purpose, construction/upgrade state, workers, inputs/outputs, storage/capacity, blocked reason, available actions.
Resource node
Resource type, remaining quantity/renewal, assigned workers, access and distance.
Tile/area
Terrain, buildability, nearby resources, work-zone options.
Event
What happened, why it happened, who/what was affected, suggested responses.

8.3 Build mode
Show only buildings currently unlocked or explain how to unlock the next relevant category.
Ghost preview displays footprint, orientation, valid/invalid placement and cost.
Invalid placement gives a specific reason: water, slope, occupied tile, blocked access or missing prerequisite.
Construction has stages and visible progress; completion triggers a world event.
Canceling construction returns recoverable materials according to a clear rule.
8.4 Accessibility and settings
Keyboard navigation for all panels and merge interactions.
Reduced-motion option and lower animation quality.
Adjustable UI scale and readable text.
Sound/music toggles and separate volume controls if audio is added.
Color should not be the only way to communicate warnings or selection.
Provide a compact mode for lower-resolution screens.
9. HISTORICAL PROGRESSION AND CONTENT
Progression should be capability-based and historically informed. A named era can provide context, but the actual unlocks must come from the discovery data, plausible prerequisites and player actions. Avoid implying that every human society followed the same exact path.
Broad phase
Gameplay identity
New pressures
Small human group
Gathering, hunting, fire, basic tools, shelter, local exploration.
Food uncertainty, exposure, carrying, safety.
Permanent settlement
Agriculture, storage, pottery, domestication, houses, work specialization.
Land, water, storage, seasonal planning, crowding.
Growing village
Workshops, crafts, irrigation, trade, improved transport.
Labour allocation, logistics, resource depletion, inequality risk.
Complex settlement
Writing/records, institutions, larger construction, specialized production.
Governance, infrastructure, social stability, public works.
Later historical development
Use the existing catalogue to define further directions.
Do not pre-script eras before auditing the current discovery graph.

The owner has not asked to turn this into a conventional 4X war game. Diplomacy, conflict and military systems should be optional later expansions only if they fit the existing catalogue and core identity. Do not prioritize warfare over settlement simulation.
10. OTHER GAME MODES — PRESERVE THEM
The app currently has multiple game modes. The owner wants the modes other than Merging and Civilization preserved as well. This is a hard requirement.
During the audit, enumerate every mode from the actual deployed app, all relevant branches and the mode registry.
Record the exact visible name, route/entry point, core mechanic, save key, dependencies and current completion state.
Do not assume the count is exactly nine or ten; verify it.
Do not delete, rename, merge, hide or rewrite any mode as part of the Civilization overhaul unless the owner separately approves it.
Keep a stable Mode Hub/launcher. Civilization may be promoted as the default/main experience, but all other modes remain discoverable.
Preserve each mode's save data and route. Shared discovery data is allowed only through an explicit adapter and must not break independent progression.
Regression-test opening and playing each mode after workspace changes.
10.1 Mode integration policy
Integration level
Allowed behavior
Shared shell
Modes can use the same app header, tab strip or launcher if this does not break their current layouts.
Shared discoveries
A mode may reference common discovery metadata only if it preserves its own rules and save behavior.
Cross-mode rewards
Only add after explicit design; do not grant items/progress automatically.
Civilization links
A mode may offer an optional link to Civilization, but it must remain independently playable.
Save separation
Never overwrite one mode's save with another mode's state.

11. VISUAL ART DIRECTION
11.1 Style rules
Primary world style: coherent 2D pixel art, 3/4 top-down or isometric-like camera.
Natural, readable palette; consistent pixel density, light direction, shadow length and outline language.
Small but expressive characters; clear silhouettes at actual game zoom.
Modular terrain tiles, individual buildings and character sprites; avoid a single flattened village background.
Keep existing 3D item models in the Merging/discovery interface.
Avoid emoji, glossy vector art, photorealistic people, inconsistent anti-aliasing and mixed perspectives.
11.2 Asset families
Owner
Asset families
Gemini
Terrain tilesets, water/river/shore, trees/rocks/plants, building sprites, building construction stages, environment particles, weather and day/night effects.
ChatGPT
Villager sprites, directional character sheets, idle/walk/work/eat/sleep/react animations, portraits, event illustrations, small contextual visual assets.
Both, coordinated
Style exploration, animation test scene, quality review, palette alignment and reference documentation.

11.3 Mandatory online research before generation
Search for at least five relevant examples for the asset family.
Open original pages and inspect the actual artwork, not only thumbnails.
Compare at least three visual approaches and note perspective, palette, sprite scale, pixel density, outlines, shading and animation timing.
Record URL, creator, asset name, license/usage terms and the specific lesson learned.
Write an original art specification before generation.
Generate a small sample batch, inspect it at target in-game scale and get approval before producing the full family.
References are research material. Do not copy a recognizable character, exact building, full scene or proprietary spritesheet. If an existing asset is reused, confirm its license, attribution and redistribution requirements before adding it to the repository. If browsing is unavailable, the agent must say so and request reference links rather than pretending research happened.
12. ANIMATION AND IMAGE GENERATION SPECIFICATION
Both image agents must generate animation-ready assets, not only static concept images. Each agent owns different asset families but must follow the same technical contract.
12.1 Required first animation samples
Agent
First animation deliverable
Gemini
A small looping environment sample: flowing water or river edge, campfire with smoke, wind moving grass/tree leaves. Include a static fallback frame and a documented spritesheet.
ChatGPT
One villager character sheet with idle, walk and work loops, plus at least two directions if the agreed camera needs them. Include a static fallback pose and documented spritesheet.

12.2 Sprite-sheet rules
All frames in a sheet use identical cell width and height.
No labels, numbers, borders, padding or captions inside the sprite cells.
Keep the subject fully inside each cell and keep the pivot/anchor consistent.
Transparent background for sprites unless the asset is a complete opaque tile.
Use a fixed pixel scale and nearest-neighbor export; no accidental smoothing.
Document frame order, frame count, frame duration, loop behavior, direction, anchor point and intended display size.
Provide a preview GIF or animated preview where the tool supports it, plus the original spritesheet.
Provide a static fallback for reduced motion and low-performance devices.
Review every frame for flicker, shape drift, inconsistent limbs, changing perspective or inconsistent lighting.
12.3 Animation standards
Animation
Initial target
Notes
Idle
4–6 frames
Subtle breathing/blinking; do not make every character constantly bounce.
Walk
6–8 frames
Consistent foot contact and direction; avoid sliding.
Work
6–8 frames
Tool/action readable at small size; loop cleanly.
Carry
6–8 frames
Load stays attached to hands/body anchor.
Eat
4–6 frames
Small readable gesture; optional for MVP.
Sleep/rest
2–4 frames
Can be static with occasional movement.
Fire
4–8 frames
Loop without sudden brightness jumps.
Water
4–8 frames
Tile edges must remain seamless across frames.
Smoke
4–8 frames
Subtle upward drift; can be particle-based if sprite sheet is too costly.
Wind/foliage
2–4 frames
Small variation; avoid distracting constant motion.

These are starting targets, not hard limits. Claude must coordinate final frame dimensions and format with the actual renderer. Do not force an arbitrary tile size before the camera prototype confirms it.
13. ASSET FILE ORGANIZATION AND HANDOFF
public/civilization/  terrain/  water/  vegetation/  buildings/  characters/  portraits/  effects/  ui/docs/civilization-overhaul/  MASTER_DESIGN.md  REPOSITORY_AUDIT.md  MODE_PRESERVATION_MATRIX.md  GAMEPLAY_SYSTEMS.md  SIMULATION_RULES.md  WORKSPACE_UX.md  ART_DIRECTION.md  VISUAL_REFERENCES.md  ANIMATION_SPEC.md  ASSET_MANIFEST.md  DECISIONS.md  HANDOFF.md  QA_REPORT.md
Every asset manifest entry must include: stable asset ID, filename, owner, dimensions, cell dimensions, frame count/order, duration, loop flag, anchor/pivot, perspective, palette, transparency, intended use, fallback, source/generation provenance, reference URLs and license status.
Use predictable names, for example: `char_gatherer_walk_s_6f.png`, `fx_campfire_loop_6f.png`, `terrain_grass_a.png`. The exact convention can be changed once, centrally, before mass production. Do not invent filenames independently.
14. TECHNICAL ARCHITECTURE AND DATA CONTRACTS
14.1 Core separation
Simulation rules must be independent of React components.
Rendering reads simulation state; it must not decide economic outcomes.
The existing discovery engine remains authoritative for recipes and combination results.
Civilization translates discovery events into capability unlocks through an explicit mapping layer.
The workspace shell owns panel layout and tab state; it must not own game rules.
Other modes remain isolated behind their current entry points and save adapters.
14.2 Suggested domain boundaries
CivilizationState  world: terrain/chunks/resourceNodes  population: citizens/households/cohorts  economy: stockpiles/production/consumption  settlement: buildings/workZones/roads  progression: discoveries/capabilities/eraMilestones  events: timeline/alerts/history  settings: simulationSpeed/pause/layoutPreferencesSystems  SimulationClock  CitizenScheduler  ResourceSystem  ProductionSystem  ConstructionSystem  NeedSystem  DiscoveryBridge  HintSystem  EventHistory  SaveMigrationUI  WorkspaceShell  CivilizationViewport  CivilizationHUD  SelectionInspector  BuildPanel  EventTimeline  MergingPanelAdapter  ModeLauncher
14.3 Example discovery-to-capability mapping
DiscoveryCapabilityMap {  discoveryId: existingDiscoveryId,  grants: [    { type: "unlock_recipe", recipeId: existingRecipeId },    { type: "unlock_building", buildingId: "granary" },    { type: "unlock_job", jobId: "potter" },    { type: "unlock_action", actionId: "store_food_safely" }  ],  requires?: [existingDiscoveryId],  messageKey: "discovery.capability.granary"}
Do not add mappings for every discovery at once. Start with a small curated set that produces a complete early-game loop. A discovery may have no civilization effect if it is purely informational or unrelated to the current simulation.
14.4 Save data
Inventory all existing save keys and formats before changes.
Keep existing save namespaces intact; add a versioned civilization save rather than replacing unrelated data.
Write migrations as pure, testable functions and keep a backup/rollback path.
Never silently reset a corrupted or older save; show a recovery option and preserve the original bytes where feasible.
Do not couple layout preferences to core civilization simulation state.
Test old saves, new saves, partial saves, unknown fields and reload after discovery.
15. PERFORMANCE, QUALITY AND RELIABILITY
Use deterministic ticks for simulation and requestAnimationFrame only for rendering/animation.
Avoid one React component update per villager per frame.
Use spatial indexing or chunk-based culling if map size grows.
Use sprite atlases or efficient draw batching where the renderer supports them.
Cap visible citizen count and represent distant/unseen population as cohorts.
Support low/medium/high visual quality and reduced motion.
Do not make AI API calls part of the critical simulation loop.
Every simulation system needs unit tests for resource accounting and state transitions.
A failed image asset should fall back to a placeholder or static frame rather than crash the game.
16. PHASED BUILD PLAN — CLAUDE MUST WORK IN SMALL SLICES
This section is mandatory. Claude must not create one enormous branch of half-finished features. Each slice should be independently testable, reviewable and committed. Gemini and ChatGPT should be producing the next slice's assets while Claude implements the current slice.
Slice
Claude implements
Parallel art work
Definition of done
0 — Audit
Inspect live app, target branch, mode registry, engine, saves, rendering and dependencies. Write audit and mode matrix.
Gemini researches environment references; ChatGPT researches character/game references and gameplay patterns.
Accurate map of what exists; no destructive code changes.
1 — Workspace shell
Add tab/workspace shell with Civilization placeholder, permanent Merging tab, resize/collapse/restore behavior. Preserve current Merging state.
Gemini creates a tiny terrain palette sample; ChatGPT creates a character scale test.
Merging still works; split/compact states work; existing modes still launch.
2 — Static world prototype
Render small map with terrain, resource nodes, buildings placeholders, pan/zoom and selection.
Gemini creates first terrain tileset and a few props.
A small scene is visible and selectable; no simulation dependency.
3 — Citizen movement
Add a few citizen agents, path/task state and idle/walk behavior with placeholder sprites.
ChatGPT creates first approved character sprites and idle/walk sheets.
Citizens move between valid points without jitter or invalid paths.
4 — Resource loop
Add gather/carry/store/consume rules and a compact HUD.
Gemini creates resource node/stockpile/building art; ChatGPT creates carry/work animation.
Food/wood or equivalent resources change through visible actions.
5 — Needs and jobs
Add hunger/rest priorities, work assignment, task blocking reasons.
ChatGPT creates work/rest/eat loops and villager portrait samples.
Citizens choose feasible tasks and respond to needs.
6 — Build system
Add placement ghost, footprints, cost, construction progress and building inspector.
Gemini creates shelter/storage/workshop sprites and construction variants.
Player can place and finish at least two functional buildings.
7 — Discovery bridge
Connect a small set of existing discoveries to civilization capabilities. Keep merge engine authoritative.
Both agents produce art for the first supported items/buildings/character actions.
A merge discovery unlocks a real capability and visible world response.
8 — Hint/event system
Add state-driven villager hints, event log and timeline.
ChatGPT supplies dialogue/portrait/emote assets; Gemini supplies event effects.
Hints are valid, contextual, non-repeating and resolvable.
9 — Early progression
Complete early-game loop with food, shelter, storage, tool/workshop, population pressure and next goals.
Both produce the next small asset batch.
A new player can play a coherent 15–30 minute loop.
10 — Polish and regression
Tune performance, layout persistence, accessibility, saves and mode regression tests.
Both fix asset consistency and produce missing animation frames.
No regressions in Merging or other modes; saves migrate safely.

16.1 Parallel cadence
At the start of each slice, Claude writes a short asset request with exact dimensions still marked provisional if the renderer has not decided them.
Gemini and ChatGPT acknowledge the request, research references, and produce only the assets for the next one or two slices.
Claude starts implementation immediately with a stable asset ID and placeholder. It does not wait for the final PNG/GIF.
When an asset arrives, Claude checks manifest, dimensions, license/provenance and visual fit, then swaps it into the asset loader.
The other agents review an actual screenshot or GIF from the integrated build and report concrete corrections.
Claude fixes the current slice before starting unrelated systems. Do not accumulate many unfinished features.
16.2 What Claude must never do
Do not wait for every image before coding the simulation or workspace.
Do not invent asset dimensions and then demand that artists regenerate everything; agree on a provisional contract and update it centrally if needed.
Do not let Gemini and ChatGPT edit the same asset or document concurrently without ownership.
Do not implement all historical eras before the first settlement loop works.
Do not rewrite the existing merge engine to fit a visual idea without a technical reason.
Do not remove modes because they are inconvenient to test.
Do not commit generated placeholder files as final art.
17. BOT ROLES AND FULL TASK INSTRUCTIONS
17A. CLAUDE — LEAD DEVELOPER, ARCHITECT AND COORDINATOR
You own the codebase, architecture, integration, testing and Git. You are the coordinator for Gemini and ChatGPT.
Claude: first 10 actions
Read this complete master design, including the embedded concept image.
Inspect the actual deployed application and all tabs/modes, not only README.md.
Inspect all branches relevant to the live app and identify which branch is the true integration target. Explain discrepancies.
Audit the current Merging implementation, discovery engine, item models, save formats, mode registry and existing Civilization-related code.
Create the shared documentation structure from Section 13.
Write REPOSITORY_AUDIT.md and MODE_PRESERVATION_MATRIX.md.
Send the entire brief and embedded image to Gemini and ChatGPT through Orca; send their individual role sections too.
Ask both agents to acknowledge and provide their first deliverables and any blockers.
Produce a slice-by-slice technical plan with files likely to change, test plan and asset contracts.
Begin Slice 1 (workspace shell) only after the owner can review the audit and the plan; no destructive refactor.
Claude: implementation discipline
Work in small slices with a clear definition of done.
Use placeholder assets and stable IDs while art generation runs in parallel.
Commit each coherent slice to a feature branch, never directly to main.
Keep a short status in HANDOFF.md: current slice, implemented files, tests, asset requests, blockers and next action.
At the end of every slice, run typecheck, lint and targeted tests; run full build at milestones.
Capture browser screenshots/GIFs and send them to both art agents for review.
Do not deploy without owner approval.
17B. GEMINI — ENVIRONMENT, BUILDING AND EFFECTS ARTIST
You own environment art and must generate real usable assets and animation sheets. Do not stop at moodboards.
Gemini: first deliverables
Read this entire master design and the embedded concept image.
Research at least five examples of pixel-art environments/tilesets and inspect their original pages.
Create VISUAL_REFERENCES.md entries with URLs, creators, license notes and observations.
Propose three distinct art directions with a sample settlement scene; recommend one.
Coordinate camera perspective, tile size, sprite scale, lighting and palette with Claude and ChatGPT.
Generate a tiny terrain sample: grass, dirt, shore/water, tree, rock and one path tile.
Generate one environment animation test: water, campfire/smoke or foliage, with a spritesheet and preview.
After approval, produce only the assets requested for the current/next implementation slice.
Gemini: continuing responsibilities
Generate terrain, water, vegetation, resource nodes, buildings, construction stages, roads and environmental effects.
Create actual looping animation-ready images, not just descriptions of animation.
Provide individual sprites, spritesheets, static fallbacks and technical metadata.
Test tile seams and repeated patterns.
Review ChatGPT's character art for perspective, scale and palette compatibility.
Review Claude's in-game screenshots and report specific mismatch/fixes.
Update ASSET_MANIFEST.md and HANDOFF.md after each batch.
17C. CHATGPT — GAMEPLAY DESIGNER, HISTORICAL RESEARCHER AND CHARACTER ANIMATOR
You own the gameplay specification, human/citizen design, character art and independent gameplay review. You must generate actual pixel-art character images and animations.
ChatGPT: first deliverables
Read this entire master design and the embedded concept image.
Research at least five pixel-art character/animation references and inspect original pages.
Write a practical citizen behavior specification: needs, roles, task priorities, household links and hint triggers.
Create six character concepts: gatherer, hunter, builder, toolmaker, elder and child. Ensure they belong to one coherent world.
Generate an actual character spritesheet with idle, walk and work loops; provide transparent background and frame metadata.
Create sample portraits and three contextual dialogue/hint examples tied to real game states.
Review Gemini's environment proposals and send actionable feedback.
Send Claude the exact character asset IDs, filenames, dimensions, frames and anchors.
ChatGPT: continuing responsibilities
Generate actual character animations: walk, idle, gather, carry, build/work, eat, rest/sleep and react, in small batches.
Create later occupation/era variants only when the implementation plan requests them.
Research historical sources for technologies, occupations, materials and social systems. Distinguish fact, debate and gameplay simplification.
Write/maintain GAMEPLAY_SYSTEMS.md and SIMULATION_RULES.md.
Review game behavior for exploit loops, confusing feedback, pointless clicks and historical implausibility.
Review integrated screenshots/GIFs and report concrete issues to Claude.
17D. CROSS-AGENT RULES
Claude is the only code integration owner unless the owner explicitly changes that.
Gemini owns environment/building/effects asset files; ChatGPT owns character/portrait/event art files.
Both image agents can suggest design improvements but must not silently change approved gameplay rules.
No agent claims that another agent approved an asset without an actual review.
When agents disagree, write the options and recommendation in DECISIONS.md; owner decides major direction.
All agents must use the same palette, perspective and asset manifest.
If direct Orca sharing fails, Claude produces exact copy-ready handoffs and reports that limitation.
18. FIRST PLAYABLE MILESTONE — ACCEPTANCE TEST
Do not call the redesign successful because it has a pretty map. The first playable milestone must prove that the game systems connect.
The player opens Civilization and sees a small pixel-art settlement.
The player can pan and zoom the map.
At least three inhabitants are visible; they can idle and walk between tasks.
The player can select one inhabitant and inspect their current task and a small set of needs.
At least two resources exist and visibly change through gathering/consumption.
At least one building can be placed, constructed and selected.
At least one real simulation problem triggers a contextual villager hint.
The player can open Merging in split/compact mode without losing the settlement view.
A valid combination is processed by the existing discovery engine.
The resulting discovery unlocks a capability; the player can use it to build/produce/do something in Civilization.
The simulation continues while Merging is open unless paused by the player or preference.
The state saves and reloads correctly.
Every other audited mode remains accessible and passes a basic launch/smoke test.
19. TEST PLAN
Area
Minimum tests
Workspace
Open/close Merging, resize, collapse, restore, maximize, keyboard focus, small-screen drawer, no lost craft session.
Modes
Every existing mode opens, retains route and save state, and can return to launcher.
Simulation
Deterministic tick test, no negative stockpiles, no duplicated production, needs/task priority.
Resources
Gather → carry → store → consume; full storage and unavailable resource cases.
Construction
Valid/invalid placement, cost deduction, progress, cancellation and reload.
Discovery bridge
Known discovery, new discovery, duplicate event prevention, missing mapping and save reload.
Hints
Valid trigger, invalid era suppression, cooldown, resolution, priority and no repeated spam.
Assets
Missing file fallback, wrong dimensions warning, animation frame order, reduced-motion static fallback.
Saves
Old save migration, backup, corrupt save recovery, independent mode saves.
Performance
Low/medium/high quality, offscreen culling, background tab behavior, no per-frame React churn.

20. PROJECT DOCUMENTATION AND SHARED FILES
docs/civilization-overhaul/  MASTER_DESIGN.md  REPOSITORY_AUDIT.md  MODE_PRESERVATION_MATRIX.md  GAMEPLAY_SYSTEMS.md  SIMULATION_RULES.md  WORKSPACE_UX.md  ART_DIRECTION.md  VISUAL_REFERENCES.md  ANIMATION_SPEC.md  HISTORICAL_RESEARCH.md  ASSET_MANIFEST.md  DECISIONS.md  HANDOFF.md  QA_REPORT.mdpublic/civilization/  terrain/  water/  vegetation/  buildings/  characters/  portraits/  effects/  ui/
HANDOFF.md must always state: current slice, owner, implemented work, exact files changed, assets received, assets pending, test results, known issues, decisions needed and next small task.
DECISIONS.md must record date, question, options, recommendation, owner decision and affected files/systems. Never silently rewrite an approved decision.
21. GIT, SECURITY AND RELEASE RULES
Create a dedicated feature branch such as civilization-world-workspace. Confirm the correct base branch after auditing the live app.
Never commit directly to main.
Inspect git status and diff before every commit.
Do not commit API keys, tokens, passwords, private credentials or .env files.
If a possible secret is found, report its file/location without printing the value and recommend rotation.
Preserve all existing save namespaces and test migration.
Commit one coherent slice at a time with descriptive messages.
Do not merge to main or deploy to production without explicit owner approval.
22. IMPORTANT TECHNICAL QUESTIONS CLAUDE MUST ANSWER IN THE AUDIT
Which branch and deployed commit currently contain the actual mode hub and all game modes?
What are the exact names and routes of every existing mode?
Which mode is currently the Merging experience and how is its state persisted?
Is there already any Civilization simulation code, and if so, what is genuinely reusable?
Which discovery IDs should initially unlock civilization capabilities?
Where are the current 3D item models stored and how are they rendered?
What rendering approach best fits the current app and performance constraints?
Can Merging be hosted in a resizable panel without remounting/resetting CraftSession?
Which existing saves and localStorage keys must remain untouched?
What is the smallest complete end-to-end gameplay loop that can be delivered first?
23. MESSAGE CLAUDE MUST SEND TO GEMINI AND CHATGPT
Copy and send this message to both agents, together with the full document and embedded image:
We are starting the Evolution Sandbox Civilization World overhaul. This attached document is the master design specification and source of truth. Please read the complete document and your assigned role section, and inspect the embedded concept image.You are expected to generate actual usable images AND animation-ready spritesheets, not just describe ideas. Before every major asset batch, research at least five relevant online examples, inspect the original pages, compare at least three approaches and document URLs, creators and license notes. Do not copy another game's recognizable art.Claude is implementing in small slices while you generate assets in parallel. Do not wait for a giant batch. Claude will send precise requests for the next one or two slices; you should return small approved batches with exact dimensions, frame order, anchors, static fallbacks and manifest entries. The first assets should be tiny samples for style approval.Gemini owns environment/terrain/buildings/effects. ChatGPT owns citizen/character animation/portraits/event art and gameplay design/review. Both must coordinate one shared perspective, pixel scale, palette and lighting direction.Claude must share the full brief and image with both of you through Orca, then request acknowledgement. If direct file sharing is unavailable, Claude must create copy-ready handoffs for the owner. Do not claim to have received, reviewed or approved anything that you have not actually seen.The existing Merging tab and all other game modes must be preserved. Merging should become a resizable/splittable workspace alongside Civilization, not be deleted. The existing discovery engine remains authoritative.
24. FINAL CREATIVE DIRECTION
The desired result is a game where the player can watch a settlement live, notice a real problem, hear a human suggestion, open Merging in a compact panel, experiment with materials, discover something, and then see the community use that invention. The player should feel that the world continues to exist while they work in another panel.
Keep the ambition high but the implementation disciplined. A tiny functioning world with a real invention-to-world loop is more valuable than ten half-built eras, hundreds of disconnected assets or a huge dashboard.
THE SETTLEMENT IS THE GAME. MERGING IS ITS INVENTION WORKSHOP. EVERY OTHER MODE STILL BELONGS.

PART II — EXPANDED SYSTEMS, CONTENT AND PLAY EXAMPLES
This is an additive expansion of v2, not a replacement of its non-negotiable requirements.
25. HOW TO USE THIS EXPANSION
The first part of this document defines the product pillars, core systems, workspace, art pipeline, roles and phased build plan. This second part makes those ideas concrete. It adds more feature systems, examples of how they interact, sample content, player journeys, edge cases, data contracts and acceptance tests. Claude must merge this into the implementation plan without treating every listed feature as an MVP requirement.
Feature priority labels used below:
Priority
Meaning
Implementation rule
P0 — Foundation
Required for a credible first playable loop.
Build and test before expanding content.
P1 — Early depth
Adds meaningful decisions after the basic loop works.
Implement only after P0 is stable.
P2 — Mid-game
Adds specialization, geography, trade and social complexity.
Use modular systems and unlock gradually.
P3 — Long-term
Large optional systems such as advanced politics or distant regions.
Do not block the core game on these.
Experimental
Potentially fun, but needs a prototype to prove it.
Keep behind a feature flag until validated.

All numerical values in examples are illustrative tuning values, not final balance. Claude should put them in data/config files so they can be adjusted without rewriting logic.
26. THE PLAYER'S ROLE: STEWARD, NOT CLICK-EVERYTHING MANAGER
The player is the settlement's guiding intelligence. They choose priorities and make high-impact decisions; citizens perform routine work. The player should feel clever for solving a problem, not exhausted from assigning every movement.
Player action
What the player decides
What the simulation handles
Set priority
Food gathering is more urgent than decoration.
Workers choose feasible food tasks and carry resources.
Place plan
Build a storehouse beside the main path.
Workers fetch materials, construct it and report blockages.
Invent
Experiment with existing mergeable items.
Discovery engine validates; capability bridge unlocks relevant uses.
Set policy
Save some grain for winter.
Consumption and reserve rules apply consistently.
Explore
Send a small group toward the eastern ridge.
Travel, supplies, discoveries and return are simulated.
Respond
A flood warning appears.
Citizens seek safe tasks/locations based on rules; player chooses mitigation.

26.1 Three levels of control
Strategic: settlement priorities, policies, expansion direction, reserve targets, research focus.
Operational: work zones, building placement, job priorities, expedition composition and production limits.
Tactical override: select a citizen or building and issue a one-off order. Overrides should expire or be cancellable so the player does not need to babysit forever.
Example: the player marks the riverbank as a high-priority gathering zone. The scheduler assigns two available adults to collect reeds. If one becomes hungry, that citizen pauses the job, eats from accessible food and then resumes if the zone remains active. If the stockpile fills, the citizen stops gathering and the UI explains that storage is full. The player does not need to click each step.
27. A COMPLETE FIRST-HOUR PLAYER JOURNEY
This is a concrete target experience for onboarding and pacing. It is a reference scenario, not a rigid script. Players should be able to make different choices and still survive.
Approx. time
What the player sees
Player decision
System response / learning
0–2 min
A small group near a stream, a few trees and scattered stones.
Pan the map; select a villager.
Camera, selection, citizen panel and world readability are taught.
2–5 min
A villager says the group needs food before resting.
Raise food priority.
Citizens gather nearby edible resources; stockpile count changes.
5–8 min
The group has food but no protected sleeping place.
Place a simple shelter site.
Construction ghost shows footprint and cost; workers begin building.
8–12 min
A worker walks farther than expected to fetch wood.
Inspect the worker's task and route.
The game teaches distance, carrying and work-zone reach.
12–16 min
A villager notices supplies are being left in the rain.
Open the hint card; choose to experiment.
The hint suggests a storage problem without giving an exact recipe.
16–22 min
Player opens Merging in compact mode beside the world.
Try combinations using the existing engine.
A successful discovery creates a capability unlock notification.
22–27 min
The new capability is available but not automatically built.
Place the newly unlocked storage structure if affordable.
The game teaches that discovery unlocks capability, not free finished goods.
27–35 min
Food is safer, but population needs more reliable supply.
Choose a second food source or explore.
The world shows a new production option and a new planning decision.
35–45 min
A nearby area contains fertile ground and a resource node.
Send an explorer or mark the area for work.
Exploration reveals useful map information and creates a timeline event.
45–60 min
The settlement has a few structures, roles and a small surplus.
Choose the next bottleneck: water, tools, food or housing.
The player ends with a functioning settlement and multiple possible next goals.

27.1 Onboarding principles
Teach one new concept at a time and teach it through an actual game action.
Never block the entire screen with a long tutorial. Use a short speech bubble, highlight and optional detail panel.
Allow skipping. The same information remains available in a Help/Knowledge journal.
Do not punish experimentation during the tutorial; use generous early resource availability.
Do not force the exact first-hour sequence if the player discovers an alternative route.
After the first successful discovery-to-building loop, reduce tutorial prompts and let the player explore.
28. DETAILED EXAMPLE: FROM DISCOVERY TO A WORKING TOOLCHAIN
Scenario: the player discovers a useful cutting tool through the existing Merging engine. The tool should create a chain of new possibilities, not simply appear as a cosmetic collectible.
Before discovery: villagers gather branches and food slowly. The settlement has a small stockpile and no dedicated workshop.
Player experiments in Merging. The existing engine returns a valid new item and its normal discovery result.
Discovery bridge records the discovery ID exactly once and looks up its capability mapping.
The game announces: 'Your people have figured out a sharper way to shape wood.' The text is flavor; the structured event is the actual source of truth.
The capability unlocks a tool recipe or tool availability in the production UI. It does not spawn ten tools for free.
The player chooses whether to craft one tool or prioritize a workshop first.
If direct hand-crafting is allowed by the existing game rules, a citizen with the necessary skill and inputs makes one tool. Otherwise, the player must build the relevant workplace.
Once a tool exists in accessible inventory, eligible workers can use it. Gathering or construction efficiency changes by a small, visible amount.
The citizen panel shows 'Using: cutting tool' or the job panel shows the tool requirement. The player can inspect why a worker is still using a slower method.
The event timeline records discovery, first production and first use as separate milestones.
State
Example UI
Why this matters
Discovered
New item appears in the existing discovery collection.
Preserves the original merge loop.
Capability unlocked
A new action/building/recipe appears with a short explanation.
Connects crafting to the world.
Production unavailable
'Needs a workshop' or 'Missing wood'.
Prevents confusing invisible unlocks.
Produced
A tool appears in stockpile; production counter updates.
Shows the player that the chain worked.
In use
Worker task inspector shows tool usage and effect.
Makes the benefit legible.
Milestone
History records the first tool made and first tool used.
Creates a sense of civilization history.

Failure example: if the player discovers a tool but has no required material, do not silently fail. Show the unlocked recipe with a missing-input list and a button to locate the missing resource. If the player has the materials but no worker, show that the job is unstaffed. If the stockpile is full, show the capacity issue.
29. DETAILED EXAMPLE: FOOD SHORTAGE, NOTIFICATION AND RECOVERY
Scenario: the settlement grows, but food production does not keep pace. This is a model for how alerts, citizens, hints, player decisions and the simulation should connect.
Step
World state
Player-facing feedback
Possible action
1. Early warning
Projected food reserve falls below a configurable number of days.
HUD food icon changes state; alert says reserves are declining.
Open food panel.
2. Diagnosis
Only one food source is active; workers are spending time carrying.
Panel separates gathered, stored, reserved and consumed food.
Raise food priority; add storage closer to source.
3. Citizen hint
A gatherer notices the nearby berry patch is nearly empty.
'The bushes near camp are giving us less to gather.'
Explore another area or change food source.
4. Choice
Player can overharvest, move workers or diversify.
Each option previews likely trade-offs.
Choose a sustainable alternative.
5. Response
A fishing/hunting/farming capability may be available depending on discoveries.
New job/building is explained with prerequisites.
Assign worker/build a facility.
6. Outcome
Food reserve stabilizes; workers return to normal tasks.
Alert resolves and history records recovery.
Set a food reserve policy.

29.1 Food model requirements
Track food categories only if they have meaningfully different effects or uses. Do not create five nearly identical food resources just to inflate complexity.
Separate raw food, prepared food and preserved food only when production chains make the distinction interesting.
Show current stock, expected consumption, estimated days of supply and production trend.
Allow a configurable reserve target. Workers should not consume reserved emergency stores unless the settlement is in a serious crisis or the player allows it.
Food spoilage should be gradual and explainable. Storage technology should reduce loss through a clear modifier.
Food shortage should first create warnings and work-priority pressure; severe consequences should have a grace period and recovery path.
30. DETAILED EXAMPLE: WINTER PREPARATION
Seasonal change can make the world feel alive, but seasons must create planning rather than surprise punishment.
Several in-game days before winter, the weather and calendar panel indicates colder conditions are approaching.
Citizens make comments tied to actual stock levels: 'We have enough food for now, but not for the cold months.'
The player opens the seasonal forecast: expected temperature range, likely crop slowdown, water/river changes and shelter pressure. Forecasts should be approximate, not omniscient.
The player sets a food reserve target and raises gathering/preservation priority.
Some citizens are moved from low-priority decoration or exploration work to food and fuel.
The player chooses between building extra storage, improving shelter or expanding food production.
Winter arrives. Crop growth slows or pauses according to the chosen climate model. Fire/fuel demand may rise if warmth is implemented.
If preparation was adequate, the settlement continues with reduced output but no crisis. If not, alerts identify the specific shortage and available recovery options.
At the end of winter, the timeline records what worked and the player can inspect a seasonal report.
Avoid a hard calendar that makes every run identical. Use a configurable climate/season profile. In a sandbox mode, allow seasons to be disabled or made gentle.
31. DETAILED EXAMPLE: BUILDING PLACEMENT AND CONSTRUCTION
A building is a gameplay object with a footprint, requirements, inputs, outputs, capacity, workers, state and visual stages. It is not merely a sprite placed on the map.
Construction stage
Visual state
Rules
Blueprint
Transparent footprint and orientation preview.
No cost deducted until player confirms.
Site prepared
Ground marker, cleared vegetation if required.
Can be blocked by terrain, water, occupied tiles or missing access.
Foundation
Early structure sprite; materials visibly arrive.
Materials are reserved or consumed according to a documented rule.
Frame
Partial walls/posts appear.
Construction progress advances while a valid worker and materials exist.
Finished
Completed building sprite and active selection outline.
Building enters service only if required inputs/workers are available.
Damaged / inactive
Visual damage or muted status indicator.
Cause is shown; repair or missing-input action is available.

31.1 Placement example
The player selects a storehouse. The ghost footprint is green on flat empty ground near the settlement, amber near a long carrying route and red on a river tile. Hovering the red tile says 'Cannot build on deep water.' Hovering a distant valid tile says 'Valid, but far from the current stockpile.' On confirmation, the cost is deducted or reserved, a blueprint appears and the construction panel lists missing materials. The player can cancel and receive the documented refund.
31.2 Building data contract
BuildingDefinition {  id, displayName, description, category,  footprint: { width, height, rotationAllowed },  terrainRules, placementRules,  unlockRequirements, buildCost,  constructionStages, workerSlots,  inputs, outputs, storageCapacity,  serviceRadius, upkeep, durability,  visualAssetIds, selectionProfile}
Each building must define what happens when it is unstaffed, has no inputs, has full output storage, is unreachable, is damaged or is paused by the player. Never let a building look active when it is not producing.
32. DETAILED EXAMPLE: CITIZEN AI AND TASK SELECTION
Citizen AI should be predictable enough to understand and cheap enough to run for many citizens. Use a task scoring system with hard feasibility checks before scoring.
Candidate task score (illustrative):score =  urgencyWeight * urgency+ playerPriorityWeight * playerPriority+ skillBonus * relevantSkill+ proximityBonus * proximity+ continuityBonus * sameTask- travelPenalty * estimatedTravel- unmetNeedPenalty * urgentNeed- riskPenalty * dangerHard reject a task if:  required capability is locked  required resource is unavailable  destination is unreachable  worker is incapacitated or unavailable  job capacity is full
32.1 Example task decision
Candidate
Priority / urgency
Distance
Result
Eat from nearby food store
Very high because hunger is urgent
Very short
Selected immediately.
Continue gathering wood
High player priority
Medium
Paused until hunger is addressed.
Build shelter
Medium
Near site
Remains in queue.
Explore ridge
Low
Far
Not selected.

The UI should expose the top reason for a task choice, not the entire scoring formula. Example: 'Eating because hunger is critical.' When a citizen seems idle, the inspector should say why: no reachable jobs, no available resources, needs rest, assigned to a paused task or waiting for a construction material.
32.2 Avoid NPC nonsense
Do not let citizens oscillate between two jobs because scores are nearly tied; use hysteresis/commitment time.
Do not send a worker across the entire map for one unit if a closer job is available.
Do not let every citizen crowd the same doorway or tile; reserve capacity or use simple avoidance.
Do not interrupt a citizen for tiny need changes every tick. Use thresholds and task-safe interruption points.
Do not create a new named villager every time population increases; use household/cohort abstraction for scale.
33. HOUSEHOLDS, LIFE STAGES AND POPULATION GROWTH
Population growth should be gradual and supported by housing, food, safety and social stability. It should not be a button that instantly adds workers.
System
MVP rule
Later expansion
Households
Citizens belong to a household or communal camp; housing has capacity.
Family trees and multi-generation histories.
Children
Represent as a population category; no complex individual schooling in MVP.
Named children can age into adult roles.
Adults
Main workforce with needs and skills.
Specialized careers and mentorship.
Elders
Small population category; can provide knowledge or lower labour availability.
Named elders preserve oral history and teach skills.
Growth
Use a slow population change rule based on stable conditions.
Birth, migration and demographic events.
Migration
Occasional visitors or new household only after settlement can support them.
Refugees, traders, skilled migrants and cultural exchange.

Example: a settlement with housing capacity for eight and reliable food for six should not suddenly grow to twelve. A migration opportunity might offer two newcomers, but the player sees the additional food and housing demand before accepting. If the player declines, the visitors leave without punishing the settlement.
34. SOCIAL LIFE, CULTURE AND COMMUNITY IDENTITY
Citizens should occasionally do things that are not strictly productive. Social activity gives the settlement warmth and creates a visual reason to watch it.
Gathering spots: campfire, common area, market, well or workshop yard.
Social behaviors: talk, share food, celebrate a milestone, rest together, teach a skill or mourn a loss.
Community identity: a small set of cultural traits shaped by geography, discoveries, food, architecture and player policy.
Traditions: recurring practices created by milestones, such as a harvest gathering or a celebration after a successful expedition.
Knowledge transmission: a skilled citizen can teach another citizen, improving reliability of a job.
Morale: use one aggregate community mood indicator with explainable contributors; avoid a dozen overlapping happiness meters.
34.1 Example: the first harvest festival
The settlement completes its first successful harvest. If food reserves are adequate and the player has not forbidden gatherings, citizens gather near the communal area for a short celebration. A small event banner appears: 'The first harvest.' The event grants no magical resource bonus; it records a milestone, creates a cultural memory and gives the player a visual reward. If food is dangerously low, the celebration is postponed and the history entry explains why.
34.2 Example: community disagreement
Later, the player sets a policy that prioritizes construction over rest. Work output increases slightly, but fatigue and morale worsen. A short event reports that some citizens are unhappy with the workload. The player can keep the policy, reduce work intensity or create a rest day. Each choice has visible trade-offs; there is no arbitrary 'wrong' choice.
35. POLICIES AND SETTLEMENT PRIORITIES
Policies should be simple sliders/toggles with clear effects. They are not a complex government simulator in the early game.
Policy
Options
Benefit / cost example
Work intensity
Relaxed / normal / intense
More output versus fatigue and morale pressure.
Food reserve
Low / balanced / high target
Resilience versus less food available for immediate use.
Resource use
Conserve / balanced / consume freely
Protects finite nodes versus slower expansion.
Construction focus
Housing / storage / production / infrastructure
Directs labour priority.
Exploration stance
Cautious / balanced / bold
Changes expedition risk and speed.
Gathering radius
Local / extended
Reduces travel versus reaches distant nodes.
Knowledge focus
Tools / food / shelter / transport / open discovery
Highlights relevant hints; does not override recipe rules.

Policy changes should be reversible and should not instantly teleport workers or materials. They influence future task selection and show an estimated effect before confirmation.
36. EXPLORATION, EXPEDITIONS AND POINTS OF INTEREST
Exploration should reveal useful geography and create small stories. It should not become a separate menu-only dice roll.
Point of interest
Possible discovery
Decision
Fertile meadow
Good soil, seasonal crop potential.
Expand farm or preserve natural area.
Stone ridge
Reliable stone source, difficult approach.
Build a path or accept longer carrying routes.
River crossing
Access to another map section.
Build a bridge later or use a safe crossing point.
Abandoned campsite
Old tools/material traces and a history clue.
Investigate carefully; may reveal a capability hint.
Animal trail
Wildlife movement or hunting opportunity.
Use sustainably or avoid disturbance.
Clay deposit
Pottery material source.
Develop a workshop or save for later.

36.1 Expedition example
The player selects two available adults and assigns an exploration target. Before departure, the expedition panel shows estimated travel time, food needed, known hazards and expected return route. The player can choose a cautious pace or faster pace. On arrival, the group reports the terrain and resource nodes. If they find a clay deposit, the map marks it and the timeline records the discovery. The group returns and unloads any carried samples. If the route becomes unsafe, the player receives a warning and can recall the group.
MVP can abstract expedition travel with a small party marker and timer if full pathfinding is not ready. The result must still be based on map data and visible travel state, not an unexplained random popup.
37. WEATHER, SEASONS AND ENVIRONMENTAL SYSTEMS
System
MVP / early version
Later depth
Day/night
Visual lighting shift; citizens rest on a simple schedule.
Different work visibility, night safety and lighting.
Rain
Ambient effect; can affect exposed food or muddy movement if implemented.
Water collection, flooding and crop growth.
Wind
Visual foliage/smoke movement.
Fire spread or wind-dependent sailing only much later.
Seasons
Optional gentle production modifiers.
Crop calendars, migration and seasonal events.
Temperature
Simple comfort pressure in extreme conditions.
Clothing, heating and regional climate.
River
Static/animated water and usable water access.
Flood cycles, irrigation, bridges and fishing.

37.1 Example: river flood
A heavy-rain event increases the river level. The game warns that low riverbank tiles may flood. The player can move exposed stockpiles, pause riverside work or build later protective infrastructure if unlocked. If a storage building is placed in a flood zone, it may be damaged or temporarily inaccessible. The event should never destroy a major portion of the settlement without a clear warning, fair response window and a recovery route.
For the first playable version, weather can be cosmetic plus one low-risk event. Full flood simulation is P2/P3 and should not delay the core loop.
38. ANIMALS AND WILDLIFE
Wildlife can make the world feel alive and create future food, material and domestication systems. Start with ambient animals and only add simulation when it creates decisions.
Wildlife role
Example behavior
Gameplay relationship
Ambient
Birds, butterflies or small creatures move through the scene.
Visual life; no resource accounting.
Resource source
Fish or game animals appear in defined habitats.
Optional gathering/hunting with renewal rules.
Threat
A dangerous animal avoids settlement but may approach if food is exposed.
Rare, signposted hazard; later feature.
Domestic animal
A tamed animal requires food/space and produces a useful output.
Mid-game production chain with care requirements.

Example: a small herd crosses the edge of the map. The player can ignore it, observe it or later use an unlocked herding capability. If hunting is supported, overhunting reduces local availability. Do not spawn infinite animals directly beside the settlement.
39. PRODUCTION CHAINS AND SPECIALIZATION
A production chain should have understandable inputs, work, output and a reason to exist. Each chain should create at least one meaningful choice.
Chain
Inputs
Process
Outputs
Player decision
Basic shelter
Wood / fibre / other local material
Construction job
Sleeping capacity
Build close to resources or close to the centre?
Food preservation
Food + container/material + knowledge
Preservation job
Longer-lasting food
Spend labour now to reduce future loss?
Pottery
Clay + fuel + suitable workshop
Crafting job
Containers / trade goods
Use scarce fuel for pottery or cooking?
Farming
Seeds/knowledge + suitable land + labour
Plant / tend / harvest
Seasonal food
Diversify crops or maximize one yield?
Toolmaking
Raw material + tool capability + worker
Workshop production
Tools
Which job gets the first tool?
Road building
Stone/wood or local material + labour
Construction
Improved movement
Connect storage, farm or resource site first?

Every production chain needs a bottleneck display. Example: 'Pottery stopped: no fuel.' The player should be able to click the reason and jump to the relevant resource, building or work priority.
40. TRADE, VISITORS AND EXTERNAL RELATIONSHIPS
Trade should begin as an occasional visitor, not a full global economy. It creates a new use for surplus goods and a way to obtain scarce items.
Visitor type
Offer
Possible complication
Local trader
Exchange surplus material for a missing resource.
Limited stock and a short visit window.
Travelling craftsperson
Teach a production method in exchange for supplies.
Requires shelter and food during the visit.
Migrating household
Join the settlement if capacity exists.
Adds future food, housing and work demand.
Messenger
Bring news of a nearby place or route.
Information may be incomplete.
Caravan
Larger exchange after roads and storage exist.
Needs safe route and adequate goods.

40.1 Trade example
A trader arrives with a small amount of clay and asks for surplus fibre. The trade panel shows the exact quantities before confirmation and warns if the exchange would push fibre below the player's reserve target. The player can accept, decline or negotiate only if a later bargaining system exists. The trade is recorded in history. Never silently change resource counts.
Avoid real-money monetization or pay-to-win mechanics in the core design. If cosmetics or expansions are ever considered, they should not undermine the simulation.
41. QUESTS, GOALS AND PLAYER-DIRECTED PROJECTS
Use a mix of emergent goals and optional project cards. Avoid a long generic quest list that tells every player to do the same sequence.
Goal type
Example
Completion condition
Survival milestone
Secure a stable food reserve.
Food reserve meets target for several ticks.
Infrastructure project
Connect the stone ridge to the settlement.
A valid path/road reaches the resource node.
Discovery project
Find a way to preserve food.
A mapped discovery/capability is unlocked.
Community project
Create a shared gathering place.
A communal building is completed and accessible.
Exploration goal
Map the eastern meadow.
Target region is revealed.
Self-set goal
Player names a project and pins it.
Player-defined checklist; no forced reward.

Projects should be suggested based on actual bottlenecks. If food is critical, do not suggest building a decorative monument as the main objective. The player can pin, dismiss or ignore every optional project.
42. KNOWLEDGE JOURNAL, ENCYCLOPEDIA AND DISCOVERY HISTORY
Discovery catalogue: reuse the existing catalogue and its identifiers; add a civilization impact section where relevant.
Knowledge journal: explain known materials, jobs, buildings and environmental observations.
People index: show named citizens, roles and notable events, but avoid making every citizen profile a mandatory screen.
Building index: list unlocked structures, costs, inputs, outputs and current status.
History timeline: first discovery, first building, first harvest, migration, crisis, expedition and policy changes.
Map notes: allow players to pin resource deposits, planned sites and unexplored targets.
Glossary: explain simulation terms in plain language, with examples.
42.1 Example journal entry
DISCOVERY: FOOD STORAGEWhat people noticed:  Exposed food is being lost to weather and animals.What changed:  The settlement can now build protected storage  if the required materials and construction capability exist.What is still needed:  - suitable building site  - construction materials  - available workerKnown effects:  - increases protected capacity  - reduces spoilage for eligible food  - creates a central delivery destinationRelated history:  First food-storage discovery — Day 6  First storage building completed — Day 8
43. MORE EXAMPLE EVENTS AND VILLAGER DIALOGUE
Dialogue is a presentation layer for structured simulation facts. Keep it short, varied and grounded. Do not let dialogue invent a shortage, discovery or danger that is not present in state.
Trigger
Example line
Underlying state / suggested action
Low food reserve
'We should gather more before the stores run thin.'
Projected food reserve below warning threshold.
Full stockpile
'There is nowhere left to put what we have collected.'
All reachable storage capacity is full.
Long carry route
'It takes most of the day to bring wood back.'
Average carrying distance is high.
Missing tool
'This work would be easier with a proper tool.'
Job has a relevant tool capability available but no tool in inventory.
New resource found
'There is good stone beyond the ridge.'
Exploration reveals a stone node.
Housing shortage
'Some of us have nowhere dry to sleep.'
Housing capacity below population demand.
Successful harvest
'We have gathered the first crop from our own fields.'
Harvest event completes.
Work fatigue
'We have worked hard. A little rest would help.'
Fatigue/morale crosses warning threshold.
Trade visitor
'A traveller has goods we may need.'
Trader entity enters visitor state.
Water access issue
'The stream is far from the new work site.'
Water source access exceeds target distance.
Building blocked
'We cannot finish while the path is blocked.'
Construction job cannot reach site.
Discovery duplicate
'We already know this combination.'
Existing merge engine identifies known result.

43.1 Dialogue variation rules
Vary wording by speaker role only when it adds character; do not write dozens of lines before the trigger system is stable.
Keep one sentence for the default notification and optional expanded explanation in the panel.
Use a cooldown per trigger and a global limit on simultaneous speech bubbles.
Never place a dialogue bubble over a critical control or another important notification.
Provide captions and a no-dialogue/compact-notification option.
44. VISUAL FEEDBACK: MAKE THE WORLD EXPLAIN ITSELF
Game event
World feedback
UI feedback
Gathering starts
Citizen walks to resource node and performs gather animation.
Task inspector shows target and expected output.
Resource depleted
Node visibly changes or becomes dormant.
Node panel explains depletion/renewal.
Storage fills
Carrying citizen turns back or chooses another valid destination.
Storage capacity warning and blocked reason.
Building begins
Blueprint appears, materials arrive, frame changes over time.
Construction progress and missing materials.
Building completes
Final sprite appears; nearby citizens may briefly react.
Milestone toast and building panel becomes active.
New discovery
Short subtle world reaction if relevant; no huge screen takeover.
Discovery card, capability list and link to Merging catalogue.
Citizen hungry
Citizen pauses, seeks food or shows a subtle thought indicator.
Needs panel shows hunger and available food.
Danger appears
Citizens avoid or react to the affected area.
Alert identifies location, severity and cause.
Policy changes
No magical instant transformation; behavior gradually changes.
Policy panel previews effect and confirms change.

The game should reward observation. A player looking at the world should be able to infer that a worker is carrying something, a building is under construction, a field is growing or a fire is active. UI panels provide exact details, but the world provides the first layer of information.
45. AUDIO AND AMBIENCE
Audio is optional for the first playable milestone but should be considered in the asset architecture.
Ambient layer: wind, birds, water and distant settlement sounds, mixed at low volume.
Action layer: chopping, gathering, construction, footsteps and fire, with variation to avoid repetition.
UI layer: quiet confirmation, warning and discovery sounds; never use constant loud reward sounds.
Music: adaptive, sparse themes that change subtly as the settlement develops; no abrupt looping seams.
Controls: separate master, music, ambience and effects volume; mute option; respect reduced-motion/accessibility settings.
Do not generate or ship copyrighted music imitations. Use original or properly licensed audio.
Example: opening the Merging panel should not stop the settlement ambience. A successful discovery may play a short sound, but the sound should not drown out an alert or play repeatedly for duplicate discoveries.
46. GAME MODES AND SHARED PROGRESSION — MORE PRECISE RULES
The mode hub must remain the stable home for all existing modes. Civilization is promoted, not substituted. Merging is a permanent workspace tool and may also remain independently launchable if that is how it currently works.
Situation
Expected behavior
Player opens Civilization
Load civilization save and default workspace layout.
Player opens Merging from Civilization
Open split/compact Merging without leaving the world.
Player maximizes Merging
Civilization remains in the workspace history and can be restored without losing state.
Player opens another existing mode
Launch that mode according to its existing behavior; do not force it into the Civilization split view.
Player returns to Civilization
Restore its last safe camera/selection/layout state.
A mode has independent progression
Keep its save isolated unless a documented adapter exists.
A mode shares discovery data today
Preserve current behavior and test it; do not assume all modes should share future civilization inventory.

Example regression: start a Merging session, create a partially completed combination, open Civilization in split view, collapse Merging, reopen it and confirm the in-progress state is intact. Then leave Civilization, open each other mode and confirm its existing entry path still works.
47. SAVE/LOAD AND RECOVERY — CONCRETE CASES
Case
Required behavior
Normal save
Persist world, citizens, buildings, resources, discovery links, event history and simulation clock.
Reload during construction
Construction resumes with correct reserved/consumed materials and progress.
Reload while citizen is walking
Citizen resumes a valid task or safely re-plans; never remains stuck in a non-existent path.
Reload while Merging is open
Restore safe workspace layout; preserve Merging state according to its existing save model.
Old save missing new fields
Migration supplies safe defaults without deleting old fields.
Unknown future field
Ignore or preserve safely; do not crash.
Corrupt civilization save
Offer recovery/backup; do not overwrite the only copy automatically.
Other mode save
Must remain untouched by civilization migration.
Duplicate discovery event
Do not grant the same capability or reward twice.

Use a versioned schema and migrations. Save simulation state, not transient visual interpolation. Reconstruct animations and path visuals from logical state after load.
48. EXPLOIT, EDGE-CASE AND FAILURE SCENARIOS
A credible simulation needs explicit behavior for awkward cases. Claude should add tests for these before increasing scale.
Edge case
Expected rule
No food anywhere nearby
Citizens show hunger warning; player can explore, trade or move camp. Do not create food from nowhere.
All workers are assigned
New jobs remain queued and explain that no labour is available.
Citizen dies or becomes unavailable
Reassign tasks, release reserved resources and update household/work capacity safely.
Building destroyed/removed
Handle stored goods and assigned workers according to a documented rule.
Resource node depleted mid-task
Worker stops, reports no resource and chooses another valid job.
Path becomes blocked
Recalculate route; if impossible, show blocked destination and release reservations.
Storage removed while carrying
Carrier chooses another valid store or drops goods only if the game explicitly supports that behavior.
Two workers claim the same final resource
Use atomic reservation/claim logic to prevent duplication.
Player pauses simulation during animation
Simulation state freezes; purely visual idle animation may continue at a reduced rate if desired.
Player changes speed rapidly
Simulation ticks remain deterministic and do not skip resource transactions.
Browser tab sleeps
No unbounded catch-up loop on return; apply documented offline-time policy.
Merging discovers an item twice
Existing engine handles duplicate; capability bridge is idempotent.
Missing sprite sheet
Use static fallback or placeholder; gameplay remains functional.
Asset has wrong frame count
Validation warning and fallback; never crash the scene.

49. EXAMPLE CONTENT PACK: FIRST SETTLEMENT
This is a sample content pack to help the agents visualize a coherent first region. It is not permission to hardcode all of this before the existing discovery catalogue is audited.
Content ID
Type
Description
Gameplay purpose
terrain_grass_a
Terrain
Common flat grass tile.
Default buildable land.
terrain_dirt_a
Terrain
Worn earth near camp.
Visual path/used ground.
terrain_shore_a
Terrain
Transition beside water.
Map readability.
resource_tree_basic
Resource
Small tree/branch source.
Wood/fibre gathering.
resource_berry_bush
Resource
Seasonal edible bush.
Early food.
resource_stone_outcrop
Resource
Small stone deposit.
Basic construction/crafting.
resource_reeds
Resource
Wetland plant cluster.
Fibre/container chain if supported.
building_camp
Building
Temporary communal camp.
Starting gathering point.
building_shelter_basic
Building
Small shelter.
Rest capacity.
building_stockpile
Building
Open storage area.
Centralized inventory.
building_storehouse
Building
Protected storage.
Preservation/capacity upgrade.
building_workshop_basic
Building
Simple work area.
Tool/production jobs.
character_gatherer
Character
Adult gatherer outfit.
Food/resource tasks.
character_builder
Character
Builder carrying materials.
Construction role.
character_elder
Character
Older community member.
Knowledge/hint speaker.

49.1 Sample starting map layout
                    NORTH       [Forest]       [Stone ridge]          |                |   [Berry patch]     [Rock outcrop]          |                | [Open grass] -- [Starting camp] -- [Reeds]          |                |      [Meadow]          [Stream]          |                |    [Fertile soil] -- [River bend]Starting map should be small enough to understand.The layout is a sample, not a fixed mandatory map.
Sample start state (illustrative): 5 adults, 1 elder, 0 children; 1 camp; 1 small food reserve; a nearby berry patch; limited wood and stone; no permanent storage; one stream access point. The exact values must be tuned and stored in configuration.
50. EXAMPLE CONTENT PACK: EARLY BUILDINGS
Building
Unlock condition
Inputs / workers
Outputs / effects
Failure message
Basic shelter
Starting capability or early discovery
Local materials; 1–2 builders
Sleeping capacity
'Needs more building material.'
Stockpile
Starting capability
Flat accessible ground
Small shared storage
'No reachable storage space.'
Protected storehouse
Storage-related discovery
Construction materials; 1–2 builders
Protected capacity and reduced eligible spoilage
'Needs a valid site and materials.'
Workshop
Tool/work capability
Materials; one available worker
Production jobs become available
'No qualified worker or inputs.'
Farm plot
Agriculture capability
Suitable soil; worker; seed/input if defined
Seasonal crop output
'This ground is unsuitable.'
Water point
Water-related capability
Materials; worker
Improved water access
'No valid water source nearby.'
Path
Basic construction capability
Small material cost or labour
Reduced travel cost
'Path is blocked.'
Communal area
Social milestone or basic construction
Materials; open space
Social gathering point
'Not enough room for the gathering area.'

51. EXAMPLE CONTENT PACK: JOBS AND TASKS
Job ID
Worker action
Inputs
Outputs
Typical blocker
job_gather_food
Travel to food node and collect
Accessible food node
Food stock
Node depleted / worker hungry / storage full.
job_gather_wood
Collect branches or wood
Resource node
Wood stock
Tool requirement / no reachable node.
job_gather_stone
Collect stone
Stone node
Stone stock
Distance / access / capacity.
job_carry_goods
Move goods to valid storage
Existing loose goods
Stored inventory
No destination / path blocked.
job_construct
Work on building site
Reserved construction materials
Construction progress
Missing material / no access.
job_produce_tool
Craft at workshop
Inputs + capability
Tool item
No worker / missing inputs.
job_farm
Plant/tend/harvest
Farm plot + seasonal conditions
Food/crop output
Wrong season / no seed / plot inactive.
job_rest
Return to valid rest location
Available sleeping capacity
Need recovery
No housing capacity.
job_socialize
Visit communal location
Accessible social space
Morale/social need improvement
No available time / urgent need.

52. EXAMPLE PLAYER CHOICES WITH TRADE-OFFS
Situation
Option A
Option B
Option C
Only a little wood remains
Build a shelter now; delay storage.
Build storage first; tolerate temporary exposure.
Explore for another wood source; accept time risk.
Food patch is depleted
Move gatherers farther away.
Diversify into another food method.
Reduce consumption by slowing population growth/work.
A new tool is discovered
Make one tool immediately.
Save materials for a workshop.
Use the discovery as a future project and focus on housing.
A trader arrives
Exchange surplus now.
Keep reserves for winter.
Decline and wait for a better offer.
A flood is forecast
Move stockpiles.
Pause riverside work.
Build protective infrastructure if unlocked.
A skilled worker is overworked
Keep them on the highest-output job.
Train another worker.
Reduce work intensity and accept lower output.

The game should not hide the trade-off. Show a simple preview such as 'This will reduce wood reserve below your target' or 'This project may delay shelter construction by about one day.' Avoid pretending to predict exact outcomes when the simulation is uncertain.
53. METRICS AND BALANCING TELEMETRY
For development and optional player-facing reports, track metrics that explain whether the settlement is healthy. Do not collect personal data; these are in-game simulation metrics.
Metric
What it reveals
Use
Food days remaining
Current food / projected daily consumption.
Early warning and reserve planning.
Housing utilization
Population versus sleeping capacity.
Expansion timing.
Worker utilization
Available adults versus assigned jobs.
Labour bottlenecks.
Average carrying distance
How far goods travel to storage/workplaces.
Placement and logistics feedback.
Production uptime
How often a building can operate.
Missing input/worker/storage diagnosis.
Resource renewal rate
Regrowth versus extraction.
Sustainability.
Alert frequency
How often urgent alerts appear.
Avoid notification spam.
Idle time by reason
Why citizens are not working.
AI/task scheduler debugging.
Discovery-to-use time
Time between item discovery and first practical use.
Measure whether crafting connects to gameplay.

A useful internal metric is discovery-to-use time. If a player discovers an item but does not understand how to use it for 20 minutes, the bridge UI is probably too obscure. Another useful metric is the percentage of alerts that are dismissed without action; a high value may mean alerts are noisy or unhelpful.
54. CONFIGURATION AND TUNING DATA
Keep tunable values in structured configuration rather than burying them in components. Example schema:
SimulationTuning {  tickRateSeconds: 1.0,  defaultSpeed: 1,  speedOptions: [0, 1, 2, 4],  maxVisibleNamedCitizens: 24,  citizenNeedDecay: { hunger: 0.02, fatigue: 0.015 },  taskCommitmentTicks: 5,  warningThresholds: {    foodDays: 2,    housingUtilization: 0.9,    storageUtilization: 0.95  },  resourceRenewal: { enabled: true, profile: "temperate" },  seasons: { enabled: false, lengthDays: 20 }}
These values are placeholders. Claude should define units, ranges and validation, then tune through playtesting. Never assume the illustrative values in this document are balanced.
55. FEATURE PRIORITY MATRIX — WHAT TO BUILD WHEN
Feature
Priority
Why / dependency
Workspace shell and Merging split view
P0
Core user requirement; protects existing experience.
Mode preservation audit
P0
Prevents destructive redesign.
Small map renderer and camera
P0
Needed to see the civilization.
Citizen idle/walk/task states
P0
Makes the world feel alive.
Basic resource gather/carry/store/consume
P0
First economy loop.
One or two buildings
P0
Makes resources useful.
Discovery-to-capability bridge
P0
Unique identity of the game.
Contextual hints and alerts
P0
Teaches and explains systems.
Save/load and migration
P0
Protects progress.
Jobs/needs depth
P1
Adds autonomous settlement management.
Seasonal planning
P1
Adds long-term decisions.
Exploration points of interest
P1
Expands map and discovery.
Production chains and specializations
P1
Creates meaningful economy.
Households and migration
P2
Population depth.
Trade visitors
P2
Creates surplus/resource choices.
Culture and traditions
P2
Adds emotional identity.
Wildlife and domestication
P2
Adds ecosystem and production.
Advanced weather/disasters
P2/P3
High complexity; only after warnings/recovery are fair.
Governance and institutions
P3
Late-game depth.
Large-scale diplomacy/war
Experimental
Not central to the current concept; requires separate approval.

56. EXPLICIT ANTI-FEATURES — THINGS NOT TO BUILD BY DEFAULT
Do not turn the game into a wall of counters and spreadsheet panels. The world remains the main interface.
Do not make citizens require constant manual clicking.
Do not let every discovered item instantly spawn as a usable object in the settlement.
Do not add dozens of resources that differ only by name.
Do not add a full political/military/war simulation before the settlement loop is fun.
Do not make disasters randomly erase hours of progress.
Do not generate all dialogue dynamically with an LLM during simulation.
Do not make the simulation depend on a live AI API call.
Do not replace the existing Merging engine with a second recipe implementation.
Do not remove or hide existing game modes.
Do not use a single flattened background image as the entire map; the world needs independently placeable/selectable entities.
Do not let generated images dictate the simulation architecture. Art follows stable gameplay/asset contracts.
Do not build a feature just because it appears in this document. Follow the priority matrix and test the core loop.
57. EXTRA ACCEPTANCE TESTS — EXAMPLE-DRIVEN
Test scenario
Pass condition
First discovery
A valid existing merge creates one new discovery event and one capability unlock, exactly once.
Discovery without resources
Capability appears; production panel lists missing inputs and offers a useful route to locate them.
Full storage
Gathering/carrying stops or redirects safely; no resource disappears or duplicates.
Hungry builder
Builder pauses at a safe point, eats, then resumes or re-plans.
No housing capacity
Population warning explains the limit; no instant unexplained population growth.
Split-screen resize
Merging drag state and civilization state survive resize/collapse/reopen.
All other modes
Every mode from the audit launches and preserves its own save behavior.
Season transition
The player receives an understandable forecast and can prepare; no surprise unavoidable wipe.
Citizen path blocked
Citizen replans or reports blockage without infinite walking animation.
Asset failure
Missing animation uses fallback and gameplay remains usable.
Save during event
Timeline and state remain consistent after reload.
Low-performance mode
Simulation remains correct while visual effects and animation frequency are reduced.

58. REQUIRED CLAUDE OUTPUT AFTER READING V3
Before implementing a large feature, Claude must send the owner a concise but concrete response containing:
An accurate repository/mode audit, including the exact mode names and which branch/deployed commit contains them.
A map of the existing merge engine, discovery data and 3D item model pipeline.
A list of reusable existing systems and systems that genuinely need to be built.
A proposed first playable slice with exact files/components/data modules likely to change.
A feature dependency graph showing which systems block which others.
A list of asset contracts for Gemini and ChatGPT with provisional dimensions and stable asset IDs.
A risk list: save compatibility, renderer choice, performance, panel remounting and mode regression.
A test plan and a clear statement of what will not be implemented in the first slice.
Claude should then begin the first approved slice while the two image agents generate the next batch. Do not spend days writing a grand architecture document instead of shipping the first small working slice.
59. BOT-SPECIFIC EXPANDED WORK QUEUES
59A. Claude — implementation queue
Queue
Concrete output
Must coordinate with
A. Audit
Mode matrix, discovery map, save map, rendering map.
Owner.
B. Workspace
Resizable Civilization/Merging workspace with preserved craft state.
Owner; no art dependency.
C. World prototype
Small tile map, camera, selection and placeholders.
Gemini.
D. Citizen prototype
Named agents with idle/walk/task state and inspector.
ChatGPT.
E. Economy
Gather/carry/store/consume with deterministic tests.
ChatGPT gameplay review.
F. Building loop
Placement, construction, costs and functional outputs.
Gemini building art.
G. Discovery bridge
Existing discovery ID to capability mapping.
Owner validates initial mappings.
H. Hints/events
Structured triggers and timeline.
ChatGPT dialogue/content.
I. Persistence
Versioned save, migrations and recovery.
Owner approves risk.
J. Regression
Every existing mode and Merging workflow verified.
All agents review.

59B. Gemini — expanded asset queue
Produce a style board with three alternatives, then one approved master palette.
Produce a seamless terrain sample and test repeated tiles in an actual map grid.
Produce resource node states: full, partially depleted, depleted and regrowing where relevant.
Produce building sprites with consistent footprint, anchor and selection footprint.
Produce construction stages for the first two buildings.
Produce water, smoke, fire and foliage loops plus static fallbacks.
Produce day/night lighting overlays only after the renderer contract is agreed.
Review all art in actual game zoom; a beautiful 512px image that becomes unreadable at 32px is not a successful game asset.
59C. ChatGPT — expanded gameplay and character queue
Define citizen task priorities, interruptions, idle reasons and simple skill progression.
Create a coherent cast of six initial character archetypes with shared proportions and clothing logic.
Generate transparent directional sprite sheets and actual looping previews.
Generate portraits/emotes for hint speakers and event cards.
Write short dialogue variants tied to explicit trigger IDs, not free-floating flavor text.
Review the first-hour player journey and identify confusing or unnecessary clicks.
Research historical examples for early food storage, shelter, tools, farming and trade; distinguish historical evidence from simplified game rules.
Review every integrated animation for foot sliding, pivot drift, inconsistent silhouette and palette mismatch.
60. FINAL EXAMPLE: A 20-MINUTE SESSION THAT SHOWS THE WHOLE GAME
The following is the ideal demonstration of the game's unique identity. It combines the world, citizen behavior, hints, Merging, discoveries, building and visible consequences.
The player opens Civilization. A small settlement is visible beside a stream. Four citizens are active: one gathers food, one carries wood, one rests and one inspects the camp.
The HUD shows food reserve falling slowly. The player selects the gatherer and sees that the nearby berry patch is nearly depleted.
A villager thought appears: 'The bushes are not giving us enough anymore.' The player opens the map and marks a nearby meadow for exploration.
Before sending an expedition, the player notices that exposed food has been disappearing. A second hint says: 'We should keep what we gather somewhere dry.'
The player opens Merging in a compact right-hand panel. The civilization remains visible on the left. The simulation continues at 1x speed.
The player experiments with existing items. The merge engine returns a valid discovery. A discovery card explains that the new item/capability may help with storage.
The player does not receive a free storehouse. Instead, the building list now contains a protected storage option with its exact requirements.
The player closes the compact panel to a small tab, selects a site near the camp and places a storehouse blueprint. The footprint is valid and the cost is shown.
Citizens autonomously fetch materials. The player watches the building frame appear. The inspector shows one missing material and explains why construction paused.
The player raises the relevant gathering priority. A worker collects the missing material and construction resumes.
The storehouse completes. Food is moved into protected storage. The food-loss trend improves.
The player checks the timeline: discovery, blueprint placed, first material delivered, building completed. The settlement has visibly changed because of the player's invention.
The expedition returns with a map reveal: fertile soil and a stone deposit. The player pins a future farm project but chooses not to start it yet.
The session ends with the player having solved a real problem, discovered something, built something, learned the simulation and created a new future goal.
If the game can deliver this session reliably, it has achieved the core concept. Everything else — advanced politics, distant civilizations, deep trade, complex wildlife, large disasters and late historical eras — can grow from this foundation.
61. OWNER REVIEW CHECKLIST
Does the world remain the main visual focus rather than becoming a dashboard?
Can I use Merging while watching Civilization without losing my current merge session?
Are all current non-Merging modes still present and playable?
Does each discovery have a clear practical use, or is it intentionally only a collection item?
Can I understand why a citizen is doing something or not doing something?
Can I see why a building is not producing or construction is paused?
Do villagers give hints only when the underlying condition is true?
Are generated assets coherent in pixel density, perspective, scale and animation?
Can I play a satisfying 15–30 minute session without waiting for late-game features?
Can I close/reload the app without losing progress?
62. FINAL DIRECTIVE TO ALL THREE BOTS
Treat this as a living production bible. It is intentionally ambitious, but the implementation must be disciplined. Preserve the existing Evolution Sandbox identity and all existing modes. Civilization becomes the living world; Merging becomes its invention workshop; the other modes remain available as independent experiences. Every feature must support a meaningful player decision, a visible consequence or a clearer understanding of the world.
Claude: implement one tested slice at a time. Gemini: generate cohesive environment art and animated effects in small batches. ChatGPT: generate cohesive animated citizens and strengthen the gameplay/content design. Both image agents: research online examples before each major batch, document sources and licenses, and create original art rather than copying.
Do not let the document become an excuse for endless planning. Build the smallest version of the full loop, test it, show it, and expand only when the current loop is genuinely working.
