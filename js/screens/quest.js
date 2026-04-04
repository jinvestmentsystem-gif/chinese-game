// js/screens/quest.js — Visual Journey Map (Ring Fit Adventure inspired)
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { startQuest, getCurrentEncounter, advanceEncounter } from '../game-engine.js';
import { STORIES } from './story.js';
import { playMusic, playSound } from '../audio.js';
import { SPRITES, QUEST_BGS, getPlayerSprite } from '../sprites.js';
import { showCompanionBubble, COMPANION, pick } from './companion.js';
import { setParticleMode, burstAtPoint } from '../particles.js';

// ─── Chapter era configuration ─────────────────────────────────────────────

const CHAPTER_ERA = {
  1: 'xianqin',
  2: 'han',
  3: 'tang',
  4: 'song',
  5: 'modern',
};

// Boss names per chapter (mirrors boss.js BOSS_NAMES)
const CHAPTER_BOSS_NAMES = {
  1: '仓颉之影',
  2: '墨吏',
  3: '诗魔',
  4: '词煞',
  5: '墨暗之主',
};

// Named locations per quest within each chapter — gives identity to each step
const QUEST_LOCATION_NAMES = {
  1: ['甲骨洞窟', '竹简山谷', '青铜殿堂', '论语古林', '仓颉神殿'],
  2: ['丝绸古道', '长城烽火', '太史公书房', '未央宫廷', '墨吏殿'],
  3: ['曲江春宴', '华清池畔', '翰林学院', '大雁塔下', '诗魔幻境'],
  4: ['汴京夜市', '西湖烟雨', '岳阳楼台', '清明上河', '词煞迷宫'],
  5: ['新文化书局', '白话文广场', '鲁迅故居', '文脉裂隙', '墨暗深渊'],
};
const QUEST_LOCATION_ICONS = {
  1: ['🦴', '🎋', '🏺', '📜', '👁'],
  2: ['🐫', '🔥', '📖', '🏯', '⚖'],
  3: ['🌸', '♨️', '🏛', '🗼', '🌀'],
  4: ['🏮', '🌧', '🏔', '🎨', '🌑'],
  5: ['📚', '📣', '🏠', '⚡', '🕳'],
};

// Era-specific visual themes
const ERA_THEME = {
  xianqin: {
    bg:     'linear-gradient(180deg, rgba(26,14,0,0.7) 0%, rgba(45,24,0,0.5) 30%, rgba(61,34,0,0.3) 50%, rgba(42,21,0,0.5) 70%, rgba(26,12,0,0.7) 100%)',
    accent: '#c8861a',
    sky:    '#1a0e00',
    cloud:  'rgba(180,130,60,0.18)',
    ground: 'linear-gradient(180deg, #3d2200 0%, #2a1500 100%)',
    tree:   '#2a1800',
    mtn:    '#1a0c00',
    label:  '先秦',
    glow:   'rgba(200,134,26,0.6)',
    bossGlow: 'rgba(220,80,20,0.8)',
    starColor: '255,200,120',
  },
  han: {
    bg:     'linear-gradient(180deg, rgba(26,0,0,0.7) 0%, rgba(45,8,8,0.5) 30%, rgba(64,10,10,0.3) 50%, rgba(45,5,5,0.5) 70%, rgba(26,0,0,0.7) 100%)',
    accent: '#e03030',
    sky:    '#1a0000',
    cloud:  'rgba(200,80,80,0.18)',
    ground: 'linear-gradient(180deg, #400a0a 0%, #2d0505 100%)',
    tree:   '#2d0808',
    mtn:    '#1a0000',
    label:  '汉',
    glow:   'rgba(220,60,60,0.6)',
    bossGlow: 'rgba(220,30,30,0.85)',
    starColor: '255,160,160',
  },
  tang: {
    bg:     'linear-gradient(180deg, rgba(13,10,0,0.7) 0%, rgba(30,22,0,0.5) 30%, rgba(46,32,0,0.3) 50%, rgba(30,22,0,0.5) 70%, rgba(13,10,0,0.7) 100%)',
    accent: '#d4a017',
    sky:    '#0d0a00',
    cloud:  'rgba(212,160,23,0.18)',
    ground: 'linear-gradient(180deg, #2e2000 0%, #1e1600 100%)',
    tree:   '#1e1600',
    mtn:    '#0d0a00',
    label:  '唐',
    glow:   'rgba(212,160,23,0.6)',
    bossGlow: 'rgba(212,100,20,0.85)',
    starColor: '255,220,100',
  },
  song: {
    bg:     'linear-gradient(180deg, rgba(0,26,16,0.7) 0%, rgba(0,40,24,0.5) 30%, rgba(0,56,30,0.3) 50%, rgba(0,40,24,0.5) 70%, rgba(0,26,16,0.7) 100%)',
    accent: '#2ecc8a',
    sky:    '#001a10',
    cloud:  'rgba(46,204,138,0.15)',
    ground: 'linear-gradient(180deg, #00381e 0%, #002818 100%)',
    tree:   '#00281a',
    mtn:    '#001a10',
    label:  '宋',
    glow:   'rgba(46,204,138,0.6)',
    bossGlow: 'rgba(46,180,100,0.85)',
    starColor: '100,255,180',
  },
  modern: {
    bg:     'linear-gradient(180deg, rgba(10,0,24,0.7) 0%, rgba(18,0,40,0.5) 30%, rgba(26,0,56,0.3) 50%, rgba(18,0,40,0.5) 70%, rgba(10,0,24,0.7) 100%)',
    accent: '#9060ff',
    sky:    '#0a0018',
    cloud:  'rgba(140,80,255,0.15)',
    ground: 'linear-gradient(180deg, #1a0038 0%, #120028 100%)',
    tree:   '#120028',
    mtn:    '#0a0018',
    label:  '现代',
    glow:   'rgba(140,80,255,0.6)',
    bossGlow: 'rgba(140,60,255,0.9)',
    starColor: '180,120,255',
  },
};

// ─── SVG icon helpers (inline, no emoji) ──────────────────────────────────

// Returns an SVG <g> element with an icon for the encounter type
function buildEncIconSVG(type, fillColor, size) {
  const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
  const half = size / 2;

  if (type === 'combat') {
    // Sword shape: diagonal blade
    g.innerHTML = `
      <path d="M -${half * 0.55},-${half * 0.7}
               L ${half * 0.55},${half * 0.7}
               L ${half * 0.35},${half * 0.9}
               L -${half * 0.2},${half * 0.35}
               Z"
            fill="${fillColor}" opacity="0.95"/>
      <path d="M ${half * 0.55},-${half * 0.7}
               L ${half * 0.8},-${half * 0.45}
               L ${half * 0.2},${half * 0.1}
               Z"
            fill="${fillColor}" opacity="0.7"/>
      <line x1="-${half * 0.1}" y1="${half * 0.4}"
            x2="${half * 0.25}" y2="${half * 0.75}"
            stroke="${fillColor}" stroke-width="2.5" stroke-linecap="round"/>
    `;
  } else if (type === 'puzzle') {
    // Scroll shape
    const sw = half * 0.9;
    const sh = half * 1.0;
    g.innerHTML = `
      <rect x="-${sw / 2}" y="-${sh / 2}" width="${sw}" height="${sh}"
            rx="3" fill="${fillColor}" opacity="0.15" stroke="${fillColor}" stroke-width="1.5"/>
      <line x1="-${sw * 0.35}" y1="-${sh * 0.22}" x2="${sw * 0.35}" y2="-${sh * 0.22}"
            stroke="${fillColor}" stroke-width="1.2" opacity="0.8"/>
      <line x1="-${sw * 0.35}" y1="0" x2="${sw * 0.35}" y2="0"
            stroke="${fillColor}" stroke-width="1.2" opacity="0.8"/>
      <line x1="-${sw * 0.35}" y1="${sh * 0.22}" x2="${sw * 0.1}" y2="${sh * 0.22}"
            stroke="${fillColor}" stroke-width="1.2" opacity="0.8"/>
      <ellipse cx="-${sw / 2}" cy="0" rx="3" ry="${sh / 2}"
               fill="${fillColor}" opacity="0.6"/>
      <ellipse cx="${sw / 2}" cy="0" rx="3" ry="${sh / 2}"
               fill="${fillColor}" opacity="0.6"/>
    `;
  } else if (type === 'treasure') {
    // Treasure chest shape
    const cw = half * 0.9;
    const ch = half * 0.7;
    g.innerHTML = `
      <rect x="-${cw/2}" y="-${ch/2 + 2}" width="${cw}" height="${ch * 0.6}"
            rx="3" fill="${fillColor}" opacity="0.9"/>
      <rect x="-${cw/2}" y="${-ch/2 + ch * 0.55}" width="${cw}" height="${ch * 0.45}"
            rx="2" fill="${fillColor}" opacity="0.7"/>
      <line x1="-${cw/2}" y1="${-ch/2 + ch * 0.55}" x2="${cw/2}" y2="${-ch/2 + ch * 0.55}"
            stroke="${fillColor}" stroke-width="2.5" opacity="1"/>
      <circle cx="0" cy="${-ch/2 + ch * 0.55}" r="${half * 0.12}"
              fill="${fillColor}" opacity="1"/>
    `;
  } else if (type === 'rest') {
    // Campfire shape
    g.innerHTML = `
      <path d="M 0,-${half * 0.6} Q ${half * 0.25},-${half * 0.9} 0,-${half * 0.35}
               Q -${half * 0.25},-${half * 0.9} 0,-${half * 0.6}"
            fill="${fillColor}" opacity="0.85"/>
      <path d="M -${half * 0.15},-${half * 0.4} Q 0,-${half * 0.75} ${half * 0.15},-${half * 0.4}"
            fill="${fillColor}" opacity="0.6"/>
      <line x1="-${half * 0.4}" y1="${half * 0.15}" x2="-${half * 0.1}" y2="-${half * 0.15}"
            stroke="${fillColor}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      <line x1="${half * 0.4}" y1="${half * 0.15}" x2="${half * 0.1}" y2="-${half * 0.15}"
            stroke="${fillColor}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
      <line x1="0" y1="${half * 0.2}" x2="0" y2="-${half * 0.1}"
            stroke="${fillColor}" stroke-width="2" stroke-linecap="round" opacity="0.7"/>
    `;
  } else {
    // Boss: skull / demon shape
    const hw = half * 0.75;
    const hh = half * 0.85;
    g.innerHTML = `
      <ellipse cx="0" cy="-${hh * 0.1}" rx="${hw}" ry="${hh * 0.75}"
               fill="${fillColor}" opacity="0.9"/>
      <rect x="-${hw * 0.6}" y="${hh * 0.5}" width="${hw * 0.45}" height="${hh * 0.4}"
            rx="2" fill="${fillColor}" opacity="0.7"/>
      <rect x="${hw * 0.15}" y="${hh * 0.5}" width="${hw * 0.45}" height="${hh * 0.4}"
            rx="2" fill="${fillColor}" opacity="0.7"/>
      <ellipse cx="-${hw * 0.32}" cy="-${hh * 0.15}" rx="${hw * 0.22}" ry="${hh * 0.22}"
               fill="#1a0000" opacity="0.9"/>
      <ellipse cx="${hw * 0.32}" cy="-${hh * 0.15}" rx="${hw * 0.22}" ry="${hh * 0.22}"
               fill="#1a0000" opacity="0.9"/>
      <path d="M -${hw * 0.25},${hh * 0.22} L 0,${hh * 0.1} L ${hw * 0.25},${hh * 0.22}"
            stroke="#1a0000" stroke-width="2" fill="none" opacity="0.8"/>
    `;
  }
  return g;
}

