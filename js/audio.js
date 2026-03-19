// js/audio.js — Music (MP3 via Howler.js) + Procedural SFX (Web Audio API)

let audioCtx = null;
let musicEnabled = true;
let sfxEnabled = true;
let currentMusicNodes = []; // oscillators / intervals currently playing
let musicLoopHandle = null;

// ─── Howler.js MP3 music tracks ──────────────────────────────────────────────
const _av = window.APP_VERSION ? '?v=' + window.APP_VERSION : '';
const MUSIC_TRACKS = {};
let currentHowl = null; // Currently playing Howler track
let currentTrackKey = null;

function ensureMusicTracks() {
  if (MUSIC_TRACKS._loaded) return;
  MUSIC_TRACKS._loaded = true;
  if (typeof Howl === 'undefined') {
    console.warn('[Audio] Howler.js not loaded — MP3 music unavailable');
    return;
  }
  const base = 'assets/audio/';
  const tracks = {
    menu:    { src: base + 'music_menu.mp3' + _av,    loop: true,  volume: 0.4 },
    explore: { src: base + 'music_explore.mp3' + _av, loop: true,  volume: 0.35 },
    combat:  { src: base + 'music_combat.mp3' + _av,  loop: true,  volume: 0.45 },
    boss:    { src: base + 'music_boss.mp3' + _av,    loop: true,  volume: 0.5 },
    victory: { src: base + 'sfx_victory.mp3' + _av,   loop: false, volume: 0.55 },
    defeat:  { src: base + 'sfx_defeat.mp3' + _av,    loop: false, volume: 0.5 },
  };
  for (const [key, cfg] of Object.entries(tracks)) {
    MUSIC_TRACKS[key] = new Howl({
      src: [cfg.src],
      loop: cfg.loop,
      volume: cfg.volume,
      preload: true,
      onloaderror: (id, err) => console.warn(`[Audio] Failed to load ${key}:`, err),
      onplayerror: (id, err) => {
        console.warn(`[Audio] Play error ${key}:`, err);
        if (typeof Howler !== 'undefined') {
          Howler.ctx?.resume?.();
          setTimeout(() => MUSIC_TRACKS[key]?.play(), 200);
        }
      },
    });
  }
}

// Preload tracks immediately on module load
ensureMusicTracks();

function playMusicTrack(key) {
  ensureMusicTracks();
  if (currentTrackKey === key && currentHowl?.playing()) return;
  stopMusicTrack();
  const howl = MUSIC_TRACKS[key];
  if (!howl) return;
  currentTrackKey = key;
  currentHowl = howl;

  function tryPlay() {
    if (currentTrackKey !== key) return; // navigated away
    // Ensure Howler's audio context is unlocked
    if (typeof Howler !== 'undefined' && Howler.ctx && Howler.ctx.state === 'suspended') {
      Howler.ctx.resume().then(() => {
        if (currentTrackKey === key) howl.play();
      });
    } else {
      howl.play();
    }
  }

  tryPlay();
  // Retry after 500ms if not playing (edge cases where resume was slow)
  setTimeout(() => {
    if (currentTrackKey === key && !howl.playing()) tryPlay();
  }, 500);
}

let _stopGen = 0; // Generation counter to prevent stale stop() calls
function stopMusicTrack() {
  if (currentHowl) {
    const gen = ++_stopGen;
    currentHowl.fade(currentHowl.volume(), 0, 300);
    const h = currentHowl;
    setTimeout(() => {
      // Only stop if no new track was started since this fade began
      if (_stopGen === gen) { try { h.stop(); } catch(_) {} }
    }, 350);
    currentHowl = null;
    currentTrackKey = null;
  }
}

// Map era + intensity to the right MP3 track
function getMusicTrackForState(era, intensity) {
  if (intensity >= 3) return 'boss';
  if (intensity >= 1) return 'combat';
  if (era === 'menu') return 'menu';
  return 'explore'; // ambient/worldmap/quest for all eras
}

// ─── Music state ──────────────────────────────────────────────────────────────
let currentEra = 'menu';
let currentIntensity = 0; // 0=ambient, 1=combat, 2=combo, 3=boss/critical
let masterMusicGain = null;   // GainNode — master volume for all music layers
let masterSfxGain = null;     // GainNode — master volume for SFX
let masterStingerGain = null; // GainNode — master volume for stingers
let layerGains = {};          // GainNode per layer so we can fade in/out
let activeLayerNodes = {};    // keyed by layer name

// ─── Look-ahead scheduler state ───────────────────────────────────────────────
const LOOK_AHEAD       = 0.1;  // seconds to schedule ahead
const SCHEDULE_INTERVAL = 25;  // ms between scheduler calls

let nextNoteTime   = 0;   // Web Audio clock time of the next scheduled step
let schedulerTimer = null; // handle from setTimeout
let currentStep    = 0;   // 0-based step counter

// ─── BPM / timing constants ───────────────────────────────────────────────────
const BATTLE_BPM            = 155;
const SIXTEENTH_DURATION    = 60 / BATTLE_BPM / 4; // seconds per 16th note
const TOTAL_STEPS           = 64; // 4 bars × 16 steps

// ─── Drum patterns (16-step, repeat each bar) ─────────────────────────────────
const KICK_PATTERN  = [1,0,0,0, 0,0,1,0, 1,0,0,0, 0,0,1,0];
const SNARE_PATTERN = [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0];
const HIHAT_8TH     = [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0];
const HIHAT_16TH    = [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1];

// ─── Note frequency constants (A minor pentatonic: A C D E G) ─────────────────
const A2 = 110.00, C3 = 130.81, D3 = 146.83, E3 = 164.81, G3 = 196.00;
const A3 = 220.00, C4 = 261.63, D4 = 293.66, E4 = 329.63, G4 = 392.00;
const A4 = 440.00, C5 = 523.25, D5 = 587.33, E5 = 659.26, G5 = 783.99;

// ─── Chinese pentatonic scale (宫商角徵羽 — C D E G A) ──────────────────────────
// Octave 3
const PENT_C3 = 130.81, PENT_D3 = 146.83, PENT_E3 = 164.81, PENT_G3 = 196.00, PENT_A3 = 220.00;
// Octave 4
const PENT_C4 = 261.63, PENT_D4 = 293.66, PENT_E4 = 329.63, PENT_G4 = 392.00, PENT_A4 = 440.00;
// Octave 5
const PENT_C5 = 523.25, PENT_D5 = 587.33, PENT_E5 = 659.26, PENT_G5 = 783.99, PENT_A5 = 880.00;
// Octave 2 (bass)
const PENT_C2 = 65.41, PENT_D2 = 73.42, PENT_E2 = 82.41, PENT_G2 = 98.00, PENT_A2 = 110.00;

// Scale arrays for easy random access
const PENTATONIC_LOW  = [PENT_C3, PENT_D3, PENT_E3, PENT_G3, PENT_A3];
const PENTATONIC_MID  = [PENT_C4, PENT_D4, PENT_E4, PENT_G4, PENT_A4];
const PENTATONIC_HIGH = [PENT_C5, PENT_D5, PENT_E5, PENT_G5, PENT_A5];
const PENTATONIC_BASS = [PENT_C2, PENT_D2, PENT_E2, PENT_G2, PENT_A2];
const PENTATONIC_ALL  = [...PENTATONIC_LOW, ...PENTATONIC_MID, ...PENTATONIC_HIGH];

// ─── Battle melody — 64 steps, A minor pentatonic ─────────────────────────────
// Each entry: {freq, dur} where dur is in sixteenth notes; null = rest.
// Composed as a catchy 4-bar RPG battle theme.
//
// Bar 1 (steps  0-15): Heroic opening — ascending run, held peak, descend
// Bar 2 (steps 16-31): Answering phrase — call & response, resolve to A4
// Bar 3 (steps 32-47): Energetic variation — syncopated pushes, wider range
// Bar 4 (steps 48-63): Build & turnaround — driving run back to start
const BATTLE_MELODY = (() => {
  const m = new Array(64).fill(null);

  // — Bar 1: Rising heroic phrase —
  m[0]  = { freq: A4, dur: 1 };   // A4 — strong downbeat
  m[2]  = { freq: C5, dur: 1 };   // C5 — step up
  m[4]  = { freq: D5, dur: 1 };   // D5 — step up
  m[6]  = { freq: E5, dur: 2 };   // E5 — held peak (2 sixteenths)
  m[9]  = { freq: D5, dur: 1 };   // D5 — drop back
  m[11] = { freq: C5, dur: 1 };   // C5 — step down
  m[13] = { freq: A4, dur: 1 };   // A4 — return to root
  m[15] = { freq: G4, dur: 1 };   // G4 — passing note into bar 2

  // — Bar 2: Answering phrase — lower register resolve —
  m[16] = { freq: A4, dur: 2 };   // A4 — strong beat, held
  m[19] = { freq: G4, dur: 1 };   // G4 — grace
  m[20] = { freq: E4, dur: 2 };   // E4 — held, mediant
  m[23] = { freq: G4, dur: 1 };   // G4 — upward bounce
  m[24] = { freq: A4, dur: 1 };   // A4
  m[26] = { freq: C5, dur: 1 };   // C5 — lift
  m[28] = { freq: A4, dur: 3 };   // A4 — resolve, held 3 (satisfying cadence)

  // — Bar 3: Energetic variation — syncopation & wider leaps —
  m[32] = { freq: E5, dur: 1 };   // E5 — high accent
  m[33] = { freq: D5, dur: 1 };   // D5 — immediate stepdown (16th syncopation)
  m[35] = { freq: C5, dur: 2 };   // C5 — hold
  m[38] = { freq: A4, dur: 1 };   // A4 — drop to root
  m[40] = { freq: G4, dur: 1 };   // G4 — low swing
  m[41] = { freq: A4, dur: 1 };   // A4 — quick return
  m[43] = { freq: C5, dur: 1 };   // C5 — push up
  m[44] = { freq: D5, dur: 1 };   // D5
  m[46] = { freq: E5, dur: 1 };   // E5 — peak
  m[47] = { freq: D5, dur: 1 };   // D5 — fall into bar 4

  // — Bar 4: Driving run — tension before loop restart —
  m[48] = { freq: C5, dur: 1 };   // C5 — descend begins
  m[50] = { freq: A4, dur: 1 };   // A4
  m[52] = { freq: G4, dur: 1 };   // G4
  m[53] = { freq: E4, dur: 1 };   // E4 — quick dip (16th syncopation)
  m[55] = { freq: G4, dur: 1 };   // G4 — bounce back
  m[56] = { freq: A4, dur: 1 };   // A4 — climb
  m[58] = { freq: C5, dur: 1 };   // C5
  m[60] = { freq: D5, dur: 1 };   // D5
  m[62] = { freq: E5, dur: 1 };   // E5 — high note into repeat (loop seamlessly)
  m[63] = { freq: A4, dur: 1 };   // A4 — land on root for smooth loop

  return m;
})();

