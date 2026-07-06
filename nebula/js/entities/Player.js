import { CONFIG } from '../config.js';
import { clamp, angleTo, distance } from '../utils/math.js';

export class Player {
    constructor() {
        this.x = CONFIG.WIDTH / 2;
        this.y = CONFIG.HEIGHT - 120;
        this.radius = CONFIG.PLAYER_SIZE;
        this.hitboxRadius = CONFIG.PLAYER_HITBOX_RADIUS;
        this.hp = CONFIG.PLAYER_MAX_HP;
        this.maxHp = CONFIG.PLAYER_MAX_HP;
        this.shield = CONFIG.PLAYER_MAX_SHIELD;
        this.maxShield = CONFIG.PLAYER_MAX_SHIELD;
        this.alive = true;
        this.invulnerable = 0;
        this.fireTimer = 0;
        this.fireRate = CONFIG.PLAYER_FIRE_RATE;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = CONFIG.SCRAP_PER_LEVEL;
        this.totalXp = 0;

        // Upgrade state
        this.attackSpeedBonus = 0;
        this.damageBonus = 0;
        this.hasPlasmaChain = false;
        this.plasmaChainLevel = 0;
        this.hasGravityWell = false;
        this.gravityWellLevel = 0;
        this.hasSolarFlare = false;
        this.solarFlareCooldown = 0;
        this.moveSpeedBonus = 0;
        this.shieldBonus = 0;

        // Visual
        this.engineFlicker = 0;
        this.hitFlash = 0;
        this.trail = [];
    }

    getEffectiveSpeed() {
        return CONFIG.PLAYER_SPEED * (1 + this.moveSpeedBonus * 0.15);
    }

    getEffectiveFireRate() {
        return Math.max(0.04, this.fireRate / (1 + this.attackSpeedBonus * 0.3));
    }

    getEffectiveDamage() {
        return CONFIG.BULLET_DAMAGE * (1 + this.damageBonus * 0.4);
    }

    update(dt, input) {
        if (!this.alive) return;

        // Touch movement
        if (input.isTouching()) {
            const touch = input.getTouchPos();
            // The ship stays above the finger so the player can see
            this.x = touch.x;
            this.y = touch.y - CONFIG.PLAYER_UPWARD_OFFSET;
        }

        // Clamp to screen
        this.x = clamp(this.x, this.radius, CONFIG.WIDTH - this.radius);
        this.y = clamp(this.y, this.radius, CONFIG.HEIGHT - this.radius);

        // Timers
        this.fireTimer -= dt;
        if (this.invulnerable > 0) this.invulnerable -= dt;
        if (this.hitFlash > 0) this.hitFlash -= dt;
        this.engineFlicker += dt * 10;

        // Solar Flare cooldown
        if (this.hasSolarFlare) {
            this.solarFlareCooldown -= dt;
        }

        // Trail
        if (this.trail.length > 20) this.trail.shift();
        this.trail.push({ x: this.x, y: this.y + this.radius * 0.5 });
    }

    canFire() {
        return this.alive && this.fireTimer <= 0;
    }

    resetFireTimer() {
        this.fireTimer = this.getEffectiveFireRate();
    }

    getFireTarget(enemies) {
        let closest = null;
        let closestDist = Infinity;
        for (const e of enemies.active) {
            if (!e.alive) continue;
            const d = distance(this, e);
            if (d < closestDist) {
                closestDist = d;
                closest = e;
            }
        }
        return closest;
    }

    takeDamage(dmg = 1) {
        if (this.invulnerable > 0) return false;

        // Shield absorbs first
        if (this.shield > 0) {
            this.shield--;
            this.invulnerable = 0.15;
            this.hitFlash = 0.15;
            return false; // not HP damage
        }

        this.hp -= dmg;
        this.hitFlash = 0.2;
        this.invulnerable = 0.5;

        if (this.hp <= 0) {
            this.hp = 0;
            this.alive = false;
        }
        return true;
    }

    healShield(amount = 1) {
        this.shield = Math.min(this.maxShield + this.shieldBonus, this.shield + amount);
    }

