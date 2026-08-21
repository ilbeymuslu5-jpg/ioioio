import { GameConfig } from '../config/GameConfig.js';

/**
 * In-match XP and levelling.
 *
 * Phase 1 only awards levels and emits `player:levelup`; Phase 2 hangs the
 * 3-choice talent draft off that same event without touching this file.
 */
export class ProgressionSystem {
  name = 'progression';

  constructor({ world, config = GameConfig.progression }) {
    this.world = world;
    this.config = config;
    this._unsubscribe = null;
  }

  attach(context) {
    this.context = context;
    for (const player of this.world.getByType('player')) {
      if (player.xpToNext === 0) player.xpToNext = this.xpForLevel(player.level);
    }
    this._unsubscribe = this.world.events.on('orb:collected', ({ collector, xp }) => {
      this.grantXp(collector, xp);
    });
  }

  detach() {
    this._unsubscribe?.();
    this._unsubscribe = null;
  }

  /** XP required to advance *from* `level` to the next one. */
  xpForLevel(level) {
    return Math.ceil(this.config.baseXp * Math.pow(this.config.growth, level - 1));
  }

  grantXp(player, amount) {
    if (!player || amount <= 0) return player;
    player.xp += amount * (player.modifiers?.xpGain ?? 1);
    if (player.xpToNext === 0) player.xpToNext = this.xpForLevel(player.level);

    // A single fat orb may carry several levels' worth of XP.
    while (player.xp >= player.xpToNext) {
      player.xp -= player.xpToNext;
      player.level++;
      player.xpToNext = this.xpForLevel(player.level);
      player.recalculateStats?.();
      this.world.events.emit('player:levelup', { player, level: player.level });
    }
    return player;
  }

  /** Progress toward the next level, 0..1 — used by the HUD gauge. */
  getProgress(player) {
    if (!player || player.xpToNext <= 0) return 0;
    return Math.min(1, player.xp / player.xpToNext);
  }
}

export default ProgressionSystem;
