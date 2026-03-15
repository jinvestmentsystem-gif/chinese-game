# 文字侠 (Word Hero) Implementation Plan

> **For agentic workers:** REQUIRED: Use superpowers:subagent-driven-development (if subagents available) or superpowers:executing-plans to implement this plan. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a browser-based combat RPG that teaches Chinese language skills through combat, puzzles, and boss battles across historical eras.

**Architecture:** Pure client-side web app using ES modules. GameState is a shared singleton imported by all modules. Screens are rendered by swapping DOM content in a root container. Content loaded via fetch() from JSON files. Progress saved to localStorage.

**Tech Stack:** HTML5, CSS3, vanilla JavaScript (ES modules), Python http.server for local dev

**Spec:** `docs/superpowers/specs/2026-03-15-wenzi-xia-game-design.md`

**Important — Local Server Required:** ES modules and fetch() require HTTP, not file://. Use `python -m http.server 8080` from the project root.

---

## Chunk 1: Foundation & Infrastructure

### Task 1: Project Scaffolding & Dev Server

**Files:**
- Create: `index.html`
- Create: `css/styles.css`
- Create: `js/main.js`
- Create: `js/state.js`
- Create: `serve.bat`

- [ ] **Step 1: Create serve.bat for local development**

```bat
@echo off
echo Starting dev server at http://localhost:8080
python -m http.server 8080
```

- [ ] **Step 2: Create index.html**

```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>文字侠 — Word Hero</title>
  <link rel="stylesheet" href="css/styles.css">
  <link rel="preconnect" href="https://fonts.googleapis.com">
  <link href="https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@400;700;900&display=swap" rel="stylesheet">
</head>
<body>
  <div id="game-root"></div>
  <script type="module" src="js/main.js"></script>
</body>
</html>
```

- [ ] **Step 3: Create css/styles.css with base theme**

```css
:root {
  --bg-primary: #1a1a2e;
  --bg-secondary: #16213e;
  --bg-card: #0f3460;
  --text-primary: #e8e8e8;
  --text-secondary: #a0a0b0;
  --accent-gold: #d4a017;
  --accent-red: #c0392b;
  --accent-jade: #27ae60;
  --accent-blue: #2980b9;
  --font-main: 'Noto Sans SC', sans-serif;
  --hp-green: #27ae60;
  --hp-red: #c0392b;
  --timer-yellow: #f39c12;
}

* { margin: 0; padding: 0; box-sizing: border-box; }

body {
  font-family: var(--font-main);
  background: var(--bg-primary);
  color: var(--text-primary);
  min-height: 100vh;
  overflow: hidden;
}

#game-root {
  width: 100vw;
  height: 100vh;
  position: relative;
  overflow: hidden;
}

.screen {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  transition: opacity 0.3s ease;
}

.screen.hidden { display: none; }

.btn {
  font-family: var(--font-main);
  font-size: 1.1rem;
  padding: 12px 32px;
  border: 2px solid var(--accent-gold);
  background: transparent;
  color: var(--accent-gold);
  cursor: pointer;
  border-radius: 4px;
  transition: all 0.2s;
}

.btn:hover {
  background: var(--accent-gold);
  color: var(--bg-primary);
}

.btn-primary {
  background: var(--accent-gold);
  color: var(--bg-primary);
  font-weight: 700;
}

.btn-primary:hover {
  background: #e6b422;
}

h1, h2, h3 { color: var(--accent-gold); }
```

- [ ] **Step 4: Create js/state.js — shared game state singleton**

```js
// js/state.js — Central game state, saved to localStorage

const SAVE_KEY = 'wenzi-xia-save';

const DEFAULT_PROFILE = {
  name: '',
  tier: 'grade7',
  level: 1,
  xp: 0,
  hp: 100,
  maxHp: 100,
  wenli: 5,
  maxWenli: 5,
  attack: 0,
  defense: 0,
  speed: 0,
  equipment: { weapon: null, armor: null },
  chapterProgress: { 1: { questsCompleted: 0 } },
  chengyu: [],
  dailyStreak: 0,
  lastDailyDate: null,
  seenQuestions: { vocab: [], reading: [], classical: [] },
  accuracy: { vocab: [], reading: [], classical: [] },
  inventory: [],
  createdAt: null,
};

class GameState {
  constructor() {
    this.profiles = [];
    this.activeProfileIndex = -1;
    this.currentScreen = 'title';
    this.currentQuest = null;
    this.arenaState = null;
    this._load();
  }

  _load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      const data = JSON.parse(raw);
      this.profiles = data.profiles || [];
    }
  }

  save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      profiles: this.profiles,
    }));
  }

  get profile() {
    return this.profiles[this.activeProfileIndex] || null;
  }

  createProfile(name, tier) {
    const p = { ...DEFAULT_PROFILE, name, tier, createdAt: Date.now() };
    // Deep clone nested objects
    p.equipment = { ...DEFAULT_PROFILE.equipment };
    p.chapterProgress = { 1: { questsCompleted: 0 } };
    p.chengyu = [];
    p.seenQuestions = { vocab: [], reading: [], classical: [] };
    p.accuracy = { vocab: [], reading: [], classical: [] };
    p.inventory = [];
    this.profiles.push(p);
    this.activeProfileIndex = this.profiles.length - 1;
    this.save();
    return p;
  }

  deleteProfile(index) {
    this.profiles.splice(index, 1);
    if (this.activeProfileIndex >= this.profiles.length) {
      this.activeProfileIndex = this.profiles.length - 1;
    }
    this.save();
  }

  selectProfile(index) {
    this.activeProfileIndex = index;
  }
}

export const gameState = new GameState();
export { DEFAULT_PROFILE };
```

- [ ] **Step 5: Create js/main.js — app entry point and screen router**

```js
// js/main.js — App initialization and screen routing
import { gameState } from './state.js';

const root = document.getElementById('game-root');
const screens = {};

export function registerScreen(name, renderFn) {
  screens[name] = renderFn;
}

export function showScreen(name, params = {}) {
  gameState.currentScreen = name;
  root.innerHTML = '';
  if (screens[name]) {
    const el = screens[name](params);
    root.appendChild(el);
  }
}

// Title screen — rendered inline as bootstrap
function renderTitle() {
  const div = document.createElement('div');
  div.className = 'screen';
  div.innerHTML = `
    <h1 style="font-size:3rem; margin-bottom:0.5rem;">文字侠</h1>
    <p style="font-size:1.2rem; color:var(--text-secondary); margin-bottom:2rem;">Word Hero</p>
    <div style="display:flex; flex-direction:column; gap:12px;">
      <button class="btn btn-primary" id="btn-solo">单人模式</button>
      <button class="btn" id="btn-arena">双人对战</button>
      <button class="btn" id="btn-daily">每日挑战</button>
    </div>
  `;
  return div;
}

registerScreen('title', renderTitle);

// Boot
showScreen('title');
```

- [ ] **Step 6: Start dev server and verify in browser**

Run: `cd C:/dev/chinese-game && python -m http.server 8080`
Open: `http://localhost:8080`
Expected: Dark-themed page showing "文字侠 / Word Hero" with three gold buttons.

- [ ] **Step 7: Commit**

```bash
git add index.html css/ js/main.js js/state.js serve.bat
git commit -m "feat: project scaffolding with game state, screen router, and title screen"
```

---

### Task 2: Content Loader & Seed Content

**Files:**
- Create: `js/content-loader.js`
- Create: `content/grade7/vocab.json` (5 seed questions)
- Create: `content/grade7/reading.json` (2 seed passages)
- Create: `content/grade7/classical.json` (5 seed questions)
- Create: `content/grade3/vocab.json` (5 seed questions)
- Create: `content/grade3/reading.json` (2 seed passages)
- Create: `content/grade3/classical.json` (5 seed questions)
- Create: `content/chengyu.json` (5 seed entries)

- [ ] **Step 1: Create js/content-loader.js**

```js
// js/content-loader.js — Loads and queries content from JSON files

const cache = {};

async function loadJSON(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(path);
  const data = await res.json();
  cache[path] = data;
  return data;
}

export async function loadContent(tier) {
  const base = `content/${tier}`;
  const [vocab, reading, classical] = await Promise.all([
    loadJSON(`${base}/vocab.json`),
    loadJSON(`${base}/reading.json`),
    loadJSON(`${base}/classical.json`),
  ]);
  return { vocab, reading, classical };
}

export async function loadChengyu() {
  return loadJSON('content/chengyu.json');
}

export function pickQuestions(pool, count, seenIds = [], difficultyTarget = 3) {
  // Filter out recently seen (last 20)
  const recentSeen = seenIds.slice(-20);
  let available = pool.filter(q => !recentSeen.includes(q.id));
  if (available.length < count) available = pool;

  // Sort by closeness to target difficulty, then shuffle within same distance
  available.sort((a, b) => {
    const da = Math.abs(a.difficulty - difficultyTarget);
    const db = Math.abs(b.difficulty - difficultyTarget);
    return da - db || Math.random() - 0.5;
  });

  return available.slice(0, count);
}

export function pickReadingPassage(passages, seenIds = [], difficultyTarget = 3) {
  const recentSeen = seenIds.slice(-10);
  let available = passages.filter(p => !recentSeen.includes(p.id));
  if (available.length === 0) available = passages;

  available.sort((a, b) => {
    const da = Math.abs(a.difficulty - difficultyTarget);
    const db = Math.abs(b.difficulty - difficultyTarget);
    return da - db || Math.random() - 0.5;
  });

  return available[0];
}
```

- [ ] **Step 2: Create seed content files**

Create `content/grade7/vocab.json`:
```json
[
  {
    "id": "v7-001",
    "type": "vocab",
    "prompt": ""翕"字的正确读音是什么？",
    "options": ["xī", "hé", "qì", "shà"],
    "correct": 0,
    "explanation": "翕 (xī)，意为合拢、收敛。",
    "difficulty": 3,
    "tags": ["先秦", "字音"],
    "source": "curriculum"
  },
  {
    "id": "v7-002",
    "type": "vocab",
    "prompt": ""期"在古文中最常见的意思是？",
    "options": ["日期", "期望", "约定", "时期"],
    "correct": 2,
    "explanation": "在文言文中，"期"多指约定，如"陈太丘与友期行"。",
    "difficulty": 2,
    "tags": ["先秦", "词义"],
    "source": "curriculum"
  },
  {
    "id": "v7-003",
    "type": "vocab",
    "prompt": "下列哪个词语中"观"的意思与其他三项不同？",
    "options": ["观沧海", "观察", "壮观", "观赏"],
    "correct": 2,
    "explanation": ""壮观"中的"观"是名词（景象），其他三项中的"观"都是动词（看）。",
    "difficulty": 4,
    "tags": ["先秦", "多义词"],
    "source": "curriculum"
  },
  {
    "id": "v7-004",
    "type": "vocab",
    "prompt": ""随声附和"中"和"的正确读音是？",
    "options": ["hé", "hè", "hú", "huó"],
    "correct": 1,
    "explanation": "此处"和"读 hè，意为应和、响应。",
    "difficulty": 2,
    "tags": ["先秦", "字音"],
    "source": "curriculum"
  },
  {
    "id": "v7-005",
    "type": "vocab",
    "prompt": ""温故而知新"中"故"的意思是？",
    "options": ["故事", "原因", "旧的知识", "所以"],
    "correct": 2,
    "explanation": ""故"在此指旧的、已学过的知识。出自《论语》。",
    "difficulty": 1,
    "tags": ["先秦", "词义"],
    "source": "curriculum"
  }
]
```

Create `content/grade7/classical.json`:
```json
[
  {
    "id": "c7-001",
    "type": "classical",
    "prompt": ""学而时习之，不亦说乎"中"说"的意思是？",
    "options": ["说话", "高兴", "学说", "游说"],
    "correct": 1,
    "explanation": ""说"通"悦"，意为高兴、愉悦。出自《论语》。",
    "difficulty": 1,
    "tags": ["先秦", "通假字"],
    "source": "curriculum"
  },
  {
    "id": "c7-002",
    "type": "classical",
    "prompt": ""未若柳絮因风起"用了什么修辞手法？",
    "options": ["拟人", "比喻", "夸张", "对偶"],
    "correct": 1,
    "explanation": "将雪花比作柳絮，是比喻的修辞手法。出自《咏雪》。",
    "difficulty": 2,
    "tags": ["先秦", "修辞"],
    "source": "curriculum"
  },
  {
    "id": "c7-003",
    "type": "classical",
    "prompt": ""陈太丘与友期行，期日中"中"期"的意思是？",
    "options": ["期望", "约定", "时期", "期限"],
    "correct": 1,
    "explanation": ""期"在此为动词，意为约定。",
    "difficulty": 2,
    "tags": ["先秦", "虚词"],
    "source": "curriculum"
  },
  {
    "id": "c7-004",
    "type": "classical",
    "prompt": "翻译："三人行，必有我师焉。"",
    "options": [
      "三个人走路，一定有我的老师。",
      "几个人一起走，其中必定有可以做我老师的人。",
      "三个人走路，必须有老师带着我。",
      "很多人一起走路，一定有人教我。"
    ],
    "correct": 1,
    "explanation": ""三"是虚指，意为多个。"焉"为兼词，相当于"于之"。",
    "difficulty": 3,
    "tags": ["先秦", "翻译"],
    "source": "curriculum"
  },
  {
    "id": "c7-005",
    "type": "classical",
    "prompt": ""知之者不如好之者，好之者不如乐之者"中三个"之"分别指什么？",
    "options": [
      "它们分别指不同的事物",
      "都指代"学问或事业"",
      "第一个指"知识"，后两个指"学习"",
      "都是助词，无实际意义"
    ],
    "correct": 1,
    "explanation": "三个"之"都是代词，指代所学的学问或从事的事业。",
    "difficulty": 4,
    "tags": ["先秦", "虚词"],
    "source": "curriculum"
  }
]
```

