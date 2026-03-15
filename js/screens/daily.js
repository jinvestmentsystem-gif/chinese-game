// js/screens/daily.js — Daily challenge encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadContent, pickQuestions, pickReadingPassage } from '../content-loader.js';
import { recordAnswer } from '../game-engine.js';
import { addXP } from '../progression.js';

function getDailySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

async function renderDaily() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const today = getDailySeed();

  // Check if already completed today
  if (profile.lastDailyDate === today) {
    div.innerHTML = `
      <h2>每日挑战</h2>
      <p style="margin:1rem 0; color:var(--text-secondary);">今日挑战已完成！明天再来吧。</p>
      <p style="color:var(--accent-gold);">连续打卡：${profile.dailyStreak} 天</p>
      <button class="btn" id="btn-back" style="margin-top:1.5rem;">返回</button>
    `;
    setTimeout(() => {
      div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    }, 0);
    return div;
  }

  const content = await loadContent(profile.tier);
  const rng = seededRandom(today + profile.tier);

  // Seeded shuffle to ensure deterministic daily selection
  function seededPick(arr, count) {
    const shuffled = [...arr].sort((a, b) => rng() - 0.5);
    return shuffled.slice(0, count);
  }

  // Pick 3 vocab + 1 reading passage + 2 classical = mixed challenge
  const recentVocab = profile.seenQuestions.vocab.slice(-20);
  const recentReading = profile.seenQuestions.reading.slice(-10);
  const recentClassical = profile.seenQuestions.classical.slice(-20);
  const vocabQs = seededPick(content.vocab.filter(q => !recentVocab.includes(q.id)), 3);
  const availPassages = content.reading.filter(p => !recentReading.includes(p.id));
  const passage = availPassages.length > 0 ? seededPick(availPassages, 1)[0] : content.reading[0];
  const classicalQs = seededPick(content.classical.filter(q => !recentClassical.includes(q.id)), 2);

  // Build a sequence of all questions with type tags
  const sequence = [
    ...vocabQs.map(q => ({ ...q, contentType: 'vocab' })),
    ...passage.questions.map(q => ({ ...q, contentType: 'reading', passageTitle: passage.title, passageText: passage.passage })),
    ...classicalQs.map(q => ({ ...q, contentType: 'classical' })),
  ];

  let qIndex = 0;
  let correct = 0;
  let total = 0;

  // Init quest-like tracking for recordAnswer
  gameState.currentQuest = {
    chapterId: 0, questIndex: 0,
    encounters: [], currentEncounter: 0,
    results: { correct: 0, total: 0, combo: 0, maxCombo: 0, xpEarned: 0, itemsFound: [] },
  };

  function render() {
    if (qIndex >= sequence.length) { endDaily(); return; }
    const q = sequence[qIndex];
    const typeLabel = { vocab: '字词', reading: '阅读', classical: '文言文' }[q.contentType];
    const contextHTML = q.passageText
      ? `<div style="background:var(--bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px;line-height:1.8;max-height:200px;overflow-y:auto;"><strong>${q.passageTitle}</strong><br>${q.passageText}</div>`
      : '';
    const optionsHTML = q.options.map((opt, i) => `
      <button class="daily-option" data-idx="${i}" style="font-family:var(--font-main);font-size:1rem;padding:12px 20px;background:var(--bg-card);border:2px solid var(--bg-secondary);color:var(--text-primary);border-radius:8px;cursor:pointer;text-align:left;transition:all 0.2s;">${opt}</button>
    `).join('');

    div.innerHTML = `
      <h2 style="margin-bottom:4px;">每日挑战</h2>
      <div style="color:var(--text-secondary);margin-bottom:16px;">第 ${qIndex+1}/${sequence.length} 题 · ${typeLabel}</div>
      ${contextHTML}
      <div style="font-size:1.2rem;margin-bottom:20px;padding:0 32px;text-align:center;">${q.prompt}</div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:550px;width:100%;padding:0 32px;">${optionsHTML}</div>
      <div id="feedback" style="font-size:0.95rem;color:var(--text-secondary);margin-top:12px;text-align:center;min-height:2em;padding:0 32px;"></div>
    `;

    div.querySelectorAll('.daily-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const isCorrect = idx === q.correct;
        div.querySelectorAll('.daily-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) { b.style.borderColor = 'var(--accent-jade)'; b.style.background = 'rgba(39,174,96,0.2)'; }
          else if (bIdx === idx) { b.style.borderColor = 'var(--accent-red)'; b.style.background = 'rgba(192,57,43,0.2)'; }
        });
        recordAnswer(q.contentType, isCorrect);
        total++;
        if (isCorrect) correct++;
        div.querySelector('#feedback').textContent = isCorrect
          ? `✓ 正确！${q.explanation}`
          : `✗ 错误。${q.explanation}`;
        setTimeout(() => { qIndex++; render(); }, 2000);
      });
    });
  }

  function endDaily() {
    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySeed = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    if (profile.lastDailyDate === yesterdaySeed) {
      profile.dailyStreak++;
    } else {
      profile.dailyStreak = 1;
    }
    profile.lastDailyDate = today;

    const streakBonus = Math.min(profile.dailyStreak * 5, 50);
    const baseXP = correct * 10;
    const totalXP = baseXP + streakBonus;
    const levelUp = addXP(totalXP);
    gameState.save();

    div.innerHTML = `
      <h2 style="margin-bottom:1.5rem;">每日挑战完成！</h2>
      <div style="background:var(--bg-card);border-radius:8px;padding:24px 40px;">
        <div style="font-size:1.1rem;margin-bottom:8px;">正确率: <span style="color:var(--accent-gold);font-weight:700;">${Math.round(correct/total*100)}%</span> (${correct}/${total})</div>
        <div style="font-size:1.1rem;margin-bottom:8px;">连续打卡: <span style="color:var(--accent-jade);font-weight:700;">${profile.dailyStreak} 天</span></div>
        <div style="font-size:1.1rem;margin-bottom:8px;">经验: <span style="color:var(--accent-gold);font-weight:700;">+${totalXP} XP</span> (含打卡奖励 +${streakBonus})</div>
        ${levelUp ? `<div style="font-size:1.2rem;color:var(--accent-gold);font-weight:700;margin-top:8px;">升级到 Lv.${levelUp.newLevel}！</div>` : ''}
      </div>
      <button class="btn btn-primary" id="btn-back" style="margin-top:1.5rem;">返回</button>
    `;
    setTimeout(() => {
      div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    }, 0);
  }

  render();
  return div;
}

registerScreen('daily', renderDaily);
