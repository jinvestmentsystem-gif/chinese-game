// js/screens/reward.js — Post-quest reward summary
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { addXP } from '../progression.js';
import { EQUIPMENT_DB } from './inventory.js';
import { playSound } from '../audio.js';

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

// ─── Main render ─────────────────────────────────────────────────────────────

function renderReward() {
  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = 'position:relative; overflow:hidden;';

  const quest = gameState.currentQuest;
  const results = quest.results;
  const accuracy = quest.results.total > 0
    ? Math.round((results.correct / results.total) * 100)
    : 0;

  // Calculate XP
  const baseXP = results.correct * 10;
  const comboBonus = results.maxCombo * 5;
  const totalXP = baseXP + comboBonus;
  results.xpEarned = totalXP;

  // Apply XP
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

  // Continue / map buttons container — hidden until step 7
  const btnRow = document.createElement('div');
  btnRow.style.cssText = 'display:flex; gap:12px; opacity:0; transition:opacity 0.5s ease-out;';

  const btnContinue = document.createElement('button');
  btnContinue.className = 'btn btn-primary';
  btnContinue.textContent = '继续';
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

  // Step 3 (1500ms): replace xpRow with animated XP bar
  setTimeout(() => {
    xpRow.style.transform = 'translateX(0)';
    xpRow.style.opacity = '1';
    // Swap the plain text for an animated bar
    card.removeChild(xpRow);
    buildXpBar(profile, totalXP, levelUpInfo, card);

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

  // Step 6 (3500ms): "继续" button fades in with pulse glow
  setTimeout(() => {
    btnRow.style.opacity = '1';
    btnContinue.style.animation = 'reward-btn-pulse 1.8s ease-in-out infinite';
  }, 3500);

  // Wire up button listeners
  btnContinue.addEventListener('click', () => {
    showScreen('quest', { chapterId: quest.chapterId, questIndex: quest.questIndex + 1 });
  });
  btnMap.addEventListener('click', () => showScreen('worldmap'));

  return div;
}

registerScreen('reward', renderReward);
