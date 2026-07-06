// Vector2.js — 2D vector math
export class Vector2 {
  constructor(x = 0, y = 0) { this.x = x; this.y = y; }
  clone() { return new Vector2(this.x, this.y); }
  add(v) { return new Vector2(this.x + v.x, this.y + v.y); }
  subtract(v) { return new Vector2(this.x - v.x, this.y - v.y); }
  multiply(s) { return new Vector2(this.x * s, this.y * s); }
  magnitude() { return Math.sqrt(this.x * this.x + this.y * this.y); }
  normalize() {
    const m = this.magnitude();
    return m === 0 ? new Vector2(0, 0) : new Vector2(this.x / m, this.y / m);
  }
  distanceTo(v) { return this.subtract(v).magnitude(); }
  static fromAngle(deg, len = 1) {
    const rad = deg * Math.PI / 180;
    return new Vector2(Math.cos(rad) * len, Math.sin(rad) * len);
  }
}
