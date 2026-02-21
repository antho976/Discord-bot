/**
 * Crafting Queue System - Queue and batch craft items
 */

class CraftingQueue {
  constructor() {
    // Map<playerId, queue>
    this.playerQueues = new Map();
  }

  /**
   * Initialize player queue
   */
  initializeQueue(playerId) {
    this.playerQueues.set(playerId, {
      playerId,
      queue: [],
      processing: null,
      totalCrafted: 0,
      maxQueueSize: 20
    });
  }

  /**
   * Get player queue
   */
   getQueue(playerId) {
    if (!this.playerQueues.has(playerId)) {
      this.initializeQueue(playerId);
    }
    return this.playerQueues.get(playerId);
  }

  /**
   * Add item to craft queue
   */
  addToQueue(playerId, itemId, itemName, quantity, craftTime, materials, reward) {
    const queue = this.getQueue(playerId);

    if (queue.queue.length >= queue.maxQueueSize) {
      return { success: false, message: `Queue is full (${queue.maxQueueSize} max)` };
    }

    const queueItem = {
      id: `${itemId}-${Date.now()}`,
      itemId,
      itemName,
      quantity,
      craftTime, // seconds per item
      materials,
      reward,
      addedAt: Date.now(),
      progress: 0,
      status: 'queued' // queued, crafting, completed, failed
    };

    queue.queue.push(queueItem);

    return { success: true, message: `Added ${quantity}x ${itemName} to queue`, queueLength: queue.queue.length };
  }

  /**
   * Batch add items
   */
  batchAdd(playerId, items) {
    const queue = this.getQueue(playerId);
    const results = [];

    items.forEach(item => {
      if (queue.queue.length < queue.maxQueueSize) {
        const result = this.addToQueue(playerId, item.itemId, item.itemName, item.quantity, item.craftTime, item.materials, item.reward);
        results.push(result);
      }
    });

    return {
      success: true,
      itemsAdded: results.filter(r => r.success).length,
      totalQueued: queue.queue.length,
      results
    };
  }

  /**
   * Get queue status
   */
  getQueueStatus(playerId) {
    const queue = this.getQueue(playerId);

    if (queue.queue.length === 0) {
      return { empty: true, message: 'Queue is empty' };
    }

    const queued = queue.queue.filter(q => q.status === 'queued').length;
    const crafting = queue.queue.filter(q => q.status === 'crafting').length;
    const completed = queue.queue.filter(q => q.status === 'completed').length;

    const totalTime = queue.queue.reduce((sum, item) => {
      if (item.status === 'queued' || item.status === 'crafting') {
        return sum + (item.craftTime * item.quantity);
      }
      return sum;
    }, 0);

    return {
      empty: false,
      queued,
      crafting,
      completed,
      totalItems: queue.queue.length,
      estimatedTimeSeconds: totalTime,
      estimatedTime: this.formatTime(totalTime),
      nextItem: queue.queue.find(q => q.status === 'queued' || q.status === 'crafting')
    };
  }

  /**
   * Format seconds to readable time
   */
  formatTime(seconds) {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;

    const parts = [];
    if (hours > 0) parts.push(`${hours}h`);
    if (minutes > 0) parts.push(`${minutes}m`);
    if (secs > 0 || parts.length === 0) parts.push(`${secs}s`);

    return parts.join(' ');
  }

  /**
   * Start crafting queue
   */
  startCrafting(playerId) {
    const queue = this.getQueue(playerId);

    if (queue.queue.length === 0) {
      return { success: false, message: 'Queue is empty' };
    }

    // Find first queued item
    const nextItem = queue.queue.find(q => q.status === 'queued');

    if (!nextItem) {
      return { success: false, message: 'No queued items' };
    }

    nextItem.status = 'crafting';
    queue.processing = nextItem.id;

    return {
      success: true,
      message: `Started crafting ${nextItem.itemName}`,
      itemId: nextItem.id,
      craftTime: nextItem.craftTime * nextItem.quantity
    };
  }

  /**
   * Complete current craft
   */
  completeCraft(playerId) {
    const queue = this.getQueue(playerId);

    if (!queue.processing) {
      return { success: false, message: 'No item being crafted' };
    }

    const item = queue.queue.find(q => q.id === queue.processing);

    if (!item) {
      return { success: false, message: 'Craft item not found' };
    }

    item.status = 'completed';
    item.completedAt = Date.now();
    queue.totalCrafted += item.quantity;
    queue.processing = null;

    return {
      success: true,
      message: `✅ Crafted ${item.quantity}x ${item.itemName}!`,
      reward: item.reward * item.quantity
    };
  }

  /**
   * Cancel queue item
   */
  cancelItem(playerId, queueId) {
    const queue = this.getQueue(playerId);
    const itemIndex = queue.queue.findIndex(q => q.id === queueId);

    if (itemIndex < 0) {
      return { success: false, message: 'Queue item not found' };
    }

    const item = queue.queue[itemIndex];

    if (item.status === 'crafting') {
      return { success: false, message: 'Cannot cancel item being crafted' };
    }

    queue.queue.splice(itemIndex, 1);

    return { success: true, message: `Cancelled ${item.itemName}` };
  }

  /**
   * Clear completed items
   */
  clearCompleted(playerId) {
    const queue = this.getQueue(playerId);
    const beforeLength = queue.queue.length;

    queue.queue = queue.queue.filter(q => q.status !== 'completed');

    return {
      success: true,
      cleared: beforeLength - queue.queue.length,
      remaining: queue.queue.length
    };
  }

  /**
   * Get queue details
   */
  getQueueDetails(playerId) {
    const queue = this.getQueue(playerId);

    return {
      totalItems: queue.queue.length,
      maxSize: queue.maxQueueSize,
      totalCrafted: queue.totalCrafted,
      items: queue.queue.map((q, index) => ({
        position: index + 1,
        ...q,
        estimatedTime: this.formatTime(q.craftTime * q.quantity)
      }))
    };
  }

  /**
   * Get crafting statistics
   */
  getCraftingStats(playerId) {
    const queue = this.getQueue(playerId);

    const byItem = {};
    queue.queue.forEach(item => {
      if (!byItem[item.itemId]) {
        byItem[item.itemId] = { name: item.itemName, count: 0, totalReward: 0 };
      }
      byItem[item.itemId].count += item.quantity;
      byItem[item.itemId].totalReward += item.reward * item.quantity;
    });

    const completed = queue.queue.filter(q => q.status === 'completed');
    const completedReward = completed.reduce((sum, q) => sum + (q.reward * q.quantity), 0);

    return {
      totalInQueue: queue.queue.length,
      totalCompleted: queue.totalCrafted,
      potentialReward: queue.queue.reduce((sum, q) => sum + (q.reward * q.quantity), 0),
      completedReward,
      byItem
    };
  }

  /**
   * Reorder queue
   */
  reorderQueue(playerId, newOrder) {
    const queue = this.getQueue(playerId);

    const reordered = [];
    newOrder.forEach(queueId => {
      const item = queue.queue.find(q => q.id === queueId);
      if (item) reordered.push(item);
    });

    queue.queue = reordered;

    return { success: true, message: 'Queue reordered' };
  }
}

export default CraftingQueue;
