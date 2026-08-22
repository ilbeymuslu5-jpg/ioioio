import type { Rarity, StatKey, StatModifier } from '../types/index.ts';

export type TalentCategory = 'offensive' | 'defensive' | 'utility';

/**
 * Talents that grant an active ability rather than raw numbers.
 * AbilitySystem drives one instance per owned id; stacks make it stronger.
 */
export type AbilityId = 'whirlwind-blades' | 'holy-lightning' | 'fire-trail';

/**
 * One in-match rogue-lite upgrade.
 *
 * `perStack` is what a single pick contributes; a talent taken three times
 * contributes three times that. Everything here lands on the hero's StatSheet
 * as an `inMatch` modifier group, so it flows through the same pipeline as
 * equipment. A talent may additionally grant an `ability`, which the
 * AbilitySystem picks up.
 */
export interface TalentDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: TalentCategory;
  readonly rarity: Rarity;
  readonly maxStacks: number;
  readonly perStack: Partial<Record<StatKey, Partial<StatModifier>>>;
  readonly ability?: AbilityId;
}

/** Draft weights per rarity, before the luck stat biases them. */
export const RARITY_WEIGHTS: Readonly<Record<Rarity, number>> = {
  common: 60,
  magic: 27,
  epic: 10,
  legendary: 3,
};

