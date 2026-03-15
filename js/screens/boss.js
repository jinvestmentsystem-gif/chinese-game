// js/screens/boss.js — Classical Chinese boss battle with 3 phases
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';
import { hasAbility } from '../progression.js';
import { loadChengyu } from '../content-loader.js';

const BOSS_NAMES = {
  1: { name: '仓颉之影', sprite: '👹' },
  2: { name: '墨吏', sprite: '👺' },
  3: { name: '诗魔', sprite: '🐉' },
  4: { name: '词煞', sprite: '💀' },
  5: { name: '墨暗之主', sprite: '🌑' },
};

function renderBoss() {
  const div = document.createElement('div');
  div.className = 'screen';
  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  const quest = gameState.currentQuest;
  const bossInfo = BOSS_NAMES[quest.chapterId] || BOSS_NAMES[1];
  const allQuestions = encounter.questions;

  // Split into 3 phases: 3-4 questions each
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
  // Phase transitions trigger at HP thresholds: phase 0 (100-66%), phase 1 (66-33%), phase 2 (33-0%)

  function getCurrentPhaseForHp() {
    if (bossHp > 66) return 0;
    if (bossHp > 33) return 1;
    return 2;
  }

  function render() {
    // Check if boss HP has crossed a phase threshold
    const hpPhase = getCurrentPhaseForHp();
    if (hpPhase > phase) {
      phase = hpPhase;
      qIndex = 0;
    }

    const currentPhase = phases[phase];
    if (!currentPhase || qIndex >= currentPhase.length) {
      if (bossHp <= 0) { endBoss(true); return; }
      // All questions in current phase answered — advance phase
      phase++;
      qIndex = 0;
      if (phase >= phases.length) { endBoss(true); return; }
      render();
      return;
    }

    const q = currentPhase[qIndex];
    const phaseLabel = ['第一阶段：句意翻译', '第二阶段：虚词辨析', '第三阶段：篇章理解'][phase] || '';
    const optionsHTML = q.options.map((opt, i) => `
      <button class="boss-option" data-idx="${i}">${opt}</button>
    `).join('');

    div.innerHTML = `
      <style>
        .boss-header { text-align:center; margin-bottom:8px; }
        .boss-sprite { font-size:4rem; margin:4px 0; }
        .boss-phase { font-size:0.9rem; color:var(--accent-jade); margin-bottom:8px; }
        .boss-hud { display:flex; justify-content:space-between; width:100%; padding:0 32px; margin-bottom:12px; }
        .boss-hp-bg { width:250px; height:18px; background:var(--bg-secondary); border-radius:9px; overflow:hidden; }
        .boss-hp { height:100%; background:var(--accent-red); border-radius:9px; transition:width 0.5s; }
        .player-hp { height:100%; background:var(--hp-green); border-radius:9px; transition:width 0.5s; }
        .boss-question { font-size:1.2rem; margin:16px 32px; text-align:center; background:var(--bg-card); padding:20px; border-radius:8px; border-left:4px solid var(--accent-gold); }
        .boss-options { display:flex; flex-direction:column; gap:10px; padding:0 32px; max-width:600px; margin:0 auto; width:100%; }
        .boss-option {
          font-family:var(--font-main); font-size:1rem; padding:14px 20px; background:var(--bg-card);
          border:2px solid var(--bg-secondary); color:var(--text-primary); border-radius:8px;
          cursor:pointer; transition:all 0.2s; text-align:left;
        }
        .boss-option:hover { border-color:var(--accent-red); }
        .boss-option.correct { border-color:var(--accent-jade); background:rgba(39,174,96,0.2); }
        .boss-option.wrong { border-color:var(--accent-red); background:rgba(192,57,43,0.2); }
        .boss-feedback { font-size:0.95rem; color:var(--text-secondary); margin-top:12px; padding:0 32px; text-align:center; min-height:3em; }
      </style>
      <div class="boss-header">
        <div class="boss-sprite">${bossInfo.sprite}</div>
        <h2 style="color:var(--accent-red); margin:0;">${bossInfo.name}</h2>
        <div class="boss-phase">${phaseLabel}</div>
      </div>
      <div class="boss-hud">
        <div>
          <div style="font-weight:700;">${profile.name} HP</div>
          <div class="boss-hp-bg"><div class="player-hp" style="width:${(playerHp/profile.maxHp)*100}%"></div></div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:var(--accent-red);">BOSS HP</div>
          <div class="boss-hp-bg"><div class="boss-hp" style="width:${bossHp}%"></div></div>
        </div>
      </div>
      <div class="boss-question">${q.prompt}</div>
      <div class="boss-options">${optionsHTML}</div>
      <div style="display:flex;gap:8px;justify-content:center;margin-top:12px;" id="abilities">
        <!-- Buttons rendered conditionally based on hasAbility and wenli -->
      </div>
      <div class="boss-feedback" id="feedback"></div>
    `;

    // Ability buttons
    const abilitiesEl = div.querySelector('#abilities');
    if (abilitiesEl) {
      let btns = '';
      if (hasAbility(profile, 'hint'))   btns += `<button class="btn" id="btn-hint"   style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 1 ? 'disabled' : ''}>提示 (1文力)</button>`;
      if (hasAbility(profile, 'skip'))   btns += `<button class="btn" id="btn-skip"   style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>跳过 (2文力)</button>`;
      if (hasAbility(profile, 'double')) btns += `<button class="btn" id="btn-double" style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>双倍 (2文力)</button>`;
      abilitiesEl.innerHTML = btns;
    }

    // Hint: eliminate one wrong option, costs 1 文力
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

    // Skip: skip question, costs 2 文力
    const skipBtn = div.querySelector('#btn-skip');
    if (skipBtn) skipBtn.addEventListener('click', () => {
      if (profile.wenli < 2) return;
      profile.wenli -= 2;
      qIndex++;
      render();
    });

    // Double: next correct = 2x damage, costs 2 文力
    const doubleBtn = div.querySelector('#btn-double');
    if (doubleBtn) doubleBtn.addEventListener('click', () => {
      if (profile.wenli < 2) return;
      profile.wenli -= 2;
      doubleActive = true;
      doubleBtn.disabled = true;
      doubleBtn.textContent = '双倍 ✓';
    });

    div.querySelectorAll('.boss-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;
        div.querySelectorAll('.boss-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) b.classList.add('correct');
          else if (bIdx === idx) b.classList.add('wrong');
        });

        recordAnswer('classical', correct);

        if (correct) {
          const dmgMultiplier = (1 + profile.attack * 0.01) * (doubleActive ? 2 : 1);
          doubleActive = false;
          const dmg = Math.round(12 * dmgMultiplier);
          bossHp = Math.max(0, bossHp - dmg);
          div.querySelector('#feedback').textContent = `✓ 正确！对${bossInfo.name}造成 ${dmg} 点伤害！${q.explanation}`;
        } else {
          const hpLoss = Math.round(20 * (1 - profile.defense * 0.01));
          playerHp = Math.max(0, playerHp - hpLoss);
          div.querySelector('#feedback').textContent = `✗ 错误！${bossInfo.name}反击，失去 ${hpLoss} HP。${q.explanation}`;
        }

        // Track seen
        if (!profile.seenQuestions.classical.includes(q.id)) {
          profile.seenQuestions.classical.push(q.id);
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
    encounter.completed = won;
    profile.hp = playerHp;
    gameState.save();

    if (!won) {
      div.innerHTML = `
        <div class="screen">
          <h2 style="color:var(--accent-red);">败北……</h2>
          <p style="margin:1rem 0;">${bossInfo.name}将你击败了。</p>
          <div style="display:flex; gap:12px; justify-content:center;">
            <button class="btn btn-primary" id="btn-retry">再战一次</button>
            <button class="btn" id="btn-retreat">撤退</button>
          </div>
        </div>
      `;
      setTimeout(() => {
        div.querySelector('#btn-retry').addEventListener('click', () => {
          profile.hp = profile.maxHp;
          showScreen('boss');
        });
        div.querySelector('#btn-retreat').addEventListener('click', () => showScreen('worldmap'));
      }, 0);
      return;
    }

    // Boss defeated — check for chengyu drop
    const allChengyu = await loadChengyu();
    const uncollected = allChengyu.filter(cy => !profile.chengyu.includes(cy.id) && cy.chapter === quest.chapterId);
    if (uncollected.length > 0) {
      const drop = uncollected[Math.floor(Math.random() * uncollected.length)];
      profile.chengyu.push(drop.id);
      gameState.save();

      // Show chengyu notification before advancing
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
          if (!next) showScreen('reward');
          else showScreen(next.type);
        });
      }, 0);
      return;
    }

    // No chengyu to drop — advance normally
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

registerScreen('boss', renderBoss);
