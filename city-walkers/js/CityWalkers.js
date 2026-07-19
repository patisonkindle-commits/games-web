// CityWalkers.js — Main simulation class
import { CONFIG } from './config.js';
import { City } from './entities/City.js';
import { Citizen } from './entities/Citizen.js';

export class CityWalkers {
  constructor(canvas) {
    this.canvas = canvas;
    this.ctx = canvas.getContext('2d');
    this.canvas.width = CONFIG.CANVAS_WIDTH;
    this.canvas.height = CONFIG.CANVAS_HEIGHT;

    this.city = new City();
    this.citizens = [];

    // Weights (from sliders)
    this.cohesionWeight = CONFIG.COHESION;
    this.separationWeight = CONFIG.SEPARATION;
    this.alignmentWeight = CONFIG.ALIGNMENT;
    this.walkerSpeed = CONFIG.WALKER_SPEED;

    // Spawn initial population
    this._spawnPopulation(CONFIG.INITIAL_POP);

    // Stars
    this.stars = [];
    for (let i = 0; i < 60; i++) {
      this.stars.push({
        x: Math.random() * CONFIG.CANVAS_WIDTH,
        y: Math.random() * CONFIG.CANVAS_HEIGHT,
        r: 0.3 + Math.random() * 1,
        twinkle: Math.random() * Math.PI * 2,
        speed: 0.2 + Math.random() * 0.5,
      });
    }

    // FPS
    this.fps = 0;
    this.frameCount = 0;
    this.fpsTimer = 0;

    // UI
    this._bindUI();

    this.running = true;
    this.lastTime = 0;
  }

  _spawnPopulation(count) {
    this.citizens = [];
    for (let i = 0; i < count; i++) {
      const pos = this.city.randomSidewalkPos();
      const path = this.city.generatePath(4 + Math.floor(Math.random() * 4));
      this.citizens.push(new Citizen(pos.x, pos.y, path));
    }
  }

  _bindUI() {
    const $ = (id) => document.getElementById(id);

    $('cohesionSlider').addEventListener('input', (e) => {
      this.cohesionWeight = parseFloat(e.target.value) / 100;
      $('cohesionVal').textContent = this.cohesionWeight.toFixed(2);
    });
    $('separationSlider').addEventListener('input', (e) => {
      this.separationWeight = parseFloat(e.target.value) / 100;
      $('separationVal').textContent = this.separationWeight.toFixed(2);
    });
    $('alignmentSlider').addEventListener('input', (e) => {
      this.alignmentWeight = parseFloat(e.target.value) / 100;
      $('alignmentVal').textContent = this.alignmentWeight.toFixed(2);
    });
    $('speedSlider').addEventListener('input', (e) => {
      const v = parseInt(e.target.value);
      this.walkerSpeed = v;
      $('speedVal').textContent = v;
      // Update all citizen speeds
      for (const c of this.citizens) {
        c.maxSpeed = v * (0.8 + Math.random() * 0.4);
      }
    });
    $('populationSlider').addEventListener('input', (e) => {
      const target = parseInt(e.target.value);
      $('populationVal').textContent = target;
      while (this.citizens.length < target) {
        const pos = this.city.randomSidewalkPos();
        const path = this.city.generatePath(4 + Math.floor(Math.random() * 4));
        this.citizens.push(new Citizen(pos.x, pos.y, path));
      }
      while (this.citizens.length > target) {
        this.citizens.pop();
      }
    });
    $('resetBtn').addEventListener('click', () => {
      this._spawnPopulation(parseInt($('populationSlider').value));
    });

    window.addEventListener('keydown', (e) => {
      if (e.code === 'Escape') {
        window.location.href = '../';
      }
    });
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
    // Stars
    for (const star of this.stars) {
      star.twinkle += dt * star.speed;
    }

    // Update citizens
    const all = this.citizens;
    for (const c of all) {
      const nearby = c.getNearby(all);
      c.steer(this.cohesionWeight, this.separationWeight, this.alignmentWeight, nearby);
      c.move(dt);
      c.update(dt);

      // Wrap around edges (teleport to opposite sidewalk)
      this._wrapCitizen(c);
    }
  }

  /** Teleport citizen to opposite sidewalk if they wander off-canvas */
  _wrapCitizen(c) {
    const margin = 20;
    let wrapped = false;
    if (c.x < -margin) { c.x = CONFIG.CANVAS_WIDTH + margin; wrapped = true; }
    else if (c.x > CONFIG.CANVAS_WIDTH + margin) { c.x = -margin; wrapped = true; }
    if (c.y < -margin) { c.y = CONFIG.CANVAS_HEIGHT + margin; wrapped = true; }
    else if (c.y > CONFIG.CANVAS_HEIGHT + margin) { c.y = -margin; wrapped = true; }

    if (wrapped) {
      // Give them a new path
      c.path = this.city.generatePath(4 + Math.floor(Math.random() * 4));
      c.pathIndex = 0;
    }
  }

  // ═══════════════════════════════════════
  //  RENDER
  // ═══════════════════════════════════════
  render() {
    const ctx = this.ctx;
    const w = CONFIG.CANVAS_WIDTH;
    const h = CONFIG.CANVAS_HEIGHT;

    // City background
    this.city.render(ctx);

    // Stars as ambient light dots
    for (const star of this.stars) {
      const alpha = 0.15 + Math.sin(star.twinkle) * 0.1;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.fillStyle = '#c0c0e0';
      ctx.beginPath();
      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Citizens
    for (const c of this.citizens) {
      c.render(ctx);
    }

    // HUD
    ctx.fillStyle = 'rgba(0,0,0,0.5)';
    ctx.fillRect(0, 0, w, 46);

    ctx.font = CONFIG.FONT;
    ctx.fillStyle = '#e0e0e0';
    ctx.textAlign = 'left';
    ctx.fillText(
      `🚶 City Walkers · ${this.citizens.length} citizens · ${this.fps} fps`,
      12, 18
    );
    ctx.textAlign = 'right';
    ctx.fillText('ESC: Back', w - 12, 18);

    // Weight display
    ctx.font = CONFIG.FONT_SMALL;
    ctx.textAlign = 'left';
    ctx.fillStyle = '#4ecdc4';
    ctx.fillText(`COH ${this.cohesionWeight.toFixed(2)}`, 12, 36);
    ctx.fillStyle = '#ff6b6b';
    ctx.fillText(`SEP ${this.separationWeight.toFixed(2)}`, 100, 36);
    ctx.fillStyle = '#ffd93d';
    ctx.fillText(`ALI ${this.alignmentWeight.toFixed(2)}`, 188, 36);
    ctx.fillStyle = '#a78bfa';
    ctx.fillText(`SPD ${this.walkerSpeed}`, 276, 36);
    ctx.fillStyle = '#f472b6';
    ctx.fillText(`POP ${this.citizens.length}`, 356, 36);
  }
}
