// js/audio.js — Procedural music & SFX via Web Audio API (no external files)

let audioCtx = null;
let musicEnabled = true;
let sfxEnabled = true;
let currentMusicNodes = []; // oscillators / intervals currently playing
let musicLoopHandle = null;

// ─── Music state ──────────────────────────────────────────────────────────────
let currentEra = 'menu';
let currentIntensity = 0; // 0=ambient, 1=combat, 2=combo, 3=boss/critical
let masterMusicGain = null;   // GainNode — master volume for all music layers
let beatClock = null;         // setInterval handle for the beat tick
let beatStep = 0;             // 0–63 (4 bars × 16 steps)
let activeLayerNodes = {};    // keyed by layer name: 'bass', 'melody', 'counter', 'drone'
let layerGains = {};          // GainNode per layer so we can fade in/out

// ─── Chinese pentatonic scale: 宫商角徵羽 (C D E G A) + octave up ─────────────
// Frequencies in Hz for multiple octaves
const PENTATONIC = {
  menu:    [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33],
  xianqin: [130.81, 146.83, 164.81, 196.00, 220.00, 261.63, 293.66],  // low, ancient
  han:     [196.00, 220.00, 261.63, 293.66, 329.63, 392.00, 440.00],   // mid
  tang:    [261.63, 293.66, 329.63, 392.00, 440.00, 523.25, 587.33],   // bright
  song:    [220.00, 261.63, 293.66, 329.63, 392.00, 440.00, 523.25],   // gentle
  modern:  [261.63, 329.63, 392.00, 523.25, 659.26, 783.99, 1046.50], // high, clear
  boss:    [65.41,  73.42,  82.41,  98.00, 110.00, 130.81, 146.83],   // deep, ominous
};

const ERA_SETTINGS = {
  menu:    { interval: [2500, 3800], gain: 0.06, wave: 'triangle', delayTime: 0.5 },
  xianqin: { interval: [3000, 5000], gain: 0.05, wave: 'sine',     delayTime: 0.7 },
  han:     { interval: [2800, 4200], gain: 0.055, wave: 'triangle', delayTime: 0.6 },
  tang:    { interval: [2000, 3200], gain: 0.065, wave: 'triangle', delayTime: 0.4 },
  song:    { interval: [2200, 3500], gain: 0.06,  wave: 'sine',     delayTime: 0.55 },
  modern:  { interval: [1800, 3000], gain: 0.07,  wave: 'triangle', delayTime: 0.35 },
  boss:    { interval: [1500, 2500], gain: 0.08,  wave: 'sawtooth', delayTime: 0.3 },
};

// ─── Era-specific battle flavors ──────────────────────────────────────────────
const ERA_BATTLE = {
  //                bpm factor, kick freq, bass octave shift, melody density (0–1), snare Q
  xianqin: { bpmFactor: 0.80, kickHz: 50,  bassShift: -1, melodyDensity: 0.40, snareQ: 0.8 },
  han:     { bpmFactor: 1.00, kickHz: 60,  bassShift:  0, melodyDensity: 0.50, snareQ: 1.2 },
  tang:    { bpmFactor: 1.05, kickHz: 65,  bassShift:  0, melodyDensity: 0.70, snareQ: 1.8 },
  song:    { bpmFactor: 0.90, kickHz: 55,  bassShift:  0, melodyDensity: 0.55, snareQ: 1.0 },
  modern:  { bpmFactor: 1.15, kickHz: 70,  bassShift:  1, melodyDensity: 0.85, snareQ: 2.5 },
  boss:    { bpmFactor: 1.10, kickHz: 45,  bassShift: -1, melodyDensity: 1.00, snareQ: 0.7 },
  menu:    { bpmFactor: 0.85, kickHz: 60,  bassShift:  0, melodyDensity: 0.45, snareQ: 1.0 },
};

