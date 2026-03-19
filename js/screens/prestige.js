// js/screens/prestige.js — Prestige/ascension screen
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { showToast } from '../toast.js';

const TOTAL_CHAPTERS = 5;

function getPrestigeLevel(profile) {
  return profile.prestige ? (profile.prestige.level || 0) : 0;
}

function getPrestigeBonuses(level) {
  return {
    xpMultiplier: level * 10,
    goldMultiplier: level * 5,
    startingGold: level * 50,
    statBonus: level,
  };
}

function areChaptersComplete(profile) {
  const cp = profile.chapterProgress || {};
  for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
    const chapter = cp[i];
    if (!chapter || !chapter.complete) return false;
  }
  return true;
}

function executePrestige(profile) {
  const newLevel = (profile.prestige ? profile.prestige.level : 0) + 1;
  const totalLevelsAccumulated = (profile.prestige?.totalLevels || 0) + profile.level;
  const kept = {
    achievements: [...(profile.achievements || [])],
    titles: [...(profile.titles || [])],
    activeTitle: profile.activeTitle,
    chengyu: [...(profile.chengyu || [])],
    bestiary: { ...(profile.bestiary || {}) },
    comboRecords: { ...(profile.comboRecords || {}) },
    companionFriendship: { ...(profile.companionFriendship || {}) },
    seasonalEvents: { ...(profile.seasonalEvents || {}) },
    luckyWheel: { ...(profile.luckyWheel || {}) },
    tutorialSeen: { ...(profile.tutorialSeen || {}) },
    _dailySeedMigrated: profile._dailySeedMigrated || false,
    name: profile.name,
    tier: profile.tier,
    difficultyBase: profile.difficultyBase,
    gender: profile.gender,
  };
  // Reset core stats
  profile.level = 1;
  profile.xp = 0;
  profile.attack = 5 + newLevel;
  profile.defense = 5 + newLevel;
  profile.speed = 3;
  profile.maxHp = 100;
  profile.hp = 100;
  profile.maxWenli = 3;
  profile.wenli = 3;
  profile.gold = newLevel * 50;
  profile.equipment = { weapon: null, armor: null, accessory: null };
  profile.inventory = [];
  profile.consumables = {};
  profile.chapterProgress = { 1: { questsCompleted: 0 } };
  profile.talents = {};
  profile.talentPoints = 0;
  profile.enchantments = {};
  profile.upgrades = {};
  // Restore kept data
  Object.assign(profile, kept);
  profile.prestige = {
    level: newLevel,
    totalLevels: totalLevelsAccumulated,
    bonuses: {
      xpMultiplier: newLevel * 10,
      goldMultiplier: newLevel * 5,
      startingGold: newLevel * 50,
      statBonus: newLevel,
    },
  };
  profile.chaptersRewarded = [];
  gameState.save();
}

