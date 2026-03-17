// js/screens/boss.js — Classical Chinese boss battle with 3 phases
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';
import { hasAbility, calcDamage, calcDamageTaken, getTimerDuration, rollCrit, getEffectiveMaxHp, getTalentEffects } from '../progression.js';
import { loadChengyu } from '../content-loader.js';
import { SPRITES } from '../sprites.js';
import { playSound, playMusic, setMusicIntensity, playStinger } from '../audio.js';
import { showCompanionBubble, showEnemyTaunt, COMPANION, ENEMY_TAUNTS, pick } from './companion.js';
import { setParticleMode, burstParticles } from '../particles.js';
import { getPixelSprites, createSpriteImg } from '../pixel-sprites.js';
import { showTutorial } from '../tutorial.js';
import { shakeElement, shakeContainer, lungeElement, floatingText } from '../effects.js';

const BOSS_NARRATIVES = {
  phase1: [
    "仓颉之影低声吟诵古老的文字……破解它的含义！",
    "BOSS释放出一道文言咒语——翻译它来反击！",
  ],
  phase2: [
    "仓颉之影加大了攻势——这些虚词的含义你能辨别吗？",
    "BOSS的攻击更加猛烈——理解这些古文才能生存！",
  ],
  phase3: [
    "仓颉之影使出最强的文字之力——你必须完全理解才能获胜！",
    "这是最后的考验——读懂整段古文，一举击破！",
  ],
};

const BOSS_NAMES = {
  1: { name: '仓颉之影', sprite: '👹' },
  2: { name: '墨吏', sprite: '👺' },
  3: { name: '诗魔', sprite: '🐉' },
  4: { name: '词煞', sprite: '💀' },
  5: { name: '墨暗之主', sprite: '🌑' },
};

const bossSprites = {
  1: 'boss_cangjie',
  2: 'boss_moli',
  3: 'boss_shimo',
  4: 'boss_cisha',
  5: 'boss_final',
};

// ─── Boss special abilities (Balatro Boss Blind-inspired) ─────────────────────

const BOSS_ABILITIES = {
  1: {
    name: '文字迷雾',
    desc: '所有选项的顺序被打乱',
    effect: 'shuffle_options',
  },
  2: {
    name: '墨封',
    desc: '提示技能被封印，无法使用',
    effect: 'seal_abilities',
  },
  3: {
    name: '诗韵干扰',
    desc: '错误答案看起来更诱人——有一个选项被标记为"相似"',
    effect: 'confusing_options',
  },
  4: {
    name: '时间压迫',
    desc: '每道题只有10秒（正常20秒）',
    effect: 'half_timer',
  },
  5: {
    name: '全面压制',
    desc: '所有BOSS能力同时生效！',
    effect: 'all_abilities',
  },
};

function getBossAbility(chapterId) {
  return BOSS_ABILITIES[chapterId] || BOSS_ABILITIES[1];
}

function abilityActive(ability, effectName) {
  if (!ability) return false;
  return ability.effect === effectName || ability.effect === 'all_abilities';
}

// ─── Animation helpers (shared effects imported from ../effects.js) ──────────
// Local helpers that are specific to boss.js:

function goldenSlash(container, cx, cy) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    pointer-events:none; z-index:998;
  `;
  // Three golden slashes
  const slashes = [
    [cx - 80, cy - 50, cx + 80, cy + 50, '#d4a017', 5],
    [cx - 60, cy - 70, cx + 60, cy + 30, '#f39c12', 3],
    [cx - 40, cy - 20, cx + 100, cy + 60, '#fff', 2],
  ];
  slashes.forEach(([x1, y1, x2, y2, color, w]) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', color);
    line.setAttribute('stroke-width', w);
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  });
  container.appendChild(svg);
  setTimeout(() => { svg.style.transition = 'opacity 0.2s'; svg.style.opacity = '0'; }, 120);
  setTimeout(() => svg.remove(), 350);
}

function inkSplash(container, cx, cy) {
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.style.cssText = `
    position:absolute; inset:0; width:100%; height:100%;
    pointer-events:none; z-index:998;
  `;
  // Ink blot
  const blob = document.createElementNS('http://www.w3.org/2000/svg', 'ellipse');
  blob.setAttribute('cx', cx); blob.setAttribute('cy', cy);
  blob.setAttribute('rx', 50); blob.setAttribute('ry', 35);
  blob.setAttribute('fill', '#1a0a2e');
  blob.setAttribute('opacity', '0.85');
  svg.appendChild(blob);
  // Ink spatter lines
  const splats = [
    [cx, cy, cx - 60, cy - 30],
    [cx, cy, cx + 55, cy - 40],
    [cx, cy, cx - 30, cy + 55],
    [cx, cy, cx + 40, cy + 45],
    [cx, cy, cx - 70, cy + 15],
  ];
  splats.forEach(([x1, y1, x2, y2]) => {
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', x1); line.setAttribute('y1', y1);
    line.setAttribute('x2', x2); line.setAttribute('y2', y2);
    line.setAttribute('stroke', '#2d0a4e');
    line.setAttribute('stroke-width', '4');
    line.setAttribute('stroke-linecap', 'round');
    svg.appendChild(line);
  });
  container.appendChild(svg);
  setTimeout(() => { svg.style.transition = 'opacity 0.3s'; svg.style.opacity = '0'; }, 200);
  setTimeout(() => svg.remove(), 550);
}

function redBorderFlash(container) {
  const overlay = document.createElement('div');
  overlay.style.cssText = `
    position:absolute; inset:0;
    box-shadow: inset 0 0 60px 20px #c0392b;
    pointer-events:none; z-index:997; opacity:0;
    transition: opacity 0.1s ease-in;
  `;
  container.appendChild(overlay);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { overlay.style.opacity = '1'; });
  });
  setTimeout(() => {
    overlay.style.transition = 'opacity 0.4s ease-out';
    overlay.style.opacity = '0';
  }, 150);
  setTimeout(() => overlay.remove(), 600);
}

function bossFlash(container, color = '#fff') {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:absolute; inset:0; background:${color};
    opacity:0; pointer-events:none; z-index:1000;
    transition: opacity 0.08s ease-in;
  `;
  container.appendChild(flash);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { flash.style.opacity = '0.6'; });
  });
  setTimeout(() => {
    flash.style.transition = 'opacity 0.35s ease-out';
    flash.style.opacity = '0';
  }, 100);
  setTimeout(() => flash.remove(), 500);
}

