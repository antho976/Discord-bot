/**
 * World Content System (Extended)
 * Supports editable bosses, dungeons, raids, and rewards via dashboard
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { EQUIPMENT } from './equipment.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const CONTENT_FILE = path.resolve(__dirname, '../../data/content-config.json');
const RPG_WORLDS_FILE = path.resolve(__dirname, '../../data/rpg-worlds.json');

// Default structure
const DEFAULT_CONTENT = {
  worlds: [],
  bosses: [], // World bosses
  dungeons: [],
  raids: [],
  quests: [], // Quests
  rewards: {}, // Centralized reward pool
  npcs: [], // NPCs: merchants, quest givers, etc
  items: [], // Items: weapons, armor, consumables, etc
};

let cachedContent = null;

/**
 * Load world content configuration from file
 */
export function loadContentConfig() {
  try {
    if (fs.existsSync(CONTENT_FILE)) {
      const data = fs.readFileSync(CONTENT_FILE, 'utf8');
      cachedContent = JSON.parse(data);
      return cachedContent;
    }
  } catch (err) {
    console.error('[Content] Failed to load:', err);
  }
  cachedContent = JSON.parse(JSON.stringify(DEFAULT_CONTENT));
  return cachedContent;
}

/**
 * Save world content configuration
 */
