// js/screens/inventory.js — Equipment and stats display
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { getXPProgress } from '../progression.js';

const EQUIPMENT_DB = [
  { id: 'brush-sword-1', name: '毛笔剑', type: 'weapon', stats: { attack: 5 }, description: '以墨为刃的文人之剑' },
  { id: 'scroll-shield-1', name: '竹简盾', type: 'armor', stats: { defense: 5 }, description: '刻满经文的护身竹简' },
  { id: 'brush-sword-2', name: '兰亭笔', type: 'weapon', stats: { attack: 10, speed: 5 }, description: '相传为王羲之所用之笔' },
  { id: 'ink-armor-1', name: '墨玉甲', type: 'armor', stats: { defense: 10, wenli: 2 }, description: '凝练墨气化成的铠甲' },
];

function renderInventory() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;
  const xp = getXPProgress(profile);

  const inventoryHTML = profile.inventory.length === 0
    ? '<p style="color:var(--text-secondary);">还没有装备，完成任务获得装备吧！</p>'
    : profile.inventory.map(itemId => {
      const item = EQUIPMENT_DB.find(e => e.id === itemId);
      if (!item) return '';
      const equipped = (profile.equipment.weapon === itemId || profile.equipment.armor === itemId);
      const statsText = Object.entries(item.stats).map(([k,v]) => `${k}+${v}`).join(' ');
      return `
        <div class="inv-item ${equipped ? 'equipped' : ''}" data-id="${itemId}" data-type="${item.type}">
          <div style="font-weight:700;">${item.name} ${equipped ? '(装备中)' : ''}</div>
          <div style="font-size:0.85rem;color:var(--text-secondary);">${item.description}</div>
          <div style="font-size:0.85rem;color:var(--accent-jade);">${statsText}</div>
          <button class="btn equip-btn" style="padding:4px 12px;font-size:0.8rem;margin-top:4px;">${equipped ? '卸下' : '装备'}</button>
        </div>
      `;
    }).join('');

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
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px;">
        <h2>${profile.name} · Lv.${profile.level}</h2>
        <button class="btn" id="btn-back">返回</button>
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
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back').addEventListener('click', () => showScreen('worldmap'));
    div.querySelectorAll('.equip-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const item = btn.closest('.inv-item');
        const id = item.dataset.id;
        const type = item.dataset.type;
        const equip = EQUIPMENT_DB.find(e => e.id === id);
        if (profile.equipment[type] === id) {
          // Unequip — remove stats
          Object.entries(equip.stats).forEach(([k,v]) => { profile[k] = (profile[k] || 0) - v; });
          profile.equipment[type] = null;
        } else {
          // Unequip current first
          if (profile.equipment[type]) {
            const old = EQUIPMENT_DB.find(e => e.id === profile.equipment[type]);
            if (old) Object.entries(old.stats).forEach(([k,v]) => { profile[k] = (profile[k] || 0) - v; });
          }
          // Equip new
          profile.equipment[type] = id;
          Object.entries(equip.stats).forEach(([k,v]) => { profile[k] = (profile[k] || 0) + v; });
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
