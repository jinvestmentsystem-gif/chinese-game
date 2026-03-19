// js/celebrations-ui.js — Centralized celebration/notification system
// Tier 1: Toast — non-blocking, 2-3s
// Tier 2: Banner — slides from top, 2-3s, semi-blocking
// Tier 3: Fullscreen — blocking with dismiss button

let _styleInjected = false;

function _injectStyles() {
  if (_styleInjected) return;
  _styleInjected = true;
  const style = document.createElement('style');
  style.id = 'celeb-ui-styles';
  style.textContent = `
    @keyframes celeb-toast-in {
      from { opacity: 0; transform: translateY(-20px) scale(0.9); }
      to   { opacity: 1; transform: translateY(0) scale(1); }
    }
    @keyframes celeb-toast-out {
      from { opacity: 1; transform: translateY(0) scale(1); }
      to   { opacity: 0; transform: translateY(-20px) scale(0.9); }
    }
    @keyframes celeb-banner-in {
      from { transform: translateY(-100%); opacity: 0; }
      to   { transform: translateY(0); opacity: 1; }
    }
    @keyframes celeb-banner-out {
      from { transform: translateY(0); opacity: 1; }
      to   { transform: translateY(-100%); opacity: 0; }
    }
    @keyframes celeb-fullscreen-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes celeb-scale-in {
      from { transform: scale(0.5); opacity: 0; }
      to   { transform: scale(1); opacity: 1; }
    }

    .celeb-toast {
      position: fixed; top: 60px; left: 50%; transform: translateX(-50%);
      z-index: 10010; padding: 10px 24px; border-radius: 10px;
      background: rgba(15,15,25,0.92); border: 1.5px solid var(--accent-gold, #d4a017);
      color: var(--accent-gold, #d4a017); font-size: 0.95rem; font-weight: 700;
      backdrop-filter: blur(8px); pointer-events: none;
      animation: celeb-toast-in 0.35s ease-out;
      white-space: nowrap; text-align: center;
    }
    .celeb-toast.out { animation: celeb-toast-out 0.3s ease-in forwards; }

    .celeb-banner {
      position: fixed; top: 0; left: 0; right: 0; z-index: 10020;
      padding: 14px 20px; text-align: center;
      background: linear-gradient(135deg, rgba(15,15,25,0.95), rgba(30,25,50,0.95));
      border-bottom: 2px solid var(--accent-gold, #d4a017);
      backdrop-filter: blur(12px);
      animation: celeb-banner-in 0.4s ease-out;
    }
    .celeb-banner.out { animation: celeb-banner-out 0.35s ease-in forwards; }
    .celeb-banner-title {
      color: var(--accent-gold, #d4a017); font-size: 1.15rem; font-weight: 800;
      letter-spacing: 0.05em;
    }
    .celeb-banner-sub {
      color: rgba(255,255,255,0.7); font-size: 0.85rem; margin-top: 2px;
    }

    .celeb-fullscreen-overlay {
      position: fixed; inset: 0; z-index: 10030;
      display: flex; align-items: center; justify-content: center;
      background: rgba(5,5,15,0.88); backdrop-filter: blur(6px);
      animation: celeb-fullscreen-in 0.4s ease-out;
    }
    .celeb-fullscreen-card {
      text-align: center; padding: 40px 32px; max-width: 360px;
      background: rgba(20,20,35,0.95); border: 2px solid var(--accent-gold, #d4a017);
      border-radius: 16px; animation: celeb-scale-in 0.5s ease-out;
    }
    .celeb-fullscreen-title {
      color: var(--accent-gold, #d4a017); font-size: 1.6rem; font-weight: 900;
      margin-bottom: 8px;
    }
    .celeb-fullscreen-sub {
      color: rgba(255,255,255,0.75); font-size: 1rem; margin-bottom: 24px;
      line-height: 1.5;
    }
    .celeb-fullscreen-btn {
      display: inline-block; padding: 10px 32px; border: 1.5px solid var(--accent-gold, #d4a017);
      border-radius: 8px; color: var(--accent-gold, #d4a017); background: transparent;
      font-size: 1rem; font-weight: 700; cursor: pointer;
      transition: background 0.2s, color 0.2s;
    }
    .celeb-fullscreen-btn:hover {
      background: var(--accent-gold, #d4a017); color: #0b0c1a;
    }

    @media (prefers-reduced-motion: reduce) {
      .celeb-toast, .celeb-banner, .celeb-fullscreen-overlay, .celeb-fullscreen-card {
        animation: none !important;
      }
    }
  `;
  document.head.appendChild(style);
}

/**
 * Tier 1: Toast — non-blocking notification, auto-dismisses.
 * @param {string} message
 * @param {object} opts — { duration: ms, type: string }
 */
export function showCelebrationToast(message, opts = {}) {
  _injectStyles();
  const duration = opts.duration || 2500;
  const el = document.createElement('div');
  el.className = 'celeb-toast';
  el.textContent = message;
  document.body.appendChild(el);
  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 300);
  }, duration);
}

/**
 * Tier 2: Banner — slides in from top, auto-dismisses.
 * @param {string} title
 * @param {string} subtitle
 * @param {object} opts — { duration: ms, particles: bool }
 */
export function showCelebrationBanner(title, subtitle = '', opts = {}) {
  _injectStyles();
  const duration = opts.duration || 2500;
  const el = document.createElement('div');
  el.className = 'celeb-banner';
  el.innerHTML = `
    <div class="celeb-banner-title">${title}</div>
    ${subtitle ? `<div class="celeb-banner-sub">${subtitle}</div>` : ''}
  `;
  document.body.appendChild(el);

  if (opts.particles) {
    try {
      import('./celebrations.js').then(m => m.confettiBurst({ count: 40 }));
    } catch (_) {}
  }

  setTimeout(() => {
    el.classList.add('out');
    setTimeout(() => el.remove(), 350);
  }, duration);
}

/**
 * Tier 3: Fullscreen — blocking overlay with dismiss button.
 * @param {string} title
 * @param {string} subtitle
 * @param {object} opts — { onDismiss: fn, buttonText: string }
 */
export function showCelebrationFullscreen(title, subtitle = '', opts = {}) {
  _injectStyles();
  const overlay = document.createElement('div');
  overlay.className = 'celeb-fullscreen-overlay';
  overlay.innerHTML = `
    <div class="celeb-fullscreen-card">
      <div class="celeb-fullscreen-title">${title}</div>
      <div class="celeb-fullscreen-sub">${subtitle}</div>
      <button class="celeb-fullscreen-btn">${opts.buttonText || '知道了'}</button>
    </div>
  `;
  document.body.appendChild(overlay);

  overlay.querySelector('.celeb-fullscreen-btn').addEventListener('click', () => {
    overlay.style.opacity = '0';
    overlay.style.transition = 'opacity 0.3s';
    setTimeout(() => {
      overlay.remove();
      if (opts.onDismiss) opts.onDismiss();
    }, 300);
  });
}
