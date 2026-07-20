// City.js — Generate city layout: blocks, roads, sidewalks, crosswalks, waypoints
// Roads have actual width (CONFIG.ROAD_WIDTH). Building blocks sit between road edges.
// Sidewalks sit at the building-edge / road-edge boundary.
// Paths follow the sidewalk perimeter of a block (not random waypoint jumps).
import { CONFIG } from '../config.js';

export class City {
  constructor() {
    this.blocks = [];       // {x, y, w, h} — building footprints
    this.sidewalks = [];    // {x1,y1, x2,y2} — sidewalk segments (on building edge)
    this.crosswalks = [];   // {x, y, w, h}
    this.waypoints = [];    // all walkable points for path generation
    this._roadSegments = []; // road centerlines (for drawing)
    // NEW: per-block perimeter waypoints grouped
    this.blockPaths = [];   // [{edge, x, y, sx, sy}...] ordered per-block

    this._build();
  }

  _build() {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const RW = CONFIG.ROAD_WIDTH;
    const HW = RW / 2;

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

    // ── Compute building row/col boundaries (between road edges) ──
    const rowBounds = [];
    let prevY = 0;
    for (const cy of hCenters) {
      const roadStart = cy - HW;
      const roadEnd   = cy + HW;
      if (roadStart > prevY) rowBounds.push({ y: prevY, h: roadStart - prevY });
      prevY = roadEnd;
    }
    if (prevY < H) rowBounds.push({ y: prevY, h: H - prevY });

    const colBounds = [];
    let prevX = 0;
    for (const cx of vCenters) {
      const roadStart = cx - HW;
      const roadEnd   = cx + HW;
      if (roadStart > prevX) colBounds.push({ x: prevX, w: roadStart - prevX });
      prevX = roadEnd;
    }
    if (prevX < W) colBounds.push({ x: prevX, w: W - prevX });

    // ── Create building blocks, sidewalks, and per-block perimeter paths ──
    const PAD = 4;
    const STEP = 10; // waypoint spacing

    for (let ri = 0; ri < rowBounds.length; ri++) {
      for (let ci = 0; ci < colBounds.length; ci++) {
        const bx = colBounds[ci].x;
        const by = rowBounds[ri].y;
        const bw = colBounds[ci].w;
        const bh = rowBounds[ri].h;

        // Building footprint
        if (bw > PAD * 2 && bh > PAD * 2) {
          this.blocks.push({ x: bx + PAD, y: by + PAD, w: bw - PAD * 2, h: bh - PAD * 2 });
        }

        // Four sidewalk edges
        // We'll also store them indexed by block for path generation
        const edges = [
          { edge: 'top',    x1: bx, y1: by,     x2: bx + bw, y2: by },       // → rightward
          { edge: 'right',  x1: bx + bw, y1: by,     x2: bx + bw, y2: by + bh }, // ↓ downward
          { edge: 'bottom', x1: bx + bw, y1: by + bh, x2: bx, y2: by + bh }, // → but LEFTward ← FIX
          { edge: 'left',   x1: bx, y1: by + bh, x2: bx, y2: by },       // ↓ but UPward   ↑ FIX
        ];

        for (const e of edges) {
          this.sidewalks.push({ x1: e.x1, y1: e.y1, x2: e.x2, y2: e.y2 });
        }

        // ── Generate perimeter waypoint path for this block (clockwise loop) ──
        const perim = [];
        // Walk each edge, adding waypoints at STEP intervals
        for (const e of edges) {
          const dx = e.x2 - e.x1;
          const dy = e.y2 - e.y1;
          const len = Math.sqrt(dx * dx + dy * dy);
          if (len < 1) continue;
          const nx = dx / len;
          const ny = dy / len;
          const count = Math.floor(len / STEP);
          const actualCount = (e.edge === edges[edges.length - 1].edge) ? count : count; // don't duplicate corners
          for (let i = 0; i <= count; i++) {
            // Skip the last point of each edge except the last edge (avoid duplicate corners)
            if (i === count && e.edge !== edges[edges.length - 1].edge) continue;
            const px = e.x1 + nx * i * STEP;
            const py = e.y1 + ny * i * STEP;
            perim.push({ x: px, y: py, edge: e.edge });
            this.waypoints.push({ x: px, y: py, type: 'sidewalk', block: `${ri}_${ci}`, edge: e.edge });
          }
        }
        this.blockPaths.push({ blockId: `${ri}_${ci}`, path: perim, x: bx, y: by, w: bw, h: bh });
      }
    }

    // ── Generate crosswalks at intersections ──
    for (const hc of hCenters) {
      for (const vc of vCenters) {
        this.crosswalks.push({
          x: vc - RW * 0.25, y: hc - RW * 0.15, w: RW * 0.5, h: RW * 0.3,
        });
        this.crosswalks.push({
          x: vc - RW * 0.15, y: hc - RW * 0.25, w: RW * 0.3, h: RW * 0.5,
        });
      }
    }
  }

