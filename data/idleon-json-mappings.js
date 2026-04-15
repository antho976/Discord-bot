/**
 * Idleon Save Data JSON Key Mappings Reference
 * ==============================================
 *
 * Save data structure (outer object):
 *   {
 *     accountCreateTime,  // epoch ms, account creation
 *     charNames,          // array of character names (Toolbox/IE format)
 *     companion,          // companion data dict (from Toolbox)
 *     data,               // main save data dict — see ACCOUNT_KEYS / PER_CHARACTER_KEYS
 *     extraData,          // extra miscellaneous data (structure varies)
 *     guildData,          // guild-specific data
 *     lastUpdated,        // epoch ms, last save timestamp
 *     serverVars,         // server variables (see SERVER_VARS below)
 *     tournament,         // tournament data
 *   }
 *
 * All keys below exist inside `data{}` unless marked [OUTER].
 * Keys marked [NOT IN SAVE] are documented for historical/compat reasons but
 * do NOT appear in the Toolbox/IE JSON format used by this bot.
 */

// ============================================================================
// OUTER-LEVEL KEYS  (top-level of the save object, NOT inside data{})
// ============================================================================
const OUTER_KEYS = {
  'accountCreateTime': { type: 'number', desc: 'Epoch ms timestamp of account creation' },
  'charNames':         { type: 'array',  desc: 'Character names array (Toolbox/IE format). Also in data{} as CogO/playerNames depending on source' },
  'companion':         { type: 'object', desc: 'Companion data dict (Toolbox format). companion.a = owned companions, companion.l = link list' },
  'data':              { type: 'object', desc: 'Main save data dictionary — contains all ACCOUNT_KEYS and PER_CHARACTER_KEYS' },
  'extraData':         { type: 'object', desc: 'Extra save data (structure varies by source)' },
  'guildData':         { type: 'object', desc: 'Guild-specific data' },
  'lastUpdated':       { type: 'number', desc: 'Epoch ms timestamp of last save' },
  'serverVars':        { type: 'object', desc: 'Server-side variables. See SERVER_VARS section. Contains AutoLoot, ArcadeBonuses, ChipRepo, etc.' },
  'tournament':        { type: 'object', desc: 'Tournament progress data' },
};

// ============================================================================
// SERVER VARS  (serverVars at outer level — set by the game server)
// ============================================================================
const SERVER_VARS = {
  'AutoLoot':          { type: 'number', desc: '1 if AutoLoot is active for the account (NOT in data{})' },
  'ArcadeBonuses':     { type: 'array',  desc: 'Active arcade bonuses' },
  'ArcadeRotation':    { type: 'string', desc: 'Current arcade rotation identifier' },
  'ChipRepo':          { type: 'array',  desc: 'Lab chip repository (available chips per week)' },
  'GameVERSION':       { type: 'number', desc: 'Current game version number' },
  'GuildRank':         { type: 'array',  desc: 'Guild rank thresholds' },
  'HappyHours':        { type: 'array',  desc: 'Happy hour bonus windows' },
  'KillroySwap':       { type: 'number', desc: 'Killroy swap flag' },
  'EventActive':       { type: 'string', desc: 'Active event identifier' },
  'CompBatch':         { type: 'number', desc: 'Companion batch/season' },
  // Many other server-set vars (A_MineCost, A_MineHP, DivCostAfter3, etc.)
  // that affect game rates — generally not needed for scoring
};

