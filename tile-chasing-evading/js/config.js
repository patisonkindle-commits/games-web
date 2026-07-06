// config.js — Tile-based chasing & evading constants
export const CONFIG = {
  // Grid
  GRID_COLS: 10,
  GRID_ROWS: 10,
  TILE_SIZE: 64,
  get CANVAS_WIDTH()  { return this.GRID_COLS * this.TILE_SIZE; },
  get CANVAS_HEIGHT() { return this.GRID_ROWS * this.TILE_SIZE; },

  // AI
  CHASE_MODE: 1,
  EVADE_MODE: 2,
  MOVE_INTERVAL: 30,   // frames between tile moves (counter % 30 == 0)

  // Colors
  BG_COLOR: '#0a0a1a',
  TILE_LIGHT: '#1a1a3e',
  TILE_DARK:  '#12122a',
  GRID_LINE: 'rgba(255,255,255,0.06)',
  CAT_COLOR: '#e94560',
  MOUSE_COLOR: '#4ecdc4',
  HEAT_MAP_COLORS: [
    'rgba(0,0,0,0)',     // 0 — transparent
    'rgba(233,69,96,0.1)',
    'rgba(233,69,96,0.2)',
    'rgba(233,69,96,0.35)',
    'rgba(233,69,96,0.5)',
    'rgba(255,107,129,0.6)',
  ],

  // Font
  FONT: '14px monospace',
  FONT_SMALL: '11px monospace',
};
