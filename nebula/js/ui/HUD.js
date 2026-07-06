import { CONFIG } from '../config.js';

export class HUD {
    /**
     * @param {CanvasRenderingContext2D} ctx
     * @param {import('../entities/Player.js').Player} player
     * @param {import('../systems/WaveManager.js').WaveManager} waveManager
     * @param {number} screenShake - shake intensity
     * @param {object} stats - run stats
     * @param {number} cores - current core balance
     */
    render(ctx, player, waveManager, screenShake, stats, cores) {
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // --- HP Bar ---
        const barWidth = 120;
        const barHeight = 12;
        const barX = 15;
        const barY = 15;
        const hpPct = player.hp / player.maxHp;

        ctx.fillStyle = '#1a1a33';
        ctx.fillRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = hpPct > 0.5 ? CONFIG.COLORS.HP :
                        hpPct > 0.25 ? '#ffaa00' : '#ff4444';
        ctx.fillRect(barX, barY, barWidth * hpPct, barHeight);
        ctx.strokeStyle = '#333366';
        ctx.lineWidth = 1;
        ctx.strokeRect(barX, barY, barWidth, barHeight);
        ctx.fillStyle = CONFIG.COLORS.TEXT;
        ctx.font = '10px monospace';
        ctx.textAlign = 'center';
        ctx.fillText(`HP ${player.hp}/${player.maxHp}`, barX + barWidth / 2, barY + 1);
        ctx.textAlign = 'left';

        // Shield pips
        if (player.shield > 0) {
            ctx.fillStyle = CONFIG.COLORS.SHIELD;
            ctx.font = '10px monospace';
            ctx.fillText('🛡️' + '█'.repeat(Math.min(player.shield, 5)), barX, barY + barHeight + 5);
        }

        // --- Wave info (top-right) ---
        ctx.textAlign = 'right';
        ctx.fillStyle = CONFIG.COLORS.WAVE_TEXT;
        ctx.font = 'bold 16px monospace';
        ctx.fillText(`WAVE ${waveManager.wave}`, w - 15, 15);

        if (waveManager.active) {
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '11px monospace';
            ctx.fillText(`${waveManager.enemiesRemaining} remaining`, w - 15, 35);
        }

        // --- Cores display (top-right below wave) ---
        if (cores > 0) {
            ctx.fillStyle = CONFIG.COLORS.CORE;
            ctx.font = '10px monospace';
            ctx.fillText(`💎 ${cores}`, w - 15, 50);
        }

        // --- Level & XP (bottom-left) ---
        ctx.textAlign = 'left';
        ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
        ctx.font = 'bold 14px monospace';
        ctx.fillText(`Lv.${player.level}`, 15, h - 45);

        const xpBarW = 100;
        const xpBarH = 6;
        const xpPct = Math.min(1, player.xp / player.xpToNext);
        ctx.fillStyle = '#1a1a33';
        ctx.fillRect(15, h - 30, xpBarW, xpBarH);
        ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
        ctx.fillRect(15, h - 30, xpBarW * xpPct, xpBarH);

        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '9px monospace';
        ctx.fillText(`XP ${player.xp}/${player.xpToNext}`, 15, h - 20);

        // --- Wave complete text ---
        if (waveManager.waveComplete) {
            ctx.textAlign = 'center';
            ctx.fillStyle = CONFIG.COLORS.WAVE_TEXT;
            ctx.font = 'bold 22px monospace';
            ctx.globalAlpha = Math.min(1, waveManager.delayTimer * 2);
            ctx.fillText(`WAVE ${waveManager.wave} COMPLETE`, w / 2, h * 0.35);
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '14px monospace';
            ctx.fillText('Prepare...', w / 2, h * 0.35 + 28);
            ctx.globalAlpha = 1;
        }

        // Boss warning indicator
        if (CONFIG.BOSS_WAVES.includes(waveManager.wave) && waveManager.active && !waveManager.waveComplete) {
            ctx.textAlign = 'center';
            ctx.fillStyle = CONFIG.COLORS.BOSS;
            ctx.font = 'bold 14px monospace';
            const pulse = 0.5 + Math.sin(Date.now() * 0.005) * 0.5;
            ctx.globalAlpha = pulse;
            ctx.fillText('⚠ BOSS WAVE ⚠', w / 2, h * 0.12);
            ctx.globalAlpha = 1;
        }

        // --- Controls hint (fades out) ---
        if (waveManager.elapsed < 4) {
            ctx.textAlign = 'center';
            ctx.globalAlpha = Math.max(0, 1 - waveManager.elapsed / 4);
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '13px monospace';
            ctx.fillText('👆 Drag to move (auto-fire)', w / 2, h * 0.65);
            ctx.globalAlpha = 1;
        }

        // --- Upgrade indicators (right side) ---
        ctx.textAlign = 'right';
        let yOff = 65;
        if (player.attackSpeedBonus > 0) {
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '10px monospace';
            ctx.fillText(`⚡x${player.attackSpeedBonus + 1}`, w - 15, yOff);
            yOff += 13;
        }
        if (player.damageBonus > 0) {
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '10px monospace';
            ctx.fillText(`💥+${player.damageBonus}`, w - 15, yOff);
            yOff += 13;
        }
        if (player.hasPlasmaChain) {
            ctx.fillStyle = '#00ddff';
            ctx.font = '10px monospace';
            ctx.fillText(`⚡Chain Lv.${player.plasmaChainLevel}`, w - 15, yOff);
            yOff += 13;
        }
        if (player.hasGravityWell) {
            ctx.fillStyle = '#aa44ff';
            ctx.font = '10px monospace';
            ctx.fillText(`🌀Well Lv.${player.gravityWellLevel}`, w - 15, yOff);
            yOff += 13;
        }
        if (player.hasSolarFlare) {
            const ready = player.solarFlareCooldown <= 0;
            ctx.fillStyle = ready ? '#ff8800' : '#664400';
            ctx.font = '10px monospace';
            ctx.fillText(`${ready ? '☀️' : '🌑'}Flare`, w - 15, yOff);
            yOff += 13;
        }

        // --- Archetype Synergy Badges (top-center) ---
        this._renderArchetypeBadges(ctx, player, w, yOff + 5);
    }

