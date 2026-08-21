import { Entity } from './Entity.ts';
import { GameConfig } from '../config/GameConfig.ts';
import { pickWeighted, randomRange, TAU } from '../utils/MathUtils.ts';
import { distanceSq } from '../utils/Vector2.ts';
import type { OrbTier, OrbsConfig, Rng, Vec2 } from '../types/index.ts';

/** What an orb needs to know about whatever is pulling it in. */
export interface Collector {
  readonly position: Vec2;
  readonly magnetRadius: number;
  readonly alive: boolean;
}

export interface FoodOrbOptions {
  x?: number;
  y?: number;
  tier?: OrbTier;
  config?: OrbsConfig;
  rng?: Rng;
}

/**
 * Collectible orb granting mass and XP.
 *
 * Orbs never take part in collision resolution (`collides = false`) — the
 * PickupSystem consumes them instead, which keeps the physics narrow phase
 * free of thousands of harmless contacts.
 */
export class FoodOrb extends Entity {
  readonly tier: string;
  readonly xpValue: number;
  readonly massValue: number;
  readonly driftSpeed: number;
  private driftAngle: number;
  /** Set by the PickupSystem while this orb is being magnet-pulled. */
  attractedTo: Collector | null = null;

  constructor({
    x = 0,
    y = 0,
    tier = GameConfig.orbs.tiers[0] as OrbTier,
    config = GameConfig.orbs,
    rng = Math.random,
  }: FoodOrbOptions = {}) {
    super({
      type: 'orb',
      x,
      y,
      radius: config.baseRadius + Math.sqrt(tier.mass) * config.radiusMassFactor,
      mass: tier.mass,
      color: tier.color,
      drag: 0.5,
      collides: false,
    });
    this.tier = tier.id;
    this.xpValue = tier.xp;
    this.massValue = tier.mass;
    this.driftSpeed = config.driftSpeed;
    // Cosmetic drift so the field is not a static point cloud.
    this.driftAngle = randomRange(0, TAU, rng);
  }

  static rollTier(rng: Rng = Math.random, tiers: readonly OrbTier[] = GameConfig.orbs.tiers): OrbTier {
    return pickWeighted(tiers, rng);
  }

  override update(dt: number): void {
    if (this.attractedTo) {
      const collector = this.attractedTo;
      const magnet = collector.magnetRadius;
      // The pickup system only visits cells around a collector, so an orb left
      // behind by a moving one has to release itself or it would drift no more.
      if (collector.alive && distanceSq(this.position, collector.position) <= magnet * magnet) {
        return; // the magnet owns the velocity this tick
      }
      this.attractedTo = null;
    }
    this.driftAngle += dt * 0.6;
    this.velocity.x = Math.cos(this.driftAngle) * this.driftSpeed;
    this.velocity.y = Math.sin(this.driftAngle) * this.driftSpeed;
  }
}

export default FoodOrb;
