import { GameConfig } from '../config/GameConfig.ts';
import { FoodOrb } from '../entities/FoodOrb.ts';
import { randomRange } from '../utils/MathUtils.ts';
import type { GameSystem, OrbsConfig, Rng } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Keeps the arena stocked with orbs.
 *
 * The field is filled instantly at match start, then topped up at a bounded
 * rate so a burst of pickups cannot respawn everything in one tick.
 */
export class SpawnSystem implements GameSystem<MatchContext> {
  readonly name = 'spawn';
  private readonly world: World;
  private readonly rng: Rng;
  private readonly config: OrbsConfig;
  private budget = 0;

  constructor({
    world,
    rng = Math.random,
    config = GameConfig.orbs,
  }: {
    world: World;
    rng?: Rng;
    config?: OrbsConfig;
  }) {
    this.world = world;
    this.rng = rng;
    this.config = config;
  }

  attach(): void {
    this.fill();
  }

  /** Spawns up to `targetCount` orbs immediately. */
  fill(): this {
    const missing = this.config.targetCount - this.world.countOfType('orb');
    for (let i = 0; i < missing; i++) this.spawnOrb();
    return this;
  }

  spawnOrb(): FoodOrb {
    const tier = FoodOrb.rollTier(this.rng, this.config.tiers);
    const margin = 24;
    return this.world.add(
      new FoodOrb({
        x: randomRange(margin, this.world.bounds.width - margin, this.rng),
        y: randomRange(margin, this.world.bounds.height - margin, this.rng),
        tier,
        config: this.config,
        rng: this.rng,
      }),
    );
  }

  update(dt: number): void {
    const deficit = this.config.targetCount - this.world.countOfType('orb');
    if (deficit <= 0) {
      this.budget = 0;
      return;
    }
    this.budget += this.config.spawnPerSecond * dt;
    const spawnCount = Math.min(deficit, Math.floor(this.budget));
    this.budget -= spawnCount;
    for (let i = 0; i < spawnCount; i++) this.spawnOrb();
  }
}

export default SpawnSystem;
