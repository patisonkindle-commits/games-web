import { CONFIG } from '../config.js';
import { rand } from '../utils/math.js';

export class ParticleSystem {
    constructor() {
        this.particles = [];
        for (let i = 0; i < CONFIG.PARTICLE_POOL_SIZE; i++) {
            this.particles.push({
                x: 0, y: 0, vx: 0, vy: 0,
                life: 0, maxLife: 1,
                color: '#ffffff',
                size: 3,
                alive: false,
                decay: 1,
            });
        }
    }

    emit(x, y, count, options = {}) {
        const {
            speed = 100,
            color = '#ffffff',
            size = 3,
            life = 0.6,
            spread = Math.PI * 2,
            direction = 0,
        } = options;

        for (let i = 0; i < count; i++) {
            let p = null;
            for (const candidate of this.particles) {
                if (!candidate.alive) {
                    p = candidate;
                    break;
                }
            }
            if (!p) break;

            const angle = direction + rand(-spread / 2, spread / 2);
            const spd = rand(speed * 0.3, speed);
            p.x = x;
            p.y = y;
            p.vx = Math.cos(angle) * spd;
            p.vy = Math.sin(angle) * spd;
            p.life = rand(life * 0.5, life);
            p.maxLife = p.life;
            p.color = color;
            p.size = rand(size * 0.5, size);
            p.alive = true;
            p.decay = 1;
        }
    }

    emitExplosion(x, y, count = 20) {
        this.emit(x, y, count, {
            speed: 200,
            color: CONFIG.COLORS.ENEMY_SWARMER,
            size: 5,
            life: 0.8,
        });
        this.emit(x, y, count / 2, {
            speed: 150,
            color: '#ffaa00',
            size: 3,
            life: 0.4,
            spread: Math.PI * 0.5,
            direction: -Math.PI / 2,
        });
    }

    emitShipExplosion(x, y) {
        this.emit(x, y, 40, {
            speed: 300,
            color: '#00d4ff',
            size: 6,
            life: 1.0,
        });
        this.emit(x, y, 30, {
            speed: 200,
            color: '#ffffff',
            size: 4,
            life: 0.8,
        });
        this.emit(x, y, 20, {
            speed: 150,
            color: '#ff6600',
            size: 5,
            life: 1.2,
        });
    }

    emitScrapCollect(x, y) {
        this.emit(x, y, 8, {
            speed: 80,
            color: CONFIG.COLORS.SCRAP,
            size: 3,
            life: 0.3,
            spread: Math.PI * 0.8,
            direction: -Math.PI / 2,
        });
    }

    update(dt) {
        for (const p of this.particles) {
            if (!p.alive) continue;
            p.x += p.vx * dt;
            p.y += p.vy * dt;
            p.vx *= 0.96;
            p.vy *= 0.96;
            p.life -= dt;
            p.decay = Math.max(0, p.life / p.maxLife);
            if (p.life <= 0) {
                p.alive = false;
            }
        }
    }

    render(ctx) {
        for (const p of this.particles) {
            if (!p.alive) continue;
            ctx.globalAlpha = p.decay;
            ctx.fillStyle = p.color;
            ctx.shadowColor = p.color;
            ctx.shadowBlur = p.size * 3;
            ctx.beginPath();
            ctx.arc(p.x, p.y, p.size * p.decay, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;
        ctx.shadowBlur = 0;
    }

    reset() {
        for (const p of this.particles) {
            p.alive = false;
        }
    }
}
