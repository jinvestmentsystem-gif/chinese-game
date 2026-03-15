# 文字侠 (Word Hero) — Game Design Spec

## Overview

A browser-based combat RPG that teaches Chinese language skills to a Grade 7 student at 上海市徐汇中学. The player is a 文字侠 (Word Hero) traveling through historical eras of China, battling enemies corrupted by 墨暗 (Ink Darkness) by demonstrating mastery of Chinese language.

**Target players:**
- Primary: 13-year-old boy, Grade 7 (七年级), competitive gamer (王者荣耀, RPGs)
- Secondary: 9-year-old sister (approximately 三年级), plays in 2-player mode or solo at her level

**Learning focus areas (priority order):**
1. 阅读理解 (Reading Comprehension)
2. 文言文 (Classical Chinese)
3. 字词 (Vocabulary & Characters)

**Content approach:** Mix of curriculum-aligned material (统编版语文) and fresh engaging content at matching difficulty levels.

**Platform:** Web browser on PC (HTML/CSS/JavaScript, no backend).

---

## Core Game Loop

Each quest is a self-contained 15-20 minute arc:

1. **Enter a quest** — player picks a chapter/mission from the world map
2. **Traverse encounters** — 4-6 encounters per quest (mix of combat, puzzles, treasure)
3. **Face the boss** — chapter boss with a longer, harder challenge
4. **Rewards** — XP, gold, item drops, character upgrades
5. **Return to hub** — see progress, manage inventory, pick next quest

Players can chain quests or stop at natural exit points. The game is designed for daily 15-20 minute sessions with optional longer play.

---

## Three Encounter Types

### Combat (战斗) — 字词

Enemy attacks — player counters by answering character/vocabulary challenges.

- Speed matters: faster correct answer = more damage dealt
- Combo system: consecutive correct answers = damage multiplier
- Timer bar (default 15 seconds, scales with difficulty) adds urgency
- Health bars for player and enemy

**Question formats:**
- Pick the correct definition (multiple choice)
- Fill in the missing character in a sentence
- Match character to pinyin
- Identify the radical/component meaning

### Dungeon Puzzles (解谜) — 阅读理解

Read a passage, answer comprehension questions to unlock doors/treasure.

- No timer — rewards thoughtful reading
- Passage displayed prominently with questions alongside

**Question formats:**
- 概括主旨 — What is the main idea?
- 理解词句 — What does the author mean by...?
- 分析原因 — Why did the character do...?
- Reorder scrambled paragraphs

### Boss Battles (BOSS战) — 文言文

Boss speaks in classical Chinese. Player translates/interprets to deal damage.

- **3 phases per boss fight**, triggered by boss HP thresholds (100%→66%, 66%→33%, 33%→0%)
- Phase 1: single-sentence translation questions (easiest)
- Phase 2: function word identification + sentence interpretation (medium)
- Phase 3: full passage comprehension — multi-sentence classical text with harder questions (hardest)
- Each phase has 3-4 questions. All questions in a phase must be answered to advance.
- Classical text displayed prominently
- Boss has unique visual design per era
- Boss deals damage on wrong answers (player loses HP); fight ends if player HP reaches 0 (can retry)

**Question formats:**
- Translate a sentence to modern Chinese
- Identify the meaning of a classical function word (虚词: 之、而、以、其)
- Explain what a character did and why (理解文意)
- Pick the correct modern equivalent

---

## Story & Chapter Structure

### Premise

The player is a young warrior in ancient China whose power comes from mastery of language. An evil force called 墨暗 (Ink Darkness) is corrupting classical texts across the land, twisting their meanings. The player must travel through historical eras, restore the texts, and defeat the corrupted guardians.

### Chapters — 5 Eras, 4-5 Quests Each

| Chapter | Era | Theme | Boss |
|---|---|---|---|
| 1 | 先秦 (Pre-Qin) | Origin of characters, oracle bones | 仓颉之影 (Shadow of Cangjie) |
| 2 | 汉代 (Han) | Historical records, early prose | 墨吏 (Ink Official) |
| 3 | 唐代 (Tang) | Poetry, golden age literature | 诗魔 (Poetry Demon) |
| 4 | 宋代 (Song) | Ci poetry, philosophical texts | 词煞 (Ci Fiend) |
| 5 | 近现代 (Modern) | Modern literature, the 墨暗 source | 墨暗之主 (Lord of Ink Darkness) |

---

## Progression Systems

### Level & XP
- Earn XP from every encounter
- Level progression unlocks:
  - Level 2: 提示 (Hint) ability
  - Level 3: Equipment slots (weapon)
  - Level 5: 跳过 (Skip) ability
  - Level 7: Equipment slots (armor)
  - Level 10: 双倍 (Double) ability
  - Level 15+: Stat boosts (+HP, +文力 capacity) every 5 levels
