/**
 * Guild Shop System - XP-based cosmetics and exclusive items
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const GUILD_SHOP_FILE = path.join(__dirname, '../../data', 'guild-shop.json');

// Default shop items
const DEFAULT_SHOP_ITEMS = {
  cosmetics: [
    {
      id: 'cosmetic_golden_aura',
      name: '✨ Golden Aura',
      description: 'A shimmering golden glow around your character',
      price: 500,
      type: 'cosmetic',
      rarity: 'common',
    },
    {
      id: 'cosmetic_shadow_cloak',
      name: '🖤 Shadow Cloak',
      description: 'A mysterious shadow that follows you',
      price: 750,
      type: 'cosmetic',
      rarity: 'rare',
    },
    {
      id: 'cosmetic_flame_wings',
      name: '🔥 Flame Wings',
      description: 'Fiery wings that manifest in combat',
      price: 1000,
      type: 'cosmetic',
      rarity: 'rare',
    },
    {
      id: 'cosmetic_starlight',
      name: '⭐ Starlight Particles',
      description: 'Beautiful starlight particles follow your steps',
      price: 1500,
      type: 'cosmetic',
      rarity: 'legendary',
    },
    {
      id: 'cosmetic_void_essence',
      name: '🌌 Void Essence',
      description: 'Tap into the power of the void itself',
      price: 2500,
      type: 'cosmetic',
      rarity: 'legendary',
    },
  ],
  consumables: [
    {
      id: 'potion_guild_elixir',
      name: '🧪 Guild Elixir',
      description: 'Grants +50% XP for 1 hour',
      price: 200,
      type: 'consumable',
      effect: 'xp_boost',
      duration: 3600000,
    },
    {
      id: 'potion_guild_blessing',
      name: '⛪ Guild Blessing',
      description: 'Guarantees quest completion within 30 minutes',
      price: 300,
      type: 'consumable',
      effect: 'quest_boost',
      duration: 1800000,
    },
  ],
  exclusive: [
    {
      id: 'exclusive_rank_s_medal',
      name: '🏆 Rank S Medal',
      description: 'Prove your ultimate guild rank status (visual only)',
      price: 5000,
      type: 'exclusive',
      requirement: 'rank_s',
    },
    {
      id: 'exclusive_quest_master_title',
      name: '👑 Quest Master Title',
      description: 'Display a special title next to your name',
      price: 3000,
      type: 'exclusive',
      requirement: 'quest_master',
    },
  ],
};

// Load shop items
export function loadShopItems() {
  try {
    if (fs.existsSync(GUILD_SHOP_FILE)) {
      const data = JSON.parse(fs.readFileSync(GUILD_SHOP_FILE, 'utf8'));
      return data || DEFAULT_SHOP_ITEMS;
    }
  } catch (err) {
    console.error('[Guild Shop] Error loading items:', err);
  }

  // Save defaults if not existing
  saveShopItems(DEFAULT_SHOP_ITEMS);
  return DEFAULT_SHOP_ITEMS;
}

// Save shop items
function saveShopItems(items) {
  try {
    fs.writeFileSync(GUILD_SHOP_FILE, JSON.stringify(items, null, 2));
  } catch (err) {
    console.error('[Guild Shop] Error saving items:', err);
  }
}

// Get all shop items
export function getAllShopItems() {
  return loadShopItems();
}

// Get items by category
export function getShopItemsByCategory(category) {
  const items = loadShopItems();
  return items[category] || [];
}

// Get single item
export function getShopItem(itemId) {
  const items = loadShopItems();
  for (const category of Object.values(items)) {
    const item = category.find(i => i.id === itemId);
    if (item) return item;
  }
  return null;
}

// Purchase item (deduct guild XP)
export function purchaseShopItem(player, itemId) {
  const item = getShopItem(itemId);
  if (!item) {
    return { success: false, message: 'Item not found' };
  }

  if (player.guildXP < item.price) {
    return { success: false, message: `Not enough Guild XP (need ${item.price}, have ${player.guildXP})` };
  }

  player.guildXP -= item.price;
  player.shopInventory = player.shopInventory || [];
  
  player.shopInventory.push({
    id: itemId,
    purchasedAt: new Date().toISOString(),
    active: false,
  });

  return { success: true, message: `Purchased ${item.name}`, item };
}

// Activate cosmetic/effect
export function activateShopItem(player, itemId) {
  const item = getShopItem(itemId);
  if (!item) {
    return { success: false, message: 'Item not found' };
  }

  player.shopInventory = player.shopInventory || [];
  const inventoryItem = player.shopInventory.find(i => i.id === itemId);

  if (!inventoryItem) {
    return { success: false, message: 'You do not own this item' };
  }

  // Deactivate all active cosmetics
  if (item.type === 'cosmetic') {
    player.shopInventory.forEach(i => {
      const shopItem = getShopItem(i.id);
      if (shopItem && shopItem.type === 'cosmetic') {
        i.active = false;
      }
    });
  }

  // Activate this item
  inventoryItem.active = true;
  inventoryItem.activatedAt = new Date().toISOString();

  return { success: true, message: `Activated ${item.name}` };
}

// Get player's active cosmetics
export function getPlayerActiveCosmetals(player) {
  if (!player.shopInventory) return [];
  return player.shopInventory.filter(i => {
    const item = getShopItem(i.id);
    return item && item.type === 'cosmetic' && i.active;
  });
}

// Add shop item to catalog
export function addShopItem(category, itemData) {
  const items = loadShopItems();
  if (!items[category]) items[category] = [];

  const newItem = {
    id: `custom_${category}_${Date.now()}`,
    ...itemData,
  };

  items[category].push(newItem);
  saveShopItems(items);

  return newItem;
}

// Remove shop item
export function removeShopItem(itemId) {
  const items = loadShopItems();
  for (const category of Object.keys(items)) {
    const idx = items[category].findIndex(i => i.id === itemId);
    if (idx >= 0) {
      items[category].splice(idx, 1);
      saveShopItems(items);
      return { success: true, message: 'Item removed' };
    }
  }
  return { success: false, message: 'Item not found' };
}

// Update shop item
export function updateShopItem(itemId, updates) {
  const items = loadShopItems();
  for (const category of Object.keys(items)) {
    const item = items[category].find(i => i.id === itemId);
    if (item) {
      Object.assign(item, updates);
      saveShopItems(items);
      return { success: true, message: 'Item updated', item };
    }
  }
  return { success: false, message: 'Item not found' };
}
