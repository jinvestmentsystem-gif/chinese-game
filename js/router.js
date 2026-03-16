// js/router.js — Screen registry and navigation (no circular deps)
import { gameState } from './state.js';

const screens = {};
let root = null;
let transitioning = false;

export function initRouter() {
  root = document.getElementById('game-root');
}

export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

export function showScreen(name, params = {}) {
  gameState.currentScreen = name;
  if (!root) root = document.getElementById('game-root');

  // If already transitioning, skip animation to avoid stacking
  if (transitioning) {
    _swapScreen(name, params);
    return;
  }

  const currentChild = root.firstElementChild;

  // No current child — just mount directly (first load)
  if (!currentChild) {
    _mountScreen(name, params);
    return;
  }

  // Crossfade: fade-out current, then fade-in new
  transitioning = true;
  root.classList.add('screen-transitioning');
  currentChild.style.transition = 'opacity 0.3s ease';
  currentChild.style.opacity = '0';

  setTimeout(() => {
    _swapScreen(name, params);
    root.classList.remove('screen-transitioning');
    transitioning = false;
  }, 300);
}

function _swapScreen(name, params) {
  root.innerHTML = '';
  _mountScreen(name, params);
}

function _mountScreen(name, params) {
  if (!screens[name]) return;
  const el = screens[name](params);
  el.style.opacity = '0';
  el.style.transition = 'opacity 0.3s ease';
  root.appendChild(el);
  // Force reflow so the transition triggers
  void el.offsetHeight;
  el.style.opacity = '1';
}
