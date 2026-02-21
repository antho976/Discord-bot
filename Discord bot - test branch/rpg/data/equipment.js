/**
 * Equipment and Armor Sets - Tier 3
 */

export const EQUIPMENT = {
  weapons: [
    {
      id: 'bronze_sword',
      name: 'Bronze Sword',
      rarity: 'common',
      slot: 'weapon',
      stats: { strength: 5 },
      value: 100,
    },
    {
      id: 'iron_greatsword',
      name: 'Iron Greatsword',
      rarity: 'uncommon',
      slot: 'weapon',
      stats: { strength: 12, vitality: -2 },
      value: 300,
    },
    {
      id: 'mithril_blade',
      name: 'Mithril Blade',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 20, agility: 5 },
      value: 1000,
    },
    {
      id: 'steel_longsword',
      name: 'Steel Longsword',
      rarity: 'uncommon',
      slot: 'weapon',
      stats: { strength: 16, vitality: 2 },
      value: 450,
    },
    {
      id: 'staff_wisdom',
      name: 'Staff of Wisdom',
      rarity: 'rare',
      slot: 'weapon',
      stats: { intelligence: 18, wisdom: 8, mana: 30 },
      value: 1200,
    },
    {
      id: 'leviathan_axe',
      name: 'Leviathan Axe',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 28, vitality: 6, agility: -2 },
      value: 2400,
    },
    {
      id: 'gungnir_spear',
      name: 'Gungnir Spear',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 22, agility: 10, wisdom: 4 },
      value: 2600,
    },
    {
      id: 'mjolnir_hammer',
      name: 'Mjolnir Hammer',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 34, vitality: 8, agility: -4 },
      value: 3200,
    },
    {
      id: 'skadi_bow',
      name: 'Skadi\'s Bow',
      rarity: 'rare',
      slot: 'weapon',
      stats: { agility: 30, strength: 6 },
      value: 2300,
    },
    {
      id: 'ares_blade',
      name: 'Blade of Ares',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 30, vitality: 5, agility: 2 },
      value: 2800,
    },
    {
      id: 'athena_spear',
      name: 'Spear of Athena',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 20, agility: 12, wisdom: 6 },
      value: 2600,
    },
    {
      id: 'zeus_lightning_staff',
      name: 'Zeus\' Lightning Staff',
      rarity: 'rare',
      slot: 'weapon',
      stats: { intelligence: 26, wisdom: 12, mana: 60 },
      value: 3000,
    },
    // Early game weapons (Level 1-17)
    // Level 1-5 Common tier
    {
      id: 'apprentice_sword',
      name: 'Apprentice Sword',
      rarity: 'common',
      slot: 'weapon',
      stats: { strength: 8, vitality: 1 },
      value: 120,
      classRestriction: 'warrior',
    },
    {
      id: 'novice_wand',
      name: 'Novice Wand',
      rarity: 'common',
      slot: 'weapon',
      stats: { intelligence: 10, mana: 20 },
      value: 130,
      classRestriction: 'mage',
    },
    {
      id: 'rusty_dagger',
      name: 'Rusty Dagger',
      rarity: 'common',
      slot: 'weapon',
      stats: { agility: 9, strength: 2 },
      value: 110,
      classRestriction: 'rogue',
    },
    {
      id: 'wooden_mace',
      name: 'Wooden Mace',
      rarity: 'common',
      slot: 'weapon',
      stats: { strength: 7, defense: 2, wisdom: 1 },
      value: 125,
      classRestriction: 'paladin',
    },
    {
      id: 'holy_sword',
      name: 'Holy Sword',
      rarity: 'common',
      slot: 'weapon',
      stats: { strength: 8, defense: 1, wisdom: 2 },
      value: 130,
      classRestriction: 'paladin',
    },
    // Level 8-12 Uncommon tier
    {
      id: 'iron_cleaver',
      name: 'Iron Cleaver',
      rarity: 'uncommon',
      slot: 'weapon',
      stats: { strength: 14, vitality: 3 },
      value: 400,
      classRestriction: 'warrior',
    },
    {
      id: 'crystal_wand',
      name: 'Crystal Wand',
      rarity: 'uncommon',
      slot: 'weapon',
      stats: { intelligence: 16, wisdom: 3, mana: 35 },
      value: 450,
      classRestriction: 'mage',
    },
    {
      id: 'steel_dirk',
      name: 'Steel Dirk',
      rarity: 'uncommon',
      slot: 'weapon',
      stats: { agility: 17, strength: 4 },
      value: 420,
      classRestriction: 'rogue',
    },
    {
      id: 'blessed_mace',
      name: 'Blessed Mace',
      rarity: 'uncommon',
      slot: 'weapon',
      stats: { strength: 13, defense: 4, wisdom: 3 },
      value: 440,
      classRestriction: 'paladin',
    },
    {
      id: 'blessed_longsword',
      name: 'Blessed Longsword',
      rarity: 'uncommon',
      slot: 'weapon',
      stats: { strength: 14, defense: 3, wisdom: 3 },
      value: 460,
      classRestriction: 'paladin',
    },
    // Level 13-16 Rare tier
    {
      id: 'battle_axe',
      name: 'Battle Axe',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 20, vitality: 4, defense: 1 },
      value: 900,
      classRestriction: 'warrior',
    },
    {
      id: 'sage_staff',
      name: 'Sage Staff',
      rarity: 'rare',
      slot: 'weapon',
      stats: { intelligence: 20, wisdom: 6, mana: 50 },
      value: 950,
      classRestriction: 'mage',
    },
    {
      id: 'shadow_blade',
      name: 'Shadow Blade',
      rarity: 'rare',
      slot: 'weapon',
      stats: { agility: 22, strength: 6, vitality: 1 },
      value: 880,
      classRestriction: 'rogue',
    },
    {
      id: 'holy_hammer',
      name: 'Holy Hammer',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 18, defense: 6, wisdom: 4 },
      value: 920,
      classRestriction: 'paladin',
    },
    {
      id: 'sacred_blade',
      name: 'Sacred Blade',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 19, defense: 5, wisdom: 5 },
      value: 940,
      classRestriction: 'paladin',
    },
    // Intermediate Norse/Greek weapons (Level 18-28)
    // Warrior weapons
    {
      id: 'odin_blade',
      name: 'Odin\'s Blade',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 24, wisdom: 4, vitality: 2 },
      value: 1800,
      classRestriction: 'warrior',
    },
    {
      id: 'thor_axe_junior',
      name: 'Mjolnir\'s Echo',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 32, vitality: 5, defense: 3 },
      value: 2900,
      classRestriction: 'warrior',
    },
    // Mage weapons
    {
      id: 'hermes_staff',
      name: 'Hermes\' Staff',
      rarity: 'rare',
      slot: 'weapon',
      stats: { intelligence: 22, agility: 6, mana: 45 },
      value: 1900,
      classRestriction: 'mage',
    },
    {
      id: 'athena_staff_junior',
      name: 'Athena\'s Wisdom Staff',
      rarity: 'epic',
      slot: 'weapon',
      stats: { intelligence: 30, wisdom: 8, mana: 70 },
      value: 3100,
      classRestriction: 'mage',
    },
    // Rogue weapons
    {
      id: 'fenrir_daggers',
      name: 'Fenrir\'s Fangs',
      rarity: 'rare',
      slot: 'weapon',
      stats: { agility: 26, strength: 8, vitality: 1 },
      value: 1750,
      classRestriction: 'rogue',
    },
    {
      id: 'hermes_daggers',
      name: 'Hermes\' Swift Blades',
      rarity: 'epic',
      slot: 'weapon',
      stats: { agility: 34, strength: 10, defense: 2 },
      value: 3050,
      classRestriction: 'rogue',
    },
    // Paladin weapons
    {
      id: 'heimdall_mace',
      name: 'Heimdall\'s Mace',
      rarity: 'rare',
      slot: 'weapon',
      stats: { strength: 22, defense: 6, wisdom: 5 },
      value: 1950,
      classRestriction: 'paladin',
    },
    {
      id: 'zeus_hammer_junior',
      name: 'Zeus\' Judgement',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 30, defense: 8, wisdom: 6 },
      value: 3200,
      classRestriction: 'paladin',
    },
    {
      id: 'paladin_holy_blade',
      name: 'Paladin\'s Holy Blade',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 32, defense: 7, wisdom: 7 },
      value: 3100,
      classRestriction: 'paladin',
    },
    // Asgardian Tier (Level 60-70) - Epic Quality
    {
      id: 'asgardian_greatsword',
      name: 'Asgardian Greatsword',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 40, vitality: 10, defense: 4 },
      value: 8500,
      classRestriction: 'warrior',
    },
    {
      id: 'rune_staff',
      name: 'Rune-inscribed Staff',
      rarity: 'epic',
      slot: 'weapon',
      stats: { intelligence: 38, wisdom: 12, mana: 95 },
      value: 9000,
      classRestriction: 'mage',
    },
    {
      id: 'shadow_fang_daggers',
      name: 'Shadow Fang Daggers',
      rarity: 'epic',
      slot: 'weapon',
      stats: { agility: 42, strength: 12, defense: 3 },
      value: 8700,
      classRestriction: 'rogue',
    },
    {
      id: 'divine_warhammer',
      name: 'Divine Warhammer',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 38, defense: 12, wisdom: 10 },
      value: 9200,
      classRestriction: 'paladin',
    },
    // Valkyrie Tier (Level 80-90) - Epic Quality
    {
      id: 'valkyrie_blade',
      name: 'Valkyrie\'s Judgment Blade',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 52, vitality: 15, agility: 8 },
      value: 15000,
      classRestriction: 'warrior',
    },
    {
      id: 'cosmic_scepter',
      name: 'Cosmic Scepter',
      rarity: 'epic',
      slot: 'weapon',
      stats: { intelligence: 50, wisdom: 18, mana: 140 },
      value: 15500,
      classRestriction: 'mage',
    },
    {
      id: 'void_blades',
      name: 'Void Reaver Blades',
      rarity: 'epic',
      slot: 'weapon',
      stats: { agility: 55, strength: 16, defense: 5 },
      value: 15200,
      classRestriction: 'rogue',
    },
    {
      id: 'radiant_mace',
      name: 'Radiant Mace of Justice',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 50, defense: 18, wisdom: 14 },
      value: 16000,
      classRestriction: 'paladin',
    },
    // Cosmic Tier (Level 100-110) - Legendary Quality
    {
      id: 'cosmic_destroyer',
      name: 'Cosmic Destroyer',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 68, vitality: 20, defense: 10 },
      value: 28000,
      classRestriction: 'warrior',
    },
    {
      id: 'astral_conduit',
      name: 'Astral Conduit Staff',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { intelligence: 66, wisdom: 24, mana: 200 },
      value: 29000,
      classRestriction: 'mage',
    },
    {
      id: 'reality_shards',
      name: 'Reality Shard Daggers',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { agility: 72, strength: 22, defense: 8 },
      value: 28500,
      classRestriction: 'rogue',
    },
    {
      id: 'eternal_arbiter',
      name: 'Eternal Arbiter',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 66, defense: 26, wisdom: 20 },
      value: 30000,
      classRestriction: 'paladin',
    },
    // Primordial Tier (Level 120-130) - Legendary Quality
    {
      id: 'primordial_cleaver',
      name: 'Primordial World Cleaver',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 88, vitality: 28, defense: 15 },
      value: 50000,
      classRestriction: 'warrior',
    },
    {
      id: 'genesis_staff',
      name: 'Genesis Staff',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { intelligence: 86, wisdom: 32, mana: 280 },
      value: 52000,
      classRestriction: 'mage',
    },
    {
      id: 'entropy_blades',
      name: 'Entropy Edge Blades',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { agility: 92, strength: 30, defense: 12 },
      value: 51000,
      classRestriction: 'rogue',
    },
    {
      id: 'creation_hammer',
      name: 'Creation\'s Hammer',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 86, defense: 34, wisdom: 28 },
      value: 54000,
      classRestriction: 'paladin',
    },
    // Ragnarok Tier (Level 140-150) - Mythic Quality
    {
      id: 'ragnarok_dawnbreaker',
      name: 'Ragnarok Dawnbreaker',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { strength: 110, vitality: 38, defense: 22, agility: 10 },
      value: 100000,
      classRestriction: 'warrior',
    },
    {
      id: 'apocalypse_staff',
      name: 'Apocalypse Staff',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { intelligence: 108, wisdom: 42, mana: 380, vitality: 20 },
      value: 105000,
      classRestriction: 'mage',
    },
    {
      id: 'oblivion_daggers',
      name: 'Oblivion\'s Edge Daggers',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { agility: 115, strength: 40, defense: 18, vitality: 15 },
      value: 102000,
      classRestriction: 'rogue',
    },
    {
      id: 'divine_retribution',
      name: 'Divine Retribution',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { strength: 108, defense: 44, wisdom: 38, vitality: 25 },
      value: 110000,
      classRestriction: 'paladin',
    },
    
    // Level 70 Tier - Epic Quality
    {
      id: 'godforged_blade',
      name: 'Godforged Battle Blade',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 46, vitality: 12, defense: 6 },
      value: 11500,
      classRestriction: 'warrior',
    },
    {
      id: 'ethereal_staff',
      name: 'Ethereal Mind Staff',
      rarity: 'epic',
      slot: 'weapon',
      stats: { intelligence: 44, wisdom: 15, mana: 115 },
      value: 12000,
      classRestriction: 'mage',
    },
    {
      id: 'phantom_knives',
      name: 'Phantom Strike Knives',
      rarity: 'epic',
      slot: 'weapon',
      stats: { agility: 48, strength: 14, defense: 4 },
      value: 11800,
      classRestriction: 'rogue',
    },
    {
      id: 'blessed_maul',
      name: 'Blessed Titan Maul',
      rarity: 'epic',
      slot: 'weapon',
      stats: { strength: 44, defense: 15, wisdom: 12 },
      value: 12500,
      classRestriction: 'paladin',
    },
    
    // Level 90 Tier - Epic/Legendary Quality
    {
      id: 'stormbreaker_sword',
      name: 'Stormbreaker Greatsword',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 60, vitality: 18, defense: 8 },
      value: 20000,
      classRestriction: 'warrior',
    },
    {
      id: 'nebula_rod',
      name: 'Nebula Channeling Rod',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { intelligence: 58, wisdom: 21, mana: 170 },
      value: 21000,
      classRestriction: 'mage',
    },
    {
      id: 'twilight_fangs',
      name: 'Twilight Reaper Fangs',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { agility: 63, strength: 19, defense: 6 },
      value: 20500,
      classRestriction: 'rogue',
    },
    {
      id: 'celestial_crusher',
      name: 'Celestial Crusher',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 58, defense: 22, wisdom: 17 },
      value: 22000,
      classRestriction: 'paladin',
    },
    
    // Level 110 Tier - Legendary Quality
    {
      id: 'voidforged_claymore',
      name: 'Voidforged Claymore',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 77, vitality: 24, defense: 12 },
      value: 38000,
      classRestriction: 'warrior',
    },
    {
      id: 'infinity_scepter',
      name: 'Infinity Convergence Scepter',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { intelligence: 75, wisdom: 28, mana: 240 },
      value: 39000,
      classRestriction: 'mage',
    },
    {
      id: 'dimension_blades',
      name: 'Dimension Rift Blades',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { agility: 81, strength: 26, defense: 10 },
      value: 38500,
      classRestriction: 'rogue',
    },
    {
      id: 'judgment_breaker',
      name: 'Judgment Breaker',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 75, defense: 30, wisdom: 24 },
      value: 41000,
      classRestriction: 'paladin',
    },
    
    // Level 130 Tier - Legendary Quality
    {
      id: 'ancient_destroyer',
      name: 'Ancient World Destroyer',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 99, vitality: 32, defense: 18 },
      value: 65000,
      classRestriction: 'warrior',
    },
    {
      id: 'timeless_conduit',
      name: 'Timeless Arcane Conduit',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { intelligence: 97, wisdom: 37, mana: 320 },
      value: 68000,
      classRestriction: 'mage',
    },
    {
      id: 'chaos_daggers',
      name: 'Chaos Eternal Daggers',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { agility: 103, strength: 35, defense: 14 },
      value: 66000,
      classRestriction: 'rogue',
    },
    {
      id: 'sovereignty_mace',
      name: 'Mace of Sovereignty',
      rarity: 'legendary',
      slot: 'weapon',
      stats: { strength: 97, defense: 39, wisdom: 33 },
      value: 70000,
      classRestriction: 'paladin',
    },
    
    // Level 150 Tier - Mythic Quality
    {
      id: 'apocalypse_reaver',
      name: 'Apocalypse Reaver',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { strength: 120, vitality: 42, defense: 26, agility: 12 },
      value: 140000,
      classRestriction: 'warrior',
    },
    {
      id: 'endwalker_staff',
      name: 'Endwalker Prism Staff',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { intelligence: 118, wisdom: 48, mana: 420, vitality: 25 },
      value: 145000,
      classRestriction: 'mage',
    },
    {
      id: 'fate_renders',
      name: 'Fate Render Blades',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { agility: 125, strength: 45, defense: 22, vitality: 18 },
      value: 142000,
      classRestriction: 'rogue',
    },
    {
      id: 'eternal_judgement',
      name: 'Eternal Judgement Hammer',
      rarity: 'mythic',
      slot: 'weapon',
      stats: { strength: 118, defense: 50, wisdom: 44, vitality: 30 },
      value: 150000,
      classRestriction: 'paladin',
    },
  ],
  armor: [
    {
      id: 'leather_armor',
      name: 'Leather Armor',
      rarity: 'common',
      slot: 'chest',
      stats: { defense: 5 },
      value: 80,
    },
    {
      id: 'iron_plate',
      name: 'Iron Plate Armor',
      rarity: 'uncommon',
      slot: 'chest',
      stats: { defense: 12, agility: -3 },
      value: 280,
    },
    {
      id: 'bronze_plate',
      name: 'Bronze Plate Armor',
      rarity: 'common',
      slot: 'chest',
      stats: { defense: 7, vitality: 1 },
      value: 150,
    },
    {
      id: 'bronze_helm',
      name: 'Bronze Helm',
      rarity: 'common',
      slot: 'head',
      stats: { defense: 4 },
      value: 90,
    },
    {
      id: 'bronze_boots',
      name: 'Bronze Boots',
      rarity: 'common',
      slot: 'boots',
      stats: { defense: 3, agility: 1 },
      value: 80,
    },
    {
      id: 'bronze_greaves',
      name: 'Bronze Greaves',
      rarity: 'common',
      slot: 'legs',
      stats: { defense: 5, vitality: 1 },
      value: 120,
    },
    {
      id: 'copper_plate',
      name: 'Copper Plate Armor',
      rarity: 'common',
      slot: 'chest',
      stats: { defense: 6 },
      value: 100,
    },
    {
      id: 'copper_helm',
      name: 'Copper Helm',
      rarity: 'common',
      slot: 'head',
      stats: { defense: 3 },
      value: 70,
    },
    {
      id: 'copper_greaves',
      name: 'Copper Greaves',
      rarity: 'common',
      slot: 'legs',
      stats: { defense: 4 },
      value: 90,
    },
    {
      id: 'copper_boots',
      name: 'Copper Boots',
      rarity: 'common',
      slot: 'boots',
      stats: { defense: 2, agility: 1 },
      value: 60,
    },
    {
      id: 'granite_plate',
      name: 'Granite Plate Armor',
      rarity: 'uncommon',
      slot: 'chest',
      stats: { defense: 14, vitality: 2 },
      value: 380,
    },
    {
      id: 'granite_helm',
      name: 'Granite Helm',
      rarity: 'uncommon',
      slot: 'head',
      stats: { defense: 9, vitality: 1 },
      value: 280,
    },
    {
      id: 'granite_greaves',
      name: 'Granite Greaves',
      rarity: 'uncommon',
      slot: 'legs',
      stats: { defense: 10, vitality: 1 },
      value: 300,
    },
    {
      id: 'granite_boots',
      name: 'Granite Boots',
      rarity: 'uncommon',
      slot: 'boots',
      stats: { defense: 7, agility: -1 },
      value: 250,
    },
    {
      id: 'iron_helm',
      name: 'Iron Helm',
      rarity: 'uncommon',
      slot: 'head',
      stats: { defense: 8 },
      value: 200,
    },
    {
      id: 'iron_greaves',
      name: 'Iron Greaves',
      rarity: 'uncommon',
      slot: 'legs',
      stats: { defense: 9, agility: -1 },
      value: 220,
    },
    {
      id: 'iron_boots',
      name: 'Iron Boots',
      rarity: 'uncommon',
      slot: 'boots',
      stats: { defense: 6, agility: 1 },
      value: 180,
    },
    {
      id: 'steel_helm',
      name: 'Steel Helm',
      rarity: 'uncommon',
      slot: 'head',
      stats: { defense: 11 },
      value: 320,
    },
    {
      id: 'steel_plate',
      name: 'Steel Plate Armor',
      rarity: 'uncommon',
      slot: 'chest',
      stats: { defense: 16, vitality: 3, agility: -2 },
      value: 520,
    },
    {
      id: 'steel_greaves',
      name: 'Steel Greaves',
      rarity: 'uncommon',
      slot: 'legs',
      stats: { defense: 13, agility: -1 },
      value: 400,
    },
    {
      id: 'steel_boots',
      name: 'Steel Boots',
      rarity: 'uncommon',
      slot: 'boots',
      stats: { defense: 9, agility: 1 },
      value: 350,
    },
    {
      id: 'mithril_plate',
      name: 'Mithril Plate Armor',
      rarity: 'rare',
      slot: 'chest',
      stats: { defense: 22, agility: -1 },
      value: 1100,
    },
    {
      id: 'mithril_helm',
      name: 'Mithril Helm',
      rarity: 'rare',
      slot: 'head',
      stats: { defense: 16, wisdom: 2 },
      value: 900,
    },
    {
      id: 'mithril_boots',
      name: 'Mithril Boots',
      rarity: 'rare',
      slot: 'boots',
      stats: { defense: 10, agility: 3 },
      value: 850,
    },
    {
      id: 'mithril_greaves',
      name: 'Mithril Greaves',
      rarity: 'rare',
      slot: 'legs',
      stats: { defense: 18, wisdom: 1, agility: 1 },
      value: 1000,
    },
    {
      id: 'einherjar_plate',
      name: 'Einherjar Plate',
      rarity: 'rare',
      slot: 'chest',
      stats: { defense: 26, vitality: 6, strength: 4, agility: -2 },
      value: 2600,
    },
    {
      id: 'valkyrie_helm',
      name: 'Valkyrie Helm',
      rarity: 'rare',
      slot: 'head',
      stats: { defense: 18, wisdom: 4, agility: 2 },
      value: 1900,
    },
    {
      id: 'valkyrie_greaves',
      name: 'Valkyrie Greaves',
      rarity: 'rare',
      slot: 'legs',
      stats: { defense: 20, vitality: 4, agility: 1 },
      value: 2100,
    },
    {
      id: 'valkyrie_boots',
      name: 'Valkyrie Boots',
      rarity: 'rare',
      slot: 'boots',
      stats: { defense: 14, agility: 6 },
      value: 1800,
    },
    {
      id: 'spartan_cuirass',
      name: 'Spartan Cuirass',
      rarity: 'rare',
      slot: 'chest',
      stats: { defense: 24, vitality: 5, strength: 3, agility: -1 },
      value: 2400,
    },
    {
      id: 'spartan_helm',
      name: 'Spartan Helm',
      rarity: 'rare',
      slot: 'head',
      stats: { defense: 17, vitality: 2 },
      value: 1700,
    },
    {
      id: 'spartan_greaves',
      name: 'Spartan Greaves',
      rarity: 'rare',
      slot: 'legs',
      stats: { defense: 19, agility: 1 },
      value: 1850,
    },
    {
      id: 'spartan_sandals',
      name: 'Spartan Sandals',
      rarity: 'rare',
      slot: 'boots',
      stats: { defense: 12, agility: 5 },
      value: 1500,
    },
    // Asgardian Tier (Level 60-70) - Epic Armor
    {
      id: 'asgardian_plate',
      name: 'Asgardian Plate Armor',
      rarity: 'epic',
      slot: 'chest',
      stats: { defense: 35, vitality: 10, strength: 5 },
      value: 9000,
    },
    {
      id: 'asgardian_helm',
      name: 'Asgardian War Helm',
      rarity: 'epic',
      slot: 'head',
      stats: { defense: 25, vitality: 8, strength: 3 },
      value: 7000,
    },
    {
      id: 'asgardian_greaves',
      name: 'Asgardian Greaves',
      rarity: 'epic',
      slot: 'legs',
      stats: { defense: 30, agility: 5, vitality: 6 },
      value: 8000,
    },
    {
      id: 'asgardian_boots',
      name: 'Asgardian War Boots',
      rarity: 'epic',
      slot: 'boots',
      stats: { defense: 20, agility: 8, vitality: 4 },
      value: 6500,
    },
    {
      id: 'asgardian_gauntlets',
      name: 'Asgardian Gauntlets',
      rarity: 'epic',
      slot: 'gloves',
      stats: { defense: 18, strength: 8, vitality: 4 },
      value: 6000,
    },
    // Valkyrie Tier (Level 80-90) - Epic Armor
    {
      id: 'valkyrie_plate',
      name: 'Valkyrie Divine Armor',
      rarity: 'epic',
      slot: 'chest',
      stats: { defense: 45, vitality: 13, strength: 7, agility: 3 },
      value: 16000,
    },
    {
      id: 'valkyrie_helm',
      name: 'Valkyrie Winged Helm',
      rarity: 'epic',
      slot: 'head',
      stats: { defense: 32, vitality: 10, intelligence: 5 },
      value: 13000,
    },
    {
      id: 'valkyrie_greaves',
      name: 'Valkyrie Legplates',
      rarity: 'epic',
      slot: 'legs',
      stats: { defense: 38, agility: 7, vitality: 8 },
      value: 14500,
    },
    {
      id: 'valkyrie_boots',
      name: 'Valkyrie Flight Boots',
      rarity: 'epic',
      slot: 'boots',
      stats: { defense: 26, agility: 10, vitality: 5 },
      value: 12000,
    },
    {
      id: 'valkyrie_gauntlets',
      name: 'Valkyrie Battle Gauntlets',
      rarity: 'epic',
      slot: 'gloves',
      stats: { defense: 24, strength: 10, agility: 4 },
      value: 11000,
    },
    // Cosmic Tier (Level 100-110) - Legendary Armor
    {
      id: 'cosmic_plate',
      name: 'Cosmic Warden Armor',
      rarity: 'legendary',
      slot: 'chest',
      stats: { defense: 58, vitality: 17, strength: 10, intelligence: 5 },
      value: 30000,
    },
    {
      id: 'cosmic_helm',
      name: 'Cosmic Starforged Helm',
      rarity: 'legendary',
      slot: 'head',
      stats: { defense: 42, vitality: 13, wisdom: 8 },
      value: 24000,
    },
    {
      id: 'cosmic_greaves',
      name: 'Cosmic Void Legplates',
      rarity: 'legendary',
      slot: 'legs',
      stats: { defense: 50, agility: 10, vitality: 12 },
      value: 27000,
    },
    {
      id: 'cosmic_boots',
      name: 'Cosmic Nebula Boots',
      rarity: 'legendary',
      slot: 'boots',
      stats: { defense: 35, agility: 14, vitality: 7 },
      value: 22000,
    },
    {
      id: 'cosmic_gauntlets',
      name: 'Cosmic Titan Gauntlets',
      rarity: 'legendary',
      slot: 'gloves',
      stats: { defense: 32, strength: 14, vitality: 6 },
      value: 20000,
    },
    // Primordial Tier (Level 120-130) - Legendary Armor
    {
      id: 'primordial_plate',
      name: 'Primordial Eternal Armor',
      rarity: 'legendary',
      slot: 'chest',
      stats: { defense: 75, vitality: 22, strength: 13, intelligence: 8 },
      value: 52000,
    },
    {
      id: 'primordial_helm',
      name: 'Primordial Ancient Crown',
      rarity: 'legendary',
      slot: 'head',
      stats: { defense: 55, vitality: 17, wisdom: 12, intelligence: 6 },
      value: 42000,
    },
    {
      id: 'primordial_greaves',
      name: 'Primordial Timeless Legplates',
      rarity: 'legendary',
      slot: 'legs',
      stats: { defense: 65, agility: 13, vitality: 16 },
      value: 48000,
    },
    {
      id: 'primordial_boots',
      name: 'Primordial Infinity Treads',
      rarity: 'legendary',
      slot: 'boots',
      stats: { defense: 46, agility: 18, vitality: 10 },
      value: 38000,
    },
    {
      id: 'primordial_gauntlets',
      name: 'Primordial Genesis Gauntlets',
      rarity: 'legendary',
      slot: 'gloves',
      stats: { defense: 42, strength: 18, vitality: 9 },
      value: 35000,
    },
    // Ragnarok Tier (Level 140-150) - Mythic Armor
    {
      id: 'ragnarok_plate',
      name: 'Ragnarok Apocalypse Armor',
      rarity: 'mythic',
      slot: 'chest',
      stats: { defense: 95, vitality: 28, strength: 17, intelligence: 12 },
      value: 105000,
    },
    {
      id: 'ragnarok_helm',
      name: 'Ragnarok Doomsday Crown',
      rarity: 'mythic',
      slot: 'head',
      stats: { defense: 70, vitality: 22, wisdom: 16, intelligence: 10 },
      value: 85000,
    },
    {
      id: 'ragnarok_greaves',
      name: 'Ragnarok Fate Legplates',
      rarity: 'mythic',
      slot: 'legs',
      stats: { defense: 82, agility: 17, vitality: 20 },
      value: 95000,
    },
    {
      id: 'ragnarok_boots',
      name: 'Ragnarok Endwalker Treads',
      rarity: 'mythic',
      slot: 'boots',
      stats: { defense: 58, agility: 22, vitality: 13 },
      value: 75000,
    },
    {
      id: 'ragnarok_gauntlets',
      name: 'Ragnarok Worldbreaker Gauntlets',
      rarity: 'mythic',
      slot: 'gloves',
      stats: { defense: 54, strength: 22, vitality: 12 },
      value: 70000,
    },
  ],
};