    addXp(amount) {
        this.totalXp += amount;
        this.xp += amount;
        if (this.xp >= this.xpToNext && this.level < CONFIG.MAX_LEVEL) {
            this.xp -= this.xpToNext;
            this.level++;
            this.xpToNext = CONFIG.SCRAP_PER_LEVEL + (this.level - 1) * CONFIG.SCRAP_PER_LEVEL_INCREMENT;
            return true; // level up!
        }
        return false;
    }

    render(ctx) {
        if (!this.alive) return;

        const px = this.x;
        const py = this.y;

        // Trail
        ctx.globalAlpha = 0.3;
        for (let i = 0; i < this.trail.length; i++) {
            const t = this.trail[i];
            const size = (i / this.trail.length) * 6;
            ctx.fillStyle = CONFIG.COLORS.PLAYER_ENGINE;
            ctx.beginPath();
            ctx.arc(t.x, t.y, size, 0, Math.PI * 2);
            ctx.fill();
        }
        ctx.globalAlpha = 1;

        // Engine glow
        const enginePulse = 0.6 + Math.sin(this.engineFlicker) * 0.4;
        ctx.save();
        const grad = ctx.createRadialGradient(px, py + 12, 2, px, py + 12, 18);
        grad.addColorStop(0, `rgba(255, 100, 0, ${enginePulse * 0.7})`);
        grad.addColorStop(1, 'rgba(255, 100, 0, 0)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(px, py + 12, 18, 0, Math.PI * 2);
        ctx.fill();

        // Shield visual
        if (this.shield > 0) {
            ctx.strokeStyle = CONFIG.COLORS.SHIELD + '66';
            ctx.lineWidth = 2;
            ctx.beginPath();
            ctx.arc(px, py, this.radius + 8, 0, Math.PI * 2);
            ctx.stroke();
        }

        // Ship body
        const bodyColor = this.hitFlash > 0 ? CONFIG.COLORS.PLAYER_HIT : CONFIG.COLORS.PLAYER;
        ctx.shadowColor = bodyColor;
        ctx.shadowBlur = 12;
        ctx.fillStyle = bodyColor;
        ctx.beginPath();
        ctx.moveTo(px, py - this.radius);           // nose
        ctx.lineTo(px - this.radius * 0.8, py + this.radius * 0.6);  // left wing
        ctx.lineTo(px - this.radius * 0.3, py + this.radius * 0.3);  // left indent
        ctx.lineTo(px, py + this.radius * 0.5);                     // back
        ctx.lineTo(px + this.radius * 0.3, py + this.radius * 0.3); // right indent
        ctx.lineTo(px + this.radius * 0.8, py + this.radius * 0.6); // right wing
        ctx.closePath();
        ctx.fill();
        ctx.shadowBlur = 0;

        // Cockpit
        ctx.fillStyle = '#aaddff';
        ctx.beginPath();
        ctx.ellipse(px, py - 2, 5, 7, 0, 0, Math.PI * 2);
        ctx.fill();

        // Hitbox dot (tiny, center)
        ctx.fillStyle = '#ffffff88';
        ctx.beginPath();
        ctx.arc(px, py, this.hitboxRadius, 0, Math.PI * 2);
        ctx.fill();

        ctx.restore();
    }

    reset() {
        this.x = CONFIG.WIDTH / 2;
        this.y = CONFIG.HEIGHT - 120;
        this.hp = CONFIG.PLAYER_MAX_HP;
        this.shield = CONFIG.PLAYER_MAX_SHIELD;
        this.alive = true;
        this.invulnerable = 0;
        this.fireTimer = 0;
        this.level = 1;
        this.xp = 0;
        this.xpToNext = CONFIG.SCRAP_PER_LEVEL;
        this.totalXp = 0;

        this.attackSpeedBonus = 0;
        this.damageBonus = 0;
        this.hasPlasmaChain = false;
        this.plasmaChainLevel = 0;
        this.hasGravityWell = false;
        this.gravityWellLevel = 0;
        this.hasSolarFlare = false;
        this.solarFlareCooldown = 0;
        this.moveSpeedBonus = 0;
        this.shieldBonus = 0;

        this.trail = [];
        this.hitFlash = 0;
    }
}
