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

export function pickQuestions(pool, count, seenIds = [], difficultyTarget = 3, sessionUsed = []) {
  // 1. Exclude questions already used in THIS SESSION (prevents within-quest repeats)
  let available = pool.filter(q => !sessionUsed.includes(q.id));

  // 2. If session exclusion leaves too few, fall back to the full pool minus session
  //    (session dedup is hard; recency is soft)
  if (available.length < count) available = pool.filter(q => !sessionUsed.includes(q.id));
  // If still too few (tiny pool), allow session repeats as last resort
  if (available.length < count) available = pool;

  // 3. Deprioritize recently-seen questions via scoring (last 40 tracked)
  const recentSeen = new Set(seenIds.slice(-40));

  // 4. Score each candidate
  const scored = available.map(q => {
    let score = 0;

    // Difficulty match (closer to target = higher score, max 50)
    const diffDist = Math.abs(q.difficulty - difficultyTarget);
    score += (5 - diffDist) * 10;

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

  return selected;
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
