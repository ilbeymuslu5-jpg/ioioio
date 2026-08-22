import * as V from '../utils/Vector2.ts';
import type { Vec2 } from '../types/index.ts';
import type { SpatialEntity } from '../core/SpatialGrid.ts';

let nextId = 1;

export type EntityKind = 'entity' | 'player' | 'enemy' | 'loot' | 'projectile';

export interface EntityOptions {
  id?: string;
  type?: EntityKind;
  x?: number;
  y?: number;
  radius?: number;
  mass?: number;
  health?: number;
  maxHealth?: number;
  drag?: number;
  maxSpeed?: number;
  isStatic?: boolean;
  collides?: boolean;
  color?: string;
}

/**
 * Base body for everything in the arena.
 *
 * Holds transform and physical properties only; behaviour lives in systems.
 * `previousPosition` is captured every tick so the renderer can interpolate
 * between fixed steps and stay smooth at any refresh rate.
 */
export class Entity implements SpatialEntity {
  readonly id: string;
  readonly type: EntityKind;
  readonly position: Vec2;
  readonly previousPosition: Vec2;
  readonly velocity: Vec2;
  readonly acceleration: Vec2;

  radius: number;
  mass: number;
  maxHealth: number;
  health: number;
  drag: number;
  maxSpeed: number;
  isStatic: boolean;
  collides: boolean;
  color: string;
  alive = true;

  /** Spatial-grid bookkeeping, owned by SpatialGrid. */
  _gridBounds: SpatialEntity['_gridBounds'] = null;
  _queryStamp = -1;

  constructor({
    id,
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
  }: EntityOptions = {}) {
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
  }

  /** Called by the world at the start of each tick, before integration. */
  savePreviousPosition(): this {
    this.previousPosition.x = this.position.x;
    this.previousPosition.y = this.position.y;
    return this;
  }

  /** Position for rendering, interpolated between the last two ticks. */
  getRenderPosition(alpha: number, out: Vec2 = V.vec2()): Vec2 {
    out.x = this.previousPosition.x + (this.position.x - this.previousPosition.x) * alpha;
    out.y = this.previousPosition.y + (this.position.y - this.previousPosition.y) * alpha;
    return out;
  }

  setPosition(x: number, y: number): this {
    V.set(this.position, x, y);
    V.set(this.previousPosition, x, y);
    return this;
  }

  applyForce(fx: number, fy: number): this {
    this.acceleration.x += fx / Math.max(this.mass, 0.0001);
    this.acceleration.y += fy / Math.max(this.mass, 0.0001);
    return this;
  }

  /** Direct velocity change, independent of mass. */
  applyImpulse(ix: number, iy: number): this {
    this.velocity.x += ix;
    this.velocity.y += iy;
    return this;
  }

  /**
   * Raw health subtraction. Armour mitigation lives in StatSystem, which is
   * the only place allowed to decide how much damage actually lands.
   */
  applyDamage(amount: number): this {
    if (this.maxHealth <= 0) return this;
    this.health = Math.max(0, this.health - amount);
    if (this.health === 0) this.alive = false;
    return this;
  }

  heal(amount: number): this {
    this.health = Math.min(this.maxHealth, this.health + amount);
    return this;
  }

  kill(): this {
    this.alive = false;
    return this;
  }

  /** Per-tick behaviour hook; the base body is purely physical. */
  update(_dt: number): void {
    // Overridden by subclasses.
  }
}

export default Entity;
