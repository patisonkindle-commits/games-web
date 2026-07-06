// Cat.js — The chaser entity (replaces MonoGame cat texture)
import { CONFIG } from '../config.js';

export class Cat {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.CAT_SIZE;
    this.speed = CONFIG.CAT_SPEED;
    this.angle = 0;
    this.trail = [];
    this.eyeBlink = 0;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.trail = [];
  }

  // Direct step-by-step chase (matching original C# basicChasing logic)
  chaseStep(targetX, targetY) {
    if (this.x > targetX) this.x -= 1;
    else if (this.x < targetX) this.x += 1;
    if (this.y > targetY) this.y -= 1;
    else if (this.y < targetY) this.y += 1;

    // Track angle for drawing
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    this.angle = Math.atan2(dy, dx);

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > CONFIG.TRAIL_MAX_LENGTH) {
      this.trail.shift();
    }
  }

  // Smooth chase with delta time
  chaseSmooth(targetX, targetY, dt) {
    const dx = targetX - this.x;
    const dy = targetY - this.y;
    if (dx !== 0 || dy !== 0) {
      this.angle = Math.atan2(dy, dx);
    }
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      const move = this.speed * dt;
      const step = Math.min(move, dist);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    // Trail
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > CONFIG.TRAIL_MAX_LENGTH) {
      this.trail.shift();
    }
  }

  update(dt) {
    this.eyeBlink += dt;
    if (this.eyeBlink > 3) this.eyeBlink = 0;
  }

  render(ctx) {
    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i / this.trail.length) * 0.3;
      const size = (i / this.trail.length) * this.size * 0.3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = CONFIG.CAT_COLOR;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    // Body (circle)
    const s = this.size / 2;
    ctx.fillStyle = CONFIG.CAT_COLOR;
    ctx.shadowColor = CONFIG.CAT_COLOR;
    ctx.shadowBlur = 10;
    ctx.beginPath();
    ctx.arc(0, 0, s, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ears (triangles)
    ctx.fillStyle = '#ff6b81';
    // Left ear
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, -s * 0.8);
    ctx.lineTo(-s * 0.2, -s * 1.4);
    ctx.lineTo(s * 0.1, -s * 0.7);
    ctx.closePath();
    ctx.fill();
    // Right ear
    ctx.beginPath();
    ctx.moveTo(-s * 0.6, s * 0.8);
    ctx.lineTo(-s * 0.2, s * 1.4);
    ctx.lineTo(s * 0.1, s * 0.7);
    ctx.closePath();
    ctx.fill();

    // Eyes
    const blinkH = (this.eyeBlink < 0.15) ? 0.5 : 3;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.ellipse(s * 0.3, -s * 0.3, 4, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.ellipse(s * 0.3, s * 0.3, 4, blinkH, 0, 0, Math.PI * 2);
    ctx.fill();

    // Pupils
    if (blinkH > 1) {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath();
      ctx.arc(s * 0.4, -s * 0.3, 2, 0, Math.PI * 2);
      ctx.fill();
      ctx.beginPath();
      ctx.arc(s * 0.4, s * 0.3, 2, 0, Math.PI * 2);
      ctx.fill();
    }

    // Nose
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.moveTo(s * 0.7, 0);
    ctx.lineTo(s * 0.5, -3);
    ctx.lineTo(s * 0.5, 3);
    ctx.closePath();
    ctx.fill();

    ctx.restore();
  }

  isOutOfBounds() {
    return (
      this.x < 0 || this.x > CONFIG.CANVAS_WIDTH ||
      this.y < 0 || this.y > CONFIG.CANVAS_HEIGHT
    );
  }
}
