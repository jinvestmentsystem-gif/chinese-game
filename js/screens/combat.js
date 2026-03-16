// js/screens/combat.js — Vocab combat encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';
import { hasAbility } from '../progression.js';
import { SPRITES, ENEMY_SPRITES } from '../sprites.js';
import { playSound, playMusic, setMusicIntensity, playStinger } from '../audio.js';
import { showCompanionBubble, showEnemyTaunt, COMPANION, ENEMY_TAUNTS, pick } from './companion.js';

const ENEMY_NAMES = ['墨灵', '暗字兵', '墨影卫', '乱笔妖', '黑墨士'];

const COMBAT_NARRATIVES = [
  "墨灵释放出混乱的文字——用你的知识反击！",
  "敌人扭曲了这个词的含义——纠正它来造成伤害！",
  "暗字兵向你投射文字攻击——看穿它的破绽！",
  "一道文字谜题化作攻击飞来——回答正确才能格挡！",
  "墨影卫试图混淆你的记忆——展示你真正的文字力量！",
];

// ─── Animation helpers ────────────────────────────────────────────────────────

function shakeElement(el, intensity = 6, duration = 400) {
  if (!el) return;
  let start = null;
  const period = 50;
  function step(ts) {
    if (!start) start = ts;
    const elapsed = ts - start;
    if (elapsed >= duration) { el.style.transform = ''; return; }
    const dir = (Math.floor(elapsed / period) % 2 === 0) ? intensity : -intensity;
    el.style.transform = `translateX(${dir}px)`;
    requestAnimationFrame(step);
  }
  requestAnimationFrame(step);
}

function lungeElement(el, dx, duration = 200, onDone) {
  if (!el) return;
  el.style.transition = `transform ${duration}ms ease-out`;
  el.style.transform = `translateX(${dx}px)`;
  setTimeout(() => {
    el.style.transition = `transform ${duration}ms ease-in`;
    el.style.transform = '';
    if (onDone) setTimeout(onDone, duration);
  }, duration);
}

function floatingNumber(container, text, x, y, color = '#fff') {
  const num = document.createElement('div');
  num.textContent = text;
  num.style.cssText = `
    position:absolute; left:${x}px; top:${y}px;
    color:${color}; font-size:1.8rem; font-weight:900;
    text-shadow: 0 0 8px ${color}, 2px 2px 0 #000;
    pointer-events:none; z-index:999;
    transform:translateY(0); opacity:1;
    transition: transform 0.9s ease-out, opacity 0.9s ease-out;
  `;
  container.appendChild(num);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      num.style.transform = 'translateY(-70px)';
      num.style.opacity = '0';
    });
  });
  setTimeout(() => num.remove(), 1000);
}

function slashEffect(container, x1, y1, x2, y2, color = '#fff') {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    pointer-events:none; z-index:998;
  `;
  const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
  line.setAttribute('x1', x1); line.setAttribute('y1', y1);
  line.setAttribute('x2', x2); line.setAttribute('y2', y2);
  line.setAttribute('stroke', color);
  line.setAttribute('stroke-width', '4');
  line.setAttribute('stroke-linecap', 'round');
  line.style.opacity = '1';
  svg.appendChild(line);
  container.appendChild(svg);
  // Fade out
  setTimeout(() => { svg.style.transition = 'opacity 0.15s'; svg.style.opacity = '0'; }, 100);
  setTimeout(() => svg.remove(), 300);
}

function redFlashOverlay(container) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute; inset:0; background:#c0392b;
    opacity:0; pointer-events:none; z-index:997;
    transition: opacity 0.1s ease-in;
  `;
  container.appendChild(overlay);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { overlay.style.opacity = '0.35'; });
  });
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.3s ease-out';
    overlay.style.opacity = '0';
  }, 120);
  setTimeout(() => overlay.remove(), 500);
}

function greenFlash(el) {
  if (!el) return;
  const orig = el.style.background;
  el.style.transition = 'background 0.1s';
  el.style.background = 'rgba(39,174,96,0.4)';
  setTimeout(() => {
    el.style.transition = 'background 0.3s';
    el.style.background = orig || '';
  }, 150);
}

