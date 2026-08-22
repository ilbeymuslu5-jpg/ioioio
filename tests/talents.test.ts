import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/World.ts';
import { PhysicsEngine } from '../src/core/PhysicsEngine.ts';
import { Player } from '../src/entities/Player.ts';
import { EnemyMob } from '../src/entities/EnemyMob.ts';
import { StatSystem } from '../src/systems/StatSystem.ts';
import { SkillTreeSystem } from '../src/systems/SkillTreeSystem.ts';
import { ProgressionSystem } from '../src/systems/ProgressionSystem.ts';
import { AbilitySystem } from '../src/systems/AbilitySystem.ts';
import { CombatSystem } from '../src/systems/CombatSystem.ts';
import { ItemFactory } from '../src/systems/ItemFactory.ts';
import { TALENT_POOL, RARITY_WEIGHTS } from '../src/config/TalentPool.ts';
import { ENEMY_TYPES } from '../src/config/EnemyTypes.ts';
import { GameConfig } from '../src/config/GameConfig.ts';
import { createRng } from '../src/utils/MathUtils.ts';
import type { TalentDefinition } from '../src/config/TalentPool.ts';
import type { EnemyType } from '../src/config/EnemyTypes.ts';
import type { MatchContext } from '../src/core/MatchContext.ts';
import type { Rng } from '../src/types/index.ts';

const GOBLIN = ENEMY_TYPES[0] as EnemyType;

function setup(options: { rng?: Rng; pool?: readonly TalentDefinition[] } = {}) {
  const world = new World({ width: 2000, height: 2000, cellSize: 100 });
  const hero = world.add(new Player({ x: 1000, y: 1000 }));
  const stats = new StatSystem({ carriers: () => world.getByType<Player>('player') });
  const skillTree = new SkillTreeSystem({
    world,
    stats,
    rng: options.rng ?? createRng(1),
    ...(options.pool ? { pool: options.pool } : {}),
  });
  skillTree.attach();
  stats.recalculate(hero);
  return { world, hero, stats, skillTree };
}

function talent(id: string): TalentDefinition {
  const found = TALENT_POOL.find((entry) => entry.id === id);
  assert.ok(found, `talent ${id} exists`);
  return found;
}

/* --- Drafting ------------------------------------------------------------- */

test('a level-up offers exactly three distinct talents', () => {
  const { hero, skillTree } = setup();
  const draft = skillTree.offerDraft(hero, 2);
  assert.ok(draft);
  assert.equal(draft.choices.length, 3);
  assert.equal(new Set(draft.choices.map((c) => c.talent.id)).size, 3);
});

test('levelling up automatically queues a draft', () => {
  const { world, hero, skillTree } = setup();
  const progression = new ProgressionSystem({ world });
  progression.attach();

  const offered: number[] = [];
  world.events.on('talent:offered', ({ draft }) => offered.push(draft.level));

  progression.grantXp(hero, GameConfig.progression.baseXp);
  assert.equal(hero.level, 2);
  assert.deepEqual(offered, [2]);
  assert.equal(skillTree.pendingCount, 1);
});

test('several level-ups at once queue several drafts', () => {
  const { world, hero, skillTree } = setup();
  const progression = new ProgressionSystem({ world });
  progression.attach();

  progression.grantXp(hero, 900);
  assert.ok(hero.level > 3);
  assert.equal(skillTree.pendingCount, hero.level - 1, 'every level still owes a choice');

  const first = skillTree.currentDraft;
  skillTree.choose(first!.choices[0]!.talent.id);
  assert.equal(skillTree.pendingCount, hero.level - 2);
});

test('a draft with the same seed is reproducible', () => {
  const ids = () => {
    const { hero, skillTree } = setup({ rng: createRng(777) });
    return skillTree.offerDraft(hero, 2)!.choices.map((c) => c.talent.id);
  };
  assert.deepEqual(ids(), ids());
});

test('maxed-out talents stop being offered', () => {
  const pool = [talent('sharpened-steel'), talent('iron-hide')];
  const { hero, skillTree } = setup({ pool });
  const sharp = talent('sharpened-steel');
  for (let i = 0; i < sharp.maxStacks; i++) skillTree.applyTalent(hero, sharp);

  const ids = skillTree.offerDraft(hero, 9)!.choices.map((c) => c.talent.id);
  assert.deepEqual(ids, ['iron-hide']);
});

