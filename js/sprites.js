// js/sprites.js — Character art (WebP images, replacing inline SVGs)
// All character images are 480x640 WebP (3:4 aspect ratio)
// Rendered at 120x160 native, scaled up to 140x180 (combat) or 160x200 (boss)

const IMG_BASE = 'assets/img/';
const _v = window.APP_VERSION ? '?v=' + window.APP_VERSION : '';

function spriteImg(name, alt = '') {
  return `<img src="${IMG_BASE}${name}.webp${_v}" alt="${alt}" style="width:100%;height:100%;object-fit:contain;" draggable="false" loading="eager">`;
}

export const SPRITES = {
  player:        spriteImg('player', '文字侠'),
  enemy_moling:  spriteImg('enemy_moling', '墨灵'),
  enemy_guard:   spriteImg('enemy_guard', '暗字兵'),
  enemy_shadow:  spriteImg('enemy_shadow', '墨影卫'),
  boss_cangjie:  spriteImg('boss_cangjie', '仓颉之影'),
  boss_moli:     spriteImg('boss_moli', '墨吏'),
  boss_shimo:    spriteImg('boss_shimo', '诗魔'),
  boss_cisha:    spriteImg('boss_cisha', '词煞'),
  boss_final:    spriteImg('boss_final', '墨暗之主'),
};

// Combat background image paths (1280x720 WebP)
export const COMBAT_BGS = {
  xianqin: `${IMG_BASE}bg_xianqin.webp${_v}`,
  han:     `${IMG_BASE}bg_han.webp${_v}`,
  tang:    `${IMG_BASE}bg_tang.webp${_v}`,
  song:    `${IMG_BASE}bg_song.webp${_v}`,
  modern:  `${IMG_BASE}bg_modern.webp${_v}`,
};

// Enemy sprites array for random selection in combat (backward compat)
export const ENEMY_SPRITES = [
  SPRITES.enemy_moling,
  SPRITES.enemy_guard,
  SPRITES.enemy_shadow,
  SPRITES.enemy_moling,
  SPRITES.enemy_shadow,
];
