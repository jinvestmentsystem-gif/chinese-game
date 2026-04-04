// js/progression.js — XP, leveling, talent tree, stat formulas, and engagement hooks
import { gameState } from './state.js';
import { showToast } from './toast.js';

// ═══════════════════════════════════════════════════════════════════════════════
// TALENT TREE — meaningful choices that dramatically alter gameplay
// ═══════════════════════════════════════════════════════════════════════════════

export const TALENT_TREE = {
  // ── Combat Branch (攻击) ─────────────────────────────────────────────────
  sharpMind:     { name: '锐思',       desc: '答对时+15%伤害',          branch: 'combat', maxRank: 3, perRank: { attackPct: 15 },  icon: '⚔️', requires: null },
  comboMaster:   { name: '连击大师',   desc: '每层连击额外+8%伤害',     branch: 'combat', maxRank: 3, perRank: { comboDmgPct: 8 }, icon: '🔥', requires: { sharpMind: 1 } },
  criticalEye:   { name: '慧眼识珠',   desc: '暴击率+6%',              branch: 'combat', maxRank: 3, perRank: { critChance: 6 },  icon: '👁️', requires: { sharpMind: 2 } },
  executioner:   { name: '斩杀',       desc: '敌人HP<30%时伤害+40%',    branch: 'combat', maxRank: 1, perRank: { executePct: 40 }, icon: '💀', requires: { comboMaster: 2, criticalEye: 1 } },

  // ── Defense Branch (防御) ────────────────────────────────────────────────
  ironWill:      { name: '铁壁之心',   desc: '受到伤害-12%',            branch: 'defense', maxRank: 3, perRank: { defensePct: 12 }, icon: '🛡️', requires: null },
  lifeForce:     { name: '生命力',     desc: '最大HP+15',               branch: 'defense', maxRank: 3, perRank: { bonusHp: 15 },   icon: '❤️', requires: { ironWill: 1 } },
  secondWind:    { name: '绝处逢生',   desc: 'HP<20%时防御翻倍',        branch: 'defense', maxRank: 1, perRank: { lastStand: 1 },  icon: '🌟', requires: { ironWill: 2, lifeForce: 2 } },
  thorns:        { name: '荆棘反刺',   desc: '受伤时反弹10%伤害/级',   branch: 'defense', maxRank: 2, perRank: { thornsPct: 10 },  icon: '🌿', requires: { ironWill: 1 } },

  // ── Speed Branch (速度) ──────────────────────────────────────────────────
  quickThinking: { name: '快思敏捷',   desc: '+2秒答题时间',            branch: 'speed', maxRank: 3, perRank: { timerBonus: 2 },   icon: '⚡', requires: null },
  timeFreeze:    { name: '时间冻结',   desc: '首题暂停3秒（不消耗时间）', branch: 'speed', maxRank: 1, perRank: { freezeFirst: 3 }, icon: '❄️', requires: { quickThinking: 2 } },
  speedDemon:    { name: '速答奖励',   desc: '5秒内答对额外+30%伤害',   branch: 'speed', maxRank: 2, perRank: { speedBonusPct: 15 }, icon: '💨', requires: { quickThinking: 1 } },

  // ── Wisdom Branch (智慧/文力) ────────────────────────────────────────────
  inkReserve:    { name: '墨池深蕴',   desc: '最大文力+1',              branch: 'wisdom', maxRank: 3, perRank: { bonusWenli: 1 },  icon: '📜', requires: null },
  inkRegen:      { name: '墨气回流',   desc: '每场战斗恢复1文力',       branch: 'wisdom', maxRank: 2, perRank: { wenliRegen: 1 },   icon: '🔮', requires: { inkReserve: 1 } },
  doubleStrike:  { name: '双笔连书',   desc: '10%几率答对算两次攻击',   branch: 'wisdom', maxRank: 1, perRank: { doubleStrike: 10 }, icon: '✨', requires: { inkReserve: 2, inkRegen: 1 } },

  // ── Fortune Branch (财运) ────────────────────────────────────────────────
  goldFinder:    { name: '点石成金',   desc: '+20%金币获取',            branch: 'fortune', maxRank: 2, perRank: { goldPct: 20 },    icon: '💰', requires: null },
  xpBoost:       { name: '悟道之心',   desc: '+15%经验获取',            branch: 'fortune', maxRank: 2, perRank: { xpPct: 15 },      icon: '📚', requires: null },
  treasureHunt:  { name: '寻宝大师',   desc: '装备掉落率+15%',          branch: 'fortune', maxRank: 2, perRank: { dropPct: 15 },    icon: '🎁', requires: { goldFinder: 1 } },
};

