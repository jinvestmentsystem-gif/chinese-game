# Engagement Optimization Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the game more fun, intuitive, and engaging for all ages by merging the navigation into a Ring Fit-style chapter map, adding celebration moments for every invisible bonus, showing the next goal at all times, and streamlining onboarding to 3 taps.

**Architecture:** Pure client-side vanilla JS (ES modules). No build tools, no backend, no test framework. Screens register via `registerScreen(name, renderFn)` and navigate via `showScreen(name, params)`. All state flows through `gameState` singleton in `js/state.js`, persisted to localStorage. Manual browser verification at `python -m http.server 8080`.

**Tech Stack:** HTML5, CSS3, vanilla JS (ES modules), Web Audio API, SVG for map paths

**Spec:** `docs/superpowers/specs/2026-03-19-engagement-optimization-design.md`

---

## File Map

### New files
| File | Responsibility |
|---|---|
| `js/screens/chapter-map.js` | Merged chapter map — replaces worldmap.js + quest.js as primary navigation |
| `js/celebrations-ui.js` | Centralized banner/toast celebration system (Tier 1-3) |
| `js/goals.js` | Next-goal tracker logic — evaluates priority list, returns current goal |
| `js/nav.js` | Progressive disclosure — computes which nav buttons/features are visible |

### Modified files (key changes)
| File | Changes |
|---|---|
| `js/state.js` | Add `questStars`, `openingStorySeen`, `statPoints` to DEFAULT_PROFILE + backfill |
| `js/game-engine.js` | Add `questionsLog` array to quest.results |
| `js/main.js` | New boot flow (first-time inline form vs returning → chapter-map), register new screens |
| `js/screens/reward.js` | Persist star ratings, render learning summary, navigate to chapter-map |
| `js/screens/combat.js` | Streak milestone effects, consumable use button, log questions to questionsLog |
| `js/screens/boss.js` | Phase transition narratives, consumable button, log questions |
| `js/screens/shop.js` | Updated `getUpgradeCost()` curve |
| `js/tutorial.js` | New tutorial IDs for contextual nudges |
| `js/screens/puzzle.js` | Log questions to questionsLog |
| 20+ screen files | Replace `showScreen('worldmap')` → `showScreen('chapter-map')` |

### Retired (kept for reference but no longer registered)
| File | Reason |
|---|---|
| `js/screens/worldmap.js` | Absorbed into chapter-map.js; chapter selector overlay extracted |
| `js/screens/quest.js` | SVG path code absorbed into chapter-map.js |

---

## Phase 1: Foundation (Tasks 1-4)

Build the utility modules that everything else depends on. No screen changes yet.

### Task 1: State Schema Updates

**Files:**
- Modify: `js/state.js`
- Modify: `js/game-engine.js`

- [ ] **Step 1: Add new fields to DEFAULT_PROFILE in state.js**

Add after the existing `masteredQuestions` field:

```javascript
questStars: {},        // { "1-0": 3, "1-1": 2 } — best star rating per quest
openingStorySeen: false, // guards post-Quest-1 cinematic
statPoints: 0,         // stat allocation points (already used via || 0 fallback)
```

- [ ] **Step 2: Add backfill entries in state.js _backfill() function**

Add after the existing `statPoints` backfill line:

```javascript
if (!p.questStars) p.questStars = {};
if (!('openingStorySeen' in p)) p.openingStorySeen = false;
```

Note: `statPoints` backfill already exists from previous fix.

- [ ] **Step 3: Add questionsLog to quest.results in game-engine.js**

In `startQuest()`, modify the results object (around line 192):

```javascript
results: { correct: 0, total: 0, combo: 0, maxCombo: 0, xpEarned: 0, itemsFound: [], questionsLog: [] },
```

- [ ] **Step 4: Verify in browser**

Run `python -m http.server 8080`, create a new profile, verify no console errors. Check localStorage to confirm new fields are present.

- [ ] **Step 5: Commit**

```bash
git add js/state.js js/game-engine.js
git commit -m "feat: add questStars, openingStorySeen, questionsLog to state schema"
```

---

### Task 2: Celebration UI System

**Files:**
- Create: `js/celebrations-ui.js`

This module provides three celebration tiers used throughout the game. It extends the existing `window.showToast()` pattern from error-handler.js but adds banners and full-screen celebrations.

- [ ] **Step 1: Create celebrations-ui.js with toast, banner, and fullscreen functions**

