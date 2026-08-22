import {
  AFFIX_POOL,
  ITEM_BASES,
  RARITY_AFFIX_COUNT,
  RARITY_DROP_WEIGHTS,
  RARITY_LABEL,
} from '../config/ItemPool.ts';
import type { AffixDefinition, Item, ItemAffix, ItemBase } from '../config/ItemPool.ts';
import { pickWeighted, randomRange } from '../utils/MathUtils.ts';
import { RARITY_ORDER } from '../types/index.ts';
import type { EquipmentSlot, Rarity, Rng, StatKey, StatModifier } from '../types/index.ts';

export interface RollOptions {
  /** Drives how strong the numbers roll; the hero's level, in practice. */
  itemLevel?: number;
  luck?: number;
  /** Minimum rarity this drop may be. */
  floor?: Rarity;
  slot?: EquipmentSlot;
}

export interface ItemFactoryOptions {
  rng?: Rng;
  bases?: readonly ItemBase[];
  affixes?: readonly AffixDefinition[];
  /** Extra rarity weight per point of luck, per step above common. */
  luckWeightPerStep?: number;
  /** Fraction of an item's roll gained per item level above 1. */
  levelScaling?: number;
}

let nextItemId = 1;

/**
 * Rolls equipment.
 *
 * A drop picks a base type, then a rarity, then that rarity's number of
 * affixes. Item level lifts every number, and luck shifts the rarity roll
 * toward the rarer tiers exactly as it does for talent cards.
 */
export class ItemFactory {
  private readonly rng: Rng;
  private readonly bases: readonly ItemBase[];
  private readonly affixes: readonly AffixDefinition[];
  private readonly luckWeightPerStep: number;
  private readonly levelScaling: number;

  constructor({
    rng = Math.random,
    bases = ITEM_BASES,
    affixes = AFFIX_POOL,
    luckWeightPerStep = 0.3,
    levelScaling = 0.09,
  }: ItemFactoryOptions = {}) {
    this.rng = rng;
    this.bases = bases;
    this.affixes = affixes;
    this.luckWeightPerStep = luckWeightPerStep;
    this.levelScaling = levelScaling;
  }

  /** Rarity weight after luck, mirroring the talent draft's curve. */
  rarityWeight(rarity: Rarity, luck: number): number {
    const step = RARITY_ORDER.indexOf(rarity);
    return RARITY_DROP_WEIGHTS[rarity] * (1 + Math.max(0, luck) * this.luckWeightPerStep * step);
  }

  rollRarity(luck = 0, floor: Rarity = 'common'): Rarity {
    const minStep = RARITY_ORDER.indexOf(floor);
    const candidates = RARITY_ORDER.filter((rarity) => RARITY_ORDER.indexOf(rarity) >= minStep);
    const entries = candidates.map((rarity) => ({ rarity, weight: this.rarityWeight(rarity, luck) }));
    return pickWeighted(entries, this.rng).rarity;
  }

  roll({ itemLevel = 1, luck = 0, floor = 'common', slot }: RollOptions = {}): Item {
    const pool = slot ? this.bases.filter((base) => base.slot === slot) : this.bases;
    const base = pickWeighted(pool.length > 0 ? pool : this.bases, this.rng);
    const rarity = this.rollRarity(luck, floor);
    const scale = 1 + (itemLevel - 1) * this.levelScaling;

    const implicit: ItemAffix = {
      key: base.implicitKey,
      modifier: this.rollValue(base.implicitRange, scale, base.implicitIsPercent === true),
    };

    const affixes = this.rollAffixes(base.slot, RARITY_AFFIX_COUNT[rarity], scale, base.implicitKey);

    return {
      id: `item-${nextItemId++}`,
      baseId: base.id,
      name: this.nameFor(base, rarity, affixes),
      slot: base.slot,
      rarity,
      itemLevel,
      implicit,
      affixes,
    };
  }

  private rollAffixes(
    slot: EquipmentSlot,
    count: number,
    scale: number,
    implicitKey: StatKey,
  ): ItemAffix[] {
    // Excluding the implicit's stat keeps an item from printing the same line
    // twice, which reads as a bug even though the two would stack correctly.
    const available = this.affixes.filter(
      (affix) => affix.slots.includes(slot) && affix.key !== implicitKey,
    );
    const rolled: ItemAffix[] = [];
    for (let i = 0; i < count && available.length > 0; i++) {
      const affix = pickWeighted(available, this.rng);
      available.splice(available.indexOf(affix), 1); // one line per affix type
      rolled.push({
        key: affix.key,
        modifier: this.rollValue(affix.range, scale, affix.isPercent === true),
      });
    }
    return rolled;
  }

  private rollValue(
    range: readonly [number, number],
    scale: number,
    isPercent: boolean,
  ): StatModifier {
    const raw = randomRange(range[0], range[1], this.rng) * scale;
    // Big flat values read better as integers, but stats that live below 1
    // (crit chance, cooldown reduction, regen, luck) would round away to
    // nothing — so precision is chosen by magnitude, not by kind.
    const value =
      isPercent || Math.abs(raw) < 10 ? Math.round(raw * 1000) / 1000 : Math.round(raw);
    return isPercent ? { flat: 0, perc: value } : { flat: value, perc: 0 };
  }

  /** "Büyülü Demir Zırh" — rarity word plus the base, plus the top affix. */
  private nameFor(base: ItemBase, rarity: Rarity, affixes: readonly ItemAffix[]): string {
    if (rarity === 'common') return base.name;
    const suffix = affixes.length > 0 ? this.affixLabel(affixes[0]!) : '';
    return suffix ? `${base.name} · ${suffix}` : `${RARITY_LABEL[rarity]} ${base.name}`;
  }

  private affixLabel(affix: ItemAffix): string {
    return this.affixes.find((entry) => entry.key === affix.key)?.label ?? '';
  }

  /** Every stat line an item contributes, implicit plus rolled affixes. */
  static modifiersOf(item: Item): Partial<Record<ItemAffix['key'], Partial<StatModifier>>> {
    const stats: Partial<Record<ItemAffix['key'], Partial<StatModifier>>> = {};
    for (const affix of [item.implicit, ...item.affixes]) {
      const existing = stats[affix.key] ?? { flat: 0, perc: 0 };
      stats[affix.key] = {
        flat: (existing.flat ?? 0) + affix.modifier.flat,
        perc: (existing.perc ?? 0) + affix.modifier.perc,
      };
    }
    return stats;
  }
}

export default ItemFactory;