// ═══════════════════════════════════════════════════════════════════════════════
// TITLE SYSTEM — earned through achievements
// ═══════════════════════════════════════════════════════════════════════════════

export const TITLES = {
  '新手文定乾坤':   { requirement: null, desc: '初始称号' },
  '学有所成':     { requirement: { totalCorrect: 50 }, desc: '答对50题' },
  '文字达人':     { requirement: { totalCorrect: 200 }, desc: '答对200题' },
  '连击高手':     { requirement: { maxCombo: 10 }, desc: '达成10连击' },
  '连击传奇':     { requirement: { maxCombo: 20 }, desc: '达成20连击' },
  'BOSS猎手':     { requirement: { totalBossKills: 5 }, desc: '击败5个BOSS' },
  '百战不殆':     { requirement: { totalQuests: 20 }, desc: '完成20个任务' },
  '先秦守护者':   { requirement: { chapter1: true }, desc: '通关第一章' },
  '汉代卫士':     { requirement: { chapter2: true }, desc: '通关第二章' },
  '唐代诗人':     { requirement: { chapter3: true }, desc: '通关第三章' },
  '宋代词人':     { requirement: { chapter4: true }, desc: '通关第四章' },
  '文字之王':     { requirement: { chapter5: true }, desc: '通关全部章节' },
  '成语大师':     { requirement: { chengyu: 10 }, desc: '收集10个成语' },
  '富甲一方':     { requirement: { totalGoldEarned: 5000 }, desc: '累计获得5000金币' },
  '毅力非凡':     { requirement: { dailyStreak: 7 }, desc: '连续登录7天' },
};

// ═══════════════════════════════════════════════════════════════════════════════
// STAT FORMULAS — These must be DRAMATIC and VISIBLE
// ═══════════════════════════════════════════════════════════════════════════════

/** Calculate effective attack damage for a correct answer */
export function calcDamage(profile, combo = 0, isCrit = false, timeLeft = 0) {
  const stats = getEffectiveStats(profile);
  const base = 8 + stats.attack * 0.8;  // 5 attack = 12 base, 25 attack = 28 base
  const t = getTalentEffects(profile);

  let multiplier = 1;

  // Talent: Sharp Mind (+15% per rank)
  multiplier += (t.attackPct || 0) / 100;

  // Combo damage scaling: each combo adds talent + companion + 5% (base)
  const compComboPct = (profile.companionFriendship?.xp || 0) >= 400 ? 5 : 0; // Lv7 companion buff
  const comboBonus = combo * (0.05 + (t.comboDmgPct || 0) / 100 + compComboPct / 100);
  multiplier += comboBonus;

  // Speed bonus: answer within 5 seconds = +30% per rank
  if (timeLeft > 0) {
    const answerTime = getTimerDuration(profile) - timeLeft;
    if (answerTime <= 5) {
      multiplier += (t.speedBonusPct || 0) / 100;
    }
  }

  // Executioner: enemy HP < 30%
  // (caller passes this context — handled externally)

  // Set bonus: tier 4 = +15% all damage
  const sets = getActiveSetEffects(profile);
  if (sets.dmgPct) multiplier += sets.dmgPct / 100;

  // Critical hit (includes set tier 5 crit multiplier bonus)
  const baseCritMult = (profile.critMultiplier || 1.5) + (sets.critMultiplier || 0);
  const critMult = isCrit ? (baseCritMult + (combo > 5 ? 0.3 : 0)) : 1;

  let dmg = Math.round(base * multiplier * critMult);

  // Double strike talent: 10% chance per rank to double
  if (t.doubleStrike && Math.random() * 100 < t.doubleStrike) {
    dmg *= 2;
  }

  return Math.max(1, dmg);
}

