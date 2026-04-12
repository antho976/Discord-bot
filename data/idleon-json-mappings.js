/**
 * Idleon Save Data JSON Key Mappings Reference
 * ==============================================
 * 
 * 
 * This file documents all known JSON keys from the Idleon save data,
 * how AutoReview parses them, and what systems they map to.
 * Use this as a reference when building new scorers or parsing save data.
 */

// ============================================================================
// ACCOUNT-LEVEL KEYS (raw_data.get("Key"))
// ============================================================================
const ACCOUNT_KEYS = {
  // --- General / Meta ---
  'TimeAway':        { type: 'object', desc: 'Contains GlobalTime (epoch timestamp of last save)' },
  'AutoLoot':        { type: 'number', desc: '1 if AutoLoot gem shop purchase is active' },
  'BundlesReceived': { type: 'object', desc: 'Gem shop bundles received. bun_i=1 means AutoLoot bundle' },
  'serverVars':      { type: 'object', desc: 'Server variables (alternate casing: servervars)' },
  'servervars':      { type: 'object', desc: 'Server variables (alternate casing of serverVars)' },
  'parsedData':      { type: 'object', desc: 'Pre-parsed data from some data sources' },

  // --- Character Names ---
  'playerNames':     { type: 'array',  desc: 'Character names (from Public IE or IE JSON)' },
  'charNames':       { type: 'array',  desc: 'Character names (from Toolbox JSON)' },
  'PlayerNames':     { type: 'array',  desc: 'Character names (from IdleonSaver tool)' },
  'CogO':            { type: 'object', desc: 'Cog data, contains Player_{name} entries for character detection' },

  // --- Inventory / Storage ---
  'ChestOrder':      { type: 'array',  desc: 'Item codenames in storage chest (paired with ChestQuantity)' },
  'ChestQuantity':   { type: 'array',  desc: 'Item quantities in storage chest (paired with ChestOrder)' },
  'InvStorageUsed':  { type: 'object', desc: 'Account-wide inventory storage usage info' },

  // --- Cards ---
  'Cards0':          { type: 'object', desc: 'Card counts/data. key_cards in AutoReview. {codename: count}' },
  'Cards1':          { type: 'object', desc: 'Additional card data' },

  // --- Stamps ---
  'StampLv':         { type: 'object', desc: 'Stamp levels (combat/skills/misc). Nested by type index' },
  'StampLvM':        { type: 'object', desc: 'Stamp max levels / materials data' },

  // --- Star Signs ---
  'StarSg':          { type: 'object', desc: 'Star sign data / constellation progress' },

  // --- Forge ---
  'ForgeLV':         { type: 'array',  desc: 'Forge upgrade levels' },

  // --- Statues ---
  'StuG':            { type: 'object', desc: 'Statue data. Gold statues info' },

  // --- Bribes ---
  'BribeStatus':     { type: 'object', desc: 'Bribe purchase/status for W1' },

  // --- Gem Shop ---
  'GemItemsPurchased': { type: 'object', desc: 'Gem shop items purchased counts' },
  'OptLacc':         { type: 'array',  desc: 'Optional account-wide gem shop data (extra purchases)' },

  // --- Quests ---
  'TaskZZ2':         { type: 'object', desc: 'Quest/task completion status' },

  // --- Achievements ---
  'AchieveReg':      { type: 'array',  desc: 'Achievement completion status array' },

  // --- Guild ---
  'Guild':           { type: 'object', desc: 'Guild data: bonuses, GP, members' },

  // --- Companions ---
  'companion':       { type: 'object', desc: 'Companion data (from Toolbox - dict format)' },
  'companions':      { type: 'array',  desc: 'Companion IDs (from Efficiency - flat array of IDs)' },

  // --- Dungeon ---
  'DungUpg':         { type: 'object', desc: 'Dungeon upgrade levels' },

  // --- Upgrade Vault ---
  'UpgVault':        { type: 'object', desc: 'Upgrade Vault levels (W1 town feature)' },

  // --- Colosseum ---
  'FamValColosseumHighscores': { type: 'object', desc: 'Colosseum highscores per world' },

  // --- Printer ---
  'Print':           { type: 'array',  desc: '3D Printer sample data' },
  'PrinterXtra':     { type: 'object', desc: 'Extra printer config (item filter, etc.)' },

  // --- Weekly Boss ---
  'WeeklyBoss':      { type: 'object', desc: 'Weekly boss completion/rewards' },

  // --- Owl (W1) ---
  // Uses serverVars for owl data

  // --- Minigames (W1) ---
  // Basketball and Darts upgrades stored in serverVars

  // =========================================================================
  // WORLD 2 KEYS
  // =========================================================================

  // --- Alchemy ---
  'CauldronInfo':    { type: 'array',  desc: 'Cauldron info: brewing progress, levels, etc.' },
  'CauldUpgLVs':     { type: 'array',  desc: 'Cauldron upgrade levels (vial slots, brew speed, etc.)' },
  'CauldronP2W':     { type: 'object', desc: 'Alchemy P2W/liquid shop data' },
  'CauldronBubbles': { type: 'array',  desc: 'Big bubble selections per character [3 per char]' },
  'CauldronJobs1':   { type: 'array',  desc: 'Alchemy job assignments per character' },

  // --- Arcade ---
  'ArcadeUpg':       { type: 'array',  desc: 'Arcade upgrade levels' },

  // --- Sigils ---
  // Parsed from CauldronInfo

  // --- Obols ---
  'ObolEqO0_{i}':    { type: 'array',  desc: 'Per-character equipped obols (i = char index 0-9)' },
  'ObolEqO1':        { type: 'object', desc: 'Family obols data' },
  'ObolEqMAPz1':     { type: 'object', desc: 'Family obol upgrades' },
  'ObolEqMAP_{i}':   { type: 'object', desc: 'Per-character obol upgrades (i = char index)' },
  'ObolInvOr':       { type: 'array',  desc: 'Obol inventory order' },

  // --- Ballot ---
  // Parsed from serverVars

  // --- Islands ---
  // Parsed from serverVars

  // --- Killroy ---
  // Parsed from serverVars

  // =========================================================================
  // WORLD 3 KEYS
  // =========================================================================

  // --- Refinery ---
  'Refinery':        { type: 'array',  desc: 'Refinery ranks, cycles, storage per salt type' },

  // --- Construction / Buildings ---
  'Tower':           { type: 'array',  desc: 'Construction building levels' },

  // --- Equinox ---
  'Dream':           { type: 'array',  desc: 'Equinox dream completion status' },

  // --- Shrines ---
  'Shrine':          { type: 'array',  desc: 'Shrine levels, map placements, and data' },

  // --- Worship / Totems ---
  'TotemInfo':       { type: 'array',  desc: 'Totem/worship data per totem' },

  // --- Atom Collider ---
  'Atoms':           { type: 'array',  desc: 'Atom levels and collider data' },

  // --- Prayers ---
  'PrayOwned':       { type: 'array',  desc: 'Prayer levels owned' },

  // --- Salt Lick ---
  'SaltLick':        { type: 'array',  desc: 'Salt Lick upgrade levels' },

  // --- Equipment Sets ---
  // Parsed from character equipment data

  // --- Deathnote ---
  // Parsed from character KLA_{i} data and serverVars

  // --- Apocalypse / Apoc ---
  // Parsed from serverVars

  // =========================================================================
  // WORLD 4 KEYS
  // =========================================================================

  // --- Cooking ---
  'Cooking':         { type: 'array',  desc: 'Kitchen table data (speed, fire, luck progress)' },
  'Meals':           { type: 'array',  desc: 'Meal levels and quantities' },
  'Ribbon':          { type: 'array',  desc: 'Cooking ribbon/spice data' },

  // --- Lab ---
  'Lab':             { type: 'array',  desc: 'Lab data: chips per player, bonus connections, jewel slots' },

  // --- Rift ---
  'Rift':            { type: 'array',  desc: 'Rift reward/progress data' },

  // --- Breeding ---
  'Breeding':        { type: 'array',  desc: 'Breeding nest data: eggs, territories, pets, upgrades' },
  'Territory':       { type: 'array',  desc: 'Territory foraging/spice progress' },
  'Pets':            { type: 'array',  desc: 'Pet collection data' },

  // =========================================================================
  // WORLD 5 KEYS
  // =========================================================================

  // --- Sailing ---
  'Sailing':         { type: 'array',  desc: 'Sailing progress: artifacts, loot pile, island data' },
  'Boats':           { type: 'array',  desc: 'Boat data: levels, speeds, loot values' },
  'Captains':        { type: 'array',  desc: 'Captain data: levels, buffs, assignments' },

  // --- Divinity ---
  'Divinity':        { type: 'array',  desc: 'Divinity god unlocks, points, links per character' },

  // --- Gaming ---
  'Gaming':          { type: 'array',  desc: 'Gaming superbits, imports, settings' },
  'GamingSprout':    { type: 'array',  desc: 'Gaming sprout/garden data' },

  // --- Sneaking ---
  'Ninja':           { type: 'object', desc: 'Sneaking/ninja system data' },

  // --- Farming ---
  // Parsed from serverVars and other keys

  // --- Summoning ---
  // Parsed from serverVars

  // =========================================================================
  // WORLD 6 / CAVERNS KEYS
  // =========================================================================
  'Holes':           { type: 'array',  desc: 'Caverns/Hole data: villagers, schematics, biomes, etc.' },
  'CYNPC':           { type: 'object', desc: 'Cavern NPC data' },
  'CYDeliveryBoxComplete': { type: 'object', desc: 'Cavern delivery box completions' },
  'CYDeliveryBoxMisc':     { type: 'object', desc: 'Cavern delivery box misc data' },
  'CYDeliveryBoxStreak':   { type: 'object', desc: 'Cavern delivery box streak data' },

  // =========================================================================
  // WORLD 7 KEYS
  // =========================================================================
  'Spelunk':         { type: 'object', desc: 'Spelunking tunnel/delve data' },
  'Arcane':          { type: 'object', desc: 'Arcane/gallery data (W7)' },

  // --- Coral Reef ---
  // Parsed from serverVars

  // --- Legend Talents ---
  // Parsed from serverVars

  // =========================================================================
  // MASTER CLASS KEYS
  // =========================================================================
  'Grimoire':        { type: 'object', desc: 'Death Bringer Grimoire upgrade data' },
  'Compass':         { type: 'object', desc: 'Wind Walker Compass data' },
  // Tesseract: parsed from Arcane key
};


