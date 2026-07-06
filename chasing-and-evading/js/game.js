// game.js — Main game class (ports MonoGame Game1 logic to HTML5 Canvas)
// States: 'menu' → playing | Modes: CHASE, EVADE, PLAYER
import { CONFIG } from './config.js';
import { Input } from './systems/Input.js';
import { ParticleSystem } from './systems/Particles.js';
import { Cat } from './entities/Cat.js';
import { Mouse } from './entities/Mouse.js';

// ─── Menu item definitions ───
const MENU_ITEMS = [
  {
    id: 'chase',
    label: 'CHASE MODE',
    mode: CONFIG.CHASE_MODE,
    icon: '🐱',
    desc: 'Cat AI chases the mouse.\nCat only moves when you are in Line of Sight.\nPress 1 to respawn mouse.',
    color: '#e94560',
  },
  {
    id: 'evade',
    label: 'EVADE MODE',
    mode: CONFIG.EVADE_MODE,
    icon: '🐭',
    desc: 'Mouse AI evades the cat.\nWatch the mouse run away automatically.\nPress 1 to respawn cat.',
    color: '#4ecdc4',
  },
  {
    id: 'player',
    label: 'PLAYER MODE',
    mode: CONFIG.PLAYER_MODE,
    icon: '🎮',
    desc: 'You control the mouse with WASD.\nCat chases only within Line of Sight.\nSurvive as long as you can!',
    color: '#ffd93d',
  },
];

export class Game {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    this.input = new Input(canvas);
    this.particles = new ParticleSystem();

    // State machine: 'menu' or 'playing'
    this.state = 'menu';
    this.mode = CONFIG.CHASE_MODE;

    this.cat = null;
    this.mouse = null;
    this.running = true;
    this.lastTime = 0;
    this.catchCount = 0;
    this.escapeCooldown = 0;

    // Menu animation
    this.menuTime = 0;
    this.menuHoverIndex = -1;
    this.menuSelectedIndex = -1;

    // Playing state
    this.message = '';
    this.messageTimer = 0;
    this.catchDist = CONFIG.CAT_SIZE / 2 + CONFIG.MOUSE_SIZE / 2;
    this.catchAnimation = 0;
    this.losPulse = 0;

