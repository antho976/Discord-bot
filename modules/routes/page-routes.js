import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT_DIR = path.resolve(__dirname, '../..');

/**
 * Page render routes, log API, healthz, community pages
 */
export function registerPageRoutes(app, deps) {
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

  app.get('/', requireAuth, (req,res)=>{
    const effectiveTier = req.effectiveTier || getUserTier(req);
    const userAccess = TIER_ACCESS[effectiveTier] || [];
    const pam = req.pageAccessMap || {};
    const hasCustom = Object.keys(pam).length > 0;
    // Check for user's preferred landing page
    const dashPrefs = state?.features?.dashboardPrefs;
    const lp = dashPrefs?.landingPage;
    if (lp && lp !== 'overview') {
      const lpRoutes = { stats: '/stats', welcome: '/welcome', pets: '/pets', moderation: '/moderation' };
      if (lpRoutes[lp]) return res.redirect(lpRoutes[lp] + (req.previewTier ? '?previewTier=' + req.previewTier : ''));
    }
    if (!userAccess.includes('core') || (hasCustom && !pam['overview'])) {
      if (userAccess.includes('community')) return res.redirect('/pets' + (req.previewTier ? '?previewTier=' + req.previewTier : ''));
      if (userAccess.includes('analytics')) return res.redirect('/stats' + (req.previewTier ? '?previewTier=' + req.previewTier : ''));
      return res.redirect('/pets');
    }
    res.send(renderPage('overview', req));
  });
  app.get('/config-general', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('config-general', req)));
  app.get('/config-notifications', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('config-notifications', req)));
  app.get('/smartbot', requireAuth, requireTier('moderator'), (req,res)=>res.redirect('/smartbot-config' + (req.query.previewTier ? '?previewTier=' + req.query.previewTier : '')));
  app.get('/smartbot-config', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('smartbot-config', req)));
  app.get('/smartbot-knowledge', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('smartbot-knowledge', req)));
  app.get('/smartbot-news', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('smartbot-news', req)));
  app.get('/smartbot-stats', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('smartbot-stats', req)));
  app.get('/smartbot-learning', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('smartbot-learning', req)));
  app.get('/smartbot-training', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('smartbot-training', req)));
  app.get('/commands', requireAuth, requireTier('moderator'), (req,res)=>{ const tab = req.query.tab || 'config-commands'; res.send(renderPage(tab, req)); });
  app.get('/logs', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('logs', req)));
  app.get('/api/logs/stream', requireAuth, requireTier('moderator'), (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive'
    });
    res.write('data: {"type":"connected"}\n\n');
    logSSEClients.add(res);
    req.on('close', () => {
      logSSEClients.delete(res);
    });
  });
  
  // Paginated logs API for lazy loading
  app.get('/api/logs/paginated', requireAuth, requireTier('moderator'), (req, res) => {
    try {
      const offset = Math.max(0, parseInt(req.query.offset) || 0);
      const limit = Math.min(200, Math.max(1, parseInt(req.query.limit) || 50));
      const type = (req.query.type || 'all').toLowerCase();
      const source = (req.query.source || 'all').toLowerCase();
      const search = (req.query.search || '').toLowerCase();
  
      let filtered = logs.slice();
  
      // Type filter
      if (type && type !== 'all') {
        filtered = filtered.filter(l => {
          const t = String(l.type || '').toLowerCase();
          return t === type || (type === 'warn' && t === 'warning');
        });
      }
  
      // Source filter (keyword-based detection)
      if (source && source !== 'all') {
        filtered = filtered.filter(l => {
          const msg = String(l.msg || '').toLowerCase();
          if (source === 'twitch') return msg.includes('twitch') || msg.includes('oauth') || msg.includes('helix') || msg.includes('token');
          if (source === 'discord') return msg.includes('discord') || msg.includes('guild') || msg.includes('slash command') || msg.includes('member');
          if (source === 'rpg') return msg.includes('rpg') || msg.includes('quest') || msg.includes('dungeon') || msg.includes('guild boss') || msg.includes('crafting');
          return true; // system = everything else, but we include all for system
        });
      }
  
      // Search filter
      if (search) {
        filtered = filtered.filter(l => {
          const text = (String(l.time || '') + ' ' + String(l.msg || '') + ' ' + String(l.type || '')).toLowerCase();
          return text.includes(search);
        });
      }
  
      const total = filtered.length;
      const page = filtered.slice(offset, offset + limit);
      const hasMore = (offset + limit) < total;
  
      res.json({ logs: page, total, hasMore, offset, limit });
    } catch (err) {
      res.status(500).json({ error: 'Failed to fetch logs', details: String(err.message || err) });
    }
  });
  
  app.get('/config', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('config-commands', req)));
  app.get('/options', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('config-commands', req)));
  app.get('/stats', requireAuth, (req,res)=>{ const tab = req.query.tab || 'stats'; res.send(renderPage(tab, req)); });
  app.get('/suggestions', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('suggestions', req)));
  app.get('/rpg', requireAuth, requireTier('moderator'), (req,res)=>{ 
    res.setHeader('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.setHeader('Pragma', 'no-cache');
    res.setHeader('Expires', '0');
    const tab = req.query.tab || 'rpg-worlds'; 
    res.send(renderPage(tab, req)); 
  });
  app.get('/gathering-areas', requireAuth, requireTier('moderator'), (req, res) => {
    res.setHeader('Cache-Control', 'no-store');
    res.sendFile(path.join(ROOT_DIR, 'rpg/dashboard/gathering-areas-editor.html'));
  });
  app.get('/settings', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('config-commands', req)));
  app.get('/favicon.ico', (_req, res) => { res.set('Cache-Control', 'public, max-age=86400'); res.status(204).end(); });
  app.get('/dashboard-actions.js', (_req, res) => {
    res.set('Cache-Control', 'public, max-age=300, stale-while-revalidate=60');
    res.type('application/javascript');
    res.sendFile(path.join(ROOT_DIR, 'web', 'dashboard-actions.js'));
  });
  app.get('/leveling', requireAuth, requireTier('moderator'), async (req,res)=>{
    // Pre-fetch all user names to avoid displaying IDs
    const allIds = Object.keys(leveling);
    
    // Fetch names in parallel (in batches to avoid rate limits)
    const batchSize = 50;
    for (let i = 0; i < allIds.length; i += batchSize) {
      const batch = allIds.slice(i, i + batchSize);
      await Promise.all(batch.map(id => fetchUserName(id)));
    }
    
    res.send(renderPage('leveling', req));
  });
  app.get('/welcome', requireAuth, requireTier('moderator'), (req,res)=>{
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(renderPage('welcome', req));
  });
  function buildRenderHealthStatus() {
    const now = Date.now();
    const uptimeMs = Math.floor(process.uptime() * 1000);
    const startupGraceMs = 5 * 60 * 1000;
    const streamCheckStaleMs = 6 * 60 * 1000;
    const inStartupGrace = uptimeMs < startupGraceMs;
  
    const discordReady = client.isReady();
    const twitchConfigured = Boolean(process.env.TWITCH_CLIENT_ID && process.env.STREAMER_LOGIN);
    const twitchTokenPresent = Boolean(streamVars.TWITCH_ACCESS_TOKEN);
  
    let lastStreamCheckAgeMs = null;
    if (streamVars.lastStreamCheckAt) {
      const parsed = Date.parse(streamVars.lastStreamCheckAt);
      if (!Number.isNaN(parsed)) {
        lastStreamCheckAgeMs = now - parsed;
      }
    }
  
    const reasons = [];
  
    if (!discordReady && !inStartupGrace) {
      reasons.push('discord_not_ready');
    }
  
    if (twitchConfigured && !twitchTokenPresent && !inStartupGrace) {
      reasons.push('twitch_token_missing');
    }
  
    if (twitchConfigured && twitchTokenPresent && !inStartupGrace) {
      if (lastStreamCheckAgeMs === null || lastStreamCheckAgeMs > streamCheckStaleMs) {
        reasons.push('stream_check_stale');
      }
    }
  
    // Enhanced checks
    const memUsage = process.memoryUsage();
    const heapUsedMB = Math.round(memUsage.heapUsed / 1024 / 1024);
    const heapTotalMB = Math.round(memUsage.heapTotal / 1024 / 1024);
    const rssMB = Math.round(memUsage.rss / 1024 / 1024);
    if (rssMB > 5000) reasons.push('high_memory_usage');
  
    let diskOk = true;
    try { fs.accessSync(DATA_DIR, fs.constants.W_OK); } catch { diskOk = false; reasons.push('data_dir_not_writable'); }
  
    const guildsConnected = client.guilds?.cache?.size || 0;
    const wsLatency = client.ws?.ping || -1;
    if (wsLatency > 500 && !inStartupGrace) reasons.push('high_discord_latency');
  
    return {
      ok: reasons.length === 0,
      status: reasons.length === 0 ? 'ok' : 'degraded',
      timestamp: new Date(now).toISOString(),
      uptimeSec: Math.floor(uptimeMs / 1000),
      checks: {
        discordReady,
        twitchConfigured,
        twitchTokenPresent,
        lastStreamCheckAt: streamVars.lastStreamCheckAt,
        lastStreamCheckAgeMs,
        startupGrace: inStartupGrace,
        memory: { heapUsedMB, heapTotalMB, rssMB },
        disk: { writable: diskOk },
        discord: { guilds: guildsConnected, wsLatencyMs: wsLatency },
        activeSessions: activeSessionTokens ? activeSessionTokens.size : 0
      },
      reasons
    };
  }
  
  app.get('/healthz', (req, res) => {
    const health = buildRenderHealthStatus();
    res.status(health.ok ? 200 : 503).json(health);
  });
  
  app.get('/health', requireAuth, requireTier('moderator'), (req,res)=>{
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(renderPage('health', req));
  });
  app.get('/audit', requireAuth, requireTier('moderator'), (req,res)=>{
    res.set('Cache-Control', 'no-store, no-cache, must-revalidate, proxy-revalidate');
    res.set('Pragma', 'no-cache');
    res.set('Expires', '0');
    res.send(renderPage('audit', req));
  });
  app.get('/embeds', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('embeds', req)));
  app.get('/customcmds', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('customcmds', req)));
  app.get('/accounts', requireAuth, requireTier('owner'), (req,res)=>res.send(renderPage('accounts', req)));
  app.get('/profile', requireAuth, (req,res)=>res.send(renderPage('profile', req)));
  
  // Community pages routes
  app.get('/moderation', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('moderation', req)));
  app.get('/tickets', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('tickets', req)));
  app.get('/reaction-roles', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('reaction-roles', req)));
  app.get('/scheduled-msgs', requireAuth, requireTier('moderator'), (req,res)=>res.redirect('/events?tab=events-reminders'));
  app.get('/automod', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('automod', req)));
  app.get('/starboard', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('starboard', req)));
  app.get('/timezone', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('timezone', req)));
  app.get('/bot-messages', requireAuth, requireTier('moderator'), (req,res)=>res.send(renderPage('bot-messages', req)));
  app.get('/dash-audit', requireAuth, requireTier('admin'), (req,res)=>res.send(renderPage('dash-audit', req)));
  app.get('/features-safety', requireAuth, requireTier('admin'), (req,res)=>res.send(renderPage('features-safety', req)));
  app.get('/features-engagement', requireAuth, requireTier('admin'), (req,res)=>res.send(renderPage('features-engagement', req)));
  app.get('/features-server', requireAuth, requireTier('admin'), (req,res)=>res.send(renderPage('features-server', req)));
  app.get('/features-integrations', requireAuth, requireTier('admin'), (req,res)=>res.send(renderPage('features-integrations', req)));
  app.get('/features-monitoring', requireAuth, requireTier('admin'), (req,res)=>res.send(renderPage('features-monitoring', req)));
  app.get('/features-dashboard', requireAuth, requireTier('admin'), (req,res)=>res.send(renderPage('features-dashboard', req)));
  app.get('/bot-status', requireAuth, requireTier('moderator'), (req,res)=>{
    res.redirect('/health');
  });
  
}