Create `content/grade7/reading.json`:
```json
[
  {
    "id": "r7-001",
    "type": "reading",
    "title": "竹节人",
    "passage": "我们小时候的玩具，都是自己做的。做得最多的是竹节人——用毛笔杆锯成寸把长的截，在上面钻一对小眼，再用纳鞋底的线穿上，就成了。锯的时候要小心，弄不好一个\"节\"就报废了。我们全迷上了竹节人，下课时，教室里摆开场子，吸引了一圈黑脑袋。只见两个竹节人在课桌上打斗，嗒嗒嗒，没头没脑地对打着。",
    "questions": [
      {
        "prompt": "竹节人是用什么材料做的？",
        "options": ["竹竿", "毛笔杆", "筷子", "树枝"],
        "correct": 1,
        "explanation": "文中明确说"用毛笔杆锯成寸把长的截"。"
      },
      {
        "prompt": "文章表达了作者怎样的感情？",
        "options": ["对现代玩具的不满", "对童年游戏的怀念", "对学校的厌恶", "对竹子的喜爱"],
        "correct": 1,
        "explanation": "通过回忆制作和玩竹节人的细节，表达了对童年生活的怀念之情。"
      }
    ],
    "difficulty": 2,
    "tags": ["现代文", "记叙文"],
    "source": "curriculum"
  },
  {
    "id": "r7-002",
    "type": "reading",
    "title": "地下森林断想",
    "passage": "它从海底隆起，经历了沧桑巨变。火山爆发，岩浆奔涌，天空被浓烟遮蔽。终于，火山口沉寂了，变成一个巨大的深坑——火山口。阳光照不到坑底，寒风却可以直入。没有土壤，没有种子，什么都没有。但生命总会找到出路。飞鸟衔来种子，风送来尘土，一棵树在坑底倔强地生长起来。",
    "questions": [
      {
        "prompt": "地下森林形成在什么地方？",
        "options": ["山洞里", "地下河旁", "火山口深坑中", "山谷底部"],
        "correct": 2,
        "explanation": "文中描述火山爆发后形成深坑，森林在火山口深坑中生长。"
      },
      {
        "prompt": ""生命总会找到出路"这句话的作用是什么？",
        "options": ["总结全文", "引出下文生命如何在坑底扎根", "表达悲观情绪", "描写自然环境"],
        "correct": 1,
        "explanation": "这句是过渡句，承上启下，引出后文种子如何到达坑底、树木如何生长的内容。"
      }
    ],
    "difficulty": 3,
    "tags": ["现代文", "散文"],
    "source": "supplementary"
  }
]
```

Create `content/grade3/vocab.json`:
```json
[
  {
    "id": "v3-001",
    "type": "vocab",
    "prompt": ""宽"的反义词是什么？",
    "options": ["窄", "大", "长", "短"],
    "correct": 0,
    "explanation": ""宽"的反义词是"窄"。宽窄是一对反义词。",
    "difficulty": 1,
    "tags": ["反义词"],
    "source": "curriculum"
  },
  {
    "id": "v3-002",
    "type": "vocab",
    "prompt": ""欢"字是什么结构？",
    "options": ["左右结构", "上下结构", "半包围结构", "独体字"],
    "correct": 0,
    "explanation": ""欢"字左边是"又"，右边是"欠"，是左右结构。",
    "difficulty": 2,
    "tags": ["字形"],
    "source": "curriculum"
  },
  {
    "id": "v3-003",
    "type": "vocab",
    "prompt": "下列哪个字的读音是第二声？",
    "options": ["花", "红", "大", "是"],
    "correct": 1,
    "explanation": ""红"读 hóng，是第二声。花(huā)第一声，大(dà)第四声，是(shì)第四声。",
    "difficulty": 1,
    "tags": ["字音"],
    "source": "curriculum"
  },
  {
    "id": "v3-004",
    "type": "vocab",
    "prompt": ""五颜六色"形容什么？",
    "options": ["声音很大", "颜色很多", "味道很好", "速度很快"],
    "correct": 1,
    "explanation": ""五颜六色"形容色彩繁多，颜色很多很鲜艳。",
    "difficulty": 1,
    "tags": ["成语"],
    "source": "curriculum"
  },
  {
    "id": "v3-005",
    "type": "vocab",
    "prompt": ""清清楚楚"属于什么类型的词语？",
    "options": ["AABB式", "ABAB式", "ABAC式", "ABCC式"],
    "correct": 0,
    "explanation": ""清清楚楚"是AABB式叠词，由"清楚"重叠而来。",
    "difficulty": 2,
    "tags": ["词语类型"],
    "source": "curriculum"
  }
]
```

Create `content/grade3/reading.json`:
```json
[
  {
    "id": "r3-001",
    "type": "reading",
    "title": "小蝌蚪找妈妈",
    "passage": "池塘里有一群小蝌蚪，大大的脑袋，黑灰色的身子，甩着长长的尾巴，快活地游来游去。小蝌蚪游哇游，看见鲤鱼妈妈在教小鲤鱼吃东西。小蝌蚪迎上去问："鲤鱼阿姨，我们的妈妈在哪里？"鲤鱼妈妈说："你们的妈妈四条腿，宽嘴巴。你们到那边去找吧！"",
    "questions": [
      {
        "prompt": "小蝌蚪长什么样子？",
        "options": ["四条腿，宽嘴巴", "大脑袋，长尾巴", "小小的，红色的", "有翅膀，会飞"],
        "correct": 1,
        "explanation": "文中描写小蝌蚪"大大的脑袋""甩着长长的尾巴"。"
      },
      {
        "prompt": "鲤鱼妈妈说蝌蚪的妈妈有什么特点？",
        "options": ["大脑袋，长尾巴", "红色的身体", "四条腿，宽嘴巴", "会游泳"],
        "correct": 2,
        "explanation": "鲤鱼妈妈说"你们的妈妈四条腿，宽嘴巴"。"
      }
    ],
    "difficulty": 1,
    "tags": ["记叙文", "童话"],
    "source": "curriculum"
  },
  {
    "id": "r3-002",
    "type": "reading",
    "title": "秋天的雨",
    "passage": "秋天的雨，是一把钥匙。它带着清凉和温柔，趁你没留意，把秋天的大门打开了。秋天的雨，有一盒五彩缤纷的颜料。你看，它把黄色给了银杏树，黄黄的叶子像一把把小扇子，扇哪扇哪，扇走了夏天的炎热。它把红色给了枫树，红红的枫叶像一枚枚邮票，飘哇飘哇，邮来了秋天的凉爽。",
    "questions": [
      {
        "prompt": "文章把秋天的雨比作什么？",
        "options": ["一把伞", "一把钥匙", "一条河", "一阵风"],
        "correct": 1,
        "explanation": "文章开头说"秋天的雨，是一把钥匙"，这是比喻的修辞手法。"
      },
      {
        "prompt": "银杏树的叶子被比作什么？",
        "options": ["邮票", "小扇子", "钥匙", "颜料"],
        "correct": 1,
        "explanation": "文中说"黄黄的叶子像一把把小扇子"。"
      }
    ],
    "difficulty": 2,
    "tags": ["散文", "写景"],
    "source": "curriculum"
  }
]
```

Create `content/grade3/classical.json`:
```json
[
  {
    "id": "c3-001",
    "type": "classical",
    "prompt": ""鹅、鹅、鹅，曲项向天歌"中"曲"的意思是？",
    "options": ["歌曲", "弯曲", "曲折", "音乐"],
    "correct": 1,
    "explanation": ""曲项"是弯着脖子的意思。出自骆宾王《咏鹅》。",
    "difficulty": 1,
    "tags": ["唐诗", "字词"],
    "source": "curriculum"
  },
  {
    "id": "c3-002",
    "type": "classical",
    "prompt": ""床前明月光"的下一句是？",
    "options": ["低头思故乡", "疑是地上霜", "举头望明月", "春风吹又生"],
    "correct": 1,
    "explanation": ""床前明月光，疑是地上霜"出自李白《静夜思》。",
    "difficulty": 1,
    "tags": ["唐诗", "名句"],
    "source": "curriculum"
  },
  {
    "id": "c3-003",
    "type": "classical",
    "prompt": ""离离原上草"中"离离"的意思是？",
    "options": ["离开", "草木茂盛的样子", "分离", "稀疏的样子"],
    "correct": 1,
    "explanation": ""离离"形容草长得茂盛繁密。出自白居易《赋得古原草送别》。",
    "difficulty": 2,
    "tags": ["唐诗", "字词"],
    "source": "curriculum"
  },
  {
    "id": "c3-004",
    "type": "classical",
    "prompt": ""春眠不觉晓"的作者是谁？",
    "options": ["李白", "杜甫", "孟浩然", "王维"],
    "correct": 2,
    "explanation": "《春晓》是唐代诗人孟浩然的作品。",
    "difficulty": 1,
    "tags": ["唐诗", "文学常识"],
    "source": "curriculum"
  },
  {
    "id": "c3-005",
    "type": "classical",
    "prompt": ""锄禾日当午"告诉我们什么道理？",
    "options": ["要早起锻炼", "要珍惜粮食", "要勤劳种田", "要多读书"],
    "correct": 1,
    "explanation": "《悯农》通过描写农民辛苦劳作，告诉我们要珍惜粮食。",
    "difficulty": 1,
    "tags": ["唐诗", "理解"],
    "source": "curriculum"
  }
]
```

Create `content/chengyu.json`:
```json
[
  {
    "id": "cy-001",
    "chengyu": "温故知新",
    "pinyin": "wēn gù zhī xīn",
    "meaning": "温习已学过的知识，从中获得新的理解和体会。",
    "origin": "出自《论语·为政》："温故而知新，可以为师矣。"",
    "example": "学习要善于温故知新，不能只求新知识而忘记旧知识。",
    "era": "先秦",
    "chapter": 1
  },
  {
    "id": "cy-002",
    "chengyu": "三人行必有我师",
    "pinyin": "sān rén xíng bì yǒu wǒ shī",
    "meaning": "几个人一起走路，其中一定有可以做我老师的人。形容要虚心向别人学习。",
    "origin": "出自《论语·述而》："三人行，必有我师焉。"",
    "example": "我们应该抱着三人行必有我师的态度，虚心学习他人的长处。",
    "era": "先秦",
    "chapter": 1
  },
  {
    "id": "cy-003",
    "chengyu": "不耻下问",
    "pinyin": "bù chǐ xià wèn",
    "meaning": "不以向地位、学问不如自己的人请教为耻。形容虚心好学。",
    "origin": "出自《论语·公冶长》。",
    "example": "遇到不懂的问题就要不耻下问，这样才能进步。",
    "era": "先秦",
    "chapter": 1
  },
  {
    "id": "cy-004",
    "chengyu": "咏絮之才",
    "pinyin": "yǒng xù zhī cái",
    "meaning": "指女子的文学才能。",
    "origin": "出自《世说新语·言语》，谢道韫以"未若柳絮因风起"咏雪，被称赞有才华。",
    "example": "她的文章写得极好，真有咏絮之才。",
    "era": "先秦",
    "chapter": 1
  },
  {
    "id": "cy-005",
    "chengyu": "开卷有益",
    "pinyin": "kāi juàn yǒu yì",
    "meaning": "打开书本就有好处。形容读书总有收获。",
    "origin": "出自宋代王辟之《渑水燕谈录》。",
    "example": "开卷有益，多读书总能学到新东西。",
    "era": "宋代",
    "chapter": 4
  }
]
```

- [ ] **Step 3: Verify content loads in browser console**

Add temporary test to `js/main.js` bottom:
```js
// Temporary test — remove after verification
import { loadContent, loadChengyu, pickQuestions } from './content-loader.js';
loadContent('grade7').then(c => {
  console.log('Grade 7 vocab count:', c.vocab.length);
  console.log('Grade 7 reading count:', c.reading.length);
  console.log('Grade 7 classical count:', c.classical.length);
  const picked = pickQuestions(c.vocab, 3);
  console.log('Picked 3 vocab:', picked.map(q => q.id));
});
loadChengyu().then(cy => console.log('Chengyu count:', cy.length));
```

Run: Refresh browser, open DevTools console
Expected: Logs showing counts (5, 2, 5) and 3 picked vocab IDs, chengyu count 5.

- [ ] **Step 4: Remove temporary test code from main.js**

- [ ] **Step 5: Commit**

```bash
git add js/content-loader.js content/
git commit -m "feat: content loader with seed content for grade 3 and grade 7"
```

---

### Task 3: Profile Screen

**Files:**
- Create: `js/screens/profile.js`
- Modify: `js/main.js` (import profile screen)

