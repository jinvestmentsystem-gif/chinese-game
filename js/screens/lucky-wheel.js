// js/screens/lucky-wheel.js — Daily lucky wheel spin for bonus rewards
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { showToast } from '../toast.js';

// ─── Wheel segments: label, color, reward type, reward amount, weight ────────
const SEGMENTS = [
  { label: '💰 30金',    color: '#b8860b', rewardType: 'gold', amount: 30,  weight: 25 },
  { label: '✨ 20经验',  color: '#1a6b3c', rewardType: 'xp',   amount: 20,  weight: 20 },
  { label: '💰 50金',    color: '#8b6914', rewardType: 'gold', amount: 50,  weight: 20 },
  { label: '💊 回春丹',  color: '#6b2fa0', rewardType: 'hp-potion', amount: 1, weight: 10 },
  { label: '💰 100金',   color: '#a07828', rewardType: 'gold', amount: 100, weight: 10 },
  { label: '✨ 50经验',  color: '#0e7a45', rewardType: 'xp',   amount: 50,  weight: 8 },
  { label: '💰 200金',   color: '#c8a830', rewardType: 'gold', amount: 200, weight: 4 },
  { label: '🧪 灵墨丹',  color: '#3a1a6b', rewardType: 'wenli-potion', amount: 1, weight: 3 },
];

const TOTAL_WEIGHT = SEGMENTS.reduce((s, seg) => s + seg.weight, 0);

function getTodayDateStr() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

function pickWeightedSegment() {
  let roll = Math.random() * TOTAL_WEIGHT;
  for (let i = 0; i < SEGMENTS.length; i++) {
    roll -= SEGMENTS[i].weight;
    if (roll <= 0) return i;
  }
  return SEGMENTS.length - 1;
}

function applyReward(profile, segment) {
  switch (segment.rewardType) {
    case 'gold':
      profile.gold = (profile.gold || 0) + segment.amount;
      profile.stats.totalGoldEarned = (profile.stats.totalGoldEarned || 0) + segment.amount;
      break;
    case 'xp':
      profile.xp = (profile.xp || 0) + segment.amount;
      profile.stats.totalXP = (profile.stats.totalXP || 0) + segment.amount;
      break;
    case 'hp-potion':
      if (!profile.consumables) profile.consumables = {};
      profile.consumables['hp-potion'] = (profile.consumables['hp-potion'] || 0) + segment.amount;
      break;
    case 'wenli-potion':
      if (!profile.consumables) profile.consumables = {};
      profile.consumables['wenli-potion'] = (profile.consumables['wenli-potion'] || 0) + segment.amount;
      break;
  }
}