- XP formula: base XP per question + speed bonus + combo bonus. Boss encounters give 3x base XP.

### 文力 (Literary Power)
- Resource spent to use special abilities in combat:
  - 提示 (Hint) — eliminate one wrong answer
  - 跳过 (Skip) — skip a question without penalty
  - 双倍 (Double) — double damage on next correct answer
- Regenerates between quests

### 装备 (Equipment)
- Collect weapons and armor themed around literary artifacts
  - e.g. 毛笔剑 (Brush Sword), 竹简盾 (Bamboo Scroll Shield)
- Stat bonuses and their mechanical effects:
  - **Attack (攻):** Multiplier on damage dealt per correct answer (e.g. +10 attack = +10% damage)
  - **Defense (防):** Reduces HP lost on wrong answers (e.g. +10 defense = -10% HP loss)
  - **Speed (速):** Extends the combat timer (e.g. +10 speed = +1.5 seconds on timer)
  - **文力 capacity:** Increases max 文力 points available per quest

### 成语收集 (Chengyu Collection)
- Specific 成语 are embedded in encounters as drops — each encounter may award a tagged 成语 on completion
- Each unlocked with context, origin story, and example usage
- Acts as a trophy case and reference dictionary
- 成语 are defined in a separate `content/chengyu.json` with era tags matching chapters

### Daily Challenge (每日挑战)
- One special encounter per day, available regardless of story progress
- Mix of all three content types
- Question selection seeded by the local date (deterministic per day, no backend needed). Avoids repeating recently-seen questions by checking the player's seen-questions history.
- Streak bonus: consecutive daily completions increase rewards
- Creates the daily habit loop

### Adaptive Difficulty
- Track accuracy per content area within the selected tier
- If player consistently scores >90% → pick higher `difficulty`-rated questions from the same tier's content pool
- If player scores 60-90% → hold at current difficulty level (this is the target zone)
- If player drops below 60% → pick lower `difficulty`-rated questions
- Invisible to the player — the game just "feels right"

---

## Difficulty Tiers

Player selects difficulty tier at profile creation:
- 三年级 (Grade 3) — for the sister
- 七年级 (Grade 7) — for the son

Only two tiers are implemented. Each tier has its own content pool of vocabulary, passages, and classical texts at the appropriate level. A 五年级 tier can be added later if needed, but is out of scope for now — two tiers cover the two target players.

---

## Two-Player Mode (双人竞技)

### Input Model
Both players share the same screen and keyboard (hot-seat). On each turn, one player's name and challenge are shown. The other player looks away or watches. After answering (or timer expiry), the screen transitions to the other player's turn with a brief "Player 2's Turn" interstitial. No split-screen or simultaneous input.

### Arena Mode (双人对战)
- Accessible from the main menu
- Each player selects their profile (with their own difficulty tier)
- 10 rounds of alternating turns (hot-seat on same keyboard/screen)
- Each player answers a challenge at their own difficulty level
- Scoring: points based on correctness + speed
- Higher difficulty tier answers are worth more base points (balances age gap)
- Winner declared with fanfare and stats comparison after 10 rounds

### Team Mode (团队模式)
- Optional cooperative mode
- Players alternate turns (same hot-seat model) to fight a boss together
- Combined HP pool, shared goal
- Both players contribute damage at their own difficulty level

---

## Content System

### Storage Format
All content stored as JSON files organized by difficulty tier and content type.

```
content/
├── grade3/
│   ├── vocab.json
│   ├── reading.json
│   └── classical.json
└── grade7/
    ├── vocab.json
    ├── reading.json
    └── classical.json
```

### Question Schema

**Vocab and Classical question object:**
- `id` — unique identifier
- `type` — "vocab" | "classical"
- `prompt` — the question text
- `options` — array of answer choices (for multiple choice)
- `correct` — correct answer index
- `explanation` — shown after answering (educational feedback)
- `difficulty` — numeric rating (1-5) within the tier
- `tags` — era, topic
- `source` — "curriculum" | "supplementary"

**Reading passage object** (阅读理解 uses a passage-with-questions structure):
- `id` — unique identifier
- `type` — "reading"
- `passage` — the full text passage
- `title` — passage title
- `questions` — array of question objects, each containing:
  - `prompt` — the question about the passage
  - `options` — answer choices
  - `correct` — correct answer index
  - `explanation` — educational feedback
- `difficulty` — numeric rating (1-5) within the tier
- `tags` — era, topic
- `source` — "curriculum" | "supplementary"