// ============================================================================
// PER-CHARACTER KEYS (raw_data.get(f"Key_{characterIndex}"))
// characterIndex = 0, 1, 2, ... up to max_characters-1
// ============================================================================
const PER_CHARACTER_KEYS = {
  'CharacterClass_{i}':    { type: 'number', desc: 'Class ID number. See CLASS_IDS map below' },
  'CurrentMap_{i}':        { type: 'number', desc: 'Current map index the character is on' },
  'Lv0_{i}':               { type: 'array',  desc: 'Skill levels array for character i. Index 0=Combat, then skills in ClassNames order' },
  'SL_{i}':                { type: 'object', desc: 'Current preset talent levels {talentId: level}' },
  'SLpre_{i}':             { type: 'object', desc: 'Secondary preset talent levels' },
  'SM_{i}':                { type: 'object', desc: 'Max talent levels (from books) {talentId: maxLevel}' },
  'Prayers_{i}':           { type: 'array',  desc: 'Equipped prayer indices. -1 = empty slot' },
  'POu_{i}':               { type: 'array',  desc: 'Post Office box upgrade levels [36 values]' },
  'InventoryOrder_{i}':    { type: 'array',  desc: 'Item codenames in character inventory' },
  'ItemQTY_{i}':           { type: 'array',  desc: 'Item quantities in character inventory' },
  'EquipOrder_{i}':        { type: 'array',  desc: 'Equipped item codenames (equipment slots)' },
  'EquipQTY_{i}':          { type: 'array',  desc: 'Equipped item quantities' },
  'InvBagsUsed_{i}':       { type: 'object', desc: 'Inventory bag capacities/usage' },
  'KLA_{i}':               { type: 'array',  desc: 'Kill list array (monsters killed per map)' },
  'ObolEqO0_{i}':          { type: 'array',  desc: 'Equipped obols for character' },
  'ObolEqMAP_{i}':         { type: 'object', desc: 'Obol upgrades for character' },
  'CardEquip_{i}':         { type: 'array',  desc: 'Equipped card codenames. "B" = empty slot' },
  'CSetEq_{i}':            { type: 'object', desc: 'Equipped card set. Key is set identifier' },
  'PVtStarSign_{i}':       { type: 'string', desc: 'Equipped star sign IDs, comma-separated, trailing comma. "_" = empty' },
  'PVStatList_{i}':        { type: 'array',  desc: 'Main stat allocation [STR, AGI, WIS, LUK]' },
  'AttackLoadout_{i}':     { type: 'array',  desc: 'Current preset talent bar loadout' },
  'AttackLoadoutpre_{i}':  { type: 'array',  desc: 'Secondary preset talent bar loadout' },
  'AFKtarget_{i}':         { type: 'number', desc: 'AFK target monster/skill index' },
};


