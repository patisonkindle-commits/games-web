// main.js — Entry point
import { CityWalkers } from './CityWalkers.js';

function init() {
  const canvas = document.getElementById('gameCanvas');
  if (!canvas) return;
  const game = new CityWalkers(canvas);
  game.start();
}

if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', init);
} else {
  init();
}
