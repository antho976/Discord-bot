/**
 * Guild Shop System
 * Special items purchasable with guild contribution points
 */

export const GUILD_SHOP_ITEMS = {
  // Consumables
  guild_health_potion: {
    id: 'guild_health_potion',
    name: 'Guild Health Elixir',
    description: 'Restores 100% HP. Guild exclusive.',
    icon: '🧪',
    cost: 500, // Guild contribution points
    costType: 'contribution',
    category: 'consumable',
    effect: { type: 'heal', value: 1.0 },
    stock: 'unlimited',
  },
  guild_mana_potion: {
    id: 'guild_mana_potion',
    name: 'Guild Mana Draught',
    description: 'Restores 100% Mana. Guild exclusive.',
    icon: '🔮',
    cost: 500,
    costType: 'contribution',
    category: 'consumable',
    effect: { type: 'mana', value: 1.0 },
    stock: 'unlimited',
  },
  guild_xp_boost: {
    id: 'guild_xp_boost',
    name: 'Guild XP Boost Potion',
    description: '+50% XP for 1 hour',
    icon: '⭐',
    cost: 1000,
    costType: 'contribution',
    category: 'buff',
    effect: { type: 'xp_boost', value: 0.5, duration: 3600000 },
    stock: 'unlimited',
  },
  guild_gold_boost: {
    id: 'guild_gold_boost',
    name: 'Guild Gold Boost Potion',
    description: '+50% Gold for 1 hour',
    icon: '💰',
    cost: 1000,
    costType: 'contribution',
    category: 'buff',
    effect: { type: 'gold_boost', value: 0.5, duration: 3600000 },
    stock: 'unlimited',
  },
  
  // Equipment
  guild_tabard: {
    id: 'guild_tabard',
    name: 'Guild Tabard',
    description: 'Display your guild colors with pride',
    icon: '🎽',
    cost: 2500,
    costType: 'contribution',
    category: 'equipment',
    slot: 'chest',
    stats: { defense: 10, vitality: 5 },
    rarity: 'rare',
    stock: 'unlimited',
  },
  guild_banner: {
    id: 'guild_banner',
    name: 'Guild Banner',
    description: 'A majestic banner bearing your guild emblem',
    icon: '🚩',
    cost: 5000,
    costType: 'contribution',
    category: 'equipment',
    slot: 'weapon',
    stats: { strength: 15, vitality: 10, wisdom: 5 },
    rarity: 'epic',
    stock: 'unlimited',
  },
  
  // Materials
  guild_crafting_token: {
    id: 'guild_crafting_token',
    name: 'Guild Crafting Token',
    description: 'Can be exchanged for rare materials',
    icon: '🎫',
    cost: 750,
    costType: 'contribution',
    category: 'material',
    stock: 'unlimited',
  },
  mythril_ore_pack: {
    id: 'mythril_ore_pack',
    name: 'Mythril Ore Pack (x10)',
    description: '10 Mythril Ore for crafting',
    icon: '⛏️',
    cost: 2000,
    costType: 'contribution',
    category: 'material',
    gives: { material: 'mythril_ore', quantity: 10 },
    stock: 'unlimited',
  },
  adamantite_ore_pack: {
    id: 'adamantite_ore_pack',
    name: 'Adamantite Ore Pack (x5)',
    description: '5 Adamantite Ore for crafting',
    icon: '💎',
    cost: 3500,
    costType: 'contribution',
    category: 'material',
    gives: { material: 'adamantite_ore', quantity: 5 },
    stock: 'unlimited',
  },
  
  // Special Items
  guild_teleport_scroll: {
    id: 'guild_teleport_scroll',
    name: 'Guild Hall Teleport',
    description: 'Instantly teleport to guild hall',
    icon: '📜',
    cost: 250,
    costType: 'contribution',
    category: 'consumable',
    effect: { type: 'teleport', location: 'guild_hall' },
    stock: 'unlimited',
  },
  guild_summon_scroll: {
    id: 'guild_summon_scroll',
    name: 'Guild Member Summon',
    description: 'Summon a guild member to your location (requires consent)',
    icon: '🌀',
    cost: 1500,
    costType: 'contribution',
    category: 'special',
    effect: { type: 'summon_member' },
    stock: 'unlimited',
  },
  
  // Limited/Rare Items
  guild_legendary_chest: {
    id: 'guild_legendary_chest',
    name: 'Guild Legendary Chest',
    description: 'Contains random legendary items',
    icon: '🎁',
    cost: 10000,
    costType: 'contribution',
    category: 'chest',
    rarity: 'legendary',
    stock: 'limited',
    weeklyStock: 3, // Only 3 available per week
  },
  guild_mount_token: {
    id: 'guild_mount_token',
    name: 'Guild Mount Token',
    description: 'Unlock a special guild mount',
    icon: '🐎',
    cost: 25000,
    costType: 'contribution',
    category: 'special',
    rarity: 'epic',
    stock: 'limited',
    weeklyStock: 1,
  },
  guild_pet_egg: {
    id: 'guild_pet_egg',
    name: 'Guild Pet Egg',
    description: 'Hatch a special guild companion',
    icon: '🥚',
    cost: 15000,
    costType: 'contribution',
    category: 'pet',
    rarity: 'rare',
    stock: 'limited',
    weeklyStock: 2,
  },
};

export const GUILD_SHOP_CATEGORIES = {
  consumable: { name: 'Consumables', icon: '🧪' },
  buff: { name: 'Buffs', icon: '✨' },
  equipment: { name: 'Equipment', icon: '⚔️' },
  material: { name: 'Materials', icon: '📦' },
  special: { name: 'Special Items', icon: '🌟' },
  chest: { name: 'Chests', icon: '🎁' },
  pet: { name: 'Pets', icon: '🐾' },
};

/**
 * Get item by ID
 */
export function getGuildShopItem(id) {
  return GUILD_SHOP_ITEMS[id] || null;
}

/**
 * Get items by category
 */
export function getGuildShopItemsByCategory(category) {
  return Object.values(GUILD_SHOP_ITEMS).filter(item => item.category === category);
}

/**
 * Check if player can afford item
 */
export function canAffordGuildShopItem(item, playerContribution) {
  if (item.costType === 'contribution') {
    return playerContribution >= item.cost;
  }
  return false;
}

/**
 * Get available weekly stock for an item
 */
export function getWeeklyStock(item, guild) {
  if (item.stock !== 'limited') {
    return null; // Unlimited
  }
  
  const weeklyPurchases = guild.shopPurchases || {};
  const currentWeek = Math.floor(Date.now() / (7 * 24 * 60 * 60 * 1000));
  
  // Reset if new week
  if (!weeklyPurchases.week || weeklyPurchases.week !== currentWeek) {
    return item.weeklyStock;
  }
  
  const purchased = weeklyPurchases[item.id] || 0;
  return Math.max(0, item.weeklyStock - purchased);
}
