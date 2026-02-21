/**
 * Loot Analytics - Track item drops and calculate drop rates
 */

class LootAnalytics {
  constructor() {
    // Map<playerId, lootHistory>
    this.playerLoot = new Map();
  }

  /**
   * Record item drop
   */
  recordDrop(playerId, enemyId, enemyName, itemId, itemName, itemRarity, itemValue) {
    if (!this.playerLoot.has(playerId)) {
      this.playerLoot.set(playerId, {
        playerId,
        drops: [],
        enemyEncounters: {}
      });
    }

    const lootData = this.playerLoot.get(playerId);

    // Record drop
    lootData.drops.push({
      timestamp: Date.now(),
      enemyId,
      enemyName,
      itemId,
      itemName,
      itemRarity,
      itemValue,
      sellPrice: Math.floor(itemValue * 1.5)
    });

    // Track encounters with enemy
    if (!lootData.enemyEncounters[enemyId]) {
      lootData.enemyEncounters[enemyId] = {
        enemyId,
        enemyName,
        encounters: 0,
        drops: {}
      };
    }

    lootData.enemyEncounters[enemyId].encounters++;

    if (!lootData.enemyEncounters[enemyId].drops[itemId]) {
      lootData.enemyEncounters[enemyId].drops[itemId] = {
        itemId,
        itemName,
        count: 0,
        rarity: itemRarity,
        value: itemValue
      };
    }

    lootData.enemyEncounters[enemyId].drops[itemId].count++;

    // Keep only last 500 drops
    if (lootData.drops.length > 500) {
      lootData.drops.shift();
    }
  }

  /**
   * Calculate drop rate for an item from an enemy
   */
  getDropRate(playerId, enemyId, itemId) {
    const lootData = this.playerLoot.get(playerId);
    if (!lootData || !lootData.enemyEncounters[enemyId]) return null;

    const enemy = lootData.enemyEncounters[enemyId];
    const itemDrop = enemy.drops[itemId];

    if (!itemDrop) return null;

    const dropRate = Math.floor((itemDrop.count / enemy.encounters) * 100);

    return {
      itemId,
      itemName: itemDrop.itemName,
      rarity: itemDrop.rarity,
      dropCount: itemDrop.count,
      totalEncounters: enemy.encounters,
      dropRate,
      estimatedDrops: Math.ceil(100 / (dropRate || 1)), // Encounters needed for ~1 drop
      totalValue: itemDrop.count * itemDrop.value
    };
  }

  /**
   * Get all drops from a specific enemy
   */
  getEnemyLootTable(playerId, enemyId) {
    const lootData = this.playerLoot.get(playerId);
    if (!lootData || !lootData.enemyEncounters[enemyId]) return null;

    const enemy = lootData.enemyEncounters[enemyId];
    const lootTable = Object.values(enemy.drops).map(item => ({
      itemId: item.itemId,
      itemName: item.itemName,
      rarity: item.rarity,
      dropCount: item.count,
      percentChance: Math.floor((item.count / enemy.encounters) * 100),
      estimatedEncountersForOne: Math.ceil(100 / Math.max(1, (item.count / enemy.encounters) * 100)),
      totalValue: item.count * item.value
    }));

    return {
      enemyId,
      enemyName: enemy.enemyName,
      totalEncounters: enemy.encounters,
      uniqueDrops: lootTable.length,
      lootTable: lootTable.sort((a, b) => b.dropCount - a.dropCount),
      totalLootValue: lootTable.reduce((sum, item) => sum + item.totalValue, 0)
    };
  }

  /**
   * Get most efficient farming locations
   */
  getFarmingEfficiency(playerId) {
    const lootData = this.playerLoot.get(playerId);
    if (!lootData) return null;

    const efficiency = Object.values(lootData.enemyEncounters).map(enemy => {
      const totalValue = Object.values(enemy.drops).reduce((sum, item) => sum + (item.count * item.value), 0);
      const valuePerEncounter = totalValue / enemy.encounters;

      return {
        enemyId: enemy.enemyId,
        enemyName: enemy.enemyName,
        encounters: enemy.encounters,
        valuePerEncounter: Math.floor(valuePerEncounter),
        totalValue,
        profitability: this.rateProfitability(valuePerEncounter)
      };
    });

    return efficiency.sort((a, b) => b.valuePerEncounter - a.valuePerEncounter);
  }

  /**
   * Rate profitability
   */
  rateProfitability(valuePerEncounter) {
    if (valuePerEncounter > 500) return '🔥 Excellent Farm';
    if (valuePerEncounter > 250) return '✅ Good Farm';
    if (valuePerEncounter > 100) return '⚠️ Average Farm';
    if (valuePerEncounter > 25) return '❌ Poor Farm';
    return '💀 Waste of Time';
  }

  /**
   * Get rarity distribution for all drops
   */
  getRarityDistribution(playerId) {
    const lootData = this.playerLoot.get(playerId);
    if (!lootData) return null;

    const rarityCount = {};

    lootData.drops.forEach(drop => {
      if (!rarityCount[drop.itemRarity]) {
        rarityCount[drop.itemRarity] = 0;
      }
      rarityCount[drop.itemRarity]++;
    });

    const total = lootData.drops.length;

    return {
      total,
      distribution: Object.entries(rarityCount).map(([rarity, count]) => ({
        rarity,
        count,
        percentage: Math.floor((count / total) * 100)
      })).sort((a, b) => b.count - a.count)
    };
  }

  /**
   * Get recent drops
   */
  getRecentDrops(playerId, limit = 10) {
    const lootData = this.playerLoot.get(playerId);
    if (!lootData) return null;

    return lootData.drops.slice(-limit).reverse().map(drop => ({
      ...drop,
      timeAgo: this.getTimeAgo(drop.timestamp)
    }));
  }

  /**
   * Get time ago string
   */
  getTimeAgo(timestamp) {
    const ms = Date.now() - timestamp;
    const mins = Math.floor(ms / 60000);
    const hours = Math.floor(mins / 60);
    const days = Math.floor(hours / 24);

    if (days > 0) return `${days}d ago`;
    if (hours > 0) return `${hours}h ago`;
    if (mins > 0) return `${mins}m ago`;
    return 'just now';
  }
}

export default LootAnalytics;
