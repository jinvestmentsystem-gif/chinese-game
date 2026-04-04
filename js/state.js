// js/state.js — Central game state, saved to localStorage

const SAVE_KEY = 'wenzi-xia-save';

const DEFAULT_PROFILE = {
  name: '',
  tier: 'grade7',
  difficultyBase: 3,
  level: 1,
  xp: 0,
  hp: 100,
  maxHp: 100,
  wenli: 5,
  maxWenli: 5,
  attack: 5,
  defense: 5,
  speed: 0,
  statPoints: 0,
  equipment: { weapon: null, armor: null, accessory: null },
  gold: 0,
  consumables: {},
  chapterProgress: { 1: { questsCompleted: 0 } },
  chengyu: [],
  dailyStreak: 0,
  lastDailyDate: null,
  seenQuestions: { vocab: [], reading: [], classical: [] },
  accuracy: { vocab: [], reading: [], classical: [] },
  inventory: [],
  createdAt: null,
  achievements: [],
  stats: {
    totalCorrect: 0,
    totalWrong: 0,
    totalQuests: 0,
    totalBossKills: 0,
    maxCombo: 0,
    totalXP: 0,
    totalGoldEarned: 0,
    fastestAnswer: Infinity,
    perfectQuests: 0,
  },
  // Talent tree — each key maps to rank (0 = unlearned)
  talents: {},
  talentPoints: 0,
  // Titles earned + active title
  titles: ['新手文定乾坤'],
  activeTitle: '新手文定乾坤',
  // Daily login reward tracking
  dailyLogin: { lastDate: null, streak: 0, totalDays: 0 },
  // Elemental affinity (unlocked via chengyu sets)
  affinities: { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 },
  // Combo record per session
  currentCombo: 0,
  // Critical hit stats
  critChance: 5,
  critMultiplier: 1.5,
  // Tutorial onboarding — tracks which tooltip hints have been shown
  tutorialSeen: {},
  // Daily challenge best stats + history
  dailyBestScore: 0,
  dailyBestAccuracy: 0,
  dailyHistory: [],
  // Spaced repetition data: tracks wrong answers for review
  wrongAnswerLog: [],  // Array of { questionId, contentType, wrongCount, lastSeen, nextReview, correctStreak }
  masteredQuestions: [], // IDs of questions answered correctly 3+ times in a row
  // ── Engagement systems ──
  luckyWheel: { lastSpinDate: null, totalSpins: 0 },
  bestiary: {},  // { enemyKey: { defeated: number, firstSeen: timestamp } }
  weeklyBoss: { lastWeekId: null, defeated: false, bestTime: null },
  lastActiveTimestamp: null,
  comebackClaimed: null,
  comboRecords: { bestOverall: 0, bestPerChapter: {}, history: [] },
  companionFriendship: { level: 1, xp: 0, interactions: 0, lastInteractionDate: null },
  seasonalEvents: {},
  prestige: { level: 0, totalLevels: 0, bonuses: { xpMultiplier: 0, goldMultiplier: 0, startingGold: 0, statBonus: 0 } },
  // ── Engagement optimization ──
  questStars: {},          // { "1-0": 3, "1-1": 2 } — best star rating per quest
  openingStorySeen: false,  // guards post-Quest-1 cinematic
  _questStructureMigrated: true, // new profiles don't need quest structure migration
};

class GameState {
  constructor() {
    this.profiles = [];
    this.activeProfileIndex = -1;
    this.currentScreen = 'title';
    this.currentQuest = null;
    this.arenaState = null;
    this._load();
  }

  _load() {
    const raw = localStorage.getItem(SAVE_KEY);
    if (raw) {
      let data;
      try { data = JSON.parse(raw); } catch (e) {
        console.error('[State] Corrupted save data — resetting:', e);
        localStorage.removeItem(SAVE_KEY);
        return;
      }
      const profiles = (data.profiles || []);
      let changed = false;
      this.profiles = profiles.map(p => {
        const before = JSON.stringify(p);
        const fixed = this._backfill(p);
        if (JSON.stringify(fixed) !== before) changed = true;
        return fixed;
      });
      // Persist backfilled data immediately so localStorage stays consistent
      if (changed) this.save();

      // Restore active profile index (always, not just when quest exists)
      if (data.activeProfileIndex != null && data.activeProfileIndex >= 0 && data.activeProfileIndex < this.profiles.length) {
        this.activeProfileIndex = data.activeProfileIndex;
      }
      // Restore mid-quest progress if saved
      if (data.currentQuest) {
        this._savedQuestState = data.currentQuest;
      }
    }
  }

