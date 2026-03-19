# 文字侠 Engagement Optimization Design

**Date:** 2026-03-19
**Status:** Approved
**Target audience:** All ages (grades 1-9, ages 8-adult)
**Design principle:** Simple surface, deep water — easy to start, rewarding to master

---

## Context

The game is feature-complete with 28 screens, 13 core systems, ~7,746 questions, and 38 bug fixes applied. The core gameplay loop (quest → combat → reward) is solid. The problem is **discoverability and invisible payoffs** — the game has 22+ systems but players naturally encounter only ~6. Chengyu bonuses trigger silently, talent points accumulate without notification, and many screens show empty states to new players.

### Player Journey Assessment

- **New player (0-30 min):** 8 taps to first combat. Opening cinematic delays gameplay. Visually impressed but no clear goal.
- **Casual player (30 min - 2 hours):** Discovers equipment and talents, but no prompting. May miss features entirely.
- **Engaged player (2-8 hours):** Deep systems exist but are invisible (chengyu bonuses, set bonuses, spaced repetition).
- **Hardcore (8+ hours):** Prestige, bestiary, gauntlet exist but have no clear entry points.

### Core Problem

Players can't see the depth. The game teaches nothing about itself. Rewards happen silently. The fix: **make every system visible at the right moment, celebrate every achievement, and always show what's next.**

---

## 1. Merged Chapter Map (Ring Fit Adventure Style)

### Problem

Two-screen navigation (worldmap → quest) breaks context. Player loses sense of overall progress. After completing a quest, they return to worldmap and must re-enter the chapter.

### Design

Replace worldmap + quest with a single scrollable vertical chapter map. Each chapter is one continuous path showing ALL quests and ALL encounters.

```
┌─────────────────────────────┐
│  Chapter header: 先秦·文字起源  │
│  Progress: ████░░ 2/4 征途    │
├─────────────────────────────┤
│                             │
│  [👹 仓颉之影] ← chapter boss │
│       │                     │
│  Quest 4:  ⚔─📖─⚔─⚔─👹     │  ← dimmed, locked
│       │                     │
│  Quest 3:  ⚔─📖─⚔─📖─👹     │  ← dimmed, locked
│       │                     │
│  Quest 2:  ✓─✓─✓─●─👹       │  ← current quest
│       │                     │
│  Quest 1:  ✓─✓─✓─✓─✓       │  ← completed, glowing
│       │                     │
│  [起点]                      │
│                             │
├─────────────────────────────┤
│  [◀ 章节] [🎒] [🏪] [⚙️]    │  ← bottom nav
└─────────────────────────────┘
```

### Behaviors

- Auto-scrolls to player's current position on load
- Completed nodes glow with era color; show star rating (1-3) earned
- Current node has animated pulse ring (dashed border, existing combat-entrance style)
- Future nodes visible but dimmed and not tappable
- Tapping completed node replays that encounter (practice/farming)
- Quest segments separated by visual "gate" that opens when previous quest complete
- Parallax background uses existing era-themed painted PNGs
- Player character sprite sits on current node, animated breathing

### Navigation Flow (Encounter Launch Mechanics)

The chapter map owns the encounter progression loop:

1. **Tap current encounter node** → chapter-map calls `startQuest(chapterId, questIndex)` (from game-engine.js) if not already started, then reads `getCurrentEncounter()` and calls `showScreen('encounter-intro', params)` (or directly to combat/puzzle/boss for auto-skip).
2. **Encounter screens render on top** — chapter-map remains in the DOM (hidden via `display:none` on its div) while combat/puzzle/boss render in `#game-root`. The chapter map is NOT destroyed.
3. **Encounter completion callback** — when combat/puzzle/boss calls `endCombat(won)` or equivalent, it calls `advanceEncounter()`. If more encounters remain, it shows the next encounter screen. If the quest is complete, it calls `showScreen('reward')`.
4. **Reward screen → return to map** — reward screen's "continue" button calls `showScreen('chapter-map', { resume: true })`. The chapter map re-shows, scrolls to the newly completed node, plays star-rating animation, and advances the player sprite to the next node.
5. **Quest-to-quest transition** — when all encounters in a quest are done and reward is collected, the chapter map unlocks the next quest's gate with an opening animation. The player sprite moves to the first node of the next quest.
6. **Replay completed encounters** — tapping a completed node calls `startQuest()` with the same chapterId/questIndex, enters the encounter, but does NOT re-award chapter completion. Quest results still award normal XP/gold.

All call sites that currently use `showScreen('worldmap')` will be updated to `showScreen('chapter-map')`. The screen name `'worldmap'` is retired.

### Star Rating Data

Star ratings are persisted in profile:

