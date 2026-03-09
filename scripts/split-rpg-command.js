/**
 * Script to split RPGCommand.js into domain-specific handler files
 * using the mixin/Object.assign prototype pattern.
 *
 * Usage: node scripts/split-rpg-command.js
 */
import fs from 'fs';
import path from 'path';

const SRC = path.resolve('Discord bot - test branch/rpg/commands/RPGCommand.js');
const OUT_DIR = path.resolve('Discord bot - test branch/rpg/commands');

const lines = fs.readFileSync(SRC, 'utf-8').split('\n');
console.log(`Read ${lines.length} lines from RPGCommand.js`);

// ========== STEP 1: Detect all method boundaries ==========
// Methods are at 2-space indent: "  async methodName(...) {" or "  get propName() {"
const methodBounds = [];
const methodStartRe = /^  (async )?(?:get |set )?(\w+)\s*\(/;

for (let i = 0; i < lines.length; i++) {
  const m = lines[i].match(methodStartRe);
  if (m && !lines[i].trim().startsWith('//') && !lines[i].trim().startsWith('*')) {
    methodBounds.push({ name: m[2], startLine: i }); // 0-based
  }
}

// Set endLine for each method (line before the next method starts, or end of class)
for (let i = 0; i < methodBounds.length; i++) {
  if (i + 1 < methodBounds.length) {
    // End is the line before next method, but skip blank lines
    let end = methodBounds[i + 1].startLine - 1;
    while (end > methodBounds[i].startLine && lines[end].trim() === '') end--;
    methodBounds[i].endLine = end;
  } else {
    // Last method - ends at closing "}" of the class (line before it)
    let end = lines.length - 1;
    // Find the class closing brace
    for (let j = lines.length - 1; j >= methodBounds[i].startLine; j--) {
      if (lines[j].trim() === '}') {
        end = j - 1; // line before class closing brace
        while (end > methodBounds[i].startLine && lines[end].trim() === '') end--;
        break;
      }
    }
    methodBounds[i].endLine = end;
  }
}

console.log(`Found ${methodBounds.length} methods`);

// ========== STEP 2: Define domain groups ==========
const groups = {
  'rpg-combat-handlers': [
    'handleDungeons', 'handleCombatTraining', 'startTrainingCombat',
    'handleCombatNextTurn', 'handleCombatSkillMenu', 'handleCombatRefresh',
    'handleCombatSkillSelect', 'handleCombatGearSet', 'handleCombatGearSelect',
    'handleCombatSwitchMenu', 'handleCombatStanceMenu', 'handleCombatSwitchSelect',
    'handleCombatStanceSelect', 'handleCombatForfeit', 'handleCombatResolution',
    'handleCombatManual', 'displayCombatUI', 'handleCombatActionAttack',
    'handleCombatActionDefend', 'handleCombatAuto', 'handleCombatMenu',
    'handleQuickBattle', 'handlePartyBattle',
    'handleBossCombat', 'startBossFight', 'handleGroupCombat', 'startGroupFight',
    'handleNormalDungeonStart', 'handleBossDungeonStart', 'startDungeonBossFight',
    'handleCombatLog', 'handleBossGuide', 'handleEnemySummary', 'handleComboPreview',
    'handleEquipmentComparison', 'handleDamageCalculator',
    'handleComboVisualizer', 'handleCombatStylesRecommendation',
    'handleCriticalHitDisplay', 'handleDamageBreakdown',
  ],
  'rpg-inventory-handlers': [
    'handleInventory', 'handleInventoryFilter', 'handleInventoryFilterByRarity',
    'handleInventoryFilterByProfession', 'handleManageEquipment', 'handleEquipmentSets',
    'handleSaveEquipmentSet', 'handleDismantleMultipleStart', 'displayDismantleItemList',
    'handleDismantleItemSelect', 'handleDismantleItemOverview', 'handleDismantleAddQuantity',
    'handleDismantleFinish', 'handleRemoveEnchantStart', 'handleRemoveEnchantConfirm',
    'handleEquipment', 'handleEquipBestWeapon', 'handleUpgradeWeapon', 'handleUpgradeGear',
    'handleGemSocketing', 'handleEquipmentBuilds',
  ],
  'rpg-crafting-handlers': [
    'handleCrafting', 'handleCraftingPage', 'handleAlchemy', 'handleAlchemyCraft',
    'handleAlchemyBrewWithQuantity', 'handlePotionDetails', 'handleUsePotionSelector',
    'handleUsePotionQuantity', 'handleUsePotion', 'handleUsePotionMultiple',
    'performAutoEnchant', 'handleEnchant', 'handleAutoEnchantMenu', 'handleEnchantCraft',
    'handleCraftingOverview', 'handleCraftRecipe',
  ],
  'rpg-quest-handlers': [
    'handleQuests', 'handleQuestDetail', 'handleGoals',
    'handleStartQuestFromDetail', 'handleDefenseQuestComplete',
    'handleQuestChoice', 'handleQuestChainBranchSelection',
    'handleQuestChoiceSelection', 'applyQuestOutcome',
    'handleDailyQuests', 'handleDailyRewards', 'handleDailyRewardClaim',
    'handleOpenLootboxMenu', 'handleOpenLootboxQuantityMenu', 'handleOpenLootbox',
  ],
  'rpg-guild-handlers': [
    'handleGuildAchievements', 'handleClaimGuildAchievements', 'handleGuildAchievementDetails',
    'handleGuildRankings', 'handleGuildRoles', 'handleGuildMemberRoleSelect',
    'handleGuild', 'handleGuildBrowser', 'handleGuildDashboard', 'handleGuildSearch',
    'handleGuildMembers', 'handleGuildBosses', 'handleActiveBossFight', 'startGuildBossCombat',
    'getPlayerOverallRank', 'handleGuildBossStatsShop', 'handleGuildBossStatDetail',
    'handleGuildBossSkillsShop', 'handleGuildBossSkillDetail', 'handleGuildBossTalentsShop',
    'handleGuildBossTalentDetail', 'handleGuildBossEnchantsShop', 'handleGuildBossEnchantDetail',
    'handleGuildBossCombatTurn', 'handleGuildBuffs', 'handleGuildBuffOverview',
    'handleGuildBuffPurchaseFromSelector', 'handleGuildBuffBulkPurchase',
    'handleGuildLeaveConfirm', 'handleGuildSettings', 'handleGuildTogglePublic',
    'handleGuildToggleApplication', 'handleGuildManagement',
    'handleGuildQuestsMenu', 'handleGuildDailyQuests', 'handleGuildWeeklyQuests',
    'handleGuildLimitedQuests', 'handleGuildQuestNavigation',
    'handleGuildBounties', 'handleCreateBountyModal',
    'handleGuildWeeklyRewards', 'handleClaimWeeklyReward',
    'handleGuildLeaderboard', 'handleGuildGrowthChart', 'handleGuildQuestSuggestions',
  ],
  'rpg-gathering-handlers': [
    'handleGatherMenu', 'handleGatheringAreaSelect', 'handleGatheringAreaDetails',
    'handleGatheringAreaDrops', 'handleGatherStatus', 'handleGatherDetailedOverview',
    'handleStartAutoGather', 'handleAutoGatherFromArea', 'handleGather',
    'handleStopAutoGather', 'handleGatheringRewards', 'handleGatheringTools',
    'handleBuyGatheringTool', 'handleMasterBlacksmithUpgrade',
  ],
  'rpg-economy-handlers': [
    'handleEconomyMenu', 'handleGambling', 'handleSlots', 'playSlots',
    'handleCoinflip', 'handleCoinflipChoice', 'playCoinflip',
    'handleMarket', 'handleMarketBrowse', 'handleMarketPurchase',
    'handleMarketSellMenu', 'handleMarketItemDetails', 'handleMarketCreateListing',
    'handleMarketMyListings', 'handleMarketCancelListing', 'handleShop',
  ],
  'rpg-progress-handlers': [
    'handleProgressMenu', 'handleAchievements', 'handleProgressLeaderboards',
    'handleAchievementDetail', 'handleAchievementClaim',
    'handleCollectibles', 'handleCollectiblesViewAll',
    'handleTitlesAndBadges', 'handleTitlesEarned', 'handleTitlesUnearned',
    'handleBadgesEarned', 'handleBadgesUnearned',
    'handleAchievementProgress', 'handleMilestoneNotifications',
    'handleLeaderboards', 'handleLeaderboardView', 'handleLeaderboardViewFromSelect',
    'handleProgressLeaderboardView',
  ],
  'rpg-skills-handlers': [
    'handleStats', 'handleCharacterSheet', 'handleSkills', 'handleSkillDetail',
    'handleTalents', 'handleTalentUpgrade', 'handleProfessions',
    'handleProfessionRewardsDisplay', 'handleStatsAndTalents',
    'handleClassMasteryGuide', 'handleProfessionTips',
  ],
  'rpg-exploration-handlers': [
    'handlePartyMenu', 'handlePartyAdd', 'handlePartyRemoveMenu',
    'handlePartyActiveMenu', 'handlePartyRemoveSelect', 'handlePartyActiveSelect',
    'handleArena', 'handleArenaBotFight', 'handleArenaPlayerFight',
    'updateArenaSnapshots', 'handleArenaFightStart', 'handleArenaShop', 'handleArenaShopPurchase',
    'handleRaids', 'handleWorldBoss', 'handleWorldTravel', 'handleTravelToWorld',
    'handleLayeredRaid', 'handleRaidPackageSelection', 'handleAdventure',
  ],
  'rpg-roguelike-handlers': [
    'handleRoguelikeStart', 'handleRoguelikeStartNew', 'handleRoguelikeFloor',
    'handleRoguelikeRoomSelect', 'handleRoguelikeMiniBossRoom', 'handleRoguelikeSkillRoom',
    'handleRoguelikeBossRoom', 'handleRoguelikeShopRoom', 'handleRoguelikeShopCatalog',
    'handleRoguelikeShopBuy', 'handleRoguelikeExit', 'ROOM_EMOJIS', 'ROOM_NAMES',
    'handleRoguelikeSkillAccept', 'handleRoguelikeSkillDecline', 'handleRoguelikeSkillChoose',
    'handleRoguelikeBossFight', 'handleRoguelikeMiniBossFight', 'handleRoguelikeComplete',
    'handleRoguelikeUpgrades', 'handleRoguelikeStats', 'handleRoguelikeUpgradeView',
    'handleRoguelikeUpgradePurchase',
    'handleTowerStart', 'handleTowerEnter', 'handleTowerFight',
    'handleTowerContinue', 'handleTowerReset', 'handleTowerStatus',
  ],
  'rpg-qol-handlers': [
    'handleJumpMenu', 'handleHotkeys', 'handleStatsTimeline', 'handleBossTracker',
    'handleEnvironmentTool', 'handleQuickSpellWheel', 'handleSpellWheelClick',
    'handleEnvironmentPredictions', 'handleStoryLog',
    'handleQOLMenu', 'handleQOLStatsMenu', 'handleQOLCombatMenu',
    'handleQOLProgressMenu', 'handleQOLGearMenu', 'handleQOLUtilityMenu',
    'handleQOLGuildMenu',
    'handleDamageTracker', 'handleBossAnalyzer', 'handleLootAnalytics',
    'handleSkillMastery', 'handleFavoriteItems', 'handleNotifications',
    'handleEnemyEncyclopedia', 'handleCommandHotkeys', 'handleCraftingQueue',
    'handleAutoSellSettings', 'handleStatComparison', 'handleTimezoneSettings',
    'handleUIThemeSettings', 'handleSessionStats',
  ],
};

// ========== STEP 3: Map method names to their bounds ==========
const methodMap = new Map();
for (const mb of methodBounds) {
  methodMap.set(mb.name, mb);
}

// ========== STEP 4: Identify all import lines from the original file ==========
const importLines = [];
let importEndLine = 0;
for (let i = 0; i < lines.length; i++) {
  const line = lines[i];
  if (line.startsWith('import ') || line.startsWith('} from ') || 
      (line.trim().startsWith('get') === false && /^\s+(get|default|getAllWorlds|getWorld|getAllBosses|getBossesByWorld|getAllDungeons|getDungeonsByWorld|getAllRaids|getRaidsByWorld|getWorldByBoss|getItemsForBot|getItemByIdForBot)/.test(line))) {
    importLines.push(line);
    importEndLine = i;
  }
  // Track multi-line imports
  if (line.startsWith('import ') && !line.includes(' from ')) {
    // multi-line import, continue
  }
  if (line.startsWith('import {') || line.startsWith('import ')) {
    importEndLine = i;
  }
}

// Grab the FULL import block (lines 0 to first non-import/non-blank line after imports)
let fullImportEnd = 0;
let inImport = false;
for (let i = 0; i < lines.length; i++) {
  const trimmed = lines[i].trim();
  if (trimmed.startsWith('import ')) inImport = true;
  if (inImport && (trimmed.includes(' from ') && trimmed.endsWith("';"))) {
    fullImportEnd = i;
    inImport = false;
  }
  if (inImport && trimmed.endsWith("';")) {
    fullImportEnd = i;
    inImport = false;
  }
  // If we hit something that's clearly not an import
  if (!inImport && i > 5 && trimmed !== '' && !trimmed.startsWith('import ') && 
      !trimmed.startsWith('//') && !trimmed.startsWith('*') && !trimmed.startsWith('}') &&
      fullImportEnd > 0 && i > fullImportEnd + 2) {
    break;
  }
}

// Collect the full raw import block
const rawImportBlock = lines.slice(0, fullImportEnd + 1).join('\n');

// ========== STEP 5: For each group, determine needed imports and extract ==========
function getMethodLines(methodName) {
  const mb = methodMap.get(methodName);
  if (!mb) {
    console.warn(`  WARNING: method '${methodName}' not found in RPGCommand.js`);
    return null;
  }
  return { start: mb.startLine, end: mb.endLine, lines: lines.slice(mb.startLine, mb.endLine + 1) };
}

// Collect all imported identifiers and their source lines
const importIdentifiers = new Map(); // identifier -> import line(s)
const importSections = [];
let currentImportLines = [];
for (let i = 0; i <= fullImportEnd; i++) {
  const line = lines[i];
  currentImportLines.push(line);
  if (line.includes(" from '") || line.includes(' from "')) {
    importSections.push(currentImportLines.join('\n'));
    currentImportLines = [];
  }
}

// For simplicity, include all imports in each handler file
// ES modules cache, so no runtime overhead
const allImports = importSections.join('\n');

// ========== STEP 6: Generate handler files ==========
const extractedMethods = new Set();
const results = {};

for (const [fileName, methodNames] of Object.entries(groups)) {
  const methods = [];
  let totalLines = 0;
  const missingMethods = [];
  
  for (const name of methodNames) {
    const data = getMethodLines(name);
    if (data) {
      methods.push({ name, ...data });
      totalLines += data.lines.length;
      extractedMethods.add(name);
    } else {
      missingMethods.push(name);
    }
  }
  
  if (missingMethods.length > 0) {
    console.warn(`[${fileName}] Missing methods: ${missingMethods.join(', ')}`);
  }
  
  // Sort methods by start line to maintain original order
  methods.sort((a, b) => a.start - b.start);
  
  // Build the handler file content
  const exportName = fileName.replace(/-/g, '_').replace(/^rpg_/, '');
  const camelName = fileName.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^rpg/, '');
  
  // Build method bodies
  const methodBodies = methods.map(m => {
    const body = m.lines.join('\n');
    return body;
  });
  
  const fileContent = `${allImports}

/**
 * ${fileName} — extracted from RPGCommand.js
 * ${methods.length} methods, ~${totalLines} lines
 */
export const ${camelName} = {
${methodBodies.join(',\n\n')},
};
`;
  
  results[fileName] = { content: fileContent, methodCount: methods.length, lineCount: totalLines };
  console.log(`  ${fileName}: ${methods.length} methods, ${totalLines} lines`);
}

