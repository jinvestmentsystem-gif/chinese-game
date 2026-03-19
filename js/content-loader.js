// js/content-loader.js — Loads and queries content from JSON files

const cache = {};

async function loadJSON(path) {
  if (cache[path]) return cache[path];
  try {
    const res = await fetch(path);
    if (!res.ok) return [];
    const data = await res.json();
    cache[path] = data;
    return data;
  } catch (e) {
    console.warn(`[content-loader] Failed to load ${path}:`, e);
    return [];
  }
}

export async function loadContent(tier) {
  const base = `content/${tier}`;
  const [vocab, reading, classical] = await Promise.all([
    loadJSON(`${base}/vocab.json`),
    loadJSON(`${base}/reading.json`),
    loadJSON(`${base}/classical.json`),
  ]);

  // Try loading extra content files (optional — won't fail if missing)
  const [vocabExtra, classicalExtra, readingExtra] = await Promise.all([
    loadJSON(`${base}/vocab_extra.json`).catch(() => []),
    loadJSON(`${base}/classical_extra.json`).catch(() => []),
    loadJSON(`${base}/reading_extra.json`).catch(() => []),
  ]);

  return {
    vocab: [...vocab, ...vocabExtra],
    reading: [...reading, ...readingExtra],
    classical: [...classical, ...classicalExtra],
  };
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
  const sessionSet = new Set(sessionUsed);
  let available = pool.filter(q => !sessionSet.has(q.id));

  // 2. If hard filter leaves too few, relax to full pool
  if (available.length < count) available = pool;

  // 3. Build fast lookup of ALL seen question IDs
  const seenSet = new Set(seenIds);
  // Very recent = last 50% of seen IDs — aggressive penalty to prevent replay repetition
  const recentWindow = Math.max(30, Math.floor(seenIds.length * 0.5));
  const veryRecentSet = new Set(seenIds.slice(-recentWindow));

  // 4. Grade-level difficulty bias
  const gradeWeights = buildGradeWeights(gradeBias, difficultyTarget);

  // 5. Score each candidate — balanced so novelty can overcome difficulty preference
  const scored = available.map(q => {
    let score = 0;

    // ── Difficulty scoring (max 30, not 50 — leaves room for novelty) ──
    if (gradeWeights) {
      const diff = q.difficulty || 1;
      const clampedDiff = Math.max(1, Math.min(5, diff));
      // Scale grade weights to max 30 instead of 50
      score += (gradeWeights[clampedDiff] || 0) * 0.6;
    } else {
      const diffDist = Math.abs((q.difficulty || 3) - difficultyTarget);
      score += (5 - diffDist) * 6; // max 30
    }

    // ── Novelty scoring — aggressively prevents repetition ──
    if (veryRecentSet.has(q.id)) {
      score -= 100; // very recently seen — essentially blocked
    } else if (seenSet.has(q.id)) {
      score -= 50; // seen before — strong penalty
    } else {
      score += 40; // never seen — strong bonus
    }

    // ── Random factor (large enough to break ties and create variety) ──
    score += Math.random() * 25;

    return { question: q, score };
  });

  // 6. Weighted random sampling instead of deterministic top-N
  //    This gives lower-scored questions a chance while still favoring higher scores
  const selected = _weightedSample(scored, count);

  // 7. Shuffle selected order
  for (let i = selected.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [selected[i], selected[j]] = [selected[j], selected[i]];
  }

  // 8. Shuffle OPTIONS within each question so correct answer position varies
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
 * Weighted random sampling without replacement.
 * Converts scores to positive weights, then picks `count` items
 * with probability proportional to weight.
 */
function _weightedSample(scored, count) {
  if (scored.length <= count) return scored.map(s => s.question);

  // Shift all scores to positive (min score → weight 1)
  const minScore = Math.min(...scored.map(s => s.score));
  const items = scored.map(s => ({
    question: s.question,
    weight: Math.max(1, s.score - minScore + 1),
  }));

  const selected = [];
  for (let i = 0; i < count && items.length > 0; i++) {
    const totalWeight = items.reduce((sum, it) => sum + it.weight, 0);
    let roll = Math.random() * totalWeight;
    let pickedIdx = 0;
    for (let j = 0; j < items.length; j++) {
      roll -= items[j].weight;
      if (roll <= 0) { pickedIdx = j; break; }
    }
    selected.push(items[pickedIdx].question);
    items.splice(pickedIdx, 1); // remove picked item
  }
  return selected;
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

export function pickReadingPassage(passages, seenIds = [], difficultyTarget = 3, sessionUsed = []) {
  if (!passages || passages.length === 0) return undefined;

  // Hard filter: exclude passages already used this session
  const sessionSet = new Set(sessionUsed);
  let available = passages.filter(p => !sessionSet.has(p.id));
  if (available.length === 0) available = passages; // fallback

  const seenSet = new Set(seenIds);
  const recentWindow = Math.max(5, Math.floor(seenIds.length * 0.5));
  const veryRecentSet = new Set(seenIds.slice(-recentWindow));

  const scored = available.map(p => {
    let score = 0;

    // Difficulty match (max 30)
    const diffDist = Math.abs((p.difficulty || 3) - difficultyTarget);
    score += (5 - diffDist) * 6;

    // Novelty — aggressively prevent repetition
    if (veryRecentSet.has(p.id)) {
      score -= 100;
    } else if (seenSet.has(p.id)) {
      score -= 50;
    } else {
      score += 40;
    }

    // Random factor
    score += Math.random() * 25;

    return { passage: p, score };
  });

  // Weighted random pick (single item)
  const minScore = Math.min(...scored.map(s => s.score));
  const weighted = scored.map(s => ({ passage: s.passage, weight: Math.max(1, s.score - minScore + 1) }));
  const totalWeight = weighted.reduce((sum, w) => sum + w.weight, 0);
  let roll = Math.random() * totalWeight;
  for (const w of weighted) {
    roll -= w.weight;
    if (roll <= 0) return w.passage;
  }
  return weighted[weighted.length - 1]?.passage ?? passages[0];
}
