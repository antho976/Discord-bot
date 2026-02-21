/**
 * Item/Loot System - All items with rarity and stats
 * Data-driven design for easy expansion
 */

const RARITY_COLORS = {
  common: '#ffffff',
  uncommon: '#00aa00',
  rare: '#0099ff',
  epic: '#aa00ff',
  legendary: '#ffaa00',
};

const RARITY_WEIGHTS = {
  common: 0.5,
  uncommon: 0.3,
  rare: 0.15,
  epic: 0.04,
  legendary: 0.01,
};

export const ITEMS = {
  weapons: [
    { id: 'iron_sword', name: 'Iron Sword', rarity: 'common', damage: 5, value: 50 },
    { id: 'steel_sword', name: 'Steel Sword', rarity: 'uncommon', damage: 10, value: 150 },
    { id: 'crystal_sword', name: 'Crystal Sword', rarity: 'rare', damage: 18, value: 500 },
    { id: 'demonic_blade', name: 'Demonic Blade', rarity: 'legendary', damage: 35, value: 5000 },
    // Class-exclusive weapons
    { id: 'warrior_greatsword', name: 'Warrior\'s Greatsword', rarity: 'epic', damage: 28, strength: 5, value: 2000, classRestriction: 'warrior' },
    { id: 'mage_staff', name: 'Mage\'s Staff', rarity: 'epic', damage: 16, intelligence: 6, mana: 40, value: 1800, classRestriction: 'mage' },
    { id: 'rogue_daggers', name: 'Rogue\'s Dual Daggers', rarity: 'epic', damage: 24, agility: 5, value: 1900, classRestriction: 'rogue' },
    { id: 'ranger_bow', name: 'Ranger\'s Bow', rarity: 'epic', damage: 22, agility: 4, value: 1700, classRestriction: 'ranger' },
    { id: 'paladin_hammer', name: 'Paladin\'s Hammer', rarity: 'epic', damage: 25, strength: 4, defense: 3, value: 2100, classRestriction: 'paladin' },
    // Early game weapons (Level 1-17)
    { id: 'apprentice_sword', name: 'Apprentice Sword', rarity: 'common', damage: 8, strength: 2, vitality: 1, value: 120, classRestriction: 'warrior' },
    { id: 'novice_wand', name: 'Novice Wand', rarity: 'common', damage: 6, intelligence: 4, mana: 20, value: 130, classRestriction: 'mage' },
    { id: 'rusty_dagger', name: 'Rusty Dagger', rarity: 'common', damage: 7, agility: 3, strength: 1, value: 110, classRestriction: 'rogue' },
    { id: 'wooden_mace', name: 'Wooden Mace', rarity: 'common', damage: 7, strength: 2, defense: 2, wisdom: 1, value: 125, classRestriction: 'paladin' },
    { id: 'holy_sword', name: 'Holy Sword', rarity: 'common', damage: 8, strength: 2, defense: 1, wisdom: 2, value: 130, classRestriction: 'paladin' },
    { id: 'iron_cleaver', name: 'Iron Cleaver', rarity: 'uncommon', damage: 14, strength: 4, vitality: 2, value: 400, classRestriction: 'warrior' },
    { id: 'crystal_wand', name: 'Crystal Wand', rarity: 'uncommon', damage: 12, intelligence: 6, wisdom: 2, mana: 35, value: 450, classRestriction: 'mage' },
    { id: 'steel_dirk', name: 'Steel Dirk', rarity: 'uncommon', damage: 13, agility: 5, strength: 2, value: 420, classRestriction: 'rogue' },
    { id: 'blessed_mace', name: 'Blessed Mace', rarity: 'uncommon', damage: 13, strength: 3, defense: 3, wisdom: 2, value: 440, classRestriction: 'paladin' },
    { id: 'blessed_longsword', name: 'Blessed Longsword', rarity: 'uncommon', damage: 14, strength: 3, defense: 3, wisdom: 2, value: 460, classRestriction: 'paladin' },
    { id: 'battle_axe', name: 'Battle Axe', rarity: 'rare', damage: 18, strength: 5, vitality: 3, defense: 1, value: 900, classRestriction: 'warrior' },
    { id: 'sage_staff', name: 'Sage Staff', rarity: 'rare', damage: 15, intelligence: 7, wisdom: 4, mana: 50, value: 950, classRestriction: 'mage' },
    { id: 'shadow_blade', name: 'Shadow Blade', rarity: 'rare', damage: 17, agility: 7, strength: 3, vitality: 1, value: 880, classRestriction: 'rogue' },
    { id: 'holy_hammer', name: 'Holy Hammer', rarity: 'rare', damage: 16, strength: 5, defense: 4, wisdom: 3, value: 920, classRestriction: 'paladin' },
    { id: 'sacred_blade', name: 'Sacred Blade', rarity: 'rare', damage: 17, strength: 5, defense: 4, wisdom: 3, value: 940, classRestriction: 'paladin' },
    // Intermediate Norse/Greek weapons (Level 18-28)
    { id: 'odin_blade', name: 'Odin\'s Blade', rarity: 'rare', damage: 20, strength: 6, wisdom: 2, value: 1800, classRestriction: 'warrior' },
    { id: 'thor_axe_junior', name: 'Mjolnir\'s Echo', rarity: 'epic', damage: 28, strength: 8, vitality: 3, value: 2900, classRestriction: 'warrior' },
    { id: 'hermes_staff', name: 'Hermes\' Staff', rarity: 'rare', damage: 16, intelligence: 8, mana: 45, value: 1900, classRestriction: 'mage' },
    { id: 'athena_staff_junior', name: 'Athena\'s Wisdom Staff', rarity: 'epic', damage: 20, intelligence: 10, wisdom: 4, mana: 70, value: 3100, classRestriction: 'mage' },
    { id: 'fenrir_daggers', name: 'Fenrir\'s Fangs', rarity: 'rare', damage: 22, agility: 8, strength: 2, value: 1750, classRestriction: 'rogue' },
    { id: 'hermes_daggers', name: 'Hermes\' Swift Blades', rarity: 'epic', damage: 26, agility: 10, strength: 3, value: 3050, classRestriction: 'rogue' },
    { id: 'heimdall_mace', name: 'Heimdall\'s Mace', rarity: 'rare', damage: 20, strength: 6, defense: 4, wisdom: 3, value: 1950, classRestriction: 'paladin' },
    { id: 'zeus_hammer_junior', name: 'Zeus\' Judgement', rarity: 'epic', damage: 28, strength: 8, defense: 5, wisdom: 3, value: 3200, classRestriction: 'paladin' },
    // Mythic class weapons (Norse/Greek - Level 34+)
    { id: 'tyr_warblade', name: 'Tyr\'s Warblade', rarity: 'legendary', damage: 38, strength: 7, defense: 2, value: 6200, classRestriction: 'warrior' },
    { id: 'apollo_sunstaff', name: 'Apollo\'s Sunstaff', rarity: 'legendary', damage: 26, intelligence: 8, mana: 80, value: 6100, classRestriction: 'mage' },
    { id: 'loki_shadowblades', name: 'Loki\'s Shadowblades', rarity: 'legendary', damage: 34, agility: 7, value: 6000, classRestriction: 'rogue' },
    { id: 'aegis_hammer', name: 'Aegis Hammer', rarity: 'legendary', damage: 32, strength: 5, defense: 6, wisdom: 3, value: 6300, classRestriction: 'paladin' },
    // Ultimate legendary weapons (Level 50+ boss drops)
    { id: 'tyrfing', name: 'Tyrfing', rarity: 'legendary', damage: 42, strength: 8, agility: 4, vitality: 3, value: 8000 },
    { id: 'harpe', name: 'Harpe', rarity: 'legendary', damage: 40, strength: 6, intelligence: 6, wisdom: 4, value: 8500 },
    { id: 'deathbringer', name: 'Deathbringer', rarity: 'legendary', damage: 48, strength: 7, agility: 5, value: 8800 },
    { id: 'void_staff', name: 'Void Staff', rarity: 'legendary', damage: 30, intelligence: 12, wisdom: 6, mana: 100, value: 8700, classRestriction: 'mage' },
    
    // === NIFLHEIM WEAPONS (Level 150+) - Ice/Frost Theme (Every 30 Levels) ===
    // Level 165 - Glacial Tier
    { id: 'glacial_cleaver', name: 'Glacial Cleaver', rarity: 'legendary', damage: 52, strength: 12, vitality: 6, value: 12000, minLevel: 165, classRestriction: 'warrior', description: 'A massive blade carved from primordial ice' },
    { id: 'frostspire_staff', name: 'Frostspire Staff', rarity: 'legendary', damage: 38, intelligence: 16, wisdom: 8, mana: 140, value: 11800, minLevel: 165, classRestriction: 'mage', description: 'Staff crowned with frozen star essence' },
    { id: 'rime_daggers', name: 'Rime Daggers', rarity: 'legendary', damage: 46, agility: 14, strength: 6, value: 11500, minLevel: 165, classRestriction: 'rogue', description: 'Twin blades that leave trails of frost' },
    { id: 'hoarfrost_mace', name: 'Hoarfrost Mace', rarity: 'legendary', damage: 48, strength: 10, defense: 8, wisdom: 6, value: 12200, minLevel: 165, classRestriction: 'paladin', description: 'Blessed mace encased in eternal ice' },
    
    // Level 195 - Helglass Tier
    { id: 'helglass_executioner', name: 'Helglass Executioner', rarity: 'legendary', damage: 64, strength: 16, vitality: 10, value: 18000, minLevel: 195, classRestriction: 'warrior', description: 'Ice-glass edge sharper than death' },
    { id: 'mist_weaver_rod', name: 'Mist Weaver Rod', rarity: 'legendary', damage: 46, intelligence: 20, wisdom: 12, mana: 180, value: 17800, minLevel: 195, classRestriction: 'mage', description: 'Weaves frozen mist into reality-bending spells' },
    { id: 'sleet_fangs', name: 'Sleet Fangs', rarity: 'legendary', damage: 58, agility: 18, strength: 10, value: 17500, minLevel: 195, classRestriction: 'rogue', description: 'Daggers that strike like frozen rain' },
    { id: 'glacierborne_maul', name: 'Glacierborne Maul', rarity: 'legendary', damage: 60, strength: 14, defense: 12, wisdom: 10, value: 18200, minLevel: 195, classRestriction: 'paladin', description: 'Maul carrying the weight of glaciers themselves' },
    
    // Level 225 - Frostwyrm Tier
    { id: 'wyrmfrost_colossus', name: 'Wyrmfrost Colossus', rarity: 'legendary', damage: 76, strength: 20, vitality: 14, value: 26000, minLevel: 225, classRestriction: 'warrior', description: 'Greatsword forged from a frost wyrm\'s fang' },
    { id: 'icebound_oracle_staff', name: 'Icebound Oracle Staff', rarity: 'legendary', damage: 54, intelligence: 24, wisdom: 16, mana: 220, value: 25800, minLevel: 225, classRestriction: 'mage', description: 'Sees and shapes the frozen future' },
    { id: 'rimestalker_claws', name: 'Rimestalker Claws', rarity: 'legendary', damage: 70, agility: 22, strength: 14, value: 25500, minLevel: 225, classRestriction: 'rogue', description: 'Claws that hunt through the endless mist' },
    { id: 'glacial_sentinel_axe', name: 'Glacial Sentinel Axe', rarity: 'legendary', damage: 72, strength: 18, defense: 16, wisdom: 14, value: 26200, minLevel: 225, classRestriction: 'paladin', description: 'Axe wielded by Niflheim\'s guardians' },
    
    // Level 255 - Niflheim Apex Tier
    { id: 'niflheim_oblivion_blade', name: 'Niflheim Oblivion Blade', rarity: 'legendary', damage: 88, strength: 24, vitality: 18, value: 35000, minLevel: 255, classRestriction: 'warrior', description: 'The ultimate blade of the frozen realm' },
    { id: 'cryomancer_terminus', name: 'Cryomancer Terminus', rarity: 'legendary', damage: 62, intelligence: 28, wisdom: 20, mana: 260, value: 34800, minLevel: 255, classRestriction: 'mage', description: 'Final word in ice magic' },
    { id: 'absolute_zero_talons', name: 'Absolute Zero Talons', rarity: 'legendary', damage: 82, agility: 26, strength: 18, value: 34500, minLevel: 255, classRestriction: 'rogue', description: 'Talons that reduce foes to nothingness' },
    { id: 'frostlord_devastator', name: 'Frostlord Devastator', rarity: 'legendary', damage: 84, strength: 22, defense: 20, wisdom: 18, value: 35200, minLevel: 255, classRestriction: 'paladin', description: 'Weapon of Niflheim\'s lords' },
    
    // Level 285 - Cryogenic Singularity Tier
    { id: 'cryogenic_singularity', name: 'Cryogenic Singularity', rarity: 'legendary', damage: 100, strength: 28, vitality: 22, value: 45000, minLevel: 285, classRestriction: 'warrior', description: 'A black hole of absolute cold' },
    { id: 'infinity_frost_codex', name: 'Infinity Frost Codex', rarity: 'legendary', damage: 70, intelligence: 32, wisdom: 24, mana: 300, value: 44800, minLevel: 285, classRestriction: 'mage', description: 'Contains infinite frozen dimensions' },
    { id: 'reality_frost_edges', name: 'Reality Frost Edges', rarity: 'legendary', damage: 94, agility: 30, strength: 22, value: 44500, minLevel: 285, classRestriction: 'rogue', description: 'Cut through reality\'s frozen layers' },
    { id: 'niflheim_godbreaker', name: 'Niflheim Godbreaker', rarity: 'legendary', damage: 96, strength: 26, defense: 24, wisdom: 22, value: 45200, minLevel: 285, classRestriction: 'paladin', description: 'Breaks even gods with cold' },
  ],
  armor: [
    { id: 'copper_plate', name: 'Copper Plate Armor', rarity: 'common', defense: 3, value: 40 },
    { id: 'shadow_cloak', name: 'Shadow Cloak', rarity: 'rare', defense: 8, value: 450 },
    { id: 'granite_plate', name: 'Granite Plate', rarity: 'rare', defense: 12, value: 550 },
    { id: 'crown_darkness', name: 'Crown of Darkness', rarity: 'legendary', defense: 20, value: 5000 },
    { id: 'hellfire_ring', name: 'Hellfire Blade', rarity: 'legendary', intelligence: 9, damage: 22, defense: 8, mana: 80, value: 8600 },
    // Class-exclusive armor
    { id: 'warrior_plate', name: 'Warrior\'s Plate Armor', rarity: 'epic', defense: 18, strength: 3, hp: 50, value: 2000, classRestriction: 'warrior' },
    { id: 'mage_robes', name: 'Mage\'s Robes', rarity: 'epic', defense: 10, intelligence: 4, mana: 50, value: 1900, classRestriction: 'mage' },
    { id: 'rogue_leathers', name: 'Rogue\'s Leathers', rarity: 'epic', defense: 14, agility: 5, value: 1800, classRestriction: 'rogue' },
    { id: 'ranger_armor', name: 'Ranger\'s Armor', rarity: 'epic', defense: 12, agility: 3, value: 1600, classRestriction: 'ranger' },
    { id: 'paladin_shield', name: 'Paladin\'s Divine Shield', rarity: 'epic', defense: 20, wisdom: 2, value: 2200, classRestriction: 'paladin' },
    
    // === NIFLHEIM ARMOR (Level 150+) - Ice/Frost Theme (Every 30 Levels) ===
    // Level 165 - Glacial Tier
    { id: 'glacial_warlord_plate', name: 'Glacial Warlord Plate', rarity: 'legendary', defense: 28, strength: 8, vitality: 12, hp: 200, value: 12000, minLevel: 165, classRestriction: 'warrior', description: 'Plate forged from glacier heart' },
    { id: 'frostweave_archmage_robes', name: 'Frostweave Archmage Robes', rarity: 'legendary', defense: 18, intelligence: 12, wisdom: 8, mana: 150, value: 11800, minLevel: 165, classRestriction: 'mage', description: 'Robes woven with frozen starlight' },
    { id: 'rimestalker_leathers', name: 'Rimestalker Leathers', rarity: 'legendary', defense: 24, agility: 10, vitality: 6, value: 11500, minLevel: 165, classRestriction: 'rogue', description: 'Silent as falling snow' },
    { id: 'hoarfrost_guardian_mail', name: 'Hoarfrost Guardian Mail', rarity: 'legendary', defense: 32, strength: 6, wisdom: 10, hp: 180, value: 12200, minLevel: 165, classRestriction: 'paladin', description: 'Mail blessed by eternal frost' },
    
    // Level 195 - Helglass Tier
    { id: 'helglass_warlord_set', name: 'Helglass Warlord Set', rarity: 'legendary', defense: 40, strength: 12, vitality: 16, hp: 280, value: 18000, minLevel: 195, classRestriction: 'warrior', description: 'Ice-glass armor sharper than steel' },
    { id: 'mist_oracle_regalia', name: 'Mist Oracle Regalia', rarity: 'legendary', defense: 26, intelligence: 16, wisdom: 12, mana: 210, value: 17800, minLevel: 195, classRestriction: 'mage', description: 'Regalia woven from living mist' },
    { id: 'sleet_phantom_gear', name: 'Sleet Phantom Gear', rarity: 'legendary', defense: 32, agility: 14, vitality: 10, value: 17500, minLevel: 195, classRestriction: 'rogue', description: 'Vanish like sleet in wind' },
    { id: 'glacierborne_crusader', name: 'Glacierborne Crusader', rarity: 'legendary', defense: 44, strength: 10, wisdom: 14, hp: 260, value: 18200, minLevel: 195, classRestriction: 'paladin', description: 'Crusader against the cold' },
    
    // Level 225 - Frostwyrm Tier
    { id: 'wyrmfrost_tyrant_armor', name: 'Wyrmfrost Tyrant Armor', rarity: 'legendary', defense: 52, strength: 16, vitality: 20, hp: 360, value: 26000, minLevel: 225, classRestriction: 'warrior', description: 'Scales of frost wyrms' },
    { id: 'icebound_archon_vestments', name: 'Icebound Archon Vestments', rarity: 'legendary', defense: 34, intelligence: 20, wisdom: 16, mana: 270, value: 25800, minLevel: 225, classRestriction: 'mage', description: 'Vestments of ice archons' },
    { id: 'rimehunter_battlegear', name: 'Rimehunter Battlegear', rarity: 'legendary', defense: 40, agility: 18, vitality: 14, value: 25500, minLevel: 225, classRestriction: 'rogue', description: 'Hunt through frozen wastes' },
    { id: 'glacial_paragon_set', name: 'Glacial Paragon Set', rarity: 'legendary', defense: 56, strength: 14, wisdom: 18, hp: 340, value: 26200, minLevel: 225, classRestriction: 'paladin', description: 'Paragon of glacial might' },
    
    // Level 255 - Niflheim Apex Tier
    { id: 'niflheim_overlord_plate', name: 'Niflheim Overlord Plate', rarity: 'legendary', defense: 64, strength: 20, vitality: 24, hp: 440, value: 35000, minLevel: 255, classRestriction: 'warrior', description: 'Command Niflheim itself' },
    { id: 'cryomancer_sovereign_robes', name: 'Cryomancer Sovereign Robes', rarity: 'legendary', defense: 42, intelligence: 24, wisdom: 20, mana: 330, value: 34800, minLevel: 255, classRestriction: 'mage', description: 'Sovereign over all ice' },
    { id: 'absolute_zero_infiltrator', name: 'Absolute Zero Infiltrator', rarity: 'legendary', defense: 48, agility: 22, vitality: 18, value: 34500, minLevel: 255, classRestriction: 'rogue', description: 'Infiltrate frozen dimensions' },
    { id: 'frostlord_bastion', name: 'Frostlord Bastion', rarity: 'legendary', defense: 68, strength: 18, wisdom: 22, hp: 420, value: 35200, minLevel: 255, classRestriction: 'paladin', description: 'Bastion of frost lords' },
    
    // Level 285 - Cryogenic Singularity Tier
    { id: 'cryogenic_destroyer_plate', name: 'Cryogenic Destroyer Plate', rarity: 'legendary', defense: 76, strength: 24, vitality: 28, hp: 520, value: 45000, minLevel: 285, classRestriction: 'warrior', description: 'Destroy with singularity cold' },
    { id: 'infinity_frost_mantle', name: 'Infinity Frost Mantle', rarity: 'legendary', defense: 50, intelligence: 28, wisdom: 24, mana: 390, value: 44800, minLevel: 285, classRestriction: 'mage', description: 'Infinite frozen power' },
    { id: 'reality_breaker_suit', name: 'Reality Breaker Suit', rarity: 'legendary', defense: 56, agility: 26, vitality: 22, value: 44500, minLevel: 285, classRestriction: 'rogue', description: 'Break reality\'s frozen shell' },
    { id: 'niflheim_godshield', name: 'Niflheim Godshield', rarity: 'legendary', defense: 80, strength: 22, wisdom: 26, hp: 500, value: 45200, minLevel: 285, classRestriction: 'paladin', description: 'Shield even gods fear' },
  ],
  consumables: [
    { id: 'health_potion', name: 'Health Potion', rarity: 'common', heals: 50, value: 25 },
    { id: 'mana_potion', name: 'Mana Potion', rarity: 'common', restoresMana: 30, value: 20 },
    // Health Potions
    { id: 'health_potion_t1', name: 'Basic Health Potion', rarity: 'common', value: 50 },
    { id: 'health_potion_t2', name: 'Uncommon Health Potion', rarity: 'uncommon', value: 100 },
    { id: 'health_potion_t3', name: 'Rare Health Potion', rarity: 'rare', value: 200 },
    { id: 'health_potion_t4', name: 'Epic Health Potion', rarity: 'epic', value: 400 },
    { id: 'health_potion_t5', name: 'Legendary Health Potion', rarity: 'legendary', value: 800 },
    { id: 'health_potion_t6', name: 'Frozen Life Potion', rarity: 'legendary', value: 1600, description: 'Niflheim vitality essence' },
    // XP Potions
    { id: 'xp_potion_t1', name: 'Basic XP Potion', rarity: 'common', value: 50 },
    { id: 'xp_potion_t2', name: 'Uncommon XP Potion', rarity: 'uncommon', value: 100 },
    { id: 'xp_potion_t3', name: 'Rare XP Potion', rarity: 'rare', value: 200 },
    { id: 'xp_potion_t4', name: 'Epic XP Potion', rarity: 'epic', value: 400 },
    { id: 'xp_potion_t5', name: 'Legendary XP Potion', rarity: 'legendary', value: 800 },
    { id: 'xp_potion_t6', name: 'Cryogenic Knowledge Potion', rarity: 'legendary', value: 1600, description: 'Frozen wisdom boost' },
    // Gold Potions
    { id: 'gold_potion_t1', name: 'Basic Gold Potion', rarity: 'common', value: 50 },
    { id: 'gold_potion_t2', name: 'Uncommon Gold Potion', rarity: 'uncommon', value: 100 },
    { id: 'gold_potion_t3', name: 'Rare Gold Potion', rarity: 'rare', value: 200 },
    { id: 'gold_potion_t4', name: 'Epic Gold Potion', rarity: 'epic', value: 400 },
    { id: 'gold_potion_t5', name: 'Legendary Gold Potion', rarity: 'legendary', value: 800 },
    { id: 'gold_potion_t6', name: 'Mistborn Fortune Potion', rarity: 'legendary', value: 1600, description: 'Ice-shard wealth' },
    // Gathering Potions
    { id: 'gathering_potion_t1', name: 'Basic Gathering Potion', rarity: 'common', value: 50 },
    { id: 'gathering_potion_t2', name: 'Uncommon Gathering Potion', rarity: 'uncommon', value: 100 },
    { id: 'gathering_potion_t3', name: 'Rare Gathering Potion', rarity: 'rare', value: 200 },
    { id: 'gathering_potion_t4', name: 'Epic Gathering Potion', rarity: 'epic', value: 400 },
    { id: 'gathering_potion_t5', name: 'Legendary Gathering Potion', rarity: 'legendary', value: 800 },
    { id: 'gathering_potion_t6', name: 'Helglass Harvest Potion', rarity: 'legendary', value: 1600, description: 'Frozen harvest power' },
    // Loot Potions
    { id: 'loot_potion_t1', name: 'Basic Loot Potion', rarity: 'common', value: 50 },
    { id: 'loot_potion_t2', name: 'Uncommon Loot Potion', rarity: 'uncommon', value: 100 },
    { id: 'loot_potion_t3', name: 'Rare Loot Potion', rarity: 'rare', value: 200 },
    { id: 'loot_potion_t4', name: 'Epic Loot Potion', rarity: 'epic', value: 400 },
    { id: 'loot_potion_t5', name: 'Legendary Loot Potion', rarity: 'legendary', value: 800 },
    { id: 'loot_potion_t6', name: 'Frozen Fate Potion', rarity: 'legendary', value: 1600, description: 'Niflheim loot essence' },
    
    // Damage Enchants
    { id: 'damage_enchant_t1', name: 'Basic Damage Enchant', rarity: 'common', value: 50 },
    { id: 'damage_enchant_t2', name: 'Uncommon Damage Enchant', rarity: 'uncommon', value: 100 },
    { id: 'damage_enchant_t3', name: 'Rare Damage Enchant', rarity: 'rare', value: 200 },
    { id: 'damage_enchant_t4', name: 'Epic Damage Enchant', rarity: 'epic', value: 400 },
    { id: 'damage_enchant_t5', name: 'Legendary Damage Enchant', rarity: 'legendary', value: 800 },
    { id: 'damage_enchant_t6', name: 'Frostbound Fury Enchant', rarity: 'legendary', value: 1600, description: 'Frozen damage supremacy' },
    
    // XP Enchants
    { id: 'xp_enchant_t1', name: 'Basic XP Enchant', rarity: 'common', value: 50 },
    { id: 'xp_enchant_t2', name: 'Uncommon XP Enchant', rarity: 'uncommon', value: 100 },
    { id: 'xp_enchant_t3', name: 'Rare XP Enchant', rarity: 'rare', value: 200 },
    { id: 'xp_enchant_t4', name: 'Epic XP Enchant', rarity: 'epic', value: 400 },
    { id: 'xp_enchant_t5', name: 'Legendary XP Enchant', rarity: 'legendary', value: 800 },
    { id: 'xp_enchant_t6', name: 'Cryogenic Wisdom Enchant', rarity: 'legendary', value: 1600, description: 'Frozen knowledge' },
    
    // Loot Enchants
    { id: 'loot_enchant_t1', name: 'Basic Loot Enchant', rarity: 'common', value: 50 },
    { id: 'loot_enchant_t2', name: 'Uncommon Loot Enchant', rarity: 'uncommon', value: 100 },
    { id: 'loot_enchant_t3', name: 'Rare Loot Enchant', rarity: 'rare', value: 200 },
    { id: 'loot_enchant_t4', name: 'Epic Loot Enchant', rarity: 'epic', value: 400 },
    { id: 'loot_enchant_t5', name: 'Legendary Loot Enchant', rarity: 'legendary', value: 800 },
    { id: 'loot_enchant_t6', name: 'Helglass Fortune Enchant', rarity: 'legendary', value: 1600, description: 'Ice-shard fortune' },
    
    // Double Hit Enchants
    { id: 'doublehit_enchant_t1', name: 'Basic Double Hit Enchant', rarity: 'common', value: 50 },
    { id: 'doublehit_enchant_t2', name: 'Uncommon Double Hit Enchant', rarity: 'uncommon', value: 100 },
    { id: 'doublehit_enchant_t3', name: 'Rare Double Hit Enchant', rarity: 'rare', value: 200 },
    { id: 'doublehit_enchant_t4', name: 'Epic Double Hit Enchant', rarity: 'epic', value: 400 },
    { id: 'doublehit_enchant_t5', name: 'Legendary Double Hit Enchant', rarity: 'legendary', value: 800 },
    { id: 'doublehit_enchant_t6', name: 'Mistborn Strike Enchant', rarity: 'legendary', value: 1600, description: 'Phantom double strikes' },
    
    // Boss Damage Enchants (NEW - for guild boss fights)
    { id: 'boss_damage_enchant_t1', name: 'Basic Boss Damage Enchant', rarity: 'uncommon', value: 150 },
    { id: 'boss_damage_enchant_t2', name: 'Uncommon Boss Damage Enchant', rarity: 'uncommon', value: 200 },
    { id: 'boss_damage_enchant_t3', name: 'Rare Boss Damage Enchant', rarity: 'rare', value: 300 },
    { id: 'boss_damage_enchant_t4', name: 'Epic Boss Damage Enchant', rarity: 'epic', value: 600 },
    { id: 'boss_damage_enchant_t5', name: 'Legendary Boss Damage Enchant', rarity: 'legendary', value: 1200 },
    { id: 'boss_damage_enchant_t6', name: 'Bossbreaker Frost Enchant', rarity: 'legendary', value: 2400, description: 'Shatter boss defenses' },
  ],
};