```javascript
// In DEFAULT_PROFILE (state.js):
questStars: {},  // e.g. { "1-0": 3, "1-1": 2, "2-0": 1 }

// Written by reward.js after quest completion:
const stars = accuracy >= 85 ? 3 : accuracy >= 60 ? 2 : 1;
const key = `${quest.chapterId}-${quest.questIndex}`;
const prev = profile.questStars[key] || 0;
profile.questStars[key] = Math.max(prev, stars);  // keep best
```

Backfill in state.js `_backfill()`: `if (!p.questStars) p.questStars = {};`

### Chapter Selector

The worldmap becomes a lightweight overlay triggered by "章节" button:

```
┌───────────────────────────┐
│  选择章节                   │
│                           │
│  ✅ 先秦·文字起源  4/4 ★★★  │
│  🔓 汉代·史记风云  2/4      │
│  🔒 唐代·诗词之巅          │
│  🔒 宋代·词韵华章          │
│  🔒 近现代·文脉新生         │
│                           │
│  [关闭]                    │
└───────────────────────────┘
```

Shows completion status, star count, lock state. Tapping switches the chapter map view.

### Implementation

- New file: `js/screens/chapter-map.js` — replaces both worldmap.js and quest.js
- worldmap.js becomes a thin chapter-selector overlay function (not a screen)
- quest.js encounter path SVG code reused and extended to show multiple quests
- Encounter intro, combat, puzzle, boss screens remain unchanged — they render on top of the chapter map

---

## 2. Progressive Disclosure

### Problem

Level 1 player sees the same nav and UI as level 15 player. Empty screens for features not yet unlocked.

### Design

Bottom nav bar and chapter map features evolve with player level. Features hidden until unlocked or about to unlock.

### Feature Visibility Rules

| Feature | Appears at | Condition |
|---|---|---|
| Shop button | Level 2 | First gold earned |
| Inventory button | First item | Any item in inventory |
| Talent badge | Level 4 | Talent tree unlocks |
| Daily challenge | Level 3 | — |
| Arena | Level 5 | — |
| Gauntlet | Chapter 3 complete | — |
| Weekly boss | Level 5 | (already exists as `weekly-boss.js`) |
| Lucky wheel | Level 2 | (already exists as `lucky-wheel.js`) |
| Bestiary | First boss defeated | (already exists as `bestiary.js`) |
| Chengyu tab | First chengyu earned | — |
| Prestige | All 5 chapters complete | — |

### Nav Evolution

```
Level 1:  [章节] [⚙️]
Level 3:  [章节] [🏪] [📅] [⚙️]
Level 5+: [章节] [🎒] [🏪] [📅] [⚔] [⚙️]
```

### "Coming Next" Teaser

When player is 1 level away from an unlock, show a preview card on the chapter map:

```
┌──────────────────────────┐
│ ⬆ Level 4 解锁：天赋树 🌳 │
└──────────────────────────┘
```

Builds anticipation. Disappears after unlock is achieved and visited.

### Implementation

- `js/main.js` or a new `js/nav.js` — computes visible features from profile level and state
- Each screen's button rendering checks visibility rules
- `tutorialSeen` tracks which unlock teasers have been shown

---

## 3. Celebration & Milestone System

### Problem

Chengyu bonuses, set bonuses, achievements, and talent unlocks trigger silently. Player never feels the payoff.

### Design

Every meaningful event gets a celebration moment, scaled to importance.

### Celebration Tiers

**Tier 1 — Toast (2-3s, non-blocking):**
- New title earned
- Equipment drop notification
- Gold milestone (1000, 5000)
- SRS question mastered

**Tier 2 — Banner (2-3s, slides in from top, semi-blocking):**
- Chengyu milestone (3/5/8/10/15/20): "成语加成！暴击率+2%"
- Set bonus activated (3-piece): "套装效果激活！经验+10%"
- Level-up unlock: "解锁：武器槽 ⚔️"

**Tier 3 — Full-screen (3-5s, blocking with dismiss):**
- Chapter completion (existing — keep as-is)
- Achievement unlocked with claim button
- Quest star rating (3 stars on first attempt)

### Star Rating Display

After completing a quest, the corresponding node on the chapter map shows earned stars:
- ★☆☆ (< 60% accuracy)
- ★★☆ (60-84%)
- ★★★ (85%+)

Stars are visible on the map permanently, motivating replays for 3-star completion.

### Implementation

- New `js/celebrations-ui.js` — centralized banner/toast system (extends existing error-handler toast)
- Called from progression.js when milestones trigger
- Uses existing celebration canvas for particle effects
- Star data stored in profile: `questStars: { "1-0": 3, "1-1": 2, ... }`

---

## 4. "Next Goal" Tracker

### Problem

Player finishes a quest and doesn't know what to aim for. No visible objective on the main screen.

### Design

