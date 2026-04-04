// js/screens/chapter-map.js — Merged chapter map (Ring Fit Adventure style)
// Replaces worldmap.js + quest.js with a single scrollable vertical path per chapter
import { gameState } from '../state.js';
import { registerScreen, showScreen, ensureAudio } from '../main.js';
import { startQuest, getCurrentEncounter, advanceEncounter } from '../game-engine.js';
import { playMusic, playSound, setMusicIntensity } from '../audio.js';
import { SPRITES } from '../sprites.js';
import { getNextGoal } from '../goals.js';
import { getVisibleFeatures, getNotificationDots, getNextUnlock } from '../nav.js';
import { setParticleMode, burstAtPoint, burstParticles } from '../particles.js';
import { getXPProgress, getEffectiveMaxHp, checkDailyLogin } from '../progression.js';
import { showTutorial } from '../tutorial.js';
import { getReviewStats } from '../spaced-repetition.js';

// ─── Chapter data ─────────────────────────────────────────────────────────────
const CHAPTERS = [
  { id: 1, era: '先秦', name: '文字起源', subtitle: '仓颉之影正在从源头毁灭文字……', boss: '仓颉之影', quests: 5, color: '#c17f3c', colorDim: 'rgba(193,127,60,0.15)', icon: '甲' },
  { id: 2, era: '汉代', name: '史记风云', subtitle: '司马迁的历史正在被篡改……', boss: '墨吏', quests: 5, color: '#d63031', colorDim: 'rgba(214,48,49,0.15)', icon: '漢' },
  { id: 3, era: '唐代', name: '诗词盛世', subtitle: '长安城的诗歌正在碎裂……', boss: '诗魔', quests: 5, color: '#d4a017', colorDim: 'rgba(212,160,23,0.15)', icon: '唐' },
  { id: 4, era: '宋代', name: '词赋纵横', subtitle: '词中的情感正在被吞噬……', boss: '词煞', quests: 5, color: '#2ecc8a', colorDim: 'rgba(46,204,138,0.15)', icon: '宋' },
  { id: 5, era: '近现代', name: '墨暗之源', subtitle: '一切的终结……或者新的开始', boss: '墨暗之主', quests: 5, color: '#a855f7', colorDim: 'rgba(168,85,247,0.15)', icon: '暗' },
];

const ERA_MUSIC = { 1: 'prequin', 2: 'han', 3: 'tang', 4: 'song', 5: 'modern' };
const ENCOUNTER_ICONS = { combat: '⚔', puzzle: '📖', boss: '👹', treasure: '💰', rest: '🏕' };

// Named locations per quest within each chapter
const QUEST_NAMES = {
  1: ['甲骨洞窟', '竹简山谷', '青铜殿堂', '论语古林', '仓颉神殿'],
  2: ['丝绸古道', '长城烽火', '太史公书房', '未央宫廷', '墨吏殿'],
  3: ['曲江春宴', '华清池畔', '翰林学院', '大雁塔下', '诗魔幻境'],
  4: ['汴京夜市', '西湖烟雨', '岳阳楼台', '清明上河', '词煞迷宫'],
  5: ['新文化书局', '白话文广场', '鲁迅故居', '文脉裂隙', '墨暗深渊'],
};
const QUEST_ICONS = {
  1: ['🦴', '🎋', '🏺', '📜', '👁'],
  2: ['🐫', '🔥', '📖', '🏯', '⚖'],
  3: ['🌸', '♨️', '🏛', '🗼', '🌀'],
  4: ['🏮', '🌧', '🏔', '🎨', '🌑'],
  5: ['📚', '📣', '🏠', '⚡', '🕳'],
};

// ─── State ────────────────────────────────────────────────────────────────────
let currentChapterId = 1;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getChapterUnlocked(profile, chapterId) {
  if (chapterId === 1) return true;
  const prevChapter = CHAPTERS.find(c => c.id === chapterId - 1);
  if (!prevChapter) return false;
  const cp = profile.chapterProgress?.[chapterId - 1];
  return cp && cp.questsCompleted >= prevChapter.quests;
}

function getQuestStatus(profile, chapterId, questIndex) {
  const cp = profile.chapterProgress?.[chapterId];
  const completed = cp ? cp.questsCompleted : 0;
  if (questIndex < completed) return 'completed';
  if (questIndex === completed) return 'current';
  return 'locked';
}