- [ ] **Step 1: Create js/screens/profile.js**

```js
// js/screens/profile.js — Profile creation and selection
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';

function renderProfileSelect(params = {}) {
  const mode = params.mode || 'solo'; // 'solo' or 'arena'
  const div = document.createElement('div');
  div.className = 'screen';

  const profiles = gameState.profiles;

  let profileListHTML = profiles.map((p, i) => `
    <div class="profile-card" data-index="${i}">
      <div class="profile-name">${p.name}</div>
      <div class="profile-info">${p.tier === 'grade7' ? '七年级' : '三年级'} · Lv.${p.level}</div>
    </div>
  `).join('');

  div.innerHTML = `
    <h2 style="margin-bottom:1.5rem;">选择角色</h2>
    <div class="profile-list">
      ${profileListHTML}
      <div class="profile-card profile-new" id="new-profile">
        <div class="profile-name">+ 新建角色</div>
      </div>
    </div>
    <div id="create-form" style="display:none; margin-top:1.5rem; text-align:center;">
      <input type="text" id="name-input" placeholder="输入名字" maxlength="8"
        style="font-size:1.1rem; padding:8px 16px; background:var(--bg-secondary);
        border:1px solid var(--accent-gold); color:var(--text-primary); border-radius:4px;
        font-family:var(--font-main); margin-bottom:12px; display:block; width:240px; margin-left:auto; margin-right:auto;">
      <div style="display:flex; gap:12px; justify-content:center; margin-bottom:12px;">
        <button class="btn tier-btn" data-tier="grade3">三年级</button>
        <button class="btn tier-btn" data-tier="grade7">七年级</button>
      </div>
      <button class="btn btn-primary" id="confirm-create" disabled>创建</button>
    </div>
    <button class="btn" id="back-btn" style="margin-top:2rem;">返回</button>
  `;

  // Style profile cards
  const style = document.createElement('style');
  style.textContent = `
    .profile-list { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; }
    .profile-card {
      background:var(--bg-card); border:2px solid var(--bg-secondary); border-radius:8px;
      padding:20px 32px; cursor:pointer; transition:all 0.2s; min-width:160px; text-align:center;
    }
    .profile-card:hover { border-color:var(--accent-gold); }
    .profile-name { font-size:1.2rem; font-weight:700; margin-bottom:4px; }
    .profile-info { font-size:0.9rem; color:var(--text-secondary); }
    .profile-new { border-style:dashed; }
    .tier-btn.selected { background:var(--accent-gold); color:var(--bg-primary); }
  `;
  div.appendChild(style);

  // Event handlers after DOM insertion
  setTimeout(() => {
    let selectedTier = null;

    div.querySelectorAll('.profile-card[data-index]').forEach(card => {
      card.addEventListener('click', () => {
        const idx = parseInt(card.dataset.index);
        gameState.selectProfile(idx);
        if (mode === 'arena' && !params.player2) {
          showScreen('profile', { mode: 'arena', player1Index: idx, player2: true });
        } else if (mode === 'arena' && params.player2) {
          gameState.arenaState = {
            player1Index: params.player1Index,
            player2Index: idx,
          };
          showScreen('arena');
        } else {
          showScreen('worldmap');
        }
      });
    });

    div.querySelector('#new-profile').addEventListener('click', () => {
      div.querySelector('#create-form').style.display = 'block';
    });

    div.querySelectorAll('.tier-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        div.querySelectorAll('.tier-btn').forEach(b => b.classList.remove('selected'));
        btn.classList.add('selected');
        selectedTier = btn.dataset.tier;
        const nameInput = div.querySelector('#name-input');
        div.querySelector('#confirm-create').disabled = !(nameInput.value.trim() && selectedTier);
      });
    });

    div.querySelector('#name-input').addEventListener('input', (e) => {
      div.querySelector('#confirm-create').disabled = !(e.target.value.trim() && selectedTier);
    });

    div.querySelector('#confirm-create').addEventListener('click', () => {
      const name = div.querySelector('#name-input').value.trim();
      if (name && selectedTier) {
        gameState.createProfile(name, selectedTier);
        showScreen('profile', params);
      }
    });

    div.querySelector('#back-btn').addEventListener('click', () => showScreen('title'));
  }, 0);

  return div;
}

registerScreen('profile', renderProfileSelect);
```

- [ ] **Step 2: Update js/main.js to wire up title buttons and import profile screen**

Add to bottom of `js/main.js`, replacing the boot section:
```js
import './screens/profile.js';

// Re-register title with working buttons
registerScreen('title', () => {
  const div = document.createElement('div');
  div.className = 'screen';
  div.innerHTML = `
    <h1 style="font-size:3rem; margin-bottom:0.5rem;">文字侠</h1>
    <p style="font-size:1.2rem; color:var(--text-secondary); margin-bottom:2rem;">Word Hero</p>
    <div style="display:flex; flex-direction:column; gap:12px;">
      <button class="btn btn-primary" id="btn-solo">单人模式</button>
      <button class="btn" id="btn-arena">双人对战</button>
      <button class="btn" id="btn-daily">每日挑战</button>
    </div>
  `;
  setTimeout(() => {
    div.querySelector('#btn-solo').addEventListener('click', () => showScreen('profile', { mode: 'solo' }));
    div.querySelector('#btn-arena').addEventListener('click', () => showScreen('profile', { mode: 'arena' }));
    div.querySelector('#btn-daily').addEventListener('click', () => showScreen('profile', { mode: 'daily' }));
  }, 0);
  return div;
});

showScreen('title');
```

- [ ] **Step 3: Create js/screens directory and verify**

Run: Refresh browser, click 单人模式 → see profile screen → create new profile → verify it appears
Expected: Profile creation works, card shows name and tier.

- [ ] **Step 4: Commit**

```bash
git add js/screens/profile.js js/main.js
git commit -m "feat: profile creation and selection screen"
```

---

### Task 4: World Map Screen

**Files:**
- Create: `js/screens/worldmap.js`
- Modify: `js/main.js` (import)

- [ ] **Step 1: Create js/screens/worldmap.js**

```js
// js/screens/worldmap.js — Chapter/quest selection
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';

const CHAPTERS = [
  { id: 1, era: '先秦', name: '文字起源', boss: '仓颉之影', quests: 4, unlocked: true },
  { id: 2, era: '汉代', name: '史记风云', boss: '墨吏', quests: 4, unlocked: false },
  { id: 3, era: '唐代', name: '诗词盛世', boss: '诗魔', quests: 4, unlocked: false },
  { id: 4, era: '宋代', name: '词赋纵横', boss: '词煞', quests: 4, unlocked: false },
  { id: 5, era: '近现代', name: '墨暗之源', boss: '墨暗之主', quests: 5, unlocked: false },
];

function renderWorldMap() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

  const chaptersHTML = CHAPTERS.map(ch => {
    const progress = profile.chapterProgress[ch.id] || { questsCompleted: 0 };
    const isUnlocked = ch.id === 1 || (profile.chapterProgress[ch.id - 1]?.questsCompleted >= CHAPTERS[ch.id - 2]?.quests);
    const statusText = isUnlocked
      ? `${progress.questsCompleted}/${ch.quests} 关`
      : '🔒 未解锁';

    return `
      <div class="chapter-card ${isUnlocked ? 'unlocked' : 'locked'}" data-chapter="${ch.id}">
        <div class="chapter-era">${ch.era}</div>
        <div class="chapter-name">${ch.name}</div>
        <div class="chapter-boss">Boss: ${ch.boss}</div>
        <div class="chapter-progress">${statusText}</div>
      </div>
    `;
  }).join('');

  div.innerHTML = `
    <div style="width:100%; padding:20px;">
      <div style="display:flex; justify-content:space-between; align-items:center; margin-bottom:24px; padding:0 20px;">
        <div>
          <span style="font-size:1.2rem; font-weight:700; color:var(--accent-gold);">${profile.name}</span>
          <span style="color:var(--text-secondary);"> · Lv.${profile.level} · ${profile.tier === 'grade7' ? '七年级' : '三年级'}</span>
        </div>
        <div style="display:flex; gap:12px;">
          <button class="btn" id="btn-inventory" style="padding:8px 16px; font-size:0.9rem;">背包</button>
          <button class="btn" id="btn-chengyu" style="padding:8px 16px; font-size:0.9rem;">成语</button>
          <button class="btn" id="btn-back" style="padding:8px 16px; font-size:0.9rem;">返回</button>
        </div>
      </div>
      <h2 style="text-align:center; margin-bottom:20px;">选择章节</h2>
      <div class="chapter-grid">${chaptersHTML}</div>
    </div>
    <style>
      .chapter-grid { display:flex; gap:16px; flex-wrap:wrap; justify-content:center; padding:0 20px; }
      .chapter-card {
        background:var(--bg-card); border:2px solid var(--bg-secondary); border-radius:8px;
        padding:20px; width:180px; text-align:center; cursor:pointer; transition:all 0.2s;
      }
      .chapter-card.unlocked:hover { border-color:var(--accent-gold); transform:translateY(-2px); }
      .chapter-card.locked { opacity:0.5; cursor:not-allowed; }
      .chapter-era { font-size:0.85rem; color:var(--accent-jade); margin-bottom:4px; }
      .chapter-name { font-size:1.2rem; font-weight:700; color:var(--accent-gold); margin-bottom:8px; }
      .chapter-boss { font-size:0.85rem; color:var(--text-secondary); margin-bottom:4px; }
      .chapter-progress { font-size:0.9rem; color:var(--text-secondary); }
    </style>
  `;

  setTimeout(() => {
    div.querySelectorAll('.chapter-card.unlocked').forEach(card => {
      card.addEventListener('click', () => {
        const chapterId = parseInt(card.dataset.chapter);
        showScreen('quest', { chapterId });
      });
    });
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    div.querySelector('#btn-inventory').addEventListener('click', () => showScreen('inventory'));
    div.querySelector('#btn-chengyu').addEventListener('click', () => showScreen('chengyu'));
  }, 0);

  return div;
}

registerScreen('worldmap', renderWorldMap);
```

- [ ] **Step 2: Import in main.js**

Add to imports in `js/main.js`:
```js
import './screens/worldmap.js';
```

- [ ] **Step 3: Verify**

Run: Refresh, create profile, see world map with Chapter 1 unlocked and 2-5 locked.
**Note:** The 背包 and 成语 buttons navigate to screens created in Chunk 3 (Task 11). They will render blank until then. Chapter click → quest screen works.

- [ ] **Step 4: Commit**

```bash
git add js/screens/worldmap.js js/main.js
git commit -m "feat: world map screen with chapter cards and progress display"
```

---

### Task 5: Quest Screen & Game Engine

**Files:**
- Create: `js/game-engine.js`
- Create: `js/screens/quest.js`
- Create: `js/screens/reward.js`

- [ ] **Step 1: Create js/game-engine.js**

```js
// js/game-engine.js — Generates quest encounter sequences and manages quest state
import { gameState } from './state.js';
import { loadContent, pickQuestions, pickReadingPassage } from './content-loader.js';

// Encounter types: 'combat', 'puzzle', 'boss'
function generateEncounterSequence(chapterId, questIndex) {
  // 4-5 regular encounters + 1 boss at end
  const encounters = [];
  const patterns = [
    ['combat', 'combat', 'puzzle', 'combat', 'boss'],
    ['combat', 'puzzle', 'combat', 'combat', 'boss'],
    ['puzzle', 'combat', 'combat', 'puzzle', 'boss'],
    ['combat', 'combat', 'combat', 'puzzle', 'boss'],
  ];
  const pattern = patterns[questIndex % patterns.length];
  pattern.forEach((type, i) => {
    encounters.push({ type, index: i, completed: false });
  });
  return encounters;
}

export async function startQuest(chapterId, questIndex) {
  const profile = gameState.profile;
  const content = await loadContent(profile.tier);

  const encounters = generateEncounterSequence(chapterId, questIndex);

  // Pre-assign content to encounters
  const diffTarget = getAdaptiveDifficulty(profile, 'vocab');
  for (const enc of encounters) {
    if (enc.type === 'combat') {
      enc.questions = pickQuestions(content.vocab, 5, profile.seenQuestions.vocab, diffTarget);
    } else if (enc.type === 'puzzle') {
      const rdTarget = getAdaptiveDifficulty(profile, 'reading');
      enc.passage = pickReadingPassage(content.reading, profile.seenQuestions.reading, rdTarget);
    } else if (enc.type === 'boss') {
      const clTarget = getAdaptiveDifficulty(profile, 'classical');
      enc.questions = pickQuestions(content.classical, 10, profile.seenQuestions.classical, clTarget);
    }
  }

  gameState.currentQuest = {
    chapterId,
    questIndex,
    encounters,
    currentEncounter: 0,
    results: { correct: 0, total: 0, combo: 0, maxCombo: 0, xpEarned: 0, itemsFound: [] },
  };

  return gameState.currentQuest;
}

export function getAdaptiveDifficulty(profile, contentType) {
  const recent = profile.accuracy[contentType]?.slice(-20) || [];
  if (recent.length < 5) return 3;
  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;
  if (avg > 0.9) return 4;
  if (avg < 0.6) return 2;
  return 3;
}

export function advanceEncounter() {
  const quest = gameState.currentQuest;
  if (!quest) return null;
  quest.currentEncounter++;
  if (quest.currentEncounter >= quest.encounters.length) {
    return null; // quest complete
  }
  return quest.encounters[quest.currentEncounter];
}

export function getCurrentEncounter() {
  const quest = gameState.currentQuest;
  if (!quest) return null;
  return quest.encounters[quest.currentEncounter];
}

export function recordAnswer(contentType, correct) {
  const profile = gameState.profile;
  profile.accuracy[contentType].push(correct ? 1 : 0);
  // Keep last 50
  if (profile.accuracy[contentType].length > 50) {
    profile.accuracy[contentType] = profile.accuracy[contentType].slice(-50);
  }

  const quest = gameState.currentQuest;
  quest.results.total++;
  if (correct) {
    quest.results.correct++;
    quest.results.combo++;
    quest.results.maxCombo = Math.max(quest.results.maxCombo, quest.results.combo);
  } else {
    quest.results.combo = 0;
  }
}
```

