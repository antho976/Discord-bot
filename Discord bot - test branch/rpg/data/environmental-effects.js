/**
 * Environmental Effects System - Hazards, buffs, and terrain effects in combat
 */

export const ENVIRONMENTS = {
  // Forest environments
  ancient_forest: {
    id: 'ancient_forest',
    name: '🌲 Ancient Forest',
    description: 'Dense trees provide cover and supernatural energy',
    effects: [
      {
        id: 'forest_mist',
        name: 'Forest Mist',
        type: 'hazard',
        icon: '🌫️',
        damagePerTurn: 0.1,
        effect: { type: 'blur', duration: 2, accuracyMod: -0.2 },
        frequency: 0.3, // 30% chance per turn
        description: 'Mystical mist reduces accuracy'
      },
      {
        id: 'nature_favor',
        name: 'Nature\'s Favor',
        type: 'buff',
        icon: '🌿',
        effect: { type: 'regen', duration: 999, regenPerTurn: 0.15 },
        frequency: 0.4,
        description: 'Natural energy regenerates HP'
      },
      {
        id: 'root_trap',
        name: 'Root Trap',
        type: 'hazard',
        icon: '🌱',
        effect: { type: 'slow', duration: 2 },
        frequency: 0.2,
        description: 'Roots grab and slow your movement'
      }
    ],
    playerBonus: { element: 'nature', damageBonus: 1.1 },
    enemyBonus: { element: 'nature', defenseBonus: 1.05 }
  },

  volcanic_cavern: {
    id: 'volcanic_cavern',
    name: '🌋 Volcanic Cavern',
    description: 'Lava flows make movement treacherous',
    effects: [
      {
        id: 'lava_floor',
        name: 'Lava Floor',
        type: 'hazard',
        icon: '🔥',
        damagePerTurn: 0.2,
        effect: { type: 'burn', duration: 3, damagePerTurn: 0.15 },
        frequency: 0.5,
        description: 'Standing on lava causes burns'
      },
      {
        id: 'magma_armor',
        name: 'Magma Armor',
        type: 'buff',
        icon: '🔥',
        effect: { type: 'fire_shield', duration: 999, reflectDamage: 0.3 },
        frequency: 0.3,
        description: 'Fire-type moves reflected to enemies'
      },
      {
        id: 'thermal_updraft',
        name: 'Thermal Updraft',
        type: 'obstacle',
        icon: '💨',
        effect: null,
        frequency: 0.4,
        description: 'Knockback effect throws lighter combatants'
      }
    ],
    playerBonus: { element: 'fire', damageBonus: 1.15 },
    enemyBonus: { element: 'fire', defenseBonus: 1.08 }
  },

  frozen_tundra: {
    id: 'frozen_tundra',
    name: '❄️ Frozen Tundra',
    description: 'Harsh blizzard conditions impede movement',
    effects: [
      {
        id: 'blizzard_winds',
        name: 'Blizzard Winds',
        type: 'hazard',
        icon: '🌨️',
        damagePerTurn: 0.15,
        effect: { type: 'freeze', duration: 2 },
        frequency: 0.35,
        description: 'Winds freeze and slow you'
      },
      {
        id: 'permafrost',
        name: 'Permafrost',
        type: 'hazard',
        icon: '❄️',
        effect: { type: 'slow', duration: 3, speedMod: -0.3 },
        frequency: 0.25,
        description: 'Ground is icy and slippery'
      },
      {
        id: 'polar_protection',
        name: 'Polar Protection',
        type: 'buff',
        icon: '🧊',
        effect: { type: 'ice_shield', duration: 999, damageReduction: 0.15 },
        frequency: 0.3,
        description: 'Ice coating reduces incoming damage'
      }
    ],
    playerBonus: { element: 'ice', damageBonus: 1.15 },
    enemyBonus: { element: 'ice', defenseBonus: 1.08 }
  },

  storm_ruin: {
    id: 'storm_ruin',
    name: '⚡ Storm Ruins',
    description: 'Lightning crackles throughout the area',
    effects: [
      {
        id: 'lightning_strike',
        name: 'Lightning Strike',
        type: 'hazard',
        icon: '⚡',
        damagePerTurn: 0.25,
        effect: { type: 'shock', duration: 2, accuracyMod: -0.15 },
        frequency: 0.4,
        description: 'Random lightning bolts strike'
      },
      {
        id: 'electrical_surge',
        name: 'Electrical Surge',
        type: 'buff',
        icon: '⚡',
        effect: { type: 'haste', duration: 999, speedBonus: 0.2 },
        frequency: 0.3,
        description: 'Electricity speeds up movement'
      },
      {
        id: 'conductive_ground',
        name: 'Conductive Ground',
        type: 'hazard',
        icon: '⚡',
        effect: null,
        frequency: 0.25,
        description: 'Electricity chains between combatants'
      }
    ],
    playerBonus: { element: 'electric', damageBonus: 1.12 },
    enemyBonus: { element: 'electric', defenseBonus: 1.06 }
  },

  shadow_void: {
    id: 'shadow_void',
    name: '🖤 Shadow Void',
    description: 'Darkness obscures everything',
    effects: [
      {
        id: 'creeping_darkness',
        name: 'Creeping Darkness',
        type: 'hazard',
        icon: '🖤',
        damagePerTurn: 0.12,
        effect: { type: 'blind', duration: 3, accuracyMod: -0.3 },
        frequency: 0.35,
        description: 'Darkness blinds you'
      },
      {
        id: 'shadow_step_terrain',
        name: 'Shadow Step Terrain',
        type: 'buff',
        icon: '🖤',
        effect: { type: 'shadow_hide', duration: 999, evadeBonus: 0.2 },
        frequency: 0.4,
        description: 'Shadows help you hide and dodge'
      },
      {
        id: 'void_drain',
        name: 'Void Drain',
        type: 'hazard',
        icon: '🖤',
        effect: null,
        frequency: 0.3,
        description: 'The void slowly drains your vitality'
      }
    ],
    playerBonus: { element: 'shadow', damageBonus: 1.12 },
    enemyBonus: { element: 'shadow', defenseBonus: 1.08 }
  },

  holy_sanctuary: {
    id: 'holy_sanctuary',
    name: '✨ Holy Sanctuary',
    description: 'Divine light protects and heals',
    effects: [
      {
        id: 'holy_light_beam',
        name: 'Holy Light Beam',
        type: 'buff',
        icon: '✨',
        effect: { type: 'holy_regen', duration: 999, regenPerTurn: 0.2 },
        frequency: 0.45,
        description: 'Holy light heals continuously'
      },
      {
        id: 'divine_ward',
        name: 'Divine Ward',
        type: 'buff',
        icon: '✨',
        effect: { type: 'blessing', duration: 999, damageReduction: 0.1 },
        frequency: 0.3,
        description: 'Divine blessing reduces damage'
      },
      {
        id: 'purification',
        name: 'Purification',
        type: 'buff',
        icon: '✨',
        effect: null,
        frequency: 0.25,
        description: 'Cleanses status effects'
      }
    ],
    playerBonus: { element: 'holy', damageBonus: 1.15 },
    enemyBonus: { element: 'holy', defenseBonus: 1.06 }
  },

  neutral_arena: {
    id: 'neutral_arena',
    name: '⚔️ Neutral Arena',
    description: 'A fair battleground with no environmental effects',
    effects: [],
    playerBonus: null,
    enemyBonus: null
  },

  // Ancient Ruins
  ancient_ruins: {
    id: 'ancient_ruins',
    name: '🏛️ Ancient Ruins',
    description: 'Crumbling stone structures hold forgotten magic',
    effects: [
      {
        id: 'magick_surge',
        name: 'Magick Surge',
        type: 'buff',
        icon: '✨',
        effect: { type: 'arcane_boost', duration: 999, damageBonus: 0.2 },
        frequency: 0.35,
        description: 'Ancient magic amplifies spellcasting'
      },
      {
        id: 'crumbling_stone',
        name: 'Crumbling Stone',
        type: 'hazard',
        icon: '🪨',
        damagePerTurn: 0.12,
        effect: { type: 'debuff', duration: 2 },
        frequency: 0.3,
        description: 'Falling rocks deal damage'
      },
      {
        id: 'ancestral_echo',
        name: 'Ancestral Echo',
        type: 'buff',
        icon: '👻',
        effect: { type: 'spirit_walk', duration: 999, evadeBonus: 0.15 },
        frequency: 0.25,
        description: 'Ancient spirits grant evasion'
      }
    ],
    playerBonus: { element: 'arcane', damageBonus: 1.12 },
    enemyBonus: { element: 'arcane', defenseBonus: 1.07 }
  },

  // The Abyss
  the_abyss: {
    id: 'the_abyss',
    name: '🌌 The Abyss',
    description: 'An infinite void of cosmic darkness and despair',
    effects: [
      {
        id: 'void_hunger',
        name: 'Void Hunger',
        type: 'hazard',
        icon: '🌌',
        damagePerTurn: 0.18,
        effect: { type: 'life_drain', duration: 999, drainPerTurn: 0.1 },
        frequency: 0.4,
        description: 'The void slowly drains your life'
      },
      {
        id: 'cosmic_echo',
        name: 'Cosmic Echo',
        type: 'hazard',
        icon: '⭐',
        effect: { type: 'confusion', duration: 2 },
        frequency: 0.25,
        description: 'Reality bends and confuses'
      },
      {
        id: 'void_mastery',
        name: 'Void Mastery',
        type: 'buff',
        icon: '🌌',
        effect: { type: 'void_shield', duration: 999, damageReduction: 0.2 },
        frequency: 0.3,
        description: 'Void users gain protection'
      }
    ],
    playerBonus: { element: 'void', damageBonus: 1.18 },
    enemyBonus: { element: 'void', defenseBonus: 1.1 }
  },

  // Crystal Cavern
  crystal_cavern: {
    id: 'crystal_cavern',
    name: '💎 Crystal Cavern',
    description: 'Shimmering crystal formations amplify all magic',
    effects: [
      {
        id: 'crystal_reflect',
        name: 'Crystal Reflection',
        type: 'buff',
        icon: '💎',
        effect: { type: 'spell_reflect', duration: 999, reflectChance: 0.2 },
        frequency: 0.35,
        description: 'Crystals reflect magic back'
      },
      {
        id: 'prismatic_burst',
        name: 'Prismatic Burst',
        type: 'hazard',
        icon: '🌈',
        damagePerTurn: 0.14,
        effect: { type: 'blind', duration: 2 },
        frequency: 0.3,
        description: 'Dazzling light blinds combatants'
      },
      {
        id: 'mana_resonance',
        name: 'Mana Resonance',
        type: 'buff',
        icon: '🔮',
        effect: { type: 'mana_regen', duration: 999, regenPerTurn: 0.2 },
        frequency: 0.4,
        description: 'Crystals regenerate mana'
      }
    ],
    playerBonus: { element: 'magic', damageBonus: 1.14 },
    enemyBonus: { element: 'magic', defenseBonus: 1.06 }
  },

  // Cursed Graveyard
  cursed_graveyard: {
    id: 'cursed_graveyard',
    name: '⚰️ Cursed Graveyard',
    description: 'Unhallowed ground where undead roam freely',
    effects: [
      {
        id: 'grave_curse',
        name: 'Grave\'s Curse',
        type: 'hazard',
        icon: '⚰️',
        damagePerTurn: 0.16,
        effect: { type: 'curse', duration: 3, debuffDamage: 0.15 },
        frequency: 0.35,
        description: 'Curses reduce your power'
      },
      {
        id: 'undead_strength',
        name: 'Undead Strength',
        type: 'buff',
        icon: '💀',
        effect: { type: 'undead_empower', duration: 999, damageBonus: 0.15 },
        frequency: 0.3,
        description: 'Undead gain unholy power'
      },
      {
        id: 'soul_whispers',
        name: 'Soul Whispers',
        type: 'hazard',
        icon: '👻',
        effect: { type: 'stress', duration: 2 },
        frequency: 0.25,
        description: 'Tormented souls whisper dark thoughts'
      }
    ],
    playerBonus: { element: 'dark', damageBonus: 1.13 },
    enemyBonus: { element: 'dark', defenseBonus: 1.08 }
  },

  // Molten Chasm
  molten_chasm: {
    id: 'molten_chasm',
    name: '🔥 Molten Chasm',
    description: 'Extreme heat from a world-ending inferno',
    effects: [
      {
        id: 'inferno_blast',
        name: 'Inferno Blast',
        type: 'hazard',
        icon: '🔥',
        damagePerTurn: 0.25,
        effect: { type: 'burn', duration: 4, damagePerTurn: 0.2 },
        frequency: 0.5,
        description: 'Massive flames consume everything'
      },
      {
        id: 'lava_wave',
        name: 'Lava Wave',
        type: 'hazard',
        icon: '🌊',
        effect: { type: 'knockback', duration: 1 },
        frequency: 0.4,
        description: 'Waves of lava knock you around'
      },
      {
        id: 'pyroclastic_armor',
        name: 'Pyroclastic Armor',
        type: 'buff',
        icon: '🔥',
        effect: { type: 'fire_immunity', duration: 999, burnResist: 0.8 },
        frequency: 0.35,
        description: 'Fire users are nearly immune'
      }
    ],
    playerBonus: { element: 'fire', damageBonus: 1.2 },
    enemyBonus: { element: 'fire', defenseBonus: 1.12 }
  },

  // Thunderstorm Peak
  thunderstorm_peak: {
    id: 'thunderstorm_peak',
    name: '⚡ Thunderstorm Peak',
    description: 'Mountain peak wreathed in perpetual lightning',
    effects: [
      {
        id: 'mega_lightning',
        name: 'Mega Lightning',
        type: 'hazard',
        icon: '⚡',
        damagePerTurn: 0.22,
        effect: { type: 'stun', duration: 1, stunChance: 0.3 },
        frequency: 0.45,
        description: 'Massive lightning bolts strike randomly'
      },
      {
        id: 'static_field',
        name: 'Static Field',
        type: 'hazard',
        icon: '⚡',
        effect: { type: 'shock', duration: 2 },
        frequency: 0.3,
        description: 'Electric field causes constant shock'
      },
      {
        id: 'storm_conductivity',
        name: 'Storm Conductivity',
        type: 'buff',
        icon: '⚡',
        effect: { type: 'voltage_boost', duration: 999, critBonus: 0.2 },
        frequency: 0.35,
        description: 'Lightning users gain critical power'
      }
    ],
    playerBonus: { element: 'electric', damageBonus: 1.16 },
    enemyBonus: { element: 'electric', defenseBonus: 1.09 }
  },

  neutral_arena: {
    id: 'neutral_arena',
    name: '⚔️ Neutral Arena',
    description: 'A fair battleground with no environmental effects',
    effects: [],
    playerBonus: null,
    enemyBonus: null
  }
};

