/**
 * Gem System for Equipment Socketing
 * Requires Master Blacksmith upgrade (unlocked in Asgard)
 */

export const GEMS = {
  // Tier 1 - Basic Gems
  ruby_gem_t1: {
    id: 'ruby_gem_t1',
    name: 'Flawed Ruby',
    tier: 1,
    rarity: 'uncommon',
    category: 'gem',
    description: 'A flawed ruby that increases attack power',
    stats: { strength: 3, damageBonus: 5 },
    sellValue: 250,
  },
  sapphire_gem_t1: {
    id: 'sapphire_gem_t1',
    name: 'Flawed Sapphire',
    tier: 1,
    rarity: 'uncommon',
    category: 'gem',
    description: 'A flawed sapphire that enhances mana',
    stats: { intelligence: 3, maxMana: 10 },
    sellValue: 250,
  },
  emerald_gem_t1: {
    id: 'emerald_gem_t1',
    name: 'Flawed Emerald',
    tier: 1,
    rarity: 'uncommon',
    category: 'gem',
    description: 'A flawed emerald that boosts vitality',
    stats: { vitality: 3, maxHp: 15 },
    sellValue: 250,
  },
  diamond_gem_t1: {
    id: 'diamond_gem_t1',
    name: 'Flawed Diamond',
    tier: 1,
    rarity: 'uncommon',
    category: 'gem',
    description: 'A flawed diamond that strengthens defense',
    stats: { defense: 3, damageReduction: 2 },
    sellValue: 250,
  },
  
  // Tier 2 - Polished Gems
  ruby_gem_t2: {
    id: 'ruby_gem_t2',
    name: 'Polished Ruby',
    tier: 2,
    rarity: 'rare',
    category: 'gem',
    description: 'A polished ruby radiating with power',
    stats: { strength: 6, damageBonus: 12 },
    sellValue: 800,
  },
  sapphire_gem_t2: {
    id: 'sapphire_gem_t2',
    name: 'Polished Sapphire',
    tier: 2,
    rarity: 'rare',
    category: 'gem',
    description: 'A polished sapphire brimming with arcane energy',
    stats: { intelligence: 6, maxMana: 25 },
    sellValue: 800,
  },
  emerald_gem_t2: {
    id: 'emerald_gem_t2',
    name: 'Polished Emerald',
    tier: 2,
    rarity: 'rare',
    category: 'gem',
    description: 'A polished emerald pulsing with life force',
    stats: { vitality: 6, maxHp: 35 },
    sellValue: 800,
  },
  diamond_gem_t2: {
    id: 'diamond_gem_t2',
    name: 'Polished Diamond',
    tier: 2,
    rarity: 'rare',
    category: 'gem',
    description: 'A polished diamond reflecting impenetrable defense',
    stats: { defense: 6, damageReduction: 5 },
    sellValue: 800,
  },
  
  // Tier 3 - Perfect Gems (Asgard materials)
  ruby_gem_t3: {
    id: 'ruby_gem_t3',
    name: 'Perfect Ruby',
    tier: 3,
    rarity: 'epic',
    category: 'gem',
    description: 'A flawless ruby infused with Asgardian fire',
    stats: { strength: 12, damageBonus: 25, critChance: 3 },
    sellValue: 2500,
  },
  sapphire_gem_t3: {
    id: 'sapphire_gem_t3',
    name: 'Perfect Sapphire',
    tier: 3,
    rarity: 'epic',
    category: 'gem',
    description: 'A flawless sapphire channeling cosmic magic',
    stats: { intelligence: 12, maxMana: 50, spellPower: 8 },
    sellValue: 2500,
  },
  emerald_gem_t3: {
    id: 'emerald_gem_t3',
    name: 'Perfect Emerald',
    tier: 3,
    rarity: 'epic',
    category: 'gem',
    description: 'A flawless emerald blessed by Yggdrasil',
    stats: { vitality: 12, maxHp: 75, hpRegen: 5 },
    sellValue: 2500,
  },
  diamond_gem_t3: {
    id: 'diamond_gem_t3',
    name: 'Perfect Diamond',
    tier: 3,
    rarity: 'epic',
    category: 'gem',
    description: 'A flawless diamond forged in Nidavellir',
    stats: { defense: 12, damageReduction: 10, blockChance: 5 },
    sellValue: 2500,
  },
  
  // Tier 4 - Legendary Gems (Requires Master Blacksmith Level 40+)
  odin_gem: {
    id: 'odin_gem',
    name: "Odin's Eye",
    tier: 4,
    rarity: 'legendary',
    category: 'gem',
    description: 'A gem containing the wisdom of the Allfather',
    stats: { strength: 10, intelligence: 10, wisdom: 15, allStats: 5 },
    sellValue: 10000,
  },
  thor_gem: {
    id: 'thor_gem',
    name: "Thor's Thunder Stone",
    tier: 4,
    rarity: 'legendary',
    category: 'gem',
    description: 'A gem crackling with the power of thunder',
    stats: { strength: 20, damageBonus: 40, critDamage: 25 },
    sellValue: 10000,
  },
  freya_gem: {
    id: 'freya_gem',
    name: "Freya's Tear",
    tier: 4,
    rarity: 'legendary',
    category: 'gem',
    description: 'A gem radiating divine protection and grace',
    stats: { vitality: 15, maxHp: 150, hpRegen: 15, damageReduction: 8 },
    sellValue: 10000,
  },
  loki_gem: {
    id: 'loki_gem',
    name: "Loki's Trickster Shard",
    tier: 4,
    rarity: 'legendary',
    category: 'gem',
    description: 'A gem that shifts reality itself',
    stats: { agility: 20, critChance: 15, dodgeChance: 10, luckBonus: 5 },
    sellValue: 10000,
  },
  
  // Tier 5 - Niflheim Frost Gems (World 3, Level 150+)
  frozen_ruby_gem_t5: {
    id: 'frozen_ruby_gem_t5',
    name: 'Frozen Ruby of Helglass',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'A ruby encased in primordial ice, burning with frozen fury',
    stats: { strength: 25, damageBonus: 50, critDamage: 40, frostDamage: 15 },
    sellValue: 20000,
    minLevel: 150,
  },
  glacial_sapphire_gem_t5: {
    id: 'glacial_sapphire_gem_t5',
    name: 'Glacial Sapphire of Niflheim',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'A sapphire crystallized in eternal winter, channeling absolute cold',
    stats: { intelligence: 25, maxMana: 100, spellPower: 18, frostSpellPower: 20 },
    sellValue: 20000,
    minLevel: 150,
  },
  frostbound_emerald_gem_t5: {
    id: 'frostbound_emerald_gem_t5',
    name: 'Frostbound Emerald of Mistmere',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'An emerald bound in frozen mist, radiating frozen vitality',
    stats: { vitality: 25, maxHp: 200, hpRegen: 25, coldResist: 20, damageReduction: 12 },
    sellValue: 20000,
    minLevel: 150,
  },
  cryogenic_diamond_gem_t5: {
    id: 'cryogenic_diamond_gem_t5',
    name: 'Cryogenic Diamond of Everwinter',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'A diamond forged at absolute zero, impenetrable shield of ice',
    stats: { defense: 25, damageReduction: 20, blockChance: 12, coldResist: 25, reflect: 8 },
    sellValue: 20000,
    minLevel: 150,
  },
  
  // Tier 5 Legendary Named Gems (Niflheim-themed)
  helfreeze_gem: {
    id: 'helfreeze_gem',
    name: 'Shard of Helfreeze',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'Fragment from the heart of Niflheim, freezes all it touches',
    stats: { strength: 18, intelligence: 18, damageBonus: 40, frostDamage: 25, freezeChance: 10 },
    sellValue: 25000,
    minLevel: 180,
  },
  mistbane_gem: {
    id: 'mistbane_gem',
    name: "Mistbane's Frozen Heart",
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'The frozen heart of a Niflheim drake, pulses with icy power',
    stats: { vitality: 30, maxHp: 300, coldResist: 30, damageReduction: 15, lifeSteal: 5 },
    sellValue: 25000,
    minLevel: 200,
  },
  voidice_gem: {
    id: 'voidice_gem',
    name: 'Void Ice Singularity',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'Ice so cold it bends space itself',
    stats: { agility: 28, critChance: 20, dodgeChance: 15, frostDamage: 20, slowChance: 15 },
    sellValue: 25000,
    minLevel: 220,
  },
  cryostar_gem: {
    id: 'cryostar_gem',
    name: 'Cryostar Fragment',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'Fragment of a frozen star from the void beyond Niflheim',
    stats: { intelligence: 30, wisdom: 20, spellPower: 25, frostSpellPower: 30, manaRegen: 15 },
    sellValue: 25000,
    minLevel: 240,
  },
  niflheim_core_gem: {
    id: 'niflheim_core_gem',
    name: 'Heart of Niflheim',
    tier: 5,
    rarity: 'legendary',
    category: 'gem',
    description: 'The very essence of Niflheim, ultimate frozen power',
    stats: { 
      allStats: 15, 
      strength: 20, 
      intelligence: 20, 
      vitality: 20, 
      agility: 20,
      frostDamage: 30,
      coldResist: 40,
      damageBonus: 50
    },
    sellValue: 50000,
    minLevel: 280,
  },
};

