// js/screens/combat.js — Vocab combat encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen, onCleanup } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';
import { hasAbility, calcDamage, calcDamageTaken, getTimerDuration, rollCrit, getEffectiveMaxHp, getEffectiveMaxWenli, getTalentEffects } from '../progression.js';
import { playSound, playMusic, setMusicIntensity, playStinger } from '../audio.js';
import { showCompanionBubble, showEnemyTaunt, COMPANION, ENEMY_TAUNTS, pick } from './companion.js';
import { setParticleMode, burstParticles } from '../particles.js';
import { SPRITES, COMBAT_BGS, getPlayerSprite } from '../sprites.js';
import { showTutorial } from '../tutorial.js';
import { shakeElement, lungeElement, slashEffect, screenFlash, floatingText } from '../effects.js';
import { recordWrongAnswer, recordCorrectReview } from '../spaced-repetition.js';
import { createCombatBackground, destroyCombatBackground } from '../pixi-backgrounds.js';
import { confettiBurst } from '../celebrations.js';
import { showToast } from '../toast.js';

// ─── Enemy type system ──────────────────────────────────────────────────────
const ENEMY_TYPES = [
  {
    name: '墨灵', sprite: 'enemy_moling',
    hp: 60, attack: 12, defense: 0,
    ability: null,
    desc: '基础墨暗生物',
    tier: 1,
  },
  {
    name: '暗字兵', sprite: 'enemy_guard',
    hp: 80, attack: 15, defense: 5,
    ability: 'shield',
    desc: '持盾的墨暗士兵，能挡住一次攻击',
    tier: 1,
  },
  {
    name: '墨影卫', sprite: 'enemy_shadow',
    hp: 50, attack: 20, defense: 0,
    ability: 'dodge',
    desc: '速度极快，有概率闪避攻击',
    tier: 2,
  },
  {
    name: '乱笔妖', sprite: 'enemy_moling',
    hp: 70, attack: 18, defense: 3,
    ability: 'scramble',
    desc: '5秒后会打乱选项顺序',
    tier: 2,
  },
  {
    name: '黑墨士', sprite: 'enemy_guard',
    hp: 100, attack: 22, defense: 8,
    ability: 'enrage',
    desc: 'HP低于50%时攻击力暴增',
    tier: 3,
  },
];

function selectEnemyType(chapterId, questIndex) {
  // Higher chapters unlock higher tier enemies
  let maxTier = 1;
  if (chapterId >= 3) maxTier = 2;
  if (chapterId >= 4) maxTier = 3;
  // Later quests within a chapter can also bump tier
  if (questIndex >= 2 && maxTier < 2) maxTier = 2;
  if (questIndex >= 4 && maxTier < 3) maxTier = 3;

  const eligible = ENEMY_TYPES.filter(e => e.tier <= maxTier);
  // Weight higher-tier enemies more as chapters progress
  const weighted = [];
  for (const e of eligible) {
    const weight = e.tier >= maxTier ? 3 : 1;
    for (let i = 0; i < weight; i++) weighted.push(e);
  }
  return weighted[Math.floor(Math.random() * weighted.length)];
}

const COMBAT_NARRATIVES = [
  "墨灵释放出混乱的文字——用你的知识反击！",
  "敌人扭曲了这个词的含义——纠正它来造成伤害！",
  "暗字兵向你投射文字攻击——看穿它的破绽！",
  "一道文字谜题化作攻击飞来——回答正确才能格挡！",
  "墨影卫试图混淆你的记忆——展示你真正的文字力量！",
];

// ─── Animation helpers (shared effects imported from ../effects.js) ──────────
// Local helpers that are specific to combat.js:

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
    font-size:0.92rem; color:var(--text-secondary);
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

// ─── Era-specific combat backgrounds ─────────────────────────────────────────
const ERA_COMBAT_BG = {
  1: { // Pre-Qin: bronze/amber oracle bone feel
    gradient: 'linear-gradient(180deg, #1a0e00 0%, #2d1800 30%, #3d2200 60%, #1a0c00 100%)',
    accent: 'rgba(193,127,60,0.15)',
    particles: 'gold',
  },
  2: { // Han: dark red imperial
    gradient: 'linear-gradient(180deg, #1a0000 0%, #2d0808 30%, #3a0a0a 60%, #1a0000 100%)',
    accent: 'rgba(214,48,49,0.12)',
    particles: 'red',
  },
  3: { // Tang: warm gold/amber
    gradient: 'linear-gradient(180deg, #0d0a00 0%, #1e1600 30%, #2a1e00 60%, #0d0a00 100%)',
    accent: 'rgba(212,160,23,0.10)',
    particles: 'gold',
  },
  4: { // Song: jade green
    gradient: 'linear-gradient(180deg, #001a10 0%, #002818 30%, #003020 60%, #001a10 100%)',
    accent: 'rgba(46,204,138,0.12)',
    particles: 'jade',
  },
  5: { // Modern: deep purple void
    gradient: 'linear-gradient(180deg, #0a0018 0%, #120028 30%, #1a0038 60%, #0a0018 100%)',
    accent: 'rgba(142,68,173,0.15)',
    particles: 'purple',
  },
};

// ─── Main render ─────────────────────────────────────────────────────────────

