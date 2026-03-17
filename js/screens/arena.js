// js/screens/arena.js — 2-player hot-seat competitive mode
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadContent, pickQuestions } from '../content-loader.js';
import { playSound, playMusic, setMusicIntensity, playStinger } from '../audio.js';

// ── Inject arena keyframe styles once ───────────────────────────────────────
function injectArenaStyles() {
  if (document.getElementById('arena-styles')) return;
  const s = document.createElement('style');
  s.id = 'arena-styles';
  s.textContent = `
    @keyframes arena-slide-left {
      from { opacity:0; transform:translateX(-120px) scale(0.7); }
      to   { opacity:1; transform:translateX(0) scale(1); }
    }
    @keyframes arena-slide-right {
      from { opacity:0; transform:translateX(120px) scale(0.7); }
      to   { opacity:1; transform:translateX(0) scale(1); }
    }
    @keyframes arena-vs-slam {
      0%   { transform:scale(4) rotate(-15deg); opacity:0; }
      50%  { transform:scale(0.85) rotate(3deg); opacity:1; }
      70%  { transform:scale(1.15) rotate(-1deg); }
      100% { transform:scale(1) rotate(0deg); opacity:1; }
    }
    @keyframes arena-vs-fire {
      0%,100% { text-shadow: 0 0 20px #ff4500, 0 0 40px #ff6a00, 0 0 60px #ff4500, 0 -6px 15px rgba(255,100,0,0.5); }
      50%      { text-shadow: 0 0 30px #ff6a00, 0 0 55px #ff4500, 0 0 80px #ff6a00, 0 -10px 20px rgba(255,120,0,0.7); }
    }
    @keyframes arena-countdown {
      0%   { transform:scale(3); opacity:0; }
      30%  { transform:scale(0.9); opacity:1; }
      60%  { transform:scale(1.1); opacity:1; }
      100% { transform:scale(0.5); opacity:0; }
    }
    @keyframes arena-glow-p1 {
      0%,100% { box-shadow: 0 0 8px 2px rgba(212,160,23,0.4); }
      50%      { box-shadow: 0 0 18px 6px rgba(212,160,23,0.8); }
    }
    @keyframes arena-glow-p2 {
      0%,100% { box-shadow: 0 0 8px 2px rgba(52,152,219,0.4); }
      50%      { box-shadow: 0 0 18px 6px rgba(52,152,219,0.8); }
    }
    @keyframes arena-crown-bounce {
      0%   { transform:translateY(-8px) scale(0); }
      50%  { transform:translateY(2px) scale(1.2); }
      100% { transform:translateY(0) scale(1); }
    }
    @keyframes arena-winner-glow {
      0%,100% { text-shadow: 0 0 10px rgba(212,160,23,0.5); }
      50%      { text-shadow: 0 0 30px rgba(212,160,23,0.9), 0 0 50px rgba(255,200,0,0.4); }
    }
    @keyframes arena-btn-pulse {
      0%,100% { box-shadow:0 0 0 0 rgba(212,160,23,0.7); }
      50%      { box-shadow:0 0 0 14px rgba(212,160,23,0); }
    }
    @keyframes arena-speed-pop {
      0%   { transform:scale(0) translateY(0); opacity:1; }
      40%  { transform:scale(1.2) translateY(-8px); opacity:1; }
      100% { transform:scale(0.8) translateY(-30px); opacity:0; }
    }
    @keyframes arena-sudden-flash {
      0%   { opacity:0; transform:scale(0.3); letter-spacing:0.5em; }
      50%  { opacity:1; transform:scale(1.1); letter-spacing:0.15em; }
      100% { opacity:1; transform:scale(1); letter-spacing:0.1em; }
    }
    @keyframes arena-option-slide {
      from { opacity:0; transform:translateY(20px); }
      to   { opacity:1; transform:translateY(0); }
    }
    @keyframes arena-stat-reveal {
      from { opacity:0; transform:translateX(-20px); }
      to   { opacity:1; transform:translateX(0); }
    }
  `;
  document.head.appendChild(s);
}

