// js/screens/encounter-intro.js — Dramatic encounter intro screen shown before combat/puzzle/boss
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { SPRITES, ENEMY_SPRITES } from '../sprites.js';
import { gameState } from '../state.js';

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

// Era-specific background tints keyed by chapter
const ERA_TINTS = {
  1: { center: '#1a0e00', edge: '#000',     tintRgb: '180,130,60'  },  // xianqin: bronze
  2: { center: '#1a0000', edge: '#000',     tintRgb: '200,60,60'   },  // han: red
  3: { center: '#1a0a00', edge: '#000',     tintRgb: '212,160,23'  },  // tang: gold
  4: { center: '#001a10', edge: '#000',     tintRgb: '46,204,138'  },  // song: jade
  5: { center: '#0a0018', edge: '#000',     tintRgb: '140,80,255'  },  // modern: purple
};

function renderEncounterIntro({ type, onComplete } = {}) {
  const encounterType = type || 'combat';
  const isCombat = encounterType === 'combat';
  const isBoss   = encounterType === 'boss';

  // ── Skip logic: skip intro if player has seen 3+ encounters this quest ──
  const quest = gameState.currentQuest;
  if (quest && !isBoss) {
    const completedCount = quest.encounters.filter(e => e.completed).length;
    if (completedCount >= 3) {
      // Skip the intro entirely for repeat encounters (non-boss)
      if (onComplete) setTimeout(onComplete, 0);
      const emptyDiv = document.createElement('div');
      emptyDiv.className = 'screen';
      emptyDiv.style.display = 'none';
      return emptyDiv;
    }
  }

  const intros = encounterType === 'puzzle' ? PUZZLE_INTROS : COMBAT_INTROS;
  const intro = pickRandom(intros);
  const sprite = getEncounterSprite(encounterType);
  const name = getEncounterName(encounterType);

  const accentRgb = (isCombat || isBoss) ? '139,0,0' : '212,160,23';

  // ── Era-specific background tint ──
  const chapterId = quest?.chapterId || 1;
  const eraTint = ERA_TINTS[chapterId] || ERA_TINTS[3]; // default to tang gold

  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = `
    position: fixed;
    inset: 0;
    background: radial-gradient(ellipse at center, ${eraTint.center} 0%, ${eraTint.edge} 70%);
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
      0%   { transform: scale(0.2) translateY(40px); opacity: 0; }
      55%  { transform: scale(1.18) translateY(-8px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes ei-flicker {
      0%, 100% { opacity: 1; }
      45%       { opacity: 0.82; }
      50%       { opacity: 1; }
      80%       { opacity: 0.88; }
    }
    @keyframes ei-pulse-ring {
      0%   { transform: scale(0.7); opacity: 0.7; }
      100% { transform: scale(2.8); opacity: 0; }
    }
    @keyframes ei-pulse-ring-inner {
      0%   { transform: scale(0.9); opacity: 0.5; }
      100% { transform: scale(2.0); opacity: 0; }
    }
    @keyframes ei-slide-up {
      from { transform: translateY(28px); opacity: 0; }
      to   { transform: translateY(0);    opacity: 1; }
    }
    @keyframes ei-name-glow {
      0%, 100% {
        text-shadow: 0 0 14px rgba(212,160,23,0.9), 0 0 32px rgba(212,160,23,0.5), 2px 2px 0 rgba(0,0,0,0.8);
      }
      50% {
        text-shadow: 0 0 28px rgba(212,160,23,1), 0 0 60px rgba(212,160,23,0.7), 0 0 90px rgba(212,160,23,0.3), 2px 2px 0 rgba(0,0,0,0.8);
      }
    }
    @keyframes ei-name-glow-red {
      0%, 100% {
        text-shadow: 0 0 14px rgba(214,48,49,0.9), 0 0 32px rgba(214,48,49,0.5), 2px 2px 0 rgba(0,0,0,0.8);
      }
      50% {
        text-shadow: 0 0 28px rgba(214,48,49,1), 0 0 60px rgba(214,48,49,0.7), 0 0 90px rgba(214,48,49,0.3), 2px 2px 0 rgba(0,0,0,0.8);
      }
    }
    @keyframes ei-rumble {
      0%   { transform: translate(0,0) rotate(0deg); }
      15%  { transform: translate(-5px, 3px) rotate(-0.5deg); }
      30%  { transform: translate(5px, -3px) rotate(0.5deg); }
      45%  { transform: translate(-4px, 4px) rotate(-0.3deg); }
      60%  { transform: translate(4px, -2px) rotate(0.3deg); }
      75%  { transform: translate(-3px, 3px) rotate(-0.2deg); }
      90%  { transform: translate(3px, -1px) rotate(0.1deg); }
      100% { transform: translate(0,0) rotate(0deg); }
    }
    @keyframes ei-flash {
      0%   { opacity: 0.9; }
      100% { opacity: 0; }
    }
    @keyframes ei-edge-flash {
      0%   { opacity: 1; }
      40%  { opacity: 0.6; }
      100% { opacity: 0; }
    }
    @keyframes ei-btn-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(212,160,23,0.8), 0 2px 12px rgba(0,0,0,0.5); }
      50%      { box-shadow: 0 0 0 12px rgba(212,160,23,0), 0 2px 12px rgba(0,0,0,0.5); }
    }
    @keyframes ei-btn-pulse-red {
      0%,100% { box-shadow: 0 0 0 0 rgba(214,48,49,0.8), 0 2px 12px rgba(0,0,0,0.5); }
      50%      { box-shadow: 0 0 0 12px rgba(214,48,49,0), 0 2px 12px rgba(0,0,0,0.5); }
    }
    @keyframes ei-vs-drop {
      0%   { transform: scale(4) translateY(-30px); opacity: 0; }
      55%  { transform: scale(0.85) translateY(6px); opacity: 1; }
      75%  { transform: scale(1.05) translateY(-2px); opacity: 1; }
      100% { transform: scale(1) translateY(0); opacity: 1; }
    }
    @keyframes ei-vignette-in {
      from { opacity: 0; }
      to   { opacity: 1; }
    }
    @keyframes ei-bg-breathe {
      0%, 100% { opacity: 0.85; }
      50%       { opacity: 1; }
    }
  `;
  document.head.appendChild(styleEl);

  // Vignette overlay — strong dark edges, bright centre for dramatic focus
  const vignette = document.createElement('div');
  vignette.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 1;
    background: radial-gradient(ellipse 65% 65% at center, transparent 20%, rgba(0,0,0,0.6) 60%, rgba(0,0,0,0.92) 100%);
    animation: ei-vignette-in 0.5s ease-out both;
  `;
  div.appendChild(vignette);

  // Screen-edge flash — colored burst that bleeds from all edges then fades
  const edgeFlash = document.createElement('div');
  const flashColor = (isCombat || isBoss) ? 'rgba(139,0,0,0.7)' : 'rgba(168,85,247,0.5)';
  edgeFlash.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 10;
    box-shadow: inset 0 0 120px 40px ${flashColor};
    opacity: 0;
    animation: ei-edge-flash 0.7s ease-out 0.05s both;
  `;
  div.appendChild(edgeFlash);

  // White center flash — quick punch of light when sprite appears
  const flash = document.createElement('div');
  flash.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 11;
    background: radial-gradient(ellipse 40% 40% at center, rgba(255,255,255,0.7) 0%, transparent 70%);
    opacity: 0;
    animation: ei-flash 0.18s ease-out 0.08s both;
  `;
  div.appendChild(flash);

  // Radial pulse rings behind sprite — 3 rings at different sizes + 2 inner rings
  const ringsHtml = [
    { size: 180, delay: 0,    border: 2.5, anim: 'ei-pulse-ring',       dur: 2.0 },
    { size: 180, delay: 0.65, border: 2,   anim: 'ei-pulse-ring',       dur: 2.0 },
    { size: 180, delay: 1.3,  border: 1.5, anim: 'ei-pulse-ring',       dur: 2.0 },
    { size: 120, delay: 0.2,  border: 1.5, anim: 'ei-pulse-ring-inner', dur: 1.5 },
    { size: 120, delay: 0.95, border: 1,   anim: 'ei-pulse-ring-inner', dur: 1.5 },
  ].map(r => `
    <div style="
      position:absolute;
      width:${r.size}px; height:${r.size}px;
      border-radius:50%;
      border:${r.border}px solid rgba(${accentRgb},0.55);
      animation: ${r.anim} ${r.dur}s ease-out ${r.delay}s infinite;
      pointer-events:none;
      top:50%; left:50%; transform:translate(-50%,-50%);
    "></div>
  `).join('');

  // VS text — only for combat encounters
  const vsHtml = isCombat ? `
    <div id="ei-vs" style="
      font-size: 5rem;
      font-weight: 900;
      color: #fff;
      letter-spacing: 0.15em;
      text-shadow:
        0 0 20px rgba(212,160,23,1),
        0 0 50px rgba(212,160,23,0.6),
        0 0 80px rgba(212,160,23,0.3),
        3px 3px 0 #8b0000,
        -1px -1px 0 rgba(0,0,0,0.5);
      animation: ei-vs-drop 0.6s cubic-bezier(0.34,1.56,0.64,1) 0.5s both;
      margin-bottom: 0.5rem;
      line-height: 1;
    ">VS</div>
  ` : '';

  const nameGlowAnim = (isCombat || isBoss) ? 'ei-name-glow-red' : 'ei-name-glow';
  const btnPulseAnim = (isCombat || isBoss) ? 'ei-btn-pulse-red' : 'ei-btn-pulse';
  const btnBorderColor = encounterType === 'puzzle' ? '#d4a017' : '#cc2200';
  const btnTextColor   = encounterType === 'puzzle' ? '#f0c040' : '#ff6666';
  const btnBgHover     = encounterType === 'puzzle' ? 'rgba(212,160,23,0.15)' : 'rgba(204,34,0,0.18)';

  div.innerHTML += `
    <div id="ei-scene" style="
      position:relative;
      display:flex;
      flex-direction:column;
      align-items:center;
      gap:0;
      z-index:2;
      padding: 0 24px;
    ">

      <!-- Pulse rings — centered behind sprite -->
      <div style="
        position:absolute;
        top: 90px;
        left:50%;
        transform:translate(-50%,-50%);
        pointer-events:none;
      ">
        ${ringsHtml}
      </div>

      <!-- Enemy sprite with zoom-in animation -->
      <div id="ei-sprite" style="
        animation: ei-zoom-in 0.75s cubic-bezier(0.34,1.56,0.64,1) 0.08s both,
                   ei-flicker 3.5s ease-in-out 0.9s infinite;
        filter: drop-shadow(0 0 30px rgba(${accentRgb},1)) drop-shadow(0 0 8px rgba(${accentRgb},0.5));
        margin-bottom: 1.2rem;
        position:relative;
        z-index:2;
      ">${sprite}</div>

      ${vsHtml}

      <!-- Enemy name — large and glowing -->
      <div style="
        font-size: 2.6rem;
        font-weight: 900;
        color: #f8edd4;
        letter-spacing: 0.18em;
        animation: ei-slide-up 0.5s ease-out 0.48s both, ${nameGlowAnim} 2.5s ease-in-out 1s infinite;
        margin-bottom: 1.1rem;
        text-align: center;
        line-height: 1.2;
      ">${name}</div>

      <!-- Context line -->
      <div style="
        font-size: 1rem;
        color: #c8a96e;
        line-height: 1.75;
        max-width: 400px;
        text-align: center;
        letter-spacing: 0.05em;
        animation: ei-slide-up 0.5s ease-out 0.7s both;
        margin-bottom: 2.2rem;
        padding: 0 0.5rem;
        opacity: 0.9;
      ">${intro.text}</div>

      <!-- Action button with pulsing border glow -->
      <button id="ei-action-btn" style="
        padding: 0.85rem 3rem;
        background: linear-gradient(145deg, rgba(0,0,0,0.6), rgba(20,10,30,0.7));
        border: 2px solid ${btnBorderColor};
        color: ${btnTextColor};
        font-size: 1.35rem;
        font-weight: 700;
        letter-spacing: 0.22em;
        cursor: pointer;
        border-radius: 8px;
        font-family: var(--font-main);
        animation: ei-slide-up 0.5s ease-out 0.9s both, ${btnPulseAnim} 1.6s ease-in-out 1.4s infinite;
        transition: background 0.2s, transform 0.15s, filter 0.2s;
        text-shadow: 0 0 12px currentColor;
        backdrop-filter: blur(4px);
      ">${intro.action}</button>
    </div>
  `;

  let proceeded = false;

  function proceed() {
    if (proceeded) return;
    proceeded = true;
    try { playSound('click'); } catch (_) {}

    // Fade out then call onComplete (defensive: div may already be removed by router)
    if (div && div.parentNode) {
      div.style.transition = 'opacity 0.35s ease-out';
      div.style.opacity = '0';
    }
    setTimeout(() => {
      try { if (div?.parentNode) div.remove(); } catch (_) {}
      try { if (styleEl?.parentNode) styleEl.remove(); } catch (_) {}
      if (onComplete) onComplete();
    }, 360);
  }

  // Rumble + sound when sprite appears
  setTimeout(() => {
    const scene = div.querySelector('#ei-scene');
    if (scene) {
      scene.style.animation = 'ei-rumble 0.2s ease-out';
      setTimeout(() => { scene.style.animation = ''; }, 220);
    }
    // Play encounter-appropriate sound
    try {
      if (isBoss) {
        playSound('boss_roar');
      } else if (isCombat) {
        playSound('attack');
      } else {
        playSound('encounter');
      }
    } catch (_) {}
  }, 120);

  // Auto-advance: boss encounters get full 3s, non-boss get a quicker 2s
  const autoAdvanceMs = isBoss ? 3000 : 2000;
  const autoTimer = setTimeout(proceed, autoAdvanceMs);

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
          ? 'rgba(212,160,23,0.18)'
          : 'rgba(204,34,0,0.2)';
        btn.style.transform = 'scale(1.05) translateY(-2px)';
        btn.style.filter = 'brightness(1.2)';
      });
      btn.addEventListener('mouseleave', () => {
        btn.style.background = 'linear-gradient(145deg, rgba(0,0,0,0.6), rgba(20,10,30,0.7))';
        btn.style.transform = 'scale(1)';
        btn.style.filter = '';
      });
    }
  }, 0);

  return div;
}

registerScreen('encounter-intro', renderEncounterIntro);
