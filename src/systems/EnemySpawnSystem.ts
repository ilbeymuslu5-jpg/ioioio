import { GameConfig } from '../config/GameConfig.ts';
import { ENEMY_TYPES } from '../config/EnemyTypes.ts';
import { EnemyMob } from '../entities/EnemyMob.ts';
import { clamp, randomRange, TAU } from '../utils/MathUtils.ts';
import type { EnemyType } from '../config/EnemyTypes.ts';
import type { GameSystem, Rng, SpawnConfig } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { MatchContext } from '../core/MatchContext.ts';

export interface EnemySpawnSystemOptions {
  world: World;
  rng?: Rng;
  config?: SpawnConfig;
  types?: readonly EnemyType[];
}

/**
 * The spawn director.
 *
 * Enemies appear on a ring around the hero — beyond the viewport so nothing
 * pops in on screen — and the population target grows with the hero's level.
 * Health and damage scale with level too, so a level 20 goblin is a real
 * threat rather than a speed bump.
 */
export class EnemySpawnSystem implements GameSystem<MatchContext> {
  readonly name = 'enemySpawn';
  private readonly world: World;
  private readonly rng: Rng;
  private readonly config: SpawnConfig;
  private readonly types: readonly EnemyType[];
  private timer = 0;

  constructor({
    world,
    rng = Math.random,
    config = GameConfig.spawn,
    types = ENEMY_TYPES,
  }: EnemySpawnSystemOptions) {
    this.world = world;
    this.rng = rng;
    this.config = config;
    this.types = types;
  }

  attach(): void {
    // Open the match with a partial field so the hero has something to fight.
    const hero = this.hero();
    if (!hero) return;
    const opening = Math.floor(this.targetPopulation(hero) * 0.6);
    for (let i = 0; i < opening; i++) this.spawnOne(hero);
  }

  /** How many live enemies the director wants at the hero's current level. */
  targetPopulation(hero: Player): number {
    const target = this.config.baseEnemyCount + (hero.level - 1) * this.config.enemiesPerLevel;
    return Math.floor(clamp(target, 0, this.config.maxEnemies));
  }

  /** Health and damage multiplier for a mob spawned now. */
  difficultyFor(hero: Player): number {
    return 1 + (hero.level - 1) * this.config.difficultyPerLevel;
  }

  spawnOne(hero: Player): EnemyMob {
    const angle = this.rng() * TAU;
    const distance = randomRange(this.config.minSpawnDistance, this.config.maxSpawnDistance, this.rng);
    const margin = 40;
    const x = clamp(hero.position.x + Math.cos(angle) * distance, margin, this.world.bounds.width - margin);
    const y = clamp(hero.position.y + Math.sin(angle) * distance, margin, this.world.bounds.height - margin);

    const enemy = new EnemyMob({
      x,
      y,
      type: EnemyMob.rollType(this.rng, this.types),
      difficulty: this.difficultyFor(hero),
    });
    // The ring sits beyond every aggro radius on purpose, so a dispatched mob
    // has to be told it is hunting or it would never move.
    enemy.hunting = true;
    this.world.add(enemy);
    this.world.events.emit('enemy:spawned', { enemy });
    return enemy;
  }

  update(dt: number): void {
    const hero = this.hero();
    if (!hero) return;

    this.timer -= dt;
    if (this.timer > 0) return;
    this.timer = this.config.spawnInterval;

    const deficit = this.targetPopulation(hero) - this.world.countOfType('enemy');
    if (deficit <= 0) return;
    // One per interval keeps pressure ramping instead of arriving in a wall.
    this.spawnOne(hero);
  }

  private hero(): Player | null {
    for (const hero of this.world.getByType<Player>('player')) {
      if (hero.alive) return hero;
    }
    return null;
  }
}

export default EnemySpawnSystem;
