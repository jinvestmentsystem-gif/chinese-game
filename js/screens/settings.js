// js/screens/settings.js — Settings & configuration screen
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import {
  toggleMusic, toggleSFX, isMusicEnabled, isSFXEnabled,
  setMusicVolume, setSfxVolume, getMusicVolume, getSfxVolume
} from '../audio.js';

function getGradeLabel(tier) {
  const map = { grade1: '一二年级', grade3: '三年级', grade4: '四年级', grade5: '五六年级', grade7: '七年级', grade8: '八九年级' };
  return map[tier] || tier;
}

const SETTINGS_KEY = 'wenzi-xia-settings';

function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    return raw ? JSON.parse(raw) : {};
  } catch { return {}; }
}

function saveSettings(s) {
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(s));
}

function getSettings() {
  const defaults = {
    showTimer: true,
    animationSpeed: 'normal', // normal | fast | skip
  };
  return { ...defaults, ...loadSettings() };
}

// ── Render ────────────────────────────────────────────────────────────────────
function renderSettings(params) {
  const div = document.createElement('div');
  div.className = 'screen';

  const profile = gameState.profile;
  const settings = getSettings();
  const musicOn = isMusicEnabled();
  const sfxOn = isSFXEnabled();
  const musicVol = Math.round(getMusicVolume() * 100);
  const sfxVol = Math.round(getSfxVolume() * 100);
  const returnTo = params?.returnTo || 'title';

  div.innerHTML = `
    <div class="settings-container screen-enter">
      <!-- Ink-wash decorative background -->
      <div class="settings-ink-bg" aria-hidden="true">
        <div class="settings-ink-circle settings-ink-c1"></div>
        <div class="settings-ink-circle settings-ink-c2"></div>
        <div class="settings-ink-circle settings-ink-c3"></div>
      </div>

      <!-- Header -->
      <div class="settings-header">
        <button class="btn btn-sm settings-back-btn" id="btn-settings-back" title="返回">
          <span style="margin-right:4px;">&larr;</span> 返回
        </button>
        <h2 class="settings-title">设 置</h2>
        <div style="width:80px;"></div>
      </div>

      <div class="settings-scroll">

        <!-- ══ Audio Section ══ -->
        <div class="settings-section">
          <div class="settings-section-header">
            <span class="settings-section-icon">&#x266B;</span>
            <span>音频设置</span>
          </div>

          <!-- Music toggle + volume -->
          <div class="settings-row">
            <div class="settings-row-label">背景音乐</div>
            <div class="settings-row-controls">
              <button class="settings-toggle ${musicOn ? 'active' : ''}" id="toggle-music"
                title="${musicOn ? '关闭音乐' : '开启音乐'}">
                <span class="settings-toggle-track">
                  <span class="settings-toggle-thumb"></span>
                </span>
                <span class="settings-toggle-text">${musicOn ? '开' : '关'}</span>
              </button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-label">音乐音量</div>
            <div class="settings-row-controls">
              <input type="range" class="settings-slider" id="slider-music"
                min="0" max="100" value="${musicVol}" />
              <span class="settings-slider-val" id="val-music">${musicVol}%</span>
            </div>
          </div>

          <!-- SFX toggle + volume -->
          <div class="settings-row">
            <div class="settings-row-label">音效</div>
            <div class="settings-row-controls">
              <button class="settings-toggle ${sfxOn ? 'active' : ''}" id="toggle-sfx"
                title="${sfxOn ? '关闭音效' : '开启音效'}">
                <span class="settings-toggle-track">
                  <span class="settings-toggle-thumb"></span>
                </span>
                <span class="settings-toggle-text">${sfxOn ? '开' : '关'}</span>
              </button>
            </div>
          </div>
          <div class="settings-row">
            <div class="settings-row-label">音效音量</div>
            <div class="settings-row-controls">
              <input type="range" class="settings-slider" id="slider-sfx"
                min="0" max="100" value="${sfxVol}" />
              <span class="settings-slider-val" id="val-sfx">${sfxVol}%</span>
            </div>
          </div>
        </div>

        <!-- ══ Gameplay Section ══ -->
        <div class="settings-section">
          <div class="settings-section-header">
            <span class="settings-section-icon">&#x2699;</span>
            <span>游戏设置</span>
          </div>

          <div class="settings-row">
            <div class="settings-row-label">难度等级</div>
            <div class="settings-row-controls">
              <span class="settings-readonly-badge">
                ${profile ? getGradeLabel(profile.tier) : '—'}
                · 难度 ${profile ? profile.difficultyBase : '—'}
              </span>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-row-label">显示计时器</div>
            <div class="settings-row-controls">
              <button class="settings-toggle ${settings.showTimer ? 'active' : ''}" id="toggle-timer">
                <span class="settings-toggle-track">
                  <span class="settings-toggle-thumb"></span>
                </span>
                <span class="settings-toggle-text">${settings.showTimer ? '显示' : '隐藏'}</span>
              </button>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-row-label">动画速度</div>
            <div class="settings-row-controls">
              <div class="settings-radio-group" id="anim-speed">
                <button class="settings-radio ${settings.animationSpeed === 'normal' ? 'active' : ''}" data-value="normal">正常</button>
                <button class="settings-radio ${settings.animationSpeed === 'fast' ? 'active' : ''}" data-value="fast">快速</button>
                <button class="settings-radio ${settings.animationSpeed === 'skip' ? 'active' : ''}" data-value="skip">跳过</button>
              </div>
            </div>
          </div>
        </div>

        <!-- ══ Profile Section ══ -->
        ${profile ? `
        <div class="settings-section">
          <div class="settings-section-header">
            <span class="settings-section-icon">&#x2661;</span>
            <span>档案管理</span>
          </div>

          <div class="settings-profile-card">
            <div class="settings-profile-name">${profile.name}</div>
            <div class="settings-profile-info">
              Lv.${profile.level} · ${profile.activeTitle || '新手文定乾坤'}
              · ${profile.stats?.totalQuests || 0} 次冒险
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-row-label">重置进度</div>
            <div class="settings-row-controls">
              <button class="btn btn-sm settings-danger-btn" id="btn-reset-progress">重置进度</button>
            </div>
          </div>
          <div id="reset-confirm-area" style="display:none;"></div>

          <div class="settings-row">
            <div class="settings-row-label">清除存档</div>
            <div class="settings-row-controls">
              <button class="btn btn-sm settings-danger-btn" id="btn-clear-save">清除所有数据</button>
            </div>
          </div>
          <div id="clear-confirm-area" style="display:none;"></div>
        </div>
        ` : ''}

        <!-- ══ Save Management Section ══ -->
        <div class="settings-section">
          <div class="settings-section-header">
            <span class="settings-section-icon">&#x1F4BE;</span>
            <span>存档管理</span>
          </div>

          <div class="settings-row">
            <div class="settings-row-label">导出存档</div>
            <div class="settings-row-controls">
              <button class="btn btn-sm" id="btn-export-save" style="font-size:0.95rem;">导出存档</button>
            </div>
          </div>

          <div class="settings-row">
            <div class="settings-row-label">导入存档</div>
            <div class="settings-row-controls">
              <button class="btn btn-sm" id="btn-import-save" style="font-size:0.95rem;">导入存档</button>
              <input type="file" id="input-import-save" accept=".json" style="display:none;" />
            </div>
          </div>
          <div id="import-confirm-area" style="display:none;"></div>

          <div class="settings-row">
            <div class="settings-row-label">复制存档代码</div>
            <div class="settings-row-controls">
              <button class="btn btn-sm" id="btn-copy-save" style="font-size:0.95rem;">复制存档代码</button>
            </div>
          </div>

          <div class="settings-row" style="flex-wrap:wrap;gap:8px;">
            <div class="settings-row-label">粘贴存档代码</div>
            <div class="settings-row-controls" style="flex:1;min-width:200px;">
              <input type="text" id="input-paste-save" placeholder="粘贴存档代码……"
                style="flex:1;background:rgba(0,0,0,0.4);border:1px solid rgba(212,160,23,0.2);border-radius:6px;padding:6px 10px;color:var(--text-primary);font-size:0.95rem;font-family:var(--font-main);outline:none;min-width:0;" />
              <button class="btn btn-sm" id="btn-paste-save" style="font-size:0.95rem;white-space:nowrap;">应用</button>
            </div>
          </div>
        </div>

        <!-- ══ About Section ══ -->
        <div class="settings-section">
          <div class="settings-section-header">
            <span class="settings-section-icon">&#x2139;</span>
            <span>关于</span>
          </div>

          <div class="settings-about">
            <div class="settings-about-title">文定乾坤 · Wen Ding Qian Kun</div>
            <div class="settings-about-version">版本 v1.0</div>
            <div class="settings-about-credit">
              一款中文学习角色扮演游戏<br>
              <span style="color:var(--text-dim);font-size:0.92rem;">Crafted with ink and code</span>
            </div>
          </div>
        </div>

        <!-- Bottom padding -->
        <div style="height:40px;"></div>
      </div>
    </div>

    <style>
      /* ── Settings Screen Styles ─────────────────────────────────── */
      .settings-container {
        position: relative;
        width: 100%;
        height: 100%;
        overflow: hidden;
        display: flex;
        flex-direction: column;
      }

      /* Ink-wash decorative circles */
      .settings-ink-bg {
        position: absolute;
        inset: 0;
        pointer-events: none;
        z-index: 0;
        overflow: hidden;
      }
      .settings-ink-circle {
        position: absolute;
        border-radius: 50%;
        border: 1px solid rgba(212,160,23,0.06);
      }
      .settings-ink-c1 {
        width: 300px; height: 300px;
        top: -80px; right: -60px;
        background: radial-gradient(circle, rgba(212,160,23,0.04) 0%, transparent 70%);
        animation: settings-float 20s ease-in-out infinite alternate;
      }
      .settings-ink-c2 {
        width: 200px; height: 200px;
        bottom: 10%; left: -40px;
        background: radial-gradient(circle, rgba(46,204,138,0.03) 0%, transparent 70%);
        animation: settings-float 16s ease-in-out infinite alternate-reverse;
      }
      .settings-ink-c3 {
        width: 150px; height: 150px;
        top: 40%; right: 20%;
        background: radial-gradient(circle, rgba(142,68,173,0.03) 0%, transparent 70%);
        animation: settings-float 22s ease-in-out infinite alternate;
      }
      @keyframes settings-float {
        0%   { transform: translate(0, 0) scale(1); }
        100% { transform: translate(15px, -20px) scale(1.08); }
      }

      /* Header */
      .settings-header {
        position: relative;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 16px 20px 12px;
        border-bottom: 1px solid rgba(212,160,23,0.12);
      }
      .settings-back-btn {
        font-size: 0.85rem !important;
      }
      .settings-title {
        font-size: 1.4rem;
        letter-spacing: 0.25em;
        color: var(--gold);
        text-shadow: 0 0 18px rgba(212,160,23,0.3);
      }

      /* Scrollable area */
      .settings-scroll {
        position: relative;
        z-index: 1;
        flex: 1;
        overflow-y: auto;
        padding: 12px 16px;
      }
      .settings-scroll::-webkit-scrollbar {
        width: 4px;
      }
      .settings-scroll::-webkit-scrollbar-thumb {
        background: rgba(212,160,23,0.2);
        border-radius: 4px;
      }

      /* Section */
      .settings-section {
        background: rgba(0,0,0,0.25);
        border: 1px solid rgba(212,160,23,0.1);
        border-radius: var(--radius-md);
        margin-bottom: 14px;
        padding: 14px;
        backdrop-filter: blur(4px);
      }
      .settings-section-header {
        display: flex;
        align-items: center;
        gap: 8px;
        font-size: 1rem;
        font-weight: 700;
        color: var(--gold);
        margin-bottom: 12px;
        letter-spacing: 0.06em;
      }
      .settings-section-icon {
        font-size: 1.1rem;
        opacity: 0.7;
      }

      /* Row */
      .settings-row {
        display: flex;
        align-items: center;
        justify-content: space-between;
        padding: 10px 0;
        border-bottom: 1px solid rgba(255,255,255,0.04);
      }
      .settings-row:last-child {
        border-bottom: none;
      }
      .settings-row-label {
        font-size: 0.9rem;
        color: var(--text-primary);
        flex-shrink: 0;
      }
      .settings-row-controls {
        display: flex;
        align-items: center;
        gap: 10px;
      }

      /* Toggle switch */
      .settings-toggle {
        display: flex;
        align-items: center;
        gap: 8px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        font-family: var(--font-main);
      }
      .settings-toggle-track {
        display: block;
        width: 44px;
        height: 24px;
        border-radius: 12px;
        background: rgba(255,255,255,0.1);
        border: 1px solid rgba(255,255,255,0.15);
        position: relative;
        transition: background 0.25s ease, border-color 0.25s ease;
      }
      .settings-toggle.active .settings-toggle-track {
        background: rgba(46,204,138,0.35);
        border-color: var(--jade);
      }
      .settings-toggle-thumb {
        display: block;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--text-dim);
        position: absolute;
        top: 2px;
        left: 2px;
        transition: transform 0.25s ease, background 0.25s ease;
      }
      .settings-toggle.active .settings-toggle-thumb {
        transform: translateX(20px);
        background: var(--jade);
        box-shadow: 0 0 8px rgba(46,204,138,0.4);
      }
      .settings-toggle-text {
        font-size: 0.95rem;
        color: var(--text-secondary);
        min-width: 28px;
      }

      /* Slider */
      .settings-slider {
        -webkit-appearance: none;
        appearance: none;
        width: 120px;
        height: 6px;
        border-radius: 3px;
        background: rgba(255,255,255,0.1);
        outline: none;
        cursor: pointer;
      }
      .settings-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--gold);
        cursor: pointer;
        box-shadow: 0 0 6px rgba(212,160,23,0.4);
        transition: transform 0.15s ease;
      }
      .settings-slider::-webkit-slider-thumb:hover {
        transform: scale(1.2);
      }
      .settings-slider::-moz-range-thumb {
        width: 18px;
        height: 18px;
        border-radius: 50%;
        background: var(--gold);
        cursor: pointer;
        border: none;
      }
      .settings-slider-val {
        font-size: 0.95rem;
        color: var(--gold);
        min-width: 36px;
        text-align: right;
        font-weight: 600;
      }

      /* Readonly badge */
      .settings-readonly-badge {
        font-size: 0.95rem;
        color: var(--text-secondary);
        background: rgba(255,255,255,0.05);
        padding: 4px 12px;
        border-radius: 6px;
        border: 1px solid rgba(255,255,255,0.08);
      }

      /* Radio group (animation speed) */
      .settings-radio-group {
        display: flex;
        gap: 0;
        border-radius: 8px;
        overflow: hidden;
        border: 1px solid rgba(212,160,23,0.2);
      }
      .settings-radio {
        background: rgba(0,0,0,0.3);
        border: none;
        color: var(--text-secondary);
        padding: 6px 14px;
        font-size: 0.95rem;
        cursor: pointer;
        font-family: var(--font-main);
        transition: all 0.2s ease;
      }
      .settings-radio:not(:last-child) {
        border-right: 1px solid rgba(212,160,23,0.15);
      }
      .settings-radio.active {
        background: rgba(212,160,23,0.2);
        color: var(--gold);
        font-weight: 700;
      }
      .settings-radio:hover:not(.active) {
        background: rgba(212,160,23,0.08);
      }

      /* Profile card */
      .settings-profile-card {
        background: linear-gradient(135deg, rgba(212,160,23,0.08) 0%, rgba(46,204,138,0.05) 100%);
        border: 1px solid rgba(212,160,23,0.15);
        border-radius: 8px;
        padding: 12px 16px;
        margin-bottom: 10px;
      }
      .settings-profile-name {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--gold);
        margin-bottom: 2px;
      }
      .settings-profile-info {
        font-size: 0.95rem;
        color: var(--text-secondary);
      }

      /* Danger buttons */
      .settings-danger-btn {
        background: rgba(214,48,49,0.15) !important;
        border-color: rgba(214,48,49,0.3) !important;
        color: #e74c3c !important;
        font-size: 0.8rem !important;
      }
      .settings-danger-btn:hover {
        background: rgba(214,48,49,0.25) !important;
      }

      /* Confirmation area */
      .settings-confirm {
        background: rgba(214,48,49,0.08);
        border: 1px solid rgba(214,48,49,0.2);
        border-radius: 8px;
        padding: 14px;
        margin: 8px 0;
        animation: settings-confirm-in 0.3s ease;
      }
      @keyframes settings-confirm-in {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
      .settings-confirm p {
        font-size: 0.85rem;
        color: #e74c3c;
        margin-bottom: 10px;
        line-height: 1.5;
      }
      .settings-confirm input {
        background: rgba(0,0,0,0.4);
        border: 1px solid rgba(214,48,49,0.3);
        border-radius: 6px;
        padding: 8px 12px;
        color: var(--text-primary);
        font-size: 0.9rem;
        font-family: var(--font-main);
        width: 100%;
        margin-bottom: 10px;
        outline: none;
      }
      .settings-confirm input:focus {
        border-color: rgba(214,48,49,0.6);
      }
      .settings-confirm-actions {
        display: flex;
        gap: 8px;
        justify-content: flex-end;
      }
      .settings-confirm .btn-cancel {
        background: rgba(255,255,255,0.08);
        border: 1px solid rgba(255,255,255,0.15);
        color: var(--text-secondary);
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 0.95rem;
        cursor: pointer;
        font-family: var(--font-main);
      }
      .settings-confirm .btn-confirm-danger {
        background: rgba(214,48,49,0.3);
        border: 1px solid rgba(214,48,49,0.5);
        color: #ff6b6b;
        padding: 6px 14px;
        border-radius: 6px;
        font-size: 0.95rem;
        cursor: pointer;
        font-weight: 700;
        font-family: var(--font-main);
      }

      /* About */
      .settings-about {
        text-align: center;
        padding: 12px 0 4px;
      }
      .settings-about-title {
        font-size: 1.1rem;
        font-weight: 700;
        color: var(--gold);
        letter-spacing: 0.1em;
        margin-bottom: 4px;
      }
      .settings-about-version {
        font-size: 0.95rem;
        color: var(--text-secondary);
        margin-bottom: 8px;
      }
      .settings-about-credit {
        font-size: 0.85rem;
        color: var(--text-secondary);
        line-height: 1.6;
      }

      /* Responsive */
      @media (max-width: 480px) {
        .settings-slider { width: 80px; }
        .settings-row { flex-wrap: wrap; gap: 6px; }
        .settings-row-controls { width: 100%; justify-content: flex-end; }
      }
    </style>
  `;

  // ── Event Wiring ────────────────────────────────────────────────────────────
  setTimeout(() => {
    // Back button
    div.querySelector('#btn-settings-back')?.addEventListener('click', () => {
      showScreen(returnTo);
    });

    // ── Music toggle ──
    const toggleMusicBtn = div.querySelector('#toggle-music');
    toggleMusicBtn?.addEventListener('click', () => {
      toggleMusic();
      const on = isMusicEnabled();
      toggleMusicBtn.classList.toggle('active', on);
      toggleMusicBtn.querySelector('.settings-toggle-text').textContent = on ? '开' : '关';
    });

    // ── SFX toggle ──
    const toggleSfxBtn = div.querySelector('#toggle-sfx');
    toggleSfxBtn?.addEventListener('click', () => {
      toggleSFX();
      const on = isSFXEnabled();
      toggleSfxBtn.classList.toggle('active', on);
      toggleSfxBtn.querySelector('.settings-toggle-text').textContent = on ? '开' : '关';
    });

    // ── Music volume slider ──
    const sliderMusic = div.querySelector('#slider-music');
    const valMusic = div.querySelector('#val-music');
    sliderMusic?.addEventListener('input', () => {
      const v = parseInt(sliderMusic.value);
      setMusicVolume(v / 100);
      valMusic.textContent = v + '%';
    });

    // ── SFX volume slider ──
    const sliderSfx = div.querySelector('#slider-sfx');
    const valSfx = div.querySelector('#val-sfx');
    sliderSfx?.addEventListener('input', () => {
      const v = parseInt(sliderSfx.value);
      setSfxVolume(v / 100);
      valSfx.textContent = v + '%';
    });

    // ── Timer toggle ──
    const toggleTimerBtn = div.querySelector('#toggle-timer');
    toggleTimerBtn?.addEventListener('click', () => {
      const s = getSettings();
      s.showTimer = !s.showTimer;
      saveSettings(s);
      toggleTimerBtn.classList.toggle('active', s.showTimer);
      toggleTimerBtn.querySelector('.settings-toggle-text').textContent = s.showTimer ? '显示' : '隐藏';
    });

    // ── Animation speed radio ──
    const animGroup = div.querySelector('#anim-speed');
    animGroup?.querySelectorAll('.settings-radio').forEach(btn => {
      btn.addEventListener('click', () => {
        animGroup.querySelectorAll('.settings-radio').forEach(b => b.classList.remove('active'));
        btn.classList.add('active');
        const s = getSettings();
        s.animationSpeed = btn.dataset.value;
        saveSettings(s);
      });
    });

    // ── Reset Progress (double confirmation) ──
    let resetStep = 0;
    const btnReset = div.querySelector('#btn-reset-progress');
    const resetArea = div.querySelector('#reset-confirm-area');
    btnReset?.addEventListener('click', () => {
      if (resetStep === 0) {
        resetStep = 1;
        resetArea.style.display = 'block';
        resetArea.innerHTML = `
          <div class="settings-confirm">
            <p>确定要重置所有进度吗？此操作不可撤销。<br>你的等级、装备和成就都将被清除。</p>
            <div class="settings-confirm-actions">
              <button class="btn-cancel" id="btn-reset-cancel">取消</button>
              <button class="btn-confirm-danger" id="btn-reset-final">确认重置</button>
            </div>
          </div>`;
        resetArea.querySelector('#btn-reset-cancel').addEventListener('click', () => {
          resetStep = 0;
          resetArea.style.display = 'none';
        });
        resetArea.querySelector('#btn-reset-final').addEventListener('click', () => {
          // Perform reset — keep name and tier, reset everything else
          if (profile) {
            const name = profile.name;
            const tier = profile.tier;
            const idx = gameState.activeProfileIndex;
            gameState.deleteProfile(idx);
            gameState.createProfile(name, tier);
            gameState.save();
          }
          resetStep = 0;
          resetArea.innerHTML = `
            <div class="settings-confirm" style="border-color:rgba(46,204,138,0.3);background:rgba(46,204,138,0.08);">
              <p style="color:var(--jade);">进度已重置。即将返回主菜单……</p>
            </div>`;
          setTimeout(() => showScreen('title'), 1500);
        });
      }
    });

    // ── Clear Save Data (triple confirmation — type "删除") ──
    let clearStep = 0;
    const btnClear = div.querySelector('#btn-clear-save');
    const clearArea = div.querySelector('#clear-confirm-area');
    btnClear?.addEventListener('click', () => {
      if (clearStep === 0) {
        clearStep = 1;
        clearArea.style.display = 'block';
        clearArea.innerHTML = `
          <div class="settings-confirm">
            <p>警告：这将清除所有存档数据，包括所有角色档案。<br>此操作无法撤销！</p>
            <div class="settings-confirm-actions">
              <button class="btn-cancel" id="btn-clear-cancel1">取消</button>
              <button class="btn-confirm-danger" id="btn-clear-next">继续</button>
            </div>
          </div>`;
        clearArea.querySelector('#btn-clear-cancel1').addEventListener('click', () => {
          clearStep = 0;
          clearArea.style.display = 'none';
        });
        clearArea.querySelector('#btn-clear-next').addEventListener('click', () => {
          clearStep = 2;
          clearArea.innerHTML = `
            <div class="settings-confirm">
              <p>最终确认：请在下方输入 <strong style="color:#ff6b6b;font-size:1.1em;">删除</strong> 以确认清除所有数据。</p>
              <input type="text" id="input-clear-confirm" placeholder="请输入：删除" autocomplete="off" />
              <div class="settings-confirm-actions">
                <button class="btn-cancel" id="btn-clear-cancel2">取消</button>
                <button class="btn-confirm-danger" id="btn-clear-final" style="opacity:0.4;pointer-events:none;">确认清除</button>
              </div>
            </div>`;
          const inputEl = clearArea.querySelector('#input-clear-confirm');
          const finalBtn = clearArea.querySelector('#btn-clear-final');
          const cancelBtn2 = clearArea.querySelector('#btn-clear-cancel2');

          inputEl.addEventListener('input', () => {
            const match = inputEl.value.trim() === '删除';
            finalBtn.style.opacity = match ? '1' : '0.4';
            finalBtn.style.pointerEvents = match ? 'auto' : 'none';
          });
          cancelBtn2.addEventListener('click', () => {
            clearStep = 0;
            clearArea.style.display = 'none';
          });
          finalBtn.addEventListener('click', () => {
            if (inputEl.value.trim() === '删除') {
              localStorage.removeItem('wenzi-xia-save');
              localStorage.removeItem(SETTINGS_KEY);
              localStorage.removeItem('wenzi-xia-volume');
              clearArea.innerHTML = `
                <div class="settings-confirm" style="border-color:rgba(214,48,49,0.5);background:rgba(214,48,49,0.15);">
                  <p style="color:#ff6b6b;">所有数据已清除。页面即将刷新……</p>
                </div>`;
              setTimeout(() => location.reload(), 1500);
            }
          });
          // Focus the input
          setTimeout(() => inputEl.focus(), 100);
        });
      }
    });

    // ── Export Save ──
    div.querySelector('#btn-export-save')?.addEventListener('click', () => {
      try {
        const saveData = localStorage.getItem('wenzi-xia-save');
        if (!saveData) {
          window.showToast?.('没有可导出的存档数据', 'error');
          return;
        }
        const blob = new Blob([saveData], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        const date = new Date().toISOString().slice(0, 10);
        a.href = url;
        a.download = `wenzi-xia-save-${date}.json`;
        a.style.display = 'none';
        document.body.appendChild(a);
        a.click();
        setTimeout(() => {
          document.body.removeChild(a);
          URL.revokeObjectURL(url);
        }, 100);
        window.showToast?.('存档已导出', 'success');
      } catch (e) {
        window.showToast?.('导出失败: ' + e.message, 'error');
      }
    });

    // ── Import Save ──
    const btnImport = div.querySelector('#btn-import-save');
    const inputImport = div.querySelector('#input-import-save');
    const importArea = div.querySelector('#import-confirm-area');

    btnImport?.addEventListener('click', () => {
      inputImport?.click();
    });

    inputImport?.addEventListener('change', (e) => {
      const file = e.target.files?.[0];
      if (!file) return;

      const reader = new FileReader();
      reader.onload = (evt) => {
        try {
          const text = evt.target.result;
          const data = JSON.parse(text);

          // Validate: must have a profiles array
          if (!data.profiles || !Array.isArray(data.profiles)) {
            window.showToast?.('无效的存档文件：缺少 profiles 数据', 'error');
            inputImport.value = '';
            return;
          }

          // Show confirmation dialog
          importArea.style.display = 'block';
          importArea.innerHTML = `
            <div class="settings-confirm" style="border-color:rgba(212,160,23,0.3);background:rgba(212,160,23,0.06);">
              <p style="color:var(--gold);">导入存档将覆盖当前进度。确定继续吗？<br>
                <span style="font-size:0.95rem;color:var(--text-dim);">文件包含 ${data.profiles.length} 个角色档案</span>
              </p>
              <div class="settings-confirm-actions">
                <button class="btn-cancel" id="btn-import-cancel">取消</button>
                <button class="btn-confirm-danger" id="btn-import-confirm" style="background:rgba(46,204,138,0.2);border-color:rgba(46,204,138,0.4);color:var(--jade);">确认导入</button>
              </div>
            </div>`;

          importArea.querySelector('#btn-import-cancel').addEventListener('click', () => {
            importArea.style.display = 'none';
            inputImport.value = '';
          });

          importArea.querySelector('#btn-import-confirm').addEventListener('click', () => {
            localStorage.setItem('wenzi-xia-save', text);
            importArea.innerHTML = `
              <div class="settings-confirm" style="border-color:rgba(46,204,138,0.3);background:rgba(46,204,138,0.08);">
                <p style="color:var(--jade);">存档已导入。页面即将刷新……</p>
              </div>`;
            setTimeout(() => location.reload(), 1500);
          });

        } catch (err) {
          window.showToast?.('无法解析文件：不是有效的 JSON', 'error');
          inputImport.value = '';
        }
      };
      reader.readAsText(file);
    });

    // ── Copy Save to Clipboard (base64) ──
    div.querySelector('#btn-copy-save')?.addEventListener('click', async () => {
      try {
        const saveData = localStorage.getItem('wenzi-xia-save');
        if (!saveData) {
          window.showToast?.('没有可复制的存档数据', 'error');
          return;
        }
        const encoded = btoa(unescape(encodeURIComponent(saveData)));
        await navigator.clipboard.writeText(encoded);
        window.showToast?.('已复制！', 'success');
      } catch (e) {
        window.showToast?.('复制失败: ' + e.message, 'error');
      }
    });

    // ── Paste Save from Clipboard (base64) ──
    div.querySelector('#btn-paste-save')?.addEventListener('click', () => {
      const input = div.querySelector('#input-paste-save');
      const code = input?.value?.trim();
      if (!code) {
        window.showToast?.('请先粘贴存档代码', 'error');
        return;
      }
      try {
        const decoded = decodeURIComponent(escape(atob(code)));
        const data = JSON.parse(decoded);
        if (!data.profiles || !Array.isArray(data.profiles)) {
          window.showToast?.('无效的存档代码：缺少 profiles 数据', 'error');
          return;
        }
        if (confirm('导入存档将覆盖当前进度。确定继续吗？')) {
          localStorage.setItem('wenzi-xia-save', decoded);
          window.showToast?.('存档已导入，即将刷新……', 'success');
          setTimeout(() => location.reload(), 1200);
        }
      } catch (e) {
        window.showToast?.('无效的存档代码：无法解码', 'error');
      }
    });

  }, 0);

  return div;
}

registerScreen('settings', renderSettings);
