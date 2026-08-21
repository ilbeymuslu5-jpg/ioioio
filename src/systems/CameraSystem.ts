import type { GameSystem } from '../types/index.ts';
import type { Camera } from '../core/Camera.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Ticks the follow camera on the fixed step so its damping is deterministic;
 * the renderer interpolates the resulting transform for smooth panning.
 */
export class CameraSystem implements GameSystem<MatchContext> {
  readonly name = 'camera';
  private readonly camera: Camera;

  constructor({ camera }: { camera: Camera }) {
    this.camera = camera;
  }

  update(dt: number): void {
    this.camera.update(dt);
  }
}

export default CameraSystem;