```javascript
// js/celebrations-ui.js — Centralized celebration/notification system
// Tier 1: showCelebrationToast(message, opts) — non-blocking, 2-3s
// Tier 2: showCelebrationBanner(title, subtitle, opts) — slides from top, 2-3s
// Tier 3: showCelebrationFullscreen(title, subtitle, opts) — blocking with dismiss

export function showCelebrationToast(message, opts = {}) { ... }
export function showCelebrationBanner(title, subtitle, opts = {}) { ... }
export function showCelebrationFullscreen(title, subtitle, opts = {}) { ... }
```

Key behaviors:
- Toast: gold-bordered notification at top-center, fades after `opts.duration || 2500`ms. Uses existing toast container pattern.
- Banner: slides in from top with 60px height, dark bg with gold border, title + subtitle. Auto-dismisses after 2.5s. Includes particle burst option (`opts.particles: true`).
- Fullscreen: centered overlay with dark backdrop, large title, subtitle, dismiss button "知道了". Blocks interaction. Optional callback `opts.onDismiss`.
- All inject their own CSS if not already present (same pattern as router.js loading indicator).
- All respect `prefers-reduced-motion`.

- [ ] **Step 2: Verify in browser**

Import and call `showCelebrationBanner('测试', '这是一个测试')` from browser console (via adding a temp import to main.js). Verify it slides in and auto-dismisses.

- [ ] **Step 3: Commit**

```bash
git add js/celebrations-ui.js
git commit -m "feat: add celebrations-ui with toast, banner, fullscreen tiers"
```

---

### Task 3: Next-Goal Tracker Logic

**Files:**
- Create: `js/goals.js`

Pure logic module — no DOM rendering. Returns the highest-priority goal object for the given profile.

- [ ] **Step 1: Create goals.js**

```javascript
// js/goals.js — Computes the most important next goal for the player
import { gameState } from './state.js';

const CHAPTER_QUESTS = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 5 };

export function getNextGoal(profile) {
  // Priority 1: unspent stat/talent points
  if ((profile.statPoints || 0) > 0) return { type: 'stat-points', text: '分配你的属性点！', screen: 'levelup' };
  if ((profile.talentPoints || 0) > 0 && profile.level >= 4) return { type: 'talent-points', text: '分配你的天赋点！', screen: 'levelup' };

  // Priority 2: current quest
  const quest = gameState.currentQuest;
  if (quest && quest.currentEncounter < quest.encounters.length) {
    return { type: 'quest', text: `完成征途 ${quest.chapterId}-${quest.questIndex + 1}`, screen: 'chapter-map' };
  }

  // Priority 3: daily not done
  const today = new Date();
  const todayStr = `${today.getFullYear()}-${String(today.getMonth()+1).padStart(2,'0')}-${String(today.getDate()).padStart(2,'0')}`;
  if (profile.dailyLogin?.lastDate !== todayStr) return { type: 'daily', text: '今日挑战未完成', screen: 'daily' };

  // Priority 4: chapter completion close
  for (const [chId, quests] of Object.entries(CHAPTER_QUESTS)) {
    const cp = profile.chapterProgress?.[chId];
    if (cp && cp.questsCompleted > 0 && cp.questsCompleted < quests) {
      return { type: 'chapter', text: `完成第${chId}章 (${cp.questsCompleted}/${quests} 征途)`, progress: cp.questsCompleted / quests, screen: 'chapter-map' };
    }
  }

  // Priority 5: achievement milestone close
  const totalCorrect = profile.stats?.totalCorrect || 0;
  const milestones = [50, 200, 500, 1000];
  for (const m of milestones) {
    if (totalCorrect < m && m - totalCorrect <= 20) {
      return { type: 'achievement', text: `再答对${m - totalCorrect}题解锁成就`, screen: 'stats' };
    }
  }

  // Priority 6: equipment upgrade affordable
  // (caller can check shop items against profile.gold)

  // Fallback
  return { type: 'explore', text: '继续冒险吧！', screen: 'chapter-map' };
}
```

- [ ] **Step 2: Commit**

```bash
git add js/goals.js
git commit -m "feat: add goals.js next-goal tracker logic"
```

---

### Task 4: Progressive Disclosure Logic

**Files:**
- Create: `js/nav.js`

Pure logic module — computes which features are visible based on profile state.

- [ ] **Step 1: Create nav.js**

