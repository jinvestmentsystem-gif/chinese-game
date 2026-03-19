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
  enchantments: {},  // { itemId: { stat, value, label } }
  companionFriendship: { level: 1, xp: 0, interactions: 0, lastInteractionDate: null },
  seasonalEvents: {},
  prestige: { level: 0, totalLevels: 0, bonuses: { xpMultiplier: 0, goldMultiplier: 0, startingGold: 0, statBonus: 0 } },
  // ── Engagement optimization ──
  questStars: {},          // { "1-0": 3, "1-1": 2 } — best star rating per quest
  openingStorySeen: false,  // guards post-Quest-1 cinematic
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
      const data = JSON.parse(raw);
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
    }
    if (!p.seenQuestions)   p.seenQuestions = { vocab: [], reading: [], classical: [] };
    if (!p.accuracy)        p.accuracy = { vocab: [], reading: [], classical: [] };
    if (!p.inventory)       p.inventory = [];
    if (!p.chengyu)         p.chengyu = [];
    if (!p.equipment)       p.equipment = { weapon: null, armor: null, accessory: null };
    if (!p.equipment.accessory && p.equipment.accessory !== null) p.equipment.accessory = null;
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
    if (!p.enchantments)         p.enchantments = {};
    if (!p.companionFriendship)  p.companionFriendship = { level: 1, xp: 0, interactions: 0, lastInteractionDate: null };
    if (!p.seasonalEvents)       p.seasonalEvents = {};
    if (!p.prestige)             p.prestige = { level: 0, totalLevels: 0, bonuses: { xpMultiplier: 0, goldMultiplier: 0, startingGold: 0, statBonus: 0 } };
    if (!p.questStars)           p.questStars = {};
    if (!('openingStorySeen' in p)) p.openingStorySeen = false;
    return p;
  }

  save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      profiles: this.profiles,
    }));
    // Dispatch save event for UI indicator
    window.dispatchEvent(new CustomEvent('game-saved'));
  }

  get profile() {
    return this.profiles[this.activeProfileIndex] || null;
  }

  createProfile(name, tier, difficultyBase = 3, gender = 'male') {
    const p = { ...DEFAULT_PROFILE, name, tier, difficultyBase, gender, createdAt: Date.now() };
    // Deep clone nested objects
    p.equipment = { ...DEFAULT_PROFILE.equipment };
    p.gold = 0;
    p.consumables = {};
    p.chapterProgress = { 1: { questsCompleted: 0 } };
    p.chengyu = [];
    p.seenQuestions = { vocab: [], reading: [], classical: [] };
    p.accuracy = { vocab: [], reading: [], classical: [] };
    p.inventory = [];
    p.achievements = [];
    p.stats = { ...DEFAULT_PROFILE.stats };
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
    this.save();
  }

  selectProfile(index) {
    this.activeProfileIndex = index;
  }
}

export const gameState = new GameState();
export { DEFAULT_PROFILE };