// White flash that ramps up to 0.8 opacity (epic kill overlay)
function epicWhiteFlash(container) {
  const flash = document.createElement('div');
  flash.style.cssText = `
    position:absolute; inset:0; background:#fff;
    opacity:0; pointer-events:none; z-index:1000;
    transition: opacity 0.12s ease-in;
  `;
  container.appendChild(flash);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => { flash.style.opacity = '0.8'; });
  });
  setTimeout(() => {
    flash.style.transition = 'opacity 0.28s ease-out';
    flash.style.opacity = '0';
  }, 120);
  setTimeout(() => flash.remove(), 440);
}

function bossParticleExplosion(container, cx, cy, count = 24) {
  for (let i = 0; i < count; i++) {
    const p = document.createElement('div');
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.3;
    const dist = 80 + Math.random() * 140;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    const size = 4 + Math.random() * 14;
    const delay = Math.random() * 200;
    const colors = ['#d4a017', '#f39c12', '#e74c3c', '#7c3aed', '#e8e8e8', '#9b59b6'];
    const color = colors[Math.floor(Math.random() * colors.length)];
    p.style.cssText = `
      position:absolute;
      left:${cx - size / 2}px; top:${cy - size / 2}px;
      width:${size}px; height:${size}px;
      background:${color}; border-radius:50%;
      pointer-events:none; z-index:996;
      opacity:1;
      transition: transform ${0.8 + Math.random() * 0.5}s ease-out ${delay}ms,
                  opacity   ${0.8 + Math.random() * 0.5}s ease-out ${delay}ms;
    `;
    container.appendChild(p);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        p.style.transform = `translate(${tx}px, ${ty}px) scale(0.2)`;
        p.style.opacity = '0';
      });
    });
    setTimeout(() => p.remove(), 1500 + delay);
  }
}

function goldenLightExpansion(container, cx, cy) {
  const light = document.createElement('div');
  light.style.cssText = `
    position:absolute;
    left:${cx}px; top:${cy}px;
    width:0; height:0;
    border-radius:50%;
    background: radial-gradient(circle, rgba(212,160,23,0.7) 0%, rgba(212,160,23,0.2) 50%, transparent 70%);
    transform:translate(-50%, -50%);
    pointer-events:none; z-index:995;
    opacity:1;
    transition: width 0.8s ease-out, height 0.8s ease-out, opacity 0.8s ease-out;
  `;
  container.appendChild(light);
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      light.style.width = '600px';
      light.style.height = '600px';
      light.style.opacity = '0';
    });
  });
  setTimeout(() => light.remove(), 900);
}

// ─── Mini-progress bar ────────────────────────────────────────────────────────

