# Island Exploration Foundation — Design Spec

**Date:** 2026-04-07
**Status:** Approved

## Overview

Add the ability to disembark from the ship and explore islands on foot with a third-person camera. Includes larger islands, interaction prompts at points of interest, and several ship/visual improvements.

## Disembarkation Flow

1. Sail within proximity of an island (~20 units from shore)
2. HUD shows prompt: "Press E to disembark"
3. Press E → ship anchors, camera transitions from ship-follow to third-person behind Odysseus
4. Odysseus spawns on the beach nearest to the ship
5. WASD to walk, mouse to look around
6. Walk near points of interest (ruins, magic elements) → interaction prompt appears → press E → text/dialogue displays
7. Walk back to shore near ship → "Press E to board" prompt
8. Press E → camera transitions back to ship view, sailing resumes

## Island Changes

### Larger Islands
- Double all radius ranges:
  - Small: 16–36 (was 8–18)
  - Medium: 40–70 (was 20–35)
  - Large: 70–110 (was 35–55)
- Story islands get proportional increases:
  - Lotus Eaters: radius 70 (was 35)
  - Cyclops Island: radius 100 (was 50)
  - Aeolus: radius 50 (was 25)
- Height scales proportionally with radius increases

### Collision / Ground Following
- Character uses island heightmap to stay on terrain surface
- Simple raycast or heightmap lookup for Y position each frame
- No physics engine — just ground clamping

### Points of Interest
- Existing ruins and magic elements become interactable
- Detection radius ~5 units from the object center
- On approach: show floating prompt text ("Press E to examine")
- On interact: show dialogue/description text overlay (reuse cutscene text system)

## New Scene: IslandExplorationScene

### Responsibilities
- Receives reference to the current island and ship position
- Spawns Odysseus as controllable character on the beach
- Third-person camera: behind and above character, mouse-controlled orbit
- Renders the island terrain, trees, rocks, ruins, magic elements
- Ship remains visible anchored at shore (static, non-controllable)
- Manages interaction system for points of interest
- On re-board: transitions back to SailingScene with ship at same position

### Camera
- Third-person follow camera, offset behind and above Odysseus
- Mouse controls camera orbit (azimuth + elevation)
- Camera collision with terrain (don't clip underground)
- Smooth follow with slight lag for natural feel

### Character Controller
- WASD movement relative to camera facing direction
- Walk speed ~8 units/second
- Walking animation (leg/arm swing from existing Character.js)
- E key for interactions
- No jumping (keep it simple)

## Ship Visual Changes

### Remove Shields
- Delete the 22 circular shields (CircleGeometry) on the hull sides (lines ~271–335 in Ship.js)
- Delete associated shield boss geometry
- Remove the InstancedMesh for shields entirely

### More Colorful Ship
- Sail: 0xF5E6C8 (warm cream, was 0x2A1A0A near-black)
- Hull lower: 0x6B3A2A (richer warm brown, was 0x3E2210)
- Hull mid: 0x8B5E3C (warmer mid-brown, was 0x5C3A1E)
- Hull upper: 0x9A6B42 (golden brown, was 0x7A5230)
- Red band: 0xCC2222 (brighter red, was 0x8B1A1A)
- Deck: 0xC4A872 (lighter warm deck, was 0x9B8060)
- Owl emblem: keep gold

### More Colorful Characters
- Odysseus armor: 0xB8860B (gold armor, was 0x8B7355)
- Odysseus cape: 0xCC0000 (brighter red, was 0x8B0000)
- Crew armor: vary per crew member — mix of 0x8B6914 (bronze), 0x6B8E23 (olive), 0x8B4513 (saddle brown)

## Control Changes

### Sailing (Ship.js)
- Swap W/S: `getAxis('KeyW', 'KeyS')` instead of `getAxis('KeyS', 'KeyW')`
- This makes S = forward, W = backward (reversed as requested)

### On Foot (IslandExplorationScene)
- W = forward, S = backward, A = left, D = right (relative to camera)
- Mouse = camera orbit
- E = interact / board ship

## What's Deferred

- Combat system, enemy AI, health on foot
- Quest objectives and completion tracking
- Story-specific events (Cyclops encounter, Lotus Eaters effects, Aeolus winds)
- Inventory and item pickup
- NPC dialogue trees (just static text for now)
- Island-specific music/ambient audio
