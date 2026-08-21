import * as V from '../utils/Vector2.js';

let nextId = 1;

/**
 * Base body for everything in the arena.
 *
 * Holds only transform + physical properties; behaviour lives in systems.
 * `previousPosition` is captured every tick so the renderer can interpolate
 * between fixed steps and stay smooth at any refresh rate.
 */
export class Entity {
  constructor({
    id = null,
    type = 'entity',
    x = 0,
    y = 0,
    radius = 10,
    mass = 1,
    health = 0,
    maxHealth = 0,
    drag = 0.02,
    maxSpeed = 0,
    isStatic = false,
    collides = true,
    color = '#ffffff',
  } = {}) {
    this.id = id ?? `${type}-${nextId++}`;
    this.type = type;
    this.position = V.vec2(x, y);
    this.previousPosition = V.vec2(x, y);
    this.velocity = V.vec2(0, 0);
    this.acceleration = V.vec2(0, 0);
    this.radius = radius;
    this.mass = mass;
    this.maxHealth = maxHealth || health;
    this.health = health || this.maxHealth;
    this.drag = drag;
    this.maxSpeed = maxSpeed;
    this.isStatic = isStatic;
    this.collides = collides;
    this.color = color;
    this.alive = true;

    /** Spatial-grid bookkeeping, owned by SpatialGrid. */
    this._gridBounds = null;
    this._queryStamp = -1;
  }

  /** Called by the world at the start of each tick, before integration. */
  savePreviousPosition() {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
    return this;
  }

  /** Position for rendering, interpolated between the last two ticks. */
  getRenderPosition(alpha, out = V.vec2()) {
    out.x = this.previousPosition.x + (this.position.x - this.previousPosition.x) * alpha;
    out.y = this.previousPosition.y + (this.position.y - this.previousPosition.y) * alpha;
    return out;
  }

  setPosition(x, y) {
    V.set(this.position, x, y);
    V.set(this.previousPosition, x, y);
    return this;
  }

  applyForce(fx, fy) {
    this.acceleration.x += fx / Math.max(this.mass, 0.0001);
    this.acceleration.y += fy / Math.max(this.mass, 0.0001);
    return this;
  }

  /** Direct velocity change, independent of mass. */
  applyImpulse(ix, iy) {
    this.velocity.x += ix;
    this.velocity.y += iy;
    return this;
  }

  damage(amount) {
    if (this.maxHealth <= 0) return this;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) this.alive = false;
    return this;
  }

  heal(amount) {
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this;
  }

  kill() {
    this.alive = false;
    return this;
  }

  update() {
    // Overridden by subclasses; the base body is purely physical.
  }
}

export default Entity;
