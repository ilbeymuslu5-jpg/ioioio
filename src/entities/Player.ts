import { Entity } from './Entity.ts';
import { GameConfig } from '../config/GameConfig.ts';
import { StatSheet } from '../systems/StatSystem.ts';
import type { StatCarrier } from '../systems/StatSystem.ts';
import * as V from '../utils/Vector2.ts';
import type { PlayerConfig, Vec2 } from '../types/index.ts';

export interface PlayerOptions {
  x?: number;
  y?: number;
  name?: string;
  color?: string;
  config?: PlayerConfig;
}

/**
 * Player-controlled body and the container the RPG layers plug into.
 *
 * Two derivations meet here:
 *  - the StatSheet resolves base/talent/gear/in-match modifiers (StatSystem),
 *  - mass drives radius, movement speed and magnet reach.
 *
 * `recalculateDerived()` is the single place both are combined, so Phase 2
 * (talents) and Phase 3 (gear) only add modifier groups and call it again.
 */
export class Player extends Entity implements StatCarrier {
  readonly name: string;
  readonly config: PlayerConfig;
  readonly stats: StatSheet;

  /** Move intent for this tick, magnitude 0..1, written by the input system. */
  readonly moveIntent: Vec2 = V.vec2(0, 0);
  readonly facing: Vec2 = V.vec2(1, 0);

  level = 1;
  xp = 0;
  /** In-match rogue-lite picks: talent id -> stacks. Owned by SkillTreeSystem. */
  readonly talents = new Map<string, number>();
  xpToNext = 0;
  orbsCollected = 0;
  magnetRadius = 0;
  /** Total mass lost to the snowball-decay barrier, for HUD and telemetry. */
  massDecayed = 0;

  constructor({
    x = 0,
    y = 0,
    name = 'Player',
    color = '#4ade80',
    config = GameConfig.player,
  }: PlayerOptions = {}) {
    super({
      type: 'player',
      x,
      y,
      mass: config.startMass,
      radius: config.baseRadius + Math.sqrt(config.startMass) * config.radiusMassFactor,
      maxHealth: config.baseMaxHealth,
      drag: config.drag,
      color,
    });
    this.name = name;
    this.config = config;
    this.stats = new StatSheet({
      maxHealth: config.baseMaxHealth,
      armor: config.baseArmor,
      baseSpeed: config.baseSpeed,
      magnetRadius: config.baseMagnetRadius,
      massGain: 1,
      xpGain: 1,
      damage: config.baseDamage,
      critChance: config.baseCritChance,
      critMultiplier: config.baseCritMultiplier,
      healthRegen: config.baseHealthRegen,
      luck: 0,
    });
    // Resolve once so a player is fully formed before any system touches it.
    for (const key of Object.keys(this.stats.base) as (keyof typeof this.stats.base)[]) {
      this.stats.resolved[key] = this.stats.base[key];
    }
    this.recalculateDerived();
  }

  /** Armour currently in effect; StatSystem turns this into mitigation. */
  get armor(): number {
    return this.stats.resolved.armor;
  }

  /**
   * Mass-driven scaling from the design spec:
   *
   *   Radius        = BaseRadius + sqrt(CurrentMass) * 1.2
   *   MovementSpeed = (BaseSpeed / CurrentMass ^ 0.18) * (1 + SpeedBuffs)
   *
   * `BaseSpeed` here is the already-resolved stat, so talent and gear speed
   * bonuses are the `SpeedBuffs` term of the formula.
   */
  recalculateDerived(): this {
    const cfg = this.config;
    const mass = Math.max(this.mass, 0.0001);

    this.radius = cfg.baseRadius + Math.sqrt(mass) * cfg.radiusMassFactor;
    this.maxSpeed = this.stats.resolved.baseSpeed / Math.pow(mass, cfg.speedMassExponent);
    this.magnetRadius = this.stats.resolved.magnetRadius + this.radius * cfg.magnetRadiusPerRadius;

    const resolvedMaxHealth = this.stats.resolved.maxHealth;
    if (resolvedMaxHealth !== this.maxHealth) {
      // Keep the health fraction steady when max HP changes mid-match.
      const fraction = this.maxHealth > 0 ? this.health / this.maxHealth : 1;
      this.maxHealth = resolvedMaxHealth;
      this.health = Math.min(resolvedMaxHealth, resolvedMaxHealth * fraction);
    }
    return this;
  }

  /** StatSystem calls this after resolving the sheet. */
  onStatsResolved(): void {
    this.recalculateDerived();
  }

  setMoveIntent(vector: Vec2): this {
    V.copy(this.moveIntent, vector);
    V.limitMut(this.moveIntent, 1);
    if (this.moveIntent.x !== 0 || this.moveIntent.y !== 0) {
      V.normalizeMut(V.copy(this.facing, this.moveIntent));
    }
    return this;
  }

  /** Adds mass through the `massGain` stat; negative amounts bypass it. */
  addMass(amount: number): this {
    const gain = amount > 0 ? amount * this.stats.resolved.massGain : amount;
    this.mass = Math.max(this.config.startMass * 0.25, this.mass + gain);
    this.recalculateDerived();
    return this;
  }

  /**
   * Steers toward `moveIntent * maxSpeed`. The correction is a fraction of the
   * velocity error, so a heavy player leans into turns instead of snapping —
   * the inertia the design calls for.
   */
  override update(dt: number): void {
    const desiredX = this.moveIntent.x * this.maxSpeed;
    const desiredY = this.moveIntent.y * this.maxSpeed;
    const responsiveness = Math.min(1, this.config.acceleration * dt);
    this.velocity.x += (desiredX - this.velocity.x) * responsiveness;
    this.velocity.y += (desiredY - this.velocity.y) * responsiveness;
  }
}

export default Player;
