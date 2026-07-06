import { CONFIG } from '../config.js';

export class BulletPool {
    constructor() {
        this.pool = [];
        for (let i = 0; i < CONFIG.BULLET_POOL_SIZE; i++) {
            this.pool.push(this._create());
        }
        this.active = [];
    }

    _create() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            radius: CONFIG.BULLET_SIZE,
            alive: false,
            isEnemy: false,
            damage: CONFIG.BULLET_DAMAGE,
            chainCount: 0,
            life: 0,
            maxLife: 2.5,
        };
    }

    fire(x, y, angle, isEnemy = false, damage = CONFIG.BULLET_DAMAGE) {
        let b = null;
        for (const candidate of this.pool) {
            if (!candidate.alive) {
                b = candidate;
                break;
            }
        }
        if (!b) return null;

        const speed = isEnemy ? CONFIG.ENEMY_BULLET_SPEED : CONFIG.BULLET_SPEED;
        b.x = x;
        b.y = y;
        b.vx = Math.cos(angle) * speed;
        b.vy = Math.sin(angle) * speed;
        b.alive = true;
        b.isEnemy = isEnemy;
        b.damage = damage;
        b.chainCount = 0;
        b.life = 0;
        b.maxLife = isEnemy ? 3 : 2.5;
        this.active.push(b);
        return b;
    }

    update(dt) {
        for (let i = this.active.length - 1; i >= 0; i--) {
            const b = this.active[i];
            b.x += b.vx * dt;
            b.y += b.vy * dt;
            b.life += dt;

            // Off screen or expired
            if (b.life > b.maxLife ||
                b.x < -50 || b.x > CONFIG.WIDTH + 50 ||
                b.y < -50 || b.y > CONFIG.HEIGHT + 50) {
                b.alive = false;
                this.active.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const b of this.active) {
            const color = b.isEnemy ? '#ff4444' : CONFIG.COLORS.BULLET;
            ctx.fillStyle = color;
            ctx.shadowColor = color;
            ctx.shadowBlur = 12;
            ctx.beginPath();
            ctx.arc(b.x, b.y, b.radius, 0, Math.PI * 2);
            ctx.fill();
            ctx.shadowBlur = 0;

            // Trail
            ctx.fillStyle = color + '44';
            ctx.beginPath();
            ctx.arc(b.x - b.vx * 0.02, b.y - b.vy * 0.02, b.radius * 0.7, 0, Math.PI * 2);
            ctx.fill();
        }
    }

    reset() {
        for (const b of this.active) {
            b.alive = false;
        }
        this.active = [];
    }
}
