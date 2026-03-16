// js/screens/stats-screen.js — Player Statistics & Learning Analytics Dashboard
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getXPProgress } from '../progression.js';

// ── Helpers ───────────────────────────────────────────────────────────────────

function pct(n, d) {
  if (d === 0) return 0;
  return Math.round((n / d) * 100);
}

function trendArrow(arr) {
  // Look at last 20 entries (1=correct, 0=wrong), compare first half vs second half
  const recent = arr.slice(-20);
  if (recent.length < 4) return { label: '数据不足', cls: 'trend-neutral', arrow: '—' };
  const mid = Math.floor(recent.length / 2);
  const first = recent.slice(0, mid).reduce((s, v) => s + v, 0) / mid;
  const second = recent.slice(mid).reduce((s, v) => s + v, 0) / (recent.length - mid);
  const diff = second - first;
  if (diff > 0.1) return { label: '上升中', cls: 'trend-up', arrow: '&#x25B2;' };
  if (diff < -0.1) return { label: '下降中', cls: 'trend-down', arrow: '&#x25BC;' };
  return { label: '稳定', cls: 'trend-neutral', arrow: '&#x25CF;' };
}

function subjectLabel(key) {
  const map = { vocab: '词汇', reading: '阅读', classical: '古文' };
  return map[key] || key;
}

function subjectIcon(key) {
  const map = { vocab: '&#x5B57;', reading: '&#x8BFB;', classical: '&#x53E4;' };
  return map[key] || '?';
}

// ── Render ────────────────────────────────────────────────────────────────────