export function saveContentConfig(config) {
  try {
    const dir = path.dirname(CONTENT_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(CONTENT_FILE, JSON.stringify(config, null, 2));
    cachedContent = JSON.parse(JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('[Content] Failed to save:', err);
    return false;
  }
}

// ========== WORLD MANAGEMENT ==========

/**
 * Get all worlds from rpg-worlds.json (dashboard format)
 */
export function getAllWorlds() {
  try {
    if (fs.existsSync(RPG_WORLDS_FILE)) {
      const data = fs.readFileSync(RPG_WORLDS_FILE, 'utf8');
      const worldsObj = JSON.parse(data);
      // Convert object to array and sort by tier
      return Object.values(worldsObj).sort((a, b) => (a.tier || 0) - (b.tier || 0));
    }
  } catch (err) {
    console.error('[Content] Failed to load worlds from rpg-worlds.json:', err);
  }
  return [];
}

/**
 * Get world by ID from rpg-worlds.json
 */
export function getWorld(worldId) {
  try {
    if (fs.existsSync(RPG_WORLDS_FILE)) {
      const data = fs.readFileSync(RPG_WORLDS_FILE, 'utf8');
      const worldsObj = JSON.parse(data);
      return worldsObj[worldId] || null;
    }
  } catch (err) {
    console.error('[Content] Failed to load world from rpg-worlds.json:', err);
  }
  return null;
}

/**
 * Create or update world
 */
export function saveWorld(worldData) {
  const config = cachedContent || loadContentConfig();
  const idx = (config.worlds || []).findIndex(w => w.id === worldData.id);

  const world = {
    id: worldData.id || `world_${Date.now()}`,
    name: worldData.name || 'Unknown World',
    description: worldData.description || '',
    minLevel: worldData.minLevel || 1,
    maxLevel: worldData.maxLevel || 99,
    worldBoss: worldData.worldBoss || null, // Boss ID that must be defeated to progress
    nextWorldId: worldData.nextWorldId || null, // ID of next world after boss defeated
    rewards: worldData.rewards || { items: [], abilities: [] },
    // Removed: spawnLocation (no forced spawn logic)
  };

  if (idx !== -1) {
    config.worlds[idx] = world;
  } else {
    config.worlds.push(world);
  }

  saveContentConfig(config);
  return world;
}

// ========== BOSS MANAGEMENT ==========

/**
 * Get all bosses
 */
export function getAllBosses() {
  const config = cachedContent || loadContentConfig();
  return config.bosses || [];
}

/**
 * Get boss by ID
 */
export function getBoss(bossId) {
  const config = cachedContent || loadContentConfig();
  return (config.bosses || []).find(b => b.id === bossId);
}

/**
 * Create or update boss (world boss)
 * HP is NOT scaled - use value as-is
 */
export function saveBoss(bossData) {
  const config = cachedContent || loadContentConfig();
  const idx = (config.bosses || []).findIndex(b => b.id === bossData.id);

  const boss = {
    id: bossData.id || `boss_${Date.now()}`,
    name: bossData.name || 'Unnamed Boss',
    description: bossData.description || '',
    worldId: bossData.worldId,
    level: bossData.level || 10,
    hp: Number(bossData.hp) || 100, // EXACT value - no scaling
    stats: bossData.stats || { strength: 10, defense: 10, agility: 5, intelligence: 5 },
    abilities: bossData.abilities || [],
    rewards: bossData.rewards || { items: [], xp: 100, gold: 50 },
    enabled: bossData.enabled !== false,
  };

  if (idx !== -1) {
    config.bosses[idx] = boss;
  } else {
    config.bosses.push(boss);
  }

  saveContentConfig(config);
  return boss;
}

// ========== DUNGEON MANAGEMENT ==========

/**
 * Get all dungeons
 */
export function getAllDungeons() {
  const config = cachedContent || loadContentConfig();
  return config.dungeons || [];
}

/**
 * Get dungeon by ID
 */
export function getDungeon(dungeonId) {
  const config = cachedContent || loadContentConfig();
  return (config.dungeons || []).find(d => d.id === dungeonId);
}

/**
 * Create or update dungeon
 */
export function saveDungeon(dungeonData) {
  const config = cachedContent || loadContentConfig();
  const idx = (config.dungeons || []).findIndex(d => d.id === dungeonData.id);

  const dungeon = {
    id: dungeonData.id || `dungeon_${Date.now()}`,
    name: dungeonData.name || 'Unknown Dungeon',
    description: dungeonData.description || '',
    worldId: dungeonData.worldId,
    minLevel: dungeonData.minLevel || 1,
    maxLevel: dungeonData.maxLevel || 99,
    difficulty: dungeonData.difficulty || 'normal', // easy, normal, hard
    enemies: dungeonData.enemies || [], // Enemy IDs or definitions
    bosses: dungeonData.bosses || [], // Boss IDs
    rewards: dungeonData.rewards || { items: [], xp: 100, gold: 50 },
    enabled: dungeonData.enabled !== false,
  };

  if (idx !== -1) {
    config.dungeons[idx] = dungeon;
  } else {
    config.dungeons.push(dungeon);
  }

  saveContentConfig(config);
  return dungeon;
}

// ========== RAID MANAGEMENT ==========

/**
 * Get all raids
 */
export function getAllRaids() {
  const config = cachedContent || loadContentConfig();
  return config.raids || [];
}

/**
 * Get raid by ID
 */
export function getRaid(raidId) {
  const config = cachedContent || loadContentConfig();
  return (config.raids || []).find(r => r.id === raidId);
}

/**
 * Create or update raid
 * Supports multi-layer raids with rarity-based reward packages
 */
export function saveRaid(raidData) {
  const config = cachedContent || loadContentConfig();
  const idx = (config.raids || []).findIndex(r => r.id === raidData.id);

  const raid = {
    id: raidData.id || `raid_${Date.now()}`,
    name: raidData.name || 'Unknown Raid',
    description: raidData.description || '',
    worldId: raidData.worldId,
    minLevel: raidData.minLevel || 1,
    minPartySize: raidData.minPartySize || 1,
    maxPartySize: raidData.maxPartySize || 4,
    // Multi-layer raid support with increasing difficulty/rarity
    layers: raidData.layers || [
      {
        id: 'layer_1',
        name: 'Layer 1 - Common',
        level: 1,
        bosses: [],
        rewardPackages: [
          {
            id: `pkg_${Date.now()}_common`,
            name: 'Common Rewards',
            rarity: 'common',
            dropChance: 100,
            items: [],
            materials: [],
            xp: 500,
            gold: 250,
          },
        ],
      },
    ],
    // Legacy floors support
    floors: raidData.floors || [
      {
        id: 'floor_1',
        name: 'Floor 1',
        bosses: [],
        rewards: { items: [], xp: 100, gold: 50 },
      },
    ],
    // Legacy rewards
    rewards: raidData.rewards || { items: [], xp: 100, gold: 50 },
    enabled: raidData.enabled !== false,
  };

  if (idx !== -1) {
    config.raids[idx] = raid;
  } else {
    config.raids.push(raid);
  }

  saveContentConfig(config);
  return raid;
}

// ========== QUEST MANAGEMENT ==========

/**
 * Get all quests
 */
export function getAllQuests() {
  const config = cachedContent || loadContentConfig();
  return config.quests || [];
}

/**
 * Get quest by ID
 */
export function getQuest(questId) {
  const config = cachedContent || loadContentConfig();
  return (config.quests || []).find(q => q.id === questId);
}

/**
 * Get quests by world
 * @param {string} worldId - The world ID to filter by
 * @param {string} filter - Filter type: 'all', 'active', 'completed', etc.
 */
export function getQuestsByWorld(worldId, filter = 'all') {
  const config = cachedContent || loadContentConfig();
  let quests = (config.quests || []).filter(q => q.worldId === worldId);
  
  // Additional filtering can be implemented based on filter parameter
  // For now, just return all quests for the world
  return quests;
}

/**
 * Create or update quest
 */
export function saveQuest(questData) {
  const config = cachedContent || loadContentConfig();
  if (!config.quests) config.quests = [];

  const quest = {
    id: questData.id || `quest_${Date.now()}`,
    name: questData.name || 'Unknown Quest',
    description: questData.description || '',
    worldId: questData.worldId || null,
    type: questData.type || 'standard', // standard, main, side, daily, repeatable
    minLevel: questData.minLevel || 1,
    prerequisites: questData.prerequisites || [], // Quest IDs that must be completed first
    tasks: questData.tasks || [], // Array of task objects
    rewards: questData.rewards || {
      xp: 0,
      gold: 0,
      items: []
    },
    npcId: questData.npcId || null, // Quest giver NPC
    dialogue: questData.dialogue || {
      start: '',
      progress: '',
      complete: ''
    }
  };

  const idx = (config.quests || []).findIndex(q => q.id === questData.id);
  if (idx !== -1) {
    config.quests[idx] = quest;
  } else {
    config.quests.push(quest);
  }

  saveContentConfig(config);
  return quest;
}

/**
 * Delete quest
 */
export function deleteQuest(questId) {
  const config = cachedContent || loadContentConfig();
  config.quests = (config.quests || []).filter(q => q.id !== questId);
  saveContentConfig(config);
  return true;
}

// ========== REWARDS MANAGEMENT ==========

/**
 * Get reward by ID
 */
export function getReward(rewardId) {
  const config = cachedContent || loadContentConfig();
  return config.rewards?.[rewardId];
}

/**
 * Save reward to centralized pool
 */
export function saveReward(rewardId, rewardData) {
  const config = cachedContent || loadContentConfig();
  if (!config.rewards) config.rewards = {};

  config.rewards[rewardId] = {
    id: rewardId,
    items: rewardData.items || [],
    xp: rewardData.xp || 0,
    gold: rewardData.gold || 0,
    abilities: rewardData.abilities || [],
  };

  saveContentConfig(config);
  return config.rewards[rewardId];
}

/**
 * Delete a reward
 */
export function deleteReward(rewardId) {
  const config = cachedContent || loadContentConfig();
  if (config.rewards?.[rewardId]) {
    delete config.rewards[rewardId];
    saveContentConfig(config);
    return true;
  }
  return false;
}

// ========== WORLD-SPECIFIC CONTENT HELPERS ==========

/**
 * Get all bosses for a specific world
 */
export function getBossesByWorld(worldId) {
  const config = cachedContent || loadContentConfig();
  return (config.bosses || []).filter(b => b.worldId === worldId);
}

/**
 * Get all dungeons for a specific world
 */
export function getDungeonsByWorld(worldId) {
  const config = cachedContent || loadContentConfig();
  return (config.dungeons || []).filter(d => d.worldId === worldId);
}

/**
 * Get all raids for a specific world
 */
export function getRaidsByWorld(worldId) {
  const config = cachedContent || loadContentConfig();
  return (config.raids || []).filter(r => r.worldId === worldId);
}

/**
 * Get a world by its boss (find which world has this boss as worldBoss)
 */
export function getWorldByBoss(bossId) {
  const config = cachedContent || loadContentConfig();
  return (config.worlds || []).find(w => w.worldBoss === bossId);
}

// ========== NPC MANAGEMENT ==========

/**
 * Get all NPCs
 */
export function getAllNPCs() {
  const config = cachedContent || loadContentConfig();
  return config.npcs || [];
}

/**
 * Get NPC by ID
 */
export function getNPC(npcId) {
  const config = cachedContent || loadContentConfig();
  return (config.npcs || []).find(n => n.id === npcId);
}

/**
 * Get NPCs by world
 */
export function getNPCsByWorld(worldId) {
  const config = cachedContent || loadContentConfig();
  return (config.npcs || []).filter(n => n.worldId === worldId);
}

/**
 * Get NPCs by type (merchant, questgiver, innkeeper, etc)
 */
export function getNPCsByType(type) {
  const config = cachedContent || loadContentConfig();
  return (config.npcs || []).filter(n => n.type === type);
}

/**
 * Create or update NPC
 */
export function saveNPC(npcData) {
  const config = cachedContent || loadContentConfig();
  if (!config.npcs) config.npcs = [];

  const npc = {
    id: npcData.id || `npc_${Date.now()}`,
    name: npcData.name || 'Unknown NPC',
    description: npcData.description || '',
    worldId: npcData.worldId || null,
    type: npcData.type || 'generic', // merchant, questgiver, innkeeper, trainer, etc
    dialogueText: npcData.dialogueText || '',
    inventory: npcData.inventory || [], // For merchants: [{ itemId, price }, ...]
    quests: npcData.quests || [], // For quest givers: [questId, questId, ...]
    services: npcData.services || {}, // For trainers/innkeepers: { skillId: cost, ... }
    location: npcData.location || '', // Description of where they are
  };

  const idx = (config.npcs || []).findIndex(n => n.id === npcData.id);
  if (idx !== -1) {
    config.npcs[idx] = npc;
  } else {
    config.npcs.push(npc);
  }

  saveContentConfig(config);
  return npc;
}

/**
 * Delete NPC
 */
export function deleteNPC(npcId) {
  const config = cachedContent || loadContentConfig();
  config.npcs = (config.npcs || []).filter(n => n.id !== npcId);
  saveContentConfig(config);
  return true;
}

// ========== ITEM MANAGEMENT ==========

function mapEquipmentToContentItem(equipment) {
  const stats = equipment.stats || {};
  const strength = stats.strength || 0;
  const intelligence = stats.intelligence || 0;
  const wisdom = stats.wisdom || 0;
  const agility = stats.agility || 0;
  const defense = stats.defense || 0;

  const damage = Math.max(strength, intelligence, wisdom, agility, 0);

  return {
    id: equipment.id,
    name: equipment.name || equipment.id,
    category: equipment.slot === 'weapon' ? 'weapon' : 'armor',
    itemType: equipment.itemType || null,
    rarity: equipment.rarity || 'common',
    description: equipment.description || '',
    value: equipment.value || 0,
    damage,
    defense,
    strength,
    intelligence,
    wisdom,
    agility,
    luck: stats.luck || 0,
    hp: stats.hp || 0,
    mana: stats.mana || 0,
    heals: 0,
    restoresMana: 0,
    classRestriction: equipment.classRestriction || null,
    levelRequirement: equipment.levelRequirement || 1,
  };
}

function getMergedItems(configItems) {
  const items = Array.isArray(configItems) ? [...configItems] : [];
  const existingIds = new Set(items.map(item => item.id));

  const equipmentItems = [
    ...(EQUIPMENT.weapons || []),
    ...(EQUIPMENT.armor || []),
    ...(EQUIPMENT.accessories || []),
  ];

  for (const equipment of equipmentItems) {
    if (!equipment?.id || existingIds.has(equipment.id)) continue;
    items.push(mapEquipmentToContentItem(equipment));
    existingIds.add(equipment.id);
  }

  return items;
}

/**
 * Get all items
 */
export function getAllItems() {
  const config = cachedContent || loadContentConfig();
  return getMergedItems(config.items || []);
}

/**
 * Get item by ID
 */
export function getItem(itemId) {
  const config = cachedContent || loadContentConfig();
  const items = getMergedItems(config.items || []);
  return items.find(i => i.id === itemId);
}

/**
 * Get items by category
 */
export function getItemsByCategory(category) {
  const config = cachedContent || loadContentConfig();
  const items = getMergedItems(config.items || []);
  return items.filter(i => i.category === category);
}

/**
 * Create or update item
 */
export function saveItem(itemData) {
  const config = cachedContent || loadContentConfig();
  if (!config.items) config.items = [];

  const item = {
    id: itemData.id || `item_${Date.now()}`,
    name: itemData.name || 'Unknown Item',
    category: itemData.category || 'misc', // weapon, armor, consumable, misc
    itemType: itemData.itemType || null, // sword, axe, helm, chest, etc
    rarity: itemData.rarity || 'common', // common, uncommon, rare, epic, legendary
    description: itemData.description || '',
    value: itemData.value || 0, // Gold value
    
    // Combat stats (for weapons/armor)
    damage: itemData.damage || 0,
    defense: itemData.defense || 0,
    
    // Stat bonuses
    strength: itemData.strength || 0,
    intelligence: itemData.intelligence || 0,
    wisdom: itemData.wisdom || 0,
    agility: itemData.agility || 0,
    luck: itemData.luck || 0,
    
    // Special stats
    hp: itemData.hp || 0,
    mana: itemData.mana || 0,
    
    // Effects
    heals: itemData.heals || 0,
    restoresMana: itemData.restoresMana || 0,
    
    // Restrictions
    classRestriction: itemData.classRestriction || null, // null = all classes, else: warrior, mage, etc
    levelRequirement: itemData.levelRequirement || 1,
  };

  const idx = (config.items || []).findIndex(i => i.id === itemData.id);
  if (idx !== -1) {
    config.items[idx] = item;
  } else {
    config.items.push(item);
  }

  saveContentConfig(config);
  return item;
}

/**
 * Delete item
 */
export function deleteItem(itemId) {
  const config = cachedContent || loadContentConfig();
  config.items = (config.items || []).filter(i => i.id !== itemId);
  saveContentConfig(config);
  return true;
}

/**
 * Get all items formatted for bot use (merges content-config items with legacy items.js if needed)
 */
export function getItemsForBot() {
  const config = cachedContent || loadContentConfig();
  const items = config.items || [];
  
  // Convert to format compatible with getItemById() used in bot
  const itemLookup = {};
  items.forEach(item => {
    itemLookup[item.id] = {
      id: item.id,
      name: item.name,
      category: item.category,
      itemType: item.itemType,
      rarity: item.rarity,
      description: item.description,
      damage: item.damage || 0,
      defense: item.defense || 0,
      value: item.value || 0,
      strength: item.strength || 0,
      intelligence: item.intelligence || 0,
      wisdom: item.wisdom || 0,
      agility: item.agility || 0,
      luck: item.luck || 0,
      hp: item.hp || 0,
      mana: item.mana || 0,
      heals: item.heals || 0,
      restoresMana: item.restoresMana || 0,
      classRestriction: item.classRestriction,
      levelRequirement: item.levelRequirement || 1
    };
  });
  
  return itemLookup;
}

/**
 * Get item by ID from content-config (for bot use)
 */
export function getItemByIdForBot(itemId) {
  const items = getItemsForBot();
  return items[itemId] || null;
}