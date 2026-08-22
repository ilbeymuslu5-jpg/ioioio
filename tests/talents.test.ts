import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/World.ts';
import { Player } from '../src/entities/Player.ts';
import { StatSystem } from '../src/systems/StatSystem.ts';
import { SkillTreeSystem } from '../src/systems/SkillTreeSystem.ts';
import { ProgressionSystem } from '../src/systems/ProgressionSystem.ts';
import { TALENT_POOL, RARITY_WEIGHTS } from '../src/config/TalentPool.ts';
import { createRng } from '../src/utils/MathUtils.ts';
import type { TalentDefinition } from '../src/config/TalentPool.ts';
import type { Rng } from '../src/types/index.ts';

function setup(options: { rng?: Rng; pool?: readonly TalentDefinition[] } = {}) {
  const world = new World({ width: 1000, height: 1000, cellSize: 100 });
  const player = world.add(new Player({ x: 500, y: 500 }));
  const stats = new StatSystem({ carriers: () => world.getByType<Player>('player') });
  const skillTree = new SkillTreeSystem({
    world,
    stats,
    rng: options.rng ?? createRng(1),
    ...(options.pool ? { pool: options.pool } : {}),
  });
  skillTree.attach();
  stats.recalculate(player);
  return { world, player, stats, skillTree };
}

function talent(id: string): TalentDefinition {
  const found = TALENT_POOL.find((entry) => entry.id === id);
  assert.ok(found, `talent ${id} exists`);
  return found;
}

/* --- Drafting ----------------------------------------------------------- */

test('a level-up offers exactly three distinct talents', () => {
  const { player, skillTree } = setup();
  const draft = skillTree.offerDraft(player, 2);

  assert.ok(draft);
  assert.equal(draft.choices.length, 3);
  const ids = draft.choices.map((choice) => choice.talent.id);
  assert.equal(new Set(ids).size, 3, 'no duplicate cards in one draft');
});

test('levelling up automatically queues a draft', () => {
  const { world, player, skillTree } = setup();
  const progression = new ProgressionSystem({ world });
  progression.attach();

  const offered: number[] = [];
  world.events.on('talent:offered', ({ draft }) => offered.push(draft.level));

  progression.grantXp(player, 12);
  assert.equal(player.level, 2);
  assert.deepEqual(offered, [2]);
  assert.equal(skillTree.pendingCount, 1);
});

test('several level-ups at once queue several drafts', () => {
  const { world, player, skillTree } = setup();
  const progression = new ProgressionSystem({ world });
  progression.attach();

  progression.grantXp(player, 500); // worth many levels
  assert.ok(player.level > 3);
  assert.equal(skillTree.pendingCount, player.level - 1, 'every level still owes a choice');

  const first = skillTree.currentDraft;
  skillTree.choose(first!.choices[0]!.talent.id);
  assert.equal(skillTree.pendingCount, player.level - 2);
  assert.notEqual(skillTree.currentDraft, first, 'the next draft is presented');
});

test('a draft with the same seed is reproducible', () => {
  const ids = () => {
    const { player, skillTree } = setup({ rng: createRng(777) });
    return skillTree.offerDraft(player, 2)!.choices.map((choice) => choice.talent.id);
  };
  assert.deepEqual(ids(), ids());
});

test('maxed-out talents stop being offered', () => {
  const pool = [talent('sharp-edge'), talent('magnet')];
  const { player, skillTree } = setup({ pool });

  const sharp = talent('sharp-edge');
  for (let i = 0; i < sharp.maxStacks; i++) skillTree.applyTalent(player, sharp);

  const draft = skillTree.offerDraft(player, 9);
  const ids = draft!.choices.map((choice) => choice.talent.id);
  assert.ok(!ids.includes('sharp-edge'), 'a maxed talent is out of the pool');
  assert.deepEqual(ids, ['magnet']);
});

test('an exhausted pool offers nothing rather than empty cards', () => {
  const pool = [talent('sharp-edge')];
  const { player, skillTree } = setup({ pool });
  for (let i = 0; i < talent('sharp-edge').maxStacks; i++) {
    skillTree.applyTalent(player, talent('sharp-edge'));
  }
  assert.equal(skillTree.offerDraft(player, 9), null);
  assert.equal(skillTree.pendingCount, 0);
});