```javascript
// js/nav.js — Progressive disclosure: determines visible features per player level/state
export function getVisibleFeatures(profile) {
  const level = profile.level || 1;
  const features = {};

  features.chapters = true;     // always visible
  features.settings = true;     // always visible
  features.shop = level >= 2 || (profile.gold || 0) > 0;
  features.inventory = (profile.inventory || []).length > 0;
  features.daily = level >= 3;
  features.arena = level >= 5;
  features.talents = level >= 4;
  features.luckyWheel = level >= 2;
  features.weeklyBoss = level >= 5;
  features.gauntlet = (profile.chapterProgress?.[3]?.questsCompleted || 0) >= 4;
  features.bestiary = (profile.stats?.totalBossKills || 0) > 0;
  features.chengyu = (profile.chengyu || []).length > 0;
  features.prestige = Object.keys(profile.chapterProgress || {}).length >= 5;
  features.companion = level >= 3;

  return features;
}

export function getNotificationDots(profile) {
  const dots = {};
  if ((profile.talentPoints || 0) > 0 && profile.level >= 4) dots.talents = 'red';
  if ((profile.statPoints || 0) > 0) dots.levelup = 'red';
  // Shop: new tier affordable (check if any unowned item is affordable)
  if ((profile.gold || 0) >= 50 && (profile.inventory || []).length < 12) dots.shop = 'red';
  // Inventory: unviewed equipment drop
  if (profile._newEquipDrop) dots.inventory = 'red';
  // Daily not done today
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth()+1).padStart(2,'0')}-${String(now.getDate()).padStart(2,'0')}`;
  if (profile.dailyLogin?.lastDate !== todayStr) dots.daily = 'yellow';
  return dots;
}

export function getNextUnlock(profile) {
  const level = profile.level || 1;
  const UNLOCKS = {
    2: { name: '提示技能', icon: '💡' },
    3: { name: '武器槽', icon: '⚔️' },
    4: { name: '天赋树', icon: '🌳' },
    5: { name: '竞技场', icon: '🏟️' },
    7: { name: '防具槽', icon: '🛡️' },
    10: { name: '双倍技能', icon: '✨' },
    12: { name: '饰品槽', icon: '💎' },
  };
  for (const [lvl, info] of Object.entries(UNLOCKS)) {
    if (Number(lvl) === level + 1) return { level: Number(lvl), ...info };
  }
  return null;
}
```

- [ ] **Step 2: Commit**

```bash
git add js/nav.js
git commit -m "feat: add nav.js progressive disclosure logic"
```

---

## Phase 2: Chapter Map (Tasks 5-11)

The largest and riskiest phase. Build the merged chapter map that replaces worldmap + quest.

### Task 5: Chapter Map Scaffold

**Files:**
- Create: `js/screens/chapter-map.js`
- Modify: `js/main.js` (register new screen)

Build the chapter-map screen shell: chapter header, progress bar, bottom nav, chapter selector overlay. No SVG path yet — just the container and data.

- [ ] **Step 1: Create chapter-map.js with chapter data, header, and nav**

Extract CHAPTERS data from worldmap.js (lines 16-95). Build the screen's outer structure:
- Chapter header bar (era name, progress bar showing X/Y quests)
- Scrollable content area (placeholder for SVG path — Task 6)
- Bottom nav bar using `getVisibleFeatures()` from nav.js
- Next-goal card using `getNextGoal()` from goals.js
- "Coming next" teaser using `getNextUnlock()` from nav.js
- "故事" (story replay) button in nav — opens story screen for current chapter

Register as eager-loaded screen in main.js.

- [ ] **Step 2: Add chapter selector overlay function**

In chapter-map.js, add `showChapterSelector()` that creates a modal overlay listing all chapters with their completion status, star counts, and lock state. Tapping a chapter re-renders the map for that chapter. Tapping "关闭" dismisses.

- [ ] **Step 3: Verify in browser**

Navigate to chapter-map screen. See chapter header, empty scrollable area, bottom nav with progressive buttons, goal card. Open chapter selector, switch chapters.

- [ ] **Step 4: Commit**

```bash
git add js/screens/chapter-map.js js/main.js
git commit -m "feat: chapter-map scaffold with header, nav, chapter selector"
```

---

### Task 6A: Chapter Map SVG Path — Single Quest Port

**Files:**
- Modify: `js/screens/chapter-map.js`

Port the SVG path rendering from quest.js for a single quest first, verify it works, then extend.

- [ ] **Step 1: Port single-quest SVG rendering from quest.js**

Adapt quest.js lines 595-850 (SVG layout, node rendering, path drawing, boss node) into chapter-map.js. Render the FIRST quest's encounter nodes in the scrollable content area. Keep the same visual style: winding S-curve path, encounter type icons, boss node with larger radius.

- [ ] **Step 2: Add node state rendering**

Render 5 visual states:
- Completed: filled circle with era color, checkmark
- Current: animated pulse ring (dashed border)
- Future (same quest): visible, dimmed, era-colored outline
- Boss nodes: larger radius (44px vs 28px), special glow

- [ ] **Step 3: Verify in browser**

See single quest path with encounter nodes in chapter-map. Nodes show correct state.

- [ ] **Step 4: Commit**

```bash
git add js/screens/chapter-map.js
git commit -m "feat: chapter-map single-quest SVG path rendering"
```

---

### Task 6B: Chapter Map SVG Path — Multi-Quest + Polish

**Files:**
- Modify: `js/screens/chapter-map.js`

Extend to show ALL quests in the chapter as one continuous vertical path.

- [ ] **Step 1: Extend to multi-quest layout**

- Render N encounters x M quests (e.g. 4 quests x 5 encounters = 20 nodes)
- Increase SVG_H dynamically based on total node count
- Quest segments separated by gate markers (horizontal line with lock/open icon)
- Y positions: start at bottom, final boss at top
- X weave continues across quest boundaries (continuous S-curve)
- Future (locked quest) nodes: very dimmed, grey outline, behind closed gate
- Star ratings rendered below completed quest nodes

- [ ] **Step 2: Add player sprite on current node**

Place the player sprite (from sprites.js SPRITES.player) on the current encounter node with breathing animation (reuse existing sprite-breathe keyframe from quest.js).

- [ ] **Step 3: Add parallax background and auto-scroll**

Use existing era-themed background images as CSS background. Apply parallax via scroll listener using `transform` (GPU-friendly). On render, smoothly scroll to center on current node.

- [ ] **Step 4: Verify in browser**

See full chapter path with all 4 quests, encounter nodes, gates between quests, player sprite, star ratings. Scroll up/down. Parallax works.

- [ ] **Step 5: Commit**

```bash
git add js/screens/chapter-map.js
git commit -m "feat: chapter-map multi-quest path with gates, stars, parallax"
```

---

### Task 7: Encounter Launch Flow

**Files:**
- Modify: `js/screens/chapter-map.js`
- Modify: `js/screens/combat.js` (return path: replace `showScreen('quest')` calls)
- Modify: `js/screens/boss.js` (return path: replace `showScreen('quest')` calls)
- Modify: `js/screens/puzzle.js` (return path: replace `showScreen('quest')` calls)
- Modify: `js/screens/encounter-intro.js` (return path)

Wire up tapping nodes to launch encounters. The chapter map owns the encounter progression loop.

- [ ] **Step 1: Add tap handlers to encounter nodes**

- Current encounter node: tap → call `startQuest(chapterId, questIndex)` if not already started, read `getCurrentEncounter()`, call `showScreen('encounter-intro', params)` or directly to combat/puzzle/boss (auto-skip if 3+ encounters seen)
- Completed node: tap → call `startQuest()` for replay, launch encounter
- Future/locked nodes: no handler (not tappable)

Before showing encounter screen, hide the chapter-map div (`div.style.display = 'none'`) so it stays in DOM but isn't visible. The encounter screen renders in `#game-root` as normal.

