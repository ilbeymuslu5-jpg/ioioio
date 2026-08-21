import * as V from '../utils/Vector2.js';
import { clamp } from '../utils/MathUtils.js';

/**
 * Normalises mouse, touch and keyboard into one uniform intent:
 *
 *   { move: { x, y } }  // direction vector, magnitude 0..1
 *
 * Pointer/joystick input is analogue (distance from the anchor scales the
 * magnitude); keyboard input is digital and always full throttle.
 * Gameplay code never touches DOM events directly.
 */
export class InputManager {
  static KEY_VECTORS = {
    KeyW: { x: 0, y: -1 },
    ArrowUp: { x: 0, y: -1 },
    KeyS: { x: 0, y: 1 },
    ArrowDown: { x: 0, y: 1 },
    KeyA: { x: -1, y: 0 },
    ArrowLeft: { x: -1, y: 0 },
    KeyD: { x: 1, y: 0 },
    ArrowRight: { x: 1, y: 0 },
  };

  constructor({
    element = null,
    /** Pointer distance (px) at which movement reaches full speed. */
    pointerDeadZone = 12,
    pointerFullRange = 180,
  } = {}) {
    this.element = element;
    this.pointerDeadZone = pointerDeadZone;
    this.pointerFullRange = pointerFullRange;

    this.move = V.vec2(0, 0);
    this.pointer = V.vec2(0, 0);
    this.pointerActive = false;
    /** Touch drags steer relative to where the finger went down. */
    this.joystickAnchor = null;
    this.keys = new Set();
    this.actions = new Set();
    this.enabled = true;
    this._bindings = [];
  }

  /** Attaches DOM listeners. Safe to skip entirely in headless tests. */
  attach(element = this.element) {
    if (!element) return this;
    this.detach();
    this.element = element;
    const target = element;
    const win = element.ownerDocument?.defaultView ?? globalThis;

    this.#listen(target, 'mousemove', (e) => this.#onPointerMove(e.clientX, e.clientY));
    this.#listen(target, 'mouseenter', () => { this.pointerActive = true; });
    this.#listen(target, 'mouseleave', () => { this.pointerActive = false; });
    this.#listen(target, 'mousedown', () => this.actions.add('primary'));
    this.#listen(win, 'mouseup', () => this.actions.delete('primary'));

    this.#listen(target, 'touchstart', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.joystickAnchor = V.vec2(touch.clientX, touch.clientY);
      this.pointerActive = true;
      this.#onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    this.#listen(target, 'touchmove', (e) => {
      e.preventDefault();
      const touch = e.changedTouches[0];
      this.#onPointerMove(touch.clientX, touch.clientY);
    }, { passive: false });

    const endTouch = () => {
      this.joystickAnchor = null;
      this.pointerActive = false;
    };
    this.#listen(target, 'touchend', endTouch);
    this.#listen(target, 'touchcancel', endTouch);

    this.#listen(win, 'keydown', (e) => {
      if (e.repeat) return;
      this.keys.add(e.code);
      if (e.code === 'Space') this.actions.add('dash');
    });
    this.#listen(win, 'keyup', (e) => {
      this.keys.delete(e.code);
      if (e.code === 'Space') this.actions.delete('dash');
    });
    // A lost focus must not leave a key stuck down.
    this.#listen(win, 'blur', () => this.reset());
    return this;
  }

  #listen(target, type, handler, options) {
    target.addEventListener(type, handler, options);
    this._bindings.push({ target, type, handler, options });
  }

  detach() {
    for (const { target, type, handler, options } of this._bindings) {
      target.removeEventListener(type, handler, options);
    }
    this._bindings.length = 0;
    return this;
  }

  #onPointerMove(clientX, clientY) {
    const rect = this.element?.getBoundingClientRect?.() ?? { left: 0, top: 0 };
    V.set(this.pointer, clientX - rect.left, clientY - rect.top);
    this.pointerActive = true;
  }

  /**
   * Resolves the frame's move vector. Keyboard wins when pressed, otherwise the
   * pointer steers from `originX/originY` (normally the player's screen pos).
   */
  update(originX = 0, originY = 0) {
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

  getMoveVector() {
    return this.move;
  }

  isActionActive(action) {
    return this.actions.has(action);
  }

  /** Clears transient state; called on blur and on respawn. */
  reset() {
    this.keys.clear();
    this.actions.clear();
    this.joystickAnchor = null;
    V.set(this.move, 0, 0);
    return this;
  }

  destroy() {
    this.detach();
    this.reset();
  }
}

export default InputManager;