test('an exhausted pool offers nothing rather than empty cards', () => {
  const pool = [talent('sharpened-steel')];
  const { hero, skillTree } = setup({ pool });
  for (let i = 0; i < pool[0]!.maxStacks; i++) skillTree.applyTalent(hero, pool[0]!);
  assert.equal(skillTree.offerDraft(hero, 9), null);
  assert.equal(skillTree.pendingCount, 0);
});

test('choose() only accepts a talent that is actually on offer', () => {
  const { hero, skillTree } = setup();
  const draft = skillTree.offerDraft(hero, 2)!;
  const offered = new Set(draft.choices.map((c) => c.talent.id));
  const notOffered = TALENT_POOL.find((entry) => !offered.has(entry.id))!;

  assert.equal(skillTree.choose(notOffered.id), false, 'a stale click grants nothing');
  assert.equal(skillTree.pendingCount, 1);
  assert.equal(hero.talents.size, 0);
  assert.equal(skillTree.choose(draft.choices[1]!.talent.id), true);
});

test('rarity weights make common talents the usual roll, and luck helps', () => {
  const { skillTree } = setup();
  assert.equal(skillTree.weightFor('common', 0), RARITY_WEIGHTS.common);
  assert.ok(skillTree.weightFor('common', 0) > skillTree.weightFor('magic', 0));
  assert.ok(skillTree.weightFor('epic', 0) > skillTree.weightFor('legendary', 0));
  assert.equal(skillTree.weightFor('common', 5), skillTree.weightFor('common', 0));
  assert.ok(
    skillTree.weightFor('legendary', 1) / skillTree.weightFor('legendary', 0) >
      skillTree.weightFor('magic', 1) / skillTree.weightFor('magic', 0),
    'luck helps the rarest tier most',
  );
});

/* --- Applying picks -------------------------------------------------------- */

test('a pick lands on the sheet as an in-match modifier', () => {
  const { hero, skillTree } = setup();
  const before = hero.stats.resolved.damage;
  skillTree.applyTalent(hero, talent('sharpened-steel')); // +15% damage
  assert.ok(Math.abs(hero.stats.resolved.damage - before * 1.15) < 1e-9);
  assert.equal(hero.stats.hasGroup('talent:sharpened-steel'), true);
});

test('stacking multiplies the per-stack values in one group', () => {
  const { hero, skillTree } = setup();
  const base = hero.stats.base.damage;
  for (let i = 0; i < 3; i++) skillTree.applyTalent(hero, talent('sharpened-steel'));

  assert.equal(hero.talents.get('sharpened-steel'), 3);
  assert.ok(Math.abs(hero.stats.resolved.damage - base * (1 + 0.15 * 3)) < 1e-9);
  assert.equal(hero.stats.groupCount, 1, 'stacks update one group, not three');
});

test('stacking never exceeds maxStacks', () => {
  const { hero, skillTree } = setup();
  const sharp = talent('sharpened-steel');
  for (let i = 0; i < sharp.maxStacks + 4; i++) skillTree.applyTalent(hero, sharp);
  assert.equal(hero.talents.get('sharpened-steel'), sharp.maxStacks);
});

test('Şövalye Disiplini raises armour by a fifth and health by fifty', () => {
  const { hero, skillTree } = setup();
  const armor = hero.stats.resolved.armor;
  const health = hero.stats.resolved.maxHealth;

  skillTree.applyTalent(hero, talent('knight-discipline'));

  assert.ok(Math.abs(hero.stats.resolved.armor - armor * 1.2) < 1e-9);
  assert.ok(Math.abs(hero.stats.resolved.maxHealth - (health + 50)) < 1e-9);
});

test('picks feed straight through to derived combat values', () => {
  const { hero, skillTree } = setup();
  const speed = hero.maxSpeed;
  const interval = hero.attackInterval;
  const range = hero.attackRange;

  skillTree.applyTalent(hero, talent('fleet-foot'));   // +10% move speed
  skillTree.applyTalent(hero, talent('swift-hands'));  // +12% attack speed
  skillTree.applyTalent(hero, talent('long-reach'));   // +10 reach

  assert.ok(Math.abs(hero.maxSpeed - speed * 1.1) < 1e-9);
  assert.ok(hero.attackInterval < interval);
  assert.equal(hero.attackRange, range + 10);
});

