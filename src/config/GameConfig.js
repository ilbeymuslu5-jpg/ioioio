/**
 * Single source of truth for gameplay tunables.
 * Systems must read from here instead of hard-coding magic numbers, so that
 * later phases (talents, gear) can layer modifiers on top of the same values.
 */
export const GameConfig = {
  engine: {
    /** Simulation runs at a fixed 60 Hz regardless of render frame rate. */
    tickRate: 60,
    /** Ticks are capped per frame so a stalled tab cannot spiral. */
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
    startMass: 20,
    /** radius = radiusScale * sqrt(mass) */
    radiusScale: 3.2,
    baseSpeed: 340,
    /** speed = baseSpeed * (startMass / mass) ^ speedMassExponent */
    speedMassExponent: 0.28,
    minSpeedFactor: 0.35,
    /** How aggressively velocity chases the desired velocity (1/s). */
    acceleration: 9,
    /** Fraction of velocity retained after 1s with no input (inertia). */
    drag: 0.02,
    baseMagnetRadius: 70,
    /** Magnet radius grows with body size so big players sweep wider. */
    magnetRadiusPerRadius: 1.15,
    magnetPullSpeed: 620,
    maxHealth: 100,
  },

  orbs: {
    /** Orb count the world tries to keep alive at all times. */
    targetCount: 1200,
    spawnPerSecond: 60,
    radiusScale: 2.6,
    /** Passive drift makes the field feel alive without costing physics time. */
    driftSpeed: 6,
    tiers: [
      { id: 'common', weight: 74, mass: 1, xp: 1, color: '#6ee7ff' },
      { id: 'rare', weight: 20, mass: 3, xp: 4, color: '#a78bfa' },
      { id: 'epic', weight: 5, mass: 8, xp: 12, color: '#fbbf24' },
      { id: 'legendary', weight: 1, mass: 20, xp: 35, color: '#fb7185' },
    ],
  },

  progression: {
    /** xpToNext(level) = baseXp * growth^(level-1) */
    baseXp: 12,
    growth: 1.28,
  },

  camera: {
    /** Fraction of the remaining distance left after 1s (lower = snappier). */
    followSmoothing: 0.0005,
    zoomSmoothing: 0.02,
    /** zoom = baseZoom * (playerRadius / referenceRadius) ^ -zoomMassExponent */
    baseZoom: 1,
    referenceRadius: 14,
    zoomMassExponent: 0.42,
    minZoom: 0.45,
    maxZoom: 1.35,
  },
};

export default GameConfig;
