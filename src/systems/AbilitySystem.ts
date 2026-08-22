import { GameConfig } from '../config/GameConfig.ts';
import { TALENT_POOL } from '../config/TalentPool.ts';
import { clamp, TAU } from '../utils/MathUtils.ts';
import { distanceSq } from '../utils/Vector2.ts';
import type { AbilityId, TalentDefinition } from '../config/TalentPool.ts';
import type { AbilityConfig, GameSystem, Vec2 } from '../types/index.ts';
import type { World } from '../core/World.ts';
import type { Player } from '../entities/Player.ts';
import type { EnemyMob } from '../entities/EnemyMob.ts';
import type { Entity } from '../entities/Entity.ts';
import type { CombatSystem } from './CombatSystem.ts';
import type { MatchContext } from '../core/MatchContext.ts';

/** A burning patch left behind by the fire trail. */
export interface FirePatch {
  x: number;
  y: number;
  radius: number;
  /** Seconds left before the flames die out. */
  life: number;
  maxLife: number;
  damage: number;
  /** Countdown to the next damage tick. */
  tickIn: number;
}

/** A lightning bolt kept only long enough to draw it. */
export interface LightningStrike {
  x: number;
  y: number;
  /** Seconds left of the flash. */
  life: number;
  branchSeed: number;
}

/** One orbiting ghost blade. */
export interface OrbitingBlade {
  /** Current angle around the hero, radians. */
  angle: number;
  x: number;
  y: number;
}

/**
 * Drives the talents that *do* something rather than adding numbers.
 *
 * Each ability reads its power from how many stacks of its talent the hero
 * owns, so a second pick strengthens what the first one started. Cooldowns
 * respect the hero's `cooldownReduction` stat, which is how gear and utility
 * talents speed the abilities up.
 */
export class AbilitySystem implements GameSystem<MatchContext> {
  readonly name = 'abilities';

  readonly blades: OrbitingBlade[] = [];
  readonly firePatches: FirePatch[] = [];
  readonly strikes: LightningStrike[] = [];

  private readonly world: World;
  private readonly combat: CombatSystem;
  private readonly config: AbilityConfig;
  private readonly talents: readonly TalentDefinition[];
  private readonly candidates: Entity[] = [];
  /** Per-enemy cooldown so a blade cannot shred on every single tick. */
  private readonly bladeHitClock = new WeakMap<EnemyMob, number>();

  private bladeAngle = 0;
  private lightningTimer = 0;
  private fireTimer = 0;
  private elapsed = 0;

  constructor({
    world,
    combat,
    config = GameConfig.abilities,
    talents = TALENT_POOL,
  }: {
    world: World;
    combat: CombatSystem;
    config?: AbilityConfig;
    talents?: readonly TalentDefinition[];
  }) {
    this.world = world;
    this.combat = combat;
    this.config = config;
    this.talents = talents;
  }

  /** Stacks of the talent that grants `ability`, 0 when the hero lacks it. */
  stacksOf(hero: Player, ability: AbilityId): number {
    const talent = this.talents.find((entry) => entry.ability === ability);
    if (!talent) return 0;
    return hero.talents.get(talent.id) ?? 0;
  }

  /** Cooldown after the hero's cooldown-reduction stat, floored at 15%. */
  cooldownFor(hero: Player, base: number): number {
    const reduction = clamp(hero.stats.resolved.cooldownReduction, 0, 0.85);
    return base * (1 - reduction);
  }

  update(dt: number, context: MatchContext): void {
    const hero = context.player;
    this.elapsed += dt;
    if (!hero.alive) {
      this.blades.length = 0;
      return;
    }

    this.updateBlades(hero, dt);
    this.updateLightning(hero, dt);
    this.updateFireTrail(hero, dt);
    this.updateStrikeVisuals(dt);
  }

  /* --- Kasırga Kılıçları ------------------------------------------------
     Ghost blades circle the hero and cut whatever they sweep through. More
     stacks mean more blades, so the ring gets denser rather than just harder.
     -------------------------------------------------------------------- */
  private updateBlades(hero: Player, dt: number): void {
    const stacks = this.stacksOf(hero, 'whirlwind-blades');
    if (stacks === 0) {
      this.blades.length = 0;
      return;
    }

    const count = stacks + 1;
    this.bladeAngle = (this.bladeAngle + this.config.bladeOrbitSpeed * dt) % TAU;
    const radius = this.config.bladeOrbitRadius;

    this.blades.length = count;
    for (let i = 0; i < count; i++) {
      const angle = this.bladeAngle + (TAU / count) * i;
      this.blades[i] = {
        angle,
        x: hero.position.x + Math.cos(angle) * radius,
        y: hero.position.y + Math.sin(angle) * radius,
      };
    }

    const damage = hero.stats.resolved.damage * 0.45;
    const bladeRadius = this.config.bladeRadius;
    for (const blade of this.blades) {
      const found = this.world.grid.queryCircle(blade.x, blade.y, bladeRadius + 20, this.candidates);
      for (const entity of found) {
        if (entity.type !== 'enemy' || !entity.alive) continue;
        const enemy = entity as EnemyMob;
        const reach = bladeRadius + enemy.radius;
        if (distanceSq({ x: blade.x, y: blade.y } as Vec2, enemy.position) > reach * reach) continue;

        const readyAt = this.bladeHitClock.get(enemy) ?? 0;
        if (this.elapsed < readyAt) continue;
        this.bladeHitClock.set(enemy, this.elapsed + this.config.bladeDamageInterval);
        this.combat.damageEnemyFlat(enemy, hero, damage, 'whirlwind-blades');
      }
    }
  }

