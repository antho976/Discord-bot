/**
 * Guild Quest System - Daily/Weekly/Limited Quests
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRIMARY_GUILD_QUESTS_FILE = path.resolve(__dirname, 'guild-quests.json');
const FALLBACK_GUILD_QUESTS_FILE = path.resolve(__dirname, '../../../data/guild-quests.json');

let cachedGuildQuests = null;

/**
 * Load guild quests from file
 */
function loadGuildQuests() {
  if (cachedGuildQuests) return cachedGuildQuests;
  
  try {
    const primaryExists = fs.existsSync(PRIMARY_GUILD_QUESTS_FILE);
    const fallbackExists = fs.existsSync(FALLBACK_GUILD_QUESTS_FILE);

    if (primaryExists || fallbackExists) {
      const filePath = primaryExists ? PRIMARY_GUILD_QUESTS_FILE : FALLBACK_GUILD_QUESTS_FILE;
      const data = fs.readFileSync(filePath, 'utf8');
      cachedGuildQuests = normalizeGuildQuests(JSON.parse(data));
      return cachedGuildQuests;
    }
  } catch (err) {
    console.error('[Guild Quests] Failed to load:', err);
  }
  
  // Default guild quests
  cachedGuildQuests = {
    daily: [
      {
        id: 'daily_combat_5',
        title: 'Daily Combat Training',
        description: 'Win 5 combat encounters',
        type: 'daily',
        objectives: ['Win 5 combats'],
        rewards: { guildXP: 20, gold: 100, xp: 50 },
        minLevel: 1
      },
      {
        id: 'daily_gather_10',
        title: 'Daily Gathering',
        description: 'Gather 10 materials',
        type: 'daily',
        objectives: ['Gather 10 materials'],
        rewards: { guildXP: 15, gold: 75, xp: 30 },
        minLevel: 1
      },
      {
        id: 'daily_dungeon_1',
        title: 'Daily Dungeon Clear',
        description: 'Complete 1 dungeon',
        type: 'daily',
        objectives: ['Complete 1 dungeon'],
        rewards: { guildXP: 30, gold: 150, xp: 100 },
        minLevel: 5
      },
    ],
    weekly: [
      {
        id: 'weekly_combat_25',
        title: 'Weekly Combat Master',
        description: 'Win 25 combat encounters this week',
        type: 'weekly',
        objectives: ['Win 25 combats'],
        rewards: { guildXP: 100, gold: 500, xp: 250 },
        minLevel: 1
      },
      {
        id: 'weekly_dungeon_5',
        title: 'Weekly Dungeon Explorer',
        description: 'Complete 5 dungeons this week',
        type: 'weekly',
        objectives: ['Complete 5 dungeons'],
        rewards: { guildXP: 150, gold: 750, xp: 500 },
        minLevel: 10
      },
      {
        id: 'weekly_boss_1',
        title: 'Weekly Boss Slayer',
        description: 'Defeat 1 world boss this week',
        type: 'weekly',
        objectives: ['Defeat 1 world boss'],
        rewards: { guildXP: 200, gold: 1000, xp: 750 },
        minLevel: 20
      },
    ],
    limited: [
      {
        id: 'limited_rare_monster',
        title: 'Rare Monster Hunt',
        description: 'A rare monster has been spotted!',
        type: 'limited',
        objectives: ['Defeat the Rare Goblin King'],
        rewards: { guildXP: 50, gold: 300, items: ['item_1770440470158'] },
        maxClaims: 10,
        currentClaims: 0,
        minLevel: 1,
        worldId: 1
      },
    ],
  };
  
  cachedGuildQuests = normalizeGuildQuests(cachedGuildQuests);
  saveGuildQuests(cachedGuildQuests);
  return cachedGuildQuests;
}

/**
 * Save guild quests to file
 */
function saveGuildQuests(quests) {
  try {
    const dir = path.dirname(PRIMARY_GUILD_QUESTS_FILE);
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
    fs.writeFileSync(PRIMARY_GUILD_QUESTS_FILE, JSON.stringify(quests, null, 2));
    cachedGuildQuests = normalizeGuildQuests(quests);
  } catch (err) {
    console.error('[Guild Quests] Failed to save:', err);
  }
}

function normalizeGuildQuests(quests) {
  const normalized = {
    daily: (quests?.daily || []).map(normalizeGuildQuest),
    weekly: (quests?.weekly || []).map(normalizeGuildQuest),
    limited: (quests?.limited || []).map(normalizeGuildQuest),
  };

  return normalized;
}

function normalizeGuildQuest(quest) {
  const normalizedObjective = normalizeGuildQuestObjective(quest);
  const currentClaims = Number(quest.claimedCount ?? quest.currentClaims ?? 0);
  const maxClaims = Number(quest.maxClaims ?? 0);

  return {
    ...quest,
    objective: normalizedObjective,
    claimedCount: currentClaims,
    currentClaims: currentClaims,
    maxClaims: maxClaims,
  };
}

