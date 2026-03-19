// js/screens/trophy-room.js — Achievement gallery / trophy display
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';

// ─── Milestone definitions (local copy, not exported from reward.js) ─────────
const MILESTONES = [
  { id: 'first_quest', check: s => s.totalQuests >= 1, title: '初出茅庐', desc: '完成第一个任务！', target: 1, stat: 'totalQuests' },
  { id: 'first_boss', check: s => s.totalBossKills >= 1, title: '初战告捷', desc: '击败第一个BOSS！', target: 1, stat: 'totalBossKills' },
  { id: 'combo_3', check: s => s.maxCombo >= 3, title: '连击新手', desc: '达成3连击！', target: 3, stat: 'maxCombo' },
  { id: 'combo_5', check: s => s.maxCombo >= 5, title: '连击达人', desc: '达成5连击！', target: 5, stat: 'maxCombo' },
  { id: 'combo_10', check: s => s.maxCombo >= 10, title: '连击大师', desc: '达成10连击！', target: 10, stat: 'maxCombo' },
  { id: 'correct_50', check: s => s.totalCorrect >= 50, title: '学有所成', desc: '累计答对50题！', target: 50, stat: 'totalCorrect' },
  { id: 'correct_100', check: s => s.totalCorrect >= 100, title: '博学多才', desc: '累计答对100题！', target: 100, stat: 'totalCorrect' },
  { id: 'correct_200', check: s => s.totalCorrect >= 200, title: '文字大师', desc: '累计答对200题！', target: 200, stat: 'totalCorrect' },
  { id: 'quest_5', check: s => s.totalQuests >= 5, title: '冒险家', desc: '完成5个任务！', target: 5, stat: 'totalQuests' },
  { id: 'quest_10', check: s => s.totalQuests >= 10, title: '老练冒险家', desc: '完成10个任务！', target: 10, stat: 'totalQuests' },
  { id: 'boss_3', check: s => s.totalBossKills >= 3, title: 'BOSS猎人', desc: '击败3个BOSS！', target: 3, stat: 'totalBossKills' },
  { id: 'xp_500', check: s => s.totalXP >= 500, title: '经验丰富', desc: '累计获得500经验！', target: 500, stat: 'totalXP' },
  { id: 'xp_2000', check: s => s.totalXP >= 2000, title: '身经百战', desc: '累计获得2000经验！', target: 2000, stat: 'totalXP' },
];

// Trophy icons per milestone category
const TROPHY_ICONS = {
  totalQuests: '📜',
  totalBossKills: '⚔️',
  maxCombo: '🔥',
  totalCorrect: '✏️',
  totalXP: '⭐',
};