/** Calculate damage taken from a wrong answer */
export function calcDamageTaken(profile, baseDmg = 20) {
  const t = getTalentEffects(profile);
  const stats = getEffectiveStats(profile);
  let reduction = 1 - (stats.defense * 0.03);  // 5 def = 15% reduction, 20 def = 60%

  // Talent: Iron Will (-12% per rank)
  reduction -= (t.defensePct || 0) / 100;

  // Talent: Last Stand (HP<20% = defense doubles)
  if (t.lastStand && profile.hp < profile.maxHp * 0.2) {
    reduction *= 0.5;
  }

  reduction = Math.max(0.1, reduction);  // Always take at least 10%

  const dmg = Math.round(baseDmg * reduction);

  // Thorns: return damage info for caller to apply
  const thornsReturn = t.thornsPct ? Math.round(dmg * t.thornsPct / 100) : 0;

  return { damage: Math.max(1, dmg), thornsReturn };
}

/** Calculate timer duration based on speed stat + talents */
export function getTimerDuration(profile, baseTimer = 15) {
  const t = getTalentEffects(profile);
  const stats = getEffectiveStats(profile);
  const speedBonus = stats.speed * 1.5;  // Each speed point = +1.5 seconds
  const talentBonus = t.timerBonus || 0;
  return Math.round((baseTimer + speedBonus + talentBonus) * 10) / 10;
}

/** Check if this answer is a critical hit */
export function rollCrit(profile) {
  const stats = getEffectiveStats(profile);
  return Math.random() * 100 < stats.critChance;
}

/** Get effective max HP including talents */
export function getEffectiveMaxHp(profile) {
  const t = getTalentEffects(profile);
  const chengyuBonuses = getChengyuBonuses(profile);
  let bonus = t.bonusHp || 0;
  for (const b of chengyuBonuses) {
    if (b.type === 'maxHp') bonus += b.value;
  }
  return (profile.maxHp || 100) + bonus;
}

/** Get effective max wenli including talents + chengyu */
export function getEffectiveMaxWenli(profile) {
  const t = getTalentEffects(profile);
  const chengyuBonuses = getChengyuBonuses(profile);
  let bonus = t.bonusWenli || 0;
  for (const b of chengyuBonuses) {
    if (b.type === 'maxWenli') bonus += b.value;
  }
  return (profile.maxWenli || 5) + bonus;
}

/** Aggregate all talent effects into a flat object */
export function getTalentEffects(profile) {
  const effects = {};
  const talents = profile.talents || {};
  for (const [key, rank] of Object.entries(talents)) {
    if (rank <= 0) continue;
    const talent = TALENT_TREE[key];
    if (!talent) continue;
    for (const [effect, valuePerRank] of Object.entries(talent.perRank)) {
      effects[effect] = (effects[effect] || 0) + valuePerRank * rank;
    }
  }
  return effects;
}

/** Check if a talent can be learned (prerequisites met) */
export function canLearnTalent(profile, talentKey) {
  const talent = TALENT_TREE[talentKey];
  if (!talent) return false;
  const currentRank = (profile.talents || {})[talentKey] || 0;
  if (currentRank >= talent.maxRank) return false;
  if (profile.talentPoints <= 0) return false;
  if (talent.requires) {
    for (const [req, minRank] of Object.entries(talent.requires)) {
      if (((profile.talents || {})[req] || 0) < minRank) return false;
    }
  }
  return true;
}

/** Learn a talent (increment rank) */
export function learnTalent(profile, talentKey) {
  if (!canLearnTalent(profile, talentKey)) return false;
  if (!profile.talents) profile.talents = {};
  profile.talents[talentKey] = (profile.talents[talentKey] || 0) + 1;
  profile.talentPoints--;
  gameState.save();
  return true;
}

// ═══════════════════════════════════════════════════════════════════════════════
// CHENGYU BONUS SYSTEM — collecting chengyu grants passive elemental bonuses
// ═══════════════════════════════════════════════════════════════════════════════

