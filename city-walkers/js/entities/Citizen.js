// Citizen.js — A walker who follows a path and flocks with others
import { CONFIG } from '../config.js';

let nextId = 0;

export class Citizen {
  constructor(x, y, path) {
    this.id = nextId++;
    this.x = x;
    this.y = y;
    this.vx = 0;
    this.vy = 0;

    this.path = path || [];      // array of {x, y} waypoints
    this.pathIndex = 0;          // current target waypoint
    this.maxSpeed = CONFIG.WALKER_SPEED * (0.8 + Math.random() * 0.4);
    this.radius = CONFIG.CITIZEN_RADIUS;

    // Personal style
    this.hue = 160 + Math.random() * 40; // teal range
    this.bodyColor = CONFIG.CITIZEN_BODY;
    this.headColor = CONFIG.CITIZEN_HEAD;
    this.walkCycle = Math.random() * Math.PI * 2;
    this.personality = 0.7 + Math.random() * 0.6; // affects path adherence

    // Random offset for organic feel
    this.offX = (Math.random() - 0.5) * CONFIG.PATH_JITTER;
    this.offY = (Math.random() - 0.5) * CONFIG.PATH_JITTER;

    // Start velocity along path direction
    if (this.path.length >= 2) {
      const dx = this.path[1].x - this.path[0].x;
      const dy = this.path[1].y - this.path[0].y;
      const d = Math.sqrt(dx * dx + dy * dy) || 1;
      this.vx = (dx / d) * this.maxSpeed;
      this.vy = (dy / d) * this.maxSpeed;
    } else {
      this.vx = (Math.random() - 0.5) * this.maxSpeed;
      this.vy = (Math.random() - 0.5) * this.maxSpeed;
    }
  }

  /** Current target waypoint */
  get target() {
    if (this.path.length === 0) return null;
    return this.path[this.pathIndex % this.path.length];
  }

  /** Distance to another citizen */
  distTo(other) {
    const dx = other.x - this.x;
    const dy = other.y - this.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  /** Steer toward current waypoint (path following) */
  _pathFollow() {
    const t = this.target;
    if (!t) return [0, 0];

    const dx = t.x + this.offX - this.x;
    const dy = t.y + this.offY - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);

    // Check if reached waypoint
    if (d < CONFIG.WAYPOINT_REACH_DIST) {
      this.pathIndex++;
      // Regenerate offset for next segment
      this.offX = (Math.random() - 0.5) * CONFIG.PATH_JITTER * this.personality;
      this.offY = (Math.random() - 0.5) * CONFIG.PATH_JITTER * this.personality;
      // If we completed full cycle, reshuffle a bit
      if (this.pathIndex >= this.path.length) {
        this.pathIndex = 0;
        // Add slight random offset to keep things fresh
        this.offX = (Math.random() - 0.5) * 5;
        this.offY = (Math.random() - 0.5) * 5;
      }
      return this._pathFollow(); // immediately steer to next
    }

    // Seek toward target
    return [
      (dx / d) * this.maxSpeed - this.vx,
      (dy / d) * this.maxSpeed - this.vy
    ];
  }

  /** Cohesion: steer toward center of nearby citizens */
  _cohesion(nearby) {
    if (nearby.length === 0) return [0, 0];
    let cx = 0, cy = 0;
    for (const c of nearby) {
      cx += c.x;
      cy += c.y;
    }
    cx /= nearby.length;
    cy /= nearby.length;
    const dx = cx - this.x;
    const dy = cy - this.y;
    const d = Math.sqrt(dx * dx + dy * dy);
    if (d < 1) return [0, 0];
    return [
      (dx / d) * this.maxSpeed - this.vx,
      (dy / d) * this.maxSpeed - this.vy
    ];
  }

