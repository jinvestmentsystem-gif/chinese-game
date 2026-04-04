// js/error-handler.js — Global error boundary + save indicator + toast system
// Loaded as a regular (non-module) script BEFORE any module scripts
// so it catches module loading errors and provides global utilities.

(function () {
  'use strict';

  // ── Toast notification system ──────────────────────────────────────────────
  // Provides a lightweight toast accessible from anywhere via window.showToast()

  const toastStyles = document.createElement('style');
  toastStyles.textContent = `
    .wz-toast-container {
      position: fixed;
      top: 16px;
      left: 50%;
      transform: translateX(-50%);
      z-index: 99999;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 8px;
      pointer-events: none;
    }
    .wz-toast {
      background: rgba(20, 20, 30, 0.92);
      border: 1px solid rgba(212,160,23,0.3);
      color: #eee;
      padding: 10px 20px;
      border-radius: 8px;
      font-size: 0.9rem;
      font-family: 'Noto Sans SC', sans-serif;
      backdrop-filter: blur(8px);
      box-shadow: 0 4px 20px rgba(0,0,0,0.4);
      animation: wz-toast-in 0.3s ease forwards;
      pointer-events: auto;
    }
    .wz-toast.wz-toast-success { border-color: rgba(46,204,138,0.4); }
    .wz-toast.wz-toast-error   { border-color: rgba(214,48,49,0.4); color: #ff6b6b; }
    .wz-toast.wz-toast-out {
      animation: wz-toast-out 0.3s ease forwards;
    }
    @keyframes wz-toast-in {
      from { opacity: 0; transform: translateY(-12px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes wz-toast-out {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(-12px); }
    }

    /* Save indicator */
    .wz-save-indicator {
      position: fixed;
      bottom: 16px;
      right: 16px;
      z-index: 99998;
      font-size: 1.4rem;
      opacity: 0;
      transition: opacity 0.2s ease;
      pointer-events: none;
      filter: drop-shadow(0 0 6px rgba(212,160,23,0.4));
    }
    .wz-save-indicator.visible {
      opacity: 1;
      animation: wz-save-pulse 0.6s ease;
    }
    @keyframes wz-save-pulse {
      0%   { transform: scale(1); }
      30%  { transform: scale(1.25); }
      100% { transform: scale(1); }
    }
  `;
  document.head.appendChild(toastStyles);

  // Toast container
  let toastContainer = null;
  function getToastContainer() {
    if (!toastContainer || !toastContainer.parentNode) {
      toastContainer = document.createElement('div');
      toastContainer.className = 'wz-toast-container';
      document.body.appendChild(toastContainer);
    }
    return toastContainer;
  }

  /**
   * Show a toast notification.
   * @param {string} message - Text to display
   * @param {'info'|'success'|'error'} type - Toast style
   * @param {number} duration - Display time in ms
   */
  window.showToast = function (message, typeOrOpts, duration) {
    // Support both positional (message, type, duration) and options object (message, { type, duration })
    var type = 'info';
    if (typeof typeOrOpts === 'object' && typeOrOpts !== null) {
      type = typeOrOpts.type || 'info';
      duration = typeOrOpts.duration || 2500;
    } else {
      type = typeOrOpts || 'info';
    }
    duration = duration || 2500;
    var container = getToastContainer();
    var el = document.createElement('div');
    el.className = 'wz-toast' + (type !== 'info' ? ' wz-toast-' + type : '');
    el.textContent = message;
    container.appendChild(el);
    setTimeout(function () {
      el.classList.add('wz-toast-out');
      setTimeout(function () { el.remove(); }, 300);
    }, duration);
  };

  // ── Save indicator ─────────────────────────────────────────────────────────
  var saveIndicator = null;
  var saveTimeout = null;

  function ensureSaveIndicator() {
    if (!saveIndicator || !saveIndicator.parentNode) {
      saveIndicator = document.createElement('div');
      saveIndicator.className = 'wz-save-indicator';
      saveIndicator.setAttribute('aria-hidden', 'true');
      saveIndicator.textContent = '\uD83D\uDCBE'; // floppy disk emoji
      document.body.appendChild(saveIndicator);
    }
    return saveIndicator;
  }

  window.addEventListener('game-saved', function () {
    var el = ensureSaveIndicator();
    el.classList.remove('visible');
    // Force reflow to restart animation
    void el.offsetWidth;
    el.classList.add('visible');
    clearTimeout(saveTimeout);
    saveTimeout = setTimeout(function () {
      el.classList.remove('visible');
    }, 1200);
  });

  // ── Error boundary ─────────────────────────────────────────────────────────

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function showErrorScreen(message) {
    var root = document.getElementById('game-root');
    if (!root) return;

    root.innerHTML =
      '<div style="' +
        'display:flex;align-items:center;justify-content:center;' +
        'width:100%;height:100%;padding:24px;box-sizing:border-box;' +
      '">' +
        '<div style="' +
          'background:rgba(15,15,25,0.95);' +
          'border:1px solid rgba(214,48,49,0.3);' +
          'border-radius:12px;' +
          'padding:32px 28px;' +
          'max-width:420px;' +
          'width:100%;' +
          'text-align:center;' +
          'box-shadow:0 8px 32px rgba(0,0,0,0.5);' +
          'backdrop-filter:blur(8px);' +
          'font-family:Noto Sans SC,sans-serif;' +
        '">' +
          '<h2 style="color:#e74c3c;margin:0 0 12px;font-size:1.3rem;">\u51FA\u4E86\u70B9\u95EE\u9898</h2>' +
          '<p style="color:#aaa;font-size:0.9rem;margin:0 0 20px;line-height:1.6;word-break:break-word;">' +
            escapeHtml(message) +
          '</p>' +
          '<div style="display:flex;flex-wrap:wrap;gap:12px;justify-content:center;margin-top:20px;">' +
            '<button onclick="try{window.__errorRecovery&&window.__errorRecovery()}catch(e){location.reload()}" style="' +
              'background:rgba(46,204,138,0.15);border:1px solid rgba(46,204,138,0.4);' +
              'color:#2ecc8a;padding:10px 20px;border-radius:8px;font-size:0.9rem;' +
              'cursor:pointer;font-family:inherit;font-weight:700;' +
            '">\u8FD4\u56DE\u5730\u56FE</button>' +
            '<button onclick="location.reload()" style="' +
              'background:rgba(212,160,23,0.2);border:1px solid rgba(212,160,23,0.4);' +
              'color:#d4a017;padding:10px 20px;border-radius:8px;font-size:0.9rem;' +
              'cursor:pointer;font-family:inherit;font-weight:700;' +
            '">\u5237\u65B0\u9875\u9762</button>' +
            '<button onclick="localStorage.clear();location.reload();" style="' +
              'background:rgba(255,255,255,0.06);border:1px solid rgba(255,255,255,0.15);' +
              'color:#aaa;padding:10px 20px;border-radius:8px;font-size:0.9rem;' +
              'cursor:pointer;font-family:inherit;' +
            '">\u91CD\u7F6E\u6E38\u620F</button>' +
          '</div>' +
          '<p style="font-size:0.75rem;color:#666;margin-top:16px;">' +
            '\u5982\u679C\u95EE\u9898\u6301\u7EED\u51FA\u73B0\uFF0C\u8BF7\u5BFC\u51FA\u5B58\u6863\u540E\u8054\u7CFB\u5F00\u53D1\u8005' +
          '</p>' +
        '</div>' +
      '</div>';
  }

  // Prevent showing multiple error screens for cascading errors
  var errorShown = false;
  // Expose reset for recovery (called by __errorRecovery in main.js)
  window.__resetErrorState = function() { errorShown = false; };

  window.addEventListener('error', function (event) {
    if (errorShown) return;
    errorShown = true;
    showErrorScreen(event.error && event.error.message ? event.error.message : 'Unknown error');
  });

  window.addEventListener('unhandledrejection', function (event) {
    if (errorShown) return;
    errorShown = true;
    showErrorScreen(event.reason && event.reason.message ? event.reason.message : 'Async error');
  });

})();