  // Backfill missing fields for profiles saved before new features were added
  _backfill(p) {
    if (!('gold' in p))           p.gold = 0;
    if (!('consumables' in p))    p.consumables = {};
    if (!('achievements' in p))   p.achievements = [];
    if (!('difficultyBase' in p)) p.difficultyBase = ['grade7', 'grade8'].includes(p.tier) ? 3 : 2;
    if (!('stats' in p) || !p.stats) {
      p.stats = { totalCorrect: 0, totalWrong: 0, totalQuests: 0, totalBossKills: 0, maxCombo: 0, totalXP: 0, totalGoldEarned: 0, fastestAnswer: Infinity, perfectQuests: 0 };
    } else {
      const defaults = { totalCorrect: 0, totalWrong: 0, totalQuests: 0, totalBossKills: 0, maxCombo: 0, totalXP: 0, totalGoldEarned: 0, fastestAnswer: Infinity, perfectQuests: 0 };
      for (const [k, v] of Object.entries(defaults)) {
        if (!(k in p.stats)) p.stats[k] = v;
      }
      // Fix Infinity → null from JSON round-trip
      if (p.stats.fastestAnswer === null) p.stats.fastestAnswer = Infinity;
    }
    if (!p.seenQuestions)   p.seenQuestions = { vocab: [], reading: [], classical: [] };
    if (!p.accuracy)        p.accuracy = { vocab: [], reading: [], classical: [] };
    if (!p.inventory)       p.inventory = [];
    if (!p.chengyu)         p.chengyu = [];
    if (!p.equipment)       p.equipment = { weapon: null, armor: null, accessory: null };
    if (!('weapon' in p.equipment))    p.equipment.weapon = null;
    if (!('armor' in p.equipment))     p.equipment.armor = null;
    if (!('accessory' in p.equipment)) p.equipment.accessory = null;
    // New fields backfill
    if (!p.talents)         p.talents = {};
    if (!('talentPoints' in p)) p.talentPoints = Math.max(0, Math.floor((p.level - 1) / 2) - Object.values(p.talents || {}).reduce((s, v) => s + v, 0));
    if (!p.titles)          p.titles = ['新手文定乾坤'];
    if (!p.activeTitle)     p.activeTitle = '新手文定乾坤';
    if (!p.dailyLogin)      p.dailyLogin = { lastDate: null, streak: 0, totalDays: 0 };
    if (!p.affinities)      p.affinities = { metal: 0, wood: 0, water: 0, fire: 0, earth: 0 };
    if (!('critChance' in p))     p.critChance = 5;
    if (!('critMultiplier' in p)) p.critMultiplier = 1.5;
    if (!('currentCombo' in p))   p.currentCombo = 0;
    if (!('statPoints' in p))     p.statPoints = 0;
    if (!('dailyStreak' in p))    p.dailyStreak = 0;
    if (!('lastDailyDate' in p))  p.lastDailyDate = null;
    if (!p.upgrades)              p.upgrades = {};
    if (!p.tutorialSeen)          p.tutorialSeen = {};
    // Daily challenge best stats + history
    if (!('dailyBestScore' in p))    p.dailyBestScore = 0;
    if (!('dailyBestAccuracy' in p)) p.dailyBestAccuracy = 0;
    if (!p.dailyHistory)             p.dailyHistory = [];
    if (!p.chaptersRewarded)         p.chaptersRewarded = [];
    // Spaced repetition backfill
    if (!p.wrongAnswerLog)           p.wrongAnswerLog = [];
    if (!p.masteredQuestions)         p.masteredQuestions = [];
    // Migrate old profiles with 0 attack/defense to new base values
    if (p.attack === 0 && p.level === 1 && !p.equipment.weapon) p.attack = 5;
    if (p.defense === 0 && p.level === 1 && !p.equipment.armor) p.defense = 5;
    // ── Engagement systems backfill ──
    if (!p.luckyWheel)           p.luckyWheel = { lastSpinDate: null, totalSpins: 0 };
    if (!p.bestiary)             p.bestiary = {};
    if (!p.weeklyBoss)           p.weeklyBoss = { lastWeekId: null, defeated: false, bestTime: null };
    if (!('lastActiveTimestamp' in p)) p.lastActiveTimestamp = null;
    if (!('comebackClaimed' in p))    p.comebackClaimed = null;
    if (!p.comboRecords)         p.comboRecords = { bestOverall: p.stats?.maxCombo || 0, bestPerChapter: {}, history: [] };
    if (!p.companionFriendship)  p.companionFriendship = { level: 1, xp: 0, interactions: 0, lastInteractionDate: null };
    if (!p.seasonalEvents)       p.seasonalEvents = {};
    if (!p.prestige)             p.prestige = { level: 0, totalLevels: 0, bonuses: { xpMultiplier: 0, goldMultiplier: 0, startingGold: 0, statBonus: 0 } };
    if (!p.questStars)           p.questStars = {};
    if (!('openingStorySeen' in p)) p.openingStorySeen = false;
    // Type coercion: ensure numeric fields are numbers (protects against corrupted saves)
    const numericFields = ['level', 'xp', 'hp', 'maxHp', 'wenli', 'maxWenli', 'attack', 'defense', 'speed', 'gold', 'statPoints', 'talentPoints', 'critChance', 'critMultiplier'];
    for (const f of numericFields) {
      if (f in p && typeof p[f] !== 'number') p[f] = Number(p[f]) || 0;
    }
    if (p.level < 1) p.level = 1;
    if (p.maxHp < 1) p.maxHp = 100;
    // Migration: old system had 4 quests/chapter, each ending with boss.
    // New system has 5 quests (4 regular + 1 boss finale).
    // Any player who completed 2+ quests under old system already defeated
    // the chapter boss multiple times — credit them as chapter complete.
    if (!p._questStructureMigrated) {
      p._questStructureMigrated = true;
      const cp = p.chapterProgress || {};
      for (const chId of Object.keys(cp)) {
        const completed = cp[chId].questsCompleted || 0;
        if (completed >= 2) {
          // Player beat boss 2+ times → auto-complete chapter under new structure
          cp[chId].questsCompleted = 5;
        }
      }
    }
    return p;
  }