/**
 * Gem crafting recipes (require Master Blacksmith)
 */
export const GEM_RECIPES = {
  // Tier 1 Gems
  ruby_gem_t1_recipe: {
    id: 'ruby_gem_t1_recipe',
    name: 'Flawed Ruby Recipe',
    profession: 'blacksmith',
    level: 25,
    requiresMasterBlacksmith: true,
    materials: { coal: 50, iron_ore: 30, mana_crystal: 10 },
    output: { item: 'ruby_gem_t1', quantity: 1 },
    craftTime: 10,
  },
  sapphire_gem_t1_recipe: {
    id: 'sapphire_gem_t1_recipe',
    name: 'Flawed Sapphire Recipe',
    profession: 'blacksmith',
    level: 25,
    requiresMasterBlacksmith: true,
    materials: { coal: 50, copper_ore: 30, mana_crystal: 10 },
    output: { item: 'sapphire_gem_t1', quantity: 1 },
    craftTime: 10,
  },
  emerald_gem_t1_recipe: {
    id: 'emerald_gem_t1_recipe',
    name: 'Flawed Emerald Recipe',
    profession: 'blacksmith',
    level: 25,
    requiresMasterBlacksmith: true,
    materials: { coal: 50, ancient_wood: 30, mana_crystal: 10 },
    output: { item: 'emerald_gem_t1', quantity: 1 },
    craftTime: 10,
  },
  diamond_gem_t1_recipe: {
    id: 'diamond_gem_t1_recipe',
    name: 'Flawed Diamond Recipe',
    profession: 'blacksmith',
    level: 25,
    requiresMasterBlacksmith: true,
    materials: { coal: 50, granite: 30, mana_crystal: 10 },
    output: { item: 'diamond_gem_t1', quantity: 1 },
    craftTime: 10,
  },
  
  // Tier 2 Gems
  ruby_gem_t2_recipe: {
    id: 'ruby_gem_t2_recipe',
    name: 'Polished Ruby Recipe',
    profession: 'blacksmith',
    level: 30,
    requiresMasterBlacksmith: true,
    materials: { ruby_gem_t1: 3, mithril_ore: 20, arcane_essence: 15 },
    output: { item: 'ruby_gem_t2', quantity: 1 },
    craftTime: 15,
  },
  sapphire_gem_t2_recipe: {
    id: 'sapphire_gem_t2_recipe',
    name: 'Polished Sapphire Recipe',
    profession: 'blacksmith',
    level: 30,
    requiresMasterBlacksmith: true,
    materials: { sapphire_gem_t1: 3, mithril_ore: 20, arcane_essence: 15 },
    output: { item: 'sapphire_gem_t2', quantity: 1 },
    craftTime: 15,
  },
  emerald_gem_t2_recipe: {
    id: 'emerald_gem_t2_recipe',
    name: 'Polished Emerald Recipe',
    profession: 'blacksmith',
    level: 30,
    requiresMasterBlacksmith: true,
    materials: { emerald_gem_t1: 3, mithril_ore: 20, arcane_essence: 15 },
    output: { item: 'emerald_gem_t2', quantity: 1 },
    craftTime: 15,
  },
  diamond_gem_t2_recipe: {
    id: 'diamond_gem_t2_recipe',
    name: 'Polished Diamond Recipe',
    profession: 'blacksmith',
    level: 30,
    requiresMasterBlacksmith: true,
    materials: { diamond_gem_t1: 3, mithril_ore: 20, arcane_essence: 15 },
    output: { item: 'diamond_gem_t2', quantity: 1 },
    craftTime: 15,
  },
  
  // Tier 3 Gems (require Asgard materials)
  ruby_gem_t3_recipe: {
    id: 'ruby_gem_t3_recipe',
    name: 'Perfect Ruby Recipe',
    profession: 'blacksmith',
    level: 35,
    requiresMasterBlacksmith: true,
    materials: { ruby_gem_t2: 2, yggdrasil_sap: 10, bifrost_crystal: 5, muspelheim_ember: 8 },
    output: { item: 'ruby_gem_t3', quantity: 1 },
    craftTime: 20,
  },
  sapphire_gem_t3_recipe: {
    id: 'sapphire_gem_t3_recipe',
    name: 'Perfect Sapphire Recipe',
    profession: 'blacksmith',
    level: 35,
    requiresMasterBlacksmith: true,
    materials: { sapphire_gem_t2: 2, yggdrasil_sap: 10, bifrost_crystal: 5, eternal_ice: 8 },
    output: { item: 'sapphire_gem_t3', quantity: 1 },
    craftTime: 20,
  },
  emerald_gem_t3_recipe: {
    id: 'emerald_gem_t3_recipe',
    name: 'Perfect Emerald Recipe',
    profession: 'blacksmith',
    level: 35,
    requiresMasterBlacksmith: true,
    materials: { emerald_gem_t2: 2, yggdrasil_sap: 10, bifrost_crystal: 5, asgardian_bark: 8 },
    output: { item: 'emerald_gem_t3', quantity: 1 },
    craftTime: 20,
  },
  diamond_gem_t3_recipe: {
    id: 'diamond_gem_t3_recipe',
    name: 'Perfect Diamond Recipe',
    profession: 'blacksmith',
    level: 35,
    requiresMasterBlacksmith: true,
    materials: { diamond_gem_t2: 2, yggdrasil_sap: 10, bifrost_crystal: 5, divine_ore: 8 },
    output: { item: 'diamond_gem_t3', quantity: 1 },
    craftTime: 20,
  },
  
  // Tier 4 Legendary Gems (require level 40+)
  odin_gem_recipe: {
    id: 'odin_gem_recipe',
    name: "Odin's Eye Recipe",
    profession: 'blacksmith',
    level: 40,
    requiresMasterBlacksmith: true,
    materials: { 
      ruby_gem_t3: 1, 
      sapphire_gem_t3: 1, 
      emerald_gem_t3: 1, 
      diamond_gem_t3: 1,
      yggdrasil_sap: 25,
      cosmic_dust: 20
    },
    output: { item: 'odin_gem', quantity: 1 },
    craftTime: 30,
  },
  thor_gem_recipe: {
    id: 'thor_gem_recipe',
    name: "Thor's Thunder Stone Recipe",
    profession: 'blacksmith',
    level: 40,
    requiresMasterBlacksmith: true,
    materials: { 
      ruby_gem_t3: 3,
      muspelheim_ember: 30,
      storm_essence: 20,
      cosmic_dust: 15
    },
    output: { item: 'thor_gem', quantity: 1 },
    craftTime: 30,
  },
  freya_gem_recipe: {
    id: 'freya_gem_recipe',
    name: "Freya's Tear Recipe",
    profession: 'blacksmith',
    level: 40,
    requiresMasterBlacksmith: true,
    materials: { 
      emerald_gem_t3: 3,
      yggdrasil_sap: 30,
      valhalla_essence: 20,
      cosmic_dust: 15
    },
    output: { item: 'freya_gem', quantity: 1 },
    craftTime: 30,
  },
  loki_gem_recipe: {
    id: 'loki_gem_recipe',
    name: "Loki's Trickster Shard Recipe",
    profession: 'blacksmith',
    level: 40,
    requiresMasterBlacksmith: true,
    materials: { 
      sapphire_gem_t3: 2,
      diamond_gem_t3: 1,
      shadow_essence: 25,
      cosmic_dust: 15
    },
    output: { item: 'loki_gem', quantity: 1 },
    craftTime: 30,
  },
  
  // Tier 5 Niflheim Gem Recipes (require Master Blacksmith 50+)
  frozen_ruby_gem_t5_recipe: {
    id: 'frozen_ruby_gem_t5_recipe',
    name: 'Frozen Ruby Recipe',
    profession: 'blacksmith',
    level: 50,
    requiresMasterBlacksmith: true,
    materials: { 
      ruby_gem_t3: 2,
      helglass_shard: 20,
      frozen_core: 15,
      niflheim_essence: 25,
      eternal_ice: 30
    },
    output: { item: 'frozen_ruby_gem_t5', quantity: 1 },
    craftTime: 40,
  },
  glacial_sapphire_gem_t5_recipe: {
    id: 'glacial_sapphire_gem_t5_recipe',
    name: 'Glacial Sapphire Recipe',
    profession: 'blacksmith',
    level: 50,
    requiresMasterBlacksmith: true,
    materials: { 
      sapphire_gem_t3: 2,
      glacial_crystal: 20,
      mist_essence: 15,
      niflheim_essence: 25,
      absolute_zero_water: 30
    },
    output: { item: 'glacial_sapphire_gem_t5', quantity: 1 },
    craftTime: 40,
  },
  frostbound_emerald_gem_t5_recipe: {
    id: 'frostbound_emerald_gem_t5_recipe',
    name: 'Frostbound Emerald Recipe',
    profession: 'blacksmith',
    level: 50,
    requiresMasterBlacksmith: true,
    materials: { 
      emerald_gem_t3: 2,
      mistmere_bark: 20,
      permafrost_sap: 15,
      niflheim_essence: 25,
      everwinter_root: 30
    },
    output: { item: 'frostbound_emerald_gem_t5', quantity: 1 },
    craftTime: 40,
  },
  cryogenic_diamond_gem_t5_recipe: {
    id: 'cryogenic_diamond_gem_t5_recipe',
    name: 'Cryogenic Diamond Recipe',
    profession: 'blacksmith',
    level: 50,
    requiresMasterBlacksmith: true,
    materials: { 
      diamond_gem_t3: 2,
      cryogenic_ore: 20,
      void_ice: 15,
      niflheim_essence: 25,
      frozen_adamant: 30
    },
    output: { item: 'cryogenic_diamond_gem_t5', quantity: 1 },
    craftTime: 40,
  },
  
  // Tier 5 Named Legendary Gem Recipes
  helfreeze_gem_recipe: {
    id: 'helfreeze_gem_recipe',
    name: 'Shard of Helfreeze Recipe',
    profession: 'blacksmith',
    level: 55,
    requiresMasterBlacksmith: true,
    materials: { 
      frozen_ruby_gem_t5: 1,
      glacial_sapphire_gem_t5: 1,
      helglass_core: 10,
      niflheim_essence: 50,
      frozen_void_shard: 20
    },
    output: { item: 'helfreeze_gem', quantity: 1 },
    craftTime: 50,
  },
  mistbane_gem_recipe: {
    id: 'mistbane_gem_recipe',
    name: "Mistbane's Frozen Heart Recipe",
    profession: 'blacksmith',
    level: 55,
    requiresMasterBlacksmith: true,
    materials: { 
      frostbound_emerald_gem_t5: 2,
      drake_heart_frozen: 5,
      niflheim_essence: 50,
      mistborne_crystal: 20
    },
    output: { item: 'mistbane_gem', quantity: 1 },
    craftTime: 50,
  },
  voidice_gem_recipe: {
    id: 'voidice_gem_recipe',
    name: 'Void Ice Singularity Recipe',
    profession: 'blacksmith',
    level: 55,
    requiresMasterBlacksmith: true,
    materials: { 
      cryogenic_diamond_gem_t5: 2,
      void_ice: 30,
      singularity_fragment: 10,
      niflheim_essence: 50
    },
    output: { item: 'voidice_gem', quantity: 1 },
    craftTime: 50,
  },
  cryostar_gem_recipe: {
    id: 'cryostar_gem_recipe',
    name: 'Cryostar Fragment Recipe',
    profession: 'blacksmith',
    level: 60,
    requiresMasterBlacksmith: true,
    materials: { 
      glacial_sapphire_gem_t5: 2,
      frozen_star_dust: 25,
      cosmic_ice: 20,
      niflheim_essence: 75
    },
    output: { item: 'cryostar_gem', quantity: 1 },
    craftTime: 60,
  },
  niflheim_core_gem_recipe: {
    id: 'niflheim_core_gem_recipe',
    name: 'Heart of Niflheim Recipe',
    profession: 'blacksmith',
    level: 65,
    requiresMasterBlacksmith: true,
    materials: { 
      frozen_ruby_gem_t5: 1,
      glacial_sapphire_gem_t5: 1,
      frostbound_emerald_gem_t5: 1,
      cryogenic_diamond_gem_t5: 1,
      helfreeze_gem: 1,
      niflheim_essence: 100,
      primordial_frost_core: 1
    },
    output: { item: 'niflheim_core_gem', quantity: 1 },
    craftTime: 100,
  },
};

