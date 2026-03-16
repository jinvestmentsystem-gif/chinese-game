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

/**
 * Calculate gold reward for a quest/combat result.
 * reward.js should call this and add the result to profile.gold.
 */
export function calculateGoldReward(results) {
  const baseGold = results.correct * 5;
  const comboBonus = results.maxCombo * 3;
  const accuracyBonus = results.total > 0 && (results.correct / results.total) > 0.8 ? 20 : 0;
  return baseGold + comboBonus + accuracyBonus;
}

export function addXP(amount) {
  const profile = gameState.profile;
  profile.xp += amount;

  // Gold = half of XP earned (rounded)
  profile.gold = (profile.gold || 0) + Math.round(amount * 0.5);

  let leveledUp = false;
  let newLevel = profile.level;
  let unlock = null;

  while (profile.xp >= xpForLevel(newLevel)) {
    profile.xp -= xpForLevel(newLevel);
    newLevel++;
    leveledUp = true;

    // NOTE: stat boosts on level-up are now handled by the levelup screen
    // (stat allocation by the player replaces automatic boosts)

    if (UNLOCKS[newLevel]) {
      unlock = UNLOCKS[newLevel].name;
    }
  }

  if (leveledUp) {
    profile.level = newLevel;
    // HP/wenli restore is deferred to after stat allocation in the levelup screen
  }

  gameState.save();

  // Return showLevelUpScreen flag so callers (reward.js) can navigate to the
  // levelup screen instead of auto-applying stats via a text banner.
  return leveledUp ? { newLevel, unlock, showLevelUpScreen: true } : null;
}

export function getXPProgress(profile) {
  const needed = xpForLevel(profile.level);
  return { current: profile.xp, needed, percent: Math.round((profile.xp / needed) * 100) };
}

export function hasAbility(profile, ability) {
  const abilityLevels = { hint: 2, skip: 5, double: 10 };
  return profile.level >= (abilityLevels[ability] || 999);
}
