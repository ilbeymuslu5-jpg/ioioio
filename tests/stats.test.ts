import test from 'node:test';
import assert from 'node:assert/strict';
import { StatSheet, StatSystem } from '../src/systems/StatSystem.ts';
import { Player } from '../src/entities/Player.ts';
import { GameConfig } from '../src/config/GameConfig.ts';

/* --- Stat pipeline -----------------------------------------------------
   FinalStat = (Base + TalentFlat + GearFlat) * (1 + TalentPerc + GearPerc)
             * (1 + InMatchPerc)
   ---------------------------------------------------------------------- */

function sheetWith(base: number): StatSheet {
  return new StatSheet({ damage: base });
}

/** Gear at full effect, isolating the pipeline from the ramp. */
function fullGearSystem(): StatSystem {
  return new StatSystem({ gearScaling: { startEffectiveness: 1, fullEffectivenessLevel: 1 } });
}

test('base value passes through untouched when nothing modifies it', () => {
  assert.equal(fullGearSystem().computeStat(sheetWith(50), 'damage', 1), 50);
});

test('flat terms are summed before any percentage applies', () => {
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'talent-1', source: 'talent', stats: { damage: { flat: 20 } } });
  sheet.addGroup({ id: 'sword', source: 'gear', stats: { damage: { flat: 30 } } });
  assert.equal(fullGearSystem().computeStat(sheet, 'damage', 1), 150);
});

test('talent and gear percentages are additive with each other', () => {
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'talent-1', source: 'talent', stats: { damage: { perc: 0.2 } } });
  sheet.addGroup({ id: 'sword', source: 'gear', stats: { damage: { perc: 0.3 } } });
  // 100 * (1 + 0.2 + 0.3), not 100 * 1.2 * 1.3
  assert.equal(fullGearSystem().computeStat(sheet, 'damage', 1), 150);
});

test('in-match percentage multiplies the permanent result separately', () => {
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'talent-1', source: 'talent', stats: { damage: { perc: 0.5 } } });
  sheet.addGroup({ id: 'rage', source: 'inMatch', stats: { damage: { perc: 0.5 } } });
  assert.equal(fullGearSystem().computeStat(sheet, 'damage', 1), 225);
});

test('the whole pipeline composes as specified', () => {
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 't', source: 'talent', stats: { damage: { flat: 10, perc: 0.1 } } });
  sheet.addGroup({ id: 'g', source: 'gear', stats: { damage: { flat: 40, perc: 0.2 } } });
  sheet.addGroup({ id: 'm', source: 'inMatch', stats: { damage: { perc: 0.25 } } });
  assert.equal(fullGearSystem().computeStat(sheet, 'damage', 1), 150 * 1.3 * 1.25);
});

test('removing a modifier group takes its contribution back out', () => {
  const stats = fullGearSystem();
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'sword', source: 'gear', stats: { damage: { flat: 50 } } });
  assert.equal(stats.computeStat(sheet, 'damage', 1), 150);
  assert.equal(sheet.removeGroup('sword'), true);
  assert.equal(stats.computeStat(sheet, 'damage', 1), 100);
});

test('clearSource drops every group from one layer only', () => {
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'a', source: 'inMatch', stats: { damage: { flat: 10 } } });
  sheet.addGroup({ id: 'b', source: 'inMatch', stats: { damage: { flat: 10 } } });
  sheet.addGroup({ id: 'c', source: 'gear', stats: { damage: { flat: 5 } } });
  sheet.clearSource('inMatch');
  assert.equal(fullGearSystem().computeStat(sheet, 'damage', 1), 105);
});

/* --- Gear effectiveness ramp -------------------------------------------- */

test('the gear ramp scales gear only, never talents', () => {
  const stats = new StatSystem({ gearScaling: { startEffectiveness: 0.25, fullEffectivenessLevel: 10 } });
  assert.equal(stats.gearEffectiveness(1), 0.25);
  assert.equal(stats.gearEffectiveness(10), 1);
  assert.equal(stats.gearEffectiveness(30), 1, 'never exceeds 100%');

  const geared = sheetWith(100);
  geared.addGroup({ id: 'g', source: 'gear', stats: { damage: { flat: 100 } } });
  assert.equal(stats.computeStat(geared, 'damage', 1), 125);

  const talented = sheetWith(100);
  talented.addGroup({ id: 't', source: 'talent', stats: { damage: { flat: 100 } } });
  assert.equal(stats.computeStat(talented, 'damage', 1), 200, 'talents apply in full at level 1');
});

test('found gear applies in full under the shipped config', () => {
  const stats = new StatSystem({ gearScaling: GameConfig.gearScaling });
  assert.equal(stats.gearEffectiveness(1), 1, 'a sword works the moment you pick it up');
});