// ============================================================================
// CLASS ID TO NAME MAPPING
// From ClassNames array in consts_idleon.py
// ============================================================================
const CLASS_IDS = {
  0:  'Beginner',
  1:  'Beginner',  // (same as 0)
  2:  'Journeyman',
  3:  'Maestro',
  4:  'Voidwalker',
  5:  'Infinilyte',
  // 6: Rage Basics
  7:  'Warrior',
  8:  'Barbarian',
  9:  'Squire',
  10: 'Blood Berserker',
  // 11: NOPE
  12: 'Divine Knight',
  // 13: NOPE
  14: 'Death Bringer',
  // 15: FILLER
  16: 'Royal Guardian',
  // 17: FILLER
  // 18: Calm Basics
  19: 'Archer',
  20: 'Bowman',
  21: 'Hunter',
  22: 'Siege Breaker',
  // 23, 24: NOPE
  25: 'Beast Master',
  // 26, 27, 28: FILLER
  29: 'Wind Walker',
  // 30: Savvy Basics
  31: 'Mage',
  32: 'Wizard',
  33: 'Shaman',
  34: 'Elemental Sorcerer',
  35: 'Spiritual Monk',
  36: 'Bubonic Conjuror',
  // 37: NOPE
  // 38, 39: FILLER
  40: 'Arcane Cultist',
};


