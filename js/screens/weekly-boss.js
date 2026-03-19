// js/screens/weekly-boss.js — Weekly rotating boss challenge
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { showToast } from '../toast.js';

const WEEKLY_BOSSES = [
  { name: '文字吞噬者', ability: '选项倒序显示', reward: { gold: 300, xp: 150 }, color: '#e74c3c' },
  { name: '混沌墨龙', ability: '答题时间减半', reward: { gold: 400, xp: 200 }, color: '#8e44ad' },
  { name: '断句幽灵', ability: '无法使用提示', reward: { gold: 350, xp: 180 }, color: '#2ecc8a' },
  { name: '篡字魔王', ability: '两个选项被交换', reward: { gold: 500, xp: 250 }, color: '#d4a017' },
  { name: '遗忘之影', ability: '题目5秒后消失', reward: { gold: 450, xp: 220 }, color: '#3498db' },
];

function getWeekId() {
  return Math.floor(Date.now() / 604800000);
}

function getCurrentBoss() {
  const weekId = getWeekId();
  return { ...WEEKLY_BOSSES[weekId % 5], weekId };
}

function getTimeUntilNextWeek() {
  const weekId = getWeekId();
  const nextWeekStart = (weekId + 1) * 604800000;
  const remaining = nextWeekStart - Date.now();
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return { days, hours, minutes };
}

