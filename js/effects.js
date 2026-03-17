// js/effects.js — Reusable visual effects (screen shake, flash, floating text, ripple)
// Consolidates duplicated animation helpers from combat.js and boss.js

// ─── Screen / element shake ──────────────────────────────────────────────────

/**
 * Shake an element horizontally (for individual UI elements like HP bars).
 */
export function shakeElement(el, intensity = 6, duration = 400) {
  if (!el) return;
  let start = null;
  const period = 50;
  function step(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    if (elapsed >= duration) { el.style.transform = ''; return; }
    const dir = (Math.floor(elapsed / period) % 2 === 0) ? intensity : -intensity;
    el.style.transform = `translateX(${dir}px)`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Shake the whole screen container in both X and Y axes (heavier shake for boss hits etc).
 */
export function shakeScreen(intensity = 6, duration = 400) {
  const root = document.getElementById('game-root');
  if (!root) return;
  let start = null;
  const period = 40;
  function step(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    if (elapsed >= duration) { root.style.transform = ''; return; }
    const dx = (Math.floor(elapsed / period) % 2 === 0) ? intensity : -intensity;
    const dy = (Math.floor(elapsed / period) % 3 === 0) ? intensity / 2 : -intensity / 2;
    root.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

/**
 * Shake an arbitrary container element in both X and Y axes.
 * Same as shakeScreen but targets a provided element instead of #game-root.
 */
export function shakeContainer(container, intensity = 6, duration = 400) {
  if (!container) return;
  let start = null;
  const period = 40;
  function step(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    if (elapsed >= duration) { container.style.transform = ''; return; }
    const dx = (Math.floor(elapsed / period) % 2 === 0) ? intensity : -intensity;
    const dy = (Math.floor(elapsed / period) % 3 === 0) ? intensity / 2 : -intensity / 2;
    container.style.transform = `translate(${dx}px, ${dy}px)`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

// ─── Screen flash overlay ────────────────────────────────────────────────────

/**
 * Brief color flash overlay on a container element.
 * @param {string} color - CSS color for the flash (e.g. '#fff', '#c0392b', '#d4a017')
 * @param {number} duration - Total duration in ms
 * @param {HTMLElement|null} container - Element to append overlay to; defaults to #game-root
 */
export function screenFlash(color = '#fff', duration = 200, container = null) {
  const target = container || document.getElementById('game-root');
  if (!target) return;
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute; inset:0; background:${color};
    opacity:0; pointer-events:none; z-index:997;
    transition: opacity ${Math.round(duration * 0.3)}ms ease-in;
  `;
  target.appendChild(overlay);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { overlay.style.opacity = '0.35'; });
  });
  setTimeout(() => {
    overlay.style.transition = `opacity ${Math.round(duration * 0.7)}ms ease-out`;
    overlay.style.opacity = '0';
  }, Math.round(duration * 0.3));
  setTimeout(() => overlay.remove(), duration + 100);
}

// ─── Floating text (damage numbers, heal, combo, etc.) ──────────────────────

/**
 * Show a floating text that drifts upward and fades out.
 * @param {HTMLElement} container - Parent element for positioning
 * @param {string} text - Text content
 * @param {number} x - Left position (px, relative to container)
 * @param {number} y - Top position (px, relative to container)
 * @param {object} options - { color, fontSize, duration, direction }
 */
export function floatingText(container, text, x, y, options = {}) {
  const {
    color = '#fff',
    fontSize = '1.8rem',
    duration = 900,
    direction = 'up', // 'up' | 'down'
  } = options;

  const drift = direction === 'down' ? Math.round(duration * 0.08) : -Math.round(duration * 0.08);

  const el = document.createElement('div');
  el.textContent = text;
  el.style.cssText = `
    position:absolute; left:${x}px; top:${y}px;
    color:${color}; font-size:${fontSize}; font-weight:900;
    text-shadow: 0 0 10px ${color}, 2px 2px 0 #000;
    pointer-events:none; z-index:999;
    transform:translateY(0) scale(1); opacity:1;
    transition: transform ${duration}ms ease-out, opacity ${duration}ms ease-out;
  `;
  container.appendChild(el);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transform = `translateY(${drift}px) scale(1.15)`;
      el.style.opacity = '0';
    });
  });
  setTimeout(() => el.remove(), duration + 100);
}

// ─── Ripple / expanding ring ─────────────────────────────────────────────────

/**
 * Show an expanding ring effect at a point.
 * @param {HTMLElement} container - Parent element
 * @param {number} x - Center X (px, relative to container)
 * @param {number} y - Center Y (px, relative to container)
 * @param {string} color - CSS color
 */
export function rippleEffect(container, x, y, color = '#d4a017') {
  const ring = document.createElement('div');
  ring.style.cssText = `
    position:absolute;
    left:${x}px; top:${y}px;
    width:0; height:0;
    border: 3px solid ${color};
    border-radius:50%;
    transform:translate(-50%,-50%);
    pointer-events:none; z-index:998;
    opacity:1;
    transition: width 0.5s ease-out, height 0.5s ease-out, opacity 0.5s ease-out;
  `;
  container.appendChild(ring);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      ring.style.width = '120px';
      ring.style.height = '120px';
      ring.style.opacity = '0';
    });
  });
  setTimeout(() => ring.remove(), 600);
}

// ─── Lunge animation ─────────────────────────────────────────────────────────

/**
 * Lunge an element forward then snap back.
 * @param {HTMLElement} el - Element to lunge
 * @param {number} dx - Pixels to translate on X axis (positive = right)
 * @param {number} duration - One-way duration in ms
 * @param {function|null} onDone - Callback after return
 */
export function lungeElement(el, dx, duration = 200, onDone) {
  if (!el) return;
  el.style.transition = `transform ${duration}ms ease-out`;
  el.style.transform = `translateX(${dx}px)`;
  setTimeout(() => {
    el.style.transition = `transform ${duration}ms ease-in`;
    el.style.transform = '';
    if (onDone) setTimeout(onDone, duration);
  }, duration);
}

// ─── Slash line effect ───────────────────────────────────────────────────────

/**
 * Draw a quick slash line that fades out (for combat hits).
 */
export function slashEffect(container, x1, y1, x2, y2, color = '#fff') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    pointer-events:none; z-index:998;
  `;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '4');
  line.setAttribute('stroke-linecap', 'round');
  line.style.opacity = '1';
  svg.appendChild(line);
  container.appendChild(svg);
  setTimeout(() => { svg.style.transition = 'opacity 0.15s'; svg.style.opacity = '0'; }, 100);
  setTimeout(() => svg.remove(), 300);
}