/**
 * Get random loot based on rarity weights
 */
export function getRandomLoot() {
  const rarities = Object.keys(RARITY_WEIGHTS);
  const weights = rarities.map(r => RARITY_WEIGHTS[r]);
  const random = Math.random();
  let sum = 0;
  let selectedRarity = 'common';

  for (let i = 0; i < rarities.length; i++) {
    sum += weights[i];
    if (random < sum) {
      selectedRarity = rarities[i];
      break;
    }
  }

  // Random item from any category
  const categories = Object.values(ITEMS);
  const randomCategory = categories[Math.floor(Math.random() * categories.length)];
  const itemsOfRarity = randomCategory.filter(item => item.rarity === selectedRarity);

  if (itemsOfRarity.length === 0) {
    return randomCategory[0]; // Fallback to first item
  }

  return itemsOfRarity[Math.floor(Math.random() * itemsOfRarity.length)];
}

/**
 * Get item by ID
 */
const ITEMS_LOOKUP = {};
Object.values(ITEMS).forEach(category => {
  category.forEach(item => {
    ITEMS_LOOKUP[item.id] = item;
  });
});

export function getItemById(itemId) {
  return ITEMS_LOOKUP[itemId] || null;
}

/**
 * Get rarity color for embeds
 */
export function getRarityColor(rarity) {
  const colors = {
    common: 0xffffff,
    uncommon: 0x00aa00,
    rare: 0x0099ff,
    epic: 0xaa00ff,
    legendary: 0xffaa00,
  };
  return colors[rarity] || 0xffffff;
}
