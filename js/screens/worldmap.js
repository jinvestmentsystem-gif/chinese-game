// js/screens/worldmap.js — Visual path-based world map
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { SPRITES, WORLDMAP_BG } from '../sprites.js';
import { playMusic, playSound, setMusicIntensity } from '../audio.js';
import { getXPProgress, getEffectiveMaxHp, checkDailyLogin } from '../progression.js';
import { showTutorial } from '../tutorial.js';
import { getReviewStats } from '../spaced-repetition.js';
import { showToast } from '../toast.js';
import { getNextGoal } from '../goals.js';
import { getVisibleFeatures, getNotificationDots, getNextUnlock } from '../nav.js';

function getGradeLabel(tier) {
  const map = { grade1: '一二年级', grade3: '三年级', grade4: '四年级', grade5: '五六年级', grade7: '七年级', grade8: '八九年级' };
  return map[tier] || tier;
}

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
    quests: 5,
    questNames: ['甲骨洞窟', '竹简山谷', '青铜殿堂', '论语古林', '仓颉神殿'],
    questIcons: ['🦴', '🎋', '🏺', '📜', '👁'],
    questHints: ['探索远古洞穴中的甲骨文', '穿越竹林寻找失落的竹简', '破解青铜器上的铭文', '在古树林中领悟圣人之言', '面对文字创造者的暗影'],
    unlocked: true,
    icon: '𝌕',
    iconFallback: '甲',
    color: '#c17f3c',
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
    quests: 5,
    questNames: ['丝绸古道', '长城烽火', '太史公书房', '未央宫廷', '墨吏殿'],
    questIcons: ['🐫', '🔥', '📖', '🏯', '⚖'],
    questHints: ['沿丝绸之路追踪墨暗的痕迹', '在长城上抵御被篡改的历史', '保护司马迁笔下的真实记载', '在皇宫中揭露阴谋', '与掌控史书的墨吏对决'],
    unlocked: false,
    icon: '漢',
    iconFallback: '漢',
    color: '#d63031',
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
    quests: 5,
    questNames: ['曲江春宴', '华清池畔', '翰林学院', '大雁塔下', '诗魔幻境'],
    questIcons: ['🌸', '♨️', '🏛', '🗼', '🌀'],
    questHints: ['在长安春宴中收集散落的诗句', '于华清池温泉解读隐藏的词意', '在翰林院中与才子比试', '登大雁塔寻找终极线索', '进入诗魔创造的幻境决战'],
    unlocked: false,
    icon: '唐',
    iconFallback: '唐',
    color: '#d4a017',
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
    quests: 5,
    questNames: ['汴京夜市', '西湖烟雨', '岳阳楼台', '清明上河', '词煞迷宫'],
    questIcons: ['🏮', '🌧', '🏔', '🎨', '🌑'],
    questHints: ['在繁华夜市中追踪词句碎片', '雨中的西湖隐藏着词人的秘密', '登岳阳楼领悟忧国情怀', '在画卷中寻找被抹去的文字', '闯入词煞的迷宫夺回词魂'],
    unlocked: false,
    icon: '宋',
    iconFallback: '宋',
    color: '#2ecc8a',
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
    questNames: ['新文化书局', '白话文广场', '鲁迅故居', '文脉裂隙', '墨暗深渊'],
    questIcons: ['📚', '📣', '🏠', '⚡', '🕳'],
    questHints: ['在书局中守护新文化的火种', '用白话文之力驱散旧暗', '在鲁迅故居找到觉醒的勇气', '文脉出现裂隙，暗影正在涌出', '深入墨暗之源进行最终决战'],
    unlocked: false,
    icon: '暗',
    iconFallback: '暗',
    color: '#8e44ad',
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

