// js/pixi-backgrounds.js — PixiJS dynamic backgrounds for combat screens

const BG_CONFIGS = {
  xianqin: {
    // Bronze age: floating oracle bone characters, warm amber particles, ancient mist
    bgColor: 0x1a0e00,
    particles: { color: 0xc8861a, count: 30, speed: 0.3 },
    orbs: { color: 0xd4a017, count: 5, minR: 20, maxR: 60, alpha: 0.08 },
  },
  han: {
    // Han dynasty: red imperial glow, floating seal characters, crimson mist
    bgColor: 0x1a0000,
    particles: { color: 0xe03030, count: 25, speed: 0.4 },
    orbs: { color: 0xd63031, count: 4, minR: 25, maxR: 70, alpha: 0.1 },
  },
  tang: {
    // Tang dynasty: golden warmth, cherry blossom-like petals, moonlight
    bgColor: 0x0d0a00,
    particles: { color: 0xd4a017, count: 35, speed: 0.25 },
    orbs: { color: 0xf0c040, count: 6, minR: 15, maxR: 50, alpha: 0.06 },
  },
  song: {
    // Song dynasty: jade green, bamboo-like vertical lines, serene mist
    bgColor: 0x001a10,
    particles: { color: 0x2ecc8a, count: 20, speed: 0.2 },
    orbs: { color: 0x27ae60, count: 4, minR: 30, maxR: 80, alpha: 0.07 },
  },
  modern: {
    // Modern: purple void, swirling dark energy, lightning flashes
    bgColor: 0x0a0018,
    particles: { color: 0x8e44ad, count: 30, speed: 0.5 },
    orbs: { color: 0x9b59b6, count: 5, minR: 20, maxR: 70, alpha: 0.1 },
  },
};

let currentApp = null;

export function createCombatBackground(container, era = 'xianqin') {
  destroyCombatBackground();

  if (typeof PIXI === 'undefined') return null; // PixiJS not loaded

  const config = BG_CONFIGS[era] || BG_CONFIGS.xianqin;
  const width = container.offsetWidth || 800;
  const height = container.offsetHeight || 600;

  let app;
  try {
    app = new PIXI.Application({
      width, height,
      backgroundColor: config.bgColor,
      antialias: true,
      backgroundAlpha: 0.3,
    });
  } catch (e) {
    console.warn('[PixiBG] Failed to create PIXI app:', e.message);
    return null; // WebGL disabled or GPU issue
  }

  // Make canvas fill the container
  app.view.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;z-index:0;pointer-events:none;';
  container.insertBefore(app.view, container.firstChild);

  // Floating particles
  const particles = [];
  for (let i = 0; i < config.particles.count; i++) {
    const g = new PIXI.Graphics();
    const size = 1 + Math.random() * 3;
    g.beginFill(config.particles.color, 0.3 + Math.random() * 0.4);
    g.drawCircle(0, 0, size);
    g.endFill();
    g.x = Math.random() * width;
    g.y = Math.random() * height;
    g.vx = (Math.random() - 0.5) * config.particles.speed;
    g.vy = -(0.2 + Math.random() * config.particles.speed);
    app.stage.addChild(g);
    particles.push(g);
  }

  // Floating orbs (large, soft, slow-moving)
  const orbs = [];
  for (let i = 0; i < config.orbs.count; i++) {
    const g = new PIXI.Graphics();
    const r = config.orbs.minR + Math.random() * (config.orbs.maxR - config.orbs.minR);
    g.beginFill(config.orbs.color, config.orbs.alpha);
    g.drawCircle(0, 0, r);
    g.endFill();
    // Add blur filter for soft glow
    g.filters = [new PIXI.BlurFilter(r * 0.5)];
    g.x = Math.random() * width;
    g.y = Math.random() * height;
    g.vx = (Math.random() - 0.5) * 0.15;
    g.vy = (Math.random() - 0.5) * 0.15;
    g.baseAlpha = config.orbs.alpha;
    g.phase = Math.random() * Math.PI * 2;
    app.stage.addChild(g);
    orbs.push(g);
  }

  // Animation loop
  app.ticker.add((delta) => {
    // Update particles
    for (const p of particles) {
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      // Wrap around
      if (p.y < -10) { p.y = height + 10; p.x = Math.random() * width; }
      if (p.x < -10) p.x = width + 10;
      if (p.x > width + 10) p.x = -10;
    }

    // Update orbs (slow drift + alpha pulse)
    for (const o of orbs) {
      o.x += o.vx * delta;
      o.y += o.vy * delta;
      o.phase += 0.01 * delta;
      o.alpha = o.baseAlpha + Math.sin(o.phase) * o.baseAlpha * 0.5;

      // Soft bounce at edges
      if (o.x < -50 || o.x > width + 50) o.vx *= -1;
      if (o.y < -50 || o.y > height + 50) o.vy *= -1;
    }
  });

  currentApp = app;
  return app;
}

export function destroyCombatBackground() {
  if (currentApp) {
    try { currentApp.destroy(true); } catch(_) {}
    currentApp = null;
  }
}
