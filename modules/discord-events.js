import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import {
  EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, PermissionsBitField,
  REST, Routes, SlashCommandBuilder, AuditLogEvent
} from 'discord.js';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '..');

export function registerDiscordEvents(deps) {
  const {
    addAuditLogEntry, addLog, afkUsers, auditLogSettings, chatStats, checkStream, client,
    commandUsage, computeNextScheduledStream, dashboardSettings, debouncedSaveState,
    ensureTwitchInitialized, fullMemberCacheSync, giveaways, getMemberRoleIds,
    history, isExcludedBySettings, leveling, levelingConfig, loadJSON, loadRPGWorlds, log,
    normalizeYouTubeAlertsSettings, notificationHistory, notifyPetsChange,
    PETS_PATH, polls, reminders, rpgBot, rpgTestMode, saveJSON, saveState,
    schedule, smartBot, state, stats, streamInfo, suggestions,
    trackMemberGrowth, truncateLogText, weeklyLeveling, welcomeSettings, featureHooks
  } = deps;

  async function forceDelayedNotification() {
    if (!schedule) schedule = {};
    if (!schedule.nextStreamAt) {
      schedule.nextStreamAt = new Date(Date.now() - 5 * 60 * 1000).toISOString();
    }
    schedule.streamDelayed = false;
    saveState();
    await checkStream();
  }
  
  const YOUTUBE_CHECK_INTERVAL_MS = 5 * 60 * 1000;
  let youtubeCheckInterval = null;
  let youtubeCheckInProgress = false;
  
  function decodeXmlEntities(text = '') {
    return String(text)
      .replace(/&amp;/g, '&')
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'");
  }
  
  function normalizeYouTubeChannelId(value) {
    const raw = String(value || '').trim();
    if (!raw) return '';
    const match = raw.match(/UC[\w-]{20,}/);
    return match ? match[0] : raw;
  }
  
  function renderYouTubeAlertTemplate(template, video, feed) {
    const fallback = '📺 **{channelName}** just uploaded: **{title}**\n{url}\nPublished: {publishedAt}';
    const source = String(template || fallback);
    const publishedAt = video?.publishedAt
      ? new Date(video.publishedAt).toLocaleString()
      : new Date().toLocaleString();
    const values = {
      title: video?.title || 'New video',
      url: video?.url || '',
      publishedAt,
      channelName: video?.channelName || feed?.name || 'YouTube',
      videoId: video?.videoId || ''
    };
    return source.replace(/\{(title|url|publishedAt|channelName|videoId)\}/g, (_match, key) => values[key] ?? '');
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
    const channelUri = xml.match(/<uri>([^<]+)<\/uri>/i)?.[1] || '';
  
    // Parse ALL entries for data collection
    const allEntries = [...xml.matchAll(/<entry>[\s\S]*?<\/entry>/gi)].map(m => parseYouTubeEntry(m[0], channelName)).filter(Boolean);
  
    // Collect YouTube data in background
    collectYouTubeData(youtubeChannelId, channelName, channelUri, allEntries).catch(() => {});
  
    return allEntries[0] || null;
  }
  
  // ── YouTube Data Collection ──
  const YOUTUBE_DATA_PATH = path.join(ROOT_DIR, 'data', 'youtube-data.json');
  let youtubeData = { channels: {}, lastUpdated: null };
  try {
    if (fs.existsSync(YOUTUBE_DATA_PATH)) youtubeData = JSON.parse(fs.readFileSync(YOUTUBE_DATA_PATH, 'utf8'));
  } catch { youtubeData = { channels: {}, lastUpdated: null }; }
  
  function saveYouTubeData() {
    try { fs.writeFileSync(YOUTUBE_DATA_PATH, JSON.stringify(youtubeData, null, 2)); } catch (err) { addLog('warn', `Failed to save YouTube data: ${err.message}`); }
  }
  
  async function collectYouTubeData(channelId, channelName, channelUri, videos) {
    if (!channelId || !Array.isArray(videos) || videos.length === 0) return;
    const ch = youtubeData.channels[channelId] || { name: channelName, uri: channelUri, videos: {}, totalVideosTracked: 0, firstSeen: new Date().toISOString(), snapshots: [] };
    ch.name = channelName;
    ch.uri = channelUri || ch.uri;
    ch.lastChecked = new Date().toISOString();
  
    for (const v of videos) {
      const existing = ch.videos[v.videoId];
      const snap = { views: v.views, checkedAt: new Date().toISOString() };
      if (existing) {
        // Update view count history (keep last 50 snapshots per video)
        existing.title = v.title;
        existing.views = v.views;
        existing.updatedAt = v.updatedAt;
        existing.viewHistory = existing.viewHistory || [];
        if (v.views !== null) {
          const lastSnap = existing.viewHistory[existing.viewHistory.length - 1];
          if (!lastSnap || lastSnap.views !== v.views) existing.viewHistory.push(snap);
          if (existing.viewHistory.length > 50) existing.viewHistory = existing.viewHistory.slice(-50);
        }
      } else {
        ch.videos[v.videoId] = {
          videoId: v.videoId,
          title: v.title,
          url: v.url,
          publishedAt: v.publishedAt,
          updatedAt: v.updatedAt,
          description: (v.description || '').slice(0, 500),
          views: v.views,
          starRating: v.starRating,
          thumbnail: v.thumbnail,
          viewHistory: v.views !== null ? [snap] : [],
          discoveredAt: new Date().toISOString()
        };
        ch.totalVideosTracked++;
      }
    }
  
    // Channel-level snapshot (total views across all tracked videos, once per check)
    const totalViews = Object.values(ch.videos).reduce((sum, v) => sum + (v.views || 0), 0);
    const totalVids = Object.keys(ch.videos).length;
    ch.snapshots = ch.snapshots || [];
    ch.snapshots.push({ totalViews, totalVideos: totalVids, checkedAt: new Date().toISOString() });
    if (ch.snapshots.length > 200) ch.snapshots = ch.snapshots.slice(-200);
  
    youtubeData.channels[channelId] = ch;
    youtubeData.lastUpdated = new Date().toISOString();
    saveYouTubeData();
  }
  
  async function sendYouTubeVideoAlert(feed, video, { isTest = false } = {}) {
    const ya = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
    if (!feed?.alertChannelId) return null;
  
    const targetChannel = await client.channels.fetch(feed.alertChannelId).catch(() => null);
    if (!targetChannel || typeof targetChannel.send !== 'function') {
      throw new Error('Configured YouTube alert channel is invalid or inaccessible');
    }
  
    // Pick the best available thumbnail (maxresdefault → hqdefault fallback)
    let thumbnailUrl = `https://i.ytimg.com/vi/${video.videoId}/maxresdefault.jpg`;
    try {
      const headRes = await fetch(thumbnailUrl, { method: 'HEAD', signal: AbortSignal.timeout(5000) });
      if (!headRes.ok) thumbnailUrl = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`;
    } catch { thumbnailUrl = `https://i.ytimg.com/vi/${video.videoId}/hqdefault.jpg`; }
  
    const ping = feed.alertRoleId ? `<@&${feed.alertRoleId}>` : '';
  
    // ── Build a clean YouTube-style embed ──
    const channelDisplayName = video.channelName || feed.name || 'YouTube Channel';
    const videoUrl = video.url || `https://www.youtube.com/watch?v=${video.videoId}`;
    const channelUrl = `https://www.youtube.com/channel/${feed.youtubeChannelId}`;
    // Use a reliable YouTube play-button icon (PNG, not SVG)
    const ytIconUrl = 'https://i.imgur.com/szMqSBe.png';
  
    const embed = new EmbedBuilder()
      .setColor(0xFF0000)
      .setAuthor({ name: `${channelDisplayName}  •  New Upload`, url: channelUrl, iconURL: ytIconUrl })
      .setTitle(video.title || 'New Video')
      .setURL(videoUrl)
      .setImage(thumbnailUrl);
  
    // Description — trimmed excerpt from the video description
    const descExcerpt = video.description ? video.description.slice(0, 280).replace(/\n{2,}/g, '\n').trim() + (video.description.length > 280 ? '…' : '') : '';
    if (descExcerpt) embed.setDescription(descExcerpt);
  
    // Published timestamp field
    const publishDate = video.publishedAt ? new Date(video.publishedAt) : new Date();
    embed.addFields({ name: '📅  Published', value: `<t:${Math.floor(publishDate.getTime() / 1000)}:R>`, inline: true });
  
    embed.setFooter({ text: `YouTube${isTest ? '  •  TEST MODE' : ''}`, iconURL: ytIconUrl });
    embed.setTimestamp(publishDate);
  
    const hasReward = (feed.rewardXp || 0) > 0 || (feed.rewardRoleId || '').trim() || (Number(feed.rewardMultiplier) || 1) > 1;
    const components = [];
  
    const watchRow = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setLabel('▶  Watch on YouTube')
        .setStyle(ButtonStyle.Link)
        .setURL(videoUrl)
    );
    if (hasReward) {
      watchRow.addComponents(
        new ButtonBuilder()
          .setCustomId(`yt-claim:${feed.id}:${video.videoId}`)
          .setLabel(String(ya.rewardButtonLabel || '🎁 Claim Reward').slice(0, 80))
          .setStyle(ButtonStyle.Success)
      );
    }
    components.push(watchRow);
  
    // Send: ping only as content (clean), the embed carries the info
    const sentMessage = await targetChannel.send({
      content: ping || undefined,
      embeds: [embed],
      components
    });
  
    notificationHistory.push({
      type: 'youtube',
      message: `${video.channelName || feed.name || 'YouTube'}: ${video.title}`,
      timestamp: Date.now()
    });
  
    addLog('announce', `YouTube alert sent for feed=${feed.id}, video=${video.videoId}${isTest ? ' (test)' : ''}`);
    return sentMessage;
  }
  
  async function checkYouTubeAlerts() {
    if (youtubeCheckInProgress) return;
    youtubeCheckInProgress = true;
  
    const checkStartedAt = Date.now();
    try {
      const ya = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
      ya.health = {
        ...(ya.health || {}),
        lastCheckAt: new Date().toISOString(),
        lastDurationMs: null,
        lastCheckedFeeds: 0
      };
      if (!ya.enabled || !Array.isArray(ya.feeds) || ya.feeds.length === 0) {
        ya.health.lastDurationMs = Date.now() - checkStartedAt;
        // Persist health data even when disabled/no feeds so the dashboard stays accurate
        dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings(ya);
        saveState();
        return;
      }
  
      let hadSuccess = false;
      let lastError = null;
      let checkedCount = 0;
  
      for (const feed of ya.feeds) {
        if (!feed.youtubeChannelId || !feed.alertChannelId) continue;
        const feedCheckStart = Date.now();
        feed.lastCheckAt = new Date().toISOString();
        checkedCount++;
  
        try {
          const normalizedChannelId = normalizeYouTubeChannelId(feed.youtubeChannelId);
          feed.youtubeChannelId = normalizedChannelId;
  
          // Validate channel ID format before making the request
          if (!normalizedChannelId || (!normalizedChannelId.startsWith('UC') && /^@/.test(normalizedChannelId))) {
            feed.lastDurationMs = Date.now() - feedCheckStart;
            feed.lastError = 'Invalid YouTube Channel ID format. Use the UC... channel ID, not a @handle or URL.';
            lastError = feed.lastError;
            addLog('warn', `YouTube feed ${feed.id}: invalid channel ID "${normalizedChannelId}". Needs UC... format.`);
            continue;
          }
  
          const latest = await fetchLatestYouTubeVideo(normalizedChannelId);
          feed.lastDurationMs = Date.now() - feedCheckStart;
  
          if (!latest?.videoId) {
            feed.lastError = 'No video entry found in feed';
            lastError = feed.lastError;
            continue;
          }
  
          if (!feed.lastVideoId) {
            feed.lastVideoId = latest.videoId;
            feed.lastPublishedAt = latest.publishedAt || null;
            feed.lastSuccessAt = new Date().toISOString();
            feed.lastError = null;
            hadSuccess = true;
            addLog('info', `YouTube baseline set for feed=${feed.id} video=${latest.videoId}`);
            continue;
          }
  
          if (feed.lastVideoId === latest.videoId) {
            feed.lastSuccessAt = new Date().toISOString();
            feed.lastError = null;
            hadSuccess = true;
            continue;
          }
  
          const sent = await sendYouTubeVideoAlert(feed, latest);
          if (!sent) continue;
  
          feed.lastVideoId = latest.videoId;
          feed.lastPublishedAt = latest.publishedAt || null;
          feed.lastAlertMessageId = sent.id;
          feed.lastSuccessAt = new Date().toISOString();
          feed.lastError = null;
          hadSuccess = true;
        } catch (err) {
          feed.lastDurationMs = Date.now() - feedCheckStart;
          feed.lastError = err.message;
          lastError = err.message;
          addLog('warn', `YouTube feed check failed (${feed.id}): ${err.message}`);
        }
      }
  
      ya.health.lastDurationMs = Date.now() - checkStartedAt;
      ya.health.lastCheckedFeeds = checkedCount;
      if (hadSuccess) {
        ya.health.lastSuccessAt = new Date().toISOString();
        ya.health.lastError = null;
      } else if (lastError) {
        ya.health.lastError = lastError;
      }
  
      // Merge per-feed results back without overwriting settings changed by dashboard during async check
      const current = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
      const feedMap = new Map(ya.feeds.map(f => [f.id, f]));
      current.feeds = current.feeds.map(f => {
        const checked = feedMap.get(f.id);
        if (!checked) return f;
        return {
          ...f,
          lastVideoId: checked.lastVideoId,
          lastPublishedAt: checked.lastPublishedAt,
          lastAlertMessageId: checked.lastAlertMessageId,
          lastCheckAt: checked.lastCheckAt,
          lastSuccessAt: checked.lastSuccessAt,
          lastError: checked.lastError,
          lastDurationMs: checked.lastDurationMs,
          youtubeChannelId: checked.youtubeChannelId
        };
      });
      current.health = ya.health;
      dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings(current);
      saveState();
    } catch (err) {
      const ya = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
      ya.health = {
        ...(ya.health || {}),
        lastCheckAt: new Date().toISOString(),
        lastDurationMs: Date.now() - checkStartedAt,
        lastError: err.message
      };
      dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings(ya);
      saveState();
      addLog('warn', `YouTube alert check failed: ${err.message}`);
    } finally {
      youtubeCheckInProgress = false;
    }
  }
  
  async function handleYouTubeRewardClaim(interaction) {
    const parts = String(interaction.customId || '').split(':');
    const feedId = parts[1] || '';
    const videoId = parts[2] || '';
    if (!feedId || !videoId) {
      await interaction.reply({ content: '❌ Invalid reward claim.', ephemeral: true });
      return;
    }
  
    const ya = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
    const feed = (ya.feeds || []).find(f => f.id === feedId);
    if (!feed) {
      await interaction.reply({ content: '❌ This reward feed no longer exists.', ephemeral: true });
      return;
    }
  
    const claimKey = `${interaction.user.id}:${feedId}:${videoId}`;
    ya.claims = (ya.claims && typeof ya.claims === 'object') ? ya.claims : {};
    if (ya.claims[claimKey]) {
      await interaction.reply({ content: 'ℹ️ You already claimed this reward.', ephemeral: true });
      return;
    }
  
    const now = Date.now();
    ya.claims[claimKey] = now;
  
    const userId = interaction.user.id;
    if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
  
    // Global reward chance check
    const rewardChance = Math.min(100, Math.max(0, parseInt(feed.rewardChance, 10) || 100));
    if (Math.random() * 100 >= rewardChance) {
      dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings({ ...ya, claims: ya.claims });
      saveState();
      await interaction.reply({ content: '🎲 No luck this time! Better luck next video.', ephemeral: true });
      return;
    }
  
    // XP reward with range support
    const xpMin = Math.max(0, parseInt(feed.rewardXpMin, 10) || parseInt(feed.rewardXp, 10) || 0);
    const xpMax = Math.max(xpMin, parseInt(feed.rewardXpMax, 10) || xpMin);
    const rewardXp = xpMin === xpMax ? xpMin : xpMin + Math.floor(Math.random() * (xpMax - xpMin + 1));
    const rewardMultiplier = Math.max(1, Number(feed.rewardMultiplier) || 1);
    const rewardDurationMinutes = Math.max(1, parseInt(feed.rewardDurationMinutes, 10) || 60);
    const rewardEndTime = now + rewardDurationMinutes * 60 * 1000;
  
    if (rewardXp > 0) {
      leveling[userId].xp = (parseInt(leveling[userId].xp, 10) || 0) + rewardXp;
    }
  
    if (rewardMultiplier > 1) {
      const currentMultiplier = Math.max(1, Number(leveling[userId].xpMultiplier) || 1);
      const currentEnd = Number(leveling[userId].xpMultiplierEndTime) || 0;
      leveling[userId].xpMultiplier = Math.max(currentMultiplier, rewardMultiplier);
      leveling[userId].xpMultiplierEndTime = Math.max(currentEnd, rewardEndTime);
    }
  
    // Role reward with independent chance
    let roleGranted = false;
    const rewardRoleChance = Math.min(100, Math.max(0, parseInt(feed.rewardRoleChance, 10) || 100));
    const roleDuration = Math.max(0, parseInt(feed.rewardRoleDuration, 10) || parseInt(feed.rewardDurationMinutes, 10) || 60);
  
    if (feed.rewardRoleId && interaction.guild && Math.random() * 100 < rewardRoleChance) {
      try {
        const member = interaction.member || await interaction.guild.members.fetch(interaction.user.id);
        await member.roles.add(feed.rewardRoleId).catch(() => null);
        roleGranted = true;
        if (roleDuration > 0) {
          setTimeout(async () => {
            try {
              const m = await interaction.guild.members.fetch(interaction.user.id);
              if (m && m.roles && m.roles.cache && m.roles.cache.has(feed.rewardRoleId)) {
                await m.roles.remove(feed.rewardRoleId).catch(() => null);
              }
            } catch (_err) {}
          }, roleDuration * 60 * 1000);
        }
      } catch (_err) {}
    }
  
    dashboardSettings.youtubeAlerts = normalizeYouTubeAlertsSettings({
      ...ya,
      claims: ya.claims
    });
    saveState();
  
    const bits = [];
    if (rewardXp > 0) bits.push(`+${rewardXp} XP${xpMin !== xpMax ? ` (${xpMin}–${xpMax} range)` : ''}`);
    if (rewardMultiplier > 1) bits.push(`${rewardMultiplier}x XP for ${rewardDurationMinutes} min`);
    if (roleGranted && feed.rewardRoleId) bits.push(`Role <@&${feed.rewardRoleId}> granted${roleDuration > 0 ? ` for ${roleDuration} min` : ''}`);
    else if (feed.rewardRoleId && !roleGranted) bits.push(`Role reward: not this time (${rewardRoleChance}% chance)`);
    const text = bits.length > 0 ? bits.join(' • ') : 'No rewards configured for this feed.';
    await interaction.reply({ content: `✅ Reward claimed: ${text}`, ephemeral: true });
  }
  
  client.once('ready', async () => {
    log('info', 'Discord', 'Ready event fired');
    addLog('info', 'Discord ready');
  
    // Load RPG worlds from file
    console.log('[Discord] Loading RPG worlds...');
    loadRPGWorlds();
    console.log('[Discord] RPG worlds loaded');
  
    // Cache all guild members for preview and other features
    try {
      const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
      if (guildId) {
        console.log('[Discord] Fetching guild...', guildId);
        const guild = await client.guilds.fetch(guildId);
        if (guild) {
          addLog('info', `Caching members for guild ${guild.name}...`);
          console.log('[Discord] Caching members...');
          await guild.members.fetch({ force: true });
          addLog('info', `Cached ${guild.members.cache.size} members`);
          console.log('[Discord] Cached', guild.members.cache.size, 'members');
          // Save to JSON for fast restarts and role sync without refetch
          fullMemberCacheSync(guild);
        }
      } else {
        console.log('[Discord] No GUILD_ID set, skipping member cache');
      }
    } catch (err) {
      addLog('error', `Failed to cache members: ${err.message}`);
      console.error('[Discord] Member cache error:', err.message);
    }
  
    // Non-Twitch background processes should always run
    log('info', 'Discord', 'Starting background processes...');
    setInterval(() => { if (giveaways.some(g => g.active && !g.paused)) checkGiveaways(); }, 30000);
    setInterval(() => { if (polls.some(p => p.active && p.endTime)) checkPolls(); }, 30000);
    setInterval(() => { if (reminders.some(r => r.active)) checkReminders(); }, 15000);
    if (!youtubeCheckInterval) {
      youtubeCheckInterval = setInterval(checkYouTubeAlerts, YOUTUBE_CHECK_INTERVAL_MS);
    }
    checkYouTubeAlerts().catch(err => addLog('warn', `Initial YouTube check failed: ${err.message}`));
    // New feature background tasks (tempBans/tempRoles checked via setInterval in their own sections above)
    log('info', 'Discord', 'Background processes started');
  
    // Refresh member cache every 6 hours (lightweight — JSON cache handles day-to-day)
    setInterval(async () => {
      try {
        const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
        if (guildId) {
          const guild = await client.guilds.fetch(guildId);
          if (guild) {
            await guild.members.fetch();
            fullMemberCacheSync(guild);
          }
        }
      } catch (err) {
        addLog('error', `Member cache refresh failed: ${err.message}`);
      }
    }, 6 * 60 * 60 * 1000);
  
    if (!schedule.nextStreamAt && !schedule.noStreamToday) {
      console.log('[Discord] Computing next scheduled stream...');
      computeNextScheduledStream();
      console.log('[Discord] Next stream computed');
    }
  
    console.log('[Discord] Initializing Twitch...');
    try {
      await ensureTwitchInitialized({ reloadFromEnv: false, forceBroadcasterRefresh: true });
      console.log('[Discord] Twitch initialized');
    } catch (err) {
      addLog('error', 'Startup initialization failed: ' + err.message);
      addLog('error', 'Check your .env file for: STREAMER_LOGIN, TWITCH_CLIENT_ID, TWITCH_ACCESS_TOKEN');
      console.error('[Discord] Twitch init failed:', err.message);
    }
  
    console.log('[Discord] Registering slash commands...');
    const rest = new REST({ version: '10' }).setToken(process.env.DISCORD_TOKEN);
  
    // 🌍 Global commands
    const globalCommands = [
      rpgBot.getSlashCommand(),
      rpgBot.getLeaderboardSlashCommand(),
      new SlashCommandBuilder()
        .setName('streamstatus')
        .setDescription('Shows current stream status')
        .toJSON(),
  
      new SlashCommandBuilder()
        .setName('lastlive')
        .setDescription('Shows last stream title and timestamp')
        .toJSON(),
  
      new SlashCommandBuilder()
        .setName('topgame')
        .setDescription('Shows most played game recently')
        .toJSON()
    ];
  
    try {
      await rest.put(
        Routes.applicationCommands(client.user.id),
        { body: globalCommands }
      );
      addLog('info', 'Global commands registered');
      console.log('[Discord] Global commands registered');
    } catch (err) {
      addLog('error', 'Global commands registration failed: ' + err.message);
      console.error('[Discord] Global commands error:', err.message);
    }
  
    console.log('[Discord] Registering guild commands...');
    // 🏠 Guild-only (admin / test)
    const guildCommands = [
      new SlashCommandBuilder().setName('cancelstream').setDescription("Cancels today's stream"),
      new SlashCommandBuilder().setName('alertsoff').setDescription('Disable alerts for today'),
      new SlashCommandBuilder().setName('alertson').setDescription('Enable alerts for today'),
      new SlashCommandBuilder().setName('testdelay').setDescription('Force delayed notification'),
      new SlashCommandBuilder().setName('streamhealth').setDescription('Internal stream state'),
  
      new SlashCommandBuilder()
        .setName('setschedule')
        .setDescription('Set weekly stream schedule')
        .addStringOption(o =>
          o.setName('time1').setDescription('HH:MM (24h)').setRequired(true)
        )
        .addStringOption(o =>
          o.setName('days1').setDescription('mon,tue,wed,thu,fri ...').setRequired(true)
        )
        .addChannelOption(o =>
          o.setName('channel').setDescription('Post schedule here').setRequired(true)
        )
        .addStringOption(o =>
          o.setName('time2').setDescription('Secondary time').setRequired(false)
        )
        .addStringOption(o =>
          o.setName('days2').setDescription('Secondary days').setRequired(false)
        ),
  
      new SlashCommandBuilder().setName('forcelive').setDescription('Force stream LIVE'),
      new SlashCommandBuilder().setName('forceoffline').setDescription('Force stream OFFLINE'),
      
      // NEW COMMANDS
      new SlashCommandBuilder().setName('help').setDescription('Show all available commands'),
      new SlashCommandBuilder().setName('stats').setDescription('View stream statistics'),
      new SlashCommandBuilder().setName('uptime').setDescription('Show bot uptime'),
      new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Make a community suggestion')
        .addStringOption(o => o.setName('suggestion').setDescription('Your suggestion').setRequired(true)),
      new SlashCommandBuilder()
        .setName('warn')
        .setDescription('Warn a user')
        .addUserOption(o => o.setName('user').setDescription('User to warn').setRequired(true))
        .addStringOption(o => o.setName('reason').setDescription('Reason for warning').setRequired(false)),
      new SlashCommandBuilder()
        .setName('warnings')
        .setDescription('Check warnings for a user')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(true)),
      new SlashCommandBuilder()
        .setName('setlivemessage')
        .setDescription('Set custom live announcement message')
        .addStringOption(o => o
          .setName('message')
          .setDescription('Message template (use {role} and {streamer} placeholders)')
          .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName('setmilestones')
        .setDescription('Set viewer milestone alerts')
        .addStringOption(o => o
          .setName('milestones')
          .setDescription('Comma-separated viewer counts: 100,250,500,1000')
          .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName('setofflinethreshold')
        .setDescription('Set how long stream can be offline before marking offline')
        .addIntegerOption(o => o
          .setName('seconds')
          .setDescription('Seconds to wait (default 120)')
          .setMinValue(1)
          .setMaxValue(600)
          .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName('setalertroles')
        .setDescription('Set which role gets pinged for different alerts')
        .addStringOption(o => o
          .setName('role_type')
          .setDescription('Alert type')
          .addChoices(
            { name: 'Live Alerts', value: 'liveAlert' },
            { name: 'Schedule Alerts', value: 'scheduleAlert' },
            { name: 'Suggestion Alerts', value: 'suggestionAlert' }
          )
          .setRequired(true)
        )
        .addRoleOption(o => o
          .setName('role')
          .setDescription('Role to ping')
          .setRequired(true)
        ),
      new SlashCommandBuilder()
        .setName('setlevelchannel')
        .setDescription('Set the channel for level-up notifications')
        .addChannelOption(o => o
          .setName('channel')
          .setDescription('Channel to post level-up alerts (leave empty to reset)')
          .setRequired(false)
        ),
      // Leveling
      new SlashCommandBuilder()
        .setName('rank')
        .setDescription('Check your or another user\'s rank')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),
      new SlashCommandBuilder()
        .setName('leaderboard')
        .setDescription('View the leveling leaderboard'),
      new SlashCommandBuilder()
        .setName('xp')
        .setDescription('Check your or another user\'s XP')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false)),
      new SlashCommandBuilder()
        .setName('addxp')
        .setDescription('Add XP to a user (Admin only)')
        .addUserOption(o => o.setName('user').setDescription('User to give XP to').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP to add').setMinValue(1).setRequired(true)),
      new SlashCommandBuilder()
        .setName('removexp')
        .setDescription('Remove XP from a user (Admin only)')
        .addUserOption(o => o.setName('user').setDescription('User to remove XP from').setRequired(true))
        .addIntegerOption(o => o.setName('amount').setDescription('Amount of XP to remove').setMinValue(1).setRequired(true)),
      new SlashCommandBuilder()
        .setName('setlevel')
        .setDescription('Set a user\'s level directly (Admin only)')
        .addUserOption(o => o.setName('user').setDescription('User to modify').setRequired(true))
        .addIntegerOption(o => o.setName('level').setDescription('New level').setMinValue(0).setRequired(true)),
      new SlashCommandBuilder()
        .setName('levelconfig')
        .setDescription('View current leveling configuration'),
      new SlashCommandBuilder()
        .setName('setxpmultiplier')
        .setDescription('Set XP multiplier (e.g., 2x for double XP event) (Admin only)')
        .addNumberOption(o => o.setName('multiplier').setDescription('Multiplier value (1 = normal, 2 = 2x)').setMinValue(0.5).setMaxValue(10).setRequired(true))
        .addIntegerOption(o => o.setName('hours').setDescription('Duration in hours (0 = disable)').setMinValue(0).setRequired(true)),
      new SlashCommandBuilder()
        .setName('prestige')
        .setDescription('Reset your level to gain prestige rank'),
      new SlashCommandBuilder()
        .setName('weekly')
        .setDescription('View the weekly leaderboard'),
      
      // Giveaways
      new SlashCommandBuilder()
        .setName('giveaway')
        .setDescription('Start a giveaway')
        .addStringOption(o => o.setName('prize').setDescription('Prize to give away').setRequired(true))
        .addIntegerOption(o => o.setName('winners').setDescription('Number of winners').setMinValue(1).setMaxValue(20).setRequired(true))
        .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setMinValue(1).setMaxValue(10080).setRequired(true))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(false)),
      new SlashCommandBuilder()
        .setName('giveawayend')
        .setDescription('End a giveaway early')
        .addStringOption(o => o.setName('giveaway_id').setDescription('Giveaway ID').setRequired(true)),
      new SlashCommandBuilder()
        .setName('giveawayreroll')
        .setDescription('Reroll giveaway winners')
        .addStringOption(o => o.setName('giveaway_id').setDescription('Giveaway ID').setRequired(true)),
      new SlashCommandBuilder()
        .setName('giveawaylist')
        .setDescription('List all active giveaways'),
      
      // Polls
      new SlashCommandBuilder()
        .setName('poll')
        .setDescription('Create a poll')
        .addStringOption(o => o.setName('question').setDescription('Poll question').setRequired(true))
        .addStringOption(o => o.setName('options').setDescription('Options separated by | (e.g., Yes|No|Maybe)').setRequired(true))
        .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes (0 = no end)').setMinValue(0).setMaxValue(10080).setRequired(false))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to post in').setRequired(false)),
      new SlashCommandBuilder()
        .setName('pollend')
        .setDescription('End a poll early')
        .addStringOption(o => o.setName('poll_id').setDescription('Poll ID').setRequired(true)),
      new SlashCommandBuilder()
        .setName('pollresults')
        .setDescription('View poll results')
        .addStringOption(o => o.setName('poll_id').setDescription('Poll ID').setRequired(true)),
      new SlashCommandBuilder()
        .setName('polllist')
        .setDescription('List all active polls'),
      
      // Reminders
      new SlashCommandBuilder()
        .setName('remind')
        .setDescription('Set a reminder')
        .addStringOption(o => o.setName('message').setDescription('What to remind you about').setRequired(true))
        .addIntegerOption(o => o.setName('time').setDescription('Time in minutes').setMinValue(1).setMaxValue(525600).setRequired(true))
        .addUserOption(o => o.setName('user').setDescription('User to remind (default: you)').setRequired(false))
        .addChannelOption(o => o.setName('channel').setDescription('Channel to send reminder in').setRequired(false)),
      new SlashCommandBuilder()
        .setName('reminders')
        .setDescription('List your active reminders'),
      new SlashCommandBuilder()
        .setName('cancelreminder')
        .setDescription('Cancel a reminder')
        .addStringOption(o => o.setName('reminder_id').setDescription('Reminder ID').setRequired(true)),
      
      // Custom Commands
      new SlashCommandBuilder()
        .setName('addcommand')
        .setDescription('Add a custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name (without !)').setRequired(true))
        .addStringOption(o => o.setName('response').setDescription('Command response').setRequired(true)),
      new SlashCommandBuilder()
        .setName('removecommand')
        .setDescription('Remove a custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true)),
      new SlashCommandBuilder()
        .setName('editcommand')
        .setDescription('Edit a custom command')
        .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true))
        .addStringOption(o => o.setName('response').setDescription('New response').setRequired(true)),
      new SlashCommandBuilder()
        .setName('cmd')
        .setDescription('Run a custom command (slash)')
        .addStringOption(o => o.setName('name').setDescription('Command name').setRequired(true)),
      new SlashCommandBuilder()
        .setName('commands')
        .setDescription('List all custom commands'),
      
      // Notification Filters
      new SlashCommandBuilder()
        .setName('addfilter')
        .setDescription('Add a notification filter (keywords to suppress)')
        .addStringOption(o => o.setName('keyword').setDescription('Keyword to filter').setRequired(true))
        .addStringOption(o => o.setName('type').setDescription('Filter type')
          .addChoices(
            { name: 'Title', value: 'title' },
            { name: 'Game', value: 'game' },
            { name: 'All', value: 'all' }
          )
          .setRequired(true)),
      new SlashCommandBuilder()
        .setName('removefilter')
        .setDescription('Remove a notification filter')
        .addStringOption(o => o.setName('filter_id').setDescription('Filter ID').setRequired(true)),
      new SlashCommandBuilder()
        .setName('filters')
        .setDescription('List all active notification filters'),
      
      // RPG Test Mode
      new SlashCommandBuilder()
        .setName('rpg-test-mode')
        .setDescription('Toggle RPG-only test mode (disable other bot features)'),
      
      // Dashboard/Admin
      new SlashCommandBuilder()
        .setName('dashboard')
        .setDescription('Open the RPG Dashboard (Admin only)'),
  
      // Pets
      new SlashCommandBuilder()
        .setName('pet')
        .setDescription('Manage server pets')
        .addSubcommand(sub =>
          sub.setName('add')
            .setDescription('Add a pet to the server collection')
            .addStringOption(o =>
              o.setName('pet')
                .setDescription('Search for a pet to add')
                .setRequired(true)
                .setAutocomplete(true))
            .addIntegerOption(o =>
              o.setName('quantity')
                .setDescription('How many to add (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25))
            )
        .addSubcommand(sub =>
          sub.setName('list')
            .setDescription('View all server pets'))
        .addSubcommand(sub =>
          sub.setName('remove')
            .setDescription('Remove a pet from the collection (Admin only)')
            .addStringOption(o =>
              o.setName('pet')
                .setDescription('Search for a pet to remove')
                .setRequired(true)
                .setAutocomplete(true))
            .addIntegerOption(o =>
              o.setName('quantity')
                .setDescription('How many to remove (default: 1)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(25))),
  
      // My Pets command
      new SlashCommandBuilder()
        .setName('mypets')
        .setDescription('View your pet contributions and pending submissions'),
  
      // Smart Bot AI
      new SlashCommandBuilder()
        .setName('ai')
        .setDescription('Configure the Smart Bot AI chat system')
        .addSubcommand(sub => sub
          .setName('toggle')
          .setDescription('Enable or disable the AI chat bot')
          .addBooleanOption(o => o.setName('enabled').setDescription('Enable or disable').setRequired(true)))
        .addSubcommand(sub => sub
          .setName('config')
          .setDescription('Configure AI settings')
          .addNumberOption(o => o.setName('reply_chance').setDescription('Reply chance 0-100% (supports decimals like 0.5)').setMinValue(0).setMaxValue(100))
          .addIntegerOption(o => o.setName('cooldown').setDescription('Cooldown between replies in seconds').setMinValue(5).setMaxValue(600))
          .addIntegerOption(o => o.setName('min_messages').setDescription('Min messages from others between replies').setMinValue(1).setMaxValue(50))
          .addStringOption(o => o.setName('personality').setDescription('Bot personality').addChoices(
            { name: 'Chill', value: 'chill' },
            { name: 'Hype', value: 'hype' },
            { name: 'Sarcastic', value: 'sarcastic' }
          )))
        .addSubcommand(sub => sub
          .setName('channel')
          .setDescription('Allow or block a channel for AI')
          .addChannelOption(o => o.setName('channel').setDescription('Channel to configure').setRequired(true))
          .addStringOption(o => o.setName('action').setDescription('Allow or block').addChoices(
            { name: 'Allow', value: 'allow' },
            { name: 'Block', value: 'block' },
            { name: 'Remove restriction', value: 'remove' }
          ).setRequired(true)))
        .addSubcommand(sub => sub
          .setName('stats')
          .setDescription('View AI chat bot statistics')),
  
      // AFK System
      new SlashCommandBuilder()
        .setName('afk')
        .setDescription('Set yourself as AFK')
        .addStringOption(o => o.setName('reason').setDescription('AFK reason').setRequired(false)),
  
      // Tempban
      new SlashCommandBuilder()
        .setName('tempban')
        .setDescription('Temporarily ban a user')
        .addUserOption(o => o.setName('user').setDescription('User to tempban').setRequired(true))
        .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(43200))
        .addStringOption(o => o.setName('reason').setDescription('Ban reason').setRequired(false)),
  
      // Temp role
      new SlashCommandBuilder()
        .setName('temprole')
        .setDescription('Assign a temporary role to a user')
        .addUserOption(o => o.setName('user').setDescription('Target user').setRequired(true))
        .addRoleOption(o => o.setName('role').setDescription('Role to assign').setRequired(true))
        .addIntegerOption(o => o.setName('duration').setDescription('Duration in minutes').setRequired(true).setMinValue(1).setMaxValue(43200)),
  
      // Suggestion
      new SlashCommandBuilder()
        .setName('suggest')
        .setDescription('Submit a suggestion')
        .addStringOption(o => o.setName('idea').setDescription('Your suggestion').setRequired(true)),
  
      // Rank card
      new SlashCommandBuilder()
        .setName('rank')
        .setDescription('View your rank card')
        .addUserOption(o => o.setName('user').setDescription('User to check').setRequired(false))
  
    ].map(c => c.toJSON());
  
    const guildId = process.env.GUILD_ID || process.env.DISCORD_GUILD_ID;
    if (!guildId) {
      addLog('error', 'No guild ID configured; slash commands not registered');
      return;
    }
  
    try {
      await rest.put(
        Routes.applicationGuildCommands(client.user.id, guildId),
        { body: guildCommands }
      );
      addLog('info', `Guild commands registered (${guildCommands.length} commands)`);
      console.log(`[Discord] Guild commands registered (${guildCommands.length} commands)`);
    } catch (err) {
      addLog('error', 'Guild commands registration failed: ' + err.message);
      console.error('[Discord] Guild commands error:', err);
    }
  
    console.log('[Discord] ✅ Bot fully ready and operational!');
    addLog('info', '✅ Bot fully ready and operational');
  });
  
  // Handle new members joining
  client.on('guildMemberAdd', async (member) => {
    // Update member cache JSON
    try { updateMemberCache(member, 'add'); } catch(e) { /* silent */ }
    trackMemberGrowth('join');

    // Feature hooks: restore roles on rejoin, milestone, quarantine, retention, invite tracking, anti-alt
    if (featureHooks) {
      await featureHooks.restoreRolesOnJoin(member);
      await featureHooks.checkMemberMilestone(member.guild);
      await featureHooks.quarantineMember(member);
      featureHooks.trackMemberJoin(member.id);
      await featureHooks.trackMemberInvite(member);
      await featureHooks.checkNewMemberForAlt(member);
    }

    try {
      const hasAutoRoles = (Array.isArray(welcomeSettings.autoRoles) && welcomeSettings.autoRoles.length > 0) ||
                           (Array.isArray(welcomeSettings.autoRoleConditions) && welcomeSettings.autoRoleConditions.length > 0);
      if (!welcomeSettings.enabled && !hasAutoRoles) return;
  
      // Anti-spam check: skip if user already has certain roles (re-join)
      if (welcomeSettings.antiSpamEnabled && welcomeSettings.antiSpamRoles?.length > 0) {
        const userRoleIds = member.roles.cache.map(r => r.id);
        const hasAntiSpamRole = welcomeSettings.antiSpamRoles.some(rid => userRoleIds.includes(rid));
        if (hasAntiSpamRole) {
          addLog('info', `Skipped welcome for ${member.user.tag} (anti-spam: has existing role)`);
          // Still do auto-roles though
        } else {
          await sendWelcomeMessage(member);
        }
      } else {
        await sendWelcomeMessage(member);
      }
  
      // Auto-assign roles with conditions
      if (hasAutoRoles) {
        const botMember = await member.guild.members.fetchMe().catch(() => null);
        if (botMember && !botMember.permissions.has('ManageRoles')) {
          addLog('error', 'Auto-role failed: Bot lacks Manage Roles permission');
          return;
        }
  
        const accountAgeDays = member.user.createdAt 
          ? Math.floor((Date.now() - member.user.createdAt.getTime()) / (1000 * 60 * 60 * 24)) 
          : 999;
  
        const rolesToAssign = welcomeSettings.autoRoleConditions?.length > 0 
          ? welcomeSettings.autoRoleConditions 
          : (welcomeSettings.autoRoles || []).map(id => ({ roleId: id, condition: 'always' }));
  
        for (const roleConfig of rolesToAssign) {
          const roleId = roleConfig.roleId || roleConfig;
          const condition = roleConfig.condition || 'always';
          const minAge = roleConfig.minAccountAge || 7;
  
          // Check condition
          if (condition === 'accountAge' && accountAgeDays < minAge) {
            addLog('info', `Skipped role ${roleId} for ${member.user.tag} (account age ${accountAgeDays}d < ${minAge}d)`);
            continue;
          }
  
          try {
            const role = await member.guild.roles.fetch(roleId);
            if (role) {
              if (botMember && role.position >= botMember.roles.highest.position) {
                addLog('error', `Auto-role failed: Role ${role.name} is higher than bot role`);
                continue;
              }
              await member.roles.add(role);
              addLog('info', `Assigned role ${role.name} to ${member.user.tag}`);
            }
          } catch (roleErr) {
            addLog('error', `Failed to assign role ${roleId}: ${roleErr.message}`);
          }
        }
      }
    } catch (err) {
      addLog('error', `Failed to process new member ${member.user.tag}: ${err.message}`);
    }
  });
  
  // Helper function to send welcome message
  async function sendWelcomeMessage(member) {
    if (!welcomeSettings.enabled) return;
  
    let channel = null;
    if (welcomeSettings.channelId) {
      channel = await member.guild.channels.fetch(welcomeSettings.channelId).catch(() => null);
      if (!channel || !channel.isTextBased()) {
        addLog('error', 'Welcome channel not found or not a text channel');
        channel = null;
      }
    }
  
    if (!channel) return;
  
    // Prepare replacement data
    const memberCount = member.guild.memberCount;
    const joinTime = new Date().toLocaleString();
    const avatarUrl = member.user.displayAvatarURL({ dynamic: true, size: 256 });
  
    const replaceVars = (text) => {
      if (!text) return text;
      return text
        .replace(/{user}/g, `<@${member.id}>`)
        .replace(/{mention}/g, `<@${member.id}>`)
        .replace(/{username}/g, member.user.username)
        .replace(/{server}/g, member.guild.name)
        .replace(/{count}/g, memberCount.toLocaleString())
        .replace(/{position}/g, memberCount.toString())
        .replace(/{time}/g, joinTime)
        .replace(/{avatar}/g, avatarUrl);
    };
  
    // Determine which message to send (single, random, or cycle)
    let messageToSend;
    if ((welcomeSettings.messageMode === 'random' || welcomeSettings.messageMode === 'rotation') && welcomeSettings.messages?.length > 0) {
      // Filter by role if messages have roleId
      const memberRoleIds = member.roles.cache.map(r => r.id);
      const eligible = welcomeSettings.messages.filter(m => {
        if (!m.roleId) return true;
        return memberRoleIds.includes(m.roleId);
      });
      const pool = eligible.length > 0 ? eligible : welcomeSettings.messages.filter(m => !m.roleId);
      if (pool.length > 0) {
        // Weighted random selection
        const totalWeight = pool.reduce((sum, m) => sum + (m.weight || 1), 0);
        let rand = Math.random() * totalWeight;
        let picked = pool[0];
        for (const m of pool) {
          rand -= (m.weight || 1);
          if (rand <= 0) { picked = m; break; }
        }
        messageToSend = picked.text;
      } else {
        messageToSend = welcomeSettings.message;
      }
    } else if (welcomeSettings.messageMode === 'cycle' && welcomeSettings.messages?.length > 0) {
      const cycleIndex = welcomeSettings.cycleIndex || 0;
      messageToSend = welcomeSettings.messages[cycleIndex % welcomeSettings.messages.length]?.text;
      welcomeSettings.cycleIndex = (cycleIndex + 1) % welcomeSettings.messages.length;
      saveState();
    } else {
      messageToSend = welcomeSettings.message;
    }
  
    try {
      if (welcomeSettings.useEmbed) {
        // Send embed
        const embed = new EmbedBuilder()
          .setColor(parseInt((welcomeSettings.embedColor || '#9146ff').replace('#', ''), 16));
  
        if (welcomeSettings.embedTitle) {
          embed.setTitle(replaceVars(welcomeSettings.embedTitle));
        }
        if (welcomeSettings.embedDescription) {
          embed.setDescription(replaceVars(welcomeSettings.embedDescription));
        }
        if (welcomeSettings.embedFooter) {
          embed.setFooter({ text: replaceVars(welcomeSettings.embedFooter) });
        }
        if (welcomeSettings.embedThumbnail === 'avatar') {
          embed.setThumbnail(avatarUrl);
        } else if (welcomeSettings.embedThumbnail === 'custom' && welcomeSettings.embedThumbnailUrl) {
          embed.setThumbnail(welcomeSettings.embedThumbnailUrl);
        }
        if (welcomeSettings.embedImage) {
          embed.setImage(welcomeSettings.embedImage);
        }
        if (welcomeSettings.embedFields?.length > 0) {
          for (const field of welcomeSettings.embedFields) {
            if (field.name && field.value) {
              embed.addFields({ 
                name: replaceVars(field.name), 
                value: replaceVars(field.value), 
                inline: field.inline || false 
              });
            }
          }
        }
  
        embed.setTimestamp();
        await channel.send({ embeds: [embed] });
      } else {
        // Send plain text
        const message = replaceVars(messageToSend || 'Welcome {user} to {server}!');
        await channel.send(message);
      }
      addLog('info', `Sent welcome message to ${member.user.tag}`);
    } catch (err) {
      addLog('error', `Failed to send welcome message: ${err.message}`);
    }
  
    // Send DM if enabled
    if (welcomeSettings.dmEnabled) {
      try {
        const dmChannel = await member.user.createDM();
        
        if (welcomeSettings.dmUseEmbed && welcomeSettings.useEmbed) {
          // Send same embed style to DM
          const dmEmbed = new EmbedBuilder()
            .setColor(parseInt((welcomeSettings.embedColor || '#9146ff').replace('#', ''), 16));
  
          if (welcomeSettings.embedTitle) {
            dmEmbed.setTitle(replaceVars(welcomeSettings.embedTitle));
          }
          if (welcomeSettings.embedDescription) {
            dmEmbed.setDescription(replaceVars(welcomeSettings.embedDescription));
          }
          if (welcomeSettings.embedFooter) {
            dmEmbed.setFooter({ text: replaceVars(welcomeSettings.embedFooter) });
          }
          dmEmbed.setTimestamp();
  
          await dmChannel.send({ embeds: [dmEmbed] });
        } else {
          // Send plain DM message
          const dmText = replaceVars(welcomeSettings.dmMessage || welcomeSettings.message || 'Welcome to {server}!');
          await dmChannel.send(dmText);
        }
        addLog('info', `Sent welcome DM to ${member.user.tag}`);
      } catch (dmErr) {
        addLog('warn', `Could not DM ${member.user.tag}: ${dmErr.message}`);
      }
    }
  }
  
  client.on('guildMemberAdd', async (member) => {
    try {
      if (!auditLogSettings?.enabled || !auditLogSettings?.logMemberJoins) return;
      const roleIds = getMemberRoleIds(member);
      if (isExcludedBySettings({ userId: member.id, roleIds })) return;
      const createdAt = member.user?.createdAt ? new Date(member.user.createdAt) : null;
      const ageDays = createdAt ? Math.floor((Date.now() - createdAt.getTime()) / (1000 * 60 * 60 * 24)) : null;
      const warnNew = auditLogSettings.warnNewAccounts && ageDays !== null && ageDays < (auditLogSettings.newAccountThresholdDays || 7);
      const joinPosition = auditLogSettings.logJoinPosition ? member.guild.memberCount : null;
  
      const joinColor = warnNew 
        ? parseInt((auditLogSettings.eventColors?.timeout || '#E67E22').replace('#', ''), 16)
        : parseInt((auditLogSettings.eventColors?.join || '#2ECC71').replace('#', ''), 16);
  
      const embed = new EmbedBuilder()
        .setColor(joinColor)
        .setTitle(warnNew ? '⚠️ New Member (New Account)' : '✅ Member Joined')
        .setDescription(`<@${member.id}> joined the server`)
        .addFields(
          { name: 'User', value: `${member.user.tag} (${member.id})` }
        )
        .setTimestamp();
  
      if (createdAt) {
        embed.addFields({ name: 'Account Created', value: createdAt.toISOString() + (ageDays !== null ? ` (${ageDays}d ago)` : '') });
      }
  
      if (joinPosition !== null) {
        embed.addFields({ name: 'Join Position', value: `#${joinPosition}`, inline: true });
      }
  
      await sendAuditLog({ embeds: [embed], eventType: 'logMemberJoins' });
  
      addAuditLogEntry({
        type: warnNew ? 'warn' : 'info',
        action: 'member_join',
        userId: member.id,
        userTag: member.user.tag,
        details: { summary: joinPosition !== null ? `Join #${joinPosition}` : '', accountAgeDays: ageDays }
      });
  
      // Send critical event DM for new accounts
      if (warnNew) {
        await sendCriticalEventDM('newAccounts', {
          summary: `New account joined: ${member.user.tag} (${ageDays} days old)`,
          userId: member.id,
          userTag: member.user.tag
        });
      }
  
      if (member.user?.bot && auditLogSettings.logIntegrations) {
        const botEmbed = new EmbedBuilder()
          .setColor(0x7289DA)
          .setTitle('🤖 Bot Added')
          .setDescription(`<@${member.id}> was added to the server`)
          .setTimestamp();
        await sendAuditLog({ embeds: [botEmbed], eventType: 'logIntegrations' });
        addAuditLogEntry({
          type: 'info',
          action: 'integration_update',
          userId: member.id,
          userTag: member.user.tag,
          details: { summary: 'Bot added' }
        });
  
        // Send critical event DM for bot changes
        await sendCriticalEventDM('botChanges', {
          summary: `Bot added: ${member.user.tag}`,
          userId: member.id,
          userTag: member.user.tag
        });
      }
    } catch (err) {
      addLog('error', `Member join log failed: ${err.message}`);
    }
  });
  
  // Goodbye message handler
  client.on('guildMemberRemove', async (member) => {
    // Update member cache JSON
    trackMemberGrowth('leave');

    // Feature hooks: save roles on leave, retention tracking
    if (featureHooks) {
      featureHooks.saveRolesOnLeave(member);
      featureHooks.trackMemberLeave(member.id);
    }

    try { updateMemberCache(member, 'remove'); } catch(e) { /* silent */ }
    try {
      if (!welcomeSettings.goodbyeEnabled) return;
  
      let channel = null;
      const channelId = welcomeSettings.goodbyeChannelId || welcomeSettings.channelId;
      if (channelId) {
        channel = await member.guild.channels.fetch(channelId).catch(() => null);
        if (!channel || !channel.isTextBased()) {
          addLog('error', 'Goodbye channel not found or not a text channel');
          return;
        }
      }
  
      if (!channel) return;
  
      // Prepare replacement data
      const memberCount = member.guild.memberCount;
      const leaveTime = new Date().toLocaleString();
      const avatarUrl = member.user?.displayAvatarURL({ dynamic: true, size: 256 }) || '';
  
      const replaceVars = (text) => {
        if (!text) return text;
        return text
          .replace(/{user}/g, member.user?.tag || 'Unknown')
          .replace(/{mention}/g, member.user?.tag || 'Unknown')
          .replace(/{username}/g, member.user?.username || 'Unknown')
          .replace(/{server}/g, member.guild.name)
          .replace(/{count}/g, memberCount.toLocaleString())
          .replace(/{position}/g, memberCount.toString())
          .replace(/{time}/g, leaveTime)
          .replace(/{avatar}/g, avatarUrl);
      };
  
      // Determine which message to send
      let messageToSend;
      if (welcomeSettings.goodbyeMessageMode === 'random' && welcomeSettings.goodbyeMessages?.length > 0) {
        const randomIndex = Math.floor(Math.random() * welcomeSettings.goodbyeMessages.length);
        messageToSend = welcomeSettings.goodbyeMessages[randomIndex]?.text;
      } else {
        messageToSend = welcomeSettings.goodbyeMessage;
      }
  
      if (welcomeSettings.goodbyeUseEmbed) {
        // Send embed
        const embed = new EmbedBuilder()
          .setColor(parseInt((welcomeSettings.goodbyeEmbedColor || '#E74C3C').replace('#', ''), 16));
  
        if (welcomeSettings.goodbyeEmbedTitle) {
          embed.setTitle(replaceVars(welcomeSettings.goodbyeEmbedTitle));
        }
        if (welcomeSettings.goodbyeEmbedDescription) {
          embed.setDescription(replaceVars(welcomeSettings.goodbyeEmbedDescription));
        }
        if (welcomeSettings.goodbyeEmbedFooter) {
          embed.setFooter({ text: replaceVars(welcomeSettings.goodbyeEmbedFooter) });
        }
        if (welcomeSettings.goodbyeEmbedThumbnail === 'avatar' && avatarUrl) {
          embed.setThumbnail(avatarUrl);
        } else if (welcomeSettings.goodbyeEmbedThumbnail === 'custom' && welcomeSettings.goodbyeEmbedThumbnailUrl) {
          embed.setThumbnail(welcomeSettings.goodbyeEmbedThumbnailUrl);
        }
        if (welcomeSettings.goodbyeEmbedImage) {
          embed.setImage(welcomeSettings.goodbyeEmbedImage);
        }
  
        embed.setTimestamp();
        await channel.send({ embeds: [embed] });
      } else {
        // Send plain text
        const message = replaceVars(messageToSend || 'Goodbye {username}! 👋');
        await channel.send(message);
      }
  
      addLog('info', `Sent goodbye message for ${member.user?.tag || 'Unknown'}`);
    } catch (err) {
      addLog('error', `Failed to send goodbye message: ${err.message}`);
    }
  });
  
  client.on('guildMemberRemove', async (member) => {
    try {
      if (!auditLogSettings?.enabled || !auditLogSettings?.logMemberLeaves) return;
      const roleIds = getMemberRoleIds(member);
      if (isExcludedBySettings({ userId: member.id, roleIds })) return;
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('👋 Member Left')
        .setDescription(`${member.user?.tag || 'Unknown user'} left the server`)
        .addFields({ name: 'User ID', value: member.id })
        .setTimestamp();
  
      await sendAuditLog({ embeds: [embed] });
  
      addAuditLogEntry({
        type: 'info',
        action: 'member_leave',
        userId: member.id,
        userTag: member.user?.tag || null,
        details: { summary: 'Member left' }
      });
  
      if (member.user?.bot && auditLogSettings.logIntegrations) {
        const botEmbed = new EmbedBuilder()
          .setColor(0x99AAB5)
          .setTitle('🤖 Bot Removed')
          .setDescription(`${member.user?.tag || 'Unknown bot'} removed from the server`)
          .setTimestamp();
        await sendAuditLog({ embeds: [botEmbed] });
        addAuditLogEntry({
          type: 'info',
          action: 'integration_update',
          userId: member.id,
          userTag: member.user?.tag || null,
          details: { summary: 'Bot removed' }
        });
      }
    } catch (err) {
      addLog('error', `Member leave log failed: ${err.message}`);
    }
  });
  
  // Member log events
  client.on('messageUpdate', async (oldMessage, newMessage) => {
    try {
      if (!auditLogSettings?.enabled) return;
      if (newMessage?.partial) newMessage = await newMessage.fetch();
      if (oldMessage?.partial) oldMessage = await oldMessage.fetch();
      if (!newMessage?.guild) return;
      if (newMessage.author?.bot) return;
  
      const roleIds = getMemberRoleIds(newMessage.member);
      if (isExcludedBySettings({ userId: newMessage.author?.id, channelId: newMessage.channel?.id, roleIds })) return;
  
      if (auditLogSettings.logMessagePins && oldMessage?.pinned !== newMessage?.pinned) {
        const pinned = newMessage.pinned;
        const embed = new EmbedBuilder()
          .setColor(pinned ? 0xF1C40F : 0x95A5A6)
          .setTitle(pinned ? '📌 Message Pinned' : '📌 Message Unpinned')
          .setDescription(`<@${newMessage.author.id}> ${pinned ? 'pinned' : 'unpinned'} a message in <#${newMessage.channel.id}>`)
          .setTimestamp();
  
        if (newMessage.url) {
          embed.addFields({ name: 'Message Link', value: newMessage.url });
        }
  
        await sendAuditLog({ embeds: [embed] });
  
        addAuditLogEntry({
          type: 'info',
          action: pinned ? 'message_pin' : 'message_unpin',
          userId: newMessage.author.id,
          userTag: newMessage.author.tag,
          channelId: newMessage.channel.id,
          details: { summary: pinned ? 'Pinned message' : 'Unpinned message' }
        });
      }
  
      if (!auditLogSettings.logMessageEdits) return;
  
      const before = oldMessage?.content ?? '';
      const after = newMessage?.content ?? '';
      if (before === after) return;
  
      const embed = new EmbedBuilder()
        .setColor(0xF1C40F)
        .setTitle('✏️ Message Edited')
        .setDescription(`<@${newMessage.author.id}> edited a message in <#${newMessage.channel.id}>`)
        .addFields(
          { name: 'Before', value: truncateLogText(before || '*empty*', 900) },
          { name: 'After', value: truncateLogText(after || '*empty*', 900) }
        )
        .setTimestamp();
  
      if (newMessage.url) {
        embed.addFields({ name: 'Message Link', value: newMessage.url });
      }
  
      await sendAuditLog({ embeds: [embed] });
  
      addAuditLogEntry({
        type: 'info',
        action: 'message_edit',
        userId: newMessage.author.id,
        userTag: newMessage.author.tag,
        channelId: newMessage.channel.id,
        details: { summary: 'Message edited' }
      });
    } catch (err) {
      addLog('error', `Message edit log failed: ${err.message}`);
    }
  });
  
  client.on('messageDelete', async (message) => {
    try {
      if (!auditLogSettings?.enabled || !auditLogSettings.logMessageDeletes) return;
      if (message?.partial) message = await message.fetch().catch(() => message);
      if (!message?.guild) return;
      if (message.author?.bot) return;
  
      const roleIds = getMemberRoleIds(message.member);
      if (isExcludedBySettings({ userId: message.author?.id, channelId: message.channel?.id, roleIds })) return;
  
      const executor = await getAuditExecutor(message.guild, AuditLogEvent.MessageDelete, message.author?.id);
  
      const embed = new EmbedBuilder()
        .setColor(0xE74C3C)
        .setTitle('🗑️ Message Deleted')
        .setDescription(`A message by <@${message.author?.id || 'unknown'}> was deleted in <#${message.channel?.id}>`)
        .setTimestamp();
  
      if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
      if (executor?.reason) embed.addFields({ name: 'Reason', value: executor.reason });
  
      const content = message.content ? truncateLogText(message.content, 900) : '*empty or embed*';
      embed.addFields({ name: 'Content', value: content });
  
      await sendAuditLog({ embeds: [embed] });
  
      addAuditLogEntry({
        type: 'info',
        action: 'message_delete',
        userId: message.author?.id || null,
        userTag: message.author?.tag || null,
        channelId: message.channel?.id || null,
        executorId: executor?.id || null,
        executorTag: executor?.tag || null,
        details: { summary: 'Message deleted' }
      });
    } catch (err) {
      addLog('error', `Message delete log failed: ${err.message}`);
    }
  });
  
  client.on('messageDeleteBulk', async (messages) => {
    try {
      if (!auditLogSettings?.enabled || !auditLogSettings.logMessageBulkDeletes) return;
      const first = messages?.first?.();
      if (!first?.guild) return;
  
      const channelId = first.channel?.id;
      if (isExcludedBySettings({ channelId })) return;
  
      const executor = await getAuditExecutor(first.guild, AuditLogEvent.MessageBulkDelete, channelId);
      const count = messages?.size || 0;
  
      const embed = new EmbedBuilder()
        .setColor(0xC0392B)
        .setTitle('🧹 Bulk Messages Deleted')
        .setDescription(`${count} messages deleted in <#${channelId}>`)
        .setTimestamp();
  
      if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
      if (executor?.reason) embed.addFields({ name: 'Reason', value: executor.reason });
  
      await sendAuditLog({ embeds: [embed] });
  
      addAuditLogEntry({
        type: 'info',
        action: 'message_bulk_delete',
        channelId: channelId || null,
        executorId: executor?.id || null,
        executorTag: executor?.tag || null,
        details: { summary: `${count} messages deleted` }
      });
    } catch (err) {
      addLog('error', `Bulk message delete log failed: ${err.message}`);
    }
  });
  
  client.on('userUpdate', async (oldUser, newUser) => {
    try {
      if (!auditLogSettings?.enabled) return;
      if (isExcludedBySettings({ userId: newUser.id })) return;
  
      if (auditLogSettings.logUsernameChanges && oldUser.username !== newUser.username) {
        const embed = new EmbedBuilder()
          .setColor(0x3498DB)
          .setTitle('📝 Username Changed')
          .setDescription(`<@${newUser.id}> changed their username`)
          .addFields(
            { name: 'Before', value: oldUser.username || '*unknown*' },
            { name: 'After', value: newUser.username || '*unknown*' }
          )
          .setTimestamp();
        await sendAuditLog({ embeds: [embed] });
  
        addAuditLogEntry({
          type: 'info',
          action: 'username_change',
          userId: newUser.id,
          userTag: newUser.tag || newUser.username,
          details: { summary: `${oldUser.username || 'unknown'} → ${newUser.username || 'unknown'}` }
        });
      }
  
      if (auditLogSettings.logAvatarChanges && oldUser.avatar !== newUser.avatar) {
        const embed = new EmbedBuilder()
          .setColor(0x9B59B6)
          .setTitle('🖼️ Avatar Changed')
          .setDescription(`<@${newUser.id}> changed their avatar`)
          .setThumbnail(newUser.displayAvatarURL({ size: 256 }))
          .setTimestamp();
        await sendAuditLog({ embeds: [embed] });
  
        addAuditLogEntry({
          type: 'info',
          action: 'avatar_change',
          userId: newUser.id,
          userTag: newUser.tag || newUser.username,
          details: { summary: 'Avatar updated' }
        });
      }
    } catch (err) {
      addLog('error', `User update log failed: ${err.message}`);
    }
  });
  
  client.on('guildMemberUpdate', async (oldMember, newMember) => {
    // Update member cache JSON on role/name changes
    try { updateMemberCache(newMember, 'update'); } catch(e) { /* silent */ }
    try {
      if (!auditLogSettings?.enabled) return;
      if (newMember.user?.bot) return;
      const roleIds = getMemberRoleIds(newMember);
      if (isExcludedBySettings({ userId: newMember.id, roleIds })) return;
  
      if (auditLogSettings.logMemberTimeouts) {
        const oldTimeout = oldMember.communicationDisabledUntilTimestamp || null;
        const newTimeout = newMember.communicationDisabledUntilTimestamp || null;
  
        if (oldTimeout !== newTimeout) {
          const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
          if (newTimeout && (!oldTimeout || newTimeout > Date.now())) {
            const mins = Math.max(1, Math.round((newTimeout - Date.now()) / 60000));
            const embed = new EmbedBuilder()
              .setColor(0xE67E22)
              .setTitle('⏱️ Member Timed Out')
              .setDescription(`<@${newMember.id}> was timed out`)
              .addFields({ name: 'Duration', value: `${mins} min` })
              .setTimestamp();
            if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
            if (executor?.reason) embed.addFields({ name: 'Reason', value: executor.reason });
            await sendAuditLog({ embeds: [embed] });
  
            addAuditLogEntry({
              type: 'warn',
              action: 'member_timeout',
              userId: newMember.id,
              userTag: newMember.user.tag,
              executorId: executor?.id || null,
              executorTag: executor?.tag || null,
              details: { summary: `Timeout ${mins} min` }
            });
  
            // Track in moderation.json so it shows in the moderation cases tab
            try {
              const modData = loadJSON(MODERATION_PATH, { warnings: [], cases: [] });
              modData.cases = modData.cases || [];
              modData.cases.push({
                type: 'timeout', id: crypto.randomUUID(), userId: newMember.id,
                duration: mins, reason: executor?.reason || 'External timeout',
                moderator: executor?.tag || 'Discord (external)', ts: Date.now(), external: true
              });
              saveJSON(MODERATION_PATH, modData);
            } catch (e) { addLog('error', `Failed to track external timeout: ${e.message}`); }
          } else if (oldTimeout && (!newTimeout || newTimeout < Date.now())) {
            const embed = new EmbedBuilder()
              .setColor(0x2ECC71)
              .setTitle('✅ Timeout Ended')
              .setDescription(`<@${newMember.id}>'s timeout expired or was removed`)
              .setTimestamp();
            if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
            if (executor?.reason) embed.addFields({ name: 'Reason', value: executor.reason });
            await sendAuditLog({ embeds: [embed] });
  
            addAuditLogEntry({
              type: 'info',
              action: 'member_timeout_expired',
              userId: newMember.id,
              userTag: newMember.user.tag,
              executorId: executor?.id || null,
              executorTag: executor?.tag || null,
              details: { summary: 'Timeout ended' }
            });
          }
        }
      }
  
      if (auditLogSettings.logMemberMutes && Array.isArray(auditLogSettings.muteRoleIds) && auditLogSettings.muteRoleIds.length) {
        const oldRoles = new Set(oldMember.roles.cache.map(r => r.id));
        const newRoles = new Set(newMember.roles.cache.map(r => r.id));
        const muteIds = new Set(auditLogSettings.muteRoleIds);
  
        const addedMute = [...newRoles].some(id => muteIds.has(id) && !oldRoles.has(id));
        const removedMute = [...oldRoles].some(id => muteIds.has(id) && !newRoles.has(id));
  
        if (addedMute || removedMute) {
          const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
          const embed = new EmbedBuilder()
            .setColor(addedMute ? 0xE74C3C : 0x2ECC71)
            .setTitle(addedMute ? '🔇 Member Muted' : '🔊 Member Unmuted')
            .setDescription(`<@${newMember.id}> ${addedMute ? 'was muted' : 'was unmuted'}`)
            .setTimestamp();
          if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
          if (executor?.reason) embed.addFields({ name: 'Reason', value: executor.reason });
          await sendAuditLog({ embeds: [embed] });
  
          addAuditLogEntry({
            type: addedMute ? 'warn' : 'info',
            action: addedMute ? 'member_mute' : 'member_unmute',
            userId: newMember.id,
            userTag: newMember.user.tag,
            executorId: executor?.id || null,
            executorTag: executor?.tag || null,
            details: { summary: addedMute ? 'Mute role added' : 'Mute role removed' }
          });
        }
      }
  
      if (auditLogSettings.logMemberBoosts) {
        const oldBoost = oldMember.premiumSinceTimestamp || null;
        const newBoost = newMember.premiumSinceTimestamp || null;
        if (!oldBoost && newBoost) {
          const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('💜 Server Boosted')
            .setDescription(`<@${newMember.id}> started boosting the server`)
            .setTimestamp();
          await sendAuditLog({ embeds: [embed] });
  
          addAuditLogEntry({
            type: 'info',
            action: 'member_boost',
            userId: newMember.id,
            userTag: newMember.user.tag,
            details: { summary: 'Boost started' }
          });
  
          // ========== BOOSTER AUTO-ROLE ==========
          if (boosterAutoRoles.length > 0) {
            for (const roleId of boosterAutoRoles) {
              try {
                await newMember.roles.add(roleId, 'Booster auto-role');
                addLog('info', `Booster auto-role ${roleId} added to ${newMember.user.tag}`);
              } catch (e) {
                addLog('error', `Failed to add booster auto-role ${roleId}: ${e.message}`);
              }
            }
          }
  
        } else if (oldBoost && !newBoost) {
          const embed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('💔 Boost Ended')
            .setDescription(`<@${newMember.id}> stopped boosting the server`)
            .setTimestamp();
          await sendAuditLog({ embeds: [embed] });
  
          addAuditLogEntry({
            type: 'info',
            action: 'member_boost',
            userId: newMember.id,
            userTag: newMember.user.tag,
            details: { summary: 'Boost ended' }
          });
  
          // ========== BOOSTER AUTO-ROLE REMOVAL ==========
          if (boosterAutoRoles.length > 0) {
            for (const roleId of boosterAutoRoles) {
              try {
                if (newMember.roles.cache.has(roleId)) {
                  await newMember.roles.remove(roleId, 'Boost ended — removing auto-role');
                  addLog('info', `Booster auto-role ${roleId} removed from ${newMember.user.tag} (boost ended)`);
                }
              } catch (e) {
                addLog('error', `Failed to remove booster auto-role ${roleId}: ${e.message}`);
              }
            }
          }
        }
      }
  
      if (auditLogSettings.logNicknameChanges) {
        const oldNick = oldMember.nickname || '';
        const newNick = newMember.nickname || '';
        if (oldNick !== newNick) {
          const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberUpdate, newMember.id);
          const embed = new EmbedBuilder()
            .setColor(0x2ECC71)
            .setTitle('🔤 Nickname Changed')
            .setDescription(`<@${newMember.id}> changed their nickname`)
            .addFields(
              { name: 'Before', value: oldNick || '*none*' },
              { name: 'After', value: newNick || '*none*' }
            )
            .setTimestamp();
  
          if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
          await sendAuditLog({ embeds: [embed] });
  
          addAuditLogEntry({
            type: 'info',
            action: 'nickname_change',
            userId: newMember.id,
            userTag: newMember.user.tag,
            executorId: executor?.id || null,
            executorTag: executor?.tag || null,
            details: { summary: `${oldNick || 'none'} → ${newNick || 'none'}` }
          });
        }
      }
  
      if (auditLogSettings.logRoleChanges) {
        const oldRoles = new Set(oldMember.roles.cache.map(r => r.id));
        const newRoles = new Set(newMember.roles.cache.map(r => r.id));
  
        const added = [...newRoles].filter(id => !oldRoles.has(id));
        const removed = [...oldRoles].filter(id => !newRoles.has(id));
  
        if (added.length || removed.length) {
          const executor = await getAuditExecutor(newMember.guild, AuditLogEvent.MemberRoleUpdate, newMember.id);
          const embed = new EmbedBuilder()
            .setColor(0x9B59B6)
            .setTitle('🧩 Roles Updated')
            .setDescription(`<@${newMember.id}> roles changed`)
            .addFields(
              { name: 'Added', value: added.length ? added.map(id => `<@&${id}>`).join(' ') : 'None' },
              { name: 'Removed', value: removed.length ? removed.map(id => `<@&${id}>`).join(' ') : 'None' }
            )
            .setTimestamp();
  
          if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
  
          await sendAuditLog({ embeds: [embed] });
  
          addAuditLogEntry({
            type: 'info',
            action: 'role_update',
            userId: newMember.id,
            userTag: newMember.user.tag,
            executorId: executor?.id || null,
            executorTag: executor?.tag || null,
            details: { summary: `Added ${added.length}, Removed ${removed.length}` }
          });
        }
      }
    } catch (err) {
      addLog('error', `Nickname log failed: ${err.message}`);
    }
  });
  
  client.on('guildBanAdd', async (ban) => {
    // Feature hooks: anti-alt ban recording
    if (featureHooks) {
      featureHooks.recordBan(ban.user?.id, ban.user?.tag);
    }

    try {
      if (!auditLogSettings?.enabled || !auditLogSettings?.logMemberBans) return;
      if (isExcludedBySettings({ userId: ban.user?.id })) return;
  
      const executor = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanAdd, ban.user?.id);
      const embed = new EmbedBuilder()
        .setColor(parseInt((auditLogSettings.eventColors?.ban || '#E74C3C').replace('#', ''), 16))
        .setTitle('⛔ Member Banned')
        .setDescription(`<@${ban.user?.id}> was banned`)
        .setTimestamp();
      if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
      if (executor?.reason) embed.addFields({ name: 'Reason', value: executor.reason });
  
      await sendAuditLog({ embeds: [embed], eventType: 'logMemberBans' });
  
      addAuditLogEntry({
        type: 'warn',
        action: 'member_ban',
        userId: ban.user?.id || null,
        userTag: ban.user?.tag || null,
        executorId: executor?.id || null,
        executorTag: executor?.tag || null,
        details: { summary: executor?.reason || 'Banned', reason: executor?.reason }
      });
  
      // Track in moderation.json so it shows in the moderation cases tab
      try {
        const modData = loadJSON(MODERATION_PATH, { warnings: [], cases: [] });
        modData.cases = modData.cases || [];
        modData.cases.push({
          type: 'ban', id: crypto.randomUUID(), userId: ban.user?.id || null,
          reason: executor?.reason || 'External ban', moderator: executor?.tag || 'Discord (external)',
          ts: Date.now(), external: true
        });
        saveJSON(MODERATION_PATH, modData);
      } catch (e) { addLog('error', `Failed to track external ban: ${e.message}`); }
  
      // Send critical event DM
      await sendCriticalEventDM('bans', {
        summary: `${ban.user?.tag || 'Unknown user'} was banned`,
        userId: ban.user?.id,
        userTag: ban.user?.tag,
        reason: executor?.reason
      });
    } catch (err) {
      addLog('error', `Member ban log failed: ${err.message}`);
    }
  });
  
  client.on('guildBanRemove', async (ban) => {
    try {
      if (!auditLogSettings?.enabled || !auditLogSettings?.logMemberUnbans) return;
      if (isExcludedBySettings({ userId: ban.user?.id })) return;
  
      const executor = await getAuditExecutor(ban.guild, AuditLogEvent.MemberBanRemove, ban.user?.id);
      const embed = new EmbedBuilder()
        .setColor(0x2ECC71)
        .setTitle('✅ Member Unbanned')
        .setDescription(`<@${ban.user?.id}> was unbanned`)
        .setTimestamp();
      if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
      if (executor?.reason) embed.addFields({ name: 'Reason', value: executor.reason });
  
      await sendAuditLog({ embeds: [embed] });
  
      addAuditLogEntry({
        type: 'info',
        action: 'member_unban',
        userId: ban.user?.id || null,
        userTag: ban.user?.tag || null,
        executorId: executor?.id || null,
        executorTag: executor?.tag || null,
        details: { summary: 'Unbanned' }
      });
    } catch (err) {
      addLog('error', `Member unban log failed: ${err.message}`);
    }
  });
  
  client.on('guildUpdate', async (oldGuild, newGuild) => {
    try {
      if (!auditLogSettings?.enabled || !auditLogSettings?.logServerUpdates) return;
  
      const changes = [];
      if (oldGuild.name !== newGuild.name) changes.push(`Name: ${oldGuild.name} → ${newGuild.name}`);
      if (oldGuild.icon !== newGuild.icon) changes.push('Icon updated');
      if (oldGuild.banner !== newGuild.banner) changes.push('Banner updated');
      if (oldGuild.description !== newGuild.description) changes.push('Description updated');
      if (oldGuild.verificationLevel !== newGuild.verificationLevel) changes.push(`Verification: ${oldGuild.verificationLevel} → ${newGuild.verificationLevel}`);
      if (oldGuild.afkChannelId !== newGuild.afkChannelId) changes.push('AFK channel updated');
      if (oldGuild.afkTimeout !== newGuild.afkTimeout) changes.push('AFK timeout updated');
  
      if (!changes.length) return;
  
      const executor = await getAuditExecutor(newGuild, AuditLogEvent.GuildUpdate, newGuild.id);
      const embed = new EmbedBuilder()
        .setColor(0x3498DB)
        .setTitle('⚙️ Server Settings Updated')
        .setDescription(changes.join('\n'))
        .setTimestamp();
      if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
  
      await sendAuditLog({ embeds: [embed] });
  
      addAuditLogEntry({
        type: 'info',
        action: 'server_update',
        userId: null,
        userTag: null,
        executorId: executor?.id || null,
        executorTag: executor?.tag || null,
        details: { summary: changes.join('; ') }
      });
  
      // Send critical event DM for server changes
      await sendCriticalEventDM('serverChanges', {
        summary: `Server settings updated: ${changes.join(', ')}`
      });
    } catch (err) {
      addLog('error', `Server update log failed: ${err.message}`);
    }
  });
  
  client.on('guildIntegrationsUpdate', async (guild) => {
    try {
      if (!auditLogSettings?.enabled || !auditLogSettings?.logIntegrations) return;
  
      const executor = await getAuditExecutor(guild, AuditLogEvent.IntegrationUpdate, guild.id) ||
        await getAuditExecutor(guild, AuditLogEvent.IntegrationCreate, guild.id) ||
        await getAuditExecutor(guild, AuditLogEvent.IntegrationDelete, guild.id);
  
      const embed = new EmbedBuilder()
        .setColor(0x8E44AD)
        .setTitle('🔌 Integrations Updated')
        .setDescription('An integration or app setting changed')
        .setTimestamp();
      if (executor?.tag) embed.addFields({ name: 'By', value: executor.tag });
  
      await sendAuditLog({ embeds: [embed] });
  
      addAuditLogEntry({
        type: 'info',
        action: 'integration_update',
        executorId: executor?.id || null,
        executorTag: executor?.tag || null,
        details: { summary: 'Integration update' }
      });
    } catch (err) {
      addLog('error', `Integration update log failed: ${err.message}`);
    }
  });
  
  client.on('interactionCreate', async (interaction) => {
    try {
      // ========== SUGGESTION VOTE BUTTONS ==========
      if (interaction.isButton() && interaction.customId.startsWith('suggest_')) {
        const parts = interaction.customId.split('_');
        const voteType = parts[1]; // 'up' or 'down'
        const sugId = parts[2];
        const sug = suggestions.find(s => s.id === sugId);
        if (!sug) return interaction.reply({ content: 'Suggestion not found.', ephemeral: true });
  
        const uid = interaction.user.id;
        if (voteType === 'up') {
          sug.downvotes = (sug.downvotes || []).filter(id => id !== uid);
          if ((sug.upvotes || []).includes(uid)) {
            sug.upvotes = sug.upvotes.filter(id => id !== uid);
          } else {
            sug.upvotes = sug.upvotes || [];
            sug.upvotes.push(uid);
          }
        } else {
          sug.upvotes = (sug.upvotes || []).filter(id => id !== uid);
          if ((sug.downvotes || []).includes(uid)) {
            sug.downvotes = sug.downvotes.filter(id => id !== uid);
          } else {
            sug.downvotes = sug.downvotes || [];
            sug.downvotes.push(uid);
          }
        }
        saveState();
  
        const row = new ActionRowBuilder().addComponents(
          new ButtonBuilder().setCustomId(`suggest_up_${sugId}`).setLabel(`👍 ${(sug.upvotes || []).length}`).setStyle(ButtonStyle.Success),
          new ButtonBuilder().setCustomId(`suggest_down_${sugId}`).setLabel(`👎 ${(sug.downvotes || []).length}`).setStyle(ButtonStyle.Danger)
        );
        await interaction.update({ components: [row] });
        return;
      }
  
      // ========== GIVEAWAY BUTTON ENTRY ==========
      if (interaction.isButton() && interaction.customId.startsWith('giveaway_enter_')) {
        const giveawayId = interaction.customId.replace('giveaway_enter_', '');
        const giveaway = giveaways.find(g => g.id === giveawayId);
        if (!giveaway || !giveaway.active) return interaction.reply({ content: '❌ This giveaway has ended.', ephemeral: true });
  
        const uid = interaction.user.id;
        if (!giveaway.entries) giveaway.entries = [];
  
        // Check role restrictions
        if (giveaway.allowedRoleIds?.length > 0) {
          const memberRoles = interaction.member?.roles?.cache;
          if (!memberRoles || !giveaway.allowedRoleIds.some(r => memberRoles.has(r))) {
            return interaction.reply({ content: '❌ You don\'t have the required role.', ephemeral: true });
          }
        }
  
        // Check excluded users
        if (giveaway.excludedUserIds?.includes(uid)) {
          return interaction.reply({ content: '❌ You are excluded from this giveaway.', ephemeral: true });
        }
  
        // Check account age
        if (giveaway.minAccountAgeDays > 0) {
          const ageDays = (Date.now() - interaction.user.createdTimestamp) / 86400000;
          if (ageDays < giveaway.minAccountAgeDays) {
            return interaction.reply({ content: `❌ Your account must be at least ${giveaway.minAccountAgeDays} days old.`, ephemeral: true });
          }
        }
  
        if (giveaway.entries.includes(uid)) {
          giveaway.entries = giveaway.entries.filter(id => id !== uid);
          saveState();
          return interaction.reply({ content: '🚪 You left the giveaway.', ephemeral: true });
        }
  
        giveaway.entries.push(uid);
        saveState();
        return interaction.reply({ content: `🎉 You entered the giveaway! (${giveaway.entries.length} total entries)`, ephemeral: true });
      }
  
      if (interaction.isButton() && interaction.customId.startsWith('yt-claim:')) {
        await handleYouTubeRewardClaim(interaction);
        return;
      }
  
      // Handle RPG interactions (buttons, selects, commands)
      if (interaction.isChatInputCommand() && interaction.commandName === 'rpg') {
        if (!isRpgChannelAllowed(interaction.channelId, interaction.channel)) {
          await interaction.reply({ content: getRpgRestrictionMessage(), ephemeral: true });
          return;
        }
        await rpgBot.handleInteraction(interaction);
        return;
      }
  
      if (interaction.isButton() && interaction.customId.startsWith('rpg-')) {
        if (!isRpgChannelAllowed(interaction.channelId, interaction.channel)) {
          await interaction.reply({ content: getRpgRestrictionMessage(), ephemeral: true });
          return;
        }
        await rpgBot.handleInteraction(interaction);
        return;
      }
  
      if (interaction.isStringSelectMenu && interaction.isStringSelectMenu() && interaction.customId.startsWith('rpg-')) {
        if (!isRpgChannelAllowed(interaction.channelId, interaction.channel)) {
          await interaction.reply({ content: getRpgRestrictionMessage(), ephemeral: true });
          return;
        }
        await rpgBot.handleInteraction(interaction);
        return;
      }
  
      if (interaction.isModalSubmit && interaction.isModalSubmit() && interaction.customId.startsWith('rpg-')) {
        if (!isRpgChannelAllowed(interaction.channelId, interaction.channel)) {
          await interaction.reply({ content: getRpgRestrictionMessage(), ephemeral: true });
          return;
        }
        await rpgBot.handleInteraction(interaction);
        return;
      }
  
      if (interaction.isButton() && interaction.customId.startsWith('dashboard-')) {
        const DashboardCommand = (await import('./Discord bot - test branch/rpg/dashboard/DashboardCommand.js')).default;
        const dashboardCmd = new DashboardCommand();
        return dashboardCmd.handleButtonInteraction(interaction);
      }
  
      if (interaction.isModalSubmit && interaction.isModalSubmit() && interaction.customId.startsWith('dashboard-')) {
        const DashboardCommand = (await import('./Discord bot - test branch/rpg/dashboard/DashboardCommand.js')).default;
        const dashboardCmd = new DashboardCommand();
        return dashboardCmd.handleModalSubmit(interaction);
      }
  
      // Pet autocomplete handler
      if (interaction.isAutocomplete && interaction.isAutocomplete() && interaction.commandName === 'pet') {
        const focused = interaction.options.getFocused().toLowerCase();
        const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
        const catalog = petsData.catalog || [];
        const filtered = catalog
          .filter(p => p.name.toLowerCase().includes(focused) || p.category.toLowerCase().includes(focused) || p.id.includes(focused))
          .slice(0, 25)
          .map(p => ({ name: p.emoji + ' ' + p.name + ' (' + p.category + ')', value: p.id }));
        return interaction.respond(filtered);
      }
  
      if (!interaction.isChatInputCommand()) return;
  
      // Check bot permissions
      if (interaction.guild) {
        const botMember = await interaction.guild.members.fetchMe();
        if (!botMember.permissions.has('SendMessages')) {
          return interaction.reply({ content: '❌ Bot does not have permission to send messages in this channel', ephemeral: true });
        }
      }
  
      // If RPG test mode is enabled, only allow RPG and test mode commands
      if (rpgTestMode) {
        const rpgOnlyCommands = ['rpg', 'leaderboard', 'dashboard', 'rpg-test-mode'];
        if (!rpgOnlyCommands.includes(interaction.commandName)) {
          return interaction.reply({ 
            content: '🧪 **RPG TEST MODE ACTIVE** - Only RPG commands are available right now. Toggle off with `/rpg-test-mode` to enable other features.', 
            ephemeral: true 
          });
        }
      }
  
      // Admin-only commands
      const adminOnly = [
        'cancelstream',
        'alertsoff',
        'alertson',
        'setschedule',
        'forcelive',
        'forceoffline',
        'testdelay',
        'warn',
        'setlivemessage',
        'setmilestones',
        'setofflinethreshold',
        'setalertroles',
        'setlevelchannel',
        'addxp',
        'removexp',
        'setlevel',
        'setxpmultiplier',
        'giveaway',
        'giveawayend',
        'giveawayreroll',
        'pollend',
        'addcommand',
        'removecommand',
        'editcommand',
        'addfilter',
        'removefilter',
        'rpg-test-mode'
      ];
  
      // ✅ Check admin permissions
      if (adminOnly.includes(interaction.commandName)) {
        if (!interaction.guild || !interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
          return interaction.reply({ content: '⛔ Admin only command.', ephemeral: true });
        }
      }
  
      const cmdKey = interaction.commandName;
      if (config.commandDisabled?.[cmdKey]) {
        return interaction.reply({ content: '⛔ This command is disabled in the dashboard.', ephemeral: true });
      }
      const cooldownSeconds = Number(config.commandCooldowns?.[cmdKey] || 0);
      if (cooldownSeconds > 0) {
        const key = cmdKey + ':' + interaction.user.id;
        const last = slashCommandCooldowns.get(key) || 0;
        const remainingMs = cooldownSeconds * 1000 - (Date.now() - last);
        if (remainingMs > 0) {
          const remainingSec = Math.ceil(remainingMs / 1000);
          return interaction.reply({ content: `⏳ This command is on cooldown. Try again in ${remainingSec}s.`, ephemeral: true });
        }
        slashCommandCooldowns.set(key, Date.now());
      }
  
      // Defer reply for long-running commands
      if (['setschedule', 'stats', 'streamhealth'].includes(interaction.commandName)) {
        await interaction.deferReply({ ephemeral: true });
      }
  
      logCommandUsage(cmdKey, interaction.user);
      trackCommand(cmdKey, interaction.user.id);
  
      switch (interaction.commandName) {
        case 'dashboard': {
          const DashboardCommand = (await import('./Discord bot - test branch/rpg/dashboard/DashboardCommand.js')).default;
          const dashboardCmd = new DashboardCommand();
          return dashboardCmd.handleCommand(interaction);
        }
  
        case 'streamstatus':
          return interaction.reply(
            streamInfo.startedAt
              ? `🔴 LIVE | ${streamInfo.viewers} viewers`
              : '⚫ OFFLINE'
          );
  
        case 'lastlive':
          if (!lastStreamId) {
            return interaction.reply('No previous stream recorded');
          }
          return interaction.reply(
            `Last stream: "${streamInfo.title}" at ${new Date(streamInfo.startedAt).toLocaleString()}`
          );
  
        case 'topgame': {
          const counts = history.reduce((acc, i) => {
            acc[i.game] = (acc[i.game] || 0) + 1;
          }, {});
          const top = Object.entries(counts).sort((a, b) => b[1] - a[1])[0];
          return interaction.reply(
            top ? `Top Game: ${top[0]} (${top[1]} streams)` : 'No game data'
          );
        }
  
        // Force stream LIVE
        case 'forcelive': {
          streamInfo.startedAt = new Date().toISOString();
          streamInfo.viewers = 1;
          streamInfo.isForced = true;
          saveState();
          // Recompute the next scheduled stream immediately after updating weekly schedule
          try { computeNextScheduledStream(true); } catch (e) { addLog('error', 'Failed to compute next scheduled stream: ' + (e?.message || e)); }
          await checkStream();
          return interaction.reply('🧪 Stream forced LIVE');
        }
  
        // Force stream OFFLINE
        case 'forceoffline':
          streamInfo.startedAt = null;
          streamInfo.viewers = 0;
          streamInfo.isForced = false;
          saveState();
          await checkStream();
          return interaction.reply('🧪 Stream forced OFFLINE');
  
        // Cancel stream
        case 'cancelstream':
          schedule.noStreamToday = true;
          schedule.alertsSent = { oneHour: false, tenMin: false };
          saveState();
          addLog('info', 'Stream cancelled for today');
          
          // Send cancellation announcement
          try {
            const channelId = getChannelOrDefault('liveAlert');
            const channel = await client.channels.fetch(channelId);
            
            if (channel) {
              // CLEAN CHANNEL: Delete previous bot messages and unpin old announcement
              try {
                const messages = await channel.messages.fetch({ limit: 50 });
                const botMessages = messages.filter(m => m.author.id === client.user.id);
                
                // Unpin the old announcement if it exists
                if (announcementMessageId) {
                  const oldMsg = botMessages.get(announcementMessageId);
                  if (oldMsg && oldMsg.pinned) {
                    await oldMsg.unpin();
                    addLog('info', 'Unpinned old announcement');
                  }
                }
                
                // Delete all bot messages in the channel
                for (const [, msg] of botMessages) {
                  try {
                    await msg.delete();
                  } catch (err) {
                    addLog('warn', `Could not delete message: ${err.message}`);
                  }
                }
                addLog('info', 'Cleaned announcement channel');
              } catch (err) {
                addLog('warn', 'Could not clean channel: ' + err.message);
              }
              
              const roleId = getRoleOrDefault('liveAlert');
              const cancelEmbed = new EmbedBuilder()
                .setColor(0xFF0000)
                .setTitle('❌ Stream Cancelled')
                .setDescription(`${roleId ? `<@&${roleId}> ` : ''}Today's stream has been cancelled. Sorry for the inconvenience!`)
                .setTimestamp();
              
              const cancelMsg = await channel.send({ embeds: [cancelEmbed] });
              
              // PIN the cancellation message
              try {
                await cancelMsg.pin();
                addLog('info', 'Pinned cancellation announcement');
                announcementMessageId = cancelMsg.id;
                saveState();
              } catch (err) {
                addLog('warn', 'Could not pin cancellation message: ' + err.message);
              }
            }
          } catch (err) {
            addLog('error', 'Failed to send cancellation announcement: ' + err.message);
          }
          
          return interaction.reply('❌ Stream cancelled for today');
  
  
        // Alerts off
        case 'alertsoff':
          schedule.alertsEnabledToday = false;
          saveState();
          addLog('info', 'Alerts disabled for today');
          return interaction.reply('🔇 Alerts disabled for today');
  
        // Alerts on
        case 'alertson':
          schedule.alertsEnabledToday = true;
          saveState();
          addLog('info', 'Alerts enabled for today');
          return interaction.reply('🔔 Alerts enabled for today');
  
        // Force delayed notification
        case 'testdelay':
          await forceDelayedNotification();
          return interaction.reply('⏱️ Delayed notification forced');
  
        // Stream health embed
        case 'streamhealth': {
          const next = getNextScheduledStream();
          const alertInfo = getNextAlertInfo();
  
          const status = streamInfo.startedAt ? '🔴 LIVE' : '⚫ OFFLINE';
  
          // Stream duration if live
          let streamDuration = 'N/A';
          if (streamInfo.startedAt) {
            const uptime = Date.now() - new Date(streamInfo.startedAt).getTime();
            const hours = Math.floor(uptime / (1000 * 60 * 60));
            const mins = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
            streamDuration = `${hours}h ${mins}m`;
          }
  
          // Bot uptime
          const botUptime = Date.now() - startTime;
          const botDays = Math.floor(botUptime / (1000 * 60 * 60 * 24));
          const botHours = Math.floor((botUptime % (1000 * 60 * 60 * 24)) / (1000 * 60));
  
          let nextStreamText = 'Not scheduled';
          let daysUntilNext = 'N/A';
          if (next) {
            const ts = Math.floor(next.ts / 1000);
            const dayName = next.day.charAt(0).toUpperCase() + next.day.slice(1);
            nextStreamText = `${dayName} • <t:${ts}:t>`;
            const daysLeft = Math.ceil((next.ts - Date.now()) / (1000 * 60 * 60 * 24));
            daysUntilNext = `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`;
          }
  
          const flags = [];
          if (schedule.noStreamToday) flags.push('❌ Cancelled today');
          if (schedule.streamDelayed) flags.push('⚠️ Delayed');
          if (!client.isReady()) flags.push('⚠️ Bot not ready');
  
          const embed = new EmbedBuilder()
            .setTitle('🧠 Stream Health Dashboard')
            .setColor(streamInfo.startedAt ? 0x00FF00 : 0x9146FF)
            .setDescription(`Last updated: <t:${Math.floor(Date.now() / 1000)}:R>`)
            .addFields(
              // Status section
              { name: '━━━━━━━━━━━ STATUS ━━━━━━━━━━━', value: ' ', inline: false },
              { name: 'Stream Status', value: status, inline: true },
              { name: 'Stream Duration', value: streamDuration, inline: true },
              { name: 'Viewers', value: String(streamInfo.viewers), inline: true },
              { name: 'Last Check', value: lastStreamCheckAt ? new Date(lastStreamCheckAt).toLocaleString() : 'N/A', inline: true },
              
              // Stream info section
              { name: '━━━━━━━ CURRENT INFO ━━━━━━━', value: ' ', inline: false },
              { name: 'Title', value: streamInfo.title || 'No title', inline: false },
              { name: 'Game', value: streamInfo.game || 'No game', inline: true },
              { name: 'Timezone', value: botTimezone, inline: true },
              
              // Schedule section
              { name: '━━━━━━━ NEXT STREAM ━━━━━━━', value: ' ', inline: false },
              { name: 'When', value: nextStreamText, inline: true },
              { name: 'Days Until', value: daysUntilNext, inline: true },
              
              // Alerts section
              { name: '━━━━━━━━ ALERTS ━━━━━━━━', value: ' ', inline: false },
              {
                name: '1h Alert',
                value: schedule.alertsSent.oneHour ? '✅ Sent' : '⏳ Pending',
                inline: true
              },
              {
                name: '10m Alert',
                value: schedule.alertsSent.tenMin ? '✅ Sent' : '⏳ Pending',
                inline: true
              },
              {
                name: 'Next Alert',
                value: alertInfo.nextAlert ? `${alertInfo.nextAlert} (${alertInfo.timeRemaining})` : alertInfo.status,
                inline: true
              },
              
              // Stats section
              { name: '━━━━━━━━ STATS ━━━━━━━━', value: ' ', inline: false },
              { name: 'Total Streams', value: String(stats.totalStreams), inline: true },
              { name: 'Peak Viewers', value: String(stats.peakViewers), inline: true },
              { name: 'Avg Viewers', value: stats.totalStreams > 0 ? String(Math.round(stats.totalViewers / stats.totalStreams)) : '0', inline: true },
              
              // Bot info section
              { name: '━━━━━━━ BOT INFO ━━━━━━━', value: ' ', inline: false },
              { name: 'Bot Uptime', value: `${botDays}d ${botHours}h`, inline: true },
              { name: 'Notification Role', value: config.ROLE_ID ? `<@&${config.ROLE_ID}>` : 'Not set', inline: true },
              
              // Flags section
              { name: '━━━━━━━ FLAGS ━━━━━━━', value: flags.length ? flags.join('\n') : '✅ All good', inline: false }
            )
            .setFooter({ text: `Timezone: ${botTimezone}` });
  
          return interaction.editReply({ embeds: [embed] });
        }
  
        // Set weekly schedule
        case 'setschedule': {
          const channel = interaction.options.getChannel('channel');
          if (!channel) {
            return interaction.reply({ content: '❌ Invalid channel.', ephemeral: true });
          }
          if (!schedule.weekly) schedule.weekly = {};
  
          const groups = [
            { time: interaction.options.getString('time1'), days: interaction.options.getString('days1') },
            { time: interaction.options.getString('time2'), days: interaction.options.getString('days2') }
          ].filter(g => g.time && g.days);
  
          // Validate time format
          const timeRegex = /^([0-1]?[0-9]|2[0-3]):[0-5][0-9]$/;
          
          const updated = [];
          const now = getNowInBotTimezone(); // Use bot's timezone safely
  
          for (const g of groups) {
            if (!timeRegex.test(g.time)) {
              return interaction.editReply({ content: `❌ Invalid time format: ${g.time}. Use HH:MM (24-hour)` });
            }
  
            const [h, m] = g.time.split(':').map(Number);
            for (const d of g.days.toLowerCase().split(',')) {
              const day = DAY_MAP[d.trim()];
              if (!day) {
                return interaction.editReply({ content: `❌ Invalid day: ${d.trim()}` });
              }
  
              const targetDayIndex = DAY_INDEX[day];
              const currentDayIndex = now.getUTCDay();
              
              // Calculate days to add
              let daysToAdd = targetDayIndex - currentDayIndex;
              if (daysToAdd < 0) daysToAdd += 7; // If day already passed this week, schedule for next week
              if (daysToAdd === 0) {
                // If it's today, check if time has passed
                const currentHour = now.getUTCHours();
                const currentMinute = now.getUTCMinutes();
                if (currentHour > h || (currentHour === h && currentMinute >= m)) {
                  daysToAdd = 7; // Schedule for next week
                }
              }
  
              const target = new Date(now.getTime());
              target.setUTCDate(now.getUTCDate() + daysToAdd);
              target.setUTCHours(h, m, 0, 0);
  
              // Calculate timezone offset between system timezone and bot timezone
              const utcNow = new Date();
              const botTime = new Date(utcNow.toLocaleString('en-US', { timeZone: botTimezone }));
              const systemTime = new Date(utcNow.toLocaleString('en-US'));
              const offsetMs = botTime.getTime() - systemTime.getTime();
              
              // Store schedule as hour/minute for the weekday (safer than storing an absolute timestamp)
              schedule.weekly[day] = { hour: h, minute: m };
              updated.push(`${day.charAt(0).toUpperCase() + day.slice(1)} @ ${g.time}`);
            }
          }
  
          if (updated.length === 0) {
            return interaction.editReply({ content: '❌ No valid schedule entries created' });
          }
  
          saveState();
  
          await channel.send({
            embeds: [{
              title: '📅 Weekly Stream Schedule',
              color: 0x9146FF,
              description: 'Updated schedule:',
              fields: updated.map(u => {
                const dayName = u.split(' @ ')[0].toLowerCase();
                const entry = schedule.weekly[dayName];
                if (!entry) {
                  return { name: u.split(' @ ')[0], value: 'Error: Schedule not found', inline: false };
                }
  
                // Compute a next occurrence for display
                const computeTsForDisplay = (() => {
                  const map = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
                  const idx = map[dayName];
                  if (idx === undefined) return null;
                  const hour = entry.hour ?? (new Date(Number(entry) || Date.now()).getHours());
                  const minute = entry.minute ?? (new Date(Number(entry) || Date.now()).getMinutes());
  
                  const utcMs = getNextOccurrenceUtcMs(botTimezone, idx, hour, minute, Date.now());
                  return Math.floor(utcMs / 1000);
                })();
  
                return { name: u.split(' @ ')[0], value: computeTsForDisplay ? `<t:${computeTsForDisplay}:t>` : 'N/A', inline: false };
              })
            }]
          });
  
          return interaction.editReply({
            content: `✅ Schedule updated:\n• ${updated.join('\n• ')}`
          });
        }
  
        // NEW: Help command
        case 'help': {
          const helpEmbed = new EmbedBuilder()
            .setTitle('📋 Bot Commands')
            .setColor(0x9146FF)
            .addFields(
              { name: '📡 Stream Info', value: '`/streamstatus` - Current stream status\n`/lastlive` - Last stream info\n`/topgame` - Most played game\n`/stats` - Stream statistics\n`/uptime` - Bot uptime' },
              { name: '🔔 Alerts', value: '`/alertson` - Enable alerts\n`/alertsoff` - Disable alerts' },
              { name: '⏰ Schedule', value: '`/setschedule` - Set weekly schedule\n`/cancelstream` - Cancel today\'s stream\n`/testdelay` - Test delayed notification' },
              { name: '💬 Community', value: '`/suggest` - Make a suggestion\n`/warnings` - Check user warnings\n`/commands` - List custom commands' },
              { name: '🎉 Giveaways', value: '`/giveaway` - Start a giveaway\n`/giveawaylist` - List active giveaways\n`/giveawayend` - End giveaway early\n`/giveawayreroll` - Reroll winners' },
              { name: '📊 Polls', value: '`/poll` - Create a poll\n`/polllist` - List active polls\n`/pollend` - End poll early\n`/pollresults` - View poll results' },
              { name: '⏰ Reminders', value: '`/remind` - Set a reminder\n`/reminders` - List your reminders\n`/cancelreminder` - Cancel a reminder' },
              { name: '📝 Custom Commands', value: '`/addcommand` - Add custom command\n`/editcommand` - Edit custom command\n`/removecommand` - Remove custom command' },
              { name: '🔕 Filters', value: '`/addfilter` - Add notification filter\n`/filters` - List active filters\n`/removefilter` - Remove filter' },
              { name: '⚙️ Admin', value: '`/streamhealth` - Stream health status\n`/forcelive` - Force LIVE\n`/forceoffline` - Force OFFLINE\n`/warn` - Warn a user' }
            )
            .setFooter({ text: 'Use /help for command details' })
            .setTimestamp();
          return interaction.reply({ embeds: [helpEmbed], ephemeral: true });
        }
  
        // NEW: Stats command
        case 'stats': {
          recomputeStreamStatsFromHistory();
          const statsEmbed = new EmbedBuilder()
            .setTitle('📊 Stream Statistics')
            .setColor(0x9146FF)
            .addFields(
              { name: 'Total Streams', value: String(stats.totalStreams), inline: true },
              { name: 'Peak Viewers', value: String(stats.peakViewers), inline: true },
              { name: 'Total Viewers', value: String(stats.totalViewers), inline: true },
              { name: 'Most Played Game', value: getMostPlayedGame() || 'N/A', inline: true },
              { name: 'Average Viewers', value: String(stats.avgViewers ?? (history.length ? Math.round(history.reduce((sum, h) => sum + ((h.avgViewers ?? h.viewers) || 0), 0) / history.length) : 0)), inline: true },
              { name: 'Streams This Week', value: String(history.filter(h => {
                if (!h.startedAt) return false;
                const d = new Date(h.startedAt);
                const now = new Date();
                return (now - d) / (1000 * 60 * 60 * 24) <= 7;
              }).length), inline: true }
            )
            .setTimestamp();
          return interaction.editReply({ embeds: [statsEmbed] });
        }
  
        // NEW: Uptime command
        case 'uptime': {
          const uptime = Date.now() - startTime;
          const days = Math.floor(uptime / (1000 * 60 * 60 * 24));
          const hours = Math.floor((uptime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
          const minutes = Math.floor((uptime % (1000 * 60 * 60)) / (1000 * 60));
          return interaction.reply(`⏱️ Bot uptime: **${days}d ${hours}h ${minutes}m**`);
        }
  
        // NEW: Suggest command
        case 'suggest': {
          const suggestion = interaction.options.getString('suggestion');
          const userId = interaction.user.id;
          
          // Check cooldown
          const cooldownMinutes = dashboardSettings.suggestionCooldownMinutes || 60;
          const cooldownMs = cooldownMinutes * 60 * 1000;
          const lastSuggestion = suggestionCooldowns[userId];
          
          if (lastSuggestion && cooldownMinutes > 0) {
            const timeSince = Date.now() - lastSuggestion;
            if (timeSince < cooldownMs) {
              const remaining = Math.ceil((cooldownMs - timeSince) / 60000);
              return interaction.reply({ 
                content: `⏱️ Please wait ${remaining} more minute${remaining !== 1 ? 's' : ''} before submitting another suggestion.`, 
                ephemeral: true 
              });
            }
          }
          
          suggestions.push({
            id: suggestions.length,
            user: interaction.user.username,
            userId,
            suggestion,
            timestamp: new Date().toISOString(),
            upvotes: 0
          });
          
          // Set cooldown
          suggestionCooldowns[userId] = Date.now();
          
          saveState();
          addLog('info', `Suggestion from ${interaction.user.username}: ${suggestion}`);
          return interaction.reply({ content: '✅ Suggestion recorded! Thank you!', ephemeral: true });
        }
  
        // NEW: Warn command
        case 'warn': {
          const user = interaction.options.getUser('user');
          const reason = interaction.options.getString('reason') || 'No reason specified';
          const userId = user.id;
          
          if (!warnings[userId]) warnings[userId] = [];
          warnings[userId].push({
            reason,
            warnedBy: interaction.user.username,
            timestamp: new Date().toISOString()
          });
          saveState();
          addLog('info', `User ${user.username} warned: ${reason}`);
          return interaction.reply({ content: `⚠️ **${user.username}** has been warned for: *${reason}*`, ephemeral: false });
        }
  
        // NEW: Warnings command
        case 'warnings': {
          const user = interaction.options.getUser('user');
          const userId = user.id;
          const userWarnings = warnings[userId] || [];
          
          if (userWarnings.length === 0) {
            return interaction.reply({ content: `✅ **${user.username}** has no warnings` });
          }
          
          const warningsList = userWarnings.map((w, i) => `${i + 1}. **${w.reason}** - by ${w.warnedBy}`).join('\n');
          return interaction.reply({ content: `⚠️ **${user.username}** has ${userWarnings.length} warning(s):\n${warningsList}` });
        }
  
        // NEW: Set live message command
        case 'setlivemessage': {
          const message = interaction.options.getString('message');
          dashboardSettings.customLiveMessage = message;
          saveState();
          addLog('info', `Live message set to: ${message}`);
          return interaction.reply({
            content: `✅ Live message updated!\n\nPreview:\n${message.replace('{role}', '<@&ROLE>').replace('{streamer}', 'YourName')}`,
            ephemeral: true
          });
        }
  
        // NEW: Set milestone alerts command
        case 'setmilestones': {
          const milestones = interaction.options.getString('milestones');
          try {
            const nums = milestones.split(',').map(m => parseInt(m.trim())).filter(m => m > 0);
            engagementSettings.viewerMilestones = nums.sort((a, b) => a - b);
            saveState();
            return interaction.reply({
              content: `✅ Viewer milestones set to: ${nums.join(', ')}`,
              ephemeral: true
            });
          } catch (err) {
            return interaction.reply({
              content: `❌ Invalid format. Use comma-separated numbers: 100,250,500,1000`,
              ephemeral: true
            });
          }
        }
  
        // NEW: Set offline threshold command
        case 'setofflinethreshold': {
          const seconds = interaction.options.getInteger('seconds');
          dashboardSettings.offlineThreshold = seconds * 1000;
          saveState();
          return interaction.reply({
            content: `✅ Offline threshold set to ${seconds} seconds (${Math.round(seconds / 60)} minutes)`,
            ephemeral: true
          });
        }
  
        // NEW: Set alert roles command
        case 'setalertroles': {
          const roleType = interaction.options.getString('role_type');
          const role = interaction.options.getRole('role');
          
          if (!dashboardSettings.alertRoles) dashboardSettings.alertRoles = {};
          dashboardSettings.alertRoles[roleType] = role.id;
          saveState();
          
          return interaction.reply({
            content: `✅ ${roleType} alerts will now ping <@&${role.id}>`,
            ephemeral: true
          });
        }
  
        case 'setlevelchannel': {
          const channel = interaction.options.getChannel('channel');
          if (channel) {
            dashboardSettings.levelUpChannelId = channel.id;
            saveState();
            return interaction.reply({ content: `✅ Level-up alerts will now post in ${channel}.`, ephemeral: true });
          } else {
            dashboardSettings.levelUpChannelId = null;
            saveState();
            return interaction.reply({ content: '✅ Level-up alerts will now post in the channel where the user levels up.', ephemeral: true });
          }
        }
  
        // Leveling commands
        case 'leaderboard': {
          const allEntries = Object.entries(leveling || {})
            .map(([id, data]) => ({
              id,
              level: Number(data?.level || 0),
              xp: Number(data?.xp || 0),
              xpMultiplier: Number(data?.xpMultiplier || 1),
              prestige: (typeof prestige !== 'undefined' && prestige[id]) ? Number(prestige[id]) : 0,
              weeklyXp: (typeof weeklyLeveling !== 'undefined' && weeklyLeveling[id]) ? Number(weeklyLeveling[id]?.xp || 0) : 0,
              messages: Number(data?.messages || data?.messageCount || 0),
              voiceMinutes: Number(data?.voiceMinutes || data?.voiceTime || 0),
              lastActive: data?.lastMsg || data?.lastActive || null
            }))
            .sort((a, b) => (b.level - a.level) || (b.xp - a.xp));
  
          const top15 = allEntries.slice(0, 15);
          const totalUsers = allEntries.length;
          const totalXp = allEntries.reduce((s, e) => s + e.xp, 0);
          const totalPrestige = allEntries.filter(e => e.prestige > 0).length;
          const avgLevel = totalUsers > 0 ? (allEntries.reduce((s, e) => s + e.level, 0) / totalUsers).toFixed(1) : '0';
          const maxLevel = top15.length > 0 ? top15[0].level : 0;
  
          // Caller's rank
          const callerIdx = allEntries.findIndex(e => e.id === interaction.user.id);
          const callerData = callerIdx >= 0 ? allEntries[callerIdx] : null;
  
          const lines = top15.map((entry, idx) => {
            const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : `\`#${idx + 1}\``;
            const prestigeBadge = entry.prestige > 0 ? ` 🎖️P${entry.prestige}` : '';
            const multiplierBadge = entry.xpMultiplier > 1 ? ` ⚡${entry.xpMultiplier}x` : '';
            const weeklyStr = entry.weeklyXp > 0 ? ` (+${entry.weeklyXp.toLocaleString()} this week)` : '';
            return `${medal} <@${entry.id}> — **Lv.${entry.level}** • ${entry.xp.toLocaleString()} XP${weeklyStr}${prestigeBadge}${multiplierBadge}`;
          });
  
          // Level distribution bar chart (text-based)
          const levelBuckets = { '0-10': 0, '11-25': 0, '26-50': 0, '51-75': 0, '76-100': 0, '100+': 0 };
          for (const e of allEntries) {
            if (e.level <= 10) levelBuckets['0-10']++;
            else if (e.level <= 25) levelBuckets['11-25']++;
            else if (e.level <= 50) levelBuckets['26-50']++;
            else if (e.level <= 75) levelBuckets['51-75']++;
            else if (e.level <= 100) levelBuckets['76-100']++;
            else levelBuckets['100+']++;
          }
          const maxBucket = Math.max(...Object.values(levelBuckets), 1);
          const chartLines = Object.entries(levelBuckets).map(([range, count]) => {
            const barLen = Math.round((count / maxBucket) * 10);
            const bar = '█'.repeat(barLen) + '░'.repeat(10 - barLen);
            return `\`${range.padStart(5)}\` ${bar} ${count}`;
          });
  
          const embed = new EmbedBuilder()
            .setColor(0x9146ff)
            .setTitle('🏆 Leveling Leaderboard')
            .setDescription(lines.join('\n') || 'No leveling data yet.')
            .addFields(
              { name: '📊 Server Stats', value: `👥 **${totalUsers}** users tracked\n✨ **${totalXp.toLocaleString()}** total XP\n📈 **${avgLevel}** avg level\n🏅 **${maxLevel}** highest level\n🎖️ **${totalPrestige}** prestiged`, inline: true },
              { name: '📉 Level Distribution', value: chartLines.join('\n'), inline: true }
            )
            .setFooter({ text: `Top 15 by level • ${totalUsers} users total` })
            .setTimestamp();
  
          if (callerData && callerIdx >= 15) {
            embed.addFields({
              name: '📍 Your Rank',
              value: `#${callerIdx + 1} — **Lv.${callerData.level}** • ${callerData.xp.toLocaleString()} XP${callerData.prestige > 0 ? ` 🎖️P${callerData.prestige}` : ''}`,
              inline: false
            });
          }
  
          return interaction.reply({ embeds: [embed] });
        }
  
        case 'rank': {
          const userId = interaction.options.getUser('user')?.id || interaction.user.id;
          const member = await interaction.guild.members.fetch(userId);
          const data = leveling[userId] || { xp: 0, level: 0 };
  
          const currentLevel = data.level || 0;
          const prevNeeded = currentLevel <= 0 ? 0 : getXpForLevel(currentLevel);
          const nextLevel = currentLevel + 1;
          const nextNeeded = getXpForLevel(nextLevel);
          const progress = Math.max(0, data.xp - prevNeeded);
          const span = Math.max(1, nextNeeded - prevNeeded);
          const percent = Math.min(100, Math.floor((progress / span) * 100));
  
          // Create prettier progress bar
          const barLength = 25;
          const filledLength = Math.round((percent / 100) * barLength);
          const progressBar = '█'.repeat(filledLength) + '░'.repeat(barLength - filledLength);
          const progressDisplay = `${progressBar} ${percent}%\n${data.xp}/${nextNeeded} XP`;
  
          // Compute next role reward (no pings)
          let nextRewardText = 'No upcoming rewards';
          if (levelingConfig?.roleRewards) {
            const nextReward = Object.entries(levelingConfig.roleRewards)
              .map(([lvl, rid]) => ({ lvl: Number(lvl), rid }))
              .filter(r => r.rid && !Number.isNaN(r.lvl) && r.lvl > currentLevel)
              .sort((a, b) => a.lvl - b.lvl)[0];
  
            if (nextReward) {
              let roleName = `Role ${nextReward.rid}`;
              try {
                const roleObj = await interaction.guild.roles.fetch(nextReward.rid);
                if (roleObj) roleName = roleObj.name;
              } catch (e) {
                // ignore fetch errors; fallback stays
              }
              nextRewardText = `${roleName} at level ${nextReward.lvl}`;
            }
          }
  
          const embed = new EmbedBuilder()
            .setColor(0x9146ff)
            .setTitle(`${member.displayName}`)
            .setThumbnail(member.displayAvatarURL())
            .addFields(
              { name: 'Level', value: String(currentLevel), inline: true },
              { name: 'XP', value: `${data.xp} / ${nextNeeded} (next)`, inline: true },
              { name: 'Next LV Progress', value: progressDisplay, inline: false },
              { name: 'Next Reward', value: nextRewardText, inline: false }
            )
          return interaction.reply({ embeds: [embed] });
        }
        case 'xp': {
          const userId = interaction.options.getUser('user')?.id || interaction.user.id;
          const user = await interaction.client.users.fetch(userId);
          const data = leveling[userId] || { xp: 0, level: 0 };
  
          const currentLevel = data.level || 0;
          const prevNeeded = currentLevel <= 0 ? 0 : getXpForLevel(currentLevel);
          const nextLevel = currentLevel + 1;
          const nextNeeded = getXpForLevel(nextLevel);
          const progress = Math.max(0, data.xp - prevNeeded);
          const span = Math.max(1, nextNeeded - prevNeeded);
          const percent = Math.min(100, Math.floor((progress / span) * 100));
  
          const embed = new EmbedBuilder()
            .setColor(0x9146ff)
            .setTitle(`XP for ${user.username}`)
            .setThumbnail(user.displayAvatarURL())
            .addFields(
              { name: 'Current XP', value: String(data.xp), inline: true },
              { name: 'Next Level XP', value: String(nextNeeded), inline: true },
              { name: 'Progress', value: `${percent}%`, inline: true }
            )
            .setFooter({ text: `Level ${currentLevel}` });
  
          return interaction.reply({ embeds: [embed] });
        }
  
        case 'addxp': {
          const targetUser = interaction.options.getUser('user');
          const amount = interaction.options.getInteger('amount');
          const userId = targetUser.id;
  
          if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
          const prevXp = leveling[userId].xp;
          leveling[userId].xp += amount;
          saveState();
  
          const embed = new EmbedBuilder()
            .setColor(0x4caf50)
            .setTitle('XP Added')
            .setDescription(`Added **${amount}** XP to **${targetUser.username}**`)
            .addFields(
              { name: 'Previous XP', value: String(prevXp), inline: true },
              { name: 'New XP', value: String(leveling[userId].xp), inline: true },
              { name: 'Level', value: String(leveling[userId].level), inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL());
  
          addLog('info', `${interaction.user.username} added ${amount} XP to ${targetUser.username}`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        case 'removexp': {
          const targetUser = interaction.options.getUser('user');
          const amount = interaction.options.getInteger('amount');
          const userId = targetUser.id;
  
          if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
          const prevXp = leveling[userId].xp;
          leveling[userId].xp = Math.max(0, leveling[userId].xp - amount);
          saveState();
  
          const embed = new EmbedBuilder()
            .setColor(0xff6b6b)
            .setTitle('XP Removed')
            .setDescription(`Removed **${amount}** XP from **${targetUser.username}**`)
            .addFields(
              { name: 'Previous XP', value: String(prevXp), inline: true },
              { name: 'New XP', value: String(leveling[userId].xp), inline: true },
              { name: 'Level', value: String(leveling[userId].level), inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL());
  
          addLog('info', `${interaction.user.username} removed ${amount} XP from ${targetUser.username}`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        case 'setlevel': {
          const targetUser = interaction.options.getUser('user');
          const newLevel = interaction.options.getInteger('level');
          const userId = targetUser.id;
  
          if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
          const prevLevel = leveling[userId].level;
          leveling[userId].level = newLevel;
          saveState();
  
          const embed = new EmbedBuilder()
            .setColor(0x9146ff)
            .setTitle('Level Set')
            .setDescription(`Set **${targetUser.username}**'s level to **${newLevel}**`)
            .addFields(
              { name: 'Previous Level', value: String(prevLevel), inline: true },
              { name: 'New Level', value: String(newLevel), inline: true },
              { name: 'XP', value: String(leveling[userId].xp), inline: true }
            )
            .setThumbnail(targetUser.displayAvatarURL());
  
          addLog('info', `${interaction.user.username} set ${targetUser.username} level to ${newLevel}`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        case 'levelconfig': {
          const cfg = levelingConfig;
          const multiplierStatus = cfg.xpMultiplier > 1 
            ? `${cfg.xpMultiplier}x (${cfg.multiplierEndTime ? 'ends ' + new Date(cfg.multiplierEndTime).toLocaleString() : 'indefinite'})` 
            : 'None (1x)';
  
          const embed = new EmbedBuilder()
            .setColor(0x9146ff)
            .setTitle('Leveling Configuration')
            .addFields(
              { name: 'Message XP', value: `${cfg.xpPerMessageMin}-${cfg.xpPerMessageMax} XP`, inline: true },
              { name: 'Message Cooldown', value: `${Math.round(cfg.messageCooldownMs / 1000)}s`, inline: true },
              { name: 'Voice XP', value: `${cfg.xpPerVoiceMinute} XP/min`, inline: true },
              { name: 'Reaction XP', value: `${cfg.xpPerReaction} XP`, inline: true },
              { name: 'XP Multiplier', value: multiplierStatus, inline: true },
              { name: 'Level Milestones', value: cfg.levelMilestones.join(', ') || 'None', inline: true }
            );
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        case 'setxpmultiplier': {
          const multiplier = interaction.options.getNumber('multiplier');
          const hours = interaction.options.getInteger('hours');
  
          if (hours === 0) {
            levelingConfig.xpMultiplier = 1;
            levelingConfig.multiplierEndTime = null;
            saveState();
            return interaction.reply({ content: '✅ XP multiplier disabled (back to 1x)', ephemeral: true });
          }
  
          levelingConfig.xpMultiplier = multiplier;
          levelingConfig.multiplierEndTime = Date.now() + (hours * 60 * 60 * 1000);
          saveState();
  
          const endTime = new Date(levelingConfig.multiplierEndTime);
          return interaction.reply({ 
            content: `✅ XP multiplier set to **${multiplier}x** for **${hours} hour(s)**\nEnds: <t:${Math.floor(endTime.getTime() / 1000)}:R>`, 
            ephemeral: true 
          });
        }
        case 'prestige': {
          const userId = interaction.user.id;
          const currentLevel = leveling[userId]?.level || 0;
  
          if (currentLevel < 10) {
            return interaction.reply({ content: '❌ You must reach level 10 to prestige', ephemeral: true });
          }
  
          if (!prestige[userId]) prestige[userId] = 0;
          prestige[userId]++;
          
          if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
          leveling[userId].level = 0;
          leveling[userId].xp = 0;
          saveState();
  
          const embed = new EmbedBuilder()
            .setColor(0xffd700)
            .setTitle('🎖️ Prestige!')
            .setDescription(`${interaction.user.username} has reached prestige **${prestige[userId]}**!`)
            .addFields(
              { name: 'Previous Level', value: String(currentLevel), inline: true },
              { name: 'Prestige Rank', value: String(prestige[userId]), inline: true }
            );
  
          interaction.guild.channels.cache.forEach(channel => {
            if (channel.isTextBased() && channel.permissionsFor(interaction.guild.members.me).has('SendMessages')) {
              channel.send({ embeds: [embed] }).catch(() => {});
            }
          });
  
          addLog('info', `${interaction.user.username} reached prestige ${prestige[userId]}`);
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        case 'weekly': {
          const now = Date.now();
          const weekAgo = now - (7 * 24 * 60 * 60 * 1000);
  
          const top = Object.entries(weeklyLeveling)
            .filter(([, d]) => d.lastGain >= weekAgo)
            .sort((a, b) => (b[1].xp - a[1].xp))
            .slice(0, 10);
  
          const lines = top.map(([id, d], i) => {
            const medal = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i+1}`;
            return `${medal} <@${id}> — ${d.xp} XP`;
          });
  
          const embed = new EmbedBuilder()
            .setColor(0x4caf50)
            .setTitle('📊 Weekly Leaderboard (Last 7 days)')
            .setDescription(lines.join('\n') || 'No data yet.')
            .setFooter({ text: 'Top 10 by XP gained this week' });
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
  
        // ==================== GIVEAWAYS ====================
        case 'giveaway': {
          const prize = interaction.options.getString('prize');
          const winners = interaction.options.getInteger('winners');
          const duration = interaction.options.getInteger('duration');
          const channel = interaction.options.getChannel('channel') || interaction.channel;
  
          const giveawayId = `giveaway_${Date.now()}`;
          const endsAt = Date.now() + (duration * 60 * 1000);
  
          const embed = new EmbedBuilder()
            .setColor(0xFF6B9D)
            .setTitle('🎉 GIVEAWAY 🎉')
            .setDescription(`**Prize:** ${prize}\n**Winners:** ${winners}\n**Ends:** <t:${Math.floor(endsAt / 1000)}:R>`)
            .setFooter({ text: `React with 🎉 to enter | ID: ${giveawayId}` })
            .setTimestamp(endsAt);
  
          const msg = await channel.send({ embeds: [embed] });
          await msg.react('🎉');
  
          giveaways.push({
            id: giveawayId,
            messageId: msg.id,
            channelId: channel.id,
            prize,
            winners,
            endTime: endsAt,
            active: true,
            createdBy: interaction.user.id,
            entries: [],
            participants: []
          });
          saveState();
  
          addLog('info', `Giveaway started: ${prize} (${winners} winners, ${duration}min)`);
          return interaction.reply({ content: `✅ Giveaway started in ${channel}!`, ephemeral: true });
        }
        case 'giveawayend': {
          const giveawayId = interaction.options.getString('giveaway_id');
          const giveaway = giveaways.find(g => g.id === giveawayId && g.active);
  
          if (!giveaway) {
            return interaction.reply({ content: '❌ Giveaway not found or already ended', ephemeral: true });
          }
  
          await endGiveaway(giveaway);
          return interaction.reply({ content: '✅ Giveaway ended!', ephemeral: true });
        }
        case 'giveawayreroll': {
          const giveawayId = interaction.options.getString('giveaway_id');
          const giveaway = giveaways.find(g => g.id === giveawayId);
  
          if (!giveaway) {
            return interaction.reply({ content: '❌ Giveaway not found', ephemeral: true });
          }
  
          try {
            const channel = await client.channels.fetch(giveaway.channelId);
            const msg = await channel.messages.fetch(giveaway.messageId);
            const reaction = msg.reactions.cache.get('🎉');
            
            if (!reaction) {
              return interaction.reply({ content: '❌ No participants found', ephemeral: true });
            }
  
            const users = await reaction.users.fetch();
            const participants = users.filter(u => !u.bot).map(u => u.id);
  
            if (participants.length === 0) {
              return interaction.reply({ content: '❌ No valid participants', ephemeral: true });
            }
  
            const rerollWinners = [];
            const winnerCount = Math.min(giveaway.winners, participants.length);
            const shuffled = participants.sort(() => Math.random() - 0.5);
            
            for (let i = 0; i < winnerCount; i++) {
              rerollWinners.push(shuffled[i]);
            }
  
            const winnerMentions = rerollWinners.map(id => `<@${id}>`).join(', ');
            const embed = new EmbedBuilder()
              .setColor(0xFFD700)
              .setTitle('🎉 Giveaway Rerolled!')
              .setDescription(`**Prize:** ${giveaway.prize}\n**New Winner(s):** ${winnerMentions}`)
              .setTimestamp();
  
            await channel.send({ embeds: [embed] });
            addLog('info', `Giveaway rerolled: ${giveaway.id}`);
            return interaction.reply({ content: '✅ Giveaway rerolled!', ephemeral: true });
          } catch (err) {
            addLog('error', `Giveaway reroll error: ${err.message}`);
            return interaction.reply({ content: '❌ Failed to reroll giveaway', ephemeral: true });
          }
        }
        case 'giveawaylist': {
          const active = giveaways.filter(g => g.active);
          
          if (active.length === 0) {
            return interaction.reply({ content: '📭 No active giveaways', ephemeral: true });
          }
  
          const lines = active.map(g => {
            const endsIn = Math.floor((g.endsAt - Date.now()) / 60000);
            return `**${g.id}** - ${g.prize} (${g.winners} winners, ends in ${endsIn}min)`;
          });
  
          const embed = new EmbedBuilder()
            .setColor(0xFF6B9D)
            .setTitle('🎉 Active Giveaways')
            .setDescription(lines.join('\n'));
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
  
        // ==================== POLLS ====================
        case 'poll': {
          const question = interaction.options.getString('question');
          const optionsStr = interaction.options.getString('options');
          const duration = interaction.options.getInteger('duration') || 0;
          const channel = interaction.options.getChannel('channel') || interaction.channel;
  
          const options = optionsStr.split('|').map(o => o.trim()).filter(o => o.length > 0);
          
          if (options.length < 2) {
            return interaction.reply({ content: '❌ Need at least 2 options (separate with |)', ephemeral: true });
          }
          if (options.length > 10) {
            return interaction.reply({ content: '❌ Maximum 10 options allowed', ephemeral: true });
          }
  
          const pollId = `poll_${Date.now()}`;
          const endsAt = duration > 0 ? Date.now() + (duration * 60 * 1000) : null;
          const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
  
          const optionsText = options.map((opt, i) => `${emojis[i]} ${opt}`).join('\n');
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 ' + question)
            .setDescription(optionsText)
            .setFooter({ text: `ID: ${pollId}${endsAt ? ' | Ends' : ' | No time limit'}` });
  
          if (endsAt) {
            embed.setTimestamp(endsAt);
          }
  
          const msg = await channel.send({ embeds: [embed] });
          
          for (let i = 0; i < options.length; i++) {
            await msg.react(emojis[i]);
          }
  
          polls.push({
            id: pollId,
            messageId: msg.id,
            channelId: channel.id,
            question,
            options,
            endTime: endsAt,
            active: true,
            createdBy: interaction.user.id,
            votes: options.map(() => 0)
          });
          saveState();
  
          addLog('info', `Poll created: ${question} (${options.length} options)`);
          return interaction.reply({ content: `✅ Poll created in ${channel}!`, ephemeral: true });
        }
        case 'pollend': {
          const pollId = interaction.options.getString('poll_id');
          const poll = polls.find(p => p.id === pollId && p.active);
  
          if (!poll) {
            return interaction.reply({ content: '❌ Poll not found or already ended', ephemeral: true });
          }
  
          await endPoll(poll);
          return interaction.reply({ content: '✅ Poll ended!', ephemeral: true });
        }
        case 'pollresults': {
          const pollId = interaction.options.getString('poll_id');
          const poll = polls.find(p => p.id === pollId);
  
          if (!poll) {
            return interaction.reply({ content: '❌ Poll not found', ephemeral: true });
          }
  
          try {
            const channel = await client.channels.fetch(poll.channelId);
            const msg = await channel.messages.fetch(poll.messageId);
            const emojis = ['1️⃣', '2️⃣', '3️⃣', '4️⃣', '5️⃣', '6️⃣', '7️⃣', '8️⃣', '9️⃣', '🔟'];
            
            const results = [];
            let totalVotes = 0;
  
            for (let i = 0; i < poll.options.length; i++) {
              const reaction = msg.reactions.cache.get(emojis[i]);
              const count = reaction ? reaction.count - 1 : 0; // -1 for bot's reaction
              results.push({ option: poll.options[i], votes: count });
              totalVotes += count;
            }
  
            const resultsText = results
              .map(r => {
                const percentage = totalVotes > 0 ? Math.round((r.votes / totalVotes) * 100) : 0;
                const bar = '█'.repeat(Math.floor(percentage / 5));
                return `**${r.option}**\n${bar} ${r.votes} votes (${percentage}%)`;
              })
              .join('\n\n');
  
            const embed = new EmbedBuilder()
              .setColor(0x5865F2)
              .setTitle('📊 Poll Results')
              .setDescription(`**${poll.question}**\n\n${resultsText}`)
              .setFooter({ text: `Total votes: ${totalVotes} | ID: ${poll.id}` });
  
            return interaction.reply({ embeds: [embed], ephemeral: true });
          } catch (err) {
            addLog('error', `Poll results error: ${err.message}`);
            return interaction.reply({ content: '❌ Failed to fetch poll results', ephemeral: true });
          }
        }
        case 'polllist': {
          const active = polls.filter(p => p.active);
          
          if (active.length === 0) {
            return interaction.reply({ content: '📭 No active polls', ephemeral: true });
          }
  
          const lines = active.map(p => {
            const timeInfo = p.endsAt ? `ends in ${Math.floor((p.endsAt - Date.now()) / 60000)}min` : 'no time limit';
            return `**${p.id}** - ${p.question} (${timeInfo})`;
          });
  
          const embed = new EmbedBuilder()
            .setColor(0x5865F2)
            .setTitle('📊 Active Polls')
            .setDescription(lines.join('\n'));
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
  
        // ==================== REMINDERS ====================
        case 'remind': {
          const message = interaction.options.getString('message');
          const time = interaction.options.getInteger('time');
          const targetUser = interaction.options.getUser('user') || interaction.user;
          const channel = interaction.options.getChannel('channel') || interaction.channel;
  
          const reminderId = `reminder_${Date.now()}`;
          const reminderTime = Date.now() + (time * 60 * 1000);
  
          reminders.push({
            id: reminderId,
            message,
            userId: targetUser.id,
            channelId: channel.id,
            reminderTime,
            createdBy: interaction.user.id,
            active: true
          });
          saveState();
  
          addLog('info', `Reminder set: ${message} (${time}min for ${targetUser.username})`);
          return interaction.reply({ 
            content: `✅ Reminder set for ${targetUser} in ${time} minutes!\n**Message:** ${message}\n**When:** <t:${Math.floor(reminderTime / 1000)}:R>`, 
            ephemeral: true 
          });
        }
        case 'reminders': {
          const userId = interaction.user.id;
          const userReminders = reminders.filter(r => r.userId === userId && r.active);
  
          if (userReminders.length === 0) {
            return interaction.reply({ content: '📭 You have no active reminders', ephemeral: true });
          }
  
          const lines = userReminders.map(r => {
            const timeLeft = Math.floor((r.reminderTime - Date.now()) / 60000);
            return `**${r.id}** - "${r.message}" (in ${timeLeft}min)`;
          });
  
          const embed = new EmbedBuilder()
            .setColor(0xFFA500)
            .setTitle('⏰ Your Reminders')
            .setDescription(lines.join('\n'));
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        case 'cancelreminder': {
          const reminderId = interaction.options.getString('reminder_id');
          const reminder = reminders.find(r => r.id === reminderId && r.userId === interaction.user.id && r.active);
  
          if (!reminder) {
            return interaction.reply({ content: '❌ Reminder not found or already completed', ephemeral: true });
          }
  
          reminder.active = false;
          saveState();
  
          addLog('info', `Reminder cancelled: ${reminderId}`);
          return interaction.reply({ content: '✅ Reminder cancelled!', ephemeral: true });
        }
  
        // ==================== CUSTOM COMMANDS ====================
        case 'addcommand': {
          const name = interaction.options.getString('name').toLowerCase().replace(/^!/, '');
          const response = interaction.options.getString('response');
  
          if (customCommands.find(c => c.name === name)) {
            return interaction.reply({ content: `❌ Command !${name} already exists`, ephemeral: true });
          }
  
          customCommands.push({ name, response, createdBy: interaction.user.id, uses: 0 });
          saveState();
  
          addLog('info', `Custom command added: !${name}`);
          return interaction.reply({ content: `✅ Custom command !${name} created!`, ephemeral: true });
        }
        case 'removecommand': {
          const name = interaction.options.getString('name').toLowerCase().replace(/^!/, '');
          const index = customCommands.findIndex(c => c.name === name);
  
          if (index === -1) {
            return interaction.reply({ content: `❌ Command !${name} not found`, ephemeral: true });
          }
  
          customCommands.splice(index, 1);
          saveState();
  
          addLog('info', `Custom command removed: !${name}`);
          return interaction.reply({ content: `✅ Custom command !${name} removed!`, ephemeral: true });
        }
        case 'editcommand': {
          const name = interaction.options.getString('name').toLowerCase().replace(/^!/, '');
          const response = interaction.options.getString('response');
          const cmd = customCommands.find(c => c.name === name);
  
          if (!cmd) {
            return interaction.reply({ content: `❌ Command !${name} not found`, ephemeral: true });
          }
  
          cmd.response = response;
          saveState();
  
          addLog('info', `Custom command edited: !${name}`);
          return interaction.reply({ content: `✅ Custom command !${name} updated!`, ephemeral: true });
        }
        case 'cmd': {
          const name = interaction.options.getString('name').toLowerCase().replace(/^!/, '');
          const cmd = customCommands.find(c => c.name === name);
          if (!cmd) {
            return interaction.reply({ content: `❌ Command !${name} not found`, ephemeral: true });
          }
          if (cmd.paused) {
            return interaction.reply({ content: `⏸️ Command !${name} is paused`, ephemeral: true });
          }
  
          if (Array.isArray(cmd.allowedChannelIds) && cmd.allowedChannelIds.length > 0) {
            if (!cmd.allowedChannelIds.includes(interaction.channelId)) {
              return interaction.reply({ content: '❌ This command cannot be used in this channel.', ephemeral: true });
            }
          }
          if (Array.isArray(cmd.allowedRoleIds) && cmd.allowedRoleIds.length > 0) {
            const roles = interaction.member?.roles?.cache;
            const hasRole = roles && cmd.allowedRoleIds.some(r => roles.has(r));
            if (!hasRole) {
              return interaction.reply({ content: '❌ You do not have permission to use this command.', ephemeral: true });
            }
          }
  
          if (cmd.cooldownMs && cmd.cooldownMs > 0) {
            const key = cmd.name + ':' + interaction.user.id;
            const last = commandCooldowns.get(key) || 0;
            if (Date.now() - last < cmd.cooldownMs) {
              return interaction.reply({ content: '⏳ This command is on cooldown.', ephemeral: true });
            }
            commandCooldowns.set(key, Date.now());
          }
  
          const formattedResponse = formatCommandResponses(cmd);
          const payload = typeof formattedResponse === 'object' && formattedResponse !== null
            ? formattedResponse
            : { title: '', description: String(formattedResponse || ''), plain: String(formattedResponse || ''), imageUrl: cmd.imageUrl || '' };
  
          if (cmd.sendAsEmbed !== false) {
            const embed = new EmbedBuilder()
              .setColor(0x9146FF)
              .setTitle(payload.title || `💬 ${cmd.name} Command Response`)
              .setDescription(payload.description || '');
  
            const imageUrl = payload.imageUrl || cmd.imageUrl;
            let files = [];
  
            if (imageUrl) {
              const uploadsIndex = imageUrl.indexOf('/uploads/');
              if (uploadsIndex !== -1) {
                const filename = imageUrl.substring(uploadsIndex + '/uploads/'.length).split(/[?#]/)[0];
                const localPath = path.join(uploadsDir, filename);
                if (fs.existsSync(localPath)) {
                  const attachment = new AttachmentBuilder(localPath, { name: filename });
                  embed.setImage(`attachment://${filename}`);
                  files = [attachment];
                } else {
                  embed.setImage(imageUrl);
                }
              } else {
                embed.setImage(imageUrl);
              }
            }
  
            return interaction.reply({ embeds: [embed], files });
          }
  
          return interaction.reply({ content: payload.plain || '' });
        }
        case 'commands': {
          if (customCommands.length === 0) {
            return interaction.reply({ content: '📭 No custom commands created yet', ephemeral: true });
          }
  
          const lines = customCommands.map(c => `**!${c.name}** - Used ${c.uses} times`);
          const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle('📝 Custom Commands')
            .setDescription(lines.join('\n'))
            .setFooter({ text: `Total: ${customCommands.length} commands` });
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
  
        // ==================== NOTIFICATION FILTERS ====================
        case 'addfilter': {
          const keyword = interaction.options.getString('keyword').toLowerCase();
          const type = interaction.options.getString('type');
          const filterId = `filter_${Date.now()}`;
  
          notificationFilters.push({
            id: filterId,
            keyword,
            type,
            createdBy: interaction.user.id
          });
          saveState();
  
          addLog('info', `Notification filter added: ${keyword} (${type})`);
          return interaction.reply({ content: `✅ Filter added! Notifications with "${keyword}" in ${type} will be suppressed.\n**ID:** ${filterId}`, ephemeral: true });
        }
        case 'removefilter': {
          const filterId = interaction.options.getString('filter_id');
          const index = notificationFilters.findIndex(f => f.id === filterId);
  
          if (index === -1) {
            return interaction.reply({ content: '❌ Filter not found', ephemeral: true });
          }
  
          notificationFilters.splice(index, 1);
          saveState();
  
          addLog('info', `Notification filter removed: ${filterId}`);
          return interaction.reply({ content: '✅ Filter removed!', ephemeral: true });
        }
        case 'filters': {
          if (notificationFilters.length === 0) {
            return interaction.reply({ content: '📭 No notification filters active', ephemeral: true });
          }
  
          const lines = notificationFilters.map(f => `**${f.id}** - "${f.keyword}" (${f.type})`);
          const embed = new EmbedBuilder()
            .setColor(0x95A5A6)
            .setTitle('🔕 Notification Filters')
            .setDescription(lines.join('\n'))
            .setFooter({ text: `Total: ${notificationFilters.length} filters` });
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
  
        case 'rpg-test-mode': {
          rpgTestMode = !rpgTestMode;
          state.rpgTestMode = rpgTestMode;
          saveState();
          
          const embed = new EmbedBuilder()
            .setColor(rpgTestMode ? 0x00FF00 : 0xFF0000)
            .setTitle(rpgTestMode ? '🟢 RPG TEST MODE ENABLED' : '🔴 RPG TEST MODE DISABLED')
            .setDescription(rpgTestMode 
              ? '✅ Only RPG and dashboard commands are active.\n\nOther bot features are disabled to avoid duplicate actions while testing.\n\nPlayer data and progress are isolated to this test environment.'
              : '✅ All bot features are now active.\n\nYou can run stream alerts, custom commands, and other features alongside RPG commands.')
            .addFields(
              { name: 'Current Status', value: rpgTestMode ? '🟢 RPG Only' : '🔵 Full Bot', inline: true },
              { name: 'Available Commands', value: rpgTestMode ? '`/rpg`, `/leaderboard rpg`, `/dashboard`, `/rpg-test-mode`' : 'All commands', inline: true }
            )
            .setFooter({ text: 'Run this command again to toggle back' });
  
          addLog('info', `RPG Test Mode ${rpgTestMode ? 'ENABLED' : 'DISABLED'}`);
          return interaction.reply({ embeds: [embed], ephemeral: false });
        }
  
        case 'pet': {
          const sub = interaction.options.getSubcommand();
          const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
  
          if (sub === 'add') {
            const petId = interaction.options.getString('pet');
            const quantity = interaction.options.getInteger('quantity') || 1;
            const givenBy = interaction.user.displayName || interaction.user.username;
            const catalogEntry = (petsData.catalog || []).find(c => c.id === petId);
            if (!catalogEntry) {
              return interaction.reply({ content: '❌ Pet not found in catalog.', ephemeral: true });
            }
            // Store as PENDING - requires admin approval in the dashboard
            petsData.pendingPets = petsData.pendingPets || [];
            for (let i = 0; i < quantity; i++) {
              petsData.pendingPets.push({
                id: `pending-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
                petId,
                requestedBy: interaction.user.id,
                requestedByName: interaction.user.displayName || interaction.user.username,
                requestedByAvatar: interaction.user.displayAvatarURL({ size: 64 }),
                givenBy: givenBy,
                requestedAt: new Date().toISOString(),
                status: 'pending'
              });
            }
            saveJSON(PETS_PATH, petsData);
            const pendingCount = petsData.pendingPets.filter(p => p.status === 'pending').length;
            addLog('info', `Pet "${catalogEntry.name}" x${quantity} submitted for approval by ${interaction.user.username} (${pendingCount} pending total)`);
            notifyPetsChange();
  
            const petEmbed = new EmbedBuilder()
              .setColor(0xf39c12)
              .setTitle(`${catalogEntry.emoji} ${quantity > 1 ? `${quantity}x ` : ''}Pet Submitted for Approval!`)
              .setDescription(`**${catalogEntry.name}** has been submitted and is waiting for admin approval.`)
              .addFields(
                { name: 'Rarity', value: catalogEntry.rarity.charAt(0).toUpperCase() + catalogEntry.rarity.slice(1), inline: true },
                { name: 'Requested by', value: interaction.user.displayName || interaction.user.username, inline: true },
                { name: 'Status', value: '⏳ Pending Approval', inline: true },
                { name: '🎁 Given by', value: givenBy, inline: true },
                ...(catalogEntry.bonus ? [{ name: '⚡ Bonus', value: catalogEntry.bonus, inline: true }] : [])
              )
              .setFooter({ text: 'An admin will review this in the dashboard' });
  
            if (catalogEntry.animatedUrl || catalogEntry.imageUrl) {
              const imgUrl = catalogEntry.animatedUrl || catalogEntry.imageUrl;
              if (imgUrl.startsWith('http')) {
                petEmbed.setThumbnail(imgUrl);
              }
            }
  
            const reply = await interaction.reply({ embeds: [petEmbed], fetchReply: true });
            setTimeout(() => reply.delete().catch(() => {}), 15000);
            return;
          }
  
          if (sub === 'list') {
            const pets = petsData.pets || [];
            if (pets.length === 0) {
              return interaction.reply({ content: '🐾 No pets in the collection yet! Use `/pet add` to add the first one.', ephemeral: false });
            }
  
            const catalog = petsData.catalog || [];
            const categories = petsData.categories || [...new Set(catalog.map(p => p.category).filter(Boolean))];
            const catIcons = { 'Legacy Companions': '🏛️', 'Fallen Spirits': '👻', 'Shallow Waters': '🌊', 'Exclusive Companions': '⭐' };
  
            // Group owned pets by category
            const grouped = {};
            for (const p of pets) {
              const cat = catalog.find(c => c.id === p.petId);
              const category = cat?.category || 'Other';
              if (!grouped[category]) grouped[category] = [];
              grouped[category].push(p);
            }
  
            const lines = [];
            for (const cat of categories) {
              if (!grouped[cat] || grouped[cat].length === 0) continue;
              lines.push(`\n**${catIcons[cat] || '📂'} ${cat}**`);
              for (const p of grouped[cat]) {
                const entry = catalog.find(c => c.id === p.petId);
                const emoji = entry?.emoji || '🐾';
                const name = entry?.name || p.petId;
                const rarity = entry?.rarity || 'common';
                const rarityIcon = rarity === 'legendary' ? '⭐' : rarity === 'rare' ? '💎' : rarity === 'uncommon' ? '🟢' : '⚪';
                // Group duplicates: count how many of same petId
                const alreadyListed = lines.find(l => l.includes(`**${emoji} ${name}**`));
                if (alreadyListed) continue;
                const pCount = pets.filter(pp => pp.petId === p.petId).length;
                lines.push(`${rarityIcon} **${emoji} ${name}**${pCount > 1 ? ` x${pCount}` : ''}${entry?.bonus ? ` — ⚡ ${entry.bonus}` : ''}`);
              }
            }
  
            const listEmbed = new EmbedBuilder()
              .setColor(0x9146ff)
              .setTitle('🐾 Server Pet Collection')
              .setDescription(lines.join('\n').trim())
              .setFooter({ text: `${pets.length} pet${pets.length !== 1 ? 's' : ''} total • Use /pet add to add more` });
  
            const listReply = await interaction.reply({ embeds: [listEmbed], fetchReply: true });
            setTimeout(() => listReply.delete().catch(() => {}), 30000);
            return;
          }
  
          if (sub === 'remove') {
            // Admin only
            if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
              return interaction.reply({ content: '❌ Only administrators can remove pets.', ephemeral: true });
            }
            const petId = interaction.options.getString('pet');
            const quantity = interaction.options.getInteger('quantity') || 1;
            const catalogEntry = (petsData.catalog || []).find(c => c.id === petId);
            if (!catalogEntry) {
              return interaction.reply({ content: '❌ Pet not found in catalog.', ephemeral: true });
            }
            petsData.pets = petsData.pets || [];
            let removedCount = 0;
            for (let i = 0; i < quantity; i++) {
              const idx = petsData.pets.findIndex(p => p.petId === petId);
              if (idx === -1) break;
              petsData.pets.splice(idx, 1);
              removedCount++;
            }
            if (removedCount === 0) {
              return interaction.reply({ content: `❌ No **${catalogEntry.emoji} ${catalogEntry.name}** in the collection to remove.`, ephemeral: true });
            }
            saveJSON(PETS_PATH, petsData);
            const remainCount = petsData.pets.filter(p => p.petId === petId).length;
            addLog('info', `Pet "${catalogEntry.name}" x${removedCount} removed by ${interaction.user.username} (${remainCount} remaining)`);
            const reply = await interaction.reply({ content: `✅ Removed **${removedCount}x ${catalogEntry.emoji} ${catalogEntry.name}**${remainCount > 0 ? ` (${remainCount} remaining)` : ' (none left)'}`, fetchReply: true });
            setTimeout(() => reply.delete().catch(() => {}), 10000);
            return;
          }
  
          return interaction.reply({ content: '❌ Unknown subcommand.', ephemeral: true });
        }
  
        case 'ai': {
          // Admin only
          if (!interaction.memberPermissions?.has(PermissionsBitField.Flags.Administrator)) {
            return interaction.reply({ content: '⛔ Admin only.', ephemeral: true });
          }
          const aiSub = interaction.options.getSubcommand();
          
          if (aiSub === 'toggle') {
            const enabled = interaction.options.getBoolean('enabled');
            smartBot.updateConfig({ enabled });
            debouncedSaveState();
            return interaction.reply({ content: enabled ? '🤖 Smart Bot AI **enabled**! I\'ll start chatting.' : '🤖 Smart Bot AI **disabled**.', ephemeral: true });
          }
          
          if (aiSub === 'config') {
            const updates = {};
            const chance = interaction.options.getNumber('reply_chance');
            const cd = interaction.options.getInteger('cooldown');
            const minMsgs = interaction.options.getInteger('min_messages');
            const personality = interaction.options.getString('personality');
            if (chance !== null) updates.replyChance = chance / 100;
            if (cd !== null) updates.cooldownMs = cd * 1000;
            if (minMsgs !== null) updates.minMessagesBetween = minMsgs;
            if (personality) updates.personality = personality;
            smartBot.updateConfig(updates);
            debouncedSaveState();
            const cfg = smartBot.getConfig();
            return interaction.reply({
              content: `🤖 **AI Config Updated**\n` +
                `> Enabled: ${cfg.enabled ? '✅' : '❌'}\n` +
                `> Reply chance: ${(cfg.replyChance * 100).toFixed(2)}%\n` +
                `> Cooldown: ${cfg.cooldownMs / 1000}s\n` +
                `> Min messages between: ${cfg.minMessagesBetween}\n` +
                `> Personality: ${cfg.personality}\n` +
                `> Markov chance: ${(cfg.markovChance * 100).toFixed(0)}%`,
              ephemeral: true
            });
          }
          
          if (aiSub === 'channel') {
            const channel = interaction.options.getChannel('channel');
            const action = interaction.options.getString('action');
            const cfg = smartBot.getConfig();
            if (action === 'allow') {
              if (!cfg.allowedChannels.includes(channel.id)) cfg.allowedChannels.push(channel.id);
              cfg.ignoredChannels = cfg.ignoredChannels.filter(id => id !== channel.id);
              smartBot.updateConfig({ allowedChannels: cfg.allowedChannels, ignoredChannels: cfg.ignoredChannels });
              debouncedSaveState();
              return interaction.reply({ content: `✅ AI can now chat in <#${channel.id}>`, ephemeral: true });
            } else if (action === 'block') {
              if (!cfg.ignoredChannels.includes(channel.id)) cfg.ignoredChannels.push(channel.id);
              cfg.allowedChannels = cfg.allowedChannels.filter(id => id !== channel.id);
              smartBot.updateConfig({ allowedChannels: cfg.allowedChannels, ignoredChannels: cfg.ignoredChannels });
              debouncedSaveState();
              return interaction.reply({ content: `🚫 AI blocked from <#${channel.id}>`, ephemeral: true });
            } else {
              cfg.allowedChannels = cfg.allowedChannels.filter(id => id !== channel.id);
              cfg.ignoredChannels = cfg.ignoredChannels.filter(id => id !== channel.id);
              smartBot.updateConfig({ allowedChannels: cfg.allowedChannels, ignoredChannels: cfg.ignoredChannels });
              debouncedSaveState();
              return interaction.reply({ content: `🔄 Restrictions removed for <#${channel.id}>`, ephemeral: true });
            }
          }
          
          if (aiSub === 'stats') {
            const s = smartBot.getStats();
            const topTopics = Object.entries(s.topicReplies || {}).sort(([,a],[,b]) => b - a).slice(0, 5);
            const topicStr = topTopics.length > 0 ? topTopics.map(([t, c]) => `${t}: ${c}`).join(', ') : 'None yet';
            return interaction.reply({
              content: `🤖 **Smart Bot AI Stats**\n` +
                `> Total replies: **${s.totalReplies}**\n` +
                `> Template replies: ${s.templateReplies} | Markov replies: ${s.markovReplies}\n` +
                `> Mention replies: ${s.mentionReplies}\n` +
                `> Markov brain: ${s.markov.chainSize} word pairs, ${s.markov.totalTrained} messages trained\n` +
                `> Top topics: ${topicStr}\n` +
                `> Last reply: ${s.lastReplyAt || 'Never'}`,
              ephemeral: true
            });
          }
          
          return interaction.reply({ content: 'Unknown AI subcommand', ephemeral: true });
        }
  
        case 'mypets': {
          const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
          const userId = interaction.user.id;
          const userName = interaction.user.displayName || interaction.user.username;
          const catalog = petsData.catalog || [];
          const allPets = petsData.pets || [];
          const pendingPets = (petsData.pendingPets || []).filter(p => p.requestedBy === userId && p.status === 'pending');
  
          // Find pets this user added (approved)
          const userPets = allPets.filter(p => p.addedBy === userId);
          // Find pets given by this user's name
          const givenPets = allPets.filter(p => p.givenBy && (p.givenBy === userName || p.addedBy === userId));
  
          // Build unique pet list
          const petMap = {};
          for (const p of givenPets) {
            if (!petMap[p.petId]) petMap[p.petId] = { count: 0, dates: [] };
            petMap[p.petId].count++;
            petMap[p.petId].dates.push(p.addedAt);
          }
  
          const lines = [];
  
          // Approved pets section
          if (Object.keys(petMap).length > 0) {
            lines.push('**✅ Your Approved Pets:**');
            for (const [petId, info] of Object.entries(petMap)) {
              const cat = catalog.find(c => c.id === petId);
              if (!cat) continue;
              const rarityIcon = cat.rarity === 'legendary' ? '⭐' : cat.rarity === 'rare' ? '💎' : cat.rarity === 'uncommon' ? '🟢' : '⚪';
              const lastDate = info.dates.sort().pop();
              const dateStr = lastDate ? ` — <t:${Math.floor(new Date(lastDate).getTime() / 1000)}:R>` : '';
              lines.push(`${rarityIcon} ${cat.emoji} **${cat.name}**${info.count > 1 ? ` x${info.count}` : ''}${dateStr}`);
            }
          }
  
          // Pending pets section
          if (pendingPets.length > 0) {
            if (lines.length > 0) lines.push('');
            lines.push('**⏳ Pending Approval:**');
            for (const p of pendingPets) {
              const cat = catalog.find(c => c.id === p.petId);
              if (!cat) continue;
              const dateStr = ` — <t:${Math.floor(new Date(p.requestedAt).getTime() / 1000)}:R>`;
              lines.push(`⏳ ${cat.emoji} **${cat.name}**${dateStr}`);
            }
          }
  
          if (lines.length === 0) {
            return interaction.reply({ content: '🐾 You haven\'t added any pets yet! Use `/pet add` to submit a pet for approval.', ephemeral: true });
          }
  
          const totalApproved = Object.values(petMap).reduce((s, v) => s + v.count, 0);
          const totalPending = pendingPets.length;
  
          const embed = new EmbedBuilder()
            .setColor(0x9146ff)
            .setTitle(`🐾 ${userName}'s Pet Contributions`)
            .setThumbnail(interaction.user.displayAvatarURL({ size: 128 }))
            .setDescription(lines.join('\n').trim())
            .addFields(
              { name: '✅ Approved', value: String(totalApproved), inline: true },
              { name: '⏳ Pending', value: String(totalPending), inline: true },
              { name: '📊 Total Submitted', value: String(totalApproved + totalPending), inline: true }
            )
            .setFooter({ text: 'Pets added via /pet add require admin approval' });
  
          return interaction.reply({ embeds: [embed], ephemeral: true });
        }
  
        // ========== AFK COMMAND ==========
        case 'afk': {
          const reason = interaction.options.getString('reason') || 'AFK';
          afkUsers[interaction.user.id] = { reason, timestamp: Date.now(), username: interaction.user.username };
          saveState();
          return interaction.reply({ content: `💤 ${interaction.user.username} is now AFK: **${reason}**` });
        }
  
        // ========== TEMPBAN COMMAND ==========
        case 'tempban': {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.BanMembers)) {
            return interaction.reply({ content: '❌ You need Ban Members permission.', ephemeral: true });
          }
          const target = interaction.options.getUser('user');
          const duration = interaction.options.getInteger('duration');
          const reason = interaction.options.getString('reason') || 'No reason';
          const unbanAt = Date.now() + duration * 60 * 1000;
          try {
            await interaction.guild.members.ban(target.id, { reason: `Tempban (${duration}min): ${reason}` });
            tempBans.push({ userId: target.id, guildId: interaction.guild.id, unbanAt, reason, moderator: interaction.user.tag, moderatorId: interaction.user.id });
            saveState();
            const embed = new EmbedBuilder()
              .setColor(0xE74C3C)
              .setTitle('⏱️ Temporary Ban')
              .setDescription(`**${target.tag}** has been temporarily banned.`)
              .addFields(
                { name: 'Duration', value: `${duration} minutes`, inline: true },
                { name: 'Reason', value: reason, inline: true },
                { name: 'Unban', value: `<t:${Math.floor(unbanAt / 1000)}:R>`, inline: true }
              );
            return interaction.reply({ embeds: [embed] });
          } catch (e) {
            return interaction.reply({ content: `❌ Failed to ban: ${e.message}`, ephemeral: true });
          }
        }
  
        // ========== TEMPROLE COMMAND ==========
        case 'temprole': {
          if (!interaction.member.permissions.has(PermissionsBitField.Flags.ManageRoles)) {
            return interaction.reply({ content: '❌ You need Manage Roles permission.', ephemeral: true });
          }
          const targetUser = interaction.options.getUser('user');
          const role = interaction.options.getRole('role');
          const durationMin = interaction.options.getInteger('duration');
          const removeAt = Date.now() + durationMin * 60 * 1000;
          try {
            const member = await interaction.guild.members.fetch(targetUser.id);
            await member.roles.add(role.id);
            tempRoles.push({ userId: targetUser.id, roleId: role.id, guildId: interaction.guild.id, removeAt, addedBy: interaction.user.tag });
            saveState();
            return interaction.reply({ content: `✅ Gave **${role.name}** to ${targetUser.tag} for ${durationMin} minutes (expires <t:${Math.floor(removeAt / 1000)}:R>)` });
          } catch (e) {
            return interaction.reply({ content: `❌ Failed: ${e.message}`, ephemeral: true });
          }
        }
  
        // ========== SUGGESTION COMMAND ==========
        case 'suggest': {
          const idea = interaction.options.getString('idea');
          const suggestion = {
            id: crypto.randomUUID().slice(0, 8),
            text: idea,
            author: interaction.user.tag,
            authorId: interaction.user.id,
            timestamp: Date.now(),
            status: 'pending',
            upvotes: [],
            downvotes: [],
            statusHistory: []
          };
          suggestions.push(suggestion);
          saveState();
  
          // Post to suggestion channel if configured
          const suggestCh = suggestionSettings.channelId ? await client.channels.fetch(suggestionSettings.channelId).catch(() => null) : null;
          if (suggestCh) {
            const embed = new EmbedBuilder()
              .setColor(0x3498DB)
              .setTitle('💡 New Suggestion')
              .setDescription(idea)
              .setFooter({ text: `By ${interaction.user.tag} | ID: ${suggestion.id}` })
              .setTimestamp();
            const row = new ActionRowBuilder().addComponents(
              new ButtonBuilder().setCustomId(`suggest_up_${suggestion.id}`).setLabel('👍 0').setStyle(ButtonStyle.Success),
              new ButtonBuilder().setCustomId(`suggest_down_${suggestion.id}`).setLabel('👎 0').setStyle(ButtonStyle.Danger)
            );
            const posted = await suggestCh.send({ embeds: [embed], components: [row] }).catch(() => null);
            if (posted) { suggestion.messageId = posted.id; suggestion.channelId = suggestCh.id; saveState(); }
          }
  
          return interaction.reply({ content: `✅ Suggestion submitted! (ID: \`${suggestion.id}\`)`, ephemeral: true });
        }
  
        // ========== RANK COMMAND ==========
        case 'rank': {
          const targetUsr = interaction.options.getUser('user') || interaction.user;
          const userData = leveling[targetUsr.id] || { xp: 0, level: 0 };
          const nextLevelXp = getXpForLevel(userData.level + 1);
          const progress = Math.min(100, Math.round((userData.xp / nextLevelXp) * 100));
          const barFull = Math.round(progress / 5);
          const bar = '█'.repeat(barFull) + '░'.repeat(20 - barFull);
  
          // Calculate rank position
          const sorted = Object.entries(leveling).sort((a, b) => (b[1].xp || 0) - (a[1].xp || 0));
          const rankPos = sorted.findIndex(([id]) => id === targetUsr.id) + 1;
  
          const embed = new EmbedBuilder()
            .setColor(0x9146FF)
            .setTitle(`🏅 Rank Card — ${targetUsr.displayName || targetUsr.username}`)
            .setThumbnail(targetUsr.displayAvatarURL({ size: 256 }))
            .addFields(
              { name: 'Level', value: `**${userData.level}**`, inline: true },
              { name: 'XP', value: `**${userData.xp.toLocaleString()}** / ${nextLevelXp.toLocaleString()}`, inline: true },
              { name: 'Rank', value: `#${rankPos || '?'}`, inline: true },
              { name: 'Progress', value: `\`${bar}\` ${progress}%` }
            )
            .setFooter({ text: `${targetUsr.tag}` })
            .setTimestamp();
  
          return interaction.reply({ embeds: [embed] });
        }
  
        default:
          return interaction.reply({ content: 'Unknown command', ephemeral: true });
      }
    } catch (err) {
      addLog('error', `Command error (${interaction.commandName}): ${err.message}`);
      console.error(err);
      
      // Try to reply - but handle case where already replied
      try {
        if (interaction.deferred) {
          return await interaction.editReply({ content: `❌ Error: ${err.message}` });
        } else {
          return await interaction.reply({ content: `❌ Error: ${err.message}`, ephemeral: true });
        }
      } catch (replyErr) {
        addLog('error', `Failed to send error reply: ${replyErr.message}`);
      }
    }
  });
   // end interactionCreate
  
  const commandCooldowns = new Map();
  const slashCommandCooldowns = new Map();
  
  function logCommandUsage(commandKey, user) {
    const key = String(commandKey || '').toLowerCase();
    if (!key) return;
    if (!commandUsage[key]) {
      commandUsage[key] = { total: 0, lastUsed: null, history: [], userCounts: {} };
    }
    const entry = commandUsage[key];
    entry.total = (entry.total || 0) + 1;
    entry.lastUsed = new Date().toISOString();
    if (!Array.isArray(entry.history)) entry.history = [];
    entry.history.unshift({
      userId: user?.id || 'unknown',
      username: user?.username || 'Unknown',
      timestamp: entry.lastUsed
    });
    if (entry.history.length > 200) entry.history = entry.history.slice(0, 200);
  
    if (!entry.userCounts) entry.userCounts = {};
    const uKey = user?.id || 'unknown';
    if (!entry.userCounts[uKey]) entry.userCounts[uKey] = { count: 0, username: user?.username || 'Unknown' };
    entry.userCounts[uKey].count += 1;
    entry.userCounts[uKey].username = user?.username || entry.userCounts[uKey].username;
  
    saveState();
  }
  
  function isCommandAllowed(cmd, msg) {
    if (Array.isArray(cmd.allowedChannelIds) && cmd.allowedChannelIds.length > 0) {
      if (!cmd.allowedChannelIds.includes(msg.channel.id)) return false;
    }
    if (Array.isArray(cmd.allowedRoleIds) && cmd.allowedRoleIds.length > 0) {
      const memberRoles = msg.member?.roles?.cache;
      if (!memberRoles) return false;
      const hasRole = cmd.allowedRoleIds.some(r => memberRoles.has(r));
      if (!hasRole) return false;
    }
    return true;
  }
  
  function formatCommandResponses(cmd, msgContext) {
    const rawLines = [];
    if (Array.isArray(cmd.response)) {
      cmd.response.forEach(r => {
        const line = String(r || '').trim();
        if (line) rawLines.push(line);
      });
    } else if (typeof cmd.response === 'string') {
      cmd.response.split('\n').forEach(r => {
        const line = String(r || '').trim();
        if (line) rawLines.push(line);
      });
    }
  
    // ========== ADVANCED VARIABLE REPLACEMENT ==========
    if (msgContext) {
      const guild = msgContext.guild;
      const member = msgContext.member;
      const userData = leveling[msgContext.author?.id] || { xp: 0, level: 0 };
      const contentAfterCmd = msgContext.content?.slice(1 + (cmd.name?.length || 0)).trim() || '';
      const replacements = {
        '{user}': msgContext.author?.username || 'User',
        '{mention}': `<@${msgContext.author?.id}>`,
        '{displayname}': member?.displayName || msgContext.author?.username || 'User',
        '{server}': guild?.name || 'Server',
        '{channel}': `<#${msgContext.channel?.id}>`,
        '{members}': String(guild?.memberCount || 0),
        '{date}': new Date().toLocaleDateString(),
        '{time}': new Date().toLocaleTimeString(),
        '{level}': String(userData.level),
        '{xp}': String(userData.xp),
        '{uses}': String(cmd.uses || 0),
        '{args}': contentAfterCmd,
        '{userid}': msgContext.author?.id || ''
      };
      for (let i = 0; i < rawLines.length; i++) {
        for (const [key, val] of Object.entries(replacements)) {
          rawLines[i] = rawLines[i].replaceAll(key, val);
        }
        // Handle {random:x,y,z} pattern — pick one at random
        rawLines[i] = rawLines[i].replace(/\{random:([^}]+)\}/g, (_, opts) => {
          const choices = opts.split(',').map(s => s.trim()).filter(Boolean);
          return choices.length > 0 ? choices[Math.floor(Math.random() * choices.length)] : '';
        });
        // Handle {pick:1-100} — random number range
        rawLines[i] = rawLines[i].replace(/\{pick:(\d+)-(\d+)\}/g, (_, lo, hi) => {
          const min = parseInt(lo, 10), max = parseInt(hi, 10);
          return String(min + Math.floor(Math.random() * (max - min + 1)));
        });
      }
    }
  
    const isImageUrl = (url) => /\.(png|jpe?g|gif|webp)(\?|#|$)/i.test(url);
    const urlRegex = /https?:\/\/\S+/gi;
    const textLines = [];
    const linkLines = [];
    let imageUrl = '';
  
    rawLines.forEach(line => {
      const urls = (line.match(urlRegex) || []).map(u => u.trim());
      if (!urls.length) {
        textLines.push(line);
        return;
      }
  
      urls.forEach(url => {
        if (!imageUrl && isImageUrl(url)) {
          imageUrl = url;
        } else if (!isImageUrl(url)) {
          linkLines.push(url);
        }
      });
    });
  
    const title = textLines.shift() || '';
    const description = (linkLines.length ? linkLines : textLines).join('\n');
  
    return {
      title,
      description,
      plain: rawLines.join('\n'),
      imageUrl: cmd.imageUrl || imageUrl
    };
  }
  
  async function sendCommandResponse(cmd, msg, contentText) {
    const messages = [];
    if (cmd.sendAsEmbed !== false) {
      const payload = typeof contentText === 'object' && contentText !== null
        ? contentText
        : { title: '', description: String(contentText || ''), plain: String(contentText || '') };
      const embed = new EmbedBuilder()
        .setColor(0x9146FF)
        .setTitle(payload.title || `💬 ${cmd.name} Command Response`)
        .setDescription(payload.description || '');
      const imageUrl = payload.imageUrl || cmd.imageUrl;
      let files = [];
      if (imageUrl) {
        const uploadsIndex = imageUrl.indexOf('/uploads/');
        if (uploadsIndex !== -1) {
          const filename = imageUrl.substring(uploadsIndex + '/uploads/'.length).split(/[?#]/)[0];
          const localPath = path.join(uploadsDir, filename);
          if (fs.existsSync(localPath)) {
            const attachment = new AttachmentBuilder(localPath, { name: filename });
            embed.setImage(`attachment://${filename}`);
            files = [attachment];
          } else {
            embed.setImage(imageUrl);
          }
        } else {
          embed.setImage(imageUrl);
        }
      }
      const replyMessage = await msg.reply({ embeds: [embed], files });
      messages.push(replyMessage);
    } else {
      const plain = (typeof contentText === 'object' && contentText !== null) ? contentText.plain : contentText;
      const replyMessage = await msg.reply({ content: plain || '' });
      messages.push(replyMessage);
      if (cmd.imageUrl) {
        const imageMsg = await msg.channel.send({ files: [{ attachment: cmd.imageUrl }] });
        messages.push(imageMsg);
      }
    }
  
    if (cmd.autoDeleteDelayMs && cmd.autoDeleteDelayMs > 0) {
      setTimeout(() => {
        messages.forEach(m => m.delete().catch(() => {}));
        if (msg.deletable) msg.delete().catch(() => {});
      }, cmd.autoDeleteDelayMs);
    }
  }
  
  client.on('messageCreate', async (msg) => {
    if (msg.author.bot) return;

    // F36: ModMail — handle DMs before guild guard
    if (!msg.guild && featureHooks) {
      const handled = await featureHooks.handleModMailDM(msg);
      if (handled) return;
      return; // Skip non-guild messages for everything else
    }

    // Feature hooks: sticky messages, auto-thread, media-only, auto-responder, heatmap
    if (featureHooks) {
      // F37: Media-only enforcement (may delete message)
      const blocked = await featureHooks.enforceMediaOnly(msg);
      if (blocked) return;
      featureHooks.handleStickyMessage(msg.channel.id);
      featureHooks.handleAutoThread(msg);
      featureHooks.trackMessageRate(msg.channel.id);
      featureHooks.trackChannelActivity(msg.channel.id, msg.author.id);
      featureHooks.trackEngagementHeatmap();
      // F36: ModMail reply (staff → user)
      featureHooks.handleModMailReply(msg);
      // F48: Auto-responder
      const autoReply = featureHooks.checkAutoResponder(msg);
      if (autoReply) {
        msg.channel.send(autoReply).catch(() => {});
      }
    }

    // ========== AFK SYSTEM ==========
    // Remove AFK status when user sends a message
    if (afkUsers[msg.author.id]) {
      const afkData = afkUsers[msg.author.id];
      delete afkUsers[msg.author.id];
      saveState();
      msg.reply({ content: `👋 Welcome back **${msg.author.username}**! You were AFK for <t:${Math.floor(afkData.timestamp / 1000)}:R>` }).then(m => setTimeout(() => m.delete().catch(() => {}), 5000)).catch(() => {});
    }
    // Notify when mentioning an AFK user
    for (const mentioned of msg.mentions.users.values()) {
      if (afkUsers[mentioned.id]) {
        const afk = afkUsers[mentioned.id];
        msg.reply({ content: `💤 **${mentioned.username}** is AFK: ${afk.reason} (since <t:${Math.floor(afk.timestamp / 1000)}:R>)` }).then(m => setTimeout(() => m.delete().catch(() => {}), 8000)).catch(() => {});
      }
    }
  
    // ── Smart Bot AI processing ──
    try {
      // Auto-detect bot name on first message
      if (!smartBot.config.botName && msg.guild.members.me) {
        smartBot.updateConfig({ botName: msg.guild.members.me.displayName || client.user.username });
      }
  
      // ── Sync external data to SmartBot (leveling, stream history) ──
      if (typeof leveling !== 'undefined') smartBot.levelingData = leveling;
      if (typeof history !== 'undefined' && Array.isArray(history)) smartBot.streamHistory = history;
  
      // ── SmartBot User Memory — provide per-user context ──
      smartBot.userMemory = userMemory;
  
      const aiReply = await smartBot.processMessage(msg, client.user.id);
  
      // ── Learn user facts from conversation ──
      if (aiReply && msg.content.length > 20) {
        const uid = msg.author.id;
        if (!userMemory[uid]) userMemory[uid] = { facts: [], lastInteraction: 0 };
        userMemory[uid].lastInteraction = Date.now();
        // Simple fact extraction: "I am X", "my name is X", "I like X"
        const factPatterns = [
          /\bmy (?:name is|real name is) (\w+)/i,
          /\bi(?:'m| am) (?:a |an )?(\w[\w\s]{1,20})/i,
          /\bi (?:like|love|enjoy) (.{3,30})/i,
          /\bi(?:'m| am) from (.{3,30})/i
        ];
        for (const pat of factPatterns) {
          const match = msg.content.match(pat);
          if (match && match[1]) {
            const fact = match[0].trim().slice(0, 80);
            if (!userMemory[uid].facts.includes(fact)) {
              userMemory[uid].facts.push(fact);
              if (userMemory[uid].facts.length > 10) userMemory[uid].facts.shift();
              debouncedSaveState();
            }
            break;
          }
        }
      }
  
      if (aiReply) {
        // Handle special reply types (reaction, multi-message, typo)
        if (aiReply.__type === 'reaction') {
          // Emoji reaction instead of text reply (#3)
          try { await msg.react(aiReply.emoji); } catch {}
        } else if (aiReply.__type === 'multi') {
          // Multi-message or typo correction (#6 #8)
          const parts = aiReply.parts;
          const baseDelay = 1000 + Math.floor(Math.random() * 1500);
          try { await msg.channel.sendTyping(); } catch {}
          setTimeout(async () => {
            try { await msg.reply(parts[0]); } catch (e) {
              try { await msg.channel.send(parts[0]); } catch {}
            }
            if (parts[1]) {
              const gap = 800 + Math.floor(Math.random() * 1500);
              try { await msg.channel.sendTyping(); } catch {}
              setTimeout(async () => {
                try { await msg.channel.send(parts[1]); } catch {}
              }, gap);
            }
          }, baseDelay);
        } else if (aiReply.__type === 'embed') {
          // Image embed (memes, cat/dog pics)
          const baseDelay = 500 + Math.floor(Math.random() * 1000);
          try { await msg.channel.sendTyping(); } catch {}
          setTimeout(async () => {
            try {
              const embed = { title: aiReply.title || undefined, image: aiReply.image ? { url: aiReply.image } : undefined };
              if (aiReply.source) embed.footer = { text: aiReply.source + (aiReply.upvotes ? ` | ⬆️ ${aiReply.upvotes}` : '') };
              await msg.reply({ embeds: [embed] });
            } catch (e) {
              // Fallback: send image URL as text
              try { await msg.reply(aiReply.image || aiReply.title || 'Here you go!'); } catch {}
            }
          }, baseDelay);
        } else if (aiReply.__type === 'poll') {
          // Reaction poll on hot topics
          const baseDelay = 800 + Math.floor(Math.random() * 1000);
          try { await msg.channel.sendTyping(); } catch {}
          setTimeout(async () => {
            try {
              const pollMsg = await msg.channel.send(aiReply.question);
              for (const emoji of aiReply.options) {
                const emojiChar = emoji.match(/^(\p{Emoji_Presentation}|\p{Emoji}\uFE0F?)/u)?.[0];
                if (emojiChar) try { await pollMsg.react(emojiChar); } catch {}
              }
            } catch {}
          }, baseDelay);
        } else {
          // Normal text reply with natural typing delay
          const replyText = typeof aiReply === 'string' ? aiReply : String(aiReply);
          const wordCount = replyText.split(/\s+/).length;
          const baseDelay = 1000 + Math.floor(Math.random() * 1500);
          const typingDelay = Math.min(wordCount * 120, 3000);
          const totalDelay = baseDelay + typingDelay;
          try { await msg.channel.sendTyping(); } catch {}
          setTimeout(async () => {
            try { await msg.reply(replyText); } catch (e) {
              try { await msg.channel.send(replyText); } catch {}
            }
          }, totalDelay);
        }
      }
    } catch (err) {
      // Silent fail — AI should never break other features
    }
  
    // ── Chat stats tracking for overview ──
    if (chatStats.streamStart) {
      chatStats.totalMessages++;
      const uname = msg.member?.displayName || msg.author.username;
      chatStats.messages[uname] = (chatStats.messages[uname] || 0) + 1;
      // Detect emotes: Discord custom emotes <:name:id> + common text emotes
      const customEmotes = msg.content.match(/<a?:\w+:\d+>/g) || [];
      customEmotes.forEach(e => { const name = e.split(':')[1]; chatStats.emotes[name] = (chatStats.emotes[name] || 0) + 1; });
      // Unicode emoji detection (basic)
      const unicodeEmoji = msg.content.match(/(\p{Emoji_Presentation}|\p{Extended_Pictographic})/gu) || [];
      unicodeEmoji.forEach(e => { chatStats.emotes[e] = (chatStats.emotes[e] || 0) + 1; });
    }
  
    // ==================== CUSTOM COMMANDS ==
    if (msg.content.startsWith('!')) {
      const contentAfterPrefix = msg.content.slice(1).trim();
      
      // Try to find custom command - check longest names first to handle spaces
      let cmd = null;
      let cmdName = null;
      
      // Sort custom commands by name length (longest first) to match phrases before single words
      const sortedCmds = [...customCommands].sort((a, b) => (b.name?.length || 0) - (a.name?.length || 0));
      
      for (const customCmd of sortedCmds) {
        if (contentAfterPrefix.toLowerCase().startsWith(customCmd.name.toLowerCase())) {
          // Check if it's a complete command (followed by space or end of string)
          const afterCmd = contentAfterPrefix.slice(customCmd.name.length);
          if (afterCmd === '' || afterCmd[0] === ' ') {
            cmd = customCmd;
            cmdName = customCmd.name;
            break;
          }
        }
      }
      
      addLog('info', `Custom command check: cmdName=${cmdName}, found=${!!cmd}, total=${customCommands.length}`);
      
      if (cmd) {
        if (cmd.paused) return;
        if (!isCommandAllowed(cmd, msg)) return;
  
        const now = Date.now();
        if (cmd.cooldownMs && cmd.cooldownMs > 0) {
          const key = cmd.name + ':' + msg.author.id;
          const last = commandCooldowns.get(key) || 0;
          if (now - last < cmd.cooldownMs) return;
          commandCooldowns.set(key, now);
        }
  
        cmd.uses = (cmd.uses || 0) + 1;
        
        // Track usage history
        if (!cmd.usageHistory) cmd.usageHistory = [];
        cmd.usageHistory.unshift({
          userId: msg.author.id,
          username: msg.author.username,
          displayName: msg.member?.displayName || msg.author.username,
          timestamp: new Date().toISOString()
        });
        // Keep only last 10
        if (cmd.usageHistory.length > 10) cmd.usageHistory = cmd.usageHistory.slice(0, 10);
        
        saveState();
        
        const formattedResponse = formatCommandResponses(cmd, msg);
        await sendCommandResponse(cmd, msg, formattedResponse);
  
        const cmdIndex = customCommands.findIndex(c => c.name === cmd.name);
        if (cmdIndex >= 0 && cmd.autoDeleteAfterUses && cmd.uses >= cmd.autoDeleteAfterUses) {
          const removed = customCommands.splice(cmdIndex, 1)[0];
          saveState();
          addLog('info', `Custom command auto-deleted after ${removed.autoDeleteAfterUses} uses: !${removed.name}`);
          if (msg.deletable) {
            msg.delete().catch(() => {});
          }
        }
  
        return;
      }
    }
    
    // ==================== LEVELING SYSTEM ====================
    const userId = msg.author.id;
    if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
    const now = Date.now();

    // F12: XP blacklist check
    if (featureHooks?.isXpBlacklisted(msg.channel.id, msg.member?.roles?.cache?.map(r => r.id))) return;

    const cooldown = levelingConfig?.messageCooldownMs ?? 45000;
    if (now - (leveling[userId].lastMsg || 0) < cooldown) return;
    leveling[userId].lastMsg = now;
  
    const min = levelingConfig?.xpPerMessageMin ?? 15;
    const max = levelingConfig?.xpPerMessageMax ?? 25;
    const spread = Math.max(0, max - min);
    let xpGain = min + Math.floor(Math.random() * (spread + 1));
    
    // Apply global XP multiplier if active
    const now2 = Date.now();
    if (levelingConfig?.xpMultiplier && levelingConfig.xpMultiplier > 1) {
      if (!levelingConfig.multiplierEndTime || now2 < levelingConfig.multiplierEndTime) {
        xpGain = Math.floor(xpGain * levelingConfig.xpMultiplier);
      } else {
        levelingConfig.xpMultiplier = 1;
        levelingConfig.multiplierEndTime = null;
      }
    }
    
    // Apply per-user XP multiplier
    if (leveling[userId].xpMultiplier && leveling[userId].xpMultiplier > 1) {
      const userMultiplierEnd = Number(leveling[userId].xpMultiplierEndTime) || null;
      if (!userMultiplierEnd || now2 < userMultiplierEnd) {
        xpGain = Math.floor(xpGain * leveling[userId].xpMultiplier);
      } else {
        leveling[userId].xpMultiplier = 1;
        leveling[userId].xpMultiplierEndTime = null;
      }
    }
    
    // F2: Leveling streak bonus
    if (featureHooks) {
      featureHooks.checkLevelingStreak(userId);
      xpGain += featureHooks.getStreakBonus(userId);
    }

    leveling[userId].xp += xpGain;
    
    // Track weekly XP
    if (!weeklyLeveling[userId]) weeklyLeveling[userId] = { xp: 0, lastGain: now };
    weeklyLeveling[userId].xp += xpGain;
    weeklyLeveling[userId].lastGain = now;
  
    const checkMilestones = (level) => {
      const milestones = levelingConfig?.levelMilestones || [10, 25, 50, 100];
      return milestones.includes(level);
    };
  
    const playerLabel = dashboardSettings.levelUpPingPlayer !== false ? `<@${userId}>` : `**${msg.author.username}**`;
  
    let leveledUp = false;
    let lastLevel = leveling[userId].level;
  
    // Resolve target channel for level-up notifications
    let levelChannel = msg.channel;
    if (dashboardSettings.levelUpChannelId) {
      try {
        const ch = await msg.client.channels.fetch(dashboardSettings.levelUpChannelId);
        if (ch && ch.isTextBased()) levelChannel = ch;
      } catch (e) {
        addLog('warn', `Level-up channel fetch failed: ${e.message}`);
      }
    }
    const safeSend = async (content) => { try { await levelChannel.send(content); } catch (_) {} };
  
    while (true) {
      const nextLevel = leveling[userId].level + 1;
      const needed = getXpForLevel(nextLevel);
      if (leveling[userId].xp < needed) break;
  
      leveling[userId].level++;
      lastLevel = leveling[userId].level;
      leveledUp = true;
  
      // Auto-prestige thresholds (progressive - no reset)
      const nextRank = (prestige[userId] || 0) + 1;
      const threshold = levelingConfig?.prestigeThresholds?.[nextRank];
      if (threshold && leveling[userId].level >= threshold.levelRequired) {
        prestige[userId] = nextRank;
        // No level/XP reset - prestige is progressive
  
        if (threshold.roleId && msg.guild) {
          try {
            const member = msg.member || await msg.guild.members.fetch(userId);
            const role = await msg.guild.roles.fetch(threshold.roleId);
            if (member && role && !member.roles.cache.has(role.id)) {
              await member.roles.add(role.id);
              await safeSend(`🎖️ ${playerLabel} reached **Prestige ${nextRank}** at Level ${leveling[userId].level}! Granted role **${role.name}**.`);
            } else {
              await safeSend(`🎖️ ${playerLabel} reached **Prestige ${nextRank}** at Level ${leveling[userId].level}!`);
            }
          } catch (err) {
            addLog('error', `Prestige role assignment failed: ${err.message}`);
            await safeSend(`🎖️ ${playerLabel} reached **Prestige ${nextRank}** at Level ${leveling[userId].level}!`);
          }
        } else {
          await safeSend(`🎖️ ${playerLabel} reached **Prestige ${nextRank}** at Level ${leveling[userId].level}!`);
        }
        saveState();
        // Don't break - continue leveling up
      }
    }
  
    if (leveledUp) {
      const newLevel = lastLevel;
      await safeSend(`🎉 ${playerLabel} leveled up to **${newLevel}**!`);
  
      if (checkMilestones(newLevel)) {
        const prestigeRank = prestige[userId] || 0;
        await safeSend(`🏆 **MILESTONE!** ${playerLabel} reached **Level ${newLevel}** (Prestige: ${prestigeRank})!`);
      }
  
      const rewardRoleId = levelingConfig?.roleRewards?.[String(newLevel)] || levelingConfig?.roleRewards?.[newLevel];
      addLog('info', `Level up check: userId=${userId}, level=${newLevel}, roleRewards=${JSON.stringify(levelingConfig?.roleRewards || {})}, rewardRoleId=${rewardRoleId}`);
  
      if (rewardRoleId && msg.guild) {
        try {
          const member = msg.member || await msg.guild.members.fetch(userId);
          const role = msg.guild.roles.cache.get(rewardRoleId) || await msg.guild.roles.fetch(rewardRoleId);
          if (member && role && !member.roles.cache.has(role.id)) {
            await member.roles.add(role.id);
            await safeSend(`🏅 Awarded role **${role.name}** for reaching level ${newLevel}!`);
            addLog('info', `Assigned role ${role.name} (${role.id}) to ${msg.author.username} for level ${newLevel}`);
          }
        } catch (err) {
          addLog('error', `Failed to assign level role: ${err.message}`);
        }
      }
    }
  
    saveState();
  });
  
  // Voice activity tracking for XP
  const voiceXpTracker = {};
  client.on('voiceStateUpdate', async (oldState, newState) => {
    // F42: Voice activity tracking
    if (featureHooks) featureHooks.handleVoiceStateUpdate(oldState, newState);
    try {
      const userId = newState.id;
      
      // User joined voice
      if (!oldState.channel && newState.channel) {
        voiceXpTracker[userId] = Date.now();
      }
      // User left voice
      else if (oldState.channel && !newState.channel) {
        const joinedAt = voiceXpTracker[userId];
        if (!joinedAt) return;
        
        const timeInVoice = Math.floor((Date.now() - joinedAt) / 60000); // minutes
        if (timeInVoice < 1) return; // minimum 1 minute
        
        if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
        
        let xpGain = timeInVoice * (levelingConfig?.xpPerVoiceMinute ?? 5);
        
        // Apply multiplier
        if (levelingConfig?.xpMultiplier && levelingConfig.xpMultiplier > 1) {
          if (!levelingConfig.multiplierEndTime || Date.now() < levelingConfig.multiplierEndTime) {
            xpGain = Math.floor(xpGain * levelingConfig.xpMultiplier);
          }
        }
  
        if (leveling[userId].xpMultiplier && leveling[userId].xpMultiplier > 1) {
          const userMultiplierEnd = Number(leveling[userId].xpMultiplierEndTime) || null;
          if (!userMultiplierEnd || Date.now() < userMultiplierEnd) {
            xpGain = Math.floor(xpGain * leveling[userId].xpMultiplier);
          } else {
            leveling[userId].xpMultiplier = 1;
            leveling[userId].xpMultiplierEndTime = null;
          }
        }
        
        leveling[userId].xp += xpGain;
        
        // Track weekly
        if (!weeklyLeveling[userId]) weeklyLeveling[userId] = { xp: 0, lastGain: Date.now() };
        weeklyLeveling[userId].xp += xpGain;
        weeklyLeveling[userId].lastGain = Date.now();
        
        saveState();
        delete voiceXpTracker[userId];
        
        addLog('info', `Voice XP: ${userId} gained ${xpGain} XP for ${timeInVoice}m in voice`);
      }
    } catch (err) {
      addLog('error', `Voice XP tracking error: ${err.message}`);
    }
  });
  
  // Reaction tracking for XP
  client.on('messageReactionAdd', async (reaction, user) => {
    try {
      if (user.bot) return;

      // F47: Message bookmarks
      if (featureHooks) featureHooks.handleBookmarkReaction(reaction, user);
      
      // Smart Bot: track reactions for inside jokes (#14)
      try {
        if (reaction.message.partial) await reaction.message.fetch();
        if (reaction.partial) await reaction.fetch();
        smartBot.processReaction(reaction.message, reaction.emoji.name, user.id);
      } catch {}
  
      const userId = user.id;
      if (!leveling[userId]) leveling[userId] = { xp: 0, level: 0, lastMsg: 0 };
      
      let xpGain = levelingConfig?.xpPerReaction ?? 2;
      
      // Apply multiplier
      if (levelingConfig?.xpMultiplier && levelingConfig.xpMultiplier > 1) {
        if (!levelingConfig.multiplierEndTime || Date.now() < levelingConfig.multiplierEndTime) {
          xpGain = Math.floor(xpGain * levelingConfig.xpMultiplier);
        }
      }
  
      if (leveling[userId].xpMultiplier && leveling[userId].xpMultiplier > 1) {
        const userMultiplierEnd = Number(leveling[userId].xpMultiplierEndTime) || null;
        if (!userMultiplierEnd || Date.now() < userMultiplierEnd) {
          xpGain = Math.floor(xpGain * leveling[userId].xpMultiplier);
        } else {
          leveling[userId].xpMultiplier = 1;
          leveling[userId].xpMultiplierEndTime = null;
        }
      }
      
      leveling[userId].xp += xpGain;
      
      // Track weekly
      if (!weeklyLeveling[userId]) weeklyLeveling[userId] = { xp: 0, lastGain: Date.now() };
      weeklyLeveling[userId].xp += xpGain;
      weeklyLeveling[userId].lastGain = Date.now();
      
      saveState();
    } catch (err) {
      addLog('error', `Reaction XP tracking error: ${err.message}`);
    }
  });
  

}
