import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Twitch OAuth, stream controls, token refresh, VIPs, health-data, stream APIs
 */
export function registerTwitchRoutes(app, deps) {
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
    ensureTwitchInitialized, refreshTwitchToken
  } = deps;

  // NEW: Twitch OAuth route
  function getTwitchRedirectUri(req) {
    const forwardedProto = (req.headers['x-forwarded-proto'] || '').toString().split(',')[0].trim();
    const protocol = forwardedProto || req.protocol || 'http';
    const host = req.get('host');
    const computed = `${protocol}://${host}/auth/twitch/callback`;
    const configured = (process.env.TWITCH_REDIRECT_URI || '').trim();
    const renderExternalUrl = (process.env.RENDER_EXTERNAL_URL || '').trim();
  
    const normalizeUrl = (baseUrl) => {
      const trimmed = (baseUrl || '').trim();
      if (!trimmed) return '';
      return trimmed.replace(/\/+$/, '');
    };
  
    const isLocalOrInternal = (value) => {
      const lower = (value || '').toLowerCase();
      return !lower || lower.includes('localhost') || lower.includes('127.0.0.1') || lower.includes('0.0.0.0') || lower.includes('.internal');
    };
  
    const renderBase = normalizeUrl(renderExternalUrl);
    const fallbackRedirect = renderBase ? `${renderBase}/auth/twitch/callback` : computed;
  
    if (configured) {
      if (isLocalOrInternal(configured)) {
        addLog('warn', `Ignoring local/internal TWITCH_REDIRECT_URI (${configured}); using ${fallbackRedirect}`);
        return fallbackRedirect;
      }
      return configured;
    }
  
    if (isLocalOrInternal(host) && renderBase) {
      addLog('warn', `Host ${host || 'unknown'} appears internal; using ${fallbackRedirect} for OAuth redirect`);
      return fallbackRedirect;
    }
  
    return fallbackRedirect;
  }
  
  app.get('/auth/twitch', (req, res) => {
    const clientId = process.env.TWITCH_CLIENT_ID;
    const redirectUri = getTwitchRedirectUri(req);
    const scopes = ['user:read:email', 'channel:read:stream_key', 'channel:read:vips', 'moderator:read:chatters'];
    
    addLog('info', `OAuth redirect URI: ${redirectUri}`);
    
    const authUrl = `https://id.twitch.tv/oauth2/authorize?client_id=${clientId}&redirect_uri=${encodeURIComponent(redirectUri)}&response_type=code&scope=${encodeURIComponent(scopes.join(' '))}`;
    
    res.redirect(authUrl);
  });
  
  // NEW: Twitch OAuth callback
  app.get('/auth/twitch/callback', async (req, res) => {
    const code = req.query.code;
    const error = req.query.error;
    const errorDesc = req.query.error_description;
    const expectedRedirectUri = getTwitchRedirectUri(req);
    
    if (error) {
      addLog('error', `OAuth error: ${error} - ${errorDesc}`);
      return res.send(`
        <h1>❌ Authorization Failed</h1>
        <p><b>Error:</b> ${error}</p>
        <p><b>Details:</b> ${decodeURIComponent(errorDesc || 'Unknown')}</p>
        <p><b>Fix:</b> Make sure the redirect URI in your Twitch app settings matches exactly:</p>
        <pre>${expectedRedirectUri}</pre>
        <p><a href="/">Back to Dashboard</a></p>
      `);
    }
    
    if (!code) {
      return res.send('<h1>No authorization code received</h1><a href="/">Back</a>');
    }
    
    try {
      const redirectUri = expectedRedirectUri;
      const tokenRes = await fetch('https://id.twitch.tv/oauth2/token', {
        method: 'POST',
        body: new URLSearchParams({
          client_id: process.env.TWITCH_CLIENT_ID,
          client_secret: process.env.TWITCH_CLIENT_SECRET,
          code,
          grant_type: 'authorization_code',
          redirect_uri: redirectUri
        })
      });
      
      const tokenData = await tokenRes.json();
      
      if (!tokenData.access_token) {
        throw new Error(tokenData.message || 'Failed to get token');
      }
      
      // Store tokens with expiration time
      const expiresAt = Date.now() + (tokenData.expires_in * 1000);
      twitchTokens.access_token = tokenData.access_token;
      twitchTokens.refresh_token = tokenData.refresh_token;
      twitchTokens.expires_at = expiresAt;
  
      streamVars.TWITCH_ACCESS_TOKEN = tokenData.access_token;
      
      // Update .env file if it exists (not on Render)
      try {
        if (fs.existsSync('.env')) {
          let envContent = fs.readFileSync('.env', 'utf-8');
          envContent = envContent.replace(/TWITCH_ACCESS_TOKEN=.*/, `TWITCH_ACCESS_TOKEN=${tokenData.access_token}`);
          fs.writeFileSync('.env', envContent);
        }
      } catch { /* .env not available — tokens persisted in state.json instead */ }
      
      // Save to state.json (primary persistence on Render)
      saveState();
      
      addLog('info', 'Twitch token obtained via OAuth2');
      addLog('info', `Token expires at: ${new Date(expiresAt).toLocaleString()}`);
  
      // If Discord is already ready, immediately re-initialize Twitch checks
      // (This fixes the case where startup failed due to an expired token.)
      if (client?.isReady?.()) {
        try {
          await ensureTwitchInitialized({ reloadFromEnv: false, forceBroadcasterRefresh: true });
          addLog('info', 'Twitch re-initialized after OAuth token update');
        } catch (e) {
          addLog('error', 'Failed to re-initialize Twitch after OAuth: ' + (e?.message || e));
        }
      }
      
      res.send(`
        <h1>✅ Authorization Successful!</h1>
        <p>Your Twitch token has been generated and saved.</p>
        <p>Token: <code>${tokenData.access_token.substring(0, 20)}...</code></p>
        <p><strong>Expires at:</strong> ${new Date(expiresAt).toLocaleString()}</p>
        <p style="color: #4caf50;"><strong>✅ Automatic Refresh Enabled:</strong> Your token will automatically refresh before expiring.</p>
        <p><strong>Token has been saved automatically.</strong></p>
        <p style="color:#8b8fa3;font-size:12px">The token is stored securely in state.json and will auto-refresh before expiring.</p>
        <p><a href="/">Back to Dashboard</a></p>
      `);
    } catch (err) {
      addLog('error', 'OAuth callback error: ' + err.message);
      res.send(`<h1>❌ Error: ${err.message}</h1><p><a href="/">Back to Dashboard</a></p>`);
    }
  });
  
  app.post('/twitch/reload', requireAuth, requireTier('owner'), async (_req, res) => {
    try {
      await ensureTwitchInitialized({ reloadFromEnv: true, forceBroadcasterRefresh: true });
      dashAudit(_req.userName, 'twitch-reload', 'Reloaded Twitch config');
      return res.json({ success: true });
    } catch (err) {
      addLog('error', 'Twitch reload failed: ' + err.message);
      return res.status(500).json({ success: false, error: err.message });
    }
  });
  
  app.post('/twitch/refresh', requireAuth, requireTier('owner'), async (_req, res) => {
    try {
      const success = await refreshTwitchToken();
      if (success) {
        dashAudit(_req.userName, 'twitch-refresh', 'Refreshed Twitch token');
        return res.json({ success: true, message: '✅ Token refreshed successfully!' });
      } else {
        return res.status(500).json({ success: false, message: '❌ Failed to refresh token. Check logs for details.' });
      }
    } catch (err) {
      addLog('error', 'Twitch token refresh failed: ' + err.message);
      return res.status(500).json({ success: false, message: `❌ Refresh error: ${err.message}` });
    }
  });
  
  app.post('/logs/clear', requireAuth, requireTier('owner'), (_req,res)=>{ logs.length = 0; fs.writeFileSync(LOG_FILE,'[]'); addLog('info','Logs cleared'); dashAudit(_req.userName, 'logs-clear', 'Cleared all logs'); res.sendStatus(200); });
  app.post('/reset-live', requireAuth, requireTier('owner'), async (_req,res)=>{ streamVars.isLive=false; streamVars.lastStreamId=null; streamVars.announcementMessageId=null; streamVars.suppressNextAnnounce=true; saveState(); addLog('info','Live state reset manually'); dashAudit(_req.userName, 'reset-live', 'Reset live state'); await checkStream(); res.sendStatus(200); });
  app.post('/test-live', requireAuth, requireTier('owner'), async (_req,res)=>{ await announceLive(true,true); dashAudit(_req.userName, 'test-live', 'Triggered test live'); res.sendStatus(200); });
  app.post('/test-end', requireAuth, requireTier('owner'), async (_req,res)=>{
    if(!streamVars.announcementMessageId) return res.sendStatus(400);
    try{
      const channel = await client.channels.fetch(process.env.DISCORD_CHANNEL_ID);
      const msg = await channel.messages.fetch(streamVars.announcementMessageId);
      await msg.edit({content:'⚫ Stream ended *(test)*', embeds:[buildOfflineEmbed()]});
      addLog('test','Fake stream end triggered');
      dashAudit(_req.userName, 'test-end', 'Triggered test stream end');
      setTimeout(()=>msg.delete().catch(()=>{}),60000);
      res.sendStatus(200);
    }catch{ addLog('error','Fake stream end failed'); res.sendStatus(500);}
  });
  app.post('/reset-schedule', requireAuth, requireTier('owner'), (_req, res) => {
    schedule.noStreamToday = false;
    schedule.streamDelayed = false;
    schedule.alertsSent = { oneHour: false, tenMin: false };
  
    computeNextScheduledStream(true); // force recompute
    saveState();
  
    addLog('info', 'Schedule reset manually (testing)');
    dashAudit(_req.userName, 'reset-schedule', 'Reset schedule manually');
    res.sendStatus(200);
  });
  
  app.post('/reset-delay-mark', requireAuth, requireTier('owner'), (_req, res) => {
    schedule.streamDelayed = false;
    schedule.lastDelayedAlertFor = null;
    saveState();
    addLog('info', 'Delay mark reset manually');
    dashAudit(_req.userName, 'reset-delay-mark', 'Reset delay mark manually');
    res.sendStatus(200);
  });
  
  app.get('/api/vips', requireAuth, async (req, res) => {
    try {
      const vips = await getChannelVIPs();
      res.json({ vips });
    } catch (err) {
      res.json({ error: err.message, vips: [] });
    }
  });
  
  // ── Overview widget API endpoints ──
  app.get('/api/health-data', requireAuth, (req, res) => {
    const mem = process.memoryUsage();
    const memHeap = Math.round(mem.heapUsed / 1024 / 1024);
    const memHeapTotal = Math.round(mem.heapTotal / 1024 / 1024);
    const memRss = Math.round(mem.rss / 1024 / 1024);
    const memPct = memHeapTotal > 0 ? Math.round((memHeap / memHeapTotal) * 100) : 0;
    const memColor = memPct > 80 ? '#ef5350' : memPct > 60 ? '#ffca28' : '#4caf50';
    const wsPing = client?.ws?.ping ?? 0;
    const pingColor = wsPing > 300 ? '#ef5350' : wsPing > 150 ? '#ffca28' : '#4caf50';
    const discordReady = !!client?.readyAt;
    const guildCount = client?.guilds?.cache?.size ?? 0;
    const guild = client.guilds.cache.first();
    const memberCount = guild?.memberCount || Object.keys(membersCache.members || {}).length || 0;
    const cacheAge = membersCache.lastFullSync ? Math.round((Date.now() - membersCache.lastFullSync) / 60000) : null;
    const botUptimeMs = Date.now() - startTime;
    const d = Math.floor(botUptimeMs / 86400000);
    const h = Math.floor((botUptimeMs % 86400000) / 3600000);
    const m = Math.floor((botUptimeMs % 3600000) / 60000);
    const botUptime = (d > 0 ? d + 'd ' : '') + h + 'h ' + m + 'm';
    const streamLive = !!streamInfo.startedAt && streamVars.isLive;
    const healthIssues = [];
    if (!discordReady) healthIssues.push('Discord offline');
    if (!streamVars.TWITCH_ACCESS_TOKEN) healthIssues.push('No Twitch token');
    if (wsPing > 300) healthIssues.push('High ping');
    if (memPct > 80) healthIssues.push('High memory');
    const allLogs = Array.isArray(logs) ? logs : [];
    const now24h = Date.now() - 86400000;
    const errors24h = allLogs.filter(l => l.type === 'error' && l.ts && new Date(l.ts).getTime() > now24h).length;
    const warns24h = allLogs.filter(l => l.type === 'warn' && l.ts && new Date(l.ts).getTime() > now24h).length;
    if (errors24h > 10) healthIssues.push('Many errors');
    const healthStatus = healthIssues.length === 0 ? 'healthy' : healthIssues.length <= 2 ? 'degraded' : 'critical';
    const healthColors = { healthy: '#4caf50', degraded: '#ffca28', critical: '#ef5350' };
    const healthEmojis = { healthy: '🟢', degraded: '🟡', critical: '🔴' };
    const healthLabels = { healthy: 'Healthy', degraded: 'Degraded', critical: 'Critical' };
    res.json({
      healthStatus, healthColor: healthColors[healthStatus], healthEmoji: healthEmojis[healthStatus],
      healthLabel: healthLabels[healthStatus], healthIssues, botUptime, wsPing, pingColor,
      memHeap, memHeapTotal, memRss, memPct, memColor, discordReady, guildCount, memberCount,
      cacheAge, streamLive, errors24h, warns24h
    });
  });
  
  app.get('/api/chat-stats', requireAuth, (req, res) => {
    const topChatters = Object.entries(chatStats.messages).sort((a,b) => b[1] - a[1]).slice(0, 10).map(([name, count]) => ({ name, count }));
    const topEmotes = Object.entries(chatStats.emotes).sort((a,b) => b[1] - a[1]).slice(0, 15).map(([emote, count]) => ({ emote, count }));
    res.json({ topChatters, topEmotes, totalMessages: chatStats.totalMessages, tracking: !!chatStats.streamStart });
  });
  
  app.get('/api/rate-limits', requireAuth, (req, res) => {
    const now = Date.now();
    const discordWs = client.ws?.ping ?? -1;
    const discordGuilds = client.guilds?.cache?.size ?? 0;
    res.json({
      twitch: { remaining: apiRateLimits.twitchRemaining, limit: apiRateLimits.twitchLimit, resetsAt: apiRateLimits.twitchReset, pct: apiRateLimits.twitchLimit > 0 ? Math.round((apiRateLimits.twitchRemaining / apiRateLimits.twitchLimit) * 100) : 100 },
      discord: { wsping: discordWs, guilds: discordGuilds, calls: apiRateLimits.discordCalls || 0, callsMinute: apiRateLimits.discordCallsMinute || 0 },
      youtube: { calls: apiRateLimits.youtubeCalls || 0, callsMinute: apiRateLimits.youtubeCallsMinute || 0 },
      dashboard: { calls: apiRateLimits.dashboardCalls || 0, callsMinute: apiRateLimits.dashboardCallsMinute || 0 },
      callsThisMinute: apiRateLimits.callsThisMinute,
      totalCalls: apiRateLimits.totalCalls
    });
  });
  
  app.get('/api/stream-schedule', requireAuth, (req, res) => {
    const sched = schedule || {};
    res.json({
      nextStreamAt: sched.nextStreamAt || null,
      noStreamToday: !!sched.noStreamToday,
      streamDelayed: !!sched.streamDelayed,
      weekly: sched.weekly || {},
      isLive: !!streamInfo.startedAt
    });
  });
  
  app.post('/api/stream-schedule', requireAuth, requireTier('admin'), (req, res) => {
    try {
      const { weekly } = req.body;
      if (!weekly || typeof weekly !== 'object') return res.json({ error: 'Invalid schedule data' });
      // Validate each day entry
      const validDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
      const cleaned = {};
      for (const [day, slot] of Object.entries(weekly)) {
        if (!validDays.includes(day)) continue;
        if (slot && typeof slot === 'object') {
          const h = parseInt(slot.hour);
          const m = parseInt(slot.minute);
          if (h >= 0 && h <= 23 && m >= 0 && m <= 59) {
            cleaned[day] = { hour: h, minute: m };
          }
        }
      }
      if (!schedule) schedule = {};
      schedule.weekly = cleaned;
      computeNextScheduledStream(true);
      saveState();
      addLog('info', 'Weekly stream schedule updated via dashboard');
      res.json({ success: true, weekly: cleaned, nextStreamAt: schedule.nextStreamAt });
    } catch (err) {
      res.json({ error: err.message });
    }
  });
  
  app.get('/api/stream-thumbnail', requireAuth, (req, res) => {
    const thumb = streamInfo.thumbnail;
    const channel = process.env.TWITCH_CHANNEL || process.env.STREAMER_LOGIN || '';
    // Add cache-bust timestamp for live refresh
    const url = thumb ? thumb + (thumb.includes('?') ? '&' : '?') + 'cb=' + Date.now() : null;
    res.json({ url, isLive: !!streamInfo.startedAt, channel });
  });
  
  app.get('/vips', requireAuth, async (req, res) => {
    try {
      const vips = await getChannelVIPs();
      
      res.send(`<!DOCTYPE html>
  <html>
  <head>
    <title>Channel VIPs</title>
    <style>
      body { background: #1a1a1f; color: #e0e0e0; font-family: 'Segoe UI', Tahoma, sans-serif; padding: 20px; }
      .container { max-width: 800px; margin: 0 auto; background: #26262c; padding: 30px; border-radius: 8px; }
      h1 { color: #9146ff; margin-top: 0; }
      .vip-list { list-style: none; padding: 0; }
      .vip-item { background: #1a1a1f; padding: 15px; margin: 10px 0; border-radius: 4px; display: flex; align-items: center; }
      .vip-name { font-size: 18px; font-weight: bold; color: #e0e0e0; }
      .vip-id { font-size: 12px; color: #999; margin-left: 10px; }
      .badge { background: #9146ff; color: white; padding: 4px 8px; border-radius: 4px; font-size: 12px; margin-left: auto; }
      .back-link { display: inline-block; margin-top: 20px; color: #9146ff; text-decoration: none; }
      .back-link:hover { text-decoration: underline; }
      .no-vips { color: #999; font-style: italic; }
    </style>
  </head>
  <body>
    <div class="container">
      <h1>👑 Channel VIPs</h1>
      ${vips.length > 0 ? `
        <ul class="vip-list">
          ${vips.map(vip => `
            <li class="vip-item">
              <div>
                <span class="vip-name">${vip.user_name}</span>
                <span class="vip-id">ID: ${vip.user_id}</span>
              </div>
              <span class="badge">VIP</span>
            </li>
          `).join('')}
        </ul>
        <p style="color: #999; margin-top: 20px;">Total VIPs: ${vips.length}</p>
      ` : `
        <p class="no-vips">No VIPs found for this channel.</p>
      `}
      <a href="/" class="back-link">← Back to Dashboard</a>
    </div>
  </body>
  </html>`);
    } catch (err) {
      res.status(500).send(`
        <h1>Error</h1>
        <p>${err.message}</p>
        <p><a href="/">Back to Dashboard</a></p>
      `);
    }
  });
}
