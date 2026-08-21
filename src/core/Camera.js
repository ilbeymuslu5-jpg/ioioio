import { GameConfig } from '../config/GameConfig.js';
import { clamp, damp, lerp } from '../utils/MathUtils.js';

/**
 * Smooth top-down follow camera.
 * Zoom backs off as the followed entity grows, so a bigger player sees more of
 * the arena — the standard .io feel.
 */
export class Camera {
  constructor({
    viewportWidth = 1280,
    viewportHeight = 720,
    bounds = { width: GameConfig.arena.width, height: GameConfig.arena.height },
    config = GameConfig.camera,
  } = {}) {
    this.config = config;
    this.bounds = bounds;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = bounds.width / 2;
    this.y = bounds.height / 2;
    this.zoom = config.baseZoom;
    this.targetZoom = config.baseZoom;
    this.target = null;
    // Previous tick's transform, so the view interpolates like the entities do.
    this.previous = { x: this.x, y: this.y, zoom: this.zoom };
  }

  follow(entity) {
    this.target = entity;
    if (entity) {
      this.x = entity.position.x;
      this.y = entity.position.y;
      this.targetZoom = this.zoomForRadius(entity.radius);
      this.zoom = this.targetZoom;
      this.savePrevious();
    }
    return this;
  }

  resize(width, height) {
    this.viewportWidth = width;
    this.viewportHeight = height;
    return this;
  }

  zoomForRadius(radius) {
    const { baseZoom, referenceRadius, zoomMassExponent, minZoom, maxZoom } = this.config;
    const ratio = Math.max(radius, 1) / referenceRadius;
    return clamp(baseZoom * Math.pow(ratio, -zoomMassExponent), minZoom, maxZoom);
  }

  savePrevious() {
    this.previous.x = this.x;
    this.previous.y = this.y;
    this.previous.zoom = this.zoom;
    return this;
  }

  update(dt) {
    this.savePrevious();
    if (this.target) {
      const { followSmoothing, zoomSmoothing } = this.config;
      this.x = damp(this.x, this.target.position.x, followSmoothing, dt);
      this.y = damp(this.y, this.target.position.y, followSmoothing, dt);
      this.targetZoom = this.zoomForRadius(this.target.radius);
      this.zoom = damp(this.zoom, this.targetZoom, zoomSmoothing, dt);
    }
    this.clampToBounds();
    return this;
  }

  /** Keeps the view inside the arena, centering when the arena is smaller. */
  clampToBounds() {
    const halfW = this.viewportWidth / (2 * this.zoom);
    const halfH = this.viewportHeight / (2 * this.zoom);
    this.x = halfW * 2 >= this.bounds.width
      ? this.bounds.width / 2
      : clamp(this.x, halfW, this.bounds.width - halfW);
    this.y = halfH * 2 >= this.bounds.height
      ? this.bounds.height / 2
      : clamp(this.y, halfH, this.bounds.height - halfH);
    return this;
  }

  /** Interpolated view transform for rendering between two fixed ticks. */
  getRenderTransform(alpha = 1) {
    return {
      x: lerp(this.previous.x, this.x, alpha),
      y: lerp(this.previous.y, this.y, alpha),
      zoom: lerp(this.previous.zoom, this.zoom, alpha),
    };
  }

  worldToScreen(worldX, worldY) {
    return {
      x: (worldX - this.x) * this.zoom + this.viewportWidth / 2,
      y: (worldY - this.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  screenToWorld(screenX, screenY) {
    return {
      x: (screenX - this.viewportWidth / 2) / this.zoom + this.x,
      y: (screenY - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  /** World-space rectangle currently visible; used for render culling. */
  getVisibleBounds(padding = 0) {
    const halfW = this.viewportWidth / (2 * this.zoom) + padding;
    const halfH = this.viewportHeight / (2 * this.zoom) + padding;
    return {
      minX: this.x - halfW,
      minY: this.y - halfH,
      maxX: this.x + halfW,
      maxY: this.y + halfH,
    };
  }
}

export default Camera;
