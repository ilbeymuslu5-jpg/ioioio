import * as V from '../utils/Vector2.ts';
import type { GameSystem, Rect, Vec2 } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Camera } from '../core/Camera.ts';
import type { Entity } from '../entities/Entity.ts';
import type { Player } from '../entities/Player.ts';
import type { FoodOrb } from '../entities/FoodOrb.ts';
import type { MatchContext } from '../core/MatchContext.ts';

export interface RenderTheme {
  background: string;
  gridLine: string;
  gridStep: number;
  wall: string;
  playerOutline: string;
  label: string;
}

export const defaultTheme: RenderTheme = {
  background: '#070b14',
  gridLine: 'rgba(120, 160, 255, 0.07)',
  gridStep: 128,
  wall: 'rgba(120, 190, 255, 0.35)',
  playerOutline: 'rgba(255, 255, 255, 0.85)',
  label: 'rgba(255, 255, 255, 0.9)',
};

/**
 * Canvas2D view layer.
 *
 * The only module that knows about pixels: it reads world state and draws it,
 * never the other way round. Swapping in PixiJS or Phaser later means
 * replacing this file alone.
 */
export class CanvasRenderer implements GameSystem<MatchContext> {
  readonly name = 'renderer';
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly world: World;
  private readonly camera: Camera;
  private readonly theme: RenderTheme;
  private readonly scratch: Vec2 = V.vec2();
  private dpr = 1;
  viewportWidth = 0;
  viewportHeight = 0;
  drawnEntities = 0;

  constructor({
    canvas,
    world,
    camera,
    theme = defaultTheme,
  }: {
    canvas: HTMLCanvasElement;
    world: World;
    camera: Camera;
    theme?: RenderTheme;
  }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.world = world;
    this.camera = camera;
    this.theme = theme;
    this.resize();
  }

  /** Matches the backing store to the CSS size and device pixel ratio. */
  resize(): this {
    const rect = this.canvas.getBoundingClientRect();
    const dpr = globalThis.devicePixelRatio || 1;
    const width = Math.max(1, Math.round((rect.width || this.canvas.width) * dpr));
    const height = Math.max(1, Math.round((rect.height || this.canvas.height) * dpr));
    if (this.canvas.width !== width || this.canvas.height !== height) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
    this.dpr = dpr;
    this.viewportWidth = width / dpr;
    this.viewportHeight = height / dpr;
    this.camera.resize(this.viewportWidth, this.viewportHeight);
    return this;
  }

  render(alpha: number): void {
    const ctx = this.ctx;
    const view = this.camera.getRenderTransform(alpha);

    ctx.setTransform(this.dpr, 0, 0, this.dpr, 0, 0);
    ctx.fillStyle = this.theme.background;
    ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    ctx.save();
    // World space: translate to the camera, then scale by zoom.
    ctx.translate(this.viewportWidth / 2, this.viewportHeight / 2);
    ctx.scale(view.zoom, view.zoom);
    ctx.translate(-view.x, -view.y);

    const halfW = this.viewportWidth / (2 * view.zoom);
    const halfH = this.viewportHeight / (2 * view.zoom);
    const visible: Rect = {
      minX: view.x - halfW,
      minY: view.y - halfH,
      maxX: view.x + halfW,
      maxY: view.y + halfH,
    };

    this.drawGrid(ctx, visible, view.zoom);
    this.drawArenaBorder(ctx, view.zoom);
    this.drawEntities(ctx, alpha, visible, view.zoom);

    ctx.restore();
  }

  private drawGrid(ctx: CanvasRenderingContext2D, visible: Rect, zoom: number): void {
    const step = this.theme.gridStep;
    ctx.beginPath();
    const startX = Math.floor(visible.minX / step) * step;
    const endX = Math.ceil(visible.maxX / step) * step;
    const startY = Math.floor(visible.minY / step) * step;
    const endY = Math.ceil(visible.maxY / step) * step;
    for (let x = startX; x <= endX; x += step) {
      ctx.moveTo(x, visible.minY);
      ctx.lineTo(x, visible.maxY);
    }
    for (let y = startY; y <= endY; y += step) {
      ctx.moveTo(visible.minX, y);
      ctx.lineTo(visible.maxX, y);
    }
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = this.theme.gridLine;
    ctx.stroke();
  }

  private drawArenaBorder(ctx: CanvasRenderingContext2D, zoom: number): void {
    ctx.lineWidth = 6 / zoom;
    ctx.strokeStyle = this.theme.wall;
    ctx.strokeRect(0, 0, this.world.bounds.width, this.world.bounds.height);
  }

  private drawEntities(
    ctx: CanvasRenderingContext2D,
    alpha: number,
    visible: Rect,
    zoom: number,
  ): void {
    this.drawnEntities = 0;
    // Orbs first so players always render on top of the food field.
    for (const orb of this.world.getByType<FoodOrb>('orb')) {
      if (!this.isVisible(orb, visible)) continue;
      const p = orb.getRenderPosition(alpha, this.scratch);
      ctx.beginPath();
      ctx.arc(p.x, p.y, orb.radius, 0, Math.PI * 2);
      ctx.fillStyle = orb.color;
      ctx.fill();
      this.drawnEntities++;
    }

    for (const player of this.world.getByType<Player>('player')) {
      if (!this.isVisible(player, visible, player.magnetRadius)) continue;
      this.drawPlayer(ctx, player, alpha, zoom);
      this.drawnEntities++;
    }
  }

  private drawPlayer(
    ctx: CanvasRenderingContext2D,
    player: Player,
    alpha: number,
    zoom: number,
  ): void {
    const p = player.getRenderPosition(alpha, this.scratch);

    // Magnet field, so the pickup radius is readable at a glance.
    ctx.beginPath();
    ctx.arc(p.x, p.y, player.magnetRadius, 0, Math.PI * 2);
    ctx.strokeStyle = 'rgba(110, 231, 255, 0.16)';
    ctx.lineWidth = 1.5 / zoom;
    ctx.stroke();

    ctx.beginPath();
    ctx.arc(p.x, p.y, player.radius, 0, Math.PI * 2);
    ctx.fillStyle = player.color;
    ctx.fill();
    ctx.lineWidth = 3 / zoom;
    ctx.strokeStyle = this.theme.playerOutline;
    ctx.stroke();

    // Facing tick: the only readout of heading while standing still.
    ctx.beginPath();
    ctx.moveTo(p.x, p.y);
    ctx.lineTo(p.x + player.facing.x * player.radius, p.y + player.facing.y * player.radius);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.35)';
    ctx.stroke();

    const fontSize = Math.max(12, player.radius * 0.45);
    ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillStyle = this.theme.label;
    ctx.fillText(player.name, p.x, p.y - player.radius - fontSize * 0.8);
  }

  private isVisible(entity: Entity, visible: Rect, extra = 0): boolean {
    const r = entity.radius + extra;
    return (
      entity.position.x + r >= visible.minX &&
      entity.position.x - r <= visible.maxX &&
      entity.position.y + r >= visible.minY &&
      entity.position.y - r <= visible.maxY
    );
  }
}

export default CanvasRenderer;
