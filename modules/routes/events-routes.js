import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { checkUploadRateLimit, validateImageMagicBytes } from '../security.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

function decodeXmlEntities(text = '') {
  return String(text)
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parseYouTubeEntry(entry, channelName = 'YouTube') {
  const videoId = entry.match(/<yt:videoId>([^<]+)<\/yt:videoId>/i)?.[1] || null;
  if (!videoId) return null;
  const title = decodeXmlEntities(entry.match(/<title>([\s\S]*?)<\/title>/i)?.[1] || 'New video');
  const publishedAt = entry.match(/<published>([^<]+)<\/published>/i)?.[1] || null;
  const updatedAt = entry.match(/<updated>([^<]+)<\/updated>/i)?.[1] || null;
  const linkHref = entry.match(/<link[^>]+href="([^"]+)"/i)?.[1] || `https://www.youtube.com/watch?v=${videoId}`;
  const thumbnail = entry.match(/<media:thumbnail\s+url="([^"]+)"/i)?.[1] || `https://i.ytimg.com/vi/${videoId}/maxresdefault.jpg`;
  const description = decodeXmlEntities(entry.match(/<media:description>([\s\S]*?)<\/media:description>/i)?.[1] || '');
  const views = entry.match(/<media:statistics\s+views="(\d+)"/i)?.[1] || null;
  const starRating = entry.match(/<media:starRating\s+[^>]*average="([^"]+)"/i)?.[1] || null;
  return { videoId, title, url: linkHref, publishedAt, updatedAt, channelName, thumbnail, description, views: views ? parseInt(views, 10) : null, starRating: starRating ? parseFloat(starRating) : null };
}

