import test from 'node:test';
import assert from 'node:assert/strict';
import { World } from '../src/core/World.ts';
import { Player } from '../src/entities/Player.ts';
import { StatSystem } from '../src/systems/StatSystem.ts';
import { InventorySystem } from '../src/systems/InventorySystem.ts';
import { ItemFactory } from '../src/systems/ItemFactory.ts';
import { LootSystem } from '../src/systems/LootSystem.ts';
import { ProgressionSystem } from '../src/systems/ProgressionSystem.ts';
import { LootDrop } from '../src/entities/LootDrop.ts';
import { RARITY_AFFIX_COUNT } from '../src/config/ItemPool.ts';
import { createRng } from '../src/utils/MathUtils.ts';
import { RARITY_ORDER } from '../src/types/index.ts';
import type { Item } from '../src/config/ItemPool.ts';
import type { EquipmentSlot, Rarity, StatKey } from '../src/types/index.ts';

function setup(seed = 1) {
  const world = new World({ width: 2000, height: 2000, cellSize: 100 });
  const hero = world.add(new Player({ x: 1000, y: 1000 }));
  const stats = new StatSystem({ carriers: () => world.getByType<Player>('player') });
  const inventory = new InventorySystem({ world, stats });
  const factory = new ItemFactory({ rng: createRng(seed) });
  stats.recalculate(hero);
  return { world, hero, stats, inventory, factory };
}

/** A deterministic item with exactly the stats a test needs. */
function makeItem(slot: EquipmentSlot, stats: Partial<Record<StatKey, number>>, rarity: Rarity = 'magic'): Item {
  const entries = Object.entries(stats) as [StatKey, number][];
  const [firstKey, firstValue] = entries[0] as [StatKey, number];
  return {
    id: `test-${slot}-${Math.random()}`,
    baseId: 'test',
    name: `Test ${slot}`,
    slot,
    rarity,
    itemLevel: 1,
    implicit: { key: firstKey, modifier: { flat: firstValue, perc: 0 } },
    affixes: entries.slice(1).map(([key, value]) => ({ key, modifier: { flat: value, perc: 0 } })),
  };
}

/* --- Rolling items -------------------------------------------------------- */

test('rarity decides how many rolled lines an item carries', () => {
  const { factory } = setup();
  for (const rarity of RARITY_ORDER) {
    const item = factory.roll({ floor: rarity, itemLevel: 1 });
    if (item.rarity !== rarity) continue; // the roll may land above the floor
    assert.equal(item.affixes.length, RARITY_AFFIX_COUNT[rarity]);
  }
});

test('a rarity floor is respected', () => {
  const { factory } = setup(9);
  for (let i = 0; i < 40; i++) {
    const item = factory.roll({ floor: 'epic' });
    assert.ok(RARITY_ORDER.indexOf(item.rarity) >= RARITY_ORDER.indexOf('epic'));
  }
});

test('luck shifts drops toward the rarer tiers', () => {
  const rareCount = (luck: number): number => {
    const factory = new ItemFactory({ rng: createRng(31) });
    let rare = 0;
    for (let i = 0; i < 400; i++) {
      if (factory.rollRarity(luck) !== 'common') rare++;
    }
    return rare;
  };
  assert.ok(rareCount(4) > rareCount(0));
});

test('item level lifts the numbers an item rolls', () => {
  const low = new ItemFactory({ rng: createRng(12) }).roll({ itemLevel: 1, slot: 'chest' });
  const high = new ItemFactory({ rng: createRng(12) }).roll({ itemLevel: 30, slot: 'chest' });
  assert.equal(low.baseId, high.baseId, 'same seed, same base type');
  const lowValue = low.implicit.modifier.flat + low.implicit.modifier.perc;
  const highValue = high.implicit.modifier.flat + high.implicit.modifier.perc;
  assert.ok(highValue > lowValue);
});