// ============================================================================
// CLASS HIERARCHY
// ============================================================================
const CLASS_HIERARCHY = {
  // Warrior branch
  'Warrior':           { base: 'Warrior', sub: 'None',       elite: 'None',              master: 'None' },
  'Barbarian':         { base: 'Warrior', sub: 'Barbarian',  elite: 'None',              master: 'None' },
  'Blood Berserker':   { base: 'Warrior', sub: 'Barbarian',  elite: 'Blood Berserker',   master: 'None' },
  'Death Bringer':     { base: 'Warrior', sub: 'Barbarian',  elite: 'Blood Berserker',   master: 'Death Bringer' },
  'Squire':            { base: 'Warrior', sub: 'Squire',     elite: 'None',              master: 'None' },
  'Divine Knight':     { base: 'Warrior', sub: 'Squire',     elite: 'Divine Knight',     master: 'None' },

  // Archer branch
  'Archer':            { base: 'Archer', sub: 'None',        elite: 'None',              master: 'None' },
  'Bowman':            { base: 'Archer', sub: 'Bowman',      elite: 'None',              master: 'None' },
  'Siege Breaker':     { base: 'Archer', sub: 'Bowman',      elite: 'Siege Breaker',     master: 'None' },
  'Hunter':            { base: 'Archer', sub: 'Hunter',      elite: 'None',              master: 'None' },
  'Beast Master':      { base: 'Archer', sub: 'Hunter',      elite: 'Beast Master',      master: 'None' },
  'Wind Walker':       { base: 'Archer', sub: 'Hunter',      elite: 'Beast Master',      master: 'Wind Walker' },

  // Mage branch
  'Mage':              { base: 'Mage',   sub: 'None',        elite: 'None',              master: 'None' },
  'Wizard':            { base: 'Mage',   sub: 'Wizard',      elite: 'None',              master: 'None' },
  'Elemental Sorcerer':{ base: 'Mage',   sub: 'Wizard',      elite: 'Elemental Sorcerer',master: 'None' },
  'Shaman':            { base: 'Mage',   sub: 'Shaman',      elite: 'None',              master: 'None' },
  'Bubonic Conjuror':  { base: 'Mage',   sub: 'Shaman',      elite: 'Bubonic Conjuror',  master: 'None' },
  'Arcane Cultist':    { base: 'Mage',   sub: 'Shaman',      elite: 'Bubonic Conjuror',  master: 'Arcane Cultist' },

  // Journeyman branch
  'Beginner':          { base: 'Beginner',    sub: 'None',    elite: 'None',              master: 'None' },
  'Journeyman':        { base: 'Journeyman',  sub: 'None',    elite: 'None',              master: 'None' },
  'Maestro':           { base: 'Journeyman',  sub: 'Maestro', elite: 'None',              master: 'None' },
  'Voidwalker':        { base: 'Journeyman',  sub: 'Maestro', elite: 'Voidwalker',        master: 'None' },
};


// ============================================================================
// SKILL INDEX LIST
// Skills are stored in Lv0_{i} array in this order (index 0 = Combat)
// ============================================================================
const SKILL_INDICES = {
  0:  'Combat',
  1:  'Mining',
  2:  'Smithing',
  3:  'Chopping',
  4:  'Fishing',
  5:  'Alchemy',
  6:  'Catching',
  7:  'Trapping',
  8:  'Construction',
  9:  'Worship',
  10: 'Cooking',
  11: 'Breeding',
  12: 'Laboratory',
  13: 'Sailing',
  14: 'Divinity',
  15: 'Gaming',
  16: 'Farming',
  17: 'Sneaking',
  18: 'Summoning',
  19: 'Spelunking',
};


// ============================================================================
// STAMP TYPES
// StampLv key contains nested arrays by stamp type
// ============================================================================
const STAMP_TYPES = {
  0: 'Combat',  // Sword stamps
  1: 'Skills',  // Hammer stamps
  2: 'Misc',    // Shield stamps
};


// ============================================================================
// CARDSET NAMES (indexed)
// Card data is in Cards0 key, format: {cardCodename: count}
// ============================================================================
const CARDSET_NAMES = [
  'Blunder Hills',       // 0
  'Yum-Yum Desert',      // 1
  'Easy Resources',       // 2
  'Medium Resources',     // 3
  'Frostbite Tundra',     // 4
  'Hard Resources',        // 5
  'Hyperion Nebula',       // 6
  "Smolderin' Plateau",   // 7
  'Spirited Valley',       // 8
  'Shimmerfin Deep',       // 9
  'Dungeons',              // 10
  'Bosses n Nightmares',   // 11
  'Events',                // 12
];


