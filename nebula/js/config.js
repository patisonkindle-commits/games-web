export const CONFIG = {
    // Canvas
    WIDTH: 400,
    HEIGHT: 720,

    // Player
    PLAYER_SIZE: 20,
    PLAYER_SPEED: 280,
    PLAYER_FIRE_RATE: 0.12,
    PLAYER_MAX_HP: 3,
    PLAYER_MAX_SHIELD: 2,
    PLAYER_HITBOX_RADIUS: 4,
    PLAYER_UPWARD_OFFSET: 80,

    // Bullets
    BULLET_SPEED: 550,
    BULLET_SIZE: 3,
    BULLET_DAMAGE: 1,
    BULLET_POOL_SIZE: 80,

    // Enemy bullets
    ENEMY_BULLET_SPEED: 250,
    ENEMY_BULLET_SIZE: 4,

    // Enemies
    ENEMY_POOL_SIZE: 100,

    // Scrap
    SCRAP_POOL_SIZE: 80,
    SCRAP_ATTRACT_RADIUS: 120,
    SCRAP_ATTRACT_SPEED: 350,

    // Particles
    PARTICLE_POOL_SIZE: 400,

    // Screen shake
    SHAKE_DECAY: 0.88,
    SHAKE_MAX: 18,

    // Waves
    BASE_ENEMIES_PER_WAVE: 6,
    ENEMIES_PER_WAVE_INCREMENT: 2,
    WAVE_DELAY: 1.5,

    // Level / XP
    SCRAP_PER_LEVEL: 15,
    SCRAP_PER_LEVEL_INCREMENT: 5,
    MAX_LEVEL: 30,

    // Upgrade
    UPGRADE_OPTIONS: 3,

    // Solar Flare
    SOLAR_FLARE_COOLDOWN: 6,
    SOLAR_FLARE_RADIUS: 150,
    SOLAR_FLARE_DURATION: 0.6,

    // Plasma Chain
    PLASMA_CHAIN_RANGE: 80,
    PLASMA_CHAIN_DAMAGE_MULT: 0.5,

    // Gravity Well
    GRAVITY_WELL_RADIUS: 150,
    GRAVITY_WELL_FORCE: 200,

    // Hit-Pause / Impact Freeze
    HIT_PAUSE_DURATION: 0.06,

    // Chromatic Aberration
    CHROMATIC_INTENSITY: 4,
    CHROMATIC_DECAY: 0.85,

    // Boss
    BOSS_WAVES: [5, 10],
    BOSS_HP: 40,
    BOSS_PHASE2_HP_RATIO: 0.5,
    BOSS_SPEED: 35,
    BOSS_RADIUS: 32,
    BOSS_FIRE_INTERVAL: 1.2,
    BOSS_RING_BULLETS: 10,
    BOSS_SPIRAL_BULLETS: 6,
    BOSS_SPIRAL_RATE: 0.15,

    // Metaprogression
    META_INITIAL_CURRENCY: 0,
    META_CORE_BONUS: 5,

    // Audio
    AUDIO_ENABLED: true,
    MASTER_VOLUME: 0.25,

    // Screen flash
    SCREEN_FLASH_DURATION: 0.05,
    TIME_SLOW_FACTOR: 0.3,
    TIME_SLOW_DURATION: 1.0,

    // Colors
    COLORS: {
        BG: '#0a0a1a',
        STAR: '#ffffff',
        PLAYER: '#00d4ff',
        PLAYER_HIT: '#ff4444',
        PLAYER_ENGINE: '#ff6600',
        BULLET: '#00ff88',
        ENEMY_SWARMER: '#ff4444',
        ENEMY_SNIPER: '#ff8800',
        ENEMY_TANK: '#aa44ff',
        ENEMY_KAMIKAZE: '#ff0044',
        ENEMY_BLOCKER: '#4488ff',
        BOSS: '#ff44ff',
        BOSS_BULLET: '#ff0066',
        SCRAP: '#ffdd00',
        CORE: '#ff44ff',
        SHIELD: '#4488ff',
        SHIELD_HIT: '#88ddff',
        HP: '#00ff44',
        HP_BG: '#331111',
        TEXT: '#ffffff',
        TEXT_DIM: '#6666aa',
        TEXT_ACCENT: '#00d4ff',
        UPGRADE_BG: '#111133',
        UPGRADE_BORDER: '#3333aa',
        WAVE_TEXT: '#ffdd00',
        SOLAR_FLARE: '#ff8800',
        FLASH: '#ffffff',
    }
};
