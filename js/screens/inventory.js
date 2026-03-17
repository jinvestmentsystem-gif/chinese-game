// js/screens/inventory.js — Equipment and stats display
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getXPProgress, getEffectiveStats, getTalentEffects, getChengyuBonuses } from '../progression.js';
import { SHOP_ITEMS, getActiveSetBonuses, getSetProgress } from './shop.js';

// Equipment items only (no consumables) — used for matching inventory item IDs
const EQUIPMENT_DB = SHOP_ITEMS.filter(i => i.type !== 'consumable');

const STAT_LABELS = { attack: '攻击', defense: '防御', speed: '速度', maxHp: 'HP', maxWenli: '文力', critChance: '暴击率', critMultiplier: '暴击倍率' };

// ─── Chengyu bonus thresholds (mirrored from progression.js for next-bonus preview) ──
const CHENGYU_THRESHOLDS = [3, 5, 8, 10, 15, 20];
const CHENGYU_BONUS_LABELS = {
  3: '暴击率+2%',
  5: '攻击+3',
  8: '防御+3',
  10: 'HP+20',
  15: '金币+10%',
  20: '文力+2',
};

// ─── Helpers to decompose stat sources ────────────────────────────────────────

function getPrimaryStat(item) {
  if (item.type === 'weapon') return 'attack';
  if (item.type === 'armor') return 'defense';
  if (item.stats) {
    let best = null, bestVal = 0;
    for (const [k, v] of Object.entries(item.stats)) {
      if (v > bestVal) { best = k; bestVal = v; }
    }
    return best || 'attack';
  }
  return 'attack';
}

function getUpgradeStatTotal(profile, statKey) {
  let total = 0;
  const slots = ['weapon', 'armor', 'accessory'];
  const upgrades = profile.upgrades || {};
  for (const slot of slots) {
    const equipId = (profile.equipment || {})[slot];
    if (!equipId) continue;
    const item = EQUIPMENT_DB.find(e => e.id === equipId);
    if (!item) continue;
    const level = upgrades[equipId] || 0;
    if (level <= 0) continue;
    const primaryStat = getPrimaryStat(item);
    // Map primary stat to effective stat key
    const mappedKey = primaryStat === 'hp' ? 'maxHp' : primaryStat === 'wenli' ? 'maxWenli' : primaryStat;
    if (mappedKey === statKey) total += level * 2;
  }
  return total;
}

function getEquipmentStatTotal(profile, statKey) {
  let total = 0;
  const slots = ['weapon', 'armor', 'accessory'];
  for (const slot of slots) {
    const equipId = (profile.equipment || {})[slot];
    if (!equipId) continue;
    const item = EQUIPMENT_DB.find(e => e.id === equipId);
    if (!item || !item.stats) continue;
    // Map stat keys: item uses 'hp'/'wenli', effective uses 'maxHp'/'maxWenli'
    if (statKey === 'maxHp' && item.stats.hp) total += item.stats.hp;
    else if (statKey === 'maxWenli' && item.stats.wenli) total += item.stats.wenli;
    else if (item.stats[statKey]) total += item.stats[statKey];
  }
  return total;
}

function getTalentStatTotal(profile, statKey) {
  const t = getTalentEffects(profile);
  if (statKey === 'maxHp') return t.bonusHp || 0;
  if (statKey === 'maxWenli') return t.bonusWenli || 0;
  if (statKey === 'critChance') return t.critChance || 0;
  return 0;
}

function getChengyuStatTotal(profile, statKey) {
  const bonuses = getChengyuBonuses(profile);
  let total = 0;
  for (const b of bonuses) {
    if (b.type === statKey) total += b.value;
  }
  return total;
}