- [ ] **Step 2: Wire encounter completion → advance → next encounter**

After combat/puzzle/boss ends, the encounter screen calls `advanceEncounter()`. If more encounters remain in the quest, show the next encounter screen. If quest is complete, show reward screen.

This is the existing flow from quest.js — extract it into chapter-map.js's encounter progression logic. The key is: chapter-map doesn't need to be visible during encounters, it just needs to resume correctly after reward.

- [ ] **Step 3: Verify in browser**

Tap current encounter node → combat loads. Complete combat → next encounter loads automatically. Complete all encounters → reward screen shows.

- [ ] **Step 4: Commit**

```bash
git add js/screens/chapter-map.js
git commit -m "feat: chapter-map encounter launch and progression flow"
```

---

### Task 8: Return Flow and Star Ratings

**Files:**
- Modify: `js/screens/chapter-map.js`
- Modify: `js/screens/reward.js`

Wire reward screen "continue" → return to chapter map. Persist and display star ratings.

- [ ] **Step 1: Persist star ratings in reward.js**

After accuracy calculation (around line 352), add:

```javascript
const stars = accuracy >= 85 ? 3 : accuracy >= 60 ? 2 : 1;
const starKey = `${quest.chapterId}-${quest.questIndex}`;
const prevStars = profile.questStars[starKey] || 0;
profile.questStars[starKey] = Math.max(prevStars, stars);
```

- [ ] **Step 2: Change reward.js "continue" to navigate to chapter-map**

Change the continue button handler (around line 710) from `showScreen('worldmap')` to `showScreen('chapter-map', { resume: true })`.

- [ ] **Step 3: Handle resume in chapter-map.js**

