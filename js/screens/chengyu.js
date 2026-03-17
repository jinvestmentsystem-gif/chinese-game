// js/screens/chengyu.js — Collections screen with tabs: Chengyu, Achievements, Titles
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadChengyu } from '../content-loader.js';
import { TITLES, ACHIEVEMENT_REWARDS, getChengyuBonuses } from '../progression.js';
import { playSound } from '../audio.js';

// ── Achievement milestones (mirrored from reward.js to avoid circular dep) ───
const MILESTONES = [
  { id: 'first_quest',  check: s => s.totalQuests >= 1,   title: '初出茅庐', desc: '完成第一个任务', threshold: s => ({ current: s.totalQuests, target: 1 }) },
  { id: 'first_boss',   check: s => s.totalBossKills >= 1, title: '初战告捷', desc: '击败第一个BOSS', threshold: s => ({ current: s.totalBossKills, target: 1 }) },
  { id: 'combo_3',      check: s => s.maxCombo >= 3,       title: '连击新手', desc: '达成3连击', threshold: s => ({ current: s.maxCombo, target: 3 }) },
  { id: 'combo_5',      check: s => s.maxCombo >= 5,       title: '连击达人', desc: '达成5连击', threshold: s => ({ current: s.maxCombo, target: 5 }) },
  { id: 'combo_10',     check: s => s.maxCombo >= 10,      title: '连击大师', desc: '达成10连击', threshold: s => ({ current: s.maxCombo, target: 10 }) },
  { id: 'correct_50',   check: s => s.totalCorrect >= 50,  title: '学有所成', desc: '累计答对50题', threshold: s => ({ current: s.totalCorrect, target: 50 }) },
  { id: 'correct_100',  check: s => s.totalCorrect >= 100, title: '博学多才', desc: '累计答对100题', threshold: s => ({ current: s.totalCorrect, target: 100 }) },
  { id: 'correct_200',  check: s => s.totalCorrect >= 200, title: '文字大师', desc: '累计答对200题', threshold: s => ({ current: s.totalCorrect, target: 200 }) },
  { id: 'quest_5',      check: s => s.totalQuests >= 5,    title: '冒险家',   desc: '完成5个任务', threshold: s => ({ current: s.totalQuests, target: 5 }) },
  { id: 'quest_10',     check: s => s.totalQuests >= 10,   title: '老练冒险家', desc: '完成10个任务', threshold: s => ({ current: s.totalQuests, target: 10 }) },
  { id: 'boss_3',       check: s => s.totalBossKills >= 3, title: 'BOSS猎人', desc: '击败3个BOSS', threshold: s => ({ current: s.totalBossKills, target: 3 }) },
  { id: 'xp_500',       check: s => s.totalXP >= 500,      title: '经验丰富', desc: '累计获得500经验', threshold: s => ({ current: s.totalXP, target: 500 }) },
  { id: 'xp_2000',      check: s => s.totalXP >= 2000,     title: '身经百战', desc: '累计获得2000经验', threshold: s => ({ current: s.totalXP, target: 2000 }) },
];

// Rarity mapping based on chapter
function getChengyuRarity(chapter) {
  if (chapter >= 5) return { label: '传说', color: '#e67e22', border: '#e67e22', bg: 'rgba(230,126,34,0.1)' };
  if (chapter >= 3) return { label: '稀有', color: '#a855f7', border: '#a855f7', bg: 'rgba(168,85,247,0.1)' };
  return { label: '普通', color: 'var(--accent-jade)', border: 'var(--accent-jade)', bg: 'rgba(39,174,96,0.08)' };
}

