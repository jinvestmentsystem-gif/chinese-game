// js/spaced-repetition.js — Spaced repetition engine for wrong-answer review
import { gameState } from './state.js';

// Record a wrong answer — adds to review queue
export function recordWrongAnswer(questionId, contentType) {
  const profile = gameState.profile;
  const existing = profile.wrongAnswerLog.find(e => e.questionId === questionId);
  if (existing) {
    existing.wrongCount++;
    existing.lastSeen = Date.now();
    existing.nextReview = calcNextReview(existing.wrongCount);
    existing.correctStreak = 0; // reset correct streak
  } else {
    profile.wrongAnswerLog.push({
      questionId, contentType,
      wrongCount: 1, correctStreak: 0,
      lastSeen: Date.now(),
      nextReview: Date.now() + 60000, // review in 1 minute
    });
    // Cap review queue — keep most recent 200 entries, drop oldest
    if (profile.wrongAnswerLog.length > 200) {
      profile.wrongAnswerLog = profile.wrongAnswerLog.slice(-200);
    }
  }
  gameState.save();
}

// Record a correct answer on a previously-wrong question
export function recordCorrectReview(questionId) {
  const profile = gameState.profile;
  const entry = profile.wrongAnswerLog.find(e => e.questionId === questionId);
  if (entry) {
    entry.correctStreak = (entry.correctStreak || 0) + 1;
    entry.lastSeen = Date.now();
    if (entry.correctStreak >= 3) {
      // Mastered! Remove from review queue
      profile.wrongAnswerLog = profile.wrongAnswerLog.filter(e => e.questionId !== questionId);
      if (!profile.masteredQuestions.includes(questionId)) {
        profile.masteredQuestions.push(questionId);
        // Cap mastered list — keep most recent 500
        if (profile.masteredQuestions.length > 500) {
          profile.masteredQuestions = profile.masteredQuestions.slice(-500);
        }
      }
    } else {
      // Increase review interval (spaced repetition)
      entry.nextReview = calcNextReview(-entry.correctStreak); // negative = longer interval
    }
  }
  gameState.save();
}

// Get questions due for review
export function getDueReviews(contentType = null) {
  const profile = gameState.profile;
  const now = Date.now();
  return profile.wrongAnswerLog.filter(e => {
    if (contentType && e.contentType !== contentType) return false;
    return e.nextReview <= now;
  });
}

// Calculate next review time based on performance
function calcNextReview(wrongCount) {
  // More wrong = shorter interval (review sooner)
  // SM-2 inspired but simplified
  const intervals = [60000, 300000, 900000, 3600000, 86400000]; // 1min, 5min, 15min, 1hr, 1day
  const idx = Math.max(0, Math.min(intervals.length - 1, 3 - wrongCount));
  return Date.now() + intervals[idx];
}

// Get review stats for display
export function getReviewStats() {
  const profile = gameState.profile;
  const total = profile.wrongAnswerLog.length;
  const due = getDueReviews().length;
  const mastered = (profile.masteredQuestions || []).length;
  return { total, due, mastered };
}
