// js/screens/shop.js — Equipment shop screen
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { getEffectiveStats } from '../progression.js';
import { showTutorial } from '../tutorial.js';
import { showToast } from '../toast.js';

export const SHOP_ITEMS = [
  // Weapons (sorted by tier)
  { id: 'brush-sword-1', name: '毛笔剑', type: 'weapon', price: 50, stats: { attack: 5 }, desc: '以墨为刃的文人之剑', tier: 1 },
  { id: 'brush-sword-2', name: '兰亭笔', type: 'weapon', price: 150, stats: { attack: 10, speed: 3 }, desc: '相传为王羲之所用之笔', tier: 2 },
  { id: 'brush-sword-3', name: '太白剑', type: 'weapon', price: 400, stats: { attack: 18, speed: 5 }, desc: '李白的诗意凝成的利剑', tier: 3 },
  { id: 'brush-sword-4', name: '墨龙笔', type: 'weapon', price: 800, stats: { attack: 25, speed: 8, wenli: 2 }, desc: '传说中的神器，蕴含龙之力', tier: 4 },

  // Armor (sorted by tier)
  { id: 'scroll-shield-1', name: '竹简盾', type: 'armor', price: 50, stats: { defense: 5 }, desc: '刻满经文的护身竹简', tier: 1 },
  { id: 'scroll-shield-2', name: '墨玉甲', type: 'armor', price: 150, stats: { defense: 10, hp: 20 }, desc: '凝练墨气化成的铠甲', tier: 2 },
  { id: 'scroll-shield-3', name: '诗词袍', type: 'armor', price: 400, stats: { defense: 15, wenli: 3, hp: 30 }, desc: '用千年诗词织就的法袍', tier: 3 },
  { id: 'scroll-shield-4', name: '文曲星铠', type: 'armor', price: 800, stats: { defense: 22, hp: 50, wenli: 5 }, desc: '文曲星下凡时留下的神甲', tier: 4 },

  // Accessories (sorted by tier)
  { id: 'pendant-1', name: '文气吊坠', type: 'accessory', price: 80, stats: { critChance: 3 }, desc: '蕴含文字之力的护身吊坠', tier: 1 },
  { id: 'pendant-2', name: '墨玉挂件', type: 'accessory', price: 200, stats: { critChance: 5, wenli: 1 }, desc: '凝聚墨气精华的玉石', tier: 2 },
  { id: 'pendant-3', name: '仓颉之眼', type: 'accessory', price: 500, stats: { critChance: 8, attack: 5 }, desc: '传说中仓颉留下的神秘宝石', tier: 3 },
  { id: 'ring-1', name: '金字戒指', type: 'accessory', price: 120, stats: { speed: 2 }, desc: '刻有金文的速答之戒', tier: 1 },
  { id: 'ring-2', name: '龙纹戒指', type: 'accessory', price: 350, stats: { speed: 4, attack: 3 }, desc: '镌刻龙纹的力量之戒', tier: 2 },

  // Consumables
  { id: 'hp-potion', name: '回春丹', type: 'consumable', price: 20, effect: 'heal_50', desc: '恢复50点生命值', stackable: true },
  { id: 'wenli-potion', name: '灵墨丹', type: 'consumable', price: 30, effect: 'wenli_full', desc: '完全恢复文力', stackable: true },
  { id: 'xp-scroll', name: '经验卷轴', type: 'consumable', price: 40, effect: 'xp_double_next', desc: '下次战斗经验翻倍', stackable: true },
];

// ─── Set bonus definitions ────────────────────────────────────────────────────
export const SET_BONUSES = {
  1: { pieces: 3, label: '一阶套装 (3件): 经验+5%', effect: 'xpPct', value: 5 },
  2: { pieces: 3, label: '二阶套装 (3件): 金币+10%', effect: 'goldPct', value: 10 },
  3: { pieces: 3, label: '三阶套装 (3件): 暴击率+5%', effect: 'critChancePct', value: 5 },
  4: { pieces: 3, label: '四阶套装 (3件): 全伤害+15%', effect: 'allDmgPct', value: 15 },
};

export function getActiveSetBonuses(profile) {
  const inventory = profile.inventory || [];
  const active = [];
  for (const [tier, bonus] of Object.entries(SET_BONUSES)) {
    const tierItems = SHOP_ITEMS.filter(i => i.tier === Number(tier) && i.type !== 'consumable');
    const ownedCount = tierItems.filter(i => inventory.includes(i.id)).length;
    if (ownedCount >= bonus.pieces) {
      active.push({ tier: Number(tier), ...bonus, ownedCount, totalItems: tierItems.length });
    }
  }
  return active;
}

