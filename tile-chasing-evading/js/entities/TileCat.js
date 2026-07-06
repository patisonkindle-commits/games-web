// TileCat.js — Cat entity on the tile grid (procedural sprite, replaces catTexture)
import { CONFIG } from '../config.js';

export class TileCat {
  constructor(gx, gy) {
    this.gx = gx;      // grid x
    this.gy = gy;      // grid y
    this.px = gx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;  // pixel center
    this.py = gy * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.targetPx = this.px;
    this.targetPy = this.py;
    this.moving = false;
    this.moveProgress = 0;
    this.eyeBlink = 0;
    this.spawnFlash = 1.0;
  }

  setGrid(gx, gy) {
    this.gx = gx;
    this.gy = gy;
    this.px = gx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.py = gy * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.targetPx = this.px;
    this.targetPy = this.py;
    this.spawnFlash = 1.0;
  }

  // Called when AI decides to move to a new tile
  moveToTile(nx, ny) {
    this.gx = nx;
    this.gy = ny;
    this.targetPx = nx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.targetPy = ny * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.moving = true;
    this.moveProgress = 0;
  }

  update(dt) {
    this.eyeBlink += dt;
    if (this.eyeBlink > 3) this.eyeBlink = 0;
    if (this.spawnFlash > 0) this.spawnFlash = Math.max(0, this.spawnFlash - dt * 3);

    // Smooth slide to target pixel position
    if (this.moving) {
      this.moveProgress += dt * 8; // slide speed
      if (this.moveProgress >= 1) {
        this.px = this.targetPx;
        this.py = this.targetPy;
        this.moving = false;
        this.moveProgress = 0;
      } else {
        const sx = this.px + (this.targetPx - this.px) * this.moveProgress;
        const sy = this.py + (this.targetPy - this.py) * this.moveProgress;
        this.px = sx;
        this.py = sy;
      }
    }
  }

  render(ctx) {
    const s = CONFIG.TILE_SIZE;

    // Spawn flash
    if (this.spawnFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.spawnFlash;
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.gx * s, this.gy * s, s, s);
      ctx.restore();
    }

    const cx = this.gx * s + s / 2;
    const cy = this.gy * s + s / 2;
    const r = s * 0.38;

    ctx.save();

    // Glow
    ctx.shadowColor = CONFIG.CAT_COLOR;
    ctx.shadowBlur = 12;

    // Body
    ctx.fillStyle = CONFIG.CAT_COLOR;
    ctx.beginPath();
    ctx.arc(cx, cy, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Ears
    ctx.fillStyle = '#ff6b81';
    // Left
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy - r * 0.7);
    ctx.lineTo(cx - r * 0.3, cy - r * 1.3);
    ctx.lineTo(cx + r * 0.2, cy - r * 0.6);
    ctx.closePath();
    ctx.fill();
    // Right
    ctx.beginPath();
    ctx.moveTo(cx - r * 0.7, cy + r * 0.7);
    ctx.lineTo(cx - r * 0.3, cy + r * 1.3);
    ctx.lineTo(cx + r * 0.2, cy + r * 0.6);
    ctx.closePath();
    ctx.fill();

    // Eyes
    const blinkH = (this.eyeBlink < 0.12) ? 1 : 4;
    const eyeY = r * 0.25;
    const eyeX = r * 0.2;
    ctx.fillStyle = '#fff';
    ctx.beginPath(); ctx.ellipse(cx + eyeX, cy - eyeY, 5, blinkH, 0, 0, Math.PI * 2); ctx.fill();
    ctx.beginPath(); ctx.ellipse(cx + eyeX, cy + eyeY, 5, blinkH, 0, 0, Math.PI * 2); ctx.fill();

    if (blinkH > 1) {
      ctx.fillStyle = '#1a1a2e';
      ctx.beginPath(); ctx.arc(cx + eyeX + 2, cy - eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
      ctx.beginPath(); ctx.arc(cx + eyeX + 2, cy + eyeY, 2.5, 0, Math.PI * 2); ctx.fill();
    }

    // Nose
    ctx.fillStyle = '#ff8fa3';
    ctx.beginPath();
    ctx.moveTo(cx + r * 0.6, cy);
    ctx.lineTo(cx + r * 0.4, cy - 3);
    ctx.lineTo(cx + r * 0.4, cy + 3);
    ctx.closePath();
    ctx.fill();

    // Whiskers
    ctx.strokeStyle = 'rgba(255,180,180,0.6)';
    ctx.lineWidth = 1;
    for (const dy of [-4, 0, 4]) {
      ctx.beginPath();
      ctx.moveTo(cx + r * 0.5, cy + dy);
      ctx.lineTo(cx + r * 1.1, cy + dy + dy * 0.3);
      ctx.stroke();
    }

    ctx.restore();
  }
}