// ─── Counter-melody — intensity 3, fills the gaps of main melody ──────────────
// Higher register, sparser, provides harmonic interest without clashing.
const COUNTER_MELODY = (() => {
  const m = new Array(64).fill(null);

  // Bar 1 counter — offbeat high notes
  m[1]  = { freq: E5,  dur: 1 };
  m[7]  = { freq: G5,  dur: 1 };
  m[10] = { freq: E5,  dur: 1 };
  m[14] = { freq: D5,  dur: 1 };

  // Bar 2 counter
  m[17] = { freq: G5,  dur: 1 };
  m[21] = { freq: E5,  dur: 2 };
  m[25] = { freq: D5,  dur: 1 };
  m[29] = { freq: E5,  dur: 2 };

  // Bar 3 counter
  m[34] = { freq: G5,  dur: 1 };
  m[37] = { freq: E5,  dur: 1 };
  m[42] = { freq: D5,  dur: 1 };
  m[45] = { freq: A4,  dur: 1 };

  // Bar 4 counter
  m[49] = { freq: E5,  dur: 1 };
  m[51] = { freq: C5,  dur: 1 };
  m[54] = { freq: A4,  dur: 1 };
  m[57] = { freq: C5,  dur: 1 };
  m[59] = { freq: D5,  dur: 1 };
  m[61] = { freq: E5,  dur: 1 };

  return m;
})();

// ─── Bass line — roots of Am / Am / F / G progression, 4 bars ─────────────────
// Bar 1-2: Am root; Bar 3: F (A-minor relative); Bar 4: G leading back to Am
const BASS_NOTES = [
  // Bar 1: Am
  { step:  0, freq: A2,       dur: 4 },   // A2 — downbeat root
  { step:  8, freq: A2 * 2,   dur: 2 },   // A3 — octave on beat 3
  // Bar 2: Am
  { step: 16, freq: A2,       dur: 4 },   // A2
  { step: 24, freq: E3,       dur: 2 },   // E3 — walk note (5th of Am)
  // Bar 3: F (use F2 = 87.31)
  { step: 32, freq: 87.31,    dur: 4 },   // F2 — root
  { step: 40, freq: C3,       dur: 2 },   // C3 — 5th of F
  // Bar 4: G → resolve
  { step: 48, freq: 98.00,    dur: 4 },   // G2 — dominant
  { step: 56, freq: C3,       dur: 4 },   // C3 — leading tone back to Am
];

// ─── Ambient chord progression (intensity 0) ──────────────────────────────────
// Chinese pentatonic arpeggiated chords — contemplative, traditional feel
// 宫 (C) → 商 (D) → 角 (E) → 徵 (G) → 羽 (A) grouped into chord clusters
const AMBIENT_CHORDS = [
  [PENT_C4, PENT_E4, PENT_G4, PENT_C5],   // 宫: C4 E4 G4 C5 — open fifth feel
  [PENT_D4, PENT_G4, PENT_A4, PENT_D5],   // 商: D4 G4 A4 D5 — longing, spacious
  [PENT_E4, PENT_A4, PENT_C5, PENT_E5],   // 角: E4 A4 C5 E5 — bright, ascending
  [PENT_G3, PENT_C4, PENT_E4, PENT_G4],   // 徵: G3 C4 E4 G4 — resolved, warm
  [PENT_A3, PENT_D4, PENT_G4, PENT_A4],   // 羽: A3 D4 G4 A4 — melancholy, floating
];
let ambientChordIdx = 0;
let ambientNoteIdx  = 0;

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

// ─── Convolver-based reverb (impulse response) ──────────────────────────────
let sharedReverb = null; // reusable convolver node

function createReverb(ctx, duration = 2) {
  const rate = ctx.sampleRate;
  const length = rate * duration;
  const impulse = ctx.createBuffer(2, length, rate);
  for (let ch = 0; ch < 2; ch++) {
    const data = impulse.getChannelData(ch);
    for (let i = 0; i < length; i++) {
      data[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / length, 2);
    }
  }
  const convolver = ctx.createConvolver();
  convolver.buffer = impulse;
  return convolver;
}

function getSharedReverb() {
  if (!audioCtx) return null;
  if (!sharedReverb) {
    sharedReverb = createReverb(audioCtx, 2.5);
    const reverbGain = audioCtx.createGain();
    reverbGain.gain.value = 0.25;
    sharedReverb.connect(reverbGain);
    reverbGain.connect(audioCtx.destination);
  }
  return sharedReverb;
}

// ─── Play a single note with attack/decay envelope (for ambient) ──────────────
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

// ─── Scheduled drum / bass / melody hit generators ────────────────────────────
// All accept a `time` parameter (Web Audio clock time) for sample-accurate placement.

function playKickAt(time, gainPeak = 0.42) {
  if (!audioCtx) return;
  const dest = masterMusicGain || audioCtx.destination;

  const osc = audioCtx.createOscillator();
  const envGain = audioCtx.createGain();
  osc.type = 'sine';
  osc.frequency.setValueAtTime(150, time);
  osc.frequency.exponentialRampToValueAtTime(40, time + 0.08);
  envGain.gain.setValueAtTime(gainPeak, time);
  envGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.22);
  osc.connect(envGain);
  envGain.connect(dest);
  osc.start(time);
  osc.stop(time + 0.25);

  // Sub click
  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = makeNoiseBuffer(0.04);
  const lpf = audioCtx.createBiquadFilter();
  lpf.type = 'lowpass';
  lpf.frequency.value = 200;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(gainPeak * 0.4, time);
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.04);
  noiseSrc.connect(lpf);
  lpf.connect(ng);
  ng.connect(dest);
  noiseSrc.start(time);
  noiseSrc.stop(time + 0.05);
}

function playSnareAt(time, gainPeak = 0.30) {
  if (!audioCtx) return;
  const dest = masterMusicGain || audioCtx.destination;

  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = makeNoiseBuffer(0.2);
  const bpf = audioCtx.createBiquadFilter();
  bpf.type = 'bandpass';
  bpf.frequency.value = 1800;
  bpf.Q.value = 1.5;
  const ng = audioCtx.createGain();
  ng.gain.setValueAtTime(gainPeak, time);
  ng.gain.exponentialRampToValueAtTime(0.0001, time + 0.18);
  noiseSrc.connect(bpf);
  bpf.connect(ng);
  ng.connect(dest);
  noiseSrc.start(time);
  noiseSrc.stop(time + 0.2);

  const osc = audioCtx.createOscillator();
  const og = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = 185;
  og.gain.setValueAtTime(gainPeak * 0.45, time);
  og.gain.exponentialRampToValueAtTime(0.0001, time + 0.1);
  osc.connect(og);
  og.connect(dest);
  osc.start(time);
  osc.stop(time + 0.12);
}

function playHihatAt(time, open = false, gainPeak = 0.11) {
  if (!audioCtx) return;
  const dest = masterMusicGain || audioCtx.destination;

  const noiseSrc = audioCtx.createBufferSource();
  noiseSrc.buffer = makeNoiseBuffer(0.12);
  const hpf = audioCtx.createBiquadFilter();
  hpf.type = 'highpass';
  hpf.frequency.value = open ? 6000 : 8000;
  const ng = audioCtx.createGain();
  const decay = open ? 0.12 : 0.04;
  ng.gain.setValueAtTime(gainPeak, time);
  ng.gain.exponentialRampToValueAtTime(0.0001, time + decay);
  noiseSrc.connect(hpf);
  hpf.connect(ng);
  ng.connect(dest);
  noiseSrc.start(time);
  noiseSrc.stop(time + decay + 0.01);
}