function renderWeeklyBoss() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  // Level gate
  if (!profile || profile.level < 5) {
    div.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;min-height:100vh;padding:20px;text-align:center;">
        <div style="font-size:3rem;margin-bottom:16px;">🔒</div>
        <h2 style="color:var(--accent-gold);font-size:1.5rem;margin-bottom:12px;">周挑战尚未解锁</h2>
        <p style="color:var(--text-secondary);font-size:1.1rem;margin-bottom:8px;">需要等级 5 才能挑战周BOSS</p>
        <p style="color:var(--text-dim);font-size:0.95rem;margin-bottom:24px;">当前等级: ${profile ? profile.level : 0}</p>
        <button id="wb-back-locked" style="
          padding:12px 32px;font-size:1.1rem;background:var(--bg-secondary);color:var(--text-primary);
          border:1px solid var(--border-color);border-radius:8px;cursor:pointer;
        ">返回</button>
      </div>`;
    setTimeout(() => {
      const btn = div.querySelector('#wb-back-locked');
      if (btn) btn.addEventListener('click', () => { playSound('click'); showScreen('chapter-map'); });
    }, 0);
    return div;
  }

  // Init weekly boss state
  if (!profile.weeklyBoss) {
    profile.weeklyBoss = { lastWeekId: 0, defeated: false, bestTime: null };
  }

  const boss = getCurrentBoss();
  const weekId = boss.weekId;

  // Reset if new week
  if (profile.weeklyBoss.lastWeekId !== weekId) {
    profile.weeklyBoss = { lastWeekId: weekId, defeated: false, bestTime: null };
    gameState.save();
  }

  const defeated = profile.weeklyBoss.defeated;
  const bestTime = profile.weeklyBoss.bestTime;
  const countdown = getTimeUntilNextWeek();

  // Inject keyframe styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes wb-pulse {
      0%, 100% { box-shadow: 0 0 20px ${boss.color}44, 0 0 40px ${boss.color}22; }
      50% { box-shadow: 0 0 35px ${boss.color}88, 0 0 60px ${boss.color}44; }
    }
    @keyframes wb-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-8px); }
    }
    @keyframes wb-fade-in {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes wb-icon-spin {
      0% { transform: rotate(0deg) scale(1); }
      25% { transform: rotate(5deg) scale(1.05); }
      75% { transform: rotate(-5deg) scale(1.05); }
      100% { transform: rotate(0deg) scale(1); }
    }
  `;
  div.appendChild(style);

  div.innerHTML += `
    <div style="
      display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh;
      background:linear-gradient(180deg, #0a0a14 0%, #1a1028 50%, #0a0a14 100%);
    ">
      <!-- Header -->
      <div style="width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <button id="wb-back" style="
          padding:8px 16px;font-size:0.95rem;background:var(--bg-secondary);color:var(--text-primary);
          border:1px solid var(--border-color);border-radius:8px;cursor:pointer;
        ">← 返回</button>
        <h2 style="color:var(--accent-gold);font-size:1.3rem;font-weight:700;margin:0;">⚔️ 周挑战</h2>
        <div style="width:70px;"></div>
      </div>

      <!-- Boss Card -->
      <div style="
        width:100%;max-width:420px;border-radius:16px;overflow:hidden;
        background:linear-gradient(145deg, #1a1a2e, #16213e);
        border:2px solid ${boss.color}88;
        animation: wb-pulse 3s ease-in-out infinite, wb-fade-in 0.6s ease-out;
        margin-bottom:20px;
      ">
        <!-- Boss Icon Area -->
        <div style="
          display:flex;flex-direction:column;align-items:center;padding:28px 20px 20px;
          background:linear-gradient(180deg, ${boss.color}22 0%, transparent 100%);
        ">
          <div style="
            font-size:4rem;margin-bottom:12px;
            animation: wb-float 3s ease-in-out infinite;
            filter: drop-shadow(0 0 12px ${boss.color}88);
          ">👹</div>
          <h3 style="
            font-size:1.8rem;font-weight:900;color:${boss.color};margin:0 0 4px;
            text-shadow: 0 0 20px ${boss.color}66;
            letter-spacing:0.1em;
          ">${boss.name}</h3>
          <div style="
            font-size:0.85rem;color:var(--text-dim);text-transform:uppercase;
            letter-spacing:0.15em;margin-bottom:12px;
          ">本周BOSS</div>
        </div>

        <!-- Boss Details -->
        <div style="padding:0 20px 20px;">
          <!-- Ability -->
          <div style="
            display:flex;align-items:center;gap:10px;padding:12px 14px;margin-bottom:12px;
            background:${boss.color}15;border-radius:10px;border:1px solid ${boss.color}33;
          ">
            <span style="font-size:1.3rem;">⚡</span>
            <div>
              <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:2px;">特殊能力</div>
              <div style="font-size:1rem;color:${boss.color};font-weight:700;">${boss.ability}</div>
            </div>
          </div>

          <!-- Rewards -->
          <div style="display:flex;gap:10px;margin-bottom:16px;">
            <div style="
              flex:1;padding:10px;background:rgba(212,160,23,0.1);border-radius:8px;
              border:1px solid rgba(212,160,23,0.25);text-align:center;
            ">
              <div style="font-size:1.2rem;">🪙</div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--accent-gold);">${boss.reward.gold}</div>
              <div style="font-size:0.75rem;color:var(--text-dim);">金币</div>
            </div>
            <div style="
              flex:1;padding:10px;background:rgba(46,204,138,0.1);border-radius:8px;
              border:1px solid rgba(46,204,138,0.25);text-align:center;
            ">
              <div style="font-size:1.2rem;">✨</div>
              <div style="font-size:1.1rem;font-weight:700;color:var(--accent-jade);">${boss.reward.xp}</div>
              <div style="font-size:0.75rem;color:var(--text-dim);">经验</div>
            </div>
          </div>

          ${defeated ? `
            <!-- Defeated State -->
            <div style="
              text-align:center;padding:14px;background:rgba(46,204,138,0.1);border-radius:10px;
              border:1px solid rgba(46,204,138,0.3);margin-bottom:12px;
            ">
              <div style="font-size:1.6rem;margin-bottom:4px;">🏆</div>
              <div style="font-size:1.1rem;color:var(--accent-jade);font-weight:700;">已击败</div>
              ${bestTime ? `<div style="font-size:0.9rem;color:var(--text-secondary);margin-top:4px;">最佳用时: ${bestTime}秒</div>` : ''}
            </div>
            <button id="wb-retry" style="
              width:100%;padding:14px;font-size:1.1rem;font-weight:700;
              background:linear-gradient(135deg, ${boss.color}44, ${boss.color}22);
              color:${boss.color};border:2px solid ${boss.color}66;border-radius:12px;
              cursor:pointer;letter-spacing:0.05em;
            ">再次挑战 (25%奖励)</button>
          ` : `
            <!-- Challenge Button -->
            <button id="wb-challenge" style="
              width:100%;padding:16px;font-size:1.3rem;font-weight:900;
              background:linear-gradient(135deg, ${boss.color}, ${boss.color}cc);
              color:#fff;border:none;border-radius:12px;cursor:pointer;
              text-shadow:0 2px 4px rgba(0,0,0,0.3);letter-spacing:0.1em;
              box-shadow:0 4px 20px ${boss.color}44;
              transition:transform 0.15s, box-shadow 0.15s;
            ">⚔️ 挑战</button>
          `}
        </div>
      </div>

      <!-- Countdown to next rotation -->
      <div style="
        width:100%;max-width:420px;padding:16px;text-align:center;
        background:var(--bg-secondary);border-radius:12px;border:1px solid var(--border-color);
        animation: wb-fade-in 0.8s ease-out;
      ">
        <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:8px;">下一个BOSS轮换</div>
        <div style="display:flex;justify-content:center;gap:16px;">
          <div style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:900;color:var(--accent-gold);">${countdown.days}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);">天</div>
          </div>
          <div style="color:var(--text-dim);font-size:1.5rem;line-height:1.5;">:</div>
          <div style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:900;color:var(--accent-gold);">${countdown.hours}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);">时</div>
          </div>
          <div style="color:var(--text-dim);font-size:1.5rem;line-height:1.5;">:</div>
          <div style="text-align:center;">
            <div style="font-size:1.5rem;font-weight:900;color:var(--accent-gold);">${countdown.minutes}</div>
            <div style="font-size:0.75rem;color:var(--text-dim);">分</div>
          </div>
        </div>
      </div>

      <!-- All Bosses Preview -->
      <div style="
        width:100%;max-width:420px;margin-top:20px;
        animation: wb-fade-in 1s ease-out;
      ">
        <div style="font-size:0.9rem;color:var(--text-dim);margin-bottom:10px;text-align:center;">全部周BOSS</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${WEEKLY_BOSSES.map((b, i) => {
            const isCurrent = (weekId % 5) === i;
            return `
              <div style="
                display:flex;align-items:center;gap:12px;padding:10px 14px;
                background:${isCurrent ? b.color + '18' : 'var(--bg-secondary)'};
                border-radius:10px;border:1px solid ${isCurrent ? b.color + '55' : 'var(--border-color)'};
                ${isCurrent ? 'box-shadow:0 0 12px ' + b.color + '22;' : ''}
              ">
                <div style="
                  width:36px;height:36px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                  background:${b.color}22;font-size:1.1rem;border:1px solid ${b.color}44;
                  ${isCurrent ? 'animation: wb-icon-spin 2s ease-in-out infinite;' : ''}
                ">👹</div>
                <div style="flex:1;">
                  <div style="font-size:0.95rem;font-weight:700;color:${isCurrent ? b.color : 'var(--text-primary)'};">${b.name}${isCurrent ? ' 📌' : ''}</div>
                  <div style="font-size:0.8rem;color:var(--text-dim);">${b.ability}</div>
                </div>
                <div style="font-size:0.8rem;color:var(--accent-gold);">🪙${b.reward.gold}</div>
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  // Event listeners
  setTimeout(() => {
    const backBtn = div.querySelector('#wb-back');
    if (backBtn) backBtn.addEventListener('click', () => { playSound('click'); showScreen('chapter-map'); });

    const challengeBtn = div.querySelector('#wb-challenge');
    if (challengeBtn) {
      challengeBtn.addEventListener('mouseenter', () => {
        challengeBtn.style.transform = 'scale(1.03)';
        challengeBtn.style.boxShadow = `0 6px 30px ${boss.color}66`;
      });
      challengeBtn.addEventListener('mouseleave', () => {
        challengeBtn.style.transform = 'scale(1)';
        challengeBtn.style.boxShadow = `0 4px 20px ${boss.color}44`;
      });
      challengeBtn.addEventListener('click', () => {
        playSound('click');
        // Mark as starting weekly boss challenge
        profile.weeklyBoss.startedAt = Date.now();
        profile.weeklyBoss.isRetry = false;
        gameState.save();
        showScreen('boss', { weeklyBoss: true, bossName: boss.name, bossAbility: boss.ability });
      });
    }

    const retryBtn = div.querySelector('#wb-retry');
    if (retryBtn) {
      retryBtn.addEventListener('click', () => {
        playSound('click');
        profile.weeklyBoss.startedAt = Date.now();
        profile.weeklyBoss.isRetry = true;
        gameState.save();
        showScreen('boss', { weeklyBoss: true, bossName: boss.name, bossAbility: boss.ability, reducedReward: true });
      });
    }
  }, 0);

  return div;
}

registerScreen('weekly-boss', renderWeeklyBoss);
