// Obstacle.js — Circular obstacles for boids to avoid
import { CONFIG } from '../config.js';

export class Obstacle {
  constructor(x, y) {
    this.x = x;
    this.y = y;
    this.radius = CONFIG.OBSTACLE_RADIUS;
    this.avoidRadius = CONFIG.OBSTACLE_AVOID_RADIUS;
  }

  /** Check if point is inside the solid obstacle */
  contains(px, py) {
    const dx = px - this.x;
    const dy = py - this.y;
    return Math.sqrt(dx * dx + dy * dy) < this.radius;
  }

  render(ctx) {
    ctx.save();

    // Outer glow ring (avoidance radius)
    const grad = ctx.createRadialGradient(
      this.x, this.y, this.radius,
      this.x, this.y, this.avoidRadius
    );
    grad.addColorStop(0, 'rgba(255,107,107,0.06)');
    grad.addColorStop(0.5, 'rgba(255,107,107,0.02)');
    grad.addColorStop(1, 'rgba(255,107,107,0)');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.avoidRadius, 0, Math.PI * 2);
    ctx.fill();

    // Avoid radius ring (very subtle)
    ctx.strokeStyle = 'rgba(255,107,107,0.08)';
    ctx.lineWidth = 1;
    ctx.setLineDash([3, 6]);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.avoidRadius, 0, Math.PI * 2);
    ctx.stroke();
    ctx.setLineDash([]);

    // Solid obstacle body
    ctx.shadowColor = CONFIG.OBSTACLE_COLOR;
    ctx.shadowBlur = 12;

    const grad2 = ctx.createRadialGradient(
      this.x - 4, this.y - 4, 2,
      this.x, this.y, this.radius
    );
    grad2.addColorStop(0, '#ff8a8a');
    grad2.addColorStop(0.7, CONFIG.OBSTACLE_COLOR);
    grad2.addColorStop(1, '#cc4444');

    ctx.fillStyle = grad2;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.radius, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Inner highlight
    ctx.fillStyle = CONFIG.OBSTACLE_INNER;
    ctx.beginPath();
    ctx.arc(this.x - 5, this.y - 5, this.radius * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Small cross/X icon in center
    ctx.strokeStyle = 'rgba(255,255,255,0.2)';
    ctx.lineWidth = 2;
    const c = this.radius * 0.3;
    ctx.beginPath();
    ctx.moveTo(this.x - c, this.y - c);
    ctx.lineTo(this.x + c, this.y + c);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(this.x + c, this.y - c);
    ctx.lineTo(this.x - c, this.y + c);
    ctx.stroke();

    ctx.restore();
  }
}
