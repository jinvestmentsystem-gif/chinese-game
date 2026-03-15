// js/audio.js — Procedural music & SFX via Web Audio API (no external files)

let audioCtx = null;
let musicEnabled = true;
let sfxEnabled = true;
let currentMusicNodes = []; // oscillators / intervals currently playing
let musicLoopHandle = null;

// Chinese pentatonic scale: 宫商角徵羽 (C D E G A) + octave up
// Frequencies in Hz for multiple octaves
const PENTATONIC = {
  // Era-specific note sets — all derived from pentatonic: C D E G A
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

// Build a simple feedback delay (reverb-like effect)
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

// Play a single pentatonic note with attack/decay envelope
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

export function initAudio() {
  if (audioCtx) return;
  audioCtx = new (window.AudioContext || window.webkitAudioContext)();
}

export function playMusic(era) {
  if (!audioCtx) return;

  stopMusic();

  if (!musicEnabled) return;

  const notes = PENTATONIC[era] || PENTATONIC.menu;
  const settings = ERA_SETTINGS[era] || ERA_SETTINGS.menu;

  // Build the signal chain: oscillator → gainEnv → masterGain → delay → ctx.destination
  const masterGain = audioCtx.createGain();
  masterGain.gain.value = 1.0;
  masterGain.connect(audioCtx.destination);

  const delayFx = createDelayNode(audioCtx, settings.delayTime, 0.28, 0.22);
  delayFx.output.connect(audioCtx.destination);

  // Boss era adds a low drone
  let droneOsc = null;
  let droneGain = null;
  if (era === 'boss') {
    droneOsc = audioCtx.createOscillator();
    droneGain = audioCtx.createGain();
    droneOsc.type = 'sine';
    droneOsc.frequency.value = 55; // A1

    // Vibrato on drone
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

  currentMusicNodes.push(masterGain);

  // Schedule random pentatonic notes on a repeating interval
  function scheduleNextNote() {
    if (!musicEnabled || !audioCtx) return;

    const freq = notes[Math.floor(Math.random() * notes.length)];
    const [minMs, maxMs] = settings.interval;
    const delay = minMs + Math.random() * (maxMs - minMs);
    const attackTime = 0.12 + Math.random() * 0.15;
    const decayTime = 1.2 + Math.random() * 1.8;

    playNote(freq, settings.wave, settings.gain, attackTime, decayTime, masterGain);
    playNote(freq, settings.wave, settings.gain * 0.3, attackTime, decayTime, delayFx.input);

    // Occasionally add a second harmony note (a pentatonic fifth apart in the array)
    if (Math.random() < 0.35) {
      const harmonyIdx = Math.min(notes.indexOf(freq) + 2, notes.length - 1);
      const harmonyFreq = notes[harmonyIdx];
      playNote(harmonyFreq, settings.wave, settings.gain * 0.45, attackTime + 0.08, decayTime * 0.8, masterGain);
    }

    musicLoopHandle = setTimeout(scheduleNextNote, delay);
  }

  // Small initial delay so audio ctx is warm
  musicLoopHandle = setTimeout(scheduleNextNote, 300);
}

export function stopMusic() {
  if (musicLoopHandle) {
    clearTimeout(musicLoopHandle);
    musicLoopHandle = null;
  }
  // Disconnect and discard stored nodes
  for (const node of currentMusicNodes) {
    try {
      node.stop && node.stop();
      node.disconnect && node.disconnect();
    } catch (_) {}
  }
  currentMusicNodes = [];
}

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