// ─── Drum patterns (16 steps per bar) ─────────────────────────────────────────
const DRUMS = {
  // Driving battle kick: four-on-floor feel + offbeat punch
  kick:        [1,0,0,0, 1,0,0,0, 1,0,0,1, 0,0,1,0],
  // Boss: heavier, syncopated
  kick_boss:   [1,0,0,0, 0,0,1,0, 1,0,0,1, 0,1,0,0],
  // Han military march: strong downbeats
  kick_han:    [1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
  // Xianqin tribal: sparse, ancient feel
  kick_xian:   [1,0,0,0, 0,0,0,0, 0,0,0,0, 1,0,0,0],
  // Snare: classic backbeat on 2 and 4
  snare:       [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],
  snare_han:   [0,0,0,0, 1,0,1,0, 0,0,0,0, 1,0,1,0],
  // Hi-hat densities
  hihat_4th:   [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],
  hihat_8th:   [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],
  hihat_16th:  [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],
};

// ─── Composed battle melody (8 bars = 128 steps; entry = null means rest) ─────
// Chinese RPG battle theme in E minor pentatonic (E G A B D)
// Each entry covers one 16th-note step. Most steps are null (rests between notes).
// {f: freq, d: durationMultiplier} — duration controls note decay length
const NULL16 = new Array(16).fill(null);

// Bar helper: returns 16-element array with notes placed at specific steps
function bar(...hits) {
  // hits = [{step, f, d}, ...]
  const b = new Array(16).fill(null);
  for (const h of hits) b[h.step] = { f: h.f, d: h.d };
  return b;
}

// E minor pentatonic note frequencies
const E4 = 329.63, G4 = 392.00, A4 = 440.00, B4 = 493.88, D5 = 587.33;
const E5 = 659.26, G5 = 783.99, A5 = 880.00, B3 = 246.94, D4 = 293.66;
const E3 = 164.81, G3 = 196.00, A3 = 220.00;

// 8 bars of composed melody — catchy Chinese RPG battle theme
// Bar 1: Punchy opening motif — three quick notes then a held accent
const bar1 = bar(
  {step:0, f:E4, d:0.8},
  {step:2, f:G4, d:0.8},
  {step:4, f:A4, d:0.8},
  {step:6, f:B4, d:1.6},   // held
  {step:10, f:A4, d:0.8},
  {step:12, f:G4, d:1.2},
);
// Bar 2: Climb and fall — tension builds
const bar2 = bar(
  {step:0, f:E4, d:0.8},
  {step:2, f:G4, d:0.8},
  {step:4, f:A4, d:0.8},
  {step:6, f:E5, d:2.0},   // high accent, held
  {step:10, f:D5, d:0.8},
  {step:12, f:B4, d:0.8},
  {step:14, f:A4, d:0.8},
);
// Bar 3: Quick descending run — Chinese erhu feel
const bar3 = bar(
  {step:0, f:G4, d:0.8},
  {step:2, f:E4, d:0.8},
  {step:4, f:D4, d:1.2},
  {step:7, f:E4, d:0.8},
  {step:9, f:G4, d:0.8},
  {step:11, f:A4, d:0.8},
  {step:13, f:G4, d:1.2},
);
// Bar 4: Resolve back to root — satisfying cadence
const bar4 = bar(
  {step:0, f:E4, d:0.8},
  {step:3, f:D4, d:0.8},
  {step:5, f:E4, d:1.6},   // held
  {step:9, f:G4, d:0.8},
  {step:11, f:E4, d:2.4},  // long resolve
);
// Bar 5: Chorus — rises to high register (more energetic)
const bar5 = bar(
  {step:0, f:A4, d:0.8},
  {step:2, f:B4, d:0.8},
  {step:4, f:D5, d:0.8},
  {step:6, f:E5, d:1.6},   // peak
  {step:10, f:D5, d:0.8},
  {step:12, f:B4, d:0.8},
  {step:14, f:A4, d:0.6},
);
// Bar 6: Driving syncopation — battle intensity
const bar6 = bar(
  {step:0, f:G4, d:0.6},
  {step:1, f:A4, d:0.6},
  {step:3, f:B4, d:0.8},
  {step:5, f:D5, d:0.8},
  {step:7, f:E5, d:1.2},
  {step:10, f:D5, d:0.6},
  {step:11, f:B4, d:0.6},
  {step:13, f:A4, d:0.6},
  {step:15, f:G4, d:0.6},
);
// Bar 7: Counter-figure — pentatonic triplet feel
const bar7 = bar(
  {step:0, f:E4, d:0.8},
  {step:2, f:A4, d:0.8},
  {step:4, f:G4, d:0.8},
  {step:6, f:E4, d:0.8},
  {step:8, f:D4, d:1.2},
  {step:11, f:E4, d:0.8},
  {step:13, f:G4, d:1.2},
);
// Bar 8: Final phrase — tension release back to start
const bar8 = bar(
  {step:0, f:A4, d:0.8},
  {step:2, f:G4, d:0.8},
  {step:4, f:E4, d:0.8},
  {step:6, f:D4, d:1.6},
  {step:9, f:E4, d:0.8},
  {step:12, f:G4, d:0.8},
  {step:14, f:E4, d:2.4},  // long final note — loops back cleanly
);

// Flatten 8 bars into a 128-step array
const BATTLE_MELODY = [
  ...bar1, ...bar2, ...bar3, ...bar4,
  ...bar5, ...bar6, ...bar7, ...bar8,
];

// ─── Counter-melody (intensity 3) — higher register, fills gaps ───────────────
const cb1 = bar(
  {step:3, f:E5, d:0.8},
  {step:7, f:D5, d:1.2},
  {step:11, f:E5, d:0.8},
  {step:15, f:G5, d:0.8},
);
const cb2 = bar(
  {step:1, f:A5, d:0.8},
  {step:5, f:G5, d:1.2},
  {step:9, f:E5, d:0.8},
  {step:13, f:D5, d:1.2},
);
const cb3 = bar(
  {step:2, f:E5, d:0.8},
  {step:6, f:D5, d:0.8},
  {step:10, f:B4, d:1.2},
  {step:14, f:A4, d:0.8},
);
const cb4 = bar(
  {step:1, f:G4, d:0.8},
  {step:4, f:A4, d:0.8},
  {step:8, f:G4, d:1.6},
  {step:13, f:E4, d:2.0},
);

const COUNTER_MELODY = [
  ...cb1, ...cb2, ...cb1, ...cb4,
  ...cb2, ...cb3, ...cb1, ...cb4,
];

// ─── Bass line — follows 4-chord progression per 4 bars ───────────────────────
// Progression: Em → G → Am → D (repeating, one chord per bar)
// Bass plays root on beats 1 & 3, octave-walk on beat 2
const E2 = 82.41, G2 = 98.00, A2 = 110.00, D2 = 73.42;
const E2h = 82.41 * 1.5; // E2 * 1.5 for walk note

// Bass patterns per bar (16 steps) — {f: freq, d: dur} or null
function bassBar(root, walk) {
  const b = new Array(16).fill(null);
  b[0]  = { f: root, d: 1.5 };   // beat 1
  b[4]  = { f: walk, d: 1.2 };   // beat 2 (walk note adds groove)
  b[8]  = { f: root, d: 1.5 };   // beat 3
  b[12] = { f: root * 1.122, d: 1.0 }; // beat 4 (leading tone up)
  return b;
}

const BASS_LINE = [
  ...bassBar(E2, G2),    // Bar 1: Em  — root E2, walk to G2
  ...bassBar(G2, A2),    // Bar 2: G   — root G2, walk to A2
  ...bassBar(A2, E2),    // Bar 3: Am  — root A2, walk down to E2
  ...bassBar(D2, E2),    // Bar 4: D   — root D2, walk to E2
  ...bassBar(E2, G2),    // Bar 5: Em  (repeat progression)
  ...bassBar(G2, A2),    // Bar 6: G
  ...bassBar(A2, G2),    // Bar 7: Am  — walk down for variety
  ...bassBar(D2, A2),    // Bar 8: D   — walk up to A2
];

// ─── Ambient chord progression ─────────────────────────────────────────────────
// Am → C → G/B → Em — each chord arpeggiated slowly, Chinese pentatonic feel
const AMBIENT_CHORDS = [
  [220.00, 261.63, 329.63, 440.00],   // Am: A3 C4 E4 A4
  [261.63, 329.63, 392.00, 523.25],   // C:  C4 E4 G4 C5
  [196.00, 246.94, 329.63, 392.00],   // G/B: G3 B3 E4 G4
  [164.81, 220.00, 246.94, 329.63],   // Em: E3 A3 B3 E4
];
let ambientChordIdx = 0;
let ambientNoteIdx = 0;

// ─── Build a simple feedback delay (reverb-like effect) ───────────────────────
function createDelayNode(ctx, delayTime = 0.5, feedback = 0.3, wetGain = 0.25) {
  const delay = ctx.createDelay(2.0);
  delay.delayTime.value = delayTime;

  const feedbackNode = ctx.createGain();
  feedbackNode.gain.value = feedback;

  const wetNode = ctx.createGain();
  wetNode.gain.value = wetGain;

  delay.connect(feedbackNode);
  feedbackNode.connect(delay);
  delay.connect(wetNode);

  return { input: delay, output: wetNode };
}

// ─── Play a single pentatonic note with attack/decay envelope ─────────────────
function playNote(freq, wave, gainPeak, attackTime, decayTime, destination) {
  if (!audioCtx) return;

  const osc = audioCtx.createOscillator();
  const gainNode = audioCtx.createGain();

  osc.type = wave;
  osc.frequency.value = freq;

  const now = audioCtx.currentTime;
  gainNode.gain.setValueAtTime(0, now);
  gainNode.gain.linearRampToValueAtTime(gainPeak, now + attackTime);
  gainNode.gain.exponentialRampToValueAtTime(0.0001, now + attackTime + decayTime);

  osc.connect(gainNode);
  gainNode.connect(destination);

  osc.start(now);
  osc.stop(now + attackTime + decayTime + 0.05);

  return osc;
}

// ─── Noise buffer helper (reused across drum hits) ────────────────────────────
function makeNoiseBuffer(durationSecs) {
  const len = Math.ceil(audioCtx.sampleRate * durationSecs);
  const buf = audioCtx.createBuffer(1, len, audioCtx.sampleRate);
  const d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
  return buf;
}

// ─── Individual drum hit generators ───────────────────────────────────────────

function playKick(kickHz = 60, gainPeak = 0.55, destination = null) {
  if (!audioCtx) return;
  const dest = destination || audioCtx.destination;
  const now = audioCtx.currentTime;

  // Low sine sweep (pitch drop)
  const osc = audioCtx.createOscillator();
  const envGain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(kickHz * 2.5, now);
  osc.frequency.exponentialRampToValueAtTime(kickHz * 0.4, now + 0.08);
  envGain.gain.setValueAtTime(gainPeak, now);
  envGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
  osc.connect(envGain);
  envGain.connect(dest);
  osc.start(now);
  osc.stop(now + 0.25);

  // Sub click (noise transient)
  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = makeNoiseBuffer(0.04);
  const lpf = audioCtx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 200;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(gainPeak * 0.4, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
  noiseSrc.connect(lpf);
  lpf.connect(ng);
  ng.connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.05);
}

function playSnare(snareQ = 1.5, gainPeak = 0.38, destination = null) {
  if (!audioCtx) return;
  const dest = destination || audioCtx.destination;
  const now = audioCtx.currentTime;

  // Noise burst through bandpass
  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = makeNoiseBuffer(0.2);
  const bpf = audioCtx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 1800;
  bpf.Q.value = snareQ;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(gainPeak, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
  noiseSrc.connect(bpf);
  bpf.connect(ng);
  ng.connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + 0.2);

  // Snare tone
  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 185;
  og.gain.setValueAtTime(gainPeak * 0.45, now);
  og.gain.exponentialRampToValueAtTime(0.0001, now + 0.1);
  osc.connect(og);
  og.connect(dest);
  osc.start(now);
  osc.stop(now + 0.12);
}

function playHihat(open = false, gainPeak = 0.18, destination = null) {
  if (!audioCtx) return;
  const dest = destination || audioCtx.destination;
  const now = audioCtx.currentTime;

  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = makeNoiseBuffer(0.12);
  const hpf = audioCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = open ? 6000 : 8000;
  const ng = audioCtx.createGain();
  const decay = open ? 0.12 : 0.04;
  ng.gain.setValueAtTime(gainPeak, now);
  ng.gain.exponentialRampToValueAtTime(0.0001, now + decay);
  noiseSrc.connect(hpf);
  hpf.connect(ng);
  ng.connect(dest);
  noiseSrc.start(now);
  noiseSrc.stop(now + decay + 0.01);
}

function playBassNote(freq, wave = 'triangle', gainPeak = 0.22, destination = null) {
  if (!audioCtx) return;
  const dest = destination || audioCtx.destination;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gainPeak, now + 0.01);
  g.gain.exponentialRampToValueAtTime(0.0001, now + 0.28);
  osc.connect(g);
  g.connect(dest);
  osc.start(now);
  osc.stop(now + 0.32);
}