- [ ] **Step 2: Create js/screens/quest.js**

```js
// js/screens/quest.js — Quest encounter path visualization
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { startQuest, getCurrentEncounter } from '../game-engine.js';

function renderQuest(params) {
  const div = document.createElement('div');
  div.className = 'screen';
  const { chapterId } = params;
  const profile = gameState.profile;
  const progress = profile.chapterProgress[chapterId] || { questsCompleted: 0 };
  const questIndex = params.questIndex ?? progress.questsCompleted;

  div.innerHTML = `
    <h2 style="margin-bottom:0.5rem;">第${chapterId}章 · 第${questIndex + 1}关</h2>
    <p style="color:var(--text-secondary); margin-bottom:2rem;">准备好迎接挑战了吗？</p>
    <div id="encounter-path" style="display:flex; gap:16px; margin-bottom:2rem;"></div>
    <div style="display:flex; gap:12px;">
      <button class="btn btn-primary" id="btn-start">开始</button>
      <button class="btn" id="btn-back">返回</button>
    </div>
  `;

  setTimeout(async () => {
    const quest = await startQuest(chapterId, questIndex);
    const pathEl = div.querySelector('#encounter-path');
    quest.encounters.forEach((enc, i) => {
      const icon = enc.type === 'combat' ? '⚔️' : enc.type === 'puzzle' ? '📖' : '👹';
      const node = document.createElement('div');
      node.style.cssText = 'width:48px;height:48px;border-radius:50%;background:var(--bg-card);border:2px solid var(--bg-secondary);display:flex;align-items:center;justify-content:center;font-size:1.3rem;';
      node.textContent = icon;
      pathEl.appendChild(node);
      if (i < quest.encounters.length - 1) {
        const line = document.createElement('div');
        line.style.cssText = 'width:24px;height:2px;background:var(--bg-secondary);align-self:center;';
        pathEl.appendChild(line);
      }
    });

    div.querySelector('#btn-start').addEventListener('click', () => {
      const enc = getCurrentEncounter();
      if (enc.type === 'combat') showScreen('combat');
      else if (enc.type === 'puzzle') showScreen('puzzle');
      else if (enc.type === 'boss') showScreen('boss');
    });
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
  }, 0);

  return div;
}

registerScreen('quest', renderQuest);
```

- [ ] **Step 3: Create js/screens/reward.js**

**Note:** This file imports `addXP` from `progression.js`, which is created in Task 9 (Chunk 2). Until then, create a temporary stub at `js/progression.js`:
```js
// js/progression.js — STUB, replaced in Task 9
export function addXP(amount) { return null; }
export function getXPProgress(profile) { return { current: 0, needed: 100, percent: 0 }; }
export function hasAbility(profile, ability) { return false; }
```

```js
// js/screens/reward.js — Post-quest reward summary
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { addXP } from '../progression.js';

function renderReward() {
  const div = document.createElement('div');
  div.className = 'screen';
  const quest = gameState.currentQuest;
  const results = quest.results;
  const accuracy = quest.results.total > 0
    ? Math.round((results.correct / results.total) * 100)
    : 0;

  // Calculate XP
  const baseXP = results.correct * 10;
  const comboBonus = results.maxCombo * 5;
  const totalXP = baseXP + comboBonus;
  results.xpEarned = totalXP;

  // Apply XP and save
  const levelUpInfo = addXP(totalXP);

  // Mark quest as completed
  const profile = gameState.profile;
  if (!profile.chapterProgress[quest.chapterId]) {
    profile.chapterProgress[quest.chapterId] = { questsCompleted: 0 };
  }
  const cp = profile.chapterProgress[quest.chapterId];
  if (quest.questIndex >= cp.questsCompleted) {
    cp.questsCompleted = quest.questIndex + 1;
  }
  gameState.save();

  div.innerHTML = `
    <h2 style="margin-bottom:1.5rem;">🎉 任务完成！</h2>
    <div style="background:var(--bg-card); border-radius:8px; padding:24px 40px; margin-bottom:1.5rem;">
      <div style="font-size:1.1rem; margin-bottom:12px;">正确率: <span style="color:var(--accent-gold); font-weight:700;">${accuracy}%</span> (${results.correct}/${results.total})</div>
      <div style="font-size:1.1rem; margin-bottom:12px;">最高连击: <span style="color:var(--accent-jade); font-weight:700;">${results.maxCombo}</span></div>
      <div style="font-size:1.1rem; margin-bottom:12px;">获得经验: <span style="color:var(--accent-gold); font-weight:700;">+${totalXP} XP</span></div>
      ${levelUpInfo ? `<div style="font-size:1.2rem; color:var(--accent-gold); font-weight:700; margin-top:8px;">🎊 升级到 Lv.${levelUpInfo.newLevel}！${levelUpInfo.unlock ? ' 解锁: ' + levelUpInfo.unlock : ''}</div>` : ''}
    </div>
    <div style="display:flex; gap:12px;">
      <button class="btn btn-primary" id="btn-continue">继续</button>
      <button class="btn" id="btn-map">返回地图</button>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-continue').addEventListener('click', () => {
      showScreen('quest', { chapterId: quest.chapterId, questIndex: quest.questIndex + 1 });
    });
    div.querySelector('#btn-map').addEventListener('click', () => showScreen('worldmap'));
  }, 0);

  return div;
}

registerScreen('reward', renderReward);
```

- [ ] **Step 4: Import all new screens in main.js**

Add to imports:
```js
import './screens/quest.js';
import './screens/reward.js';
```

- [ ] **Step 5: Verify quest screen shows encounter path**

Run: Refresh, create profile, click Chapter 1, see encounter icons.
**Note:** Do NOT click "开始" — combat/puzzle/boss screens are created in Chunk 2 (Tasks 6-8). The quest screen will show the encounter path correctly but navigating forward requires those screens.

- [ ] **Step 6: Commit**

```bash
git add js/game-engine.js js/progression.js js/screens/quest.js js/screens/reward.js js/main.js
git commit -m "feat: game engine, quest screen with encounter path, reward screen"
```

---

## Chunk 2: Gameplay Systems

### Task 6: Combat Screen

**Files:**
- Create: `js/screens/combat.js`
- Modify: `js/main.js` (import)

- [ ] **Step 1: Create js/screens/combat.js**

```js
// js/screens/combat.js — Vocab combat encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';

const ENEMY_NAMES = ['墨灵', '暗字兵', '墨影卫', '乱笔妖', '黑墨士'];

function renderCombat() {
  const div = document.createElement('div');
  div.className = 'screen';
  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  const questions = encounter.questions;
  let qIndex = 0;
  let playerHp = profile.hp;
  let enemyHp = 100;
  let combo = 0;
  let timerInterval = null;
  const enemyName = ENEMY_NAMES[Math.floor(Math.random() * ENEMY_NAMES.length)];
  const baseTimer = 15 + (profile.speed * 1.5);

  function render() {
    const q = questions[qIndex];
    if (!q) { endCombat(true); return; }
    const optionsHTML = q.options.map((opt, i) => `
      <button class="combat-option" data-idx="${i}">${opt}</button>
    `).join('');

    div.innerHTML = `
      <style>
        .combat-hud { display:flex; justify-content:space-between; width:100%; padding:16px 32px; }
        .hp-section { text-align:center; }
        .hp-bar-bg { width:200px; height:16px; background:var(--bg-secondary); border-radius:8px; overflow:hidden; margin-top:4px; }
        .hp-bar { height:100%; border-radius:8px; transition:width 0.3s; }
        .hp-player { background:var(--hp-green); }
        .hp-enemy { background:var(--hp-red); }
        .timer-bar-bg { width:80%; max-width:500px; height:8px; background:var(--bg-secondary); border-radius:4px; overflow:hidden; margin:12px auto; }
        .timer-bar { height:100%; background:var(--timer-yellow); border-radius:4px; transition:width 0.1s linear; }
        .combo-display { font-size:1.2rem; color:var(--accent-gold); font-weight:700; min-height:1.5em; }
        .combat-question { font-size:1.3rem; margin:16px 0; padding:0 32px; text-align:center; }
        .combat-options { display:grid; grid-template-columns:1fr 1fr; gap:12px; padding:0 32px; max-width:600px; width:100%; }
        .combat-option {
          font-family:var(--font-main); font-size:1rem; padding:14px 20px; background:var(--bg-card);
          border:2px solid var(--bg-secondary); color:var(--text-primary); border-radius:8px;
          cursor:pointer; transition:all 0.2s; text-align:center;
        }
        .combat-option:hover { border-color:var(--accent-gold); }
        .combat-option.correct { border-color:var(--accent-jade); background:rgba(39,174,96,0.2); }
        .combat-option.wrong { border-color:var(--accent-red); background:rgba(192,57,43,0.2); }
        .feedback-text { font-size:0.95rem; color:var(--text-secondary); margin-top:12px; padding:0 32px; text-align:center; min-height:3em; }
        .battle-sprite { font-size:3rem; margin:8px 0; }
      </style>
      <div class="combat-hud">
        <div class="hp-section">
          <div style="font-weight:700;">${profile.name}</div>
          <div class="hp-bar-bg"><div class="hp-bar hp-player" id="player-hp" style="width:${(playerHp/profile.maxHp)*100}%"></div></div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">HP: ${playerHp}/${profile.maxHp}</div>
        </div>
        <div class="combo-display" id="combo">${combo > 1 ? combo + ' 连击！' : ''}</div>
        <div class="hp-section">
          <div style="font-weight:700; color:var(--accent-red);">${enemyName}</div>
          <div class="hp-bar-bg"><div class="hp-bar hp-enemy" id="enemy-hp" style="width:${enemyHp}%"></div></div>
          <div style="font-size:0.8rem; color:var(--text-secondary);">HP: ${enemyHp}%</div>
        </div>
      </div>
      <div class="battle-sprite">⚔️</div>
      <div class="timer-bar-bg"><div class="timer-bar" id="timer-bar" style="width:100%"></div></div>
      <div class="combat-question">${q.prompt}</div>
      <div class="combat-options" id="options">${optionsHTML}</div>
      <div class="feedback-text" id="feedback"></div>
    `;

    // Start timer
    let timeLeft = baseTimer;
    const timerBar = div.querySelector('#timer-bar');
    clearInterval(timerInterval);
    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      if (timerBar) timerBar.style.width = Math.max(0, (timeLeft / baseTimer) * 100) + '%';
      if (timeLeft <= 0) {
        clearInterval(timerInterval);
        handleAnswer(-1, q);
      }
    }, 100);

    // Option click handlers
    div.querySelectorAll('.combat-option').forEach(btn => {
      btn.addEventListener('click', () => {
        clearInterval(timerInterval);
        const idx = parseInt(btn.dataset.idx);
        handleAnswer(idx, q);
      });
    });
  }

  function handleAnswer(idx, q) {
    const correct = idx === q.correct;
    const buttons = div.querySelectorAll('.combat-option');
    buttons.forEach(btn => {
      btn.style.pointerEvents = 'none';
      const bIdx = parseInt(btn.dataset.idx);
      if (bIdx === q.correct) btn.classList.add('correct');
      else if (bIdx === idx) btn.classList.add('wrong');
    });

    recordAnswer('vocab', correct);

    // Track seen vocab questions
    if (!profile.seenQuestions.vocab.includes(q.id)) {
      profile.seenQuestions.vocab.push(q.id);
    }

    if (correct) {
      combo++;
      const dmgMultiplier = 1 + (combo > 1 ? combo * 0.15 : 0) + (profile.attack * 0.01);
      const dmg = Math.round(20 * dmgMultiplier);
      enemyHp = Math.max(0, enemyHp - dmg);
      div.querySelector('#feedback').textContent = `✓ 正确！造成 ${dmg} 点伤害！${q.explanation}`;
    } else {
      combo = 0;
      const hpLoss = Math.round(15 * (1 - profile.defense * 0.01));
      playerHp = Math.max(0, playerHp - hpLoss);
      div.querySelector('#feedback').textContent = `✗ 错误！失去 ${hpLoss} HP。${q.explanation}`;
    }

    // Update quest combo tracking
    const quest = gameState.currentQuest;
    quest.results.combo = combo;

    setTimeout(() => {
      if (enemyHp <= 0) { endCombat(true); return; }
      if (playerHp <= 0) { endCombat(false); return; }
      qIndex++;
      if (qIndex >= questions.length) { endCombat(true); return; }
      render();
    }, 1800);
  }

  function endCombat(won) {
    clearInterval(timerInterval);
    encounter.completed = won;
    profile.hp = playerHp;
    gameState.save();

    if (!won) {
      div.innerHTML = `
        <div class="screen">
          <h2 style="color:var(--accent-red);">战斗失败</h2>
          <p style="margin:1rem 0;">你被${enemyName}击败了……</p>
          <button class="btn btn-primary" id="btn-retry">重试</button>
          <button class="btn" id="btn-retreat" style="margin-top:8px;">撤退</button>
        </div>
      `;
      setTimeout(() => {
        div.querySelector('#btn-retry').addEventListener('click', () => {
          profile.hp = profile.maxHp;
          showScreen('combat');
        });
        div.querySelector('#btn-retreat').addEventListener('click', () => showScreen('worldmap'));
      }, 0);
      return;
    }

    // Advance to next encounter
    const next = advanceEncounter();
    if (!next) {
      showScreen('reward');
    } else {
      if (next.type === 'combat') showScreen('combat');
      else if (next.type === 'puzzle') showScreen('puzzle');
      else if (next.type === 'boss') showScreen('boss');
    }
  }

  render();
  return div;
}

