// FlockingGame.js — Main flocking simulation class
import { CONFIG } from './config.js';
import { Boid } from './entities/Boid.js';
import { Obstacle } from './entities/Obstacle.js';

export class FlockingGame {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;

    this.boids = [];
    this.obstacles = [];

    // Flag to show neighbor lines
    this.showNeighbors = false;

    // Boid trail display
    this.boidTrails = false;

    // UI values (set by sliders)
    this.cohesionWeight = CONFIG.COHESION_WEIGHT;
    this.separationWeight = CONFIG.SEPARATION_WEIGHT;
    this.alignmentWeight = CONFIG.ALIGNMENT_WEIGHT;
    this.avoidWeight = CONFIG.OBSTACLE_AVOID_WEIGHT;

    // Performance data
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;

    // Hover for hint
    this.hintTimer = 0;
    this.hintShowing = false;

    // Stars background
    this.stars = [];
    for (let i = 0; i < 100; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        r: 0.5 + Math.random() * 1.5,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.3 + Math.random() * 0.5,
      });
    }

    // Spawn initial boids
    this.spawnBoids(CONFIG.INITIAL_BOID_COUNT);

    // Set up UI bindings
    this._bindUI();
    this._bindCanvasInput();

    // Running state
    this.running = true;
    this.lastTime = 0;
  }

  // ─── Spawn helpers ───
  spawnBoids(count) {
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;
    for (let i = 0; i < count; i++) {
      this.boids.push(new Boid(
        Math.random() * w,
        Math.random() * h
      ));
    }
  }

  addBoid() {
    if (this.boids.length >= CONFIG.MAX_BOIDS) return;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;
    this.boids.push(new Boid(
      Math.random() * w,
      Math.random() * h
    ));
  }

  removeBoid() {
    if (this.boids.length <= CONFIG.MIN_BOIDS) return;
    this.boids.pop();
  }

  resetBoids() {
    this.boids = [];
    this.spawnBoids(CONFIG.INITIAL_BOID_COUNT);
    this.obstacles = [];
  }

  // ─── UI Binding ───
  _bindUI() {
    const s = (id) => document.getElementById(id);

    s('cohesionSlider').addEventListener('input', (e) => {
      this.cohesionWeight = parseFloat(e.target.value) / 100;
      s('cohesionVal').textContent = this.cohesionWeight.toFixed(2);
    });
    s('separationSlider').addEventListener('input', (e) => {
      this.separationWeight = parseFloat(e.target.value) / 100;
      s('separationVal').textContent = this.separationWeight.toFixed(2);
    });
    s('alignmentSlider').addEventListener('input', (e) => {
      this.alignmentWeight = parseFloat(e.target.value) / 100;
      s('alignmentVal').textContent = this.alignmentWeight.toFixed(2);
    });
    s('avoidSlider').addEventListener('input', (e) => {
      this.avoidWeight = parseFloat(e.target.value) / 100;
      s('avoidVal').textContent = this.avoidWeight.toFixed(2);
    });

    s('resetBtn').addEventListener('click', () => this.resetBoids());
    s('clearObstaclesBtn').addEventListener('click', () => {
      this.obstacles = [];
    });
    s('addBoidBtn').addEventListener('click', () => this.addBoid());
    s('removeBoidBtn').addEventListener('click', () => this.removeBoid());

    // Keyboard: N to toggle neighbor lines
    window.addEventListener('keydown', (e) => {
      if (e.code === 'KeyN') {
        this.showNeighbors = !this.showNeighbors;
      }
      if (e.code === 'KeyT') {
        this.boidTrails = !this.boidTrails;
      }
      if (e.code === 'Escape') {
        window.location.href = '../';
      }
    });
  }

  _bindCanvasInput() {
    // Left-click: add obstacle (only if not on a boid)
    this.canvas.addEventListener('mousedown', (e) => {
      if (e.button !== 0) return; // left click only
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      // Don't place obstacle on top of another
      for (const obs of this.obstacles) {
        if (obs.contains(mx, my)) return;
      }
      this.obstacles.push(new Obstacle(mx, my));
    });

    // Right-click: remove nearest obstacle
    this.canvas.addEventListener('contextmenu', (e) => {
      e.preventDefault();
      const rect = this.canvas.getBoundingClientRect();
      const scaleX = this.canvas.width / rect.width;
      const scaleY = this.canvas.height / rect.height;
      const mx = (e.clientX - rect.left) * scaleX;
      const my = (e.clientY - rect.top) * scaleY;

      let nearest = -1;
      let nearDist = Infinity;
      for (let i = 0; i < this.obstacles.length; i++) {
        const d = Math.sqrt(
          (this.obstacles[i].x - mx) ** 2 +
          (this.obstacles[i].y - my) ** 2
        );
        if (d < nearDist) {
          nearDist = d;
          nearest = i;
        }
      }
      if (nearest >= 0 && nearDist < 60) {
        this.obstacles.splice(nearest, 1);
      }
    });

    // Show hint on first click if no obstacles
    this.canvas.addEventListener('mouseenter', () => {
      const hint = document.getElementById('hint');
      if (hint) hint.classList.add('show');
      this.hintShowing = true;
    });
    this.canvas.addEventListener('mouseleave', () => {
      const hint = document.getElementById('hint');
      if (hint) hint.classList.remove('show');
      this.hintShowing = false;
    });
  }

  // ═══════════════════════════════════════
  //  STEERING BEHAVIORS
  // ═══════════════════════════════════════

  /** Steer toward the average position of nearby neighbors */
  _cohesion(boid) {
    let cx = 0, cy = 0;
    let count = 0;
    for (const other of this.boids) {
      if (other === boid) continue;
      const d = boid.distTo(other);
      if (d > 0 && d < CONFIG.BOID_PERCEPTION) {
        cx += other.x;
        cy += other.y;
        count++;
      }
    }
    if (count === 0) return [0, 0];
    cx /= count;
    cy /= count;
    // Desired velocity toward center
    const dx = cx - boid.x;
    const dy = cy - boid.y;
    const mag = Math.sqrt(dx * dx + dy * dy);
    if (mag < 1) return [0, 0];
    return [dx / mag * boid.maxSpeed - boid.vx, dy / mag * boid.maxSpeed - boid.vy];
  }

  /** Steer away from boids that are too close */
  _separation(boid) {
    let fx = 0, fy = 0;
    for (const other of this.boids) {
      if (other === boid) continue;
      const dx = boid.x - other.x;
      const dy = boid.y - other.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      if (d > 0 && d < CONFIG.BOID_SEPARATION_DIST) {
        // Weight inversely by distance (closer = stronger)
        const strength = (CONFIG.BOID_SEPARATION_DIST - d) / CONFIG.BOID_SEPARATION_DIST;
        fx += (dx / d) * strength;
        fy += (dy / d) * strength;
      }
    }
    const mag = Math.sqrt(fx * fx + fy * fy);
    if (mag < 0.01) return [0, 0];
    // Scale to max speed then convert to force
    return [
      fx / mag * boid.maxSpeed - boid.vx,
      fy / mag * boid.maxSpeed - boid.vy
    ];
  }

  /** Steer toward the average velocity of neighbors */
  _alignment(boid) {
    let avx = 0, avy = 0;
    let count = 0;
    for (const other of this.boids) {
      if (other === boid) continue;
      const d = boid.distTo(other);
      if (d > 0 && d < CONFIG.BOID_PERCEPTION) {
        avx += other.vx;
        avy += other.vy;
        count++;
      }
    }
    if (count === 0) return [0, 0];
    avx /= count;
    avy /= count;
    const mag = Math.sqrt(avx * avx + avy * avy);
    if (mag < 0.1) return [0, 0];
    return [
      avx / mag * boid.maxSpeed - boid.vx,
      avy / mag * boid.maxSpeed - boid.vy
    ];
  }

  /** Steer away from nearby obstacles */
  _obstacleAvoidance(boid) {
    let fx = 0, fy = 0;
    for (const obs of this.obstacles) {
      const dx = boid.x - obs.x;
      const dy = boid.y - obs.y;
      const d = Math.sqrt(dx * dx + dy * dy);
      const threatDist = obs.avoidRadius + obs.radius;
      if (d < threatDist && d > 0) {
        // Stronger avoidance when closer
        const t = 1 - d / threatDist;
        const strength = t * t; // quadratic falloff
        fx += (dx / d) * strength;
        fy += (dy / d) * strength;
      }
    }
    const mag = Math.sqrt(fx * fx + fy * fy);
    if (mag < 0.01) return [0, 0];
    return [
      fx / mag * boid.maxSpeed - boid.vx,
      fy / mag * boid.maxSpeed - boid.vy
    ];
  }

  // ─── Bounds steering (push boids toward center if they are at edge) ───
  _boundsSteering(boid) {
    const margin = 60;
    let fx = 0, fy = 0;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;
    if (boid.x < margin) fx = (margin - boid.x) / margin;
    if (boid.x > w - margin) fx = -(boid.x - (w - margin)) / margin;
    if (boid.y < margin) fy = (margin - boid.y) / margin;
    if (boid.y > h - margin) fy = -(boid.y - (h - margin)) / margin;
    const mag = Math.sqrt(fx * fx + fy * fy);
    if (mag < 0.01) return [0, 0];
    return [
      fx / mag * boid.maxSpeed * 0.5 - boid.vx,
      fy / mag * boid.maxSpeed * 0.5 - boid.vy
    ];
  }

  // ═══════════════════════════════════════
  //  GAME LOOP
  // ═══════════════════════════════════════
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

    // FPS count
    this.frameCount++;
    this.fpsTimer += rawDt;
    if (this.fpsTimer >= 1) {
      this.fps = Math.round(this.frameCount / this.fpsTimer);
      this.frameCount = 0;
      this.fpsTimer = 0;
    }

    if (this.running) {
      requestAnimationFrame((t) => this.loop(t));
    }
  }

  update(dt) {
    // Update stars
    for (const star of this.stars) {
      star.twinkle += dt * star.speed;
    }

    // Update each boid
    for (const boid of this.boids) {
      // Compute flocking forces
      const [cohX, cohY] = this._cohesion(boid);
      const [sepX, sepY] = this._separation(boid);
      const [aliX, aliY] = this._alignment(boid);
      const [avoX, avoY] = this._obstacleAvoidance(boid);
      const [bndX, bndY] = this._boundsSteering(boid);

      // Apply weighted forces
      boid.applyForce(
        cohX * this.cohesionWeight +
        sepX * this.separationWeight +
        aliX * this.alignmentWeight +
        avoX * this.avoidWeight +
        bndX * 1.0,
        cohY * this.cohesionWeight +
        sepY * this.separationWeight +
        aliY * this.alignmentWeight +
        avoY * this.avoidWeight +
        bndY * 1.0,
        dt
      );

      boid.update(dt);
    }
  }

  // ═══════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════
  render() {
    const ctx = this.ctx;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    // Background
    ctx.fillStyle = CONFIG.BG_COLOR;
    ctx.fillRect(0, 0, w, h);

    // Stars
    for (const star of this.stars) {
      const alpha = 0.3 + Math.sin(star.twinkle) * 0.2;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#c0c0e0';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Obstacles
    for (const obs of this.obstacles) {
      obs.render(ctx);
    }

    // Neighbor lines (toggle with N)
    if (this.showNeighbors) {
      for (const boid of this.boids) {
        for (const other of this.boids) {
          if (other === boid) continue;
          const d = boid.distTo(other);
          if (d < CONFIG.BOID_PERCEPTION) {
            ctx.save();
            ctx.strokeStyle = CONFIG.NEIGHBOR_LINE;
            ctx.lineWidth = 0.5;
            ctx.beginPath();
            ctx.moveTo(boid.x, boid.y);
            ctx.lineTo(other.x, other.y);
            ctx.stroke();
            ctx.restore();
          }
        }
      }
    }

    // Boids
    for (const boid of this.boids) {
      boid.render(ctx);
    }

    // HUD overlay
    this._renderHUD(ctx, w, h);
  }

  _renderHUD(ctx, w, h) {
    // Top bar
    ctx.fillStyle = CONFIG.HUD_BG;
    ctx.fillRect(0, 0, w, 48);

    ctx.font = CONFIG.FONT;
    ctx.fillStyle = CONFIG.TEXT_COLOR;
    ctx.textAlign = 'left';
    ctx.fillText(`Flocking · ${this.boids.length} boids · ${this.obstacles.length} obstacles · ${this.fps} fps`, 14, 20);

    ctx.textAlign = 'right';
    ctx.fillText('N:Neighbors | T:Trails | Click:Obstacle | R-Click:Remove | ESC:Back', w - 14, 20);

    // Weight display under sliders
    ctx.textAlign = 'left';
    ctx.font = CONFIG.FONT_SMALL;
    const col1 = '#4ecdc4';
    const col2 = '#ff6b6b';
    const col3 = '#ffd93d';
    const col4 = '#a78bfa';

    ctx.fillStyle = col1;
    ctx.fillText(`COH ${this.cohesionWeight.toFixed(2)}`, 14, 38);
    ctx.fillStyle = col2;
    ctx.fillText(`SEP ${this.separationWeight.toFixed(2)}`, 114, 38);
    ctx.fillStyle = col3;
    ctx.fillText(`ALI ${this.alignmentWeight.toFixed(2)}`, 214, 38);
    ctx.fillStyle = col4;
    ctx.fillText(`AVO ${this.avoidWeight.toFixed(2)}`, 314, 38);

    // Dark vignette edges
    const vignette = ctx.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, h * 0.7);
    vignette.addColorStop(0, 'rgba(0,0,0,0)');
    vignette.addColorStop(1, 'rgba(0,0,0,0.3)');
    ctx.fillStyle = vignette;
    ctx.fillRect(0, 0, w, h);
  }
}
