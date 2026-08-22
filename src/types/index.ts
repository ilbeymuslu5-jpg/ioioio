/**
 * Shared contracts. Kept in one place so every layer agrees on the same
 * shapes without importing each other's implementation.
 */

export interface Vec2 {
  x: number;
  y: number;
}

export interface Bounds {
  width: number;
  height: number;
}

export interface Rect {
  minX: number;
  minY: number;
  maxX: number;
  maxY: number;
}

/** Every stat that flows through the StatSystem pipeline. */
export type StatKey =
  | 'maxHealth'
  | 'healthRegen'
  | 'maxMana'
  | 'manaRegen'
  | 'armor'
  | 'damage'
  | 'attackSpeed'
  | 'attackRange'
  | 'critChance'
  | 'critMultiplier'
  | 'moveSpeed'
  | 'pickupRadius'
  | 'cooldownReduction'
  | 'xpGain'
  | 'goldGain'
  | 'luck';

/** One layer's contribution to a stat: a flat term and a percentage term. */
export interface StatModifier {
  flat: number;
  perc: number;
}

/** Where a modifier came from; each source is capped/scaled differently. */
export type StatSource = 'talent' | 'gear' | 'inMatch';

export type StatBlock = Record<StatKey, number>;
export type PartialStatBlock = Partial<Record<StatKey, number>>;

/** Shared rarity ladder: loot, equipment and talent cards all use it. */
export type Rarity = 'common' | 'magic' | 'epic' | 'legendary';

export const RARITY_ORDER: readonly Rarity[] = ['common', 'magic', 'epic', 'legendary'];

/** Equipment slots the hero can wear. */
export type EquipmentSlot = 'weapon' | 'chest' | 'helmet' | 'amulet';

export const EQUIPMENT_SLOTS: readonly EquipmentSlot[] = ['weapon', 'chest', 'helmet', 'amulet'];

/** Deterministic or native random number generator, always in [0, 1). */
export type Rng = () => number;

export interface EngineHost {
  readonly tick: number;
  readonly fps: number;
  readonly alpha: number;
}

/**
 * A unit of behaviour driven by the engine.
 * `update` runs on the fixed simulation step, `render` once per frame, and
 * `attach` once at registration (setup, event subscriptions).
 */
export interface GameSystem<TContext = unknown> {
  readonly name: string;
  attach?(context: TContext, engine: EngineHost): void;
  detach?(): void;
  update?(dt: number, context: TContext, engine: EngineHost): void;
  render?(alpha: number, context: TContext, engine: EngineHost): void;
}

/* --- Configuration contracts ------------------------------------------
   Config sections are typed structurally rather than with `as const`, so
   systems accept an alternative block (a test fixture, a tuning experiment,
   a per-mode ruleset) while the shipped object stays deeply readonly.
   -------------------------------------------------------------------- */

export interface EngineConfig {
  readonly tickRate: number;
  readonly maxTicksPerFrame: number;
}

export interface ArenaConfig {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly wallRestitution: number;
}

export interface HeroConfig {
  /** The hero is a fixed-size body; nothing about it scales with mass. */
  readonly radius: number;
  readonly mass: number;
  readonly drag: number;
  readonly acceleration: number;

  readonly baseMaxHealth: number;
  readonly baseHealthRegen: number;
  readonly baseMaxMana: number;
  readonly baseManaRegen: number;
  readonly baseArmor: number;
  readonly baseDamage: number;
  readonly baseAttackSpeed: number;
  readonly baseAttackRange: number;
  readonly baseCritChance: number;
  readonly baseCritMultiplier: number;
  readonly baseMoveSpeed: number;
  readonly basePickupRadius: number;

  /** Half-width of the melee swing arc, in radians. */
  readonly swingHalfAngle: number;
  /** How long the swing stays visible and the hitbox stays live. */
  readonly swingDuration: number;
  /** Knockback impulse a landed swing applies. */
  readonly swingKnockback: number;

  readonly dashSpeed: number;
  readonly dashDuration: number;
  readonly dashCooldown: number;
  readonly dashManaCost: number;
  /** Damage immunity window, measured from the start of a dash. */
  readonly dashInvulnerability: number;

  readonly invulnerabilityAfterHit: number;
}

export interface CombatConfig {
  /** Cap on how much attack speed can compress the swing cooldown. */
  readonly minAttackInterval: number;
  /** Enemies pushed away from each other so a pack cannot occupy one point. */
  readonly separationForce: number;
}

export interface LootConfig {
  readonly pickupSpeed: number;
  readonly dropSpread: number;
  /** Loot despawns after this many seconds so the field cannot fill up. */
  readonly lifetime: number;
  readonly goldRadius: number;
  readonly soulRadius: number;
  readonly chestRadius: number;
}

export interface SpawnConfig {
  /** Live enemies the director aims for at wave 1. */
  readonly baseEnemyCount: number;
  /** Extra live enemies allowed per hero level. */
  readonly enemiesPerLevel: number;
  readonly maxEnemies: number;
  readonly spawnInterval: number;
  /** Enemies appear beyond the view but within this ring of the hero. */
  readonly minSpawnDistance: number;
  readonly maxSpawnDistance: number;
  /** Enemy health and damage multiplier gained per hero level. */
  readonly difficultyPerLevel: number;
}

export interface GearScalingConfig {
  readonly startEffectiveness: number;
  readonly fullEffectivenessLevel: number;
}

export interface AbilityConfig {
  readonly bladeOrbitRadius: number;
  readonly bladeOrbitSpeed: number;
  readonly bladeRadius: number;
  readonly bladeDamageInterval: number;
  readonly lightningInterval: number;
  readonly lightningRange: number;
  readonly fireTrailInterval: number;
  readonly fireTrailRadius: number;
  readonly fireTrailLifetime: number;
  readonly fireTrailTickInterval: number;
}

export interface ProgressionConfig {
  readonly baseXp: number;
  readonly growth: number;
  readonly maxLevel: number;
}

export interface CameraConfig {
  readonly followSmoothing: number;
  readonly zoomSmoothing: number;
  readonly baseZoom: number;
  readonly referenceRadius: number;
  readonly zoomMassExponent: number;
  readonly minZoom: number;
  readonly maxZoom: number;
}

export interface GameConfigShape {
  readonly engine: EngineConfig;
  readonly arena: ArenaConfig;
  readonly hero: HeroConfig;
  readonly combat: CombatConfig;
  readonly loot: LootConfig;
  readonly spawn: SpawnConfig;
  readonly abilities: AbilityConfig;
  readonly gearScaling: GearScalingConfig;
  readonly progression: ProgressionConfig;
  readonly camera: CameraConfig;
  readonly inventory: InventoryConfig;
}

export interface InventoryConfig {
  /** Backpack capacity; a full backpack refuses further pickups. */
  readonly capacity: number;
}
