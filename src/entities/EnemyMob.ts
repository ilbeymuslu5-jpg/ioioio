import { Entity } from './Entity.ts';
import { ENEMY_TYPES } from '../config/EnemyTypes.ts';
import type { EnemyType } from '../config/EnemyTypes.ts';
import { pickWeighted } from '../utils/MathUtils.ts';
import * as V from '../utils/Vector2.ts';
import type { Rng, Vec2 } from '../types/index.ts';

/** What the mob is doing right now; drives both AI and rendering. */
export type MobState = 'idle' | 'chase' | 'attack' | 'dead';

export interface EnemyMobOptions {
  x?: number;
  y?: number;
  type: EnemyType;
  /** Scales health and damage with how far the run has progressed. */
  difficulty?: number;
}

/**
 * A hostile creature: goblin, skeleton or wolf.
 *
 * The mob owns its own combat clock and state; EnemyAISystem decides where it
 * walks and when it swings, and CombatSystem resolves the damage. Difficulty
 * scaling is baked in at spawn time rather than applied every tick.
 */
export class EnemyMob extends Entity {
  /** How fast a mob's velocity chases its steering vector (1/s). */
  static readonly STEER_RESPONSIVENESS = 7;

  readonly enemyType: EnemyType;
  readonly difficulty: number;
  readonly moveSpeed: number;
  readonly attackRange: number;
  readonly attackInterval: number;
  readonly aggroRange: number;
  readonly armor: number;
  readonly damage: number;
  readonly xpValue: number;
  readonly accent: string;

  state: MobState = 'idle';
  /**
   * Latches true once this mob is after the hero, and never clears.
   *
   * The spawn director sets it on dispatch: a mob it deliberately sent lands
   * beyond its own aggro range, and without this it would stand where it
   * spawned forever while still counting against the population cap.
   */
  hunting = false;
  /** Seconds until this mob may attack again. */
  attackCooldown = 0;
  /** Counts down while its strike animation plays. */
  strikeTimer = 0;
  /** Direction the mob is facing, for rendering. */
  readonly facing: Vec2 = V.vec2(1, 0);
  /** Brief flash after taking damage, in seconds. */
  hurtFlash = 0;

  constructor({ x = 0, y = 0, type, difficulty = 1 }: EnemyMobOptions) {
    super({
      type: 'enemy',
      x,
      y,
      radius: type.radius,
      mass: type.mass,
      maxHealth: Math.round(type.maxHealth * difficulty),
      drag: 0.02,
      color: type.color,
    });
    this.enemyType = type;
    this.difficulty = difficulty;
    this.moveSpeed = type.moveSpeed;
    this.maxSpeed = type.moveSpeed;
    this.attackRange = type.attackRange;
    this.attackInterval = type.attackInterval;
    this.aggroRange = type.aggroRange;
    this.armor = type.armor;
    this.damage = type.damage * difficulty;
    this.xpValue = type.xp;
    this.accent = type.accent;
  }

  static rollType(rng: Rng = Math.random, types: readonly EnemyType[] = ENEMY_TYPES): EnemyType {
    return pickWeighted(types, rng);
  }

  get healthFraction(): number {
    return this.maxHealth > 0 ? this.health / this.maxHealth : 0;
  }

  get isStriking(): boolean {
    return this.strikeTimer > 0;
  }

  /**
   * Eases velocity toward a desired vector, capped at this mob's speed.
   * Easing rather than assigning keeps knockback readable: a struck mob slides
   * back and has to walk in again instead of snapping to its steering vector.
   */
  setDesiredVelocity(x: number, y: number, dt: number): this {
    const length = Math.hypot(x, y);
    if (length > this.moveSpeed) {
      x = (x / length) * this.moveSpeed;
      y = (y / length) * this.moveSpeed;
    }
    const responsiveness = Math.min(1, EnemyMob.STEER_RESPONSIVENESS * dt);
    this.velocity.x += (x - this.velocity.x) * responsiveness;
    this.velocity.y += (y - this.velocity.y) * responsiveness;
    return this;
  }

  override update(dt: number): void {
    this.attackCooldown = Math.max(0, this.attackCooldown - dt);
    this.strikeTimer = Math.max(0, this.strikeTimer - dt);
    this.hurtFlash = Math.max(0, this.hurtFlash - dt);
  }
}

export default EnemyMob;