test('activeTalents lists what the buff strip should show', () => {
  const { hero, skillTree } = setup();
  skillTree.applyTalent(hero, talent('iron-hide'));
  skillTree.applyTalent(hero, talent('iron-hide'));
  skillTree.applyTalent(hero, talent('vitality'));

  const active = skillTree.activeTalents(hero);
  assert.equal(active.length, 2);
  assert.deepEqual(
    active.map((e) => [e.talent.id, e.stacks]).sort(),
    [['iron-hide', 2], ['vitality', 1]].sort(),
  );
});

test('an auto-pick policy drains the queue as drafts arrive', () => {
  const { world, hero, skillTree } = setup();
  skillTree.setAutoPick((draft) => draft.choices[0]!.talent.id);
  const progression = new ProgressionSystem({ world });
  progression.attach();

  progression.grantXp(hero, 800);
  assert.equal(skillTree.pendingCount, 0);
  assert.ok(hero.talents.size > 0);
});

test('a policy that returns an invalid id cannot stall the queue', () => {
  const { hero, skillTree } = setup();
  skillTree.setAutoPick(() => 'no-such-talent');
  skillTree.offerDraft(hero, 2);
  skillTree.offerDraft(hero, 3);
  assert.equal(skillTree.pendingCount, 0);
});

/* --- Abilities -------------------------------------------------------------
   The three talents that do something rather than adding numbers.
   -------------------------------------------------------------------------- */

function abilitySetup(seed = 1) {
  const base = setup({ rng: createRng(seed) });
  const physics = new PhysicsEngine({ bounds: base.world.bounds });
  const combat = new CombatSystem({
    world: base.world,
    physics,
    items: new ItemFactory({ rng: createRng(seed) }),
    rng: createRng(seed),
  });
  const abilities = new AbilitySystem({ world: base.world, combat });
  const context = { player: base.hero, world: base.world } as MatchContext;
  return { ...base, combat, abilities, context };
}

function spawnEnemy(world: World, x: number, y: number): EnemyMob {
  const enemy = world.add(new EnemyMob({ x, y, type: GOBLIN }));
  enemy.maxHealth = 100000; // a dummy that will not die mid-measurement
  enemy.health = 100000;
  world.syncGrid();
  return enemy;
}

test('no ability runs until its talent is picked', () => {
  const { world, hero, abilities, context } = abilitySetup();
  const enemy = spawnEnemy(world, hero.position.x + 60, hero.position.y);

  for (let i = 0; i < 300; i++) abilities.update(1 / 60, context);
  assert.equal(abilities.blades.length, 0);
  assert.equal(abilities.firePatches.length, 0);
  assert.equal(enemy.health, enemy.maxHealth);
});

test('Kasırga Kılıçları orbits the hero and cuts what it sweeps', () => {
  const { world, hero, skillTree, abilities, context } = abilitySetup();
  skillTree.applyTalent(hero, talent('whirlwind-blades'));
  const radius = GameConfig.abilities.bladeOrbitRadius;
  const enemy = spawnEnemy(world, hero.position.x + radius, hero.position.y);

  for (let i = 0; i < 240; i++) {
    abilities.update(1 / 60, context);
    world.syncGrid();
  }
  assert.ok(abilities.blades.length >= 2);
  assert.ok(enemy.health < enemy.maxHealth, 'the ring damaged it');

  // Every blade sits on the orbit, so the ring keeps its shape.
  for (const blade of abilities.blades) {
    const distance = Math.hypot(blade.x - hero.position.x, blade.y - hero.position.y);
    assert.ok(Math.abs(distance - radius) < 1e-6);
  }
});

test('more stacks of the blades mean more blades', () => {
  const { hero, skillTree, abilities, context } = abilitySetup();
  skillTree.applyTalent(hero, talent('whirlwind-blades'));
  abilities.update(1 / 60, context);
  const one = abilities.blades.length;

  skillTree.applyTalent(hero, talent('whirlwind-blades'));
  abilities.update(1 / 60, context);
  assert.ok(abilities.blades.length > one);
});

