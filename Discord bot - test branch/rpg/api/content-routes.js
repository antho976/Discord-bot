/**
 * Dashboard API Routes - Content Management
 * All RPG content is editable through these endpoints
 */

import express from 'express';
import fs from 'fs';
import path from 'path';
import {
  loadQuestsConfig,
  saveQuestsConfig,
  getMainQuests,
  getDailyQuests,
  getWeeklyQuests,
  getSideQuests,
  getQuestById,
  createQuest,
  updateQuest,
  deleteQuest,
} from '../data/quest-system.js';

import {
  loadContentConfig,
  saveContentConfig,
  getAllWorlds,
  getWorld,
  saveWorld,
  getAllBosses,
  getBoss,
  saveBoss,
  getBossesByWorld,
  getAllDungeons,
  getDungeon,
  saveDungeon,
  getDungeonsByWorld,
  getAllRaids,
  getRaid,
  saveRaid,
  getRaidsByWorld,
  getReward,
  saveReward,
  deleteReward,
  getAllNPCs,
  getNPC,
  getNPCsByWorld,
  getNPCsByType,
  saveNPC,
  deleteNPC,
  getAllItems,
  getItem,
  getItemsByCategory,
  saveItem,
  deleteItem,
} from '../data/content-system.js';

const router = express.Router();

// ========== QUESTS API ==========

/**
 * GET /api/quests - Get all quests by type (optionally filtered by world)
 */
router.get('/quests', (req, res) => {
  const config = loadQuestsConfig();
  const worldId = req.query.worldId;
  
  let quests = {
    main: config.mainQuests || [],
    daily: config.dailyQuests || [],
    weekly: config.weeklyQuests || [],
    side: config.sideQuests || [],
  };
  
  if (worldId) {
    quests = {
      main: quests.main.filter(q => q.worldId === worldId),
      daily: quests.daily.filter(q => q.worldId === worldId),
      weekly: quests.weekly.filter(q => q.worldId === worldId),
      side: quests.side.filter(q => q.worldId === worldId),
    };
  }
  
  res.json(quests);
});

/**
 * GET /api/quests/:id - Get a specific quest
 */
router.get('/quests/:id', (req, res) => {
  const quest = getQuestById(req.params.id);
  if (!quest) return res.status(404).json({ error: 'Quest not found' });
  res.json(quest);
});

/**
 * POST /api/quests - Create a new quest
 */