function getStarRating(profile, chapterId, questIndex) {
  return profile.questStars?.[`${chapterId}-${questIndex}`] || 0;
}

function getTotalChapterStars(profile, chapterId) {
  const ch = CHAPTERS.find(c => c.id === chapterId);
  if (!ch) return 0;
  let total = 0;
  for (let i = 0; i < ch.quests; i++) total += getStarRating(profile, chapterId, i);
  return total;
}

// ─── Inject styles ────────────────────────────────────────────────────────────

function injectStyles() {
  if (document.getElementById('chmap-styles')) return;
  const s = document.createElement('style');
  s.id = 'chmap-styles';
  s.textContent = `
    @keyframes chmap-pulse { 0%,100% { opacity:0.4; } 50% { opacity:1; } }
    @keyframes chmap-breathe { 0%,100% { transform: translateY(0); } 50% { transform: translateY(-2px); } }
    @keyframes chmap-gate-open { from { opacity:0.3; transform:scaleX(0.5); } to { opacity:1; transform:scaleX(1); } }
    @keyframes chmap-star-pop { from { transform:scale(0); } to { transform:scale(1); } }

    .chmap-root {
      position: absolute; inset: 0; display: flex; flex-direction: column;
      background: var(--bg-deep, #0b0c1a); overflow: hidden;
    }
    .chmap-header {
      flex-shrink: 0; padding: 10px 16px 8px; z-index: 10;
      background: linear-gradient(180deg, rgba(11,12,26,0.95) 0%, rgba(11,12,26,0.7) 100%);
      border-bottom: 1px solid rgba(255,255,255,0.08);
    }
    .chmap-era-title {
      font-size: 1.1rem; font-weight: 800; letter-spacing: 0.06em;
    }
    .chmap-era-sub { font-size: 0.78rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
    .chmap-progress-bar {
      height: 6px; border-radius: 3px; background: rgba(255,255,255,0.08); margin-top: 6px; overflow: hidden;
    }
    .chmap-progress-fill { height: 100%; border-radius: 3px; transition: width 0.6s ease-out; }

    .chmap-goal {
      flex-shrink: 0; margin: 6px 12px; padding: 8px 14px; border-radius: 10px;
      background: rgba(212,160,23,0.08); border: 1px solid rgba(212,160,23,0.2);
      display: flex; align-items: center; gap: 8px; cursor: pointer; z-index: 10;
      font-size: 0.85rem; color: var(--accent-gold, #d4a017);
    }
    .chmap-goal-icon { font-size: 1.1rem; }
    .chmap-goal-text { flex: 1; }
    .chmap-goal-progress {
      height: 4px; border-radius: 2px; background: rgba(255,255,255,0.1); margin-top: 4px; overflow: hidden;
    }
    .chmap-goal-progress-fill { height: 100%; border-radius: 2px; background: var(--accent-gold, #d4a017); }

    .chmap-scroll {
      flex: 1; overflow-y: auto; overflow-x: hidden; position: relative;
      -webkit-overflow-scrolling: touch;
    }
    .chmap-content {
      position: relative; min-height: 100%; width: 100%;
    }

    .chmap-nav {
      flex-shrink: 0; display: flex; justify-content: center; gap: 4px;
      padding: 8px 8px calc(8px + env(safe-area-inset-bottom, 0px));
      background: rgba(11,12,26,0.95); border-top: 1px solid rgba(255,255,255,0.08);
      z-index: 10; flex-wrap: wrap;
    }
    .chmap-nav-btn {
      position: relative; padding: 6px 12px; border-radius: 8px; border: 1px solid rgba(255,255,255,0.12);
      background: transparent; color: rgba(255,255,255,0.7); font-size: 0.78rem; cursor: pointer;
      transition: background 0.15s, color 0.15s;
    }
    .chmap-nav-btn:hover { background: rgba(255,255,255,0.06); color: #fff; }
    .chmap-nav-dot {
      position: absolute; top: 2px; right: 2px; width: 8px; height: 8px;
      border-radius: 50%; border: 1px solid rgba(11,12,26,0.8);
    }
    .chmap-nav-dot.red { background: #e74c3c; }
    .chmap-nav-dot.yellow { background: #f39c12; }

    .chmap-unlock-teaser {
      flex-shrink: 0; text-align: center; padding: 4px 12px; font-size: 0.75rem;
      color: rgba(212,160,23,0.6); z-index: 10;
    }

    /* Chapter selector overlay */
    .chmap-selector-overlay {
      position: fixed; inset: 0; z-index: 10050;
      background: rgba(5,5,15,0.85); backdrop-filter: blur(6px);
      display: flex; align-items: center; justify-content: center;
    }
    .chmap-selector-card {
      width: 90%; max-width: 360px; background: rgba(20,20,35,0.98);
      border: 1.5px solid rgba(212,160,23,0.3); border-radius: 16px;
      padding: 20px; max-height: 80vh; overflow-y: auto;
    }
    .chmap-selector-title {
      text-align: center; font-size: 1.1rem; font-weight: 800;
      color: var(--accent-gold, #d4a017); margin-bottom: 16px;
    }
    .chmap-ch-item {
      display: flex; align-items: center; gap: 12px; padding: 12px;
      border-radius: 10px; margin-bottom: 8px; cursor: pointer;
      border: 1px solid rgba(255,255,255,0.08);
      transition: background 0.15s;
    }
    .chmap-ch-item:hover { background: rgba(255,255,255,0.04); }
    .chmap-ch-item.locked { opacity: 0.4; cursor: default; }
    .chmap-ch-icon {
      width: 40px; height: 40px; border-radius: 50%; display: flex;
      align-items: center; justify-content: center; font-size: 1.2rem; font-weight: 800;
    }
    .chmap-ch-info { flex: 1; }
    .chmap-ch-name { font-weight: 700; font-size: 0.95rem; color: #fff; }
    .chmap-ch-status { font-size: 0.75rem; color: rgba(255,255,255,0.5); margin-top: 2px; }
    .chmap-selector-close {
      display: block; margin: 12px auto 0; padding: 8px 28px; border-radius: 8px;
      border: 1px solid rgba(255,255,255,0.15); background: transparent;
      color: rgba(255,255,255,0.7); cursor: pointer; font-size: 0.9rem;
    }

    /* SVG node styles */
    .chmap-node { cursor: pointer; }
    .chmap-node.locked { cursor: default; opacity: 0.25; }
    .chmap-node.future { opacity: 0.45; }
    .chmap-node-stars {
      font-size: 0.65rem; fill: #d4a017; text-anchor: middle;
    }
    .chmap-gate-line {
      stroke: rgba(255,255,255,0.15); stroke-width: 2; stroke-dasharray: 8 4;
    }
    .chmap-gate-label {
      font-size: 0.6rem; fill: rgba(255,255,255,0.4); text-anchor: middle;
    }

    @media (prefers-reduced-motion: reduce) {
      .chmap-progress-fill { transition: none; }
    }
  `;
  document.head.appendChild(s);
}

