// js/main.js — App initialization, imports all screens, boots the game
import { gameState } from './state.js';
import { initRouter, registerScreen, showScreen } from './router.js';
import { initAudio, playMusic, playSound, toggleMusic, toggleSFX, isMusicEnabled, isSFXEnabled } from './audio.js';
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
import './screens/settings.js';
import './screens/stats-screen.js';

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

// ── Cinematic AAA Title Screen ────────────────────────────────────────────────
registerScreen('title', () => {
  const div = document.createElement('div');
  div.className = 'screen title-screen-root';

  // --- Floating ancient calligraphy characters (from various dynasties) ---
  const dynastyChars = [
    // 兰亭集序 (Wang Xizhi, Jin)
    ...'永和九年岁在癸丑暮春之初'.split(''),
    // 千字文 (Zhou Xingsi, Liang)
    ...'天地玄黄宇宙洪荒日月盈昃辰宿列张'.split(''),
    // 道德经 (Laozi)
    ...'道可道非常道名可名非常名'.split(''),
    // 论语 (Confucius)
    ...'学而时习之不亦说乎'.split(''),
  ];
  const floatingHTML = dynastyChars.map((ch) => {
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const size = 0.8 + Math.random() * 2.2;
    const dur = 15 + Math.random() * 25;
    const delay = Math.random() * -30;
    const opacity = 0.025 + Math.random() * 0.055;
    return `<span class="title-float-char" style="
      left:${left}%;top:${top}%;font-size:${size}rem;
      animation-duration:${dur}s;animation-delay:${delay}s;
      opacity:${opacity};
    ">${ch}</span>`;
  }).join('');

  // --- Orbiting characters around title ---
  const orbitChars = '诗书礼乐易春秋剑气侠义仁智信'.split('');
  const orbitHTML = orbitChars.map((ch, i) => {
    const angle = (360 / orbitChars.length) * i;
    const radius = 160 + Math.random() * 30;
    const dur = 30 + Math.random() * 15;
    const dly = -(dur / orbitChars.length) * i;
    return `<span class="title-orbit-char" style="
      --orbit-angle:${angle}deg;--orbit-radius:${radius}px;
      animation-duration:${dur}s;animation-delay:${dly}s;
    ">${ch}</span>`;
  }).join('');

  // --- Cherry blossom petals ---
  let petalsHTML = '';
  for (let i = 0; i < 25; i++) {
    const left = Math.random() * 110 - 5;
    const dur = 8 + Math.random() * 12;
    const delay = -(Math.random() * 20);
    const size = 8 + Math.random() * 12;
    const sway = 40 + Math.random() * 80;
    petalsHTML += `<div class="title-petal" style="
      left:${left}%;animation-duration:${dur}s;animation-delay:${delay}s;
      width:${size}px;height:${size}px;--petal-sway:${sway}px;
    "></div>`;
  }

  // --- Fireflies ---
  let firefliesHTML = '';
  for (let i = 0; i < 18; i++) {
    const left = Math.random() * 100;
    const top = Math.random() * 100;
    const dur = 4 + Math.random() * 6;
    const delay = -(Math.random() * 10);
    const size = 2 + Math.random() * 4;
    firefliesHTML += `<div class="title-firefly" style="
      left:${left}%;top:${top}%;animation-duration:${dur}s;
      animation-delay:${delay}s;width:${size}px;height:${size}px;
    "></div>`;
  }

  // --- Shooting stars ---
  let shootingStarsHTML = '';
  for (let i = 0; i < 4; i++) {
    const left = 10 + Math.random() * 80;
    const delay = 3 + Math.random() * 12;
    shootingStarsHTML += `<div class="title-shooting-star" style="
      left:${left}%;animation-delay:${delay}s;
    "></div>`;
  }

  div.innerHTML = `
    <!-- ===== BLACKOUT CINEMATIC OVERLAY ===== -->
    <div class="title-blackout" aria-hidden="true"></div>

    <!-- ===== PARALLAX LANDSCAPE BACKGROUND ===== -->
    <div class="title-ink-bg" aria-hidden="true">
      <!-- Aurora / northern lights at top -->
      <div class="title-aurora"></div>

      <!-- Glowing moon -->
      <div class="title-moon">
        <div class="title-moon-glow"></div>
      </div>

      <!-- Parallax mountains -->
      <div class="title-mountain title-mountain-far"></div>
      <div class="title-mountain title-mountain-mid"></div>
      <div class="title-mountain title-mountain-near"></div>

      <!-- Horizontal mist layers -->
      <div class="title-mist title-mist-1"></div>
      <div class="title-mist title-mist-2"></div>
      <div class="title-mist title-mist-3"></div>

      <!-- Floating ancient characters -->
      ${floatingHTML}

      <!-- Cherry blossom petals -->
      ${petalsHTML}

      <!-- Fireflies -->
      ${firefliesHTML}

      <!-- Shooting stars -->
      ${shootingStarsHTML}

      <!-- Fog layer -->
      <div class="title-fog title-fog-1"></div>
      <div class="title-fog title-fog-2"></div>
    </div>

    <!-- ===== TOP-RIGHT CONTROLS ===== -->
    <div class="title-controls">
      <button id="btn-title-settings" class="title-ctrl-btn" title="设置">
        <span>&#x2699;</span>
      </button>
      <button id="btn-audio-music" class="title-ctrl-btn" title="音乐">
        <span>&#x266B;</span>
      </button>
      <button id="btn-audio-sfx" class="title-ctrl-btn" title="音效">
        <span>&#x1F50A;</span>
      </button>
    </div>

    <!-- ===== INK DROP + SPLASH SEQUENCE ===== -->
    <div class="title-ink-drop-area" aria-hidden="true">
      <div class="title-ink-drop"></div>
      <div class="title-ink-splash"></div>
      <div class="title-ink-splash-ring"></div>
    </div>

    <!-- ===== LOGO AREA ===== -->
    <div class="title-logo-wrap">
      <!-- Orbiting characters -->
      <div class="title-orbit-ring">
        ${orbitHTML}
      </div>

      <!-- Main title -->
      <div class="title-logo">
        <span class="title-char title-char-1">文</span>
        <span class="title-char title-char-2">字</span>
        <span class="title-char title-char-3">侠</span>
      </div>

      <!-- Ink splatter accents -->
      <div class="title-ink-splatter title-splat-1" aria-hidden="true"></div>
      <div class="title-ink-splatter title-splat-2" aria-hidden="true"></div>
      <div class="title-ink-splatter title-splat-3" aria-hidden="true"></div>

      <!-- Red seal stamp 印章 -->
      <div class="title-seal" aria-hidden="true">
        <span class="title-seal-char">印</span>
      </div>
    </div>

    <!-- ===== SUBTITLE: WORD HERO letter-by-letter ===== -->
    <p class="title-subtitle">
      <span class="title-letter title-letter-1">W</span><span class="title-letter title-letter-2">O</span><span class="title-letter title-letter-3">R</span><span class="title-letter title-letter-4">D</span><span class="title-letter title-letter-sp">&nbsp;</span><span class="title-letter title-letter-5">H</span><span class="title-letter title-letter-6">E</span><span class="title-letter title-letter-7">R</span><span class="title-letter title-letter-8">O</span>
    </p>

    <!-- ===== TAGLINE ===== -->
    <p class="title-tagline">以文字之力，守护千年文明</p>

    <!-- ===== MENU BUTTONS ===== -->
    <div class="title-menu">
      <button class="btn btn-primary title-menu-btn title-menu-btn-1 glass-card" id="btn-solo">
        <span class="title-btn-motif"></span>单人模式
      </button>
      <button class="btn title-menu-btn title-menu-btn-2 glass-card" id="btn-arena">
        <span class="title-btn-motif"></span>双人对战
      </button>
      <button class="btn title-menu-btn title-menu-btn-3 glass-card" id="btn-daily">
        <span class="title-btn-motif"></span>每日挑战
      </button>
    </div>

    <!-- ===== BOTTOM CREDITS ===== -->
    <div class="title-credits">v1.0 &nbsp;|&nbsp; 用文字守护世界</div>

    <!-- ===== DAILY LOGIN POPUP ===== -->
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

    // --- Settings gear ---
    div.querySelector('#btn-title-settings')?.addEventListener('click', (e) => {
      e.stopPropagation();
      showScreen('settings', { returnTo: 'title' });
    });

    // --- Ripple effect on menu buttons ---
    div.querySelectorAll('.title-menu-btn').forEach(btn => {
      btn.addEventListener('mouseenter', (e) => {
        const ripple = document.createElement('span');
        ripple.className = 'title-btn-ripple';
        const rect = btn.getBoundingClientRect();
        ripple.style.left = (e.clientX - rect.left) + 'px';
        ripple.style.top = (e.clientY - rect.top) + 'px';
        btn.appendChild(ripple);
        setTimeout(() => ripple.remove(), 700);
      });
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
        playSound('daily');

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
