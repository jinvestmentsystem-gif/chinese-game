// js/game-engine.js — Generates quest encounter sequences and manages quest state
import { gameState } from './state.js';
import { loadContent, pickQuestions, pickReadingPassage } from './content-loader.js';
import { getDueReviews } from './spaced-repetition.js';

// ── Encounter modifiers — random rule changes per combat/boss ──────────────
const ENCOUNTER_MODIFIERS = [
  { id: 'elite',     name: '精英',   desc: '敌人更强，经验+50%',        xpMult: 1.5, enemyHpMult: 1.5, weight: 3 },
  { id: 'blitz',     name: '速攻',   desc: '时间减半，连击伤害翻倍',    timerMult: 0.5, comboDmgMult: 2, weight: 2 },
  { id: 'goldRush',  name: '金潮',   desc: '金币奖励翻倍',             goldMult: 2, weight: 3 },
  { id: 'headwind',  name: '逆风',   desc: '伤害-20%，经验+75%',       dmgMult: 0.8, xpMult: 1.75, weight: 2 },
  { id: 'critical',  name: '暴击风暴', desc: '暴击率+30%',              critBonus: 0.3, weight: 2 },
  { id: 'fragile',   name: '脆弱',   desc: '双方伤害+50%',             dmgMult: 1.5, enemyDmgMult: 1.5, weight: 1 },
  null, null, null, // ~30% chance of no modifier (weighted)
];

function rollModifier() {
  const pool = ENCOUNTER_MODIFIERS.flatMap(m => m ? Array(m.weight).fill(m) : [null, null, null]);
  return pool[Math.floor(Math.random() * pool.length)] || null;
}

// ── Quest objectives — bonus goals for extra rewards ────────────────────────
const QUEST_OBJECTIVES = [
  { id: 'combo5',     desc: '达成5连击',           check: r => r.maxCombo >= 5,  bonusXP: 30, bonusGold: 20 },
  { id: 'combo10',    desc: '达成10连击',          check: r => r.maxCombo >= 10, bonusXP: 60, bonusGold: 40 },
  { id: 'noHpLoss',   desc: '不损失HP',            check: (r, q) => q._startHp === q._endHp, bonusXP: 50, bonusGold: 30 },
  { id: 'accuracy80', desc: '正确率80%以上',        check: r => r.total > 0 && (r.correct / r.total) >= 0.8, bonusXP: 25, bonusGold: 15 },
  { id: 'accuracy95', desc: '正确率95%以上',        check: r => r.total > 0 && (r.correct / r.total) >= 0.95, bonusXP: 50, bonusGold: 30 },
  { id: 'perfect',    desc: '全部答对',            check: r => r.total > 0 && r.correct === r.total, bonusXP: 80, bonusGold: 50 },
  { id: 'fast',       desc: '3分钟内完成',          check: (r, q) => q._elapsed < 180000, bonusXP: 40, bonusGold: 25 },
];

function pickObjective(chapterId, questIndex) {
  // Harder objectives for later chapters
  const eligible = chapterId <= 2
    ? QUEST_OBJECTIVES.filter(o => ['combo5', 'accuracy80', 'fast'].includes(o.id))
    : QUEST_OBJECTIVES;
  const seed = (chapterId * 7 + questIndex * 13) % eligible.length;
  return eligible[seed];
}

// Encounter types: 'combat', 'puzzle', 'boss', 'treasure', 'rest'
// Structure: quests 1-4 are regular (combat+puzzle), quest 5 is the boss finale
const QUESTS_PER_CHAPTER = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 };

