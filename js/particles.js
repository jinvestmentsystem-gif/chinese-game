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

    if (mode === 'combat' || mode === 'combat_gold' || mode === 'combat_red'
        || mode === 'combat_jade' || mode === 'combat_purple') {
      // Combat: fast upward sparks with era-specific colors
      this.vx = (Math.random() - 0.5) * 1.5;
      this.vy = -(0.5 + Math.random() * 2);
      this.size = 1.5 + Math.random() * 2.5;
      this.life = 0.5 + Math.random() * 0.5;
      this.maxLife = this.life;
      if (mode === 'combat_gold') {
        // Pre-Qin / Tang: bronze/gold sparks
        this.r = 190 + Math.random() * 55;
        this.g = 130 + Math.random() * 60;
        this.b = 15 + Math.random() * 40;
      } else if (mode === 'combat_red') {
        // Han: imperial red sparks
        this.r = 200 + Math.random() * 55;
        this.g = 30 + Math.random() * 50;
        this.b = 20 + Math.random() * 40;
      } else if (mode === 'combat_jade') {
        // Song: jade green sparks
        this.r = 20 + Math.random() * 50;
        this.g = 170 + Math.random() * 60;
        this.b = 80 + Math.random() * 70;
      } else if (mode === 'combat_purple') {
        // Modern: purple void sparks
        this.r = 120 + Math.random() * 60;
        this.g = 30 + Math.random() * 50;
        this.b = 150 + Math.random() * 80;
      } else {
        // Default combat: red/orange
        this.r = 220 + Math.random() * 35;
        this.g = 80 + Math.random() * 80;
        this.b = 20 + Math.random() * 30;
      }
    } else if (mode === 'boss' || mode === 'boss_gold' || mode === 'boss_red'
        || mode === 'boss_jade' || mode === 'boss_purple') {
      // Boss: swirling dark particles with era-specific colors
      const angle = Math.random() * Math.PI * 2;
      const speed = 0.3 + Math.random() * 1;
      this.vx = Math.cos(angle) * speed;
      this.vy = Math.sin(angle) * speed - 0.5;
      this.size = 2 + Math.random() * 4;
      this.life = 0.6 + Math.random() * 0.4;
      this.maxLife = this.life;
      if (mode === 'boss_gold') {
        // Pre-Qin / Tang: deep bronze/gold swirl
        this.r = 160 + Math.random() * 70;
        this.g = 100 + Math.random() * 60;
        this.b = 10 + Math.random() * 30;
      } else if (mode === 'boss_red') {
        // Han: deep imperial red swirl
        this.r = 160 + Math.random() * 80;
        this.g = 10 + Math.random() * 30;
        this.b = 15 + Math.random() * 30;
      } else if (mode === 'boss_jade') {
        // Song: deep jade green swirl
        this.r = 10 + Math.random() * 40;
        this.g = 140 + Math.random() * 70;
        this.b = 60 + Math.random() * 60;
      } else if (mode === 'boss_purple') {
        // Modern: deep purple void swirl
        this.r = 100 + Math.random() * 60;
        this.g = 15 + Math.random() * 40;
        this.b = 120 + Math.random() * 100;
      } else {
        // Default boss: purple/red
        this.r = 140 + Math.random() * 80;
        this.g = 20 + Math.random() * 40;
        this.b = 60 + Math.random() * 80;
      }
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

    // Slight gravity for combat/boss (including era-specific variants)
    if (currentMode.startsWith('combat')) this.vy -= 0.02;
    if (currentMode.startsWith('boss')) {
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
  combat: 50, combat_gold: 50, combat_red: 50, combat_jade: 50, combat_purple: 50,
  boss: 50, boss_gold: 50, boss_red: 50, boss_jade: 50, boss_purple: 50,
  victory: 50,
};

// Hard cap to prevent memory issues on mobile devices
const MAX_PARTICLES = 50;

let lastTime = 0;
let frameCount = 0;
let lastFpsCheck = 0;
let avgFps = 60;
let skipFrames = false; // Enable frame skipping when FPS drops below threshold

function animate(time) {
  if (!ctx || !canvas) return;
  const dt = Math.min((time - lastTime) / 1000, 0.1);
  lastTime = time;

  // FPS monitoring for adaptive frame skipping
  frameCount++;
  if (time - lastFpsCheck > 1000) {
    avgFps = frameCount;
    frameCount = 0;
    lastFpsCheck = time;
    // Enable frame skipping if FPS drops below 30 on low-end devices
    skipFrames = avgFps < 30;
  }

  // Frame skipping on low-FPS devices: only render every other frame
  if (skipFrames && frameCount % 2 !== 0) {
    animFrameId = requestAnimationFrame(animate);
    return;
  }

  ctx.clearRect(0, 0, canvas.width, canvas.height);

  // Spawn new particles to maintain count, respecting hard cap
  const target = Math.min(PARTICLE_COUNTS[currentMode] || 35, MAX_PARTICLES);
  while (particles.length < target) {
    particles.push(new Particle(currentMode));
  }

  // Update and draw
  particles = particles.filter(p => {
    const alive = p.update(dt);
    if (alive) p.draw();
    return alive;
  });

  // Enforce hard cap — trim excess particles (e.g. from burst effects)
  if (particles.length > MAX_PARTICLES) {
    particles = particles.slice(-MAX_PARTICLES);
  }

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
  const room = Math.max(0, MAX_PARTICLES - particles.length);
  const actual = Math.min(count, room);
  for (let i = 0; i < actual; i++) {
    particles.push(new Particle(mode));
  }
}

// ─── Color presets for burstAtPoint ──────────────────────────────────────────

const BURST_PRESETS = {
  gold:    { r: [210, 255], g: [160, 210], b: [10,  50]  },  // correct answers, gold pickup
  red:     { r: [200, 255], g: [30,  80],  b: [20,  60]  },  // wrong answers, enemy attacks
  purple:  { r: [120, 180], g: [20,  60],  b: [160, 220] },  // boss phase changes
  jade:    { r: [30,  80],  g: [180, 230], b: [80, 140]  },  // healing, level-up
  rainbow: null,  // special: random hue per particle
};

function randomInRange(min, max) {
  return min + Math.random() * (max - min);
}

/**
 * Burst particles at a specific screen coordinate.
 * Used for: crit effects, combo effects, level-up, gold pickup, etc.
 *
 * @param {number} x - Screen X coordinate (relative to canvas)
 * @param {number} y - Screen Y coordinate (relative to canvas)
 * @param {number} count - Number of particles to spawn
 * @param {string} color - Preset name: 'gold', 'red', 'purple', 'jade', 'rainbow'
 * @param {string} mode - Movement style: 'explode' (outward burst), 'fountain' (upward), 'swirl'
 */
export function burstAtPoint(x, y, count = 20, color = 'gold', mode = 'explode') {
  const preset = BURST_PRESETS[color];
  const room = Math.max(0, MAX_PARTICLES - particles.length);
  count = Math.min(count, room);

  for (let i = 0; i < count; i++) {
    const p = new Particle(mode || currentMode);

    // Override position to the specified point
    p.x = x + (Math.random() - 0.5) * 20;
    p.y = y + (Math.random() - 0.5) * 20;

    // Set color from preset
    if (color === 'rainbow') {
      // HSL-based rainbow: distribute hue evenly across particles
      const hue = (i / count) * 360 + Math.random() * 30;
      const [r, g, b] = hslToRgb(hue / 360, 0.8, 0.6);
      p.r = r; p.g = g; p.b = b;
    } else if (preset) {
      p.r = randomInRange(preset.r[0], preset.r[1]);
      p.g = randomInRange(preset.g[0], preset.g[1]);
      p.b = randomInRange(preset.b[0], preset.b[1]);
    }

    // Movement based on mode
    if (mode === 'explode') {
      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 4;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    } else if (mode === 'fountain') {
      p.vx = (Math.random() - 0.5) * 3;
      p.vy = -(2 + Math.random() * 5);
    } else if (mode === 'swirl') {
      const angle = (i / count) * Math.PI * 2;
      const speed = 1.5 + Math.random() * 2;
      p.vx = Math.cos(angle) * speed;
      p.vy = Math.sin(angle) * speed;
    }

    // Burst particles are larger and shorter-lived
    p.size = 2 + Math.random() * 4;
    p.life = 0.4 + Math.random() * 0.6;
    p.maxLife = p.life;

    particles.push(p);
  }
}

/**
 * Convert HSL (0-1 range) to RGB (0-255 range).
 */
function hslToRgb(h, s, l) {
  let r, g, b;
  if (s === 0) {
    r = g = b = l;
  } else {
    const hue2rgb = (p, q, t) => {
      if (t < 0) t += 1;
      if (t > 1) t -= 1;
      if (t < 1/6) return p + (q - p) * 6 * t;
      if (t < 1/2) return q;
      if (t < 2/3) return p + (q - p) * (2/3 - t) * 6;
      return p;
    };
    const q = l < 0.5 ? l * (1 + s) : l + s - l * s;
    const p = 2 * l - q;
    r = hue2rgb(p, q, h + 1/3);
    g = hue2rgb(p, q, h);
    b = hue2rgb(p, q, h - 1/3);
  }
  return [Math.round(r * 255), Math.round(g * 255), Math.round(b * 255)];
}

// ─── Pause/resume when page visibility changes ─────────────────────────────
// Prevents wasting CPU/battery when the tab is backgrounded
document.addEventListener('visibilitychange', () => {
  if (document.hidden) {
    stopParticles();
  } else {
    startParticles(currentMode);
  }
});

// Auto-start ambient particles
startParticles('ambient');