Compact goal card pinned to top of chapter map:

```
┌──────────────────────────────┐
│ 🎯 下一目标：完成征途 2-3     │
│    ██████░░░░ 60%            │
│    奖励：+100金 · 天赋点×1    │
└──────────────────────────────┘
```

### Goal Priority (highest applicable shown)

1. Unspent stat/talent points → "分配你的属性点！"
2. Current quest incomplete → "完成征途 X-Y"
3. Daily challenge not done today → "今日挑战未完成"
4. Chapter completion close → "完成第X章 (3/4 征途)"
5. Achievement milestone close → "再答对15题解锁成就"
6. Equipment upgrade affordable → "可以升级你的武器了"

One goal at a time. Tapping navigates to relevant screen/action.

### Implementation

- Function `getNextGoal(profile)` in a new `js/goals.js` — evaluates priority list
- Rendered as a DOM element at top of chapter-map.js
- Updates on every chapter map render

---

## 5. Contextual Nudges

### Problem

Features exist but are never prompted. Players don't know when to visit shop, spend talents, or try daily challenges.

### Design

**Persistent notification dots:**
- 🔴 Talent button: unspent talent points
- 🔴 Shop button: new tier affordable
- 🔴 Inventory button: unviewed equipment drop
- 🟡 Daily button: challenge not done today

**One-time contextual tips** (shown once, stored in `tutorialSeen`):

| Trigger | Message |
|---|---|
| First 50+ gold | "你攒了不少金币！去商店看看有什么装备吧" |
| First talent point | "你获得了天赋点！打开天赋树选择你的成长路线" |
| First equipment drop | "你获得了新装备！去背包中装备它来提升实力" |
| First wrong answer | "别担心！答错的题目会进入复习队列，帮你巩固记忆" |
| HP < 30% first time | "血量告急！下次带上回春丹（商店有卖）" |
| First chengyu | "你收集了一个成语！每集齐3个会获得永久加成" |

### Implementation

- Notification dots: computed in nav rendering from profile state
- Tips: `showTutorial()` calls with new tutorial IDs, reusing existing tutorial.js tooltip system

---

## 6. Economy Rebalancing

### Problem

Economy is fair but lacks texture. No spending decisions — players buy the next tier linearly. Consumables exist but aren't usable in combat.

### Changes

**A. Consumables usable in combat:**

Add "使用道具" button to combat screen (visible only if player owns consumables). Tapping opens quick-select overlay showing owned items. Mid-fight potion use feels tactical, gives gold real purpose.

```
┌───────────────────┐
│  选择道具           │
│  💊 回春丹 ×2      │  ← heals 50 HP
│  ✨ 灵墨丹 ×1      │  ← restores wenli
│  📜 经验卷轴 ×1    │  ← 2x XP this quest
│  [取消]            │
└───────────────────┘
```

**B. Equipment upgrade cost curve:**

Current: linear (price × 1, × 2, × 3).
New: front-loaded rewards, expensive final tier.

- +1: item price × 0.5 (cheap — instant gratification)
- +2: item price × 1.0 (moderate)
- +3: item price × 2.0 (prestige purchase)

**C. Cosmetic gold sink:**

Name card frames (profile borders) — 500-2000 gold each, purely visual. Gives gold purpose after equipment is maxed. 6-8 frame designs themed by era.

**D. Daily login rewards visual calendar:**

Show 7-day grid with each day's reward visible ahead of time:
```
[日] [一] [二] [三] [四] [五] [六]
 30   50  50+  80  80+  100  150+
 金   金  经验  金  经验  金   全部
 ✓    ✓   ●
```

Player sees tomorrow's reward. Streak motivation made visual.

### Implementation

- Combat consumable UI: new overlay in combat.js, consumes from profile.consumables
- Upgrade costs: change `getUpgradeCost()` in shop.js
- Name card frames: new data in profile.js, rendered on character card
- Daily calendar: already partially exists in daily.js `buildStreakCalendar`

---

## 7. Onboarding Streamline

### Problem

8 taps from title to first combat. Opening cinematic is unskippable. Character card overlay delays entry.

### Design

**First-time flow (new player):**
1. Title screen → tap anywhere
2. Inline grade picker + name input (single compact form, not separate screen)
3. "开始冒险！" → straight to Chapter 1, Quest 1, Encounter 1
4. Opening story cinematic plays AFTER first quest (as narrative reward)

**Taps to first question: 3** (down from 8).

**Returning player flow:**
1. Title screen → tap anywhere
2. Straight to chapter map at current position

**Story repositioned:**
- Opening cinematic: plays after Quest 1 completion, guarded by `profile.openingStorySeen` flag
- Chapter intro stories: play when entering a new chapter for the first time
- Accessible anytime via "故事" button on chapter map
- `openingStorySeen` added to DEFAULT_PROFILE (default: false) and backfill

