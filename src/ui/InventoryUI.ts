import { RARITY_LABEL } from '../config/ItemPool.ts';
import { EQUIPMENT_SLOTS } from '../types/index.ts';
import type { Item } from '../config/ItemPool.ts';
import type { EquipmentSlot, GameSystem, StatKey } from '../types/index.ts';
import type { EventBus } from '../core/EventBus.ts';
import type { GameEventMap } from '../core/GameEvents.ts';
import type { GameEngine } from '../core/GameEngine.ts';
import type { InventorySystem } from '../systems/InventorySystem.ts';
import type { Player } from '../entities/Player.ts';
import type { MatchContext } from '../core/MatchContext.ts';

const SLOT_LABEL: Record<EquipmentSlot, string> = {
  weapon: 'Silah',
  chest: 'Zırh',
  helmet: 'Miğfer',
  amulet: 'Tılsım',
};

const STAT_LABEL: Record<StatKey, string> = {
  maxHealth: 'Can',
  healthRegen: 'Can yenilenmesi',
  maxMana: 'Mana',
  manaRegen: 'Mana yenilenmesi',
  armor: 'Zırh',
  damage: 'Hasar',
  attackSpeed: 'Saldırı hızı',
  attackRange: 'Erim',
  critChance: 'Kritik şansı',
  critMultiplier: 'Kritik hasarı',
  moveSpeed: 'Hareket hızı',
  pickupRadius: 'Toplama yarıçapı',
  cooldownReduction: 'Bekleme azaltma',
  xpGain: 'XP kazancı',
  goldGain: 'Altın kazancı',
  luck: 'Talih',
};

/**
 * Stats stored as a 0..1 fraction but read by players as a percentage.
 * They are granted flat (a percentage of a zero base would be zero), so the
 * formatter has to know to render the flat term with a % sign.
 */
const FRACTION_AS_PERCENT: ReadonlySet<StatKey> = new Set<StatKey>(['critChance', 'cooldownReduction']);

/** Stats shown in the summary pane; the rest stay on the items themselves. */
const SUMMARY_KEYS: readonly StatKey[] = [
  'damage',
  'attackSpeed',
  'critChance',
  'critMultiplier',
  'armor',
  'maxHealth',
  'healthRegen',
  'moveSpeed',
  'cooldownReduction',
  'pickupRadius',
];

/**
 * Equipment panel and backpack grid, toggled with I or Tab.
 *
 * Clicking a backpack item equips it (swapping out whatever was worn);
 * clicking a worn item takes it off. The simulation pauses while the panel is
 * open, so gear can be compared without being eaten alive.
 */
export class InventoryUI implements GameSystem<MatchContext> {
  readonly name = 'inventoryUI';
  private readonly root: HTMLElement;
  private readonly inventory: InventorySystem;
  private readonly events: EventBus<GameEventMap>;
  private readonly engine: GameEngine<MatchContext>;
  private readonly player: Player;
  private readonly unsubscribes: (() => void)[] = [];
  private onKeyDown: ((event: KeyboardEvent) => void) | null = null;
  private open = false;
  private pausedBefore = false;

  constructor({
    root,
    inventory,
    events,
    engine,
    player,
  }: {
    root: HTMLElement;
    inventory: InventorySystem;
    events: EventBus<GameEventMap>;
    engine: GameEngine<MatchContext>;
    player: Player;
  }) {
    this.root = root;
    this.inventory = inventory;
    this.events = events;
    this.engine = engine;
    this.player = player;
    this.root.hidden = true;
    this.root.className = 'inventory';
  }

  attach(): void {
    this.unsubscribes.push(
      this.events.on('inventory:changed', () => {
        if (this.open) this.renderPanel();
      }),
    );
    this.onKeyDown = (event: KeyboardEvent) => {
      if (event.code !== 'KeyI' && event.code !== 'Tab') return;
      event.preventDefault();
      this.toggle();
    };
    globalThis.addEventListener?.('keydown', this.onKeyDown);
  }

  detach(): void {
    for (const off of this.unsubscribes) off();
    this.unsubscribes.length = 0;
    if (this.onKeyDown) globalThis.removeEventListener?.('keydown', this.onKeyDown);
    this.onKeyDown = null;
    this.close();
  }

  get isOpen(): boolean {
    return this.open;
  }

  toggle(): void {
    if (this.open) this.close();
    else this.show();
  }

  show(): void {
    if (this.open) return;
    this.pausedBefore = this.engine.paused;
    this.engine.setPaused(true);
    this.open = true;
    this.root.hidden = false;
    this.renderPanel();
  }

  close(): void {
    if (!this.open) return;
    this.open = false;
    this.root.hidden = true;
    this.root.innerHTML = '';
    if (!this.pausedBefore) this.engine.setPaused(false);
  }

