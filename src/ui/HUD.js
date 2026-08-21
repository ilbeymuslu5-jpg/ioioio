/**
 * Heads-up display: mass/level gauge, XP bar, orb counter, live stats and a
 * minimap. Reads state through the shared context and never mutates it.
 */
export class HUD {
  name = 'hud';

  constructor({ root, world, camera, progression, minimapSize = 148 }) {
    this.root = root;
    this.world = world;
    this.camera = camera;
    this.progression = progression;
    this.minimapSize = minimapSize;
    this._textAccumulator = 0;
    this.#build();
  }

  #build() {
    this.root.innerHTML = `
      <div class="hud-panel hud-stats">
        <div class="hud-row hud-level"><span class="hud-badge" data-hud="level">Lv 1</span>
          <span class="hud-name" data-hud="name">Player</span></div>
        <div class="hud-bar"><div class="hud-bar-fill" data-hud="xpfill"></div>
          <span class="hud-bar-label" data-hud="xp">0 / 0 XP</span></div>
        <dl class="hud-grid">
          <div><dt>Kütle</dt><dd data-hud="mass">0</dd></div>
          <div><dt>Hız</dt><dd data-hud="speed">0</dd></div>
          <div><dt>Toplanan</dt><dd data-hud="orbs">0</dd></div>
          <div><dt>Yarıçap</dt><dd data-hud="radius">0</dd></div>
        </dl>
      </div>
      <div class="hud-panel hud-minimap">
        <canvas data-hud="minimap" width="${this.minimapSize}" height="${this.minimapSize}"></canvas>
      </div>
      <div class="hud-panel hud-debug">
        <span data-hud="fps">-- fps</span><span data-hud="entities">0 entities</span>
        <span data-hud="tick">tick 0</span>
      </div>
    `;
    this.el = {};
    for (const node of this.root.querySelectorAll('[data-hud]')) {
      this.el[node.dataset.hud] = node;
    }
    this.minimapCtx = this.el.minimap.getContext('2d');
  }

  render(alpha, context, engine) {
    const player = context.player;
    if (!player) return;

    // Text is cheap but not free; refresh it ~10x a second, minimap every frame.
    this._textAccumulator += 1;
    if (this._textAccumulator % 6 === 0) this.#updateText(player, engine);
    this.#drawMinimap(player);
  }

  #updateText(player, engine) {
    const progress = this.progression?.getProgress(player) ?? 0;
    this.el.name.textContent = player.name;
    this.el.level.textContent = `Lv ${player.level}`;
    this.el.xp.textContent = `${Math.floor(player.xp)} / ${player.xpToNext} XP`;
    this.el.xpfill.style.width = `${(progress * 100).toFixed(1)}%`;
    this.el.mass.textContent = Math.round(player.mass).toLocaleString();
    this.el.speed.textContent = Math.round(player.maxSpeed);
    this.el.orbs.textContent = player.orbsCollected.toLocaleString();
    this.el.radius.textContent = Math.round(player.radius);
    this.el.fps.textContent = `${Math.round(engine?.fps ?? 0)} fps`;
    this.el.entities.textContent = `${this.world.size} entities`;
    this.el.tick.textContent = `tick ${engine?.tick ?? 0}`;
  }

  #drawMinimap(player) {
    const ctx = this.minimapCtx;
    const size = this.minimapSize;
    const { width, height } = this.world.bounds;
    const scale = size / Math.max(width, height);

    ctx.clearRect(0, 0, size, size);
    ctx.fillStyle = 'rgba(10, 16, 30, 0.85)';
    ctx.fillRect(0, 0, size, size);
    ctx.strokeStyle = 'rgba(120, 190, 255, 0.35)';
    ctx.strokeRect(0.5, 0.5, width * scale - 1, height * scale - 1);

    // Camera viewport rectangle.
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
