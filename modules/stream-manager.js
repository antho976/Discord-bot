/**
 * Stream Manager — extracted from index.js
 * Handles Twitch stream detection, live announcements, schedule alerts,
 * stream info tracking, and Twitch API integration.
 * 
 * Pattern: Factory function receives dependencies + shared streamVars object.
 * Mutable primitives (isLive, lastStreamId, etc.) live on streamVars.
 */
import { EmbedBuilder } from 'discord.js';

// Discord message queue (rate-limit protection)
const discordMsgQueue = [];
let discordMsgQueueTimer = null;

export function registerStreamManager({
  sv,   // streamVars — mutable primitive state
  addLog, saveState, saveConfig, client, schedule, state,
  streamInfo, chatStats, apiRateLimits, twitchTokens, streamGoals,
  history, currentStreamViewerData, currentStreamGameTimeline,
  viewerGraphHistory, dashboardSettings, botTimezone,
  getTimeZoneParts, zonedTimeToUtcMillis, fetchUserName,
  checkRPGMilestoneEvents, expireRPGEvents, rpgEvents,
  pushDashboardNotification, invalidateAnalyticsCache,
  getNowInBotTimezone, dashAudit, notificationFilters,
  trackApiCall, resetChatStats, smartBot, io, config,
  logNotification, getLastResetDate, setLastResetDate,
}) {

  // Helper function to get role for notification type
  const getRoleOrDefault = (notifType) => {
    return config.notificationRoles[notifType] || config.ROLE_ID;
  };

  // Helper function to get channel for notification type
  const getChannelOrDefault = (notifType) => {
    return config.notificationChannels[notifType] || config.CUSTOM_CHANNEL_ID || process.env.DISCORD_CHANNEL_ID;
  };

let twitchCheckInterval = null;
let scheduleAlertInterval = null;
let tokenRefreshInterval = null;
let discordMsgQueueRunning = false;

function computeNextScheduledStream(force = false) {
  try {
    // ensure schedule exists
    if (!schedule) schedule = {};
    if (!schedule.alertsSent) schedule.alertsSent = { oneHour: false, tenMin: false };

    // skip if no stream today unless forced
    if (schedule.noStreamToday && !force) return;

    schedule.noStreamToday = false;
    schedule.alertsEnabledToday = true;
    schedule.alertsSent = { oneHour: false, tenMin: false };

    const now = Date.now();
    const nowParts = getTimeZoneParts(new Date(now), botTimezone);
    const localNow = new Date(Date.UTC(
      nowParts.year,
      nowParts.month - 1,
      nowParts.day,
      nowParts.hour,
      nowParts.minute,
      nowParts.second
    ));

    let nextUtcMs = null;
    for (let offset = 0; offset < 7; offset += 1) {
      const dayIndex = (localNow.getUTCDay() + offset) % 7;
      const isWeekend = dayIndex === 0 || dayIndex === 6;
      const hour = isWeekend ? 14 : 17;

      const candidateLocal = new Date(localNow.getTime());
      candidateLocal.setUTCDate(candidateLocal.getUTCDate() + offset);

      const candidateUtcMs = zonedTimeToUtcMillis({
        year: candidateLocal.getUTCFullYear(),
        month: candidateLocal.getUTCMonth() + 1,
        day: candidateLocal.getUTCDate(),
        hour,
        minute: 0,
        second: 0
      }, botTimezone);

      if (candidateUtcMs > now) {
        nextUtcMs = candidateUtcMs;
        break;
      }
    }

    if (!nextUtcMs) {
      nextUtcMs = zonedTimeToUtcMillis({
        year: localNow.getUTCFullYear(),
        month: localNow.getUTCMonth() + 1,
        day: localNow.getUTCDate() + 7,
        hour: 17,
        minute: 0,
        second: 0
      }, botTimezone);
    }

    const next = new Date(nextUtcMs);
    schedule.nextStreamAt = next.toISOString();
    saveState();

    addLog(
      'info',
      `Next stream scheduled for ${next.toLocaleString('en-US', { timeZone: botTimezone })}`
    );
  } catch (err) {
    addLog('error', 'computeNextScheduledStream failed: ' + err.message);
  }
}

function getNextAlertInfo() {
  if (!schedule || schedule.noStreamToday) {
    return {
      status: 'CANCELLED',
      nextAlert: null,
      timeRemaining: null
    };
  }

  if (schedule.streamDelayed) {
    return {
      status: 'DELAYED',
      nextAlert: null,
      timeRemaining: null
    };
  }

  if (!schedule.nextStreamAt) {
    return {
      status: 'NOT SCHEDULED',
      nextAlert: null,
      timeRemaining: null
    };
  }

  const now = Date.now();
  const streamTime = new Date(schedule.nextStreamAt).getTime();

  const alerts = [];

  if (!schedule.alertsSent?.oneHour) {
    alerts.push({
      type: '1 hour',
      time: streamTime - 60 * 60 * 1000
    });
  }

  if (!schedule.alertsSent?.tenMin) {
    alerts.push({
      type: '10 minutes',
      time: streamTime - 10 * 60 * 1000
    });
  }

  const upcoming = alerts
    .filter(a => a.time > now)
    .sort((a, b) => a.time - b.time)[0];

  if (!upcoming) {
    return {
      status: 'NO UPCOMING ALERTS',
      nextAlert: null,
      timeRemaining: null
    };
  }

  const diffMs = upcoming.time - now;
  const minutes = Math.floor(diffMs / 60000);
  const seconds = Math.floor((diffMs % 60000) / 1000);

  return {
    status: 'SCHEDULED',
    nextAlert: upcoming.type,
    timeRemaining: `${minutes}m ${seconds}s`
  };
}

function getNextScheduledStream() {
  if (!schedule.weekly) return null;
  // Helper: compute next occurrence UTC ms for a weekly entry (supports {hour,minute} or legacy numeric ts)
  const computeNextForEntry = (dayName, entry) => {
    const nowMs = Date.now();

    // Determine hour/minute
    let hour = 0, minute = 0;
    if (entry && typeof entry === 'object' && Number.isFinite(entry.hour)) {
      hour = Number(entry.hour);
      minute = Number(entry.minute) || 0;
    } else if (Number.isFinite(Number(entry))) {
      const sample = new Date(Number(entry));
      hour = sample.getHours();
      minute = sample.getMinutes();
    } else {
      return null;
    }

    const map = { sunday:0, monday:1, tuesday:2, wednesday:3, thursday:4, friday:5, saturday:6 };
    const dayIndex = map[dayName.toLowerCase()];
    if (dayIndex === undefined) return null;

    return getNextOccurrenceUtcMs(botTimezone, dayIndex, hour, minute, nowMs);
  };

  const upcoming = Object.entries(schedule.weekly || {})
    .map(([day, entry]) => ({ day, ts: computeNextForEntry(day, entry) }))
    .filter(e => e && Number.isFinite(e.ts))
    .sort((a, b) => a.ts - b.ts);

  return upcoming[0] || null;
}

function maybeDailyReset() {
  const today = getNowInBotTimezone().toISOString().slice(0, 10);

  if (today !== getLastResetDate()) {
    schedule.alertsSent = { oneHour: false, tenMin: false };
    schedule.noStreamToday = false;
    schedule.streamDelayed = false;
    schedule.alertsEnabledToday = true;

    setLastResetDate(today);
    state.lastResetDate = today;
    saveState();
    addLog('info', 'Daily reset completed');
  }
}

async function processDiscordMsgQueue() {
  if (discordMsgQueueRunning) return;
  discordMsgQueueRunning = true;
  while (discordMsgQueue.length > 0) {
    const { channelId, payload, resolve, reject } = discordMsgQueue.shift();
    try {
      const channel = await client.channels.fetch(channelId).catch(() => null);
      if (!channel) { reject(new Error('Channel not found')); continue; }
      const msg = await channel.send(payload);
      resolve(msg);
    } catch (e) {
      reject(e);
    }
    // Rate limit buffer: 500ms between messages
    await new Promise(r => setTimeout(r, 500));
  }
  discordMsgQueueRunning = false;
}

function queueDiscordMessage(channelId, payload) {
  return new Promise((resolve, reject) => {
    discordMsgQueue.push({ channelId, payload, resolve, reject });
    processDiscordMsgQueue();
  });
}

async function sendEmbedNotification(title, description, color, notificationType = 'liveAlert') {
  try {
    // Check if notification is enabled
    if (config.notificationEnabled[notificationType] === false) {
      addLog('info', `${notificationType} notification disabled, skipping`);
      return;
    }

    const channelId = getChannelOrDefault(notificationType);
    const channel = await client.channels.fetch(channelId);
    if (!channel) return;

    const embed = new EmbedBuilder()
      .setTitle(title)
      .setDescription(description)
      .setColor(color)
      .setTimestamp();

    const roleId = getRoleOrDefault(notificationType);
    const shouldPing = config.notificationPing[notificationType] !== false;
    const content = (roleId && shouldPing) ? `<@&${roleId}> ` : '';
    const msg = await channel.send({ content, embeds: [embed] });
    
    // Auto-delete if enabled for this notification type
    const autoDeleteKey = 'autoDelete' + notificationType.charAt(0).toUpperCase() + notificationType.slice(1);
    const shouldAutoDelete = engagementSettings[autoDeleteKey];
    const deleteDelay = engagementSettings.autoDeleteDelay || 60000;
    
    if (shouldAutoDelete) {
      setTimeout(() => {
        msg.delete().catch(err => addLog('warn', `Could not auto-delete ${notificationType} message: ${err.message}`));
      }, deleteDelay);
      addLog('info', `${notificationType} message scheduled for auto-delete in ${deleteDelay/1000}s`);
    }
  } catch (err) {
    addLog('error', `Failed to send embed notification: ${err.message}`);
  }
}

function buildLiveEmbed(){ return new EmbedBuilder().setColor(0x9146FF).setTitle(`${process.env.STREAMER_LOGIN} is LIVE 🔴`).setURL(`https://twitch.tv/${process.env.STREAMER_LOGIN}`).setDescription(streamInfo.title||'Live now!').addFields({name:'🎮 Game',value:streamInfo.game||'Unknown',inline:true},{name:'👀 Viewers',value:String(streamInfo.viewers),inline:true}).setImage(streamInfo.thumbnail).setFooter({text:'Twitch Live Notification'}).setTimestamp(); }

function buildOfflineEmbed(){ return new EmbedBuilder().setColor(0x2f3136).setTitle(`${process.env.STREAMER_LOGIN} is OFFLINE ⚫`).setDescription('Stream has ended').setTimestamp(); }

async function announceLive(isTest=false,autoDelete=false){
  // Check if notification is enabled
  if (!isTest && config.notificationEnabled.liveAlert === false) {
    addLog('info', 'Live notification disabled, skipping');
    return;
  }

  // NEW: Check cooldown to prevent spam
  if (!isTest && isOnCooldown('liveAnnounce', 300000)) {
    addLog('info', 'Live announcement on cooldown, skipping');
    return;
  }

  const channelId = getChannelOrDefault('liveAlert');
  const channel = await client.channels.fetch(channelId);
  if(!channel) return;
  
  // CLEAN CHANNEL: Delete previous bot messages and unpin old announcement
  try {
    const messages = await channel.messages.fetch({ limit: 50 });
    const botMessages = messages.filter(m => m.author.id === client.user.id);
    
    // Unpin the old announcement if it exists
    if (sv.announcementMessageId) {
      const oldMsg = botMessages.get(sv.announcementMessageId);
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
  const shouldPing = config.notificationPing.liveAlert !== false; // default true
  const rolePing = (roleId && shouldPing) ? `<@&${roleId}> ` : '';
  
  let content;
  if (dashboardSettings.customLiveMessage) {
    // Replace placeholders in custom message
    content = dashboardSettings.customLiveMessage
      .replace('{streamer}', process.env.STREAMER_LOGIN)
      .replace('{role}', rolePing);
  } else {
    content = rolePing + `🔴 **${process.env.STREAMER_LOGIN} is LIVE!**`;
  }
  
  if (isTest) content += ' *(test)*';
  
  const embed = buildLiveEmbed();
  const msg = await channel.send({content,embeds:[embed]});
  
  // PIN the live announcement
  try {
    await msg.pin();
    addLog('info', 'Pinned live announcement');
  } catch (err) {
    addLog('warn', 'Could not pin message: ' + err.message);
  }
  
  sv.announcementMessageId = msg.id; saveState(); addLog('announce','Announcement sent');
  if (typeof logNotification === 'function') logNotification('live', `${process.env.STREAMER_LOGIN} went live`, { game: streamInfo.game, viewers: streamInfo.viewer });
  setCooldown('liveAnnounce');
  io.emit('streamUpdate', streamInfo);
  if(autoDelete){ setTimeout(()=>msg.delete().catch(()=>{}),60000); }
}

async function sendScheduleAlert(type, isTest = false) {
  
  // Check if notification is enabled
  if (!isTest && config.notificationEnabled.scheduleAlert === false) {
    addLog('info', 'Schedule alert notification disabled, skipping');
    return;
  }

  // ⛔ Don't send schedule alerts if stream is already live
  // (unless it's a manual test)
  if (!isTest && streamInfo.startedAt) {
    addLog('info', `Skipped ${type} alert — stream already live`);
    return;
  }

  if (!client.isReady()) {
    throw new Error('Discord client not ready yet');
  }

  try {
    const channelId = getChannelOrDefault('scheduleAlert');
    const channel = await client.channels.fetch(channelId);
    if (!channel) throw new Error('Channel not found');

    const label = type === 'oneHour' ? '1 hour' : '10 minutes';

    const roleId = getRoleOrDefault('scheduleAlert');
    const shouldPing = config.notificationPing.scheduleAlert !== false;
    const content =
      (!isTest && roleId && shouldPing ? `<@&${roleId}> ` : '') +
      `⏰ **Stream starts in ${label}!**` +
      (isTest ? ' *(test)*' : '');

    await channel.send({ content });

    if (!isTest) {
      schedule.alertsSent[type] = true;
      saveState();
    }

    addLog('info', `Schedule alert sent: ${label}${isTest ? ' (test)' : ''}`);
  } catch (err) {
    addLog('error', `Schedule alert failed: ${err.message}`);
    throw err;
  }
}

function trackStreamGameChange(newGame) {
  try {
    if (!Array.isArray(currentStreamGameTimeline)) currentStreamGameTimeline = [];
    const now = Date.now();

    // Close the previous segment (if any)
    if (currentStreamGameTimeline.length > 0) {
      const last = currentStreamGameTimeline[currentStreamGameTimeline.length - 1];
      if (last && !last.endMs) last.endMs = now;
    }

    // Start a new segment for the new game
    currentStreamGameTimeline.push({
      streamId: sv.lastStreamId || null,
      game: (newGame || 'Unknown').toString(),
      startMs: now,
      endMs: null
    });

    streamMetadata.lastGame = newGame;
    streamMetadata.gameChangeDetected = true;
    addLog('info', `Game changed -> ${newGame}`);
    saveState();
  } catch (err) {
    addLog('error', `trackStreamGameChange failed: ${err?.message || err}`);
  }
}

function updateStreamInfo(data) {
  if (!data.data || !data.data[0]) return;

  const stream = data.data[0];
  const newTitle = stream.title;
  const newGame = stream.game_name;
  const newViewers = stream.viewer_count;

  // If we're live, start tracking game segments (and record changes)
  if (sv.isLive) {
    ensureCurrentStreamGameTimelineInitialized(newGame);
    if (streamMetadata.lastGame !== null && streamMetadata.lastGame !== newGame) {
      trackStreamGameChange(newGame);
    }
  }

  // Update current stream info
  streamInfo.title = newTitle;
  streamInfo.game = newGame;
  streamInfo.viewers = newViewers;
  streamInfo.thumbnail = stream.thumbnail_url?.replace('{width}', '320').replace('{height}', '180');
  streamInfo.startedAt = stream.started_at;

  // Auto-sync stream data to SmartBot so it knows what's live
  try {
    smartBot.setKnowledge('isLive', true);
    smartBot.setKnowledge('currentGame', newGame);
    smartBot.setKnowledge('streamTitle', newTitle);
    smartBot.setKnowledge('viewerCount', newViewers);
  } catch {}

  // NEW: Track activity (viewers by hour)
  trackActivity(newViewers);

  // NEW: Track viewers over time during stream
  trackStreamViewers(newViewers);

  // Track follower count over time (non-blocking)
  fetchChannelInfo().then(channelData => {
    if (channelData && channelData.followers !== undefined) {
      const now = new Date().toISOString();
      if (!followerHistory.length || Date.now() - new Date(followerHistory[followerHistory.length-1].timestamp).getTime() > 300000) {
        followerHistory.push({ timestamp: now, count: channelData.followers });
        if (followerHistory.length > 500) followerHistory = followerHistory.slice(-500);
        debouncedSaveState();
      }
    }
  }).catch(() => {});

  // Track stats
  if (newViewers > stats.peakViewers) {
    stats.peakViewers = newViewers;
  }

  // Keep the most recent history entry in sync while live
  if (history.length > 0) {
    const last = history[history.length - 1];
    if (last && last.duration === null && last.startedAt === streamInfo.startedAt) {
      last.viewers = newViewers;
      last.game = newGame;
      last.title = newTitle;
      last.peakViewers = Math.max(last.peakViewers ?? 0, newViewers);
      if (currentStreamViewerData.length > 0) {
        const avg = Math.round(currentStreamViewerData.reduce((sum, p) => sum + (p.viewers || 0), 0) / currentStreamViewerData.length);
        last.avgViewers = isFinite(avg) ? avg : (last.avgViewers ?? last.viewers ?? 0);
      }
      saveState();
    }
  }

  // Check viewer milestones
  const milestones = engagementSettings.viewerMilestones || [100, 250, 500, 1000];
  if (!dashboardSettings.hitMilestonesThisStream) dashboardSettings.hitMilestonesThisStream = {};
  
  for (const milestone of milestones) {
    if (newViewers >= milestone && !dashboardSettings.hitMilestonesThisStream[milestone]) {
      dashboardSettings.hitMilestonesThisStream[milestone] = true;
      addLog('milestone', `🎉 Hit ${milestone} viewers!`);
      
      // Send milestone notification if channel is set and notification is enabled
      if (config.notificationEnabled.viewerMilestone !== false && process.env.DISCORD_CHANNEL_ID) {
        const channelId = getChannelOrDefault('viewerMilestone');
        client.channels.fetch(channelId).then(channel => {
          const roleId = getRoleOrDefault('viewerMilestone');
          const shouldPing = config.notificationPing.viewerMilestone !== false;
          const content = (roleId && shouldPing) 
            ? `<@&${roleId}> 🎉 We just hit **${milestone}** viewers!`
            : `🎉 We just hit **${milestone}** viewers!`;
          
          channel.send({
            content,
            embeds: [{
              color: 0xFFD700,
              title: '🎉 Viewer Milestone!',
              fields: [
                { name: 'Milestone', value: String(milestone), inline: true },
                { name: 'Current Viewers', value: String(newViewers), inline: true }
              ]
            }]
          }).then(msg => {
            // Auto-delete if enabled
            if (engagementSettings.autoDeleteViewerMilestone) {
              const deleteDelay = engagementSettings.autoDeleteDelay || 60000;
              setTimeout(() => {
                msg.delete().catch(err => addLog('warn', `Could not auto-delete viewer milestone message: ${err.message}`));
              }, deleteDelay);
              addLog('info', `Viewer milestone message scheduled for auto-delete in ${deleteDelay/1000}s`);
            }
          });
        }).catch(err => addLog('error', 'Failed to send milestone notification: ' + err.message));
      }
    }
  }

  // Detect title change
  if (streamMetadata.lastTitle !== null && streamMetadata.lastTitle !== newTitle) {
    streamMetadata.titleChangeDetected = true;
    addLog('info', `Stream title changed: "${streamMetadata.lastTitle}" → "${newTitle}"`);
  }
  streamMetadata.lastTitle = newTitle;

  // Detect game change
  if (streamMetadata.lastGame !== null && streamMetadata.lastGame !== newGame) {
    streamMetadata.gameChangeDetected = true;
    addLog('info', `Game changed: "${streamMetadata.lastGame}" → "${newGame}"`);
  }
  streamMetadata.lastGame = newGame;
}

async function fetchChannelInfo() {
  try {
    const res = await fetch(
      `https://api.twitch.tv/helix/channels?broadcaster_id=${sv.BROADCASTER_ID}`,
      {
        headers: {
          'Client-ID': process.env.TWITCH_CLIENT_ID,
          'Authorization': `Bearer ${sv.TWITCH_ACCESS_TOKEN}`
        }
      }
    );
    trackApiCall(res);
    const data = await res.json();
    if (data.data?.[0]) {
      const channel = data.data[0];
      return {
        followers: channel.follower_count || 0,
        language: channel.language,
        category: channel.game_name
      };
    }
  } catch (err) {
    addLog('error', 'Failed to fetch channel info: ' + err.message);
  }
  return null;
}

function finalizeStreamViewerData() {
  if (!currentStreamViewerData || currentStreamViewerData.length === 0) {
    return { peakViewers: 0, avgViewers: 0 };
  }
  
  const viewers = currentStreamViewerData.map(p => p.viewers || 0);
  const peakViewers = Math.max(...viewers);
  const avgViewers = Math.round(viewers.reduce((a, b) => a + b, 0) / viewers.length);
  
  return { peakViewers, avgViewers };
}

function finalizeStreamGameTimeline(endTime) {
  if (!currentStreamGameTimeline || currentStreamGameTimeline.length === 0) {
    return { totals: {} };
  }
  
  const totals = {};
  currentStreamGameTimeline.forEach(entry => {
    const game = entry.game || 'Unknown';
    const startTime = new Date(entry.startedAt).getTime();
    const endTimeMs = entry.endedAt ? new Date(entry.endedAt).getTime() : endTime;
    const durationSec = Math.max(0, Math.floor((endTimeMs - startTime) / 1000));
    
    totals[game] = (totals[game] || 0) + durationSec;
  });
  
  return { totals };
}

async function checkScheduleAlerts() {
  try {
    // Don't send alerts if canceled, delayed, or no stream scheduled
    if (schedule.noStreamToday || schedule.streamDelayed) {
      return;
    }

    const now = Date.now();
    const nextComputed = getNextScheduledStream();
    const streamTime = (nextComputed && Number.isFinite(nextComputed.ts))
      ? Number(nextComputed.ts)
      : (schedule.nextStreamAt ? new Date(schedule.nextStreamAt).getTime() : null);
    if (!streamTime) return;

    const computedIso = (nextComputed && Number.isFinite(nextComputed.ts))
      ? new Date(streamTime).toISOString()
      : null;
    if (computedIso && schedule.nextStreamAt !== computedIso) {
      schedule.nextStreamAt = computedIso;
      saveState();
    }

    // Check for 1 hour alert
    if (!schedule.alertsSent?.oneHour) {
      const oneHourBefore = streamTime - 60 * 60 * 1000;
      if (now >= oneHourBefore && now < oneHourBefore + 120000) { // Within 2 minute window
        await sendScheduleAlert('oneHour');
      }
    }

    // Check for 10 minute alert
    if (!schedule.alertsSent?.tenMin) {
      const tenMinBefore = streamTime - 10 * 60 * 1000;
      if (now >= tenMinBefore && now < tenMinBefore + 120000) { // Within 2 minute window
        await sendScheduleAlert('tenMin');
      }
    }
  } catch (err) {
    addLog('error', 'checkScheduleAlerts failed: ' + err.message);
  }
}

async function checkStream() {
  maybeDailyReset();
  if (sv.isCheckingStream) {
    addLog('info', 'checkStream skipped (already running)');
    return;
  }

  sv.isCheckingStream = true;

  // 🧠 FIX: Always normalize first
  normalizeSchedule();

  // ✅ Ensure today's schedule exists
  if (!schedule.nextStreamAt && !schedule.noStreamToday) {
    computeNextScheduledStream();
  }

  try {
    let res, data;
    try {
      res = await fetch(
        `https://api.twitch.tv/helix/streams?user_id=${sv.BROADCASTER_ID}`,
        {
          headers: {
            'Client-ID': process.env.TWITCH_CLIENT_ID,
            'Authorization': `Bearer ${sv.TWITCH_ACCESS_TOKEN}`
          }
        }
      );
    } catch (err) {
      addLog('error', `Fetch error from Twitch API: ${err.message}`);
      return;
    }
    trackApiCall(res);

    try {
      data = await res.json();
    } catch (err) {
      addLog('error', `Failed to parse Twitch API response: ${err.message}`);
      return;
    }

    // Extra logging for debugging
    addLog('info', `Twitch API response: ${JSON.stringify(data).substring(0, 500)}`);

    // Safety check for API response
    if (!data || !Array.isArray(data.data)) {
      addLog('error', `Invalid API response from Twitch: ${JSON.stringify(data).substring(0, 500)}`);
      return;
    }

    updateStreamInfo(data);

    const liveNow = data.data.length > 0;

    // ======================
    // STREAM IS LIVE
    // ======================
    if (liveNow) {

      // ✅ Reset delayed state if stream starts late
      if (schedule.streamDelayed) {
        addLog('info', 'Stream went live after delay — resetting delayed state');
        schedule.streamDelayed = false;
        saveState();
      }

      schedule.alertsSent.oneHour = true;
      schedule.alertsSent.tenMin = true;
      saveState();

      const streamId = data.data[0].id;

      if (!sv.isLive || sv.lastStreamId !== streamId) {
        if (sv.suppressNextAnnounce) {
          addLog('info', 'LIVE detected but announcement suppressed');
          sv.suppressNextAnnounce = false;
          sv.isLive = true;
          sv.lastStreamId = streamId;
          saveState();
          return;
        }

        sv.isLive = true;
        sv.lastStreamId = streamId;
        addLog('live', 'OFFLINE → LIVE detected');
        resetChatStats();
        streamMetadata.streamStartTime = new Date().toISOString();

        // Delete the old stream end message if it exists
        if (sv.announcementMessageId && process.env.DISCORD_CHANNEL_ID) {
          try {
            const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
            const oldMsg = await channel.messages.fetch(sv.announcementMessageId).catch(() => null);
            if (oldMsg) {
              await oldMsg.delete();
              addLog('info', 'Deleted old stream end message');
            }
          } catch (err) {
            addLog('warn', 'Could not delete old message: ' + err.message);
          }
        }
        sv.announcementMessageId = null;

        // Reset per-stream game timeline
        currentStreamGameTimeline = [];
        ensureCurrentStreamGameTimelineInitialized(streamInfo.game);

        // Reset RPG events per-stream tracking
        rpgEvents.triggeredThisStream = {};
        rpgEvents.activeEvents = [];
        
        // Add to history
        history.push({
          streamId,
          startedAt: streamInfo.startedAt,
          viewers: streamInfo.viewers,
          peakViewers: streamInfo.viewers,
          avgViewers: streamInfo.viewers,
          game: streamInfo.game,
          title: streamInfo.title,
          gameSegments: [],
          endedAt: null,
          duration: null // Will be calculated when stream ends
        });
        
        await announceLive();
        recomputeStreamStatsFromHistory();
        saveState();
      } else if (streamMetadata.titleChangeDetected || streamMetadata.gameChangeDetected) {
        // Update the live announcement message with new title/game
        if (sv.announcementMessageId) {
          try {
            const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
            const msg = await channel.messages.fetch(sv.announcementMessageId);
            const updatedEmbed = buildLiveEmbed();
            await msg.edit({ embeds: [updatedEmbed] });
            addLog('info', 'Live announcement updated with title/game changes');
          } catch (err) {
            addLog('error', 'Failed to update announcement: ' + err.message);
          }
        }
        
        // Send notifications
        if (streamMetadata.titleChangeDetected && engagementSettings.titleChangeNotif) {
          await sendEmbedNotification(
            `📝 **Stream Title Updated**`,
            `New title: *${streamInfo.title}*`,
            0x9146FF,
            'titleChange'
          );
          streamMetadata.titleChangeDetected = false;
        }
        if (streamMetadata.gameChangeDetected && engagementSettings.gameChangeNotif) {
          await sendEmbedNotification(
            `🎮 **Game Changed**`,
            `Now playing: *${streamInfo.game}*`,
            0x9146FF,
            'gameChange'
          );
          streamMetadata.gameChangeDetected = false;
        }
        saveState();
      }

      // Check for viewer milestones
      const viewerMilestones = engagementSettings.viewerMilestones || [100, 250, 500, 1000];
      const nextMilestone = viewerMilestones.find(m => m > (engagementSettings.lastViewerMilestone || 0) && m <= streamInfo.viewers);
      if (nextMilestone) {
        engagementSettings.lastViewerMilestone = nextMilestone;
        await sendEmbedNotification(
          `🎉 **Milestone Reached!**`,
          `We hit **${nextMilestone}** viewers!`,
          0xFFD700
        );
        saveState();
      }

      // Check RPG milestone events
      checkRPGMilestoneEvents(streamInfo.viewers);

      // Expire finished RPG events
      expireRPGEvents();

      return; // ⛔ IMPORTANT: stop here if live
    }

    // ======================
    // STREAM IS OFFLINE
    // ======================
    addLog('info', `Offline check | sv.isLive=${sv.isLive}`);

    // If we're currently live but stream appears offline, start the offline timer
    if (sv.isLive && !liveNow) {
      if (!sv.offlineDetectedAt) {
        sv.offlineDetectedAt = Date.now();
        addLog('info', `Stream went offline, waiting ${dashboardSettings.offlineThreshold / 1000}s before marking offline`);
        return; // Don't mark offline yet
      }

      // Check if we've waited long enough before marking offline
      const offlineFor = Date.now() - sv.offlineDetectedAt;
      if (offlineFor < dashboardSettings.offlineThreshold) {
        addLog('info', `Still within offline threshold (${Math.floor(offlineFor / 1000)}s / ${Math.floor(dashboardSettings.offlineThreshold / 1000)}s)`);
        return;
      }

      // Now mark as offline
      addLog('offline', 'Offline threshold exceeded, marking stream as offline');
    } else if (sv.isLive && liveNow) {
      // Stream came back online, reset timer
      if (sv.offlineDetectedAt) {
        sv.offlineDetectedAt = null;
        addLog('info', 'Stream came back online, offline timer reset');
      }
    } else if (!sv.isLive) {
      // Stream is already offline, reset timer
      sv.offlineDetectedAt = null;
    }

    if (sv.isLive) {
      if (sv.announcementMessageId) {
        try {
          const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
          const msg = await channel.messages.fetch(sv.announcementMessageId);
          
          // Unpin the live message before editing it to stream end
          if (msg.pinned) {
            try {
              await msg.unpin();
              addLog('info', 'Unpinned live message before editing to stream end');
            } catch (err) {
              addLog('warn', 'Could not unpin live message: ' + err.message);
            }
          }
          
          // Finalize viewer graph history BEFORE resetting IDs
          const finalizedGraph = finalizeStreamViewerData();

          // Finalize game timeline
          const finalizedGames = finalizeStreamGameTimeline(Date.now());
          
          // Get user info for VOD link
          const broadcasterLogin = process.env.STREAMER_LOGIN || 'unknown';
          const vodUrl = `https://twitch.tv/${broadcasterLogin}/videos`;
          
          // Calculate stream duration
          const streamStartMs = streamInfo.startedAt 
            ? new Date(streamInfo.startedAt).getTime() 
            : (streamMetadata.streamStartTime ? new Date(streamMetadata.streamStartTime).getTime() : null);
          const streamEndMs = Date.now();
          const streamDurationSec = streamStartMs ? Math.floor((streamEndMs - streamStartMs) / 1000) : 0;
          const durationHours = Math.floor(streamDurationSec / 3600);
          const durationMins = Math.floor((streamDurationSec % 3600) / 60);
          const durationStr = durationHours > 0 ? `${durationHours}h ${durationMins}m` : `${durationMins}m`;
          
          // Calculate comparisons to historical averages
          const peakViewers = finalizedGraph?.peakViewers || 0;
          const avgViewers = finalizedGraph?.avgViewers || 0;
          const historicalAvgPeak = stats.peakViewers || 0;
          const historicalAvgViewers = stats.avgViewers || 0;
          const totalStreams = stats.totalStreams || 1;
          
          // Calculate average stream duration from history
          const historyWithDuration = history.filter(h => h.duration && h.duration > 0);
          const avgDurationSec = historyWithDuration.length > 0 
            ? historyWithDuration.reduce((sum, h) => sum + h.duration, 0) / historyWithDuration.length 
            : 0;
          
          // Comparison indicators
          const peakCompare = peakViewers >= historicalAvgPeak ? '🔺' : '🔻';
          const avgCompare = avgViewers >= historicalAvgViewers ? '🔺' : '🔻';
          const durationCompare = streamDurationSec >= avgDurationSec ? '🔺' : '🔻';
          
          // Calculate percentage differences
          const peakDiff = historicalAvgPeak > 0 ? Math.round(((peakViewers - historicalAvgPeak) / historicalAvgPeak) * 100) : 0;
          const avgDiff = historicalAvgViewers > 0 ? Math.round(((avgViewers - historicalAvgViewers) / historicalAvgViewers) * 100) : 0;
          
          // Create a nice embed for stream end
          const endEmbed = new EmbedBuilder()
            .setColor(peakViewers >= historicalAvgPeak ? 0x00b894 : 0x6441A4) // Green if above average
            .setTitle('🎬 Stream Ended')
            .setDescription(`Thank you for watching! Here's how this stream performed:`)
            .addFields(
              { name: '👥 Peak Viewers', value: `**${peakViewers}** ${peakCompare}\n${peakDiff >= 0 ? '+' : ''}${peakDiff}% vs avg`, inline: true },
              { name: '📊 Avg Viewers', value: `**${avgViewers}** ${avgCompare}\n${avgDiff >= 0 ? '+' : ''}${avgDiff}% vs avg`, inline: true },
              { name: '⏱️ Duration', value: `**${durationStr}** ${durationCompare}`, inline: true }
            )
            .setFooter({ text: `Stream #${totalStreams} • 💜 See you next stream!` })
            .setTimestamp();
          
          // Add game segments if available
          if (finalizedGames?.totals && Object.keys(finalizedGames.totals).length > 0) {
            const gamesList = Object.entries(finalizedGames.totals)
              .sort((a, b) => b[1] - a[1])
              .slice(0, 5)
              .map(([game, seconds]) => {
                const hours = Math.floor(seconds / 3600);
                const mins = Math.floor((seconds % 3600) / 60);
                return `**${game}** - ${hours > 0 ? hours + 'h ' : ''}${mins}m`;
              })
              .join('\n');
            
            endEmbed.addFields({ name: '🎮 Games Played', value: gamesList || 'Unknown', inline: false });
          }
          
          // Add milestone celebration if this was a record-breaking stream
          const milestones = [];
          if (peakViewers > 0 && peakViewers >= historicalAvgPeak && history.length > 1) {
            const allTimePeak = Math.max(...history.map(h => h.peakViewers || 0), 0);
            if (peakViewers >= allTimePeak) {
              milestones.push('🏆 **NEW ALL-TIME PEAK VIEWERS!**');
            }
          }
          if (streamDurationSec > 0 && historyWithDuration.length > 0) {
            const longestStream = Math.max(...historyWithDuration.map(h => h.duration), 0);
            if (streamDurationSec >= longestStream) {
              milestones.push('⏰ **LONGEST STREAM EVER!**');
            }
          }
          if (milestones.length > 0) {
            endEmbed.addFields({ name: '🎉 Milestones', value: milestones.join('\n'), inline: false });
          }
          
          // Try to find the actual VOD
          let actualVodUrl = null;
          try {
            const vodRes = await fetch(`https://api.twitch.tv/helix/videos?user_id=${sv.BROADCASTER_ID}&first=1&sort=time`, {
              headers: {
                'Client-ID': process.env.TWITCH_CLIENT_ID,
                'Authorization': 'Bearer ' + sv.TWITCH_ACCESS_TOKEN
              }
            });
            const vodData = await vodRes.json();
            if (vodData.data && vodData.data.length > 0) {
              actualVodUrl = vodData.data[0].url;
              addLog('info', 'VOD found immediately: ' + actualVodUrl);
            }
          } catch (err) {
            addLog('warn', 'Could not fetch VOD immediately: ' + err.message);
          }

          // Add VOD link button
          const row = new ActionRowBuilder();
          
          if (actualVodUrl) {
            row.addComponents(
              new ButtonBuilder()
                .setLabel('Watch VOD')
                .setStyle(ButtonStyle.Link)
                .setURL(actualVodUrl)
            );
          } else {
            row.addComponents(
              new ButtonBuilder()
                .setLabel('VOD not out yet')
                .setStyle(ButtonStyle.Secondary)
                .setDisabled(true)
            );
          }
          
          await msg.edit({ content: '', embeds: [endEmbed], components: [row] });
          addLog('offline', 'LIVE → OFFLINE (message edited with stream summary)');
          
          // If VOD wasn't available yet, check for it periodically and update the message
          if (!actualVodUrl && sv.announcementMessageId && process.env.DISCORD_CHANNEL_ID) {
            let vodCheckCount = 0;
            const maxChecks = 120; // 120 attempts = ~1 hour with 30s interval
            const vodCheckInterval = setInterval(async () => {
              vodCheckCount++;
              
              try {
                const vodRes = await fetch(`https://api.twitch.tv/helix/videos?user_id=${sv.BROADCASTER_ID}&first=1&sort=time`, {
                  headers: {
                    'Client-ID': process.env.TWITCH_CLIENT_ID,
                    'Authorization': 'Bearer ' + sv.TWITCH_ACCESS_TOKEN
                  }
                });
                const vodData = await vodRes.json();
                if (vodData.data && vodData.data.length > 0) {
                  const foundVodUrl = vodData.data[0].url;
                  addLog('info', 'VOD found on check ' + vodCheckCount + ': ' + foundVodUrl);
                  
                  // Update the message with the new VOD button
                  try {
                    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
                    const msgToUpdate = await channel.messages.fetch(sv.announcementMessageId);
                    const newRow = new ActionRowBuilder()
                      .addComponents(
                        new ButtonBuilder()
                          .setLabel('Watch VOD')
                          .setStyle(ButtonStyle.Link)
                          .setURL(foundVodUrl)
                      );
                    await msgToUpdate.edit({ components: [newRow] });
                    addLog('info', 'Updated stream end message with VOD link');
                    clearInterval(vodCheckInterval);
                  } catch (err) {
                    addLog('error', 'Failed to update message with VOD link: ' + err.message);
                  }
                }
              } catch (err) {
                addLog('warn', 'VOD check failed: ' + err.message);
              }
              
              // After 1 hour of checking, give up and link to latest available VOD
              if (vodCheckCount > maxChecks) {
                clearInterval(vodCheckInterval);
                addLog('warn', 'VOD check timeout after 1 hour - linking to previous VOD');
                
                try {
                  const vodRes = await fetch(`https://api.twitch.tv/helix/videos?user_id=${sv.BROADCASTER_ID}&first=1&sort=time`, {
                    headers: {
                      'Client-ID': process.env.TWITCH_CLIENT_ID,
                      'Authorization': 'Bearer ' + sv.TWITCH_ACCESS_TOKEN
                    }
                  });
                  const vodData = await vodRes.json();
                  if (vodData.data && vodData.data.length > 0) {
                    const fallbackVodUrl = vodData.data[0].url;
                    const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
                    const msgToUpdate = await channel.messages.fetch(sv.announcementMessageId);
                    const newRow = new ActionRowBuilder()
                      .addComponents(
                        new ButtonBuilder()
                          .setLabel('Watch VOD (Previous - Timeout)')
                          .setStyle(ButtonStyle.Link)
                          .setURL(fallbackVodUrl)
                      );
                    await msgToUpdate.edit({ components: [newRow] });
                    addLog('info', 'Updated message with fallback VOD after timeout');
                  }
                } catch (err) {
                  addLog('error', 'Failed to apply fallback VOD: ' + err.message);
                }
              }
            }, 30000); // Check every 30 seconds
          }
        } catch (err) {
          addLog('error', 'Failed to edit live message on offline: ' + err.message);
        }
      }

      // Finalize viewer graph history BEFORE resetting IDs
      const finalizedGraph = finalizeStreamViewerData();

      // Finalize game timeline
      const finalizedGames = finalizeStreamGameTimeline(Date.now());

      // Update the last history entry with end time and duration
      if (history.length > 0 && history[history.length - 1].duration === null) {
        const lastStream = history[history.length - 1];
        const startMs = lastStream.startedAt
          ? new Date(lastStream.startedAt).getTime()
          : (streamMetadata.streamStartTime ? new Date(streamMetadata.streamStartTime).getTime() : NaN);
        const endMs = Date.now();
        if (!isNaN(startMs)) {
          lastStream.duration = Math.max(0, Math.floor((endMs - startMs) / 1000));
        } else {
          lastStream.duration = 0;
        }
        lastStream.endedAt = new Date(endMs).toISOString();

        if (finalizedGraph) {
          lastStream.peakViewers = finalizedGraph.peakViewers;
          lastStream.avgViewers = finalizedGraph.avgViewers;
        }

        if (finalizedGames && finalizedGames.totals) {
          lastStream.gameSegments = Object.entries(finalizedGames.totals)
            .map(([game, seconds]) => ({
              game: (game || '').toString().trim() || 'Unknown',
              seconds: Number(seconds) || 0
            }))
            .sort((a, b) => b.seconds - a.seconds);
        }
        
        // Check if it's Sunday (end of week) and send summary
        const now = getNowInBotTimezone();
        if (now.getDay() === 0) {
          // Calculate week stats
          const weekStart = new Date(now);
          weekStart.setDate(now.getDate() - 7);
          weekStart.setHours(0, 0, 0, 0);
          
          const weekStreams = history.filter(s => s.startedAt && new Date(s.startedAt) >= weekStart);
          const totalDuration = weekStreams.reduce((sum, s) => sum + (s.duration || 0), 0);
          const avgViewers = weekStreams.length > 0 
            ? Math.round(weekStreams.reduce((sum, s) => sum + (s.viewers || 0), 0) / weekStreams.length)
            : 0;
          const peakViewersWeek = weekStreams.length > 0 ? Math.max(...weekStreams.map(s => s.viewers || 0)) : 0;
          const topGame = weekStreams.length > 0
            ? weekStreams.reduce((a, b) => 
                (weekStreams.filter(s => s.game === a.game).length > 
                 weekStreams.filter(s => s.game === b.game).length) ? a : b
              ).game
            : 'N/A';
          
          const hours = Math.floor(totalDuration / 3600);
          const mins = Math.floor((totalDuration % 3600) / 60);
          
          try {
            const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
            await channel.send({
              embeds: [{
                title: '📊 Weekly Stream Summary',
                color: 0x9146FF,
                description: `Week of ${weekStart.toLocaleDateString()} - ${now.toLocaleDateString()}`,
                fields: [
                  { name: '📺 Total Streams', value: String(weekStreams.length), inline: true },
                  { name: '⏱️ Total Hours', value: `${hours}h ${mins}m`, inline: true },
                  { name: '👥 Average Viewers', value: String(avgViewers), inline: true },
                  { name: '📈 Peak Viewers', value: String(peakViewersWeek), inline: true },
                  { name: '🎮 Top Game', value: topGame, inline: true },
                  { name: '\u200b', value: '\u200b', inline: true }
                ]
              }]
            });
            addLog('info', 'Weekly summary sent');
          } catch (err) {
            addLog('error', 'Failed to send weekly summary: ' + err.message);
          }
        }
      }

      sv.isLive = false;
      sv.lastStreamId = null;
      sv.announcementMessageId = null;
      currentStreamGameTimeline = [];

      // Sync offline status to SmartBot
      try {
        smartBot.setKnowledge('isLive', false);
        smartBot.setKnowledge('currentGame', '');
        smartBot.setKnowledge('viewerCount', 0);
      } catch {}
      
      // Save viewer data to history before clearing
      if (currentStreamViewerData.length > 0 && history.length > 0) {
        const lastStream = history[history.length - 1];
        viewerGraphHistory.push({
          streamId: lastStream.id || (lastStream.startedAt + lastStream.game),
          startedAt: lastStream.startedAt,
          peakViewers: lastStream.peakViewers || 0,
          data: currentStreamViewerData.map(v => ({ time: new Date(v.timestamp).toLocaleTimeString(), viewers: v.viewers }))
        });
        // Cap viewerGraphHistory to 30 streams
        if (viewerGraphHistory.length > 30) {
          viewerGraphHistory.splice(0, viewerGraphHistory.length - 30);
        }
      }
      
      // Reset stream snapshot so the dashboard reflects the offline state
      streamInfo.startedAt = null;
      streamInfo.viewers = 0;
      streamInfo.title = '\u2014';
      streamInfo.game = '\u2014';
      streamInfo.thumbnail = null;
      streamMetadata.titleChangeDetected = false;
      streamMetadata.gameChangeDetected = false;
      streamMetadata.streamStartTime = null;
      sv.offlineDetectedAt = null;
      dashboardSettings.hitMilestonesThisStream = {};
      currentStreamViewerData = [];
      io.emit('streamUpdate', streamInfo);
      recomputeStreamStatsFromHistory();
      saveState();
    }

    // ======================
    // DELAYED STREAM LOGIC
    // ======================

    // ⛔ Never mark delayed if canceled
    if (schedule.noStreamToday) return;

    // ✅ Only delay if NOT live
    if (
      !schedule.streamDelayed &&
      !sv.isLive
    ) {
      const now = getNowInBotTimezone();
      const nextComputed = getNextScheduledStream();
      const nextTimeMs = (nextComputed && Number.isFinite(nextComputed.ts))
        ? Number(nextComputed.ts)
        : (schedule.nextStreamAt ? new Date(schedule.nextStreamAt).getTime() : null);
      if (!nextTimeMs) return;
      const nextTime = new Date(nextTimeMs);
      const gracePeriod = 2 * 60 * 1000; // 2 minutes

      if (now >= nextTime.getTime() + gracePeriod) {
        const delayedKey = (nextComputed && Number.isFinite(nextComputed.ts))
          ? new Date(nextTimeMs).toISOString()
          : schedule.nextStreamAt;

        // Avoid re-sending delayed alert for the same scheduled stream
        if (schedule.lastDelayedAlertFor === delayedKey) {
          addLog('info', 'Delayed alert already sent for this schedule — skipping');
          return;
        }
        // Backup check: verify if stream was scheduled (started before or at scheduled time)
        let isScheduledStream = false;
        try {
          const resp = await fetch('https://api.twitch.tv/helix/streams?user_login=' + process.env.STREAMER_LOGIN, {
            headers: {
              'Client-ID': process.env.TWITCH_CLIENT_ID,
              'Authorization': 'Bearer ' + sv.TWITCH_ACCESS_TOKEN
            }
          });
          const data = await resp.json();
          const stream = data.data?.[0];
          
          if (stream) {
            const streamStartTime = new Date(stream.started_at).getTime();
            // If stream started BEFORE scheduled time, it's the same scheduled stream (not a late start)
            if (streamStartTime <= nextTime.getTime()) {
              isScheduledStream = true;
              addLog('info', 'Stream verified as scheduled stream - skipping delayed notification');
            } else {
              const minutesLate = Math.floor((streamStartTime - nextTime.getTime()) / 60000);
              addLog('info', `Stream started ${minutesLate} minutes after scheduled time - treating as delayed`);
            }
          }
        } catch (err) {
          addLog('error', 'Backup check failed: ' + err.message);
        }

        // Only send delayed if it's NOT a scheduled stream that started on time
        if (!isScheduledStream) {
          schedule.streamDelayed = true;
          schedule.lastDelayedAlertFor = delayedKey;
          if (delayedKey && schedule.nextStreamAt !== delayedKey) {
            schedule.nextStreamAt = delayedKey;
          }
          saveState();

          addLog('info', 'Stream marked as delayed');

          if (process.env.DISCORD_CHANNEL_ID) {
            const channel = await client.channels.fetch(
              process.env.DISCORD_CHANNEL_ID
            );

            // CLEAN CHANNEL: Delete previous bot messages and unpin old announcement
            try {
              const messages = await channel.messages.fetch({ limit: 50 });
              const botMessages = messages.filter(m => m.author.id === client.user.id);
              
              // Unpin the old announcement if it exists
              if (sv.announcementMessageId) {
                const oldMsg = botMessages.get(sv.announcementMessageId);
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

            const embed = new EmbedBuilder()
              .setColor(0xFFA500)
              .setDescription(
                `⚠️ **Stream delayed — not cancelled**\nI'll be live shortly!`
              )
              .setImage(
                'https://media4.giphy.com/media/v1.Y2lkPTc5MGI3NjExODA1Y3djcGFtemVlbHkzcDRlMnhyOXEwbGY4NW12cGM2dTg0N3hvZCZlcD12MV9pbnRlcm5hbF9naWZfYnlfaWQmY3Q9Zw/hJF9fl8DfG0AJ1xN4d/giphy.gif'
              )
              .setTimestamp();

            const delayMsg = await channel.send({ embeds: [embed] });
            
            // PIN the delay message
            try {
              await delayMsg.pin();
              addLog('info', 'Pinned delay announcement');
              sv.announcementMessageId = delayMsg.id;
              saveState();
            } catch (err) {
              addLog('warn', 'Could not pin delay message: ' + err.message);
            }
          }
        }
      }
    }

  } catch (err) {
    addLog('error', 'checkStream crashed: ' + err.message);
  } finally {
    sv.lastStreamCheckAt = new Date().toISOString();
    sv.isCheckingStream = false; // 🔓 ALWAYS unlock
  }
} // ✅ <-- This closes the checkStream() function

async function validateTwitchToken(token) {
  const res = await fetch('https://api.twitch.tv/helix/users', {
    headers: {
      'Client-ID': process.env.TWITCH_CLIENT_ID,
      'Authorization': `Bearer ${token}`
    }
  });
  if (!res.ok) {
    let error = {};
    try { error = await res.json(); } catch {}
    throw new Error(`Token validation failed: ${res.status} ${error.message || error.error || 'Unauthorized'}`);
  }
}

async function refreshTwitchToken() {
  if (!twitchTokens.refresh_token) {
    addLog('warn', 'No refresh token available. Skipping token refresh.');
    return false;
  }

  try {
    addLog('info', 'Attempting to refresh Twitch token...');
    const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
      method: 'POST',
      body: new URLSearchParams({
        client_id: process.env.TWITCH_CLIENT_ID,
        client_secret: process.env.TWITCH_CLIENT_SECRET,
        grant_type: 'refresh_token',
        refresh_token: twitchTokens.refresh_token
      })
    });

    const tokenData = await tokenRes.json();

    if (!tokenData.access_token) {
      throw new Error(tokenData.message || 'Failed to refresh token');
    }

    // Update tokens in memory
    const newExpiresAt = Date.now() + (tokenData.expires_in * 1000);
    twitchTokens.access_token = tokenData.access_token;
    twitchTokens.refresh_token = tokenData.refresh_token || twitchTokens.refresh_token; // Keep old refresh token if new one not provided
    twitchTokens.expires_at = newExpiresAt;

    // Update global variable
    sv.TWITCH_ACCESS_TOKEN = tokenData.access_token;

    // Update .env file if it exists (not on Render)
    try {
      if (fs.existsSync('.env')) {
        let envContent = fs.readFileSync('.env', 'utf-8');
        envContent = envContent.replace(/TWITCH_ACCESS_TOKEN=.*/, `TWITCH_ACCESS_TOKEN=${tokenData.access_token}`);
        fs.writeFileSync('.env', envContent);
      }
    } catch { /* .env not available (e.g. Render) — tokens persisted in state.json instead */ }

    // Save to state.json (primary persistence on Render)
    saveState();

    addLog('info', `✅ Twitch token refreshed successfully. New expiry: ${new Date(newExpiresAt).toLocaleString()}`);
    return true;
  } catch (err) {
    addLog('error', `Failed to refresh Twitch token: ${err.message}`);
    return false;
  }
}

async function ensureTwitchInitialized({ reloadFromEnv = false, forceBroadcasterRefresh = false } = {}) {
  if (reloadFromEnv) {
    if (!process.env.TWITCH_ACCESS_TOKEN) {
      throw new Error('No sv.TWITCH_ACCESS_TOKEN in .env file');
    }
    sv.TWITCH_ACCESS_TOKEN = process.env.TWITCH_ACCESS_TOKEN;
    // Update in-memory tokens from .env (in case it was manually edited)
    twitchTokens.access_token = sv.TWITCH_ACCESS_TOKEN;
    addLog('info', 'Twitch token loaded from .env');
  }

  if (!process.env.TWITCH_CLIENT_ID) {
    throw new Error('TWITCH_CLIENT_ID not set in environment');
  }
  if (!process.env.STREAMER_LOGIN) {
    throw new Error('STREAMER_LOGIN not set in environment');
  }
  if (!sv.TWITCH_ACCESS_TOKEN) {
    throw new Error('TWITCH_ACCESS_TOKEN not set');
  }

  try {
    await validateTwitchToken(sv.TWITCH_ACCESS_TOKEN);
    addLog('info', 'Twitch token validated successfully');
  } catch (err) {
    addLog('warn', `Token validation error: ${err.message}`);
    const refreshed = await refreshTwitchToken();
    if (refreshed && sv.TWITCH_ACCESS_TOKEN) {
      await validateTwitchToken(sv.TWITCH_ACCESS_TOKEN);
      addLog('info', 'Twitch token validated successfully after refresh');
    } else {
      addLog('error', 'Your sv.TWITCH_ACCESS_TOKEN is invalid or expired. Re-authorize via the dashboard or update .env, then reload.');
      throw err;
    }
  }

  if (!sv.BROADCASTER_ID || forceBroadcasterRefresh) {
    sv.BROADCASTER_ID = await getBroadcasterId();
    addLog('info', `Broadcaster ID loaded: ${sv.BROADCASTER_ID}`);
  }

  // Start periodic stream checks once.
  if (!twitchCheckInterval) {
    twitchCheckInterval = setInterval(checkStream, 60000);
  }

  // Start schedule alert checks (every 30 seconds)
  if (!scheduleAlertInterval) {
    scheduleAlertInterval = setInterval(checkScheduleAlerts, 30000);
  }

  // Start automatic token refresh checks (every 20 minutes)
  // Tokens expire in 1 hour, so refresh halfway to be safe
  if (!tokenRefreshInterval) {
    tokenRefreshInterval = setInterval(async () => {
      const now = Date.now();
      if (twitchTokens.expires_at && now > (twitchTokens.expires_at - 10 * 60 * 1000)) {
        // Token expires in less than 10 minutes, refresh immediately
        await refreshTwitchToken();
      }
    }, 20 * 60 * 1000); // Check every 20 minutes
    addLog('info', 'Token refresh interval started (every 20 minutes)');
  }

  await checkStream();
  saveState();
}

async function getBroadcasterId() {
  if (!process.env.STREAMER_LOGIN) {
    throw new Error('STREAMER_LOGIN not set in environment');
  }
  if (!process.env.TWITCH_CLIENT_ID) {
    throw new Error('TWITCH_CLIENT_ID not set in environment');
  }
  if (!sv.TWITCH_ACCESS_TOKEN) {
    throw new Error('TWITCH_ACCESS_TOKEN not set');
  }

  try {
    const url = `https://api.twitch.tv/helix/users?login=${process.env.STREAMER_LOGIN}`;
    const res = await fetch(url, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${sv.TWITCH_ACCESS_TOKEN}`
      }
    });
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status} - ${data.error || data.message || 'Unknown'}`);
    }
    
    if (!data.data?.[0]?.id) {
      addLog('error', `API returned no user for login: ${process.env.STREAMER_LOGIN}`);
      addLog('error', `API response: ${JSON.stringify(data)}`);
      throw new Error(`Broadcaster not found for login: ${process.env.STREAMER_LOGIN}`);
    }
    
    return data.data[0].id;
  } catch (err) {
    addLog('error', `getBroadcasterId error: ${err.message}`);
    throw err;
  }
}

async function getChannelVIPs() {
  if (!sv.BROADCASTER_ID) {
    throw new Error('Broadcaster ID not set');
  }
  if (!process.env.TWITCH_CLIENT_ID || !sv.TWITCH_ACCESS_TOKEN) {
    throw new Error('Twitch credentials not configured');
  }

  try {
    const url = `https://api.twitch.tv/helix/channels/vips?broadcaster_id=${sv.BROADCASTER_ID}`;
    const res = await fetch(url, {
      headers: {
        'Client-ID': process.env.TWITCH_CLIENT_ID,
        'Authorization': `Bearer ${sv.TWITCH_ACCESS_TOKEN}`
      }
    });
    
    const data = await res.json();
    
    if (!res.ok) {
      throw new Error(`API error: ${res.status} - ${data.error || data.message || 'Unknown'}`);
    }
    
    return data.data || [];
  } catch (err) {
    addLog('error', `getChannelVIPs error: ${err.message}`);
    throw err;
  }
}

  return {
    computeNextScheduledStream,
    getNextAlertInfo,
    getNextScheduledStream,
    maybeDailyReset,
    processDiscordMsgQueue,
    queueDiscordMessage,
    sendEmbedNotification,
    buildLiveEmbed,
    buildOfflineEmbed,
    announceLive,
    sendScheduleAlert,
    trackStreamGameChange,
    updateStreamInfo,
    fetchChannelInfo,
    finalizeStreamViewerData,
    finalizeStreamGameTimeline,
    checkScheduleAlerts,
    checkStream,
    validateTwitchToken,
    refreshTwitchToken,
    ensureTwitchInitialized,
    getBroadcasterId,
    getChannelVIPs,
  };
}
