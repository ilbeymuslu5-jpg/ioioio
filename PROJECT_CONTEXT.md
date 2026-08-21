# GAME DESIGN DOCUMENT & SYSTEM ARCHITECTURE (PROJECT CONTEXT)

## 1. Project Overview & Core Concept
- **Genre:** Multiplayer Top-Down Arena Survival / IO Game with RPG Progression & Metagame.
- **Core Loop:**
  - **In-Match:** Spawn into an arena -> Collect resources/XP orbs -> Level up & pick dynamic in-match talents (Rogue-lite skill tree) -> Fight AI/other players -> Extract or survive to bank resources.
  - **Meta Loop:** Return to menu -> Use banked currencies to upgrade persistent stats/passives -> Craft/equip armor & weapons -> Customize cosmetics -> Enter next arena.
- **Target Tech Stack (Standard Clean Arch):** 
  - Engine/Client: Phaser.js / PixiJS (Web) or Unity (C#) depending on target platform.
  - Backend (Multiplayer/Sync): Node.js with WebSockets / Colyseus (authoritative server architecture) or lightweight mock offline-first state for early prototypes.
  - Data Storage: LocalStorage / IndexedDB (Client Prototype) -> SQLite/PostgreSQL (Production).

---

## 2. Core Gameplay Mechanics

### A. Movement & Arena Physics
- Smooth top-down 360-degree vector movement (Mouse direction or Virtual Joystick).
- Inertia and mass scaling: As the player gains levels/mass within the match, movement speed, collision radius, and knockback resistance dynamically scale.
- Arena boundaries with safe zones, resource hotspots, and dynamic hazards.

### B. In-Match Progression (Rogue-lite Skill Tree)
- **Leveling Curve:** Collecting orbs or defeating enemies grants in-match XP.
- **Choice on Level-up:** 3 random upgrade choices from active/passive skill pools:
  - *Offensive:* Projectile spread, aura damage (fire trail, lightning ring), critical strike chance.
  - *Defensive:* Damage mitigation shield, instant health regen, dash cooldown reduction.
  - *Utility:* Magnet pickup radius, movement speed, XP multiplier.

### C. Persistent RPG Elements (Metagame)
- **Permanent Talent Tree:** 
  - Spent via global currency ("Essence").
  - Node types: Base Max HP, Starting Mass, Gold Magnet, Luck (rarer in-match skill rolls).
- **Inventory & Equipment System:**
  - **Slots:** Weapon (determines primary attack style), Armor (HP/Defense), Accessory (special passive effects).
  - **Item Rarity:** Common, Rare, Epic, Legendary with rolled modifiers.
- **Character Customization:**
  - Modular skin system: Base mesh/sprite tint, attachments (hats, trails, eyes, particle effects).

---

## 3. Modular Code Architecture Requirements

Claude Code must strictly structure the codebase into decoupled modules:

1. `/src/core/`
   - `GameEngine`: Loop manager, tick synchronization, fixed timestep updater.
   - `InputManager`: Abstracts mouse, touch, and keyboard events into uniform vector actions.
   - `PhysicsEngine`: Circular/spatial-grid collision detection, mass dynamics, knockback vectors.

2. `/src/entities/`
   - `Entity` (Base class): ID, position, velocity, radius, mass, health.
   - `Player`: Extends Entity with input handling, talent manager, equipment stats.
   - `FoodOrb / Resource`: Static/floating collectibles with spatial hashing.
   - `BotController`: State-machine / steering-behavior driven opponents for solo/testing.

3. `/src/systems/`
   - `SkillTreeSystem`: Graph-based talent dependencies, upgrade pool RNG, passive stat recalculation.
   - `InventorySystem`: Grid/slot management, equip/unequip events, stat buff recalculation.
   - `ProgressionSystem`: XP thresholds, persistent currency saving/loading.

4. `/src/ui/`
   - `HUD`: Mass/Level gauge, health bar, dynamic mini-map, active buff indicators.
   - `LevelUpModal`: 3-card pick interface with rarity styling.
   - `InventoryUI`: Drag-and-drop equipment grid and stat summary pane.

---

## 4. Implementation Phasing Strategy for Claude Code

- **Phase 1 (MVP):** 2D top-down movement, orb spawning, mass scaling, spatial grid collision, basic smooth camera follow.
- **Phase 2 (In-Match RPG):** XP collection, level-up trigger, dynamic 3-choice talent selection screen, skill modifiers application.
- **Phase 3 (Inventory & Items):** Persistent item inventory, equipment slot system, stat calculation pipeline linking gear stats to player entity.
- **Phase 4 (Talent Tree & Customization):** Visual skill tree graph UI, skin/trail customization, local save/load state.
- **Phase 5 (Polish & Bots):** AI steering behaviors (flee from larger, hunt smaller, gather food), particle FX, audio cues.
