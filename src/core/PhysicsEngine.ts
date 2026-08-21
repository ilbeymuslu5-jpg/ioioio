import { GameConfig } from '../config/GameConfig.ts';
import * as V from '../utils/Vector2.ts';
import type { Bounds, Vec2 } from '../types/index.ts';

/** Anything that can enumerate candidate contact pairs — the grid, in practice. */
export interface PairSource<T> {
  forEachPair(visit: (a: T, b: T) => void): void;
}

/** The physical surface PhysicsEngine operates on. */
export interface PhysicsBody {
  readonly id: string;
  readonly position: Vec2;
  readonly velocity: Vec2;
  readonly acceleration: Vec2;
  radius: number;
  mass: number;
  drag: number;
  maxSpeed: number;
  isStatic: boolean;
  collides: boolean;
  alive: boolean;
}

export interface PhysicsEngineOptions {
  bounds?: Bounds;
  wallRestitution?: number;
}

/**
 * Circle physics with mass dynamics.
 *
 * Responsibilities:
 *  - integrate velocity/position with inertia (exponential drag),
 *  - keep bodies inside the arena,
 *  - resolve circle/circle overlap fed by the spatial-grid broad phase,
 *  - expose knockback, so combat (Phase 2+) shares one impulse model.
 */
export class PhysicsEngine {
  readonly bounds: Bounds;
  readonly wallRestitution: number;

  constructor({
    bounds = { width: GameConfig.arena.width, height: GameConfig.arena.height },
    wallRestitution = GameConfig.arena.wallRestitution,
  }: PhysicsEngineOptions = {}) {
    this.bounds = bounds;
    this.wallRestitution = wallRestitution;
  }

  /**
   * Semi-implicit Euler integration.
   * Drag is applied as `retained ^ dt`, so inertia is frame-rate independent.
   */
  integrate<T extends PhysicsBody>(entity: T, dt: number): T {
    if (entity.isStatic) return entity;
    const { velocity, position } = entity;

    V.addMut(velocity, entity.acceleration, dt);
    V.set(entity.acceleration, 0, 0);

    if (entity.drag > 0 && entity.drag < 1) {
      V.scaleMut(velocity, Math.pow(entity.drag, dt));
    }
    if (entity.maxSpeed > 0) V.limitMut(velocity, entity.maxSpeed);

    position.x += velocity.x * dt;
    position.y += velocity.y * dt;
    return entity;
  }

  /** Clamps a body inside the arena and bounces its perpendicular velocity. */
  constrainToBounds(entity: PhysicsBody): boolean {
    const r = entity.radius;
    const { position, velocity } = entity;
    let hit = false;

    if (position.x - r < 0) {
      position.x = r;
      if (velocity.x < 0) velocity.x = -velocity.x * this.wallRestitution;
      hit = true;
    } else if (position.x + r > this.bounds.width) {
      position.x = this.bounds.width - r;
      if (velocity.x > 0) velocity.x = -velocity.x * this.wallRestitution;
      hit = true;
    }

    if (position.y - r < 0) {
      position.y = r;
      if (velocity.y < 0) velocity.y = -velocity.y * this.wallRestitution;
      hit = true;
    } else if (position.y + r > this.bounds.height) {
      position.y = this.bounds.height - r;
      if (velocity.y > 0) velocity.y = -velocity.y * this.wallRestitution;
      hit = true;
    }

    return hit;
  }

  /** Exact circle overlap test; returns penetration depth or 0. */
  static overlapDepth(a: PhysicsBody, b: PhysicsBody): number {
    const sum = a.radius + b.radius;
    const distSq = V.distanceSq(a.position, b.position);
    if (distSq >= sum * sum) return 0;
    return sum - Math.sqrt(distSq);
  }

  /**
   * Pushes two overlapping bodies apart weighted by mass, then exchanges an
   * elastic impulse along the contact normal.
   */
  resolveCollision(a: PhysicsBody, b: PhysicsBody, restitution = 0.35): boolean {
    const depth = PhysicsEngine.overlapDepth(a, b);
    if (depth <= 0) return false;

    let nx = b.position.x - a.position.x;
    let ny = b.position.y - a.position.y;
    let dist = Math.hypot(nx, ny);
    if (dist === 0) {
      // Perfectly stacked bodies: pick an arbitrary but stable normal.
      nx = 1;
      ny = 0;
      dist = 1;
    } else {
      nx /= dist;
      ny /= dist;
    }

    const invMassA = a.isStatic ? 0 : 1 / Math.max(a.mass, 0.0001);
    const invMassB = b.isStatic ? 0 : 1 / Math.max(b.mass, 0.0001);
    const invMassSum = invMassA + invMassB;
    if (invMassSum === 0) return false;

    // Positional correction: the lighter body moves further.
    const correction = depth / invMassSum;
    a.position.x -= nx * correction * invMassA;
    a.position.y -= ny * correction * invMassA;
    b.position.x += nx * correction * invMassB;
    b.position.y += ny * correction * invMassB;

    const relVx = b.velocity.x - a.velocity.x;
    const relVy = b.velocity.y - a.velocity.y;
    const separating = relVx * nx + relVy * ny;
    if (separating > 0) return true; // already moving apart

    const impulse = (-(1 + restitution) * separating) / invMassSum;
    a.velocity.x -= nx * impulse * invMassA;
    a.velocity.y -= ny * impulse * invMassA;
    b.velocity.x += nx * impulse * invMassB;
    b.velocity.y += ny * impulse * invMassB;
    return true;
  }

  /**
   * Knockback impulse applied to `target`, directed away from `origin`.
   * Heavier bodies move less — the knockback-resistance rule from the spec.
   */
  applyKnockback<T extends PhysicsBody>(target: T, origin: Vec2, force: number): T {
    if (target.isStatic) return target;
    let dx = target.position.x - origin.x;
    let dy = target.position.y - origin.y;
    const dist = Math.hypot(dx, dy);
    if (dist === 0) {
      dx = 1;
      dy = 0;
    } else {
      dx /= dist;
      dy /= dist;
    }
    const scale = force / Math.max(target.mass, 0.0001);
    target.velocity.x += dx * scale;
    target.velocity.y += dy * scale;
    return target;
  }

  /**
   * Broad phase over the grid plus narrow-phase resolution.
   * Bodies opt out with `collides = false` (orbs use the pickup path instead).
   */
  resolveCollisions<T extends PhysicsBody>(
    pairs: PairSource<T>,
    onCollide?: (a: T, b: T) => void,
  ): number {
    let resolved = 0;
    pairs.forEachPair((a, b) => {
      if (!a.collides || !b.collides) return;
      if (!a.alive || !b.alive) return;
      if (this.resolveCollision(a, b)) {
        resolved++;
        onCollide?.(a, b);
      }
    });
    return resolved;
  }
}

export default PhysicsEngine;
