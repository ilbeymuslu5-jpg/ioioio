import test from 'node:test';
import assert from 'node:assert/strict';
import { StatSheet, StatSystem } from '../src/systems/StatSystem.ts';
import { MassDecaySystem } from '../src/systems/MassDecaySystem.ts';
import { World } from '../src/core/World.ts';
import { Player } from '../src/entities/Player.ts';
import { GameConfig } from '../src/config/GameConfig.ts';

/* --- Stat pipeline -----------------------------------------------------
   FinalStat = (Base + TalentFlat + GearFlat) * (1 + TalentPerc + GearPerc)
             * (1 + InMatchPerc)
   ---------------------------------------------------------------------- */

function sheetWith(base: number): StatSheet {
  return new StatSheet({ damage: base });
}

/** A system whose gear is always at full effect, isolating the pipeline. */
function fullGearSystem(): StatSystem {
  return new StatSystem({ gearScaling: { startEffectiveness: 1, fullEffectivenessLevel: 1 } });
}

test('base value passes through untouched when nothing modifies it', () => {
  const stats = fullGearSystem();
  assert.equal(stats.computeStat(sheetWith(50), 'damage', 1), 50);
});

test('flat terms are summed before any percentage applies', () => {
  const stats = fullGearSystem();
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'talent-1', source: 'talent', stats: { damage: { flat: 20 } } });
  sheet.addGroup({ id: 'sword', source: 'gear', stats: { damage: { flat: 30 } } });
  assert.equal(stats.computeStat(sheet, 'damage', 1), 150);
});

test('talent and gear percentages are additive with each other', () => {
  const stats = fullGearSystem();
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'talent-1', source: 'talent', stats: { damage: { perc: 0.2 } } });
  sheet.addGroup({ id: 'sword', source: 'gear', stats: { damage: { perc: 0.3 } } });
  // 100 * (1 + 0.2 + 0.3), not 100 * 1.2 * 1.3
  assert.equal(stats.computeStat(sheet, 'damage', 1), 150);
});

test('in-match percentage multiplies the permanent result separately', () => {
  const stats = fullGearSystem();
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'talent-1', source: 'talent', stats: { damage: { perc: 0.5 } } });
  sheet.addGroup({ id: 'rage', source: 'inMatch', stats: { damage: { perc: 0.5 } } });
  // (100) * (1 + 0.5) * (1 + 0.5) = 225, so in-match power compounds on top.
  assert.equal(stats.computeStat(sheet, 'damage', 1), 225);
});

test('the whole pipeline composes as specified', () => {
  const stats = fullGearSystem();
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 't', source: 'talent', stats: { damage: { flat: 10, perc: 0.1 } } });
  sheet.addGroup({ id: 'g', source: 'gear', stats: { damage: { flat: 40, perc: 0.2 } } });
  sheet.addGroup({ id: 'm', source: 'inMatch', stats: { damage: { perc: 0.25 } } });
  // (100 + 10 + 40) * (1 + 0.1 + 0.2) * (1 + 0.25)
  assert.equal(stats.computeStat(sheet, 'damage', 1), 150 * 1.3 * 1.25);
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
  const stats = fullGearSystem();
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'a', source: 'inMatch', stats: { damage: { flat: 10 } } });
  sheet.addGroup({ id: 'b', source: 'inMatch', stats: { damage: { flat: 10 } } });
  sheet.addGroup({ id: 'c', source: 'gear', stats: { damage: { flat: 5 } } });
  sheet.clearSource('inMatch');
  assert.equal(stats.computeStat(sheet, 'damage', 1), 105);
});

/* --- Item cliff barrier ------------------------------------------------ */

test('gear starts a match at 25% effect and reaches 100% by the target level', () => {
  const stats = new StatSystem();
  const { startEffectiveness, fullEffectivenessLevel } = GameConfig.gearScaling;
  assert.equal(stats.gearEffectiveness(1), startEffectiveness);
  assert.equal(stats.gearEffectiveness(fullEffectivenessLevel), 1);
  assert.equal(stats.gearEffectiveness(fullEffectivenessLevel + 20), 1, 'never exceeds 100%');

  const mid = stats.gearEffectiveness(Math.ceil(fullEffectivenessLevel / 2));
  assert.ok(mid > startEffectiveness && mid < 1, 'ramps monotonically in between');
});

