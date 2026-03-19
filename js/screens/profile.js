// js/screens/profile.js — Profile creation and selection
import { gameState } from '../state.js';
import { registerScreen, showScreen, ensureAudio } from '../main.js';
import { playSound, playMusic } from '../audio.js';
import { SPRITES } from '../sprites.js';
import { getEffectiveStats } from '../progression.js';
import { SHOP_ITEMS } from './shop.js';

// Grade range options: label shown to user → internal tier + difficultyBase
const GRADE_OPTIONS = [
  { label: '一年级', tier: 'grade1', difficultyBase: 1 },
  { label: '二年级', tier: 'grade1', difficultyBase: 2 },
  { label: '三年级', tier: 'grade3', difficultyBase: 2 },
  { label: '四年级', tier: 'grade4', difficultyBase: 2 },
  { label: '五年级', tier: 'grade5', difficultyBase: 3 },
  { label: '六年级', tier: 'grade5', difficultyBase: 3 },
  { label: '初一(七年级)', tier: 'grade7', difficultyBase: 3 },
  { label: '初二(八年级)', tier: 'grade8', difficultyBase: 3 },
  { label: '初三(九年级)', tier: 'grade8', difficultyBase: 4 },
];

function gradeLabel(profile) {
  const opt = GRADE_OPTIONS.find(
    o => o.tier === profile.tier && o.difficultyBase === (profile.difficultyBase ?? 3)
  );
  if (opt) return opt.label;
  const tierMap = { grade1: '一二年级', grade3: '三年级', grade4: '四年级', grade5: '五六年级', grade7: '七年级', grade8: '八九年级' };
  return tierMap[profile.tier] || profile.tier;
}

// ─── Character card overlay (RPG "character select" feel) ──────────────────
function showCharacterCard(profile, div, onContinue) {
  const stats = getEffectiveStats(profile);
  const equipment = profile.equipment || {};

  // Stat bar helper: value out of a reasonable max for that stat
  function statBar(label, value, max, color) {
    const pct = Math.min(100, Math.round((value / max) * 100));
    return `
      <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px;">
        <span style="width:40px;font-size:0.95rem;color:var(--text-secondary);text-align:right;">${label}</span>
        <div style="flex:1;height:10px;background:var(--bg-secondary);border-radius:5px;overflow:hidden;min-width:80px;">
          <div style="width:${pct}%;height:100%;background:${color};border-radius:5px;transition:width 0.6s ease;"></div>
        </div>
        <span style="width:28px;font-size:0.92rem;font-weight:700;color:${color};">${value}</span>
      </div>`;
  }

  // Equipment slot helper
  function equipSlot(slotName, slotLabel, icon) {
    const itemId = equipment[slotName];
    const item = itemId ? SHOP_ITEMS.find(i => i.id === itemId) : null;
    const upgrades = profile.upgrades || {};
    const upgradeLevel = item ? (upgrades[item.id] || 0) : 0;
    const upgradeStr = upgradeLevel > 0 ? ` <span style="color:var(--accent-gold);font-weight:700;">+${upgradeLevel}</span>` : '';
    const displayName = item ? `${item.name}${upgradeStr}` : `<span style="color:var(--text-dim);">${slotLabel}</span>`;
    return `
      <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--bg-secondary);border-radius:6px;">
        <span style="font-size:1.1rem;">${icon}</span>
        <span style="font-size:0.95rem;">${displayName}</span>
      </div>`;
  }

  const overlay = document.createElement('div');
  overlay.className = 'char-card-overlay';
  overlay.innerHTML = `
    <div class="char-card-box">
      <div class="char-card-sprite" style="width:120px;height:160px;margin:0 auto 12px;">
        ${SPRITES.player}
      </div>
      <div class="char-card-name">${profile.name}</div>
      <div class="char-card-title">${profile.activeTitle || '新手文字侠'}</div>
      <div class="char-card-level">Lv.${profile.level}</div>
      <div class="char-card-stats">
        ${statBar('攻击', stats.attack, 50, '#e74c3c')}
        ${statBar('防御', stats.defense, 50, '#3498db')}
        ${statBar('速度', stats.speed, 20, '#2ecc71')}
      </div>
      <div class="char-card-equips">
        ${equipSlot('weapon', '武器空位', '⚔️')}
        ${equipSlot('armor', '防具空位', '🛡️')}
        ${equipSlot('accessory', '饰品空位', '💍')}
      </div>
      <button class="btn btn-primary char-card-enter" id="char-card-enter">进入游戏</button>
    </div>
  `;

  const style = document.createElement('style');
  style.textContent = `
    .char-card-overlay {
      position:fixed; inset:0; background:rgba(0,0,0,0.8); display:flex;
      align-items:center; justify-content:center; z-index:1000;
      animation: charCardFadeIn 0.3s ease;
    }
    @keyframes charCardFadeIn { from { opacity:0; } to { opacity:1; } }
    .char-card-box {
      background:var(--bg-card); border:2px solid var(--accent-gold); border-radius:16px;
      padding:28px 36px; text-align:center; max-width:340px; width:90%;
      box-shadow:0 0 40px rgba(212,160,23,0.2), 0 8px 32px rgba(0,0,0,0.5);
      animation: charCardSlideUp 0.4s ease;
    }
    @keyframes charCardSlideUp { from { transform:translateY(30px); opacity:0; } to { transform:translateY(0); opacity:1; } }
    .char-card-sprite { margin-bottom:12px; }
    .char-card-name { font-size:1.4rem; font-weight:800; color:var(--text-primary); margin-bottom:2px; }
    .char-card-title { font-size:0.95rem; color:var(--accent-gold); margin-bottom:8px; letter-spacing:0.06em; }
    .char-card-level {
      display:inline-block; background:linear-gradient(135deg,var(--accent-gold),#e67e22);
      color:#1a1035; font-weight:800; font-size:0.95rem; padding:3px 14px;
      border-radius:12px; margin-bottom:14px;
    }
    .char-card-stats { text-align:left; margin-bottom:14px; }
    .char-card-equips { display:flex; flex-direction:column; gap:6px; margin-bottom:18px; }
    .char-card-enter { width:100%; font-size:1rem; padding:10px 0; }
  `;
  overlay.appendChild(style);
  div.appendChild(overlay);

  overlay.querySelector('#char-card-enter').addEventListener('click', () => {
    playSound('correct');
    overlay.style.animation = 'charCardFadeIn 0.25s ease reverse forwards';
    setTimeout(() => {
      overlay.remove();
      onContinue();
    }, 250);
  });

  // Allow clicking backdrop to dismiss
  overlay.addEventListener('click', (ev) => {
    if (ev.target === overlay) {
      playSound('click');
      overlay.style.animation = 'charCardFadeIn 0.25s ease reverse forwards';
      setTimeout(() => {
        overlay.remove();
        onContinue();
      }, 250);
    }
  });
}