When chapter-map receives `params.resume === true`:
1. Re-show the hidden div (`div.style.display = ''`)
2. Update the completed node with star rating animation
3. Advance player sprite to next node with movement animation
4. If quest is complete, play gate-opening animation for next quest
5. Re-scroll to new current position

- [ ] **Step 4: Verify in browser**

Complete full quest → reward screen → tap continue → chapter map resumes with star on completed node, player sprite moved forward, next quest gate opened.

- [ ] **Step 5: Commit**

```bash
git add js/screens/chapter-map.js js/screens/reward.js
git commit -m "feat: chapter-map resume flow with star ratings and gate animations"
```

---

### Task 9: Register Chapter Map and Update Boot Flow

**Files:**
- Modify: `js/main.js`

Register chapter-map FIRST so the screen exists before rerouting all navigation to it.

- [ ] **Step 1: Register chapter-map as eager-loaded screen, remove worldmap/quest**

In main.js screen imports, replace worldmap.js and quest.js imports with chapter-map.js. Keep worldmap.js/quest.js files on disk but don't register them.

- [ ] **Step 2: Change returning-player boot target**

Where main.js currently navigates to `showScreen('worldmap')` after profile select (around line 329-342), change to `showScreen('chapter-map')`.

- [ ] **Step 3: Verify in browser**

Reload page → title screen → tap → goes to chapter-map (not worldmap).

- [ ] **Step 4: Commit**

```bash
git add js/main.js
git commit -m "feat: register chapter-map, update boot flow"
```

---

### Task 10: Reroute All Navigation Call Sites

**Files:**
- Modify: 20+ screen files (see list below)

Now that chapter-map is registered, bulk-replace both `showScreen('worldmap')` and `showScreen('quest', ...)` across all files.

- [ ] **Step 1: Replace all showScreen('worldmap') call sites (22 occurrences)**

Files: chengyu.js, boss.js, chapter-complete.js, bestiary.js, inventory.js, companion-profile.js, profile.js, gauntlet.js, levelup.js, combat.js, combo-wall.js, lucky-wheel.js, reward.js (2), seasonal-event.js, prestige.js (2), quest.js, shop.js, trophy-room.js, weekly-boss.js (2).

- [ ] **Step 2: Replace all showScreen('quest', ...) call sites (8 occurrences)**

These are encounter-completion return paths that currently go back to quest.js. Replace with the new chapter-map encounter progression (handled by chapter-map.js from Task 7). Files: combat.js, boss.js, puzzle.js, encounter-intro.js, reward.js, quest.js.

- [ ] **Step 3: Verify no remaining references**

```bash
grep -rn "showScreen('worldmap')\|showScreen('quest'" js/
```
Expected: no results (except inside worldmap.js and quest.js themselves, which are no longer registered).

- [ ] **Step 4: Verify in browser**

Navigate shop → back → chapter-map. Inventory → back → chapter-map. Complete combat → advances to next encounter (not quest screen).

- [ ] **Step 5: Commit**

```bash
git add js/screens/*.js
git commit -m "refactor: reroute all navigation from worldmap/quest to chapter-map"
```

---

## Phase 3: Engagement Systems (Tasks 11-15)

### Task 11: Onboarding Streamline

**Files:**
- Modify: `js/main.js` (title screen render function)

- [ ] **Step 1: Add first-time detection**

In the title screen render, check if `gameState.profiles.length === 0`. If true, show inline creation form instead of the normal title buttons.

- [ ] **Step 2: Build inline creation form**

Compact form on title screen: name input + grade selector dropdown + "开始冒险！" button. On submit: call `gameState.createProfile(name, tier, difficultyBase)`, then `showScreen('chapter-map')`. Skip the character card overlay entirely.

- [ ] **Step 3: Reposition opening cinematic**

In chapter-map.js, after Quest 1 reward → return to map, check `!profile.openingStorySeen`. If true, show the opening story (existing STORIES.opening from story.js), then set `profile.openingStorySeen = true` and save.

- [ ] **Step 4: Verify in browser**

Clear localStorage. Reload. See title → inline form → enter name, pick grade → chapter-map immediately. Complete Quest 1 → reward → return to map → opening cinematic plays → continues to map.

- [ ] **Step 5: Commit**

```bash
git add js/main.js js/screens/chapter-map.js
git commit -m "feat: streamlined onboarding — 3 taps to first combat"
```

---

### Task 12: Contextual Nudges

**Files:**
- Modify: `js/screens/chapter-map.js` (notification dots on nav)
- Modify: `js/tutorial.js` (new tutorial IDs)
- Modify: `js/screens/combat.js` (first-wrong-answer tip)
- Modify: `js/screens/reward.js` (first-equipment-drop tip)

- [ ] **Step 1: Add notification dots to chapter-map nav bar**