  private renderPanel(): void {
    const hero = this.player;
    const { backpack } = this.inventory.of(hero);

    this.root.innerHTML = `
      <div class="inventory-backdrop"></div>
      <div class="inventory-panel" role="dialog" aria-modal="true" aria-label="Envanter">
        <header class="inventory-head">
          <h2>Teçhizat</h2>
          <span class="inventory-gold">${hero.gold.toLocaleString('tr-TR')} altın</span>
          <button class="inventory-close" data-close type="button" aria-label="Kapat">×</button>
        </header>

        <div class="inventory-body">
          <section class="inventory-slots">
            ${this.inventory
              .equippedItems(hero)
              .map(({ slot, item }) => this.slotHtml(slot, item))
              .join('')}
          </section>

          <section class="inventory-summary">
            <h3>Statlar</h3>
            <dl>${SUMMARY_KEYS.map((key) => this.summaryRow(hero, key)).join('')}</dl>
          </section>
        </div>

        <section class="inventory-bag">
          <h3>Çanta <span>${this.inventory.countItems(hero)} / ${this.inventory.capacity}</span></h3>
          <div class="bag-grid">
            ${backpack.map((item, index) => this.bagCellHtml(item, index)).join('')}
          </div>
        </section>

        <footer class="inventory-foot">Çantadaki eşyaya tıkla: kuşan · Kuşanılana tıkla: çıkar · I / Tab: kapat</footer>
      </div>
    `;
    this.bindPanel();
  }

  private bindPanel(): void {
    this.root.querySelector<HTMLElement>('[data-close]')?.addEventListener('click', () => this.close());
    this.root.querySelector<HTMLElement>('.inventory-backdrop')?.addEventListener('click', () => this.close());

    for (const node of this.root.querySelectorAll<HTMLElement>('[data-bag-index]')) {
      node.addEventListener('click', () => {
        this.inventory.equipFromBackpack(this.player, Number(node.dataset['bagIndex']));
      });
    }
    for (const node of this.root.querySelectorAll<HTMLElement>('[data-slot]')) {
      node.addEventListener('click', () => {
        this.inventory.unequip(this.player, node.dataset['slot'] as EquipmentSlot);
      });
    }
  }

  private slotHtml(slot: EquipmentSlot, item: Item | null): string {
    if (!item) {
      return `<div class="slot slot-empty"><span class="slot-label">${SLOT_LABEL[slot]}</span></div>`;
    }
    return `
      <button class="slot slot-${item.rarity}" data-slot="${slot}" type="button" title="${this.tooltip(item)}">
        <span class="slot-label">${SLOT_LABEL[slot]}</span>
        <span class="slot-name">${item.name}</span>
        <span class="slot-lines">${this.linesHtml(item)}</span>
      </button>
    `;
  }

  private bagCellHtml(item: Item | null, index: number): string {
    if (!item) return `<div class="bag-cell bag-empty"></div>`;
    return `
      <button class="bag-cell bag-${item.rarity}" data-bag-index="${index}" type="button" title="${this.tooltip(item)}">
        <span class="bag-slot-tag">${SLOT_LABEL[item.slot]}</span>
        <span class="bag-name">${item.name}</span>
      </button>
    `;
  }

  private linesHtml(item: Item): string {
    return [item.implicit, ...item.affixes]
      .map((affix) => `<span>${this.formatAffix(affix.key, affix.modifier.flat, affix.modifier.perc)}</span>`)
      .join('');
  }

  private tooltip(item: Item): string {
    const lines = [item.implicit, ...item.affixes].map((affix) =>
      this.formatAffix(affix.key, affix.modifier.flat, affix.modifier.perc),
    );
    return `${RARITY_LABEL[item.rarity]} · sv ${item.itemLevel}\n${lines.join('\n')}`;
  }

  /** "+12 Zırh" or "+%15 Saldırı hızı", picking whichever term is non-zero. */
  private formatAffix(key: StatKey, flat: number, perc: number): string {
    const label = STAT_LABEL[key];
    if (perc !== 0) return `+%${Math.round(perc * 100)} ${label}`;
    if (FRACTION_AS_PERCENT.has(key)) return `+%${Math.round(flat * 100)} ${label}`;
    // Sub-1 values (regen, luck) would round away to nothing.
    const value = Math.abs(flat) < 1 ? flat.toFixed(2) : Math.round(flat).toString();
    return `+${value} ${label}`;
  }

  private summaryRow(hero: Player, key: StatKey): string {
    const value = hero.stats.resolved[key];
    let shown: string;
    if (key === 'critChance' || key === 'cooldownReduction') shown = `%${Math.round(value * 100)}`;
    else if (key === 'critMultiplier') shown = `${value.toFixed(2)}×`;
    else if (key === 'attackSpeed') shown = `${value.toFixed(2)}/sn`;
    else if (value < 10) shown = value.toFixed(1);
    else shown = Math.round(value).toString();
    return `<div><dt>${STAT_LABEL[key]}</dt><dd>${shown}</dd></div>`;
  }
}

export default InventoryUI;