export const ARMOR_SETS = [
  {
    id: 'bronze_set',
    name: 'Bronze Set',
    pieces: ['bronze_sword', 'bronze_plate', 'bronze_helm', 'bronze_boots'],
    setBonuses: [
      {
        pieceCount: 4,
        bonus: { strength: 6, defense: 8, vitality: 4 },
        description: 'Complete Bronze Set: +6 STR, +8 DEF, +4 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 4,
        bonus: { defense: 4, vitality: 2 },
        description: 'Bronze Collection Bonus: +4 DEF, +2 VIT',
      },
    ],
  },
  {
    id: 'warrior_set',
    name: 'Warrior Set',
    pieces: ['iron_greatsword', 'iron_plate', 'iron_helm', 'iron_greaves'],
    setBonuses: [
      {
        pieceCount: 4,
        bonus: { strength: 14, defense: 14, vitality: 6 },
        description: 'Complete Warrior Set: +14 STR, +14 DEF, +6 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 4,
        bonus: { defense: 6, vitality: 3 },
        description: 'Warrior Collection Bonus: +6 DEF, +3 VIT',
      },
    ],
  },
  {
    id: 'steel_set',
    name: 'Steel Vanguard Set',
    pieces: ['steel_longsword', 'steel_plate', 'steel_helm'],
    setBonuses: [
      {
        pieceCount: 3,
        bonus: { strength: 10, defense: 16, vitality: 6 },
        description: 'Complete Steel Set: +10 STR, +16 DEF, +6 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 3,
        bonus: { defense: 6, vitality: 2 },
        description: 'Steel Collection Bonus: +6 DEF, +2 VIT',
      },
    ],
  },
  {
    id: 'mage_set',
    name: 'Mage Set',
    pieces: ['staff_wisdom'],
    setBonuses: [
      {
        pieceCount: 1,
        bonus: { intelligence: 15, wisdom: 10, mana: 50 },
        description: 'Mage Attire: +15 INT, +10 WIS, +50 Mana',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 1,
        bonus: { intelligence: 6, mana: 20 },
        description: 'Mage Collection Bonus: +6 INT, +20 Mana',
      },
    ],
  },
  {
    id: 'mithril_set',
    name: 'Mithril Set',
    pieces: ['mithril_blade', 'mithril_plate', 'mithril_helm', 'mithril_boots'],
    setBonuses: [
      {
        pieceCount: 4,
        bonus: { strength: 18, defense: 20, agility: 6, wisdom: 4 },
        description: 'Complete Mithril Set: +18 STR, +20 DEF, +6 AGI, +4 WIS',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 4,
        bonus: { defense: 8, agility: 3, mana: 20 },
        description: 'Mithril Collection Bonus: +8 DEF, +3 AGI, +20 Mana',
      },
    ],
  },
  {
    id: 'einherjar_set',
    name: 'Einherjar Set',
    pieces: ['leviathan_axe', 'einherjar_plate', 'valkyrie_helm', 'valkyrie_greaves', 'valkyrie_boots'],
    setBonuses: [
      {
        pieceCount: 5,
        bonus: { strength: 26, defense: 28, vitality: 12, agility: 4 },
        description: 'Complete Einherjar Set: +26 STR, +28 DEF, +12 VIT, +4 AGI',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 5,
        bonus: { defense: 10, vitality: 6 },
        description: 'Einherjar Collection Bonus: +10 DEF, +6 VIT',
      },
    ],
  },
  {
    id: 'spartan_set',
    name: 'Spartan Set',
    pieces: ['ares_blade', 'spartan_cuirass', 'spartan_helm', 'spartan_greaves', 'spartan_sandals'],
    setBonuses: [
      {
        pieceCount: 5,
        bonus: { strength: 22, defense: 24, vitality: 8, agility: 6 },
        description: 'Complete Spartan Set: +22 STR, +24 DEF, +8 VIT, +6 AGI',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 5,
        bonus: { defense: 8, agility: 4 },
        description: 'Spartan Collection Bonus: +8 DEF, +4 AGI',
      },
    ],
  },
  // Asgardian Set (Level 60-70) - Epic
  {
    id: 'asgardian_warrior_set',
    name: 'Asgardian Warrior Set',
    pieces: ['asgardian_warblade', 'asgardian_plate', 'asgardian_helm', 'asgardian_greaves', 'asgardian_boots', 'asgardian_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { strength: 35, defense: 40, vitality: 18, agility: 8 },
        description: 'Complete Asgardian Set: +35 STR, +40 DEF, +18 VIT, +8 AGI',
      },
      {
        pieceCount: 4,
        bonus: { strength: 20, defense: 25, vitality: 10 },
        description: 'Asgardian Armor (4pc): +20 STR, +25 DEF, +10 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { defense: 12, vitality: 8 },
        description: 'Asgardian Collection Bonus: +12 DEF, +8 VIT',
      },
    ],
  },
  {
    id: 'asgardian_mage_set',
    name: 'Asgardian Mystic Set',
    pieces: ['asgardian_staff', 'asgardian_plate', 'asgardian_helm', 'asgardian_greaves', 'asgardian_boots', 'asgardian_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 35, wisdom: 25, defense: 35, vitality: 18 },
        description: 'Complete Asgardian Mystic Set: +35 INT, +25 WIS, +35 DEF, +18 VIT',
      },
      {
        pieceCount: 4,
        bonus: { intelligence: 20, wisdom: 15, defense: 20 },
        description: 'Asgardian Mystic Armor (4pc): +20 INT, +15 WIS, +20 DEF',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 10, wisdom: 8 },
        description: 'Asgardian Mystic Collection: +10 INT, +8 WIS',
      },
    ],
  },
  // Valkyrie Set (Level 80-90) - Epic
  {
    id: 'valkyrie_warrior_set',
    name: 'Valkyrie Battle Set',
    pieces: ['valkyrie_spear', 'valkyrie_plate', 'valkyrie_helm', 'valkyrie_greaves', 'valkyrie_boots', 'valkyrie_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { strength: 45, defense: 52, vitality: 24, agility: 12 },
        description: 'Complete Valkyrie Set: +45 STR, +52 DEF, +24 VIT, +12 AGI',
      },
      {
        pieceCount: 4,
        bonus: { strength: 28, defense: 35, vitality: 15 },
        description: 'Valkyrie Armor (4pc): +28 STR, +35 DEF, +15 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { defense: 16, vitality: 10, agility: 6 },
        description: 'Valkyrie Collection Bonus: +16 DEF, +10 VIT, +6 AGI',
      },
    ],
  },
  {
    id: 'valkyrie_mage_set',
    name: 'Valkyrie Divine Set',
    pieces: ['valkyrie_scepter', 'valkyrie_plate', 'valkyrie_helm', 'valkyrie_greaves', 'valkyrie_boots', 'valkyrie_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 45, wisdom: 32, defense: 45, vitality: 24 },
        description: 'Complete Valkyrie Divine Set: +45 INT, +32 WIS, +45 DEF, +24 VIT',
      },
      {
        pieceCount: 4,
        bonus: { intelligence: 28, wisdom: 20, defense: 28 },
        description: 'Valkyrie Divine Armor (4pc): +28 INT, +20 WIS, +28 DEF',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 14, wisdom: 10 },
        description: 'Valkyrie Divine Collection: +14 INT, +10 WIS',
      },
    ],
  },
  // Cosmic Set (Level 100-110) - Legendary
  {
    id: 'cosmic_warrior_set',
    name: 'Cosmic Warden Set',
    pieces: ['cosmic_edge', 'cosmic_plate', 'cosmic_helm', 'cosmic_greaves', 'cosmic_boots', 'cosmic_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { strength: 58, defense: 68, vitality: 32, agility: 16 },
        description: 'Complete Cosmic Set: +58 STR, +68 DEF, +32 VIT, +16 AGI',
      },
      {
        pieceCount: 4,
        bonus: { strength: 38, defense: 48, vitality: 20 },
        description: 'Cosmic Armor (4pc): +38 STR, +48 DEF, +20 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { defense: 20, vitality: 14, strength: 8 },
        description: 'Cosmic Collection Bonus: +20 DEF, +14 VIT, +8 STR',
      },
    ],
  },
  {
    id: 'cosmic_mage_set',
    name: 'Cosmic Starweaver Set',
    pieces: ['cosmic_orb', 'cosmic_plate', 'cosmic_helm', 'cosmic_greaves', 'cosmic_boots', 'cosmic_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 58, wisdom: 42, defense: 58, vitality: 32 },
        description: 'Complete Cosmic Starweaver Set: +58 INT, +42 WIS, +58 DEF, +32 VIT',
      },
      {
        pieceCount: 4,
        bonus: { intelligence: 38, wisdom: 28, defense: 38 },
        description: 'Cosmic Starweaver Armor (4pc): +38 INT, +28 WIS, +38 DEF',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 18, wisdom: 14 },
        description: 'Cosmic Starweaver Collection: +18 INT, +14 WIS',
      },
    ],
  },
  // Primordial Set (Level 120-130) - Legendary
  {
    id: 'primordial_warrior_set',
    name: 'Primordial Eternal Set',
    pieces: ['primordial_cleaver', 'primordial_plate', 'primordial_helm', 'primordial_greaves', 'primordial_boots', 'primordial_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { strength: 75, defense: 88, vitality: 42, agility: 20 },
        description: 'Complete Primordial Set: +75 STR, +88 DEF, +42 VIT, +20 AGI',
      },
      {
        pieceCount: 4,
        bonus: { strength: 50, defense: 62, vitality: 28 },
        description: 'Primordial Armor (4pc): +50 STR, +62 DEF, +28 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { defense: 26, vitality: 18, strength: 12 },
        description: 'Primordial Collection Bonus: +26 DEF, +18 VIT, +12 STR',
      },
    ],
  },
  {
    id: 'primordial_mage_set',
    name: 'Primordial Timeweaver Set',
    pieces: ['primordial_catalyst', 'primordial_plate', 'primordial_helm', 'primordial_greaves', 'primordial_boots', 'primordial_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 75, wisdom: 55, defense: 75, vitality: 42 },
        description: 'Complete Primordial Timeweaver Set: +75 INT, +55 WIS, +75 DEF, +42 VIT',
      },
      {
        pieceCount: 4,
        bonus: { intelligence: 50, wisdom: 38, defense: 50 },
        description: 'Primordial Timeweaver Armor (4pc): +50 INT, +38 WIS, +50 DEF',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 24, wisdom: 18 },
        description: 'Primordial Timeweaver Collection: +24 INT, +18 WIS',
      },
    ],
  },
  // Ragnarok Set (Level 140-150) - Mythic
  {
    id: 'ragnarok_warrior_set',
    name: 'Ragnarok Apocalypse Set',
    pieces: ['ragnarok_destroyer', 'ragnarok_plate', 'ragnarok_helm', 'ragnarok_greaves', 'ragnarok_boots', 'ragnarok_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { strength: 95, defense: 110, vitality: 55, agility: 26 },
        description: 'Complete Ragnarok Set: +95 STR, +110 DEF, +55 VIT, +26 AGI',
      },
      {
        pieceCount: 4,
        bonus: { strength: 65, defense: 80, vitality: 38 },
        description: 'Ragnarok Armor (4pc): +65 STR, +80 DEF, +38 VIT',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { defense: 32, vitality: 24, strength: 16 },
        description: 'Ragnarok Collection Bonus: +32 DEF, +24 VIT, +16 STR',
      },
    ],
  },
  {
    id: 'ragnarok_mage_set',
    name: 'Ragnarok Doomweaver Set',
    pieces: ['ragnarok_apocalypse', 'ragnarok_plate', 'ragnarok_helm', 'ragnarok_greaves', 'ragnarok_boots', 'ragnarok_gauntlets'],
    setBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 95, wisdom: 70, defense: 95, vitality: 55 },
        description: 'Complete Ragnarok Doomweaver Set: +95 INT, +70 WIS, +95 DEF, +55 VIT',
      },
      {
        pieceCount: 4,
        bonus: { intelligence: 65, wisdom: 50, defense: 65 },
        description: 'Ragnarok Doomweaver Armor (4pc): +65 INT, +50 WIS, +65 DEF',
      },
    ],
    passiveBonuses: [
      {
        pieceCount: 6,
        bonus: { intelligence: 30, wisdom: 24 },
        description: 'Ragnarok Doomweaver Collection: +30 INT, +24 WIS',
      },
    ],
  },
];

