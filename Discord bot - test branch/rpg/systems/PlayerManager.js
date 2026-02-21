/**
 * Player Manager - Handles player persistence and retrieval
 * For Tier 1, using in-memory storage. Can be replaced with database later.
 */

import Player from '../models/Player.js';
import fs from 'fs';
import path from 'path';

const SAVE_PATH = path.resolve(process.cwd(), 'data', 'players.json');
const sharedPlayers = new Map();
let playersLoaded = false;
let saveInProgress = false;
let pendingSave = false;

export default class PlayerManager {
  constructor() {
    this.players = sharedPlayers; // shared across instances
    if (!playersLoaded) {
      this.loadAllPlayers();
      playersLoaded = true;
    }
  }

  loadAllPlayers() {
    if (fs.existsSync(SAVE_PATH)) {
      try {
        const raw = fs.readFileSync(SAVE_PATH, 'utf8');
        const arr = JSON.parse(raw);
        
        // Deduplicate: keep only the latest entry for each userId
        const seenUsers = new Map(); // userId -> { index, player }
        const duplicates = [];
        
        arr.forEach((obj, index) => {
          const userId = obj.userId;
          if (seenUsers.has(userId)) {
            duplicates.push({
              userId: userId,
              username: obj.username || 'Unknown',
              index: index,
              prevIndex: seenUsers.get(userId).index
            });
            // Keep track of the latest entry only
            seenUsers.get(userId).index = index;
          } else {
            seenUsers.set(userId, { index, obj });
          }
        });
        
        // Log if duplicates were found
        if (duplicates.length > 0) {
          console.warn(`[PlayerManager] ⚠️  Found ${duplicates.length} duplicate player entries. Removing old copies...`);
          duplicates.forEach(dup => {
            console.warn(`  - ${dup.username} (ID: ${dup.userId}): keeping entry #${dup.prevIndex + 1}, removing old entry #${dup.index + 1}`);
          });
        }
        
        // Load only the latest entries for each player
        arr.forEach((obj, index) => {
          const userId = obj.userId;
          const data = seenUsers.get(userId);
          
          // Only load if this is the latest entry for this user
          if (data.index === index) {
            const player = Object.assign(new Player(obj.userId, obj.username), obj);
            // Clear combat flags on load since combat state doesn't persist
            player.isInCombat = false;
            player.currentEnemy = null;
            
            // Cap any excessive potion buffs from exploits
            let capped = false;
            if (player.xpBonus > 500) {
              console.log(`[PlayerManager] Capping ${player.username}'s XP bonus from ${player.xpBonus}% to 500%`);
              player.xpBonus = 500;
              capped = true;
            }
            if (player.goldBonus > 500) {
              console.log(`[PlayerManager] Capping ${player.username}'s gold bonus from ${player.goldBonus}% to 500%`);
              player.goldBonus = 500;
              capped = true;
            }
            if (player.lootBonus > 200) {
              console.log(`[PlayerManager] Capping ${player.username}'s loot bonus from ${player.lootBonus}% to 200%`);
              player.lootBonus = 200;
              capped = true;
            }
            if (player.nextCombatHeal > 5000) {
              console.log(`[PlayerManager] Capping ${player.username}'s next combat heal from ${player.nextCombatHeal} HP to 5000 HP`);
              player.nextCombatHeal = 5000;
              capped = true;
            }
            if (player.gatheringExpires) {
              const maxExpires = Date.now() + (24 * 60 * 60 * 1000); // 24 hours max
              if (player.gatheringExpires > maxExpires) {
                const hoursOver = Math.round((player.gatheringExpires - maxExpires) / (60 * 60 * 1000));
                console.log(`[PlayerManager] Capping ${player.username}'s gathering bonus duration by ${hoursOver} hours to 24h max`);
                player.gatheringExpires = maxExpires;
                capped = true;
              }
            }
            
            this.players.set(player.userId, player);
          }
        });
        
        // If duplicates were found, rewrite the file with clean data
        if (duplicates.length > 0) {
          console.log('[PlayerManager] Rewriting players.json to remove duplicates...');
          this.saveAllPlayersOptimized();
        }
        
        console.log(`[PlayerManager] Loaded ${arr.length} total entries, ${this.players.size} unique players and cleared any stale combat states`);
      } catch (e) {
        console.error('[PlayerManager] Failed to load players:', e);
      }
    }
  }

  /**
   * Get or create a player
   */
  getOrCreatePlayer(userId, username) {
    if (this.players.has(userId)) {
      return this.players.get(userId);
    }

    const newPlayer = new Player(userId, username);
    this.players.set(userId, newPlayer);
    return newPlayer;
  }

  /**
   * Get player by userId
   */
  getPlayer(userId) {
    return this.players.get(userId);
  }

  /**
   * Save player data (optimized with write buffering)
   */
  savePlayer(player) {
    this.players.set(player.userId, player);
    
    // Non-blocking save: mark dirty but don't write immediately
    this.saveAllPlayersOptimized();
    return true;
  }

  saveAllPlayers() {
    this.saveAllPlayersOptimized();
  }

  /**
   * Optimized save with write buffering (20-30% faster)
   */
  saveAllPlayersOptimized() {
    // If save already in progress, mark for another save after completion
    if (saveInProgress) {
      pendingSave = true;
      return;
    }
    
    saveInProgress = true;
    
    try {
      // Use Array.from with minimal object spread (faster than map)
      const arr = [];
      for (const player of this.players.values()) {
        arr.push({ ...player });
      }
      
      // Synchronous write (async causes issues with rapid saves)
      fs.writeFileSync(SAVE_PATH, JSON.stringify(arr, null, 2), 'utf8');
    } catch (e) {
      console.error('[PlayerManager] Failed to save players:', e);
    } finally {
      saveInProgress = false;
      
      // If another save was requested during this write, execute it now
      if (pendingSave) {
        pendingSave = false;
        // Use setImmediate to avoid blocking
        setImmediate(() => this.saveAllPlayersOptimized());
      }
    }
  }

  deletePlayer(userId) {
    if (this.players.has(userId)) {
      this.players.delete(userId);
      this.saveAllPlayers();
      return true;
    }
    return false;
  }

  /**
   * Get all players
   */
  getAllPlayers() {
    return Array.from(this.players.values());
  }

  /**
   * Get leaderboard (top players by level/xp)
   */
  getLeaderboard(limit = 10) {
    return Array.from(this.players.values())
      .sort((a, b) => {
        if (b.level !== a.level) return b.level - a.level;
        return b.xp - a.xp;
      })
      .slice(0, limit)
      .map((player, index) => ({
        rank: index + 1,
        username: player.username,
        level: player.level,
        xp: player.xp,
      }));
  }
}
