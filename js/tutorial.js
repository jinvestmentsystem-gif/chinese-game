// js/tutorial.js — Tooltip-based tutorial/onboarding system for first-time players
import { gameState } from './state.js';

// ── Tutorial Content Definitions ─────────────────────────────────────────────
const TUTORIALS = {
  tutorial_worldmap: {
    text: '欢迎来到文定乾坤的世界！点击章节开始你的冒险。',
    defaultTarget: '.era-node',
    defaultPosition: 'bottom',
  },
  tutorial_combat: {
    text: '答对题目可以攻击敌人！注意计时器——你的速度属性会增加答题时间。',
    defaultTarget: '.combat-option',
    defaultPosition: 'top',
  },
  tutorial_levelup: {
    text: '升级了！分配属性点让你更强大。每2级还能获得天赋点！',
    defaultTarget: '.stat-plus',
    defaultPosition: 'top',
  },
  tutorial_talents: {
    text: '天赋树解锁！选择你的战斗风格——攻击、防御、速度、智慧还是财运？',
    defaultTarget: '.talent-node',
    defaultPosition: 'top',
  },
  tutorial_shop: {
    text: '用金币购买装备来增强你的属性。集齐同阶装备可以激活套装效果！',
    defaultTarget: '.shop-buy-btn',
    defaultPosition: 'top',
  },
  tutorial_boss: {
    text: 'BOSS战！BOSS有特殊能力——仔细阅读它的技能描述。答错会受到更多伤害！',
    defaultTarget: '.boss-ability-banner',
    defaultPosition: 'bottom',
  },
  // ── Contextual engagement tips (shown once per trigger) ──
  tip_first_wrong: { text: '别担心！答错的题目会进入复习队列，帮你巩固记忆。', defaultPosition: 'top' },
  tip_first_chengyu: { text: '你收集了一个成语！每集齐3个会获得永久属性加成。', defaultPosition: 'bottom' },
  tip_first_equip: { text: '你获得了新装备！去背包中装备它来提升实力。', defaultPosition: 'bottom' },
};

// ── Inject CSS once ──────────────────────────────────────────────────────────
let styleInjected = false;
function injectTutorialStyles() {
  if (styleInjected) return;
  styleInjected = true;

  const style = document.createElement('style');
  style.id = 'tutorial-tooltip-styles';
  style.textContent = `
    @keyframes tutorial-fade-in {
      from { opacity: 0; transform: translateY(8px); }
      to   { opacity: 1; transform: translateY(0); }
    }
    @keyframes tutorial-fade-out {
      from { opacity: 1; transform: translateY(0); }
      to   { opacity: 0; transform: translateY(8px); }
    }
    .tutorial-overlay {
      position: absolute;
      inset: 0;
      z-index: 9998;
      pointer-events: none;
    }
    .tutorial-tooltip {
      position: absolute;
      z-index: 9999;
      max-width: 340px;
      min-width: 200px;
      background: rgba(10, 8, 24, 0.92);
      backdrop-filter: blur(12px);
      border: 1.5px solid rgba(212, 160, 23, 0.6);
      border-radius: 12px;
      padding: 18px 20px 14px;
      box-shadow:
        0 0 24px rgba(212, 160, 23, 0.15),
        0 8px 32px rgba(0, 0, 0, 0.5);
      animation: tutorial-fade-in 0.35s ease-out forwards;
      pointer-events: auto;
    }
    .tutorial-tooltip.tutorial-dismissing {
      animation: tutorial-fade-out 0.25s ease-in forwards;
    }
    .tutorial-tooltip-text {
      color: #e8e0d0;
      font-size: 0.92rem;
      line-height: 1.55;
      margin-bottom: 14px;
    }
    .tutorial-dismiss-btn {
      display: block;
      margin: 0 auto;
      padding: 6px 22px;
      background: linear-gradient(135deg, #d4a017, #b8860b);
      color: #1a1035;
      border: none;
      border-radius: 6px;
      font-size: 0.88rem;
      font-weight: 700;
      cursor: pointer;
      transition: background 0.2s, transform 0.15s;
    }
    .tutorial-dismiss-btn:hover {
      background: linear-gradient(135deg, #f0c040, #d4a017);
      transform: scale(1.04);
    }
    .tutorial-arrow {
      position: absolute;
      width: 0;
      height: 0;
      border: 8px solid transparent;
    }
    .tutorial-arrow-top {
      bottom: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-bottom-color: rgba(212, 160, 23, 0.6);
    }
    .tutorial-arrow-bottom {
      top: 100%;
      left: 50%;
      transform: translateX(-50%);
      border-top-color: rgba(212, 160, 23, 0.6);
    }
    .tutorial-arrow-left {
      right: 100%;
      top: 50%;
      transform: translateY(-50%);
      border-right-color: rgba(212, 160, 23, 0.6);
    }
    .tutorial-arrow-right {
      left: 100%;
      top: 50%;
      transform: translateY(-50%);
      border-left-color: rgba(212, 160, 23, 0.6);
    }
  `;
  document.head.appendChild(style);
}

