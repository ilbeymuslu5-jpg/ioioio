import { GameConfig } from '../config/GameConfig.js';
import { EventBus } from './EventBus.js';

/**
 * Fixed-timestep loop manager.
 *
 * Simulation advances in constant `1 / tickRate` steps so physics stays
 * deterministic and reproducible, while rendering happens once per animation
 * frame with an interpolation `alpha` between the last two ticks.
 *
 * Both the clock and the frame scheduler are injectable, which lets tests
 * drive the engine headlessly without a browser.
 */
export class GameEngine {
  constructor({
    tickRate = GameConfig.engine.tickRate,
    maxTicksPerFrame = GameConfig.engine.maxTicksPerFrame,
    now = () => (typeof performance !== 'undefined' ? performance.now() : Date.now()),
    // Wrapped rather than passed by reference: rAF/cAF throw "Illegal
    // invocation" when called with anything but `window` as the receiver.
    scheduler = typeof requestAnimationFrame !== 'undefined'
      ? (cb) => requestAnimationFrame(cb)
      : (cb) => setTimeout(() => cb(Date.now()), 16),
    cancelScheduler = typeof cancelAnimationFrame !== 'undefined'
      ? (handle) => cancelAnimationFrame(handle)
      : (handle) => clearTimeout(handle),
    events = new EventBus(),
  } = {}) {
    this.tickRate = tickRate;
    this.fixedDelta = 1 / tickRate;
    this.maxTicksPerFrame = maxTicksPerFrame;
    this.now = now;
    this.scheduler = scheduler;
    this.cancelScheduler = cancelScheduler;
    this.events = events;

    /** @type {{name: string, update?: Function, render?: Function}[]} */
    this.systems = [];
    this.running = false;
    this.paused = false;
    this.tick = 0;
    this.elapsed = 0;
    this.accumulator = 0;
    this.alpha = 0;
    this.fps = 0;
    this.context = null;
    this._lastTime = 0;
    this._frameHandle = null;
    this._frame = this._frame.bind(this);
  }

  /** Shared object handed to every system update (world, input, config...). */
  setContext(context) {
    this.context = context;
    return this;
  }

  /**
   * Systems run in registration order. `update(dt, context)` is called on the
   * fixed step, `render(alpha, context)` once per frame, and `attach(context,
   * engine)` once on registration for setup and event subscriptions.
   */
  addSystem(system) {
    // Event-driven systems (ProgressionSystem) only implement attach().
    if (!['update', 'render', 'attach'].some((hook) => typeof system[hook] === 'function')) {
      throw new Error('A system needs an update(), render() or attach() method');
    }
    this.systems.push(system);
    system.attach?.(this.context, this);
    return this;
  }

  removeSystem(system) {
    const index = this.systems.indexOf(system);
    if (index !== -1) {
      this.systems.splice(index, 1);
      system.detach?.();
    }
    return this;
  }

  getSystem(name) {
    return this.systems.find((system) => system.name === name) ?? null;
  }

  start() {
    if (this.running) return this;
    this.running = true;
    this._lastTime = this.now();
    this.accumulator = 0;
    this.events.emit('engine:start', this);
    this._frameHandle = this.scheduler(this._frame);
    return this;
  }

  stop() {
    if (!this.running) return this;
    this.running = false;
    if (this._frameHandle !== null) this.cancelScheduler(this._frameHandle);
    this._frameHandle = null;
    this.events.emit('engine:stop', this);
    return this;
  }

  setPaused(paused) {
    if (this.paused === paused) return this;
    this.paused = paused;
    // Drop the time spent paused so the loop does not fast-forward on resume.
    this._lastTime = this.now();
    this.accumulator = 0;
    this.events.emit(paused ? 'engine:pause' : 'engine:resume', this);
    return this;
  }

  _frame() {
    if (!this.running) return;
    const time = this.now();
    let frameTime = (time - this._lastTime) / 1000;
    this._lastTime = time;
    if (!Number.isFinite(frameTime) || frameTime < 0) frameTime = 0;
    this.fps = frameTime > 0 ? 1 / frameTime : this.fps;

    this.advance(frameTime);
    this._frameHandle = this.scheduler(this._frame);
  }

  /**
   * Consumes `frameTime` seconds of real time: runs as many fixed ticks as fit
   * (bounded by `maxTicksPerFrame`), then renders once.
   */
  advance(frameTime) {
    if (!this.paused) {
      this.accumulator += frameTime;
      const maxAccumulated = this.fixedDelta * this.maxTicksPerFrame;
      // Spiral-of-death guard: discard simulation debt we can never catch up on.
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
  step(dt = this.fixedDelta) {
    this.tick++;
    this.elapsed += dt;
    for (const system of this.systems) system.update?.(dt, this.context, this);
    this.events.emit('engine:tick', this);
    return this;
  }

  renderFrame() {
    for (const system of this.systems) system.render?.(this.alpha, this.context, this);
    return this;
  }

  destroy() {
    this.stop();
    for (const system of [...this.systems]) this.removeSystem(system);
    this.events.clear();
  }
}

export default GameEngine;
