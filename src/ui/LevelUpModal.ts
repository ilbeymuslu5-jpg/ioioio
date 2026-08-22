import type { GameSystem } from '../types/index.ts';
import type { EventBus } from '../core/EventBus.ts';
import type { GameEventMap } from '../core/GameEvents.ts';
import type { GameEngine } from '../core/GameEngine.ts';
import type { SkillTreeSystem, TalentDraft, TalentOffer } from '../systems/SkillTreeSystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

const RARITY_LABEL: Record<string, string> = {
  common: 'Yaygın',
  magic: 'Büyülü',
  epic: 'Destansı',
  legendary: 'Efsanevi',
};

const CATEGORY_LABEL: Record<string, string> = {
  offensive: 'Saldırı',
  defensive: 'Savunma',
  utility: 'Fayda',
};

/** Talents that grant an ability are worth calling out on the card. */
const ABILITY_TAG = 'Yetenek';

/**
 * The 3-card level-up screen.
 *
 * Pauses the simulation while a draft is open and resumes once the queue is
 * empty, so a player never loses ground while reading cards. Picking is
 * possible by click or by the 1..3 keys.
 *
 * The modal only renders and reports the pick; SkillTreeSystem owns what a
 * choice actually does.
 */
export class LevelUpModal implements GameSystem<MatchContext> {
  readonly name = 'levelUpModal';
  private readonly root: HTMLElement;
  private readonly skillTree: SkillTreeSystem;
  private readonly events: EventBus<GameEventMap>;
  private readonly engine: GameEngine<MatchContext>;
  private readonly unsubscribes: (() => void)[] = [];
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private open = false;
  /** Remembers whether the game was already paused before the modal opened. */
  private pausedBefore = false;

  constructor({
    root,
    skillTree,
    events,
    engine,
  }: {
    root: HTMLElement;
    skillTree: SkillTreeSystem;
    events: EventBus<GameEventMap>;
    engine: GameEngine<MatchContext>;
  }) {
    this.root = root;
    this.skillTree = skillTree;
    this.events = events;
    this.engine = engine;
    this.root.hidden = true;
    this.root.className = 'levelup';
  }

  attach(): void {
    this.unsubscribes.push(
      this.events.on('talent:offered', ({ draft }) => this.show(draft)),
      this.events.on('talent:cleared', () => this.hide()),
    );
    this.onKeyDown = (event: KeyboardEvent) => {
      if (!this.open) return;
      const index = ['Digit1', 'Digit2', 'Digit3', 'Digit4'].indexOf(event.code);
      if (index === -1) return;
      const draft = this.skillTree.currentDraft;
      const offer = draft?.choices[index];
      if (!offer) return;
      event.preventDefault();
      this.skillTree.choose(offer.talent.id);
    };
    globalThis.addEventListener?.('keydown', this.onKeyDown);
  }

  detach(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
    if (this.onKeyDown) globalThis.removeEventListener?.('keydown', this.onKeyDown);
    this.onKeyDown = null;
    this.hide();
  }

  private show(draft: TalentDraft): void {
    if (!this.open) {
      this.pausedBefore = this.engine.paused;
      this.engine.setPaused(true);
      this.open = true;
    }
    this.renderCards(draft);
    this.root.hidden = false;
  }

  private hide(): void {
    if (!this.open) return;
    this.open = false;
    this.root.hidden = true;
    this.root.innerHTML = '';
    if (!this.pausedBefore) this.engine.setPaused(false);
  }

  private renderCards(draft: TalentDraft): void {
    const pending = this.skillTree.pendingCount;
    const queueNote = pending > 1 ? `<span class="levelup-queue">+${pending - 1} seçim bekliyor</span>` : '';

    this.root.innerHTML = `
      <div class="levelup-backdrop"></div>
      <div class="levelup-panel" role="dialog" aria-modal="true" aria-label="Seviye atlama">
        <header class="levelup-head">
          <h2>Seviye ${draft.level}</h2>
          <p>Bir yetenek seç${queueNote ? ' · ' : ''}${queueNote}</p>
        </header>
        <div class="levelup-cards">
          ${draft.choices.map((offer, index) => this.cardHtml(offer, index)).join('')}
        </div>
        <footer class="levelup-foot">1 · 2 · 3 tuşlarıyla da seçebilirsin</footer>
      </div>
    `;

    for (const button of this.root.querySelectorAll<HTMLButtonElement>('[data-talent]')) {
      button.addEventListener('click', () => {
        this.skillTree.choose(button.dataset['talent'] as string);
      });
    }
  }

  private cardHtml(offer: TalentOffer, index: number): string {
    const { talent, currentStacks } = offer;
    const owned = currentStacks > 0;
    const stackNote = owned
      ? `<span class="card-stacks">${currentStacks} → ${currentStacks + 1} / ${talent.maxStacks}</span>`
      : `<span class="card-stacks card-stacks-new">YENİ</span>`;

    return `
      <button class="card card-${talent.rarity}" data-talent="${talent.id}" type="button">
        <span class="card-key">${index + 1}</span>
        <span class="card-rarity">${RARITY_LABEL[talent.rarity] ?? talent.rarity}${
          talent.ability ? ` · ${ABILITY_TAG}` : ''
        }</span>
        <span class="card-name">${talent.name}</span>
        <span class="card-desc">${talent.description}</span>
        <span class="card-foot">
          <span class="card-category">${CATEGORY_LABEL[talent.category] ?? talent.category}</span>
          ${stackNote}
        </span>
      </button>
    `;
  }

  get isOpen(): boolean {
    return this.open;
  }
}

export default LevelUpModal;
