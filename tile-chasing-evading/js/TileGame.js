// TileGame.js — Tile-based chasing & evading game
// Ports MyChasingandEvading_tile_basic_2 / Game1.cs to HTML5 Canvas
import { CONFIG } from './config.js';
import { Input } from './systems/Input.js';
import { Grid } from './utils/Grid.js';
import { TileCat } from './entities/TileCat.js';
import { TileMouse } from './entities/TileMouse.js';

export class TileGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    canvas.width = CONFIG.CANVAS_WIDTH;
    canvas.height = CONFIG.CANVAS_HEIGHT;

    this.input = new Input(canvas);
    this.grid = new Grid(CONFIG.GRID_COLS, CONFIG.GRID_ROWS);

    this.cat = null;
    this.mouse = null;
    this.mode = CONFIG.CHASE_MODE;
    this.counter = 0;          // frames, matches C# counter
    this.catchCount = 0;
    this.showHeatmap = false;
    this.running = true;
    this.lastTime = 0;
    this.escapeCooldown = 0;

    // Trail: record visited grid cells for heatmap
    this.catTrail = [];
    this.mouseTrail = [];

    // Message
    this.message = '';
    this.messageTimer = 0;

    this.resetPositions();
  }

  resetPositions() {
    const cp = this.grid.randomPos();
    const mp = this.grid.randomPos();
    // Ensure they don't start on the same tile
    while (mp.x === cp.x && mp.y === cp.y) {
      mp.x = Math.floor(Math.random() * CONFIG.GRID_COLS);
      mp.y = Math.floor(Math.random() * CONFIG.GRID_ROWS);
    }
    this.cat = new TileCat(cp.x, cp.y);
    this.mouse = new TileMouse(mp.x, mp.y);
    this.catTrail = [];
    this.mouseTrail = [];
  }

  respawnTarget() {
    if (this.mode === CONFIG.CHASE_MODE) {
      // Press 1 → respawn mouse (matching C# case 1)
      const p = this._randomPosNotOn(this.cat.gx, this.cat.gy);
      this.mouse.setGrid(p.x, p.y);
    } else if (this.mode === CONFIG.EVADE_MODE) {
      // Press 1 → respawn cat (matching C# case 2)
      const p = this._randomPosNotOn(this.mouse.gx, this.mouse.gy);
      this.cat.setGrid(p.x, p.y);
    }
  }

  _randomPosNotOn(avoidX, avoidY) {
    let p;
    do {
      p = this.grid.randomPos();
    } while (p.x === avoidX && p.y === avoidY);
    return p;
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
    // Escape cooldown
    this.escapeCooldown = Math.max(0, this.escapeCooldown - dt);

    // Message timer
    if (this.messageTimer > 0) {
      this.messageTimer -= dt;
      if (this.messageTimer <= 0) this.message = '';
    }

    // ── ESC → back to main menu ──
    this.escapeCooldown = Math.max(0, this.escapeCooldown - dt);
    if (this.input.isKeyDown('Escape') && this.escapeCooldown <= 0) {
      window.location.href = '/';
      return;
    }

    // ── Counter (matches C# counter++) ──
    this.counter++;
    if (this.counter > 59) this.counter = 0;

    // ── Input: D1 key → respawn (edge-triggered, matching old_ks logic) ──
    if (this.input.wasPressed('Digit1')) {
      this.respawnTarget();
    }

    // ── Mode toggle ──
    if (this.input.wasPressed('KeyM') || this.input.wasPressed('Tab')) {
      this.mode = this.mode === CONFIG.CHASE_MODE ? CONFIG.EVADE_MODE : CONFIG.CHASE_MODE;
      const label = this.mode === CONFIG.CHASE_MODE ? 'CHASE MODE' : 'EVADE MODE';
      this.showMessage(label, 1.5);
    }

    // ── Toggle heatmap ──
    if (this.input.wasPressed('KeyH')) {
      this.showHeatmap = !this.showHeatmap;
    }

    // ── Reset scores ──
    if (this.input.wasPressed('KeyR')) {
      this.grid = new Grid(CONFIG.GRID_COLS, CONFIG.GRID_ROWS);
      this.catchCount = 0;
      this.showMessage('SCORES RESET', 1);
    }

    // ── Bounds check (matching C# checks against >= 10) ──
    if (!this.grid.inBounds(this.cat.gx, this.cat.gy)) {
      const p = this.grid.randomPos();
      this.cat.setGrid(p.x, p.y);
    }
    if (!this.grid.inBounds(this.mouse.gx, this.mouse.gy)) {
      const p = this.grid.randomPos();
      this.mouse.setGrid(p.x, p.y);
    }

    // ── Tile AI (only on counter % 30 == 0, matching C#) ──
    if (this.counter % CONFIG.MOVE_INTERVAL === 0) {
      if (this.mode === CONFIG.CHASE_MODE) {
        this._tileChase();
      } else {
        this._tileEvade();
      }
    }

    // ── Record heatmap ──
    this.grid.addScore(this.cat.gx, this.cat.gy);
    this.catTrail.push({ x: this.cat.gx, y: this.cat.gy });
    this.mouseTrail.push({ x: this.mouse.gx, y: this.mouse.gy });

    // ── Catch detection (same tile) ──
    if (this.cat.gx === this.mouse.gx && this.cat.gy === this.mouse.gy) {
      this.catchCount++;
      this.showMessage(`CAUGHT! x${this.catchCount}`, 1.5);
      this.grid.addScore(this.cat.gx, this.cat.gy); // extra score on catch
      // Reset positions on catch
      const cp = this.grid.randomPos();
      let mp;
      do { mp = this.grid.randomPos(); } while (mp.x === cp.x && mp.y === cp.y);
      this.cat.setGrid(cp.x, cp.y);
      this.mouse.setGrid(mp.x, mp.y);
    }

    this.cat.update(dt);
    this.mouse.update(dt);
    this.input.postFrame();
  }

  // ── Tile-based chase (ports tileBasedChaseBasic) ──
  _tileChase() {
    const cg = { x: this.cat.gx, y: this.cat.gy };
    const mg = { x: this.mouse.gx, y: this.mouse.gy };

    if (cg.x > mg.x) cg.x -= 1;
    else if (cg.x < mg.x) cg.x += 1;

    if (cg.y > mg.y) cg.y -= 1;
    else if (cg.y < mg.y) cg.y += 1;

    // Clamp to grid
    const clamped = this.grid.clamp(cg.x, cg.y);
    if (clamped.x !== this.cat.gx || clamped.y !== this.cat.gy) {
      this.cat.moveToTile(clamped.x, clamped.y);
    }
  }

  // ── Tile-based evade (implements the C# stub) ──
  _tileEvade() {
    const cg = { x: this.cat.gx, y: this.cat.gy };
    const mg = { x: this.mouse.gx, y: this.mouse.gy };

    // Move away from cat (opposite direction of chase)
    if (mg.x > cg.x) mg.x += 1;
    else if (mg.x < cg.x) mg.x -= 1;

    if (mg.y > cg.y) mg.y += 1;
    else if (mg.y < cg.y) mg.y -= 1;

    // Clamp to grid
    const clamped = this.grid.clamp(mg.x, mg.y);
    if (clamped.x !== this.mouse.gx || clamped.y !== this.mouse.gy) {
      this.mouse.moveToTile(clamped.x, clamped.y);
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
    const ts = CONFIG.TILE_SIZE;

    // Background
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // ── Draw grid tiles ──
    for (let i = 0; i < CONFIG.GRID_COLS; i++) {
      for (let j = 0; j < CONFIG.GRID_ROWS; j++) {
        const isLight = (i + j) % 2 === 0;
        ctx.fillStyle = isLight ? CONFIG.TILE_LIGHT : CONFIG.TILE_DARK;
        ctx.fillRect(i * ts, j * ts, ts, ts);
      }
    }

    // ── Heatmap overlay ──
    if (this.showHeatmap) {
      const maxScore = Math.max(1, ...this.grid.scores.flat());
      for (let i = 0; i < CONFIG.GRID_COLS; i++) {
        for (let j = 0; j < CONFIG.GRID_ROWS; j++) {
          const s = this.grid.scores[i][j];
          if (s > 0) {
            const idx = Math.min(
              Math.floor((s / maxScore) * CONFIG.HEAT_MAP_COLORS.length),
              CONFIG.HEAT_MAP_COLORS.length - 1
            );
            ctx.fillStyle = CONFIG.HEAT_MAP_COLORS[idx];
            ctx.fillRect(i * ts, j * ts, ts, ts);
          }
        }
      }
    }

    // ── Grid lines ──
    ctx.strokeStyle = CONFIG.GRID_LINE;
    ctx.lineWidth = 1;
    for (let i = 0; i <= CONFIG.GRID_COLS; i++) {
      ctx.beginPath();
      ctx.moveTo(i * ts, 0);
      ctx.lineTo(i * ts, h);
      ctx.stroke();
    }
    for (let j = 0; j <= CONFIG.GRID_ROWS; j++) {
      ctx.beginPath();
      ctx.moveTo(0, j * ts);
      ctx.lineTo(w, j * ts);
      ctx.stroke();
    }

    // ── Grid coordinates (faint) ──
    ctx.save();
    ctx.font = CONFIG.FONT_SMALL;
    ctx.fillStyle = 'rgba(255,255,255,0.08)';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'top';
    for (let i = 0; i < CONFIG.GRID_COLS; i++) {
      for (let j = 0; j < CONFIG.GRID_ROWS; j++) {
        ctx.fillText(`${i},${j}`, i * ts + 3, j * ts + 2);
      }
    }
    ctx.restore();

    // ── Connection line between cat and mouse ──
    const catPx = this.cat.gx * ts + ts / 2;
    const catPy = this.cat.gy * ts + ts / 2;
    const mousePx = this.mouse.gx * ts + ts / 2;
    const mousePy = this.mouse.gy * ts + ts / 2;
    const dist = this.grid.manhattan(this.cat.gx, this.cat.gy, this.mouse.gx, this.mouse.gy);

    ctx.save();
    ctx.setLineDash([4, 4]);
    ctx.strokeStyle = dist <= 2 ? 'rgba(233,69,96,0.5)' : 'rgba(255,255,255,0.08)';
    ctx.lineWidth = dist <= 2 ? 2 : 1;
    ctx.beginPath();
    ctx.moveTo(catPx, catPy);
    ctx.lineTo(mousePx, mousePy);
    ctx.stroke();
    ctx.setLineDash([]);

    // Manhattan distance label
    ctx.font = CONFIG.FONT_SMALL;
    ctx.fillStyle = dist <= 2 ? 'rgba(233,69,96,0.8)' : 'rgba(255,255,255,0.3)';
    ctx.textAlign = 'center';
    ctx.fillText(`${dist} tiles`, (catPx + mousePx) / 2, (catPy + mousePy) / 2 - 10);
    ctx.restore();

    // ── Entities ──
    this.mouse.render(ctx);
    this.cat.render(ctx);

    // ── HUD overlay ──
    ctx.fillStyle = 'rgba(0,0,0,0.7)';
    ctx.fillRect(0, 0, w, 36);

    ctx.font = CONFIG.FONT;
    ctx.textAlign = 'left';
    ctx.fillStyle = CONFIG.TEXT_COLOR || '#ccc';
    const modeLabel = this.mode === CONFIG.CHASE_MODE ? 'CHASE' : 'EVADE';
    ctx.fillText(`Mode: ${modeLabel}  |  Cat: (${this.cat.gx},${this.cat.gy})  |  Mouse: (${this.mouse.gx},${this.mouse.gy})  |  Caught: ${this.catchCount}`, 10, 14);

    ctx.textAlign = 'right';
    ctx.fillStyle = '#555';
    ctx.fillText(`Frame: ${this.counter}  |  H:Heatmap  |  R:Reset`, w - 10, 14);

    // Heatmap indicator
    if (this.showHeatmap) {
      ctx.textAlign = 'right';
      ctx.fillStyle = '#e94560';
      ctx.fillText('HEATMAP ON', w - 10, 28);
    }

    // ── Message overlay ──
    if (this.message && this.messageTimer > 0) {
      ctx.save();
      ctx.font = 'bold 28px monospace';
      ctx.fillStyle = '#ffd93d';
      ctx.strokeStyle = '#0a0a1a';
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
