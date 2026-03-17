# HANDOFF — Session State (2026-03-17)

## 1. Overarching Objective

Transform 文字侠 (Word Hero) from a prototype into a commercial-grade Chinese language learning RPG. The game is a browser-based combat RPG (pure HTML/CSS/JS) teaching Chinese to students from Grade 1 through Grade 9. The user wants:
- **Stunning visuals** inspired by Octopath Traveler (HD-2D), Persona 5 (kinetic UI), Okami (ink-wash), Journey (atmospheric glow)
- **Massive content database** — 10x expansion to thousands of curriculum-aligned questions per grade
- **Deep, engaging gameplay** — meaningful stats, talent tree, enemy variety, spaced repetition
- **Mobile responsive**, PWA-installable, accessible from anywhere
- **Live at**: https://jinvestmentsystem-gif.github.io/chinese-game/
- **GitHub repo**: https://github.com/jinvestmentsystem-gif/chinese-game (public)

## 2. Current Step — Content 10x Expansion (Partially Complete)

We completed 4 phases of game overhaul + are midway through massive content expansion.

### Phases Completed:
- **Phase 1** (commit 338cc0e): Talent tree, stat formulas, crits, daily rewards, titles, visual overhaul
- **Phase 2** (commit cf33bbb): Mobile responsive, settings, analytics, tutorial, forge, 7 SFX
- **Phase 3** (commit 2c9d11f): Enemy variety (5 types), game balance, arena, collections, effects
- **Phase 4** (commit c33a87a): Spaced repetition, PWA, animated sprites, save management, error boundary
- **Bugfix** (commit 8315e34): Combat logic — questions loop, thorns can't kill, win requires enemy HP=0
- **Visual overhaul** (commit 80c2371): HD-2D vignette/bloom/bokeh, Persona 5 diagonal wipes, Okami ink splashes, cinematic title screen
- **Bugfix** (commit 397c2b7): Removed aggressive vignette overlay that darkened all screens
- **Bugfix** (commit 451906e): Fixed question repetition (50-question pools), music auto-decay, volume reduction
- **Content** (commits 8161913 through ffa3210): Base content for all 6 grade tiers + grade 1/3/7 expansions

### Content Status (items = questions + passages):

| Grade Tier | Base | Extra | Total | Status |
|-----------|------|-------|-------|--------|
| grade1 (一二年级) | 270 | 800 | **1,070** | DONE |
| grade3 (三年级) | 430 | 450 | **880** | classical_extra.json uncommitted (150 items) |
| grade4 (四五年级) | 320 | 0 | **320** | NEEDS: vocab_extra.json + classical_extra.json |
| grade5 (五六年级) | 320 | 0 | **320** | NEEDS: vocab_extra.json + classical_extra.json |
| grade7 (七年级) | 640 | 500 | **1,140** | NEEDS: vocab_extra.json |
| grade8 (八九年级) | 530 | 150 | **680** | classical_extra.json uncommitted (150 items); NEEDS: vocab_extra.json |
| chengyu | 60 | — | **60** | DONE |
| **TOTAL** | | | **~4,470** | Target: 7,000+ |

### Content agents that hit API rate limit (need re-dispatch next session):
- Grade 4 vocab_extra (300 questions)
- Grade 4 classical_extra (300 questions)
- Grade 5 vocab_extra (300 questions)
- Grade 5 classical_extra (300 questions)
- Grade 7 vocab_extra (300 questions)
- Grade 8 vocab_extra (300 questions)

## 3. Known Bugs / Issues

### Fixed this session:
- ✅ Wrong answers still defeated enemies (questions exhausted = auto-win) → questions now loop
- ✅ Thorns could kill enemies on wrong answers → thorns min 1 HP
- ✅ Vignette overlay (z-index 9999, mix-blend-mode multiply) made all screens too dark → disabled
- ✅ bg-depth-far CSS blur applied to entire combat/boss screens → removed
- ✅ Same 5 questions repeated in combat → pool increased to 50, database expanded
- ✅ Music intensity ramped up permanently on combos → auto-decays after 3-4 seconds
- ✅ Music too loud → master volume reduced from 0.65 to 0.35

