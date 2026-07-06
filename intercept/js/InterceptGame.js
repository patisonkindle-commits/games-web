// InterceptGame.js — Line-of-Sight Intercept game
// Ports Continuous_Line_of_sight_intercepting_5 / Game1.cs to HTML5 Canvas
import { CONFIG } from './config.js';
import { Input } from './systems/Input.js';
import { Vector2 } from './utils/Vector2.js';
import { Arrow } from './entities/Arrow.js';
import { BouncingMouse } from './entities/BouncingMouse.js';

export class InterceptGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    this.input = new Input(canvas);
    this.arrow = null;
    this.mouse = null;
    this.running = true;
    this.lastTime = 0;
    this.message = '';
    this.messageTimer = 0;
    this.escapeCooldown = 0;
    this.catchCount = 0;
    this.interceptMode = 'intercept'; // 'intercept' or 'chase'

    // Visual extras
    this.stars = [];
    for (let i = 0; i < 80; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        r: 0.5 + Math.random() * 1.5,
        twinkle: Math.random() * Math.PI * 2,
      });
    }

    // Prediction dot
    this.predictedPos = null;

    this.resetPositions();
  }

  resetPositions() {
    this.arrow = new Arrow(
      Math.random() * CONFIG.CANVAS_WIDTH,
      Math.random() * CONFIG.CANVAS_HEIGHT
    );
    this.mouse = new BouncingMouse(
      CONFIG.CANVAS_WIDTH / 2,
      CONFIG.CANVAS_HEIGHT / 2
    );
    this.mouse.stopped = false;
    this.catchCount = 0;
  }

  start() {
    this.lastTime = performance.now();
    this.loop(this.lastTime);
  }

  loop(now) {
    const rawDt = (now - this.lastTime) / 1000;
    const dt = Math.min(rawDt, 0.05);
    this.lastTime = now;
    this.update(dt);
    this.render();
    if (this.running) requestAnimationFrame((t) => this.loop(t));
  }

  // ═══════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════
  update(dt) {
    this.escapeCooldown = Math.max(0, this.escapeCooldown - dt);

    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }

    // Stars
    for (const s of this.stars) s.twinkle += dt * 1.5;

    // ── Input ──
    // D1 → respawn mouse (edge-triggered, matching C# old_ks)
    if (this.input.wasPressed('Digit1')) {
      this.mouse.setPosition(
        Math.random() * CONFIG.CANVAS_WIDTH,
        Math.random() * CONFIG.CANVAS_HEIGHT
      );
      this.mouse.stopped = false;
    }

    // Arrow rotation: Left/Right keys
    if (this.input.isKeyDown('ArrowLeft')) {
      this.arrow.rotate(-CONFIG.ARROW_ROTATE_SPEED * dt);
    }
    if (this.input.isKeyDown('ArrowRight')) {
      this.arrow.rotate(CONFIG.ARROW_ROTATE_SPEED * dt);
    }

    // Arrow speed: Up/Down keys (edge-triggered like C#)
    if (this.input.wasPressed('ArrowUp')) {
      this.arrow.setSpeed(this.arrow.speed + 30);
    }
    if (this.input.wasPressed('ArrowDown')) {
      this.arrow.setSpeed(this.arrow.speed - 30);
    }

    // ESC → back
    if (this.input.isKeyDown('Escape') && this.escapeCooldown <= 0) {
      this.escapeCooldown = 0.5;
      // Signal to parent (set running false, caller handles navigation)
      this.running = false;
      window.history.back();
      return;
    }

    // Tab/M → toggle intercept/chase mode
    if (this.input.wasPressed('Tab') || this.input.wasPressed('KeyM')) {
      this.interceptMode = this.interceptMode === 'intercept' ? 'chase' : 'intercept';
      this.showMessage(
        this.interceptMode === 'intercept' ? 'INTERCEPT MODE' : 'CHASE MODE',
        2
      );
    }

    // ── Mouse update ──
    this.mouse.update(dt, CONFIG.CANVAS_WIDTH, CONFIG.CANVAS_HEIGHT);

    // ── AI ──
    if (this.interceptMode === 'intercept') {
      this.doLineOfSightIntercept(dt);
    } else {
      this.doLineOfSightChase(dt);
    }

    this.arrow.update(dt);

    // Bounds check
    if (this.arrow.isOutOfBounds()) {
      this.arrow.setPosition(
        Math.random() * CONFIG.CANVAS_WIDTH,
        Math.random() * CONFIG.CANVAS_HEIGHT
      );
    }
    if (this.mouse.pos.x < 0 || this.mouse.pos.x > CONFIG.CANVAS_WIDTH ||
        this.mouse.pos.y < 0 || this.mouse.pos.y > CONFIG.CANVAS_HEIGHT) {
      this.mouse.setPosition(
        Math.random() * CONFIG.CANVAS_WIDTH,
        Math.random() * CONFIG.CANVAS_HEIGHT
      );
    }

    // ── Catch detection ──
    const dist = this.arrow.pos.distanceTo(this.mouse.pos);
    if (dist < CONFIG.CATCH_DIST) {
      this.catchCount++;
      this.mouse.stopped = true;
      this.showMessage(`INTERCEPTED! x${this.catchCount}`, 1.5);
      // Respawn after short delay
      setTimeout(() => {
        this.mouse.setPosition(
          Math.random() * CONFIG.CANVAS_WIDTH,
          Math.random() * CONFIG.CANVAS_HEIGHT
        );
        this.mouse.stopped = false;
      }, 800);
    }

    this.input.postFrame();
  }

  // ── DoLineOfSightChase (ports C#) ──
  doLineOfSightChase(dt) {
    const distance = this.mouse.pos.subtract(this.arrow.pos);
    let facing = Math.atan2(distance.y, distance.x) * 180 / Math.PI;
    this.arrow.facingDirection = facing;

    this.arrow.rotateToward(facing, dt);
    this.arrow.move(dt);
  }

  // ── DoLineOfSightIntercept (ports C#) ──
  doLineOfSightIntercept(dt) {
    // Vr = mouseSpeed - arrowVelocity
    const arrowVel = Vector2.fromAngle(this.arrow.rotation, this.arrow.speed);
    const Vr = this.mouse.speed.subtract(arrowVel);

    // Sr = mousePosition - arrowPosition
    const Sr = this.mouse.pos.subtract(this.arrow.pos);

    // tc = |Sr| / |Vr|  (time-to-intercept)
    const SrMag = Sr.magnitude();
    const VrMag = Vr.magnitude();

    if (VrMag < 0.01) {
      // Fallback to simple chase if relative velocity is near zero
      this.doLineOfSightChase(dt);
      return;
    }

    const tc = SrMag / VrMag;

    // St = mousePosition + mouseSpeed * tc  (predicted intercept point)
    const St = this.mouse.pos.add(this.mouse.speed.multiply(tc));
    this.predictedPos = St;

    // Direction from arrow to predicted point
    const distance = St.subtract(this.arrow.pos);
    let facing = Math.atan2(distance.y, distance.x) * 180 / Math.PI;
    this.arrow.facingDirection = facing;

    this.arrow.rotateToward(facing, dt);

    // Move arrow
    if (distance.magnitude() > 1.0) {
      this.arrow.move(dt);
    } else {
      this.mouse.stopped = true;
    }
  }

  showMessage(text, duration) {
    this.message = text;
    this.messageTimer = duration;
  }

  // ═══════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════
  render() {
    const ctx = this.ctx;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const s of this.stars) {
      const alpha = 0.3 + Math.sin(s.twinkle) * 0.25;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.arc(s.x, s.y, s.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Grid (faint)
    ctx.strokeStyle = CONFIG.GRID_COLOR;
    ctx.lineWidth = 1;
    for (let x = 0; x < w; x += 64) {
      ctx.beginPath(); ctx.moveTo(x, 0); ctx.lineTo(x, h); ctx.stroke();
    }
    for (let y = 0; y < h; y += 64) {
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(w, y); ctx.stroke();
    }

    // Predicted intercept point
    if (this.predictedPos && this.interceptMode === 'intercept') {
      ctx.save();
      ctx.globalAlpha = 0.6 + Math.sin(Date.now() / 200) * 0.3;
      ctx.strokeStyle = CONFIG.PREDICT_COLOR;
      ctx.lineWidth = 2;
      ctx.setLineDash([4, 4]);
      // Circle at predicted position
      ctx.beginPath();
      ctx.arc(this.predictedPos.x, this.predictedPos.y, 12, 0, Math.PI * 2);
      ctx.stroke();
      // Crosshair
      ctx.beginPath();
      ctx.moveTo(this.predictedPos.x - 18, this.predictedPos.y);
      ctx.lineTo(this.predictedPos.x + 18, this.predictedPos.y);
      ctx.moveTo(this.predictedPos.x, this.predictedPos.y - 18);
      ctx.lineTo(this.predictedPos.x, this.predictedPos.y + 18);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();

      // Line from arrow to predicted point
      ctx.save();
      ctx.setLineDash([3, 6]);
      ctx.strokeStyle = 'rgba(255,107,129,0.25)';
      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(this.arrow.pos.x, this.arrow.pos.y);
      ctx.lineTo(this.predictedPos.x, this.predictedPos.y);
      ctx.stroke();
      ctx.setLineDash([]);
      ctx.restore();
    }

    // Line from arrow to mouse
    ctx.save();
    const dist = this.arrow.pos.distanceTo(this.mouse.pos);
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = dist < 60 ? 'rgba(233,69,96,0.5)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = dist < 60 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(this.arrow.pos.x, this.arrow.pos.y);
    ctx.lineTo(this.mouse.pos.x, this.mouse.pos.y);
    ctx.stroke();
    ctx.restore();

    // Distance label
    ctx.save();
    ctx.font = CONFIG.FONT_SMALL;
    ctx.fillStyle = dist < 60 ? 'rgba(233,69,96,0.8)' : 'rgba(255,255,255,0.35)';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.round(dist)}px`,
      (this.arrow.pos.x + this.mouse.pos.x) / 2,
      (this.arrow.pos.y + this.mouse.pos.y) / 2 - 12
    );
    ctx.restore();

    // Entities
    this.mouse.render(ctx);
    this.arrow.render(ctx);

    // ── HUD ──
    ctx.fillStyle = CONFIG.HUD_BG;
    ctx.fillRect(0, 0, w, 56);

    ctx.font = CONFIG.FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.TEXT_COLOR;
    const modeLabel = this.interceptMode === 'intercept' ? 'INTERCEPT' : 'CHASE';
    ctx.fillText(
      `Mode: ${modeLabel}  |  Arrow rot: ${this.arrow.rotation.toFixed(1)}°  |  facing: ${this.arrow.facingDirection.toFixed(1)}°  |  speed: ${this.arrow.speed.toFixed(0)}`,
      12, 18
    );
    ctx.fillText(
      `Arrow: (${this.arrow.pos.x.toFixed(0)},${this.arrow.pos.y.toFixed(0)})  |  Mouse: (${this.mouse.pos.x.toFixed(0)},${this.mouse.pos.y.toFixed(0)})  |  Caught: ${this.catchCount}`,
      12, 40
    );

    ctx.textAlign = 'right';
    ctx.fillStyle = '#555';
    ctx.fillText('1:Respawn | M:Toggle | ←→:Rotate | ↑↓:Speed | ESC:Back', w - 12, 18);

    // ── Message ──
    if (this.message && this.messageTimer > 0) {
      ctx.save();
      ctx.font = CONFIG.FONT_LARGE;
      ctx.fillStyle = '#ffd93d';
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 4;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(this.message, w / 2, h / 2);
      ctx.fillText(this.message, w / 2, h / 2);
      ctx.restore();
    }

    ctx.textBaseline = 'alphabetic';
  }
}
