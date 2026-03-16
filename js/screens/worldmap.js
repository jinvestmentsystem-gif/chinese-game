// js/screens/worldmap.js — Visual path-based world map
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { SPRITES } from '../sprites.js';
import { playMusic, setMusicIntensity } from '../audio.js';

// ── Chapter / Era Data ────────────────────────────────────────────────────────
const CHAPTERS = [
  {
    id: 1,
    era: '先秦',
    eraEn: 'Pre-Qin',
    name: '文字起源',
    subtitle: '仓颉之影正在从源头毁灭文字……',
    boss: '仓颉之影',
    bossTitle: 'Shadow of Cangjie',
    quests: 4,
    unlocked: true,
    icon: '𝌕',           // trigram-ish oracle bone feel
    iconFallback: '甲',
    color: '#c17f3c',    // bronze
    colorDim: 'rgba(193,127,60,0.15)',
    cssVar: '#c17f3c',
    shape: 'pagoda',
  },
  {
    id: 2,
    era: '汉代',
    eraEn: 'Han Dynasty',
    name: '史记风云',
    subtitle: '司马迁的历史正在被篡改……',
    boss: '墨吏',
    bossTitle: 'Ink Official',
    quests: 4,
    unlocked: false,
    icon: '漢',
    iconFallback: '漢',
    color: '#d63031',    // Han red
    colorDim: 'rgba(214,48,49,0.15)',
    cssVar: '#d63031',
    shape: 'fortress',
  },
  {
    id: 3,
    era: '唐代',
    eraEn: 'Tang Dynasty',
    name: '诗词盛世',
    subtitle: '长安城的诗歌正在碎裂……',
    boss: '诗魔',
    bossTitle: 'Poetry Demon',
    quests: 4,
    unlocked: false,
    icon: '唐',
    iconFallback: '唐',
    color: '#d4a017',    // gold
    colorDim: 'rgba(212,160,23,0.15)',
    cssVar: '#d4a017',
    shape: 'temple',
  },
  {
    id: 4,
    era: '宋代',
    eraEn: 'Song Dynasty',
    name: '词赋纵横',
    subtitle: '词中的情感正在被吞噬……',
    boss: '词煞',
    bossTitle: 'Ci Fiend',
    quests: 4,
    unlocked: false,
    icon: '宋',
    iconFallback: '宋',
    color: '#2ecc8a',    // jade
    colorDim: 'rgba(46,204,138,0.15)',
    cssVar: '#2ecc8a',
    shape: 'pagoda',
  },
  {
    id: 5,
    era: '近现代',
    eraEn: 'Modern Era',
    name: '墨暗之源',
    subtitle: '一切的终结……或者新的开始',
    boss: '墨暗之主',
    bossTitle: 'Lord of Ink Darkness',
    quests: 5,
    unlocked: false,
    icon: '暗',
    iconFallback: '暗',
    color: '#8e44ad',    // purple
    colorDim: 'rgba(142,68,173,0.15)',
    cssVar: '#8e44ad',
    shape: 'void',
  },
];

