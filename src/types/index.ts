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
  | 'armor'
  | 'baseSpeed'
  | 'magnetRadius'
  | 'massGain'
  | 'xpGain'
  | 'damage'
  | 'healthRegen';

/** One layer's contribution to a stat: a flat term and a percentage term. */
export interface StatModifier {
  flat: number;
  perc: number;
}

/** Where a modifier came from; each source is capped/scaled differently. */
export type StatSource = 'talent' | 'gear' | 'inMatch';

export type StatBlock = Record<StatKey, number>;
export type PartialStatBlock = Partial<Record<StatKey, number>>;

export interface OrbTier {
  readonly id: string;
  readonly weight: number;
  readonly mass: number;
  readonly xp: number;
  readonly color: string;
}

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

export interface PlayerConfig {
  readonly startMass: number;
  readonly baseRadius: number;
  readonly radiusMassFactor: number;
  readonly baseSpeed: number;
  readonly speedMassExponent: number;
  readonly drag: number;
  readonly acceleration: number;
  readonly baseMaxHealth: number;
  readonly baseArmor: number;
  readonly baseHealthRegen: number;
  readonly baseMagnetRadius: number;
  readonly magnetRadiusPerRadius: number;
  readonly magnetPullSpeed: number;
}

export interface MassDecayConfig {
  readonly freeMass: number;
  readonly reference: number;
  readonly rate: number;
  readonly floorMultiplier: number;
}

export interface GearScalingConfig {
  readonly startEffectiveness: number;
  readonly fullEffectivenessLevel: number;
}

export interface OrbsConfig {
  readonly targetCount: number;
  readonly spawnPerSecond: number;
  readonly baseRadius: number;
  readonly radiusMassFactor: number;
  readonly driftSpeed: number;
  readonly tiers: readonly OrbTier[];
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
  readonly player: PlayerConfig;
  readonly massDecay: MassDecayConfig;
  readonly gearScaling: GearScalingConfig;
  readonly orbs: OrbsConfig;
  readonly progression: ProgressionConfig;
  readonly camera: CameraConfig;
}