Import `getNotificationDots()` from nav.js. For each nav button, if dots[feature] exists, render a small colored circle on the button.

- [ ] **Step 2: Add new tutorial definitions to tutorial.js**

Add entries for: `tip_first_gold`, `tip_first_talent`, `tip_first_equip_drop`, `tip_first_wrong`, `tip_first_low_hp`, `tip_first_chengyu`.

- [ ] **Step 3: Trigger tips at appropriate moments**

- `tip_first_gold`: in reward.js, after gold calculation, if gold > 50 and not seen
- `tip_first_talent`: in progression.js addXP, when talent point granted and not seen
- `tip_first_equip_drop`: in reward.js, when equipment drops and not seen
- `tip_first_wrong`: in combat.js, on first wrong answer and not seen
- `tip_first_low_hp`: in combat.js, when playerHp < effectiveMaxHp * 0.3 after taking damage and not seen
- `tip_first_chengyu`: in boss.js, when chengyu collected and not seen

Each tip uses `showTutorial(div, tutorialId, { message, position })`.

- [ ] **Step 4: Verify in browser**

Play through first quest. See gold tip after first reward. See wrong-answer tip on first mistake. See talent tip on level 4.

- [ ] **Step 5: Commit**

```bash
git add js/screens/chapter-map.js js/tutorial.js js/screens/combat.js js/screens/reward.js
git commit -m "feat: contextual nudges — notification dots and one-time tips"
```

---

### Task 13: Celebration Triggers — All Tiers

**Files:**
- Modify: `js/progression.js` (chengyu milestone, title earned, gold milestone)
- Modify: `js/screens/inventory.js` (set bonus activation)
- Modify: `js/screens/chapter-map.js` (level-up unlock display)
- Modify: `js/screens/reward.js` (achievement claim, first-time 3-star, equipment drop toast)
- Modify: `js/spaced-repetition.js` (SRS mastered toast)

- [ ] **Step 1: Wire Tier 2 (Banner) celebrations**

- Chengyu milestone (3/5/8/10/15/20): in boss.js/reward.js after chengyu added, check count against thresholds → `showCelebrationBanner('成语加成！', 'XX+Y%', { particles: true })`
- Set bonus activated: in inventory.js after equip, check 3-piece completion → `showCelebrationBanner()`
- Level-up unlock: in chapter-map.js on resume after level-up → `showCelebrationBanner('解锁：XX', desc)`

- [ ] **Step 2: Wire Tier 1 (Toast) celebrations**

- New title earned: in progression.js `checkTitleUnlocks()`, when a new title is pushed → `showCelebrationToast('新称号：XX')`
- Equipment drop: in reward.js when item drops → `showCelebrationToast('获得装备：XX')`
- Gold milestone (1000/5000): in reward.js after gold applied, check thresholds → `showCelebrationToast('金币突破XXXX！')`
- SRS question mastered: in spaced-repetition.js `recordCorrectReview()` when correctStreak >= 3 → `showCelebrationToast('已掌握：XX')`

- [ ] **Step 3: Wire Tier 3 (Fullscreen) celebrations**

- Achievement unlocked: in reward.js milestone checking, when new achievement → `showCelebrationFullscreen('成就解锁', desc, { onDismiss: claimGold })`
- First-time 3-star quest: in reward.js when stars === 3 and no previous stars for this quest → `showCelebrationFullscreen('完美通关！', '★★★')`

- [ ] **Step 4: Verify in browser**

Collect 3rd chengyu → banner. Equip 3rd set piece → banner. Get new title → toast. Complete quest with 3 stars first time → fullscreen celebration.

- [ ] **Step 5: Commit**

```bash
git add js/progression.js js/screens/inventory.js js/screens/chapter-map.js js/screens/reward.js js/spaced-repetition.js
git commit -m "feat: celebration triggers for all tiers — toasts, banners, fullscreen"
```

---

### Task 14: Learning Feedback

**Files:**
- Modify: `js/screens/combat.js`
- Modify: `js/screens/boss.js`
- Modify: `js/screens/puzzle.js`
- Modify: `js/screens/reward.js`

- [ ] **Step 1: Log questions in combat.js**

In `handleAnswer()`, after recording the answer, push to `questionsLog`:

```javascript
const quest = gameState.currentQuest;
if (quest?.results?.questionsLog) {
  quest.results.questionsLog.push({
    prompt: q.prompt,
    correct: isCorrect,
    explanation: q.explanation || '',
    isReview: q.isReview || false,
  });
}
```

Do the same in boss.js and puzzle.js answer handlers.

- [ ] **Step 2: Add review badge in combat.js**