function playMelodyNote(freq, wave = 'triangle', gainPeak = 0.12, durationMult = 1.0, destination = null) {
  if (!audioCtx) return;
  const dest = destination || audioCtx.destination;
  const now = audioCtx.currentTime;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = wave;
  osc.frequency.value = freq;
  const decay = 0.22 * durationMult;
  g.gain.setValueAtTime(0, now);
  g.gain.linearRampToValueAtTime(gainPeak, now + 0.015);
  g.gain.exponentialRampToValueAtTime(0.0001, now + decay);
  osc.connect(g);
  g.connect(dest);
  osc.start(now);
  osc.stop(now + decay + 0.02);
}

// ─── Beat-clock tick — called every step (16th note at ~150 BPM = 100ms) ──────
function onBeat() {
  if (!audioCtx || !musicEnabled) return;
  if (currentIntensity === 0) return; // ambient mode has its own scheduler

  const era = currentEra;
  const flavor = ERA_BATTLE[era] || ERA_BATTLE.menu;
  const dest = masterMusicGain || audioCtx.destination;

  // Step within current bar (0-15) and absolute step within 128-step loop
  const step = beatStep % 16;
  const absStep = beatStep % 128; // full 8-bar loop

  // ── Drums (intensity 1+) ──────────────────────────────────────────────────
  if (currentIntensity >= 1) {
    // Era-specific kick pattern
    const kickPattern = (era === 'xianqin') ? DRUMS.kick_xian
                      : (era === 'han')     ? DRUMS.kick_han
                      : (era === 'boss')    ? DRUMS.kick_boss
                      :                       DRUMS.kick;
    if (kickPattern[step] === 1) {
      playKick(flavor.kickHz, 0.55, dest);
    }

    // Snare
    const snarePattern = (era === 'han') ? DRUMS.snare_han : DRUMS.snare;
    if (snarePattern[step] === 1) {
      playSnare(flavor.snareQ, 0.38, dest);
    }

    // Hi-hat — level 1: every quarter; level 2+: every 8th; level 3: every 16th
    const hhPattern = (currentIntensity >= 3) ? DRUMS.hihat_16th
                    : (currentIntensity >= 2) ? DRUMS.hihat_8th
                    :                           DRUMS.hihat_4th;
    if (hhPattern[step] === 1) {
      playHihat(false, 0.18, dest);
    }
    // Open hi-hat on upbeats at intensity 2+
    if (currentIntensity >= 2 && (step === 2 || step === 10)) {
      playHihat(true, 0.12, dest);
    }
  }

  // ── Bass line (intensity 1+) — follows composed BASS_LINE ────────────────
  if (currentIntensity >= 1) {
    const bassNote = BASS_LINE[absStep];
    if (bassNote) {
      const wave = (era === 'boss') ? 'sawtooth' : (era === 'modern') ? 'square' : 'triangle';
      // Shift bass down an octave for boss/xianqin eras
      const freqShift = (flavor.bassShift < 0) ? 0.5 : 1.0;
      playBassNote(bassNote.f * freqShift, wave, 0.24, dest);
    }
    // Bass drop sub-hit at intensity 3 on beat 3 offbeat (step 9)
    if (currentIntensity >= 3 && step === 9) {
      const rootFreq = BASS_LINE[Math.floor(absStep / 16) * 16];
      if (rootFreq) playBassNote(rootFreq.f * 0.5, 'sine', 0.28, dest);
    }
  }

  // ── Melody (intensity 2+) — plays composed BATTLE_MELODY ─────────────────
  if (currentIntensity >= 2) {
    const melNote = BATTLE_MELODY[absStep];
    if (melNote) {
      // Era tint: use sawtooth for modern/boss, triangle for others
      const wave = (era === 'modern' || era === 'boss') ? 'sawtooth' : 'triangle';
      playMelodyNote(melNote.f, wave, 0.13, melNote.d, dest);
    }
  }

  // ── Counter-melody (intensity 3) ──────────────────────────────────────────
  if (currentIntensity >= 3) {
    const ctrNote = COUNTER_MELODY[absStep];
    if (ctrNote) {
      const wave = (era === 'boss') ? 'sawtooth' : 'square';
      // Boss: occasional tritone dissonance for menace
      const dissonance = (era === 'boss' && Math.random() < 0.2) ? 1.414 : 1.0;
      playMelodyNote(ctrNote.f * dissonance, wave, 0.09, ctrNote.d * 0.7, dest);
    }
    // Boss: rumbling low drone on beat 1 of each bar
    if (era === 'boss' && step === 0) {
      playBassNote(E2 * 0.5, 'sine', 0.14, dest);
    }
  }

  beatStep = (beatStep + 1) % 128;
}

