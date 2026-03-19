# 文字侠 (Word Hero) — Project Instructions

## Architecture
- Pure client-side: HTML5, CSS3, vanilla JS (ES modules). No build tools, no backend.
- Serve locally: `python -m http.server 8080` from project root.
- All game state flows through `gameState` singleton in `js/state.js`, persisted to localStorage.
- Screens register via `registerScreen(name, renderFn)` and navigate via `showScreen(name, params)`.
- Service worker (`sw.js`) handles cache-busting for JS/CSS/JSON assets.

### Core Systems
- `js/main.js` — Screen registry, navigation, module bootstrap
- `js/state.js` — Game state singleton, localStorage persistence
- `js/game-engine.js` — Quest/encounter generation, adaptive difficulty, answer recording
- `js/content-loader.js` — Loads vocab, reading, classical, chengyu JSON content
- `js/progression.js` — Level-up, stat calculations, talent/ability system
- `js/audio.js` — Procedural Web Audio API music/SFX with FM synthesis and waveshaper distortion
- `js/router.js` — URL hash-based routing

### Visual & Effects Systems
- `js/particles.js` — Canvas particle system (ambient, combat, boss, victory modes; visibility-aware, frame-skip on low FPS, 50-particle hard cap)
- `js/effects.js` — Screen-level visual effects (shakes, flashes, transitions)
- `js/pixel-sprites.js` — Pixel art sprite generation for characters/enemies
- `js/sprites.js` — SVG sprite definitions for player, enemies, items

### Engagement Systems
- `js/celebrations-ui.js` — Centralized celebration system (Tier 1 toast, Tier 2 banner, Tier 3 fullscreen)
- `js/goals.js` — Next-goal tracker logic (priority-based: stat points > quest > daily > chapter > achievement)
- `js/nav.js` — Progressive disclosure (computes visible features by player level/state, notification dots)

### Utility Systems
- `js/error-handler.js` — Global error boundary, save indicator, toast notification system (`window.showToast()`)
- `js/tutorial.js` — First-time-user tutorial flow + contextual engagement tips
- `js/spaced-repetition.js` — SRS algorithm for vocabulary review scheduling

### Game Screens (`js/screens/`)
- `chapter-map.js` — Merged chapter map (Ring Fit Adventure style): scrollable vertical path showing all quests + encounters per chapter, chapter selector overlay, goal tracker, progressive nav bar. Replaces worldmap.js + quest.js.
- `combat.js` — Vocabulary combat with sprite animations, combo system, streak milestones, consumable use, crit effects
- `puzzle.js` — Reading comprehension puzzle encounters
- `boss.js` — Boss fights with chengyu bonus rounds, multi-phase mechanics, phase transition narratives
- `encounter-intro.js` — Dramatic encounter intro overlay (auto-skip after 3+ encounters, era-tinted backgrounds)
- `worldmap.js` — (RETIRED) Replaced by chapter-map.js
- `quest.js` — (RETIRED) Replaced by chapter-map.js
- `reward.js` — Post-quest reward summary with star ratings, learning summary
- `chapter-complete.js` — Chapter completion celebration
- `story.js` — Narrative cutscenes between chapters
- `companion.js` — AI companion dialogue bubbles
- `shop.js` — Gold-spending item shop
- `inventory.js` — Player inventory management
- `profile.js` — Player profile and stats display
- `stats-screen.js` — Detailed statistics and progress analytics
- `settings.js` — Audio, display, and gameplay settings
- `levelup.js` — Level-up celebration and stat allocation
- `daily.js` — Daily challenge system
- `arena.js` — Arena/challenge mode
- `chengyu.js` — Chengyu collection and review

## Code Conventions
- Chinese UI text throughout (buttons, labels, narratives). English only in code comments and variable names.
- ES module imports/exports. No CommonJS.
- No external frameworks — vanilla JS only. CDN libs (Howler, PixiJS) loaded in index.html.
- Inline styles are acceptable in screen render functions for component-specific styling.
- CSS custom properties defined in `:root` of `css/styles.css` for theme consistency.

## Content
- `content/grade3/` and `content/grade7/` contain vocab.json, classical.json, reading.json.
- `content/chengyu.json` is shared across grades.
- Questions have `id`, `prompt`, `options[]`, `correct` (index), `difficulty` (1-5), `explanation`.

## Encounter Types
- `combat` — Vocabulary quiz battles against enemies
- `puzzle` — Reading comprehension passages
- `boss` — Extended multi-phase fights with chengyu rounds
- `treasure` — Gold/item reward chests (20% chance to replace a combat encounter)
- `rest` — HP restoration scenes (inserted when player HP < 50%)

## Responsive Breakpoints
- `768px` — Tablet: reduced spacing, smaller fonts, compact combat UI
- `640px` — Large phone: stat bar layout adjustments
- `480px` — Phone: single-column layouts, touch-optimized controls
- `420px` — Small phone: single-column combat options
- `360px` — Minimum: smallest text sizes, minimal padding
- `max-height: 500px` landscape — Landscape phone: compact vertical layout
- `pointer: coarse` — Touch devices: larger touch targets (min 48px)
- `hover: hover` / `hover: none` — Hover effects only on mouse devices
- `prefers-reduced-motion` — Disables animations for accessibility

## PWA Support
- Service worker (`sw.js`) for asset cache management
- No-cache headers for development; service worker handles cache-busting in production

## Key Design Principles
- Stats (attack, defense, speed, wenli, HP) must have VISIBLE, DRAMATIC effects on gameplay.
- Every resource earned (gold, XP, items, chengyu) must have a clear purpose.
- Progression should hook players — always show what's next (next unlock, next level, next chapter).
- Ink-wash (水墨画) aesthetic with gold/jade/red accent palette on dark backgrounds.
- Performance: particle system pauses when tab is backgrounded; frame skipping on low-FPS devices; hard particle cap of 50.
