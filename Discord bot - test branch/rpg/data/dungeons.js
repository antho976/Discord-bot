/**
 * Dungeon Data - Loaded from world editor output
 * 
 * ALL DUNGEONS HAVE 3 FLOORS:
 * - Floor 1: Basic rewards  
 * - Floor 2: Better rewards (2x XP/Gold)
 * - Floor 3: Best rewards (3x XP/Gold + rare items)
 * 
 * RISK/REWARD SYSTEM:
 * After completing each floor, players choose:
 * - "Claim Reward & Leave" - Get current floor rewards and exit safely
 * - "Continue to Next Floor" - Risk losing everything for better rewards
 * 
 * REWARD SCALING BY DUNGEON LEVEL:
 * 
 * Level 1-5 (Basic):
 *   Floor 1: Herb, Wood, Iron Ore + Tier 1 Health Potion
 *   Floor 2: More basic materials + Tier 1 XP Potion
 *   Floor 3: Granite, Lumber + Tier 1 Potions + Gold Potion
 * 
 * Level 6-10 (Improved):
 *   Floor 1: Granite, Lumber + Tier 1-2 Potions
 *   Floor 2: Mana Crystal, Coal + Tier 2 Potions
 *   Floor 3: Rare Flower, Mithril + Tier 2 Potions + Basic Enchants
 * 
 * Level 11-15 (Advanced):
 *   Floor 1: Mithril Ore, Rare Flower + Tier 2 Potions
 *   Floor 2: Arcane Essence, Hardwood + Tier 2 Potions + Enchants
 *   Floor 3: Adamantite + Tier 2-3 Potions + Multiple Enchants
 * 
 * Level 16-20 (Expert):
 *   Floor 1: Adamantite, Moonflower + Tier 3 Potions
 *   Floor 2: Dragonhide + Tier 3 Potions + Tier 2 Enchants
 *   Floor 3: Phoenix Feather + Tier 3 Potions + Multiple Tier 2 Enchants
 * 
 * Level 21+ (Master):
 *   Floor 1: Phoenix Feather, Dragonstone + Tier 4 Potions
 *   Floor 2: More legendary materials + Tier 4 Potions + Tier 3 Enchants
 *   Floor 3: Max rewards - 5+ Phoenix Feather, Dragonstone + Tier 4 Potions + Multiple Tier 3 Enchants
 * 
 * Quantities increase by +1 per 5 dungeon levels (levelBonus)
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadBalanceData } from './balance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EDITOR_WORLDS_FILE = path.resolve(__dirname, '../../../data/rpg-worlds.json');

let cachedDungeons = null;
let cachedMtime = 0;

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function parseRewards(rawRewards, level) {
  // Dungeon rewards should NOT be affected by quest XP multipliers
  // Return raw values as specified in the dungeon definition
  if (!rawRewards) {
    return { xp: level * 50, gold: level * 25, loot: [] };
  }

  if (typeof rawRewards === 'object') {
    return {
      xp: toNumber(rawRewards.xp, level * 50),
      gold: toNumber(rawRewards.gold, level * 25),
      loot: Array.isArray(rawRewards.loot) ? rawRewards.loot : [],
    };
  }

  if (typeof rawRewards === 'string') {
    try {
      const parsed = JSON.parse(rawRewards);
      return {
        xp: toNumber(parsed.xp, level * 50),
        gold: toNumber(parsed.gold, level * 25),
        loot: Array.isArray(parsed.loot) ? parsed.loot : [],
      };
    } catch {
      return { xp: level * 50, gold: level * 25, loot: [] };
    }
  }

  return { xp: level * 50, gold: level * 25, loot: [] };
}

function normalizeDungeon(dungeon, worldId, worldMinLevel) {
  const baseLevel = toNumber(dungeon.level, worldMinLevel);
  
  // Preserve boss IDs if they exist (new format from dashboard)
  let bosses = [];
  if (Array.isArray(dungeon.bosses) && dungeon.bosses.length > 0) {
    // Check if bosses are already IDs (strings) or need to be created
    if (typeof dungeon.bosses[0] === 'string') {
      bosses = dungeon.bosses; // Already boss IDs, keep them
    } else {
      bosses = [{ name: dungeon.bosses[0].name, level: dungeon.bosses[0].level }];
    }
  } else {
    // Fallback for old format: create a boss object from boss name field
    const bossName = dungeon.boss || `${dungeon.name || 'Dungeon'} Boss`;
    bosses = [{ name: bossName, level: baseLevel + 2 }];
  }
  
  // FORCE 3 FLOORS FOR ALL DUNGEONS
  const floors = 3;
  
  // Create floor-specific rewards if not defined
  let floorRewards = dungeon.floorRewards || {};
  
  // Parse explicit rewards first (if provided)
  const explicitRewards = dungeon.rewards ? parseRewards(dungeon.rewards, baseLevel) : null;
  
  // Generate default rewards for each floor if not specified
  // If explicit rewards exist, use them as a base; otherwise generate from dungeon level
  
  for (let floor = 1; floor <= 3; floor++) {
    if (!floorRewards[floor]) {
      const floorMultiplier = floor; // Floor 1: 1x, Floor 2: 2x, Floor 3: 3x
      const levelBonus = Math.floor(baseLevel / 5); // +1 bonus per 5 levels
      
      // If explicit rewards exist, scale them by floor multiplier
      // Otherwise, generate from dungeon level
      let xp, gold;
      if (explicitRewards) {
        xp = Math.floor(explicitRewards.xp * floorMultiplier);
        gold = Math.floor(explicitRewards.gold * floorMultiplier);
      } else {
        xp = baseLevel * 100 * floorMultiplier;
        gold = baseLevel * 50 * floorMultiplier;
      }
      
      // Materials and loot based on DUNGEON LEVEL
      const materials = [];
      const loot = [];
      
      // === LEVEL 1-5 DUNGEONS: Basic Tier ===
      if (baseLevel < 6) {
        if (floor === 1) {
          materials.push({ id: 'herb', quantity: 3 + levelBonus });
          materials.push({ id: 'wood', quantity: 2 + levelBonus });
          materials.push({ id: 'iron_ore', quantity: 2 + levelBonus });
          loot.push({ id: 'health_potion_t1', quantity: 1 });
        } else if (floor === 2) {
          materials.push({ id: 'herb', quantity: 4 + levelBonus });
          materials.push({ id: 'wood', quantity: 3 + levelBonus });
          materials.push({ id: 'copper_ore', quantity: 3 + levelBonus });
          materials.push({ id: 'iron_ore', quantity: 2 + levelBonus });
          loot.push({ id: 'health_potion_t1', quantity: 2 });
          loot.push({ id: 'xp_potion_t1', quantity: 1 });
        } else { // floor 3
          materials.push({ id: 'herb', quantity: 5 + levelBonus });
          materials.push({ id: 'granite', quantity: 2 + levelBonus });
          materials.push({ id: 'lumber', quantity: 2 + levelBonus });
          materials.push({ id: 'iron_ore', quantity: 3 + levelBonus });
          loot.push({ id: 'health_potion_t1', quantity: 3 });
          loot.push({ id: 'xp_potion_t1', quantity: 2 });
          loot.push({ id: 'gold_potion_t1', quantity: 1 });
        }
      }
      // === LEVEL 6-10 DUNGEONS: Improved Tier ===
      else if (baseLevel < 11) {
        if (floor === 1) {
          materials.push({ id: 'granite', quantity: 3 + levelBonus });
          materials.push({ id: 'lumber', quantity: 2 + levelBonus });
          materials.push({ id: 'iron_ore', quantity: 3 + levelBonus });
          loot.push({ id: 'health_potion_t1', quantity: 2 });
          loot.push({ id: 'xp_potion_t1', quantity: 1 });
        } else if (floor === 2) {
          materials.push({ id: 'granite', quantity: 4 + levelBonus });
          materials.push({ id: 'lumber', quantity: 3 + levelBonus });
          materials.push({ id: 'mana_crystal', quantity: 2 + levelBonus });
          materials.push({ id: 'coal', quantity: 2 + levelBonus });
          loot.push({ id: 'health_potion_t2', quantity: 2 });
          loot.push({ id: 'xp_potion_t1', quantity: 2 });
          loot.push({ id: 'gold_potion_t1', quantity: 1 });
        } else { // floor 3
          materials.push({ id: 'granite', quantity: 5 + levelBonus });
          materials.push({ id: 'mana_crystal', quantity: 3 + levelBonus });
          materials.push({ id: 'rare_flower', quantity: 2 + levelBonus });
          materials.push({ id: 'mithril_ore', quantity: 1 + levelBonus });
          loot.push({ id: 'health_potion_t2', quantity: 3 });
          loot.push({ id: 'xp_potion_t2', quantity: 2 });
          loot.push({ id: 'gold_potion_t1', quantity: 2 });
          loot.push({ id: 'damage_enchant_t1', quantity: 1 });
        }
      }
      // === LEVEL 11-15 DUNGEONS: Advanced Tier ===
      else if (baseLevel < 16) {
        if (floor === 1) {
          materials.push({ id: 'mithril_ore', quantity: 3 + levelBonus });
          materials.push({ id: 'rare_flower', quantity: 2 + levelBonus });
          materials.push({ id: 'mana_crystal', quantity: 2 + levelBonus });
          loot.push({ id: 'health_potion_t2', quantity: 2 });
          loot.push({ id: 'xp_potion_t2', quantity: 1 });
        } else if (floor === 2) {
          materials.push({ id: 'mithril_ore', quantity: 4 + levelBonus });
          materials.push({ id: 'arcane_essence', quantity: 2 + levelBonus });
          materials.push({ id: 'rare_flower', quantity: 3 + levelBonus });
          materials.push({ id: 'hardwood', quantity: 2 + levelBonus });
          loot.push({ id: 'health_potion_t2', quantity: 3 });
          loot.push({ id: 'xp_potion_t2', quantity: 2 });
          loot.push({ id: 'gold_potion_t2', quantity: 1 });
          loot.push({ id: 'damage_enchant_t1', quantity: 1 });
        } else { // floor 3
          materials.push({ id: 'mithril_ore', quantity: 5 + levelBonus });
          materials.push({ id: 'arcane_essence', quantity: 3 + levelBonus });
          materials.push({ id: 'rare_flower', quantity: 4 + levelBonus });
          materials.push({ id: 'adamantite', quantity: 1 + levelBonus });
          loot.push({ id: 'health_potion_t3', quantity: 3 });
          loot.push({ id: 'xp_potion_t2', quantity: 3 });
          loot.push({ id: 'gold_potion_t2', quantity: 2 });
          loot.push({ id: 'gathering_potion_t2', quantity: 2 });
          loot.push({ id: 'damage_enchant_t2', quantity: 1 });
          loot.push({ id: 'loot_enchant_t1', quantity: 1 });
        }
      }
      // === LEVEL 16-20 DUNGEONS: Expert Tier ===
      else if (baseLevel < 21) {
        if (floor === 1) {
          materials.push({ id: 'adamantite', quantity: 3 + levelBonus });
          materials.push({ id: 'arcane_essence', quantity: 2 + levelBonus });
          materials.push({ id: 'moonflower', quantity: 2 + levelBonus });
          loot.push({ id: 'health_potion_t3', quantity: 2 });
          loot.push({ id: 'xp_potion_t3', quantity: 1 });
          loot.push({ id: 'damage_enchant_t1', quantity: 1 });
        } else if (floor === 2) {
          materials.push({ id: 'adamantite', quantity: 4 + levelBonus });
          materials.push({ id: 'dragonhide', quantity: 2 + levelBonus });
          materials.push({ id: 'moonflower', quantity: 3 + levelBonus });
          materials.push({ id: 'arcane_essence', quantity: 3 + levelBonus });
          loot.push({ id: 'health_potion_t3', quantity: 3 });
          loot.push({ id: 'xp_potion_t3', quantity: 2 });
          loot.push({ id: 'gold_potion_t2', quantity: 2 });
          loot.push({ id: 'gathering_potion_t2', quantity: 2 });
          loot.push({ id: 'damage_enchant_t2', quantity: 1 });
          loot.push({ id: 'xp_enchant_t1', quantity: 1 });
        } else { // floor 3
          materials.push({ id: 'adamantite', quantity: 6 + levelBonus });
          materials.push({ id: 'dragonhide', quantity: 3 + levelBonus });
          materials.push({ id: 'moonflower', quantity: 4 + levelBonus });
          materials.push({ id: 'phoenix_feather', quantity: 1 + levelBonus });
          loot.push({ id: 'health_potion_t3', quantity: 4 });
          loot.push({ id: 'xp_potion_t3', quantity: 3 });
          loot.push({ id: 'gold_potion_t3', quantity: 2 });
          loot.push({ id: 'gathering_potion_t3', quantity: 2 });
          loot.push({ id: 'loot_potion_t2', quantity: 2 });
          loot.push({ id: 'damage_enchant_t2', quantity: 2 });
          loot.push({ id: 'loot_enchant_t2', quantity: 1 });
          loot.push({ id: 'xp_enchant_t2', quantity: 1 });
        }
      }
      // === LEVEL 21+ DUNGEONS: Master Tier ===
      else {
        if (floor === 1) {
          materials.push({ id: 'phoenix_feather', quantity: 2 + levelBonus });
          materials.push({ id: 'dragonstone', quantity: 2 + levelBonus });
          materials.push({ id: 'adamantite', quantity: 3 + levelBonus });
          loot.push({ id: 'health_potion_t4', quantity: 2 });
          loot.push({ id: 'xp_potion_t3', quantity: 2 });
          loot.push({ id: 'damage_enchant_t2', quantity: 1 });
        } else if (floor === 2) {
          materials.push({ id: 'phoenix_feather', quantity: 3 + levelBonus });
          materials.push({ id: 'dragonstone', quantity: 3 + levelBonus });
          materials.push({ id: 'adamantite', quantity: 4 + levelBonus });
          materials.push({ id: 'dragonhide', quantity: 3 + levelBonus });
          loot.push({ id: 'health_potion_t4', quantity: 3 });
          loot.push({ id: 'xp_potion_t4', quantity: 2 });
          loot.push({ id: 'gold_potion_t3', quantity: 2 });
          loot.push({ id: 'gathering_potion_t3', quantity: 3 });
          loot.push({ id: 'damage_enchant_t3', quantity: 1 });
          loot.push({ id: 'loot_enchant_t2', quantity: 1 });
        } else { // floor 3
          materials.push({ id: 'phoenix_feather', quantity: 5 + levelBonus });
          materials.push({ id: 'dragonstone', quantity: 5 + levelBonus });
          materials.push({ id: 'adamantite', quantity: 6 + levelBonus });
          materials.push({ id: 'moonflower', quantity: 4 + levelBonus });
          loot.push({ id: 'health_potion_t4', quantity: 5 });
          loot.push({ id: 'xp_potion_t4', quantity: 4 });
          loot.push({ id: 'gold_potion_t4', quantity: 3 });
          loot.push({ id: 'gathering_potion_t4', quantity: 3 });
          loot.push({ id: 'loot_potion_t3', quantity: 2 });
          loot.push({ id: 'damage_enchant_t3', quantity: 2 });
          loot.push({ id: 'loot_enchant_t3', quantity: 1 });
          loot.push({ id: 'xp_enchant_t3', quantity: 1 });
          loot.push({ id: 'doublehit_enchant_t2', quantity: 1 });
        }
      }
      
      floorRewards[floor] = {
        xp,
        gold,
        loot,
        materials
      };
    }
  }
  
  return {
    id: dungeon.id || `${worldId}-${baseLevel}-${Date.now()}`,
    name: dungeon.name || `Dungeon ${worldId}`,
    description: dungeon.description || 'A dangerous dungeon created in the world editor.',
    world: worldId,
    minLevel: baseLevel,
    maxLevel: baseLevel + 5,
    enemies: [],
    bosses: bosses,
    floors: floors,
    rewards: parseRewards(dungeon.rewards, baseLevel), // Legacy support
    floorRewards: floorRewards, // Floor-specific rewards
  };
}

function loadEditorDungeons() {
  if (!fs.existsSync(EDITOR_WORLDS_FILE)) return {};

  try {
    const raw = fs.readFileSync(EDITOR_WORLDS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const worlds = Object.values(data || {});
    if (!worlds.length) return {};

    const sorted = worlds.sort((a, b) => {
      const tierA = toNumber(a.tier, 1);
      const tierB = toNumber(b.tier, 1);
      if (tierA !== tierB) return tierA - tierB;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    const result = {};
    sorted.forEach((world, index) => {
      const tier = toNumber(world.tier, index + 1);
      const worldMinLevel = 1 + (tier - 1) * 10;
      const worldId = index + 1;
      
      // Load dungeons from world.dungeons array (new format)
      const dungeons = Array.isArray(world.dungeons) ? world.dungeons : [];
      
      // Also load from world.entities.dungeons (old format) for backwards compatibility
      const entityDungeons = Object.values(world.entities?.dungeons || {});
      
      const allDungeons = [...dungeons, ...entityDungeons];
      
      result[`world${worldId}`] = allDungeons.map((d) => normalizeDungeon(d, worldId, worldMinLevel));
    });

    return result;
  } catch {
    return {};
  }
}

function loadDungeons() {
  let mtime = 0;
  if (fs.existsSync(EDITOR_WORLDS_FILE)) {
    try {
      mtime = fs.statSync(EDITOR_WORLDS_FILE).mtimeMs;
    } catch {
      mtime = 0;
    }
  }
  if (cachedDungeons && cachedMtime === mtime) return cachedDungeons;
  const editorDungeons = loadEditorDungeons();
  if (Object.keys(editorDungeons).length === 0) {
    console.warn('[RPG] No dungeons found in editor. Create dungeons in the world editor tool first.');
  }
  cachedDungeons = editorDungeons;
  cachedMtime = mtime;
  return cachedDungeons;
}

export const DUNGEONS = loadDungeons();

function resolveWorldKey(worldId) {
  if (worldId === null || worldId === undefined) return null;

  const idStr = String(worldId);
  if (/^\d+$/.test(idStr)) return `world${idStr}`;

  if (!fs.existsSync(EDITOR_WORLDS_FILE)) return null;

  try {
    const raw = fs.readFileSync(EDITOR_WORLDS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const worlds = Object.values(data || {});
    if (!worlds.length) return null;

    const sorted = worlds.sort((a, b) => {
      const tierA = toNumber(a.tier, 1);
      const tierB = toNumber(b.tier, 1);
      if (tierA !== tierB) return tierA - tierB;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    const index = sorted.findIndex(w => String(w.id) === idStr);
    if (index === -1) return null;
    return `world${index + 1}`;
  } catch {
    return null;
  }
}

/**
 * Get dungeons for a specific world
 */
export function getDungeonsByWorld(worldId) {
  const key = resolveWorldKey(worldId) || `world${worldId}`;
  return loadDungeons()[key] || [];
}

/**
 * Get dungeon by ID
 */
export function getDungeonById(dungeonId) {
  for (const dungeons of Object.values(loadDungeons())) {
    const dungeon = dungeons.find(d => d.id === dungeonId);
    if (dungeon) return dungeon;
  }
  return null;
}

/**
 * Get available dungeons for a player
 */
export function getAvailableDungeons(playerLevel, worldId) {
  const dungeons = getDungeonsByWorld(worldId);
  // Return all dungeons for the world, accessible at any level
  return dungeons;
}