registerScreen('combat', renderCombat);
```

- [ ] **Step 2: Import in main.js**

Add: `import './screens/combat.js';`

- [ ] **Step 3: Verify**

Run: Start a quest, click 开始, see combat screen with HP bars, timer, question, 4 options. Click an option — see correct/wrong feedback, HP changes, auto-advance.

- [ ] **Step 4: Commit**

```bash
git add js/screens/combat.js js/main.js
git commit -m "feat: combat encounter with timer, combos, and HP mechanics"
```

---

### Task 7: Puzzle Screen (Reading Comprehension)

**Files:**
- Create: `js/screens/puzzle.js`
- Modify: `js/main.js` (import)

- [ ] **Step 1: Create js/screens/puzzle.js**

```js
// js/screens/puzzle.js — Reading comprehension encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';

function renderPuzzle() {
  const div = document.createElement('div');
  div.className = 'screen';
  const encounter = getCurrentEncounter();
  const passage = encounter.passage;
  const questions = passage.questions;
  let qIndex = 0;
  let correctCount = 0;

  function render() {
    const q = questions[qIndex];
    const optionsHTML = q.options.map((opt, i) => `
      <button class="puzzle-option" data-idx="${i}">${opt}</button>
    `).join('');

    div.innerHTML = `
      <style>
        .puzzle-layout { display:flex; width:100%; height:100vh; }
        .puzzle-passage {
          flex:1; padding:32px; overflow-y:auto; background:var(--bg-secondary);
          border-right:2px solid var(--bg-card);
        }
        .puzzle-passage h3 { color:var(--accent-gold); margin-bottom:12px; }
        .puzzle-passage p { line-height:1.8; font-size:1.05rem; }
        .puzzle-right { flex:1; padding:32px; display:flex; flex-direction:column; justify-content:center; }
        .puzzle-progress { font-size:0.9rem; color:var(--text-secondary); margin-bottom:12px; }
        .puzzle-question { font-size:1.2rem; margin-bottom:20px; }
        .puzzle-options { display:flex; flex-direction:column; gap:10px; }
        .puzzle-option {
          font-family:var(--font-main); font-size:1rem; padding:14px 20px; background:var(--bg-card);
          border:2px solid var(--bg-secondary); color:var(--text-primary); border-radius:8px;
          cursor:pointer; transition:all 0.2s; text-align:left;
        }
        .puzzle-option:hover { border-color:var(--accent-gold); }
        .puzzle-option.correct { border-color:var(--accent-jade); background:rgba(39,174,96,0.2); }
        .puzzle-option.wrong { border-color:var(--accent-red); background:rgba(192,57,43,0.2); }
        .puzzle-feedback { font-size:0.95rem; color:var(--text-secondary); margin-top:12px; min-height:2em; }
      </style>
      <div class="puzzle-layout">
        <div class="puzzle-passage">
          <h3>📖 ${passage.title}</h3>
          <p>${passage.passage}</p>
        </div>
        <div class="puzzle-right">
          <div class="puzzle-progress">问题 ${qIndex + 1} / ${questions.length}</div>
          <div class="puzzle-question">${q.prompt}</div>
          <div class="puzzle-options">${optionsHTML}</div>
          <div class="puzzle-feedback" id="feedback"></div>
        </div>
      </div>
    `;

    div.querySelectorAll('.puzzle-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;
        div.querySelectorAll('.puzzle-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) b.classList.add('correct');
          else if (bIdx === idx) b.classList.add('wrong');
        });

        recordAnswer('reading', correct);
        if (correct) correctCount++;

        div.querySelector('#feedback').textContent = correct
          ? `✓ 正确！${q.explanation}`
          : `✗ 错误。${q.explanation}`;

        // Track seen
        const profile = gameState.profile;
        if (!profile.seenQuestions.reading.includes(passage.id)) {
          profile.seenQuestions.reading.push(passage.id);
        }

        setTimeout(() => {
          qIndex++;
          if (qIndex >= questions.length) {
            endPuzzle();
          } else {
            render();
          }
        }, 2000);
      });
    });
  }

  function endPuzzle() {
    encounter.completed = true;
    gameState.save();

    const next = advanceEncounter();
    if (!next) {
      showScreen('reward');
    } else {
      if (next.type === 'combat') showScreen('combat');
      else if (next.type === 'puzzle') showScreen('puzzle');
      else if (next.type === 'boss') showScreen('boss');
    }
  }

  render();
  return div;
}

registerScreen('puzzle', renderPuzzle);
```

- [ ] **Step 2: Import in main.js**

Add: `import './screens/puzzle.js';`

- [ ] **Step 3: Verify**

Run: Play through combats until a puzzle encounter (📖 icon). See passage on left, question on right, no timer. Answer → feedback → next question → auto-advance.

- [ ] **Step 4: Commit**

```bash
git add js/screens/puzzle.js js/main.js
git commit -m "feat: reading comprehension puzzle screen with passage display"
```

---

### Task 8: Boss Battle Screen

**Files:**
- Create: `js/screens/boss.js`
- Modify: `js/main.js` (import)

- [ ] **Step 1: Create js/screens/boss.js**

```js
// js/screens/boss.js — Classical Chinese boss battle with 3 phases
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getCurrentEncounter, advanceEncounter, recordAnswer } from '../game-engine.js';

const BOSS_NAMES = {
  1: { name: '仓颉之影', sprite: '👹' },
  2: { name: '墨吏', sprite: '👺' },
  3: { name: '诗魔', sprite: '🐉' },
  4: { name: '词煞', sprite: '💀' },
  5: { name: '墨暗之主', sprite: '🌑' },
};

function renderBoss() {
  const div = document.createElement('div');
  div.className = 'screen';
  const encounter = getCurrentEncounter();
  const profile = gameState.profile;
  const quest = gameState.currentQuest;
  const bossInfo = BOSS_NAMES[quest.chapterId] || BOSS_NAMES[1];
  const allQuestions = encounter.questions;

  // Split into 3 phases: 3-4 questions each
  const phases = [
    allQuestions.slice(0, 3),
    allQuestions.slice(3, 7),
    allQuestions.slice(7, 10),
  ].filter(p => p.length > 0);

  let phase = 0;
  let qIndex = 0;
  let playerHp = profile.hp;
  let bossHp = 100;
  // Phase transitions trigger at HP thresholds: phase 0 (100-66%), phase 1 (66-33%), phase 2 (33-0%)
  const phaseThresholds = [66, 33, 0];

  function getCurrentPhaseForHp() {
    if (bossHp > 66) return 0;
    if (bossHp > 33) return 1;
    return 2;
  }

  function render() {
    // Check if boss HP has crossed a phase threshold
    const hpPhase = getCurrentPhaseForHp();
    if (hpPhase > phase) {
      phase = hpPhase;
      qIndex = 0;
    }

    const currentPhase = phases[phase];
    if (!currentPhase || qIndex >= currentPhase.length) {
      if (bossHp <= 0) { endBoss(true); return; }
      // All questions in current phase answered — advance phase
      phase++;
      qIndex = 0;
      if (phase >= phases.length) { endBoss(true); return; }
      render();
      return;
    }

    const q = currentPhase[qIndex];
    const phaseLabel = ['第一阶段：句意翻译', '第二阶段：虚词辨析', '第三阶段：篇章理解'][phase] || '';
    const optionsHTML = q.options.map((opt, i) => `
      <button class="boss-option" data-idx="${i}">${opt}</button>
    `).join('');

    div.innerHTML = `
      <style>
        .boss-header { text-align:center; margin-bottom:8px; }
        .boss-sprite { font-size:4rem; margin:4px 0; }
        .boss-phase { font-size:0.9rem; color:var(--accent-jade); margin-bottom:8px; }
        .boss-hud { display:flex; justify-content:space-between; width:100%; padding:0 32px; margin-bottom:12px; }
        .boss-hp-bg { width:250px; height:18px; background:var(--bg-secondary); border-radius:9px; overflow:hidden; }
        .boss-hp { height:100%; background:var(--accent-red); border-radius:9px; transition:width 0.5s; }
        .player-hp { height:100%; background:var(--hp-green); border-radius:9px; transition:width 0.5s; }
        .boss-question { font-size:1.2rem; margin:16px 32px; text-align:center; background:var(--bg-card); padding:20px; border-radius:8px; border-left:4px solid var(--accent-gold); }
        .boss-options { display:flex; flex-direction:column; gap:10px; padding:0 32px; max-width:600px; margin:0 auto; width:100%; }
        .boss-option {
          font-family:var(--font-main); font-size:1rem; padding:14px 20px; background:var(--bg-card);
          border:2px solid var(--bg-secondary); color:var(--text-primary); border-radius:8px;
          cursor:pointer; transition:all 0.2s; text-align:left;
        }
        .boss-option:hover { border-color:var(--accent-red); }
        .boss-option.correct { border-color:var(--accent-jade); background:rgba(39,174,96,0.2); }
        .boss-option.wrong { border-color:var(--accent-red); background:rgba(192,57,43,0.2); }
        .boss-feedback { font-size:0.95rem; color:var(--text-secondary); margin-top:12px; padding:0 32px; text-align:center; min-height:3em; }
      </style>
      <div class="boss-header">
        <div class="boss-sprite">${bossInfo.sprite}</div>
        <h2 style="color:var(--accent-red); margin:0;">${bossInfo.name}</h2>
        <div class="boss-phase">${phaseLabel}</div>
      </div>
      <div class="boss-hud">
        <div>
          <div style="font-weight:700;">${profile.name} HP</div>
          <div class="boss-hp-bg"><div class="player-hp" style="width:${(playerHp/profile.maxHp)*100}%"></div></div>
        </div>
        <div style="text-align:right;">
          <div style="font-weight:700; color:var(--accent-red);">BOSS HP</div>
          <div class="boss-hp-bg"><div class="boss-hp" style="width:${bossHp}%"></div></div>
        </div>
      </div>
      <div class="boss-question">${q.prompt}</div>
      <div class="boss-options">${optionsHTML}</div>
      <div class="boss-feedback" id="feedback"></div>
    `;

    div.querySelectorAll('.boss-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const correct = idx === q.correct;
        div.querySelectorAll('.boss-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) b.classList.add('correct');
          else if (bIdx === idx) b.classList.add('wrong');
        });

        recordAnswer('classical', correct);

        if (correct) {
          const dmg = Math.round(12 * (1 + profile.attack * 0.01));
          bossHp = Math.max(0, bossHp - dmg);
          div.querySelector('#feedback').textContent = `✓ 正确！对${bossInfo.name}造成 ${dmg} 点伤害！${q.explanation}`;
        } else {
          const hpLoss = Math.round(20 * (1 - profile.defense * 0.01));
          playerHp = Math.max(0, playerHp - hpLoss);
          div.querySelector('#feedback').textContent = `✗ 错误！${bossInfo.name}反击，失去 ${hpLoss} HP。${q.explanation}`;
        }

        // Track seen
        if (!profile.seenQuestions.classical.includes(q.id)) {
          profile.seenQuestions.classical.push(q.id);
        }

        setTimeout(() => {
          if (playerHp <= 0) { endBoss(false); return; }
          if (bossHp <= 0) { endBoss(true); return; }
          qIndex++;
          render();
        }, 2200);
      });
    });
  }

  function endBoss(won) {
    encounter.completed = won;
    profile.hp = playerHp;
    gameState.save();

    if (!won) {
      div.innerHTML = `
        <div class="screen">
          <h2 style="color:var(--accent-red);">败北……</h2>
          <p style="margin:1rem 0;">${bossInfo.name}将你击败了。</p>
          <div style="display:flex; gap:12px; justify-content:center;">
            <button class="btn btn-primary" id="btn-retry">再战一次</button>
            <button class="btn" id="btn-retreat">撤退</button>
          </div>
        </div>
      `;
      setTimeout(() => {
        div.querySelector('#btn-retry').addEventListener('click', () => {
          profile.hp = profile.maxHp;
          showScreen('boss');
        });
        div.querySelector('#btn-retreat').addEventListener('click', () => showScreen('worldmap'));
      }, 0);
      return;
    }

    // Boss defeated — advance
    const next = advanceEncounter();
    if (!next) {
      showScreen('reward');
    } else {
      if (next.type === 'combat') showScreen('combat');
      else if (next.type === 'puzzle') showScreen('puzzle');
      else if (next.type === 'boss') showScreen('boss');
    }
  }

  render();
  return div;
}