function renderPrestige() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  if (!profile) {
    div.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-dim);">请先创建角色</div>';
    return div;
  }

  // Init prestige state
  if (!profile.prestige) {
    profile.prestige = { level: 0, totalLevels: 0, bonuses: { xpMultiplier: 0, goldMultiplier: 0, startingGold: 0, statBonus: 0 } };
  }

  const currentPrestige = getPrestigeLevel(profile);
  const nextPrestige = currentPrestige + 1;
  const bonuses = getPrestigeBonuses(nextPrestige);
  const currentBonuses = getPrestigeBonuses(currentPrestige);

  // Requirements
  const levelMet = profile.level >= 20;
  const chaptersMet = areChaptersComplete(profile);
  const canPrestige = levelMet && chaptersMet;

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes pr-fade-in {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes pr-star-glow {
      0%, 100% { text-shadow: 0 0 8px rgba(212,160,23,0.4); }
      50% { text-shadow: 0 0 20px rgba(212,160,23,0.8), 0 0 40px rgba(255,200,0,0.3); }
    }
    @keyframes pr-ascend {
      0% { transform: scale(1); opacity: 1; }
      30% { transform: scale(1.1); }
      60% { transform: scale(0.95) translateY(-20px); opacity: 0.8; }
      100% { transform: scale(3) translateY(-100px); opacity: 0; }
    }
    @keyframes pr-celebration {
      0% { opacity: 0; transform: scale(0.5); }
      50% { transform: scale(1.1); }
      100% { opacity: 1; transform: scale(1); }
    }
    @keyframes pr-sparkle {
      0%, 100% { opacity: 0; transform: scale(0) rotate(0deg); }
      50% { opacity: 1; transform: scale(1) rotate(180deg); }
    }
    @keyframes pr-btn-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(212,160,23,0.7); }
      50% { box-shadow: 0 0 0 16px rgba(212,160,23,0); }
    }
    @keyframes pr-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-6px); }
    }
  `;
  div.appendChild(style);

  // Star display for prestige level
  const stars = currentPrestige > 0
    ? Array(Math.min(currentPrestige, 10)).fill('⭐').join('')
    : '—';

  div.innerHTML += `
    <div style="
      display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh;
      background:linear-gradient(180deg, #0a0a14 0%, #1a1420 40%, #201020 70%, #0a0a14 100%);
    ">
      <!-- Header -->
      <div style="width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
        <button id="pr-back" style="
          padding:8px 16px;font-size:0.95rem;background:var(--bg-secondary);color:var(--text-primary);
          border:1px solid var(--border-color);border-radius:8px;cursor:pointer;
        ">← 返回</button>
        <h2 style="color:var(--accent-gold);font-size:1.3rem;font-weight:700;margin:0;">🏔️ 飞升</h2>
        <div style="width:70px;"></div>
      </div>

      <!-- Current Prestige -->
      <div style="
        width:100%;max-width:440px;text-align:center;margin-bottom:20px;
        padding:20px;background:var(--bg-secondary);border-radius:16px;
        border:1px solid rgba(212,160,23,0.3);
        animation: pr-fade-in 0.5s ease-out;
      ">
        <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:6px;">当前飞升等级</div>
        <div style="
          font-size:2rem;margin-bottom:8px;
          ${currentPrestige > 0 ? 'animation: pr-star-glow 2s ease-in-out infinite;' : ''}
        ">${stars}</div>
        <div style="font-size:1.5rem;font-weight:900;color:var(--accent-gold);">
          ${currentPrestige > 0 ? `第${currentPrestige}次飞升` : '尚未飞升'}
        </div>
        ${currentPrestige > 0 ? `
          <div style="
            display:flex;justify-content:center;gap:16px;margin-top:12px;
            padding:10px;background:rgba(212,160,23,0.08);border-radius:10px;
          ">
            <div style="text-align:center;">
              <div style="font-size:0.95rem;font-weight:700;color:var(--accent-jade);">+${currentBonuses.xpMultiplier}%</div>
              <div style="font-size:0.7rem;color:var(--text-dim);">经验</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.95rem;font-weight:700;color:var(--accent-gold);">+${currentBonuses.goldMultiplier}%</div>
              <div style="font-size:0.7rem;color:var(--text-dim);">金币</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:0.95rem;font-weight:700;color:#a855f7;">+${currentBonuses.statBonus}</div>
              <div style="font-size:0.7rem;color:var(--text-dim);">全属性</div>
            </div>
          </div>
        ` : ''}
      </div>

      <!-- Requirements -->
      <div style="
        width:100%;max-width:440px;margin-bottom:20px;
        animation: pr-fade-in 0.7s ease-out;
      ">
        <div style="font-size:1rem;color:var(--text-primary);font-weight:700;margin-bottom:10px;">
          📋 飞升条件
        </div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          <div style="
            display:flex;align-items:center;gap:10px;padding:12px 14px;
            background:${levelMet ? 'rgba(46,204,138,0.08)' : 'rgba(231,76,60,0.08)'};
            border-radius:10px;border:1px solid ${levelMet ? 'rgba(46,204,138,0.25)' : 'rgba(231,76,60,0.25)'};
          ">
            <span style="font-size:1.2rem;">${levelMet ? '✅' : '❌'}</span>
            <div style="flex:1;">
              <div style="font-size:0.95rem;color:${levelMet ? 'var(--accent-jade)' : '#e74c3c'};font-weight:600;">
                等级 ≥ 20
              </div>
              <div style="font-size:0.8rem;color:var(--text-dim);">当前等级: ${profile.level}</div>
            </div>
            ${!levelMet ? `
              <div style="
                width:60px;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden;
              ">
                <div style="width:${Math.min(100, Math.round((profile.level / 20) * 100))}%;height:100%;background:#e74c3c;border-radius:3px;"></div>
              </div>
            ` : ''}
          </div>
          <div style="
            display:flex;align-items:center;gap:10px;padding:12px 14px;
            background:${chaptersMet ? 'rgba(46,204,138,0.08)' : 'rgba(231,76,60,0.08)'};
            border-radius:10px;border:1px solid ${chaptersMet ? 'rgba(46,204,138,0.25)' : 'rgba(231,76,60,0.25)'};
          ">
            <span style="font-size:1.2rem;">${chaptersMet ? '✅' : '❌'}</span>
            <div style="flex:1;">
              <div style="font-size:0.95rem;color:${chaptersMet ? 'var(--accent-jade)' : '#e74c3c'};font-weight:600;">
                通关全部 ${TOTAL_CHAPTERS} 章
              </div>
              <div style="font-size:0.8rem;color:var(--text-dim);">
                ${(() => {
                  const cp = profile.chapterProgress || {};
                  let completed = 0;
                  for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
                    if (cp[i] && cp[i].complete) completed++;
                  }
                  return `已通关: ${completed} / ${TOTAL_CHAPTERS}`;
                })()}
              </div>
            </div>
            ${!chaptersMet ? `
              <div style="
                width:60px;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden;
              ">
                <div style="width:${(() => {
                  const cp = profile.chapterProgress || {};
                  let completed = 0;
                  for (let i = 1; i <= TOTAL_CHAPTERS; i++) {
                    if (cp[i] && cp[i].complete) completed++;
                  }
                  return Math.round((completed / TOTAL_CHAPTERS) * 100);
                })()}%;height:100%;background:#e74c3c;border-radius:3px;"></div>
              </div>
            ` : ''}
          </div>
        </div>
      </div>

      ${canPrestige ? `
        <!-- What will happen -->
        <div style="
          width:100%;max-width:440px;margin-bottom:20px;
          animation: pr-fade-in 0.9s ease-out;
        ">
          <!-- Kept Items -->
          <div style="margin-bottom:14px;">
            <div style="font-size:1rem;color:var(--accent-jade);font-weight:700;margin-bottom:8px;">
              ✅ 保留
            </div>
            <div style="
              padding:14px;background:rgba(46,204,138,0.06);border-radius:12px;
              border:1px solid rgba(46,204,138,0.2);
            ">
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${['成就', '称号', '成语', '图鉴', '好感度', '活动进度'].map(item => `
                  <span style="
                    padding:4px 12px;font-size:0.85rem;
                    background:rgba(46,204,138,0.12);color:var(--accent-jade);
                    border-radius:16px;border:1px solid rgba(46,204,138,0.25);
                  ">${item}</span>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- Reset Items -->
          <div style="margin-bottom:14px;">
            <div style="font-size:1rem;color:#e74c3c;font-weight:700;margin-bottom:8px;">
              ⚠️ 重置
            </div>
            <div style="
              padding:14px;background:rgba(231,76,60,0.06);border-radius:12px;
              border:1px solid rgba(231,76,60,0.2);
            ">
              <div style="display:flex;flex-wrap:wrap;gap:6px;">
                ${['等级', '属性', '金币', '装备', '章节', '天赋', '背包'].map(item => `
                  <span style="
                    padding:4px 12px;font-size:0.85rem;
                    background:rgba(231,76,60,0.12);color:#e74c3c;
                    border-radius:16px;border:1px solid rgba(231,76,60,0.25);
                  ">${item}</span>
                `).join('')}
              </div>
            </div>
          </div>

          <!-- New Bonuses -->
          <div>
            <div style="font-size:1rem;color:var(--accent-gold);font-weight:700;margin-bottom:8px;">
              🌟 获得加成 (第${nextPrestige}次飞升)
            </div>
            <div style="
              padding:14px;background:rgba(212,160,23,0.06);border-radius:12px;
              border:1px solid rgba(212,160,23,0.2);
            ">
              <div style="display:flex;flex-direction:column;gap:8px;">
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:1rem;">📈</span>
                  <span style="font-size:0.95rem;color:var(--text-primary);">经验获取 <strong style="color:var(--accent-jade);">+${bonuses.xpMultiplier}%</strong></span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:1rem;">🪙</span>
                  <span style="font-size:0.95rem;color:var(--text-primary);">金币获取 <strong style="color:var(--accent-gold);">+${bonuses.goldMultiplier}%</strong></span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:1rem;">💰</span>
                  <span style="font-size:0.95rem;color:var(--text-primary);">初始金币 <strong style="color:var(--accent-gold);">${bonuses.startingGold}</strong></span>
                </div>
                <div style="display:flex;align-items:center;gap:8px;">
                  <span style="font-size:1rem;">⚔️</span>
                  <span style="font-size:0.95rem;color:var(--text-primary);">全属性 <strong style="color:#a855f7;">+${bonuses.statBonus}</strong></span>
                </div>
              </div>
            </div>
          </div>
        </div>

        <!-- Prestige Confirmation Area -->
        <div id="pr-confirm-area" style="
          width:100%;max-width:440px;
          animation: pr-fade-in 1.1s ease-out;
        ">
          <div style="
            text-align:center;padding:20px;background:rgba(212,160,23,0.06);
            border-radius:16px;border:2px solid rgba(212,160,23,0.3);
          ">
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:12px;">
              输入「飞升」确认（此操作不可撤销）
            </div>
            <input id="pr-confirm-input" type="text" placeholder="飞升" autocomplete="off" style="
              width:160px;padding:10px 16px;font-size:1.2rem;text-align:center;
              background:var(--bg-secondary);color:var(--text-primary);
              border:2px solid var(--border-color);border-radius:10px;
              outline:none;margin-bottom:14px;
              font-family:inherit;
            " />
            <br />
            <button id="pr-ascend" disabled style="
              padding:16px 48px;font-size:1.4rem;font-weight:900;
              background:linear-gradient(135deg, #555, #444);
              color:#888;border:none;border-radius:14px;cursor:not-allowed;
              letter-spacing:0.15em;transition:all 0.3s ease;
            ">🏔️ 飞升</button>
          </div>
        </div>
      ` : `
        <!-- Cannot prestige yet -->
        <div style="
          width:100%;max-width:440px;text-align:center;padding:24px;
          background:var(--bg-secondary);border-radius:16px;border:1px solid var(--border-color);
          animation: pr-fade-in 0.9s ease-out;
        ">
          <div style="font-size:2rem;margin-bottom:8px;opacity:0.5;">🔒</div>
          <div style="font-size:1rem;color:var(--text-secondary);">达成所有条件后即可飞升</div>
          <div style="font-size:0.85rem;color:var(--text-dim);margin-top:6px;">飞升将重置进度，但获得永久加成</div>
        </div>
      `}

      <!-- Celebration Overlay (hidden by default) -->
      <div id="pr-celebration" style="
        display:none;position:fixed;top:0;left:0;right:0;bottom:0;
        background:rgba(0,0,0,0.9);z-index:9999;
        flex-direction:column;align-items:center;justify-content:center;
      ">
        <div id="pr-celebration-content" style="text-align:center;">
          <div style="
            font-size:5rem;margin-bottom:16px;
            animation: pr-celebration 1s ease-out;
          ">🏔️</div>
          <h2 style="
            font-size:2rem;font-weight:900;color:var(--accent-gold);
            text-shadow:0 0 30px rgba(212,160,23,0.6);margin:0 0 8px;
            animation: pr-celebration 1.2s ease-out;
          ">飞升成功！</h2>
          <div style="
            font-size:1.2rem;color:var(--text-secondary);margin-bottom:24px;
            animation: pr-celebration 1.4s ease-out;
          ">第${nextPrestige}次飞升完成</div>
          <div style="
            display:flex;justify-content:center;gap:20px;margin-bottom:32px;
            animation: pr-celebration 1.6s ease-out;
          ">
            <div style="text-align:center;">
              <div style="font-size:1.3rem;font-weight:700;color:var(--accent-jade);">+${bonuses.xpMultiplier}%</div>
              <div style="font-size:0.8rem;color:var(--text-dim);">经验</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:1.3rem;font-weight:700;color:var(--accent-gold);">+${bonuses.goldMultiplier}%</div>
              <div style="font-size:0.8rem;color:var(--text-dim);">金币</div>
            </div>
            <div style="text-align:center;">
              <div style="font-size:1.3rem;font-weight:700;color:#a855f7;">+${bonuses.statBonus}</div>
              <div style="font-size:0.8rem;color:var(--text-dim);">全属性</div>
            </div>
          </div>
          <button id="pr-continue" style="
            padding:14px 40px;font-size:1.1rem;font-weight:700;
            background:linear-gradient(135deg, var(--accent-gold), #e67e22);
            color:#fff;border:none;border-radius:12px;cursor:pointer;
            box-shadow:0 4px 20px rgba(212,160,23,0.4);
            animation: pr-celebration 1.8s ease-out;
          ">继续冒险</button>
        </div>
        <!-- Sparkle particles -->
        ${Array(8).fill(0).map((_, i) => `
          <div style="
            position:absolute;font-size:1.5rem;
            top:${20 + Math.random() * 60}%;left:${10 + Math.random() * 80}%;
            animation: pr-sparkle ${1.5 + Math.random()}s ease-in-out ${i * 0.3}s infinite;
          ">${['✨', '⭐', '🌟', '💫'][i % 4]}</div>
        `).join('')}
      </div>
    </div>`;

  // Event listeners
  setTimeout(() => {
    const backBtn = div.querySelector('#pr-back');
    if (backBtn) backBtn.addEventListener('click', () => { playSound('click'); showScreen('worldmap'); });

    const confirmInput = div.querySelector('#pr-confirm-input');
    const ascendBtn = div.querySelector('#pr-ascend');

    if (confirmInput && ascendBtn) {
      confirmInput.addEventListener('input', () => {
        const val = confirmInput.value.trim();
        if (val === '飞升') {
          ascendBtn.disabled = false;
          ascendBtn.style.background = 'linear-gradient(135deg, var(--accent-gold), #e67e22)';
          ascendBtn.style.color = '#fff';
          ascendBtn.style.cursor = 'pointer';
          ascendBtn.style.boxShadow = '0 4px 20px rgba(212,160,23,0.4)';
          ascendBtn.style.animation = 'pr-btn-pulse 2s ease-in-out infinite';
        } else {
          ascendBtn.disabled = true;
          ascendBtn.style.background = 'linear-gradient(135deg, #555, #444)';
          ascendBtn.style.color = '#888';
          ascendBtn.style.cursor = 'not-allowed';
          ascendBtn.style.boxShadow = 'none';
          ascendBtn.style.animation = 'none';
        }
      });

      ascendBtn.addEventListener('click', () => {
        if (ascendBtn.disabled) return;

        playSound('levelup');

        // Execute prestige
        executePrestige(profile);

        // Show celebration
        const celebration = div.querySelector('#pr-celebration');
        if (celebration) {
          celebration.style.display = 'flex';
        }

        showToast(`飞升成功！第${nextPrestige}次飞升`, 'success');
      });
    }

    const continueBtn = div.querySelector('#pr-continue');
    if (continueBtn) {
      continueBtn.addEventListener('click', () => {
        playSound('click');
        showScreen('worldmap');
      });
    }
  }, 0);

  return div;
}

registerScreen('prestige', renderPrestige);