// ============================================================================
// STATUE TYPES
// StuG key contains statue levels. Index maps to statue name.
// ============================================================================
const STATUE_NAMES = [
  'Power Statue',      // 0
  'Speed Statue',       // 1
  'Mining Statue',      // 2
  'Feasty Statue',      // 3
  'Health Statue',      // 4
  'Kachow Statue',      // 5
  'Lumberbob Statue',   // 6
  'Thicc Skin Statue',  // 7
  'Oceanman Statue',    // 8
  'Ol Reliable Statue', // 9
  'Exp Book Statue',    // 10
  'Chiz Statue',        // 11
  'Thinkin Statue',     // 12
  'Bullseye Statue',    // 13
  'Dice Statue',        // 14
  'Cauldrin Statue',    // 15
  'Beholder Statue',    // 16
  'Bullseye Statue',    // 17
  'Box Statue',         // 18
  'Twosword Statue',    // 19
  'EhExPee Statue',     // 20
  'Slab Statue',        // 21
  'Anvil Statue',       // 22
  'Crabbo Statue',      // 23
  'Starfire Statue',    // 24
];


// ============================================================================
// WORLD-SPECIFIC DATA STRUCTURES
// ============================================================================

/**
 * W1 - Blunder Hills
 * ---
 * Stamps: StampLv (levels), StampLvM (materials)
 * Star Signs: StarSg
 * Forge: ForgeLV
 * Bribes: BribeStatus
 * Statues: StuG
 * Upgrade Vault: UpgVault
 * Owl: serverVars
 */

/**
 * W2 - Yum-Yum Desert
 * ---
 * Bubbles: CauldronInfo (multiple sub-arrays)
 *   - bubble_cauldron_types: 'Power', 'Quicc', 'High-IQ', 'Kazam', 'Voidinator'
 *   - Max 200 bubbles per cauldron (max_implemented_bubble_index)
 *   - Bubble levels stored in CauldronInfo sub-arrays
 * 
 * Vials: CauldronInfo (sub-section for vials)
 *   - max_vial_level: 15
 *   - Max 75 vials (max_index_of_vials)
 * 
 * Sigils: CauldronInfo (sub-section)
 *   - Unlocked in W4
 * 
 * Cauldron Upgrades: CauldUpgLVs
 *   - Brew speed, new bubble chance, etc. per cauldron
 * 
 * P2W: CauldronP2W (liquid shop purchases)
 * 
 * Arcade: ArcadeUpg (upgrade levels)
 *   - max_level: 100 (arcade_max_level)
 * 
 * Post Office: POu_{i} per character
 *   - 36 boxes with varying max levels
 * 
 * Obols: ObolEqO0_{i} (per char), ObolEqO1 (family), ObolInvOr (inventory)
 * 
 * Ballot: serverVars
 * Islands: serverVars
 * Killroy: serverVars
 */

/**
 * W3 - Frostbite Tundra
 * ---
 * Refinery: Refinery key
 *   - refinery_dict maps salt types to names/descriptions
 * 
 * Construction/Buildings: Tower key
 *   - buildings_dict for building names/descriptions
 *   - buildings_shrines for shrine data
 * 
 * Equinox: Dream key
 *   - max_implemented_dreams: configurable
 *   - equinox_bonuses_dict for bonus descriptions
 * 
 * Shrines: Shrine key
 *   - 9 shrines, each placed on a map
 * 
 * Atom Collider: Atoms key
 *   - atoms_list for atom names/effects
 *   - collider_storage_limit_list for storage caps
 * 
 * Prayers: PrayOwned key
 *   - prayers_dict maps index to prayer name/effect
 * 
 * Salt Lick: SaltLick key
 *   - salt_lick_list for upgrade names
 * 
 * Worship/Totems: TotemInfo key
 * 
 * Equipment Sets: parsed from character equipment
 *   - equipment_sets_dict for set bonuses
 * 
 * Deathnote: KLA_{i} per character
 *   - Skull tiers based on kill count per monster
 *   - apoc_amounts_list, apoc_names_list for apocalypse thresholds
 */

/**
 * W4 - Hyperion Nebula
 * ---
 * Cooking: Cooking (table data), Meals (meal levels), Ribbon (spice data)
 *   - max_cooking_tables: 9
 *   - max_meal_count: 67 (max_meal_count)
 *   - max_meal_level: 100+ (max_meal_level)
 *   - cooking_meal_dict for meal names/effects
 * 
 * Lab: Lab key
 *   - lab_chips_dict: chip names/effects
 *   - lab_bonuses_dict: connection bonus names
 *   - lab_jewels_dict: jewel names/effects
 * 
 * Rift: Rift key
 *   - rift_rewards_dict for reward descriptions
 * 
 * Breeding: Breeding, Territory, Pets keys
 *   - max_breeding_territories: 14
 *   - breeding_upgrades_dict: upgrade names/costs
 *   - breeding_genetics_list: genetic types
 *   - breeding_shiny_bonus_list: shiny bonuses
 *   - breeding_species_dict: species names by territory
 */

