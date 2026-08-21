import type { GameConfigShape, OrbTier } from '../types/index.ts';

/**
 * Single source of truth for every tunable in the simulation.
 * The numbers here implement the balance models from the design spec; systems
 * must read from this object rather than hard-coding constants.
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

  player: {
    startMass: 25,

    /* --- Mass, size and speed scaling ---------------------------------
       Radius       = baseRadius + sqrt(mass) * radiusMassFactor
       MovementSpeed = (baseSpeed / mass ^ speedMassExponent) * (1 + speedBuffs)
       -------------------------------------------------------------------- */
    baseRadius: 12,
    radiusMassFactor: 1.2,
    baseSpeed: 535,
    speedMassExponent: 0.18,

    /** Velocity kept after 1s with no input; the source of inertia. */
    drag: 0.02,
    /** How aggressively velocity chases the desired velocity (1/s). */
    acceleration: 9,

    baseMaxHealth: 100,
    baseArmor: 0,
    baseHealthRegen: 0.5,
    baseMagnetRadius: 70,
    /** Magnet reach grows with body size so big players sweep wider. */
    magnetRadiusPerRadius: 1.15,
    magnetPullSpeed: 620,
  },

  /* --- Snowball barrier ------------------------------------------------
     A heavy player bleeds mass every second, logarithmically in the excess
     over `freeMass`, so leading is a running cost rather than a runaway win:
       decayPerSecond = rate * ln(1 + max(0, mass - freeMass) / reference)
     -------------------------------------------------------------------- */
  massDecay: {
    /** Mass below this never decays, so early game stays frictionless. */
    freeMass: 60,
    reference: 60,
    rate: 0.9,
    /** Decay never pushes a player below this multiple of the start mass. */
    floorMultiplier: 1,
  },

  /* --- Item cliff barrier ----------------------------------------------
     Metagame gear enters a match at 25% effect and reaches 100% as in-match
     level climbs, so a geared veteran cannot flatten a fresh lobby at minute
     one — they have to earn the power inside the match too.
     -------------------------------------------------------------------- */
  gearScaling: {
    startEffectiveness: 0.25,
    fullEffectivenessLevel: 10,
  },

  orbs: {
    /** Orb count the world tries to keep alive at all times. */
    targetCount: 1200,
    spawnPerSecond: 60,
    baseRadius: 2.5,
    radiusMassFactor: 0.9,
    /** Passive drift keeps the field alive without costing physics time. */
    driftSpeed: 6,
    tiers: [
      { id: 'common', weight: 74, mass: 1, xp: 1, color: '#6ee7ff' },
      { id: 'rare', weight: 20, mass: 3, xp: 4, color: '#a78bfa' },
      { id: 'epic', weight: 5, mass: 8, xp: 12, color: '#fbbf24' },
      { id: 'legendary', weight: 1, mass: 20, xp: 35, color: '#fb7185' },
    ] as readonly OrbTier[],
  },

  progression: {
    /** xpToNext(level) = baseXp * growth ^ (level - 1) */
    baseXp: 12,
    growth: 1.28,
    maxLevel: 60,
  },

  camera: {
    /** Fraction of the remaining distance left after 1s (lower = snappier). */
    followSmoothing: 0.0005,
    zoomSmoothing: 0.02,
    /** zoom = baseZoom * (radius / referenceRadius) ^ -zoomMassExponent */
    baseZoom: 1,
    referenceRadius: 18,
    zoomMassExponent: 0.42,
    minZoom: 0.45,
    maxZoom: 1.35,
  },
} as const;

export default GameConfig;
