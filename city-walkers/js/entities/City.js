// City.js — Generate city layout: blocks, roads, sidewalks, crosswalks, waypoints
import { CONFIG } from '../config.js';

export class City {
  constructor() {
    this.blocks = [];       // {x, y, w, h} — building footprints
    this.sidewalks = [];    // {x1,y1, x2,y2} — sidewalk segments
    this.crosswalks = [];   // {x, y, w, h} or {x1,y1, x2,y2}
    this.waypoints = [];    // all walkable points for path generation
    this._roadSegments = []; // road centerlines (for drawing)

    this._build();
  }

  _build() {
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;
    const gs = CONFIG.GRID_SIZE;
    const rw = CONFIG.ROAD_WIDTH;
    const sw = CONFIG.SIDEWALK_WIDTH;

    // Street positions (as fractions of canvas)
    const hStreets = CONFIG.STREETS_H;
    const vStreets = CONFIG.STREETS_V;

    // Convert to pixel positions
    const hPos = hStreets.map(f => Math.round(h * f));
    const vPos = vStreets.map(f => Math.round(w * f));

    // Collect road centerlines (for drawing)
    for (const py of hPos) {
      this._roadSegments.push({ x1: 0, y1: py, x2: w, y2: py, horizontal: true });
    }
    for (const px of vPos) {
      this._roadSegments.push({ x1: px, y1: 0, x2: px, y2: h, horizontal: false });
    }

    // Compute blocks between streets
    const allH = [0, ...hPos, h];
    const allV = [0, ...vPos, w];

    for (let ri = 0; ri < allH.length - 1; ri++) {
      for (let ci = 0; ci < allV.length - 1; ci++) {
        const bx = allV[ci];
        const by = allH[ri];
        const bw = allV[ci + 1] - bx;
        const bh = allH[ri + 1] - by;

        // Check if it's a road (street) or a block
        const isHRoad = hPos.some(p => by <= p && by + bh > p);
        const isVRoad = vPos.some(p => bx <= p && bx + bw > p);

        if (!isHRoad && !isVRoad) {
          // Building block
          const pad = 4; // inner padding
          this.blocks.push({
            x: bx + pad,
            y: by + pad,
            w: bw - pad * 2,
            h: bh - pad * 2,
          });

          // Sidewalks: along each edge of the block (just outside the building)
          const sOff = 1; // offset from building edge
          // Top sidewalk
          this.sidewalks.push({ x1: bx, y1: by - sw, x2: bx + bw, y2: by - sw });
          // Bottom sidewalk
          this.sidewalks.push({ x1: bx, y1: by + bh, x2: bx + bw, y2: by + bh });
          // Left sidewalk
          this.sidewalks.push({ x1: bx - sw, y1: by, x2: bx - sw, y2: by + bh });
          // Right sidewalk
          this.sidewalks.push({ x1: bx + bw, y1: by, x2: bx + bw, y2: by + bh });
        }
      }
    }

    // Generate crosswalks at intersections where roads cross
    for (const hRoad of hPos) {
      for (const vRoad of vPos) {
        const cw = rw * 0.5;
        this.crosswalks.push({
          x: vRoad - cw / 2,
          y: hRoad - rw / 2,
          w: cw,
          h: rw,
          horizontal: true,
        });
        this.crosswalks.push({
          x: vRoad - rw / 2,
          y: hRoad - cw / 2,
          w: rw,
          h: cw,
          horizontal: false,
        });
      }
    }

    // Generate waypoints along sidewalks every ~15px
    const step = 15;
    for (const sw of this.sidewalks) {
      const dx = sw.x2 - sw.x1;
      const dy = sw.y2 - sw.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = dx / len;
      const ny = dy / len;
      const count = Math.floor(len / step);
      for (let i = 0; i <= count; i++) {
        this.waypoints.push({
          x: sw.x1 + nx * i * step,
          y: sw.y1 + ny * i * step,
          type: 'sidewalk',
        });
      }
    }
  }