function playBassAt(freq, time, duration) {
  if (!audioCtx) return;
  const dest = masterMusicGain || audioCtx.destination;

  const osc = audioCtx.createOscillator();
  const g = audioCtx.createGain();
  osc.type = 'triangle';
  osc.frequency.value = freq;
  g.gain.setValueAtTime(0, time);
  g.gain.linearRampToValueAtTime(0.24, time + 0.01);
  g.gain.setValueAtTime(0.24, time + duration * 0.8);
  g.gain.linearRampToValueAtTime(0.0001, time + duration);
  osc.connect(g);
  g.connect(dest);
  osc.start(time);
  osc.stop(time + duration + 0.02);
}

function playMelodyAt(freq, time, duration) {
  if (!audioCtx) return;
  const dest = masterMusicGain || audioCtx.destination;
  const vol = 0.18;  // slightly louder

  // Main voice
  const osc1 = audioCtx.createOscillator();
  const g1 = audioCtx.createGain();
  osc1.type = 'square';
  osc1.frequency.value = freq;
  g1.gain.setValueAtTime(0, time);
  g1.gain.linearRampToValueAtTime(vol, time + 0.008);
  g1.gain.setValueAtTime(vol, time + duration - 0.015);
  g1.gain.linearRampToValueAtTime(0, time + duration);
  osc1.connect(g1); g1.connect(dest);
  osc1.start(time); osc1.stop(time + duration + 0.01);

  // Detuned sawtooth layer
  const osc2 = audioCtx.createOscillator();
  const g2 = audioCtx.createGain();
  osc2.type = 'sawtooth';
  osc2.frequency.value = freq;
  osc2.detune.value = 3; // slight chorus effect
  g2.gain.setValueAtTime(0, time);
  g2.gain.linearRampToValueAtTime(vol * 0.5, time + 0.008);
  g2.gain.linearRampToValueAtTime(0, time + duration);
  osc2.connect(g2); g2.connect(dest);
  osc2.start(time); osc2.stop(time + duration + 0.01);

  // Sub-octave warmth
  const osc3 = audioCtx.createOscillator();
  const g3 = audioCtx.createGain();
  osc3.type = 'sine';
  osc3.frequency.value = freq / 2;
  g3.gain.setValueAtTime(0, time);
  g3.gain.linearRampToValueAtTime(vol * 0.25, time + 0.01);
  g3.gain.linearRampToValueAtTime(0, time + duration);
  osc3.connect(g3); g3.connect(dest);
  osc3.start(time); osc3.stop(time + duration + 0.01);
}

function playCounterAt(freq, time, duration) {
  if (!audioCtx) return;
  const dest = masterMusicGain || audioCtx.destination;

  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();
  osc.type = 'square';
  osc.frequency.value = freq;
  const vol = 0.05;
  gain.gain.setValueAtTime(0, time);
  gain.gain.linearRampToValueAtTime(vol, time + 0.01);
  gain.gain.setValueAtTime(vol, time + duration - 0.02);
  gain.gain.linearRampToValueAtTime(0, time + duration);
  osc.connect(gain);
  gain.connect(dest);
  osc.start(time);
  osc.stop(time + duration + 0.01);
}

// ─── Unscheduled drum helpers (for SFX / stingers, still needed) ──────────────

function playKick(kickHz = 60, gainPeak = 0.55, destination = null) {
  if (!audioCtx) return;
  const dest = destination || audioCtx.destination;
  const now = audioCtx.currentTime;

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

// ─── scheduleNote — called by the look-ahead scheduler ────────────────────────
function scheduleNote(time) {
  if (currentIntensity === 0) return; // ambient has its own scheduler

  const step    = currentStep % 16;   // position within the current bar (0-15)
  const absStep = currentStep % TOTAL_STEPS; // position in 4-bar loop (0-63)

  // ── Drums (intensity 1+) ──────────────────────────────────────────────────
  if (currentIntensity >= 1) {
    if (KICK_PATTERN[step])  playKickAt(time);
    if (SNARE_PATTERN[step]) playSnareAt(time);
  }

  // ── Hi-hats (intensity 2+) ────────────────────────────────────────────────
  if (currentIntensity >= 2) {
    const hhPattern = currentIntensity >= 3 ? HIHAT_16TH : HIHAT_8TH;
    if (hhPattern[step]) playHihatAt(time, false, 0.11);
    // Open hi-hat on the upbeat (steps 2 & 10) at intensity 2+
    if (step === 2 || step === 10) playHihatAt(time, true, 0.06);
  }

  // ── Bass (intensity 1+) ───────────────────────────────────────────────────
  if (currentIntensity >= 1) {
    const bassNote = BASS_NOTES.find(n => n.step === absStep);
    if (bassNote) {
      playBassAt(bassNote.freq, time, bassNote.dur * SIXTEENTH_DURATION);
    }
  }

  // ── Melody (intensity 2+) ─────────────────────────────────────────────────
  if (currentIntensity >= 2) {
    const note = BATTLE_MELODY[absStep];
    if (note) {
      playMelodyAt(note.freq, time, note.dur * SIXTEENTH_DURATION);
    }
  }

  // ── Chord pads (intensity 2+) — sustained harmony on beat 1 of each bar ──
  if (currentIntensity >= 2 && step === 0) {
    // Chord pad — sustained chord matching the bass note's key
    // Bar 1 & 2: Am — A3, C4, E4
    // Bar 3: F  — F3(174.61), A3(220), C4(261.63)
    // Bar 4: G  — G3(196), B3(246.94), D4(293.66)
    const barStart = absStep - (absStep % 16);
    const chordMap = {
       0: [A3, C4, E4],
      16: [A3, C4, E4],
      32: [174.61, A3, C4],
      48: [G3, 246.94, D4],
    };
    const chordFreqs = chordMap[barStart];
    if (chordFreqs) {
      chordFreqs.forEach(f => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = f;
        const padVol = 0.04;
        g.gain.setValueAtTime(0, time);
        g.gain.linearRampToValueAtTime(padVol, time + 0.1);
        g.gain.setValueAtTime(padVol, time + SIXTEENTH_DURATION * 14);
        g.gain.linearRampToValueAtTime(0, time + SIXTEENTH_DURATION * 16);
        osc.connect(g); g.connect(masterMusicGain);
        osc.start(time); osc.stop(time + SIXTEENTH_DURATION * 16 + 0.02);
      });
    }
  }

  // ── Heroic pitch-bend entry note — beat 1 of each 4-bar cycle (absStep 0) ──
  // Slide from C4 up to E4 over 200ms for "heroic entry" feel
  if (currentIntensity >= 2 && absStep === 0) {
    const heroOsc = audioCtx.createOscillator();
    const heroGain = audioCtx.createGain();
    heroOsc.type = 'square';
    heroOsc.frequency.setValueAtTime(C4, time);
    heroOsc.frequency.linearRampToValueAtTime(E4, time + 0.20);
    heroGain.gain.setValueAtTime(0, time);
    heroGain.gain.linearRampToValueAtTime(0.14, time + 0.01);
    heroGain.gain.setValueAtTime(0.14, time + 0.18);
    heroGain.gain.linearRampToValueAtTime(0, time + 0.22);
    heroOsc.connect(heroGain);
    heroGain.connect(masterMusicGain || audioCtx.destination);
    heroOsc.start(time);
    heroOsc.stop(time + 0.25);
  }

  // ── Crash cymbal — beat 1 of bar 1 of each 4-bar loop (absStep 0) ─────────
  // White noise through highpass at 8000Hz, fast decay
  if (currentIntensity >= 2 && absStep === 0) {
    const crashBuf = makeNoiseBuffer(0.35);
    const crashSrc = audioCtx.createBufferSource();
    crashSrc.buffer = crashBuf;
    const crashHpf = audioCtx.createBiquadFilter();
    crashHpf.type = 'highpass';
    crashHpf.frequency.value = 8000;
    const crashGain = audioCtx.createGain();
    crashGain.gain.setValueAtTime(0.28, time);
    crashGain.gain.exponentialRampToValueAtTime(0.0001, time + 0.32);
    crashSrc.connect(crashHpf);
    crashHpf.connect(crashGain);
    crashGain.connect(masterMusicGain || audioCtx.destination);
    crashSrc.start(time);
    crashSrc.stop(time + 0.36);
  }

  // ── Counter-melody (intensity 3) ──────────────────────────────────────────
  if (currentIntensity >= 3) {
    const cnote = COUNTER_MELODY[absStep];
    if (cnote) {
      playCounterAt(cnote.freq, time, cnote.dur * SIXTEENTH_DURATION);
    }
    // Low sub-hit on beat 1 of each bar for extra weight
    if (step === 0) {
      playBassAt(A2 * 0.5, time, SIXTEENTH_DURATION * 2);
    }
  }
}

// ─── Look-ahead scheduler ─────────────────────────────────────────────────────
function scheduler() {
  while (nextNoteTime < audioCtx.currentTime + LOOK_AHEAD) {
    scheduleNote(nextNoteTime);
    nextNoteTime += SIXTEENTH_DURATION;
    currentStep = (currentStep + 1) % TOTAL_STEPS;
  }
  schedulerTimer = setTimeout(scheduler, SCHEDULE_INTERVAL);
}

function startScheduler() {
  stopScheduler();
  currentStep  = 0;
  nextNoteTime = audioCtx.currentTime + 0.05; // small start delay
  scheduler();
}

function stopScheduler() {
  if (schedulerTimer !== null) {
    clearTimeout(schedulerTimer);
    schedulerTimer = null;
  }
}

