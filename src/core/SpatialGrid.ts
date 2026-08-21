import { GameConfig } from '../config/GameConfig.ts';
import type { Vec2 } from '../types/index.ts';

/** Cell range an entity's bounding circle currently covers. */
interface GridBounds {
  minCx: number;
  minCy: number;
  maxCx: number;
  maxCy: number;
}

/**
 * The minimum an entity must expose to be spatially indexed.
 * Deliberately structural: bots, projectiles and orbs all qualify without
 * inheriting from anything.
 */
export interface SpatialEntity {
  readonly id: string;
  readonly position: Vec2;
  readonly radius: number;
  /** Owned by SpatialGrid; never written from outside. */
  _gridBounds: GridBounds | null;
  _queryStamp: number;
}

export interface SpatialGridOptions {
  width?: number;
  height?: number;
  cellSize?: number;
}

/**
 * Uniform spatial hash: the broad phase for collision and pickup queries.
 *
 * Entities are stored under every cell their bounding circle covers, and
 * `update()` is a no-op while an entity stays inside the same cells — which
 * keeps the common case (slow-drifting orbs) close to free.
 */
export class SpatialGrid<T extends SpatialEntity = SpatialEntity> {
  readonly width: number;
  readonly height: number;
  readonly cellSize: number;
  readonly cols: number;
  readonly rows: number;
  readonly cells = new Map<number, T[]>();
  size = 0;
  private queryStamp = 0;

  constructor({
    width = GameConfig.arena.width,
    height = GameConfig.arena.height,
    cellSize = GameConfig.arena.cellSize,
  }: SpatialGridOptions = {}) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(height / cellSize));
  }

  private cellX(x: number): number {
    return Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
  }

  private cellY(y: number): number {
    return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
  }

  private boundsOf(entity: T): GridBounds {
    const { x, y } = entity.position;
    const r = entity.radius;
    return {
      minCx: this.cellX(x - r),
      minCy: this.cellY(y - r),
      maxCx: this.cellX(x + r),
      maxCy: this.cellY(y + r),
    };
  }

  private addTo(entity: T, bounds: GridBounds): void {
    for (let cy = bounds.minCy; cy <= bounds.maxCy; cy++) {
      for (let cx = bounds.minCx; cx <= bounds.maxCx; cx++) {
        const key = cy * this.cols + cx;
        const bucket = this.cells.get(key);
        if (bucket) bucket.push(entity);
        else this.cells.set(key, [entity]);
      }
    }
    entity._gridBounds = bounds;
  }

  private removeFrom(entity: T, bounds: GridBounds): void {
    for (let cy = bounds.minCy; cy <= bounds.maxCy; cy++) {
      for (let cx = bounds.minCx; cx <= bounds.maxCx; cx++) {
        const key = cy * this.cols + cx;
        const bucket = this.cells.get(key);
        if (!bucket) continue;
        const index = bucket.indexOf(entity);
        if (index === -1) continue;
        // Swap-pop: order inside a cell is irrelevant.
        bucket[index] = bucket[bucket.length - 1] as T;
        bucket.pop();
        if (bucket.length === 0) this.cells.delete(key);
      }
    }
    entity._gridBounds = null;
  }

  insert(entity: T): this {
    if (entity._gridBounds) return this.update(entity);
    this.addTo(entity, this.boundsOf(entity));
    this.size++;
    return this;
  }

  remove(entity: T): this {
    if (!entity._gridBounds) return this;
    this.removeFrom(entity, entity._gridBounds);
    this.size--;
    return this;
  }

  /** Re-buckets an entity only if it moved or resized across a cell border. */
  update(entity: T): this {
    const previous = entity._gridBounds;
    if (!previous) return this.insert(entity);
    const next = this.boundsOf(entity);
    if (
      next.minCx === previous.minCx &&
      next.minCy === previous.minCy &&
      next.maxCx === previous.maxCx &&
      next.maxCy === previous.maxCy
    ) {
      return this;
    }
    this.removeFrom(entity, previous);
    this.addTo(entity, next);
    return this;
  }

  clear(): void {
    for (const bucket of this.cells.values()) {
      for (const entity of bucket) entity._gridBounds = null;
    }
    this.cells.clear();
    this.size = 0;
  }

  /**
   * Every entity whose cells overlap the given circle.
   * Broad phase only: results still need an exact distance test.
   */
  queryCircle(x: number, y: number, radius: number, out: T[] = []): T[] {
    out.length = 0;
    const stamp = ++this.queryStamp;
    const minCx = this.cellX(x - radius);
    const minCy = this.cellY(y - radius);
    const maxCx = this.cellX(x + radius);
    const maxCy = this.cellY(y + radius);
    for (let cy = minCy; cy <= maxCy; cy++) {
      for (let cx = minCx; cx <= maxCx; cx++) {
        const bucket = this.cells.get(cy * this.cols + cx);
        if (!bucket) continue;
        for (const entity of bucket) {
          // An entity spanning several cells must only be reported once.
          if (entity._queryStamp === stamp) continue;
          entity._queryStamp = stamp;
          out.push(entity);
        }
      }
    }
    return out;
  }

  /** Neighbours of `entity`, excluding itself. */
  queryNeighbors(entity: T, padding = 0, out: T[] = []): T[] {
    const found = this.queryCircle(
      entity.position.x,
      entity.position.y,
      entity.radius + padding,
      out,
    );
    const index = found.indexOf(entity);
    if (index !== -1) {
      found[index] = found[found.length - 1] as T;
      found.pop();
    }
    return found;
  }

  /**
   * Visits unique candidate pairs sharing a cell — the physics narrow phase's
   * input. `visit` may see pairs that are close but not actually touching.
   */
  forEachPair(visit: (a: T, b: T) => void): void {
    const seen = new Set<string>();
    for (const bucket of this.cells.values()) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const a = bucket[i] as T;
          const b = bucket[j] as T;
          // Entities sharing several cells would otherwise pair up repeatedly.
          const key = a.id < b.id ? `${a.id}:${b.id}` : `${b.id}:${a.id}`;
          if (seen.has(key)) continue;
          seen.add(key);
          visit(a, b);
        }
      }
    }
  }
}

export default SpatialGrid;