### Still needs investigation:
- **Aesthetics**: User says "gameplay aesthetics is still lousy and ugly now. Very plain." — More visual polish needed. Consider: richer combat backgrounds, animated transitions between encounters, more particle effects, UI card redesign.
- **ERR_INVALID_URL**: Minor console error on page load — likely old favicon reference or manifest issue. Non-blocking.
- **Title screen on first visit**: New players see the opening story first, not the cinematic title screen. The title screen only shows for returning players. Consider showing the cinematic title BEFORE the story.
- **Grade label display**: Some screens may still show old binary grade labels. The grade system update agent fixed most but verify all screens.
- **Content quality**: Generated questions should be spot-checked for accuracy (correct answers, valid explanations, appropriate difficulty).

## 4. Uncommitted Files

```
?? content/grade3/classical_extra.json   (150 items — valid JSON, ready to commit)
?? content/grade8/classical_extra.json   (150 items — valid JSON, ready to commit)
```

No modified tracked files are uncommitted.

## 5. Exact Next Steps

### Immediate (next session start):
1. **Commit the 2 uncommitted extra files**:
   ```bash
   git add content/grade3/classical_extra.json content/grade8/classical_extra.json
   git commit -m "feat: +150 grade 3 classical, +150 grade 8 classical extras"
   git push origin master
   ```

2. **Re-dispatch content agents** for the 6 missing _extra.json files (each 300 questions):
   - `content/grade4/vocab_extra.json` (grade 4-5 vocab, 300 questions, difficulty 2-4)
   - `content/grade4/classical_extra.json` (grade 4-5 classical, 300 questions, difficulty 2-4)
   - `content/grade5/vocab_extra.json` (grade 5-6 vocab, 300 questions, difficulty 2-4)
   - `content/grade5/classical_extra.json` (grade 5-6 classical, 300 questions, difficulty 3-4)
   - `content/grade7/vocab_extra.json` (grade 7 vocab, 300 questions, difficulty 2-5)
   - `content/grade8/vocab_extra.json` (grade 8-9 vocab, 300 questions, difficulty 3-5)

3. **Visual polish** — user wants much better aesthetics:
   - Richer combat/quest backgrounds with more layers
   - Better world map visual design
   - More impressive enemy/boss encounter presentations
   - Consider adding background images (CSS gradients can only go so far)

### Medium-term:
4. **Play-test thoroughly** — 10+ full playthroughs checking every screen
5. **Content quality audit** — verify generated questions for accuracy
6. **Performance profiling** — check load times with large content files
7. **User-reported issues** — garbled words (check JSON encoding), blurred screens (check remaining CSS filter issues)

## 6. Architecture Notes

### Key files to know:
- `js/content-loader.js` — Auto-merges `*_extra.json` files. Just drop a `vocab_extra.json` into any grade directory and it loads automatically.
- `js/game-engine.js` — Combat loads up to 50 questions, boss loads up to 60. Questions loop (shuffle) if exhausted.
- `js/progression.js` — All stat formulas, talent tree (19 talents), XP curve, gold economy
- `js/state.js` — Profile fields + backfill for migration. New fields: talents, talentPoints, titles, dailyLogin, upgrades, wrongAnswerLog, masteredQuestions, tutorialSeen, chaptersRewarded
- `css/styles.css` — ~5000 lines. HD-2D system, Persona 5 transitions, Okami effects, responsive breakpoints all appended at end.
- `js/router.js` — Persona 5 diagonal wipe transitions

### Content file format:
```json
{
  "id": "v7-301",
  "type": "vocab",
  "prompt": "question text",
  "options": ["A", "B", "C", "D"],
  "correct": 0,
  "explanation": "explanation text",
  "difficulty": 3,
  "tags": ["tag1"],
  "source": "curriculum"
}
```

### Grade tier mapping:
- grade1 → 一二年级 (grades 1-2)
- grade3 → 三年级 (grade 3)
- grade4 → 四五年级 (grades 4-5)
- grade5 → 五六年级 (grades 5-6)
- grade7 → 七年级 (grade 7)
- grade8 → 八九年级 (grades 8-9)
