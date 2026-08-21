import { GameConfig } from '../config/GameConfig.ts';
import type { GameSystem, ProgressionConfig } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { StatSystem } from './StatSystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * In-match XP and levelling.
 *
 * Phase 1 awards levels and emits `player:levelup`; Phase 2 hangs the 3-card
 * talent draft off that same event without touching this file. A level-up also
 * re-resolves stats, because in-match level drives how much of the metagame
 * gear counts (the item-cliff barrier in StatSystem).
 */
export class ProgressionSystem implements GameSystem<MatchContext> {
  readonly name = 'progression';
  private readonly world: World;
  private readonly config: ProgressionConfig;
  private readonly stats: StatSystem | null;
  private unsubscribe: (() => void) | null = null;

  constructor({
    world,
    config = GameConfig.progression,
    stats = null,
  }: {
    world: World;
    config?: ProgressionConfig;
    stats?: StatSystem | null;
  }) {
    this.world = world;
    this.config = config;
    this.stats = stats;
  }

  attach(): void {
    for (const player of this.world.getByType<Player>('player')) {
      if (player.xpToNext === 0) player.xpToNext = this.xpForLevel(player.level);
    }
    this.unsubscribe = this.world.events.on('orb:collected', ({ collector, xp }) => {
      this.grantXp(collector, xp);
    });
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** XP required to advance *from* `level` to the next one. */
  xpForLevel(level: number): number {
    return Math.ceil(this.config.baseXp * Math.pow(this.config.growth, level - 1));
  }

  grantXp(player: Player, amount: number): Player {
    if (amount <= 0 || player.level >= this.config.maxLevel) return player;
    player.xp += amount * player.stats.resolved.xpGain;
    if (player.xpToNext === 0) player.xpToNext = this.xpForLevel(player.level);

    // A single fat orb may carry several levels' worth of XP.
    while (player.xp >= player.xpToNext && player.level < this.config.maxLevel) {
      player.xp -= player.xpToNext;
      player.level++;
      player.xpToNext = this.xpForLevel(player.level);
      // Gear effectiveness is a function of level, so the sheet must re-resolve.
      this.stats?.recalculate(player);
      player.recalculateDerived();
      this.world.events.emit('player:levelup', { player, level: player.level });
    }
    return player;
  }

  /** Progress toward the next level, 0..1 — used by the HUD gauge. */
  getProgress(player: Pick<Player, 'xp' | 'xpToNext'>): number {
    if (player.xpToNext <= 0) return 0;
    return Math.min(1, player.xp / player.xpToNext);
  }
}

export default ProgressionSystem;