// ── Landscape Silhouette Background (with parallax layers) ───────────────────
function buildLandscapeBg() {
  // Minimal overlay — the painted bg_worldmap.webp provides the main visual
  return `
    <div class="map-bg-silhouette map-parallax-wrap" aria-hidden="true" style="opacity:0.3;">
      <div class="map-parallax-layer map-parallax-far">
        <svg viewBox="0 0 900 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
          <path d="M0 300 L0 180 Q50 100 120 160 Q180 80 260 130 Q320 50 400 110
                   Q460 30 540 100 Q610 50 680 120 Q740 70 800 130 Q850 90 900 150 L900 300 Z"
            fill="rgba(30,20,60,0.6)"/>
        </svg>
      </div>
      <div class="map-parallax-layer map-parallax-near">
        <svg viewBox="0 0 900 300" width="100%" height="100%" xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="xMidYMax meet">
          <path d="M0 300 Q100 240 200 260 Q350 200 500 250 Q650 210 800 240 Q860 230 900 250 L900 300 Z"
            fill="rgba(20,10,40,0.5)"/>
        </svg>
      </div>
    </div>`;
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderWorldMap() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  if (!profile) { showScreen('title'); return div; }

  // After first quest completion, play opening cinematic (once)
  if (!profile.openingStorySeen && profile.chapterProgress?.[1]?.questsCompleted >= 1) {
    profile.openingStorySeen = true;
    gameState.save();
    setTimeout(() => showScreen('story', { storyKey: 'opening' }), 800);
  }

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
      ? `<span style="color:rgba(255,255,255,0.5);font-size:0.9rem;">Boss: </span>
         <span style="color:rgba(255,100,100,0.85);font-size:0.92rem;font-weight:700;">${ch.boss}</span>`
      : `<span style="color:rgba(255,255,255,0.25);font-size:0.92rem;">??? Boss ???</span>`;

    // Build quest sub-nodes for expanded chapter view
    const ENCOUNTER_ICONS = { combat: '⚔', puzzle: '📖', boss: '👹', treasure: '💰', rest: '🏕' };
    const regularPatterns = [
      ['combat', 'puzzle', 'combat', 'puzzle', 'combat'],
      ['combat', 'combat', 'puzzle', 'combat', 'puzzle'],
      ['combat', 'puzzle', 'combat', 'combat', 'puzzle'],
    ];
    const bossPatterns = [
      ['combat', 'puzzle', 'combat', 'puzzle', 'boss'],
      ['combat', 'combat', 'puzzle', 'combat', 'boss'],
      ['combat', 'puzzle', 'combat', 'combat', 'boss'],
    ];

    let questNodesHTML = '';
    if (ch.isUnlocked) {
      for (let qi = 0; qi < ch.quests; qi++) {
        const qCompleted = qi < ch.progress.questsCompleted;
        const qCurrent = qi === ch.progress.questsCompleted && ch.isCurrent;
        const qLocked = qi > ch.progress.questsCompleted;
        const stars = profile.questStars?.[`${ch.id}-${qi}`] || 0;
        const isBossQ = qi === ch.quests - 1;
        const patterns = isBossQ ? bossPatterns : regularPatterns;
        const pattern = patterns[(ch.id + qi) % patterns.length];

        const encounterDots = pattern.map(type => {
          const icon = ENCOUNTER_ICONS[type] || '⚔';
          return `<span style="font-size:0.75rem;opacity:${qLocked ? '0.2' : qCompleted ? '0.9' : '0.5'};">${icon}</span>`;
        }).join('');

        const starStr = qCompleted && stars > 0
          ? `<span style="color:#d4a017;font-size:0.7rem;margin-left:4px;">${'★'.repeat(stars)}${'☆'.repeat(3-stars)}</span>`
          : '';

        const isBossQuest = qi === ch.quests - 1;
        const questLabel = qCurrent ? '← 当前' : qCompleted ? '✓' : '🔒';
        const questColor = qCurrent ? ch.color : qCompleted ? 'rgba(255,255,255,0.6)' : 'rgba(255,255,255,0.25)';
        const questName = ch.questNames?.[qi] || (isBossQuest ? 'BOSS' : `征途 ${qi + 1}`);
        const questIcon = ch.questIcons?.[qi] || (isBossQuest ? '⚔' : '•');
        const questHint = ch.questHints?.[qi] || '';
        // Gradient tint shifts per quest within chapter for visual variety
        const questTintAlpha = qCurrent ? 0.12 : qCompleted ? 0.04 : 0.01;
        const questBgTint = `rgba(${isBossQuest ? '231,76,60' : ch.color.startsWith('#') ? parseInt(ch.color.slice(1,3),16)+','+parseInt(ch.color.slice(3,5),16)+','+parseInt(ch.color.slice(5,7),16) : '255,255,255'}, ${questTintAlpha})`;

        questNodesHTML += `
          <div class="quest-subnode ${qCurrent ? 'quest-current' : ''} ${qCompleted ? 'quest-done' : ''} ${qLocked ? 'quest-locked' : ''}"
               data-chapter="${ch.id}" data-quest="${qi}"
               style="
                 display:flex; align-items:center; gap:10px; padding:8px 14px;
                 margin:3px 0 3px 42px; border-radius:10px; cursor:${qLocked ? 'default' : 'pointer'};
                 background:${questBgTint};
                 border-left:3px solid ${qCurrent ? ch.color : qCompleted ? ch.color + '55' : 'rgba(255,255,255,0.06)'};
                 transition: background 0.15s;
               ">
            <span style="font-size:1.1rem;width:24px;text-align:center;opacity:${qLocked ? '0.3' : '1'};">${questIcon}</span>
            <div style="flex:1;min-width:0;">
              <div style="font-size:0.85rem;color:${isBossQuest ? '#e74c3c' : questColor};font-weight:${qCurrent || isBossQuest ? '700' : '500'};display:flex;align-items:center;gap:6px;">
                ${questName}
                <span style="font-size:0.7rem;opacity:0.6;font-weight:400;">${questLabel}</span>
                ${starStr}
              </div>
              ${qCurrent && questHint ? `<div style="font-size:0.72rem;color:rgba(255,255,255,0.35);margin-top:1px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${questHint}</div>` : ''}
            </div>
            <span style="display:flex;gap:3px;">${encounterDots}</span>
          </div>`;
      }
    }

    return `
      <div
        class="era-node ${nodeStateClass} ${ch.isUnlocked ? 'clickable' : ''}"
        data-chapter="${ch.id}"
        style="--node-color: ${ch.color};"
        role="${ch.isUnlocked ? 'button' : 'presentation'}"
        tabindex="${ch.isUnlocked ? '0' : '-1'}"
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
      </div>
      ${questNodesHTML}`;
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

  // ── Endgame: Infinite Gauntlet (unlocked after all 5 chapters) ──
  const allChaptersComplete = chapters.every(ch => ch.isCompleted);
  const gauntletRecord = profile.gauntletRecord || 0;
  if (allChaptersComplete) {
    nodesHTML += buildPathConnector('#8e44ad', '#d4a017');
    nodesHTML += `
      <div class="era-node node-active clickable" data-chapter="gauntlet"
           style="--node-color:#d4a017; border-left-color:#d4a017; background:linear-gradient(135deg, rgba(212,160,23,0.08), rgba(142,68,173,0.08), var(--bg-glass));"
           role="button" tabindex="0" aria-label="无尽试炼 — 挑战不断升级的BOSS">
        <div class="era-icon" aria-hidden="true">
          <svg viewBox="0 0 60 60" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
            <circle cx="30" cy="30" r="24" fill="none" stroke="#d4a017" stroke-width="2" opacity="0.7"/>
            <circle cx="30" cy="30" r="16" fill="none" stroke="#d4a017" stroke-width="1.5" opacity="0.5" stroke-dasharray="4 3">
              <animateTransform attributeName="transform" type="rotate" from="0 30 30" to="360 30 30" dur="8s" repeatCount="indefinite"/>
            </circle>
            <text x="30" y="36" text-anchor="middle" fill="#d4a017" font-size="18" font-weight="900">∞</text>
          </svg>
        </div>
        <div class="era-info">
          <div class="era-tag" style="color:#d4a017;">无尽试炼 · Infinite Gauntlet</div>
          <div class="era-title" style="color:var(--accent-gold);">挑战极限</div>
          <div class="era-subtitle">不断升级的BOSS · 每3层+10%属性 · 看你能走多远</div>
          <div style="margin-top:6px;">
            <span style="color:rgba(255,255,255,0.5);font-size:0.9rem;">最高记录: </span>
            <span style="color:#d4a017;font-size:0.95rem;font-weight:700;">第 ${gauntletRecord} 层</span>
          </div>
        </div>
        <div class="era-badge">
          <div class="era-chapter-num" style="color:#d4a017;">∞</div>
          <div class="era-status-badge active" style="background:rgba(212,160,23,0.2);color:#d4a017;">挑战</div>
        </div>
      </div>`;
  }

  // --- Player stats for the stats bar ---
  const xpProgress = getXPProgress(profile);
  const effectiveMaxHp = getEffectiveMaxHp(profile);
  const hpPct = Math.round((profile.hp / effectiveMaxHp) * 100);
  const hpColor = hpPct > 60 ? 'var(--hp-green)' : hpPct > 30 ? 'var(--hp-yellow)' : 'var(--hp-red)';
  const activeTitle = profile.activeTitle || '新手文定乾坤';

  // Daily reward status check (peek only, don't claim)
  const dailyLogin = profile.dailyLogin || { lastDate: null, streak: 0 };
  const todayStr = new Date().toISOString().slice(0, 10);
  const dailyClaimed = dailyLogin.lastDate === todayStr;

  // Review stats for spaced repetition indicator
  const reviewStats = getReviewStats();

  // Determine current era accent color for the top bar
  const currentChapterData = CHAPTERS.find(ch => ch.id === currentChapter) || CHAPTERS[0];
  const eraAccent = currentChapterData.color;

  div.style.backgroundImage = `url('${WORLDMAP_BG}')`;
  div.style.backgroundSize = 'cover';
  div.style.backgroundPosition = 'center top';

  div.innerHTML = `
    ${buildLandscapeBg()}

    <div class="worldmap-container screen-enter" id="worldmap-scroll-container">
      <!-- ── Top bar ── -->
      <div class="top-bar" style="border-bottom-color:${eraAccent}44;">
        <div class="player-badge">
          <div style="width:32px;height:32px;border-radius:50%;overflow:hidden;border:2px solid ${eraAccent}88;flex-shrink:0;">
            ${playerAvatarSvg}
          </div>
          <div>
            <div class="name">
              ${profile.name}
              <span class="wm-active-title">${activeTitle}</span>
            </div>
            <div style="font-size:0.92rem;color:${eraAccent}cc;">
              ${getGradeLabel(profile.tier)} · ${currentChapterData.era}
            </div>
          </div>
          <div class="level">Lv.${profile.level}</div>
          <div style="display:flex;align-items:center;gap:5px;margin-left:4px;">
            <div style="width:8px;height:8px;background:var(--jade);border-radius:50%;box-shadow:var(--shadow-jade);"></div>
            <span style="font-size:0.95rem;color:var(--jade);cursor:help;" title="文力用于释放提示、跳过等特殊技能">${profile.wenli}/${profile.maxWenli} 文力</span>
          </div>
        </div>

        <div style="text-align:center;">
          <div style="font-size:0.92rem;color:${eraAccent}99;letter-spacing:0.1em;text-transform:uppercase;">征途</div>
          <div style="font-size:1rem;font-weight:700;color:${eraAccent};text-shadow:0 0 12px ${eraAccent}55;">文定乾坤</div>
        </div>

        <div class="nav-buttons">
          ${(() => {
            const vis = getVisibleFeatures(profile);
            const dots = getNotificationDots(profile);
            const dot = (key) => dots[key] ? `<span style="display:inline-block;width:7px;height:7px;border-radius:50%;background:${dots[key]==='red'?'#e74c3c':'#f39c12'};margin-left:3px;vertical-align:top;"></span>` : '';
            return `
              ${vis.inventory ? `<button class="btn btn-sm" id="btn-inventory" title="打开背包">背包${dot('inventory')}</button>` : ''}
              ${vis.shop ? `<button class="btn btn-sm" id="btn-shop" title="前往商店">商店${dot('shop')}</button>` : ''}
              <button class="btn btn-sm" id="btn-more" title="更多选项" style="font-size:0.95rem;">&#x22EF; 更多</button>
              <button class="btn btn-sm" id="btn-back" title="返回主菜单">返回</button>
            `;
          })()}
        </div>

        <!-- More menu popup -->
        <div id="wm-more-popup" style="
          display:none; position:absolute; top:60px; right:16px; z-index:200;
          background:rgba(20,12,40,0.96); border:1px solid rgba(212,160,23,0.35);
          border-radius:10px; padding:8px 6px; min-width:140px;
          box-shadow: 0 8px 32px rgba(0,0,0,0.6);
          backdrop-filter:blur(12px);
        ">
          <button class="btn btn-sm" id="btn-daily-reward" style="width:100%;margin-bottom:4px;" title="每日奖励">${dailyClaimed ? '已领' : '🎁 每日奖励'}</button>
          <button class="btn btn-sm" id="btn-lucky-wheel" style="width:100%;margin-bottom:4px;" title="每日转盘">${profile.luckyWheel?.lastSpinDate === new Date().toISOString().slice(0,10) ? '🎡 转盘(已转)' : '🎡 幸运转盘'}</button>
          <button class="btn btn-sm" id="btn-chengyu" style="width:100%;margin-bottom:4px;" title="查看成语">📜 成语</button>
          <button class="btn btn-sm" id="btn-trophy" style="width:100%;margin-bottom:4px;" title="成就殿堂">🏆 成就</button>
          <button class="btn btn-sm" id="btn-bestiary" style="width:100%;margin-bottom:4px;" title="妖怪图鉴">📖 图鉴</button>
          <button class="btn btn-sm" id="btn-combo-wall" style="width:100%;margin-bottom:4px;" title="连击记录">🔥 连击</button>
          <button class="btn btn-sm" id="btn-companion" style="width:100%;margin-bottom:4px;" title="墨小灵">🐾 伙伴</button>
          <button class="btn btn-sm" id="btn-stats" style="width:100%;margin-bottom:4px;" title="学习统计">📊 统计</button>
          <button class="btn btn-sm" id="btn-respec" style="width:100%;margin-bottom:4px;" title="重置天赋 (200金币)">🔄 重置天赋</button>
          <button class="btn btn-sm" id="btn-settings" style="width:100%;" title="设置">⚙ 设置</button>
        </div>
      </div>

      <!-- ── Player Stats Bar ── -->
      <div class="wm-stats-bar" style="gap:14px;padding:8px 16px;">
        <!-- Level badge -->
        <div class="wm-stat-level">
          <span class="wm-level-num">Lv.${profile.level}</span>
        </div>
        <!-- HP bar -->
        <div class="wm-stat-block" style="padding:0 8px;">
          <div class="wm-stat-label">HP</div>
          <div class="wm-bar-track" style="min-width:80px;">
            <div class="wm-bar-fill wm-bar-hp" style="width:${hpPct}%;background:linear-gradient(90deg, ${hpColor}, ${hpColor}dd);"></div>
          </div>
          <div class="wm-stat-val">${profile.hp}/${effectiveMaxHp}</div>
        </div>
        <!-- XP bar -->
        <div class="wm-stat-block" style="padding:0 8px; cursor:help;" title="经验值用于升级，升级后可分配属性点和天赋点">
          <div class="wm-stat-label">XP</div>
          <div class="wm-bar-track" style="min-width:80px;">
            <div class="wm-bar-fill wm-bar-xp" style="width:${xpProgress.percent}%;"></div>
          </div>
          <div class="wm-stat-val">${xpProgress.current}/${xpProgress.needed}</div>
        </div>
        <!-- Gold count -->
        <div class="wm-stat-gold" style="padding:0 8px; cursor:help;" title="金币可在商店购买装备和消耗品，强化你的角色">
          <span class="wm-gold-icon">&#x2726;</span>
          <span class="wm-gold-num">${profile.gold || 0}</span>
        </div>
        ${reviewStats.due > 0 ? `
        <!-- Review indicator -->
        <div class="wm-review-indicator" style="
          display:flex; align-items:center; gap:4px;
          padding:3px 10px;
          background:rgba(142,68,173,0.25);
          border:1px solid rgba(142,68,173,0.45);
          border-radius:6px;
          font-size:0.92rem; font-weight:700;
          color:#c89bdf;
          animation: wm-review-pulse 1.5s ease-in-out infinite alternate;
          white-space:nowrap;
        ">
          <span style="font-size:1rem;">&#x1F4DD;</span>
          <span>${reviewStats.due}题待复习</span>
        </div>
        <style>
          @keyframes wm-review-pulse {
            0%   { box-shadow: 0 0 0 0 rgba(142,68,173,0.3); }
            100% { box-shadow: 0 0 10px 2px rgba(142,68,173,0.5); }
          }
        </style>
        ` : ''}
      </div>

      <!-- ── Overall progress bar ── -->
      <div style="
        margin:12px 20px 0;
        background:rgba(0,0,0,0.3);
        border:1px solid ${eraAccent}33;
        border-radius:10px;
        padding:10px 16px;
        display:flex; flex-direction:column; gap:6px;
      ">
        <div style="display:flex;align-items:center;justify-content:space-between;">
          <span style="font-size:0.95rem;color:var(--text-secondary);letter-spacing:0.06em;">征途进度</span>
          <span style="font-size:1.05rem;font-weight:700;color:${eraAccent};text-shadow:0 0 8px ${eraAccent}44;">${overallPercent}%</span>
        </div>
        <div style="
          width:100%;height:8px;border-radius:4px;
          background:rgba(255,255,255,0.08);
          overflow:hidden;position:relative;
        ">
          <div class="era-progress-fill" style="
            width:${overallPercent}%;height:100%;border-radius:4px;
            background:linear-gradient(90deg, ${eraAccent}, ${eraAccent}cc);
            box-shadow: 0 0 10px ${eraAccent}66;
          "></div>
        </div>
        <div style="font-size:0.92rem;color:var(--text-secondary);">已完成 ${completedQuests} / ${totalQuests} 关卡</div>
      </div>

      <!-- ── Next Goal Tracker ── -->
      ${(() => {
        const goal = getNextGoal(profile);
        const nextUnlock = getNextUnlock(profile);
        return `
        <div id="wm-goal-card" style="
          margin:10px 20px 0; padding:10px 14px; border-radius:10px;
          background:rgba(212,160,23,0.06); border:1px solid rgba(212,160,23,0.18);
          display:flex; align-items:center; gap:10px; cursor:pointer;
        " data-goal-screen="${goal.screen || ''}">
          <span style="font-size:1.2rem;">${goal.icon || '🎯'}</span>
          <div style="flex:1;">
            <div style="font-size:0.88rem;color:var(--accent-gold);font-weight:600;">${goal.text}</div>
            ${goal.progress != null ? `<div style="height:3px;border-radius:2px;background:rgba(255,255,255,0.08);margin-top:4px;overflow:hidden;"><div style="height:100%;width:${Math.round(goal.progress*100)}%;background:var(--accent-gold);border-radius:2px;"></div></div>` : ''}
          </div>
        </div>
        ${nextUnlock ? `<div style="text-align:center;font-size:0.72rem;color:rgba(212,160,23,0.45);padding:4px 0;">⬆ Level ${nextUnlock.level} 解锁：${nextUnlock.name} ${nextUnlock.icon}</div>` : ''}
        `;
      })()}

      <!-- ── Map heading ── -->
      <div style="text-align:center; padding: 12px 20px 10px;">
        <h2 style="display:inline-block;">选择章节</h2>
        <p style="color:var(--text-secondary);font-size:0.88rem;margin-top:6px;letter-spacing:0.04em;">
          踏上穿越历史的文字征途 · 击败每个时代的墨暗之主
        </p>
      </div>

      <!-- ── Path nodes ── -->
      <div class="worldmap-path" id="worldmap-path">
        ${nodesHTML}
      </div>

      <!-- ── Weekly Boss Banner (level 5+) ── -->
      ${profile.level >= 5 ? `
        <div class="era-node node-active clickable" data-chapter="weekly-boss"
             style="--node-color:#e74c3c; margin:10px 20px; cursor:pointer;"
             role="button" tabindex="0">
          <div class="era-icon" style="font-size:1.6rem;">⚔️</div>
          <div class="era-info">
            <div class="era-tag" style="color:#e74c3c;">每周Boss · Weekly Challenge</div>
            <div class="era-title" style="color:#e74c3c;">特殊挑战</div>
            <div class="era-subtitle">每周轮换的强力Boss · 丰厚奖励</div>
          </div>
        </div>` : ''}

      <!-- ── Prestige (level 20+ & all complete) ── -->
      ${profile.level >= 20 && allChaptersComplete ? `
        <div class="era-node node-active clickable" data-chapter="prestige"
             style="--node-color:#a855f7; margin:10px 20px; cursor:pointer; background:linear-gradient(135deg, rgba(168,85,247,0.08), rgba(212,160,23,0.08), var(--bg-glass));"
             role="button" tabindex="0">
          <div class="era-icon" style="font-size:1.6rem;">✨</div>
          <div class="era-info">
            <div class="era-tag" style="color:#a855f7;">轮回飞升 · Prestige${profile.prestige?.level > 0 ? ` (★${profile.prestige.level})` : ''}</div>
            <div class="era-title" style="color:#a855f7;">飞升转世</div>
            <div class="era-subtitle">重置等级，获得永久加成 · 成为传说</div>
          </div>
        </div>` : ''}

      <!-- ── Bottom padding ── -->
      <div style="height: 60px;"></div>
    </div>

    <!-- Daily reward popup overlay -->
    <div id="wm-daily-popup" class="daily-login-popup" style="display:none;" aria-live="polite"></div>
  `;

  // ── Event listeners ──────────────────────────────────────────────────────
  setTimeout(() => {
    // --- Animated chapter node slide-in from left with stagger ---
    const allNodes = div.querySelectorAll('.era-node');
    allNodes.forEach((node, idx) => {
      node.style.opacity = '0';
      node.style.transform = 'translateX(-40px)';
      node.style.transition = 'none';
      setTimeout(() => {
        node.style.transition = 'opacity 0.45s ease, transform 0.45s cubic-bezier(0.22,1,0.36,1)';
        node.style.opacity = '';
        node.style.transform = '';
      }, 120 * idx + 100);
    });

    // Also stagger the connectors
    const connectors = div.querySelectorAll('.path-connector');
    connectors.forEach((conn, idx) => {
      conn.style.opacity = '0';
      setTimeout(() => {
        conn.style.transition = 'opacity 0.3s ease';
        conn.style.opacity = '';
      }, 120 * idx + 220);
    });

    // Quest sub-node click handlers (direct quest entry)
    div.querySelectorAll('.quest-subnode').forEach(node => {
      if (node.classList.contains('quest-locked')) return;
      node.addEventListener('click', () => {
        playSound('click');
        const cid = parseInt(node.dataset.chapter);
        const qi = parseInt(node.dataset.quest);
        showScreen('quest', { chapterId: cid, questIndex: qi });
      });
      node.addEventListener('mouseenter', () => {
        if (!node.classList.contains('quest-locked')) node.style.background = 'rgba(255,255,255,0.05)';
      });
      node.addEventListener('mouseleave', () => {
        const isCurrent = node.classList.contains('quest-current');
        const ch = CHAPTERS.find(c => c.id === parseInt(node.dataset.chapter));
        node.style.background = isCurrent && ch ? ch.color + '15' : 'rgba(255,255,255,0.02)';
      });
    });

    // Chapter node click/keyboard handlers (for gauntlet, weekly-boss, prestige, and chapter headers)
    div.querySelectorAll('.era-node.clickable').forEach(node => {
      const chapterVal = node.dataset.chapter;

      const activate = () => {
        if (chapterVal === 'gauntlet') showScreen('gauntlet');
        else if (chapterVal === 'weekly-boss') showScreen('weekly-boss');
        else if (chapterVal === 'prestige') showScreen('prestige');
        else {
          const cid = parseInt(chapterVal);
          // Always go to current quest (quest.js defaults to questsCompleted)
          showScreen('quest', { chapterId: cid });
        }
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

    // Goal card
    div.querySelector('#wm-goal-card')?.addEventListener('click', () => {
      const screen = div.querySelector('#wm-goal-card')?.dataset.goalScreen;
      if (screen && screen !== 'worldmap') showScreen(screen);
    });

    // Nav buttons
    div.querySelector('#btn-back')?.addEventListener('click', () => showScreen('title'));
    div.querySelector('#btn-inventory')?.addEventListener('click', () => showScreen('inventory'));
    div.querySelector('#btn-shop')?.addEventListener('click', () => showScreen('shop'));
    div.querySelector('#btn-chengyu')?.addEventListener('click', () => showScreen('chengyu'));
    div.querySelector('#btn-stats')?.addEventListener('click', () => showScreen('stats', { returnTo: 'worldmap' }));
    div.querySelector('#btn-settings')?.addEventListener('click', () => showScreen('settings', { returnTo: 'worldmap' }));
    div.querySelector('#btn-lucky-wheel')?.addEventListener('click', () => showScreen('lucky-wheel'));
    div.querySelector('#btn-trophy')?.addEventListener('click', () => showScreen('trophy-room'));
    div.querySelector('#btn-bestiary')?.addEventListener('click', () => showScreen('bestiary'));
    div.querySelector('#btn-combo-wall')?.addEventListener('click', () => showScreen('combo-wall'));
    div.querySelector('#btn-companion')?.addEventListener('click', () => showScreen('companion-profile'));

    // Talent respec button
    div.querySelector('#btn-respec')?.addEventListener('click', () => {
      const RESPEC_COST = 200;
      if ((profile.gold || 0) < RESPEC_COST) {
        showToast(`金币不足 (需要${RESPEC_COST})`, { type: 'error', duration: 2500 });
        return;
      }
      // Count total talent points spent
      const totalSpent = Object.values(profile.talents || {}).reduce((sum, rank) => sum + rank, 0);
      if (totalSpent === 0) {
        showToast('没有已学天赋可以重置', { type: 'info', duration: 2000 });
        return;
      }
      if (!confirm(`花费 ${RESPEC_COST} 金币重置所有天赋？\n将返还 ${totalSpent} 天赋点`)) return;
      profile.gold -= RESPEC_COST;
      profile.talentPoints = (profile.talentPoints || 0) + totalSpent;
      profile.talents = {};
      gameState.save();
      showToast(`天赋已重置！返还 ${totalSpent} 天赋点`, { type: 'talent', duration: 3000 });
      showScreen('worldmap'); // Refresh to show updated state
    });

    // "More" popup toggle
    const btnMore = div.querySelector('#btn-more');
    const morePopup = div.querySelector('#wm-more-popup');
    if (btnMore && morePopup) {
      btnMore.addEventListener('click', (e) => {
        e.stopPropagation();
        const isOpen = morePopup.style.display === 'block';
        morePopup.style.display = isOpen ? 'none' : 'block';
      });
      // Close popup when clicking outside
      div.addEventListener('click', (e) => {
        if (!morePopup.contains(e.target) && e.target !== btnMore) {
          morePopup.style.display = 'none';
        }
      });
    }

    // --- Daily reward button ---
    const btnDaily = div.querySelector('#btn-daily-reward');
    if (btnDaily) {
      if (dailyClaimed) {
        btnDaily.style.opacity = '0.5';
        btnDaily.title = `连续登录 ${dailyLogin.streak} 天 — 今日已领取`;
      }
      btnDaily.addEventListener('click', () => {
        const popup = div.querySelector('#wm-daily-popup');
        if (dailyClaimed) {
          popup.innerHTML = `
            <div class="daily-login-content">
              <div class="daily-login-streak">连续登录 <strong>${dailyLogin.streak}</strong> 天</div>
              <div class="daily-login-reward">今日奖励已领取</div>
              <button class="btn btn-sm daily-login-close" id="btn-wm-close-daily">好的</button>
            </div>`;
        } else {
          const reward = checkDailyLogin(profile);
          if (reward) {
            popup.innerHTML = `
              <div class="daily-login-content">
                <div class="daily-login-streak">连续登录第 <strong>${reward.streak}</strong> 天！</div>
                <div class="daily-login-reward">获得 ${reward.label}</div>
                <button class="btn btn-sm daily-login-close" id="btn-wm-close-daily">好的</button>
              </div>`;
            // Update button state after claiming
            btnDaily.textContent = '已领';
            btnDaily.style.opacity = '0.5';
          } else {
            popup.innerHTML = `
              <div class="daily-login-content">
                <div class="daily-login-reward">今日奖励已领取</div>
                <button class="btn btn-sm daily-login-close" id="btn-wm-close-daily">好的</button>
              </div>`;
          }
        }
        popup.style.display = 'flex';
        popup.classList.add('daily-login-enter');
        popup.querySelector('#btn-wm-close-daily').addEventListener('click', () => {
          popup.classList.remove('daily-login-enter');
          popup.classList.add('daily-login-exit');
          setTimeout(() => {
            popup.style.display = 'none';
            popup.classList.remove('daily-login-exit');
          }, 350);
        });
      });
    }

    // --- Parallax scroll effect on mountain background ---
    const scrollContainer = div.querySelector('#worldmap-scroll-container');
    const farLayer = div.querySelector('.map-parallax-far');
    const nearLayer = div.querySelector('.map-parallax-near');
    if (scrollContainer && farLayer && nearLayer) {
      scrollContainer.addEventListener('scroll', () => {
        const scrollY = scrollContainer.scrollTop;
        farLayer.style.transform = `translateY(${scrollY * 0.08}px)`;
        nearLayer.style.transform = `translateY(${scrollY * 0.18}px)`;
      });
    }

    // Scroll to current/active chapter
    const activeCh = div.querySelector('.era-node.node-active');
    if (activeCh) {
      requestAnimationFrame(() => {
        activeCh.scrollIntoView({ behavior: 'smooth', block: 'center' });
      });
    }

    // Tutorial: first worldmap visit (show for level-1 players)
    if (profile.level === 1) {
      showTutorial(div, 'tutorial_worldmap', {
        targetSelector: '.era-node.node-active, .era-node:first-child',
        position: 'bottom',
      });
    }
  }, 0);

  return div;
}

registerScreen('worldmap', renderWorldMap);