const CHENGYU_BONUSES = {
  // Every 3 chengyu collected grants a bonus
  3:  { type: 'critChance', value: 2, label: '暴击率+2%' },
  5:  { type: 'attack', value: 3, label: '攻击+3' },
  8:  { type: 'defense', value: 3, label: '防御+3' },
  10: { type: 'maxHp', value: 20, label: 'HP+20' },
  15: { type: 'gold_mult', value: 10, label: '金币+10%' },
  20: { type: 'maxWenli', value: 2, label: '文力+2' },
};

export function getChengyuBonuses(profile) {
  const count = (profile.chengyu || []).length;
  const active = [];
  for (const [threshold, bonus] of Object.entries(CHENGYU_BONUSES)) {
    if (count >= Number(threshold)) active.push(bonus);
  }
  return active;
}

// ═══════════════════════════════════════════════════════════════════════════════
// XP, LEVELING, UNLOCKS
// ═══════════════════════════════════════════════════════════════════════════════

const UNLOCKS = {
  2:  { type: 'ability', name: '提示 (Hint)' },
  3:  { type: 'slot', name: '武器槽' },
  4:  { type: 'talent', name: '天赋树解锁' },
  5:  { type: 'ability', name: '跳过 (Skip)' },
  7:  { type: 'slot', name: '防具槽' },
  8:  { type: 'talent', name: '新天赋点' },
  10: { type: 'ability', name: '双倍 (Double)' },
  12: { type: 'slot', name: '饰品槽' },
  15: { type: 'title', name: '称号「百战勇士」' },
};

export function xpForLevel(level) {
  if (level <= 3) return 80 + level * 30; // 110, 140, 170 — fast early levels
  if (level <= 7) return Math.round(120 * Math.pow(level, 1.3)); // moderate middle
  if (level <= 15) return Math.round(100 * Math.pow(level, 1.35)); // softened late game (was 1.5)
  // Post-15: linear growth instead of exponential — prevents infinite grind
  return Math.round(100 * Math.pow(15, 1.35) + (level - 15) * 350);
}

export function calculateGoldReward(results, isChapterBoss = false) {
  const baseGold = results.correct * 8;
  const comboBonus = results.maxCombo * 5;
  const accuracyBonus = results.total > 0 && (results.correct / results.total) > 0.8 ? 30 : 0;
  const perfectBonus = results.total > 0 && results.correct === results.total ? 50 : 0;
  const chapterBonus = isChapterBoss ? 100 : 0;
  return baseGold + comboBonus + accuracyBonus + perfectBonus + chapterBonus;
}

