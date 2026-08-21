import { StatSystem } from '../systems/StatSystem.ts';
import type { EngineHost, GameSystem } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Camera } from '../core/Camera.ts';
import type { Player } from '../entities/Player.ts';
import type { ProgressionSystem } from '../systems/ProgressionSystem.ts';
import type { MassDecaySystem } from '../systems/MassDecaySystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Heads-up display: level/XP gauge, health bar, mass and defensive readouts,
 * plus a minimap. Reads through the shared context and never mutates it.
 */
export class HUD implements GameSystem<MatchContext> {
  readonly name = 'hud';
  private readonly root: HTMLElement;
  private readonly world: World;
  private readonly camera: Camera;
  private readonly progression: ProgressionSystem;
  private readonly decay: MassDecaySystem | null;
  private readonly minimapSize: number;
  private readonly el: Record<string, HTMLElement> = {};
  private minimapCtx!: CanvasRenderingContext2D;
  private frameCounter = 0;

  constructor({
    root,
    world,
    camera,
    progression,
    decay = null,
    minimapSize = 148,
  }: {
    root: HTMLElement;
    world: World;
    camera: Camera;
    progression: ProgressionSystem;
    decay?: MassDecaySystem | null;
    minimapSize?: number;
  }) {
    this.root = root;
    this.world = world;
    this.camera = camera;
    this.progression = progression;
    this.decay = decay;
    this.minimapSize = minimapSize;
    this.build();
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="hud-panel hud-stats">
        <div class="hud-row hud-level"><span class="hud-badge" data-hud="level">Lv 1</span>
          <span class="hud-name" data-hud="name">Player</span></div>
        <div class="hud-bar hud-bar-xp"><div class="hud-bar-fill" data-hud="xpfill"></div>
          <span class="hud-bar-label" data-hud="xp">0 / 0 XP</span></div>
        <div class="hud-bar hud-bar-hp"><div class="hud-bar-fill" data-hud="hpfill"></div>
          <span class="hud-bar-label" data-hud="hp">100 / 100</span></div>
        <dl class="hud-grid">
          <div><dt>Kütle</dt><dd data-hud="mass">0</dd></div>
          <div><dt>Hız</dt><dd data-hud="speed">0</dd></div>
          <div><dt>Yarıçap</dt><dd data-hud="radius">0</dd></div>
          <div><dt>Zırh · azaltma</dt><dd data-hud="armor">0 · %0</dd></div>
          <div><dt>Toplanan</dt><dd data-hud="orbs">0</dd></div>
          <div><dt>Erime</dt><dd data-hud="decay">0.0/sn</dd></div>
        </dl>
      </div>
      <div class="hud-panel hud-minimap">
        <canvas data-hud="minimap" width="${this.minimapSize}" height="${this.minimapSize}"></canvas>
      </div>
      <div class="hud-panel hud-debug">
        <span data-hud="fps">-- fps</span><span data-hud="entities">0 entities</span>
        <span data-hud="gear">gear 25%</span><span data-hud="tick">tick 0</span>
      </div>
    `;
    for (const node of this.root.querySelectorAll<HTMLElement>('[data-hud]')) {
      this.el[node.dataset['hud'] as string] = node;
    }
    const minimap = this.el['minimap'] as HTMLCanvasElement;
    const ctx = minimap.getContext('2d');
    if (!ctx) throw new Error('Minimap context unavailable');
    this.minimapCtx = ctx;
  }

  render(_alpha: number, context: MatchContext, engine: EngineHost): void {
    const player = context.player;
    // Text is cheap but not free: refresh it ~10x a second, minimap every frame.
    if (++this.frameCounter % 6 === 0) this.updateText(player, engine);
    this.drawMinimap(player);
  }

  private updateText(player: Player, engine: EngineHost): void {
    const progress = this.progression.getProgress(player);
    const hpFraction = player.maxHealth > 0 ? player.health / player.maxHealth : 0;
    const mitigation = StatSystem.mitigation(player.armor);
    this.el['name']!.textContent = player.name;
    this.el['level']!.textContent = `Lv ${player.level}`;
    this.el['xp']!.textContent = `${Math.floor(player.xp)} / ${player.xpToNext} XP`;
    this.el['xpfill']!.style.width = `${(progress * 100).toFixed(1)}%`;
    this.el['hp']!.textContent = `${Math.round(player.health)} / ${Math.round(player.maxHealth)}`;
    this.el['hpfill']!.style.width = `${(hpFraction * 100).toFixed(1)}%`;
    this.el['mass']!.textContent = Math.round(player.mass).toLocaleString('tr-TR');
    this.el['speed']!.textContent = String(Math.round(player.maxSpeed));
    this.el['radius']!.textContent = String(Math.round(player.radius));
    // Armour is shown next to the damage reduction it actually buys.
    this.el['armor']!.textContent = `${Math.round(player.armor)} · %${Math.round((1 - mitigation) * 100)}`;
    this.el['orbs']!.textContent = player.orbsCollected.toLocaleString('tr-TR');
    this.el['decay']!.textContent = `${(this.decay?.decayRateFor(player.mass) ?? 0).toFixed(1)}/sn`;
    this.el['fps']!.textContent = `${Math.round(engine.fps)} fps`;
    this.el['entities']!.textContent = `${this.world.size} entities`;
    this.el['tick']!.textContent = `tick ${engine.tick}`;
  }

  /** Shows how much of the metagame gear is currently active (Phase 3 hook). */
  setGearEffectiveness(effectiveness: number): void {
    const node = this.el['gear'];
    if (node) node.textContent = `gear ${Math.round(effectiveness * 100)}%`;
  }

  private drawMinimap(player: Player): void {
    const ctx = this.minimapCtx;
    const size = this.minimapSize;
    const { width, height } = this.world.bounds;
    const scale = size / Math.max(width, height);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(120, 190, 255, 0.35)';
    ctx.strokeRect(0.5, 0.5, width * scale - 1, height * scale - 1);

    const view = this.camera.getVisibleBounds();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.25)';
    ctx.strokeRect(
      view.minX * scale,
      view.minY * scale,
      (view.maxX - view.minX) * scale,
      (view.maxY - view.minY) * scale,
    );

    ctx.fillStyle = player.color;
    ctx.beginPath();
    ctx.arc(player.position.x * scale, player.position.y * scale, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default HUD;
