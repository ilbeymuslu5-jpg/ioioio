import test from 'node:test';
import assert from 'node:assert/strict';
import { PhysicsEngine } from '../src/core/PhysicsEngine.ts';
import { Entity } from '../src/entities/Entity.ts';

const bounds = { width: 500, height: 500 };

test('integrate moves a body by velocity * dt', () => {
  const physics = new PhysicsEngine({ bounds });
  const entity = new Entity({ x: 100, y: 100, radius: 5, drag: 1 });
  entity.velocity.x = 60;
  physics.integrate(entity, 0.5);
  assert.equal(entity.position.x, 130);
});

test('drag bleeds off velocity frame-rate independently', () => {
  const physics = new PhysicsEngine({ bounds });
  const oneStep = new Entity({ x: 0, y: 0, drag: 0.25 });
  const twoSteps = new Entity({ x: 0, y: 0, drag: 0.25 });
  oneStep.velocity.x = 100;
  twoSteps.velocity.x = 100;

  physics.integrate(oneStep, 1);
  physics.integrate(twoSteps, 0.5);
  physics.integrate(twoSteps, 0.5);

  // Both simulated one second of drag, so both keep 25% of the speed.
  assert.ok(Math.abs(oneStep.velocity.x - twoSteps.velocity.x) < 1e-9);
  assert.ok(Math.abs(oneStep.velocity.x - 25) < 1e-9);
});

test('maxSpeed clamps without changing direction', () => {
  const physics = new PhysicsEngine({ bounds });
  const entity = new Entity({ x: 0, y: 0, drag: 1, maxSpeed: 100 });
  entity.velocity.x = 300;
  entity.velocity.y = 400;
  physics.integrate(entity, 0.01);
  assert.ok(Math.abs(Math.hypot(entity.velocity.x, entity.velocity.y) - 100) < 1e-9);
  assert.ok(Math.abs(entity.velocity.x / entity.velocity.y - 3 / 4) < 1e-9);
});

test('constrainToBounds keeps the body inside and bounces it', () => {
  const physics = new PhysicsEngine({ bounds, wallRestitution: 0.5 });
  const entity = new Entity({ x: 2, y: 250, radius: 10 });
  entity.velocity.x = -100;
  assert.equal(physics.constrainToBounds(entity), true);
  assert.equal(entity.position.x, 10);
  assert.equal(entity.velocity.x, 50);
});

test('overlapDepth measures penetration between two circles', () => {
  const a = new Entity({ x: 0, y: 0, radius: 10 });
  const b = new Entity({ x: 15, y: 0, radius: 10 });
  const far = new Entity({ x: 100, y: 0, radius: 10 });
  assert.equal(PhysicsEngine.overlapDepth(a, b), 5);
  assert.equal(PhysicsEngine.overlapDepth(a, far), 0);
});

test('collision resolution separates bodies by inverse mass', () => {
  const physics = new PhysicsEngine({ bounds });
  const heavy = new Entity({ x: 0, y: 0, radius: 10, mass: 100 });
  const light = new Entity({ x: 15, y: 0, radius: 10, mass: 10 });

  assert.equal(physics.resolveCollision(heavy, light), true);
  assert.ok(PhysicsEngine.overlapDepth(heavy, light) < 1e-9, 'no overlap left');
  // The light body should travel roughly ten times further.
  const heavyMoved = Math.abs(heavy.position.x - 0);
  const lightMoved = Math.abs(light.position.x - 15);
  assert.ok(lightMoved > heavyMoved * 9);
});

test('collision resolution never pushes a static body', () => {
  const physics = new PhysicsEngine({ bounds });
  const wall = new Entity({ x: 0, y: 0, radius: 20, mass: 5, isStatic: true });
  const mover = new Entity({ x: 25, y: 0, radius: 20, mass: 5 });
  physics.resolveCollision(wall, mover);
  assert.equal(wall.position.x, 0);
  assert.equal(mover.position.x, 40);
});

test('overlapping bodies at the same point still separate', () => {
  const physics = new PhysicsEngine({ bounds });
  const a = new Entity({ x: 50, y: 50, radius: 10, mass: 10 });
  const b = new Entity({ x: 50, y: 50, radius: 10, mass: 10 });
  assert.equal(physics.resolveCollision(a, b), true);
  assert.ok(Math.hypot(a.position.x - b.position.x, a.position.y - b.position.y) > 0);
});

test('knockback scales inversely with mass', () => {
  const physics = new PhysicsEngine({ bounds });
  const light = new Entity({ x: 10, y: 0, radius: 5, mass: 10 });
  const heavy = new Entity({ x: 10, y: 0, radius: 5, mass: 100 });
  physics.applyKnockback(light, { x: 0, y: 0 }, 1000);
  physics.applyKnockback(heavy, { x: 0, y: 0 }, 1000);
  assert.equal(light.velocity.x, 100);
  assert.equal(heavy.velocity.x, 10);
});
