/**
 * Bridges InputManager intent onto the local player.
 * Kept as its own system so an AI controller (Phase 5) or a network client can
 * write `moveIntent` the exact same way.
 */
export class InputSystem {
  name = 'input';

  constructor({ input, camera }) {
    this.input = input;
    this.camera = camera;
  }

  update(dt, context) {
    const player = context.player;
    if (!player?.alive) return;
    // Mouse steering is relative to the player's position on screen.
    const origin = this.camera
      ? this.camera.worldToScreen(player.position.x, player.position.y)
      : { x: 0, y: 0 };
    player.setMoveIntent(this.input.update(origin.x, origin.y));
  }
}

export default InputSystem;
