// config.js — All tunable constants in one place
export const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 768,

  // Colors
  BG_COLOR: '#16213e',
  CAT_COLOR: '#e94560',
  MOUSE_COLOR: '#0f3460',
  TRAIL_COLOR_CAT: 'rgba(233, 69, 96, 0.3)',
  TRAIL_COLOR_MOUSE: 'rgba(15, 52, 96, 0.3)',
  TEXT_COLOR: '#e0e0e0',
  HUD_BG: 'rgba(0, 0, 0, 0.5)',

  // Entity sizes
  CAT_SIZE: 32,
  MOUSE_SIZE: 20,

  // Speeds (pixels per second)
  CAT_SPEED: 120,
  MOUSE_SPEED: 80,

  // AI modes
  CHASE_MODE: 1,
  EVADE_MODE: 2,
  PLAYER_MODE: 3,

  // Line of sight
  LOS_RADIUS: 200,
  LOS_COLOR: 'rgba(233, 69, 96, 0.15)',
  LOS_BORDER_COLOR: 'rgba(233, 69, 96, 0.5)',

  // Player mouse speed (pixels per second) — WASD control
  PLAYER_MOUSE_SPEED: 180,

  // Trail
  TRAIL_MAX_LENGTH: 20,

  // Particles
  COLLISION_PARTICLE_COUNT: 16,
  COLLISION_PARTICLE_SPEED: 150,
  COLLISION_PARTICLE_LIFE: 0.6,

  // Font
  FONT: '16px monospace',
  FONT_LARGE: 'bold 24px monospace',
};
