// js/screens/chengyu.js — Collected idiom trophy case
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadChengyu } from '../content-loader.js';

async function renderChengyu() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const allChengyu = await loadChengyu();

  const collected = allChengyu.filter(cy => profile.chengyu.includes(cy.id));
  const locked = allChengyu.filter(cy => !profile.chengyu.includes(cy.id));

  const cardsHTML = collected.map(cy => `
    <div class="cy-card collected">
      <div class="cy-word">${cy.chengyu}</div>
      <div class="cy-pinyin">${cy.pinyin}</div>
      <div class="cy-meaning">${cy.meaning}</div>
      <div class="cy-origin">${cy.origin}</div>
      <div class="cy-example">例：${cy.example}</div>
    </div>
  `).join('');

  const lockedHTML = locked.map(cy => `
    <div class="cy-card locked">
      <div class="cy-word">？？？？</div>
      <div class="cy-pinyin">${cy.era}</div>
    </div>
  `).join('');

  div.innerHTML = `
    <style>
      .cy-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; padding:20px; width:100%; max-height:80vh; overflow-y:auto; }
      .cy-card { background:var(--bg-card); border-radius:8px; padding:16px; border:2px solid var(--bg-secondary); }
      .cy-card.collected { border-color:var(--accent-gold); }
      .cy-card.locked { opacity:0.4; }
      .cy-word { font-size:1.4rem; font-weight:700; color:var(--accent-gold); margin-bottom:4px; }
      .cy-pinyin { font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; }
      .cy-meaning { margin-bottom:6px; }
      .cy-origin { font-size:0.9rem; color:var(--text-secondary); margin-bottom:6px; }
      .cy-example { font-size:0.9rem; color:var(--accent-jade); }
    </style>
    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:16px 20px;">
      <h2>成语收集 (${collected.length}/${allChengyu.length})</h2>
      <button class="btn" id="btn-back">返回</button>
    </div>
    <div class="cy-grid">${cardsHTML}${lockedHTML}</div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
  }, 0);
  return div;
}

registerScreen('chengyu', renderChengyu);
