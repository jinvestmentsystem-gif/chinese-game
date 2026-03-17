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

  // Persona 5-style diagonal ink-slash wipe transition
  transitioning = true;
  root.classList.add('screen-transitioning');

  // Create the diagonal wipe overlay
  const wipe = document.createElement('div');
  wipe.className = 'screen-wipe';
  document.body.appendChild(wipe);

  // At ~45% of 500ms (≈225ms), the wipe fully covers the screen — swap content
  setTimeout(() => {
    _swapScreen(name, params);
  }, 225);

  // When the wipe animation ends, clean up
  wipe.addEventListener('animationend', () => {
    wipe.remove();
    root.classList.remove('screen-transitioning');
    transitioning = false;
  }, { once: true });

  // Safety fallback in case animationend doesn't fire
  setTimeout(() => {
    if (wipe.parentNode) wipe.remove();
    root.classList.remove('screen-transitioning');
    transitioning = false;
  }, 600);
}

function _swapScreen(name, params) {
  root.innerHTML = '';
  _mountScreen(name, params);
}

function _mountScreen(name, params) {
  if (!screens[name]) return;
  let el;
  try {
    el = screens[name](params);
  } catch (err) {
    console.error(`[Router] Screen "${name}" render error:`, err);
    // Create a fallback error screen instead of crashing
    el = document.createElement('div');
    el.className = 'screen';
    el.innerHTML = `<div style="padding:40px;text-align:center;"><h2 style="color:#e74c3c;">加载失败</h2><p style="color:var(--text-secondary);margin:12px 0;">${err.message || '未知错误'}</p><button class="btn" onclick="location.reload()">刷新</button></div>`;
  }
  if (!el || !(el instanceof HTMLElement)) return;
  // When wipe is active, the overlay hides the swap — no opacity fade needed
  if (transitioning) {
    el.style.opacity = '1';
    root.appendChild(el);
  } else {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    root.appendChild(el);
    // Force reflow so the transition triggers
    void el.offsetHeight;
    el.style.opacity = '1';
  }
}
