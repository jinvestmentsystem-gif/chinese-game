// js/screens/story.js — Cinematic narrative system
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { setParticleMode } from '../particles.js';

// Story data for each narrative moment
const STORIES = {
  opening: {
    pages: [
      { text: "你叫什么名字已经不重要了。重要的是——今天，你的世界变了。" },
      { text: "放学回家的路上，你发现路边的招牌上的字在扭曲、消融。手机屏幕上的文字变成了乱码。课本里的诗句正在一个字一个字地消失。" },
      { text: "没有人注意到这些变化。只有你看到了。" },
      { speaker: "???", text: "因为你有「文眼」——看穿文字本质的能力。而我等这样的人，已经等了很久。" },
      { speaker: "墨小灵", text: "我叫墨小灵，曾经是一个守护文字的精灵。但墨暗——一种毁灭文字的黑暗力量——正在侵蚀这个世界。" },
      { speaker: "墨小灵", text: "文字消失意味着什么？意味着人们会忘记历史、忘记思想、忘记如何表达「我爱你」和「谢谢你」。" },
      { speaker: "墨小灵", text: "我需要你的帮助。你愿意成为文定乾坤吗？用你的文字力量——你学过的每一个字、每一首诗——来拯救这个世界。" },
    ],
    next: 'worldmap',
  },

  chapter1_intro: {
    pages: [
      { text: "【第一章 · 先秦 · 文字的诞生】" },
      { speaker: "墨小灵", text: "我们的第一站是远古时代。传说中，仓颉观察鸟兽足迹，创造了最初的文字。" },
      { speaker: "墨小灵", text: "但墨暗已经先我们一步到了这里。它正在控制仓颉的影子，试图从源头毁灭文字。" },
      { text: "远处传来低沉的轰鸣声。天空中出现了扭曲的甲骨文符号，像黑色的闪电划过。" },
      { speaker: "墨小灵", text: "如果仓颉创造的第一批文字被毁灭……整个文明的根基都会动摇。我们必须阻止这一切！" },
      { text: "你握紧拳头，感受到体内文字力量的涌动。战斗，从这里开始。" },
    ],
    next: null,
  },

  chapter1_boss: {
    pages: [
      { text: "你穿过了重重考验，终于来到了仓颉之影的面前。" },
      { text: "在你面前的，是一个由无数甲骨文字组成的巨大人影。它的眼睛燃烧着墨色的火焰。" },
      { speaker: "仓颉之影", text: "又一个自以为能拯救文字的凡人。你知道文字最初的模样吗？你配吗？" },
      { speaker: "墨小灵", text: "别听它的！它不是真正的仓颉——它只是墨暗操控的影子！用你学过的古文知识打败它！" },
      { speaker: "仓颉之影", text: "来吧！让我看看你对文言文的理解——如果你连古人的话都读不懂，你凭什么守护文字？" },
    ],
    next: null,
  },

  chapter2_intro: {
    pages: [
      { text: "【第二章 · 汉代 · 历史的守护者】" },
      { speaker: "墨小灵", text: "干得好！仓颉之影被你击败了！但这只是开始……墨暗的触手已经伸向了汉代。" },
      { text: "你来到了一座宏伟的宫殿前。匾额上的字正在一笔一划地消融。" },
      { speaker: "墨小灵", text: "这里是太史令的宫殿——司马迁写下《史记》的地方。墨吏——一个被墨暗附体的汉代官吏——正在篡改历史记录。" },
      { speaker: "墨小灵", text: "如果《史记》被改写，后人将永远不知道真正的历史。我们必须保护这些文字！" },
    ],
    next: null,
  },

  chapter2_boss: {
    pages: [
      { text: "宫殿深处，墨吏正在疯狂地涂抹竹简上的文字。" },
      { speaker: "墨吏", text: "历史？历史不过是胜者的谎言！我要重写一切！让真相永远消失在墨暗之中！" },
      { speaker: "墨小灵", text: "它在毁掉《史记》的原文！快，用你对古文的理解来阻止它！每答对一道题，就能恢复一段被毁的文字！" },
    ],
    next: null,
  },

  chapter3_intro: {
    pages: [
      { text: "【第三章 · 唐代 · 诗的国度】" },
      { speaker: "墨小灵", text: "我们到了大唐盛世……但这里完全不像我记忆中的样子。" },
      { text: "本该充满诗歌与歌声的长安城，此刻一片死寂。天空中飘落的不是樱花，而是碎裂的诗句。" },
      { speaker: "墨小灵", text: "诗魔……它把所有的诗句都打碎了。李白的月光、杜甫的春雨、王维的山水——全都变成了碎片。" },
      { speaker: "墨小灵", text: "如果诗歌消失了，人们将失去表达美、哀伤和希望的能力。我们要把这些碎片拼回去！" },
    ],
    next: null,
  },

  chapter3_boss: {
    pages: [
      { text: "诗魔悬浮在破碎的诗句之间，发出刺耳的笑声。" },
      { speaker: "诗魔", text: "诗有什么用？能当饭吃吗？能换钱吗？不如让它们全部消失！哈哈哈！" },
      { speaker: "墨小灵", text: "它说的不对！诗歌是人类灵魂的语言……用你的诗词修养证明给它看——文字之美是不可摧毁的！" },
    ],
    next: null,
  },

  chapter4_intro: {
    pages: [
      { text: "【第四章 · 宋代 · 词中的秘密】" },
      { speaker: "墨小灵", text: "宋代……这个时代的词人们，用最婉约的文字写下了最深沉的情感。" },
      { text: "但你看到的是一片灰色的废墟。词牌名变成了空白，所有的情感都被抽空了。" },
      { speaker: "墨小灵", text: "词煞正在吞噬文字中的情感。没有了喜怒哀乐，词就只是空洞的文字排列而已。" },
      { speaker: "墨小灵", text: "你需要用对文学的理解和感受力，把这些被偷走的情感找回来。" },
    ],
    next: null,
  },

  chapter4_boss: {
    pages: [
      { speaker: "词煞", text: "情感是弱点。逻辑才是力量。我要创造一个没有感情的完美世界。" },
      { speaker: "墨小灵", text: "不！正是因为有感情，文字才有力量打动人心！证明给它看，你不仅懂文字，你更懂文字背后的感情！" },
    ],
    next: null,
  },

  chapter5_intro: {
    pages: [
      { text: "【终章 · 墨暗之源】" },
      { speaker: "墨小灵", text: "我们终于追溯到了一切的源头。墨暗之主就在前方。" },
      { text: "你感到一股前所未有的寒意。周围的一切——文字、声音、色彩——都在被一个巨大的黑洞吞噬。" },
      { speaker: "墨小灵", text: "我必须告诉你一个秘密……墨暗之主并不是一个怪物。它是人们对文字的遗忘和漠视凝聚而成的。" },
      { speaker: "墨小灵", text: "当人们不再阅读、不再书写、不再珍惜文字——墨暗就会越来越强。打败它的方式只有一个——" },
      { speaker: "墨小灵", text: "证明文字依然被人珍爱。证明有人还在学习、还在理解、还在用文字传递思想。" },
      { text: "你深吸一口气。这不仅仅是一场战斗——这是对你所学的一切的终极检验。" },
    ],
    next: null,
  },

  chapter5_boss: {
    pages: [
      { text: "墨暗之主没有固定的形态。它是一团巨大的黑暗，吞噬着周围所有的光和文字。" },
      { speaker: "墨暗之主", text: "文字不过是多余的东西。没有文字，人类照样活着。为什么要执着于这些符号？" },
      { speaker: "墨小灵", text: "因为没有文字，就没有「我爱你」、没有「谢谢」、没有「对不起」——没有任何连接人心的桥梁。" },
      { speaker: "墨小灵", text: "文定乾坤，这是最后的战斗。把你学过的一切都用上。我相信你！" },
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
      // Stop if element was removed from DOM (screen navigated away)
      if (!el.parentNode) { resolve(); return; }
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

// Inject particle-rise keyframe once per page load
(function injectParticleKeyframe() {
  if (document.getElementById('story-particle-style')) return;
  const s = document.createElement('style');
  s.id = 'story-particle-style';
  s.textContent = `
    @keyframes particle-rise {
      0%   { transform: translateY(0) translateX(0);    opacity: 0; }
      10%  { opacity: 0.8; }
      90%  { opacity: 0.6; }
      100% { transform: translateY(-100vh) translateX(var(--px-drift)); opacity: 0; }
    }
    @keyframes speaker-icon-glow {
      0%   { box-shadow: 0 0 12px rgba(212,160,23,0.3), 0 0 24px rgba(212,160,23,0.1); }
      100% { box-shadow: 0 0 20px rgba(212,160,23,0.6), 0 0 40px rgba(212,160,23,0.25); }
    }
    @keyframes speaker-name-glow {
      0%   { text-shadow: 0 0 10px rgba(212,160,23,0.5), 0 0 20px rgba(212,160,23,0.2); }
      100% { text-shadow: 0 0 16px rgba(212,160,23,0.8), 0 0 32px rgba(212,160,23,0.4); }
    }
    @keyframes story-btn-pulse {
      0%, 100% { box-shadow: 0 0 0 0 rgba(200,169,110,0.5), 0 0 12px rgba(200,169,110,0.15); }
      50%      { box-shadow: 0 0 0 8px rgba(200,169,110,0), 0 0 24px rgba(200,169,110,0.3); }
    }
  `;
  document.head.appendChild(s);
})();

function addParticles(container) {
  for (let i = 0; i < 25; i++) {
    const particle = document.createElement('div');
    const size    = 2 + Math.random() * 4;
    const x       = Math.random() * 100;
    const delay   = Math.random() * 8;
    const duration = 6 + Math.random() * 8;
    const drift   = ((Math.random() - 0.5) * 40).toFixed(1) + 'px';
    particle.style.cssText = `
      position:absolute; left:${x}%; bottom:-10px;
      width:${size}px; height:${size}px; border-radius:50%;
      background:radial-gradient(circle, rgba(212,160,23,0.8), transparent);
      --px-drift:${drift};
      animation: particle-rise ${duration}s ${delay}s linear infinite;
      pointer-events:none; z-index:0;
    `;
    container.appendChild(particle);
  }
}

function renderStory({ storyKey, onComplete } = {}) {
  setParticleMode('ambient');
  const story = STORIES[storyKey];

  const div = document.createElement('div');
  div.className = 'screen';

  // Full-screen ink-wash atmospheric layout
  div.style.cssText = `
    position: fixed;
    inset: 0;
    background:
      radial-gradient(ellipse at 30% 50%, rgba(15,52,96,0.4) 0%, transparent 60%),
      radial-gradient(ellipse at 70% 30%, rgba(83,52,131,0.3) 0%, transparent 50%),
      linear-gradient(180deg, #0b0c1a 0%, #1a1a2e 50%, #16213e 100%);
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    z-index: 1000;
    padding: 2rem;
    box-sizing: border-box;
    overflow: hidden;
  `;

  // Floating particles layer
  addParticles(div);

  div.innerHTML += `
    <div id="story-container" style="
      position: relative;
      z-index: 1;
      max-width: 700px;
      width: 100%;
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 1.5rem;
      min-height: 220px;
      justify-content: center;
    ">
      <div id="story-speaker-row" style="
        display: flex;
        align-items: center;
        gap: 12px;
        min-height: 2.2rem;
        opacity: 0;
        transition: opacity 0.4s;
      ">
        <div id="story-speaker-icon" style="
          width: 36px; height: 36px; border-radius: 50%;
          background: rgba(212,160,23,0.3);
          border: 2px solid rgba(212,160,23,0.6);
          display: flex; align-items: center; justify-content: center;
          font-size: 1.1rem; color: #d4a017; font-weight: 700;
          flex-shrink: 0;
          box-shadow: 0 0 16px rgba(212,160,23,0.4), 0 0 32px rgba(212,160,23,0.15);
          animation: speaker-icon-glow 2s ease-in-out infinite alternate;
        "></div>
        <div id="story-speaker" style="
          font-size: 1.15rem;
          font-weight: 700;
          color: #d4b872;
          letter-spacing: 0.18em;
          text-align: center;
          text-shadow: 0 0 12px rgba(212,160,23,0.7), 0 0 24px rgba(212,160,23,0.3);
          animation: speaker-name-glow 2s ease-in-out infinite alternate;
        "></div>
      </div>

      <div id="story-text-area" style="
        background: rgba(15,20,40,0.7);
        border: 1px solid rgba(212,160,23,0.3);
        border-radius: 12px;
        padding: 36px 44px;
        max-width: 620px;
        width: 100%;
        box-sizing: border-box;
        backdrop-filter: blur(8px);
        box-shadow:
          0 0 40px rgba(212,160,23,0.12),
          inset 0 0 80px rgba(0,0,0,0.4),
          inset 0 0 120px rgba(15,20,40,0.6);
        position: relative;
        overflow: hidden;
      ">
        <!-- Vignette overlay around text area -->
        <div style="
          position:absolute; inset:0; pointer-events:none; border-radius:12px;
          background: radial-gradient(ellipse at center, transparent 40%, rgba(0,0,0,0.55) 100%);
          z-index:1;
        "></div>
        <div id="story-text" style="
          font-size: 1.55rem;
          line-height: 2.5rem;
          color: #f0e8d0;
          text-align: center;
          text-shadow: 0 0 14px rgba(200,169,110,0.7), 0 0 28px rgba(200,169,110,0.25);
          letter-spacing: 0.1em;
          min-height: 4.5rem;
          position: relative;
          z-index: 2;
        "></div>
      </div>

      <button id="btn-continue" style="
        margin-top: 0.8rem;
        padding: 0.85rem 2.8rem;
        background: rgba(200,169,110,0.08);
        border: 2px solid #c8a96e;
        color: #d4b872;
        font-size: 1.25rem;
        font-weight: 600;
        letter-spacing: 0.25em;
        cursor: pointer;
        border-radius: 8px;
        opacity: 0;
        transition: opacity 0.5s, background 0.2s, transform 0.2s;
        pointer-events: none;
        position: relative;
        z-index: 2;
        text-shadow: 0 0 8px rgba(212,160,23,0.5);
        animation: story-btn-pulse 2s ease-in-out infinite;
      ">继续 ▸</button>

      <button id="btn-skip-story" style="
        position:absolute; top:16px; right:16px; z-index:10;
        padding:6px 16px; background:rgba(0,0,0,0.5);
        border:1px solid rgba(255,255,255,0.2); color:rgba(255,255,255,0.5);
        font-size:0.95rem; cursor:pointer; border-radius:6px;
        font-family:var(--font-main); transition:opacity 0.2s;
      ">跳过 ▸▸</button>

      <div id="story-progress" style="
        display: flex;
        gap: 8px;
        margin-top: 0.25rem;
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

  const speakerRowEl = div.querySelector('#story-speaker-row');
  const speakerIconEl = div.querySelector('#story-speaker-icon');
  const speakerEl    = div.querySelector('#story-speaker');
  const textEl       = div.querySelector('#story-text');
  const btnContinue  = div.querySelector('#btn-continue');
  const progressEl   = div.querySelector('#story-progress');

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

    // Speaker name with icon
    if (page.speaker) {
      speakerRowEl.style.opacity = '1';
      speakerEl.textContent = page.speaker + '：';
      // Show first character of speaker name in the icon circle
      speakerIconEl.style.display = 'flex';
      speakerIconEl.textContent = page.speaker.charAt(0);
    } else {
      speakerRowEl.style.opacity = '0';
      speakerEl.textContent = '';
      speakerIconEl.textContent = '';
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

  // Skip all — jump to end
  const btnSkip = div.querySelector('#btn-skip-story');
  if (btnSkip) {
    btnSkip.addEventListener('click', (e) => {
      e.stopPropagation();
      div.remove();
      if (onComplete) { onComplete(); }
      else if (story.next) { showScreen(story.next); }
    });
  }

  // Also allow clicking anywhere on the overlay to advance
  div.addEventListener('click', (e) => {
    if (e.target !== btnContinue && e.target !== btnSkip) {
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