  /** Generate a random cyclic path for a citizen */
  generatePath(length = 6) {
    if (this.waypoints.length === 0) return [];
    const path = [];
    const used = new Set();
    // Pick a random start
    let idx = Math.floor(Math.random() * this.waypoints.length);
    for (let i = 0; i < length; i++) {
      path.push({ ...this.waypoints[idx] });
      used.add(idx);

      // Pick nearest waypoint not in same spot
      const wp = this.waypoints[idx];
      let best = -1;
      let bestDist = Infinity;
      for (let j = 0; j < this.waypoints.length; j++) {
        if (used.has(j)) continue;
        const d = Math.sqrt(
          (this.waypoints[j].x - wp.x) ** 2 +
          (this.waypoints[j].y - wp.y) ** 2
        );
        // Prefer waypoints between 15-80px away
        if (d > 10 && d < 120 && d < bestDist) {
          bestDist = d;
          best = j;
        }
      }
      if (best < 0) break;
      idx = best;
    }
    if (path.length < 3) {
      // Fallback: just go somewhere
      idx = Math.floor(Math.random() * this.waypoints.length);
      path.push({ ...this.waypoints[idx] });
    }
    // Make it cyclic
    // path.push({ ...path[0] });
    return path;
  }

  /** Render the city */
  render(ctx) {
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Roads
    ctx.fillStyle = CONFIG.ROAD_COLOR;
    for (const seg of this._roadSegments) {
      if (seg.horizontal) {
        ctx.fillRect(0, seg.y1 - CONFIG.ROAD_WIDTH / 2, w, CONFIG.ROAD_WIDTH);
      } else {
        ctx.fillRect(seg.x1 - CONFIG.ROAD_WIDTH / 2, 0, CONFIG.ROAD_WIDTH, h);
      }
    }

    // Road center dashed lines
    ctx.strokeStyle = CONFIG.ROAD_LINE;
    ctx.lineWidth = 1;
    ctx.setLineDash([8, 12]);
    for (const seg of this._roadSegments) {
      ctx.beginPath();
      ctx.moveTo(seg.x1, seg.y1);
      ctx.lineTo(seg.x2, seg.y2);
      ctx.stroke();
    }
    ctx.setLineDash([]);

    // Sidewalks
    ctx.fillStyle = CONFIG.SIDEWALK_COLOR;
    for (const sw of this.sidewalks) {
      const dx = sw.x2 - sw.x1;
      const dy = sw.y2 - sw.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      const nx = -dy / len;
      const ny = dx / len;
      const half = CONFIG.SIDEWALK_WIDTH / 2;
      ctx.beginPath();
      ctx.moveTo(sw.x1 + nx * half, sw.y1 + ny * half);
      ctx.lineTo(sw.x2 + nx * half, sw.y2 + ny * half);
      ctx.lineTo(sw.x2 - nx * half, sw.y2 - ny * half);
      ctx.lineTo(sw.x1 - nx * half, sw.y1 - ny * half);
      ctx.closePath();
      ctx.fill();
    }

    // Crosswalks
    ctx.fillStyle = CONFIG.CROSSWALK_COLOR;
    for (const cw of this.crosswalks) {
      ctx.fillRect(cw.x, cw.y, cw.w, cw.h);
    }

    // Buildings
    for (const b of this.blocks) {
      this._drawBuilding(ctx, b);
    }
  }

  _drawBuilding(ctx, b) {
    // Building body
    ctx.fillStyle = CONFIG.BUILDING_COLOR;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    // Building border
    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // Windows (small grid of lit/unlit squares)
    const winSize = 5;
    const gap = 8;
    const winColor = CONFIG.BUILDING_WINDOW;
    ctx.fillStyle = winColor;
    for (let wx = b.x + 8; wx < b.x + b.w - 6; wx += gap + winSize) {
      for (let wy = b.y + 8; wy < b.y + b.h - 6; wy += gap + winSize) {
        // Randomly lit
        if (Math.random() > 0.45) continue;
        ctx.fillRect(wx, wy, winSize, winSize);
      }
    }

    // Subtle glow at building top
    const grad = ctx.createLinearGradient(b.x, b.y, b.x, b.y + 40);
    grad.addColorStop(0, CONFIG.BUILDING_GLOW);
    grad.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = grad;
    ctx.fillRect(b.x, b.y, b.w, 40);
  }

  /** Find a random position on a sidewalk (for spawning) */
  randomSidewalkPos() {
    const sw = this.sidewalks[Math.floor(Math.random() * this.sidewalks.length)];
    const t = Math.random();
    return {
      x: sw.x1 + (sw.x2 - sw.x1) * t,
      y: sw.y1 + (sw.y2 - sw.y1) * t,
    };
  }
}
