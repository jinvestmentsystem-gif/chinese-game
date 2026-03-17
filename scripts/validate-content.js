#!/usr/bin/env node
// scripts/validate-content.js — Validates all JSON content files for the game.
// Checks: valid JSON, unique IDs, required fields, valid correct indices, no duplicate prompts.

const fs = require('fs');
const path = require('path');

const ROOT = path.resolve(__dirname, '..');
let errors = 0;
let warnings = 0;

function error(file, msg) {
  console.error(`  ERROR [${path.relative(ROOT, file)}]: ${msg}`);
  errors++;
}

function warn(file, msg) {
  console.warn(`  WARN  [${path.relative(ROOT, file)}]: ${msg}`);
  warnings++;
}

function ok(msg) {
  console.log(`  OK    ${msg}`);
}

// ── 1. Validate chengyu.json ────────────────────────────────────────────────
function validateChengyu() {
  const file = path.join(ROOT, 'content', 'chengyu.json');
  console.log('\n=== Validating chengyu.json ===');

  let data;
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    data = JSON.parse(raw);
  } catch (e) {
    error(file, `Invalid JSON: ${e.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    error(file, 'Root element must be an array');
    return;
  }

  ok(`Parsed successfully — ${data.length} entries`);

  if (data.length < 55) {
    warn(file, `Only ${data.length} entries (target: 55+)`);
  } else {
    ok(`Entry count >= 55`);
  }

  // Check unique IDs
  const ids = new Set();
  const chengyuTexts = new Set();
  const requiredFields = ['id', 'chengyu', 'pinyin', 'meaning', 'origin', 'example', 'era', 'chapter'];

  const chapterCounts = {};

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const label = entry.id || `index ${i}`;

    // Required fields
    for (const field of requiredFields) {
      if (!(field in entry) || entry[field] === null || entry[field] === undefined || entry[field] === '') {
        error(file, `Entry ${label}: missing or empty required field "${field}"`);
      }
    }

    // Unique ID
    if (ids.has(entry.id)) {
      error(file, `Duplicate ID: ${entry.id}`);
    }
    ids.add(entry.id);

    // Unique chengyu text
    if (chengyuTexts.has(entry.chengyu)) {
      error(file, `Duplicate chengyu text: "${entry.chengyu}" (${label})`);
    }
    chengyuTexts.add(entry.chengyu);

    // Chapter must be 1-5
    if (entry.chapter && (entry.chapter < 1 || entry.chapter > 5)) {
      error(file, `Entry ${label}: chapter ${entry.chapter} out of range 1-5`);
    }

    // Count per chapter
    if (entry.chapter) {
      chapterCounts[entry.chapter] = (chapterCounts[entry.chapter] || 0) + 1;
    }
  }

  // Report chapter distribution
  console.log('  Chapter distribution:');
  for (let ch = 1; ch <= 5; ch++) {
    const count = chapterCounts[ch] || 0;
    console.log(`    Chapter ${ch}: ${count} entries`);
    if (count < 5) {
      warn(file, `Chapter ${ch} has only ${count} entries (recommend >= 5)`);
    }
  }
}

// ── 2. Validate vocab/classical/reading JSON files ──────────────────────────
function validateQuestionFile(file) {
  const relPath = path.relative(ROOT, file);
  console.log(`\n=== Validating ${relPath} ===`);

  let data;
  try {
    const raw = fs.readFileSync(file, 'utf-8');
    data = JSON.parse(raw);
  } catch (e) {
    error(file, `Invalid JSON: ${e.message}`);
    return;
  }

  if (!Array.isArray(data)) {
    error(file, 'Root element must be an array');
    return;
  }

  ok(`Parsed successfully — ${data.length} entries`);

  const ids = new Set();
  const prompts = new Set();
  const isReading = file.includes('reading');

  for (let i = 0; i < data.length; i++) {
    const entry = data[i];
    const label = entry.id || `index ${i}`;

    // Unique ID
    if (!entry.id) {
      error(file, `Entry at index ${i}: missing id`);
    } else if (ids.has(entry.id)) {
      error(file, `Duplicate ID: ${entry.id}`);
    }
    ids.add(entry.id);

    if (isReading) {
      // Reading passages have different structure
      if (!entry.passage && !entry.text) {
        warn(file, `Entry ${label}: missing passage/text field`);
      }
      if (entry.questions && Array.isArray(entry.questions)) {
        for (let qi = 0; qi < entry.questions.length; qi++) {
          const q = entry.questions[qi];
          validateQuestionOptions(file, `${label}.questions[${qi}]`, q);
        }
      }
    } else {
      // Vocab / classical questions
      if (!entry.prompt) {
        error(file, `Entry ${label}: missing prompt`);
      } else {
        if (prompts.has(entry.prompt)) {
          warn(file, `Duplicate prompt in ${label}: "${entry.prompt.substring(0, 40)}..."`);
        }
        prompts.add(entry.prompt);
      }

      validateQuestionOptions(file, label, entry);

      // Difficulty should be 1-5
      if ('difficulty' in entry) {
        if (entry.difficulty < 1 || entry.difficulty > 5) {
          error(file, `Entry ${label}: difficulty ${entry.difficulty} out of range 1-5`);
        }
      }
    }
  }
}

function validateQuestionOptions(file, label, q) {
  if (!q.options || !Array.isArray(q.options)) {
    error(file, `Entry ${label}: missing or invalid options array`);
    return;
  }

  if (q.options.length < 2) {
    error(file, `Entry ${label}: options array has fewer than 2 items`);
  }

  if (!('correct' in q) || q.correct === null || q.correct === undefined) {
    error(file, `Entry ${label}: missing correct index`);
  } else if (typeof q.correct !== 'number') {
    error(file, `Entry ${label}: correct index must be a number, got ${typeof q.correct}`);
  } else if (q.correct < 0 || q.correct >= q.options.length) {
    error(file, `Entry ${label}: correct index ${q.correct} out of range [0, ${q.options.length - 1}]`);
  }
}

// ── Run all validations ─────────────────────────────────────────────────────
console.log('Content Validation Report');
console.log('='.repeat(60));

validateChengyu();

// Find all tier-based JSON files
const tiers = ['grade1', 'grade3', 'grade4', 'grade5', 'grade7', 'grade8'];
const types = ['vocab.json', 'reading.json', 'classical.json'];

for (const tier of tiers) {
  for (const type of types) {
    const file = path.join(ROOT, 'content', tier, type);
    if (fs.existsSync(file)) {
      validateQuestionFile(file);
    } else {
      console.log(`\n=== Skipping ${tier}/${type} (not found) ===`);
    }
  }
}

// ── Summary ─────────────────────────────────────────────────────────────────
console.log('\n' + '='.repeat(60));
console.log(`Validation complete: ${errors} error(s), ${warnings} warning(s)`);

if (errors > 0) {
  console.log('FAILED — fix errors above');
  process.exit(1);
} else {
  console.log('PASSED');
  process.exit(0);
}
