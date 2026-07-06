import { CONFIG } from '../config.js';
import { rand, distance } from '../utils/math.js';

export class ScrapPool {
    constructor() {
        this.pool = [];
        for (let i = 0; i < CONFIG.SCRAP_POOL_SIZE; i++) {
            this.pool.push(this._create());
        }
        this.active = [];
    }

    _create() {
        return {
            x: 0, y: 0, vx: 0, vy: 0,
            radius: 4,
            alive: false,
            type: 'scrap', // 'scrap' or 'core'
            life: 0,
            maxLife: 15,
            bobPhase: rand(0, Math.PI * 2),
        };
    }

    spawn(x, y, type = 'scrap') {
        let s = null;
        for (const candidate of this.pool) {
            if (!candidate.alive) {
                s = candidate;
                break;
            }
        }
        if (!s) return;

        s.x = x;
        s.y = y;
        s.vx = rand(-60, 60);
        s.vy = rand(-80, -20);
        s.alive = true;
        s.type = type;
        s.life = 0;
        s.bobPhase = rand(0, Math.PI * 2);
        this.active.push(s);
    }

    update(dt, playerX, playerY, hasGravityWell) {
        const attractRad = hasGravityWell
            ? CONFIG.GRAVITY_WELL_RADIUS
            : CONFIG.SCRAP_ATTRACT_RADIUS;
        const attractSpeed = hasGravityWell
            ? CONFIG.GRAVITY_WELL_FORCE * 1.5
            : CONFIG.SCRAP_ATTRACT_SPEED;

        for (let i = this.active.length - 1; i >= 0; i--) {
            const s = this.active[i];
            // Initial scatter velocity
            s.x += s.vx * dt;
            s.y += s.vy * dt;
            // Dampen scatter
            s.vx *= 0.98;
            s.vy *= 0.98;

            // Bob
            s.bobPhase += dt * 3;

            // Attract to player
            const dist = distance(s, { x: playerX, y: playerY });
            if (dist < attractRad && dist > 5) {
                const pull = (attractRad - dist) / attractRad;
                const dx = playerX - s.x;
                const dy = playerY - s.y;
                const mag = Math.sqrt(dx * dx + dy * dy);
                s.x += (dx / mag) * pull * attractSpeed * dt;
                s.y += (dy / mag) * pull * attractSpeed * dt;
            }

            s.life += dt;
            if (s.life > s.maxLife || dist < 12) {
                s.alive = false;
                this.active.splice(i, 1);
            }
        }
    }

    render(ctx) {
        for (const s of this.active) {
            const color = s.type === 'scrap' ? CONFIG.COLORS.SCRAP : CONFIG.COLORS.CORE;
            const radius = s.radius + Math.sin(s.bobPhase) * 1;

            // Glow
            ctx.shadowColor = color;
            ctx.shadowBlur = 10;

            // Diamond shape
            ctx.fillStyle = color;
            ctx.beginPath();
            const px = s.x;
            const py = s.y + Math.sin(s.bobPhase) * 1.5;
            ctx.moveTo(px, py - radius);
            ctx.lineTo(px + radius * 0.6, py);
            ctx.lineTo(px, py + radius);
            ctx.lineTo(px - radius * 0.6, py);
            ctx.closePath();
            ctx.fill();
            ctx.shadowBlur = 0;
        }
    }

    reset() {
        for (const s of this.active) {
            s.alive = false;
        }
        this.active = [];
    }
}