function createMiniProgress(container) {
  const quest = gameState.currentQuest;
  if (!quest) return;

  // Remove any existing bar before re-inserting (render() uses innerHTML)
  const existing = container.querySelector('.mini-progress-bar');
  if (existing) existing.remove();

  const bar = document.createElement('div');
  bar.className = 'mini-progress-bar';
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

// ─── Era-specific boss backgrounds (more intense than regular combat) ────────
const ERA_BOSS_BG = {
  1: { // Pre-Qin: deep bronze/amber, stronger oracle bone glow
    gradient: 'linear-gradient(180deg, #120800 0%, #241200 25%, #3d2200 50%, #241200 75%, #120800 100%)',
    accent: 'rgba(193,127,60,0.25)',
    particles: 'gold',
  },
  2: { // Han: deep crimson imperial
    gradient: 'linear-gradient(180deg, #120000 0%, #240404 25%, #3a0a0a 50%, #240404 75%, #120000 100%)',
    accent: 'rgba(214,48,49,0.22)',
    particles: 'red',
  },
  3: { // Tang: intense golden amber
    gradient: 'linear-gradient(180deg, #080600 0%, #1a1000 25%, #2a1e00 50%, #1a1000 75%, #080600 100%)',
    accent: 'rgba(212,160,23,0.20)',
    particles: 'gold',
  },
  4: { // Song: deep jade abyss
    gradient: 'linear-gradient(180deg, #00120a 0%, #002010 25%, #003820 50%, #002010 75%, #00120a 100%)',
    accent: 'rgba(46,204,138,0.22)',
    particles: 'jade',
  },
  5: { // Modern: abyssal purple void
    gradient: 'linear-gradient(180deg, #060010 0%, #0e001e 25%, #1e0042 50%, #0e001e 75%, #060010 100%)',
    accent: 'rgba(142,68,173,0.25)',
    particles: 'purple',
  },
};

// ─── Main render ─────────────────────────────────────────────────────────────

function renderBoss() {
  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  const quest = gameState.currentQuest;
  const bossInfo = BOSS_NAMES[quest.chapterId] || BOSS_NAMES[1];

  // Apply era-specific boss background and particles
  const bossBg = ERA_BOSS_BG[quest.chapterId] || ERA_BOSS_BG[1];
  const bossParticleModeMap = { gold: 'boss_gold', red: 'boss_red', jade: 'boss_jade', purple: 'boss_purple' };
  setParticleMode(bossParticleModeMap[bossBg.particles] || 'boss');

  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = `
    overflow:hidden;
    background:
      radial-gradient(ellipse at 50% 30%, ${bossBg.accent} 0%, transparent 55%),
      radial-gradient(ellipse at 50% 70%, ${bossBg.accent} 0%, transparent 45%),
      ${bossBg.gradient};
  `;
  const bossAbility = getBossAbility(quest.chapterId);

  // Boss music — set era to boss and max intensity
  playMusic('boss');
  playStinger('boss_enter');
  setTimeout(() => setMusicIntensity(3), 1500);
  const allQuestions = encounter.questions;
  const bossSpriteKey = bossSprites[quest.chapterId] || 'boss_cangjie';
  const bossSvg = SPRITES[bossSpriteKey] || SPRITES.boss_cangjie;

  const phases = [
    allQuestions.slice(0, 3),
    allQuestions.slice(3, 7),
    allQuestions.slice(7, 10),
  ].filter(p => p.length > 0);

  let phase = 0;
  let qIndex = 0;
  let playerHp = profile.hp;
  let bossHp = 100;
  let doubleActive = false;
  let isFirstRender = true;

  // Timer value depends on half_timer ability — use stat-based timer with base 20
  const bossBaseTimer = abilityActive(bossAbility, 'half_timer')
    ? Math.round(getTimerDuration(profile, 20) / 2)
    : getTimerDuration(profile, 20);
  const effectiveMaxHp = getEffectiveMaxHp(profile);

  function getCurrentPhaseForHp() {
    if (bossHp > 66) return 0;
    if (bossHp > 33) return 1;
    return 2;
  }

  function getDamageFilter() {
    if (bossHp <= 33) return 'sepia(0.5) hue-rotate(-20deg) saturate(1.5)';
    if (bossHp <= 66) return 'saturate(0.7) brightness(0.85)';
    return '';
  }

  // ── Apply option shuffling (shuffle_options ability) ──
  function prepareOptions(q) {
    if (!abilityActive(bossAbility, 'shuffle_options')) return q;
    // Shuffle options while tracking correct index
    const indexed = q.options.map((opt, i) => ({ opt, isCorrect: i === q.correct }));
    for (let i = indexed.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [indexed[i], indexed[j]] = [indexed[j], indexed[i]];
    }
    const newCorrect = indexed.findIndex(o => o.isCorrect);
    return { ...q, options: indexed.map(o => o.opt), correct: newCorrect };
  }

  // ── Find distractor closest to correct for confusing_options ──
  function getConfusingDistractorIdx(q) {
    // Simple heuristic: pick the wrong option with the most characters in common with the correct
    const correctOpt = q.options[q.correct];
    let bestIdx = -1;
    let bestScore = -1;
    q.options.forEach((opt, i) => {
      if (i === q.correct) return;
      let score = 0;
      for (const ch of opt) { if (correctOpt.includes(ch)) score++; }
      if (score > bestScore) { bestScore = score; bestIdx = i; }
    });
    // Fallback: just pick first wrong option
    if (bestIdx === -1) {
      bestIdx = q.options.findIndex((_, i) => i !== q.correct);
    }
    return bestIdx;
  }

  function render() {
    const prevPhase = phase;
    const hpPhase = getCurrentPhaseForHp();
    if (hpPhase > phase) {
      playStinger('phase_change');
      phase = hpPhase;
      qIndex = 0;
    }

    const currentPhase = phases[phase];
    if (!currentPhase || qIndex >= currentPhase.length) {
      if (bossHp <= 0) { endBoss(true); return; }
      phase++;
      qIndex = 0;
      if (phase >= phases.length) {
        // Loop phases if boss is still alive — shuffle each phase for variety
        phase = 0;
        qIndex = 0;
        for (let p = 0; p < phases.length; p++) {
          for (let i = phases[p].length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [phases[p][i], phases[p][j]] = [phases[p][j], phases[p][i]];
          }
        }
      }
      render();
      return;
    }

    const phaseTransition = prevPhase !== phase && !isFirstRender;

    const rawQ = currentPhase[qIndex];
    // Apply shuffle if ability active
    const q = prepareOptions(rawQ);

    const phaseLabel = ['第一阶段：句意翻译', '第二阶段：虚词辨析', '第三阶段：篇章理解'][phase] || '';
    const phaseNarrativePool = BOSS_NARRATIVES[['phase1','phase2','phase3'][phase]] || BOSS_NARRATIVES.phase1;
    const bossNarrative = phaseNarrativePool[Math.floor(Math.random() * phaseNarrativePool.length)];

    // confusing_options: find the distractor to mark
    const confusingIdx = abilityActive(bossAbility, 'confusing_options')
      ? getConfusingDistractorIdx(q)
      : -1;

    const optionsHTML = q.options.map((opt, i) => {
      const confusingTag = (i === confusingIdx)
        ? `<span style="font-size:0.7rem;color:#e67e22;margin-left:6px;opacity:0.8;">相似</span>`
        : '';
      return `<button class="boss-option" data-idx="${i}">${opt}${confusingTag}</button>`;
    }).join('');

    // Intent damage preview — use new stat formula with boss base 25
    const wrongDmgInfo = calcDamageTaken(profile, 25);
    const wrongDamage = wrongDmgInfo.damage;
    const bossIntentHTML = `
      <div style="
        background:rgba(192,57,43,0.12);border:1px solid rgba(192,57,43,0.35);
        border-radius:6px;padding:5px 14px;text-align:center;margin:4px 32px 6px;
        font-size:0.82rem;color:#e8a0a0;
      ">
        ⚠ ${bossInfo.name}将攻击: -${wrongDamage} HP
        ${wrongDmgInfo.thornsReturn > 0 ? `<span style="margin-left:8px;color:#27ae60;">🌿 反刺 ${wrongDmgInfo.thornsReturn}</span>` : ''}
        ${abilityActive(bossAbility, 'half_timer') ? `<span style="margin-left:10px;color:#f39c12;">⏱ 仅${bossBaseTimer}秒</span>` : ''}
      </div>
    `;

    div.innerHTML = `
      <style>
        .boss-header { text-align:center; margin-bottom:4px; position:relative; padding-top:36px; }
        .boss-sprite-container { display:flex; justify-content:center; align-items:flex-end; margin:4px 0; position:relative; min-height:140px; }
        .boss-svg-wrap { display:inline-block; position:relative; }
        .boss-phase { font-size:0.9rem; color:var(--accent-jade); margin-bottom:4px; }
        .boss-hud { display:flex; justify-content:space-between; width:100%; padding:0 32px; margin-bottom:6px; }
        .boss-hp-bg { width:250px; height:18px; background:var(--bg-secondary); border-radius:9px; overflow:hidden; }
        .boss-hp { height:100%; background:var(--accent-red); border-radius:9px; transition:width 0.5s ease-out; }
        .player-hp { height:100%; background:var(--hp-green); border-radius:9px; transition:width 0.5s; }
        .boss-narrative { font-style:italic; font-size:1.05rem; color:#e57373; text-align:center; padding:6px 32px 8px; opacity:0.9; text-shadow:0 0 8px rgba(192,57,43,0.5); }
        .boss-question { font-size:1.4rem; margin:8px 32px 12px; text-align:center; background:var(--bg-card); padding:16px 24px; border-radius:8px; border-left:4px solid var(--accent-gold); }
        .boss-options { display:flex; flex-direction:column; gap:12px; padding:0 32px; max-width:600px; margin:0 auto; width:100%; }
        .phase-label-anim { display:inline-block; }
        .boss-ability-banner {
          background:rgba(192,57,43,0.15);
          border:1px solid rgba(192,57,43,0.4);
          border-radius:8px; padding:6px 16px;
          text-align:center; margin:0 32px 8px;
        }
        .boss-timer-bg { width:80%; max-width:500px; height:8px; background:var(--bg-secondary); border-radius:4px; overflow:hidden; margin:4px auto 0; }
        .boss-timer-bar { height:100%; background:${abilityActive(bossAbility, 'half_timer') ? '#e74c3c' : 'var(--timer-yellow)'}; border-radius:3px; transition:width 0.1s linear; }
      </style>

      <div class="boss-header">
        <h2 id="boss-name" style="color:var(--accent-red); margin:0; transform:translateY(0); opacity:1;">${bossInfo.name}</h2>
        <div class="boss-phase phase-label-anim" id="phase-label">${phaseLabel}</div>
      </div>

      <div class="boss-ability-banner pulse-glow">
        <div style="font-size:0.75rem;color:var(--accent-red);margin-bottom:2px;">BOSS 特殊能力</div>
        <div style="font-weight:700;color:#e8a0a0;">${bossAbility.name}: ${bossAbility.desc}</div>
      </div>

      <div class="boss-sprite-container" style="position:relative;">
        <!-- HD-2D: Volumetric light rays behind boss -->
        <div class="light-rays" id="boss-light-rays"${isFirstRender ? '' : ' style="opacity:0.5;"'}></div>
        <!-- HD-2D: Intense bokeh particles for boss arena -->
        <div class="bokeh-container" id="boss-bokeh"></div>
        <div class="boss-svg-wrap sprite-bloom-boss" id="boss-sprite-wrap">
          <div id="boss-sprite" style="width:120px;height:200px;display:flex;align-items:center;justify-content:center;${isFirstRender ? 'transform:scale(2.5);opacity:0;' : `filter:${getDamageFilter()};`}">
          </div>
        </div>
      </div>

      <div class="boss-hud">
        <div>
          <div style="font-weight:800;font-size:0.95rem;">${profile.name} HP</div>
          <div class="boss-hp-bg"><div class="player-hp" id="player-hp-bar" style="width:${(playerHp / effectiveMaxHp) * 100}%"></div></div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${playerHp}/${effectiveMaxHp}</div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:800;font-size:0.95rem; color:var(--accent-red);">BOSS HP</div>
          <div class="boss-hp-bg"><div class="boss-hp" id="boss-hp-bar" style="width:${bossHp}%"></div></div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${bossHp}%</div>
        </div>
      </div>

      ${bossIntentHTML}
      <div class="boss-timer-bg"><div class="boss-timer-bar" id="boss-timer-bar" style="width:100%"></div></div>

      <div class="boss-narrative">${bossNarrative}</div>
      <div class="boss-question">${q.prompt}</div>
      <div class="boss-options">${optionsHTML}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:8px;" id="abilities"></div>
      <div class="boss-feedback" id="feedback"></div>
    `;

    // ── Inject pixel art boss sprite ──
    {
      const sprites = getPixelSprites();
      const bossContainer = div.querySelector('#boss-sprite');
      if (bossContainer) {
        bossContainer.innerHTML = '';
        bossContainer.appendChild(createSpriteImg(sprites.boss_cangjie, 200));
      }
    }

    // ── HD-2D: Generate intense bokeh particles for boss arena ──
    {
      const bokehContainer = div.querySelector('#boss-bokeh');
      if (bokehContainer) {
        // More particles than combat, brighter and larger for boss intensity
        const bokehCount = bossHp <= 33 ? 25 : bossHp <= 66 ? 20 : 15;
        for (let i = 0; i < bokehCount; i++) {
          const dot = document.createElement('div');
          dot.className = 'bokeh-dot';
          const size = 5 + Math.random() * 16;
          dot.style.cssText = `
            width:${size}px; height:${size}px;
            left:${Math.random() * 100}%; top:${Math.random() * 100}%;
            --duration:${4 + Math.random() * 6}s;
            --delay:${-Math.random() * 6}s;
            --scale:${0.7 + Math.random() * 1.0};
            --drift-y:${-25 - Math.random() * 50}px;
            --max-opacity:${0.4 + Math.random() * 0.5};
          `;
          // Boss phase coloring: redder as boss HP drops
          if (bossHp <= 33) {
            dot.style.background = 'radial-gradient(circle, rgba(255,100,100,0.9) 0%, rgba(214,48,49,0.4) 40%, transparent 70%)';
          } else if (bossHp <= 66) {
            dot.style.background = 'radial-gradient(circle, rgba(255,200,150,0.8) 0%, rgba(212,160,23,0.4) 40%, transparent 70%)';
          }
          bokehContainer.appendChild(dot);
        }
      }
    }

    // ── HD-2D: Apply era class and depth layering to boss screen ──
    {
      const eraClassMap = {1:'era-xianqin',2:'era-han',3:'era-tang',4:'era-song',5:'era-modern'};
      const eraClass = eraClassMap[quest.chapterId] || 'era-xianqin';
      div.classList.add(eraClass);
      // bg-depth-far removed - was blurring entire screen
      const spriteWrap = div.querySelector('#boss-sprite-wrap');
      if (spriteWrap) spriteWrap.classList.add('bg-depth-near');
    }

    // ── Boss entrance animation (first render only) ──
    const bossSprite = div.querySelector('#boss-sprite');
    const bossName = div.querySelector('#boss-name');
    const phaseLabelEl = div.querySelector('#phase-label');

    if (isFirstRender) {
      isFirstRender = false;

      // Boss name slides in from above
      if (bossName) {
        bossName.style.transform = 'translateY(-40px)';
        bossName.style.opacity = '0';
        bossName.style.transition = 'transform 0.6s ease-out 0.3s, opacity 0.6s ease-out 0.3s';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bossName.style.transform = 'translateY(0)';
            bossName.style.opacity = '1';
          });
        });
      }

      // Phase label slides in
      if (phaseLabelEl) {
        phaseLabelEl.style.transform = 'translateY(-20px)';
        phaseLabelEl.style.opacity = '0';
        phaseLabelEl.style.transition = 'transform 0.5s ease-out 0.6s, opacity 0.5s ease-out 0.6s';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            phaseLabelEl.style.transform = 'translateY(0)';
            phaseLabelEl.style.opacity = '1';
          });
        });
      }

      // Boss scales down and fades in over 1.5s
      if (bossSprite) {
        bossSprite.style.transition = 'transform 1.5s ease-out, opacity 1.5s ease-out';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            bossSprite.style.transform = 'scale(1)';
            bossSprite.style.opacity = '1';
          });
        });
        // Screen shake on boss landing
        setTimeout(() => shakeContainer(div, 8, 400), 1100);
      }

      // HD-2D: Light rays blaze at full during entrance, then settle
      const lightRays = div.querySelector('#boss-light-rays');
      if (lightRays) {
        lightRays.style.opacity = '1';
        lightRays.style.transition = 'opacity 2s ease-out 1.5s';
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            lightRays.style.opacity = '0.5';
          });
        });
      }

    } else if (phaseTransition) {
      // Phase transition: flash, hue-rotate, phase label animation + companion/boss dialogue
      bossFlash(div, '#c0392b');
      showCompanionBubble(div, pick(COMPANION.bossPhaseChange));
      showEnemyTaunt(div, pick(bossTaunts), 2500);
      if (bossSprite) {
        bossSprite.style.transition = 'filter 0.3s ease-in-out';
        const origFilter = getDamageFilter();
        bossSprite.style.filter = 'hue-rotate(180deg) brightness(1.5)';
        setTimeout(() => {
          bossSprite.style.filter = origFilter;
        }, 400);
      }
      if (phaseLabelEl) {
        phaseLabelEl.style.transform = 'scale(1.4)';
        phaseLabelEl.style.transition = 'transform 0.3s ease-out';
        setTimeout(() => {
          phaseLabelEl.style.transform = 'scale(1)';
        }, 350);
      }
      // HD-2D: Flare light rays on phase transition, then settle
      const lightRays = div.querySelector('#boss-light-rays');
      if (lightRays) {
        lightRays.style.transition = 'opacity 0.2s ease-out';
        lightRays.style.opacity = '1';
        setTimeout(() => {
          lightRays.style.transition = 'opacity 1.5s ease-out';
          lightRays.style.opacity = bossHp <= 33 ? '0.8' : '0.5';
        }, 500);
      }
    }

    // ── Mini-progress bar ──
    createMiniProgress(div);

    // ── Timer for boss (respects half_timer ability) ──
    let bossTimeLeft = bossBaseTimer;
    const bossTimerBar = div.querySelector('#boss-timer-bar');
    let bossTimerInterval = setInterval(() => {
      bossTimeLeft -= 0.1;
      if (bossTimerBar) bossTimerBar.style.width = Math.max(0, (bossTimeLeft / bossBaseTimer) * 100) + '%';
      if (bossTimeLeft <= 0) {
        clearInterval(bossTimerInterval);
        // Timeout acts like wrong answer — apply HP loss and thorns
        const timeoutDmg = calcDamageTaken(profile, 25);
        const hpLoss = timeoutDmg.damage;
        const thornsReturn = timeoutDmg.thornsReturn;
        playerHp = Math.max(0, playerHp - hpLoss);

        // Apply thorns on timeout
        if (thornsReturn > 0) {
          bossHp = Math.max(1, bossHp - thornsReturn); // Thorns can't kill — min 1 HP
          const bossHpBar = div.querySelector('#boss-hp-bar');
          if (bossHpBar) bossHpBar.style.width = bossHp + '%';
        }

        redBorderFlash(div);
        const playerHpBar = div.querySelector('#player-hp-bar');
        if (playerHpBar) playerHpBar.style.width = (playerHp / effectiveMaxHp) * 100 + '%';
        const feedbackEl = div.querySelector('#feedback');
        if (feedbackEl) feedbackEl.textContent = `⏱ 超时！${bossInfo.name}乘虚而入，失去 ${hpLoss} HP。${thornsReturn > 0 ? ` 荆棘反刺 ${thornsReturn} 伤害！` : ''}`;
        // Disable options
        div.querySelectorAll('.boss-option').forEach(b => { b.style.pointerEvents = 'none'; });
        setTimeout(() => {
          if (playerHp <= 0) { endBoss(false); return; }
          qIndex++;
          render();
        }, 1600);
      }
    }, 100);

    // ── Ability buttons ──
    const abilitiesEl = div.querySelector('#abilities');
    if (abilitiesEl) {
      // seal_abilities: hide hint/skip/double entirely
      const sealed = abilityActive(bossAbility, 'seal_abilities');
      let btns = '';
      if (!sealed) {
        if (hasAbility(profile, 'hint'))   btns += `<button class="btn" id="btn-hint"   style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 1 ? 'disabled' : ''}>提示 (1文力)</button>`;
        if (hasAbility(profile, 'skip'))   btns += `<button class="btn" id="btn-skip"   style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>跳过 (2文力)</button>`;
        if (hasAbility(profile, 'double')) btns += `<button class="btn" id="btn-double" style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>双倍 (2文力)</button>`;
      } else {
        btns = `<div style="font-size:0.8rem;color:var(--accent-red);opacity:0.8;">【墨封】技能已被封印</div>`;
      }
      abilitiesEl.innerHTML = btns;
    }

    const hintBtn = div.querySelector('#btn-hint');
    if (hintBtn) hintBtn.addEventListener('click', () => {
      if (profile.wenli < 1) return;
      profile.wenli--;
      const wrongBtns = [...div.querySelectorAll('.boss-option')].filter(b => parseInt(b.dataset.idx) !== q.correct);
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
      clearInterval(bossTimerInterval);
      qIndex++;
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

    div.querySelectorAll('.boss-option').forEach(btn => {
      btn.classList.add('spotlight-card');
      btn.addEventListener('click', () => {
        clearInterval(bossTimerInterval);
        playSound('click');
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;
        div.querySelectorAll('.boss-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) b.classList.add('correct');
          else if (bIdx === idx) b.classList.add('wrong');
        });

        recordAnswer('classical', correct, q.id);

        // Correct/wrong SFX — fire immediately before animation delays
        if (correct) {
          playSound('correct');
          playSound('attack');
        } else {
          playSound('wrong');
          playSound('hit');
        }

        const bossSprite = div.querySelector('#boss-sprite');
        const bossWrap = div.querySelector('#boss-sprite-wrap');

        if (correct) {
          // ── New stat-based boss damage calculation ──
          const isCrit = rollCrit(profile);
          if (isCrit) playSound('crit');
          const bossCombo = (gameState.currentQuest?.results?.combo || 0);
          if (bossCombo >= 3) playSound('combo');
          let dmg = calcDamage(profile, bossCombo, isCrit, bossTimeLeft);
          if (doubleActive) dmg *= 2;
          doubleActive = false;

          // Executioner talent: boss HP < 30% = +40% damage
          const talents = getTalentEffects(profile);
          if (talents.executePct && bossHp < 30) {
            dmg = Math.round(dmg * (1 + talents.executePct / 100));
          }

          bossHp = Math.max(0, bossHp - dmg);

          // Golden slash across boss
          if (bossWrap) {
            const bwRect = bossWrap.getBoundingClientRect();
            const divRect = div.getBoundingClientRect();
            const cx = bwRect.left - divRect.left + bwRect.width / 2;
            const cy = bwRect.top - divRect.top + bwRect.height / 2;
            goldenSlash(div, cx, cy);
          }

          // Impact spark particles when boss takes damage
          burstParticles(10, 'combat');

          // Boss recoils backward
          lungeElement(bossSprite, 40, 250, null);

          // Boss HP bar animates
          const bossHpBar = div.querySelector('#boss-hp-bar');
          if (bossHpBar) bossHpBar.style.width = bossHp + '%';

          // Apply damage visual filter
          if (bossSprite) {
            setTimeout(() => {
              bossSprite.style.transition = 'filter 0.4s';
              bossSprite.style.filter = getDamageFilter();
            }, 300);
          }

          // Killing blow: hit pause + slow-motion damage number + white flash
          if (bossHp <= 0) {
            document.body.style.pointerEvents = 'none';
            // Slow-motion final hit number — 2x larger, 2x slower
            if (bossWrap) {
              const bwRect = bossWrap.getBoundingClientRect();
              const divRect = div.getBoundingClientRect();
              const numX = bwRect.left - divRect.left + bwRect.width / 2 - 35;
              const numY = bwRect.top - divRect.top - 20;
              floatingText(div, `${isCrit ? '暴击！' : ''}-${dmg}`, numX, numY, { color: isCrit ? '#ffd700' : '#d4a017', fontSize: '4rem', duration: 1800 });
            }
            // White screen flash: opacity 0 → 0.8 → 0 over 400ms
            epicWhiteFlash(div);
            setTimeout(() => {
              document.body.style.pointerEvents = '';
              endBoss(true);
            }, 150);
            return;
          }

          // Normal damage number
          if (bossWrap) {
            const bwRect = bossWrap.getBoundingClientRect();
            const divRect = div.getBoundingClientRect();
            const numX = bwRect.left - divRect.left + bwRect.width / 2 - 25;
            const numY = bwRect.top - divRect.top - 15;
            floatingText(div, `-${dmg}`, numX, numY, { color: isCrit ? '#ffd700' : '#d4a017' });
          }

          // ── CRITICAL HIT banner + screen shake for boss combat ──
          if (isCrit) {
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
            shakeContainer(div, 10, 500);
          }

          div.querySelector('#feedback').textContent = `✓ 正确！${isCrit ? '暴击！' : ''}对${bossInfo.name}造成 ${dmg} 点伤害！${q.explanation}`;

        } else {
          // ── New stat-based damage taken calculation with thorns ──
          const wrongResult = calcDamageTaken(profile, 25);
          const hpLoss = wrongResult.damage;
          const thornsReturn = wrongResult.thornsReturn;
          playerHp = Math.max(0, playerHp - hpLoss);

          // ── Thorns: reflect damage back to boss ──
          if (thornsReturn > 0) {
            bossHp = Math.max(1, bossHp - thornsReturn); // Thorns can't kill — min 1 HP
            const bossHpBar = div.querySelector('#boss-hp-bar');
            if (bossHpBar) bossHpBar.style.width = bossHp + '%';
            // Thorns floating number on boss
            setTimeout(() => {
              if (bossWrap) {
                const bwRect = bossWrap.getBoundingClientRect();
                const divRect = div.getBoundingClientRect();
                const numX = bwRect.left - divRect.left + bwRect.width / 2 - 30;
                const numY = bwRect.top - divRect.top - 15;
                floatingText(div, `荆棘 -${thornsReturn}`, numX, numY, { color: '#27ae60' });
              }
            }, 500);
          }

          // Boss aggressive lunge toward player
          lungeElement(bossSprite, -55, 220, null);

          // Ink splash effect
          const cx = div.getBoundingClientRect().width * 0.3;
          const cy = div.getBoundingClientRect().height * 0.5;
          inkSplash(div, cx, cy);

          // Red border flash
          redBorderFlash(div);

          // Player takes visible damage shake (shake the player HP section)
          const playerHpSection = div.querySelector('.boss-hud > div:first-child');
          if (playerHpSection) shakeElement(playerHpSection, 6, 350);

          // Player HP bar update
          const playerHpBar = div.querySelector('#player-hp-bar');
          if (playerHpBar) playerHpBar.style.width = (playerHp / effectiveMaxHp) * 100 + '%';

          // Floating red number near player HP
          if (playerHpSection) {
            const phRect = playerHpSection.getBoundingClientRect();
            const divRect = div.getBoundingClientRect();
            const numX = phRect.left - divRect.left + phRect.width / 2 - 20;
            const numY = phRect.top - divRect.top - 10;
            floatingText(div, `-${hpLoss}HP`, numX, numY, { color: '#e74c3c' });
          }

          div.querySelector('#feedback').textContent = `✗ 错误！${bossInfo.name}反击，失去 ${hpLoss} HP。${thornsReturn > 0 ? `荆棘反刺 ${thornsReturn}！` : ''}${q.explanation}`;
        }

        setTimeout(() => {
          if (playerHp <= 0) { endBoss(false); return; }
          if (bossHp <= 0) { endBoss(true); return; }
          qIndex++;
          render();
        }, 2200);
      });
    });
  }

  async function endBoss(won) {
    setMusicIntensity(0);
    if (won) playStinger('victory');
    encounter.completed = won;
    profile.hp = playerHp;
    gameState.save();

    if (!won) {
      // ── Enhanced boss defeat screen ───────────────────────────────────
      const quest = gameState.currentQuest;
      const results = quest ? quest.results : { correct: 0, total: 0, maxCombo: 0 };
      const bossDamageDealt = 100 - bossHp;
      const motivationalTexts = [
        "文字之路没有捷径，但每次失败都让你更强！",
        "墨暗之力只是暂时的胜利——你的知识终将战胜一切！",
        "连最强的文字侠也有过失败——重要的是永不放弃！",
      ];
      const motivation = motivationalTexts[Math.floor(Math.random() * motivationalTexts.length)];

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
          <div class="defeat-subtitle">${bossInfo.name}将你击败了……</div>
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
              <span class="defeat-stat-value">${bossDamageDealt} 点</span>
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
          showScreen('boss');
        });
        div.querySelector('#btn-retreat').addEventListener('click', () => showScreen('worldmap'));
        const shopBtn = div.querySelector('#btn-shop');
        if (shopBtn) shopBtn.addEventListener('click', () => showScreen('shop'));
      }, 0);
      return;
    }

    // ── Boss defeat: dramatic dissolution ──
    const bossWrap = div.querySelector('#boss-sprite-wrap');
    const bossSprite = div.querySelector('#boss-sprite');

    if (bossWrap) {
      const bwRect = bossWrap.getBoundingClientRect();
      const divRect = div.getBoundingClientRect();
      const cx = bwRect.left - divRect.left + bwRect.width / 2;
      const cy = bwRect.top - divRect.top + bwRect.height / 2;

      // Screen flash on death blow (already fired via epicWhiteFlash above,
      // this adds the gold cinematic flash after the white)
      setTimeout(() => bossFlash(div, '#d4a017'), 180);

      // Boss sprite breaks into particles
      setTimeout(() => {
        bossParticleExplosion(div, cx, cy, 28);
        if (bossSprite) {
          bossSprite.style.transition = 'opacity 0.5s, transform 0.5s';
          bossSprite.style.opacity = '0';
          bossSprite.style.transform = 'scale(0.3)';
        }
      }, 150);

      // Golden light expands
      setTimeout(() => goldenLightExpansion(div, cx, cy), 400);
    }

    // Companion celebrates boss victory
    showCompanionBubble(div, pick(COMPANION.bossVictory), 5000);

    // Victory fanfare text
    setTimeout(() => {
      const fanfare = document.createElement('div');
      fanfare.style.cssText = `
        position:absolute; inset:0; display:flex; flex-direction:column;
        align-items:center; justify-content:center; z-index:1001;
        pointer-events:none;
      `;
      fanfare.innerHTML = `
        <div id="victory-text" style="
          font-size:3rem; font-weight:900; color:#d4a017;
          text-shadow: 0 0 20px #d4a017, 0 0 40px #f39c12;
          transform:scale(0); opacity:0;
          transition: transform 0.5s cubic-bezier(0.34,1.56,0.64,1), opacity 0.3s ease-out;
        ">BOSS 击败！</div>
      `;
      div.appendChild(fanfare);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          const vt = div.querySelector('#victory-text');
          if (vt) { vt.style.transform = 'scale(1)'; vt.style.opacity = '1'; }
        });
      });
    }, 700);

    // Check for chengyu drop
    const allChengyu = await loadChengyu();
    const uncollected = allChengyu.filter(cy => !profile.chengyu.includes(cy.id) && cy.chapter === quest.chapterId);

    if (uncollected.length > 0) {
      const drop = uncollected[Math.floor(Math.random() * uncollected.length)];
      profile.chengyu.push(drop.id);
      gameState.save();

      setTimeout(() => {
        div.innerHTML = `
          <div class="screen" style="text-align:center;">
            <h2 style="color:var(--accent-gold);">获得成语！</h2>
            <div style="font-size:2rem;font-weight:700;color:var(--accent-gold);margin:16px 0;">${drop.chengyu}</div>
            <div style="color:var(--text-secondary);margin-bottom:8px;">${drop.pinyin}</div>
            <div style="margin-bottom:8px;">${drop.meaning}</div>
            <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;">${drop.origin}</div>
            <button class="btn btn-primary" id="btn-continue">继续</button>
          </div>
        `;
        setTimeout(() => {
          div.querySelector('#btn-continue').addEventListener('click', () => {
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
        }, 0);
      }, 2000);
      return;
    }

    setTimeout(() => {
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
    }, 2000);
  }

  // Resolve boss-specific taunts once so phase change can reuse them
  const bossKey = { 1: 'boss_cangjie', 2: 'boss_moli', 3: 'boss_shimo', 4: 'boss_cisha', 5: 'boss_final' }[quest.chapterId] || 'combat';
  const bossTaunts = ENEMY_TAUNTS[bossKey] || ENEMY_TAUNTS.combat;

  render();

  // Companion warning on boss start (short delay so the entrance animation is underway)
  setTimeout(() => showCompanionBubble(div, pick(COMPANION.bossStart), 3000), 500);
  // Boss entrance taunt (after sprite has landed)
  setTimeout(() => showEnemyTaunt(div, pick(bossTaunts), 3000), 1500);

  // Tutorial: first boss encounter
  if (profile.stats.totalBossKills === 0) {
    showTutorial(div, 'tutorial_boss', {
      targetSelector: '.boss-ability-banner',
      position: 'bottom',
    });
  }

  return div;
}

registerScreen('boss', renderBoss);