// ── Era Icon SVGs (CSS-art style structures) ───────────────────────────────────
function buildEraIcon(ch) {
  // Each icon is a mini CSS-art structure matching the era
  switch (ch.shape) {
    case 'pagoda':
      return `<svg viewBox="0 0 60 60" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
        <polygon points="30,4 48,20 12,20" fill="${ch.color}" opacity="0.85"/>
        <rect x="16" y="20" width="28" height="6" rx="1" fill="${ch.color}" opacity="0.75"/>
        <polygon points="30,26 46,40 14,40" fill="${ch.color}" opacity="0.7"/>
        <rect x="18" y="40" width="24" height="5" rx="1" fill="${ch.color}" opacity="0.65"/>
        <rect x="22" y="45" width="16" height="10" rx="1" fill="${ch.color}" opacity="0.6"/>
        <line x1="30" y1="0" x2="30" y2="4" stroke="${ch.color}" stroke-width="2"/>
        <circle cx="30" cy="1" r="2" fill="${ch.color}"/>
      </svg>`;
    case 'fortress':
      return `<svg viewBox="0 0 60 60" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
        <rect x="8" y="22" width="44" height="32" rx="2" fill="${ch.color}" opacity="0.7"/>
        <rect x="8" y="16" width="8" height="12" rx="1" fill="${ch.color}" opacity="0.85"/>
        <rect x="26" y="12" width="8" height="16" rx="1" fill="${ch.color}" opacity="0.9"/>
        <rect x="44" y="16" width="8" height="12" rx="1" fill="${ch.color}" opacity="0.85"/>
        <rect x="20" y="36" width="20" height="18" rx="1" fill="rgba(0,0,0,0.4)"/>
        <rect x="14" y="22" width="4" height="8" rx="1" fill="rgba(0,0,0,0.3)"/>
        <rect x="42" y="22" width="4" height="8" rx="1" fill="rgba(0,0,0,0.3)"/>
      </svg>`;
    case 'temple':
      return `<svg viewBox="0 0 60 60" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
        <polygon points="30,6 54,28 6,28" fill="${ch.color}" opacity="0.8"/>
        <rect x="10" y="28" width="40" height="4" rx="1" fill="${ch.color}" opacity="0.9"/>
        <rect x="12" y="32" width="8" height="22" rx="1" fill="${ch.color}" opacity="0.65"/>
        <rect x="26" y="32" width="8" height="22" rx="1" fill="${ch.color}" opacity="0.65"/>
        <rect x="40" y="32" width="8" height="22" rx="1" fill="${ch.color}" opacity="0.65"/>
        <rect x="10" y="52" width="40" height="4" rx="1" fill="${ch.color}" opacity="0.8"/>
        <circle cx="30" cy="8" r="4" fill="${ch.color}" opacity="0.9"/>
      </svg>`;
    case 'void':
      return `<svg viewBox="0 0 60 60" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
        <circle cx="30" cy="30" r="24" fill="none" stroke="${ch.color}" stroke-width="2" opacity="0.6"/>
        <circle cx="30" cy="30" r="16" fill="none" stroke="${ch.color}" stroke-width="1.5" opacity="0.5"/>
        <circle cx="30" cy="30" r="9" fill="${ch.color}" opacity="0.4"/>
        <circle cx="30" cy="30" r="5" fill="${ch.color}" opacity="0.8"/>
        <line x1="30" y1="6" x2="30" y2="54" stroke="${ch.color}" stroke-width="1" opacity="0.3"/>
        <line x1="6" y1="30" x2="54" y2="30" stroke="${ch.color}" stroke-width="1" opacity="0.3"/>
        <line x1="13" y1="13" x2="47" y2="47" stroke="${ch.color}" stroke-width="1" opacity="0.2"/>
        <line x1="47" y1="13" x2="13" y2="47" stroke="${ch.color}" stroke-width="1" opacity="0.2"/>
      </svg>`;
    default:
      return `<span style="font-size:1.6rem;line-height:1;">${ch.iconFallback}</span>`;
  }
}

// ── Path Connector SVG ────────────────────────────────────────────────────────
function buildPathConnector(fromColor, toColor) {
  return `
    <div class="path-connector" aria-hidden="true">
      <svg viewBox="0 0 40 40" width="40" height="40" xmlns="http://www.w3.org/2000/svg" style="display:block;">
        <defs>
          <linearGradient id="conn_grad_${Math.random().toString(36).slice(2)}" x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stop-color="${fromColor}" stop-opacity="0.6"/>
            <stop offset="100%" stop-color="${toColor}" stop-opacity="0.4"/>
          </linearGradient>
        </defs>
        <path d="M20 0 Q14 10 18 20 Q22 30 20 40"
          stroke="${fromColor}" stroke-width="2.5" fill="none" stroke-linecap="round"
          opacity="0.5" stroke-dasharray="4 3"/>
        <circle cx="20" cy="20" r="3" fill="${fromColor}" opacity="0.3"/>
      </svg>
    </div>`;
}

