// js/main.js — App initialization, imports all screens, boots the game
import { gameState } from './state.js';
import { initRouter, registerScreen, registerLazyScreen, showScreen } from './router.js';
import { initAudio, playMusic, playSound, toggleMusic, toggleSFX, isMusicEnabled, isSFXEnabled } from './audio.js';
import { startParticles, setParticleMode } from './particles.js';
import { checkDailyLogin } from './progression.js';
import { TITLE_BG } from './sprites.js';

// Export particle control for screens to use
export { setParticleMode };

// Re-export so existing screen imports from './main.js' still work
export { registerScreen, registerLazyScreen, showScreen };

// ── Eager-loaded screens (core gameplay path) ──
import './screens/profile.js';
import './screens/worldmap.js';
import './screens/quest.js';
import './screens/reward.js';
import './screens/combat.js';
import './screens/puzzle.js';
import './screens/boss.js';
import './screens/story.js';
import './screens/encounter-intro.js';

// ── Lazy-loaded screens (navigated on demand, ~250K deferred) ──
// Version stamp from index.html — appended to dynamic imports for cache busting
const _v = window.APP_VERSION ? '?v=' + window.APP_VERSION : '';
registerLazyScreen('chengyu',          () => import('./screens/chengyu.js' + _v));
registerLazyScreen('inventory',        () => import('./screens/inventory.js' + _v));
registerLazyScreen('shop',             () => import('./screens/shop.js' + _v));
registerLazyScreen('levelup',          () => import('./screens/levelup.js' + _v));
registerLazyScreen('daily',            () => import('./screens/daily.js' + _v));
registerLazyScreen('arena',            () => import('./screens/arena.js' + _v));
registerLazyScreen('chapter-complete', () => import('./screens/chapter-complete.js' + _v));
registerLazyScreen('settings',         () => import('./screens/settings.js' + _v));
registerLazyScreen('stats',            () => import('./screens/stats-screen.js' + _v));
registerLazyScreen('gauntlet',         () => import('./screens/gauntlet.js' + _v));
// ── Engagement feature screens ──
registerLazyScreen('lucky-wheel',      () => import('./screens/lucky-wheel.js' + _v));
registerLazyScreen('trophy-room',      () => import('./screens/trophy-room.js' + _v));
registerLazyScreen('bestiary',         () => import('./screens/bestiary.js' + _v));
registerLazyScreen('weekly-boss',      () => import('./screens/weekly-boss.js' + _v));
registerLazyScreen('combo-wall',       () => import('./screens/combo-wall.js' + _v));
registerLazyScreen('companion-profile',() => import('./screens/companion-profile.js' + _v));
registerLazyScreen('seasonal-event',   () => import('./screens/seasonal-event.js' + _v));
registerLazyScreen('prestige',         () => import('./screens/prestige.js' + _v));

// Initialize audio — try immediately, then ensure on first interaction
let audioReady = false;
function ensureAudio() {
  if (audioReady) return;
  audioReady = true;
  initAudio();
  if (isMusicEnabled()) playMusic('menu');
}
// Try to start music immediately (some browsers allow it)
try { playMusic('menu'); } catch(_) {}
// Fallback: ensure on first user interaction (browser autoplay policy)
document.addEventListener('click', ensureAudio, { once: true });
document.addEventListener('keydown', ensureAudio, { once: true });
document.addEventListener('touchstart', ensureAudio, { once: true });

// ── Cinematic AAA Title Screen ────────────────────────────────────────────────
registerScreen('title', () => {
  const div = document.createElement('div');
  div.className = 'screen title-screen-root';
  div.style.backgroundImage = `url('${TITLE_BG}')`;
  div.style.backgroundSize = 'cover';
  div.style.backgroundPosition = 'center';

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

      <!-- Main title — calligraphy image -->
      <div class="title-logo">
        <img src="assets/img/title_calligraphy.webp?v=${window.APP_VERSION || ''}" alt="文定乾坤"
          class="title-calligraphy-img"
          style="width:min(85vw, 700px); height:auto; filter:drop-shadow(0 0 30px rgba(212,160,23,0.6)) drop-shadow(0 0 60px rgba(212,160,23,0.3)); opacity:0; animation: title-calligraphy-in 1.2s ease 1.2s forwards;"
          draggable="false">
      </div>
    </div>

    <!-- ===== SUBTITLE ===== -->
    <p class="title-subtitle" style="letter-spacing:0.3em;">
      <span class="title-letter title-letter-1">W</span><span class="title-letter title-letter-2">E</span><span class="title-letter title-letter-3">N</span><span class="title-letter title-letter-sp">&nbsp;</span><span class="title-letter title-letter-4">D</span><span class="title-letter title-letter-5">I</span><span class="title-letter title-letter-6">N</span><span class="title-letter title-letter-7">G</span><span class="title-letter title-letter-sp">&nbsp;</span><span class="title-letter title-letter-8">Q</span><span class="title-letter title-letter-9">I</span><span class="title-letter title-letter-10">A</span><span class="title-letter title-letter-11">N</span><span class="title-letter title-letter-sp">&nbsp;</span><span class="title-letter title-letter-12">K</span><span class="title-letter title-letter-13">U</span><span class="title-letter title-letter-14">N</span>
    </p>

    <!-- ===== TAGLINE ===== -->
    <p class="title-tagline">以文定乾坤，守护千年文明</p>

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
      ensureAudio();
      toggleSFX();
      updateSFXBtn();
    });

    // --- Settings gear ---
    div.querySelector('#btn-title-settings')?.addEventListener('click', (e) => {
      e.stopPropagation();
      ensureAudio();
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

    // --- Menu navigation (ensureAudio on every button so music always starts) ---
    div.querySelector('#btn-solo').addEventListener('click', () => { ensureAudio(); showScreen('profile', { mode: 'solo' }); });
    div.querySelector('#btn-arena').addEventListener('click', () => { ensureAudio(); showScreen('profile', { mode: 'arena' }); });
    div.querySelector('#btn-daily').addEventListener('click', () => { ensureAudio(); showScreen('profile', { mode: 'daily' }); });

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
  checkComebackBonus();
  showScreen('title');
} else {
  // Multiple profiles — show title as normal
  showScreen('title');
}

// ── Comeback bonus: idle gold + welcome back overlay ──────────────────────
function checkComebackBonus() {
  const profile = gameState.profile;
  if (!profile || !profile.lastActiveTimestamp) return;
  const todayStr = new Date().toISOString().slice(0, 10);
  if (profile.comebackClaimed === todayStr) return;
  const hoursSince = (Date.now() - profile.lastActiveTimestamp) / 3600000;
  if (hoursSince < 24) return;
  const idleHours = Math.min(hoursSince, 168);
  const idleGold = Math.floor(idleHours * 2);
  const idleXP = Math.floor(idleHours * 1);
  profile.gold = (profile.gold || 0) + idleGold;
  profile.comebackClaimed = todayStr;
  profile.lastActiveTimestamp = Date.now();
  gameState.save();
  // Show comeback toast on next tick (after title renders)
  setTimeout(() => {
    if (typeof showToast === 'undefined') {
      import('./toast.js').then(m => m.showToast(`欢迎回来！离线收入: +${idleGold}金币 +${idleXP}XP`, { type: 'reward', duration: 4000 }));
    }
  }, 1500);
}
