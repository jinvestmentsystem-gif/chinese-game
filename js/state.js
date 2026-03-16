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
  attack: 0,
  defense: 0,
  speed: 0,
  equipment: { weapon: null, armor: null },
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
  },
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
    if (!('difficultyBase' in p)) p.difficultyBase = p.tier === 'grade7' ? 3 : 2;
    if (!('stats' in p) || !p.stats) {
      p.stats = { totalCorrect: 0, totalWrong: 0, totalQuests: 0, totalBossKills: 0, maxCombo: 0, totalXP: 0 };
    } else {
      // Ensure all stat keys exist
      const defaults = { totalCorrect: 0, totalWrong: 0, totalQuests: 0, totalBossKills: 0, maxCombo: 0, totalXP: 0 };
      for (const [k, v] of Object.entries(defaults)) {
        if (!(k in p.stats)) p.stats[k] = v;
      }
    }
    if (!p.seenQuestions)  p.seenQuestions = { vocab: [], reading: [], classical: [] };
    if (!p.accuracy)       p.accuracy = { vocab: [], reading: [], classical: [] };
    if (!p.inventory)      p.inventory = [];
    if (!p.chengyu)        p.chengyu = [];
    if (!p.equipment)      p.equipment = { weapon: null, armor: null };
    return p;
  }

  save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      profiles: this.profiles,
    }));
  }

  get profile() {
    return this.profiles[this.activeProfileIndex] || null;
  }

  createProfile(name, tier, difficultyBase = 3) {
    const p = { ...DEFAULT_PROFILE, name, tier, difficultyBase, createdAt: Date.now() };
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