test('offers report the stacks already owned so the UI can show progress', () => {
  const pool = [talent('sharp-edge'), talent('magnet'), talent('agility')];
  const { player, skillTree } = setup({ pool });
  skillTree.applyTalent(player, talent('sharp-edge'));

  const draft = skillTree.offerDraft(player, 3);
  const offer = draft!.choices.find((choice) => choice.talent.id === 'sharp-edge');
  assert.equal(offer?.currentStacks, 1);
});

/* --- Rarity and luck ---------------------------------------------------- */

test('rarity weights make common talents the usual roll', () => {
  const { skillTree } = setup();
  assert.ok(skillTree.weightFor('common', 0) > skillTree.weightFor('rare', 0));
  assert.ok(skillTree.weightFor('rare', 0) > skillTree.weightFor('epic', 0));
  assert.ok(skillTree.weightFor('epic', 0) > skillTree.weightFor('legendary', 0));
  assert.equal(skillTree.weightFor('common', 0), RARITY_WEIGHTS.common);
});

test('luck raises rare weights without touching common', () => {
  const { skillTree } = setup();
  assert.equal(skillTree.weightFor('common', 5), skillTree.weightFor('common', 0));
  assert.ok(skillTree.weightFor('rare', 1) > skillTree.weightFor('rare', 0));
  assert.ok(
    skillTree.weightFor('legendary', 1) / skillTree.weightFor('legendary', 0) >
      skillTree.weightFor('rare', 1) / skillTree.weightFor('rare', 0),
    'luck helps the rarest tier most',
  );
});

test('luck actually shifts what gets drafted over many rolls', () => {
  const rarity = (luck: number): number => {
    const { player, skillTree } = setup({ rng: createRng(4242) });
    player.stats.resolved.luck = luck;
    let rare = 0;
    for (let i = 0; i < 300; i++) {
      const draft = skillTree.offerDraft(player, 2);
      for (const choice of draft!.choices) {
        if (choice.talent.rarity !== 'common') rare++;
      }
    }
    return rare;
  };
  assert.ok(rarity(4) > rarity(0), 'a lucky player sees more non-common cards');
});

/* --- Applying picks ----------------------------------------------------- */

test('a pick lands on the sheet as an in-match modifier', () => {
  const { player, stats, skillTree } = setup();
  const before = player.stats.resolved.damage;
  skillTree.applyTalent(player, talent('sharp-edge')); // damage +15%

  assert.ok(Math.abs(player.stats.resolved.damage - before * 1.15) < 1e-9);
  assert.equal(player.stats.hasGroup('talent:sharp-edge'), true);
  // The pipeline, not the entity, owns the number.
  assert.equal(stats.computeStat(player.stats, 'damage', player.level), player.stats.resolved.damage);
});

test('stacking a talent multiplies its per-stack values', () => {
  const { player, skillTree } = setup();
  const base = player.stats.base.damage;
  skillTree.applyTalent(player, talent('sharp-edge'));
  skillTree.applyTalent(player, talent('sharp-edge'));
  skillTree.applyTalent(player, talent('sharp-edge'));

  assert.equal(player.talents.get('sharp-edge'), 3);
  assert.ok(Math.abs(player.stats.resolved.damage - base * (1 + 0.15 * 3)) < 1e-9);
  assert.equal(player.stats.groupCount, 1, 'stacks update one group, not three');
});

test('stacking never exceeds maxStacks', () => {
  const { player, skillTree } = setup();
  const sharp = talent('sharp-edge');
  for (let i = 0; i < sharp.maxStacks + 4; i++) skillTree.applyTalent(player, sharp);
  assert.equal(player.talents.get('sharp-edge'), sharp.maxStacks);
});

test('a multi-stat talent applies every stat it declares', () => {
  const { player, skillTree } = setup();
  const baseDamage = player.stats.resolved.damage;
  const baseHealth = player.stats.resolved.maxHealth;
  const baseSpeed = player.stats.resolved.baseSpeed;

  skillTree.applyTalent(player, talent('star-core')); // +30% dmg, +25% hp, +12% speed

  assert.ok(Math.abs(player.stats.resolved.damage - baseDamage * 1.3) < 1e-9);
  assert.ok(Math.abs(player.stats.resolved.maxHealth - baseHealth * 1.25) < 1e-9);
  assert.ok(Math.abs(player.stats.resolved.baseSpeed - baseSpeed * 1.12) < 1e-9);
});

test('picks feed straight through to derived movement values', () => {
  const { player, skillTree } = setup();
  const speedBefore = player.maxSpeed;
  const magnetBefore = player.magnetRadius;

  skillTree.applyTalent(player, talent('agility')); // +10% speed
  skillTree.applyTalent(player, talent('magnet'));  // +25% magnet radius

  assert.ok(Math.abs(player.maxSpeed - speedBefore * 1.1) < 1e-9);
  assert.ok(player.magnetRadius > magnetBefore);
});

