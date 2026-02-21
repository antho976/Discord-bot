/**
 * Quest System (Extended)
 * Supports: Main Quests, Daily Quests, Weekly Quests, Side Quests
 * All editable through dashboard
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const QUESTS_CONFIG_FILE = path.resolve(__dirname, '../../data/quests-config.json');

// Default structure
const DEFAULT_QUESTS_CONFIG = {
  mainQuests: [],
  dailyQuests: [],
  weeklyQuests: [],
  sideQuests: [],
};

let cachedConfig = null;

/**
 * Load quests configuration from file
 */
export function loadQuestsConfig() {
  try {
    if (fs.existsSync(QUESTS_CONFIG_FILE)) {
      const data = fs.readFileSync(QUESTS_CONFIG_FILE, 'utf8');
      cachedConfig = JSON.parse(data);
      return cachedConfig;
    }
  } catch (err) {
    console.error('[Quests] Failed to load config:', err);
  }
  cachedConfig = JSON.parse(JSON.stringify(DEFAULT_QUESTS_CONFIG));
  return cachedConfig;
}

/**
 * Save quests configuration to file
 */
export function saveQuestsConfig(config) {
  try {
    const dir = path.dirname(QUESTS_CONFIG_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(QUESTS_CONFIG_FILE, JSON.stringify(config, null, 2));
    cachedConfig = JSON.parse(JSON.stringify(config));
    return true;
  } catch (err) {
    console.error('[Quests] Failed to save config:', err);
    return false;
  }
}

/**
 * Get all main quests
 */
export function getMainQuests() {
  const config = cachedConfig || loadQuestsConfig();
  return config.mainQuests || [];
}

/**
 * Get available daily quests for a player (today only)
 */
export function getDailyQuests(player) {
  const config = cachedConfig || loadQuestsConfig();
  const dailies = config.dailyQuests || [];
  return dailies.filter(q => {
    const completed = player.questFlags?.[q.id] || 0;
    return completed === 0 || (Date.now() - completed > 86400000); // 24h reset
  });
}

/**
 * Get available weekly quests for a player (this week only)
 */
export function getWeeklyQuests(player) {
  const config = cachedConfig || loadQuestsConfig();
  const weeklies = config.weeklyQuests || [];
  const now = new Date();
  const weekStart = new Date(now);
  weekStart.setDate(weekStart.getDate() - weekStart.getDay()); // Sunday

  return weeklies.filter(q => {
    const completed = player.questFlags?.[`${q.id}_completed_at`];
    if (!completed) return true;
    const completedDate = new Date(completed);
    return completedDate < weekStart;
  });
}

/**
 * Get all side quests
 */
export function getSideQuests(player) {
  const config = cachedConfig || loadQuestsConfig();
  const sides = config.sideQuests || [];
  return sides.filter(q => !player.questFlags?.[q.id]); // Not completed
}

/**
 * Get quest by ID from any category
 */
export function getQuestById(questId) {
  const config = cachedConfig || loadQuestsConfig();
  const search = (arr) => arr.find(q => q.id === questId);
  return (
    search(config.mainQuests) ||
    search(config.dailyQuests) ||
    search(config.weeklyQuests) ||
    search(config.sideQuests)
  );
}

/**
 * Create a new quest
 */
export function createQuest(questData) {
  const config = cachedConfig || loadQuestsConfig();
  const { type, ...rest } = questData;

  const quest = {
    id: rest.id || `q_${Date.now()}`,
    title: rest.title || 'Untitled Quest',
    description: rest.description || '',
    type: type || 'side', // main, daily, weekly, side
    worldId: rest.worldId || null, // Link to specific world
    minLevel: rest.minLevel || 1,
    rewards: rest.rewards || { xp: 100, gold: 50, items: [] },
    objectives: rest.objectives || [],
    branches: rest.branches || [], // For branching quests
    enabled: rest.enabled !== false,
  };

  if (type === 'main') config.mainQuests.push(quest);
  else if (type === 'daily') config.dailyQuests.push(quest);
  else if (type === 'weekly') config.weeklyQuests.push(quest);
  else config.sideQuests.push(quest);

  saveQuestsConfig(config);
  return quest;
}

/**
 * Update a quest
 */
export function updateQuest(questId, updates) {
  const config = cachedConfig || loadQuestsConfig();
  const categories = [config.mainQuests, config.dailyQuests, config.weeklyQuests, config.sideQuests];

  for (const category of categories) {
    const idx = category.findIndex(q => q.id === questId);
    if (idx !== -1) {
      category[idx] = { ...category[idx], ...updates };
      saveQuestsConfig(config);
      return category[idx];
    }
  }
  return null;
}

/**
 * Delete a quest
 */
export function deleteQuest(questId) {
  const config = cachedConfig || loadQuestsConfig();
  const categories = [config.mainQuests, config.dailyQuests, config.weeklyQuests, config.sideQuests];

  for (const category of categories) {
    const idx = category.findIndex(q => q.id === questId);
    if (idx !== -1) {
      category.splice(idx, 1);
      saveQuestsConfig(config);
      return true;
    }
  }
  return false;
}

/**
 * Check if player can start a quest
 */
export function canStartQuest(player, quest) {
  if (!quest) return false;
  // Allow starting quests regardless of level (show as recommended)
  return true;
}

/**
 * Complete a quest for a player
 */
export function completeQuest(player, questId) {
  const quest = getQuestById(questId);
  if (!quest) return null;

  const rewards = quest.rewards || {};
  player.questFlags[questId] = Date.now();

  return {
    xp: rewards.xp || 0,
    gold: rewards.gold || 0,
    items: rewards.items || [],
  };
}

/**
 * Get all quests for a specific world
 */
export function getQuestsByWorld(worldId) {
  const config = cachedConfig || loadQuestsConfig();
  const allQuests = [
    ...config.mainQuests,
    ...config.dailyQuests,
    ...config.weeklyQuests,
    ...config.sideQuests,
  ];
  return allQuests.filter(q => q.worldId === worldId);
}
