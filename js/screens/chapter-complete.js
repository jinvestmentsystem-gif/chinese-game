// js/screens/chapter-complete.js — Cinematic chapter completion celebration screen
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playStinger, playMusic, setMusicIntensity } from '../audio.js';
import { showCompanionBubble, COMPANION, pick } from './companion.js';

// ── Chapter completion data ────────────────────────────────────────────────────

const CHAPTER_COMPLETION = {
  1: {
    title: '第一章完成！',
    subtitle: '先秦·文字起源',
    color: '#c17f3c',
    colorDim: 'rgba(193,127,60,0.15)',
    narrative: '仓颉之影被击败了！古老的文字重新焕发光芒，甲骨上的符文再次有了生命。但墨暗的威胁还远未结束……黑暗的根源在历史长河的更深处等待着你。',
    companion: '太棒了！仓颉之影已经消散了。但这只是开始——前方还有更强大的敌人在等着我们。准备好了吗？',
    nextChapter: '下一章：汉代·史记风云',
    nextHint: '司马迁的历史正在被篡改……你能阻止吗？',
    stats: '先秦时代的文字已被守护',
    era: 'han',
  },
  2: {
    title: '第二章完成！',
    subtitle: '汉代·史记风云',
    color: '#d63031',
    colorDim: 'rgba(214,48,49,0.15)',
    narrative: '墨吏的阴谋被彻底揭穿！司马迁的史记得以完整流传。历史的真相因你而保全，但墨暗之力正在诗词的世界里蔓延……',
    companion: '历史被保护下来了！司马迁的精神会永远流传。不过……我感觉到长安城的诗歌正在呻吟，我们必须去！',
    nextChapter: '下一章：唐代·诗词盛世',
    nextHint: '长安城的诗歌正在碎裂，诗魔即将降临……',
    stats: '汉代史籍已得到守护',
    era: 'tang',
  },
  3: {
    title: '第三章完成！',
    subtitle: '唐代·诗词盛世',
    color: '#d4a017',
    colorDim: 'rgba(212,160,23,0.15)',
    narrative: '诗魔在千年诗篇的光辉中灰飞烟灭！李白、杜甫的诗句重新回荡在长安城的每一条街巷。但盛世的背后，宋词的世界正在悄然哭泣……',
    companion: '我们做到了！那些美丽的诗句都回来了……等等，那边——宋朝的词牌声音越来越弱了，快走！',
    nextChapter: '下一章：宋代·词赋纵横',
    nextHint: '词中蕴含的千年情感，正被词煞一一吞噬……',
    stats: '盛唐诗篇已重焕光芒',
    era: 'song',
  },
  4: {
    title: '第四章完成！',
    subtitle: '宋代·词赋纵横',
    color: '#2ecc8a',
    colorDim: 'rgba(46,204,138,0.15)',
    narrative: '词煞被击溃！苏轼、李清照的词作中饱含的情感再次复苏，流淌在每一位读者的心间。然而，这一切的幕后黑手——墨暗之主——终于现身了……',
    companion: '感觉到了吗？整个文字世界都在颤抖……墨暗之主已经等待我们太久了。这是最后的战役，我们一起面对他！',
    nextChapter: '最终章：近现代·墨暗之源',
    nextHint: '一切的终结，或者新的开始——墨暗之主在等待……',
    stats: '宋词情感已被守护',
    era: 'modern',
  },
  5: {
    title: '恭喜通关！',
    subtitle: '文字侠的传说',
    color: '#8e44ad',
    colorDim: 'rgba(142,68,173,0.15)',
    narrative: '墨暗之主轰然倒下！千年文字的光辉穿透了一切黑暗，从甲骨文到现代汉字，每一个字符都重新焕发了生命。你，文字侠，用知识和勇气守护了中华文明最珍贵的宝藏。',
    companion: '你做到了……文字的力量因你而永存。从先秦到现代，你穿越了整个历史，守护了每一个字。谢谢你，文字侠。我会永远记住这段旅程……',
    nextChapter: null,
    nextHint: null,
    stats: '五千年文字文明已被守护',
    era: 'menu',
    isEnding: true,
  },
};

