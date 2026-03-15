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

  // Regenerate HP and 文力 between quests
  profile.hp = profile.maxHp;
  profile.wenli = profile.maxWenli;
  gameState.save();

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
