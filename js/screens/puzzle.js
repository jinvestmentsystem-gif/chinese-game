// js/screens/puzzle.js — Reading comprehension encounter (battle framework)
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';
import { calcDamageTaken, getEffectiveMaxHp } from '../progression.js';
import { playSound, playMusic, setMusicIntensity } from '../audio.js';
import { SPRITES, getPlayerSprite } from '../sprites.js';
import { setParticleMode } from '../particles.js';

const PUZZLE_NARRATIVES = [
  "古老卷轴上浮现出一段被墨暗污染的文字……解读它才能打破封印！",
  "石碑上的文字开始发光——读懂这段话，封印就会瓦解！",
  "一道文字结界挡住了你的去路。仔细阅读，找出破绽！",
  "墨暗将这段文字扭曲了——只有真正理解它，才能恢复原貌！",
  "被墨暗封印的古籍显现出来……这是破解封印的关键线索！",
];

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

function renderPuzzle() {
  setParticleMode('combat');
  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = 'overflow:hidden; display:flex; flex-direction:column; height:100%;';

  // Set puzzle music — light rhythm (intensity 1)
  const chapterId = gameState.currentQuest?.chapterId || 1;
  const eraMap = {1:'xianqin',2:'han',3:'tang',4:'song',5:'modern'};
  playMusic(eraMap[chapterId] || 'xianqin');
  setTimeout(() => setMusicIntensity(1), 200);

  // Era-aware atmospheric background gradient
  const eraAtmosphere = {
    xianqin: 'linear-gradient(180deg, #1a0e00 0%, #2d1800 40%, #1a0e00 100%)',
    han:     'linear-gradient(180deg, #1a0000 0%, #2d0808 40%, #1a0000 100%)',
    tang:    'linear-gradient(180deg, #0d0a00 0%, #1e1600 40%, #0d0a00 100%)',
    song:    'linear-gradient(180deg, #001a10 0%, #002818 40%, #001a10 100%)',
    modern:  'linear-gradient(180deg, #0a0018 0%, #120028 40%, #0a0018 100%)',
  };
  div.style.background = eraAtmosphere[eraMap[chapterId]] || eraAtmosphere.xianqin;

  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  if (!encounter || !profile) { showScreen('worldmap'); return div; }
  const effectiveMaxHp = getEffectiveMaxHp(profile);
  const passage = encounter.passage;
  const questions = passage.questions;
  let qIndex = 0;
  let correctCount = 0;
  const totalQuestions = questions.length;
  // Each correct answer chips away an equal share of seal HP
  const sealHpPerCorrect = Math.floor(100 / totalQuestions);

  let sealHp = 100;
  let playerHp = profile.hp;

  // Pick a random narrative for this seal encounter (stays fixed for the session)
  const narrative = PUZZLE_NARRATIVES[Math.floor(Math.random() * PUZZLE_NARRATIVES.length)];

  // CSS injected once
  const style = document.createElement('style');
  style.textContent = `
    .puzzle-screen-inner {
      display:flex; flex-direction:column;
      height:100%; width:100%;
      overflow-y:auto; overflow-x:hidden;
      -webkit-overflow-scrolling:touch;
    }
    .puzzle-hud {
      display:flex; justify-content:space-between; align-items:center;
      width:100%; padding:8px 20px; padding-top:10px; box-sizing:border-box;
      flex-shrink:0; gap:12px;
    }
    .puzzle-hp-section { text-align:center; flex:1; }
    .puzzle-hp-label { font-weight:800; font-size:0.95rem; margin-bottom:3px; }
    .puzzle-hp-bg {
      width:100%; max-width:160px; height:10px; background:var(--bg-secondary);
      border-radius:5px; overflow:hidden; margin:0 auto;
    }
    .puzzle-hp-bar { height:100%; border-radius:5px; transition:width 0.4s; }
    .puzzle-hp-player { background:var(--hp-green); }
    .puzzle-hp-seal {
      background: linear-gradient(90deg, #7c3aed, #a855f7);
    }
    .puzzle-arena { display:none; }
    .puzzle-player-sprite { display:none; }
    .puzzle-vs { display:none; }
    .puzzle-seal-icon { display:none; }
    .puzzle-narrative {
      font-style:italic; font-size:1rem; color:#c084fc;
      text-align:center; margin:0 16px 8px;
      text-shadow: 0 0 8px rgba(168,85,247,0.5);
      padding:6px 14px;
      border-radius:6px;
      background:rgba(60,20,90,0.3);
      border:1px solid rgba(124,58,237,0.3);
      flex-shrink:0;
    }
    .puzzle-scroll-box {
      margin:0 16px 10px; padding:14px 18px;
      background:rgba(30,25,15,0.92);
      border:2px solid #7c5a0a;
      border-radius:10px;
      box-shadow: inset 0 0 20px rgba(212,160,23,0.08), 0 0 12px rgba(124,90,10,0.3);
      flex:1; overflow-y:auto; min-height:0;
      max-height:35vh; /* Cap so options visible; outer container scrolls if needed */
      font-size:1.05rem; line-height:1.9;
      color:#f0e0b0;
      position:relative;
      -webkit-overflow-scrolling:touch;
    }
    .puzzle-scroll-box::before {
      content:'';
      position:absolute; top:0; left:0; right:0; height:3px;
      background:linear-gradient(90deg, transparent, #d4a017, transparent);
    }
    .puzzle-scroll-box::after {
      content:'';
      position:absolute; bottom:0; left:0; right:0; height:3px;
      background:linear-gradient(90deg, transparent, #d4a017, transparent);
    }
    .puzzle-scroll-title {
      font-size:1.05rem; font-weight:700; color:#d4a017;
      margin-bottom:8px; letter-spacing:2px;
    }
    .puzzle-progress {
      font-size:1rem; color:var(--text-secondary);
      text-align:center; margin-bottom:6px;
      flex-shrink:0;
    }
    .puzzle-question {
      font-size:1.5rem; margin:0 16px 10px; text-align:center; font-weight:700;
      flex-shrink:0;
      padding:12px 18px;
      background:rgba(0,0,0,0.3);
      border-radius:10px;
      border:1px solid rgba(212,160,23,0.15);
    }
    .puzzle-options {
      display:grid; grid-template-columns:1fr 1fr;
      gap:10px; margin:0 16px 10px; flex-shrink:0;
    }
    .puzzle-options .puzzle-option {
      padding:14px 18px; font-size:1.05rem;
      min-height:56px; border-radius:10px;
      background:rgba(40,30,10,0.85);
      border:2px solid rgba(212,160,23,0.3);
      color:#f0e0b0; cursor:pointer;
      text-align:left; line-height:1.4;
      transition:background 0.15s, border-color 0.15s, transform 0.1s;
      box-sizing:border-box; width:100%;
    }
    .puzzle-options .puzzle-option:hover {
      background:rgba(60,45,15,0.9);
      border-color:rgba(212,160,23,0.7);
      transform:translateY(-1px);
    }
    .puzzle-options .puzzle-option.correct {
      background:rgba(39,174,96,0.25);
      border-color:var(--accent-jade);
      color:#a8f0c8;
    }
    .puzzle-options .puzzle-option.wrong {
      background:rgba(192,57,43,0.25);
      border-color:var(--accent-red);
      color:#ffa8a8;
    }
    .puzzle-feedback {
      margin:0 16px 6px; text-align:center;
      font-size:1.1rem; min-height:28px;
      flex-shrink:0;
    }
    @keyframes sealCrack {
      0%   { box-shadow:0 0 28px rgba(168,85,247,0.7), inset 0 0 24px rgba(124,58,237,0.4); border-color:#a855f7; }
      30%  { box-shadow:0 0 40px rgba(255,80,80,0.8), inset 0 0 28px rgba(220,50,50,0.4); border-color:#ff5050; }
      60%  { box-shadow:0 0 10px rgba(168,85,247,0.2), inset 0 0 6px rgba(124,58,237,0.1); border-color:#7c3aed; opacity:0.7; }
      100% { box-shadow:0 0 28px rgba(168,85,247,0.7), inset 0 0 24px rgba(124,58,237,0.4); border-color:#a855f7; opacity:1; }
    }
    @keyframes sealPulseRed {
      0%   { box-shadow:0 0 28px rgba(168,85,247,0.7), inset 0 0 24px rgba(124,58,237,0.4); }
      50%  { box-shadow:0 0 36px rgba(220,50,50,0.9), inset 0 0 22px rgba(200,30,30,0.5); border-color:#e74c3c; }
      100% { box-shadow:0 0 28px rgba(168,85,247,0.7), inset 0 0 24px rgba(124,58,237,0.4); border-color:#a855f7; }
    }
    @keyframes sealShatter {
      0%   { transform:scale(1); opacity:1; }
      20%  { transform:scale(1.15) rotate(3deg); opacity:1; }
      40%  { transform:scale(0.9) rotate(-4deg); opacity:0.9; }
      60%  { transform:scale(1.1) rotate(2deg); opacity:0.6; }
      80%  { transform:scale(0.7) rotate(-2deg); opacity:0.3; }
      100% { transform:scale(0); opacity:0; }
    }
    .seal-cracking { animation:sealCrack 0.5s ease-out; }
    .seal-pulsing  { animation:sealPulseRed 0.5s ease-out; }
    .seal-shattering { animation:sealShatter 0.7s ease-out forwards; }
  `;
  div.appendChild(style);

  function sealParticleBurst(container, sealEl) {
    const rect = sealEl.getBoundingClientRect();
    const divRect = container.getBoundingClientRect();
    const cx = rect.left - divRect.left + rect.width / 2;
    const cy = rect.top - divRect.top + rect.height / 2;
    const colors = ['#a855f7', '#7c3aed', '#c084fc', '#d8b4fe', '#d4a017', '#f0c040'];
    for (let i = 0; i < 20; i++) {
      const p = document.createElement('div');
      const angle = (i / 20) * Math.PI * 2 + Math.random() * 0.4;
      const dist = 50 + Math.random() * 100;
      const tx = Math.cos(angle) * dist;
      const ty = Math.sin(angle) * dist;
      const size = 5 + Math.random() * 10;
      const color = colors[Math.floor(Math.random() * colors.length)];
      p.style.cssText = `
        position:absolute;
        left:${cx - size / 2}px; top:${cy - size / 2}px;
        width:${size}px; height:${size}px;
        background:${color}; border-radius:50%;
        pointer-events:none; z-index:996; opacity:1;
        transition: transform 0.8s ease-out, opacity 0.8s ease-out;
      `;
      container.appendChild(p);
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          p.style.transform = `translate(${tx}px, ${ty}px)`;
          p.style.opacity = '0';
        });
      });
      setTimeout(() => p.remove(), 900);
    }
  }

  function render() {
    // Remove old content but keep the style tag
    const existingStyle = div.querySelector('style');
    div.innerHTML = '';
    if (existingStyle) div.appendChild(existingStyle);

    const q = questions[qIndex];
    const sealPct = sealHp;
    const playerPct = (playerHp / effectiveMaxHp) * 100;

    // ── Inner flex container that fills height ──
    const inner = document.createElement('div');
    inner.className = 'puzzle-screen-inner';
    div.appendChild(inner);

    // HUD
    const hudDiv = document.createElement('div');
    hudDiv.className = 'puzzle-hud';
    hudDiv.innerHTML = `
      <div class="puzzle-hp-section">
        <div class="puzzle-hp-label">${profile.name}</div>
        <div class="puzzle-hp-bg">
          <div class="puzzle-hp-bar puzzle-hp-player" id="player-hp-bar" style="width:${playerPct}%"></div>
        </div>
        <div style="font-size:0.92rem; color:var(--text-secondary); margin-top:2px;">HP: ${playerHp}/${effectiveMaxHp}</div>
      </div>
      <div style="display:flex;flex-direction:column;align-items:center;align-self:center;gap:4px;">
        <div style="font-size:0.95rem; color:var(--text-secondary); text-align:center;">
          问题 ${qIndex + 1} / ${totalQuestions}
        </div>
        <button class="btn btn-sm" id="btn-puzzle-retreat" style="font-size:0.9rem;padding:4px 12px;opacity:0.6;">放弃</button>
      </div>
      <div class="puzzle-hp-section">
        <div class="puzzle-hp-label" style="color:#c084fc;">封印强度</div>
        <div class="puzzle-hp-bg">
          <div class="puzzle-hp-bar puzzle-hp-seal" id="seal-hp-bar" style="width:${sealPct}%"></div>
        </div>
        <div style="font-size:0.92rem; color:#c084fc; margin-top:2px;">${sealHp}%</div>
      </div>
    `;
    inner.appendChild(hudDiv);

    // Arena
    const arenaDiv = document.createElement('div');
    arenaDiv.className = 'puzzle-arena';
    arenaDiv.innerHTML = `
      <div class="puzzle-player-sprite" id="player-sprite-wrap">
        <div id="player-sprite" style="width:70px;height:120px;display:flex;align-items:flex-end;justify-content:center;"></div>
        <div style="font-size:0.92rem;color:var(--text-secondary);margin-top:2px;">${profile.name}</div>
      </div>
      <div class="puzzle-vs">⚡</div>
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="puzzle-seal-icon" id="seal-icon">
          <div class="seal-char">封</div>
          <div class="seal-label">封　印</div>
        </div>
        <div style="font-size:0.92rem;color:#c084fc;margin-top:6px;">文字封印</div>
      </div>
    `;
    inner.appendChild(arenaDiv);

    // ── Inject SVG player sprite ──
    {
      const playerEl = inner.querySelector('#player-sprite');
      if (playerEl) {
        playerEl.innerHTML = getPlayerSprite();
        playerEl.style.width = '140px';
        playerEl.style.height = '180px';
      }
    }

    // Seal intent — use new stat formula
    const sealDmgInfo = calcDamageTaken(profile, 8);
    const sealWrongDmg = sealDmgInfo.damage;
    const sealThorns = sealDmgInfo.thornsReturn;
    const intentDiv = document.createElement('div');
    intentDiv.style.cssText = `
      display:flex; justify-content:center; align-items:center;
      margin:2px 24px 4px; padding:5px 14px;
      background:rgba(124,58,237,0.12);
      border:1px solid rgba(168,85,247,0.3);
      border-radius:6px; font-size:0.95rem;
      flex-shrink:0;
    `;
    intentDiv.innerHTML = `<span style="color:#e74c3c;">⚠ 答错: 封印反噬 -${sealWrongDmg} HP</span>${sealThorns > 0 ? `<span style="color:#27ae60;margin-left:8px;">🌿 反刺 ${sealThorns}</span>` : ''}`;
    inner.appendChild(intentDiv);

    // Narrative
    const narrativeDiv = document.createElement('div');
    narrativeDiv.className = 'puzzle-narrative';
    narrativeDiv.textContent = narrative;
    inner.appendChild(narrativeDiv);

    // Scroll box
    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'puzzle-scroll-box';
    scrollDiv.innerHTML = `<div class="puzzle-scroll-title">《${passage.title}》</div>${passage.passage}`;
    inner.appendChild(scrollDiv);

    // Progress
    const progressDiv = document.createElement('div');
    progressDiv.className = 'puzzle-progress';
    progressDiv.textContent = `第 ${qIndex + 1} 题 / 共 ${totalQuestions} 题`;
    inner.appendChild(progressDiv);

    // Question
    const questionDiv = document.createElement('div');
    questionDiv.className = 'puzzle-question';
    questionDiv.textContent = q.prompt;
    inner.appendChild(questionDiv);

    // Options — use grid layout, fill width
    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'puzzle-options';
    q.options.forEach((opt, i) => {
      const btn = document.createElement('button');
      btn.className = 'puzzle-option';
      btn.dataset.idx = i;
      btn.textContent = opt;
      optionsDiv.appendChild(btn);
    });
    inner.appendChild(optionsDiv);

    // Feedback
    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'puzzle-feedback';
    feedbackDiv.id = 'feedback';
    inner.appendChild(feedbackDiv);

    // Retreat button
    const retreatBtn = inner.querySelector('#btn-puzzle-retreat');
    if (retreatBtn) {
      retreatBtn.addEventListener('click', () => {
        profile.hp = playerHp;
        gameState.save();
        showScreen('worldmap');
      });
    }

    inner.querySelectorAll('.puzzle-option').forEach(btn => {
      btn.classList.add('spotlight-card');
      btn.addEventListener('click', () => {
        playSound('click');
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;
        inner.querySelectorAll('.puzzle-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) b.classList.add('correct');
          else if (bIdx === idx) b.classList.add('wrong');
        });

        recordAnswer('reading', correct, passage.id);
        const _ql = gameState.currentQuest?.results?.questionsLog;
        if (_ql) _ql.push({ prompt: q.prompt, correct, explanation: q.explanation || '', isReview: false });
        const sealIcon = inner.querySelector('#seal-icon');

        if (correct) {
          correctCount++;
          playSound('correct');
          playSound('attack');

          // Seal cracks: animate, then update HP
          if (sealIcon) {
            sealIcon.classList.add('seal-cracking');
            setTimeout(() => sealIcon.classList.remove('seal-cracking'), 550);
          }

          sealHp = Math.max(0, sealHp - sealHpPerCorrect);
          const sealBar = inner.querySelector('#seal-hp-bar');
          if (sealBar) sealBar.style.width = sealHp + '%';

          // Animate player sprite lunge
          const playerSprite = inner.querySelector('#player-sprite');
          if (playerSprite) {
            playerSprite.style.transition = 'transform 0.15s ease-out';
            playerSprite.style.transform = 'translateX(30px)';
            setTimeout(() => {
              playerSprite.style.transition = 'transform 0.15s ease-in';
              playerSprite.style.transform = '';
            }, 150);
          }

          feedbackDiv.innerHTML = `<span style="color:var(--accent-jade);">✓ 正确！封印弱化！</span> ${q.explanation}`;

        } else {
          playSound('wrong');
          playSound('hit');

          // Seal pulses red (resists)
          if (sealIcon) {
            sealIcon.classList.add('seal-pulsing');
            setTimeout(() => sealIcon.classList.remove('seal-pulsing'), 550);
          }

          // Player takes minor damage — use new stat formula
          const puzzleDmg = calcDamageTaken(profile, 8);
          const hpLoss = puzzleDmg.damage;
          const puzzleThorns = puzzleDmg.thornsReturn;
          playerHp = Math.max(0, playerHp - hpLoss);
          const playerBar = inner.querySelector('#player-hp-bar');
          if (playerBar) playerBar.style.width = (playerHp / effectiveMaxHp) * 100 + '%';

          // ── Thorns: reflect damage against the seal ──
          if (puzzleThorns > 0) {
            sealHp = Math.max(0, sealHp - Math.round(puzzleThorns * 0.5));
            const sealBar = inner.querySelector('#seal-hp-bar');
            if (sealBar) sealBar.style.width = sealHp + '%';
            // Thorns visual on seal
            setTimeout(() => {
              if (sealIcon) {
                sealIcon.classList.add('seal-cracking');
                setTimeout(() => sealIcon.classList.remove('seal-cracking'), 550);
              }
            }, 400);
          }

          // Screen red flash
          const flash = document.createElement('div');
          flash.style.cssText = `
            position:absolute;inset:0;background:#c0392b;opacity:0;
            pointer-events:none;z-index:997;
            transition:opacity 0.1s ease-in;
          `;
          div.appendChild(flash);
          requestAnimationFrame(() => requestAnimationFrame(() => { flash.style.opacity = '0.25'; }));
          setTimeout(() => {
            flash.style.transition = 'opacity 0.3s ease-out';
            flash.style.opacity = '0';
          }, 120);
          setTimeout(() => flash.remove(), 450);

          feedbackDiv.innerHTML = `<span style="color:var(--accent-red);">✗ 错误！封印反弹！-${hpLoss} HP</span>${puzzleThorns > 0 ? ` <span style="color:#27ae60;">荆棘反刺封印！</span>` : ''} ${q.explanation}`;
        }

        setTimeout(() => {
          qIndex++;
          if (qIndex >= questions.length) {
            endPuzzle(sealIcon);
          } else {
            render();
          }
        }, 2200);
      });
    });
  }

  function endPuzzle(sealIcon) {
    // Seal shatters if any correct answers; otherwise just complete
    if (sealIcon && correctCount > 0) {
      sealParticleBurst(div, sealIcon);
      sealIcon.classList.add('seal-shattering');
    }

    // Show "封印已破！" banner
    const banner = document.createElement('div');
    banner.style.cssText = `
      position:absolute; top:40%; left:50%;
      transform:translate(-50%,-50%) scale(0);
      color:#d8b4fe; font-size:2.4rem; font-weight:900;
      text-shadow: 0 0 20px #a855f7, 0 0 40px #7c3aed;
      pointer-events:none; z-index:1002;
      transition: transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
    `;
    banner.textContent = correctCount >= questions.length ? '封印已破！' : '封印动摇！';
    div.appendChild(banner);
    requestAnimationFrame(() => requestAnimationFrame(() => {
      banner.style.transform = 'translate(-50%,-50%) scale(1)';
    }));

    encounter.completed = true;
    profile.hp = playerHp;
    gameState.save();

    setTimeout(() => {
      banner.remove();
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
    }, 1800);
  }

  render();

  // ── Mini-progress bar (on top of everything) ─────────────────────────────
  createMiniProgress(div);

  return div;
}

registerScreen('puzzle', renderPuzzle);
