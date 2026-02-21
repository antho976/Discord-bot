/**
 * Notification System - Alerts for events and progression
 */

class NotificationSystem {
  constructor() {
    // Map<playerId, notifications>
    this.playerNotifications = new Map();
    this.notificationPreferences = new Map();
  }

  /**
   * Initialize player notifications
   */
  initializeNotifications(playerId) {
    this.playerNotifications.set(playerId, []);
    this.notificationPreferences.set(playerId, {
      playerId,
      skillLevelUp: true,
      bossDefeated: true,
      guildEventStart: true,
      levelUp: true,
      questComplete: true,
      equipmentUpgrade: true,
      milestoneReached: true
    });
  }

  /**
   * Add notification
   */
  addNotification(playerId, type, title, description, icon = '📢', priority = 'normal') {
    if (!this.playerNotifications.has(playerId)) {
      this.initializeNotifications(playerId);
    }

    const prefs = this.notificationPreferences.get(playerId);
    
    // Check if player wants these notifications
    if (!prefs[type]) {
      return; // Silently skip disabled notifications
    }

    const notification = {
      id: `${playerId}-${Date.now()}`,
      type,
      title,
      description,
      icon,
      priority,
      timestamp: Date.now(),
      read: false
    };

    const notifications = this.playerNotifications.get(playerId);
    notifications.push(notification);

    // Keep only last 100 notifications
    if (notifications.length > 100) {
      notifications.shift();
    }

    return notification;
  }

  /**
   * Mark notification as read
   */
  markAsRead(playerId, notificationId) {
    const notifications = this.playerNotifications.get(playerId) || [];
    const notif = notifications.find(n => n.id === notificationId);

    if (notif) {
      notif.read = true;
      return true;
    }
    return false;
  }

  /**
   * Get unread notifications
   */
  getUnreadNotifications(playerId) {
    const notifications = this.playerNotifications.get(playerId) || [];
    const unread = notifications.filter(n => !n.read)
      .sort((a, b) => {
        const priorityOrder = { critical: 0, high: 1, normal: 2, low: 3 };
        return priorityOrder[a.priority] - priorityOrder[b.priority] || b.timestamp - a.timestamp;
      });

    return {
      count: unread.length,
      notifications: unread.slice(0, 10) // Return top 10
    };
  }

  /**
   * Get all notifications (recent first)
   */
  getAllNotifications(playerId, limit = 20) {
    const notifications = this.playerNotifications.get(playerId) || [];
    return notifications.slice(-limit).reverse();
  }

  /**
   * Mark all as read
   */
  markAllAsRead(playerId) {
    const notifications = this.playerNotifications.get(playerId) || [];
    let count = 0;
    notifications.forEach(n => {
      if (!n.read) {
        n.read = true;
        count++;
      }
    });
    return count;
  }

  /**
   * Create notification for level up
   */
  notifyLevelUp(playerId, newLevel) {
    return this.addNotification(playerId, 'levelUp', 
      `📈 Level Up!`,
      `You've reached level ${newLevel}! Find new challenges!`,
      '📈',
      'high'
    );
  }

  /**
   * Create notification for skill level up
   */
  notifySkillLevelUp(playerId, skillName, skillLevel) {
    return this.addNotification(playerId, 'skillLevelUp',
      `⚡ Skill Mastery`,
      `${skillName} is now level ${skillLevel}!`,
      '⚡',
      'normal'
    );
  }

  /**
   * Create notification for boss defeated
   */
  notifyBossDefeated(playerId, bossName, reward) {
    return this.addNotification(playerId, 'bossDefeated',
      `👹 VICTORY!`,
      `Defeated ${bossName}! Earned ${reward} gold!`,
      '👹',
      'high'
    );
  }

  /**
   * Create notification for guild event
   */
  notifyGuildEvent(playerId, eventName, eventDescription) {
    return this.addNotification(playerId, 'guildEventStart',
      `🏰 Guild Event`,
      `${eventName}: ${eventDescription}`,
      '🏰',
      'high'
    );
  }

  /**
   * Create notification for quest completion
   */
  notifyQuestComplete(playerId, questName, reward) {
    return this.addNotification(playerId, 'questComplete',
      `✅ Quest Complete`,
      `${questName} finished! Earned ${reward} gold!`,
      '✅',
      'normal'
    );
  }

  /**
   * Create notification for equipment upgrade
   */
  notifyEquipmentUpgrade(playerId, itemName, improvement) {
    return this.addNotification(playerId, 'equipmentUpgrade',
      `🔧 Equipment Upgraded`,
      `${itemName} improved! ${improvement}`,
      '🔧',
      'normal'
    );
  }

  /**
   * Create notification for milestone
   */
  notifyMilestone(playerId, milestoneName, reward) {
    return this.addNotification(playerId, 'milestoneReached',
      `🎯 Milestone Unlocked`,
      `${milestoneName}! Earned ${reward}!`,
      '🎯',
      'high'
    );
  }

  /**
   * Set notification preferences
   */
  setPreferences(playerId, preferences) {
    const prefs = this.notificationPreferences.get(playerId) || {};
    Object.assign(prefs, preferences);
    this.notificationPreferences.set(playerId, prefs);
    return prefs;
  }

  /**
   * Get notification preferences
   */
  getPreferences(playerId) {
    if (!this.notificationPreferences.has(playerId)) {
      this.initializeNotifications(playerId);
    }
    return this.notificationPreferences.get(playerId);
  }

  /**
   * Clear old notifications (older than 7 days)
   */
  clearOldNotifications(playerId) {
    const notifications = this.playerNotifications.get(playerId) || [];
    const weekMs = 604800000;
    const now = Date.now();

    const filtered = notifications.filter(n => now - n.timestamp < weekMs);
    this.playerNotifications.set(playerId, filtered);

    return notifications.length - filtered.length; // Return deleted count
  }

  /**
   * Get notification statistics
   */
  getNotificationStats(playerId) {
    const notifications = this.playerNotifications.get(playerId) || [];
    
    const typeCount = {};
    notifications.forEach(n => {
      typeCount[n.type] = (typeCount[n.type] || 0) + 1;
    });

    return {
      total: notifications.length,
      unread: notifications.filter(n => !n.read).length,
      byType: typeCount,
      oldest: notifications[0],
      newest: notifications[notifications.length - 1]
    };
  }
}

export default NotificationSystem;