/**
 * W5 - Smolderin' Plateau
 * ---
 * Sailing: Sailing, Boats, Captains keys
 *   - sailing_list for island data
 *   - sailing_artifacts_dict: artifact names/effects
 *   - artifact_tier_names: ['Base', 'Ancient', ...]
 *   - captain_buffs: captain buff descriptions
 * 
 * Divinity: Divinity key
 *   - divinity_divinities_dict: god names/effects
 *   - Linked gods per character
 * 
 * Gaming: Gaming, GamingSprout keys
 *   - gaming_superbits_dict: superbit names/effects
 *   - Garden sprout data
 * 
 * Sneaking: Ninja key
 *   - Ninja twin data, charms, floors
 * 
 * Farming: serverVars
 *   - Crops, depot, land plots
 * 
 * Summoning: serverVars
 *   - Familiars, essence, battles
 */

/**
 * W6 - Spirited Valley / Caverns
 * ---
 * Caverns: Holes key (massive nested structure)
 *   - Villagers, schematics, biomes
 *   - The Well, Motherlode, Den, Monument
 *   - Bell, Harp, Lamp, Hive, Grotto
 *   - Jar, Evertree, Gambit, Temple
 *   - caverns_villagers: villager names/skills
 *   - caverns_engineer_schematics: schematic data
 * 
 * NPCs: CYNPC key
 * Delivery: CYDeliveryBoxComplete, CYDeliveryBoxMisc, CYDeliveryBoxStreak
 */

/**
 * W7 - Shimmerfin Deep
 * ---
 * Spelunking: Spelunk key
 *   - Tunnel exploration, amber, lore bosses
 * 
 * Gallery: Arcane key
 *   - Trophy showcases, nametags
 * 
 * Coral Reef: serverVars
 *   - Fish rescue bonuses
 * 
 * Legend Talents: serverVars
 *   - Whallamus talent points
 */


// ============================================================================
// ITEM CODENAME PATTERNS
// Items use internal codenames like "EquipmentHats31", "FoodHealth1", etc.
// Display names can be looked up from idleontoolbox or the wiki
// ============================================================================
const ITEM_CODENAME_PREFIXES = {
  'EquipmentHats':     'Helmets / Hats',
  'EquipmentShirts':   'Chestplates / Shirts',
  'EquipmentPants':    'Leggings / Pants',
  'EquipmentShoes':    'Boots / Shoes',
  'EquipmentPendant':  'Pendants',
  'EquipmentRings':    'Rings',
  'EquipmentRingsChat':'Chat Rings',
  'EquipmentCape':     'Capes',
  'EquipmentWeapons':  'Weapons',
  'EquipmentWands':    'Wands',
  'EquipmentBows':     'Bows',
  'EquipmentTools':    'Tools (pickaxes, etc.)',
  'EquipmentToolsHatchet': 'Hatchets',
  'FoodHealth':        'Health foods',
  'FoodPot':           'Potions (Re=red, Gr=green, Or=orange, Ye=yellow)',
  'CraftMat':          'Crafting materials',
  'Fish':              'Fish (Fish1, Fish2, ...)',
  'Bug':               'Bugs/critters (Bug1, Bug2, ...)',
  'Soul':              'Souls (Soul1, ...)',
  'Refinery':          'Refinery salts',
  'Timecandy':         'Time candies (1-4)',
  'MaxCapBag':         'Carry capacity bags',
  'InvBag':            'Inventory bag expansions',
  'InvStorage':        'Storage chest expansions',
  'Trophy':            'Trophies',
  'ObolSilver':        'Silver Obols',
  'ObolGold':          'Gold Obols',
  'ObolPlatinum':      'Platinum Obols',
  'ObolPink':          'Pink/Dementia Obols',
  'StampA':            'Combat stamps',
  'StampB':            'Skill stamps',
  'StampC':            'Misc stamps',
  'Quest':             'Quest items',
  'NPCtoken':          'NPC tokens',
  'Spice':             'Spices',
  'SailTr':            'Sailing treasures',
  'Key':               'Boss keys (Key1-Key5)',
  'GemP':              'Gem shop items',
  'GemQ':              'Gem shop items (Q series)',
  'DungWeapon':        'Dungeon weapons',
  'DungEquipment':     'Dungeon equipment',
  'DungCredits':       'Dungeon credits',
  'CardPack':          'Card packs',
  'Tree/OakTree/etc':  'Tree resources (OakTree, BirchTree, JungleTree, ForestTree, ...)',
  'Ore/Copper/Iron/etc':'Mining ores (Copper, Iron, Gold, Plat, Dementia, Void, Lustre, ...)',
};


