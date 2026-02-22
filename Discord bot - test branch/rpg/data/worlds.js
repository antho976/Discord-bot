/**
 * World Data - Configuration for all worlds
 * Loads from the world editor output when available
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const EDITOR_WORLDS_FILE = path.resolve(__dirname, '../../../data/rpg-worlds.json');

const FALLBACK_WORLDS = [
  {
    id: 1,
    name: 'Beginner\'s Vale',
    description: 'A peaceful starting area for new adventurers',
    minLevel: 1,
    maxLevel: 10,
    bosses: [
      {
        name: 'Goblin King',
        level: 8,
        xpReward: 500,
        loot: ['Iron Sword', 'Copper Plate Armor'],
      },
    ],
  },
  {
    id: 2,
    name: 'Dark Forest',
    description: 'A mysterious forest filled with dangerous creatures',
    minLevel: 8,
    maxLevel: 20,
    bosses: [
      {
        name: 'Shadow Beast',
        level: 18,
        xpReward: 1200,
        loot: ['Steel Sword', 'Shadow Cloak'],
      },
    ],
  },
  {
    id: 3,
    name: 'Mountain Peaks',
    description: 'Treacherous mountains with ancient ruins',
    minLevel: 18,
    maxLevel: 30,
    bosses: [
      {
        name: 'Stone Giant',
        level: 28,
        xpReward: 2000,
        loot: ['Crystal Sword', 'Granite Plate'],
      },
    ],
  },
  {
    id: 4,
    name: 'Infernal Abyss',
    description: 'The final world - home of darkness and chaos',
    minLevel: 28,
    maxLevel: 50,
    bosses: [
      {
        name: 'Demon Lord',
        level: 45,
        xpReward: 5000,
        loot: ['Demonic Blade', 'Crown of Darkness'],
      },
    ],
  },
];

let cachedWorlds = null;
let cachedMtime = 0;

function toNumber(value, fallback) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function createDefaultBoss(worldName, minLevel) {
  const level = minLevel + 5;
  return {
    name: `Guardian of ${worldName}`,
    level,
    hp: level * 120,
    reward: 'Defeat to unlock the next world',
    xpReward: level * 60,
    loot: [],
  };
}

function normalizeBoss(boss, minLevel) {
  const level = toNumber(boss.level, minLevel + 5);
  return {
    name: boss.name || 'World Boss',
    level,
    hp: toNumber(boss.hp || boss.health, level * 120),
    reward: boss.reward || (boss.loot ? `Loot: ${boss.loot}` : 'Great rewards await!'),
    xpReward: toNumber(boss.xpReward, level * 60),
    loot: Array.isArray(boss.loot) ? boss.loot : [],
    description: boss.description || 'A powerful world boss',
  };
}

function loadEditorWorlds() {
  if (!fs.existsSync(EDITOR_WORLDS_FILE)) {
    return [];
  }

  try {
    const raw = fs.readFileSync(EDITOR_WORLDS_FILE, 'utf8');
    const data = JSON.parse(raw);
    const worlds = Object.values(data || {});
    if (!worlds.length) return [];

    const sorted = worlds.sort((a, b) => {
      const tierA = toNumber(a.tier, 1);
      const tierB = toNumber(b.tier, 1);
      if (tierA !== tierB) return tierA - tierB;
      const dateA = new Date(a.createdAt || 0).getTime();
      const dateB = new Date(b.createdAt || 0).getTime();
      return dateA - dateB;
    });

    return sorted.map((world, index) => {
      const tier = toNumber(world.tier, index + 1);
      const minLevel = 1 + (tier - 1) * 10;
      const maxLevel = minLevel + 9;
      const worldName = world.name || `World ${index + 1}`;
      const bossValues = Object.values(world.entities?.worldBosses || {});
      const bosses = bossValues.length
        ? bossValues.map((boss) => normalizeBoss(boss, minLevel))
        : [createDefaultBoss(worldName, minLevel)];

      return {
        id: world.id || index + 1,
        editorId: world.id,
        numericId: index + 1,
        name: worldName,
        description: world.description || 'A world created in the editor.',
        tier,
        minLevel,
        maxLevel,
        bosses,
      };
    });
  } catch {
    return [];
  }
}

function loadWorlds() {
  let mtime = 0;
  if (fs.existsSync(EDITOR_WORLDS_FILE)) {
    try {
      mtime = fs.statSync(EDITOR_WORLDS_FILE).mtimeMs;
    } catch {
      mtime = 0;
    }
  }
  if (cachedWorlds && cachedMtime === mtime) return cachedWorlds;
  const editorWorlds = loadEditorWorlds();
  // Only use editor worlds - no fallback
  if (editorWorlds.length === 0) {
    console.warn('[RPG] No worlds found in editor. Create a world in the world editor tool first.');
  }
  cachedWorlds = editorWorlds;
  cachedMtime = mtime;
  return cachedWorlds;
}

export const WORLDS = loadWorlds();

export function getWorlds() {
  return loadWorlds();
}

export function getWorld(worldId) {
  const worlds = loadWorlds();
  const targetId = String(worldId);
  let found = worlds.find(w => String(w.id) === targetId || String(w.editorId) === targetId || String(w.numericId) === targetId);

  if (!found) {
    const numericId = Number(worldId);
    if (Number.isFinite(numericId)) {
      const sorted = worlds.slice().sort((a, b) => (a.tier || 1) - (b.tier || 1));
      found = sorted[numericId - 1] || null;
    }
  }

  return found || null;
}

export function getFirstWorldId() {
  const worlds = loadWorlds();
  return worlds[0]?.id ?? 1;
}

export function getNextWorldId(currentWorldId) {
  const worlds = loadWorlds();
  const targetId = String(currentWorldId);
  const index = worlds.findIndex(w => String(w.id) === targetId || String(w.editorId) === targetId || String(w.numericId) === targetId);
  if (index === -1 || index >= worlds.length - 1) return null;
  return worlds[index + 1].id;
}

export function getWorldBoss(worldId) {
  const world = getWorld(worldId);
  const boss = world?.bosses?.[0];
  if (!boss) return null;
  return normalizeBoss(boss, world.minLevel ?? 1);
}
