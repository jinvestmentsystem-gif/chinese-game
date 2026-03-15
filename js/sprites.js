// js/sprites.js — SVG sprite definitions for player and enemies
export const SPRITES = {
  player: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 150" width="80" height="150">
    <!-- Body -->
    <rect x="25" y="55" width="30" height="50" rx="4" fill="#4a90d9" stroke="#2c6fad" stroke-width="2"/>
    <!-- Head -->
    <circle cx="40" cy="38" r="18" fill="#f5cba7" stroke="#d4a017" stroke-width="2"/>
    <!-- Hair -->
    <ellipse cx="40" cy="22" rx="16" ry="8" fill="#2c1810"/>
    <!-- Eyes -->
    <circle cx="34" cy="37" r="2.5" fill="#1a1a2e"/>
    <circle cx="46" cy="37" r="2.5" fill="#1a1a2e"/>
    <!-- Mouth -->
    <path d="M35 44 Q40 48 45 44" stroke="#c0392b" stroke-width="1.5" fill="none"/>
    <!-- Arms -->
    <rect x="8" y="58" width="17" height="8" rx="4" fill="#4a90d9" stroke="#2c6fad" stroke-width="1.5"/>
    <rect x="55" y="58" width="17" height="8" rx="4" fill="#4a90d9" stroke="#2c6fad" stroke-width="1.5"/>
    <!-- Sword (right hand) -->
    <rect x="70" y="40" width="5" height="35" rx="2" fill="#c0c0c0" stroke="#888" stroke-width="1"/>
    <rect x="65" y="58" width="15" height="4" rx="2" fill="#d4a017"/>
    <!-- Legs -->
    <rect x="26" y="103" width="12" height="40" rx="4" fill="#2c3e50" stroke="#1a252f" stroke-width="1.5"/>
    <rect x="42" y="103" width="12" height="40" rx="4" fill="#2c3e50" stroke="#1a252f" stroke-width="1.5"/>
    <!-- Feet -->
    <ellipse cx="32" cy="143" rx="9" ry="5" fill="#1a1a2e"/>
    <ellipse cx="48" cy="143" rx="9" ry="5" fill="#1a1a2e"/>
    <!-- Belt -->
    <rect x="25" y="98" width="30" height="7" rx="2" fill="#d4a017"/>
    <!-- Sash -->
    <rect x="35" y="55" width="10" height="20" rx="2" fill="#c0392b" opacity="0.7"/>
  </svg>`,

  enemy_1: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 150" width="80" height="150">
    <!-- Body -->
    <rect x="22" y="58" width="36" height="48" rx="6" fill="#2c1810" stroke="#c0392b" stroke-width="2"/>
    <!-- Head -->
    <circle cx="40" cy="38" r="20" fill="#1a0a05" stroke="#c0392b" stroke-width="2"/>
    <!-- Glowing eyes -->
    <circle cx="33" cy="36" r="4" fill="#c0392b"/>
    <circle cx="47" cy="36" r="4" fill="#c0392b"/>
    <circle cx="33" cy="36" r="2" fill="#ff6b6b"/>
    <circle cx="47" cy="36" r="2" fill="#ff6b6b"/>
    <!-- Horns -->
    <polygon points="30,20 25,5 35,18" fill="#8b0000"/>
    <polygon points="50,20 55,5 45,18" fill="#8b0000"/>
    <!-- Claws / arms -->
    <rect x="5" y="62" width="17" height="9" rx="4" fill="#2c1810" stroke="#c0392b" stroke-width="1.5"/>
    <rect x="58" y="62" width="17" height="9" rx="4" fill="#2c1810" stroke="#c0392b" stroke-width="1.5"/>
    <!-- Claw tips left -->
    <polygon points="5,64 0,58 5,70" fill="#8b0000"/>
    <polygon points="5,68 0,72 5,72" fill="#8b0000"/>
    <!-- Claw tips right -->
    <polygon points="75,64 80,58 75,70" fill="#8b0000"/>
    <polygon points="75,68 80,72 75,72" fill="#8b0000"/>
    <!-- Legs -->
    <rect x="24" y="104" width="13" height="38" rx="4" fill="#1a0a05" stroke="#c0392b" stroke-width="1.5"/>
    <rect x="43" y="104" width="13" height="38" rx="4" fill="#1a0a05" stroke="#c0392b" stroke-width="1.5"/>
    <!-- Robe hem details -->
    <path d="M22 100 Q40 108 58 100" stroke="#c0392b" stroke-width="1.5" fill="none"/>
    <!-- Ink splatter on body -->
    <circle cx="35" cy="72" r="4" fill="#000" opacity="0.6"/>
    <circle cx="48" cy="80" r="3" fill="#000" opacity="0.5"/>
  </svg>`,

  enemy_2: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 150" width="80" height="150">
    <!-- Robe body -->
    <rect x="20" y="55" width="40" height="55" rx="5" fill="#16213e" stroke="#9b59b6" stroke-width="2"/>
    <!-- Head -->
    <circle cx="40" cy="36" r="19" fill="#0d1b2a" stroke="#9b59b6" stroke-width="2"/>
    <!-- Mask face -->
    <rect x="28" y="26" width="24" height="22" rx="6" fill="#2c1810" stroke="#9b59b6" stroke-width="1.5"/>
    <!-- Mask eyes slits -->
    <rect x="31" y="32" width="8" height="3" rx="1.5" fill="#9b59b6"/>
    <rect x="41" y="32" width="8" height="3" rx="1.5" fill="#9b59b6"/>
    <!-- Arms with scrolls -->
    <rect x="4" y="60" width="16" height="8" rx="4" fill="#16213e" stroke="#9b59b6" stroke-width="1.5"/>
    <rect x="60" y="60" width="16" height="8" rx="4" fill="#16213e" stroke="#9b59b6" stroke-width="1.5"/>
    <!-- Scroll in left hand -->
    <rect x="0" y="54" width="6" height="20" rx="3" fill="#d4a017"/>
    <!-- Hat -->
    <ellipse cx="40" cy="18" rx="22" ry="7" fill="#2c3e50" stroke="#9b59b6" stroke-width="1.5"/>
    <rect x="32" y="5" width="16" height="14" rx="3" fill="#2c3e50" stroke="#9b59b6" stroke-width="1.5"/>
    <!-- Legs -->
    <rect x="25" y="108" width="12" height="36" rx="4" fill="#0d1b2a" stroke="#9b59b6" stroke-width="1.5"/>
    <rect x="43" y="108" width="12" height="36" rx="4" fill="#0d1b2a" stroke="#9b59b6" stroke-width="1.5"/>
    <!-- Robe symbols -->
    <text x="36" y="85" font-size="10" fill="#9b59b6" font-family="sans-serif">文</text>
  </svg>`,

  enemy_3: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 150" width="80" height="150">
    <!-- Flowing ink body -->
    <ellipse cx="40" cy="85" rx="25" ry="38" fill="#0a0a0a" stroke="#3d3d5c" stroke-width="2"/>
    <!-- Face orb -->
    <circle cx="40" cy="40" r="22" fill="#0f0f1a" stroke="#4a4a7a" stroke-width="2"/>
    <!-- Eyes -->
    <ellipse cx="33" cy="38" rx="5" ry="7" fill="#7c3aed"/>
    <ellipse cx="47" cy="38" rx="5" ry="7" fill="#7c3aed"/>
    <ellipse cx="33" cy="38" rx="2.5" ry="4" fill="#ddd6fe"/>
    <ellipse cx="47" cy="38" rx="2.5" ry="4" fill="#ddd6fe"/>
    <!-- Mouth grin -->
    <path d="M31 50 Q40 56 49 50" stroke="#7c3aed" stroke-width="2" fill="none"/>
    <!-- Tentacle arms -->
    <path d="M15 70 Q5 60 0 75 Q5 85 15 80" fill="#0a0a0a" stroke="#3d3d5c" stroke-width="1.5"/>
    <path d="M65 70 Q75 60 80 75 Q75 85 65 80" fill="#0a0a0a" stroke="#3d3d5c" stroke-width="1.5"/>
    <!-- Ink drips at base -->
    <ellipse cx="30" cy="140" rx="8" ry="10" fill="#000"/>
    <ellipse cx="50" cy="140" rx="8" ry="10" fill="#000"/>
    <ellipse cx="40" cy="143" rx="12" ry="7" fill="#000"/>
    <!-- Floating ink droplets -->
    <circle cx="22" cy="55" r="3" fill="#4a4a7a" opacity="0.7"/>
    <circle cx="58" cy="48" r="4" fill="#4a4a7a" opacity="0.6"/>
    <circle cx="15" cy="40" r="2" fill="#4a4a7a" opacity="0.5"/>
  </svg>`,

  enemy_4: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 150" width="80" height="150">
    <!-- Armored body -->
    <rect x="18" y="52" width="44" height="58" rx="4" fill="#2d2d2d" stroke="#888" stroke-width="2"/>
    <!-- Chest plate -->
    <rect x="22" y="56" width="36" height="30" rx="3" fill="#3d3d3d" stroke="#aaa" stroke-width="1.5"/>
    <!-- Helmet -->
    <rect x="22" y="15" width="36" height="28" rx="6" fill="#2d2d2d" stroke="#888" stroke-width="2"/>
    <!-- Visor -->
    <rect x="26" y="28" width="28" height="8" rx="2" fill="#ff4444" opacity="0.8"/>
    <!-- Pauldrons -->
    <rect x="8" y="50" width="14" height="14" rx="3" fill="#3d3d3d" stroke="#888" stroke-width="1.5"/>
    <rect x="58" y="50" width="14" height="14" rx="3" fill="#3d3d3d" stroke="#888" stroke-width="1.5"/>
    <!-- Arms -->
    <rect x="4" y="62" width="16" height="9" rx="4" fill="#2d2d2d" stroke="#888" stroke-width="1.5"/>
    <rect x="60" y="62" width="16" height="9" rx="4" fill="#2d2d2d" stroke="#888" stroke-width="1.5"/>
    <!-- Spear / weapon right -->
    <rect x="75" y="20" width="4" height="80" rx="2" fill="#888"/>
    <polygon points="75,20 79,20 77,5" fill="#c0c0c0"/>
    <!-- Legs armored -->
    <rect x="22" y="108" width="15" height="38" rx="3" fill="#2d2d2d" stroke="#888" stroke-width="1.5"/>
    <rect x="43" y="108" width="15" height="38" rx="3" fill="#2d2d2d" stroke="#888" stroke-width="1.5"/>
    <!-- Knee guards -->
    <rect x="22" y="118" width="15" height="8" rx="2" fill="#3d3d3d" stroke="#aaa" stroke-width="1"/>
    <rect x="43" y="118" width="15" height="8" rx="2" fill="#3d3d3d" stroke="#aaa" stroke-width="1"/>
  </svg>`,

  enemy_5: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 80 150" width="80" height="150">
    <!-- Ghost/spirit form -->
    <ellipse cx="40" cy="95" rx="22" ry="42" fill="#1a0a2e" stroke="#6a0dad" stroke-width="2" opacity="0.9"/>
    <!-- Trail wisps -->
    <path d="M18 120 Q10 135 18 145 Q26 135 18 120" fill="#1a0a2e" stroke="#6a0dad" stroke-width="1" opacity="0.7"/>
    <path d="M62 120 Q70 135 62 145 Q54 135 62 120" fill="#1a0a2e" stroke="#6a0dad" stroke-width="1" opacity="0.7"/>
    <path d="M40 130 Q32 145 40 150 Q48 145 40 130" fill="#1a0a2e" stroke="#6a0dad" stroke-width="1" opacity="0.7"/>
    <!-- Head -->
    <circle cx="40" cy="35" r="22" fill="#110820" stroke="#6a0dad" stroke-width="2"/>
    <!-- Skull-like face -->
    <ellipse cx="33" cy="33" rx="6" ry="7" fill="#6a0dad" opacity="0.8"/>
    <ellipse cx="47" cy="33" rx="6" ry="7" fill="#6a0dad" opacity="0.8"/>
    <circle cx="33" cy="33" r="3" fill="#e8e8e8"/>
    <circle cx="47" cy="33" r="3" fill="#e8e8e8"/>
    <!-- Nose hollow -->
    <ellipse cx="40" cy="43" rx="3" ry="4" fill="#6a0dad" opacity="0.5"/>
    <!-- Grimace -->
    <path d="M30 50 L35 54 L40 50 L45 54 L50 50" stroke="#6a0dad" stroke-width="2" fill="none"/>
    <!-- Ghost arms wisps -->
    <path d="M18 80 Q5 70 2 82 Q5 92 18 88" fill="#1a0a2e" stroke="#6a0dad" stroke-width="1.5"/>
    <path d="M62 80 Q75 70 78 82 Q75 92 62 88" fill="#1a0a2e" stroke="#6a0dad" stroke-width="1.5"/>
    <!-- Aura glow rings -->
    <circle cx="40" cy="35" r="26" fill="none" stroke="#6a0dad" stroke-width="1" opacity="0.3"/>
    <circle cx="40" cy="35" r="30" fill="none" stroke="#6a0dad" stroke-width="0.5" opacity="0.15"/>
  </svg>`,

  boss_cangjie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" width="120" height="200">
    <!-- Robe -->
    <rect x="25" y="80" width="70" height="90" rx="8" fill="#1a0a05" stroke="#c0392b" stroke-width="3"/>
    <!-- Body glow -->
    <rect x="30" y="85" width="60" height="80" rx="6" fill="#2c1810" opacity="0.8"/>
    <!-- Head -->
    <circle cx="60" cy="50" r="32" fill="#0d0505" stroke="#c0392b" stroke-width="3"/>
    <!-- Four eyes (legendary) -->
    <ellipse cx="45" cy="43" rx="6" ry="8" fill="#c0392b"/>
    <ellipse cx="60" cy="40" rx="6" ry="8" fill="#c0392b"/>
    <ellipse cx="75" cy="43" rx="6" ry="8" fill="#c0392b"/>
    <ellipse cx="60" cy="57" rx="5" ry="7" fill="#c0392b" opacity="0.8"/>
    <circle cx="45" cy="43" r="3" fill="#ff9999"/>
    <circle cx="60" cy="40" r="3" fill="#ff9999"/>
    <circle cx="75" cy="43" r="3" fill="#ff9999"/>
    <!-- Crown/headdress -->
    <rect x="35" y="18" width="50" height="15" rx="4" fill="#8b0000" stroke="#c0392b" stroke-width="2"/>
    <polygon points="45,18 50,5 55,18" fill="#c0392b"/>
    <polygon points="57,18 62,3 67,18" fill="#c0392b"/>
    <polygon points="69,18 74,5 79,18" fill="#c0392b"/>
    <!-- Brush weapon -->
    <rect x="93" y="30" width="8" height="100" rx="4" fill="#8b4513"/>
    <ellipse cx="97" cy="28" rx="5" ry="10" fill="#1a1a2e"/>
    <!-- Ink drips from brush -->
    <ellipse cx="97" cy="130" rx="4" ry="6" fill="#000"/>
    <circle cx="97" cy="138" r="2" fill="#000"/>
    <!-- Arms -->
    <rect x="0" y="88" width="28" height="12" rx="6" fill="#1a0a05" stroke="#c0392b" stroke-width="2"/>
    <rect x="92" y="88" width="28" height="12" rx="6" fill="#1a0a05" stroke="#c0392b" stroke-width="2"/>
    <!-- Robe symbols -->
    <text x="48" y="118" font-size="14" fill="#c0392b" font-family="sans-serif" font-weight="bold">仓</text>
    <text x="65" y="140" font-size="12" fill="#c0392b" font-family="sans-serif" opacity="0.7">颉</text>
    <!-- Legs -->
    <rect x="33" y="165" width="20" height="32" rx="5" fill="#0d0505" stroke="#c0392b" stroke-width="2"/>
    <rect x="67" y="165" width="20" height="32" rx="5" fill="#0d0505" stroke="#c0392b" stroke-width="2"/>
    <!-- Aura -->
    <circle cx="60" cy="50" r="38" fill="none" stroke="#c0392b" stroke-width="1" opacity="0.3"/>
    <circle cx="60" cy="50" r="44" fill="none" stroke="#c0392b" stroke-width="0.5" opacity="0.15"/>
  </svg>`,

  boss_moli: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" width="120" height="200">
    <!-- Body/robe -->
    <rect x="28" y="78" width="64" height="95" rx="8" fill="#16213e" stroke="#9b59b6" stroke-width="3"/>
    <!-- Head -->
    <circle cx="60" cy="48" r="30" fill="#0d1b2a" stroke="#9b59b6" stroke-width="3"/>
    <!-- Official cap tall -->
    <rect x="38" y="10" width="44" height="25" rx="4" fill="#0a1020" stroke="#9b59b6" stroke-width="2"/>
    <rect x="30" y="32" width="60" height="10" rx="3" fill="#0a1020" stroke="#9b59b6" stroke-width="2"/>
    <!-- Face -->
    <rect x="42" y="36" width="36" height="26" rx="5" fill="#1a2a3e" stroke="#9b59b6" stroke-width="1.5"/>
    <!-- Eyes -->
    <rect x="46" y="43" width="10" height="4" rx="2" fill="#9b59b6"/>
    <rect x="64" y="43" width="10" height="4" rx="2" fill="#9b59b6"/>
    <!-- Sneer -->
    <path d="M48 56 Q60 60 72 56" stroke="#9b59b6" stroke-width="2" fill="none"/>
    <!-- Scroll weapons -->
    <rect x="0" y="82" width="12" height="50" rx="6" fill="#d4a017" stroke="#b8860b" stroke-width="1.5"/>
    <rect x="0" y="80" width="12" height="8" rx="4" fill="#8b6914"/>
    <rect x="0" y="126" width="12" height="8" rx="4" fill="#8b6914"/>
    <rect x="108" y="82" width="12" height="50" rx="6" fill="#d4a017" stroke="#b8860b" stroke-width="1.5"/>
    <!-- Arms -->
    <rect x="10" y="88" width="20" height="10" rx="5" fill="#16213e" stroke="#9b59b6" stroke-width="1.5"/>
    <rect x="90" y="88" width="20" height="10" rx="5" fill="#16213e" stroke="#9b59b6" stroke-width="1.5"/>
    <!-- Robe decoration -->
    <text x="50" y="115" font-size="16" fill="#9b59b6" font-family="sans-serif" font-weight="bold">墨</text>
    <text x="52" y="140" font-size="14" fill="#9b59b6" font-family="sans-serif" opacity="0.6">吏</text>
    <!-- Legs -->
    <rect x="35" y="168" width="18" height="30" rx="5" fill="#0d1b2a" stroke="#9b59b6" stroke-width="2"/>
    <rect x="67" y="168" width="18" height="30" rx="5" fill="#0d1b2a" stroke="#9b59b6" stroke-width="2"/>
  </svg>`,

  boss_shimo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" width="120" height="200">
    <!-- Dragon serpent body coil -->
    <ellipse cx="60" cy="130" rx="45" ry="55" fill="#1a3a1a" stroke="#27ae60" stroke-width="3"/>
    <!-- Upper body -->
    <ellipse cx="60" cy="90" rx="30" ry="35" fill="#1a3a1a" stroke="#27ae60" stroke-width="2.5"/>
    <!-- Dragon head -->
    <ellipse cx="60" cy="45" rx="28" ry="32" fill="#0d2a0d" stroke="#27ae60" stroke-width="3"/>
    <!-- Dragon snout -->
    <ellipse cx="60" cy="60" rx="16" ry="10" fill="#0d2a0d" stroke="#27ae60" stroke-width="2"/>
    <!-- Dragon eyes -->
    <ellipse cx="48" cy="40" rx="8" ry="10" fill="#27ae60"/>
    <ellipse cx="72" cy="40" rx="8" ry="10" fill="#27ae60"/>
    <ellipse cx="48" cy="40" rx="4" ry="6" fill="#f8f"/>
    <ellipse cx="72" cy="40" rx="4" ry="6" fill="#f8f"/>
    <circle cx="48" cy="40" r="2" fill="#000"/>
    <circle cx="72" cy="40" r="2" fill="#000"/>
    <!-- Dragon horns -->
    <path d="M45 20 Q38 8 42 2 Q50 8 48 20" fill="#27ae60" stroke="#1a6b35" stroke-width="1.5"/>
    <path d="M75 20 Q82 8 78 2 Q70 8 72 20" fill="#27ae60" stroke="#1a6b35" stroke-width="1.5"/>
    <!-- Scales pattern -->
    <path d="M30 110 Q40 105 50 110 Q60 105 70 110 Q80 105 90 110" stroke="#27ae60" stroke-width="1.5" fill="none" opacity="0.6"/>
    <path d="M25 125 Q40 120 55 125 Q70 120 85 125 Q95 120 100 125" stroke="#27ae60" stroke-width="1.5" fill="none" opacity="0.6"/>
    <!-- Claws -->
    <path d="M15 100 Q5 95 0 105 Q5 115 15 108" fill="#1a3a1a" stroke="#27ae60" stroke-width="1.5"/>
    <path d="M105 100 Q115 95 120 105 Q115 115 105 108" fill="#1a3a1a" stroke="#27ae60" stroke-width="1.5"/>
  </svg>`,

  boss_cisha: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" width="120" height="200">
    <!-- Dark armor body -->
    <rect x="22" y="75" width="76" height="100" rx="6" fill="#0a0a0a" stroke="#8b0000" stroke-width="3"/>
    <!-- Chest skull plate -->
    <rect x="30" y="82" width="60" height="45" rx="5" fill="#1a0a0a" stroke="#8b0000" stroke-width="2"/>
    <!-- Skull symbol -->
    <circle cx="60" cy="96" r="12" fill="#0a0a0a" stroke="#ff0000" stroke-width="2"/>
    <circle cx="55" cy="93" r="3.5" fill="#ff0000"/>
    <circle cx="65" cy="93" r="3.5" fill="#ff0000"/>
    <path d="M52 103 L56 100 L60 104 L64 100 L68 103" stroke="#ff0000" stroke-width="1.5" fill="none"/>
    <!-- Helm -->
    <rect x="28" y="20" width="64" height="42" rx="6" fill="#0a0a0a" stroke="#8b0000" stroke-width="3"/>
    <rect x="32" y="38" width="56" height="10" rx="2" fill="#ff0000" opacity="0.8"/>
    <!-- Demon horns -->
    <path d="M35 22 Q25 8 30 0 Q42 8 40 22" fill="#8b0000" stroke="#ff0000" stroke-width="1.5"/>
    <path d="M85 22 Q95 8 90 0 Q78 8 80 22" fill="#8b0000" stroke="#ff0000" stroke-width="1.5"/>
    <!-- Massive arms/pauldrons -->
    <rect x="0" y="72" width="25" height="20" rx="5" fill="#1a0a0a" stroke="#8b0000" stroke-width="2"/>
    <rect x="95" y="72" width="25" height="20" rx="5" fill="#1a0a0a" stroke="#8b0000" stroke-width="2"/>
    <!-- Gauntlets -->
    <rect x="0" y="90" width="20" height="12" rx="3" fill="#0a0a0a" stroke="#8b0000" stroke-width="1.5"/>
    <rect x="100" y="90" width="20" height="12" rx="3" fill="#0a0a0a" stroke="#8b0000" stroke-width="1.5"/>
    <!-- Scythe blade -->
    <path d="M105 30 Q130 10 125 60 Q110 50 105 30" fill="#4a4a4a" stroke="#c0c0c0" stroke-width="2"/>
    <rect x="118" y="28" width="5" height="130" rx="2" fill="#3d3d3d"/>
    <!-- Legs -->
    <rect x="30" y="170" width="22" height="28" rx="5" fill="#0a0a0a" stroke="#8b0000" stroke-width="2"/>
    <rect x="68" y="170" width="22" height="28" rx="5" fill="#0a0a0a" stroke="#8b0000" stroke-width="2"/>
    <!-- Aura red glow -->
    <circle cx="60" cy="100" r="55" fill="none" stroke="#8b0000" stroke-width="1" opacity="0.25"/>
  </svg>`,

  boss_final: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 200" width="120" height="200">
    <!-- Void body -->
    <ellipse cx="60" cy="115" rx="48" ry="72" fill="#050510" stroke="#4a0080" stroke-width="3"/>
    <!-- Head -->
    <circle cx="60" cy="45" r="35" fill="#05050f" stroke="#7c3aed" stroke-width="3"/>
    <!-- Crown of thorns/spikes -->
    <polygon points="40,12 44,28 48,12" fill="#7c3aed"/>
    <polygon points="52,8 56,24 60,8" fill="#9333ea"/>
    <polygon points="64,8 68,24 72,8" fill="#7c3aed"/>
    <polygon points="76,12 80,28 84,12" fill="#7c3aed"/>
    <!-- Ancient eyes -->
    <ellipse cx="46" cy="42" rx="9" ry="11" fill="#7c3aed"/>
    <ellipse cx="74" cy="42" rx="9" ry="11" fill="#7c3aed"/>
    <ellipse cx="60" cy="38" rx="5" ry="7" fill="#a855f7" opacity="0.6"/>
    <circle cx="46" cy="42" r="4" fill="#e8e8e8"/>
    <circle cx="74" cy="42" r="4" fill="#e8e8e8"/>
    <circle cx="60" cy="38" r="2" fill="#e8e8e8" opacity="0.6"/>
    <!-- Vertical pupils -->
    <rect x="44.5" y="37" width="3" height="10" rx="1.5" fill="#000"/>
    <rect x="72.5" y="37" width="3" height="10" rx="1.5" fill="#000"/>
    <!-- Void mouth -->
    <ellipse cx="60" cy="58" rx="12" ry="8" fill="#000"/>
    <path d="M50 55 Q60 65 70 55" stroke="#7c3aed" stroke-width="2" fill="#000"/>
    <!-- Tentacle arms -->
    <path d="M12 100 Q0 85 2 100 Q0 115 12 108" fill="#050510" stroke="#7c3aed" stroke-width="2"/>
    <path d="M108 100 Q120 85 118 100 Q120 115 108 108" fill="#050510" stroke="#7c3aed" stroke-width="2"/>
    <!-- Void wisps at base -->
    <path d="M30 165 Q20 180 30 195 Q40 180 30 165" fill="#050510" stroke="#7c3aed" stroke-width="1.5" opacity="0.8"/>
    <path d="M90 165 Q100 180 90 195 Q80 180 90 165" fill="#050510" stroke="#7c3aed" stroke-width="1.5" opacity="0.8"/>
    <path d="M60 172 Q50 187 60 197 Q70 187 60 172" fill="#050510" stroke="#7c3aed" stroke-width="1.5"/>
    <!-- Floating runes -->
    <text x="20" y="90" font-size="11" fill="#7c3aed" font-family="sans-serif" opacity="0.7">文</text>
    <text x="90" y="85" font-size="11" fill="#7c3aed" font-family="sans-serif" opacity="0.7">字</text>
    <text x="55" y="78" font-size="11" fill="#9333ea" font-family="sans-serif" opacity="0.5">暗</text>
    <!-- Aura rings -->
    <circle cx="60" cy="45" r="42" fill="none" stroke="#7c3aed" stroke-width="1" opacity="0.3"/>
    <circle cx="60" cy="45" r="50" fill="none" stroke="#7c3aed" stroke-width="0.5" opacity="0.15"/>
    <circle cx="60" cy="115" r="55" fill="none" stroke="#4a0080" stroke-width="1" opacity="0.2"/>
  </svg>`,
};

// Enemy sprites array for random selection in combat
export const ENEMY_SPRITES = [
  SPRITES.enemy_1,
  SPRITES.enemy_2,
  SPRITES.enemy_3,
  SPRITES.enemy_4,
  SPRITES.enemy_5,
];
