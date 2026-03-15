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
let beatClock = null;         // setInterval handle for the 375ms master tick
let beatStep = 0;             // 0–31 (two bars of 16 16th-notes each)
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
// Each era colours the drum/bass/melody layers differently
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

// ─── Drum patterns (16 steps per bar, index = step 0–15) ──────────────────────
// 1 = hit, 0 = rest
const PATTERNS = {
  kick:       [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],   // beats 1 and 3
  kick_boss:  [1,0,0,0, 0,0,1,0, 1,0,0,1, 0,0,0,0],   // busier boss kick
  snare:      [0,0,0,0, 1,0,0,0, 0,0,0,0, 1,0,0,0],   // beats 2 and 4
  hihat_4th:  [1,0,0,0, 1,0,0,0, 1,0,0,0, 1,0,0,0],   // every beat (intensity 1)
  hihat_8th:  [1,0,1,0, 1,0,1,0, 1,0,1,0, 1,0,1,0],   // every 8th (intensity 2+)
  hihat_16th: [1,1,1,1, 1,1,1,1, 1,1,1,1, 1,1,1,1],   // every 16th (intensity 3)
  // bass plays on kick beats with chromatic walk on beat 3 offbeat
  bass:       [1,0,0,0, 0,0,0,1, 1,0,0,0, 0,1,0,0],
  // melody — 16-step pattern; actual note chosen per-era
  melody:     [1,0,0,1, 0,1,0,0, 1,0,1,0, 0,0,1,0],
  // counter-melody (intensity 3) — fills the gaps of the melody pattern
  counter:    [0,1,0,0, 1,0,1,1, 0,1,0,1, 1,0,0,1],
  // han military march — strong downbeats, double snare
  han_kick:   [1,0,1,0, 0,0,0,0, 1,0,1,0, 0,0,0,0],
  han_snare:  [0,0,0,0, 1,0,1,0, 0,0,0,0, 1,0,1,0],
  // xianqin — slower, tribal, every 2 beats
  xian_kick:  [1,0,0,0, 0,0,0,0, 0,0,0,0, 0,0,0,0],
  xian_bass:  [1,0,0,0, 0,0,0,0, 1,0,0,0, 0,0,0,0],
};

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

// ─── Beat-clock tick — called every 375ms (160 BPM, 16th note) ───────────────
function onBeat() {
  if (!audioCtx || !musicEnabled) return;
  if (currentIntensity === 0) return; // ambient mode has its own scheduler

  const step = beatStep % 16; // 0–15 within current bar
  const era = currentEra;
  const flavor = ERA_BATTLE[era] || ERA_BATTLE.menu;
  const notes = PENTATONIC[era] || PENTATONIC.menu;
  const settings = ERA_SETTINGS[era] || ERA_SETTINGS.menu;
  const dest = masterMusicGain || audioCtx.destination;

  // ── Drums (intensity 1+) ──────────────────────────────────────────────────
  if (currentIntensity >= 1) {
    // Era-specific kick pattern
    let kickPattern = (era === 'xianqin') ? PATTERNS.xian_kick
                    : (era === 'han')     ? PATTERNS.han_kick
                    : (era === 'boss')    ? PATTERNS.kick_boss
                    :                       PATTERNS.kick;
    if (kickPattern[step] === 1) {
      playKick(flavor.kickHz, 0.55, dest);
    }

    // Snare
    let snarePattern = (era === 'han') ? PATTERNS.han_snare : PATTERNS.snare;
    if (snarePattern[step] === 1) {
      playSnare(flavor.snareQ, 0.38, dest);
    }

    // Hi-hat — level 1: every quarter; level 2+: every 8th; level 3: every 16th
    let hhPattern = (currentIntensity >= 3) ? PATTERNS.hihat_16th
                  : (currentIntensity >= 2) ? PATTERNS.hihat_8th
                  :                            PATTERNS.hihat_4th;
    if (hhPattern[step] === 1) {
      playHihat(false, 0.18, dest);
    }
    // Occasional open hi-hat on upbeats at intensity 2+
    if (currentIntensity >= 2 && (step === 2 || step === 10)) {
      playHihat(true, 0.12, dest);
    }
  }

  // ── Bass line (intensity 1+) ──────────────────────────────────────────────
  if (currentIntensity >= 1) {
    let bassPattern = (era === 'xianqin') ? PATTERNS.xian_bass : PATTERNS.bass;
    if (bassPattern[step] === 1) {
      // Root note from pentatonic, shifted down an octave
      const bassIdx = (step < 8) ? 0 : 2; // root on beat 1, walk on beat 3 area
      const baseFreq = notes[bassIdx % notes.length];
      const freq = baseFreq / (flavor.bassShift >= 0 ? 2 : 4); // octave shift
      const wave = (era === 'boss') ? 'sawtooth' : (era === 'modern') ? 'square' : 'triangle';
      playBassNote(freq, wave, 0.22, dest);
    }
    // Bass drop on step 7 at intensity 3 (the "drop" before beat 3)
    if (currentIntensity >= 3 && step === 7) {
      playBassNote(notes[0] / 4, 'sine', 0.30, dest);
    }
  }

  // ── Melody (intensity 2+) ─────────────────────────────────────────────────
  if (currentIntensity >= 2) {
    if (PATTERNS.melody[step] === 1) {
      // Pick note based on step position — cycles through pentatonic with density filter
      if (Math.random() < flavor.melodyDensity) {
        const melIdx = (step * 3 + beatStep) % notes.length;
        const melFreq = notes[melIdx];
        const melWave = settings.wave;
        const durationMult = (era === 'song') ? 2.0 : (era === 'xianqin') ? 1.8 : 1.0;
        playMelodyNote(melFreq, melWave, 0.12, durationMult, dest);
      }
    }
  }

  // ── Counter-melody (intensity 3) ──────────────────────────────────────────
  if (currentIntensity >= 3) {
    if (PATTERNS.counter[step] === 1) {
      // Play a higher pentatonic note as counter
      const ctrIdx = (step + 3) % notes.length;
      const ctrFreq = notes[ctrIdx] * 2; // one octave up
      const wave = (era === 'boss') ? 'sawtooth' : 'square';
      const dissonance = (era === 'boss' && Math.random() < 0.25) ? 1.059 : 1.0; // tritone clash for boss
      playMelodyNote(ctrFreq * dissonance, wave, 0.09, 0.7, dest);
    }
    // Boss: rumbling low drone note every 8 steps
    if (era === 'boss' && step === 0) {
      playBassNote(notes[0] / 4, 'sine', 0.14, dest);
    }
  }

  beatStep++;
}

