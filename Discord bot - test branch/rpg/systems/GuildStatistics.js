import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Calculate guild-wide statistics
export function calculateGuildStatistics(playersFile, questsFile) {
  try {
    // Load players
    let players = [];
    if (fs.existsSync(playersFile)) {
      const data = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
      players = Array.isArray(data) ? data : Object.values(data);
    }

    // Load quests
    let quests = { daily: [], weekly: [], limited: [] };
    if (fs.existsSync(questsFile)) {
      quests = JSON.parse(fs.readFileSync(questsFile, 'utf8'));
    }

    // Calculate statistics
    const stats = {
      timestamp: new Date().toISOString(),
      totalPlayers: players.length,
      playersByRank: {
        'F': players.filter(p => p.guildRank === 'F').length,
        'E': players.filter(p => p.guildRank === 'E').length,
        'D': players.filter(p => p.guildRank === 'D').length,
        'C': players.filter(p => p.guildRank === 'C').length,
        'B': players.filter(p => p.guildRank === 'B').length,
        'A': players.filter(p => p.guildRank === 'A').length,
        'S': players.filter(p => p.guildRank === 'S').length,
      },
      averageRankXP: players.length > 0 ? (players.reduce((sum, p) => sum + (p.guildXP || 0), 0) / players.length).toFixed(2) : 0,
      
      // Quest completion stats
      questStats: {
        totalDaily: quests.daily.length,
        totalWeekly: quests.weekly.length,
        totalLimited: quests.limited.length,
      },

      // Player completion rates
      completionRates: {
        dailyCompletionRate: players.length > 0 
          ? (players.filter(p => p.dailyQuestsCompleted && p.dailyQuestsCompleted.length > 0).length / players.length * 100).toFixed(1) + '%'
          : '0%',
        weeklyCompletionRate: players.length > 0
          ? (players.filter(p => p.weeklyQuestsCompleted && p.weeklyQuestsCompleted.length > 0).length / players.length * 100).toFixed(1) + '%'
          : '0%',
      },

      // Top performers
      topPerformers: players
        .map(p => ({
          userId: p.userId,
          username: p.username || 'Unknown',
          rank: p.guildRank || 'F',
          guildXP: p.guildXP || 0,
          dailyCompleted: (p.dailyQuestsCompleted || []).length,
          weeklyCompleted: (p.weeklyQuestsCompleted || []).length,
          limitedCompleted: (p.limitedQuestsCompleted || []).length,
          totalQuestsCompleted: (p.dailyQuestsCompleted || []).length + (p.weeklyQuestsCompleted || []).length + (p.limitedQuestsCompleted || []).length,
        }))
        .sort((a, b) => b.totalQuestsCompleted - a.totalQuestsCompleted)
        .slice(0, 10),

      // Rank progression
      rankDistribution: Object.entries({
        'F': players.filter(p => p.guildRank === 'F').length,
        'E': players.filter(p => p.guildRank === 'E').length,
        'D': players.filter(p => p.guildRank === 'D').length,
        'C': players.filter(p => p.guildRank === 'C').length,
        'B': players.filter(p => p.guildRank === 'B').length,
        'A': players.filter(p => p.guildRank === 'A').length,
        'S': players.filter(p => p.guildRank === 'S').length,
      }).map(([rank, count]) => ({
        rank,
        count,
        percentage: players.length > 0 ? (count / players.length * 100).toFixed(1) : 0,
      })),

      // Average completion by rank
      completionByRank: ['F', 'E', 'D', 'C', 'B', 'A', 'S'].map(rank => {
        const rankPlayers = players.filter(p => p.guildRank === rank);
        if (rankPlayers.length === 0) return { rank, average: 0 };
        
        const avgCompleted = (rankPlayers.reduce((sum, p) => {
          return sum + ((p.dailyQuestsCompleted || []).length + (p.weeklyQuestsCompleted || []).length + (p.limitedQuestsCompleted || []).length);
        }, 0) / rankPlayers.length).toFixed(1);
        
        return { rank, average: avgCompleted };
      }),
    };

    return stats;
  } catch (error) {
    console.error('Error calculating guild statistics:', error);
    return null;
  }
}

// Get leaderboard
export function getLeaderboard(playersFile, limit = 20) {
  try {
    let players = [];
    if (fs.existsSync(playersFile)) {
      const data = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
      players = Array.isArray(data) ? data : Object.values(data);
    }

    return players
      .map(p => ({
        userId: p.userId,
        username: p.username || 'Unknown',
        rank: p.guildRank || 'F',
        guildXP: p.guildXP || 0,
        level: p.level || 1,
        totalQuestsCompleted: (p.dailyQuestsCompleted || []).length + (p.weeklyQuestsCompleted || []).length + (p.limitedQuestsCompleted || []).length,
      }))
      .sort((a, b) => b.guildXP - a.guildXP)
      .slice(0, limit);
  } catch (error) {
    console.error('Error fetching leaderboard:', error);
    return [];
  }
}

// Get player statistics
export function getPlayerStats(playersFile, userId) {
  try {
    let players = [];
    if (fs.existsSync(playersFile)) {
      const data = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
      players = Array.isArray(data) ? data : Object.values(data);
    }

    const player = players.find(p => p.userId === userId);
    if (!player) return null;

    const dailyCompleted = (player.dailyQuestsCompleted || []).length;
    const weeklyCompleted = (player.weeklyQuestsCompleted || []).length;
    const limitedCompleted = (player.limitedQuestsCompleted || []).length;
    const totalCompleted = dailyCompleted + weeklyCompleted + limitedCompleted;

    return {
      userId: player.userId,
      username: player.username || 'Unknown',
      rank: player.guildRank || 'F',
      guildXP: player.guildXP || 0,
      level: player.level || 1,
      questsCompleted: {
        daily: dailyCompleted,
        weekly: weeklyCompleted,
        limited: limitedCompleted,
        total: totalCompleted,
      },
      lastActivityDate: player.lastActivityDate || 'Never',
      joinedDate: player.joinedDate || 'Unknown',
    };
  } catch (error) {
    console.error('Error fetching player stats:', error);
    return null;
  }
}

// Compare players
export function comparePlayerStats(playersFile, userIds) {
  try {
    let players = [];
    if (fs.existsSync(playersFile)) {
      const data = JSON.parse(fs.readFileSync(playersFile, 'utf8'));
      players = Array.isArray(data) ? data : Object.values(data);
    }

    return userIds
      .map(userId => {
        const player = players.find(p => p.userId === userId);
        if (!player) return null;
        
        return {
          userId: player.userId,
          username: player.username || 'Unknown',
          rank: player.guildRank || 'F',
          guildXP: player.guildXP || 0,
          totalQuestsCompleted: (player.dailyQuestsCompleted || []).length + (player.weeklyQuestsCompleted || []).length + (player.limitedQuestsCompleted || []).length,
        };
      })
      .filter(p => p !== null)
      .sort((a, b) => b.guildXP - a.guildXP);
  } catch (error) {
    console.error('Error comparing player stats:', error);
    return [];
  }
}
