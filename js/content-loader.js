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

export function pickQuestions(pool, count, seenIds = [], difficultyTarget = 3) {
  // Filter out recently seen (last 20)
  const recentSeen = seenIds.slice(-20);
  let available = pool.filter(q => !recentSeen.includes(q.id));
  if (available.length < count) available = pool;

  // Sort by closeness to target difficulty, then shuffle within same distance
  available.sort((a, b) => {
    const da = Math.abs(a.difficulty - difficultyTarget);
    const db = Math.abs(b.difficulty - difficultyTarget);
    return da - db || Math.random() - 0.5;
  });

  return available.slice(0, count);
}

export function pickReadingPassage(passages, seenIds = [], difficultyTarget = 3) {
  const recentSeen = seenIds.slice(-10);
  let available = passages.filter(p => !recentSeen.includes(p.id));
  if (available.length === 0) available = passages;

  available.sort((a, b) => {
    const da = Math.abs(a.difficulty - difficultyTarget);
    const db = Math.abs(b.difficulty - difficultyTarget);
    return da - db || Math.random() - 0.5;
  });

  return available[0];
}