// ─── Ambient scheduler (intensity 0) — arpeggiated chord progression ──────────
// 75 BPM quarter note ≈ 800ms; arpeggio plays one note per beat.
function startAmbientLoop() {
  const dest = masterMusicGain || audioCtx.destination;

  const delayFx = createDelayNode(audioCtx, 0.5, 0.28, 0.22);
  delayFx.output.connect(audioCtx.destination);

  ambientChordIdx = 0;
  ambientNoteIdx  = 0;

  // Connect reverb for ambient — rich, spacious feel
  const reverb = getSharedReverb();

  function scheduleAmbientNote() {
    if (!musicEnabled || !audioCtx || currentIntensity !== 0) return;

    const chord = AMBIENT_CHORDS[ambientChordIdx];
    const freq  = chord[ambientNoteIdx];

    // Slight humanisation on gain, but timing is steady (not random)
    const gainJitter = 0.85 + Math.random() * 0.3;
    const attackTime = 0.25;  // slower attack — more contemplative
    const decayTime  = 2.8;   // longer decay — notes hang in the air

    // Main voice: triangle wave for guzheng/guqin-like tone
    playNote(freq, 'triangle', 0.07 * gainJitter, attackTime, decayTime, dest);
    // Delay echo for spatial depth
    playNote(freq, 'triangle', 0.07 * 0.28,       attackTime, decayTime, delayFx.input);
    // Send to convolver reverb for lush tail
    if (reverb) playNote(freq, 'sine', 0.04 * gainJitter, attackTime, decayTime * 0.6, reverb);

    // Octave-up sine voice for shimmer — guqin harmonic overtone
    playNote(freq * 2, 'sine', 0.07 * gainJitter * 0.22, attackTime, decayTime * 0.85, dest);
    // Perfect fifth harmonic (very soft) — adds traditional color
    playNote(freq * 1.5, 'sine', 0.07 * gainJitter * 0.10, attackTime + 0.1, decayTime * 0.7, dest);

    // Add soft low root note on the first note of each chord — like a guzheng bass string
    if (ambientNoteIdx === 0) {
      playNote(freq * 0.5, 'sine', 0.07 * 0.4, attackTime + 0.05, decayTime * 1.5, dest);
      if (reverb) playNote(freq * 0.5, 'sine', 0.03, attackTime + 0.1, decayTime * 1.0, reverb);
    }

    ambientNoteIdx++;
    if (ambientNoteIdx >= chord.length) {
      ambientNoteIdx  = 0;
      ambientChordIdx = (ambientChordIdx + 1) % AMBIENT_CHORDS.length;
    }

    // Slower tempo — 900ms per note (~67 BPM) for more contemplative feel
    musicLoopHandle = setTimeout(scheduleAmbientNote, 900);
  }

  musicLoopHandle = setTimeout(scheduleAmbientNote, 300);
}

function stopAmbientLoop() {
  if (musicLoopHandle) {
    clearTimeout(musicLoopHandle);
    musicLoopHandle = null;
  }
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
  audioCtx.resume();

  // Master SFX gain — controls volume of all sound effects
  masterSfxGain = audioCtx.createGain();
  masterSfxGain.gain.value = 0.35; // SFX much softer than before
  masterSfxGain.connect(audioCtx.destination);

  // Master stinger gain — musical stingers (victory, battle start)
  masterStingerGain = audioCtx.createGain();
  masterStingerGain.gain.value = 0.4;
  masterStingerGain.connect(audioCtx.destination);

  // Master gain for all music — kept below SFX headroom
  masterMusicGain = audioCtx.createGain();
  masterMusicGain.gain.value = 0.22; // Music volume — reduced, less overwhelming
  masterMusicGain.connect(audioCtx.destination);

  // Feedback delay for reverb-like spatial depth
  const reverbDelay = audioCtx.createDelay(1.0);
  reverbDelay.delayTime.value = 0.15;
  const reverbFeedback = audioCtx.createGain();
  reverbFeedback.gain.value = 0.2;
  const reverbWet = audioCtx.createGain();
  reverbWet.gain.value = 0.15;

  masterMusicGain.connect(reverbDelay);
  reverbDelay.connect(reverbFeedback);
  reverbFeedback.connect(reverbDelay);
  reverbDelay.connect(reverbWet);
  reverbWet.connect(audioCtx.destination);
}

export function playMusic(era) {
  if (!musicEnabled) { stopMusic(); return; }

  const newEra = era || 'menu';
  const trackKey = getMusicTrackForState(newEra, 0);

  // If the same track is already playing, just update era — don't restart
  if (trackKey === currentTrackKey && currentHowl?.playing()) {
    currentEra = newEra;
    currentIntensity = 0;
    return;
  }

  stopMusic();
  currentEra       = newEra;
  currentIntensity = 0;
  playMusicTrack(trackKey);
}

export function stopMusic() {
  stopMusicTrack(); // Stop MP3 track
  stopAmbientLoop();
  stopScheduler();

  for (const node of currentMusicNodes) {
    try {
      node.stop      && node.stop();
      node.disconnect && node.disconnect();
    } catch (_) {}
  }
  currentMusicNodes = [];
  layerGains        = {};
  activeLayerNodes  = {};
  currentStep       = 0;
}

// ─── setMusicIntensity — 0–3, switches MP3 track accordingly ─────────────────
export function setMusicIntensity(level) {
  const clamped = Math.max(0, Math.min(3, Math.floor(level)));
  if (clamped === currentIntensity) return;

  const prev = currentIntensity;
  currentIntensity = clamped;

  // Switch MP3 track if intensity category changed — skip old procedural system
  if (musicEnabled) {
    const trackKey = getMusicTrackForState(currentEra, clamped);
    if (trackKey !== currentTrackKey) {
      playMusicTrack(trackKey);
    }
    return; // MP3 handles everything — don't run old procedural music below
  }

  const FADE = 0.5; // seconds for crossfade

  if (clamped === 0) {
    // Transitioning back to ambient — stop scheduler, fade out then restart ambient
    if (masterMusicGain) {
      const now = audioCtx.currentTime;
      masterMusicGain.gain.setValueAtTime(masterMusicGain.gain.value, now);
      masterMusicGain.gain.linearRampToValueAtTime(0.0, now + FADE * 0.5);
    }
    stopScheduler();
    setTimeout(() => {
      if (!musicEnabled || !audioCtx) return;
      if (currentIntensity !== 0) return;
      if (masterMusicGain) {
        const now = audioCtx.currentTime;
        masterMusicGain.gain.setValueAtTime(0.0, now);
        masterMusicGain.gain.linearRampToValueAtTime(0.55, now + FADE);
      }
      startAmbientLoop();
    }, FADE * 500);
  } else {
    if (prev === 0) {
      // Transitioning from ambient to battle — stop ambient, start look-ahead scheduler
      stopAmbientLoop();
      if (masterMusicGain) {
        const now = audioCtx.currentTime;
        masterMusicGain.gain.setValueAtTime(0.0, now);
        masterMusicGain.gain.linearRampToValueAtTime(0.55, now + FADE);
      }
      startScheduler();
    } else {
      // Battle intensity shift — scheduler keeps running, just change level
      if (masterMusicGain) {
        const now = audioCtx.currentTime;
        masterMusicGain.gain.setValueAtTime(masterMusicGain.gain.value, now);
        masterMusicGain.gain.linearRampToValueAtTime(0.35, now + 0.05);
        masterMusicGain.gain.linearRampToValueAtTime(0.55, now + 0.05 + FADE);
      }
    }
  }
}