function generateEncounterSequence(chapterId, questIndex, playerHpPercent = 1) {
  const chapterNum = typeof chapterId === 'number' ? chapterId : parseInt(chapterId, 10) || 1;
  const maxQuests = QUESTS_PER_CHAPTER[chapterNum] || 5;
  const isBossQuest = questIndex === maxQuests - 1; // Last quest = boss fight

  // Regular quest patterns (no boss — combat and puzzle only)
  const regularPatterns = [
    ['combat', 'puzzle', 'combat', 'puzzle', 'combat'],
    ['combat', 'combat', 'puzzle', 'combat', 'puzzle'],
    ['combat', 'puzzle', 'combat', 'combat', 'puzzle'],
    ['puzzle', 'combat', 'puzzle', 'combat', 'combat'],
    ['combat', 'puzzle', 'puzzle', 'combat', 'combat'],
  ];

  // Boss quest patterns (climactic finale)
  const bossPatterns = [
    ['combat', 'puzzle', 'combat', 'puzzle', 'boss'],
    ['combat', 'combat', 'puzzle', 'combat', 'boss'],
    ['combat', 'puzzle', 'combat', 'combat', 'boss'],
  ];

  const patterns = isBossQuest ? bossPatterns : regularPatterns;

  // Vary pattern selection using both chapterId (hash) and questIndex
  const chapterHash = String(chapterId).split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  const patternIndex = (chapterHash + questIndex) % patterns.length;
  const pattern = [...patterns[patternIndex]];

  // ── Difficulty scaling: later chapters add extra encounters ──────────
  if (chapterNum === 1 && !isBossQuest && (chapterHash + questIndex) % 3 === 0) {
    // Chapter 1: ~33% chance of a shorter (4-encounter) quest for gentler intro
    pattern.splice(pattern.length - 1, 1);
  } else if (chapterNum >= 4 && isBossQuest) {
    // Chapters 4-5: insert an extra combat before the boss for harder finale
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
      // Treasure scales by chapter (was flat 30-80)
      const chapterScale = 1 + (chapterNum - 1) * 0.4; // ch1=1x, ch5=2.6x
      enc.goldReward = Math.round((30 + Math.floor(Math.random() * 51)) * chapterScale);
      enc.itemDrop = Math.random() < 0.2 ? 'hp-potion' : null;
    }

    // Roll encounter modifier for combat/boss (not first encounter, to ease new players in)
    if ((type === 'combat' || type === 'boss') && i > 0) {
      enc.modifier = rollModifier();
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

  // Check for saved mid-quest state (browser was closed mid-quest)
  if (gameState._savedQuestState) {
    const sq = gameState._savedQuestState;
    if (sq.chapterId === chapterId && sq.questIndex === questIndex && sq.currentEncounter > 0) {
      // Saved state matches and player had progressed — skip already-completed encounters
      // We can't restore the exact question state (not persisted), but we advance the encounter pointer
      // and restore result counters so the reward screen calculates correctly
      gameState._savedQuestState = null;
      // Don't full-heal — player resumes where they left off
      const content = await loadContent(profile.tier);
      const hpPercent = profile.maxHp > 0 ? profile.hp / profile.maxHp : 1;
      const encounters = generateEncounterSequence(chapterId, questIndex, hpPercent);
      // Mark earlier encounters as completed
      for (let i = 0; i < Math.min(sq.currentEncounter, encounters.length); i++) {
        encounters[i].completed = true;
      }
      gameState.currentQuest = {
        chapterId, questIndex, encounters,
        currentEncounter: Math.min(sq.currentEncounter, encounters.length),
        results: sq.results || { correct: 0, total: 0, combo: 0, maxCombo: 0, xpEarned: 0, itemsFound: [], questionsLog: [] },
      };
      gameState.save();
      return gameState.currentQuest;
    }
    gameState._savedQuestState = null; // Clear non-matching saved state
  }

  // Regenerate HP and 文力 between quests (fresh start)
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
        // Shuffle options for the review question — track by index, not text
        const indices = found.options.map((_, i) => i);
        for (let i = indices.length - 1; i > 0; i--) {
          const j = Math.floor(Math.random() * (i + 1));
          [indices[i], indices[j]] = [indices[j], indices[i]];
        }
        const shuffled = indices.map(i => found.options[i]);
        reviewQuestions.push({ ...found, options: shuffled, correct: indices.indexOf(found.correct), isReview: true });
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
      enc.passage = pickReadingPassage(content.reading, profile.seenQuestions.reading, rdTarget, sessionUsedIds);
      if (enc.passage?.id) sessionUsedIds.push(enc.passage.id);
    } else if (enc.type === 'boss') {
      // Boss gets classical questions; fall back to vocab if classical pool is empty
      const bossPool = content.classical.length > 0 ? content.classical : content.vocab;
      const clTarget = getAdaptiveDifficulty(profile, bossPool === content.classical ? 'classical' : 'vocab');
      const bossPoolSize = Math.min(bossPool.length, 60);
      enc.questions = pickQuestions(bossPool, bossPoolSize, profile.seenQuestions.classical, clTarget, sessionUsedIds, gradeBias);
      enc.questions.forEach(q => sessionUsedIds.push(q.id));
    }
    // 'treasure' and 'rest' encounters have no questions — their data is set at generation time
  }

  // Pick a quest objective for bonus rewards
  const objective = pickObjective(chapterId, questIndex);

  gameState.currentQuest = {
    chapterId,
    questIndex,
    encounters,
    currentEncounter: 0,
    results: { correct: 0, total: 0, combo: 0, maxCombo: 0, xpEarned: 0, itemsFound: [], questionsLog: [] },
    sessionUsedIds,
    objective, // Bonus goal for extra XP/gold
    _startHp: gameState.profile.hp,
    _startTime: Date.now(),
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
  // Save after each encounter so mid-quest progress survives browser close
  gameState.save();
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
  if (!profile.accuracy[contentType]) profile.accuracy[contentType] = [];
  profile.accuracy[contentType].push(correct ? 1 : 0);
  // Keep last 50
  if (profile.accuracy[contentType].length > 50) {
    profile.accuracy[contentType] = profile.accuracy[contentType].slice(-50);
  }

  // Track seen question IDs — keep 500 to cover full content pool for diversity
  if (!profile.seenQuestions[contentType]) profile.seenQuestions[contentType] = [];
  if (questionId && !profile.seenQuestions[contentType].includes(questionId)) {
    profile.seenQuestions[contentType].push(questionId);
    if (profile.seenQuestions[contentType].length > 500) {
      profile.seenQuestions[contentType] = profile.seenQuestions[contentType].slice(-500);
    }
  }

  const quest = gameState.currentQuest;
  if (!quest?.results) return;
  quest.results.total++;
  if (correct) {
    quest.results.correct++;
    quest.results.combo++;
    quest.results.maxCombo = Math.max(quest.results.maxCombo, quest.results.combo);
  } else {
    quest.results.combo = 0;
  }
}
