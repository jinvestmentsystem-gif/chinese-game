// js/screens/reward.js — Post-quest reward summary
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { addXP, xpForLevel, getXPProgress, calculateGoldReward } from '../progression.js';
import { EQUIPMENT_DB } from './inventory.js';
import { playSound } from '../audio.js';
import { showCompanionBubble, COMPANION, pick } from './companion.js';

// ─── Chapter quest counts (mirrors worldmap.js CHAPTERS) ─────────────────────
// Kept here to avoid circular dependency with worldmap.js.
const CHAPTER_QUESTS = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 5 };

// ─── Achievement milestones ───────────────────────────────────────────────────

const MILESTONES = [
  { id: 'first_quest',  check: s => s.totalQuests >= 1,   title: '初出茅庐', desc: '完成第一个任务！' },
  { id: 'first_boss',   check: s => s.totalBossKills >= 1, title: '初战告捷', desc: '击败第一个BOSS！' },
  { id: 'combo_3',      check: s => s.maxCombo >= 3,       title: '连击新手', desc: '达成3连击！' },
  { id: 'combo_5',      check: s => s.maxCombo >= 5,       title: '连击达人', desc: '达成5连击！' },
  { id: 'combo_10',     check: s => s.maxCombo >= 10,      title: '连击大师', desc: '达成10连击！' },
  { id: 'correct_50',   check: s => s.totalCorrect >= 50,  title: '学有所成', desc: '累计答对50题！' },
  { id: 'correct_100',  check: s => s.totalCorrect >= 100, title: '博学多才', desc: '累计答对100题！' },
  { id: 'correct_200',  check: s => s.totalCorrect >= 200, title: '文字大师', desc: '累计答对200题！' },
  { id: 'quest_5',      check: s => s.totalQuests >= 5,    title: '冒险家',   desc: '完成5个任务！' },
  { id: 'quest_10',     check: s => s.totalQuests >= 10,   title: '老练冒险家', desc: '完成10个任务！' },
  { id: 'boss_3',       check: s => s.totalBossKills >= 3, title: 'BOSS猎人', desc: '击败3个BOSS！' },
  { id: 'xp_500',       check: s => s.totalXP >= 500,      title: '经验丰富', desc: '累计获得500经验！' },
  { id: 'xp_2000',      check: s => s.totalXP >= 2000,     title: '身经百战', desc: '累计获得2000经验！' },
];

function showAchievement(container, ach) {
  const popup = document.createElement('div');
  popup.style.cssText = `
    position:fixed; top:50%; left:50%; transform:translate(-50%,-50%) scale(0);
    background:linear-gradient(135deg, #1a1a2e 0%, #0f3460 100%);
    border:2px solid var(--accent-gold); border-radius:16px;
    padding:24px 40px; text-align:center; z-index:300;
    box-shadow:0 0 40px rgba(212,160,23,0.3);
    animation: ach-pop 0.5s cubic-bezier(0.175,0.885,0.32,1.275) forwards;
  `;
  popup.innerHTML = `
    <div style="font-size:2rem;margin-bottom:8px;">🏆</div>
    <div style="font-size:0.75rem;letter-spacing:0.12em;color:var(--accent-gold);opacity:0.7;margin-bottom:4px;">成就解锁！</div>
    <div style="font-size:1.2rem;font-weight:700;color:var(--accent-gold);margin-bottom:4px;">${ach.title}</div>
    <div style="font-size:0.9rem;color:var(--text-secondary);">${ach.desc}</div>
  `;

  const style = document.createElement('style');
  style.textContent = `@keyframes ach-pop { from { transform:translate(-50%,-50%) scale(0); } to { transform:translate(-50%,-50%) scale(1); } }`;
  popup.appendChild(style);
  container.appendChild(popup);

  setTimeout(() => {
    popup.style.animation = 'none';
    popup.style.transition = 'all 0.3s';
    popup.style.opacity = '0';
    popup.style.transform = 'translate(-50%,-50%) scale(0.8)';
    setTimeout(() => popup.remove(), 300);
  }, 2500);
}