// ─── Chapter selector overlay ─────────────────────────────────────────────────

function showChapterSelector(profile, onSelect) {
  const overlay = document.createElement('div');
  overlay.className = 'chmap-selector-overlay';
  const card = document.createElement('div');
  card.className = 'chmap-selector-card';
  card.innerHTML = `<div class="chmap-selector-title">选择章节</div>`;

  CHAPTERS.forEach(ch => {
    const unlocked = getChapterUnlocked(profile, ch.id);
    const cp = profile.chapterProgress?.[ch.id];
    const completed = cp ? cp.questsCompleted : 0;
    const stars = getTotalChapterStars(profile, ch.id);
    const maxStars = ch.quests * 3;
    const isDone = completed >= ch.quests;

    const item = document.createElement('div');
    item.className = `chmap-ch-item${unlocked ? '' : ' locked'}`;
    item.innerHTML = `
      <div class="chmap-ch-icon" style="background:${ch.colorDim};color:${ch.color};border:1.5px solid ${ch.color};">${ch.icon}</div>
      <div class="chmap-ch-info">
        <div class="chmap-ch-name" style="color:${unlocked ? ch.color : 'rgba(255,255,255,0.3)'};">${ch.era}·${ch.name}</div>
        <div class="chmap-ch-status">${unlocked ? (isDone ? `✅ ${completed}/${ch.quests} ★${stars}/${maxStars}` : `🔓 ${completed}/${ch.quests} 征途`) : '🔒 未解锁'}</div>
      </div>
    `;
    if (unlocked) {
      item.addEventListener('click', () => { overlay.remove(); onSelect(ch.id); });
    }
    card.appendChild(item);
  });

  const closeBtn = document.createElement('button');
  closeBtn.className = 'chmap-selector-close';
  closeBtn.textContent = '关闭';
  closeBtn.addEventListener('click', () => overlay.remove());
  card.appendChild(closeBtn);

  overlay.appendChild(card);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) overlay.remove(); });
  document.body.appendChild(overlay);
}

