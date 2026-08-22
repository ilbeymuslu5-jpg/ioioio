import { GameConfig } from '../config/GameConfig.ts';
import { StatSystem } from './StatSystem.ts';
import { LootDrop } from '../entities/LootDrop.ts';
import { randomInt, TAU } from '../utils/MathUtils.ts';
import { distanceSq } from '../utils/Vector2.ts';
import type { GameSystem, HeroConfig, Rng } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { EnemyMob } from '../entities/EnemyMob.ts';
import type { Entity } from '../entities/Entity.ts';
import type { PhysicsEngine } from '../core/PhysicsEngine.ts';
import type { ItemFactory } from './ItemFactory.ts';
import type { MatchContext } from '../core/MatchContext.ts';

export interface CombatSystemOptions {
  world: World;
  physics: PhysicsEngine;
  items: ItemFactory;
  rng?: Rng;
  config?: HeroConfig;
}

/**
 * Everything that deals or takes damage.
 *
 * The hero's basic attack is a swept arc rather than a projectile: on a swing
 * it collects every enemy inside `attackRange` whose bearing falls within the
 * swing's half-angle, damages each once, and knocks it back. Enemy strikes are
 * resolved here too, so mitigation and invulnerability are decided in one
 * place and nothing can bypass them.
 */
export class CombatSystem implements GameSystem<MatchContext> {
  readonly name = 'combat';
  private readonly world: World;
  private readonly physics: PhysicsEngine;
  private readonly items: ItemFactory;
  private readonly rng: Rng;
  private readonly config: HeroConfig;
  private readonly candidates: Entity[] = [];

  constructor({
    world,
    physics,
    items,
    rng = Math.random,
    config = GameConfig.hero,
  }: CombatSystemOptions) {
    this.world = world;
    this.physics = physics;
    this.items = items;
    this.rng = rng;
    this.config = config;
  }

  /**
   * Starts a swing if the cooldown allows. Returns the enemies hit — the
   * hitbox resolves immediately, while the timer only drives the animation.
   */
  attack(hero: Player): EnemyMob[] {
    if (!hero.canAttack) return [];

    hero.attackCooldown = hero.attackInterval;
    hero.swingTimer = this.config.swingDuration;
    hero.swingSide *= -1;
    hero.swingDirection.x = hero.facing.x;
    hero.swingDirection.y = hero.facing.y;

    const hit = this.enemiesInArc(hero, hero.attackRange, this.config.swingHalfAngle);
    for (const enemy of hit) {
      this.damageEnemy(enemy, hero, this.config.swingKnockback);
    }
    this.world.events.emit('hero:attacked', { player: hero, hits: hit.length });
    return hit;
  }

  /**
   * Enemies inside a circular sector centred on the hero's swing direction.
   * The reach is measured to the enemy's edge, so a big skeleton is hit from
   * slightly further out than a goblin.
   */
  enemiesInArc(hero: Player, range: number, halfAngle: number): EnemyMob[] {
    const found = this.world.grid.queryCircle(
      hero.position.x,
      hero.position.y,
      range + 32,
      this.candidates,
    );
    const aimAngle = Math.atan2(hero.swingDirection.y, hero.swingDirection.x);
    const hit: EnemyMob[] = [];

    for (const entity of found) {
      if (entity.type !== 'enemy' || !entity.alive) continue;
      const enemy = entity as EnemyMob;
      const dx = enemy.position.x - hero.position.x;
      const dy = enemy.position.y - hero.position.y;
      const distance = Math.hypot(dx, dy);
      if (distance > range + enemy.radius) continue;

      // Wrap the bearing difference into [-PI, PI] before comparing.
      let delta = Math.atan2(dy, dx) - aimAngle;
      while (delta > Math.PI) delta -= TAU;
      while (delta < -Math.PI) delta += TAU;
      if (Math.abs(delta) > halfAngle) continue;

      hit.push(enemy);
    }
    return hit;
  }

  /** Applies a hero hit to an enemy: crit roll, armour, knockback, death. */
  damageEnemy(enemy: EnemyMob, hero: Player, knockback = 0, multiplier = 1): number {
    if (!enemy.alive) return 0;
    const roll = StatSystem.rollDamage(hero.stats.resolved, enemy.armor, this.rng);
    const amount = roll.amount * multiplier;

    enemy.applyDamage(amount);
    enemy.hurtFlash = 0.12;
    if (knockback > 0) this.physics.applyKnockback(enemy, hero.position, knockback);

    this.world.events.emit('enemy:damaged', {
      enemy,
      amount,
      crit: roll.crit,
      source: hero,
    });
    if (!enemy.alive) this.killEnemy(enemy, hero);
    return amount;
  }

