// js/screens/quest.js — Quest encounter path visualization
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { startQuest, getCurrentEncounter } from '../game-engine.js';
import { STORIES } from './story.js';
import { playMusic } from '../audio.js';

// Map chapter IDs to era names for music
const CHAPTER_ERA = {
  1: 'xianqin',
  2: 'han',
  3: 'tang',
  4: 'song',
  5: 'modern',
};

// ─── Travel animation ─────────────────────────────────────────────────────────

function showTravelAnimation(container, onComplete) {
  // Overlay fills the container with a parallax travel scene
  const travel = document.createElement('div');
  travel.style.cssText = `
    position:absolute; inset:0; overflow:hidden; z-index:500;
    background:linear-gradient(180deg, #1a1a2e 0%, #16213e 40%, #0f3460 70%, #533483 100%);
  `;
  container.appendChild(travel);

  // ── Far layer: mountain silhouettes ──
  const mountainLayer = document.createElement('div');
  mountainLayer.style.cssText = `
    position:absolute; bottom:30%; left:0;
    width:300%; height:120px;
    pointer-events:none;
  `;
  // Build mountain shapes using inline SVG so no external assets needed
  const mtnSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  mtnSvg.setAttribute('width', '100%');
  mtnSvg.setAttribute('height', '120');
  mtnSvg.setAttribute('viewBox', '0 0 1200 120');
  mtnSvg.setAttribute('preserveAspectRatio', 'none');
  mtnSvg.style.cssText = 'display:block; width:100%; height:100%;';
  // Two repeating mountain ridge strips (wide + slightly offset) to allow seamless loop
  const mtnPath = document.createElementNS('http://www.w3.org/2000/svg', 'path');
  mtnPath.setAttribute('d', [
    'M0,120', 'L0,80', 'L60,40', 'L120,70', 'L200,20', 'L280,60',
    'L360,30', 'L440,75', 'L520,15', 'L600,50', 'L680,25', 'L760,65',
    'L840,10', 'L920,55', 'L1000,30', 'L1080,70', 'L1160,20', 'L1200,50',
    'L1200,120', 'Z',
  ].join(' '));
  mtnPath.setAttribute('fill', '#0d1b2a');
  mtnPath.setAttribute('opacity', '0.85');
  mtnSvg.appendChild(mtnPath);
  mountainLayer.appendChild(mtnSvg);
  travel.appendChild(mountainLayer);

  // ── Mid layer: trees / pagodas ──
  const treeLayer = document.createElement('div');
  treeLayer.style.cssText = `
    position:absolute; bottom:22%; left:0;
    width:300%; height:80px;
    pointer-events:none;
  `;
  const treeSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  treeSvg.setAttribute('width', '100%');
  treeSvg.setAttribute('height', '80');
  treeSvg.setAttribute('viewBox', '0 0 1200 80');
  treeSvg.setAttribute('preserveAspectRatio', 'none');
  treeSvg.style.cssText = 'display:block; width:100%; height:100%;';
  // Repeating tree/pagoda silhouettes
  const treeData = [
    // [x, treeType] — type 0 = triangle tree, type 1 = pagoda rect
    [30,0],[80,0],[130,1],[190,0],[250,0],[300,1],[370,0],[420,0],
    [480,1],[540,0],[600,0],[640,1],[700,0],[760,0],[810,1],[870,0],
    [920,0],[980,1],[1040,0],[1090,0],[1140,1],[1200,0],
  ];
  treeData.forEach(([x, type]) => {
    if (type === 0) {
      // Triangle tree
      const tri = document.createElementNS('http://www.w3.org/2000/svg', 'polygon');
      const w = 18 + Math.round(Math.random() * 12);
      const h = 30 + Math.round(Math.random() * 20);
      tri.setAttribute('points', `${x},80 ${x + w / 2},${80 - h} ${x + w},80`);
      tri.setAttribute('fill', '#162447');
      treeSvg.appendChild(tri);
    } else {
      // Pagoda-style rect stack (3 tiers)
      for (let t = 0; t < 3; t++) {
        const r = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
        const tw = 18 - t * 4;
        const th = 10;
        r.setAttribute('x', x - tw / 2);
        r.setAttribute('y', 80 - (t + 1) * (th + 2));
        r.setAttribute('width', tw);
        r.setAttribute('height', th);
        r.setAttribute('fill', '#1f4068');
        treeSvg.appendChild(r);
      }
    }
  });
  treeLayer.appendChild(treeSvg);
  travel.appendChild(treeLayer);

  // ── Near layer: ground / road strip ──
  const groundLayer = document.createElement('div');
  groundLayer.style.cssText = `
    position:absolute; bottom:0; left:0;
    width:300%; height:22%;
    background:linear-gradient(180deg, #2c3e50 0%, #1a252f 100%);
    pointer-events:none;
  `;
  // Road dashes
  const roadSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  roadSvg.setAttribute('width', '100%');
  roadSvg.setAttribute('height', '100%');
  roadSvg.style.cssText = 'position:absolute; inset:0;';
  for (let i = 0; i < 24; i++) {
    const dash = document.createElementNS('http://www.w3.org/2000/svg', 'rect');
    dash.setAttribute('x', i * 120);
    dash.setAttribute('y', '45%');
    dash.setAttribute('width', '60');
    dash.setAttribute('height', '6');
    dash.setAttribute('rx', '3');
    dash.setAttribute('fill', 'rgba(212,160,23,0.5)');
    roadSvg.appendChild(dash);
  }
  groundLayer.appendChild(roadSvg);
  travel.appendChild(groundLayer);

  // ── Player sprite walking ──
  const playerWrap = document.createElement('div');
  playerWrap.style.cssText = `
    position:absolute; bottom:22%; left:18%;
    width:48px; height:80px;
    display:flex; align-items:flex-end; justify-content:center;
    pointer-events:none;
  `;
  // Simple walking stick figure using SVG
  const walkSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
  walkSvg.setAttribute('viewBox', '0 0 32 60');
  walkSvg.setAttribute('width', '32');
  walkSvg.setAttribute('height', '60');
  walkSvg.style.cssText = 'display:block;';
  walkSvg.innerHTML = `
    <circle cx="16" cy="8" r="6" fill="#d4a017"/>
    <line x1="16" y1="14" x2="16" y2="36" stroke="#d4a017" stroke-width="3" stroke-linecap="round"/>
    <line x1="16" y1="22" x2="6"  y2="30" stroke="#d4a017" stroke-width="2.5" stroke-linecap="round" id="arm-l"/>
    <line x1="16" y1="22" x2="26" y2="30" stroke="#d4a017" stroke-width="2.5" stroke-linecap="round" id="arm-r"/>
    <line x1="16" y1="36" x2="9"  y2="52" stroke="#d4a017" stroke-width="2.5" stroke-linecap="round" id="leg-l"/>
    <line x1="16" y1="36" x2="23" y2="52" stroke="#d4a017" stroke-width="2.5" stroke-linecap="round" id="leg-r"/>
  `;
  playerWrap.appendChild(walkSvg);
  travel.appendChild(playerWrap);

  // ── Sky stars ──
  for (let s = 0; s < 40; s++) {
    const star = document.createElement('div');
    const sz = 1 + Math.random() * 2;
    star.style.cssText = `
      position:absolute;
      left:${Math.random() * 100}%;
      top:${Math.random() * 35}%;
      width:${sz}px; height:${sz}px;
      border-radius:50%; background:#fff;
      opacity:${0.3 + Math.random() * 0.7};
      pointer-events:none;
    `;
    travel.appendChild(star);
  }

  // ── CSS keyframe animation strings injected as a style element ──
  const styleEl = document.createElement('style');
  styleEl.textContent = `
    @keyframes travel-far   { from { transform:translateX(0); } to { transform:translateX(-33.33%); } }
    @keyframes travel-mid   { from { transform:translateX(0); } to { transform:translateX(-33.33%); } }
    @keyframes travel-near  { from { transform:translateX(0); } to { transform:translateX(-33.33%); } }
    @keyframes walk-bob     { 0%,100% { transform:translateY(0px); } 50% { transform:translateY(-4px); } }
    @keyframes leg-swing-l  { 0%,100% { transform-origin:16px 36px; transform:rotate(-25deg); } 50% { transform-origin:16px 36px; transform:rotate(20deg); } }
    @keyframes leg-swing-r  { 0%,100% { transform-origin:16px 36px; transform:rotate(20deg); } 50% { transform-origin:16px 36px; transform:rotate(-25deg); } }
    @keyframes arm-swing-l  { 0%,100% { transform-origin:16px 22px; transform:rotate(20deg); } 50% { transform-origin:16px 22px; transform:rotate(-20deg); } }
    @keyframes arm-swing-r  { 0%,100% { transform-origin:16px 22px; transform:rotate(-20deg); } 50% { transform-origin:16px 22px; transform:rotate(20deg); } }
  `;
  document.head.appendChild(styleEl);

  mountainLayer.style.animation = 'travel-far 4s linear infinite';
  treeLayer.style.animation    = 'travel-mid 2.5s linear infinite';
  groundLayer.style.animation  = 'travel-near 1.2s linear infinite';
  playerWrap.style.animation   = 'walk-bob 0.45s ease-in-out infinite';

  const legL = walkSvg.querySelector('#leg-l');
  const legR = walkSvg.querySelector('#leg-r');
  const armL = walkSvg.querySelector('#arm-l');
  const armR = walkSvg.querySelector('#arm-r');
  if (legL) legL.style.animation = 'leg-swing-l 0.45s ease-in-out infinite';
  if (legR) legR.style.animation = 'leg-swing-r 0.45s ease-in-out infinite';
  if (armL) armL.style.animation = 'arm-swing-l 0.45s ease-in-out infinite';
  if (armR) armR.style.animation = 'arm-swing-r 0.45s ease-in-out infinite';

  // ── Fade out after 2.5 seconds ──
  setTimeout(() => {
    travel.style.transition = 'opacity 0.5s ease-out';
    travel.style.opacity = '0';
    setTimeout(() => {
      travel.remove();
      styleEl.remove();
      onComplete();
    }, 500);
  }, 2500);
}

