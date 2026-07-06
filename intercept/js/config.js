// config.js — Intercept game constants
export const CONFIG = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 768,

  // Colors
  BG_COLOR: '#16213e',
  ARROW_COLOR: '#ffd93d',
  ARROW_GLOW: '#ff9f43',
  MOUSE_COLOR: '#4ecdc4',
  MOUSE_GLOW: '#7ee8dd',
  TEXT_COLOR: '#e0e0e0',
  HUD_BG: 'rgba(0,0,0,0.6)',
  TRAIL_COLOR: 'rgba(255,217,61,0.15)',
  PREDICT_COLOR: 'rgba(255,107,129,0.3)',
  GRID_COLOR: 'rgba(255,255,255,0.03)',

  // Arrow
  ARROW_LENGTH: 36,
  ARROW_WIDTH: 14,
  ARROW_SPEED_DEFAULT: 120,   // pixels per second
  ARROW_SPEED_MIN: 20,
  ARROW_SPEED_MAX: 400,
  ARROW_ROTATE_SPEED: 120,     // degrees per second

  // Mouse
  MOUSE_SIZE: 28,
  MOUSE_SPEED_DEFAULT: 60,     // pixels per second (bounce speed)

  // Trail
  TRAIL_MAX: 60,

  // Catch
  CATCH_DIST: 20,

  // Font
  FONT: '14px monospace',
  FONT_SMALL: '12px monospace',
  FONT_LARGE: 'bold 24px monospace',
};
