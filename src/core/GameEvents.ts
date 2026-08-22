import type { Entity } from '../entities/Entity.ts';
import type { Player } from '../entities/Player.ts';
import type { EnemyMob } from '../entities/EnemyMob.ts';
import type { LootDrop } from '../entities/LootDrop.ts';
import type { TalentDraft } from '../systems/SkillTreeSystem.ts';
import type { TalentDefinition } from '../config/TalentPool.ts';
import type { Item } from '../config/ItemPool.ts';
import type { EquipmentSlot } from '../types/index.ts';

/**
 * The event map every bus in the game is typed against.
 * Adding a feature means adding entries here, which makes every emit and every
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

  /* --- Combat --------------------------------------------------------- */
  'hero:attacked': { player: Player; hits: number };
  'hero:dashed': { player: Player };
  'hero:damaged': { player: Player; amount: number; source: EnemyMob };
  'hero:died': { player: Player };
  'enemy:spawned': { enemy: EnemyMob };
  'enemy:damaged': { enemy: EnemyMob; amount: number; crit: boolean; source: Player };
  'enemy:killed': { enemy: EnemyMob; killer: Player };
  'ability:hit': { ability: string; enemy: EnemyMob; amount: number };
  'ability:cast': { ability: string; x: number; y: number; targetX?: number; targetY?: number };

  /* --- Loot and progression ------------------------------------------- */
  'loot:collected': { collector: Player; drop: LootDrop };
  'gold:gained': { player: Player; amount: number; total: number };
  'item:found': { player: Player; item: Item };
  'item:equipped': { player: Player; item: Item; slot: EquipmentSlot };
  'item:unequipped': { player: Player; item: Item; slot: EquipmentSlot };
  'inventory:changed': { player: Player };
  'inventory:full': { player: Player; item: Item };

  'player:levelup': { player: Player; level: number };
  'talent:offered': { player: Player; draft: TalentDraft };
  'talent:chosen': { player: Player; talent: TalentDefinition; stacks: number; draftId: number };
  'talent:cleared': { player: Player };
  'stats:recalculated': { player: Player };
}
