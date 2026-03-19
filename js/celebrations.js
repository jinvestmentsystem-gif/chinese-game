// js/celebrations.js — Canvas-based confetti, fireworks, and sparkle effects
// Renders celebration overlays on a dedicated canvas above the game UI

let celebCanvas = null;
let celebCtx = null;
let celebParticles = [];
let celebAnimFrame = null;
let celebLastTime = 0;

function ensureCanvas() {
  if (celebCanvas) return true;
  celebCanvas = document.createElement('canvas');
  celebCanvas.id = 'celebration-canvas';
  celebCanvas.style.cssText = `
    position:fixed; inset:0; z-index:9990;
    pointer-events:none; width:100%; height:100%;
  `;
  document.body.appendChild(celebCanvas);
  celebCtx = celebCanvas.getContext('2d');
  resize();
  window.addEventListener('resize', resize);
  return true;
}

function resize() {
  if (!celebCanvas) return;
  celebCanvas.width = window.innerWidth;
  celebCanvas.height = window.innerHeight;
}

// ─── Confetti particle ──────────────────────────────────────────────────────

class ConfettiPiece {
  constructor(x, y, opts = {}) {
    this.x = x;
    this.y = y;
    this.w = 6 + Math.random() * 6;
    this.h = this.w * (0.4 + Math.random() * 0.3);
    this.vx = (Math.random() - 0.5) * (opts.spread || 8);
    this.vy = -(3 + Math.random() * (opts.force || 8));
    this.gravity = opts.gravity || 0.12;
    this.drag = 0.98;
    this.rotation = Math.random() * Math.PI * 2;
    this.rotSpeed = (Math.random() - 0.5) * 0.2;
    this.wobble = Math.random() * Math.PI * 2;
    this.wobbleSpeed = 0.05 + Math.random() * 0.08;
    this.life = 1.0;
    this.decay = 0.003 + Math.random() * 0.004;
    // Color from palette
    const colors = opts.colors || [
      '#d4a017', '#f5c842', '#e74c3c', '#2ecc8a',
      '#a855f7', '#3498db', '#e67e22', '#ff6b9d',
    ];
    this.color = colors[Math.floor(Math.random() * colors.length)];
    this.shape = Math.random() > 0.5 ? 'rect' : 'circle';
  }

  update(dt) {
    this.vy += this.gravity;
    this.vx *= this.drag;
    this.x += this.vx;
    this.y += this.vy;
    this.rotation += this.rotSpeed;
    this.wobble += this.wobbleSpeed;
    this.life -= this.decay;
    // Wobble sideways
    this.x += Math.sin(this.wobble) * 0.5;
    return this.life > 0 && this.y < (celebCanvas?.height || 2000) + 50;
  }

  draw(ctx) {
    ctx.save();
    ctx.globalAlpha = Math.max(0, this.life);
    ctx.translate(this.x, this.y);
    ctx.rotate(this.rotation);

    if (this.shape === 'rect') {
      ctx.fillStyle = this.color;
      ctx.fillRect(-this.w / 2, -this.h / 2, this.w, this.h);
    } else {
      ctx.beginPath();
      ctx.arc(0, 0, this.w / 2, 0, Math.PI * 2);
      ctx.fillStyle = this.color;
      ctx.fill();
    }
    ctx.restore();
  }
}

// ─── Firework spark ─────────────────────────────────────────────────────────

class FireworkSpark {
  constructor(x, y, color, opts = {}) {
    this.x = x;
    this.y = y;
    const angle = Math.random() * Math.PI * 2;
    const speed = 1.5 + Math.random() * (opts.speed || 5);
    this.vx = Math.cos(angle) * speed;
    this.vy = Math.sin(angle) * speed;
    this.gravity = 0.06;
    this.size = 1.5 + Math.random() * 2.5;
    this.life = 0.6 + Math.random() * 0.6;
    this.maxLife = this.life;
    this.color = color;
    this.trail = [];
    this.maxTrail = 4;
  }

