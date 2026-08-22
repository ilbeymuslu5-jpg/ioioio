import { GameConfig } from '../config/GameConfig.ts';
import { clamp } from '../utils/MathUtils.ts';
import type { GameSystem, GearScalingConfig, PartialStatBlock, Rng, StatBlock, StatKey, StatModifier, StatSource } from '../types/index.ts';

export const STAT_KEYS: readonly StatKey[] = [
  'maxHealth',
  'healthRegen',
  'maxMana',
  'manaRegen',
  'armor',
  'damage',
  'attackSpeed',
  'attackRange',
  'critChance',
  'critMultiplier',
  'moveSpeed',
  'pickupRadius',
  'cooldownReduction',
  'xpGain',
  'goldGain',
  'luck',
];

/** A named bundle of modifiers: one talent node, one equipped item, one buff. */
export interface ModifierGroup {
  readonly id: string;
  readonly source: StatSource;
  readonly stats: Partial<Record<StatKey, Partial<StatModifier>>>;
}

function emptyModifier(): StatModifier {
  return { flat: 0, perc: 0 };
}

function zeroBlock(): StatBlock {
  return {
    maxHealth: 0,
    healthRegen: 0,
    maxMana: 0,
    manaRegen: 0,
    armor: 0,
    damage: 0,
    attackSpeed: 0,
    attackRange: 0,
    critChance: 0,
    critMultiplier: 0,
    moveSpeed: 0,
    pickupRadius: 0,
    cooldownReduction: 0,
    xpGain: 0,
    goldGain: 0,
    luck: 0,
  };
}

/**
 * Per-entity stat container: base values plus every modifier group acting on
 * them, resolved through the pipeline below.
 *
 * Groups are added and removed by id, which is what equipping/unequipping gear
 * (Phase 3) and re-rolling in-match talents (Phase 2) need.
 */
export class StatSheet {
  readonly base: StatBlock;
  readonly resolved: StatBlock;
  private readonly groups = new Map<string, ModifierGroup>();
  /** Bumped on every change so systems can skip redundant recalculation. */
  version = 0;

  constructor(base: PartialStatBlock = {}) {
    this.base = { ...zeroBlock(), ...base };
    this.resolved = { ...this.base };
  }

  setBase(key: StatKey, value: number): this {
    this.base[key] = value;
    this.version++;
    return this;
  }

  addGroup(group: ModifierGroup): this {
    this.groups.set(group.id, group);
    this.version++;
    return this;
  }

  removeGroup(id: string): boolean {
    const removed = this.groups.delete(id);
    if (removed) this.version++;
    return removed;
  }

  hasGroup(id: string): boolean {
    return this.groups.has(id);
  }

  clearSource(source: StatSource): this {
    for (const [id, group] of this.groups) {
      if (group.source === source) this.groups.delete(id);
    }
    this.version++;
    return this;
  }

  /** Summed contribution of one source for one stat. */
  totalFor(source: StatSource, key: StatKey): StatModifier {
    const total = emptyModifier();
    for (const group of this.groups.values()) {
      if (group.source !== source) continue;
      const entry = group.stats[key];
      if (!entry) continue;
      total.flat += entry.flat ?? 0;
      total.perc += entry.perc ?? 0;
    }
    return total;
  }

  get groupCount(): number {
    return this.groups.size;
  }
}

export interface StatCarrier {
  readonly stats: StatSheet;
  /** In-match level, which drives how much of the metagame gear counts. */
  readonly level: number;
  /** Called after resolution so derived values (radius, speed) can refresh. */
  onStatsResolved?(): void;
}

export interface StatSystemOptions<TContext> {
  carriers?: () => Iterable<StatCarrier>;
  gearScaling?: GearScalingConfig;
  context?: TContext;
}

/**
 * Owns the stat pipeline, armour mitigation and health regeneration —
 * the single place allowed to decide what a number finally is.
 */
export class StatSystem<TContext = unknown> implements GameSystem<TContext> {
  readonly name = 'stats';
  private readonly carriers: () => Iterable<StatCarrier>;
  private readonly gearScaling: GearScalingConfig;

