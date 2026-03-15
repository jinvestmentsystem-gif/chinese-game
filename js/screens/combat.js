// js/screens/combat.js — Vocab combat encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';

const ENEMY_NAMES = ['墨灵', '暗字兵', '墨影卫', '乱笔妖', '黑墨士'];

function renderCombat() {
  const div = document.createElement('div');
  div.className = 'screen';
  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  const questions = encounter.questions;
  let qIndex = 0;
  let playerHp = profile.hp;
  let enemyHp = 100;
  let combo = 0;
  let timerInterval = null;
  const enemyName = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
  const baseTimer = 15 + (profile.speed * 1.5);

  function render() {
    const q = questions[qIndex];
    if (!q) { endCombat(true); return; }
    const optionsHTML = q.options.map((opt, i) => `
      <button class="combat-option" data-idx="${i}">${opt}</button>
    `).join('');

    div.innerHTML = `
      <style>
        .combat-hud { display:flex; justify-content:space-between; width:100%; padding:16px 32px; }
        .hp-section { text-align:center; }
        .hp-bar-bg { width:200px; height:16px; background:var(--bg-secondary); border-radius:8px; overflow:hidden; margin-top:4px; }
        .hp-bar { height:100%; border-radius:8px; transition:width 0.3s; }
        .hp-player { background:var(--hp-green); }
        .hp-enemy { background:var(--hp-red); }
        .timer-bar-bg { width:80%; max-width:500px; height:8px; background:var(--bg-secondary); border-radius:4px; overflow:hidden; margin:12px auto; }
        .timer-bar { height:100%; background:var(--timer-yellow); border-radius:4px; transition:width 0.1s linear; }
        .combo-display { font-size:1.2rem; color:var(--accent-gold); font-weight:700; min-height:1.5em; }
        .combat-question { font-size:1.3rem; margin:16px 0; padding:0 32px; text-align:center; }
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
        .battle-sprite { font-size:3rem; margin:8px 0; }
      </style>
      <div class="combat-hud">
        <div class="hp-section">
          <div style="font-weight:700;">${profile.name}</div>
          <div class="hp-bar-bg"><div class="hp-bar hp-player" id="player-hp" style="width:${(playerHp/profile.maxHp)*100}%"></div></div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">HP: ${playerHp}/${profile.maxHp}</div>
        </div>
        <div class="combo-display" id="combo">${combo > 1 ? combo + ' 连击！' : ''}</div>
        <div class="hp-section">
          <div style="font-weight:700; color:var(--accent-red);">${enemyName}</div>
          <div class="hp-bar-bg"><div class="hp-bar hp-enemy" id="enemy-hp" style="width:${enemyHp}%"></div></div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">HP: ${enemyHp}%</div>
        </div>
      </div>
      <div class="battle-sprite">⚔️</div>
      <div class="timer-bar-bg"><div class="timer-bar" id="timer-bar" style="width:100%"></div></div>
      <div class="combat-question">${q.prompt}</div>
      <div class="combat-options" id="options">${optionsHTML}</div>
      <div class="feedback-text" id="feedback"></div>
    `;

    // Start timer
    let timeLeft = baseTimer;
    const timerBar = div.querySelector('#timer-bar');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timerBar) timerBar.style.width = Math.max(0, (timeLeft / baseTimer) * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleAnswer(-1, q);
      }
    }, 100);

    // Option click handlers
    div.querySelectorAll('.combat-option').forEach(btn => {
      btn.addEventListener('click', () => {
        clearInterval(timerInterval);
        const idx = parseInt(btn.dataset.idx);
        handleAnswer(idx, q);
      });
    });
  }

  function handleAnswer(idx, q) {
    const correct = idx === q.correct;
    const buttons = div.querySelectorAll('.combat-option');
    buttons.forEach(btn => {
      btn.style.pointerEvents = 'none';
      const bIdx = parseInt(btn.dataset.idx);
      if (bIdx === q.correct) btn.classList.add('correct');
      else if (bIdx === idx) btn.classList.add('wrong');
    });

    recordAnswer('vocab', correct);

    // Track seen vocab questions
    if (!profile.seenQuestions.vocab.includes(q.id)) {
      profile.seenQuestions.vocab.push(q.id);
    }

    if (correct) {
      combo++;
      const dmgMultiplier = 1 + (combo > 1 ? combo * 0.15 : 0) + (profile.attack * 0.01);
      const dmg = Math.round(20 * dmgMultiplier);
      enemyHp = Math.max(0, enemyHp - dmg);
      div.querySelector('#feedback').textContent = `✓ 正确！造成 ${dmg} 点伤害！${q.explanation}`;
    } else {
      combo = 0;
      const hpLoss = Math.round(15 * (1 - profile.defense * 0.01));
      playerHp = Math.max(0, playerHp - hpLoss);
      div.querySelector('#feedback').textContent = `✗ 错误！失去 ${hpLoss} HP。${q.explanation}`;
    }

    // Update quest combo tracking
    const quest = gameState.currentQuest;
    quest.results.combo = combo;

    setTimeout(() => {
      if (enemyHp <= 0) { endCombat(true); return; }
      if (playerHp <= 0) { endCombat(false); return; }
      qIndex++;
      if (qIndex >= questions.length) { endCombat(true); return; }
      render();
    }, 1800);
  }

  function endCombat(won) {
    clearInterval(timerInterval);
    encounter.completed = won;
    profile.hp = playerHp;
    gameState.save();

    if (!won) {
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

    // Advance to next encounter
    const next = advanceEncounter();
    if (!next) {
      showScreen('reward');
    } else {
      if (next.type === 'combat') showScreen('combat');
      else if (next.type === 'puzzle') showScreen('puzzle');
      else if (next.type === 'boss') showScreen('boss');
    }
  }

  render();
  return div;
}

registerScreen('combat', renderCombat);
