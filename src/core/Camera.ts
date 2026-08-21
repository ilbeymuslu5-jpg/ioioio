import { GameConfig } from '../config/GameConfig.ts';
import { clamp, damp, lerp } from '../utils/MathUtils.ts';
import type { Bounds, CameraConfig, Rect, Vec2 } from '../types/index.ts';

export interface CameraTarget {
  readonly position: Vec2;
  readonly radius: number;
}

export interface CameraTransform {
  x: number;
  y: number;
  zoom: number;
}

export interface CameraOptions {
  viewportWidth?: number;
  viewportHeight?: number;
  bounds?: Bounds;
  config?: CameraConfig;
}

/**
 * Smooth top-down follow camera.
 * Zoom backs off as the followed body grows, so a bigger player sees more of
 * the arena — the standard .io feel.
 */
export class Camera {
  readonly config: CameraConfig;
  readonly bounds: Bounds;
  viewportWidth: number;
  viewportHeight: number;
  x: number;
  y: number;
  zoom: number;
  targetZoom: number;
  target: CameraTarget | null = null;
  /** Previous tick's transform, so the view interpolates like entities do. */
  readonly previous: CameraTransform;

  constructor({
    viewportWidth = 1280,
    viewportHeight = 720,
    bounds = { width: GameConfig.arena.width, height: GameConfig.arena.height },
    config = GameConfig.camera,
  }: CameraOptions = {}) {
    this.config = config;
    this.bounds = bounds;
    this.viewportWidth = viewportWidth;
    this.viewportHeight = viewportHeight;
    this.x = bounds.width / 2;
    this.y = bounds.height / 2;
    this.zoom = config.baseZoom;
    this.targetZoom = config.baseZoom;
    this.previous = { x: this.x, y: this.y, zoom: this.zoom };
  }

  follow(entity: CameraTarget | null): this {
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

  resize(width: number, height: number): this {
    this.viewportWidth = width;
    this.viewportHeight = height;
    return this;
  }

  zoomForRadius(radius: number): number {
    const { baseZoom, referenceRadius, zoomMassExponent, minZoom, maxZoom } = this.config;
    const ratio = Math.max(radius, 1) / referenceRadius;
    return clamp(baseZoom * Math.pow(ratio, -zoomMassExponent), minZoom, maxZoom);
  }

  savePrevious(): this {
    this.previous.x = this.x;
    this.previous.y = this.y;
    this.previous.zoom = this.zoom;
    return this;
  }

  update(dt: number): this {
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

  /** Keeps the view inside the arena, centring when the arena is smaller. */
  clampToBounds(): this {
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
  getRenderTransform(alpha = 1): CameraTransform {
    return {
      x: lerp(this.previous.x, this.x, alpha),
      y: lerp(this.previous.y, this.y, alpha),
      zoom: lerp(this.previous.zoom, this.zoom, alpha),
    };
  }

  worldToScreen(worldX: number, worldY: number): Vec2 {
    return {
      x: (worldX - this.x) * this.zoom + this.viewportWidth / 2,
      y: (worldY - this.y) * this.zoom + this.viewportHeight / 2,
    };
  }

  screenToWorld(screenX: number, screenY: number): Vec2 {
    return {
      x: (screenX - this.viewportWidth / 2) / this.zoom + this.x,
      y: (screenY - this.viewportHeight / 2) / this.zoom + this.y,
    };
  }

  /** World-space rectangle currently visible; used for render culling. */
  getVisibleBounds(padding = 0): Rect {
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