  /** Damage from an ability rather than a swing; no knockback by default. */
  damageEnemyFlat(enemy: EnemyMob, hero: Player, amount: number, label: string): number {
    if (!enemy.alive || amount <= 0) return 0;
    const dealt = StatSystem.damageAfterArmor(amount, enemy.armor);
    enemy.applyDamage(dealt);
    enemy.hurtFlash = 0.1;
    this.world.events.emit('enemy:damaged', { enemy, amount: dealt, crit: false, source: hero });
    this.world.events.emit('ability:hit', { ability: label, enemy, amount: dealt });
    if (!enemy.alive) this.killEnemy(enemy, hero);
    return dealt;
  }

  /**
   * An enemy strike against the hero, filtered by mercy and dash immunity.
   *
   * A blow absorbed by the mercy window still costs the attacker its full
   * cooldown — that is what keeps a swarm from chain-stunning: the pack burns
   * its swings on an invulnerable target instead of stacking damage.
   */
  damageHero(hero: Player, amount: number, source: EnemyMob): number {
    if (!hero.alive || hero.isInvulnerable) return 0;
    const taken = StatSystem.damageAfterArmor(amount, hero.armor);
    hero.applyDamage(taken);
    hero.grantInvulnerability(this.config.invulnerabilityAfterHit);
    this.physics.applyKnockback(hero, source.position, 900);

    this.world.events.emit('hero:damaged', { player: hero, amount: taken, source });
    if (!hero.alive) this.world.events.emit('hero:died', { player: hero });
    return taken;
  }

  killEnemy(enemy: EnemyMob, killer: Player): void {
    enemy.state = 'dead';
    enemy.alive = false;
    killer.kills++;
    this.dropLoot(enemy, killer);
    this.world.events.emit('enemy:killed', { enemy, killer });
    this.world.remove(enemy);
  }

  /** Scatters this enemy's loot table around its corpse. */
  dropLoot(enemy: EnemyMob, killer: Player): LootDrop[] {
    const table = enemy.enemyType.loot;
    const spread = GameConfig.loot.dropSpread;
    const drops: LootDrop[] = [];

    const place = (drop: LootDrop): LootDrop => {
      const angle = this.rng() * TAU;
      const distance = this.rng() * spread;
      drop.setPosition(
        enemy.position.x + Math.cos(angle) * distance,
        enemy.position.y + Math.sin(angle) * distance,
      );
      drops.push(this.world.add(drop));
      return drop;
    };

    const gold = randomInt(table.gold[0], table.gold[1], this.rng);
    if (gold > 0) place(new LootDrop({ kind: 'gold', value: gold }));

    const souls = randomInt(table.soul[0], table.soul[1], this.rng);
    for (let i = 0; i < souls; i++) {
      place(new LootDrop({ kind: 'soul', value: enemy.xpValue }));
    }

    // Luck widens the chance of a chest as well as what is inside it.
    const luck = Math.max(0, killer.stats.resolved.luck);
    if (this.rng() < table.chestChance * (1 + luck * 0.25)) {
      const item = this.items.roll({
        itemLevel: killer.level,
        luck,
        floor: table.chestFloor,
      });
      place(new LootDrop({ kind: 'chest', item }));
    }
    return drops;
  }

  update(): void {
    // Enemy strikes: a mob in range with its clock ready lands a blow.
    for (const enemy of this.world.getByType<EnemyMob>('enemy')) {
      if (!enemy.alive || enemy.state !== 'attack' || enemy.attackCooldown > 0) continue;
      const hero = this.currentHero();
      if (!hero) continue;

      const reach = enemy.attackRange + enemy.radius + hero.radius;
      if (distanceSq(enemy.position, hero.position) > reach * reach) continue;

      enemy.attackCooldown = enemy.attackInterval;
      enemy.strikeTimer = 0.2;
      this.damageHero(hero, enemy.damage, enemy);
    }
  }

  private currentHero(): Player | null {
    for (const hero of this.world.getByType<Player>('player')) {
      if (hero.alive) return hero;
    }
    return null;
  }
}

export default CombatSystem;
