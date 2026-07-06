// Arrow.js — The interceptor arrow (procedural, replaces arrowTexture)
import { CONFIG } from '../config.js';
import { Vector2 } from '../utils/Vector2.js';

export class Arrow {
  constructor(x, y) {
    this.pos = new Vector2(x, y);
    this.rotation = 0;       // degrees
    this.speed = CONFIG.ARROW_SPEED_DEFAULT;
    this.direction = new Vector2(1, 0);
    this.facingDirection = 0;
    this.trail = [];
    this.wobble = 0;
  }

  setPosition(x, y) {
    this.pos = new Vector2(x, y);
    this.trail = [];
  }

  // Rotate by delta degrees
  rotate(deltaDeg) {
    this.rotation = ((this.rotation + deltaDeg) % 360 + 360) % 360;
  }

  // Set speed with clamping
  setSpeed(s) {
    this.speed = Math.max(CONFIG.ARROW_SPEED_MIN, Math.min(CONFIG.ARROW_SPEED_MAX, s));
  }

  // Move forward along current rotation
  move(dt) {
    this.direction = Vector2.fromAngle(this.rotation, this.speed);
    this.pos = this.pos.add(this.direction.multiply(dt));

    // Trail
    this.trail.push({ x: this.pos.x, y: this.pos.y });
    if (this.trail.length > CONFIG.TRAIL_MAX) this.trail.shift();
  }

  // Rotate toward a target angle (smooth, deg/sec)
  rotateToward(targetDeg, dt) {
    // Normalize both to 0-360
    let a = ((this.rotation % 360) + 360) % 360;
    let b = ((targetDeg % 360) + 360) % 360;

    let diff = b - a;
    // Shortest path
    if (diff > 180) diff -= 360;
    if (diff < -180) diff += 360;

    const maxStep = CONFIG.ARROW_ROTATE_SPEED * dt;
    if (Math.abs(diff) <= maxStep) {
      this.rotation = b;
    } else {
      this.rotation += Math.sign(diff) * maxStep;
    }
    this.rotation = ((this.rotation % 360) + 360) % 360;
  }

  update(dt) {
    this.wobble += dt * 8;
  }

  render(ctx) {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const alpha = (i / this.trail.length) * 0.2;
      const r = (i / this.trail.length) * 3;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = CONFIG.ARROW_COLOR;
      ctx.beginPath();
      ctx.arc(this.trail[i].x, this.trail[i].y, r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    ctx.save();
    ctx.translate(this.pos.x, this.pos.y);
    ctx.rotate(this.rotation * Math.PI / 180);

    const L = CONFIG.ARROW_LENGTH;
    const W = CONFIG.ARROW_WIDTH;

    // Glow
    ctx.shadowColor = CONFIG.ARROW_GLOW;
    ctx.shadowBlur = 14 + Math.sin(this.wobble) * 4;

    // Arrow body (pointing right by default, +90 in draw matches C#)
    ctx.fillStyle = CONFIG.ARROW_COLOR;
    ctx.beginPath();
    ctx.moveTo(L / 2, 0);           // tip
    ctx.lineTo(-L / 2, -W / 2);     // top-left
    ctx.lineTo(-L / 3, 0);          // notch
    ctx.lineTo(-L / 2, W / 2);      // bottom-left
    ctx.closePath();
    ctx.fill();

    // Outline
    ctx.strokeStyle = '#fff';
    ctx.lineWidth = 1;
    ctx.globalAlpha = 0.4;
    ctx.stroke();

    ctx.shadowBlur = 0;
    ctx.restore();
  }

  isOutOfBounds() {
    return (
      this.pos.x < 0 || this.pos.x > CONFIG.CANVAS_WIDTH ||
      this.pos.y < 0 || this.pos.y > CONFIG.CANVAS_HEIGHT
    );
  }
}