function renderInventory() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const xp = getXPProgress(profile);
  const effectiveStats = getEffectiveStats(profile);

  // ─── Effective stats with color-coded breakdown ──────────────────────────────
  const displayStats = ['attack', 'defense', 'speed', 'maxHp', 'maxWenli', 'critChance'];
  const baseStatMap = {
    attack: profile.attack,
    defense: profile.defense,
    speed: profile.speed,
    maxHp: profile.maxHp,
    maxWenli: profile.maxWenli,
    critChance: profile.critChance || 5,
  };

  const statsCardsHTML = displayStats.map(key => {
    const effective = effectiveStats[key] || 0;
    const base = baseStatMap[key] || 0;
    // Subtract equipment contribution from base since profile already includes equipped stats
    const equipBonus = getEquipmentStatTotal(profile, key);
    const upgradeBonus = getUpgradeStatTotal(profile, key);
    const talentBonus = getTalentStatTotal(profile, key);
    const chengyuBonus = getChengyuStatTotal(profile, key);
    // Base displayed = effective - equipment - talent - chengyu - upgrade (the raw base)
    const rawBase = base - equipBonus - upgradeBonus;
    const suffix = key === 'critChance' ? '%' : '';

    let breakdownHTML = '';
    const parts = [];
    if (equipBonus > 0) parts.push(`<span style="color:#5bc8af;">+${equipBonus}${suffix}</span>`);
    if (upgradeBonus > 0) parts.push(`<span style="color:#e67e22;">+${upgradeBonus}${suffix}</span>`);
    if (talentBonus > 0) parts.push(`<span style="color:#a855f7;">+${talentBonus}${suffix}</span>`);
    if (chengyuBonus > 0) parts.push(`<span style="color:#d4a017;">+${chengyuBonus}${suffix}</span>`);
    if (parts.length > 0) {
      breakdownHTML = `<div style="font-size:0.8rem;margin-top:3px;">${rawBase}${suffix} ${parts.join(' ')}</div>`;
    }

    return `
      <div class="stat-card">
        <div class="stat-value">${effective}${suffix}</div>
        <div class="stat-label">${STAT_LABELS[key] || key}</div>
        ${breakdownHTML}
      </div>`;
  }).join('');

  // ─── Equipment inventory ────────────────────────────────────────────────────
  const upgrades = profile.upgrades || {};
  const inventoryHTML = profile.inventory.length === 0
    ? '<p style="color:var(--text-secondary);">还没有装备，前往商店购买装备吧！</p>'
    : profile.inventory.map(itemId => {
      const item = EQUIPMENT_DB.find(e => e.id === itemId);
      if (!item) return '';
      const equipped = (profile.equipment.weapon === itemId || profile.equipment.armor === itemId || profile.equipment.accessory === itemId);
      const upgradeLevel = upgrades[itemId] || 0;
      const upgradeStars = upgradeLevel > 0 ? ' ' + Array.from({length: upgradeLevel}, () => '★').join('') : '';
      const upgradeBadge = upgradeLevel > 0 ? `<span style="color:var(--accent-gold);font-weight:800;font-size:0.78rem;"> +${upgradeLevel}</span>` : '';
      const primary = getPrimaryStat(item);
      const statsText = Object.entries(item.stats).map(([k, v]) => {
        const labels = { attack: '攻击', defense: '防御', speed: '速度', wenli: '文力', hp: 'HP', critChance: '暴击率' };
        const isP = k === primary;
        const bonus = isP ? upgradeLevel * 2 : 0;
        const bonusStr = bonus > 0 ? `<span style="color:#e67e22;"> (+${bonus})</span>` : '';
        return `<span style="color:var(--accent-jade);">${labels[k] || k}+${v + bonus}</span>${bonusStr}`;
      }).join(' ');
      const typeLabel = { weapon: '武器', armor: '防具', accessory: '饰品' }[item.type] || '';
      return `
        <div class="inv-item ${equipped ? 'equipped' : ''}" data-id="${itemId}" data-type="${item.type}">
          <div style="display:flex;justify-content:space-between;align-items:center;">
            <div style="font-weight:700;">${item.name}${upgradeBadge} <span style="color:var(--accent-gold);font-size:0.78rem;">${upgradeStars}</span> ${equipped ? '<span style="font-size:0.78rem;color:var(--accent-jade);">(装备中)</span>' : ''}</div>
            <span style="font-size:0.68rem;color:var(--text-dim);background:var(--bg-secondary);padding:2px 6px;border-radius:4px;">${typeLabel}</span>
          </div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${item.desc || item.description || ''}</div>
          <div style="font-size:0.85rem;">${statsText}</div>
          <button class="btn equip-btn" style="padding:4px 12px;font-size:0.8rem;margin-top:4px;">${equipped ? '卸下' : '装备'}</button>
        </div>
      `;
    }).join('');

  // ─── Consumables ────────────────────────────────────────────────────────────
  const consumables = profile.consumables || {};
  const consumableItems = SHOP_ITEMS.filter(i => i.type === 'consumable' && (consumables[i.id] || 0) > 0);
  const consumablesHTML = consumableItems.length === 0
    ? '<p style="color:var(--text-secondary);font-size:0.85rem;">没有消耗品</p>'
    : consumableItems.map(item => `
        <div style="background:var(--bg-card);border:1px solid var(--bg-secondary);border-radius:8px;padding:10px;display:flex;justify-content:space-between;align-items:center;">
          <div>
            <div style="font-weight:700;">${item.name} <span style="color:var(--accent-jade);">×${consumables[item.id]}</span></div>
            <div style="font-size:0.8rem;color:var(--text-secondary);">${item.desc}</div>
          </div>
        </div>`).join('');

  // ─── Active set bonuses ─────────────────────────────────────────────────────
  const activeSetBonuses = getActiveSetBonuses(profile);
  const setProgressList = getSetProgress(profile);
  const setBonusHTML = setProgressList.map(sp => {
    const barPct = Math.round((sp.ownedCount / sp.pieces) * 100);
    return `
      <div style="display:flex;justify-content:space-between;align-items:center;font-size:0.82rem;margin-bottom:6px;">
        <span style="color:${sp.complete ? 'var(--accent-gold)' : 'var(--text-secondary)'};">
          ${sp.complete ? '✅ ' : ''}${sp.label}
        </span>
        <span style="color:var(--text-dim);font-size:0.72rem;">${sp.ownedCount}/${sp.pieces}</span>
      </div>
      <div style="width:100%;height:5px;background:var(--bg-secondary);border-radius:3px;overflow:hidden;margin-bottom:10px;">
        <div style="width:${barPct}%;height:100%;background:${sp.complete ? 'var(--accent-gold)' : 'var(--accent-jade)'};border-radius:3px;"></div>
      </div>`;
  }).join('');

  // ─── Talent effects summary ─────────────────────────────────────────────────
  const talentEffects = getTalentEffects(profile);
  const talentEntries = Object.entries(talentEffects);
  const talentLabels = {
    attackPct: '答对伤害', comboDmgPct: '连击伤害', critChance: '暴击率',
    executePct: '斩杀伤害', defensePct: '减伤', bonusHp: '额外HP',
    lastStand: '绝处逢生', thornsPct: '荆棘反伤', timerBonus: '答题时间',
    freezeFirst: '首题冻结', speedBonusPct: '速答伤害', bonusWenli: '额外文力',
    wenliRegen: '文力回复', doubleStrike: '双击几率', goldPct: '金币加成',
    xpPct: '经验加成', dropPct: '掉落率',
  };
  const talentSummaryHTML = talentEntries.length === 0
    ? '<div style="font-size:0.82rem;color:var(--text-dim);">尚未学习天赋</div>'
    : talentEntries.map(([k, v]) => {
      const suffix = k.endsWith('Pct') || k === 'critChance' || k === 'doubleStrike' ? '%' : '';
      const prefix = k === 'timerBonus' || k === 'freezeFirst' ? '+' : k === 'lastStand' ? '' : '+';
      const display = k === 'lastStand' ? '激活' : `${prefix}${v}${suffix}`;
      return `<span style="display:inline-block;background:rgba(168,85,247,0.12);color:#a855f7;font-size:0.75rem;padding:2px 8px;border-radius:4px;margin:2px;">${talentLabels[k] || k} ${display}</span>`;
    }).join('');

  // ─── Chengyu collection progress ───────────────────────────────────────────
  const chengyuCount = (profile.chengyu || []).length;
  const activeChengyuBonuses = getChengyuBonuses(profile);
  const nextThreshold = CHENGYU_THRESHOLDS.find(t => t > chengyuCount);
  const nextBonusLabel = nextThreshold ? CHENGYU_BONUS_LABELS[nextThreshold] : null;

  const chengyuBonusListHTML = activeChengyuBonuses.length === 0
    ? '<div style="font-size:0.82rem;color:var(--text-dim);">还未收集足够成语</div>'
    : activeChengyuBonuses.map(b =>
      `<span style="display:inline-block;background:rgba(212,160,23,0.12);color:#d4a017;font-size:0.75rem;padding:2px 8px;border-radius:4px;margin:2px;">${b.label}</span>`
    ).join('');

  const chengyuNextHTML = nextThreshold
    ? `<div style="font-size:0.8rem;color:var(--text-secondary);margin-top:6px;">下一奖励: 收集 ${nextThreshold} 个成语 → <span style="color:var(--accent-gold);">${nextBonusLabel}</span> (${chengyuCount}/${nextThreshold})</div>`
    : `<div style="font-size:0.8rem;color:var(--accent-gold);margin-top:6px;">所有成语奖励已解锁！</div>`;

  // ─── Stat legend ────────────────────────────────────────────────────────────
  const legendHTML = `
    <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:0.7rem;margin-bottom:12px;">
      <span style="color:#fff;">■ 基础</span>
      <span style="color:#5bc8af;">■ 装备</span>
      <span style="color:#e67e22;">■ 强化</span>
      <span style="color:#a855f7;">■ 天赋</span>
      <span style="color:#d4a017;">■ 成语</span>
    </div>`;

  div.innerHTML = `
    <style>
      .stats-grid { display:grid; grid-template-columns:repeat(3,1fr); gap:12px; margin-bottom:20px; max-width:500px; }
      .stat-card { background:var(--bg-card); border-radius:8px; padding:12px; text-align:center; }
      .stat-value { font-size:1.5rem; font-weight:700; color:var(--accent-gold); }
      .stat-label { font-size:0.8rem; color:var(--text-secondary); }
      .xp-bar-bg { width:100%; max-width:500px; height:12px; background:var(--bg-secondary); border-radius:6px; overflow:hidden; margin:8px 0 20px; }
      .xp-bar { height:100%; background:var(--accent-blue); border-radius:6px; }
      .inv-grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(220px,1fr)); gap:12px; padding:0 20px; width:100%; }
      .inv-item { background:var(--bg-card); border:2px solid var(--bg-secondary); border-radius:8px; padding:12px; }
      .inv-item.equipped { border-color:var(--accent-gold); }
      .info-section { background:var(--bg-card); border-radius:10px; padding:14px 18px; margin-bottom:14px; max-width:500px; }
      .info-section h4 { margin:0 0 8px; font-size:0.88rem; color:var(--text-secondary); letter-spacing:0.05em; }
    </style>
    <div style="width:100%;padding:20px;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <h2 style="margin:0;">${profile.name} · Lv.${profile.level}</h2>
        <div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap;">
          <div style="
            background:var(--bg-card);
            border:1px solid var(--accent-gold);
            border-radius:8px;
            padding:6px 14px;
            font-size:0.95rem;
            font-weight:700;
            color:var(--accent-gold);
          ">💰 ${profile.gold || 0}</div>
          <button class="btn btn-sm" id="btn-shop">前往商店</button>
          <button class="btn btn-sm" id="btn-forge" style="border-color:#e67e22;color:#e67e22;">前往锻造</button>
          <button class="btn" id="btn-back">返回</button>
        </div>
      </div>
      <div style="font-size:0.9rem;color:var(--text-secondary);">XP: ${xp.current}/${xp.needed}</div>
      <div class="xp-bar-bg"><div class="xp-bar" style="width:${xp.percent}%"></div></div>

      ${legendHTML}
      <div class="stats-grid">
        ${statsCardsHTML}
      </div>

      <div class="brush-divider" style="margin:20px 0;"></div>

      <!-- Set Bonuses -->
      <div class="info-section" style="margin-bottom:18px;">
        <h4>套装效果</h4>
        ${setBonusHTML}
      </div>

      <!-- Talent Effects -->
      <div class="info-section" style="margin-bottom:18px;">
        <h4>天赋效果 <span style="font-size:0.72rem;color:var(--text-dim);font-weight:400;">(天赋点: ${profile.talentPoints || 0})</span></h4>
        ${talentSummaryHTML}
      </div>

      <!-- Chengyu Collection -->
      <div class="info-section" style="margin-bottom:18px;">
        <h4>成语收集 <span style="font-size:0.72rem;color:var(--text-dim);font-weight:400;">(${chengyuCount} 个)</span></h4>
        ${chengyuBonusListHTML}
        ${chengyuNextHTML}
      </div>

      <div class="brush-divider" style="margin:24px 0;"></div>

      <h3 style="margin-bottom:14px;">装备</h3>
      <div class="inv-grid">${inventoryHTML}</div>

      <div class="brush-divider" style="margin:24px 0;"></div>

      <h3 style="margin:0 0 14px;padding-left:20px;">消耗品</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:0 20px;">
        ${consumablesHTML}
      </div>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
    div.querySelector('#btn-shop').addEventListener('click', () => showScreen('shop'));
    div.querySelector('#btn-forge').addEventListener('click', () => showScreen('shop', { tab: 'forge' }));

    div.querySelectorAll('.equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.inv-item');
        const id = item.dataset.id;
        const type = item.dataset.type;
        const equip = EQUIPMENT_DB.find(e => e.id === id);
        if (!equip) return;
        const upgrades = profile.upgrades || {};
        if (profile.equipment[type] === id) {
          // Unequip — remove base stats
          Object.entries(equip.stats).forEach(([k, v]) => { profile[k] = (profile[k] || 0) - v; });
          // Remove upgrade bonus
          const uLevel = upgrades[id] || 0;
          if (uLevel > 0) {
            const pStat = getPrimaryStat(equip);
            profile[pStat] = (profile[pStat] || 0) - (uLevel * 2);
          }
          profile.equipment[type] = null;
        } else {
          // Unequip current first
          if (profile.equipment[type]) {
            const oldId = profile.equipment[type];
            const old = EQUIPMENT_DB.find(e => e.id === oldId);
            if (old) {
              Object.entries(old.stats).forEach(([k, v]) => { profile[k] = (profile[k] || 0) - v; });
              const oldULevel = upgrades[oldId] || 0;
              if (oldULevel > 0) {
                const oldPStat = getPrimaryStat(old);
                profile[oldPStat] = (profile[oldPStat] || 0) - (oldULevel * 2);
              }
            }
          }
          // Equip new — add base stats
          profile.equipment[type] = id;
          Object.entries(equip.stats).forEach(([k, v]) => { profile[k] = (profile[k] || 0) + v; });
          // Add upgrade bonus
          const uLevel = upgrades[id] || 0;
          if (uLevel > 0) {
            const pStat = getPrimaryStat(equip);
            profile[pStat] = (profile[pStat] || 0) + (uLevel * 2);
          }
        }
        gameState.save();
        showScreen('inventory');
      });
    });
  }, 0);

  return div;
}

registerScreen('inventory', renderInventory);

export { EQUIPMENT_DB };