  update(dt) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    this.vy += this.gravity;
    this.x += this.vx;
    this.y += this.vy;
    this.vx *= 0.97;
    this.life -= dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, this.life / this.maxLife);

    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const ta = alpha * (i / this.trail.length) * 0.4;
      ctx.beginPath();
      ctx.arc(t.x, t.y, this.size * 0.5, 0, Math.PI * 2);
      ctx.fillStyle = this.color.replace('1)', `${ta})`);
      ctx.fill();
    }

    // Main spark
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace('1)', `${alpha})`);
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size * 3, 0, Math.PI * 2);
    ctx.fillStyle = this.color.replace('1)', `${alpha * 0.15})`);
    ctx.fill();
  }
}

// ─── Rising firework (shoots up then explodes) ──────────────────────────────

class RisingFirework {
  constructor(x, targetY, color, onExplode) {
    this.x = x;
    this.y = celebCanvas?.height || 800;
    this.targetY = targetY;
    this.vy = -(6 + Math.random() * 4);
    this.color = color;
    this.size = 2;
    this.trail = [];
    this.maxTrail = 8;
    this.exploded = false;
    this.onExplode = onExplode;
  }

  update(dt) {
    this.trail.push({ x: this.x, y: this.y });
    if (this.trail.length > this.maxTrail) this.trail.shift();

    this.y += this.vy;
    this.vy *= 0.98;
    this.x += (Math.random() - 0.5) * 0.5;

    if (this.y <= this.targetY || this.vy > -1) {
      if (!this.exploded) {
        this.exploded = true;
        if (this.onExplode) this.onExplode(this.x, this.y);
      }
      return false;
    }
    return true;
  }

