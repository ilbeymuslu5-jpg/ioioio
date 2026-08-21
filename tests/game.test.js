import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/Game.js';
import { GameConfig } from '../src/config/GameConfig.js';
import { PhysicsEngine } from '../src/core/PhysicsEngine.js';

test('a headless match boots with a full orb field and a centred player', () => {
  const game = new Game({ headless: true, seed: 1 });
  assert.equal(game.world.countOfType('orb'), GameConfig.orbs.targetCount);
  assert.equal(game.player.position.x, GameConfig.arena.width / 2);
  assert.equal(game.camera.target, game.player);
  assert.equal(game.world.grid.size, game.world.size);
});

test('the player moves, collects and levels up over a simulated run', () => {
  const game = new Game({ headless: true, seed: 99 });
  const start = { ...game.player.position };

  game.setMoveIntent(1, 0.4);
  game.simulate(10);

  const player = game.player;
  assert.ok(player.position.x > start.x, 'travelled along the input vector');
  assert.ok(player.orbsCollected > 0, 'swept up orbs on the way');
  assert.ok(player.mass > GameConfig.player.startMass, 'gained mass');
  assert.ok(player.level > 1, 'gained levels');
  assert.equal(
    game.world.countOfType('orb'),
    GameConfig.orbs.targetCount,
    'the field is kept stocked',
  );
});

test('the simulation is deterministic for a given seed', () => {
  const run = () => {
    const game = new Game({ headless: true, seed: 2024 });
    game.setMoveIntent(0.6, -0.8);
    game.simulate(6);
    return {
      x: game.player.position.x,
      y: game.player.position.y,
      mass: game.player.mass,
      level: game.player.level,
      orbs: game.player.orbsCollected,
    };
  };
  assert.deepEqual(run(), run());
});

test('the player can never leave the arena', () => {
  const game = new Game({ headless: true, seed: 5 });
  game.setMoveIntent(-1, -1);
  game.simulate(30);
  const { position, radius } = game.player;
  assert.ok(position.x >= radius - 1e-6);
  assert.ok(position.y >= radius - 1e-6);

  game.setMoveIntent(1, 1);
  game.simulate(60);
  assert.ok(position.x <= GameConfig.arena.width - radius + 1e-6);
  assert.ok(position.y <= GameConfig.arena.height - radius + 1e-6);
});

test('the spatial index stays consistent with the entity registry', () => {
  const game = new Game({ headless: true, seed: 11 });
  game.setMoveIntent(1, 1);
  game.simulate(15);

  assert.equal(game.world.grid.size, game.world.size);
  for (const entity of game.world.entities.values()) {
    assert.ok(entity._gridBounds, `${entity.id} is indexed`);
    const found = game.world.grid.queryCircle(
      entity.position.x,
      entity.position.y,
      entity.radius,
    );
    assert.ok(found.includes(entity), `${entity.id} is findable at its position`);
  }
});

test('two players are pushed apart instead of overlapping', () => {
  const game = new Game({ headless: true, seed: 3 });
  const rival = new (Object.getPrototypeOf(game.player).constructor)({
    x: game.player.position.x + 4,
    y: game.player.position.y,
    name: 'Rival',
  });
  game.world.add(rival);

  game.simulate(0.5);
  assert.ok(
    PhysicsEngine.overlapDepth(game.player, rival) < 1,
    'bodies separate through the collision pipeline',
  );
});

test('the camera trails the player and stays inside the arena', () => {
  const game = new Game({ headless: true, seed: 8 });
  game.camera.resize(1280, 720);
  game.setMoveIntent(1, 0);
  game.simulate(5);

  const dx = Math.abs(game.camera.x - game.player.position.x);
  assert.ok(dx < 400, `camera keeps up with the player (off by ${dx.toFixed(1)})`);
  const view = game.camera.getVisibleBounds();
  assert.ok(view.minX >= -1e-6 && view.maxX <= GameConfig.arena.width + 1e-6);
});

test('a match runs a realistic tick load without unbounded growth', () => {
  const game = new Game({ headless: true, seed: 77 });
  game.setMoveIntent(0.8, 0.6);
  game.simulate(30);
  // Orb count is capped by the spawner, so entity count must stay flat.
  assert.equal(game.world.size, GameConfig.orbs.targetCount + 1);
  assert.ok(game.engine.tick === 30 * GameConfig.engine.tickRate);
});
