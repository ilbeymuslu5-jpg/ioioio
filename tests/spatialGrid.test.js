import test from 'node:test';
import assert from 'node:assert/strict';
import { SpatialGrid } from '../src/core/SpatialGrid.js';
import { Entity } from '../src/entities/Entity.js';

function makeGrid() {
  return new SpatialGrid({ width: 400, height: 400, cellSize: 50 });
}

test('inserts entities and finds them by circle query', () => {
  const grid = makeGrid();
  const a = new Entity({ x: 25, y: 25, radius: 5 });
  const b = new Entity({ x: 300, y: 300, radius: 5 });
  grid.insert(a);
  grid.insert(b);

  assert.equal(grid.size, 2);
  assert.deepEqual(grid.queryCircle(25, 25, 10), [a]);
  assert.deepEqual(grid.queryCircle(300, 300, 10), [b]);
});

test('reports an entity spanning several cells only once', () => {
  const grid = makeGrid();
  // radius 60 with cellSize 50 covers a 3x3 block of cells.
  const big = new Entity({ x: 100, y: 100, radius: 60 });
  grid.insert(big);
  assert.equal(grid.queryCircle(100, 100, 60).length, 1);
});

test('update() re-buckets only after crossing a cell border', () => {
  const grid = makeGrid();
  const entity = new Entity({ x: 10, y: 10, radius: 4 });
  grid.insert(entity);
  const bounds = entity._gridBounds;

  entity.position.x = 20;
  grid.update(entity);
  assert.equal(entity._gridBounds, bounds, 'same cell keeps the same bounds object');

  entity.position.x = 260;
  grid.update(entity);
  assert.notEqual(entity._gridBounds, bounds);
  assert.equal(grid.queryCircle(10, 10, 8).length, 0);
  assert.deepEqual(grid.queryCircle(260, 10, 8), [entity]);
});

test('remove() takes the entity out of every cell it occupied', () => {
  const grid = makeGrid();
  const entity = new Entity({ x: 100, y: 100, radius: 60 });
  grid.insert(entity);
  grid.remove(entity);
  assert.equal(grid.size, 0);
  assert.equal(grid.queryCircle(100, 100, 80).length, 0);
});

test('queryNeighbors excludes the entity itself', () => {
  const grid = makeGrid();
  const a = new Entity({ x: 60, y: 60, radius: 10 });
  const b = new Entity({ x: 70, y: 60, radius: 10 });
  grid.insert(a);
  grid.insert(b);
  assert.deepEqual(grid.queryNeighbors(a), [b]);
});

test('forEachPair visits each pair exactly once across shared cells', () => {
  const grid = makeGrid();
  // Both entities are large enough to share four cells.
  const a = new Entity({ id: 'a', x: 100, y: 100, radius: 45 });
  const b = new Entity({ id: 'b', x: 110, y: 110, radius: 45 });
  grid.insert(a);
  grid.insert(b);

  let visits = 0;
  grid.forEachPair(() => visits++);
  assert.equal(visits, 1);
});

test('clamps queries at the arena edges instead of leaking cells', () => {
  const grid = makeGrid();
  const corner = new Entity({ x: 2, y: 2, radius: 3 });
  grid.insert(corner);
  assert.deepEqual(grid.queryCircle(-50, -50, 60), [corner]);
});