  constructor({
    carriers = () => [],
    gearScaling = GameConfig.gearScaling,
  }: StatSystemOptions<TContext> = {}) {
    this.carriers = carriers;
    this.gearScaling = gearScaling;
  }

  /**
   * Item-cliff barrier: metagame gear starts a match at 25% of its power and
   * reaches 100% as in-match level climbs, so gear supplements a match instead
   * of deciding it at minute one.
   */
  gearEffectiveness(level: number): number {
    const { startEffectiveness, fullEffectivenessLevel } = this.gearScaling;
    if (fullEffectivenessLevel <= 1) return 1;
    const progress = (level - 1) / (fullEffectivenessLevel - 1);
    return clamp(startEffectiveness + (1 - startEffectiveness) * progress, startEffectiveness, 1);
  }

  /**
   * The stat pipeline from the design spec:
   *
   *   FinalStat = (Base + TalentFlat + GearFlat)
   *             * (1 + TalentPerc + GearPerc)
   *             * (1 + InMatchPerc)
   *
   * Gear terms are scaled by `gearEffectiveness` first. In-match flat points
   * join the first bracket; with none granted this reduces exactly to the
   * formula above.
   */
  computeStat(sheet: StatSheet, key: StatKey, level: number): number {
    const effectiveness = this.gearEffectiveness(level);
    const talent = sheet.totalFor('talent', key);
    const gear = sheet.totalFor('gear', key);
    const inMatch = sheet.totalFor('inMatch', key);

    const flat = sheet.base[key] + talent.flat + gear.flat * effectiveness + inMatch.flat;
    const permanentPerc = 1 + talent.perc + gear.perc * effectiveness;
    const inMatchPerc = 1 + inMatch.perc;
    return flat * permanentPerc * inMatchPerc;
  }

  /** Resolves every stat for one carrier and notifies it. */
  recalculate(carrier: StatCarrier): StatBlock {
    const { stats, level } = carrier;
    for (const key of STAT_KEYS) {
      stats.resolved[key] = this.computeStat(stats, key, level);
    }
    carrier.onStatsResolved?.();
    return stats.resolved;
  }

  recalculateAll(): void {
    for (const carrier of this.carriers()) this.recalculate(carrier);
  }

  /**
   * Armour with diminishing returns:
   *   Mitigation = 100 / (100 + Armor)
   * Armour is clamped just above -100 so mitigation can never invert.
   */
  static mitigation(armor: number): number {
    return 100 / (100 + Math.max(armor, -99));
  }

  /** Damage that actually lands after the target's armour. */
  static damageAfterArmor(incoming: number, armor: number): number {
    return Math.max(0, incoming) * StatSystem.mitigation(armor);
  }

  /**
   * A full damage roll: crit chance, crit multiplier, then armour.
   * One path for every damage source, so nothing can bypass mitigation.
   */
  static rollDamage(
    attacker: Pick<StatBlock, 'damage' | 'critChance' | 'critMultiplier'>,
    targetArmor: number,
    rng: Rng = Math.random,
  ): { amount: number; crit: boolean } {
    const crit = rng() < clamp(attacker.critChance, 0, 1);
    const raw = attacker.damage * (crit ? Math.max(1, attacker.critMultiplier) : 1);
    return { amount: StatSystem.damageAfterArmor(raw, targetArmor), crit };
  }

  /** Health and mana regeneration, the one place resources trickle back. */
  update(dt: number): void {
    for (const carrier of this.carriers()) {
      const body = carrier as unknown as {
        health: number;
        maxHealth: number;
        mana?: number;
        maxMana?: number;
        alive: boolean;
      };
      if (!body.alive) continue;

      const healthRegen = carrier.stats.resolved.healthRegen;
      if (healthRegen > 0 && body.health < body.maxHealth) {
        body.health = Math.min(body.maxHealth, body.health + healthRegen * dt);
      }

      const manaRegen = carrier.stats.resolved.manaRegen;
      if (manaRegen > 0 && body.mana !== undefined && body.maxMana !== undefined) {
        body.mana = Math.min(body.maxMana, body.mana + manaRegen * dt);
      }
    }
  }
}

export default StatSystem;
