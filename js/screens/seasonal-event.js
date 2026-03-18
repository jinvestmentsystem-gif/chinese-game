// js/screens/seasonal-event.js — Placeholder seasonal event system
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';

const SEASONAL_EVENTS = [
  { id: 'spring_2026', name: '春节大作战', start: '2026-01-28', end: '2026-02-11', icon: '🧧', color: '#d63031', reward: { gold: 500, title: '龙年勇士' } },
  { id: 'midautumn_2026', name: '中秋诗会', start: '2026-09-28', end: '2026-10-05', icon: '🌕', color: '#f9ca24', reward: { gold: 400, title: '月下诗人' } },
  { id: 'dragonboat_2026', name: '端午龙舟赛', start: '2026-06-17', end: '2026-06-21', icon: '🐉', color: '#2ecc8a', reward: { gold: 350, title: '龙舟勇士' } },
];

function parseDate(str) {
  const [y, m, d] = str.split('-').map(Number);
  return new Date(y, m - 1, d);
}

function getActiveEvent(now) {
  for (const evt of SEASONAL_EVENTS) {
    const start = parseDate(evt.start);
    const end = parseDate(evt.end);
    end.setHours(23, 59, 59, 999);
    if (now >= start && now <= end) return evt;
  }
  return null;
}

function getNextEvent(now) {
  let closest = null;
  let closestDiff = Infinity;
  for (const evt of SEASONAL_EVENTS) {
    const start = parseDate(evt.start);
    const diff = start - now;
    if (diff > 0 && diff < closestDiff) {
      closestDiff = diff;
      closest = evt;
    }
  }
  return closest;
}