// ─── SVG path helpers ─────────────────────────────────────────────────────────

function buildWindingPath(points) {
  if (points.length < 2) return '';
  let d = `M ${points[0][0]} ${points[0][1]}`;
  for (let i = 1; i < points.length; i++) {
    const [px, py] = points[i - 1];
    const [cx, cy] = points[i];
    const cpx1 = px;
    const cpy1 = py + (cy - py) * 0.4;
    const cpx2 = cx;
    const cpy2 = py + (cy - py) * 0.6;
    d += ` C ${cpx1} ${cpy1}, ${cpx2} ${cpy2}, ${cx} ${cy}`;
  }
  return d;
}

// ─── Main render ──────────────────────────────────────────────────────────────

function renderChapterMap(params = {}) {
  injectStyles();
  ensureAudio(); // Ensure audio is initialized by the time we reach the map
  const profile = gameState.profile;

  // Check daily login
  checkDailyLogin(profile);

  // Determine which chapter to show — reset to 1 if current chapter is locked
  if (params.chapterId) currentChapterId = params.chapterId;
  if (!getChapterUnlocked(profile, currentChapterId)) currentChapterId = 1;
  const chapter = CHAPTERS.find(c => c.id === currentChapterId) || CHAPTERS[0];

  // Play era music
  playMusic(ERA_MUSIC[chapter.id] || 'menu');

  const div = document.createElement('div');
  div.className = 'screen chmap-root';

  // ── Chapter progress ──
  const cp = profile.chapterProgress?.[chapter.id];
  const questsCompleted = cp ? cp.questsCompleted : 0;
  const progressPct = Math.round((questsCompleted / chapter.quests) * 100);

  // ── Header ──
  const header = document.createElement('div');
  header.className = 'chmap-header';
  header.innerHTML = `
    <div class="chmap-era-title" style="color:${chapter.color};">${chapter.era}·${chapter.name}</div>
    <div class="chmap-era-sub">${chapter.subtitle}</div>
    <div class="chmap-progress-bar">
      <div class="chmap-progress-fill" style="width:${progressPct}%;background:${chapter.color};"></div>
    </div>
    <div style="display:flex;justify-content:space-between;margin-top:4px;font-size:0.72rem;color:rgba(255,255,255,0.4);">
      <span>${questsCompleted}/${chapter.quests} 征途</span>
      <span>Lv.${profile.level} · ${profile.gold || 0}金</span>
    </div>
  `;
  div.appendChild(header);

  // ── Goal card ──
  const goal = getNextGoal(profile);
  const goalEl = document.createElement('div');
  goalEl.className = 'chmap-goal';
  goalEl.innerHTML = `
    <span class="chmap-goal-icon">${goal.icon || '🎯'}</span>
    <div class="chmap-goal-text">
      ${goal.text}
      ${goal.progress != null ? `<div class="chmap-goal-progress"><div class="chmap-goal-progress-fill" style="width:${Math.round(goal.progress * 100)}%;"></div></div>` : ''}
    </div>
  `;
  goalEl.addEventListener('click', () => {
    if (goal.screen && goal.screen !== 'chapter-map') showScreen(goal.screen);
  });
  div.appendChild(goalEl);

  // ── Scrollable map content ──
  const scroll = document.createElement('div');
  scroll.className = 'chmap-scroll';
  const content = document.createElement('div');
  content.className = 'chmap-content';

  // ── Build all encounter nodes for all quests in this chapter ──
  const SVG_W = 320;
  const NODE_R = 24;
  const BOSS_R = 36;
  const QUEST_GAP = 50; // vertical space between quest segments
  const NODE_SPACING = 70; // vertical space between nodes

  // Build flat list of all nodes
  const allNodes = []; // { questIndex, encounterIndex, type, status, x, y }
  const gatePositions = []; // { y, questIndex, unlocked }

  // Generate encounter patterns for each quest (uses same logic as game-engine.js)
  const patterns = [
    ['combat', 'puzzle', 'combat', 'puzzle', 'boss'],
    ['combat', 'combat', 'puzzle', 'combat', 'boss'],
    ['combat', 'puzzle', 'combat', 'combat', 'boss'],
  ];

  let totalHeight = 80; // starting Y offset from bottom

  for (let qi = 0; qi < chapter.quests; qi++) {
    const questStatus = getQuestStatus(profile, chapter.id, qi);
    const pattern = patterns[(chapter.id + qi) % patterns.length];

    // Add gate before this quest (except first)
    if (qi > 0) {
      gatePositions.push({ y: totalHeight, questIndex: qi, unlocked: questStatus !== 'locked' });
      totalHeight += QUEST_GAP;
    }

    for (let ei = 0; ei < pattern.length; ei++) {
      const type = pattern[ei];
      let nodeStatus;
      if (questStatus === 'completed') {
        nodeStatus = 'completed';
      } else if (questStatus === 'current') {
        // Check against actual current encounter in gameState
        const quest = gameState.currentQuest;
        const isSameQuest = quest && quest.chapterId === chapter.id && quest.questIndex === qi;
        if (isSameQuest) {
          nodeStatus = ei < quest.currentEncounter ? 'completed' : ei === quest.currentEncounter ? 'current' : 'future';
        } else {
          nodeStatus = ei === 0 ? 'current' : 'future';
        }
      } else {
        nodeStatus = 'locked';
      }

      // X position: sinusoidal weave
      const amp = SVG_W * 0.2 * (1 - (ei / (pattern.length - 1)) * 0.3);
      const globalIdx = allNodes.length;
      const wave = Math.sin(globalIdx * Math.PI * 0.65 + Math.PI * 0.3);
      const x = SVG_W / 2 + wave * amp;

      allNodes.push({
        questIndex: qi, encounterIndex: ei, type, status: nodeStatus,
        x, y: totalHeight,
        stars: (questStatus === 'completed' && ei === pattern.length - 1) ? getStarRating(profile, chapter.id, qi) : 0,
        isBoss: type === 'boss',
      });
      totalHeight += NODE_SPACING;
    }
  }

  // SVG dimensions
  const SVG_H = totalHeight + 60;
  content.style.height = SVG_H + 'px';

  // ── Draw SVG ──
  const svg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  svg.setAttribute('width', SVG_W);
  svg.setAttribute('height', SVG_H);
  svg.style.cssText = `position:absolute;top:0;left:50%;transform:translateX(-50%);z-index:1;overflow:visible;`;

  // SVG is drawn bottom-up: node y=0 is bottom, but SVG y=0 is top
  // Flip Y: svgY = SVG_H - nodeY
  const flipY = y => SVG_H - y;

  // Draw paths between consecutive nodes
  for (let i = 1; i < allNodes.length; i++) {
    const prev = allNodes[i - 1];
    const curr = allNodes[i];
    // Check if crossing a gate
    const crossesGate = prev.questIndex !== curr.questIndex;
    if (crossesGate) continue; // don't draw path across gates

    const pts = [[prev.x, flipY(prev.y)], [curr.x, flipY(curr.y)]];
    const pathEl = document.createElementNS('http://www.w3.org/2000/svg', 'path');
    pathEl.setAttribute('d', buildWindingPath(pts));
    pathEl.setAttribute('fill', 'none');
    pathEl.setAttribute('stroke-width', '4');

    if (curr.status === 'completed' || prev.status === 'completed') {
      pathEl.setAttribute('stroke', chapter.color);
      pathEl.setAttribute('opacity', '0.6');
    } else if (curr.status === 'current' || curr.status === 'future') {
      pathEl.setAttribute('stroke', 'rgba(255,255,255,0.15)');
      pathEl.setAttribute('stroke-dasharray', '8 4');
    } else {
      pathEl.setAttribute('stroke', 'rgba(255,255,255,0.06)');
      pathEl.setAttribute('stroke-dasharray', '4 8');
    }
    svg.appendChild(pathEl);
  }

  // Draw gates
  gatePositions.forEach(gate => {
    const gy = flipY(gate.y + QUEST_GAP / 2);
    const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
    line.setAttribute('x1', SVG_W * 0.15); line.setAttribute('x2', SVG_W * 0.85);
    line.setAttribute('y1', gy); line.setAttribute('y2', gy);
    line.setAttribute('class', 'chmap-gate-line');
    if (gate.unlocked) line.setAttribute('opacity', '0.3');
    svg.appendChild(line);

    const label = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    label.setAttribute('x', SVG_W / 2); label.setAttribute('y', gy - 6);
    label.setAttribute('class', 'chmap-gate-label');
    label.textContent = gate.unlocked ? `─ 征途 ${gate.questIndex + 1} ─` : `🔒 征途 ${gate.questIndex + 1}`;
    svg.appendChild(label);
  });

  // Draw nodes
  let currentNodeY = null;
  allNodes.forEach((node, idx) => {
    const ny = flipY(node.y);
    const r = node.isBoss ? BOSS_R : NODE_R;
    const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');
    g.setAttribute('class', `chmap-node ${node.status}`);
    g.setAttribute('transform', `translate(${node.x}, ${ny})`);

    // Circle
    const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
    circle.setAttribute('r', r);
    circle.setAttribute('stroke-width', node.isBoss ? '3' : '2');

    if (node.status === 'completed') {
      circle.setAttribute('fill', chapter.colorDim);
      circle.setAttribute('stroke', chapter.color);
    } else if (node.status === 'current') {
      circle.setAttribute('fill', 'rgba(212,160,23,0.15)');
      circle.setAttribute('stroke', '#d4a017');
      circle.setAttribute('stroke-dasharray', '6 3');
      circle.style.animation = 'chmap-pulse 1.8s ease-in-out infinite';
      currentNodeY = ny;
    } else if (node.status === 'future') {
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', 'rgba(255,255,255,0.15)');
    } else { // locked
      circle.setAttribute('fill', 'transparent');
      circle.setAttribute('stroke', 'rgba(255,255,255,0.06)');
    }
    g.appendChild(circle);

    // Icon
    const icon = document.createElementNS('http://www.w3.org/2000/svg', 'text');
    icon.setAttribute('text-anchor', 'middle');
    icon.setAttribute('dominant-baseline', 'central');
    icon.setAttribute('font-size', node.isBoss ? '18' : '14');
    if (node.status === 'completed') {
      icon.textContent = '✓';
      icon.setAttribute('fill', chapter.color);
    } else if (node.status === 'locked') {
      icon.textContent = '·';
      icon.setAttribute('fill', 'rgba(255,255,255,0.2)');
    } else {
      icon.textContent = ENCOUNTER_ICONS[node.type] || '⚔';
      icon.setAttribute('fill', node.status === 'current' ? '#d4a017' : 'rgba(255,255,255,0.5)');
    }
    g.appendChild(icon);

    // Stars (for completed quest boss nodes)
    if (node.stars > 0) {
      const starsText = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      starsText.setAttribute('y', r + 14);
      starsText.setAttribute('class', 'chmap-node-stars');
      starsText.textContent = '★'.repeat(node.stars) + '☆'.repeat(3 - node.stars);
      g.appendChild(starsText);
    }

    // Player sprite on current node
    if (node.status === 'current') {
      const sprite = document.createElementNS('http://www.w3.org/2000/svg', 'text');
      sprite.setAttribute('y', -(r + 12));
      sprite.setAttribute('text-anchor', 'middle');
      sprite.setAttribute('font-size', '22');
      sprite.style.animation = 'chmap-breathe 2.5s ease-in-out infinite';
      sprite.textContent = '🧑‍🎓';
      g.appendChild(sprite);
    }

    // Click handler
    if (node.status === 'current' || node.status === 'completed') {
      g.style.cursor = 'pointer';
      g.addEventListener('click', () => {
        playSound('click');
        launchEncounter(chapter.id, node.questIndex, node.encounterIndex);
      });
    }

    svg.appendChild(g);
  });

  content.appendChild(svg);

  // ── Start marker at bottom ──
  const startLabel = document.createElement('div');
  startLabel.style.cssText = `position:absolute;bottom:20px;left:50%;transform:translateX(-50%);
    font-size:0.75rem;color:rgba(255,255,255,0.3);text-align:center;z-index:2;`;
  startLabel.textContent = '─ 起点 ─';
  content.appendChild(startLabel);

  scroll.appendChild(content);
  div.appendChild(scroll);

  // ── Auto-scroll to current node ──
  if (currentNodeY != null) {
    setTimeout(() => {
      const targetScroll = currentNodeY - scroll.clientHeight / 2;
      scroll.scrollTo({ top: Math.max(0, targetScroll), behavior: 'smooth' });
    }, 100);
  }

  // ── Next unlock teaser ──
  const nextUnlock = getNextUnlock(profile);
  if (nextUnlock) {
    const teaser = document.createElement('div');
    teaser.className = 'chmap-unlock-teaser';
    teaser.textContent = `⬆ Level ${nextUnlock.level} 解锁：${nextUnlock.name} ${nextUnlock.icon}`;
    div.appendChild(teaser);
  }

  // ── Bottom nav ──
  const features = getVisibleFeatures(profile);
  const dots = getNotificationDots(profile);
  const nav = document.createElement('div');
  nav.className = 'chmap-nav';

  const navItems = [
    { key: 'chapters', label: '📜 章节', action: () => showChapterSelector(profile, id => { currentChapterId = id; showScreen('chapter-map', { chapterId: id }); }) },
    { key: 'inventory', label: '🎒 背包', action: () => showScreen('inventory') },
    { key: 'shop', label: '🏪 商店', action: () => showScreen('shop') },
    { key: 'daily', label: '📅 日常', action: () => showScreen('daily') },
    { key: 'arena', label: '⚔ 竞技', action: () => showScreen('arena') },
    { key: 'story', label: '📖 故事', action: () => showScreen('story', { storyKey: `chapter${currentChapterId}_intro` }) },
    { key: 'settings', label: '⚙️', action: () => showScreen('settings', { returnTo: 'chapter-map' }) },
  ];

  navItems.forEach(item => {
    if (!features[item.key] && item.key !== 'chapters') return;
    const btn = document.createElement('button');
    btn.className = 'chmap-nav-btn';
    btn.textContent = item.label;
    if (dots[item.key]) {
      const dot = document.createElement('span');
      dot.className = `chmap-nav-dot ${dots[item.key]}`;
      btn.appendChild(dot);
    }
    btn.addEventListener('click', () => { playSound('click'); item.action(); });
    nav.appendChild(btn);
  });

  div.appendChild(nav);

  // ── Tutorial for first visit ──
  if (profile.level === 1) {
    setTimeout(() => {
      showTutorial(div, 'tutorial_worldmap', {
        targetSelector: '.chmap-node.current',
        position: 'bottom',
      });
    }, 500);
  }

  // ── Handle resume from reward ──
  if (params.resume) {
    setParticleMode('victory');
    burstParticles(20, 'victory');
  }

  // After first quest completion, play opening cinematic (once)
  if (!profile.openingStorySeen && profile.chapterProgress?.[1]?.questsCompleted >= 1) {
    profile.openingStorySeen = true;
    gameState.save();
    setTimeout(() => {
      showScreen('story', { storyKey: 'opening' });
    }, 1500);
  }

  return div;
}

