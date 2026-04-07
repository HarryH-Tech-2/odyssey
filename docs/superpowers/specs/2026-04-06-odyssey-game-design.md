# The Odyssey — Game Design Spec

## Overview
A 3D browser game built with Three.js where you play as Odysseus returning home to Ithaca after the Trojan War. Features AAA-inspired visuals with custom shaders, a mix of sailing exploration and third-person island encounters, and the complete Odyssey storyline.

## Tech Stack
- **Runtime:** Three.js (r163+) with custom GLSL shaders
- **Build:** Vite + ES modules
- **Controls:** Keyboard + mouse (desktop only)
- **UI/HUD:** HTML/CSS overlay on canvas

## Architecture

### Scene State Machine
Each game state is a class with `enter()`, `exit()`, `update(dt)`, `render()`:
- `MenuScene` — title screen
- `CutsceneScene` — narrative moments with camera animation + text
- `SailingScene` — open sea navigation between islands
- `ExplorationScene` — third-person on-island gameplay
- `CombatScene` — fight encounters (extends ExplorationScene)
- `PuzzleScene` — unique encounter mechanics

### Entity System
Entities are composable objects with behaviors:
- `Transform` — position, rotation, scale
- `MeshRenderer` — Three.js mesh/group
- `CharacterController` — WASD movement, mouse look, jump
- `Health` — HP, damage, death
- `Combat` — attack, block, dodge
- `Dialogue` — NPC conversations
- `AIBehavior` — enemy/NPC state machines
- `ShipController` — sailing controls (WASD steering, wind interaction)

### Procedural Geometry
All meshes built from primitives — no external GLTF files:
- Characters from cylinders, spheres, boxes with custom shaders
- Buildings from box/plane compositions
- Terrain from heightmap-displaced planes
- Vegetation from billboarded planes with alpha shaders
- Monsters from creative primitive compositions

## Visual Pipeline

### Custom Shaders
1. **Ocean** — Gerstner waves (5-layer), Fresnel reflection, foam FBM noise, subsurface scattering, caustics
2. **Sky** — Procedural gradient with sun glow, dynamic time-of-day
3. **PBR Materials** — Metallic/roughness workflow for armor, stone, wood
4. **Volumetric Fog** — Ray-marched fog for caves and atmosphere
5. **God Rays** — Screen-space light shafts from sun
6. **Fire** — Animated noise-based flame shader for torches/Cyclops cave
7. **Magic** — Particle systems + glow shaders for Circe's spells
8. **Water Distortion** — Underwater/whirlpool screen effect for Charybdis
9. **Wind Vegetation** — Vertex-animated plants/trees
10. **Skin/Marble SSS** — Subsurface scattering approximation

### Post-Processing Stack
- SSAO (ambient occlusion)
- Bloom with HDR tone mapping (ACES Filmic)
- Chromatic aberration (subtle, 0.002)
- Color grading (warm Mediterranean LUT)
- Depth of field (cutscenes only)
- Vignette

### Color Palette
- Deep Sea: #0a2a4a → #1a6fa0
- Aegean Shallow: #1a8a7a → #40bfb0
- Sandstone: #c4843a → #f0c27f
- Marble: #c9b896 → #e8d5b7
- Olive Grove: #2d4228 → #4a6741
- Flame: #c0392b → #ff6b35
- Night: #1a0f0a → #2c1810
- Divine Gold: #b8860b → #ffd700

## Game Flow — The Complete Odyssey

### 1. Troy Departure (Cutscene)
- Camera pans over burning Troy
- Odysseus boards his ship with crew
- Sets sail — transition to sailing

### 2. Open Sea Sailing (Recurring)
- Third-person ship view, WASD to steer
- Wind direction indicator, sail trim
- Day/night cycle, dynamic weather
- Random encounters (storms, calm seas)
- Compass/star navigation toward next destination

### 3. Land of the Lotus Eaters
- **Type:** Exploration + Puzzle
- **Setting:** Lush tropical island with dreamlike fog
- **Encounter:** Crew members eating lotus, becoming docile
- **Puzzle:** Find and drag crew back to ship before time runs out
- **Shader:** Dreamy blur/saturation effect that increases as you stay

### 4. Cyclops (Polyphemus) Island
- **Type:** Exploration + Puzzle + Combat
- **Setting:** Rocky island, massive cave with firelight
- **Encounter:** Trapped in cave with Polyphemus
- **Puzzle:** Get Cyclops drunk (find wine), sharpen stake, blind him
- **Combat:** Dodge Cyclops attacks while executing plan
- **Escape:** Hide under sheep to exit cave
- **Shader:** Volumetric cave lighting, fire glow, massive scale

### 5. Aeolus — Island of Winds
- **Type:** Cutscene + Sailing
- **Setting:** Floating island with swirling wind effects
- **Encounter:** Receive bag of winds from Aeolus
- **Gameplay:** Crew opens bag near Ithaca, blown back (sailing storm sequence)
- **Shader:** Wind particle vortex, storm effects

