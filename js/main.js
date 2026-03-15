// js/main.js — App initialization, imports all screens, boots the game
import { gameState } from './state.js';
import { initRouter, registerScreen, showScreen } from './router.js';
import { initAudio, playMusic, toggleMusic, toggleSFX, isMusicEnabled, isSFXEnabled } from './audio.js';

// Re-export so existing screen imports from './main.js' still work
export { registerScreen, showScreen };

// Import all screens (they register themselves via registerScreen)
import './screens/profile.js';
import './screens/worldmap.js';
import './screens/quest.js';
import './screens/reward.js';
import './screens/combat.js';
import './screens/puzzle.js';
import './screens/boss.js';
import './screens/chengyu.js';
import './screens/inventory.js';
import './screens/daily.js';
import './screens/arena.js';
import './screens/story.js';

// Initialize audio on the very first user interaction (browser autoplay policy)
let audioReady = false;
function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  initAudio();
  if (isMusicEnabled()) playMusic('menu');
}
document.addEventListener('click', ensureAudio, { once: true });
document.addEventListener('keydown', ensureAudio, { once: true });

// Title screen with working buttons + audio toggle
registerScreen('title', () => {
  const div = document.createElement('div');
  div.className = 'screen';

  div.innerHTML = `
    <button id="btn-audio-music" title="音乐" style="
      position:absolute; top:16px; right:60px;
      background:transparent; border:1px solid var(--text-secondary);
      color:var(--text-secondary); font-size:1.1rem;
      width:36px; height:36px; border-radius:6px;
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      line-height:1;
    ">🎵</button>

    <button id="btn-audio-sfx" title="音效" style="
      position:absolute; top:16px; right:16px;
      background:transparent; border:1px solid var(--text-secondary);
      color:var(--text-secondary); font-size:1.1rem;
      width:36px; height:36px; border-radius:6px;
      cursor:pointer; display:flex; align-items:center; justify-content:center;
      line-height:1;
    ">🔊</button>

    <h1 style="font-size:3rem; margin-bottom:0.5rem;">文字侠</h1>
    <p style="font-size:1.2rem; color:var(--text-secondary); margin-bottom:2rem;">Word Hero</p>
    <div style="display:flex; flex-direction:column; gap:12px;">
      <button class="btn btn-primary" id="btn-solo">单人模式</button>
      <button class="btn" id="btn-arena">双人对战</button>
      <button class="btn" id="btn-daily">每日挑战</button>
    </div>
  `;

  setTimeout(() => {
    const btnMusic = div.querySelector('#btn-audio-music');
    const btnSFX = div.querySelector('#btn-audio-sfx');

    function updateMusicBtn() {
      btnMusic.style.opacity = isMusicEnabled() ? '1' : '0.35';
      btnMusic.title = isMusicEnabled() ? '关闭音乐' : '开启音乐';
    }
    function updateSFXBtn() {
      btnSFX.style.opacity = isSFXEnabled() ? '1' : '0.35';
      btnSFX.title = isSFXEnabled() ? '关闭音效' : '开启音效';
    }

    updateMusicBtn();
    updateSFXBtn();

    btnMusic.addEventListener('click', (e) => {
      e.stopPropagation();
      ensureAudio(); // ensure audio ctx exists before toggling
      toggleMusic();
      updateMusicBtn();
    });

    btnSFX.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSFX();
      updateSFXBtn();
    });

    div.querySelector('#btn-solo').addEventListener('click', () => showScreen('profile', { mode: 'solo' }));
    div.querySelector('#btn-arena').addEventListener('click', () => showScreen('profile', { mode: 'arena' }));
    div.querySelector('#btn-daily').addEventListener('click', () => showScreen('profile', { mode: 'daily' }));
  }, 0);

  return div;
});

// Expose audio functions globally for debugging
import { setMusicIntensity as _smi, playStinger as _ps } from './audio.js';
window._audioDebug = {
  initAudio, playMusic, setMusicIntensity: _smi, playStinger: _ps,
  test: () => { initAudio(); playMusic('xianqin'); setTimeout(() => _smi(1), 300); console.log('Battle music should start in 300ms'); }
};
console.log('Audio debug: type _audioDebug.test() in console to test battle music');

// Boot
initRouter();

// If no profiles exist → show opening cinematic first, then title
// If profiles exist → go straight to title
if (gameState.profiles.length === 0) {
  showScreen('story', {
    storyKey: 'opening',
    onComplete: () => showScreen('title'),
  });
} else {
  showScreen('title');
}