function renderProfileSelect(params = {}) {
  const mode = params.mode || 'solo';
  ensureAudio();      // Ensure audio is initialized (belt-and-suspenders)
  playMusic('menu');  // Continue menu music on profile screen
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
      <div class="profile-info">${gradeLabel(p)} · Lv.${p.level}</div>
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
      <p style="font-size:0.9rem; color:var(--text-secondary); margin-bottom:8px;">选择年级</p>
      <div style="display:flex; gap:8px; flex-wrap:wrap; justify-content:center; margin-bottom:12px;">
        ${GRADE_OPTIONS.map((opt, i) => `<button class="btn tier-btn" data-grade-idx="${i}">${opt.label}</button>`).join('\n        ')}
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
    let selectedGradeIdx = null;

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
          // Show character card overlay before entering worldmap
          const selectedProfile = profiles[idx];
          showCharacterCard(selectedProfile, div, () => {
            showScreen('chapter-map');
          });
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
        selectedGradeIdx = parseInt(btn.dataset.gradeIdx);
        const nameInput = div.querySelector('#name-input');
        div.querySelector('#confirm-create').disabled = !(nameInput.value.trim() && selectedGradeIdx !== null);
      });
    });

    div.querySelector('#name-input').addEventListener('input', (e) => {
      div.querySelector('#confirm-create').disabled = !(e.target.value.trim() && selectedGradeIdx !== null);
    });

    div.querySelector('#confirm-create').addEventListener('click', () => {
      const name = div.querySelector('#name-input').value.trim();
      if (name && selectedGradeIdx !== null) {
        playSound('correct');
        const { tier, difficultyBase } = GRADE_OPTIONS[selectedGradeIdx];
        gameState.createProfile(name, tier, difficultyBase);
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