export function addXP(amount, goldOverride) {
  const profile = gameState.profile;
  const t = getTalentEffects(profile);

  // Apply XP boost: talent + prestige + set + companion
  const sets = getActiveSetEffects(profile);
  const comp = getCompanionBuffs(profile);
  const prestigeXP = profile.prestige?.bonuses?.xpMultiplier || 0;
  const xpMult = 1 + (t.xpPct || 0) / 100 + prestigeXP / 100 + (sets.xpPct || 0) / 100 + (comp.xpPct || 0) / 100;
  const boostedAmount = Math.round(amount * xpMult);

  profile.xp += boostedAmount;

  // Gold: use explicit amount if provided, otherwise default to 60% of XP
  const prestigeGold = profile.prestige?.bonuses?.goldMultiplier || 0;
  // Chengyu 15-collection bonus: gold_mult +10%
  const chengyuGoldPct = getChengyuBonuses(profile).find(b => b.type === 'gold_mult')?.value || 0;
  const goldMult = 1 + (t.goldPct || 0) / 100 + prestigeGold / 100 + (sets.goldPct || 0) / 100 + chengyuGoldPct / 100 + (comp.goldPct || 0) / 100;
  const goldEarned = goldOverride != null
    ? Math.round(goldOverride * goldMult)
    : Math.round(boostedAmount * 0.6 * goldMult);
  profile.gold = (profile.gold || 0) + goldEarned;
  profile.stats.totalGoldEarned = (profile.stats.totalGoldEarned || 0) + goldEarned;

  let leveledUp = false;
  let newLevel = profile.level;
  let unlock = null;
  let talentPointsGained = 0;

  while (profile.xp >= xpForLevel(newLevel) && newLevel < 200) {
    profile.xp -= xpForLevel(newLevel);
    newLevel++;
    leveledUp = true;

    // Stat points per level: 2 (early), 3 (mid), 4 (late)
    const statPointsEarned = newLevel <= 5 ? 2 : newLevel <= 10 ? 3 : 4;
    profile.statPoints = (profile.statPoints || 0) + statPointsEarned;

    // Grant talent point every 2 levels starting at level 4
    if (newLevel >= 4 && newLevel % 2 === 0) {
      profile.talentPoints = (profile.talentPoints || 0) + 1;
      talentPointsGained++;
      showToast('获得天赋点！', { type: 'talent', duration: 3500, sub: `共 ${profile.talentPoints} 点可用` });
    }

    if (UNLOCKS[newLevel]) {
      unlock = UNLOCKS[newLevel].name;
    }
  }

  if (leveledUp) {
    profile.level = newLevel;
  }

  // Check for new titles
  checkTitleUnlocks(profile);

  gameState.save();

  return leveledUp ? { newLevel, unlock, showLevelUpScreen: true, talentPointsGained, goldEarned, boostedAmount } : null;
}

/** Grant bonus talent point for completing all quests in a chapter */
export function grantChapterCompletionBonus(profile, chapterId) {
  const chapQuests = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 };
  const cp = profile.chapterProgress || {};
  const chapter = cp[chapterId];
  if (!chapter) return null;

  // Check if all quests in this chapter are completed
  if (chapter.questsCompleted >= chapQuests[chapterId]) {
    // Only grant once — track which chapters already gave the bonus
    if (!profile.chapterBonusClaimed) profile.chapterBonusClaimed = {};
    if (profile.chapterBonusClaimed[chapterId]) return null;

    profile.chapterBonusClaimed[chapterId] = true;
    profile.talentPoints = (profile.talentPoints || 0) + 1;
    gameState.save();
    return { talentPoint: 1, chapterId };
  }
  return null;
}

export function getXPProgress(profile) {
  const needed = xpForLevel(profile.level) || 100; // Fallback prevents division by zero
  const percent = profile.level >= 200 ? 100 : Math.min(100, Math.round((profile.xp / needed) * 100));
  return { current: profile.xp, needed, percent };
}

export function hasAbility(profile, ability) {
  const abilityLevels = { hint: 2, skip: 5, double: 10 };
  return profile.level >= (abilityLevels[ability] || 999);
}

// ═══════════════════════════════════════════════════════════════════════════════
// DAILY LOGIN REWARDS
// ═══════════════════════════════════════════════════════════════════════════════

const DAILY_REWARDS = [
  { gold: 30, label: '30 金币' },
  { gold: 50, label: '50 金币' },
  { gold: 50, xp: 30, label: '50 金币 + 30 经验' },
  { gold: 80, label: '80 金币' },
  { gold: 80, xp: 50, label: '80 金币 + 50 经验' },
  { gold: 100, label: '100 金币' },
  { gold: 150, xp: 100, item: 'hp-potion', label: '150 金币 + 100经验 + 回春丹' },
];

