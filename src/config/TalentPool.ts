import type { StatKey, StatModifier } from '../types/index.ts';

export type TalentCategory = 'offensive' | 'defensive' | 'utility';
export type TalentRarity = 'common' | 'rare' | 'epic' | 'legendary';

/**
 * One in-match rogue-lite upgrade.
 *
 * `perStack` is what a single pick contributes; a talent taken three times
 * contributes three times that. Everything here lands on the player's
 * StatSheet as an `inMatch` modifier group, so it flows through the same
 * pipeline as metagame talents and gear.
 */
export interface TalentDefinition {
  readonly id: string;
  readonly name: string;
  readonly description: string;
  readonly category: TalentCategory;
  readonly rarity: TalentRarity;
  readonly maxStacks: number;
  readonly perStack: Partial<Record<StatKey, Partial<StatModifier>>>;
}

/** Draft weights per rarity, before the luck stat biases them. */
export const RARITY_WEIGHTS: Readonly<Record<TalentRarity, number>> = {
  common: 60,
  rare: 27,
  epic: 10,
  legendary: 3,
};

/** Ordering used for display and for luck biasing (rarest last). */
export const RARITY_ORDER: readonly TalentRarity[] = ['common', 'rare', 'epic', 'legendary'];

export const TALENT_POOL: readonly TalentDefinition[] = [
  /* --- Offensive ------------------------------------------------------ */
  {
    id: 'sharp-edge',
    name: 'Keskin Uç',
    description: 'Hasar %15 artar.',
    category: 'offensive',
    rarity: 'common',
    maxStacks: 5,
    perStack: { damage: { perc: 0.15 } },
  },
  {
    id: 'heavy-strike',
    name: 'Ağır Vuruş',
    description: 'Hasara +6 eklenir.',
    category: 'offensive',
    rarity: 'common',
    maxStacks: 5,
    perStack: { damage: { flat: 6 } },
  },
  {
    id: 'critical-focus',
    name: 'Kritik Odak',
    description: 'Kritik vuruş şansı %8 artar.',
    category: 'offensive',
    rarity: 'rare',
    maxStacks: 4,
    perStack: { critChance: { flat: 0.08 } },
  },
  {
    id: 'lethal-blow',
    name: 'Ölümcül Darbe',
    description: 'Kritik hasar çarpanı %25 artar.',
    category: 'offensive',
    rarity: 'epic',
    maxStacks: 3,
    perStack: { critMultiplier: { perc: 0.25 } },
  },

  /* --- Defensive ------------------------------------------------------ */
  {
    id: 'thick-hide',
    name: 'Kalın Deri',
    description: 'Zırha +25 eklenir.',
    category: 'defensive',
    rarity: 'common',
    maxStacks: 6,
    perStack: { armor: { flat: 25 } },
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
    id: 'regeneration',
    name: 'Rejenerasyon',
    description: 'Saniyede +1.5 can yenilenir.',
    category: 'defensive',
    rarity: 'rare',
    maxStacks: 4,
    perStack: { healthRegen: { flat: 1.5 } },
  },
  {
    id: 'iron-will',
    name: 'Demir İrade',
    description: 'Zırh %40, maksimum can %10 artar.',
    category: 'defensive',
    rarity: 'epic',
    maxStacks: 3,
    perStack: { armor: { perc: 0.4 }, maxHealth: { perc: 0.1 } },
  },

  /* --- Utility -------------------------------------------------------- */
  {
    id: 'magnet',
    name: 'Mıknatıs',
    description: 'Toplama yarıçapı %25 artar.',
    category: 'utility',
    rarity: 'common',
    maxStacks: 5,
    perStack: { magnetRadius: { perc: 0.25 } },
  },
  {
    id: 'agility',
    name: 'Çeviklik',
    description: 'Hareket hızı %10 artar.',
    category: 'utility',
    rarity: 'common',
    maxStacks: 5,
    perStack: { baseSpeed: { perc: 0.1 } },
  },
  {
    id: 'wisdom',
    name: 'Bilgelik',
    description: 'Kazanılan XP %20 artar.',
    category: 'utility',
    rarity: 'rare',
    maxStacks: 4,
    perStack: { xpGain: { perc: 0.2 } },
  },
  {
    id: 'gluttony',
    name: 'Oburluk',
    description: 'Toplanan kütle %25 artar.',
    category: 'utility',
    rarity: 'rare',
    maxStacks: 4,
    perStack: { massGain: { perc: 0.25 } },
  },
  {
    id: 'fortune',
    name: 'Şans Tılsımı',
    description: 'Sonraki seçimlerde nadir yetenek şansı artar.',
    category: 'utility',
    rarity: 'epic',
    maxStacks: 3,
    perStack: { luck: { flat: 1 } },
  },

  /* --- Legendary ------------------------------------------------------ */
  {
    id: 'star-core',
    name: 'Yıldız Çekirdeği',
    description: 'Hasar %30, can %25 ve hız %12 artar.',
    category: 'offensive',
    rarity: 'legendary',
    maxStacks: 2,
    perStack: {
      damage: { perc: 0.3 },
      maxHealth: { perc: 0.25 },
      baseSpeed: { perc: 0.12 },
    },
  },
  {
    id: 'black-hole',
    name: 'Kara Delik',
    description: 'Toplama yarıçapı %80, toplanan kütle %20 artar.',
    category: 'utility',
    rarity: 'legendary',
    maxStacks: 2,
    perStack: { magnetRadius: { perc: 0.8 }, massGain: { perc: 0.2 } },
  },
];

export default TALENT_POOL;
