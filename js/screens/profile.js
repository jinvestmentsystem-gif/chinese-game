// js/screens/profile.js — Profile creation and selection
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';

function renderProfileSelect(params = {}) {
  const mode = params.mode || 'solo'; // 'solo' or 'arena'
  const div = document.createElement('div');
  div.className = 'screen';

  const profiles = gameState.profiles;

  let profileListHTML = profiles.map((p, i) => `
    <div class="profile-card" data-index="${i}">
      <div class="profile-name">${p.name}</div>
      <div class="profile-info">${p.tier === 'grade7' ? '七年级' : '三年级'} · Lv.${p.level}</div>
    </div>
  `).join('');

  div.innerHTML = `
    <h2 style="margin-bottom:1.5rem;">选择角色</h2>
    <div class="profile-list">
      ${profileListHTML}
      <div class="profile-card profile-new" id="new-profile">
        <div class="profile-name">+ 新建角色</div>
      </div>
    </div>
    <div id="create-form" style="display:none; margin-top:1.5rem; text-align:center;">
      <input type="text" id="name-input" placeholder="输入名字" maxlength="8"
        style="font-size:1.1rem; padding:8px 16px; background:var(--bg-secondary);
        border:1px solid var(--accent-gold); color:var(--text-primary); border-radius:4px;
        font-family:var(--font-main); margin-bottom:12px; display:block; width:240px; margin-left:auto; margin-right:auto;">
      <div style="display:flex; gap:12px; justify-content:center; margin-bottom:12px;">
        <button class="btn tier-btn" data-tier="grade3">三年级</button>
        <button class="btn tier-btn" data-tier="grade7">七年级</button>
      </div>
      <button class="btn btn-primary" id="confirm-create" disabled>创建</button>
    </div>
    <button class="btn" id="back-btn" style="margin-top:2rem;">返回</button>
  `;

  // Style profile cards
  const style = document.createElement('style');
  style.textContent = `
    .profile-list { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }
    .profile-card {
      background:var(--bg-card); border:2px solid var(--bg-secondary); border-radius:8px;
      padding:20px 32px; cursor:pointer; transition:all 0.2s; min-width:160px; text-align:center;
    }
    .profile-card:hover { border-color:var(--accent-gold); }
    .profile-name { font-size:1.2rem; font-weight:700; margin-bottom:4px; }
    .profile-info { font-size:0.9rem; color:var(--text-secondary); }
    .profile-new { border-style:dashed; }
    .tier-btn.selected { background:var(--accent-gold); color:var(--bg-primary); }
  `;
  div.appendChild(style);

  // Event handlers after DOM insertion
  setTimeout(() => {
    let selectedTier = null;

    div.querySelectorAll('.profile-card[data-index]').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index);
        gameState.selectProfile(idx);
        if (mode === 'arena' && !params.player2) {
          showScreen('profile', { mode: 'arena', player1Index: idx, player2: true });
        } else if (mode === 'arena' && params.player2) {
          gameState.arenaState = {
            player1Index: params.player1Index,
            player2Index: idx,
          };
          showScreen('arena');
        } else {
          showScreen('worldmap');
        }
      });
    });

    div.querySelector('#new-profile').addEventListener('click', () => {
      div.querySelector('#create-form').style.display = 'block';
    });

    div.querySelectorAll('.tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        div.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTier = btn.dataset.tier;
        const nameInput = div.querySelector('#name-input');
        div.querySelector('#confirm-create').disabled = !(nameInput.value.trim() && selectedTier);
      });
    });

    div.querySelector('#name-input').addEventListener('input', (e) => {
      div.querySelector('#confirm-create').disabled = !(e.target.value.trim() && selectedTier);
    });

    div.querySelector('#confirm-create').addEventListener('click', () => {
      const name = div.querySelector('#name-input').value.trim();
      if (name && selectedTier) {
        gameState.createProfile(name, selectedTier);
        showScreen('profile', params);
      }
    });

    div.querySelector('#back-btn').addEventListener('click', () => showScreen('title'));
  }, 0);

  return div;
}

registerScreen('profile', renderProfileSelect);