// ── Position Calculation ─────────────────────────────────────────────────────

/**
 * Compute the tooltip position relative to the container, pointing at the
 * target element. Auto-adjusts to avoid clipping off-screen.
 */
function computePosition(container, targetEl, preferredPos) {
  const containerRect = container.getBoundingClientRect();
  const targetRect = targetEl.getBoundingClientRect();

  // Target center relative to container
  const tCenterX = targetRect.left - containerRect.left + targetRect.width / 2;
  const tCenterY = targetRect.top - containerRect.top + targetRect.height / 2;
  const tTop = targetRect.top - containerRect.top;
  const tBottom = tTop + targetRect.height;

  const tooltipWidth = 300;   // estimated
  const tooltipHeight = 120;  // estimated
  const gap = 14;

  let pos = preferredPos || 'bottom';
  let x, y;

  // Try preferred position; fall back if it would clip
  if (pos === 'bottom') {
    y = tBottom + gap;
    if (y + tooltipHeight > containerRect.height) pos = 'top';
  }
  if (pos === 'top') {
    y = tTop - gap - tooltipHeight;
    if (y < 0) pos = 'bottom';
  }

  // Final y
  if (pos === 'bottom') {
    y = tBottom + gap;
  } else {
    y = tTop - gap - tooltipHeight;
  }

  // Center horizontally on target, clamp to container
  x = tCenterX - tooltipWidth / 2;
  x = Math.max(12, Math.min(x, containerRect.width - tooltipWidth - 12));

  // Clamp y too
  y = Math.max(8, Math.min(y, containerRect.height - tooltipHeight - 8));

  return { x, y, arrowSide: pos === 'bottom' ? 'top' : 'bottom' };
}

// ── Core API ─────────────────────────────────────────────────────────────────

/**
 * Show a tutorial tooltip anchored near a target element inside `container`.
 *
 * @param {HTMLElement} container - The screen's root div (must have position:relative)
 * @param {string}      tutorialId - Unique key (e.g. 'tutorial_worldmap')
 * @param {object}      config
 * @param {string}      config.text          - Tooltip text (Chinese)
 * @param {string}     [config.targetSelector] - CSS selector for the anchor element
 * @param {string}     [config.position]     - 'top' | 'bottom' (default from TUTORIALS)
 * @param {Function}   [config.onDismiss]    - Callback after dismissal
 */
export function showTutorial(container, tutorialId, config = {}) {
  const profile = gameState.profile;
  if (!profile) return;

  // Already seen?
  if (profile.tutorialSeen && profile.tutorialSeen[tutorialId]) return;

  const def = TUTORIALS[tutorialId] || {};
  const text = config.text || def.text || '';
  const targetSelector = config.targetSelector || def.defaultTarget;
  const position = config.position || def.defaultPosition || 'bottom';

  if (!text) return;

  injectTutorialStyles();

  // Ensure container has relative positioning for absolute children
  const containerPos = getComputedStyle(container).position;
  if (containerPos === 'static') {
    container.style.position = 'relative';
  }

  // Small delay so the DOM is rendered and target elements exist
  setTimeout(() => {
    // Don't show duplicate if one is already on screen for this id
    if (container.querySelector(`[data-tutorial-id="${tutorialId}"]`)) return;

    // Find anchor target
    const targetEl = targetSelector ? container.querySelector(targetSelector) : null;

    // Build overlay (semi-transparent, non-blocking)
    const overlay = document.createElement('div');
    overlay.className = 'tutorial-overlay';
    overlay.dataset.tutorialId = tutorialId;

    // Build tooltip
    const tooltip = document.createElement('div');
    tooltip.className = 'tutorial-tooltip';

    let arrowSide = 'top'; // which side of the tooltip the arrow sits on
    if (targetEl) {
      const posInfo = computePosition(container, targetEl, position);
      tooltip.style.left = posInfo.x + 'px';
      tooltip.style.top = posInfo.y + 'px';
      arrowSide = posInfo.arrowSide;
    } else {
      // Fallback: center in container
      tooltip.style.left = '50%';
      tooltip.style.top = '40%';
      tooltip.style.transform = 'translate(-50%, -50%)';
    }

    // Arrow element
    const arrowClass = `tutorial-arrow tutorial-arrow-${arrowSide}`;

    tooltip.innerHTML = `
      <div class="${arrowClass}"></div>
      <div class="tutorial-tooltip-text">${text}</div>
      <button class="tutorial-dismiss-btn">知道了</button>
    `;

    overlay.appendChild(tooltip);
    container.appendChild(overlay);

    // Dismiss handler
    const dismissBtn = tooltip.querySelector('.tutorial-dismiss-btn');
    dismissBtn.addEventListener('click', () => {
      // Mark as seen
      if (!profile.tutorialSeen) profile.tutorialSeen = {};
      profile.tutorialSeen[tutorialId] = true;
      gameState.save();

      // Fade out
      tooltip.classList.add('tutorial-dismissing');
      setTimeout(() => {
        overlay.remove();
        if (config.onDismiss) config.onDismiss();
      }, 250);
    });
  }, 350);
}