/**
 * Get gem by ID
 */
export function getGem(gemId) {
  return GEMS[gemId];
}

/**
 * Get gem recipe by ID
 */
export function getGemRecipe(recipeId) {
  return GEM_RECIPES[recipeId];
}

/**
 * Get all gem recipes
 */
export function getAllGemRecipes() {
  return Object.values(GEM_RECIPES);
}

/**
 * Calculate total stats from socketed gems
 */
export function calculateGemStats(socketedGems = {}) {
  const totalStats = {};
  
  Object.values(socketedGems).forEach(gemId => {
    if (!gemId) return;
    const gem = getGem(gemId);
    if (!gem || !gem.stats) return;
    
    Object.entries(gem.stats).forEach(([stat, value]) => {
      totalStats[stat] = (totalStats[stat] || 0) + value;
    });
  });
  
  return totalStats;
}

/**
 * Check if player can socket gems (requires Master Blacksmith)
 */
export function canSocketGems(player) {
  return player.masterBlacksmith === true;
}

/**
 * Get socket slots for equipment slot
 */
export function getSocketSlots(equipmentSlot) {
  const sockets = {
    weapon: 2,
    chest: 2,
    legs: 1,
    boots: 1,
    gloves: 1,
    helmet: 1,
  };
  return sockets[equipmentSlot] || 0;
}
