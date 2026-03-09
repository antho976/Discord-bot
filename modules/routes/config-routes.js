import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Config, settings, suggestions, welcome, audit, commands, upload
 */
export function registerConfigRoutes(app, deps) {
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
    membersCache, startTime, apiRateLimits, buildOfflineEmbed
  } = deps;

  app.post('/api/test-alert/:type', requireAuth, async (req, res) => {
    console.log('TEST ALERT ROUTE HIT', req.params.type);
  
    const { type } = req.params;
  
    if (type !== '1h' && type !== '10m') {
      return res.status(400).json({ error: 'Invalid test type' });
    }
  
    try {
      addLog('info', `Test alert triggered: ${type}`);
  
      await sendScheduleAlert(
        type === '1h' ? 'oneHour' : 'tenMin',
        true
      );
  
      res.json({ ok: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.post('/api/engagement-settings', requireAuth, (req, res) => {
    try {
      const {
        autoDeleteTitleChange,
        autoDeleteGameChange,
        autoDeleteVod,
        autoDeleteRaid,
        autoDeleteClip,
        autoDeleteFollowerMilestone,
        autoDeleteViewerMilestone,
        autoDeleteDelay,
        excludedChannels,
        excludedRoles,
        hideStreamWhenOffline
      } = req.body;
      
      if (autoDeleteTitleChange !== undefined) engagementSettings.autoDeleteTitleChange = autoDeleteTitleChange;
      if (autoDeleteGameChange !== undefined) engagementSettings.autoDeleteGameChange = autoDeleteGameChange;
      if (autoDeleteVod !== undefined) engagementSettings.autoDeleteVod = autoDeleteVod;
      if (autoDeleteRaid !== undefined) engagementSettings.autoDeleteRaid = autoDeleteRaid;
      if (autoDeleteClip !== undefined) engagementSettings.autoDeleteClip = autoDeleteClip;
      if (autoDeleteFollowerMilestone !== undefined) engagementSettings.autoDeleteFollowerMilestone = autoDeleteFollowerMilestone;
      if (autoDeleteViewerMilestone !== undefined) engagementSettings.autoDeleteViewerMilestone = autoDeleteViewerMilestone;
      if (hideStreamWhenOffline !== undefined) dashboardSettings.hideStreamWhenOffline = !!hideStreamWhenOffline;
      if (autoDeleteDelay !== undefined) {
        const delay = parseInt(autoDeleteDelay);
        if (isNaN(delay) || delay < 5000 || delay > 3600000) {
          return res.status(400).json({ success: false, error: 'Invalid delay (must be 5000-3600000ms)' });
        }
        engagementSettings.autoDeleteDelay = delay;
      }
      
      saveState();
      addLog('info', 'Auto-delete settings updated');
      dashAudit(req.userName || 'Dashboard', 'engagement-settings', 'Updated auto-delete settings');
      res.json({ success: true });
    } catch (err) {
      addLog('error', 'Failed to save engagement settings: ' + err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // ========== RPG Events API ==========
  app.post('/api/rpg-events/toggle', requireAuth, (req, res) => {
    try {
      const { index, enabled } = req.body;
      if (index < 0 || index >= rpgEvents.milestoneEvents.length) return res.json({ success: false, error: 'Invalid index' });
      rpgEvents.milestoneEvents[index].enabled = !!enabled;
      debouncedSaveState();
      addLog('info', `RPG Event "${rpgEvents.milestoneEvents[index].name}" ${enabled ? 'enabled' : 'disabled'}`);
      dashAudit(req.userName || 'Dashboard', 'rpg-event-toggle', `RPG Event "${rpgEvents.milestoneEvents[index].name}" ${enabled ? 'enabled' : 'disabled'}`);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: 'Operation failed' }); }
  });
  
  app.post('/api/rpg-events/add', requireAuth, (req, res) => {
    try {
      const { name, threshold, type, duration, description, emoji } = req.body;
      if (!name || !threshold || !duration) return res.json({ success: false, error: 'Missing required fields' });
      const typeEmojis = { xp_boost: '⚡', gold_rain: '💰', loot_boost: '🎁', secret_dungeon: '🏰', boss_spawn: '🐉' };
      const newEvent = {
        id: 'custom_' + Date.now(),
        viewerThreshold: parseInt(threshold),
        type: type || 'xp_boost',
        duration: parseInt(duration),
        name: name,
        description: description || '',
        emoji: emoji || typeEmojis[type] || '🎮',
        enabled: true,
        multiplier: type === 'xp_boost' ? 2 : type === 'loot_boost' ? 3 : 1,
        goldAmount: type === 'gold_rain' ? 5000 : 0,
        bossName: type === 'boss_spawn' ? name : '',
        dungeonId: type === 'secret_dungeon' ? 'custom_dungeon_' + Date.now() : ''
      };
      rpgEvents.milestoneEvents.push(newEvent);
      rpgEvents.milestoneEvents.sort((a, b) => a.viewerThreshold - b.viewerThreshold);
      debouncedSaveState();
      addLog('info', `New RPG Event added: ${newEvent.emoji} ${newEvent.name} (${newEvent.viewerThreshold} viewers)`);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: 'Operation failed' }); }
  });
  
  app.post('/api/rpg-events/trigger', requireAuth, (req, res) => {
    try {
      const { eventId } = req.body;
      const milestone = rpgEvents.milestoneEvents.find(m => m.id === eventId);
      if (!milestone) return res.json({ success: false, error: 'Event not found' });
      const currentViewers = stats.currentViewers || 0;
      triggerRPGEvent(milestone, currentViewers);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: 'Operation failed' }); }
  });
  
  app.post('/api/rpg-events/delete', requireAuth, (req, res) => {
    try {
      const { eventId } = req.body;
      rpgEvents.milestoneEvents = rpgEvents.milestoneEvents.filter(m => m.id !== eventId);
      debouncedSaveState();
      addLog('info', `RPG Event deleted: ${eventId}`);
      res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: 'Operation failed' }); }
  });
  // ========== END RPG Events API ==========
  
  // Stream Goals API
  app.post('/api/stream-goals', requireAuth, (req, res) => {
    try {
      const { monthlyStreams, monthlyHours, monthlyFollowers, monthlyPeakViewers } = req.body;
      streamGoals.monthlyStreams = parseInt(monthlyStreams) || 0;
      streamGoals.monthlyHours = parseInt(monthlyHours) || 0;
      streamGoals.monthlyFollowers = parseInt(monthlyFollowers) || 0;
      streamGoals.monthlyPeakViewers = parseInt(monthlyPeakViewers) || 0;
      debouncedSaveState();
      invalidateAnalyticsCache();
      addLog('info', 'Stream goals updated');
      dashAudit(req.userName || 'Dashboard', 'stream-goals', 'Updated stream goals');
      res.json({ success: true });
    } catch(e) { res.status(500).json({ success: false, error: 'Operation failed' }); }
  });
  
  app.post('/api/welcome-settings', requireAuth, (req, res) => {
    try {
      const {
        enabled, channelId, message, useEmbed, embedTitle, embedDescription,
        embedColor, embedThumbnail, embedThumbnailUrl, embedImage, embedFooter,
        embedFields, messageMode, messages, dmEnabled, dmMessage, dmUseEmbed,
        antiSpamEnabled, antiSpamRoles,
        goodbyeEnabled, goodbyeChannelId, goodbyeMessage, goodbyeUseEmbed,
        goodbyeEmbedTitle, goodbyeEmbedDescription, goodbyeEmbedColor,
        goodbyeEmbedThumbnail, goodbyeEmbedThumbnailUrl, goodbyeEmbedImage,
        goodbyeEmbedFooter, goodbyeMessageMode, goodbyeMessages
      } = req.body;
      
      // Welcome settings
      if (enabled !== undefined) welcomeSettings.enabled = enabled;
      if (channelId !== undefined) welcomeSettings.channelId = channelId;
      if (message !== undefined) welcomeSettings.message = message;
      if (useEmbed !== undefined) welcomeSettings.useEmbed = useEmbed;
      if (embedTitle !== undefined) welcomeSettings.embedTitle = embedTitle;
      if (embedDescription !== undefined) welcomeSettings.embedDescription = embedDescription;
      if (embedColor !== undefined) welcomeSettings.embedColor = embedColor;
      if (embedThumbnail !== undefined) welcomeSettings.embedThumbnail = embedThumbnail;
      if (embedThumbnailUrl !== undefined) welcomeSettings.embedThumbnailUrl = embedThumbnailUrl;
      if (embedImage !== undefined) welcomeSettings.embedImage = embedImage;
      if (embedFooter !== undefined) welcomeSettings.embedFooter = embedFooter;
      if (embedFields !== undefined) welcomeSettings.embedFields = embedFields;
      if (messageMode !== undefined) welcomeSettings.messageMode = messageMode;
      if (messages !== undefined) welcomeSettings.messages = messages;
      if (dmEnabled !== undefined) welcomeSettings.dmEnabled = dmEnabled;
      if (dmMessage !== undefined) welcomeSettings.dmMessage = dmMessage;
      if (dmUseEmbed !== undefined) welcomeSettings.dmUseEmbed = dmUseEmbed;
      if (antiSpamEnabled !== undefined) welcomeSettings.antiSpamEnabled = antiSpamEnabled;
      if (antiSpamRoles !== undefined) welcomeSettings.antiSpamRoles = antiSpamRoles;
      
      // Goodbye settings
      if (goodbyeEnabled !== undefined) welcomeSettings.goodbyeEnabled = goodbyeEnabled;
      if (goodbyeChannelId !== undefined) welcomeSettings.goodbyeChannelId = goodbyeChannelId;
      if (goodbyeMessage !== undefined) welcomeSettings.goodbyeMessage = goodbyeMessage;
      if (goodbyeUseEmbed !== undefined) welcomeSettings.goodbyeUseEmbed = goodbyeUseEmbed;
      if (goodbyeEmbedTitle !== undefined) welcomeSettings.goodbyeEmbedTitle = goodbyeEmbedTitle;
      if (goodbyeEmbedDescription !== undefined) welcomeSettings.goodbyeEmbedDescription = goodbyeEmbedDescription;
      if (goodbyeEmbedColor !== undefined) welcomeSettings.goodbyeEmbedColor = goodbyeEmbedColor;
      if (goodbyeEmbedThumbnail !== undefined) welcomeSettings.goodbyeEmbedThumbnail = goodbyeEmbedThumbnail;
      if (goodbyeEmbedThumbnailUrl !== undefined) welcomeSettings.goodbyeEmbedThumbnailUrl = goodbyeEmbedThumbnailUrl;
      if (goodbyeEmbedImage !== undefined) welcomeSettings.goodbyeEmbedImage = goodbyeEmbedImage;
      if (goodbyeEmbedFooter !== undefined) welcomeSettings.goodbyeEmbedFooter = goodbyeEmbedFooter;
      if (goodbyeMessageMode !== undefined) welcomeSettings.goodbyeMessageMode = goodbyeMessageMode;
      if (goodbyeMessages !== undefined) welcomeSettings.goodbyeMessages = goodbyeMessages;
      
      saveState();
      addLog('info', 'Welcome settings updated');
      dashAudit(req.userName || 'Dashboard', 'welcome-settings', 'Updated welcome/goodbye settings');
      res.json({ success: true });
    } catch (err) {
      addLog('error', 'Failed to save welcome settings: ' + err.message);
      res.status(500).json({ success: false, error: 'Failed to save welcome settings' });
    }
  });
  
  app.post('/api/welcome-settings/add-role', requireAuth, (req, res) => {
    try {
      const { roleId, condition, minAccountAge } = req.body;
      
      if (!roleId) {
        return res.status(400).json({ success: false, error: 'Role ID required' });
      }
      
      // Initialize arrays if needed
      if (!welcomeSettings.autoRoleConditions) welcomeSettings.autoRoleConditions = [];
      if (!welcomeSettings.autoRoles) welcomeSettings.autoRoles = [];
      
      // Check if role already exists
      const existing = welcomeSettings.autoRoleConditions.find(r => r.roleId === roleId);
      if (existing) {
        return res.status(400).json({ success: false, error: 'Role already added' });
      }
      
      // Add to conditions array
      welcomeSettings.autoRoleConditions.push({
        roleId,
        condition: condition || 'always',
        minAccountAge: minAccountAge || 7
      });
      
      // Also add to legacy autoRoles array for backwards compat
      if (!welcomeSettings.autoRoles.includes(roleId)) {
        welcomeSettings.autoRoles.push(roleId);
      }
      
      saveState();
      addLog('info', `Added auto-role: ${roleId} (${condition || 'always'})`);
      res.json({ success: true });
    } catch (err) {
      addLog('error', 'Failed to add auto-role: ' + err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/welcome-settings/remove-role', requireAuth, (req, res) => {
    try {
      const { roleId } = req.body;
      
      if (!roleId) {
        return res.status(400).json({ success: false, error: 'Role ID required' });
      }
      
      // Remove from conditions array
      if (welcomeSettings.autoRoleConditions) {
        welcomeSettings.autoRoleConditions = welcomeSettings.autoRoleConditions.filter(r => r.roleId !== roleId);
      }
      
      // Remove from legacy array
      const index = welcomeSettings.autoRoles.indexOf(roleId);
      if (index > -1) {
        welcomeSettings.autoRoles.splice(index, 1);
      }
      
      saveState();
      addLog('info', `Removed auto-role: ${roleId}`);
      res.json({ success: true });
    } catch (err) {
      addLog('error', 'Failed to remove auto-role: ' + err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/welcome-settings/bulk-add-roles', requireAuth, (req, res) => {
    try {
      const { roleIds } = req.body;
      
      if (!roleIds || !Array.isArray(roleIds) || roleIds.length === 0) {
        return res.status(400).json({ success: false, error: 'Role IDs array required' });
      }
      
      if (!welcomeSettings.autoRoleConditions) welcomeSettings.autoRoleConditions = [];
      if (!welcomeSettings.autoRoles) welcomeSettings.autoRoles = [];
      
      let added = 0;
      for (const roleId of roleIds) {
        if (!welcomeSettings.autoRoleConditions.find(r => r.roleId === roleId)) {
          welcomeSettings.autoRoleConditions.push({ roleId, condition: 'always', minAccountAge: 7 });
          if (!welcomeSettings.autoRoles.includes(roleId)) {
            welcomeSettings.autoRoles.push(roleId);
          }
          added++;
        }
      }
      
      saveState();
      addLog('info', `Bulk added ${added} auto-roles`);
      res.json({ success: true, added });
    } catch (err) {
      addLog('error', 'Failed to bulk add auto-roles: ' + err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/welcome-settings/test-roles', requireAuth, async (req, res) => {
    try {
      const results = [];
      const guild = client.guilds.cache.first();
      
      if (!guild) {
        return res.json({ success: false, error: 'No guild found' });
      }
      
      const botMember = await guild.members.fetchMe().catch(() => null);
      if (!botMember) {
        return res.json({ success: false, error: 'Could not fetch bot member' });
      }
      
      const roles = welcomeSettings.autoRoleConditions || welcomeSettings.autoRoles?.map(id => ({ roleId: id })) || [];
      
      for (const roleConfig of roles) {
        const roleId = roleConfig.roleId || roleConfig;
        try {
          const role = await guild.roles.fetch(roleId);
          if (!role) {
            results.push(`❌ ${roleId}: Role not found`);
          } else if (role.position >= botMember.roles.highest.position) {
            results.push(`⚠️ ${role.name}: Role is higher than bot's highest role`);
          } else {
            results.push(`✅ ${role.name}: Can be assigned`);
          }
        } catch (e) {
          results.push(`❌ ${roleId}: ${e.message}`);
        }
      }
      
      res.json({ success: true, results });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/api/audit-log-settings', requireAuth, (req, res) => {
    try {
      const {
        enabled,
        channelId,
        logLevel,
        logMessageEdits,
        logMessageDeletes,
        logMessageBulkDeletes,
        logMessagePins,
        logUsernameChanges,
        logAvatarChanges,
        logNicknameChanges,
        logRoleChanges,
        logMemberJoins,
        logMemberLeaves,
        logMemberBans,
        logMemberUnbans,
        logMemberTimeouts,
        logMemberMutes,
        logMemberBoosts,
        logJoinPosition,
        logServerUpdates,
        logIntegrations,
        warnNewAccounts,
        newAccountThresholdDays,
        excludedChannels,
        excludedRoles,
        excludedUsers,
        muteRoleIds,
        perEventChannels,
        perEventExclusions,
        perEventPings,
        // New settings
        logRetentionDays,
        autoCleanupEnabled,
        eventColors,
        alertKeywords,
        alertUserId,
        alertEnabled,
        dmNotificationsEnabled,
        dmNotifyUserId,
        dmNotifyEvents,
        webhookUrl,
        webhookEnabled,
        autoDetectMuteRole
      } = req.body;
  
      if (enabled !== undefined) auditLogSettings.enabled = enabled;
      if (channelId !== undefined) auditLogSettings.channelId = channelId;
      if (logLevel !== undefined && ['all', 'important', 'minimal'].includes(logLevel)) auditLogSettings.logLevel = logLevel;
      if (logMessageEdits !== undefined) auditLogSettings.logMessageEdits = logMessageEdits;
      if (logMessageDeletes !== undefined) auditLogSettings.logMessageDeletes = logMessageDeletes;
      if (logMessageBulkDeletes !== undefined) auditLogSettings.logMessageBulkDeletes = logMessageBulkDeletes;
      if (logMessagePins !== undefined) auditLogSettings.logMessagePins = logMessagePins;
      if (logUsernameChanges !== undefined) auditLogSettings.logUsernameChanges = logUsernameChanges;
      if (logAvatarChanges !== undefined) auditLogSettings.logAvatarChanges = logAvatarChanges;
      if (logNicknameChanges !== undefined) auditLogSettings.logNicknameChanges = logNicknameChanges;
      if (logRoleChanges !== undefined) auditLogSettings.logRoleChanges = logRoleChanges;
      if (logMemberJoins !== undefined) auditLogSettings.logMemberJoins = logMemberJoins;
      if (logMemberLeaves !== undefined) auditLogSettings.logMemberLeaves = logMemberLeaves;
      if (logMemberBans !== undefined) auditLogSettings.logMemberBans = logMemberBans;
      if (logMemberUnbans !== undefined) auditLogSettings.logMemberUnbans = logMemberUnbans;
      if (logMemberTimeouts !== undefined) auditLogSettings.logMemberTimeouts = logMemberTimeouts;
      if (logMemberMutes !== undefined) auditLogSettings.logMemberMutes = logMemberMutes;
      if (logMemberBoosts !== undefined) auditLogSettings.logMemberBoosts = logMemberBoosts;
      if (logJoinPosition !== undefined) auditLogSettings.logJoinPosition = logJoinPosition;
      if (logServerUpdates !== undefined) auditLogSettings.logServerUpdates = logServerUpdates;
      if (logIntegrations !== undefined) auditLogSettings.logIntegrations = logIntegrations;
      if (warnNewAccounts !== undefined) auditLogSettings.warnNewAccounts = warnNewAccounts;
      if (newAccountThresholdDays !== undefined) {
        const days = parseInt(newAccountThresholdDays, 10);
        if (!isNaN(days) && days >= 1 && days <= 365) {
          auditLogSettings.newAccountThresholdDays = days;
        }
      }
  
      // New settings handling
      if (logRetentionDays !== undefined) {
        const days = parseInt(logRetentionDays, 10);
        if (!isNaN(days) && days >= 1 && days <= 365) {
          auditLogSettings.logRetentionDays = days;
        }
      }
      if (autoCleanupEnabled !== undefined) auditLogSettings.autoCleanupEnabled = autoCleanupEnabled;
      if (eventColors !== undefined && typeof eventColors === 'object') auditLogSettings.eventColors = { ...auditLogSettings.eventColors, ...eventColors };
      if (alertKeywords !== undefined) {
        if (Array.isArray(alertKeywords)) auditLogSettings.alertKeywords = alertKeywords;
        else if (typeof alertKeywords === 'string') auditLogSettings.alertKeywords = alertKeywords.split(',').map(s => s.trim()).filter(Boolean);
      }
      if (alertUserId !== undefined) auditLogSettings.alertUserId = alertUserId || null;
      if (alertEnabled !== undefined) auditLogSettings.alertEnabled = alertEnabled;
      if (dmNotificationsEnabled !== undefined) auditLogSettings.dmNotificationsEnabled = dmNotificationsEnabled;
      if (dmNotifyUserId !== undefined) auditLogSettings.dmNotifyUserId = dmNotifyUserId || null;
      if (dmNotifyEvents !== undefined && typeof dmNotifyEvents === 'object') auditLogSettings.dmNotifyEvents = { ...auditLogSettings.dmNotifyEvents, ...dmNotifyEvents };
      if (webhookUrl !== undefined) auditLogSettings.webhookUrl = webhookUrl || null;
      if (webhookEnabled !== undefined) auditLogSettings.webhookEnabled = webhookEnabled;
      if (autoDetectMuteRole !== undefined) auditLogSettings.autoDetectMuteRole = autoDetectMuteRole;
  
      if (excludedChannels !== undefined) {
        if (Array.isArray(excludedChannels)) auditLogSettings.excludedChannels = excludedChannels;
        else if (typeof excludedChannels === 'string') auditLogSettings.excludedChannels = excludedChannels.split(',').map(s=>s.trim()).filter(Boolean);
      }
  
      if (excludedRoles !== undefined) {
        if (Array.isArray(excludedRoles)) auditLogSettings.excludedRoles = excludedRoles;
        else if (typeof excludedRoles === 'string') auditLogSettings.excludedRoles = excludedRoles.split(',').map(s=>s.trim()).filter(Boolean);
      }
  
      if (excludedUsers !== undefined) {
        if (Array.isArray(excludedUsers)) auditLogSettings.excludedUsers = excludedUsers;
        else if (typeof excludedUsers === 'string') auditLogSettings.excludedUsers = excludedUsers.split(',').map(s=>s.trim()).filter(Boolean);
      }
  
      if (muteRoleIds !== undefined) {
        if (Array.isArray(muteRoleIds)) auditLogSettings.muteRoleIds = muteRoleIds;
        else if (typeof muteRoleIds === 'string') auditLogSettings.muteRoleIds = muteRoleIds.split(',').map(s=>s.trim()).filter(Boolean);
      }
  
      if (perEventChannels !== undefined && typeof perEventChannels === 'object') auditLogSettings.perEventChannels = perEventChannels;
      if (perEventExclusions !== undefined && typeof perEventExclusions === 'object') auditLogSettings.perEventExclusions = perEventExclusions;
      if (perEventPings !== undefined && typeof perEventPings === 'object') auditLogSettings.perEventPings = perEventPings;
  
      dashboardSettings.auditLogSettings = { ...auditLogSettings };
  
      saveState();
      addLog('info', 'Member log settings updated');
      dashAudit(req.userName || 'Dashboard', 'audit-log-settings', 'Updated member log settings');
      res.json({ success: true });
    } catch (err) {
      addLog('error', 'Failed to save member log settings: ' + err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.get('/api/rpg/settings/access', requireAuth, (req, res) => {
    const settings = getRpgSettings();
    res.json({ success: true, settings });
  });
  
  app.post('/api/rpg/settings/access', requireAuth, (req, res) => {
    try {
      const { channelRestrictionEnabled, allowedChannelIds } = req.body;
      const cleaned = Array.isArray(allowedChannelIds)
        ? allowedChannelIds.map(id => String(id || '').trim()).filter(Boolean)
        : [];
      dashboardSettings.rpgSettings = {
        ...defaultDashboardSettings.rpgSettings,
        channelRestrictionEnabled: !!channelRestrictionEnabled,
        allowedChannelIds: cleaned
      };
      saveState();
      addLog('info', `RPG channel restriction updated: enabled=${!!channelRestrictionEnabled}, channels=${cleaned.length}`);
      res.json({ success: true, settings: dashboardSettings.rpgSettings });
    } catch (err) {
      addLog('error', 'Failed to save RPG access settings: ' + err.message);
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Audit log history search API
  app.get('/api/audit-log-history', requireAuth, (req, res) => {
    try {
      const { userId, eventType, keyword, startDate, endDate, page = 1, limit = 50 } = req.query;
      
      let filtered = [...auditLogHistory];
      
      if (userId) {
        filtered = filtered.filter(e => e.userId === userId || e.userTag?.toLowerCase().includes(userId.toLowerCase()));
      }
      if (eventType) {
        filtered = filtered.filter(e => e.action === eventType);
      }
      if (keyword) {
        const kw = keyword.toLowerCase();
        filtered = filtered.filter(e => 
          JSON.stringify(e).toLowerCase().includes(kw)
        );
      }
      if (startDate) {
        const start = new Date(startDate);
        filtered = filtered.filter(e => new Date(e.timestamp) >= start);
      }
      if (endDate) {
        const end = new Date(endDate);
        end.setHours(23, 59, 59, 999);
        filtered = filtered.filter(e => new Date(e.timestamp) <= end);
      }
      
      const total = filtered.length;
      const pageNum = parseInt(page, 10) || 1;
      const limitNum = Math.min(parseInt(limit, 10) || 50, 100);
      const offset = (pageNum - 1) * limitNum;
      const paginated = filtered.slice(offset, offset + limitNum);
      
      res.json({
        success: true,
        data: paginated,
        pagination: {
          page: pageNum,
          limit: limitNum,
          total,
          totalPages: Math.ceil(total / limitNum)
        }
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Audit log stats API
  app.get('/api/audit-log-stats', requireAuth, (req, res) => {
    try {
      const now = new Date();
      const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
      const weekLogs = auditLogHistory.filter(e => new Date(e.timestamp) >= weekAgo);
      
      const stats = {
        totalLogs: auditLogHistory.length,
        logsThisWeek: weekLogs.length,
        bansThisWeek: weekLogs.filter(e => e.action === 'member_ban').length,
        timeoutsThisWeek: weekLogs.filter(e => e.action === 'member_timeout').length,
        joinsThisWeek: weekLogs.filter(e => e.action === 'member_join').length,
        leavesThisWeek: weekLogs.filter(e => e.action === 'member_leave').length,
        newAccountWarnings: weekLogs.filter(e => e.action === 'member_join' && e.type === 'warn').length,
        messageDeletes: weekLogs.filter(e => e.action === 'message_delete').length
      };
      
      res.json({ success: true, stats });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Export audit logs
  app.get('/api/audit-log-export', requireAuth, (req, res) => {
    try {
      const { format = 'json' } = req.query;
      
      if (format === 'json') {
        res.setHeader('Content-Type', 'application/json');
        res.setHeader('Content-Disposition', `attachment; filename=audit-logs-${new Date().toISOString().split('T')[0]}.json`);
        res.send(JSON.stringify(auditLogHistory, null, 2));
      } else {
        res.status(400).json({ success: false, error: 'Invalid format' });
      }
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Manual cleanup endpoint
  app.post('/api/audit-log-cleanup', requireAuth, (req, res) => {
    try {
      const { days } = req.body;
      const retentionDays = parseInt(days, 10) || auditLogSettings.logRetentionDays || 30;
      
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
      
      const oldLength = auditLogHistory.length;
      auditLogHistory = auditLogHistory.filter(entry => 
        new Date(entry.timestamp) > cutoffDate
      );
      
      saveAuditLogHistory();
      
      const removed = oldLength - auditLogHistory.length;
      addLog('info', `Manual audit log cleanup: removed ${removed} entries older than ${retentionDays} days`);
      
      res.json({ success: true, removed, remaining: auditLogHistory.length });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // Auto-detect mute role endpoint
  app.get('/api/detect-mute-role', requireAuth, async (req, res) => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) return res.json({ success: false, error: 'No guild found' });
      
      const roles = await guild.roles.fetch();
      const muteRoles = roles.filter(r => 
        r.name.toLowerCase().includes('mute') || 
        r.name.toLowerCase().includes('muted') ||
        r.name.toLowerCase().includes('timeout')
      );
      
      res.json({ 
        success: true, 
        roles: muteRoles.map(r => ({ id: r.id, name: r.name }))
      });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  
  app.post('/options/save', requireAuth, (req,res)=>{ 
    const { ROLE_ID, notificationRoles, CUSTOM_CHANNEL_ID, notificationEnabled, notificationPing, notificationChannels } = req.body; 
    if (ROLE_ID !== undefined) config.ROLE_ID = ROLE_ID;
    if (notificationRoles) config.notificationRoles = { ...config.notificationRoles, ...notificationRoles };
    if (CUSTOM_CHANNEL_ID !== undefined) config.CUSTOM_CHANNEL_ID = CUSTOM_CHANNEL_ID;
    if (notificationEnabled) config.notificationEnabled = { ...config.notificationEnabled, ...notificationEnabled };
    if (notificationPing) config.notificationPing = { ...config.notificationPing, ...notificationPing };
    if (notificationChannels) config.notificationChannels = { ...config.notificationChannels, ...notificationChannels };
    saveConfig(); 
    addLog('info',`Configuration updated`); 
    dashAudit(req.userName || 'Dashboard', 'config-save', 'Updated notification/channel configuration');
    res.sendStatus(200); 
  });
  
  app.post('/commands/cooldown', requireAuth, (req, res) => {
    const { command, cooldownSeconds } = req.body || {};
    if (!command) return res.status(400).json({ success: false, error: 'Missing command' });
    const sec = parseInt(cooldownSeconds, 10);
    const ms = !isNaN(sec) && sec > 0 ? sec * 1000 : 0;
    config.commandCooldowns[command] = ms;
    saveConfig();
    addLog('info', `Command cooldown updated: ${command} = ${ms}ms`);
    dashAudit(req.userName || 'Dashboard', 'command-cooldown', `Set !${command} cooldown to ${sec}s`);
    res.json({ success: true });
  });
  
  app.post('/commands/pin', requireAuth, (req, res) => {
    const { command, pinned } = req.body || {};
    if (!command) return res.status(400).json({ success: false, error: 'Missing command' });
    config.commandPinned[command] = !!pinned;
    saveConfig();
    addLog('info', `Command ${command} pinned=${!!pinned}`);
    dashAudit(req.userName || 'Dashboard', 'command-pin', `Command !${command} pinned=${!!pinned}`);
    res.json({ success: true });
  });
  
  app.post('/commands/disable', requireAuth, (req, res) => {
    const { command, disabled } = req.body || {};
    if (!command) return res.status(400).json({ success: false, error: 'Missing command' });
    config.commandDisabled[command] = !!disabled;
    saveConfig();
    addLog('info', `Command ${command} disabled=${!!disabled}`);
    dashAudit(req.userName || 'Dashboard', 'command-disable', `Command !${command} disabled=${!!disabled}`);
    res.json({ success: true });
  });
  
  app.get('/role/info/:roleId', requireAuth, async (req, res) => {
    const { roleId } = req.params;
    if (!roleId || roleId === '') {
      return res.json({ name: null });
    }
    try {
      const discordGuild = client.guilds.cache.first();
      if (!discordGuild) {
        return res.json({ name: null });
      }
      const role = await discordGuild.roles.fetch(roleId);
      if (role) {
        res.json({ name: role.name, color: role.color, hexColor: role.hexColor });
      } else {
        res.json({ name: null });
      }
    } catch (err) {
      res.json({ name: null, error: err.message });
    }
  });
  
  // Guild roles list for bulk role picker
  app.get('/api/guild-roles', requireAuth, async (req, res) => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) return res.json({ roles: [] });
      const roles = Array.from(guild.roles.cache.values()).map(r => ({
        id: r.id,
        name: r.name,
        hexColor: r.hexColor,
        position: r.position,
        managed: r.managed
      }));
      res.json({ roles });
    } catch (err) {
      res.json({ roles: [], error: err.message });
    }
  });
  
  app.get('/api/channels', requireAuth, async (req, res) => {
    try {
      const guild = client.guilds.cache.first();
      if (!guild) return res.json([]);
      const channels = Array.from(guild.channels.cache.values())
        .filter(c => c.isTextBased())
        .map(c => ({ id: c.id, name: c.name, type: c.type }))
        .sort((a, b) => a.name.localeCompare(b.name));
      res.json(channels);
    } catch (err) {
      addLog('error', 'Failed to fetch channels: ' + err.message);
      res.json([]);
    }
  });
  
  app.get('/channel/info/:channelId', requireAuth, async (req, res) => {
    const { channelId } = req.params;
    if (!channelId || channelId === '') {
      return res.json({ name: null });
    }
    try {
      const channel = await client.channels.fetch(channelId);
      if (channel) {
        res.json({ name: channel.name, id: channel.id, type: channel.type });
      } else {
        res.json({ name: null });
      }
    } catch (err) {
      res.json({ name: null, error: err.message });
    }
  });
  
  app.post('/settings/update', requireAuth, (req, res) => {
    const { key, value } = req.body;
    if (key in engagementSettings) {
      engagementSettings[key] = value;
      saveState();
      addLog('info', `Setting ${key} updated to ${value}`);
      dashAudit(req.userName || 'Dashboard', 'setting-update', `${key} = ${value}`);
      res.sendStatus(200);
    } else {
      res.status(400).json({ error: 'Invalid setting' });
    }
  });
  
  // NEW: Suggestions endpoints
  app.post('/suggestions/delete', requireAuth, (req, res) => {
    const { id } = req.body;
    if (id >= 0 && id < suggestions.length) {
      const deleted = suggestions[id];
      suggestions.splice(id, 1);
      saveState();
      addLog('info', `Suggestion deleted: "${deleted.suggestion}" from ${deleted.user}`);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid suggestion ID' });
    }
  });
  
  app.post('/suggestions/upvote', requireAuth, (req, res) => {
    const { id } = req.body;
    if (id >= 0 && id < suggestions.length) {
      suggestions[id].upvotes = (suggestions[id].upvotes || 0) + 1;
      saveState();
      addLog('info', `Suggestion upvoted: "${suggestions[id].suggestion}"`);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid suggestion ID' });
    }
  });
  
  app.post('/suggestions/priority', requireAuth, (req, res) => {
    const { id, priority } = req.body;
    if (id >= 0 && id < suggestions.length) {
      const validPriorities = ['Low', 'Medium', 'High', 'Critical'];
      if (validPriorities.includes(priority)) {
        suggestions[id].priority = priority;
        saveState();
        addLog('info', `Suggestion priority set: "${suggestions[id].suggestion}" → ${priority}`);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Invalid priority' });
      }
    } else {
      res.status(400).json({ error: 'Invalid suggestion ID' });
    }
  });
  
  app.post('/suggestions/contact', requireAuth, async (req, res) => {
    const { id, message, method } = req.body;
    if (id < 0 || id >= suggestions.length) {
      return res.status(400).json({ error: 'Invalid suggestion ID' });
    }
    const suggestion = suggestions[id];
    const userId = suggestion.userId || suggestion.authorId;
    if (!userId) {
      return res.status(400).json({ error: 'No user ID associated with this suggestion' });
    }
    
    try {
      const guild = client.guilds.cache.first();
      if (!guild) return res.status(500).json({ error: 'Guild not found' });
      
      const member = await guild.members.fetch(userId).catch(() => null);
      if (!member) return res.status(404).json({ error: 'User not found in server' });
      
      const contactMsg = `📬 **Regarding your suggestion:** "${suggestion.suggestion.substring(0, 100)}${suggestion.suggestion.length > 100 ? '...' : ''}"\n\n${message}`;
      
      if (method === 'dm') {
        await member.send(contactMsg).catch(() => {
          throw new Error('Could not DM user (DMs may be disabled)');
        });
      } else if (method === 'ping') {
        // Find the suggestions channel or use a default
        const channelId = dashboardSettings.suggestionsChannelId;
        let channel = null;
        if (channelId) {
          channel = await client.channels.fetch(channelId).catch(() => null);
        }
        if (!channel) {
          // Try to find a suggestions channel by name
          channel = guild.channels.cache.find(c => c.name.includes('suggest'));
        }
        if (!channel) {
          return res.status(400).json({ error: 'No suggestions channel configured. Set a channel first.' });
        }
        await channel.send(`<@${userId}> ${contactMsg}`);
      }
      
      // Track the contact in the suggestion
      if (!suggestion.contacts) suggestion.contacts = [];
      suggestion.contacts.push({
        method,
        message,
        timestamp: Date.now()
      });
      saveState();
      addLog('info', `Contacted suggestion maker: ${suggestion.user} via ${method}`);
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ error: err.message });
    }
  });
  
  app.post('/suggestions/status', requireAuth, (req, res) => {
    const { id, status } = req.body;
    if (id >= 0 && id < suggestions.length) {
      const validStatuses = ['Pending', 'In Progress', 'Completed', 'Rejected'];
      if (validStatuses.includes(status)) {
        suggestions[id].status = status;
        saveState();
        addLog('info', `Suggestion status updated: "${suggestions[id].suggestion}" → ${status}`);
        dashAudit(req.userName || 'Dashboard', 'suggestion-status', `Suggestion "${suggestions[id].suggestion.substring(0, 50)}" → ${status}`);
        res.json({ success: true });
      } else {
        res.status(400).json({ error: 'Invalid status' });
      }
    } else {
      res.status(400).json({ error: 'Invalid suggestion ID' });
    }
  });
  
  app.post('/suggestions/notes', requireAuth, (req, res) => {
    const { id, notes } = req.body;
    if (id >= 0 && id < suggestions.length) {
      suggestions[id].notes = notes;
      saveState();
      addLog('info', `Admin notes added to suggestion: "${suggestions[id].suggestion}"`);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid suggestion ID' });
    }
  });
  
  app.post('/suggestions/cooldown', requireAuth, (req, res) => {
    const { minutes } = req.body;
    const cooldownMinutes = parseInt(minutes);
    
    if (isNaN(cooldownMinutes) || cooldownMinutes < 0) {
      return res.json({ success: false, error: 'Invalid cooldown value' });
    }
    
    dashboardSettings.suggestionCooldownMinutes = cooldownMinutes;
    saveState();
    addLog('info', `Suggestion cooldown updated to ${cooldownMinutes} minutes`);
    res.json({ success: true });
  });
  
  // NEW: Leveling edit endpoint
  app.get('/channelname', requireAuth, async (req, res) => {
    const channelId = req.query.id;
    if (!channelId) return res.json({ name: null });
    try {
      const channel = await client.channels.fetch(channelId);
      res.json({ name: channel.name || null });
    } catch (err) {
      res.json({ name: null, error: err.message });
    }
  });
}
