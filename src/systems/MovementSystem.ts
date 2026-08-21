import type { GameSystem } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { PhysicsEngine } from '../core/PhysicsEngine.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Advances every body one fixed tick:
 * behaviour -> integration -> arena bounds -> grid sync -> collisions.
 *
 * Ordering matters: the grid must be synced after positions move but before
 * the collision broad phase, or contacts get missed.
 */
export class MovementSystem implements GameSystem<MatchContext> {
  readonly name = 'movement';
  private readonly world: World;
  private readonly physics: PhysicsEngine;

  constructor({ world, physics }: { world: World; physics: PhysicsEngine }) {
    this.world = world;
    this.physics = physics;
  }

  update(dt: number): void {
    const { world, physics } = this;

    for (const entity of world.entities.values()) {
      entity.savePreviousPosition();
      entity.update(dt);
      physics.integrate(entity, dt);
      physics.constrainToBounds(entity);
    }

    world.syncGrid();

    physics.resolveCollisions(world.grid, (a, b) => {
      world.events.emit('collision', { a, b });
    });

    world.tick++;
  }
}

export default MovementSystem;
