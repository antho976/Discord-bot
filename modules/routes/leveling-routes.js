import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Leveling system routes: users, edit, config, sync-roles, CSV, prestige
 */
export function registerLevelingRoutes(app, deps) {
  const {
    addLog, chatStats, checkStream, client, dashAudit,
    dashboardSettings, debouncedSaveState, fetchUserName, getUserTier,
    giveaways, history, invalidateAnalyticsCache, leveling,
    loadJSON, LOG_FILE, logs, normalizeYouTubeAlertsSettings,
    PETS_PATH, polls, reminders, renderPage, requireAuth,
    requireTier, rpgEvents, saveAuditLogHistory, saveConfig, saveJSON,
    saveState, schedule, state, stats, streamGoals,
    streamInfo, suggestions, TIER_ACCESS, twitchTokens, upload,
    welcomeSettings, DATA_DIR,
    logSSEClients, activeSessionTokens, streamVars,
    announceLive, getChannelVIPs, sendScheduleAlert,
    membersCache, startTime, apiRateLimits, buildOfflineEmbed,
    weeklyLeveling, levelingConfig
  } = deps;

  app.get('/leveling/users', requireAuth, async (req, res) => {
    try {
      const userNames = {};
      const topUsers = Object.keys(leveling).slice(0, 100); // Get top 100
      
      for (const userId of topUsers) {
        try {
          const user = await client.users.fetch(userId);
          userNames[userId] = user.username;
        } catch (err) {
          userNames[userId] = `Unknown (${userId})`;
        }
      }
      
      res.json({ userNames });
    } catch (err) {
      res.json({ userNames: {}, error: err.message });
    }
  });
  
  app.post('/leveling/edit', requireAuth, (req, res) => {
    const { id, level, xp, xpMultiplier } = req.body;
    if (!leveling[id]) leveling[id] = { xp: 0, level: 0, lastMsg: 0 };
    leveling[id].level = Math.max(0, parseInt(level));
    leveling[id].xp = Math.max(0, parseInt(xp));
    leveling[id].xpMultiplier = Math.max(1, parseFloat(xpMultiplier) || 1);
    saveState();
    dashAudit(req.userName || 'Dashboard', 'leveling-edit', `Edited user ${id}: level=${level}, xp=${xp}`);
    res.json({ success: true });
  });
  
  // Leveling config endpoint
  app.post('/leveling/config', requireAuth, (req, res) => {
    const {
      xpPerMessageMin,
      xpPerMessageMax,
      messageCooldownMs,
      xpPerVoiceMinute,
      xpPerReaction,
      levelMilestones,
      roleRewards,
      xpMode,
      baseXp,
      xpIncrement,
      customXpPerLevel,
      prestigeThresholds,
      prestigeBenefits,
      prestigeMinLevel,
      prestigeXpCost,
      ignoreChannels,
      ignoreRoles,
      globalMultiplier,
      roleMultipliers,
      channelMultipliers,
      enableTimeBoost,
      timeBoostMultiplier,
      timeBoostStartDay,
      timeBoostEndDay,
      timeBoostStartHour,
      timeBoostEndHour,
      enableXpDecay,
      xpDecayDays,
      xpDecayPercent,
      customLevelUpMessage,
      milestonesOnly,
      dmOnLevelUp,
      levelUpColor,
      levelUpThumbnail,
      levelUpFooter
    } = req.body || {};
  
    const min = Number.isFinite(xpPerMessageMin) ? Math.max(0, xpPerMessageMin) : levelingConfig.xpPerMessageMin;
    const max = Number.isFinite(xpPerMessageMax) ? Math.max(min, xpPerMessageMax) : Math.max(min, levelingConfig.xpPerMessageMax);
    const cooldown = Number.isFinite(messageCooldownMs) ? Math.max(0, messageCooldownMs) : levelingConfig.messageCooldownMs;
    const voice = Number.isFinite(xpPerVoiceMinute) ? Math.max(0, xpPerVoiceMinute) : levelingConfig.xpPerVoiceMinute ?? 5;
    const reaction = Number.isFinite(xpPerReaction) ? Math.max(0, xpPerReaction) : levelingConfig.xpPerReaction ?? 2;
    const milestones = Array.isArray(levelMilestones)
      ? levelMilestones.filter(n => Number.isFinite(n) && n > 0).map(n => Math.floor(n)).sort((a, b) => a - b)
      : levelingConfig.levelMilestones || [10, 25, 50, 100];
    const rewards = roleRewards && typeof roleRewards === 'object' ? roleRewards : levelingConfig.roleRewards;
    const mode = xpMode === 'custom' ? 'custom' : 'increment';
    const base = Number.isFinite(baseXp) ? Math.max(0, baseXp) : (levelingConfig.baseXp ?? 100);
    const inc = Number.isFinite(xpIncrement) ? Math.max(0, xpIncrement) : (levelingConfig.xpIncrement ?? 50);
    const custom = (customXpPerLevel && typeof customXpPerLevel === 'object') ? customXpPerLevel : (levelingConfig.customXpPerLevel || {});
    const thresholds = (prestigeThresholds && typeof prestigeThresholds === 'object') ? prestigeThresholds : (levelingConfig.prestigeThresholds || {});
    const benefits = (prestigeBenefits && typeof prestigeBenefits === 'object') ? prestigeBenefits : (levelingConfig.prestigeBenefits || {});
    const minLvl = Number.isFinite(prestigeMinLevel) ? Math.max(0, prestigeMinLevel) : (levelingConfig.prestigeMinLevel ?? 50);
    const xpCost = Number.isFinite(prestigeXpCost) ? Math.max(0, prestigeXpCost) : (levelingConfig.prestigeXpCost ?? 0);
    const ignoreCh = Array.isArray(ignoreChannels) ? ignoreChannels : (levelingConfig.ignoreChannels || []);
    const ignoreRo = Array.isArray(ignoreRoles) ? ignoreRoles : (levelingConfig.ignoreRoles || []);
    const globMult = Number.isFinite(globalMultiplier) ? Math.max(1, globalMultiplier) : (levelingConfig.globalMultiplier ?? 1);
    const roleMult = (roleMultipliers && typeof roleMultipliers === 'object') ? roleMultipliers : (levelingConfig.roleMultipliers || {});
    const chanMult = (channelMultipliers && typeof channelMultipliers === 'object') ? channelMultipliers : (levelingConfig.channelMultipliers || {});
    
    Object.assign(levelingConfig, {
      xpPerMessageMin: min,
      xpPerMessageMax: max,
      messageCooldownMs: cooldown,
      xpPerVoiceMinute: voice,
      xpPerReaction: reaction,
      levelMilestones: milestones,
      roleRewards: rewards,
      xpMode: mode,
      baseXp: base,
      xpIncrement: inc,
      customXpPerLevel: custom,
      prestigeThresholds: thresholds,
      prestigeBenefits: benefits,
      prestigeMinLevel: minLvl,
      prestigeXpCost: xpCost,
      ignoreChannels: ignoreCh,
      ignoreRoles: ignoreRo,
      globalMultiplier: globMult,
      roleMultipliers: roleMult,
      channelMultipliers: chanMult,
      enableTimeBoost: enableTimeBoost === true || enableTimeBoost === 'true',
      timeBoostMultiplier: Number.isFinite(timeBoostMultiplier) ? Math.max(1, timeBoostMultiplier) : 2,
      timeBoostStartDay: Number.isFinite(timeBoostStartDay) ? Math.max(0, Math.min(6, timeBoostStartDay)) : 5,
      timeBoostEndDay: Number.isFinite(timeBoostEndDay) ? Math.max(0, Math.min(6, timeBoostEndDay)) : 0,
      timeBoostStartHour: Number.isFinite(timeBoostStartHour) ? Math.max(0, Math.min(23, timeBoostStartHour)) : 0,
      timeBoostEndHour: Number.isFinite(timeBoostEndHour) ? Math.max(0, Math.min(23, timeBoostEndHour)) : 23,
      enableXpDecay: enableXpDecay === true || enableXpDecay === 'true',
      xpDecayDays: Number.isFinite(xpDecayDays) ? Math.max(1, xpDecayDays) : 14,
      xpDecayPercent: Number.isFinite(xpDecayPercent) ? Math.max(0, Math.min(100, xpDecayPercent)) : 5,
      customLevelUpMessage: customLevelUpMessage || levelingConfig.customLevelUpMessage || '🎉 {mention} just reached Level {level}!',
      milestonesOnly: milestonesOnly === true || milestonesOnly === 'true' || false,
      dmOnLevelUp: dmOnLevelUp === true || dmOnLevelUp === 'true' || false,
      levelUpColor: levelUpColor || levelingConfig.levelUpColor || '#9146ff',
      levelUpThumbnail: levelUpThumbnail || levelingConfig.levelUpThumbnail || '',
      levelUpFooter: levelUpFooter || levelingConfig.levelUpFooter || 'Keep grinding!',
      xpMultiplier: levelingConfig.xpMultiplier || 1,
      multiplierEndTime: levelingConfig.multiplierEndTime || null
    });
  
    saveState();
    dashAudit(req.userName || 'Dashboard', 'leveling-config', 'Updated leveling configuration');
    res.json({ success: true, levelingConfig });
  });
  
  // ========== ROLE SYNC ENDPOINT ==========
  const _roleSyncDelay = ms => new Promise(r => setTimeout(r, ms));
  
  app.get('/leveling/sync-roles', requireAuth, requireTier('admin'), async (req, res) => {
    // Preview mode - uses member cache JSON (no Discord API calls)
    try {
      const keepRoles = req.query.keepRoles !== '0';
      const rewards = levelingConfig.roleRewards || {};
      const rewardEntries = Object.entries(rewards).map(([lvl, roleId]) => ({ level: parseInt(lvl), roleId })).sort((a, b) => a.level - b.level);
      if (rewardEntries.length === 0) return res.json({ success: true, checked: 0, toAdd: [], toRemove: [], message: 'No role rewards configured' });
  
      const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
      const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
      if (!guild) return res.json({ success: false, error: 'Guild not found' });
  
      const toAdd = [];
      const toRemove = [];
      let checked = 0;
      const cache = membersCache.members || {};
  
      for (const [userId, data] of Object.entries(leveling || {})) {
        const cached = cache[userId];
        const member = guild.members.cache.get(userId);
        const roles = member ? [...member.roles.cache.keys()] : (cached?.roles || []);
        const userName = member?.user?.username || cached?.username || userId;
        if (!member && !cached) continue;
        checked++;
        const userLevel = data.level || 0;
  
        for (const reward of rewardEntries) {
          const hasRole = roles.includes(reward.roleId);
          const role = guild.roles.cache.get(reward.roleId);
          const roleName = role?.name || reward.roleId;
  
          if (userLevel >= reward.level && !hasRole && role) {
            toAdd.push({ userId, userName, roleId: reward.roleId, roleName, level: reward.level });
          } else if (!keepRoles && userLevel < reward.level && hasRole && role) {
            toRemove.push({ userId, userName, roleId: reward.roleId, roleName, level: reward.level });
          }
        }
      }
      res.json({ success: true, checked, toAdd, toRemove, keepRoles, cacheAge: membersCache.lastFullSync ? Date.now() - membersCache.lastFullSync : null });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/leveling/sync-roles', requireAuth, requireTier('admin'), async (req, res) => {
    try {
      const keepRoles = req.body?.keepRoles !== false;
      const rewards = levelingConfig.roleRewards || {};
      const rewardEntries = Object.entries(rewards).map(([lvl, roleId]) => ({ level: parseInt(lvl), roleId })).sort((a, b) => a.level - b.level);
      if (rewardEntries.length === 0) return res.json({ success: true, checked: 0, added: 0, removed: 0, details: [], message: 'No role rewards configured' });
  
      const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
      const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
      if (!guild) return res.json({ success: false, error: 'Guild not found' });
  
      // Fetch only the users we need, in batches, to avoid gateway rate limits
      const userIds = Object.keys(leveling || {});
      const FETCH_BATCH = 50;
      for (let i = 0; i < userIds.length; i += FETCH_BATCH) {
        const batch = userIds.slice(i, i + FETCH_BATCH).filter(id => !guild.members.cache.has(id));
        if (batch.length > 0) {
          await guild.members.fetch({ user: batch }).catch(() => {});
          if (i + FETCH_BATCH < userIds.length) await _roleSyncDelay(1000);
        }
      }
  
      const details = [];
      let added = 0, removed = 0, skipped = 0, checked = 0;
      let opsInBatch = 0;
      const ROLE_BATCH = 5; // max role changes before pausing
      const ROLE_DELAY = 1500; // ms to wait between batches
  
      for (const [userId, data] of Object.entries(leveling || {})) {
        const member = guild.members.cache.get(userId);
        if (!member) continue;
        checked++;
        const userLevel = data.level || 0;
  
        for (const reward of rewardEntries) {
          const hasRole = member.roles.cache.has(reward.roleId);
          const role = guild.roles.cache.get(reward.roleId);
          if (!role) continue;
  
          if (userLevel >= reward.level && !hasRole) {
            // Rate-limit: pause after every ROLE_BATCH operations
            if (opsInBatch >= ROLE_BATCH) {
              await _roleSyncDelay(ROLE_DELAY);
              opsInBatch = 0;
            }
            try {
              await member.roles.add(role, 'Leveling role sync');
              added++;
              opsInBatch++;
              details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'added' });
            } catch (e) {
              // If rate limited, wait and retry once
              if (e.status === 429 || e.httpStatus === 429) {
                const retryAfter = (e.retryAfter || e.retry_after || 5) * 1000;
                await _roleSyncDelay(retryAfter + 500);
                try {
                  await member.roles.add(role, 'Leveling role sync');
                  added++;
                  opsInBatch = 0;
                  details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'added' });
                } catch (e2) {
                  details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'failed: ' + e2.message });
                }
              } else {
                details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'failed: ' + e.message });
              }
            }
          } else if (userLevel < reward.level && hasRole) {
            if (keepRoles) {
              skipped++;
            } else {
              if (opsInBatch >= ROLE_BATCH) {
                await _roleSyncDelay(ROLE_DELAY);
                opsInBatch = 0;
              }
              try {
                await member.roles.remove(role, 'Leveling role sync - below level');
                removed++;
                opsInBatch++;
                details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'removed' });
              } catch (e) {
                if (e.status === 429 || e.httpStatus === 429) {
                  const retryAfter = (e.retryAfter || e.retry_after || 5) * 1000;
                  await _roleSyncDelay(retryAfter + 500);
                  try {
                    await member.roles.remove(role, 'Leveling role sync - below level');
                    removed++;
                    opsInBatch = 0;
                    details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'removed' });
                  } catch (e2) {
                    details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'failed: ' + e2.message });
                  }
                } else {
                  details.push({ userId, userName: member.user.username, roleId: reward.roleId, roleName: role.name, level: reward.level, action: 'failed: ' + e.message });
                }
              }
            }
          }
        }
      }
  
      addLog('info', `Role sync completed by ${req.userName || 'Dashboard'}: ${added} added, ${removed} removed, ${skipped} kept, ${checked} users checked (keepRoles=${keepRoles})`);
      res.json({ success: true, checked, added, removed, skipped, details, keepRoles });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/leveling/import-csv', requireAuth, requireTier('moderator'), (req, res) => {
    const csv = typeof req.body?.csv === 'string' ? req.body.csv : '';
    if (!csv.trim()) {
      return res.status(400).json({ success: false, error: 'CSV content is empty' });
    }
  
    const parseCsvLine = (line) => {
      const cells = [];
      let current = '';
      let inQuotes = false;
      for (let idx = 0; idx < line.length; idx++) {
        const char = line[idx];
        if (char === '"') {
          if (inQuotes && line[idx + 1] === '"') {
            current += '"';
            idx++;
          } else {
            inQuotes = !inQuotes;
          }
        } else if (char === ',' && !inQuotes) {
          cells.push(current);
          current = '';
        } else {
          current += char;
        }
      }
      cells.push(current);
      return cells;
    };
  
    const normalizeName = (value) => String(value || '').trim().toLowerCase();
    const nameToIds = new Map();
    const upsertName = (name, userId) => {
      const key = normalizeName(name);
      if (!key) return;
      if (!nameToIds.has(key)) nameToIds.set(key, new Set());
      nameToIds.get(key).add(userId);
    };
  
    for (const [userId, name] of Object.entries(userNameCache || {})) {
      upsertName(name, userId);
    }
    for (const userId of Object.keys(leveling || {})) {
      upsertName(userNameCache[userId] || userId, userId);
    }
  
    const lines = csv
      .split(/\r?\n/)
      .map(line => line.trim())
      .filter(Boolean);
  
    let imported = 0;
    let skipped = 0;
  
    for (let lineIndex = 0; lineIndex < lines.length; lineIndex++) {
      const rawLine = lines[lineIndex];
      const cols = parseCsvLine(rawLine).map(c => String(c || '').trim());
      if (cols.length < 4) {
        skipped++;
        continue;
      }
  
      const [nameRaw, levelRaw, xpRaw, prestigeRaw] = cols;
      if (
        lineIndex === 0 &&
        /name|user/i.test(nameRaw) &&
        /lvl|level/i.test(levelRaw) &&
        /xp/i.test(xpRaw)
      ) {
        continue;
      }
  
      const level = parseInt(levelRaw, 10);
      const xp = parseInt(xpRaw, 10);
      const prestigeLevel = parseInt(prestigeRaw, 10);
      if (!Number.isFinite(level) || !Number.isFinite(xp) || !Number.isFinite(prestigeLevel)) {
        skipped++;
        continue;
      }
  
      let userId = null;
      if (/^\d{15,22}$/.test(nameRaw)) {
        userId = nameRaw;
      } else {
        const matches = nameToIds.get(normalizeName(nameRaw));
        if (matches && matches.size === 1) {
          userId = Array.from(matches)[0];
        }
      }
  
      if (!userId) {
        skipped++;
        continue;
      }
  
      if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
      leveling[userId].level = Math.max(0, level);
      leveling[userId].xp = Math.max(0, xp);
      leveling[userId].lastMsg = Date.now();
      leveling[userId].xpMultiplier = Math.max(1, parseFloat(leveling[userId].xpMultiplier) || 1);
  
      if (!prestige) prestige = {};
      prestige[userId] = Math.max(0, prestigeLevel);
  
      if (!userNameCache[userId] && !/^\d{15,22}$/.test(nameRaw)) {
        userNameCache[userId] = nameRaw;
      }
  
      imported++;
    }
  
    saveState();
    addLog('info', `Leveling CSV import completed: ${imported} imported, ${skipped} skipped`);
    dashAudit(req.userName || 'Dashboard', 'leveling-import', `CSV import: ${imported} imported, ${skipped} skipped`);
    return res.json({ success: true, imported, skipped });
  });
  
  // NEW: Prestige endpoints
  app.post('/leveling/prestige', requireAuth, (req, res) => {
    const { userId, prestigeLevel } = req.body || {};
    
    if (!userId || prestigeLevel === undefined) {
      return res.status(400).json({ error: 'Missing userId or prestigeLevel' });
    }
    
    if (!prestige) prestige = {};
    prestige[userId] = Math.max(0, parseInt(prestigeLevel));
    
    if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
    // Progressive prestige: do NOT reset level/XP
    
    // Add to prestige history
    if (!prestigeHistory) prestigeHistory = [];
    prestigeHistory.push({
      userId: userId,
      username: userNameCache[userId] || userId,
      prestigeLevel: Math.max(0, parseInt(prestigeLevel)),
      timestamp: Date.now()
    });
    // Keep only last 100 entries
    if (prestigeHistory.length > 100) prestigeHistory = prestigeHistory.slice(-100);
    
    saveState();
    addLog('info', `User ${userId} granted prestige level ${prestigeLevel}`);
    dashAudit(req.userName || 'Dashboard', 'prestige-set', `User ${userId} granted prestige ${prestigeLevel}`);
    res.json({ success: true });
  });
  
  app.post('/leveling/reset-level', requireAuth, (req, res) => {
    const { userId } = req.body || {};
    
    if (!userId) {
      return res.status(400).json({ error: 'Missing userId' });
    }
    
    if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
    leveling[userId].level = 0;
    leveling[userId].xp = 0;
    
    saveState();
    addLog('info', `User ${userId} level reset to 0`);
    dashAudit(req.userName || 'Dashboard', 'leveling-reset', `User ${userId} level reset to 0`);
    res.json({ success: true });
  });
  
  app.get('/api/leveling/prestige-history', requireAuth, (_req, res) => {
    res.json(prestigeHistory ? [...prestigeHistory].reverse().slice(0, 50) : []);
  });
  
  // NEW: Dashboard level-up channel setting
  app.post('/dashboard/levelupchannel', requireAuth, (req, res) => {
    const { levelUpChannelId, levelUpPingPlayer } = req.body || {};
    
    dashboardSettings.levelUpChannelId = levelUpChannelId || null;
    dashboardSettings.levelUpPingPlayer = levelUpPingPlayer !== undefined ? levelUpPingPlayer : true;
    saveState();
    addLog('info', `Level-up channel set to: ${levelUpChannelId || 'channel of origin'}, ping player: ${dashboardSettings.levelUpPingPlayer}`);
    dashAudit(req.userName || 'Dashboard', 'levelup-channel', `Level-up channel: ${levelUpChannelId || 'default'}, ping: ${dashboardSettings.levelUpPingPlayer}`);
    res.json({ success: true, levelUpChannelId: dashboardSettings.levelUpChannelId, levelUpPingPlayer: dashboardSettings.levelUpPingPlayer });
  });

  // Paginated leveling data API — returns sorted leveling entries + usernames for a given page
  app.get('/leveling/page', requireAuth, (req, res) => {
    const page = Math.max(1, parseInt(req.query.page) || 1);
    const size = Math.min(200, Math.max(10, parseInt(req.query.size) || 50));
    const view = req.query.view === 'week' ? 'week' : 'all';

    // Build name cache from membersCache
    const nameCache = {};
    Object.entries(membersCache?.members || {}).forEach(([id, m]) => {
      nameCache[id] = m.displayName || m.username || ('User-' + id.slice(-4));
    });

    // Sort all entries
    let sorted;
    if (view === 'week') {
      sorted = Object.entries(leveling)
        .map(([id, d]) => {
          const w = (weeklyLeveling && weeklyLeveling[id]) || {};
          return [id, { ...d, weeklyXp: Number(w.xp) || 0 }];
        })
        .sort((a, b) => b[1].weeklyXp - a[1].weeklyXp);
    } else {
      sorted = Object.entries(leveling)
        .sort((a, b) => (b[1].level - a[1].level) || (b[1].xp - a[1].xp));
    }

    const total = sorted.length;
    const startIdx = (page - 1) * size;
    const pageEntries = sorted.slice(startIdx, startIdx + size);

    const entries = {};
    const usernames = {};
    for (const [id, d] of pageEntries) {
      entries[id] = d;
      usernames[id] = nameCache[id] || id;
    }

    res.json({ entries, usernames, total, page, size, totalPages: Math.ceil(total / size) });
  });
}
