// js/main.js — App initialization, imports all screens, boots the game
import { gameState } from './state.js';
import { initRouter, registerScreen, registerLazyScreen, showScreen } from './router.js';
import { initAudio, playMusic, playSound, toggleMusic, toggleSFX, isMusicEnabled, isSFXEnabled } from './audio.js';
import { startParticles, setParticleMode } from './particles.js';
import { checkDailyLogin } from './progression.js';

// Export particle control for screens to use
export { setParticleMode };

// Re-export so existing screen imports from './main.js' still work
export { registerScreen, registerLazyScreen, showScreen };

// ── Eager-loaded screens (core gameplay path) ──
import './screens/profile.js';
import './screens/chapter-map.js';  // replaces worldmap + quest
import './screens/reward.js';
import './screens/combat.js';
import './screens/puzzle.js';
import './screens/boss.js';
import './screens/story.js';
import './screens/encounter-intro.js';

// ── Lazy-loaded screens (navigated on demand, ~250K deferred) ──
registerLazyScreen('chengyu',          () => import('./screens/chengyu.js'));
registerLazyScreen('inventory',        () => import('./screens/inventory.js'));
registerLazyScreen('shop',             () => import('./screens/shop.js'));
registerLazyScreen('levelup',          () => import('./screens/levelup.js'));
registerLazyScreen('daily',            () => import('./screens/daily.js'));
registerLazyScreen('arena',            () => import('./screens/arena.js'));
registerLazyScreen('chapter-complete', () => import('./screens/chapter-complete.js'));
registerLazyScreen('settings',         () => import('./screens/settings.js'));
registerLazyScreen('stats',            () => import('./screens/stats-screen.js'));
registerLazyScreen('gauntlet',         () => import('./screens/gauntlet.js'));

// ─── Audio initialization ─────────────────────────────────────────────────────
// Browser autoplay policy requires a user gesture to unlock AudioContext.
// We use a splash screen so the first click is dedicated to unlocking audio.
let audioReady = false;
export function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  initAudio();
  // Music is started by whichever screen calls playMusic() after this
}

// ── Cinematic AAA Title Screen ────────────────────────────────────────────────
registerScreen('title', () => {
  // Title screen always plays menu music (also handles returning from other screens)
  ensureAudio();
  playMusic('menu');

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
      <button id="btn-title-settings" class="title-ctrl-btn" title="设置" aria-label="打开设置">
        <span aria-hidden="true">&#x2699;</span>
      </button>
      <button id="btn-audio-music" class="title-ctrl-btn" title="音乐" aria-label="音乐开关">
        <span aria-hidden="true">&#x266B;</span>
      </button>
      <button id="btn-audio-sfx" class="title-ctrl-btn" title="音效" aria-label="音效开关">
        <span aria-hidden="true">&#x1F50A;</span>
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

// ── Splash screen — unlocks audio on first tap, then shows title with music ──
// This is the industry-standard pattern for web games.
// The splash gives the browser a dedicated user gesture to unlock AudioContext,
// so the title screen can launch with music playing from the first frame.
function showSplash() {
  const root = document.getElementById('game-root');
  root.innerHTML = '';

  const splash = document.createElement('div');
  splash.style.cssText = `
    position:absolute; inset:0; display:flex; flex-direction:column;
    align-items:center; justify-content:center; gap:24px;
    background:radial-gradient(ellipse at 50% 40%, rgba(30,25,50,1) 0%, rgba(11,12,26,1) 70%);
    cursor:pointer; user-select:none; z-index:1;
  `;
  splash.innerHTML = `
    <div style="font-size:3.2rem;font-weight:900;letter-spacing:0.08em;
      background:linear-gradient(135deg,#d4a017,#f5c842,#d4a017);
      -webkit-background-clip:text;-webkit-text-fill-color:transparent;
      background-clip:text;text-shadow:none;filter:drop-shadow(0 2px 8px rgba(212,160,23,0.3));">
      文定乾坤
    </div>
    <div style="font-size:1rem;color:rgba(255,255,255,0.4);letter-spacing:0.15em;font-weight:300;">
      W E N &nbsp; D I N G &nbsp; Q I A N &nbsp; K U N
    </div>
    <div style="margin-top:32px;padding:14px 40px;border:1.5px solid rgba(212,160,23,0.4);
      border-radius:12px;color:rgba(212,160,23,0.8);font-size:1.05rem;font-weight:600;
      letter-spacing:0.1em;animation:splash-pulse 2s ease-in-out infinite;">
      点击进入
    </div>
    <style>
      @keyframes splash-pulse {
        0%,100% { opacity:0.6; transform:scale(1); }
        50% { opacity:1; transform:scale(1.03); }
      }
    </style>
  `;

  // Single click/tap → unlock audio → enter game with music
  const enterGame = () => {
    splash.removeEventListener('click', enterGame);
    splash.removeEventListener('touchend', enterGame);

    // Unlock audio (user gesture)
    ensureAudio();

    // Navigate to appropriate screen
    if (gameState.profiles.length === 0) {
      showScreen('profile', { mode: 'solo' });
    } else if (gameState.profiles.length === 1) {
      gameState.selectProfile(0);
      showScreen('title');
    } else {
      showScreen('title');
    }
  };

  splash.addEventListener('click', enterGame);
  splash.addEventListener('touchend', enterGame);
  root.appendChild(splash);

  // Start ambient particles on splash too
  startParticles('ambient');
}

showSplash();
