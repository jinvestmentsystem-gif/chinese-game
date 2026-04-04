// js/router.js — Screen registry and navigation with lazy loading support
import { gameState } from './state.js';
import { cleanupCelebrations } from './celebrations.js';

const screens = {};
const lazyLoaders = {}; // { screenName: () => import('./screens/foo.js') }
let root = null;
let transitioning = false;
let _screenGeneration = 0; // Incremented on every screen swap — stale callbacks check this
const _cleanupCallbacks = []; // Registered by screens, called on navigation

export function initRouter() {
  root = document.getElementById('game-root');
}

export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

/**
 * Register a screen for lazy loading. The loader function should return
 * a dynamic import() promise. The imported module must call registerScreen()
 * at module scope so the screen becomes available after import resolves.
 */
export function registerLazyScreen(name, loader) {
  lazyLoaders[name] = loader;
}

export function showScreen(name, params = {}) {
  gameState.currentScreen = name;
  if (!root) root = document.getElementById('game-root');

  // If screen not registered yet, check for lazy loader
  if (!screens[name] && lazyLoaders[name]) {
    const loader = lazyLoaders[name];
    // Don't delete yet — if import fails, we need to retry next time
    // Load the module asynchronously, then show
    _showLoadingIndicator();
    loader().then(() => {
      delete lazyLoaders[name]; // Only delete after successful load
      _hideLoadingIndicator();
      if (gameState.currentScreen !== name) return;
      if (screens[name]) {
        _doShowScreen(name, params);
      }
    }).catch(err => {
      console.error(`[Router] Lazy load "${name}" failed:`, err);
      _hideLoadingIndicator();
      _mountErrorScreen(err);
    });
    return;
  }

  _doShowScreen(name, params);
}

function _doShowScreen(name, params) {
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
  _screenGeneration++; // Invalidate all pending callbacks from previous screen
  // Run screen cleanup callbacks (timers, listeners, etc.)
  while (_cleanupCallbacks.length) {
    try { _cleanupCallbacks.pop()(); } catch (_) {}
  }
  cleanupCelebrations();
  root.innerHTML = '';
  _mountScreen(name, params);
}

/**
 * Get the current screen generation. Screens can capture this value
 * and compare later inside setTimeout/requestAnimationFrame to detect
 * if the screen has been swapped out (stale callback).
 * Usage: const gen = getScreenGeneration();
 *        setTimeout(() => { if (getScreenGeneration() !== gen) return; ... }, 1000);
 */
export function getScreenGeneration() { return _screenGeneration; }

/**
 * Register a cleanup callback for the current screen.
 * Called automatically when navigating away. Use for clearing timers,
 * removing document-level event listeners, etc.
 * Usage: onCleanup(() => { clearInterval(myTimer); document.removeEventListener('keydown', handler); });
 */
export function onCleanup(fn) { if (typeof fn === 'function') _cleanupCallbacks.push(fn); }

function _mountScreen(name, params) {
  if (!screens[name]) {
    console.error(`[Router] Screen "${name}" not found`);
    const err = new Error(`Screen "${name}" not found`);
    root.appendChild(_createErrorElement(err));
    return;
  }
  let el;
  try {
    el = screens[name](params);
  } catch (err) {
    console.error(`[Router] Screen "${name}" render error:`, err);
    el = _createErrorElement(err);
  }

  // Handle async render functions (return a Promise that resolves to HTMLElement)
  if (el && typeof el.then === 'function') {
    el.then(asyncEl => {
      if (!asyncEl || !(asyncEl instanceof HTMLElement)) return;
      if (gameState.currentScreen !== name) return; // Navigated away during async
      _appendScreenElement(asyncEl);
    }).catch(err => {
      console.error(`[Router] Async screen "${name}" error:`, err);
      _appendScreenElement(_createErrorElement(err));
    });
    return;
  }

  if (!el || !(el instanceof HTMLElement)) return;
  _appendScreenElement(el);
}

function _appendScreenElement(el) {
  if (transitioning) {
    el.style.opacity = '1';
    root.appendChild(el);
  } else {
    el.style.opacity = '0';
    el.style.transition = 'opacity 0.3s ease';
    root.appendChild(el);
    void el.offsetHeight;
    el.style.opacity = '1';
  }
}

function _mountErrorScreen(err) {
  root.innerHTML = '';
  root.appendChild(_createErrorElement(err));
}

function _createErrorElement(err) {
  const el = document.createElement('div');
  el.className = 'screen';
  el.innerHTML = `<div style="padding:40px;text-align:center;"><h2 style="color:#e74c3c;">加载失败</h2><p style="color:var(--text-secondary);margin:12px 0;">${err.message || '未知错误'}</p><button class="btn" onclick="location.reload()">刷新</button></div>`;
  return el;
}

// ── Loading indicator for lazy-loaded screens ─────────────────────────────

let loadingEl = null;

function _showLoadingIndicator() {
  if (loadingEl) return;
  loadingEl = document.createElement('div');
  loadingEl.style.cssText = `
    position:fixed; inset:0; z-index:9998;
    display:flex; align-items:center; justify-content:center;
    background:rgba(11,12,26,0.85);
    pointer-events:none;
  `;
  loadingEl.innerHTML = `
    <div style="text-align:center;">
      <div style="
        width:32px; height:32px; border:3px solid rgba(212,160,23,0.3);
        border-top-color:#d4a017; border-radius:50%;
        animation:router-spin 0.7s linear infinite;
        margin:0 auto 12px;
      "></div>
      <div style="color:rgba(212,160,23,0.7);font-size:0.9rem;letter-spacing:0.1em;">加载中…</div>
    </div>
  `;
  // Inject spinner keyframe if needed
  if (!document.getElementById('router-spin-style')) {
    const s = document.createElement('style');
    s.id = 'router-spin-style';
    s.textContent = '@keyframes router-spin { to { transform: rotate(360deg); } }';
    document.head.appendChild(s);
  }
  document.body.appendChild(loadingEl);
}

function _hideLoadingIndicator() {
  if (loadingEl) {
    loadingEl.remove();
    loadingEl = null;
  }
}
