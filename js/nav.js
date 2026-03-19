// js/nav.js — Progressive disclosure: determines visible features per player level/state

/**
 * Returns an object of feature keys with boolean visibility.
 * Used by chapter-map nav bar to show/hide buttons.
 * @param {object} profile
 * @returns {object} feature → boolean
 */
export function getVisibleFeatures(profile) {
  const level = profile.level || 1;

  return {
    chapters:   true,                                                      // always
    settings:   true,                                                      // always
    shop:       level >= 2 || (profile.gold || 0) > 0,
    inventory:  (profile.inventory || []).length > 0,
    daily:      level >= 3,
    arena:      level >= 5,
    talents:    level >= 4,
    luckyWheel: level >= 2,
    weeklyBoss: level >= 5,
    gauntlet:   (profile.chapterProgress?.[3]?.questsCompleted || 0) >= 4,
    bestiary:   (profile.stats?.totalBossKills || 0) > 0,
    chengyu:    (profile.chengyu || []).length > 0,
    prestige:   Object.keys(profile.chapterProgress || {}).length >= 5,
    companion:  level >= 3,
    story:      true,                                                      // always (replay)
  };
}

/**
 * Returns notification dot indicators for nav buttons.
 * @param {object} profile
 * @returns {object} feature → 'red'|'yellow'|null
 */
export function getNotificationDots(profile) {
  const dots = {};

  // Unspent talent points
  if ((profile.talentPoints || 0) > 0 && profile.level >= 4) dots.talents = 'red';

  // Unspent stat points
  if ((profile.statPoints || 0) > 0) dots.levelup = 'red';

  // Shop: can afford something new (16 total shop items)
  if ((profile.gold || 0) >= 50 && (profile.inventory || []).length < 16) dots.shop = 'red';

  // Inventory: unviewed equipment drop
  if (profile._newEquipDrop) dots.inventory = 'red';

  // Daily not done today
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (profile.dailyLogin?.lastDate !== todayStr) dots.daily = 'yellow';

  return dots;
}

/**
 * Returns the next feature unlock preview (1 level away).
 * @param {object} profile
 * @returns {{ level: number, name: string, icon: string }|null}
 */
export function getNextUnlock(profile) {
  const level = profile.level || 1;
  const UNLOCKS = {
    2:  { name: '提示技能', icon: '💡' },
    3:  { name: '武器槽',   icon: '⚔️' },
    4:  { name: '天赋树',   icon: '🌳' },
    5:  { name: '竞技场',   icon: '🏟️' },
    7:  { name: '防具槽',   icon: '🛡️' },
    10: { name: '双倍技能', icon: '✨' },
    12: { name: '饰品槽',   icon: '💎' },
  };
  const nextLvl = level + 1;
  if (UNLOCKS[nextLvl]) {
    return { level: nextLvl, ...UNLOCKS[nextLvl] };
  }
  return null;
}
