// config.js — All tunable constants for Flocking Simulation
export const CONFIG = {
  // Canvas
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 700,

  // Colors
  BG_COLOR: '#0f0f1a',
  BOID_COLOR: '#a78bfa',
  BOID_ACCENT: '#7c5bfa',
  OBSTACLE_COLOR: '#ff6b6b',
  OBSTACLE_INNER: 'rgba(255,107,107,0.15)',
  NEIGHBOR_LINE: 'rgba(167,139,250,0.06)',
  TEXT_COLOR: '#e0e0e0',
  HUD_BG: 'rgba(0,0,0,0.5)',

  // Boid
  BOID_SIZE: 14,
  BOID_SPEED: 100,          // base max speed (pixels/s)
  BOID_FORCE: 200,          // max steering force
  BOID_PERCEPTION: 80,      // radius to detect neighbors
  BOID_SEPARATION_DIST: 24, // minimum separation distance
  BOID_LEAD_SPEED: 140,     // slightly faster for lead boid

  // Default weights (user can tweak via sliders)
  COHESION_WEIGHT: 1.0,
  SEPARATION_WEIGHT: 1.5,
  ALIGNMENT_WEIGHT: 1.0,
  OBSTACLE_AVOID_WEIGHT: 2.5,

  // Obstacle
  OBSTACLE_RADIUS: 18,
  OBSTACLE_AVOID_RADIUS: 50, // how far boid starts avoiding

  // Boid count
  INITIAL_BOID_COUNT: 60,
  MIN_BOIDS: 5,
  MAX_BOIDS: 200,

  // Font
  FONT: '13px monospace',
  FONT_SMALL: '11px monospace',
};