  /* --- Kutsal Şimşek -----------------------------------------------------
     Periodically calls a bolt down on the nearest enemy. Stacks shorten the
     interval and raise the damage.
     -------------------------------------------------------------------- */
  private updateLightning(hero: Player, dt: number): void {
    const stacks = this.stacksOf(hero, 'holy-lightning');
    if (stacks === 0) return;

    this.lightningTimer -= dt;
    if (this.lightningTimer > 0) return;

    const interval = this.cooldownFor(hero, this.config.lightningInterval / (1 + (stacks - 1) * 0.35));
    this.lightningTimer = interval;

    const target = this.nearestEnemy(hero, this.config.lightningRange);
    if (!target) return;

    const damage = hero.stats.resolved.damage * (1.1 + (stacks - 1) * 0.55);
    this.combat.damageEnemyFlat(target, hero, damage, 'holy-lightning');
    this.strikes.push({
      x: target.position.x,
      y: target.position.y,
      life: 0.22,
      branchSeed: Math.random(),
    });
    this.world.events.emit('ability:cast', {
      ability: 'holy-lightning',
      x: hero.position.x,
      y: hero.position.y,
      targetX: target.position.x,
      targetY: target.position.y,
    });
  }

  /* --- Ateş İzi ----------------------------------------------------------
     Drops burning ground behind a moving hero. Patches tick damage on their
     own clock, so standing still does not stack flames on one spot.
     -------------------------------------------------------------------- */
  private updateFireTrail(hero: Player, dt: number): void {
    const stacks = this.stacksOf(hero, 'fire-trail');

    if (stacks > 0) {
      this.fireTimer -= dt;
      const moving = Math.hypot(hero.velocity.x, hero.velocity.y) > 25;
      if (this.fireTimer <= 0 && moving) {
        this.fireTimer = this.config.fireTrailInterval;
        this.firePatches.push({
          x: hero.position.x,
          y: hero.position.y,
          radius: this.config.fireTrailRadius * (1 + (stacks - 1) * 0.15),
          life: this.config.fireTrailLifetime,
          maxLife: this.config.fireTrailLifetime,
          damage: hero.stats.resolved.damage * (0.3 + (stacks - 1) * 0.14),
          tickIn: 0,
        });
      }
    }

    for (let i = this.firePatches.length - 1; i >= 0; i--) {
      const patch = this.firePatches[i]!;
      patch.life -= dt;
      if (patch.life <= 0) {
        this.firePatches.splice(i, 1);
        continue;
      }

      patch.tickIn -= dt;
      if (patch.tickIn > 0) continue;
      patch.tickIn = this.config.fireTrailTickInterval;

      const found = this.world.grid.queryCircle(patch.x, patch.y, patch.radius + 20, this.candidates);
      for (const entity of found) {
        if (entity.type !== 'enemy' || !entity.alive) continue;
        const enemy = entity as EnemyMob;
        const reach = patch.radius + enemy.radius;
        if (distanceSq({ x: patch.x, y: patch.y } as Vec2, enemy.position) > reach * reach) continue;
        this.combat.damageEnemyFlat(enemy, hero, patch.damage, 'fire-trail');
      }
    }
  }

  private updateStrikeVisuals(dt: number): void {
    for (let i = this.strikes.length - 1; i >= 0; i--) {
      const strike = this.strikes[i]!;
      strike.life -= dt;
      if (strike.life <= 0) this.strikes.splice(i, 1);
    }
  }

  /** Closest living enemy within `range`, or null. */
  nearestEnemy(hero: Player, range: number): EnemyMob | null {
    const found = this.world.grid.queryCircle(hero.position.x, hero.position.y, range, this.candidates);
    let best: EnemyMob | null = null;
    let bestDistance = range * range;

    for (const entity of found) {
      if (entity.type !== 'enemy' || !entity.alive) continue;
      const enemy = entity as EnemyMob;
      const distance = distanceSq(hero.position, enemy.position);
      if (distance < bestDistance) {
        bestDistance = distance;
        best = enemy;
      }
    }
    return best;
  }

  /** Drops every transient effect; used when a match restarts. */
  clear(): void {
    this.blades.length = 0;
    this.firePatches.length = 0;
    this.strikes.length = 0;
    this.lightningTimer = 0;
    this.fireTimer = 0;
  }
}

export default AbilitySystem;
