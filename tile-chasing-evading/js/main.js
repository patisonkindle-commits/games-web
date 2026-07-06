// main.js — Entry point for tile-based game
import { TileGame } from './TileGame.js';

function init() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) { console.error('Canvas not found'); return; }
  const game = new TileGame(canvas);
  game.start();
  console.log('Tile Chasing & Evading — HTML5 Canvas initialized');
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
