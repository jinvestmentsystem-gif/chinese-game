// js/screens/puzzle.js — Reading comprehension encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';
import { playSound, playMusic, setMusicIntensity } from '../audio.js';

function renderPuzzle() {
  const div = document.createElement('div');

  // Set puzzle music — light rhythm (intensity 1)
  const chapterId = gameState.currentQuest?.chapterId || 1;
  const eraMap = {1:'xianqin',2:'han',3:'tang',4:'song',5:'modern'};
  playMusic(eraMap[chapterId] || 'xianqin');
  setTimeout(() => setMusicIntensity(1), 200);
  div.className = 'screen';
  const encounter = getCurrentEncounter();
  const passage = encounter.passage;
  const questions = passage.questions;
  let qIndex = 0;
  let correctCount = 0;

  function render() {
    const q = questions[qIndex];
    const optionsHTML = q.options.map((opt, i) => `
      <button class="puzzle-option" data-idx="${i}">${opt}</button>
    `).join('');

    div.innerHTML = `
      <style>
        .puzzle-layout { display:flex; width:100%; height:100vh; }
        .puzzle-passage {
          flex:1; padding:32px; overflow-y:auto; background:var(--bg-secondary);
          border-right:2px solid var(--bg-card);
        }
        .puzzle-passage h3 { color:var(--accent-gold); margin-bottom:12px; }
        .puzzle-passage p { line-height:1.8; font-size:1.05rem; }
        .puzzle-right { flex:1; padding:32px; display:flex; flex-direction:column; justify-content:center; }
        .puzzle-progress { font-size:0.9rem; color:var(--text-secondary); margin-bottom:12px; }
        .puzzle-question { font-size:1.2rem; margin-bottom:20px; }
        .puzzle-options { display:flex; flex-direction:column; gap:10px; }
        .puzzle-option {
          font-family:var(--font-main); font-size:1rem; padding:14px 20px; background:var(--bg-card);
          border:2px solid var(--bg-secondary); color:var(--text-primary); border-radius:8px;
          cursor:pointer; transition:all 0.2s; text-align:left;
        }
        .puzzle-option:hover { border-color:var(--accent-gold); }
        .puzzle-option.correct { border-color:var(--accent-jade); background:rgba(39,174,96,0.2); }
        .puzzle-option.wrong { border-color:var(--accent-red); background:rgba(192,57,43,0.2); }
        .puzzle-feedback { font-size:0.95rem; color:var(--text-secondary); margin-top:12px; min-height:2em; }
      </style>
      <div class="puzzle-layout">
        <div class="puzzle-passage">
          <h3>📖 ${passage.title}</h3>
          <p>${passage.passage}</p>
        </div>
        <div class="puzzle-right">
          <div class="puzzle-progress">问题 ${qIndex + 1} / ${questions.length}</div>
          <div class="puzzle-question">${q.prompt}</div>
          <div class="puzzle-options">${optionsHTML}</div>
          <div class="puzzle-feedback" id="feedback"></div>
        </div>
      </div>
    `;

    div.querySelectorAll('.puzzle-option').forEach(btn => {
      btn.addEventListener('click', () => {
        playSound('click');
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;
        div.querySelectorAll('.puzzle-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) b.classList.add('correct');
          else if (bIdx === idx) b.classList.add('wrong');
        });

        recordAnswer('reading', correct);
        if (correct) correctCount++;

        div.querySelector('#feedback').textContent = correct
          ? `✓ 正确！${q.explanation}`
          : `✗ 错误。${q.explanation}`;

        // Track seen
        const profile = gameState.profile;
        if (!profile.seenQuestions.reading.includes(passage.id)) {
          profile.seenQuestions.reading.push(passage.id);
        }

        setTimeout(() => {
          qIndex++;
          if (qIndex >= questions.length) {
            endPuzzle();
          } else {
            render();
          }
        }, 2000);
      });
    });
  }

  function endPuzzle() {
    encounter.completed = true;
    gameState.save();

    const next = advanceEncounter();
    if (!next) {
      showScreen('reward');
    } else {
      if (next.type === 'combat') showScreen('combat');
      else if (next.type === 'puzzle') showScreen('puzzle');
      else if (next.type === 'boss') showScreen('boss');
    }
  }

  render();
  return div;
}

registerScreen('puzzle', renderPuzzle);
