import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/World.ts';
import { PhysicsEngine } from '../src/core/PhysicsEngine.ts';
import { Player } from '../src/entities/Player.ts';
import { EnemyMob } from '../src/entities/EnemyMob.ts';
import type { LootDrop } from '../src/entities/LootDrop.ts';
import { CombatSystem } from '../src/systems/CombatSystem.ts';
import { EnemyAISystem } from '../src/systems/EnemyAISystem.ts';
import { EnemySpawnSystem } from '../src/systems/EnemySpawnSystem.ts';
import { ItemFactory } from '../src/systems/ItemFactory.ts';
import { ENEMY_TYPES } from '../src/config/EnemyTypes.ts';
import { GameConfig } from '../src/config/GameConfig.ts';
import { createRng } from '../src/utils/MathUtils.ts';
import type { EnemyType } from '../src/config/EnemyTypes.ts';

const GOBLIN = ENEMY_TYPES[0] as EnemyType;
const SKELETON = ENEMY_TYPES[1] as EnemyType;

function setup(seed = 1) {
  const world = new World({ width: 2000, height: 2000, cellSize: 100 });
  const hero = world.add(new Player({ x: 1000, y: 1000 }));
  const physics = new PhysicsEngine({ bounds: world.bounds });
  const combat = new CombatSystem({
    world,
    physics,
    items: new ItemFactory({ rng: createRng(seed) }),
    rng: createRng(seed),
  });
  return { world, hero, physics, combat };
}

/** Places an enemy `distance` away at `angle` radians from the hero. */
function placeEnemy(
  world: World,
  hero: Player,
  distance: number,
  angle = 0,
  type: EnemyType = GOBLIN,
): EnemyMob {
  return world.add(
    new EnemyMob({
      x: hero.position.x + Math.cos(angle) * distance,
      y: hero.position.y + Math.sin(angle) * distance,
      type,
    }),
  );
}

/* --- The swing arc ------------------------------------------------------ */

test('a swing hits an enemy standing in front of the hero', () => {
  const { world, hero, combat } = setup();
  const enemy = placeEnemy(world, hero, 40);
  hero.aimAt(enemy.position.x, enemy.position.y);

  const hit = combat.attack(hero);
  assert.deepEqual(hit, [enemy]);
  assert.ok(enemy.health < enemy.maxHealth);
});

test('a swing misses an enemy standing behind the hero', () => {
  const { world, hero, combat } = setup();
  const enemy = placeEnemy(world, hero, 40, Math.PI);
  hero.aimAt(hero.position.x + 100, hero.position.y); // facing away

  assert.deepEqual(combat.attack(hero), []);
  assert.equal(enemy.health, enemy.maxHealth);
});

test('a swing misses an enemy beyond its reach', () => {
  const { world, hero, combat } = setup();
  const far = placeEnemy(world, hero, hero.attackRange + 100);
  hero.aimAt(far.position.x, far.position.y);
  assert.deepEqual(combat.attack(hero), []);
});

test('one swing cleaves every enemy inside the arc', () => {
  const { world, hero, combat } = setup();
  const a = placeEnemy(world, hero, 45, -0.3);
  const b = placeEnemy(world, hero, 45, 0);
  const c = placeEnemy(world, hero, 45, 0.3);
  const behind = placeEnemy(world, hero, 45, Math.PI);
  hero.aimAt(hero.position.x + 100, hero.position.y);

  const hit = combat.attack(hero);
  assert.equal(hit.length, 3);
  assert.ok(hit.includes(a) && hit.includes(b) && hit.includes(c));
  assert.equal(behind.health, behind.maxHealth);
});

test('reach is measured to the enemy edge, so a big body is hit sooner', () => {
  const { world, hero, combat } = setup();
  // Just past the hero's reach: only the wider skeleton should still connect.
  const distance = hero.attackRange + SKELETON.radius - 1;
  const skeleton = placeEnemy(world, hero, distance, 0, SKELETON);
  hero.aimAt(skeleton.position.x, skeleton.position.y);
  assert.equal(combat.attack(hero).length, 1);

  const { world: w2, hero: h2, combat: c2 } = setup();
  const goblin = placeEnemy(w2, h2, distance, 0, GOBLIN);
  h2.aimAt(goblin.position.x, goblin.position.y);
  assert.equal(c2.attack(h2).length, 0);
});

test('the attack cooldown paces swings, not the call rate', () => {
  const { world, hero, combat } = setup();
  placeEnemy(world, hero, 40);
  hero.aimAt(hero.position.x + 100, hero.position.y);

  assert.equal(combat.attack(hero).length, 1);
  assert.equal(combat.attack(hero).length, 0, 'the second call is on cooldown');
  assert.ok(hero.attackCooldown > 0);

  hero.update(hero.attackInterval);
  assert.equal(hero.canAttack, true);
  assert.equal(combat.attack(hero).length, 1);
});