registerScreen('boss', renderBoss);
```

- [ ] **Step 2: Import in main.js**

Add: `import './screens/boss.js';`

- [ ] **Step 3: Verify**

Run: Play through a full quest to the boss encounter (👹 icon). See boss sprite, 3 phases, HP bars. Answer questions — boss takes damage on correct, player takes damage on wrong. Phase transitions visible. Quest completes to reward screen.

- [ ] **Step 4: Commit**

```bash
git add js/screens/boss.js js/main.js
git commit -m "feat: boss battle with 3-phase classical Chinese challenges"
```

---

### Task 9: Progression System

**Files:**
- Create: `js/progression.js`

- [ ] **Step 1: Create js/progression.js**

```js
// js/progression.js — XP, leveling, and unlock management
import { gameState } from './state.js';

const UNLOCKS = {
  2: { type: 'ability', name: '提示 (Hint)' },
  3: { type: 'slot', name: '武器槽' },
  5: { type: 'ability', name: '跳过 (Skip)' },
  7: { type: 'slot', name: '防具槽' },
  10: { type: 'ability', name: '双倍 (Double)' },
};

export function xpForLevel(level) {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function addXP(amount) {
  const profile = gameState.profile;
  profile.xp += amount;

  let leveledUp = false;
  let newLevel = profile.level;
  let unlock = null;

  while (profile.xp >= xpForLevel(newLevel)) {
    profile.xp -= xpForLevel(newLevel);
    newLevel++;
    leveledUp = true;

    // Level 15+ stat boosts every 5 levels
    if (newLevel >= 15 && newLevel % 5 === 0) {
      profile.maxHp += 10;
      profile.maxWenli += 1;
    }

    if (UNLOCKS[newLevel]) {
      unlock = UNLOCKS[newLevel].name;
    }
  }

  if (leveledUp) {
    profile.level = newLevel;
    profile.hp = profile.maxHp; // Full heal on level up
    profile.wenli = profile.maxWenli;
  }

  gameState.save();

  return leveledUp ? { newLevel, unlock } : null;
}

export function getXPProgress(profile) {
  const needed = xpForLevel(profile.level);
  return { current: profile.xp, needed, percent: Math.round((profile.xp / needed) * 100) };
}

export function hasAbility(profile, ability) {
  const abilityLevels = { hint: 2, skip: 5, double: 10 };
  return profile.level >= (abilityLevels[ability] || 999);
}
```

- [ ] **Step 2: Verify reward screen uses progression**

Run: Complete a quest. Reward screen should show XP earned and level-up notification if applicable.

- [ ] **Step 3: Commit**

```bash
git add js/progression.js
git commit -m "feat: XP and leveling system with unlock progression"
```

---

## Chunk 3: Metagame, Arena & Polish

### Task 10: 文力 Abilities & HP Regeneration

**Files:**
- Modify: `js/screens/combat.js` (add ability buttons)
- Modify: `js/screens/boss.js` (add ability buttons)
- Modify: `js/game-engine.js` (add HP/文力 regeneration)

- [ ] **Step 1: Add HP and 文力 regeneration to quest start**

In `js/game-engine.js`, inside `startQuest()`, before creating the quest object, add:
```js
// Regenerate HP and 文力 between quests
profile.hp = profile.maxHp;
profile.wenli = profile.maxWenli;
gameState.save();
```

- [ ] **Step 2: Add ability buttons to combat screen**

In `js/screens/combat.js`, add import: `import { hasAbility } from '../progression.js';`

Inside the `render()` function, after the combat-options div and before the feedback div, add:
```html
<div style="display:flex;gap:8px;justify-content:center;margin-top:12px;" id="abilities">
  <!-- Buttons rendered conditionally based on hasAbility and wenli -->
</div>
```

Render ability buttons conditionally:
```js
const abilitiesEl = div.querySelector('#abilities');
if (abilitiesEl) {
  let btns = '';
  if (hasAbility(profile, 'hint') ) btns += `<button class="btn" id="btn-hint" style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 1 ? 'disabled' : ''}>提示 (1文力)</button>`;
  if (hasAbility(profile, 'skip'))  btns += `<button class="btn" id="btn-skip" style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>跳过 (2文力)</button>`;
  if (hasAbility(profile, 'double')) btns += `<button class="btn" id="btn-double" style="padding:6px 14px;font-size:0.85rem;" ${profile.wenli < 2 ? 'disabled' : ''}>双倍 (2文力)</button>`;
  abilitiesEl.innerHTML = btns;
}
```

Add event handlers:
```js
// Hint: eliminate one wrong option, costs 1 文力
const hintBtn = div.querySelector('#btn-hint');
if (hintBtn) hintBtn.addEventListener('click', () => {
  if (profile.wenli < 1) return;
  profile.wenli--;
  const wrongBtns = [...div.querySelectorAll('.combat-option')].filter(b => parseInt(b.dataset.idx) !== q.correct);
  if (wrongBtns.length > 1) {
    wrongBtns[0].style.opacity = '0.3';
    wrongBtns[0].style.pointerEvents = 'none';
  }
  hintBtn.disabled = true;
});

// Skip: skip question, costs 2 文力
const skipBtn = div.querySelector('#btn-skip');
if (skipBtn) skipBtn.addEventListener('click', () => {
  if (profile.wenli < 2) return;
  profile.wenli -= 2;
  clearInterval(timerInterval);
  qIndex++;
  if (qIndex >= questions.length) { endCombat(true); return; }
  render();
});

// Double: next correct = 2x damage, costs 2 文力
let doubleActive = false;
const doubleBtn = div.querySelector('#btn-double');
if (doubleBtn) doubleBtn.addEventListener('click', () => {
  if (profile.wenli < 2) return;
  profile.wenli -= 2;
  doubleActive = true;
  doubleBtn.disabled = true;
  doubleBtn.textContent = '双倍 ✓';
});
```

In `handleAnswer`, when calculating damage on correct answer, multiply by 2 if `doubleActive`, then set `doubleActive = false`.

- [ ] **Step 3: Add same abilities to boss screen**

Apply identical ability UI pattern to `js/screens/boss.js`. Same 文力 pool, same three abilities.

- [ ] **Step 4: Verify**

Run: Level up to 2+ → see 提示 button in combat → use it → one wrong option greys out. Test 跳过 and 双倍 at levels 5 and 10.

- [ ] **Step 5: Commit**

```bash
git add js/screens/combat.js js/screens/boss.js js/game-engine.js
git commit -m "feat: 文力 abilities (hint, skip, double) and HP/wenli regeneration"
```

---

### Task 11: Daily Challenge Screen

**Files:**
- Create: `js/screens/daily.js`
- Modify: `js/main.js` (import)

- [ ] **Step 1: Create js/screens/daily.js**

```js
// js/screens/daily.js — Daily challenge encounter
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadContent, pickQuestions, pickReadingPassage } from '../content-loader.js';
import { recordAnswer } from '../game-engine.js';
import { addXP } from '../progression.js';

function getDailySeed() {
  const d = new Date();
  return `${d.getFullYear()}-${d.getMonth()}-${d.getDate()}`;
}

function seededRandom(seed) {
  let h = 0;
  for (let i = 0; i < seed.length; i++) {
    h = ((h << 5) - h + seed.charCodeAt(i)) | 0;
  }
  return () => {
    h = (h * 1103515245 + 12345) & 0x7fffffff;
    return h / 0x7fffffff;
  };
}

async function renderDaily() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const today = getDailySeed();

  // Check if already completed today
  if (profile.lastDailyDate === today) {
    div.innerHTML = `
      <h2>每日挑战</h2>
      <p style="margin:1rem 0; color:var(--text-secondary);">今日挑战已完成！明天再来吧。</p>
      <p style="color:var(--accent-gold);">连续打卡：${profile.dailyStreak} 天</p>
      <button class="btn" id="btn-back" style="margin-top:1.5rem;">返回</button>
    `;
    setTimeout(() => {
      div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    }, 0);
    return div;
  }

  const content = await loadContent(profile.tier);
  const rng = seededRandom(today + profile.tier);

  // Seeded shuffle to ensure deterministic daily selection
  function seededPick(arr, count) {
    const shuffled = [...arr].sort((a, b) => rng() - 0.5);
    return shuffled.slice(0, count);
  }

  // Pick 3 vocab + 1 reading passage + 2 classical = mixed challenge
  const recentVocab = profile.seenQuestions.vocab.slice(-20);
  const recentReading = profile.seenQuestions.reading.slice(-10);
  const recentClassical = profile.seenQuestions.classical.slice(-20);
  const vocabQs = seededPick(content.vocab.filter(q => !recentVocab.includes(q.id)), 3);
  const availPassages = content.reading.filter(p => !recentReading.includes(p.id));
  const passage = availPassages.length > 0 ? seededPick(availPassages, 1)[0] : content.reading[0];
  const classicalQs = seededPick(content.classical.filter(q => !recentClassical.includes(q.id)), 2);

  // Build a sequence of all questions with type tags
  const sequence = [
    ...vocabQs.map(q => ({ ...q, contentType: 'vocab' })),
    ...passage.questions.map(q => ({ ...q, contentType: 'reading', passageTitle: passage.title, passageText: passage.passage })),
    ...classicalQs.map(q => ({ ...q, contentType: 'classical' })),
  ];

  let qIndex = 0;
  let correct = 0;
  let total = 0;

  // Init quest-like tracking for recordAnswer
  gameState.currentQuest = {
    chapterId: 0, questIndex: 0,
    encounters: [], currentEncounter: 0,
    results: { correct: 0, total: 0, combo: 0, maxCombo: 0, xpEarned: 0, itemsFound: [] },
  };

  function render() {
    if (qIndex >= sequence.length) { endDaily(); return; }
    const q = sequence[qIndex];
    const typeLabel = { vocab: '字词', reading: '阅读', classical: '文言文' }[q.contentType];
    const contextHTML = q.passageText
      ? `<div style="background:var(--bg-secondary);padding:16px;border-radius:8px;margin-bottom:16px;line-height:1.8;max-height:200px;overflow-y:auto;"><strong>${q.passageTitle}</strong><br>${q.passageText}</div>`
      : '';
    const optionsHTML = q.options.map((opt, i) => `
      <button class="daily-option" data-idx="${i}" style="font-family:var(--font-main);font-size:1rem;padding:12px 20px;background:var(--bg-card);border:2px solid var(--bg-secondary);color:var(--text-primary);border-radius:8px;cursor:pointer;text-align:left;transition:all 0.2s;">${opt}</button>
    `).join('');

    div.innerHTML = `
      <h2 style="margin-bottom:4px;">每日挑战</h2>
      <div style="color:var(--text-secondary);margin-bottom:16px;">第 ${qIndex+1}/${sequence.length} 题 · ${typeLabel}</div>
      ${contextHTML}
      <div style="font-size:1.2rem;margin-bottom:20px;padding:0 32px;text-align:center;">${q.prompt}</div>
      <div style="display:flex;flex-direction:column;gap:10px;max-width:550px;width:100%;padding:0 32px;">${optionsHTML}</div>
      <div id="feedback" style="font-size:0.95rem;color:var(--text-secondary);margin-top:12px;text-align:center;min-height:2em;padding:0 32px;"></div>
    `;

    div.querySelectorAll('.daily-option').forEach(btn => {
      btn.addEventListener('click', () => {
        const idx = parseInt(btn.dataset.idx);
        const isCorrect = idx === q.correct;
        div.querySelectorAll('.daily-option').forEach(b => {
          b.style.pointerEvents = 'none';
          const bIdx = parseInt(b.dataset.idx);
          if (bIdx === q.correct) { b.style.borderColor = 'var(--accent-jade)'; b.style.background = 'rgba(39,174,96,0.2)'; }
          else if (bIdx === idx) { b.style.borderColor = 'var(--accent-red)'; b.style.background = 'rgba(192,57,43,0.2)'; }
        });
        recordAnswer(q.contentType, isCorrect);
        total++;
        if (isCorrect) correct++;
        div.querySelector('#feedback').textContent = isCorrect
          ? `✓ 正确！${q.explanation}`
          : `✗ 错误。${q.explanation}`;
        setTimeout(() => { qIndex++; render(); }, 2000);
      });
    });
  }

  function endDaily() {
    // Update streak
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdaySeed = `${yesterday.getFullYear()}-${yesterday.getMonth()}-${yesterday.getDate()}`;
    if (profile.lastDailyDate === yesterdaySeed) {
      profile.dailyStreak++;
    } else {
      profile.dailyStreak = 1;
    }
    profile.lastDailyDate = today;

    const streakBonus = Math.min(profile.dailyStreak * 5, 50);
    const baseXP = correct * 10;
    const totalXP = baseXP + streakBonus;
    const levelUp = addXP(totalXP);
    gameState.save();

    div.innerHTML = `
      <h2 style="margin-bottom:1.5rem;">每日挑战完成！</h2>
      <div style="background:var(--bg-card);border-radius:8px;padding:24px 40px;">
        <div style="font-size:1.1rem;margin-bottom:8px;">正确率: <span style="color:var(--accent-gold);font-weight:700;">${Math.round(correct/total*100)}%</span> (${correct}/${total})</div>
        <div style="font-size:1.1rem;margin-bottom:8px;">连续打卡: <span style="color:var(--accent-jade);font-weight:700;">${profile.dailyStreak} 天</span></div>
        <div style="font-size:1.1rem;margin-bottom:8px;">经验: <span style="color:var(--accent-gold);font-weight:700;">+${totalXP} XP</span> (含打卡奖励 +${streakBonus})</div>
        ${levelUp ? `<div style="font-size:1.2rem;color:var(--accent-gold);font-weight:700;margin-top:8px;">升级到 Lv.${levelUp.newLevel}！</div>` : ''}
      </div>
      <button class="btn btn-primary" id="btn-back" style="margin-top:1.5rem;">返回</button>
    `;
    setTimeout(() => {
      div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    }, 0);
  }

  render();
  return div;
}