### 6. Laestrygonians
- **Type:** Combat + Escape
- **Setting:** Harbor surrounded by cliffs
- **Encounter:** Giant cannibals attack fleet
- **Gameplay:** Escape harbor under bombardment, lose most ships
- **Shader:** Destruction particles, fire on water

### 7. Circe's Island (Aeaea)
- **Type:** Exploration + Puzzle + Combat
- **Setting:** Enchanted forest, Circe's palace
- **Encounter:** Crew turned to pigs, Odysseus resists with divine herb
- **Puzzle:** Find moly herb, navigate enchanted forest
- **Combat:** Confront Circe, break her spell
- **Resolution:** Circe becomes ally, advises on journey ahead
- **Shader:** Magic transformation particles, enchanted glow, bioluminescence

### 8. The Underworld (Nekyia)
- **Type:** Exploration + Dialogue
- **Setting:** Dark, misty realm of the dead
- **Encounter:** Speak with Tiresias, Achilles, Agamemnon, mother
- **Gameplay:** Navigate through shades, find key spirits for prophecy
- **Shader:** Ghostly transparency, desaturation, floating soul particles

### 9. Sirens
- **Type:** Sailing + Puzzle
- **Setting:** Rocky shore with eerie beauty
- **Encounter:** Sirens sing — screen distorts, ship drifts toward rocks
- **Puzzle:** Must have crew plug ears with wax, tie self to mast (done in prep on ship)
- **Gameplay:** Resist pull toward rocks while bound, crew must row straight
- **Shader:** Audio-reactive screen distortion, hypnotic color shift, chromatic aberration ramp

### 10. Scylla and Charybdis
- **Type:** Sailing + Combat
- **Setting:** Narrow strait, whirlpool on one side, sea monster on other
- **Encounter:** Navigate between both threats
- **Gameplay:** Steer through strait, Scylla snatches crew members
- **Shader:** Whirlpool vortex distortion, turbulent water, storm lightning, tentacle displacement

### 11. Thrinacia — Cattle of the Sun
- **Type:** Exploration + Moral Choice
- **Setting:** Golden sunlit island with divine cattle
- **Encounter:** Crew starving, tempted to eat sacred cattle
- **Gameplay:** Choose to stop crew or allow it; consequences follow
- **Shader:** Golden hour lighting, divine glow on cattle

### 12. Calypso's Island (Ogygia)
- **Type:** Exploration + Dialogue
- **Setting:** Paradise island, crystal waters, Calypso's grotto
- **Encounter:** Calypso offers immortality, Odysseus must choose to leave
- **Gameplay:** Explore paradise, build raft, make the choice
- **Shader:** Paradise lighting, crystal water caustics, lens flares

### 13. Phaeacia
- **Type:** Cutscene + Dialogue
- **Setting:** Civilized coastal city
- **Encounter:** Washed ashore, welcomed by Nausicaa and King Alcinous
- **Gameplay:** Tell your story (recap), receive ship home
- **Shader:** Warm civilization lighting, marble reflections

### 14. Return to Ithaca
- **Type:** Exploration + Combat
- **Setting:** Ithaca — Odysseus's home, overrun by suitors
- **Encounter:** Disguised as beggar, prove identity, fight suitors
- **Gameplay:** Stealth section → archery contest → final battle
- **Shader:** Emotional bloom, golden hour, lens flares on reunion

## HUD / UI

### In-Game HUD
- **Health bar** — top-left, pink/red gradient
- **Stamina bar** — below health, blue gradient
- **Minimap** — bottom-right circle, shows nearby points of interest
- **Compass** — top-center, shows heading and next objective
- **Interaction prompt** — center-bottom, context-sensitive (E to interact)
- **Quest log** — collapsible panel, tracks current objective
- **Inventory** — grid overlay (Tab to toggle), items: sword, bow, shield, wine, moly herb, wax, rope

### Sailing HUD (additions)
- Wind direction indicator
- Sail trim gauge
- Ship health
- Crew count

## Controls

### On Foot
- WASD — move
- Mouse — look
- Left click — attack
- Right click — block/aim bow
- Space — jump/dodge
- E — interact
- Tab — inventory
- Q — quest log
- Shift — sprint (uses stamina)

### Sailing
- W/S — forward/reverse (row speed)
- A/D — turn rudder
- Q/E — trim sails
- Space — raise/lower anchor
- Mouse — look around

## Audio (Stretch)
- Procedural ocean ambiance
- Wind intensity tied to weather
- Combat sound effects
- Narrative voice (text-to-speech or text only for v1)

## Success Criteria
- Runs at 60fps on mid-range hardware in Chrome
- All 14 locations playable
- Custom shaders for ocean, sky, fire, magic, fog, underworld
- Full HUD with health, stamina, minimap, inventory
- Smooth transitions between sailing and exploration
- Each encounter has unique gameplay mechanic
