import { StatSystem } from '../systems/StatSystem.ts';
import type { EngineHost, GameSystem } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Camera } from '../core/Camera.ts';
import type { Player } from '../entities/Player.ts';
import type { EnemyMob } from '../entities/EnemyMob.ts';
import type { ProgressionSystem } from '../systems/ProgressionSystem.ts';
import type { SkillTreeSystem } from '../systems/SkillTreeSystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Classic action-RPG heads-up display: a health orb, a mana bar, an XP track
 * along the bottom, active talent icons and a minimap with enemy blips.
 *
 * Reads through the shared context and never mutates it.
 */
export class HUD implements GameSystem<MatchContext> {
  readonly name = 'hud';
  private readonly root: HTMLElement;
  private readonly world: World;
  private readonly camera: Camera;
  private readonly progression: ProgressionSystem;
  private readonly skillTree: SkillTreeSystem | null;
  private readonly minimapSize: number;
  private readonly el: Record<string, HTMLElement> = {};
  private minimapCtx!: CanvasRenderingContext2D;
  private frameCounter = 0;

  constructor({
    root,
    world,
    camera,
    progression,
    skillTree = null,
    minimapSize = 148,
  }: {
    root: HTMLElement;
    world: World;
    camera: Camera;
    progression: ProgressionSystem;
    skillTree?: SkillTreeSystem | null;
    minimapSize?: number;
  }) {
    this.root = root;
    this.world = world;
    this.camera = camera;
    this.progression = progression;
    this.skillTree = skillTree;
    this.minimapSize = minimapSize;
    this.build();
  }