// ============================================================================
// RESOURCE CODENAMES
// ============================================================================
const RESOURCE_CODENAMES = {
  // Trees
  'OakTree':      'Oak Logs',
  'BirchTree':    'Birch Logs',
  'JungleTree':   'Jungle Logs',
  'ForestTree':   'Forest Fibres',
  'ToiletTree':   'Veiny Logs',
  'PalmTree':     'Palm Logs',
  'StumpTree':    'Stump Logs',
  'SaharanFoal':  'Saharan Foal',
  'Tree7':        'Wispy Lumber',
  'AlienTree':    'Alien Hive Chunk',
  'Tree8':        'Cubed Logs',
  'Tree9':        'Maple Logs',
  'Tree10':       'Effervescent Logs',
  'Tree11':       'Squishy Logs',
  'Tree12':       'Starfire Logs',

  // Ores
  'Copper':       'Copper Ore',
  'Iron':         'Iron Ore',
  'Gold':         'Gold Ore',
  'Plat':         'Platinum Ore',
  'Dementia':     'Dementia Ore',
  'Void':         'Void Ore',
  'Lustre':       'Lustre Ore',
  'Starfire':     'Starfire Ore',
  'Dreadlo':      'Dreadlo Ore',
  'Godshard':     'Godshard Ore',
  'Marble':       'Marble Ore',

  // Fish
  'Fish1':  'Goldfish',
  'Fish2':  'Hermit Can',
  'Fish3':  'Jellyfish',
  'Fish4':  'Bloach',
  'Fish5':  'Skelefish',
  'Fish6':  'Sand Shark',
  'Fish7':  'Icefish',
  'Fish8':  'Flyfish',
  'Fish9':  'Demofish',
  'Fish10': 'Whattfish',
  'Fish11': 'Lavafish',
  'Fish12': 'Magmafish',
  'Fish13': 'Superfish',

  // Bugs
  'Bug1':  'Fly',
  'Bug2':  'Butterfly',
  'Bug3':  'Mousey',
  'Bug4':  'Frog',
  'Bug5':  'Scorpion',
  'Bug6':  'Ladybug',
  'Bug7':  'Firefly',
  'Bug8':  'Snail',
  'Bug9':  'Poodle',
  'Bug10': 'Crab',
  'Bug11': 'Beetle',
  'Bug12': 'Worm',
  'Bug13': 'Mosquito',

  // Bars
  'CopperBar':   'Copper Bar',
  'IronBar':     'Iron Bar',
  'GoldBar':     'Gold Bar',
  'PlatBar':     'Platinum Bar',
  'DementiaBar': 'Dementia Bar',
  'VoidBar':     'Void Bar',
  'LustreBar':   'Lustre Bar',
  'StarfireBar': 'Starfire Bar',
  'DreadloBar':  'Dreadlo Bar',
  'GodshardBar': 'Godshard Bar',

  // Refinery Salts
  'Refinery1': 'Redox Salts',
  'Refinery2': 'Explosive Salts',
  'Refinery3': 'Spontaneous Salts',
  'Refinery4': 'Dioxide Salts',
  'Refinery5': 'Purple Salts',
  'Refinery6': 'Nullo Salts',
};