// ========== STEP 7: Generate the trimmed RPGCommand.js ==========
// Remove extracted methods from the original, add mixin imports and Object.assign

// Find all extracted line ranges
const extractedRanges = [];
for (const mb of methodBounds) {
  if (extractedMethods.has(mb.name)) {
    extractedRanges.push({ start: mb.startLine, end: mb.endLine });
  }
}
extractedRanges.sort((a, b) => a.start - b.start);

// Merge overlapping/adjacent ranges
const mergedRanges = [];
for (const r of extractedRanges) {
  if (mergedRanges.length > 0 && r.start <= mergedRanges[mergedRanges.length - 1].end + 2) {
    mergedRanges[mergedRanges.length - 1].end = Math.max(mergedRanges[mergedRanges.length - 1].end, r.end);
  } else {
    mergedRanges.push({ ...r });
  }
}

// Build new lines excluding extracted ranges
const newLines = [];
let skipUntil = -1;
for (let i = 0; i < lines.length; i++) {
  if (i <= skipUntil) continue;
  
  const range = mergedRanges.find(r => i >= r.start && i <= r.end);
  if (range) {
    // Skip blank lines after the removed method
    skipUntil = range.end;
    // Don't add a blank line if the next non-blank line would create a double blank
    continue;
  }
  
  newLines.push(lines[i]);
}

