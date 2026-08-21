import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';
import { pickWeighted, randomRange, TAU } from '../utils/MathUtils.js';

/**
 * Collectible orb. Grants mass and XP on pickup.
 *
 * Orbs never take part in collision resolution (`collides = false`) — they are
 * consumed by the PickupSystem instead, which keeps the physics narrow phase
 * free of hundreds of harmless contacts.
 */
export class FoodOrb extends Entity {
  constructor({
    x = 0,
    y = 0,
    tier = GameConfig.orbs.tiers[0],
    config = GameConfig.orbs,
    rng = Math.random,
  } = {}) {
    super({
      type: 'orb',
      x,
      y,
      radius: config.radiusScale * Math.sqrt(tier.mass),
      mass: tier.mass,
      color: tier.color,
      drag: 0.5,
      collides: false,
    });
    this.tier = tier.id;
    this.xpValue = tier.xp;
    this.massValue = tier.mass;
    /** Purely cosmetic drift so the field is not a static point cloud. */
    this.driftAngle = randomRange(0, TAU, rng);
    this.driftSpeed = config.driftSpeed;
    /** Set by the PickupSystem while the orb is being magnet-pulled. */
    this.attractedTo = null;
  }

  static rollTier(rng = Math.random, tiers = GameConfig.orbs.tiers) {
    return pickWeighted(tiers, rng);
  }

  update(dt) {
    if (this.attractedTo) return; // the magnet owns the velocity this tick
    this.driftAngle += dt * 0.6;
    this.velocity.x = Math.cos(this.driftAngle) * this.driftSpeed;
    this.velocity.y = Math.sin(this.driftAngle) * this.driftSpeed;
  }
}

export default FoodOrb;
