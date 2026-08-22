import type { GameConfigShape } from '../types/index.ts';

/**
 * Single source of truth for every tunable in the simulation.
 * Systems read from this object rather than hard-coding constants.
 */
export const GameConfig: GameConfigShape = {
  engine: {
    /** Simulation runs at a fixed 60 Hz regardless of render frame rate. */
    tickRate: 60,
    /** Ticks per frame are capped so a stalled tab cannot spiral. */
    maxTicksPerFrame: 5,
  },

  arena: {
    width: 4000,
    height: 4000,
    /** Spatial hash cell size; ~2x the largest common entity diameter. */
    cellSize: 128,
    /** Velocity kept after bouncing off an arena wall. */
    wallRestitution: 0.4,
  },

  /* --- The hero ---------------------------------------------------------
     A fixed-size medieval warrior. Nothing here scales with mass: power comes
     from levels, talents and equipment, never from body size.
     -------------------------------------------------------------------- */
  hero: {
    radius: 17,
    mass: 90,
    /** Velocity kept after 1s with no input; the source of inertia. */
    drag: 0.015,
    /** How aggressively velocity chases the desired velocity (1/s). */
    acceleration: 14,

    baseMaxHealth: 165,
    baseHealthRegen: 1.2,
    baseMaxMana: 100,
    baseManaRegen: 8,
    baseArmor: 28,
    baseDamage: 34,
    /** Swings per second before any attack-speed bonus. */
    baseAttackSpeed: 1.35,
    baseAttackRange: 78,
    baseCritChance: 0.08,
    baseCritMultiplier: 1.75,
    baseMoveSpeed: 285,
    basePickupRadius: 92,

    swingHalfAngle: Math.PI * 0.42,
    swingDuration: 0.18,
    swingKnockback: 5200,

    dashSpeed: 1150,
    dashDuration: 0.16,
    dashCooldown: 1.1,
    dashManaCost: 22,
    dashInvulnerability: 0.28,

    invulnerabilityAfterHit: 0.35,
  },

  combat: {
    /** Even at absurd attack speed a swing cannot be faster than this. */
    minAttackInterval: 0.12,
    separationForce: 340,
  },

  loot: {
    pickupSpeed: 760,
    dropSpread: 26,
    lifetime: 45,
    goldRadius: 6,
    soulRadius: 7,
    chestRadius: 11,
  },

  spawn: {
    baseEnemyCount: 10,
    enemiesPerLevel: 1.8,
    maxEnemies: 90,
    spawnInterval: 0.55,
    /** Just outside a 1280x720 view, so nothing pops in on screen. */
    minSpawnDistance: 780,
    maxSpawnDistance: 1150,
    difficultyPerLevel: 0.14,
  },

  abilities: {
    bladeOrbitRadius: 74,
    bladeOrbitSpeed: 3.1,
    bladeRadius: 13,
    /** An orbiting blade can only hit the same enemy this often. */
    bladeDamageInterval: 0.55,
    lightningInterval: 2.6,
    lightningRange: 420,
    fireTrailInterval: 0.42,
    fireTrailRadius: 34,
    fireTrailLifetime: 3.2,
    fireTrailTickInterval: 0.45,
  },

  /* Gear found in a match applies in full the moment it is worn. The ramp
     mechanism stays in StatSystem for Phase 4's metagame gear, which does need
     a barrier against flattening a fresh lobby. */
  gearScaling: {
    startEffectiveness: 1,
    fullEffectivenessLevel: 1,
  },

  progression: {
    /** xpToNext(level) = baseXp * growth ^ (level - 1) */
    baseXp: 22,
    growth: 1.26,
    maxLevel: 60,
  },

  camera: {
    /** Fraction of the remaining distance left after 1s (lower = snappier). */
    followSmoothing: 0.0005,
    zoomSmoothing: 0.02,
    /* Pulled in close: an action RPG needs the hero and the swing arc to read
       at a glance, not a wide strategic view. */
    baseZoom: 1.5,
    /** The hero never changes size, so zoom is constant unless overridden. */
    referenceRadius: 17,
    zoomMassExponent: 0,
    minZoom: 1.1,
    maxZoom: 1.9,
  },

  inventory: {
    capacity: 24,
  },
};

export default GameConfig;
