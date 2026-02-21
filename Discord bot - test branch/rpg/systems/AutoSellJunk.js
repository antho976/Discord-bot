/**
 * Auto-Sell Junk Feature - Automatically sell low-rarity items
 */

class AutoSellJunk {
  constructor() {
    // Map<playerId, settings>
    this.playerSettings = new Map();
  }

  /**
   * Initialize player auto-sell settings
   */
  initializeSettings(playerId) {
    this.playerSettings.set(playerId, {
      playerId,
      enabled: false,
      sellCommon: false,
      sellUncommon: false,
      sellRare: false,
      sellEpic: false,
      sellLegendary: false,
      excludedItems: [],
      totalSold: 0,
      totalGoldEarned: 0,
      lastSoldItems: []
    });
  }

  /**
   * Get player settings
   */
  getSettings(playerId) {
    if (!this.playerSettings.has(playerId)) {
      this.initializeSettings(playerId);
    }
    return this.playerSettings.get(playerId);
  }

  /**
   * Enable auto-sell
   */
  enableAutoSell(playerId) {
    const settings = this.getSettings(playerId);
    settings.enabled = true;
    return { success: true, message: 'Auto-sell enabled' };
  }

  /**
   * Disable auto-sell
   */
  disableAutoSell(playerId) {
    const settings = this.getSettings(playerId);
    settings.enabled = false;
    return { success: true, message: 'Auto-sell disabled' };
  }

  /**
   * Set rarities to auto-sell
   */
  setAutoSellRarities(playerId, rarities) {
    const settings = this.getSettings(playerId);

    settings.sellCommon = rarities.includes('common');
    settings.sellUncommon = rarities.includes('uncommon');
    settings.sellRare = rarities.includes('rare');
    settings.sellEpic = rarities.includes('epic');
    settings.sellLegendary = rarities.includes('legendary');

    return { success: true, message: `Auto-sell set for: ${rarities.join(', ')}` };
  }

  /**
   * Add item to exclude list
   */
  excludeItem(playerId, itemId, itemName) {
    const settings = this.getSettings(playerId);

    if (!settings.excludedItems.includes(itemId)) {
      settings.excludedItems.push({ itemId, itemName });
    }

    return { success: true, message: `${itemName} excluded from auto-sell` };
  }

  /**
   * Remove item from exclude list
   */
  unexcludeItem(playerId, itemId) {
    const settings = this.getSettings(playerId);
    const index = settings.excludedItems.findIndex(i => i.itemId === itemId);

    if (index >= 0) {
      const item = settings.excludedItems[index];
      settings.excludedItems.splice(index, 1);
      return { success: true, message: `${item.itemName} re-enabled for auto-sell` };
    }

    return { success: false, message: 'Item not in exclude list' };
  }

  /**
   * Check if item should be auto-sold
   */
  shouldAutoSell(playerId, itemRarity, itemId) {
    const settings = this.getSettings(playerId);

    if (!settings.enabled) return false;
    if (settings.excludedItems.some(e => e.itemId === itemId)) return false;

    switch (itemRarity.toLowerCase()) {
      case 'common': return settings.sellCommon;
      case 'uncommon': return settings.sellUncommon;
      case 'rare': return settings.sellRare;
      case 'epic': return settings.sellEpic;
      case 'legendary': return settings.sellLegendary;
      default: return false;
    }
  }

  /**
   * Auto-sell inventory items
   */
  autoSellInventory(playerId, inventory) {
    const settings = this.getSettings(playerId);

    if (!settings.enabled) {
      return { success: false, message: 'Auto-sell not enabled' };
    }

    let itemsSold = 0;
    let goldEarned = 0;
    const soldItems = [];

    // Check each item
    inventory.forEach(item => {
      if (this.shouldAutoSell(playerId, item.rarity, item.id)) {
        goldEarned += item.sellPrice || item.value;
        itemsSold++;
        soldItems.push({ name: item.name, price: item.sellPrice || item.value });
      }
    });

    if (itemsSold > 0) {
      settings.totalSold += itemsSold;
      settings.totalGoldEarned += goldEarned;
      settings.lastSoldItems = soldItems.slice(-10); // Keep last 10

      return {
        success: true,
        message: `Sold ${itemsSold} items for ${goldEarned} gold`,
        itemsSold,
        goldEarned,
        soldItems
      };
    }

    return { success: false, message: 'No items to sell' };
  }

  /**
   * Get auto-sell statistics
   */
  getStatistics(playerId) {
    const settings = this.getSettings(playerId);

    const rarityFilter = [];
    if (settings.sellCommon) rarityFilter.push('Common');
    if (settings.sellUncommon) rarityFilter.push('Uncommon');
    if (settings.sellRare) rarityFilter.push('Rare');
    if (settings.sellEpic) rarityFilter.push('Epic');
    if (settings.sellLegendary) rarityFilter.push('Legendary');

    return {
      enabled: settings.enabled,
      rarityFilter,
      totalItemsSold: settings.totalSold,
      totalGoldEarned: settings.totalGoldEarned,
      avgGoldPerItem: settings.totalSold > 0 ? Math.floor(settings.totalGoldEarned / settings.totalSold) : 0,
      excludedCount: settings.excludedItems.length,
      recentlySold: settings.lastSoldItems
    };
  }

  /**
   * Get recommended settings
   */
  getRecommendations(playerId, playerLevel) {
    const recommendations = [];

    if (playerLevel < 20) {
      recommendations.push({
        rarity: 'Common',
        recommended: true,
        reason: 'Low level - sell all common items for quick gold'
      });
    } else if (playerLevel < 40) {
      recommendations.push({
        rarity: 'Common',
        recommended: true,
        reason: 'Mid game - sell common and uncommon'
      }, {
        rarity: 'Uncommon',
        recommended: true,
        reason: 'Not useful at your level'
      });
    } else {
      recommendations.push({
        rarity: 'Common',
        recommended: true,
        reason: 'Always sell - never useful'
      }, {
        rarity: 'Uncommon',
        recommended: true,
        reason: 'Not competitive with higher rarity'
      }, {
        rarity: 'Rare',
        recommended: false,
        reason: 'Keep for collection or vendor'
      });
    }

    return recommendations;
  }
}

export default AutoSellJunk;
