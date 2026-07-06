// Mouse.js — The evader entity (replaces MonoGame mouse texture)
import { CONFIG } from '../config.js';

export class Mouse {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.size = CONFIG.MOUSE_SIZE;
    this.speed = CONFIG.MOUSE_SPEED;
    this.angle = Math.PI; // face left by default
    this.trail = [];
    this.wiggle = 0;
  }

  setPosition(x, y) {
    this.x = x;
    this.y = y;
    this.trail = [];
  }

  // Direct step-by-step evade (matching original C# basicEvading logic)
  evadeStep(threatX, threatY) {
    if (this.x > threatX) this.x += 1;
    else if (this.x < threatX) this.x -= 1;
    if (this.y > threatY) this.y += 1;
    else if (this.y < threatY) this.y -= 1;

    const dx = this.x - threatX;
    const dy = this.y - threatY;
    this.angle = Math.atan2(dy, dx);

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > CONFIG.TRAIL_MAX_LENGTH) {
      this.trail.shift();
    }
  }

  // Smooth evade with delta time
  evadeSmooth(threatX, threatY, dt) {
    const dx = this.x - threatX;
    const dy = this.y - threatY;
    const dist = Math.sqrt(dx * dx + dy * dy);
    if (dist > 1) {
      this.angle = Math.atan2(dy, dx);
      const move = this.speed * dt;
      const step = Math.min(move, dist);
      this.x += (dx / dist) * step;
      this.y += (dy / dist) * step;
    }

    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > CONFIG.TRAIL_MAX_LENGTH) {
      this.trail.shift();
    }
  }

  update(dt) {
    this.wiggle += dt * 10;
  }

  render(ctx) {
    // Draw trail
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i / this.trail.length) * 0.2;
      const size = (i / this.trail.length) * this.size * 0.25;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#4ecdc4';
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, size, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(this.angle);

    const s = this.size / 2;

    // Body (oval)
    ctx.fillStyle = '#4ecdc4';
    ctx.shadowColor = '#4ecdc4';
    ctx.shadowBlur = 8;
    ctx.beginPath();
    ctx.ellipse(0, 0, s * 1.2, s, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Tail
    const tailWiggle = Math.sin(this.wiggle) * 5;
    ctx.strokeStyle = '#4ecdc4';
    ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-s * 1.1, 0);
    ctx.quadraticCurveTo(-s * 1.8, tailWiggle, -s * 2.2, tailWiggle * 1.5);
    ctx.stroke();

    // Ears (small circles)
    ctx.fillStyle = '#7ee8dd';
    ctx.beginPath();
    ctx.arc(-s * 0.3, -s * 0.8, s * 0.3, 0, Math.PI * 2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(-s * 0.3, s * 0.8, s * 0.3, 0, Math.PI * 2);
    ctx.fill();

    // Eye
    ctx.fillStyle = '#1a1a2e';
    ctx.beginPath();
    ctx.arc(s * 0.5, -s * 0.2, 2, 0, Math.PI * 2);
    ctx.fill();

    // Nose
    ctx.fillStyle = '#ffb4b4';
    ctx.beginPath();
    ctx.arc(s * 1.1, 0, 2, 0, Math.PI * 2);
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
