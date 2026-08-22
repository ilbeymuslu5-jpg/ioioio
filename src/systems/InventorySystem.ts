import { GameConfig } from '../config/GameConfig.ts';
import { ItemFactory } from './ItemFactory.ts';
import { EQUIPMENT_SLOTS } from '../types/index.ts';
import type { Item } from '../config/ItemPool.ts';
import type { EquipmentSlot, InventoryConfig } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { StatSystem } from './StatSystem.ts';

/** One hero's bag and worn gear. */
export interface Inventory {
  readonly backpack: (Item | null)[];
  readonly equipped: Record<EquipmentSlot, Item | null>;
}

export interface InventorySystemOptions {
  world: World;
  stats: StatSystem;
  config?: InventoryConfig;
}

/**
 * Grid inventory and equipment slots.
 *
 * A service rather than a ticking system: it changes state only when the
 * player picks something up or moves an item, so nothing needs to run per
 * tick.
 *
 * Worn items are the `gear` layer of the stat pipeline: equipping adds one
 * modifier group per slot and re-resolves the sheet, so attack speed, armour,
 * movement speed and damage update the instant an item goes on or comes off.
 * Nothing here writes a stat directly.
 */
export class InventorySystem {
  readonly capacity: number;
  private readonly world: World;
  private readonly stats: StatSystem;
  private readonly inventories = new WeakMap<Player, Inventory>();

  constructor({ world, stats, config = GameConfig.inventory }: InventorySystemOptions) {
    this.world = world;
    this.stats = stats;
    this.capacity = config.capacity;
  }

  /** The hero's inventory, created empty on first access. */
  of(hero: Player): Inventory {
    let inventory = this.inventories.get(hero);
    if (!inventory) {
      inventory = {
        backpack: new Array<Item | null>(this.capacity).fill(null),
        equipped: { weapon: null, chest: null, helmet: null, amulet: null },
      };
      this.inventories.set(hero, inventory);
    }
    return inventory;
  }

  /** First free backpack index, or -1 when the bag is full. */
  firstFreeSlot(hero: Player): number {
    return this.of(hero).backpack.indexOf(null);
  }

  countItems(hero: Player): number {
    return this.of(hero).backpack.reduce<number>((total, item) => total + (item ? 1 : 0), 0);
  }

  /**
   * Puts a found item in the bag, or straight on the hero when that slot is
   * empty — a bare slot should never leave an upgrade sitting in the backpack.
   */
  pickUp(hero: Player, item: Item): boolean {
    const inventory = this.of(hero);
    if (inventory.equipped[item.slot] === null) {
      return this.equipItem(hero, item);
    }

    const free = this.firstFreeSlot(hero);
    if (free === -1) {
      this.world.events.emit('inventory:full', { player: hero, item });
      return false;
    }
    inventory.backpack[free] = item;
    this.world.events.emit('inventory:changed', { player: hero });
    return true;
  }

  /** Equips the item at a backpack index, swapping out whatever was worn. */
  equipFromBackpack(hero: Player, index: number): boolean {
    const inventory = this.of(hero);
    const item = inventory.backpack[index];
    if (!item) return false;

    const previous = inventory.equipped[item.slot];
    inventory.backpack[index] = previous ?? null;
    this.wear(hero, item);
    if (previous) {
      this.world.events.emit('item:unequipped', { player: hero, item: previous, slot: previous.slot });
    }
    this.applyGear(hero);
    this.world.events.emit('item:equipped', { player: hero, item, slot: item.slot });
    this.world.events.emit('inventory:changed', { player: hero });
    return true;
  }

  /** Equips a loose item, sending anything it replaces to the backpack. */
  equipItem(hero: Player, item: Item): boolean {
    const inventory = this.of(hero);
    const previous = inventory.equipped[item.slot];
    if (previous) {
      const free = this.firstFreeSlot(hero);
      if (free === -1) {
        this.world.events.emit('inventory:full', { player: hero, item });
        return false;
      }
      inventory.backpack[free] = previous;
      this.world.events.emit('item:unequipped', { player: hero, item: previous, slot: previous.slot });
    }
    this.wear(hero, item);
    this.applyGear(hero);
    this.world.events.emit('item:equipped', { player: hero, item, slot: item.slot });
    this.world.events.emit('inventory:changed', { player: hero });
    return true;
  }

  /** Takes an item off and returns it to the bag. */
  unequip(hero: Player, slot: EquipmentSlot): boolean {
    const inventory = this.of(hero);
    const item = inventory.equipped[slot];
    if (!item) return false;

    const free = this.firstFreeSlot(hero);
    if (free === -1) {
      this.world.events.emit('inventory:full', { player: hero, item });
      return false;
    }
    inventory.backpack[free] = item;
    inventory.equipped[slot] = null;
    this.applyGear(hero);
    this.world.events.emit('item:unequipped', { player: hero, item, slot });
    this.world.events.emit('inventory:changed', { player: hero });
    return true;
  }

  /** Throws a backpack item away. */
  discard(hero: Player, index: number): Item | null {
    const inventory = this.of(hero);
    const item = inventory.backpack[index];
    if (!item) return null;
    inventory.backpack[index] = null;
    this.world.events.emit('inventory:changed', { player: hero });
    return item;
  }

  private wear(hero: Player, item: Item): void {
    this.of(hero).equipped[item.slot] = item;
  }

  /**
   * Rewrites the hero's `gear` modifier groups from what is currently worn,
   * then re-resolves the sheet. One group per slot, so an empty slot simply
   * has no group.
   */
  applyGear(hero: Player): void {
    const { equipped } = this.of(hero);
    for (const slot of EQUIPMENT_SLOTS) {
      const groupId = `gear:${slot}`;
      const item = equipped[slot];
      if (!item) {
        hero.stats.removeGroup(groupId);
        continue;
      }
      hero.stats.addGroup({
        id: groupId,
        source: 'gear',
        stats: ItemFactory.modifiersOf(item),
      });
    }
    this.stats.recalculate(hero);
  }

  /** Every worn item, for the equipment panel. */
  equippedItems(hero: Player): { slot: EquipmentSlot; item: Item | null }[] {
    const { equipped } = this.of(hero);
    return EQUIPMENT_SLOTS.map((slot) => ({ slot, item: equipped[slot] }));
  }
}

export default InventorySystem;