export function checkDailyLogin(profile) {
  // Use local date (not UTC) so the daily resets at local midnight
  const now = new Date();
  const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (!profile.dailyLogin) profile.dailyLogin = { lastDate: null, streak: 0, totalDays: 0 };

  if (profile.dailyLogin.lastDate === today) return null; // Already claimed

  const yd = new Date(now); yd.setDate(yd.getDate() - 1);
  const yesterday = `${yd.getFullYear()}-${String(yd.getMonth() + 1).padStart(2, '0')}-${String(yd.getDate()).padStart(2, '0')}`;
  if (profile.dailyLogin.lastDate === yesterday) {
    profile.dailyLogin.streak++;
  } else {
    profile.dailyLogin.streak = 1;
  }
  profile.dailyLogin.lastDate = today;
  profile.dailyLogin.totalDays++;

  const dayIndex = Math.min(profile.dailyLogin.streak - 1, DAILY_REWARDS.length - 1);
  const reward = DAILY_REWARDS[dayIndex];

  if (reward.gold) profile.gold = (profile.gold || 0) + reward.gold;
  if (reward.xp) profile.xp += reward.xp;
  if (reward.item) {
    if (!profile.consumables) profile.consumables = {};
    profile.consumables[reward.item] = (profile.consumables[reward.item] || 0) + 1;
  }

  gameState.save();
  return { ...reward, streak: profile.dailyLogin.streak };
}

// ═══════════════════════════════════════════════════════════════════════════════
// TITLE UNLOCK CHECK
// ═══════════════════════════════════════════════════════════════════════════════

function checkTitleUnlocks(profile) {
  if (!profile.titles) profile.titles = ['新手文定乾坤'];
  const stats = profile.stats || {};
  const cp = profile.chapterProgress || {};

  for (const [title, data] of Object.entries(TITLES)) {
    if (profile.titles.includes(title)) continue;
    if (!data.requirement) continue;
    const req = data.requirement;
    let earned = true;
    if (req.totalCorrect && (stats.totalCorrect || 0) < req.totalCorrect) earned = false;
    if (req.maxCombo && (stats.maxCombo || 0) < req.maxCombo) earned = false;
    if (req.totalBossKills && (stats.totalBossKills || 0) < req.totalBossKills) earned = false;
    if (req.totalQuests && (stats.totalQuests || 0) < req.totalQuests) earned = false;
    if (req.totalGoldEarned && (stats.totalGoldEarned || 0) < req.totalGoldEarned) earned = false;
    if (req.chengyu && (profile.chengyu || []).length < req.chengyu) earned = false;
    if (req.dailyStreak && (profile.dailyLogin?.streak || 0) < req.dailyStreak) earned = false;
    for (let ch = 1; ch <= 5; ch++) {
      if (req[`chapter${ch}`]) {
        const chapQuests = { 1: 5, 2: 5, 3: 5, 4: 5, 5: 5 };
        if ((cp[ch]?.questsCompleted || 0) < chapQuests[ch]) earned = false;
      }
    }
    if (earned) profile.titles.push(title);
  }
}

// ═══════════════════════════════════════════════════════════════════════════════
// ACHIEVEMENT REWARDS — achievements now give gold + items
// ═══════════════════════════════════════════════════════════════════════════════

export const ACHIEVEMENT_REWARDS = {
  first_quest:   { gold: 50, label: '初出茅庐' },
  first_boss:    { gold: 100, label: '初战告捷' },
  combo_3:       { gold: 30, label: '连击新手' },
  combo_5:       { gold: 80, label: '连击达人' },
  combo_10:      { gold: 200, label: '连击大师' },
  correct_50:    { gold: 150, label: '学有所成' },
  correct_100:   { gold: 300, label: '博学多才' },
  correct_200:   { gold: 500, label: '文字大师' },
  quest_5:       { gold: 100, label: '冒险家' },
  quest_10:      { gold: 250, label: '老练冒险家' },
  boss_3:        { gold: 200, label: 'BOSS猎人' },
  xp_500:        { gold: 100, label: '经验丰富' },
  xp_2000:       { gold: 300, label: '身经百战' },
};

export function claimAchievementReward(profile, achievementId) {
  const reward = ACHIEVEMENT_REWARDS[achievementId];
  if (!reward) return 0;
  if (reward.gold) {
    profile.gold = (profile.gold || 0) + reward.gold;
    return reward.gold;
  }
  return 0;
}

// ═══════════════════════════════════════════════════════════════════════════════
// ═══════════════════════════════════════════════════════════════════════════════
// SET BONUS — lightweight tier check (avoids circular dep with shop.js)
// ═══════════════════════════════════════════════════════════════════════════════

