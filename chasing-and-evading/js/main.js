// main.js — Entry point
import { Game } from './game.js';

function init() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) {
    console.error('Canvas element not found');
    return;
  }
  const game = new Game(canvas);
  game.start();
  console.log('Chasing and Evading — HTML5 Canvas initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
