import { Game } from './Game.js';

/**
 * Browser entry point. Everything gameplay-related lives in Game; this file
 * only resolves DOM nodes and exposes the instance for debugging.
 */
const canvas = document.getElementById('game-canvas');
const hudRoot = document.getElementById('hud');

const game = new Game({
  canvas,
  hudRoot,
  playerName: localStorage.getItem('playerName') || 'Player',
});

game.start();

// Handy for poking at the simulation from the devtools console.
globalThis.game = game;
