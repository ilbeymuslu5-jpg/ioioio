import { Game } from './Game.ts';

/**
 * Browser entry point. Everything gameplay-related lives in Game; this file
 * only resolves DOM nodes, runs the start gate and exposes the instance for
 * debugging.
 */
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const hudRoot = document.getElementById('hud');
const modalRoot = document.getElementById('levelup');
const inventoryRoot = document.getElementById('inventory');
const gate = document.getElementById('gate');
const startButton = document.getElementById('gate-start');
if (!canvas) throw new Error('#game-canvas missing from the page');

/** Reading storage throws outright in some embedded contexts. */
function storedName(): string {
  try {
    return localStorage.getItem('playerName') ?? 'Kahraman';
  } catch {
    return 'Kahraman';
  }
}

const game = new Game({
  canvas,
  hudRoot,
  modalRoot,
  inventoryRoot,
  playerName: storedName(),
});

/**
 * The run begins on a deliberate press. Embedded in an iframe the page does not
 * hold the keyboard until something inside it is clicked, so starting on load
 * would leave WASD going to the host document.
 */
function beginRun(): void {
  if (gate) gate.hidden = true;
  canvas!.focus?.();
  game.start();
}

if (startButton && gate) {
  startButton.addEventListener('click', beginRun);
  // Enter or Space on the focused button counts too, via the click event.
} else {
  game.start();
}

// Handy for poking at the simulation from the devtools console.
(globalThis as { game?: Game }).game = game;