/**
 * Get environment by ID
 */
export function getEnvironment(envId) {
  return ENVIRONMENTS[envId] || ENVIRONMENTS.neutral_arena;
}

/**
 * Get random environment
 */
export function getRandomEnvironment(excludeNeutral = false) {
  const keys = Object.keys(ENVIRONMENTS);
  if (excludeNeutral) {
    const filtered = keys.filter(k => k !== 'neutral_arena');
    return ENVIRONMENTS[filtered[Math.floor(Math.random() * filtered.length)]];
  }
  return ENVIRONMENTS[keys[Math.floor(Math.random() * keys.length)]];
}

/**
 * Process environment effects for a turn
 */
export function processEnvironmentEffects(environment, targetName = 'player') {
  if (!environment || !environment.effects || environment.effects.length === 0) {
    return null;
  }

  const activeEffects = [];

  for (const effect of environment.effects) {
    if (Math.random() <= effect.frequency) {
      activeEffects.push({
        ...effect,
        target: targetName,
        timestamp: Date.now()
      });
    }
  }

  return activeEffects.length > 0 ? activeEffects : null;
}

/**
 * Get environment description with effects
 */
export function getEnvironmentDescription(environment) {
  if (!environment || !environment.effects) return 'A neutral location.';

  const hazards = environment.effects.filter(e => e.type === 'hazard');
  const buffs = environment.effects.filter(e => e.type === 'buff');

  let desc = `${environment.description}\n`;
  if (hazards.length > 0) {
    desc += `\n**Hazards:** ${hazards.map(h => `${h.icon} ${h.name}`).join(', ')}`;
  }
  if (buffs.length > 0) {
    desc += `\n**Opportunities:** ${buffs.map(b => `${b.icon} ${b.name}`).join(', ')}`;
  }

  return desc;
}