test('a swing knocks the struck enemy backwards', () => {
  const { world, hero, combat } = setup();
  const enemy = placeEnemy(world, hero, 40);
  hero.aimAt(enemy.position.x, enemy.position.y);
  combat.attack(hero);
  assert.ok(enemy.velocity.x > 0, 'pushed away from the hero');
});

test('armour reduces what a swing lands', () => {
  const { world, hero, combat } = setup();
  hero.stats.resolved.critChance = 0; // isolate the armour term
  const goblin = placeEnemy(world, hero, 40, -0.2, GOBLIN);
  const skeleton = placeEnemy(world, hero, 40, 0.2, SKELETON);
  hero.aimAt(hero.position.x + 100, hero.position.y);
  combat.attack(hero);

  const goblinTaken = goblin.maxHealth - goblin.health;
  const skeletonTaken = skeleton.maxHealth - skeleton.health;
  assert.ok(skeleton.armor > goblin.armor);
  assert.ok(skeletonTaken < goblinTaken, 'the armoured skeleton takes less');
});

/* --- Death and loot ------------------------------------------------------ */

test('killing an enemy removes it, counts the kill and drops loot', () => {
  const { world, hero, combat } = setup();
  const enemy = placeEnemy(world, hero, 40);
  hero.aimAt(enemy.position.x, enemy.position.y);

  let killed = 0;
  world.events.on('enemy:killed', () => killed++);

  enemy.health = 1;
  combat.attack(hero);
  world.flushRemovals();

  assert.equal(killed, 1);
  assert.equal(hero.kills, 1);
  assert.equal(world.countOfType('enemy'), 0);
  assert.ok(world.countOfType('loot') > 0, 'something was left behind');
});

test('a loot drop carries gold and soul shards', () => {
  const { world, hero, combat } = setup(4);
  const enemy = placeEnemy(world, hero, 40);
  combat.dropLoot(enemy, hero);

  const kinds = new Set([...world.getByType<LootDrop>('loot')].map((drop) => drop.kind));
  assert.ok(kinds.has('soul'), 'XP crystals always drop');
  for (const drop of world.getByType('loot')) {
    const distance = Math.hypot(
      drop.position.x - enemy.position.x,
      drop.position.y - enemy.position.y,
    );
    assert.ok(distance <= GameConfig.loot.dropSpread + 1, 'scattered around the corpse');
  }
});

/* --- Taking damage -------------------------------------------------------- */

test('an enemy in range strikes the hero on its own clock', () => {
  const { world, hero, combat } = setup();
  const enemy = placeEnemy(world, hero, 30);
  enemy.state = 'attack';

  combat.update();
  assert.ok(hero.health < hero.maxHealth);
  assert.ok(enemy.attackCooldown > 0, 'the mob has to wait to swing again');
});

test('the mercy window stops a swarm from chain-stunning the hero', () => {
  const { world, hero, combat } = setup();
  const first = placeEnemy(world, hero, 30, 0);
  const second = placeEnemy(world, hero, 30, Math.PI);
  first.state = 'attack';
  second.state = 'attack';

  combat.update();
  const afterOne = hero.health;
  combat.update();
  assert.equal(hero.health, afterOne, 'the second blow lands in the mercy window');

  // Advance both the hero's mercy window and the mobs' attack clocks.
  const step = Math.max(GameConfig.hero.invulnerabilityAfterHit, first.attackInterval) + 0.01;
  hero.update(step);
  first.update(step);
  second.update(step);
  combat.update();
  assert.ok(hero.health < afterOne, 'once the window closes, blows land again');
});

test('a dashing hero takes no damage', () => {
  const { world, hero, combat } = setup();
  const enemy = placeEnemy(world, hero, 30);
  enemy.state = 'attack';
  hero.grantInvulnerability(0.3);

  combat.update();
  assert.equal(hero.health, hero.maxHealth);
});

test('losing all health kills the hero and announces it', () => {
  const { world, hero, combat } = setup();
  const enemy = placeEnemy(world, hero, 30);
  let died = 0;
  world.events.on('hero:died', () => died++);

  hero.health = 1;
  combat.damageHero(hero, 500, enemy);
  assert.equal(hero.alive, false);
  assert.equal(died, 1);
});

/* --- Enemy AI ------------------------------------------------------------- */

test('a mob that has seen the hero walks toward them', () => {
  const { world, hero } = setup();
  const ai = new EnemyAISystem({ world });
  const enemy = placeEnemy(world, hero, 300);
  const before = enemy.position.x;

  for (let i = 0; i < 60; i++) {
    ai.update(1 / 60);
    enemy.position.x += enemy.velocity.x / 60;
    enemy.position.y += enemy.velocity.y / 60;
  }
  assert.equal(enemy.state, 'chase');
  assert.ok(enemy.position.x < before, 'closed the distance');
});

