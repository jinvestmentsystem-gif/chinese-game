// js/router.js — Screen registry and navigation (no circular deps)
import { gameState } from './state.js';

const screens = {};
let root = null;
let isTransitioning = false;

export function initRouter() {
  root = document.getElementById('game-root');
}

export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

export function showScreen(name, params = {}) {
  gameState.currentScreen = name;
  if (!root) root = document.getElementById('game-root');

  // If there is existing content, fade it out before replacing
  const existing = root.firstElementChild;

  if (existing && !isTransitioning) {
    isTransitioning = true;
    // Fade out existing screen
    existing.style.transition = 'opacity 200ms ease-in';
    existing.style.opacity = '0';

    setTimeout(() => {
      root.innerHTML = '';
      _mountScreen(name, params);
      isTransitioning = false;
    }, 200);
  } else {
    // No existing content or already transitioning — mount immediately
    if (isTransitioning) {
      // Override: clear and mount right away to avoid stacking
      root.innerHTML = '';
      isTransitioning = false;
    }
    root.innerHTML = '';
    _mountScreen(name, params);
  }
}

function _mountScreen(name, params) {
  if (!screens[name]) return;

  const el = screens[name](params);

  // Start invisible and shifted down
  el.style.opacity = '0';
  el.style.transform = 'translateY(20px)';

  root.appendChild(el);

  // Trigger fade-in + slide-up on the next animation frame pair
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      el.style.transition = 'opacity 300ms ease-out, transform 300ms ease-out';
      el.style.opacity = '1';
      el.style.transform = 'translateY(0)';
    });
  });
}