export const TALENT_POOL: readonly TalentDefinition[] = [
  /* --- Abilities ------------------------------------------------------ */
  {
    id: 'whirlwind-blades',
    name: 'Kasırga Kılıçları',
    description: 'Etrafında dönen hayalet kılıçlar değdiği düşmanı biçer.',
    category: 'offensive',
    rarity: 'epic',
    maxStacks: 4,
    perStack: {},
    ability: 'whirlwind-blades',
  },
  {
    id: 'holy-lightning',
    name: 'Kutsal Şimşek',
    description: 'Belirli aralıklarla en yakın düşmanın tepesine yıldırım düşer.',
    category: 'offensive',
    rarity: 'epic',
    maxStacks: 4,
    perStack: {},
    ability: 'holy-lightning',
  },
  {
    id: 'fire-trail',
    name: 'Ateş İzi',
    description: 'Yürüdüğün yerde düşmanları yakan alevler bırakırsın.',
    category: 'offensive',
    rarity: 'magic',
    maxStacks: 4,
    perStack: {},
    ability: 'fire-trail',
  },

  /* --- Warrior discipline and other stat talents ---------------------- */
  {
    id: 'knight-discipline',
    name: 'Şövalye Disiplini',
    description: 'Zırh %20, maksimum can +50 artar.',
    category: 'defensive',
    rarity: 'magic',
    maxStacks: 4,
    perStack: { armor: { perc: 0.2 }, maxHealth: { flat: 50 } },
  },
  {
    id: 'sharpened-steel',
    name: 'Bilenmiş Çelik',
    description: 'Hasar %15 artar.',
    category: 'offensive',
    rarity: 'common',
    maxStacks: 5,
    perStack: { damage: { perc: 0.15 } },
  },
  {
    id: 'swift-hands',
    name: 'Hızlı Eller',
    description: 'Saldırı hızı %12 artar.',
    category: 'offensive',
    rarity: 'common',
    maxStacks: 5,
    perStack: { attackSpeed: { perc: 0.12 } },
  },
  {
    id: 'long-reach',
    name: 'Uzun Menzil',
    description: 'Kılıç erimi +10 artar.',
    category: 'offensive',
    rarity: 'common',
    maxStacks: 4,
    perStack: { attackRange: { flat: 10 } },
  },
  {
    id: 'assassins-eye',
    name: 'Suikastçı Gözü',
    description: 'Kritik vuruş şansı %8 artar.',
    category: 'offensive',
    rarity: 'magic',
    maxStacks: 4,
    perStack: { critChance: { flat: 0.08 } },
  },
  {
    id: 'executioner',
    name: 'Cellat',
    description: 'Kritik hasar çarpanı %25 artar.',
    category: 'offensive',
    rarity: 'epic',
    maxStacks: 3,
    perStack: { critMultiplier: { perc: 0.25 } },
  },
  {
    id: 'iron-hide',
    name: 'Demir Post',
    description: 'Zırha +30 eklenir.',
    category: 'defensive',
    rarity: 'common',
    maxStacks: 6,
    perStack: { armor: { flat: 30 } },
  },
  {
    id: 'vitality',
    name: 'Yaşam Gücü',
    description: 'Maksimum can %20 artar.',
    category: 'defensive',
    rarity: 'common',
    maxStacks: 5,
    perStack: { maxHealth: { perc: 0.2 } },
  },
  {
    id: 'second-wind',
    name: 'İkinci Nefes',
    description: 'Saniyede +1.5 can yenilenir.',
    category: 'defensive',
    rarity: 'magic',
    maxStacks: 4,
    perStack: { healthRegen: { flat: 1.5 } },
  },
  {
    id: 'battle-trance',
    name: 'Savaş Transı',
    description: 'Mana yenilenmesi +5, maksimum mana +25 artar.',
    category: 'defensive',
    rarity: 'common',
    maxStacks: 4,
    perStack: { manaRegen: { flat: 5 }, maxMana: { flat: 25 } },
  },
  {
    id: 'fleet-foot',
    name: 'Yeleli Ayak',
    description: 'Hareket hızı %10 artar.',
    category: 'utility',
    rarity: 'common',
    maxStacks: 5,
    perStack: { moveSpeed: { perc: 0.1 } },
  },
  {
    id: 'scavenger',
    name: 'Çapulcu',
    description: 'Toplama yarıçapı %30, altın kazancı %15 artar.',
    category: 'utility',
    rarity: 'common',
    maxStacks: 4,
    perStack: { pickupRadius: { perc: 0.3 }, goldGain: { perc: 0.15 } },
  },
  {
    id: 'runic-focus',
    name: 'Runik Odak',
    description: 'Yetenek bekleme süreleri %10 kısalır.',
    category: 'utility',
    rarity: 'magic',
    maxStacks: 4,
    // Cooldown reduction has a base of 0, so it has to be granted flat.
    perStack: { cooldownReduction: { flat: 0.1 } },
  },
  {
    id: 'ancient-lore',
    name: 'Kadim Bilgi',
    description: 'Kazanılan XP %20 artar.',
    category: 'utility',
    rarity: 'magic',
    maxStacks: 4,
    perStack: { xpGain: { perc: 0.2 } },
  },
  {
    id: 'gamblers-charm',
    name: 'Kumarbaz Tılsımı',
    description: 'Nadir yetenek ve eşya şansı artar.',
    category: 'utility',
    rarity: 'epic',
    maxStacks: 3,
    perStack: { luck: { flat: 1 } },
  },

  /* --- Legendary ------------------------------------------------------ */
  {
    id: 'dragonheart',
    name: 'Ejder Yüreği',
    description: 'Hasar %30, can %25 ve hareket hızı %12 artar.',
    category: 'offensive',
    rarity: 'legendary',
    maxStacks: 2,
    perStack: {
      damage: { perc: 0.3 },
      maxHealth: { perc: 0.25 },
      moveSpeed: { perc: 0.12 },
    },
  },
  {
    id: 'avatar-of-war',
    name: 'Savaş Tanrısı',
    description: 'Saldırı hızı %25, kritik şansı %10, zırh %25 artar.',
    category: 'offensive',
    rarity: 'legendary',
    maxStacks: 2,
    perStack: {
      attackSpeed: { perc: 0.25 },
      critChance: { flat: 0.1 },
      armor: { perc: 0.25 },
    },
  },
];

export default TALENT_POOL;
