import { GameConfig } from '../config/GameConfig.js';
import { SpatialGrid } from './SpatialGrid.js';
import { EventBus } from './EventBus.js';

/**
 * Owns the entity registry and the spatial index for one match.
 * Systems mutate entities; the world keeps the index consistent and handles
 * deferred add/remove so iteration during a tick is never invalidated.
 */
export class World {
  constructor({
    width = GameConfig.arena.width,
    height = GameConfig.arena.height,
    cellSize = GameConfig.arena.cellSize,
    events = new EventBus(),
  } = {}) {
    this.bounds = { width, height };
    this.events = events;
    this.grid = new SpatialGrid({ width, height, cellSize });
    /** @type {Map<string, import('../entities/Entity.js').Entity>} */
    this.entities = new Map();
    /** @type {Map<string, Set<object>>} */
    this.byType = new Map();
    this._pendingRemoval = [];
    this.tick = 0;
  }

  add(entity) {
    if (this.entities.has(entity.id)) return entity;
    this.entities.set(entity.id, entity);
    let bucket = this.byType.get(entity.type);
    if (!bucket) {
      bucket = new Set();
      this.byType.set(entity.type, bucket);
    }
    bucket.add(entity);
    this.grid.insert(entity);
    this.events.emit('entity:added', entity);
    return entity;
  }

  /** Marks an entity for removal; applied by `flushRemovals()` after the tick. */
  remove(entity) {
    if (!entity || !this.entities.has(entity.id)) return false;
    entity.alive = false;
    this._pendingRemoval.push(entity);
    return true;
  }

  flushRemovals() {
    if (this._pendingRemoval.length === 0) return 0;
    const count = this._pendingRemoval.length;
    for (const entity of this._pendingRemoval) {
      this.grid.remove(entity);
      this.entities.delete(entity.id);
      this.byType.get(entity.type)?.delete(entity);
      this.events.emit('entity:removed', entity);
    }
    this._pendingRemoval.length = 0;
    return count;
  }

  getByType(type) {
    return this.byType.get(type) ?? new Set();
  }

  countOfType(type) {
    return this.byType.get(type)?.size ?? 0;
  }

  get size() {
    return this.entities.size;
  }

  /** Re-buckets every entity whose cell range changed since the last tick. */
  syncGrid() {
    for (const entity of this.entities.values()) this.grid.update(entity);
    return this;
  }

  clear() {
    this.grid.clear();
    this.entities.clear();
    this.byType.clear();
    this._pendingRemoval.length = 0;
    this.tick = 0;
    return this;
  }
}

export default World;