function particleExplosion(container, cx, cy, count = 12) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const angle = (i / count) * Math.PI * 2;
    const dist = 60 + Math.random() * 80;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const size = 6 + Math.random() * 8;
    const colors = ['#d4a017', '#f39c12', '#e74c3c', '#27ae60', '#e8e8e8'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      position:absolute;
      left:${cx - size / 2}px; top:${cy - size / 2}px;
      width:${size}px; height:${size}px;
      background:${color}; border-radius:50%;
      pointer-events:none; z-index:996;
      opacity:1;
      transition: transform 0.7s ease-out, opacity 0.7s ease-out;
    `;
    container.appendChild(p);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        p.style.transform = `translate(${tx}px, ${ty}px)`;
        p.style.opacity = '0';
      });
    });
    setTimeout(() => p.remove(), 800);
  }
}

function startBreathingAnimation(el) {
  if (!el) return;
  let scale = 1;
  let dir = 1;
  let frame;
  function tick() {
    scale += dir * 0.0015;
    if (scale >= 1.04) dir = -1;
    if (scale <= 0.97) dir = 1;
    el.style.transform = `scale(${scale})`;
    frame = requestAnimationFrame(tick);
  }
  frame = requestAnimationFrame(tick);
  return () => cancelAnimationFrame(frame);
}

// ─── Victory mini-sequence ────────────────────────────────────────────────────

function showVictorySequence(container, enemyWrap, div, onComplete) {
  try { playSound('victory'); } catch (_) {}

  // "胜利！" text bounce in
  const victoryText = document.createElement('div');
  victoryText.textContent = '胜利！';
  victoryText.style.cssText = `
    position:absolute; top:35%; left:50%;
    transform:translate(-50%,-50%) scale(0);
    color:#d4a017; font-size:2.8rem; font-weight:900;
    text-shadow: 0 0 20px #d4a017, 0 0 40px #f39c12, 2px 2px 0 #000;
    pointer-events:none; z-index:1002;
    transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
  `;
  container.appendChild(victoryText);

  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      victoryText.style.transform = 'translate(-50%,-50%) scale(1)';
    });
  });

  // "+XP" float up
  const quest = gameState.currentQuest;
  const xpEarned = (quest && quest.results)
    ? quest.results.correct * 10 + (quest.results.maxCombo || 0) * 5
    : 0;

  const xpNum = document.createElement('div');
  xpNum.textContent = `+${xpEarned} XP`;
  xpNum.style.cssText = `
    position:absolute; top:48%; left:50%;
    transform:translate(-50%,0) translateY(0);
    color:var(--accent-jade); font-size:1.5rem; font-weight:700;
    text-shadow: 0 0 8px #27ae60, 2px 2px 0 #000;
    pointer-events:none; z-index:1002; opacity:0;
    transition: transform 1.2s ease-out 0.2s, opacity 0.3s ease-out 0.2s;
  `;
  container.appendChild(xpNum);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      xpNum.style.opacity = '1';
      xpNum.style.transform = 'translate(-50%,0) translateY(-50px)';
    });
  });
  setTimeout(() => {
    xpNum.style.transition = 'opacity 0.4s ease-in';
    xpNum.style.opacity = '0';
  }, 1400);

  // Loot sparkle if items found
  const items = (quest && quest.results && quest.results.itemsFound) ? quest.results.itemsFound : [];
  if (items.length > 0) {
    const lootEl = document.createElement('div');
    lootEl.textContent = '📦 ' + items[0];
    lootEl.style.cssText = `
      position:absolute; top:57%; left:50%;
      transform:translate(-50%,-50%) scale(0);
      color:var(--accent-gold); font-size:1.2rem; font-weight:700;
      pointer-events:none; z-index:1002;
      transition: transform 0.4s cubic-bezier(0.34,1.56,0.64,1) 0.5s, opacity 0.4s ease-out 1.6s;
      opacity:1;
    `;
    container.appendChild(lootEl);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        lootEl.style.transform = 'translate(-50%,-50%) scale(1)';
      });
    });
    // Sparkle dots
    for (let i = 0; i < 4; i++) {
      const dot = document.createElement('div');
      const angle = (i / 4) * Math.PI * 2;
      dot.style.cssText = `
        position:absolute; top:57%; left:50%;
        width:6px; height:6px; border-radius:50%; background:#d4a017;
        pointer-events:none; z-index:1003;
        transform:translate(-50%,-50%) scale(0);
        transition: transform 0.5s ease-out 0.6s, opacity 0.5s ease-out 0.6s;
        opacity:1;
      `;
      container.appendChild(dot);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const tx = Math.cos(angle) * 30;
          const ty = Math.sin(angle) * 30;
          dot.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`;
          dot.style.opacity = '0';
        });
      });
      setTimeout(() => dot.remove(), 1200);
    }
    setTimeout(() => lootEl.remove(), 2100);
  }

  setTimeout(() => {
    victoryText.remove();
    xpNum.remove();
    onComplete();
  }, 2000);
}

