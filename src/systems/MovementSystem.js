/**
 * Advances every body one fixed tick:
 * entity behaviour -> integration -> arena bounds -> grid sync -> collisions.
 *
 * Ordering matters: the grid must be synced after positions move but before
 * the collision broad phase, or contacts get missed.
 */
export class MovementSystem {
  name = 'movement';

  constructor({ world, physics }) {
    this.world = world;
    this.physics = physics;
  }

  update(dt, context) {
    const { world, physics } = this;

    for (const entity of world.entities.values()) {
      entity.savePreviousPosition();
      entity.update(dt, context);
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