// ── Gold particle burst ───────────────────────────────────────────────────────

function spawnGoldParticles(container, count = 40) {
  const cx = container.offsetWidth / 2;
  const cy = container.offsetHeight * 0.28;

  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.4;
    const dist = 60 + Math.random() * 120;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 30; // bias upward
    const size = 4 + Math.random() * 6;
    const delay = Math.random() * 200;

    dot.style.cssText = `
      position:absolute;
      left:${cx}px; top:${cy}px;
      width:${size}px; height:${size}px;
      border-radius:50%;
      background: ${Math.random() > 0.5 ? '#d4a017' : '#f5c842'};
      pointer-events:none; z-index:30;
      transform:translate(-50%,-50%) scale(0);
      transition: transform ${0.5 + Math.random() * 0.4}s ease-out ${delay}ms,
                  opacity ${0.4 + Math.random() * 0.3}s ease-out ${delay + 300}ms;
      opacity:1;
    `;
    container.appendChild(dot);

    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dot.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`;
        dot.style.opacity = '0';
      });
    });

    setTimeout(() => dot.remove(), 1200 + delay);
  }
}

// ── Typewriter effect ─────────────────────────────────────────────────────────

function typewriterText(el, text, charsPerMs = 30, onDone) {
  el.textContent = '';
  let i = 0;
  const total = text.length;
  const interval = setInterval(() => {
    el.textContent += text[i];
    i++;
    if (i >= total) {
      clearInterval(interval);
      if (onDone) onDone();
    }
  }, 1000 / charsPerMs);
  return interval;
}

// ── Main render ───────────────────────────────────────────────────────────────

function renderChapterComplete() {
  const quest = gameState.currentQuest;
  const profile = gameState.profile;
  const chapterId = quest?.chapterId || 1;
  const data = CHAPTER_COMPLETION[chapterId] || CHAPTER_COMPLETION[1];
  const isEnding = !!data.isEnding;

  // Inject keyframe styles once
  if (!document.getElementById('chcompl-styles')) {
    const s = document.createElement('style');
    s.id = 'chcompl-styles';
    s.textContent = `
      @keyframes chcompl-slam {
        0%   { transform: scale(3) translateY(-20px); opacity: 0; }
        60%  { transform: scale(0.92) translateY(0); opacity: 1; }
        80%  { transform: scale(1.06); }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes chcompl-vignette-pulse {
        0%,100% { opacity: 0.55; }
        50%      { opacity: 0.80; }
      }
      @keyframes chcompl-bg-shift {
        0%   { background-position: 0% 50%; }
        50%  { background-position: 100% 50%; }
        100% { background-position: 0% 50%; }
      }
      @keyframes chcompl-fade-up {
        from { opacity: 0; transform: translateY(24px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      @keyframes chcompl-slide-left {
        from { opacity: 0; transform: translateX(-40px); }
        to   { opacity: 1; transform: translateX(0); }
      }
      @keyframes chcompl-btn-pulse {
        0%,100% { box-shadow: 0 0 0 0 rgba(212,160,23,0.7); }
        50%      { box-shadow: 0 0 0 14px rgba(212,160,23,0); }
      }
      @keyframes chcompl-new-badge {
        0%,100% { transform: scale(1); box-shadow: 0 0 6px 0 rgba(212,160,23,0.6); }
        50%      { transform: scale(1.12); box-shadow: 0 0 14px 2px rgba(212,160,23,0.8); }
      }
      @keyframes chcompl-star-spin {
        from { transform: rotate(0deg) scale(0); opacity:0; }
        60%  { transform: rotate(380deg) scale(1.2); opacity:1; }
        100% { transform: rotate(360deg) scale(1); opacity:1; }
      }
    `;
    document.head.appendChild(s);
  }

  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = `
    position: relative; overflow: hidden;
    background: linear-gradient(135deg, #1a0e00, #2a1500, #0d0800, #1f1000);
    background-size: 400% 400%;
    animation: chcompl-bg-shift 8s ease-in-out infinite;
    display: flex; flex-direction: column; align-items: center;
    justify-content: flex-start; padding: 0; gap: 0;
  `;

  // Gold vignette overlay
  const vignette = document.createElement('div');
  vignette.style.cssText = `
    position: absolute; inset: 0; pointer-events: none; z-index: 5;
    background: radial-gradient(ellipse at center, transparent 35%, rgba(180,120,0,0.25) 70%, rgba(120,70,0,0.55) 100%);
    animation: chcompl-vignette-pulse 3s ease-in-out infinite;
  `;
  div.appendChild(vignette);

  // Scrollable content wrapper
  const content = document.createElement('div');
  content.style.cssText = `
    position: relative; z-index: 10;
    width: 100%; max-width: 640px;
    padding: 48px 24px 120px;
    display: flex; flex-direction: column; align-items: center; gap: 0;
  `;
  div.appendChild(content);

  // ── TITLE (hidden, slams in at 500ms) ──────────────────────────────────────

  const titleEl = document.createElement('div');
  titleEl.style.cssText = `
    font-size: ${isEnding ? '2.8rem' : '2.4rem'};
    font-weight: 900;
    color: #d4a017;
    text-shadow: 0 0 30px rgba(212,160,23,0.8), 0 0 60px rgba(212,160,23,0.4), 0 2px 8px rgba(0,0,0,0.8);
    letter-spacing: 0.06em;
    text-align: center;
    opacity: 0;
    margin-bottom: 8px;
    line-height: 1.1;
  `;
  titleEl.textContent = data.title;
  content.appendChild(titleEl);

  // ── SUBTITLE (fades in at 1000ms) ──────────────────────────────────────────

  const subtitleEl = document.createElement('div');
  subtitleEl.style.cssText = `
    font-size: 1.1rem;
    color: rgba(212,160,23,0.7);
    letter-spacing: 0.15em;
    text-align: center;
    opacity: 0;
    margin-bottom: 32px;
    transition: opacity 0.6s ease-out;
  `;
  subtitleEl.textContent = data.subtitle;
  content.appendChild(subtitleEl);

  // ── NARRATIVE (typewriter at 1500ms) ───────────────────────────────────────

  const narrativeWrap = document.createElement('div');
  narrativeWrap.style.cssText = `
    width: 100%;
    background: rgba(212,160,23,0.06);
    border: 1px solid rgba(212,160,23,0.18);
    border-radius: 12px;
    padding: 20px 24px;
    margin-bottom: 28px;
    opacity: 0;
    transition: opacity 0.5s ease-out;
  `;
  const narrativeEl = document.createElement('div');
  narrativeEl.style.cssText = `
    font-size: 1rem;
    color: rgba(255,230,150,0.9);
    line-height: 1.75;
    letter-spacing: 0.04em;
    min-height: 2.5em;
  `;
  narrativeWrap.appendChild(narrativeEl);
  content.appendChild(narrativeWrap);

  // ── STATS (slide in at 3000ms) ─────────────────────────────────────────────

  const statsWrap = document.createElement('div');
  statsWrap.style.cssText = `
    width: 100%;
    display: flex; flex-direction: column; gap: 10px;
    margin-bottom: 28px;
    opacity: 0;
    transform: translateX(-40px);
    transition: opacity 0.5s ease-out, transform 0.5s ease-out;
  `;
  content.appendChild(statsWrap);

  // Calculate stats from quest results
  const results = quest?.results || { correct: 0, total: 0, maxCombo: 0, xpEarned: 0 };
  const accuracy = results.total > 0 ? Math.round((results.correct / results.total) * 100) : 0;

  function buildStatRow(icon, label, value, color = '#d4a017') {
    const row = document.createElement('div');
    row.style.cssText = `
      display: flex; align-items: center; gap: 12px;
      background: rgba(0,0,0,0.3);
      border: 1px solid rgba(212,160,23,0.12);
      border-radius: 8px; padding: 10px 16px;
    `;
    row.innerHTML = `
      <span style="font-size:1.3rem;width:28px;text-align:center;">${icon}</span>
      <span style="font-size:0.9rem;color:rgba(255,255,255,0.6);flex:1;">${label}</span>
      <span style="font-size:1.05rem;font-weight:700;color:${color};">${value}</span>
    `;
    return row;
  }

  statsWrap.appendChild(buildStatRow('⚔️', '本章最终战绩', data.stats, '#d4a017'));
  statsWrap.appendChild(buildStatRow('🎯', '正确率', `${accuracy}%`, accuracy >= 85 ? '#2ecc8a' : accuracy >= 60 ? '#d4a017' : '#e74c3c'));
  statsWrap.appendChild(buildStatRow('🔥', '最高连击', `${results.maxCombo}`, '#e67e22'));
  statsWrap.appendChild(buildStatRow('✨', '获得经验', `+${results.xpEarned || 0} XP`, '#a29bfe'));

  // ── NEXT CHAPTER PREVIEW (fades in at 5000ms) ──────────────────────────────

  const nextWrap = document.createElement('div');
  nextWrap.style.cssText = `
    width: 100%;
    opacity: 0;
    transition: opacity 0.7s ease-out;
    margin-bottom: 32px;
  `;
  content.appendChild(nextWrap);

  if (isEnding) {
    // Game ending — special treatment
    const endBox = document.createElement('div');
    endBox.style.cssText = `
      text-align: center;
      padding: 28px 24px;
      background: linear-gradient(135deg, rgba(142,68,173,0.15), rgba(212,160,23,0.1));
      border: 1px solid rgba(142,68,173,0.35);
      border-radius: 16px;
    `;
    endBox.innerHTML = `
      <div style="font-size:3rem;margin-bottom:12px;animation:chcompl-star-spin 1s ease-out forwards;">★</div>
      <div style="font-size:1.4rem;font-weight:900;color:#d4a017;letter-spacing:0.1em;margin-bottom:12px;">
        文字侠的传说
      </div>
      <div style="font-size:0.95rem;color:rgba(255,220,140,0.8);line-height:1.8;letter-spacing:0.04em;">
        你守护了五千年的文明。<br>
        从甲骨文的刻划，到史记的书写，<br>
        从盛唐的诗篇，到宋词的柔情，<br>
        再到现代，每一个字都因你而存续。<br><br>
        <em style="color:rgba(212,160,23,0.7);">这段旅程将永远铭刻在文字的历史之中。</em>
      </div>
    `;
    nextWrap.appendChild(endBox);
  } else if (data.nextChapter) {
    const nextBox = document.createElement('div');
    nextBox.style.cssText = `
      padding: 20px 24px;
      background: rgba(0,0,0,0.4);
      border: 1px solid rgba(212,160,23,0.2);
      border-left: 4px solid ${data.color};
      border-radius: 8px;
      position: relative;
      overflow: hidden;
    `;
    const previewLabel = document.createElement('div');
    previewLabel.style.cssText = `
      font-size: 0.72rem; color: rgba(212,160,23,0.6);
      letter-spacing: 0.18em; text-transform: uppercase;
      margin-bottom: 8px;
    `;
    previewLabel.textContent = '下一章预告';
    const nextTitle = document.createElement('div');
    nextTitle.style.cssText = `
      font-size: 1.15rem; font-weight: 700; color: #fff;
      margin-bottom: 6px; letter-spacing: 0.04em;
    `;
    nextTitle.textContent = data.nextChapter;
    const nextHint = document.createElement('div');
    nextHint.style.cssText = `
      font-size: 0.92rem; color: rgba(255,200,100,0.7);
      font-style: italic; letter-spacing: 0.03em;
    `;
    nextHint.textContent = data.nextHint;

    // "NEW!" badge
    const newBadge = document.createElement('div');
    newBadge.style.cssText = `
      position: absolute; top: 14px; right: 16px;
      background: #d4a017; color: #000;
      font-size: 0.68rem; font-weight: 900;
      padding: 3px 8px; border-radius: 4px;
      letter-spacing: 0.12em;
      animation: chcompl-new-badge 1.5s ease-in-out infinite;
    `;
    newBadge.textContent = 'NEW!';

    nextBox.appendChild(previewLabel);
    nextBox.appendChild(nextTitle);
    nextBox.appendChild(nextHint);
    nextBox.appendChild(newBadge);
    nextWrap.appendChild(nextBox);
  }

  // ── BUTTONS (fade in at 6000ms) ────────────────────────────────────────────

  const btnRow = document.createElement('div');
  btnRow.style.cssText = `
    display: flex; gap: 14px; flex-wrap: wrap; justify-content: center;
    opacity: 0;
    transition: opacity 0.5s ease-out;
  `;
  content.appendChild(btnRow);

  const btnContinue = document.createElement('button');
  btnContinue.className = 'btn btn-primary';
  btnContinue.style.cssText = `
    font-size: 1.05rem; padding: 14px 28px;
    animation: none;
  `;
  btnContinue.textContent = isEnding ? '回到起点' : '继续冒险 →';

  const btnAchiev = document.createElement('button');
  btnAchiev.className = 'btn';
  btnAchiev.style.cssText = `font-size: 1rem; padding: 12px 20px;`;
  btnAchiev.textContent = '查看成就';

  btnRow.appendChild(btnContinue);
  btnRow.appendChild(btnAchiev);

  // ── Timed sequence ─────────────────────────────────────────────────────────

  // 0ms: play victory stinger, screen visible
  try { playStinger('victory'); } catch (_) {}

  // 500ms: title SLAMS in
  setTimeout(() => {
    titleEl.style.animation = 'chcompl-slam 0.65s cubic-bezier(0.34,1.56,0.64,1) forwards';
    spawnGoldParticles(div, isEnding ? 60 : 40);
  }, 500);

  // 1000ms: subtitle fades in
  setTimeout(() => {
    subtitleEl.style.opacity = '1';
  }, 1000);

  // 1500ms: narrative typewriter
  setTimeout(() => {
    narrativeWrap.style.opacity = '1';
    typewriterText(narrativeEl, data.narrative, 28);
  }, 1500);

  // 3000ms: stats slide in
  setTimeout(() => {
    statsWrap.style.opacity = '1';
    statsWrap.style.transform = 'translateX(0)';
  }, 3000);

  // 4000ms: companion celebration bubble
  setTimeout(() => {
    showCompanionBubble(div, data.companion, isEnding ? 8000 : 5000);
  }, 4000);

  // 5000ms: next chapter preview fades in
  setTimeout(() => {
    nextWrap.style.opacity = '1';
    // Switch music to next era's ambient
    try {
      playMusic(data.era);
      setMusicIntensity(0);
    } catch (_) {}
  }, 5000);

  // 6000ms: buttons appear with pulse
  setTimeout(() => {
    btnRow.style.opacity = '1';
    btnContinue.style.animation = 'chcompl-btn-pulse 1.8s ease-in-out infinite';
  }, 6000);

  // Button handlers
  btnContinue.addEventListener('click', () => {
    if (isEnding) {
      showScreen('title');
    } else {
      showScreen('worldmap');
    }
  });
  btnAchiev.addEventListener('click', () => showScreen('chengyu'));

  return div;
}

registerScreen('chapter-complete', renderChapterComplete);
