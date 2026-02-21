import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { getGuildLevel, getXPToNextLevel, getGuildBuffs } from '../data/guild-levels.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const GUILDS_FILE = path.join(__dirname, '../../data/guilds.json');

/**
 * Guild Manager System
 * Handles all guild operations, member management, and progression
 */
export class GuildManager {
  constructor() {
    this.guilds = {};
    this.invites = {};
    this.loadGuilds();
  }

  /**
   * Load guilds from file
   */
  loadGuilds() {
    try {
      if (fs.existsSync(GUILDS_FILE)) {
        const data = JSON.parse(fs.readFileSync(GUILDS_FILE, 'utf8'));
        this.guilds = data.guilds || {};
        this.invites = data.invites || {};
        
        // Convert registeredParticipants arrays back to Sets
        for (const guild of Object.values(this.guilds)) {
          if (guild.activeBoss && Array.isArray(guild.activeBoss.registeredParticipants)) {
            guild.activeBoss.registeredParticipants = new Set(guild.activeBoss.registeredParticipants);
          }
          
          // Upgrade guilds with new buff properties
          if (!guild.buffs) guild.buffs = {};
          // Ensure all new buffs are initialized
          if (guild.buffs.craftingSpeed === undefined) guild.buffs.craftingSpeed = 0;
          if (guild.buffs.bossRewardBoost === undefined) guild.buffs.bossRewardBoost = 0;
          if (guild.buffs.rareDropRate === undefined) guild.buffs.rareDropRate = 0;
          if (guild.buffs.damageBonus === undefined) guild.buffs.damageBonus = 0;
          if (guild.buffs.defenseBonus === undefined) guild.buffs.defenseBonus = 0;
        }
      } else {
        this.save();
      }
    } catch (error) {
      console.error('[GuildManager] Error loading guilds:', error);
      this.guilds = {};
      this.invites = {};
    }
  }

  /**
   * Save guilds to file
   */
  save() {
    try {
      // Convert Sets to arrays for JSON serialization
      const guildsToSave = {};
      for (const [guildId, guild] of Object.entries(this.guilds)) {
        const guildCopy = { ...guild };
        if (guildCopy.activeBoss && guildCopy.activeBoss.registeredParticipants instanceof Set) {
          guildCopy.activeBoss = {
            ...guildCopy.activeBoss,
            registeredParticipants: Array.from(guildCopy.activeBoss.registeredParticipants),
          };
        }
        guildsToSave[guildId] = guildCopy;
      }

      const data = {
        guilds: guildsToSave,
        invites: this.invites,
      };
      fs.writeFileSync(GUILDS_FILE, JSON.stringify(data, null, 2));
    } catch (error) {
      console.error('[GuildManager] Error saving guilds:', error);
    }
  }

  /**
   * Create a new guild
   */
  createGuild(leaderId, guildName, guildTag, description, settings = {}) {
    // Validate guild name
    if (!guildName || guildName.length < 3 || guildName.length > 32) {
      return { success: false, error: 'Guild name must be 3-32 characters' };
    }

    // Validate tag
    if (!guildTag || guildTag.length < 2 || guildTag.length > 6) {
      return { success: false, error: 'Guild tag must be 2-6 characters' };
    }

    // Check if name/tag already exists
    const existingGuild = Object.values(this.guilds).find(
      g => g.name.toLowerCase() === guildName.toLowerCase() || 
           g.tag.toLowerCase() === guildTag.toLowerCase()
    );

    if (existingGuild) {
      return { success: false, error: 'Guild name or tag already taken' };
    }

    // Check if player is already in a guild
    const playerGuild = this.getPlayerGuild(leaderId);
    if (playerGuild) {
      return { success: false, error: 'You are already in a guild' };
    }

    const guildId = `guild_${Date.now()}_${leaderId}`;
    const guild = {
      id: guildId,
      name: guildName,
      tag: guildTag,
      description: description || 'A new adventuring guild',
      leaderId,
      createdAt: Date.now(),
      xp: 0,
      level: 1,
      gold: 0,
      members: {
        [leaderId]: {
          userId: leaderId,
          role: 'leader',
          joinedAt: Date.now(),
          contributedXP: 0,
          contributedGold: 0,
          contributionPoints: 0,
        },
      },
      settings: {
        isPublic: settings.isPublic ?? true,
        minLevel: settings.minLevel || 1,
        requireApplication: settings.requireApplication ?? false,
      },
      buffs: {
        xpBonus: 0,
        goldBonus: 0,
        shopDiscount: 0,
        gatheringSpeed: 0,
        craftingSpeed: 0,
        bossRewardBoost: 0,
        rareDropRate: 0,
        damageBonus: 0,
        defenseBonus: 0,
      },
      vault: [],
      bank: {
        items: [],
        materials: {},
        gold: 0,
      },
      announcements: [],
      claimedAchievements: [],
      shopPurchases: {},
      stats: {
        questsCompleted: 0,
        dungeonsCleared: 0,
      },
      activeBoss: null,
      bossHistory: [],
      weekly: {
        lastReset: Date.now(),
        questsCompleted: 0,
        xpEarned: 0,
      },
    };

    this.guilds[guildId] = guild;
    this.save();

    return { success: true, guild };
  }

