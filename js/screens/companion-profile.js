// js/screens/companion-profile.js — 墨小灵 companion friendship screen
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { showToast } from '../toast.js';

const FRIENDSHIP_LEVELS = [
  { level: 1, xpNeeded: 0, title: '初次相遇', buff: null },
  { level: 2, xpNeeded: 20, title: '逐渐熟悉', buff: '提示消耗文力-1' },
  { level: 3, xpNeeded: 50, title: '值得信赖', buff: '经验+5%' },
  { level: 4, xpNeeded: 100, title: '知心好友', buff: '金币+5%' },
  { level: 5, xpNeeded: 180, title: '生死之交', buff: '暴击率+3%' },
  { level: 6, xpNeeded: 280, title: '灵魂伙伴', buff: '战斗后恢复5HP' },
  { level: 7, xpNeeded: 400, title: '心灵相通', buff: '连击伤害+5%' },
  { level: 8, xpNeeded: 550, title: '不可分离', buff: '防御+3' },
  { level: 9, xpNeeded: 720, title: '命运共同体', buff: '全属性+2' },
  { level: 10, xpNeeded: 999, title: '永恒之盟', buff: '墨小灵进化形态' },
];

const DIALOGUE = {
  1: ['你好啊，旅行者！我是墨小灵。', '这里好多有趣的文字呢！', '我们一起冒险吧！'],
  2: ['你来了！我好高兴！', '今天也要一起学习哦～', '你答题越来越棒了呢。'],
  3: ['有你在我就放心了。', '我相信你一定能成为文字侠！', '遇到困难不要怕，我会帮你的。'],
  4: ['我们已经是好朋友了呢！', '你是我最好的伙伴。', '和你在一起的每一天都很开心。'],
  5: ['你是我最重要的人。', '不管遇到什么，我都会站在你身边。', '一起经历了这么多，我们的羁绊不可动摇。'],
  6: ['我们的灵魂已经相连。', '我能感受到你的心意。', '这份牵绊，超越一切。'],
  7: ['不用说话，我也能懂你。', '心灵相通的感觉，真好。', '我们的默契，无人能及。'],
  8: ['没有你的世界，我无法想象。', '你就是我存在的意义。', '永远在一起，好吗？'],
  9: ['我们的命运已经交织在一起。', '共同的命运，共同的道路。', '有你，才有我。'],
  10: ['我已经进化了——这都是你的力量。', '永恒之盟已经缔结，不可破灭。', '感谢你一路走来，未来也请多多指教。'],
};

function getFriendshipLevel(xp) {
  let current = FRIENDSHIP_LEVELS[0];
  for (const fl of FRIENDSHIP_LEVELS) {
    if (xp >= fl.xpNeeded) current = fl;
    else break;
  }
  return current;
}

function getNextLevel(currentLevel) {
  if (currentLevel >= 10) return null;
  return FRIENDSHIP_LEVELS.find(fl => fl.level === currentLevel + 1);
}

