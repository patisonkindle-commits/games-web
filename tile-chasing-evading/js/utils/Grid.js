// Grid.js — Grid math utilities for tile-based game
export class Grid {
  constructor(cols, rows) {
    this.cols = cols;
    this.rows = rows;
    this.scores = Array.from({ length: cols }, () =>
      Array.from({ length: rows }, () => 0)
    );
  }

  // Increment score at grid position (for heatmap)
  addScore(gx, gy) {
    if (this.inBounds(gx, gy)) {
      this.scores[gx][gy] += 1;
    }
  }

  // Check bounds
  inBounds(gx, gy) {
    return gx >= 0 && gx < this.cols && gy >= 0 && gy < this.rows;
  }

  // Manhattan distance (tile-based)
  manhattan(x1, y1, x2, y2) {
    return Math.abs(x1 - x2) + Math.abs(y1 - y2);
  }

  // Random grid position
  randomPos() {
    return {
      x: Math.floor(Math.random() * this.cols),
      y: Math.floor(Math.random() * this.rows),
    };
  }

  // Clamp position to grid
  clamp(gx, gy) {
    return {
      x: Math.max(0, Math.min(this.cols - 1, gx)),
      y: Math.max(0, Math.min(this.rows - 1, gy)),
    };
  }
}
