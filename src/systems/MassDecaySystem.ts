import { GameConfig } from '../config/GameConfig.ts';
import type { GameSystem, MassDecayConfig } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/**
 * Snowball barrier from the design spec.
 *
 * A heavy player bleeds mass every second, logarithmically in the excess over
 * `freeMass`:
 *
 *   decayPerSecond = rate * ln(1 + max(0, mass - freeMass) / reference)
 *
 * Logarithmic rather than linear on purpose: the drain never overwhelms a big
 * player outright, it just makes holding a lead a running cost that has to be
 * paid with fresh pickups.
 */
export class MassDecaySystem implements GameSystem<MatchContext> {
  readonly name = 'massDecay';
  private readonly world: World;
  private readonly config: MassDecayConfig;
  private readonly floor: number;

  constructor({
    world,
    config = GameConfig.massDecay,
    startMass = GameConfig.player.startMass,
  }: {
    world: World;
    config?: MassDecayConfig;
    startMass?: number;
  }) {
    this.world = world;
    this.config = config;
    this.floor = startMass * config.floorMultiplier;
  }

  /** Mass lost per second at a given mass; 0 below the free threshold. */
  decayRateFor(mass: number): number {
    const excess = mass - this.config.freeMass;
    if (excess <= 0) return 0;
    return this.config.rate * Math.log(1 + excess / this.config.reference);
  }

  update(dt: number): void {
    for (const player of this.world.getByType<Player>('player')) {
      if (!player.alive) continue;
      const perSecond = this.decayRateFor(player.mass);
      if (perSecond <= 0) continue;

      const target = Math.max(this.floor, player.mass - perSecond * dt);
      const lost = player.mass - target;
      if (lost <= 0) continue;

      player.addMass(-lost);
      player.massDecayed += lost;
      this.world.events.emit('mass:decayed', { player, amount: lost });
    }
  }
}

export default MassDecaySystem;
