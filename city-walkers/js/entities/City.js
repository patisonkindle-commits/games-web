// City.js — Generate city layout: blocks, roads, sidewalks, crosswalks, waypoints
// Roads have actual width (CONFIG.ROAD_WIDTH). Building blocks sit between road edges.
// Sidewalks sit at the building-edge / road-edge boundary.
import { CONFIG } from '../config.js';

export class City {
  constructor() {
    this.blocks = [];       // {x, y, w, h} — building footprints
    this.sidewalks = [];    // {x1,y1, x2,y2} — sidewalk segments (on building edge)
    this.crosswalks = [];   // {x, y, w, h}
    this.waypoints = [];    // all walkable points for path generation
    this._roadSegments = []; // road centerlines (for drawing)

    this._build();
  }

  _build() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const RW = CONFIG.ROAD_WIDTH;   // total road width
    const HW = RW / 2;              // half-road (distance from center to edge)
    const SW = CONFIG.SIDEWALK_WIDTH;

    // Road center positions
    const hCenters = CONFIG.STREETS_H.map(f => Math.round(H * f));
    const vCenters = CONFIG.STREETS_V.map(f => Math.round(W * f));

    // Store road segments for drawing
    for (const py of hCenters) {
      this._roadSegments.push({ x1: 0, y1: py, x2: W, y2: py, horizontal: true });
    }
    for (const px of vCenters) {
      this._roadSegments.push({ x1: px, y1: 0, x2: px, y2: H, horizontal: false });
    }

    // ── Compute building row boundaries (y ranges between road horizontal bands) ──
    const rowBounds = [];
    let prevY = 0;
    for (const cy of hCenters) {
      const roadStart = cy - HW;
      const roadEnd   = cy + HW;
      if (roadStart > prevY) {
        rowBounds.push({ y: prevY, h: roadStart - prevY }); // building row
      }
      prevY = roadEnd;
    }
    if (prevY < H) {
      rowBounds.push({ y: prevY, h: H - prevY }); // last building row
    }

    // ── Compute building column boundaries (x ranges between road vertical bands) ──
    const colBounds = [];
    let prevX = 0;
    for (const cx of vCenters) {
      const roadStart = cx - HW;
      const roadEnd   = cx + HW;
      if (roadStart > prevX) {
        colBounds.push({ x: prevX, w: roadStart - prevX }); // building col
      }
      prevX = roadEnd;
    }
    if (prevX < W) {
      colBounds.push({ x: prevX, w: W - prevX }); // last building col
    }

    // ── Create building blocks and sidewalks ──
    const PAD = 4; // inner padding for building footprint

    for (const row of rowBounds) {
      for (const col of colBounds) {
        const bx = col.x;
        const by = row.y;
        const bw = col.w;
        const bh = row.h;

        // Building footprint (slightly inset)
        if (bw > PAD * 2 && bh > PAD * 2) {
          this.blocks.push({
            x: bx + PAD,
            y: by + PAD,
            w: bw - PAD * 2,
            h: bh - PAD * 2,
          });
        }

        // Sidewalks along the four edges of this block
        // Top edge (horizontal, at y = by)
        this.sidewalks.push({ x1: bx, y1: by, x2: bx + bw, y2: by });
        // Bottom edge
        this.sidewalks.push({ x1: bx, y1: by + bh, x2: bx + bw, y2: by + bh });
        // Left edge
        this.sidewalks.push({ x1: bx, y1: by, x2: bx, y2: by + bh });
        // Right edge
        this.sidewalks.push({ x1: bx + bw, y1: by, x2: bx + bw, y2: by + bh });
      }
    }