// ── Gold particle burst for winner ──────────────────────────────────────────
function spawnArenaParticles(container, count = 50, color1 = '#d4a017', color2 = '#f5c842') {
  const cx = container.offsetWidth / 2;
  const cy = container.offsetHeight * 0.25;
  for (let i = 0; i < count; i++) {
    const dot = document.createElement('div');
    const angle = (i / count) * Math.PI * 2 + Math.random() * 0.5;
    const dist = 50 + Math.random() * 150;
    const tx = Math.cos(angle) * dist;
    const ty = Math.sin(angle) * dist - 20;
    const size = 3 + Math.random() * 7;
    const delay = Math.random() * 300;
    dot.style.cssText = `
      position:absolute; left:${cx}px; top:${cy}px;
      width:${size}px; height:${size}px; border-radius:50%;
      background:${Math.random() > 0.5 ? color1 : color2};
      pointer-events:none; z-index:30;
      transform:translate(-50%,-50%) scale(0);
      transition: transform ${0.5 + Math.random() * 0.4}s ease-out ${delay}ms,
                  opacity ${0.4 + Math.random() * 0.3}s ease-out ${delay + 350}ms;
      opacity:1;
    `;
    container.appendChild(dot);
    requestAnimationFrame(() => {
      requestAnimationFrame(() => {
        dot.style.transform = `translate(calc(-50% + ${tx}px), calc(-50% + ${ty}px)) scale(1)`;
        dot.style.opacity = '0';
      });
    });
    setTimeout(() => dot.remove(), 1400 + delay);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN RENDER
// ═══════════════════════════════════════════════════════════════════════════════

async function renderArena() {
  injectArenaStyles();
  const div = document.createElement('div');
  div.className = 'screen';
  div.style.cssText = 'overflow:hidden;position:relative;';

  const { player1Index, player2Index } = gameState.arenaState;
  const p1 = gameState.profiles[player1Index];
  const p2 = gameState.profiles[player2Index];

  const [content1, content2] = await Promise.all([
    loadContent(p1.tier),
    loadContent(p2.tier),
  ]);

  // 10 total rounds: 5 per player, alternating
  const p1Questions = pickQuestions(content1.vocab, 5, p1.seenQuestions.vocab);
  const p2Questions = pickQuestions(content2.vocab, 5, p2.seenQuestions.vocab);

  let round = 0;
  let p1QIndex = 0;
  let p2QIndex = 0;
  let currentPlayer = 1;
  let p1Score = 0;
  let p2Score = 0;
  const totalRounds = 10;
  const baseTimer = 20;

  // Round-by-round log for results breakdown
  const roundLog = [];

  // ── VS Screen ─────────────────────────────────────────────────────────────

  function renderVSScreen() {
    playMusic('tang');
    try { playStinger('battle_start'); } catch (_) {}

    const tierLabel = (tier) => { const map = { grade1: '一二年级', grade3: '三年级', grade4: '四年级', grade5: '五六年级', grade7: '七年级', grade8: '八九年级' }; return map[tier] || tier; };

    div.innerHTML = `
      <div style="position:relative;width:100%;height:100%;display:flex;flex-direction:column;align-items:center;justify-content:center;overflow:hidden;">
        <!-- Dark dramatic background -->
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(40,10,0,0.6) 0%, rgba(0,0,0,0.95) 70%);z-index:1;"></div>

        <!-- Player panels + VS -->
        <div style="position:relative;z-index:10;display:flex;align-items:center;gap:24px;width:100%;max-width:700px;padding:0 24px;margin-bottom:32px;">

          <!-- Player 1 -->
          <div id="vs-p1" style="flex:1;text-align:center;opacity:0;animation:arena-slide-left 0.6s ease-out 0.3s forwards;">
            <div style="font-size:2rem;margin-bottom:8px;">⚔️</div>
            <div style="font-size:1.6rem;font-weight:900;color:#d4a017;text-shadow:0 0 12px rgba(212,160,23,0.5);margin-bottom:4px;">${p1.name}</div>
            <div style="font-size:0.85rem;color:rgba(255,255,255,0.5);letter-spacing:0.1em;margin-bottom:12px;">${tierLabel(p1.tier)}</div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
              <span style="font-size:0.8rem;color:rgba(212,160,23,0.7);">Lv.${p1.level}</span>
              <span style="font-size:0.78rem;color:rgba(255,255,255,0.4);">攻击 ${p1.attack} · 防御 ${p1.defense}</span>
            </div>
          </div>

          <!-- VS -->
          <div id="vs-text" style="opacity:0;">
            <div style="font-size:3.5rem;font-weight:900;color:#ff4500;animation:arena-vs-fire 1.5s ease-in-out infinite;letter-spacing:0.08em;">VS</div>
          </div>

          <!-- Player 2 -->
          <div id="vs-p2" style="flex:1;text-align:center;opacity:0;animation:arena-slide-right 0.6s ease-out 0.3s forwards;">
            <div style="font-size:2rem;margin-bottom:8px;">🛡️</div>
            <div style="font-size:1.6rem;font-weight:900;color:#3498db;text-shadow:0 0 12px rgba(52,152,219,0.5);margin-bottom:4px;">${p2.name}</div>
            <div style="font-size:0.85rem;color:rgba(255,255,255,0.5);letter-spacing:0.1em;margin-bottom:12px;">${tierLabel(p2.tier)}</div>
            <div style="display:flex;flex-direction:column;gap:4px;align-items:center;">
              <span style="font-size:0.8rem;color:rgba(52,152,219,0.7);">Lv.${p2.level}</span>
              <span style="font-size:0.78rem;color:rgba(255,255,255,0.4);">攻击 ${p2.attack} · 防御 ${p2.defense}</span>
            </div>
          </div>

        </div>

        <!-- Countdown area -->
        <div id="vs-countdown" style="position:relative;z-index:10;font-size:5rem;font-weight:900;color:#d4a017;min-height:100px;display:flex;align-items:center;justify-content:center;"></div>
      </div>
    `;

    // VS text slams in at 800ms
    setTimeout(() => {
      const vsEl = div.querySelector('#vs-text');
      if (vsEl) {
        vsEl.style.opacity = '1';
        vsEl.style.animation = 'arena-vs-slam 0.7s cubic-bezier(0.34,1.56,0.64,1) forwards';
      }
    }, 800);

    // Countdown 3-2-1
    const countdownEl = div.querySelector('#vs-countdown');
    const countTexts = ['3', '2', '1', '开战！'];
    const countColors = ['#d4a017', '#e67e22', '#e74c3c', '#2ecc71'];
    let ci = 0;

    function showCountNumber() {
      if (ci >= countTexts.length) {
        // Start the match
        setTimeout(() => {
          setMusicIntensity(2);
          renderInterstitial();
        }, 400);
        return;
      }
      countdownEl.innerHTML = `<span style="animation:arena-countdown 0.85s ease-out forwards;display:inline-block;color:${countColors[ci]};">${countTexts[ci]}</span>`;
      try { playSound('correct'); } catch (_) {}
      ci++;
      setTimeout(showCountNumber, 900);
    }
    setTimeout(showCountNumber, 1800);
  }

  // ── Scoreboard header ─────────────────────────────────────────────────────

  function buildScoreboard(activePlayer) {
    const p1Active = activePlayer === 1;
    const p2Active = activePlayer === 2;
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:10px 24px;gap:8px;">
        <div style="flex:1;text-align:center;padding:10px 12px;border-radius:10px;border:2px solid ${p1Active ? '#d4a017' : 'transparent'};background:${p1Active ? 'rgba(212,160,23,0.08)' : 'transparent'};${p1Active ? 'animation:arena-glow-p1 1.8s ease-in-out infinite;' : ''}transition:all 0.3s;">
          <div style="font-size:0.85rem;font-weight:700;color:${p1Active ? '#d4a017' : 'rgba(255,255,255,0.5)'};">${p1.name}</div>
          <div style="font-size:1.8rem;font-weight:900;color:#d4a017;">${p1Score}</div>
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;gap:2px;">
          <div style="font-size:0.75rem;color:rgba(255,255,255,0.4);letter-spacing:0.08em;">回合</div>
          <div style="font-size:1.3rem;font-weight:700;color:var(--accent-gold);">${round + 1}/${totalRounds}</div>
        </div>
        <div style="flex:1;text-align:center;padding:10px 12px;border-radius:10px;border:2px solid ${p2Active ? '#3498db' : 'transparent'};background:${p2Active ? 'rgba(52,152,219,0.08)' : 'transparent'};${p2Active ? 'animation:arena-glow-p2 1.8s ease-in-out infinite;' : ''}transition:all 0.3s;">
          <div style="font-size:0.85rem;font-weight:700;color:${p2Active ? '#3498db' : 'rgba(255,255,255,0.5)'};">${p2.name}</div>
          <div style="font-size:1.8rem;font-weight:900;color:#3498db;">${p2Score}</div>
        </div>
      </div>
    `;
  }

  // ── Round interstitial ────────────────────────────────────────────────────

  function renderInterstitial() {
    const name = currentPlayer === 1 ? p1.name : p2.name;
    const tier = currentPlayer === 1 ? p1.tier : p2.tier;
    const tierLabel = (() => { const map = { grade1: '一二年级', grade3: '三年级', grade4: '四年级', grade5: '五六年级', grade7: '七年级', grade8: '八九年级' }; return map[tier] || tier; })();
    const pColor = currentPlayer === 1 ? '#d4a017' : '#3498db';

    div.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
        ${buildScoreboard(currentPlayer)}
        <div style="text-align:center;margin-top:40px;">
          <div style="font-size:0.8rem;color:rgba(255,255,255,0.4);letter-spacing:0.15em;margin-bottom:8px;">第 ${round + 1} 回合</div>
          <div style="font-size:2rem;font-weight:900;color:${pColor};text-shadow:0 0 15px ${pColor}40;margin-bottom:6px;">${name} 的回合</div>
          <div style="color:rgba(255,255,255,0.4);font-size:0.9rem;margin-bottom:32px;">${tierLabel}</div>
          <button class="btn btn-primary" id="btn-ready" style="font-size:1.1rem;padding:14px 36px;">准备好了！</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      div.querySelector('#btn-ready').addEventListener('click', renderQuestion);
    }, 0);
  }

  // ── Question screen ───────────────────────────────────────────────────────

  function renderQuestion() {
    const questions = currentPlayer === 1 ? p1Questions : p2Questions;
    const qIdx = currentPlayer === 1 ? p1QIndex : p2QIndex;
    const q = questions[qIdx];
    if (!q) { endArena(); return; }

    const _arTier = currentPlayer === 1 ? p1.tier : p2.tier;
    const tierMultiplier = ['grade7', 'grade8'].includes(_arTier) ? 1.5 : ['grade5'].includes(_arTier) ? 1.25 : 1.0;
    let timerInterval;
    let timeLeft = baseTimer;
    let answered = false;
    const pColor = currentPlayer === 1 ? '#d4a017' : '#3498db';
    const pName = currentPlayer === 1 ? p1.name : p2.name;

    const optionsHTML = q.options.map((opt, i) => `
      <button class="arena-option" data-idx="${i}" style="
        font-family:var(--font-main);font-size:1rem;padding:12px 20px;
        background:var(--bg-card);border:2px solid var(--bg-secondary);
        color:var(--text-primary);border-radius:8px;cursor:pointer;
        text-align:center;transition:all 0.2s;
        opacity:0;animation:arena-option-slide 0.3s ease-out ${i * 0.08}s forwards;
      ">${opt}</button>
    `).join('');

    div.innerHTML = `
      ${buildScoreboard(currentPlayer)}
      <div style="text-align:center;margin:4px 0;font-size:0.95rem;color:${pColor};font-weight:600;">${pName} 答题中</div>
      <!-- Timer bar -->
      <div style="width:85%;max-width:520px;height:10px;background:var(--bg-secondary);border-radius:5px;overflow:hidden;margin:8px auto;position:relative;">
        <div id="timer-bar" style="height:100%;background:linear-gradient(90deg, #2ecc71, #27ae60);border-radius:5px;width:100%;transition:width 0.1s linear;"></div>
      </div>
      <div id="timer-text" style="text-align:center;font-size:0.85rem;color:rgba(255,255,255,0.5);margin-bottom:8px;">${baseTimer}s</div>
      <!-- Question -->
      <div style="font-size:1.3rem;margin:12px 32px;text-align:center;line-height:1.6;">${q.prompt}</div>
      <!-- Options -->
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;width:100%;padding:0 32px;">${optionsHTML}</div>
      <!-- Feedback + speed bonus area -->
      <div id="feedback" style="font-size:0.95rem;color:var(--text-secondary);margin-top:14px;text-align:center;min-height:2.5em;position:relative;"></div>
    `;

    // Timer logic with color transitions
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      const bar = div.querySelector('#timer-bar');
      const timerText = div.querySelector('#timer-text');
      if (bar) {
        const pct = Math.max(0, (timeLeft / baseTimer) * 100);
        bar.style.width = pct + '%';
        // Color transitions: green -> yellow -> red
        if (timeLeft > baseTimer * 0.5) {
          bar.style.background = 'linear-gradient(90deg, #2ecc71, #27ae60)';
        } else if (timeLeft > baseTimer * 0.25) {
          bar.style.background = 'linear-gradient(90deg, #f1c40f, #e67e22)';
        } else {
          bar.style.background = 'linear-gradient(90deg, #e74c3c, #c0392b)';
          // Pulse effect at critical time
          if (timeLeft <= 5 && Math.floor(timeLeft * 10) % 5 === 0) {
            bar.style.opacity = '0.7';
            setTimeout(() => { if (bar) bar.style.opacity = '1'; }, 50);
          }
        }
      }
      if (timerText) {
        timerText.textContent = Math.max(0, timeLeft).toFixed(1) + 's';
        if (timeLeft <= 5) timerText.style.color = '#e74c3c';
        else if (timeLeft <= 10) timerText.style.color = '#e67e22';
      }
      if (timeLeft <= 0 && !answered) {
        clearInterval(timerInterval);
        answered = true;
        handleArenaAnswer(-1, q, tierMultiplier, 0);
      }
    }, 100);

    div.querySelectorAll('.arena-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        clearInterval(timerInterval);
        const idx = parseInt(btn.dataset.idx);
        handleArenaAnswer(idx, q, tierMultiplier, timeLeft);
      });
    });
  }

  // ── Answer handler ────────────────────────────────────────────────────────

  function handleArenaAnswer(idx, q, tierMultiplier, timeLeft = 0) {
    const correct = idx === q.correct;
    div.querySelectorAll('.arena-option').forEach(b => {
      b.style.pointerEvents = 'none';
      const bIdx = parseInt(b.dataset.idx);
      if (bIdx === q.correct) { b.style.borderColor = 'var(--accent-jade)'; b.style.background = 'rgba(39,174,96,0.25)'; }
      else if (bIdx === idx) { b.style.borderColor = 'var(--accent-red)'; b.style.background = 'rgba(192,57,43,0.25)'; }
    });

    const feedback = div.querySelector('#feedback');
    let points = 0;
    let speedBonus = 0;

    if (correct) {
      speedBonus = Math.round(timeLeft);
      points = Math.round((10 + speedBonus) * tierMultiplier);
      if (currentPlayer === 1) p1Score += points;
      else p2Score += points;

      try { playSound('correct'); } catch (_) {}

      // Feedback with speed bonus visualization
      let feedbackHTML = `<span style="color:var(--accent-jade);font-weight:700;">✓ 正确！+${points} 分</span>`;
      if (speedBonus > 5) {
        feedbackHTML += `<div id="speed-bonus" style="display:inline-block;margin-left:8px;color:#f39c12;font-weight:700;font-size:0.9rem;animation:arena-speed-pop 0.8s ease-out forwards;">⚡ 速度奖励 +${speedBonus}</div>`;
      }
      feedback.innerHTML = feedbackHTML;
    } else {
      try { playSound('wrong'); } catch (_) {}
      feedback.innerHTML = `<span style="color:var(--accent-red);">✗ 错误。正确答案：${q.options[q.correct]}</span>`;
    }

    // Log the round
    roundLog.push({
      round: round + 1,
      player: currentPlayer,
      playerName: currentPlayer === 1 ? p1.name : p2.name,
      correct,
      points,
      timeUsed: correct ? +(baseTimer - timeLeft).toFixed(1) : null,
      question: q.prompt,
    });

    setTimeout(() => {
      if (currentPlayer === 1) p1QIndex++;
      else p2QIndex++;
      round++;
      if (round >= totalRounds) { checkForTiebreaker(); return; }
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      renderInterstitial();
    }, 1800);
  }

  // ── Tiebreaker check ──────────────────────────────────────────────────────

  function checkForTiebreaker() {
    if (p1Score === p2Score) {
      renderSuddenDeath();
    } else {
      endArena();
    }
  }

  // ── Sudden death ──────────────────────────────────────────────────────────

  function renderSuddenDeath() {
    try { playStinger('battle_start'); } catch (_) {}

    div.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;width:100%;height:100%;position:relative;">
        <div style="position:absolute;inset:0;background:radial-gradient(ellipse at center, rgba(120,0,0,0.4) 0%, rgba(0,0,0,0.95) 70%);"></div>
        <div id="sd-text" style="position:relative;z-index:10;text-align:center;">
          <div style="font-size:2.8rem;font-weight:900;color:#e74c3c;letter-spacing:0.1em;animation:arena-sudden-flash 1s ease-out forwards;text-shadow:0 0 30px rgba(231,76,60,0.7),0 0 60px rgba(231,76,60,0.3);">
            SUDDEN DEATH
          </div>
          <div style="font-size:1rem;color:rgba(255,255,255,0.5);margin-top:12px;opacity:0;transition:opacity 0.5s 0.8s;">突然死亡模式</div>
          <div style="font-size:0.9rem;color:rgba(231,76,60,0.8);margin-top:8px;opacity:0;transition:opacity 0.5s 1s;">同一道题 · 先答对者获胜</div>
        </div>
      </div>
    `;

    // Fade in subtext
    setTimeout(() => {
      const subs = div.querySelectorAll('#sd-text div');
      subs.forEach(s => s.style.opacity = '1');
    }, 100);

    setTimeout(() => {
      renderSuddenDeathQuestion();
    }, 2500);
  }

  function renderSuddenDeathQuestion() {
    // Pick a shared question from p1's pool (unused)
    const pool = [...p1Questions, ...p2Questions];
    const usedIds = roundLog.map(r => r.question);
    const available = pool.filter(q => !usedIds.includes(q.prompt));
    const q = available[0] || p1Questions[0];

    let answered = false;
    let timerInterval;
    let timeLeft = 15; // shorter timer for sudden death

    const optionsHTML = q.options.map((opt, i) => `
      <button class="arena-option" data-idx="${i}" style="
        font-family:var(--font-main);font-size:1rem;padding:14px 20px;
        background:var(--bg-card);border:2px solid rgba(231,76,60,0.3);
        color:var(--text-primary);border-radius:8px;cursor:pointer;
        text-align:center;transition:all 0.2s;
        opacity:0;animation:arena-option-slide 0.3s ease-out ${i * 0.08}s forwards;
      ">${opt}</button>
    `).join('');

    div.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;">
        <div style="width:100%;padding:10px 24px;text-align:center;">
          <div style="font-size:0.8rem;letter-spacing:0.15em;color:#e74c3c;font-weight:700;margin-bottom:4px;">SUDDEN DEATH</div>
          <div style="display:flex;justify-content:center;gap:32px;">
            <div><span style="font-weight:700;color:#d4a017;">${p1.name}</span>: ${p1Score}</div>
            <div style="color:#e74c3c;font-weight:700;">VS</div>
            <div><span style="font-weight:700;color:#3498db;">${p2.name}</span>: ${p2Score}</div>
          </div>
        </div>
        <!-- Timer -->
        <div style="width:85%;max-width:520px;height:10px;background:var(--bg-secondary);border-radius:5px;overflow:hidden;margin:8px auto;">
          <div id="timer-bar" style="height:100%;background:linear-gradient(90deg, #e74c3c, #c0392b);border-radius:5px;width:100%;transition:width 0.1s linear;"></div>
        </div>
        <div id="timer-text" style="text-align:center;font-size:0.85rem;color:#e74c3c;margin-bottom:8px;">${timeLeft}s</div>
        <div style="font-size:0.9rem;color:rgba(255,255,255,0.5);margin-bottom:4px;">先答对者获胜！传递设备给对手抢答</div>
        <!-- Question -->
        <div style="font-size:1.3rem;margin:12px 32px;text-align:center;line-height:1.6;">${q.prompt}</div>
        <!-- Options -->
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;width:100%;padding:0 32px;">${optionsHTML}</div>
        <div id="feedback" style="font-size:0.95rem;color:var(--text-secondary);margin-top:14px;text-align:center;min-height:2em;"></div>
      </div>
    `;

    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      const bar = div.querySelector('#timer-bar');
      const timerText = div.querySelector('#timer-text');
      if (bar) bar.style.width = Math.max(0, (timeLeft / 15) * 100) + '%';
      if (timerText) timerText.textContent = Math.max(0, timeLeft).toFixed(1) + 's';
      if (timeLeft <= 0 && !answered) {
        clearInterval(timerInterval);
        answered = true;
        // Both missed -- remains a tie, goes to results
        div.querySelector('#feedback').innerHTML = `<span style="color:#e74c3c;">时间耗尽！双方平局。</span>`;
        setTimeout(endArena, 1500);
      }
    }, 100);

    div.querySelectorAll('.arena-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        clearInterval(timerInterval);
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;

        div.querySelectorAll('.arena-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) { b.style.borderColor = 'var(--accent-jade)'; b.style.background = 'rgba(39,174,96,0.25)'; }
          else if (bIdx === idx) { b.style.borderColor = 'var(--accent-red)'; b.style.background = 'rgba(192,57,43,0.25)'; }
        });

        if (correct) {
          // The first to answer correctly in sudden death gets 50 bonus points
          // We attribute it to "the answerer." We'll prompt them to say who answered.
          // For simplicity, alternate: the first person to grab the device is the answerer.
          // Prompt: "Who answered?"
          div.querySelector('#feedback').innerHTML = `
            <span style="color:var(--accent-jade);font-weight:700;">✓ 正确！</span>
            <div style="margin-top:12px;display:flex;gap:12px;justify-content:center;">
              <button class="btn" id="sd-p1" style="border-color:#d4a017;color:#d4a017;">${p1.name} 答对了</button>
              <button class="btn" id="sd-p2" style="border-color:#3498db;color:#3498db;">${p2.name} 答对了</button>
            </div>
          `;
          setTimeout(() => {
            div.querySelector('#sd-p1')?.addEventListener('click', () => { p1Score += 50; endArena(); });
            div.querySelector('#sd-p2')?.addEventListener('click', () => { p2Score += 50; endArena(); });
          }, 0);
        } else {
          div.querySelector('#feedback').innerHTML = `<span style="color:var(--accent-red);">✗ 错误！正确答案：${q.options[q.correct]}</span>`;
          // Wrong answer in sudden death -- opponent wins by default
          setTimeout(endArena, 1500);
        }
      });
    });
  }

  // ── Results screen ────────────────────────────────────────────────────────

  function endArena() {
    const winner = p1Score > p2Score ? 1 : p2Score > p1Score ? 2 : 0;
    const winnerName = winner === 1 ? p1.name : winner === 2 ? p2.name : null;
    const isTie = winner === 0;

    try { playStinger('victory'); } catch (_) {}

    // Find "best moment" — fastest correct answer
    const correctRounds = roundLog.filter(r => r.correct && r.timeUsed !== null);
    const bestMoment = correctRounds.length > 0
      ? correctRounds.reduce((best, r) => r.timeUsed < best.timeUsed ? r : best)
      : null;

    // Build round-by-round breakdown
    let breakdownHTML = '';
    roundLog.forEach(r => {
      const isP1 = r.player === 1;
      const pColor = isP1 ? '#d4a017' : '#3498db';
      const resultIcon = r.correct ? '<span style="color:#2ecc71;">✓</span>' : '<span style="color:#e74c3c;">✗</span>';
      const timeStr = r.timeUsed !== null ? `${r.timeUsed}s` : '-';
      breakdownHTML += `
        <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:rgba(255,255,255,0.03);border-radius:6px;font-size:0.82rem;opacity:0;animation:arena-stat-reveal 0.3s ease-out ${r.round * 0.08}s forwards;">
          <span style="color:rgba(255,255,255,0.3);width:28px;text-align:right;">R${r.round}</span>
          <span style="color:${pColor};font-weight:600;width:60px;">${r.playerName}</span>
          ${resultIcon}
          <span style="color:rgba(255,255,255,0.4);flex:1;text-align:right;">${r.correct ? '+' + r.points : '0'}</span>
          <span style="color:rgba(255,255,255,0.25);width:40px;text-align:right;">${timeStr}</span>
        </div>
      `;
    });

    div.innerHTML = `
      <div style="display:flex;flex-direction:column;align-items:center;width:100%;padding:24px;overflow-y:auto;max-height:100%;gap:16px;">
        <!-- Winner announcement -->
        <div style="text-align:center;margin-bottom:8px;">
          ${!isTie ? `<div style="font-size:2rem;animation:arena-crown-bounce 0.6s ease-out forwards;margin-bottom:4px;">👑</div>` : ''}
          <div style="font-size:2.2rem;font-weight:900;color:${isTie ? 'rgba(255,255,255,0.7)' : '#d4a017'};${!isTie ? 'animation:arena-winner-glow 2s ease-in-out infinite;' : ''}">
            ${winnerName ? winnerName + ' 获胜！' : '平局！'}
          </div>
        </div>

        <!-- Final scores -->
        <div style="display:flex;gap:40px;align-items:flex-end;margin-bottom:8px;">
          <div style="text-align:center;">
            ${winner === 1 ? '<div style="font-size:1.2rem;margin-bottom:4px;">👑</div>' : ''}
            <div style="font-size:1.2rem;font-weight:700;color:${winner === 1 ? '#d4a017' : 'rgba(255,255,255,0.5)'};">${p1.name}</div>
            <div style="font-size:2.5rem;font-weight:900;color:#d4a017;">${p1Score}</div>
          </div>
          <div style="font-size:1.5rem;color:rgba(255,255,255,0.2);align-self:center;">VS</div>
          <div style="text-align:center;">
            ${winner === 2 ? '<div style="font-size:1.2rem;margin-bottom:4px;">👑</div>' : ''}
            <div style="font-size:1.2rem;font-weight:700;color:${winner === 2 ? '#3498db' : 'rgba(255,255,255,0.5)'};">${p2.name}</div>
            <div style="font-size:2.5rem;font-weight:900;color:#3498db;">${p2Score}</div>
          </div>
        </div>

        <!-- Best moment -->
        ${bestMoment ? `
        <div style="background:rgba(212,160,23,0.08);border:1px solid rgba(212,160,23,0.2);border-radius:10px;padding:12px 20px;text-align:center;width:100%;max-width:400px;">
          <div style="font-size:0.75rem;color:rgba(212,160,23,0.6);letter-spacing:0.15em;margin-bottom:4px;">最佳时刻 ⚡</div>
          <div style="font-size:0.95rem;color:#d4a017;font-weight:700;">${bestMoment.playerName}</div>
          <div style="font-size:0.82rem;color:rgba(255,255,255,0.5);margin-top:2px;">${bestMoment.timeUsed}s 内答对 · +${bestMoment.points} 分</div>
        </div>
        ` : ''}

        <!-- Round breakdown -->
        <div style="width:100%;max-width:420px;">
          <div style="font-size:0.78rem;color:rgba(255,255,255,0.3);letter-spacing:0.12em;margin-bottom:8px;text-align:center;">回合详情</div>
          <div style="display:flex;flex-direction:column;gap:4px;">${breakdownHTML}</div>
        </div>

        <!-- Buttons -->
        <div style="display:flex;gap:14px;margin-top:12px;">
          <button class="btn btn-primary" id="btn-again" style="animation:arena-btn-pulse 1.8s ease-in-out infinite;font-size:1.05rem;padding:12px 28px;">再来一局</button>
          <button class="btn" id="btn-back" style="font-size:1rem;padding:10px 20px;">返回</button>
        </div>
      </div>
    `;

    // Spawn gold particles for winner
    if (!isTie) {
      setTimeout(() => spawnArenaParticles(div, 60), 200);
      setTimeout(() => spawnArenaParticles(div, 30), 800);
    }

    setTimeout(() => {
      div.querySelector('#btn-again')?.addEventListener('click', () => showScreen('arena'));
      div.querySelector('#btn-back')?.addEventListener('click', () => showScreen('title'));
    }, 0);
  }

  // ── Start with VS screen ──────────────────────────────────────────────────
  renderVSScreen();
  return div;
}

registerScreen('arena', renderArena);