async function renderChengyu() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const allChengyu = await loadChengyu();

  let activeTab = 'chengyu';

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes collection-fade-in {
      from { opacity: 0; transform: translateY(12px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes collection-card-pop {
      0% { transform: scale(0.95); opacity: 0; }
      100% { transform: scale(1); opacity: 1; }
    }
    @keyframes title-glow {
      0%, 100% { box-shadow: 0 0 8px rgba(212,160,23,0.3); }
      50% { box-shadow: 0 0 16px rgba(212,160,23,0.6); }
    }
    .collection-tabs {
      display: flex;
      position: relative;
      margin-bottom: 16px;
      border-bottom: 2px solid var(--bg-secondary);
      width: 100%;
      max-width: 600px;
    }
    .collection-tab {
      flex: 1;
      padding: 12px 16px;
      text-align: center;
      cursor: pointer;
      font-size: 1rem;
      font-weight: 600;
      color: var(--text-secondary);
      background: none;
      border: none;
      font-family: var(--font-main);
      transition: color 0.3s;
      position: relative;
      z-index: 1;
    }
    .collection-tab.active {
      color: var(--accent-gold);
    }
    .collection-tab:hover:not(.active) {
      color: var(--text-primary);
    }
    .collection-tab-indicator {
      position: absolute;
      bottom: -2px;
      height: 2px;
      background: var(--accent-gold);
      transition: left 0.3s cubic-bezier(0.4, 0, 0.2, 1), width 0.3s cubic-bezier(0.4, 0, 0.2, 1);
      border-radius: 2px 2px 0 0;
      box-shadow: 0 0 8px rgba(212,160,23,0.4);
    }
    .collection-panel {
      width: 100%;
      max-width: 600px;
      animation: collection-fade-in 0.3s ease-out;
    }
    .cy-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
      gap: 12px;
      width: 100%;
      max-height: 65vh;
      overflow-y: auto;
      padding: 4px;
    }
    .cy-card {
      background: var(--bg-card);
      border-radius: 8px;
      padding: 14px;
      border: 2px solid var(--bg-secondary);
      animation: collection-card-pop 0.3s ease-out;
      animation-fill-mode: backwards;
      position: relative;
    }
    .cy-card.collected {
      border-color: var(--accent-gold);
    }
    .cy-card.locked {
      opacity: 0.4;
    }
    .cy-rarity-badge {
      position: absolute;
      top: 8px;
      right: 8px;
      font-size: 0.7rem;
      font-weight: 700;
      padding: 2px 8px;
      border-radius: 4px;
      letter-spacing: 0.06em;
    }
    .cy-word { font-size: 1.3rem; font-weight: 700; color: var(--accent-gold); margin-bottom: 4px; }
    .cy-pinyin { font-size: 0.82rem; color: var(--text-secondary); margin-bottom: 6px; }
    .cy-meaning { margin-bottom: 4px; font-size: 0.92rem; }
    .cy-origin { font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 4px; }
    .cy-example { font-size: 0.85rem; color: var(--accent-jade); }

    .ach-grid {
      display: flex;
      flex-direction: column;
      gap: 10px;
      width: 100%;
      max-height: 65vh;
      overflow-y: auto;
      padding: 4px;
    }
    .ach-card {
      background: var(--bg-card);
      border-radius: 8px;
      padding: 14px 16px;
      display: flex;
      align-items: center;
      gap: 14px;
      border: 2px solid var(--bg-secondary);
      animation: collection-card-pop 0.3s ease-out;
      animation-fill-mode: backwards;
    }
    .ach-card.earned {
      border-color: var(--accent-gold);
    }
    .ach-card.locked {
      opacity: 0.6;
    }
    .ach-icon {
      width: 44px;
      height: 44px;
      border-radius: 50%;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 1.4rem;
      flex-shrink: 0;
    }
    .ach-icon.earned {
      background: linear-gradient(135deg, #d4a017, #f0c040);
      box-shadow: 0 0 10px rgba(212,160,23,0.3);
    }
    .ach-icon.locked {
      background: var(--bg-secondary);
    }
    .ach-info { flex: 1; min-width: 0; }
    .ach-title { font-weight: 700; font-size: 1rem; margin-bottom: 2px; }
    .ach-desc { font-size: 0.85rem; color: var(--text-secondary); }
    .ach-progress-bar {
      width: 100%;
      height: 6px;
      background: var(--bg-secondary);
      border-radius: 3px;
      overflow: hidden;
      margin-top: 6px;
    }
    .ach-progress-fill {
      height: 100%;
      border-radius: 3px;
      background: linear-gradient(90deg, var(--accent-jade), var(--accent-gold));
      transition: width 0.5s ease-out;
    }
    .ach-reward {
      font-size: 0.82rem;
      color: var(--accent-gold);
      font-weight: 600;
      flex-shrink: 0;
    }

    .title-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
      gap: 10px;
      width: 100%;
      max-height: 65vh;
      overflow-y: auto;
      padding: 4px;
    }
    .title-card {
      background: var(--bg-card);
      border-radius: 8px;
      padding: 14px 16px;
      text-align: center;
      border: 2px solid var(--bg-secondary);
      cursor: pointer;
      transition: all 0.3s;
      animation: collection-card-pop 0.3s ease-out;
      animation-fill-mode: backwards;
    }
    .title-card.earned {
      border-color: var(--bg-secondary);
    }
    .title-card.earned:hover {
      border-color: var(--accent-gold);
      transform: translateY(-2px);
    }
    .title-card.active-title {
      border-color: var(--accent-gold);
      animation: title-glow 2s infinite;
    }
    .title-card.locked {
      opacity: 0.4;
      cursor: default;
    }
    .title-name {
      font-size: 1.1rem;
      font-weight: 700;
      margin-bottom: 4px;
    }
    .title-desc {
      font-size: 0.82rem;
      color: var(--text-secondary);
    }
    .title-active-badge {
      display: inline-block;
      font-size: 0.7rem;
      padding: 2px 8px;
      border-radius: 4px;
      background: var(--accent-gold);
      color: #1a1a2e;
      font-weight: 700;
      margin-top: 6px;
    }
  `;
  div.appendChild(style);

  // Header bar
  const header = document.createElement('div');
  header.style.cssText = 'display:flex;justify-content:space-between;align-items:center;width:100%;max-width:600px;padding:0 4px;margin-bottom:8px;';
  header.innerHTML = `
    <h2 style="margin:0;">收藏</h2>
    <button class="btn" id="btn-back" style="padding:6px 16px;font-size:0.9rem;">返回</button>
  `;
  div.appendChild(header);

  // Tab bar
  const tabBar = document.createElement('div');
  tabBar.className = 'collection-tabs';
  const tabs = [
    { id: 'chengyu', label: `成语 (${(profile.chengyu || []).length})` },
    { id: 'achievements', label: '成就' },
    { id: 'titles', label: '称号' },
  ];
  tabs.forEach(t => {
    const btn = document.createElement('button');
    btn.className = `collection-tab${t.id === activeTab ? ' active' : ''}`;
    btn.dataset.tab = t.id;
    btn.textContent = t.label;
    tabBar.appendChild(btn);
  });

  // Animated indicator
  const indicator = document.createElement('div');
  indicator.className = 'collection-tab-indicator';
  tabBar.appendChild(indicator);
  div.appendChild(tabBar);

  // Content panel
  const panel = document.createElement('div');
  panel.className = 'collection-panel';
  div.appendChild(panel);

  // Position indicator under the active tab
  function updateIndicator() {
    const activeBtn = tabBar.querySelector(`.collection-tab.active`);
    if (activeBtn) {
      const tabBarRect = tabBar.getBoundingClientRect();
      const btnRect = activeBtn.getBoundingClientRect();
      indicator.style.left = (btnRect.left - tabBarRect.left) + 'px';
      indicator.style.width = btnRect.width + 'px';
    }
  }

  // Render tab content
  function renderTab(tabId) {
    activeTab = tabId;
    // Update active class
    tabBar.querySelectorAll('.collection-tab').forEach(btn => {
      btn.classList.toggle('active', btn.dataset.tab === tabId);
    });
    updateIndicator();

    panel.innerHTML = '';
    panel.style.animation = 'none';
    void panel.offsetWidth; // reflow
    panel.style.animation = 'collection-fade-in 0.3s ease-out';

    if (tabId === 'chengyu') renderChengyuTab();
    else if (tabId === 'achievements') renderAchievementsTab();
    else if (tabId === 'titles') renderTitlesTab();
  }

  // ── TAB 1: Chengyu ──
  function renderChengyuTab() {
    const collected = allChengyu.filter(cy => (profile.chengyu || []).includes(cy.id));
    const locked = allChengyu.filter(cy => !(profile.chengyu || []).includes(cy.id));
    const bonuses = getChengyuBonuses(profile);

    // Passive bonus summary
    if (bonuses.length > 0) {
      const bonusDiv = document.createElement('div');
      bonusDiv.style.cssText = 'background:var(--bg-card);border-radius:8px;padding:12px 16px;margin-bottom:12px;width:100%;';
      bonusDiv.innerHTML = `
        <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:6px;">收集加成 (${collected.length}个成语)</div>
        <div style="display:flex;gap:8px;flex-wrap:wrap;">
          ${bonuses.map(b => `<span style="font-size:0.82rem;padding:2px 8px;background:rgba(39,174,96,0.1);border:1px solid rgba(39,174,96,0.2);border-radius:4px;color:var(--accent-jade);">${b.label}</span>`).join('')}
        </div>
      `;
      panel.appendChild(bonusDiv);
    }

    const grid = document.createElement('div');
    grid.className = 'cy-grid';

    collected.forEach((cy, i) => {
      const rarity = getChengyuRarity(cy.chapter || 1);
      const card = document.createElement('div');
      card.className = 'cy-card collected';
      card.style.animationDelay = `${i * 0.05}s`;
      card.innerHTML = `
        <span class="cy-rarity-badge" style="color:${rarity.color};background:${rarity.bg};border:1px solid ${rarity.border};">${rarity.label}</span>
        <div class="cy-word">${cy.chengyu}</div>
        <div class="cy-pinyin">${cy.pinyin}</div>
        <div class="cy-meaning">${cy.meaning}</div>
        <div class="cy-origin">${cy.origin}</div>
        <div class="cy-example">例：${cy.example}</div>
      `;
      grid.appendChild(card);
    });

    locked.forEach((cy, i) => {
      const rarity = getChengyuRarity(cy.chapter || 1);
      const card = document.createElement('div');
      card.className = 'cy-card locked';
      card.style.animationDelay = `${(collected.length + i) * 0.05}s`;
      card.innerHTML = `
        <span class="cy-rarity-badge" style="color:${rarity.color};background:${rarity.bg};border:1px solid ${rarity.border};opacity:0.5;">${rarity.label}</span>
        <div class="cy-word">？？？？</div>
        <div class="cy-pinyin">${cy.era}</div>
      `;
      grid.appendChild(card);
    });

    panel.appendChild(grid);
  }

  // ── TAB 2: Achievements ──
  function renderAchievementsTab() {
    const stats = profile.stats || {};
    const earned = profile.achievements || [];

    // Summary
    const summary = document.createElement('div');
    summary.style.cssText = 'background:var(--bg-card);border-radius:8px;padding:12px 16px;margin-bottom:12px;width:100%;text-align:center;';
    summary.innerHTML = `
      <span style="color:var(--accent-gold);font-weight:700;font-size:1.1rem;">${earned.length}</span>
      <span style="color:var(--text-secondary);font-size:0.9rem;"> / ${MILESTONES.length} 成就已解锁</span>
    `;
    panel.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'ach-grid';

    // Show earned first, then locked
    const sortedMilestones = [...MILESTONES].sort((a, b) => {
      const aEarned = earned.includes(a.id);
      const bEarned = earned.includes(b.id);
      if (aEarned && !bEarned) return -1;
      if (!aEarned && bEarned) return 1;
      return 0;
    });

    sortedMilestones.forEach((m, i) => {
      const isEarned = earned.includes(m.id);
      const reward = ACHIEVEMENT_REWARDS[m.id];
      const card = document.createElement('div');
      card.className = `ach-card ${isEarned ? 'earned' : 'locked'}`;
      card.style.animationDelay = `${i * 0.05}s`;

      const iconDiv = document.createElement('div');
      iconDiv.className = `ach-icon ${isEarned ? 'earned' : 'locked'}`;
      iconDiv.textContent = isEarned ? '🏆' : '🔒';
      card.appendChild(iconDiv);

      const infoDiv = document.createElement('div');
      infoDiv.className = 'ach-info';

      const titleEl = document.createElement('div');
      titleEl.className = 'ach-title';
      titleEl.style.color = isEarned ? 'var(--accent-gold)' : 'var(--text-primary)';
      titleEl.textContent = m.title;
      infoDiv.appendChild(titleEl);

      const descEl = document.createElement('div');
      descEl.className = 'ach-desc';
      descEl.textContent = m.desc;
      infoDiv.appendChild(descEl);

      // Progress bar for locked achievements
      if (!isEarned && m.threshold) {
        const progress = m.threshold(stats);
        const pct = Math.min(100, Math.round((progress.current / progress.target) * 100));
        const progressBar = document.createElement('div');
        progressBar.className = 'ach-progress-bar';
        progressBar.innerHTML = `<div class="ach-progress-fill" style="width:${pct}%;"></div>`;
        infoDiv.appendChild(progressBar);

        const progressLabel = document.createElement('div');
        progressLabel.style.cssText = 'font-size:0.75rem;color:var(--text-secondary);margin-top:2px;';
        progressLabel.textContent = `${progress.current} / ${progress.target}`;
        infoDiv.appendChild(progressLabel);
      }

      card.appendChild(infoDiv);

      // Reward display
      if (reward) {
        const rewardEl = document.createElement('div');
        rewardEl.className = 'ach-reward';
        rewardEl.textContent = isEarned ? `+${reward.gold} 💰` : `${reward.gold} 💰`;
        rewardEl.style.opacity = isEarned ? '1' : '0.5';
        card.appendChild(rewardEl);
      }

      grid.appendChild(card);
    });

    panel.appendChild(grid);
  }

  // ── TAB 3: Titles ──
  function renderTitlesTab() {
    const earnedTitles = profile.titles || ['新手文字侠'];
    const currentActive = profile.activeTitle || '新手文字侠';

    // Summary
    const summary = document.createElement('div');
    summary.style.cssText = 'background:var(--bg-card);border-radius:8px;padding:12px 16px;margin-bottom:12px;width:100%;text-align:center;';
    summary.innerHTML = `
      <div style="font-size:0.85rem;color:var(--text-secondary);margin-bottom:4px;">当前称号</div>
      <div style="font-size:1.2rem;font-weight:700;color:var(--accent-gold);">${currentActive}</div>
      <div style="font-size:0.82rem;color:var(--text-secondary);margin-top:4px;">
        ${earnedTitles.length} / ${Object.keys(TITLES).length} 称号已解锁
      </div>
    `;
    panel.appendChild(summary);

    const grid = document.createElement('div');
    grid.className = 'title-grid';

    // Show earned first, then locked
    const allTitles = Object.entries(TITLES);
    const sortedTitles = [...allTitles].sort((a, b) => {
      const aEarned = earnedTitles.includes(a[0]);
      const bEarned = earnedTitles.includes(b[0]);
      if (aEarned && !bEarned) return -1;
      if (!aEarned && bEarned) return 1;
      return 0;
    });

    sortedTitles.forEach(([titleName, titleData], i) => {
      const isEarned = earnedTitles.includes(titleName);
      const isActive = titleName === currentActive;

      const card = document.createElement('div');
      card.className = `title-card ${isEarned ? 'earned' : 'locked'} ${isActive ? 'active-title' : ''}`;
      card.style.animationDelay = `${i * 0.05}s`;

      const nameEl = document.createElement('div');
      nameEl.className = 'title-name';
      nameEl.style.color = isActive ? 'var(--accent-gold)' : isEarned ? 'var(--text-primary)' : 'var(--text-secondary)';
      nameEl.textContent = isEarned ? titleName : '???';
      card.appendChild(nameEl);

      const descEl = document.createElement('div');
      descEl.className = 'title-desc';
      descEl.textContent = titleData.desc;
      card.appendChild(descEl);

      if (isActive) {
        const badge = document.createElement('div');
        badge.className = 'title-active-badge';
        badge.textContent = '使用中';
        card.appendChild(badge);
      }

      // Click to change active title
      if (isEarned && !isActive) {
        card.addEventListener('click', () => {
          playSound('click');
          profile.activeTitle = titleName;
          gameState.save();
          renderTab('titles');
        });
      }

      grid.appendChild(card);
    });

    panel.appendChild(grid);
  }

  // Tab click handlers
  tabBar.querySelectorAll('.collection-tab').forEach(btn => {
    btn.addEventListener('click', () => {
      playSound('click');
      renderTab(btn.dataset.tab);
    });
  });

  // Back button
  setTimeout(() => {
    const backBtn = div.querySelector('#btn-back');
    if (backBtn) backBtn.addEventListener('click', () => showScreen('worldmap'));

    // Position indicator after DOM is rendered
    updateIndicator();
  }, 0);

  // Initial render
  renderTab('chengyu');

  // Re-position indicator on resize
  const resizeHandler = () => updateIndicator();
  window.addEventListener('resize', resizeHandler);

  // Cleanup on screen change (MutationObserver pattern)
  const observer = new MutationObserver(() => {
    if (!document.body.contains(div)) {
      window.removeEventListener('resize', resizeHandler);
      observer.disconnect();
    }
  });
  observer.observe(document.body, { childList: true, subtree: true });

  return div;
}

registerScreen('chengyu', renderChengyu);