function renderCompanionProfile() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  // Init companion friendship
  if (!profile.companionFriendship) {
    profile.companionFriendship = { xp: 0, interactions: 0, lastGiftDate: null };
    gameState.save();
  }

  const cf = profile.companionFriendship;
  const friendLevel = getFriendshipLevel(cf.xp);
  const nextLevel = getNextLevel(friendLevel.level);
  const isMaxLevel = friendLevel.level >= 10;
  const isEvolved = friendLevel.level >= 10;

  // Progress bar calculation
  const currentLevelXP = friendLevel.xpNeeded;
  const nextLevelXP = nextLevel ? nextLevel.xpNeeded : friendLevel.xpNeeded;
  const progressInLevel = cf.xp - currentLevelXP;
  const xpForNextLevel = nextLevelXP - currentLevelXP;
  const progressPct = isMaxLevel ? 100 : Math.min(100, Math.round((progressInLevel / xpForNextLevel) * 100));

  // Pick dialogue
  const dialoguePool = DIALOGUE[friendLevel.level] || DIALOGUE[1];
  const dialogueIndex = (cf.interactions || 0) % dialoguePool.length;
  const currentDialogue = dialoguePool[dialogueIndex];

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes cp-float {
      0%, 100% { transform: translateY(0); }
      50% { transform: translateY(-10px); }
    }
    @keyframes cp-glow {
      0%, 100% { box-shadow: 0 0 20px rgba(168,85,247,0.3), 0 0 40px rgba(168,85,247,0.1); }
      50% { box-shadow: 0 0 35px rgba(168,85,247,0.5), 0 0 60px rgba(168,85,247,0.2); }
    }
    @keyframes cp-evolved-glow {
      0%, 100% { box-shadow: 0 0 25px rgba(212,160,23,0.4), 0 0 50px rgba(168,85,247,0.2); }
      50% { box-shadow: 0 0 45px rgba(212,160,23,0.7), 0 0 70px rgba(168,85,247,0.3); }
    }
    @keyframes cp-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes cp-bubble {
      0% { opacity: 0; transform: scale(0.8) translateY(8px); }
      100% { opacity: 1; transform: scale(1) translateY(0); }
    }
    @keyframes cp-heart-burst {
      0% { opacity: 1; transform: scale(0) translateY(0); }
      50% { opacity: 1; transform: scale(1.3) translateY(-20px); }
      100% { opacity: 0; transform: scale(0.8) translateY(-40px); }
    }
    @keyframes cp-xp-flash {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
  `;
  div.appendChild(style);

  const avatarColor = isEvolved ? '#d4a017' : '#a855f7';
  const avatarGlowAnim = isEvolved ? 'cp-evolved-glow' : 'cp-glow';

  div.innerHTML += `
    <div style="
      display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh;
      background:linear-gradient(180deg, #0a0a14 0%, #1a0a28 50%, #0a0a14 100%);
    ">
      <!-- Header -->
      <div style="width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-between;margin-bottom:16px;">
        <button id="cp-back" style="
          padding:8px 16px;font-size:0.95rem;background:var(--bg-secondary);color:var(--text-primary);
          border:1px solid var(--border-color);border-radius:8px;cursor:pointer;
        ">← 返回</button>
        <h2 style="color:#a855f7;font-size:1.3rem;font-weight:700;margin:0;">🐾 同伴</h2>
        <div style="width:70px;"></div>
      </div>

      <!-- Companion Avatar & Name -->
      <div style="
        display:flex;flex-direction:column;align-items:center;margin-bottom:20px;
        animation: cp-fade-in 0.5s ease-out;
      ">
        <div style="
          width:120px;height:120px;border-radius:50%;
          background:radial-gradient(circle, ${avatarColor}33, ${avatarColor}11);
          border:3px solid ${avatarColor}88;
          display:flex;align-items:center;justify-content:center;
          animation: cp-float 3s ease-in-out infinite, ${avatarGlowAnim} 3s ease-in-out infinite;
          position:relative;margin-bottom:12px;
        ">
          <span style="font-size:3.5rem;filter:drop-shadow(0 0 8px ${avatarColor}88);">${isEvolved ? '🌟' : '🔮'}</span>
          ${isEvolved ? `<div style="
            position:absolute;top:-4px;right:-4px;font-size:1.5rem;
            animation:cp-float 2s ease-in-out infinite;
          ">👑</div>` : ''}
        </div>
        <h3 style="
          font-size:1.6rem;font-weight:900;color:${avatarColor};margin:0 0 4px;
          text-shadow:0 0 16px ${avatarColor}44;
        ">墨小灵${isEvolved ? ' · 进化形态' : ''}</h3>
        <div style="
          display:inline-flex;align-items:center;gap:6px;padding:4px 14px;
          background:${avatarColor}18;border-radius:20px;border:1px solid ${avatarColor}33;
        ">
          <span style="font-size:0.9rem;">💜</span>
          <span style="font-size:0.9rem;color:${avatarColor};font-weight:700;">好感度 Lv.${friendLevel.level}</span>
          <span style="font-size:0.85rem;color:var(--text-secondary);">— ${friendLevel.title}</span>
        </div>
      </div>

      <!-- Dialogue Bubble -->
      <div id="cp-dialogue" style="
        width:100%;max-width:400px;padding:16px 20px;margin-bottom:20px;
        background:var(--bg-secondary);border-radius:16px 16px 16px 4px;
        border:1px solid ${avatarColor}33;position:relative;
        animation: cp-bubble 0.6s ease-out;
      ">
        <div style="font-size:1.05rem;color:var(--text-primary);line-height:1.6;">"${currentDialogue}"</div>
        <div style="
          position:absolute;bottom:-6px;left:20px;width:12px;height:12px;
          background:var(--bg-secondary);border-bottom:1px solid ${avatarColor}33;
          border-left:1px solid ${avatarColor}33;transform:rotate(-45deg);
        "></div>
      </div>

      <!-- XP Progress Bar -->
      <div style="
        width:100%;max-width:420px;margin-bottom:20px;
        animation: cp-fade-in 0.7s ease-out;
      ">
        <div style="display:flex;justify-content:space-between;margin-bottom:6px;">
          <span style="font-size:0.85rem;color:var(--text-secondary);">好感经验</span>
          <span style="font-size:0.85rem;color:${avatarColor};">
            ${isMaxLevel ? 'MAX' : `${cf.xp} / ${nextLevelXP}`}
          </span>
        </div>
        <div style="
          width:100%;height:12px;background:var(--bg-secondary);border-radius:6px;
          overflow:hidden;border:1px solid var(--border-color);
        ">
          <div style="
            width:${progressPct}%;height:100%;border-radius:6px;
            background:linear-gradient(90deg, #a855f7, #d4a017);
            transition:width 0.6s ease;
            ${isMaxLevel ? 'background-image:linear-gradient(90deg, #d4a017, #e67e22, #d4a017); background-size:200% 100%; animation:cp-xp-flash 2s linear infinite;' : ''}
          "></div>
        </div>
        ${nextLevel ? `<div style="font-size:0.8rem;color:var(--text-dim);margin-top:4px;text-align:right;">
          距离下一级还需 ${nextLevelXP - cf.xp} 好感经验
        </div>` : ''}
      </div>

      <!-- Gift Button -->
      <div style="
        width:100%;max-width:420px;margin-bottom:20px;position:relative;
        animation: cp-fade-in 0.8s ease-out;
      ">
        <button id="cp-gift" style="
          width:100%;padding:14px;font-size:1.1rem;font-weight:700;
          background:linear-gradient(135deg, #a855f7, #7c3aed);
          color:#fff;border:none;border-radius:12px;cursor:pointer;
          box-shadow:0 4px 20px rgba(168,85,247,0.3);
          transition:transform 0.15s, box-shadow 0.15s;
          display:flex;align-items:center;justify-content:center;gap:8px;
        ">
          <span>🎁</span>
          <span>送礼</span>
          <span style="
            font-size:0.85rem;opacity:0.85;padding:2px 8px;
            background:rgba(255,255,255,0.15);border-radius:10px;
          ">50 🪙</span>
        </button>
        <div id="cp-heart-container" style="
          position:absolute;top:0;left:50%;transform:translateX(-50%);pointer-events:none;
        "></div>
      </div>

      <!-- Stats -->
      <div style="
        width:100%;max-width:420px;margin-bottom:20px;
        display:flex;gap:12px;
        animation: cp-fade-in 0.9s ease-out;
      ">
        <div style="
          flex:1;padding:14px;text-align:center;background:var(--bg-secondary);
          border-radius:12px;border:1px solid var(--border-color);
        ">
          <div style="font-size:1.5rem;font-weight:900;color:var(--accent-gold);">${cf.interactions || 0}</div>
          <div style="font-size:0.8rem;color:var(--text-dim);margin-top:2px;">互动次数</div>
        </div>
        <div style="
          flex:1;padding:14px;text-align:center;background:var(--bg-secondary);
          border-radius:12px;border:1px solid var(--border-color);
        ">
          <div style="font-size:1.5rem;font-weight:900;color:#a855f7;">${cf.xp}</div>
          <div style="font-size:0.8rem;color:var(--text-dim);margin-top:2px;">好感经验</div>
        </div>
        <div style="
          flex:1;padding:14px;text-align:center;background:var(--bg-secondary);
          border-radius:12px;border:1px solid var(--border-color);
        ">
          <div style="font-size:1.5rem;font-weight:900;color:var(--accent-jade);">${friendLevel.level}</div>
          <div style="font-size:0.8rem;color:var(--text-dim);margin-top:2px;">好感等级</div>
        </div>
      </div>

      <!-- Buff List -->
      <div style="
        width:100%;max-width:420px;
        animation: cp-fade-in 1s ease-out;
      ">
        <div style="font-size:1rem;color:var(--text-primary);font-weight:700;margin-bottom:10px;">
          🛡️ 同伴增益
        </div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${FRIENDSHIP_LEVELS.filter(fl => fl.buff).map(fl => {
            const unlocked = cf.xp >= fl.xpNeeded;
            return `
              <div style="
                display:flex;align-items:center;gap:10px;padding:10px 14px;
                background:${unlocked ? 'rgba(46,204,138,0.08)' : 'var(--bg-secondary)'};
                border-radius:10px;border:1px solid ${unlocked ? 'rgba(46,204,138,0.25)' : 'var(--border-color)'};
                opacity:${unlocked ? '1' : '0.55'};
              ">
                <div style="
                  width:28px;height:28px;border-radius:50%;display:flex;align-items:center;justify-content:center;
                  background:${unlocked ? 'rgba(46,204,138,0.2)' : 'rgba(255,255,255,0.05)'};
                  font-size:0.9rem;
                ">${unlocked ? '✅' : '🔒'}</div>
                <div style="flex:1;">
                  <div style="font-size:0.9rem;color:${unlocked ? 'var(--accent-jade)' : 'var(--text-dim)'};font-weight:600;">${fl.buff}</div>
                  <div style="font-size:0.75rem;color:var(--text-dim);">Lv.${fl.level} ${fl.title}</div>
                </div>
                ${!unlocked ? `<div style="font-size:0.75rem;color:var(--text-dim);">需要 ${fl.xpNeeded} XP</div>` : ''}
              </div>`;
          }).join('')}
        </div>
      </div>
    </div>`;

  // Event listeners
  setTimeout(() => {
    const backBtn = div.querySelector('#cp-back');
    if (backBtn) backBtn.addEventListener('click', () => { playSound('click'); showScreen('worldmap'); });

    const giftBtn = div.querySelector('#cp-gift');
    if (giftBtn) {
      giftBtn.addEventListener('mouseenter', () => {
        giftBtn.style.transform = 'scale(1.03)';
        giftBtn.style.boxShadow = '0 6px 30px rgba(168,85,247,0.5)';
      });
      giftBtn.addEventListener('mouseleave', () => {
        giftBtn.style.transform = 'scale(1)';
        giftBtn.style.boxShadow = '0 4px 20px rgba(168,85,247,0.3)';
      });
      giftBtn.addEventListener('click', () => {
        if (profile.gold < 50) {
          playSound('error');
          showToast('金币不足！需要50金币。', { type: 'error' });
          return;
        }
        playSound('purchase');
        profile.gold -= 50;
        cf.xp += 10;
        cf.interactions = (cf.interactions || 0) + 1;
        cf.lastGiftDate = new Date().toISOString().slice(0, 10);
        gameState.save();

        // Heart burst animation
        const container = div.querySelector('#cp-heart-container');
        if (container) {
          for (let i = 0; i < 5; i++) {
            const heart = document.createElement('span');
            heart.textContent = ['💜', '💖', '✨', '💕', '🎁'][i];
            heart.style.cssText = `
              position:absolute;font-size:1.3rem;
              left:${(Math.random() - 0.5) * 80}px;
              animation:cp-heart-burst 1s ease-out ${i * 0.1}s forwards;
              opacity:0;
            `;
            container.appendChild(heart);
            setTimeout(() => heart.remove(), 1200);
          }
        }

        // Check for level up
        const oldLevel = friendLevel.level;
        const newFriendLevel = getFriendshipLevel(cf.xp);
        if (newFriendLevel.level > oldLevel) {
          showToast(`好感度升级！Lv.${newFriendLevel.level} — ${newFriendLevel.title}`, { type: 'gold' });
        } else {
          showToast(`+10 好感经验！(${cf.xp}/${nextLevel ? nextLevel.xpNeeded : 'MAX'})`, { type: 'info' });
        }

        // Re-render the screen after a short delay
        setTimeout(() => showScreen('companion-profile'), 800);
      });
    }
  }, 0);

  return div;
}

registerScreen('companion-profile', renderCompanionProfile);
