// js/pixel-sprites.js — Generates pixel art character sprites using Canvas
// Each character is drawn at 16x32 resolution, exported as data URL, displayed with image-rendering:pixelated

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

// ── Player: Wuxia warrior with brush-sword ──────────────────────
function generatePlayer() {
  const c = createSpriteCanvas(16, 32);
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
  };

  const pixels = [
    // Hair/head (rows 0-9)
    '....0aaaa0......',
    '...0a66660......',
    '..0a666666a0....',
    '..06666666a0....',
    '..022222220.....',
    '..027002700.....',
    '..022222220.....',
    '..0.2222.0......',
    '...022220.......',
    '....0000........',
    // Shoulders/torso (rows 10-19)
    '...033330.......',
    '..0334433091....',
    '..034443309910...',
    '.03344430.9910..',
    '.03444430..910..',
    '.03388330..91...',
    '..0344430..1....',
    '..0355530.......',
    '..0355530.......',
    '..0355530.......',
    // Legs/boots (rows 20-29)
    '..035.530.......',
    '..035.530.......',
    '..0b5.5b0.......',
    '..0bb.bb0.......',
    '..0b0.0b0.......',
    '..000.000.......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Enemy: Ink Spirit (墨灵) ──────────────────────────────────
function generateInkSpirit() {
  const c = createSpriteCanvas(16, 32);
  const ctx = c.getContext('2d');
  const P = {
    '0': '#0d0d1a', // dark outline
    '1': '#2d1b42', // dark purple body
    '2': '#4a2d6b', // mid purple
    '3': '#6c3d8a', // light purple
    '4': '#ff4444', // red eyes
    '5': '#ff8888', // eye glow
    '6': '#1a1a2e', // drip shadow
    '7': '#8844aa', // bright accent
    '8': '#330033', // deep shadow
  };

  const pixels = [
    '................',
    '................',
    '................',
    '.....01110......',
    '....0122210.....',
    '...012222210....',
    '..01223322210...',
    '..01245542210...',
    '..01223322210...',
    '..01222222210...',
    '.012222222210...',
    '.012227722210...',
    '..0122222210....',
    '..01222222210...',
    '...0122222210...',
    '...01222222210..',
    '....012222210...',
    '...0122222210...',
    '..01222222210...',
    '...012222210....',
    '....01222210....',
    '.....0122210....',
    '......012210....',
    '.......01210....',
    '........0610....',
    '.........060....',
    '..........0.....',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Enemy: Dark Soldier (暗字兵) ─────────────────────────────
function generateDarkSoldier() {
  const c = createSpriteCanvas(16, 32);
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
  };

  const pixels = [
    '................',
    '.....07780......',
    '....0788870.....',
    '....0711170.....',
    '...071111170....',
    '...074454700....',
    '...011111100....',
    '...012222100....',
    '....012210......',
    '....00000.......',
    '...0122210......',
    '..012222210.....',
    '..012232210.....',
    '.0122232221.....',
    '.0122222210.....',
    '.0112222110.....',
    '..011221100.....',
    '..012662100.....',
    '..016666100.....',
    '..016666100.....',
    '..016.6610......',
    '..016.6610......',
    '..019.9100......',
    '..010.0100......',
    '..000.0000......',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
    '................',
  ];

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Boss: Shadow of Cangjie (仓颉之影) ──────────────────────
function generateBossCangjie() {
  const c = createSpriteCanvas(24, 40);
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
  };

  const pixels = [
    '........................',
    '........044440..........',
    '.......04555540.........',
    '......0455555540........',
    '.....045555555540.......',
    '....04444444444440......',
    '...0122222222222210.....',
    '..01222222222222210.....',
    '..01223333333322210.....',
    '..01236446436322210.....',
    '..01223333333322210.....',
    '..01222229922222210.....',
    '..01222299922222210.....',
    '..01222222222222210.....',
    '.012222222222222210.....',
    '.012222227722222210.....',
    '012222227777222221.....',
    '012222222772222210.....',
    '.01222222222222210.....',
    '..0122222222222210.....',
    '..01222222222222210....',
    '...012222222222210.....',
    '...0122222222222210....',
    '....01222222222210.....',
    '....012222222222210....',
    '.....0122222222210.....',
    '.....01222222222210....',
    '......012222222210.....',
    '.......0122222210......',
    '........012222210......',
    '.........0122210.......',
    '..........01210........',
    '...........010.........',
    '............0..........',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
    '........................',
  ];

  drawPixels(ctx, pixels, P);
  return c.toDataURL();
}

// ── Generate all sprites ─────────────────────────────────────
let _cache = null;

export function getPixelSprites() {
  if (_cache) return _cache;

  _cache = {
    player: generatePlayer(),
    enemy_ink: generateInkSpirit(),
    enemy_soldier: generateDarkSoldier(),
    boss_cangjie: generateBossCangjie(),
  };

  return _cache;
}

// Helper: create an <img> element from a sprite data URL
export function createSpriteImg(dataUrl, height = 160) {
  const img = document.createElement('img');
  img.src = dataUrl;
  img.style.cssText = `
    height: ${height}px;
    width: auto;
    image-rendering: pixelated;
    image-rendering: crisp-edges;
    -ms-interpolation-mode: nearest-neighbor;
  `;
  return img;
}