export function getSetProgress(profile) {
  const inventory = profile.inventory || [];
  const progress = [];
  for (const [tier, bonus] of Object.entries(SET_BONUSES)) {
    const tierItems = SHOP_ITEMS.filter(i => i.tier === Number(tier) && i.type !== 'consumable');
    const ownedCount = tierItems.filter(i => inventory.includes(i.id)).length;
    progress.push({ tier: Number(tier), ...bonus, ownedCount, totalItems: tierItems.length, complete: ownedCount >= bonus.pieces });
  }
  return progress;
}

const TYPE_ICON = {
  weapon: '⚔️',
  armor: '🛡️',
  accessory: '💍',
  consumable: '🧪',
};

const TIER_LABEL = ['', '一阶', '二阶', '三阶', '四阶'];

const STAT_LABELS = { attack: '攻击', defense: '防御', speed: '速度', wenli: '文力', hp: 'HP', critChance: '暴击率' };

// ─── Forge: primary stat for each equipment type ──────────────────────────────
function getPrimaryStat(item) {
  if (item.type === 'weapon') return 'attack';
  if (item.type === 'armor') return 'defense';
  // For accessories, pick the stat with the highest value
  if (item.stats) {
    let best = null, bestVal = 0;
    for (const [k, v] of Object.entries(item.stats)) {
      if (v > bestVal) { best = k; bestVal = v; }
    }
    return best || 'attack';
  }
  return 'attack';
}

const MAX_UPGRADE = 3;

function getUpgradeLevel(profile, itemId) {
  return (profile.upgrades || {})[itemId] || 0;
}

function getUpgradeCost(item, currentLevel) {
  // Front-loaded: cheap first upgrade, expensive final tier
  const multipliers = [0.5, 1.0, 2.0];
  return Math.round(item.price * (multipliers[currentLevel] ?? 2.0));
}

