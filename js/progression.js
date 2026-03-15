// js/progression.js — XP, leveling, and unlock management
import { gameState } from './state.js';

const UNLOCKS = {
  2: { type: 'ability', name: '提示 (Hint)' },
  3: { type: 'slot', name: '武器槽' },
  5: { type: 'ability', name: '跳过 (Skip)' },
  7: { type: 'slot', name: '防具槽' },
  10: { type: 'ability', name: '双倍 (Double)' },
};

export function xpForLevel(level) {
  return Math.round(100 * Math.pow(level, 1.5));
}

export function addXP(amount) {
  const profile = gameState.profile;
  profile.xp += amount;

  let leveledUp = false;
  let newLevel = profile.level;
  let unlock = null;

  while (profile.xp >= xpForLevel(newLevel)) {
    profile.xp -= xpForLevel(newLevel);
    newLevel++;
    leveledUp = true;

    // Level 15+ stat boosts every 5 levels
    if (newLevel >= 15 && newLevel % 5 === 0) {
      profile.maxHp += 10;
      profile.maxWenli += 1;
    }

    if (UNLOCKS[newLevel]) {
      unlock = UNLOCKS[newLevel].name;
    }
  }

  if (leveledUp) {
    profile.level = newLevel;
    profile.hp = profile.maxHp; // Full heal on level up
    profile.wenli = profile.maxWenli;
  }

  gameState.save();

  return leveledUp ? { newLevel, unlock } : null;
}

export function getXPProgress(profile) {
  const needed = xpForLevel(profile.level);
  return { current: profile.xp, needed, percent: Math.round((profile.xp / needed) * 100) };
}

export function hasAbility(profile, ability) {
  const abilityLevels = { hint: 2, skip: 5, double: 10 };
  return profile.level >= (abilityLevels[ability] || 999);
}
