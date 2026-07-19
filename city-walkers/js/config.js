// config.js — City Walkers constants
export const CONFIG = {
  CANVAS_WIDTH: 1024,
  CANVAS_HEIGHT: 700,

  // Colors
  BG_COLOR: '#0f0f1a',
  ROAD_COLOR: '#1a1a30',
  ROAD_LINE: 'rgba(255,255,255,0.04)',
  SIDEWALK_COLOR: '#1e1e32',
  CROSSWALK_COLOR: 'rgba(255,255,255,0.06)',
  BUILDING_COLOR: '#1a1a28',
  BUILDING_WINDOW: 'rgba(78,205,196,0.06)',
  BUILDING_GLOW: 'rgba(78,205,196,0.02)',
  CITIZEN_BODY: '#4ecdc4',
  CITIZEN_HEAD: '#7ee8dd',
  CITIZEN_ACCENT: '#2ebdb4',

  // Citizen
  CITIZEN_RADIUS: 5,
  WALKER_SPEED: 80,
  PERCEPTION: 65,
  SEPARATION_DIST: 16,
  MAX_FORCE: 200,

  // Path following
  WAYPOINT_REACH_DIST: 6,
  PATH_JITTER: 0.3,

  // Fixed timestep reference for force application
  DT: 1/60,

  // Flocking weights (default)
  COHESION: 0.5,
  SEPARATION: 1.2,
  ALIGNMENT: 0.3,

  // City grid
  GRID_SIZE: 60,           // block size
  ROAD_WIDTH: 30,          // road width
  SIDEWALK_WIDTH: 6,       // sidewalk strip along roads

  // Street layout
  STREETS_H: [0.25, 0.50, 0.75],  // horizontal street fractions
  STREETS_V: [0.33, 0.67],        // vertical street fractions

  // Population
  INITIAL_POP: 40,
  MIN_POP: 5,
  MAX_POP: 120,

  FONT: '12px monospace',
  FONT_SMALL: '10px monospace',
};
