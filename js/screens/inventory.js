// js/screens/inventory.js — Equipment and stats display
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getXPProgress } from '../progression.js';
import { SHOP_ITEMS } from './shop.js';

// Equipment items only (no consumables) — used for matching inventory item IDs
const EQUIPMENT_DB = SHOP_ITEMS.filter(i => i.type !== 'consumable');

function renderInventory() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const xp = getXPProgress(profile);

  const inventoryHTML = profile.inventory.length === 0
    ? '<p style="color:var(--text-secondary);">还没有装备，前往商店购买装备吧！</p>'
    : profile.inventory.map(itemId => {
      const item = EQUIPMENT_DB.find(e => e.id === itemId);
      if (!item) return '';
      const equipped = (profile.equipment.weapon === itemId || profile.equipment.armor === itemId);
      const statsText = Object.entries(item.stats).map(([k, v]) => `${k}+${v}`).join(' ');
      return `
        <div class="inv-item ${equipped ? 'equipped' : ''}" data-id="${itemId}" data-type="${item.type}">
          <div style="font-weight:700;">${item.name} ${equipped ? '(装备中)' : ''}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${item.desc || item.description || ''}</div>
          <div style="font-size:0.85rem;color:var(--accent-jade);">${statsText}</div>
          <button class="btn equip-btn" style="padding:4px 12px;font-size:0.8rem;margin-top:4px;">${equipped ? '卸下' : '装备'}</button>
        </div>
      `;
    }).join('');

  // Consumables section
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
          <button class="btn" id="btn-back">返回</button>
        </div>
      </div>
      <div style="font-size:0.9rem;color:var(--text-secondary);">XP: ${xp.current}/${xp.needed}</div>
      <div class="xp-bar-bg"><div class="xp-bar" style="width:${xp.percent}%"></div></div>
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-value">${profile.maxHp}</div><div class="stat-label">HP</div></div>
        <div class="stat-card"><div class="stat-value">${profile.attack}</div><div class="stat-label">攻击</div></div>
        <div class="stat-card"><div class="stat-value">${profile.defense}</div><div class="stat-label">防御</div></div>
        <div class="stat-card"><div class="stat-value">${profile.speed}</div><div class="stat-label">速度</div></div>
        <div class="stat-card"><div class="stat-value">${profile.maxWenli}</div><div class="stat-label">文力</div></div>
        <div class="stat-card"><div class="stat-value">${profile.level}</div><div class="stat-label">等级</div></div>
      </div>
      <h3 style="margin-bottom:12px;">装备</h3>
      <div class="inv-grid">${inventoryHTML}</div>
      <h3 style="margin:20px 0 12px;padding-left:20px;">消耗品</h3>
      <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;padding:0 20px;">
        ${consumablesHTML}
      </div>
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
    div.querySelector('#btn-shop').addEventListener('click', () => showScreen('shop'));

    div.querySelectorAll('.equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.inv-item');
        const id = item.dataset.id;
        const type = item.dataset.type;
        const equip = EQUIPMENT_DB.find(e => e.id === id);
        if (!equip) return;
        if (profile.equipment[type] === id) {
          // Unequip — remove stats
          Object.entries(equip.stats).forEach(([k, v]) => { profile[k] = (profile[k] || 0) - v; });
          profile.equipment[type] = null;
        } else {
          // Unequip current first
          if (profile.equipment[type]) {
            const old = EQUIPMENT_DB.find(e => e.id === profile.equipment[type]);
            if (old) Object.entries(old.stats).forEach(([k, v]) => { profile[k] = (profile[k] || 0) - v; });
          }
          // Equip new
          profile.equipment[type] = id;
          Object.entries(equip.stats).forEach(([k, v]) => { profile[k] = (profile[k] || 0) + v; });
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
