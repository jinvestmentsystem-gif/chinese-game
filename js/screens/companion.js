// js/screens/companion.js — Companion character system
// Provides a reusable function to show companion speech bubbles

const COMPANION_NAME = '墨小灵';

// Companion lines organized by situation
export const COMPANION = {
  // Combat reactions
  correctStreak2: [
    "连击！你的文字功力在增长！",
    "厉害厉害！墨暗的力量在动摇！",
    "就是这样！继续保持！",
  ],
  correctStreak4: [
    "太强了！你简直就是文字大师！",
    "四连击！敌人已经开始颤抖了！",
    "不可思议的连击！我都看呆了！",
  ],
  wrongAnswer: [
    "没关系，下一题一定能答对！",
    "别灰心！这个词确实很难呢。",
    "振作起来！我相信你！",
  ],
  lowHP: [
    "小心！你的生命值很低了……",
    "危险！要不要用提示技能？",
    "坚持住！我们快赢了！",
  ],
  victory: [
    "太棒了！又一个敌人被你击败了！",
    "胜利！文字的力量势不可挡！",
    "你真的越来越强了！墨暗应该害怕了。",
  ],
  defeat: [
    "没关系……失败是成功之母嘛。",
    "下次我们一定能赢！再试一次吧！",
  ],

  // Puzzle reactions
  puzzleStart: [
    "看！一道被墨暗封印的古老卷轴！",
    "这里有古老的文字结界……仔细读才能破解！",
    "又是一个封印！让我们一起解开它！",
  ],
  puzzleCorrect: [
    "答对了！封印在松动！",
    "就是这样！我能感觉到封印在减弱！",
  ],
  puzzleBroken: [
    "封印破了！你的阅读能力太强了！",
    "太厉害了！连封印都挡不住你！",
  ],

  // Boss reactions
  bossStart: [
    "小心……我感受到了强大的墨暗之力！",
    "这个BOSS很危险……准备好了吗？",
  ],
  bossPhaseChange: [
    "它变强了！集中注意力！",
    "BOSS进入新阶段了——别放松！",
  ],
  bossVictory: [
    "你……你居然真的打败了它！太了不起了！",
    "不敢相信！BOSS被你击败了！你就是真正的文字侠！",
  ],

  // Between encounters
  betweenEncounters: [
    "前方还有敌人……做好准备！",
    "你刚才表现得很好！继续加油！",
    "我感觉到前方有更强的敌人……小心！",
    "休息一下吧——哦不，又来了！",
  ],

  // Quest completion
  questComplete: [
    "这一关通过了！你真的太棒了！",
    "又向前迈进了一步！墨暗正在后退！",
  ],

  // Reward screen
  rewardXP: [
    "经验值在增加！能感受到你变强了！",
    "又变强了一点！距离大师越来越近了！",
  ],
  rewardLevelUp: [
    "升级了！！新能力解锁！太激动了！",
    "哇！你升级了！墨暗的末日不远了！",
  ],
  rewardItem: [
    "看看这个！我们找到了宝物！",
    "新装备！快看看属性怎么样！",
  ],
};

// Enemy taunts during combat
export const ENEMY_TAUNTS = {
  combat: [
    "哼，你以为认识几个字就能打败我？",
    "墨暗的力量是无穷的！你不过是……",
    "可笑！一个小小的人类想挑战文字之力？",
    "我要把你变成一个错别字！",
    "你的文字功力不过如此！",
  ],
  boss_cangjie: [
    "我是文字的创造者——你敢挑战造物主？",
    "这些文字是我的！我要收回它们！",
    "你不配拥有文字的力量！",
  ],
  boss_moli: [
    "历史由胜者书写——而今天的胜者是我！",
    "我会篡改所有的历史记录！",
  ],
  boss_shimo: [
    "诗歌之美？我只看到了诗歌的弱点！",
    "你的诗词修养能抵挡我的攻击吗？",
  ],
  boss_cisha: [
    "词中蕴含的情感——都将被墨暗吞噬！",
  ],
  boss_final: [
    "文字不过是束缚思想的枷锁。我要解放这个世界！",
    "你是最后的障碍。消灭你之后，文明将归于虚无。",
  ],
};

/**
 * Show a companion speech bubble on screen.
 * @param {HTMLElement} container — the screen div to attach the bubble to
 * @param {string} text — what the companion says
 * @param {number} duration — how long to show (ms), 0 = until manually removed
 * @returns {HTMLElement} the bubble element (for manual removal)
 */
