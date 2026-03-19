// js/screens/gauntlet.js — Infinite Gauntlet: endless boss rematches with scaling difficulty
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { startQuest, getCurrentEncounter, advanceEncounter } from '../game-engine.js';
import { playMusic, playSound, setMusicIntensity, playStinger } from '../audio.js';
import { setParticleMode, burstParticles } from '../particles.js';
import { confettiBurst, fireworkShow, goldenRain } from '../celebrations.js';
import { showToast } from '../toast.js';
import { getEffectiveMaxHp, getEffectiveStats, addXP } from '../progression.js';

// Boss pool — cycles through all 5 bosses with scaling stats
const GAUNTLET_BOSSES = [
  { name: '仓颉之影', era: 'xianqin', color: '#c17f3c', ability: '文字迷雾' },
  { name: '墨吏',     era: 'han',     color: '#d63031', ability: '墨封' },
  { name: '诗魔',     era: 'tang',    color: '#d4a017', ability: '诗韵干扰' },
  { name: '词煞',     era: 'song',    color: '#2ecc8a', ability: '时间压迫' },
  { name: '墨暗之主', era: 'modern',  color: '#8e44ad', ability: '全面压制' },
];

function renderGauntlet() {
  const profile = gameState.profile;
  const record = profile.gauntletRecord || 0;
  const stats = getEffectiveStats(profile);

  const div = document.createElement('div');
  div.className = 'screen';

  // Inject keyframes
  if (!document.getElementById('gauntlet-styles')) {
    const s = document.createElement('style');
    s.id = 'gauntlet-styles';
    s.textContent = `
      @keyframes gauntlet-pulse {
        0%,100% { box-shadow: 0 0 20px rgba(212,160,23,0.3), 0 0 60px rgba(212,160,23,0.1); }
        50%      { box-shadow: 0 0 30px rgba(212,160,23,0.5), 0 0 80px rgba(212,160,23,0.2); }
      }
      @keyframes gauntlet-float {
        0%,100% { transform: translateY(0); }
        50%     { transform: translateY(-6px); }
      }
      @keyframes gauntlet-ring {
        from { transform: rotate(0deg); }
        to   { transform: rotate(360deg); }
      }
    `;
    document.head.appendChild(s);
  }

  setParticleMode('boss');
  playMusic('modern');
  setMusicIntensity(0);

  // Build boss preview list showing next 5 floors
  const currentFloor = (profile.gauntletFloor || 0);
  let previewHTML = '';
  for (let i = 0; i < 5; i++) {
    const floor = currentFloor + i + 1;
    const bossIdx = (floor - 1) % GAUNTLET_BOSSES.length;
    const boss = GAUNTLET_BOSSES[bossIdx];
    const scaling = Math.floor((floor - 1) / 3) * 10; // +10% every 3 floors
    const isCurrent = i === 0;
    previewHTML += `
      <div style="
        display:flex; align-items:center; gap:12px;
        padding:10px 16px;
        background:${isCurrent ? 'rgba(212,160,23,0.1)' : 'rgba(0,0,0,0.2)'};
        border:1px solid ${isCurrent ? 'rgba(212,160,23,0.3)' : 'rgba(255,255,255,0.05)'};
        border-radius:8px;
        ${isCurrent ? 'animation: gauntlet-pulse 2s ease-in-out infinite;' : ''}
      ">
        <div style="
          width:36px; height:36px; border-radius:50%;
          background:${boss.color}22; border:2px solid ${boss.color};
          display:flex; align-items:center; justify-content:center;
          font-size:1.1rem; font-weight:900; color:${boss.color};
        ">${floor}</div>
        <div style="flex:1;">
          <div style="font-weight:700; font-size:0.95rem; color:${boss.color};">${boss.name}</div>
          <div style="font-size:0.85rem; color:var(--text-dim);">${boss.ability}${scaling > 0 ? ` · +${scaling}%属性` : ''}</div>
        </div>
        ${isCurrent ? '<div style="color:#d4a017;font-size:0.85rem;font-weight:700;">下一层</div>' : ''}
      </div>`;
  }

  div.innerHTML = `
    <div style="
      max-width:560px; margin:0 auto; padding:32px 20px;
      text-align:center; overflow-y:auto; max-height:100%;
    ">
      <!-- Title -->
      <div style="margin-bottom:8px;">
        <div style="
          display:inline-block; width:64px; height:64px;
          border:3px solid #d4a017; border-radius:50%;
          animation: gauntlet-ring 8s linear infinite;
          margin-bottom:12px;
          display:flex; align-items:center; justify-content:center;
          margin:0 auto 12px;
        ">
          <span style="font-size:2rem; color:#d4a017; font-weight:900;">∞</span>
        </div>
        <h2 style="color:#d4a017; font-size:1.8rem; margin-bottom:4px; text-shadow:0 0 20px rgba(212,160,23,0.5);">
          无尽试炼
        </h2>
        <p style="color:var(--text-secondary); font-size:0.9rem; letter-spacing:0.06em;">
          Infinite Gauntlet — 挑战不断升级的BOSS
        </p>
      </div>

      <!-- Record -->
      <div style="
        display:flex; gap:16px; justify-content:center; margin:20px 0;
      ">
        <div style="
          padding:12px 24px; background:rgba(212,160,23,0.08);
          border:1px solid rgba(212,160,23,0.2); border-radius:10px;
        ">
          <div style="font-size:0.8rem; color:var(--text-dim); letter-spacing:0.1em;">最高记录</div>
          <div style="font-size:1.8rem; font-weight:900; color:#d4a017;">${record}</div>
        </div>
        <div style="
          padding:12px 24px; background:rgba(46,204,138,0.08);
          border:1px solid rgba(46,204,138,0.2); border-radius:10px;
        ">
          <div style="font-size:0.8rem; color:var(--text-dim); letter-spacing:0.1em;">当前HP</div>
          <div style="font-size:1.8rem; font-weight:900; color:#2ecc8a;">${profile.hp}/${getEffectiveMaxHp(profile)}</div>
        </div>
      </div>

      <!-- Rules -->
      <div style="
        text-align:left; padding:14px 18px;
        background:rgba(0,0,0,0.3); border-radius:10px;
        border:1px solid rgba(255,255,255,0.06);
        margin-bottom:20px; font-size:0.9rem; color:var(--text-secondary);
        line-height:1.7;
      ">
        <div style="font-weight:700; color:var(--text-primary); margin-bottom:6px;">规则</div>
        · 每层面对一个BOSS，5个BOSS循环出现<br>
        · 每3层BOSS属性+10%（HP、攻击）<br>
        · 你的HP在层间保留（不回复）<br>
        · HP归零时试炼结束<br>
        · 每层奖励: 30 XP + 20 金币 + 层数×5 额外XP
      </div>

      <!-- Boss preview -->
      <div style="
        text-align:left; margin-bottom:24px;
        display:flex; flex-direction:column; gap:8px;
      ">
        <div style="font-size:0.8rem; color:var(--text-dim); letter-spacing:0.12em; margin-bottom:4px;">接下来的挑战</div>
        ${previewHTML}
      </div>

      <!-- Buttons -->
      <div style="display:flex; gap:12px; justify-content:center; flex-wrap:wrap;">
        <button class="btn btn-primary" id="btn-gauntlet-start" style="
          font-size:1.1rem; padding:14px 32px; min-width:160px;
          animation: gauntlet-pulse 2s ease-in-out infinite;
        ">
          ${currentFloor > 0 ? `继续第 ${currentFloor + 1} 层` : '开始试炼'}
        </button>
        ${currentFloor > 0 ? `
          <button class="btn" id="btn-gauntlet-reset" style="font-size:0.95rem; padding:12px 20px;">
            重新开始
          </button>
        ` : ''}
        <button class="btn" id="btn-gauntlet-back" style="font-size:0.95rem; padding:12px 20px;">
          返回地图
        </button>
      </div>

      <!-- Mastery titles earned -->
      ${record >= 5 ? `
        <div style="margin-top:20px; padding:12px 16px; background:rgba(142,68,173,0.08); border:1px solid rgba(142,68,173,0.2); border-radius:8px;">
          <div style="font-size:0.8rem; color:rgba(142,68,173,0.7); letter-spacing:0.1em; margin-bottom:6px;">解锁称号</div>
          ${record >= 5 ? '<span style="color:#d4a017;font-size:0.9rem;margin-right:8px;">试炼新手 (5层)</span>' : ''}
          ${record >= 10 ? '<span style="color:#e67e22;font-size:0.9rem;margin-right:8px;">试炼勇士 (10层)</span>' : ''}
          ${record >= 20 ? '<span style="color:#e74c3c;font-size:0.9rem;margin-right:8px;">试炼大师 (20层)</span>' : ''}
          ${record >= 50 ? '<span style="color:#8e44ad;font-size:0.9rem;">试炼传说 (50层)</span>' : ''}
        </div>
      ` : ''}
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-gauntlet-back')?.addEventListener('click', () => showScreen('chapter-map'));

    div.querySelector('#btn-gauntlet-reset')?.addEventListener('click', () => {
      profile.gauntletFloor = 0;
      gameState.save();
      showScreen('gauntlet');
    });

    div.querySelector('#btn-gauntlet-start')?.addEventListener('click', () => {
      const floor = (profile.gauntletFloor || 0) + 1;
      const bossIdx = (floor - 1) % GAUNTLET_BOSSES.length;
      const boss = GAUNTLET_BOSSES[bossIdx];
      const scaling = 1 + Math.floor((floor - 1) / 3) * 0.1;

      // Set up quest state for boss fight
      const chapterId = bossIdx + 1; // 1-5 to match content tiers
      startQuest(chapterId, 0); // Use chapter's content pool

      // Override the first encounter to be a boss with scaled stats
      const quest = gameState.currentQuest;
      if (quest && quest.encounters && quest.encounters.length > 0) {
        // Force the first encounter to be a boss type
        quest.encounters[0].type = 'boss';
        quest.encounters[0].completed = false;
        // Store scaling info for boss.js to use
        quest.gauntletMode = true;
        quest.gauntletFloor = floor;
        quest.gauntletScaling = scaling;
        quest.gauntletBossName = boss.name;

        // Trim to just the boss encounter
        quest.encounters = [quest.encounters[0]];
        quest.currentEncounter = 0;
      }

      gameState.save();

      // Navigate to boss fight via encounter-intro
      showScreen('encounter-intro', {
        encounterType: 'boss',
        encounterName: `${boss.name} (第${floor}层)`,
        chapterId,
        onReady: () => showScreen('boss'),
      });
    });
  }, 0);

  return div;
}

registerScreen('gauntlet', renderGauntlet);
