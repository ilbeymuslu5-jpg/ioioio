import { Entity } from './Entity.ts';
import { GameConfig } from '../config/GameConfig.ts';
import { StatSheet } from '../systems/StatSystem.ts';
import type { StatCarrier } from '../systems/StatSystem.ts';
import * as V from '../utils/Vector2.ts';
import type { HeroConfig, Vec2 } from '../types/index.ts';

export interface PlayerOptions {
  x?: number;
  y?: number;
  name?: string;
  config?: HeroConfig;
}

/**
 * The hero: a fixed-size medieval warrior.
 *
 * Nothing here scales with body size — power comes from levels, talents and
 * equipment, all of which arrive through the StatSheet. The entity owns only
 * the state a swing or a dash needs: cooldowns, timers and aim.
 */
export class Player extends Entity implements StatCarrier {
  readonly name: string;
  readonly config: HeroConfig;
  readonly stats: StatSheet;

  /** Move intent for this tick, magnitude 0..1, written by the input system. */
  readonly moveIntent: Vec2 = V.vec2(0, 0);
  /** Where the hero is looking: the sword and the swing arc follow this. */
  readonly facing: Vec2 = V.vec2(1, 0);

  level = 1;
  xp = 0;
  xpToNext = 0;
  gold = 0;
  kills = 0;
  /** In-match rogue-lite picks: talent id -> stacks. Owned by SkillTreeSystem. */
  readonly talents = new Map<string, number>();

  mana: number;
  maxMana: number;

  /** Seconds until the next swing is allowed. */
  attackCooldown = 0;
  /** Counts down while a swing is live; the hitbox exists only above zero. */
  swingTimer = 0;
  /** Aim direction captured when the swing started, so the arc does not drift. */
  readonly swingDirection: Vec2 = V.vec2(1, 0);
  /** Alternates so consecutive swings arc from opposite sides. */
  swingSide = 1;

  dashCooldown = 0;
  dashTimer = 0;
  /** Damage immunity while above zero: dashes and post-hit mercy both set it. */
  invulnerable = 0;

  constructor({ x = 0, y = 0, name = 'Kahraman', config = GameConfig.hero }: PlayerOptions = {}) {
    super({
      type: 'player',
      x,
      y,
      mass: config.mass,
      radius: config.radius,
      maxHealth: config.baseMaxHealth,
      drag: config.drag,
      color: '#cbd5e1',
    });
    this.name = name;
    this.config = config;
    this.maxMana = config.baseMaxMana;
    this.mana = config.baseMaxMana;
    this.stats = new StatSheet({
      maxHealth: config.baseMaxHealth,
      healthRegen: config.baseHealthRegen,
      maxMana: config.baseMaxMana,
      manaRegen: config.baseManaRegen,
      armor: config.baseArmor,
      damage: config.baseDamage,
      attackSpeed: config.baseAttackSpeed,
      attackRange: config.baseAttackRange,
      critChance: config.baseCritChance,
      critMultiplier: config.baseCritMultiplier,
      moveSpeed: config.baseMoveSpeed,
      pickupRadius: config.basePickupRadius,
      cooldownReduction: 0,
      xpGain: 1,
      goldGain: 1,
      luck: 0,
    });
    // Resolve once so the hero is fully formed before any system touches it.
    for (const key of Object.keys(this.stats.base) as (keyof typeof this.stats.base)[]) {
      this.stats.resolved[key] = this.stats.base[key];
    }
    this.recalculateDerived();
    this.health = this.maxHealth;
  }

  get armor(): number {
    return this.stats.resolved.armor;
  }

  get attackRange(): number {
    return this.stats.resolved.attackRange;
  }

  get pickupRadius(): number {
    return this.stats.resolved.pickupRadius;
  }

  /** Seconds between swings, from attack speed and the configured floor. */
  get attackInterval(): number {
    const speed = Math.max(0.05, this.stats.resolved.attackSpeed);
    return Math.max(GameConfig.combat.minAttackInterval, 1 / speed);
  }

  get isSwinging(): boolean {
    return this.swingTimer > 0;
  }

  get isDashing(): boolean {
    return this.dashTimer > 0;
  }

  get canAttack(): boolean {
    return this.alive && this.attackCooldown <= 0;
  }

  get canDash(): boolean {
    return this.alive && this.dashCooldown <= 0 && this.mana >= this.config.dashManaCost;
  }

  /**
   * Pushes resolved stats into the entity's physical surface.
   * Movement speed is the stat itself: no mass term, no size term.
   */
  recalculateDerived(): this {
    this.maxSpeed = this.stats.resolved.moveSpeed;

    const resolvedMaxHealth = this.stats.resolved.maxHealth;
    if (resolvedMaxHealth !== this.maxHealth) {
      // Keep the health fraction steady when max HP changes mid-match.
      const fraction = this.maxHealth > 0 ? this.health / this.maxHealth : 1;
      this.maxHealth = resolvedMaxHealth;
      this.health = Math.min(resolvedMaxHealth, resolvedMaxHealth * fraction);
    }

    const resolvedMaxMana = this.stats.resolved.maxMana;
    if (resolvedMaxMana !== this.maxMana) {
      const fraction = this.maxMana > 0 ? this.mana / this.maxMana : 1;
      this.maxMana = resolvedMaxMana;
      this.mana = Math.min(resolvedMaxMana, resolvedMaxMana * fraction);
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
    return this;
  }

  /** Aim comes from the pointer, independent of where the hero is walking. */
  aimAt(worldX: number, worldY: number): this {
    const dx = worldX - this.position.x;
    const dy = worldY - this.position.y;
    if (dx !== 0 || dy !== 0) V.normalizeMut(V.set(this.facing, dx, dy));
    return this;
  }

  spendMana(amount: number): boolean {
    if (this.mana < amount) return false;
    this.mana -= amount;
    return true;
  }

  restoreMana(amount: number): this {
    this.mana = Math.min(this.maxMana, this.mana + amount);
    return this;
  }

  /** Damage immunity from dashing or from the mercy window after a hit. */
  get isInvulnerable(): boolean {
    return this.invulnerable > 0;
  }

  grantInvulnerability(seconds: number): this {
    this.invulnerable = Math.max(this.invulnerable, seconds);
    return this;
  }

  /**
   * Steers toward `moveIntent * maxSpeed`. A dash overrides steering entirely
   * so the lunge cannot be cancelled by letting go of the keys.
   */
  override update(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.swingTimer = Math.max(0, this.swingTimer - dt);
    this.dashCooldown = Math.max(0, this.dashCooldown - dt);
    this.dashTimer = Math.max(0, this.dashTimer - dt);
    this.invulnerable = Math.max(0, this.invulnerable - dt);

    if (this.isDashing) return;

    const desiredX = this.moveIntent.x * this.maxSpeed;
    const desiredY = this.moveIntent.y * this.maxSpeed;
    const responsiveness = Math.min(1, this.config.acceleration * dt);
    this.velocity.x += (desiredX - this.velocity.x) * responsiveness;
    this.velocity.y += (desiredY - this.velocity.y) * responsiveness;
  }
}

export default Player;