export function showCompanionBubble(container, text, duration = 3000) {
  // Remove existing bubble
  const existing = container.querySelector('.companion-bubble-wrap');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.className = 'companion-bubble-wrap';
  wrap.style.cssText = `
    position:absolute; bottom:16px; left:16px; z-index:200;
    display:flex; align-items:flex-end; gap:8px;
    animation: companion-slide-in 0.3s ease-out;
    pointer-events:none;
  `;

  // Companion avatar — small ink spirit
  const avatar = document.createElement('div');
  avatar.style.cssText = `
    width:40px; height:40px; border-radius:50%;
    background: radial-gradient(circle at 40% 35%, #6c5ce7 0%, #2d1b69 80%);
    box-shadow: 0 0 12px rgba(108,92,231,0.5);
    position:relative; flex-shrink:0;
    animation: companion-float 2s ease-in-out infinite;
  `;
  // Eyes
  avatar.innerHTML = `
    <div style="position:absolute;top:12px;left:10px;width:6px;height:8px;background:#fff;border-radius:50%;"></div>
    <div style="position:absolute;top:12px;right:10px;width:6px;height:8px;background:#fff;border-radius:50%;"></div>
    <div style="position:absolute;top:14px;left:12px;width:3px;height:4px;background:#2d1b69;border-radius:50%;"></div>
    <div style="position:absolute;top:14px;right:12px;width:3px;height:4px;background:#2d1b69;border-radius:50%;"></div>
  `;

  // Speech bubble
  const bubble = document.createElement('div');
  bubble.style.cssText = `
    background:rgba(108,92,231,0.15); border:1px solid rgba(108,92,231,0.4);
    border-radius:12px 12px 12px 2px; padding:8px 14px;
    max-width:280px; font-size:0.95rem; color:#d0c8f0;
    backdrop-filter:blur(4px);
  `;
  bubble.innerHTML = `<strong style="color:#a29bfe;font-size:0.92rem;">${COMPANION_NAME}</strong><br>${text}`;

  wrap.appendChild(avatar);
  wrap.appendChild(bubble);

  // Inject animations if not already present
  if (!container.querySelector('#companion-styles')) {
    const style = document.createElement('style');
    style.id = 'companion-styles';
    style.textContent = `
      @keyframes companion-slide-in { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
      @keyframes companion-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
      @keyframes companion-slide-out { from { opacity:1; } to { opacity:0; transform:translateY(10px); } }
    `;
    container.appendChild(style);
  }

  container.appendChild(wrap);

  if (duration > 0) {
    setTimeout(() => {
      wrap.style.animation = 'companion-slide-out 0.3s ease-in forwards';
      setTimeout(() => wrap.remove(), 300);
    }, duration);
  }

  return wrap;
}

/**
 * Show an enemy taunt bubble (appears at top-right, red themed)
 */
export function showEnemyTaunt(container, text, duration = 2500) {
  const existing = container.querySelector('.enemy-taunt-wrap');
  if (existing) existing.remove();

  const wrap = document.createElement('div');
  wrap.className = 'enemy-taunt-wrap';
  wrap.style.cssText = `
    position:absolute; top:60px; right:16px; z-index:200;
    max-width:250px; pointer-events:none;
    animation: companion-slide-in 0.3s ease-out;
  `;

  const bubble = document.createElement('div');
  bubble.style.cssText = `
    background:rgba(192,57,43,0.15); border:1px solid rgba(192,57,43,0.4);
    border-radius:12px 12px 2px 12px; padding:8px 14px;
    font-size:0.95rem; color:#e8a0a0; font-style:italic;
  `;
  bubble.textContent = `"${text}"`;

  wrap.appendChild(bubble);

  // Reuse animation styles injected by showCompanionBubble, or inject them here
  if (!container.querySelector('#companion-styles')) {
    const style = document.createElement('style');
    style.id = 'companion-styles';
    style.textContent = `
      @keyframes companion-slide-in { from { transform:translateY(20px); opacity:0; } to { transform:translateY(0); opacity:1; } }
      @keyframes companion-float { 0%,100% { transform:translateY(0); } 50% { transform:translateY(-4px); } }
      @keyframes companion-slide-out { from { opacity:1; } to { opacity:0; transform:translateY(10px); } }
    `;
    container.appendChild(style);
  }

  container.appendChild(wrap);

  if (duration > 0) {
    setTimeout(() => {
      wrap.style.animation = 'companion-slide-out 0.3s ease-in forwards';
      setTimeout(() => wrap.remove(), 300);
    }, duration);
  }
  return wrap;
}

function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }
export { pick };
