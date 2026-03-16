// js/screens/encounter-intro.js — Dramatic encounter intro screen shown before combat/puzzle/boss
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { SPRITES, ENEMY_SPRITES } from '../sprites.js';

const COMBAT_INTROS = [
  { text: "一只墨灵挡住了你的去路！它扭曲着周围的文字……", action: "击败它！" },
  { text: "暗字兵从阴影中现身！它的身上刻满了被污染的文字。", action: "消灭敌人！" },
  { text: "墨影卫发现了你的踪迹！准备战斗！", action: "迎战！" },
  { text: "前方有敌人出没！它们想要阻止你恢复古老的文字。", action: "准备好了！" },
];

const PUZZLE_INTROS = [
  { text: "你发现了一卷被墨暗污染的古老卷轴。仔细阅读，才能解开封印。", action: "开始阅读" },
  { text: "一扇石门上刻着神秘的文字。读懂它们，门就会打开。", action: "解读文字" },
  { text: "前方的桥断了。石碑上的文字似乎记载着修复的方法……", action: "研读石碑" },
];

// Book icon SVG for puzzle encounters
const BOOK_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
  <defs>
    <radialGradient id="bi_glow" cx="50%" cy="60%" r="50%">
      <stop offset="0%" stop-color="#d4a017" stop-opacity="0.4"/>
      <stop offset="100%" stop-color="#d4a017" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="60" cy="148" rx="40" ry="8" fill="url(#bi_glow)"/>
  <rect x="20" y="28" width="80" height="104" rx="6" fill="#1a0a00"/>
  <rect x="20" y="28" width="80" height="104" rx="6" fill="none" stroke="#d4a017" stroke-width="2"/>
  <rect x="28" y="36" width="64" height="88" rx="3" fill="#2a1200"/>
  <line x1="60" y1="36" x2="60" y2="124" stroke="#d4a017" stroke-width="1.5" opacity="0.5"/>
  <rect x="32" y="44" width="24" height="3" rx="1.5" fill="#d4a017" opacity="0.7"/>
  <rect x="32" y="52" width="20" height="2" rx="1" fill="#c8a96e" opacity="0.5"/>
  <rect x="32" y="58" width="22" height="2" rx="1" fill="#c8a96e" opacity="0.5"/>
  <rect x="32" y="64" width="18" height="2" rx="1" fill="#c8a96e" opacity="0.4"/>
  <rect x="32" y="70" width="24" height="2" rx="1" fill="#c8a96e" opacity="0.5"/>
  <rect x="64" y="44" width="24" height="3" rx="1.5" fill="#d4a017" opacity="0.7"/>
  <rect x="64" y="52" width="20" height="2" rx="1" fill="#c8a96e" opacity="0.5"/>
  <rect x="64" y="58" width="22" height="2" rx="1" fill="#c8a96e" opacity="0.5"/>
  <rect x="64" y="64" width="18" height="2" rx="1" fill="#c8a96e" opacity="0.4"/>
  <rect x="64" y="70" width="24" height="2" rx="1" fill="#c8a96e" opacity="0.5"/>
  <text x="60" y="105" text-anchor="middle" font-size="22" fill="#d4a017" font-family="serif" opacity="0.9">文</text>
  <rect x="18" y="26" width="8" height="108" rx="3" fill="#8b4513"/>
  <rect x="18" y="26" width="8" height="108" rx="3" fill="none" stroke="#d4a017" stroke-width="1.5"/>
</svg>`;

// Boss icon SVG — ominous dark figure
const BOSS_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
  <defs>
    <radialGradient id="boss_aura" cx="50%" cy="80%" r="50%">
      <stop offset="0%" stop-color="#8b0000" stop-opacity="0.6"/>
      <stop offset="100%" stop-color="#8b0000" stop-opacity="0"/>
    </radialGradient>
  </defs>
  <ellipse cx="60" cy="152" rx="44" ry="10" fill="url(#boss_aura)"/>
  <path d="M60 20 L40 55 L20 50 L35 75 L15 80 L40 90 L30 130 L60 120 L90 130 L80 90 L105 80 L85 75 L100 50 L80 55 Z"
    fill="#1a0000" stroke="#8b0000" stroke-width="2"/>
  <ellipse cx="60" cy="42" rx="18" ry="22" fill="#1a0000" stroke="#8b0000" stroke-width="1.5"/>
  <ellipse cx="51" cy="38" rx="5" ry="4" fill="#8b0000" opacity="0.9"/>
  <ellipse cx="69" cy="38" rx="5" ry="4" fill="#8b0000" opacity="0.9"/>
  <circle cx="51" cy="38" r="2.5" fill="#ff2200"/>
  <circle cx="69" cy="38" r="2.5" fill="#ff2200"/>
  <path d="M52 48 Q60 52 68 48" stroke="#8b0000" stroke-width="2" fill="none"/>
  <path d="M40 20 L35 8 L45 15 M80 20 L85 8 L75 15" stroke="#8b0000" stroke-width="2" fill="none" stroke-linecap="round"/>
</svg>`;