// ============================================================================
// ACCOUNT-LEVEL KEYS  (inside data{})
// ============================================================================
const ACCOUNT_KEYS = {
  // --- General / Meta ---
  'TimeAway':          { type: 'object', desc: 'Contains GlobalTime (epoch timestamp of last save), and AFK time data' },
  'CSver':             { type: 'number', desc: 'Client/save version number' },
  'CloudsaveTimer':    { type: 'number', desc: 'Cloud save interval timer' },
  'DoOnceREAL':        { type: 'number', desc: 'One-time account trigger flag (float, used for legacy migration)' },
  'BGsel':             { type: 'number', desc: 'Selected background/theme index' },
  'BGunlocked':        { type: 'array',  desc: 'Array[50] of unlocked backgrounds (1=unlocked)' },
  'MoneyBANK':         { type: 'number', desc: 'Bank balance (usually 0 in online saves — money stored per-character)' },
  'GemsOwned':         { type: 'number', desc: 'Current gem count' },
  'GemsPacksPurchased':{ type: 'array',  desc: 'Gem pack purchase history' },
  'ServerGems':        { type: 'number', desc: 'Server-side gem balance' },
  'ServerGemsReceived':{ type: 'number', desc: 'Total gems received from server' },

  // --- Character Names / Detection ---
  // NOTE: 'playerNames' and 'PlayerNames' are NOT in data{} in Toolbox/IE format — use outer 'charNames'
  // NOTE: 'serverVars' is at the OUTER level, NOT inside data{}
  'CogO':              { type: 'array',  desc: 'Cog data (JSON-encoded list). Also used to detect character count via Player_{name} entries' },
  'CogM':              { type: 'object', desc: 'Cog modifier data' },

  // --- Inventory / Storage ---
  'ChestOrder':        { type: 'array',  desc: 'Item codenames in storage chest (paired with ChestQuantity)' },
  'ChestQuantity':     { type: 'array',  desc: 'Item quantities in storage chest (paired with ChestOrder)' },
  'InvStorageUsed':    { type: 'object', desc: 'Account-wide inventory storage usage info' },
  'ShopStock':         { type: 'array',  desc: 'Current shop stock levels across all world shops' },
  'MapBon':            { type: 'array',  desc: 'Array[327] of map-specific bonus flags' },

  // --- Cards ---
  'Cards0':            { type: 'object', desc: 'Card counts. {codename: count}. Used for kit_cards in AutoReview' },
  // Cards1: THE SLAB — list[1827] of item codenames the player has obtained at least once.
  // Includes all item types: equipment, materials, quest items, monster cards, nametags, capes, etc.
  // A codename present = item has been looted/obtained. Absence = not yet obtained.
  'Cards1':            { type: 'array',  desc: 'The Slab (Loot Slab) — list[1827] of all item codenames obtained at least once. Covers all item types: gear, mats, quest items, monster cards, etc.' },

  // --- Stamps ---
  'StampLv':           { type: 'array',  desc: 'Stamp levels. StampLv[0]=combat, [1]=skills, [2]=misc. Each is array of levels' },
  'StampLvM':          { type: 'array',  desc: 'Stamp material counts needed (mirrors StampLv structure)' },

  // --- Star Signs ---
  // StarSg: dict of unlocked/purchased star signs {signName: 1}. Key presence = sign bought.
  'StarSg':            { type: 'object', desc: 'Purchased star signs. {signName: 1} — key present = sign bought. 79 possible signs.' },
  // SSprog: list[64] of constellations, each [encoded_string, completed_flag].
  //   encoded_string: letters (a-i) = signs collected in this constellation group, '_'=separator, ''=none
  //   completed_flag: 1=all stars in constellation collected, 0=incomplete
  'SSprog':            { type: 'array',  desc: 'Star sign constellation progress (list[64]). Each: [collected_signs_str, completed_flag]. Letters=signs obtained, empty=none collected yet.' },

  // --- Forge ---
  'ForgeLV':           { type: 'array',  desc: 'Forge upgrade levels (anvil tab upgrades)' },
  'ForgeIntProg':      { type: 'array',  desc: 'Forge internal progress values per slot' },
  'ForgeItemOrder':    { type: 'array',  desc: 'Item codenames currently queued in forge slots' },
  'ForgeItemQty':      { type: 'array',  desc: 'Quantities queued per forge slot (mirrors ForgeItemOrder)' },

  // --- Statues ---
  // StuG: list[60] of statue gilding status (0=not gilded, 2=silver-gilded?, 3=fully gilded/gold).
  //   Account-wide statue gold status. Separate from per-char StatueLevels_{i} (which has levels+offerings).
  //   Indices 0-31 map to the 32 active statues; indices 32-59 are reserved/future statues (all 0).
  'StuG':              { type: 'array',  desc: 'Account-wide statue gilding status (list[60]). 3=gilded/gold, 2=silver, 0=not gilded. Indices 0-31 = active statues; 32-59 = future slots.' },

  // --- Bribes ---
  'BribeStatus':       { type: 'array',  desc: 'Bribe purchase/status array for W1 bribes' },

  // --- Gem Shop ---
  // NOTE: AutoLoot check = serverVars.AutoLoot == 1. NOT a key inside data{}
  // NOTE: BundlesReceived is NOT a key in data{}. Bundles tracked via bun_* keys below
  'GemItemsPurchased': { type: 'array',  desc: 'Array[300] of gem shop item purchase counts (index = item slot)' },
  'OptLacc':           { type: 'array',  desc: 'OptionsListAccount — massive array[400+] of misc account state. Key indices: [26]=shadowban, [29]=event daily, [33]=minigames, [71-72]=dungeon credits, [73]=flurbos, [83]=auto-loot, [88]=arena entries, [100]=spice claims, [113]=killroy weekly, [131]=PO misc, [169]=fishing islands (string), [185]=boss attempts, [311]=event shop unlocks, [325]=event spins, [329]=total bones, [330-333]=bones by type, [347]=PO streak, [357-361]=dust by type, [362]=total dust, [370]=emperor tries, [379]=smithy sets (CSV), [383]=prisma points, [384]=prisma bubbles, [388-393]=tachyon by type, [394]=total tachyon, [414]=jeweled cogs' },
  'OptL_{i}':          { type: 'array',  desc: 'Per-character optional/gem shop data' },
  'OptL2_{i}':         { type: 'array',  desc: 'Second per-character optional/gem shop data array' },

  // --- bun_* bundle purchase flags (inside data{}) ---
  // Each key = 1 if that bundle was purchased. 52 total codes (bun_a to bun_z + bon_a to bon_v).
  'bun_a':             { type: 'number', desc: 'Bundle a purchased (1=yes)' },
  'bun_b':             { type: 'number', desc: 'Bundle b purchased' },
  'bun_c':             { type: 'number', desc: 'Bundle c purchased' },
  'bun_d':             { type: 'number', desc: 'Bundle d purchased' },
  'bun_e':             { type: 'number', desc: 'Bundle e purchased' },
  'bun_f':             { type: 'number', desc: 'Bundle f purchased' },
  'bun_g':             { type: 'number', desc: 'Bundle g purchased' },
  'bun_h':             { type: 'number', desc: 'Bundle h purchased' },
  'bun_i':             { type: 'number', desc: 'AutoLoot bundle purchased (1=yes). Check serverVars.AutoLoot for active status' },
  'bun_j':             { type: 'number', desc: 'Bundle j purchased' },
  'bun_k':             { type: 'number', desc: 'Bundle k purchased' },
  'bun_l':             { type: 'number', desc: 'Bundle l purchased' },
  'bun_m':             { type: 'number', desc: 'Bundle m purchased' },
  'bun_n':             { type: 'number', desc: 'Bundle n purchased' },
  'bun_o':             { type: 'number', desc: 'Bundle o purchased' },
  'bun_p':             { type: 'number', desc: 'Bundle p purchased' },
  'bun_q':             { type: 'number', desc: 'Bundle q purchased' },
  'bun_r':             { type: 'number', desc: 'Bundle r purchased' },
  'bun_s':             { type: 'number', desc: 'Bundle s purchased' },
  'bun_t':             { type: 'number', desc: 'Bundle t purchased' },
  'bun_u':             { type: 'number', desc: 'Bundle u purchased' },
  'bun_v':             { type: 'number', desc: 'Bundle v purchased' },
  'bun_w':             { type: 'number', desc: 'Bundle w purchased' },
  'bun_x':             { type: 'number', desc: 'Bundle x purchased' },
  'bun_y':             { type: 'number', desc: 'Bundle y purchased' },
  'bun_z':             { type: 'number', desc: 'Bundle z purchased' },

  // --- bon_* / bin_* account bonus flags ---
  'bon_a':             { type: 'number', desc: 'Account bonus flag a' },
  'bon_c':             { type: 'number', desc: 'Account bonus flag c' },
  'bon_d':             { type: 'number', desc: 'Account bonus flag d' },
  'bon_e':             { type: 'number', desc: 'Account bonus flag e' },
  'bon_f':             { type: 'number', desc: 'Account bonus flag f' },
  'bon_g':             { type: 'number', desc: 'Account bonus flag g' },
  'bon_h':             { type: 'number', desc: 'Account bonus flag h' },
  'bon_i':             { type: 'number', desc: 'Account bonus flag i' },
  'bon_j':             { type: 'number', desc: 'Account bonus flag j' },
  'bon_k':             { type: 'number', desc: 'Account bonus flag k' },
  'bon_l':             { type: 'number', desc: 'Account bonus flag l' },
  'bon_m':             { type: 'number', desc: 'Account bonus flag m' },
  'bon_n':             { type: 'number', desc: 'Account bonus flag n' },
  'bon_o':             { type: 'number', desc: 'Account bonus flag o' },
  'bon_p':             { type: 'number', desc: 'Account bonus flag p' },
  'bon_q':             { type: 'number', desc: 'Account bonus flag q' },
  'bon_r':             { type: 'number', desc: 'Account bonus flag r' },
  'bon_s':             { type: 'number', desc: 'Account bonus flag s' },
  'bon_t':             { type: 'number', desc: 'Account bonus flag t' },
  'bon_u':             { type: 'number', desc: 'Account bonus flag u' },
  'bon_v':             { type: 'number', desc: 'Account bonus flag v' },
  'bin_a':             { type: 'number', desc: 'Binary state flag a' },
  'bin_b':             { type: 'number', desc: 'Binary state flag b' },
  'bin_c':             { type: 'number', desc: 'Binary state flag c' },

  // --- Tasks & Quests ---
  'TaskZZ0':           { type: 'array',  desc: 'Task amounts/progress values (current amounts per task slot)' },
  'TaskZZ1':           { type: 'array',  desc: 'Task tier completion data (tiers reached per category)' },
  'TaskZZ2':           { type: 'array',  desc: 'Quest/task completion status flags' },
  'TaskZZ3':           { type: 'array',  desc: 'Task unlock/completion booleans per task batch' },
  'TaskZZ4':           { type: 'array',  desc: 'Task count tracking' },
  'TaskZZ5':           { type: 'array',  desc: 'Task tier thresholds' },

  // --- Achievements ---
  'AchieveReg':        { type: 'array',  desc: 'Achievement completion status array (1=done per index)' },
  'SteamAchieve':      { type: 'array',  desc: 'Array[100] of Steam achievement status (-1=locked)' },
  'HintStatus':        { type: 'array',  desc: 'Tutorial hint completion status per world batch' },

  // --- Guild ---
  'Guild':             { type: 'array',  desc: 'Guild data (JSON-encoded list): bonuses, GP, members' },

  // --- Companions (in data{}) ---
  // NOTE: main companion data is at OUTER level (companion key), not here
  // companion outer key has: .a (owned) .l (link list) .d (timestamp) .e (equip)

  // --- Dungeon ---
  'DungUpg':           { type: 'array',  desc: 'Dungeon upgrade levels (JSON-encoded list). [0]=RNG items, [1]=currency, [2]=flurbo shop, [3]=upgrades' },

  // --- Upgrade Vault ---
  'UpgVault':          { type: 'array',  desc: 'Upgrade Vault levels (W1 town feature, array of levels)' },

  // --- Colosseum ---
  'FamValColosseumHighscores': { type: 'array', desc: 'Colosseum highscores per world' },
  'FamValFishingToolkitOwned': { type: 'array', desc: 'Fishing toolkit items owned (account-wide)' },
  'FamValMinigameHiscores':    { type: 'array', desc: 'Minigame highscores (account-wide)' },
  'FamValWorldSelected':       { type: 'number',desc: 'Currently selected world (account-level)' },
  'BossInfo':          { type: 'array',  desc: 'Boss highscore/kill data per world boss. Each entry: {0: kills, 1: highscore, 2: keys_used}' },

  // --- Printer ---
  'Print':             { type: 'array',  desc: '3D Printer sample data (JSON-encoded list). Indexed per character' },
  'PrinterXtra':       { type: 'array',  desc: 'Extra printer config (item filter settings per character)' },

  // --- Bundles Received ---
  'BundlesReceived':   { type: 'object', desc: 'Bundles/packages received (JSON-encoded dict). Keys: bun_* (bundle IDs) and bon_* (account bonus flags); value=1 if received/active' },

  // --- Weekly Boss ---
  'WeeklyBoss':        { type: 'object', desc: 'Weekly boss completion/rewards data' },

  // ============================================================================
  // WORLD 1 — Blunder Hills
  // ============================================================================

  // --- Anvil (Smithing) ---
  'AnvilCraftStatus':  { type: 'array',  desc: 'Array[7] of arrays — anvil tab unlock status per character' },
  'AnvilPA_{i}':       { type: 'array',  desc: 'Per-character anvil production data. [slot]{0,1,2=prog,3=coins,le=length}' },
  'AnvilPAselect_{i}': { type: 'array',  desc: 'Per-character anvil selected items [production_slot, crafting_slot, tab]' },
  'AnvilPAstats_{i}':  { type: 'array',  desc: 'Per-character anvil stats [speed, capacity, xp, multi_prod, ...]' },

  // --- Owl ---
  // Owl data stored in serverVars (A_MineCost, A_MineHP, A_ResXP etc.)

  // --- Minigames ---
  // Basketball and Darts stored in serverVars

  // ============================================================================
  // WORLD 2 — Yum-Yum Desert
  // ============================================================================

  // --- Alchemy ---
  'CauldronInfo':      { type: 'array',  desc: 'Cauldron info (multi-dim array). [0]=orange bubbles, [1]=green bubbles, [2]=purple bubbles, [3]=yellow bubbles, [4]=vials, [5]=color data, [6]=liquid amounts, [8]=cauldron rate caps. Each cauldron: [bubbleIdx][0]=level, [1]=xp' },
  'CauldUpgLVs':       { type: 'array',  desc: 'Cauldron upgrade levels (brew speed, new bubble chance, etc.) per cauldron' },
  'CauldUpgXPs':       { type: 'array',  desc: 'Cauldron upgrade XP values (JSON-encoded, 32 values)' },
  'CauldronBubbles':   { type: 'array',  desc: 'Big bubble selections per character (JSON-encoded, 3 per char)' },
  'CauldronJobs0':     { type: 'array',  desc: 'Alchemy job assignments per character (preset 0)' },
  'CauldronJobs1':     { type: 'array',  desc: 'Alchemy job assignments per character (preset 1)' },
  'CauldronP2W':       { type: 'array',  desc: 'Alchemy P2W/liquid shop purchase data (JSON-encoded list)' },

  // --- Arcade ---
  'ArcadeUpg':         { type: 'array',  desc: 'Arcade upgrade levels (JSON-encoded list, max_level=100)' },
  'ArcUnclaim':        { type: 'object', desc: 'Arcade unclaimed progress/balls dict (may be empty)' },

  // --- Keychains ---
  'EquipmentKeychain0-24': { type: 'string', desc: 'Keychain items (25 slots). Each EquipmentKeychain{0-24} = item codename or "Blank". Tiers T1/T2/T3 encoded in codename (e.g. KeychainT3_0)' },

  // --- Sigils ---
  // Parsed from CauldronInfo (sub-section)

  // --- Obols ---
  'ObolEqO0_{i}':      { type: 'array',  desc: 'Per-character equipped obols (i = char index 0-9)' },
  'ObolEqO1':          { type: 'array',  desc: 'Family obols equipment slot 1' },
  'ObolEqO2':          { type: 'array',  desc: 'Family obols equipment slot 2 (3rd slot set)' },
  'ObolEqMAPz1':       { type: 'object', desc: 'Family obol upgrades slot 1' },
  'ObolEqMAPz2':       { type: 'object', desc: 'Family obol upgrades slot 2 (may be empty)' },
  'ObolEqMAP_{i}':     { type: 'object', desc: 'Per-character obol upgrades (i = char index)' },
  'ObolInvOr':         { type: 'array',  desc: 'Obol inventory order (item codenames)' },
  'ObolInvOwn':        { type: 'array',  desc: 'Obol inventory ownership/count data' },
  'ObolInvMAP_0':      { type: 'object', desc: 'Obol inventory upgrade map slot 0' },
  'ObolInvMAP_1':      { type: 'object', desc: 'Obol inventory upgrade map slot 1' },
  'ObolInvMAP_2':      { type: 'object', desc: 'Obol inventory upgrade map slot 2' },
  'ObolInvMAP_3':      { type: 'object', desc: 'Obol inventory upgrade map slot 3' },

  // --- Post Office ---
  'PostOfficeInfo0':   { type: 'array',  desc: 'Post office box data array 0. Each entry: {0: codename, 1: qty, 2: flag}' },
  'PostOfficeInfo1':   { type: 'array',  desc: 'Post office box data array 1' },
  'PostOfficeInfo2':   { type: 'array',  desc: 'Post office box data array 2' },

  // --- Ballot / Islands / Killroy ---
  // Parsed from serverVars

  // --- Killroy ---
  'KRbest':            { type: 'object', desc: 'Killroy best scores per mob. {mobCodename: bestWave}' },

  // ============================================================================
  // WORLD 3 — Frostbite Tundra
  // ============================================================================

  // --- Refinery ---
  'Refinery':          { type: 'array',  desc: 'Refinery data (JSON-encoded list). [3..11] = salt entries: [n][0]=charge/cycles, [n][1]=rank level. Offset +3 from display index' },

  // --- Construction / Buildings ---
  // Tower: list[93] — [0-26]=building levels (27 buildings), [27-53]=secondary/preset-2 levels (duplicate set),
  //   [54-61]=8 misc small ints (shrine-related), [62-92]=31 building EXP/progress floats
  'Tower':             { type: 'array',  desc: 'Construction building data (JSON-encoded list[93]). [0-26]=building levels, [27-53]=secondary set, [54-61]=shrine misc, [62-92]=building EXP values' },

  // --- Research (W3 bonus) ---
  'Research':          { type: 'array',  desc: 'W3 research/library progress. Array[14] of progress arrays' },

  // --- Equinox ---
  'Dream':             { type: 'array',  desc: 'Equinox data. [0]=bar fill progress, [1]=unknown, [2+]=upgrade levels per bonus. Each index ≥ 2: value = upgrade level for that equinox bonus' },

  // --- Shrines ---
  'Shrine':            { type: 'array',  desc: 'Shrine levels, map placements, and data (JSON-encoded list)' },

  // --- Worship / Totems ---
  // ⚠️  IMPORTANT: Tower Defense data is stored in TotemInfo, NOT in 'TowerDef' or 'TD' (those keys do NOT exist).
  'TotemInfo':         { type: 'array',  desc: 'Worship totem data (JSON-encoded, 3 sub-arrays). [0]=max waves reached per totem, [1]=current waves per totem, [2]=worship EXP per totem. 9 totems total (W1-W7 + extras).' },

  // --- Atom Collider ---
  'Atoms':             { type: 'array',  desc: 'Atom levels and collider data' },

  // --- Prayers ---
  'PrayOwned':         { type: 'array',  desc: 'Prayer levels owned (JSON-encoded list)' },

  // --- Salt Lick ---
  'SaltLick':          { type: 'array',  desc: 'Salt Lick upgrade levels (JSON-encoded list)' },

  // --- Equipment Sets ---
  // Parsed from character equipment data

  // --- Deathnote ---
  // Parsed from character KLA_{i} data

  // ============================================================================
  // WORLD 4 — Hyperion Nebula
  // ============================================================================

  // --- Cooking ---
  'Cooking':           { type: 'array',  desc: 'Kitchen table data (JSON-encoded list: speed, fire, luck progress per table)' },
  'Meals':             { type: 'array',  desc: 'Meal levels and quantities (JSON-encoded list, max 67 meals)' },
  'Ribbon':            { type: 'array',  desc: 'Cooking ribbon/spice data' },

  // --- Lab ---
  'Lab':               { type: 'array',  desc: 'Lab data (JSON-encoded list): chips per player, bonus connections, jewel slots' },

  // --- Rift ---
  'Rift':              { type: 'array',  desc: 'Rift data. [0]=current rift index/reward tier, [1]=rift progress value' },

  // --- Breeding ---
  'Breeding':          { type: 'array',  desc: 'Breeding nest data (JSON-encoded list): eggs, territories, pets, upgrades' },
  'Territory':         { type: 'array',  desc: 'Territory foraging/spice progress (JSON-encoded list)' },
  'Pets':              { type: 'array',  desc: 'Pet collection data (JSON-encoded list)' },
  'PetsStored':        { type: 'array',  desc: 'Stored pets data. Each entry: [mobCodename, tier, power, flag]' },
  'Jars':              { type: 'array',  desc: 'W6 Caverns jar data. Array[120], each jar: [type, size, value, bonus, multiplier]' },

  // ============================================================================
  // WORLD 5 — Smolderin' Plateau
  // ============================================================================

  // --- Sailing ---
  'Sailing':           { type: 'array',  desc: 'Sailing progress (JSON-encoded list): artifacts, loot pile, island data' },
  'Boats':             { type: 'array',  desc: 'Boat data (JSON-encoded list): levels, speeds, loot values' },
  'Captains':          { type: 'array',  desc: 'Captain data (JSON-encoded list): levels, buffs, assignments' },
  'SailChests':        { type: 'array',  desc: 'Sailing chest contents. Array[29], each: [value, qty, ...]' },
  // FlagP: list[24] — map indices where sailing flags are placed ([0]=111, [1]=112, [2]=110, [3]=113...). -1=inactive/unused.
  'FlagP':             { type: 'array',  desc: 'Sailing flag placements (list[24]). Each value = map index where flag is placed; -1 = no flag there' },
  // FlagU: list[252] — flag upgrade slots. -11 = not unlocked/default state.
  'FlagU':             { type: 'array',  desc: 'Sailing flag upgrade slots (list[252]). -11 = not unlocked; other values = upgrade level' },

  // --- Divinity ---
  'Divinity':          { type: 'array',  desc: 'Divinity god unlocks, points, links per character. [38]=unlinks count' },

  // --- Gaming ---
  'Gaming':            { type: 'array',  desc: 'Gaming superbits, imports, settings. [13]=SnailMail setting' },
  'GamingSprout':      { type: 'array',  desc: 'Gaming sprout/garden data (JSON-encoded list)' },

  // --- Sneaking ---
  'Ninja':             { type: 'array',  desc: 'Sneaking/ninja data (JSON-encoded list): charms, floors, twins. [105]=miniboss kill count. [39+]=event shop items' },

  // --- Farming ---
  'FarmCrop':          { type: 'object', desc: 'W5 farming crop data. {cropIndex: [level, mastery, ...]}' },
  'FarmPlot':          { type: 'array',  desc: 'Farming land plot data (JSON-encoded list). Each plot: [cropType, timeLeft, seedType, flag, bonusType, bonusVal, value]' },
  'FarmRank':          { type: 'array',  desc: 'Farm crop ranks/mastery levels. Array[3] of rank arrays per plot batch' },
  'FarmUpg':           { type: 'array',  desc: 'Farming upgrade levels. Array[100]' },

  // --- Summoning ---
  // Summon: list[5] sub-arrays:
  //   [0]=list[82]  familiar stats/levels (starts high, e.g. 889, 378, 0, 340...)
  //   [1]=list[112] familiar/mob codenames ('Pet1','Pet2','Pet3','Pet0','Pet4','mushG'...)
  //   [2]=list[9]   essence qty per color (large floats = accumulated W5 summoning essence)
  //   [3]=list[9]   battle progress per arena (3, 5181336..., 6, 3, 0... — waves/score per arena)
  //   [4]=list[14]  unlock flags (1=unlocked, 0=locked)
  'Summon':            { type: 'array',  desc: 'W5 Summoning data (JSON-encoded list[5]). [0]=familiar stats[82], [1]=codenames[112], [2]=essence per color[9], [3]=battle progress per arena[9], [4]=unlock flags[14]' },

  // ============================================================================
  // WORLD 6 — Spirited Valley / Caverns
  // ============================================================================

  // Holes: list[29] sub-arrays (Caverns/W6 underground systems):
  //   [0]=list[12]  villager levels (max 20 each)
  //   [1]=list[8]   villager XP (current XP values)
  //   [2]=list[12]  villager cumulative EXP (large floats)
  //   [3]=list[12]  villager max levels (all 20)
  //   [4]=list[9]   schematic/building levels
  //   [5]=list[12]  The Well sub-system data
  //   [6]=list[12]  Motherlode data
  //   [7]=list[30]  Bell/Monument data
  //   [8]=list[10]  Harp data
  //   [9]=list[30]  Lamp data (large floats = lamp currency accumulated)
  //   [10]=list[60] Den data
  //   [11]=list[100] Grotto/misc data
  //   [12]=list[8]  Evertree data
  //   [13]=list[150] Gambit completion flags (1=done, 0=not done)
  //   [14]=list[12] Temple/Hive data
  //   [15-28]: additional Cavern sub-systems (biome, region data, etc.)
  'Holes':             { type: 'array',  desc: 'Caverns data (JSON-encoded list[29]). [0-3]=villager levels/XP/EXP/maxLevel, [4]=schematics, [5]=The Well, [6]=Motherlode, [7]=Bell, [8]=Harp, [9]=Lamp, [10]=Den, [11]=Grotto, [12]=Evertree, [13]=Gambit flags, [14]=Temple, [15-28]=misc sub-systems' },
  'CYNPC':             { type: 'array',  desc: 'Cavern NPC data (list, NOT dict — actual type is array)' },
  'CYDeliveryBoxComplete': { type: 'number', desc: 'Cavern delivery box completions (integer count, NOT dict)' },
  'CYDeliveryBoxMisc':     { type: 'number', desc: 'Cavern delivery box misc value (float, NOT dict)' },
  'CYDeliveryBoxStreak':   { type: 'number', desc: 'Cavern delivery box streak (integer count, NOT dict)' },
  'CYAFKdoubles':      { type: 'number', desc: 'Cavern AFK doubles count' },
  'CYAnvilTabsOwned':  { type: 'number', desc: 'Cavern anvil tabs owned count' },
  'CYCharSlotsMTX':    { type: 'number', desc: 'Extra character slots purchased via MTX' },
  'CYColosseumTickets':{ type: 'number', desc: 'Current colosseum ticket count' },
  'CYGems':            { type: 'number', desc: 'Cavern-specific gem count' },
  'CYGoldPens':        { type: 'number', desc: 'Gold pen count (for talent books)' },
  'CYKeysAll':         { type: 'array',  desc: 'All boss key counts [W1key, W2key, W3key, W4key, W5key]' },
  'CYObolFragments':   { type: 'number', desc: 'Obol fragment count' },
  'CYSilverPens':      { type: 'number', desc: 'Silver pen count' },
  'CYTalentPoints':    { type: 'array',  desc: 'Unspent talent points per class tier' },
  'CYWorldTeleports':  { type: 'number', desc: 'World teleport charges remaining' },
  // Bubba: list[6] sub-arrays (W6 Bees/Hive system):
  //   [0]=list[20]  timestamps + bee data (mix of epoch-ms and float values)
  //   [1]=list[28]  bee/hive levels (413, 108, 392, 11, 210...)
  //   [2]=list[28]  bee upgrade progress (all 0 = not upgraded)
  //   [3]=list[6]   queen/special bee data (120, 0, 0, 0, 0, 0)
  //   [4]=list[8]   hive activity flags (all 0)
  //   [5]=list[5]   hive misc data (all 0)
  'Bubba':             { type: 'array',  desc: 'W6 Bees/Hive data (list[6]). [0]=timestamps+bee data[20], [1]=bee levels[28], [2]=upgrade progress[28], [3]=queen data[6], [4]=activity flags[8], [5]=misc[5]' },

  // ============================================================================
  // WORLD 7 — Shimmerfin Deep
  // ============================================================================

  // Spelunk: list[47] sub-arrays (W8 Sneaking system):
  //   [0]=list[15]  area unlock flags (1=unlocked)
  //   [1]=list[15]  sneaking/catch levels per area
  //   [2]=list[15]  stealth XP per area (large floats as strings or ints)
  //   [3]=list[12]  mastery levels per area
  //   [4]=list[30]  misc data (first=huge float, then small ints)
  //   [5]=list[90]  fish/resource data points (values 50-600 range)
  //   [6]=list[69]  item codenames caught ('Smol_Pebbles','Smooth_Rocks','Big_Stone'...)
  //   [7]=list[5]   stealth scoring/small values (0-10)
  //   [8]=list[60]  area progression data
  //   [9]=list[37]  misc progress values
  //   [10]=list[13] active area indices (36,35,34,33,-1... — -1=inactive)
  //   [11]=list[10] misc ints (212,161,124,97,88...)
  //   [12]=list[6]  completion flags (1/0)
  //   [13]=list[6]  counts/levels
  //   [14]=list[63] detailed progression (2,1,0,0...)
  //   [15]=list[12] reserved/new data (all 0)
  //   [16]=list[70] equipment/item slot indices
  //   [17]=list[70] secondary slot data
  //   [18]=list[50] tier/rank data
  //   [19-43]=list[20] each: item placement slots (-1=empty), map/location data
  //   [44]=list[15] upgrade levels (3,2,0...)
  //   [45]=list[15] secondary upgrade levels (90,5,105...)
  //   [46]=list[78] equipment codenames ('EquipmentHats38','EquipmentHats118'...)
  'Spelunk':           { type: 'array',  desc: 'W7 Spelunking data (list[47]). [0]=area unlocks, [1]=levels, [2]=XP, [3]=mastery, [4]=misc ([4][3]=exalted fragment count), [5]=resource data[90], [6]=item codenames[69], [7]=scores, [8-9]=progression, [10]=active areas, [14]=detailed prog, [16-17]=equip slots[70], [18]=legend talents, [19-43]=placement lists[20], [44-45]=upgrades, [46]=hat rack item codenames[78]' },
  // Arcane: list[100] of integers (W8/Arcade spell node system):
  //   [0-56]:  active node values (range 1-507): spell slot counts or levels
  //   [57-99]: all zeros = unused/locked nodes
  //   Pattern: every ~7 entries a value=1 appears, possibly marking tier boundaries
  'Arcane':            { type: 'array',  desc: 'Arcane node/spell system (list[100] ints). [0-56]=active node levels (1-507), [57-99]=unused/locked. Value=1 at tier boundaries. Likely W8 spell upgrade counts.' },
  'Tess':              { type: 'array',  desc: 'Tesseract data (W7 Master Class Wind Walker). Array of unlocked/active tesseract entries' },
  // Sushi: list[8] sub-arrays (W7 Restaurant system):
  //   [0]=list[120] ingredient slot items (-1=empty slot, otherwise item index)
  //   [1]=list[120] ingredient slot quantities (-1=empty)
  //   [2]=list[50]  recipe/dish data (11,154,78,1,0...)
  //   [3]=list[15]  table/station states (-1=locked, 0=unlocked)
  //   [4]=list[20]  revenue/timing data (floats + timestamps)
  //   [5]=list[100] unlock flags (0=locked)
  //   [6]=list[100] multiplier values (1.627...,1.377... — dish multipliers)
  //   [7]=list[100] tier/rank values (5,4,3,2,1... — dish tiers)
  'Sushi':             { type: 'array',  desc: 'W7 Restaurant data (list[8]). [0]=ingredient slots[120](-1=empty), [1]=ingredient qtys[120], [2]=recipe data[50], [3]=table states[15](-1=locked), [4]=revenue/timing[20], [5]=unlock flags[100], [6]=multipliers[100], [7]=tier ranks[100]' },
  // BugInfo: list[3] sub-arrays (Bug/Critter catching system):
  //   [0]=list[15]  plot catch cooldowns (0=ready, -10=empty/no critter, -0.05=partial)
  //   [1]=list[15]  critter quantity totals (0=none, large floats=caught amounts)
  //   [2]=list[15]  plot unlock states (0=locked, -10=active/unlocked)
  'BugInfo':           { type: 'array',  desc: 'Critter catching data (list[3]). [0]=catch cooldowns[15](0=ready,-10=empty), [1]=critter qty totals[15], [2]=plot unlock states[15](0=locked,-10=active)' },

  // --- Coral Reef / Legend Talents ---
  // Parsed from serverVars

  // ============================================================================
  // MASTER CLASS / W7+ SYSTEMS
  // ============================================================================

  'Grimoire':          { type: 'array',  desc: 'Death Bringer Grimoire upgrade data' },
  'Compass':           { type: 'array',  desc: 'Wind Walker Compass data (JSON-encoded list)' },
  // Tesseract: stored in 'Tess' key above

  // ============================================================================
  // MISC ACCOUNT DATA
  // ============================================================================

  'AchieveReg':        { type: 'array',  desc: 'Achievement completion status array (JSON-encoded). 1=done per index' },
  'SteamAchieve':      { type: 'array',  desc: 'Steam achievement status array[100]. -1=locked' },
  'HintStatus':        { type: 'array',  desc: 'Tutorial/hint completion status per world batch' },
  'Guild':             { type: 'array',  desc: 'Guild data (JSON-encoded list): bonuses, GP, members' },
  'WeeklyBoss':        { type: 'object', desc: 'Weekly boss completion/rewards data' },
  'CMm':               { type: 'object', desc: 'Chat/crafting memory dict. {slotIndex: data} — tracks misc crafting state' },
  'CMmLENGTH':         { type: 'number', desc: 'Length of CMm dict' },

  // --- Printer ---
  'Print':             { type: 'array',  desc: '3D Printer sample data (JSON-encoded list). Indexed per character' },
  'PrinterXtra':       { type: 'array',  desc: 'Extra printer config (item filter settings)' },

  // --- Owl (W1) ---
  // Uses serverVars for owl data (A_MineCost, A_MineHP, A_ResXP)

  // --- Minigames (W1) ---
  // Basketball and Darts upgrades stored in serverVars

};