test('gear stats are scaled by effectiveness, talent stats are not', () => {
  const stats = new StatSystem();
  const sheet = sheetWith(100);
  sheet.addGroup({ id: 'g', source: 'gear', stats: { damage: { flat: 100 } } });
  const atStart = stats.computeStat(sheet, 'damage', 1);
  const atFull = stats.computeStat(sheet, 'damage', GameConfig.gearScaling.fullEffectivenessLevel);
  assert.equal(atStart, 100 + 100 * GameConfig.gearScaling.startEffectiveness);
  assert.equal(atFull, 200);

  const talentSheet = sheetWith(100);
  talentSheet.addGroup({ id: 't', source: 'talent', stats: { damage: { flat: 100 } } });
  assert.equal(stats.computeStat(talentSheet, 'damage', 1), 200, 'talents apply in full at level 1');
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
  assert.ok(StatSystem.mitigation(-1000) > 0, 'stays positive');
  assert.ok(Number.isFinite(StatSystem.mitigation(-100)), 'no division by zero');
});

/* --- Mass, radius and speed scaling ------------------------------------- */

test('radius follows BaseRadius + sqrt(mass) * 1.2', () => {
  const player = new Player();
  const cfg = GameConfig.player;
  for (const mass of [25, 100, 900]) {
    player.mass = mass;
    player.recalculateDerived();
    assert.ok(
      Math.abs(player.radius - (cfg.baseRadius + Math.sqrt(mass) * cfg.radiusMassFactor)) < 1e-9,
    );
  }
});

test('movement speed follows BaseSpeed / mass ^ 0.18', () => {
  const player = new Player();
  const cfg = GameConfig.player;
  player.mass = 100;
  player.recalculateDerived();
  assert.ok(Math.abs(player.maxSpeed - cfg.baseSpeed / Math.pow(100, cfg.speedMassExponent)) < 1e-9);
});

test('speed buffs multiply the mass-scaled speed', () => {
  const stats = fullGearSystem();
  const player = new Player();
  player.stats.addGroup({ id: 'swift', source: 'inMatch', stats: { baseSpeed: { perc: 0.5 } } });
  const before = player.maxSpeed;
  stats.recalculate(player);
  assert.ok(Math.abs(player.maxSpeed - before * 1.5) < 1e-9);
});

test('growing heavier makes a player bigger and slower', () => {
  const player = new Player();
  const startRadius = player.radius;
  const startSpeed = player.maxSpeed;
  player.addMass(500);
  assert.ok(player.radius > startRadius);
  assert.ok(player.maxSpeed < startSpeed);
});

test('changing max health preserves the current health fraction', () => {
  const stats = fullGearSystem();
  const player = new Player();
  player.health = player.maxHealth / 2;
  player.stats.addGroup({ id: 'plate', source: 'gear', stats: { maxHealth: { flat: 100 } } });
  stats.recalculate(player);
  assert.equal(player.maxHealth, 200);
  assert.equal(player.health, 100, 'still at half health, not half of the old maximum');
});

/* --- Snowball barrier --------------------------------------------------- */

test('mass below the free threshold never decays', () => {
  const world = new World({ width: 500, height: 500, cellSize: 50 });
  const decay = new MassDecaySystem({ world });
  assert.equal(decay.decayRateFor(GameConfig.massDecay.freeMass), 0);
  assert.equal(decay.decayRateFor(0), 0);
});

test('decay grows logarithmically, not linearly, with mass', () => {
  const world = new World({ width: 500, height: 500, cellSize: 50 });
  const decay = new MassDecaySystem({ world });
  const at200 = decay.decayRateFor(200);
  const at400 = decay.decayRateFor(400);
  const at800 = decay.decayRateFor(800);

  assert.ok(at200 > 0);
  assert.ok(at400 > at200, 'heavier still bleeds faster');
  // Doubling mass must add less each time, or the drain would be punitive.
  assert.ok(at800 - at400 < at400 - at200);
  assert.ok(at400 < at200 * 2, 'clearly sub-linear');
});

test('a heavy idle player loses mass every tick but never below the floor', () => {
  const world = new World({ width: 1000, height: 1000, cellSize: 100 });
  const player = world.add(new Player({ x: 500, y: 500 }));
  const decay = new MassDecaySystem({ world });

  player.mass = 400;
  player.recalculateDerived();
  for (let i = 0; i < 60; i++) decay.update(1 / 60);

  assert.ok(player.mass < 400, 'a lead costs upkeep');
  assert.ok(player.massDecayed > 0);

  // Long enough to hit the floor and stay there.
  for (let i = 0; i < 60 * 600; i++) decay.update(1 / 60);
  assert.ok(player.mass >= GameConfig.player.startMass * GameConfig.massDecay.floorMultiplier);
});

test('decay emits an event so the HUD can show the drain', () => {
  const world = new World({ width: 1000, height: 1000, cellSize: 100 });
  const player = world.add(new Player({ x: 500, y: 500 }));
  const decay = new MassDecaySystem({ world });
  player.mass = 500;

  let total = 0;
  world.events.on('mass:decayed', ({ amount }) => { total += amount; });
  for (let i = 0; i < 60; i++) decay.update(1 / 60);
  assert.ok(Math.abs(total - player.massDecayed) < 1e-9);
});