// ─── Node completion animation ────────────────────────────────────────────────

function animateNodeComplete(node) {
  // Border glow → gold fill → checkmark
  node.style.transition = 'background 0.4s, border-color 0.4s, box-shadow 0.4s';
  node.style.boxShadow = '0 0 12px 4px var(--accent-gold)';
  node.style.borderColor = 'var(--accent-gold)';
  setTimeout(() => {
    node.style.background = 'var(--accent-gold)';
    node.textContent = '✓';
    node.style.color = '#000';
    node.style.fontWeight = '900';
    node.style.fontSize = '1.3rem';
    setTimeout(() => {
      node.style.boxShadow = '0 0 6px 2px var(--accent-gold)';
    }, 400);
  }, 300);
}

// ─── Dotted SVG path draw animation ──────────────────────────────────────────

function animatePathDraw(svgLine) {
  if (!svgLine) return;
  const len = svgLine.getTotalLength ? svgLine.getTotalLength() : 100;
  svgLine.style.strokeDasharray = `${len}`;
  svgLine.style.strokeDashoffset = `${len}`;
  svgLine.style.transition = 'stroke-dashoffset 0.7s ease-out';
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      svgLine.style.strokeDashoffset = '0';
    });
  });
}

// ─── Main render ──────────────────────────────────────────────────────────────