test('a mob that has never seen the hero holds position', () => {
  const { world, hero } = setup();
  const ai = new EnemyAISystem({ world });
  const enemy = placeEnemy(world, hero, GOBLIN.aggroRange + 200);

  ai.update(1 / 60);
  assert.equal(enemy.state, 'idle');
  assert.equal(Math.hypot(enemy.velocity.x, enemy.velocity.y), 0);
});

test('aggro latches, so a fleeing hero is still pursued', () => {
  const { world, hero } = setup();
  const ai = new EnemyAISystem({ world });
  const enemy = placeEnemy(world, hero, 100);

  ai.update(1 / 60);
  assert.equal(enemy.hunting, true);

  hero.setPosition(hero.position.x + GOBLIN.aggroRange * 2, hero.position.y);
  ai.update(1 / 60);
  assert.equal(enemy.state, 'chase', 'it does not give up the moment you run');
});

test('mobs standing on each other push apart', () => {
  const { world, hero } = setup();
  const ai = new EnemyAISystem({ world });
  const a = placeEnemy(world, hero, 300, 0);
  const b = world.add(new EnemyMob({ x: a.position.x + 2, y: a.position.y, type: GOBLIN }));
  world.syncGrid();

  ai.update(1 / 60);
  // b sits to the right of a, so separation pushes them apart on that axis.
  assert.ok(b.velocity.x > a.velocity.x);
});

test('mobs switch to attack once they are in reach', () => {
  const { world, hero } = setup();
  const ai = new EnemyAISystem({ world });
  const enemy = placeEnemy(world, hero, GOBLIN.attackRange + GOBLIN.radius + hero.radius - 2);
  ai.update(1 / 60);
  assert.equal(enemy.state, 'attack');
});

/* --- The spawn director --------------------------------------------------- */

test('the director opens the match with a partial field', () => {
  const world = new World({ width: 4000, height: 4000, cellSize: 128 });
  world.add(new Player({ x: 2000, y: 2000 }));
  const spawn = new EnemySpawnSystem({ world, rng: createRng(2) });

  spawn.attach();
  assert.ok(world.countOfType('enemy') > 0);
  assert.ok(world.countOfType('enemy') < GameConfig.spawn.baseEnemyCount);
});

test('spawned mobs land outside the view but inside the arena', () => {
  const world = new World({ width: 4000, height: 4000, cellSize: 128 });
  const hero = world.add(new Player({ x: 2000, y: 2000 }));
  const spawn = new EnemySpawnSystem({ world, rng: createRng(3) });

  for (let i = 0; i < 40; i++) spawn.spawnOne(hero);
  for (const enemy of world.getByType<EnemyMob>('enemy')) {
    const distance = Math.hypot(
      enemy.position.x - hero.position.x,
      enemy.position.y - hero.position.y,
    );
    assert.ok(distance >= GameConfig.spawn.minSpawnDistance - 1, 'never pops in on screen');
    assert.ok(enemy.position.x >= 0 && enemy.position.x <= 4000);
    assert.ok(enemy.position.y >= 0 && enemy.position.y <= 4000);
  }
});

test('a dispatched mob hunts even though it spawns beyond its aggro range', () => {
  const world = new World({ width: 4000, height: 4000, cellSize: 128 });
  const hero = world.add(new Player({ x: 2000, y: 2000 }));
  const spawn = new EnemySpawnSystem({ world, rng: createRng(5) });

  const enemy = spawn.spawnOne(hero);
  assert.ok(
    Math.hypot(enemy.position.x - hero.position.x, enemy.position.y - hero.position.y) >
      enemy.aggroRange,
    'the spawn ring really is outside aggro range',
  );
  assert.equal(enemy.hunting, true);
});

test('population target and difficulty both climb with hero level', () => {
  const world = new World({ width: 4000, height: 4000, cellSize: 128 });
  const hero = world.add(new Player({ x: 2000, y: 2000 }));
  const spawn = new EnemySpawnSystem({ world, rng: createRng(6) });

  const atOne = spawn.targetPopulation(hero);
  const easy = spawn.difficultyFor(hero);
  hero.level = 15;
  assert.ok(spawn.targetPopulation(hero) > atOne);
  assert.ok(spawn.difficultyFor(hero) > easy);
  assert.ok(spawn.targetPopulation(hero) <= GameConfig.spawn.maxEnemies);
});

test('difficulty scaling makes a late-run mob genuinely tougher', () => {
  const weak = new EnemyMob({ type: GOBLIN, difficulty: 1 });
  const strong = new EnemyMob({ type: GOBLIN, difficulty: 3 });
  assert.ok(strong.maxHealth > weak.maxHealth);
  assert.ok(strong.damage > weak.damage);
});