  /**
   * Generate a path that walks the perimeter of a random block (clockwise loop).
   * This ensures citizens actually walk along the sidewalk edges, turning at corners,
   * not cutting across buildings or roads.
   */
  generatePath() {
    if (this.blockPaths.length === 0) return [];
    return this._buildPathFromBlock(this.blockPaths[Math.floor(Math.random() * this.blockPaths.length)]);
  }

  /**
   * Generate a path on the NEAREST block to a given position.
   * This is critical — when a citizen finishes its path and needs a new one,
   * we must give them a path on a nearby block, NOT a random one.
   * Otherwise the citizen walks diagonally across the city to reach the new block.
   */
  generatePathNear(x, y) {
    if (this.blockPaths.length === 0) return [];

    let nearest = this.blockPaths[0];
    let nearDist = Infinity;
    for (const bp of this.blockPaths) {
      const cx = bp.x + bp.w / 2;
      const cy = bp.y + bp.h / 2;
      const dx = cx - x;
      const dy = cy - y;
      const d = dx * dx + dy * dy;
      if (d < nearDist) {
        nearDist = d;
        nearest = bp;
      }
    }
    return this._buildPathFromBlock(nearest);
  }

  /** Build a full perimeter path from a random start point (looping) */
  _buildPathFromBlock(block) {
    const perim = block.path;
    if (perim.length < 4) return [];

    const startIdx = Math.floor(Math.random() * perim.length);
    const path = [];
    for (let i = 0; i < perim.length; i++) {
      const idx = (startIdx + i) % perim.length;
      path.push({ x: perim[idx].x, y: perim[idx].y });
    }
    return path;
  }

  /**
   * Check if a point is within sidewalk boundaries of this city
   */
  isOnSidewalk(x, y) {
    const margin = 8;
    for (const sw of this.sidewalks) {
      // Approximate: check distance to sidewalk segment
      const dx = sw.x2 - sw.x1;
      const dy = sw.y2 - sw.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      const t = Math.max(0, Math.min(1, ((x - sw.x1) * dx + (y - sw.y1) * dy) / len2));
      const px = sw.x1 + t * dx;
      const py = sw.y1 + t * dy;
      const dist2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (dist2 < margin * margin) return true;
    }
    return false;
  }

  /** Find nearest point on any sidewalk segment */
  nearestSidewalkPos(x, y) {
    let best = null;
    let bestD = Infinity;
    for (const sw of this.sidewalks) {
      const dx = sw.x2 - sw.x1;
      const dy = sw.y2 - sw.y1;
      const len2 = dx * dx + dy * dy;
      if (len2 < 1) continue;
      const t = Math.max(0, Math.min(1, ((x - sw.x1) * dx + (y - sw.y1) * dy) / len2));
      const px = sw.x1 + t * dx;
      const py = sw.y1 + t * dy;
      const d2 = (x - px) * (x - px) + (y - py) * (y - py);
      if (d2 < bestD) {
        bestD = d2;
        best = { x: px, y: py };
      }
    }
    return best || { x, y };
  }

  // ─── RENDERING ───
  render(ctx) {
    const W = CONFIG.CANVAS_WIDTH;
    const H = CONFIG.CANVAS_HEIGHT;
    const RW = CONFIG.ROAD_WIDTH;
    const HW = RW / 2;

    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, W, H);

    // Roads
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

    // Sidewalk strips
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

    const winSize = 5;
    const gap = 8;
    for (let wx = b.x + 8; wx < b.x + b.w - 6; wx += gap + winSize) {
      for (let wy = b.y + 8; wy < b.y + b.h - 6; wy += gap + winSize) {
        if (Math.random() > 0.45) continue;
        ctx.fillStyle = CONFIG.BUILDING_WINDOW;
        ctx.fillRect(wx, wy, winSize, winSize);
      }
    }

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
