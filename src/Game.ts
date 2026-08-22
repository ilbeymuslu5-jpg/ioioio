import { GameConfig } from './config/GameConfig.ts';
import { GameEngine } from './core/GameEngine.ts';
import { EventBus } from './core/EventBus.ts';
import { World } from './core/World.ts';
import { PhysicsEngine } from './core/PhysicsEngine.ts';
import { Camera } from './core/Camera.ts';
import { InputManager } from './core/InputManager.ts';
import { Player } from './entities/Player.ts';
import { StatSystem } from './systems/StatSystem.ts';
import { ItemFactory } from './systems/ItemFactory.ts';
import { InventorySystem } from './systems/InventorySystem.ts';
import { CombatSystem } from './systems/CombatSystem.ts';
import { AbilitySystem } from './systems/AbilitySystem.ts';
import { EnemyAISystem } from './systems/EnemyAISystem.ts';
import { EnemySpawnSystem } from './systems/EnemySpawnSystem.ts';
import { LootSystem } from './systems/LootSystem.ts';
import { InputSystem } from './systems/InputSystem.ts';
import { MovementSystem } from './systems/MovementSystem.ts';
import { ProgressionSystem } from './systems/ProgressionSystem.ts';
import { SkillTreeSystem } from './systems/SkillTreeSystem.ts';
import { CameraSystem } from './systems/CameraSystem.ts';
import { CanvasRenderer } from './render/CanvasRenderer.ts';
import { HUD } from './ui/HUD.ts';
import { LevelUpModal } from './ui/LevelUpModal.ts';
import { InventoryUI } from './ui/InventoryUI.ts';
import { createRng } from './utils/MathUtils.ts';
import type { GameEventMap } from './core/GameEvents.ts';
import type { MatchContext } from './core/MatchContext.ts';
import type { GameConfigShape, Rng, Vec2 } from './types/index.ts';

export interface GameOptions {
  canvas?: HTMLCanvasElement | null;
  hudRoot?: HTMLElement | null;
  modalRoot?: HTMLElement | null;
  inventoryRoot?: HTMLElement | null;
  playerName?: string;
  seed?: number;
  headless?: boolean;
  config?: GameConfigShape;
  /**
   * Headless runs have no card screen, so level-up drafts would pile up
   * unresolved. Turning this on picks for them at random — what a balance
   * simulation wants; a test that cares about the choice calls
   * `skillTreeSystem.choose()` itself instead.
   */
  autoPickTalents?: boolean;
}

/**
 * Composition root: wires the modules together and owns the system order.
 *
 * Nothing else crosses layer boundaries, so a new feature adds its system here
 * without touching existing files.
 *
 * `headless: true` builds a simulation with no canvas, renderer or DOM input —
 * used by the tests and, later, by an authoritative server.
 */
export class Game {
  readonly config: GameConfigShape;
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
  readonly itemFactory: ItemFactory;
  readonly inventorySystem: InventorySystem;
  readonly combatSystem: CombatSystem;
  readonly abilitySystem: AbilitySystem;
  readonly enemyAISystem: EnemyAISystem;
  readonly enemySpawnSystem: EnemySpawnSystem;
  readonly lootSystem: LootSystem;
  readonly progressionSystem: ProgressionSystem;
  readonly skillTreeSystem: SkillTreeSystem;
  readonly renderer: CanvasRenderer | null = null;
  readonly hud: HUD | null = null;
  readonly levelUpModal: LevelUpModal | null = null;
  readonly inventoryUI: InventoryUI | null = null;

  private onResize: (() => void) | null = null;
  private onVisibility: (() => void) | null = null;

