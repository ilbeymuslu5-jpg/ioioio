import { GameConfig } from '../config/GameConfig.ts';
import { SpatialGrid } from './SpatialGrid.ts';
import { EventBus } from './EventBus.ts';
import type { GameEventMap } from './GameEvents.ts';
import type { Entity, EntityKind } from '../entities/Entity.ts';
import type { Bounds } from '../types/index.ts';

export interface WorldOptions {
  width?: number;
  height?: number;
  cellSize?: number;
  events?: EventBus<GameEventMap>;
}

/**
 * Owns the entity registry and the spatial index for one match.
 *
 * Systems mutate entities; the world keeps the index consistent and defers
 * removals so iteration during a tick is never invalidated.
 */
export class World {
  readonly bounds: Bounds;
  readonly events: EventBus<GameEventMap>;
  readonly grid: SpatialGrid<Entity>;
  readonly entities = new Map<string, Entity>();
  private readonly byType = new Map<EntityKind, Set<Entity>>();
  private readonly pendingRemoval: Entity[] = [];
  tick = 0;

  constructor({
    width = GameConfig.arena.width,
    height = GameConfig.arena.height,
    cellSize = GameConfig.arena.cellSize,
    events = new EventBus<GameEventMap>(),
  }: WorldOptions = {}) {
    this.bounds = { width, height };
    this.events = events;
    this.grid = new SpatialGrid<Entity>({ width, height, cellSize });
  }

  add<T extends Entity>(entity: T): T {
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
  remove(entity: Entity | null | undefined): boolean {
    if (!entity || !this.entities.has(entity.id)) return false;
    entity.alive = false;
    this.pendingRemoval.push(entity);
    return true;
  }

  flushRemovals(): number {
    if (this.pendingRemoval.length === 0) return 0;
    const count = this.pendingRemoval.length;
    for (const entity of this.pendingRemoval) {
      this.grid.remove(entity);
      this.entities.delete(entity.id);
      this.byType.get(entity.type)?.delete(entity);
      this.events.emit('entity:removed', entity);
    }
    this.pendingRemoval.length = 0;
    return count;
  }

  getByType<T extends Entity = Entity>(type: EntityKind): Set<T> {
    return (this.byType.get(type) ?? new Set()) as Set<T>;
  }

  countOfType(type: EntityKind): number {
    return this.byType.get(type)?.size ?? 0;
  }

  get size(): number {
    return this.entities.size;
  }

  /** Re-buckets every entity whose cell range changed since the last tick. */
  syncGrid(): this {
    for (const entity of this.entities.values()) this.grid.update(entity);
    return this;
  }

  clear(): this {
    this.grid.clear();
    this.entities.clear();
    this.byType.clear();
    this.pendingRemoval.length = 0;
    this.tick = 0;
    return this;
  }
}

export default World;
