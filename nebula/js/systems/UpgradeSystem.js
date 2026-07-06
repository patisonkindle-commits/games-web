import { CONFIG } from '../config.js';
import { randInt } from '../utils/math.js';

export const UPGRADES = [
    {
        id: 'attackSpeed',
        name: 'Rapid Fire',
        description: '+Attack Speed',
        icon: '⚡',
        color: '#00ff88',
        maxLevel: 5,
        apply: (player) => { player.attackSpeedBonus++; },
    },
    {
        id: 'damage',
        name: 'Heavy Rounds',
        description: '+Damage',
        icon: '💥',
        color: '#ff4444',
        maxLevel: 5,
        apply: (player) => { player.damageBonus++; },
    },
    {
        id: 'shield',
        name: 'Shield Boost',
        description: '+1 Shield',
        icon: '🛡️',
        color: '#4488ff',
        maxLevel: 3,
        apply: (player) => {
            player.shieldBonus++;
            player.shield = Math.min(player.maxShield + player.shieldBonus, player.shield + 1);
        },
    },
    {
        id: 'moveSpeed',
        name: 'Afterburner',
        description: '+Move Speed',
        icon: '🔥',
        color: '#ff8800',
        maxLevel: 3,
        apply: (player) => { player.moveSpeedBonus++; },
    },
    {
        id: 'plasmaChain',
        name: 'Plasma Chain',
        description: 'Bullets chain to nearby enemies',
        icon: '⚡',
        color: '#00ddff',
        maxLevel: 3,
        apply: (player) => {
            player.hasPlasmaChain = true;
            player.plasmaChainLevel++;
        },
    },
    {
        id: 'gravityWell',
        name: 'Gravity Well',
        description: 'Pulls scrap & slows enemies',
        icon: '🌀',
        color: '#aa44ff',
        maxLevel: 2,
        apply: (player) => {
            player.hasGravityWell = true;
            player.gravityWellLevel++;
        },
    },
    {
        id: 'solarFlare',
        name: 'Solar Flare',
        description: 'Periodic pulse destroys bullets',
        icon: '☀️',
        color: '#ff8800',
        maxLevel: 2,
        apply: (player) => {
            player.hasSolarFlare = true;
        },
    },
];

export class UpgradeSystem {
    constructor() {
        this.options = [];
        this.active = false;
        this.selectedIndex = -1;
    }

    generateOptions(player) {
        const available = UPGRADES.filter(u => {
            // Check max level
            switch (u.id) {
                case 'attackSpeed': return player.attackSpeedBonus < u.maxLevel;
                case 'damage': return player.damageBonus < u.maxLevel;
                case 'shield': return player.shieldBonus < u.maxLevel;
                case 'moveSpeed': return player.moveSpeedBonus < u.maxLevel;
                case 'plasmaChain': return player.plasmaChainLevel < u.maxLevel;
                case 'gravityWell': return player.gravityWellLevel < u.maxLevel;
                case 'solarFlare': return !player.hasSolarFlare || player.solarFlareCooldown === 0;
                default: return true;
            }
        });

        // Shuffle and pick 3
        const shuffled = [...available].sort(() => Math.random() - 0.5);
        this.options = shuffled.slice(0, CONFIG.UPGRADE_OPTIONS);
        this.active = true;
        this.selectedIndex = -1;
    }

    select(index, player) {
        if (index < 0 || index >= this.options.length) return;
        const upgrade = this.options[index];
        upgrade.apply(player);
        this.active = false;
        this.options = [];
    }

    render(ctx, canvasW, canvasH) {
        if (!this.active) return;

        // Semi-transparent overlay
        ctx.fillStyle = 'rgba(0, 0, 0, 0.7)';
        ctx.fillRect(0, 0, canvasW, canvasH);

        // Title
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
        ctx.font = 'bold 26px monospace';
        ctx.fillText('LEVEL UP!', canvasW / 2, canvasH * 0.2);

        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '14px monospace';
        ctx.fillText('Choose an upgrade', canvasW / 2, canvasH * 0.2 + 30);

        // Options
        const cardW = 300;
        const cardH = 100;
        const startY = canvasH * 0.32;
        const gap = 20;

        for (let i = 0; i < this.options.length; i++) {
            const opt = this.options[i];
            const y = startY + i * (cardH + gap);

            // Card background
            ctx.fillStyle = CONFIG.COLORS.UPGRADE_BG + 'dd';
            ctx.strokeStyle = CONFIG.COLORS.UPGRADE_BORDER;
            ctx.lineWidth = 2;
            this._roundRect(ctx, canvasW / 2 - cardW / 2, y, cardW, cardH, 10);
            ctx.fill();
            ctx.stroke();

            // Icon
            ctx.fillStyle = opt.color;
            ctx.font = '32px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(opt.icon, canvasW / 2, y + cardH / 2);

            // Name
            ctx.fillStyle = opt.color;
            ctx.font = 'bold 18px monospace';
            ctx.textAlign = 'center';
            ctx.fillText(opt.name, canvasW / 2, y + 28);

            // Description
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '13px monospace';
            ctx.fillText(opt.description, canvasW / 2, y + 50);
        }

        // Hint text
        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '12px monospace';
        ctx.fillText('Tap a card to select', canvasW / 2, canvasH * 0.92);
    }

    handleTap(tapX, tapY, canvasW, canvasH) {
        if (!this.active) return -1;

        const cardW = 300;
        const cardH = 100;
        const startY = canvasH * 0.32;
        const gap = 20;

        for (let i = 0; i < this.options.length; i++) {
            const y = startY + i * (cardH + gap);
            const left = canvasW / 2 - cardW / 2;
            const right = canvasW / 2 + cardW / 2;

            if (tapX >= left && tapX <= right && tapY >= y && tapY <= y + cardH) {
                return i;
            }
        }
        return -1;
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