// ============================================================================
// PER-CHARACTER KEYS  (inside data{}, suffix _{i} where i = character index 0-11)
// ============================================================================
const PER_CHARACTER_KEYS = {
  // --- Class & Level ---
  'CharacterClass_{i}':    { type: 'number', desc: 'Class ID number. See CLASS_IDS map below' },
  'CurrentMap_{i}':        { type: 'number', desc: 'Current map index the character is on' },
  'Lv0_{i}':               { type: 'array',  desc: 'Skill levels array. Index 0=Combat, then skills per SKILL_INDICES order' },
  'Exp0_{i}':              { type: 'array',  desc: 'Current XP per skill (mirrors Lv0 order)' },
  'ExpReq0_{i}':           { type: 'array',  desc: 'XP required for next level per skill (mirrors Lv0 order)' },

  // --- Talents ---
  'SL_{i}':                { type: 'object', desc: 'Current preset talent levels {talentId: level} (JSON-encoded)' },
  'SLpre_{i}':             { type: 'object', desc: 'Secondary preset talent levels (JSON-encoded)' },
  'SM_{i}':                { type: 'object', desc: 'Max talent levels from star talent books {talentId: maxLevel} (JSON-encoded)' },
  'AttackLoadout_{i}':     { type: 'array',  desc: 'Current preset talent bar loadout (JSON-encoded list)' },
  'AttackLoadoutpre_{i}':  { type: 'array',  desc: 'Secondary preset talent bar loadout (JSON-encoded list)' },

  // --- Stats ---
  'PVStatList_{i}':        { type: 'array',  desc: 'Main stat allocation [STR, AGI, WIS, LUK]' },
  'PlayerStuff_{i}':       { type: 'array',  desc: 'General character stats. [0]=worship charge, [1]=HP level?, [2]=card preset index. Array[10] (JSON-encoded)' },
  'PVGender_{i}':          { type: 'number', desc: 'Character gender (0=male, 1=female)' },

  // --- Money ---
  'Money_{i}':             { type: 'number', desc: 'Character wallet (coins on person)' },

  // --- AFK ---
  // AFKtarget: string map code like 'w7b4' (world + zone + monster slot), NOT a numeric index
  'AFKtarget_{i}':         { type: 'string', desc: 'AFK target as map code string (e.g. "w7b4" = world 7, zone b, slot 4). NOT a number.' },
  'PTimeAway_{i}':         { type: 'number', desc: 'Per-character time since last played (epoch float)' },
  'RespTime_{i}':          { type: 'number', desc: 'Respawn time for character' },
  'CharSAVED_{i}':         { type: 'number', desc: 'Character save flag (1=saved)' },

  // --- Inventory ---
  'InventoryOrder_{i}':    { type: 'array',  desc: 'Item codenames in character inventory' },
  'ItemQTY_{i}':           { type: 'array',  desc: 'Item quantities in character inventory (mirrors InventoryOrder)' },
  'InvBagsUsed_{i}':       { type: 'object', desc: 'Inventory bag capacities/usage dict (JSON-encoded)' },
  'LockedSlots_{i}':       { type: 'array',  desc: 'Locked inventory slot indices' },
  'MaxCarryCap_{i}':       { type: 'object', desc: 'Max carry capacities by item codename (JSON-encoded dict)' },
  'IMm_{i}':               { type: 'object', desc: 'Inventory material map {codename: qty} (JSON-encoded dict)' },
  'IMmLENGTH_{i}':         { type: 'number', desc: 'Length of IMm dict for character i' },

  // --- Equipment ---
  'EquipOrder_{i}':        { type: 'array',  desc: 'Equipped item codenames. Sub-arrays: [0]=worn, [1]=tools, [2]=food' },
  'EquipQTY_{i}':          { type: 'array',  desc: 'Equipped item quantities (mirrors EquipOrder)' },
  'EMm0_{i}':              { type: 'object', desc: 'Equipment material map slot 0 (worn gear) {codename: qty} (JSON-encoded)' },
  'EMm1_{i}':              { type: 'object', desc: 'Equipment material map slot 1 (tools) {codename: qty} (JSON-encoded)' },
  'EMmLENGTH0_{i}':        { type: 'number', desc: 'Length of EMm0 dict for character i' },
  'EMmLENGTH1_{i}':        { type: 'number', desc: 'Length of EMm1 dict for character i' },

  // --- Food ---
  'FoodCD_{i}':            { type: 'array',  desc: 'Food cooldown timers per food slot' },
  'FoodSlO_{i}':           { type: 'number', desc: 'Food slot offset (starting slot index)' },

  // --- Combat ---
  'AtkCD_{i}':             { type: 'object', desc: 'Attack cooldown timers {abilityId: cdRemaining} (JSON-encoded)' },
  'BuffsActive_{i}':       { type: 'array',  desc: 'Active buffs/effects currently applied to character' },
  'PVInstaRevives_{i}':    { type: 'number', desc: 'Insta-revive charges available (variant 1)' },
  'PV_InstaRevives_{i}':   { type: 'number', desc: 'Insta-revive charges available (variant 2 — duplicate key)' },

  // --- Cards ---
  'CardEquip_{i}':         { type: 'array',  desc: 'Equipped card codenames. "B" = empty slot' },
  'CSetEq_{i}':            { type: 'object', desc: 'Equipped card set (JSON-encoded). Key = set identifier' },
  'CardPreset_{i}':        { type: 'array',  desc: 'Saved card presets for character (JSON-encoded list)' },

  // --- Star Signs ---
  'PVtStarSign_{i}':       { type: 'string', desc: 'Equipped star sign IDs, comma-separated, trailing comma. "_" = empty' },

  // --- Prayers ---
  'Prayers_{i}':           { type: 'array',  desc: 'Equipped prayer indices (JSON-encoded list). -1 = empty slot' },

  // --- Post Office ---
  'POu_{i}':               { type: 'array',  desc: 'Post Office box upgrade levels [36 values] (JSON-encoded list)' },

  // --- Obols ---
  'ObolEqO0_{i}':          { type: 'array',  desc: 'Equipped obols for character (indexed slots)' },
  'ObolEqMAP_{i}':         { type: 'object', desc: 'Obol upgrades for character (JSON-encoded dict)' },
  'ObolInvMAP_{i}':        { type: 'object', desc: 'Inventory obol stat map (JSON-encoded dict). Like ObolEqMAP but for unequipped obols in inventory' },

  // --- Quests ---
  'QuestComplete_{i}':     { type: 'object', desc: 'Completed quests {questId: 1} (JSON-encoded dict)' },
  'QuestStatus_{i}':       { type: 'object', desc: 'In-progress quest status {questId: progress} (JSON-encoded dict)' },
  'QuestHm_{i}':           { type: 'array',  desc: 'Quest HM (hard mode?) data — usually empty array' },
  'NPCdialogue_{i}':       { type: 'object', desc: 'NPC dialogue progress tracker {npcId: dialogueStep} (JSON-encoded dict)' },

  // --- Kill List / Deathnote ---
  'KLA_{i}':               { type: 'array',  desc: 'Kill list (JSON-encoded): monsters killed per map. Used for deathnote skull tiers' },

  // --- Fishing ---
  'PVFishingSpotIndex_{i}':{ type: 'number', desc: 'Current fishing spot index' },
  'PVFishingToolkit_{i}':  { type: 'array',  desc: 'Fishing toolkit items equipped (rod, net, etc.)' },

  // --- Trapping ---
  'PldTraps_{i}':          { type: 'array',  desc: 'Placed traps per character (JSON-encoded). Each trap: [critter, qty, progress, codename, flag, type, duration, mapId]' },

  // --- Statues ---
  'StatueLevels_{i}':      { type: 'array',  desc: 'Per-character statue levels and offering amounts (JSON-encoded). [statue][0]=level, [statue][1]=offeringQty' },

  // --- Minigame ---
  'PVMinigamePlays_{i}':   { type: 'number', desc: 'Minigame plays count for character' },

  // --- Misc Per-Char ---
  'OptL_{i}':              { type: 'array',  desc: 'Optional/gem shop per-character data array 1' },
  'OptL2_{i}':             { type: 'array',  desc: 'Optional/gem shop per-character data array 2' },
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
  'Infinilyte':        { base: 'Journeyman',  sub: 'Maestro', elite: 'Voidwalker',        master: 'Infinilyte' },

  // Warrior — Royal Guardian (master class, Squire branch)
  'Royal Guardian':    { base: 'Warrior',     sub: 'Squire',  elite: 'Divine Knight',     master: 'Royal Guardian' },
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
// StuG key = account-wide statue GILDING status (0=not gilded, 2=silver, 3=gold). NOT the level.
// Per-character statue LEVELS are in StatueLevels_{i} (each entry: [level, offeringQty]).
// 32 active statues (indices 0-31); indices 32-59 reserved. Index maps to statue name:
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
  current_world:                7,   // W7 Shimmerfin Deep
  max_characters:               12,  // up to 12 character slots (CYCharSlotsMTX can extend)
  max_vial_level:               15,
  max_index_of_vials:           75,
  max_implemented_bubble_index: 200,
  max_cooking_tables:           9,
  max_meal_count:               67,
  max_breeding_territories:     14,
  cards_max_level:              7,
  card_star_tiers: ['Unlock', 'Bronze', 'Silver', 'Gold', 'Platinum', 'Ruby', 'Majestic'],
  arcade_max_level:             100,
  statue_count:                 25,
  post_office_boxes:            36,
  farming_plots:                36,
  farming_upgrades:             100,
  gem_shop_slots:               300,
  stamp_types:                  3,   // 0=combat, 1=skills, 2=misc
  worship_totems:               9,
  cavern_sub_systems:           29,  // Holes key has 29 sub-arrays
  max_atoms:                    20,
  max_prayers:                  12,
  max_salt_lick_upgrades:       10,
  max_shrines:                  14,
  max_divinity_gods:            12,
  max_summoning_familiars:      82,
  max_summoning_arenas:         9,
  bees_hive_sub_arrays:         6,   // Bubba key has 6 sub-arrays
  restaurant_sub_arrays:        8,   // Sushi key has 8 sub-arrays
};