function renderQuest(params) {
  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = 'position:relative; overflow:hidden;';

  const { chapterId } = params;
  const profile = gameState.profile;
  const progress = profile.chapterProgress[chapterId] || { questsCompleted: 0 };
  const questIndex = params.questIndex ?? progress.questsCompleted;

  // Flag set by combat/boss/puzzle when returning to quest after completing an encounter
  const justFinishedEncounter = params.justFinishedEncounter || false;

  div.innerHTML = `
    <h2 style="margin-bottom:0.5rem;">第${chapterId}章 · 第${questIndex + 1}关</h2>
    <p style="color:var(--text-secondary); margin-bottom:1.5rem;">准备好迎接挑战了吗？</p>
    <div id="encounter-path" style="display:flex; align-items:center; gap:0; margin-bottom:2rem; position:relative;"></div>
    <div style="display:flex; gap:12px;">
      <button class="btn btn-primary" id="btn-start">开始</button>
      <button class="btn" id="btn-back">返回</button>
    </div>
  `;

  setTimeout(async () => {
    const quest = await startQuest(chapterId, questIndex);
    const pathEl = div.querySelector('#encounter-path');

    // Build node array and SVG connector line
    const nodeEls = [];
    const svgConnectors = [];

    quest.encounters.forEach((enc, i) => {
      const icon = enc.type === 'combat' ? '⚔️' : enc.type === 'puzzle' ? '📖' : '👹';
      const completed = enc.completed;
      const isCurrent = !completed && (i === 0 || quest.encounters[i - 1]?.completed);

      const node = document.createElement('div');
      node.dataset.idx = i;
      node.style.cssText = [
        'width:48px; height:48px; border-radius:50%;',
        'display:flex; align-items:center; justify-content:center;',
        'font-size:1.3rem; position:relative; z-index:2;',
        'flex-shrink:0; transition: all 0.3s;',
        completed
          ? 'background:var(--accent-gold); border:2px solid var(--accent-gold); color:#000; font-weight:900; box-shadow:0 0 6px 2px var(--accent-gold);'
          : isCurrent
            ? 'background:var(--bg-card); border:2px solid var(--accent-gold); animation:quest-pulse 1.5s ease-in-out infinite;'
            : 'background:var(--bg-card); border:2px solid var(--bg-secondary); opacity:0.55;',
      ].join('');
      node.textContent = completed ? '✓' : icon;
      nodeEls.push(node);
      pathEl.appendChild(node);

      // Connector line between nodes
      if (i < quest.encounters.length - 1) {
        const connWrap = document.createElement('div');
        connWrap.style.cssText = 'width:32px; height:2px; position:relative; flex-shrink:0; align-self:center;';
        const connSvg = document.createElementNS('http://www.w3.org/2000/svg', 'svg');
        connSvg.setAttribute('width', '32');
        connSvg.setAttribute('height', '8');
        connSvg.style.cssText = 'position:absolute; top:-3px; left:0;';
        const connLine = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        connLine.setAttribute('x1', '2'); connLine.setAttribute('y1', '4');
        connLine.setAttribute('x2', '30'); connLine.setAttribute('y2', '4');
        connLine.setAttribute('stroke', completed ? 'var(--accent-gold)' : 'var(--bg-secondary)');
        connLine.setAttribute('stroke-width', '2');
        connLine.setAttribute('stroke-dasharray', '4 3');
        connLine.setAttribute('stroke-linecap', 'round');
        connSvg.appendChild(connLine);
        connWrap.appendChild(connSvg);
        pathEl.appendChild(connWrap);
        svgConnectors.push({ line: connLine, afterIdx: i });
      }
    });

    // Inject pulse keyframe for current node
    const pulseStyle = document.createElement('style');
    pulseStyle.textContent = `
      @keyframes quest-pulse {
        0%,100% { box-shadow:0 0 0 0 rgba(212,160,23,0.5); border-color:var(--accent-gold); }
        50%      { box-shadow:0 0 0 8px rgba(212,160,23,0); border-color:#f39c12; }
      }
    `;
    div.appendChild(pulseStyle);

    // ── If returning from an encounter, show travel animation then mark node done ──
    if (justFinishedEncounter) {
      // Find the first completed-but-not-yet-visually-marked node (the one just finished)
      const justCompletedIdx = quest.encounters.findIndex((e, i) => {
        return e.completed && nodeEls[i] && nodeEls[i].textContent !== '✓';
      });

      showTravelAnimation(div, () => {
        // Animate the completed node
        if (justCompletedIdx >= 0) {
          animateNodeComplete(nodeEls[justCompletedIdx]);
          // Animate the connecting line to the next node
          const conn = svgConnectors.find(c => c.afterIdx === justCompletedIdx);
          if (conn) {
            conn.line.setAttribute('stroke', 'var(--accent-gold)');
            animatePathDraw(conn.line);
          }
        }
      });
    }

    // Determine what story keys are available
    const chapterIntroKey = `chapter${chapterId}_intro`;
    const chapterBossKey = `chapter${chapterId}_boss`;
    const hasChapterIntro = Boolean(STORIES[chapterIntroKey]);
    const hasChapterBoss = Boolean(STORIES[chapterBossKey]);

    const chapterProgress = profile.chapterProgress[chapterId] || { questsCompleted: 0 };

    function navigateToEncounter(enc) {
      if (enc.type === 'combat') showScreen('combat');
      else if (enc.type === 'puzzle') showScreen('puzzle');
      else if (enc.type === 'boss') showScreen('boss');
    }

    function showEncounterIntroThen(enc, onComplete) {
      showScreen('encounter-intro', {
        type: enc.type,
        onComplete,
      });
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

    div.querySelector('#btn-start').addEventListener('click', () => {
      const enc = getCurrentEncounter();

      if (enc.type === 'boss') {
        startWithBossIntro();
        return;
      }

      if (questIndex === 0 && !chapterProgress.introShown && hasChapterIntro) {
        chapterProgress.introShown = true;
        profile.chapterProgress[chapterId] = chapterProgress;
        gameState.save();

        const era = CHAPTER_ERA[chapterId] || 'xianqin';
        try { playMusic(era); } catch (_) {}

        showScreen('story', {
          storyKey: chapterIntroKey,
          onComplete: startFirstEncounter,
        });
        return;
      }

      startFirstEncounter();
    });

    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
  }, 0);

  return div;
}

registerScreen('quest', renderQuest);
