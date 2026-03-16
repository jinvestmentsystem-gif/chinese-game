// js/particles.js — Canvas-based particle system for atmospheric backgrounds
// Renders floating ink particles, energy sparks, and ambient effects behind the game UI

const canvas = document.getElementById('particle-canvas');
const ctx = canvas ? canvas.getContext('2d') : null;

let particles = [];
let animFrameId = null;
let currentMode = 'ambient'; // 'ambient', 'combat', 'boss', 'victory'
let targetColor = { r: 212, g: 160, b: 23 }; // Gold default

// Resize canvas to fill window
function resize() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
}
window.addEventListener('resize', resize);
resize();

class Particle {
  constructor(mode) {
    this.reset(mode);
  }

  reset(mode) {
    const w = canvas?.width || 1280;
    const h = canvas?.height || 720;

    this.x = Math.random() * w;
    this.y = Math.random() * h;
    this.size = 1 + Math.random() * 3;

    if (mode === 'combat') {
      // Combat: fast upward sparks, red/orange
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = -(0.5 + Math.random() * 2);
      this.size = 1.5 + Math.random() * 2.5;
      this.life = 0.5 + Math.random() * 0.5;
      this.maxLife = this.life;
      this.r = 220 + Math.random() * 35;
      this.g = 80 + Math.random() * 80;
      this.b = 20 + Math.random() * 30;
    } else if (mode === 'boss') {
      // Boss: swirling dark particles, purple/red
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 0.5;
      this.size = 2 + Math.random() * 4;
      this.life = 0.6 + Math.random() * 0.4;
      this.maxLife = this.life;
      this.r = 140 + Math.random() * 80;
      this.g = 20 + Math.random() * 40;
      this.b = 60 + Math.random() * 80;
    } else if (mode === 'victory') {
      // Victory: golden sparkle burst
      const angle = Math.random() * Math.PI * 2;
      const speed = 1 + Math.random() * 3;
      this.x = w / 2 + (Math.random() - 0.5) * 200;
      this.y = h / 2 + (Math.random() - 0.5) * 200;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 1;
      this.size = 2 + Math.random() * 4;
      this.life = 0.3 + Math.random() * 0.7;
      this.maxLife = this.life;
      this.r = 220 + Math.random() * 35;
      this.g = 170 + Math.random() * 60;
      this.b = 20 + Math.random() * 40;
    } else {
      // Ambient: gentle floating motes, gold/jade
      this.vx = (Math.random() - 0.5) * 0.3;
      this.vy = -(0.1 + Math.random() * 0.4);
      this.life = 0.3 + Math.random() * 0.7;
      this.maxLife = this.life;
      const palette = Math.random();
      if (palette < 0.5) {
        // Gold
        this.r = 200 + Math.random() * 55;
        this.g = 150 + Math.random() * 60;
        this.b = 10 + Math.random() * 30;
      } else if (palette < 0.8) {
        // Jade
        this.r = 30 + Math.random() * 40;
        this.g = 180 + Math.random() * 50;
        this.b = 80 + Math.random() * 60;
      } else {
        // White
        this.r = 200 + Math.random() * 55;
        this.g = 200 + Math.random() * 55;
        this.b = 200 + Math.random() * 55;
      }
    }
  }

  update(dt) {
    this.x += this.vx;
    this.y += this.vy;
    this.life -= dt;

    // Slight gravity for combat/boss
    if (currentMode === 'combat') this.vy -= 0.02;
    if (currentMode === 'boss') {
      // Swirl effect
      this.vx += (Math.random() - 0.5) * 0.05;
      this.vy += (Math.random() - 0.5) * 0.05;
    }

    return this.life > 0;
  }

  draw() {
    if (!ctx) return;
    const alpha = Math.max(0, (this.life / this.maxLife) * 0.6);
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = `rgba(${Math.round(this.r)},${Math.round(this.g)},${Math.round(this.b)},${alpha})`;
    ctx.fill();

    // Glow effect for larger particles
    if (this.size > 2) {
      ctx.beginPath();
      ctx.arc(this.x, this.y, this.size * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${Math.round(this.r)},${Math.round(this.g)},${Math.round(this.b)},${alpha * 0.15})`;
      ctx.fill();
    }
  }
}

const PARTICLE_COUNTS = {
  ambient: 35,
  combat: 50,
  boss: 60,
  victory: 80,
};

let lastTime = 0;

function animate(time) {
  if (!ctx || !canvas) return;
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spawn new particles to maintain count
  const target = PARTICLE_COUNTS[currentMode] || 35;
  while (particles.length < target) {
    particles.push(new Particle(currentMode));
  }

  // Update and draw
  particles = particles.filter(p => {
    const alive = p.update(dt);
    if (alive) p.draw();
    return alive;
  });

  animFrameId = requestAnimationFrame(animate);
}

// Public API
export function startParticles(mode = 'ambient') {
  currentMode = mode;
  particles = [];
  // Seed initial particles
  for (let i = 0; i < (PARTICLE_COUNTS[mode] || 35); i++) {
    const p = new Particle(mode);
    p.life = Math.random() * p.maxLife; // Spread out initial lifetimes
    particles.push(p);
  }
  if (!animFrameId) {
    lastTime = performance.now();
    animFrameId = requestAnimationFrame(animate);
  }
}

export function setParticleMode(mode) {
  currentMode = mode;
}

export function stopParticles() {
  if (animFrameId) {
    cancelAnimationFrame(animFrameId);
    animFrameId = null;
  }
  if (ctx && canvas) ctx.clearRect(0, 0, canvas.width, canvas.height);
  particles = [];
}

export function burstParticles(count = 30, mode = 'victory') {
  for (let i = 0; i < count; i++) {
    particles.push(new Particle(mode));
  }
}

// Auto-start ambient particles
startParticles('ambient');
