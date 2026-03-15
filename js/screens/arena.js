// js/screens/arena.js — 2-player hot-seat competitive mode
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadContent, pickQuestions } from '../content-loader.js';

async function renderArena() {
  const div = document.createElement('div');
  div.className = 'screen';

  const { player1Index, player2Index } = gameState.arenaState;
  const p1 = gameState.profiles[player1Index];
  const p2 = gameState.profiles[player2Index];

  const [content1, content2] = await Promise.all([
    loadContent(p1.tier),
    loadContent(p2.tier),
  ]);

  // 10 total rounds: 5 per player, alternating. Each player gets 5 questions at their tier.
  const p1Questions = pickQuestions(content1.vocab, 5, p1.seenQuestions.vocab);
  const p2Questions = pickQuestions(content2.vocab, 5, p2.seenQuestions.vocab);

  let round = 0;
  let p1QIndex = 0;
  let p2QIndex = 0;
  let currentPlayer = 1; // alternates 1, 2
  let p1Score = 0;
  let p2Score = 0;
  const totalRounds = 10;
  const baseTimer = 15;

  function renderInterstitial() {
    const name = currentPlayer === 1 ? p1.name : p2.name;
    const tier = currentPlayer === 1 ? p1.tier : p2.tier;
    const tierLabel = tier === 'grade7' ? '七年级' : '三年级';
    div.innerHTML = `
      <div style="text-align:center;">
        <h2 style="font-size:2rem; margin-bottom:8px;">第 ${round + 1} 回合</h2>
        <p style="font-size:1.5rem; color:var(--accent-gold); margin-bottom:8px;">${name} 的回合</p>
        <p style="color:var(--text-secondary); margin-bottom:24px;">${tierLabel}</p>
        <div style="display:flex; justify-content:center; gap:40px; margin-bottom:24px;">
          <div><span style="font-weight:700;">${p1.name}</span>: <span style="color:var(--accent-gold);">${p1Score}</span></div>
          <div><span style="font-weight:700;">${p2.name}</span>: <span style="color:var(--accent-blue);">${p2Score}</span></div>
        </div>
        <button class="btn btn-primary" id="btn-ready">准备好了！</button>
      </div>
    `;
    setTimeout(() => {
      div.querySelector('#btn-ready').addEventListener('click', renderQuestion);
    }, 0);
  }

  function renderQuestion() {
    const questions = currentPlayer === 1 ? p1Questions : p2Questions;
    const qIdx = currentPlayer === 1 ? p1QIndex : p2QIndex;
    const q = questions[qIdx];
    if (!q) { endArena(); return; }

    const tierMultiplier = (currentPlayer === 1 ? p1.tier : p2.tier) === 'grade7' ? 1.5 : 1.0;
    let timerInterval;
    let timeLeft = baseTimer;
    let answered = false;

    const optionsHTML = q.options.map((opt, i) => `
      <button class="arena-option" data-idx="${i}" style="font-family:var(--font-main);font-size:1rem;padding:12px 20px;background:var(--bg-card);border:2px solid var(--bg-secondary);color:var(--text-primary);border-radius:8px;cursor:pointer;text-align:center;transition:all 0.2s;">${opt}</button>
    `).join('');

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;width:100%;padding:8px 32px;">
        <div><span style="font-weight:700;">${p1.name}</span>: <span style="color:var(--accent-gold);">${p1Score}</span></div>
        <div style="color:var(--accent-gold);">回合 ${round + 1}/${totalRounds}</div>
        <div><span style="font-weight:700;">${p2.name}</span>: <span style="color:var(--accent-blue);">${p2Score}</span></div>
      </div>
      <div style="text-align:center;margin:8px 0;font-size:1.1rem;color:var(--accent-gold);">${currentPlayer === 1 ? p1.name : p2.name} 答题中</div>
      <div style="width:80%;max-width:500px;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;margin:8px auto;">
        <div id="timer-bar" style="height:100%;background:var(--timer-yellow);border-radius:4px;width:100%;transition:width 0.1s linear;"></div>
      </div>
      <div style="font-size:1.3rem;margin:20px 32px;text-align:center;">${q.prompt}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;width:100%;padding:0 32px;">${optionsHTML}</div>
      <div id="feedback" style="font-size:0.95rem;color:var(--text-secondary);margin-top:12px;text-align:center;min-height:2em;"></div>
    `;

    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      const bar = div.querySelector('#timer-bar');
      if (bar) bar.style.width = Math.max(0, (timeLeft / baseTimer) * 100) + '%';
      if (timeLeft <= 0 && !answered) {
        clearInterval(timerInterval);
        answered = true;
        handleArenaAnswer(-1, q, tierMultiplier);
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

  function handleArenaAnswer(idx, q, tierMultiplier, timeLeft = 0) {
    const correct = idx === q.correct;
    div.querySelectorAll('.arena-option').forEach(b => {
      b.style.pointerEvents = 'none';
      const bIdx = parseInt(b.dataset.idx);
      if (bIdx === q.correct) { b.style.borderColor = 'var(--accent-jade)'; b.style.background = 'rgba(39,174,96,0.2)'; }
      else if (bIdx === idx) { b.style.borderColor = 'var(--accent-red)'; b.style.background = 'rgba(192,57,43,0.2)'; }
    });

    if (correct) {
      const speedBonus = Math.round(timeLeft);
      const points = Math.round((10 + speedBonus) * tierMultiplier);
      if (currentPlayer === 1) p1Score += points;
      else p2Score += points;
      div.querySelector('#feedback').textContent = `✓ 正确！+${points} 分`;
    } else {
      div.querySelector('#feedback').textContent = `✗ 错误。正确答案：${q.options[q.correct]}`;
    }

    setTimeout(() => {
      if (currentPlayer === 1) p1QIndex++;
      else p2QIndex++;
      round++;
      if (round >= totalRounds) { endArena(); return; }
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      renderInterstitial();
    }, 1800);
  }

  function endArena() {
    const winner = p1Score > p2Score ? p1.name : p2Score > p1Score ? p2.name : null;
    div.innerHTML = `
      <div style="text-align:center;">
        <h2 style="font-size:2rem;margin-bottom:16px;">${winner ? winner + ' 获胜！' : '平局！'}</h2>
        <div style="display:flex;justify-content:center;gap:60px;margin-bottom:24px;">
          <div>
            <div style="font-size:1.3rem;font-weight:700;${p1Score >= p2Score ? 'color:var(--accent-gold)' : ''}">${p1.name}</div>
            <div style="font-size:2rem;font-weight:700;color:var(--accent-gold);">${p1Score}</div>
          </div>
          <div style="font-size:2rem;color:var(--text-secondary);align-self:center;">VS</div>
          <div>
            <div style="font-size:1.3rem;font-weight:700;${p2Score >= p1Score ? 'color:var(--accent-blue)' : ''}">${p2.name}</div>
            <div style="font-size:2rem;font-weight:700;color:var(--accent-blue);">${p2Score}</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn btn-primary" id="btn-again">再来一局</button>
          <button class="btn" id="btn-back">返回</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      div.querySelector('#btn-again').addEventListener('click', () => showScreen('arena'));
      div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    }, 0);
  }

  renderInterstitial();
  return div;
}

registerScreen('arena', renderArena);
