import { GameConfig } from '../config/GameConfig.ts';
import { EventBus } from './EventBus.ts';
import type { GameEventMap } from './GameEvents.ts';
import type { GameSystem } from '../types/index.ts';

export type FrameScheduler = (callback: (time: number) => void) => number;
export type FrameCanceller = (handle: number) => void;

export interface GameEngineOptions<TContext> {
  tickRate?: number;
  maxTicksPerFrame?: number;
  now?: () => number;
  scheduler?: FrameScheduler;
  cancelScheduler?: FrameCanceller;
  events?: EventBus<GameEventMap>;
  context?: TContext;
}

const defaultNow = (): number =>
  typeof performance !== 'undefined' ? performance.now() : Date.now();

// Wrapped rather than passed by reference: rAF/cAF throw "Illegal invocation"
// when called with anything but `window` as the receiver.
const defaultScheduler: FrameScheduler =
  typeof requestAnimationFrame !== 'undefined'
    ? (cb) => requestAnimationFrame(cb)
    : (cb) => setTimeout(() => cb(Date.now()), 16) as unknown as number;

const defaultCanceller: FrameCanceller =
  typeof cancelAnimationFrame !== 'undefined'
    ? (handle) => cancelAnimationFrame(handle)
    : (handle) => clearTimeout(handle);

/**
 * Fixed-timestep loop manager.
 *
 * The simulation advances in constant `1 / tickRate` steps so physics stays
 * deterministic and reproducible, while rendering happens once per animation
 * frame with an interpolation `alpha` between the last two ticks.
 *
 * The clock and the frame scheduler are injectable, which lets tests — and
 * later an authoritative server — drive the engine with no browser present.
 */
export class GameEngine<TContext = unknown> {
  readonly tickRate: number;
  readonly fixedDelta: number;
  readonly maxTicksPerFrame: number;
  readonly events: EventBus<GameEventMap>;
  readonly systems: GameSystem<TContext>[] = [];

  running = false;
  paused = false;
  tick = 0;
  elapsed = 0;
  accumulator = 0;
  alpha = 0;
  fps = 0;
  context: TContext | null = null;

  private readonly now: () => number;
  private readonly scheduler: FrameScheduler;
  private readonly cancelScheduler: FrameCanceller;
  private lastTime = 0;
  private frameHandle: number | null = null;
  private readonly frame: () => void;

  constructor({
    tickRate = GameConfig.engine.tickRate,
    maxTicksPerFrame = GameConfig.engine.maxTicksPerFrame,
    now = defaultNow,
    scheduler = defaultScheduler,
    cancelScheduler = defaultCanceller,
    events = new EventBus<GameEventMap>(),
    context,
  }: GameEngineOptions<TContext> = {}) {
    this.tickRate = tickRate;
    this.fixedDelta = 1 / tickRate;
    this.maxTicksPerFrame = maxTicksPerFrame;
    this.now = now;
    this.scheduler = scheduler;
    this.cancelScheduler = cancelScheduler;
    this.events = events;
    if (context !== undefined) this.context = context;
    this.frame = () => this.onFrame();
  }

  /** The shared object handed to every system (world, input, config...). */
  setContext(context: TContext): this {
    this.context = context;
    return this;
  }

  /**
   * Systems run in registration order: `update(dt, context)` on the fixed
   * step, `render(alpha, context)` once per frame, and `attach(context,
   * engine)` once at registration for setup and event subscriptions.
   */
  addSystem(system: GameSystem<TContext>): this {
    if (!system.update && !system.render && !system.attach) {
      throw new Error(`System "${system.name}" needs update(), render() or attach()`);
    }
    this.systems.push(system);
    // attach() always fires: a system that silently skipped initialisation
    // because the context was not set yet is a trap. Callers set the context
    // before registering systems.
    system.attach?.(this.context as TContext, this);
    return this;
  }

  removeSystem(system: GameSystem<TContext>): this {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
      system.detach?.();
    }
    return this;
  }

  getSystem<T extends GameSystem<TContext>>(name: string): T | null {
    return (this.systems.find((system) => system.name === name) as T | undefined) ?? null;
  }

  start(): this {
    if (this.running) return this;
    this.running = true;
    this.lastTime = this.now();
    this.accumulator = 0;
    this.events.emit('engine:start', { tick: this.tick });
    this.frameHandle = this.scheduler(this.frame);
    return this;
  }

  stop(): this {
    if (!this.running) return this;
    this.running = false;
    if (this.frameHandle !== null) this.cancelScheduler(this.frameHandle);
    this.frameHandle = null;
    this.events.emit('engine:stop', { tick: this.tick });
    return this;
  }

  setPaused(paused: boolean): this {
    if (this.paused === paused) return this;
    this.paused = paused;
    // Drop the time spent paused so the loop does not fast-forward on resume.
    this.lastTime = this.now();
    this.accumulator = 0;
    this.events.emit(paused ? 'engine:pause' : 'engine:resume', { tick: this.tick });
    return this;
  }

  private onFrame(): void {
    if (!this.running) return;
    const time = this.now();
    let frameTime = (time - this.lastTime) / 1000;
    this.lastTime = time;
    if (!Number.isFinite(frameTime) || frameTime < 0) frameTime = 0;
    this.fps = frameTime > 0 ? 1 / frameTime : this.fps;

    this.advance(frameTime);
    this.frameHandle = this.scheduler(this.frame);
  }

  /**
   * Consumes `frameTime` seconds of real time: runs as many fixed ticks as fit
   * (bounded by `maxTicksPerFrame`), then renders once.
   */
  advance(frameTime: number): this {
    if (!this.paused) {
      this.accumulator += frameTime;
      // Spiral-of-death guard: drop simulation debt we can never catch up on.
      const maxAccumulated = this.fixedDelta * this.maxTicksPerFrame;
      if (this.accumulator > maxAccumulated) this.accumulator = maxAccumulated;

      while (this.accumulator >= this.fixedDelta) {
        this.accumulator -= this.fixedDelta;
        this.step(this.fixedDelta);
      }
      this.alpha = this.accumulator / this.fixedDelta;
    }
    this.renderFrame();
    return this;
  }

  /** Advances the simulation exactly one fixed tick. */
  step(dt: number = this.fixedDelta): this {
    this.tick++;
    this.elapsed += dt;
    const context = this.context as TContext;
    for (const system of this.systems) system.update?.(dt, context, this);
    this.events.emit('engine:tick', { tick: this.tick, dt });
    return this;
  }

  renderFrame(): this {
    const context = this.context as TContext;
    for (const system of this.systems) system.render?.(this.alpha, context, this);
    return this;
  }

  destroy(): void {
    this.stop();
    for (const system of [...this.systems]) this.removeSystem(system);
    this.events.clear();
  }
}

export default GameEngine;
