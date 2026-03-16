// js/screens/puzzle.js — Reading comprehension encounter (battle framework)
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';
import { playSound, playMusic, setMusicIntensity } from '../audio.js';
import { SPRITES } from '../sprites.js';

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

function renderPuzzle() {
  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = 'overflow:hidden;';

  // Set puzzle music — light rhythm (intensity 1)
  const chapterId = gameState.currentQuest?.chapterId || 1;
  const eraMap = {1:'xianqin',2:'han',3:'tang',4:'song',5:'modern'};
  playMusic(eraMap[chapterId] || 'xianqin');
  setTimeout(() => setMusicIntensity(1), 200);

  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
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
    .puzzle-hud {
      display:flex; justify-content:space-between; align-items:flex-start;
      width:100%; padding:14px 32px; padding-top:44px; box-sizing:border-box;
    }
    .puzzle-hp-section { text-align:center; }
    .puzzle-hp-label { font-weight:700; font-size:0.95rem; margin-bottom:4px; }
    .puzzle-hp-bg {
      width:180px; height:14px; background:var(--bg-secondary);
      border-radius:7px; overflow:hidden; margin:0 auto;
    }
    .puzzle-hp-bar { height:100%; border-radius:7px; transition:width 0.4s; }
    .puzzle-hp-player { background:var(--hp-green); }
    .puzzle-hp-seal {
      background: linear-gradient(90deg, #7c3aed, #a855f7);
    }
    .puzzle-arena {
      display:flex; align-items:center; justify-content:space-between;
      width:100%; padding:0 48px; box-sizing:border-box;
      margin:4px 0; min-height:140px; position:relative;
    }
    .puzzle-player-sprite {
      display:flex; flex-direction:column; align-items:center;
      position:relative;
    }
    .puzzle-vs {
      font-size:1.8rem; font-weight:900; color:var(--accent-gold);
      text-shadow: 0 0 12px #d4a017;
      flex:1; text-align:center;
    }
    .puzzle-seal-icon {
      width:80px; height:100px;
      border:3px solid #a855f7;
      border-radius:8px;
      background:rgba(60,20,90,0.7);
      display:flex; flex-direction:column; align-items:center; justify-content:center;
      box-shadow: 0 0 18px rgba(168,85,247,0.6), inset 0 0 16px rgba(124,58,237,0.3);
      position:relative; overflow:hidden;
      transition: box-shadow 0.3s, border-color 0.3s;
    }
    .puzzle-seal-icon .seal-char {
      font-size:2.4rem; font-weight:900; color:#d8b4fe;
      text-shadow: 0 0 14px #a855f7, 0 0 28px #7c3aed;
      line-height:1;
    }
    .puzzle-seal-icon .seal-label {
      font-size:0.65rem; color:#c084fc; margin-top:4px; letter-spacing:2px;
    }
    .puzzle-seal-icon::before {
      content:'';
      position:absolute; inset:0;
      background:repeating-linear-gradient(
        45deg,
        transparent, transparent 6px,
        rgba(168,85,247,0.08) 6px, rgba(168,85,247,0.08) 7px
      );
    }
    .puzzle-narrative {
      font-style:italic; font-size:0.95rem; color:#c084fc;
      text-align:center; margin:0 32px 6px;
      text-shadow: 0 0 8px rgba(168,85,247,0.5);
      padding:8px 16px;
      border-radius:6px;
      background:rgba(60,20,90,0.3);
      border:1px solid rgba(124,58,237,0.3);
    }
    .puzzle-scroll-box {
      margin:0 32px 10px; padding:16px 20px;
      background:rgba(30,25,15,0.85);
      border:2px solid #7c5a0a;
      border-radius:8px;
      box-shadow: inset 0 0 20px rgba(212,160,23,0.08), 0 0 12px rgba(124,90,10,0.3);
      max-height:160px; overflow-y:auto;
      font-size:1rem; line-height:1.85;
      color:#e8d5a0;
      position:relative;
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
      font-size:0.85rem; font-weight:700; color:#d4a017;
      margin-bottom:8px; letter-spacing:2px;
    }
    .puzzle-progress {
      font-size:0.85rem; color:var(--text-secondary);
      text-align:center; margin-bottom:6px;
    }
    .puzzle-question {
      font-size:1.1rem; margin:0 32px 12px; text-align:center; font-weight:600;
    }
    @keyframes sealCrack {
      0%   { box-shadow:0 0 18px rgba(168,85,247,0.6), inset 0 0 16px rgba(124,58,237,0.3); border-color:#a855f7; }
      30%  { box-shadow:0 0 30px rgba(255,80,80,0.8), inset 0 0 20px rgba(220,50,50,0.4); border-color:#ff5050; }
      60%  { box-shadow:0 0 8px rgba(168,85,247,0.2), inset 0 0 6px rgba(124,58,237,0.1); border-color:#7c3aed; opacity:0.7; }
      100% { box-shadow:0 0 18px rgba(168,85,247,0.6), inset 0 0 16px rgba(124,58,237,0.3); border-color:#a855f7; opacity:1; }
    }
    @keyframes sealPulseRed {
      0%   { box-shadow:0 0 18px rgba(168,85,247,0.6), inset 0 0 16px rgba(124,58,237,0.3); }
      50%  { box-shadow:0 0 28px rgba(220,50,50,0.9), inset 0 0 18px rgba(200,30,30,0.5); border-color:#e74c3c; }
      100% { box-shadow:0 0 18px rgba(168,85,247,0.6), inset 0 0 16px rgba(124,58,237,0.3); border-color:#a855f7; }
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
    const playerPct = (playerHp / profile.maxHp) * 100;

    const optionsHTML = q.options.map((opt, i) => `
      <button class="puzzle-option" data-idx="${i}">${opt}</button>
    `).join('');

    const hudDiv = document.createElement('div');
    hudDiv.className = 'puzzle-hud';
    hudDiv.innerHTML = `
      <div class="puzzle-hp-section">
        <div class="puzzle-hp-label">${profile.name}</div>
        <div class="puzzle-hp-bg">
          <div class="puzzle-hp-bar puzzle-hp-player" id="player-hp-bar" style="width:${playerPct}%"></div>
        </div>
        <div style="font-size:0.75rem; color:var(--text-secondary); margin-top:2px;">HP: ${playerHp}/${profile.maxHp}</div>
      </div>
      <div style="font-size:0.8rem; color:var(--text-secondary); text-align:center; align-self:center;">
        问题 ${qIndex + 1} / ${totalQuestions}
      </div>
      <div class="puzzle-hp-section">
        <div class="puzzle-hp-label" style="color:#c084fc;">封印强度</div>
        <div class="puzzle-hp-bg">
          <div class="puzzle-hp-bar puzzle-hp-seal" id="seal-hp-bar" style="width:${sealPct}%"></div>
        </div>
        <div style="font-size:0.75rem; color:#c084fc; margin-top:2px;">${sealHp}%</div>
      </div>
    `;
    div.appendChild(hudDiv);

    const arenaDiv = document.createElement('div');
    arenaDiv.className = 'puzzle-arena';
    arenaDiv.innerHTML = `
      <div class="puzzle-player-sprite" id="player-sprite-wrap">
        <div id="player-sprite" style="width:70px;height:120px;display:flex;align-items:center;justify-content:center;">${SPRITES.player}</div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-top:2px;">${profile.name}</div>
      </div>
      <div class="puzzle-vs">⚡</div>
      <div style="display:flex;flex-direction:column;align-items:center;">
        <div class="puzzle-seal-icon" id="seal-icon">
          <div class="seal-char">封</div>
          <div class="seal-label">封　印</div>
        </div>
        <div style="font-size:0.75rem;color:#c084fc;margin-top:4px;">文字封印</div>
      </div>
    `;
    div.appendChild(arenaDiv);

    // ── Seal intent: show damage preview on wrong answer ──
    const sealWrongDmg = Math.round(8 * (1 - profile.defense * 0.01));
    const intentDiv = document.createElement('div');
    intentDiv.style.cssText = `
      display:flex; justify-content:center; align-items:center;
      margin:2px 32px 4px; padding:5px 14px;
      background:rgba(124,58,237,0.12);
      border:1px solid rgba(168,85,247,0.3);
      border-radius:6px; font-size:0.82rem;
    `;
    intentDiv.innerHTML = `<span style="color:#e74c3c;">⚠ 答错: 封印反噬 -${sealWrongDmg} HP</span>`;
    div.appendChild(intentDiv);

    const narrativeDiv = document.createElement('div');
    narrativeDiv.className = 'puzzle-narrative';
    narrativeDiv.textContent = narrative;
    div.appendChild(narrativeDiv);

    const scrollDiv = document.createElement('div');
    scrollDiv.className = 'puzzle-scroll-box';
    scrollDiv.innerHTML = `<div class="puzzle-scroll-title">《${passage.title}》</div>${passage.passage}`;
    div.appendChild(scrollDiv);

    const progressDiv = document.createElement('div');
    progressDiv.className = 'puzzle-progress';
    progressDiv.textContent = `第 ${qIndex + 1} 题 / 共 ${totalQuestions} 题`;
    div.appendChild(progressDiv);

    const questionDiv = document.createElement('div');
    questionDiv.className = 'puzzle-question';
    questionDiv.textContent = q.prompt;
    div.appendChild(questionDiv);

    const optionsDiv = document.createElement('div');
    optionsDiv.className = 'puzzle-options';
    optionsDiv.innerHTML = optionsHTML;
    div.appendChild(optionsDiv);

    const feedbackDiv = document.createElement('div');
    feedbackDiv.className = 'puzzle-feedback';
    feedbackDiv.id = 'feedback';
    div.appendChild(feedbackDiv);

    div.querySelectorAll('.puzzle-option').forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;
        div.querySelectorAll('.puzzle-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) b.classList.add('correct');
          else if (bIdx === idx) b.classList.add('wrong');
        });

        recordAnswer('reading', correct, passage.id);
        const sealIcon = div.querySelector('#seal-icon');

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
          const sealBar = div.querySelector('#seal-hp-bar');
          if (sealBar) sealBar.style.width = sealHp + '%';

          // Animate player sprite lunge
          const playerSprite = div.querySelector('#player-sprite');
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

          // Player takes minor damage
          const hpLoss = Math.round(8 * (1 - profile.defense * 0.01));
          playerHp = Math.max(0, playerHp - hpLoss);
          const playerBar = div.querySelector('#player-hp-bar');
          if (playerBar) playerBar.style.width = (playerHp / profile.maxHp) * 100 + '%';

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

          feedbackDiv.innerHTML = `<span style="color:var(--accent-red);">✗ 错误！封印反弹！-${hpLoss} HP</span> ${q.explanation}`;
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
