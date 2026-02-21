/**
 * Boss Abilities System - Special attacks and mechanics for bosses
 */

// Boss ability categories
export const BOSS_ABILITIES = {
  // FIRE BOSSES
  inferno_lord: {
    name: 'Inferno Lord',
    element: 'fire',
    phase1: {
      abilities: ['fireball_barrage', 'heat_wave', 'flame_strike'],
      trigger: 100, // Percent HP
      description: 'Uses flame attacks'
    },
    phase2: {
      abilities: ['meteor_storm', 'magma_eruption', 'incinerate'],
      trigger: 60, // Triggers at 60% HP
      description: 'Enters enraged state, uses devastating fire attacks'
    },
    phase3: {
      abilities: ['apocalypse_fire', 'final_inferno', 'magma_eruption'],
      trigger: 30, // Triggers at 30% HP
      description: 'Desperate final stand with ultimate fire magic'
    },
    weakness: 'water',
    resistance: 'fire'
  },

  // ICE BOSSES
  frost_queen: {
    name: 'Frost Queen',
    element: 'ice',
    phase1: {
      abilities: ['ice_shard', 'blizzard', 'frozen_touch'],
      trigger: 100,
      description: 'Freezes the battlefield'
    },
    phase2: {
      abilities: ['absolute_zero', 'glacial_prison', 'winter_wrath'],
      trigger: 50,
      description: 'Freezes time itself with devastating power'
    },
    phase3: {
      abilities: ['eternal_winter', 'arctic_annihilation'],
      trigger: 25,
      description: 'Ultimate ice magic that binds all to frozen fate'
    },
    weakness: 'fire',
    resistance: 'ice'
  },

  // LIGHTNING BOSSES
  storm_titan: {
    name: 'Storm Titan',
    element: 'electric',
    phase1: {
      abilities: ['lightning_bolt', 'arc_chain', 'electric_surge'],
      trigger: 100,
      description: 'Strikes with electricity'
    },
    phase2: {
      abilities: ['tempest', 'chain_reaction', 'thunder_dome'],
      trigger: 65,
      description: 'Creates a field of lightning'
    },
    phase3: {
      abilities: ['cataclysm_storm', 'infinite_surge', 'world_eater'],
      trigger: 30,
      description: 'Becomes one with the storm'
    },
    weakness: 'earth',
    resistance: 'electric'
  },

  // SHADOW BOSSES
  shadow_king: {
    name: 'Shadow King',
    element: 'shadow',
    phase1: {
      abilities: ['shadow_strike', 'darkness_cloud', 'void_touch'],
      trigger: 100,
      description: 'Strikes from the darkness'
    },
    phase2: {
      abilities: ['shadow_split', 'void_realm', 'nightmare_vortex'],
      trigger: 55,
      description: 'Splits between light and shadow realms'
    },
    phase3: {
      abilities: ['void_supremacy', 'infinite_darkness', 'absence'],
      trigger: 25,
      description: 'Becomes incarnate darkness'
    },
    weakness: 'holy',
    resistance: 'shadow'
  },

  // HOLY BOSSES
  celestial_guardian: {
    name: 'Celestial Guardian',
    element: 'holy',
    phase1: {
      abilities: ['holy_light', 'divine_strike', 'sanctified_barrier'],
      trigger: 100,
      description: 'Radiates holy power'
    },
    phase2: {
      abilities: ['redemption', 'heavenly_judgment', 'blessing_aura'],
      trigger: 60,
      description: 'Calls upon celestial power'
    },
    phase3: {
      abilities: ['ascension', 'divine_judgment', 'salvation'],
      trigger: 30,
      description: 'Becomes a celestial being of pure light'
    },
    weakness: 'shadow',
    resistance: 'holy'
  }
};

