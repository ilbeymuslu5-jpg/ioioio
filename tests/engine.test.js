import test from 'node:test';
import assert from 'node:assert/strict';
import { GameEngine } from '../src/core/GameEngine.js';
import { EventBus } from '../src/core/EventBus.js';
import { Camera } from '../src/core/Camera.js';
import { Entity } from '../src/entities/Entity.js';

function headlessEngine(options = {}) {
  return new GameEngine({ now: () => 0, scheduler: () => 0, ...options });
}

test('advance runs whole fixed steps and keeps the remainder as alpha', () => {
  const engine = headlessEngine();
  let ticks = 0;
  engine.addSystem({ name: 'counter', update: () => ticks++ });

  engine.advance(1 / 60 + 1 / 120); // one full tick plus half of the next
  assert.equal(ticks, 1);
  assert.ok(Math.abs(engine.alpha - 0.5) < 1e-6);

  engine.advance(1 / 120);
  assert.equal(ticks, 2, 'the leftover half plus a new half completes a tick');
});

test('the tick budget stops a long stall from spiralling', () => {
  const engine = headlessEngine({ maxTicksPerFrame: 5 });
  let ticks = 0;
  engine.addSystem({ name: 'counter', update: () => ticks++ });
  engine.advance(10); // ten seconds of frozen tab
  assert.equal(ticks, 5);
});

test('a fixed step is always the same dt regardless of frame time', () => {
  const engine = headlessEngine();
  const deltas = [];
  engine.addSystem({ name: 'sampler', update: (dt) => deltas.push(dt) });
  engine.advance(0.1);
  assert.ok(deltas.length > 1);
  assert.ok(deltas.every((dt) => dt === 1 / 60));
});

test('paused engines still render but do not simulate', () => {
  const engine = headlessEngine();
  let ticks = 0;
  let frames = 0;
  engine.addSystem({ name: 'both', update: () => ticks++, render: () => frames++ });
  engine.setPaused(true);
  engine.advance(1);
  assert.equal(ticks, 0);
  assert.equal(frames, 1);
});

test('systems can be event-driven with attach() alone', () => {
  const engine = headlessEngine();
  let attached = false;
  engine.addSystem({ name: 'listener', attach: () => { attached = true; } });
  assert.equal(attached, true);
  assert.throws(() => engine.addSystem({ name: 'empty' }), /update\(\)/);
});

test('EventBus dispatch tolerates unsubscribing mid-emit', () => {
  const events = new EventBus();
  const seen = [];
  const off = events.on('ping', () => {
    seen.push('a');
    off();
  });
  events.on('ping', () => seen.push('b'));
  events.emit('ping');
  events.emit('ping');
  assert.deepEqual(seen, ['a', 'b', 'b']);
});

test('camera damping converges on the target and clamps to the arena', () => {
  const camera = new Camera({
    viewportWidth: 800,
    viewportHeight: 600,
    bounds: { width: 2000, height: 2000 },
  });
  const target = new Entity({ x: 1000, y: 1000, radius: 14 });
  camera.follow(target);

  target.position.x = 1600;
  for (let i = 0; i < 240; i++) camera.update(1 / 60);
  assert.ok(Math.abs(camera.x - 1600) < 1, 'catches up to the target');

  target.position.x = 1990; // hard against the wall
  for (let i = 0; i < 240; i++) camera.update(1 / 60);
  const halfW = camera.viewportWidth / (2 * camera.zoom);
  assert.ok(camera.x <= 2000 - halfW + 1e-6, 'never shows outside the arena');
});

test('camera zooms out as the followed body grows', () => {
  const camera = new Camera({ viewportWidth: 800, viewportHeight: 600 });
  const small = camera.zoomForRadius(14);
  const large = camera.zoomForRadius(140);
  assert.ok(large < small);
  assert.ok(large >= camera.config.minZoom);
});

test('screen and world coordinates round-trip through the camera', () => {
  const camera = new Camera({ viewportWidth: 800, viewportHeight: 600 });
  camera.zoom = 0.8;
  const world = camera.screenToWorld(120, 340);
  const screen = camera.worldToScreen(world.x, world.y);
  assert.ok(Math.abs(screen.x - 120) < 1e-9);
  assert.ok(Math.abs(screen.y - 340) < 1e-9);
});

test('entities interpolate between the last two ticks for rendering', () => {
  const entity = new Entity({ x: 0, y: 0 });
  entity.savePreviousPosition();
  entity.position.x = 100;
  assert.equal(entity.getRenderPosition(0).x, 0);
  assert.equal(entity.getRenderPosition(0.25).x, 25);
  assert.equal(entity.getRenderPosition(1).x, 100);
});