test('choose() only accepts a talent that is actually on offer', () => {
  const { player, skillTree } = setup();
  const draft = skillTree.offerDraft(player, 2)!;
  const offered = new Set(draft.choices.map((choice) => choice.talent.id));
  const notOffered = TALENT_POOL.find((entry) => !offered.has(entry.id))!;

  assert.equal(skillTree.choose(notOffered.id), false, 'a stale click grants nothing');
  assert.equal(skillTree.pendingCount, 1, 'the draft is still open');
  assert.equal(player.talents.size, 0);

  assert.equal(skillTree.choose(draft.choices[1]!.talent.id), true);
  assert.equal(skillTree.pendingCount, 0);
});

test('choosing with no draft open is a no-op', () => {
  const { skillTree } = setup();
  assert.equal(skillTree.choose('sharp-edge'), false);
});

test('choosing emits the pick and then clears the queue', () => {
  const { world, player, skillTree } = setup();
  const events: string[] = [];
  world.events.on('talent:chosen', ({ talent: picked, stacks }) => {
    events.push(`chosen:${picked.id}:${stacks}`);
  });
  world.events.on('talent:cleared', () => events.push('cleared'));

  const draft = skillTree.offerDraft(player, 2)!;
  const id = draft.choices[0]!.talent.id;
  skillTree.choose(id);

  assert.deepEqual(events, [`chosen:${id}:1`, 'cleared']);
});

test('activeTalents lists what the buff strip should show', () => {
  const { player, skillTree } = setup();
  skillTree.applyTalent(player, talent('magnet'));
  skillTree.applyTalent(player, talent('magnet'));
  skillTree.applyTalent(player, talent('vitality'));

  const active = skillTree.activeTalents(player);
  assert.equal(active.length, 2);
  assert.deepEqual(
    active.map((entry) => [entry.talent.id, entry.stacks]).sort(),
    [['magnet', 2], ['vitality', 1]].sort(),
  );
});

/* --- Auto-pick policy (headless balance runs) --------------------------- */

test('an auto-pick policy drains the queue as drafts arrive', () => {
  const { world, player, skillTree } = setup();
  skillTree.setAutoPick((draft) => draft.choices[0]!.talent.id);
  const progression = new ProgressionSystem({ world });
  progression.attach();

  progression.grantXp(player, 400);
  assert.equal(skillTree.pendingCount, 0, 'nothing is left waiting');
  assert.ok(player.talents.size > 0);
});

test('a policy that returns an invalid id cannot stall the queue', () => {
  const { player, skillTree } = setup();
  skillTree.setAutoPick(() => 'no-such-talent');
  skillTree.offerDraft(player, 2);
  skillTree.offerDraft(player, 3);
  assert.equal(skillTree.pendingCount, 0);
});

/* --- Crit damage roll --------------------------------------------------- */

test('a guaranteed crit multiplies damage before armour applies', () => {
  const attacker = { damage: 100, critChance: 1, critMultiplier: 2 };
  const { amount, crit } = StatSystem.rollDamage(attacker, 100, () => 0);
  assert.equal(crit, true);
  assert.equal(amount, 100); // 100 * 2 * (100 / 200)
});

test('a non-crit skips the multiplier but still goes through armour', () => {
  const attacker = { damage: 100, critChance: 0, critMultiplier: 3 };
  const { amount, crit } = StatSystem.rollDamage(attacker, 100, () => 0.99);
  assert.equal(crit, false);
  assert.equal(amount, 50);
});

test('a crit multiplier below 1 cannot reduce damage', () => {
  const attacker = { damage: 100, critChance: 1, critMultiplier: 0.2 };
  const { amount } = StatSystem.rollDamage(attacker, 0, () => 0);
  assert.equal(amount, 100);
});

test('crit talents raise the rolled damage of a real player', () => {
  const { player, skillTree } = setup();
  skillTree.applyTalent(player, talent('critical-focus'));
  skillTree.applyTalent(player, talent('lethal-blow'));

  assert.ok(player.stats.resolved.critChance > player.stats.base.critChance);
  const { amount, crit } = StatSystem.rollDamage(player.stats.resolved, 0, () => 0);
  assert.equal(crit, true);
  assert.ok(amount > player.stats.resolved.damage, 'a crit hits harder than a normal blow');
});
