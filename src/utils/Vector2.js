/**
 * Vector helpers over plain `{ x, y }` objects.
 *
 * Functions come in two flavours:
 *  - allocating (`add`, `scale`, ...) which return a new vector,
 *  - in-place (`addMut`, `scaleMut`, ...) used on the hot physics path
 *    to keep per-tick allocations near zero.
 */

export function vec2(x = 0, y = 0) {
  return { x, y };
}

export function clone(v) {
  return { x: v.x, y: v.y };
}

export function set(out, x, y) {
  out.x = x;
  out.y = y;
  return out;
}

export function copy(out, v) {
  out.x = v.x;
  out.y = v.y;
  return out;
}

export function add(a, b) {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function addMut(out, v, scale = 1) {
  out.x += v.x * scale;
  out.y += v.y * scale;
  return out;
}

export function sub(a, b) {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v, s) {
  return { x: v.x * s, y: v.y * s };
}

export function scaleMut(out, s) {
  out.x *= s;
  out.y *= s;
  return out;
}

export function dot(a, b) {
  return a.x * b.x + a.y * b.y;
}

export function lengthSq(v) {
  return v.x * v.x + v.y * v.y;
}

export function length(v) {
  return Math.hypot(v.x, v.y);
}

export function distanceSq(a, b) {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Returns a unit-length copy; the zero vector stays zero. */
export function normalize(v) {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function normalizeMut(out) {
  const len = Math.hypot(out.x, out.y);
  if (len === 0) return out;
  out.x /= len;
  out.y /= len;
  return out;
}

/** Clamps magnitude to `max` without changing direction. */
export function limitMut(out, max) {
  const lenSq = out.x * out.x + out.y * out.y;
  if (lenSq > max * max && lenSq > 0) {
    const len = Math.sqrt(lenSq);
    out.x = (out.x / len) * max;
    out.y = (out.y / len) * max;
  }
  return out;
}

export function lerpVec(a, b, t) {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