// ─── Ambient scheduler (intensity 0) — arpeggiated chord progression ──────────
function startAmbientLoop(era) {
  const settings = ERA_SETTINGS[era] || ERA_SETTINGS.menu;
  const dest = masterMusicGain || audioCtx.destination;

  // Build a delay effect for atmosphere
  const delayFx = createDelayNode(audioCtx, settings.delayTime, 0.28, 0.22);
  delayFx.output.connect(audioCtx.destination);

  // Reset arpeggio position when (re)starting
  ambientChordIdx = 0;
  ambientNoteIdx = 0;

  // Boss era: low drone underneath
  if (era === 'boss') {
    const droneOsc = audioCtx.createOscillator();
    const droneGain = audioCtx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 55;

    const vibratoOsc = audioCtx.createOscillator();
    const vibratoGain = audioCtx.createGain();
    vibratoOsc.frequency.value = 3.5;
    vibratoGain.gain.value = 1.8;
    vibratoOsc.connect(vibratoGain);
    vibratoGain.connect(droneOsc.frequency);
    vibratoOsc.start();
    currentMusicNodes.push(vibratoOsc);

    droneGain.gain.value = 0.04;
    droneOsc.connect(droneGain);
    droneGain.connect(audioCtx.destination);
    droneOsc.start();
    currentMusicNodes.push(droneOsc);
  }

  function scheduleAmbientNote() {
    if (!musicEnabled || !audioCtx || currentIntensity !== 0) return;

    // Pull next note from the composed chord arpeggio
    const chord = AMBIENT_CHORDS[ambientChordIdx];
    const freq = chord[ambientNoteIdx];

    // Slightly vary gain and timing for humanised feel
    const gainJitter = 0.85 + Math.random() * 0.3;
    const attackTime = 0.18 + Math.random() * 0.10;
    const decayTime  = 2.2  + Math.random() * 1.2;

    playNote(freq, 'triangle', settings.gain * gainJitter, attackTime, decayTime, dest);
    // Wet copy into delay for spatial depth
    playNote(freq, 'triangle', settings.gain * 0.28, attackTime, decayTime, delayFx.input);

    // Every 4th note (new chord), add a soft low root for grounding
    if (ambientNoteIdx === 0) {
      playNote(freq * 0.5, 'sine', settings.gain * 0.4, attackTime + 0.05, decayTime * 1.3, dest);
    }

    // Advance arpeggio
    ambientNoteIdx++;
    if (ambientNoteIdx >= chord.length) {
      ambientNoteIdx = 0;
      ambientChordIdx = (ambientChordIdx + 1) % AMBIENT_CHORDS.length;
    }

    // Steady 800ms between notes — arpeggiated feel, not random scatter
    musicLoopHandle = setTimeout(scheduleAmbientNote, 800);
  }

  musicLoopHandle = setTimeout(scheduleAmbientNote, 300);
}

