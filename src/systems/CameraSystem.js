/**
 * Ticks the follow camera on the fixed step, so its damping is deterministic;
 * the renderer interpolates the resulting transform for smooth panning.
 */
export class CameraSystem {
  name = 'camera';

  constructor({ camera }) {
    this.camera = camera;
  }

  update(dt) {
    this.camera.update(dt);
  }
}

export default CameraSystem;
