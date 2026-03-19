// js/goals.js — Computes the most important next goal for the player
import { gameState } from './state.js';

const CHAPTER_QUESTS = { 1: 4, 2: 4, 3: 4, 4: 4, 5: 5 };

/**
 * Returns the highest-priority goal object for the given profile.
 * Only ONE goal is returned — the most actionable one.
 * @param {object} profile
 * @returns {{ type: string, text: string, screen: string, progress?: number }}
 */
export function getNextGoal(profile) {
  // Priority 1: unspent stat/talent points — immediate action needed
  if ((profile.statPoints || 0) > 0) {
    return { type: 'stat-points', text: '分配你的属性点！', icon: '⬆', screen: 'levelup' };
  }
  if ((profile.talentPoints || 0) > 0 && profile.level >= 4) {
    return { type: 'talent-points', text: '分配你的天赋点！', icon: '🌳', screen: 'levelup' };
  }

  // Priority 2: current quest in progress
  const quest = gameState.currentQuest;
  if (quest && quest.currentEncounter < quest.encounters.length) {
    const enc = quest.currentEncounter + 1;
    const total = quest.encounters.length;
    return {
      type: 'quest',
      text: `完成征途 ${quest.chapterId}-${quest.questIndex + 1}`,
      icon: '⚔',
      screen: 'worldmap',
      progress: enc / total,
    };
  }

  // Priority 3: daily challenge not done
  const now = new Date();
  const todayStr = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
  if (profile.dailyLogin?.lastDate !== todayStr) {
    return { type: 'daily', text: '今日挑战未完成', icon: '📅', screen: 'daily' };
  }

  // Priority 4: chapter completion close (only for unlocked chapters)
  for (const [chId, totalQuests] of Object.entries(CHAPTER_QUESTS)) {
    // Skip locked chapters — chapter N requires chapter N-1 fully complete
    const prevId = Number(chId) - 1;
    if (prevId > 0) {
      const prevCp = profile.chapterProgress?.[prevId];
      const prevTotal = CHAPTER_QUESTS[prevId] || 4;
      if (!prevCp || prevCp.questsCompleted < prevTotal) continue;
    }
    const cp = profile.chapterProgress?.[chId];
    if (cp && cp.questsCompleted > 0 && cp.questsCompleted < totalQuests) {
      return {
        type: 'chapter',
        text: `完成第${chId}章 (${cp.questsCompleted}/${totalQuests} 征途)`,
        icon: '🏔',
        screen: 'worldmap',
        progress: cp.questsCompleted / totalQuests,
      };
    }
  }

  // Priority 5: achievement milestone close
  const totalCorrect = profile.stats?.totalCorrect || 0;
  const milestones = [50, 200, 500, 1000];
  for (const m of milestones) {
    if (totalCorrect < m && m - totalCorrect <= 20) {
      return {
        type: 'achievement',
        text: `再答对${m - totalCorrect}题解锁成就`,
        icon: '🏆',
        screen: 'stats',
        progress: totalCorrect / m,
      };
    }
  }

  // Priority 6: equipment upgrade affordable (only if player has equipment, not just consumables)
  const gold = profile.gold || 0;
  const hasEquipment = (profile.inventory || []).some(id => typeof id === 'string' && !id.startsWith('hp-') && !id.startsWith('wenli-') && !id.startsWith('xp-'));
  if (gold >= 25 && hasEquipment) {
    return { type: 'upgrade', text: '可以升级你的装备了', icon: '🔨', screen: 'shop' };
  }

  // Fallback
  return { type: 'explore', text: '继续冒险吧！', icon: '🎯', screen: 'worldmap' };
}
