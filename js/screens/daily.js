// js/screens/daily.js — Daily challenge encounter (enhanced)
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadContent, pickQuestions, pickReadingPassage } from '../content-loader.js';
import { recordAnswer } from '../game-engine.js';
import { addXP } from '../progression.js';
import { playSound, playMusic, setMusicIntensity, playStinger } from '../audio.js';

function getDailySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
}

// Migrate old 0-indexed month format ("2026-2-18" meant March) to 1-indexed ("2026-3-18").
// ALL saves created before this fix use 0-indexed months, so migrate unconditionally once.
function _migrateOldSeeds(profile) {
  if (profile._dailySeedMigrated) return;
  const migrateSeed = s => {
    if (!s || typeof s !== 'string') return s;
    const m = s.match(/^(\d{4})-(\d{1,2})-(\d{1,2})$/);
    if (!m) return s;
    return `${m[1]}-${parseInt(m[2], 10) + 1}-${m[3]}`;
  };
  const history = profile.dailyHistory || [];
  if (history.length > 0) {
    profile.dailyHistory = history.map(migrateSeed);
  }
  if (profile.lastDailyDate) {
    profile.lastDailyDate = migrateSeed(profile.lastDailyDate);
  }
  profile._dailySeedMigrated = true;
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

// Build a streak calendar for the last 7 days
function buildStreakCalendar(profile) {
  const today = new Date();
  const days = [];
  const dayLabels = ['日', '一', '二', '三', '四', '五', '六'];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const seed = `${d.getFullYear()}-${d.getMonth() + 1}-${d.getDate()}`;
    const played = profile.dailyHistory && profile.dailyHistory.includes(seed);
    const isToday = i === 0;
    days.push({
      label: dayLabels[d.getDay()],
      date: d.getDate(),
      played,
      isToday,
    });
  }
  return days;
}

// Calculate today's reward preview based on streak
function getTodayRewardPreview(streak) {
  const baseXP = 60; // 6 questions * 10xp
  const streakBonus = Math.min((streak + 1) * 5, 50);
  return { baseXP, streakBonus, totalXP: baseXP + streakBonus };
}

// Star rating based on accuracy
function getStarRating(accuracy) {
  if (accuracy >= 85) return 3;
  if (accuracy >= 60) return 2;
  return 1;
}