registerScreen('daily', renderDaily);
```

- [ ] **Step 2: Wire daily button in profile screen**

In `js/screens/profile.js`, add handling for `mode === 'daily'`: when a profile is selected in daily mode, call `showScreen('daily')` instead of `showScreen('worldmap')`.

- [ ] **Step 3: Import in main.js**

Add: `import './screens/daily.js';`

- [ ] **Step 4: Verify**

Run: Click 每日挑战, select profile, answer mixed questions, see streak and XP summary. Click again — shows "already completed today".

- [ ] **Step 5: Commit**

```bash
git add js/screens/daily.js js/screens/profile.js js/main.js
git commit -m "feat: daily challenge with streak tracking and mixed content"
```

---

### Task 12: Chengyu Collection & Inventory Screens

**Files:**
- Create: `js/screens/chengyu.js`
- Create: `js/screens/inventory.js`
- Modify: `js/main.js` (import)

- [ ] **Step 1: Create js/screens/chengyu.js**

```js
// js/screens/chengyu.js — Collected idiom trophy case
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadChengyu } from '../content-loader.js';

async function renderChengyu() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const allChengyu = await loadChengyu();

  const collected = allChengyu.filter(cy => profile.chengyu.includes(cy.id));
  const locked = allChengyu.filter(cy => !profile.chengyu.includes(cy.id));

  const cardsHTML = collected.map(cy => `
    <div class="cy-card collected">
      <div class="cy-word">${cy.chengyu}</div>
      <div class="cy-pinyin">${cy.pinyin}</div>
      <div class="cy-meaning">${cy.meaning}</div>
      <div class="cy-origin">${cy.origin}</div>
      <div class="cy-example">例：${cy.example}</div>
    </div>
  `).join('');

  const lockedHTML = locked.map(cy => `
    <div class="cy-card locked">
      <div class="cy-word">？？？？</div>
      <div class="cy-pinyin">${cy.era}</div>
    </div>
  `).join('');

  div.innerHTML = `
    <style>
      .cy-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(280px,1fr)); gap:16px; padding:20px; width:100%; max-height:80vh; overflow-y:auto; }
      .cy-card { background:var(--bg-card); border-radius:8px; padding:16px; border:2px solid var(--bg-secondary); }
      .cy-card.collected { border-color:var(--accent-gold); }
      .cy-card.locked { opacity:0.4; }
      .cy-word { font-size:1.4rem; font-weight:700; color:var(--accent-gold); margin-bottom:4px; }
      .cy-pinyin { font-size:0.85rem; color:var(--text-secondary); margin-bottom:8px; }
      .cy-meaning { margin-bottom:6px; }
      .cy-origin { font-size:0.9rem; color:var(--text-secondary); margin-bottom:6px; }
      .cy-example { font-size:0.9rem; color:var(--accent-jade); }
    </style>
    <div style="display:flex;justify-content:space-between;align-items:center;width:100%;padding:16px 20px;">
      <h2>成语收集 (${collected.length}/${allChengyu.length})</h2>
      <button class="btn" id="btn-back">返回</button>
    </div>
    <div class="cy-grid">${cardsHTML}${lockedHTML}</div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
  }, 0);
  return div;
}

registerScreen('chengyu', renderChengyu);
```

- [ ] **Step 2: Create js/screens/inventory.js**

```js
// js/screens/inventory.js — Equipment and stats display
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getXPProgress } from '../progression.js';

const EQUIPMENT_DB = [
  { id: 'brush-sword-1', name: '毛笔剑', type: 'weapon', stats: { attack: 5 }, description: '以墨为刃的文人之剑' },
  { id: 'scroll-shield-1', name: '竹简盾', type: 'armor', stats: { defense: 5 }, description: '刻满经文的护身竹简' },
  { id: 'brush-sword-2', name: '兰亭笔', type: 'weapon', stats: { attack: 10, speed: 5 }, description: '相传为王羲之所用之笔' },
  { id: 'ink-armor-1', name: '墨玉甲', type: 'armor', stats: { defense: 10, wenli: 2 }, description: '凝练墨气化成的铠甲' },
];

function renderInventory() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const xp = getXPProgress(profile);

  const inventoryHTML = profile.inventory.length === 0
    ? '<p style="color:var(--text-secondary);">还没有装备，完成任务获得装备吧！</p>'
    : profile.inventory.map(itemId => {
      const item = EQUIPMENT_DB.find(e => e.id === itemId);
      if (!item) return '';
      const equipped = (profile.equipment.weapon === itemId || profile.equipment.armor === itemId);
      const statsText = Object.entries(item.stats).map(([k,v]) => `${k}+${v}`).join(' ');
      return `
        <div class="inv-item ${equipped ? 'equipped' : ''}" data-id="${itemId}" data-type="${item.type}">
          <div style="font-weight:700;">${item.name} ${equipped ? '(装备中)' : ''}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${item.description}</div>
          <div style="font-size:0.85rem;color:var(--accent-jade);">${statsText}</div>
          <button class="btn equip-btn" style="padding:4px 12px;font-size:0.8rem;margin-top:4px;">${equipped ? '卸下' : '装备'}</button>
        </div>
      `;
    }).join('');

  div.innerHTML = `
    <style>
      .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; max-width:500px; }
      .stat-card { background:var(--bg-card); border-radius:8px; padding:12px; text-align:center; }
      .stat-value { font-size:1.5rem; font-weight:700; color:var(--accent-gold); }
      .stat-label { font-size:0.8rem; color:var(--text-secondary); }
      .xp-bar-bg { width:100%; max-width:500px; height:12px; background:var(--bg-secondary); border-radius:6px; overflow:hidden; margin:8px 0 20px; }
      .xp-bar { height:100%; background:var(--accent-blue); border-radius:6px; }
      .inv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; padding:0 20px; width:100%; }
      .inv-item { background:var(--bg-card); border:2px solid var(--bg-secondary); border-radius:8px; padding:12px; }
      .inv-item.equipped { border-color:var(--accent-gold); }
    </style>
    <div style="width:100%;padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2>${profile.name} · Lv.${profile.level}</h2>
        <button class="btn" id="btn-back">返回</button>
      </div>
      <div style="font-size:0.9rem;color:var(--text-secondary);">XP: ${xp.current}/${xp.needed}</div>
      <div class="xp-bar-bg"><div class="xp-bar" style="width:${xp.percent}%"></div></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${profile.maxHp}</div><div class="stat-label">HP</div></div>
        <div class="stat-card"><div class="stat-value">${profile.attack}</div><div class="stat-label">攻击</div></div>
        <div class="stat-card"><div class="stat-value">${profile.defense}</div><div class="stat-label">防御</div></div>
        <div class="stat-card"><div class="stat-value">${profile.speed}</div><div class="stat-label">速度</div></div>
        <div class="stat-card"><div class="stat-value">${profile.maxWenli}</div><div class="stat-label">文力</div></div>
        <div class="stat-card"><div class="stat-value">${profile.level}</div><div class="stat-label">等级</div></div>
      </div>
      <h3 style="margin-bottom:12px;">装备</h3>
      <div class="inv-grid">${inventoryHTML}</div>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
    div.querySelectorAll('.equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.inv-item');
        const id = item.dataset.id;
        const type = item.dataset.type;
        const equip = EQUIPMENT_DB.find(e => e.id === id);
        if (profile.equipment[type] === id) {
          // Unequip — remove stats
          Object.entries(equip.stats).forEach(([k,v]) => { profile[k] = (profile[k] || 0) - v; });
          profile.equipment[type] = null;
        } else {
          // Unequip current first
          if (profile.equipment[type]) {
            const old = EQUIPMENT_DB.find(e => e.id === profile.equipment[type]);
            if (old) Object.entries(old.stats).forEach(([k,v]) => { profile[k] = (profile[k] || 0) - v; });
          }
          // Equip new
          profile.equipment[type] = id;
          Object.entries(equip.stats).forEach(([k,v]) => { profile[k] = (profile[k] || 0) + v; });
        }
        gameState.save();
        showScreen('inventory');
      });
    });
  }, 0);

  return div;
}

registerScreen('inventory', renderInventory);

export { EQUIPMENT_DB };
```

- [ ] **Step 3: Add equipment drops to reward screen**

In `js/screens/reward.js`, after XP is awarded, add a random chance (30%) to drop an equipment item:
```js
import { EQUIPMENT_DB } from './inventory.js';

// Inside renderReward, after addXP:
if (Math.random() < 0.3) {
  const available = EQUIPMENT_DB.filter(e => !profile.inventory.includes(e.id));
  if (available.length > 0) {
    const drop = available[Math.floor(Math.random() * available.length)];
    profile.inventory.push(drop.id);
    results.itemsFound.push(drop.name);
  }
}
```

In the reward screen HTML, after the combo bonus line, add:
```js
${results.itemsFound.length > 0 ? `<div style="font-size:1.1rem; margin-bottom:12px;">获得装备: <span style="color:var(--accent-jade); font-weight:700;">${results.itemsFound.join(', ')}</span></div>` : ''}
```

- [ ] **Step 4: Add chengyu drops after boss encounters**

In `js/screens/boss.js`:
1. Add import at top: `import { loadChengyu } from '../content-loader.js';`
2. Make `endBoss` an `async` function: `async function endBoss(won)`
3. Replace the boss-won advancement block with:

```js
// Inside endBoss, after encounter.completed = true and gameState.save():
if (won) {
  const allChengyu = await loadChengyu();
  const uncollected = allChengyu.filter(cy => !profile.chengyu.includes(cy.id) && cy.chapter === quest.chapterId);
  if (uncollected.length > 0) {
    const drop = uncollected[Math.floor(Math.random() * uncollected.length)];
    profile.chengyu.push(drop.id);
    gameState.save();
    // Show chengyu notification before advancing
    div.innerHTML = `
      <div class="screen" style="text-align:center;">
        <h2 style="color:var(--accent-gold);">获得成语！</h2>
        <div style="font-size:2rem;font-weight:700;color:var(--accent-gold);margin:16px 0;">${drop.chengyu}</div>
        <div style="color:var(--text-secondary);margin-bottom:8px;">${drop.pinyin}</div>
        <div style="margin-bottom:8px;">${drop.meaning}</div>
        <div style="font-size:0.9rem;color:var(--text-secondary);margin-bottom:16px;">${drop.origin}</div>
        <button class="btn btn-primary" id="btn-continue">继续</button>
      </div>
    `;
    setTimeout(() => {
      div.querySelector('#btn-continue').addEventListener('click', () => {
        const next = advanceEncounter();
        if (!next) showScreen('reward');
        else showScreen(next.type);
      });
    }, 0);
    return;
  }
  // No chengyu to drop — advance normally
  const next = advanceEncounter();
  if (!next) showScreen('reward');
  else showScreen(next.type);
}
```

- [ ] **Step 5: Import in main.js**

Add:
```js
import './screens/chengyu.js';
import './screens/inventory.js';
import './screens/daily.js';
```

- [ ] **Step 6: Verify**

Run: Full flow — complete quests, earn XP, check inventory, check chengyu collection, do daily challenge.

- [ ] **Step 7: Commit**

```bash
git add js/screens/chengyu.js js/screens/inventory.js js/screens/daily.js js/screens/reward.js js/screens/boss.js js/main.js
git commit -m "feat: chengyu collection, inventory/equipment, daily challenge"
```

---

### Task 13: Arena Mode (2-Player)

**Files:**
- Create: `js/screens/arena.js`
- Modify: `js/main.js` (import)

- [ ] **Step 1: Create js/screens/arena.js**

```js
// js/screens/arena.js — 2-player hot-seat competitive mode
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { loadContent, pickQuestions } from '../content-loader.js';