// ─── Mini-progress bar ────────────────────────────────────────────────────────

function createMiniProgress(container) {
  const quest = gameState.currentQuest;
  if (!quest) return;

  const bar = document.createElement('div');
  bar.style.cssText = `
    position:absolute; top:0; left:0; right:0; z-index:50;
    display:flex; align-items:center; justify-content:center;
    gap:6px; padding:6px 16px;
    background:rgba(0,0,0,0.4); backdrop-filter:blur(4px);
    font-size:0.75rem; color:var(--text-secondary);
  `;

  const dotsHTML = quest.encounters.map((enc, i) => {
    const completed = enc.completed;
    const current = i === quest.currentEncounter;
    const dotStyle = completed ? 'background:var(--accent-gold);'
                   : current ? 'background:var(--accent-jade);animation:dot-pulse 1s infinite;'
                   : 'background:var(--bg-secondary);';
    return `<div style="width:10px;height:10px;border-radius:50%;${dotStyle}" title="${enc.type}"></div>`;
  }).join('');

  const encounterNum = quest.currentEncounter + 1;
  const total = quest.encounters.length;
  const chapterId = quest.chapterId;

  bar.innerHTML = `
    <div style="display:flex;gap:4px;align-items:center;">${dotsHTML}</div>
    <span style="margin-left:8px;">第${encounterNum}/${total}关</span>
    <span style="margin-left:auto;color:var(--accent-gold);">第${chapterId}章</span>
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes dot-pulse { 0%,100% { box-shadow:0 0 0 0 rgba(39,174,96,0.5); } 50% { box-shadow:0 0 0 4px rgba(39,174,96,0); } }`;
  bar.appendChild(style);

  container.insertBefore(bar, container.firstChild);
}

// ─── Main render ─────────────────────────────────────────────────────────────

