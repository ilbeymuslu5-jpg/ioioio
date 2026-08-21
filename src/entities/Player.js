import { Entity } from './Entity.js';
import { GameConfig } from '../config/GameConfig.js';
import * as V from '../utils/Vector2.js';

/**
 * Player-controlled body.
 *
 * Mass is the central stat: radius, top speed, magnet radius and knockback
 * resistance are all derived from it in `recalculateStats()`. That method is
 * also the single hook later phases plug into — talents (Phase 2) and gear
 * (Phase 3) write into `modifiers`, then call it again.
 */
export class Player extends Entity {
  constructor({
    x = 0,
    y = 0,
    name = 'Player',
    color = '#4ade80',
    config = GameConfig.player,
  } = {}) {
    super({
      type: 'player',
      x,
      y,
      mass: config.startMass,
      radius: config.radiusScale * Math.sqrt(config.startMass),
      maxHealth: config.maxHealth,
      drag: config.drag,
      color,
    });
    this.name = name;
    this.config = config;

    /** Multiplicative buffs owned by later systems; 1 = no change. */
    this.modifiers = {
      speed: 1,
      magnetRadius: 1,
      massGain: 1,
      xpGain: 1,
    };

    this.level = 1;
    this.xp = 0;
    this.xpToNext = 0;
    this.orbsCollected = 0;
    /** Move intent for this tick, magnitude 0..1, written by the input system. */
    this.moveIntent = V.vec2(0, 0);
    this.facing = V.vec2(1, 0);

    this.magnetRadius = 0;
    this.recalculateStats();
  }

  /** Derives every mass-dependent stat. Call after any mass/modifier change. */
  recalculateStats() {
    const cfg = this.config;
    this.radius = cfg.radiusScale * Math.sqrt(this.mass);

    const massRatio = cfg.startMass / Math.max(this.mass, 0.0001);
    const speedFactor = Math.max(
      Math.pow(massRatio, cfg.speedMassExponent),
      cfg.minSpeedFactor,
    );
    this.maxSpeed = cfg.baseSpeed * speedFactor * this.modifiers.speed;

    this.magnetRadius =
      (cfg.baseMagnetRadius + this.radius * cfg.magnetRadiusPerRadius) *
      this.modifiers.magnetRadius;
    return this;
  }

  setMoveIntent(vector) {
    V.copy(this.moveIntent, vector);
    V.limitMut(this.moveIntent, 1);
    if (this.moveIntent.x !== 0 || this.moveIntent.y !== 0) {
      V.copy(this.facing, V.normalize(this.moveIntent));
    }
    return this;
  }

  addMass(amount) {
    this.mass = Math.max(this.config.startMass * 0.25, this.mass + amount * this.modifiers.massGain);
    this.recalculateStats();
    return this;
  }

  /**
   * Steers toward `moveIntent * maxSpeed`. Because the correction is a
   * fraction of the velocity error, a heavy player leans into turns instead of
   * changing direction instantly — that is the "inertia" the design asks for.
   */
  update(dt) {
    const desiredX = this.moveIntent.x * this.maxSpeed;
    const desiredY = this.moveIntent.y * this.maxSpeed;
    const responsiveness = Math.min(1, this.config.acceleration * dt);
    this.velocity.x += (desiredX - this.velocity.x) * responsiveness;
    this.velocity.y += (desiredY - this.velocity.y) * responsiveness;
  }
}

export default Player;