async function renderArena() {
  const div = document.createElement('div');
  div.className = 'screen';

  const { player1Index, player2Index } = gameState.arenaState;
  const p1 = gameState.profiles[player1Index];
  const p2 = gameState.profiles[player2Index];

  const [content1, content2] = await Promise.all([
    loadContent(p1.tier),
    loadContent(p2.tier),
  ]);

  // 10 total rounds: 5 per player, alternating. Each player gets 5 questions at their tier.
  const p1Questions = pickQuestions(content1.vocab, 5, p1.seenQuestions.vocab);
  const p2Questions = pickQuestions(content2.vocab, 5, p2.seenQuestions.vocab);

  let round = 0;
  let p1QIndex = 0;
  let p2QIndex = 0;
  let currentPlayer = 1; // alternates 1, 2
  let p1Score = 0;
  let p2Score = 0;
  const totalRounds = 10;
  const baseTimer = 15;

  function renderInterstitial() {
    const name = currentPlayer === 1 ? p1.name : p2.name;
    const tier = currentPlayer === 1 ? p1.tier : p2.tier;
    const tierLabel = tier === 'grade7' ? '七年级' : '三年级';
    div.innerHTML = `
      <div style="text-align:center;">
        <h2 style="font-size:2rem; margin-bottom:8px;">第 ${round + 1} 回合</h2>
        <p style="font-size:1.5rem; color:var(--accent-gold); margin-bottom:8px;">${name} 的回合</p>
        <p style="color:var(--text-secondary); margin-bottom:24px;">${tierLabel}</p>
        <div style="display:flex; justify-content:center; gap:40px; margin-bottom:24px;">
          <div><span style="font-weight:700;">${p1.name}</span>: <span style="color:var(--accent-gold);">${p1Score}</span></div>
          <div><span style="font-weight:700;">${p2.name}</span>: <span style="color:var(--accent-blue);">${p2Score}</span></div>
        </div>
        <button class="btn btn-primary" id="btn-ready">准备好了！</button>
      </div>
    `;
    setTimeout(() => {
      div.querySelector('#btn-ready').addEventListener('click', renderQuestion);
    }, 0);
  }

  function renderQuestion() {
    const questions = currentPlayer === 1 ? p1Questions : p2Questions;
    const qIdx = currentPlayer === 1 ? p1QIndex : p2QIndex;
    const q = questions[qIdx];
    if (!q) { endArena(); return; }

    const tierMultiplier = (currentPlayer === 1 ? p1.tier : p2.tier) === 'grade7' ? 1.5 : 1.0;
    let timerInterval;
    let timeLeft = baseTimer;
    let answered = false;

    const optionsHTML = q.options.map((opt, i) => `
      <button class="arena-option" data-idx="${i}" style="font-family:var(--font-main);font-size:1rem;padding:12px 20px;background:var(--bg-card);border:2px solid var(--bg-secondary);color:var(--text-primary);border-radius:8px;cursor:pointer;text-align:center;transition:all 0.2s;">${opt}</button>
    `).join('');

    div.innerHTML = `
      <div style="display:flex;justify-content:space-between;width:100%;padding:8px 32px;">
        <div><span style="font-weight:700;">${p1.name}</span>: <span style="color:var(--accent-gold);">${p1Score}</span></div>
        <div style="color:var(--accent-gold);">回合 ${round + 1}/${totalRounds}</div>
        <div><span style="font-weight:700;">${p2.name}</span>: <span style="color:var(--accent-blue);">${p2Score}</span></div>
      </div>
      <div style="text-align:center;margin:8px 0;font-size:1.1rem;color:var(--accent-gold);">${currentPlayer === 1 ? p1.name : p2.name} 答题中</div>
      <div style="width:80%;max-width:500px;height:8px;background:var(--bg-secondary);border-radius:4px;overflow:hidden;margin:8px auto;">
        <div id="timer-bar" style="height:100%;background:var(--timer-yellow);border-radius:4px;width:100%;transition:width 0.1s linear;"></div>
      </div>
      <div style="font-size:1.3rem;margin:20px 32px;text-align:center;">${q.prompt}</div>
      <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;max-width:600px;width:100%;padding:0 32px;">${optionsHTML}</div>
      <div id="feedback" style="font-size:0.95rem;color:var(--text-secondary);margin-top:12px;text-align:center;min-height:2em;"></div>
    `;

    timerInterval = setInterval(() => {
      timeLeft -= 0.1;
      const bar = div.querySelector('#timer-bar');
      if (bar) bar.style.width = Math.max(0, (timeLeft / baseTimer) * 100) + '%';
      if (timeLeft <= 0 && !answered) {
        clearInterval(timerInterval);
        answered = true;
        handleArenaAnswer(-1, q, tierMultiplier);
      }
    }, 100);

    div.querySelectorAll('.arena-option').forEach(btn => {
      btn.addEventListener('click', () => {
        if (answered) return;
        answered = true;
        clearInterval(timerInterval);
        const idx = parseInt(btn.dataset.idx);
        handleArenaAnswer(idx, q, tierMultiplier, timeLeft);
      });
    });
  }

  function handleArenaAnswer(idx, q, tierMultiplier, timeLeft = 0) {
    const correct = idx === q.correct;
    div.querySelectorAll('.arena-option').forEach(b => {
      b.style.pointerEvents = 'none';
      const bIdx = parseInt(b.dataset.idx);
      if (bIdx === q.correct) { b.style.borderColor = 'var(--accent-jade)'; b.style.background = 'rgba(39,174,96,0.2)'; }
      else if (bIdx === idx) { b.style.borderColor = 'var(--accent-red)'; b.style.background = 'rgba(192,57,43,0.2)'; }
    });

    if (correct) {
      const speedBonus = Math.round(timeLeft);
      const points = Math.round((10 + speedBonus) * tierMultiplier);
      if (currentPlayer === 1) p1Score += points;
      else p2Score += points;
      div.querySelector('#feedback').textContent = `✓ 正确！+${points} 分`;
    } else {
      div.querySelector('#feedback').textContent = `✗ 错误。正确答案：${q.options[q.correct]}`;
    }

    setTimeout(() => {
      if (currentPlayer === 1) p1QIndex++;
      else p2QIndex++;
      round++;
      if (round >= totalRounds) { endArena(); return; }
      currentPlayer = currentPlayer === 1 ? 2 : 1;
      renderInterstitial();
    }, 1800);
  }

  function endArena() {
    const winner = p1Score > p2Score ? p1.name : p2Score > p1Score ? p2.name : null;
    div.innerHTML = `
      <div style="text-align:center;">
        <h2 style="font-size:2rem;margin-bottom:16px;">${winner ? winner + ' 获胜！' : '平局！'}</h2>
        <div style="display:flex;justify-content:center;gap:60px;margin-bottom:24px;">
          <div>
            <div style="font-size:1.3rem;font-weight:700;${p1Score >= p2Score ? 'color:var(--accent-gold)' : ''}">${p1.name}</div>
            <div style="font-size:2rem;font-weight:700;color:var(--accent-gold);">${p1Score}</div>
          </div>
          <div style="font-size:2rem;color:var(--text-secondary);align-self:center;">VS</div>
          <div>
            <div style="font-size:1.3rem;font-weight:700;${p2Score >= p1Score ? 'color:var(--accent-blue)' : ''}">${p2.name}</div>
            <div style="font-size:2rem;font-weight:700;color:var(--accent-blue);">${p2Score}</div>
          </div>
        </div>
        <div style="display:flex;gap:12px;justify-content:center;">
          <button class="btn btn-primary" id="btn-again">再来一局</button>
          <button class="btn" id="btn-back">返回</button>
        </div>
      </div>
    `;
    setTimeout(() => {
      div.querySelector('#btn-again').addEventListener('click', () => showScreen('arena'));
      div.querySelector('#btn-back').addEventListener('click', () => showScreen('title'));
    }, 0);
  }

  renderInterstitial();
  return div;
}

registerScreen('arena', renderArena);
```

- [ ] **Step 2: Import in main.js**

Add: `import './screens/arena.js';`

- [ ] **Step 3: Verify**

Run: Click 双人对战 from title → select Player 1 profile → select Player 2 profile → arena starts with alternating turns, timer, score tracking, final results.

- [ ] **Step 4: Commit**

```bash
git add js/screens/arena.js js/main.js
git commit -m "feat: 2-player arena mode with hot-seat turns and handicap scoring"
```

---

## Chunk 4: Content & Final Integration

### Task 14: Expand Grade 7 Content to 50 Questions Per Type

**Files:**
- Modify: `content/grade7/vocab.json` (expand to 50 questions)
- Modify: `content/grade7/reading.json` (expand to 10+ passages)
- Modify: `content/grade7/classical.json` (expand to 50 questions)

- [ ] **Step 1: Generate Grade 7 vocab questions**

Use Claude to generate 45 additional vocab questions covering 七年级统编版语文 content: 字音, 字形, 词义, 多义词, 成语, 近义词/反义词. Mix of curriculum and supplementary. Difficulties 1-5. Append to existing 5 in `vocab.json`. IDs: v7-006 through v7-050.

- [ ] **Step 2: Generate Grade 7 reading passages**

Use Claude to generate 8 additional reading passages with 2-3 questions each. Mix of curriculum-style (记叙文, 说明文, 议论文) and engaging topics (science, gaming, adventure). Difficulties 1-5. Append to existing 2. IDs: r7-003 through r7-010.

- [ ] **Step 3: Generate Grade 7 classical Chinese questions**

Use Claude to generate 45 additional classical Chinese questions covering: 翻译, 虚词 (之/而/以/其/为/于), 实词, 文意理解. Sources: 《论语》《世说新语》《史记》《战国策》《搜神记》. Difficulties 1-5. Append to existing 5. IDs: c7-006 through c7-050.

- [ ] **Step 4: Validate JSON**

Run: `python -c "import json; [json.load(open(f'content/grade7/{t}.json')) for t in ['vocab','reading','classical']]; print('OK')"`

- [ ] **Step 5: Commit**

```bash
git add content/grade7/
git commit -m "feat: expand grade 7 content to 50 questions per type"
```

---

### Task 15: Expand Grade 3 Content to 50 Questions Per Type

**Files:**
- Modify: `content/grade3/vocab.json` (expand to 50)
- Modify: `content/grade3/reading.json` (expand to 10+)
- Modify: `content/grade3/classical.json` (expand to 50)

- [ ] **Step 1: Generate Grade 3 vocab questions**

Use Claude to generate 45 additional questions for 三年级 level: 字音, 字形, 反义词, 近义词, 量词, 叠词, 成语. All multiple-choice. IDs: v3-006 through v3-050.

- [ ] **Step 2: Generate Grade 3 reading passages**

Use Claude to generate 8 additional reading passages appropriate for 三年级: 童话, 寓言, 写景散文, 记叙文. 2 questions each. IDs: r3-003 through r3-010.

- [ ] **Step 3: Generate Grade 3 classical content**

Use Claude to generate 45 additional questions: 古诗填空, 诗人, 诗意理解, 字词解释. Sources: 唐诗三百首 appropriate for Grade 3. IDs: c3-006 through c3-050.

- [ ] **Step 4: Validate JSON**

Run: `python -c "import json; [json.load(open(f'content/grade3/{t}.json')) for t in ['vocab','reading','classical']]; print('OK')"`

- [ ] **Step 5: Commit**

```bash
git add content/grade3/
git commit -m "feat: expand grade 3 content to 50 questions per type"
```

---

### Task 16: Expand Chengyu Collection

**Files:**
- Modify: `content/chengyu.json` (expand to 20)

- [ ] **Step 1: Generate 15 additional chengyu**

Add chengyu from various eras, tagged to chapters. Include pinyin, meaning, origin, example for each. IDs: cy-006 through cy-020.

- [ ] **Step 2: Validate JSON and commit**

```bash
git add content/chengyu.json
git commit -m "feat: expand chengyu collection to 20 entries"
```

---

### Task 17: Audio Stub & .gitignore

**Files:**
- Create: `js/audio.js` (stub)
- Create: `.gitignore`

- [ ] **Step 1: Create js/audio.js stub**

```js
// js/audio.js — Audio stub (sounds added post-MVP)
export function playSound(name) {
  // Post-MVP: implement when audio assets are added
}

export function playMusic(track) {
  // Post-MVP: implement when audio assets are added
}

export function stopMusic() {
  // Post-MVP: implement when audio assets are added
}
```

- [ ] **Step 2: Create .gitignore**

```
.superpowers/
node_modules/
.DS_Store
Thumbs.db
```

- [ ] **Step 3: Commit**

```bash
git add js/audio.js .gitignore
git commit -m "feat: audio stub and gitignore"
```

---

### Task 18: End-to-End Playtest & Bug Fixes

- [ ] **Step 1: Start dev server**

Run: `cd C:/dev/chinese-game && python -m http.server 8080`

- [ ] **Step 2: Full solo playtest**

Open http://localhost:8080. Test the complete flow:
1. Title → 单人模式 → create new Grade 7 profile
2. World map → Chapter 1 → Quest 1
3. Complete all encounters (combat → puzzle → boss)
4. Reward screen → XP, equipment drop check
5. Return to map → verify progress saved
6. Check inventory, chengyu collection
7. 每日挑战 → complete → verify streak

- [ ] **Step 3: Arena playtest**

1. Create a second profile (Grade 3)
2. 双人对战 → select both profiles
3. Play 10 rounds alternating
4. Verify score handicap (grade 7 questions worth more)
5. Results screen → play again

- [ ] **Step 4: Fix any bugs found during playtest**

Fix issues and commit each fix separately.

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "fix: playtest bug fixes and polish"
```
