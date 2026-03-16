// js/main.js — App initialization, imports all screens, boots the game
import { gameState } from './state.js';
import { initRouter, registerScreen, showScreen } from './router.js';
import { initAudio, playMusic, toggleMusic, toggleSFX, isMusicEnabled, isSFXEnabled } from './audio.js';
import { startParticles, setParticleMode } from './particles.js';
import { checkDailyLogin } from './progression.js';

// Export particle control for screens to use
export { setParticleMode };

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
import './screens/shop.js';
import './screens/levelup.js';
import './screens/daily.js';
import './screens/arena.js';
import './screens/story.js';
import './screens/encounter-intro.js';
import './screens/chapter-complete.js';

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

// ── Cinematic Title Screen ────────────────────────────────────────────────────
registerScreen('title', () => {
  const div = document.createElement('div');
  div.className = 'screen';

  // Floating calligraphy characters for the ink-wash background
  const floatingChars = '永和九年岁在癸丑暮春之初会于会稽山阴之兰亭修禊事也群贤毕至少长咸集'.split('');
  const floatingHTML = floatingChars.map((ch, i) => {
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const size = 0.8 + Math.random() * 1.8;
    const dur = 12 + Math.random() * 18;
    const delay = Math.random() * -20;
    const opacity = 0.03 + Math.random() * 0.06;
    return `<span class="title-float-char" style="
      left:${left}%;top:${top}%;font-size:${size}rem;
      animation-duration:${dur}s;animation-delay:${delay}s;
      opacity:${opacity};
    ">${ch}</span>`;
  }).join('');

  div.innerHTML = `
    <!-- Ink-wash landscape background (CSS only) -->
    <div class="title-ink-bg" aria-hidden="true">
      <div class="title-mountain title-mountain-1"></div>
      <div class="title-mountain title-mountain-2"></div>
      <div class="title-mountain title-mountain-3"></div>
      <div class="title-mist title-mist-1"></div>
      <div class="title-mist title-mist-2"></div>
      ${floatingHTML}
    </div>

    <!-- Audio controls -->
    <button id="btn-audio-music" class="title-audio-btn" title="音乐" style="right:60px;">
      <span class="title-audio-icon">&#x266B;</span>
    </button>
    <button id="btn-audio-sfx" class="title-audio-btn" title="音效" style="right:16px;">
      <span class="title-audio-icon">&#x1F50A;</span>
    </button>

    <!-- Logo: brush-stroke reveal -->
    <div class="title-logo-wrap">
      <div class="title-logo">
        <span class="title-char title-char-1">文</span>
        <span class="title-char title-char-2">字</span>
        <span class="title-char title-char-3">侠</span>
      </div>
      <!-- Ink splatter accents -->
      <div class="title-ink-splatter title-splat-1" aria-hidden="true"></div>
      <div class="title-ink-splatter title-splat-2" aria-hidden="true"></div>
      <div class="title-ink-splatter title-splat-3" aria-hidden="true"></div>
    </div>

    <!-- Subtitle with letter-spacing animation -->
    <p class="title-subtitle">Word Hero</p>

    <!-- Menu buttons: staggered slide-in from bottom -->
    <div class="title-menu">
      <button class="btn btn-primary title-menu-btn title-menu-btn-1" id="btn-solo">单人模式</button>
      <button class="btn title-menu-btn title-menu-btn-2" id="btn-arena">双人对战</button>
      <button class="btn title-menu-btn title-menu-btn-3" id="btn-daily">每日挑战</button>
    </div>

    <!-- Version badge -->
    <div class="title-version">v1.0</div>

    <!-- Daily login reward popup (injected dynamically) -->
    <div id="daily-login-popup" class="daily-login-popup" style="display:none;" aria-live="polite"></div>
  `;

  setTimeout(() => {
    // --- Audio toggle buttons ---
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
      ensureAudio();
      toggleMusic();
      updateMusicBtn();
    });

    btnSFX.addEventListener('click', (e) => {
      e.stopPropagation();
      toggleSFX();
      updateSFXBtn();
    });

    // --- Menu navigation ---
    div.querySelector('#btn-solo').addEventListener('click', () => showScreen('profile', { mode: 'solo' }));
    div.querySelector('#btn-arena').addEventListener('click', () => showScreen('profile', { mode: 'arena' }));
    div.querySelector('#btn-daily').addEventListener('click', () => showScreen('profile', { mode: 'daily' }));

    // --- Daily login reward check ---
    const profile = gameState.profile;
    if (profile) {
      const reward = checkDailyLogin(profile);
      if (reward) {
        const popup = div.querySelector('#daily-login-popup');
        popup.innerHTML = `
          <div class="daily-login-content">
            <div class="daily-login-streak">连续登录第 <strong>${reward.streak}</strong> 天！</div>
            <div class="daily-login-reward">获得 ${reward.label}</div>
            <button class="btn btn-sm daily-login-close" id="btn-close-daily">好的</button>
          </div>
        `;
        popup.style.display = 'flex';
        popup.classList.add('daily-login-enter');

        popup.querySelector('#btn-close-daily').addEventListener('click', () => {
          popup.classList.remove('daily-login-enter');
          popup.classList.add('daily-login-exit');
          setTimeout(() => { popup.style.display = 'none'; }, 350);
        });
      }
    }
  }, 0);

  return div;
});

// Boot
initRouter();

if (gameState.profiles.length === 0) {
  // New player: opening cinematic (shortened) → profile creation → worldmap
  showScreen('story', {
    storyKey: 'opening',
    onComplete: () => showScreen('profile', { mode: 'solo' }),
  });
} else if (gameState.profiles.length === 1) {
  // Returning player with a single profile — auto-select and go to title
  gameState.selectProfile(0);
  showScreen('title');
} else {
  // Multiple profiles — show title as normal
  showScreen('title');
}
