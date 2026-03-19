// js/screens/levelup.js — Stat allocation + Talent Tree screen shown on level-up
import { gameState } from '../state.js';
import { registerScreen, showScreen } from '../main.js';
import { playSound } from '../audio.js';
import { TALENT_TREE, canLearnTalent, learnTalent } from '../progression.js';
import { showTutorial } from '../tutorial.js';
import { levelUpCelebration, confettiBurst } from '../celebrations.js';

// ─── Branch metadata ─────────────────────────────────────────────────────────
const BRANCHES = {
  combat:  { label: '攻击', color: '#d63031', icon: '⚔️' },
  defense: { label: '防御', color: '#2e86de', icon: '🛡️' },
  speed:   { label: '速度', color: '#f9ca24', icon: '⚡' },
  wisdom:  { label: '文力', color: '#8e44ad', icon: '📜' },
  fortune: { label: '财运', color: '#2ecc8a', icon: '💰' },
};

// ─── Stat descriptions with real formulas ────────────────────────────────────
const STAT_META = {
  attack:  { label: '攻击',  icon: '⚔️',  unit: '每点 → +0.8 伤害/答对',    previewFn: (cur, add) => `${(8 + cur * 0.8).toFixed(1)} → ${(8 + (cur + add) * 0.8).toFixed(1)} 基础伤害` },
  defense: { label: '防御',  icon: '🛡️',  unit: '每点 → -3% 受伤',          previewFn: (cur, add) => `${(cur * 3)}% → ${((cur + add) * 3)}% 伤害减免` },
  speed:   { label: '速度',  icon: '⚡',   unit: '每点 → +1.5 秒答题时间',   previewFn: (cur, add) => `+${(cur * 1.5).toFixed(1)}s → +${((cur + add) * 1.5).toFixed(1)}s 时间` },
  wenli:   { label: '文力',  icon: '📜',   unit: '每点 → +1 文力上限',       previewFn: (cur, add) => `${cur} → ${cur + add} 文力上限` },
  hp:      { label: '生命',  icon: '❤️',   unit: '每点 → +10 HP',            previewFn: (cur, add) => `${cur} → ${cur + add} HP` },
};

// ═════════════════════════════════════════════════════════════════════════════
// RENDER
// ═════════════════════════════════════════════════════════════════════════════