// Individual ability definitions
export const ABILITIES = {
  // Fire abilities
  fireball_barrage: {
    id: 'fireball_barrage',
    name: '🔥 Fireball Barrage',
    damage: 1.2,
    element: 'fire',
    effect: null,
    description: 'Launches multiple fireballs'
  },
  heat_wave: {
    id: 'heat_wave',
    name: '♨️ Heat Wave',
    damage: 0.8,
    element: 'fire',
    effect: { type: 'burn', duration: 3, damagePerTurn: 0.3 },
    description: 'Deals ongoing fire damage'
  },
  flame_strike: {
    id: 'flame_strike',
    name: '⚔️ Flame Strike',
    damage: 1.4,
    element: 'fire',
    effect: null,
    description: 'A powerful flame-fueled strike'
  },
  meteor_storm: {
    id: 'meteor_storm',
    name: '☄️ Meteor Storm',
    damage: 2.0,
    element: 'fire',
    effect: { type: 'stun', duration: 1 },
    description: 'Meteors rain from the sky'
  },
  magma_eruption: {
    id: 'magma_eruption',
    name: '🌋 Magma Eruption',
    damage: 1.8,
    element: 'fire',
    effect: { type: 'burn', duration: 4, damagePerTurn: 0.4 },
    description: 'Erupts with molten lava'
  },
  incinerate: {
    id: 'incinerate',
    name: '🔥 Incinerate',
    damage: 2.2,
    element: 'fire',
    effect: { type: 'burn', duration: 5, damagePerTurn: 0.5 },
    description: 'Incinerates everything'
  },
  apocalypse_fire: {
    id: 'apocalypse_fire',
    name: '💥 Apocalypse Fire',
    damage: 2.8,
    element: 'fire',
    effect: { type: 'burn', duration: 6, damagePerTurn: 0.6 },
    description: 'Fire that consumes all existence'
  },
  final_inferno: {
    id: 'final_inferno',
    name: '🌪️ Final Inferno',
    damage: 2.5,
    element: 'fire',
    effect: { type: 'stun', duration: 2 },
    description: 'The final blaze before defeat'
  },

  // Ice abilities
  ice_shard: {
    id: 'ice_shard',
    name: '❄️ Ice Shard',
    damage: 1.0,
    element: 'ice',
    effect: null,
    description: 'Launches shards of ice'
  },
  blizzard: {
    id: 'blizzard',
    name: '🌨️ Blizzard',
    damage: 1.5,
    element: 'ice',
    effect: { type: 'slow', duration: 3 },
    description: 'A raging winter storm'
  },
  frozen_touch: {
    id: 'frozen_touch',
    name: '🧊 Frozen Touch',
    damage: 1.1,
    element: 'ice',
    effect: { type: 'freeze', duration: 2 },
    description: 'Freezes the target'
  },
  absolute_zero: {
    id: 'absolute_zero',
    name: '❄️ Absolute Zero',
    damage: 2.3,
    element: 'ice',
    effect: { type: 'freeze', duration: 3 },
    description: 'All warmth vanishes'
  },
  glacial_prison: {
    id: 'glacial_prison',
    name: '🧊 Glacial Prison',
    damage: 1.6,
    element: 'ice',
    effect: { type: 'stun', duration: 2 },
    description: 'Imprisons in ice'
  },
  winter_wrath: {
    id: 'winter_wrath',
    name: '🌨️ Winter Wrath',
    damage: 2.1,
    element: 'ice',
    effect: { type: 'slow', duration: 4 },
    description: 'The fury of winter'
  },
  eternal_winter: {
    id: 'eternal_winter',
    name: '❄️ Eternal Winter',
    damage: 2.7,
    element: 'ice',
    effect: { type: 'freeze', duration: 4 },
    description: 'Winter that never ends'
  },
  arctic_annihilation: {
    id: 'arctic_annihilation',
    name: '🌨️ Arctic Annihilation',
    damage: 2.9,
    element: 'ice',
    effect: { type: 'freeze', duration: 3 },
    description: 'The north\'s ultimate annihilation'
  },

  // Lightning abilities
  lightning_bolt: {
    id: 'lightning_bolt',
    name: '⚡ Lightning Bolt',
    damage: 1.1,
    element: 'electric',
    effect: { type: 'shock', duration: 2 },
    description: 'Strikes with electricity'
  },
  arc_chain: {
    id: 'arc_chain',
    name: '⚡ Arc Chain',
    damage: 1.4,
    element: 'electric',
    effect: { type: 'shock', duration: 3 },
    description: 'Lightning chains between targets'
  },
  electric_surge: {
    id: 'electric_surge',
    name: '⚡ Electric Surge',
    damage: 1.2,
    element: 'electric',
    effect: { type: 'shock', duration: 2 },
    description: 'A surge of raw electricity'
  },
  tempest: {
    id: 'tempest',
    name: '🌪️ Tempest',
    damage: 1.9,
    element: 'electric',
    effect: { type: 'shock', duration: 4 },
    description: 'A raging tempest'
  },
  chain_reaction: {
    id: 'chain_reaction',
    name: '⚡ Chain Reaction',
    damage: 2.0,
    element: 'electric',
    effect: { type: 'shock', duration: 3 },
    description: 'Electricity cascades everywhere'
  },
  thunder_dome: {
    id: 'thunder_dome',
    name: '⚡ Thunder Dome',
    damage: 1.8,
    element: 'electric',
    effect: { type: 'shock', duration: 4 },
    description: 'Creates a dome of thunder'
  },
  cataclysm_storm: {
    id: 'cataclysm_storm',
    name: '🌪️ Cataclysm Storm',
    damage: 2.6,
    element: 'electric',
    effect: { type: 'shock', duration: 5 },
    description: 'A world-ending storm'
  },
  infinite_surge: {
    id: 'infinite_surge',
    name: '⚡ Infinite Surge',
    damage: 2.8,
    element: 'electric',
    effect: { type: 'shock', duration: 4 },
    description: 'An endless wave of power'
  },
  world_eater: {
    id: 'world_eater',
    name: '🌍 World Eater',
    damage: 3.0,
    element: 'electric',
    effect: { type: 'stun', duration: 2 },
    description: 'Consumes the world'
  },

  // Shadow abilities
  shadow_strike: {
    id: 'shadow_strike',
    name: '🖤 Shadow Strike',
    damage: 1.3,
    element: 'shadow',
    effect: null,
    description: 'Strikes from the darkness'
  },
  darkness_cloud: {
    id: 'darkness_cloud',
    name: '🖤 Darkness Cloud',
    damage: 0.9,
    element: 'shadow',
    effect: { type: 'blind', duration: 3 },
    description: 'Obscures vision'
  },
  void_touch: {
    id: 'void_touch',
    name: '🖤 Void Touch',
    damage: 1.2,
    element: 'shadow',
    effect: { type: 'curse', duration: 4 },
    description: 'A touch from the void'
  },
  shadow_split: {
    id: 'shadow_split',
    name: '🖤 Shadow Split',
    damage: 1.7,
    element: 'shadow',
    effect: null,
    description: 'Splits into shadow copies'
  },
  void_realm: {
    id: 'void_realm',
    name: '🖤 Void Realm',
    damage: 2.1,
    element: 'shadow',
    effect: { type: 'stun', duration: 2 },
    description: 'Drags into the void'
  },
  nightmare_vortex: {
    id: 'nightmare_vortex',
    name: '🖤 Nightmare Vortex',
    damage: 2.0,
    element: 'shadow',
    effect: { type: 'curse', duration: 5 },
    description: 'A vortex of nightmares'
  },
  void_supremacy: {
    id: 'void_supremacy',
    name: '🖤 Void Supremacy',
    damage: 2.8,
    element: 'shadow',
    effect: { type: 'curse', duration: 6 },
    description: 'The void dominates all'
  },
  infinite_darkness: {
    id: 'infinite_darkness',
    name: '🖤 Infinite Darkness',
    damage: 2.6,
    element: 'shadow',
    effect: { type: 'blind', duration: 4 },
    description: 'Darkness without end'
  },
  absence: {
    id: 'absence',
    name: 'Absence',
    damage: 3.1,
    element: 'shadow',
    effect: null,
    description: 'The absence of all things'
  },

  // Holy abilities
  holy_light: {
    id: 'holy_light',
    name: '✨ Holy Light',
    damage: 1.1,
    element: 'holy',
    effect: null,
    description: 'Burns with holy radiance'
  },
  divine_strike: {
    id: 'divine_strike',
    name: '⚔️ Divine Strike',
    damage: 1.4,
    element: 'holy',
    effect: null,
    description: 'A divine judgment'
  },
  sanctified_barrier: {
    id: 'sanctified_barrier',
    name: '✨ Sanctified Barrier',
    damage: 0.7,
    element: 'holy',
    effect: null,
    description: 'Creates protective barriers'
  },
  redemption: {
    id: 'redemption',
    name: '✨ Redemption',
    damage: 1.9,
    element: 'holy',
    effect: null,
    description: 'Grants redemption'
  },
  heavenly_judgment: {
    id: 'heavenly_judgment',
    name: '⚖️ Heavenly Judgment',
    damage: 2.2,
    element: 'holy',
    effect: null,
    description: 'Heaven judges all'
  },
  blessing_aura: {
    id: 'blessing_aura',
    name: '✨ Blessing Aura',
    damage: 1.0,
    element: 'holy',
    effect: null,
    description: 'An aura of blessings'
  },
  ascension: {
    id: 'ascension',
    name: '✨ Ascension',
    damage: 2.5,
    element: 'holy',
    effect: null,
    description: 'Ascends to divine power'
  },
  divine_judgment: {
    id: 'divine_judgment',
    name: '⚖️ Divine Judgment',
    damage: 2.7,
    element: 'holy',
    effect: null,
    description: 'The ultimate judgment'
  },
  salvation: {
    id: 'salvation',
    name: '✨ Salvation',
    damage: 2.4,
    element: 'holy',
    effect: null,
    description: 'Offers salvation'
  }
};

