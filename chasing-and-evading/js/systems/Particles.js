// Particles.js — Simple particle system
export class Particle {
  constructor(x, y, vx, vy, color, life, size) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.color = color;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.dead = false;
  }

  update(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    this.life -= dt;
    if (this.life <= 0) this.dead = true;
  }

  render(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);
    ctx.save();
    ctx.globalAlpha = alpha;
    ctx.fillStyle = this.color;
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
}

export class ParticleSystem {
  constructor() {
    this.particles = [];
  }

  explode(x, y, count, speed, life, colors) {
    for (let i = 0; i < count; i++) {
      const angle = (Math.PI * 2 / count) * i + Math.random() * 0.3;
      const spd = speed * (0.5 + Math.random() * 0.5);
      const vx = Math.cos(angle) * spd;
      const vy = Math.sin(angle) * spd;
      const color = colors[Math.floor(Math.random() * colors.length)];
      this.particles.push(new Particle(x, y, vx, vy, color, life * (0.7 + Math.random() * 0.3), 2 + Math.random() * 3));
    }
  }

  trail(x, y, color, size) {
    if (Math.random() < 0.3) return; // sparse trail
    const vx = (Math.random() - 0.5) * 10;
    const vy = (Math.random() - 0.5) * 10;
    this.particles.push(new Particle(x, y, vx, vy, color, 0.4, size));
  }

  update(dt) {
    for (const p of this.particles) {
      p.update(dt);
    }
    this.particles = this.particles.filter(p => !p.dead);
  }

  render(ctx) {
    for (const p of this.particles) {
      p.render(ctx);
    }
  }
}