function renderLuckyWheel() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  if (!profile) {
    div.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">无档案数据</div>';
    return div;
  }

  if (!profile.luckyWheel) profile.luckyWheel = { lastSpinDate: null, totalSpins: 0 };

  const today = getTodayDateStr();
  const alreadySpun = profile.luckyWheel.lastSpinDate === today;

  // Build conic-gradient for wheel
  const segAngle = 360 / SEGMENTS.length; // 45deg each
  const gradientStops = SEGMENTS.map((seg, i) => {
    const start = i * segAngle;
    const end = (i + 1) * segAngle;
    return `${seg.color} ${start}deg ${end}deg`;
  }).join(', ');

  // Build segment labels positioned around the wheel
  const segmentLabelsHTML = SEGMENTS.map((seg, i) => {
    const midAngle = (i * segAngle) + (segAngle / 2);
    const rad = (midAngle - 90) * Math.PI / 180;
    const labelRadius = 105;
    const x = 150 + Math.cos(rad) * labelRadius;
    const y = 150 + Math.sin(rad) * labelRadius;
    return `<div style="
      position:absolute;
      left:${x}px; top:${y}px;
      transform:translate(-50%,-50%) rotate(${midAngle}deg);
      font-size:0.78rem;
      font-weight:700;
      color:#fff;
      text-shadow:0 1px 3px rgba(0,0,0,0.8);
      white-space:nowrap;
      pointer-events:none;
      width:80px;
      text-align:center;
    ">${seg.label}</div>`;
  }).join('');

  // Segment divider lines
  const dividerLines = SEGMENTS.map((_, i) => {
    const angle = i * segAngle;
    return `<div style="
      position:absolute;
      left:50%; top:50%;
      width:2px; height:150px;
      background:rgba(255,255,255,0.25);
      transform-origin:top center;
      transform:rotate(${angle}deg);
      pointer-events:none;
    "></div>`;
  }).join('');

  const style = document.createElement('style');
  style.textContent = `
    @keyframes wheel-spin {
      from { transform: rotate(0deg); }
      to { transform: rotate(var(--spin-to)); }
    }
    @keyframes wheel-glow-pulse {
      0%, 100% { box-shadow: 0 0 20px rgba(212,160,23,0.3), 0 0 40px rgba(212,160,23,0.1); }
      50% { box-shadow: 0 0 30px rgba(212,160,23,0.5), 0 0 60px rgba(212,160,23,0.2); }
    }
    @keyframes reward-pop {
      0% { transform: translate(-50%,-50%) scale(0); }
      60% { transform: translate(-50%,-50%) scale(1.1); }
      100% { transform: translate(-50%,-50%) scale(1); }
    }
    @keyframes pointer-bounce {
      0%, 100% { transform: translateX(-50%) translateY(0); }
      50% { transform: translateX(-50%) translateY(-4px); }
    }
    .lucky-wheel-container {
      position:relative;
      width:300px; height:300px;
      margin:0 auto 24px;
    }
    .lucky-wheel-disc {
      width:300px; height:300px;
      border-radius:50%;
      background:conic-gradient(${gradientStops});
      border:4px solid var(--accent-gold);
      position:relative;
      transition:none;
      box-shadow:0 0 20px rgba(212,160,23,0.3), 0 0 40px rgba(212,160,23,0.1);
    }
    .lucky-wheel-disc.idle {
      animation: wheel-glow-pulse 2s ease-in-out infinite;
    }
    .lucky-wheel-disc.spinning {
      animation: wheel-spin 4s cubic-bezier(0.17, 0.67, 0.12, 0.99) forwards;
    }
    .lucky-wheel-pointer {
      position:absolute;
      top:-18px; left:50%;
      transform:translateX(-50%);
      width:0; height:0;
      border-left:14px solid transparent;
      border-right:14px solid transparent;
      border-top:24px solid var(--accent-gold);
      filter:drop-shadow(0 2px 4px rgba(0,0,0,0.5));
      z-index:10;
      animation: pointer-bounce 1s ease-in-out infinite;
    }
    .lucky-wheel-center {
      position:absolute;
      top:50%; left:50%;
      transform:translate(-50%,-50%);
      width:48px; height:48px;
      border-radius:50%;
      background:var(--bg-card);
      border:3px solid var(--accent-gold);
      display:flex; align-items:center; justify-content:center;
      font-size:1.2rem; font-weight:700;
      color:var(--accent-gold);
      z-index:5;
      box-shadow:0 0 10px rgba(212,160,23,0.4);
    }
  `;
  div.appendChild(style);

  div.innerHTML += `
    <div style="width:100%;max-width:460px;margin:0 auto;padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;">
        <div>
          <h2 style="margin:0 0 4px;font-size:1.5rem;">幸运转盘</h2>
          <div style="font-size:0.9rem;color:var(--text-secondary);">每天一次免费抽奖</div>
        </div>
        <button class="btn" id="btn-back-wheel">返回</button>
      </div>

      <div style="text-align:center;margin-bottom:12px;">
        <div style="
          display:inline-block;
          background:var(--bg-card);
          border:1px solid var(--accent-gold);
          border-radius:8px;
          padding:6px 16px;
          font-size:0.95rem;
          color:var(--accent-gold);
          font-weight:700;
        ">
          已抽奖 ${profile.luckyWheel.totalSpins} 次
        </div>
      </div>

      <div class="lucky-wheel-container" id="wheel-container">
        <div class="lucky-wheel-pointer" id="wheel-pointer"></div>
        <div class="lucky-wheel-disc ${alreadySpun ? '' : 'idle'}" id="wheel-disc">
          ${dividerLines}
          ${segmentLabelsHTML}
        </div>
        <div class="lucky-wheel-center">转</div>
      </div>

      <div style="text-align:center;margin-bottom:16px;">
        <button class="btn btn-primary" id="btn-spin" style="
          font-size:1.15rem;
          padding:12px 40px;
          letter-spacing:0.08em;
          ${alreadySpun ? 'opacity:0.4;cursor:not-allowed;' : ''}
        " ${alreadySpun ? 'disabled' : ''}>
          ${alreadySpun ? '今日已抽奖' : '开始抽奖'}
        </button>
      </div>

      ${alreadySpun ? `
        <div style="
          text-align:center;
          padding:12px 20px;
          background:var(--bg-card);
          border-radius:8px;
          border:1px solid var(--bg-secondary);
          color:var(--text-secondary);
          font-size:0.95rem;
        ">
          明天再来试试运气吧！
        </div>
      ` : `
        <div style="
          text-align:center;
          padding:12px 20px;
          background:var(--bg-card);
          border-radius:8px;
          border:1px dashed rgba(212,160,23,0.3);
          color:var(--text-secondary);
          font-size:0.9rem;
        ">
          奖品: 金币 (30/50/100/200) · 经验 (20/50) · 回春丹 · 灵墨丹
        </div>
      `}

      <div id="reward-overlay" style="display:none;"></div>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back-wheel').addEventListener('click', () => {
      playSound('click');
      showScreen('chapter-map');
    });

    const spinBtn = div.querySelector('#btn-spin');
    const disc = div.querySelector('#wheel-disc');
    const pointer = div.querySelector('#wheel-pointer');
    let isSpinning = false;

    if (spinBtn && !alreadySpun) {
      spinBtn.addEventListener('click', () => {
        if (isSpinning || alreadySpun) return;
        isSpinning = true;

        playSound('click');
        spinBtn.disabled = true;
        spinBtn.style.opacity = '0.4';
        spinBtn.style.cursor = 'not-allowed';
        spinBtn.textContent = '抽奖中...';

        // Stop idle glow
        disc.classList.remove('idle');

        // Pick result
        const winIndex = pickWeightedSegment();
        const segment = SEGMENTS[winIndex];

        // Calculate rotation:
        // The pointer is at top (0deg). Segment i spans from i*45 to (i+1)*45 deg.
        // We need to rotate so that the winning segment aligns with the top pointer.
        // Target angle: place the center of the winning segment under the pointer.
        const segCenter = winIndex * segAngle + segAngle / 2;
        // We rotate clockwise, but conic-gradient goes clockwise from top.
        // To put segment center at pointer (top, 0deg), we need to rotate by (360 - segCenter).
        // Add full rotations for visual effect (5-8 full spins).
        const fullSpins = 5 + Math.floor(Math.random() * 4);
        const targetDeg = fullSpins * 360 + (360 - segCenter);

        disc.style.setProperty('--spin-to', `${targetDeg}deg`);
        disc.classList.add('spinning');
        pointer.style.animation = 'none';

        // After animation completes (4s)
        setTimeout(() => {
          // Apply reward
          applyReward(profile, segment);
          profile.luckyWheel.lastSpinDate = today;
          profile.luckyWheel.totalSpins = (profile.luckyWheel.totalSpins || 0) + 1;
          gameState.save();

          playSound('correct');

          // Show reward toast
          const rewardMessages = {
            'gold': `获得 ${segment.amount} 金币！`,
            'xp': `获得 ${segment.amount} 经验！`,
            'hp-potion': '获得回春丹！',
            'wenli-potion': '获得灵墨丹！',
          };
          const toastTypes = {
            'gold': 'gold',
            'xp': 'levelup',
            'hp-potion': 'item',
            'wenli-potion': 'item',
          };
          showToast(rewardMessages[segment.rewardType] || '获得奖品！', {
            type: toastTypes[segment.rewardType] || 'info',
            duration: 3500,
          });

          // Show reward overlay
          const overlay = div.querySelector('#reward-overlay');
          if (overlay) {
            overlay.style.display = 'block';
            overlay.innerHTML = `
              <div style="
                position:fixed; inset:0;
                background:rgba(0,0,0,0.6);
                display:flex; align-items:center; justify-content:center;
                z-index:100;
                animation:fadeIn 0.3s ease;
              ">
                <div style="
                  background:var(--bg-card);
                  border:2px solid var(--accent-gold);
                  border-radius:16px;
                  padding:28px 40px;
                  text-align:center;
                  max-width:320px;
                  box-shadow:0 0 40px rgba(212,160,23,0.3);
                  animation:reward-pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
                  position:relative;
                ">
                  <div style="font-size:2.5rem;margin-bottom:12px;">
                    ${segment.rewardType === 'gold' ? '💰' : segment.rewardType === 'xp' ? '✨' : segment.rewardType === 'hp-potion' ? '💊' : '🧪'}
                  </div>
                  <div style="font-size:0.9rem;letter-spacing:0.1em;color:var(--accent-gold);opacity:0.7;margin-bottom:6px;">恭喜获得</div>
                  <div style="font-size:1.4rem;font-weight:700;color:var(--accent-gold);margin-bottom:8px;">
                    ${segment.label}
                  </div>
                  <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;">
                    明天还有一次机会哦！
                  </div>
                  <button class="btn btn-primary" id="btn-reward-ok" style="padding:8px 28px;font-size:1rem;">好的</button>
                </div>
              </div>
            `;

            const okBtn = overlay.querySelector('#btn-reward-ok');
            if (okBtn) {
              okBtn.addEventListener('click', () => {
                playSound('click');
                showScreen('lucky-wheel');
              });
            }

            // Click backdrop to dismiss
            overlay.querySelector('div').addEventListener('click', (e) => {
              if (e.target === overlay.querySelector('div')) {
                playSound('click');
                showScreen('lucky-wheel');
              }
            });
          }
        }, 4200);
      });
    }
  }, 0);

  return div;
}

registerScreen('lucky-wheel', renderLuckyWheel);
