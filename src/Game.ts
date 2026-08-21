import { GameConfig } from './config/GameConfig.ts';
import { GameEngine } from './core/GameEngine.ts';
import { EventBus } from './core/EventBus.ts';
import { World } from './core/World.ts';
import { PhysicsEngine } from './core/PhysicsEngine.ts';
import { Camera } from './core/Camera.ts';
import { InputManager } from './core/InputManager.ts';
import { Player } from './entities/Player.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { MovementSystem } from './systems/MovementSystem.ts';
import { SpawnSystem } from './systems/SpawnSystem.ts';
import { PickupSystem } from './systems/PickupSystem.ts';
import { ProgressionSystem } from './systems/ProgressionSystem.ts';
import { MassDecaySystem } from './systems/MassDecaySystem.ts';
import { StatSystem } from './systems/StatSystem.ts';
import { CameraSystem } from './systems/CameraSystem.ts';
import { CanvasRenderer } from './render/CanvasRenderer.ts';
import { HUD } from './ui/HUD.ts';
import { createRng } from './utils/MathUtils.ts';
import type { GameEventMap } from './core/GameEvents.ts';
import type { MatchContext } from './core/MatchContext.ts';
import type { Rng, Vec2 } from './types/index.ts';

export interface GameOptions {
  canvas?: HTMLCanvasElement | null;
  hudRoot?: HTMLElement | null;
  playerName?: string;
  seed?: number;
  headless?: boolean;
  config?: typeof GameConfig;
}

/**
 * Composition root: wires the modules together and owns the system order.
 *
 * Nothing else crosses layer boundaries, so a later phase adds its system here
 * without touching existing files.
 *
 * `headless: true` builds a simulation with no canvas, renderer or DOM input —
 * used by the tests and, later, by the authoritative server.
 */
export class Game {
  readonly config: typeof GameConfig;
  readonly headless: boolean;
  readonly rng: Rng;
  readonly events: EventBus<GameEventMap>;
  readonly world: World;
  readonly physics: PhysicsEngine;
  readonly camera: Camera;
  readonly player: Player;
  readonly input: InputManager;
  readonly engine: GameEngine<MatchContext>;
  readonly context: MatchContext;

  readonly statSystem: StatSystem;
  readonly spawnSystem: SpawnSystem;
  readonly pickupSystem: PickupSystem;
  readonly progressionSystem: ProgressionSystem;
  readonly massDecaySystem: MassDecaySystem;
  readonly renderer: CanvasRenderer | null = null;
  readonly hud: HUD | null = null;

  private onResize: (() => void) | null = null;
  private onVisibility: (() => void) | null = null;

  constructor({
    canvas = null,
    hudRoot = null,
    playerName = 'Player',
    seed = Date.now(),
    headless = !canvas,
    config = GameConfig,
  }: GameOptions = {}) {
    this.config = config;
    this.headless = headless;
    this.rng = createRng(seed);
    this.events = new EventBus<GameEventMap>();

    this.world = new World({
      width: config.arena.width,
      height: config.arena.height,
      cellSize: config.arena.cellSize,
      events: this.events,
    });

    this.physics = new PhysicsEngine({ bounds: this.world.bounds });
    this.camera = new Camera({ bounds: this.world.bounds, config: config.camera });

    this.player = this.world.add(
      new Player({
        x: this.world.bounds.width / 2,
        y: this.world.bounds.height / 2,
        name: playerName,
        config: config.player,
      }),
    );
    this.camera.follow(this.player);

    this.input = new InputManager();
    if (!headless && canvas) this.input.attach(canvas);

    this.engine = new GameEngine<MatchContext>({
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

    this.statSystem = new StatSystem({
      carriers: () => this.world.getByType<Player>('player'),
      gearScaling: config.gearScaling,
    });
    this.spawnSystem = new SpawnSystem({ world: this.world, rng: this.rng, config: config.orbs });
    this.pickupSystem = new PickupSystem({ world: this.world, config: config.player });
    this.progressionSystem = new ProgressionSystem({
      world: this.world,
      config: config.progression,
      stats: this.statSystem,
    });
    this.massDecaySystem = new MassDecaySystem({
      world: this.world,
      config: config.massDecay,
      startMass: config.player.startMass,
    });

    // Resolve stats once before any system runs, so the player starts complete.
    this.statSystem.recalculate(this.player);

    // Local input only exists when there is a viewport to steer with; headless
    // runs (tests, bots, authoritative server) write `moveIntent` directly.
    if (!headless) {
      this.engine.addSystem(new InputSystem({ input: this.input, camera: this.camera }));
    }

    // The tick pipeline: intent -> motion -> pickups -> decay -> xp -> stats -> view.
    this.engine
      .addSystem(new MovementSystem({ world: this.world, physics: this.physics }))
      .addSystem(this.pickupSystem)
      .addSystem(this.spawnSystem)
      .addSystem(this.massDecaySystem)
      .addSystem(this.progressionSystem)
      .addSystem(this.statSystem)
      .addSystem(new CameraSystem({ camera: this.camera }));

    if (!headless && canvas) {
      this.renderer = new CanvasRenderer({ canvas, world: this.world, camera: this.camera });
      this.engine.addSystem(this.renderer);
      if (hudRoot) {
        this.hud = new HUD({
          root: hudRoot,
          world: this.world,
          camera: this.camera,
          progression: this.progressionSystem,
          decay: this.massDecaySystem,
        });
        this.engine.addSystem(this.hud);
        const hud = this.hud;
        this.events.on('player:levelup', ({ player }) => {
          hud.setGearEffectiveness(this.statSystem.gearEffectiveness(player.level));
        });
        hud.setGearEffectiveness(this.statSystem.gearEffectiveness(this.player.level));
      }
      this.bindWindow();
    }
  }

  private bindWindow(): void {
    this.onResize = () => this.renderer?.resize();
    globalThis.addEventListener?.('resize', this.onResize);
    // Pause when the tab is hidden: rAF stops anyway, this avoids a resume jump.
    this.onVisibility = () => this.engine.setPaused(document.hidden);
    globalThis.document?.addEventListener?.('visibilitychange', this.onVisibility);
  }

  start(): this {
    this.engine.start();
    return this;
  }

  stop(): this {
    this.engine.stop();
    return this;
  }

  /** Steers the local player directly; the headless equivalent of input. */
  setMoveIntent(x: number, y: number): this {
    this.player.setMoveIntent({ x, y } satisfies Vec2);
    return this;
  }

  /** Advances the simulation by `seconds` with no render loop (tests/server). */
  simulate(seconds: number): this {
    const ticks = Math.round(seconds * this.engine.tickRate);
    for (let i = 0; i < ticks; i++) this.engine.step();
    return this;
  }

  destroy(): void {
    if (this.onResize) globalThis.removeEventListener?.('resize', this.onResize);
    if (this.onVisibility) {
      globalThis.document?.removeEventListener?.('visibilitychange', this.onVisibility);
    }
    this.input.destroy();
    this.engine.destroy();
    this.world.clear();
  }
}

export default Game;