### Implementation

- Modify main.js title screen to detect first-time vs returning
- Inline profile creation form (no separate profile.js screen for first run)
- Story trigger moved from pre-quest to post-Quest-1 in chapter-map.js
- profile.js screen retained for profile management (rename, delete, switch)

---

## 8. Combat Engagement Polish

### Problem

Combat is functional but answer feedback could escalate more dramatically. Streak milestones feel flat.

### Design

**A. Streak milestones with escalating feedback:**

| Combo | Effect | Text |
|---|---|---|
| 3 | Small gold flash | "不错！" |
| 5 | Medium flash + screen tint | "厉害！" |
| 8 | Large flash + shake + bonus gold (+20) | "无敌！" |
| 10+ | Full gold explosion + double XP on next answer | "完美连击！" |

**B. Killing blow enhancement:**

Existing: brief pause + damage number. Enhanced: 150ms slow-motion, enemy shatters into ink particles (reuse particle system burst), gold coins burst from defeated position. Already partially implemented — make the shatter more dramatic.

**C. Boss phase transition narrative:**

Between phases, 1.5s narrative overlay:
- Phase 1→2: "仓颉之影化为墨雾，重新凝聚……" (screen darkens, boss re-forms)
- Phase 2→3: "墨暗之力全面爆发！" (screen flashes red, intensity increases)

Uses existing story.js typewriter pattern but abbreviated (single line, no pages).

### Implementation

- Streak milestones: add thresholds in combat.js handleAnswer correct path
- Killing blow: extend existing killing blow setTimeout with particle burst
- Phase transitions: add narrative overlay in boss.js phase change code

---

## 9. Learning Feedback Loop

### Problem

Players answer questions but can't see what they've learned. SRS works silently.

### Design

**A. Post-quest learning summary:**

On reward screen, below XP/gold, add collapsible "学习回顾" section:

```
📚 本次学习 (8/10 正确)
  ✅ 温故知新 — 温习旧知识获得新理解
  ✅ 不耻下问 — 不以向别人请教为耻
  ❌ 三人行必有我师 → 已加入复习队列
  ... [展开更多]
```

Shows key knowledge points answered correctly/incorrectly. Wrong answers noted as "加入复习队列" so player sees the SRS working.

**B. Review badge on questions:**

When a previously-wrong question appears for SRS review, show "📝 复习" badge on question card in combat. Player knows this is targeted review, not random repetition.

### Implementation

- **New field in quest.results:** Add `questionsLog: []` to the results object in `game-engine.js` line 192. Each combat/boss/puzzle answer appends `{ prompt, correct, explanation, isReview }` to this array via `recordAnswer()` or the screen's answer handler.
- Reward screen renders the summary from `quest.results.questionsLog`
- Review badge: check `q.isReview` flag (already set by game-engine.js line 126)
- Learning summary is collapsible (collapsed by default to avoid overwhelming; "展开" to view)

---

## What Changes vs What Stays

### Major changes (new files/significant refactors)

| Change | Files affected |
|---|---|
| Merged chapter map | New `chapter-map.js`, replaces worldmap.js + quest.js |
| Celebration UI system | New `celebrations-ui.js` |
| Next-goal tracker | New `goals.js` |
| Progressive nav | Modified `main.js` |

### Medium changes (modifications to existing files)

| Change | Files affected |
|---|---|
| Consumables in combat | `combat.js`, `boss.js` |
| Economy rebalancing | `shop.js` (upgrade costs) |
| Onboarding streamline | `main.js`, `profile.js` |
| Combat streak escalation | `combat.js` |
| Boss phase narratives | `boss.js` |
| Learning summary | `reward.js` |
| Contextual nudges | `tutorial.js`, nav rendering |
| Star rating storage | `state.js`, `reward.js` |

### Unchanged

- Core combat mechanics (timer, options, combo, damage formulas)
- All 7,746 questions and content files
- Talent tree structure and definitions
- Equipment/shop item definitions
- Audio system (procedural Web Audio)
- Spaced repetition algorithm
- Story content and screen
- All encounter types (combat, puzzle, boss, treasure, rest)
- Particle system, effects system, sprites
- Error handling, router (transition animations)
- Daily challenge, arena, gauntlet gameplay

---

## Success Criteria

1. **New player reaches first combat in ≤ 3 taps**
2. **Every system unlock has a visible celebration moment**
3. **Player always sees their next goal on the chapter map**
4. **No empty screens** — everything hidden until relevant
5. **Consumables are usable in combat** — gold has purpose at every stage
6. **Full chapter path visible** — player always knows where they are and how far to go
7. **Question diversity verified** — weighted random sampling ensures 90%+ pool coverage