  constructor({
    canvas = null,
    hudRoot = null,
    modalRoot = null,
    inventoryRoot = null,
    playerName = 'Kahraman',
    seed = Date.now(),
    headless = !canvas,
    config = GameConfig,
    autoPickTalents = false,
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
        config: config.hero,
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

    /* --- Systems, built before registration so they can reference each
       other (combat needs items, loot needs inventory and progression). --- */
    this.statSystem = new StatSystem({
      carriers: () => this.world.getByType<Player>('player'),
      gearScaling: config.gearScaling,
    });
    this.itemFactory = new ItemFactory({ rng: this.rng });
    this.inventorySystem = new InventorySystem({
      world: this.world,
      stats: this.statSystem,
      config: config.inventory,
    });
    this.combatSystem = new CombatSystem({
      world: this.world,
      physics: this.physics,
      items: this.itemFactory,
      rng: this.rng,
      config: config.hero,
    });
    this.abilitySystem = new AbilitySystem({
      world: this.world,
      combat: this.combatSystem,
      config: config.abilities,
    });
    this.enemyAISystem = new EnemyAISystem({ world: this.world, config: config.combat });
    this.enemySpawnSystem = new EnemySpawnSystem({
      world: this.world,
      rng: this.rng,
      config: config.spawn,
    });
    this.progressionSystem = new ProgressionSystem({
      world: this.world,
      config: config.progression,
      stats: this.statSystem,
    });
    this.skillTreeSystem = new SkillTreeSystem({
      world: this.world,
      stats: this.statSystem,
      rng: this.rng,
    });
    this.lootSystem = new LootSystem({
      world: this.world,
      inventory: this.inventorySystem,
      progression: this.progressionSystem,
      config: config.loot,
    });

    // Resolve stats once before any system runs, so the hero starts complete.
    this.statSystem.recalculate(this.player);
    this.player.health = this.player.maxHealth;

    if (autoPickTalents) {
      this.skillTreeSystem.setAutoPick((draft) => {
        const index = Math.floor(this.rng() * draft.choices.length);
        return (draft.choices[index] ?? draft.choices[0])!.talent.id;
      });
    }

    // Local input only exists when there is a viewport to steer with; headless
    // runs drive the hero through `setMoveIntent` and `combatSystem.attack`.
    if (!headless) {
      this.engine.addSystem(
        new InputSystem({
          input: this.input,
          camera: this.camera,
          combat: this.combatSystem,
          world: this.world,
        }),
      );
    }

    /* The tick pipeline. Order matters:
       AI steers, bodies move, then contacts and abilities resolve against the
       positions they actually ended up in; loot and XP settle last. */
    this.engine
      .addSystem(this.enemyAISystem)
      .addSystem(new MovementSystem({ world: this.world, physics: this.physics }))
      .addSystem(this.combatSystem)
      .addSystem(this.abilitySystem)
      .addSystem(this.enemySpawnSystem)
      .addSystem(this.lootSystem)
      .addSystem(this.progressionSystem)
      .addSystem(this.skillTreeSystem)
      .addSystem(this.statSystem)
      .addSystem(new CameraSystem({ camera: this.camera }));

    if (!headless && canvas) {
      this.renderer = new CanvasRenderer({
        canvas,
        world: this.world,
        camera: this.camera,
        abilities: this.abilitySystem,
      });
      this.engine.addSystem(this.renderer);

      if (modalRoot) {
        this.levelUpModal = new LevelUpModal({
          root: modalRoot,
          skillTree: this.skillTreeSystem,
          events: this.events,
          engine: this.engine,
        });
        this.engine.addSystem(this.levelUpModal);
      }
      if (inventoryRoot) {
        this.inventoryUI = new InventoryUI({
          root: inventoryRoot,
          inventory: this.inventorySystem,
          events: this.events,
          engine: this.engine,
          player: this.player,
        });
        this.engine.addSystem(this.inventoryUI);
      }
      if (hudRoot) {
        this.hud = new HUD({
          root: hudRoot,
          world: this.world,
          camera: this.camera,
          progression: this.progressionSystem,
          skillTree: this.skillTreeSystem,
        });
        this.engine.addSystem(this.hud);
        const hud = this.hud;
        this.events.on('talent:chosen', ({ player }) => hud.updateBuffs(player));
        hud.updateBuffs(this.player);
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

  /** Steers the hero directly; the headless equivalent of input. */
  setMoveIntent(x: number, y: number): this {
    this.player.setMoveIntent({ x, y } satisfies Vec2);
    return this;
  }

  /** Points the hero at a world position; the headless equivalent of the mouse. */
  aimAt(x: number, y: number): this {
    this.player.aimAt(x, y);
    return this;
  }

  /** Swings the sword, if the cooldown allows. */
  attack(): boolean {
    return this.combatSystem.attack(this.player).length >= 0 && this.player.isSwinging;
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
