import { Entity } from './Entity.ts';
import { GameConfig } from '../config/GameConfig.ts';
import { TAU } from '../utils/MathUtils.ts';
import type { Item } from '../config/ItemPool.ts';
import type { LootConfig, Vec2 } from '../types/index.ts';

export type LootKind = 'gold' | 'soul' | 'chest';

/** What an orbiting loot magnet needs to know about the collector. */
export interface Collector {
  readonly position: Vec2;
  readonly pickupRadius: number;
  readonly alive: boolean;
}

export interface LootDropOptions {
  x?: number;
  y?: number;
  kind: LootKind;
  /** Gold pieces or soul-shard XP; ignored for chests. */
  value?: number;
  /** The equipment inside a chest. */
  item?: Item;
  config?: LootConfig;
}

const COLORS: Record<LootKind, string> = {
  gold: '#f5c451',
  soul: '#63b3ff',
  chest: '#f0883e',
};

/**
 * Something a dead enemy left on the ground: coins, a soul shard (XP) or a
 * chest holding a piece of equipment.
 *
 * Loot never collides — LootSystem consumes it — and it glitters so a drop is
 * readable against a dark floor. Unclaimed loot expires so a long run cannot
 * carpet the arena.
 */
export class LootDrop extends Entity {
  readonly kind: LootKind;
  readonly value: number;
  readonly item: Item | null;
  /** Seconds left before this drop fades out. */
  lifetime: number;
  /** Advances every tick; the renderer turns it into a pulse. */
  glitterPhase: number;
  /** Set by LootSystem while this drop is being pulled in. */
  attractedTo: Collector | null = null;

  constructor({
    x = 0,
    y = 0,
    kind,
    value = 0,
    item,
    config = GameConfig.loot,
  }: LootDropOptions) {
    const radius =
      kind === 'gold' ? config.goldRadius : kind === 'soul' ? config.soulRadius : config.chestRadius;
    super({
      type: 'loot',
      x,
      y,
      radius,
      mass: 1,
      drag: 0.08,
      collides: false,
      color: COLORS[kind],
    });
    this.kind = kind;
    this.value = value;
    this.item = item ?? null;
    this.lifetime = config.lifetime;
    // Random start so a pile of drops does not pulse in lockstep.
    this.glitterPhase = Math.random() * TAU;
  }

  /** True once the drop has expired and should be cleaned up. */
  get expired(): boolean {
    return this.lifetime <= 0;
  }

  /** Fade factor for the last second of life, 0..1. */
  get fade(): number {
    return Math.min(1, Math.max(0, this.lifetime));
  }

  override update(dt: number): void {
    this.glitterPhase += dt * 3.4;
    this.lifetime -= dt;
    if (this.attractedTo) {
      const collector = this.attractedTo;
      if (collector.alive) return; // the magnet owns the velocity this tick
      this.attractedTo = null;
    }
  }
}

export default LootDrop;