test('affixes only appear on slots that allow them', () => {
  const factory = new ItemFactory({ rng: createRng(77) });
  for (let i = 0; i < 60; i++) {
    const item = factory.roll({ floor: 'legendary', slot: 'helmet' });
    assert.equal(item.slot, 'helmet');
    assert.equal(new Set(item.affixes.map((a) => a.key)).size, item.affixes.length, 'no duplicate lines');
  }
});

test('modifiersOf merges the implicit with every affix', () => {
  const item = makeItem('weapon', { damage: 10, critChance: 0.05 });
  const modifiers = ItemFactory.modifiersOf(item);
  assert.equal(modifiers.damage?.flat, 10);
  assert.equal(modifiers.critChance?.flat, 0.05);
});

test('two lines on the same stat add together', () => {
  const item: Item = {
    ...makeItem('weapon', { damage: 10 }),
    affixes: [{ key: 'damage', modifier: { flat: 5, perc: 0 } }],
  };
  assert.equal(ItemFactory.modifiersOf(item).damage?.flat, 15);
});

/* --- Equipping ------------------------------------------------------------ */

test('equipping an item updates the hero stats immediately', () => {
  const { hero, inventory } = setup();
  const before = hero.stats.resolved.armor;
  inventory.equipItem(hero, makeItem('chest', { armor: 40 }));
  assert.equal(hero.stats.resolved.armor, before + 40);
});

test('unequipping takes the stats straight back off', () => {
  const { hero, inventory } = setup();
  const before = hero.stats.resolved.damage;
  inventory.equipItem(hero, makeItem('weapon', { damage: 25 }));
  assert.equal(hero.stats.resolved.damage, before + 25);

  inventory.unequip(hero, 'weapon');
  assert.equal(hero.stats.resolved.damage, before);
  assert.equal(inventory.of(hero).equipped.weapon, null);
});

test('gear feeds through to derived combat values', () => {
  const { hero, inventory } = setup();
  const speedBefore = hero.maxSpeed;
  const intervalBefore = hero.attackInterval;

  inventory.equipItem(hero, {
    ...makeItem('chest', { moveSpeed: 0 }),
    implicit: { key: 'moveSpeed', modifier: { flat: 0, perc: 0.2 } },
    affixes: [],
  });
  inventory.equipItem(hero, {
    ...makeItem('weapon', { attackSpeed: 0 }),
    implicit: { key: 'attackSpeed', modifier: { flat: 0, perc: 0.5 } },
    affixes: [],
  });

  assert.ok(Math.abs(hero.maxSpeed - speedBefore * 1.2) < 1e-9);
  assert.ok(hero.attackInterval < intervalBefore, 'the hero swings faster');
});

test('equipping into a full slot swaps the old item into the bag', () => {
  const { hero, inventory } = setup();
  const first = makeItem('weapon', { damage: 10 });
  const second = makeItem('weapon', { damage: 30 });

  inventory.equipItem(hero, first);
  inventory.equipItem(hero, second);

  assert.equal(inventory.of(hero).equipped.weapon, second);
  assert.ok(inventory.of(hero).backpack.includes(first));
  assert.equal(hero.stats.resolved.damage, hero.stats.base.damage + 30, 'only the worn item counts');
});

test('a found item goes straight on when its slot is bare', () => {
  const { hero, inventory } = setup();
  const item = makeItem('helmet', { armor: 8 });
  assert.equal(inventory.pickUp(hero, item), true);
  assert.equal(inventory.of(hero).equipped.helmet, item);
  assert.equal(inventory.countItems(hero), 0, 'nothing sitting in the bag');
});

test('a found item goes to the bag when the slot is taken', () => {
  const { hero, inventory } = setup();
  inventory.pickUp(hero, makeItem('helmet', { armor: 8 }));
  const second = makeItem('helmet', { armor: 12 });
  inventory.pickUp(hero, second);
  assert.ok(inventory.of(hero).backpack.includes(second));
});

