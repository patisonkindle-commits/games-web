// main.js — Entry point for Flocking Simulation
import { FlockingGame } from './FlockingGame.js';

function init() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) { console.error('Canvas not found'); return; }
  const game = new FlockingGame(canvas);
  game.start();
  console.log('Flocking Simulation — HTML5 Canvas initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