    // Shared stars (drawn in both menu and game)
    this.stars = [];
    for (let i = 0; i < 120; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        r: 0.5 + Math.random() * 2,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.7,
      });
    }
  }

  // ─── Position helpers ───
  resetPositions() {
    this.cat = new Cat(
      Math.random() * CONFIG.CANVAS_WIDTH,
      Math.random() * CONFIG.CANVAS_HEIGHT
    );
    this.mouse = new Mouse(
      Math.random() * CONFIG.CANVAS_WIDTH,
      Math.random() * CONFIG.CANVAS_HEIGHT
    );
    this.catchCount = 0;
    this.catchAnimation = 0;
  }

  // ─── Start game loop ───
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

    if (this.running) {
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  // ═══════════════════════════════════════
  //  UPDATE
  // ═══════════════════════════════════════
  update(dt) {
    // Stars always twinkle
    for (const star of this.stars) {
      star.twinkle += dt * star.speed;
    }

    if (this.state === 'menu') {
      this.updateMenu(dt);
    } else {
      this.updatePlaying(dt);
    }

    this.input.postFrame();
  }

  // ─── Menu update ───
  updateMenu(dt) {
    this.menuTime += dt;

    const mouse = this.input.getMousePosition();

    // Hit-test menu cards
    this.menuHoverIndex = -1;
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      const card = this._cardRect(i);
      if (
        mouse.x >= card.x && mouse.x <= card.x + card.w &&
        mouse.y >= card.y && mouse.y <= card.y + card.h
      ) {
        this.menuHoverIndex = i;
        break;
      }
    }

    // Mouse click on card
    if (this.input.wasMouseClicked() && this.menuHoverIndex >= 0) {
      this._startMode(MENU_ITEMS[this.menuHoverIndex].mode);
      return;
    }

    // Number keys 1/2/3 to select
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      if (this.input.wasPressed(`Digit${i + 1}`)) {
        this._startMode(MENU_ITEMS[i].mode);
        return;
      }
    }

    // Arrow keys + Enter
    if (this.input.wasPressed('ArrowUp') || this.input.wasPressed('ArrowLeft')) {
      this.menuSelectedIndex = Math.max(0, this.menuSelectedIndex - 1);
    }
    if (this.input.wasPressed('ArrowDown') || this.input.wasPressed('ArrowRight')) {
      this.menuSelectedIndex = Math.min(MENU_ITEMS.length - 1, this.menuSelectedIndex + 1);
    }
    if ((this.input.wasPressed('Enter') || this.input.wasPressed('Space')) && this.menuSelectedIndex >= 0) {
      this._startMode(MENU_ITEMS[this.menuSelectedIndex].mode);
    }

    // ESC on menu → back to main landing page
    if (this.input.isKeyDown('Escape')) {
      window.location.href = '/';
      return;
    }
  }

  _startMode(mode) {
    this.mode = mode;
    this.resetPositions();
    this.state = 'playing';
  }

  _cardRect(index) {
    const w = 260;
    const h = 140;
    const gap = 24;
    const totalW = MENU_ITEMS.length * w + (MENU_ITEMS.length - 1) * gap;
    const startX = (CONFIG.CANVAS_WIDTH - totalW) / 2;
    const y = 290;
    return {
      x: startX + index * (w + gap),
      y: y,
      w: w,
      h: h,
    };
  }

  // ─── Playing update ───
  updatePlaying(dt) {
    // Escape → back to main menu
    this.escapeCooldown = Math.max(0, this.escapeCooldown - dt);
    if (this.input.isKeyDown('Escape') && this.escapeCooldown <= 0) {
      window.location.href = '/';
      return;
    }

    // Mouse click on back button → back to main menu
    if (this.input.wasMouseClicked() && this._backBtnRect) {
      const m = this.input.getMousePosition();
      const b = this._backBtnRect;
      if (m.x >= b.x && m.x <= b.x + b.w && m.y >= b.y && m.y <= b.y + b.h) {
        window.location.href = '/';
        return;
      }
    }

    // Message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }

    // Catch animation
    if (this.catchAnimation > 0) this.catchAnimation -= dt;

    this.losPulse += dt * 2;

    // Tab/M (in-game mode cycling — optional, Escape to menu is primary)
    if (this.input.wasPressed('Tab') || this.input.wasPressed('KeyM')) {
      if (this.mode === CONFIG.CHASE_MODE) this.mode = CONFIG.EVADE_MODE;
      else if (this.mode === CONFIG.EVADE_MODE) this.mode = CONFIG.PLAYER_MODE;
      else this.mode = CONFIG.CHASE_MODE;
      const labels = {
        [CONFIG.CHASE_MODE]: 'CHASE MODE',
        [CONFIG.EVADE_MODE]: 'EVADE MODE',
        [CONFIG.PLAYER_MODE]: 'PLAYER MODE',
      };
      this.showMessage(labels[this.mode], 2);
    }

    // Key 1: respawn
    if (this.input.wasPressed('Digit1')) {
      if (this.mode === CONFIG.CHASE_MODE || this.mode === CONFIG.PLAYER_MODE) {
        this.mouse.setPosition(
          Math.random() * CONFIG.CANVAS_WIDTH,
          Math.random() * CONFIG.CANVAS_HEIGHT
        );
      } else if (this.mode === CONFIG.EVADE_MODE) {
        this.cat.setPosition(
          Math.random() * CONFIG.CANVAS_WIDTH,
          Math.random() * CONFIG.CANVAS_HEIGHT
        );
      }
    }

    // AI / player logic
    const dist = Math.sqrt(
      (this.cat.x - this.mouse.x) ** 2 + (this.cat.y - this.mouse.y) ** 2
    );
    const inLOS = dist <= CONFIG.LOS_RADIUS;

    if (this.mode === CONFIG.CHASE_MODE) {
      if (inLOS) this.cat.chaseSmooth(this.mouse.x, this.mouse.y, dt);
      this.cat.update(dt);
      this.mouse.update(dt);
    } else if (this.mode === CONFIG.EVADE_MODE) {
      this.mouse.evadeSmooth(this.cat.x, this.cat.y, dt);
      this.cat.update(dt);
      this.mouse.update(dt);
    } else if (this.mode === CONFIG.PLAYER_MODE) {
      let mx = 0, my = 0;
      if (this.input.isKeyDown('KeyW')) my -= 1;
      if (this.input.isKeyDown('KeyS')) my += 1;
      if (this.input.isKeyDown('KeyA')) mx -= 1;
      if (this.input.isKeyDown('KeyD')) mx += 1;
      if (mx !== 0 || my !== 0) {
        const len = Math.sqrt(mx * mx + my * my);
        mx /= len; my /= len;
        this.mouse.x += mx * CONFIG.PLAYER_MOUSE_SPEED * dt;
        this.mouse.y += my * CONFIG.PLAYER_MOUSE_SPEED * dt;
        this.mouse.angle = Math.atan2(my, mx);
        this.mouse.trail.push({ x: this.mouse.x, y: this.mouse.y });
        if (this.mouse.trail.length > CONFIG.TRAIL_MAX_LENGTH) this.mouse.trail.shift();
      }
      if (inLOS) this.cat.chaseSmooth(this.mouse.x, this.mouse.y, dt);
      this.cat.update(dt);
      this.mouse.update(dt);
    }

    // Catch detection
    if (dist < this.catchDist && this.catchAnimation <= 0) {
      this.catchCount++;
      this.catchAnimation = 0.5;
      this.showMessage(`CAUGHT! x${this.catchCount}`, 1.5);
      this.particles.explode(
        this.mouse.x, this.mouse.y,
        CONFIG.COLLISION_PARTICLE_COUNT,
        CONFIG.COLLISION_PARTICLE_SPEED,
        CONFIG.COLLISION_PARTICLE_LIFE,
        ['#e94560', '#ff6b81', '#4ecdc4', '#ffd93d']
      );
      this.resetPositions();
    }

    // Bounds
    if (this.cat.isOutOfBounds()) {
      this.cat.setPosition(
        Math.random() * CONFIG.CANVAS_WIDTH,
        Math.random() * CONFIG.CANVAS_HEIGHT
      );
    }
    if (this.mouse.isOutOfBounds()) {
      if (this.mode === CONFIG.PLAYER_MODE) {
        this.mouse.x = Math.max(0, Math.min(CONFIG.CANVAS_WIDTH, this.mouse.x));
        this.mouse.y = Math.max(0, Math.min(CONFIG.CANVAS_HEIGHT, this.mouse.y));
      } else {
        this.mouse.setPosition(
          Math.random() * CONFIG.CANVAS_WIDTH,
          Math.random() * CONFIG.CANVAS_HEIGHT
        );
      }
    }

    this.particles.update(dt);
  }

  showMessage(text, duration) {
    this.message = text;
    this.messageTimer = duration;
  }

  // ═══════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════
  render() {
    if (this.state === 'menu') this.renderMenu();
    else this.renderPlaying();
  }

  // ─── Shared background ───
  drawBackground() {
    const ctx = this.ctx;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    for (const star of this.stars) {
      const alpha = 0.3 + Math.sin(star.twinkle) * 0.25;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#e0e0e0';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  }

  // ─── Menu render ───
  renderMenu() {
    const ctx = this.ctx;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    this.drawBackground();

    // Title
    const titleY = 80;
    ctx.save();
    ctx.font = 'bold 42px monospace';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';

    // Glow
    ctx.shadowColor = '#e94560';
    ctx.shadowBlur = 20 + Math.sin(this.menuTime * 2) * 8;
    ctx.fillStyle = '#e94560';
    ctx.fillText('CHASING & EVADING', w / 2, titleY);
    ctx.shadowBlur = 0;

    // Subtitle
    ctx.font = '16px monospace';
    ctx.fillStyle = '#888';
    ctx.fillText('HTML5 Canvas Port of MonoGame — Select a Mode', w / 2, titleY + 36);
    ctx.restore();

    // Decorative line
    ctx.save();
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.3)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(w / 2 - 200, titleY + 55);
    ctx.lineTo(w / 2 + 200, titleY + 55);
    ctx.stroke();
    ctx.restore();

    // Draw cards
    for (let i = 0; i < MENU_ITEMS.length; i++) {
      this._drawCard(i);
    }

    // Bottom hint
    ctx.save();
    ctx.font = '14px monospace';
    ctx.fillStyle = '#555';
    ctx.textAlign = 'center';
    ctx.fillText(
      'Click a card, press 1-3, or use Arrow Keys + Enter  ·  ESC in-game to return',
      w / 2,
      h - 30
    );
    ctx.restore();
  }

  _drawCard(index) {
    const ctx = this.ctx;
    const item = MENU_ITEMS[index];
    const card = this._cardRect(index);
    const hovered = index === this.menuHoverIndex;
    const scale = hovered ? 1.03 : 1.0;
    const offsetY = hovered ? -4 : 0;

    ctx.save();

    // Card shadow
    if (hovered) {
      ctx.shadowColor = item.color;
      ctx.shadowBlur = 20;
    }

    // Card background
    ctx.fillStyle = hovered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.04)';
    const rx = card.x - (card.w * (scale - 1)) / 2;
    const ry = card.y + offsetY - (card.h * (scale - 1)) / 2;
    const rw = card.w * scale;
    const rh = card.h * scale;

    this._roundedRect(rx, ry, rw, rh, 12);
    ctx.fill();

    // Border
    ctx.strokeStyle = hovered ? item.color : 'rgba(255,255,255,0.1)';
    ctx.lineWidth = hovered ? 2 : 1;
    this._roundedRect(rx, ry, rw, rh, 12);
    ctx.stroke();

    ctx.shadowBlur = 0;

    // Icon
    ctx.font = '32px sans-serif';
    ctx.textAlign = 'center';
    ctx.fillText(item.icon, rx + rw / 2, ry + 36);

    // Label
    ctx.font = 'bold 18px monospace';
    ctx.fillStyle = hovered ? item.color : '#ccc';
    ctx.fillText(item.label, rx + rw / 2, ry + 70);

    // Description (2 lines)
    ctx.font = '12px monospace';
    ctx.fillStyle = '#888';
    const lines = item.desc.split('\n');
    for (let j = 0; j < lines.length; j++) {
      ctx.fillText(lines[j], rx + rw / 2, ry + 92 + j * 16);
    }

    // Number key badge
    ctx.fillStyle = hovered ? item.color : 'rgba(255,255,255,0.15)';
    ctx.beginPath();
    ctx.arc(rx + rw - 18, ry + 18, 12, 0, Math.PI * 2);
    ctx.fill();
    ctx.font = 'bold 12px monospace';
    ctx.fillStyle = hovered ? '#1a1a2e' : '#888';
    ctx.fillText(`${index + 1}`, rx + rw - 18, ry + 23);

    ctx.restore();
  }

  _roundedRect(x, y, w, h, r) {
    const ctx = this.ctx;
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

  // ─── Playing render ───
  drawLOS(ctx) {
    const cx = this.cat.x;
    const cy = this.cat.y;
    const r = CONFIG.LOS_RADIUS;
    const pulse = Math.sin(this.losPulse) * 0.05 + 1.0;
    const pr = r * pulse;

    ctx.save();
    ctx.beginPath();
    ctx.arc(cx, cy, pr, 0, Math.PI * 2);
    ctx.fillStyle = CONFIG.LOS_COLOR;
    ctx.fill();

    ctx.beginPath();
    ctx.arc(cx, cy, pr, 0, Math.PI * 2);
    ctx.strokeStyle = CONFIG.LOS_BORDER_COLOR;
    ctx.lineWidth = 1.5;
    ctx.stroke();

    ctx.setLineDash([4, 8]);
    ctx.strokeStyle = 'rgba(233, 69, 96, 0.2)';
    ctx.lineWidth = 0.5;
    ctx.beginPath();
    ctx.moveTo(cx - pr, cy); ctx.lineTo(cx + pr, cy);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(cx, cy - pr); ctx.lineTo(cx, cy + pr);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.restore();
  }

  renderPlaying() {
    const ctx = this.ctx;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    this.drawBackground();
    this.particles.render(ctx);
    this.drawLOS(ctx);

    this.mouse.render(ctx);
    this.cat.render(ctx);

    // Dashed connection line
    ctx.save();
    ctx.setLineDash([4, 6]);
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.1)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(this.cat.x, this.cat.y);
    ctx.lineTo(this.mouse.x, this.mouse.y);
    ctx.stroke();
    ctx.restore();

    // Distance
    const dist = Math.sqrt(
      (this.cat.x - this.mouse.x) ** 2 + (this.cat.y - this.mouse.y) ** 2
    );
    const midX = (this.cat.x + this.mouse.x) / 2;
    const midY = (this.cat.y + this.mouse.y) / 2;
    const inLOS = dist <= CONFIG.LOS_RADIUS;
    ctx.save();
    ctx.font = '11px monospace';
    ctx.fillStyle = inLOS ? 'rgba(233, 69, 96, 0.7)' : 'rgba(255,255,255,0.4)';
    ctx.textAlign = 'center';
    ctx.fillText(
      `${Math.round(dist)}px${inLOS ? ' • IN RANGE' : ''}`,
      midX, midY - 10
    );
    ctx.restore();

    // HUD
    ctx.fillStyle = CONFIG.HUD_BG;
    ctx.fillRect(0, 0, w, 50);

    ctx.font = CONFIG.FONT;
    ctx.fillStyle = CONFIG.TEXT_COLOR;
    ctx.textAlign = 'left';

    const modeLabels = {
      [CONFIG.CHASE_MODE]: 'CHASE — Cat→Mouse (AI)',
      [CONFIG.EVADE_MODE]: 'EVADE — Mouse→Cat (AI)',
      [CONFIG.PLAYER_MODE]: 'PLAYER — WASD to move!',
    };
    ctx.fillText(`Mode: ${modeLabels[this.mode]}`, 15, 22);
    ctx.fillText(`Catches: ${this.catchCount} | LOS: ${CONFIG.LOS_RADIUS}px`, 15, 42);

    ctx.textAlign = 'right';
    ctx.fillText('1:Respawn | M:Cycle | ESC:Back to Main', w - 15, 22);
    if (this.mode === CONFIG.PLAYER_MODE) {
      ctx.fillText('WASD: Move mouse', w - 15, 42);
    } else {
      ctx.fillText('HTML5 Port of MonoGame', w - 15, 42);
    }

    // Clickable back button area (top-right corner)
    this._backBtnRect = { x: w - 170, y: 2, w: 158, h: 20 };
    ctx.fillStyle = 'rgba(255,255,255,0.04)';
    ctx.fillRect(w - 170, 2, 158, 20);
    ctx.strokeStyle = 'rgba(255,255,255,0.1)';
    ctx.lineWidth = 1;
    ctx.strokeRect(w - 170, 2, 158, 20);
    ctx.font = '12px monospace';
    ctx.fillStyle = '#666';
    ctx.textAlign = 'center';
    ctx.fillText('← Back to Main Menu', w - 91, 15);

    // Catch flash
    if (this.catchAnimation > 0) {
      ctx.save();
      ctx.globalAlpha = this.catchAnimation * 0.3;
      ctx.fillStyle = '#e94560';
      ctx.fillRect(0, 0, w, h);
      ctx.restore();
    }

    // Message
    if (this.message && this.messageTimer > 0) {
      ctx.save();
      ctx.font = CONFIG.FONT_LARGE;
      ctx.fillStyle = '#ffd93d';
      ctx.strokeStyle = '#1a1a2e';
      ctx.lineWidth = 3;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.strokeText(this.message, w / 2, h / 2);
      ctx.fillText(this.message, w / 2, h / 2);
      ctx.restore();
    }

    ctx.textBaseline = 'alphabetic';
  }
}