// ─── Sparkle effect for loot items ───────────────────────────────────────────

function spawnSparkles(container, anchorEl) {
  if (!anchorEl || !container) return;
  const rect = anchorEl.getBoundingClientRect();
  const cRect = container.getBoundingClientRect();
  const cx = rect.left - cRect.left + rect.width / 2;
  const cy = rect.top - cRect.top + rect.height / 2;
  for (let i = 0; i < 4; i++) {
    const dot = document.createElement('div');
    const angle = (i / 4) * Math.PI * 2;
    const dist = 24 + Math.random() * 18;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist;
    dot.style.cssText = `
      position:absolute;
      left:${cx}px; top:${cy}px;
      width:6px; height:6px; border-radius:50%;
      background:#d4a017;
      pointer-events:none; z-index:20;
      transform:translate(-50%,-50%) scale(0);
      transition: transform 0.5s ease-out, opacity 0.5s ease-out;
      opacity:1;
    `;
    container.appendChild(dot);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dot.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`;
        dot.style.opacity = '0';
      });
    });
    setTimeout(() => dot.remove(), 600);
  }
}

// ─── XP bar ──────────────────────────────────────────────────────────────────

function buildXpBar(profile, totalXP, levelUpInfo, parent) {
  const xpSection = document.createElement('div');
  xpSection.style.cssText = 'margin:12px 0;';

  const xpLabel = document.createElement('div');
  xpLabel.style.cssText = 'font-size:0.9rem; color:var(--text-secondary); margin-bottom:4px;';

  const xpLevelText = document.createElement('span');
  xpLevelText.style.cssText = 'font-weight:700; color:var(--accent-gold); margin-right:8px;';
  xpLevelText.textContent = `Lv.${profile.level}`;
  xpLabel.appendChild(xpLevelText);

  const xpAmtText = document.createElement('span');
  xpAmtText.textContent = `+${totalXP} XP`;
  xpLabel.appendChild(xpAmtText);
  xpSection.appendChild(xpLabel);

  const xpBarBg = document.createElement('div');
  xpBarBg.style.cssText = `
    width:100%; height:20px; background:var(--bg-secondary);
    border-radius:10px; overflow:hidden; position:relative;
  `;

  const xpBar = document.createElement('div');
  // Start at 0, will animate to target
  const prevXp = profile.xp - totalXP;
  const xpNeeded = profile.xpToNext || 100;
  const startPct = Math.max(0, Math.min(100, Math.round((prevXp / xpNeeded) * 100)));
  const endPct   = Math.max(0, Math.min(100, Math.round((profile.xp / xpNeeded) * 100)));

  xpBar.style.cssText = `
    width:${startPct}%;
    height:20px;
    background:linear-gradient(90deg, var(--accent-jade), var(--accent-gold));
    border-radius:10px;
    transition: width 1s ease-out;
  `;
  xpBarBg.appendChild(xpBar);
  xpSection.appendChild(xpBarBg);
  parent.appendChild(xpSection);

  // Animate fill
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      if (levelUpInfo) {
        // Fill to 100%, then flash, then reset and partially fill
        xpBar.style.width = '100%';
        setTimeout(() => {
          // Flash white
          xpBarBg.style.transition = 'box-shadow 0.2s';
          xpBarBg.style.boxShadow = '0 0 16px 4px #fff';
          setTimeout(() => { xpBarBg.style.boxShadow = ''; }, 200);
          // Reset and fill to new level progress
          xpBar.style.transition = 'none';
          xpBar.style.width = '0%';
          xpLevelText.textContent = `Lv.${levelUpInfo.newLevel}`;
          requestAnimationFrame(() => {
            requestAnimationFrame(() => {
              xpBar.style.transition = 'width 0.8s ease-out';
              xpBar.style.width = endPct + '%';
            });
          });
        }, 1100);
      } else {
        xpBar.style.width = endPct + '%';
      }
    });
  });

  return xpSection;
}

// ─── Star rating ─────────────────────────────────────────────────────────────

function buildStarRating(accuracy, parent, onDone) {
  const stars = accuracy >= 85 ? 3 : accuracy >= 60 ? 2 : 1;
  const wrapper = document.createElement('div');
  wrapper.style.cssText = `
    display:flex; gap:12px; justify-content:center; align-items:center;
    margin:8px 0;
  `;
  parent.appendChild(wrapper);

  for (let i = 0; i < 3; i++) {
    const star = document.createElement('div');
    const active = i < stars;
    star.style.cssText = `
      width:36px; height:36px; border-radius:50%;
      background:${active ? 'var(--accent-gold)' : 'var(--bg-secondary)'};
      display:flex; align-items:center; justify-content:center;
      font-size:1.4rem; line-height:1;
      transform:scale(0);
      transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
      box-shadow:${active ? '0 0 10px 2px var(--accent-gold)' : 'none'};
    `;
    star.textContent = active ? '★' : '☆';
    wrapper.appendChild(star);

    setTimeout(() => {
      star.style.transform = 'scale(1)';
      if (active) {
        try { playSound('correct'); } catch (_) {}
      }
      if (i === 2 && onDone) setTimeout(onDone, 400);
    }, i * 200);
  }
}

// ─── Engagement hook: XP progress and unlock preview ─────────────────────────

function buildEngagementHook(profile, levelUpInfo, parent) {
  // Inject pulsing text keyframe once
  if (!document.getElementById('reward-hook-style')) {
    const s = document.createElement('style');
    s.id = 'reward-hook-style';
    s.textContent = `
      @keyframes reward-hook-pulse {
        0%,100% { opacity: 1; transform: scale(1); }
        50%      { opacity: 0.75; transform: scale(1.04); }
      }
    `;
    document.head.appendChild(s);
  }

  const hookWrap = document.createElement('div');
  hookWrap.style.cssText = `
    width: 100%; max-width: 520px;
    display: flex; flex-direction: column; gap: 8px;
    margin-bottom: 1rem;
    opacity: 0; transform: translateY(12px);
    transition: opacity 0.5s ease-out, transform 0.5s ease-out;
  `;
  parent.appendChild(hookWrap);

  // Recalculate after XP was already applied
  const xpProgress = getXPProgress(profile);
  const xpToNext = xpProgress.needed - xpProgress.current;
  const xpPct = xpProgress.percent;

  // "距离下一次升级还需 X 经验"
  const xpDistEl = document.createElement('div');
  xpDistEl.style.cssText = `
    font-size: 0.95rem; color: var(--text-secondary);
    text-align: center; letter-spacing: 0.05em;
  `;
  xpDistEl.textContent = `距离下一次升级还需 ${xpToNext} 经验`;
  hookWrap.appendChild(xpDistEl);

  // Pulsing "再赢一场就能升级！" when XP bar > 70%
  if (xpPct >= 70) {
    const almostEl = document.createElement('div');
    almostEl.style.cssText = `
      font-size: 1.1rem; font-weight: 700;
      color: var(--accent-gold);
      text-align: center; letter-spacing: 0.08em;
      animation: reward-hook-pulse 1.4s ease-in-out infinite;
    `;
    almostEl.textContent = '再赢一场就能升级！';
    hookWrap.appendChild(almostEl);
  }

  // Next unlock preview — find the next unlock above current level
  const UNLOCKS_MAP = { 2: '提示技能', 3: '武器槽', 5: '跳过技能', 7: '防具槽', 10: '双倍技能' };
  const nextUnlockLevel = Object.keys(UNLOCKS_MAP)
    .map(Number)
    .sort((a, b) => a - b)
    .find(lvl => lvl > profile.level);

  if (nextUnlockLevel) {
    const unlockEl = document.createElement('div');
    unlockEl.style.cssText = `
      font-size: 0.9rem; color: #888;
      text-align: center; letter-spacing: 0.05em;
    `;
    unlockEl.textContent = `Level ${nextUnlockLevel} 解锁: ${UNLOCKS_MAP[nextUnlockLevel]}`;
    hookWrap.appendChild(unlockEl);
  }

  // Daily challenge reminder — check if daily challenge done today
  const todayKey = new Date().toISOString().slice(0, 10);
  const lastDaily = profile.lastDailyChallenge || '';
  if (lastDaily !== todayKey) {
    const dailyEl = document.createElement('div');
    dailyEl.style.cssText = `
      font-size: 1rem; font-weight: 700;
      color: #5bc8af;
      text-align: center; letter-spacing: 0.06em;
      margin-top: 4px;
    `;
    dailyEl.textContent = '今日挑战等你来战！';
    hookWrap.appendChild(dailyEl);
  }

  return hookWrap;
}

// ─── Main render ─────────────────────────────────────────────────────────────

function renderReward() {
  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = 'overflow:hidden;';

  const quest = gameState.currentQuest;
  const results = quest.results;
  const accuracy = quest.results.total > 0
    ? Math.round((results.correct / results.total) * 100)
    : 0;

  // Calculate XP and Gold
  const baseXP = results.correct * 10;
  const comboBonus = results.maxCombo * 5;
  const totalXP = baseXP + comboBonus;
  results.xpEarned = totalXP;
  const goldEarned = calculateGoldReward(results);
  results.goldEarned = goldEarned;

  // Apply XP (also adds gold internally)
  const levelUpInfo = addXP(totalXP);

  // Equipment drop (30% chance)
  const profile = gameState.profile;
  if (Math.random() < 0.3) {
    const available = EQUIPMENT_DB.filter(e => !profile.inventory.includes(e.id));
    if (available.length > 0) {
      const drop = available[Math.floor(Math.random() * available.length)];
      profile.inventory.push(drop.id);
      results.itemsFound.push(drop.name);
    }
  }

  // Mark quest as completed
  if (!profile.chapterProgress[quest.chapterId]) {
    profile.chapterProgress[quest.chapterId] = { questsCompleted: 0 };
  }
  const cp = profile.chapterProgress[quest.chapterId];
  if (quest.questIndex >= cp.questsCompleted) {
    cp.questsCompleted = quest.questIndex + 1;
  }

  // ── Update stats ──
  if (!profile.stats) {
    profile.stats = { totalCorrect: 0, totalWrong: 0, totalQuests: 0, totalBossKills: 0, maxCombo: 0, totalXP: 0 };
  }
  if (!profile.achievements) profile.achievements = [];

  profile.stats.totalCorrect += results.correct;
  profile.stats.totalWrong  += (results.total - results.correct);
  profile.stats.totalQuests++;
  profile.stats.maxCombo = Math.max(profile.stats.maxCombo, results.maxCombo || 0);
  profile.stats.totalXP  += totalXP;

  // Check if we just beat a boss
  const lastEnc = quest.encounters[quest.encounters.length - 1];
  if (lastEnc && lastEnc.type === 'boss' && lastEnc.completed) {
    profile.stats.totalBossKills++;
  }

  // ── Check for new achievements ──
  const newAchievements = MILESTONES.filter(m =>
    m.check(profile.stats) && !profile.achievements.includes(m.id)
  );
  newAchievements.forEach(a => profile.achievements.push(a.id));

  gameState.save();

  // ── Build the animated reward sequence ──

  // Outer card
  const card = document.createElement('div');
  card.style.cssText = `
    background:var(--bg-card); border-radius:12px; padding:24px 40px;
    margin-bottom:1.5rem; width:100%; max-width:520px;
    display:flex; flex-direction:column; gap:4px;
  `;

  // Title — appears immediately on fade-in
  const title = document.createElement('h2');
  title.textContent = '任务完成！';
  title.style.cssText = `
    margin-bottom:1rem; opacity:0;
    transition: opacity 0.4s ease-out;
  `;
  div.appendChild(title);
  div.appendChild(card);

  // Engagement hook (inserted before buttons)
  const engagementHook = buildEngagementHook(profile, levelUpInfo, div);

  // Detect chapter completion — did finishing this quest complete the chapter?
  const chapterQuestTotal = CHAPTER_QUESTS[quest.chapterId] || Infinity;
  const isChapterComplete = cp.questsCompleted >= chapterQuestTotal;

  // Continue / map buttons container — hidden until step 7
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:12px; opacity:0; transition:opacity 0.5s ease-out;';

  const btnContinue = document.createElement('button');
  btnContinue.className = 'btn btn-primary';
  // When chapter is complete, change label to lead into the celebration screen
  btnContinue.textContent = isChapterComplete ? '查看成就' : '继续';
  btnContinue.style.cssText = 'animation:none;'; // will add pulse later
  btnRow.appendChild(btnContinue);

  const btnMap = document.createElement('button');
  btnMap.className = 'btn';
  btnMap.textContent = '返回地图';
  btnRow.appendChild(btnMap);
  div.appendChild(btnRow);

  // Inject continue button pulse keyframe
  const pulseStyle = document.createElement('style');
  pulseStyle.textContent = `
    @keyframes reward-btn-pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(212,160,23,0.6); }
      50%      { box-shadow:0 0 0 10px rgba(212,160,23,0); }
    }
  `;
  div.appendChild(pulseStyle);

  // Helper: build a stat row that slides in from the left
  function buildStat(label, valueHtml, color) {
    const row = document.createElement('div');
    row.style.cssText = `
      font-size:1.1rem; margin-bottom:8px;
      transform:translateX(-40px); opacity:0;
      transition:transform 0.4s ease-out, opacity 0.4s ease-out;
    `;
    row.innerHTML = `${label}: <span style="color:${color};font-weight:700;">${valueHtml}</span>`;
    card.appendChild(row);
    return row;
  }

  const accuracyRow = buildStat('正确率', `${accuracy}% (${results.correct}/${results.total})`, 'var(--accent-gold)');
  const comboRow    = buildStat('最高连击', String(results.maxCombo), 'var(--accent-jade)');

  // XP row placeholder (will be replaced by the animated bar)
  const xpRow = buildStat('获得经验', `+${totalXP} XP`, 'var(--accent-gold)');
  const goldRow = buildStat('获得金币', `+${goldEarned} 💰`, 'var(--accent-gold)');

  // ── Animated sequence ──

  // Step 0 (0ms): fade in title
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      title.style.opacity = '1';
    });
  });

  // Step 1 (500ms): accuracy slides in with count-up
  setTimeout(() => {
    accuracyRow.style.transform = 'translateX(0)';
    accuracyRow.style.opacity = '1';
    // Count-up from 0 to accuracy
    let current = 0;
    const step = Math.ceil(accuracy / 20);
    const countInterval = setInterval(() => {
      current = Math.min(accuracy, current + step);
      accuracyRow.querySelector('span').textContent =
        `${current}% (${results.correct}/${results.total})`;
      if (current >= accuracy) clearInterval(countInterval);
    }, 30);
  }, 500);

  // Step 2 (1000ms): combo slides in
  setTimeout(() => {
    comboRow.style.transform = 'translateX(0)';
    comboRow.style.opacity = '1';
  }, 1000);

  // Step 2.5 (1200ms): gold slides in
  setTimeout(() => {
    goldRow.style.transform = 'translateX(0)';
    goldRow.style.opacity = '1';
  }, 1200);

  // Step 3 (1500ms): replace xpRow with animated XP bar
  setTimeout(() => {
    xpRow.style.transform = 'translateX(0)';
    xpRow.style.opacity = '1';
    // Swap the plain text for an animated bar
    card.removeChild(xpRow);
    buildXpBar(profile, totalXP, levelUpInfo, card);

    // Companion reacts to XP gain
    showCompanionBubble(div, pick(COMPANION.rewardXP), 3000);

    // Level-up bounce if applicable
    if (levelUpInfo) {
      setTimeout(() => {
        const lvlBadge = document.createElement('div');
        lvlBadge.textContent = `升级！Lv.${levelUpInfo.newLevel}${levelUpInfo.unlock ? ' · 解锁: ' + levelUpInfo.unlock : ''}`;
        lvlBadge.style.cssText = `
          font-size:1.2rem; color:var(--accent-gold); font-weight:700;
          margin-top:6px; transform:scale(0);
          transition:transform 0.4s cubic-bezier(0.34,1.56,0.64,1);
        `;
        card.appendChild(lvlBadge);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => { lvlBadge.style.transform = 'scale(1)'; });
        });
        try { playSound('levelup'); } catch (_) {}
        // Companion celebrates level up (after bar animation completes)
        setTimeout(() => showCompanionBubble(div, pick(COMPANION.rewardLevelUp), 4000), 1400);
      }, 1300); // after bar overfills and resets
    }
  }, 1500);

  // Step 4 (2500ms): equipment items pop in one by one
  if (results.itemsFound.length > 0) {
    results.itemsFound.forEach((itemName, i) => {
      setTimeout(() => {
        const itemEl = document.createElement('div');
        itemEl.style.cssText = `
          font-size:1.05rem; margin-bottom:6px;
          display:flex; align-items:center; gap:8px;
          transform:scale(0); opacity:1;
          transition:transform 0.35s cubic-bezier(0.34,1.56,0.64,1);
        `;
        itemEl.innerHTML = `<span style="font-size:1.3rem;">📦</span> <span style="color:var(--accent-jade);font-weight:700;">${itemName}</span>`;
        card.appendChild(itemEl);
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            itemEl.style.transform = 'scale(1)';
            setTimeout(() => spawnSparkles(div, itemEl), 50);
          });
        });
        try { playSound('correct'); } catch (_) {}
        // Companion reacts to first item drop only
        if (i === 0) showCompanionBubble(div, pick(COMPANION.rewardItem), 3000);
      }, 2500 + i * 200);
    });
  }

  // Step 5 (3000ms): star rating
  setTimeout(() => {
    const starLabel = document.createElement('div');
    starLabel.style.cssText = 'font-size:0.95rem; color:var(--text-secondary); margin-top:8px; text-align:center;';
    starLabel.textContent = accuracy >= 85 ? '出色！' : accuracy >= 60 ? '不错！' : '继续努力！';
    card.appendChild(starLabel);
    buildStarRating(accuracy, card, null);
  }, 3000);

  // Step 6 (3500ms): engagement hook slides in, then "继续" button fades in with pulse glow
  setTimeout(() => {
    engagementHook.style.opacity = '1';
    engagementHook.style.transform = 'translateY(0)';

    setTimeout(() => {
      btnRow.style.opacity = '1';
      btnContinue.style.animation = 'reward-btn-pulse 1.8s ease-in-out infinite';
    }, 400);
  }, 3500);

  // Wire up button listeners
  btnContinue.addEventListener('click', () => {
    if (isChapterComplete) {
      // Go to chapter completion celebration screen
      showScreen('chapter-complete');
    } else {
      showScreen('quest', { chapterId: quest.chapterId, questIndex: quest.questIndex + 1 });
    }
  });
  btnMap.addEventListener('click', () => showScreen('worldmap'));

  // ── Achievement celebrations (after reward sequence finishes) ──
  if (newAchievements.length > 0) {
    setTimeout(() => {
      newAchievements.forEach((ach, i) => {
        setTimeout(() => showAchievement(div, ach), i * 1500);
      });
    }, 4000);
  }

  return div;
}

registerScreen('reward', renderReward);