    _renderArchetypeBadges(ctx, player, screenW, baseY) {
        const badges = [];

        // Lightning Build: Plasma Chain + Attack Speed >= 3 combined
        const lightningScore = (player.hasPlasmaChain ? player.plasmaChainLevel : 0) + player.attackSpeedBonus;
        if (lightningScore >= 3) {
            badges.push({ icon: '⚡', label: 'LIGHTNING', color: '#00ddff' });
        }

        // Tank Build: Shield + Gravity Well active
        if (player.hasGravityWell && player.shieldBonus >= 1) {
            badges.push({ icon: '🛡️', label: 'TANK', color: '#44aaff' });
        }

        // Solar Build: Solar Flare + Damage bonus >= 2
        if (player.hasSolarFlare && player.damageBonus >= 2) {
            badges.push({ icon: '☀️', label: 'SOLAR', color: '#ff8800' });
        }

        // Speed Build: Move Speed + Attack Speed >= 4 combined
        if (player.moveSpeedBonus + player.attackSpeedBonus >= 4) {
            badges.push({ icon: '💨', label: 'SPEED', color: '#44ff88' });
        }

        if (badges.length === 0) return;

        ctx.textAlign = 'center';
        ctx.font = 'bold 9px monospace';
        let bx = screenW / 2 - (badges.length * 70) / 2;

        for (const badge of badges) {
            const bw = 65;
            const bh = 16;
            const by = baseY;

            // Pill background
            ctx.fillStyle = badge.color + '22';
            ctx.strokeStyle = badge.color + '66';
            ctx.lineWidth = 1;
            this._roundRect(ctx, bx, by, bw, bh, 8);
            ctx.fill();
            ctx.stroke();

            // Text
            ctx.fillStyle = badge.color;
            ctx.fillText(`${badge.icon} ${badge.label}`, bx + bw / 2, by + bh / 2 + 1);

            bx += bw + 4;
        }
    }

    _roundRect(ctx, x, y, w, h, r) {
        ctx.beginPath();
        ctx.moveTo(x + r, y);
        ctx.lineTo(x + w - r, y);
        ctx.quadraticCurveTo(x + w, y, x + w, y + r);
        ctx.lineTo(x + w, y + h - r);
        ctx.quadraticCurveTo(x + w, y + h, x + w - r, y + h);
        ctx.lineTo(x + r, y + h);
        ctx.quadraticCurveTo(x, y + h, x, y + h - r);
        ctx.lineTo(x, y + r);
        ctx.quadraticCurveTo(x, y, x + r, y);
        ctx.closePath();
    }
}
