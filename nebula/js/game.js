import { CONFIG } from './config.js';
import { Player } from './entities/Player.js';
import { EnemyPool, ENEMY_TYPES } from './entities/Enemy.js';
import { BulletPool } from './entities/Bullet.js';
import { ScrapPool } from './entities/Scrap.js';
import { Input } from './systems/Input.js';
import { ParticleSystem } from './systems/Particles.js';
import { WaveManager } from './systems/WaveManager.js';
import { UpgradeSystem } from './systems/UpgradeSystem.js';
import { AudioManager } from './systems/AudioManager.js';
import MetaProgression from './systems/MetaProgression.js';
import { HUD } from './ui/HUD.js';
import { rand, distance, angleTo, clamp } from './utils/math.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');

        // Systems
        this.input = new Input(canvas);
        this.player = new Player();
        this.enemies = new EnemyPool();
        this.playerBullets = new BulletPool();
        this.enemyBullets = new BulletPool();
        this.scraps = new ScrapPool();
        this.particles = new ParticleSystem();
        this.waveManager = new WaveManager();
        this.upgradeSystem = new UpgradeSystem();
        this.audio = new AudioManager();
        this.meta = new MetaProgression();
        this.hud = new HUD();

        // State
        this.state = 'menu'; // menu, playing, upgrading, gameover, metaTree
        this.score = 0;
        this.screenShake = 0;
        this.chromaticIntensity = 0;

        // Hit-pause
        this.hitPause = 0;

        // Screen flash
        this.flashAlpha = 0;
        this.timeSlow = 0;

        // Boss tracking
        this.bossSpawnedThisWave = false;
        this.bossDefeated = false;

        // Stats (death recap)
        this.stats = this._freshStats();

        // Stars
        this.stars = [];
        for (let i = 0; i < 80; i++) {
            this.stars.push({
                x: rand(0, CONFIG.WIDTH),
                y: rand(0, CONFIG.HEIGHT),
                size: rand(0.5, 2),
                speed: rand(20, 80),
                brightness: rand(0.3, 1),
            });
        }

        // Temp canvas for chromatic aberration
        this._chromaCanvas = document.createElement('canvas');
        this._chromaCanvas.width = CONFIG.WIDTH;
        this._chromaCanvas.height = CONFIG.HEIGHT;
        this._chromaCtx = this._chromaCanvas.getContext('2d');

        // Game loop timing
        this.lastFrame = 0;
        this.running = false;
        this._loop = this._loop.bind(this);

        // Gravity well visual
        this.gravityPulse = 0;
    }

    _freshStats() {
        return {
            enemiesKilled: 0,
            totalDamageTaken: 0,
            timeSurvived: 0,
            bossesKilled: 0,
            scrapCollected: 0,
            coresCollected: 0,
            upgradesTaken: [],
        };
    }

    start() {
        this.running = true;
        this.lastFrame = performance.now();
        // Use RAF if available, fall back to setTimeout
        this._rafId = requestAnimationFrame(this._loop);
        // Safety: if RAF doesn't fire (headless browser), setTimeout kicks in
        if (!this._rafFallback) {
            this._rafFallback = true;
            this._fallbackTimer = setInterval(() => {
                const now = performance.now();
                if (now - this.lastFrame > 100 && this.running) {
                    this._loop(now);
                }
            }, 16);
        }
    }

    _loop(timestamp) {
        if (!this.running) return;
        
        try {
            // If RAF is working, clear the fallback timer
            if (this._fallbackTimer) {
                clearInterval(this._fallbackTimer);
                this._fallbackTimer = null;
            }
            
            if (window.__fpsCount !== undefined) window.__fpsCount++;

            const rawDt = (timestamp - this.lastFrame) / 1000;
            this.lastFrame = timestamp;
            let dt = Math.min(rawDt, 0.05);

            // Hit-pause: freeze everything
            if (this.hitPause > 0) {
                this.hitPause -= dt;
                this._render();
                requestAnimationFrame(this._loop);
                return;
            }

            // Time slow during level-up transition
            if (this.timeSlow > 0) {
                this.timeSlow -= dt;
                dt *= CONFIG.TIME_SLOW_FACTOR;
            }

            // Update screen shake
            if (this.screenShake > 0) {
                this.screenShake *= CONFIG.SHAKE_DECAY;
                if (this.screenShake < 0.5) this.screenShake = 0;
            }

            // Update chromatic
            if (this.chromaticIntensity > 0) {
                this.chromaticIntensity *= CONFIG.CHROMATIC_DECAY;
                if (this.chromaticIntensity < 0.5) this.chromaticIntensity = 0;
            }

            // Screen flash decay
            if (this.flashAlpha > 0) {
                this.flashAlpha -= dt * 3;
                if (this.flashAlpha < 0) this.flashAlpha = 0;
            }

            switch (this.state) {
                case 'menu': this._updateMenu(dt); break;
                case 'playing':
                    this.stats.timeSurvived += dt;
                    this._updatePlaying(dt);
                    this._checkCollisions();
                    break;
                case 'upgrading': this._updateUpgrading(dt); break;
                case 'gameover': this._updateGameOver(dt); break;
                case 'metaTree': this._updateMetaTree(dt); break;
            }

            this.input.postFrame();
            this._render();
        } catch (e) {
            console.error('GAME LOOP CRASH:', e.message, e.stack);
            // Don't die - restart the loop
            this.lastFrame = performance.now();
            // Don't return - fall through to the RAF scheduling below
        }
        
        // Always schedule next frame (whether there was an error or not)
        requestAnimationFrame(this._loop);
    }

    // ==================== MENU ====================

    _updateMenu(dt) {
        for (const star of this.stars) {
            star.y += star.speed * dt;
            if (star.y > CONFIG.HEIGHT) { star.y = -2; star.x = rand(0, CONFIG.WIDTH); }
            star.brightness = 0.5 + Math.sin(star.y * 0.01 + Date.now() * 0.001) * 0.3;
        }
        if (this.input.wasTapped()) {
            this._startGame();
        }
    }

    // ==================== START GAME ====================

    _startGame() {
        this.player.reset();
        this.enemies.reset();
        this.playerBullets.reset();
        this.enemyBullets.reset();
        this.scraps.reset();
        this.particles.reset();
        this.waveManager.reset();
        this.score = 0;
        this.screenShake = 0;
        this.chromaticIntensity = 0;
        this.hitPause = 0;
        this.flashAlpha = 0;
        this.timeSlow = 0;
        this.bossSpawnedThisWave = false;
        this.bossDefeated = false;
        this.stats = this._freshStats();
        this.gravityPulse = 0;
        this.state = 'playing';

        // Apply metaprogression bonuses
        this._applyMetaBonuses();
    }

    _applyMetaBonuses() {
        const mods = this.meta.getAppliedModifiers();
        if (mods.startingHp) {
            this.player.maxHp += mods.startingHp;
            this.player.hp = this.player.maxHp;
        }
        if (mods.startingShield) {
            this.player.maxShield += mods.startingShield;
            this.player.shield = this.player.maxShield;
        }
        if (mods.moveSpeed) {
            this.player.moveSpeedBonus += Math.floor(mods.moveSpeed / 5); // convert % to bonus level
        }
        if (mods.fireRate) {
            this.player.attackSpeedBonus += mods.fireRate;
        }
        if (mods.damageBoost) {
            this.player.damageBonus += mods.damageBoost;
        }
        if (mods.magnetRadius) {
            // Handled via CONFIG override in scrap update
            this._magnetBonus = mods.magnetRadius * 0.15;
        } else {
            this._magnetBonus = 0;
        }
        this._hasScrapMagnet = mods.scrapMagnet || false;
        this._hasCoreMagnet = mods.coreMagnet || false;
    }

    // ==================== PLAYING ====================

    _updatePlaying(dt) {
        const { player, enemies, playerBullets: pBullets, enemyBullets: eBullets,
                scraps, particles, waveManager, input } = this;

        // Update player
        player.update(dt, input);

        // Auto-fire
        if (player.canFire()) {
            const target = player.getFireTarget(enemies);
            let angle = target ? angleTo(player, target) : -Math.PI / 2;
            const spread = rand(-0.05, 0.05);
            const b = pBullets.fire(player.x, player.y, angle + spread, false, player.getEffectiveDamage());
            if (b) {
                particles.emit(player.x, player.y - player.radius, 3, {
                    speed: 80, color: CONFIG.COLORS.BULLET, size: 2, life: 0.1,
                    spread: Math.PI * 0.3, direction: -Math.PI / 2,
                });
                this.audio.fire();
            }
            player.resetFireTimer();
        }

        // Solar Flare
        if (player.hasSolarFlare && player.solarFlareCooldown <= 0 && player.alive) {
            player.solarFlareCooldown = CONFIG.SOLAR_FLARE_COOLDOWN;
            this._triggerSolarFlare();
        }

        // Wave manager
        const spawn = waveManager.update(dt);
        if (spawn) {
            enemies.spawn(spawn.type, spawn.x, spawn.y, waveManager.wave);
        }

        // Boss spawning
        if (CONFIG.BOSS_WAVES.includes(waveManager.wave) && !enemies.bossActive && !this.bossSpawnedThisWave) {
            this.bossSpawnedThisWave = true;
            this.bossDefeated = false;
            enemies.spawn(ENEMY_TYPES.BOSS, CONFIG.WIDTH / 2, -60, waveManager.wave);
            this.audio.bossWarning();
            // Screen shake + flash to announce boss
            this.screenShake = 12;
            this.chromaticIntensity = 6;
            this.flashAlpha = 0.3;
        }

        // Boss minion spawning (Phase 2)
        const bossSpawn = enemies.consumeBossSpawnSignal();
        if (bossSpawn) {
            // Spawn 2 swarmers near boss
            enemies.spawn(ENEMY_TYPES.SWARMER, bossSpawn.x - 30, bossSpawn.y, waveManager.wave);
            enemies.spawn(ENEMY_TYPES.SWARMER, bossSpawn.x + 30, bossSpawn.y, waveManager.wave);
        }

        // Update enemies
        enemies.update(dt, player.x, player.y, eBullets);

        // If boss was active but now dead, mark defeated
        if (this.bossSpawnedThisWave && !enemies.bossActive && !this.bossDefeated && this.waveManager.active) {
            this.bossDefeated = true;
            this.stats.bossesKilled++;
            this.meta.earnCores(CONFIG.META_CORE_BONUS);
            this.flashAlpha = 0.5;
            this.screenShake = 8;
            // Kill remaining non-boss enemies for wave completion
            for (const e of enemies.active) {
                if (e.alive && e.type !== ENEMY_TYPES.BOSS) {
                    this._killEnemy(e);
                }
            }
        }

        // Update bullets
        pBullets.update(dt);
        eBullets.update(dt);

        // Update scraps (with magnet bonus)
        scraps.update(dt, player.x, player.y, player.hasGravityWell, this._magnetBonus);

        // Update particles
        particles.update(dt);

        // Gravity well visual pulse
        if (player.hasGravityWell) {
            this.gravityPulse += dt * 2;
        }

        // Scrap magnet - auto collect
        if (this._hasScrapMagnet || this._hasCoreMagnet) {
            for (const s of scraps.active) {
                if (!s.alive) continue;
                const dist = distance(player, s);
                const autoRadius = this._hasScrapMagnet ? 30 : 0;
                const coreRadius = this._hasCoreMagnet ? 200 : 0;
                const collectRadius = Math.max(
                    s.type === 'core' ? coreRadius : 0,
                    s.type === 'scrap' ? autoRadius : 0
                );
                if (collectRadius > 0 && dist < collectRadius) {
                    s.alive = false;
                    this._collectScrap(s);
                }
            }
        }

        // Scrap collection check
        this._checkScrapCollection();

        // Gravity Well passive
        if (player.hasGravityWell) {
            this._applyGravityWell(dt);
        }

        // Stars
        for (const star of this.stars) {
            star.y += star.speed * dt;
            if (star.y > CONFIG.HEIGHT) { star.y = -2; star.x = rand(0, CONFIG.WIDTH); }
        }
    }

    _triggerSolarFlare() {
        const { player, particles } = this;
        particles.emit(player.x, player.y, 60, {
            speed: 200, color: CONFIG.COLORS.SOLAR_FLARE, size: 6, life: 0.8,
        });
        particles.emit(player.x, player.y, 30, {
            speed: 150, color: '#ffffff', size: 4, life: 0.6,
        });

        const radius = CONFIG.SOLAR_FLARE_RADIUS;
        for (const b of this.enemyBullets.active) {
            if (!b.alive) continue;
            if (distance({ x: player.x, y: player.y }, b) < radius) {
                b.alive = false;
                particles.emit(b.x, b.y, 5, { speed: 50, color: '#ff8800', size: 2, life: 0.3 });
            }
        }
        for (const e of this.enemies.active) {
            if (!e.alive) continue;
            if (distance({ x: player.x, y: player.y }, e) < radius) {
                const dmg = 2 + this.player.plasmaChainLevel;
                if (this.enemies.takeDamage(e, dmg)) {
                    this._killEnemy(e);
                } else {
                    particles.emit(e.x, e.y, 5, { speed: 60, color: '#ff8800', size: 2, life: 0.3 });
                }
            }
        }
        this.screenShake = 8;
        this.chromaticIntensity = 4;
        this.audio.explosion();
    }

    _applyGravityWell(dt) {
        const { player, enemies } = this;
        const radius = CONFIG.GRAVITY_WELL_RADIUS;
        for (const e of enemies.active) {
            if (!e.alive) continue;
            const dist = distance(player, e);
            if (dist < radius && dist > 5) {
                const pull = (radius - dist) / radius;
                const dx = player.x - e.x;
                const dy = player.y - e.y;
                const mag = Math.sqrt(dx * dx + dy * dy);
                const force = CONFIG.GRAVITY_WELL_FORCE * pull * 0.3;
                e.x += (dx / mag) * force * dt;
                e.y += (dy / mag) * force * dt;
                e.vx *= (1 - pull * 0.3 * dt);
                e.vy *= (1 - pull * 0.3 * dt);
            }
        }
    }

    // ==================== COLLISIONS ====================

    _checkCollisions() {
        const { player, enemies, playerBullets: pBullets, enemyBullets: eBullets,
                scraps, particles } = this;
        if (!player.alive) return;

        // Player bullets vs enemies
        for (const b of pBullets.active) {
            if (!b.alive || b.isEnemy) continue;
            for (const e of enemies.active) {
                if (!e.alive) continue;
                if (distance(b, e) < b.radius + e.radius) {
                    const killed = enemies.takeDamage(e, b.damage);
                    b.alive = false;
                    this.stats.totalDamageTaken += b.damage;

                    particles.emit(b.x, b.y, 6, { speed: 80, color: e.color, size: 3, life: 0.3 });

                    if (killed) {
                        this._killEnemy(e);
                        this.audio.explosion();
                    } else {
                        this.audio.hit();
                    }

                    if (player.hasPlasmaChain && player.plasmaChainLevel > 0) {
                        this._chainLightning(e);
                    }
                    break;
                }
            }
        }

        // Enemy bullets vs player
        for (const b of eBullets.active) {
            if (!b.alive || !b.isEnemy) continue;
            if (distance(b, player) < b.radius + player.hitboxRadius) {
                b.alive = false;
                const hpDmg = player.takeDamage(b.damage);
                particles.emit(player.x, player.y, 10, { speed: 100, color: CONFIG.COLORS.PLAYER_HIT, size: 4, life: 0.4 });

                if (hpDmg) {
                    this.screenShake = Math.min(CONFIG.SHAKE_MAX, this.screenShake + 10);
                    this.chromaticIntensity = Math.min(8, this.chromaticIntensity + 4);
                    this.audio.hit();
                    this.stats.totalDamageTaken++;
                } else {
                    particles.emit(player.x, player.y, 8, { speed: 80, color: CONFIG.COLORS.SHIELD_HIT, size: 3, life: 0.3 });
                    this.screenShake = Math.min(CONFIG.SHAKE_MAX, this.screenShake + 3);
                    this.audio.shieldHit();
                }

                if (!player.alive) {
                    this._playerDied();
                    return;
                }
            }
        }

        // Enemies vs player (contact)
        for (const e of enemies.active) {
            if (!e.alive) continue;
            if (distance(e, player) < e.radius + player.hitboxRadius) {
                if (e.type === ENEMY_TYPES.KAMIKAZE) {
                    e.alive = false;
                    particles.emitExplosion(e.x, e.y, 30);
                    this.screenShake = Math.min(CONFIG.SHAKE_MAX, this.screenShake + 6);
                    this.audio.explosion();
                }
                if (e.type === ENEMY_TYPES.BOSS) {
                    // Boss contact damage is high
                    const hpDmg = player.takeDamage(2);
                    if (hpDmg) {
                        this.screenShake = Math.min(CONFIG.SHAKE_MAX, this.screenShake + 15);
                        this.audio.hit();
                    }
                    // Push player away
                    const angle = angleTo(e, player);
                    player.x += Math.cos(angle) * 60;
                    player.y += Math.sin(angle) * 60;
                } else {
                    const hpDmg = player.takeDamage(1);
                    if (hpDmg) {
                        this.screenShake = Math.min(CONFIG.SHAKE_MAX, this.screenShake + 8);
                        this.audio.hit();
                    }
                    const angle = angleTo(player, e);
                    e.x += Math.cos(angle) * 30;
                    e.y += Math.sin(angle) * 30;
                }

                if (!player.alive) {
                    this._playerDied();
                    return;
                }
            }
        }
    }

    _chainLightning(sourceEnemy) {
        const chainRange = CONFIG.PLASMA_CHAIN_RANGE + this.player.plasmaChainLevel * 20;
        const maxChains = this.player.plasmaChainLevel + 1;
        let chained = [{ x: sourceEnemy.x, y: sourceEnemy.y }];

        for (let c = 0; c < maxChains; c++) {
            const origin = chained[chained.length - 1];
            let closest = null, closestDist = chainRange;

            for (const e of this.enemies.active) {
                if (!e.alive) continue;
                let skip = false;
                for (const ce of chained) {
                    if (ce.x === e.x && ce.y === e.y) { skip = true; break; }
                }
                if (skip) continue;
                const dist = distance(origin, e);
                if (dist < closestDist) { closestDist = dist; closest = e; }
            }
            if (!closest) break;

            const chainDmg = CONFIG.BULLET_DAMAGE * CONFIG.PLASMA_CHAIN_DAMAGE_MULT;
            const killed = this.enemies.takeDamage(closest, chainDmg);

            for (let i = 0; i < 12; i++) {
                const t = i / 12;
                const px = origin.x + (closest.x - origin.x) * t + rand(-10, 10);
                const py = origin.y + (closest.y - origin.y) * t + rand(-10, 10);
                this.particles.emit(px, py, 1, { speed: 20, color: '#00ddff', size: rand(2, 4), life: 0.15 });
            }

            if (killed) {
                this._killEnemy(closest);
                this.audio.explosion();
            }

            chained.push({ x: closest.x, y: closest.y });
        }
    }

    // ==================== KILL / COLLECT ====================

    _killEnemy(e) {
        e.alive = false;
        this.stats.enemiesKilled++;
        this.score += 10;

        const isTank = e.type === ENEMY_TYPES.TANK;
        const isBoss = e.type === ENEMY_TYPES.BOSS;
        const isBlocker = e.type === ENEMY_TYPES.BLOCKER;

        this.particles.emitExplosion(e.x, e.y, isBoss ? 60 : isTank ? 30 : 15);
        this.screenShake = Math.min(CONFIG.SHAKE_MAX, this.screenShake + (isBoss ? 18 : 3));
        this.chromaticIntensity = Math.min(8, this.chromaticIntensity + (isBoss ? 6 : 1));
        this.hitPause = isBoss ? 0.12 : CONFIG.HIT_PAUSE_DURATION;

        // Drop scrap / cores
        let dropCount = isBoss ? 20 : isTank ? 4 : isBlocker ? 5 : e.type === ENEMY_TYPES.SWARMER ? 1 : 2;
        for (let i = 0; i < dropCount; i++) {
            const isCore = isBoss ? Math.random() < 0.5 : Math.random() < 0.1;
            this.scraps.spawn(e.x + rand(-15, 15), e.y + rand(-15, 15), isCore ? 'core' : 'scrap');
        }

        this.waveManager.onEnemyKilled();
    }

    _checkScrapCollection() {
        const { player, scraps, particles } = this;
        const collectRadius = 12;

        for (const s of scraps.active) {
            if (!s.alive) continue;
            if (distance(player, s) < collectRadius) {
                s.alive = false;
                this._collectScrap(s);
            }
        }
    }

    _collectScrap(s) {
        const { player, particles } = this;
        particles.emitScrapCollect(s.x, s.y);

        if (s.type === 'core') {
            this.stats.coresCollected++;
            this.meta.earnCores(1);
            const leveled = player.addXp(5);
            if (leveled) this._onLevelUp();
        } else {
            this.stats.scrapCollected++;
            if (player.shield < player.maxShield + player.shieldBonus && Math.random() < 0.15) {
                player.healShield(1);
            }
            particles.emit(s.x, s.y, 3, { speed: 40, color: CONFIG.COLORS.SCRAP, size: 2, life: 0.2 });
            this.audio.scrapCollect();

            const leveled = player.addXp(1);
            if (leveled) {
                this._onLevelUp();
                this.audio.levelUp();
            }
        }
    }

    _onLevelUp() {
        this.upgradeSystem.generateOptions(this.player);
        this.state = 'upgrading';
        // Screen flash + time slow
        this.flashAlpha = 0.8;
        this.timeSlow = CONFIG.TIME_SLOW_DURATION;
    }

    _playerDied() {
        this.state = 'gameover';
        this.particles.emitShipExplosion(this.player.x, this.player.y);
        this.screenShake = CONFIG.SHAKE_MAX;
        this.chromaticIntensity = 10;
        this.flashAlpha = 1;
        this.deathTimer = 0;
        this.audio.gameOver();
    }

    // ==================== UPGRADING ====================

    _updateUpgrading(dt) {
        // Particles still animate slowly
        this.particles.update(dt * 0.3);

        if (this.input.wasTapped()) {
            const pos = this.input.getTouchPos();
            const index = this.upgradeSystem.handleTap(pos.x, pos.y, CONFIG.WIDTH, CONFIG.HEIGHT);
            if (index >= 0) {
                const opt = this.upgradeSystem.options[index];
                this.stats.upgradesTaken.push(opt.id);
                this.upgradeSystem.select(index, this.player);
                this.state = 'playing';
                this.timeSlow = 0;
            }
        }
    }

    // ==================== GAME OVER ====================

    _updateGameOver(dt) {
        this.deathTimer += dt;
        this.particles.update(dt);
        for (const star of this.stars) {
            star.y += star.speed * dt;
            if (star.y > CONFIG.HEIGHT) { star.y = -2; star.x = rand(0, CONFIG.WIDTH); }
        }

        if (this.deathTimer > 1.0) {
            if (this.input.wasTapped()) {
                this._startGame();
            }
        }
    }

    // ==================== META TREE ====================

    _updateMetaTree(dt) {
        if (this.input.wasTapped()) {
            const pos = this.input.getTouchPos();
            const action = this.meta.handleTap(pos.x, pos.y, CONFIG.WIDTH, CONFIG.HEIGHT);
            if (action === 'back') {
                this.state = 'gameover';
            } else if (action && action.startsWith('purchase:')) {
                const id = action.replace('purchase:', '');
                if (this.meta.canAfford(id)) {
                    this.meta.purchase(id);
                    this.audio.levelUp();
                }
            }
        }
    }

    // ==================== RENDER ====================

    _render() {
        const ctx = this.ctx;
        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Save for screen shake
        ctx.save();
        if (this.screenShake > 0.5) {
            ctx.translate((Math.random() - 0.5) * this.screenShake, (Math.random() - 0.5) * this.screenShake);
        }

        // Clear
        ctx.fillStyle = CONFIG.COLORS.BG;
        ctx.fillRect(0, 0, w, h);

        // Stars
        for (const star of this.stars) {
            ctx.fillStyle = `rgba(255, 255, 255, ${star.brightness * 0.6})`;
            ctx.beginPath(); ctx.arc(star.x, star.y, star.size, 0, Math.PI * 2); ctx.fill();
        }

        switch (this.state) {
            case 'menu': this._renderMenu(ctx, w, h); break;
            case 'playing': this._renderPlaying(ctx, w, h); break;
            case 'upgrading':
                this._renderPlaying(ctx, w, h);
                this.upgradeSystem.render(ctx, w, h);
                break;
            case 'gameover': this._renderGameOver(ctx, w, h); break;
            case 'metaTree': this.meta.render(ctx, w, h); break;
        }

        // Screen flash overlay
        if (this.flashAlpha > 0.01) {
            ctx.globalAlpha = this.flashAlpha;
            ctx.fillStyle = CONFIG.COLORS.FLASH;
            ctx.fillRect(0, 0, w, h);
            ctx.globalAlpha = 1;
        }

        ctx.restore(); // restore from screen shake

        // Chromatic aberration (post-process after shake)
        if (this.chromaticIntensity > 0.5) {
            this._applyChromatic(ctx);
        }
    }

    _applyChromatic(ctx) {
        const shift = Math.min(this.chromaticIntensity * 0.25, 3);
        if (shift < 0.3) return;

        const w = CONFIG.WIDTH;
        const h = CONFIG.HEIGHT;

        // Capture current frame
        this._chromaCtx.drawImage(this.canvas, 0, 0);

        // Redraw with color shifts via composite
        ctx.clearRect(0, 0, w, h);

        // Red channel shifted left
        ctx.globalAlpha = 0.3;
        ctx.drawImage(this._chromaCanvas, -shift, 0);

        // Blue channel shifted right
        ctx.drawImage(this._chromaCanvas, shift, 0);

        // Green channel centered (base)
        ctx.globalAlpha = 0.85;
        ctx.drawImage(this._chromaCanvas, 0, 0);

        ctx.globalAlpha = 1;
    }

    // ==================== RENDER: MENU ====================

    _renderMenu(ctx, w, h) {
        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        ctx.shadowColor = CONFIG.COLORS.TEXT_ACCENT; ctx.shadowBlur = 30;
        ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
        ctx.font = 'bold 42px monospace';
        ctx.fillText('NEBULA', w / 2, h * 0.3);

        ctx.shadowBlur = 15;
        ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
        ctx.font = 'bold 28px monospace';
        ctx.fillText('Project', w / 2, h * 0.3 - 50);
        ctx.shadowBlur = 0;

        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '14px monospace';
        ctx.fillText('A Roguelite Bullet-Heaven Shooter', w / 2, h * 0.3 + 55);

        // Ship preview
        ctx.save(); ctx.translate(w / 2, h * 0.48);
        ctx.fillStyle = CONFIG.COLORS.PLAYER;
        ctx.beginPath();
        ctx.moveTo(0, -15); ctx.lineTo(-12, 10); ctx.lineTo(-6, 7);
        ctx.lineTo(0, 11); ctx.lineTo(6, 7); ctx.lineTo(12, 10);
        ctx.closePath(); ctx.fill();
        ctx.restore();

        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '12px monospace';
        ctx.fillText('👆 Touch & drag anywhere to move', w / 2, h * 0.58);
        ctx.fillText('Auto-fire enabled', w / 2, h * 0.62);

        const pulse = 0.6 + Math.sin(Date.now() * 0.003) * 0.4;
        ctx.globalAlpha = pulse;
        ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
        ctx.font = 'bold 18px monospace';
        ctx.fillText('TAP TO START', w / 2, h * 0.75);
        ctx.globalAlpha = 1;

        // Meta progression button hint
        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '10px monospace';
        const coreCount = this.meta.getBalance();
        ctx.fillText(`[ Cores: ${coreCount} ]`, w / 2, h * 0.82);
        ctx.fillText('Hold for Talent Tree on game over', w / 2, h - 20);
    }

    // ==================== RENDER: PLAYING ====================

    _renderPlaying(ctx, w, h) {
        // Gravity Well visual
        if (this.player.hasGravityWell && this.player.alive) {
            const pulse = 0.3 + Math.sin(this.gravityPulse) * 0.15;
            ctx.strokeStyle = `rgba(170, 68, 255, ${pulse})`;
            ctx.lineWidth = 2;
            ctx.setLineDash([5, 10]);
            ctx.beginPath();
            ctx.arc(this.player.x, this.player.y, CONFIG.GRAVITY_WELL_RADIUS, 0, Math.PI * 2);
            ctx.stroke();
            ctx.setLineDash([]);
        }

        this.scraps.render(ctx);
        this.enemies.render(ctx);
        this.player.render(ctx);
        this.playerBullets.render(ctx);
        this.enemyBullets.render(ctx);
        this.particles.render(ctx);
        this.hud.render(ctx, this.player, this.waveManager, this.screenShake, this.stats, this.meta.getBalance());
    }

    // ==================== RENDER: GAME OVER ====================

    _renderGameOver(ctx, w, h) {
        this.scraps.render(ctx);
        this.enemies.render(ctx);
        this.particles.render(ctx);

        ctx.fillStyle = 'rgba(0, 0, 0, 0.6)';
        ctx.fillRect(0, 0, w, h);

        ctx.textAlign = 'center'; ctx.textBaseline = 'middle';

        ctx.shadowColor = '#ff4444'; ctx.shadowBlur = 20;
        ctx.fillStyle = '#ff4444';
        ctx.font = 'bold 36px monospace';
        ctx.fillText('GAME OVER', w / 2, h * 0.2);
        ctx.shadowBlur = 0;

        // Stats
        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '13px monospace';
        ctx.fillText(`Wave Reached: ${this.waveManager.wave}`, w / 2, h * 0.3);
        ctx.fillText(`Level: ${this.player.level}`, w / 2, h * 0.34);
        ctx.fillText(`Score: ${this.score}`, w / 2, h * 0.38);

        // Death recap
        ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
        ctx.font = 'bold 14px monospace';
        ctx.fillText('— Run Stats —', w / 2, h * 0.45);

        const s = this.stats;
        ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
        ctx.font = '11px monospace';
        ctx.fillText(`Enemies Killed: ${s.enemiesKilled}`, w / 2, h * 0.50);
        ctx.fillText(`Bosses Defeated: ${s.bossesKilled}`, w / 2, h * 0.54);
        ctx.fillText(`Scrap Collected: ${s.scrapCollected}`, w / 2, h * 0.58);
        ctx.fillText(`Cores Earned: ${s.coresCollected}`, w / 2, h * 0.62);
        const seconds = Math.floor(s.timeSurvived);
        ctx.fillText(`Time: ${Math.floor(seconds / 60)}m ${seconds % 60}s`, w / 2, h * 0.66);

        // Upgrades summary
        const upgrades = [];
        if (this.player.attackSpeedBonus > 0) upgrades.push(`⚡x${this.player.attackSpeedBonus + 1}`);
        if (this.player.damageBonus > 0) upgrades.push(`💥+${this.player.damageBonus}`);
        if (this.player.hasPlasmaChain) upgrades.push(`⚡Chain Lv.${this.player.plasmaChainLevel}`);
        if (this.player.hasGravityWell) upgrades.push(`🌀Well Lv.${this.player.gravityWellLevel}`);
        if (this.player.hasSolarFlare) upgrades.push(`☀️Flare`);
        if (upgrades.length > 0) {
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '10px monospace';
            ctx.fillText('Upgrades: ' + upgrades.join(' | '), w / 2, h * 0.72);
        }

        // Core count
        ctx.fillStyle = CONFIG.COLORS.CORE;
        ctx.font = '11px monospace';
        ctx.fillText(`💎 ${this.meta.getBalance()} Cores total`, w / 2, h * 0.78);

        // Restart + Meta buttons
        if (this.deathTimer > 1.0) {
            const pulse = 0.5 + Math.sin(Date.now() * 0.004) * 0.5;
            ctx.globalAlpha = pulse;
            ctx.fillStyle = CONFIG.COLORS.TEXT_ACCENT;
            ctx.font = 'bold 18px monospace';
            ctx.fillText('TAP TO RETRY', w / 2, h * 0.86);

            ctx.globalAlpha = pulse * 0.7;
            ctx.fillStyle = CONFIG.COLORS.TEXT_DIM;
            ctx.font = '12px monospace';
            ctx.fillText('or tap Talent Tree button', w / 2, h * 0.91);
            ctx.globalAlpha = 1;
        }
    }
}
