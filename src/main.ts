import { Game } from './Game.ts';

/**
 * Browser entry point. Everything gameplay-related lives in Game; this file
 * only resolves DOM nodes and exposes the instance for debugging.
 */
const canvas = document.getElementById('game-canvas') as HTMLCanvasElement | null;
const hudRoot = document.getElementById('hud');
if (!canvas) throw new Error('#game-canvas missing from the page');

const game = new Game({
  canvas,
  hudRoot,
  playerName: localStorage.getItem('playerName') ?? 'Player',
});

game.start();

// Handy for poking at the simulation from the devtools console.
(globalThis as { game?: Game }).game = game;
