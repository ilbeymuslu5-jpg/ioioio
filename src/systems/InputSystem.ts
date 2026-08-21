import type { GameSystem } from '../types/index.ts';
import type { InputManager } from '../core/InputManager.ts';
import type { Camera } from '../core/Camera.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Bridges InputManager intent onto the local player.
 * Its own system so a bot controller (Phase 5) or a network client can write
 * `moveIntent` through exactly the same seam.
 */
export class InputSystem implements GameSystem<MatchContext> {
  readonly name = 'input';
  private readonly input: InputManager;
  private readonly camera: Camera | null;

  constructor({ input, camera = null }: { input: InputManager; camera?: Camera | null }) {
    this.input = input;
    this.camera = camera;
  }

  update(_dt: number, context: MatchContext): void {
    const player = context.player;
    if (!player.alive) return;
    // Mouse steering is relative to the player's position on screen.
    const origin = this.camera
      ? this.camera.worldToScreen(player.position.x, player.position.y)
      : { x: 0, y: 0 };
    player.setMoveIntent(this.input.update(origin.x, origin.y));
  }
}

export default InputSystem;
