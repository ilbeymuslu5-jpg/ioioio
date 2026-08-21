import type { Vec2 } from '../types/index.ts';

/**
 * Vector helpers over plain `{ x, y }` objects.
 *
 * Allocating variants (`add`, `scale`) return new vectors; in-place variants
 * (`addMut`, `scaleMut`) are used on the hot physics path to keep per-tick
 * allocations near zero.
 */

export function vec2(x = 0, y = 0): Vec2 {
  return { x, y };
}

export function clone(v: Vec2): Vec2 {
  return { x: v.x, y: v.y };
}

export function set(out: Vec2, x: number, y: number): Vec2 {
  out.x = x;
  out.y = y;
  return out;
}

export function copy(out: Vec2, v: Vec2): Vec2 {
  out.x = v.x;
  out.y = v.y;
  return out;
}

export function add(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x + b.x, y: a.y + b.y };
}

export function addMut(out: Vec2, v: Vec2, scalar = 1): Vec2 {
  out.x += v.x * scalar;
  out.y += v.y * scalar;
  return out;
}

export function sub(a: Vec2, b: Vec2): Vec2 {
  return { x: a.x - b.x, y: a.y - b.y };
}

export function scale(v: Vec2, s: number): Vec2 {
  return { x: v.x * s, y: v.y * s };
}

export function scaleMut(out: Vec2, s: number): Vec2 {
  out.x *= s;
  out.y *= s;
  return out;
}

export function dot(a: Vec2, b: Vec2): number {
  return a.x * b.x + a.y * b.y;
}

export function lengthSq(v: Vec2): number {
  return v.x * v.x + v.y * v.y;
}

export function length(v: Vec2): number {
  return Math.hypot(v.x, v.y);
}

export function distanceSq(a: Vec2, b: Vec2): number {
  const dx = a.x - b.x;
  const dy = a.y - b.y;
  return dx * dx + dy * dy;
}

export function distance(a: Vec2, b: Vec2): number {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

/** Returns a unit-length copy; the zero vector stays zero. */
export function normalize(v: Vec2): Vec2 {
  const len = Math.hypot(v.x, v.y);
  if (len === 0) return { x: 0, y: 0 };
  return { x: v.x / len, y: v.y / len };
}

export function normalizeMut(out: Vec2): Vec2 {
  const len = Math.hypot(out.x, out.y);
  if (len === 0) return out;
  out.x /= len;
  out.y /= len;
  return out;
}

/** Clamps magnitude to `max` without changing direction. */
export function limitMut(out: Vec2, max: number): Vec2 {
  const lenSq = out.x * out.x + out.y * out.y;
  if (lenSq > max * max && lenSq > 0) {
    const len = Math.sqrt(lenSq);
    out.x = (out.x / len) * max;
    out.y = (out.y / len) * max;
  }
  return out;
}

export function lerpVec(a: Vec2, b: Vec2, t: number): Vec2 {
  return { x: a.x + (b.x - a.x) * t, y: a.y + (b.y - a.y) * t };
}
