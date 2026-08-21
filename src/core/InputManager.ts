import * as V from '../utils/Vector2.ts';
import { clamp } from '../utils/MathUtils.ts';
import type { Vec2 } from '../types/index.ts';

export type InputAction = 'primary' | 'secondary' | 'dash';

export interface InputManagerOptions {
  element?: HTMLElement | null;
  /** Pointer distance (px) inside which no movement is requested. */
  pointerDeadZone?: number;
  /** Pointer distance (px) at which movement reaches full speed. */
  pointerFullRange?: number;
}

interface Binding {
  target: EventTarget;
  type: string;
  handler: EventListener;
  options?: AddEventListenerOptions;
}

/**
 * Normalises mouse, touch and keyboard into one uniform intent:
 *
 *   move: { x, y }   // direction vector, magnitude 0..1
 *
 * Pointer and joystick input is analogue (distance from the anchor scales the
 * magnitude); keyboard input is digital and always full throttle. Gameplay
 * code never touches DOM events directly.
 */
export class InputManager {
  static readonly KEY_VECTORS: Readonly<Record<string, Vec2>> = {
    KeyW: { x: 0, y: -1 },
    ArrowUp: { x: 0, y: -1 },
    KeyS: { x: 0, y: 1 },
    ArrowDown: { x: 0, y: 1 },
    KeyA: { x: -1, y: 0 },
    ArrowLeft: { x: -1, y: 0 },
    KeyD: { x: 1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  element: HTMLElement | null;
  readonly pointerDeadZone: number;
  readonly pointerFullRange: number;
  readonly move: Vec2 = V.vec2(0, 0);
  readonly pointer: Vec2 = V.vec2(0, 0);
  readonly keys = new Set<string>();
  readonly actions = new Set<InputAction>();
  pointerActive = false;
  /** Touch drags steer relative to where the finger went down. */
  joystickAnchor: Vec2 | null = null;
  enabled = true;
  private readonly bindings: Binding[] = [];

  constructor({
    element = null,
    pointerDeadZone = 12,
    pointerFullRange = 180,
  }: InputManagerOptions = {}) {
    this.element = element;
    this.pointerDeadZone = pointerDeadZone;
    this.pointerFullRange = pointerFullRange;
  }

  /** Attaches DOM listeners. Skipped entirely in headless runs. */
  attach(element: HTMLElement | null = this.element): this {
    if (!element) return this;
    this.detach();
    this.element = element;
    const win: EventTarget = element.ownerDocument?.defaultView ?? globalThis;

    this.listen(element, 'mousemove', (e) => {
      const event = e as MouseEvent;
      this.onPointerMove(event.clientX, event.clientY);
    });
    this.listen(element, 'mouseenter', () => { this.pointerActive = true; });
    this.listen(element, 'mouseleave', () => { this.pointerActive = false; });
    this.listen(element, 'mousedown', () => this.actions.add('primary'));
    this.listen(win, 'mouseup', () => this.actions.delete('primary'));

    this.listen(element, 'touchstart', (e) => {
      const event = e as TouchEvent;
      event.preventDefault();
      const touch = event.changedTouches[0];
      if (!touch) return;
      this.joystickAnchor = V.vec2(touch.clientX, touch.clientY);
      this.onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.listen(element, 'touchmove', (e) => {
      const event = e as TouchEvent;
      event.preventDefault();
      const touch = event.changedTouches[0];
      if (touch) this.onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    const endTouch = (): void => {
      this.joystickAnchor = null;
      this.pointerActive = false;
    };
    this.listen(element, 'touchend', endTouch);
    this.listen(element, 'touchcancel', endTouch);

    this.listen(win, 'keydown', (e) => {
      const event = e as KeyboardEvent;
      if (event.repeat) return;
      this.keys.add(event.code);
      if (event.code === 'Space') this.actions.add('dash');
    });
    this.listen(win, 'keyup', (e) => {
      const event = e as KeyboardEvent;
      this.keys.delete(event.code);
      if (event.code === 'Space') this.actions.delete('dash');
    });
    // Losing focus must not leave a key stuck down.
    this.listen(win, 'blur', () => this.reset());
    return this;
  }

  private listen(
    target: EventTarget,
    type: string,
    handler: EventListener,
    options?: AddEventListenerOptions,
  ): void {
    target.addEventListener(type, handler, options);
    this.bindings.push(options ? { target, type, handler, options } : { target, type, handler });
  }

  detach(): this {
    for (const { target, type, handler, options } of this.bindings) {
      target.removeEventListener(type, handler, options);
    }
    this.bindings.length = 0;
    return this;
  }

  private onPointerMove(clientX: number, clientY: number): void {
    const rect = this.element?.getBoundingClientRect?.();
    V.set(this.pointer, clientX - (rect?.left ?? 0), clientY - (rect?.top ?? 0));
    this.pointerActive = true;
  }

  /**
   * Resolves this frame's move vector. Keyboard wins while pressed, otherwise
   * the pointer steers from `originX/originY` (the player's screen position).
   */
  update(originX = 0, originY = 0): Vec2 {
    if (!this.enabled) return V.set(this.move, 0, 0);

    let kx = 0;
    let ky = 0;
    for (const code of this.keys) {
      const vector = InputManager.KEY_VECTORS[code];
      if (!vector) continue;
      kx += vector.x;
      ky += vector.y;
    }

    if (kx !== 0 || ky !== 0) {
      V.set(this.move, kx, ky);
      return V.normalizeMut(this.move);
    }

    if (!this.pointerActive) return V.set(this.move, 0, 0);

    const anchorX = this.joystickAnchor ? this.joystickAnchor.x : originX;
    const anchorY = this.joystickAnchor ? this.joystickAnchor.y : originY;
    const dx = this.pointer.x - anchorX;
    const dy = this.pointer.y - anchorY;
    const distance = Math.hypot(dx, dy);
    if (distance <= this.pointerDeadZone) return V.set(this.move, 0, 0);

    const magnitude = clamp(
      (distance - this.pointerDeadZone) / (this.pointerFullRange - this.pointerDeadZone),
      0,
      1,
    );
    return V.set(this.move, (dx / distance) * magnitude, (dy / distance) * magnitude);
  }

  getMoveVector(): Vec2 {
    return this.move;
  }

  isActionActive(action: InputAction): boolean {
    return this.actions.has(action);
  }

  /** Clears transient state; called on blur and on respawn. */
  reset(): this {
    this.keys.clear();
    this.actions.clear();
    this.joystickAnchor = null;
    V.set(this.move, 0, 0);
    return this;
  }

  destroy(): void {
    this.detach();
    this.reset();
  }
}

export default InputManager;