test('equipping from the bag swaps both ways', () => {
  const { hero, inventory } = setup();
  const worn = makeItem('amulet', { critChance: 0.02 });
  const spare = makeItem('amulet', { critChance: 0.09 });
  inventory.pickUp(hero, worn);
  inventory.pickUp(hero, spare);

  const index = inventory.of(hero).backpack.indexOf(spare);
  assert.equal(inventory.equipFromBackpack(hero, index), true);
  assert.equal(inventory.of(hero).equipped.amulet, spare);
  assert.equal(inventory.of(hero).backpack[index], worn, 'the old one takes the freed cell');
});

test('a full bag refuses new items instead of dropping them silently', () => {
  const world = new World({ width: 500, height: 500, cellSize: 50 });
  const hero = world.add(new Player({ x: 250, y: 250 }));
  const stats = new StatSystem({ carriers: () => [hero] });
  const inventory = new InventorySystem({ world, stats, config: { capacity: 2 } });

  let refused = 0;
  world.events.on('inventory:full', () => refused++);

  inventory.pickUp(hero, makeItem('helmet', { armor: 1 })); // worn
  assert.equal(inventory.pickUp(hero, makeItem('helmet', { armor: 2 })), true);
  assert.equal(inventory.pickUp(hero, makeItem('helmet', { armor: 3 })), true);
  assert.equal(inventory.pickUp(hero, makeItem('helmet', { armor: 4 })), false);
  assert.equal(refused, 1);
});

test('each slot contributes its own group, so four items all count', () => {
  const { hero, inventory } = setup();
  const baseArmor = hero.stats.resolved.armor;
  inventory.equipItem(hero, makeItem('chest', { armor: 20 }));
  inventory.equipItem(hero, makeItem('helmet', { armor: 10 }));
  inventory.equipItem(hero, makeItem('amulet', { armor: 5 }));
  inventory.equipItem(hero, makeItem('weapon', { damage: 7 }));

  assert.equal(hero.stats.resolved.armor, baseArmor + 35);
  assert.equal(hero.stats.groupCount, 4);
});

/* --- Loot on the floor ---------------------------------------------------- */

function lootSetup(seed = 1) {
  const base = setup(seed);
  const progression = new ProgressionSystem({ world: base.world, stats: base.stats });
  progression.attach();
  const loot = new LootSystem({
    world: base.world,
    inventory: base.inventory,
    progression,
  });
  return { ...base, progression, loot };
}

test('gold on the floor lands in the purse, scaled by goldGain', () => {
  const { world, hero, loot } = lootSetup();
  hero.stats.resolved.goldGain = 2;
  world.add(new LootDrop({ kind: 'gold', value: 10, x: hero.position.x, y: hero.position.y }));

  loot.update(1 / 60);
  assert.equal(hero.gold, 20);
  assert.equal(world.countOfType('loot'), 0);
});

test('a soul shard grants XP and can level the hero', () => {
  const { world, hero, loot } = lootSetup();
  world.add(new LootDrop({ kind: 'soul', value: 500, x: hero.position.x, y: hero.position.y }));

  loot.update(1 / 60);
  assert.ok(hero.level > 1);
});

test('a chest hands its item to the inventory', () => {
  const { world, hero, loot, inventory, factory } = lootSetup();
  const item = factory.roll({ slot: 'weapon' });
  world.add(new LootDrop({ kind: 'chest', item, x: hero.position.x, y: hero.position.y }));

  loot.update(1 / 60);
  assert.equal(inventory.of(hero).equipped.weapon, item);
});

test('loot inside the pickup radius is pulled in', () => {
  const { world, hero, loot } = lootSetup();
  const drop = world.add(
    new LootDrop({ kind: 'gold', value: 1, x: hero.position.x + hero.pickupRadius * 0.8, y: hero.position.y }),
  );

  loot.update(1 / 60);
  assert.equal(drop.attractedTo, hero);
  assert.ok(drop.velocity.x < 0, 'pulled back toward the hero');
});

test('loot outside the pickup radius is left alone', () => {
  const { world, hero, loot } = lootSetup();
  const drop = world.add(
    new LootDrop({ kind: 'gold', value: 1, x: hero.position.x + hero.pickupRadius + 60, y: hero.position.y }),
  );
  loot.update(1 / 60);
  assert.equal(drop.attractedTo, null);
  assert.equal(world.countOfType('loot'), 1);
});

