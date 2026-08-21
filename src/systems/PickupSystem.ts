import { GameConfig } from '../config/GameConfig.ts';
import type { GameSystem, PlayerConfig } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Entity } from '../entities/Entity.ts';
import type { Player } from '../entities/Player.ts';
import type { FoodOrb } from '../entities/FoodOrb.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Object-collection logic, driven entirely by spatial-grid queries.
 *
 * Two ranges per collector:
 *  1. magnet radius — orbs are pulled toward the collector,
 *  2. body radius   — orbs are consumed, granting mass and XP.
 *
 * Only cells around each collector are visited, so cost scales with the number
 * of players rather than the number of orbs in the arena.
 */
export class PickupSystem implements GameSystem<MatchContext> {
  readonly name = 'pickup';
  private readonly world: World;
  private readonly config: PlayerConfig;
  private readonly candidates: Entity[] = [];
  collectedThisTick = 0;

  constructor({
    world,
    config = GameConfig.player,
  }: {
    world: World;
    config?: PlayerConfig;
  }) {
    this.world = world;
    this.config = config;
  }

  update(dt: number): void {
    this.collectedThisTick = 0;
    for (const collector of this.world.getByType<Player>('player')) {
      if (collector.alive) this.collectFor(collector, dt);
    }
    this.world.flushRemovals();
  }

  collectFor(collector: Player, dt: number): void {
    const { position } = collector;
    const reach = Math.max(collector.magnetRadius, collector.radius);
    const found = this.world.grid.queryCircle(position.x, position.y, reach, this.candidates);

    for (const entity of found) {
      if (entity.type !== 'orb' || !entity.alive) continue;
      const orb = entity as FoodOrb;

      const dx = position.x - orb.position.x;
      const dy = position.y - orb.position.y;
      const distSq = dx * dx + dy * dy;

      // Consumed once the orb's centre is inside the collector's body.
      const eatRange = collector.radius + orb.radius * 0.5;
      if (distSq <= eatRange * eatRange) {
        this.consume(collector, orb);
        continue;
      }

      const magnet = collector.magnetRadius;
      if (distSq <= magnet * magnet) {
        this.attract(collector, orb, Math.sqrt(distSq), dx, dy, dt);
      } else if (orb.attractedTo === collector) {
        orb.attractedTo = null;
      }
    }
  }

  /** Pulls an orb inward; the pull strengthens the closer it already is. */
  attract(collector: Player, orb: FoodOrb, distance: number, dx: number, dy: number, dt: number): void {
    if (distance === 0) return;
    orb.attractedTo = collector;
    const proximity = 1 - distance / collector.magnetRadius;
    const speed = this.config.magnetPullSpeed * (0.35 + 0.65 * proximity);
    // Never overshoot the collector inside a single tick.
    const capped = Math.min(speed, distance / dt);
    orb.velocity.x = (dx / distance) * capped;
    orb.velocity.y = (dy / distance) * capped;
  }

  consume(collector: Player, orb: FoodOrb): void {
    orb.attractedTo = null;
    collector.addMass(orb.massValue);
    collector.orbsCollected++;
    this.collectedThisTick++;
    this.world.remove(orb);
    this.world.events.emit('orb:collected', {
      collector,
      orb,
      xp: orb.xpValue,
      mass: orb.massValue,
      tier: orb.tier,
    });
  }
}

export default PickupSystem;
