import { GameConfig } from '../config/GameConfig.js';

/**
 * Object-collection logic, driven entirely by spatial-grid queries.
 *
 * Two ranges per collector:
 *  1. magnet radius — orbs are pulled toward the collector,
 *  2. body radius   — orbs are consumed, granting mass and XP.
 *
 * Only cells around each collector are visited, so cost scales with the number
 * of players rather than with the number of orbs in the arena.
 */
export class PickupSystem {
  name = 'pickup';

  constructor({ world, config = GameConfig.player }) {
    this.world = world;
    this.config = config;
    this._candidates = [];
    this.collectedThisTick = 0;
  }

  update(dt) {
    this.collectedThisTick = 0;
    for (const collector of this.world.getByType('player')) {
      if (collector.alive) this.collectFor(collector, dt);
    }
    this.world.flushRemovals();
  }

  collectFor(collector, dt) {
    const { position } = collector;
    const reach = Math.max(collector.magnetRadius ?? 0, collector.radius);
    const found = this.world.grid.queryCircle(position.x, position.y, reach, this._candidates);

    for (const entity of found) {
      if (entity.type !== 'orb' || !entity.alive) continue;

      const dx = position.x - entity.position.x;
      const dy = position.y - entity.position.y;
      const distSq = dx * dx + dy * dy;

      // Consumed once the orb's centre is inside the collector's body.
      const eatRange = collector.radius + entity.radius * 0.5;
      if (distSq <= eatRange * eatRange) {
        this.consume(collector, entity);
        continue;
      }

      const magnet = collector.magnetRadius ?? 0;
      if (distSq <= magnet * magnet) {
        this.attract(collector, entity, Math.sqrt(distSq), dx, dy, dt);
      } else if (entity.attractedTo === collector) {
        entity.attractedTo = null;
      }
    }
  }

  /** Pulls an orb inward; the pull strengthens the closer it already is. */
  attract(collector, orb, distance, dx, dy, dt) {
    if (distance === 0) return;
    orb.attractedTo = collector;
    const magnet = collector.magnetRadius;
    const proximity = 1 - distance / magnet;
    const speed = this.config.magnetPullSpeed * (0.35 + 0.65 * proximity);
    orb.velocity.x = (dx / distance) * speed;
    orb.velocity.y = (dy / distance) * speed;
    // Never overshoot the collector inside a single tick.
    const step = speed * dt;
    if (step > distance) {
      orb.velocity.x = (dx / distance) * (distance / dt);
      orb.velocity.y = (dy / distance) * (distance / dt);
    }
  }

  consume(collector, orb) {
    orb.attractedTo = null;
    collector.addMass(orb.massValue);
    collector.orbsCollected = (collector.orbsCollected ?? 0) + 1;
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