// COMPANION FRIENDSHIP BUFFS — XP thresholds mirror companion-profile.js
const COMPANION_BUFFS = [
  { xp: 50,  effect: { xpPct: 5 } },
  { xp: 100, effect: { goldPct: 5 } },
  { xp: 180, effect: { critChance: 3 } },
  { xp: 400, effect: { comboDmgPct: 5 } },
  { xp: 550, effect: { defense: 3 } },
  { xp: 720, effect: { allStats: 2 } },
];

export function getCompanionBuffs(profile) {
  const xp = profile.companionFriendship?.xp || 0;
  const effects = {};
  for (const b of COMPANION_BUFFS) {
    if (xp >= b.xp) {
      for (const [k, v] of Object.entries(b.effect)) {
        effects[k] = (effects[k] || 0) + v;
      }
    }
  }
  return effects;
}

// All equipment item IDs per tier (need 3+ owned for set bonus)
const SET_TIER_IDS = {
  1: ['brush-sword-1', 'scroll-shield-1', 'pendant-1', 'ring-1'],
  2: ['brush-sword-2', 'scroll-shield-2', 'pendant-2', 'ring-2'],
  3: ['brush-sword-3', 'scroll-shield-3', 'pendant-3', 'amulet-3'],
  4: ['brush-sword-4', 'scroll-shield-4', 'pendant-4', 'ring-4'],
  5: ['weapon-5', 'armor-5', 'pendant-5', 'ring-5'],
  6: ['weapon-6', 'armor-6', 'pendant-6'],
};
const SET_REQUIRED = 3; // pieces needed
const SET_EFFECTS = {
  1: { xpPct: 5 },
  2: { goldPct: 10 },
  3: { critChance: 5 },
  4: { dmgPct: 15 },
  5: { speed: 5, critMultiplier: 0.2 },
  6: { allStats: 5 },
};

export function getActiveSetEffects(profile) {
  const inv = profile.inventory || [];
  const effects = {};
  for (const [tier, ids] of Object.entries(SET_TIER_IDS)) {
    const owned = ids.filter(id => inv.includes(id)).length;
    if (owned >= SET_REQUIRED) {
      const fx = SET_EFFECTS[tier];
      for (const [k, v] of Object.entries(fx)) {
        effects[k] = (effects[k] || 0) + v;
      }
    }
  }
  return effects;
}

// EFFECTIVE STATS — Aggregate base + equipment + talents + chengyu + sets
// ═══════════════════════════════════════════════════════════════════════════════

export function getEffectiveStats(profile) {
  const t = getTalentEffects(profile);
  const chengyuBonuses = getChengyuBonuses(profile);

  let attack = profile.attack || 0;
  let defense = profile.defense || 0;
  let speed = profile.speed || 0;
  let maxHp = (profile.maxHp || 100) + (t.bonusHp || 0);
  let maxWenli = profile.maxWenli + (t.bonusWenli || 0);
  let critChance = (profile.critChance || 5) + (t.critChance || 0);

  for (const bonus of chengyuBonuses) {
    if (bonus.type === 'attack') attack += bonus.value;
    if (bonus.type === 'defense') defense += bonus.value;
    if (bonus.type === 'maxHp') maxHp += bonus.value;
    if (bonus.type === 'maxWenli') maxWenli += bonus.value;
    if (bonus.type === 'critChance') critChance += bonus.value;
  }

  // Set bonuses
  const sets = getActiveSetEffects(profile);
  if (sets.allStats) { attack += sets.allStats; defense += sets.allStats; speed += sets.allStats; }
  if (sets.critChance) critChance += sets.critChance;
  if (sets.speed) speed += sets.speed;

  // Companion friendship buffs
  const comp = getCompanionBuffs(profile);
  if (comp.critChance) critChance += comp.critChance;
  if (comp.defense) defense += comp.defense;
  if (comp.allStats) { attack += comp.allStats; defense += comp.allStats; speed += comp.allStats; }

  let critMultiplier = profile.critMultiplier || 1.5;
  if (sets.critMultiplier) critMultiplier += sets.critMultiplier;

  return { attack, defense, speed, maxHp, maxWenli, critChance, critMultiplier };
}
