// js/router.js — Screen registry and navigation (no circular deps)
import { gameState } from './state.js';

const screens = {};
let root = null;

export function initRouter() {
  root = document.getElementById('game-root');
}

export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

export function showScreen(name, params = {}) {
  gameState.currentScreen = name;
  if (!root) root = document.getElementById('game-root');
  root.innerHTML = '';
  if (screens[name]) {
    const el = screens[name](params);
    root.appendChild(el);
  }
}
