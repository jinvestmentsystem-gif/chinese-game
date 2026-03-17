// js/toast.js — Reusable toast notification system for 文字侠
// Usage: showToast('成就解锁！初出茅庐', { type: 'achievement', duration: 3000 })

const TOAST_TYPES = {
  achievement: { icon: '\u{1F3C6}', color: '#d4a017', bg: 'rgba(212,160,23,0.12)' },
  levelup:     { icon: '\u2B06\uFE0F', color: '#2ecc8a', bg: 'rgba(46,204,138,0.12)' },
  gold:        { icon: '\u{1F4B0}', color: '#f0c040', bg: 'rgba(240,192,64,0.12)' },
  item:        { icon: '\u{1F4E6}', color: '#8e44ad', bg: 'rgba(142,68,173,0.12)' },
  talent:      { icon: '\u2B50', color: '#a855f7', bg: 'rgba(168,85,247,0.12)' },
  info:        { icon: '\u2139\uFE0F', color: '#9a97b8', bg: 'rgba(154,151,184,0.12)' },
  warning:     { icon: '\u26A0\uFE0F', color: '#e67e22', bg: 'rgba(230,126,34,0.12)' },
  error:       { icon: '\u274C', color: '#e74c3c', bg: 'rgba(231,76,60,0.12)' },
  review:      { icon: '\u{1F4DD}', color: '#6c5ce7', bg: 'rgba(108,92,231,0.12)' },
  mastered:    { icon: '\u2705', color: '#27ae60', bg: 'rgba(39,174,96,0.12)' },
  title:       { icon: '\u{1F3C5}', color: '#2ecc8a', bg: 'rgba(39,174,96,0.12)' },
  forge:       { icon: '\u2692\uFE0F', color: '#e67e22', bg: 'rgba(230,126,34,0.12)' },
};

const MAX_VISIBLE = 3;
const activeToasts = [];
let styleInjected = false;

function injectStyles() {
  if (styleInjected) return;
  styleInjected = true;
  const style = document.createElement('style');
  style.id = 'toast-system-styles';
  style.textContent = `
    .toast-container {
      position: fixed;
      top: 16px;
      right: 16px;
      z-index: 2000;
      display: flex;
      flex-direction: column;
      gap: 10px;
      pointer-events: none;
      max-width: 360px;
      width: calc(100% - 32px);
    }
    .toast-item {
      pointer-events: auto;
      display: flex;
      align-items: flex-start;
      gap: 10px;
      padding: 12px 16px;
      border-radius: 12px;
      backdrop-filter: blur(16px);
      -webkit-backdrop-filter: blur(16px);
      border: 1px solid rgba(255,255,255,0.08);
      box-shadow: 0 4px 24px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.04) inset;
      cursor: pointer;
      position: relative;
      overflow: hidden;
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1),
                  opacity 0.3s ease-out;
    }
    .toast-item.toast-visible {
      transform: translateX(0);
      opacity: 1;
    }
    .toast-item.toast-exit {
      transform: translateX(120%);
      opacity: 0;
      transition: transform 0.35s cubic-bezier(0.6, -0.28, 0.735, 0.045),
                  opacity 0.25s ease-in;
    }
    .toast-icon {
      font-size: 1.4rem;
      line-height: 1;
      flex-shrink: 0;
      margin-top: 1px;
    }
    .toast-body {
      flex: 1;
      min-width: 0;
    }
    .toast-message {
      font-size: 0.92rem;
      font-weight: 600;
      line-height: 1.3;
      color: #fff;
    }
    .toast-sub {
      font-size: 0.78rem;
      color: rgba(255,255,255,0.55);
      margin-top: 3px;
      line-height: 1.3;
    }
    .toast-progress {
      position: absolute;
      bottom: 0;
      left: 0;
      height: 3px;
      border-radius: 0 0 12px 12px;
      transition: width linear;
    }
    @media (max-width: 480px) {
      .toast-container {
        top: 8px;
        right: 8px;
        max-width: calc(100% - 16px);
        width: calc(100% - 16px);
      }
      .toast-item {
        padding: 10px 12px;
      }
    }
  `;
  document.head.appendChild(style);
}

function getContainer() {
  let container = document.querySelector('.toast-container');
  if (!container) {
    container = document.createElement('div');
    container.className = 'toast-container';
    document.body.appendChild(container);
  }
  return container;
}

function removeToast(toastEl, toastObj) {
  toastEl.classList.remove('toast-visible');
  toastEl.classList.add('toast-exit');
  const idx = activeToasts.indexOf(toastObj);
  if (idx !== -1) activeToasts.splice(idx, 1);
  setTimeout(() => {
    if (toastEl.parentNode) toastEl.parentNode.removeChild(toastEl);
  }, 400);
}

export function showToast(message, options = {}) {
  injectStyles();

  const {
    type = 'info',
    duration = 3000,
    onClick = null,
    sub = null,
  } = options;

  const config = TOAST_TYPES[type] || TOAST_TYPES.info;
  const container = getContainer();

  // Enforce max visible — remove oldest if at capacity
  while (activeToasts.length >= MAX_VISIBLE) {
    const oldest = activeToasts[0];
    if (oldest && oldest.el) {
      clearTimeout(oldest.timer);
      removeToast(oldest.el, oldest);
    } else {
      activeToasts.shift();
    }
  }

  // Build toast element
  const toast = document.createElement('div');
  toast.className = 'toast-item';
  toast.style.background = config.bg;
  toast.style.borderColor = `${config.color}33`;

  const iconEl = document.createElement('span');
  iconEl.className = 'toast-icon';
  iconEl.textContent = config.icon;

  const bodyEl = document.createElement('div');
  bodyEl.className = 'toast-body';

  const msgEl = document.createElement('div');
  msgEl.className = 'toast-message';
  msgEl.style.color = config.color;
  msgEl.textContent = message;
  bodyEl.appendChild(msgEl);

  if (sub) {
    const subEl = document.createElement('div');
    subEl.className = 'toast-sub';
    subEl.textContent = sub;
    bodyEl.appendChild(subEl);
  }

  // Progress bar
  const progress = document.createElement('div');
  progress.className = 'toast-progress';
  progress.style.background = config.color;
  progress.style.width = '100%';
  progress.style.transitionDuration = `${duration}ms`;

  toast.appendChild(iconEl);
  toast.appendChild(bodyEl);
  toast.appendChild(progress);

  // Insert at top (newest on top)
  if (container.firstChild) {
    container.insertBefore(toast, container.firstChild);
  } else {
    container.appendChild(toast);
  }

  // Track this toast
  const toastObj = { el: toast, timer: null };
  activeToasts.push(toastObj);

  // Trigger slide-in on next frame
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      toast.classList.add('toast-visible');
      // Start progress bar countdown
      progress.style.width = '0%';
    });
  });

  // Auto-dismiss
  toastObj.timer = setTimeout(() => {
    removeToast(toast, toastObj);
  }, duration);

  // Click to dismiss (or custom onClick)
  toast.addEventListener('click', () => {
    clearTimeout(toastObj.timer);
    if (onClick) onClick();
    removeToast(toast, toastObj);
  });

  return toast;
}
