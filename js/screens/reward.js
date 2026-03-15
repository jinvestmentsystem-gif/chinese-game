// js/screens/reward.js — Post-quest reward summary
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { addXP } from '../progression.js';

function renderReward() {
  const div = document.createElement('div');
  div.className = 'screen';
  const quest = gameState.currentQuest;
  const results = quest.results;
  const accuracy = quest.results.total > 0
    ? Math.round((results.correct / results.total) * 100)
    : 0;

  // Calculate XP
  const baseXP = results.correct * 10;
  const comboBonus = results.maxCombo * 5;
  const totalXP = baseXP + comboBonus;
  results.xpEarned = totalXP;

  // Apply XP and save
  const levelUpInfo = addXP(totalXP);

  // Mark quest as completed
  const profile = gameState.profile;
  if (!profile.chapterProgress[quest.chapterId]) {
    profile.chapterProgress[quest.chapterId] = { questsCompleted: 0 };
  }
  const cp = profile.chapterProgress[quest.chapterId];
  if (quest.questIndex >= cp.questsCompleted) {
    cp.questsCompleted = quest.questIndex + 1;
  }
  gameState.save();

  div.innerHTML = `
    <h2 style="margin-bottom:1.5rem;">🎉 任务完成！</h2>
    <div style="background:var(--bg-card); border-radius:8px; padding:24px 40px; margin-bottom:1.5rem;">
      <div style="font-size:1.1rem; margin-bottom:12px;">正确率: <span style="color:var(--accent-gold); font-weight:700;">${accuracy}%</span> (${results.correct}/${results.total})</div>
      <div style="font-size:1.1rem; margin-bottom:12px;">最高连击: <span style="color:var(--accent-jade); font-weight:700;">${results.maxCombo}</span></div>
      <div style="font-size:1.1rem; margin-bottom:12px;">获得经验: <span style="color:var(--accent-gold); font-weight:700;">+${totalXP} XP</span></div>
      ${levelUpInfo ? `<div style="font-size:1.2rem; color:var(--accent-gold); font-weight:700; margin-top:8px;">🎊 升级到 Lv.${levelUpInfo.newLevel}！${levelUpInfo.unlock ? ' 解锁: ' + levelUpInfo.unlock : ''}</div>` : ''}
    </div>
    <div style="display:flex; gap:12px;">
      <button class="btn btn-primary" id="btn-continue">继续</button>
      <button class="btn" id="btn-map">返回地图</button>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-continue').addEventListener('click', () => {
      showScreen('quest', { chapterId: quest.chapterId, questIndex: quest.questIndex + 1 });
    });
    div.querySelector('#btn-map').addEventListener('click', () => showScreen('worldmap'));
  }, 0);

  return div;
}

registerScreen('reward', renderReward);