async function renderDaily() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  // Ensure dailyHistory exists
  if (!profile.dailyHistory) profile.dailyHistory = [];

  // Migrate old 0-indexed month seeds if needed (persists flag to avoid re-running)
  if (!profile._dailySeedMigrated) { _migrateOldSeeds(profile); gameState.save(); }

  const today = getDailySeed();

  // Daily challenge music
  playMusic('tang');

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes daily-fire-pulse {
      0%, 100% { transform: scale(1); }
      50% { transform: scale(1.15); }
    }
    @keyframes daily-countdown-ring {
      from { stroke-dashoffset: 0; }
      to { stroke-dashoffset: 283; }
    }
    @keyframes daily-slide-up {
      from { opacity: 0; transform: translateY(20px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes daily-combo-pop {
      0% { transform: scale(1); }
      50% { transform: scale(1.3); }
      100% { transform: scale(1); }
    }
    @keyframes daily-star-spin {
      from { transform: scale(0) rotate(-180deg); }
      to { transform: scale(1) rotate(0deg); }
    }
    @keyframes daily-streak-grow {
      from { width: 0%; }
    }
    @keyframes daily-share-copied {
      0% { transform: translateY(0); opacity: 1; }
      100% { transform: translateY(-20px); opacity: 0; }
    }
    @keyframes daily-timer-warn {
      0%, 100% { color: var(--accent-red); }
      50% { color: #ff6b6b; }
    }
    @keyframes daily-btn-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(212,160,23,0.4); }
      50% { box-shadow: 0 0 20px rgba(212,160,23,0.8); }
    }
    .daily-calendar-dot {
      width: 36px; height: 36px; border-radius: 50%;
      display: flex; flex-direction: column; align-items: center; justify-content: center;
      font-size: 0.7rem; transition: all 0.3s;
    }
    .daily-calendar-dot.played {
      background: var(--accent-jade); color: #fff; box-shadow: 0 0 8px rgba(39,174,96,0.4);
    }
    .daily-calendar-dot.missed {
      background: var(--bg-secondary); color: var(--text-secondary);
    }
    .daily-calendar-dot.today {
      border: 2px solid var(--accent-gold);
    }
    .daily-option-enhanced {
      font-family: var(--font-main); font-size: 1rem;
      padding: 12px 20px; background: var(--bg-card);
      border: 2px solid var(--bg-secondary); color: var(--text-primary);
      border-radius: 8px; cursor: pointer; text-align: left;
      transition: all 0.2s; position: relative; overflow: hidden;
    }
    .daily-option-enhanced:hover {
      border-color: var(--accent-gold); transform: translateX(4px);
    }
    .daily-tracker-bar {
      display: flex; align-items: center; justify-content: space-between;
      padding: 8px 16px; background: rgba(0,0,0,0.3); border-radius: 8px;
      margin-bottom: 12px; gap: 12px; flex-wrap: wrap;
    }
    .daily-tracker-item {
      display: flex; align-items: center; gap: 4px; font-size: 0.85rem;
    }
    .daily-post-star {
      display: inline-block;
      animation: daily-star-spin 0.5s cubic-bezier(0.175, 0.885, 0.32, 1.275) forwards;
      transform: scale(0);
    }
    .daily-streak-bar-bg {
      width: 100%; height: 8px; background: var(--bg-secondary);
      border-radius: 4px; overflow: hidden; margin-top: 4px;
    }
    .daily-streak-bar-fill {
      height: 100%; border-radius: 4px;
      background: linear-gradient(90deg, var(--accent-jade), var(--accent-gold));
      animation: daily-streak-grow 1s ease-out forwards;
    }
  `;
  div.appendChild(style);

  // Already completed today: show summary
  if (profile.lastDailyDate === today) {
    const bestScore = profile.dailyBestScore || 0;
    const bestAcc = profile.dailyBestAccuracy || 0;
    div.innerHTML += `
      <h2 style="margin-bottom:0.5rem;">每日挑战</h2>
      <p style="margin:0.5rem 0; color:var(--text-secondary);">今日挑战已完成！明天再来吧。</p>
      <div style="display:flex;align-items:center;gap:6px;margin:0.5rem 0;">
        <span style="font-size:1.5rem;animation:daily-fire-pulse 1s infinite;">🔥</span>
        <span style="color:var(--accent-gold);font-size:1.2rem;font-weight:700;">连续打卡：${profile.dailyStreak} 天</span>
      </div>
      <div style="background:var(--bg-card);border-radius:8px;padding:16px 24px;margin:1rem 0;">
        <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:4px;">个人最佳</div>
        <div style="font-size:1rem;margin-bottom:4px;">最高分: <span style="color:var(--accent-gold);font-weight:700;">${bestScore}</span></div>
        <div style="font-size:1rem;">最佳正确率: <span style="color:var(--accent-jade);font-weight:700;">${bestAcc}%</span></div>
      </div>
      <button class="btn" id="btn-back" style="margin-top:1rem;">返回</button>
    `;
    setTimeout(() => {
      div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    }, 0);
    return div;
  }

  // === PRE-CHALLENGE SCREEN ===
  const calendarDays = buildStreakCalendar(profile);
  const rewardPreview = getTodayRewardPreview(profile.dailyStreak);
  const fireIcons = profile.dailyStreak > 0
    ? Array(Math.min(profile.dailyStreak, 7)).fill('🔥').join('')
    : '';

  const preDiv = document.createElement('div');
  preDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:100%;max-width:520px;animation:daily-slide-up 0.5s ease-out;';

  const calendarHTML = calendarDays.map(d => {
    const cls = `daily-calendar-dot ${d.played ? 'played' : 'missed'} ${d.isToday ? 'today' : ''}`;
    return `<div class="${cls}">
      <span style="font-size:0.9rem;opacity:0.7;">${d.label}</span>
      <span style="font-weight:700;">${d.played ? '✓' : d.date}</span>
    </div>`;
  }).join('');

  preDiv.innerHTML = `
    <h2 style="margin-bottom:0.3rem;">每日挑战</h2>
    ${fireIcons ? `<div style="font-size:1.5rem;margin-bottom:0.5rem;animation:daily-fire-pulse 1s infinite;">${fireIcons}</div>` : ''}
    <div style="color:var(--accent-gold);font-size:1.1rem;font-weight:700;margin-bottom:1rem;">
      ${profile.dailyStreak > 0 ? `连续打卡 ${profile.dailyStreak} 天` : '开始你的连续打卡之旅！'}
    </div>

    <div style="margin-bottom:1.2rem;">
      <div style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:8px;text-align:center;">近7天打卡记录</div>
      <div style="display:flex;gap:6px;justify-content:center;">${calendarHTML}</div>
    </div>

    <div style="background:var(--bg-card);border-radius:8px;padding:16px 24px;margin-bottom:1.2rem;width:100%;text-align:center;">
      <div style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:6px;">今日奖励预览</div>
      <div style="display:flex;gap:16px;justify-content:center;flex-wrap:wrap;">
        <div><span style="color:var(--accent-gold);font-weight:700;">+${rewardPreview.baseXP}</span> <span style="font-size:0.95rem;color:var(--text-secondary);">基础XP</span></div>
        <div><span style="color:var(--accent-jade);font-weight:700;">+${rewardPreview.streakBonus}</span> <span style="font-size:0.95rem;color:var(--text-secondary);">打卡奖励</span></div>
      </div>
      ${profile.dailyStreak >= 3 ? `<div style="margin-top:6px;font-size:0.95rem;color:var(--accent-gold);">x${Math.min(Math.floor(profile.dailyStreak / 3) + 1, 5)} 连击倍率加成</div>` : ''}
    </div>

    <div style="position:relative;width:80px;height:80px;margin-bottom:1rem;" id="daily-countdown-container">
      <svg width="80" height="80" viewBox="0 0 100 100" style="transform:rotate(-90deg);">
        <circle cx="50" cy="50" r="45" fill="none" stroke="var(--bg-secondary)" stroke-width="6"/>
        <circle id="daily-countdown-ring" cx="50" cy="50" r="45" fill="none" stroke="var(--accent-gold)" stroke-width="6"
          stroke-dasharray="283" stroke-dashoffset="283" stroke-linecap="round"
          style="transition:stroke-dashoffset 3s linear;"/>
      </svg>
      <div id="daily-countdown-text" style="position:absolute;top:50%;left:50%;transform:translate(-50%,-50%);font-size:1.5rem;font-weight:700;color:var(--accent-gold);">3</div>
    </div>

    <button class="btn btn-primary" id="daily-start-btn" style="font-size:1.1rem;padding:12px 32px;animation:daily-btn-glow 2s infinite;">
      开始挑战
    </button>
  `;

  div.appendChild(preDiv);

  setTimeout(() => {
    const startBtn = div.querySelector('#daily-start-btn');
    if (startBtn) {
      startBtn.addEventListener('click', () => {
        playSound('daily');
        playStinger('battle_start');
        setTimeout(() => setMusicIntensity(1), 300);
        startCountdown();
      });
    }
  }, 0);

  async function startCountdown() {
    const countdownText = div.querySelector('#daily-countdown-text');
    const countdownRing = div.querySelector('#daily-countdown-ring');
    const startBtn = div.querySelector('#daily-start-btn');

    if (startBtn) startBtn.style.display = 'none';

    // Animate ring fill
    requestAnimationFrame(() => {
      if (countdownRing) countdownRing.style.strokeDashoffset = '0';
    });

    let count = 3;
    if (countdownText) countdownText.textContent = count;

    const countInterval = setInterval(() => {
      count--;
      if (countdownText) {
        countdownText.textContent = count > 0 ? count : '开始!';
        countdownText.style.transform = 'translate(-50%,-50%) scale(1.3)';
        setTimeout(() => {
          if (countdownText) countdownText.style.transform = 'translate(-50%,-50%) scale(1)';
        }, 150);
      }
      if (count <= 0) {
        clearInterval(countInterval);
        setTimeout(() => startChallenge(), 500);
      }
    }, 1000);
  }

  async function startChallenge() {
    const content = await loadContent(profile.tier);
    const rng = seededRandom(today + profile.tier);

    function seededPick(arr, count) {
      const shuffled = [...arr].sort((a, b) => rng() - 0.5);
      return shuffled.slice(0, count);
    }

    const recentVocab = profile.seenQuestions.vocab.slice(-20);
    const recentReading = profile.seenQuestions.reading.slice(-10);
    const recentClassical = profile.seenQuestions.classical.slice(-20);
    const vocabQs = seededPick(content.vocab.filter(q => !recentVocab.includes(q.id)), 3);
    const availPassages = content.reading.filter(p => !recentReading.includes(p.id));
    const passage = availPassages.length > 0 ? seededPick(availPassages, 1)[0] : content.reading[0];
    const classicalQs = seededPick(content.classical.filter(q => !recentClassical.includes(q.id)), 2);

    const sequence = [
      ...vocabQs.map(q => ({ ...q, contentType: 'vocab' })),
      ...passage.questions.map(q => ({ ...q, contentType: 'reading', passageTitle: passage.title, passageText: passage.passage })),
      ...classicalQs.map(q => ({ ...q, contentType: 'classical' })),
    ];

    let qIndex = 0;
    let correct = 0;
    let total = 0;
    let combo = 0;
    let maxCombo = 0;
    let timerInterval = null;

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
        <button class="daily-option-enhanced" data-idx="${i}">${opt}</button>
      `).join('');

      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 100;

      div.innerHTML = '';
      div.appendChild(style);

      div.innerHTML += `
        <!-- Tracker bar: combo, accuracy, timer, score -->
        <div class="daily-tracker-bar">
          <div class="daily-tracker-item">
            <span style="color:var(--accent-jade);font-weight:700;" id="daily-combo">
              ${combo > 0 ? `${combo}x 连击` : ''}
            </span>
          </div>
          <div class="daily-tracker-item">
            <span>✓ ${correct}</span>
            <span style="color:var(--text-secondary);margin:0 2px;">/</span>
            <span style="color:var(--accent-red);">✗ ${total - correct}</span>
          </div>
          <div class="daily-tracker-item">
            <span style="color:${accuracy >= 80 ? 'var(--accent-jade)' : accuracy >= 50 ? 'var(--accent-gold)' : 'var(--accent-red)'};">
              ${accuracy}%
            </span>
          </div>
          <div class="daily-tracker-item" id="daily-timer-wrap">
            <svg width="28" height="28" viewBox="0 0 36 36" style="transform:rotate(-90deg);">
              <circle cx="18" cy="18" r="15" fill="none" stroke="var(--bg-secondary)" stroke-width="3"/>
              <circle id="daily-timer-ring" cx="18" cy="18" r="15" fill="none" stroke="var(--accent-gold)" stroke-width="3"
                stroke-dasharray="94" stroke-dashoffset="0" stroke-linecap="round"
                style="transition:stroke-dashoffset 1s linear;"/>
            </svg>
            <span id="daily-timer-text" style="font-weight:700;min-width:24px;text-align:center;">10</span>
          </div>
          <div class="daily-tracker-item">
            <span style="color:var(--accent-gold);font-weight:700;">
              ${correct * 10 + combo * 2} 分
            </span>
          </div>
        </div>

        <div style="color:var(--text-secondary);margin-bottom:12px;font-size:0.9rem;text-align:center;">
          第 ${qIndex + 1}/${sequence.length} 题 · ${typeLabel}
        </div>
        ${contextHTML}
        <div style="font-size:1.2rem;margin-bottom:20px;padding:0 32px;text-align:center;">${q.prompt}</div>
        <div style="display:flex;flex-direction:column;gap:10px;max-width:550px;width:100%;padding:0 32px;">
          ${optionsHTML}
        </div>
        <div id="feedback" style="font-size:0.95rem;color:var(--text-secondary);margin-top:12px;text-align:center;min-height:2em;padding:0 32px;"></div>
      `;

      // Start question timer (10 seconds)
      let timeLeft = 10;
      const timerText = div.querySelector('#daily-timer-text');
      const timerRing = div.querySelector('#daily-timer-ring');

      if (timerInterval) clearInterval(timerInterval);

      timerInterval = setInterval(() => {
        timeLeft--;
        if (timerText) {
          timerText.textContent = timeLeft;
          if (timeLeft <= 3) {
            timerText.style.animation = 'daily-timer-warn 0.5s infinite';
            if (timerRing) timerRing.style.stroke = 'var(--accent-red)';
          }
        }
        if (timerRing) {
          const offset = Math.round((1 - timeLeft / 10) * 94);
          timerRing.style.strokeDashoffset = offset;
        }
        if (timeLeft <= 0) {
          clearInterval(timerInterval);
          handleTimeout();
        }
      }, 1000);

      function handleTimeout() {
        // Time up = wrong answer
        div.querySelectorAll('.daily-option-enhanced').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) {
            b.style.borderColor = 'var(--accent-jade)';
            b.style.background = 'rgba(39,174,96,0.2)';
          }
        });
        playSound('wrong');
        recordAnswer(q.contentType, false, q.id || null);
        total++;
        combo = 0;
        const fb = div.querySelector('#feedback');
        if (fb) fb.innerHTML = `<span style="color:var(--accent-red);">⏰ 时间到！</span> ${q.explanation}`;
        setTimeout(() => { qIndex++; render(); }, 2000);
      }

      div.querySelectorAll('.daily-option-enhanced').forEach(btn => {
        btn.addEventListener('click', () => {
          if (timerInterval) clearInterval(timerInterval);
          playSound('click');
          const idx = parseInt(btn.dataset.idx);
          const isCorrect = idx === q.correct;

          div.querySelectorAll('.daily-option-enhanced').forEach(b => {
            b.style.pointerEvents = 'none';
            const bIdx = parseInt(b.dataset.idx);
            if (bIdx === q.correct) {
              b.style.borderColor = 'var(--accent-jade)';
              b.style.background = 'rgba(39,174,96,0.2)';
            } else if (bIdx === idx && !isCorrect) {
              b.style.borderColor = 'var(--accent-red)';
              b.style.background = 'rgba(192,57,43,0.2)';
            }
          });

          recordAnswer(q.contentType, isCorrect, q.id || null);
          total++;
          if (isCorrect) {
            correct++;
            combo++;
            if (combo > maxCombo) maxCombo = combo;
            playSound('correct');
            // Combo pop animation
            const comboEl = div.querySelector('#daily-combo');
            if (comboEl && combo > 1) {
              comboEl.textContent = `${combo}x 连击`;
              comboEl.style.animation = 'daily-combo-pop 0.3s ease-out';
              setTimeout(() => { if (comboEl) comboEl.style.animation = ''; }, 300);
            }
          } else {
            combo = 0;
            playSound('wrong');
          }

          const fb = div.querySelector('#feedback');
          if (fb) {
            fb.textContent = isCorrect
              ? `✓ 正确！${q.explanation}`
              : `✗ 错误。${q.explanation}`;
          }
          setTimeout(() => { qIndex++; render(); }, 2000);
        });
      });
    }

    function endDaily() {
      if (timerInterval) clearInterval(timerInterval);

      // Update streak
      const yesterday = new Date();
      yesterday.setDate(yesterday.getDate() - 1);
      const yesterdaySeed = `${yesterday.getFullYear()}-${yesterday.getMonth() + 1}-${yesterday.getDate()}`;
      if (profile.lastDailyDate === yesterdaySeed) {
        profile.dailyStreak++;
      } else {
        profile.dailyStreak = 1;
      }
      profile.lastDailyDate = today;

      // Record in daily history
      if (!profile.dailyHistory) profile.dailyHistory = [];
      if (!profile.dailyHistory.includes(today)) {
        profile.dailyHistory.push(today);
        // Keep only last 30 days
        if (profile.dailyHistory.length > 30) {
          profile.dailyHistory = profile.dailyHistory.slice(-30);
        }
      }

      const accuracy = total > 0 ? Math.round((correct / total) * 100) : 0;
      const streakBonus = Math.min(profile.dailyStreak * 5, 50);
      const comboBonus = maxCombo * 2;
      const baseXP = correct * 10;
      const finalScore = baseXP + comboBonus + streakBonus;
      const totalXP = baseXP + streakBonus;
      // Gold = 60% of XP earned
      const dailyGold = Math.round(totalXP * 0.6);
      profile.gold = (profile.gold || 0) + dailyGold;
      profile.stats.totalGoldEarned = (profile.stats.totalGoldEarned || 0) + dailyGold;
      const levelUp = addXP(totalXP);

      // Update best score and accuracy
      if (!profile.dailyBestScore) profile.dailyBestScore = 0;
      if (!profile.dailyBestAccuracy) profile.dailyBestAccuracy = 0;
      const isNewBestScore = finalScore > profile.dailyBestScore;
      const isNewBestAccuracy = accuracy > profile.dailyBestAccuracy;
      if (isNewBestScore) profile.dailyBestScore = finalScore;
      if (isNewBestAccuracy) profile.dailyBestAccuracy = accuracy;

      gameState.save();

      // Star rating
      const stars = getStarRating(accuracy);
      const starDisplay = Array(3).fill(0).map((_, i) => i < stars ? '⭐' : '☆').join('');
      const streakMultiplier = Math.min(Math.floor(profile.dailyStreak / 3) + 1, 5);

      // Build post-challenge screen
      div.innerHTML = '';
      div.appendChild(style);

      const postDiv = document.createElement('div');
      postDiv.style.cssText = 'display:flex;flex-direction:column;align-items:center;width:100%;max-width:520px;';

      // Title
      const title = document.createElement('h2');
      title.textContent = '每日挑战完成！';
      title.style.cssText = 'margin-bottom:1rem;opacity:0;transition:opacity 0.5s;';
      postDiv.appendChild(title);

      // Star rating with animation
      const starContainer = document.createElement('div');
      starContainer.style.cssText = 'display:flex;gap:8px;margin-bottom:1rem;min-height:48px;';
      postDiv.appendChild(starContainer);

      // Results card
      const card = document.createElement('div');
      card.style.cssText = `
        background:var(--bg-card);border-radius:12px;padding:24px 32px;width:100%;
        opacity:0;transform:translateY(20px);transition:all 0.5s ease-out 0.8s;
      `;

      // Accuracy
      const accRow = document.createElement('div');
      accRow.style.cssText = 'font-size:1.1rem;margin-bottom:10px;';
      accRow.innerHTML = `正确率: <span style="color:var(--accent-gold);font-weight:700;">${accuracy}%</span> <span style="color:var(--text-secondary);font-size:0.9rem;">(${correct}/${total})</span>`;
      card.appendChild(accRow);

      // Max combo
      const comboRow = document.createElement('div');
      comboRow.style.cssText = 'font-size:1.1rem;margin-bottom:10px;';
      comboRow.innerHTML = `最高连击: <span style="color:var(--accent-jade);font-weight:700;">${maxCombo}x</span>`;
      card.appendChild(comboRow);

      // Streak
      const streakRow = document.createElement('div');
      streakRow.style.cssText = 'font-size:1.1rem;margin-bottom:10px;';
      streakRow.innerHTML = `连续打卡: <span style="color:var(--accent-jade);font-weight:700;">${profile.dailyStreak} 天</span> 🔥`;
      card.appendChild(streakRow);

      // Streak bonus multiplier visualization
      if (profile.dailyStreak >= 3) {
        const multRow = document.createElement('div');
        multRow.style.cssText = 'margin-bottom:10px;';
        multRow.innerHTML = `
          <div style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:4px;">连击倍率</div>
          <div style="display:flex;align-items:center;gap:8px;">
            ${Array(5).fill(0).map((_, i) => `
              <div style="width:32px;height:32px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:0.92rem;font-weight:700;
                background:${i < streakMultiplier ? 'var(--accent-gold)' : 'var(--bg-secondary)'};
                color:${i < streakMultiplier ? '#1a1a2e' : 'var(--text-secondary)'};
                transition:all 0.3s ${i * 0.15}s;">
                x${i + 1}
              </div>
            `).join('')}
          </div>
          <div class="daily-streak-bar-bg">
            <div class="daily-streak-bar-fill" style="width:${Math.min(streakMultiplier / 5 * 100, 100)}%;"></div>
          </div>
        `;
        card.appendChild(multRow);
      }

      // XP breakdown
      const xpRow = document.createElement('div');
      xpRow.style.cssText = 'font-size:1.1rem;margin-bottom:10px;';
      xpRow.innerHTML = `经验: <span style="color:var(--accent-gold);font-weight:700;">+${totalXP} XP</span> <span style="font-size:0.95rem;color:var(--text-secondary);">(基础 ${baseXP} + 打卡 ${streakBonus})</span>`;
      card.appendChild(xpRow);

      // Level up
      if (levelUp) {
        const lvlRow = document.createElement('div');
        lvlRow.style.cssText = 'font-size:1.2rem;color:var(--accent-gold);font-weight:700;margin-top:8px;text-align:center;';
        lvlRow.textContent = `升级到 Lv.${levelUp.newLevel}！`;
        card.appendChild(lvlRow);
      }

      // Best score comparison
      const bestRow = document.createElement('div');
      bestRow.style.cssText = 'margin-top:12px;padding-top:12px;border-top:1px solid var(--bg-secondary);';
      bestRow.innerHTML = `
        <div style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:4px;">个人最佳</div>
        <div style="display:flex;gap:16px;flex-wrap:wrap;">
          <div>
            最高分: <span style="color:var(--accent-gold);font-weight:700;">${profile.dailyBestScore}</span>
            ${isNewBestScore ? '<span style="color:var(--accent-jade);font-size:0.95rem;font-weight:700;"> NEW!</span>' : ''}
          </div>
          <div>
            最佳正确率: <span style="color:var(--accent-jade);font-weight:700;">${profile.dailyBestAccuracy}%</span>
            ${isNewBestAccuracy ? '<span style="color:var(--accent-jade);font-size:0.95rem;font-weight:700;"> NEW!</span>' : ''}
          </div>
        </div>
      `;
      card.appendChild(bestRow);

      postDiv.appendChild(card);

      // Share button
      const shareRow = document.createElement('div');
      shareRow.style.cssText = 'display:flex;gap:12px;margin-top:1.2rem;opacity:0;transition:opacity 0.5s ease-out 1.5s;position:relative;';

      const shareBtn = document.createElement('button');
      shareBtn.className = 'btn';
      shareBtn.textContent = '分享';
      shareBtn.style.cssText = 'padding:8px 20px;';
      shareBtn.addEventListener('click', () => {
        const shareText = `文字侠每日挑战 ${starDisplay} 正确率${accuracy}% 连击x${maxCombo} 连续打卡${profile.dailyStreak}天`;
        navigator.clipboard.writeText(shareText).then(() => {
          const copied = document.createElement('div');
          copied.textContent = '已复制到剪贴板！';
          copied.style.cssText = 'position:absolute;top:-30px;left:50%;transform:translateX(-50%);color:var(--accent-jade);font-size:0.95rem;white-space:nowrap;animation:daily-share-copied 1.5s forwards;';
          shareRow.appendChild(copied);
          setTimeout(() => copied.remove(), 1500);
        }).catch(() => {
          // Fallback: show text for manual copy
          const fallback = document.createElement('div');
          fallback.textContent = shareText;
          fallback.style.cssText = 'font-size:0.95rem;color:var(--text-secondary);padding:8px;background:var(--bg-secondary);border-radius:4px;margin-top:8px;word-break:break-all;';
          shareRow.appendChild(fallback);
        });
      });
      shareRow.appendChild(shareBtn);

      const backBtn = document.createElement('button');
      backBtn.className = 'btn btn-primary';
      backBtn.textContent = '返回';
      backBtn.style.cssText = 'padding:8px 24px;';
      backBtn.addEventListener('click', () => showScreen('title'));
      shareRow.appendChild(backBtn);

      postDiv.appendChild(shareRow);
      div.appendChild(postDiv);

      // Animated reveal sequence
      requestAnimationFrame(() => {
        title.style.opacity = '1';
      });

      // Stars pop in one by one
      for (let i = 0; i < 3; i++) {
        setTimeout(() => {
          const starEl = document.createElement('span');
          starEl.className = 'daily-post-star';
          starEl.style.cssText = `font-size:2rem;animation-delay:${i * 0.15}s;`;
          starEl.textContent = i < stars ? '⭐' : '☆';
          starContainer.appendChild(starEl);
          if (i < stars) {
            try { playSound('correct'); } catch (_) {}
          }
        }, 200 + i * 250);
      }

      // Card slides in
      requestAnimationFrame(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      });

      // Share row fades in
      requestAnimationFrame(() => {
        shareRow.style.opacity = '1';
      });
    }

    render();
  }

  return div;
}

registerScreen('daily', renderDaily);