function getTimeRemaining(now, endDateStr) {
  const end = parseDate(endDateStr);
  end.setHours(23, 59, 59, 999);
  const remaining = end - now;
  if (remaining <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return { days, hours, minutes };
}

function getTimeUntilStart(now, startDateStr) {
  const start = parseDate(startDateStr);
  const remaining = start - now;
  if (remaining <= 0) return { days: 0, hours: 0, minutes: 0 };
  const days = Math.floor(remaining / 86400000);
  const hours = Math.floor((remaining % 86400000) / 3600000);
  const minutes = Math.floor((remaining % 3600000) / 60000);
  return { days, hours, minutes };
}

function renderSeasonalEvent() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const now = new Date();

  // Init seasonal events state
  if (!profile.seasonalEvents) {
    profile.seasonalEvents = {};
    gameState.save();
  }

  const activeEvent = getActiveEvent(now);
  const nextEvent = getNextEvent(now);

  // Inject styles
  const style = document.createElement('style');
  style.textContent = `
    @keyframes se-fade-in {
      from { opacity: 0; transform: translateY(16px); }
      to { opacity: 1; transform: translateY(0); }
    }
    @keyframes se-icon-float {
      0%, 100% { transform: translateY(0) scale(1); }
      50% { transform: translateY(-12px) scale(1.08); }
    }
    @keyframes se-banner-glow {
      0%, 100% { box-shadow: 0 0 20px var(--evt-color-a), 0 0 40px var(--evt-color-b); }
      50% { box-shadow: 0 0 40px var(--evt-color-a), 0 0 70px var(--evt-color-b); }
    }
    @keyframes se-shimmer {
      0% { background-position: -200% center; }
      100% { background-position: 200% center; }
    }
    @keyframes se-pulse {
      0%, 100% { opacity: 0.6; }
      50% { opacity: 1; }
    }
    @keyframes se-lantern-sway {
      0%, 100% { transform: rotate(-3deg); }
      50% { transform: rotate(3deg); }
    }
  `;
  div.appendChild(style);

  if (activeEvent) {
    // Active event view
    const remaining = getTimeRemaining(now, activeEvent.end);
    const participated = profile.seasonalEvents[activeEvent.id];

    div.innerHTML += `
      <div style="
        display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh;
        background:linear-gradient(180deg, #0a0a14 0%, ${activeEvent.color}15 50%, #0a0a14 100%);
        --evt-color-a:${activeEvent.color}44;--evt-color-b:${activeEvent.color}22;
      ">
        <!-- Header -->
        <div style="width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <button id="se-back" style="
            padding:8px 16px;font-size:0.95rem;background:var(--bg-secondary);color:var(--text-primary);
            border:1px solid var(--border-color);border-radius:8px;cursor:pointer;
          ">← 返回</button>
          <h2 style="color:${activeEvent.color};font-size:1.3rem;font-weight:700;margin:0;">🎉 限时活动</h2>
          <div style="width:70px;"></div>
        </div>

        <!-- Event Banner -->
        <div style="
          width:100%;max-width:440px;border-radius:20px;overflow:hidden;
          background:linear-gradient(145deg, #1a1a2e, #16213e);
          border:2px solid ${activeEvent.color}66;
          animation: se-banner-glow 3s ease-in-out infinite, se-fade-in 0.6s ease-out;
          margin-bottom:24px;
        ">
          <!-- Event Header -->
          <div style="
            padding:32px 24px 24px;text-align:center;
            background:linear-gradient(180deg, ${activeEvent.color}22 0%, transparent 100%);
          ">
            <div style="
              font-size:4.5rem;margin-bottom:12px;
              animation: se-icon-float 3s ease-in-out infinite;
              filter: drop-shadow(0 0 16px ${activeEvent.color}66);
            ">${activeEvent.icon}</div>
            <h3 style="
              font-size:2rem;font-weight:900;color:${activeEvent.color};margin:0 0 6px;
              text-shadow: 0 0 20px ${activeEvent.color}44;
              letter-spacing:0.15em;
            ">${activeEvent.name}</h3>
            <div style="
              display:inline-block;padding:4px 16px;
              background:${activeEvent.color}22;border-radius:20px;border:1px solid ${activeEvent.color}44;
              font-size:0.85rem;color:${activeEvent.color};font-weight:600;
              animation: se-pulse 2s ease-in-out infinite;
            ">🔴 活动进行中</div>
          </div>

          <!-- Time Remaining -->
          <div style="padding:0 24px 20px;">
            <div style="
              padding:16px;background:rgba(0,0,0,0.2);border-radius:12px;
              border:1px solid ${activeEvent.color}22;text-align:center;margin-bottom:16px;
            ">
              <div style="font-size:0.8rem;color:var(--text-dim);margin-bottom:8px;">剩余时间</div>
              <div style="display:flex;justify-content:center;gap:14px;">
                <div>
                  <div style="font-size:1.8rem;font-weight:900;color:${activeEvent.color};">${remaining.days}</div>
                  <div style="font-size:0.7rem;color:var(--text-dim);">天</div>
                </div>
                <div style="color:var(--text-dim);font-size:1.8rem;line-height:1.3;">:</div>
                <div>
                  <div style="font-size:1.8rem;font-weight:900;color:${activeEvent.color};">${remaining.hours}</div>
                  <div style="font-size:0.7rem;color:var(--text-dim);">时</div>
                </div>
                <div style="color:var(--text-dim);font-size:1.8rem;line-height:1.3;">:</div>
                <div>
                  <div style="font-size:1.8rem;font-weight:900;color:${activeEvent.color};">${remaining.minutes}</div>
                  <div style="font-size:0.7rem;color:var(--text-dim);">分</div>
                </div>
              </div>
            </div>

            <!-- Reward Preview -->
            <div style="
              padding:14px;background:rgba(212,160,23,0.08);border-radius:12px;
              border:1px solid rgba(212,160,23,0.2);margin-bottom:16px;
            ">
              <div style="font-size:0.85rem;color:var(--text-dim);margin-bottom:10px;text-align:center;">活动奖励</div>
              <div style="display:flex;justify-content:center;gap:20px;">
                <div style="text-align:center;">
                  <div style="font-size:1.4rem;">🪙</div>
                  <div style="font-size:1.1rem;font-weight:700;color:var(--accent-gold);">${activeEvent.reward.gold}</div>
                  <div style="font-size:0.7rem;color:var(--text-dim);">金币</div>
                </div>
                <div style="text-align:center;">
                  <div style="font-size:1.4rem;">🏅</div>
                  <div style="font-size:1rem;font-weight:700;color:var(--accent-jade);">${activeEvent.reward.title}</div>
                  <div style="font-size:0.7rem;color:var(--text-dim);">称号</div>
                </div>
              </div>
            </div>

            <!-- Status / Action -->
            ${participated ? `
              <div style="
                text-align:center;padding:14px;background:rgba(46,204,138,0.1);border-radius:10px;
                border:1px solid rgba(46,204,138,0.3);
              ">
                <div style="font-size:1.3rem;margin-bottom:4px;">✅</div>
                <div style="font-size:1rem;color:var(--accent-jade);font-weight:700;">已参与活动</div>
              </div>
            ` : `
              <div style="
                text-align:center;padding:16px;background:${activeEvent.color}15;border-radius:12px;
                border:1px solid ${activeEvent.color}33;
              ">
                <div style="font-size:0.95rem;color:var(--text-secondary);margin-bottom:8px;">活动任务即将开放</div>
                <div style="font-size:0.85rem;color:var(--text-dim);">完成活动任务获取限定奖励</div>
              </div>
            `}
          </div>
        </div>

        <!-- All Events List -->
        ${renderAllEventsList(now)}
      </div>`;
  } else {
    // No active event view
    div.innerHTML += `
      <div style="
        display:flex;flex-direction:column;align-items:center;padding:20px;min-height:100vh;
        background:linear-gradient(180deg, #0a0a14 0%, #1a1a28 50%, #0a0a14 100%);
      ">
        <!-- Header -->
        <div style="width:100%;max-width:480px;display:flex;align-items:center;justify-content:space-between;margin-bottom:20px;">
          <button id="se-back" style="
            padding:8px 16px;font-size:0.95rem;background:var(--bg-secondary);color:var(--text-primary);
            border:1px solid var(--border-color);border-radius:8px;cursor:pointer;
          ">← 返回</button>
          <h2 style="color:var(--accent-gold);font-size:1.3rem;font-weight:700;margin:0;">📅 限时活动</h2>
          <div style="width:70px;"></div>
        </div>

        <!-- No Active Event -->
        <div style="
          width:100%;max-width:440px;padding:40px 24px;text-align:center;
          background:var(--bg-secondary);border-radius:16px;border:1px solid var(--border-color);
          animation: se-fade-in 0.6s ease-out;margin-bottom:24px;
        ">
          <div style="font-size:3rem;margin-bottom:12px;opacity:0.6;">📭</div>
          <h3 style="font-size:1.3rem;color:var(--text-primary);margin:0 0 8px;">暂无活动</h3>
          <p style="font-size:0.95rem;color:var(--text-secondary);margin:0;">敬请期待下一个限时活动！</p>
        </div>

        ${nextEvent ? `
          <!-- Next Event Preview -->
          <div style="
            width:100%;max-width:440px;padding:20px;
            background:linear-gradient(145deg, #1a1a2e, #16213e);
            border-radius:16px;border:1px solid ${nextEvent.color}44;
            animation: se-fade-in 0.8s ease-out;margin-bottom:24px;
          ">
            <div style="font-size:0.85rem;color:var(--text-dim);text-align:center;margin-bottom:14px;">
              下一个活动
            </div>
            <div style="display:flex;align-items:center;gap:16px;margin-bottom:16px;">
              <div style="
                font-size:2.5rem;
                animation: se-lantern-sway 3s ease-in-out infinite;
                filter: drop-shadow(0 0 8px ${nextEvent.color}66);
              ">${nextEvent.icon}</div>
              <div>
                <div style="font-size:1.3rem;font-weight:800;color:${nextEvent.color};">${nextEvent.name}</div>
                <div style="font-size:0.85rem;color:var(--text-secondary);">
                  ${nextEvent.start} ~ ${nextEvent.end}
                </div>
              </div>
            </div>
            <div style="
              display:flex;justify-content:center;gap:14px;padding:12px;
              background:rgba(0,0,0,0.2);border-radius:10px;
            ">
              ${(() => {
                const countdown = getTimeUntilStart(now, nextEvent.start);
                return `
                  <div style="text-align:center;">
                    <div style="font-size:1.3rem;font-weight:900;color:${nextEvent.color};">${countdown.days}</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">天</div>
                  </div>
                  <div style="color:var(--text-dim);font-size:1.3rem;line-height:1.5;">:</div>
                  <div style="text-align:center;">
                    <div style="font-size:1.3rem;font-weight:900;color:${nextEvent.color};">${countdown.hours}</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">时</div>
                  </div>
                  <div style="color:var(--text-dim);font-size:1.3rem;line-height:1.5;">:</div>
                  <div style="text-align:center;">
                    <div style="font-size:1.3rem;font-weight:900;color:${nextEvent.color};">${countdown.minutes}</div>
                    <div style="font-size:0.7rem;color:var(--text-dim);">分</div>
                  </div>`;
              })()}
            </div>
            <div style="
              display:flex;justify-content:center;gap:16px;margin-top:14px;padding:10px;
              background:rgba(212,160,23,0.08);border-radius:8px;
            ">
              <div style="text-align:center;">
                <span style="font-size:1.1rem;">🪙</span>
                <span style="font-size:0.9rem;color:var(--accent-gold);font-weight:600;margin-left:4px;">${nextEvent.reward.gold}</span>
              </div>
              <div style="text-align:center;">
                <span style="font-size:1.1rem;">🏅</span>
                <span style="font-size:0.9rem;color:var(--accent-jade);font-weight:600;margin-left:4px;">${nextEvent.reward.title}</span>
              </div>
            </div>
          </div>
        ` : ''}

        <!-- All Events List -->
        ${renderAllEventsList(now)}
      </div>`;
  }

  // Event listeners
  setTimeout(() => {
    const backBtn = div.querySelector('#se-back');
    if (backBtn) backBtn.addEventListener('click', () => { playSound('click'); showScreen('worldmap'); });
  }, 0);

  return div;
}

function renderAllEventsList(now) {
  return `
    <div style="
      width:100%;max-width:440px;
      animation: se-fade-in 1s ease-out;
    ">
      <div style="font-size:0.9rem;color:var(--text-dim);margin-bottom:10px;text-align:center;">
        全部活动日历
      </div>
      <div style="display:flex;flex-direction:column;gap:8px;">
        ${SEASONAL_EVENTS.map(evt => {
          const start = parseDate(evt.start);
          const end = parseDate(evt.end);
          end.setHours(23, 59, 59, 999);
          const isActive = now >= start && now <= end;
          const isPast = now > end;
          const statusLabel = isActive ? '进行中' : (isPast ? '已结束' : '未开始');
          const statusColor = isActive ? '#2ecc8a' : (isPast ? 'var(--text-dim)' : evt.color);
          return `
            <div style="
              display:flex;align-items:center;gap:12px;padding:12px 14px;
              background:${isActive ? evt.color + '12' : 'var(--bg-secondary)'};
              border-radius:10px;border:1px solid ${isActive ? evt.color + '44' : 'var(--border-color)'};
              opacity:${isPast ? '0.5' : '1'};
            ">
              <div style="font-size:1.6rem;${isActive ? 'animation:se-lantern-sway 2s ease-in-out infinite;' : ''}">${evt.icon}</div>
              <div style="flex:1;">
                <div style="font-size:0.95rem;font-weight:700;color:${isActive ? evt.color : 'var(--text-primary)'};">${evt.name}</div>
                <div style="font-size:0.75rem;color:var(--text-dim);">${evt.start} ~ ${evt.end}</div>
              </div>
              <div style="
                padding:3px 10px;font-size:0.75rem;font-weight:600;
                background:${statusColor}22;color:${statusColor};
                border-radius:12px;border:1px solid ${statusColor}44;
              ">${statusLabel}</div>
            </div>`;
        }).join('')}
      </div>
    </div>`;
}

registerScreen('seasonal-event', renderSeasonalEvent);
