// js/game-engine.js — Generates quest encounter sequences and manages quest state
import { gameState } from './state.js';
import { loadContent, pickQuestions, pickReadingPassage } from './content-loader.js';
import { getDueReviews } from './spaced-repetition.js';

// Encounter types: 'combat', 'puzzle', 'boss', 'treasure', 'rest'
function generateEncounterSequence(chapterId, questIndex, playerHpPercent = 1) {
  const patterns = [
    ['combat', 'puzzle', 'combat', 'puzzle', 'boss'],
    ['combat', 'combat', 'puzzle', 'combat', 'boss'],
    ['combat', 'puzzle', 'combat', 'combat', 'boss'],
    ['combat', 'combat', 'puzzle', 'puzzle', 'boss'],
    ['combat', 'puzzle', 'puzzle', 'combat', 'boss'],
    ['combat', 'combat', 'combat', 'puzzle', 'boss'],
  ];

  // Vary pattern selection using both chapterId (hash) and questIndex so
  // different chapters feel distinct even at the same quest index.
  const chapterHash = String(chapterId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const patternIndex = (chapterHash + questIndex) % patterns.length;
  const pattern = [...patterns[patternIndex]];

  // ── Difficulty scaling: later chapters add extra encounters ──────────
  const chapterNum = typeof chapterId === 'number' ? chapterId : parseInt(chapterId, 10) || 1;
  if (chapterNum === 1 && (chapterHash + questIndex) % 3 === 0) {
    // Chapter 1: ~33% chance of a shorter (4-encounter) quest for gentler intro
    pattern.splice(pattern.length - 2, 1); // remove one pre-boss encounter
  } else if (chapterNum >= 4) {
    // Chapters 4-5: insert an extra combat before the boss
    pattern.splice(pattern.length - 1, 0, 'combat');
  }

  // ── Treasure encounter: 20% chance to replace one combat with treasure ──
  const combatIndices = [];
  pattern.forEach((type, i) => {
    if (type === 'combat') combatIndices.push(i);
  });
  if (combatIndices.length > 1 && Math.random() < 0.2) {
    // Replace a random non-first combat encounter with a treasure chest
    const eligible = combatIndices.filter(i => i > 0);
    if (eligible.length > 0) {
      const replaceIdx = eligible[Math.floor(Math.random() * eligible.length)];
      pattern[replaceIdx] = 'treasure';
    }
  }

  // ── Build encounter list ────────────────────────────────────────────
  const encounters = [];
  pattern.forEach((type, i) => {
    const enc = { type, index: i, completed: false };

    if (type === 'treasure') {
      // Treasure gives random gold (30-80) + 20% chance for a consumable
      enc.goldReward = 30 + Math.floor(Math.random() * 51);
      enc.itemDrop = Math.random() < 0.2 ? 'hp-potion' : null;
    }

    encounters.push(enc);
  });

  // ── Rest encounter: appears after a combat if player HP < 50% ───────
  if (playerHpPercent < 0.5) {
    // Find the first combat encounter and insert a rest after it
    const firstCombatIdx = encounters.findIndex(e => e.type === 'combat');
    if (firstCombatIdx >= 0 && firstCombatIdx < encounters.length - 1) {
      encounters.splice(firstCombatIdx + 1, 0, {
        type: 'rest',
        index: firstCombatIdx + 1,
        completed: false,
        hpRestorePercent: 0.3, // restores 30% of max HP
        narrative: getRestNarrative(chapterNum),
      });
      // Re-index after splice
      encounters.forEach((enc, idx) => { enc.index = idx; });
    }
  }

  return encounters;
}

/** Narrative flavor text for rest encounters, themed by chapter */
function getRestNarrative(chapterNum) {
  const narratives = {
    1: '你在古老的竹林中找到一处清泉，稍作休息，恢复了精力。',
    2: '你在驿站中歇脚，店家端来一碗热汤，疲惫渐渐消散。',
    3: '你在长安城的茶楼品茗休憩，窗外传来悠扬的琵琶声。',
    4: '你在清幽的书院中小憩，墨香袅袅，心神渐宁。',
    5: '你在山间古寺中打坐冥想，晨钟暮鼓间元气渐复。',
  };
  return narratives[chapterNum] || narratives[1];
}

export async function startQuest(chapterId, questIndex) {
  const profile = gameState.profile;

  // Regenerate HP and 文力 between quests
  profile.hp = profile.maxHp;
  profile.wenli = profile.maxWenli;
  gameState.save();

  const content = await loadContent(profile.tier);

  // Pass current HP ratio so the generator can insert rest encounters if needed
  const hpPercent = profile.maxHp > 0 ? profile.hp / profile.maxHp : 1;
  const encounters = generateEncounterSequence(chapterId, questIndex, hpPercent);

  // Session-level deduplication: accumulate all question IDs used this quest
  const sessionUsedIds = [];

  // ── Spaced repetition: gather due review questions and inject into combat ──
  const dueReviews = getDueReviews('vocab');
  // Pull up to 2 review questions from the content pool, matched by ID
  const reviewQuestions = [];
  if (dueReviews.length > 0) {
    const reviewIds = dueReviews.slice(0, 2).map(r => r.questionId);
    for (const rid of reviewIds) {
      const found = content.vocab.find(q => q.id === rid);
      if (found) {
        // Shuffle options for the review question (same logic as pickQuestions)
        const correctText = found.options[found.correct];
        const shuffled = [...found.options];
        for (let i = shuffled.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
        }
        reviewQuestions.push({ ...found, options: shuffled, correct: shuffled.indexOf(correctText), isReview: true });
      }
    }
  }
  let reviewInsertIndex = 0; // tracks which combat encounter gets review questions

  // Determine grade-level bias for difficulty calibration
  // Lower tiers (grade1-grade5) weight toward easier questions; upper tiers (grade7-grade8) use full adaptive range
  const gradeBias = profile.tier; // e.g. 'grade1', 'grade3', 'grade4', 'grade5', 'grade7', 'grade8'

  // Pre-assign content to encounters
  const diffTarget = getAdaptiveDifficulty(profile, 'vocab');
  for (const enc of encounters) {
    if (enc.type === 'combat') {
      // Load large question pool — combat draws from ALL available questions
      // to avoid repetition even during long battles
      const combatPoolSize = Math.min(content.vocab.length, 50);
      enc.questions = pickQuestions(content.vocab, combatPoolSize, profile.seenQuestions.vocab, diffTarget, sessionUsedIds, gradeBias);
      enc.questions.forEach(q => sessionUsedIds.push(q.id));
      // Inject 1-2 review questions into the first combat encounter
      if (reviewInsertIndex === 0 && reviewQuestions.length > 0) {
        // Insert review questions near the start (after the first regular question)
        const insertAt = Math.min(1, enc.questions.length);
        enc.questions.splice(insertAt, 0, ...reviewQuestions);
        reviewQuestions.forEach(q => sessionUsedIds.push(q.id));
      }
      reviewInsertIndex++;
    } else if (enc.type === 'puzzle') {
      const rdTarget = getAdaptiveDifficulty(profile, 'reading');
      enc.passage = pickReadingPassage(content.reading, profile.seenQuestions.reading, rdTarget);
      if (enc.passage?.id) sessionUsedIds.push(enc.passage.id);
    } else if (enc.type === 'boss') {
      const clTarget = getAdaptiveDifficulty(profile, 'classical');
      // Boss gets even larger pool to prevent repetition across 3 phases
      const bossPoolSize = Math.min(content.classical.length, 60);
      enc.questions = pickQuestions(content.classical, bossPoolSize, profile.seenQuestions.classical, clTarget, sessionUsedIds, gradeBias);
      enc.questions.forEach(q => sessionUsedIds.push(q.id));
    }
    // 'treasure' and 'rest' encounters have no questions — their data is set at generation time

    // ── Fallback: ensure combat/boss encounters always have questions ──
    if ((enc.type === 'combat' || enc.type === 'boss') && (!enc.questions || enc.questions.length === 0)) {
      enc.questions = [{
        id: '_fallback',
        prompt: '请选择正确的答案',
        options: ['正确', '错误', '不知道', '再想想'],
        correct: 0,
        difficulty: 1,
        explanation: '内容加载失败，已跳过本题。',
      }];
    }

    // ── Fallback: ensure puzzle encounters always have a passage ──
    if (enc.type === 'puzzle' && !enc.passage) {
      // Replace with a treasure encounter instead of showing a broken puzzle
      enc.type = 'treasure';
      enc.goldReward = 30 + Math.floor(Math.random() * 21);
      enc.itemDrop = null;
    }
  }

  gameState.currentQuest = {
    chapterId,
    questIndex,
    encounters,
    currentEncounter: 0,
    results: { correct: 0, total: 0, combo: 0, maxCombo: 0, xpEarned: 0, itemsFound: [], questionsLog: [] },
    sessionUsedIds,
  };

  return gameState.currentQuest;
}

export function getAdaptiveDifficulty(profile, contentType) {
  const recent = profile.accuracy[contentType]?.slice(-20) || [];
  if (recent.length < 5) return 3;

  const avg = recent.reduce((a, b) => a + b, 0) / recent.length;

  // Smooth sliding scale instead of hard thresholds
  // Maps accuracy 0.0-1.0 to difficulty 1-5
  if (avg > 0.95) return 5;
  if (avg > 0.85) return 4;
  if (avg > 0.65) return 3;
  if (avg > 0.45) return 2;
  return 1;
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

export function recordAnswer(contentType, correct, questionId) {
  const profile = gameState.profile;
  profile.accuracy[contentType].push(correct ? 1 : 0);
  // Keep last 50
  if (profile.accuracy[contentType].length > 50) {
    profile.accuracy[contentType] = profile.accuracy[contentType].slice(-50);
  }

  // Track seen question IDs — keep enough to cover most of the pool
  if (questionId && !profile.seenQuestions[contentType].includes(questionId)) {
    profile.seenQuestions[contentType].push(questionId);
  }
  // Cap at 500 to prevent unbounded growth (covers full pool for most grades)
  if (profile.seenQuestions[contentType].length > 500) {
    profile.seenQuestions[contentType] = profile.seenQuestions[contentType].slice(-500);
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
