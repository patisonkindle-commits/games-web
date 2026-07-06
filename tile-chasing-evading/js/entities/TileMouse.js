// TileMouse.js — Mouse entity on the tile grid (procedural sprite, replaces mouseTexture)
import { CONFIG } from '../config.js';

export class TileMouse {
  constructor(gx, gy) {
    this.gx = gx;
    this.gy = gy;
    this.px = gx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.py = gy * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.targetPx = this.px;
    this.targetPy = this.py;
    this.moving = false;
    this.moveProgress = 0;
    this.wiggle = 0;
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

  moveToTile(nx, ny) {
    this.gx = nx;
    this.gy = ny;
    this.targetPx = nx * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.targetPy = ny * CONFIG.TILE_SIZE + CONFIG.TILE_SIZE / 2;
    this.moving = true;
    this.moveProgress = 0;
  }

  update(dt) {
    this.wiggle += dt * 12;
    if (this.spawnFlash > 0) this.spawnFlash = Math.max(0, this.spawnFlash - dt * 3);

    if (this.moving) {
      this.moveProgress += dt * 10;
      if (this.moveProgress >= 1) {
        this.px = this.targetPx;
        this.py = this.targetPy;
        this.moving = false;
        this.moveProgress = 0;
      } else {
        const t = this.moveProgress;
        const ease = t * (2 - t); // ease-out
        // We interpolate from the old pixel position
        const ox = this.px; // already updated in setGrid, but we need the start
        this.px = this.px + (this.targetPx - this.px) * ease;
        this.py = this.py + (this.targetPy - this.py) * ease;
      }
    }
  }

  render(ctx) {
    const s = CONFIG.TILE_SIZE;

    if (this.spawnFlash > 0) {
      ctx.save();
      ctx.globalAlpha = this.spawnFlash;
      ctx.fillStyle = '#fff';
      ctx.fillRect(this.gx * s, this.gy * s, s, s);
      ctx.restore();
    }

    const cx = this.gx * s + s / 2;
    const cy = this.gy * s + s / 2;
    const r = s * 0.32;

    ctx.save();

    ctx.shadowColor = CONFIG.MOUSE_COLOR;
    ctx.shadowBlur = 10;

    // Body (oval)
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
