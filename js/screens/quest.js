// js/screens/quest.js — Quest encounter path visualization
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { startQuest, getCurrentEncounter } from '../game-engine.js';

function renderQuest(params) {
  const div = document.createElement('div');
  div.className = 'screen';
  const { chapterId } = params;
  const profile = gameState.profile;
  const progress = profile.chapterProgress[chapterId] || { questsCompleted: 0 };
  const questIndex = params.questIndex ?? progress.questsCompleted;

  div.innerHTML = `
    <h2 style="margin-bottom:0.5rem;">第${chapterId}章 · 第${questIndex + 1}关</h2>
    <p style="color:var(--text-secondary); margin-bottom:2rem;">准备好迎接挑战了吗？</p>
    <div id="encounter-path" style="display:flex; gap:16px; margin-bottom:2rem;"></div>
    <div style="display:flex; gap:12px;">
      <button class="btn btn-primary" id="btn-start">开始</button>
      <button class="btn" id="btn-back">返回</button>
    </div>
  `;

  setTimeout(async () => {
    const quest = await startQuest(chapterId, questIndex);
    const pathEl = div.querySelector('#encounter-path');
    quest.encounters.forEach((enc, i) => {
      const icon = enc.type === 'combat' ? '⚔️' : enc.type === 'puzzle' ? '📖' : '👹';
      const node = document.createElement('div');
      node.style.cssText = 'width:48px;height:48px;border-radius:50%;background:var(--bg-card);border:2px solid var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:1.3rem;';
      node.textContent = icon;
      pathEl.appendChild(node);
      if (i < quest.encounters.length - 1) {
        const line = document.createElement('div');
        line.style.cssText = 'width:24px;height:2px;background:var(--bg-secondary);align-self:center;';
        pathEl.appendChild(line);
      }
    });

    div.querySelector('#btn-start').addEventListener('click', () => {
      const enc = getCurrentEncounter();
      if (enc.type === 'combat') showScreen('combat');
      else if (enc.type === 'puzzle') showScreen('puzzle');
      else if (enc.type === 'boss') showScreen('boss');
    });
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
  }, 0);

  return div;
}

registerScreen('quest', renderQuest);