// ─── Encounter launch ─────────────────────────────────────────────────────────

async function launchEncounter(chapterId, questIndex, encounterIndex) {
  const quest = gameState.currentQuest;

  // Start quest if not already in progress for this quest
  if (!quest || quest.chapterId !== chapterId || quest.questIndex !== questIndex) {
    await startQuest(chapterId, questIndex);
  }

  const encounter = getCurrentEncounter();
  if (!encounter) return;

  // Determine which screen to show
  const type = encounter.type;
  if (type === 'combat') {
    showScreen('combat', { chapterId, questIndex });
  } else if (type === 'puzzle') {
    showScreen('puzzle', { chapterId, questIndex });
  } else if (type === 'boss') {
    showScreen('boss', { chapterId, questIndex });
  } else if (type === 'treasure') {
    // Handle treasure inline — apply gold, advance, re-render
    const profile = gameState.profile;
    profile.gold = (profile.gold || 0) + (encounter.goldReward || 30);
    if (encounter.itemDrop) {
      if (!profile.consumables) profile.consumables = {};
      profile.consumables[encounter.itemDrop] = (profile.consumables[encounter.itemDrop] || 0) + 1;
    }
    encounter.completed = true;
    advanceEncounter();
    gameState.save();
    playSound('gold');
    showScreen('chapter-map', { chapterId });
  } else if (type === 'rest') {
    // Handle rest inline — restore HP, advance, re-render
    const profile = gameState.profile;
    profile.hp = Math.min(profile.maxHp, profile.hp + Math.round(profile.maxHp * (encounter.hpRestorePercent || 0.3)));
    encounter.completed = true;
    advanceEncounter();
    gameState.save();
    showScreen('chapter-map', { chapterId });
  } else {
    // Unknown type — skip
    encounter.completed = true;
    advanceEncounter();
    showScreen('chapter-map', { chapterId });
  }
}

// ─── Register ─────────────────────────────────────────────────────────────────

registerScreen('chapter-map', renderChapterMap);