// Find where to insert mixin imports (after existing imports, before the helper function)
let insertIndex = -1;
for (let i = 0; i < newLines.length; i++) {
  if (newLines[i].includes('function getItemByIdDynamic')) {
    insertIndex = i;
    break;
  }
}

const mixinImports = Object.keys(groups).map(fileName => {
  const camelName = fileName.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^rpg/, '');
  return `import { ${camelName} } from './${fileName}.js';`;
}).join('\n');

if (insertIndex > -1) {
  newLines.splice(insertIndex, 0, mixinImports + '\n');
}

// Find where to add Object.assign (after class closing brace, before export or at end)
// The pattern is: class defined, then export. We need Object.assign between.
// Actually, the class is "export default class RPGCommand" so closing } is the last line.
// We need to add Object.assign INSIDE the file after the class definition but before module ends.
// With "export default class", we can add them after the class closing brace.

// Find the last "}" which is the class closing brace
let classEndIndex = -1;
for (let i = newLines.length - 1; i >= 0; i--) {
  if (newLines[i].trim() === '}') {
    classEndIndex = i;
    break;
  }
}

// Since we use "export default class RPGCommand { ... }"
// the closing } is the last }, we need to add Object.assign after it
const objectAssignBlock = '\n' + Object.keys(groups).map(fileName => {
  const camelName = fileName.replace(/-([a-z])/g, (_, c) => c.toUpperCase()).replace(/^rpg/, '');
  return `Object.assign(RPGCommand.prototype, ${camelName});`;
}).join('\n') + '\n';

