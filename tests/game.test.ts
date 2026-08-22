import test from 'node:test';
import assert from 'node:assert/strict';
import { Game } from '../src/Game.ts';
import { GameConfig } from '../src/config/GameConfig.ts';
import { EnemyMob } from '../src/entities/EnemyMob.ts';
import { ENEMY_TYPES } from '../src/config/EnemyTypes.ts';
import type { EnemyType } from '../src/config/EnemyTypes.ts';
import type { Player } from '../src/entities/Player.ts';

const GOBLIN = ENEMY_TYPES[0] as EnemyType;

/** Drives the hero like a cautious player: kite the nearest mob and swing. */
function fight(game: Game, seconds: number): void {
  const hero = game.player;
  for (let i = 0; i < seconds * 60; i++) {
    if (!hero.alive) return;
    const target = game.abilitySystem.nearestEnemy(hero, 700);
    if (target) {
      const dx = hero.position.x - target.position.x;
      const dy = hero.position.y - target.position.y;
      const distance = Math.hypot(dx, dy) || 1;
      game.aimAt(target.position.x, target.position.y);
      game.setMoveIntent(distance < 90 ? dx / distance : -dx / distance, distance < 90 ? dy / distance : -dy / distance);
      game.combatSystem.attack(hero);
    } else {
      game.setMoveIntent(0, 0);
    }
    game.engine.step();
  }
}

test('a headless match boots with a hero and an opening enemy wave', () => {
  const game = new Game({ headless: true, seed: 1 });
  assert.ok(game.world.countOfType('enemy') > 0);
  assert.equal(game.world.countOfType('loot'), 0, 'nothing has died yet');
  assert.equal(game.player.position.x, GameConfig.arena.width / 2);
  assert.equal(game.camera.target, game.player);
  assert.equal(game.world.grid.size, game.world.size);
});

test('the hero boots as a fully resolved warrior', () => {
  const hero = new Game({ headless: true, seed: 1 }).player;
  assert.equal(hero.radius, GameConfig.hero.radius);
  assert.equal(hero.maxSpeed, GameConfig.hero.baseMoveSpeed);
  assert.equal(hero.health, hero.maxHealth);
  assert.equal(hero.mana, hero.maxMana);
  assert.ok(hero.attackRange > 0);
});

test('a fought match yields kills, loot, levels and gold', () => {
  const game = new Game({ headless: true, seed: 99, autoPickTalents: true });
  fight(game, 45);

  const hero = game.player;
  assert.ok(hero.kills > 0, 'killed something');
  assert.ok(hero.level > 1, 'gained levels');
  assert.ok(hero.gold > 0, 'picked up gold');
  assert.ok(hero.talents.size > 0, 'picked talents');
  assert.equal(game.skillTreeSystem.pendingCount, 0, 'no draft left hanging');
});

test('the hero finds and wears equipment over a long run', () => {
  const game = new Game({ headless: true, seed: 5, autoPickTalents: true });
  let found = 0;
  game.events.on('item:found', () => found++);
  fight(game, 90);

  assert.ok(found > 0, 'chests dropped');
  const worn = game.inventorySystem.equippedItems(game.player).filter((entry) => entry.item);
  assert.ok(worn.length > 0, 'and something got worn');
  // Worn gear is the `gear` layer of the sheet, one group per filled slot.
  assert.equal(game.player.stats.groupCount, worn.length + game.player.talents.size);
});

test('difficulty ramps: the hero eventually falls to the swarm', () => {
  const game = new Game({ headless: true, seed: 3, autoPickTalents: true });
  let died = 0;
  game.events.on('hero:died', () => died++);
  fight(game, 240);

  assert.equal(game.player.alive, false, 'the run ends');
  assert.equal(died, 1);
  assert.ok(game.player.kills > 30, 'but not before a real fight');
});

test('the simulation is deterministic for a given seed', () => {
  const run = () => {
    const game = new Game({ headless: true, seed: 2024, autoPickTalents: true });
    fight(game, 20);
    return {
      x: Math.round(game.player.position.x),
      y: Math.round(game.player.position.y),
      kills: game.player.kills,
      level: game.player.level,
      gold: game.player.gold,
      talents: [...game.player.talents.entries()].sort(),
    };
  };
  assert.deepEqual(run(), run());
});

test('the hero can never leave the arena', () => {
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
  const game = new Game({ headless: true, seed: 11, autoPickTalents: true });
  fight(game, 25);

  assert.equal(game.world.grid.size, game.world.size);
  for (const entity of game.world.entities.values()) {
    assert.ok(entity._gridBounds, `${entity.id} is indexed`);
    const found = game.world.grid.queryCircle(entity.position.x, entity.position.y, entity.radius);
    assert.ok(found.includes(entity), `${entity.id} is findable at its position`);
  }
});

test('enemies are pushed apart rather than stacking on one point', () => {
  const game = new Game({ headless: true, seed: 8 });
  const hero = game.player;
  for (let i = 0; i < 6; i++) {
    const enemy = game.world.add(
      new EnemyMob({ x: hero.position.x + 200 + i, y: hero.position.y, type: GOBLIN }),
    );
    enemy.hunting = true;
  }
  game.simulate(2);

  const mobs = [...game.world.getByType<EnemyMob>('enemy')];
  for (let i = 0; i < mobs.length; i++) {
    for (let j = i + 1; j < mobs.length; j++) {
      const a = mobs[i]!;
      const b = mobs[j]!;
      const distance = Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y);
      assert.ok(distance > 1, 'no two mobs occupy the same point');
    }
  }
});

test('the enemy population is capped no matter how long the run goes', () => {
  const game = new Game({ headless: true, seed: 21, autoPickTalents: true });
  game.player.level = 50;
  game.simulate(120);
  assert.ok(game.world.countOfType('enemy') <= GameConfig.spawn.maxEnemies);
});

test('the camera trails the hero and stays inside the arena', () => {
  const game = new Game({ headless: true, seed: 8 });
  game.camera.resize(1280, 720);
  game.setMoveIntent(1, 0);
  game.simulate(5);

  const dx = Math.abs(game.camera.x - game.player.position.x);
  assert.ok(dx < 400, `camera keeps up with the hero (off by ${dx.toFixed(1)})`);
  const view = game.camera.getVisibleBounds();
  assert.ok(view.minX >= -1e-6 && view.maxX <= GameConfig.arena.width + 1e-6);
});

test('a dash costs mana, grants immunity and then goes on cooldown', () => {
  const game = new Game({ headless: true, seed: 4 });
  const hero: Player = game.player;
  hero.setMoveIntent({ x: 1, y: 0 });

  const mana = hero.mana;
  hero.dashTimer = hero.config.dashDuration;
  hero.dashCooldown = hero.config.dashCooldown;
  hero.grantInvulnerability(hero.config.dashInvulnerability);
  hero.spendMana(hero.config.dashManaCost);

  assert.ok(hero.mana < mana);
  assert.equal(hero.isDashing, true);
  assert.equal(hero.isInvulnerable, true);
  assert.equal(hero.canDash, false, 'cannot chain dashes');

  game.simulate(hero.config.dashCooldown + 0.1);
  assert.equal(hero.isDashing, false);
  assert.ok(hero.mana > 0, 'mana regenerates');
});
