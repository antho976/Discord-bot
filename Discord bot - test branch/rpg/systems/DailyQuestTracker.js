/**
 * Daily Quest Tracker - Track daily and weekly quests with auto-reset
 */

class DailyQuestTracker {
  constructor() {
    // Map<playerId, dailyQuests>
    this.playerQuests = new Map();
    
    this.DAILY_QUESTS = [
      { id: 'defeat-5-enemies', name: 'Defeat 5 Enemies', type: 'daily', target: 5, reward: 100 },
      { id: 'gather-10-materials', name: 'Gather 10 Materials', type: 'daily', target: 10, reward: 75 },
      { id: 'deal-1000-damage', name: 'Deal 1000 Damage', type: 'daily', target: 1000, reward: 150 },
      { id: 'craft-3-items', name: 'Craft 3 Items', type: 'daily', target: 3, reward: 100 },
      { id: 'win-boss-fight', name: 'Win a Boss Fight', type: 'daily', target: 1, reward: 200 }
    ];

    this.WEEKLY_QUESTS = [
      { id: 'defeat-50-enemies', name: 'Defeat 50 Enemies', type: 'weekly', target: 50, reward: 500 },
      { id: 'complete-dungeon', name: 'Complete a Dungeon', type: 'weekly', target: 1, reward: 400 },
      { id: 'reach-level-up', name: 'Level Up Once', type: 'weekly', target: 1, reward: 300 },
      { id: 'craft-20-items', name: 'Craft 20 Items', type: 'weekly', target: 20, reward: 400 },
      { id: 'defeat-boss-5-times', name: 'Defeat Boss 5 Times', type: 'weekly', target: 5, reward: 600 }
    ];
  }

  /**
   * Initialize or get player quests (with auto-reset)
   */
  getPlayerQuests(playerId) {
    if (!this.playerQuests.has(playerId)) {
      this.initializePlayerQuests(playerId);
    }

    const quests = this.playerQuests.get(playerId);
    
    // Check if reset needed
    const lastReset = quests.lastReset || 0;
    const now = Date.now();
    const dayMs = 86400000; // 24 hours
    const weekMs = 604800000; // 7 days

    // Auto-reset daily quests
    if (now - lastReset > dayMs) {
      quests.daily = this.DAILY_QUESTS.map(q => ({
        ...q,
        progress: 0,
        completed: false,
        claimedReward: false,
        startedAt: now
      }));
      quests.lastReset = now;
    }

    // Auto-reset weekly quests (every Sunday)
    const lastWeeklyReset = quests.lastWeeklyReset || 0;
    if (now - lastWeeklyReset > weekMs) {
      quests.weekly = this.WEEKLY_QUESTS.map(q => ({
        ...q,
        progress: 0,
        completed: false,
        claimedReward: false,
        startedAt: now
      }));
      quests.lastWeeklyReset = now;
    }

    return quests;
  }

  /**
   * Initialize fresh quest set
   */
  initializePlayerQuests(playerId) {
    const now = Date.now();
    const quests = {
      playerId,
      daily: this.DAILY_QUESTS.map(q => ({
        ...q,
        progress: 0,
        completed: false,
        claimedReward: false,
        startedAt: now
      })),
      weekly: this.WEEKLY_QUESTS.map(q => ({
        ...q,
        progress: 0,
        completed: false,
        claimedReward: false,
        startedAt: now
      })),
      lastReset: now,
      lastWeeklyReset: now,
      totalClaimedRewards: 0
    };
    this.playerQuests.set(playerId, quests);
    return quests;
  }

  /**
   * Progress a quest
   */
  progressQuest(playerId, questType, questId, amount = 1) {
    const quests = this.getPlayerQuests(playerId);
    const questList = questType === 'daily' ? quests.daily : quests.weekly;
    const quest = questList.find(q => q.id === questId);

    if (quest && !quest.completed) {
      quest.progress += amount;
      if (quest.progress >= quest.target) {
        quest.progress = quest.target;
        quest.completed = true;
      }
    }
  }

  /**
   * Claim reward for completed quest
   */
  claimReward(playerId, questType, questId) {
    const quests = this.getPlayerQuests(playerId);
    const questList = questType === 'daily' ? quests.daily : quests.weekly;
    const quest = questList.find(q => q.id === questId);

    if (!quest) return { success: false, message: 'Quest not found' };
    if (!quest.completed) return { success: false, message: 'Quest not completed' };
    if (quest.claimedReward) return { success: false, message: 'Reward already claimed' };

    quest.claimedReward = true;
    quests.totalClaimedRewards += quest.reward;

    return { success: true, reward: quest.reward, message: `Claimed ${quest.reward} gold!` };
  }

  /**
   * Get progress summary
   */
  getQuestProgress(playerId) {
    const quests = this.getPlayerQuests(playerId);
    
    const dailyProgress = quests.daily.filter(q => q.completed).length;
    const dailyTotal = quests.daily.length;
    const weeklyProgress = quests.weekly.filter(q => q.completed).length;
    const weeklyTotal = quests.weekly.length;
    const unclaimedRewards = quests.daily.filter(q => q.completed && !q.claimedReward).length +
                             quests.weekly.filter(q => q.completed && !q.claimedReward).length;

    return {
      dailyCompleted: dailyProgress,
      dailyTotal,
      weeklyCompleted: weeklyProgress,
      weeklyTotal,
      unclaimedRewards,
      totalClaimed: quests.totalClaimedRewards,
      dailyQuests: quests.daily,
      weeklyQuests: quests.weekly
    };
  }

  /**
   * Get time until reset
   */
  getTimeUntilReset(playerId) {
    const quests = this.getPlayerQuests(playerId);
    const lastReset = quests.lastReset || 0;
    const now = Date.now();
    const dayMs = 86400000;

    const msUntilReset = dayMs - (now - lastReset);
    const hoursLeft = Math.floor(msUntilReset / 3600000);
    const minutesLeft = Math.floor((msUntilReset % 3600000) / 60000);

    return { hoursLeft, minutesLeft, msUntilReset };
  }
}

export default DailyQuestTracker;