if (classEndIndex > -1) {
  newLines.splice(classEndIndex + 1, 0, objectAssignBlock);
}

// But wait - "export default class" means we can't add Object.assign after because
// there's no separate export statement. We need to change "export default class" to 
// just "class" and add "export default RPGCommand;" at the end.
let classDefIndex = -1;
for (let i = 0; i < newLines.length; i++) {
  if (newLines[i].startsWith('export default class RPGCommand')) {
    classDefIndex = i;
    break;
  }
}
if (classDefIndex > -1) {
  newLines[classDefIndex] = newLines[classDefIndex].replace('export default class RPGCommand', 'class RPGCommand');
}

// Add export at the very end
newLines.push('\nexport default RPGCommand;');

const trimmedContent = newLines.join('\n');

// ========== STEP 8: Write all files ==========
// Write handler files
for (const [fileName, data] of Object.entries(results)) {
  const outPath = path.join(OUT_DIR, `${fileName}.js`);
  fs.writeFileSync(outPath, data.content, 'utf-8');
  console.log(`Wrote ${outPath} (${data.lineCount} lines)`);
}

// Write trimmed RPGCommand.js
const backupPath = path.join(OUT_DIR, 'RPGCommand.js.bak');
fs.copyFileSync(SRC, backupPath);
console.log(`Backed up original to ${backupPath}`);

fs.writeFileSync(SRC, trimmedContent, 'utf-8');
const originalLC = lines.length;
const newLC = trimmedContent.split('\n').length;
console.log(`\nRPGCommand.js: ${originalLC} → ${newLC} lines (${originalLC - newLC} removed)`);
console.log(`Extracted methods: ${extractedMethods.size}`);
console.log(`Methods remaining in core: ${methodBounds.length - extractedMethods.size}`);

// Summary
const totalExtracted = Object.values(results).reduce((sum, r) => sum + r.lineCount, 0);
console.log(`\nTotal extracted: ${totalExtracted} lines across ${Object.keys(results).length} files`);