  private build(): void {
    this.root.innerHTML = `
      <div class="hud-orb-wrap">
        <div class="hud-orb">
          <div class="hud-orb-fill" data-hud="hpfill"></div>
          <span class="hud-orb-value" data-hud="hp">0</span>
        </div>
        <div class="hud-mana">
          <div class="hud-mana-fill" data-hud="manafill"></div>
          <span class="hud-mana-label" data-hud="mana">0 / 0</span>
        </div>
      </div>

      <div class="hud-top">
        <div class="hud-panel hud-vitals">
          <span class="hud-badge" data-hud="level">Sv 1</span>
          <span class="hud-name" data-hud="name">Kahraman</span>
          <dl class="hud-grid">
            <div><dt>Hasar</dt><dd data-hud="damage">0</dd></div>
            <div><dt>Zırh · azaltma</dt><dd data-hud="armor">0 · %0</dd></div>
            <div><dt>Saldırı hızı</dt><dd data-hud="aspd">0.0/sn</dd></div>
            <div><dt>Kritik</dt><dd data-hud="crit">%0</dd></div>
            <div><dt>Altın</dt><dd data-hud="gold">0</dd></div>
            <div><dt>Öldürülen</dt><dd data-hud="kills">0</dd></div>
          </dl>
        </div>
        <div class="hud-panel hud-buffs" data-hud="buffs" hidden></div>
      </div>

      <div class="hud-panel hud-minimap">
        <canvas data-hud="minimap" width="${this.minimapSize}" height="${this.minimapSize}"></canvas>
      </div>

      <div class="hud-xp">
        <div class="hud-xp-fill" data-hud="xpfill"></div>
        <span class="hud-xp-label" data-hud="xp">0 / 0 XP</span>
      </div>

      <div class="hud-panel hud-debug">
        <span data-hud="fps">-- fps</span><span data-hud="enemies">0 düşman</span>
        <span data-hud="dash">Atılma hazır</span><span data-hud="tick">tick 0</span>
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

  /** Redraws the active-talent strip. Called on pick, not every frame. */
  updateBuffs(player: Player): void {
    const node = this.el['buffs'];
    if (!node || !this.skillTree) return;
    const owned = this.skillTree.activeTalents(player);
    node.hidden = owned.length === 0;
    node.innerHTML = owned
      .map(
        ({ talent, stacks }) => `<span class="buff buff-${talent.rarity}" title="${talent.description}">
            ${talent.name}${stacks > 1 ? ` <b>×${stacks}</b>` : ''}
          </span>`,
      )
      .join('');
  }

  render(_alpha: number, context: MatchContext, engine: EngineHost): void {
    const hero = context.player;
    // Bars follow every frame; text is refreshed ~10x a second.
    this.updateBars(hero);
    if (++this.frameCounter % 6 === 0) this.updateText(hero, engine);
    this.drawMinimap(hero);
  }

  private updateBars(hero: Player): void {
    const hp = hero.maxHealth > 0 ? hero.health / hero.maxHealth : 0;
    const mana = hero.maxMana > 0 ? hero.mana / hero.maxMana : 0;
    const xp = this.progression.getProgress(hero);

    // The orb fills bottom-up, so its height is the health fraction.
    this.el['hpfill']!.style.height = `${(hp * 100).toFixed(1)}%`;
    this.el['manafill']!.style.width = `${(mana * 100).toFixed(1)}%`;
    this.el['xpfill']!.style.width = `${(xp * 100).toFixed(1)}%`;
  }

  private updateText(hero: Player, engine: EngineHost): void {
    const stats = hero.stats.resolved;
    const mitigation = StatSystem.mitigation(hero.armor);

    this.el['name']!.textContent = hero.name;
    this.el['level']!.textContent = `Sv ${hero.level}`;
    this.el['hp']!.textContent = `${Math.ceil(hero.health)}`;
    this.el['mana']!.textContent = `${Math.floor(hero.mana)} / ${Math.round(hero.maxMana)}`;
    this.el['xp']!.textContent = `${Math.floor(hero.xp)} / ${hero.xpToNext} XP`;
    this.el['damage']!.textContent = String(Math.round(stats.damage));
    this.el['armor']!.textContent = `${Math.round(hero.armor)} · %${Math.round((1 - mitigation) * 100)}`;
    this.el['aspd']!.textContent = `${(1 / hero.attackInterval).toFixed(2)}/sn`;
    this.el['crit']!.textContent = `%${Math.round(stats.critChance * 100)}`;
    this.el['gold']!.textContent = hero.gold.toLocaleString('tr-TR');
    this.el['kills']!.textContent = hero.kills.toLocaleString('tr-TR');
    this.el['fps']!.textContent = `${Math.round(engine.fps)} fps`;
    this.el['enemies']!.textContent = `${this.world.countOfType('enemy')} düşman`;
    this.el['dash']!.textContent =
      hero.dashCooldown > 0 ? `Atılma ${hero.dashCooldown.toFixed(1)}sn` : 'Atılma hazır';
    this.el['tick']!.textContent = `tick ${engine.tick}`;
  }

  private drawMinimap(hero: Player): void {
    const ctx = this.minimapCtx;
    const size = this.minimapSize;
    const { width, height } = this.world.bounds;
    const scale = size / Math.max(width, height);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(14, 12, 18, 0.9)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(190, 140, 90, 0.4)';
    ctx.strokeRect(0.5, 0.5, width * scale - 1, height * scale - 1);

    const view = this.camera.getVisibleBounds();
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)';
    ctx.strokeRect(
      view.minX * scale,
      view.minY * scale,
      (view.maxX - view.minX) * scale,
      (view.maxY - view.minY) * scale,
    );

    // Enemy blips: the minimap's job is telling you where the pressure is.
    ctx.fillStyle = '#e5484d';
    for (const enemy of this.world.getByType<EnemyMob>('enemy')) {
      ctx.fillRect(enemy.position.x * scale - 1, enemy.position.y * scale - 1, 2.5, 2.5);
    }

    ctx.fillStyle = '#e8edf7';
    ctx.beginPath();
    ctx.arc(hero.position.x * scale, hero.position.y * scale, 3.2, 0, Math.PI * 2);
    ctx.fill();
  }
}

export default HUD;
