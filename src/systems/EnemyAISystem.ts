import { GameConfig } from '../config/GameConfig.ts';
import * as V from '../utils/Vector2.ts';
import type { CombatConfig, GameSystem } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { EnemyMob } from '../entities/EnemyMob.ts';
import type { Player } from '../entities/Player.ts';
import type { Entity } from '../entities/Entity.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Steering-driven enemy behaviour with a three-state machine:
 *
 *   idle  — the mob has never noticed the hero; it holds position
 *   chase — walk toward the hero
 *   attack— close enough to strike; CombatSystem resolves the blow
 *
 * Aggro latches: once a mob has seen the hero (or was dispatched by the spawn
 * director) it keeps hunting, so a fleeing player is pursued rather than
 * shrugged off the moment they clear the aggro radius.
 *
 * On top of the seek vector, mobs push away from their neighbours so a pack
 * spreads into a crescent around the hero instead of collapsing into one
 * stacked point.
 */
export class EnemyAISystem implements GameSystem<MatchContext> {
  readonly name = 'enemyAI';
  private readonly world: World;
  private readonly config: CombatConfig;
  private readonly neighbours: Entity[] = [];

  constructor({ world, config = GameConfig.combat }: { world: World; config?: CombatConfig }) {
    this.world = world;
    this.config = config;
  }

  update(dt: number): void {
    const hero = this.hero();
    const enemies = this.world.getByType<EnemyMob>('enemy');

    for (const enemy of enemies) {
      if (!enemy.alive) continue;
      if (!hero || !hero.alive) {
        enemy.state = 'idle';
        enemy.setDesiredVelocity(0, 0, dt);
        continue;
      }

      const dx = hero.position.x - enemy.position.x;
      const dy = hero.position.y - enemy.position.y;
      const distance = Math.hypot(dx, dy) || 1;
      const strikeRange = enemy.attackRange + enemy.radius + hero.radius;

      if (distance <= enemy.aggroRange) enemy.hunting = true;

      if (distance <= strikeRange) enemy.state = 'attack';
      else if (enemy.hunting) enemy.state = 'chase';
      else enemy.state = 'idle';

      // Always face the hero once aggroed, even while standing to strike.
      if (enemy.state !== 'idle') V.set(enemy.facing, dx / distance, dy / distance);

      let steerX = 0;
      let steerY = 0;
      if (enemy.state === 'chase') {
        steerX = (dx / distance) * enemy.moveSpeed;
        steerY = (dy / distance) * enemy.moveSpeed;
      }

      const separation = this.separationFor(enemy);
      steerX += separation.x;
      steerY += separation.y;

      enemy.setDesiredVelocity(steerX, steerY, dt);
    }
  }

  /** Push away from nearby mobs, strongest when almost overlapping. */
  private separationFor(enemy: EnemyMob): { x: number; y: number } {
    const reach = enemy.radius * 2.4;
    const found = this.world.grid.queryCircle(
      enemy.position.x,
      enemy.position.y,
      reach,
      this.neighbours,
    );

    let x = 0;
    let y = 0;
    for (const other of found) {
      if (other === enemy || other.type !== 'enemy' || !other.alive) continue;
      const dx = enemy.position.x - other.position.x;
      const dy = enemy.position.y - other.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance === 0 || distance > reach) continue;
      const strength = (1 - distance / reach) * this.config.separationForce;
      x += (dx / distance) * strength;
      y += (dy / distance) * strength;
    }
    return { x, y };
  }

  private hero(): Player | null {
    for (const hero of this.world.getByType<Player>('player')) {
      if (hero.alive) return hero;
    }
    return null;
  }
}

export default EnemyAISystem;