function renderShop(params = {}) {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const activeTab = params.tab || 'shop';

  function getOwned(item) {
    if (item.type === 'consumable') {
      return (profile.consumables || {})[item.id] || 0;
    }
    return (profile.inventory || []).includes(item.id);
  }

  function canAfford(item) {
    return (profile.gold || 0) >= item.price;
  }

  function formatStats(stats) {
    return Object.entries(stats).map(([k, v]) => {
      return `<span style="color:var(--accent-jade);">${STAT_LABELS[k] || k}+${v}</span>`;
    }).join(' ');
  }

  // ─── Stat preview: show what stats will look like after equipping ──────────
  function buildStatPreview(item) {
    if (!item.stats || item.type === 'consumable') return '';
    const effectiveNow = getEffectiveStats(profile);

    // Calculate what the currently equipped item of this type contributes
    const currentEquipId = profile.equipment[item.type] || null;
    const currentEquip = currentEquipId ? SHOP_ITEMS.find(e => e.id === currentEquipId) : null;
    const currentStats = currentEquip ? currentEquip.stats : {};

    const rows = Object.entries(item.stats).map(([k, v]) => {
      // Map item stat keys to effective stat keys
      const effectiveKey = k === 'hp' ? 'maxHp' : k === 'wenli' ? 'maxWenli' : k;
      const currentVal = effectiveNow[effectiveKey] || 0;
      const oldContrib = currentStats[k] || 0;
      const newVal = currentVal - oldContrib + v;
      const diff = newVal - currentVal;
      const diffColor = diff > 0 ? 'var(--accent-jade)' : diff < 0 ? '#e74c3c' : 'var(--text-dim)';
      const diffStr = diff > 0 ? `+${diff}` : `${diff}`;
      return `<span style="font-size:0.8rem;color:var(--text-secondary);">${STAT_LABELS[k] || k} ${currentVal}→<span style="color:${diffColor};font-weight:600;">${newVal}</span> <span style="color:${diffColor};">(${diffStr})</span></span>`;
    }).join('<br>');

    return `<div style="margin:4px 0;padding:6px 8px;background:rgba(255,255,255,0.03);border-radius:6px;border:1px dashed rgba(255,255,255,0.08);">${rows}</div>`;
  }

  // ─── Recommended item: best affordable item the player doesn't own yet ────
  function getRecommendedId() {
    const affordable = SHOP_ITEMS.filter(i =>
      i.type !== 'consumable' && canAfford(i) && !getOwned(i)
    );
    if (affordable.length === 0) return null;
    // Best = highest total stat value among affordable unowned items
    const scored = affordable.map(i => {
      const totalStat = Object.values(i.stats).reduce((a, b) => a + b, 0);
      return { id: i.id, score: totalStat };
    });
    scored.sort((a, b) => b.score - a.score);
    return scored[0].id;
  }

  const recommendedId = getRecommendedId();

  function buildItemCard(item) {
    const owned = getOwned(item);
    const affordable = canAfford(item);
    const isRecommended = item.id === recommendedId;

    let statusBadge = '';
    let buyBtnHTML = '';

    if (item.type === 'consumable') {
      statusBadge = owned > 0
        ? `<span style="background:var(--bg-secondary);color:var(--accent-jade);font-size:0.9rem;padding:2px 6px;border-radius:4px;">x${owned}</span>`
        : '';
      buyBtnHTML = `
        <button class="btn shop-buy-btn" data-id="${item.id}"
          style="padding:4px 14px;font-size:0.95rem;${affordable ? '' : 'opacity:0.4;cursor:not-allowed;'}"
          ${affordable ? '' : 'disabled'}>
          购买
        </button>`;
    } else {
      if (owned) {
        statusBadge = `<span style="background:var(--accent-gold);color:#1a1035;font-size:0.9rem;font-weight:700;padding:2px 8px;border-radius:4px;">已拥有</span>`;
        buyBtnHTML = `<button class="btn" style="padding:4px 14px;font-size:0.95rem;opacity:0.35;cursor:not-allowed;" disabled>已购买</button>`;
      } else {
        buyBtnHTML = `
          <button class="btn shop-buy-btn" data-id="${item.id}"
            style="padding:4px 14px;font-size:0.95rem;${affordable ? '' : 'opacity:0.4;cursor:not-allowed;'}"
            ${affordable ? '' : 'disabled'}>
            购买
          </button>`;
      }
    }

    const recommendedBadge = isRecommended
      ? `<span style="background:linear-gradient(135deg,#e74c3c,#e67e22);color:#fff;font-size:0.9rem;font-weight:700;padding:2px 8px;border-radius:4px;margin-left:6px;letter-spacing:0.05em;">推荐</span>`
      : '';

    const tierLabel = item.tier ? `<span style="font-size:0.78rem;color:var(--text-dim);margin-left:4px;">${TIER_LABEL[item.tier] || ''}</span>` : '';
    const statsHTML = item.stats ? `<div style="font-size:0.9rem;">${formatStats(item.stats)}</div>` : '';
    const effectHTML = (item.effect && item.type === 'consumable') ? `<div style="font-size:0.9rem;color:var(--accent-jade);">${item.desc}</div>` : '';
    const previewHTML = (!owned && item.type !== 'consumable') ? buildStatPreview(item) : '';

    return `
      <div style="
        background:var(--bg-card);
        border:2px solid ${isRecommended ? 'var(--accent-gold)' : affordable && (!owned || item.type === 'consumable') ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.05)'};
        border-radius:12px;
        padding:14px;
        opacity:${!affordable && !owned ? '0.65' : '1'};
        ${isRecommended ? 'box-shadow:0 0 16px rgba(212,160,23,0.25);' : ''}
        display:flex; gap:12px; align-items:stretch;
      ">
        <div style="flex:1;min-width:0;">
          <div style="display:flex;align-items:center;gap:5px;margin-bottom:6px;flex-wrap:wrap;">
            <span style="font-size:1rem;">${TYPE_ICON[item.type] || '📦'}</span>
            <span style="font-weight:700;font-size:0.92rem;">${item.name}</span>
            ${tierLabel}
            ${recommendedBadge}
          </div>
          <div style="font-size:0.78rem;color:var(--text-secondary);line-height:1.4;margin-bottom:6px;">${item.desc}</div>
          <div style="font-size:0.85rem;">${statsHTML}${effectHTML}</div>
          ${previewHTML ? '<div style="font-size:0.8rem;margin-top:4px;">' + previewHTML + '</div>' : ''}
        </div>
        <div style="display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px;min-width:70px;padding-left:10px;border-left:1px solid rgba(255,255,255,0.06);">
          <span style="color:var(--accent-gold);font-weight:700;font-size:0.9rem;">💰 ${item.price}</span>
          ${statusBadge}
          ${buyBtnHTML}
        </div>
      </div>`;
  }

  // Sort: weapons tier1-4, then armor tier1-4, then accessories tier1-3, then consumables
  const weapons = SHOP_ITEMS.filter(i => i.type === 'weapon');
  const armors = SHOP_ITEMS.filter(i => i.type === 'armor');
  const accessories = SHOP_ITEMS.filter(i => i.type === 'accessory');
  const consumables = SHOP_ITEMS.filter(i => i.type === 'consumable');

  // ─── Set bonus progress display ─────────────────────────────────────────────
  const setProgress = getSetProgress(profile);
  const setBonusHTML = setProgress.map(sp => {
    const barPct = Math.round((sp.ownedCount / sp.pieces) * 100);
    const isComplete = sp.complete;
    return `
      <div style="
        background:var(--bg-card);
        border:1px solid ${isComplete ? 'var(--accent-gold)' : 'var(--bg-secondary)'};
        border-radius:8px;
        padding:10px 14px;
        ${isComplete ? 'box-shadow:0 0 10px rgba(212,160,23,0.15);' : ''}
      ">
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px;">
          <span style="font-size:0.95rem;font-weight:700;color:${isComplete ? 'var(--accent-gold)' : 'var(--text-secondary)'};">
            ${isComplete ? '✅ ' : ''}${sp.label}
          </span>
          <span style="font-size:0.9rem;color:var(--text-dim);">${sp.ownedCount}/${sp.pieces}</span>
        </div>
        <div style="width:100%;height:6px;background:var(--bg-secondary);border-radius:3px;overflow:hidden;">
          <div style="width:${barPct}%;height:100%;background:${isComplete ? 'var(--accent-gold)' : 'var(--accent-jade)'};border-radius:3px;transition:width 0.3s;"></div>
        </div>
      </div>`;
  }).join('');

  const itemsHTML = [
    `<div style="grid-column:1/-1;font-size:0.95rem;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;padding:4px 0 2px;">⚔️ 武器</div>`,
    ...weapons.map(buildItemCard),
    `<div style="grid-column:1/-1;font-size:0.95rem;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;padding:12px 0 2px;">🛡️ 防具</div>`,
    ...armors.map(buildItemCard),
    `<div style="grid-column:1/-1;font-size:0.95rem;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;padding:12px 0 2px;">💍 饰品</div>`,
    ...accessories.map(buildItemCard),
    `<div style="grid-column:1/-1;font-size:0.95rem;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;padding:12px 0 2px;">🧪 消耗品</div>`,
    ...consumables.map(buildItemCard),
  ].join('');

  // ─── Forge tab content ─────────────────────────────────────────────────────
  const ownedEquipment = (profile.inventory || []).map(id => SHOP_ITEMS.find(i => i.id === id)).filter(Boolean);
  const FORGE_STAT_LABELS = { attack: '攻击', defense: '防御', speed: '速度', wenli: '文力', hp: 'HP', critChance: '暴击率' };

  function buildForgeCard(item) {
    const level = getUpgradeLevel(profile, item.id);
    const cost = getUpgradeCost(item, level);
    const canUpgrade = level < MAX_UPGRADE && (profile.gold || 0) >= cost;
    const isMaxed = level >= MAX_UPGRADE;
    const primaryStat = getPrimaryStat(item);
    const primaryLabel = FORGE_STAT_LABELS[primaryStat] || primaryStat;
    const baseVal = item.stats[primaryStat] || 0;
    const bonusVal = level * 2;
    const nextBonusVal = (level + 1) * 2;
    const salvageGold = Math.floor(item.price * 0.4);

    // Star display
    const stars = Array.from({length: MAX_UPGRADE}, (_, i) =>
      i < level ? '<span style="color:var(--accent-gold);">★</span>' : '<span style="color:var(--text-dim);">☆</span>'
    ).join('');

    // Type icon
    const typeIcon = TYPE_ICON[item.type] || '📦';

    // Upgrade badge
    const upgradeBadge = level > 0
      ? `<span style="background:linear-gradient(135deg,#d4a017,#e67e22);color:#1a1035;font-size:0.9rem;font-weight:800;padding:2px 8px;border-radius:4px;">+${level}</span>`
      : '';

    // Stat breakdown
    const statLines = Object.entries(item.stats).map(([k, v]) => {
      const isP = k === primaryStat;
      const bonus = isP ? bonusVal : 0;
      const totalVal = v + bonus;
      const bonusStr = bonus > 0 ? ` <span style="color:var(--accent-gold);font-weight:700;">(+${bonus})</span>` : '';
      return `<span style="font-size:0.92rem;color:${isP ? 'var(--accent-jade)' : 'var(--text-secondary)'};">${FORGE_STAT_LABELS[k] || k}: ${totalVal}${bonusStr}</span>`;
    }).join('<br>');

    // Upgrade preview
    const upgradePreview = !isMaxed
      ? `<div style="font-size:0.9rem;color:var(--text-dim);margin-top:4px;">强化后: ${primaryLabel} ${baseVal + nextBonusVal} <span style="color:var(--accent-gold);">(+${nextBonusVal})</span></div>`
      : `<div style="font-size:0.9rem;color:var(--accent-gold);margin-top:4px;">已满级 ✦</div>`;

    return `
      <div class="forge-item-card" data-forge-id="${item.id}" style="
        background:var(--bg-card);
        border:1px solid ${isMaxed ? 'var(--accent-gold)' : 'var(--bg-secondary)'};
        border-radius:10px;
        padding:12px 14px;
        display:flex;
        flex-direction:column;
        gap:6px;
        ${isMaxed ? 'box-shadow:0 0 12px rgba(212,160,23,0.15);' : ''}
        position:relative;
        overflow:hidden;
      ">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;gap:4px;">
          <div style="display:flex;align-items:center;gap:4px;flex-wrap:wrap;min-width:0;">
            <span style="font-size:1.1rem;flex-shrink:0;">${typeIcon}</span>
            <span style="font-weight:700;font-size:0.95rem;">${item.name}</span>
            ${upgradeBadge}
          </div>
          <div style="font-size:0.95rem;">${stars}</div>
        </div>
        <div style="margin:4px 0;">${statLines}</div>
        ${upgradePreview}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:8px;gap:8px;">
          ${!isMaxed ? `
            <button class="btn forge-upgrade-btn" data-upgrade-id="${item.id}"
              style="padding:4px 14px;font-size:0.95rem;flex:1;${canUpgrade ? '' : 'opacity:0.4;cursor:not-allowed;'}"
              ${canUpgrade ? '' : 'disabled'}>
              强化 <span style="color:var(--accent-gold);">💰${cost}</span>
            </button>
          ` : `
            <span style="font-size:0.95rem;color:var(--accent-gold);flex:1;text-align:center;font-weight:700;">MAX</span>
          `}
          <button class="btn forge-salvage-btn" data-salvage-id="${item.id}"
            style="padding:4px 10px;font-size:0.92rem;border-color:var(--accent-red);color:var(--accent-red);">
            分解 💰${salvageGold}
          </button>
        </div>
      </div>`;
  }

  const forgeItemsHTML = ownedEquipment.length === 0
    ? '<p style="color:var(--text-secondary);text-align:center;grid-column:1/-1;">还没有装备可以锻造，先去商店购买装备吧！</p>'
    : ownedEquipment.map(buildForgeCard).join('');

  const forgeContentHTML = `
    <div style="padding:0 20px 8px;">
      <h3 style="margin:0 0 6px;font-size:0.95rem;color:var(--text-secondary);letter-spacing:0.06em;">装备强化</h3>
      <p style="font-size:0.92rem;color:var(--text-dim);margin:0 0 14px;">强化装备增加属性，每级+2主属性 (最高+3)</p>
    </div>
    <div class="forge-grid" id="forge-grid">
      ${forgeItemsHTML}
    </div>
  `;

  // ─── Tab selection ──────────────────────────────────────────────────────────
  const isShopTab = activeTab === 'shop';
  const isForgeTab = activeTab === 'forge';

  div.innerHTML = `
    <style>
      .shop-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill, minmax(min(280px, 100%), 1fr));
        gap:12px;
        padding:0 16px 40px;
        width:100%;
      }
      .set-bonus-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill, minmax(min(220px, 100%), 1fr));
        gap:10px;
        padding:0 20px 16px;
        width:100%;
      }
      .forge-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill, minmax(min(220px, 100%), 1fr));
        gap:12px;
        padding:0 20px 40px;
        width:100%;
      }
      .shop-tab-bar {
        display:flex; gap:0; margin-bottom:16px;
      }
      .shop-tab {
        padding:10px 28px; font-size:0.95rem; font-weight:700;
        cursor:pointer; border:2px solid var(--bg-secondary);
        background:var(--bg-secondary); color:var(--text-secondary);
        transition:all 0.2s; letter-spacing:0.05em;
      }
      .shop-tab:first-child { border-radius:8px 0 0 8px; }
      .shop-tab:last-child { border-radius:0 8px 8px 0; }
      .shop-tab.active {
        background:var(--bg-card); color:var(--accent-gold);
        border-color:var(--accent-gold);
      }
      .shop-tab:hover:not(.active) { color:var(--text-primary); }
      @keyframes forgeSparkle {
        0% { transform:scale(0); opacity:1; }
        50% { transform:scale(1.5); opacity:0.8; }
        100% { transform:scale(2); opacity:0; }
      }
      .forge-sparkle-burst {
        position:absolute; inset:0; pointer-events:none; z-index:10;
        display:flex; align-items:center; justify-content:center;
      }
      .forge-sparkle-burst span {
        position:absolute; font-size:1.2rem;
        animation: forgeSparkle 0.6s ease forwards;
      }
    </style>
    <div style="width:100%;padding:20px 20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0 0 4px;">文定乾坤商店</h2>
          <div style="font-size:0.95rem;color:var(--text-secondary);">购买装备，增强实力</div>
        </div>
        <div style="display:flex;align-items:center;gap:12px;flex-wrap:wrap;">
          <div style="
            background:var(--bg-card);
            border:1px solid var(--accent-gold);
            border-radius:8px;
            padding:8px 16px;
            font-size:1.05rem;
            font-weight:700;
            color:var(--accent-gold);
          ">💰 金币: ${profile.gold || 0}</div>
          <button class="btn" id="btn-inventory-from-shop">背包</button>
          <button class="btn" id="btn-back-shop">返回</button>
        </div>
      </div>
      <div class="shop-tab-bar">
        <div class="shop-tab ${isShopTab ? 'active' : ''}" data-tab="shop">商店</div>
        <div class="shop-tab ${isForgeTab ? 'active' : ''}" data-tab="forge">锻造</div>
      </div>
    </div>
    ${isShopTab ? `
      <div style="padding:0 20px 8px;">
        <h3 style="margin:0 0 10px;font-size:1.1rem;color:var(--text-secondary);letter-spacing:0.06em;">套装效果</h3>
      </div>
      <div class="set-bonus-grid">${setBonusHTML}</div>
      <div class="shop-grid" id="shop-grid">
        ${itemsHTML}
      </div>
    ` : forgeContentHTML}
  `;

  setTimeout(() => {
    div.querySelector('#btn-back-shop').addEventListener('click', () => showScreen('worldmap'));
    div.querySelector('#btn-inventory-from-shop').addEventListener('click', () => showScreen('inventory'));

    // Tab switching
    div.querySelectorAll('.shop-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        playSound('click');
        showScreen('shop', { tab: tab.dataset.tab });
      });
    });

    // Shop buy buttons (only present in shop tab)
    div.querySelectorAll('.shop-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        if (btn.disabled) return;
        btn.disabled = true; // Prevent double-click race
        const itemId = btn.dataset.id;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) { btn.disabled = false; return; }

        const gold = profile.gold || 0;
        if (gold < item.price) { btn.disabled = false; return; }

        profile.gold = gold - item.price;

        if (item.type === 'consumable') {
          if (!profile.consumables) profile.consumables = {};
          profile.consumables[item.id] = (profile.consumables[item.id] || 0) + 1;
        } else {
          if (!profile.inventory) profile.inventory = [];
          if (!profile.inventory.includes(item.id)) {
            profile.inventory.push(item.id);
          }
        }

        gameState.save();
        playSound('correct');
        showToast(`购买成功！${item.name}`, { type: 'item', duration: 2500 });

        // Re-render shop in place
        showScreen('shop', { tab: activeTab });
      });
    });

    // Forge upgrade buttons
    div.querySelectorAll('.forge-upgrade-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.upgradeId;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        if (!profile.upgrades) profile.upgrades = {};
        const level = profile.upgrades[itemId] || 0;
        if (level >= MAX_UPGRADE) return;

        const cost = getUpgradeCost(item, level);
        if ((profile.gold || 0) < cost) return;

        profile.gold -= cost;
        profile.upgrades[itemId] = level + 1;

        // If item is currently equipped, add upgrade bonus to profile stats
        const slots = ['weapon', 'armor', 'accessory'];
        for (const slot of slots) {
          if (profile.equipment[slot] === itemId) {
            const primaryStat = getPrimaryStat(item);
            profile[primaryStat] = (profile[primaryStat] || 0) + 2;
            break;
          }
        }

        gameState.save();
        playSound('correct');
        showToast(`强化成功！${item.name}+${profile.upgrades[itemId]}`, { type: 'forge', duration: 2500 });

        // Golden sparkle burst animation on the card
        const card = btn.closest('.forge-item-card');
        if (card) {
          const sparkle = document.createElement('div');
          sparkle.className = 'forge-sparkle-burst';
          const particles = ['✦', '✧', '★', '⚡', '✦', '✧', '★', '⚡'];
          sparkle.innerHTML = particles.map((p, i) => {
            const angle = (i / particles.length) * 360;
            const rad = angle * Math.PI / 180;
            const dist = 30 + Math.random() * 20;
            const dx = Math.cos(rad) * dist;
            const dy = Math.sin(rad) * dist;
            return `<span style="color:var(--accent-gold);transform:translate(${dx}px,${dy}px);animation-delay:${i * 0.05}s;">${p}</span>`;
          }).join('');
          card.appendChild(sparkle);
          setTimeout(() => sparkle.remove(), 700);
        }

        // Re-render after a short delay for the animation
        setTimeout(() => showScreen('shop', { tab: 'forge' }), 500);
      });
    });

    // Forge salvage buttons
    div.querySelectorAll('.forge-salvage-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.salvageId;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        const salvageGold = Math.floor(item.price * 0.4);
        playSound('click');

        // Confirmation dialog
        const overlay = document.createElement('div');
        overlay.style.cssText = 'position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;z-index:999;';
        overlay.innerHTML = `
          <div style="background:var(--bg-card);border:2px solid var(--accent-red);border-radius:12px;padding:24px 32px;text-align:center;max-width:320px;">
            <p style="margin-bottom:16px;font-size:1.1rem;">确定要分解 <strong style="color:var(--accent-gold);">${item.name}</strong>？</p>
            <p style="margin-bottom:20px;font-size:0.9rem;color:var(--text-secondary);">将获得 <span style="color:var(--accent-gold);font-weight:700;">💰${salvageGold}</span> 金币</p>
            <div style="display:flex;gap:12px;justify-content:center;">
              <button class="btn" id="cancel-salvage">取消</button>
              <button class="btn" id="confirm-salvage" style="border-color:var(--accent-red);color:var(--accent-red);">分解</button>
            </div>
          </div>
        `;
        div.appendChild(overlay);

        overlay.querySelector('#cancel-salvage').addEventListener('click', () => overlay.remove());
        overlay.addEventListener('click', (ev) => { if (ev.target === overlay) overlay.remove(); });

        overlay.querySelector('#confirm-salvage').addEventListener('click', () => {
          // Unequip if currently equipped
          const slots = ['weapon', 'armor', 'accessory'];
          for (const slot of slots) {
            if (profile.equipment[slot] === itemId) {
              const equip = SHOP_ITEMS.find(e => e.id === itemId);
              if (equip) {
                Object.entries(equip.stats).forEach(([k, v]) => { profile[k] = (profile[k] || 0) - v; });
                // Also remove upgrade bonus from stats
                const upgradeLevel = getUpgradeLevel(profile, itemId);
                if (upgradeLevel > 0) {
                  const primaryStat = getPrimaryStat(equip);
                  profile[primaryStat] = (profile[primaryStat] || 0) - (upgradeLevel * 2);
                }
              }
              profile.equipment[slot] = null;
              break;
            }
          }

          // Remove from inventory
          profile.inventory = (profile.inventory || []).filter(id => id !== itemId);
          // Remove upgrades
          if (profile.upgrades) delete profile.upgrades[itemId];
          // Add gold
          profile.gold = (profile.gold || 0) + salvageGold;

          gameState.save();
          playSound('correct');
          overlay.remove();
          showScreen('shop', { tab: 'forge' });
        });
      });
    });
    // Tutorial: first shop visit
    showTutorial(div, 'tutorial_shop', {
      targetSelector: '.shop-buy-btn',
      position: 'top',
    });
  }, 0);

  return div;
}

registerScreen('shop', (params) => renderShop(params));