test('the magnet never overshoots the hero in one tick', () => {
  const { world, hero, loot } = lootSetup();
  const dt = 1 / 60;
  const distance = hero.radius + 4;
  const drop = world.add(
    new LootDrop({ kind: 'gold', value: 1, x: hero.position.x + distance, y: hero.position.y }),
  );

  loot.update(dt);
  if (drop.alive) assert.ok(Math.abs(drop.velocity.x) * dt <= distance + 1e-9);
});

test('unclaimed loot expires instead of carpeting the arena', () => {
  const { world, hero, loot } = lootSetup();
  const drop = world.add(new LootDrop({ kind: 'gold', value: 1, x: 100, y: 100 }));
  void hero;

  drop.lifetime = 0.05;
  drop.update(0.1);
  loot.update(1 / 60);
  assert.equal(world.countOfType('loot'), 0);
});

test('a bigger pickup radius really does reach further', () => {
  const { world, hero, loot } = lootSetup();
  hero.stats.resolved.pickupRadius = 400;
  const drop = world.add(new LootDrop({ kind: 'gold', value: 1, x: hero.position.x + 300, y: hero.position.y }));

  loot.update(1 / 60);
  assert.equal(drop.attractedTo, hero);
});

/* --- Regressions the equipment panel exposed ------------------------------ */

test('sub-1 affix values survive rolling instead of rounding to zero', () => {
  const factory = new ItemFactory({ rng: createRng(2) });
  for (let i = 0; i < 60; i++) {
    const item = factory.roll({ floor: 'legendary', itemLevel: 5 });
    for (const affix of [item.implicit, ...item.affixes]) {
      const value = affix.modifier.flat + affix.modifier.perc;
      assert.ok(value > 0, `${affix.key} rolled ${value}, which grants nothing`);
    }
  }
});

test('an affix never repeats the stat the base type already grants', () => {
  const factory = new ItemFactory({ rng: createRng(8) });
  for (let i = 0; i < 80; i++) {
    const item = factory.roll({ floor: 'legendary' });
    const keys = [item.implicit.key, ...item.affixes.map((a) => a.key)];
    assert.equal(new Set(keys).size, keys.length, `${item.name} lists a stat twice`);
  }
});

test('every stat an item can roll is actually reachable through the pipeline', () => {
  // A stat whose base is 0 cannot be raised by a percentage: (0 + 0) * 1.x = 0.
  // Any affix on such a stat must be flat, or it silently grants nothing.
  const { hero, inventory, stats } = setup();
  const factory = new ItemFactory({ rng: createRng(15) });

  for (let i = 0; i < 120; i++) {
    const item = factory.roll({ floor: 'legendary', itemLevel: 10 });
    for (const affix of [item.implicit, ...item.affixes]) {
      const before = hero.stats.resolved[affix.key];
      assert.equal(
        inventory.equipItem(hero, { ...item, affixes: [affix], implicit: affix }),
        true,
        'the item was actually worn',
      );
      const after = hero.stats.resolved[affix.key];
      assert.ok(
        after > before,
        `${affix.key} did not move (${before} -> ${after}); a percentage on a zero base?`,
      );

      inventory.unequip(hero, item.slot);
      // Empty the bag, or it fills up and later equips silently refuse.
      const { backpack } = inventory.of(hero);
      for (let cell = 0; cell < backpack.length; cell++) inventory.discard(hero, cell);
    }
  }
  stats.recalculate(hero);
});

test('cooldown reduction from gear actually reaches the hero', () => {
  const { hero, inventory } = setup();
  assert.equal(hero.stats.resolved.cooldownReduction, 0);
  inventory.equipItem(hero, makeItem('amulet', { cooldownReduction: 0.15 }));
  assert.ok(Math.abs(hero.stats.resolved.cooldownReduction - 0.15) < 1e-9);
});