// ============================================================================
// WORSHIP TOTEM / TOWER DEFENCE NAMES
// Data stored in TotemInfo key (3 sub-arrays: max waves, current waves, worship EXP)
// ⚠️  The keys 'TowerDef' and 'TD' do NOT exist in the save — use TotemInfo instead.
// TotemInfo[0][i] = max waves reached on totem i
// TotemInfo[1][i] = current waves on totem i
// TotemInfo[2][i] = worship EXP accumulated on totem i
// ============================================================================
const TOWER_DEFENCE_NAMES = [
  'Goblin Gorefest',    // 0 - W1
  'Wakawaka War',       // 1 - W2
  'Acorn Assault',      // 2 - W3 (first)
  'Frosty Firefight',   // 3 - W3 (second)
  'Clash of Cans',      // 4 - W4
  'Citric Conflict',    // 5 - W5
  'Breezy Battle',      // 6 - W6
  'Shimmerfin Skirmish',// 7 - W7 (tentative name)
  'Unknown Totem 8',    // 8 - index 8 exists in save, not yet named
];

// ============================================================================
// KEYS NOT FOUND IN SAVE (documented for compat / historical reference)
// These keys were believed to exist but are NOT present in Toolbox/IE JSON saves:
// ============================================================================
// - 'TowerDef'        → use TotemInfo[0] for Tower Defense wave data
// - 'TD'              → same as above, does NOT exist
// - 'AutoLoot'        → use serverVars.AutoLoot (outer level)
// - 'BundlesReceived' → use bun_* keys in data{} instead
// - 'serverVars'      → this is at OUTER level, not inside data{}
// - 'parsedData'      → not present in Toolbox/IE format
// - 'playerNames'     → outer level only (IE format)
// - 'PlayerNames'     → IdleonSaver-only format, not seen in current saves

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
  OUTER_KEYS,
  SERVER_VARS,
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
