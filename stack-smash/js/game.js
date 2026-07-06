import { CONFIG } from './config.js';

export class Game {
    constructor(canvas) {
        this.canvas = canvas;
        this.ctx = canvas.getContext('2d');
        this.resize();
        this.reset();
        this.state = 'menu'; // menu, playing, gameover
        this.score = 0;
        this.highScore = localStorage.getItem('skyStackerHighScore') || 0;
        this.cameraY = 0;
        this.targetCameraY = 0;
        this.particles = [];
        this.fallingPieces = [];
        this.perfectCount = 0;
        
        // Background clouds
        this.clouds = [];
        for (let i = 0; i < 10; i++) {
            this.clouds.push({
                x: Math.random() * this.canvas.width,
                y: Math.random() * this.canvas.height,
                speed: Math.random() * 0.5 + 0.1,
                size: Math.random() * 30 + 20,
                opacity: Math.random() * 0.3 + 0.1
            });
        }
    }

    resize() {
        this.canvas.width = this.canvas.clientWidth;
        this.canvas.height = this.canvas.clientHeight;
        this.scale = this.canvas.width / 400;
    }

    reset() {
        this.stack = [];
        this.currentBlock = null;
        this.score = 0;
        this.perfectCount = 0;
        this.cameraY = 0;
        this.targetCameraY = 0;
        this.particles = [];
        this.fallingPieces = [];
        this.state = 'playing';
        this.initStack();
        this.spawnBlock();
    }

    initStack() {
        const base = {
            x: this.canvas.width / 2 - (CONFIG.START_WIDTH * this.scale) / 2,
            y: this.canvas.height - CONFIG.HEIGHT * this.scale - 50,
            width: CONFIG.START_WIDTH * this.scale,
            height: CONFIG.HEIGHT * this.scale,
            color: CONFIG.COLORS[0],
            perfect: false
        };
        this.stack.push(base);
        this.lastBlock = base;
    }

    spawnBlock() {
        const dir = this.stack.length % 2 === 0 ? 1 : -1;
        this.currentBlock = {
            x: dir === 1 ? -this.lastBlock.width : this.canvas.width,
            y: this.lastBlock.y - CONFIG.HEIGHT * this.scale,
            width: this.lastBlock.width,
            height: CONFIG.HEIGHT * this.scale,
            speed: (CONFIG.SPEED + (this.score * 0.05)) * this.scale,
            color: CONFIG.COLORS[this.stack.length % CONFIG.COLORS.length]
        };
        this.moveDir = dir;
    }

    update() {
        if (this.state !== 'playing') return;

        // Move block
        this.currentBlock.x += this.currentBlock.speed * this.moveDir;
        if (this.currentBlock.x + this.currentBlock.width > this.canvas.width + 50) this.moveDir = -1;
        else if (this.currentBlock.x < -50) this.moveDir = 1;

        // Smooth Camera
        this.cameraY += (this.targetCameraY - this.cameraY) * 0.1;

        // Update Particles
        this.particles.forEach((p, i) => {
            p.x += p.vx;
            p.y += p.vy;
            p.life -= 0.02;
            if (p.life <= 0) this.particles.splice(i, 1);
        });

        // Update Falling Pieces
        this.fallingPieces.forEach((p, i) => {
            p.y += p.vy;
            p.vy += 0.5; // gravity
            p.rotation += p.rotSpeed;
            p.life -= 0.01;
            if (p.life <= 0) this.fallingPieces.splice(i, 1);
        });

        // Update Clouds
        this.clouds.forEach(c => {
            c.y += c.speed;
            if (c.y > this.canvas.height) {
                c.y = -c.size;
                c.x = Math.random() * this.canvas.width;
            }
        });
    }

