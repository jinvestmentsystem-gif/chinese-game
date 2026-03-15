// js/screens/worldmap.js — Chapter/quest selection
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';

const CHAPTERS = [
  { id: 1, era: '先秦', name: '文字起源', boss: '仓颉之影', quests: 4, unlocked: true },
  { id: 2, era: '汉代', name: '史记风云', boss: '墨吏', quests: 4, unlocked: false },
  { id: 3, era: '唐代', name: '诗词盛世', boss: '诗魔', quests: 4, unlocked: false },
  { id: 4, era: '宋代', name: '词赋纵横', boss: '词煞', quests: 4, unlocked: false },
  { id: 5, era: '近现代', name: '墨暗之源', boss: '墨暗之主', quests: 5, unlocked: false },
];

function renderWorldMap() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  const chaptersHTML = CHAPTERS.map(ch => {
    const progress = profile.chapterProgress[ch.id] || { questsCompleted: 0 };
    const isUnlocked = ch.id === 1 || (profile.chapterProgress[ch.id - 1]?.questsCompleted >= CHAPTERS[ch.id - 2]?.quests);
    const statusText = isUnlocked
      ? `${progress.questsCompleted}/${ch.quests} 关`
      : '🔒 未解锁';

    return `
      <div class="chapter-card ${isUnlocked ? 'unlocked' : 'locked'}" data-chapter="${ch.id}">
        <div class="chapter-era">${ch.era}</div>
        <div class="chapter-name">${ch.name}</div>
        <div class="chapter-boss">Boss: ${ch.boss}</div>
        <div class="chapter-progress">${statusText}</div>
      </div>
    `;
  }).join('');

  div.innerHTML = `
    <div style="width:100%; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; padding:0 20px;">
        <div>
          <span style="font-size:1.2rem; font-weight:700; color:var(--accent-gold);">${profile.name}</span>
          <span style="color:var(--text-secondary);"> · Lv.${profile.level} · ${profile.tier === 'grade7' ? '七年级' : '三年级'}</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn" id="btn-inventory" style="padding:8px 16px; font-size:0.9rem;">背包</button>
          <button class="btn" id="btn-chengyu" style="padding:8px 16px; font-size:0.9rem;">成语</button>
          <button class="btn" id="btn-back" style="padding:8px 16px; font-size:0.9rem;">返回</button>
        </div>
      </div>
      <h2 style="text-align:center; margin-bottom:20px;">选择章节</h2>
      <div class="chapter-grid">${chaptersHTML}</div>
    </div>
    <style>
      .chapter-grid { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; padding:0 20px; }
      .chapter-card {
        background:var(--bg-card); border:2px solid var(--bg-secondary); border-radius:8px;
        padding:20px; width:180px; text-align:center; cursor:pointer; transition:all 0.2s;
      }
      .chapter-card.unlocked:hover { border-color:var(--accent-gold); transform:translateY(-2px); }
      .chapter-card.locked { opacity:0.5; cursor:not-allowed; }
      .chapter-era { font-size:0.85rem; color:var(--accent-jade); margin-bottom:4px; }
      .chapter-name { font-size:1.2rem; font-weight:700; color:var(--accent-gold); margin-bottom:8px; }
      .chapter-boss { font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px; }
      .chapter-progress { font-size:0.9rem; color:var(--text-secondary); }
    </style>
  `;

  setTimeout(() => {
    div.querySelectorAll('.chapter-card.unlocked').forEach(card => {
      card.addEventListener('click', () => {
        const chapterId = parseInt(card.dataset.chapter);
        showScreen('quest', { chapterId });
      });
    });
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    div.querySelector('#btn-inventory').addEventListener('click', () => showScreen('inventory'));
    div.querySelector('#btn-chengyu').addEventListener('click', () => showScreen('chengyu'));
  }, 0);

  return div;
}

registerScreen('worldmap', renderWorldMap);
