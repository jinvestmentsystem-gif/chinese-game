// js/screens/story.js — Cinematic narrative system
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';

// Story data for each narrative moment
const STORIES = {
  opening: {
    pages: [
      { text: "在很久很久以前，文字是天地间最强大的力量……" },
      { text: "仓颉造字，日月星辰为之震动。从此，人类拥有了记录思想、传承智慧的能力。" },
      { text: "然而，一股名为「墨暗」的黑暗力量正在苏醒。它侵蚀着古老的文字，扭曲经典的含义。" },
      { text: "唯有掌握文字力量的勇者——文字侠——才能拯救被墨暗吞噬的文明。" },
      { speaker: "神秘老者", text: "年轻人，我在你身上感受到了文字的力量。你，愿意成为新一代的文字侠吗？" },
    ],
    next: 'worldmap',
  },
  chapter1_intro: {
    pages: [
      { text: "第一章：文字起源" },
      { text: "传说中，仓颉受命于黄帝，仰观天象，俯察鸟兽之迹，创造了最初的文字。" },
      { text: "但墨暗的力量已经侵入了这片上古之地。文字的起源正在被扭曲……" },
      { text: "你必须穿越先秦时代，击败仓颉之影，恢复文字的本源。" },
    ],
    next: null,
  },
  chapter1_boss: {
    pages: [
      { speaker: "仓颉之影", text: "哈哈哈……又一个自以为能掌控文字的凡人。" },
      { speaker: "仓颉之影", text: "文字是我创造的！它的力量，本就属于我！" },
      { text: "仓颉之影化出无数古老的甲骨文字，向你袭来。你必须用你的文言功底击败它！" },
    ],
    next: null,
  },
  chapter2_intro: {
    pages: [
      { text: "第二章：史记风云" },
      { text: "汉代，司马迁以一己之力写下了「史家之绝唱」——《史记》。" },
      { text: "但墨暗派出了墨吏，一个被黑暗侵蚀的汉代文官，试图篡改历史的记录。" },
      { text: "你必须阅读和理解这些珍贵的史料，才能阻止历史被改写。" },
    ],
    next: null,
  },
  chapter2_boss: {
    pages: [
      { speaker: "墨吏", text: "历史？历史不过是胜者书写的谎言。" },
      { speaker: "墨吏", text: "我将重写《史记》，让墨暗的意志永载史册！" },
      { text: "墨吏挥动腐朽的竹简，扭曲的文字从中涌出。以你的史学之识，揭穿他的谎言！" },
    ],
    next: null,
  },
  chapter3_intro: {
    pages: [
      { text: "第三章：诗词盛世" },
      { text: "大唐盛世，诗人如繁星般璀璨。李白醉酒挥毫，杜甫忧国忧民。" },
      { text: "然而诗魔已经降临，它将诗句搅乱，让韵律崩塌，意境消散。" },
      { text: "以你的诗词修养，能否拨乱反正？" },
    ],
    next: null,
  },
  chapter3_boss: {
    pages: [
      { speaker: "诗魔", text: "哼，所谓诗词，不过是无病呻吟。" },
      { speaker: "诗魔", text: "我将打乱一切，让大唐的诗章化为乱码！" },
      { text: "诗魔召唤出残破的诗句碎片，向你倾泻而来。用你的诗词之力将其还原！" },
    ],
    next: null,
  },
  chapter4_intro: {
    pages: [
      { text: "第四章：词赋纵横" },
      { text: "宋代，词人们用婉约与豪放，书写着人生百态。" },
      { text: "词煞潜伏于词章之间，扭曲着词义，颠倒着典故。" },
      { text: "你需要深厚的文学功底才能识破它的伪装。" },
    ],
    next: null,
  },
  chapter4_boss: {
    pages: [
      { speaker: "词煞", text: "婉约？豪放？在我眼中，不过是笑话。" },
      { speaker: "词煞", text: "词中的深意，你这凡人又岂能领悟！" },
      { text: "词煞将宋词化为迷阵，意象颠倒，典故混乱。以你的文学素养，穿破迷阵！" },
    ],
    next: null,
  },
  chapter5_intro: {
    pages: [
      { text: "终章：墨暗之源" },
      { text: "你终于追溯到了墨暗的源头——一个试图消灭所有文字、让世界重归蒙昧的黑暗存在。" },
      { speaker: "墨暗之主", text: "文字不过是束缚思想的枷锁。我要解放这个世界！" },
      { text: "这是最终的战斗。你所有的文字修养，都将在这里接受考验。" },
    ],
    next: null,
  },
  chapter5_boss: {
    pages: [
      { speaker: "墨暗之主", text: "你终于来了，文字侠。" },
      { speaker: "墨暗之主", text: "但你来得太晚了。这个世界，已属于黑暗。" },
      { text: "墨暗之主展开双臂，无尽的黑暗从四方涌来。这是你最后的考验！" },
    ],
    next: null,
  },
};

export { STORIES };

