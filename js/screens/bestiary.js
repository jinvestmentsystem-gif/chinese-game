// js/screens/bestiary.js — Monster collection book / enemy encyclopedia
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { SPRITES } from '../sprites.js';

// ─── Bestiary entries: all enemies and bosses ────────────────────────────────
const BESTIARY_ENTRIES = [
  { key: 'enemy_moling', name: '墨灵', type: 'enemy', lore: '由散落的墨迹汇聚而成的低级墨暗生物，游荡于文字世界的阴暗角落。' },
  { key: 'enemy_guard', name: '暗字兵', type: 'enemy', lore: '被墨暗之力污染的文字士兵，曾是守护文字的卫士。' },
  { key: 'enemy_shadow', name: '墨影卫', type: 'enemy', lore: '潜伏在影子中的刺客，速度极快，难以捉摸。' },
  { key: 'boss_cangjie', name: '仓颉之影', type: 'boss', lore: '传说中创造文字的仓颉被墨暗之力腐蚀后的残影。' },
  { key: 'boss_moli', name: '墨吏', type: 'boss', lore: '一位被黑暗吞噬的汉代官员，操控着紫色墨汁的力量。' },
  { key: 'boss_shimo', name: '诗魔', type: 'boss', lore: '唐代诗篇中诞生的恶魔，以扭曲诗词的力量为食。' },
  { key: 'boss_cisha', name: '词煞', type: 'boss', lore: '宋词世界的守护者被腐蚀后的形态，翡翠铠甲下藏着破碎的心。' },
  { key: 'boss_final', name: '墨暗之主', type: 'boss', lore: '一切墨暗之力的源头，企图吞噬五千年的文字文明。' },
];

const TOTAL_ENTRIES = BESTIARY_ENTRIES.length;

