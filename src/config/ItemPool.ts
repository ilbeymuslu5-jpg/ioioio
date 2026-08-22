import type { EquipmentSlot, Rarity, StatKey, StatModifier } from '../types/index.ts';

/*
 * Note on percentages: a `perc` modifier multiplies the stat's running total,
 * so it does nothing to a stat whose base is 0. Cooldown reduction and luck
 * start at 0 and are therefore always granted flat.
 */

/** A rolled modifier line on an item, e.g. "+12 Zırh". */
export interface ItemAffix {
  readonly key: StatKey;
  readonly modifier: StatModifier;
}

/** An item instance in the world or in a bag. */
export interface Item {
  readonly id: string;
  readonly baseId: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly rarity: Rarity;
  readonly itemLevel: number;
  /** Guaranteed line from the base type (a sword always carries damage). */
  readonly implicit: ItemAffix;
  /** Rolled lines; count depends on rarity. */
  readonly affixes: readonly ItemAffix[];
}

export interface ItemBase {
  readonly id: string;
  readonly name: string;
  readonly slot: EquipmentSlot;
  readonly weight: number;
  readonly implicitKey: StatKey;
  /** Implicit value range at item level 1, scaled by item level. */
  readonly implicitRange: readonly [number, number];
  readonly implicitIsPercent?: boolean;
}

/** Rarity determines how many rolled lines an item carries. */
export const RARITY_AFFIX_COUNT: Readonly<Record<Rarity, number>> = {
  common: 0,
  magic: 1,
  epic: 2,
  legendary: 3,
};

export const RARITY_LABEL: Readonly<Record<Rarity, string>> = {
  common: 'Yaygın',
  magic: 'Büyülü',
  epic: 'Destansı',
  legendary: 'Efsanevi',
};

/** Draft weights for a dropped item's rarity, before luck biases them. */
export const RARITY_DROP_WEIGHTS: Readonly<Record<Rarity, number>> = {
  common: 58,
  magic: 30,
  epic: 10,
  legendary: 2,
};

export const ITEM_BASES: readonly ItemBase[] = [
  { id: 'short-sword', name: 'Kısa Kılıç', slot: 'weapon', weight: 34, implicitKey: 'damage', implicitRange: [6, 11] },
  { id: 'war-axe', name: 'Savaş Baltası', slot: 'weapon', weight: 22, implicitKey: 'damage', implicitRange: [10, 17] },
  { id: 'rapier', name: 'Meç', slot: 'weapon', weight: 18, implicitKey: 'attackSpeed', implicitRange: [0.12, 0.24], implicitIsPercent: true },

  { id: 'leather-vest', name: 'Deri Yelek', slot: 'chest', weight: 30, implicitKey: 'armor', implicitRange: [8, 16] },
  { id: 'iron-plate', name: 'Demir Zırh', slot: 'chest', weight: 24, implicitKey: 'armor', implicitRange: [18, 30] },
  { id: 'ranger-cloak', name: 'Korucu Pelerini', slot: 'chest', weight: 14, implicitKey: 'moveSpeed', implicitRange: [0.06, 0.12], implicitIsPercent: true },

  { id: 'iron-helm', name: 'Demir Miğfer', slot: 'helmet', weight: 30, implicitKey: 'armor', implicitRange: [6, 12] },
  { id: 'horned-helm', name: 'Boynuzlu Miğfer', slot: 'helmet', weight: 18, implicitKey: 'maxHealth', implicitRange: [14, 28] },

  { id: 'bone-charm', name: 'Kemik Tılsımı', slot: 'amulet', weight: 26, implicitKey: 'critChance', implicitRange: [0.03, 0.07] },
  { id: 'soul-pendant', name: 'Ruh Kolyesi', slot: 'amulet', weight: 20, implicitKey: 'xpGain', implicitRange: [0.08, 0.18], implicitIsPercent: true },
  { id: 'ember-ring', name: 'Kor Yüzük', slot: 'amulet', weight: 16, implicitKey: 'cooldownReduction', implicitRange: [0.05, 0.11] },
];

/** One rollable modifier line, with the slots it may appear on. */
export interface AffixDefinition {
  readonly id: string;
  readonly key: StatKey;
  readonly label: string;
  readonly weight: number;
  readonly slots: readonly EquipmentSlot[];
  readonly range: readonly [number, number];
  readonly isPercent?: boolean;
}

export const AFFIX_POOL: readonly AffixDefinition[] = [
  { id: 'of-might', key: 'damage', label: 'Kudret', weight: 22, slots: ['weapon', 'amulet'], range: [4, 12] },
  { id: 'of-haste', key: 'attackSpeed', label: 'Hız', weight: 16, slots: ['weapon', 'amulet'], range: [0.06, 0.16], isPercent: true },
  { id: 'of-reach', key: 'attackRange', label: 'Erim', weight: 10, slots: ['weapon'], range: [6, 16] },
  { id: 'of-precision', key: 'critChance', label: 'İsabet', weight: 14, slots: ['weapon', 'helmet', 'amulet'], range: [0.02, 0.06] },
  { id: 'of-cruelty', key: 'critMultiplier', label: 'Gaddarlık', weight: 10, slots: ['weapon', 'amulet'], range: [0.1, 0.28], isPercent: true },
  { id: 'of-the-bear', key: 'maxHealth', label: 'Ayı', weight: 20, slots: ['chest', 'helmet', 'amulet'], range: [12, 34] },
  { id: 'of-the-turtle', key: 'armor', label: 'Kaplumbağa', weight: 20, slots: ['chest', 'helmet'], range: [6, 20] },
  { id: 'of-mending', key: 'healthRegen', label: 'Şifa', weight: 12, slots: ['chest', 'amulet'], range: [0.4, 1.4] },
  { id: 'of-the-wind', key: 'moveSpeed', label: 'Rüzgar', weight: 14, slots: ['chest', 'helmet'], range: [0.04, 0.1], isPercent: true },
  { id: 'of-focus', key: 'cooldownReduction', label: 'Odak', weight: 10, slots: ['helmet', 'amulet'], range: [0.03, 0.09] },
  { id: 'of-the-magnet', key: 'pickupRadius', label: 'Cazibe', weight: 10, slots: ['chest', 'amulet'], range: [0.1, 0.3], isPercent: true },
  { id: 'of-greed', key: 'goldGain', label: 'Açgözlülük', weight: 10, slots: ['helmet', 'amulet'], range: [0.08, 0.22], isPercent: true },
  { id: 'of-wisdom', key: 'xpGain', label: 'Bilgelik', weight: 8, slots: ['helmet', 'amulet'], range: [0.06, 0.16], isPercent: true },
  { id: 'of-mana', key: 'maxMana', label: 'Mana', weight: 10, slots: ['chest', 'helmet', 'amulet'], range: [10, 30] },
  { id: 'of-fortune', key: 'luck', label: 'Talih', weight: 5, slots: ['amulet'], range: [0.5, 1.5] },
];

export default ITEM_BASES;