// Typewriter effect — resolves when typing is complete
function typewriterEffect(el, text, msPerChar = 50) {
  return new Promise((resolve) => {
    let i = 0;
    el.textContent = '';

    function tick() {
      if (i < text.length) {
        el.textContent += text[i];
        i++;
        // Play tick sound every 3rd character to avoid too-rapid ticking
        if (i % 3 === 0) {
          try { playSound('text'); } catch (_) {}
        }
        setTimeout(tick, msPerChar);
      } else {
        resolve();
      }
    }

    tick();
  });
}

function renderStory({ storyKey, onComplete } = {}) {
  const story = STORIES[storyKey];

  const div = document.createElement('div');
  div.className = 'screen';

  // Full-screen dark overlay layout
  div.style.cssText = `
    position: fixed;
    inset: 0;
    background: rgba(0, 0, 0, 0.96);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    box-sizing: border-box;
  `;

  div.innerHTML = `
    <div id="story-container" style="
      max-width: 700px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 2rem;
      min-height: 220px;
      justify-content: center;
    ">
      <div id="story-speaker" style="
        font-size: 1rem;
        color: #c8a96e;
        letter-spacing: 0.15em;
        min-height: 1.5rem;
        text-align: center;
        opacity: 0;
        transition: opacity 0.4s;
      "></div>

      <div id="story-text" style="
        font-size: 1.4rem;
        line-height: 2.2rem;
        color: #f0e8d0;
        text-align: center;
        text-shadow: 0 0 12px rgba(200, 169, 110, 0.6), 0 0 24px rgba(200, 169, 110, 0.2);
        letter-spacing: 0.08em;
        min-height: 4rem;
        max-width: 600px;
      "></div>

      <button id="btn-continue" style="
        margin-top: 1.5rem;
        padding: 0.6rem 2rem;
        background: transparent;
        border: 1px solid #c8a96e;
        color: #c8a96e;
        font-size: 1.1rem;
        letter-spacing: 0.2em;
        cursor: pointer;
        border-radius: 4px;
        opacity: 0;
        transition: opacity 0.4s, background 0.2s;
        pointer-events: none;
      ">继续</button>

      <div id="story-progress" style="
        display: flex;
        gap: 8px;
        margin-top: 0.5rem;
      "></div>
    </div>
  `;

  if (!story) {
    // Missing story key — just complete immediately
    requestAnimationFrame(() => {
      if (onComplete) onComplete();
    });
    return div;
  }

  const pages = story.pages;
  let currentPage = 0;
  let typing = false;
  let typingDone = false;

  const speakerEl = div.querySelector('#story-speaker');
  const textEl = div.querySelector('#story-text');
  const btnContinue = div.querySelector('#btn-continue');
  const progressEl = div.querySelector('#story-progress');

  // Build progress dots
  pages.forEach((_, idx) => {
    const dot = document.createElement('div');
    dot.style.cssText = `
      width: 6px;
      height: 6px;
      border-radius: 50%;
      background: ${idx === 0 ? '#c8a96e' : '#444'};
      transition: background 0.3s;
    `;
    dot.dataset.page = idx;
    progressEl.appendChild(dot);
  });

  function updateDots(pageIdx) {
    progressEl.querySelectorAll('div').forEach((dot, i) => {
      dot.style.background = i <= pageIdx ? '#c8a96e' : '#444';
    });
  }

  function showContinueButton() {
    btnContinue.style.opacity = '1';
    btnContinue.style.pointerEvents = 'auto';
    typingDone = true;
  }

  async function showPage(idx) {
    typing = true;
    typingDone = false;
    btnContinue.style.opacity = '0';
    btnContinue.style.pointerEvents = 'none';

    const page = pages[idx];

    // Speaker name
    if (page.speaker) {
      speakerEl.style.opacity = '1';
      speakerEl.textContent = page.speaker + '：';
    } else {
      speakerEl.style.opacity = '0';
      speakerEl.textContent = '';
    }

    textEl.textContent = '';
    updateDots(idx);

    await typewriterEffect(textEl, page.text, 55);

    typing = false;
    showContinueButton();
  }

  function advance() {
    try { playSound('click'); } catch (_) {}

    if (typing && !typingDone) {
      // Skip typing — show full text immediately
      const page = pages[currentPage];
      textEl.textContent = page.text;
      typing = false;
      showContinueButton();
      return;
    }

    currentPage++;

    if (currentPage >= pages.length) {
      // All pages shown — navigate away
      div.remove();
      if (onComplete) {
        onComplete();
      } else if (story.next) {
        showScreen(story.next);
      }
      return;
    }

    showPage(currentPage);
  }

  btnContinue.addEventListener('click', (e) => {
    e.stopPropagation();
    advance();
  });

  // Also allow clicking anywhere on the overlay to advance
  div.addEventListener('click', (e) => {
    if (e.target !== btnContinue) {
      advance();
    }
  });

  // Hover style for continue button
  btnContinue.addEventListener('mouseenter', () => {
    btnContinue.style.background = 'rgba(200, 169, 110, 0.15)';
  });
  btnContinue.addEventListener('mouseleave', () => {
    btnContinue.style.background = 'transparent';
  });

  // Start first page
  setTimeout(() => showPage(0), 100);

  return div;
}

registerScreen('story', renderStory);