// ── Landscape Silhouette Background ──────────────────────────────────────────
function buildLandscapeBg() {
  return `
    <div class="map-bg-silhouette" aria-hidden="true">
      <svg viewBox="0 0 900 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
        <!-- Mountain range silhouette -->
        <path d="M0 300 L0 180 Q50 100 120 160 Q180 80 260 130 Q320 50 400 110
                 Q460 30 540 100 Q610 50 680 120 Q740 70 800 130 Q850 90 900 150 L900 300 Z"
          fill="rgba(30,20,60,0.8)"/>
        <!-- Foreground hills -->
        <path d="M0 300 Q100 240 200 260 Q350 200 500 250 Q650 210 800 240 Q860 230 900 250 L900 300 Z"
          fill="rgba(20,10,40,0.9)"/>
        <!-- Trees (small) -->
        <polygon points="80,215 88,240 72,240" fill="rgba(20,10,40,0.95)"/>
        <polygon points="90,200 96,220 84,220" fill="rgba(20,10,40,0.95)"/>
        <polygon points="160,210 170,238 150,238" fill="rgba(20,10,40,0.95)"/>
        <polygon points="370,220 378,244 362,244" fill="rgba(20,10,40,0.95)"/>
        <polygon points="650,218 658,242 642,242" fill="rgba(20,10,40,0.95)"/>
        <polygon points="750,210 758,238 742,238" fill="rgba(20,10,40,0.95)"/>
        <!-- Moon -->
        <circle cx="820" cy="60" r="28" fill="rgba(212,160,23,0.08)"/>
        <circle cx="820" cy="60" r="22" fill="rgba(212,160,23,0.05)"/>
      </svg>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderWorldMap() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  // Play map music — find current chapter era
  const currentChapter = Object.keys(profile.chapterProgress || {}).reduce((max, k) => Math.max(max, parseInt(k)), 1);
  const eraMap = {1:'xianqin',2:'han',3:'tang',4:'song',5:'modern'};
  playMusic(eraMap[currentChapter] || 'xianqin');
  setMusicIntensity(0); // ambient for map

  // Compute unlock & progress for each chapter
  const chapters = CHAPTERS.map(ch => {
    const progress = profile.chapterProgress[ch.id] || { questsCompleted: 0 };
    const isUnlocked = ch.id === 1
      || (profile.chapterProgress[ch.id - 1]?.questsCompleted >= CHAPTERS[ch.id - 2]?.quests);
    const isCompleted = isUnlocked && progress.questsCompleted >= ch.quests;
    const isCurrent = isUnlocked && !isCompleted;
    const pct = isUnlocked ? Math.round((progress.questsCompleted / ch.quests) * 100) : 0;

    return { ...ch, progress, isUnlocked, isCompleted, isCurrent, pct };
  });

  // Player mini-avatar (tiny sprite version)
  const playerAvatarSvg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="28" height="28">
    <ellipse cx="60" cy="52" rx="17" ry="20" fill="#c8a87a"/>
    <ellipse cx="60" cy="34" rx="14" ry="12" fill="#1a1010"/>
    <path d="M35 70 Q30 95 32 120 L60 120 L88 120 Q90 95 85 70 Z" fill="#1a2540"/>
    <rect x="34" y="92" width="52" height="6" rx="2" fill="#d4a017"/>
  </svg>`;

  // Build era node HTML
  function buildNode(ch, idx) {
    let statusLabel, statusClass;
    if (ch.isCompleted) {
      statusLabel = '完成';
      statusClass = 'completed';
    } else if (ch.isCurrent) {
      statusLabel = '进行中';
      statusClass = 'active';
    } else {
      statusLabel = '未解锁';
      statusClass = 'locked';
    }

    let nodeStateClass = 'node-locked';
    if (ch.isCompleted) nodeStateClass = 'node-completed';
    else if (ch.isCurrent) nodeStateClass = 'node-active';

    const questText = ch.isUnlocked
      ? `${ch.progress.questsCompleted} / ${ch.quests} 关卡`
      : `需解锁`;

    const playerMarker = ch.isCurrent ? `
      <div class="map-player-avatar" title="当前位置">
        <div class="avatar-dot"></div>
        <span>在此</span>
      </div>` : '';

    const bossStr = ch.isUnlocked
      ? `<span style="color:rgba(255,255,255,0.5);font-size:0.72rem;">Boss: </span>
         <span style="color:rgba(255,100,100,0.85);font-size:0.78rem;font-weight:700;">${ch.boss}</span>`
      : `<span style="color:rgba(255,255,255,0.25);font-size:0.75rem;">??? Boss ???</span>`;

    return `
      <div
        class="era-node ${nodeStateClass} ${ch.isUnlocked ? 'clickable' : ''}"
        data-chapter="${ch.id}"
        style="--node-color: ${ch.color};"
        role="${ch.isUnlocked ? 'button' : 'presentation'}"
        tabindex="${ch.isUnlocked ? '0' : '-1'}"
        aria-label="${ch.isUnlocked ? `进入${ch.era}：${ch.name}` : `${ch.era}尚未解锁`}"
      >
        <!-- Left: era icon -->
        <div class="era-icon" aria-hidden="true">
          ${buildEraIcon(ch)}
        </div>

        <!-- Center: info -->
        <div class="era-info">
          <div class="era-tag">第 ${ch.id} 章 · ${ch.era}</div>
          <div class="era-title">${ch.name}</div>
          <div class="era-subtitle">${ch.isUnlocked ? ch.subtitle : '完成上一章以解锁'}</div>

          ${ch.isUnlocked ? `
            <div class="era-progress-bar">
              <div class="era-progress-fill" style="width:${ch.pct}%;"></div>
            </div>
            <div class="era-progress-text">${questText}</div>
          ` : `
            <div class="era-progress-text" style="color:rgba(255,255,255,0.25);">🔒 ${questText}</div>
          `}

          <div style="margin-top:6px;">${bossStr}</div>
        </div>

        <!-- Right: badge + player marker -->
        <div class="era-badge">
          <div class="era-chapter-num">CH.${ch.id}</div>
          <div class="era-status-badge ${statusClass}">${statusLabel}</div>
          ${playerMarker}
        </div>

        <!-- Completed star -->
        ${ch.isCompleted ? `
          <div style="position:absolute;top:10px;right:12px;font-size:1.1rem;opacity:0.8;" aria-label="已完成">★</div>
        ` : ''}
      </div>`;
  }

  // Calculate overall progress
  const totalQuests = CHAPTERS.reduce((sum, ch) => sum + ch.quests, 0);
  const completedQuests = CHAPTERS.reduce((sum, ch) => {
    const prog = profile.chapterProgress[ch.id];
    return sum + (prog?.questsCompleted || 0);
  }, 0);
  const overallPercent = Math.round((completedQuests / totalQuests) * 100);

  // Build progress bar blocks (10 segments)
  const filledBlocks = Math.round(overallPercent / 10);
  const progressBlocks = Array.from({ length: 10 }, (_, i) =>
    `<span style="color:${i < filledBlocks ? 'var(--accent-gold)' : 'var(--bg-secondary)'};font-size:1rem;">█</span>`
  ).join('');

  // Build the nodes + connectors
  let nodesHTML = '';
  chapters.forEach((ch, idx) => {
    nodesHTML += buildNode(ch, idx);
    if (idx < chapters.length - 1) {
      nodesHTML += buildPathConnector(ch.color, chapters[idx + 1].color);
    }
  });

  div.innerHTML = `
    ${buildLandscapeBg()}

    <div class="worldmap-container screen-enter">
      <!-- ── Top bar ── -->
      <div class="top-bar">
        <div class="player-badge">
          <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid rgba(212,160,23,0.5);flex-shrink:0;">
            ${playerAvatarSvg}
          </div>
          <div>
            <div class="name">${profile.name}</div>
            <div style="font-size:0.75rem;color:var(--text-secondary);">
              ${profile.tier === 'grade7' ? '七年级' : '三年级'}
            </div>
          </div>
          <div class="level">Lv.${profile.level}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-left:4px;">
            <div style="width:8px;height:8px;background:var(--jade);border-radius:50%;box-shadow:var(--shadow-jade);"></div>
            <span style="font-size:0.8rem;color:var(--jade);">${profile.wenli}/${profile.maxWenli} 文力</span>
          </div>
        </div>

        <div style="text-align:center;">
          <div style="font-size:0.75rem;color:var(--text-dim);letter-spacing:0.1em;text-transform:uppercase;">征途</div>
          <div style="font-size:1rem;font-weight:700;color:var(--gold);text-shadow:var(--shadow-gold);">文字侠</div>
        </div>

        <div class="nav-buttons">
          <button class="btn btn-sm" id="btn-inventory" title="打开背包">背包</button>
          <button class="btn btn-sm" id="btn-chengyu" title="查看成语">成语</button>
          <button class="btn btn-sm" id="btn-back" title="返回主菜单">返回</button>
        </div>
      </div>

      <!-- ── Overall progress bar ── -->
      <div style="
        margin:12px 20px 0;
        background:rgba(0,0,0,0.3);
        border:1px solid rgba(212,160,23,0.2);
        border-radius:10px;
        padding:10px 16px;
        display:flex; flex-direction:column; gap:4px;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:0.8rem;color:var(--text-secondary);letter-spacing:0.06em;">征途进度</span>
          <span style="font-size:0.8rem;font-weight:700;color:var(--accent-gold);">${overallPercent}%</span>
        </div>
        <div style="display:flex;align-items:center;gap:2px;letter-spacing:1px;">
          ${progressBlocks}
        </div>
        <div style="font-size:0.75rem;color:var(--text-secondary);">已完成 ${completedQuests} / ${totalQuests} 关卡</div>
      </div>

      <!-- ── Map heading ── -->
      <div style="text-align:center; padding: 16px 20px 12px;">
        <h2 style="display:inline-block;">选择章节</h2>
        <p style="color:var(--text-secondary);font-size:0.88rem;margin-top:8px;letter-spacing:0.04em;">
          踏上穿越历史的文字征途 · 击败每个时代的墨暗之主
        </p>
      </div>

      <!-- ── Path nodes ── -->
      <div class="worldmap-path" id="worldmap-path">
        ${nodesHTML}
      </div>

      <!-- ── Bottom padding ── -->
      <div style="height: 60px;"></div>
    </div>
  `;

  // ── Event listeners ──────────────────────────────────────────────────────
  setTimeout(() => {
    // Chapter nodes
    div.querySelectorAll('.era-node.clickable').forEach(node => {
      const chapterId = parseInt(node.dataset.chapter);

      const activate = () => {
        showScreen('quest', { chapterId });
      };

      node.addEventListener('click', activate);
      node.addEventListener('keydown', e => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          activate();
        }
      });

      // Hover ripple effect
      node.addEventListener('mouseenter', () => {
        node.style.transition = 'transform 0.22s ease, box-shadow 0.25s ease';
      });
    });

    // Nav buttons
    div.querySelector('#btn-back')?.addEventListener('click', () => showScreen('title'));
    div.querySelector('#btn-inventory')?.addEventListener('click', () => showScreen('inventory'));
    div.querySelector('#btn-chengyu')?.addEventListener('click', () => showScreen('chengyu'));

    // Scroll to current/active chapter
    const activeCh = div.querySelector('.era-node.node-active');
    if (activeCh) {
      // Small delay so layout settles
      requestAnimationFrame(() => {
        activeCh.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }
  }, 0);

  return div;
}

registerScreen('worldmap', renderWorldMap);
