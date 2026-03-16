# 文字侠 (Word Hero) — Project Instructions

## Architecture
- Pure client-side: HTML5, CSS3, vanilla JS (ES modules). No build tools, no backend.
- Serve locally: `python -m http.server 8080` from project root.
- All game state flows through `gameState` singleton in `js/state.js`, persisted to localStorage.
- Screens register via `registerScreen(name, renderFn)` and navigate via `showScreen(name, params)`.

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

## Key Design Principles
- Stats (attack, defense, speed, wenli, HP) must have VISIBLE, DRAMATIC effects on gameplay.
- Every resource earned (gold, XP, items, chengyu) must have a clear purpose.
- Progression should hook players — always show what's next (next unlock, next level, next chapter).
- Ink-wash (水墨画) aesthetic with gold/jade/red accent palette on dark backgrounds.