    land() {
        const curr = this.currentBlock;
        const prev = this.lastBlock;

        const overlap = Math.min(curr.x + curr.width, prev.x + prev.width) - Math.max(curr.x, prev.x);

        if (overlap <= 0) {
            this.gameOver();
            return;
        }

        let isPerfect = Math.abs(curr.x - prev.x) < CONFIG.PERFECT_TOLERANCE * this.scale;
        let width = isPerfect ? prev.width : overlap;
        let x = isPerfect ? prev.x : Math.max(curr.x, prev.x);

        if (!isPerfect && width < prev.width * 0.85) {
            // Cut off piece
            const cutWidth = prev.width - overlap;
            const cutX = curr.x < prev.x ? curr.x + overlap : prev.x;
            this.spawnFallingPiece(cutX, curr.y, cutWidth, curr.height, curr.color);
        }

        const placed = {
            x: x,
            y: curr.y,
            width: width,
            height: curr.height,
            color: curr.color,
            perfect: isPerfect
        };

        if (isPerfect) {
            this.perfectCount++;
            if (this.perfectCount > 1) this.spawnParticles(placed, true);
            this.currentBlock.speed = Math.min(CONFIG.MAX_SPEED * this.scale, this.currentBlock.speed + 1.5 * this.scale);
        } else {
            this.perfectCount = 0;
        }

        this.stack.push(placed);
        this.lastBlock = placed;
        this.score++;
        this.targetCameraY += CONFIG.HEIGHT * this.scale;
        
        this.spawnBlock();
    }

    spawnParticles(block, isMega) {
        const count = isMega ? CONFIG.PARTICLES_COUNT * 2 : CONFIG.PARTICLES_COUNT;
        for (let i = 0; i < count; i++) {
            this.particles.push({
                x: block.x + block.width / 2,
                y: block.y,
                vx: (Math.random() - 0.5) * 10 * this.scale,
                vy: (Math.random() - 1) * 10 * this.scale,
                size: Math.random() * 5 * this.scale,
                color: block.color,
                life: 1
            });
        }
    }

    spawnFallingPiece(x, y, w, h, color) {
        this.fallingPieces.push({
            x: x,
            y: y,
            width: w,
            height: h,
            color: color,
            vy: 0,
            rotation: 0,
            rotSpeed: (Math.random() - 0.5) * 0.2,
            life: 1
        });
    }

    gameOver() {
        this.state = 'gameover';
        if (this.score > this.highScore) {
            this.highScore = this.score;
            localStorage.setItem('skyStackerHighScore', this.highScore);
        }
        document.getElementById('final-score').innerText = this.score;
        document.getElementById('gameover-screen').style.display = 'block';
    }

    render() {
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        
        // Sky Gradient
        const grad = this.ctx.createLinearGradient(0, 0, 0, this.canvas.height);
        grad.addColorStop(0, '#1a2a6c');
        grad.addColorStop(0.5, '#b21f1f');
        grad.addColorStop(1, '#fdbb2d');
        this.ctx.fillStyle = grad;
        this.ctx.fillRect(0, 0, this.canvas.width, this.canvas.height);

        // Clouds
        this.clouds.forEach(c => {
            this.ctx.fillStyle = `rgba(255, 255, 255, ${c.opacity})`;
            this.ctx.beginPath();
            this.ctx.arc(c.x, c.y, c.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.save();
        // Move everything down for camera
        this.ctx.translate(0, this.cameraY);

        // Stack
        this.stack.forEach(b => {
            this.drawBlock(b);
        });

        // Falling Pieces
        this.fallingPieces.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.save();
            this.ctx.translate(p.x + p.width / 2, p.y + p.height / 2);
            this.ctx.rotate(p.rotation);
            this.ctx.fillStyle = p.color;
            this.ctx.fillRect(-p.width / 2, -p.height / 2, p.width, p.height);
            this.ctx.restore();
            this.ctx.globalAlpha = 1;
        });

        // Current
        if (this.currentBlock) {
            this.drawBlock(this.currentBlock);
        }

        // Particles
        this.particles.forEach(p => {
            this.ctx.globalAlpha = p.life;
            this.ctx.fillStyle = p.color;
            this.ctx.beginPath();
            this.ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
            this.ctx.fill();
        });

        this.ctx.restore();
        
        this.ctx.globalAlpha = 1;
        
        // UI
        document.getElementById('score-display').innerText = this.score;
        if (this.perfectCount > 1) {
            document.getElementById('score-display').innerText += `\nPERFECT x${this.perfectCount}`;
        }
    }

    drawBlock(b) {
        // 3D Block Effect
        this.ctx.fillStyle = b.color;
        this.ctx.shadowColor = 'rgba(0,0,0,0.4)';
        this.ctx.shadowBlur = 15 * this.scale;
        this.ctx.shadowOffsetY = 10 * this.scale;
        this.ctx.fillRect(b.x, b.y, b.width, b.height);

        // Top highlight
        this.ctx.fillStyle = 'rgba(255,255,255,0.2)';
        this.ctx.fillRect(b.x, b.y, b.width, b.height / 4);
        
        this.ctx.shadowBlur = 0;
        this.ctx.shadowOffsetY = 0;
    }
}
