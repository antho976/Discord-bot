/**
 * Combat Styles System - Modify available skills and combat behavior during fights
 */

export const COMBAT_STYLES = {
  // Warrior styles
  defensive: {
    id: 'defensive',
    name: 'Defensive Stance',
    icon: '🛡️',
    description: 'Prioritize protection and survivability',
    statMods: {
      damageDealt: 0.85,
      damageTaken: 0.75,
      accuracy: 0.95,
      crit: 0.5
    },
    availableFor: ['warrior', 'paladin'],
    skillModifiers: {
      // These skills are enhanced in this style
      'shield_bash': { damageMult: 1.2, costMult: 0.8 },
      'parry': { damageMult: 1.15, costMult: 0.8 },
      'divine_protection': { damageMult: 1.3, costMult: 0.8 },
      'shield_wall': { damageMult: 1.2, costMult: 0.8 }
    },
    bonusAbilities: ['shield_bash', 'parry'], // Extra actions available
    description: 'Reduce incoming damage by 25% at the cost of 15% damage output'
  },

  aggressive: {
    id: 'aggressive',
    name: 'Aggressive Stance',
    icon: '⚔️',
    description: 'Maximize damage output and critical strike chance',
    statMods: {
      damageDealt: 1.25,
      damageTaken: 1.15,
      accuracy: 1.05,
      crit: 1.3
    },
    availableFor: ['warrior', 'rogue', 'mage'],
    skillModifiers: {
      'slash': { damageMult: 1.35, costMult: 1.1 },
      'cleave': { damageMult: 1.3, costMult: 1.1 },
      'reckless_strike': { damageMult: 1.5, costMult: 1.0 },
      'backstab': { damageMult: 1.4, costMult: 1.1 },
      'blade_flurry': { damageMult: 1.3, costMult: 1.1 },
      'fireball': { damageMult: 1.35, costMult: 1.1 },
      'meteor': { damageMult: 1.4, costMult: 1.1 }
    },
    bonusAbilities: ['execute', 'assassinate'],
    description: 'Deal 25% more damage but take 15% more damage'
  },

  balanced: {
    id: 'balanced',
    name: 'Balanced Style',
    icon: '⚖️',
    description: 'Equal focus on offense and defense',
    statMods: {
      damageDealt: 1.0,
      damageTaken: 1.0,
      accuracy: 1.0,
      crit: 1.0
    },
    availableFor: ['warrior', 'rogue', 'mage', 'paladin'],
    skillModifiers: {},
    bonusAbilities: [],
    description: 'No modifiers - standard combat'
  },

  // Rogue styles
  shadow_dancer: {
    id: 'shadow_dancer',
    name: 'Shadow Dancer',
    icon: '🌑',
    description: 'Enhanced evasion and dodge mechanics',
    statMods: {
      damageDealt: 0.95,
      damageTaken: 0.7,
      accuracy: 0.9,
      crit: 1.2
    },
    availableFor: ['rogue', 'mage'],
    skillModifiers: {
      'evade': { damageMult: 1.25, costMult: 0.7 },
      'shadow_step': { damageMult: 1.2, costMult: 0.8 },
      'smoke_bomb': { damageMult: 1.15, costMult: 0.8 },
      'riposte': { damageMult: 1.3, costMult: 0.9 },
      'shadow_clone': { damageMult: 1.2, costMult: 1.0 }
    },
    bonusAbilities: ['shadow_step', 'vanish'],
    description: 'Reduce damage taken by 30% when you dodge'
  },

  executioner: {
    id: 'executioner',
    name: 'Executioner',
    icon: '⚡',
    description: 'Massive damage against weakened enemies',
    statMods: {
      damageDealt: 1.3,
      damageTaken: 1.0,
      accuracy: 1.1,
      crit: 1.4
    },
    availableFor: ['rogue', 'warrior'],
    skillModifiers: {
      'backstab': { damageMult: 1.5, costMult: 1.0 },
      'poison_strike': { damageMult: 1.4, costMult: 0.9 },
      'assassinate': { damageMult: 1.6, costMult: 1.1 },
      'execute': { damageMult: 1.7, costMult: 1.0 },
      'death_mark': { damageMult: 1.5, costMult: 1.0 }
    },
    bonusAbilities: ['assassinate', 'death_mark'],
    description: '+30% damage against enemies below 50% HP'
  },

  // Mage styles
  pyromancer: {
    id: 'pyromancer',
    name: 'Pyromancer',
    icon: '🔥',
    description: 'Specialize in fire damage and burning effects',
    statMods: {
      damageDealt: 1.2,
      damageTaken: 1.1,
      accuracy: 1.0,
      crit: 1.15
    },
    availableFor: ['mage'],
    skillModifiers: {
      'fireball': { damageMult: 1.4, costMult: 1.0 },
      'inferno': { damageMult: 1.5, costMult: 0.9 },
      'overcharge_blast': { damageMult: 1.3, costMult: 1.0 },
      'mana_burst': { damageMult: 1.2, costMult: 1.1 }
    },
    bonusAbilities: ['inferno'],
    description: 'Fire damage deals 20% more. Burn lasts 1 round longer'
  },

  cryomancer: {
    id: 'cryomancer',
    name: 'Cryomancer',
    icon: '❄️',
    description: 'Master of ice and crowd control',
    statMods: {
      damageDealt: 1.0,
      damageTaken: 0.9,
      accuracy: 1.1,
      crit: 0.8
    },
    availableFor: ['mage'],
    skillModifiers: {
      'ice_spike': { damageMult: 1.3, costMult: 0.9 },
      'frost_nova': { damageMult: 1.4, costMult: 0.9 },
      'mana_shield': { damageMult: 1.25, costMult: 0.8 },
      'dimensional_rift': { damageMult: 1.2, costMult: 1.0 }
    },
    bonusAbilities: ['frost_nova', 'mana_shield'],
    description: 'Freeze duration increased by 1 turn. Slowed enemies move 50% slower'
  },

  spellblade: {
    id: 'spellblade',
    name: 'Spellblade',
    icon: '✨',
    description: 'Balance physical and magical damage',
    statMods: {
      damageDealt: 1.15,
      damageTaken: 1.0,
      accuracy: 1.05,
      crit: 1.2
    },
    availableFor: ['mage', 'warrior'],
    skillModifiers: {
      'arcane_blast': { damageMult: 1.3, costMult: 1.0 },
      'chain_lightning': { damageMult: 1.25, costMult: 1.0 },
      'spell_amplify': { damageMult: 1.4, costMult: 0.9 },
      'lightning_bolt': { damageMult: 1.2, costMult: 0.9 }
    },
    bonusAbilities: ['arcane_blast'],
    description: 'Spells chain to multiple targets'
  },

  // Paladin styles
  crusader: {
    id: 'crusader',
    name: 'Crusader',
    icon: '⚔️',
    description: 'Divine judgment with offensive holy power',
    statMods: {
      damageDealt: 1.2,
      damageTaken: 0.85,
      accuracy: 1.05,
      crit: 1.1
    },
    availableFor: ['paladin'],
    skillModifiers: {
      'holy_strike': { damageMult: 1.35, costMult: 1.0 },
      'judgment': { damageMult: 1.4, costMult: 0.9 },
      'radiant_burst': { damageMult: 1.3, costMult: 1.0 },
      'divine_shield': { damageMult: 1.15, costMult: 0.8 }
    },
    bonusAbilities: ['judgment'],
    description: 'Holy damage deals 20% more. Enemies hit by judgment are weakened'
  },

  guardian: {
    id: 'guardian',
    name: 'Guardian',
    icon: '✨',
    description: 'Protector of allies with healing and barriers',
    statMods: {
      damageDealt: 0.8,
      damageTaken: 0.7,
      accuracy: 0.95,
      crit: 0.6
    },
    availableFor: ['paladin'],
    skillModifiers: {
      'heal': { damageMult: 1.5, costMult: 0.7 },
      'divine_protection': { damageMult: 1.4, costMult: 0.8 },
      'divine_shield': { damageMult: 1.5, costMult: 0.8 },
      'consecration': { damageMult: 1.2, costMult: 0.9 }
    },
    bonusAbilities: ['heal', 'divine_protection'],
    description: 'Healing heals 25% more. Shields last 1 extra turn'
  }
};