router.post('/quests', express.json(), (req, res) => {
  try {
    const quest = createQuest(req.body);
    res.json({ success: true, quest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/quests/:id - Update a quest
 */
router.put('/quests/:id', express.json(), (req, res) => {
  try {
    const quest = updateQuest(req.params.id, req.body);
    if (!quest) return res.status(404).json({ error: 'Quest not found' });
    res.json({ success: true, quest });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/quests/:id - Delete a quest
 */
router.delete('/quests/:id', (req, res) => {
  try {
    const success = deleteQuest(req.params.id);
    if (!success) return res.status(404).json({ error: 'Quest not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== WORLDS API ==========

/**
 * GET /api/worlds - Get all worlds
 */
router.get('/worlds', (req, res) => {
  const worlds = getAllWorlds();
  res.json(worlds);
});

/**
 * GET /api/worlds/:id - Get a specific world
 */
router.get('/worlds/:id', (req, res) => {
  const world = getWorld(req.params.id);
  if (!world) return res.status(404).json({ error: 'World not found' });
  res.json(world);
});

/**
 * POST /api/worlds - Create a new world
 */
router.post('/worlds', express.json(), (req, res) => {
  try {
    const world = saveWorld(req.body);
    res.json({ success: true, world });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/worlds/:id - Update a world
 */
router.put('/worlds/:id', express.json(), (req, res) => {
  try {
    const world = saveWorld({ ...req.body, id: req.params.id });
    res.json({ success: true, world });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== BOSSES API ==========

/**
 * GET /api/bosses - Get all bosses (optionally filtered by world)
 */
router.get('/bosses', (req, res) => {
  const worldId = req.query.worldId;
  const bosses = worldId ? getBossesByWorld(worldId) : getAllBosses();
  res.json(bosses);
});

/**
 * GET /api/bosses/:id - Get a specific boss
 */
router.get('/bosses/:id', (req, res) => {
  const boss = getBoss(req.params.id);
  if (!boss) return res.status(404).json({ error: 'Boss not found' });
  res.json(boss);
});

/**
 * POST /api/bosses - Create a new boss
 */
router.post('/bosses', express.json(), (req, res) => {
  try {
    const boss = saveBoss(req.body);
    res.json({ success: true, boss });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/bosses/:id - Update a boss (HP not scaled)
 */
router.put('/bosses/:id', express.json(), (req, res) => {
  try {
    const boss = saveBoss({ ...req.body, id: req.params.id });
    res.json({ success: true, boss });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== DUNGEONS API ==========

/**
 * GET /api/dungeons - Get all dungeons (optionally filtered by world)
 */
router.get('/dungeons', (req, res) => {
  const worldId = req.query.worldId;
  const dungeons = worldId ? getDungeonsByWorld(worldId) : getAllDungeons();
  res.json(dungeons);
});

/**
 * GET /api/dungeons/:id - Get a specific dungeon
 */
router.get('/dungeons/:id', (req, res) => {
  const dungeon = getDungeon(req.params.id);
  if (!dungeon) return res.status(404).json({ error: 'Dungeon not found' });
  res.json(dungeon);
});

/**
 * POST /api/dungeons - Create a new dungeon
 */
router.post('/dungeons', express.json(), (req, res) => {
  try {
    const dungeon = saveDungeon(req.body);
    res.json({ success: true, dungeon });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/dungeons/:id - Update a dungeon
 */
router.put('/dungeons/:id', express.json(), (req, res) => {
  try {
    const dungeon = saveDungeon({ ...req.body, id: req.params.id });
    res.json({ success: true, dungeon });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== RAIDS API ==========

/**
 * GET /api/raids - Get all raids (optionally filtered by world)
 */
router.get('/raids', (req, res) => {
  const worldId = req.query.worldId;
  const raids = worldId ? getRaidsByWorld(worldId) : getAllRaids();
  res.json(raids);
});

/**
 * GET /api/raids/:id - Get a specific raid
 */
router.get('/raids/:id', (req, res) => {
  const raid = getRaid(req.params.id);
  if (!raid) return res.status(404).json({ error: 'Raid not found' });
  res.json(raid);
});

/**
 * POST /api/raids - Create a new raid (supports multi-floor)
 */
router.post('/raids', express.json(), (req, res) => {
  try {
    const raid = saveRaid(req.body);
    res.json({ success: true, raid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/raids/:id - Update a raid
 */
router.put('/raids/:id', express.json(), (req, res) => {
  try {
    const raid = saveRaid({ ...req.body, id: req.params.id });
    res.json({ success: true, raid });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== REWARDS API ==========

/**
 * GET /api/rewards - Get all rewards (centralized pool)
 */
router.get('/rewards', (req, res) => {
  const config = loadContentConfig();
  res.json(config.rewards || {});
});

/**
 * POST /api/rewards - Create/update a reward
 */
router.post('/rewards', express.json(), (req, res) => {
  try {
    const { id, ...data } = req.body;
    const reward = saveReward(id, data);
    res.json({ success: true, reward });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/rewards/:id - Delete a reward
 */
router.delete('/rewards/:id', (req, res) => {
  try {
    const success = deleteReward(req.params.id);
    if (!success) return res.status(404).json({ error: 'Reward not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== NPCs API ==========

/**
 * GET /api/npcs - Get all NPCs (optionally filtered by worldId or type)
 */
router.get('/npcs', (req, res) => {
  try {
    const { worldId, type } = req.query;
    
    if (worldId) {
      const npcs = getNPCsByWorld(worldId);
      return res.json(npcs);
    }
    
    if (type) {
      const npcs = getNPCsByType(type);
      return res.json(npcs);
    }
    
    const npcs = getAllNPCs();
    res.json(npcs);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/npcs/:id - Get a specific NPC
 */
router.get('/npcs/:id', (req, res) => {
  try {
    const npc = getNPC(req.params.id);
    if (!npc) return res.status(404).json({ error: 'NPC not found' });
    res.json(npc);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/npcs - Create a new NPC
 */
router.post('/npcs', express.json(), (req, res) => {
  try {
    const npc = saveNPC(req.body);
    
    // If this NPC has quests, mark them as NPC-exclusive
    if (npc.quests && npc.quests.length > 0) {
      const config = loadQuestsConfig();
      npc.quests.forEach(questId => {
        // Find and update quest to set npcId
        ['mainQuests', 'dailyQuests', 'weeklyQuests', 'sideQuests'].forEach(category => {
          const quest = config[category]?.find(q => q.id === questId);
          if (quest) {
            quest.npcId = npc.id;
          }
        });
      });
      saveQuestsConfig(config);
    }
    
    res.json({ success: true, npc });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/npcs/:id - Update an NPC
 */
router.put('/npcs/:id', express.json(), (req, res) => {
  try {
    const npc = saveNPC({ ...req.body, id: req.params.id });
    
    // Clear previous npcId from quests that are no longer assigned to this NPC
    const config = loadQuestsConfig();
    ['mainQuests', 'dailyQuests', 'weeklyQuests', 'sideQuests'].forEach(category => {
      config[category]?.forEach(q => {
        if (q.npcId === npc.id && (!npc.quests || !npc.quests.includes(q.id))) {
          delete q.npcId;
        }
      });
    });
    
    // Mark assigned quests with this NPC's ID
    if (npc.quests && npc.quests.length > 0) {
      npc.quests.forEach(questId => {
        ['mainQuests', 'dailyQuests', 'weeklyQuests', 'sideQuests'].forEach(category => {
          const quest = config[category]?.find(q => q.id === questId);
          if (quest) {
            quest.npcId = npc.id;
          }
        });
      });
    }
    saveQuestsConfig(config);
    
    res.json({ success: true, npc });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/npcs/:id - Delete an NPC
 */
router.delete('/npcs/:id', (req, res) => {
  try {
    const success = deleteNPC(req.params.id);
    if (!success) return res.status(404).json({ error: 'NPC not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== ITEM ROUTES ==========

/**
 * GET /api/items - Get all items (with optional category filter)
 */
router.get('/items', (req, res) => {
  try {
    const { category } = req.query;
    let items = getAllItems();
    
    if (category) {
      items = items.filter(i => i.category === category);
    }
    
    res.json(items);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/items/:id - Get single item
 */
router.get('/items/:id', (req, res) => {
  try {
    const item = getItem(req.params.id);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/items - Create a new item
 */
router.post('/items', (req, res) => {
  try {
    const item = saveItem(req.body);
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/items/:id - Update an item
 */
router.put('/items/:id', (req, res) => {
  try {
    const item = saveItem({ ...req.body, id: req.params.id });
    res.json({ success: true, item });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/items/:id - Delete an item
 */
router.delete('/items/:id', (req, res) => {
  try {
    const success = deleteItem(req.params.id);
    if (!success) return res.status(404).json({ error: 'Item not found' });
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== RECIPES API ==========

/**
 * GET /api/recipes - Get all recipes
 */
router.get('/recipes', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    if (!fs.existsSync(filePath)) {
      return res.json({ recipes: {} });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json(data.recipes || {});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/by-item/:itemId - Get recipe for an item (before :id route!)
 */
router.get('/recipes/by-item/:itemId', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'No recipes found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    // Find recipe with matching output item
    for (const [id, recipe] of Object.entries(data.recipes || {})) {
      if (recipe.output && recipe.output.item === req.params.itemId) {
        return res.json(recipe);
      }
    }
    
    res.status(404).json({ error: 'No recipe found for this item' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * GET /api/recipes/:id - Get single recipe
 */
router.get('/recipes/:id', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    if (!fs.existsSync(filePath)) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    
    const recipe = data.recipes[req.params.id];
    if (!recipe) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    res.json(recipe);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/recipes - Create a new recipe
 */
router.post('/recipes', express.json(), (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    // Load current data
    let data = { materials: {}, recipes: {} };
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }
    
    // Create new recipe
    const recipe = {
      id: req.body.id || `recipe_${Date.now()}`,
      name: req.body.name,
      profession: req.body.profession || 'blacksmith',
      level: req.body.level || 1,
      materials: req.body.materials || {},
      output: req.body.output,
      craftTime: req.body.craftTime || 5,
      classRestriction: req.body.classRestriction || null,
    };
    
    data.recipes[recipe.id] = recipe;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    res.json({ success: true, recipe });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/recipes/:id - Update a recipe
 */
router.put('/recipes/:id', express.json(), (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    // Load current data
    let data = { materials: {}, recipes: {} };
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }
    
    // Update recipe
    if (!data.recipes[req.params.id]) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    data.recipes[req.params.id] = {
      ...data.recipes[req.params.id],
      ...req.body,
      id: req.params.id, // Keep original ID
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, recipe: data.recipes[req.params.id] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/recipes/:id - Delete a recipe
 */
router.delete('/recipes/:id', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    // Load current data
    let data = { materials: {}, recipes: {} };
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }
    
    if (!data.recipes[req.params.id]) {
      return res.status(404).json({ error: 'Recipe not found' });
    }
    
    delete data.recipes[req.params.id];
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

// ========== MATERIALS API ==========

/**
 * GET /api/materials - Get all materials
 */
router.get('/materials', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    if (!fs.existsSync(filePath)) {
      return res.json({ materials: {} });
    }
    
    const content = fs.readFileSync(filePath, 'utf-8');
    const data = JSON.parse(content);
    res.json(data.materials || {});
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * POST /api/materials - Create a new material
 */
router.post('/materials', express.json(), (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    // Load current data
    let data = { materials: {}, recipes: {} };
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }
    
    // Create new material
    const material = {
      id: req.body.id || `material_${Date.now()}`,
      name: req.body.name,
      rarity: req.body.rarity || 'common',
      value: req.body.value || 1,
      dropChance: req.body.dropChance || 100,
      adventureLevel: req.body.adventureLevel || 1,
      source: req.body.source || ['adventure'],
      gatheringType: req.body.gatheringType || null,
    };
    
    // Ensure source is array
    if (typeof material.source === 'string') {
      material.source = [material.source];
    }
    
    data.materials[material.id] = material;
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    res.json({ success: true, material });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * PUT /api/materials/:id - Update a material
 */
router.put('/materials/:id', express.json(), (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    // Load current data
    let data = { materials: {}, recipes: {} };
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }
    
    // Update material
    if (!data.materials[req.params.id]) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    data.materials[req.params.id] = {
      ...data.materials[req.params.id],
      ...req.body,
      id: req.params.id, // Keep original ID
    };
    
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    res.json({ success: true, material: data.materials[req.params.id] });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * DELETE /api/materials/:id - Delete a material
 */
router.delete('/materials/:id', (req, res) => {
  try {
    const filePath = path.join(process.cwd(), 'data', 'crafting.json');
    
    // Load current data
    let data = { materials: {}, recipes: {} };
    if (fs.existsSync(filePath)) {
      const content = fs.readFileSync(filePath, 'utf-8');
      data = JSON.parse(content);
    }
    
    if (!data.materials[req.params.id]) {
      return res.status(404).json({ error: 'Material not found' });
    }
    
    delete data.materials[req.params.id];
    fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
    
    res.json({ success: true });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

/**
 * Gathering Areas Endpoints
 */

router.get('/gathering-areas/all', async (req, res) => {
  try {
    const { GATHERING_AREAS } = await import('../data/gathering-areas.js');
    const areas = Object.values(GATHERING_AREAS);
    res.json(areas);
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

router.post('/gathering-areas/update', (req, res) => {
  try {
    const gatheringAreasPath = path.join(process.cwd(), 'rpg/data/gathering-areas.js');
    let fileContent = fs.readFileSync(gatheringAreasPath, 'utf-8');
    
    const { id, description, difficulty, minLevel, baseXp, rarity, commonMaterials, rareMaterials } = req.body;
    
    // Update the area object in the file
    const areaRegex = new RegExp(
      `(${id}: \\{[^}]*?)\\}(?=,\\s*[a-zA-Z]+:|\\}\\s*;)`,
      's'
    );
    
    const updatedArea = `${id}: {
    id: '${id}',
    name: '${extractName(fileContent, id)}',
    description: '${description.replace(/'/g, "\\'")}',
    difficulty: ${difficulty},
    icon: '${extractIcon(fileContent, id)}',
    skillTypes: ${JSON.stringify(extractSkillTypes(fileContent, id))},
    baseXp: ${baseXp},
    rarity: ${rarity},
    minLevel: ${minLevel},
    materials: {
      common: ${JSON.stringify(commonMaterials)},
      rare: ${JSON.stringify(rareMaterials)},
    },
  }`;
    
    fileContent = fileContent.replace(areaRegex, updatedArea);
    fs.writeFileSync(gatheringAreasPath, fileContent);
    
    res.json({ success: true, message: 'Area updated successfully' });
  } catch (err) {
    res.status(400).json({ error: err.message });
  }
});

function extractName(content, areaId) {
  const match = content.match(new RegExp(`${areaId}: \\{[^}]*?name: ['"](.*?)['"]`));
  return match ? match[1] : areaId;
}

function extractIcon(content, areaId) {
  const match = content.match(new RegExp(`${areaId}: \\{[^}]*?icon: ['"](.*?)['"]`));
  return match ? match[1] : '⛏️';
}

function extractSkillTypes(content, areaId) {
  const match = content.match(new RegExp(`${areaId}: \\{[^}]*?skillTypes: \\[(.*?)\\]`, 's'));
  if (!match) return [];
  return match[1]
    .split(',')
    .map(s => s.trim().replace(/['"]/g, ''))
    .filter(s => s);
}

export default router;