  save() {
    try {
      const saveData = {
        profiles: this.profiles,
        activeProfileIndex: this.activeProfileIndex, // ALWAYS persist active profile
      };
      // Also persist mid-quest state so progress survives browser close
      if (this.currentQuest) {
        // Only save essential fields — avoid serializing encounter questions/passages (large + potential circular refs)
        const r = this.currentQuest.results;
        saveData.currentQuest = {
          chapterId: this.currentQuest.chapterId,
          questIndex: this.currentQuest.questIndex,
          currentEncounter: this.currentQuest.currentEncounter,
          results: r ? { correct: r.correct, total: r.total, combo: r.combo, maxCombo: r.maxCombo, xpEarned: r.xpEarned, itemsFound: r.itemsFound || [] } : null,
        };
      }
      localStorage.setItem(SAVE_KEY, JSON.stringify(saveData));
    } catch (e) {
      console.error('[Save] localStorage write failed:', e);
      // Quota exceeded — warn user
      if (typeof showToast !== 'undefined') {
        showToast('存储空间不足，数据可能未保存', { type: 'error', duration: 4000 });
      }
    }
    // Dispatch save event for UI indicator
    window.dispatchEvent(new CustomEvent('game-saved'));
  }

  get profile() {
    return this.profiles[this.activeProfileIndex] || null;
  }

  createProfile(name, tier, difficultyBase = 3, gender = 'male') {
    // Deep clone via JSON round-trip to avoid shared references between profiles
    const p = JSON.parse(JSON.stringify(DEFAULT_PROFILE));
    p.name = name;
    p.tier = tier;
    p.difficultyBase = difficultyBase;
    p.gender = gender;
    p.createdAt = Date.now();
    // JSON round-trip converts Infinity to null — restore it
    if (p.stats) p.stats.fastestAnswer = Infinity;
    this.profiles.push(p);
    this.activeProfileIndex = this.profiles.length - 1;
    this.save();
    return p;
  }

  deleteProfile(index) {
    this.profiles.splice(index, 1);
    if (this.activeProfileIndex >= this.profiles.length) {
      this.activeProfileIndex = this.profiles.length - 1;
    }
    // Clear mid-quest state to prevent rewards applying to wrong profile
    this.currentQuest = null;
    this.save();
  }

  selectProfile(index) {
    if (index < 0 || index >= this.profiles.length) return;
    this.activeProfileIndex = index;
    this.save(); // Persist immediately so progress survives browser close
  }
}

export const gameState = new GameState();
export { DEFAULT_PROFILE };