function renderBestiary() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  if (!profile) {
    div.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">无档案数据</div>';
    return div;
  }

  const bestiary = profile.bestiary || {};
  const discoveredCount = BESTIARY_ENTRIES.filter(e => bestiary[e.key]).length;

  // Build monster cards
  const cardsHTML = BESTIARY_ENTRIES.map((entry, i) => {
    const data = bestiary[entry.key];
    const encountered = !!data;
    const defeats = data ? (data.defeated || 0) : 0;
    const isBoss = entry.type === 'boss';
    const typeBadgeColor = isBoss ? 'var(--accent-red)' : 'var(--accent-jade)';
    const typeBadgeBg = isBoss ? 'rgba(214,48,49,0.15)' : 'rgba(46,204,138,0.15)';
    const typeLabel = isBoss ? 'BOSS' : '普通';

    // Get sprite HTML
    const spriteHTML = SPRITES[entry.key] || '';

    return `
      <div class="bestiary-card" style="
        background:var(--bg-card);
        border:2px solid ${encountered ? (isBoss ? 'var(--accent-red)' : 'var(--bg-secondary)') : 'rgba(255,255,255,0.05)'};
        border-radius:12px;
        padding:16px;
        display:flex;
        flex-direction:column;
        gap:10px;
        position:relative;
        overflow:hidden;
        opacity:0;
        transform:translateY(16px);
        animation:bestiary-card-in 0.4s ease-out ${i * 0.08}s forwards;
        ${encountered && isBoss ? 'box-shadow:0 0 12px rgba(214,48,49,0.12);' : ''}
      ">
        <div style="
          position:absolute; top:8px; right:8px;
          background:${typeBadgeBg};
          color:${typeBadgeColor};
          font-size:0.72rem;
          font-weight:700;
          padding:2px 8px;
          border-radius:4px;
          letter-spacing:0.06em;
        ">${typeLabel}</div>

        <div style="display:flex;gap:12px;align-items:flex-start;">
          <div style="
            width:80px; height:100px;
            border-radius:8px;
            overflow:hidden;
            flex-shrink:0;
            background:${encountered ? 'var(--bg-secondary)' : '#0a0b18'};
            display:flex; align-items:center; justify-content:center;
            border:1px solid ${encountered ? 'rgba(255,255,255,0.08)' : 'rgba(255,255,255,0.03)'};
          ">
            ${encountered
              ? `<div style="width:100%;height:100%;display:flex;align-items:center;justify-content:center;">${spriteHTML}</div>`
              : `<div style="
                  width:60px; height:75px;
                  background:rgba(255,255,255,0.04);
                  border-radius:50%;
                  display:flex; align-items:center; justify-content:center;
                  font-size:2rem;
                  color:rgba(255,255,255,0.08);
                  filter:blur(1px);
                ">?</div>`
            }
          </div>

          <div style="flex:1;min-width:0;">
            <div style="
              font-size:1.1rem;
              font-weight:700;
              color:${encountered ? (isBoss ? '#e74c3c' : 'var(--text-primary)') : 'var(--text-dim)'};
              margin-bottom:4px;
            ">${encountered ? entry.name : '???'}</div>

            <div style="
              font-size:0.85rem;
              line-height:1.5;
              color:${encountered ? 'var(--text-secondary)' : 'var(--text-dim)'};
              ${!encountered ? 'font-style:italic;' : ''}
            ">${encountered ? entry.lore : '未遇见'}</div>
          </div>
        </div>

        ${encountered ? `
          <div style="
            display:flex; align-items:center; gap:12px;
            padding:8px 12px;
            background:var(--bg-secondary);
            border-radius:6px;
            font-size:0.88rem;
          ">
            <span style="color:var(--text-secondary);">击败次数</span>
            <span style="
              color:${defeats > 0 ? 'var(--accent-gold)' : 'var(--text-dim)'};
              font-weight:700;
              font-size:1rem;
            ">${defeats} 次</span>
            ${data.firstSeen ? `
              <span style="color:var(--text-dim);font-size:0.78rem;margin-left:auto;">
                首次遇见: ${new Date(data.firstSeen).toLocaleDateString('zh-CN')}
              </span>
            ` : ''}
          </div>
        ` : `
          <div style="
            padding:8px 12px;
            background:rgba(255,255,255,0.02);
            border-radius:6px;
            text-align:center;
            font-size:0.85rem;
            color:var(--text-dim);
            border:1px dashed rgba(255,255,255,0.06);
          ">
            继续冒险来发现这个怪物
          </div>
        `}
      </div>`;
  }).join('');

  // Discovery progress
  const discoveryPct = TOTAL_ENTRIES > 0 ? Math.round((discoveredCount / TOTAL_ENTRIES) * 100) : 0;

  const style = document.createElement('style');
  style.textContent = `
    @keyframes bestiary-card-in {
      from { opacity:0; transform:translateY(16px); }
      to { opacity:1; transform:translateY(0); }
    }
    @keyframes bestiary-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(212,160,23,0.2); }
      50% { box-shadow: 0 0 16px rgba(212,160,23,0.4); }
    }
    .bestiary-grid {
      display:grid;
      grid-template-columns:1fr;
      gap:12px;
      padding:0 20px 40px;
      width:100%;
      max-width:600px;
      margin:0 auto;
    }
    .bestiary-card:hover {
      transform:translateY(-2px) !important;
      transition:transform 0.2s ease;
    }
  `;
  div.appendChild(style);

  // Stat badges for total defeats and boss defeats
  const totalDefeats = Object.values(bestiary).reduce((sum, b) => sum + (b.defeated || 0), 0);
  const bossDefeats = BESTIARY_ENTRIES
    .filter(e => e.type === 'boss' && bestiary[e.key])
    .reduce((sum, e) => sum + (bestiary[e.key].defeated || 0), 0);

  div.innerHTML += `
    <div style="width:100%;padding:20px 20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0 0 4px;font-size:1.5rem;">妖魔图鉴</h2>
          <div style="font-size:0.9rem;color:var(--text-secondary);">记录你遭遇过的敌人</div>
        </div>
        <button class="btn" id="btn-back-bestiary">返回</button>
      </div>

      <div style="
        background:var(--bg-card);
        border:1px solid var(--bg-secondary);
        border-radius:10px;
        padding:16px 20px;
        margin-bottom:16px;
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;">
          <span style="font-size:1.05rem;font-weight:700;">
            <span style="color:var(--accent-gold);font-size:1.2rem;">${discoveredCount}/${TOTAL_ENTRIES}</span>
            <span style="color:var(--text-secondary);font-size:0.9rem;margin-left:6px;">已发现</span>
          </span>
          <span style="font-size:0.9rem;color:var(--text-dim);">${discoveryPct}%</span>
        </div>
        <div style="
          width:100%; height:8px;
          background:var(--bg-secondary);
          border-radius:4px;
          overflow:hidden;
        ">
          <div style="
            width:${discoveryPct}%;
            height:100%;
            background:linear-gradient(90deg,var(--accent-jade),var(--accent-gold));
            border-radius:4px;
            transition:width 0.8s ease-out;
          "></div>
        </div>
      </div>

      <div style="
        display:flex; gap:10px; flex-wrap:wrap;
        margin-bottom:16px;
        justify-content:center;
      ">
        <div style="
          background:var(--bg-card);
          border:1px solid var(--bg-secondary);
          border-radius:8px;
          padding:10px 16px;
          text-align:center;
          min-width:120px;
        ">
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:2px;">总击败数</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--accent-gold);">${totalDefeats}</div>
        </div>
        <div style="
          background:var(--bg-card);
          border:1px solid var(--bg-secondary);
          border-radius:8px;
          padding:10px 16px;
          text-align:center;
          min-width:120px;
        ">
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:2px;">BOSS击败数</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--accent-red);">${bossDefeats}</div>
        </div>
        <div style="
          background:var(--bg-card);
          border:1px solid var(--bg-secondary);
          border-radius:8px;
          padding:10px 16px;
          text-align:center;
          min-width:120px;
        ">
          <div style="font-size:0.78rem;color:var(--text-dim);margin-bottom:2px;">种类发现</div>
          <div style="font-size:1.2rem;font-weight:700;color:var(--accent-jade);">${discoveredCount} 种</div>
        </div>
      </div>
    </div>

    <div class="bestiary-grid">
      ${cardsHTML}
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back-bestiary').addEventListener('click', () => {
      playSound('click');
      showScreen('chapter-map');
    });
  }, 0);

  return div;
}

registerScreen('bestiary', renderBestiary);
