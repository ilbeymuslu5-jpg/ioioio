import { TALENT_POOL, RARITY_ORDER, RARITY_WEIGHTS } from '../config/TalentPool.ts';
import type { TalentDefinition, TalentRarity } from '../config/TalentPool.ts';
import type { GameSystem, Rng, StatKey, StatModifier } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { StatSystem } from './StatSystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/** One card on the level-up screen. */
export interface TalentOffer {
  readonly talent: TalentDefinition;
  /** Stacks already owned, so the UI can show "2/5" and mark upgrades. */
  readonly currentStacks: number;
}

/** One level-up's worth of choices, awaiting a pick. */
export interface TalentDraft {
  readonly id: number;
  readonly player: Player;
  readonly level: number;
  readonly choices: readonly TalentOffer[];
}

export interface SkillTreeSystemOptions {
  world: World;
  stats: StatSystem;
  rng?: Rng;
  pool?: readonly TalentDefinition[];
  choiceCount?: number;
  /** Extra weight each point of luck gives per rarity step above common. */
  luckWeightPerStep?: number;
  /** Headless policy: resolves a draft with no UI present (balance sims). */
  autoPick?: ((draft: TalentDraft) => string) | null;
}

/**
 * In-match rogue-lite progression: rolls the 3-choice draft on every level-up
 * and applies the pick.
 *
 * Drafts are queued rather than overwritten — a fat orb can grant several
 * levels at once, and each one still owes the player a choice. The UI drains
 * the queue one card screen at a time; a headless run either drains it through
 * `choose()` or installs an `autoPick` policy.
 *
 * Picks land on the player's StatSheet as `inMatch` modifier groups, so they
 * flow through the same pipeline as metagame talents and gear rather than
 * mutating stats directly.
 */
export class SkillTreeSystem implements GameSystem<MatchContext> {
  readonly name = 'skillTree';
  readonly pool: readonly TalentDefinition[];
  readonly choiceCount: number;

  private readonly world: World;
  private readonly stats: StatSystem;
  private readonly rng: Rng;
  private readonly luckWeightPerStep: number;
  private readonly queue: TalentDraft[] = [];
  private autoPick: ((draft: TalentDraft) => string) | null;
  private nextDraftId = 1;
  private unsubscribe: (() => void) | null = null;

  constructor({
    world,
    stats,
    rng = Math.random,
    pool = TALENT_POOL,
    choiceCount = 3,
    luckWeightPerStep = 0.35,
    autoPick = null,
  }: SkillTreeSystemOptions) {
    this.world = world;
    this.stats = stats;
    this.rng = rng;
    this.pool = pool;
    this.choiceCount = choiceCount;
    this.luckWeightPerStep = luckWeightPerStep;
    this.autoPick = autoPick;
  }

  attach(): void {
    this.unsubscribe = this.world.events.on('player:levelup', ({ player, level }) => {
      this.offerDraft(player, level);
    });
  }

  detach(): void {
    this.unsubscribe?.();
    this.unsubscribe = null;
  }

  /** Installs (or clears) the headless auto-pick policy. */
  setAutoPick(policy: ((draft: TalentDraft) => string) | null): this {
    this.autoPick = policy;
    if (policy) this.drainWithPolicy();
    return this;
  }

  get pendingCount(): number {
    return this.queue.length;
  }

  /** The draft currently awaiting a pick, if any. */
  get currentDraft(): TalentDraft | null {
    return this.queue[0] ?? null;
  }

  stacksOf(player: Player, talentId: string): number {
    return player.talents.get(talentId) ?? 0;
  }

  /** Talents the player has not yet maxed out. */
  availableFor(player: Player): TalentDefinition[] {
    return this.pool.filter((talent) => this.stacksOf(player, talent.id) < talent.maxStacks);
  }

  /**
   * Draft weight for one rarity. Luck shifts weight away from common toward
   * the rarer tiers — the metagame "Luck" node plugs in here by raising the
   * player's `luck` stat.
   */
  weightFor(rarity: TalentRarity, luck: number): number {
    const step = RARITY_ORDER.indexOf(rarity);
    const base = RARITY_WEIGHTS[rarity];
    return base * (1 + Math.max(0, luck) * this.luckWeightPerStep * step);
  }

