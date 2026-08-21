import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/World.js';
import { Player } from '../src/entities/Player.js';
import { FoodOrb } from '../src/entities/FoodOrb.js';
import { PickupSystem } from '../src/systems/PickupSystem.js';
import { ProgressionSystem } from '../src/systems/ProgressionSystem.js';
import { SpawnSystem } from '../src/systems/SpawnSystem.js';
import { GameConfig } from '../src/config/GameConfig.js';
import { createRng } from '../src/utils/MathUtils.js';

const TIERS = GameConfig.orbs.tiers;

function setup() {
  const world = new World({ width: 1000, height: 1000, cellSize: 100 });
  const player = new Player({ x: 500, y: 500 });
  world.add(player);
  const pickup = new PickupSystem({ world });
  return { world, player, pickup };
}

function addOrb(world, x, y, tier = TIERS[0]) {
  return world.add(new FoodOrb({ x, y, tier }));
}

test('an orb touching the player is consumed and grants mass', () => {
  const { world, player, pickup } = setup();
  const startMass = player.mass;
  addOrb(world, 500 + player.radius * 0.5, 500);

  pickup.update(1 / 60);

  assert.equal(world.countOfType('orb'), 0);
  assert.equal(player.mass, startMass + TIERS[0].mass);
  assert.equal(player.orbsCollected, 1);
});

test('collecting mass grows the radius and slows the player down', () => {
  const { world, player, pickup } = setup();
  const startRadius = player.radius;
  const startSpeed = player.maxSpeed;

  for (let i = 0; i < 20; i++) {
    addOrb(world, 500, 500, TIERS[3]); // legendary: 20 mass each
    pickup.update(1 / 60);
  }

  assert.ok(player.radius > startRadius);
  assert.ok(player.maxSpeed < startSpeed, 'mass scaling reduces top speed');
  assert.ok(player.magnetRadius > GameConfig.player.baseMagnetRadius);
});

test('orbs inside the magnet radius are pulled toward the player', () => {
  const { world, player, pickup } = setup();
  const orb = addOrb(world, 500 + player.magnetRadius * 0.8, 500);
  const before = orb.position.x;

  pickup.update(1 / 60);
  assert.equal(orb.attractedTo, player, 'flagged as magnetised');
  assert.ok(orb.velocity.x < 0, 'pulled back toward the player');

  orb.position.x += orb.velocity.x * (1 / 60);
  assert.ok(orb.position.x < before);
});

test('orbs outside the magnet radius are untouched', () => {
  const { world, player, pickup } = setup();
  const orb = addOrb(world, 500 + player.magnetRadius + 50, 500);
  pickup.update(1 / 60);
  assert.equal(orb.attractedTo, null);
  assert.equal(world.countOfType('orb'), 1);
});

test('the magnet pull never overshoots the player in one tick', () => {
  const { world, player, pickup } = setup();
  const dt = 1 / 60;
  const distance = player.radius + 2;
  const orb = addOrb(world, 500 + distance, 500);

  pickup.update(dt);
  const travelled = Math.abs(orb.velocity.x) * dt;
  assert.ok(travelled <= distance + 1e-9);
});

test('collected orbs raise XP and trigger level-ups', () => {
  const { world, player, pickup } = setup();
  const progression = new ProgressionSystem({ world });
  progression.attach({ world });

  const levels = [];
  world.events.on('player:levelup', ({ level }) => levels.push(level));

  // One legendary orb carries several early levels' worth of XP.
  addOrb(world, 500, 500, TIERS[3]);
  pickup.update(1 / 60);

  assert.ok(player.level > 1);
  assert.deepEqual(levels, Array.from({ length: player.level - 1 }, (_, i) => i + 2));
  assert.ok(player.xp < player.xpToNext, 'leftover XP carries into the next level');
});

test('XP thresholds grow with the configured curve', () => {
  const progression = new ProgressionSystem({ world: new World() });
  const first = progression.xpForLevel(1);
  const second = progression.xpForLevel(2);
  assert.equal(first, Math.ceil(GameConfig.progression.baseXp));
  assert.ok(second > first);
  assert.equal(progression.getProgress({ xp: 5, xpToNext: 10 }), 0.5);
});

test('the spawn system fills the arena and refills what was eaten', () => {
  const world = new World({ width: 1000, height: 1000, cellSize: 100 });
  const config = { ...GameConfig.orbs, targetCount: 25, spawnPerSecond: 60 };
  const spawn = new SpawnSystem({ world, rng: createRng(7), config });

  spawn.attach();
  assert.equal(world.countOfType('orb'), 25);

  for (const orb of [...world.getByType('orb')].slice(0, 10)) world.remove(orb);
  world.flushRemovals();
  assert.equal(world.countOfType('orb'), 15);

  for (let i = 0; i < 60; i++) spawn.update(1 / 60);
  assert.equal(world.countOfType('orb'), 25, 'tops back up to the target');
});

test('spawned orbs stay inside the arena bounds', () => {
  const world = new World({ width: 800, height: 600, cellSize: 100 });
  const spawn = new SpawnSystem({
    world,
    rng: createRng(3),
    config: { ...GameConfig.orbs, targetCount: 200 },
  });
  spawn.fill();
  for (const orb of world.getByType('orb')) {
    assert.ok(orb.position.x >= 0 && orb.position.x <= 800);
    assert.ok(orb.position.y >= 0 && orb.position.y <= 600);
  }
});

test('removals are deferred so grid iteration stays valid', () => {
  const world = new World({ width: 500, height: 500, cellSize: 50 });
  const orb = addOrb(world, 100, 100);
  world.remove(orb);
  assert.equal(world.countOfType('orb'), 1, 'still present until flushed');
  assert.equal(orb.alive, false);
  world.flushRemovals();
  assert.equal(world.countOfType('orb'), 0);
  assert.equal(world.grid.queryCircle(100, 100, 20).length, 0);
});
