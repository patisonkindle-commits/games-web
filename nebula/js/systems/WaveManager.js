import { CONFIG } from '../config.js';
import { ENEMY_TYPES } from '../entities/Enemy.js';
import { rand, randInt } from '../utils/math.js';

export class WaveManager {
    constructor() {
        this.wave = 0;
        this.enemiesRemaining = 0;
        this.enemiesSpawned = 0;
        this.enemiesTotal = 0;
        this.spawnTimer = 0;
        this.spawnInterval = 0.6;
        this.delayTimer = CONFIG.WAVE_DELAY;
        this.active = false;
        this.betweenWaves = true;
        this.waveComplete = false;
        this.elapsed = 0;
    }

    startNextWave() {
        this.wave++;
        const base = CONFIG.BASE_ENEMIES_PER_WAVE;
        const increment = CONFIG.ENEMIES_PER_WAVE_INCREMENT;
        this.enemiesTotal = base + (this.wave - 1) * increment;
        this.enemiesSpawned = 0;
        this.enemiesRemaining = this.enemiesTotal;
        this.spawnTimer = 0;
        this.spawnInterval = Math.max(0.2, 0.6 - this.wave * 0.02);
        this.active = true;
        this.betweenWaves = false;
        this.waveComplete = false;
    }

    update(dt) {
        this.elapsed += dt;

        if (this.betweenWaves) {
            this.delayTimer -= dt;
            if (this.delayTimer <= 0) {
                this.delayTimer = CONFIG.WAVE_DELAY;
                this.startNextWave();
            }
            return null; // no spawn
        }

        if (!this.active) return null;

        this.spawnTimer -= dt;
        if (this.spawnTimer <= 0 && this.enemiesSpawned < this.enemiesTotal) {
            this.spawnTimer = this.spawnInterval;
            this.enemiesSpawned++;
            const enemyType = this._pickEnemyType();
            const x = rand(40, CONFIG.WIDTH - 40);
            return { type: enemyType, x, y: -30 };
        }

        return null;
    }

    onEnemyKilled() {
        this.enemiesRemaining--;
        if (this.enemiesRemaining <= 0 && this.enemiesSpawned >= this.enemiesTotal) {
            this.active = false;
            this.betweenWaves = true;
            this.waveComplete = true;
            this.delayTimer = CONFIG.WAVE_DELAY;
        }
    }

    _pickEnemyType() {
        // Later waves introduce tougher enemies
        const w = this.wave;
        const roll = Math.random();

        if (w <= 2) {
            return ENEMY_TYPES.SWARMER;
        } else if (w <= 4) {
            return roll < 0.7 ? ENEMY_TYPES.SWARMER : ENEMY_TYPES.SNIPER;
        } else if (w <= 6) {
            return roll < 0.4 ? ENEMY_TYPES.SWARMER :
                   roll < 0.7 ? ENEMY_TYPES.SNIPER : ENEMY_TYPES.TANK;
        } else if (w <= 8) {
            return roll < 0.3 ? ENEMY_TYPES.SWARMER :
                   roll < 0.5 ? ENEMY_TYPES.SNIPER :
                   roll < 0.7 ? ENEMY_TYPES.TANK : ENEMY_TYPES.KAMIKAZE;
        } else {
            return roll < 0.25 ? ENEMY_TYPES.SWARMER :
                   roll < 0.45 ? ENEMY_TYPES.SNIPER :
                   roll < 0.6 ? ENEMY_TYPES.TANK :
                   roll < 0.8 ? ENEMY_TYPES.KAMIKAZE : ENEMY_TYPES.BLOCKER;
        }
    }

    reset() {
        this.wave = 0;
        this.enemiesRemaining = 0;
        this.enemiesSpawned = 0;
        this.enemiesTotal = 0;
        this.spawnTimer = 0;
        this.delayTimer = CONFIG.WAVE_DELAY;
        this.active = false;
        this.betweenWaves = true;
        this.waveComplete = false;
        this.elapsed = 0;
    }
}