When rendering a question, if `q.isReview` is true, prepend "📝 复习 | " to the question prompt or add a badge element above the question text.

- [ ] **Step 3: Render learning summary in reward.js**

After the existing reward content, add a collapsible "学习回顾" section. Render the first 5 entries from `quest.results.questionsLog` with ✅/❌ icons. Add "展开更多" button if > 5 entries. Wrong answers show "→ 已加入复习队列" suffix.

- [ ] **Step 4: Verify in browser**

Complete a quest with some right/wrong answers. On reward screen, see learning summary with ✅/❌ per question. Review questions show 📝 badge during combat.

- [ ] **Step 5: Commit**

```bash
git add js/screens/combat.js js/screens/boss.js js/screens/puzzle.js js/screens/reward.js
git commit -m "feat: learning feedback — question log, review badge, reward summary"
```

---

## Phase 4: Combat & Economy (Tasks 15-20)

### Task 15: Combat Streak Escalation

**Files:**
- Modify: `js/screens/combat.js`

- [ ] **Step 1: Add streak milestone effects in handleAnswer correct path**

After combo increments, check thresholds:

```javascript
if (combo === 3) { showCelebrationToast('不错！', { type: 'combo' }); }
if (combo === 5) { screenFlash('#d4a017', 150); showCelebrationToast('厉害！', { type: 'combo' }); }
if (combo === 8) { shakeScreen(4, 200); burstParticles(20, 'victory'); profile.gold += 20; showCelebrationToast('无敌！+20金', { type: 'combo' }); }
if (combo === 10) { burstAtPoint(cx, cy, 30, 'gold', 'explode'); showCelebrationBanner('完美连击！', '下一题双倍经验'); doubleXPNext = true; }
```

- [ ] **Step 2: Add killing blow enhancement**

In the existing killing blow code block (around line 2103), extend the setTimeout to add ink-particle shatter via `burstAtPoint(ex, ey, 25, 'purple', 'explode')` and gold coin burst.

- [ ] **Step 3: Verify in browser**

Get 3, 5, 8, 10 combo in combat. See escalating effects. Kill enemy — see enhanced shatter.

- [ ] **Step 4: Commit**

```bash
git add js/screens/combat.js
git commit -m "feat: combat streak milestones with escalating visual feedback"
```

---

### Task 16: Boss Phase Transition Narratives

**Files:**
- Modify: `js/screens/boss.js`

- [ ] **Step 1: Add phase transition narrative overlay**

In the phase change detection code (around line 443-447), when `phaseTransition` is detected, create a narrative overlay div with dark backdrop and typewriter text:

```javascript
const narratives = {
  1: '墨暗之力开始凝聚……',
  2: '墨暗之力全面爆发！',
};
```

Show for 1.5s, then fade out and continue to next phase. Use `playStinger('phase_change')` (already exists).

- [ ] **Step 2: Verify in browser**

Fight a boss, get to phase 2 transition. See narrative overlay with text, then boss resumes.

- [ ] **Step 3: Commit**

```bash
git add js/screens/boss.js
git commit -m "feat: boss phase transition narrative overlays"
```

---

### Task 17: Consumables in Combat

**Files:**
- Modify: `js/screens/combat.js`
- Modify: `js/screens/boss.js`

- [ ] **Step 1: Add "使用道具" button to combat screen**

In the abilities row (where hint/skip/double buttons are), add a "道具" button. Only visible if `profile.consumables` has any items with count > 0.

- [ ] **Step 2: Build consumable overlay**

When "道具" tapped, pause the timer and show a quick-select overlay listing owned consumables with their effects. Tapping an item: consumes it (decrements count), applies effect (heal HP, restore wenli, activate XP boost), closes overlay, resumes timer.

- [ ] **Step 3: Apply same to boss.js**

Copy the consumable button and overlay pattern to boss.js. Same behavior.

- [ ] **Step 4: Verify in browser**

Buy a potion from shop. Enter combat. See "道具" button. Tap → overlay shows potion. Use it → HP heals, count decrements. Timer resumes.

- [ ] **Step 5: Commit**

```bash
git add js/screens/combat.js js/screens/boss.js
git commit -m "feat: consumable items usable during combat and boss fights"
```

---

### Task 18: Economy Rebalancing

**Files:**
- Modify: `js/screens/shop.js`

- [ ] **Step 1: Update getUpgradeCost() in shop.js**

Change the upgrade cost formula:

```javascript
export function getUpgradeCost(item, currentLevel) {
  const base = item.price || 50;
  const multipliers = [0.5, 1.0, 2.0]; // front-loaded: cheap first upgrade
  return Math.round(base * (multipliers[currentLevel] || 2.0));
}
```

