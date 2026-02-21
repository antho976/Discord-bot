/**
 * Skill Combo System - Chain skills together for bonus effects
 */

// Combo definitions: previousSkill -> nextSkill = bonus effect
export const SKILL_COMBOS = {
  // WARRIOR COMBOS
  slash_shield_bash: {
    first: 'slash',
    second: 'shield_bash',
    bonus: { damageMultiplier: 1.3, effect: { type: 'stun', duration: 1 } },
    description: '⚔️→🛡️ Shield Bash after Slash staggers enemy',
    icon: '🎯'
  },
  shield_bash_cleave: {
    first: 'shield_bash',
    second: 'cleave',
    bonus: { damageMultiplier: 1.4 },
    description: '🛡️→⚔️ Cleave after Shield Bash deals massive damage',
    icon: '🎯'
  },
  cleave_whirlwind: {
    first: 'cleave',
    second: 'whirlwind',
    bonus: { damageMultiplier: 1.5, effect: { type: 'bleed', duration: 3, damagePerTurn: 0.2 } },
    description: '⚔️→🌀 Whirlwind after Cleave causes bleeding',
    icon: '🎯'
  },
  parry_execute: {
    first: 'parry',
    second: 'execute',
    bonus: { damageMultiplier: 1.6, accuracyBonus: 0.2 },
    description: '🛡️→⚔️ Execute is guaranteed after Parry',
    icon: '🎯'
  },
  battle_shout_reckless_strike: {
    first: 'battle_shout',
    second: 'reckless_strike',
    bonus: { damageMultiplier: 1.4, effect: null },
    description: '📣→⚔️ Reckless Strike enhanced after Battle Shout',
    icon: '🎯'
  },

  // MAGE COMBOS
  ice_spike_lightning_bolt: {
    first: 'ice_spike',
    second: 'lightning_bolt',
    bonus: { damageMultiplier: 1.25, effect: { type: 'shock', duration: 2 } },
    description: '❄️→⚡ Lightning chains through frozen targets',
    icon: '🎯'
  },
  fireball_arcane_blast: {
    first: 'fireball',
    second: 'arcane_blast',
    bonus: { damageMultiplier: 1.35, effect: { type: 'burn', duration: 3, damagePerTurn: 0.2 } },
    description: '🔥→🔮 Arcane Blast ignites everything',
    icon: '🎯'
  },
  frost_nova_meteor: {
    first: 'frost_nova',
    second: 'meteor',
    bonus: { damageMultiplier: 1.5, effect: { type: 'stun', duration: 2 } },
    description: '❄️→☄️ Meteors fall harder on frozen ground',
    icon: '🎯'
  },
  mana_shield_chain_lightning: {
    first: 'mana_shield',
    second: 'chain_lightning',
    bonus: { damageMultiplier: 1.2, shieldBonus: 1.5 },
    description: '🛡️→⚡ Mana Shield reflects lightning',
    icon: '🎯'
  },
  time_warp_overcharge_blast: {
    first: 'time_warp',
    second: 'overcharge_blast',
    bonus: { damageMultiplier: 2.0, cooldownReduction: 0.5 },
    description: '⏰→🔮 Overcharge blast is doubled after Time Warp',
    icon: '🎯'
  },

  // ROGUE COMBOS
  backstab_poison_strike: {
    first: 'backstab',
    second: 'poison_strike',
    bonus: { damageMultiplier: 1.3, effect: { type: 'poison', duration: 4, damagePerTurn: 0.15 } },
    description: '🗡️→☠️ Poison spreads after Backstab',
    icon: '🎯'
  },
  shadow_step_assassinate: {
    first: 'shadow_step',
    second: 'assassinate',
    bonus: { damageMultiplier: 1.6, accuracyBonus: 0.3 },
    description: '🌑→⚡ Assassinate is guaranteed from Shadows',
    icon: '🎯'
  },
  evade_riposte: {
    first: 'evade',
    second: 'riposte',
    bonus: { damageMultiplier: 1.4, effect: null },
    description: '🛡️→🗡️ Riposte hits harder after successful Evade',
    icon: '🎯'
  },
  smoke_bomb_blade_flurry: {
    first: 'smoke_bomb',
    second: 'blade_flurry',
    bonus: { damageMultiplier: 1.5, effect: { type: 'blind', duration: 2 } },
    description: '💨→🗡️ Blade Flurry is invisible in smoke',
    icon: '🎯'
  },
  shadow_gamble_master_assassin: {
    first: 'shadow_gamble',
    second: 'master_assassin',
    bonus: { damageMultiplier: 1.8, critChance: 0.3 },
    description: '🎰→⚡ Master Assassin always lands after Gamble',
    icon: '🎯'
  },

  // PALADIN COMBOS
  holy_strike_divine_protection: {
    first: 'holy_strike',
    second: 'divine_protection',
    bonus: { shieldBonus: 1.4, effect: null },
    description: '⚔️→✨ Divine Protection stronger after Holy Strike',
    icon: '🎯'
  },
  heal_judgment: {
    first: 'heal',
    second: 'judgment',
    bonus: { damageMultiplier: 1.3, effect: null },
    description: '💚→⚖️ Judgment empowered by Healing',
    icon: '🎯'
  },
  divine_shield_martyr_strike: {
    first: 'divine_shield',
    second: 'martyr_strike',
    bonus: { damageMultiplier: 1.5, shieldBonus: 1.2 },
    description: '🛡️→⚔️ Martyr Strike converts shield to damage',
    icon: '🎯'
  },
  radiant_burst_consecration: {
    first: 'radiant_burst',
    second: 'consecration',
    bonus: { damageMultiplier: 1.25, effect: { type: 'holy_burn', duration: 3 } },
    description: '✨→☀️ Consecration ground burns enemy',
    icon: '🎯'
  },
  divine_protection_radiant_burst: {
    first: 'divine_protection',
    second: 'radiant_burst',
    bonus: { damageMultiplier: 1.2, shieldBonus: 1.3 },
    description: '🛡️→✨ Radiant Burst bursts from protection',
    icon: '🎯'
  }
};

