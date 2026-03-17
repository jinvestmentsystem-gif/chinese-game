// js/pixel-sprites.js — Generates pixel art character sprites using Canvas
// Each character is drawn at 24x48 resolution, exported as data URL, displayed with image-rendering:pixelated

const PIXEL_SIZE = 1; // Drawing scale (1 = native resolution)

function createSpriteCanvas(w, h) {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  return c;
}

function drawPixel(ctx, x, y, color) {
  ctx.fillStyle = color;
  ctx.fillRect(x * PIXEL_SIZE, y * PIXEL_SIZE, PIXEL_SIZE, PIXEL_SIZE);
}

function drawPixels(ctx, pixels, palette) {
  for (let y = 0; y < pixels.length; y++) {
    for (let x = 0; x < pixels[y].length; x++) {
      const c = pixels[y][x];
      if (c !== '.' && palette[c]) {
        drawPixel(ctx, x, y, palette[c]);
      }
    }
  }
}

// ── Player: Wuxia warrior with brush-sword, headband, cape ──────
// frameOffset: 0 = normal, 1 = breathing (torso shifts 1px up)
function generatePlayer(frameOffset = 0) {
  const c = createSpriteCanvas(24, 48);
  const ctx = c.getContext('2d');
  const P = {
    '0': '#1a1a2e', // dark outline
    '1': '#d4a017', // gold (sword, accents)
    '2': '#c8a87a', // skin
    '3': '#2d1b69', // dark purple (robe)
    '4': '#4a2d8a', // light purple (robe highlight)
    '5': '#1a2540', // dark blue (pants)
    '6': '#e8d5a0', // light gold (hair)
    '7': '#ffffff', // white (eyes, highlights)
    '8': '#6c5ce7', // bright purple (belt/sash)
    '9': '#f0c040', // bright gold (sword glow)
    'a': '#3d2200', // brown (hair shadow)
    'b': '#0f3460', // navy (boot)
    'c': '#e74c3c', // red (headband)
    'd': '#3b1f7e', // dark cape
    'e': '#5a3daa', // cape highlight
  };

  // 24-wide sprite with headband, weapon, cape outline
  const headRows = [
    '......0aaaa0............',
    '.....0a66660............',
    '....0a6666660...........',
    '....066666660...........',
    '....0cccccc0............',  // headband
    '....022222220...........',
    '....027002700...........',
    '....022222220...........',
    '....0.2222.0............',
    '.....022220.............',
    '......0000..............',
  ];

  const torsoNormal = [
    '.....033330.............',
    '....03344330.91.........',
    '...0344443309910........',
    '..d03344430.99100.......',
    '..d03444430..9100.......',
    '..d03388330..910........',
    '..e0344430...91.........',
    '...034430....1..........',
  ];

  const torsoBreath = [
    '........................',  // vacated row
    '.....033330.............',
    '....03344330.91.........',
    '...0344443309910........',
    '..d03344430.99100.......',
    '..d03444430..9100.......',
    '..d03388330..910........',
    '..e0344430...91.........',
  ];

  const lowerBody = [
    '....0355530.............',
    '....0355530.............',
    '....0355530.............',
    '....0355530.............',
    '....035.530.............',
    '....035.530.............',
    '....0b5.5b0.............',
    '....0bb.bb0.............',
    '....0b0.0b0.............',
    '....000.000.............',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ];

  const torso = frameOffset === 1 ? torsoBreath : torsoNormal;
  const pixels = [...headRows, ...torso, ...lowerBody];

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Enemy: Ink Spirit (墨灵) ──────────────────────────────────
// frameOffset: 0 = normal, 1 = bob (whole sprite shifts 1px up)
function generateInkSpirit(frameOffset = 0) {
  const c = createSpriteCanvas(24, 48);
  const ctx = c.getContext('2d');
  const P = {
    '0': '#0d0d1a', // dark outline
    '1': '#1a0e2e', // darkest body (gradient bottom)
    '2': '#2d1b42', // dark purple body
    '3': '#4a2d6b', // mid purple
    '4': '#ff4444', // red eyes
    '5': '#ff8888', // eye glow (bright dot)
    '6': '#1a1a2e', // drip shadow
    '7': '#8844aa', // bright accent
    '8': '#110011', // deepest shadow
    '9': '#ffcccc', // eye core (white-ish glow)
  };

  const basePixels = [
    '........................',
    '........................',
    '........................',
    '........................',
    '.......011110...........',
    '......01222210..........',
    '.....0122222210.........',
    '....012233332210........',
    '....012295592210........',
    '....012233332210........',
    '...01222222222210.......',
    '...01222277222210.......',
    '..0122222222222210......',
    '..0122222222222210......',
    '...012222222222210......',
    '...0122222222222210.....',
    '....01222222222210......',
    '....012222222222210.....',
    '...0122222222222210.....',
    '..01222222222222210.....',
    '...012222222222210......',
    '....01222222222210......',
    '.....0112222221100......',
    '......011222211.........',
    '.......01122110.........',
    '........011110..........',
    '.........0610...........',
    '..........060...........',
    '...........0............',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ];

  // Frame 1: shift entire sprite 1px up (remove first row, add blank at bottom)
  let pixels;
  if (frameOffset === 1) {
    pixels = [...basePixels.slice(1), '........................'];
  } else {
    pixels = basePixels;
  }

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Enemy: Dark Soldier (暗字兵) ─────────────────────────────
// frameOffset: 0 = normal, 1 = bob (whole sprite shifts 1px up)
function generateDarkSoldier(frameOffset = 0) {
  const c = createSpriteCanvas(24, 48);
  const ctx = c.getContext('2d');
  const P = {
    '0': '#0a0a0a', // black outline
    '1': '#1a1a2e', // dark armor
    '2': '#2d2d4e', // armor mid
    '3': '#3d3d6e', // armor highlight
    '4': '#c0392b', // red (visor/eyes)
    '5': '#e74c3c', // bright red
    '6': '#16213e', // dark blue
    '7': '#555555', // grey metal
    '8': '#888888', // light metal
    '9': '#333333', // shadow
    'a': '#ff6666', // eye glow
  };

  const basePixels = [
    '........................',
    '........................',
    '.......07780............',
    '......0788870...........',
    '......0711170...........',
    '.....071111170..........',
    '.....07445a700..........',
    '.....011111100..........',
    '.....012222100..........',
    '......012210............',
    '......00000.............',
    '.....0122210............',
    '....012222210...........',
    '....012232210...........',
    '...0122232221...........',
    '...0122222210...........',
    '...0112222110...........',
    '....011221100...........',
    '....012662100...........',
    '....016666100...........',
    '....016666100...........',
    '....016.6610............',
    '....016.6610............',
    '....019.9100............',
    '....010.0100............',
    '....000.0000............',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ];

  // Frame 1: shift entire sprite 1px up (remove first row, add blank at bottom)
  let pixels;
  if (frameOffset === 1) {
    pixels = [...basePixels.slice(1), '........................'];
  } else {
    pixels = basePixels;
  }

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Boss: Shadow of Cangjie (仓颉之影) ──────────────────────
// frameOffset: 0 = normal, 1 = bob (whole sprite shifts 1px up)
function generateBossCangjie(frameOffset = 0) {
  const c = createSpriteCanvas(32, 56);
  const ctx = c.getContext('2d');
  const P = {
    '0': '#0a0008', // outline
    '1': '#1a0020', // dark body
    '2': '#2d0040', // purple body
    '3': '#4a0068', // bright purple
    '4': '#d4a017', // gold (eyes, oracle bone chars)
    '5': '#f0c040', // bright gold
    '6': '#ff4444', // red glow
    '7': '#8a2be2', // violet
    '8': '#330044', // deep purple
    '9': '#6c3d8a', // medium purple
    'a': '#c084fc', // light purple
    'b': '#ff6666', // red accent
    'c': '#ffdd77', // eye core glow
  };

  const basePixels = [
    '................................',
    '................................',
    '..........0555550...............',
    '.........055555550..............',
    '........05555555550.............',
    '.......0555555555550............',
    '......055555555555550...........',
    '.....04444444444444440..........',
    '....012222222222222221..........',
    '...0122222222222222210..........',
    '...0122333333333322210..........',
    '...01236c466c36332210..........',
    '...0122333333333322210..........',
    '...0122222299222222210..........',
    '...01222229992222222210.........',
    '...01222222992222222210.........',
    '..012222222222222222210.........',
    '..012222222772222222210.........',
    '.0122222277777222222210.........',
    '.01222222277222222222210........',
    '01222222222222222222210.........',
    '012222222222222222222210........',
    '.0122222222222222222210.........',
    '..012222222222222222210.........',
    '..0122222222222222222210........',
    '...01222222222222222210.........',
    '...012222222222222222210........',
    '....0122222222222222210.........',
    '....01222222222222222210........',
    '.....012222222222222210.........',
    '.....0122222222222222210........',
    '......01222222222222210.........',
    '.......012222222222210..........',
    '........01222222222210..........',
    '.........0122222222210..........',
    '..........012222222210..........',
    '...........01222222210..........',
    '............0122222210..........',
    '.............012222210..........',
    '..............01222210..........',
    '...............012210..........',
    '................0110...........',
    '.................00............',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
    '................................',
  ];

  // Frame 1: shift entire sprite 1px up (remove first row, add blank at bottom)
  let pixels;
  if (frameOffset === 1) {
    pixels = [...basePixels.slice(1), '................................'];
  } else {
    pixels = basePixels;
  }

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Generate all sprites (arrays of frames for idle animation) ──
let _cache = null;

export function getPixelSprites() {
  if (_cache) return _cache;

  _cache = {
    // Player: 3 frames — normal, breathe (torso up), normal
    player: [generatePlayer(0), generatePlayer(1), generatePlayer(0)],
    // Ink Spirit: 3 frames — normal, bob (up 1px), normal
    enemy_ink: [generateInkSpirit(0), generateInkSpirit(1), generateInkSpirit(0)],
    // Dark Soldier: 3 frames — normal, bob (up 1px), normal
    enemy_soldier: [generateDarkSoldier(0), generateDarkSoldier(1), generateDarkSoldier(0)],
    // Boss Cangjie: 3 frames — normal, bob (up 1px), normal
    boss_cangjie: [generateBossCangjie(0), generateBossCangjie(1), generateBossCangjie(0)],
  };

  return _cache;
}

// Helper: create an <img> element from a sprite data URL or frame array
// If dataUrlOrArray is an array, cycles through frames for idle animation
// Default sizes: 180px for combat, callers can pass 220 for boss sprites
export function createSpriteImg(dataUrlOrArray, height = 180, animSpeed = 400) {
  const img = document.createElement('img');
  if (Array.isArray(dataUrlOrArray)) {
    let frame = 0;
    img.src = dataUrlOrArray[0];
    const intervalId = setInterval(() => {
      frame = (frame + 1) % dataUrlOrArray.length;
      img.src = dataUrlOrArray[frame];
    }, animSpeed);
    // Store interval ID so callers can clean up if needed
    img._spriteInterval = intervalId;
  } else {
    img.src = dataUrlOrArray;
  }
  img.style.cssText = `
    height: ${height}px;
    width: auto;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    -ms-interpolation-mode: nearest-neighbor;
  `;
  return img;
}
