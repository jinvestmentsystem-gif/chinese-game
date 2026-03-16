// js/screens/shop.js — Equipment shop screen
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';

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

  // Consumables
  { id: 'hp-potion', name: '回春丹', type: 'consumable', price: 20, effect: 'heal_50', desc: '恢复50点生命值', stackable: true },
  { id: 'wenli-potion', name: '灵墨丹', type: 'consumable', price: 30, effect: 'wenli_full', desc: '完全恢复文力', stackable: true },
  { id: 'xp-scroll', name: '经验卷轴', type: 'consumable', price: 40, effect: 'xp_double_next', desc: '下次战斗经验翻倍', stackable: true },
];

const TYPE_ICON = {
  weapon: '⚔️',
  armor: '🛡️',
  consumable: '🧪',
};

const TIER_LABEL = ['', '一阶', '二阶', '三阶', '四阶'];

function renderShop() {
  const div = document.createElement('div');
  div.className = 'screen';
  const profile = gameState.profile;

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
      const labels = { attack: '攻击', defense: '防御', speed: '速度', wenli: '文力', hp: 'HP' };
      return `<span style="color:var(--accent-jade);">${labels[k] || k}+${v}</span>`;
    }).join(' ');
  }

  function buildItemCard(item) {
    const owned = getOwned(item);
    const affordable = canAfford(item);

    let statusBadge = '';
    let buyBtnHTML = '';

    if (item.type === 'consumable') {
      statusBadge = owned > 0
        ? `<span style="background:var(--bg-secondary);color:var(--accent-jade);font-size:0.7rem;padding:2px 6px;border-radius:4px;">x${owned}</span>`
        : '';
      buyBtnHTML = `
        <button class="btn shop-buy-btn" data-id="${item.id}"
          style="padding:4px 14px;font-size:0.8rem;${affordable ? '' : 'opacity:0.4;cursor:not-allowed;'}"
          ${affordable ? '' : 'disabled'}>
          购买
        </button>`;
    } else {
      if (owned) {
        statusBadge = `<span style="background:var(--accent-gold);color:#1a1035;font-size:0.7rem;font-weight:700;padding:2px 8px;border-radius:4px;">已拥有</span>`;
        buyBtnHTML = `<button class="btn" style="padding:4px 14px;font-size:0.8rem;opacity:0.35;cursor:not-allowed;" disabled>已购买</button>`;
      } else {
        buyBtnHTML = `
          <button class="btn shop-buy-btn" data-id="${item.id}"
            style="padding:4px 14px;font-size:0.8rem;${affordable ? '' : 'opacity:0.4;cursor:not-allowed;'}"
            ${affordable ? '' : 'disabled'}>
            购买
          </button>`;
      }
    }

    const tierLabel = item.tier ? `<span style="font-size:0.68rem;color:var(--text-dim);margin-left:4px;">${TIER_LABEL[item.tier] || ''}</span>` : '';
    const statsHTML = item.stats ? `<div style="margin:4px 0;font-size:0.78rem;">${formatStats(item.stats)}</div>` : '';
    const effectHTML = item.effect ? `<div style="margin:4px 0;font-size:0.78rem;color:var(--accent-blue);">${item.effect}</div>` : '';

    return `
      <div style="
        background:var(--bg-card);
        border:1px solid ${affordable && (!owned || item.type === 'consumable') ? 'var(--bg-secondary)' : 'rgba(255,255,255,0.07)'};
        border-radius:10px;
        padding:14px;
        display:flex;
        flex-direction:column;
        gap:4px;
        opacity:${!affordable && !owned ? '0.72' : '1'};
      ">
        <div style="display:flex;justify-content:space-between;align-items:flex-start;">
          <div style="display:flex;align-items:center;gap:6px;">
            <span style="font-size:1.3rem;">${TYPE_ICON[item.type] || '📦'}</span>
            <span style="font-weight:700;font-size:0.95rem;">${item.name}</span>
            ${tierLabel}
          </div>
          ${statusBadge}
        </div>
        <div style="font-size:0.78rem;color:var(--text-secondary);">${item.desc}</div>
        ${statsHTML}${effectHTML}
        <div style="display:flex;justify-content:space-between;align-items:center;margin-top:6px;">
          <span style="color:var(--accent-gold);font-weight:700;font-size:0.9rem;">💰 ${item.price}</span>
          ${buyBtnHTML}
        </div>
      </div>`;
  }

  // Sort: weapons tier1-4, then armor tier1-4, then consumables
  const weapons = SHOP_ITEMS.filter(i => i.type === 'weapon');
  const armors = SHOP_ITEMS.filter(i => i.type === 'armor');
  const consumables = SHOP_ITEMS.filter(i => i.type === 'consumable');

  const itemsHTML = [
    `<div style="grid-column:1/-1;font-size:0.8rem;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;padding:4px 0 2px;">⚔️ 武器</div>`,
    ...weapons.map(buildItemCard),
    `<div style="grid-column:1/-1;font-size:0.8rem;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;padding:12px 0 2px;">🛡️ 防具</div>`,
    ...armors.map(buildItemCard),
    `<div style="grid-column:1/-1;font-size:0.8rem;font-weight:700;color:var(--text-secondary);letter-spacing:0.08em;text-transform:uppercase;padding:12px 0 2px;">🧪 消耗品</div>`,
    ...consumables.map(buildItemCard),
  ].join('');

  div.innerHTML = `
    <style>
      .shop-grid {
        display:grid;
        grid-template-columns:repeat(auto-fill, minmax(220px, 1fr));
        gap:12px;
        padding:0 20px 40px;
        width:100%;
      }
    </style>
    <div style="width:100%;padding:20px 20px 0;">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px;flex-wrap:wrap;gap:10px;">
        <div>
          <h2 style="margin:0 0 4px;">文字侠商店</h2>
          <div style="font-size:0.85rem;color:var(--text-secondary);">购买装备，增强实力</div>
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
    </div>
    <div class="shop-grid" id="shop-grid">
      ${itemsHTML}
    </div>
  `;

  setTimeout(() => {
    div.querySelector('#btn-back-shop').addEventListener('click', () => showScreen('worldmap'));
    div.querySelector('#btn-inventory-from-shop').addEventListener('click', () => showScreen('inventory'));

    div.querySelectorAll('.shop-buy-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        const itemId = btn.dataset.id;
        const item = SHOP_ITEMS.find(i => i.id === itemId);
        if (!item) return;

        const gold = profile.gold || 0;
        if (gold < item.price) return;

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

        // Re-render shop in place
        showScreen('shop');
      });
    });
  }, 0);

  return div;
}

registerScreen('shop', renderShop);
