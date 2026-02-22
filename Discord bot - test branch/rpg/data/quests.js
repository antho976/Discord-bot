/**
 * Quest Data - Loaded from world editor output
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { loadBalanceData } from './balance.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const EDITOR_WORLDS_FILE = path.resolve(__dirname, '../../../data/rpg-worlds.json');

let cachedQuests = null;
let cachedMtime = 0;

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function normalizeReward(reward, level, type = 'main') {
  const balance = loadBalanceData();
  const mainMult = Number(balance.questMainXpMultiplier) || 1;
  const otherMult = Number(balance.questOtherXpMultiplier) || 1;
  const xpMult = type === 'main' ? mainMult : otherMult;

  const baseReward = (xp, gold, items = []) => ({
    xp: Math.floor(xp * xpMult),
    gold: gold,
    items,
  });

  if (!reward) {
    return baseReward(level * 20, level * 10, []);
  }

  if (typeof reward === 'object') {
    return baseReward(
      toNumber(reward.xp, level * 20),
      toNumber(reward.gold, level * 10),
      Array.isArray(reward.items) ? reward.items : []
    );
  }

  if (typeof reward === 'string') {
    try {
      const parsed = JSON.parse(reward);
      return baseReward(
        toNumber(parsed.xp, level * 20),
        toNumber(parsed.gold, level * 10),
        Array.isArray(parsed.items) ? parsed.items : []
      );
    } catch {
      return baseReward(level * 20, level * 10, []);
    }
  }

  return baseReward(level * 20, level * 10, []);
}

function normalizeQuest(quest, worldId, worldMinLevel) {
  const level = toNumber(quest.minLevel ?? quest.level, worldMinLevel);
  const type = String(quest.type || quest.category || 'main').toLowerCase();

  return {
    ...quest,
    id: quest.id || `${worldId}-${Date.now()}`,
    name: quest.name || 'Untitled Quest',
    description: quest.description || 'A quest created in the world editor.',
    world: worldId,
    minLevel: level,
    reward: normalizeReward(quest.reward || quest.rewards, level, type),
    type,
  };
}

function loadEditorQuests() {
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

      // Build a merged quest map: start with entities.quests, then overlay
      // with world.quests arrays (which contain chain fields like nextQuestId/branches)
      const questMap = new Map();

      // 1) Load from entities.quests (base data, may lack chain fields)
      const entitiesQuests = Object.values(world.entities?.quests || {});
      entitiesQuests.forEach(q => {
        if (q && q.id) questMap.set(q.id, { ...q });
      });

      // 2) Overlay from world.quests categorized arrays (has nextQuestId, branches)
      const arrayCategories = ['main', 'side', 'daily'];
      arrayCategories.forEach(cat => {
        const arr = world.quests?.[cat];
        if (Array.isArray(arr)) {
          arr.forEach(q => {
            if (!q || !q.id) return;
            const existing = questMap.get(q.id);
            if (existing) {
              // Merge: array version wins for chain fields, keep everything else
              questMap.set(q.id, { ...existing, ...q });
            } else {
              questMap.set(q.id, { ...q });
            }
          });
        }
      });

      const categorized = { main: [], side: [], daily: [] };
      questMap.forEach((q) => {
        const normalized = normalizeQuest(q, worldId, worldMinLevel);
        if (normalized.type === 'daily') categorized.daily.push(normalized);
        else if (normalized.type === 'side') categorized.side.push(normalized);
        else categorized.main.push(normalized);
      });

      result[`world${worldId}`] = categorized;
    });

    return result;
  } catch {
    return {};
  }
}

function loadQuests() {
  let mtime = 0;
  if (fs.existsSync(EDITOR_WORLDS_FILE)) {
    try {
      mtime = fs.statSync(EDITOR_WORLDS_FILE).mtimeMs;
    } catch {
      mtime = 0;
    }
  }
  if (cachedQuests && cachedMtime === mtime) return cachedQuests;
  const editorQuests = loadEditorQuests();
  if (Object.keys(editorQuests).length === 0) {
    console.warn('[RPG] No quests found in editor. Create quests in the world editor tool first.');
  }
  cachedQuests = editorQuests;
  cachedMtime = mtime;
  return cachedQuests;
}

export const QUESTS = loadQuests();

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
 * Get quests for a specific world
 */
export function getQuestsByWorld(worldId) {
  const key = resolveWorldKey(worldId) || `world${worldId}`;
  const block = loadQuests()[key];
  if (!block) return [];
  return [...(block.main || []), ...(block.side || []), ...(block.daily || [])];
}

export function getQuestCategoriesByWorld(worldId) {
  const key = resolveWorldKey(worldId) || `world${worldId}`;
  const block = loadQuests()[key];
  return {
    main: block?.main || [],
    side: block?.side || [],
    daily: block?.daily || [],
  };
}

/**
 * Get quest by ID
 */
export function getQuestById(questId) {
  for (const block of Object.values(loadQuests())) {
    const quest = [...(block.main || []), ...(block.side || []), ...(block.daily || [])]
      .find(q => q.id === questId);
    if (quest) return quest;
  }
  return null;
}

/**
 * Get available quests for a player
 */
export function getAvailableQuests(playerLevel, worldId) {
  const quests = getQuestsByWorld(worldId);
  return quests.filter(q => q.minLevel <= playerLevel);
}
