/**
 * Favorite Item Loadout - Mark and quickly equip favorite items
 */

class FavoriteItemLoadout {
  constructor() {
    // Map<playerId, favorites>
    this.playerFavorites = new Map();
  }

  /**
   * Initialize or get player favorites
   */
  getPlayerFavorites(playerId) {
    if (!this.playerFavorites.has(playerId)) {
      this.playerFavorites.set(playerId, {
        playerId,
        favorites: [],
        maxFavorites: 10
      });
    }
    return this.playerFavorites.get(playerId);
  }

  /**
   * Add item to favorites
   */
  addFavorite(playerId, itemId, itemName, itemRarity, itemSlot) {
    const favorites = this.getPlayerFavorites(playerId);

    if (favorites.favorites.length >= favorites.maxFavorites) {
      return { success: false, message: `Favorite limit reached (${favorites.maxFavorites} max)` };
    }

    // Check if already favorited
    if (favorites.favorites.some(f => f.itemId === itemId)) {
      return { success: false, message: 'Item already favorited' };
    }

    favorites.favorites.push({
      itemId,
      itemName,
      itemRarity,
      itemSlot,
      addedAt: Date.now()
    });

    return { success: true, message: `⭐ ${itemName} added to favorites!` };
  }

  /**
   * Remove from favorites
   */
  removeFavorite(playerId, itemId) {
    const favorites = this.getPlayerFavorites(playerId);
    const index = favorites.favorites.findIndex(f => f.itemId === itemId);

    if (index < 0) {
      return { success: false, message: 'Item not in favorites' };
    }

    const removed = favorites.favorites.splice(index, 1)[0];
    return { success: true, message: `Removed ${removed.itemName} from favorites` };
  }

  /**
   * Get all favorites
   */
  getFavorites(playerId) {
    const favorites = this.getPlayerFavorites(playerId);
    return {
      total: favorites.favorites.length,
      maxSlots: favorites.maxFavorites,
      items: favorites.favorites.sort((a, b) => b.addedAt - a.addedAt)
    };
  }

  /**
   * Get favorites by slot
   */
  getFavoritesBySlot(playerId, slot) {
    const favorites = this.getPlayerFavorites(playerId);
    return favorites.favorites.filter(f => f.itemSlot === slot);
  }

  /**
   * Quick equip favorite
   */
  quickEquipFavorite(playerId, itemId, currentEquipment) {
    const favorites = this.getPlayerFavorites(playerId);
    const favorite = favorites.favorites.find(f => f.itemId === itemId);

    if (!favorite) {
      return { success: false, message: 'Favorite not found' };
    }

    // In actual implementation, would equip to slot
    return {
      success: true,
      message: `Equipped ${favorite.itemName}`,
      slot: favorite.itemSlot,
      unequipped: currentEquipment[favorite.itemSlot] || null
    };
  }

  /**
   * Get suggested favorites (items with best stats)
   */
  getSuggestedFavorites(playerId, inventoryItems, limit = 5) {
    const favorites = this.getPlayerFavorites(playerId);
    const alreadyFavorited = favorites.favorites.map(f => f.itemId);

    const suggestions = inventoryItems
      .filter(item => !alreadyFavorited.includes(item.id))
      .sort((a, b) => (b.stats?.power || 0) - (a.stats?.power || 0))
      .slice(0, limit)
      .map(item => ({
        itemId: item.id,
        itemName: item.name,
        itemRarity: item.rarity,
        reason: `Top tier ${item.slot} item`,
        power: item.stats?.power || 0
      }));

    return suggestions;
  }

  /**
   * Reorder favorites
   */
  reorderFavorites(playerId, itemOrder) {
    const favorites = this.getPlayerFavorites(playerId);
    
    const reordered = [];
    itemOrder.forEach(itemId => {
      const item = favorites.favorites.find(f => f.itemId === itemId);
      if (item) reordered.push(item);
    });

    // Add items not in order
    favorites.favorites.forEach(item => {
      if (!reordered.find(r => r.itemId === item.itemId)) {
        reordered.push(item);
      }
    });

    favorites.favorites = reordered;
    return { success: true, message: 'Favorites reordered' };
  }

  /**
   * Get quick access menu data
   */
  getQuickAccessMenu(playerId) {
    const favorites = this.getPlayerFavorites(playerId);

    const bySlot = {};
    favorites.favorites.forEach(item => {
      if (!bySlot[item.itemSlot]) bySlot[item.itemSlot] = [];
      bySlot[item.itemSlot].push(item);
    });

    return {
      totalFavorites: favorites.favorites.length,
      slots: bySlot
    };
  }
}

export default FavoriteItemLoadout;
