import type { World } from './World.ts';
import type { Camera } from './Camera.ts';
import type { PhysicsEngine } from './PhysicsEngine.ts';
import type { InputManager } from './InputManager.ts';
import type { EventBus } from './EventBus.ts';
import type { GameEventMap } from './GameEvents.ts';
import type { Player } from '../entities/Player.ts';
import type { GameConfig } from '../config/GameConfig.ts';

/**
 * The shared object every system receives on update/render.
 * One explicit contract instead of implicit reach-through, so a system's
 * dependencies are visible in its signature.
 */
export interface MatchContext {
  readonly world: World;
  readonly player: Player;
  readonly camera: Camera;
  readonly input: InputManager;
  readonly physics: PhysicsEngine;
  readonly events: EventBus<GameEventMap>;
  readonly config: typeof GameConfig;
}