  /**
   * Get guild by ID
   */
  getGuild(guildId) {
    return this.guilds[guildId] || null;
  }

  /**
   * Get player's guild
   */
  getPlayerGuild(userId) {
    for (const guild of Object.values(this.guilds)) {
      if (guild.members[userId]) {
        return guild;
      }
    }
    return null;
  }

  /**
   * Invite player to guild
   */
  invitePlayer(guildId, inviterId, targetId) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    // Check inviter permissions
    const inviter = guild.members[inviterId];
    if (!inviter || (inviter.role !== 'leader' && inviter.role !== 'officer')) {
      return { success: false, error: 'No permission to invite' };
    }

    // Check if target is already in a guild
    if (this.getPlayerGuild(targetId)) {
      return { success: false, error: 'Player is already in a guild' };
    }

    // Check member limit
    const levelInfo = getGuildLevel(guild.xp);
    if (Object.keys(guild.members).length >= levelInfo.info.memberLimit) {
      return { success: false, error: 'Guild is full' };
    }

    // Create invite
    if (!this.invites[targetId]) this.invites[targetId] = [];
    
    // Check for existing invite
    const existing = this.invites[targetId].find(i => i.guildId === guildId);
    if (existing) {
      return { success: false, error: 'Invite already sent' };
    }

