// js/state.js — Central game state, saved to localStorage

const SAVE_KEY = 'wenzi-xia-save';

const DEFAULT_PROFILE = {
  name: '',
  tier: 'grade7',
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
  chapterProgress: { 1: { questsCompleted: 0 } },
  chengyu: [],
  dailyStreak: 0,
  lastDailyDate: null,
  seenQuestions: { vocab: [], reading: [], classical: [] },
  accuracy: { vocab: [], reading: [], classical: [] },
  inventory: [],
  createdAt: null,
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
      this.profiles = data.profiles || [];
    }
  }

  save() {
    localStorage.setItem(SAVE_KEY, JSON.stringify({
      profiles: this.profiles,
    }));
  }

  get profile() {
    return this.profiles[this.activeProfileIndex] || null;
  }

  createProfile(name, tier) {
    const p = { ...DEFAULT_PROFILE, name, tier, createdAt: Date.now() };
    // Deep clone nested objects
    p.equipment = { ...DEFAULT_PROFILE.equipment };
    p.chapterProgress = { 1: { questsCompleted: 0 } };
    p.chengyu = [];
    p.seenQuestions = { vocab: [], reading: [], classical: [] };
    p.accuracy = { vocab: [], reading: [], classical: [] };
    p.inventory = [];
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