// ─── Start/restart the beat clock ─────────────────────────────────────────────
function startBeatClock(era) {
  stopBeatClock();
  beatStep = 0;
  const flavor = ERA_BATTLE[era] || ERA_BATTLE.menu;
  // Base: 150 BPM × 16th note = 100ms per step; scaled by era factor
  const msPerStep = Math.round(100 / flavor.bpmFactor);
  beatClock = setInterval(onBeat, msPerStep);
}

function stopBeatClock() {
  if (beatClock) {
    clearInterval(beatClock);
    beatClock = null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();

  // Master gain for all music — kept below SFX headroom
  masterMusicGain = audioCtx.createGain();
  masterMusicGain.gain.value = 0.72; // music sits below SFX
  masterMusicGain.connect(audioCtx.destination);
}

export function playMusic(era) {
  if (!audioCtx) return;

  stopMusic();

  if (!musicEnabled) return;

  currentEra = era || 'menu';
  currentIntensity = 0;

  // Start ambient loop for level 0
  startAmbientLoop(currentEra);
}

export function stopMusic() {
  // Stop ambient scheduler
  if (musicLoopHandle) {
    clearTimeout(musicLoopHandle);
    musicLoopHandle = null;
  }
  // Stop beat clock
  stopBeatClock();

  // Disconnect and discard stored nodes
  for (const node of currentMusicNodes) {
    try {
      node.stop && node.stop();
      node.disconnect && node.disconnect();
    } catch (_) {}
  }
  currentMusicNodes = [];
  layerGains = {};
  activeLayerNodes = {};
  beatStep = 0;
}

// ─── setMusicIntensity — 0–3, dynamically layers in/out ──────────────────────
export function setMusicIntensity(level) {
  if (!audioCtx) return;
  const clamped = Math.max(0, Math.min(3, Math.floor(level)));
  if (clamped === currentIntensity) return;

  const prev = currentIntensity;
  currentIntensity = clamped;

  const FADE = 0.5; // seconds for crossfade

  if (clamped === 0) {
    // Transitioning back to ambient — stop beat clock, restart ambient loop
    if (masterMusicGain) {
      const now = audioCtx.currentTime;
      masterMusicGain.gain.setValueAtTime(masterMusicGain.gain.value, now);
      masterMusicGain.gain.linearRampToValueAtTime(0.0, now + FADE * 0.5);
    }
    stopBeatClock();
    setTimeout(() => {
      if (!musicEnabled || !audioCtx) return;
      if (currentIntensity !== 0) return;
      if (masterMusicGain) {
        const now = audioCtx.currentTime;
        masterMusicGain.gain.setValueAtTime(0.0, now);
        masterMusicGain.gain.linearRampToValueAtTime(0.72, now + FADE);
      }
      startAmbientLoop(currentEra);
    }, FADE * 500);
  } else {
    if (prev === 0) {
      // Transitioning from ambient to battle — stop ambient, start beat clock
      if (musicLoopHandle) {
        clearTimeout(musicLoopHandle);
        musicLoopHandle = null;
      }
      // Fade in
      if (masterMusicGain) {
        const now = audioCtx.currentTime;
        masterMusicGain.gain.setValueAtTime(0.0, now);
        masterMusicGain.gain.linearRampToValueAtTime(0.72, now + FADE);
      }
      startBeatClock(currentEra);
    } else {
      // Battle intensity shift — beat clock keeps running, just change level
      // Briefly duck then restore for the "impact" feel
      if (masterMusicGain) {
        const now = audioCtx.currentTime;
        masterMusicGain.gain.setValueAtTime(masterMusicGain.gain.value, now);
        masterMusicGain.gain.linearRampToValueAtTime(0.50, now + 0.05);
        masterMusicGain.gain.linearRampToValueAtTime(0.72, now + 0.05 + FADE);
      }
    }
  }
}

// ─── playStinger — short dramatic musical bursts ──────────────────────────────
export function playStinger(type) {
  if (!audioCtx) return;
  const now = audioCtx.currentTime;

  switch (type) {

    case 'battle_start': {
      // Quick ascending power chord: C – G – C (300ms, punchy)
      const freqs = [261.63, 392.00, 523.25];
      freqs.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const t = now + i * 0.07;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.28, t + 0.015);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.32);
      });
      // Crash noise on top
      playKick(65, 0.45, audioCtx.destination);
      playSnare(2.0, 0.35, audioCtx.destination);
      break;
    }

    case 'victory': {
      // Classic RPG fanfare: ascending arpeggio C–E–G–C then held major chord (4s total)
      const arpNotes = [261.63, 329.63, 392.00, 523.25];
      arpNotes.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = now + i * 0.13;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (i === 3 ? 2.4 : 0.22));
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + (i === 3 ? 2.5 : 0.26));
      });
      // Final major chord swell at t+0.6
      const chordStart = now + 0.60;
      [261.63, 329.63, 392.00, 523.25].forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, chordStart);
        g.gain.linearRampToValueAtTime(0.15, chordStart + 0.1);
        g.gain.setValueAtTime(0.15, chordStart + 2.8);
        g.gain.exponentialRampToValueAtTime(0.0001, chordStart + 3.5);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(chordStart);
        osc.stop(chordStart + 3.6);
      });
      break;
    }

    case 'boss_enter': {
      // Deep rumble → dramatic ascending scale → crash (~2s)
      // 1. Sub rumble (0–0.6s)
      const rumbleOsc = audioCtx.createOscillator();
      const rumbleGain = audioCtx.createGain();
      rumbleOsc.type = 'sine';
      rumbleOsc.frequency.setValueAtTime(30, now);
      rumbleOsc.frequency.linearRampToValueAtTime(55, now + 0.6);
      rumbleGain.gain.setValueAtTime(0, now);
      rumbleGain.gain.linearRampToValueAtTime(0.55, now + 0.15);
      rumbleGain.gain.setValueAtTime(0.55, now + 0.45);
      rumbleGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.75);
      rumbleOsc.connect(rumbleGain);
      rumbleGain.connect(audioCtx.destination);
      rumbleOsc.start(now);
      rumbleOsc.stop(now + 0.8);

      // 2. Ascending dramatic scale (0.4–1.5s) — minor scale for menace
      const scaleFreqs = [98.00, 110.00, 123.47, 146.83, 164.81, 185.00, 220.00, 246.94];
      scaleFreqs.forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const t = now + 0.4 + i * 0.13;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.18 + i * 0.012, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.18);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });

      // 3. Crash noise burst at 1.8s
      setTimeout(() => {
        if (!audioCtx) return;
        playKick(45, 0.65, audioCtx.destination);
        playSnare(0.7, 0.55, audioCtx.destination);
        playHihat(true, 0.45, audioCtx.destination);
      }, 1800);
      break;
    }

    case 'phase_change': {
      // Dissonant chord stab → resolve to new key (500ms)
      // Stab: tritone interval (C + F#) at t=0
      const stabFreqs = [261.63, 369.99, 440.00]; // C, F#, A — dissonant
      stabFreqs.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(now);
        osc.stop(now + 0.22);
      });
      // Resolve: clean C major at t=0.22
      const resolveStart = now + 0.22;
      [261.63, 329.63, 392.00].forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, resolveStart);
        g.gain.linearRampToValueAtTime(0.16, resolveStart + 0.03);
        g.gain.exponentialRampToValueAtTime(0.0001, resolveStart + 0.32);
        osc.connect(g);
        g.connect(audioCtx.destination);
        osc.start(resolveStart);
        osc.stop(resolveStart + 0.36);
      });
      // Percussive accent
      setTimeout(() => {
        if (!audioCtx) return;
        playSnare(2.5, 0.28, audioCtx.destination);
      }, 220);
      break;
    }

    default:
      break;
  }
}