test('Kutsal Şimşek strikes the nearest enemy on its interval', () => {
  const { world, hero, skillTree, abilities, context } = abilitySetup();
  skillTree.applyTalent(hero, talent('holy-lightning'));
  const near = spawnEnemy(world, hero.position.x + 120, hero.position.y);
  const far = spawnEnemy(world, hero.position.x + 380, hero.position.y);

  let casts = 0;
  world.events.on('ability:cast', () => casts++);
  for (let i = 0; i < 60 * 6; i++) abilities.update(1 / 60, context);

  assert.ok(casts > 0);
  assert.ok(near.health < near.maxHealth, 'the nearest one is the target');
  assert.equal(far.health, far.maxHealth);
});

test('lightning finds nothing when the field is empty, and does not throw', () => {
  const { hero, skillTree, abilities, context } = abilitySetup();
  skillTree.applyTalent(hero, talent('holy-lightning'));
  for (let i = 0; i < 60 * 6; i++) abilities.update(1 / 60, context);
  assert.equal(abilities.strikes.length, 0);
  void hero;
});

test('cooldown reduction speeds an ability up', () => {
  const { hero, abilities } = abilitySetup();
  const base = abilities.cooldownFor(hero, 10);
  hero.stats.resolved.cooldownReduction = 0.5;
  assert.ok(Math.abs(abilities.cooldownFor(hero, 10) - base * 0.5) < 1e-9);

  hero.stats.resolved.cooldownReduction = 5; // absurd stacking
  assert.ok(abilities.cooldownFor(hero, 10) > 0, 'clamped, never free');
});

test('Ateş İzi burns ground only while the hero is moving', () => {
  const { hero, skillTree, abilities, context } = abilitySetup();
  skillTree.applyTalent(hero, talent('fire-trail'));

  for (let i = 0; i < 120; i++) abilities.update(1 / 60, context);
  assert.equal(abilities.firePatches.length, 0, 'standing still leaves no trail');

  hero.velocity.x = 200;
  for (let i = 0; i < 120; i++) abilities.update(1 / 60, context);
  assert.ok(abilities.firePatches.length > 0);
});

test('fire patches damage enemies standing in them, then burn out', () => {
  const { world, hero, skillTree, abilities, context } = abilitySetup();
  skillTree.applyTalent(hero, talent('fire-trail'));
  hero.velocity.x = 200;
  const enemy = spawnEnemy(world, hero.position.x, hero.position.y);

  for (let i = 0; i < 120; i++) abilities.update(1 / 60, context);
  assert.ok(enemy.health < enemy.maxHealth);

  hero.velocity.x = 0;
  const lifetime = GameConfig.abilities.fireTrailLifetime;
  for (let i = 0; i < 60 * (lifetime + 1); i++) abilities.update(1 / 60, context);
  assert.equal(abilities.firePatches.length, 0, 'flames expire');
});

test('ability damage goes through armour like everything else', () => {
  const { world, hero, combat, abilities, context } = abilitySetup();
  void abilities;
  void context;
  const enemy = spawnEnemy(world, hero.position.x + 40, hero.position.y);
  const dealt = combat.damageEnemyFlat(enemy, hero, 100, 'test');
  assert.ok(dealt < 100, 'the goblin has armour');
  assert.ok(dealt > 0);
});

test('a dead hero stops projecting abilities', () => {
  const { hero, skillTree, abilities, context } = abilitySetup();
  skillTree.applyTalent(hero, talent('whirlwind-blades'));
  abilities.update(1 / 60, context);
  assert.ok(abilities.blades.length > 0);

  hero.kill();
  abilities.update(1 / 60, context);
  assert.equal(abilities.blades.length, 0);
});

test('every talent modifier actually moves the stat it targets', () => {
  // Guards the same trap as the gear test: a percentage on a zero-base stat
  // (cooldown reduction, luck) resolves to nothing at all.
  const { hero, stats, skillTree } = setup();
  for (const definition of TALENT_POOL) {
    for (const key of Object.keys(definition.perStack) as (keyof typeof hero.stats.base)[]) {
      const fresh = new Player();
      stats.recalculate(fresh);
      const before = fresh.stats.resolved[key];
      skillTree.applyTalent(fresh, definition);
      assert.ok(
        fresh.stats.resolved[key] > before,
        `${definition.id} does not move ${key} (${before} -> ${fresh.stats.resolved[key]})`,
      );
    }
  }
});
