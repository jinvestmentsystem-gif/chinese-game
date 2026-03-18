// js/sprites.js — Character art + background paths (WebP images)
// Characters: 480x640 WebP (3:4), Backgrounds: 1280x720 or 720x1080 WebP

import { gameState } from './state.js';

const IMG_BASE = 'assets/img/';
const _v = window.APP_VERSION ? '?v=' + window.APP_VERSION : '';

function spriteImg(name, alt = '') {
  return `<img src="${IMG_BASE}${name}.webp${_v}" alt="${alt}" style="width:100%;height:100%;object-fit:contain;" draggable="false" loading="eager">`;
}

function bgUrl(name) {
  return `${IMG_BASE}${name}.webp${_v}`;
}

/**
 * Get the player sprite HTML based on profile gender setting.
 * Defaults to male ('player') if not set.
 */
export function getPlayerSprite() {
  const gender = gameState.profile?.gender || 'male';
  return gender === 'female' ? spriteImg('playerf', '文字侠') : spriteImg('player', '文字侠');
}

export const SPRITES = {
  // Player sprites — use getPlayerSprite() for gender-aware version
  player:        spriteImg('player', '文字侠'),
  playerf:       spriteImg('playerf', '文字侠'),
  // Enemies
  enemy_moling:  spriteImg('enemy_moling', '墨灵'),
  enemy_guard:   spriteImg('enemy_guard', '暗字兵'),
  enemy_shadow:  spriteImg('enemy_shadow', '墨影卫'),
  // Bosses
  boss_cangjie:  spriteImg('boss_cangjie', '仓颉之影'),
  boss_moli:     spriteImg('boss_moli', '墨吏'),
  boss_shimo:    spriteImg('boss_shimo', '诗魔'),
  boss_cisha:    spriteImg('boss_cisha', '词煞'),
  boss_final:    spriteImg('boss_final', '墨暗之主'),
};

// Combat background image paths (1280x720 WebP)
export const COMBAT_BGS = {
  xianqin: bgUrl('bg_xianqin'),
  han:     bgUrl('bg_han'),
  tang:    bgUrl('bg_tang'),
  song:    bgUrl('bg_song'),
  modern:  bgUrl('bg_modern'),
};

// Quest map background paths (720x1080 WebP, tall vertical)
export const QUEST_BGS = {
  xianqin: bgUrl('bg_quest_xianqin'),
  han:     bgUrl('bg_quest_han'),
  tang:    bgUrl('bg_quest_tang'),
  song:    bgUrl('bg_quest_song'),
  modern:  bgUrl('bg_quest_modern'),
};

// Special backgrounds
export const TITLE_BG = bgUrl('bg_title');
export const WORLDMAP_BG = bgUrl('bg_worldmap');

// Enemy sprites array for random selection in combat (backward compat)
export const ENEMY_SPRITES = [
  SPRITES.enemy_moling,
  SPRITES.enemy_guard,
  SPRITES.enemy_shadow,
  SPRITES.enemy_moling,
  SPRITES.enemy_shadow,
];
