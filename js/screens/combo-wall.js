// js/screens/combo-wall.js — Personal combo records display
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';

// ─── Chapter era colors and labels ──────────────────────────────────────────
const CHAPTER_META = {
  1: { name: '先秦', color: '#8b6914', gradient: 'linear-gradient(135deg,#8b6914,#c8a830)' },
  2: { name: '汉代', color: '#6b2fa0', gradient: 'linear-gradient(135deg,#6b2fa0,#9b59b6)' },
  3: { name: '唐代', color: '#d4a017', gradient: 'linear-gradient(135deg,#d4a017,#f0c040)' },
  4: { name: '宋代', color: '#2ecc8a', gradient: 'linear-gradient(135deg,#0e7a45,#2ecc8a)' },
  5: { name: '近现代', color: '#3498db', gradient: 'linear-gradient(135deg,#2980b9,#3498db)' },
};

function renderComboWall() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  if (!profile) {
    div.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">无档案数据</div>';
    return div;
  }

  const comboRecords = profile.comboRecords || { bestOverall: 0, bestPerChapter: {}, history: [] };
  const bestOverall = comboRecords.bestOverall || 0;
  const bestPerChapter = comboRecords.bestPerChapter || {};
  const history = comboRecords.history || [];
  const recentHistory = history.slice(-10).reverse(); // Most recent first

  // Calculate motivational gap
  const nextMilestone = bestOverall < 3 ? 3 : bestOverall < 5 ? 5 : bestOverall < 10 ? 10 :
    bestOverall < 15 ? 15 : bestOverall < 20 ? 20 : bestOverall < 30 ? 30 : bestOverall < 50 ? 50 : 0;
  const gap = nextMilestone > 0 ? nextMilestone - bestOverall : 0;

  // Chapter cards HTML
  const chapterCardsHTML = [1, 2, 3, 4, 5].map((chId, i) => {
    const meta = CHAPTER_META[chId];
    const chapterBest = bestPerChapter[chId] || 0;
    const hasRecord = chapterBest > 0;
    const barWidth = bestOverall > 0 ? Math.round((chapterBest / bestOverall) * 100) : 0;

    return `
      <div style="
        background:var(--bg-card);
        border:1px solid ${hasRecord ? 'rgba(255,255,255,0.1)' : 'var(--bg-secondary)'};
        border-radius:10px;
        padding:14px 16px;
        display:flex;
        flex-direction:column;
        gap:8px;
        opacity:0;
        transform:translateY(12px);
        animation:combo-card-in 0.4s ease-out ${0.3 + i * 0.1}s forwards;
        position:relative;
        overflow:hidden;
      ">
        <div style="
          position:absolute; top:0; left:0; right:0; height:3px;
          background:${meta.gradient};
          opacity:${hasRecord ? '1' : '0.3'};
        "></div>

        <div style="display:flex;justify-content:space-between;align-items:center;">
          <div style="display:flex;align-items:center;gap:8px;">
            <span style="
              display:inline-block;
              width:10px; height:10px;
              border-radius:50%;
              background:${meta.color};
              ${hasRecord ? `box-shadow:0 0 6px ${meta.color};` : ''}
            "></span>
            <span style="
              font-size:1rem;
              font-weight:700;
              color:${hasRecord ? 'var(--text-primary)' : 'var(--text-dim)'};
            ">第${chId}章 · ${meta.name}</span>
          </div>
          <span style="
            font-size:1.4rem;
            font-weight:800;
            color:${hasRecord ? meta.color : 'var(--text-dim)'};
            ${hasRecord ? `text-shadow:0 0 8px ${meta.color}40;` : ''}
          ">${hasRecord ? chapterBest + 'x' : '—'}</span>
        </div>

        <div style="
          width:100%; height:6px;
          background:var(--bg-secondary);
          border-radius:3px;
          overflow:hidden;
        ">
          <div style="
            width:${barWidth}%;
            height:100%;
            background:${meta.gradient};
            border-radius:3px;
            transition:width 0.8s ease-out;
          "></div>
        </div>
      </div>`;
  }).join('');

  // Recent history list
  const historyHTML = recentHistory.length > 0
    ? recentHistory.map((record, i) => {
        const chMeta = CHAPTER_META[record.chapter] || { name: '?', color: '#888' };
        const dateStr = record.date
          ? new Date(record.date).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric' })
          : '—';
        const isNew = i === 0 && record.combo === bestOverall && bestOverall > 0;

        return `
          <div style="
            display:flex;
            align-items:center;
            gap:12px;
            padding:10px 14px;
            background:${isNew ? 'rgba(212,160,23,0.08)' : 'var(--bg-card)'};
            border:1px solid ${isNew ? 'rgba(212,160,23,0.25)' : 'var(--bg-secondary)'};
            border-radius:8px;
            opacity:0;
            animation:combo-history-in 0.3s ease-out ${0.8 + i * 0.06}s forwards;
          ">
            <div style="
              width:8px; height:8px;
              border-radius:50%;
              background:${chMeta.color};
              flex-shrink:0;
            "></div>
            <div style="flex:1;min-width:0;">
              <span style="font-size:0.9rem;color:var(--text-secondary);">第${record.chapter || '?'}章</span>
              <span style="font-size:0.8rem;color:var(--text-dim);margin-left:6px;">${chMeta.name}</span>
            </div>
            <span style="
              font-size:1.1rem;
              font-weight:700;
              color:${record.combo >= bestOverall && bestOverall > 0 ? 'var(--accent-gold)' : 'var(--text-primary)'};
              min-width:48px;
              text-align:right;
            ">${record.combo}x</span>
            <span style="
              font-size:0.78rem;
              color:var(--text-dim);
              min-width:52px;
              text-align:right;
            ">${dateStr}</span>
            ${isNew ? '<span style="font-size:0.72rem;color:var(--accent-gold);font-weight:700;">NEW</span>' : ''}
          </div>`;
      }).join('')
    : `<div style="
        text-align:center;
        padding:20px;
        color:var(--text-dim);
        font-size:0.95rem;
        border:1px dashed rgba(255,255,255,0.06);
        border-radius:8px;
      ">还没有连击记录，去战斗吧！</div>`;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes combo-card-in {
      from { opacity:0; transform:translateY(12px); }
      to { opacity:1; transform:translateY(0); }
    }
    @keyframes combo-history-in {
      from { opacity:0; transform:translateX(-12px); }
      to { opacity:1; transform:translateX(0); }
    }
    @keyframes combo-hero-glow {
      0%, 100% { text-shadow: 0 0 20px rgba(212,160,23,0.6), 0 0 40px rgba(212,160,23,0.2); }
      50% { text-shadow: 0 0 30px rgba(212,160,23,0.8), 0 0 60px rgba(212,160,23,0.4); }
    }
    @keyframes combo-hero-count {
      0% { transform: scale(0.5); opacity: 0; }
      60% { transform: scale(1.1); }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes combo-ring-fill {
      from { stroke-dashoffset: 283; }
    }
  `;
  div.appendChild(style);

  // Hero ring progress (ratio of best to next milestone)
  const ringPct = nextMilestone > 0 ? Math.round((bestOverall / nextMilestone) * 100) : 100;
  const ringDashoffset = Math.round(283 * (1 - ringPct / 100));

  div.innerHTML += `
    <div style="width:100%;max-width:560px;margin:0 auto;padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0 0 4px;font-size:1.5rem;">连击之墙</h2>
          <div style="font-size:0.9rem;color:var(--text-secondary);">你的连击记录殿堂</div>
        </div>
        <button class="btn" id="btn-back-combo">返回</button>
      </div>

      <!-- Hero section: best overall combo -->
      <div style="
        background:var(--bg-card);
        border:2px solid var(--accent-gold);
        border-radius:16px;
        padding:28px 24px;
        text-align:center;
        margin-bottom:20px;
        position:relative;
        overflow:hidden;
        box-shadow:0 0 24px rgba(212,160,23,0.15);
      ">
        <div style="
          position:absolute; inset:0;
          background:radial-gradient(circle at 50% 50%, rgba(212,160,23,0.06) 0%, transparent 70%);
          pointer-events:none;
        "></div>

        <div style="font-size:0.9rem;letter-spacing:0.12em;color:var(--accent-gold);opacity:0.7;margin-bottom:12px;">
          最高连击记录
        </div>

        <div style="position:relative;width:140px;height:140px;margin:0 auto 16px;">
          <svg width="140" height="140" viewBox="0 0 100 100" style="transform:rotate(-90deg);position:absolute;inset:0;">
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-secondary)" stroke-width="4"/>
            <circle cx="50" cy="50" r="45" fill="none" stroke="var(--accent-gold)" stroke-width="4"
              stroke-dasharray="283" stroke-dashoffset="${ringDashoffset}" stroke-linecap="round"
              style="animation:combo-ring-fill 1.5s ease-out forwards; transition:stroke-dashoffset 0.8s;"/>
          </svg>
          <div style="
            position:absolute; top:50%; left:50%;
            transform:translate(-50%,-50%);
            font-size:3.2rem;
            font-weight:900;
            color:var(--accent-gold);
            animation:combo-hero-count 0.8s cubic-bezier(0.175,0.885,0.32,1.275) forwards,
                     combo-hero-glow 2s ease-in-out infinite 0.8s;
            line-height:1;
          ">${bestOverall}<span style="font-size:1.4rem;opacity:0.7;">x</span></div>
        </div>

        ${gap > 0 ? `
          <div style="
            font-size:0.95rem;
            color:var(--text-secondary);
            padding:8px 16px;
            background:rgba(212,160,23,0.06);
            border:1px dashed rgba(212,160,23,0.2);
            border-radius:8px;
            display:inline-block;
          ">
            距离 <span style="color:var(--accent-gold);font-weight:700;">${nextMilestone}x</span> 记录还差
            <span style="color:var(--accent-gold);font-weight:700;">${gap}</span> 连击
          </div>
        ` : bestOverall > 0 ? `
          <div style="
            font-size:1rem;
            color:var(--accent-gold);
            font-weight:700;
          ">
            连击传奇！继续突破自我！
          </div>
        ` : `
          <div style="
            font-size:0.95rem;
            color:var(--text-dim);
          ">
            开始你的连击之旅吧
          </div>
        `}
      </div>

      <!-- Per-chapter best records -->
      <div style="margin-bottom:20px;">
        <div style="
          font-size:0.95rem;
          font-weight:700;
          color:var(--text-secondary);
          letter-spacing:0.06em;
          margin-bottom:10px;
          padding-left:4px;
        ">各章节最佳连击</div>
        <div style="display:flex;flex-direction:column;gap:8px;">
          ${chapterCardsHTML}
        </div>
      </div>

      <!-- Recent history -->
      <div style="margin-bottom:20px;">
        <div style="
          font-size:0.95rem;
          font-weight:700;
          color:var(--text-secondary);
          letter-spacing:0.06em;
          margin-bottom:10px;
          padding-left:4px;
        ">最近记录</div>
        <div style="display:flex;flex-direction:column;gap:6px;">
          ${historyHTML}
        </div>
      </div>

      <!-- Stats summary row -->
      <div style="
        display:flex; gap:10px; flex-wrap:wrap;
        justify-content:center;
        margin-bottom:20px;
      ">
        <div style="
          background:var(--bg-card);
          border:1px solid var(--bg-secondary);
          border-radius:8px;
          padding:10px 16px;
          text-align:center;
          min-width:100px;
          flex:1;
        ">
          <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:2px;">总记录数</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--text-primary);">${history.length}</div>
        </div>
        <div style="
          background:var(--bg-card);
          border:1px solid var(--bg-secondary);
          border-radius:8px;
          padding:10px 16px;
          text-align:center;
          min-width:100px;
          flex:1;
        ">
          <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:2px;">平均连击</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--accent-jade);">
            ${history.length > 0 ? (history.reduce((s, r) => s + (r.combo || 0), 0) / history.length).toFixed(1) : '0'}x
          </div>
        </div>
        <div style="
          background:var(--bg-card);
          border:1px solid var(--bg-secondary);
          border-radius:8px;
          padding:10px 16px;
          text-align:center;
          min-width:100px;
          flex:1;
        ">
          <div style="font-size:0.75rem;color:var(--text-dim);margin-bottom:2px;">5x+次数</div>
          <div style="font-size:1.1rem;font-weight:700;color:var(--accent-gold);">
            ${history.filter(r => (r.combo || 0) >= 5).length}
          </div>
        </div>
      </div>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back-combo').addEventListener('click', () => {
      playSound('click');
      showScreen('chapter-map');
    });
  }, 0);

  return div;
}

registerScreen('combo-wall', renderComboWall);