function renderLevelUp(params) {
  const { newLevel, previousScreen, previousParams } = params;
  const profile = gameState.profile;
  let statPointsRemaining = 2;
  const allocations = { attack: 0, defense: 0, speed: 0, wenli: 0, hp: 0 };

  // Talent tree: track pending (un-committed) talent selections
  // We work on a shallow snapshot so we can preview without mutating profile
  let pendingTalents = {};  // { talentKey: ranksToAdd }
  let talentPointsAvailable = profile.talentPoints || 0;
  const hasTalentPoints = talentPointsAvailable > 0;

  const div = document.createElement('div');
  div.className = 'screen';

  // ── helpers ──────────────────────────────────────────────────────────────

  /** Simulated profile that includes pending talent picks (for canLearnTalent) */
  function simProfile() {
    const sim = {
      ...profile,
      talents: { ...(profile.talents || {}) },
      talentPoints: talentPointsAvailable,
    };
    for (const [k, v] of Object.entries(pendingTalents)) {
      sim.talents[k] = (sim.talents[k] || 0) + v;
    }
    return sim;
  }

  function currentRank(key) {
    return ((profile.talents || {})[key] || 0) + (pendingTalents[key] || 0);
  }

  function canLearnInPreview(key) {
    return canLearnTalent(simProfile(), key);
  }

  function statCurrent(stat) {
    if (stat === 'hp')    return profile.maxHp;
    if (stat === 'wenli') return profile.maxWenli;
    return profile[stat];
  }

  // ── confirm logic ──────────────────────────────────────────────────────

  function canConfirm() {
    return statPointsRemaining === 0;
  }

  function applyAll() {
    // Stats
    profile.attack   += allocations.attack;
    profile.defense  += allocations.defense;
    profile.speed    += allocations.speed;
    profile.maxWenli += allocations.wenli;
    profile.maxHp    += allocations.hp * 10;

    // Talents (apply via real API so save + validation runs)
    for (const [key, ranks] of Object.entries(pendingTalents)) {
      for (let i = 0; i < ranks; i++) {
        learnTalent(profile, key);
        playSound('talent');
      }
    }

    // Full heal on level-up
    profile.hp    = profile.maxHp;
    profile.wenli = profile.maxWenli;

    gameState.save();
    playSound('levelup');

    if (previousScreen) {
      showScreen(previousScreen, previousParams || {});
    } else {
      showScreen('chapter-map');
    }
  }

  // ── render cycle ────────────────────────────────────────────────────────

  function render() {
    div.innerHTML = `
      <div style="
        text-align:center;
        padding:24px 16px 32px;
        max-width:540px;
        margin:0 auto;
        overflow-y:auto;
        max-height:100vh;
      ">
        <!-- ═══ HEADER ═══ -->
        <div style="font-size:2.8rem;margin-bottom:4px;filter:drop-shadow(0 0 8px rgba(212,160,23,0.7));">⬆️</div>
        <h2 style="
          color:var(--accent-gold);
          font-size:1.8rem;
          margin-bottom:4px;
          text-shadow: 0 0 12px rgba(212,160,23,0.5);
        ">
          升级！Level ${newLevel}
        </h2>
        <p style="color:var(--text-secondary);margin-bottom:20px;font-size:0.9rem;">
          属性点 <strong style="color:var(--accent-gold);">${statPointsRemaining}</strong>
          ${hasTalentPoints || Object.keys(pendingTalents).length > 0
            ? ` &nbsp;|&nbsp; 天赋点 <strong style="color:var(--purple, #8e44ad);">${talentPointsAvailable}</strong>`
            : ''}
        </p>

        <!-- ═══ STAT ALLOCATION ═══ -->
        <div style="
          display:grid;
          grid-template-columns:1fr 1fr;
          gap:10px;
          margin-bottom:${hasTalentPoints || talentPointsAvailable < (profile.talentPoints || 0) ? '16px' : '24px'};
        ">
          ${renderStatCard('attack')}
          ${renderStatCard('defense')}
          ${renderStatCard('speed')}
          ${renderStatCard('wenli')}
          ${renderStatCard('hp')}
        </div>

        <!-- ═══ TALENT TREE (only if player has / had talent points) ═══ -->
        ${hasTalentPoints || Object.keys(pendingTalents).length > 0 ? renderTalentTree() : ''}

        <!-- ═══ CONFIRM BUTTON ═══ -->
        <button class="btn btn-primary" id="confirm-all"
          style="
            width:100%;
            padding:14px;
            font-size:1.05rem;
            margin-top:16px;
            ${canConfirm()
              ? 'background:linear-gradient(135deg, var(--gold), var(--gold-bright));color:#111;font-weight:700;box-shadow:var(--shadow-gold);'
              : 'opacity:0.45;cursor:not-allowed;'}
          "
          ${canConfirm() ? '' : 'disabled'}>
          确认分配
        </button>
        ${statPointsRemaining > 0
          ? `<p style="font-size:0.92rem;color:var(--text-dim);margin-top:6px;">请先分配所有属性点</p>`
          : ''}
      </div>
    `;

    wireEvents();
  }

  // ── stat card ──────────────────────────────────────────────────────────

  function renderStatCard(stat) {
    const meta = STAT_META[stat];
    const cur = statCurrent(stat);
    const add = allocations[stat];
    const showPreview = add > 0;

    return `
      <div style="
        background:var(--bg-card);
        border:1px solid ${add > 0 ? 'var(--accent-jade)' : 'var(--bg-secondary)'};
        border-radius:10px;
        padding:12px;
        text-align:left;
        transition: border-color 0.2s, box-shadow 0.2s;
        ${add > 0 ? 'box-shadow: 0 0 8px rgba(46,204,138,0.25);' : ''}
      ">
        <!-- name + value -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:2px;">
          <span style="font-weight:700;font-size:0.95rem;">${meta.icon} ${meta.label}</span>
          <span style="color:var(--accent-gold);font-weight:600;">
            ${stat === 'hp' ? cur : cur}${add > 0
              ? ` <span style="color:var(--accent-jade);font-weight:700;">+${stat === 'hp' ? add * 10 : add}</span>`
              : ''}
          </span>
        </div>

        <!-- formula description -->
        <div style="font-size:0.9rem;color:var(--text-dim);margin-bottom:3px;">${meta.unit}</div>

        <!-- preview (only when points allocated) -->
        ${showPreview ? `
          <div style="
            font-size:0.92rem;
            color:var(--accent-jade);
            background:rgba(46,204,138,0.08);
            border-radius:6px;
            padding:3px 6px;
            margin-bottom:6px;
          ">${meta.previewFn(cur, stat === 'hp' ? add * 10 : add)}</div>
        ` : ''}

        <!-- +/- buttons -->
        <div style="display:flex;gap:6px;justify-content:flex-end;">
          <button class="btn stat-btn stat-minus" data-stat="${stat}"
            style="
              padding:2px 12px;font-size:0.95rem;border-radius:6px;min-width:32px;
              ${allocations[stat] <= 0 ? 'opacity:0.3;cursor:not-allowed;' : ''}
            "
            ${allocations[stat] <= 0 ? 'disabled' : ''}>−</button>
          <button class="btn stat-btn stat-plus" data-stat="${stat}"
            style="
              padding:2px 12px;font-size:0.95rem;border-radius:6px;min-width:32px;
              ${statPointsRemaining <= 0 ? 'opacity:0.3;cursor:not-allowed;' : ''}
            "
            ${statPointsRemaining <= 0 ? 'disabled' : ''}>+</button>
        </div>
      </div>`;
  }

  // ── talent tree ────────────────────────────────────────────────────────

  function renderTalentTree() {
    const branchOrder = ['combat', 'defense', 'speed', 'wisdom', 'fortune'];

    return `
      <div style="
        margin-top:8px;
        padding-top:14px;
        border-top:1px solid var(--bg-secondary);
      ">
        <h3 style="
          color:var(--purple, #8e44ad);
          font-size:1.1rem;
          margin-bottom:12px;
          text-shadow:0 0 8px rgba(142,68,173,0.4);
        ">
          天赋树
          <span style="font-size:0.95rem;color:var(--text-secondary);font-weight:400;margin-left:6px;">
            可用天赋点: ${talentPointsAvailable}
          </span>
        </h3>
        ${branchOrder.map(b => renderBranch(b)).join('')}
      </div>
    `;
  }

  function renderBranch(branchKey) {
    const meta = BRANCHES[branchKey];
    const talents = Object.entries(TALENT_TREE).filter(([, t]) => t.branch === branchKey);
    if (talents.length === 0) return '';

    return `
      <div style="margin-bottom:14px;">
        <!-- branch header -->
        <div style="
          display:flex;align-items:center;gap:6px;
          margin-bottom:8px;
          padding:4px 8px;
          background:${meta.color}18;
          border-left:3px solid ${meta.color};
          border-radius:0 6px 6px 0;
        ">
          <span style="font-size:1.1rem;">${meta.icon}</span>
          <span style="font-weight:600;font-size:0.95rem;color:${meta.color};">${meta.label}</span>
        </div>
        <!-- talent nodes -->
        <div style="display:flex;flex-wrap:wrap;gap:8px;padding-left:4px;">
          ${talents.map(([key, talent]) => renderTalentNode(key, talent, meta.color)).join('')}
        </div>
      </div>
    `;
  }

  function renderTalentNode(key, talent, branchColor) {
    const rank = currentRank(key);
    const maxed = rank >= talent.maxRank;
    const available = canLearnInPreview(key);
    const learned = rank > 0;
    const pending = (pendingTalents[key] || 0) > 0;

    // visual states
    let borderColor = 'var(--bg-secondary)';
    let bgColor = 'var(--bg-card)';
    let glowStyle = '';
    let opacity = '0.45';
    let cursor = 'not-allowed';

    if (maxed) {
      borderColor = 'var(--accent-gold)';
      bgColor = 'rgba(212,160,23,0.10)';
      glowStyle = 'box-shadow:0 0 10px rgba(212,160,23,0.35);';
      opacity = '1';
      cursor = 'default';
    } else if (learned) {
      borderColor = branchColor;
      bgColor = `${branchColor}12`;
      glowStyle = `box-shadow:0 0 8px ${branchColor}40;`;
      opacity = '1';
      cursor = available ? 'pointer' : 'default';
    } else if (available) {
      borderColor = branchColor;
      opacity = '1';
      cursor = 'pointer';
      // pulse animation via inline animation
      glowStyle = `animation: talent-pulse 1.8s ease-in-out infinite;`;
    }

    // Prerequisite text
    let reqText = '';
    if (talent.requires && !learned) {
      const reqs = Object.entries(talent.requires).map(([rk, minRank]) => {
        const rt = TALENT_TREE[rk];
        const have = currentRank(rk);
        const met = have >= minRank;
        return `<span style="color:${met ? 'var(--accent-jade)' : 'var(--accent-red)'};">${rt ? rt.name : rk} Lv.${minRank}</span>`;
      });
      reqText = `<div style="font-size:0.9rem;margin-top:3px;">需要: ${reqs.join(', ')}</div>`;
    }

    return `
      <div class="talent-node ${available ? 'talent-available' : ''}"
           data-talent="${key}"
           style="
             flex:1 1 calc(50% - 4px);
             min-width:140px;
             max-width:260px;
             background:${bgColor};
             border:1.5px solid ${borderColor};
             border-radius:8px;
             padding:10px;
             text-align:left;
             opacity:${opacity};
             cursor:${cursor};
             transition: all 0.2s;
             position:relative;
             ${glowStyle}
           ">
        <!-- icon + name + rank -->
        <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px;">
          <span style="font-size:1.15rem;margin-right:4px;">${talent.icon}</span>
          <span style="font-weight:700;font-size:0.95rem;flex:1;">${talent.name}</span>
          <span style="
            font-size:0.92rem;
            font-weight:600;
            padding:1px 6px;
            border-radius:4px;
            background:${maxed ? 'var(--accent-gold)' : learned ? branchColor : 'var(--bg-secondary)'};
            color:${maxed || learned ? '#111' : 'var(--text-dim)'};
          ">${rank}/${talent.maxRank}</span>
        </div>

        <!-- desc -->
        <div style="font-size:0.9rem;color:var(--text-secondary);line-height:1.35;">${talent.desc}</div>

        <!-- per-rank detail -->
        ${rank > 0 ? `
          <div style="font-size:0.9rem;color:var(--accent-jade);margin-top:2px;">
            当前: ${Object.entries(talent.perRank).map(([eff, val]) => `${eff} +${val * rank}`).join(', ')}
          </div>
        ` : ''}

        <!-- prerequisites -->
        ${reqText}

        <!-- pending indicator -->
        ${pending ? `
          <div style="
            position:absolute;top:-4px;right:-4px;
            background:var(--accent-jade);
            color:#111;
            font-size:0.9rem;
            font-weight:700;
            width:18px;height:18px;
            border-radius:50%;
            display:flex;align-items:center;justify-content:center;
          ">+${pendingTalents[key]}</div>
        ` : ''}
      </div>
    `;
  }

  // ── event wiring ──────────────────────────────────────────────────────

  function wireEvents() {
    // inject pulse keyframes once
    if (!document.getElementById('talent-pulse-style')) {
      const style = document.createElement('style');
      style.id = 'talent-pulse-style';
      style.textContent = `
        @keyframes talent-pulse {
          0%, 100% { box-shadow: 0 0 4px rgba(142,68,173,0.2); }
          50%      { box-shadow: 0 0 14px rgba(142,68,173,0.55), 0 0 24px rgba(142,68,173,0.2); }
        }
      `;
      document.head.appendChild(style);
    }

    setTimeout(() => {
      // Stat +/- buttons
      div.querySelectorAll('.stat-plus').forEach(btn => {
        btn.addEventListener('click', () => {
          if (statPointsRemaining <= 0) return;
          const stat = btn.dataset.stat;
          allocations[stat]++;
          statPointsRemaining--;
          playSound('click');
          render();
        });
      });

      div.querySelectorAll('.stat-minus').forEach(btn => {
        btn.addEventListener('click', () => {
          const stat = btn.dataset.stat;
          if (allocations[stat] <= 0) return;
          allocations[stat]--;
          statPointsRemaining++;
          playSound('click');
          render();
        });
      });

      // Talent nodes
      div.querySelectorAll('.talent-node.talent-available').forEach(node => {
        node.addEventListener('click', () => {
          const key = node.dataset.talent;
          if (!canLearnInPreview(key)) return;
          if (talentPointsAvailable <= 0) return;
          pendingTalents[key] = (pendingTalents[key] || 0) + 1;
          talentPointsAvailable--;
          playSound('click');
          render();
        });
      });

      // Right-click (or long press) to undo a pending talent pick
      div.querySelectorAll('.talent-node').forEach(node => {
        node.addEventListener('contextmenu', (e) => {
          e.preventDefault();
          const key = node.dataset.talent;
          if ((pendingTalents[key] || 0) <= 0) return;
          pendingTalents[key]--;
          if (pendingTalents[key] <= 0) delete pendingTalents[key];
          talentPointsAvailable++;
          playSound('click');
          render();
        });
      });

      // Confirm
      const confirmBtn = div.querySelector('#confirm-all');
      if (confirmBtn && canConfirm()) {
        confirmBtn.addEventListener('click', applyAll);
      }
    }, 0);
  }

  // ── kick off ────────────────────────────────────────────────────────────
  playSound('levelup');
  levelUpCelebration();
  render();

  // Tutorial: first level-up
  showTutorial(div, 'tutorial_levelup', {
    targetSelector: '.stat-plus',
    position: 'top',
  });

  // Tutorial: first talent points available
  if (hasTalentPoints) {
    showTutorial(div, 'tutorial_talents', {
      targetSelector: '.talent-node',
      position: 'top',
    });
  }

  return div;
}

registerScreen('levelup', renderLevelUp);
