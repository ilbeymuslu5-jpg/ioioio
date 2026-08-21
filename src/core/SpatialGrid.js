import { GameConfig } from '../config/GameConfig.js';

/**
 * Uniform spatial hash used as the broad phase for collision and pickup
 * queries. Entities are stored by the cell range their bounding circle
 * covers; `update()` is a no-op while an entity stays inside the same cells,
 * which keeps the common case (slow-moving orbs) close to free.
 */
export class SpatialGrid {
  constructor({
    width = GameConfig.arena.width,
    height = GameConfig.arena.height,
    cellSize = GameConfig.arena.cellSize,
  } = {}) {
    this.width = width;
    this.height = height;
    this.cellSize = cellSize;
    this.cols = Math.max(1, Math.ceil(width / cellSize));
    this.rows = Math.max(1, Math.ceil(height / cellSize));
    /** @type {Map<number, object[]>} */
    this.cells = new Map();
    this.size = 0;
    this.queryStamp = 0;
  }

  #cellX(x) {
    return Math.min(this.cols - 1, Math.max(0, Math.floor(x / this.cellSize)));
  }

  #cellY(y) {
    return Math.min(this.rows - 1, Math.max(0, Math.floor(y / this.cellSize)));
  }

  #boundsOf(entity) {
    const { x, y } = entity.position;
    const r = entity.radius;
    return {
      minCx: this.#cellX(x - r),
      minCy: this.#cellY(y - r),
      maxCx: this.#cellX(x + r),
      maxCy: this.#cellY(y + r),
    };
  }

  #addTo(entity, bounds) {
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

  #removeFrom(entity, bounds) {
    for (let cy = bounds.minCy; cy <= bounds.maxCy; cy++) {
      for (let cx = bounds.minCx; cx <= bounds.maxCx; cx++) {
        const bucket = this.cells.get(cy * this.cols + cx);
        if (!bucket) continue;
        const index = bucket.indexOf(entity);
        if (index === -1) continue;
        // Swap-pop: order inside a cell is irrelevant.
        bucket[index] = bucket[bucket.length - 1];
        bucket.pop();
        if (bucket.length === 0) this.cells.delete(cy * this.cols + cx);
      }
    }
    entity._gridBounds = null;
  }

  insert(entity) {
    if (entity._gridBounds) return this.update(entity);
    this.#addTo(entity, this.#boundsOf(entity));
    this.size++;
    return this;
  }

  remove(entity) {
    if (!entity._gridBounds) return this;
    this.#removeFrom(entity, entity._gridBounds);
    this.size--;
    return this;
  }

  /** Re-buckets an entity only if it moved or resized across a cell border. */
  update(entity) {
    const previous = entity._gridBounds;
    if (!previous) return this.insert(entity);
    const next = this.#boundsOf(entity);
    if (
      next.minCx === previous.minCx &&
      next.minCy === previous.minCy &&
      next.maxCx === previous.maxCx &&
      next.maxCy === previous.maxCy
    ) {
      return this;
    }
    this.#removeFrom(entity, previous);
    this.#addTo(entity, next);
    return this;
  }

  clear() {
    for (const bucket of this.cells.values()) {
      for (const entity of bucket) entity._gridBounds = null;
    }
    this.cells.clear();
    this.size = 0;
  }

  /**
   * Collects every entity whose cells overlap the given circle.
   * Broad phase only: results still need an exact distance test.
   */
  queryCircle(x, y, radius, out = []) {
    out.length = 0;
    const stamp = ++this.queryStamp;
    const minCx = this.#cellX(x - radius);
    const minCy = this.#cellY(y - radius);
    const maxCx = this.#cellX(x + radius);
    const maxCy = this.#cellY(y + radius);
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
  queryNeighbors(entity, padding = 0, out = []) {
    const found = this.queryCircle(
      entity.position.x,
      entity.position.y,
      entity.radius + padding,
      out,
    );
    const index = found.indexOf(entity);
    if (index !== -1) {
      found[index] = found[found.length - 1];
      found.pop();
    }
    return found;
  }

  /**
   * Iterates unique candidate pairs inside each cell.
   * Used by the physics narrow phase; `visit(a, b)` may be called for pairs
   * that are close but not actually touching.
   */
  forEachPair(visit) {
    const seen = new Set();
    for (const bucket of this.cells.values()) {
      for (let i = 0; i < bucket.length; i++) {
        for (let j = i + 1; j < bucket.length; j++) {
          const a = bucket[i];
          const b = bucket[j];
          // Entities sharing several cells would otherwise pair up repeatedly.
          const key = a.id < b.id ? a.id + ':' + b.id : b.id + ':' + a.id;
          if (seen.has(key)) continue;
          seen.add(key);
          visit(a, b);
        }
      }
    }
  }
}

export default SpatialGrid;