- [ ] **Step 2: Verify in browser**

Open shop forge tab. See updated upgrade costs: first upgrade is cheap, third is expensive.

- [ ] **Step 3: Commit**

```bash
git add js/screens/shop.js
git commit -m "feat: rebalanced equipment upgrade cost curve"
```

---

### Task 19: Cosmetic Gold Sink — Name Card Frames

**Files:**
- Modify: `js/state.js` (add `ownedFrames`, `activeFrame` to DEFAULT_PROFILE + backfill)
- Modify: `js/screens/shop.js` (add frames tab/section)
- Modify: `js/screens/profile.js` (render active frame on character card)

- [ ] **Step 1: Add frame data and state fields**

Add to state.js DEFAULT_PROFILE: `ownedFrames: [], activeFrame: null`
Add backfill: `if (!p.ownedFrames) p.ownedFrames = []; if (!('activeFrame' in p)) p.activeFrame = null;`

Define 6-8 frames in shop.js:
```javascript
const FRAMES = [
  { id: 'frame-bronze', name: '青铜之框', era: '先秦', price: 500, border: '3px solid #c17f3c' },
  { id: 'frame-jade', name: '翡翠之框', era: '汉代', price: 800, border: '3px solid #2ecc8a' },
  { id: 'frame-gold', name: '黄金之框', era: '唐代', price: 1200, border: '3px solid #d4a017' },
  { id: 'frame-crimson', name: '朱红之框', era: '宋代', price: 1500, border: '3px solid #e74c3c' },
  { id: 'frame-ink', name: '水墨之框', era: '近现代', price: 2000, border: '3px double #aaa' },
  { id: 'frame-dragon', name: '龙纹之框', era: '传说', price: 2000, border: '3px solid #a855f7' },
];
```

- [ ] **Step 2: Add frames section to shop**

New tab or section in shop.js showing frames with preview, price, and buy/equip buttons. Owned frames show "装备" (equip) instead of price.

- [ ] **Step 3: Render active frame on profile card**

In profile.js character card, if `profile.activeFrame`, apply the frame's border style to the card.

- [ ] **Step 4: Verify in browser**

Buy a frame → appears in owned. Equip → profile card shows border. Switch frames.

- [ ] **Step 5: Commit**

```bash
git add js/state.js js/screens/shop.js js/screens/profile.js
git commit -m "feat: cosmetic name card frames as endgame gold sink"
```

---

### Task 20: Daily Login Visual Calendar

**Files:**
- Modify: `js/screens/daily.js` (enhance `buildStreakCalendar`)

- [ ] **Step 1: Enhance buildStreakCalendar to show future rewards**

The existing `buildStreakCalendar` shows the last 7 days. Enhance to also show TOMORROW's reward:

```
[日] [一] [二] [三] [四] [五] [六]
 30金 50金 50金+ 80金 80金+ 100金 150金+
  ✓    ✓    ●    ○    ○     ○    ○
        30经验        50经验      全部
```

Each cell shows: day label, reward amount, status icon (✓ played, ● today, ○ future). Future reward values are visible, motivating players to come back.

- [ ] **Step 2: Verify in browser**

Open daily screen. See 7-day calendar with past days checked, today highlighted, future rewards visible.

- [ ] **Step 3: Commit**

```bash
git add js/screens/daily.js
git commit -m "feat: daily login visual calendar showing future rewards"
```

---

## Phase 5: Final Integration (Task 21)

### Task 21: Integration Verification and Cleanup

**Files:**
- All modified files

- [ ] **Step 1: Full gameplay flow test**

Test complete flow: Title → inline form (new player) → chapter-map → tap first encounter → combat → reward → return to map → see stars → continue through chapter → boss fight → chapter complete. Verify celebrations trigger, nudges appear, goal tracker updates.

- [ ] **Step 2: Returning player test**

Reload → tap title → straight to chapter-map at correct position. All nav buttons correct for level. Notification dots showing.

- [ ] **Step 3: Remove dead code**

Remove worldmap.js and quest.js from screen registration (keep files for reference). Remove any orphaned imports.

- [ ] **Step 4: Update CLAUDE.md and sw.js**

Add chapter-map.js, celebrations-ui.js, goals.js, nav.js to the architecture documentation in CLAUDE.md. Update screen descriptions. Verify sw.js handles new JS files (current sw.js uses a blanket no-cache pattern for all .js files, so no explicit file list update needed — just verify).

- [ ] **Step 5: Final commit**

```bash
git add -A
git commit -m "feat: engagement optimization complete — chapter map, celebrations, progressive disclosure"
```