async function fetchLatestYouTubeVideo(youtubeChannelId) {
  const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${encodeURIComponent(youtubeChannelId)}`;
  const res = await fetch(feedUrl, { signal: AbortSignal.timeout(15000) });
  if (!res.ok) throw new Error(`YouTube feed request failed (${res.status})`);
  const xml = await res.text();
  const channelName = decodeXmlEntities(xml.match(/<name>([^<]+)<\/name>/i)?.[1] || 'YouTube');
  const allEntries = [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/gi)].map(m => parseYouTubeEntry(m[0], channelName)).filter(Boolean);
  return allEntries[0] || null;
}

/**
 * Notifications, YouTube alerts, custom commands, events, giveaways, polls, reminders
 */
export function registerEventsRoutes(app, deps) {
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
    normalizeYouTubeFeed,
    config
  } = deps;

  // NEW: Notification routes
  app.get('/notifications', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('notifications', req)));
  app.post('/notifications/save', requireAuth, (req, res) => {
    const { filters } = req.body;
    state.notificationFilters = Array.isArray(filters) ? filters : [];
    saveState();
    addLog('info', 'Notification filters updated');
    res.json({ success: true });
  });
  
  app.get('/youtube-alerts', requireAuth, requireTier('moderator'), (req, res) => res.send(renderPage('youtube-alerts', req)));
  app.post('/youtube-alerts/save', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const body = req.body || {};
      const prev = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
      const rawFeeds = Array.isArray(body.feeds) ? body.feeds : [];
  
      const nextFeeds = rawFeeds
        .map((feed, index) => normalizeYouTubeFeed(feed, `feed${index + 1}`))
        .filter(feed => feed.youtubeChannelId && feed.alertChannelId)
        .map(feed => {
          const old = (prev.feeds || []).find(f => f.id === feed.id);
          const changedSource = !old || old.youtubeChannelId !== feed.youtubeChannelId;
          return {
            ...old,
            ...feed,
            lastVideoId: changedSource ? null : (old?.lastVideoId || null),
            lastPublishedAt: changedSource ? null : (old?.lastPublishedAt || null)
          };
        });
  
      if (body.enabled && nextFeeds.length === 0) {
        return res.status(400).json({ success: false, error: 'At least one valid feed is required when YouTube alerts are enabled.' });
      }
  
      dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings({
        ...prev,
        enabled: Boolean(body.enabled),
        template: String(body.template || prev.template || defaultDashboardSettings.youtubeAlerts.template),
        rewardButtonLabel: String(body.rewardButtonLabel || prev.rewardButtonLabel || defaultDashboardSettings.youtubeAlerts.rewardButtonLabel),
        feeds: nextFeeds,
        claims: (prev.claims && typeof prev.claims === 'object') ? prev.claims : {}
      });
  
      saveState();
      addLog('info', `YouTube alerts updated: enabled=${dashboardSettings.youtubeAlerts.enabled}, feeds=${dashboardSettings.youtubeAlerts.feeds.length}`);
      dashAudit(req.userName || 'Dashboard', 'youtube-alerts', `YouTube alerts ${body.enabled ? 'enabled' : 'disabled'}, ${nextFeeds.length} feeds`);
  
      // YouTube alerts will be checked on next scheduled interval
      addLog('info', 'YouTube settings saved — changes take effect on next check cycle');
  
      res.json({ success: true, settings: dashboardSettings.youtubeAlerts });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || 'Failed to save YouTube alert settings' });
    }
  });
  
  app.post('/youtube-alerts/test', requireAuth, requireTier('moderator'), async (req, res) => {
    try {
      const { feedId } = req.body || {};
      const ya = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
      const requestedId = String(feedId || '');
      const feeds = Array.isArray(ya.feeds) ? ya.feeds : [];
      const feed = feeds.find(f => f.id === requestedId) || feeds[0] || null;
      if (!feed) {
        return res.status(400).json({
          success: false,
          error: 'No valid YouTube feed configured. Save at least one feed with a YouTube Channel ID and Discord Alert Channel first.'
        });
      }
  
      // Fetch real latest video for test if possible, otherwise use sample
      let sampleVideo;
      try {
        const realVideo = await fetchLatestYouTubeVideo(feed.youtubeChannelId);
        if (realVideo) {
          sampleVideo = { ...realVideo };
        }
      } catch (_e) { /* fall through to sample */ }
      if (!sampleVideo) {
        sampleVideo = {
          videoId: `test_${Date.now()}`,
          title: 'Simulated YouTube Video',
          url: 'https://www.youtube.com/watch?v=dQw4w9WgXcQ',
          publishedAt: new Date().toISOString(),
          channelName: feed.name || 'YouTube Channel',
          thumbnail: 'https://i.ytimg.com/vi/dQw4w9WgXcQ/maxresdefault.jpg',
          description: 'This is a test alert to verify your YouTube notification setup.'
        };
      }
  
      await sendYouTubeVideoAlert(feed, sampleVideo, { isTest: true });
      res.json({ success: true });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || 'Failed to send test alert' });
    }
  });
  
  // Force-check: reset baseline so next check posts the latest video as a new alert
  app.post('/youtube-alerts/force-post', requireAuth, requireTier('moderator'), async (req, res) => {
    try {
      const { feedId } = req.body || {};
      const ya = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
      const feeds = Array.isArray(ya.feeds) ? ya.feeds : [];
      const feed = feeds.find(f => f.id === String(feedId || '')) || feeds[0] || null;
      if (!feed) {
        return res.status(400).json({ success: false, error: 'No feed found.' });
      }
  
      const latest = await fetchLatestYouTubeVideo(feed.youtubeChannelId);
      if (!latest?.videoId) {
        return res.status(400).json({ success: false, error: 'Could not fetch latest video from YouTube.' });
      }
  
      // Post the real latest video as an alert
      const sent = await sendYouTubeVideoAlert(feed, latest);
      if (sent) {
        feed.lastVideoId = latest.videoId;
        feed.lastPublishedAt = latest.publishedAt || null;
        feed.lastAlertMessageId = sent.id;
        feed.lastSuccessAt = new Date().toISOString();
        feed.lastError = null;
        dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings(ya);
        saveState();
      }
  
      res.json({ success: true, video: { title: latest.title, videoId: latest.videoId } });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message || 'Failed to force-post' });
    }
  });
  
  // YouTube analytics data endpoint
  app.get('/youtube-alerts/data', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const summary = {};
      for (const [channelId, ch] of Object.entries(youtubeData.channels || {})) {
        const videos = Object.values(ch.videos || {}).sort((a, b) => new Date(b.publishedAt || 0) - new Date(a.publishedAt || 0));
        const totalViews = videos.reduce((s, v) => s + (v.views || 0), 0);
        summary[channelId] = {
          name: ch.name,
          totalVideosTracked: videos.length,
          totalViews,
          firstSeen: ch.firstSeen,
          lastChecked: ch.lastChecked,
          recentVideos: videos.slice(0, 15).map(v => ({
            videoId: v.videoId,
            title: v.title,
            publishedAt: v.publishedAt,
            views: v.views,
            url: v.url,
            viewHistory: (v.viewHistory || []).slice(-10)
          })),
          snapshots: (ch.snapshots || []).slice(-30)
        };
      }
      res.json({ success: true, channels: summary, lastUpdated: youtubeData.lastUpdated });
    } catch (err) {
      res.status(500).json({ success: false, error: err.message });
    }
  });
  
  // NEW: Custom Commands routes
  app.get('/customcmds', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('customcmds', req)));
  app.post('/customcmd/add', requireAuth, (req, res) => {
    const {
      name,
      names,
      response,
      imageUrl,
      autoDeleteAfterUses,
      autoDeleteDelaySeconds,
      cooldownSeconds,
      allowedRoleIds,
      allowedChannelIds,
      category,
      tags,
      sendAsEmbed
    } = req.body;
    if ((!name && !names) || !response) return res.status(400).json({ error: 'Missing fields' });
  
    const deleteAfterUses = parseInt(autoDeleteAfterUses, 10);
    const deleteDelaySec = parseInt(autoDeleteDelaySeconds, 10);
    const cooldownSec = parseInt(cooldownSeconds, 10);
    const autoDeleteAfterUsesValue = !isNaN(deleteAfterUses) && deleteAfterUses > 0 ? deleteAfterUses : null;
    const autoDeleteDelayMsValue = !isNaN(deleteDelaySec) && deleteDelaySec > 0 ? deleteDelaySec * 1000 : null;
    const cooldownMsValue = !isNaN(cooldownSec) && cooldownSec > 0 ? cooldownSec * 1000 : null;
  
    const rawNames = Array.isArray(names)
      ? names
      : (typeof name === 'string' ? name.split(/[,\n]+/) : []);
  
    const normalized = rawNames
      .map(n => (typeof n === 'string' ? n.trim() : ''))
      .filter(Boolean)
      .map(n => (n.startsWith('!') ? n.slice(1) : n).toLowerCase());
  
    if (normalized.length === 0) return res.status(400).json({ error: 'No valid command names' });
  
    const skipped = [];
    let added = 0;
  
    normalized.forEach(cmdName => {
      if (customCommands.find(c => c.name === cmdName)) {
        skipped.push('!' + cmdName);
        return;
      }
  
      customCommands.push({
        name: cmdName,
        response,
        imageUrl: imageUrl || '',
        uses: 0,
        paused: false,
        autoDeleteAfterUses: autoDeleteAfterUsesValue,
        autoDeleteDelayMs: autoDeleteDelayMsValue,
        cooldownMs: cooldownMsValue,
        allowedRoleIds: Array.isArray(allowedRoleIds) ? allowedRoleIds : [],
        allowedChannelIds: Array.isArray(allowedChannelIds) ? allowedChannelIds : [],
        category: (category || '').trim(),
        tags: Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []),
        sendAsEmbed: sendAsEmbed !== false,
        createdAt: new Date().toISOString()
      });
      added += 1;
      addLog('info', `Custom command added: !${cmdName}`);
    });
  
    saveState();
    dashAudit(req.userName || 'Dashboard', 'customcmd-add', `Added ${added} custom command(s)${skipped.length ? ', skipped: ' + skipped.join(', ') : ''}`);
    res.json({ success: true, added, skipped });
  });
  
  app.post('/customcmd/toggle', requireAuth, (req, res) => {
    const { id } = req.body;
    if (typeof id !== 'number' || id < 0 || id >= customCommands.length) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const cmd = customCommands[id];
    cmd.paused = !cmd.paused;
    saveState();
    addLog('info', `Custom command ${cmd.paused ? 'paused' : 'unpaused'}: ${cmd.name}`);
    dashAudit(req.userName || 'Dashboard', 'customcmd-toggle', `!${cmd.name} ${cmd.paused ? 'paused' : 'unpaused'}`);
    res.json({ success: true, paused: cmd.paused });
  });
  
  app.get('/customcmd/get/:id', requireAuth, (req, res) => {
    const id = parseInt(req.params.id);
    if (isNaN(id) || id < 0 || id >= customCommands.length) {
      return res.status(400).json({ error: 'Invalid ID' });
    }
    const cmd = customCommands[id];
    res.json({ 
      command: {
        name: cmd.name,
        response: cmd.response,
        imageUrl: cmd.imageUrl || '',
        uses: cmd.uses,
        paused: cmd.paused,
        autoDeleteAfterUses: cmd.autoDeleteAfterUses || null,
        autoDeleteDelayMs: cmd.autoDeleteDelayMs || null,
        cooldownMs: cmd.cooldownMs || null,
        allowedRoleIds: cmd.allowedRoleIds || [],
        allowedChannelIds: cmd.allowedChannelIds || [],
        category: cmd.category || '',
        tags: cmd.tags || [],
        sendAsEmbed: cmd.sendAsEmbed !== false
      },
      usageHistory: (cmd.usageHistory || []).slice(0, 5)
    });
  });
  
  app.post('/customcmd/update', requireAuth, (req, res) => {
    const {
      index,
      name,
      response,
      imageUrl,
      autoDeleteAfterUses,
      autoDeleteDelaySeconds,
      cooldownSeconds,
      allowedRoleIds,
      allowedChannelIds,
      category,
      tags,
      sendAsEmbed
    } = req.body;
    if (typeof index !== 'number' || index < 0 || index >= customCommands.length) {
      return res.status(400).json({ error: 'Invalid index' });
    }
    if (!name || !response) {
      return res.status(400).json({ error: 'Missing name or response' });
    }
  
    const cmd = customCommands[index];
    const oldName = cmd.name;
    
    // Normalize the name (remove ! and make lowercase)
    const normalized = (name.startsWith('!') ? name.slice(1) : name).toLowerCase();
    
    // Check if new name conflicts with other commands (excluding the current one)
    const conflict = customCommands.find((c, i) => i !== index && c.name === normalized);
    if (conflict) {
      return res.status(400).json({ error: 'Command name already exists' });
    }
  
    cmd.name = normalized;
    cmd.response = response;
    cmd.imageUrl = imageUrl || '';
    const deleteAfterUses = parseInt(autoDeleteAfterUses, 10);
    const deleteDelaySec = parseInt(autoDeleteDelaySeconds, 10);
    const cooldownSec = parseInt(cooldownSeconds, 10);
    cmd.autoDeleteAfterUses = !isNaN(deleteAfterUses) && deleteAfterUses > 0 ? deleteAfterUses : null;
    cmd.autoDeleteDelayMs = !isNaN(deleteDelaySec) && deleteDelaySec > 0 ? deleteDelaySec * 1000 : null;
    cmd.cooldownMs = !isNaN(cooldownSec) && cooldownSec > 0 ? cooldownSec * 1000 : null;
    cmd.allowedRoleIds = Array.isArray(allowedRoleIds) ? allowedRoleIds : [];
    cmd.allowedChannelIds = Array.isArray(allowedChannelIds) ? allowedChannelIds : [];
    cmd.category = (category || '').trim();
    cmd.tags = Array.isArray(tags) ? tags : (typeof tags === 'string' ? tags.split(',').map(t => t.trim()).filter(Boolean) : []);
    cmd.sendAsEmbed = sendAsEmbed !== false;
    saveState();
    addLog('info', `Custom command updated: !${oldName} → !${normalized}`);
    dashAudit(req.userName || 'Dashboard', 'customcmd-update', `Updated !${oldName} → !${normalized}`);
    res.json({ success: true });
  });
  
  app.post('/customcmd/delete', requireAuth, (req, res) => {
    const { id } = req.body;
    if (id >= 0 && id < customCommands.length) {
      const cmd = customCommands[id];
      customCommands.splice(id, 1);
      saveState();
      addLog('info', `Custom command deleted: ${cmd.name}`);
      dashAudit(req.userName || 'Dashboard', 'customcmd-delete', `Deleted !${cmd.name}`);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid ID' });
    }
  });
  
  // Image upload endpoint
  app.post('/upload/image', requireAuth, upload.single('image'), (req, res) => {
    if (!req.file) {
      return res.status(400).json({ success: false, error: 'No file uploaded' });
    }

    // Upload rate limit (20/hour per IP)
    if (!checkUploadRateLimit(req.ip)) {
      fs.unlinkSync(req.file.path);
      return res.status(429).json({ success: false, error: 'Upload limit exceeded. Try again later.' });
    }

    // Magic bytes validation — verify file is actually an image
    if (!validateImageMagicBytes(req.file.path)) {
      fs.unlinkSync(req.file.path);
      return res.status(400).json({ success: false, error: 'Invalid image file' });
    }
    
    // Use relative path so images survive hostname changes
    const url = `/uploads/${req.file.filename}`;
    
    res.json({ success: true, url: url });
  });
  
  // NEW: Giveaway routes
  app.get('/events', requireAuth, requireTier('moderator'), (req,res)=>{ const tab = req.query.tab || 'events-giveaways'; res.send(renderPage(tab, req)); });
  app.get('/giveaways', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('events-giveaways', req)));
  app.get('/polls', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('events-polls', req)));
  app.get('/reminders', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('events-reminders', req)));
  app.get('/discord/user/:id', requireAuth, async (req, res) => {
    const userId = req.params.id;
    const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
    if (!guildId) return res.status(400).json({ error: 'GUILD_ID not set' });
    try {
      const guild = await client.guilds.fetch(guildId);
      const member = await guild.members.fetch(userId);
      return res.json({ id: userId, username: member.user.username, displayName: member.displayName });
    } catch (err) {
      return res.status(404).json({ error: 'User not found' });
    }
  });
  app.post('/giveaway/start', requireAuth, async (req, res) => {
    const {
      prize,
      durationMinutes,
      channelId,
      pingRoleId,
      allowedRoleIds,
      excludedUserIds,
      imageUrl,
      embedColor,
      tag,
      winnersCount,
      minAccountAgeDays,
      minLevel,
      minXp,
      minJoinAgeDays,
      minMessages,
      requireBoost,
      createdBy,
      excludePreviousWinners,
      excludeBots,
      excludeStaffRoleIds
    } = req.body;
    if (!prize || !durationMinutes) return res.status(400).json({ error: 'Missing fields' });
  
    const targetChannelId = channelId || process.env.DISCORD_CHANNEL_ID;
    if (!targetChannelId) {
      return res.status(400).json({ error: 'DISCORD_CHANNEL_ID not set' });
    }
  
    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || !channel.send) {
        return res.status(400).json({ error: 'Giveaway channel not found or not sendable' });
      }
  
      const giveawayId = `giveaway_${Date.now()}`;
      const endsAt = Date.now() + (durationMinutes * 60 * 1000);
      const resolvedWinnersCount = Math.max(1, parseInt(winnersCount || 1, 10));
  
      const eligibleRolesText = Array.isArray(allowedRoleIds) && allowedRoleIds.length > 0
        ? allowedRoleIds.map(r => `<@&${r}>`).join(', ')
        : 'Anyone';
  
      const resolvedColor = (embedColor || config.giveawayDefaultColor || '').replace('#', '').trim();
      const parsedColor = resolvedColor ? parseInt(resolvedColor, 16) : NaN;
      const embedColorInt = Number.isFinite(parsedColor) ? parsedColor : 0xFF6B9D;
  
      const embed = new EmbedBuilder()
        .setColor(embedColorInt)
        .setTitle('🎉 GIVEAWAY 🎉')
        .setDescription(`**Prize:** ${prize}\n**Winners:** ${resolvedWinnersCount}\n**Eligible:** ${eligibleRolesText}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R>`) 
        .setFooter({ text: `${(allowedRoleIds && allowedRoleIds.length > 0) ? 'Eligible roles only' : 'React with 🎉 to enter'} | ID: ${giveawayId}` })
        .setTimestamp(endsAt);
  
      if (imageUrl) {
        embed.setImage(imageUrl);
      }
  
      // Add button entry alongside reaction
      const row = new ActionRowBuilder().addComponents(
        new ButtonBuilder().setCustomId(`giveaway_enter_${giveawayId}`).setLabel('🎉 Enter Giveaway').setStyle(ButtonStyle.Primary)
      );
  
      const contentPing = pingRoleId ? `<@&${pingRoleId}>` : undefined;
      const msg = await channel.send({ content: contentPing, embeds: [embed], components: [row] });
      if (!allowedRoleIds || allowedRoleIds.length === 0) {
        await msg.react('🎉');
      }
  
      giveaways.push({
        id: giveawayId,
        messageId: msg.id,
        channelId: targetChannelId,
        prize,
        winners: resolvedWinnersCount,
        endTime: endsAt,
        active: true,
        createdBy: 'dashboard',
        entries: [],
        participants: [],
        pingRoleId: pingRoleId || null,
        duration: durationMinutes * 60 * 1000,
        allowedRoleIds: Array.isArray(allowedRoleIds) ? allowedRoleIds : [],
        excludedUserIds: Array.isArray(excludedUserIds) ? excludedUserIds : [],
        imageUrl: imageUrl || null,
        embedColor: embedColor || null,
        tag: tag || null,
        minAccountAgeDays: Number.isFinite(minAccountAgeDays) ? minAccountAgeDays : Number(minAccountAgeDays) || 0,
        minLevel: Number.isFinite(minLevel) ? minLevel : Number(minLevel) || 0,
        minXp: Number.isFinite(minXp) ? minXp : Number(minXp) || 0,
        minJoinAgeDays: Number.isFinite(minJoinAgeDays) ? minJoinAgeDays : Number(minJoinAgeDays) || 0,
        minMessages: Number.isFinite(minMessages) ? minMessages : Number(minMessages) || 0,
        requireBoost: !!requireBoost,
        createdBy: createdBy || 'Dashboard',
        excludePreviousWinners: !!excludePreviousWinners,
        excludeBots: excludeBots !== false,
        excludeStaffRoleIds: Array.isArray(excludeStaffRoleIds) ? excludeStaffRoleIds : []
      });
      saveState();
  
      if (config.giveawayLogChannelId) {
        try {
          const logChannel = await client.channels.fetch(config.giveawayLogChannelId);
          if (logChannel && logChannel.send) {
            await logChannel.send({ embeds: [new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('🎉 Giveaway Started')
              .setDescription(`**Prize:** ${prize}\n**ID:** ${giveawayId}\n**Created By:** ${createdBy || 'Dashboard'}`)
              .setTimestamp()
            ] });
          }
        } catch {}
      }
  
      addLog('info', `Giveaway started: ${prize} (${winnersCount} winners, ${durationMinutes}min)`);
      dashAudit(req.userName || 'Dashboard', 'giveaway-start', `Started giveaway: ${prize} (${resolvedWinnersCount} winners, ${durationMinutes}min)`);
      return res.json({ success: true });
    } catch (err) {
      addLog('error', 'Failed to start giveaway from dashboard: ' + err.message);
      return res.status(500).json({ error: 'Failed to post giveaway to Discord', details: err.message });
    }
  });
  
  app.post('/giveaway/end', requireAuth, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Giveaway ID required' });
    const giveaway = giveaways.find(g => g.id === id && g.active);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found or already ended' });
    try {
      await endGiveaway(giveaway);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to end giveaway' });
    }
  });
  
  app.post('/giveaway/reroll', requireAuth, async (req, res) => {
    const { id } = req.body;
    if (!id) return res.status(400).json({ error: 'Giveaway ID required' });
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
    try {
      const channel = await client.channels.fetch(giveaway.channelId);
      let participants = [];
      const allowedRoles = Array.isArray(giveaway.allowedRoleIds) ? giveaway.allowedRoleIds : [];
      if (allowedRoles.length > 0) {
        participants = await getRoleBasedGiveawayParticipants(giveaway);
      } else {
        const msg = await channel.messages.fetch(giveaway.messageId);
        const reaction = msg.reactions.cache.get('🎉');
        if (!reaction) return res.status(400).json({ error: 'No participants found' });
        const users = await reaction.users.fetch();
        participants = users.filter(u => !u.bot).map(u => u.id);
      }
      giveaway.entryCount = participants.length;
      const eligible = await getEligibleGiveawayParticipants(giveaway, participants);
  
      // Keep entries snapshot for the latest ended giveaway only
      giveaways.forEach(g => {
        if (g.id !== giveaway.id) {
          delete g.entrySnapshot;
          delete g.entrySnapshotAt;
        }
      });
      giveaway.entrySnapshot = eligible.slice();
      giveaway.entrySnapshotAt = Date.now();
      if (eligible.length === 0) return res.status(400).json({ error: 'No valid participants' });
      const winnerCount = Math.min(giveaway.winners || 1, eligible.length);
      const shuffled = eligible.sort(() => Math.random() - 0.5);
      const rerollWinners = shuffled.slice(0, winnerCount);
      const winnerMentions = rerollWinners.map(id => `<@${id}>`).join(', ');
      await channel.send({ embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('🎉 Giveaway Rerolled!').setDescription(`**Prize:** ${giveaway.prize}\n**New Winner(s):** ${winnerMentions}`)] });
      addLog('info', `Giveaway rerolled: ${giveaway.id}`);
      return res.json({ success: true });
    } catch (err) {
      addLog('error', `Giveaway reroll error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to reroll giveaway' });
    }
  });
  
  app.post('/giveaway/exclusions/remove', requireAuth, (req, res) => {
    const { id, userId } = req.body;
    if (!id || !userId) return res.status(400).json({ error: 'Giveaway ID and User ID required' });
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
  
    if (!Array.isArray(giveaway.excludedUserIds)) giveaway.excludedUserIds = [];
    const before = giveaway.excludedUserIds.length;
    giveaway.excludedUserIds = giveaway.excludedUserIds.filter(u => u !== userId);
    const after = giveaway.excludedUserIds.length;
  
    saveState();
    return res.json({ success: true, removed: before - after, remaining: after });
  });
  
  app.get('/giveaway/info/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json(null);
    
    // Add excluded user names
    const excludedUsers = [];
    if (Array.isArray(giveaway.excludedUserIds) && giveaway.excludedUserIds.length > 0) {
      const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
      const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
      
      for (const userId of giveaway.excludedUserIds) {
        try {
          const member = guild.members.cache.get(userId);
          if (member) {
            excludedUsers.push({
              id: userId,
              name: member.displayName || member.user.username
            });
          } else {
            excludedUsers.push({
              id: userId,
              name: 'Unknown User'
            });
          }
        } catch (err) {
          excludedUsers.push({
            id: userId,
            name: 'Unknown User'
          });
        }
      }
    }
    
    res.json({ ...giveaway, excludedUsers });
  });
  
  app.get('/giveaway/entries/:id', requireAuth, async (req, res) => {
    const { id } = req.params;
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
  
    const now = Date.now();
    if (giveaway._entriesCache && (now - giveaway._entriesCache.ts) < 30000) {
      return res.json({ entries: giveaway._entriesCache.entries || [] });
    }
  
    if (!giveaway.active && Array.isArray(giveaway.entrySnapshot)) {
      return res.json({ entries: giveaway.entrySnapshot.map(id => ({ id, name: id })) });
    }
  
    try {
      const participants = await getGiveawayParticipants(giveaway);
      const eligible = await getEligibleGiveawayParticipants(giveaway, participants);
      const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
      const guild = guildId ? await client.guilds.fetch(guildId) : client.guilds.cache.first();
      const entries = [];
  
      for (const userId of eligible) {
        try {
          const member = guild.members.cache.get(userId) || await guild.members.fetch(userId);
          entries.push({
            id: userId,
            name: member?.displayName || member?.user?.username || 'Unknown'
          });
        } catch {
          entries.push({ id: userId, name: 'Unknown' });
        }
      }
  
      giveaway.entryCount = entries.length;
      giveaway._entriesCache = { ts: now, entries };
      return res.json({ entries });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to load entries' });
    }
  });
  
  app.post('/giveaway/ping-winners', requireAuth, async (req, res) => {
    const { id } = req.body;
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
    if (!Array.isArray(giveaway.winners) || giveaway.winners.length === 0) {
      return res.status(400).json({ error: 'No winners found' });
    }
  
    try {
      const channel = await client.channels.fetch(giveaway.channelId);
      const mentions = giveaway.winners.map(w => `<@${w}>`).join(', ');
      const winText = `🎉 ${mentions} you’ve won **${giveaway.prize}**!`;
      await channel.send({ content: winText, embeds: [new EmbedBuilder().setColor(0x57F287).setTitle('🎉 Giveaway Winners').setDescription(`**Prize:** ${giveaway.prize}\n**Winner(s):** ${mentions}`)] });
  
      if (config.giveawayLogChannelId) {
        try {
          const logChannel = await client.channels.fetch(config.giveawayLogChannelId);
          if (logChannel && logChannel.send) {
            await logChannel.send({ embeds: [new EmbedBuilder()
              .setColor(0x57F287)
              .setTitle('📣 Winners Pinged')
              .setDescription(`**Prize:** ${giveaway.prize}\n**Winners:** ${mentions}\n**ID:** ${giveaway.id}`)
              .setTimestamp()
            ] });
          }
        } catch {}
      }
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to ping winners' });
    }
  });
  
  app.post('/giveaway/archive', requireAuth, (req, res) => {
    const { id } = req.body;
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
    giveaway.archived = true;
    giveaway.active = false;
    saveState();
    return res.json({ success: true });
  });
  
  app.post('/giveaway/pause', requireAuth, (req, res) => {
    const { id } = req.body;
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
    if (!giveaway.active || giveaway.paused) return res.status(400).json({ error: 'Giveaway not active' });
  
    giveaway.paused = true;
    giveaway.pauseRemainingMs = Math.max(0, giveaway.endTime - Date.now());
    giveaway.pausedAt = Date.now();
    saveState();
  
    if (config.giveawayLogChannelId) {
      client.channels.fetch(config.giveawayLogChannelId)
        .then(ch => ch?.send && ch.send({ embeds: [new EmbedBuilder()
          .setColor(0xFEE75C)
          .setTitle('⏸️ Giveaway Paused')
          .setDescription(`**Prize:** ${giveaway.prize}\n**ID:** ${giveaway.id}`)
          .setTimestamp()
        ] }))
        .catch(() => {});
    }
  
    return res.json({ success: true });
  });
  
  app.post('/giveaway/resume', requireAuth, (req, res) => {
    const { id } = req.body;
    const giveaway = giveaways.find(g => g.id === id);
    if (!giveaway) return res.status(404).json({ error: 'Giveaway not found' });
    if (!giveaway.paused) return res.status(400).json({ error: 'Giveaway not paused' });
  
    const remaining = Number(giveaway.pauseRemainingMs) || 0;
    if (remaining <= 0) {
      giveaway.paused = false;
      saveState();
      return res.status(400).json({ error: 'Giveaway already expired' });
    }
  
    giveaway.paused = false;
    giveaway.endTime = Date.now() + remaining;
    giveaway.pauseRemainingMs = null;
    giveaway.pausedAt = null;
    saveState();
  
    if (config.giveawayLogChannelId) {
      client.channels.fetch(config.giveawayLogChannelId)
        .then(ch => ch?.send && ch.send({ embeds: [new EmbedBuilder()
          .setColor(0x57F287)
          .setTitle('▶️ Giveaway Resumed')
          .setDescription(`**Prize:** ${giveaway.prize}\n**ID:** ${giveaway.id}`)
          .setTimestamp()
        ] }))
        .catch(() => {});
    }
  
    return res.json({ success: true });
  });
  
  app.post('/giveaway/delete', requireAuth, async (req, res) => {
    const { id } = req.body;
    const idx = giveaways.findIndex(g => g.id === id);
    if (idx === -1) return res.status(404).json({ error: 'Giveaway not found' });
    const giveaway = giveaways[idx];
    try {
      if (giveaway.channelId && giveaway.messageId) {
        const channel = await client.channels.fetch(giveaway.channelId);
        const msg = await channel.messages.fetch(giveaway.messageId);
        if (msg) await msg.delete();
      }
    } catch {}
    giveaways.splice(idx, 1);
    saveState();
    dashAudit(req.userName || 'Dashboard', 'giveaway-delete', `Deleted giveaway: ${giveaway.prize}`);
    return res.json({ success: true });
  });
  
  app.post('/giveaway/settings', requireAuth, (req, res) => {
    const { giveawayClaimContact, giveawayDefaultColor, giveawayLogChannelId } = req.body || {};
    config.giveawayClaimContact = (giveawayClaimContact || '').trim();
    config.giveawayDefaultColor = (giveawayDefaultColor || '').trim();
    config.giveawayLogChannelId = (giveawayLogChannelId || '').trim();
    saveConfig();
    dashAudit(req.userName || 'Dashboard', 'giveaway-settings', 'Updated giveaway settings');
    return res.json({ success: true });
  });
  
  app.get('/giveaway/templates', requireAuth, (req, res) => {
    res.json({ templates: Array.isArray(config.giveawayTemplates) ? config.giveawayTemplates : [] });
  });
  
  app.post('/giveaway/templates/save', requireAuth, (req, res) => {
    const { name, template } = req.body || {};
    const trimmed = (name || '').trim();
    if (!trimmed) return res.status(400).json({ error: 'Template name required' });
    if (!Array.isArray(config.giveawayTemplates)) config.giveawayTemplates = [];
    config.giveawayTemplates = config.giveawayTemplates.filter(t => t.name !== trimmed);
    config.giveawayTemplates.push({ name: trimmed, template: template || {} });
    saveConfig();
    return res.json({ success: true });
  });
  
  app.post('/giveaway/templates/delete', requireAuth, (req, res) => {
    const { name } = req.body || {};
    const trimmed = (name || '').trim();
    if (!trimmed) return res.status(400).json({ error: 'Template name required' });
    if (!Array.isArray(config.giveawayTemplates)) config.giveawayTemplates = [];
    config.giveawayTemplates = config.giveawayTemplates.filter(t => t.name !== trimmed);
    saveConfig();
    return res.json({ success: true });
  });
  
  app.get('/giveaway/export-winners', requireAuth, async (_req, res) => {
    const ended = giveaways.filter(g => Array.isArray(g.winners) && g.winners.length > 0);
    const rows = ['prize,createdBy,winnerIds,winnerNames'];
    for (const g of ended) {
      const prize = String(g.prize || '').replace(/"/g, '""');
      const createdBy = String(g.createdBy || 'Dashboard').replace(/"/g, '""');
      const winnerIds = g.winners.map(w => w).join(' ');
      const winnerNames = [];
      for (const id of g.winners) {
        try {
          const name = await fetchUserName(id);
          winnerNames.push(name);
        } catch {
          winnerNames.push(id);
        }
      }
      const names = winnerNames.join(' | ').replace(/"/g, '""');
      rows.push(`"${prize}","${createdBy}","${winnerIds}","${names}"`);
    }
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="giveaway_winners.csv"');
    res.send(rows.join('\n'));
  });
  
  app.post('/giveaway/preview-members', requireAuth, async (req, res) => {
    const { roleIds, excludeIds, excludePreviousWinners, excludeBots, excludeStaffRoleIds, minAccountAgeDays, minLevel, minXp } = req.body;
    
    if (!Array.isArray(roleIds) || roleIds.length === 0) {
      return res.json({ members: [] });
    }
    
    try {
      const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
      const guild = guildId ? client.guilds.cache.get(guildId) : client.guilds.cache.first();
      
      if (!guild) {
        return res.status(500).json({ error: 'Guild not found' });
      }
      
      const excludes = Array.isArray(excludeIds) ? excludeIds : [];
      const staffRoleSet = new Set(Array.isArray(excludeStaffRoleIds) ? excludeStaffRoleIds : []);
      const previousWinnersSet = excludePreviousWinners ? new Set(getAllGiveawayWinnerIds()) : new Set();
      const roleSet = new Set(roleIds);
      const members = [];
  
      // Use cached members only (no fetch to avoid rate limiting)
      guild.members.cache.forEach(member => {
        if (excludeBots !== false && member.user.bot) return;
        if (previousWinnersSet.has(member.id)) return;
        if (excludes.includes(member.id)) return;
        if (staffRoleSet.size > 0 && member.roles.cache.some(r => staffRoleSet.has(r.id))) return;
        if (minAccountAgeDays > 0) {
          const ageMs = Date.now() - member.user.createdTimestamp;
          const ageDays = Math.floor(ageMs / (1000 * 60 * 60 * 24));
          if (ageDays < minAccountAgeDays) return;
        }
        if (minLevel > 0 || minXp > 0) {
          const data = leveling[member.id] || { level: 0, xp: 0 };
          if (minLevel > 0 && Number(data.level) < minLevel) return;
          if (minXp > 0 && Number(data.xp) < minXp) return;
        }
  
        const hasRole = member.roles.cache.some(r => roleSet.has(r.id));
        if (!hasRole) return;
  
        members.push({
          id: member.id,
          username: member.user.username,
          displayName: member.displayName || member.user.displayName
        });
      });
  
      return res.json({ members });
    } catch (err) {
      addLog('error', `Preview members error: ${err.message}`);
      return res.status(500).json({ error: 'Failed to fetch members', details: err.message });
    }
  });
  
  // NEW: Poll routes
  app.post('/poll/create', requireAuth, async (req, res) => {
    const { question, options, durationMinutes, channelId: reqChannelId, pingRoleId, embedColor, imageUrl, tag } = req.body;
    if (!question || !Array.isArray(options) || options.length < 2) {
      return res.status(400).json({ error: 'Need question and at least 2 options' });
    }
  
    const emojis = ['1️⃣','2️⃣','3️⃣','4️⃣','5️⃣','6️⃣','7️⃣','8️⃣','9️⃣','🔟'];
    if (options.length > emojis.length) {
      return res.status(400).json({ error: `Max ${emojis.length} options` });
    }
  
    const channelId = reqChannelId || process.env.DISCORD_CHANNEL_ID;
    if (!channelId) {
      return res.status(400).json({ error: 'No channel specified and DISCORD_CHANNEL_ID not set' });
    }
  
    try {
      const channel = await client.channels.fetch(channelId);
      if (!channel || !channel.send) {
        return res.status(400).json({ error: 'Poll channel not found or not sendable' });
      }
  
      const pollId = `poll_${Date.now()}`;
      const endsAt = durationMinutes && durationMinutes > 0 ? Date.now() + (durationMinutes * 60 * 1000) : null;
      const optionsText = options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');
      let color = 0x5865F2;
      if (embedColor) {
        const parsed = parseInt(String(embedColor).replace('#', ''), 16);
        if (!isNaN(parsed)) color = parsed;
      }
      const embed = new EmbedBuilder()
        .setColor(color)
        .setTitle('📊 ' + question)
        .setDescription(optionsText + (tag ? `\n\n🏷️ **${tag}**` : ''))
        .setFooter({ text: `ID: ${pollId}${endsAt ? ' | Ends' : ' | No time limit'}` });
  
      if (endsAt) embed.setTimestamp(endsAt);
      if (imageUrl) embed.setImage(imageUrl);
  
      const msgPayload = { embeds: [embed] };
      if (pingRoleId) msgPayload.content = `<@&${pingRoleId}>`;
  
      const msg = await channel.send(msgPayload);
      for (let i = 0; i < options.length; i++) {
        await msg.react(emojis[i]);
      }
  
      polls.push({
        id: pollId,
        messageId: msg.id,
        channelId,
        question,
        options,
        endTime: endsAt,
        active: true,
        createdBy: 'dashboard',
        votes: options.map(() => 0),
        pingRoleId: pingRoleId || null,
        embedColor: embedColor || null,
        imageUrl: imageUrl || null,
        tag: tag || null
      });
      saveState();
  
      addLog('info', `Poll created: "${question}"`);
      dashAudit(req.userName || 'Dashboard', 'poll-create', `Created poll: "${question}"`);
      return res.json({ success: true });
    } catch (err) {
      console.error('Error creating poll', err);
      return res.status(500).json({ error: 'Failed to post poll to Discord' });
    }
  });
  
  app.post('/poll/end', requireAuth, async (req, res) => {
    const { pollId } = req.body;
    if (!pollId) return res.status(400).json({ error: 'Poll ID required' });
    const poll = polls.find(p => p.id === pollId && p.active);
    if (!poll) return res.status(404).json({ error: 'Poll not found or already ended' });
    try {
      await endPoll(poll);
      return res.json({ success: true });
    } catch (err) {
      return res.status(500).json({ error: 'Failed to end poll' });
    }
  });
  
  app.post('/poll/delete', requireAuth, async (req, res) => {
    const { pollId, messageId, pollIndex } = req.body;
    if (!pollId && !messageId && (typeof pollIndex !== 'number')) {
      return res.status(400).json({ error: 'Poll ID required' });
    }
    
    let index = -1;
    if (pollId) index = polls.findIndex(p => p.id === pollId);
    if (index === -1 && messageId) index = polls.findIndex(p => p.messageId === messageId);
    if (index === -1 && typeof pollIndex === 'number' && pollIndex >= 0 && pollIndex < polls.length) {
      index = pollIndex;
    }
    
    if (index === -1) {
      return res.status(404).json({ error: 'Poll not found' });
    }
    
    const poll = polls[index];
    
    // Try to delete the Discord message
    try {
      if (poll.messageId && poll.channelId) {
        const channel = await client.channels.fetch(poll.channelId);
        if (channel && channel.messages) {
          const msg = await channel.messages.fetch(poll.messageId);
          if (msg) await msg.delete();
        }
      }
    } catch (err) {
      console.error('Could not delete poll message from Discord:', err);
    }
    
    polls.splice(index, 1);
    saveState();
    addLog('info', `Poll deleted: "${poll.question}"`);
    dashAudit(req.userName || 'Dashboard', 'poll-delete', `Deleted poll: "${poll.question}"`);
    return res.json({ success: true });
  });
  
  // NEW: Reminder routes
  app.post('/reminder/add', requireAuth, (req, res) => {
    const { text, time } = req.body;
    if (!text || !time) return res.status(400).json({ error: 'Missing fields' });
    
    const minutes = parseInt(time);
    if (isNaN(minutes) || minutes < 1) {
      return res.status(400).json({ error: 'Invalid time value' });
    }
    
    const reminderId = `reminder_${Date.now()}`;
    const reminderTime = Date.now() + (minutes * 60 * 1000);
    
    const reminder = {
      id: reminderId,
      message: text,
      text: text, // backwards compatibility
      reminderTime,
      time: new Date(reminderTime).toLocaleString(), // backwards compatibility
      active: true,
      triggered: false,
      createdAt: new Date().toISOString(),
      userId: null, // From dashboard, no specific user
      channelId: config.CUSTOM_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID || null,
      createdBy: 'dashboard'
    };
    
    reminders.push(reminder);
    saveState();
    addLog('info', `Reminder added from dashboard: "${text}" in ${minutes} minutes`);
    dashAudit(req.userName || 'Dashboard', 'reminder-add', `Reminder: "${text}" in ${minutes}min`);
    res.json({ success: true });
  });
  
  // NEW: Embeds routes
  app.get('/embeds', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('embeds', req)));
  app.post('/embed/send', requireAuth, async (req, res) => {
    const {
      title, description, color, footer, thumbnail, image, timestamp, fields, channelId
    } = req.body || {};
  
    const targetChannelId = channelId || process.env.DISCORD_CHANNEL_ID;
    if (!targetChannelId) return res.status(400).json({ error: 'No channel ID provided and DISCORD_CHANNEL_ID not set' });
  
    try {
      const channel = await client.channels.fetch(targetChannelId);
      if (!channel || !channel.send) return res.status(400).json({ error: 'Channel not found or not sendable' });
  
      const embed = new EmbedBuilder();
      if (title) embed.setTitle(title);
      if (description) embed.setDescription(description);
      if (color) {
        const c = String(color).trim().replace(/^#/, '');
        const num = parseInt(c, 16);
        if (Number.isFinite(num)) embed.setColor(num);
      }
      if (footer) embed.setFooter({ text: footer });
      if (thumbnail) embed.setThumbnail(thumbnail);
      if (image) embed.setImage(image);
      if (timestamp) embed.setTimestamp();
      if (Array.isArray(fields)) {
        const safeFields = fields
          .filter(f => f && f.name && f.value)
          .slice(0, 25) // Discord limit
          .map(f => ({ name: String(f.name).slice(0, 256), value: String(f.value).slice(0, 1024), inline: !!f.inline }));
        if (safeFields.length) embed.addFields(safeFields);
      }
  
      await channel.send({ embeds: [embed] });
      addLog('info', `Embed posted${title ? ': ' + title : ''}`);
      return res.json({ success: true });
    } catch (err) {
      addLog('error', 'Failed to send embed: ' + err.message);
      return res.status(500).json({ error: 'Failed to send embed' });
    }
  });
  
  app.post('/reminder/delete', requireAuth, (req, res) => {
    const { id } = req.body;
    if (id >= 0 && id < reminders.length) {
      const rem = reminders[id];
      reminders.splice(id, 1);
      saveState();
      addLog('info', `Reminder deleted: "${rem.text}"`);
      res.json({ success: true });
    } else {
      res.status(400).json({ error: 'Invalid ID' });
    }
  });
}
