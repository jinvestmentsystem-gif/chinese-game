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
// Am → C → G/B → Em — arpeggiated slowly, 75 BPM feel
const AMBIENT_CHORDS = [
  [220.00, 261.63, 329.63, 440.00],   // Am: A3 C4 E4 A4
  [261.63, 329.63, 392.00, 523.25],   // C:  C4 E4 G4 C5
  [246.94, 293.66, 392.00, 493.88],   // G/B: B3 D4 G4 B4
  [164.81, 196.00, 246.94, 329.63],   // Em: E3 G3 B3 E4
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

function playKickAt(time, gainPeak = 0.70) {
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

function playSnareAt(time, gainPeak = 0.50) {
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

function playHihatAt(time, open = false, gainPeak = 0.18) {
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
  const vol = 0.08;
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
    if (hhPattern[step]) playHihatAt(time, false, 0.18);
    // Open hi-hat on the upbeat (steps 2 & 10) at intensity 2+
    if (step === 2 || step === 10) playHihatAt(time, true, 0.10);
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

  function scheduleAmbientNote() {
    if (!musicEnabled || !audioCtx || currentIntensity !== 0) return;

    const chord = AMBIENT_CHORDS[ambientChordIdx];
    const freq  = chord[ambientNoteIdx];

    // Slight humanisation on gain, but timing is steady (not random)
    const gainJitter = 0.85 + Math.random() * 0.3;
    const attackTime = 0.18;
    const decayTime  = 2.0;

    playNote(freq, 'triangle', 0.08 * gainJitter, attackTime, decayTime, dest);
    playNote(freq, 'triangle', 0.08 * 0.28,       attackTime, decayTime, delayFx.input);

    // Octave-up sine voice for shimmer (25% of main volume)
    playNote(freq * 2, 'sine', 0.08 * gainJitter * 0.25, attackTime, decayTime * 0.85, dest);

    // Add soft low root note on the first note of each chord
    if (ambientNoteIdx === 0) {
      playNote(freq * 0.5, 'sine', 0.08 * 0.4, attackTime + 0.05, decayTime * 1.3, dest);
    }

    ambientNoteIdx++;
    if (ambientNoteIdx >= chord.length) {
      ambientNoteIdx  = 0;
      ambientChordIdx = (ambientChordIdx + 1) % AMBIENT_CHORDS.length;
    }

    // Steady 800ms per note — 75 BPM quarter-note arpeggio
    musicLoopHandle = setTimeout(scheduleAmbientNote, 800);
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
  masterMusicGain.gain.value = 0.55; // Music softer overall
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
  if (!audioCtx) return;

  stopMusic();

  if (!musicEnabled) return;

  currentEra       = era || 'menu';
  currentIntensity = 0;

  startAmbientLoop();
}

export function stopMusic() {
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

// ─── setMusicIntensity — 0–3, dynamically layers in/out ──────────────────────
export function setMusicIntensity(level) {
  if (!audioCtx) return;
  const clamped = Math.max(0, Math.min(3, Math.floor(level)));
  if (clamped === currentIntensity) return;

  const prev = currentIntensity;
  currentIntensity = clamped;

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
        masterMusicGain.gain.linearRampToValueAtTime(0.85, now + FADE);
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
        masterMusicGain.gain.linearRampToValueAtTime(0.85, now + FADE);
      }
      startScheduler();
    } else {
      // Battle intensity shift — scheduler keeps running, just change level
      if (masterMusicGain) {
        const now = audioCtx.currentTime;
        masterMusicGain.gain.setValueAtTime(masterMusicGain.gain.value, now);
        masterMusicGain.gain.linearRampToValueAtTime(0.50, now + 0.05);
        masterMusicGain.gain.linearRampToValueAtTime(0.85, now + 0.05 + FADE);
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
        g.connect(masterSfxGain || audioCtx.destination);
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
        g.connect(masterSfxGain || audioCtx.destination);
        osc.start(chordStart);
        osc.stop(chordStart + 3.6);
      });
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
        osc.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
      osc.connect(bpf); bpf.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
      noise.connect(bpf); bpf.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
      osc.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
        osc.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
      osc.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
      osc.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
      osc.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
        osc.connect(g); g.connect(masterSfxGain || audioCtx.destination);
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
    playMusic('menu');
  }
  return musicEnabled;
}

export function toggleSFX() {
  sfxEnabled = !sfxEnabled;
  return sfxEnabled;
}

export function isMusicEnabled() { return musicEnabled; }
export function isSFXEnabled()   { return sfxEnabled; }
