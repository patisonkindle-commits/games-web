// Boid.js — The flocking agent
import { CONFIG } from '../config.js';

export class Boid {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    // Random starting velocity
    const angle = Math.random() * Math.PI * 2;
    const speed = CONFIG.BOID_SPEED * (0.6 + Math.random() * 0.4);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.size = CONFIG.BOID_SIZE;
    this.maxSpeed = CONFIG.BOID_SPEED;
    this.maxForce = CONFIG.BOID_FORCE;
  }

  get speed() {
    return Math.sqrt(this.vx * this.vx + this.vy * this.vy);
  }

  // —— Simple helpers ——
  distTo(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Apply a steering force with magnitude limiting */
  applyForce(fx, fy, dt) {
    // Clamp force magnitude
    const fMag = Math.sqrt(fx * fx + fy * fy);
    if (fMag > this.maxForce) {
      fx = (fx / fMag) * this.maxForce;
      fy = (fy / fMag) * this.maxForce;
    }
    this.vx += fx * dt;
    this.vy += fy * dt;
    // Clamp speed
    const s = this.speed;
    if (s > this.maxSpeed) {
      this.vx = (this.vx / s) * this.maxSpeed;
      this.vy = (this.vy / s) * this.maxSpeed;
    }
    if (s < 0.1) {
      // Dead stop — give a tiny nudge
      this.vx += (Math.random() - 0.5) * 10;
      this.vy += (Math.random() - 0.5) * 10;
    }
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    // Wrap around edges
    if (this.x < -20) this.x = CONFIG.CANVAS_WIDTH + 20;
    if (this.x > CONFIG.CANVAS_WIDTH + 20) this.x = -20;
    if (this.y < -20) this.y = CONFIG.CANVAS_HEIGHT + 20;
    if (this.y > CONFIG.CANVAS_HEIGHT + 20) this.y = -20;
  }

  render(ctx, trail) {
    const s = this.size / 2;
    const angle = Math.atan2(this.vy, this.vx);

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.rotate(angle);

    // Body — stylized triangle
    ctx.shadowColor = CONFIG.BOID_COLOR;
    ctx.shadowBlur = 6;

    // Glow fill
    ctx.fillStyle = CONFIG.BOID_COLOR;
    ctx.beginPath();
    ctx.moveTo(s * 1.5, 0);
    ctx.lineTo(-s * 0.8, -s * 0.7);
    ctx.lineTo(-s * 0.5, 0);
    ctx.lineTo(-s * 0.8, s * 0.7);
    ctx.closePath();
    ctx.fill();

    ctx.shadowBlur = 0;

    // Inner accent
    ctx.fillStyle = CONFIG.BOID_ACCENT;
    ctx.beginPath();
    ctx.moveTo(s * 0.9, 0);
    ctx.lineTo(-s * 0.3, -s * 0.35);
    ctx.lineTo(-s * 0.15, 0);
    ctx.lineTo(-s * 0.3, s * 0.35);
    ctx.closePath();
    ctx.fill();

    // Eye (small bright dot at front)
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(s * 0.6, 0, 1.5, 0, Math.PI * 2);
    ctx.fill();

    ctx.restore();
  }
}