// ─── Build the winding SVG path between nodes ─────────────────────────────

// Given an array of [x, y] node centres (top → bottom order) returns an
// SVG path string for a smooth S-curve passing through all of them.
function buildWindingPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]},${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [x0, y0] = points[i - 1];
    const [x1, y1] = points[i];
    const midY = (y0 + y1) / 2;
    // Bezier control points pull horizontally to create the S-curve
    const cx0 = x0;
    const cy0 = midY;
    const cx1 = x1;
    const cy1 = midY;
    d += ` C ${cx0},${cy0} ${cx1},${cy1} ${x1},${y1}`;
  }
  return d;
}

// ─── Era decorative background elements ──────────────────────────────────────

function buildBackground(container, theme, svgW, svgH) {
  // Starfield — 28 small twinkling dots in the sky area
  const starSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  starSvg.setAttribute('width', '100%');
  starSvg.setAttribute('height', '55%');
  starSvg.style.cssText = `position:absolute; top:0; left:0; pointer-events:none; z-index:0; overflow:visible;`;
  const starBase = theme.starColor || '255,220,180';
  for (let s = 0; s < 28; s++) {
    const cx = 5 + Math.random() * 90;   // percent
    const cy = 3 + Math.random() * 85;   // percent
    const r  = 0.8 + Math.random() * 1.6;
    const dur = (2.5 + Math.random() * 4).toFixed(1);
    const delay = (Math.random() * 4).toFixed(1);
    const star = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    star.setAttribute('cx', `${cx}%`);
    star.setAttribute('cy', `${cy}%`);
    star.setAttribute('r', r);
    star.setAttribute('fill', `rgba(${starBase},0.85)`);
    // Twinkle via animate
    const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
    anim.setAttribute('attributeName', 'opacity');
    anim.setAttribute('values', '0.2;1;0.2');
    anim.setAttribute('dur', `${dur}s`);
    anim.setAttribute('begin', `${delay}s`);
    anim.setAttribute('repeatCount', 'indefinite');
    star.appendChild(anim);
    starSvg.appendChild(star);
  }
  container.appendChild(starSvg);

  // Sky clouds (CSS circles)
  for (let c = 0; c < 5; c++) {
    const cloud = document.createElement('div');
    const size = 40 + Math.random() * 60;
    const top  = 10 + Math.random() * 20;
    const left = 5 + Math.random() * 85;
    cloud.style.cssText = `
      position:absolute;
      left:${left}%; top:${top}%;
      width:${size}px; height:${size * 0.4}px;
      border-radius:50%;
      background:${theme.cloud};
      pointer-events:none; z-index:0;
      animation: cloud-drift ${12 + c * 3}s ease-in-out infinite alternate;
    `;
    container.appendChild(cloud);
  }

  // Mountain silhouettes — two layers for depth
  const mtnSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mtnSvg.setAttribute('width', '100%');
  mtnSvg.setAttribute('height', '110');
  mtnSvg.style.cssText = `position:absolute; bottom:12%; left:0; pointer-events:none; z-index:0;`;

  // Far mountains (slightly brighter, taller)
  const mtnFar = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  mtnFar.setAttribute('d', 'M0,110 L0,65 L35,30 L70,55 L110,15 L155,48 L200,20 L250,52 L295,18 L340,50 L385,25 L430,58 L465,22 L505,50 L545,10 L600,44 L600,110 Z');
  mtnFar.setAttribute('fill', theme.mtn);
  mtnFar.setAttribute('opacity', '0.6');
  mtnSvg.appendChild(mtnFar);

  // Near mountains (darker, shorter)
  const mtnNear = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  mtnNear.setAttribute('d', 'M0,110 L0,75 L50,50 L90,68 L140,38 L190,62 L240,42 L300,70 L350,45 L410,72 L460,48 L520,75 L570,55 L600,72 L600,110 Z');
  mtnNear.setAttribute('fill', theme.mtn);
  mtnNear.setAttribute('opacity', '0.9');
  mtnSvg.appendChild(mtnNear);

  container.appendChild(mtnSvg);

  // Ground texture strip
  const groundDiv = document.createElement('div');
  groundDiv.style.cssText = `
    position:absolute; bottom:0; left:0; right:0; height:12%;
    background:${theme.ground};
    pointer-events:none; z-index:0;
    border-top: 1px solid rgba(255,255,255,0.06);
  `;
  container.appendChild(groundDiv);

  // Tree silhouettes at bottom
  const treeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  treeSvg.setAttribute('width', '100%');
  treeSvg.setAttribute('height', '60');
  treeSvg.style.cssText = `position:absolute; bottom:0; left:0; pointer-events:none; z-index:0;`;
  const treePositions = [3, 9, 15, 22, 30, 38, 46, 54, 62, 70, 78, 84, 90, 96];
  treePositions.forEach(pct => {
    const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
    const cx = (pct / 100) * 600;
    const h  = 25 + Math.random() * 22;
    const w  = 10 + Math.random() * 9;
    tri.setAttribute('points', `${cx},60 ${cx - w},60 ${cx},${60 - h} ${cx + w},60`);
    tri.setAttribute('fill', theme.tree);
    treeSvg.appendChild(tri);
  });
  container.appendChild(treeSvg);
}

// ─── Keyframe style block (injected once) ────────────────────────────────────

function injectStyles(div) {
  const s = document.createElement('style');
  s.id = 'quest-map-styles';
  s.textContent = `
    @keyframes node-pulse {
      0%,100% { box-shadow: 0 0 0 0 rgba(212,160,23,0.55); }
      50%      { box-shadow: 0 0 0 10px rgba(212,160,23,0); }
    }
    @keyframes boss-pulse {
      0%,100% { box-shadow: 0 0 8px 3px rgba(220,60,20,0.5); filter: brightness(1); }
      50%      { box-shadow: 0 0 22px 8px rgba(220,60,20,0.85); filter: brightness(1.15); }
    }
    @keyframes player-float {
      0%,100% { transform: translateY(0); }
      50%      { transform: translateY(-5px); }
    }
    @keyframes cloud-drift {
      from { transform: translateX(0px); }
      to   { transform: translateX(12px); }
    }
    @keyframes map-fade-in {
      from { opacity:0; transform:translateY(16px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes walk-up {
      from { transform: translateY(0px); }
      to   { transform: translateY(var(--walk-dist, -60px)); }
    }
    @keyframes btn-glow {
      0%,100% { box-shadow: 0 0 8px 2px rgba(212,160,23,0.35); }
      50%      { box-shadow: 0 0 20px 6px rgba(212,160,23,0.7); }
    }
    @keyframes boss-warning {
      0%   { opacity:0; transform:scale(0.8); }
      15%  { opacity:1; transform:scale(1.05); }
      85%  { opacity:1; transform:scale(1); }
      100% { opacity:0; transform:scale(0.95); }
    }
    @keyframes step-flash {
      0%   { opacity:0; }
      30%  { opacity:1; }
      70%  { opacity:1; }
      100% { opacity:0; }
    }
    @keyframes current-ring-1 {
      0%   { r: var(--nr); opacity: 0.7; }
      100% { r: calc(var(--nr) + 22px); opacity: 0; }
    }
    @keyframes current-ring-2 {
      0%   { r: var(--nr); opacity: 0.5; }
      100% { r: calc(var(--nr) + 38px); opacity: 0; }
    }
    @keyframes boss-aura-1 {
      0%   { r: var(--br); opacity: 0.6; }
      100% { r: calc(var(--br) + 28px); opacity: 0; }
    }
    @keyframes boss-aura-2 {
      0%   { r: var(--br); opacity: 0.4; }
      100% { r: calc(var(--br) + 48px); opacity: 0; }
    }
  `;
  div.appendChild(s);
}