// ─── Ambient scheduler (intensity 0 only) ─────────────────────────────────────
// Uses the old random-interval approach so menus stay calm
function startAmbientLoop(era) {
  const notes = PENTATONIC[era] || PENTATONIC.menu;
  const settings = ERA_SETTINGS[era] || ERA_SETTINGS.menu;

  const dest = masterMusicGain || audioCtx.destination;
  const delayFx = createDelayNode(audioCtx, settings.delayTime, 0.28, 0.22);
  delayFx.output.connect(audioCtx.destination);

  // Boss era adds a low drone in ambient too
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

  function scheduleNextNote() {
    if (!musicEnabled || !audioCtx || currentIntensity !== 0) return;

    const freq = notes[Math.floor(Math.random() * notes.length)];
    const [minMs, maxMs] = settings.interval;
    const delay = minMs + Math.random() * (maxMs - minMs);
    const attackTime = 0.12 + Math.random() * 0.15;
    const decayTime = 1.2 + Math.random() * 1.8;

    playNote(freq, settings.wave, settings.gain, attackTime, decayTime, dest);
    playNote(freq, settings.wave, settings.gain * 0.3, attackTime, decayTime, delayFx.input);

    if (Math.random() < 0.35) {
      const harmonyIdx = Math.min(notes.indexOf(freq) + 2, notes.length - 1);
      const harmonyFreq = notes[harmonyIdx];
      playNote(harmonyFreq, settings.wave, settings.gain * 0.45, attackTime + 0.08, decayTime * 0.8, dest);
    }

    musicLoopHandle = setTimeout(scheduleNextNote, delay);
  }

  musicLoopHandle = setTimeout(scheduleNextNote, 300);
}

// ─── Start/restart the beat clock ─────────────────────────────────────────────
function startBeatClock(era) {
  stopBeatClock();
  beatStep = 0;
  const flavor = ERA_BATTLE[era] || ERA_BATTLE.menu;
  // 160 BPM base × era factor → ms per 16th note
  const msPerStep = Math.round((375 / flavor.bpmFactor));
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
    // Fade out master music gain briefly then restart
    if (masterMusicGain) {
      const now = audioCtx.currentTime;
      masterMusicGain.gain.setValueAtTime(masterMusicGain.gain.value, now);
      masterMusicGain.gain.linearRampToValueAtTime(0.0, now + FADE * 0.5);
    }
    stopBeatClock();
    setTimeout(() => {
      if (!musicEnabled || !audioCtx) return;
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
      // Battle intensity shift — just change level (beat clock keeps running)
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