// ============================================================================
// MONSTER CODENAMES (for Deathnote, Cards, etc.)
// ============================================================================
const MONSTER_CODENAMES = {
  // W1
  'mushG':    'Green Mushroom',
  'frogG':    'Frog',
  'beanG':    'Bored Bean',
  'slimeG':   'Slime',
  'snakeG':   'Baby Boa',
  'carrotO':  'Carrotman',
  'goblinG':  'Glublin',
  'plank':    'Wode Board',
  'frogBIG':  'Gigafrog',
  'branch':   'Walking Stick',
  'acorn':    'Nutto',
  'mushR':    'Red Mushroom',
  'mushW':    'Wood Mushroom',
  'poopSmall':'Poop',
  'ratB':     'Rat',

  // W2
  'jarSand':    'Sandy Pot',
  'mimicA':     'Mimic',
  'crabcake':   'Crabcake',
  'coconut':    'Mafioso',
  'sandcastle': 'Sand Castle',
  'pincermin':  'Pincermin',
  'potato':     'Mashed Potato',
  'steak':      'Tyson',
  'moonman':    'Moonmoon',
  'sandgiant':  'Sand Giant',
  'snailZ':     'Snelbie',
  'shovelR':    'Dig Doug',

  // W3
  'sheep':       'Sheepie',
  'flake':       'Snowflake',
  'stache':      'Sir Stache',
  'bloque':      'Bloque',
  'mamoth':      'Mamooth',
  'snowball':    'Snowman',
  'penguin':     'Penguin',
  'thermostat':  'Thermister',
  'glass':       'Quenchie',
  'snakeB':      'Cryosnake',
  'speaker':     'Bop Box',
  'eye':         'Neyeptune',
  'ram':         'Dedotated Ram',

  // W4
  'mushP':   'Purple Mushroom',
  'w4a2':    'TV',
  'w4a3':    'Donut',
  'demonP':  'Demon Genie',
  'w4b1':    'Soda Can',
  'w4b2':    'Flying Worm',
  'w4b3':    'Gelatinous Cuboid',
  'w4b4':    'Choccie',
  'w4b5':    'Biggole Wurm',
  'w4c1':    'Clammie',
  'w4c2':    'Octodar',
  'w4c3':    'Flombeige',
  'w4c4':    'Stilted Seeker',

  // W5
  'w5a1': 'Fire Spirit',  'w5a2': 'Baa Baa',      'w5a3': 'Wood Spirit',
  'w5a4': 'Mottled Mush', 'w5a5': 'Molten Mush',
  'w5b1': 'Astro',        'w5b2': 'Quester',       'w5b3': 'Magma Maker',
  'w5b4': 'Lava Slimer',  'w5b5': 'Lava Monster',  'w5b6': 'Crescent',
  'w5c1': 'Wister',       'w5c2': 'Stiltwalker',

  // W6
  'w6a1': 'Vine Whippy',  'w6a2': 'Mossy Snail',  'w6a3': 'Orange Slice',
  'w6a4': 'Mongo Worm',   'w6a5': 'W6 Monster5',
  'w6b1': 'Royal Worm',   'w6b2': 'W6 Monster7',  'w6b3': 'W6 Monster8',
  'w6b4': 'W6 Monster9',
  'w6c1': 'W6 Monster10', 'w6c2': 'W6 Monster11',
  'w6d1': 'W6 Monster12', 'w6d2': 'W6 Monster13', 'w6d3': 'W6 Monster14',
};


// ============================================================================
// DATA SOURCE DETECTION
// How AutoReview detects data source (IE, Toolbox, IdleonSaver)
// ============================================================================
const DATA_SOURCES = {
  'IE (Public Profile)':  'playerNames key present',
  'Toolbox JSON':         'charNames key present',
  'IdleonSaver':          'PlayerNames key present',
  'Fallback':             'Uses CogO key to count characters from Player_{name} entries',
};


// ============================================================================
// EQUIPMENT SLOT ORDER
// Equipment stored in EquipOrder_{i} follows this structure:
// ============================================================================
const EQUIPMENT_SLOTS = {
  // EquipOrder has sub-arrays for different equipment types
  // Sub-array 0: Worn equipment (hat, shirt, pants, shoes, pendant, ring, weapon, etc.)
  // Sub-array 1: Tools (pickaxe, hatchet, fishing rod, net, trap, etc.)
  // Sub-array 2: Foods (food slots)
};


// ============================================================================
// CONSTANTS
// ============================================================================
const GAME_CONSTANTS = {
  current_world: 7,
  max_characters: 10,
  max_vial_level: 15,
  max_index_of_vials: 75,
  max_implemented_bubble_index: 200,
  max_cooking_tables: 9,
  max_meal_count: 67,
  max_breeding_territories: 14,
  cards_max_level: 7,
  card_star_tiers: ['Unlock', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Ruby', 'Majestic'],
  arcade_max_level: 100,
  statue_count: 25,
};


// ============================================================================
// TOWER DEFENCE NAMES (W3 Worship)
// ============================================================================
const TOWER_DEFENCE_NAMES = [
  'Goblin Gorefest',    // 0 - W1
  'Wakawaka War',       // 1 - W2
  'Acorn Assault',      // 2 - W3
  'Frosty Firefight',   // 3 - W3
  'Clash of Cans',      // 4 - W4
  'Citric Conflict',    // 5 - W5
  'Breezy Battle',      // 6 - W6
];


// ============================================================================
// COMPANION IDS
// companion/companions keys
// ============================================================================
const COMPANION_NAMES = [
  'Gobo',          // 0
  'Oinkin',        // 1
  'Capital P',     // 2
  'Blobbo',        // 3
  'Nebula Neddy',  // 4
  'Eliteus',       // 5
  'Rift Ripper',   // 6
  'Nebulyte',      // 7
  'Monolith',      // 8
  'Royal Worm',    // 9
];


export {
  ACCOUNT_KEYS,
  PER_CHARACTER_KEYS,
  CLASS_IDS,
  CLASS_HIERARCHY,
  SKILL_INDICES,
  STAMP_TYPES,
  CARDSET_NAMES,
  STATUE_NAMES,
  ITEM_CODENAME_PREFIXES,
  RESOURCE_CODENAMES,
  MONSTER_CODENAMES,
  DATA_SOURCES,
  EQUIPMENT_SLOTS,
  GAME_CONSTANTS,
  TOWER_DEFENCE_NAMES,
  COMPANION_NAMES,
};