/* --- Armour mitigation -------------------------------------------------- */

test('mitigation follows 100 / (100 + armor)', () => {
  assert.equal(StatSystem.mitigation(0), 1);
  assert.equal(StatSystem.mitigation(100), 0.5);
  assert.equal(StatSystem.mitigation(300), 0.25);
});

test('armour has diminishing returns rather than a hard cap', () => {
  const first = StatSystem.mitigation(0) - StatSystem.mitigation(100);
  const second = StatSystem.mitigation(100) - StatSystem.mitigation(200);
  assert.ok(second < first, 'the second 100 armour buys less than the first');
  assert.ok(StatSystem.mitigation(100000) > 0, 'damage is never fully nullified');
});

test('damageAfterArmor applies mitigation and never returns a negative', () => {
  assert.equal(StatSystem.damageAfterArmor(200, 100), 100);
  assert.equal(StatSystem.damageAfterArmor(0, 50), 0);
  assert.equal(StatSystem.damageAfterArmor(-10, 50), 0);
});

test('absurd negative armour cannot invert mitigation', () => {
  assert.ok(StatSystem.mitigation(-1000) > 0);
  assert.ok(Number.isFinite(StatSystem.mitigation(-100)));
});

/* --- Damage rolls -------------------------------------------------------- */

test('a guaranteed crit multiplies damage before armour applies', () => {
  const { amount, crit } = StatSystem.rollDamage(
    { damage: 100, critChance: 1, critMultiplier: 2 },
    100,
    () => 0,
  );
  assert.equal(crit, true);
  assert.equal(amount, 100); // 100 * 2 * (100 / 200)
});

test('a non-crit skips the multiplier but still goes through armour', () => {
  const { amount, crit } = StatSystem.rollDamage(
    { damage: 100, critChance: 0, critMultiplier: 3 },
    100,
    () => 0.99,
  );
  assert.equal(crit, false);
  assert.equal(amount, 50);
});

test('a crit multiplier below 1 cannot reduce damage', () => {
  const { amount } = StatSystem.rollDamage(
    { damage: 100, critChance: 1, critMultiplier: 0.2 },
    0,
    () => 0,
  );
  assert.equal(amount, 100);
});

/* --- The hero is not a growing blob ------------------------------------- */

test('the hero has a fixed body that no stat changes', () => {
  const hero = new Player();
  const radius = hero.radius;
  const stats = fullGearSystem();

  hero.stats.addGroup({ id: 'buff', source: 'inMatch', stats: { maxHealth: { perc: 5 } } });
  stats.recalculate(hero);
  assert.equal(hero.radius, radius, 'power does not make the hero bigger');
  assert.equal(hero.radius, GameConfig.hero.radius);
});

test('movement speed is the stat itself, with no mass term', () => {
  const hero = new Player();
  const stats = fullGearSystem();
  assert.equal(hero.maxSpeed, GameConfig.hero.baseMoveSpeed);

  hero.stats.addGroup({ id: 'boots', source: 'gear', stats: { moveSpeed: { perc: 0.5 } } });
  stats.recalculate(hero);
  assert.ok(Math.abs(hero.maxSpeed - GameConfig.hero.baseMoveSpeed * 1.5) < 1e-9);
});

test('attack interval follows attack speed and respects the floor', () => {
  const hero = new Player();
  const stats = fullGearSystem();
  assert.ok(Math.abs(hero.attackInterval - 1 / GameConfig.hero.baseAttackSpeed) < 1e-9);

  hero.stats.addGroup({ id: 'haste', source: 'inMatch', stats: { attackSpeed: { perc: 99 } } });
  stats.recalculate(hero);
  assert.equal(hero.attackInterval, GameConfig.combat.minAttackInterval, 'clamped, not zero');
});

test('changing max health preserves the current health fraction', () => {
  const hero = new Player();
  const stats = fullGearSystem();
  hero.health = hero.maxHealth / 2;
  const doubled = hero.maxHealth * 2;

  hero.stats.addGroup({ id: 'plate', source: 'gear', stats: { maxHealth: { flat: hero.maxHealth } } });
  stats.recalculate(hero);
  assert.equal(hero.maxHealth, doubled);
  assert.equal(hero.health, doubled / 2, 'still at half health, not half of the old maximum');
});

test('regeneration tops up health and mana, never past the maximum', () => {
  const hero = new Player();
  const stats = new StatSystem({ carriers: () => [hero] });
  stats.recalculate(hero);
  hero.health = 10;
  hero.mana = 0;

  stats.update(1);
  assert.ok(hero.health > 10);
  assert.ok(hero.mana > 0);

  stats.update(1000);
  assert.equal(hero.health, hero.maxHealth);
  assert.equal(hero.mana, hero.maxMana);
});
