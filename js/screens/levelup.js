// js/screens/levelup.js — Stat allocation screen shown on level-up
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';

function renderLevelUp(params) {
  const { newLevel, previousScreen, previousParams } = params;
  const profile = gameState.profile;
  let pointsRemaining = 2;
  const allocations = { attack: 0, defense: 0, speed: 0, wenli: 0, hp: 0 };

  const div = document.createElement('div');
  div.className = 'screen';

  function renderStatRow(stat, label, currentVal, desc) {
    return `
      <div style="
        background:var(--bg-card);
        border:1px solid var(--bg-secondary);
        border-radius:8px;
        padding:12px;
        text-align:left;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
          <span style="font-weight:700;">${label}</span>
          <span style="color:var(--accent-gold);">${currentVal}${allocations[stat] > 0 ? ` <span style="color:var(--accent-jade);">+${allocations[stat]}</span>` : ''}</span>
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary);margin-bottom:8px;">${desc}</div>
        <div style="display:flex;gap:8px;justify-content:flex-end;">
          <button class="btn stat-minus" data-stat="${stat}"
            style="padding:2px 10px;font-size:0.9rem;"
            ${allocations[stat] <= 0 ? 'disabled' : ''}>−</button>
          <button class="btn stat-plus" data-stat="${stat}"
            style="padding:2px 10px;font-size:0.9rem;"
            ${pointsRemaining <= 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
  }

  function render() {
    div.innerHTML = `
      <div style="
        text-align:center;
        padding:32px 20px;
        max-width:480px;
        margin:0 auto;
      ">
        <div style="font-size:3rem;margin-bottom:8px;">⬆️</div>
        <h2 style="color:var(--accent-gold);font-size:2rem;margin-bottom:8px;">
          升级！Level ${newLevel}
        </h2>
        <p style="color:var(--text-secondary);margin-bottom:24px;">
          分配 <strong style="color:var(--accent-gold);">${pointsRemaining}</strong> 点属性值
        </p>

        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:24px;">
          ${renderStatRow('attack',  '攻击 ⚔️',  profile.attack + allocations.attack,  '每点+1%伤害')}
          ${renderStatRow('defense', '防御 🛡️',  profile.defense + allocations.defense, '每点-1%受伤')}
          ${renderStatRow('speed',   '速度 ⚡',   profile.speed + allocations.speed,    '每点+1.5秒')}
          ${renderStatRow('wenli',   '文力 📜',   profile.maxWenli + allocations.wenli, '每点+1文力上限')}
          ${renderStatRow('hp',      '生命 ❤️',   profile.maxHp + allocations.hp * 10, '每点+10HP')}
        </div>

        <button class="btn btn-primary" id="confirm-stats"
          style="width:100%;padding:12px;font-size:1rem;"
          ${pointsRemaining > 0 ? 'disabled style="opacity:0.5;"' : ''}>
          确认分配
        </button>
        ${pointsRemaining > 0
          ? `<p style="font-size:0.8rem;color:var(--text-dim);margin-top:8px;">请先分配所有属性点</p>`
          : ''}
      </div>
    `;

    // Wire up buttons after innerHTML
    setTimeout(() => {
      div.querySelectorAll('.stat-plus').forEach(btn => {
        btn.addEventListener('click', () => {
          if (pointsRemaining <= 0) return;
          const stat = btn.dataset.stat;
          allocations[stat]++;
          pointsRemaining--;
          playSound('click');
          render();
        });
      });

      div.querySelectorAll('.stat-minus').forEach(btn => {
        btn.addEventListener('click', () => {
          const stat = btn.dataset.stat;
          if (allocations[stat] <= 0) return;
          allocations[stat]--;
          pointsRemaining++;
          playSound('click');
          render();
        });
      });

      const confirmBtn = div.querySelector('#confirm-stats');
      if (confirmBtn && pointsRemaining === 0) {
        confirmBtn.addEventListener('click', () => {
          // Apply stat allocations
          profile.attack   += allocations.attack;
          profile.defense  += allocations.defense;
          profile.speed    += allocations.speed;
          profile.maxWenli += allocations.wenli;
          profile.maxHp    += allocations.hp * 10;

          // Full heal on level-up (after stat allocation so new max is used)
          profile.hp    = profile.maxHp;
          profile.wenli = profile.maxWenli;

          gameState.save();
          playSound('levelup');

          // Return to previous context or worldmap
          if (previousScreen) {
            showScreen(previousScreen, previousParams || {});
          } else {
            showScreen('worldmap');
          }
        });
      }
    }, 0);
  }

  playSound('levelup');
  render();
  return div;
}

registerScreen('levelup', renderLevelUp);
