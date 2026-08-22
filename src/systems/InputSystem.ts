import * as V from '../utils/Vector2.ts';
import type { GameSystem } from '../types/index.ts';
import type { InputManager } from '../core/InputManager.ts';
import type { Camera } from '../core/Camera.ts';
import type { CombatSystem } from './CombatSystem.ts';
import type { Player } from '../entities/Player.ts';
import type { World } from '../core/World.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Turns raw input into hero actions.
 *
 * Walking and aiming are separate: WASD (or a virtual joystick) drives the
 * feet while the pointer decides where the sword points, which is what lets a
 * player kite backwards while still swinging forwards.
 *
 * Holding the left button keeps swinging — the attack cooldown paces it, not
 * the click rate.
 */
export class InputSystem implements GameSystem<MatchContext> {
  readonly name = 'input';
  private readonly input: InputManager;
  private readonly camera: Camera;
  private readonly combat: CombatSystem;
  private readonly world: World;

  constructor({
    input,
    camera,
    combat,
    world,
  }: {
    input: InputManager;
    camera: Camera;
    combat: CombatSystem;
    world: World;
  }) {
    this.input = input;
    this.camera = camera;
    this.combat = combat;
    this.world = world;
  }

  update(_dt: number, context: MatchContext): void {
    const hero = context.player;
    if (!hero.alive) return;

    // Movement: keyboard or joystick, steering relative to the hero on screen.
    const origin = this.camera.worldToScreen(hero.position.x, hero.position.y);
    hero.setMoveIntent(this.input.update(origin.x, origin.y));

    this.aim(hero);

    if (this.input.isActionActive('primary')) this.combat.attack(hero);
    if (this.input.consumeAction('dash')) this.dash(hero);
  }

  /**
   * Points the hero at the cursor. With no pointer (touch, or a joystick
   * drag) the hero looks where it is walking instead.
   */
  private aim(hero: Player): void {
    if (this.input.pointerActive && !this.input.joystickAnchor) {
      const world = this.camera.screenToWorld(this.input.pointer.x, this.input.pointer.y);
      hero.aimAt(world.x, world.y);
      return;
    }
    const intent = hero.moveIntent;
    if (intent.x !== 0 || intent.y !== 0) {
      V.normalizeMut(V.copy(hero.facing, intent));
    }
  }

  /** A lunge in the direction of travel, or of aim when standing still. */
  private dash(hero: Player): boolean {
    if (!hero.canDash) return false;
    if (!hero.spendMana(hero.config.dashManaCost)) return false;

    const intent = hero.moveIntent;
    const moving = intent.x !== 0 || intent.y !== 0;
    const direction = moving ? V.normalize(intent) : hero.facing;

    hero.dashTimer = hero.config.dashDuration;
    hero.dashCooldown = hero.config.dashCooldown;
    hero.grantInvulnerability(hero.config.dashInvulnerability);
    hero.velocity.x = direction.x * hero.config.dashSpeed;
    hero.velocity.y = direction.y * hero.config.dashSpeed;

    this.world.events.emit('hero:dashed', { player: hero });
    return true;
  }
}

export default InputSystem;