  /** Separation: avoid crowding */
  _separation(nearby) {
    let fx = 0, fy = 0;
    for (const c of nearby) {
      const dx = this.x - c.x;
      const dy = this.y - c.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && d < CONFIG.SEPARATION_DIST) {
        const strength = (CONFIG.SEPARATION_DIST - d) / CONFIG.SEPARATION_DIST;
        fx += (dx / d) * strength;
        fy += (dy / d) * strength;
      }
    }
    const m = Math.sqrt(fx * fx + fy * fy);
    if (m < 0.01) return [0, 0];
    return [
      (fx / m) * this.maxSpeed - this.vx,
      (fy / m) * this.maxSpeed - this.vy
    ];
  }

  /** Alignment: match velocity with neighbors */
  _alignment(nearby) {
    if (nearby.length === 0) return [0, 0];
    let avx = 0, avy = 0;
    for (const c of nearby) {
      avx += c.vx;
      avy += c.vy;
    }
    avx /= nearby.length;
    avy /= nearby.length;
    const m = Math.sqrt(avx * avx + avy * avy);
    if (m < 0.1) return [0, 0];
    return [
      (avx / m) * this.maxSpeed - this.vx,
      (avy / m) * this.maxSpeed - this.vy
    ];
  }

  /** Apply steering force */
  applyForce(fx, fy, dt) {
    const fMag = Math.sqrt(fx * fx + fy * fy);
    const maxF = CONFIG.MAX_FORCE;
    if (fMag > maxF) {
      fx = (fx / fMag) * maxF;
      fy = (fy / fMag) * maxF;
    }
    this.vx += fx * dt;
    this.vy += fy * dt;
    const s = Math.sqrt(this.vx * this.vx + this.vy * this.vy);
    if (s > this.maxSpeed) {
      this.vx = (this.vx / s) * this.maxSpeed;
      this.vy = (this.vy / s) * this.maxSpeed;
    }
    if (s < 0.5) {
      this.vx += (Math.random() - 0.5) * 8;
      this.vy += (Math.random() - 0.5) * 8;
    }
  }

  /** Get nearby citizens (within perception radius) */
  getNearby(allCitizens) {
    const nearby = [];
    for (const c of allCitizens) {
      if (c === this) continue;
      if (this.distTo(c) < CONFIG.PERCEPTION) {
        nearby.push(c);
      }
    }
    return nearby;
  }

  update(dt) {
    this.walkCycle += dt * 6;
  }

  /** Full steering update from game */
  steer(cohesionW, separationW, alignmentW, nearby) {
    const [pfx, pfy] = this._pathFollow();
    const [cx, cy] = this._cohesion(nearby);
    const [sx, sy] = this._separation(nearby);
    const [ax, ay] = this._alignment(nearby);

    this.applyForce(
      pfx * 3.0 +          // path following is primary (keep on sidewalk!)
      cx * cohesionW +
      sx * separationW +
      ax * alignmentW,
      pfy * 3.0 +
      cy * cohesionW +
      sy * separationW +
      ay * alignmentW,
      1/60
    );
  }

  /** Move by velocity */
  move(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  render(ctx) {
    const angle = Math.atan2(this.vy, this.vx);
    const r = this.radius;
    const bob = Math.sin(this.walkCycle) * 0.8; // subtle bounce

    ctx.save();
    ctx.translate(this.x, this.y + bob);

    // Shadow
    ctx.fillStyle = 'rgba(0,0,0,0.2)';
    ctx.beginPath();
    ctx.ellipse(0, r * 0.6, r * 0.8, r * 0.3, 0, 0, Math.PI * 2);
    ctx.fill();

    // Body (circle)
    ctx.fillStyle = this.bodyColor;
    ctx.shadowColor = this.bodyColor;
    ctx.shadowBlur = 4;
    ctx.beginPath();
    ctx.arc(0, 0, r, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;

    // Head direction indicator (smaller circle in direction of travel)
    ctx.fillStyle = this.headColor;
    const headX = Math.cos(angle) * r * 0.6;
    const headY = Math.sin(angle) * r * 0.6;
    ctx.beginPath();
    ctx.arc(headX, headY, r * 0.35, 0, Math.PI * 2);
    ctx.fill();

    // Eyes (two tiny dots on head)
    const perpAngle = angle + Math.PI / 2;
    const eyeOff = r * 0.15;
    ctx.fillStyle = '#fff';
    ctx.beginPath();
    ctx.arc(
      headX + Math.cos(angle) * 2 + Math.cos(perpAngle) * eyeOff,
      headY + Math.sin(angle) * 2 + Math.sin(perpAngle) * eyeOff,
      0.8, 0, Math.PI * 2
    );
    ctx.fill();
    ctx.beginPath();
    ctx.arc(
      headX + Math.cos(angle) * 2 - Math.cos(perpAngle) * eyeOff,
      headY + Math.sin(angle) * 2 - Math.sin(perpAngle) * eyeOff,
      0.8, 0, Math.PI * 2
    );
    ctx.fill();

    // Legs (two tiny lines)
    const legSwing = Math.sin(this.walkCycle) * 3;
    ctx.strokeStyle = this.bodyColor;
    ctx.lineWidth = 1.2;
    ctx.beginPath();
    ctx.moveTo(-r * 0.3, r * 0.4);
    ctx.lineTo(-r * 0.5 - legSwing * 0.5, r * 1.0);
    ctx.stroke();
    ctx.beginPath();
    ctx.moveTo(r * 0.3, r * 0.4);
    ctx.lineTo(r * 0.5 + legSwing * 0.5, r * 1.0);
    ctx.stroke();

    ctx.restore();
  }
}
