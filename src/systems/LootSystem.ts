import { GameConfig } from '../config/GameConfig.ts';
import type { GameSystem, LootConfig } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { LootDrop } from '../entities/LootDrop.ts';
import type { Entity } from '../entities/Entity.ts';
import type { InventorySystem } from './InventorySystem.ts';
import type { ProgressionSystem } from './ProgressionSystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

export interface LootSystemOptions {
  world: World;
  inventory: InventorySystem;
  progression: ProgressionSystem;
  config?: LootConfig;
}

/**
 * Picks loot up off the floor.
 *
 * Drops inside the hero's pickup radius are pulled in, and drops touching the
 * hero are consumed: gold into the purse, soul shards into XP, chests into the
 * backpack. Only cells around the hero are visited, so cost scales with the
 * number of heroes rather than the amount of loot lying around.
 */
export class LootSystem implements GameSystem<MatchContext> {
  readonly name = 'loot';
  private readonly world: World;
  private readonly inventory: InventorySystem;
  private readonly progression: ProgressionSystem;
  private readonly config: LootConfig;
  private readonly candidates: Entity[] = [];

  constructor({ world, inventory, progression, config = GameConfig.loot }: LootSystemOptions) {
    this.world = world;
    this.inventory = inventory;
    this.progression = progression;
    this.config = config;
  }

  update(dt: number): void {
    for (const hero of this.world.getByType<Player>('player')) {
      if (hero.alive) this.collectFor(hero, dt);
    }
    this.expireStaleDrops();
    this.world.flushRemovals();
  }

  collectFor(hero: Player, dt: number): void {
    const reach = Math.max(hero.pickupRadius, hero.radius);
    const found = this.world.grid.queryCircle(hero.position.x, hero.position.y, reach, this.candidates);

    for (const entity of found) {
      if (entity.type !== 'loot' || !entity.alive) continue;
      const drop = entity as LootDrop;

      const dx = hero.position.x - drop.position.x;
      const dy = hero.position.y - drop.position.y;
      const distSq = dx * dx + dy * dy;

      const grabRange = hero.radius + drop.radius;
      if (distSq <= grabRange * grabRange) {
        this.consume(hero, drop);
        continue;
      }

      const magnet = hero.pickupRadius;
      if (distSq <= magnet * magnet) {
        this.attract(hero, drop, Math.sqrt(distSq), dx, dy, dt);
      } else if (drop.attractedTo === hero) {
        drop.attractedTo = null;
      }
    }
  }

  /** Pulls a drop inward; the pull strengthens the closer it already is. */
  attract(hero: Player, drop: LootDrop, distance: number, dx: number, dy: number, dt: number): void {
    if (distance === 0) return;
    drop.attractedTo = hero;
    const proximity = 1 - distance / hero.pickupRadius;
    const speed = this.config.pickupSpeed * (0.4 + 0.6 * proximity);
    // Never overshoot the hero inside a single tick.
    const capped = Math.min(speed, distance / dt);
    drop.velocity.x = (dx / distance) * capped;
    drop.velocity.y = (dy / distance) * capped;
  }

  consume(hero: Player, drop: LootDrop): void {
    drop.attractedTo = null;

    switch (drop.kind) {
      case 'gold': {
        const amount = Math.round(drop.value * hero.stats.resolved.goldGain);
        hero.gold += amount;
        this.world.events.emit('gold:gained', { player: hero, amount, total: hero.gold });
        break;
      }
      case 'soul':
        this.progression.grantXp(hero, drop.value);
        break;
      case 'chest':
        if (drop.item) {
          this.world.events.emit('item:found', { player: hero, item: drop.item });
          this.inventory.pickUp(hero, drop.item);
        }
        break;
    }

    this.world.events.emit('loot:collected', { collector: hero, drop });
    this.world.remove(drop);
  }

  /** Unclaimed loot fades so a long run cannot carpet the arena. */
  private expireStaleDrops(): void {
    for (const drop of this.world.getByType<LootDrop>('loot')) {
      if (drop.expired) this.world.remove(drop);
    }
  }
}

export default LootSystem;
