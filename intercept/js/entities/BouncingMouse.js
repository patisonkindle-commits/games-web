// BouncingMouse.js — Auto-bouncing mouse (procedural, replaces mouseTexture)
import { CONFIG } from '../config.js';
import { Vector2 } from '../utils/Vector2.js';

export class BouncingMouse {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    this.speed = new Vector2(CONFIG.MOUSE_SPEED_DEFAULT, CONFIG.MOUSE_SPEED_DEFAULT);
    this.stopped = false;
    this.trail = [];
    this.wiggle = 0;
    this.spawnFlash = 1.0;
  }

  setPosition(x, y) {
    this.pos = new Vector2(x, y);
    this.stopped = false;
    this.trail = [];
    this.spawnFlash = 1.0;
  }

  getPredictedPosition(tc) {
    return this.pos.add(this.speed.multiply(tc));
  }

  update(dt, vpWidth, vpHeight) {
    if (this.stopped) return;

    this.wiggle += dt * 10;
    if (this.spawnFlash > 0) this.spawnFlash = Math.max(0, this.spawnFlash - dt * 3);

    // Bounce off walls (matching C# boundary checks)
    const halfW = CONFIG.MOUSE_SIZE / 2;
    const halfH = CONFIG.MOUSE_SIZE / 2;

    if (this.pos.x < halfW || this.pos.x + halfW > vpWidth) {
      this.speed.x *= -1;
    }
    if (this.pos.y < halfH || this.pos.y + halfH > vpHeight) {
      this.speed.y *= -1;
    }

    this.pos = this.pos.add(this.speed.multiply(dt));

    // Trail
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > CONFIG.TRAIL_MAX) this.trail.shift();
  }

  render(ctx) {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i / this.trail.length) * 0.15;
      const r = (i / this.trail.length) * 2.5;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = CONFIG.MOUSE_COLOR;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Spawn flash
    if (this.spawnFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.spawnFlash;
      ctx.fillStyle = '#fff';
      ctx.beginPath();
      ctx.arc(this.pos.x, this.pos.y, CONFIG.MOUSE_SIZE, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    const cx = this.pos.x;
    const cy = this.pos.y;
    const r = CONFIG.MOUSE_SIZE / 2;

    ctx.save();

    // Glow
    ctx.shadowColor = CONFIG.MOUSE_GLOW;
    ctx.shadowBlur = 10;

    // Body
    ctx.fillStyle = CONFIG.MOUSE_COLOR;
    ctx.beginPath();
    ctx.ellipse(cx, cy, r * 1.2, r, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tail
    const tw = Math.sin(this.wiggle) * 6;
    ctx.strokeStyle = CONFIG.MOUSE_COLOR;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(cx - r * 1.1, cy);
    ctx.quadraticCurveTo(cx - r * 1.8, tw, cx - r * 2.2, tw * 1.5);
    ctx.stroke();

    // Ears
    ctx.fillStyle = '#7ee8dd';
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy - r * 0.8, r * 0.35, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.arc(cx - r * 0.3, cy + r * 0.8, r * 0.35, 0, Math.PI * 2); ctx.fill();

    // Eye
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath(); ctx.arc(cx + r * 0.5, cy - r * 0.2, 2.5, 0, Math.PI * 2); ctx.fill();

    // Nose
    ctx.fillStyle = '#ffb4b4';
    ctx.beginPath(); ctx.arc(cx + r * 1.05, cy, 2, 0, Math.PI * 2); ctx.fill();

    ctx.restore();
  }
}