    // ── Generate crosswalks at intersections ──
    // A crosswalk is a short strip crossing the road, placed at each intersection.
    for (const hc of hCenters) {
      for (const vc of vCenters) {
        // Horizontal crosswalk (goes across the vertical road)
        this.crosswalks.push({
          x: vc - RW * 0.25,
          y: hc - RW * 0.15,
          w: RW * 0.5,
          h: RW * 0.3,
        });
        // Vertical crosswalk (goes across the horizontal road)
        this.crosswalks.push({
          x: vc - RW * 0.15,
          y: hc - RW * 0.25,
          w: RW * 0.3,
          h: RW * 0.5,
        });
      }
    }

    // ── Generate waypoints along sidewalks every ~12px ──
    const STEP = 12;
    for (const sw of this.sidewalks) {
      const dx = sw.x2 - sw.x1;
      const dy = sw.y2 - sw.y1;
      const len = Math.sqrt(dx * dx + dy * dy);
      if (len < 1) continue;
      const nx = dx / len;
      const ny = dy / len;
      const count = Math.floor(len / STEP);
      for (let i = 0; i <= count; i++) {
        this.waypoints.push({
          x: sw.x1 + nx * i * STEP,
          y: sw.y1 + ny * i * STEP,
          type: 'sidewalk',
        });
      }
    }
  }

  /** Generate a random cyclic path for a citizen */
  generatePath(length = 5) {
    if (this.waypoints.length === 0) return [];
    const path = [];
    const used = new Set();
    let idx = Math.floor(Math.random() * this.waypoints.length);
    for (let i = 0; i < length; i++) {
      path.push({ ...this.waypoints[idx] });
      used.add(idx);
      const wp = this.waypoints[idx];
      let best = -1;
      let bestDist = Infinity;
      for (let j = 0; j < this.waypoints.length; j++) {
        if (used.has(j)) continue;
        const d = Math.sqrt(
          (this.waypoints[j].x - wp.x) ** 2 +
          (this.waypoints[j].y - wp.y) ** 2
        );
        // Prefer waypoints 15-100px away (different edges of the block)
        if (d > 15 && d < 100 && d < bestDist) {
          bestDist = d;
          best = j;
        }
      }
      if (best < 0) break;
      idx = best;
    }
    if (path.length < 2) {
      // Fallback
      path.push({ ...this.waypoints[Math.floor(Math.random() * this.waypoints.length)] });
    }
    return path;
  }

  // ─── RENDERING ───

  render(ctx) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const RW = CONFIG.ROAD_WIDTH;
    const HW = RW / 2;

    // Background
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Roads (draw as wide rectangles centered on road centerlines)
    ctx.fillStyle = CONFIG.ROAD_COLOR;
    for (const seg of this._roadSegments) {
      if (seg.horizontal) {
        ctx.fillRect(0, seg.y1 - HW, W, RW);
      } else {
        ctx.fillRect(seg.x1 - HW, 0, RW, H);
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

    // Sidewalk strips (drawn as thin lines along building edges)
    ctx.strokeStyle = CONFIG.SIDEWALK_COLOR;
    ctx.lineWidth = CONFIG.SIDEWALK_WIDTH;
    ctx.lineCap = 'butt';
    for (const sw of this.sidewalks) {
      ctx.beginPath();
      ctx.moveTo(sw.x1, sw.y1);
      ctx.lineTo(sw.x2, sw.y2);
      ctx.stroke();
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
    ctx.fillStyle = CONFIG.BUILDING_COLOR;
    ctx.fillRect(b.x, b.y, b.w, b.h);

    ctx.strokeStyle = 'rgba(255,255,255,0.03)';
    ctx.lineWidth = 1;
    ctx.strokeRect(b.x, b.y, b.w, b.h);

    // Windows
    const winSize = 5;
    const gap = 8;
    for (let wx = b.x + 8; wx < b.x + b.w - 6; wx += gap + winSize) {
      for (let wy = b.y + 8; wy < b.y + b.h - 6; wy += gap + winSize) {
        if (Math.random() > 0.45) continue;
        ctx.fillStyle = CONFIG.BUILDING_WINDOW;
        ctx.fillRect(wx, wy, winSize, winSize);
      }
    }

    // Subtle glow at top
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
