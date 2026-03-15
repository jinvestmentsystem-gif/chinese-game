// js/sprites.js — SVG Character Art
// All character SVGs use a 120x160 viewBox, ink-wash / brush-stroke aesthetic.
// Color palette: gold (#d4a017), jade (#2ecc8a), red (#d63031) on dark backgrounds.

export const SPRITES = {

  // ── Player: Young warrior with brush-sword, heroic silhouette ──────────
  player: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <radialGradient id="pg_aura" cx="50%" cy="85%" r="45%">
        <stop offset="0%" stop-color="#2ecc8a" stop-opacity="0.35"/>
        <stop offset="100%" stop-color="#2ecc8a" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="pg_body" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1a2540"/>
        <stop offset="100%" stop-color="#0d1520"/>
      </linearGradient>
      <linearGradient id="pg_sash" x1="0%" y1="0%" x2="100%" y2="0%">
        <stop offset="0%" stop-color="#d4a017"/>
        <stop offset="50%" stop-color="#f0c040"/>
        <stop offset="100%" stop-color="#d4a017"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="152" rx="38" ry="7" fill="url(#pg_aura)"/>
    <rect x="46" y="110" width="10" height="38" rx="4" fill="#1a2540"/>
    <rect x="64" y="110" width="10" height="38" rx="4" fill="#131d30"/>
    <ellipse cx="51" cy="147" rx="8" ry="4" fill="#0d1520"/>
    <ellipse cx="69" cy="147" rx="8" ry="4" fill="#0d1520"/>
    <path d="M35 70 Q30 95 32 130 L55 130 L60 108 L65 130 L88 130 Q90 95 85 70 Z" fill="url(#pg_body)"/>
    <path d="M50 75 Q48 100 50 128" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" fill="none"/>
    <path d="M70 75 Q72 100 70 128" stroke="rgba(255,255,255,0.08)" stroke-width="1.5" fill="none"/>
    <rect x="34" y="92" width="52" height="7" rx="2" fill="url(#pg_sash)" opacity="0.9"/>
    <path d="M52 70 L60 78 L68 70" stroke="#d4a017" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M35 75 Q20 72 16 82" stroke="#1a2540" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M35 75 Q20 72 16 82" stroke="#131d30" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M85 75 Q100 65 106 50" stroke="#1a2540" stroke-width="9" stroke-linecap="round" fill="none"/>
    <path d="M85 75 Q100 65 106 50" stroke="#131d30" stroke-width="7" stroke-linecap="round" fill="none"/>
    <line x1="104" y1="52" x2="116" y2="16" stroke="#c8d8ff" stroke-width="2.5" stroke-linecap="round" opacity="0.9"/>
    <line x1="104" y1="52" x2="116" y2="16" stroke="#d4a017" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
    <path d="M116 16 Q117 20 115 24" stroke="#1a2880" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="106" cy="49" rx="5" ry="3" fill="#d4a017" transform="rotate(-65 106 49)"/>
    <ellipse cx="60" cy="52" rx="17" ry="20" fill="#c8a87a"/>
    <path d="M48 52 Q52 58 60 60 Q68 58 72 52" fill="rgba(0,0,0,0.12)"/>
    <ellipse cx="53" cy="48" rx="3.5" ry="3" fill="#1a1010"/>
    <ellipse cx="67" cy="48" rx="3.5" ry="3" fill="#1a1010"/>
    <circle cx="54" cy="47" r="1.2" fill="white" opacity="0.8"/>
    <circle cx="68" cy="47" r="1.2" fill="white" opacity="0.8"/>
    <path d="M49 43 Q53 41 57 43" stroke="#3a2510" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M63 43 Q67 41 71 43" stroke="#3a2510" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M57 57 Q60 59 63 57" stroke="#8a5540" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <ellipse cx="60" cy="34" rx="14" ry="12" fill="#1a1010"/>
    <path d="M54 28 Q60 22 66 28" fill="#2a1a08"/>
    <rect x="57" y="22" width="6" height="2" rx="1" fill="#d4a017" transform="rotate(-10 60 23)"/>
    <path d="M44 40 Q60 37 76 40" stroke="#d4a017" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <rect x="25" y="30" width="70" height="125" rx="8" fill="none" stroke="#2ecc8a" stroke-width="0.8" stroke-dasharray="3 4" opacity="0.25"/>
  </svg>`,

  // ── Enemy: 墨灵 — Ink Spirit Blob ─────────────────────────────────────
  enemy_moling: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <radialGradient id="ml_body" cx="50%" cy="60%" r="50%">
        <stop offset="0%" stop-color="#1a1035"/>
        <stop offset="60%" stop-color="#0a0820"/>
        <stop offset="100%" stop-color="#050412"/>
      </radialGradient>
      <radialGradient id="ml_glow" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#6a0dad" stop-opacity="0.5"/>
        <stop offset="100%" stop-color="#6a0dad" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="150" rx="32" ry="8" fill="rgba(60,0,80,0.5)"/>
    <ellipse cx="60" cy="95" rx="42" ry="50" fill="url(#ml_glow)" opacity="0.6"/>
    <path d="M42 125 Q36 132 38 142" stroke="#0a0820" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M60 130 Q58 138 60 148" stroke="#0a0820" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path d="M78 125 Q84 133 82 143" stroke="#0a0820" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M34 110 Q26 118 28 130" stroke="#0d0a25" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M86 110 Q94 118 92 130" stroke="#0d0a25" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M22 95 Q18 60 30 45 Q42 28 60 30 Q78 28 90 45 Q102 60 98 95 Q95 120 60 128 Q25 120 22 95 Z" fill="url(#ml_body)"/>
    <path d="M30 80 Q50 70 90 80" stroke="rgba(106,13,173,0.3)" stroke-width="1.5" fill="none"/>
    <path d="M26 95 Q50 85 94 95" stroke="rgba(106,13,173,0.25)" stroke-width="1.5" fill="none"/>
    <ellipse cx="46" cy="68" rx="9" ry="10" fill="#0a0820"/>
    <ellipse cx="74" cy="68" rx="9" ry="10" fill="#0a0820"/>
    <ellipse cx="46" cy="68" rx="6" ry="7" fill="#6a0dad"/>
    <ellipse cx="74" cy="68" rx="6" ry="7" fill="#6a0dad"/>
    <ellipse cx="46" cy="68" rx="3.5" ry="4" fill="#b060ff"/>
    <ellipse cx="74" cy="68" rx="3.5" ry="4" fill="#b060ff"/>
    <circle cx="47" cy="66" r="1.5" fill="white" opacity="0.9"/>
    <circle cx="75" cy="66" r="1.5" fill="white" opacity="0.9"/>
    <path d="M44 88 Q60 98 76 88" stroke="rgba(106,13,173,0.6)" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <circle cx="35" cy="55" r="3" fill="rgba(106,13,173,0.3)"/>
    <circle cx="85" cy="52" r="2.5" fill="rgba(106,13,173,0.3)"/>
    <path d="M44 30 Q42 18 46 12" stroke="#6a0dad" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
    <path d="M60 28 Q60 15 60 8" stroke="#8020c0" stroke-width="3" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M76 30 Q78 18 74 12" stroke="#6a0dad" stroke-width="2.5" fill="none" stroke-linecap="round" opacity="0.7"/>
    <circle cx="46" cy="12" r="3" fill="#b060ff" opacity="0.8"/>
    <circle cx="60" cy="8" r="4" fill="#c080ff" opacity="0.9"/>
    <circle cx="74" cy="12" r="3" fill="#b060ff" opacity="0.8"/>
  </svg>`,

  // ── Enemy: 暗字兵 — Dark Character Soldier ────────────────────────────
  enemy_guard: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <linearGradient id="eg_armor" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1c1c2e"/>
        <stop offset="100%" stop-color="#0a0a14"/>
      </linearGradient>
      <linearGradient id="eg_glyph" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#d63031"/>
        <stop offset="100%" stop-color="#7a0000"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="153" rx="32" ry="6" fill="rgba(0,0,0,0.5)"/>
    <rect x="45" y="112" width="12" height="36" rx="3" fill="#12121e"/>
    <rect x="63" y="112" width="12" height="36" rx="3" fill="#0a0a14"/>
    <rect x="43" y="140" width="16" height="10" rx="3" fill="#1c1c2e"/>
    <rect x="61" y="140" width="16" height="10" rx="3" fill="#141420"/>
    <path d="M45 142 Q50 140 57 142" stroke="rgba(214,48,49,0.4)" stroke-width="1.5" fill="none"/>
    <path d="M63 142 Q68 140 75 142" stroke="rgba(214,48,49,0.4)" stroke-width="1.5" fill="none"/>
    <path d="M34 68 Q30 90 32 120 L55 120 L60 105 L65 120 L88 120 Q90 90 86 68 Z" fill="url(#eg_armor)"/>
    <path d="M38 72 L44 88 L55 88 L55 72 Z" fill="#16162a" stroke="rgba(214,48,49,0.35)" stroke-width="1"/>
    <path d="M82 72 L76 88 L65 88 L65 72 Z" fill="#12121e" stroke="rgba(214,48,49,0.35)" stroke-width="1"/>
    <text x="60" y="106" text-anchor="middle" font-size="18" font-family="serif" fill="url(#eg_glyph)" opacity="0.85">暗</text>
    <circle cx="60" cy="100" r="14" fill="rgba(214,48,49,0.08)"/>
    <ellipse cx="33" cy="70" rx="10" ry="7" fill="#1c1c2e" stroke="rgba(214,48,49,0.3)" stroke-width="1"/>
    <ellipse cx="87" cy="70" rx="10" ry="7" fill="#16162a" stroke="rgba(214,48,49,0.3)" stroke-width="1"/>
    <polygon points="26,62 30,68 23,70" fill="#d63031" opacity="0.7"/>
    <polygon points="94,62 90,68 97,70" fill="#d63031" opacity="0.7"/>
    <path d="M34 72 Q18 78 14 88" stroke="#1c1c2e" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M34 72 Q18 78 14 88" stroke="#12121e" stroke-width="7" stroke-linecap="round" fill="none"/>
    <path d="M8 80 Q4 90 8 104 Q14 112 20 108 Q26 104 22 90 Z" fill="#1c1c2e" stroke="#d63031" stroke-width="1.5"/>
    <path d="M14 86 L14 102" stroke="rgba(214,48,49,0.5)" stroke-width="1.5" fill="none"/>
    <path d="M10 94 L18 94" stroke="rgba(214,48,49,0.5)" stroke-width="1.5" fill="none"/>
    <path d="M86 72 Q100 68 106 58" stroke="#1c1c2e" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M86 72 Q100 68 106 58" stroke="#12121e" stroke-width="7" stroke-linecap="round" fill="none"/>
    <line x1="105" y1="60" x2="118" y2="22" stroke="#2a2a4a" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="106" y1="59" x2="118" y2="22" stroke="#d63031" stroke-width="1.5" stroke-linecap="round" opacity="0.8"/>
    <rect x="54" y="60" width="12" height="12" rx="3" fill="#1c1c2e"/>
    <path d="M38 54 Q40 32 60 28 Q80 32 82 54 Z" fill="#141420"/>
    <path d="M60 28 Q58 18 60 10 Q62 18 60 28" fill="#d63031" opacity="0.9"/>
    <path d="M40 54 Q50 58 60 57 Q70 58 80 54" stroke="rgba(214,48,49,0.4)" stroke-width="2" fill="rgba(0,0,0,0.6)"/>
    <rect x="44" y="50" width="32" height="5" rx="2" fill="rgba(0,0,0,0.8)"/>
    <ellipse cx="52" cy="52" rx="5" ry="2" fill="#d63031" opacity="0.7"/>
    <ellipse cx="68" cy="52" rx="5" ry="2" fill="#d63031" opacity="0.7"/>
    <path d="M36 88 L84 88" stroke="rgba(214,48,49,0.25)" stroke-width="1" fill="none"/>
  </svg>`,

  // ── Enemy: 墨影卫 — Shadow Guard ──────────────────────────────────────
  enemy_shadow: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <radialGradient id="sw_core" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#1a0a30"/>
        <stop offset="100%" stop-color="#05030e"/>
      </radialGradient>
      <linearGradient id="sw_cloak" x1="0%" y1="0%" x2="50%" y2="100%">
        <stop offset="0%" stop-color="#0e0820"/>
        <stop offset="100%" stop-color="#030208"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="152" rx="36" ry="8" fill="rgba(20,0,40,0.6)"/>
    <ellipse cx="60" cy="152" rx="26" ry="5" fill="rgba(40,0,60,0.4)"/>
    <path d="M20 65 Q15 95 18 140 Q35 148 60 150 Q85 148 102 140 Q105 95 100 65 Q80 58 60 56 Q40 58 20 65 Z" fill="url(#sw_cloak)"/>
    <path d="M35 68 Q32 100 34 138 Q45 144 60 145 Q75 144 86 138 Q88 100 85 68 Z" fill="rgba(20,8,40,0.6)"/>
    <path d="M28 80 Q32 110 30 140" stroke="rgba(80,0,120,0.2)" stroke-width="2" fill="none"/>
    <path d="M92 80 Q88 110 90 140" stroke="rgba(80,0,120,0.2)" stroke-width="2" fill="none"/>
    <ellipse cx="60" cy="95" rx="22" ry="32" fill="url(#sw_core)"/>
    <path d="M34 58 Q36 28 60 24 Q84 28 86 58 Q80 66 60 68 Q40 66 34 58 Z" fill="#0e0820"/>
    <path d="M38 55 Q40 35 60 30 Q80 35 82 55" fill="rgba(0,0,0,0.5)"/>
    <ellipse cx="60" cy="52" rx="14" ry="16" fill="rgba(0,0,0,0.7)"/>
    <ellipse cx="52" cy="50" rx="5" ry="4" fill="#00ffcc" opacity="0.15"/>
    <ellipse cx="68" cy="50" rx="5" ry="4" fill="#00ffcc" opacity="0.15"/>
    <ellipse cx="52" cy="50" rx="3.5" ry="3" fill="#00ffcc" opacity="0.7"/>
    <ellipse cx="68" cy="50" rx="3.5" ry="3" fill="#00ffcc" opacity="0.7"/>
    <ellipse cx="52" cy="50" rx="2" ry="1.8" fill="#80ffee" opacity="0.95"/>
    <ellipse cx="68" cy="50" rx="2" ry="1.8" fill="#80ffee" opacity="0.95"/>
    <path d="M53 60 Q60 64 67 60" stroke="rgba(0,255,204,0.25)" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M36 75 Q18 72 10 62" stroke="#0e0820" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M36 75 Q18 72 10 62" stroke="#050310" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M84 75 Q102 72 110 62" stroke="#0e0820" stroke-width="11" stroke-linecap="round" fill="none"/>
    <path d="M84 75 Q102 72 110 62" stroke="#050310" stroke-width="8" stroke-linecap="round" fill="none"/>
    <path d="M10 62 Q6 57 8 54" stroke="#050310" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M10 62 Q8 56 12 52" stroke="#050310" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M10 62 Q12 56 16 54" stroke="#050310" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M110 62 Q114 57 112 54" stroke="#050310" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M110 62 Q112 56 108 52" stroke="#050310" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <path d="M110 62 Q108 56 104 54" stroke="#050310" stroke-width="2.5" stroke-linecap="round" fill="none"/>
    <text x="60" y="105" text-anchor="middle" font-size="11" font-family="serif" fill="rgba(0,255,204,0.2)">影</text>
    <text x="47" y="118" text-anchor="middle" font-size="9" font-family="serif" fill="rgba(0,255,204,0.15)">暗</text>
    <text x="73" y="118" text-anchor="middle" font-size="9" font-family="serif" fill="rgba(0,255,204,0.15)">煞</text>
  </svg>`,

  // ── Boss: 仓颉之影 — Shadow of Cangjie ────────────────────────────────
  boss_cangjie: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <radialGradient id="cj_bg" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#2a1a00" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#2a1a00" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="cj_robe" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#1a0800"/>
        <stop offset="50%" stop-color="#2d1200"/>
        <stop offset="100%" stop-color="#110600"/>
      </linearGradient>
      <linearGradient id="cj_scroll" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#c8a060"/>
        <stop offset="100%" stop-color="#7a5820"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="80" rx="55" ry="65" fill="url(#cj_bg)" opacity="0.7"/>
    <ellipse cx="60" cy="154" rx="40" ry="7" fill="rgba(100,60,0,0.45)"/>
    <text x="12" y="35" font-size="10" font-family="serif" fill="#d4a017" opacity="0.7" transform="rotate(-20 12 35)">文</text>
    <text x="96" y="28" font-size="10" font-family="serif" fill="#d4a017" opacity="0.65" transform="rotate(15 96 28)">字</text>
    <text x="8" y="90" font-size="10" font-family="serif" fill="#d4a017" opacity="0.55" transform="rotate(-8 8 90)">古</text>
    <text x="102" y="85" font-size="10" font-family="serif" fill="#d4a017" opacity="0.6" transform="rotate(10 102 85)">書</text>
    <path d="M36 120 Q30 138 28 155 L54 155 L60 140 L66 155 L92 155 Q90 138 84 120 Z" fill="#110600"/>
    <path d="M22 62 Q16 88 18 130 L50 130 L60 108 L70 130 L102 130 Q104 88 98 62 Q80 54 60 52 Q40 54 22 62 Z" fill="url(#cj_robe)"/>
    <text x="42" y="82" font-size="10" font-family="serif" fill="rgba(212,160,23,0.12)">仓</text>
    <text x="66" y="82" font-size="10" font-family="serif" fill="rgba(212,160,23,0.12)">颉</text>
    <path d="M22 62 Q60 54 98 62" stroke="#d4a017" stroke-width="2" fill="none" opacity="0.6"/>
    <rect x="30" y="104" width="60" height="9" rx="3" fill="#2a1800" stroke="#d4a017" stroke-width="1" opacity="0.8"/>
    <path d="M22 68 Q8 72 4 84" stroke="#1a0800" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M22 68 Q8 72 4 84" stroke="#100400" stroke-width="9" stroke-linecap="round" fill="none"/>
    <rect x="-2" y="80" width="14" height="28" rx="4" fill="url(#cj_scroll)"/>
    <rect x="-1" y="79" width="12" height="4" rx="2" fill="#c8a060"/>
    <rect x="-1" y="106" width="12" height="4" rx="2" fill="#c8a060"/>
    <line x1="2" y1="85" x2="9" y2="85" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    <line x1="2" y1="88" x2="9" y2="88" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    <line x1="2" y1="91" x2="9" y2="91" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    <path d="M98 68 Q112 70 116 60" stroke="#1a0800" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M98 68 Q112 70 116 60" stroke="#100400" stroke-width="9" stroke-linecap="round" fill="none"/>
    <line x1="115" y1="62" x2="118" y2="12" stroke="#5a3a10" stroke-width="4" stroke-linecap="round"/>
    <ellipse cx="118" cy="12" rx="4" ry="6" fill="#1a1a40" transform="rotate(-5 118 12)"/>
    <ellipse cx="118" cy="15" rx="2" ry="3" fill="#6060c0" opacity="0.8"/>
    <rect x="53" y="50" width="14" height="14" rx="4" fill="#180a04"/>
    <ellipse cx="60" cy="40" rx="20" ry="22" fill="#b08060"/>
    <path d="M48 38 Q52 36 56 38" stroke="rgba(0,0,0,0.2)" stroke-width="1" fill="none"/>
    <path d="M64 38 Q68 36 72 38" stroke="rgba(0,0,0,0.2)" stroke-width="1" fill="none"/>
    <ellipse cx="46" cy="36" rx="5" ry="4.5" fill="#ffd080"/>
    <ellipse cx="74" cy="36" rx="5" ry="4.5" fill="#ffd080"/>
    <ellipse cx="50" cy="44" rx="4" ry="3.5" fill="#ffd080"/>
    <ellipse cx="70" cy="44" rx="4" ry="3.5" fill="#ffd080"/>
    <circle cx="46" cy="36" r="2.5" fill="#d4a017"/>
    <circle cx="74" cy="36" r="2.5" fill="#d4a017"/>
    <circle cx="50" cy="44" r="2" fill="#d4a017"/>
    <circle cx="70" cy="44" r="2" fill="#d4a017"/>
    <circle cx="46" cy="36" r="1.2" fill="#2a1000"/>
    <circle cx="74" cy="36" r="1.2" fill="#2a1000"/>
    <circle cx="50" cy="44" r="1" fill="#2a1000"/>
    <circle cx="70" cy="44" r="1" fill="#2a1000"/>
    <path d="M44 52 Q40 60 42 70 Q50 78 60 80 Q70 78 78 70 Q80 60 76 52 Q68 58 60 58 Q52 58 44 52 Z" fill="rgba(255,255,255,0.12)"/>
    <path d="M50 55 Q48 65 50 72" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none"/>
    <path d="M60 58 Q60 68 60 75" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none"/>
    <path d="M70 55 Q72 65 70 72" stroke="rgba(255,255,255,0.3)" stroke-width="1.5" fill="none"/>
    <path d="M40 24 Q42 10 60 6 Q78 10 80 24" fill="#1a0800"/>
    <path d="M40 24 Q42 10 60 6 Q78 10 80 24 Q68 20 60 20 Q52 20 40 24" fill="#2a1400"/>
    <ellipse cx="60" cy="8" rx="6" ry="5" fill="#d4a017" opacity="0.9"/>
    <ellipse cx="60" cy="8" rx="3" ry="2.5" fill="#f0c040"/>
    <line x1="44" y1="20" x2="38" y2="10" stroke="#d4a017" stroke-width="2" stroke-linecap="round"/>
    <line x1="60" y1="18" x2="60" y2="4" stroke="#d4a017" stroke-width="2.5" stroke-linecap="round"/>
    <line x1="76" y1="20" x2="82" y2="10" stroke="#d4a017" stroke-width="2" stroke-linecap="round"/>
  </svg>`,

  // ── Boss: 墨吏 — Ink Official ─────────────────────────────────────────
  boss_moli: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <linearGradient id="mo_robe" x1="0%" y1="0%" x2="80%" y2="100%">
        <stop offset="0%" stop-color="#0a1a0a"/>
        <stop offset="100%" stop-color="#050e05"/>
      </linearGradient>
      <radialGradient id="mo_ink" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#001800" stop-opacity="0.6"/>
        <stop offset="100%" stop-color="#001800" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="90" rx="50" ry="60" fill="url(#mo_ink)" opacity="0.5"/>
    <ellipse cx="60" cy="154" rx="34" ry="6" fill="rgba(0,30,0,0.5)"/>
    <path d="M18 58 Q12 90 14 138 L46 138 L60 118 L74 138 L106 138 Q108 90 102 58 Q82 50 60 48 Q38 50 18 58 Z" fill="url(#mo_robe)"/>
    <circle cx="36" cy="88" r="14" fill="rgba(0,0,0,0.4)"/>
    <circle cx="82" cy="95" r="12" fill="rgba(0,0,0,0.35)"/>
    <path d="M28 130 Q24 140 26 148" stroke="#010a01" stroke-width="4" fill="none" stroke-linecap="round"/>
    <path d="M48 135 Q46 143 48 150" stroke="#010a01" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M72 135 Q74 143 72 150" stroke="#010a01" stroke-width="3.5" fill="none" stroke-linecap="round"/>
    <path d="M92 130 Q96 140 94 148" stroke="#010a01" stroke-width="4" fill="none" stroke-linecap="round"/>
    <rect x="24" y="100" width="72" height="10" rx="4" fill="#0a1a0a" stroke="rgba(138,43,226,0.5)" stroke-width="1.5"/>
    <circle cx="60" cy="105" r="7" fill="#0a0a1a" stroke="rgba(138,43,226,0.7)" stroke-width="1.5"/>
    <text x="60" y="108" text-anchor="middle" font-size="8" font-family="serif" fill="rgba(138,43,226,0.8)">墨</text>
    <ellipse cx="20" cy="68" rx="10" ry="7" fill="#0c1c0c" stroke="rgba(0,180,0,0.2)" stroke-width="1"/>
    <ellipse cx="100" cy="68" rx="10" ry="7" fill="#0a1a0a" stroke="rgba(0,180,0,0.2)" stroke-width="1"/>
    <path d="M18 62 Q4 68 0 80" stroke="#0a1a0a" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M18 62 Q4 68 0 80" stroke="#050e05" stroke-width="9" stroke-linecap="round" fill="none"/>
    <rect x="-8" y="78" width="16" height="16" rx="2" fill="#8a2be2"/>
    <rect x="-6" y="80" width="12" height="12" rx="1" fill="#6020b0"/>
    <text x="0" y="89" text-anchor="middle" font-size="9" font-family="serif" fill="rgba(255,200,255,0.9)">令</text>
    <path d="M102 62 Q114 65 118 75" stroke="#0a1a0a" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M102 62 Q114 65 118 75" stroke="#050e05" stroke-width="9" stroke-linecap="round" fill="none"/>
    <line x1="118" y1="74" x2="118" y2="110" stroke="#3a2010" stroke-width="4" stroke-linecap="round"/>
    <path d="M114 108 Q118 120 122 114 Q120 106 118 110 Q116 106 114 108 Z" fill="#010805"/>
    <circle cx="118" cy="75" r="5" fill="#1a0a00"/>
    <rect x="53" y="46" width="14" height="14" rx="3" fill="#0a1a0a"/>
    <ellipse cx="60" cy="36" rx="20" ry="22" fill="#88a080"/>
    <path d="M44 36 Q50 30 60 28 Q70 30 76 36 Q72 44 60 46 Q48 44 44 36 Z" fill="rgba(0,0,0,0.3)"/>
    <path d="M44 32 Q48 29 54 32 Q48 36 44 32 Z" fill="#00c800" opacity="0.9"/>
    <path d="M66 32 Q72 29 76 32 Q72 36 66 32 Z" fill="#00c800" opacity="0.9"/>
    <ellipse cx="49" cy="32" rx="2.5" ry="2" fill="#004000"/>
    <ellipse cx="71" cy="32" rx="2.5" ry="2" fill="#004000"/>
    <path d="M50 44 Q55 42 60 43 Q65 42 70 44" stroke="#1a1a1a" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M60 43 Q60 47 58 50" stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M60 43 Q60 47 62 50" stroke="#1a1a1a" stroke-width="1.5" fill="none" stroke-linecap="round"/>
    <path d="M40 24 L42 4 L78 4 L80 24 Z" fill="#050e05"/>
    <rect x="36" y="22" width="48" height="6" rx="2" fill="#0a1a0a"/>
    <text x="60" y="17" text-anchor="middle" font-size="11" font-family="serif" fill="rgba(0,200,0,0.5)">吏</text>
  </svg>`,

  // ── Boss: 诗魔 — Poetry Demon ──────────────────────────────────────────
  boss_shimo: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <radialGradient id="sm_aura" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#2a0818" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#2a0818" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="sm_robe" x1="30%" y1="0%" x2="70%" y2="100%">
        <stop offset="0%" stop-color="#1a0010"/>
        <stop offset="50%" stop-color="#2a0820"/>
        <stop offset="100%" stop-color="#100008"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="80" rx="55" ry="65" fill="url(#sm_aura)" opacity="0.8"/>
    <text x="6" y="28" font-size="11" font-family="serif" fill="#ff4080" opacity="0.55" transform="rotate(-25 6 28)">詩</text>
    <text x="98" y="22" font-size="11" font-family="serif" fill="#ff4080" opacity="0.5" transform="rotate(18 98 22)">魔</text>
    <text x="4" y="105" font-size="10" font-family="serif" fill="#d04060" opacity="0.4" transform="rotate(-12 4 105)">風</text>
    <text x="108" y="95" font-size="10" font-family="serif" fill="#d04060" opacity="0.45" transform="rotate(8 108 95)">月</text>
    <ellipse cx="60" cy="154" rx="38" ry="7" fill="rgba(80,0,40,0.5)"/>
    <path d="M8 55 Q2 90 4 148 L40 148 L60 122 L80 148 L116 148 Q118 90 112 55 Q88 44 60 42 Q32 44 8 55 Z" fill="url(#sm_robe)"/>
    <path d="M14 70 Q18 100 16 145" stroke="rgba(220,60,100,0.15)" stroke-width="2" fill="none"/>
    <path d="M106 70 Q102 100 104 145" stroke="rgba(220,60,100,0.15)" stroke-width="2" fill="none"/>
    <text x="36" y="88" font-size="9" font-family="serif" fill="rgba(255,64,128,0.12)">床前明月光</text>
    <text x="40" y="105" font-size="9" font-family="serif" fill="rgba(255,64,128,0.1)">疑是地上霜</text>
    <rect x="24" y="94" width="72" height="8" rx="2" fill="#3a0010" stroke="rgba(255,64,128,0.4)" stroke-width="1"/>
    <path d="M8 60 Q-6 66 -8 80" stroke="#1a0010" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M8 60 Q-6 66 -8 80" stroke="#100008" stroke-width="10" stroke-linecap="round" fill="none"/>
    <path d="M-8 80 Q-14 90 -10 100 Q-4 108 0 104 Q-2 96 -8 80 Z" fill="#1a0010" opacity="0.8"/>
    <path d="M112 60 Q126 62 130 50" stroke="#1a0010" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M112 60 Q126 62 130 50" stroke="#100008" stroke-width="10" stroke-linecap="round" fill="none"/>
    <rect x="122" y="32" width="14" height="32" rx="4" fill="#e8c880"/>
    <rect x="123" y="31" width="12" height="4" rx="2" fill="#c8a040"/>
    <rect x="123" y="62" width="12" height="4" rx="2" fill="#c8a040"/>
    <line x1="126" y1="38" x2="133" y2="38" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
    <line x1="126" y1="42" x2="133" y2="42" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
    <line x1="126" y1="46" x2="133" y2="46" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
    <line x1="126" y1="50" x2="133" y2="50" stroke="rgba(0,0,0,0.5)" stroke-width="1"/>
    <ellipse cx="129" cy="48" rx="10" ry="14" fill="rgba(255,200,0,0.15)"/>
    <rect x="53" y="40" width="14" height="14" rx="3" fill="#1a0010"/>
    <ellipse cx="60" cy="30" rx="20" ry="22" fill="#a06070"/>
    <path d="M40 20 Q30 8 34 -2 Q40 5 42 18" fill="#1a0010"/>
    <path d="M80 20 Q90 8 86 -2 Q80 5 78 18" fill="#1a0010"/>
    <path d="M44 16 Q36 2 40 -4" stroke="#1a0010" stroke-width="3" fill="none" stroke-linecap="round"/>
    <path d="M50 14 Q46 0 50 -6" stroke="#1a0010" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M70 14 Q74 0 70 -6" stroke="#1a0010" stroke-width="2.5" fill="none" stroke-linecap="round"/>
    <path d="M76 16 Q84 2 80 -4" stroke="#1a0010" stroke-width="3" fill="none" stroke-linecap="round"/>
    <ellipse cx="50" cy="27" rx="7" ry="6" fill="white" opacity="0.95"/>
    <ellipse cx="70" cy="27" rx="7" ry="6" fill="white" opacity="0.95"/>
    <ellipse cx="50" cy="27" rx="5" ry="5" fill="#cc0040"/>
    <ellipse cx="70" cy="27" rx="5" ry="5" fill="#cc0040"/>
    <circle cx="50" cy="27" r="2.5" fill="#1a0000"/>
    <circle cx="70" cy="27" r="2.5" fill="#1a0000"/>
    <circle cx="51" cy="26" r="1.2" fill="white" opacity="0.9"/>
    <circle cx="71" cy="26" r="1.2" fill="white" opacity="0.9"/>
    <path d="M44 40 Q52 48 60 46 Q68 48 76 40" stroke="#6a0010" stroke-width="2" fill="rgba(100,0,20,0.5)" stroke-linecap="round"/>
    <path d="M50 42 L50 44" stroke="rgba(255,220,220,0.6)" stroke-width="1.5"/>
    <path d="M55 43 L55 45" stroke="rgba(255,220,220,0.6)" stroke-width="1.5"/>
    <path d="M60 44 L60 46" stroke="rgba(255,220,220,0.6)" stroke-width="1.5"/>
    <path d="M65 43 L65 45" stroke="rgba(255,220,220,0.6)" stroke-width="1.5"/>
    <path d="M70 42 L70 44" stroke="rgba(255,220,220,0.6)" stroke-width="1.5"/>
  </svg>`,

  // ── Boss: 词煞 — Ci Fiend ─────────────────────────────────────────────
  boss_cisha: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <radialGradient id="ci_aura" cx="50%" cy="50%" r="50%">
        <stop offset="0%" stop-color="#001428" stop-opacity="0.7"/>
        <stop offset="100%" stop-color="#001428" stop-opacity="0"/>
      </radialGradient>
      <linearGradient id="ci_armor" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="#001c30"/>
        <stop offset="100%" stop-color="#000c18"/>
      </linearGradient>
      <linearGradient id="ci_jade" x1="0%" y1="0%" x2="0%" y2="100%">
        <stop offset="0%" stop-color="#2ecc8a"/>
        <stop offset="100%" stop-color="#0a5a30"/>
      </linearGradient>
    </defs>
    <ellipse cx="60" cy="85" rx="50" ry="58" fill="url(#ci_aura)" opacity="0.7"/>
    <text x="8" y="32" font-size="11" font-family="serif" fill="#2ecc8a" opacity="0.5" transform="rotate(-18 8 32)">詞</text>
    <text x="100" y="25" font-size="11" font-family="serif" fill="#2ecc8a" opacity="0.45" transform="rotate(14 100 25)">煞</text>
    <ellipse cx="60" cy="154" rx="36" ry="7" fill="rgba(0,60,40,0.5)"/>
    <path d="M24 62 Q18 92 20 136 L50 136 L60 115 L70 136 L100 136 Q102 92 96 62 Q80 52 60 50 Q40 52 24 62 Z" fill="url(#ci_armor)"/>
    <path d="M30 66 L30 86 L44 86 L44 66 Z" fill="rgba(0,28,48,0.8)" stroke="rgba(46,204,138,0.25)" stroke-width="1"/>
    <path d="M90 66 L90 86 L76 86 L76 66 Z" fill="rgba(0,22,38,0.8)" stroke="rgba(46,204,138,0.25)" stroke-width="1"/>
    <path d="M44 86 L44 106 L76 106 L76 86 L60 82 Z" fill="rgba(0,24,42,0.8)" stroke="rgba(46,204,138,0.2)" stroke-width="1"/>
    <path d="M52 82 Q60 78 68 82 Q68 98 60 102 Q52 98 52 82 Z" fill="url(#ci_jade)" opacity="0.8"/>
    <text x="60" y="95" text-anchor="middle" font-size="10" font-family="serif" fill="rgba(0,0,0,0.7)">煞</text>
    <path d="M22 64 Q12 58 10 68 Q8 78 18 80 Q28 76 24 64 Z" fill="url(#ci_armor)" stroke="rgba(46,204,138,0.3)" stroke-width="1"/>
    <path d="M98 64 Q108 58 110 68 Q112 78 102 80 Q92 76 96 64 Z" fill="url(#ci_armor)" stroke="rgba(46,204,138,0.3)" stroke-width="1"/>
    <rect x="26" y="106" width="68" height="9" rx="3" fill="#003c20" stroke="rgba(46,204,138,0.5)" stroke-width="1.5"/>
    <path d="M24 66 Q10 70 6 82" stroke="url(#ci_armor)" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M24 66 Q10 70 6 82" stroke="#000c18" stroke-width="9" stroke-linecap="round" fill="none"/>
    <rect x="-2" y="80" width="16" height="22" rx="3" fill="url(#ci_jade)"/>
    <path d="M0 84 L12 84" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    <path d="M0 88 L12 88" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    <path d="M0 92 L12 92" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    <path d="M0 96 L12 96" stroke="rgba(0,0,0,0.4)" stroke-width="1"/>
    <path d="M96 66 Q108 62 114 52" stroke="url(#ci_armor)" stroke-width="12" stroke-linecap="round" fill="none"/>
    <path d="M96 66 Q108 62 114 52" stroke="#000c18" stroke-width="9" stroke-linecap="round" fill="none"/>
    <line x1="113" y1="54" x2="120" y2="14" stroke="#001c30" stroke-width="3.5" stroke-linecap="round"/>
    <line x1="113" y1="54" x2="120" y2="14" stroke="#2ecc8a" stroke-width="1.5" stroke-linecap="round" opacity="0.7"/>
    <path d="M109 54 L117 50" stroke="#2ecc8a" stroke-width="3" stroke-linecap="round"/>
    <rect x="53" y="48" width="14" height="14" rx="3" fill="#001428"/>
    <ellipse cx="60" cy="38" rx="19" ry="22" fill="#78a090"/>
    <path d="M44 36 Q52 30 60 28 Q68 30 76 36" fill="rgba(0,20,30,0.2)"/>
    <path d="M45 32 Q49 28 55 30 Q49 35 45 32 Z" fill="#2ecc8a" opacity="0.85"/>
    <path d="M65 32 Q71 28 75 30 Q71 35 65 32 Z" fill="#2ecc8a" opacity="0.85"/>
    <circle cx="50" cy="32" r="2" fill="#003020"/>
    <circle cx="70" cy="32" r="2" fill="#003020"/>
    <path d="M44 26 Q50 23 55 25" stroke="#0a2820" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M65 25 Q70 23 76 26" stroke="#0a2820" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M52 44 Q60 46 68 44" stroke="#3a5850" stroke-width="2" fill="none" stroke-linecap="round"/>
    <path d="M42 26 Q44 6 60 4 Q76 6 78 26" fill="#001428"/>
    <path d="M42 26 Q44 6 60 4 Q76 6 78 26 Q68 22 60 22 Q52 22 42 26" fill="#002038"/>
    <path d="M60 4 Q58 -4 60 -8 Q62 -4 60 4" fill="#2ecc8a" opacity="0.9"/>
    <path d="M42 26 Q60 22 78 26" stroke="#2ecc8a" stroke-width="1.5" fill="none" opacity="0.7"/>
    <path d="M44 18 Q36 12 38 6" stroke="#2ecc8a" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
    <path d="M76 18 Q84 12 82 6" stroke="#2ecc8a" stroke-width="2" fill="none" stroke-linecap="round" opacity="0.6"/>
  </svg>`,

  // ── Boss: 墨暗之主 — Lord of Ink Darkness (Final Boss) ───────────────
  boss_final: `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 160" width="120" height="160">
    <defs>
      <radialGradient id="fl_core" cx="50%" cy="40%" r="55%">
        <stop offset="0%" stop-color="#1a0030"/>
        <stop offset="60%" stop-color="#0a0018"/>
        <stop offset="100%" stop-color="#030008"/>
      </radialGradient>
      <radialGradient id="fl_aura" cx="50%" cy="45%" r="55%">
        <stop offset="0%" stop-color="#3a0060" stop-opacity="0.85"/>
        <stop offset="70%" stop-color="#1a0040" stop-opacity="0.4"/>
        <stop offset="100%" stop-color="#0a0020" stop-opacity="0"/>
      </radialGradient>
    </defs>
    <ellipse cx="60" cy="80" rx="58" ry="72" fill="url(#fl_aura)" opacity="0.9"/>
    <ellipse cx="60" cy="80" rx="44" ry="56" fill="url(#fl_aura)" opacity="0.5"/>
    <text x="4" y="20" font-size="12" font-family="serif" fill="#d4a017" opacity="0.7" transform="rotate(-30 4 20)">文</text>
    <text x="106" y="18" font-size="12" font-family="serif" fill="#d4a017" opacity="0.65" transform="rotate(25 106 18)">字</text>
    <text x="2" y="80" font-size="11" font-family="serif" fill="#9060ff" opacity="0.6">侠</text>
    <text x="110" y="75" font-size="11" font-family="serif" fill="#9060ff" opacity="0.55">暗</text>
    <text x="10" y="138" font-size="10" font-family="serif" fill="#d4a017" opacity="0.5">墨</text>
    <text x="102" y="132" font-size="10" font-family="serif" fill="#d4a017" opacity="0.5">主</text>
    <ellipse cx="60" cy="156" rx="45" ry="8" fill="rgba(40,0,80,0.7)"/>
    <ellipse cx="60" cy="154" rx="35" ry="5" fill="rgba(70,0,120,0.5)"/>
    <path d="M24 72 Q4 56 -6 36 Q6 44 14 50 Q-2 30 8 14 Q20 30 22 42 Q26 32 30 22 Q38 36 30 52 Q28 60 24 72 Z" fill="#0a0018" opacity="0.9"/>
    <path d="M96 72 Q116 56 126 36 Q114 44 106 50 Q122 30 112 14 Q100 30 98 42 Q94 32 90 22 Q82 36 90 52 Q92 60 96 72 Z" fill="#0a0018" opacity="0.9"/>
    <path d="M14 52 Q20 62 22 72" stroke="rgba(212,160,23,0.2)" stroke-width="1" fill="none"/>
    <path d="M106 52 Q100 62 98 72" stroke="rgba(212,160,23,0.2)" stroke-width="1" fill="none"/>
    <path d="M20 62 Q14 92 16 140 L48 140 L60 116 L72 140 L104 140 Q106 92 100 62 Q82 50 60 48 Q38 50 20 62 Z" fill="url(#fl_core)"/>
    <circle cx="45" cy="80" r="12" fill="rgba(0,0,0,0.5)"/>
    <circle cx="75" cy="84" r="10" fill="rgba(0,0,0,0.45)"/>
    <text x="34" y="80" font-size="11" font-family="serif" fill="rgba(180,100,255,0.4)">暗</text>
    <text x="68" y="86" font-size="11" font-family="serif" fill="rgba(180,100,255,0.35)">墨</text>
    <text x="46" y="110" font-size="11" font-family="serif" fill="rgba(180,100,255,0.3)">主</text>
    <rect x="24" y="102" width="72" height="10" rx="4" fill="#0a0018" stroke="rgba(212,160,23,0.6)" stroke-width="1.5"/>
    <circle cx="60" cy="107" r="9" fill="#0a0018" stroke="#d4a017" stroke-width="2"/>
    <circle cx="60" cy="107" r="5" fill="#d4a017" opacity="0.9"/>
    <text x="60" y="110" text-anchor="middle" font-size="7" font-family="serif" fill="#0a0000">主</text>
    <path d="M20 66 Q4 70 -2 84" stroke="#0a0018" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M20 66 Q4 70 -2 84" stroke="#060010" stroke-width="10" stroke-linecap="round" fill="none"/>
    <circle cx="-4" cy="86" r="12" fill="#0a0018"/>
    <circle cx="-4" cy="86" r="9" fill="#1a0030"/>
    <circle cx="-4" cy="86" r="6" fill="#3a0060"/>
    <circle cx="-4" cy="86" r="3.5" fill="#8000ff" opacity="0.9"/>
    <circle cx="-4" cy="86" r="2" fill="#d0a0ff" opacity="0.95"/>
    <path d="M100 66 Q114 62 120 52" stroke="#0a0018" stroke-width="14" stroke-linecap="round" fill="none"/>
    <path d="M100 66 Q114 62 120 52" stroke="#060010" stroke-width="10" stroke-linecap="round" fill="none"/>
    <line x1="119" y1="54" x2="116" y2="6" stroke="#0a0018" stroke-width="5" stroke-linecap="round"/>
    <line x1="120" y1="52" x2="117" y2="5" stroke="#d4a017" stroke-width="1.8" stroke-linecap="round" opacity="0.8"/>
    <line x1="118" y1="53" x2="115" y2="6" stroke="#8000ff" stroke-width="1.2" stroke-linecap="round" opacity="0.7"/>
    <path d="M115 54 L123 50" stroke="#d4a017" stroke-width="3" stroke-linecap="round" opacity="0.8"/>
    <rect x="53" y="46" width="14" height="14" rx="3" fill="#0a0018"/>
    <ellipse cx="60" cy="36" rx="21" ry="24" fill="#1a0030"/>
    <ellipse cx="60" cy="38" rx="16" ry="18" fill="#0a0020"/>
    <ellipse cx="50" cy="34" rx="7" ry="6" fill="#0a0020"/>
    <ellipse cx="70" cy="34" rx="7" ry="6" fill="#0a0020"/>
    <ellipse cx="50" cy="34" rx="5" ry="4.5" fill="#6000c0" opacity="0.8"/>
    <ellipse cx="70" cy="34" rx="5" ry="4.5" fill="#6000c0" opacity="0.8"/>
    <ellipse cx="50" cy="34" rx="3.5" ry="3" fill="#a040ff" opacity="0.95"/>
    <ellipse cx="70" cy="34" rx="3.5" ry="3" fill="#a040ff" opacity="0.95"/>
    <ellipse cx="50" cy="34" rx="2" ry="1.8" fill="#e0c0ff" opacity="1"/>
    <ellipse cx="70" cy="34" rx="2" ry="1.8" fill="#e0c0ff" opacity="1"/>
    <ellipse cx="60" cy="24" rx="5" ry="4.5" fill="#0a0020"/>
    <ellipse cx="60" cy="24" rx="4" ry="3.5" fill="#d4a017" opacity="0.9"/>
    <ellipse cx="60" cy="24" rx="2.5" ry="2" fill="#f0c040" opacity="1"/>
    <circle cx="60" cy="24" r="1.2" fill="#1a0000"/>
    <path d="M44 48 Q52 56 60 54 Q68 56 76 48" stroke="rgba(160,64,255,0.5)" stroke-width="2" fill="rgba(40,0,80,0.6)" stroke-linecap="round"/>
    <path d="M42 22 Q40 12 36 4" stroke="#d4a017" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <path d="M50 18 Q48 6 50 -2" stroke="#d4a017" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M60 16 Q60 2 60 -6" stroke="#f0c040" stroke-width="4" stroke-linecap="round" fill="none"/>
    <path d="M70 18 Q72 6 70 -2" stroke="#d4a017" stroke-width="3" stroke-linecap="round" fill="none"/>
    <path d="M78 22 Q80 12 84 4" stroke="#d4a017" stroke-width="3.5" stroke-linecap="round" fill="none"/>
    <circle cx="36" cy="4" r="3" fill="#f0c040" opacity="0.9"/>
    <circle cx="50" cy="-2" r="3" fill="#f0c040" opacity="0.9"/>
    <circle cx="60" cy="-6" r="4" fill="#f0c040" opacity="0.95"/>
    <circle cx="70" cy="-2" r="3" fill="#f0c040" opacity="0.9"/>
    <circle cx="84" cy="4" r="3" fill="#f0c040" opacity="0.9"/>
    <path d="M24 138 Q16 148 18 158" stroke="#0a0018" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
    <path d="M60 140 Q58 150 60 160" stroke="#3a0060" stroke-width="4" fill="none" stroke-linecap="round" opacity="0.8"/>
    <path d="M96 138 Q104 148 102 158" stroke="#0a0018" stroke-width="5" fill="none" stroke-linecap="round" opacity="0.9"/>
  </svg>`,

};

// Enemy sprites array for random selection in combat (backward compat)
export const ENEMY_SPRITES = [
  SPRITES.enemy_moling,
  SPRITES.enemy_guard,
  SPRITES.enemy_shadow,
  SPRITES.enemy_moling,
  SPRITES.enemy_shadow,
];
