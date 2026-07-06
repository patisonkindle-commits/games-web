import { CONFIG } from '../config.js';
import { rand, randInt, distance, angleTo } from '../utils/math.js';

const ENEMY_TYPES = {
    SWARMER: 'swarmer',
    SNIPER: 'sniper',
    TANK: 'tank',
    KAMIKAZE: 'kamikaze',
    BLOCKER: 'blocker',
    BOSS: 'boss',
};

const TYPE_CONFIG = {
    [ENEMY_TYPES.SWARMER]:  { hp: 1, speed: 80, radius: 10, score: 10, scrapDrop: 1, color: '#ff4444' },
    [ENEMY_TYPES.SNIPER]:   { hp: 2, speed: 40, radius: 14, score: 20, scrapDrop: 2, color: '#ff8800' },
    [ENEMY_TYPES.TANK]:     { hp: 6, speed: 30, radius: 20, score: 40, scrapDrop: 4, color: '#aa44ff' },
    [ENEMY_TYPES.KAMIKAZE]: { hp: 2, speed: 160, radius: 12, score: 20, scrapDrop: 2, color: '#ff0044' },
    [ENEMY_TYPES.BLOCKER]:  { hp: 8, speed: 25, radius: 24, score: 50, scrapDrop: 5, color: '#4488ff' },
    [ENEMY_TYPES.BOSS]:     { hp: 40, speed: 35, radius: 32, score: 500, scrapDrop: 0, color: '#ff44ff' },
};

export { ENEMY_TYPES, TYPE_CONFIG };

export class EnemyPool {
    constructor() {
        this.pool = [];
        for (let i = 0; i < CONFIG.ENEMY_POOL_SIZE; i++) {
            this.pool.push(this._create());
        }
        this.active = [];
        this.bossActive = false;
        this.bossPhase2 = false;
        // Bullet hell state
        this.spiralAngle = 0;
    }