// ─── playStinger — short dramatic musical bursts ──────────────────────────────
export function playStinger(type) {
  // Use MP3 stingers for victory/defeat (Howler — no audioCtx needed)
  if (type === 'victory' || type === 'boss_death') {
    ensureMusicTracks();
    if (MUSIC_TRACKS.victory) {
      stopMusicTrack();
      MUSIC_TRACKS.victory.once('end', () => {
        // Resume background music after stinger finishes
        if (musicEnabled) {
          const trackKey = getMusicTrackForState(currentEra, currentIntensity);
          playMusicTrack(trackKey);
        }
      });
      MUSIC_TRACKS.victory.play();
      return;
    }
  }
  if (type === 'defeat') {
    ensureMusicTracks();
    if (MUSIC_TRACKS.defeat) {
      stopMusicTrack();
      MUSIC_TRACKS.defeat.once('end', () => {
        if (musicEnabled) {
          const trackKey = getMusicTrackForState(currentEra, currentIntensity);
          playMusicTrack(trackKey);
        }
      });
      MUSIC_TRACKS.defeat.play();
      return;
    }
  }

  // Procedural stingers need audioCtx
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
      // ── Triumphant ascending pentatonic fanfare with cymbal crash + reverb tail ──
      const stDest = masterSfxGain || audioCtx.destination;
      const stReverb = getSharedReverb();

      // Phase 1: Rapid ascending pentatonic run (C4→D4→E4→G4→A4→C5→E5→G5)
      const fanfareNotes = [PENT_C4, PENT_D4, PENT_E4, PENT_G4, PENT_A4, PENT_C5, PENT_E5, PENT_G5];
      fanfareNotes.forEach((freq, i) => {
        const t = now + i * 0.08;
        // Sawtooth for brass-like fanfare tone
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const vol = 0.16 + i * 0.01;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(vol, t + 0.012);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (i === fanfareNotes.length - 1 ? 1.2 : 0.18));
        osc.connect(g); g.connect(stDest);
        osc.start(t); osc.stop(t + (i === fanfareNotes.length - 1 ? 1.3 : 0.22));
        // Send to reverb for tail
        if (stReverb && i >= 5) {
          const rg = audioCtx.createGain();
          rg.gain.value = 0.08;
          const rosc = audioCtx.createOscillator();
          rosc.type = 'triangle';
          rosc.frequency.value = freq;
          rosc.connect(rg); rg.connect(stReverb);
          rosc.start(t); rosc.stop(t + 0.25);
        }
      });

      // Phase 2: Cymbal crash at the peak
      const crashTime = now + fanfareNotes.length * 0.08;
      const crashBuf = makeNoiseBuffer(0.6);
      const crashSrc = audioCtx.createBufferSource();
      crashSrc.buffer = crashBuf;
      const crashHpf = audioCtx.createBiquadFilter();
      crashHpf.type = 'highpass';
      crashHpf.frequency.value = 7000;
      const crashGain = audioCtx.createGain();
      crashGain.gain.setValueAtTime(0.35, crashTime);
      crashGain.gain.exponentialRampToValueAtTime(0.0001, crashTime + 0.55);
      crashSrc.connect(crashHpf); crashHpf.connect(crashGain);
      crashGain.connect(stDest);
      if (stReverb) { const crg = audioCtx.createGain(); crg.gain.value = 0.15; crashGain.connect(crg); crg.connect(stReverb); }
      crashSrc.start(crashTime); crashSrc.stop(crashTime + 0.6);

      // Phase 3: Triumphant held chord swell (pentatonic: C4+E4+G4+C5+G5)
      const chordStart = now + 0.80;
      [PENT_C4, PENT_E4, PENT_G4, PENT_C5, PENT_G5].forEach((freq, i) => {
        // Main voice
        const osc1 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.value = freq;
        g1.gain.setValueAtTime(0, chordStart);
        g1.gain.linearRampToValueAtTime(0.12, chordStart + 0.15);
        g1.gain.setValueAtTime(0.12, chordStart + 2.5);
        g1.gain.exponentialRampToValueAtTime(0.0001, chordStart + 3.5);
        osc1.connect(g1); g1.connect(stDest);
        osc1.start(chordStart); osc1.stop(chordStart + 3.6);
        // Chorus copy for width
        const osc2 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.value = freq;
        osc2.detune.value = (i % 2 === 0) ? 6 : -6;
        g2.gain.setValueAtTime(0, chordStart);
        g2.gain.linearRampToValueAtTime(0.06, chordStart + 0.18);
        g2.gain.setValueAtTime(0.06, chordStart + 2.5);
        g2.gain.exponentialRampToValueAtTime(0.0001, chordStart + 3.5);
        osc2.connect(g2); g2.connect(stDest);
        osc2.start(chordStart); osc2.stop(chordStart + 3.6);
        // Reverb tail
        if (stReverb) {
          const rosc = audioCtx.createOscillator();
          const rg = audioCtx.createGain();
          rosc.type = 'sine'; rosc.frequency.value = freq;
          rg.gain.setValueAtTime(0, chordStart);
          rg.gain.linearRampToValueAtTime(0.06, chordStart + 0.2);
          rg.gain.setValueAtTime(0.06, chordStart + 2.0);
          rg.gain.exponentialRampToValueAtTime(0.0001, chordStart + 3.0);
          rosc.connect(rg); rg.connect(stReverb);
          rosc.start(chordStart); rosc.stop(chordStart + 3.1);
        }
      });

      // Kick impact at start of chord swell
      playKick(55, 0.50, stDest);
      break;
    }

    case 'boss_enter': {
      // Deep rumble → dramatic ascending scale → crash (~2s)
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

      // Ascending dramatic scale (0.4–1.5s) — minor scale for menace
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
        g.connect(masterSfxGain || audioCtx.destination);
        osc.start(t);
        osc.stop(t + 0.22);
      });

      // Crash noise burst at 1.8s
      setTimeout(() => {
        if (!audioCtx) return;
        playKick(45, 0.65, audioCtx.destination);
        playSnare(0.7, 0.55, audioCtx.destination);
        playHihat(true, 0.45, audioCtx.destination);
      }, 1800);
      break;
    }

    case 'boss_death': {
      // ── Deep impact + ascending golden pentatonic notes + choir-like pad ──
      const bdDest = masterSfxGain || audioCtx.destination;
      const bdReverb = getSharedReverb();

      // Phase 1: Deep sub-bass impact (30Hz → 20Hz)
      const impactOsc = audioCtx.createOscillator();
      const impactGain = audioCtx.createGain();
      impactOsc.type = 'sine';
      impactOsc.frequency.setValueAtTime(30, now);
      impactOsc.frequency.exponentialRampToValueAtTime(20, now + 0.4);
      impactGain.gain.setValueAtTime(0.65, now);
      impactGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.5);
      impactOsc.connect(impactGain); impactGain.connect(bdDest);
      impactOsc.start(now); impactOsc.stop(now + 0.55);

      // Noise burst impact layer
      const impNoise = audioCtx.createBufferSource();
      impNoise.buffer = makeNoiseBuffer(0.15);
      const impLpf = audioCtx.createBiquadFilter();
      impLpf.type = 'lowpass'; impLpf.frequency.value = 400;
      const impNG = audioCtx.createGain();
      impNG.gain.setValueAtTime(0.45, now);
      impNG.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      impNoise.connect(impLpf); impLpf.connect(impNG); impNG.connect(bdDest);
      impNoise.start(now); impNoise.stop(now + 0.16);

      // Phase 2: Ascending golden pentatonic notes (0.3s – 1.5s)
      const goldenNotes = [PENT_C4, PENT_E4, PENT_G4, PENT_A4, PENT_C5, PENT_D5, PENT_E5, PENT_G5, PENT_A5];
      goldenNotes.forEach((freq, i) => {
        const t = now + 0.3 + i * 0.12;
        // FM notes for golden shimmer
        playFMNote(freq, freq * 2.01, 0.6 + i * 0.1, 0.18 + i * 0.01, 0.008, 0.35, 'sine', bdDest, t);
        // Send higher notes to reverb
        if (bdReverb && i >= 4) {
          const rOsc = audioCtx.createOscillator();
          const rG = audioCtx.createGain();
          rOsc.type = 'sine'; rOsc.frequency.value = freq;
          rG.gain.setValueAtTime(0, t);
          rG.gain.linearRampToValueAtTime(0.06, t + 0.02);
          rG.gain.exponentialRampToValueAtTime(0.0001, t + 0.5);
          rOsc.connect(rG); rG.connect(bdReverb);
          rOsc.start(t); rOsc.stop(t + 0.55);
        }
      });

      // Phase 3: Choir-like pad (sustained pentatonic chord C4+E4+G4+C5 with slow attack)
      const choirStart = now + 1.2;
      [PENT_C4, PENT_E4, PENT_G4, PENT_C5].forEach((freq, i) => {
        // Three detuned voices per note for choir effect
        [-7, 0, 7].forEach(detune => {
          const osc = audioCtx.createOscillator();
          const g = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.value = freq;
          osc.detune.value = detune;
          g.gain.setValueAtTime(0, choirStart);
          g.gain.linearRampToValueAtTime(0.08, choirStart + 0.5);
          g.gain.setValueAtTime(0.08, choirStart + 2.5);
          g.gain.exponentialRampToValueAtTime(0.0001, choirStart + 3.5);
          osc.connect(g); g.connect(bdDest);
          osc.start(choirStart); osc.stop(choirStart + 3.6);
        });
        // Reverb tail for choir
        if (bdReverb) {
          const rOsc = audioCtx.createOscillator();
          const rG = audioCtx.createGain();
          rOsc.type = 'sine'; rOsc.frequency.value = freq;
          rG.gain.setValueAtTime(0, choirStart);
          rG.gain.linearRampToValueAtTime(0.05, choirStart + 0.6);
          rG.gain.setValueAtTime(0.05, choirStart + 2.0);
          rG.gain.exponentialRampToValueAtTime(0.0001, choirStart + 3.0);
          rOsc.connect(rG); rG.connect(bdReverb);
          rOsc.start(choirStart); rOsc.stop(choirStart + 3.1);
        }
      });

      // Final cymbal shimmer
      const bdCrashTime = now + 1.5;
      const bdCrashSrc = audioCtx.createBufferSource();
      bdCrashSrc.buffer = makeNoiseBuffer(0.8);
      const bdCrashHpf = audioCtx.createBiquadFilter();
      bdCrashHpf.type = 'highpass'; bdCrashHpf.frequency.value = 8000;
      const bdCrashG = audioCtx.createGain();
      bdCrashG.gain.setValueAtTime(0.20, bdCrashTime);
      bdCrashG.gain.exponentialRampToValueAtTime(0.0001, bdCrashTime + 0.7);
      bdCrashSrc.connect(bdCrashHpf); bdCrashHpf.connect(bdCrashG); bdCrashG.connect(bdDest);
      bdCrashSrc.start(bdCrashTime); bdCrashSrc.stop(bdCrashTime + 0.75);
      break;
    }

    case 'phase_change': {
      // Dissonant chord stab → resolve to new key (500ms)
      const stabFreqs = [261.63, 369.99, 440.00]; // C, F#, A — dissonant
      stabFreqs.forEach((freq) => {
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.22, now);
        g.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
        osc.connect(g);
        g.connect(masterSfxGain || audioCtx.destination);
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
        g.connect(masterSfxGain || audioCtx.destination);
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

// ─── FM Synthesis helper ──────────────────────────────────────────────────────
function playFMNote(carrierFreq, modFreq, modIndex, gainPeak, attackTime, decayTime, waveType, dest, startTime) {
  const now = startTime || audioCtx.currentTime;

  // Modulator
  const mod = audioCtx.createOscillator();
  const modGain = audioCtx.createGain();
  mod.frequency.value = modFreq;
  modGain.gain.value = modIndex * modFreq; // FM depth
  mod.connect(modGain);

  // Carrier
  const car = audioCtx.createOscillator();
  car.type = waveType || 'sine';
  car.frequency.value = carrierFreq;
  modGain.connect(car.frequency); // FM connection

  // Envelope
  const env = audioCtx.createGain();
  env.gain.setValueAtTime(0, now);
  env.gain.linearRampToValueAtTime(gainPeak, now + attackTime);
  env.gain.exponentialRampToValueAtTime(0.001, now + attackTime + decayTime);

  car.connect(env);
  env.connect(dest);

  mod.start(now);
  car.start(now);
  mod.stop(now + attackTime + decayTime + 0.05);
  car.stop(now + attackTime + decayTime + 0.05);
}

// ─── WaveShaper distortion helper ────────────────────────────────────────────
function createDistortion(amount) {
  const ws = audioCtx.createWaveShaper();
  const samples = 44100;
  const curve = new Float32Array(samples);
  for (let i = 0; i < samples; i++) {
    const x = (i * 2) / samples - 1;
    curve[i] = ((3 + amount) * x * 20 * (Math.PI / 180)) / (Math.PI + amount * Math.abs(x));
  }
  ws.curve = curve;
  ws.oversample = '4x';
  return ws;
}

// ─── SFX — professional jsfxr-style sounds ───────────────────────────────────

export function playSound(type) {
  if (!audioCtx || !sfxEnabled) return;

  const now = audioCtx.currentTime;
  const dest = masterSfxGain || audioCtx.destination;

  switch (type) {

    case 'correct': {
      // Bright ascending pentatonic arpeggio C5→E5→G5→A5 with FM shimmer + harmonic overtones + reverb
      const arpFreqs = [PENT_C5, PENT_E5, PENT_G5, PENT_A5];
      const cReverb = getSharedReverb();
      arpFreqs.forEach((freq, i) => {
        const t = now + i * 0.075;  // slightly faster for punchier feel
        // FM note: increasing modIndex for brighter shimmer as notes ascend
        playFMNote(freq, freq * 2.01, 0.5 + i * 0.18, 0.24, 0.006, 0.30, 'sine', dest, t);
        // Harmonic overtone: octave + fifth (3x freq) — very soft, adds brilliance
        const ovtOsc = audioCtx.createOscillator();
        const ovtG = audioCtx.createGain();
        ovtOsc.type = 'sine';
        ovtOsc.frequency.value = freq * 3;  // 3rd harmonic — adds bell-like shimmer
        ovtG.gain.setValueAtTime(0, t);
        ovtG.gain.linearRampToValueAtTime(0.04 + i * 0.01, t + 0.008);
        ovtG.gain.exponentialRampToValueAtTime(0.0001, t + 0.20);
        ovtOsc.connect(ovtG); ovtG.connect(dest);
        ovtOsc.start(t); ovtOsc.stop(t + 0.22);
      });
      // Convolver reverb tail on the peak note for satisfying ring-out
      if (cReverb) {
        const tailOsc = audioCtx.createOscillator();
        const tailG = audioCtx.createGain();
        tailOsc.type = 'sine';
        tailOsc.frequency.value = PENT_A5;
        tailG.gain.setValueAtTime(0, now + 0.22);
        tailG.gain.linearRampToValueAtTime(0.08, now + 0.26);
        tailG.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);
        tailOsc.connect(tailG); tailG.connect(cReverb);
        tailOsc.start(now + 0.22); tailOsc.stop(now + 0.68);
      }
      // Delay-based tail echo for spatial depth
      const tailDelay = audioCtx.createDelay(0.5);
      tailDelay.delayTime.value = 0.15;
      const tailGain = audioCtx.createGain();
      tailGain.gain.setValueAtTime(0, now + 0.30);
      tailGain.gain.linearRampToValueAtTime(0.05, now + 0.34);
      tailGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.70);
      const tailOsc2 = audioCtx.createOscillator();
      tailOsc2.type = 'sine';
      tailOsc2.frequency.value = PENT_G5;
      tailOsc2.connect(tailGain);
      tailGain.connect(dest);
      tailOsc2.start(now + 0.30);
      tailOsc2.stop(now + 0.73);
      break;
    }

    case 'wrong': {
      // Descending buzzy horn: sawtooth + resonant bandpass sweep 2000→200Hz
      // Noise burst transient at the start for impact
      const noiseBuf = makeNoiseBuffer(0.04);
      const noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = noiseBuf;
      const noiseHpf = audioCtx.createBiquadFilter();
      noiseHpf.type = 'bandpass';
      noiseHpf.frequency.value = 1200;
      noiseHpf.Q.value = 1.0;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.35, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.04);
      noiseSrc.connect(noiseHpf);
      noiseHpf.connect(noiseGain);
      noiseGain.connect(dest);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.05);

      // Sawtooth horn with bandpass sweep
      const osc = audioCtx.createOscillator();
      const bpf = audioCtx.createBiquadFilter();
      const g = audioCtx.createGain();
      osc.type = 'sawtooth';
      osc.frequency.setValueAtTime(240, now);
      osc.frequency.exponentialRampToValueAtTime(110, now + 0.38);
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(2000, now);
      bpf.frequency.exponentialRampToValueAtTime(200, now + 0.38);
      bpf.Q.value = 3.5;
      g.gain.setValueAtTime(0.0, now);
      g.gain.linearRampToValueAtTime(0.32, now + 0.012);
      g.gain.exponentialRampToValueAtTime(0.0001, now + 0.42);
      osc.connect(bpf);
      bpf.connect(g);
      g.connect(dest);
      osc.start(now);
      osc.stop(now + 0.45);
      break;
    }

    case 'attack': {
      // White noise burst through sweeping bandpass 8000→400Hz in 150ms
      const atkBufLen = Math.ceil(audioCtx.sampleRate * 0.22);
      const atkBuf = audioCtx.createBuffer(1, atkBufLen, audioCtx.sampleRate);
      const atkData = atkBuf.getChannelData(0);
      for (let i = 0; i < atkBufLen; i++) atkData[i] = Math.random() * 2 - 1;
      const noiseSrc = audioCtx.createBufferSource();
      noiseSrc.buffer = atkBuf;
      const bpf = audioCtx.createBiquadFilter();
      bpf.type = 'bandpass';
      bpf.frequency.setValueAtTime(8000, now);
      bpf.frequency.exponentialRampToValueAtTime(400, now + 0.15);
      bpf.Q.value = 1.8;
      const noiseGain = audioCtx.createGain();
      noiseGain.gain.setValueAtTime(0.38, now);
      noiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.20);
      noiseSrc.connect(bpf);
      bpf.connect(noiseGain);
      noiseGain.connect(dest);
      noiseSrc.start(now);
      noiseSrc.stop(now + 0.22);

      // Sine whoosh 800→200Hz layered under noise for body
      const whoosh = audioCtx.createOscillator();
      const wg = audioCtx.createGain();
      whoosh.type = 'sine';
      whoosh.frequency.setValueAtTime(800, now);
      whoosh.frequency.exponentialRampToValueAtTime(200, now + 0.15);
      wg.gain.setValueAtTime(0.0, now);
      wg.gain.linearRampToValueAtTime(0.22, now + 0.01);
      wg.gain.exponentialRampToValueAtTime(0.0001, now + 0.18);
      whoosh.connect(wg);
      wg.connect(dest);
      whoosh.start(now);
      whoosh.stop(now + 0.20);
      break;
    }

    case 'hit': {
      // Low-frequency thud: 60Hz→30Hz pitch drop
      const thud = audioCtx.createOscillator();
      const thudGain = audioCtx.createGain();
      thud.type = 'sine';
      thud.frequency.setValueAtTime(60, now);
      thud.frequency.exponentialRampToValueAtTime(30, now + 0.12);
      thudGain.gain.setValueAtTime(0.55, now);
      thudGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.16);
      thud.connect(thudGain);
      thudGain.connect(dest);
      thud.start(now);
      thud.stop(now + 0.18);

      // Noise burst through lowpass for texture
      const hitBuf = makeNoiseBuffer(0.12);
      const hitNoise = audioCtx.createBufferSource();
      hitNoise.buffer = hitBuf;
      const lpf = audioCtx.createBiquadFilter();
      lpf.type = 'lowpass';
      lpf.frequency.setValueAtTime(2500, now);
      lpf.frequency.exponentialRampToValueAtTime(200, now + 0.10);
      const hitNoiseGain = audioCtx.createGain();
      hitNoiseGain.gain.setValueAtTime(0.40, now);
      hitNoiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.12);
      hitNoise.connect(lpf);
      lpf.connect(hitNoiseGain);
      hitNoiseGain.connect(dest);
      hitNoise.start(now);
      hitNoise.stop(now + 0.13);

      // Click transient: very short 2000Hz sine burst, 5ms
      const click = audioCtx.createOscillator();
      const clickGain = audioCtx.createGain();
      click.type = 'sine';
      click.frequency.value = 2000;
      clickGain.gain.setValueAtTime(0.30, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.005);
      click.connect(clickGain);
      clickGain.connect(dest);
      click.start(now);
      click.stop(now + 0.007);
      break;
    }

    case 'levelup': {
      // Bright ascending major scale arpeggio C4→E4→G4→C5→E5→G5 with FM
      // Each note 80ms, increasing brightness (modulation index)
      const lvlFreqs = [C4, E4, G4, C5, E5, G5];
      lvlFreqs.forEach((freq, i) => {
        const t = now + i * 0.08;
        const modIdx = 0.3 + i * 0.18; // increasing modulation = brighter
        playFMNote(freq, freq * 1.995, modIdx, 0.20, 0.006, 0.22, 'sine', dest, t);
      });
      // Sustained shimmer chord at the end: C5+E5+G5 with slight detune
      const chordStart = now + lvlFreqs.length * 0.08 + 0.02;
      [C5, E5, G5].forEach((freq, i) => {
        const detunes = [-4, 0, 4];
        playFMNote(freq * Math.pow(2, detunes[i] / 1200), freq * 2, 0.8, 0.12, 0.08, 0.60, 'sine', dest, chordStart);
      });
      break;
    }

    case 'boss_roar': {
      // Deep sub-bass rumble 30-50Hz with heavy vibrato + waveshaper distortion
      const distortion = createDistortion(180);
      distortion.connect(dest);

      const roarOsc = audioCtx.createOscillator();
      const vibOsc = audioCtx.createOscillator();
      const vibGain = audioCtx.createGain();
      const roarGain = audioCtx.createGain();
      roarOsc.type = 'sawtooth';
      roarOsc.frequency.setValueAtTime(38, now);
      roarOsc.frequency.linearRampToValueAtTime(50, now + 0.4);
      roarOsc.frequency.linearRampToValueAtTime(32, now + 1.1);
      vibOsc.frequency.value = 7;
      vibGain.gain.value = 12;
      vibOsc.connect(vibGain);
      vibGain.connect(roarOsc.frequency);
      roarGain.gain.setValueAtTime(0, now);
      roarGain.gain.linearRampToValueAtTime(0.60, now + 0.12);
      roarGain.gain.setValueAtTime(0.60, now + 0.9);
      roarGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      roarOsc.connect(roarGain);
      roarGain.connect(distortion);
      vibOsc.start(now); vibOsc.stop(now + 1.55);
      roarOsc.start(now); roarOsc.stop(now + 1.55);

      // Filtered noise "wind" layer
      const windBuf = makeNoiseBuffer(1.5);
      const windSrc = audioCtx.createBufferSource();
      windSrc.buffer = windBuf;
      const windBpf = audioCtx.createBiquadFilter();
      windBpf.type = 'bandpass';
      windBpf.frequency.setValueAtTime(120, now);
      windBpf.frequency.linearRampToValueAtTime(600, now + 0.6);
      windBpf.frequency.exponentialRampToValueAtTime(80, now + 1.5);
      windBpf.Q.value = 2.0;
      const windGain = audioCtx.createGain();
      windGain.gain.setValueAtTime(0, now);
      windGain.gain.linearRampToValueAtTime(0.35, now + 0.15);
      windGain.gain.setValueAtTime(0.35, now + 0.9);
      windGain.gain.exponentialRampToValueAtTime(0.0001, now + 1.5);
      windSrc.connect(windBpf);
      windBpf.connect(windGain);
      windGain.connect(dest);
      windSrc.start(now);
      windSrc.stop(now + 1.55);
      break;
    }

    case 'click': {
      // Short crisp transient: 3ms sine at 1200Hz + 3ms noise burst through highpass
      const clickOsc = audioCtx.createOscillator();
      const clickGain = audioCtx.createGain();
      clickOsc.type = 'sine';
      clickOsc.frequency.value = 1200;
      clickGain.gain.setValueAtTime(0.25, now);
      clickGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.003);
      clickOsc.connect(clickGain);
      clickGain.connect(dest);
      clickOsc.start(now);
      clickOsc.stop(now + 0.005);

      const cNoiseBuf = makeNoiseBuffer(0.006);
      const cNoiseSrc = audioCtx.createBufferSource();
      cNoiseSrc.buffer = cNoiseBuf;
      const cHpf = audioCtx.createBiquadFilter();
      cHpf.type = 'highpass';
      cHpf.frequency.value = 5000;
      const cNoiseGain = audioCtx.createGain();
      cNoiseGain.gain.setValueAtTime(0.20, now);
      cNoiseGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.003);
      cNoiseSrc.connect(cHpf);
      cHpf.connect(cNoiseGain);
      cNoiseGain.connect(dest);
      cNoiseSrc.start(now);
      cNoiseSrc.stop(now + 0.007);
      break;
    }

    case 'victory': {
      // C major chord C4,E4,G4,C5 — slow attack swell 300ms, 3s sustain, chorus effect
      const victFreqs = [C4, E4, G4, C5]; // 261.63, 329.63, 392.00, 523.25
      victFreqs.forEach((freq) => {
        // Main voice
        const osc1 = audioCtx.createOscillator();
        const g1 = audioCtx.createGain();
        osc1.type = 'triangle';
        osc1.frequency.value = freq;
        g1.gain.setValueAtTime(0, now);
        g1.gain.linearRampToValueAtTime(0.14, now + 0.30);
        g1.gain.setValueAtTime(0.14, now + 2.7);
        g1.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
        osc1.connect(g1); g1.connect(dest);
        osc1.start(now); osc1.stop(now + 3.25);

        // Chorus copy +5 cents
        const osc2 = audioCtx.createOscillator();
        const g2 = audioCtx.createGain();
        osc2.type = 'triangle';
        osc2.frequency.value = freq;
        osc2.detune.value = 5;
        g2.gain.setValueAtTime(0, now);
        g2.gain.linearRampToValueAtTime(0.07, now + 0.32);
        g2.gain.setValueAtTime(0.07, now + 2.7);
        g2.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
        osc2.connect(g2); g2.connect(dest);
        osc2.start(now); osc2.stop(now + 3.25);

        // Chorus copy -5 cents
        const osc3 = audioCtx.createOscillator();
        const g3 = audioCtx.createGain();
        osc3.type = 'triangle';
        osc3.frequency.value = freq;
        osc3.detune.value = -5;
        g3.gain.setValueAtTime(0, now);
        g3.gain.linearRampToValueAtTime(0.07, now + 0.32);
        g3.gain.setValueAtTime(0.07, now + 2.7);
        g3.gain.exponentialRampToValueAtTime(0.0001, now + 3.2);
        osc3.connect(g3); g3.connect(dest);
        osc3.start(now); osc3.stop(now + 3.25);
      });
      break;
    }

    case 'text': {
      // Extremely short 3ms soft high-pitched tap; randomize pitch 1500-2500Hz
      const textFreq = 1500 + Math.random() * 1000;
      const tOsc = audioCtx.createOscillator();
      const tGain = audioCtx.createGain();
      tOsc.type = 'sine';
      tOsc.frequency.value = textFreq;
      tGain.gain.setValueAtTime(0.04, now);
      tGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.003);
      tOsc.connect(tGain);
      tGain.connect(dest);
      tOsc.start(now);
      tOsc.stop(now + 0.005);
      break;
    }

    case 'crit': {
      // Sharp metallic ring + rising pitch — critical hit indicator
      // Metallic FM ring at 1200Hz
      playFMNote(1200, 1200 * 3.01, 2.5, 0.30, 0.005, 0.18, 'sine', dest, now);
      // Rising pitch sweep 800→2400Hz in 200ms
      const critOsc = audioCtx.createOscillator();
      const critGain = audioCtx.createGain();
      critOsc.type = 'square';
      critOsc.frequency.setValueAtTime(800, now);
      critOsc.frequency.exponentialRampToValueAtTime(2400, now + 0.20);
      critGain.gain.setValueAtTime(0.0, now);
      critGain.gain.linearRampToValueAtTime(0.22, now + 0.01);
      critGain.gain.exponentialRampToValueAtTime(0.0001, now + 0.25);
      critOsc.connect(critGain);
      critGain.connect(dest);
      critOsc.start(now);
      critOsc.stop(now + 0.28);
      // Bright noise transient for impact
      const critNoise = audioCtx.createBufferSource();
      critNoise.buffer = makeNoiseBuffer(0.05);
      const critHpf = audioCtx.createBiquadFilter();
      critHpf.type = 'highpass';
      critHpf.frequency.value = 6000;
      const critNG = audioCtx.createGain();
      critNG.gain.setValueAtTime(0.28, now);
      critNG.gain.exponentialRampToValueAtTime(0.0001, now + 0.05);
      critNoise.connect(critHpf);
      critHpf.connect(critNG);
      critNG.connect(dest);
      critNoise.start(now);
      critNoise.stop(now + 0.06);
      break;
    }

    case 'combo': {
      // Quick ascending notes C5→E5→G5→C6 in rapid succession (combo increment)
      const comboFreqs = [523.25, 659.26, 783.99, 1046.50];
      comboFreqs.forEach((freq, i) => {
        const t = now + i * 0.05;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0, t);
        g.gain.linearRampToValueAtTime(0.18, t + 0.006);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.10);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.12);
      });
      break;
    }

    case 'enemy_death': {
      // Quick descending glissando + low impact thud — enemy defeated
      const edDest = dest;
      // Descending glissando: rapid pentatonic run down G5→E5→D5→C5→A4→G4→E4→C4
      const glissFreqs = [PENT_G5, PENT_E5, PENT_D5, PENT_C5, PENT_A4, PENT_G4, PENT_E4, PENT_C4];
      glissFreqs.forEach((freq, i) => {
        const t = now + i * 0.04;  // very fast — 40ms per note
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.value = freq;
        const vol = 0.18 - i * 0.015;
        g.gain.setValueAtTime(0, t);
        g.gain.linearRampToValueAtTime(Math.max(0.04, vol), t + 0.005);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.08);
        osc.connect(g); g.connect(edDest);
        osc.start(t); osc.stop(t + 0.10);
      });
      // Low impact thud at the bottom of the glissando
      const impactTime = now + glissFreqs.length * 0.04;
      const impOsc = audioCtx.createOscillator();
      const impG = audioCtx.createGain();
      impOsc.type = 'sine';
      impOsc.frequency.setValueAtTime(80, impactTime);
      impOsc.frequency.exponentialRampToValueAtTime(30, impactTime + 0.12);
      impG.gain.setValueAtTime(0.50, impactTime);
      impG.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.20);
      impOsc.connect(impG); impG.connect(edDest);
      impOsc.start(impactTime); impOsc.stop(impactTime + 0.22);
      // Noise burst on impact
      const edNoise = audioCtx.createBufferSource();
      edNoise.buffer = makeNoiseBuffer(0.10);
      const edLpf = audioCtx.createBiquadFilter();
      edLpf.type = 'lowpass'; edLpf.frequency.value = 1500;
      const edNG = audioCtx.createGain();
      edNG.gain.setValueAtTime(0.35, impactTime);
      edNG.gain.exponentialRampToValueAtTime(0.0001, impactTime + 0.10);
      edNoise.connect(edLpf); edLpf.connect(edNG); edNG.connect(edDest);
      edNoise.start(impactTime); edNoise.stop(impactTime + 0.12);
      break;
    }

    case 'talent': {
      // Magical chime — two detuned sine tones + FM shimmer, bell-like decay
      const chimeFreqs = [880, 1318.51]; // A5, E6
      chimeFreqs.forEach((freq, i) => {
        const t = now + i * 0.08;
        playFMNote(freq, freq * 2.5, 1.2, 0.20, 0.01, 0.40, 'sine', dest, t);
        // Detuned chorus layer
        const chorusOsc = audioCtx.createOscillator();
        const chorusG = audioCtx.createGain();
        chorusOsc.type = 'sine';
        chorusOsc.frequency.value = freq;
        chorusOsc.detune.value = 8;
        chorusG.gain.setValueAtTime(0.0, t);
        chorusG.gain.linearRampToValueAtTime(0.10, t + 0.01);
        chorusG.gain.exponentialRampToValueAtTime(0.0001, t + 0.45);
        chorusOsc.connect(chorusG);
        chorusG.connect(dest);
        chorusOsc.start(t);
        chorusOsc.stop(t + 0.48);
      });
      break;
    }

    case 'gold': {
      // Coin jingle — two quick high metallic taps, then a bright ring
      const goldTaps = [2200, 2600, 3100];
      goldTaps.forEach((freq, i) => {
        const t = now + i * 0.06;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0, t);
        g.gain.linearRampToValueAtTime(0.22, t + 0.003);
        g.gain.exponentialRampToValueAtTime(0.0001, t + 0.12);
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + 0.14);
      });
      // Bright ring tail
      playFMNote(3100, 3100 * 1.5, 0.8, 0.12, 0.005, 0.25, 'sine', dest, now + 0.18);
      break;
    }

    case 'forge': {
      // Anvil strike + sparkle — low metallic clang then high shimmer
      // Anvil: low square wave burst through bandpass
      const anvilOsc = audioCtx.createOscillator();
      const anvilBpf = audioCtx.createBiquadFilter();
      const anvilG = audioCtx.createGain();
      anvilOsc.type = 'square';
      anvilOsc.frequency.setValueAtTime(180, now);
      anvilOsc.frequency.exponentialRampToValueAtTime(90, now + 0.08);
      anvilBpf.type = 'bandpass';
      anvilBpf.frequency.value = 800;
      anvilBpf.Q.value = 4.0;
      anvilG.gain.setValueAtTime(0.35, now);
      anvilG.gain.exponentialRampToValueAtTime(0.0001, now + 0.15);
      anvilOsc.connect(anvilBpf);
      anvilBpf.connect(anvilG);
      anvilG.connect(dest);
      anvilOsc.start(now);
      anvilOsc.stop(now + 0.18);
      // Noise impact
      const forgeNoise = audioCtx.createBufferSource();
      forgeNoise.buffer = makeNoiseBuffer(0.06);
      const forgeLpf = audioCtx.createBiquadFilter();
      forgeLpf.type = 'lowpass';
      forgeLpf.frequency.value = 3000;
      const forgeNG = audioCtx.createGain();
      forgeNG.gain.setValueAtTime(0.30, now);
      forgeNG.gain.exponentialRampToValueAtTime(0.0001, now + 0.06);
      forgeNoise.connect(forgeLpf);
      forgeLpf.connect(forgeNG);
      forgeNG.connect(dest);
      forgeNoise.start(now);
      forgeNoise.stop(now + 0.07);
      // Sparkle: high FM chime after the strike
      playFMNote(1800, 1800 * 3.0, 1.5, 0.12, 0.008, 0.30, 'sine', dest, now + 0.12);
      break;
    }

    case 'daily': {
      // Cheerful fanfare — ascending major triad + bright resolve note
      const dailyNotes = [523.25, 659.26, 783.99, 1046.50]; // C5 E5 G5 C6
      dailyNotes.forEach((freq, i) => {
        const t = now + i * 0.10;
        const osc = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.value = freq;
        g.gain.setValueAtTime(0.0, t);
        g.gain.linearRampToValueAtTime(0.20, t + 0.008);
        g.gain.exponentialRampToValueAtTime(0.0001, t + (i === 3 ? 0.40 : 0.18));
        osc.connect(g);
        g.connect(dest);
        osc.start(t);
        osc.stop(t + (i === 3 ? 0.42 : 0.20));
      });
      break;
    }

    case 'tutorial': {
      // Soft bell tone — gentle sine with slow attack and warm decay
      const bellOsc = audioCtx.createOscillator();
      const bellG = audioCtx.createGain();
      bellOsc.type = 'sine';
      bellOsc.frequency.value = 880; // A5
      bellG.gain.setValueAtTime(0.0, now);
      bellG.gain.linearRampToValueAtTime(0.15, now + 0.04);
      bellG.gain.exponentialRampToValueAtTime(0.0001, now + 0.40);
      bellOsc.connect(bellG);
      bellG.connect(dest);
      bellOsc.start(now);
      bellOsc.stop(now + 0.42);
      // Soft harmonic overtone
      const bellOvt = audioCtx.createOscillator();
      const bellOvtG = audioCtx.createGain();
      bellOvt.type = 'sine';
      bellOvt.frequency.value = 1760; // A6 (octave above)
      bellOvtG.gain.setValueAtTime(0.0, now);
      bellOvtG.gain.linearRampToValueAtTime(0.06, now + 0.04);
      bellOvtG.gain.exponentialRampToValueAtTime(0.0001, now + 0.35);
      bellOvt.connect(bellOvtG);
      bellOvtG.connect(dest);
      bellOvt.start(now);
      bellOvt.stop(now + 0.38);
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
  } else {
    // Resume with contextually appropriate track (not always 'menu')
    playMusic(currentEra || 'menu');
    if (currentIntensity > 0) {
      const trackKey = getMusicTrackForState(currentEra, currentIntensity);
      playMusicTrack(trackKey);
    }
  }
  return musicEnabled;
}

