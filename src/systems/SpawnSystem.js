import { GameConfig } from '../config/GameConfig.js';
import { FoodOrb } from '../entities/FoodOrb.js';
import { randomRange } from '../utils/MathUtils.js';

/**
 * Keeps the arena stocked with orbs.
 *
 * The field is filled instantly on start, then topped up at a bounded rate so
 * a burst of pickups does not respawn everything in a single tick.
 */
export class SpawnSystem {
  name = 'spawn';

  constructor({ world, rng = Math.random, config = GameConfig.orbs }) {
    this.world = world;
    this.rng = rng;
    this.config = config;
    this._budget = 0;
  }

  attach() {
    this.fill();
  }

  /** Spawns up to `targetCount` orbs immediately (match start). */
  fill() {
    const missing = this.config.targetCount - this.world.countOfType('orb');
    for (let i = 0; i < missing; i++) this.spawnOrb();
    return this;
  }

  spawnOrb() {
    const tier = FoodOrb.rollTier(this.rng, this.config.tiers);
    const margin = 24;
    const orb = new FoodOrb({
      x: randomRange(margin, this.world.bounds.width - margin, this.rng),
      y: randomRange(margin, this.world.bounds.height - margin, this.rng),
      tier,
      config: this.config,
      rng: this.rng,
    });
    this.world.add(orb);
    return orb;
  }

  update(dt) {
    const deficit = this.config.targetCount - this.world.countOfType('orb');
    if (deficit <= 0) {
      this._budget = 0;
      return;
    }
    this._budget += this.config.spawnPerSecond * dt;
    const spawnCount = Math.min(deficit, Math.floor(this._budget));
    this._budget -= spawnCount;
    for (let i = 0; i < spawnCount; i++) this.spawnOrb();
  }
}

export default SpawnSystem;