function renderCombat() {
  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = 'position:relative; overflow:hidden;';

  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  const questions = encounter.questions;
  let qIndex = 0;
  let playerHp = profile.hp;
  let enemyHp = 100;
  let combo = 0;
  let timerInterval = null;
  let timerPulseInterval = null;
  let doubleActive = false;

  // ── Balatro-style multiplicative scoring ──
  let chips = 0;
  let multiplier = 1.0;
  let totalScore = 0;

  // Start battle music — explicitly set era and intensity
  const chapterId = gameState.currentQuest?.chapterId || 1;
  const eraMap = {1:'xianqin',2:'han',3:'tang',4:'song',5:'modern'};
  playMusic(eraMap[chapterId] || 'xianqin');
  playStinger('battle_start');
  setTimeout(() => setMusicIntensity(1), 300);
  const enemyName = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
  const baseTimer = 20 + (profile.speed * 1.5);
  const enemySvg = ENEMY_SPRITES[Math.floor(Math.random() * ENEMY_SPRITES.length)];

  // Cancel breathing animations cleanup refs
  let stopPlayerBreath = null;
  let stopEnemyBreath = null;

  function stopBreaths() {
    if (stopPlayerBreath) { stopPlayerBreath(); stopPlayerBreath = null; }
    if (stopEnemyBreath) { stopEnemyBreath(); stopEnemyBreath = null; }
  }

  // ── Score panel updater ──
  function updateScorePanel(animateMultReset = false) {
    const panel = div.querySelector('#score-panel');
    if (!panel) return;
    const roundedMult = multiplier.toFixed(1);
    const score = Math.round(chips * multiplier);
    totalScore = score;

    if (animateMultReset) {
      // Multiplier BREAK: red flash, number visibly drops
      panel.style.transition = 'background 0.05s';
      panel.style.background = 'rgba(192,57,43,0.35)';
      setTimeout(() => {
        panel.style.transition = 'background 0.4s';
        panel.style.background = 'rgba(0,0,0,0.5)';
      }, 80);
    }

    panel.innerHTML = `
      <span id="score-chips" style="color:#e8e8e8;">得分: <strong>${chips}</strong></span>
      <span style="color:var(--accent-gold); margin:0 6px;">×</span>
      <span id="score-mult" style="color:${multiplier >= 3.0 ? '#e74c3c' : multiplier >= 2.0 ? '#e67e22' : 'var(--accent-gold)'};font-weight:900;transition:transform 0.2s,color 0.2s;">${roundedMult}×</span>
      <span style="color:var(--text-secondary); margin:0 6px;">=</span>
      <span id="score-total" style="color:var(--accent-jade);font-weight:700;">${score}</span>
    `;
  }

  function animateMultiplierPulse() {
    const multEl = div.querySelector('#score-mult');
    if (!multEl) return;
    multEl.style.transform = 'scale(1.6)';
    multEl.style.textShadow = '0 0 12px #d4a017';
    setTimeout(() => {
      multEl.style.transform = 'scale(1)';
      multEl.style.textShadow = '';
    }, 250);
  }

  function render() {
    stopBreaths();
    clearInterval(timerPulseInterval);

    const q = questions[qIndex];
    if (!q) { endCombat(true); return; }
    const optionsHTML = q.options.map((opt, i) => `
      <button class="combat-option" data-idx="${i}">${opt}</button>
    `).join('');

    // Pick a random narrative line for this question
    const combatNarrative = COMBAT_NARRATIVES[Math.floor(Math.random() * COMBAT_NARRATIVES.length)];

    // Combo color
    let comboColor = 'var(--accent-gold)';
    if (combo >= 6) comboColor = '#e74c3c';
    else if (combo >= 4) comboColor = '#e67e22';

    // ── Enemy intent: damage on wrong answer / timeout ──
    const wrongDamage = Math.round(15 * (1 - profile.defense * 0.01));
    const timeoutDamage = Math.round(20 * (1 - profile.defense * 0.01));

    div.innerHTML = `
      <style>
        .combat-hud { display:flex; justify-content:space-between; width:100%; padding:16px 32px; padding-top:44px; }
        .hp-section { text-align:center; }
        .hp-bar-bg { width:200px; height:16px; background:var(--bg-secondary); border-radius:8px; overflow:hidden; margin-top:4px; }
        .hp-bar { height:100%; border-radius:8px; transition:width 0.3s; }
        .hp-player { background:var(--hp-green); }
        .hp-enemy { background:var(--hp-red); }
        .timer-bar-bg { width:80%; max-width:500px; height:8px; background:var(--bg-secondary); border-radius:4px; overflow:hidden; margin:8px auto; }
        .timer-bar { height:100%; background:var(--timer-yellow); border-radius:4px; transition:width 0.1s linear; }
        .combo-display { font-size:1.2rem; font-weight:700; min-height:1.5em; display:flex; align-items:center; justify-content:center; }
        .combat-question { font-size:1.3rem; margin:12px 0 16px; padding:0 32px; text-align:center; }
        .combat-options { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:0 32px; max-width:600px; width:100%; }
        .combat-option {
          font-family:var(--font-main); font-size:1rem; padding:14px 20px; background:var(--bg-card);
          border:2px solid var(--bg-secondary); color:var(--text-primary); border-radius:8px;
          cursor:pointer; transition:all 0.2s; text-align:center;
        }
        .combat-option:hover { border-color:var(--accent-gold); }
        .combat-option.correct { border-color:var(--accent-jade); background:rgba(39,174,96,0.2); }
        .combat-option.wrong { border-color:var(--accent-red); background:rgba(192,57,43,0.2); }
        .feedback-text { font-size:0.95rem; color:var(--text-secondary); margin-top:12px; padding:0 32px; text-align:center; min-height:3em; }
        .combat-narrative { font-style:italic; font-size:0.88rem; color:#d4a017; text-align:center; padding:4px 32px; opacity:0.85; text-shadow:0 0 6px rgba(212,160,23,0.4); }
        .battle-arena { display:flex; align-items:flex-end; justify-content:space-between; width:100%; max-width:600px; padding:0 32px; margin:8px 0; position:relative; min-height:160px; }
        .sprite-wrap { display:flex; flex-direction:column; align-items:center; position:relative; }
        .sprite-label { font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px; }
        .sprite-svg { display:block; }
        .enemy-intent-bar {
          display:flex; gap:16px; justify-content:center;
          font-size:0.85rem; margin:4px 0 2px; opacity:0.9;
          padding:5px 20px; border-radius:6px;
          background:rgba(0,0,0,0.35);
          border:1px solid rgba(192,57,43,0.25);
          max-width:420px; width:100%; box-sizing:border-box;
        }
        .score-panel {
          display:flex; align-items:center; justify-content:center; gap:4px;
          font-size:0.9rem; padding:5px 18px;
          background:rgba(0,0,0,0.5);
          border:1px solid rgba(212,160,23,0.3);
          border-radius:6px; max-width:320px; width:100%;
          box-sizing:border-box;
        }
        @keyframes multPulse {
          0%   { transform:scale(1); }
          50%  { transform:scale(1.6); text-shadow:0 0 12px #d4a017; }
          100% { transform:scale(1); }
        }
      </style>

      <div class="combat-hud">
        <div class="hp-section">
          <div style="font-weight:700;">${profile.name}</div>
          <div class="hp-bar-bg"><div class="hp-bar hp-player" id="player-hp" style="width:${(playerHp / profile.maxHp) * 100}%"></div></div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">HP: ${playerHp}/${profile.maxHp}</div>
        </div>
        <div class="combo-display" id="combo" style="color:${comboColor};">${combo > 1 ? combo + ' 连击！' : ''}</div>
        <div class="hp-section">
          <div style="font-weight:700; color:var(--accent-red);">${enemyName}</div>
          <div class="hp-bar-bg"><div class="hp-bar hp-enemy" id="enemy-hp" style="width:${enemyHp}%"></div></div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">HP: ${enemyHp}%</div>
        </div>
      </div>

      <div class="battle-arena" id="arena">
        <div class="sprite-wrap" id="player-sprite-wrap">
          <div class="sprite-label">${profile.name}</div>
          <div id="player-sprite" class="sprite-svg" style="width:80px;height:150px;display:flex;align-items:center;justify-content:center;">${SPRITES.player}</div>
        </div>
        <div style="flex:1;"></div>
        <div class="sprite-wrap" id="enemy-sprite-wrap">
          <div class="sprite-label" style="color:var(--accent-red);">${enemyName}</div>
          <div id="enemy-sprite" class="sprite-svg" style="width:80px;height:150px;display:flex;align-items:center;justify-content:center;">${enemySvg}</div>
        </div>
      </div>

      <div style="display:flex;flex-direction:column;align-items:center;gap:4px;width:100%;">
        <div class="enemy-intent-bar">
          <span style="color:var(--accent-red);">⚠ 答错: -${wrongDamage} HP</span>
          <span style="color:#f39c12;">⏱ 超时: -${timeoutDamage} HP</span>
        </div>
        <div class="score-panel" id="score-panel">
          <span style="color:#e8e8e8;">得分: <strong>${chips}</strong></span>
          <span style="color:var(--accent-gold); margin:0 6px;">×</span>
          <span id="score-mult" style="color:var(--accent-gold);font-weight:900;">${multiplier.toFixed(1)}×</span>
          <span style="color:var(--text-secondary); margin:0 6px;">=</span>
          <span id="score-total" style="color:var(--accent-jade);font-weight:700;">${Math.round(chips * multiplier)}</span>
        </div>
      </div>

      <div class="timer-bar-bg"><div class="timer-bar" id="timer-bar" style="width:100%"></div></div>
      <div class="combat-narrative">${combatNarrative}</div>
      <div class="combat-question">${q.prompt}</div>
      <div class="combat-options" id="options">${optionsHTML}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;" id="abilities"></div>
      <div class="feedback-text" id="feedback"></div>
    `;

    // Start breathing animations
    const playerSpriteEl = div.querySelector('#player-sprite');
    const enemySpriteEl = div.querySelector('#enemy-sprite');
    stopPlayerBreath = startBreathingAnimation(playerSpriteEl);
    stopEnemyBreath = startBreathingAnimation(enemySpriteEl);

    // ── Timer ──
    let timeLeft = baseTimer;
    const timerBar = div.querySelector('#timer-bar');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timerBar) timerBar.style.width = Math.max(0, (timeLeft / baseTimer) * 100) + '%';

      // Timer pulse at < 3s
      if (timeLeft < 3 && timeLeft > 0) {
        clearInterval(timerPulseInterval);
        timerPulseInterval = null;
        if (!timerPulseInterval) {
          timerPulseInterval = setInterval(() => {
            if (!timerBar) return;
            const opVal = timerBar.style.opacity === '0.5' ? '1' : '0.5';
            timerBar.style.opacity = opVal;
            // Shake at < 2s
            if (timeLeft < 2) {
              const shiftVal = timerBar.style.marginLeft === '4px' ? '-4px' : '4px';
              timerBar.style.marginLeft = shiftVal;
            }
          }, 150);
        }
      }

      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        clearInterval(timerPulseInterval);
        handleAnswer(-1, q);
      }
    }, 100);

    // ── Ability buttons ──
    const abilitiesEl = div.querySelector('#abilities');
    if (abilitiesEl) {
      let btns = '';
      if (hasAbility(profile, 'hint'))   btns += `<button class="btn" id="btn-hint"   style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 1 ? 'disabled' : ''}>提示 (1文力)</button>`;
      if (hasAbility(profile, 'skip'))   btns += `<button class="btn" id="btn-skip"   style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>跳过 (2文力)</button>`;
      if (hasAbility(profile, 'double')) btns += `<button class="btn" id="btn-double" style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>双倍 (2文力)</button>`;
      abilitiesEl.innerHTML = btns;
    }

    const hintBtn = div.querySelector('#btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => {
      if (profile.wenli < 1) return;
      profile.wenli--;
      const wrongBtns = [...div.querySelectorAll('.combat-option')].filter(b => parseInt(b.dataset.idx) !== q.correct);
      if (wrongBtns.length > 1) {
        wrongBtns[0].style.opacity = '0.3';
        wrongBtns[0].style.pointerEvents = 'none';
      }
      hintBtn.disabled = true;
    });

    const skipBtn = div.querySelector('#btn-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => {
      if (profile.wenli < 2) return;
      profile.wenli -= 2;
      clearInterval(timerInterval);
      clearInterval(timerPulseInterval);
      qIndex++;
      if (qIndex >= questions.length) { endCombat(true); return; }
      render();
    });

    const doubleBtn = div.querySelector('#btn-double');
    if (doubleBtn) doubleBtn.addEventListener('click', () => {
      if (profile.wenli < 2) return;
      profile.wenli -= 2;
      doubleActive = true;
      doubleBtn.disabled = true;
      doubleBtn.textContent = '双倍 ✓';
    });

    div.querySelectorAll('.combat-option').forEach(btn => {
      btn.addEventListener('click', () => {
        clearInterval(timerInterval);
        clearInterval(timerPulseInterval);
        const idx = parseInt(btn.dataset.idx);
        handleAnswer(idx, q);
      });
    });
  }

  function handleAnswer(idx, q) {
    stopBreaths();
    const correct = idx === q.correct;
    const buttons = div.querySelectorAll('.combat-option');
    buttons.forEach(btn => {
      btn.style.pointerEvents = 'none';
      const bIdx = parseInt(btn.dataset.idx);
      if (bIdx === q.correct) btn.classList.add('correct');
      else if (bIdx === idx) btn.classList.add('wrong');
    });

    recordAnswer('vocab', correct, q.id);

    const arena = div.querySelector('#arena');
    const playerSprite = div.querySelector('#player-sprite');
    const enemySprite = div.querySelector('#enemy-sprite');
    const playerWrap = div.querySelector('#player-sprite-wrap');
    const enemyWrap = div.querySelector('#enemy-sprite-wrap');
    const optionsPanel = div.querySelector('#options');

    // Click sound on every answer
    playSound('click');

    // Correct/wrong SFX — fire immediately before animation delays
    if (correct) {
      playSound('correct');
      playSound('attack');
    } else {
      playSound('wrong');
      playSound('hit');
    }

    if (correct) {
      combo++;
      // Ramp music intensity with combo
      if (combo >= 5) setMusicIntensity(3);
      else if (combo >= 3) setMusicIntensity(2);

      const dmgMultiplier = (1 + (combo > 1 ? combo * 0.15 : 0) + (profile.attack * 0.01)) * (doubleActive ? 2 : 1);
      doubleActive = false;
      const dmg = Math.round(20 * dmgMultiplier);
      enemyHp = Math.max(0, enemyHp - dmg);

      // ── Update Balatro scoring ──
      // Speed bonus: remaining timer approximated from last known timeLeft via closure
      // We add a flat 10 chips + speed bonus embedded here
      const speedBonus = Math.round(baseTimer * 0.3); // approximate bonus, not exact timeLeft
      chips += 10 + speedBonus;
      multiplier = parseFloat((multiplier + 0.5).toFixed(1));
      updateScorePanel(false);
      setTimeout(() => animateMultiplierPulse(), 80);

      // Floating score gain above score panel
      const scorePanel = div.querySelector('#score-panel');
      if (scorePanel) {
        const spRect = scorePanel.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const numX = spRect.left - divRect.left + spRect.width / 2 - 20;
        const numY = spRect.top - divRect.top - 5;
        floatingNumber(div, `+${chips} ×${multiplier.toFixed(1)}`, numX - 30, numY, '#d4a017');
      }

      // Player lunges forward
      lungeElement(playerSprite, 50, 200, null);

      // Slash effect (diagonal line through center of arena)
      if (arena) {
        const arenaRect = arena.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const relX = arenaRect.left - divRect.left;
        const relY = arenaRect.top - divRect.top;
        const cx = relX + arenaRect.width / 2;
        const cy = relY + arenaRect.height / 2;
        slashEffect(div, cx - 60, cy - 40, cx + 60, cy + 40, '#fff');
        setTimeout(() => slashEffect(div, cx - 40, cy - 60, cx + 20, cy + 20, '#d4a017'), 80);
      }

      // Enemy shakes after slight delay
      setTimeout(() => shakeElement(enemySprite, 8, 350), 220);

      // Floating damage number above enemy sprite
      if (enemyWrap) {
        const ewRect = enemyWrap.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const numX = ewRect.left - divRect.left + ewRect.width / 2 - 20;
        const numY = ewRect.top - divRect.top - 10;
        floatingNumber(div, `-${dmg}`, numX, numY, '#e74c3c');
      }

      // Green flash on options panel
      if (optionsPanel) greenFlash(optionsPanel);

      // Combo display — flash gold, show "+1 COMBO!", shake at 3+
      const comboEl = div.querySelector('#combo');
      if (comboEl) {
        let comboColor = 'var(--accent-gold)';
        if (combo >= 6) comboColor = '#e74c3c';
        else if (combo >= 4) comboColor = '#e67e22';

        // Flash gold briefly on increment
        comboEl.style.transition = 'color 0.05s, transform 0.3s ease-out';
        comboEl.style.color = '#fff';
        setTimeout(() => { comboEl.style.color = comboColor; }, 80);

        // Show "+1 COMBO!" text briefly, then the running count
        comboEl.textContent = '+1 COMBO!';
        comboEl.style.color = '#d4a017';
        comboEl.style.transform = 'scale(1.7)';
        setTimeout(() => {
          comboEl.textContent = combo > 1 ? combo + ' 连击！' : '';
          comboEl.style.color = comboColor;
          comboEl.style.transform = 'scale(1)';
        }, 400);

        // Shake the combo counter at 3+
        if (combo >= 3) {
          shakeElement(comboEl, 5, 350);
        }
      }

      div.querySelector('#feedback').textContent = `✓ 正确！造成 ${dmg} 点伤害！${q.explanation}`;

      // Update enemy HP bar
      const enemyHpBar = div.querySelector('#enemy-hp');
      if (enemyHpBar) enemyHpBar.style.width = enemyHp + '%';

      // Companion combo reactions — only on notable milestones
      if (combo === 2) showCompanionBubble(div, pick(COMPANION.correctStreak2));
      else if (combo === 4) showCompanionBubble(div, pick(COMPANION.correctStreak4));

    } else {
      combo = 0;
      setMusicIntensity(1); // Drop back to base battle intensity
      const hpLoss = Math.round(15 * (1 - profile.defense * 0.01));
      playerHp = Math.max(0, playerHp - hpLoss);

      // ── Multiplier BREAK animation ──
      multiplier = 1.0;
      updateScorePanel(true); // triggers red flash on panel

      // Enemy lunges toward player
      lungeElement(enemySprite, -50, 200, null);

      // Player shakes
      setTimeout(() => shakeElement(playerSprite, 8, 350), 220);

      // Red screen flash
      redFlashOverlay(div);

      // Floating "-HP" above player
      if (playerWrap) {
        const pwRect = playerWrap.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const numX = pwRect.left - divRect.left + pwRect.width / 2 - 15;
        const numY = pwRect.top - divRect.top - 10;
        floatingNumber(div, `-${hpLoss}HP`, numX, numY, '#e74c3c');
      }

      // Show "×1.0 BREAK!" float over score panel
      const scorePanel = div.querySelector('#score-panel');
      if (scorePanel) {
        const spRect = scorePanel.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const numX = spRect.left - divRect.left + spRect.width / 2 - 30;
        const numY = spRect.top - divRect.top - 5;
        floatingNumber(div, '×1.0 BREAK!', numX - 20, numY, '#e74c3c');
      }

      // Reset combo display
      const comboEl = div.querySelector('#combo');
      if (comboEl) comboEl.textContent = '';

      div.querySelector('#feedback').textContent = `✗ 错误！失去 ${hpLoss} HP。${q.explanation}`;

      // Update player HP bar
      const playerHpBar = div.querySelector('#player-hp');
      if (playerHpBar) playerHpBar.style.width = (playerHp / profile.maxHp) * 100 + '%';

      // Companion encouragement on wrong answer; warn if HP drops low
      if (playerHp < profile.maxHp * 0.3) {
        showCompanionBubble(div, pick(COMPANION.lowHP));
      } else {
        showCompanionBubble(div, pick(COMPANION.wrongAnswer));
      }
    }

    const quest = gameState.currentQuest;
    quest.results.combo = combo;

    // ── Hit pause on killing blow ──────────────────────────────────────────────
    if (enemyHp <= 0 && correct) {
      clearInterval(timerInterval);
      document.body.style.pointerEvents = 'none';
      setTimeout(() => {
        document.body.style.pointerEvents = '';
        endCombat(true);
      }, 150);
      return;
    }

    setTimeout(() => {
      if (playerHp <= 0) { endCombat(false); return; }
      qIndex++;
      if (qIndex >= questions.length) { endCombat(true); return; }
      render();
    }, 1800);
  }

  function endCombat(won) {
    stopBreaths();
    clearInterval(timerInterval);
    clearInterval(timerPulseInterval);
    setMusicIntensity(0); // Back to ambient
    if (won) playStinger('victory');
    encounter.completed = won;
    profile.hp = playerHp;
    gameState.save();

    if (!won) {
      // Companion comfort on defeat
      showCompanionBubble(div, pick(COMPANION.defeat), 4000);
      // Grayscale defeat
      div.style.filter = 'grayscale(1)';
      div.innerHTML = `
        <div class="screen">
          <h2 style="color:var(--accent-red);">战斗失败</h2>
          <p style="margin:1rem 0;">你被${enemyName}击败了……</p>
          <button class="btn btn-primary" id="btn-retry">重试</button>
          <button class="btn" id="btn-retreat" style="margin-top:8px;">撤退</button>
        </div>
      `;
      setTimeout(() => {
        div.querySelector('#btn-retry').addEventListener('click', () => {
          profile.hp = profile.maxHp;
          showScreen('combat');
        });
        div.querySelector('#btn-retreat').addEventListener('click', () => showScreen('worldmap'));
      }, 0);
      return;
    }

    // Companion celebration on victory
    showCompanionBubble(div, pick(COMPANION.victory), 4000);

    // Victory: enemy fades out + particle explosion
    const enemyWrap = div.querySelector('#enemy-sprite-wrap');
    const enemySprite = div.querySelector('#enemy-sprite');
    if (enemySprite) {
      enemySprite.style.transition = 'opacity 0.6s ease-out';
      enemySprite.style.opacity = '0';
      if (enemyWrap) {
        const ewRect = enemyWrap.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const cx = ewRect.left - divRect.left + ewRect.width / 2;
        const cy = ewRect.top - divRect.top + ewRect.height / 2;
        setTimeout(() => particleExplosion(div, cx, cy, 14), 200);
      }
    }

    // Victory mini-sequence before advancing
    setTimeout(() => {
      showVictorySequence(div, enemyWrap, div, () => {
        const next = advanceEncounter();
        if (!next) {
          showScreen('reward');
        } else {
          if (next.type === 'combat') showScreen('combat');
          else if (next.type === 'puzzle') showScreen('puzzle');
          else if (next.type === 'boss') showScreen('boss');
        }
      });
    }, 1400);
  }

  render();

  // ── Mini-progress bar (on top of everything) ─────────────────────────────
  createMiniProgress(div);

  // ── First-ever combat tutorial overlay ──────────────────────────────────
  if (profile.accuracy.vocab.length === 0) {
    const tutorial = document.createElement('div');
    tutorial.style.cssText = `position:absolute;inset:0;background:rgba(0,0,0,0.8);display:flex;align-items:center;justify-content:center;z-index:100;`;
    tutorial.innerHTML = `
      <div style="background:var(--bg-card);border:2px solid var(--accent-gold);border-radius:12px;padding:32px;max-width:400px;text-align:center;">
        <h3 style="color:var(--accent-gold);margin-bottom:12px;">文字就是你的武器！</h3>
        <p style="margin-bottom:8px;">回答正确 → 攻击敌人</p>
        <p style="margin-bottom:8px;">回答错误 → 敌人反击</p>
        <p style="margin-bottom:8px;">连续答对 → 连击加成伤害</p>
        <p style="margin-bottom:16px;color:var(--text-secondary);">答得越快，伤害越高！</p>
        <button class="btn btn-primary" style="padding:10px 24px;">开战！</button>
      </div>
    `;
    div.appendChild(tutorial);
    tutorial.querySelector('button').addEventListener('click', () => {
      tutorial.remove();
      // Enemy taunts after tutorial dismissal
      showEnemyTaunt(div, pick(ENEMY_TAUNTS.combat), 3000);
    });
  } else {
    // No tutorial — show enemy taunt immediately on combat start
    showEnemyTaunt(div, pick(ENEMY_TAUNTS.combat), 3000);
  }

  return div;
}

registerScreen('combat', renderCombat);