// Pre-build flat lookup map for O(1) access instead of O(n) loop
const EQUIPMENT_LOOKUP = {};
Object.values(EQUIPMENT).forEach(category => {
  category.forEach(item => {
    EQUIPMENT_LOOKUP[item.id] = { ...item, bonuses: item.stats };
  });
});

export function getEquipment(equipmentId) {
  return EQUIPMENT_LOOKUP[equipmentId] || null;
}

export function getArmorSet(setId) {
  return ARMOR_SETS.find(s => s.id === setId);
}

export function calculateSetBonuses(equippedItems) {
  let totalBonus = { strength: 0, defense: 0, intelligence: 0, agility: 0, vitality: 0, wisdom: 0, mana: 0, hp: 0 };

  for (const set of ARMOR_SETS) {
    const equippedSetPieces = set.pieces.filter(piece => equippedItems.includes(piece));
    
    for (const setBonus of set.setBonuses) {
      if (equippedSetPieces.length >= setBonus.pieceCount) {
        Object.keys(setBonus.bonus).forEach(stat => {
          totalBonus[stat] = (totalBonus[stat] || 0) + setBonus.bonus[stat];
        });
      }
    }
  }

  return totalBonus;
}

export function calculateOwnedSetBonuses(inventory = [], equippedItemsMap = {}) {
  const totalBonus = { strength: 0, defense: 0, intelligence: 0, agility: 0, vitality: 0, wisdom: 0, mana: 0, hp: 0 };

  const ownedIds = new Set();
  for (const item of inventory) {
    if (item && typeof item === 'object' && item.type === 'equipment') {
      ownedIds.add(item.id);
    }
  }

  for (const itemId of Object.values(equippedItemsMap || {})) {
    if (itemId) ownedIds.add(itemId);
  }

  for (const set of ARMOR_SETS) {
    const ownedSetPieces = set.pieces.filter(piece => ownedIds.has(piece));
    const passiveBonuses = set.passiveBonuses || [];

    for (const bonus of passiveBonuses) {
      if (ownedSetPieces.length >= bonus.pieceCount) {
        Object.keys(bonus.bonus).forEach(stat => {
          totalBonus[stat] = (totalBonus[stat] || 0) + bonus.bonus[stat];
        });
      }
    }
  }

  return totalBonus;
}
