import * as V from '../utils/Vector2.ts';
import { TAU } from '../utils/MathUtils.ts';
import type { GameSystem, Rect, Vec2 } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Camera } from '../core/Camera.ts';
import type { Entity } from '../entities/Entity.ts';
import type { Player } from '../entities/Player.ts';
import type { EnemyMob } from '../entities/EnemyMob.ts';
import type { LootDrop } from '../entities/LootDrop.ts';
import type { AbilitySystem } from '../systems/AbilitySystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

export interface RenderTheme {
  floor: string;
  floorAccent: string;
  flagstone: string;
  crack: string;
  wall: string;
  vignette: string;
  label: string;
}

/** A dark stone dungeon floor lit by nothing in particular. */
export const dungeonTheme: RenderTheme = {
  floor: '#0d0c11',
  floorAccent: '#15131c',
  flagstone: 'rgba(120, 108, 150, 0.055)',
  crack: 'rgba(90, 80, 120, 0.09)',
  wall: 'rgba(190, 140, 90, 0.42)',
  vignette: 'rgba(0, 0, 0, 0.55)',
  label: 'rgba(233, 226, 214, 0.92)',
};

const FLAGSTONE = 96;

/**
 * Canvas2D view layer.
 *
 * The only module that knows about pixels: it reads world state and draws it,
 * never the other way round. Swapping in PixiJS later means replacing this
 * file alone.
 *
 * Draw order is back to front: floor, ground effects (fire, blades' trail),
 * loot, enemies, the hero, then overlays.
 */