/**
 * Get combat style by ID
 */
export function getCombatStyle(styleId) {
  return COMBAT_STYLES[styleId] || null;
}

/**
 * Get available styles for a class
 */
export function getStylesForClass(classId) {
  const styles = [];
  for (const styleId in COMBAT_STYLES) {
    const style = COMBAT_STYLES[styleId];
    if (style.availableFor.includes(classId)) {
      styles.push({
        id: styleId,
        ...style
      });
    }
  }
  return styles;
}

/**
 * Apply style modifiers to damage calculation
 */
export function applyStyleModifiers(baseDamage, style, skillId) {
  if (!style) return baseDamage;

  const skillMod = style.skillModifiers[skillId];
  const mult = skillMod ? skillMod.damageMult : 1;

  return Math.floor(baseDamage * mult);
}

/**
 * Apply style stat modifiers
 */
export function applyStyleStatMods(baseStat, style, statType) {
  if (!style || !style.statMods[statType]) return baseStat;
  return Math.floor(baseStat * style.statMods[statType]);
}

/**
 * Check if skill is available in a style
 */
export function isSkillAvailableInStyle(skillId, style) {
  if (!style) return true; // No style restriction
  
  // Skill is available if it's normally usable or in bonus abilities
  return style.bonusAbilities.includes(skillId);
}