function renderCombat() {
  // Apply era-specific background and particles based on current chapter
  const eraBgChapter = gameState.currentQuest?.chapterId || 1;
  const eraBg = ERA_COMBAT_BG[eraBgChapter] || ERA_COMBAT_BG[1];

  // Set era-matched particle mode (combat_gold, combat_red, etc.)
  const particleModeMap = { gold: 'combat_gold', red: 'combat_red', jade: 'combat_jade', purple: 'combat_purple' };
  setParticleMode(particleModeMap[eraBg.particles] || 'combat');

  const div = document.createElement('div');
  div.className = 'screen';

  // Use painted background image if available, fall back to gradient
  const eraKeyMap = {1:'xianqin',2:'han',3:'tang',4:'song',5:'modern'};
  const combatBgUrl = COMBAT_BGS[eraKeyMap[eraBgChapter]];

  div.style.cssText = `
    overflow: hidden;
    display: flex;
    flex-direction: column;
    height: 100%;
    position: relative;
    background:
      radial-gradient(ellipse at 50% 25%, ${eraBg.accent} 0%, transparent 60%),
      radial-gradient(ellipse at 20% 80%, ${eraBg.accent} 0%, transparent 40%),
      url('${combatBgUrl}') center/cover no-repeat,
      ${eraBg.gradient};
  `;

  // Create PixiJS dynamic background
  const eraMap = {1:'xianqin',2:'han',3:'tang',4:'song',5:'modern'};
  const eraKey = eraMap[gameState.currentQuest?.chapterId] || 'xianqin';
  createCombatBackground(div, eraKey);

  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  if (!encounter || !profile) { showScreen('worldmap'); return div; }
  const questions = encounter.questions;
  let qIndex = 0;
  const effectiveMaxHp = getEffectiveMaxHp(profile);
  let playerHp = profile.hp;
  const modifier = encounter.modifier || null; // Encounter modifier (elite, blitz, etc.)

  // Start battle music — explicitly set era and intensity
  const chapterId = gameState.currentQuest?.chapterId || 1;
  playMusic(eraMap[chapterId] || 'xianqin');
  playStinger('battle_start');
  setTimeout(() => setMusicIntensity(1), 300);

  // Select enemy type based on chapter/quest progress
  const questIndex = gameState.currentQuest?.questIndex || 0;
  const enemyType = selectEnemyType(chapterId, questIndex);
  const enemyName = enemyType.name;
  const baseTimer = modifier?.timerMult
    ? Math.round(getTimerDuration(profile) * modifier.timerMult)
    : getTimerDuration(profile);

  // Real enemy HP from enemy type (scaled by modifier)
  let enemyMaxHp = modifier?.enemyHpMult
    ? Math.round(enemyType.hp * modifier.enemyHpMult)
    : enemyType.hp;
  if (enemyMaxHp <= 0) enemyMaxHp = 1; // Prevent division by zero
  let enemyHp = enemyMaxHp;
  let combo = 0;
  let timerInterval = null;
  let timerPulseInterval = null;
  let doubleActive = false;

  // ── Balatro-style multiplicative scoring ──
  let chips = 0;
  let multiplier = 1.0;
  let totalScore = 0;

  // Cancel breathing animations cleanup refs
  let stopPlayerBreath = null;
  let stopEnemyBreath = null;

  // ── Enemy ability state ──
  let shieldActive = enemyType.ability === 'shield'; // shield blocks first wrong answer
  let enrageTriggered = false; // enrage fires once when HP < 50%
  let scrambleTimer = null; // scramble timer reference
  let activeKeyHandler = null; // keyboard shortcut handler ref for cleanup
  let combatEnded = false; // Guard against multiple endCombat calls
  let isFirstQuestion = true; // Track first question for timeFreeze talent

  // Talent: 墨气回流 — restore wenli at combat start
  const combatTalents = getTalentEffects(profile);
  if (combatTalents.wenliRegen) {
    const effectiveMax = getEffectiveMaxWenli(profile);
    profile.wenli = Math.min(effectiveMax, (profile.wenli || 0) + combatTalents.wenliRegen);
  }

  // PixiJS overlay handle
  let pixiApp = null;

  // Register cleanup so timers/listeners are cleared on screen exit
  onCleanup(() => {
    combatEnded = true;
    clearInterval(timerInterval);
    clearInterval(timerPulseInterval);
    if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
    if (activeKeyHandler) { document.removeEventListener('keydown', activeKeyHandler); activeKeyHandler = null; }
    if (pixiApp) { try { pixiApp.destroy(true); } catch(_) {} pixiApp = null; }
    destroyCombatBackground();
    stopBreaths();
  });

  function pixiParticleBurst(x, y, color, count) {
    if (!pixiApp) return;
    for (let i = 0; i < count; i++) {
      const g = new PIXI.Graphics();
      g.beginFill(color);
      g.drawCircle(0, 0, 2 + Math.random() * 4);
      g.endFill();
      g.x = x;
      g.y = y;

      const angle = Math.random() * Math.PI * 2;
      const speed = 2 + Math.random() * 6;
      const vx = Math.cos(angle) * speed;
      const vy = Math.sin(angle) * speed - 2;
      const life = 30 + Math.random() * 30;
      let frame = 0;

      pixiApp.stage.addChild(g);

      const ticker = () => {
        g.x += vx;
        g.y += vy + frame * 0.1; // gravity
        g.alpha = 1 - (frame / life);
        g.scale.set(1 - (frame / life) * 0.5);
        frame++;
        if (frame >= life) {
          pixiApp.stage.removeChild(g);
          pixiApp.ticker.remove(ticker);
          g.destroy();
        }
      };
      pixiApp.ticker.add(ticker);
    }
  }

  function stopBreaths() {
    if (stopPlayerBreath) { stopPlayerBreath(); stopPlayerBreath = null; }
    if (stopEnemyBreath) { stopEnemyBreath(); stopEnemyBreath = null; }
  }

  // ── Damage panel updater ──
  function updateScorePanel(animateMultReset = false) {
    const panel = div.querySelector('#score-panel');
    if (!panel) return;
    const score = Math.round(chips * multiplier);
    totalScore = score;

    if (animateMultReset) {
      panel.style.transition = 'background 0.05s';
      panel.style.background = 'rgba(192,57,43,0.35)';
      setTimeout(() => {
        panel.style.transition = 'background 0.4s';
        panel.style.background = 'rgba(0,0,0,0.5)';
      }, 80);
    }

    panel.innerHTML = `
      <span style="color:var(--accent-gold);">伤害</span>
      <span id="score-total" style="color:var(--accent-jade);font-weight:700;">${score}</span>
    `;
  }

  function animateMultiplierPulse() {
    const totalEl = div.querySelector('#score-total');
    if (!totalEl) return;
    totalEl.style.transform = 'scale(1.4)';
    totalEl.style.textShadow = '0 0 12px #d4a017';
    totalEl.style.transition = 'transform 0.2s, text-shadow 0.2s';
    setTimeout(() => {
      totalEl.style.transform = 'scale(1)';
      totalEl.style.textShadow = '';
    }, 250);
  }

  function render() {
    stopBreaths();
    clearInterval(timerPulseInterval);

    if (qIndex >= questions.length) {
      // Loop questions if enemy is still alive
      qIndex = 0;
      // Shuffle questions for variety
      for (let i = questions.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [questions[i], questions[j]] = [questions[j], questions[i]];
      }
    }
    // Safety: if question pool is somehow empty, end combat gracefully
    if (!questions.length) { endCombat(true); return; }
    const q = questions[qIndex];
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
    let enemyAtk = enrageTriggered ? Math.round(enemyType.attack * 1.5) : enemyType.attack;
    if (modifier?.enemyDmgMult) enemyAtk = Math.round(enemyAtk * modifier.enemyDmgMult);
    const wrongDmgInfo = calcDamageTaken(profile, enemyAtk);
    const timeoutDmgInfo = calcDamageTaken(profile, Math.round(enemyAtk * 1.3));
    const wrongDamage = wrongDmgInfo.damage;
    const timeoutDamage = timeoutDmgInfo.damage;

    div.innerHTML = `
      <style>
        /* ── Full-screen combat layout ── */
        .combat-screen-inner {
          display: flex;
          flex-direction: column;
          height: 100%;
          width: 100%;
          position: relative;
          overflow: hidden;
        }

        /* ── HUD row ── */
        .combat-hud {
          display: flex;
          align-items: center;
          gap: 10px;
          padding: 4px 12px 4px;
          padding-top: 38px; /* clear the mini-progress bar */
          background: rgba(0,0,0,0.35);
          border-bottom: 1px solid rgba(255,255,255,0.06);
          flex-shrink: 0;
        }
        .hud-player-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #e8e6d8;
          white-space: nowrap;
          min-width: 50px;
        }
        .hud-hp-wrap {
          display: flex;
          flex-direction: column;
          gap: 2px;
          flex: 1;
        }
        .hud-hp-bar-bg {
          height: 10px;
          background: rgba(255,255,255,0.1);
          border-radius: 5px;
          overflow: hidden;
        }
        .hud-hp-bar {
          height: 100%;
          border-radius: 5px;
          transition: width 0.3s;
        }
        .hp-player { background: linear-gradient(90deg, #27ae60, #2ecc71); }
        .hp-enemy  { background: linear-gradient(90deg, #c0392b, #e74c3c); }
        .hud-hp-text {
          font-size: 0.88rem;
          color: var(--text-secondary);
          line-height: 1;
        }
        .hud-divider {
          font-size: 1.2rem;
          color: rgba(255,255,255,0.15);
          flex-shrink: 0;
          padding: 0 4px;
        }
        .hud-enemy-name {
          font-size: 0.95rem;
          font-weight: 800;
          color: #e74c3c;
          white-space: nowrap;
          min-width: 50px;
          text-align: right;
        }
        .hud-combo {
          font-size: 0.85rem;
          font-weight: 700;
          min-width: 60px;
          text-align: center;
          flex-shrink: 0;
        }

        /* ── Battle arena ── */
        .battle-arena {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 0 20px;
          padding-bottom: 10px;
          flex: 0 0 auto;
          min-height: 200px;
          position: relative;
          margin-bottom: 6px;
        }
        .sprite-wrap {
          display: flex;
          flex-direction: column;
          align-items: center;
          position: relative;
          flex-shrink: 0;
        }
        .sprite-label {
          font-size: 0.88rem;
          color: var(--text-secondary);
          margin-bottom: 4px;
        }
        .sprite-container {
          height: 200px;
          display: flex;
          align-items: flex-end;
          justify-content: center;
        }
        .arena-center {
          flex: 1;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 6px;
          position: relative;
        }
        .energy-bolts {
          font-size: 1.6rem;
          letter-spacing: 4px;
          animation: boltFlicker 0.8s infinite alternate;
        }
        @keyframes boltFlicker {
          0%   { opacity: 0.6; transform: scale(0.95); }
          100% { opacity: 1;   transform: scale(1.05); }
        }

        /* ── Intent + damage strip ── */
        .intent-score-row {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          padding: 3px 12px;
          flex-shrink: 0;
        }
        .enemy-intent-bar {
          display: flex;
          gap: 10px;
          font-size: 0.9rem;
          opacity: 0.9;
          padding: 4px 12px;
          border-radius: 6px;
          background: rgba(0,0,0,0.35);
          border: 1px solid rgba(192,57,43,0.25);
          flex-shrink: 0;
          white-space: nowrap;
        }
        .damage-panel {
          display: flex;
          align-items: center;
          gap: 4px;
          font-size: 0.88rem;
          padding: 4px 14px;
          background: rgba(0,0,0,0.5);
          border: 1px solid rgba(212,160,23,0.3);
          border-radius: 6px;
          flex-shrink: 0;
          font-weight: 700;
        }

        /* ── Narrative strip ── */
        .combat-narrative {
          font-style: italic;
          font-size: 0.95rem;
          color: #d4a017;
          text-align: center;
          padding: 4px 16px;
          opacity: 0.85;
          text-shadow: 0 0 6px rgba(212,160,23,0.4);
          border-top: 1px solid rgba(255,255,255,0.05);
          border-bottom: 1px solid rgba(255,255,255,0.05);
          background: rgba(0,0,0,0.2);
          flex-shrink: 0;
        }

        /* ── Question ── */
        .combat-question {
          font-size: 1.4rem;
          font-weight: 700;
          text-align: center;
          padding: 14px 20px 10px;
          color: #e8e6d8;
          flex-shrink: 0;
          line-height: 1.4;
          background: rgba(0,0,0,0.25);
          border-radius: 8px;
          margin: 0 12px 4px;
        }

        /* ── Review badge ── */
        .review-badge {
          display: inline-block;
          background: rgba(142,68,173,0.85);
          color: #fff;
          font-size: 0.95rem;
          font-weight: 700;
          padding: 3px 10px;
          border-radius: 5px;
          margin-right: 6px;
          vertical-align: middle;
          letter-spacing: 0.05em;
          box-shadow: 0 0 8px rgba(142,68,173,0.4);
          animation: review-badge-pulse 1.5s ease-in-out infinite alternate;
        }
        @keyframes review-badge-pulse {
          0%   { box-shadow: 0 0 8px rgba(142,68,173,0.4); }
          100% { box-shadow: 0 0 14px rgba(142,68,173,0.7); }
        }

        /* ── Mastered celebration ── */
        .mastered-celebration {
          position: absolute;
          top: 35%;
          left: 50%;
          transform: translate(-50%, -50%) scale(0);
          color: #2ecc71;
          font-size: 2rem;
          font-weight: 900;
          text-shadow: 0 0 20px #2ecc71, 0 0 40px #27ae60, 2px 2px 0 #000;
          pointer-events: none;
          z-index: 1006;
          transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease-out;
          white-space: nowrap;
        }

        /* ── Answer options ── */
        .combat-options {
          display: grid;
          grid-template-columns: 1fr 1fr;
          gap: 12px;
          padding: 0 12px;
          flex: 1 1 auto;
          min-height: 0;
          align-content: stretch;
        }
        .combat-option {
          padding: 18px 24px;
          font-size: 1.2rem;
          font-weight: 600;
          min-height: 56px;
          display: flex;
          align-items: center;
          justify-content: center;
          background: linear-gradient(145deg, rgba(15,52,96,0.9), rgba(10,25,50,0.95));
          border: 1px solid rgba(212,160,23,0.25);
          border-radius: 10px;
          color: #e8e6d8;
          cursor: pointer;
          transition: all 0.15s;
          box-shadow: 0 3px 10px rgba(0,0,0,0.4);
          text-align: center;
          line-height: 1.3;
          width: 100%;
        }
        .combat-option:hover {
          background: linear-gradient(145deg, rgba(25,72,116,0.95), rgba(15,40,70,0.98));
          border-color: rgba(212,160,23,0.5);
          transform: translateY(-1px);
          box-shadow: 0 5px 15px rgba(0,0,0,0.5);
        }
        .combat-option.correct {
          background: linear-gradient(145deg, rgba(39,174,96,0.5), rgba(30,120,60,0.7)) !important;
          border-color: #27ae60 !important;
        }
        .combat-option.wrong {
          background: linear-gradient(145deg, rgba(192,57,43,0.5), rgba(140,30,20,0.7)) !important;
          border-color: #e74c3c !important;
        }

        /* ── Feedback text ── */
        .feedback-text {
          font-size: 1.1rem;
          text-align: center;
          padding: 6px 16px;
          min-height: 1.4em;
          color: var(--text-secondary);
          flex-shrink: 0;
        }

        /* ── Abilities ── */
        .abilities-row {
          display: flex;
          gap: 6px;
          justify-content: center;
          padding: 2px 12px 2px;
          flex-shrink: 0;
        }

        /* ── Timer bar at very bottom ── */
        .timer-track {
          height: 14px;
          background: rgba(0,0,0,0.4);
          border-radius: 0;
          overflow: hidden;
          flex-shrink: 0;
          margin-top: auto;
        }
        .timer-bar {
          height: 100%;
          background: linear-gradient(90deg, #f39c12, #e67e22);
          transition: width 0.1s linear;
          border-radius: 0;
        }

        @keyframes multPulse {
          0%   { transform:scale(1); }
          50%  { transform:scale(1.6); text-shadow:0 0 12px #d4a017; }
          100% { transform:scale(1); }
        }

        /* ── Enemy ability banner ── */
        .enemy-ability-banner {
          font-size: 0.9rem;
          color: #e8a0a0;
          background: rgba(192,57,43,0.2);
          border: 1px solid rgba(192,57,43,0.3);
          border-radius: 6px;
          padding: 4px 10px;
          margin-top: 4px;
          text-align: center;
          max-width: 140px;
          line-height: 1.3;
          animation: ability-banner-in 0.4s ease-out;
        }
        @keyframes ability-banner-in {
          0% { opacity:0; transform:translateY(5px); }
          100% { opacity:1; transform:translateY(0); }
        }

        /* ── Enrage aura ── */
        .enemy-enrage-aura {
          position: absolute;
          inset: -8px;
          border-radius: 50%;
          background: radial-gradient(ellipse at center, rgba(192,57,43,0.3) 0%, transparent 70%);
          animation: enrage-pulse 0.8s ease-in-out infinite alternate;
          pointer-events: none;
          z-index: -1;
        }
        @keyframes enrage-pulse {
          0%   { opacity:0.4; transform:scale(0.95); }
          100% { opacity:0.8; transform:scale(1.1); }
        }

        /* ── Shield icon ── */
        .shield-icon {
          position: absolute;
          top: -5px; right: -5px;
          font-size: 1.5rem;
          filter: drop-shadow(0 0 4px rgba(52,152,219,0.6));
          animation: shield-bob 1.5s ease-in-out infinite;
          z-index: 5;
        }
        @keyframes shield-bob {
          0%,100% { transform:translateY(0); }
          50% { transform:translateY(-4px); }
        }
        @keyframes shield-break {
          0%   { transform:scale(1); opacity:1; }
          50%  { transform:scale(1.3) rotate(15deg); opacity:0.7; }
          100% { transform:scale(0) rotate(45deg); opacity:0; }
        }

        /* ── Combat entrance zoom ── */
        @keyframes combat-entrance-zoom {
          0%   { transform: scale(1.15); filter: brightness(0.3) blur(4px); }
          60%  { transform: scale(1.02); filter: brightness(0.9) blur(0); }
          100% { transform: scale(1);    filter: brightness(1) blur(0); }
        }
        .combat-screen-inner.entrance-anim {
          animation: combat-entrance-zoom 0.8s cubic-bezier(0.25,0.46,0.45,0.94) forwards;
        }

        /* ── Timer urgency: red screen-edge pulse when < 5s ── */
        @keyframes urgency-pulse {
          0%   { box-shadow: inset 0 0 40px 8px rgba(231,76,60,0); }
          50%  { box-shadow: inset 0 0 40px 8px rgba(231,76,60,0.35); }
          100% { box-shadow: inset 0 0 40px 8px rgba(231,76,60,0); }
        }
        .combat-urgency-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 999;
          animation: urgency-pulse 1s ease-in-out infinite;
        }

        /* ── Correct answer confetti burst ── */
        @keyframes confetti-particle {
          0%   { opacity: 1; transform: translate(0, 0) rotate(0deg) scale(1); }
          100% { opacity: 0; transform: translate(var(--tx), var(--ty)) rotate(var(--rot)) scale(0.3); }
        }
        @keyframes screen-brighten {
          0%   { background: rgba(255,255,255,0); }
          30%  { background: rgba(255,255,255,0.12); }
          100% { background: rgba(255,255,255,0); }
        }
        .correct-flash-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 998;
          animation: screen-brighten 0.5s ease-out forwards;
        }

        /* ── Combo milestone full-screen text flash ── */
        @keyframes milestone-flash {
          0%   { opacity: 0; transform: translate(-50%, -50%) scale(0.3) rotate(-5deg); }
          20%  { opacity: 1; transform: translate(-50%, -50%) scale(1.2) rotate(2deg); }
          50%  { opacity: 1; transform: translate(-50%, -50%) scale(1.0) rotate(0deg); }
          100% { opacity: 0; transform: translate(-50%, -50%) scale(1.5) rotate(-3deg); }
        }
        .combo-milestone {
          position: absolute; top: 40%; left: 50%;
          transform: translate(-50%, -50%) scale(0);
          font-size: 3rem; font-weight: 900;
          pointer-events: none; z-index: 1010;
          text-transform: uppercase;
          letter-spacing: 6px;
          animation: milestone-flash 1.2s cubic-bezier(0.34,1.56,0.64,1) forwards;
        }
        .milestone-unstoppable {
          color: #ff6b00;
          text-shadow: 0 0 30px #ff6b00, 0 0 60px #ff4500, 0 0 90px #ff0000, 3px 3px 0 #000;
        }
        .milestone-legendary {
          color: #ffd700;
          text-shadow: 0 0 30px #ffd700, 0 0 60px #ffaa00, 0 0 90px #ff6b00, 0 0 120px #ff0000, 3px 3px 0 #000;
        }

        /* ── Enemy death shatter ── */
        @keyframes shatter-particle {
          0%   { opacity: 1; transform: translate(0, 0) scale(1); }
          100% { opacity: 0; transform: translate(var(--sx), var(--sy)) scale(0); }
        }
        @keyframes golden-light-expand {
          0%   { opacity: 0.8; transform: translate(-50%, -50%) scale(0); }
          50%  { opacity: 0.6; transform: translate(-50%, -50%) scale(1.5); }
          100% { opacity: 0;   transform: translate(-50%, -50%) scale(3); }
        }
        .golden-light-burst {
          position: absolute;
          width: 120px; height: 120px;
          border-radius: 50%;
          background: radial-gradient(circle, rgba(212,160,23,0.6) 0%, rgba(255,215,0,0.3) 40%, transparent 70%);
          pointer-events: none; z-index: 1001;
          animation: golden-light-expand 0.8s ease-out forwards;
        }

        /* ── Low HP heartbeat ── */
        @keyframes heartbeat-edge {
          0%   { box-shadow: inset 0 0 30px 5px rgba(192,57,43,0); }
          15%  { box-shadow: inset 0 0 50px 12px rgba(192,57,43,0.3); }
          30%  { box-shadow: inset 0 0 30px 5px rgba(192,57,43,0.05); }
          45%  { box-shadow: inset 0 0 50px 12px rgba(192,57,43,0.25); }
          60%  { box-shadow: inset 0 0 30px 5px rgba(192,57,43,0); }
          100% { box-shadow: inset 0 0 30px 5px rgba(192,57,43,0); }
        }
        .heartbeat-overlay {
          position: absolute; inset: 0; pointer-events: none; z-index: 997;
          animation: heartbeat-edge 1.5s ease-in-out infinite;
        }

        /* ── Dodge animation ── */
        @keyframes enemy-dodge {
          0%   { transform:translateX(0); opacity:1; }
          30%  { transform:translateX(50px); opacity:0.4; }
          60%  { transform:translateX(50px); opacity:0.4; }
          100% { transform:translateX(0); opacity:1; }
        }

        /* ── Scramble animation ── */
        @keyframes option-scramble {
          0%   { transform:translateX(0); opacity:1; }
          25%  { transform:translateX(-10px); opacity:0.5; }
          50%  { transform:translateX(10px); opacity:0.3; }
          75%  { transform:translateX(-5px); opacity:0.5; }
          100% { transform:translateX(0); opacity:1; }
        }
      </style>

      <div class="combat-screen-inner">

        <!-- HUD row: player name + HP bar + divider + combo + divider + enemy HP bar + enemy name -->
        <div class="combat-hud shimmer" style="position:relative;">
          <button class="pause-btn" id="btn-pause" title="暂停" style="
            position:absolute; top:6px; right:8px; z-index:20;
            background:rgba(0,0,0,0.5); border:1px solid rgba(255,255,255,0.2);
            color:var(--text-primary); font-size:1.1rem; width:36px; height:36px;
            border-radius:50%; cursor:pointer; display:flex; align-items:center; justify-content:center;
            padding:0; line-height:1;
          ">&#x23F8;</button>
          <div class="hud-player-name">${profile.name}</div>
          <div class="hud-hp-wrap">
            <div class="hud-hp-bar-bg">
              <div class="hud-hp-bar hp-player" id="player-hp" style="width:${(playerHp / effectiveMaxHp) * 100}%"></div>
            </div>
            <div class="hud-hp-text">HP: ${playerHp}/${effectiveMaxHp}</div>
          </div>
          <div class="hud-combo" id="combo" style="color:${comboColor};">${combo > 1 ? combo + ' 连击！' : ''}</div>
          <div class="hud-hp-wrap">
            <div class="hud-hp-bar-bg">
              <div class="hud-hp-bar hp-enemy" id="enemy-hp" style="width:${(enemyHp / enemyMaxHp) * 100}%"></div>
            </div>
            <div class="hud-hp-text" style="text-align:right;">HP: ${enemyHp}/${enemyMaxHp}</div>
          </div>
          <div class="hud-enemy-name">${enemyName}${shieldActive ? ' 🛡' : ''}</div>
        </div>

        <!-- Pause overlay (hidden by default) -->
        <div id="pause-overlay" style="
          display:none; position:absolute; inset:0; z-index:100;
          background:rgba(0,0,0,0.85); flex-direction:column;
          align-items:center; justify-content:center; gap:20px;
        ">
          <div style="font-size:2rem; font-weight:900; color:var(--text-primary); text-shadow:var(--shadow-gold);">游戏暂停</div>
          <button id="btn-resume" class="btn" style="font-size:1.1rem; padding:12px 36px;">继续</button>
          <button id="btn-pause-retreat" class="btn" style="font-size:1rem; padding:10px 28px; margin-top:8px; opacity:0.7;">放弃 · 回到地图</button>
        </div>

        <!-- Battle arena: player sprite | energy | enemy sprite -->
        <div class="battle-arena" id="arena">
          <!-- HD-2D Bokeh particles behind combat arena -->
          <div class="bokeh-container" id="combat-bokeh"></div>

          <div class="sprite-wrap" id="player-sprite-wrap">
            <div class="sprite-label">${profile.name}</div>
            <div id="player-sprite" class="sprite-container sprite-bloom"></div>
          </div>

          <div class="arena-center">
            <div class="energy-bolts">⚡⚡</div>
          </div>

          <div class="sprite-wrap" id="enemy-sprite-wrap">
            <div class="sprite-label" style="color:var(--accent-red);">${enemyName}${shieldActive ? ' 🛡' : ''}</div>
            <div id="enemy-sprite" class="sprite-container sprite-bloom-enemy"></div>
            ${enemyType.ability ? `<div class="enemy-ability-banner" id="ability-banner">${enemyType.desc}</div>` : ''}
            ${enrageTriggered ? '<div class="enemy-enrage-aura" id="enrage-aura"></div>' : ''}
          </div>
        </div>

        <!-- Intent + damage strip -->
        <div class="intent-score-row">
          <div class="enemy-intent-bar">
            <span style="color:var(--accent-red);">⚠ 答错 -${wrongDamage}</span>
            <span style="color:rgba(255,255,255,0.2);">|</span>
            <span style="color:#f39c12;">⏱ 超时 -${timeoutDamage}</span>
          </div>
          <div class="damage-panel" id="score-panel">
            <span style="color:var(--accent-gold);">伤害</span>
            <span id="score-total" style="color:var(--accent-jade);">${Math.round(chips * multiplier)}</span>
          </div>
          <div style="font-size:0.92rem; color:var(--text-secondary); opacity:0.7; white-space:nowrap;">答对: +XP +金币 +连击</div>
        </div>

        <!-- Modifier banner (if active) -->
        ${modifier ? `<div style="
          text-align:center; padding:4px 12px; margin-bottom:4px;
          background:rgba(212,160,23,0.12); border:1px solid rgba(212,160,23,0.3);
          border-radius:6px; font-size:0.88rem; color:#d4a017; letter-spacing:0.06em;
        ">⚡ ${modifier.name} — ${modifier.desc}</div>` : ''}

        <!-- Narrative -->
        <div class="combat-narrative">${combatNarrative}</div>

        <!-- Question -->
        <div class="combat-question text-reveal">${q.isReview ? '<span class="review-badge">复习</span>' : ''}${q.prompt}</div>

        <!-- Answer options: 2×2 grid, filling width -->
        <div class="combat-options" id="options">${optionsHTML}</div>

        <!-- Feedback -->
        <div class="feedback-text" id="feedback"></div>

        <!-- Abilities -->
        <div class="abilities-row" id="abilities"></div>

        <!-- Timer bar pinned to very bottom -->
        <div class="timer-track">
          <div class="timer-bar" id="timer-bar" style="width:100%"></div>
        </div>

      </div>
    `;

    // ── Combat entrance zoom animation ──
    {
      const inner = div.querySelector('.combat-screen-inner');
      if (inner) {
        inner.classList.add('entrance-anim');
        inner.addEventListener('animationend', () => inner.classList.remove('entrance-anim'), { once: true });
      }
    }

    // ── HD-2D: Generate bokeh particles behind combat arena ──
    {
      const bokehContainer = div.querySelector('#combat-bokeh');
      if (bokehContainer) {
        for (let i = 0; i < 18; i++) {
          const dot = document.createElement('div');
          dot.className = 'bokeh-dot';
          const size = 4 + Math.random() * 12;
          dot.style.cssText = `
            width:${size}px; height:${size}px;
            left:${Math.random() * 100}%; top:${Math.random() * 100}%;
            --duration:${6 + Math.random() * 8}s;
            --delay:${-Math.random() * 8}s;
            --scale:${0.6 + Math.random() * 0.8};
            --drift-y:${-20 - Math.random() * 40}px;
            --max-opacity:${0.3 + Math.random() * 0.4};
          `;
          bokehContainer.appendChild(dot);
        }
      }
    }

    // ── HD-2D: Apply era class and depth layering to combat background ──
    {
      const eraClassMap = {1:'era-xianqin',2:'era-han',3:'era-tang',4:'era-song',5:'era-modern'};
      const eraClass = eraClassMap[chapterId] || 'era-xianqin';
      div.classList.add(eraClass);
      // Background gets depth-far blur so foreground sprites pop
      // bg-depth-far removed - was blurring entire screen
      const arena = div.querySelector('#arena');
      if (arena) arena.classList.add('bg-depth-near');
    }

    // ── Inject SVG sprites into empty containers ──
    {
      const playerContainer = div.querySelector('#player-sprite');
      if (playerContainer) {
        playerContainer.innerHTML = getPlayerSprite();
        playerContainer.style.width = '140px';
        playerContainer.style.height = '180px';
      }
      const enemyContainer = div.querySelector('#enemy-sprite');
      if (enemyContainer) {
        const spriteKey = enemyType.sprite || 'enemy_moling';
        enemyContainer.innerHTML = SPRITES[spriteKey] || SPRITES.enemy_moling;
        enemyContainer.style.width = '140px';
        enemyContainer.style.height = '180px';

        // Add shield icon overlay if shield is active
        if (shieldActive) {
          const shieldIcon = document.createElement('div');
          shieldIcon.className = 'shield-icon';
          shieldIcon.id = 'shield-icon';
          shieldIcon.textContent = '🛡';
          enemyContainer.style.position = 'relative';
          enemyContainer.appendChild(shieldIcon);
        }

        // Add enrage aura if triggered
        if (enrageTriggered) {
          const aura = document.createElement('div');
          aura.className = 'enemy-enrage-aura';
          aura.id = 'enrage-aura';
          enemyContainer.style.position = 'relative';
          enemyContainer.appendChild(aura);
        }
      }
    }

    // Start breathing animations
    const playerSpriteEl = div.querySelector('#player-sprite');
    const enemySpriteEl = div.querySelector('#enemy-sprite');
    stopPlayerBreath = startBreathingAnimation(playerSpriteEl);
    stopEnemyBreath = startBreathingAnimation(enemySpriteEl);

    // ── Low HP heartbeat warning (player HP < 25%) ──
    {
      const existingHeartbeat = div.querySelector('.heartbeat-overlay');
      if (playerHp < effectiveMaxHp * 0.25 && playerHp > 0) {
        if (!existingHeartbeat) {
          const hbOverlay = document.createElement('div');
          hbOverlay.className = 'heartbeat-overlay';
          div.appendChild(hbOverlay);
        }
      } else if (existingHeartbeat) {
        existingHeartbeat.remove();
      }
    }

    // ── Question text blur-in from top ──
    const questionEl = div.querySelector('.combat-question');
    if (questionEl) {
      questionEl.style.opacity = '0';
      questionEl.style.transform = 'translateY(-15px)';
      questionEl.style.filter = 'blur(4px)';
      requestAnimationFrame(() => requestAnimationFrame(() => {
        questionEl.style.transition = 'all 0.4s ease-out';
        questionEl.style.opacity = '1';
        questionEl.style.transform = 'translateY(0)';
        questionEl.style.filter = 'blur(0)';
      }));
    }

    // ── Option card staggered entrance ──
    div.querySelectorAll('.combat-option').forEach((opt, i) => {
      opt.style.opacity = '0';
      opt.style.transform = 'translateY(30px)';
      opt.style.transition = `opacity 0.3s ${i * 0.08}s ease-out, transform 0.3s ${i * 0.08}s ease-out`;
      requestAnimationFrame(() => requestAnimationFrame(() => {
        opt.style.opacity = '1';
        opt.style.transform = 'translateY(0)';
      }));
    });

    // ── Timer (talent: timeFreeze adds seconds to first question) ──
    const freezeBonus = isFirstQuestion && combatTalents.freezeFirst ? combatTalents.freezeFirst : 0;
    let timeLeft = baseTimer + freezeBonus;
    isFirstQuestion = false;
    const timerBar = div.querySelector('#timer-bar');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timerBar) timerBar.style.width = Math.max(0, (timeLeft / baseTimer) * 100) + '%';

      // Timer urgency at < 5s — CSS class pulse; legacy JS pulse at < 3s
      if (timerBar) {
        if (timeLeft < 5 && timeLeft > 0) {
          timerBar.classList.add('timer-urgent');
          // Add red screen-edge pulse overlay if not already present
          if (!div.querySelector('.combat-urgency-overlay')) {
            const urgOverlay = document.createElement('div');
            urgOverlay.className = 'combat-urgency-overlay';
            div.appendChild(urgOverlay);
          }
        } else {
          timerBar.classList.remove('timer-urgent');
          const urgEl = div.querySelector('.combat-urgency-overlay');
          if (urgEl) urgEl.remove();
        }
      }

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
        if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
        handleAnswer(-1, q, true);
      }
    }, 100);

    // ── Scramble ability: shuffle options after 5 seconds ──
    if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
    if (enemyType.ability === 'scramble') {
      scrambleTimer = setTimeout(() => {
        const optionsEl = div.querySelector('#options');
        if (!optionsEl) return;
        const btns = [...optionsEl.querySelectorAll('.combat-option')];
        if (btns.length < 2) return;
        // Animate out
        btns.forEach(b => { b.style.animation = 'option-scramble 0.5s ease-out'; });
        setTimeout(() => {
          // Fisher-Yates shuffle of DOM elements
          for (let i = btns.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            optionsEl.appendChild(btns[j]);
          }
          // Clear animation
          btns.forEach(b => { b.style.animation = ''; });
          // Show scramble notification
          const scrambleNote = document.createElement('div');
          scrambleNote.textContent = '选项已打乱！';
          scrambleNote.style.cssText = `
            position:absolute; top:40%; left:50%;
            transform:translate(-50%,-50%) scale(0);
            color:#e67e22; font-size:1.3rem; font-weight:900;
            text-shadow: 0 0 12px #e67e22, 2px 2px 0 #000;
            pointer-events:none; z-index:1003;
            transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease-out;
          `;
          div.appendChild(scrambleNote);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            scrambleNote.style.transform = 'translate(-50%,-50%) scale(1)';
          }));
          setTimeout(() => { scrambleNote.style.opacity = '0'; }, 600);
          setTimeout(() => scrambleNote.remove(), 1000);
        }, 300);
      }, 5000);
    }

    // ── Ability buttons ──
    const abilitiesEl = div.querySelector('#abilities');
    if (abilitiesEl) {
      let btns = '';
      const _hintCost = (profile.companionFriendship?.xp || 0) >= 20 ? 0 : 1;
      if (hasAbility(profile, 'hint'))   btns += `<button class="btn" id="btn-hint"   style="padding:6px 14px;font-size:0.95rem;" ${profile.wenli < _hintCost ? 'disabled' : ''}>提示 (${_hintCost}文力)</button>`;
      if (hasAbility(profile, 'skip'))   btns += `<button class="btn" id="btn-skip"   style="padding:6px 14px;font-size:0.95rem;" ${profile.wenli < 2 ? 'disabled' : ''}>跳过 (2文力)</button>`;
      if (hasAbility(profile, 'double')) btns += `<button class="btn" id="btn-double" style="padding:6px 14px;font-size:0.95rem;" ${profile.wenli < 2 ? 'disabled' : ''}>双倍 (2文力)</button>`;
      // Consumable button — show if player has any consumables
      const totalConsumables = Object.values(profile.consumables || {}).reduce((s, v) => s + v, 0);
      if (totalConsumables > 0) btns += `<button class="btn" id="btn-consumable" style="padding:6px 14px;font-size:0.95rem;">🎒 道具</button>`;
      abilitiesEl.innerHTML = btns;
    }

    const hintBtn = div.querySelector('#btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => {
      // Companion Lv2 buff: hint costs 0 wenli instead of 1
      const hintCost = (profile.companionFriendship?.xp || 0) >= 20 ? 0 : 1;
      if (profile.wenli < hintCost) return;
      profile.wenli -= hintCost;
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
      if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
      qIndex++;
      if (qIndex >= questions.length) {
        // Loop questions if enemy is still alive
        qIndex = 0;
        // Shuffle questions for variety
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
      }
      render();
    });

    const doubleBtn = div.querySelector('#btn-double');
    if (doubleBtn) doubleBtn.addEventListener('click', () => {
      if (doubleActive || doubleBtn.disabled) return; // Prevent double-activation
      if (profile.wenli < 2) return;
      profile.wenli -= 2;
      doubleActive = true;
      doubleBtn.disabled = true;
      doubleBtn.textContent = '双倍 ✓';
    });

    // ── Consumable overlay ──
    const consumableBtn = div.querySelector('#btn-consumable');
    if (consumableBtn) consumableBtn.addEventListener('click', () => {
      if (div.querySelector('.consumable-overlay')) return; // Already open
      const items = Object.entries(profile.consumables || {}).filter(([, count]) => count > 0);
      if (!items.length) return;
      const CONSUMABLE_META = {
        'hp-potion':     { name: '回春丹',   icon: '🧪', desc: 'HP+50' },
        'hp-potion-lg':  { name: '回天丹',   icon: '💊', desc: 'HP全满' },
        'wenli-potion':  { name: '灵墨丹',   icon: '🔮', desc: '文力全满' },
        'xp-scroll':     { name: '经验卷轴', icon: '📜', desc: '本战XP×2' },
        'atk-boost':     { name: '虎符',     icon: '🐯', desc: '攻击+5' },
        'def-boost':     { name: '龟甲',     icon: '🐢', desc: '防御+5' },
        'combo-starter': { name: '连击符',   icon: '🔥', desc: '连击+3' },
        'gold-charm':    { name: '招财符',   icon: '💰', desc: '金币×2' },
      };
      const overlay = document.createElement('div');
      overlay.className = 'consumable-overlay';
      overlay.style.cssText = `
        position:absolute;bottom:140px;left:50%;transform:translateX(-50%);
        background:rgba(10,10,20,0.95);border:1px solid rgba(212,160,23,0.4);
        border-radius:12px;padding:12px;z-index:500;min-width:200px;max-width:320px;
        display:flex;flex-wrap:wrap;gap:8px;justify-content:center;
        animation:fadeIn 0.15s ease-out;
      `;
      items.forEach(([id, count]) => {
        const meta = CONSUMABLE_META[id] || { name: id, icon: '📦', desc: '' };
        const btn = document.createElement('button');
        btn.className = 'btn';
        btn.style.cssText = 'padding:8px 12px;font-size:0.88rem;display:flex;align-items:center;gap:6px;';
        btn.innerHTML = `${meta.icon} ${meta.name} <span style="opacity:0.5;">×${count}</span>`;
        btn.addEventListener('click', () => {
          // Deduct
          profile.consumables[id] = Math.max(0, (profile.consumables[id] || 0) - 1);
          if (profile.consumables[id] <= 0) delete profile.consumables[id];
          // Apply effect
          const eff = { 'hp-potion': () => { profile.hp = Math.min(getEffectiveMaxHp(profile), profile.hp + 50); },
            'hp-potion-lg':  () => { profile.hp = getEffectiveMaxHp(profile); },
            'wenli-potion':  () => { profile.wenli = getEffectiveMaxWenli(profile); },
            'xp-scroll':     () => { if (!gameState.currentQuest._xpDouble) gameState.currentQuest._xpDouble = true; },
            'atk-boost':     () => { profile.attack += 5; gameState.currentQuest._atkBoosted = (gameState.currentQuest._atkBoosted || 0) + 5; },
            'def-boost':     () => { profile.defense += 5; gameState.currentQuest._defBoosted = (gameState.currentQuest._defBoosted || 0) + 5; },
            'combo-starter': () => { combo = Math.max(combo, 3); },
            'gold-charm':    () => { if (!gameState.currentQuest._goldDouble) gameState.currentQuest._goldDouble = true; },
          };
          if (eff[id]) eff[id]();
          playerHp = profile.hp; // Sync local HP
          gameState.save();
          overlay.remove();
          playSound('correct');
          showToast(`使用了 ${meta.name}！`, { type: 'item', duration: 2000 });
          render(); // Re-render to update HP/wenli display
        });
        overlay.appendChild(btn);
      });
      // Close button
      const closeBtn = document.createElement('button');
      closeBtn.className = 'btn';
      closeBtn.style.cssText = 'padding:4px 16px;font-size:0.82rem;opacity:0.6;width:100%;';
      closeBtn.textContent = '关闭';
      closeBtn.addEventListener('click', () => overlay.remove());
      overlay.appendChild(closeBtn);
      div.appendChild(overlay);
    });

    const combatOptions = div.querySelectorAll('.combat-option');
    combatOptions.forEach((btn, i) => {
      btn.classList.add('spotlight-card');
      btn.setAttribute('aria-label', `选项 ${i + 1}: ${btn.textContent}`);
      btn.addEventListener('click', () => {
        clearInterval(timerInterval);
        clearInterval(timerPulseInterval);
        if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
        const idx = parseInt(btn.dataset.idx);
        handleAnswer(idx, q);
      });
    });

    // Keyboard shortcuts: 1-4 keys select combat options
    // Remove previous handler first (prevents stacking on re-render)
    if (activeKeyHandler) {
      document.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
    const keyHandler = (e) => {
      const num = parseInt(e.key);
      if (num >= 1 && num <= combatOptions.length) {
        e.preventDefault();
        document.removeEventListener('keydown', keyHandler);
        activeKeyHandler = null;
        combatOptions[num - 1]?.click();
      }
    };
    activeKeyHandler = keyHandler;
    document.addEventListener('keydown', keyHandler);

    // ── Pause / Resume ──
    const pauseBtn = div.querySelector('#btn-pause');
    const pauseOverlay = div.querySelector('#pause-overlay');
    const resumeBtn = div.querySelector('#btn-resume');
    if (pauseBtn && pauseOverlay && resumeBtn) {
      pauseBtn.addEventListener('click', () => {
        // Stop timer
        clearInterval(timerInterval);
        clearInterval(timerPulseInterval);
        // Hide question and options (visibility:hidden preserves layout)
        const questionEl = div.querySelector('.combat-question');
        const optionsEl = div.querySelector('#options');
        if (questionEl) questionEl.style.visibility = 'hidden';
        if (optionsEl) optionsEl.style.visibility = 'hidden';
        // Show overlay
        pauseOverlay.style.display = 'flex';
      });
      resumeBtn.addEventListener('click', () => {
        // Hide overlay
        pauseOverlay.style.display = 'none';
        // Show question and options
        const questionEl = div.querySelector('.combat-question');
        const optionsEl = div.querySelector('#options');
        if (questionEl) questionEl.style.visibility = '';
        if (optionsEl) optionsEl.style.visibility = '';
        // Restart timer
        const timerBar = div.querySelector('#timer-bar');
        timerInterval = setInterval(() => {
          timeLeft -= 0.1;
          if (timerBar) timerBar.style.width = Math.max(0, (timeLeft / baseTimer) * 100) + '%';
          if (timerBar) {
            if (timeLeft < 5 && timeLeft > 0) {
              timerBar.classList.add('timer-urgent');
            } else {
              timerBar.classList.remove('timer-urgent');
            }
          }
          if (timeLeft <= 0) {
            clearInterval(timerInterval);
            clearInterval(timerPulseInterval);
            if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
            handleAnswer(-1, q, true);
          }
        }, 100);
      });
    }

    // Retreat from pause menu
    const retreatBtn = div.querySelector('#btn-pause-retreat');
    if (retreatBtn) {
      retreatBtn.addEventListener('click', () => {
        combatEnded = true;
        clearInterval(timerInterval);
        clearInterval(timerPulseInterval);
        if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
        if (activeKeyHandler) { document.removeEventListener('keydown', activeKeyHandler); activeKeyHandler = null; }
        destroyCombatBackground();
        stopBreaths();
        profile.hp = playerHp;
        gameState.save();
        showScreen('worldmap');
      });
    }
  }

  function handleAnswer(idx, q, isTimeout = false) {
    stopBreaths();
    // Clean up keyboard handler to prevent stale firing
    if (activeKeyHandler) {
      document.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
    // Remove urgency overlay on answer
    const urgEl = div.querySelector('.combat-urgency-overlay');
    if (urgEl) urgEl.remove();
    const correct = idx === q.correct;
    const buttons = div.querySelectorAll('.combat-option');

    // ── Persona 5-style answer selection animations ──
    let dismissIdx = 0;
    buttons.forEach(btn => {
      btn.style.pointerEvents = 'none';
      const bIdx = parseInt(btn.dataset.idx);
      if (bIdx === idx) {
        // Selected option: P5 snap-forward with scale + rotation
        btn.style.animation = 'p5-select-snap 0.35s ease-out';
        btn.style.zIndex = '10';
      } else if (bIdx === q.correct && !correct) {
        // Correct answer (when player chose wrong): highlight it
        btn.classList.add('correct');
      } else {
        // Non-selected, non-correct options: P5 diagonal dismiss
        const direction = dismissIdx % 2 === 0 ? 'p5-dismiss-left' : 'p5-dismiss-right';
        btn.style.animation = `${direction} 0.3s ease-in forwards`;
        btn.style.animationDelay = `${dismissIdx * 0.05}s`;
        dismissIdx++;
      }
    });

    // After snap animation, apply correct/wrong class to selected button
    setTimeout(() => {
      buttons.forEach(btn => {
        const bIdx = parseInt(btn.dataset.idx);
        if (bIdx === q.correct) {
          btn.classList.add('correct');
        } else if (bIdx === idx) {
          btn.classList.add('wrong');
        }
      });
    }, 200);

    // ── Ink splash effect at clicked option position (Okami/Gris style) ──
    if (idx >= 0) {
      const clickedBtn = [...buttons].find(b => parseInt(b.dataset.idx) === idx);
      if (clickedBtn) {
        const btnRect = clickedBtn.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const splash = document.createElement('div');
        splash.className = correct ? 'ink-splash-correct' : 'ink-splash-wrong';
        splash.style.left = (btnRect.left - divRect.left + btnRect.width / 2) + 'px';
        splash.style.top = (btnRect.top - divRect.top + btnRect.height / 2) + 'px';
        splash.style.zIndex = '1010';
        div.appendChild(splash);
        setTimeout(() => splash.remove(), 700);
      }
    }

    // ── P5-style result slam (graphic-novel impact frame) ──
    const feedbackEl = div.querySelector('#feedback');
    if (feedbackEl) {
      feedbackEl.style.animation = 'p5-result-slam 0.5s cubic-bezier(0.25, 0.46, 0.45, 0.94)';
      feedbackEl.style.animationDelay = '0.25s';
      feedbackEl.style.animationFillMode = 'both';
      feedbackEl.addEventListener('animationend', () => {
        feedbackEl.style.animation = '';
      }, { once: true });
    }

    recordAnswer('vocab', correct, q.id);
    const _ql = gameState.currentQuest?.results?.questionsLog;
    if (_ql) _ql.push({ prompt: q.prompt, correct, explanation: q.explanation || '', isReview: q.isReview || false });

    // ── Per-question save checkpoint (prevents data loss on crash) ──
    profile.hp = playerHp;
    gameState.save();

    // ── Spaced repetition tracking ──
    if (!correct) {
      recordWrongAnswer(q.id, 'vocab');
    } else if (q.isReview) {
      // Check if this correct review answer triggers mastery (correctStreak reaches 3)
      const profile_ = gameState.profile;
      const entry = profile_.wrongAnswerLog.find(e => e.questionId === q.id);
      const willMaster = entry && (entry.correctStreak || 0) + 1 >= 3;
      recordCorrectReview(q.id);
      if (willMaster) {
        // Show mastered celebration
        setTimeout(() => {
          const masteredEl = document.createElement('div');
          masteredEl.className = 'mastered-celebration';
          masteredEl.textContent = '已掌握！';
          div.appendChild(masteredEl);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            masteredEl.style.transform = 'translate(-50%, -50%) scale(1)';
          }));
          setTimeout(() => {
            masteredEl.style.opacity = '0';
            masteredEl.style.transform = 'translate(-50%, -50%) scale(1.3)';
          }, 900);
          setTimeout(() => masteredEl.remove(), 1300);
        }, 200);
      }
    }

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
      // Combo SFX on 3+ combo
      if (combo >= 3) playSound('combo');
      // Brief music intensity bump on combo (auto-decays after 4 seconds)
      if (combo >= 5) {
        setMusicIntensity(2);
        setTimeout(() => setMusicIntensity(1), 4000);
      } else if (combo >= 3) {
        setMusicIntensity(2);
        setTimeout(() => setMusicIntensity(1), 3000);
      }

      // ── Streak milestone celebrations ──
      if (combo === 3) {
        try { showToast('不错！3连击', { type: 'combo', duration: 1500 }); } catch(_){}
      } else if (combo === 5) {
        try { screenFlash('#d4a017', 150, div); showToast('厉害！5连击', { type: 'combo', duration: 1500 }); } catch(_){}
      } else if (combo === 8) {
        try { shakeElement(div, 4, 200); burstParticles(20, 'victory'); showToast('无敌！8连击 +20金', { type: 'combo', duration: 2000 }); profile.gold = (profile.gold||0) + 20; } catch(_){}
      } else if (combo === 10) {
        try { burstParticles(30, 'victory'); showToast('完美连击！', { type: 'achievement', duration: 2500 }); } catch(_){}
      }

      // ── Dodge ability: 20% chance enemy dodges ──
      if (enemyType.ability === 'dodge' && Math.random() < 0.2) {
        // Enemy dodges — no damage dealt
        const enemySpriteDodge = div.querySelector('#enemy-sprite');
        if (enemySpriteDodge) {
          enemySpriteDodge.style.animation = 'enemy-dodge 0.6s ease-out';
          enemySpriteDodge.addEventListener('animationend', () => {
            enemySpriteDodge.style.animation = '';
          }, { once: true });
        }
        // Show dodge text
        const dodgeText = document.createElement('div');
        dodgeText.textContent = '闪避！';
        dodgeText.style.cssText = `
          position:absolute; top:30%; left:65%;
          transform:translate(-50%,-50%) scale(0);
          color:#9b59b6; font-size:1.8rem; font-weight:900;
          text-shadow: 0 0 16px #9b59b6, 2px 2px 0 #000;
          pointer-events:none; z-index:1005;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease-out;
        `;
        div.appendChild(dodgeText);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          dodgeText.style.transform = 'translate(-50%,-50%) scale(1)';
        }));
        setTimeout(() => { dodgeText.style.opacity = '0'; }, 600);
        setTimeout(() => dodgeText.remove(), 1000);

        div.querySelector('#feedback').textContent = `✓ 正确！但${enemyName}闪避了攻击！ ${q.explanation}`;

        // Still update score even on dodge
        const speedBonus = Math.round(baseTimer * 0.3);
        chips += 10 + speedBonus;
        multiplier = parseFloat((multiplier + 0.5).toFixed(1));
        updateScorePanel(false);

        const quest = gameState.currentQuest;
        quest.results.combo = combo;
        setTimeout(() => {
          qIndex++;
          if (qIndex >= questions.length) {
            // Loop questions if enemy is still alive
            qIndex = 0;
            // Shuffle questions for variety
            for (let i = questions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [questions[i], questions[j]] = [questions[j], questions[i]];
            }
          }
          render();
        }, 1800);
        return;
      }

      // ── New stat-based damage calculation ──
      // Apply modifier crit bonus (e.g. 'critical storm' +30% crit chance)
      let isCrit = rollCrit(profile);
      if (!isCrit && modifier?.critBonus && Math.random() < modifier.critBonus) isCrit = true;
      const timerBar = div.querySelector('#timer-bar');
      const currentTimeLeft = timerBar ? (parseFloat(timerBar.style.width) / 100) * baseTimer : 0;
      let dmg = calcDamage(profile, combo, isCrit, currentTimeLeft);
      if (doubleActive) dmg *= 2;
      doubleActive = false;

      // Apply enemy defense reduction
      const defReduction = Math.max(0, dmg - enemyType.defense);
      dmg = Math.max(1, defReduction); // always deal at least 1

      // Executioner talent: enemy HP < 30% = +40% damage
      const talents = getTalentEffects(profile);
      if (talents.executePct && enemyHp < (enemyMaxHp * 0.3)) {
        dmg = Math.round(dmg * (1 + talents.executePct / 100));
      }

      // Apply encounter modifier effects
      if (modifier?.dmgMult) dmg = Math.round(dmg * modifier.dmgMult);
      if (modifier?.comboDmgMult && combo >= 3) dmg = Math.round(dmg * modifier.comboDmgMult);

      enemyHp = Math.max(0, enemyHp - dmg);

      // ── Enrage ability: trigger when enemy HP drops below 50% ──
      if (enemyType.ability === 'enrage' && !enrageTriggered && enemyHp > 0 && enemyHp < enemyMaxHp * 0.5) {
        enrageTriggered = true;
        // Show enrage banner
        const enrageText = document.createElement('div');
        enrageText.textContent = '暴怒！';
        enrageText.style.cssText = `
          position:absolute; top:25%; left:65%;
          transform:translate(-50%,-50%) scale(0);
          color:#e74c3c; font-size:2rem; font-weight:900;
          text-shadow: 0 0 20px #e74c3c, 0 0 40px #c0392b, 2px 2px 0 #000;
          pointer-events:none; z-index:1005;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease-out;
        `;
        div.appendChild(enrageText);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          enrageText.style.transform = 'translate(-50%,-50%) scale(1)';
        }));
        setTimeout(() => { enrageText.style.opacity = '0'; }, 800);
        setTimeout(() => enrageText.remove(), 1200);

        // Add red aura to enemy sprite
        const enemyContainerEnrage = div.querySelector('#enemy-sprite');
        if (enemyContainerEnrage) {
          const aura = document.createElement('div');
          aura.className = 'enemy-enrage-aura';
          aura.id = 'enrage-aura';
          enemyContainerEnrage.style.position = 'relative';
          enemyContainerEnrage.appendChild(aura);
        }
        // Red flash
        screenFlash('#c0392b', 500, div);
        shakeElement(div, 6, 300);
      }

      // ── CSS animation on selected correct button ──
      const selectedBtn = idx >= 0 ? [...buttons].find(b => parseInt(b.dataset.idx) === idx) : null;
      const correctBtn  = [...buttons].find(b => parseInt(b.dataset.idx) === q.correct);
      if (correctBtn) {
        correctBtn.style.animation = 'correct-pulse 0.4s ease-out';
        correctBtn.style.boxShadow = '0 0 20px rgba(39,174,96,0.5)';
      }

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
        floatingText(div, `+${chips} ×${multiplier.toFixed(1)}`, numX - 30, numY, { color: '#d4a017' });
      }

      // ── Player sprite attack via CSS keyframe ──
      if (playerSprite) {
        playerSprite.style.animation = 'sprite-attack 0.55s ease-out';
        playerSprite.addEventListener('animationend', () => {
          playerSprite.style.animation = '';
        }, { once: true });
      }

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

      // ── Enemy recoil via CSS keyframe ──
      setTimeout(() => {
        if (enemySprite) {
          enemySprite.style.animation = 'sprite-recoil 0.45s ease-out';
          enemySprite.addEventListener('animationend', () => {
            enemySprite.style.animation = '';
          }, { once: true });
        }
      }, 220);

      // Floating damage number above enemy sprite
      if (enemyWrap) {
        const ewRect = enemyWrap.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const numX = ewRect.left - divRect.left + ewRect.width / 2 - 20;
        const numY = ewRect.top - divRect.top - 10;
        floatingText(div, `-${dmg}`, numX, numY, { color: isCrit ? '#ffd700' : '#e74c3c' });
      }

      // ── CRITICAL HIT banner + screen shake ──
      if (isCrit) {
        playSound('crit');
        // Big golden CRITICAL HIT text
        const critBanner = document.createElement('div');
        critBanner.textContent = '暴击！CRITICAL HIT';
        critBanner.style.cssText = `
          position:absolute; top:28%; left:50%;
          transform:translate(-50%,-50%) scale(0);
          color:#ffd700; font-size:2.2rem; font-weight:900;
          text-shadow: 0 0 20px #ffd700, 0 0 40px #f39c12, 0 0 60px #d4a017, 2px 2px 0 #000;
          pointer-events:none; z-index:1005;
          transition: transform 0.3s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-out;
          letter-spacing: 3px;
        `;
        div.appendChild(critBanner);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          critBanner.style.transform = 'translate(-50%,-50%) scale(1)';
        }));
        setTimeout(() => {
          critBanner.style.opacity = '0';
          critBanner.style.transform = 'translate(-50%,-50%) scale(1.3)';
        }, 700);
        setTimeout(() => critBanner.remove(), 1100);

        // Extra screen shake on crit
        shakeElement(div, 10, 500);
      }

      // ── Speed bonus indicator (answered within 5 seconds) ──
      {
        const answerTime = baseTimer - currentTimeLeft;
        if (answerTime <= 5 && talents.speedBonusPct) {
          const speedIndicator = document.createElement('div');
          speedIndicator.textContent = `SPEED BONUS +${talents.speedBonusPct}%`;
          speedIndicator.style.cssText = `
            position:absolute; top:38%; left:50%;
            transform:translate(-50%,-50%) scale(0);
            color:#00e5ff; font-size:1.1rem; font-weight:900;
            text-shadow: 0 0 12px #00e5ff, 0 0 24px #0088ff;
            pointer-events:none; z-index:1004;
            transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.25s ease-out;
            letter-spacing: 2px;
          `;
          div.appendChild(speedIndicator);
          requestAnimationFrame(() => requestAnimationFrame(() => {
            speedIndicator.style.transform = 'translate(-50%,-50%) scale(1)';
          }));
          setTimeout(() => {
            speedIndicator.style.opacity = '0';
          }, 600);
          setTimeout(() => speedIndicator.remove(), 900);
        }
      }

      // ── Prominent combo counter display ──
      if (combo >= 2) {
        const comboDisplay = document.createElement('div');
        const comboScale = Math.min(1 + combo * 0.08, 2.0);
        const comboColors = combo >= 10 ? '#ff0040' : combo >= 7 ? '#e74c3c' : combo >= 4 ? '#e67e22' : '#d4a017';
        comboDisplay.textContent = `x${combo} COMBO`;
        comboDisplay.style.cssText = `
          position:absolute; top:22%; left:50%;
          transform:translate(-50%,-50%) scale(0);
          color:${comboColors}; font-size:${1.4 * comboScale}rem; font-weight:900;
          text-shadow: 0 0 16px ${comboColors}, 0 0 32px ${comboColors}80, 2px 2px 0 #000;
          pointer-events:none; z-index:1003;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease-out;
          letter-spacing: 2px;
        `;
        div.appendChild(comboDisplay);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          comboDisplay.style.transform = `translate(-50%,-50%) scale(${comboScale})`;
        }));
        setTimeout(() => {
          comboDisplay.style.opacity = '0';
          comboDisplay.style.transform = `translate(-50%,-50%) scale(${comboScale * 1.2})`;
        }, 500);
        setTimeout(() => comboDisplay.remove(), 900);
      }

      // Green flash on options panel
      if (optionsPanel) greenFlash(optionsPanel);

      // ── Correct answer confetti burst + screen brighten ──
      {
        // Screen brighten flash
        const flashOverlay = document.createElement('div');
        flashOverlay.className = 'correct-flash-overlay';
        div.appendChild(flashOverlay);
        setTimeout(() => flashOverlay.remove(), 550);

        // Confetti-like particle burst
        const confettiColors = ['#d4a017', '#f39c12', '#27ae60', '#2ecc71', '#e74c3c', '#3498db', '#9b59b6'];
        for (let i = 0; i < 20; i++) {
          const cp = document.createElement('div');
          const angle = Math.random() * Math.PI * 2;
          const dist = 80 + Math.random() * 120;
          const tx = Math.cos(angle) * dist;
          const ty = Math.sin(angle) * dist - 40; // bias upward
          const rot = (Math.random() - 0.5) * 720;
          const size = 4 + Math.random() * 8;
          const color = confettiColors[Math.floor(Math.random() * confettiColors.length)];
          const shape = Math.random() > 0.5 ? '50%' : '2px';
          cp.style.cssText = `
            position:absolute; left:50%; top:45%;
            width:${size}px; height:${size}px;
            background:${color}; border-radius:${shape};
            pointer-events:none; z-index:1008;
            --tx:${tx}px; --ty:${ty}px; --rot:${rot}deg;
            animation: confetti-particle ${0.6 + Math.random() * 0.4}s ease-out forwards;
            animation-delay: ${Math.random() * 0.1}s;
          `;
          div.appendChild(cp);
          setTimeout(() => cp.remove(), 1200);
        }
      }

      // ── Combo milestone text flashes ──
      if (combo === 5) {
        const ms = document.createElement('div');
        ms.className = 'combo-milestone milestone-unstoppable';
        ms.textContent = 'UNSTOPPABLE!';
        div.appendChild(ms);
        setTimeout(() => ms.remove(), 1300);
      } else if (combo === 10) {
        const ms = document.createElement('div');
        ms.className = 'combo-milestone milestone-legendary';
        ms.textContent = 'LEGENDARY!';
        div.appendChild(ms);
        setTimeout(() => ms.remove(), 1300);
      }

      // Particle sparkle burst on correct answer
      burstParticles(15, 'victory');

      // PixiJS gold particle burst on enemy hit
      const enemyRectPx = div.querySelector('#enemy-sprite')?.getBoundingClientRect();
      const divRectPx = div.getBoundingClientRect();
      if (enemyRectPx && pixiApp) {
        const ex = enemyRectPx.left - divRectPx.left + enemyRectPx.width / 2;
        const ey = enemyRectPx.top - divRectPx.top + enemyRectPx.height / 2;
        pixiParticleBurst(ex, ey, 0xd4a017, 20);
      }

      // Combo display — CSS keyframe scale-up with gold glow
      const comboEl = div.querySelector('#combo');
      if (comboEl) {
        let comboColor = 'var(--accent-gold)';
        if (combo >= 6) comboColor = '#e74c3c';
        else if (combo >= 4) comboColor = '#e67e22';

        // Show "+1 COMBO!" briefly then roll to running count
        comboEl.textContent = '+1 COMBO!';
        comboEl.style.color = '#d4a017';
        comboEl.style.animation = 'combo-increment 0.45s ease-out';
        comboEl.addEventListener('animationend', () => {
          comboEl.style.animation = '';
          comboEl.textContent = combo > 1 ? combo + ' 连击！' : '';
          comboEl.style.color = comboColor;
        }, { once: true });
      }

      div.querySelector('#feedback').textContent = `✓ 正确！${isCrit ? '暴击！' : ''}造成 ${dmg} 点伤害！${enemyType.defense > 0 ? `(防御减免${enemyType.defense})` : ''}${combo > 1 ? `(${combo}连击)` : ''} ${q.explanation}`;

      // Update enemy HP bar with damage flash (use percentage of real HP)
      const enemyHpPct = (enemyHp / enemyMaxHp) * 100;
      const enemyHpBar = div.querySelector('#enemy-hp');
      if (enemyHpBar) {
        enemyHpBar.style.animation = 'hp-damage-flash 0.35s ease-out';
        enemyHpBar.addEventListener('animationend', () => {
          enemyHpBar.style.animation = enemyHpPct < 30 ? 'hp-critical-pulse 0.8s ease-in-out infinite' : '';
        }, { once: true });
        enemyHpBar.style.width = enemyHpPct + '%';
        if (enemyHpPct < 30) enemyHpBar.classList.add('hp-critical');
        else enemyHpBar.classList.remove('hp-critical');
      }
      // Update enemy HP text
      const enemyHpText = div.querySelector('.hud-hp-wrap:last-of-type .hud-hp-text');
      if (enemyHpText) enemyHpText.textContent = `HP: ${enemyHp}/${enemyMaxHp}`;

      // Companion combo reactions — only on notable milestones
      if (combo === 2) showCompanionBubble(div, pick(COMPANION.correctStreak2));
      else if (combo === 4) showCompanionBubble(div, pick(COMPANION.correctStreak4));

    } else {
      combo = 0;
      setMusicIntensity(1); // Drop back to base battle intensity

      // ── Shield ability: first wrong answer deals 0 damage ──
      if (shieldActive) {
        shieldActive = false;
        // Show "挡住了！" text
        const shieldBlockText = document.createElement('div');
        shieldBlockText.textContent = '挡住了！';
        shieldBlockText.style.cssText = `
          position:absolute; top:30%; left:35%;
          transform:translate(-50%,-50%) scale(0);
          color:#3498db; font-size:1.8rem; font-weight:900;
          text-shadow: 0 0 16px #3498db, 2px 2px 0 #000;
          pointer-events:none; z-index:1005;
          transition: transform 0.25s cubic-bezier(0.34,1.56,0.64,1), opacity 0.4s ease-out;
        `;
        div.appendChild(shieldBlockText);
        requestAnimationFrame(() => requestAnimationFrame(() => {
          shieldBlockText.style.transform = 'translate(-50%,-50%) scale(1)';
        }));
        setTimeout(() => { shieldBlockText.style.opacity = '0'; }, 600);
        setTimeout(() => shieldBlockText.remove(), 1000);

        // Shield break animation on the icon
        const shieldIconEl = div.querySelector('#shield-icon');
        if (shieldIconEl) {
          shieldIconEl.style.animation = 'shield-break 0.5s ease-out forwards';
          setTimeout(() => shieldIconEl.remove(), 600);
        }

        // Update enemy name to remove shield icon
        const enemyNameHud = div.querySelector('.hud-enemy-name');
        if (enemyNameHud) enemyNameHud.textContent = enemyName;
        const spriteLabelEl = div.querySelector('#enemy-sprite-wrap .sprite-label');
        if (spriteLabelEl) spriteLabelEl.textContent = enemyName;

        div.querySelector('#feedback').textContent = `✗ 错误！但${enemyName}的盾挡住了伤害！盾已碎裂！ ${q.explanation}`;

        // Still break combo + multiplier
        multiplier = 1.0;
        updateScorePanel(true);

        const quest = gameState.currentQuest;
        quest.results.combo = combo;
        setTimeout(() => {
          qIndex++;
          if (qIndex >= questions.length) {
            // Loop questions if enemy is still alive
            qIndex = 0;
            // Shuffle questions for variety
            for (let i = questions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [questions[i], questions[j]] = [questions[j], questions[i]];
            }
          }
          render();
        }, 1800);
        return;
      }

      const enemyAtkDmg = enrageTriggered ? Math.round(enemyType.attack * 1.5) : enemyType.attack;
      const dmgResult = calcDamageTaken(profile, isTimeout ? Math.round(enemyAtkDmg * 1.3) : enemyAtkDmg);
      const hpLoss = dmgResult.damage;
      const thornsReturn = dmgResult.thornsReturn;
      playerHp = Math.max(0, playerHp - hpLoss);

      // ── Thorns damage: reflect damage back to enemy ──
      if (thornsReturn > 0) {
        enemyHp = Math.max(1, enemyHp - thornsReturn); // Thorns can't kill — min 1 HP
        // Show thorns damage floating number on enemy
        setTimeout(() => {
          if (enemyWrap) {
            const ewRect = enemyWrap.getBoundingClientRect();
            const divRect = div.getBoundingClientRect();
            const numX = ewRect.left - divRect.left + ewRect.width / 2 - 20;
            const numY = ewRect.top - divRect.top - 10;
            floatingText(div, `荆棘 -${thornsReturn}`, numX, numY, { color: '#27ae60' });
          }
          // Update enemy HP bar for thorns
          const enemyHpBar = div.querySelector('#enemy-hp');
          if (enemyHpBar) enemyHpBar.style.width = (enemyHp / enemyMaxHp) * 100 + '%';
        }, 600);
      }

      // ── CSS animation on the wrong-selected button ──
      if (idx >= 0) {
        const wrongBtn = [...buttons].find(b => parseInt(b.dataset.idx) === idx);
        if (wrongBtn) {
          wrongBtn.style.animation = 'wrong-shake 0.4s ease-out';
          wrongBtn.addEventListener('animationend', () => {
            wrongBtn.style.animation = '';
          }, { once: true });
        }
      }

      // ── Multiplier BREAK animation ──
      multiplier = 1.0;
      updateScorePanel(true); // triggers red flash on panel

      // ── Enemy dashes forward via CSS keyframe ──
      if (enemySprite) {
        enemySprite.style.animation = 'sprite-damage 0.5s ease-out';
        enemySprite.addEventListener('animationend', () => {
          enemySprite.style.animation = '';
        }, { once: true });
      }

      // ── Player hurt via CSS keyframe (replaces plain shake) ──
      setTimeout(() => {
        if (playerSprite) {
          playerSprite.style.animation = 'player-hurt 0.45s ease-out';
          playerSprite.addEventListener('animationend', () => {
            playerSprite.style.animation = '';
          }, { once: true });
        }
      }, 200);

      // Red screen flash
      screenFlash('#c0392b', 500, div);

      // PixiJS red particle burst on player hit
      const playerRectPx = div.querySelector('#player-sprite')?.getBoundingClientRect();
      const divRectWrong = div.getBoundingClientRect();
      if (playerRectPx && pixiApp) {
        const px = playerRectPx.left - divRectWrong.left + playerRectPx.width / 2;
        const py = playerRectPx.top - divRectWrong.top + playerRectPx.height / 2;
        pixiParticleBurst(px, py, 0xc0392b, 15);
      }

      // Floating "-HP" above player
      if (playerWrap) {
        const pwRect = playerWrap.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const numX = pwRect.left - divRect.left + pwRect.width / 2 - 15;
        const numY = pwRect.top - divRect.top - 10;
        floatingText(div, `-${hpLoss}HP`, numX, numY, { color: '#e74c3c' });
      }

      // Show "×1.0 BREAK!" float over score panel
      const scorePanel = div.querySelector('#score-panel');
      if (scorePanel) {
        const spRect = scorePanel.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const numX = spRect.left - divRect.left + spRect.width / 2 - 30;
        const numY = spRect.top - divRect.top - 5;
        floatingText(div, '×1.0 BREAK!', numX - 20, numY, { color: '#e74c3c' });
      }

      // Reset combo display — CSS combo-break shatter animation
      const comboEl = div.querySelector('#combo');
      if (comboEl && comboEl.textContent.trim() !== '') {
        comboEl.style.animation = 'combo-break 0.4s ease-out forwards';
        comboEl.addEventListener('animationend', () => {
          comboEl.style.animation = '';
          comboEl.textContent = '';
        }, { once: true });
      } else if (comboEl) {
        comboEl.textContent = '';
      }

      div.querySelector('#feedback').textContent = `✗ 错误！失去 ${hpLoss} HP。${enrageTriggered ? '(暴怒加成！)' : ''}${thornsReturn > 0 ? `荆棘反弹 ${thornsReturn} 伤害！` : ''}${q.explanation}`;

      // Update player HP bar with damage flash and critical pulse
      const playerHpBar = div.querySelector('#player-hp');
      if (playerHpBar) {
        const pct = (playerHp / effectiveMaxHp) * 100;
        playerHpBar.style.animation = 'hp-damage-flash 0.35s ease-out';
        playerHpBar.addEventListener('animationend', () => {
          playerHpBar.style.animation = pct < 30 ? 'hp-critical-pulse 0.8s ease-in-out infinite' : '';
        }, { once: true });
        playerHpBar.style.width = pct + '%';
        if (pct < 30) playerHpBar.classList.add('hp-critical');
        else playerHpBar.classList.remove('hp-critical');
      }

      // ── Low HP heartbeat overlay on damage ──
      {
        const existingHb = div.querySelector('.heartbeat-overlay');
        if (playerHp < effectiveMaxHp * 0.25 && playerHp > 0) {
          if (!existingHb) {
            const hbOverlay = document.createElement('div');
            hbOverlay.className = 'heartbeat-overlay';
            div.appendChild(hbOverlay);
          }
        }
      }

      // Companion encouragement on wrong answer; warn if HP drops low
      if (playerHp < effectiveMaxHp * 0.3) {
        showCompanionBubble(div, pick(COMPANION.lowHP));
      } else {
        showCompanionBubble(div, pick(COMPANION.wrongAnswer));
      }
    }

    const quest = gameState.currentQuest;
    quest.results.combo = combo;

    // ── Hit pause on killing blow (correct answer or thorns kill) ──────────────
    if (enemyHp <= 0) {
      clearInterval(timerInterval);
      if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
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
      if (qIndex >= questions.length) {
        // Loop questions if enemy is still alive
        qIndex = 0;
        // Shuffle questions for variety
        for (let i = questions.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [questions[i], questions[j]] = [questions[j], questions[i]];
        }
      }
      render();
    }, 700);
  }

  function endCombat(won) {
    // Guard against double-calls (timer + answer handler race)
    if (combatEnded) return;
    combatEnded = true;
    // Clean up keyboard handler
    if (activeKeyHandler) {
      document.removeEventListener('keydown', activeKeyHandler);
      activeKeyHandler = null;
    }
    destroyCombatBackground();
    stopBreaths();

    // Clean up PixiJS overlay
    if (pixiApp) {
      try { pixiApp.destroy(true); } catch(e) {}
      pixiApp = null;
    }

    clearInterval(timerInterval);
    clearInterval(timerPulseInterval);
    if (scrambleTimer) { clearTimeout(scrambleTimer); scrambleTimer = null; }
    setMusicIntensity(0); // Back to ambient
    if (won) playStinger('victory');
    encounter.completed = won;
    profile.hp = playerHp;
    // Revert temporary consumable stat boosts on any combat exit
    const quest = gameState.currentQuest;
    if (quest?._atkBoosted) { profile.attack = Math.max(0, profile.attack - quest._atkBoosted); quest._atkBoosted = 0; }
    if (quest?._defBoosted) { profile.defense = Math.max(0, profile.defense - quest._defBoosted); quest._defBoosted = 0; }
    // Companion Lv6 buff: heal 5HP after each combat victory
    if (won && (profile.companionFriendship?.xp || 0) >= 280) {
      profile.hp = Math.min(getEffectiveMaxHp(profile), profile.hp + 5);
    }
    gameState.save();

    if (!won) {
      // ── Enhanced defeat screen ──────────────────────────────────────────
      const quest = gameState.currentQuest;
      const results = quest ? quest.results : { correct: 0, total: 0, maxCombo: 0 };
      const damageDealt = enemyMaxHp - enemyHp;
      const motivationalTexts = [
        "文字之路没有捷径，但每次失败都让你更强！",
        "墨暗之力只是暂时的胜利——你的知识终将战胜一切！",
        "连最强的文定乾坤也有过失败——重要的是永不放弃！",
      ];
      const motivation = motivationalTexts[Math.floor(Math.random() * motivationalTexts.length)];

      // Dark + red vignette overlay with fade-in
      div.style.filter = '';
      div.innerHTML = `
        <style>
          @keyframes defeat-vignette-in {
            0% { opacity:0; }
            100% { opacity:1; }
          }
          @keyframes defeat-text-fade {
            0% { opacity:0; transform:translateY(20px); }
            100% { opacity:1; transform:translateY(0); }
          }
          @keyframes defeat-btn-pulse {
            0%,100% { box-shadow:0 0 0 0 rgba(192,57,43,0.5); }
            50% { box-shadow:0 0 0 10px rgba(192,57,43,0); }
          }
          .defeat-overlay {
            position:absolute; inset:0; z-index:10;
            background:
              radial-gradient(ellipse at center, transparent 40%, rgba(139,0,0,0.35) 80%, rgba(0,0,0,0.85) 100%),
              rgba(0,0,0,0.75);
            display:flex; flex-direction:column; align-items:center; justify-content:center;
            padding:24px;
            animation: defeat-vignette-in 1.2s ease-out forwards;
          }
          .defeat-title {
            font-size:2.8rem; font-weight:900; color:#c0392b;
            text-shadow: 0 0 30px rgba(192,57,43,0.6), 0 0 60px rgba(192,57,43,0.3);
            margin-bottom:8px; opacity:0;
            animation: defeat-text-fade 0.8s ease-out 0.4s forwards;
          }
          .defeat-subtitle {
            font-size:1.1rem; color:var(--text-secondary); margin-bottom:20px; opacity:0;
            animation: defeat-text-fade 0.6s ease-out 0.8s forwards;
          }
          .defeat-stats {
            background:rgba(0,0,0,0.5); border:1px solid rgba(192,57,43,0.3);
            border-radius:10px; padding:16px 28px; margin-bottom:16px;
            width:100%; max-width:360px; opacity:0;
            animation: defeat-text-fade 0.6s ease-out 1.2s forwards;
          }
          .defeat-stat-row {
            display:flex; justify-content:space-between; align-items:center;
            padding:6px 0; border-bottom:1px solid rgba(255,255,255,0.06);
            font-size:0.95rem;
          }
          .defeat-stat-row:last-child { border-bottom:none; }
          .defeat-stat-label { color:var(--text-secondary); }
          .defeat-stat-value { font-weight:700; color:var(--accent-gold); }
          .defeat-motivation {
            font-style:italic; font-size:0.95rem; color:#e8a0a0;
            text-align:center; max-width:380px; line-height:1.5;
            margin-bottom:20px; opacity:0;
            animation: defeat-text-fade 0.6s ease-out 1.6s forwards;
          }
          .defeat-buttons {
            display:flex; flex-wrap:wrap; gap:10px; justify-content:center;
            opacity:0;
            animation: defeat-text-fade 0.6s ease-out 2.0s forwards;
          }
          .defeat-btn-retry {
            animation: defeat-btn-pulse 1.8s ease-in-out infinite;
          }
        </style>
        <div class="defeat-overlay">
          <div class="defeat-title">败北</div>
          <div class="defeat-subtitle">你被${enemyName}击败了……</div>
          <div class="defeat-stats">
            <div class="defeat-stat-row">
              <span class="defeat-stat-label">答对</span>
              <span class="defeat-stat-value">${results.correct} / ${results.total} 题</span>
            </div>
            <div class="defeat-stat-row">
              <span class="defeat-stat-label">最高连击</span>
              <span class="defeat-stat-value">${results.maxCombo || 0}</span>
            </div>
            <div class="defeat-stat-row">
              <span class="defeat-stat-label">造成伤害</span>
              <span class="defeat-stat-value">${damageDealt} 点</span>
            </div>
          </div>
          <div class="defeat-motivation">"${motivation}"</div>
          <div class="defeat-buttons">
            <button class="btn btn-primary defeat-btn-retry" id="btn-retry" style="padding:10px 28px;font-size:1rem;">再战一次</button>
            <button class="btn" id="btn-retreat" style="padding:10px 20px;">回到地图</button>
            ${profile.gold > 0 ? '<button class="btn" id="btn-shop" style="padding:10px 20px;">强化自己</button>' : ''}
          </div>
        </div>
      `;
      // Companion encouragement (shown after vignette fades in)
      setTimeout(() => showCompanionBubble(div, pick(COMPANION.defeat), 5000), 1400);
      setTimeout(() => {
        div.querySelector('#btn-retry').addEventListener('click', () => {
          profile.hp = profile.maxHp;
          // Regenerate questions for this encounter so retry gets fresh questions
          const enc = getCurrentEncounter();
          if (enc && enc.questions) {
            // Shuffle existing questions so they appear in different order
            for (let i = enc.questions.length - 1; i > 0; i--) {
              const j = Math.floor(Math.random() * (i + 1));
              [enc.questions[i], enc.questions[j]] = [enc.questions[j], enc.questions[i]];
            }
            // Also reshuffle each question's options (track by index, not text)
            enc.questions.forEach(q => {
              if (!q.options || q.options.length < 2) return;
              const indices = q.options.map((_, i) => i);
              for (let i = indices.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [indices[i], indices[j]] = [indices[j], indices[i]];
              }
              q.options = indices.map(i => q.options[i]);
              q.correct = indices.indexOf(q.correct);
            });
            enc.completed = false;
          }
          gameState.save();
          showScreen('combat');
        });
        div.querySelector('#btn-retreat').addEventListener('click', () => showScreen('worldmap'));
        const shopBtn = div.querySelector('#btn-shop');
        if (shopBtn) shopBtn.addEventListener('click', () => showScreen('shop'));
      }, 0);
      return;
    }

    // Record enemy in bestiary
    const enemySpriteKey = enemyType.sprite || 'enemy_moling';
    if (!profile.bestiary) profile.bestiary = {};
    const entry = profile.bestiary[enemySpriteKey] || { defeated: 0, firstSeen: Date.now() };
    entry.defeated++;
    profile.bestiary[enemySpriteKey] = entry;

    // Update combo record
    if (!profile.comboRecords) profile.comboRecords = { bestOverall: 0, bestPerChapter: {}, history: [] };
    const questCombo = gameState.currentQuest?.results?.maxCombo || 0;
    if (questCombo > profile.comboRecords.bestOverall) {
      profile.comboRecords.bestOverall = questCombo;
      showToast(`新连击记录！${questCombo}连击！`, { type: 'achievement', duration: 3000 });
    }

    // Update lastActiveTimestamp for comeback bonus
    profile.lastActiveTimestamp = Date.now();

    // Combat victory confetti
    confettiBurst({ count: 40, force: 8, colors: ['#d4a017', '#f5c842', '#2ecc8a'] });

    // Companion celebration on victory
    showCompanionBubble(div, pick(COMPANION.victory), 4000);

    // Play enemy death SFX
    try { playSound('enemy_death'); } catch (_) {}

    // Victory: enemy shatters into particles + golden light expands
    const enemyWrap = div.querySelector('#enemy-sprite-wrap');
    const enemySprite = div.querySelector('#enemy-sprite');
    if (enemySprite) {
      enemySprite.style.transition = 'opacity 0.5s ease-out, transform 0.5s ease-out';
      enemySprite.style.opacity = '0';
      enemySprite.style.transform = 'scale(1.3)';
      if (enemyWrap) {
        const ewRect = enemyWrap.getBoundingClientRect();
        const divRect = div.getBoundingClientRect();
        const cx = ewRect.left - divRect.left + ewRect.width / 2;
        const cy = ewRect.top - divRect.top + ewRect.height / 2;

        // Shatter particles — enemy sprite breaks apart
        setTimeout(() => {
          const shatterColors = ['#d4a017', '#f39c12', '#e74c3c', '#c0392b', '#555', '#888'];
          for (let i = 0; i < 24; i++) {
            const sp = document.createElement('div');
            const angle = (i / 24) * Math.PI * 2 + (Math.random() - 0.5) * 0.5;
            const dist = 50 + Math.random() * 100;
            const sx = Math.cos(angle) * dist;
            const sy = Math.sin(angle) * dist;
            const size = 5 + Math.random() * 10;
            const color = shatterColors[Math.floor(Math.random() * shatterColors.length)];
            sp.style.cssText = `
              position:absolute;
              left:${cx - size / 2}px; top:${cy - size / 2}px;
              width:${size}px; height:${size}px;
              background:${color};
              border-radius:${Math.random() > 0.4 ? '2px' : '50%'};
              pointer-events:none; z-index:1002;
              --sx:${sx}px; --sy:${sy}px;
              animation: shatter-particle ${0.5 + Math.random() * 0.5}s ease-out forwards;
            `;
            div.appendChild(sp);
            setTimeout(() => sp.remove(), 1100);
          }

          // Golden light burst expanding from enemy center
          const glow = document.createElement('div');
          glow.className = 'golden-light-burst';
          glow.style.left = cx + 'px';
          glow.style.top = cy + 'px';
          glow.style.transform = 'translate(-50%, -50%) scale(0)';
          div.appendChild(glow);
          setTimeout(() => glow.remove(), 900);
        }, 150);

        // Original particle explosion on top
        setTimeout(() => particleExplosion(div, cx, cy, 14), 350);
      }
    }

    // Victory mini-sequence before advancing
    setTimeout(() => {
      showVictorySequence(div, enemyWrap, div, () => {
        const quest = gameState.currentQuest;
        const next = advanceEncounter();
        if (!next) {
          showScreen('reward');
        } else {
          // Return to journey map so the player sees their progress
          showScreen('quest', {
            chapterId: quest.chapterId,
            questIndex: quest.questIndex,
            justFinishedEncounter: true,
          });
        }
      });
    }, 1400);
  }

  render();

  // ── Mini-progress bar (on top of everything) ─────────────────────────────
  createMiniProgress(div);

  // ── PixiJS combat effects overlay ────────────────────────────────────────
  try {
    if (window.PIXI) {
      const pixiContainer = document.createElement('div');
      pixiContainer.style.cssText = 'position:absolute;inset:0;pointer-events:none;z-index:100;';
      div.appendChild(pixiContainer);

      pixiApp = new PIXI.Application({
        width: div.clientWidth || 1280,
        height: div.clientHeight || 720,
        backgroundAlpha: 0,
        resolution: window.devicePixelRatio || 1,
        autoDensity: true,
      });
      pixiContainer.appendChild(pixiApp.view);
      pixiApp.view.style.cssText = 'position:absolute;inset:0;width:100%;height:100%;pointer-events:none;';
    }
  } catch(e) { console.warn('PixiJS init failed:', e); }

  // ── First-ever combat tutorial tooltip ──────────────────────────────────
  if (profile.stats.totalQuests === 0) {
    showTutorial(div, 'tutorial_combat', {
      targetSelector: '.combat-option',
      position: 'top',
      onDismiss: () => showEnemyTaunt(div, pick(ENEMY_TAUNTS.combat), 3000),
    });
  } else {
    // No tutorial — show enemy taunt immediately on combat start
    showEnemyTaunt(div, pick(ENEMY_TAUNTS.combat), 3000);
  }

  return div;
}

registerScreen('combat', renderCombat);