  draw(ctx) {
    // Trail
    for (let i = 0; i < this.trail.length; i++) {
      const t = this.trail[i];
      const a = (i / this.trail.length) * 0.5;
      ctx.beginPath();
      ctx.arc(t.x, t.y, 1.5, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,220,150,${a})`;
      ctx.fill();
    }

    // Head
    ctx.beginPath();
    ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
    ctx.fillStyle = '#fff';
    ctx.fill();

    // Glow
    ctx.beginPath();
    ctx.arc(this.x, this.y, 6, 0, Math.PI * 2);
    ctx.fillStyle = 'rgba(255,220,150,0.3)';
    ctx.fill();
  }
}

// ─── Sparkle (twinkling star) ───────────────────────────────────────────────

class Sparkle {
  constructor(x, y, color = '#fff') {
    this.x = x;
    this.y = y;
    this.size = 2 + Math.random() * 4;
    this.life = 0.4 + Math.random() * 0.8;
    this.maxLife = this.life;
    this.color = color;
    this.phase = Math.random() * Math.PI * 2;
    this.pulseSpeed = 5 + Math.random() * 8;
    this.vy = -(0.2 + Math.random() * 0.5);
  }

  update(dt) {
    this.y += this.vy;
    this.life -= dt;
    this.phase += this.pulseSpeed * dt;
    return this.life > 0;
  }

  draw(ctx) {
    const alpha = Math.max(0, (this.life / this.maxLife)) * (0.5 + 0.5 * Math.sin(this.phase));
    const s = this.size * (0.6 + 0.4 * Math.sin(this.phase));

    ctx.save();
    ctx.translate(this.x, this.y);
    ctx.globalAlpha = alpha;

    // 4-pointed star
    ctx.beginPath();
    ctx.moveTo(0, -s);
    ctx.lineTo(s * 0.2, -s * 0.2);
    ctx.lineTo(s, 0);
    ctx.lineTo(s * 0.2, s * 0.2);
    ctx.lineTo(0, s);
    ctx.lineTo(-s * 0.2, s * 0.2);
    ctx.lineTo(-s, 0);
    ctx.lineTo(-s * 0.2, -s * 0.2);
    ctx.closePath();
    ctx.fillStyle = this.color;
    ctx.fill();

    // Center glow
    ctx.beginPath();
    ctx.arc(0, 0, s * 2, 0, Math.PI * 2);
    ctx.fillStyle = this.color.includes('rgba') ? this.color : `rgba(255,255,255,${alpha * 0.12})`;
    ctx.fill();

    ctx.restore();
  }
}

// ─── Animation loop ─────────────────────────────────────────────────────────

function animateCelebration(time) {
  if (!celebCtx || !celebCanvas) return;
  const dt = Math.min((time - celebLastTime) / 1000, 0.05);
  celebLastTime = time;

  celebCtx.clearRect(0, 0, celebCanvas.width, celebCanvas.height);

  celebParticles = celebParticles.filter(p => {
    const alive = p.update(dt);
    if (alive) p.draw(celebCtx);
    return alive;
  });

  if (celebParticles.length > 0) {
    celebAnimFrame = requestAnimationFrame(animateCelebration);
  } else {
    celebAnimFrame = null;
  }
}

function startAnimation() {
  if (!celebAnimFrame) {
    celebLastTime = performance.now();
    celebAnimFrame = requestAnimationFrame(animateCelebration);
  }
}

// ─── Public API ─────────────────────────────────────────────────────────────

/**
 * Confetti cannon burst from a point or center of screen.
 * @param {object} opts - { x, y, count, colors, spread, force }
 */
export function confettiBurst(opts = {}) {
  ensureCanvas();
  const w = celebCanvas.width;
  const h = celebCanvas.height;
  const x = opts.x ?? w / 2;
  const y = opts.y ?? h * 0.3;
  const count = opts.count || 80;

  for (let i = 0; i < count; i++) {
    celebParticles.push(new ConfettiPiece(x, y, {
      colors: opts.colors,
      spread: opts.spread || 10,
      force: opts.force || 10,
      gravity: opts.gravity,
    }));
  }
  startAnimation();
}

/**
 * Side confetti cannons (left + right simultaneously).
 * @param {object} opts - { count, colors }
 */
export function confettiCannons(opts = {}) {
  ensureCanvas();
  const w = celebCanvas.width;
  const h = celebCanvas.height;
  const count = opts.count || 50;

  // Left cannon
  for (let i = 0; i < count; i++) {
    const p = new ConfettiPiece(0, h * 0.6, {
      colors: opts.colors,
      spread: 6,
      force: 12,
    });
    p.vx = Math.abs(p.vx) + 2; // Force rightward
    celebParticles.push(p);
  }
  // Right cannon
  for (let i = 0; i < count; i++) {
    const p = new ConfettiPiece(w, h * 0.6, {
      colors: opts.colors,
      spread: 6,
      force: 12,
    });
    p.vx = -Math.abs(p.vx) - 2; // Force leftward
    celebParticles.push(p);
  }
  startAnimation();
}

/**
 * Firework explosion at a point.
 * @param {number} x
 * @param {number} y
 * @param {object} opts - { count, color }
 */
export function fireworkExplode(x, y, opts = {}) {
  ensureCanvas();
  const count = opts.count || 40;
  const hue = opts.hue ?? Math.random() * 360;
  const color = opts.color || `hsla(${hue}, 80%, 60%, 1)`;

  for (let i = 0; i < count; i++) {
    celebParticles.push(new FireworkSpark(x, y, color, { speed: opts.speed }));
  }
  startAnimation();
}

/**
 * Launch a rising firework that explodes at a target height.
 * @param {object} opts - { x, targetY, hue }
 */
export function fireworkLaunch(opts = {}) {
  ensureCanvas();
  const w = celebCanvas.width;
  const h = celebCanvas.height;
  const x = opts.x ?? (w * 0.2 + Math.random() * w * 0.6);
  const targetY = opts.targetY ?? (h * 0.15 + Math.random() * h * 0.25);
  const hue = opts.hue ?? Math.random() * 360;
  const color = `hsla(${hue}, 80%, 60%, 1)`;

  celebParticles.push(new RisingFirework(x, targetY, color, (ex, ey) => {
    fireworkExplode(ex, ey, { count: 35, color });
  }));
  startAnimation();
}

/**
 * Launch a firework show (multiple fireworks with staggered timing).
 * @param {object} opts - { count, interval, duration }
 */
export function fireworkShow(opts = {}) {
  const count = opts.count || 8;
  const interval = opts.interval || 400;

  for (let i = 0; i < count; i++) {
    setTimeout(() => fireworkLaunch(), i * interval);
  }
}

/**
 * Spawn twinkling sparkles across a region.
 * @param {object} opts - { x, y, width, height, count, color }
 */
export function sparkleRegion(opts = {}) {
  ensureCanvas();
  const w = celebCanvas.width;
  const h = celebCanvas.height;
  const rx = opts.x ?? 0;
  const ry = opts.y ?? 0;
  const rw = opts.width ?? w;
  const rh = opts.height ?? h;
  const count = opts.count || 20;
  const color = opts.color || '#d4a017';

  for (let i = 0; i < count; i++) {
    celebParticles.push(new Sparkle(
      rx + Math.random() * rw,
      ry + Math.random() * rh,
      color
    ));
  }
  startAnimation();
}

/**
 * Golden rain — gold sparkles falling from the top of the screen.
 * @param {object} opts - { count, duration }
 */
export function goldenRain(opts = {}) {
  ensureCanvas();
  const w = celebCanvas.width;
  const count = opts.count || 30;
  const duration = opts.duration || 3000;
  const interval = duration / count;

  for (let i = 0; i < count; i++) {
    setTimeout(() => {
      if (!celebCanvas) return;
      const x = Math.random() * w;
      const p = new ConfettiPiece(x, -10, {
        colors: ['#d4a017', '#f5c842', '#ffd700', '#daa520', '#b8860b'],
        spread: 2,
        force: 0,
        gravity: 0.04 + Math.random() * 0.04,
      });
      p.vy = 0.5 + Math.random() * 1.5;
      p.vx = (Math.random() - 0.5) * 1;
      p.decay = 0.002;
      celebParticles.push(p);
      startAnimation();
    }, i * interval);
  }
}

/**
 * Level-up celebration sequence — combines multiple effects.
 */
export function levelUpCelebration() {
  confettiBurst({ count: 60, force: 12, colors: ['#d4a017', '#f5c842', '#2ecc8a', '#a855f7'] });
  setTimeout(() => sparkleRegion({ count: 15, color: '#d4a017' }), 300);
  setTimeout(() => confettiCannons({ count: 30, colors: ['#d4a017', '#2ecc8a'] }), 600);
}

/**
 * Chapter complete celebration — full fireworks show.
 */
export function chapterCompleteCelebration() {
  confettiBurst({ count: 100, force: 14 });
  setTimeout(() => fireworkShow({ count: 6, interval: 500 }), 500);
  setTimeout(() => confettiCannons({ count: 60 }), 2000);
  setTimeout(() => goldenRain({ count: 40, duration: 4000 }), 3000);
}

/**
 * Victory celebration — moderate confetti + sparkles.
 */
export function victoryCelebration() {
  confettiBurst({ count: 50, force: 8 });
  setTimeout(() => sparkleRegion({ count: 20, color: '#d4a017' }), 400);
}

/**
 * Perfect score celebration — rainbow confetti + fireworks.
 */
export function perfectScoreCelebration() {
  confettiBurst({
    count: 120,
    force: 14,
    colors: ['#ff0000', '#ff7700', '#ffff00', '#00ff00', '#0077ff', '#8800ff', '#ff00ff'],
  });
  setTimeout(() => fireworkShow({ count: 5, interval: 300 }), 300);
  setTimeout(() => goldenRain({ count: 50, duration: 3000 }), 1500);
}

/**
 * Clean up the celebration canvas.
 */
export function cleanupCelebrations() {
  if (celebAnimFrame) {
    cancelAnimationFrame(celebAnimFrame);
    celebAnimFrame = null;
  }
  celebParticles = [];
  if (celebCanvas) {
    if (celebCtx) celebCtx.clearRect(0, 0, celebCanvas.width, celebCanvas.height);
    window.removeEventListener('resize', resize);
    celebCanvas.remove();
    celebCanvas = null;
    celebCtx = null;
  }
}
