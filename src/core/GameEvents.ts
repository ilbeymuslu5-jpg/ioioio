import type { Entity } from '../entities/Entity.ts';
import type { Player } from '../entities/Player.ts';
import type { FoodOrb } from '../entities/FoodOrb.ts';

/**
 * The event map every bus in the game is typed against.
 * Adding a phase means adding entries here, which makes every emit and every
 * listener type-checked against the same contract.
 */
export interface GameEventMap {
  'engine:start': { tick: number };
  'engine:stop': { tick: number };
  'engine:pause': { tick: number };
  'engine:resume': { tick: number };
  'engine:tick': { tick: number; dt: number };

  'entity:added': Entity;
  'entity:removed': Entity;
  collision: { a: Entity; b: Entity };

  'orb:collected': {
    collector: Player;
    orb: FoodOrb;
    xp: number;
    mass: number;
    tier: string;
  };

  'player:levelup': { player: Player; level: number };
  'player:damaged': { target: Entity; amount: number; mitigated: number };
  'player:died': { player: Player };
  'stats:recalculated': { player: Player };
  'mass:decayed': { player: Player; amount: number };
}