export class CanvasRenderer implements GameSystem<MatchContext> {
  readonly name = 'renderer';
  private readonly canvas: HTMLCanvasElement;
  private readonly ctx: CanvasRenderingContext2D;
  private readonly world: World;
  private readonly camera: Camera;
  private readonly abilities: AbilitySystem | null;
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
    abilities = null,
    theme = dungeonTheme,
  }: {
    canvas: HTMLCanvasElement;
    world: World;
    camera: Camera;
    abilities?: AbilitySystem | null;
    theme?: RenderTheme;
  }) {
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas2D context unavailable');
    this.canvas = canvas;
    this.ctx = ctx;
    this.world = world;
    this.camera = camera;
    this.abilities = abilities;
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
    ctx.fillStyle = this.theme.floor;
    ctx.fillRect(0, 0, this.viewportWidth, this.viewportHeight);

    ctx.save();
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

    this.drawFloor(ctx, visible, view.zoom);
    this.drawArenaWalls(ctx, view.zoom);
    this.drawFirePatches(ctx);
    this.drawLoot(ctx, alpha, visible);
    this.drawEnemies(ctx, alpha, visible, view.zoom);
    this.drawHero(ctx, alpha, view.zoom);
    this.drawBlades(ctx);
    this.drawLightning(ctx);

    ctx.restore();
    this.drawVignette(ctx);
  }

  /* --- Ground ---------------------------------------------------------- */

  private drawFloor(ctx: CanvasRenderingContext2D, visible: Rect, zoom: number): void {
    const startX = Math.floor(visible.minX / FLAGSTONE) * FLAGSTONE;
    const endX = Math.ceil(visible.maxX / FLAGSTONE) * FLAGSTONE;
    const startY = Math.floor(visible.minY / FLAGSTONE) * FLAGSTONE;
    const endY = Math.ceil(visible.maxY / FLAGSTONE) * FLAGSTONE;

    // Alternating slabs give the floor depth without a texture asset.
    ctx.fillStyle = this.theme.floorAccent;
    for (let y = startY; y <= endY; y += FLAGSTONE) {
      for (let x = startX; x <= endX; x += FLAGSTONE) {
        const checker = (Math.floor(x / FLAGSTONE) + Math.floor(y / FLAGSTONE)) % 2 === 0;
        if (checker) ctx.fillRect(x, y, FLAGSTONE, FLAGSTONE);
      }
    }

    ctx.beginPath();
    for (let x = startX; x <= endX; x += FLAGSTONE) {
      ctx.moveTo(x, visible.minY);
      ctx.lineTo(x, visible.maxY);
    }
    for (let y = startY; y <= endY; y += FLAGSTONE) {
      ctx.moveTo(visible.minX, y);
      ctx.lineTo(visible.maxX, y);
    }
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = this.theme.flagstone;
    ctx.stroke();
  }

  private drawArenaWalls(ctx: CanvasRenderingContext2D, zoom: number): void {
    ctx.lineWidth = 8 / zoom;
    ctx.strokeStyle = this.theme.wall;
    ctx.strokeRect(0, 0, this.world.bounds.width, this.world.bounds.height);
  }

  /** Torch-lit falloff at the screen edges, drawn in screen space. */
  private drawVignette(ctx: CanvasRenderingContext2D): void {
    const w = this.viewportWidth;
    const h = this.viewportHeight;
    const gradient = ctx.createRadialGradient(
      w / 2,
      h / 2,
      Math.min(w, h) * 0.32,
      w / 2,
      h / 2,
      Math.max(w, h) * 0.72,
    );
    gradient.addColorStop(0, 'rgba(0, 0, 0, 0)');
    gradient.addColorStop(1, this.theme.vignette);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, w, h);
  }

  /* --- Ability effects -------------------------------------------------- */

  private drawFirePatches(ctx: CanvasRenderingContext2D): void {
    if (!this.abilities) return;
    for (const patch of this.abilities.firePatches) {
      const life = patch.life / patch.maxLife;
      const flicker = 0.75 + Math.sin(patch.life * 19) * 0.25;
      const gradient = ctx.createRadialGradient(patch.x, patch.y, 0, patch.x, patch.y, patch.radius);
      gradient.addColorStop(0, `rgba(255, 214, 120, ${0.5 * life * flicker})`);
      gradient.addColorStop(0.5, `rgba(240, 120, 40, ${0.36 * life})`);
      gradient.addColorStop(1, 'rgba(120, 30, 10, 0)');
      ctx.fillStyle = gradient;
      ctx.beginPath();
      ctx.arc(patch.x, patch.y, patch.radius, 0, TAU);
      ctx.fill();
    }
  }

  private drawBlades(ctx: CanvasRenderingContext2D): void {
    if (!this.abilities) return;
    for (const blade of this.abilities.blades) {
      ctx.save();
      ctx.translate(blade.x, blade.y);
      // The blade points along its orbit, like a sword held out at arm's length.
      ctx.rotate(blade.angle + Math.PI / 2);

      ctx.globalAlpha = 0.85;
      ctx.fillStyle = '#bfe4ff';
      ctx.beginPath();
      ctx.moveTo(0, -16);
      ctx.lineTo(4, 6);
      ctx.lineTo(0, 12);
      ctx.lineTo(-4, 6);
      ctx.closePath();
      ctx.fill();

      ctx.globalAlpha = 0.35;
      ctx.strokeStyle = '#7dd3fc';
      ctx.lineWidth = 3;
      ctx.stroke();
      ctx.restore();
    }
    ctx.globalAlpha = 1;
  }

  private drawLightning(ctx: CanvasRenderingContext2D): void {
    if (!this.abilities) return;
    for (const strike of this.abilities.strikes) {
      const alpha = Math.max(0, strike.life / 0.22);
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.strokeStyle = '#fff3b0';
      ctx.lineWidth = 3.5;
      ctx.shadowColor = '#ffe066';
      ctx.shadowBlur = 18;

      // A jagged bolt from above, seeded so it does not jitter between frames.
      ctx.beginPath();
      let x = strike.x + (strike.branchSeed - 0.5) * 26;
      let y = strike.y - 300;
      ctx.moveTo(x, y);
      for (let step = 0; step < 6; step++) {
        const t = (step + 1) / 6;
        x = strike.x + Math.sin((strike.branchSeed + step) * 11) * 22 * (1 - t);
        y = strike.y - 300 * (1 - t);
        ctx.lineTo(x, y);
      }
      ctx.lineTo(strike.x, strike.y);
      ctx.stroke();

      ctx.globalAlpha = alpha * 0.5;
      ctx.fillStyle = '#fff3b0';
      ctx.beginPath();
      ctx.arc(strike.x, strike.y, 26, 0, TAU);
      ctx.fill();
      ctx.restore();
    }
  }

  /* --- Entities --------------------------------------------------------- */

  private drawLoot(ctx: CanvasRenderingContext2D, alpha: number, visible: Rect): void {
    for (const drop of this.world.getByType<LootDrop>('loot')) {
      if (!this.isVisible(drop, visible)) continue;
      const p = drop.getRenderPosition(alpha, this.scratch);
      // Glitter: a slow pulse plus a soft halo, so loot reads on a dark floor.
      const pulse = 0.72 + Math.sin(drop.glitterPhase) * 0.28;
      const fade = drop.fade;

      ctx.save();
      ctx.globalAlpha = fade;
      ctx.shadowColor = drop.color;
      ctx.shadowBlur = 14 * pulse;

      if (drop.kind === 'chest') {
        ctx.fillStyle = drop.color;
        ctx.fillRect(p.x - drop.radius, p.y - drop.radius * 0.75, drop.radius * 2, drop.radius * 1.5);
        ctx.strokeStyle = '#ffd9a0';
        ctx.lineWidth = 2;
        ctx.strokeRect(p.x - drop.radius, p.y - drop.radius * 0.75, drop.radius * 2, drop.radius * 1.5);
      } else if (drop.kind === 'soul') {
        // A crystal shard: a diamond rather than a dot.
        ctx.fillStyle = drop.color;
        ctx.beginPath();
        ctx.moveTo(p.x, p.y - drop.radius * 1.3);
        ctx.lineTo(p.x + drop.radius * 0.8, p.y);
        ctx.lineTo(p.x, p.y + drop.radius * 1.3);
        ctx.lineTo(p.x - drop.radius * 0.8, p.y);
        ctx.closePath();
        ctx.fill();
      } else {
        ctx.fillStyle = drop.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, drop.radius * pulse, 0, TAU);
        ctx.fill();
      }
      ctx.restore();
    }
  }

  private drawEnemies(
    ctx: CanvasRenderingContext2D,
    alpha: number,
    visible: Rect,
    zoom: number,
  ): void {
    this.drawnEntities = 0;
    for (const enemy of this.world.getByType<EnemyMob>('enemy')) {
      if (!this.isVisible(enemy, visible)) continue;
      const p = enemy.getRenderPosition(alpha, this.scratch);
      const angle = Math.atan2(enemy.facing.y, enemy.facing.x);

      ctx.save();
      ctx.translate(p.x, p.y);

      this.drawShadow(ctx, enemy.radius);
      ctx.rotate(angle);

      // Lunge forward while striking so a blow is readable before it lands.
      if (enemy.isStriking) ctx.translate(enemy.radius * 0.35, 0);

      ctx.fillStyle = enemy.hurtFlash > 0 ? '#ffffff' : enemy.color;
      ctx.strokeStyle = enemy.accent;
      ctx.lineWidth = 2;

      switch (enemy.enemyType.id) {
        case 'goblin':
          this.drawGoblin(ctx, enemy.radius);
          break;
        case 'skeleton':
          this.drawSkeleton(ctx, enemy.radius);
          break;
        default:
          this.drawWolf(ctx, enemy.radius);
      }
      ctx.restore();

      this.drawHealthBar(ctx, p.x, p.y - enemy.radius - 9, enemy.radius * 1.9, enemy.healthFraction, zoom);
      this.drawnEntities++;
    }
  }

  /** A hunched body with a jagged crest and a crude blade. */
  private drawGoblin(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, r, r * 0.85, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath(); // ears
    ctx.moveTo(-r * 0.2, -r * 0.8);
    ctx.lineTo(-r * 0.9, -r * 1.3);
    ctx.lineTo(-r * 0.1, -r * 0.4);
    ctx.moveTo(-r * 0.2, r * 0.8);
    ctx.lineTo(-r * 0.9, r * 1.3);
    ctx.lineTo(-r * 0.1, r * 0.4);
    ctx.fill();

    ctx.strokeStyle = '#d8d2c4'; // dagger
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(r * 0.5, -r * 0.5);
    ctx.lineTo(r * 1.5, -r * 0.9);
    ctx.stroke();
  }

  /** Bone-white ribs and a raised blade. */
  private drawSkeleton(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.strokeStyle = '#6b6558';
    ctx.lineWidth = 1.6;
    ctx.beginPath();
    for (let i = -1; i <= 1; i++) {
      ctx.moveTo(-r * 0.45, i * r * 0.36);
      ctx.lineTo(r * 0.45, i * r * 0.36);
    }
    ctx.stroke();

    ctx.strokeStyle = '#cfd6e6'; // sword
    ctx.lineWidth = 3;
    ctx.beginPath();
    ctx.moveTo(r * 0.4, -r * 0.3);
    ctx.lineTo(r * 1.8, -r * 0.7);
    ctx.stroke();
  }

  /** A low, elongated body with a snout and a tail. */
  private drawWolf(ctx: CanvasRenderingContext2D, r: number): void {
    ctx.beginPath();
    ctx.ellipse(0, 0, r * 1.25, r * 0.72, 0, 0, TAU);
    ctx.fill();
    ctx.stroke();

    ctx.beginPath(); // snout
    ctx.moveTo(r * 1.1, -r * 0.22);
    ctx.lineTo(r * 1.85, 0);
    ctx.lineTo(r * 1.1, r * 0.22);
    ctx.closePath();
    ctx.fill();

    ctx.beginPath(); // tail
    ctx.moveTo(-r * 1.2, 0);
    ctx.lineTo(-r * 1.9, -r * 0.5);
    ctx.lineWidth = 3;
    ctx.stroke();
  }

  /* --- The hero --------------------------------------------------------- */

  private drawHero(ctx: CanvasRenderingContext2D, alpha: number, zoom: number): void {
    for (const hero of this.world.getByType<Player>('player')) {
      const p = hero.getRenderPosition(alpha, this.scratch);
      const angle = Math.atan2(hero.facing.y, hero.facing.x);
      const r = hero.radius;

      ctx.save();
      ctx.translate(p.x, p.y);
      this.drawShadow(ctx, r);

      if (hero.isDashing) {
        // A motion smear behind a dashing hero.
        ctx.globalAlpha = 0.28;
        ctx.fillStyle = '#9ec5ff';
        ctx.beginPath();
        ctx.arc(-hero.velocity.x * 0.02, -hero.velocity.y * 0.02, r * 1.1, 0, TAU);
        ctx.fill();
        ctx.globalAlpha = 1;
      }

      ctx.rotate(angle);
      this.drawSwingArc(ctx, hero);

      // Armoured torso.
      ctx.fillStyle = hero.isInvulnerable ? '#e2e8f0' : '#8d97ab';
      ctx.strokeStyle = '#e8edf7';
      ctx.lineWidth = 2.5;
      ctx.beginPath();
      ctx.arc(0, 0, r, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Surcoat: a wedge pointing the way the hero faces.
      ctx.fillStyle = '#a4243b';
      ctx.beginPath();
      ctx.moveTo(r * 0.85, 0);
      ctx.lineTo(-r * 0.3, -r * 0.55);
      ctx.lineTo(-r * 0.3, r * 0.55);
      ctx.closePath();
      ctx.fill();

      // Shield on the left arm.
      ctx.fillStyle = '#3f4a63';
      ctx.strokeStyle = '#cbd5e1';
      ctx.lineWidth = 2;
      ctx.beginPath();
      ctx.ellipse(r * 0.15, -r * 1.05, r * 0.42, r * 0.62, 0, 0, TAU);
      ctx.fill();
      ctx.stroke();

      // Sword in the right hand, thrust further out mid-swing.
      const thrust = hero.isSwinging ? r * 0.55 : 0;
      ctx.strokeStyle = '#dfe7f5';
      ctx.lineWidth = 4;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(r * 0.4 + thrust, r * 0.7);
      ctx.lineTo(r * 1.75 + thrust, r * 0.5);
      ctx.stroke();
      ctx.strokeStyle = '#8d6e3a'; // crossguard
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(r * 0.62 + thrust, r * 0.95);
      ctx.lineTo(r * 0.78 + thrust, r * 0.35);
      ctx.stroke();

      ctx.restore();

      const fontSize = 13;
      ctx.font = `600 ${fontSize}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillStyle = this.theme.label;
      ctx.fillText(hero.name, p.x, p.y - r - 20);
      void zoom;
    }
  }

  /** The swept crescent of a live swing, fading as the swing ends. */
  private drawSwingArc(ctx: CanvasRenderingContext2D, hero: Player): void {
    if (!hero.isSwinging) return;
    const progress = 1 - hero.swingTimer / hero.config.swingDuration;
    const half = hero.config.swingHalfAngle;
    // The arc sweeps from one edge to the other over the swing's lifetime.
    const sweepFrom = -half * hero.swingSide;
    const sweepTo = sweepFrom + 2 * half * hero.swingSide * progress;

    ctx.save();
    ctx.globalAlpha = 0.42 * (1 - progress * 0.55);
    const gradient = ctx.createRadialGradient(0, 0, hero.radius, 0, 0, hero.attackRange);
    gradient.addColorStop(0, 'rgba(255, 255, 255, 0)');
    gradient.addColorStop(1, 'rgba(226, 240, 255, 0.95)');
    ctx.fillStyle = gradient;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    ctx.arc(0, 0, hero.attackRange, Math.min(sweepFrom, sweepTo), Math.max(sweepFrom, sweepTo));
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }

  /* --- Shared bits ------------------------------------------------------ */

  private drawShadow(ctx: CanvasRenderingContext2D, radius: number): void {
    ctx.fillStyle = 'rgba(0, 0, 0, 0.42)';
    ctx.beginPath();
    ctx.ellipse(0, radius * 0.55, radius * 0.95, radius * 0.42, 0, 0, TAU);
    ctx.fill();
  }

  private drawHealthBar(
    ctx: CanvasRenderingContext2D,
    x: number,
    y: number,
    width: number,
    fraction: number,
    zoom: number,
  ): void {
    if (fraction >= 1) return; // undamaged mobs stay uncluttered
    const height = 4;
    ctx.fillStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.fillRect(x - width / 2, y, width, height);
    ctx.fillStyle = fraction > 0.5 ? '#7bd88f' : fraction > 0.25 ? '#f0c674' : '#e5484d';
    ctx.fillRect(x - width / 2, y, width * Math.max(0, fraction), height);
    ctx.lineWidth = 1 / zoom;
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.8)';
    ctx.strokeRect(x - width / 2, y, width, height);
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