function renderStats(params) {
  const div = document.createElement('div');
  div.className = 'screen';

  const profile = gameState.profile;
  if (!profile) {
    div.innerHTML = '<div style="padding:40px;text-align:center;color:var(--text-secondary);">无档案数据</div>';
    return div;
  }

  const stats = profile.stats || {};
  const accuracy = profile.accuracy || { vocab: [], reading: [], classical: [] };
  const returnTo = params?.returnTo || 'worldmap';

  // Overall
  const totalAnswered = (stats.totalCorrect || 0) + (stats.totalWrong || 0);
  const overallAccuracy = pct(stats.totalCorrect || 0, totalAnswered);
  const totalQuests = stats.totalQuests || 0;
  const estMinutes = totalQuests * 15;
  const estHours = Math.floor(estMinutes / 60);
  const estMins = estMinutes % 60;
  const timeStr = estHours > 0 ? `${estHours}h ${estMins}m` : `${estMins}m`;

  // Per-subject
  const subjects = ['vocab', 'reading', 'classical'];
  const subjectData = subjects.map(key => {
    const arr = accuracy[key] || [];
    const correct = arr.filter(v => v === 1).length;
    const total = arr.length;
    const acc = pct(correct, total);
    const trend = trendArrow(arr);
    return { key, correct, total, acc, trend };
  });

  // Combat
  const bestCombo = stats.maxCombo || 0;
  const bossKills = stats.totalBossKills || 0;
  const estDamage = (stats.totalCorrect || 0) * 12; // avg damage per correct answer
  const estCrits = Math.floor((stats.totalCorrect || 0) * (profile.critChance || 5) / 100);

  // Progression
  const xpProgress = getXPProgress(profile);
  const chaptersCompleted = Object.entries(profile.chapterProgress || {}).filter(
    ([id, p]) => p.questsCompleted >= 4
  ).length;
  const achievementsCount = (profile.achievements || []).length;
  const titlesCount = (profile.titles || []).length;
  const chengyuCount = (profile.chengyu || []).length;

  // Engagement
  const dailyStreak = profile.dailyLogin?.streak || 0;
  const totalGold = stats.totalGoldEarned || 0;
  const equipCount = [profile.equipment?.weapon, profile.equipment?.armor, profile.equipment?.accessory]
    .filter(Boolean).length + (profile.inventory || []).length;
  const talentSpent = Object.values(profile.talents || {}).reduce((s, v) => s + v, 0);

  // Pie chart offset for CSS conic-gradient
  const correctDeg = totalAnswered > 0 ? (stats.totalCorrect / totalAnswered) * 360 : 0;

  div.innerHTML = `
    <div class="stats-container screen-enter">
      <!-- Decorative ink background -->
      <div class="stats-ink-bg" aria-hidden="true">
        <div class="stats-ink-splash stats-splash-1"></div>
        <div class="stats-ink-splash stats-splash-2"></div>
      </div>

      <!-- Header -->
      <div class="stats-header">
        <button class="btn btn-sm stats-back-btn" id="btn-stats-back">
          <span style="margin-right:4px;">&larr;</span> 返回
        </button>
        <h2 class="stats-title">学习统计</h2>
        <div style="width:80px;"></div>
      </div>

      <div class="stats-scroll">

        <!-- ══ Overall Stats Card ══ -->
        <div class="stats-card stats-card-overall">
          <div class="stats-card-header">&#x1F4CA; 总体数据</div>
          <div class="stats-overall-grid">

            <!-- Circular accuracy indicator -->
            <div class="stats-accuracy-ring">
              <div class="stats-ring-outer" style="background: conic-gradient(
                var(--jade) 0deg ${correctDeg}deg,
                rgba(214,48,49,0.5) ${correctDeg}deg 360deg
              );">
                <div class="stats-ring-inner">
                  <span class="stats-ring-pct">${overallAccuracy}%</span>
                  <span class="stats-ring-label">正确率</span>
                </div>
              </div>
            </div>

            <!-- Stat numbers -->
            <div class="stats-overall-nums">
              <div class="stats-num-row">
                <span class="stats-num-icon" style="color:var(--jade);">&#x2714;</span>
                <span class="stats-num-label">正确</span>
                <span class="stats-num-value" style="color:var(--jade);">${stats.totalCorrect || 0}</span>
              </div>
              <div class="stats-num-row">
                <span class="stats-num-icon" style="color:var(--red);">&#x2718;</span>
                <span class="stats-num-label">错误</span>
                <span class="stats-num-value" style="color:var(--red);">${stats.totalWrong || 0}</span>
              </div>
              <div class="stats-num-row">
                <span class="stats-num-icon" style="color:var(--gold);">&#x2726;</span>
                <span class="stats-num-label">总题数</span>
                <span class="stats-num-value">${totalAnswered}</span>
              </div>
              <div class="stats-num-row">
                <span class="stats-num-icon" style="color:var(--purple);">&#x2605;</span>
                <span class="stats-num-label">冒险次数</span>
                <span class="stats-num-value">${totalQuests}</span>
              </div>
              <div class="stats-num-row">
                <span class="stats-num-icon" style="color:var(--bronze);">&#x231B;</span>
                <span class="stats-num-label">游戏时间</span>
                <span class="stats-num-value">${timeStr}</span>
              </div>
            </div>

            <!-- Mini pie -->
            <div class="stats-pie-legend">
              <div class="stats-pie-mini" style="background: conic-gradient(
                var(--jade) 0deg ${correctDeg}deg,
                rgba(214,48,49,0.4) ${correctDeg}deg 360deg
              );"></div>
              <div class="stats-pie-labels">
                <div><span style="color:var(--jade);">&#x25CF;</span> 正确 ${pct(stats.totalCorrect || 0, totalAnswered)}%</div>
                <div><span style="color:var(--red);">&#x25CF;</span> 错误 ${pct(stats.totalWrong || 0, totalAnswered)}%</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ Per-Subject Breakdown ══ -->
        <div class="stats-card">
          <div class="stats-card-header">&#x1F4DA; 科目分析</div>
          <div class="stats-subjects">
            ${subjectData.map(s => `
              <div class="stats-subject-row">
                <div class="stats-subject-head">
                  <span class="stats-subject-icon">${subjectIcon(s.key)}</span>
                  <span class="stats-subject-name">${subjectLabel(s.key)}</span>
                  <span class="stats-subject-acc">${s.acc}%</span>
                  <span class="stats-trend ${s.trend.cls}" title="${s.trend.label}">
                    ${s.trend.arrow} ${s.trend.label}
                  </span>
                </div>
                <!-- Bar chart -->
                <div class="stats-bar-track">
                  <div class="stats-bar-fill" style="width:${s.acc}%;">
                    <div class="stats-bar-glow"></div>
                  </div>
                </div>
                <div class="stats-subject-detail">
                  ${s.correct} / ${s.total} 题正确
                </div>
              </div>
            `).join('')}
          </div>
        </div>

        <!-- ══ Combat Stats ══ -->
        <div class="stats-card">
          <div class="stats-card-header">&#x2694; 战斗数据</div>
          <div class="stats-combat-grid">
            <div class="stats-combat-item">
              <div class="stats-combat-value" style="color:var(--gold);">${bestCombo}</div>
              <div class="stats-combat-label">最高连击</div>
              <div class="stats-combat-bar">
                <div class="stats-combat-bar-fill" style="width:${Math.min(bestCombo * 5, 100)}%;background:var(--gold);"></div>
              </div>
            </div>
            <div class="stats-combat-item">
              <div class="stats-combat-value" style="color:var(--red);">${bossKills}</div>
              <div class="stats-combat-label">Boss击杀</div>
              <div class="stats-combat-bar">
                <div class="stats-combat-bar-fill" style="width:${Math.min(bossKills * 20, 100)}%;background:var(--red);"></div>
              </div>
            </div>
            <div class="stats-combat-item">
              <div class="stats-combat-value" style="color:var(--jade);">${estDamage.toLocaleString()}</div>
              <div class="stats-combat-label">总伤害</div>
              <div class="stats-combat-bar">
                <div class="stats-combat-bar-fill" style="width:${Math.min(estDamage / 50, 100)}%;background:var(--jade);"></div>
              </div>
            </div>
            <div class="stats-combat-item">
              <div class="stats-combat-value" style="color:var(--purple);">${estCrits}</div>
              <div class="stats-combat-label">暴击次数</div>
              <div class="stats-combat-bar">
                <div class="stats-combat-bar-fill" style="width:${Math.min(estCrits * 2, 100)}%;background:var(--purple);"></div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ Progression Timeline ══ -->
        <div class="stats-card">
          <div class="stats-card-header">&#x1F3AF; 成长轨迹</div>
          <div class="stats-progress-timeline">
            <!-- Level + XP -->
            <div class="stats-timeline-row">
              <div class="stats-timeline-icon">
                <span class="stats-level-badge">Lv.${profile.level}</span>
              </div>
              <div class="stats-timeline-info">
                <div class="stats-timeline-label">当前等级</div>
                <div class="stats-xp-bar-track">
                  <div class="stats-xp-bar-fill" style="width:${xpProgress.percent}%;"></div>
                </div>
                <div class="stats-timeline-detail">${xpProgress.current} / ${xpProgress.needed} XP 升级</div>
              </div>
            </div>

            <!-- Chapters -->
            <div class="stats-timeline-row">
              <div class="stats-timeline-icon"><span style="font-size:1.2rem;">&#x1F4D6;</span></div>
              <div class="stats-timeline-info">
                <div class="stats-timeline-label">章节完成</div>
                <div class="stats-timeline-value">${chaptersCompleted} / 5 章</div>
              </div>
            </div>

            <!-- Achievements -->
            <div class="stats-timeline-row">
              <div class="stats-timeline-icon"><span style="font-size:1.2rem;">&#x1F3C6;</span></div>
              <div class="stats-timeline-info">
                <div class="stats-timeline-label">成就</div>
                <div class="stats-timeline-value">${achievementsCount} 已获得</div>
              </div>
            </div>

            <!-- Titles -->
            <div class="stats-timeline-row">
              <div class="stats-timeline-icon"><span style="font-size:1.2rem;">&#x1F451;</span></div>
              <div class="stats-timeline-info">
                <div class="stats-timeline-label">称号收集</div>
                <div class="stats-timeline-value">${titlesCount} 个称号</div>
              </div>
            </div>

            <!-- Chengyu -->
            <div class="stats-timeline-row">
              <div class="stats-timeline-icon"><span style="font-size:1.2rem;">&#x1F4DC;</span></div>
              <div class="stats-timeline-info">
                <div class="stats-timeline-label">成语收集</div>
                <div class="stats-timeline-value">${chengyuCount} 个成语</div>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ Engagement Stats ══ -->
        <div class="stats-card">
          <div class="stats-card-header">&#x1F525; 活跃数据</div>
          <div class="stats-engagement-grid">
            <div class="stats-engage-item">
              <div class="stats-engage-icon" style="background:rgba(214,48,49,0.15);color:var(--red);">&#x1F525;</div>
              <div class="stats-engage-value">${dailyStreak}</div>
              <div class="stats-engage-label">连续登录</div>
            </div>
            <div class="stats-engage-item">
              <div class="stats-engage-icon" style="background:rgba(212,160,23,0.15);color:var(--gold);">&#x2726;</div>
              <div class="stats-engage-value">${totalGold.toLocaleString()}</div>
              <div class="stats-engage-label">总金币</div>
            </div>
            <div class="stats-engage-item">
              <div class="stats-engage-icon" style="background:rgba(46,204,138,0.15);color:var(--jade);">&#x2694;</div>
              <div class="stats-engage-value">${equipCount}</div>
              <div class="stats-engage-label">装备收集</div>
            </div>
            <div class="stats-engage-item">
              <div class="stats-engage-icon" style="background:rgba(142,68,173,0.15);color:var(--purple);">&#x2605;</div>
              <div class="stats-engage-value">${talentSpent}</div>
              <div class="stats-engage-label">天赋点</div>
            </div>
          </div>
        </div>

        <!-- Bottom padding -->
        <div style="height:40px;"></div>
      </div>
    </div>

    <style>
      /* ── Stats Screen Styles ────────────────────────────────────── */
      .stats-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* Ink splashes */
      .stats-ink-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
      }
      .stats-ink-splash {
        position: absolute;
        border-radius: 50%;
      }
      .stats-splash-1 {
        width: 400px; height: 400px;
        top: -120px; left: -100px;
        background: radial-gradient(circle, rgba(46,204,138,0.04) 0%, transparent 65%);
        animation: stats-drift 25s ease-in-out infinite alternate;
      }
      .stats-splash-2 {
        width: 300px; height: 300px;
        bottom: -60px; right: -80px;
        background: radial-gradient(circle, rgba(212,160,23,0.04) 0%, transparent 65%);
        animation: stats-drift 18s ease-in-out infinite alternate-reverse;
      }
      @keyframes stats-drift {
        0%   { transform: translate(0,0) scale(1); }
        100% { transform: translate(20px,-15px) scale(1.06); }
      }

      /* Header */
      .stats-header {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px;
        border-bottom: 1px solid rgba(212,160,23,0.12);
      }
      .stats-back-btn {
        font-size: 0.85rem !important;
      }
      .stats-title {
        font-size: 1.4rem;
        letter-spacing: 0.25em;
        color: var(--gold);
        text-shadow: 0 0 18px rgba(212,160,23,0.3);
      }

      /* Scroll */
      .stats-scroll {
        position: relative;
        z-index: 1;
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
      }
      .stats-scroll::-webkit-scrollbar { width: 4px; }
      .stats-scroll::-webkit-scrollbar-thumb {
        background: rgba(212,160,23,0.2);
        border-radius: 4px;
      }

      /* Card */
      .stats-card {
        background: rgba(0,0,0,0.25);
        border: 1px solid rgba(212,160,23,0.1);
        border-radius: var(--radius-md);
        margin-bottom: 14px;
        padding: 16px;
        backdrop-filter: blur(4px);
        animation: stats-card-in 0.4s ease both;
      }
      .stats-card:nth-child(2) { animation-delay: 0.05s; }
      .stats-card:nth-child(3) { animation-delay: 0.10s; }
      .stats-card:nth-child(4) { animation-delay: 0.15s; }
      .stats-card:nth-child(5) { animation-delay: 0.20s; }
      @keyframes stats-card-in {
        from { opacity: 0; transform: translateY(12px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .stats-card-header {
        font-size: 1rem;
        font-weight: 700;
        color: var(--gold);
        margin-bottom: 14px;
        letter-spacing: 0.06em;
      }

      /* ── Overall Stats ── */
      .stats-overall-grid {
        display: grid;
        grid-template-columns: auto 1fr;
        gap: 16px;
        align-items: start;
      }

      /* Accuracy ring */
      .stats-accuracy-ring {
        grid-row: 1 / 3;
      }
      .stats-ring-outer {
        width: 110px;
        height: 110px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        box-shadow: 0 0 20px rgba(46,204,138,0.15);
      }
      .stats-ring-inner {
        width: 82px;
        height: 82px;
        border-radius: 50%;
        background: var(--bg-deep);
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
      }
      .stats-ring-pct {
        font-size: 1.5rem;
        font-weight: 800;
        color: var(--jade);
        line-height: 1;
      }
      .stats-ring-label {
        font-size: 0.7rem;
        color: var(--text-secondary);
        margin-top: 2px;
      }

      /* Stat rows */
      .stats-overall-nums {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stats-num-row {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .stats-num-icon {
        font-size: 0.9rem;
        width: 18px;
        text-align: center;
      }
      .stats-num-label {
        font-size: 0.82rem;
        color: var(--text-secondary);
        flex: 1;
      }
      .stats-num-value {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--text-primary);
      }

      /* Mini pie + legend */
      .stats-pie-legend {
        grid-column: 1 / -1;
        display: flex;
        align-items: center;
        gap: 12px;
        padding-top: 8px;
        border-top: 1px solid rgba(255,255,255,0.05);
      }
      .stats-pie-mini {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        flex-shrink: 0;
      }
      .stats-pie-labels {
        font-size: 0.78rem;
        color: var(--text-secondary);
        display: flex;
        flex-direction: column;
        gap: 2px;
      }

      /* ── Subject Breakdown ── */
      .stats-subjects {
        display: flex;
        flex-direction: column;
        gap: 14px;
      }
      .stats-subject-row {
        display: flex;
        flex-direction: column;
        gap: 6px;
      }
      .stats-subject-head {
        display: flex;
        align-items: center;
        gap: 8px;
      }
      .stats-subject-icon {
        font-size: 1rem;
        width: 24px;
        height: 24px;
        display: flex;
        align-items: center;
        justify-content: center;
        background: rgba(212,160,23,0.1);
        border-radius: 6px;
        color: var(--gold);
        font-weight: 700;
      }
      .stats-subject-name {
        font-size: 0.9rem;
        font-weight: 600;
        color: var(--text-primary);
        flex: 1;
      }
      .stats-subject-acc {
        font-size: 0.9rem;
        font-weight: 700;
        color: var(--jade);
      }
      .stats-trend {
        font-size: 0.75rem;
        padding: 2px 8px;
        border-radius: 10px;
      }
      .trend-up {
        color: var(--jade);
        background: rgba(46,204,138,0.12);
      }
      .trend-down {
        color: var(--red);
        background: rgba(214,48,49,0.12);
      }
      .trend-neutral {
        color: var(--text-dim);
        background: rgba(255,255,255,0.05);
      }

      /* Bar chart */
      .stats-bar-track {
        width: 100%;
        height: 10px;
        background: rgba(255,255,255,0.06);
        border-radius: 5px;
        overflow: hidden;
      }
      .stats-bar-fill {
        height: 100%;
        border-radius: 5px;
        background: linear-gradient(90deg, var(--jade), rgba(46,204,138,0.6));
        position: relative;
        transition: width 0.8s cubic-bezier(0.22,1,0.36,1);
      }
      .stats-bar-glow {
        position: absolute;
        right: 0;
        top: 0;
        width: 20px;
        height: 100%;
        background: linear-gradient(90deg, transparent, rgba(255,255,255,0.25));
        border-radius: 0 5px 5px 0;
      }
      .stats-subject-detail {
        font-size: 0.75rem;
        color: var(--text-dim);
      }

      /* ── Combat Stats ── */
      .stats-combat-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 12px;
      }
      .stats-combat-item {
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 8px;
        padding: 12px;
        text-align: center;
      }
      .stats-combat-value {
        font-size: 1.5rem;
        font-weight: 800;
        line-height: 1;
        margin-bottom: 4px;
      }
      .stats-combat-label {
        font-size: 0.78rem;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      .stats-combat-bar {
        width: 100%;
        height: 4px;
        background: rgba(255,255,255,0.06);
        border-radius: 2px;
        overflow: hidden;
      }
      .stats-combat-bar-fill {
        height: 100%;
        border-radius: 2px;
        transition: width 0.8s cubic-bezier(0.22,1,0.36,1);
      }

      /* ── Progression Timeline ── */
      .stats-progress-timeline {
        display: flex;
        flex-direction: column;
        gap: 0;
        position: relative;
        padding-left: 20px;
      }
      .stats-progress-timeline::before {
        content: '';
        position: absolute;
        left: 14px;
        top: 10px;
        bottom: 10px;
        width: 2px;
        background: linear-gradient(to bottom, var(--gold), rgba(212,160,23,0.15));
        border-radius: 1px;
      }
      .stats-timeline-row {
        display: flex;
        align-items: center;
        gap: 12px;
        padding: 10px 0;
        position: relative;
      }
      .stats-timeline-row::before {
        content: '';
        position: absolute;
        left: -12px;
        width: 8px;
        height: 8px;
        border-radius: 50%;
        background: var(--gold);
        box-shadow: 0 0 6px rgba(212,160,23,0.3);
      }
      .stats-timeline-icon {
        flex-shrink: 0;
        width: 36px;
        text-align: center;
      }
      .stats-level-badge {
        font-size: 0.9rem;
        font-weight: 800;
        color: var(--gold);
        background: rgba(212,160,23,0.15);
        padding: 2px 8px;
        border-radius: 6px;
        border: 1px solid rgba(212,160,23,0.3);
      }
      .stats-timeline-info {
        flex: 1;
        display: flex;
        flex-direction: column;
        gap: 3px;
      }
      .stats-timeline-label {
        font-size: 0.85rem;
        color: var(--text-primary);
        font-weight: 600;
      }
      .stats-timeline-value {
        font-size: 0.9rem;
        color: var(--jade);
        font-weight: 700;
      }
      .stats-timeline-detail {
        font-size: 0.75rem;
        color: var(--text-dim);
      }

      /* XP bar in timeline */
      .stats-xp-bar-track {
        width: 100%;
        height: 8px;
        background: rgba(255,255,255,0.06);
        border-radius: 4px;
        overflow: hidden;
      }
      .stats-xp-bar-fill {
        height: 100%;
        border-radius: 4px;
        background: linear-gradient(90deg, var(--gold), var(--gold-bright));
        transition: width 0.8s cubic-bezier(0.22,1,0.36,1);
      }

      /* ── Engagement Grid ── */
      .stats-engagement-grid {
        display: grid;
        grid-template-columns: 1fr 1fr;
        gap: 10px;
      }
      .stats-engage-item {
        display: flex;
        flex-direction: column;
        align-items: center;
        padding: 14px 8px;
        background: rgba(0,0,0,0.2);
        border: 1px solid rgba(255,255,255,0.05);
        border-radius: 8px;
        gap: 6px;
      }
      .stats-engage-icon {
        width: 36px;
        height: 36px;
        border-radius: 50%;
        display: flex;
        align-items: center;
        justify-content: center;
        font-size: 1.1rem;
      }
      .stats-engage-value {
        font-size: 1.3rem;
        font-weight: 800;
        color: var(--text-primary);
        line-height: 1;
      }
      .stats-engage-label {
        font-size: 0.75rem;
        color: var(--text-secondary);
      }

      /* Responsive */
      @media (max-width: 400px) {
        .stats-overall-grid {
          grid-template-columns: 1fr;
        }
        .stats-accuracy-ring {
          justify-self: center;
          grid-row: auto;
        }
        .stats-combat-grid,
        .stats-engagement-grid {
          grid-template-columns: 1fr 1fr;
          gap: 8px;
        }
        .stats-combat-value { font-size: 1.2rem; }
        .stats-engage-value { font-size: 1.1rem; }
      }
    </style>
  `;

  // ── Event Wiring ────────────────────────────────────────────────────────────
  setTimeout(() => {
    div.querySelector('#btn-stats-back')?.addEventListener('click', () => {
      showScreen(returnTo);
    });

    // Animate bars in after a short delay (so transition triggers)
    const bars = div.querySelectorAll('.stats-bar-fill, .stats-combat-bar-fill, .stats-xp-bar-fill');
    bars.forEach(bar => {
      const target = bar.style.width;
      bar.style.width = '0%';
      setTimeout(() => { bar.style.width = target; }, 150);
    });
  }, 0);

  return div;
}

registerScreen('stats', renderStats);