  /** Rolls the choices for one level-up and queues them. */
  offerDraft(player: Player, level: number = player.level): TalentDraft | null {
    const available = this.availableFor(player);
    if (available.length === 0) return null;

    const luck = player.stats.resolved.luck;
    const choices: TalentOffer[] = [];
    for (let slot = 0; slot < this.choiceCount && available.length > 0; slot++) {
      const picked = this.rollOne(available, luck);
      available.splice(available.indexOf(picked), 1); // no duplicate cards
      choices.push({ talent: picked, currentStacks: this.stacksOf(player, picked.id) });
    }

    const draft: TalentDraft = { id: this.nextDraftId++, player, level, choices };
    this.queue.push(draft);
    this.world.events.emit('talent:offered', { player, draft });
    if (this.autoPick) this.drainWithPolicy();
    return draft;
  }

  /** Rarity first, then a uniform pick inside that rarity. */
  private rollOne(available: readonly TalentDefinition[], luck: number): TalentDefinition {
    let total = 0;
    for (const talent of available) total += this.weightFor(talent.rarity, luck);

    let roll = this.rng() * total;
    for (const talent of available) {
      roll -= this.weightFor(talent.rarity, luck);
      if (roll <= 0) return talent;
    }
    return available[available.length - 1] as TalentDefinition;
  }

  /**
   * Resolves the pending draft with the chosen talent.
   * Returns false when the id is not on offer, so a stale click from the UI
   * cannot grant a talent that was never drafted.
   */
  choose(talentId: string): boolean {
    const draft = this.currentDraft;
    if (!draft) return false;
    const offer = draft.choices.find((choice) => choice.talent.id === talentId);
    if (!offer) return false;

    this.queue.shift();
    const stacks = this.applyTalent(draft.player, offer.talent);
    this.world.events.emit('talent:chosen', {
      player: draft.player,
      talent: offer.talent,
      stacks,
      draftId: draft.id,
    });

    const next = this.currentDraft;
    if (next) this.world.events.emit('talent:offered', { player: next.player, draft: next });
    else this.world.events.emit('talent:cleared', { player: draft.player });
    return true;
  }

  /** Adds one stack of a talent and re-resolves the sheet. Returns new stacks. */
  applyTalent(player: Player, talent: TalentDefinition): number {
    const stacks = Math.min(talent.maxStacks, this.stacksOf(player, talent.id) + 1);
    player.talents.set(talent.id, stacks);
    player.stats.addGroup({
      id: `talent:${talent.id}`,
      source: 'inMatch',
      stats: SkillTreeSystem.scaleStats(talent.perStack, stacks),
    });
    this.stats.recalculate(player);
    return stacks;
  }

  /** A talent taken N times contributes N times its per-stack values. */
  static scaleStats(
    perStack: TalentDefinition['perStack'],
    stacks: number,
  ): Partial<Record<StatKey, Partial<StatModifier>>> {
    const scaled: Partial<Record<StatKey, Partial<StatModifier>>> = {};
    for (const [key, modifier] of Object.entries(perStack) as [StatKey, Partial<StatModifier>][]) {
      const entry: Partial<StatModifier> = {};
      if (modifier.flat !== undefined) entry.flat = modifier.flat * stacks;
      if (modifier.perc !== undefined) entry.perc = modifier.perc * stacks;
      scaled[key] = entry;
    }
    return scaled;
  }

  private drainWithPolicy(): void {
    const policy = this.autoPick;
    if (!policy) return;
    while (this.currentDraft) {
      const draft = this.currentDraft;
      // A queued draft always carries at least one card, and a policy naming
      // something that is not on offer falls back to the first — so a bad
      // policy cannot spin this loop.
      if (!this.choose(policy(draft))) this.choose(draft.choices[0]!.talent.id);
    }
  }

  /** Every talent the player owns, for the HUD buff strip. */
  activeTalents(player: Player): { talent: TalentDefinition; stacks: number }[] {
    const owned: { talent: TalentDefinition; stacks: number }[] = [];
    for (const talent of this.pool) {
      const stacks = this.stacksOf(player, talent.id);
      if (stacks > 0) owned.push({ talent, stacks });
    }
    return owned;
  }
}

export default SkillTreeSystem;