// Track last skill used for combo detection
export const COMBO_HISTORY = new Map(); // userId -> { lastSkill, lastTime, comboChain }

/**
 * Check if a combo is available
 */
export function checkCombo(firstSkill, secondSkill) {
  for (const comboId in SKILL_COMBOS) {
    const combo = SKILL_COMBOS[comboId];
    if (combo.first === firstSkill && combo.second === secondSkill) {
      return combo;
    }
  }
  return null;
}

/**
 * Get combo by ID
 */
export function getCombo(comboId) {
  return SKILL_COMBOS[comboId] || null;
}

/**
 * Get all combos for a class (based on available skills)
 */
export function getCombosForClass(playerSkills) {
  const combos = [];
  
  for (const comboId in SKILL_COMBOS) {
    const combo = SKILL_COMBOS[comboId];
    if (playerSkills.includes(combo.first) && playerSkills.includes(combo.second)) {
      combos.push({
        id: comboId,
        ...combo
      });
    }
  }

  return combos;
}

/**
 * Record a skill usage for combo detection
 * Returns the combo if triggered, null otherwise
 */
export function recordSkillUsage(userId, skillId, playerSkills) {
  const history = COMBO_HISTORY.get(userId) || { lastSkill: null, lastTime: 0 };
  const now = Date.now();
  
  // Check if combo should trigger (within 5 seconds)
  if (history.lastSkill && now - history.lastTime < 5000) {
    const combo = checkCombo(history.lastSkill, skillId);
    if (combo && playerSkills.includes(skillId)) {
      // Combo successful!
      COMBO_HISTORY.set(userId, { lastSkill: null, lastTime: 0, comboChain: 2 });
      return combo;
    }
  }

  // Update history for next check
  COMBO_HISTORY.set(userId, { lastSkill: skillId, lastTime: now, comboChain: 1 });
  return null;
}

/**
 * Reset combo history (end of combat)
 */
export function resetComboHistory(userId) {
  COMBO_HISTORY.delete(userId);
}

/**
 * Apply combo bonus to damage calculation
 */
export function applyComboBonus(baseDamage, combo) {
  if (!combo) return baseDamage;
  
  const multiplier = combo.bonus.damageMultiplier || 1;
  return Math.floor(baseDamage * multiplier);
}