### Content Authoring
All question content will be authored with AI assistance (Claude) and reviewed by the developer. Questions are written directly into the JSON files. For MVP, target ~50 questions per content type per active difficulty tier (Grade 3 and Grade 7), totaling ~300 questions. Content can be expanded incrementally after launch.

### Content Sources

**字词 — Curriculum pool:**
- 七年级上/下册 required vocabulary lists (or grade-appropriate equivalent)

**字词 — Fresh pool:**
- Interesting/useful characters beyond the textbook, themed to the current era

**阅读理解 — Curriculum pool:**
- Passages styled after textbook difficulty and question types

**阅读理解 — Fresh pool:**
- Engaging topics: science, history, adventure, gaming culture, technology

**文言文 — Curriculum pool:**
- Excerpts from texts studied in class (《世说新语》《论语》etc.) plus similar-difficulty passages

**文言文 — Fresh pool:**
- Short anecdotes from《史记》《战国策》《搜神记》— battles, clever tricks, supernatural stories

---

## Technical Architecture

### Tech Stack
- Pure HTML/CSS/JavaScript
- ES modules for code organization
- No frameworks, no build tools, no backend
- JSON files for all content
- `localStorage` for save data
- Runs by opening index.html directly or via local server

### File Structure

```
chinese-game/
├── index.html              # Entry point
├── css/
│   └── styles.css          # All game styles
├── js/
│   ├── main.js             # App initialization, routing
│   ├── game-engine.js      # Core game loop, encounter logic
│   ├── combat.js           # Combat encounter mechanics
│   ├── puzzle.js           # Reading comprehension puzzles
│   ├── boss.js             # Boss battle mechanics
│   ├── player.js           # Player state, stats, inventory
│   ├── progression.js      # XP, leveling, adaptive difficulty
│   ├── arena.js            # 2-player mode
│   ├── ui.js               # Screen transitions, animations
│   ├── audio.js            # Sound effects, music
│   └── content-loader.js   # Loads JSON content pools
├── content/
│   ├── grade3/
│   │   ├── vocab.json
│   │   ├── reading.json
│   │   └── classical.json
│   └── grade7/
│       ├── vocab.json
│       ├── reading.json
│       └── classical.json
└── assets/
    ├── sprites/            # Character & enemy pixel art (CSS/SVG)
    ├── backgrounds/        # Scene backgrounds
    └── sounds/             # SFX and music
```

### Key Screens

| Screen | Purpose |
|---|---|
| Title screen | Logo, 单人 / 双人 / 每日挑战 buttons |
| Profile select | Choose/create player, set difficulty tier |
| World map | Chapter selection, shows progress per era |
| Quest screen | Linear path of encounters, current position |
| Combat screen | Player sprite vs enemy, health bars, timer, question panel at bottom |
| Puzzle screen | Passage on left, questions on right, no timer |
| Boss screen | Large boss sprite, multi-phase, classical text prominent |
| Reward screen | XP gained, items found, combo stats |
| Arena screen | Hot-seat turn display: active player name, score comparison bar at top, question in center. "Next Player" interstitial between turns. |
| 成语 Collection | Trophy case / dictionary of collected idioms |
| Inventory | Equipment management, stats view |

### Visual Style
- Pixel art aesthetic for characters and enemies
- Chinese ink/brush (水墨画) accent elements for borders and backgrounds
- Dark theme with warm accents: gold, red, jade green
- Smooth CSS transitions for attacks, damage, screen changes
- Typography: Noto Sans SC or similar clean Chinese font

### Audio
- Background music: royalty-free Chinese-themed ambient tracks (one per era)
- SFX: attack sounds, correct/wrong chimes, level-up fanfare, boss roar
- Toggleable on/off

### Save System
- `localStorage` stores: player profiles, progress, inventory, daily streak, seen questions
- Multiple profiles supported (one per player)
- No login or server required

---

## Scope & Constraints

- **MVP content:** Chapter 1 (先秦) fully playable with ~50 questions per content type per difficulty tier (Grade 3 and Grade 7), plus daily challenge. Remaining chapters added incrementally.
- **MVP 2-player:** Arena mode is included in MVP (core use case: siblings playing together). Team mode is post-MVP.
- **Art:** CSS-based sprites and inline SVG for MVP (no external image files initially — `assets/sprites/` is empty until post-MVP). Can upgrade to pixel art assets later.
- **Audio:** Optional for MVP. `audio.js` is a stub module initially. Add sounds after core gameplay is solid.
- **State management:** Modules communicate through a shared game state object (`GameState`) passed via imports. No event bus or pub/sub — keep it simple for the scale of this project.
- **No backend:** Everything runs client-side. No user accounts, no cloud saves, no analytics.
- **Browser support:** Modern Chrome/Edge on Windows PC.
