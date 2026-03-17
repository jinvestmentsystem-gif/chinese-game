// js/content-loader.js — Loads and queries content from JSON files

const cache = {};

async function loadJSON(path) {
  if (cache[path]) return cache[path];
  const res = await fetch(path);
  const data = await res.json();
  cache[path] = data;
  return data;
}

export async function loadContent(tier) {
  const base = `content/${tier}`;
  const [vocab, reading, classical] = await Promise.all([
    loadJSON(`${base}/vocab.json`),
    loadJSON(`${base}/reading.json`),
    loadJSON(`${base}/classical.json`),
  ]);
  return { vocab, reading, classical };
}

export async function loadChengyu() {
  return loadJSON('content/chengyu.json');
}

/**
 * Pick questions from a pool with adaptive difficulty, recency tracking, and
 * optional grade-level bias.
 *
 * @param {Array}  pool             – full question pool
 * @param {number} count            – how many questions to pick
 * @param {Array}  seenIds          – IDs of previously-seen questions (for recency scoring)
 * @param {number} difficultyTarget – adaptive difficulty target (1-5)
 * @param {Array}  sessionUsed      – IDs already used this session (hard filter)
 * @param {string|null} gradeBias   – tier string ('grade1'-'grade5' weight toward easier questions,
 *                                    'grade7'/'grade8' use full adaptive range, null for standard)
 */
export function pickQuestions(pool, count, seenIds = [], difficultyTarget = 3, sessionUsed = [], gradeBias = null) {
  // 1. HARD FILTER — never return a question already used this session
  let available = pool.filter(q => !sessionUsed.includes(q.id));

  // 2. If hard filter leaves too few, relax to scoring only (last resort fallback)
  if (available.length < count) available = pool;

  // 3. Deprioritize recently-seen questions via scoring (last 40 tracked)
  const recentSeen = new Set(seenIds.slice(-40));

  // ── Grade-level difficulty bias ───────────────────────────────────────
  // Lower tiers (grade1-grade5): weight toward easier questions
  // Upper tiers (grade7-grade8) / null: standard adaptive scoring (full difficulty range)
  const gradeWeights = buildGradeWeights(gradeBias, difficultyTarget);

  // 4. Score each candidate
  const scored = available.map(q => {
    let score = 0;

    // Difficulty scoring with grade bias
    if (gradeWeights) {
      // Use grade-specific weight table
      const diff = q.difficulty || 1;
      const clampedDiff = Math.max(1, Math.min(5, diff));
      score += (gradeWeights[clampedDiff] || 0);
    } else {
      // Standard adaptive: closer to target = higher score, max 50
      const diffDist = Math.abs((q.difficulty || 3) - difficultyTarget);
      score += (5 - diffDist) * 10;
    }

    // Recency penalty (recently seen = lower score)
    if (recentSeen.has(q.id)) {
      const recencyIndex = seenIds.lastIndexOf(q.id);
      // howRecentlyNormalized: 0 = oldest in window, 1 = most recent
      const howRecentlyNormalized = recencyIndex / seenIds.length;
      score -= howRecentlyNormalized * 30; // up to -30 for very recent
    } else {
      score += 20; // bonus for never-seen
    }

    // Small random factor to prevent deterministic ordering
    score += Math.random() * 10;

    return { question: q, score };
  });

  // 5. Sort by score descending and take top N
  scored.sort((a, b) => b.score - a.score);
  const selected = scored.slice(0, count).map(s => s.question);

  // 6. Shuffle selected so they don't always appear in difficulty order
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  // 7. Shuffle OPTIONS within each question so the correct answer isn't always at the same position
  return selected.map(q => {
    if (!q.options || q.options.length < 2) return q;
    const correctText = q.options[q.correct];
    const shuffled = [...q.options];
    for (let i = shuffled.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
    }
    return { ...q, options: shuffled, correct: shuffled.indexOf(correctText) };
  });
}

/**
 * Build a difficulty-weight lookup for grade-level bias.
 * Returns an object mapping difficulty (1-5) to a score bonus,
 * or null if no special bias should be applied.
 */
function buildGradeWeights(gradeBias, difficultyTarget) {
  // Lower tiers: heavily weight easier questions
  if (gradeBias === 'grade1') {
    return { 1: 50, 2: 40, 3: 10, 4: 0, 5: 0 };
  }
  if (gradeBias === 'grade3') {
    return { 1: 50, 2: 45, 3: 15, 4: 5, 5: 0 };
  }
  if (gradeBias === 'grade4') {
    return { 1: 40, 2: 45, 3: 25, 4: 10, 5: 0 };
  }
  if (gradeBias === 'grade5') {
    return { 1: 25, 2: 40, 3: 35, 4: 15, 5: 5 };
  }

  // Upper tiers: full adaptive range — weight peaks at difficultyTarget
  if (gradeBias === 'grade7' || gradeBias === 'grade8') {
    const weights = {};
    for (let d = 1; d <= 5; d++) {
      const dist = Math.abs(d - difficultyTarget);
      weights[d] = (5 - dist) * 10; // same as standard adaptive
    }
    return weights;
  }

  // null / unrecognized: use standard adaptive scoring (return null to signal caller)
  return null;
}

export function pickReadingPassage(passages, seenIds = [], difficultyTarget = 3) {
  // Score passages the same way pickQuestions scores questions
  const recentSeen = new Set(seenIds.slice(-40));

  const scored = passages.map(p => {
    let score = 0;

    // Difficulty match
    const diffDist = Math.abs(p.difficulty - difficultyTarget);
    score += (5 - diffDist) * 10;

    // Recency penalty
    if (recentSeen.has(p.id)) {
      const recencyIndex = seenIds.lastIndexOf(p.id);
      const howRecentlyNormalized = recencyIndex / seenIds.length;
      score -= howRecentlyNormalized * 30;
    } else {
      score += 20;
    }

    // Small random factor
    score += Math.random() * 10;

    return { passage: p, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0]?.passage ?? passages[0];
}