    _create() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            radius: 10, hp: 1, maxHp: 1,
            type: ENEMY_TYPES.SWARMER,
            alive: false, color: '#ff4444',
            angle: 0,
            spawnFlash: 0, bobPhase: rand(0, Math.PI * 2),
            // Sniper burst
            burstCount: 0, burstDelay: 0, burstRemaining: 0,
            // Blocker
            blockerWidth: 0,
            // Boss
            bossPhase: 1, phaseTransitionTimer: 0,
            bossMovePattern: 0, bossMoveTimer: 0,
            spiralTimer: 0, ringTimer: 0,
        };
    }

    spawn(type, x, y, wave = 1) {
        let e = null;
        for (const candidate of this.pool) {
            if (!candidate.alive) { e = candidate; break; }
        }
        if (!e) return null;

        const tc = TYPE_CONFIG[type];
        const hpScale = type === ENEMY_TYPES.BOSS ? 1 : 1 + (wave - 1) * 0.1;
        e.x = x; e.y = y;
        e.radius = tc.radius;
        e.hp = type === ENEMY_TYPES.BOSS ? CONFIG.BOSS_HP : Math.ceil(tc.hp * hpScale);
        e.maxHp = e.hp;
        e.type = type; e.alive = true;
        e.color = tc.color;
        e.spawnFlash = 0.3; e.bobPhase = rand(0, Math.PI * 2);
        e.burstRemaining = 0; e.burstDelay = 0;

        if (type === ENEMY_TYPES.BOSS) {
            this.bossActive = true;
            this.bossPhase2 = false;
            e.bossPhase = 1;
            e.phaseTransitionTimer = 0;
            e.bossMovePattern = 0;
            e.bossMoveTimer = 0;
            e.spiralTimer = 0;
            e.ringTimer = 0;
            e.y = -60;
            e.vx = 0;
            e.vy = CONFIG.BOSS_SPEED;
            e.blockerWidth = 0;
            this.spiralAngle = 0;
        } else {
            e.bossPhase = 1;
            e.blockerWidth = type === ENEMY_TYPES.BLOCKER ? CONFIG.WIDTH * 0.3 : 0;
            switch (type) {
                case ENEMY_TYPES.SWARMER:
                    e.vx = rand(-40, 40) + (Math.random() > 0.5 ? 1 : -1) * rand(10, 30);
                    e.vy = rand(tc.speed * 0.6, tc.speed * 1.2);
                    break;
                case ENEMY_TYPES.SNIPER: e.vx = 0; e.vy = tc.speed * 0.5; break;
                case ENEMY_TYPES.TANK: e.vx = 0; e.vy = tc.speed * 0.6; break;
                case ENEMY_TYPES.KAMIKAZE: e.vx = rand(-80, 80); e.vy = rand(60, 120); break;
                case ENEMY_TYPES.BLOCKER: e.vx = 0; e.vy = tc.speed * 0.4; break;
            }
        }
        this.active.push(e);
        return e;
    }

    update(dt, playerX, playerY, bullets) {
        this.spiralAngle += dt * 3;
        for (let i = this.active.length - 1; i >= 0; i--) {
            const e = this.active[i];
            if (!e.alive) { this.active.splice(i, 1); continue; }
            e.bobPhase += dt * 2;
            if (e.spawnFlash > 0) e.spawnFlash -= dt;

            switch (e.type) {
                case ENEMY_TYPES.SWARMER: this._updateSwarmer(e, dt); break;
                case ENEMY_TYPES.SNIPER:  this._updateSniper(e, dt, playerX, playerY, bullets); break;
                case ENEMY_TYPES.TANK:    this._updateTank(e, dt, playerX, playerY, bullets); break;
                case ENEMY_TYPES.KAMIKAZE: this._updateKamikaze(e, dt, playerX, playerY); break;
                case ENEMY_TYPES.BLOCKER: this._updateBlocker(e, dt); break;
                case ENEMY_TYPES.BOSS:    this._updateBoss(e, dt, playerX, playerY, bullets); break;
            }

            if (e.type !== ENEMY_TYPES.BOSS && e.y > CONFIG.HEIGHT + 60) {
                e.alive = false;
            }
            // Boss goes off bottom
            if (e.type === ENEMY_TYPES.BOSS && e.y > CONFIG.HEIGHT + 100) {
                e.alive = false;
                this.bossActive = false;
            }
        }
    }

    _updateSwarmer(e, dt) {
        e.x += e.vx * dt + Math.sin(e.bobPhase) * 30 * dt;
        e.y += e.vy * dt;
        e.x = Math.max(e.radius, Math.min(CONFIG.WIDTH - e.radius, e.x));
    }

    _updateSniper(e, dt, px, py, bullets) {
        if (e.y < CONFIG.HEIGHT * 0.3) {
            e.vy += 20 * dt;
            e.y += e.vy * dt;
        } else {
            e.vy *= 0.95;
            e.y += e.vy * dt;
            e.angle = angleTo(e, { x: px, y: py });

            // 3-burst pattern
            if (e.burstRemaining > 0) {
                e.burstDelay -= dt;
                if (e.burstDelay <= 0) {
                    bullets.fire(e.x, e.y, e.angle + rand(-0.08, 0.08), true, 1);
                    e.burstRemaining--;
                    e.burstDelay = 0.08;
                }
            } else {
                e.shootTimer = e.shootTimer || rand(1.5, 3);
                e.shootTimer -= dt;
                if (e.shootTimer <= 0) {
                    e.burstRemaining = 3;
                    e.burstDelay = 0;
                    e.shootTimer = rand(1.5, 3);
                }
            }
        }
        e.x += Math.sin(e.bobPhase) * 20 * dt;
    }

    _updateTank(e, dt, px, py, bullets) {
        e.y += e.vy * dt;
        e.x += (px - e.x) * 0.2 * dt;
        e.x = Math.max(e.radius, Math.min(CONFIG.WIDTH - e.radius, e.x));

        // Ring burst every 3 seconds
        e.shootTimer = e.shootTimer || 3;
        e.shootTimer -= dt;
        if (e.shootTimer <= 0) {
            e.shootTimer = 2.5 + rand(0, 1);
            const count = 8 + Math.floor(Math.random() * 4);
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2 + rand(-0.1, 0.1);
                bullets.fire(e.x, e.y, a, true, 1);
            }
        }
    }

    _updateKamikaze(e, dt, px, py) {
        const dx = px - e.x; const dy = py - e.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist > 0) {
            const speed = TYPE_CONFIG[ENEMY_TYPES.KAMIKAZE].speed;
            e.vx += (dx / dist) * speed * 2 * dt;
            e.vy += (dy / dist) * speed * 2 * dt;
            const spd = Math.sqrt(e.vx * e.vx + e.vy * e.vy);
            if (spd > speed) { e.vx = (e.vx / spd) * speed; e.vy = (e.vy / spd) * speed; }
        }
        e.x += e.vx * dt; e.y += e.vy * dt;
        e.angle = Math.atan2(e.vy, e.vx);
    }

    _updateBlocker(e, dt) {
        e.y += e.vy * dt;
        e.x += (CONFIG.WIDTH / 2 - e.x) * 0.5 * dt;
    }

    _updateBoss(e, dt, px, py, bullets) {
        // Phase transition check
        if (e.hp < e.maxHp * CONFIG.BOSS_PHASE2_HP_RATIO && e.bossPhase === 1) {
            e.bossPhase = 2;
            this.bossPhase2 = true;
            e.phaseTransitionTimer = 1.0;
            e.color = '#ff0066';
        }

        // Boss enters from top
        if (e.y < 80) {
            e.y += e.vy * dt;
            return;
        }

        // Movement pattern: figure-8 or side-to-side
        e.bossMoveTimer += dt;
        const speed = CONFIG.BOSS_SPEED;
        const pattern = e.bossPhase === 1 ? 1 : 2;

        if (pattern === 1) {
            // Side-to-side with slow vertical drift
            e.x = CONFIG.WIDTH / 2 + Math.sin(e.bossMoveTimer * 0.8) * (CONFIG.WIDTH * 0.3);
            e.y = 80 + Math.sin(e.bossMoveTimer * 0.4) * 20;
        } else {
            // Phase 2: tighter, faster movements
            e.x = CONFIG.WIDTH / 2 + Math.sin(e.bossMoveTimer * 1.2) * (CONFIG.WIDTH * 0.35);
            e.y = 70 + Math.sin(e.bossMoveTimer * 0.6 + 1) * 25;
        }

        // Phase transition flash
        if (e.phaseTransitionTimer > 0) {
            e.phaseTransitionTimer -= dt;
            e.spawnFlash = e.phaseTransitionTimer;
        }

        // --- Bullet Hell Patterns ---

        // Pattern 1: Ring burst
        e.ringTimer -= dt;
        if (e.ringTimer <= 0) {
            const interval = e.bossPhase === 1 ? CONFIG.BOSS_FIRE_INTERVAL : CONFIG.BOSS_FIRE_INTERVAL * 0.7;
            e.ringTimer = interval;
            const count = e.bossPhase === 1 ? CONFIG.BOSS_RING_BULLETS : CONFIG.BOSS_RING_BULLETS + 4;
            for (let i = 0; i < count; i++) {
                const a = (i / count) * Math.PI * 2;
                const spread = rand(-0.05, 0.05);
                bullets.fire(e.x, e.y, a + spread, true, 1);
            }
        }

        // Pattern 2: Spiral (Phase 1 slow, Phase 2 faster)
        e.spiralTimer -= dt;
        if (e.spiralTimer <= 0) {
            const rate = e.bossPhase === 1 ? CONFIG.BOSS_SPIRAL_RATE : CONFIG.BOSS_SPIRAL_RATE * 0.6;
            e.spiralTimer = rate;
            const count = e.bossPhase === 1 ? CONFIG.BOSS_SPIRAL_BULLETS : CONFIG.BOSS_SPIRAL_BULLETS + 2;
            for (let i = 0; i < count; i++) {
                const a = this.spiralAngle + (i / count) * Math.PI * 2;
                bullets.fire(e.x, e.y, a, true, 1);
            }
            this.spiralAngle += 0.5 + (e.bossPhase === 2 ? 0.3 : 0);
        }

        // Phase 2: Aimed shots at player
        if (e.bossPhase === 2) {
            e.shootTimer = e.shootTimer || 1.5;
            e.shootTimer -= dt;
            if (e.shootTimer <= 0) {
                e.shootTimer = 1.0;
                const a = angleTo(e, { x: px, y: py });
                bullets.fire(e.x, e.y, a + rand(-0.1, 0.1), true, 1);
                // Triple shot
                bullets.fire(e.x, e.y, a + rand(-0.12, 0.12), true, 1);
                bullets.fire(e.x, e.y, a + rand(-0.12, 0.12), true, 1);
            }
        }

        // Phase 2: Spawn minions
        if (e.bossPhase === 2) {
            e.bossMoveTimer = e.bossMoveTimer || 0;
            // Marked by bossMovePattern field repurposed as spawn timer
            if (!e.bossMovePattern) e.bossMovePattern = 4;
            e.bossMovePattern -= dt;
            if (e.bossMovePattern <= 0) {
                e.bossMovePattern = 4 + rand(0, 2);
                // Signal to game.js to spawn minions
                this._bossSpawnMinions = true;
                this._bossSpawnX = e.x + rand(-40, 40);
                this._bossSpawnY = e.y + 40;
            }
        }
    }

    // Boss minion spawn signal
    consumeBossSpawnSignal() {
        if (this._bossSpawnMinions) {
            this._bossSpawnMinions = false;
            return { x: this._bossSpawnX, y: this._bossSpawnY };
        }
        return null;
    }

    render(ctx) {
        ctx.save();
        for (const e of this.active) {
            if (!e.alive) continue;
            const flash = e.spawnFlash > 0;
            const alpha = flash ? 0.5 + Math.sin(e.spawnFlash * 30) * 0.5 : 1;
            ctx.globalAlpha = alpha;
            ctx.shadowColor = e.color;
            ctx.shadowBlur = flash ? 20 : 8;

            switch (e.type) {
                case ENEMY_TYPES.SWARMER: this._renderSwarmer(ctx, e); break;
                case ENEMY_TYPES.SNIPER:  this._renderSniper(ctx, e); break;
                case ENEMY_TYPES.TANK:    this._renderTank(ctx, e); break;
                case ENEMY_TYPES.KAMIKAZE: this._renderKamikaze(ctx, e); break;
                case ENEMY_TYPES.BLOCKER: this._renderBlocker(ctx, e); break;
                case ENEMY_TYPES.BOSS:    this._renderBoss(ctx, e); break;
            }
            ctx.shadowBlur = 0;
            ctx.globalAlpha = 1;
        }
        ctx.restore();
    }

    _renderSwarmer(ctx, e) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(e.x, e.y - e.radius);
        ctx.lineTo(e.x + e.radius * 0.7, e.y);
        ctx.lineTo(e.x, e.y + e.radius);
        ctx.lineTo(e.x - e.radius * 0.7, e.y);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff';
        ctx.beginPath(); ctx.arc(e.x, e.y - 2, 2, 0, Math.PI * 2); ctx.fill();
    }

    _renderSniper(ctx, e) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(e.x + Math.cos(a) * e.radius, e.y + Math.sin(a) * e.radius);
        }
        ctx.closePath(); ctx.fill();
        ctx.strokeStyle = e.color; ctx.lineWidth = 2;
        ctx.beginPath(); ctx.moveTo(e.x, e.y);
        ctx.lineTo(e.x + Math.cos(e.angle) * e.radius * 1.5, e.y + Math.sin(e.angle) * e.radius * 1.5);
        ctx.stroke();
    }

    _renderTank(ctx, e) {
        ctx.fillStyle = e.color;
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2;
            ctx.lineTo(e.x + Math.cos(a) * e.radius, e.y + Math.sin(a) * e.radius);
        }
        ctx.closePath(); ctx.fill();
        this._drawHpBar(ctx, e, e.radius * 2, 4);
    }

    _renderKamikaze(ctx, e) {
        ctx.save(); ctx.translate(e.x, e.y); ctx.rotate(e.angle);
        ctx.fillStyle = e.color;
        ctx.beginPath();
        ctx.moveTo(e.radius, 0);
        ctx.lineTo(-e.radius * 0.6, -e.radius * 0.6);
        ctx.lineTo(-e.radius * 0.3, 0);
        ctx.lineTo(-e.radius * 0.6, e.radius * 0.6);
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#ff440088';
        ctx.beginPath();
        ctx.moveTo(-e.radius * 0.3, 0);
        ctx.lineTo(-e.radius - rand(5, 15), -4);
        ctx.lineTo(-e.radius - rand(5, 15), 4);
        ctx.closePath(); ctx.fill();
        ctx.restore();
    }

    _renderBlocker(ctx, e) {
        const w = 40, h = 16;
        ctx.fillStyle = e.color + 'aa';
        ctx.fillRect(e.x - w / 2, e.y - h / 2, w, h);
        ctx.strokeStyle = e.color; ctx.lineWidth = 2;
        ctx.strokeRect(e.x - w / 2, e.y - h / 2, w, h);
        for (let i = 0; i < 3; i++) {
            ctx.strokeStyle = '#ffffff44'; ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.moveTo(e.x - w / 2 + 5 + i * 13, e.y - h / 2 + 2);
            ctx.lineTo(e.x - w / 2 + 5 + i * 13, e.y + h / 2 - 2);
            ctx.stroke();
        }
        this._drawHpBar(ctx, e, w, 3);
    }

    _renderBoss(ctx, e) {
        const px = e.x, py = e.y, r = e.radius;

        // Outer glow
        ctx.shadowColor = e.color;
        ctx.shadowBlur = 30;

        // Main body - large hexagon
        ctx.fillStyle = e.color + 'cc';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(px + Math.cos(a) * r, py + Math.sin(a) * r);
        }
        ctx.closePath(); ctx.fill();

        // Inner core (crystal)
        ctx.fillStyle = '#ffffff33';
        ctx.beginPath();
        for (let i = 0; i < 6; i++) {
            const a = (i / 6) * Math.PI * 2 - Math.PI / 2;
            ctx.lineTo(px + Math.cos(a) * r * 0.5, py + Math.sin(a) * r * 0.5);
        }
        ctx.closePath(); ctx.fill();

        // Center eye
        ctx.fillStyle = e.bossPhase === 2 ? '#ff0044' : '#ff44ff';
        ctx.shadowColor = ctx.fillStyle;
        ctx.shadowBlur = 15;
        ctx.beginPath(); ctx.arc(px, py, 8, 0, Math.PI * 2); ctx.fill();

        // Phase indicator rings
        ctx.shadowBlur = 0;
        ctx.strokeStyle = e.bossPhase === 2 ? '#ff004488' : '#ff44ff44';
        ctx.lineWidth = 1;
        ctx.beginPath(); ctx.arc(px, py, r + 5 + Math.sin(e.bobPhase * 2) * 3, 0, Math.PI * 2);
        ctx.stroke();

        ctx.shadowBlur = 0;

        // HP bar (wide)
        this._drawHpBar(ctx, e, r * 2.5, 6);
    }

    _drawHpBar(ctx, e, width, height) {
        const hpPct = Math.max(0, e.hp / e.maxHp);
        const x = e.x - width / 2;
        const y = e.y + e.radius + 6;
        ctx.fillStyle = '#00000088';
        ctx.fillRect(x, y, width, height);
        ctx.fillStyle = hpPct > 0.5 ? '#00ff44' : hpPct > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(x, y, width * hpPct, height);
        ctx.strokeStyle = '#33336688'; ctx.lineWidth = 1;
        ctx.strokeRect(x, y, width, height);
    }

    takeDamage(e, dmg) {
        e.hp -= dmg;
        e.spawnFlash = 0.1;
        if (e.hp <= 0) {
            if (e.type === ENEMY_TYPES.BOSS) {
                this.bossActive = false;
                this.bossPhase2 = false;
            }
            return true;
        }
        // Check boss phase transition
        if (e.type === ENEMY_TYPES.BOSS && e.bossPhase === 1 && e.hp <= e.maxHp * CONFIG.BOSS_PHASE2_HP_RATIO) {
            e.bossPhase = 2;
            this.bossPhase2 = true;
            e.phaseTransitionTimer = 1.0;
            e.color = '#ff0066';
        }
        return false;
    }

    getBoss() {
        for (const e of this.active) {
            if (e.type === ENEMY_TYPES.BOSS && e.alive) return e;
        }
        return null;
    }

    reset() {
        for (const e of this.active) e.alive = false;
        this.active = [];
        this.bossActive = false;
        this.bossPhase2 = false;
        this._bossSpawnMinions = false;
    }
}