// ─── Main render ──────────────────────────────────────────────────────────────

function renderQuest(params) {
  setParticleMode('ambient');
  const div = document.createElement('div');
  div.className = 'screen';
  // Must keep position:absolute (from .screen class) — position:relative causes 0-height bug
  div.style.cssText = 'padding:0;';

  const { chapterId } = params;
  const profile = gameState.profile;
  const progress = profile.chapterProgress[chapterId] || { questsCompleted: 0 };
  const CHAPTER_QUEST_COUNTS = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 };
  const maxQuests = CHAPTER_QUEST_COUNTS[chapterId] || 5;
  let questIndex = params.questIndex ?? progress.questsCompleted;
  // Clamp to valid range — if chapter complete, replay from quest 0
  if (questIndex >= maxQuests) questIndex = 0;
  const justFinishedEncounter = params.justFinishedEncounter || false;

  const era   = CHAPTER_ERA[chapterId] || 'xianqin';
  const theme = ERA_THEME[era] || ERA_THEME.xianqin;

  // Boss name for this chapter
  const chapterBossName = CHAPTER_BOSS_NAMES[chapterId] || 'BOSS';

  // Inject CSS keyframes
  injectStyles(div);

  // ── Full-screen journey map container ──
  const mapWrap = document.createElement('div');
  const questBgUrl = QUEST_BGS[CHAPTER_ERA[chapterId]] || '';
  // Subtle hue shift per quest within chapter for visual variety
  const questHueShift = questIndex * 12; // 0°, 12°, 24°, 36°, 48° rotation
  const questBrightness = 1.0 - questIndex * 0.04; // slightly darker as you progress deeper
  mapWrap.style.cssText = `
    position:absolute; inset:0;
    background:
      ${theme.bg},
      url('${questBgUrl}') center/cover no-repeat;
    overflow-y:auto; overflow-x:hidden;
    display:flex; flex-direction:column;
    align-items:center;
    filter: hue-rotate(${questHueShift}deg) brightness(${questBrightness});
  `;
  div.appendChild(mapWrap);

  // ── Chapter title bar ──
  const titleBar = document.createElement('div');
  titleBar.style.cssText = `
    position:sticky; top:0; left:0; right:0; z-index:50;
    padding:12px 20px 10px;
    background:linear-gradient(180deg,rgba(0,0,0,0.9) 0%,rgba(0,0,0,0.4) 70%,rgba(0,0,0,0) 100%);
    display:flex; align-items:center; justify-content:space-between;
    pointer-events:none;
    border-bottom: 1px solid ${theme.accent}22;
  `;
  const locationName = QUEST_LOCATION_NAMES[chapterId]?.[questIndex] || `第 ${questIndex + 1} 关`;
  const locationIcon = QUEST_LOCATION_ICONS[chapterId]?.[questIndex] || '';
  titleBar.innerHTML = `
    <div style="
      font-size:1.3rem; font-weight:900; color:${theme.accent};
      letter-spacing:0.08em;
      text-shadow: 0 0 14px ${theme.accent}55, 0 0 28px ${theme.accent}22;
    ">
      ${locationIcon} ${locationName}
    </div>
    <div style="
      font-size:0.78rem; color:${theme.accent}77;
      font-weight:500; letter-spacing:0.05em;
      padding:2px 10px;
      border:1px solid ${theme.accent}22;
      border-radius:12px;
      background:${theme.accent}08;
    ">第${chapterId}章 · ${theme.label} · ${questIndex + 1}/${maxQuests}</div>
    ${gameState.currentQuest?.objective ? `<div style="
      font-size:0.92rem; color:#d4a017; margin-top:4px;
      padding:3px 10px; background:rgba(212,160,23,0.1);
      border:1px dashed rgba(212,160,23,0.3); border-radius:8px;
      letter-spacing:0.04em;
    ">🎯 目标: ${gameState.currentQuest.objective.desc} → +${gameState.currentQuest.objective.bonusXP}XP +${gameState.currentQuest.objective.bonusGold}金币</div>` : ''}
  `;
  mapWrap.appendChild(titleBar);

  // ── Content area (fixed size, centred) ──
  const content = document.createElement('div');
  content.style.cssText = `
    position:relative; width:100%; max-width:400px;
    flex:1; display:flex; flex-direction:column; align-items:center;
    padding:0 20px; box-sizing:border-box;
    animation: map-fade-in 0.5s ease-out both;
  `;
  mapWrap.appendChild(content);

  // Build decorative background inside content area
  buildBackground(content, theme, 400, 600);

  // ── Back button (top-left, above map) ──
  const btnBack = document.createElement('button');
  btnBack.className = 'btn';
  btnBack.style.cssText = `
    position:absolute; top:4px; left:4px; z-index:60;
    padding:6px 12px; font-size:0.8rem;
    pointer-events:auto;
  `;
  btnBack.textContent = '← 返回';
  btnBack.addEventListener('click', () => showScreen('worldmap'));
  content.appendChild(btnBack);

  // ── Loading overlay — ink-brush animation while quest data loads ──
  const loadingOverlay = document.createElement('div');
  loadingOverlay.id = 'quest-loading-overlay';
  loadingOverlay.style.cssText = `
    position:absolute; inset:0; z-index:100;
    background:radial-gradient(ellipse at center, #1a1208 0%, #0d0a04 60%, #000 100%);
    display:flex; flex-direction:column; align-items:center; justify-content:center;
    gap:24px; opacity:1;
    transition: opacity 0.4s ease-out;
  `;

  // Ink brush stroke SVG (self-drawing calligraphy stroke)
  const brushSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  brushSvg.setAttribute('width', '120');
  brushSvg.setAttribute('height', '120');
  brushSvg.setAttribute('viewBox', '0 0 120 120');
  brushSvg.style.cssText = 'filter: drop-shadow(0 0 12px rgba(212,160,23,0.4));';
  // Calligraphy brush stroke path (stylized "文" radical)
  const strokePath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  strokePath.setAttribute('d', 'M30 25 Q60 20 90 25 M60 25 L60 75 M35 50 Q60 70 85 50 M40 95 Q60 75 80 95');
  strokePath.setAttribute('fill', 'none');
  strokePath.setAttribute('stroke', '#d4a017');
  strokePath.setAttribute('stroke-width', '3.5');
  strokePath.setAttribute('stroke-linecap', 'round');
  strokePath.setAttribute('stroke-linejoin', 'round');
  // Calculate total length for dash animation
  const totalLen = 400; // approximate total path length
  strokePath.style.cssText = `
    stroke-dasharray: ${totalLen};
    stroke-dashoffset: ${totalLen};
    animation: ink-brush-draw 2s ease-in-out infinite;
  `;
  brushSvg.appendChild(strokePath);

  // Ink drop circle that pulses behind the brush
  const inkCircle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
  inkCircle.setAttribute('cx', '60');
  inkCircle.setAttribute('cy', '60');
  inkCircle.setAttribute('r', '48');
  inkCircle.setAttribute('fill', 'none');
  inkCircle.setAttribute('stroke', 'rgba(212,160,23,0.15)');
  inkCircle.setAttribute('stroke-width', '1.5');
  inkCircle.style.cssText = 'animation: ink-circle-pulse 2s ease-in-out infinite;';
  brushSvg.insertBefore(inkCircle, strokePath);

  loadingOverlay.appendChild(brushSvg);

  // "加载中..." text with animated dots
  const loadingTextEl = document.createElement('div');
  loadingTextEl.style.cssText = `
    color:rgba(212,160,23,0.85); font-size:1.1rem; font-weight:600;
    letter-spacing:0.15em; text-shadow: 0 0 8px rgba(212,160,23,0.3);
  `;
  loadingTextEl.innerHTML = '加载中<span class="loading-dots"></span>';
  loadingOverlay.appendChild(loadingTextEl);

  // Random loading tip
  const LOADING_TIPS = [
    '你知道吗？"成语"一词最早出现在《庄子》中。',
    '汉字是世界上使用时间最长的文字系统。',
    '中国第一部字典是东汉许慎的《说文解字》。',
    '甲骨文是中国已知最早的成熟文字。',
    '唐诗三百首中收录了77位诗人的作品。',
    '《诗经》是中国最早的诗歌总集。',
    '仓颉是传说中汉字的创造者。',
    '中文里有超过5万个汉字，但常用的只有约3500个。',
  ];
  const tipEl = document.createElement('div');
  tipEl.style.cssText = `
    color:rgba(255,255,255,0.35); font-size: 0.92rem; max-width:260px;
    text-align:center; line-height:1.5; margin-top:8px;
    font-style:italic;
  `;
  tipEl.textContent = LOADING_TIPS[Math.floor(Math.random() * LOADING_TIPS.length)];
  loadingOverlay.appendChild(tipEl);

  // Inject keyframe animations (once)
  if (!document.getElementById('quest-loading-keyframes')) {
    const style = document.createElement('style');
    style.id = 'quest-loading-keyframes';
    style.textContent = `
      @keyframes ink-brush-draw {
        0%   { stroke-dashoffset: ${totalLen}; opacity: 0.6; }
        50%  { stroke-dashoffset: 0; opacity: 1; }
        70%  { stroke-dashoffset: 0; opacity: 1; }
        100% { stroke-dashoffset: -${totalLen}; opacity: 0.6; }
      }
      @keyframes ink-circle-pulse {
        0%, 100% { r: 44; stroke-opacity: 0.1; }
        50%      { r: 52; stroke-opacity: 0.3; }
      }
      .loading-dots::after {
        content: '';
        animation: loading-dot-anim 1.4s steps(4, end) infinite;
      }
      @keyframes loading-dot-anim {
        0%   { content: ''; }
        25%  { content: '.'; }
        50%  { content: '..'; }
        75%  { content: '...'; }
        100% { content: ''; }
      }
    `;
    document.head.appendChild(style);
  }

  content.appendChild(loadingOverlay);

  // ─── Async: build the map once quest data is ready ───────────────────────
  setTimeout(async () => {
    // If returning from a completed encounter, reuse the existing quest state
    // to preserve encounter completion progress. Only create a new quest if
    // there isn't one or it's for a different chapter/quest.
    let quest = gameState.currentQuest;
    if (!quest || quest.chapterId !== chapterId || quest.questIndex !== questIndex) {
      quest = await startQuest(chapterId, questIndex);
    }
    // Fade out and remove the loading overlay (defensive: may be gone if screen was swapped)
    if (loadingOverlay?.parentNode) {
      loadingOverlay.style.opacity = '0';
      setTimeout(() => { try { loadingOverlay.remove(); } catch(_) {} }, 400);
    }

    const encounters = quest.encounters;   // [{type, index, completed}, …]
    const N = encounters.length;           // typically 5

    // ── Layout constants ──
    // We place nodes along a winding vertical path.
    // Node positions are in [0..1] fractional coordinates of the content box.
    // The map SVG is drawn over a 360×600 canvas inside the content div.

    const SVG_W = 320;
    const SVG_H = 560;
    const NODE_R = 28;          // radius of encounter node circle (was 22)
    const BOSS_R = 44;          // radius of boss node (was 32)

    // Y positions: boss at top (y=80), start at bottom (y=SVG_H-60)
    // Distribute evenly, with boss at index 0 = TOP
    // but our encounter array is 0=first, N-1=boss
    // So we reverse for layout: encounter[N-1] (boss) → top, encounter[0] → near bottom

    const totalSpan = SVG_H - 140;   // space between start pt and boss
    const nodePositions = [];        // [x, y] in SVG space, index 0 = first encounter
    const nodeCount = N + 1;         // +1 for "起点" start marker at the very bottom

    // Start point
    const startY = SVG_H - 50;
    const startX = SVG_W / 2;

    // Boss at top
    const bossY = 90;

    // Intermediate nodes (encounter 0 … N-2, with N-1 being boss)
    // Y: evenly spaced between start and boss
    // X: sinusoidal weave for S-curve feel
    for (let i = 0; i < N; i++) {
      const t = i / (N - 1);             // 0 (first enc) → 1 (boss)
      const y = startY - 50 - t * (startY - 50 - bossY);
      // X weave: alternate left/right with diminishing amplitude near top
      const amp = SVG_W * 0.22 * (1 - t * 0.4);
      const wave = Math.sin(i * Math.PI * 0.75 + Math.PI * 0.25);
      const x = SVG_W / 2 + wave * amp;
      nodePositions.push([x, y]);
    }

    // Full path points: start marker → enc[0] → … → enc[N-1] (boss)
    const allPoints = [[startX, startY], ...nodePositions];

    // ── SVG layer for path ──
    const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
    svg.setAttribute('width', SVG_W);
    svg.setAttribute('height', SVG_H);
    svg.style.cssText = `
      position:absolute; top:40px; left:50%;
      transform:translateX(-50%);
      z-index:1; pointer-events:none;
      overflow:visible;
    `;
    content.appendChild(svg);

    // Add SVG defs for gradients
    const defs = document.createElementNS('http://www.w3.org/2000/svg', 'defs');
    // Completed path gradient
    const gradId = 'path-grad-completed';
    const grad = document.createElementNS('http://www.w3.org/2000/svg', 'linearGradient');
    grad.setAttribute('id', gradId);
    grad.setAttribute('x1', '0%'); grad.setAttribute('y1', '0%');
    grad.setAttribute('x2', '0%'); grad.setAttribute('y2', '100%');
    const stop1 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop1.setAttribute('offset', '0%');
    stop1.setAttribute('stop-color', theme.accent);
    stop1.setAttribute('stop-opacity', '1');
    const stop2 = document.createElementNS('http://www.w3.org/2000/svg', 'stop');
    stop2.setAttribute('offset', '100%');
    stop2.setAttribute('stop-color', theme.accent);
    stop2.setAttribute('stop-opacity', '0.5');
    grad.appendChild(stop1);
    grad.appendChild(stop2);
    defs.appendChild(grad);
    svg.appendChild(defs);

    // Build path segments: one per gap, coloured by completion status
    // allPoints[0] = start, allPoints[i+1] = encounters[i]
    for (let i = 0; i < N; i++) {
      const fromPt  = allPoints[i];
      const toPt    = allPoints[i + 1];
      const enc     = encounters[i];
      const segCompleted = enc.completed;     // segment leading TO this node is "done"

      // Glow path beneath (blurred) for completed segments
      if (segCompleted) {
        const glowPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
        glowPath.setAttribute('d', buildWindingPath([fromPt, toPt]));
        glowPath.setAttribute('fill', 'none');
        glowPath.setAttribute('stroke', theme.accent);
        glowPath.setAttribute('stroke-width', '10');
        glowPath.setAttribute('stroke-linecap', 'round');
        glowPath.setAttribute('opacity', '0.25');
        svg.appendChild(glowPath);
      }

      const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
      pathEl.setAttribute('d', buildWindingPath([fromPt, toPt]));
      pathEl.setAttribute('fill', 'none');
      pathEl.setAttribute('stroke-width', '6');
      pathEl.setAttribute('stroke-linecap', 'round');
      pathEl.setAttribute('data-seg-idx', i);

      if (segCompleted) {
        pathEl.setAttribute('stroke', `url(#${gradId})`);
        pathEl.setAttribute('stroke-dasharray', 'none');
        pathEl.setAttribute('opacity', '1');
      } else {
        pathEl.setAttribute('stroke', 'rgba(255,255,255,0.18)');
        pathEl.setAttribute('stroke-dasharray', '8 6');
        pathEl.setAttribute('opacity', '0.7');
      }
      svg.appendChild(pathEl);
    }

    // ── Start marker ("起点") ──
    const startG = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    startG.setAttribute('transform', `translate(${startX}, ${startY})`);
    startG.innerHTML = `
      <circle r="16" fill="rgba(255,255,255,0.08)" stroke="rgba(255,255,255,0.25)" stroke-width="2"/>
      <text y="5" text-anchor="middle" font-size="14" fill="rgba(255,255,255,0.6)">🏠</text>
    `;
    svg.appendChild(startG);

    // ── Encounter nodes ──
    const nodeEls = [];    // DOM elements for animation

    encounters.forEach((enc, i) => {
      const [nx, ny] = nodePositions[i];
      const isBoss    = enc.type === 'boss';
      const completed = enc.completed;
      const isCurrent = !completed && (i === 0 || encounters[i - 1]?.completed);
      const r = isBoss ? BOSS_R : NODE_R;

      // Node group
      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      g.setAttribute('transform', `translate(${nx}, ${ny})`);
      g.setAttribute('data-enc-idx', i);

      // Boss: pulsing red aura rings (2 expanding rings)
      if (isBoss) {
        const auraRing1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        auraRing1.setAttribute('r', r + 4);
        auraRing1.setAttribute('fill', 'none');
        auraRing1.setAttribute('stroke', 'rgba(220,50,20,0.7)');
        auraRing1.setAttribute('stroke-width', '3');
        auraRing1.setAttribute('style', `--br:${r + 4}px;`);
        const bossAnim1 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        bossAnim1.setAttribute('attributeName', 'r');
        bossAnim1.setAttribute('values', `${r + 4};${r + 32}`);
        bossAnim1.setAttribute('dur', '1.8s');
        bossAnim1.setAttribute('repeatCount', 'indefinite');
        const bossAnimOp1 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        bossAnimOp1.setAttribute('attributeName', 'opacity');
        bossAnimOp1.setAttribute('values', '0.7;0');
        bossAnimOp1.setAttribute('dur', '1.8s');
        bossAnimOp1.setAttribute('repeatCount', 'indefinite');
        auraRing1.appendChild(bossAnim1);
        auraRing1.appendChild(bossAnimOp1);
        g.appendChild(auraRing1);

        const auraRing2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        auraRing2.setAttribute('r', r + 4);
        auraRing2.setAttribute('fill', 'none');
        auraRing2.setAttribute('stroke', 'rgba(220,50,20,0.4)');
        auraRing2.setAttribute('stroke-width', '2');
        const bossAnim2 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        bossAnim2.setAttribute('attributeName', 'r');
        bossAnim2.setAttribute('values', `${r + 4};${r + 52}`);
        bossAnim2.setAttribute('dur', '1.8s');
        bossAnim2.setAttribute('begin', '0.5s');
        bossAnim2.setAttribute('repeatCount', 'indefinite');
        const bossAnimOp2 = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        bossAnimOp2.setAttribute('attributeName', 'opacity');
        bossAnimOp2.setAttribute('values', '0.5;0');
        bossAnimOp2.setAttribute('dur', '1.8s');
        bossAnimOp2.setAttribute('begin', '0.5s');
        bossAnimOp2.setAttribute('repeatCount', 'indefinite');
        auraRing2.appendChild(bossAnim2);
        auraRing2.appendChild(bossAnimOp2);
        g.appendChild(auraRing2);
      }

      // Current node: 2 concentric expanding pulse rings
      if (isCurrent && !isBoss) {
        const pulseRing1 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pulseRing1.setAttribute('r', r);
        pulseRing1.setAttribute('fill', 'none');
        pulseRing1.setAttribute('stroke', theme.accent);
        pulseRing1.setAttribute('stroke-width', '2');
        const pr1animR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        pr1animR.setAttribute('attributeName', 'r');
        pr1animR.setAttribute('values', `${r};${r + 20}`);
        pr1animR.setAttribute('dur', '1.6s');
        pr1animR.setAttribute('repeatCount', 'indefinite');
        const pr1animOp = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        pr1animOp.setAttribute('attributeName', 'opacity');
        pr1animOp.setAttribute('values', '0.7;0');
        pr1animOp.setAttribute('dur', '1.6s');
        pr1animOp.setAttribute('repeatCount', 'indefinite');
        pulseRing1.appendChild(pr1animR);
        pulseRing1.appendChild(pr1animOp);
        g.appendChild(pulseRing1);

        const pulseRing2 = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        pulseRing2.setAttribute('r', r);
        pulseRing2.setAttribute('fill', 'none');
        pulseRing2.setAttribute('stroke', theme.accent);
        pulseRing2.setAttribute('stroke-width', '1.5');
        const pr2animR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        pr2animR.setAttribute('attributeName', 'r');
        pr2animR.setAttribute('values', `${r};${r + 36}`);
        pr2animR.setAttribute('dur', '1.6s');
        pr2animR.setAttribute('begin', '0.4s');
        pr2animR.setAttribute('repeatCount', 'indefinite');
        const pr2animOp = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        pr2animOp.setAttribute('attributeName', 'opacity');
        pr2animOp.setAttribute('values', '0.5;0');
        pr2animOp.setAttribute('dur', '1.6s');
        pr2animOp.setAttribute('begin', '0.4s');
        pr2animOp.setAttribute('repeatCount', 'indefinite');
        pulseRing2.appendChild(pr2animR);
        pulseRing2.appendChild(pr2animOp);
        g.appendChild(pulseRing2);
      }

      // Animated dashed border ring on the current encounter node
      if (isCurrent) {
        const dashedRing = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        dashedRing.setAttribute('r', r + 4);
        dashedRing.setAttribute('fill', 'none');
        dashedRing.setAttribute('stroke', theme.accent);
        dashedRing.setAttribute('stroke-width', '2');
        dashedRing.setAttribute('stroke-dasharray', '6 4');
        dashedRing.setAttribute('opacity', '0.7');
        // Rotating animation via animateTransform
        const rotAnim = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        rotAnim.setAttribute('attributeName', 'transform');
        rotAnim.setAttribute('type', 'rotate');
        rotAnim.setAttribute('from', '0');
        rotAnim.setAttribute('to', '360');
        rotAnim.setAttribute('dur', '8s');
        rotAnim.setAttribute('repeatCount', 'indefinite');
        dashedRing.appendChild(rotAnim);
        g.appendChild(dashedRing);
      }

      // Shadow / glow ring beneath node
      const glowCirc = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      glowCirc.setAttribute('r', r + 8);
      glowCirc.setAttribute('fill', 'none');
      glowCirc.setAttribute('stroke', isBoss ? theme.bossGlow : theme.glow);
      glowCirc.setAttribute('stroke-width', '2');
      glowCirc.setAttribute('opacity', isBoss ? '0.65' : completed ? '0.5' : isCurrent ? '0.4' : '0.1');
      g.appendChild(glowCirc);

      // Main circle
      const circ = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circ.setAttribute('r', r);
      if (completed) {
        circ.setAttribute('fill', theme.accent);
        circ.setAttribute('stroke', theme.accent);
        circ.setAttribute('stroke-width', '3');
      } else if (isCurrent) {
        circ.setAttribute('fill', 'rgba(20,15,5,0.9)');
        circ.setAttribute('stroke', theme.accent);
        circ.setAttribute('stroke-width', '3');
      } else if (isBoss) {
        circ.setAttribute('fill', 'rgba(30,0,0,0.92)');
        circ.setAttribute('stroke', theme.bossGlow);
        circ.setAttribute('stroke-width', '4');
      } else {
        circ.setAttribute('fill', 'rgba(10,8,5,0.7)');
        circ.setAttribute('stroke', 'rgba(255,255,255,0.2)');
        circ.setAttribute('stroke-width', '2');
      }
      g.appendChild(circ);

      // Icon: SVG inline icon or checkmark
      if (completed) {
        const iconText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        iconText.setAttribute('y', '0');
        iconText.setAttribute('text-anchor', 'middle');
        iconText.setAttribute('font-size', NODE_R * 0.85);
        iconText.setAttribute('fill', '#000');
        iconText.setAttribute('dominant-baseline', 'middle');
        iconText.textContent = '✓';
        g.appendChild(iconText);
      } else {
        // SVG path icon for encounter type
        const iconSize = isBoss ? BOSS_R * 0.9 : NODE_R * 0.9;
        const iconColor = isBoss ? 'rgba(255,120,80,0.9)' : isCurrent ? theme.accent : 'rgba(255,255,255,0.6)';
        const iconG = buildEncIconSVG(enc.type, iconColor, iconSize);
        g.appendChild(iconG);
      }

      // Label below node
      const labelText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      labelText.setAttribute('y', r + 16);
      labelText.setAttribute('text-anchor', 'middle');
      labelText.setAttribute('font-size', isBoss ? '11' : '10');
      labelText.setAttribute('fill', completed ? theme.accent : isBoss ? 'rgba(255,100,80,0.9)' : isCurrent ? theme.accent : 'rgba(255,255,255,0.35)');
      if (completed) {
        labelText.textContent = '已完成';
      } else if (isBoss) {
        labelText.textContent = chapterBossName;
      } else {
        const typeLabels = { combat: '战斗', puzzle: '解谜', treasure: '宝箱', rest: '休息' };
        labelText.textContent = `${typeLabels[enc.type] || enc.type} ${i + 1}`;
      }
      g.appendChild(labelText);

      // "你在这里" tag on current node
      if (isCurrent && !isBoss) {
        const tag = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        tag.setAttribute('x', r + 8);
        tag.setAttribute('y', '-4');
        tag.setAttribute('font-size', '10');
        tag.setAttribute('fill', theme.accent);
        tag.textContent = '← 你在这里';
        g.appendChild(tag);
      }

      // Boss: animated glow ring + name label above
      if (isBoss) {
        const anim = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
        anim.setAttribute('attributeName', 'stroke-opacity');
        anim.setAttribute('values', '0.5;1;0.5');
        anim.setAttribute('dur', '2s');
        anim.setAttribute('repeatCount', 'indefinite');
        glowCirc.appendChild(anim);

        // Boss name label above node (actual boss name, not "BOSS 终点")
        const bossNameEl = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        bossNameEl.setAttribute('y', -(r + 18));
        bossNameEl.setAttribute('text-anchor', 'middle');
        bossNameEl.setAttribute('font-size', '13');
        bossNameEl.setAttribute('fill', 'rgba(255,100,70,0.95)');
        bossNameEl.setAttribute('font-weight', 'bold');
        bossNameEl.textContent = `⚠ ${chapterBossName}`;
        g.appendChild(bossNameEl);
      }

      svg.appendChild(g);
      nodeEls.push(g);
    });

    // ── Player avatar (small, next to current node) ──
    // Find current encounter index
    const currentIdx = encounters.findIndex(
      (e, i) => !e.completed && (i === 0 || encounters[i - 1]?.completed)
    );

    let playerAvatarGroup = null;
    let playerStartPos   = null;

    if (currentIdx >= 0) {
      const [px, py] = nodePositions[currentIdx];
      const enc      = encounters[currentIdx];
      const r        = enc.type === 'boss' ? BOSS_R : NODE_R;

      playerAvatarGroup = document.createElementNS('http://www.w3.org/2000/svg', 'g');
      // Place player to the left of the node
      const avatarX = px - r - 30;
      const avatarY = py - 20;
      playerAvatarGroup.setAttribute('transform', `translate(${avatarX}, ${avatarY})`);
      playerAvatarGroup.style.animation = 'player-float 2.2s ease-in-out infinite';

      // Small player SVG embedded as foreignObject would be tricky; use a simplified inline mini-sprite
      // Using a small "adventurer figure" in SVG path form (scaled down from SPRITES.player concept)
      playerAvatarGroup.innerHTML = `
        <circle r="16" fill="rgba(0,0,0,0.5)"/>
        <circle cy="-6" r="6" fill="#c8a87a"/>
        <rect x="-5" y="0" width="10" height="12" rx="2" fill="#1a2540"/>
        <rect x="-3" y="9" width="3" height="8" rx="1" fill="#1a2540"/>
        <rect x="0" y="9" width="3" height="8" rx="1" fill="#131d30"/>
        <line x1="0" y1="3" x2="-8" y2="8" stroke="#d4a017" stroke-width="2" stroke-linecap="round"/>
        <line x1="0" y1="3" x2="8" y2="8" stroke="#d4a017" stroke-width="2" stroke-linecap="round"/>
        <text y="30" text-anchor="middle" font-size="9" fill="${theme.accent}">★</text>
      `;

      svg.appendChild(playerAvatarGroup);
      playerStartPos = { x: avatarX, y: avatarY };
    }

    // ── Progress bar ──
    const completedCount = encounters.filter(e => e.completed).length;
    const progressWrap = document.createElement('div');
    progressWrap.style.cssText = `
      position:sticky; bottom:0; left:0; right:0; z-index:50;
      background:linear-gradient(0deg,rgba(0,0,0,0.92) 0%,rgba(0,0,0,0) 100%);
      padding:16px 24px 20px;
      display:flex; flex-direction:column; align-items:center; gap:10px;
      width:100%; box-sizing:border-box;
    `;

    const progressLabel = document.createElement('div');
    progressLabel.style.cssText = `font-size:0.8rem; color:rgba(255,255,255,0.5); text-align:center;`;
    progressLabel.textContent = `进度：${completedCount} / ${N}`;
    progressWrap.appendChild(progressLabel);

    const barTrack = document.createElement('div');
    barTrack.style.cssText = `
      width:100%; max-width:300px; height:8px;
      border-radius:4px; background:rgba(255,255,255,0.12);
      overflow:hidden;
    `;
    const barFill = document.createElement('div');
    barFill.id = 'quest-progress-fill';
    barFill.style.cssText = `
      height:100%; border-radius:4px;
      background: linear-gradient(90deg, ${theme.accent} 0%, rgba(255,255,255,0.7) 100%);
      width:${(completedCount / N) * 100}%;
      transition: width 0.8s ease-out;
    `;
    barTrack.appendChild(barFill);
    progressWrap.appendChild(barTrack);

    // Action button
    const btnStart = document.createElement('button');
    btnStart.id = 'btn-start';
    btnStart.className = 'btn btn-primary';
    btnStart.style.cssText = `
      min-width:220px; font-size:1.2rem; padding:16px 36px;
      animation: btn-glow 2s ease-in-out infinite;
      letter-spacing:0.08em;
      font-weight:700;
      border-radius:12px;
      text-shadow: 0 0 8px rgba(212,160,23,0.4);
      box-shadow: 0 0 20px rgba(212,160,23,0.3), 0 4px 16px rgba(0,0,0,0.4);
    `;
    const nextEncType = currentIdx >= 0 ? encounters[currentIdx]?.type : null;
    if (nextEncType === 'boss') {
      btnStart.textContent = `⚠ 挑战${chapterBossName}`;
    } else if (nextEncType === 'treasure') {
      btnStart.textContent = '打开宝箱';
    } else if (nextEncType === 'rest') {
      btnStart.textContent = '休息一下';
    } else if (completedCount === 0) {
      btnStart.textContent = '开始冒险';
    } else {
      btnStart.textContent = '继续冒险';
    }
    progressWrap.appendChild(btnStart);

    mapWrap.appendChild(progressWrap);

    // Spacer so content doesn't hide under sticky bar
    const spacer = document.createElement('div');
    spacer.style.cssText = `height:${SVG_H + 120}px; width:100%; flex-shrink:0;`;
    content.appendChild(spacer);

    // ── Handle justFinishedEncounter: animate player walking up ──────────
    if (justFinishedEncounter) {
      // Find the encounter that was just completed
      // It's the one that IS completed but whose predecessor was the last visible current
      const justCompletedIdx = (() => {
        // walk through and find the most-recently-completed one
        for (let i = N - 1; i >= 0; i--) {
          if (encounters[i].completed) return i;
        }
        return -1;
      })();

      const nextIdx = justCompletedIdx + 1;  // the new current node (may be out of range if quest done)

      // (1) Play travel animation: player avatar walks up to completed node
      if (justCompletedIdx >= 0 && playerAvatarGroup) {
        // Player was visually at the PREVIOUS current (justCompletedIdx before completion)
        // In the new state, the node is already marked completed, but we animate anyway.
        const targetPos = nodePositions[justCompletedIdx];
        const currentG  = nodeEls[justCompletedIdx];

        // We'll animate the player SVG group upward using a CSS transform
        // First set player back to where they would have been (before this encounter)
        const prevIdx = justCompletedIdx - 1;
        const prevPos = prevIdx >= 0 ? nodePositions[prevIdx] : [startX, startY];
        const startAvatarX = prevPos[0] - (encounters[prevIdx >= 0 ? prevIdx : 0]?.type === 'boss' ? BOSS_R : NODE_R) - 30;
        const startAvatarY = prevPos[1] - 20;

        playerAvatarGroup.setAttribute('transform', `translate(${startAvatarX}, ${startAvatarY})`);

        const destX   = targetPos[0] - NODE_R - 30;
        const destY   = targetPos[1] - 20;

        // Use SMIL animate for SVG translate
        const animX = document.createElementNS('http://www.w3.org/2000/svg', 'animateTransform');
        animX.setAttribute('attributeName', 'transform');
        animX.setAttribute('attributeType', 'XML');
        animX.setAttribute('type', 'translate');
        animX.setAttribute('from', `${startAvatarX} ${startAvatarY}`);
        animX.setAttribute('to', `${destX} ${destY}`);
        animX.setAttribute('dur', '1.4s');
        animX.setAttribute('begin', '0.3s');
        animX.setAttribute('fill', 'freeze');
        animX.setAttribute('calcMode', 'spline');
        animX.setAttribute('keySplines', '0.25 0.1 0.25 1');
        playerAvatarGroup.appendChild(animX);

        // (2) After walk completes: mark node gold, update path, show companion bubble
        setTimeout(() => {
          // Flash "又前进了一步！"
          const flash = document.createElement('div');
          flash.style.cssText = `
            position:absolute; top:45%; left:50%; transform:translate(-50%,-50%);
            font-size:1.3rem; font-weight:700; color:${theme.accent};
            text-shadow: 0 0 16px ${theme.accent};
            animation: step-flash 2s ease-out both;
            z-index:100; pointer-events:none; white-space:nowrap;
          `;
          flash.textContent = '又前进了一步！';
          content.appendChild(flash);
          setTimeout(() => flash.remove(), 2100);

          // Animate node → gold / checkmark (recreate the node's visuals)
          const g = nodeEls[justCompletedIdx];
          const mainCirc = g.querySelectorAll('circle')[1];
          const iconT    = g.querySelector('text');
          if (mainCirc) {
            mainCirc.setAttribute('fill', theme.accent);
            mainCirc.setAttribute('stroke', theme.accent);
          }
          if (iconT) {
            iconT.textContent = '✓';
            iconT.setAttribute('fill', '#000');
          }

          // Animate the path segment to gold
          const seg = svg.querySelector(`[data-seg-idx="${justCompletedIdx}"]`);
          if (seg) {
            seg.setAttribute('stroke', theme.accent);
            seg.removeAttribute('stroke-dasharray');
            const totalLen = seg.getTotalLength ? seg.getTotalLength() : 200;
            seg.setAttribute('stroke-dasharray', `${totalLen}`);
            seg.setAttribute('stroke-dashoffset', `${totalLen}`);
            seg.style.transition = 'stroke-dashoffset 0.7s ease-out';
            requestAnimationFrame(() => requestAnimationFrame(() => {
              seg.setAttribute('stroke-dashoffset', '0');
            }));
          }

          // Update progress bar
          const newCompleted = encounters.filter(e => e.completed).length;
          const fill = div.querySelector('#quest-progress-fill');
          if (fill) fill.style.width = `${(newCompleted / N) * 100}%`;
          progressLabel.textContent = `进度：${newCompleted} / ${N}`;

          // (Task 4.1) Encounter-complete animation on the completed node
          const completedG = nodeEls[justCompletedIdx];
          if (completedG) {
            // Add a brief golden ring burst animation
            const completeBurst = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
            completeBurst.setAttribute('r', NODE_R);
            completeBurst.setAttribute('fill', 'none');
            completeBurst.setAttribute('stroke', theme.accent);
            completeBurst.setAttribute('stroke-width', '4');
            const burstAnimR = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            burstAnimR.setAttribute('attributeName', 'r');
            burstAnimR.setAttribute('values', `${NODE_R};${NODE_R + 40}`);
            burstAnimR.setAttribute('dur', '0.8s');
            burstAnimR.setAttribute('fill', 'freeze');
            const burstAnimOp = document.createElementNS('http://www.w3.org/2000/svg', 'animate');
            burstAnimOp.setAttribute('attributeName', 'opacity');
            burstAnimOp.setAttribute('values', '0.9;0');
            burstAnimOp.setAttribute('dur', '0.8s');
            burstAnimOp.setAttribute('fill', 'freeze');
            completeBurst.appendChild(burstAnimR);
            completeBurst.appendChild(burstAnimOp);
            completedG.appendChild(completeBurst);
            setTimeout(() => completeBurst.remove(), 900);
          }

          // (Task 4.2) Scroll the map to center on the next encounter node
          if (nextIdx < N) {
            setTimeout(() => {
              const nextNodePos = nodePositions[nextIdx];
              if (nextNodePos && mapWrap) {
                // Calculate where the next node is in the content area and scroll there
                const svgTop = 40; // top offset of SVG in content
                const targetScrollY = svgTop + nextNodePos[1] - mapWrap.clientHeight / 2;
                mapWrap.scrollTo({ top: Math.max(0, targetScrollY), behavior: 'smooth' });
              }
            }, 2200);
          }

          // Companion line
          showCompanionBubble(div, pick(COMPANION.betweenEncounters), 3500);

          // (Task 4.3) If all encounters complete, auto-navigate to reward screen
          if (newCompleted === N) {
            setTimeout(() => {
              // Celebratory flash
              const celebration = document.createElement('div');
              celebration.style.cssText = `
                position:absolute; top:40%; left:50%; transform:translate(-50%,-50%);
                font-size:1.5rem; font-weight:900; color:${theme.accent};
                text-shadow: 0 0 20px ${theme.accent}, 0 0 40px ${theme.accent};
                animation: step-flash 2.5s ease-out both;
                z-index:100; pointer-events:none; white-space:nowrap;
                text-align:center;
              `;
              celebration.textContent = '全部完成！';
              content.appendChild(celebration);

              setTimeout(() => {
                showScreen('reward');
              }, 2000);
            }, 2500);
          } else {
            // Boss warning if next node is boss
            if (nextIdx < N && encounters[nextIdx]?.type === 'boss') {
              setTimeout(() => {
                const warn = document.createElement('div');
                warn.style.cssText = `
                  position:absolute; top:35%; left:50%; transform:translate(-50%,-50%);
                  background:rgba(60,0,0,0.92); border:2px solid rgba(220,60,20,0.8);
                  border-radius:12px; padding:16px 28px;
                  font-size:1.1rem; font-weight:700; color:#ff6040;
                  text-shadow:0 0 12px rgba(220,60,20,0.8);
                  animation: boss-warning 3s ease-out both;
                  z-index:100; pointer-events:none; text-align:center;
                `;
                warn.innerHTML = `⚠ ${chapterBossName}即将出现！<br><span style="font-size:0.85rem;opacity:0.7;">做好准备！</span>`;
                content.appendChild(warn);
                setTimeout(() => warn.remove(), 3100);
              }, 1800);
            }
          }
        }, 1700);
      } else {
        // No player avatar visible (all done?), still show companion bubble
        showCompanionBubble(div, pick(COMPANION.betweenEncounters), 3000);

        // (Task 4.3) If returning and all encounters are already complete, auto-navigate
        const allDone = encounters.every(e => e.completed);
        if (allDone) {
          setTimeout(() => {
            showScreen('reward');
          }, 1500);
        }
      }
    }

    // ─── Story / encounter navigation logic (preserved from original) ────────

    const chapterIntroKey = `chapter${chapterId}_intro`;
    const chapterBossKey  = `chapter${chapterId}_boss`;
    const hasChapterIntro = Boolean(STORIES[chapterIntroKey]);
    const hasChapterBoss  = Boolean(STORIES[chapterBossKey]);

    const chapterProgress = profile.chapterProgress[chapterId] || { questsCompleted: 0 };

    function navigateToEncounter(enc) {
      if (enc.type === 'combat') showScreen('combat');
      else if (enc.type === 'puzzle') showScreen('puzzle');
      else if (enc.type === 'boss') showScreen('boss');
      else if (enc.type === 'treasure') showTreasureInline(enc);
      else if (enc.type === 'rest') showRestInline(enc);
    }

    // ── Treasure encounter (inline overlay) ───────────────────────────────
    function showTreasureInline(enc) {
      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed; inset:0; z-index:800;
        background: radial-gradient(ellipse at center, rgba(40,30,0,0.95) 0%, rgba(0,0,0,0.97) 70%);
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:20px; opacity:0; transition:opacity 0.4s ease-out;
      `;

      // Treasure chest SVG with animated opening
      overlay.innerHTML = `
        <style>
          @keyframes chest-bounce {
            0%   { transform: scale(0.3) translateY(40px); opacity:0; }
            50%  { transform: scale(1.1) translateY(-10px); opacity:1; }
            100% { transform: scale(1) translateY(0); opacity:1; }
          }
          @keyframes chest-lid {
            0%   { transform: rotateX(0deg); }
            50%  { transform: rotateX(-120deg); }
            100% { transform: rotateX(-110deg); }
          }
          @keyframes gold-burst {
            0%   { transform: scale(0); opacity:0; }
            40%  { transform: scale(1.2); opacity:1; }
            100% { transform: scale(1); opacity:1; }
          }
          @keyframes treasure-glow-pulse {
            0%,100% { box-shadow: 0 0 30px rgba(212,160,23,0.3), 0 0 60px rgba(212,160,23,0.1); }
            50%      { box-shadow: 0 0 50px rgba(212,160,23,0.6), 0 0 100px rgba(212,160,23,0.2); }
          }
          @keyframes item-float-in {
            from { transform: translateY(20px); opacity:0; }
            to   { transform: translateY(0); opacity:1; }
          }
        </style>

        <div id="treasure-chest" style="
          animation: chest-bounce 0.8s cubic-bezier(0.34,1.56,0.64,1) both;
          text-align:center;
        ">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 100" width="140" height="120" style="filter: drop-shadow(0 0 20px rgba(212,160,23,0.6));">
            <rect x="15" y="45" width="90" height="50" rx="6" fill="#5c3a10" stroke="#d4a017" stroke-width="2"/>
            <rect x="20" y="50" width="80" height="40" rx="3" fill="#3a2008"/>
            <rect x="48" y="55" width="24" height="16" rx="3" fill="#d4a017" opacity="0.9"/>
            <circle cx="60" cy="63" r="4" fill="#f0c040"/>
            <rect id="chest-lid-rect" x="15" y="30" width="90" height="20" rx="5" fill="#6b4412" stroke="#d4a017" stroke-width="2"
                  style="transform-origin: 60px 45px; animation: chest-lid 1s ease-out 0.6s both;"/>
            <rect x="45" y="34" width="30" height="12" rx="2" fill="#d4a017" opacity="0.7"
                  style="transform-origin: 60px 45px; animation: chest-lid 1s ease-out 0.6s both;"/>
          </svg>
        </div>

        <div id="treasure-rewards" style="
          text-align:center; opacity:0;
          animation: gold-burst 0.6s ease-out 1.4s both;
        ">
          <div style="font-size:2.2rem; font-weight:900; color:#f0c040;
                      text-shadow: 0 0 20px rgba(212,160,23,0.8), 0 0 40px rgba(212,160,23,0.4);
                      margin-bottom:8px;">
            +${enc.goldReward || 50} 金币
          </div>
          ${enc.itemDrop ? `
            <div style="
              font-size:1.1rem; color:#2ecc8a; margin-top:12px;
              animation: item-float-in 0.5s ease-out 1.8s both;
              text-shadow: 0 0 10px rgba(46,204,138,0.5);
            ">
              获得道具：恢复药水
            </div>
          ` : ''}
        </div>

        <button id="btn-collect-treasure" style="
          padding: 12px 36px;
          background: linear-gradient(145deg, rgba(0,0,0,0.6), rgba(20,10,0,0.7));
          border: 2px solid #d4a017;
          color: #f0c040;
          font-size: 1.2rem;
          font-weight: 700;
          letter-spacing: 0.15em;
          cursor: pointer;
          border-radius: 8px;
          font-family: var(--font-main);
          opacity:0;
          animation: item-float-in 0.5s ease-out 2s both,
                     treasure-glow-pulse 2s ease-in-out 2.5s infinite;
          transition: background 0.2s, transform 0.15s;
        ">收集宝物</button>
      `;

      div.appendChild(overlay);
      requestAnimationFrame(() => { overlay.style.opacity = '1'; });

      // Apply rewards
      const profile = gameState.profile;
      profile.gold = (profile.gold || 0) + (enc.goldReward || 50);
      if (enc.itemDrop === 'hp-potion') {
        profile.inventory = profile.inventory || [];
        profile.inventory.push({ id: 'hp-potion', name: '恢复药水', type: 'consumable' });
        if (gameState.currentQuest?.results) gameState.currentQuest.results.itemsFound.push('hp-potion');
      }
      gameState.save();

      // Mark encounter complete and advance
      setTimeout(() => {
        const btn = overlay.querySelector('#btn-collect-treasure');
        if (btn) {
          btn.addEventListener('click', () => {
            try { playSound('gold'); } catch(_) {}
            // Particle burst + gold rain on collection
            burstAtPoint(window.innerWidth / 2, window.innerHeight * 0.35, 25, 'gold', 'explode');
            enc.completed = true;
            // Brief delay for particles before fade
            setTimeout(() => { overlay.style.opacity = '0'; }, 300);
            setTimeout(() => {
              if (overlay.parentNode) overlay.remove();
              const next = advanceEncounter();
              const q = gameState.currentQuest;
              if (!next || !q) {
                showScreen('reward');
              } else {
                showScreen('quest', {
                  chapterId: q.chapterId,
                  questIndex: q.questIndex,
                  justFinishedEncounter: true,
                });
              }
            }, 400);
          });
        }
      }, 0);
    }

    // ── Rest encounter (inline overlay) ───────────────────────────────────
    function showRestInline(enc) {
      const profile = gameState.profile;
      const hpBefore = profile.hp;
      const maxHp = profile.maxHp || 100;
      const restoreAmount = Math.floor(maxHp * (enc.hpRestorePercent || 0.3));
      const hpAfter = Math.min(maxHp, hpBefore + restoreAmount);
      const narrative = enc.narrative || '你在路旁稍作休息，恢复了一些体力。';

      const overlay = document.createElement('div');
      overlay.style.cssText = `
        position:fixed; inset:0; z-index:800;
        background: radial-gradient(ellipse at center, rgba(0,20,10,0.95) 0%, rgba(0,0,0,0.97) 70%);
        display:flex; flex-direction:column; align-items:center; justify-content:center;
        gap:20px; padding:24px; opacity:0; transition:opacity 0.4s ease-out;
      `;

      overlay.innerHTML = `
        <style>
          @keyframes fire-flicker {
            0%,100% { transform: scaleY(1) scaleX(1); opacity:0.9; }
            25%     { transform: scaleY(1.05) scaleX(0.97); opacity:1; }
            50%     { transform: scaleY(0.95) scaleX(1.03); opacity:0.85; }
            75%     { transform: scaleY(1.02) scaleX(0.98); opacity:0.95; }
          }
          @keyframes rest-fade-in {
            from { transform: translateY(16px); opacity:0; }
            to   { transform: translateY(0); opacity:1; }
          }
          @keyframes hp-fill-anim {
            from { width: ${(hpBefore / maxHp) * 100}%; }
            to   { width: ${(hpAfter / maxHp) * 100}%; }
          }
          @keyframes rest-glow {
            0%,100% { text-shadow: 0 0 10px rgba(46,204,138,0.4); }
            50%      { text-shadow: 0 0 25px rgba(46,204,138,0.7); }
          }
        </style>

        <!-- Campfire SVG -->
        <div style="animation: rest-fade-in 0.6s ease-out both;">
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 120" width="100" height="120"
               style="filter: drop-shadow(0 0 20px rgba(240,140,20,0.5));">
            <!-- Logs -->
            <line x1="25" y1="100" x2="75" y2="95" stroke="#5c3a10" stroke-width="8" stroke-linecap="round"/>
            <line x1="25" y1="95" x2="75" y2="100" stroke="#4a2e0c" stroke-width="8" stroke-linecap="round"/>
            <!-- Flames -->
            <g style="animation: fire-flicker 0.8s ease-in-out infinite; transform-origin: 50px 90px;">
              <ellipse cx="50" cy="70" rx="18" ry="28" fill="#ff6600" opacity="0.7"/>
              <ellipse cx="50" cy="65" rx="12" ry="22" fill="#ff9900" opacity="0.8"/>
              <ellipse cx="50" cy="60" rx="7" ry="16" fill="#ffcc00" opacity="0.9"/>
            </g>
            <!-- Sparks -->
            <circle cx="42" cy="48" r="1.5" fill="#ffdd44" opacity="0.6">
              <animate attributeName="cy" values="48;30" dur="1.5s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.6;0" dur="1.5s" repeatCount="indefinite"/>
            </circle>
            <circle cx="58" cy="45" r="1" fill="#ffdd44" opacity="0.5">
              <animate attributeName="cy" values="45;25" dur="2s" repeatCount="indefinite"/>
              <animate attributeName="opacity" values="0.5;0" dur="2s" repeatCount="indefinite"/>
            </circle>
          </svg>
        </div>

        <!-- Narrative text -->
        <div style="
          font-size:1.05rem; color:#c8dcc0; line-height:1.8;
          max-width:340px; text-align:center;
          animation: rest-fade-in 0.6s ease-out 0.3s both;
          letter-spacing:0.03em;
        ">${narrative}</div>

        <!-- Strategic rest choices -->
        <div style="
          width:100%; max-width:340px;
          display:flex; flex-direction:column; gap:10px;
          animation: rest-fade-in 0.6s ease-out 0.6s both;
        ">
          <div style="font-size:0.85rem; color:rgba(255,255,255,0.5); text-align:center; margin-bottom:2px;">
            选择休息方式
          </div>
          <button class="rest-choice" data-hp="0.5" data-gold="0" data-wenli="0" style="
            display:flex; align-items:center; gap:12px; padding:12px 16px;
            background:rgba(46,204,138,0.1); border:1.5px solid rgba(46,204,138,0.35);
            border-radius:10px; cursor:pointer; font-family:var(--font-main);
            color:var(--text-primary); font-size:0.95rem; text-align:left;
            transition:all 0.2s; width:100%;
          ">
            <span style="font-size:1.4rem;">♨️</span>
            <div>
              <div style="font-weight:700;color:#2ecc8a;">温泉</div>
              <div style="font-size: 0.95rem;color:var(--text-secondary);">+50% HP</div>
            </div>
          </button>
          <button class="rest-choice" data-hp="0.3" data-gold="15" data-wenli="0" style="
            display:flex; align-items:center; gap:12px; padding:12px 16px;
            background:rgba(212,160,23,0.1); border:1.5px solid rgba(212,160,23,0.35);
            border-radius:10px; cursor:pointer; font-family:var(--font-main);
            color:var(--text-primary); font-size:0.95rem; text-align:left;
            transition:all 0.2s; width:100%;
          ">
            <span style="font-size:1.4rem;">🍶</span>
            <div>
              <div style="font-weight:700;color:#d4a017;">酒馆</div>
              <div style="font-size: 0.95rem;color:var(--text-secondary);">+30% HP · +15 金币</div>
            </div>
          </button>
          <button class="rest-choice" data-hp="0.2" data-gold="0" data-wenli="1" style="
            display:flex; align-items:center; gap:12px; padding:12px 16px;
            background:rgba(142,68,173,0.1); border:1.5px solid rgba(142,68,173,0.35);
            border-radius:10px; cursor:pointer; font-family:var(--font-main);
            color:var(--text-primary); font-size:0.95rem; text-align:left;
            transition:all 0.2s; width:100%;
          ">
            <span style="font-size:1.4rem;">🏛️</span>
            <div>
              <div style="font-weight:700;color:#a855f7;">寺院</div>
              <div style="font-size: 0.95rem;color:var(--text-secondary);">+20% HP · +1 文力</div>
            </div>
          </button>
        </div>
      `;

      div.appendChild(overlay);
      requestAnimationFrame(() => { overlay.style.opacity = '1'; });

      setTimeout(() => {
        overlay.querySelectorAll('.rest-choice').forEach(btn => {
          btn.addEventListener('mouseenter', () => { btn.style.transform = 'scale(1.02)'; });
          btn.addEventListener('mouseleave', () => { btn.style.transform = ''; });
          btn.addEventListener('click', () => {
            try { playSound('click'); } catch(_) {}
            const hpPct = parseFloat(btn.dataset.hp);
            const goldBonus = parseInt(btn.dataset.gold);
            const wenliBonus = parseInt(btn.dataset.wenli);

            const restoreAmt = Math.floor(maxHp * hpPct);
            profile.hp = Math.min(maxHp, hpBefore + restoreAmt);
            if (goldBonus) profile.gold = (profile.gold || 0) + goldBonus;
            if (wenliBonus) profile.wenli = Math.min(profile.maxWenli, (profile.wenli || 0) + wenliBonus);
            gameState.save();

            // Visual feedback: highlight selected choice, show restore amount
            btn.style.borderColor = '#2ecc8a';
            btn.style.boxShadow = '0 0 20px rgba(46,204,138,0.4)';
            overlay.querySelectorAll('.rest-choice').forEach(b => {
              if (b !== btn) { b.style.opacity = '0.3'; b.style.pointerEvents = 'none'; }
            });

            // Floating restore text
            const floatEl = document.createElement('div');
            floatEl.textContent = `+${restoreAmt} HP` + (goldBonus ? ` +${goldBonus}💰` : '') + (wenliBonus ? ` +${wenliBonus}文力` : '');
            floatEl.style.cssText = `
              position:fixed; top:45%; left:50%; transform:translate(-50%,0);
              color:#2ecc8a; font-size:1.4rem; font-weight:900;
              text-shadow:0 0 12px rgba(46,204,138,0.5);
              pointer-events:none; z-index:900;
              transition: transform 0.8s ease-out, opacity 0.8s ease-out;
            `;
            overlay.appendChild(floatEl);
            requestAnimationFrame(() => requestAnimationFrame(() => {
              floatEl.style.transform = 'translate(-50%, -40px)';
              floatEl.style.opacity = '0';
            }));
            setTimeout(() => floatEl.remove(), 900);

            try { playSound('heal'); } catch(_) {}
            burstAtPoint(window.innerWidth / 2, window.innerHeight * 0.4, 15, 'jade', 'fountain');
            enc.completed = true;
            setTimeout(() => { overlay.style.opacity = '0'; }, 600);
            setTimeout(() => {
              if (overlay.parentNode) overlay.remove();
              const next = advanceEncounter();
              const q = gameState.currentQuest;
              if (!next || !q) {
                showScreen('reward');
              } else {
                showScreen('quest', {
                  chapterId: q.chapterId,
                  questIndex: q.questIndex,
                  justFinishedEncounter: true,
                });
              }
            }, 1000);
          });
        });
      }, 0);
    }

    function showEncounterIntroThen(enc, onComplete) {
      showScreen('encounter-intro', { type: enc.type, onComplete });
    }

    function startFirstEncounter() {
      const enc = getCurrentEncounter();
      showEncounterIntroThen(enc, () => navigateToEncounter(enc));
    }

    function startWithBossIntro() {
      const enc = getCurrentEncounter();
      if (hasChapterBoss) {
        try { playMusic('boss'); } catch (_) {}
        showScreen('story', {
          storyKey: chapterBossKey,
          onComplete: () => showEncounterIntroThen(enc, () => showScreen('boss')),
        });
      } else {
        showEncounterIntroThen(enc, () => showScreen('boss'));
      }
    }

    btnStart.addEventListener('click', () => {
      console.log('[QUEST] START clicked');
      const enc = getCurrentEncounter();
      console.log('[QUEST] getCurrentEncounter:', enc?.type, enc ? 'exists' : 'NULL');
      if (!enc) { console.log('[QUEST] No encounter, returning'); return; }

      // Treasure and rest encounters play inline — no intro screen needed
      if (enc.type === 'treasure') {
        showTreasureInline(enc);
        return;
      }
      if (enc.type === 'rest') {
        showRestInline(enc);
        return;
      }

      if (enc.type === 'boss') {
        startWithBossIntro();
        return;
      }

      if (questIndex === 0 && !chapterProgress.introShown && hasChapterIntro) {
        chapterProgress.introShown = true;
        profile.chapterProgress[chapterId] = chapterProgress;
        gameState.save();

        const eraKey = CHAPTER_ERA[chapterId] || 'xianqin';
        try { playMusic(eraKey); } catch (_) {}

        showScreen('story', {
          storyKey: chapterIntroKey,
          onComplete: startFirstEncounter,
        });
        return;
      }

      startFirstEncounter();
    });

  }, 0);

  return div;
}

registerScreen('quest', renderQuest);