    this.invites[targetId].push({
      guildId,
      inviterId,
      timestamp: Date.now(),
      expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000), // 7 days
    });

    this.save();
    return { success: true };
  }

  /**
   * Accept guild invite
   */
  acceptInvite(userId, guildId) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    // Check if player is already in a guild
    if (this.getPlayerGuild(userId)) {
      return { success: false, error: 'You are already in a guild' };
    }

    // Check for invite
    const playerInvites = this.invites[userId] || [];
    const invite = playerInvites.find(i => i.guildId === guildId);
    if (!invite) {
      return { success: false, error: 'No invite found' };
    }

    // Check if expired
    if (Date.now() > invite.expiresAt) {
      this.invites[userId] = playerInvites.filter(i => i.guildId !== guildId);
      this.save();
      return { success: false, error: 'Invite has expired' };
    }

    // Check member limit
    const levelInfo = getGuildLevel(guild.xp);
    if (Object.keys(guild.members).length >= levelInfo.info.memberLimit) {
      return { success: false, error: 'Guild is full' };
    }

    // Add to guild
    guild.members[userId] = {
      userId,
      role: 'member',
      joinedAt: Date.now(),
      contributedXP: 0,
      contributedGold: 0,
    };

    // Remove invite
    this.invites[userId] = playerInvites.filter(i => i.guildId !== guildId);
    this.save();

    return { success: true, guild };
  }

  /**
   * Leave guild
   */
  leaveGuild(userId) {
    const guild = this.getPlayerGuild(userId);
    if (!guild) return { success: false, error: 'Not in a guild' };

    const member = guild.members[userId];
    
    // If leader, check if they can leave
    if (member.role === 'leader') {
      const memberCount = Object.keys(guild.members).length;
      if (memberCount > 1) {
        return { success: false, error: 'Transfer leadership before leaving' };
      } else {
        // Delete guild if leader is only member
        delete this.guilds[guild.id];
        this.save();
        return { success: true, disbanded: true };
      }
    }

    delete guild.members[userId];
    this.save();
    return { success: true };
  }

  /**
   * Kick member from guild
   */
  kickMember(guildId, kickerId, targetId) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    const kicker = guild.members[kickerId];
    const target = guild.members[targetId];

    if (!kicker || !target) {
      return { success: false, error: 'Invalid member' };
    }

    // Check permissions
    if (kicker.role === 'member') {
      return { success: false, error: 'No permission to kick' };
    }

    if (target.role === 'leader') {
      return { success: false, error: 'Cannot kick leader' };
    }

    if (kicker.role === 'officer' && target.role === 'officer') {
      return { success: false, error: 'Officers cannot kick other officers' };
    }

    delete guild.members[targetId];
    this.save();
    return { success: true };
  }

  /**
   * Promote member
   */
  promoteMember(guildId, promoterId, targetId) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    const promoter = guild.members[promoterId];
    const target = guild.members[targetId];

    if (!promoter || !target) {
      return { success: false, error: 'Invalid member' };
    }

    if (promoter.role !== 'leader') {
      return { success: false, error: 'Only leader can promote' };
    }

    if (target.role === 'member') {
      target.role = 'officer';
    } else if (target.role === 'officer') {
      // Transfer leadership
      target.role = 'leader';
      promoter.role = 'officer';
    }

    this.save();
    return { success: true };
  }

  /**
   * Demote member
   */
  demoteMember(guildId, demoterId, targetId) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    const demoter = guild.members[demoterId];
    const target = guild.members[targetId];

    if (!demoter || !target) {
      return { success: false, error: 'Invalid member' };
    }

    if (demoter.role !== 'leader') {
      return { success: false, error: 'Only leader can demote' };
    }

    if (target.role === 'officer') {
      target.role = 'member';
      this.save();
      return { success: true };
    }

    return { success: false, error: 'Cannot demote this member' };
  }

  /**
   * Contribute XP to guild
   */
  contributeXP(guildId, userId, amount) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.members[userId]) return;

    guild.xp += amount;
    guild.members[userId].contributedXP += amount;
    guild.weekly.xpEarned += amount;

    this.save();
  }

  /**
   * Contribute gold to guild treasury
   */
  contributeGold(guildId, userId, amount) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.members[userId]) {
      return { success: false, error: 'Not in guild' };
    }

    guild.gold += amount;
    guild.members[userId].contributedGold += amount;
    this.save();

    return { success: true };
  }

  /**
   * Purchase guild buff
   */
  purchaseBuff(guildId, userId, buffType, cost) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    const member = guild.members[userId];
    if (!member || (member.role !== 'leader' && member.role !== 'officer')) {
      return { success: false, error: 'No permission' };
    }

    if (guild.gold < cost) {
      return { success: false, error: 'Not enough guild gold' };
    }

    guild.gold -= cost;
    guild.buffs[buffType] += 1;
    this.save();

    return { success: true };
  }

  /**
   * Get guild info with calculated values
   */
  getGuildInfo(guildId) {
    const guild = this.getGuild(guildId);
    if (!guild) return null;

    const levelInfo = getGuildLevel(guild.xp);
    const buffs = getGuildBuffs(levelInfo.level, guild.buffs);
    const xpToNext = getXPToNextLevel(guild.xp);

    return {
      ...guild,
      level: levelInfo.level,
      xpToNext,
      memberCount: Object.keys(guild.members).length,
      memberLimit: levelInfo.info.memberLimit,
      totalBuffs: buffs,
    };
  }

  /**
   * Search guilds
   */
  searchGuilds(query) {
    const lowerQuery = query.toLowerCase();
    return Object.values(this.guilds).filter(g => 
      g.name.toLowerCase().includes(lowerQuery) || 
      g.tag.toLowerCase().includes(lowerQuery)
    );
  }

  /**
   * Get public guilds
   */
  getPublicGuilds() {
    return Object.values(this.guilds).filter(g => g.settings.isPublic);
  }

  /**
   * Get top guilds by XP
   */
  getTopGuilds(limit = 10) {
    return Object.values(this.guilds)
      .sort((a, b) => b.xp - a.xp)
      .slice(0, limit);
  }

  /**
   * Start a guild boss fight
   */
  startBoss(guildId, userId, bossData) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    const member = guild.members[userId];
    if (!member || (member.role !== 'leader' && member.role !== 'officer')) {
      return { success: false, error: 'Only officers and leaders can start boss fights' };
    }

    if (guild.activeBoss) {
      return { success: false, error: 'A boss fight is already in progress!' };
    }

    const now = Date.now();
    const registrationDeadline = now + (24 * 60 * 60 * 1000); // 1 day registration window
    
    // Cap defense at 150 max (no unkillable bosses)
    const cappedDefense = Math.min(bossData.defense, 150);
    
    guild.activeBoss = {
      bossId: bossData.id,
      name: bossData.name,
      icon: bossData.icon,
      maxHP: bossData.maxHP,
      currentHP: bossData.maxHP,
      defense: cappedDefense,
      originalDefense: bossData.defense,
      attack: bossData.attack,
      rewards: bossData.rewards,
      expiresAt: bossData.expiresAt || (now + 3 * 24 * 60 * 60 * 1000),
      startedAt: now,
      startedBy: userId,
      registrationDeadline, // Officers have 1 day to register players
      registeredParticipants: new Set([userId]), // Auto-register the officer who started it
      participants: {}, // userId -> { damageDealt, defeats }
      defeats: {}, // userId -> number of defeats
    };

    this.save();
    return { success: true, boss: guild.activeBoss };
  }

  /**
   * Attack the active guild boss
   */
  attackBoss(guildId, userId, damage) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    if (!guild.members[userId]) {
      return { success: false, error: 'You are not in this guild' };
    }

    if (!guild.activeBoss) {
      return { success: false, error: 'No active boss fight' };
    }

    const boss = guild.activeBoss;

    // Apply damage
    const actualDamage = Math.max(1, damage - Math.floor(boss.defense * 0.5));
    boss.currentHP = Math.max(0, boss.currentHP - actualDamage);

    // Track participant damage
    if (!boss.participants[userId]) {
      boss.participants[userId] = 0;
    }
    boss.participants[userId] += actualDamage;

    // Check if boss is defeated
    const defeated = boss.currentHP <= 0;

    this.save();

    return {
      success: true,
      damage: actualDamage,
      bossHP: boss.currentHP,
      bossMaxHP: boss.maxHP,
      defeated,
    };
  }

  /**
   * Apply already-calculated damage to the active guild boss
   */
  applyBossDamage(guildId, userId, actualDamage) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    if (!guild.members[userId]) {
      return { success: false, error: 'You are not in this guild' };
    }

    if (!guild.activeBoss) {
      return { success: false, error: 'No active boss fight' };
    }

    const boss = guild.activeBoss;
    const safeDamage = Math.max(0, Math.floor(actualDamage || 0));
    boss.currentHP = Math.max(0, boss.currentHP - safeDamage);

    if (!boss.participants[userId]) {
      boss.participants[userId] = 0;
    }
    boss.participants[userId] += safeDamage;

    const defeated = boss.currentHP <= 0;

    this.save();

    return {
      success: true,
      damage: safeDamage,
      bossHP: boss.currentHP,
      bossMaxHP: boss.maxHP,
      defeated,
    };
  }

  /**
   * Complete a guild boss fight and distribute rewards
   */
  completeBoss(guildId, options = {}) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.activeBoss) {
      return { success: false, error: 'No active boss' };
    }

    const boss = guild.activeBoss;
    const totalDamage = Object.values(boss.participants).reduce((sum, dmg) => sum + dmg, 0);
    const damageDone = Math.max(0, boss.maxHP - boss.currentHP);
    const remainingPercent = boss.maxHP > 0 ? (boss.currentHP / boss.maxHP) * 100 : 0;
    const defeated = boss.currentHP <= 0;
    const tier = this.getBossRewardTier(remainingPercent);

    // Add to history
    guild.bossHistory.push({
      bossId: boss.bossId,
      name: boss.name,
      defeatedAt: Date.now(),
      participants: boss.participants,
      duration: Date.now() - boss.startedAt,
      defeated,
      tier,
      damageDone,
      remainingPercent: Number(remainingPercent.toFixed(2)),
      reason: options.reason || (defeated ? 'defeated' : 'expired'),
    });

    // Keep only last 10 boss kills in history
    if (guild.bossHistory.length > 10) {
      guild.bossHistory = guild.bossHistory.slice(-10);
    }

    // Clear active boss
    guild.activeBoss = null;
    this.save();

    return {
      success: true,
      boss,
      defeated,
      tier,
      damageDone,
      remainingPercent: Number(remainingPercent.toFixed(2)),
      totalDamage,
      participants: { ...boss.participants },
    };
  }

  getBossRewardTier(remainingPercent) {
    if (remainingPercent <= 0) return 6;
    if (remainingPercent <= 5) return 6;
    if (remainingPercent <= 10) return 5;
    if (remainingPercent <= 20) return 4;
    if (remainingPercent <= 40) return 3;
    if (remainingPercent <= 60) return 2;
    if (remainingPercent <= 80) return 1;
    return 0;
  }

  /**
   * Get active boss info
   */
  getActiveBoss(guildId) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.activeBoss) return null;
    return guild.activeBoss;
  }

  /**
   * Check if user can participate in the active boss fight
   * Returns { canFight: bool, reason: string, isRegistrationOpen: bool }
   */
  canParticipateInBoss(guildId, userId, now = Date.now()) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.activeBoss) {
      return { canFight: false, reason: 'No active boss', isRegistrationOpen: false };
    }

    const boss = guild.activeBoss;
    const isRegistrationOpen = now < boss.registrationDeadline;
    const isRegistered = boss.registeredParticipants && boss.registeredParticipants.has(userId);

    // If registration is still open, anyone can fight
    if (isRegistrationOpen) {
      return { canFight: true, reason: 'Registration open', isRegistrationOpen: true };
    }

    // If registration closed, only registered participants can fight
    if (isRegistered) {
      return { canFight: true, reason: 'Registered before deadline', isRegistrationOpen: false };
    }

    return { canFight: false, reason: 'Registration closed - you did not register in time', isRegistrationOpen: false };
  }

  /**
   * Register a user for the active boss fight
   */
  registerForBoss(guildId, userId) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.activeBoss) return false;

    if (!guild.activeBoss.registeredParticipants) {
      guild.activeBoss.registeredParticipants = new Set();
    }
    guild.activeBoss.registeredParticipants.add(userId);
    this.save();
    return true;
  }

  /**
   * Record a defeat for a user (consumes 1 attempt)
   */
  recordBossDefeat(guildId, userId) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.activeBoss) return false;

    if (!guild.activeBoss.defeats) {
      guild.activeBoss.defeats = {};
    }
    guild.activeBoss.defeats[userId] = (guild.activeBoss.defeats[userId] || 0) + 1;
    this.save();
    return true;
  }

  /**
   * Get remaining attempts for a user
   */
  getRemainingBossAttempts(guildId, userId, maxAttempts = 3) {
    const guild = this.getGuild(guildId);
    if (!guild || !guild.activeBoss) return maxAttempts;

    const defeats = guild.activeBoss.defeats ? (guild.activeBoss.defeats[userId] || 0) : 0;
    return Math.max(0, maxAttempts - defeats);
  }

  /**
   * Cancel/reset a boss fight (admin function)
   */
  cancelBoss(guildId, userId) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    const member = guild.members[userId];
    if (!member || member.role !== 'leader') {
      return { success: false, error: 'Only the leader can cancel boss fights' };
    }

    guild.activeBoss = null;
    this.save();
    return { success: true };
  }

  /**
   * Join a public guild directly
   */
  joinGuild(userId, guildId) {
    const guild = this.getGuild(guildId);
    if (!guild) return { success: false, error: 'Guild not found' };

    // Check if player is already in a guild
    if (this.getPlayerGuild(userId)) {
      return { success: false, error: 'You are already in a guild' };
    }

    // Check if guild is public
    if (!guild.settings.isPublic) {
      return { success: false, error: 'This guild requires an invite' };
    }

    // Check member limit
    const levelInfo = getGuildLevel(guild.xp);
    if (Object.keys(guild.members).length >= levelInfo.info.memberLimit) {
      return { success: false, error: 'Guild is full' };
    }

    // Add to guild
    guild.members[userId] = {
      userId,
      role: 'member',
      joinedAt: Date.now(),
      contributedXP: 0,
      contributedGold: 0,
      contributionPoints: 0,
    };

    this.save();
    return { success: true, guild };
  }

  /**
   * Get player's pending invites
   */
  getPlayerInvites(userId) {
    const invites = this.invites[userId] || [];
    const now = Date.now();
    
    // Filter out expired invites
    const validInvites = invites.filter(invite => invite.expiresAt > now);
    
    // Update if any were removed
    if (validInvites.length !== invites.length) {
      this.invites[userId] = validInvites;
      this.save();
    }

    return validInvites.map(invite => {
      const guild = this.getGuild(invite.guildId);
      return {
        ...invite,
        guild,
      };
    });
  }
}

// Singleton instance
export const guildManager = new GuildManager();