function renderTrophyRoom() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  if (!profile) {
    div.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">无档案数据</div>';
    return div;
  }

  const stats = profile.stats || {};
  const achievements = profile.achievements || [];
  const unlockedCount = MILESTONES.filter(m => achievements.includes(m.id)).length;
  const totalCount = MILESTONES.length;

  // Build trophy cards
  const cardsHTML = MILESTONES.map((m, i) => {
    const unlocked = achievements.includes(m.id);
    const currentVal = stats[m.stat] || 0;
    const progressPct = Math.min(100, Math.round((currentVal / m.target) * 100));
    const icon = TROPHY_ICONS[m.stat] || '🏆';

    return `
      <div style="
        background:var(--bg-card);
        border:2px solid ${unlocked ? 'var(--accent-gold)' : 'var(--bg-secondary)'};
        border-radius:12px;
        padding:16px;
        display:flex;
        flex-direction:column;
        gap:8px;
        position:relative;
        overflow:hidden;
        transition:transform 0.2s, box-shadow 0.2s;
        ${unlocked ? 'box-shadow:0 0 16px rgba(212,160,23,0.15);' : ''}
        opacity:0;
        transform:translateY(16px);
        animation:trophy-card-in 0.4s ease-out ${i * 0.06}s forwards;
      ">
        ${unlocked ? `
          <div style="
            position:absolute; top:0; right:0;
            background:linear-gradient(135deg,var(--accent-gold),#e67e22);
            color:#1a1035;
            font-size:0.7rem;
            font-weight:800;
            padding:2px 10px 2px 14px;
            border-radius:0 0 0 12px;
            letter-spacing:0.05em;
          ">已解锁</div>
        ` : ''}

        <div style="display:flex;align-items:center;gap:10px;">
          <div style="
            width:44px; height:44px;
            border-radius:50%;
            background:${unlocked ? 'linear-gradient(135deg,#d4a017,#f0c040)' : 'var(--bg-secondary)'};
            display:flex; align-items:center; justify-content:center;
            font-size:1.4rem;
            ${unlocked ? 'box-shadow:0 0 12px rgba(212,160,23,0.4);' : ''}
            flex-shrink:0;
          ">
            ${unlocked ? icon : '<span style="opacity:0.3;filter:grayscale(1);">' + icon + '</span>'}
          </div>
          <div style="flex:1;min-width:0;">
            <div style="
              font-size:1.05rem;
              font-weight:700;
              color:${unlocked ? 'var(--accent-gold)' : 'var(--text-dim)'};
              margin-bottom:2px;
              white-space:nowrap;
              overflow:hidden;
              text-overflow:ellipsis;
            ">${m.title}</div>
            <div style="
              font-size:0.85rem;
              color:${unlocked ? 'var(--text-secondary)' : 'var(--text-dim)'};
            ">${m.desc}</div>
          </div>
        </div>

        <div style="width:100%;">
          <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px;">
            <span style="
              font-size:0.8rem;
              color:${unlocked ? 'var(--accent-jade)' : 'var(--text-dim)'};
              font-weight:600;
            ">${unlocked ? '完成' : `${currentVal}/${m.target}`}</span>
            <span style="
              font-size:0.8rem;
              color:var(--text-dim);
            ">${progressPct}%</span>
          </div>
          <div style="
            width:100%; height:6px;
            background:var(--bg-secondary);
            border-radius:3px;
            overflow:hidden;
          ">
            <div style="
              width:${progressPct}%;
              height:100%;
              background:${unlocked
                ? 'linear-gradient(90deg,var(--accent-gold),#f0c040)'
                : 'var(--accent-jade)'};
              border-radius:3px;
              transition:width 0.6s ease-out;
            "></div>
          </div>
        </div>
      </div>`;
  }).join('');

  // Overall progress bar
  const overallPct = totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes trophy-card-in {
      from { opacity:0; transform:translateY(16px); }
      to { opacity:1; transform:translateY(0); }
    }
    @keyframes trophy-shimmer {
      0%   { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    .trophy-grid {
      display:grid;
      grid-template-columns:repeat(2, 1fr);
      gap:12px;
      padding:0 20px 40px;
      width:100%;
    }
    @media (max-width: 480px) {
      .trophy-grid {
        grid-template-columns:1fr;
      }
    }
    .trophy-count-badge {
      background: linear-gradient(
        90deg,
        var(--accent-gold) 0%,
        #fff5c0 25%,
        var(--accent-gold) 50%,
        #fff5c0 75%,
        var(--accent-gold) 100%
      );
      background-size: 200% auto;
      -webkit-background-clip: text;
      -webkit-text-fill-color: transparent;
      background-clip: text;
      animation: trophy-shimmer 3s linear infinite;
    }
  `;
  div.appendChild(style);

  div.innerHTML += `
    <div style="width:100%;padding:20px 20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0 0 4px;font-size:1.5rem;">成就殿堂</h2>
          <div style="font-size:0.9rem;color:var(--text-secondary);">记录你的荣耀征程</div>
        </div>
        <button class="btn" id="btn-back-trophy">返回</button>
      </div>

      <div style="
        background:var(--bg-card);
        border:1px solid var(--bg-secondary);
        border-radius:10px;
        padding:16px 20px;
        margin-bottom:20px;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:1.1rem;font-weight:700;">
            <span class="trophy-count-badge" style="font-size:1.3rem;">${unlockedCount}/${totalCount}</span>
            <span style="color:var(--text-secondary);font-size:0.95rem;margin-left:6px;">已解锁</span>
          </span>
          <span style="font-size:0.9rem;color:var(--text-dim);">${overallPct}%</span>
        </div>
        <div style="
          width:100%; height:8px;
          background:var(--bg-secondary);
          border-radius:4px;
          overflow:hidden;
        ">
          <div style="
            width:${overallPct}%;
            height:100%;
            background:linear-gradient(90deg,var(--accent-gold),#f0c040);
            border-radius:4px;
            transition:width 0.8s ease-out;
          "></div>
        </div>
        ${unlockedCount === totalCount ? `
          <div style="text-align:center;margin-top:8px;font-size:0.95rem;color:var(--accent-gold);font-weight:700;">
            全部成就已解锁！你是真正的文字大侠！
          </div>
        ` : `
          <div style="text-align:center;margin-top:8px;font-size:0.85rem;color:var(--text-dim);">
            继续冒险，解锁更多成就
          </div>
        `}
      </div>
    </div>

    <div class="trophy-grid">
      ${cardsHTML}
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back-trophy').addEventListener('click', () => {
      playSound('click');
      showScreen('chapter-map');
    });
  }, 0);

  return div;
}

registerScreen('trophy-room', renderTrophyRoom);