function pickRandom(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function getEncounterSprite(type) {
  if (type === 'puzzle') return BOOK_SVG;
  if (type === 'boss') return BOSS_SVG;
  // combat — pick a random enemy sprite
  return pickRandom(ENEMY_SPRITES);
}

function getEncounterName(type) {
  if (type === 'puzzle') return '古老卷轴';
  if (type === 'boss') return '黑暗首领';
  const names = ['墨灵', '暗字兵', '墨影卫', '污文怪'];
  return pickRandom(names);
}

function renderEncounterIntro({ type, onComplete } = {}) {
  const encounterType = type || 'combat';
  const intros = encounterType === 'puzzle' ? PUZZLE_INTROS : COMBAT_INTROS;
  const intro = pickRandom(intros);
  const sprite = getEncounterSprite(encounterType);
  const name = getEncounterName(encounterType);

  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = `
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at center, #1a0a00 0%, #000 70%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 900;
    overflow: hidden;
  `;

  // Inject keyframe animations
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes ei-zoom-in {
      0%   { transform: scale(0.3) translateY(30px); opacity: 0; }
      60%  { transform: scale(1.15) translateY(-6px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes ei-flicker {
      0%, 100% { opacity: 1; }
      45%       { opacity: 0.85; }
      50%       { opacity: 1; }
      80%       { opacity: 0.9; }
    }
    @keyframes ei-pulse-ring {
      0%   { transform: scale(0.8); opacity: 0.6; }
      100% { transform: scale(2.2); opacity: 0; }
    }
    @keyframes ei-slide-up {
      from { transform: translateY(24px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes ei-text-glow {
      0%, 100% { text-shadow: 0 0 12px rgba(212,160,23,0.8), 0 0 28px rgba(212,160,23,0.4); }
      50%       { text-shadow: 0 0 24px rgba(212,160,23,1),   0 0 48px rgba(212,160,23,0.6); }
    }
  `;
  document.head.appendChild(styleEl);

  // Radial pulse rings behind sprite
  const ringsHtml = [0, 1, 2].map(i => `
    <div style="
      position:absolute;
      width:200px; height:200px;
      border-radius:50%;
      border:2px solid rgba(${encounterType === 'puzzle' ? '212,160,23' : '139,0,0'},0.5);
      animation: ei-pulse-ring 1.8s ease-out ${i * 0.6}s infinite;
      pointer-events:none;
    "></div>
  `).join('');

  div.innerHTML = `
    <div style="position:relative; display:flex; flex-direction:column; align-items:center; gap:0;">

      <!-- Pulse rings -->
      <div style="position:absolute; top:50%; left:50%; transform:translate(-50%,-50%); pointer-events:none;">
        ${ringsHtml}
      </div>

      <!-- Enemy sprite with zoom-in animation -->
      <div id="ei-sprite" style="
        animation: ei-zoom-in 0.7s cubic-bezier(0.34,1.56,0.64,1) both,
                   ei-flicker 3s ease-in-out 0.8s infinite;
        filter: drop-shadow(0 0 24px rgba(${encounterType === 'puzzle' ? '212,160,23' : '139,0,0'},0.9));
        margin-bottom: 1.5rem;
        position:relative; z-index:2;
      ">${sprite}</div>

      <!-- Enemy name -->
      <div style="
        font-size: 2rem;
        font-weight: 900;
        color: #f0e8d0;
        letter-spacing: 0.15em;
        animation: ei-slide-up 0.5s ease-out 0.5s both, ei-text-glow 2.5s ease-in-out 1s infinite;
        margin-bottom: 1rem;
        text-align: center;
      ">${name}</div>

      <!-- Context line -->
      <div style="
        font-size: 1.05rem;
        color: #c8a96e;
        line-height: 1.7;
        max-width: 420px;
        text-align: center;
        letter-spacing: 0.06em;
        animation: ei-slide-up 0.5s ease-out 0.7s both;
        margin-bottom: 2rem;
        padding: 0 1rem;
      ">${intro.text}</div>

      <!-- Action button -->
      <button id="ei-action-btn" style="
        padding: 0.75rem 2.5rem;
        background: transparent;
        border: 2px solid ${encounterType === 'puzzle' ? '#d4a017' : '#cc2200'};
        color: ${encounterType === 'puzzle' ? '#d4a017' : '#ff4444'};
        font-size: 1.3rem;
        font-weight: 700;
        letter-spacing: 0.2em;
        cursor: pointer;
        border-radius: 6px;
        font-family: var(--font-main);
        animation: ei-slide-up 0.5s ease-out 0.9s both;
        transition: background 0.2s, transform 0.1s;
      ">${intro.action}</button>
    </div>
  `;

  let proceeded = false;

  function proceed() {
    if (proceeded) return;
    proceeded = true;
    try { playSound('click'); } catch (_) {}

    // Fade out then call onComplete
    div.style.transition = 'opacity 0.35s ease-out';
    div.style.opacity = '0';
    setTimeout(() => {
      div.remove();
      styleEl.remove();
      if (onComplete) onComplete();
    }, 360);
  }

  // Auto-advance after 3 seconds if not clicked
  const autoTimer = setTimeout(proceed, 3000);

  setTimeout(() => {
    const btn = div.querySelector('#ei-action-btn');
    if (btn) {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        clearTimeout(autoTimer);
        proceed();
      });
      btn.addEventListener('mouseenter', () => {
        btn.style.background = encounterType === 'puzzle'
          ? 'rgba(212,160,23,0.15)'
          : 'rgba(204,34,0,0.15)';
        btn.style.transform = 'scale(1.04)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'transparent';
        btn.style.transform = 'scale(1)';
      });
    }

    // Play suspense sound
    try { playSound('encounter'); } catch (_) {}
  }, 0);

  return div;
}

registerScreen('encounter-intro', renderEncounterIntro);
