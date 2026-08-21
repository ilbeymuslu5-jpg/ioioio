import { GameConfig } from './config/GameConfig.js';
import { GameEngine } from './core/GameEngine.js';
import { EventBus } from './core/EventBus.js';
import { World } from './core/World.js';
import { PhysicsEngine } from './core/PhysicsEngine.js';
import { Camera } from './core/Camera.js';
import { InputManager } from './core/InputManager.js';
import { Player } from './entities/Player.js';
import { InputSystem } from './systems/InputSystem.js';
import { MovementSystem } from './systems/MovementSystem.js';
import { SpawnSystem } from './systems/SpawnSystem.js';
import { PickupSystem } from './systems/PickupSystem.js';
import { ProgressionSystem } from './systems/ProgressionSystem.js';
import { CameraSystem } from './systems/CameraSystem.js';
import { CanvasRenderer } from './render/CanvasRenderer.js';
import { HUD } from './ui/HUD.js';
import { createRng } from './utils/MathUtils.js';

/**
 * Composition root: wires the modules together and owns the system order.
 * Nothing else in the codebase imports across layer boundaries, so a phase can
 * add a system here without touching existing files.
 *
 * Pass `headless: true` to build a simulation with no canvas, renderer or DOM
 * input — used by the tests and, later, by the authoritative server.
 */
export class Game {
  constructor({
    canvas = null,
    hudRoot = null,
    playerName = 'Player',
    seed = Date.now(),
    headless = !canvas,
    config = GameConfig,
  } = {}) {
    this.config = config;
    this.headless = headless;
    this.rng = createRng(seed);
    this.events = new EventBus();

    this.world = new World({
      width: config.arena.width,
      height: config.arena.height,
      cellSize: config.arena.cellSize,
      events: this.events,
    });

    this.physics = new PhysicsEngine({ bounds: this.world.bounds });
    this.camera = new Camera({ bounds: this.world.bounds, config: config.camera });

    this.player = new Player({
      x: this.world.bounds.width / 2,
      y: this.world.bounds.height / 2,
      name: playerName,
      config: config.player,
    });
    this.world.add(this.player);
    this.camera.follow(this.player);

    this.input = new InputManager();
    if (!headless) this.input.attach(canvas);

    this.engine = new GameEngine({
      tickRate: config.engine.tickRate,
      maxTicksPerFrame: config.engine.maxTicksPerFrame,
      events: this.events,
    });

    this.context = {
      world: this.world,
      player: this.player,
      camera: this.camera,
      input: this.input,
      physics: this.physics,
      events: this.events,
      config,
    };
    this.engine.setContext(this.context);

    // Order is the tick pipeline: intent -> motion -> pickups -> xp -> view.
    this.spawnSystem = new SpawnSystem({ world: this.world, rng: this.rng, config: config.orbs });
    this.pickupSystem = new PickupSystem({ world: this.world, config: config.player });
    this.progressionSystem = new ProgressionSystem({ world: this.world, config: config.progression });

    // Local input only exists when there is a viewport to steer with; a
    // headless run (tests, bots, authoritative server) writes `moveIntent`
    // straight onto the entity instead.
    if (!headless) {
      this.engine.addSystem(new InputSystem({ input: this.input, camera: this.camera }));
    }

    this.engine
      .addSystem(new MovementSystem({ world: this.world, physics: this.physics }))
      .addSystem(this.pickupSystem)
      .addSystem(this.spawnSystem)
      .addSystem(this.progressionSystem)
      .addSystem(new CameraSystem({ camera: this.camera }));

    if (!headless) {
      this.renderer = new CanvasRenderer({
        canvas,
        world: this.world,
        camera: this.camera,
      });
      this.engine.addSystem(this.renderer);
      if (hudRoot) {
        this.hud = new HUD({
          root: hudRoot,
          world: this.world,
          camera: this.camera,
          progression: this.progressionSystem,
        });
        this.engine.addSystem(this.hud);
      }
      this.#bindWindow();
    }
  }

  #bindWindow() {
    this._onResize = () => this.renderer?.resize();
    globalThis.addEventListener?.('resize', this._onResize);
    // Pause when the tab is hidden: rAF stops anyway, this avoids a resume jump.
    this._onVisibility = () => this.engine.setPaused(document.hidden);
    globalThis.document?.addEventListener?.('visibilitychange', this._onVisibility);
  }

  start() {
    this.engine.start();
    return this;
  }

  stop() {
    this.engine.stop();
    return this;
  }

  /** Steers the local player directly; the headless equivalent of input. */
  setMoveIntent(x, y) {
    this.player.setMoveIntent({ x, y });
    return this;
  }

  /** Advances the simulation by `seconds` without a render loop (tests/server). */
  simulate(seconds) {
    const ticks = Math.round(seconds * this.engine.tickRate);
    for (let i = 0; i < ticks; i++) this.engine.step();
    return this;
  }

  destroy() {
    globalThis.removeEventListener?.('resize', this._onResize);
    globalThis.document?.removeEventListener?.('visibilitychange', this._onVisibility);
    this.input.destroy();
    this.engine.destroy();
    this.world.clear();
  }
}

export default Game;
