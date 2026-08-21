import type { Rng } from '../types/index.ts';

/** Pure numeric helpers. No engine or DOM dependencies. */

export const TAU = Math.PI * 2;

export function clamp(value: number, min: number, max: number): number {
  return value < min ? min : value > max ? max : value;
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

/**
 * Frame-rate independent smoothing.
 * `smoothing` is the fraction of the remaining distance left after 1 second.
 */
export function damp(a: number, b: number, smoothing: number, dt: number): number {
  return lerp(a, b, 1 - Math.pow(smoothing, dt));
}

export function randomRange(min: number, max: number, rng: Rng = Math.random): number {
  return min + rng() * (max - min);
}

export function randomInt(min: number, max: number, rng: Rng = Math.random): number {
  return Math.floor(randomRange(min, max + 1, rng));
}

export function pickWeighted<T extends { readonly weight: number }>(
  entries: readonly T[],
  rng: Rng = Math.random,
): T {
  if (entries.length === 0) throw new Error('pickWeighted needs at least one entry');
  let total = 0;
  for (const entry of entries) total += entry.weight;
  let roll = rng() * total;
  for (const entry of entries) {
    roll -= entry.weight;
    if (roll <= 0) return entry;
  }
  return entries[entries.length - 1] as T;
}

/** Deterministic 32-bit PRNG (mulberry32) so matches can be replayed. */
export function createRng(seed = 1): Rng {
  let state = seed >>> 0;
  return function next(): number {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