/**
 * Get boss template by ID
 */
export function getBossTemplate(bossId) {
  return BOSS_ABILITIES[bossId] || null;
}

/**
 * Get ability details
 */
export function getAbility(abilityId) {
  return ABILITIES[abilityId] || null;
}

/**
 * Get phase abilities based on boss and HP percent
 */
export function getBossPhaseAbilities(bossTemplate, hpPercent) {
  if (!bossTemplate) return [];

  if (hpPercent >= bossTemplate.phase1.trigger) {
    return bossTemplate.phase1.abilities;
  }
  if (hpPercent >= bossTemplate.phase2.trigger) {
    return bossTemplate.phase2.abilities;
  }
  if (hpPercent >= bossTemplate.phase3.trigger) {
    return bossTemplate.phase3.abilities;
  }

  return bossTemplate.phase3.abilities; // Default to phase 3 if below all thresholds
}

/**
 * Get current phase info
 */
export function getBossPhaseInfo(bossTemplate, hpPercent) {
  if (!bossTemplate) return null;

  if (hpPercent >= bossTemplate.phase1.trigger) {
    return { phase: 1, ...bossTemplate.phase1 };
  }
  if (hpPercent >= bossTemplate.phase2.trigger) {
    return { phase: 2, ...bossTemplate.phase2 };
  }

  return { phase: 3, ...bossTemplate.phase3 };
}
