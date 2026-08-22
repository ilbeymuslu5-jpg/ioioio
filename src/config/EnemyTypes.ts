import type { Rarity } from '../types/index.ts';

/** What an enemy leaves behind when it dies. */
export interface LootTable {
  readonly gold: readonly [number, number];
  readonly soul: readonly [number, number];
  /** Chance of dropping an equipment chest, 0..1. */
  readonly chestChance: number;
  /** Rarity floor for a chest this enemy drops. */
  readonly chestFloor: Rarity;
}

export interface EnemyType {
  readonly id: string;
  readonly name: string;
  /** Draft weight when the spawn director picks what to send. */
  readonly weight: number;
  readonly radius: number;
  readonly mass: number;
  readonly maxHealth: number;
  readonly damage: number;
  readonly armor: number;
  readonly moveSpeed: number;
  readonly attackRange: number;
  /** Seconds between this enemy's attacks. */
  readonly attackInterval: number;
  /** Distance at which it notices the hero and starts chasing. */
  readonly aggroRange: number;
  readonly xp: number;
  readonly color: string;
  readonly accent: string;
  readonly loot: LootTable;
}

/**
 * The bestiary. Three silhouettes with distinct pressure:
 * goblins swarm, skeletons soak and hit hard, wolves flank fast.
 */
export const ENEMY_TYPES: readonly EnemyType[] = [
  {
    id: 'goblin',
    name: 'Goblin',
    weight: 58,
    radius: 14,
    mass: 42,
    maxHealth: 38,
    damage: 7,
    armor: 4,
    moveSpeed: 132,
    attackRange: 30,
    attackInterval: 1.1,
    aggroRange: 620,
    xp: 8,
    color: '#5b8c3a',
    accent: '#a3d977',
    loot: { gold: [2, 7], soul: [1, 2], chestChance: 0.035, chestFloor: 'common' },
  },
  {
    id: 'skeleton',
    name: 'İskelet',
    weight: 30,
    radius: 16,
    mass: 70,
    maxHealth: 96,
    damage: 12,
    armor: 22,
    moveSpeed: 96,
    attackRange: 36,
    attackInterval: 1.5,
    aggroRange: 700,
    xp: 18,
    color: '#c9c4b4',
    accent: '#f2eee2',
    loot: { gold: [5, 14], soul: [2, 4], chestChance: 0.075, chestFloor: 'common' },
  },
  {
    id: 'wolf',
    name: 'Kurt',
    weight: 12,
    radius: 15,
    mass: 55,
    maxHealth: 52,
    damage: 9,
    armor: 8,
    moveSpeed: 205,
    attackRange: 28,
    attackInterval: 0.8,
    aggroRange: 820,
    xp: 14,
    color: '#4a4a55',
    accent: '#9aa2b1',
    loot: { gold: [3, 9], soul: [2, 3], chestChance: 0.05, chestFloor: 'magic' },
  },
];

export default ENEMY_TYPES;