export function toggleSFX() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

export function isMusicEnabled() { return musicEnabled; }
export function isSFXEnabled()   { return sfxEnabled; }

// ─── Volume control (persisted to localStorage) ──────────────────────────────
const VOL_KEY = 'wenzi-xia-audio';

function _loadVolumes() {
  try {
    const raw = localStorage.getItem(VOL_KEY);
    return raw ? JSON.parse(raw) : { music: 0.65, sfx: 0.35 };
  } catch { return { music: 0.65, sfx: 0.35 }; }
}
function _saveVolumes(v) {
  localStorage.setItem(VOL_KEY, JSON.stringify(v));
}

/** Get current music volume (0-1) */
export function getMusicVolume() {
  return _loadVolumes().music;
}
/** Get current SFX volume (0-1) */
export function getSfxVolume() {
  return _loadVolumes().sfx;
}
/** Set music volume (0-1 range), persists to localStorage and applies immediately */
export function setMusicVolume(vol) {
  const clamped = Math.max(0, Math.min(1, vol));
  const v = _loadVolumes();
  v.music = clamped;
  _saveVolumes(v);
  if (masterMusicGain) masterMusicGain.gain.value = clamped;
  // Also adjust Howler MP3 track volume
  if (currentHowl) currentHowl.volume(clamped);
}
/** Set SFX volume (0-1 range), persists to localStorage and applies immediately */
export function setSfxVolume(vol) {
  const clamped = Math.max(0, Math.min(1, vol));
  const v = _loadVolumes();
  v.sfx = clamped;
  _saveVolumes(v);
  if (masterSfxGain) masterSfxGain.gain.value = clamped;
  if (masterStingerGain) masterStingerGain.gain.value = clamped;
}
