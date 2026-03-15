// js/screens/profile.js — Profile creation and selection
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';

function renderProfileSelect(params = {}) {
  const mode = params.mode || 'solo';
  const div = document.createElement('div');
  div.className = 'screen';

  const profiles = gameState.profiles;

  const modeLabel = mode === 'arena'
    ? (params.player2 ? '选择玩家2' : '选择玩家1')
    : '选择角色';

  let profileListHTML = profiles.map((p, i) => `
    <div class="profile-card" data-index="${i}" style="position:relative;">
      <button class="delete-profile-btn" data-delete="${i}" title="删除角色" style="
        position:absolute; top:4px; right:6px; background:transparent; border:none;
        color:var(--accent-red); font-size:1rem; cursor:pointer; opacity:0.4;
        width:24px; height:24px; display:flex; align-items:center; justify-content:center;
        border-radius:50%; transition:opacity 0.2s;
      " onmouseover="this.style.opacity='1'" onmouseout="this.style.opacity='0.4'">✕</button>
      <div class="profile-name">${p.name}</div>
      <div class="profile-info">${p.tier === 'grade7' ? '七年级' : '三年级'} · Lv.${p.level}</div>
    </div>
  `).join('');

  div.innerHTML = `
    <h2 style="margin-bottom:1.5rem;">${modeLabel}</h2>
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
    .confirm-delete {
      position:fixed; inset:0; background:rgba(0,0,0,0.7); display:flex;
      align-items:center; justify-content:center; z-index:999;
    }
    .confirm-delete-box {
      background:var(--bg-card); border:2px solid var(--accent-red); border-radius:12px;
      padding:24px 32px; text-align:center; max-width:320px;
    }
  `;
  div.appendChild(style);

  setTimeout(() => {
    let selectedTier = null;

    // Delete buttons
    div.querySelectorAll('.delete-profile-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        const idx = parseInt(btn.dataset.delete);
        const name = profiles[idx].name;
        playSound('click');

        // Confirmation dialog
        const overlay = document.createElement('div');
        overlay.className = 'confirm-delete';
        overlay.innerHTML = `
          <div class="confirm-delete-box">
            <p style="margin-bottom:16px; font-size:1.1rem;">确定要删除角色 <strong style="color:var(--accent-gold);">${name}</strong> 吗？</p>
            <p style="margin-bottom:20px; font-size:0.9rem; color:var(--text-secondary);">此操作不可撤销</p>
            <div style="display:flex; gap:12px; justify-content:center;">
              <button class="btn" id="cancel-delete">取消</button>
              <button class="btn" id="confirm-delete-btn" style="border-color:var(--accent-red); color:var(--accent-red);">删除</button>
            </div>
          </div>
        `;
        div.appendChild(overlay);

        overlay.querySelector('#cancel-delete').addEventListener('click', () => {
          overlay.remove();
        });
        overlay.querySelector('#confirm-delete-btn').addEventListener('click', () => {
          gameState.deleteProfile(idx);
          overlay.remove();
          showScreen('profile', params);
        });
        overlay.addEventListener('click', (ev) => {
          if (ev.target === overlay) overlay.remove();
        });
      });
    });

    // Profile selection
    div.querySelectorAll('.profile-card[data-index]').forEach(card => {
      card.addEventListener('click', () => {
        playSound('click');
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
        } else if (mode === 'daily') {
          showScreen('daily');
        } else {
          showScreen('worldmap');
        }
      });
    });

    div.querySelector('#new-profile').addEventListener('click', () => {
      playSound('click');
      div.querySelector('#create-form').style.display = 'block';
    });

    div.querySelectorAll('.tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
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
        playSound('correct');
        gameState.createProfile(name, selectedTier);
        showScreen('profile', params);
      }
    });

    div.querySelector('#back-btn').addEventListener('click', () => {
      playSound('click');
      showScreen('title');
    });
  }, 0);

  return div;
}

registerScreen('profile', renderProfileSelect);
