// js/main.js — App initialization and screen routing
import { gameState } from './state.js';
import './screens/profile.js';
import './screens/worldmap.js';
import './screens/quest.js';
import './screens/reward.js';
import './screens/combat.js';
import './screens/puzzle.js';
import './screens/boss.js';

const root = document.getElementById('game-root');
const screens = {};

export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

export function showScreen(name, params = {}) {
  gameState.currentScreen = name;
  root.innerHTML = '';
  if (screens[name]) {
    const el = screens[name](params);
    root.appendChild(el);
  }
}

// Title screen with working buttons
registerScreen('title', () => {
  const div = document.createElement('div');
  div.className = 'screen';
  div.innerHTML = `
    <h1 style="font-size:3rem; margin-bottom:0.5rem;">文字侠</h1>
    <p style="font-size:1.2rem; color:var(--text-secondary); margin-bottom:2rem;">Word Hero</p>
    <div style="display:flex; flex-direction:column; gap:12px;">
      <button class="btn btn-primary" id="btn-solo">单人模式</button>
      <button class="btn" id="btn-arena">双人对战</button>
      <button class="btn" id="btn-daily">每日挑战</button>
    </div>
  `;
  setTimeout(() => {
    div.querySelector('#btn-solo').addEventListener('click', () => showScreen('profile', { mode: 'solo' }));
    div.querySelector('#btn-arena').addEventListener('click', () => showScreen('profile', { mode: 'arena' }));
    div.querySelector('#btn-daily').addEventListener('click', () => showScreen('profile', { mode: 'daily' }));
  }, 0);
  return div;
});

// Boot
showScreen('title');