export function normalizeGuildQuestObjective(quest) {
  if (quest?.objective?.type) {
    return {
      type: quest.objective.type,
      target: quest.objective.target || 'enemy',
      count: Number(quest.objective.count || 1),
    };
  }

  const objectiveText = Array.isArray(quest?.objectives) ? quest.objectives[0] : null;
  if (!objectiveText) return null;

  const lower = objectiveText.toLowerCase();
  const countMatch = lower.match(/(\d+)/);
  const count = countMatch ? parseInt(countMatch[1], 10) : 1;

  let type = 'kill';
  let target = 'enemy';

  if (lower.includes('gather')) {
    type = 'gather';
    target = 'material';
  } else if (lower.includes('dungeon') || lower.includes('explore')) {
    type = 'explore';
    target = 'dungeon';
  } else if (lower.includes('boss')) {
    type = 'kill';
    target = 'boss';
  } else if (lower.includes('combat') || lower.includes('defeat') || lower.includes('kill') || lower.includes('win')) {
    type = 'kill';
    target = 'enemy';
  }

  return { type, target, count };
}

function getQuestCurrentClaims(quest) {
  return Number(quest.claimedCount ?? quest.currentClaims ?? 0);
}

function getQuestMaxClaims(quest) {
  return Number(quest.maxClaims ?? 0);
}

function isQuestExpired(quest) {
  if (!quest?.expiresAt) return false;
  return new Date(quest.expiresAt).getTime() < Date.now();
}

/**
 * Get available daily quests for player
 */
export function getAvailableDailyQuests(playerLevel, completedToday) {
  const quests = loadGuildQuests();
  return quests.daily.filter(q => 
    isLevelSufficient(playerLevel, q.minLevel) &&
    !completedToday.includes(q.id)
  );
}

/**
 * Get available weekly quests for player
 */
export function getAvailableWeeklyQuests(playerLevel, completedThisWeek) {
  const quests = loadGuildQuests();
  return quests.weekly.filter(q => 
    isLevelSufficient(playerLevel, q.minLevel) &&
    !completedThisWeek.includes(q.id)
  );
}

/**
 * Get available limited quests for player
 */
export function getAvailableLimitedQuests(playerLevel, claimedQuests, worldId) {
  const quests = loadGuildQuests();
  return quests.limited.filter(q => 
    isLevelSufficient(playerLevel, q.minLevel) &&
    !claimedQuests.includes(q.id) &&
    getQuestCurrentClaims(q) < getQuestMaxClaims(q) &&
    (!q.worldId || q.worldId === worldId) &&
    !isQuestExpired(q)
  );
}

/**
 * Claim a limited quest
 */
export function claimLimitedQuest(questId, playerId) {
  const quests = loadGuildQuests();
  const quest = quests.limited.find(q => q.id === questId);
  
  if (!quest) {
    return { success: false, error: 'Quest not found' };
  }

  if (isQuestExpired(quest)) {
    return { success: false, error: 'Quest expired' };
  }
  
  const currentClaims = getQuestCurrentClaims(quest);
  const maxClaims = getQuestMaxClaims(quest);

  if (currentClaims >= maxClaims) {
    return { success: false, error: 'Quest full - someone claimed it first!' };
  }
  
  quest.currentClaims = currentClaims + 1;
  quest.claimedCount = quest.currentClaims;
  saveGuildQuests(quests);
  
  return { success: true, quest };
}

/**
 * Get guild quest by ID
 */
export function getGuildQuestById(questId) {
  const quests = loadGuildQuests();
  
  let quest = quests.daily.find(q => q.id === questId);
  if (quest) return quest;
  
  quest = quests.weekly.find(q => q.id === questId);
  if (quest) return quest;
  
  quest = quests.limited.find(q => q.id === questId);
  return quest || null;
}

export function getAllGuildQuests() {
  return loadGuildQuests();
}

/**
 * Check if player level is sufficient
 */
function isLevelSufficient(playerLevel, requiredLevel) {
  return playerLevel >= requiredLevel;
}

/**
 * Refresh cache
 */
export function refreshGuildQuestCache() {
  cachedGuildQuests = null;
  return loadGuildQuests();
}
/**
 * Quest Chain Functions
 */

// Check if a quest has prerequisites met
export function checkQuestChainPrerequisites(questId, player) {
  const quest = getGuildQuestById(questId);
  if (!quest || !quest.prerequisiteQuestId) return true;

  // Check if prerequisite quest is completed
  const completed = [
    ...player.dailyQuestsCompleted,
    ...player.weeklyQuestsCompleted,
    ...player.limitedQuestsCompleted
  ];

  return completed.includes(quest.prerequisiteQuestId);
}

// Get quest chain bonus (25% reward bonus if completed in sequence within 7 days)
export function getQuestChainBonus(questId, player) {
  const quest = getGuildQuestById(questId);
  if (!quest || !quest.prerequisiteQuestId) return 1.0; // No bonus

  // Check if prerequisite was completed recently (within 7 days)
  const recentlyCompleted = player.questChainProgress || {};
  const prerequisiteTime = recentlyCompleted[quest.prerequisiteQuestId];

  if (!prerequisiteTime) return 1.0;

  const daysPassed = (Date.now() - prerequisiteTime) / (1000 * 60 * 60 * 24);
  if (daysPassed > 7) return 1.0;

  return 1.25; // 25% bonus
}

// Create a simple quest chain (helper function for dashboard)
export function createQuestChain(quests) {
  // quests = [{title, description, ...questData}, ...]
  // Links them together in sequence
  const chainedQuests = quests.map((q, idx) => ({
    ...q,
    prerequisiteQuestId: idx > 0 ? quests[idx - 1].id : null,
    chainIndex: idx,
    chainLength: quests.length,
  }));

  return chainedQuests;
}