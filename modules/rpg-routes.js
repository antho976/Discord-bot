/**
 * RPG API Routes
 * Extracted from index.js
 */
import fs from 'fs';
import path from 'path';
import { ITEMS } from '../Discord bot - test branch/rpg/data/items.js';

export function registerRPGRoutes(app, { requireAuth, saveRPGWorlds, rpgBot, DATA_DIR }) {

// Get all worlds
app.get('/api/rpg/worlds', requireAuth, (req, res) => {
  try {
    if (!global.rpgWorlds) global.rpgWorlds = {};
    const worlds = Object.values(global.rpgWorlds);
    res.json({ success: true, worlds });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Create world
app.post('/api/rpg/worlds', requireAuth, (req, res) => {
  try {
    const world = req.body;
    if (!world.name) {
      return res.json({ success: false, error: 'World name required' });
    }
    if (!global.rpgWorlds) global.rpgWorlds = {};
    const worldId = world.id || Date.now().toString();
    global.rpgWorlds[worldId] = {
      ...world,
      id: worldId,
      createdAt: world.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    saveRPGWorlds();
    res.json({ success: true, message: 'World created', worldId });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Delete world
app.delete('/api/rpg/worlds/:id', requireAuth, (req, res) => {
  try {
    if (!global.rpgWorlds) global.rpgWorlds = {};
    delete global.rpgWorlds[req.params.id];
    saveRPGWorlds();
    res.json({ success: true, message: 'World deleted' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Update world
app.put('/api/rpg/worlds/:id', requireAuth, (req, res) => {
  try {
    if (!global.rpgWorlds) global.rpgWorlds = {};
    const world = global.rpgWorlds[req.params.id];
    if (!world) {
      return res.json({ success: false, error: 'World not found' });
    }
    Object.assign(world, req.body);
    world.updatedAt = new Date().toISOString();
    saveRPGWorlds();
    res.json({ success: true, message: 'World updated' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get all quests
app.get('/api/rpg/quests', requireAuth, (req, res) => {
  try {
    loadRPGWorlds();
    const worlds = global.rpgWorlds || {};
    let quests = [];
    
    // Collect all quests from all worlds
    Object.values(worlds).forEach(world => {
      if (world.entities?.quests && typeof world.entities.quests === 'object') {
        Object.values(world.entities.quests).forEach(q => {
          if (q && q.id) {
            quests.push({
              id: q.id,
              name: q.name || q.title || 'Unnamed Quest',
              title: q.title || q.name,
              description: q.description || '',
              minLevel: q.minLevel || 1,
              type: q.type || q.category || 'main',
              xpReward: q.xpReward || 0,
              goldReward: q.goldReward || 0,
              itemRewards: q.itemRewards || [],
              enemyMultiplier: q.enemyMultiplier
            });
          }
        });
      }
    });
    
    res.json({ success: true, quests });
  } catch (err) {
    console.error('Error loading quests:', err);
    res.json({ success: false, error: err.message, quests: [] });
  }
});

// Create quest
app.post('/api/rpg/quests', requireAuth, (req, res) => {
  try {
    const { title, description, rewards } = req.body;
    if (!title || !description) {
      return res.json({ success: false, error: 'Missing required fields' });
    }
    rpgBot?.contentStore?.createQuest?.({ title, description, rewards });
    res.json({ success: true, message: 'Quest created' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Delete quest
app.delete('/api/rpg/quests/:id', requireAuth, (req, res) => {
  try {
    rpgBot?.contentStore?.deleteQuest?.(req.params.id);
    res.json({ success: true, message: 'Quest deleted' });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Validate all content
app.get('/api/rpg/validate', requireAuth, (req, res) => {
  try {
    const results = rpgBot?.validator?.validateAll?.() || { 
      isValid: true, 
      issues: [] 
    };
    const issues = (results.issues || []).map(issue => ({
      severity: issue.severity || 'warning',
      message: issue.message,
      details: issue.details || ''
    }));
    res.json({ success: true, issues });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Combat simulator
app.get('/api/rpg/simulators/combat', requireAuth, (req, res) => {
  try {
    const result = rpgBot?.combatSimulator?.simulate?.() || { 
      message: 'Combat simulation feature not available' 
    };
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Quest simulator
app.get('/api/rpg/simulators/quest', requireAuth, (req, res) => {
  try {
    const result = rpgBot?.questSimulator?.simulate?.() || { 
      message: 'Quest simulation feature not available' 
    };
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// World state simulator
app.get('/api/rpg/simulators/world', requireAuth, (req, res) => {
  try {
    const result = rpgBot?.worldStateSimulator?.generateDailyState?.() || { 
      message: 'World state simulation feature not available' 
    };
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Flag tester
app.get('/api/rpg/simulators/flags', requireAuth, (req, res) => {
  try {
    const result = rpgBot?.flagTester?.testFlags?.() || { 
      message: 'Flag testing feature not available' 
    };
    res.json({ success: true, result });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Get all flags
app.get('/api/rpg/flags', requireAuth, (req, res) => {
  try {
    const flags = rpgBot?.flagRegistry?.getAllFlags?.() || [];
    res.json({ success: true, flags: flags.map(f => ({ 
      id: f.id, 
      name: f.name, 
      description: f.description 
    })) });
  } catch (err) {
    res.json({ success: false, error: err.message });
  }
});

// Level Analysis Tool
app.post('/api/rpg/analyze-level', requireAuth, async (req, res) => {
  try {
    const { level, quest, weaponId } = req.body;
    
    if (!level || !quest) {
      return res.json({ success: false, error: 'Missing level or quest' });
    }
    
    // Load all quests to find stat rewards from lower level quests
    loadRPGWorlds();
    const worlds = global.rpgWorlds || {};
    let allQuests = [];
    
    Object.values(worlds).forEach(world => {
      if (world.entities?.quests && typeof world.entities.quests === 'object') {
        Object.values(world.entities.quests).forEach(q => {
          if (q && q.id && q.minLevel && q.minLevel < level) {
            allQuests.push(q);
          }
        });
      }
    });
    
    // Calculate base player stats at this level
    const baseHp = 100;
    const baseAttackPower = 10;
    const attackPowerPerLevel = 0.8;
    const baseDefense = 10;
    const defensePerLevel = 0.5;
    
    const levelScaling = Math.max(1, level / 50);
    
    let playerStats = {
      health: Math.round(baseHp * levelScaling),
      attackPower: Math.round((baseAttackPower + (level - 1) * attackPowerPerLevel) * levelScaling),
      defense: Math.round((baseDefense + (level - 1) * defensePerLevel) * levelScaling),
      critChance: Math.min(0.5, 0.1 + (level * 0.005))
    };
    
    let questStatRewards = {};
    
    // Add stat rewards from completed quests
    allQuests.forEach(q => {
      if (q.statRewards && typeof q.statRewards === 'object') {
        Object.entries(q.statRewards).forEach(([stat, value]) => {
          questStatRewards[stat] = (questStatRewards[stat] || 0) + value;
        });
      }
    });
    
    // Apply quest stat bonuses
    if (questStatRewards.health) playerStats.health += questStatRewards.health;
    if (questStatRewards.attackPower) playerStats.attackPower += questStatRewards.attackPower;
    if (questStatRewards.defense) playerStats.defense += questStatRewards.defense;
    if (questStatRewards.strength) playerStats.attackPower += (questStatRewards.strength * 0.5);
    if (questStatRewards.vitality) playerStats.health += (questStatRewards.vitality * 2);
    
    // Add weapon bonuses if provided
    if (weaponId) {
      try {
        const { getEquipment } = await import('./Discord bot - test branch/rpg/data/equipment.js');
        const weapon = getEquipment(weaponId);
        if (weapon && weapon.bonuses) {
          if (weapon.bonuses.attackPower) playerStats.attackPower += weapon.bonuses.attackPower;
          if (weapon.bonuses.strength) playerStats.attackPower += (weapon.bonuses.strength * 0.5);
          if (weapon.bonuses.hp) playerStats.health += weapon.bonuses.hp;
          if (weapon.bonuses.defense) playerStats.defense += weapon.bonuses.defense;
        }
      } catch (e) {
        // Weapon loading optional
      }
    }
    
    // Calculate enemy stats based on quest
    let enemyStats = null;
    if (quest.type === 'combat' || quest.minLevel) {
      const questLevel = quest.minLevel || 1;
      const questLevelScaling = Math.max(1, questLevel / 50);
      
      enemyStats = {
        health: Math.round(baseHp * questLevelScaling * (quest.enemyMultiplier?.health || 1.2)),
        attackPower: Math.round((baseAttackPower + (questLevel - 1) * attackPowerPerLevel) * questLevelScaling * (quest.enemyMultiplier?.attackPower || 1.1)),
        defense: Math.round((baseDefense + (questLevel - 1) * defensePerLevel) * questLevelScaling * (quest.enemyMultiplier?.defense || 1.0))
      };
    }
    
    // Determine difficulty
    let difficulty = 'Too Easy';
    let outcome = '✅ Highly likely to win';
    let turnsToWin = 1;
    
    if (enemyStats) {
      const playerDPS = Math.max(0.1, playerStats.attackPower * (0.5 + playerStats.critChance));
      const defenseReduction = Math.max(0, Math.min(0.9, playerStats.defense / (playerStats.defense + 100)));
      const enemyDPS = Math.max(0.1, enemyStats.attackPower * (1 - defenseReduction));
      
      turnsToWin = Math.ceil(enemyStats.health / playerDPS);
      const turnsToLose = Math.ceil(playerStats.health / enemyDPS);
      const survivalRatio = turnsToLose / turnsToWin;
      
      if (survivalRatio >= 2.5) {
        difficulty = 'Too Easy';
        outcome = '✅ Should win easily';
      } else if (survivalRatio >= 1.0) {
        difficulty = 'Moderate';
        outcome = '⚔️ Good challenge, should win';
      } else {
        difficulty = 'Too Hard';
        outcome = '❌ Likely to lose, consider leveling';
      }
    }
    
    const damageComparison = {
      playerDPS: Math.max(0.1, playerStats.attackPower * (0.5 + playerStats.critChance)),
      enemyDPS: enemyStats ? Math.max(0.1, enemyStats.attackPower * (1 - Math.max(0, Math.min(0.9, playerStats.defense / (playerStats.defense + 100))))) : 0,
      turnsToWin
    };
    
    // Extract quest rewards
    const questRewards = {
      xp: quest.xpReward || Math.round(100 * (quest.minLevel || 1)),
      gold: quest.goldReward || Math.round(50 * (quest.minLevel || 1)),
      items: quest.itemRewards || []
    };
    
    const difficultyMultiplier = difficulty === 'Too Easy' ? 0.5 : (difficulty === 'Moderate' ? 1.0 : 2.5);
    const rewardEfficiency = Math.round((questRewards.xp + questRewards.gold) / Math.max(1, difficultyMultiplier));
    let valueAssessment = 'Poor value';
    if (rewardEfficiency > 200) valueAssessment = '⭐ Excellent value';
    else if (rewardEfficiency > 150) valueAssessment = '⭐⭐ Great value';
    else if (rewardEfficiency > 100) valueAssessment = '⭐⭐⭐ Good value';
    else if (rewardEfficiency > 50) valueAssessment = 'Fair value';
    
    res.json({
      success: true,
      analysis: {
        playerLevel: level,
        playerStats,
        questStatRewards,
        completedQuestsBelow: allQuests.length,
        enemyStats,
        quest,
        difficulty,
        outcome,
        damageComparison,
        questRewards,
        rewardEfficiency,
        valueAssessment
      }
    });
  } catch (err) {
    console.error('Error in analyze-level:', err);
    res.json({ success: false, error: err.message });
  }
});

// Reset character
app.post('/api/rpg/reset-character', requireAuth, (req, res) => {
  try {
    res.json({ success: false, message: 'Use /dashboard Discord command to reset your character.' });
  } catch (err) {
    res.json({ success: false, message: '❌ Error: ' + err.message });
  }
});

/* ======================
   GUILD API ROUTES
====================== */

// Get all guild quests
app.get('/api/rpg/guild/quests', requireAuth, (req, res) => {
  try {
    const questsPath = path.join(process.cwd(), 'rpg', 'data', 'guild-quests.json');
    let quests = { daily: [], weekly: [], limited: [] };
    
    if (fs.existsSync(questsPath)) {
      const data = cachedReadJSON(questsPath);
      quests = data;
    }
    
    res.json(quests);
  } catch (err) {
    console.error('Error loading guild quests:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create quest
app.post('/api/rpg/guild/quests/:type', requireAuth, (req, res) => {
  try {
    const { type } = req.params;
    if (!['daily', 'weekly', 'limited'].includes(type)) {
      return res.status(400).json({ error: 'Invalid quest type' });
    }
    
    const questsPath = path.join(process.cwd(), 'rpg', 'data', 'guild-quests.json');
    let quests = { daily: [], weekly: [], limited: [] };
    
    if (fs.existsSync(questsPath)) {
      quests = cachedReadJSON(questsPath);
    }
    
    const newQuest = req.body;
    if (!newQuest.id || !newQuest.title) {
      return res.status(400).json({ error: 'Quest ID and title required' });
    }
    
    // Check for duplicate ID
    if (quests[type].some(q => q.id === newQuest.id)) {
      return res.status(400).json({ error: 'Quest ID already exists' });
    }
    
    quests[type].push(newQuest);
    
    fs.writeFileSync(questsPath, JSON.stringify(quests, null, 2), 'utf8');
    invalidateRPGCache(questsPath);
    
    res.json({ success: true, message: 'Quest created', quest: newQuest });
  } catch (err) {
    console.error('Error creating quest:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update quest
app.put('/api/rpg/guild/quests/:type/:questId', requireAuth, (req, res) => {
  try {
    const { type, questId } = req.params;
    if (!['daily', 'weekly', 'limited'].includes(type)) {
      return res.status(400).json({ error: 'Invalid quest type' });
    }
    
    const questsPath = path.join(process.cwd(), 'rpg', 'data', 'guild-quests.json');
    let quests = { daily: [], weekly: [], limited: [] };
    
    if (fs.existsSync(questsPath)) {
      quests = cachedReadJSON(questsPath);
    }
    
    const questIndex = quests[type].findIndex(q => q.id === questId);
    if (questIndex === -1) {
      return res.status(404).json({ error: 'Quest not found' });
    }
    
    const updatedQuest = req.body;
    quests[type][questIndex] = updatedQuest;
    
    fs.writeFileSync(questsPath, JSON.stringify(quests, null, 2), 'utf8');
    invalidateRPGCache(questsPath);
    
    res.json({ success: true, message: 'Quest updated', quest: updatedQuest });
  } catch (err) {
    console.error('Error updating quest:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete quest
app.delete('/api/rpg/guild/quests/:type/:questId', requireAuth, (req, res) => {
  try {
    const { type, questId } = req.params;
    if (!['daily', 'weekly', 'limited'].includes(type)) {
      return res.status(400).json({ error: 'Invalid quest type' });
    }
    
    const questsPath = path.join(process.cwd(), 'rpg', 'data', 'guild-quests.json');
    let quests = { daily: [], weekly: [], limited: [] };
    
    if (fs.existsSync(questsPath)) {
      quests = cachedReadJSON(questsPath);
    }
    
    quests[type] = quests[type].filter(q => q.id !== questId);
    
    fs.writeFileSync(questsPath, JSON.stringify(quests, null, 2), 'utf8');
    invalidateRPGCache(questsPath);
    
    res.json({ success: true, message: 'Quest deleted' });
  } catch (err) {
    console.error('Error deleting quest:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get all bounties
app.get('/api/rpg/guild/bounties', requireAuth, (req, res) => {
  try {
    const bountiesPath = path.join(process.cwd(), 'rpg', 'data', 'bounties.json');
    let bounties = [];
    
    if (fs.existsSync(bountiesPath)) {
      const data = cachedReadJSON(bountiesPath);
      bounties = data;
    }
    
    res.json(bounties);
  } catch (err) {
    console.error('Error loading bounties:', err);
    res.status(500).json({ error: err.message });
  }
});

// Create bounty
app.post('/api/rpg/guild/bounties', requireAuth, (req, res) => {
  try {
    const bountiesPath = path.join(process.cwd(), 'rpg', 'data', 'bounties.json');
    let bounties = [];
    
    if (fs.existsSync(bountiesPath)) {
      bounties = cachedReadJSON(bountiesPath);
    }
    
    const newBounty = {
      id: 'bounty_' + Date.now(),
      ...req.body,
      createdAt: new Date().toISOString()
    };
    
    bounties.push(newBounty);
    
    fs.writeFileSync(bountiesPath, JSON.stringify(bounties, null, 2), 'utf8');
    invalidateRPGCache(bountiesPath);
    
    res.json({ success: true, message: 'Bounty created', bounty: newBounty });
  } catch (err) {
    console.error('Error creating bounty:', err);
    res.status(500).json({ error: err.message });
  }
});

// Update bounty
app.put('/api/rpg/guild/bounties/:bountyId', requireAuth, (req, res) => {
  try {
    const { bountyId } = req.params;
    
    const bountiesPath = path.join(process.cwd(), 'rpg', 'data', 'bounties.json');
    let bounties = [];
    
    if (fs.existsSync(bountiesPath)) {
      bounties = cachedReadJSON(bountiesPath);
    }
    
    const bountyIndex = bounties.findIndex(b => b.id === bountyId);
    if (bountyIndex === -1) {
      return res.status(404).json({ error: 'Bounty not found' });
    }
    
    bounties[bountyIndex] = { ...bounties[bountyIndex], ...req.body };
    
    fs.writeFileSync(bountiesPath, JSON.stringify(bounties, null, 2), 'utf8');
    invalidateRPGCache(bountiesPath);
    
    res.json({ success: true, message: 'Bounty updated', bounty: bounties[bountyIndex] });
  } catch (err) {
    console.error('Error updating bounty:', err);
    res.status(500).json({ error: err.message });
  }
});

// Delete bounty
app.delete('/api/rpg/guild/bounties/:bountyId', requireAuth, (req, res) => {
  try {
    const { bountyId } = req.params;
    
    const bountiesPath = path.join(process.cwd(), 'rpg', 'data', 'bounties.json');
    let bounties = [];
    
    if (fs.existsSync(bountiesPath)) {
      bounties = cachedReadJSON(bountiesPath);
    }
    
    bounties = bounties.filter(b => b.id !== bountyId);
    
    fs.writeFileSync(bountiesPath, JSON.stringify(bounties, null, 2), 'utf8');
    invalidateRPGCache(bountiesPath);
    
    res.json({ success: true, message: 'Bounty deleted' });
  } catch (err) {
    console.error('Error deleting bounty:', err);
    res.status(500).json({ error: err.message });
  }
});

// Guild Statistics - Leaderboard
app.get('/api/rpg/guild/statistics/leaderboard', requireAuth, (req, res) => {
  try {
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    let players = [];
    
    if (fs.existsSync(playersPath)) {
      const data = cachedReadJSON(playersPath);
      players = Array.isArray(data) ? data : Object.values(data);
    }

    const leaderboard = players
      .map(p => ({
        userId: p.userId,
        username: p.username || 'Unknown',
        rank: p.guildRank || 'F',
        guildXP: p.guildXP || 0,
        level: p.level || 1,
        totalQuestsCompleted: (p.dailyQuestsCompleted || []).length + (p.weeklyQuestsCompleted || []).length + (p.limitedQuestsCompleted || []).length,
      }))
      .sort((a, b) => b.guildXP - a.guildXP)
      .slice(0, 100);

    res.json({ success: true, leaderboard });
  } catch (err) {
    console.error('Error loading leaderboard:', err);
    res.status(500).json({ error: err.message });
  }
});

// Guild Statistics - Overview
app.get('/api/rpg/guild/statistics/overview', requireAuth, (req, res) => {
  try {
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    const questsPath = path.join(process.cwd(), 'data', 'guild-quests.json');
    
    let players = [];
    if (fs.existsSync(playersPath)) {
      const data = cachedReadJSON(playersPath);
      players = Array.isArray(data) ? data : Object.values(data);
    }

    let quests = { daily: [], weekly: [], limited: [] };
    if (fs.existsSync(questsPath)) {
      quests = cachedReadJSON(questsPath);
    }

    const statistics = {
      timestamp: new Date().toISOString(),
      totalPlayers: players.length,
      averageRankXP: players.length > 0 ? (players.reduce((sum, p) => sum + (p.guildXP || 0), 0) / players.length).toFixed(0) : 0,
      
      questStats: {
        totalDaily: quests.daily.length,
        totalWeekly: quests.weekly.length,
        totalLimited: quests.limited.length,
      },

      completionRates: {
        dailyCompletionRate: players.length > 0 
          ? (players.filter(p => p.dailyQuestsCompleted && p.dailyQuestsCompleted.length > 0).length / players.length * 100).toFixed(1) + '%'
          : '0%',
        weeklyCompletionRate: players.length > 0
          ? (players.filter(p => p.weeklyQuestsCompleted && p.weeklyQuestsCompleted.length > 0).length / players.length * 100).toFixed(1) + '%'
          : '0%',
      },

      rankDistribution: ['F', 'E', 'D', 'C', 'B', 'A', 'S'].map(rank => {
        const count = players.filter(p => p.guildRank === rank).length;
        return {
          rank,
          count,
          percentage: players.length > 0 ? (count / players.length * 100).toFixed(1) : 0,
        };
      }),

      completionByRank: ['F', 'E', 'D', 'C', 'B', 'A', 'S'].map(rank => {
        const rankPlayers = players.filter(p => p.guildRank === rank);
        if (rankPlayers.length === 0) return { rank, average: 0 };
        
        const avgCompleted = (rankPlayers.reduce((sum, p) => {
          return sum + ((p.dailyQuestsCompleted || []).length + (p.weeklyQuestsCompleted || []).length + (p.limitedQuestsCompleted || []).length);
        }, 0) / rankPlayers.length).toFixed(1);
        
        return { rank, average: avgCompleted };
      }),
    };

    res.json({ success: true, statistics });
  } catch (err) {
    console.error('Error calculating statistics:', err);
    res.status(500).json({ error: err.message });
  }
});

// Guild Shop - Get all items
app.get('/api/rpg/guild/shop', requireAuth, (req, res) => {
  try {
    const shopPath = path.join(process.cwd(), 'data', 'guild-shop.json');
    let shopItems = {};
    
    if (fs.existsSync(shopPath)) {
      shopItems = cachedReadJSON(shopPath);
    }

    res.json({ success: true, items: shopItems });
  } catch (err) {
    console.error('Error loading shop:', err);
    res.status(500).json({ error: err.message });
  }
});

// Guild Shop - Purchase item
app.post('/api/rpg/guild/shop/purchase/:itemId', requireAuth, (req, res) => {
  try {
    const { itemId } = req.params;
    const userId = req.body.userId;

    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    let players = [];
    
    if (fs.existsSync(playersPath)) {
      const data = cachedReadJSON(playersPath);
      players = Array.isArray(data) ? data : Object.values(data);
    }

    const player = players.find(p => p.userId === userId);
    if (!player) {
      return res.status(404).json({ error: 'Player not found' });
    }

    const shopPath = path.join(process.cwd(), 'data', 'guild-shop.json');
    let shopItems = {};
    
    if (fs.existsSync(shopPath)) {
      shopItems = cachedReadJSON(shopPath);
    }

    // Find item
    let item = null;
    for (const category of Object.values(shopItems)) {
      item = category.find(i => i.id === itemId);
      if (item) break;
    }

    if (!item) {
      return res.status(404).json({ error: 'Item not found' });
    }

    if (player.guildXP < item.price) {
      return res.status(400).json({ error: 'Not enough Guild XP' });
    }

    // Purchase
    player.guildXP -= item.price;
    player.shopInventory = player.shopInventory || [];
    player.shopInventory.push({
      id: itemId,
      purchasedAt: new Date().toISOString(),
      active: false,
    });

    // Save player
    if (Array.isArray(players)) {
      fs.writeFileSync(playersPath, JSON.stringify(players, null, 2));
      invalidateRPGCache(playersPath);
    }

    res.json({ success: true, message: 'Item purchased', item });
  } catch (err) {
    console.error('Error purchasing item:', err);
    res.status(500).json({ error: err.message });
  }
});

// Quest Chains - Get available chains
app.get('/api/rpg/guild/chains', requireAuth, (req, res) => {
  try {
    const chainsPath = path.join(process.cwd(), 'data', 'quest-chains.json');
    let chains = [];
    
    if (fs.existsSync(chainsPath)) {
      chains = cachedReadJSON(chainsPath);
    }

    res.json({ success: true, chains });
  } catch (err) {
    console.error('Error loading chains:', err);
    res.status(500).json({ error: err.message });
  }
});

// Quest Chains - Create new chain
app.post('/api/rpg/guild/chains', requireAuth, (req, res) => {
  try {
    const { name, description, questIds } = req.body;

    if (!questIds || !Array.isArray(questIds) || questIds.length < 2) {
      return res.status(400).json({ error: 'Chain must have at least 2 quests' });
    }

    const chainsPath = path.join(process.cwd(), 'data', 'quest-chains.json');
    let chains = [];
    
    if (fs.existsSync(chainsPath)) {
      chains = cachedReadJSON(chainsPath);
    }

    const newChain = {
      id: `chain_${Date.now()}`,
      name,
      description,
      questIds,
      bonusMultiplier: 1.25,
      chainCompletionBonus: 500,
      createdAt: new Date().toISOString(),
    };

    chains.push(newChain);
    fs.writeFileSync(chainsPath, JSON.stringify(chains, null, 2));
    invalidateRPGCache(chainsPath);

    res.json({ success: true, message: 'Chain created', chain: newChain });
  } catch (err) {
    console.error('Error creating chain:', err);
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   PLAYER MANAGEMENT API ROUTES
====================== */

// List all players with statistics
app.get('/api/rpg/players/list', requireAuth, (req, res) => {
  try {
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    let players = {};
    
    if (fs.existsSync(playersPath)) {
      const data = cachedReadJSON(playersPath);
      players = data;
    }

    // Calculate statistics
    const playerArray = Object.values(players);
    const stats = {
      totalPlayers: playerArray.length,
      avgLevel: playerArray.length > 0 ? Math.round(playerArray.reduce((sum, p) => sum + (p.level || 1), 0) / playerArray.length) : 0,
      maxLevel: playerArray.length > 0 ? Math.max(...playerArray.map(p => p.level || 1)) : 0,
      totalGold: playerArray.reduce((sum, p) => sum + (p.gold || 0), 0),
    };

    res.json({ success: true, players, stats });
  } catch (err) {
    console.error('Error listing players:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Get individual player data
app.get('/api/rpg/players/:userId', requireAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    
    if (!fs.existsSync(playersPath)) {
      return res.status(404).json({ success: false, message: 'No player data found' });
    }

    const players = cachedReadJSON(playersPath);
    const player = players[userId];

    if (!player) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    res.json({ success: true, player });
  } catch (err) {
    console.error('Error getting player:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reset individual player
app.post('/api/rpg/players/:userId/reset', requireAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    
    if (!fs.existsSync(playersPath)) {
      return res.status(404).json({ success: false, message: 'No player data found' });
    }

    const players = cachedReadJSON(playersPath);
    
    if (!players[userId]) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    // Keep username, reset everything else
    const username = players[userId].username || 'Unknown';
    players[userId] = {
      userId: userId,
      username: username,
      level: 1,
      xp: 0,
      gold: 0,
      hp: 100,
      maxHp: 100,
      class: 'Warrior',
      internalClass: 'Warrior',
      skillPoints: 0,
      talentPoints: 0,
      inventory: [],
      quests: [],
      completedQuests: [],
      stats: {
        strength: 5,
        dexterity: 5,
        intelligence: 5,
        vitality: 5,
        wisdom: 5,
        charisma: 5,
      },
      professions: {
        blacksmith: { level: 0, xp: 0 },
        mining: { level: 0, xp: 0 },
        chopping: { level: 0, xp: 0 },
        herbing: { level: 0, xp: 0 },
      },
      equippedItems: {},
      availableSkillPoints: 0,
      availableTalentPoints: 0,
      skills: {},
      talents: {},
      badges: [],
      achievements: [],
      guildId: null,
      lastDaily: new Date(0).toISOString(),
      combatLog: [],
      autoGatherMaterials: [],
      pendingGatherAllMaterials: null,
      collectibles: [],
    };

    fs.writeFileSync(playersPath, JSON.stringify(players, null, 2), 'utf8');
    invalidateRPGCache(playersPath);
    res.json({ success: true, message: 'Player reset successfully' });
  } catch (err) {
    console.error('Error resetting player:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete individual player
app.delete('/api/rpg/players/:userId', requireAuth, (req, res) => {
  try {
    const { userId } = req.params;
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    
    if (!fs.existsSync(playersPath)) {
      return res.status(404).json({ success: false, message: 'No player data found' });
    }

    const players = cachedReadJSON(playersPath);
    
    if (!players[userId]) {
      return res.status(404).json({ success: false, message: 'Player not found' });
    }

    delete players[userId];
    
    fs.writeFileSync(playersPath, JSON.stringify(players, null, 2), 'utf8');
    invalidateRPGCache(playersPath);
    res.json({ success: true, message: 'Player deleted successfully' });
  } catch (err) {
    console.error('Error deleting player:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Backup players data
app.post('/api/rpg/players/backup', requireAuth, (req, res) => {
  try {
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    
    if (!fs.existsSync(playersPath)) {
      return res.status(404).json({ success: false, message: 'No player data found' });
    }

    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'data', `players-backup-${timestamp}.json`);
    
    const playersData = fs.readFileSync(playersPath, 'utf8');
    fs.writeFileSync(backupPath, playersData, 'utf8');
    invalidateRPGCache(backupPath);
    
    res.json({ 
      success: true, 
      message: 'Players backup created successfully',
      backupPath: `data/players-backup-${timestamp}.json`
    });
  } catch (err) {
    console.error('Error backing up players:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Reset all players
app.post('/api/rpg/players/reset-all', requireAuth, (req, res) => {
  try {
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    
    if (!fs.existsSync(playersPath)) {
      return res.status(404).json({ success: false, message: 'No player data found' });
    }

    // Create backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'data', `players-pre-reset-${timestamp}.json`);
    const playersData = fs.readFileSync(playersPath, 'utf8');
    fs.writeFileSync(backupPath, playersData, 'utf8');
    invalidateRPGCache(backupPath);

    const players = JSON.parse(playersData);
    const playerCount = Object.keys(players).length;

    // Reset all players
    for (const userId in players) {
      const username = players[userId].username || 'Unknown';
      players[userId] = {
        userId: userId,
        username: username,
        level: 1,
        xp: 0,
        gold: 0,
        hp: 100,
        maxHp: 100,
        inventory: [],
        quests: [],
        stats: {
          strength: 5,
          dexterity: 5,
          intelligence: 5,
          vitality: 5,
        }
      };
    }

    fs.writeFileSync(playersPath, JSON.stringify(players, null, 2), 'utf8');
    invalidateRPGCache(playersPath);
    
    res.json({ 
      success: true, 
      message: `All ${playerCount} players reset successfully`,
      count: playerCount,
      backupPath: `data/players-pre-reset-${timestamp}.json`
    });
  } catch (err) {
    console.error('Error resetting all players:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

// Delete all players
app.post('/api/rpg/players/delete-all', requireAuth, (req, res) => {
  try {
    const playersPath = path.join(process.cwd(), 'data', 'players.json');
    
    if (!fs.existsSync(playersPath)) {
      return res.status(404).json({ success: false, message: 'No player data found' });
    }

    // Create backup first
    const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
    const backupPath = path.join(process.cwd(), 'data', `players-pre-delete-${timestamp}.json`);
    const playersData = fs.readFileSync(playersPath, 'utf8');
    fs.writeFileSync(backupPath, playersData, 'utf8');
    invalidateRPGCache(backupPath);

    const players = JSON.parse(playersData);
    const playerCount = Object.keys(players).length;

    // Write empty object
    fs.writeFileSync(playersPath, '{}', 'utf8');
    invalidateRPGCache(playersPath);
    
    res.json({ 
      success: true, 
      message: `All ${playerCount} players deleted successfully`,
      count: playerCount,
      backupPath: `data/players-pre-delete-${timestamp}.json`
    });
  } catch (err) {
    console.error('Error deleting all players:', err);
    res.status(500).json({ success: false, message: err.message });
  }
});

/* ======================
   DASHBOARD API ROUTES (World-based content management)
====================== */

// Items API (read-only from data definitions)
function flattenItems() {
  const list = [];
  for (const [category, items] of Object.entries(ITEMS)) {
    if (!Array.isArray(items)) continue;
    items.forEach(item => {
      if (!item?.id) return;
      list.push({
        ...item,
        category,
        itemType: item.itemType || category,
      });
    });
  }
  return list;
}

app.get('/api/items', requireAuth, (_req, res) => {
  try {
    res.json(flattenItems());
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/items/:id', requireAuth, (req, res) => {
  try {
    const itemId = req.params.id;
    const item = flattenItems().find(i => i.id === itemId);
    if (!item) return res.status(404).json({ error: 'Item not found' });
    res.json(item);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Recipes API (read-only from data definitions)
app.get('/api/recipes', requireAuth, (_req, res) => {
  try {
    res.json(Object.values(RECIPES));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/:id', requireAuth, (req, res) => {
  try {
    const recipe = RECIPES[req.params.id];
    if (!recipe) return res.status(404).json({ error: 'Recipe not found' });
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/recipes/by-item/:id', requireAuth, (req, res) => {
  try {
    const itemId = req.params.id;
    const recipe = Object.values(RECIPES).find(r => r?.output?.item === itemId);
    if (!recipe) return res.json({});
    res.json(recipe);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get all worlds
app.get('/api/editor/worlds', requireAuth, (req, res) => {
  try {
    loadRPGWorlds();
    res.json(Object.values(global.rpgWorlds || {}));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single world by ID
app.get('/api/editor/worlds/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds();
    const worlds = global.rpgWorlds || {};
    const worldId = req.params.id;
    if (!worlds[worldId]) {
      return res.status(404).json({ error: 'World not found' });
    }
    res.json(worlds[worldId]);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create/Update world
app.post('/api/editor/worlds', requireAuth, (req, res) => {
  try {
    const world = req.body;
    if (!world.name) {
      return res.status(400).json({ error: 'World name required' });
    }
    loadRPGWorlds();
    const worlds = global.rpgWorlds || {};
    const worldId = world.id || 'world_' + Date.now();
    worlds[worldId] = {
      ...world,
      id: worldId,
      quests: world.quests || { main: [], side: [], daily: [] },
      bosses: world.bosses || [],
      dungeons: world.dungeons || [],
      raids: world.raids || [],
      createdAt: world.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };
    global.rpgWorlds = worlds;
    saveRPGWorlds();
    res.json({ success: true, worldId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update world
app.put('/api/editor/worlds/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds();
    const worlds = global.rpgWorlds || {};
    const worldId = req.params.id;
    if (!worlds[worldId]) {
      return res.status(404).json({ error: 'World not found' });
    }
    worlds[worldId] = {
      ...worlds[worldId],
      ...req.body,
      id: worldId,
      updatedAt: new Date().toISOString()
    };
    global.rpgWorlds = worlds;
    saveRPGWorlds();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete world
app.delete('/api/editor/worlds/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds();
    const worlds = global.rpgWorlds || {};
    delete worlds[req.params.id];
    global.rpgWorlds = worlds;
    saveRPGWorlds();
    res.json({ success: true });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get quests for a world
function mapQuestTypeToCategory(type) {
  const t = String(type || 'side').toLowerCase();
  if (t === 'main') return 'main';
  if (t === 'daily') return 'daily';
  if (t === 'weekly') return 'daily';
  if (t === 'side' || t === 'choice' || t === 'repeatable') return 'side';
  return 'side';
}

function mergeQuestsById(listA = [], listB = []) {
  const map = new Map();
  listA.forEach(q => q?.id && map.set(q.id, q));
  listB.forEach(q => q?.id && map.set(q.id, q));
  return Array.from(map.values());
}

app.get('/api/editor/quests', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const worldId = req.query.worldId;
    if (!worldId) {
      return res.status(400).json({ error: 'worldId required' });
    }
    const world = worlds[worldId];
    if (!world) {
      return res.json({ main: [], side: [], daily: [] });
    }
    const legacy = world.quests || { main: [], side: [], daily: [] };
    const entities = world.entities?.quests || {};
    const categorized = { main: [], side: [], daily: [] };
    Object.values(entities).forEach(q => {
      const category = mapQuestTypeToCategory(q?.type || q?.category);
      categorized[category].push(q);
    });
    res.json({
      main: mergeQuestsById(legacy.main, categorized.main),
      side: mergeQuestsById(legacy.side, categorized.side),
      daily: mergeQuestsById(legacy.daily, categorized.daily)
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create quest
app.post('/api/editor/quests', requireAuth, (req, res) => {
  try {
    const quest = req.body;
    if (!quest.title || !quest.worldId) {
      return res.status(400).json({ error: 'Quest title and worldId required' });
    }
    loadRPGWorlds();
    const worlds = global.rpgWorlds || {};
    const world = worlds[quest.worldId];
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    if (!world.quests) world.quests = { main: [], side: [], daily: [] };
    
    const storageCategory = mapQuestTypeToCategory(quest.type);
    
    if (!world.quests[storageCategory]) world.quests[storageCategory] = [];
    
    const questId = quest.id || 'quest_' + Date.now();
    const newQuest = {
      ...quest,
      id: questId,
      name: quest.name || quest.title,
      createdAt: quest.createdAt || new Date().toISOString()
    };
    
    world.quests[storageCategory].push(newQuest);
    if (!world.entities) {
      world.entities = { monsters: {}, items: {}, npcs: {}, locations: {}, dungeons: {}, raids: {}, worldBosses: {}, quests: {} };
    }
    if (!world.entities.quests) world.entities.quests = {};
    world.entities.quests[questId] = {
      ...newQuest,
      category: storageCategory
    };
    world.updatedAt = new Date().toISOString();
    global.rpgWorlds = worlds;
    saveRPGWorlds();
    
    res.json({ success: true, questId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single quest
app.get('/api/editor/quests/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const questId = req.params.id;
    
    for (const world of Object.values(worlds)) {
      const entityQuest = world.entities?.quests?.[questId];
      if (entityQuest) {
        return res.json(entityQuest);
      }
      if (world.quests) {
        for (const type of ['main', 'side', 'daily']) {
          const quest = world.quests[type]?.find(q => q.id === questId);
          if (quest) {
            return res.json(quest);
          }
        }
      }
    }
    res.status(404).json({ error: 'Quest not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update quest
app.put('/api/editor/quests/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const questId = req.params.id;
    const updates = req.body;
    
    for (const world of Object.values(worlds)) {
      if (world.entities?.quests?.[questId]) {
        world.entities.quests[questId] = {
          ...world.entities.quests[questId],
          ...updates,
          id: questId,
          updatedAt: new Date().toISOString()
        };
      }
      if (world.quests) {
        for (const type of ['main', 'side', 'daily']) {
          const questIndex = world.quests[type]?.findIndex(q => q.id === questId);
          if (questIndex !== -1) {
            world.quests[type][questIndex] = {
              ...world.quests[type][questIndex],
              ...updates,
              id: questId,
              updatedAt: new Date().toISOString()
            };
            world.updatedAt = new Date().toISOString();
            global.rpgWorlds = worlds;
            saveRPGWorlds();
            return res.json({ success: true });
          }
        }
      }
      if (world.entities?.quests?.[questId]) {
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Quest not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete quest
app.delete('/api/editor/quests/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const questId = req.params.id;
    
    for (const world of Object.values(worlds)) {
      let deletedEntity = false;
      if (world.entities?.quests?.[questId]) {
        delete world.entities.quests[questId];
        deletedEntity = true;
      }
      if (world.quests) {
        for (const type of ['main', 'side', 'daily']) {
          const questIndex = world.quests[type]?.findIndex(q => q.id === questId);
          if (questIndex !== -1) {
            world.quests[type].splice(questIndex, 1);
            world.updatedAt = new Date().toISOString();
            global.rpgWorlds = worlds;
            saveRPGWorlds();
            return res.json({ success: true });
          }
        }
      }
      if (deletedEntity) {
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Quest not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// === TOWN DEFENCE QUEST ROUTES ===
app.get('/api/defense-quests', requireAuth, async (req, res) => {
  try {
    const defenseQuestsPath = path.join(DATA_DIR, 'defense-quests.json');
    let defenseQuests = [];
    
    // Try to load from JSON file first
    if (fs.existsSync(defenseQuestsPath)) {
      const data = fs.readFileSync(defenseQuestsPath, 'utf8');
      defenseQuests = JSON.parse(data);
    } else {
      // Fall back to code-based quests
      const { DEFENSE_QUESTS } = await import('./Discord bot - test branch/rpg/data/defense-quests.js');
      defenseQuests = DEFENSE_QUESTS;
      // Save them to JSON for future edits
      fs.writeFileSync(defenseQuestsPath, JSON.stringify(defenseQuests, null, 2));
      invalidateRPGCache(defenseQuestsPath);
    }
    
    res.json(defenseQuests);
  } catch (err) {
    console.error('Error loading defense quests:', err);
    res.status(500).json({ error: err.message });
  }
});

app.get('/api/defense-quests/:id', requireAuth, async (req, res) => {
  try {
    const defenseQuestsPath = path.join(DATA_DIR, 'defense-quests.json');
    let defenseQuests = [];
    
    if (fs.existsSync(defenseQuestsPath)) {
      const data = fs.readFileSync(defenseQuestsPath, 'utf8');
      defenseQuests = JSON.parse(data);
    } else {
      const { DEFENSE_QUESTS } = await import('./Discord bot - test branch/rpg/data/defense-quests.js');
      defenseQuests = DEFENSE_QUESTS;
    }
    
    const quest = defenseQuests.find(q => q.id === req.params.id);
    if (!quest) {
      return res.status(404).json({ error: 'Defense quest not found' });
    }
    res.json(quest);
  } catch (err) {
    console.error('Error loading defense quest:', err);
    res.status(500).json({ error: err.message });
  }
});

app.post('/api/defense-quests', requireAuth, (req, res) => {
  try {
    const defenseQuestsPath = path.join(DATA_DIR, 'defense-quests.json');
    let defenseQuests = [];
    
    if (fs.existsSync(defenseQuestsPath)) {
      const data = fs.readFileSync(defenseQuestsPath, 'utf8');
      defenseQuests = JSON.parse(data);
    }
    
    const newQuest = req.body;
    if (!newQuest.id) {
      newQuest.id = 'defense_' + Date.now();
    }
    
    defenseQuests.push(newQuest);
    fs.writeFileSync(defenseQuestsPath, JSON.stringify(defenseQuests, null, 2));
    invalidateRPGCache(defenseQuestsPath);
    
    res.json({ success: true, questId: newQuest.id });
  } catch (err) {
    console.error('Error creating defense quest:', err);
    res.status(500).json({ error: err.message });
  }
});

app.put('/api/defense-quests/:id', requireAuth, (req, res) => {
  try {
    const defenseQuestsPath = path.join(DATA_DIR, 'defense-quests.json');
    let defenseQuests = [];
    
    if (fs.existsSync(defenseQuestsPath)) {
      const data = fs.readFileSync(defenseQuestsPath, 'utf8');
      defenseQuests = JSON.parse(data);
    }
    
    const index = defenseQuests.findIndex(q => q.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Defense quest not found' });
    }
    
    defenseQuests[index] = { ...defenseQuests[index], ...req.body, id: req.params.id };
    fs.writeFileSync(defenseQuestsPath, JSON.stringify(defenseQuests, null, 2));
    invalidateRPGCache(defenseQuestsPath);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error updating defense quest:', err);
    res.status(500).json({ error: err.message });
  }
});

app.delete('/api/defense-quests/:id', requireAuth, (req, res) => {
  try {
    const defenseQuestsPath = path.join(DATA_DIR, 'defense-quests.json');
    let defenseQuests = [];
    
    if (fs.existsSync(defenseQuestsPath)) {
      const data = fs.readFileSync(defenseQuestsPath, 'utf8');
      defenseQuests = JSON.parse(data);
    }
    
    const index = defenseQuests.findIndex(q => q.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Defense quest not found' });
    }
    
    defenseQuests.splice(index, 1);
    fs.writeFileSync(defenseQuestsPath, JSON.stringify(defenseQuests, null, 2));
    invalidateRPGCache(defenseQuestsPath);
    
    res.json({ success: true });
  } catch (err) {
    console.error('Error deleting defense quest:', err);
    res.status(500).json({ error: err.message });
  }
});

// Get bosses for a world
app.get('/api/editor/bosses', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const worldId = req.query.worldId;
    if (!worldId) {
      // Return all bosses if no worldId
      const allBosses = [];
      for (const world of Object.values(worlds)) {
        if (world.entities?.worldBosses) {
          allBosses.push(...Object.values(world.entities.worldBosses));
        }
      }
      return res.json(allBosses);
    }
    const world = worlds[worldId];
    if (!world) {
      return res.json([]);
    }
    const bosses = world.entities?.worldBosses ? Object.values(world.entities.worldBosses) : [];
    res.json(bosses);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create boss
app.post('/api/editor/bosses', requireAuth, (req, res) => {
  try {
    const boss = req.body;
    if (!boss.name || !boss.worldId) {
      return res.status(400).json({ error: 'Boss name and worldId required' });
    }
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const world = worlds[boss.worldId];
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    if (!world.entities) world.entities = { monsters: {}, items: {}, npcs: {}, locations: {}, dungeons: {}, raids: {}, worldBosses: {}, quests: {} };
    if (!world.entities.worldBosses) world.entities.worldBosses = {};
    
    const bossId = boss.id || 'e_' + Date.now();
    const newBoss = {
      ...boss,
      id: bossId,
      createdAt: boss.createdAt || new Date().toISOString()
    };
    
    world.entities.worldBosses[bossId] = newBoss;
    world.updatedAt = new Date().toISOString();
    global.rpgWorlds = worlds;
    saveRPGWorlds();
    
    res.json({ success: true, bossId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single boss
app.get('/api/editor/bosses/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const bossId = req.params.id;
    
    for (const world of Object.values(worlds)) {
      const boss = world.entities?.worldBosses?.[bossId];
      if (boss) {
        return res.json(boss);
      }
    }
    res.status(404).json({ error: 'Boss not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update boss
app.put('/api/editor/bosses/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const bossId = req.params.id;
    const updates = req.body;
    
    for (const world of Object.values(worlds)) {
      const boss = world.entities?.worldBosses?.[bossId];
      if (boss) {
        world.entities.worldBosses[bossId] = {
          ...boss,
          ...updates,
          id: bossId,
          updatedAt: new Date().toISOString()
        };
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Boss not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete boss
app.delete('/api/editor/bosses/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const bossId = req.params.id;
    
    for (const world of Object.values(worlds)) {
      if (world.entities?.worldBosses?.[bossId]) {
        delete world.entities.worldBosses[bossId];
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Boss not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get dungeons for a world
app.get('/api/editor/dungeons', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const worldId = req.query.worldId;
    if (!worldId) {
      return res.status(400).json({ error: 'worldId required' });
    }
    const world = worlds[worldId];
    if (!world) {
      return res.json([]);
    }
    const combined = [];
    if (Array.isArray(world.dungeons)) {
      combined.push(...world.dungeons);
    }
    const entityDungeons = Object.values(world.entities?.dungeons || {});
    if (entityDungeons.length > 0) {
      combined.push(...entityDungeons.map(d => ({
        ...d,
        worldId: d.worldId || world.id || worldId,
      })));
    }

    const byId = new Map();
    for (const dungeon of combined) {
      const id = dungeon?.id || dungeon?.name;
      if (!id) continue;
      if (!byId.has(id)) {
        byId.set(id, { ...dungeon, id });
      }
    }

    res.json(Array.from(byId.values()));
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create dungeon
app.post('/api/editor/dungeons', requireAuth, (req, res) => {
  try {
    const dungeon = req.body;
    if (!dungeon.name || !dungeon.worldId) {
      return res.status(400).json({ error: 'Dungeon name and worldId required' });
    }
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const world = worlds[dungeon.worldId];
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    if (!world.dungeons) world.dungeons = [];
    
    const dungeonId = dungeon.id || 'dungeon_' + Date.now();
    const newDungeon = {
      ...dungeon,
      id: dungeonId,
      createdAt: dungeon.createdAt || new Date().toISOString()
    };
    
    world.dungeons.push(newDungeon);
    world.updatedAt = new Date().toISOString();
    global.rpgWorlds = worlds;
    saveRPGWorlds();
    
    res.json({ success: true, dungeonId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single dungeon
app.get('/api/editor/dungeons/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const dungeonId = req.params.id;
    
    for (const world of Object.values(worlds)) {
      const dungeon = world.dungeons?.find(d => d.id === dungeonId);
      if (dungeon) {
        return res.json(dungeon);
      }
      const entityDungeon = world.entities?.dungeons?.[dungeonId];
      if (entityDungeon) {
        return res.json({
          ...entityDungeon,
          worldId: entityDungeon.worldId || world.id,
        });
      }
    }
    res.status(404).json({ error: 'Dungeon not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update dungeon
app.put('/api/editor/dungeons/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const dungeonId = req.params.id;
    const updates = req.body;
    
    for (const world of Object.values(worlds)) {
      const dungeonIndex = world.dungeons?.findIndex(d => d.id === dungeonId);
      if (dungeonIndex !== -1) {
        world.dungeons[dungeonIndex] = {
          ...world.dungeons[dungeonIndex],
          ...updates,
          id: dungeonId,
          updatedAt: new Date().toISOString()
        };
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }

      if (world.entities?.dungeons?.[dungeonId]) {
        world.entities.dungeons[dungeonId] = {
          ...world.entities.dungeons[dungeonId],
          ...updates,
          id: dungeonId,
          updatedAt: new Date().toISOString()
        };
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Dungeon not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete dungeon
app.delete('/api/editor/dungeons/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const dungeonId = req.params.id;
    
    for (const world of Object.values(worlds)) {
      const dungeonIndex = world.dungeons?.findIndex(d => d.id === dungeonId);
      if (dungeonIndex !== -1) {
        world.dungeons.splice(dungeonIndex, 1);
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }

      if (world.entities?.dungeons?.[dungeonId]) {
        delete world.entities.dungeons[dungeonId];
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Dungeon not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

/* ======================
   RAIDS API ROUTES
====================== */

// Get all raids for a world
app.get('/api/editor/raids', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const worldId = req.query.worldId;
    if (!worldId) {
      return res.status(400).json({ error: 'worldId required' });
    }
    const world = worlds[worldId];
    if (!world) {
      return res.json([]);
    }
    res.json(world.raids || []);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Create raid
app.post('/api/editor/raids', requireAuth, (req, res) => {
  try {
    const raid = req.body;
    if (!raid.name || !raid.worldId) {
      return res.status(400).json({ error: 'Raid name and worldId required' });
    }
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const world = worlds[raid.worldId];
    if (!world) {
      return res.status(404).json({ error: 'World not found' });
    }
    if (!world.raids) world.raids = [];

    const raidId = raid.id || 'raid_' + Date.now();
    const newRaid = {
      ...raid,
      id: raidId,
      createdAt: raid.createdAt || new Date().toISOString()
    };

    world.raids.push(newRaid);
    world.updatedAt = new Date().toISOString();
    global.rpgWorlds = worlds;
    saveRPGWorlds();

    res.json({ success: true, raidId });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Get single raid
app.get('/api/editor/raids/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const raidId = req.params.id;

    for (const world of Object.values(worlds)) {
      const raid = world.raids?.find(r => r.id === raidId);
      if (raid) {
        return res.json(raid);
      }
    }
    res.status(404).json({ error: 'Raid not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Update raid
app.put('/api/editor/raids/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const raidId = req.params.id;
    const updates = req.body;

    for (const world of Object.values(worlds)) {
      const raidIndex = world.raids?.findIndex(r => r.id === raidId);
      if (raidIndex !== -1) {
        world.raids[raidIndex] = {
          ...world.raids[raidIndex],
          ...updates,
          id: raidId,
          updatedAt: new Date().toISOString()
        };
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Raid not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// Delete raid
app.delete('/api/editor/raids/:id', requireAuth, (req, res) => {
  try {
    loadRPGWorlds(); const worlds = global.rpgWorlds || {};
    const raidId = req.params.id;

    for (const world of Object.values(worlds)) {
      const raidIndex = world.raids?.findIndex(r => r.id === raidId);
      if (raidIndex !== -1) {
        world.raids.splice(raidIndex, 1);
        world.updatedAt = new Date().toISOString();
        global.rpgWorlds = worlds;
        saveRPGWorlds();
        return res.json({ success: true });
      }
    }
    res.status(404).json({ error: 'Raid not found' });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

}