// ─── SFX (unchanged) ─────────────────────────────────────────────────────────

export function playSound(type) {
  if (!audioCtx || !sfxEnabled) return;

  const now = audioCtx.currentTime;

  switch (type) {

    case 'correct': {
      // Short ascending two-note chime (pentatonic E → G)
      [329.63, 392.00].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now + i * 0.12);
        g.gain.linearRampToValueAtTime(0.18, now + i * 0.12 + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, now + i * 0.12 + 0.35);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(now + i * 0.12);
        osc.stop(now + i * 0.12 + 0.4);
      });
      break;
    }

    case 'wrong': {
      // Low descending buzz
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      const bpf = audioCtx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.value = 180;
      bpf.Q.value = 1.5;
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(220, now);
      osc.frequency.linearRampToValueAtTime(110, now + 0.3);
      g.gain.setValueAtTime(0.18, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      osc.connect(bpf); bpf.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.4);
      break;
    }

    case 'attack': {
      // Quick whoosh: white noise burst filtered with bandpass, fast decay
      const bufLen = audioCtx.sampleRate * 0.25;
      const buffer = audioCtx.createBuffer(1, bufLen, audioCtx.sampleRate);
      const data = buffer.getChannelData(0);
      for (let i = 0; i < bufLen; i++) data[i] = (Math.random() * 2 - 1);
      const noise = audioCtx.createBufferSource();
      noise.buffer = buffer;
      const bpf = audioCtx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(1800, now);
      bpf.frequency.exponentialRampToValueAtTime(400, now + 0.2);
      bpf.Q.value = 2.5;
      const g = audioCtx.createGain();
      g.gain.setValueAtTime(0.28, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.22);
      noise.connect(bpf); bpf.connect(g); g.connect(audioCtx.destination);
      noise.start(now); noise.stop(now + 0.25);
      break;
    }

    case 'hit': {
      // Impact thud: low sine burst ~80Hz
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(90, now);
      osc.frequency.exponentialRampToValueAtTime(40, now + 0.15);
      g.gain.setValueAtTime(0.45, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.2);
      break;
    }

    case 'levelup': {
      // Ascending arpeggio: C-E-G-C each 100ms, triangle wave
      [261.63, 329.63, 392.00, 523.25].forEach((freq, i) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        const t = now + i * 0.11;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.02);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.28);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(t); osc.stop(t + 0.3);
      });
      break;
    }

    case 'boss_roar': {
      // Low rumble: 50Hz sine with vibrato, 1s, high gain
      const osc = audioCtx.createOscillator();
      const vibOsc = audioCtx.createOscillator();
      const vibGain = audioCtx.createGain();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 50;
      vibOsc.frequency.value = 6;
      vibGain.gain.value = 8;
      vibOsc.connect(vibGain);
      vibGain.connect(osc.frequency);
      g.gain.setValueAtTime(0, now);
      g.gain.linearRampToValueAtTime(0.5, now + 0.1);
      g.gain.setValueAtTime(0.5, now + 0.7);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 1.1);
      osc.connect(g); g.connect(audioCtx.destination);
      vibOsc.start(now); vibOsc.stop(now + 1.15);
      osc.start(now); osc.stop(now + 1.15);
      break;
    }

    case 'text': {
      // Very soft high-frequency click, 5ms
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'square';
      osc.frequency.value = 1800 + Math.random() * 400;
      g.gain.setValueAtTime(0.03, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.008);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.01);
      break;
    }

    case 'click': {
      // Soft pop: sine burst 400Hz, 20ms
      const osc = audioCtx.createOscillator();
      const g = audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.value = 400;
      g.gain.setValueAtTime(0.12, now);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.022);
      osc.connect(g); g.connect(audioCtx.destination);
      osc.start(now); osc.stop(now + 0.025);
      break;
    }

    case 'victory': {
      // Major chord: C-E-G played simultaneously, 2s sustain, triangle wave
      [261.63, 329.63, 392.00].forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0, now);
        g.gain.linearRampToValueAtTime(0.14, now + 0.08);
        g.gain.setValueAtTime(0.14, now + 1.6);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 2.1);
        osc.connect(g); g.connect(audioCtx.destination);
        osc.start(now); osc.stop(now + 2.2);
      });
      break;
    }

    default:
      break;
  }
}

export function toggleMusic() {
  musicEnabled = !musicEnabled;
  if (!musicEnabled) {
    stopMusic();
  } else if (audioCtx) {
    // Resume with menu music if nothing is playing
    playMusic('menu');
  }
  return musicEnabled;
}

export function toggleSFX() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

export function isMusicEnabled() { return musicEnabled; }
export function isSFXEnabled() { return sfxEnabled; }
