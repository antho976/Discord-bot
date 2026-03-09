/**
 * Analytics Dashboard Render Tabs
 * Extracted from index.js — all stats/analytics/health/reports render tabs
 */
import fs from 'fs';
import os from 'os';
import path from 'path';

let _getState;

/** Call once at startup with a function that returns current state */
export function initAnalyticsTabs(getStateFn) {
  _getState = getStateFn;
}

export function renderHealthTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const _now = Date.now();
  const yaStatus = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});

  // Bot uptime
  const _botUptimeMs = _now - startTime;
  const _botUptimeD = Math.floor(_botUptimeMs / 86400000);
  const _botUptimeH = Math.floor((_botUptimeMs % 86400000) / 3600000);
  const _botUptimeM = Math.floor((_botUptimeMs % 3600000) / 60000);
  const _botUptimeStr = (_botUptimeD > 0 ? _botUptimeD + 'd ' : '') + _botUptimeH + 'h ' + _botUptimeM + 'm';

  // System Health Data
  const _mem = process.memoryUsage();
  const _memHeap = Math.round(_mem.heapUsed / 1024 / 1024);
  const _memHeapTotal = Math.round(_mem.heapTotal / 1024 / 1024);
  const _memRss = Math.round(_mem.rss / 1024 / 1024);
  const _memExternal = Math.round((_mem.external || 0) / 1024 / 1024);
  const _memArrayBuffers = Math.round((_mem.arrayBuffers || 0) / 1024 / 1024);
  const _memPct = _memHeapTotal > 0 ? Math.round((_memHeap / _memHeapTotal) * 100) : 0;
  const _memColor = _memPct > 80 ? '#ef5350' : _memPct > 60 ? '#ffca28' : '#4caf50';
  const _wsPing = client?.ws?.ping ?? 0;
  const _pingColor = _wsPing > 300 ? '#ef5350' : _wsPing > 150 ? '#ffca28' : '#4caf50';
  const _discordReady = client.isReady();
  const _guild = client.guilds.cache.first();
  const _guildCount = client?.guilds?.cache?.size ?? 0;
  const _memberCount = _guild?.memberCount || Object.keys(membersCache.members || {}).length || 0;
  const _channelCount = _guild?.channels?.cache?.size || 0;
  const _roleCount = _guild?.roles?.cache?.size || 0;

  // OS-level metrics
  const _cpuLoad = os.loadavg();
  const _cpuCount = os.cpus().length;
  const _cpuModel = os.cpus()[0]?.model || 'Unknown';
  const _osTotalMem = Math.round(os.totalmem() / 1024 / 1024);
  const _osFreeMem = Math.round(os.freemem() / 1024 / 1024);
  const _osUsedMem = _osTotalMem - _osFreeMem;
  const _osMemPct = _osTotalMem > 0 ? Math.round((_osUsedMem / _osTotalMem) * 100) : 0;
  const _osMemColor = _osMemPct > 85 ? '#ef5350' : _osMemPct > 70 ? '#ffca28' : '#4caf50';
  const _cpuLoadPct = _cpuCount > 0 ? Math.round((_cpuLoad[0] / _cpuCount) * 100) : 0;
  const _cpuColor = _cpuLoadPct > 80 ? '#ef5350' : _cpuLoadPct > 50 ? '#ffca28' : '#4caf50';
  const _osUptime = os.uptime();
  const _osUptimeD = Math.floor(_osUptime / 86400);
  const _osUptimeH = Math.floor((_osUptime % 86400) / 3600);
  const _osUptimeStr = (_osUptimeD > 0 ? _osUptimeD + 'd ' : '') + _osUptimeH + 'h';
  const _platform = os.platform() + ' ' + os.release();
  const _hostname = os.hostname();

  // Discord cache sizes
  const _userCacheSize = client.users?.cache?.size ?? 0;
  const _emojiCacheSize = _guild?.emojis?.cache?.size ?? 0;
  const _stickerCacheSize = _guild?.stickers?.cache?.size ?? 0;
  const _voiceStates = _guild?.voiceStates?.cache?.size ?? 0;
  const _presences = _guild?.presences?.cache?.size ?? 0;

  // Active connections & features
  const _sseClients = logSSEClients.size;
  const _activeGiveaways = giveaways.filter(g => g.active && g.endTime > _now && !g.paused).length;
  const _activePolls = polls.filter(p => p.active).length;
  const _customCmdCount = customCommands.length;
  const _totalLeveledUsers = Object.keys(leveling || {}).length;
  const _totalGiveaways = giveaways.length;
  const _totalPolls = polls.length;

  // RPG stats
  const _rpgActive = typeof rpgBot !== 'undefined' && rpgBot;
  const _rpgActiveEvents = (rpgEvents?.activeEvents || []).length;

  // File sizes
  let _stateFileSize = '—';
  let _logFileSize = '—';
  let _dataFolderSize = '—';
  try { _stateFileSize = Math.round(fs.statSync(STATE_PATH).size / 1024) + ' KB'; } catch {}
  try { _logFileSize = Math.round(fs.statSync(LOG_FILE).size / 1024) + ' KB'; } catch {}
  try {
    let _dfSize = 0;
    const _dFiles = fs.readdirSync(DATA_DIR);
    _dFiles.forEach(f => { try { _dfSize += fs.statSync(path.join(DATA_DIR, f)).size; } catch {} });
    _dataFolderSize = (_dfSize / 1024 / 1024).toFixed(1) + ' MB';
  } catch {}

  // Log volume analysis
  const _allLogs = Array.isArray(logs) ? logs : [];
  const _1hAgo = _now - 3600000;
  const _logsLastHour = _allLogs.filter(l => l.ts && new Date(l.ts).getTime() > _1hAgo).length;
  const _logRate = _allLogs.length > 0 ? Math.round(_allLogs.length / Math.max(1, _botUptimeMs / 3600000)) : 0;

  // Event loop lag estimate (simple heuristic)
  const _v8 = process.versions;
  const _nodeArch = process.arch;
  const _cacheAge = membersCache.lastFullSync ? Math.round((_now - membersCache.lastFullSync) / 60000) : null;
  const _processUptimeS = Math.floor(process.uptime());
  const _processUptimeStr = Math.floor(_processUptimeS / 3600) + 'h ' + Math.floor((_processUptimeS % 3600) / 60) + 'm';
  const _nodeVersion = process.version;
  const _pid = process.pid;
  const _userTag = client?.user?.tag ?? 'N/A';

  // Extra health info
  const _nodeOptions = process.env.NODE_OPTIONS || '—';
  const _networkInterfaces = Object.entries(os.networkInterfaces()).flatMap(([name, addrs]) => (addrs || []).filter(a => !a.internal && a.family === 'IPv4').map(a => name + ': ' + a.address)).slice(0, 3);
  const _networkStr = _networkInterfaces.length > 0 ? _networkInterfaces.join(', ') : '—';
  let _fdCount = '—';
  try { _fdCount = fs.readdirSync('/proc/self/fd').length; } catch {}
  const _uptimeSec = Math.floor(process.uptime());
  const _uptimeFull = Math.floor(_uptimeSec / 86400) + 'd ' + Math.floor((_uptimeSec % 86400) / 3600) + 'h ' + Math.floor((_uptimeSec % 3600) / 60) + 'm ' + (_uptimeSec % 60) + 's';
  const _startedAtStr = new Date(_now - _botUptimeMs).toLocaleString('en-US');

  // Error / warning counters (last 24h)
  const _24hAgo = _now - 86400000;
  const _errors24h = _allLogs.filter(l => l.type === 'error' && l.ts && new Date(l.ts).getTime() > _24hAgo).length;
  const _warns24h = _allLogs.filter(l => l.type === 'warn' && l.ts && new Date(l.ts).getTime() > _24hAgo).length;

  // Recent errors/warnings
  const _recentErrors = _allLogs.filter(l => l.type === 'error' || l.type === 'warn').slice(-10).reverse();
  const _recentEventsHtml = _recentErrors.length > 0 ? _recentErrors.map(l => {
    const col = l.type === 'error' ? '#ef5350' : '#ffca28';
    const icon = l.type === 'error' ? '❌' : '⚠️';
    const ts = l.ts ? new Date(l.ts).toLocaleTimeString() : '—';
    return '<div style="padding:8px 10px;font-size:13px;border-bottom:1px solid #222228;display:flex;gap:8px;align-items:flex-start"><span style="color:' + col + ';flex-shrink:0">' + icon + '</span><span style="color:#8b8fa3;flex-shrink:0;min-width:65px">' + ts + '</span><span style="color:' + col + ';word-break:break-word">' + String(l.msg || l.message || '—').substring(0, 200) + '</span></div>';
  }).join('') : '<div style="padding:16px;text-align:center;color:#8b8fa3;font-size:13px">No recent warnings or errors 🎉</div>';

  // Command & mod usage
  const _cmdData = loadJSON(CMD_USAGE_PATH, { commands: {}, hourly: [] });
  const _totalCmds = Object.values(_cmdData.commands || {}).reduce((s, c) => s + (c.count || 0), 0);
  const _modData = loadJSON(MODERATION_PATH, { warnings: [], cases: [] });
  const _totalCases = (_modData.cases || []).length;
  const _totalWarnings = (_modData.warnings || []).length;

  // Overall health verdict
  const _healthIssues = [];
  if (!_discordReady) _healthIssues.push('Discord offline');
  if (!TWITCH_ACCESS_TOKEN) _healthIssues.push('No Twitch token');
  if (_wsPing > 300) _healthIssues.push('High ping');
  if (_memPct > 80) _healthIssues.push('High memory');
  if (_osMemPct > 90) _healthIssues.push('OS memory critical');
  if (_cpuLoadPct > 90) _healthIssues.push('CPU overloaded');
  if (_errors24h > 10) _healthIssues.push('Many errors');
  if (_logsLastHour > 100) _healthIssues.push('High log volume');
  const _healthStatus = _healthIssues.length === 0 ? 'healthy' : _healthIssues.length <= 2 ? 'degraded' : 'critical';
  const _healthEmoji = _healthStatus === 'healthy' ? '🟢' : _healthStatus === 'degraded' ? '🟡' : '🔴';
  const _healthLabel = _healthStatus === 'healthy' ? 'Healthy' : _healthStatus === 'degraded' ? 'Degraded' : 'Critical';
  const _healthColor = _healthStatus === 'healthy' ? '#4caf50' : _healthStatus === 'degraded' ? '#ffca28' : '#ef5350';

  // Stream integration
  const _streamLive = !!streamInfo.startedAt;
  const _schedDelay = schedule?.streamDelayed ? 'Yes' : 'No';
  const _uptimeMs = streamInfo.startedAt ? _now - new Date(streamInfo.startedAt).getTime() : 0;
  const _uptimeH = Math.floor(_uptimeMs / 3600000);
  const _uptimeM = Math.floor((_uptimeMs % 3600000) / 60000);
  const _uptimeStr = streamInfo.startedAt ? _uptimeH + 'h ' + _uptimeM + 'm' : '—';

  // Token / YouTube
  const _tokenExpiresAt = twitchTokens.expires_at ? new Date(twitchTokens.expires_at).getTime() : 0;
  const _tokenHoursLeft = _tokenExpiresAt ? Math.max(0, Math.round((_tokenExpiresAt - _now) / 3600000)) : null;
  const _tokenWarn = _tokenHoursLeft !== null && _tokenHoursLeft < 24;
  const _tokenStatusHtml = TWITCH_ACCESS_TOKEN ? '<span style="color:#4caf50">✅ Token Active</span>' : '<span style="color:#ef5350">❌ Not Authorized</span>';
  const _ytHealthy = !yaStatus.health?.lastError;
  const _ytLastCheck = yaStatus.health?.lastCheckAt ? new Date(yaStatus.health.lastCheckAt).toLocaleString() : '—';
  const _ytHealthLine = yaStatus.health?.lastError ? '<span style="color:#ef5350">⚠️ YouTube error: ' + yaStatus.health.lastError + '</span>' : '<span style="color:#4caf50">✅ YouTube checker healthy</span>';

  return `
<div class="card" style="margin-bottom:16px">
  <div style="display:flex;align-items:center;gap:12px;margin-bottom:16px">
    <h2 style="margin:0">🛡️ Bot &amp; System Health</h2>
    <span id="ovHealthBadge" style="font-size:11px;font-weight:500;padding:2px 10px;border-radius:10px;background:${_healthColor}22;color:${_healthColor};border:1px solid ${_healthColor}44">${_healthEmoji} ${_healthLabel}</span>
    <span style="margin-left:auto;display:flex;align-items:center;gap:8px">
      <button class="small" onclick="ovRefreshHealth()" style="width:auto;padding:3px 8px;font-size:10px;background:#33364a" title="Refresh now">🔄</button>
      <label style="display:flex;align-items:center;gap:4px;font-size:10px;color:#8b8fa3;cursor:pointer">
        <input type="checkbox" id="ovHealthAutoRefresh" onchange="ovToggleHealthRefresh(this.checked)" style="width:12px;height:12px"> Auto (30s)
      </label>
    </span>
  </div>

  <!-- Top Summary Bar -->
  <div id="ovHealthSummary" style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:14px;padding:10px 14px;background:#1a1d28;border-radius:8px;border-left:3px solid ${_healthColor};align-items:center;font-size:12px">
    <span style="color:${_healthColor};font-weight:700">${_healthEmoji} ${_healthLabel}</span>
    <span style="color:#555">|</span>
    <span style="color:#ccc">⏱️ Bot Uptime: <b style="color:#5865f2">${_botUptimeStr}</b></span>
    <span style="color:#555">|</span>
    <span style="color:#ccc">📡 Ping: <b style="color:${_pingColor}">${_wsPing}ms</b></span>
    <span style="color:#555">|</span>
    <span style="color:#ccc">💾 Memory: <b style="color:${_memColor}">${_memHeap}MB</b> <span style="color:#666">(${_memPct}%)</span></span>
    <span style="color:#555">|</span>
    <span style="color:#ccc">🗄️ Cache: <b>${_cacheAge !== null ? _cacheAge + 'm ago' : '—'}</b></span>
    ${_healthIssues.length > 0 ? '<span style="color:#555">|</span><span style="color:#ef5350;font-size:11px">⚠️ ' + _healthIssues.join(', ') + '</span>' : ''}
  </div>

  <!-- Sub-tab navigation -->
  <div style="display:flex;gap:4px;margin-bottom:14px;border-bottom:1px solid #2a2f3a;padding-bottom:8px" id="ovHealthTabs">
    <button class="small" onclick="ovHealthTab('overview')" data-htab="overview" style="width:auto;padding:5px 12px;font-size:11px;background:#5b5bff;border-radius:4px 4px 0 0">📊 Overview</button>
    <button class="small" onclick="ovHealthTab('platform')" data-htab="platform" style="width:auto;padding:5px 12px;font-size:11px;border-radius:4px 4px 0 0">🌐 Platforms</button>
    <button class="small" onclick="ovHealthTab('actions')" data-htab="actions" style="width:auto;padding:5px 12px;font-size:11px;border-radius:4px 4px 0 0">⚡ Actions</button>
  </div>

  <!-- Overview Tab -->
  <div id="ovHealth_overview">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:14px">
      <!-- Uptime & Process -->
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #5865f2">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">⏱️ Uptime &amp; Process</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:10px;color:#666">Bot Uptime</div><div style="font-size:18px;font-weight:700;color:#5865f2">${_botUptimeStr}</div></div>
          <div><div style="font-size:10px;color:#666">Process</div><div style="font-size:18px;font-weight:700;color:#4caf50">${_processUptimeStr}</div></div>
          <div><div style="font-size:10px;color:#666">OS Uptime</div><div style="font-size:12px;font-weight:600;color:#ccc">${_osUptimeStr}</div></div>
          <div><div style="font-size:10px;color:#666">PID</div><div style="font-size:12px;font-weight:600;color:#ccc">${_pid}</div></div>
          <div><div style="font-size:10px;color:#666">Full Uptime</div><div style="font-size:11px;font-weight:600;color:#ccc">${_uptimeFull}</div></div>
          <div><div style="font-size:10px;color:#666">Started At</div><div style="font-size:11px;font-weight:600;color:#ccc">${_startedAtStr}</div></div>
          <div><div style="font-size:10px;color:#666">File Descriptors</div><div style="font-size:11px;font-weight:600;color:#ccc">${_fdCount}</div></div>
          <div><div style="font-size:10px;color:#666">Network</div><div style="font-size:10px;font-weight:600;color:#ccc;word-break:break-all">${_networkStr}</div></div>
        </div>
        <div style="margin-top:8px;padding-top:6px;border-top:1px solid #333">
          <div style="font-size:10px;color:#666">NODE_OPTIONS</div><div style="font-size:10px;font-weight:500;color:#8b8fa3;font-family:monospace;word-break:break-all">${_nodeOptions}</div>
        </div>
      </div>
      <!-- Memory -->
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_memColor}">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">💾 Process Memory</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:10px;color:#666">Heap Used</div><div style="font-size:18px;font-weight:700;color:${_memColor}">${_memHeap}MB</div></div>
          <div><div style="font-size:10px;color:#666">Heap Total</div><div style="font-size:18px;font-weight:700;color:#ccc">${_memHeapTotal}MB</div></div>
          <div><div style="font-size:10px;color:#666">RSS</div><div style="font-size:12px;font-weight:600;color:#ccc">${_memRss}MB</div></div>
          <div><div style="font-size:10px;color:#666">Usage</div><div style="font-size:12px;font-weight:600;color:${_memColor}">${_memPct}%</div>
            <div style="margin-top:4px;height:4px;background:#1a1d28;border-radius:2px;overflow:hidden"><div style="width:${_memPct}%;height:100%;background:${_memColor};border-radius:2px"></div></div>
          </div>
        </div>
      </div>
      <!-- CPU & OS Memory -->
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_cpuColor}">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🖥️ CPU &amp; System RAM</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:10px;color:#666">CPU Load (1m)</div><div style="font-size:18px;font-weight:700;color:${_cpuColor}">${_cpuLoadPct}%</div></div>
          <div><div style="font-size:10px;color:#666">OS RAM Used</div><div style="font-size:18px;font-weight:700;color:${_osMemColor}">${_osMemPct}%</div>
            <div style="margin-top:4px;height:4px;background:#1a1d28;border-radius:2px;overflow:hidden"><div style="width:${_osMemPct}%;height:100%;background:${_osMemColor};border-radius:2px"></div></div>
          </div>
          <div><div style="font-size:10px;color:#666">Free / Total</div><div style="font-size:12px;font-weight:600;color:#ccc">${_osFreeMem}MB / ${_osTotalMem}MB</div></div>
          <div><div style="font-size:10px;color:#666">CPU Cores</div><div style="font-size:12px;font-weight:600;color:#ccc">${_cpuCount} cores</div></div>
        </div>
      </div>
      <!-- Discord Connection -->
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_discordReady ? '#4caf50' : '#ef5350'}">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">💬 Discord Connection</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:10px;color:#666">Gateway Ping</div><div style="font-size:18px;font-weight:700;color:${_pingColor}">${_wsPing}ms</div></div>
          <div><div style="font-size:10px;color:#666">Status</div><div style="font-size:14px;font-weight:700;color:${_discordReady ? '#4caf50' : '#ef5350'}">${_discordReady ? '🟢 Online' : '🔴 Offline'}</div></div>
          <div><div style="font-size:10px;color:#666">Guilds / Members</div><div style="font-size:12px;font-weight:600;color:#ccc">${_guildCount} / ${_memberCount.toLocaleString()}</div></div>
          <div><div style="font-size:10px;color:#666">Channels / Roles</div><div style="font-size:12px;font-weight:600;color:#ccc">${_channelCount} / ${_roleCount}</div></div>
        </div>
        <div style="margin-top:6px;font-size:10px;color:#666">🏷️ ${_userTag}</div>
      </div>
      <!-- Stream Integration -->
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_streamLive ? '#4caf50' : '#8b8fa3'}">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📺 Stream Integration</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
          <div><div style="font-size:10px;color:#666">Stream</div><div style="font-size:18px;font-weight:700;color:${_streamLive ? '#4caf50' : '#8b8fa3'}">${_streamLive ? '🔴 LIVE' : '⚫ OFF'}</div></div>
          <div><div style="font-size:10px;color:#666">Viewers</div><div style="font-size:18px;font-weight:700;color:#9146ff">${streamInfo.viewers}</div></div>
          <div><div style="font-size:10px;color:#666">Stream Uptime</div><div style="font-size:12px;font-weight:600;color:#ccc">${_uptimeStr}</div></div>
          <div><div style="font-size:10px;color:#666">Peak / Total</div><div style="font-size:12px;font-weight:600;color:#ffca28">${stats.peakViewers} / ${stats.totalStreams}</div></div>
        </div>
      </div>
      <!-- Errors & Warnings -->
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_errors24h > 5 ? '#ef5350' : _warns24h > 10 ? '#ffca28' : '#4caf50'};grid-column:1/-1">
        <div style="font-size:13px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🚨 Errors &amp; Warnings <span style="font-size:11px;color:#666">(24h)</span></div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
          <div><div style="font-size:13px;color:#666">Errors</div><div style="font-size:26px;font-weight:700;color:${_errors24h > 0 ? '#ef5350' : '#4caf50'}">${_errors24h}</div></div>
          <div><div style="font-size:13px;color:#666">Warnings</div><div style="font-size:26px;font-weight:700;color:${_warns24h > 0 ? '#ffca28' : '#4caf50'}">${_warns24h}</div></div>
        </div>
        <div style="max-height:280px;overflow-y:auto;background:#1a1d28;border-radius:4px">
          ${_recentEventsHtml}
        </div>
      </div>
    </div>

    <!-- ═══ System & Runtime (merged from System tab) ═══ -->
    <h3 style="margin:20px 0 12px;color:#8b8fa3;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2f3a;padding-bottom:6px">🖥️ System & Runtime</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:14px">
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #5865f2">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🧮 Runtime Info</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Node.js</div><div style="font-weight:600;color:#ccc">${_nodeVersion}</div></div>
          <div><div style="font-size:10px;color:#666">V8 Engine</div><div style="font-weight:600;color:#ccc">${_v8.v8 || '—'}</div></div>
          <div><div style="font-size:10px;color:#666">libuv</div><div style="font-weight:600;color:#ccc">${_v8.uv || '—'}</div></div>
          <div><div style="font-size:10px;color:#666">OpenSSL</div><div style="font-weight:600;color:#ccc">${_v8.openssl || '—'}</div></div>
          <div><div style="font-size:10px;color:#666">Architecture</div><div style="font-weight:600;color:#ccc">${_nodeArch}</div></div>
          <div><div style="font-size:10px;color:#666">Platform</div><div style="font-weight:600;color:#ccc">${_platform}</div></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_cpuColor}">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">⚙️ CPU Details</div>
        <div style="display:grid;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Model</div><div style="font-weight:600;color:#ccc;font-size:11px;word-break:break-word">${_cpuModel}</div></div>
          <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
            <div><div style="font-size:10px;color:#666">Load 1m</div><div style="font-weight:700;color:${_cpuColor}">${_cpuLoad[0].toFixed(2)}</div></div>
            <div><div style="font-size:10px;color:#666">Load 5m</div><div style="font-weight:700;color:#ccc">${_cpuLoad[1].toFixed(2)}</div></div>
            <div><div style="font-size:10px;color:#666">Load 15m</div><div style="font-weight:700;color:#ccc">${_cpuLoad[2].toFixed(2)}</div></div>
            <div><div style="font-size:10px;color:#666">Cores</div><div style="font-weight:700;color:#ccc">${_cpuCount}</div></div>
          </div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_osMemColor}">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🗃️ System Memory</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Total RAM</div><div style="font-weight:700;color:#ccc">${_osTotalMem}MB</div></div>
          <div><div style="font-size:10px;color:#666">Free RAM</div><div style="font-weight:700;color:${_osMemColor}">${_osFreeMem}MB</div></div>
          <div><div style="font-size:10px;color:#666">Used RAM</div><div style="font-weight:700;color:${_osMemColor}">${_osUsedMem}MB</div></div>
          <div><div style="font-size:10px;color:#666">Usage</div><div style="font-weight:700;color:${_osMemColor}">${_osMemPct}%</div></div>
        </div>
        <div style="margin-top:8px;height:6px;background:#1a1d28;border-radius:3px;overflow:hidden"><div style="width:${_osMemPct}%;height:100%;background:${_osMemColor};border-radius:3px"></div></div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #9146ff">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📊 Process Memory Details</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Heap Used</div><div style="font-weight:700;color:${_memColor}">${_memHeap}MB</div></div>
          <div><div style="font-size:10px;color:#666">Heap Total</div><div style="font-weight:700;color:#ccc">${_memHeapTotal}MB</div></div>
          <div><div style="font-size:10px;color:#666">RSS</div><div style="font-weight:700;color:#ccc">${_memRss}MB</div></div>
          <div><div style="font-size:10px;color:#666">External</div><div style="font-weight:700;color:#ccc">${_memExternal}MB</div></div>
          <div><div style="font-size:10px;color:#666">ArrayBuffers</div><div style="font-weight:700;color:#ccc">${_memArrayBuffers}MB</div></div>
          <div><div style="font-size:10px;color:#666">Heap %</div><div style="font-weight:700;color:${_memColor}">${_memPct}%</div></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #8b8fa3">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🌐 Host Info</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Hostname</div><div style="font-weight:600;color:#ccc">${_hostname}</div></div>
          <div><div style="font-size:10px;color:#666">OS Uptime</div><div style="font-weight:600;color:#ccc">${_osUptimeStr}</div></div>
          <div><div style="font-size:10px;color:#666">Platform</div><div style="font-weight:600;color:#ccc">${_platform}</div></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #ffca28">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📝 Log Volume</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Total Logs</div><div style="font-weight:700;color:#fff">${_allLogs.length}</div></div>
          <div><div style="font-size:10px;color:#666">Last Hour</div><div style="font-weight:700;color:${_logsLastHour > 50 ? '#ffca28' : '#4caf50'}">${_logsLastHour}</div></div>
          <div><div style="font-size:10px;color:#666">Avg/Hour</div><div style="font-weight:700;color:#ccc">${_logRate}</div></div>
          <div><div style="font-size:10px;color:#666">SSE Clients</div><div style="font-weight:700;color:#5865f2">${_sseClients}</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ Discord (merged from Discord tab) ═══ -->
    <h3 style="margin:20px 0 12px;color:#8b8fa3;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2f3a;padding-bottom:6px">💬 Discord</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:14px">
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid ${_pingColor}">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📡 Gateway</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Ping</div><div style="font-size:20px;font-weight:700;color:${_pingColor}">${_wsPing}ms</div></div>
          <div><div style="font-size:10px;color:#666">Status</div><div style="font-size:16px;font-weight:700;color:${_discordReady ? '#4caf50' : '#ef5350'}">${_discordReady ? '🟢 Online' : '🔴 Offline'}</div></div>
          <div><div style="font-size:10px;color:#666">Bot Tag</div><div style="font-weight:600;color:#ccc">${_userTag}</div></div>
          <div><div style="font-size:10px;color:#666">Guilds</div><div style="font-weight:600;color:#ccc">${_guildCount}</div></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #5865f2">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">👥 Server Stats</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Members</div><div style="font-size:18px;font-weight:700;color:#5865f2">${_memberCount.toLocaleString()}</div></div>
          <div><div style="font-size:10px;color:#666">Channels</div><div style="font-size:18px;font-weight:700;color:#ccc">${_channelCount}</div></div>
          <div><div style="font-size:10px;color:#666">Roles</div><div style="font-weight:700;color:#ccc">${_roleCount}</div></div>
          <div><div style="font-size:10px;color:#666">Emojis</div><div style="font-weight:700;color:#ccc">${_emojiCacheSize}</div></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #9146ff">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🗄️ Cache Stats</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">User Cache</div><div style="font-weight:700;color:#ccc">${_userCacheSize}</div></div>
          <div><div style="font-size:10px;color:#666">Voice States</div><div style="font-weight:700;color:#ccc">${_voiceStates}</div></div>
          <div><div style="font-size:10px;color:#666">Presences</div><div style="font-weight:700;color:#ccc">${_presences}</div></div>
          <div><div style="font-size:10px;color:#666">Stickers</div><div style="font-weight:700;color:#ccc">${_stickerCacheSize}</div></div>
          <div><div style="font-size:10px;color:#666">Cache Age</div><div style="font-weight:700;color:#ccc">${_cacheAge !== null ? _cacheAge + ' min' : '—'}</div></div>
          <div><div style="font-size:10px;color:#666">Cache Sync</div><div style="font-weight:700;color:#ccc">${membersCache.lastFullSync ? new Date(membersCache.lastFullSync).toLocaleTimeString() : '—'}</div></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #ffca28">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📈 Usage &amp; Activity</div>
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;font-size:12px">
          <div><div style="font-size:10px;color:#666">Total Commands</div><div style="font-size:18px;font-weight:700;color:#9146ff">${_totalCmds.toLocaleString()}</div></div>
          <div><div style="font-size:10px;color:#666">Mod Cases</div><div style="font-size:18px;font-weight:700;color:#ffca28">${_totalCases}</div></div>
          <div><div style="font-size:10px;color:#666">Warnings Issued</div><div style="font-weight:600;color:#ccc">${_totalWarnings}</div></div>
          <div><div style="font-size:10px;color:#666">Audit History</div><div style="font-weight:600;color:#ccc">${auditLogHistory.length}</div></div>
        </div>
      </div>
    </div>

    <!-- ═══ Features (merged from Features tab) ═══ -->
    <h3 style="margin:20px 0 12px;color:#8b8fa3;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2f3a;padding-bottom:6px">🧩 Features</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px;margin-bottom:14px">
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #4caf50">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🎉 Community Features</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Giveaways</span><span style="color:#e0e0e0;font-weight:600">${_totalGiveaways} total / ${_activeGiveaways} active</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Polls</span><span style="color:#e0e0e0;font-weight:600">${_totalPolls} total / ${_activePolls} active</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Custom Commands</span><span style="color:#e0e0e0;font-weight:600">${_customCmdCount}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Welcome System</span><span style="font-weight:600;color:${welcomeSettings.enabled ? '#4caf50' : '#8b8fa3'}">${welcomeSettings.enabled ? '✅ Enabled' : '⚫ Disabled'}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Audit Log</span><span style="font-weight:600;color:${auditLogSettings.enabled ? '#4caf50' : '#8b8fa3'}">${auditLogSettings.enabled ? '✅ Enabled' : '⚫ Disabled'}</span></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #5865f2">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📊 Leveling System</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Tracked Users</span><span style="color:#e0e0e0;font-weight:600">${_totalLeveledUsers}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">XP per Message</span><span style="color:#e0e0e0;font-weight:600">${levelingConfig.xpPerMessage || 0}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Cooldown</span><span style="color:#e0e0e0;font-weight:600">${levelingConfig.cooldownSeconds || 0}s</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Level-Up Ping</span><span style="font-weight:600;color:${dashboardSettings.levelUpPingPlayer ? '#4caf50' : '#8b8fa3'}">${dashboardSettings.levelUpPingPlayer ? '✅ On' : '⚫ Off'}</span></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #e91e63">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🎮 RPG System</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">RPG Bot</span><span style="font-weight:600;color:${_rpgActive ? '#4caf50' : '#8b8fa3'}">${_rpgActive ? '✅ Active' : '⚫ Inactive'}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Active Events</span><span style="color:#e0e0e0;font-weight:600">${_rpgActiveEvents}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Test Mode</span><span style="font-weight:600;color:${rpgTestMode ? '#ffca28' : '#8b8fa3'}">${rpgTestMode ? '⚠️ On' : '⚫ Off'}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Channel Lock</span><span style="font-weight:600;color:${getRpgSettings().channelRestrictionEnabled ? '#4caf50' : '#8b8fa3'}">${getRpgSettings().channelRestrictionEnabled ? '✅ On' : '⚫ Off'}</span></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #9146ff">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📺 Stream Integration</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Stream</span><span style="font-weight:700;color:${_streamLive ? '#4caf50' : '#8b8fa3'}">${_streamLive ? '🔴 LIVE' : '⚫ Offline'}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Viewers</span><span style="color:#e0e0e0;font-weight:600">${streamInfo.viewers}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Total Streams</span><span style="color:#e0e0e0;font-weight:600">${stats.totalStreams}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">All-Time Peak</span><span style="color:#ffca28;font-weight:600">${stats.peakViewers}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Delayed?</span><span style="color:#e0e0e0;font-weight:600">${_schedDelay}</span></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #3498db">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🔌 Active Connections</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">SSE Clients</span><span style="color:#e0e0e0;font-weight:600">${_sseClients}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">YouTube Feeds</span><span style="color:#e0e0e0;font-weight:600">${(yaStatus.feeds || []).length}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">YouTube Alerts</span><span style="font-weight:600;color:${yaStatus.enabled ? '#4caf50' : '#8b8fa3'}">${yaStatus.enabled ? '✅ On' : '⚫ Off'}</span></div>
        </div>
      </div>
    </div>

    <h3 style="margin:20px 0 12px;color:#8b8fa3;font-size:12px;text-transform:uppercase;letter-spacing:1px;border-bottom:1px solid #2a2f3a;padding-bottom:6px">💿 Storage</h3>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:10px;margin-bottom:14px">
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #9146ff">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">📁 File Sizes</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">state.json</span><span style="color:#e0e0e0;font-weight:600">${_stateFileSize}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">logs.json</span><span style="color:#e0e0e0;font-weight:600">${_logFileSize}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">data/ folder</span><span style="color:#e0e0e0;font-weight:600">${_dataFolderSize}</span></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #5865f2">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">🗃️ Data Entries</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Log Count</span><span style="color:#e0e0e0;font-weight:600">${_allLogs.length}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">History Entries</span><span style="color:#e0e0e0;font-weight:600">${(history || []).length}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Audit History</span><span style="color:#e0e0e0;font-weight:600">${auditLogHistory.length}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Leveling Users</span><span style="color:#e0e0e0;font-weight:600">${_totalLeveledUsers}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Custom Commands</span><span style="color:#e0e0e0;font-weight:600">${_customCmdCount}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Giveaways</span><span style="color:#e0e0e0;font-weight:600">${_totalGiveaways}</span></div>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;border-top:2px solid #4caf50">
        <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:10px">⚙️ Limits &amp; Caps</div>
        <div style="display:grid;gap:6px;font-size:12px">
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Max Logs</span><span style="color:#e0e0e0;font-weight:600">200</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Max History</span><span style="color:#e0e0e0;font-weight:600">100</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Max Audit</span><span style="color:#e0e0e0;font-weight:600">${AUDIT_LOG_HISTORY_MAX}</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Heatmap Days</span><span style="color:#e0e0e0;font-weight:600">90</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Save Debounce</span><span style="color:#e0e0e0;font-weight:600">5s</span></div>
          <div style="display:flex;justify-content:space-between"><span style="color:#8b8fa3">Log Flush</span><span style="color:#e0e0e0;font-weight:600">3s</span></div>
        </div>
      </div>
    </div>
  </div>

  <!-- Platforms Tab -->
  <div id="ovHealth_platform" style="display:none">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:10px;margin-bottom:14px">
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">📺</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:#e0e0e0">Twitch</div>
          <div style="font-size:11px;color:#8b8fa3">${TWITCH_ACCESS_TOKEN ? '✅ Authorized' : '❌ Not connected'}</div>
          ${twitchTokens.expires_at ? '<div style="font-size:10px;color:#666;margin-top:2px">Expires: ' + new Date(twitchTokens.expires_at).toLocaleString() + '</div>' : ''}
          ${_tokenWarn ? '<div style="font-size:10px;color:#ffca28;margin-top:2px">⚠️ Token expires soon!</div>' : ''}
        </div>
        <span style="width:12px;height:12px;border-radius:50%;background:${TWITCH_ACCESS_TOKEN ? '#4caf50' : '#ef5350'};flex-shrink:0"></span>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">▶️</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:#e0e0e0">YouTube</div>
          <div style="font-size:11px;color:#8b8fa3">${yaStatus.enabled ? 'Enabled' : 'Disabled'} · Last: ${_ytLastCheck}</div>
          <div style="font-size:10px;color:#666;margin-top:2px">${_ytHealthLine}</div>
        </div>
        <span style="width:12px;height:12px;border-radius:50%;background:${yaStatus.enabled ? (_ytHealthy ? '#4caf50' : '#ffca28') : '#8b8fa3'};flex-shrink:0"></span>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px;display:flex;align-items:center;gap:12px">
        <span style="font-size:28px">💬</span>
        <div style="flex:1">
          <div style="font-size:13px;font-weight:700;color:#e0e0e0">Discord</div>
          <div style="font-size:11px;color:#8b8fa3">Bot ${_discordReady ? 'Online' : 'Offline'} · ${_guildCount} servers</div>
          <div style="font-size:10px;color:#666;margin-top:2px">Ping: ${_wsPing}ms · Members: ${_memberCount.toLocaleString()}</div>
        </div>
        <span style="width:12px;height:12px;border-radius:50%;background:${_discordReady ? '#4caf50' : '#ef5350'};flex-shrink:0"></span>
      </div>
    </div>
    <div style="background:#1a1d28;border-radius:8px;padding:14px;margin-top:10px">
      <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:10px">🔑 Authentication</div>
      <div style="font-size:12px;color:#999;display:grid;gap:6px;margin-bottom:12px">
        <div>🔑 Twitch Token: ${_tokenStatusHtml}${twitchTokens.expires_at ? ' · Expires: <b>' + new Date(twitchTokens.expires_at).toLocaleString() + '</b>' : ''}${_tokenWarn ? ' <span style="color:#ffca28">⚠️ Expires soon!</span>' : ''}</div>
        <div>📺 YouTube: ${yaStatus.health?.lastCheckAt ? '<span style="color:#4caf50">Checked ' + _ytLastCheck + '</span>' : '<span style="color:#8b8fa3">Never checked</span>'} · Duration: ${yaStatus.health?.lastDurationMs ?? '—'}ms</div>
        <div>🤖 Auto-refresh: Every 20min · Safeguard: active (5min cooldown)</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <a href="/auth/twitch" style="display:inline-block;background:#9146ff;color:white;padding:6px 14px;border-radius:4px;text-decoration:none;font-weight:600;font-size:12px">Authorize Twitch</a>
        <button class="small" style="width:auto;font-size:11px" onclick="fetch('/twitch/reload',{method:'POST'}).then(function(r){return r.json()}).then(function(d){ if(d.success){ alert('Twitch reloaded'); location.reload(); } else { alert('Failed: '+(d.error||'Unknown')); }}).catch(function(){alert('Failed')})">Reload .env</button>
        <button class="small" style="width:auto;font-size:11px" onclick="fetch('/twitch/refresh',{method:'POST'}).then(function(r){return r.json()}).then(function(d){ alert(d.message); if(d.success) location.reload(); }).catch(function(){alert('Failed')})">🔄 Refresh Token</button>
      </div>
      <details style="margin-top:10px">
        <summary style="cursor:pointer;color:#9146ff;font-weight:600;font-size:12px">📋 Setup Instructions</summary>
        <ol style="color:#b0b0b0;margin-top:8px;font-size:11px">
          <li>Go to <a href="https://dev.twitch.tv/console/apps" target="_blank">Twitch Developer Console</a></li>
          <li>Create/edit your app</li>
          <li>Set <b>OAuth Redirect URL</b> to: <code>http://localhost:3000/auth/twitch/callback</code></li>
          <li>Copy <b>Client ID</b> and <b>Client Secret</b></li>
          <li>Add to .env:<pre style="font-size:10px;margin:4px 0">TWITCH_CLIENT_ID=your_client_id
TWITCH_CLIENT_SECRET=your_client_secret
TWITCH_REDIRECT_URI=http://localhost:3000/auth/twitch/callback</pre></li>
          <li>Restart the bot, then click Authorize above</li>
        </ol>
      </details>
    </div>
  </div>

  <!-- Actions Tab -->
  <div id="ovHealth_actions" style="display:none">
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">
      <div style="background:#2a2f3a;padding:14px;border-radius:8px">
        <div style="font-size:12px;font-weight:600;color:#e0e0e0;margin-bottom:10px">⚡ Quick Actions</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="small" onclick="fetch('/api/vips').then(function(r){return r.json()}).then(function(d){alert(d.vips?'VIPs: '+d.vips.map(function(v){return v.user_name}).join(', '):'Error: '+(d.error||'Unknown'))})" style="font-size:11px;width:auto;padding:5px 10px">👑 VIPs</button>
          <button class="small" onclick="fetch('/test-live',{method:'POST'}).then(function(){alert('Fake live triggered')})" style="font-size:11px;width:auto;padding:5px 10px">▶️ Fake Live</button>
          <button class="small" onclick="fetch('/test-end',{method:'POST'}).then(function(){alert('Fake end triggered')})" style="font-size:11px;width:auto;padding:5px 10px">⏹️ Fake End</button>
          <button class="small" onclick="fetch('/test-alert/1h',{method:'POST'}).then(function(){alert('1h alert sent')})" style="font-size:11px;width:auto;padding:5px 10px">🔔 1h Alert</button>
          <button class="small" onclick="fetch('/test-alert/10m',{method:'POST'}).then(function(){alert('10m alert sent')})" style="font-size:11px;width:auto;padding:5px 10px">🔔 10m Alert</button>
        </div>
      </div>
      <div style="background:#2a2f3a;padding:14px;border-radius:8px">
        <div style="font-size:12px;font-weight:600;color:#e0e0e0;margin-bottom:10px">🔧 Maintenance</div>
        <div style="display:flex;gap:6px;flex-wrap:wrap">
          <button class="small" onclick="if(confirm('Reset delay mark?'))fetch('/reset-delay-mark',{method:'POST'}).then(function(){location.reload()})" style="font-size:11px;width:auto;padding:5px 10px">🧹 Reset Delay</button>
          <button class="small danger" onclick="if(confirm('Reset live state?'))fetch('/reset-live',{method:'POST'}).then(function(){location.reload()})" style="font-size:11px;width:auto;padding:5px 10px">🔄 Reset Live</button>
          <button class="small" onclick="if(confirm('Reset schedule?'))fetch('/reset-schedule',{method:'POST'}).then(function(){location.reload()})" style="font-size:11px;width:auto;padding:5px 10px">📅 Reset Schedule</button>
        </div>
      </div>
    </div>
  </div>
</div>

<script>
function ovHealthTab(tab) {
  var tabs = ['overview', 'platform', 'actions'];
  tabs.forEach(function(t) {
    var el = document.getElementById('ovHealth_' + t);
    if (el) el.style.display = (t === tab) ? '' : 'none';
  });
  document.querySelectorAll('#ovHealthTabs button').forEach(function(btn) {
    btn.style.background = btn.getAttribute('data-htab') === tab ? '#5b5bff' : '';
  });
}
var _healthRefreshInterval = null;
function ovRefreshHealth() {
  fetch('/api/health-data')
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var bar = document.getElementById('ovHealthSummary');
      if (bar) {
        bar.style.borderLeftColor = d.healthColor;
        bar.innerHTML = '<span style="color:' + d.healthColor + ';font-weight:700">' + d.healthEmoji + ' ' + d.healthLabel + '</span>'
          + '<span style="color:#555">|</span>'
          + '<span style="color:#ccc">⏱️ Bot Uptime: <b style="color:#5865f2">' + d.botUptime + '</b></span>'
          + '<span style="color:#555">|</span>'
          + '<span style="color:#ccc">📡 Ping: <b style="color:' + d.pingColor + '">' + d.wsPing + 'ms</b></span>'
          + '<span style="color:#555">|</span>'
          + '<span style="color:#ccc">💾 Memory: <b style="color:' + d.memColor + '">' + d.memHeap + 'MB</b> <span style="color:#666">(' + d.memPct + '%)</span></span>'
          + '<span style="color:#555">|</span>'
          + '<span style="color:#ccc">🗄️ Cache: <b>' + (d.cacheAge !== null ? d.cacheAge + 'm ago' : '—') + '</b></span>'
          + (d.healthIssues.length > 0 ? '<span style="color:#555">|</span><span style="color:#ef5350;font-size:11px">⚠️ ' + d.healthIssues.join(', ') + '</span>' : '')
          + '<span style="color:#555">|</span>'
          + '<span style="color:#666;font-size:10px">🔄 ' + new Date().toLocaleTimeString() + '</span>';
      }
      var badge = document.getElementById('ovHealthBadge');
      if (badge) {
        badge.style.background = d.healthColor + '22';
        badge.style.color = d.healthColor;
        badge.style.borderColor = d.healthColor + '44';
        badge.textContent = d.healthEmoji + ' ' + d.healthLabel;
      }
    })
    .catch(function(e) { console.error('Health refresh failed:', e); });
}
function ovToggleHealthRefresh(checked) {
  if (_healthRefreshInterval) { clearInterval(_healthRefreshInterval); _healthRefreshInterval = null; }
  if (checked) { ovRefreshHealth(); _healthRefreshInterval = setInterval(ovRefreshHealth, 30000); }
}
</script>

<!-- ── Bot Health Features ── -->
<div class="card" style="margin-top:16px"><h3 style="margin:0 0 8px 0">🔧 Health & Monitoring Tools</h3><p style="color:#8b8fa3;font-size:12px;margin:0">Server health scoring and custom API polling.</p></div>

<div class="card" style="margin-top:10px;border-left:3px solid #4caf50">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:18px">❤️</span>
    <div>
      <strong style="color:#e0e0e0;font-size:14px">Server Health Score</strong>
      <div style="color:#8b8fa3;font-size:11px;margin-top:2px">Composite 0-100 server health score based on activity, engagement, and retention.</div>
    </div>
  </div>
  <div id="serverHealthCard" style="padding-top:8px;border-top:1px solid #2a2f3a">
    <div style="color:#8b8fa3;font-size:12px">Loading health score...</div>
  </div>
</div>
<script>
(function(){
  fetch('/api/features/server-health').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;var score=c.lastScore||0;
    var color=score>=80?'#4caf50':score>=50?'#ff9800':'#ef5350';
    var html='<div style="display:flex;align-items:center;gap:16px"><div style="width:80px;height:80px;border-radius:50%;border:4px solid '+color+';display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700;color:'+color+'">'+score+'</div><div><div style="font-size:14px;color:#e0e0e0;font-weight:600">Server Health: '+(score>=80?'Excellent':score>=50?'Good':'Needs Attention')+'</div><div style="font-size:11px;color:#8b8fa3;margin-top:4px">Score is calculated periodically based on activity, engagement, and retention metrics.</div></div></div>';
    document.getElementById('serverHealthCard').innerHTML=html;
  }).catch(function(){document.getElementById('serverHealthCard').innerHTML='<div style="color:#ef5350;font-size:12px">Failed to load.</div>';});
})();
</script>

<div class="card" style="margin-top:10px;border-left:3px solid #4caf50">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">🌐</span>
      <div>
        <strong style="color:#e0e0e0;font-size:14px">Custom API Polling</strong>
        <div style="color:#8b8fa3;font-size:11px;margin-top:2px">Poll up to 10 external JSON APIs on a schedule and post results to channels.</div>
      </div>
    </div>
    <label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;flex-shrink:0">
      <input type="checkbox" id="if_apiPoll_enabled" style="opacity:0;width:0;height:0">
      <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:#3a3a42;border-radius:12px;transition:.3s"></span>
      <span id="if_apiPoll_slider" style="position:absolute;top:2px;left:2px;width:20px;height:20px;background:#888;border-radius:50%;transition:.3s"></span>
    </label>
  </div>
  <div style="padding-top:8px;border-top:1px solid #2a2f3a">
    <div style="color:#8b8fa3;font-size:11px;margin-bottom:6px">Add a new API poll:</div>
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">API URL (HTTPS)</label><input id="if_apiPoll_url" placeholder="https://api.example.com/data" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">JSON Path</label><input id="if_apiPoll_path" placeholder="data.value" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-top:8px">
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Channel ID</label><input id="if_apiPoll_ch" placeholder="Channel ID" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Interval (min, 5-1440)</label><input id="if_apiPoll_interval" type="number" min="5" max="1440" value="30" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
      <div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">Label</label><input id="if_apiPoll_label" placeholder="My API" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px"></div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:8px">
      <button onclick="saveApiPoll()" style="padding:6px 16px;background:#5b5bff;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">💾 Save</button>
      <span id="if_apiPoll_status" style="font-size:12px"></span>
    </div>
  </div>
</div>
<script>
(function(){
  fetch('/api/features/api-polling').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;
    var en=document.getElementById('if_apiPoll_enabled'),sl=document.getElementById('if_apiPoll_slider');
    if(en){en.checked=!!c.enabled;if(sl){sl.style.transform=c.enabled?'translateX(20px)':'translateX(0)';sl.style.background=c.enabled?'#4caf50':'#888';}en.addEventListener('change',function(){if(sl){sl.style.transform=this.checked?'translateX(20px)':'translateX(0)';sl.style.background=this.checked?'#4caf50':'#888';}});}
  }).catch(function(){});
})();
function saveApiPoll(){
  var body={enabled:document.getElementById('if_apiPoll_enabled').checked};
  var url=document.getElementById('if_apiPoll_url').value.trim();
  if(url){body.addPoll={url:url,jsonPath:document.getElementById('if_apiPoll_path').value.trim(),channelId:document.getElementById('if_apiPoll_ch').value.trim(),intervalMin:parseInt(document.getElementById('if_apiPoll_interval').value)||30,label:document.getElementById('if_apiPoll_label').value.slice(0,50)};}
  fetch('/api/features/api-polling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_apiPoll_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>

`;
}

// Analytics dashboard tab
export function renderAnalyticsTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  // Calculate stats
  const h = history || [];
  const totalStreams = h.length;
  const totalMinutes = h.reduce((sum, s) => sum + (s.durationMinutes || 0), 0);
  const totalHours = (totalMinutes / 60).toFixed(1);
  const avgViewers = totalStreams > 0 ? Math.round(h.reduce((sum, s) => sum + (s.peakViewers || 0), 0) / totalStreams) : 0;
  const peakViewers = h.reduce((max, s) => Math.max(max, s.peakViewers || 0), 0);
  const avgDuration = totalStreams > 0 ? Math.round(totalMinutes / totalStreams) : 0;
  const medianViewers = (() => { const sorted = h.map(s => s.peakViewers || 0).sort((a, b) => a - b); return sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0; })();
  const totalFollowers = h.reduce((s, x) => s + (x.followers || x.newFollowers || 0), 0);
  const totalSubs = h.reduce((s, x) => s + (x.subscribers || x.newSubs || 0), 0);
  const avgFollowersPerStream = totalStreams > 0 ? (totalFollowers / totalStreams).toFixed(1) : '0.0';
  const avgSubsPerStream = totalStreams > 0 ? (totalSubs / totalStreams).toFixed(1) : '0.0';
  const viewerMinutes = h.reduce((sum, s) => sum + ((s.peakViewers || 0) * (s.durationMinutes || 0)), 0);
  const viewerHours = Math.round(viewerMinutes / 60).toLocaleString();

  // Stream frequency
  const sortedDates = h.map(s => new Date(s.startedAt || s.date)).sort((a, b) => b - a);
  let avgDaysBetween = 0;
  if (sortedDates.length > 1) {
    const gaps = [];
    for (let i = 0; i < sortedDates.length - 1; i++) gaps.push((sortedDates[i] - sortedDates[i + 1]) / (1000 * 60 * 60 * 24));
    avgDaysBetween = (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1);
  }
  const streamsPerWeek = avgDaysBetween > 0 ? (7 / parseFloat(avgDaysBetween)).toFixed(1) : '0.0';

  // Day since last stream (use stream end time: endedAt or startedAt + durationMinutes)
  const lastStream = h.length > 0 ? [...h].sort((a, b) => new Date(b.startedAt || b.date) - new Date(a.startedAt || a.date))[0] : null;
  const lastStreamEndDate = lastStream ? (lastStream.endedAt ? new Date(lastStream.endedAt) : new Date(new Date(lastStream.startedAt || lastStream.date).getTime() + (lastStream.durationMinutes || 0) * 60000)) : null;
  const msSinceLast = lastStreamEndDate ? (Date.now() - lastStreamEndDate) : 0;
  const daysSinceLast = lastStreamEndDate ? Math.floor(msSinceLast / (1000 * 60 * 60 * 24)) : 0;
  const hoursSinceLast = lastStreamEndDate ? Math.floor(msSinceLast / (1000 * 60 * 60)) : 0;
  const sinceLastLabel = daysSinceLast >= 1 ? daysSinceLast + 'd' : hoursSinceLast + 'h';

  // Longest & shortest stream
  const longestStream = h.reduce((best, s) => (s.durationMinutes || 0) > (best.durationMinutes || 0) ? s : best, h[0] || {});
  const shortestStream = h.reduce((worst, s) => (s.durationMinutes || 0) < (worst.durationMinutes || 0) && (s.durationMinutes || 0) > 0 ? s : worst, h[0] || {});

  // Game stats
  const gameTime = {};
  h.forEach(s => {
    const game = s.game || s.gameName || 'Unknown';
    gameTime[game] = (gameTime[game] || 0) + (s.durationMinutes || 0);
  });
  const topGames = Object.entries(gameTime).sort((a, b) => b[1] - a[1]).slice(0, 5);
  const maxGameTime = topGames.length > 0 ? topGames[0][1] : 1;
  const totalGameMinutes = Object.values(gameTime).reduce((a, b) => a + b, 0);
  const uniqueGames = Object.keys(gameTime).length;

  // Build top games HTML (with % of total time)
  let topGamesHtml = '';
  if (topGames.length > 0) {
    topGames.forEach((g, i) => {
      const pct = Math.round((g[1] / maxGameTime) * 100);
      const pctTotal = totalGameMinutes > 0 ? Math.round((g[1] / totalGameMinutes) * 100) : 0;
      const rankClass = i === 0 ? 'gold' : i === 1 ? 'silver' : i === 2 ? 'bronze' : '';
      const hours = (g[1] / 60).toFixed(1);
      topGamesHtml += '<div class="game-item">' +
        '<div class="game-rank ' + rankClass + '">' + (i + 1) + '</div>' +
        '<div class="game-info"><div class="game-name">' + g[0] + '</div>' +
        '<div class="game-hours">' + hours + ' hours · ' + pctTotal + '%</div></div>' +
        '<div class="game-bar-wrap"><div class="game-bar" style="width:' + pct + '%"></div></div></div>';
    });
  } else {
    topGamesHtml = '<div class="empty-state"><div class="empty-icon">🎮</div><p>No games tracked yet</p></div>';
  }

  // Build recent streams table - ALL streams, show 4, scrollable lazy load
  const allStreams = [...h].sort((a, b) => new Date(b.startedAt || b.date) - new Date(a.startedAt || a.date));
  let streamsTableHtml = '';
  if (allStreams.length > 0) {
    streamsTableHtml = '<div id="streams-scroll-container" style="max-height:260px;overflow-y:auto;scrollbar-width:thin;scrollbar-color:#9146ff #1f1f23">' +
      '<table class="streams-table"><thead><tr style="position:sticky;top:0;z-index:1"><th>Date</th><th>Game</th><th>Peak Viewers</th><th>Duration</th></tr></thead><tbody id="streams-tbody">';
    const initialBatch = allStreams.slice(0, 4);
    initialBatch.forEach(s => {
      const date = new Date(s.startedAt || s.date);
      const formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      const hrs = Math.floor((s.durationMinutes || 0) / 60);
      const mins = (s.durationMinutes || 0) % 60;
      const duration = hrs > 0 ? hrs + 'h ' + mins + 'm' : mins + 'm';
      const game = s.game || s.gameName || 'Unknown';
      streamsTableHtml += '<tr><td>' + formattedDate + '</td><td><span class="game-tag">' + game + '</span></td>' +
        '<td class="viewers">' + (s.peakViewers || 0) + '</td><td class="duration">' + duration + '</td></tr>';
    });
    streamsTableHtml += '</tbody></table></div>';
    if (allStreams.length > 4) {
      streamsTableHtml += '<div style="text-align:center;padding:4px;color:#72767d;font-size:11px">' + allStreams.length + ' streams total — scroll for more</div>';
    }
  } else {
    streamsTableHtml = '<div class="empty-state"><div class="empty-icon">📺</div><p>No streams recorded yet</p></div>';
  }

  // Monthly stats
  const monthlyStats = {};
  h.forEach(s => {
    const date = new Date(s.startedAt || s.date);
    const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyStats[key]) monthlyStats[key] = { streams: 0, viewers: 0, hours: 0 };
    monthlyStats[key].streams++;
    monthlyStats[key].viewers += (s.peakViewers || 0);
    monthlyStats[key].hours += (s.durationMinutes || 0) / 60;
  });

  // Monthly followers
  const monthlyFollowersMap = {};
  h.forEach(s => {
    const date = new Date(s.startedAt || s.date);
    const key = date.toLocaleString('default', { month: 'short', year: 'numeric' });
    if (!monthlyFollowersMap[key]) monthlyFollowersMap[key] = 0;
    monthlyFollowersMap[key] += (s.followers || s.newFollowers || 0);
  });

  let monthlyHtml = '';
  const monthKeys = Object.keys(monthlyStats).slice(0, 5);
  const allMonthStreams = monthKeys.reduce((s, k) => s + monthlyStats[k].streams, 0);
  if (monthKeys.length > 0) {
    monthKeys.forEach(month => {
      const data = monthlyStats[month];
      const avgV = data.streams > 0 ? Math.round(data.viewers / data.streams) : 0;
      const pctStreams = allMonthStreams > 0 ? Math.round(data.streams / allMonthStreams * 100) : 0;
      const monthFollows = monthlyFollowersMap[month] || 0;
      monthlyHtml += '<div class="monthly-item"><div class="monthly-label">' + month + '</div>' +
        '<div class="monthly-stats"><div class="monthly-stat"><div class="val">' + data.streams + ' <span style="font-size:10px;color:#72767d">(' + pctStreams + '%)</span></div><div class="lbl">Streams</div></div>' +
        '<div class="monthly-stat"><div class="val">' + avgV + '</div><div class="lbl">Avg Viewers</div></div>' +
        '<div class="monthly-stat"><div class="val">' + data.hours.toFixed(1) + 'h</div><div class="lbl">Hours</div></div>' +
        '<div class="monthly-stat"><div class="val">+' + monthFollows + '</div><div class="lbl">Followers</div></div></div></div>';
    });
  } else {
    monthlyHtml = '<div class="empty-state"><div class="empty-icon">📅</div><p>No monthly data yet</p></div>';
  }

  // AI Insights
  let insightsHtml = '';
  if (totalStreams > 0) {
    insightsHtml = '<div class="insight-item"><span class="insight-icon">💡</span><span class="insight-text">You have streamed <strong>' + totalStreams + '</strong> times for a total of <strong>' + totalHours + ' hours</strong>.</span></div>';
    if (topGames.length > 0) {
      insightsHtml += '<div class="insight-item"><span class="insight-icon">🎮</span><span class="insight-text">Your most played game is <strong>' + topGames[0][0] + '</strong> with ' + (topGames[0][1] / 60).toFixed(1) + ' hours.</span></div>';
    }
    insightsHtml += '<div class="insight-item"><span class="insight-icon">📊</span><span class="insight-text">Your average peak viewers is <strong>' + avgViewers + '</strong> (median: <strong>' + medianViewers + '</strong>).</span></div>';
    insightsHtml += '<div class="insight-item"><span class="insight-icon">📅</span><span class="insight-text">You stream about <strong>' + streamsPerWeek + '</strong> times per week (every <strong>' + avgDaysBetween + '</strong> days).</span></div>';
    insightsHtml += '<div class="insight-item"><span class="insight-icon">👁️</span><span class="insight-text">Total viewer-hours generated: <strong>' + viewerHours + '</strong>.</span></div>';
  } else {
    insightsHtml = '<div class="insight-item"><span class="insight-icon">🚀</span><span class="insight-text">Start streaming to see personalized insights!</span></div>';
  }

  // Live banner
  const isCurrentlyLive = !!streamInfo?.startedAt;
  const currentViewers = streamInfo?.viewers || 0;
  const liveBannerHtml = isCurrentlyLive ?
    '<div class="live-banner"><div class="live-dot"></div><span class="live-text">🔴 Currently Live</span><span class="live-viewers">👁 ' + currentViewers + ' viewers</span></div>' : '';

  return `
<style>
#stats-dashboard{padding:0}
.stats-header{background:#1f1f23;padding:30px;border-radius:8px;margin-bottom:20px;border:1px solid #2a2f3a}
.stats-header h2{margin:0 0 8px 0;font-size:24px;color:#fff}
.stats-header p{margin:0;color:#b0b0b0}
.filter-row{display:flex;gap:8px;margin-top:20px;flex-wrap:wrap}
.filter-btn{padding:10px 20px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#b0b0b0;cursor:pointer;font-size:13px;font-weight:500;transition:all 0.2s;width:auto}
.filter-btn:hover{background:#3a3a42;color:#fff;transform:translateY(-1px)}
.filter-btn.active{background:#9146ff;color:#fff;border-color:#9146ff}
.export-btn{padding:10px 20px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:4px;color:#4caf50;cursor:pointer;font-size:13px;font-weight:500;margin-left:auto;width:auto}
.export-btn:hover{background:#3a3a42}
.metrics-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-bottom:20px}
.metric-card{background:#1f1f23;padding:18px;border-radius:8px;border:1px solid #2a2f3a;position:relative;overflow:hidden}
.metric-card::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;background:var(--accent,#9146ff)}
.metric-card .icon{font-size:22px;margin-bottom:6px}
.metric-card .value{font-size:24px;font-weight:700;color:#fff;margin-bottom:4px;font-family:monospace}
.metric-card .label{color:#b0b0b0;font-size:11px;text-transform:uppercase;letter-spacing:0.5px}
.two-col{display:grid;grid-template-columns:repeat(auto-fit,minmax(350px,1fr));gap:15px;margin-bottom:20px}
.stats-card{background:#1f1f23;border-radius:8px;border:1px solid #2a2f3a;overflow:hidden}
.stats-card-header{padding:16px 20px;border-bottom:1px solid #2a2f3a;display:flex;align-items:center;gap:10px}
.stats-card-header h3{margin:0;font-size:15px;color:#fff;font-weight:600}
.stats-card-body{padding:16px 20px}
.game-item{display:flex;align-items:center;padding:12px 0;border-bottom:1px solid #2a2f3a}
.game-item:last-child{border-bottom:none}
.game-rank{width:26px;height:26px;background:#9146ff;border-radius:50%;display:flex;align-items:center;justify-content:center;font-size:11px;font-weight:700;color:#fff;margin-right:12px;flex-shrink:0}
.game-rank.gold{background:#ffd700;color:#000}
.game-rank.silver{background:#c0c0c0;color:#000}
.game-rank.bronze{background:#cd7f32;color:#fff}
.game-info{flex:1;min-width:0}
.game-name{color:#fff;font-weight:500;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;font-size:14px}
.game-hours{color:#b0b0b0;font-size:11px;margin-top:2px}
.game-bar-wrap{width:80px;height:6px;background:#2a2f3a;border-radius:3px;overflow:hidden;margin-left:12px}
.game-bar{height:100%;background:#9146ff;border-radius:3px}
.streams-table{width:100%;border-collapse:separate;border-spacing:0}
.streams-table th{background:#2a2f3a;padding:12px 14px;text-align:left;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;color:#b0b0b0;font-weight:600;border:none}
.streams-table th:first-child{border-radius:4px 0 0 0}
.streams-table th:last-child{border-radius:0 4px 0 0}
.streams-table td{padding:14px;border-bottom:1px solid #2a2f3a;color:#e0e0e0;font-size:13px}
.streams-table tr:hover td{background:#252529}
.streams-table .viewers{color:#9146ff;font-weight:600;font-family:monospace}
.streams-table .duration{color:#4caf50;font-family:monospace}
.streams-table .game-tag{display:inline-block;padding:4px 8px;background:#2a2f3a;border-radius:4px;font-size:11px;color:#b0b0b0}
.monthly-item{display:flex;align-items:center;padding:12px;background:#2a2f3a;border-radius:4px;margin-bottom:10px}
.monthly-item:last-child{margin-bottom:0}
.monthly-label{min-width:90px;font-weight:600;color:#fff;font-size:13px}
.monthly-stats{display:flex;gap:20px;flex:1;justify-content:flex-end}
.monthly-stat{text-align:center}
.monthly-stat .val{font-size:16px;font-weight:700;color:#9146ff;font-family:monospace}
.monthly-stat .lbl{font-size:10px;color:#b0b0b0;text-transform:uppercase}
.chart-container{position:relative;height:280px;margin-top:16px}
.insight-box{background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:18px}
.insight-item{display:flex;align-items:flex-start;gap:12px;padding:10px 0;border-bottom:1px solid #3a3a42}
.insight-item:last-child{border-bottom:none}
.insight-icon{font-size:18px}
.insight-text{color:#e0e0e0;line-height:1.5;font-size:14px}
.insight-text strong{color:#fff}
.empty-state{text-align:center;padding:40px 20px;color:#b0b0b0}
.empty-state .empty-icon{font-size:36px;margin-bottom:12px;opacity:0.5}
.live-banner{background:#c43c3c;padding:14px 22px;border-radius:8px;display:flex;align-items:center;gap:14px;margin-bottom:20px}
.live-dot{width:10px;height:10px;background:#fff;border-radius:50%;animation:blink 1s infinite}
@keyframes blink{0%,100%{opacity:1}50%{opacity:0.4}}
.live-text{font-weight:700;font-size:15px;color:#fff}
.live-viewers{margin-left:auto;background:rgba(255,255,255,0.2);padding:6px 14px;border-radius:20px;font-weight:600;color:#fff;font-size:13px}
</style>

<div id="stats-dashboard">
  <div class="stats-header">
    <h2>📊 Stream Analytics</h2>
    <p>Track your streaming performance and growth over time</p>
    <div class="filter-row">
      <button class="filter-btn active" data-filter="all">All Time</button>
      <button class="filter-btn" data-filter="30days">Last 30 Days</button>
      <button class="filter-btn" data-filter="7days">Last 7 Days</button>
      <button class="export-btn" onclick="exportStats()">📥 Export CSV</button>
    </div>
  </div>

  ${liveBannerHtml}

  ${(function() {
    var csvd = currentStreamViewerData || [];
    if (csvd.length < 5) return '';
    var step = Math.max(1, Math.floor(csvd.length / 60));
    var sampled = [];
    for (var i = 0; i < csvd.length; i += step) sampled.push(csvd[i]);
    if (sampled[sampled.length - 1] !== csvd[csvd.length - 1]) sampled.push(csvd[csvd.length - 1]);
    var labels = sampled.map(function(d) { return d.time || ''; });
    var viewers = sampled.map(function(d) { return d.viewers || 0; });
    var peakV = Math.max.apply(null, viewers);
    var startV = viewers[0] || 0;
    var endV = viewers[viewers.length - 1] || 0;
    var avgV = Math.round(viewers.reduce(function(a, b) { return a + b; }, 0) / viewers.length);
    var durationMinutes = csvd.length > 1 ? Math.round((csvd[csvd.length - 1].timestamp - csvd[0].timestamp) / 60000) : 0;
    var durationStr = Math.floor(durationMinutes / 60) + 'h ' + (durationMinutes % 60) + 'm';
    return '<div class="stats-card" style="margin-bottom:20px">' +
      '<div class="stats-card-header"><span>\uD83D\uDCE1</span><h3>Current/Last Stream \u2014 Live Viewer Curve</h3></div>' +
      '<div class="stats-card-body">' +
        '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:8px;margin-bottom:12px">' +
          '<div style="background:#26262c;padding:8px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Start</div><div style="font-size:16px;color:#4caf50;font-weight:bold">' + startV + '</div></div>' +
          '<div style="background:#26262c;padding:8px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Peak</div><div style="font-size:16px;color:#ffd700;font-weight:bold">' + peakV + '</div></div>' +
          '<div style="background:#26262c;padding:8px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Current/End</div><div style="font-size:16px;color:#ef5350;font-weight:bold">' + endV + '</div></div>' +
          '<div style="background:#26262c;padding:8px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Average</div><div style="font-size:16px;color:#9146ff;font-weight:bold">' + avgV + '</div></div>' +
          '<div style="background:#26262c;padding:8px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Duration</div><div style="font-size:16px;color:#2196f3;font-weight:bold">' + durationStr + '</div></div>' +
        '</div>' +
        '<div style="height:180px"><canvas id="live-viewer-chart"></canvas></div>' +
      '</div>' +
    '</div>';
  })()}

  <div class="metrics-grid">
    <div class="metric-card" style="--accent:#9146ff"><div class="icon">📺</div><div class="value">${totalStreams}</div><div class="label">Total Streams</div></div>
    <div class="metric-card" style="--accent:#ff6b9d"><div class="icon">⏱️</div><div class="value">${totalHours}h</div><div class="label">Hours Streamed</div></div>
    <div class="metric-card" style="--accent:#7fdfb4"><div class="icon">👥</div><div class="value">${avgViewers}</div><div class="label">Avg Peak Viewers</div></div>
    <div class="metric-card" style="--accent:#ffd700"><div class="icon">🏆</div><div class="value">${peakViewers}</div><div class="label">All-Time Peak</div></div>
    <div class="metric-card" style="--accent:#64b5f6"><div class="icon">📊</div><div class="value">${avgDuration}m</div><div class="label">Avg Duration</div></div>
    <div class="metric-card" style="--accent:#ce93d8"><div class="icon">📈</div><div class="value">${medianViewers}</div><div class="label">Median Viewers</div></div>
    <div class="metric-card" style="--accent:#4caf50"><div class="icon">👤</div><div class="value">${totalFollowers}</div><div class="label">Total Followers</div></div>
    <div class="metric-card" style="--accent:#e91e63"><div class="icon">💎</div><div class="value">${totalSubs}</div><div class="label">Total Subs</div></div>
    <div class="metric-card" style="--accent:#00bcd4"><div class="icon">👁️</div><div class="value">${viewerHours}</div><div class="label">Viewer-Hours</div></div>
    <div class="metric-card" style="--accent:#ff9800"><div class="icon">🎮</div><div class="value">${uniqueGames}</div><div class="label">Games Played</div></div>
    <div class="metric-card" style="--accent:#8bc34a"><div class="icon">📅</div><div class="value">${streamsPerWeek}/wk</div><div class="label">Stream Frequency</div></div>
    <div class="metric-card" style="--accent:#ff5722"><div class="icon">⏰</div><div class="value">${sinceLastLabel}</div><div class="label">Since Last Stream</div></div>
    <div class="metric-card" style="--accent:#9c27b0"><div class="icon">➕</div><div class="value">${avgFollowersPerStream}</div><div class="label">Follows/Stream</div></div>
    <div class="metric-card" style="--accent:#3f51b5"><div class="icon">⭐</div><div class="value">${avgSubsPerStream}</div><div class="label">Subs/Stream</div></div>
  </div>

  ${(() => {
    // Monthly goals progress
    const g = streamGoals || {};
    const hasGoals = g.monthlyFollowers > 0 || g.monthlyHours > 0 || g.monthlyStreams > 0 || g.monthlyPeakViewers > 0;
    const now = new Date();
    const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);
    const thisMonthStreams = (history || []).filter(s => new Date(s.startedAt || s.date) >= monthStart);
    const monthStreams = thisMonthStreams.length;
    const monthHours = parseFloat((thisMonthStreams.reduce((sum, s) => sum + (s.durationMinutes || 0), 0) / 60).toFixed(1));
    const monthFollows = thisMonthStreams.reduce((sum, s) => sum + (s.followers || s.newFollowers || 0), 0);
    const monthPeak = thisMonthStreams.reduce((max, s) => Math.max(max, s.peakViewers || 0), 0);
    const monthName = now.toLocaleString('en-US', { month: 'long', year: 'numeric' });

    function goalBar(label, current, target, color, icon) {
      if (!target || target <= 0) return '';
      const pct = Math.min(100, (current / target * 100)).toFixed(0);
      const done = current >= target;
      return '<div style="margin-bottom:8px">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:3px">' +
        '<span style="color:#e0e0e0;font-size:12px;font-weight:600">' + icon + ' ' + label + '</span>' +
        '<span style="color:' + (done ? '#4caf50' : color) + ';font-size:12px;font-weight:700">' + current + '/' + target + (done ? ' ✓' : '') + ' <span style="color:#72767d;font-size:10px">' + pct + '%</span></span>' +
        '</div>' +
        '<div style="background:#222;border-radius:4px;height:6px;overflow:hidden">' +
        '<div style="background:' + (done ? '#4caf50' : 'linear-gradient(90deg,' + color + ',' + color + 'cc)') + ';height:100%;width:' + pct + '%;border-radius:4px;transition:width 0.5s"></div>' +
        '</div>' +
        '</div>';
    }

    return '<div class="card" style="margin:14px 0;border:1px solid ' + (hasGoals ? '#5b5bff33' : '#33333888') + ';padding:14px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">' +
      '<h3 style="margin:0;font-size:14px;color:#e0e0e0">🎯 Monthly Goals — ' + monthName + '</h3>' +
      '<button onclick="document.getElementById(\'goal-config\').style.display=document.getElementById(\'goal-config\').style.display===\'none\'?\'block\':\'none\'" style="padding:6px 14px;background:#2a2e35;border:1px solid #5b5bff44;border-radius:5px;color:#8b8fa3;cursor:pointer;font-size:12px;white-space:nowrap">⚙️ Configure</button>' +
      '</div>' +
      (hasGoals ?
        goalBar('Streams', monthStreams, g.monthlyStreams, '#9146ff', '📺') +
        goalBar('Hours Streamed', monthHours, g.monthlyHours, '#e91e63', '⏱️') +
        goalBar('Followers', monthFollows, g.monthlyFollowers, '#4caf50', '❤️') +
        goalBar('Peak Viewers', monthPeak, g.monthlyPeakViewers, '#ff9800', '🏆')
        : '<div style="text-align:center;padding:20px;color:#72767d">No goals set yet. Click Configure to set your monthly streaming goals!</div>'
      ) +
      '<div id="goal-config" style="display:none;margin-top:20px;padding:20px;background:#2b2d31;border-radius:10px">' +
      '<h4 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">⚙️ Set Monthly Goals</h4>' +
      '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px">' +
      '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:4px">📺 Monthly Streams</label><input type="number" id="goalStreams" value="' + (g.monthlyStreams || '') + '" min="0" placeholder="e.g. 12" style="width:100%;padding:8px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
      '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:4px">⏱️ Monthly Hours</label><input type="number" id="goalHours" value="' + (g.monthlyHours || '') + '" min="0" placeholder="e.g. 40" style="width:100%;padding:8px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
      '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:4px">❤️ Monthly Followers</label><input type="number" id="goalFollowers" value="' + (g.monthlyFollowers || '') + '" min="0" placeholder="e.g. 50" style="width:100%;padding:8px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
      '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:4px">🏆 Monthly Peak Viewers</label><input type="number" id="goalPeak" value="' + (g.monthlyPeakViewers || '') + '" min="0" placeholder="e.g. 100" style="width:100%;padding:8px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
      '</div>' +
      '<button onclick="saveStreamGoals()" style="margin-top:12px;padding:10px 24px;background:#5b5bff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px">💾 Save Goals</button>' +
      '</div>' +
    '</div>';
  })()}

  <div class="stats-card" style="margin-bottom:20px">
    <div class="stats-card-header"><span>🤖</span><h3>AI Insights</h3></div>
    <div class="stats-card-body">
      <div class="insight-box">${insightsHtml}</div>
    </div>
  </div>

  <div class="two-col">
    <div class="stats-card">
      <div class="stats-card-header"><span>🎮</span><h3>Top Games</h3></div>
      <div class="stats-card-body">${topGamesHtml}</div>
    </div>
    <div class="stats-card">
      <div class="stats-card-header"><span>📅</span><h3>Monthly Summary</h3></div>
      <div class="stats-card-body">${monthlyHtml}</div>
    </div>
  </div>

  <div class="stats-card" style="margin-bottom:24px">
    <div class="stats-card-header"><span>📈</span><h3>Viewer Trend</h3></div>
    <div class="stats-card-body">
      <div class="chart-container"><canvas id="viewers-chart"></canvas></div>
    </div>
  </div>

  <div class="stats-card" style="margin-bottom:24px">
    <div class="stats-card-header"><span>📋</span><h3>Recent Streams</h3></div>
    <div class="stats-card-body" style="padding:0 22px 18px">${streamsTableHtml}</div>
  </div>

  <div class="stats-card" style="margin-bottom:24px">
    <div class="stats-card-header"><span>⏱️</span><h3>Stream Duration</h3></div>
    <div class="stats-card-body">
      <div class="chart-container" style="height:160px"><canvas id="duration-chart"></canvas></div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
const analyticsData = {
  history: ${JSON.stringify(h)},
  allStreams: ${JSON.stringify(allStreams)},
  isLive: ${JSON.stringify(isCurrentlyLive)}
};

document.addEventListener('DOMContentLoaded', function() {
  var ctx = document.getElementById('viewers-chart');
  if (ctx && analyticsData.history.length > 0) {
    var sorted = analyticsData.history.slice().sort(function(a, b) {
      return new Date(a.startedAt || a.date) - new Date(b.startedAt || b.date);
    }).slice(-20);
    new Chart(ctx, {
      type: 'line',
      data: {
        labels: sorted.map(function(s) {
          return new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: 'Peak Viewers',
          data: sorted.map(function(s) { return s.peakViewers || 0; }),
          borderColor: '#9146ff',
          backgroundColor: 'rgba(145, 70, 255, 0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#9146ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        },
        {
          label: 'Avg Viewers',
          data: sorted.map(function(s) { return s.avgViewers || s.averageViewers || 0; }),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76, 175, 80, 0.08)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#4caf50',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 3,
          borderDash: [5, 3]
        },
        (function() {
          var lastStream = sorted[sorted.length - 1];
          var lastPeak = lastStream ? (lastStream.peakViewers || 0) : 0;
          return {
            label: 'Last Stream Peak',
            data: sorted.map(function() { return lastPeak; }),
            borderColor: 'rgba(255, 215, 0, 0.25)',
            borderWidth: 1,
            borderDash: [8, 4],
            pointRadius: 0,
            fill: false
          };
        })(),
        (function() {
          var lastStream = sorted[sorted.length - 1];
          var lastAvg = lastStream ? (lastStream.avgViewers || lastStream.averageViewers || 0) : 0;
          return {
            label: 'Last Stream Avg',
            data: sorted.map(function() { return lastAvg; }),
            borderColor: 'rgba(76, 175, 80, 0.2)',
            borderWidth: 1,
            borderDash: [4, 4],
            pointRadius: 0,
            fill: false
          };
        })()].filter(function(d) { return d; })
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#8b8fa3', usePointStyle: true, pointStyle: 'circle' } } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8fa3' } },
          x: { grid: { display: false }, ticks: { color: '#8b8fa3' } }
        }
      }
    });
  }

  var dctx = document.getElementById('duration-chart');
  if (dctx && analyticsData.history.length > 0) {
    var dsorted = analyticsData.history.slice().sort(function(a, b) {
      return new Date(a.startedAt || a.date) - new Date(b.startedAt || b.date);
    }).slice(-20);
    new Chart(dctx, {
      type: 'bar',
      data: {
        labels: dsorted.map(function(s) {
          return new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
        }),
        datasets: [{
          label: 'Duration (min)',
          data: dsorted.map(function(s) { return s.durationMinutes || Math.round((s.duration || 0) / 60); }),
          backgroundColor: dsorted.map(function(s) {
            var m = s.durationMinutes || Math.round((s.duration || 0) / 60);
            return m >= 180 ? 'rgba(76,175,80,0.7)' : m >= 60 ? 'rgba(255,152,0,0.7)' : 'rgba(239,83,80,0.7)';
          }),
          borderColor: dsorted.map(function(s) {
            var m = s.durationMinutes || Math.round((s.duration || 0) / 60);
            return m >= 180 ? '#4caf50' : m >= 60 ? '#ff9800' : '#ef5350';
          }),
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { label: function(ctx) { var v = ctx.raw; return Math.floor(v/60) + 'h ' + (v%60) + 'm'; } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8fa3', callback: function(v) { return Math.floor(v/60) + 'h'; } } },
          x: { grid: { display: false }, ticks: { color: '#8b8fa3' } }
        }
      }
    });
  }

  document.querySelectorAll('.filter-btn').forEach(function(btn) {
    btn.addEventListener('click', function() {
      document.querySelectorAll('.filter-btn').forEach(function(b) { b.classList.remove('active'); });
      btn.classList.add('active');
    });
  });

  // Live viewer chart for Current/Last Stream
  var lctx = document.getElementById('live-viewer-chart');
  if (lctx) {
    var csvd = ${JSON.stringify((function() {
      var csvd = currentStreamViewerData || [];
      if (csvd.length < 5) return { labels: [], viewers: [] };
      var step = Math.max(1, Math.floor(csvd.length / 60));
      var sampled = [];
      for (var i = 0; i < csvd.length; i += step) sampled.push(csvd[i]);
      if (sampled[sampled.length - 1] !== csvd[csvd.length - 1]) sampled.push(csvd[csvd.length - 1]);
      return { labels: sampled.map(function(d) { return d.time || ''; }), viewers: sampled.map(function(d) { return d.viewers || 0; }) };
    })())};
    if (csvd.labels.length > 0) {
      new Chart(lctx, {type:'line',data:{labels:csvd.labels,datasets:[{label:'Viewers',data:csvd.viewers,borderColor:'#9146ff',backgroundColor:'rgba(145,70,255,0.15)',fill:true,tension:0.3,pointRadius:0,borderWidth:2}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{y:{beginAtZero:false,grid:{color:'rgba(255,255,255,0.05)'},ticks:{color:'#8b8fa3'}},x:{display:false}}}});
    }
  }

  // Lazy load streams on scroll
  var scrollContainer = document.getElementById('streams-scroll-container');
  var tbody = document.getElementById('streams-tbody');
  if (scrollContainer && tbody && analyticsData.allStreams) {
    var loadedCount = 4;
    var batchSize = 4;
    var loading = false;
    scrollContainer.addEventListener('scroll', function() {
      if (loading) return;
      if (scrollContainer.scrollTop + scrollContainer.clientHeight >= scrollContainer.scrollHeight - 40) {
        if (loadedCount >= analyticsData.allStreams.length) return;
        loading = true;
        var batch = analyticsData.allStreams.slice(loadedCount, loadedCount + batchSize);
        batch.forEach(function(s) {
          var date = new Date(s.startedAt || s.date);
          var formattedDate = date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
          var hrs = Math.floor((s.durationMinutes || 0) / 60);
          var mins = (s.durationMinutes || 0) % 60;
          var duration = hrs > 0 ? hrs + 'h ' + mins + 'm' : mins + 'm';
          var game = s.game || s.gameName || 'Unknown';
          var tr = document.createElement('tr');
          tr.innerHTML = '<td>' + formattedDate + '</td><td><span class="game-tag">' + game + '</span></td><td class="viewers">' + (s.peakViewers || 0) + '</td><td class="duration">' + duration + '</td>';
          tbody.appendChild(tr);
        });
        loadedCount += batch.length;
        loading = false;
      }
    });
  }
});

function exportStats() {
  var data = analyticsData.history;
  if (!data || !data.length) { alert('No data to export'); return; }
  var headers = ['Date', 'Game', 'Peak Viewers', 'Duration (min)'];
  var rows = data.map(function(s) {
    return [
      new Date(s.startedAt || s.date).toISOString().split('T')[0],
      (s.game || s.gameName || 'Unknown').replace(/,/g, ' '),
      s.peakViewers || 0,
      s.durationMinutes || 0
    ];
  });
  var csv = [headers.join(',')].concat(rows.map(function(r) { return r.join(','); })).join('\\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'stream_stats_' + new Date().toISOString().split('T')[0] + '.csv';
  a.click();
  URL.revokeObjectURL(url);
}

function saveStreamGoals() {
  var data = {
    monthlyStreams: parseInt(document.getElementById('goalStreams').value) || 0,
    monthlyHours: parseInt(document.getElementById('goalHours').value) || 0,
    monthlyFollowers: parseInt(document.getElementById('goalFollowers').value) || 0,
    monthlyPeakViewers: parseInt(document.getElementById('goalPeak').value) || 0
  };
  fetch('/api/stream-goals', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify(data) })
  .then(function(r) { return r.json(); })
  .then(function(d) { if (d.success) location.reload(); else alert(d.error || 'Error saving goals'); });
}
</script>
`;
}

// NEW: Engagement Stats Tab
export function renderEngagementStatsTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  let totalEngagement = 0;
  let peakEngagement = 0;
  const engagementData = [];

  h.forEach(s => {
    const engagement = (s.peakViewers || 0) + ((s.subscribers || 0) * 10) + ((s.followers || 0) * 2);
    engagementData.push(engagement);
    totalEngagement += engagement;
    if (engagement > peakEngagement) peakEngagement = engagement;
  });

  const avgEngagement = h.length > 0 ? Math.round(totalEngagement / h.length) : 0;
  const top20Percent = h.length > 0 ? h.slice(0, Math.ceil(h.length * 0.2)) : [];
  const top20Engagement = Math.round(top20Percent.reduce((sum, s) => sum + (s.peakViewers || 0), 0) / (top20Percent.length || 1));
  // Growth rate: compare recent 5 streams avg vs previous 5 (chronologically sorted)
  const sortedByDate = [...h].sort((a, b) => new Date(a.startedAt || a.date) - new Date(b.startedAt || b.date));
  const recentN = sortedByDate.slice(-5);
  const olderN = sortedByDate.slice(-10, -5);
  const recentAvgEng = recentN.length > 0 ? recentN.reduce((s, x) => s + (x.peakViewers || 0), 0) / recentN.length : 0;
  const olderAvgEng = olderN.length > 0 ? olderN.reduce((s, x) => s + (x.peakViewers || 0), 0) / olderN.length : 0;
  const growthRate = olderAvgEng > 0 ? (((recentAvgEng - olderAvgEng) / olderAvgEng) * 100).toFixed(1) : '0.0';

  // Median engagement
  const sortedEng = [...engagementData].sort((a, b) => a - b);
  const medianEngagement = sortedEng.length > 0 ? sortedEng[Math.floor(sortedEng.length / 2)] : 0;

  // Percentiles
  const p25 = sortedEng.length > 0 ? sortedEng[Math.floor(sortedEng.length * 0.25)] : 0;
  const p75 = sortedEng.length > 0 ? sortedEng[Math.floor(sortedEng.length * 0.75)] : 0;
  const p90 = sortedEng.length > 0 ? sortedEng[Math.floor(sortedEng.length * 0.90)] : 0;
  const iqr = p75 - p25;

  // Engagement consistency (standard deviation)
  const mean = avgEngagement;
  const variance = engagementData.length > 1 ? engagementData.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / engagementData.length : 0;
  const stdDev = Math.round(Math.sqrt(variance));
  const consistencyScore = mean > 0 ? Math.max(0, Math.min(100, Math.round(100 - (stdDev / mean * 100)))) : 0;

  // Streaks
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  for (let i = 0; i < h.length; i++) {
    if ((h[i].peakViewers || 0) >= avgEngagement * 0.8) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
    else { tempStreak = 0; }
  }
  if (h.length > 0 && (h[0].peakViewers || 0) >= avgEngagement * 0.8) {
    currentStreak = 1;
    for (let i = 1; i < h.length; i++) {
      if ((h[i].peakViewers || 0) >= avgEngagement * 0.8) currentStreak++;
      else break;
    }
  }

  // Viewer retention estimate
  const avgViewers = h.length > 0 ? Math.round(h.reduce((s, x) => s + (x.averageViewers || x.peakViewers || 0), 0) / h.length) : 0;
  const avgPeak = h.length > 0 ? Math.round(h.reduce((s, x) => s + (x.peakViewers || 0), 0) / h.length) : 0;
  const retentionRate = avgPeak > 0 ? Math.round((avgViewers / avgPeak) * 100) : 0;

  // Total followers/subs
  const totalFollowers = h.reduce((s, x) => s + (x.followers || x.newFollowers || 0), 0);
  const totalSubs = h.reduce((s, x) => s + (x.subscribers || x.newSubs || 0), 0);

  // Engagement per minute
  const totalMinutes = h.reduce((s, x) => s + (x.durationMinutes || 0), 0);
  const engPerMin = totalMinutes > 0 ? (totalEngagement / totalMinutes).toFixed(2) : '0.00';

  // Viewer per hour efficiency
  const totalHours = totalMinutes / 60;
  const viewersPerHour = totalHours > 0 ? (h.reduce((s, x) => s + (x.peakViewers || 0), 0) / totalHours).toFixed(1) : '0.0';

  // Recent vs all-time comparison
  const recent10 = h.slice(-10);
  const recent10Avg = recent10.length > 0 ? Math.round(recent10.reduce((s, x) => s + (x.peakViewers || 0), 0) / recent10.length) : 0;
  const allTimeAvg = avgPeak;
  const recentVsAllTime = allTimeAvg > 0 ? (((recent10Avg - allTimeAvg) / allTimeAvg) * 100).toFixed(1) : '0.0';

  // Week over week change
  const thisWeek = h.filter(s => (Date.now() - new Date(s.startedAt || s.date).getTime()) < 7 * 24 * 60 * 60 * 1000);
  const lastWeek = h.filter(s => { const age = Date.now() - new Date(s.startedAt || s.date).getTime(); return age >= 7 * 24 * 60 * 60 * 1000 && age < 14 * 24 * 60 * 60 * 1000; });
  const thisWeekAvg = thisWeek.length > 0 ? Math.round(thisWeek.reduce((s, x) => s + (x.peakViewers || 0), 0) / thisWeek.length) : 0;
  const lastWeekAvg = lastWeek.length > 0 ? Math.round(lastWeek.reduce((s, x) => s + (x.peakViewers || 0), 0) / lastWeek.length) : 0;
  const wowChange = lastWeekAvg > 0 ? (((thisWeekAvg - lastWeekAvg) / lastWeekAvg) * 100).toFixed(1) : '0.0';

  // Follower conversion rate
  const followerConvRate = h.length > 0 ? ((totalFollowers / Math.max(h.reduce((s, x) => s + (x.peakViewers || 0), 0), 1)) * 100).toFixed(2) : '0.00';
  const subConvRate = h.length > 0 ? ((totalSubs / Math.max(h.reduce((s, x) => s + (x.peakViewers || 0), 0), 1)) * 100).toFixed(2) : '0.00';

  // Engagement per game
  const gameEngagement = {};
  h.forEach(s => {
    const game = s.game || s.gameName || 'Unknown';
    if (!gameEngagement[game]) gameEngagement[game] = { total: 0, count: 0 };
    gameEngagement[game].total += (s.peakViewers || 0) + ((s.subscribers || 0) * 10) + ((s.followers || 0) * 2);
    gameEngagement[game].count++;
  });
  const topEngGames = Object.entries(gameEngagement).map(([g, d]) => [g, Math.round(d.total / d.count)]).sort((a, b) => b[1] - a[1]).slice(0, 5);

  // Engagement trend (improving/declining)
  const firstHalf = engagementData.slice(Math.floor(engagementData.length / 2));
  const secondHalf = engagementData.slice(0, Math.floor(engagementData.length / 2));
  const firstAvg = firstHalf.length > 0 ? firstHalf.reduce((a, b) => a + b, 0) / firstHalf.length : 0;
  const secondAvg = secondHalf.length > 0 ? secondHalf.reduce((a, b) => a + b, 0) / secondHalf.length : 0;
  const engTrend = secondAvg > firstAvg * 1.1 ? '📈 Improving' : secondAvg < firstAvg * 0.9 ? '📉 Declining' : '➡️ Stable';

  // Sparkline bars for last 20 streams (sorted oldest→newest)
  const last20 = [...h].sort((a, b) => new Date(a.startedAt || a.date) - new Date(b.startedAt || b.date)).slice(-20);
  const sparkMax = Math.max(...last20.map(s => s.peakViewers || 0), 1);
  let sparkBars = '';
  last20.forEach((s, idx) => {
    const pct = Math.round(((s.peakViewers || 0) / sparkMax) * 100);
    const color = pct > 70 ? '#9146ff' : pct > 40 ? '#4caf50' : '#ff9800';
    const sDate = new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const sGame = (s.game || s.gameName || 'Unknown').replace(/'/g, '');
    const sDurH = Math.floor((s.durationMinutes || 0) / 60);
    const sDurM = (s.durationMinutes || 0) % 60;
    const sDur = sDurH > 0 ? sDurH + 'h ' + sDurM + 'm' : sDurM + 'm';
    const sEng = (s.peakViewers || 0) + ((s.subscribers || 0) * 10) + ((s.followers || 0) * 2);
    const tooltip = sDate + ' | ' + sGame + ' | ' + (s.peakViewers || 0) + ' peak | ' + sDur + ' | Eng: ' + sEng;
    sparkBars += '<div class="spark-bar" style="flex:1;min-width:8px;background:' + color + ';height:' + Math.max(pct, 5) + '%;border-radius:2px;cursor:pointer;transition:opacity 0.15s" title="' + tooltip + '" onmouseenter="this.style.opacity=0.7" onmouseleave="this.style.opacity=1"></div>';
  });

  // Engagement per game bars
  let gameEngHtml = '';
  const topEngMax = topEngGames.length > 0 ? topEngGames[0][1] : 1;
  topEngGames.forEach(([game, avg]) => {
    const pct = Math.round((avg / topEngMax) * 100);
    gameEngHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="color:#b0b0b0;width:120px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + game + '</span>' +
      '<div style="flex:1;background:#2b2d31;border-radius:3px;height:20px;overflow:hidden"><div style="background:linear-gradient(90deg,#9146ff,#ce93d8);height:100%;width:' + pct + '%;border-radius:3px;display:flex;align-items:center;padding-left:6px"><span style="font-size:10px;color:#fff;font-weight:bold">' + avg + '</span></div></div></div>';
  });

  // --- Last 10 vs Previous 10 Comparison ---
  const prev10 = h.length > 10 ? h.slice(-20, -10) : [];
  const recent10AvgPeak = recent10.length > 0 ? Math.round(recent10.reduce((s, x) => s + (x.peakViewers || 0), 0) / recent10.length) : 0;
  const prev10AvgPeak = prev10.length > 0 ? Math.round(prev10.reduce((s, x) => s + (x.peakViewers || 0), 0) / prev10.length) : recent10AvgPeak;
  const deltaPeak = recent10AvgPeak - prev10AvgPeak;
  const recent10Eng = recent10.map(s => (s.peakViewers || 0) + ((s.subscribers || 0) * 10) + ((s.followers || 0) * 2));
  const prev10Eng = prev10.map(s => (s.peakViewers || 0) + ((s.subscribers || 0) * 10) + ((s.followers || 0) * 2));
  const recent10AvgEng = recent10Eng.length > 0 ? Math.round(recent10Eng.reduce((a, b) => a + b, 0) / recent10Eng.length) : 0;
  const prev10AvgEng = prev10Eng.length > 0 ? Math.round(prev10Eng.reduce((a, b) => a + b, 0) / prev10Eng.length) : recent10AvgEng;
  const deltaEng = recent10AvgEng - prev10AvgEng;
  const calcRetention = (streams) => {
    if (streams.length === 0) return 0;
    return Math.round(streams.reduce((s, x) => s + ((x.averageViewers || x.peakViewers || 0) / Math.max(1, x.peakViewers || 1)), 0) / streams.length * 100);
  };
  const recent10Ret = calcRetention(recent10);
  const prev10Ret = prev10.length > 0 ? calcRetention(prev10) : recent10Ret;
  const deltaRet = recent10Ret - prev10Ret;
  const calcFollowsPerHour = (streams) => {
    const hrs = streams.reduce((s, x) => s + ((x.durationMinutes || 0) / 60), 0);
    const fols = streams.reduce((s, x) => s + (x.followers || x.newFollowers || 0), 0);
    return hrs > 0 ? (fols / hrs) : 0;
  };
  const recent10FPH = calcFollowsPerHour(recent10);
  const prev10FPH = prev10.length > 0 ? calcFollowsPerHour(prev10) : recent10FPH;
  const deltaFPH = (recent10FPH - prev10FPH).toFixed(2);

  // --- Efficiency Metrics ---
  const overallGrowthPerHour = totalHours > 0 ? (parseFloat(growthRate) / totalHours).toFixed(2) : '0.00';
  const totalViewerHours = h.reduce((s, x) => s + ((x.averageViewers || x.peakViewers || 0) * ((x.durationMinutes || 0) / 60)), 0);
  const followsPerViewerHour = totalViewerHours > 0 ? (totalFollowers / totalViewerHours).toFixed(3) : '0.000';
  const peakPerHour = totalHours > 0 ? (h.reduce((s, x) => s + (x.peakViewers || 0), 0) / totalHours).toFixed(1) : '0.0';

  return `
<div class="card">
  <h2>👥 Engagement Analytics</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0">
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Avg Engagement</div>
      <div style="font-size:22px;color:#9146ff;font-weight:bold">${avgEngagement}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Peak Engagement</div>
      <div style="font-size:22px;color:#4caf50;font-weight:bold">${peakEngagement}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Median Engagement</div>
      <div style="font-size:22px;color:#ce93d8;font-weight:bold">${medianEngagement}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Growth Rate</div>
      <div style="font-size:22px;color:#ff9800;font-weight:bold">${growthRate}%</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Top 20% Avg</div>
      <div style="font-size:22px;color:#e91e63;font-weight:bold">${top20Engagement}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Consistency</div>
      <div style="font-size:22px;color:#00bcd4;font-weight:bold">${consistencyScore}%</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Viewer Retention</div>
      <div style="font-size:22px;color:#ab47bc;font-weight:bold">${retentionRate}%</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Eng / Minute</div>
      <div style="font-size:22px;color:#26c6da;font-weight:bold">${engPerMin}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Viewers / Hour</div>
      <div style="font-size:22px;color:#8bc34a;font-weight:bold">${viewersPerHour}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Recent vs All-Time</div>
      <div style="font-size:22px;color:${parseFloat(recentVsAllTime) >= 0 ? '#4caf50' : '#ef5350'};font-weight:bold">${parseFloat(recentVsAllTime) >= 0 ? '+' : ''}${recentVsAllTime}%</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Week-over-Week</div>
      <div style="font-size:22px;color:${parseFloat(wowChange) >= 0 ? '#4caf50' : '#ef5350'};font-weight:bold">${parseFloat(wowChange) >= 0 ? '+' : ''}${wowChange}%</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px">
      <div style="color:#b0b0b0;font-size:11px">Eng. Trend</div>
      <div style="font-size:18px;color:#fff;font-weight:bold;margin-top:4px">${engTrend}</div>
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">📊 Percentile Distribution</h3>
  <p style="color:#72767d;font-size:11px;margin:4px 0 10px">Shows how your engagement scores are spread. P25 = bottom quarter, P50 = middle (median), P75 = top quarter, P90 = top 10%. IQR measures the range between P25–P75.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:12px;margin-top:10px">
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #2196f3">
      <div style="color:#b0b0b0;font-size:10px">P25</div>
      <div style="font-size:20px;color:#2196f3;font-weight:bold">${p25}</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #4caf50">
      <div style="color:#b0b0b0;font-size:10px">MEDIAN (P50)</div>
      <div style="font-size:20px;color:#4caf50;font-weight:bold">${medianEngagement}</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #ff9800">
      <div style="color:#b0b0b0;font-size:10px">P75</div>
      <div style="font-size:20px;color:#ff9800;font-weight:bold">${p75}</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #e91e63">
      <div style="color:#b0b0b0;font-size:10px">P90</div>
      <div style="font-size:20px;color:#e91e63;font-weight:bold">${p90}</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #9c27b0">
      <div style="color:#b0b0b0;font-size:10px">IQR</div>
      <div style="font-size:20px;color:#9c27b0;font-weight:bold">${iqr}</div>
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">📈 Engagement Sparkline (Last 20 Streams)</h3>
  <p style="color:#72767d;font-size:11px;margin:4px 0 8px">Each bar represents one stream's peak viewers. Purple = high (>70%), green = mid (40–70%), orange = low (<40%) relative to your best. Hover for details.</p>
  <div style="display:flex;align-items:flex-end;gap:3px;height:120px;padding:10px;background:#26262c;border-radius:6px;margin-top:10px">
    ${sparkBars || '<div style="color:#b0b0b0;margin:auto">No stream data yet</div>'}
  </div>
  <div style="display:flex;justify-content:space-between;margin-top:5px;font-size:11px;color:#666">
    <span>Oldest</span><span>Most Recent</span>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:15px">
  <div class="card" style="margin:0;padding:10px 14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="color:#4caf50;font-size:14px">👤</span>
      <span style="color:#b0b0b0;font-size:11px">Follower Conv.</span>
      <span style="margin-left:auto;font-size:18px;color:#4caf50;font-weight:bold">${followerConvRate}%</span>
    </div>
    <div style="color:#666;font-size:10px">viewers → followers</div>
  </div>
  <div class="card" style="margin:0;padding:10px 14px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="color:#ffd700;font-size:14px">💎</span>
      <span style="color:#b0b0b0;font-size:11px">Sub Conv.</span>
      <span style="margin-left:auto;font-size:18px;color:#ffd700;font-weight:bold">${subConvRate}%</span>
    </div>
    <div style="color:#666;font-size:10px">viewers → subs</div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <h3 style="margin-top:0;font-size:14px">🎮 Engagement by Game</h3>
      <div style="margin-top:10px">
        ${gameEngHtml || '<div style="color:#b0b0b0;text-align:center;padding:20px">No game data</div>'}
      </div>
    </div>
    <div>
      <h3 style="margin-top:0;font-size:14px">📊 Engagement Breakdown</h3>
      <div style="margin-top:10px">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="color:#b0b0b0;width:70px;font-size:12px">Viewers</span>
          <div style="flex:1;background:#2b2d31;border-radius:3px;height:18px;overflow:hidden">
            <div style="background:linear-gradient(90deg,#9146ff,#ab47bc);height:100%;width:${Math.min(100, avgPeak > 0 ? (avgPeak / (peakEngagement || 1)) * 100 : 0)}%;border-radius:3px"></div>
          </div>
          <span style="color:#fff;font-weight:bold;font-size:12px;min-width:40px;text-align:right">${avgPeak}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="color:#b0b0b0;width:70px;font-size:12px">Followers</span>
          <div style="flex:1;background:#2b2d31;border-radius:3px;height:18px;overflow:hidden">
            <div style="background:linear-gradient(90deg,#4caf50,#66bb6a);height:100%;width:${Math.min(100, totalFollowers > 0 ? Math.min(100, totalFollowers / Math.max(h.length, 1) * 10) : 0)}%;border-radius:3px"></div>
          </div>
          <span style="color:#fff;font-weight:bold;font-size:12px;min-width:40px;text-align:right">${totalFollowers}</span>
        </div>
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:10px">
          <span style="color:#b0b0b0;width:70px;font-size:12px">Subs</span>
          <div style="flex:1;background:#2b2d31;border-radius:3px;height:18px;overflow:hidden">
            <div style="background:linear-gradient(90deg,#ff9800,#ffa726);height:100%;width:${Math.min(100, totalSubs > 0 ? Math.min(100, totalSubs / Math.max(h.length, 1) * 15) : 0)}%;border-radius:3px"></div>
          </div>
          <span style="color:#fff;font-weight:bold;font-size:12px;min-width:40px;text-align:right">${totalSubs}</span>
        </div>
      </div>
      <p style="color:#666;font-size:10px;margin-top:6px">Eng = viewers + (subs×10) + (follows×2) | σ: ${stdDev}</p>
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0"> Last 10 vs Previous 10 Streams</h3>
  <p style="color:#666;font-size:11px;margin-bottom:10px">Comparing your most recent 10 streams against the previous 10</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-top:10px">
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid ${deltaPeak >= 0 ? '#4caf50' : '#ef5350'}">
      <div style="color:#b0b0b0;font-size:10px">Avg Peak Δ</div>
      <div style="font-size:22px;color:${deltaPeak >= 0 ? '#4caf50' : '#ef5350'};font-weight:bold">${deltaPeak >= 0 ? '+' : ''}${deltaPeak}</div>
      <div style="color:#666;font-size:10px">${recent10AvgPeak} vs ${prev10AvgPeak}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid ${deltaEng >= 0 ? '#4caf50' : '#ef5350'}">
      <div style="color:#b0b0b0;font-size:10px">Avg Engagement Δ</div>
      <div style="font-size:22px;color:${deltaEng >= 0 ? '#4caf50' : '#ef5350'};font-weight:bold">${deltaEng >= 0 ? '+' : ''}${deltaEng}</div>
      <div style="color:#666;font-size:10px">${recent10AvgEng} vs ${prev10AvgEng}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid ${deltaRet >= 0 ? '#4caf50' : '#ef5350'}">
      <div style="color:#b0b0b0;font-size:10px">Avg Retention Δ</div>
      <div style="font-size:22px;color:${deltaRet >= 0 ? '#4caf50' : '#ef5350'};font-weight:bold">${deltaRet >= 0 ? '+' : ''}${deltaRet}%</div>
      <div style="color:#666;font-size:10px">${recent10Ret}% vs ${prev10Ret}%</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid ${parseFloat(deltaFPH) >= 0 ? '#4caf50' : '#ef5350'}">
      <div style="color:#b0b0b0;font-size:10px">Follows/Hr Δ</div>
      <div style="font-size:22px;color:${parseFloat(deltaFPH) >= 0 ? '#4caf50' : '#ef5350'};font-weight:bold">${parseFloat(deltaFPH) >= 0 ? '+' : ''}${deltaFPH}</div>
      <div style="color:#666;font-size:10px">${recent10FPH.toFixed(2)} vs ${prev10FPH.toFixed(2)}/hr</div>
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">🎯 Efficiency Metrics</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:12px;margin-top:10px">
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid #2196f3">
      <div style="color:#b0b0b0;font-size:10px">Growth per Hour</div>
      <div style="font-size:22px;color:#2196f3;font-weight:bold">${overallGrowthPerHour}%</div>
      <div style="color:#666;font-size:10px">Growth rate / total hours</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid #e91e63">
      <div style="color:#b0b0b0;font-size:10px">Follows per Viewer-Hour</div>
      <div style="font-size:22px;color:#e91e63;font-weight:bold">${followsPerViewerHour}</div>
      <div style="color:#666;font-size:10px">Follows / (viewers × hours)</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid #ff9800">
      <div style="color:#b0b0b0;font-size:10px">Peak per Hour Streamed</div>
      <div style="font-size:22px;color:#ff9800;font-weight:bold">${peakPerHour}</div>
      <div style="color:#666;font-size:10px">Total peak viewers / hours</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid #26c6da">
      <div style="color:#b0b0b0;font-size:10px">Eng. per Minute</div>
      <div style="font-size:22px;color:#26c6da;font-weight:bold">${engPerMin}</div>
      <div style="color:#666;font-size:10px">Total engagement / minutes</div>
    </div>
  </div>
</div>

<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px">
  <div class="card" style="margin:0">
    <h3 style="margin-top:0;font-size:14px">📈 Follower Growth</h3>
    <div style="height:200px;margin-top:8px"><canvas id="follower-growth-chart"></canvas></div>
    <div style="margin-top:6px;color:#72767d;font-size:11px">${followerHistory.length > 0 ? followerHistory.length + ' pts since ' + new Date(followerHistory[0].timestamp).toLocaleDateString() : 'Tracking starts on next stream'}</div>
  </div>
  <div class="card" style="margin:0">
    <h3 style="margin-top:0;font-size:14px">📊 Engagement Trend</h3>
    <div style="height:200px;margin-top:8px"><canvas id="engagement-trend-chart"></canvas></div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var engSorted = ${JSON.stringify(h.slice().sort((a, b) => new Date(a.startedAt || a.date) - new Date(b.startedAt || b.date)).slice(-20).map(s => ({
    date: new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
    engagement: (s.peakViewers || 0) + ((s.subscribers || 0) * 10) + ((s.followers || 0) * 2),
    peak: s.peakViewers || 0,
    avg: s.avgViewers || s.averageViewers || 0
  })))};
  var ectx = document.getElementById('engagement-trend-chart');
  if (ectx && engSorted.length > 0) {
    new Chart(ectx, {
      type: 'line',
      data: {
        labels: engSorted.map(function(s) { return s.date; }),
        datasets: [{
          label: 'Engagement Score',
          data: engSorted.map(function(s) { return s.engagement; }),
          borderColor: '#e91e63',
          backgroundColor: 'rgba(233,30,99,0.1)',
          fill: true,
          tension: 0.4,
          pointBackgroundColor: '#e91e63',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 4
        },
        {
          label: 'Peak Viewers',
          data: engSorted.map(function(s) { return s.peak; }),
          borderColor: '#9146ff',
          backgroundColor: 'rgba(145,70,255,0.05)',
          fill: false,
          tension: 0.4,
          pointBackgroundColor: '#9146ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 3,
          borderWidth: 2
        },
        {
          label: 'Avg Viewers',
          data: engSorted.map(function(s) { return s.avg; }),
          borderColor: 'rgba(76,175,80,0.5)',
          fill: false,
          tension: 0.4,
          pointRadius: 2,
          borderWidth: 1,
          borderDash: [4, 3]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#8b8fa3', usePointStyle: true } } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8fa3' } },
          x: { grid: { display: false }, ticks: { color: '#8b8fa3' } }
        }
      }
    });
  }

  // Follower Growth Chart
  var followerData = ${JSON.stringify(followerHistory.slice(-100).map(p => ({
    date: new Date(p.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit' }),
    count: p.count
  })))};
  var fgCtx = document.getElementById('follower-growth-chart');
  if (fgCtx && followerData.length > 0) {
    new Chart(fgCtx, {
      type: 'line',
      data: {
        labels: followerData.map(function(p) { return p.date; }),
        datasets: [{
          label: 'Followers',
          data: followerData.map(function(p) { return p.count; }),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76,175,80,0.1)',
          fill: true,
          tension: 0.3,
          pointBackgroundColor: '#4caf50',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          pointRadius: 3
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: false } },
        scales: {
          y: { grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8fa3' } },
          x: { grid: { display: false }, ticks: { color: '#8b8fa3', maxTicksLimit: 10 } }
        }
      }
    });
  }
});
</script>
  `;
}

// NEW: Streaks & Milestones Tab
export function renderStreaksMilestonesTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  if (h.length === 0) return '<div class="card"><h2>🏆 Streaks & Milestones</h2><p style="color:#72767d">No stream data yet. Start streaming to track your streaks!</p></div>';

  const avgEngagement = h.length > 0 ? Math.round(h.reduce((s, x) => s + (x.peakViewers || 0) + ((x.subscribers || 0) * 10) + ((x.followers || 0) * 2), 0) / h.length) : 0;

  // Streaks (above-average engagement)
  let currentStreak = 0, bestStreak = 0, tempStreak = 0;
  for (let i = 0; i < h.length; i++) {
    if ((h[i].peakViewers || 0) >= avgEngagement * 0.8) { tempStreak++; bestStreak = Math.max(bestStreak, tempStreak); }
    else { tempStreak = 0; }
  }
  if (h.length > 0 && (h[0].peakViewers || 0) >= avgEngagement * 0.8) {
    currentStreak = 1;
    for (let i = 1; i < h.length; i++) {
      if ((h[i].peakViewers || 0) >= avgEngagement * 0.8) currentStreak++; else break;
    }
  }

  // Total followers/subs
  const totalFollowers = h.reduce((s, x) => s + (x.followers || x.newFollowers || 0), 0);
  const totalSubs = h.reduce((s, x) => s + (x.subscribers || x.newSubs || 0), 0);

  // Milestones
  const totalStreams = h.length;
  const totalHours = h.reduce((s, x) => s + (x.durationMinutes || 0), 0) / 60;
  const peakViewers = Math.max(...h.map(s => s.peakViewers || 0), 0);
  const longestStreamMin = Math.max(...h.map(s => s.durationMinutes || 0), 0);

  const milestones = [
    { icon: '📺', label: 'Streams', val: totalStreams, thresholds: [1, 5, 10, 25, 50, 100, 250, 500, 1000] },
    { icon: '⏰', label: 'Hours Streamed', val: Math.round(totalHours), thresholds: [1, 10, 50, 100, 250, 500, 1000] },
    { icon: '👥', label: 'Peak Viewers', val: peakViewers, thresholds: [5, 10, 25, 50, 100, 250, 500, 1000] },
    { icon: '❤️', label: 'Total Followers', val: totalFollowers, thresholds: [10, 50, 100, 500, 1000, 5000] },
    { icon: '💎', label: 'Total Subs', val: totalSubs, thresholds: [1, 5, 10, 25, 50, 100, 500] },
    { icon: '⏱️', label: 'Longest Stream (min)', val: longestStreamMin, thresholds: [30, 60, 120, 180, 240, 360, 480] }
  ];

  let milestonesHtml = '';
  milestones.forEach(m => {
    const reached = m.thresholds.filter(t => m.val >= t);
    const next = m.thresholds.find(t => m.val < t);
    const pct = next ? Math.min(100, Math.round((m.val / next) * 100)) : 100;
    const reachedBadges = reached.map(t => '<span style="display:inline-block;background:#9146ff22;color:#9146ff;padding:2px 8px;border-radius:10px;font-size:10px;margin:2px">' + t + ' ✓</span>').join('');
    milestonesHtml += '<div style="background:#26262c;padding:14px;border-radius:6px;margin-bottom:10px">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px">' +
      '<span style="color:#e0e0e0;font-size:13px;font-weight:600">' + m.icon + ' ' + m.label + '</span>' +
      '<span style="color:#9146ff;font-weight:bold;font-size:14px">' + m.val + '</span></div>' +
      '<div style="display:flex;flex-wrap:wrap;gap:2px;margin-bottom:6px">' + reachedBadges + '</div>' +
      (next ? '<div style="display:flex;align-items:center;gap:8px"><div style="flex:1;background:#222;border-radius:4px;height:6px;overflow:hidden"><div style="background:#9146ff;height:100%;width:' + pct + '%;border-radius:4px"></div></div><span style="color:#72767d;font-size:10px">' + pct + '% to ' + next + '</span></div>' : '<div style="color:#4caf50;font-size:11px">🏆 All milestones reached!</div>') +
      '</div>';
  });

  // Day streak calculation
  const sorted = [...h].sort((a, b) => new Date(b.startedAt || b.date) - new Date(a.startedAt || a.date));
  const today = new Date(); today.setHours(0, 0, 0, 0);
  const streamDates = [...new Set(sorted.map(s => { const d = new Date(s.startedAt || s.date); return d.toISOString().split('T')[0]; }))].map(ds => new Date(ds)).sort((a, b) => b - a);
  let dayStreak = 0;
  if (streamDates.length > 0 && Math.floor((today - streamDates[0]) / 86400000) <= 1) {
    dayStreak = 1;
    for (let i = 1; i < streamDates.length; i++) {
      if (Math.floor((streamDates[i - 1] - streamDates[i]) / 86400000) === 1) dayStreak++;
      else break;
    }
  }
  let longestDayStreak = 1, tmpDS = 1;
  for (let i = 1; i < streamDates.length; i++) {
    if (Math.floor((streamDates[i - 1] - streamDates[i]) / 86400000) === 1) { tmpDS++; longestDayStreak = Math.max(longestDayStreak, tmpDS); }
    else tmpDS = 1;
  }
  if (streamDates.length <= 1) { longestDayStreak = streamDates.length; }

  return `
<div class="card">
  <h2>🏆 Streaks & Milestones</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0">
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="font-size:24px">🔥</div>
      <div style="font-size:22px;color:#ff9800;font-weight:bold;margin:4px 0">${dayStreak}</div>
      <div style="color:#b0b0b0;font-size:11px">Day Streak</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="font-size:24px">⭐</div>
      <div style="font-size:22px;color:#ffd700;font-weight:bold;margin:4px 0">${longestDayStreak}</div>
      <div style="color:#b0b0b0;font-size:11px">Best Day Streak</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="font-size:24px">📈</div>
      <div style="font-size:22px;color:#9146ff;font-weight:bold;margin:4px 0">${currentStreak}</div>
      <div style="color:#b0b0b0;font-size:11px">Eng. Streak</div>
      <div style="color:#666;font-size:9px">≥80% avg engagement</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="font-size:24px">🏅</div>
      <div style="font-size:22px;color:#e91e63;font-weight:bold;margin:4px 0">${bestStreak}</div>
      <div style="color:#b0b0b0;font-size:11px">Best Eng. Streak</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="font-size:24px">👥</div>
      <div style="font-size:22px;color:#4caf50;font-weight:bold;margin:4px 0">${totalFollowers}</div>
      <div style="color:#b0b0b0;font-size:11px">Total Follows</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="font-size:24px">💎</div>
      <div style="font-size:22px;color:#2196f3;font-weight:bold;margin:4px 0">${totalSubs}</div>
      <div style="color:#b0b0b0;font-size:11px">Total Subs</div>
    </div>
  </div>

  <h3 style="margin:20px 0 10px;color:#e0e0e0;font-size:15px">🎯 Milestone Tracker</h3>
  ${milestonesHtml}
</div>
  `;
}

// NEW: Trends Stats Tab
export function renderTrendsStatsTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  const weeklyStats = {};
  const monthlyStats = {};
  const dayOfWeekStats = { 0: { label: 'Sun', streams: 0, viewers: 0, duration: 0 }, 1: { label: 'Mon', streams: 0, viewers: 0, duration: 0 }, 2: { label: 'Tue', streams: 0, viewers: 0, duration: 0 }, 3: { label: 'Wed', streams: 0, viewers: 0, duration: 0 }, 4: { label: 'Thu', streams: 0, viewers: 0, duration: 0 }, 5: { label: 'Fri', streams: 0, viewers: 0, duration: 0 }, 6: { label: 'Sat', streams: 0, viewers: 0, duration: 0 } };

  // Duration trends
  const durationBuckets = { 'Under 1h': 0, '1-2h': 0, '2-3h': 0, '3-4h': 0, '4-5h': 0, '5h+': 0 };

  h.forEach(s => {
    const date = new Date(s.startedAt || s.date);
    const week = date.getFullYear() + '-W' + Math.ceil(((date - new Date(date.getFullYear(), 0, 1)) / 86400000 + 1) / 7);
    const month = date.toLocaleString('default', { month: 'long', year: 'numeric' });
    const dow = date.getDay();

    if (!weeklyStats[week]) weeklyStats[week] = { streams: 0, avgViewers: 0, totalDuration: 0, followers: 0, subs: 0 };
    if (!monthlyStats[month]) monthlyStats[month] = { streams: 0, avgViewers: 0, totalDuration: 0, peakViewers: 0, followers: 0, subs: 0 };

    weeklyStats[week].streams++;
    weeklyStats[week].avgViewers += (s.peakViewers || 0);
    weeklyStats[week].totalDuration += (s.durationMinutes || 0);
    weeklyStats[week].followers += (s.followers || s.newFollowers || 0);
    weeklyStats[week].subs += (s.subscribers || s.newSubs || 0);
    monthlyStats[month].streams++;
    monthlyStats[month].avgViewers += (s.peakViewers || 0);
    monthlyStats[month].totalDuration += (s.durationMinutes || 0);
    monthlyStats[month].peakViewers = Math.max(monthlyStats[month].peakViewers, s.peakViewers || 0);
    monthlyStats[month].followers += (s.followers || s.newFollowers || 0);
    monthlyStats[month].subs += (s.subscribers || s.newSubs || 0);

    dayOfWeekStats[dow].streams++;
    dayOfWeekStats[dow].viewers += (s.peakViewers || 0);
    dayOfWeekStats[dow].duration += (s.durationMinutes || 0);

    const hrs = (s.durationMinutes || 0) / 60;
    if (hrs < 1) durationBuckets['Under 1h']++;
    else if (hrs < 2) durationBuckets['1-2h']++;
    else if (hrs < 3) durationBuckets['2-3h']++;
    else if (hrs < 4) durationBuckets['3-4h']++;
    else if (hrs < 5) durationBuckets['4-5h']++;
    else durationBuckets['5h+']++;
  });

  Object.keys(weeklyStats).forEach(week => {
    weeklyStats[week].avgViewers = Math.round(weeklyStats[week].avgViewers / weeklyStats[week].streams);
  });
  Object.keys(monthlyStats).forEach(month => {
    monthlyStats[month].avgViewers = Math.round(monthlyStats[month].avgViewers / monthlyStats[month].streams);
  });

  // Stream frequency analysis
  const sortedDates = h.map(s => new Date(s.startedAt || s.date)).sort((a, b) => a - b);
  const gaps = [];
  for (let i = 1; i < sortedDates.length; i++) gaps.push((sortedDates[i] - sortedDates[i - 1]) / (1000 * 60 * 60 * 24));
  const avgGap = gaps.length > 0 ? (gaps.reduce((a, b) => a + b, 0) / gaps.length).toFixed(1) : '0.0';
  const longestGap = gaps.length > 0 ? Math.round(Math.max(...gaps)) : 0;
  const shortestGap = gaps.length > 0 ? Math.round(Math.min(...gaps)) : 0;

  // Viewer volatility index
  const viewers = h.map(s => s.peakViewers || 0);
  const viewerMean = viewers.length > 0 ? viewers.reduce((a, b) => a + b, 0) / viewers.length : 0;
  const viewerStd = Math.sqrt(viewers.reduce((s, v) => s + Math.pow(v - viewerMean, 2), 0) / (viewers.length || 1));
  const volatilityIndex = viewerMean > 0 ? ((viewerStd / viewerMean) * 100).toFixed(1) : '0.0';

  // Cumulative metrics
  let cumulativeViewers = 0;
  let cumulativeHours = 0;
  const sorted = h.slice().sort((a, b) => new Date(a.startedAt || a.date) - new Date(b.startedAt || b.date));

  // Month-over-month growth rates
  const monthEntries = Object.entries(monthlyStats);
  let momGrowthHtml = '';
  if (monthEntries.length >= 2) {
    for (let i = 1; i < Math.min(monthEntries.length, 6); i++) {
      const prev = monthEntries[i - 1][1].avgViewers;
      const curr = monthEntries[i][1].avgViewers;
      const growth = prev > 0 ? (((curr - prev) / prev) * 100).toFixed(1) : '0.0';
      const color = parseFloat(growth) >= 0 ? '#4caf50' : '#ef5350';
      momGrowthHtml += '<div style="display:flex;justify-content:space-between;padding:8px 12px;background:#26262c;border-radius:4px;margin-bottom:6px">' +
        '<span style="color:#b0b0b0;font-size:12px">' + monthEntries[i - 1][0] + ' → ' + monthEntries[i][0] + '</span>' +
        '<span style="color:' + color + ';font-weight:bold;font-size:13px">' + (parseFloat(growth) >= 0 ? '+' : '') + growth + '%</span></div>';
    }
  }

  // Weekend vs weekday
  const weekdayStreams = [1, 2, 3, 4, 5].reduce((s, d) => s + dayOfWeekStats[d].streams, 0);
  const weekendStreams = dayOfWeekStats[0].streams + dayOfWeekStats[6].streams;
  const weekdayAvg = weekdayStreams > 0 ? Math.round([1, 2, 3, 4, 5].reduce((s, d) => s + dayOfWeekStats[d].viewers, 0) / weekdayStreams) : 0;
  const weekendAvg = weekendStreams > 0 ? Math.round((dayOfWeekStats[0].viewers + dayOfWeekStats[6].viewers) / weekendStreams) : 0;

  // Streams per week over time
  const weekEntries = Object.entries(weeklyStats);
  const streamsPerWeekAvg = weekEntries.length > 0 ? (weekEntries.reduce((s, [, d]) => s + d.streams, 0) / weekEntries.length).toFixed(1) : '0.0';

  // Weekly HTML with progress bars
  let weeklyHtml = '';
  const weekSlice = weekEntries.slice(-6);
  const weekMax = Math.max(...weekSlice.map(([, d]) => d.avgViewers), 1);
  weekSlice.forEach(([week, data]) => {
    const pct = Math.round((data.avgViewers / weekMax) * 100);
    weeklyHtml += '<div style="padding:12px;background:#26262c;border-radius:6px;margin-bottom:8px">' +
      '<div style="display:flex;justify-content:space-between;margin-bottom:6px"><strong>' + week + '</strong><span style="color:#9146ff">' + data.avgViewers + ' avg</span></div>' +
      '<div style="background:#2b2d31;border-radius:3px;height:8px;overflow:hidden"><div style="background:linear-gradient(90deg,#9146ff,#ab47bc);height:100%;width:' + pct + '%;border-radius:3px"></div></div>' +
      '<div style="display:flex;justify-content:space-between;margin-top:4px;font-size:11px;color:#666"><span>' + data.streams + ' streams</span><span>' + Math.round(data.totalDuration / 60) + 'h | +' + data.followers + ' follows</span></div></div>';
  });

  // Monthly HTML with more details
  let monthlyHtml = '';
  monthEntries.slice(0, 6).forEach(([month, data]) => {
    monthlyHtml += '<div style="padding:12px;background:#26262c;border-radius:6px;margin-bottom:8px">' +
      '<div style="display:flex;justify-content:space-between"><strong>' + month + '</strong><span style="color:#4caf50">' + data.streams + ' streams</span></div>' +
      '<div style="display:flex;gap:12px;margin-top:6px;font-size:12px;color:#b0b0b0;flex-wrap:wrap">' +
      '<span>Avg: <strong style="color:#fff">' + data.avgViewers + '</strong></span>' +
      '<span>Peak: <strong style="color:#ff9800">' + data.peakViewers + '</strong></span>' +
      '<span>Hours: <strong style="color:#9146ff">' + (data.totalDuration / 60).toFixed(1) + '</strong></span>' +
      '<span>Follows: <strong style="color:#4caf50">' + data.followers + '</strong></span>' +
      '<span>Subs: <strong style="color:#ffd700">' + data.subs + '</strong></span></div></div>';
  });

  // Day of week chart
  const dowMax = Math.max(...Object.values(dayOfWeekStats).map(d => d.streams > 0 ? Math.round(d.viewers / d.streams) : 0), 1);
  let dowHtml = '';
  Object.values(dayOfWeekStats).forEach(d => {
    const avg = d.streams > 0 ? Math.round(d.viewers / d.streams) : 0;
    const pct = Math.round((avg / dowMax) * 100);
    const color = pct > 70 ? '#9146ff' : pct > 40 ? '#4caf50' : '#26262c';
    const avgDur = d.streams > 0 ? (d.duration / d.streams / 60).toFixed(1) : '0.0';
    dowHtml += '<div style="text-align:center;flex:1"><div style="height:80px;display:flex;align-items:flex-end;justify-content:center"><div style="width:100%;max-width:30px;background:' + color + ';height:' + Math.max(pct, 5) + '%;border-radius:3px 3px 0 0"></div></div>' +
      '<div style="font-size:11px;color:#b0b0b0;margin-top:4px">' + d.label + '</div><div style="font-size:10px;color:#666">' + avg + ' avg</div><div style="font-size:9px;color:#555">' + d.streams + ' str</div><div style="font-size:9px;color:#555">' + avgDur + 'h</div></div>';
  });

  // Duration distribution
  const durMax = Math.max(...Object.values(durationBuckets), 1);
  let durHtml = '';
  Object.entries(durationBuckets).forEach(([label, count]) => {
    const pct = Math.round((count / durMax) * 100);
    durHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="color:#b0b0b0;width:70px;font-size:12px">' + label + '</span>' +
      '<div style="flex:1;background:#2b2d31;border-radius:3px;height:20px;overflow:hidden"><div style="background:linear-gradient(90deg,#ff9800,#ffa726);height:100%;width:' + pct + '%;border-radius:3px;display:flex;align-items:center;padding-left:6px"><span style="font-size:10px;color:#fff;font-weight:bold">' + (count > 0 ? count : '') + '</span></div></div></div>';
  });

  // Viewer growth trendline
  let rollingAvgHtml = '';
  if (sorted.length >= 5) {
    const windowSize = Math.min(5, sorted.length);
    for (let i = windowSize - 1; i < sorted.length; i++) {
      let sum = 0;
      for (let j = i - windowSize + 1; j <= i; j++) sum += (sorted[j].peakViewers || 0);
      const avg = Math.round(sum / windowSize);
      const date = new Date(sorted[i].startedAt || sorted[i].date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      rollingAvgHtml += '<span style="font-size:11px;color:#b0b0b0;white-space:nowrap">' + date + ': <strong style="color:#9146ff">' + avg + '</strong></span> ';
    }
  }

  // Cumulative viewer chart data
  let cumulativeHtml = '';
  let cumV = 0, cumH = 0;
  const cumMax = sorted.reduce((s, x) => s + (x.peakViewers || 0), 0);
  sorted.forEach((s, i) => {
    cumV += (s.peakViewers || 0);
    cumH += ((s.durationMinutes || 0) / 60);
    if (i % Math.max(1, Math.floor(sorted.length / 10)) === 0 || i === sorted.length - 1) {
      const pct = cumMax > 0 ? Math.round((cumV / cumMax) * 100) : 0;
      const date = new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
      cumulativeHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">' +
        '<span style="color:#b0b0b0;width:60px;font-size:10px">' + date + '</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:14px;overflow:hidden"><div style="background:linear-gradient(90deg,#4caf50,#81c784);height:100%;width:' + pct + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:10px;min-width:40px;text-align:right">' + cumV + '</span></div>';
    }
  });

  return `
<div class="card">
  <h2>📊 Trends Analysis</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:15px 0">
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:10px">Avg Gap (Days)</div>
      <div style="font-size:20px;color:#9146ff;font-weight:bold">${avgGap}</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:10px">Longest Gap</div>
      <div style="font-size:20px;color:#ef5350;font-weight:bold">${longestGap}d</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:10px">Shortest Gap</div>
      <div style="font-size:20px;color:#4caf50;font-weight:bold">${shortestGap}d</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:10px">Volatility Index</div>
      <div style="font-size:20px;color:#ff9800;font-weight:bold">${volatilityIndex}%</div>
    </div>
    <div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:10px">Streams/Week Avg</div>
      <div style="font-size:20px;color:#00bcd4;font-weight:bold">${streamsPerWeekAvg}</div>
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0;font-size:14px">🔄 Weekend vs Weekday</h3>
  <div style="display:flex;gap:10px;margin-top:6px">
    <div style="background:#26262c;padding:8px 14px;border-radius:5px;flex:1;display:flex;align-items:center;gap:8px;border-left:3px solid #2196f3">
      <span style="color:#2196f3;font-size:18px;font-weight:bold">${weekdayAvg}</span>
      <span style="color:#b0b0b0;font-size:11px">Weekday avg <span style="color:#666">(${weekdayStreams} str)</span></span>
    </div>
    <div style="background:#26262c;padding:8px 14px;border-radius:5px;flex:1;display:flex;align-items:center;gap:8px;border-left:3px solid #e91e63">
      <span style="color:#e91e63;font-size:18px;font-weight:bold">${weekendAvg}</span>
      <span style="color:#b0b0b0;font-size:11px">Weekend avg <span style="color:#666">(${weekendStreams} str)</span></span>
    </div>
    <div style="background:#26262c;padding:8px 14px;border-radius:5px;display:flex;align-items:center">
      <span style="font-size:12px;color:${weekendAvg > weekdayAvg ? '#e91e63' : '#2196f3'};font-weight:bold">${weekendAvg > weekdayAvg ? '🎉 Weekends win' : '💼 Weekdays win'} ${weekendAvg > 0 && weekdayAvg > 0 ? '(+' + Math.round(Math.abs(weekendAvg - weekdayAvg) / Math.min(weekendAvg || 1, weekdayAvg || 1) * 100) + '%)' : ''}</span>
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <h3 style="margin-top:0">📅 Weekly Trends</h3>
      ${weeklyHtml || '<p style="color:#b0b0b0">No weekly data</p>'}
    </div>
    <div>
      <h3 style="margin-top:0">📆 Monthly Trends</h3>
      ${monthlyHtml || '<p style="color:#b0b0b0">No monthly data</p>'}
      ${momGrowthHtml ? '<h4 style="margin:12px 0 6px;color:#b0b0b0;font-size:12px">📈 Month-over-Month Growth</h4>' + momGrowthHtml : ''}
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">� Day-of-Week Performance</h3>
  <p style="color:#b0b0b0;font-size:11px;margin-bottom:8px">Average viewers by day of week (stream count & avg duration)</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:15px">
    <div>
      <div style="display:flex;gap:8px;padding:10px;background:#2b2d31;border-radius:6px">
        ${dowHtml}
      </div>
    </div>
    <div style="height:180px"><canvas id="trends-dow-chart"></canvas></div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">⏱️ Stream Duration Distribution</h3>
  <div style="margin-top:15px">
    ${durHtml}
  </div>
</div>



${cumulativeHtml ? '<div class="card" style="margin-top:15px"><h3 style="margin-top:0;font-size:14px">📊 Cumulative Viewers Over Time</h3><div style="margin-top:6px;max-height:150px;overflow-y:auto">' + cumulativeHtml + '</div></div>' : ''}

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">📉 Rolling Average & Viewer Trend</h3>
  <div style="height:220px;margin-top:10px"><canvas id="trends-rolling-chart"></canvas></div>
</div>



<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var trendData = ${JSON.stringify((() => {
    const s = sorted;
    const windowSize = Math.min(5, s.length);
    const rolling = [];
    for (let i = 0; i < s.length; i++) {
      if (i < windowSize - 1) { rolling.push(null); continue; }
      let sum = 0;
      for (let j = i - windowSize + 1; j <= i; j++) sum += (s[j].peakViewers || 0);
      rolling.push(Math.round(sum / windowSize));
    }
    return {
      labels: s.map(x => new Date(x.startedAt || x.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })),
      peak: s.map(x => x.peakViewers || 0),
      avg: s.map(x => x.avgViewers || x.averageViewers || 0),
      rolling: rolling,
      dow: Object.values(dayOfWeekStats).map(d => ({
        label: d.label,
        avgViewers: d.streams > 0 ? Math.round(d.viewers / d.streams) : 0,
        streams: d.streams,
        avgDuration: d.streams > 0 ? Math.round(d.duration / d.streams) : 0
      }))
    };
  })())};

  var rctx = document.getElementById('trends-rolling-chart');
  if (rctx && trendData.labels.length > 0) {
    new Chart(rctx, {
      type: 'line',
      data: {
        labels: trendData.labels,
        datasets: [{
          label: 'Peak Viewers',
          data: trendData.peak,
          borderColor: 'rgba(145,70,255,0.4)',
          backgroundColor: 'rgba(145,70,255,0.05)',
          fill: false,
          tension: 0.3,
          pointRadius: 3,
          borderWidth: 1
        },
        {
          label: 'Avg Viewers',
          data: trendData.avg,
          borderColor: 'rgba(76,175,80,0.5)',
          fill: false,
          tension: 0.3,
          pointRadius: 2,
          borderWidth: 1,
          borderDash: [3, 3]
        },
        {
          label: '5-Stream Rolling Avg',
          data: trendData.rolling,
          borderColor: '#ff9800',
          backgroundColor: 'rgba(255,152,0,0.1)',
          fill: true,
          tension: 0.4,
          pointRadius: 4,
          borderWidth: 3,
          pointBackgroundColor: '#ff9800',
          pointBorderColor: '#fff',
          pointBorderWidth: 2,
          spanGaps: true
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#8b8fa3', usePointStyle: true } } },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8fa3' } },
          x: { grid: { display: false }, ticks: { color: '#8b8fa3' } }
        }
      }
    });
  }

  var dctx = document.getElementById('trends-dow-chart');
  if (dctx && trendData.dow.length > 0) {
    var dowColors = ['#ef5350', '#ff9800', '#ffd700', '#4caf50', '#2196f3', '#9146ff', '#e91e63'];
    new Chart(dctx, {
      type: 'bar',
      data: {
        labels: trendData.dow.map(function(d) { return d.label; }),
        datasets: [{
          label: 'Avg Viewers',
          data: trendData.dow.map(function(d) { return d.avgViewers; }),
          backgroundColor: dowColors.map(function(c) { return c + 'aa'; }),
          borderColor: dowColors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { afterLabel: function(ctx) { var d = trendData.dow[ctx.dataIndex]; return d.streams + ' streams | ~' + Math.round(d.avgDuration/60) + 'h avg'; } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8fa3' } },
          x: { grid: { display: false }, ticks: { color: '#8b8fa3' } }
        }
      }
    });
  }
});
</script>
  `;
}

// NEW: Game Performance Tab
export function renderGamePerformanceTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  const gameStats = {};

  h.forEach(s => {
    const game = s.game || s.gameName || 'Unknown';
    if (!gameStats[game]) {
      gameStats[game] = { streams: 0, totalViewers: 0, peakViewers: 0, avgViewers: 0, totalDuration: 0, dates: [], followers: 0, subs: 0, bestSingleStream: 0 };
    }
    gameStats[game].streams++;
    gameStats[game].totalViewers += (s.peakViewers || 0);
    gameStats[game].peakViewers = Math.max(gameStats[game].peakViewers, s.peakViewers || 0);
    gameStats[game].totalDuration += (s.durationMinutes || 0);
    gameStats[game].dates.push(s.startedAt || s.date);
    gameStats[game].followers += (s.followers || s.newFollowers || 0);
    gameStats[game].subs += (s.subscribers || s.newSubs || 0);
    gameStats[game].bestSingleStream = Math.max(gameStats[game].bestSingleStream, s.peakViewers || 0);
  });

  Object.keys(gameStats).forEach(game => {
    gameStats[game].avgViewers = Math.round(gameStats[game].totalViewers / gameStats[game].streams);
  });

  const sortedGames = Object.entries(gameStats).sort((a, b) => b[1].avgViewers - a[1].avgViewers).slice(0, 15);
  const totalStreams = h.length || 1;
  const topViewerMax = sortedGames.length > 0 ? sortedGames[0][1].avgViewers : 1;

  // Viewers per hour by game
  const viewersPerHourByGame = sortedGames.map(([game, data]) => {
    const hours = data.totalDuration / 60;
    return [game, hours > 0 ? (data.totalViewers / hours).toFixed(1) : '0.0'];
  });

  // Game switching frequency
  let gameSwitches = 0;
  for (let i = 1; i < h.length; i++) {
    if ((h[i].game || h[i].gameName || 'Unknown') !== (h[i-1].game || h[i-1].gameName || 'Unknown')) gameSwitches++;
  }
  const switchRate = h.length > 1 ? ((gameSwitches / (h.length - 1)) * 100).toFixed(0) : '0';

  // Rising vs declining games (compare first half vs second half of streams)
  let risingGames = [];
  let decliningGames = [];
  Object.entries(gameStats).forEach(([game, data]) => {
    if (data.dates.length >= 4) {
      const sortedDates = [...data.dates].sort((a, b) => new Date(a) - new Date(b));
      const mid = Math.floor(sortedDates.length / 2);
      const earlyStreams = h.filter(s => {
        const g = s.game || s.gameName || 'Unknown';
        return g === game && sortedDates.slice(0, mid).includes(s.startedAt || s.date);
      });
      const lateStreams = h.filter(s => {
        const g = s.game || s.gameName || 'Unknown';
        return g === game && sortedDates.slice(mid).includes(s.startedAt || s.date);
      });
      const earlyAvg = earlyStreams.length > 0 ? earlyStreams.reduce((s, x) => s + (x.peakViewers || 0), 0) / earlyStreams.length : 0;
      const lateAvg = lateStreams.length > 0 ? lateStreams.reduce((s, x) => s + (x.peakViewers || 0), 0) / lateStreams.length : 0;
      if (lateAvg > earlyAvg * 1.15) risingGames.push([game, Math.round(((lateAvg - earlyAvg) / (earlyAvg || 1)) * 100)]);
      else if (lateAvg < earlyAvg * 0.85) decliningGames.push([game, Math.round(((lateAvg - earlyAvg) / (earlyAvg || 1)) * 100)]);
    }
  });

  // Table rows
  let gamesHtml = '';
  sortedGames.forEach(([game, data], idx) => {
    const sharePercent = Math.round((data.streams / totalStreams) * 100);
    const medal = idx === 0 ? '🥇' : idx === 1 ? '🥈' : idx === 2 ? '🥉' : (idx + 1).toString();
    const hours = (data.totalDuration / 60).toFixed(1);
    const vph = data.totalDuration > 0 ? (data.totalViewers / (data.totalDuration / 60)).toFixed(0) : '0';
    const lastPlayed = data.dates.length > 0 ? new Date(data.dates[data.dates.length - 1]).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
    const daysSince = data.dates.length > 0 ? Math.floor((Date.now() - new Date(data.dates[data.dates.length - 1]).getTime()) / (1000 * 60 * 60 * 24)) : 0;
    gamesHtml += '<tr style="transition:background 0.2s" onmouseenter="this.style.background=\'#2a2f3a\'" onmouseleave="this.style.background=\'transparent\'">' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a;text-align:center;font-size:16px">' + medal + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a;font-weight:bold">' + game + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a">' + data.streams + ' <span style="color:#666;font-size:11px">(' + sharePercent + '%)</span></td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a;color:#ff9800;font-weight:bold">' + data.peakViewers + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a;color:#9146ff;font-weight:bold">' + data.avgViewers + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a">' + hours + 'h</td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a;color:#26c6da;font-size:12px">' + vph + '/h</td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a;color:#4caf50;font-size:12px">+' + data.followers + '</td>' +
      '<td style="padding:10px;border-bottom:1px solid #2a2f3a;color:#666;font-size:12px">' + lastPlayed + ' <span style="font-size:10px">(' + daysSince + 'd ago)</span></td></tr>';
  });

  // Game share visual bars
  let gameShareHtml = '';
  sortedGames.slice(0, 8).forEach(([game, data]) => {
    const pct = Math.round((data.avgViewers / topViewerMax) * 100);
    const colors = ['#9146ff', '#4caf50', '#ff9800', '#2196f3', '#e91e63', '#00bcd4', '#ff5722', '#8bc34a'];
    const color = colors[sortedGames.findIndex(([g]) => g === game) % colors.length];
    gameShareHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="color:#b0b0b0;width:120px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + game + '</span>' +
      '<div style="flex:1;background:#2b2d31;border-radius:3px;height:22px;overflow:hidden"><div style="background:' + color + ';height:100%;width:' + pct + '%;border-radius:3px;display:flex;align-items:center;padding-left:6px"><span style="font-size:10px;color:#fff;font-weight:bold">' + data.avgViewers + ' avg</span></div></div></div>';
  });

  // Average duration per game bars
  let gameDurHtml = '';
  const durSorted = sortedGames.slice(0, 8).sort((a, b) => (b[1].totalDuration / b[1].streams) - (a[1].totalDuration / a[1].streams));
  const durMax = durSorted.length > 0 ? (durSorted[0][1].totalDuration / durSorted[0][1].streams) : 1;
  durSorted.forEach(([game, data]) => {
    const avgDur = data.totalDuration / data.streams;
    const pct = Math.round((avgDur / durMax) * 100);
    gameDurHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="color:#b0b0b0;width:120px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">' + game + '</span>' +
      '<div style="flex:1;background:#2b2d31;border-radius:3px;height:22px;overflow:hidden"><div style="background:linear-gradient(90deg,#00bcd4,#4dd0e1);height:100%;width:' + pct + '%;border-radius:3px;display:flex;align-items:center;padding-left:6px"><span style="font-size:10px;color:#fff;font-weight:bold">' + (avgDur / 60).toFixed(1) + 'h</span></div></div></div>';
  });

  // Category diversity index
  const uniqueGames = Object.keys(gameStats).length;
  const diversityRating = uniqueGames >= 10 ? '🌈 Highly Diverse' : uniqueGames >= 5 ? '🎯 Moderately Diverse' : uniqueGames >= 2 ? '📌 Focused' : '🎮 Specialist';

  // Top game dominance
  const topGameShare = sortedGames.length > 0 ? Math.round((sortedGames[0][1].streams / totalStreams) * 100) : 0;

  return `
<div class="card">
  <h2>🎮 Game Performance</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:15px 0">
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:11px">Unique Games</div>
      <div style="font-size:24px;color:#9146ff;font-weight:bold">${uniqueGames}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:11px">Top Game</div>
      <div style="font-size:14px;color:#4caf50;font-weight:bold;margin-top:4px">${sortedGames.length > 0 ? sortedGames[0][0] : 'N/A'}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:11px">Diversity</div>
      <div style="font-size:14px;color:#ff9800;font-weight:bold;margin-top:4px">${diversityRating}</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:11px">Switch Rate</div>
      <div style="font-size:24px;color:#e91e63;font-weight:bold">${switchRate}%</div>
    </div>
    <div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">
      <div style="color:#b0b0b0;font-size:11px">Top Game Share</div>
      <div style="font-size:24px;color:#2196f3;font-weight:bold">${topGameShare}%</div>
    </div>
  </div>

  <table style="width:100%;border-collapse:collapse;margin-top:15px;font-size:13px">
    <thead>
      <tr style="background:#26262c">
        <th style="padding:10px;text-align:center;width:35px">#</th>
        <th style="padding:10px;text-align:left">Game</th>
        <th style="padding:10px;text-align:left">Streams</th>
        <th style="padding:10px;text-align:left">Peak</th>
        <th style="padding:10px;text-align:left">Avg</th>
        <th style="padding:10px;text-align:left">Hours</th>
        <th style="padding:10px;text-align:left">V/Hr</th>
        <th style="padding:10px;text-align:left">Follows</th>
        <th style="padding:10px;text-align:left">Last</th>
      </tr>
    </thead>
    <tbody>
      ${gamesHtml || '<tr><td colspan="9" style="padding:20px;text-align:center;color:#b0b0b0">No game data yet</td></tr>'}
    </tbody>
  </table>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">📊 Viewer Share & Game Switching</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <div style="margin-bottom:6px;color:#b0b0b0;font-size:11px;font-weight:600">Avg Viewers by Game</div>
      ${gameShareHtml || '<div style="color:#b0b0b0;text-align:center;padding:20px">No data</div>'}
    </div>
    <div id="game-switch-placeholder"></div>
  </div>
</div>

${risingGames.length > 0 || decliningGames.length > 0 ? '<div class="card" style="margin-top:15px"><h3 style="margin-top:0">📈 Game Trends</h3><div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:10px">' +
  '<div><h4 style="color:#4caf50;margin:0 0 10px">Rising Games</h4>' + (risingGames.length > 0 ? risingGames.map(function(g) { return '<div style="background:#26262c;padding:10px;border-radius:4px;margin-bottom:6px;border-left:3px solid #4caf50"><span style="color:#fff">' + g[0] + '</span> <span style="color:#4caf50;font-weight:bold">+' + g[1] + '%</span></div>'; }).join('') : '<div style="color:#666;font-size:12px">No rising games detected</div>') + '</div>' +
  '<div><h4 style="color:#ef5350;margin:0 0 10px">Declining Games</h4>' + (decliningGames.length > 0 ? decliningGames.map(function(g) { return '<div style="background:#26262c;padding:10px;border-radius:4px;margin-bottom:6px;border-left:3px solid #ef5350"><span style="color:#fff">' + g[0] + '</span> <span style="color:#ef5350;font-weight:bold">' + g[1] + '%</span></div>'; }).join('') : '<div style="color:#666;font-size:12px">No declining games detected</div>') + '</div></div></div>' : ''}

${(function() {
  // Game switching analysis from gameSegments
  var switchStreams = 0;
  var singleGameStreams = 0;
  var totalSegments = 0;
  var switchPairs = {};
  
  h.forEach(function(s) {
    var segs = s.gameSegments;
    if (segs && segs.length > 0) {
      totalSegments += segs.length;
      if (segs.length > 1) {
        switchStreams++;
        for (var i = 0; i < segs.length - 1; i++) {
          var pair = (segs[i].game || 'Unknown') + ' → ' + (segs[i + 1].game || 'Unknown');
          switchPairs[pair] = (switchPairs[pair] || 0) + 1;
        }
      } else {
        singleGameStreams++;
      }
    } else {
      singleGameStreams++;
    }
  });
  
  var switchRate = h.length > 0 ? Math.round((switchStreams / h.length) * 100) : 0;
  var avgSegments = h.length > 0 ? (totalSegments / h.length).toFixed(1) : '0.0';
  
  // Compare viewers for switch vs single-game streams
  var switchViewers = h.filter(function(s) { return s.gameSegments && s.gameSegments.length > 1; });
  var singleViewers = h.filter(function(s) { return !s.gameSegments || s.gameSegments.length <= 1; });
  var switchAvg = switchViewers.length > 0 ? Math.round(switchViewers.reduce(function(sum, s) { return sum + (s.peakViewers || 0); }, 0) / switchViewers.length) : 0;
  var singleAvg = singleViewers.length > 0 ? Math.round(singleViewers.reduce(function(sum, s) { return sum + (s.peakViewers || 0); }, 0) / singleViewers.length) : 0;
  var switchImpact = switchAvg > singleAvg ? 'Game switching streams average <span style="color:#4caf50;font-weight:bold">' + switchAvg + '</span> viewers vs <span style="color:#ff9800;font-weight:bold">' + singleAvg + '</span> for single-game streams' :
    singleAvg > switchAvg ? 'Single-game streams average <span style="color:#4caf50;font-weight:bold">' + singleAvg + '</span> viewers vs <span style="color:#ff9800;font-weight:bold">' + switchAvg + '</span> for multi-game streams' :
    'No significant difference between single-game and multi-game streams';
  
  var topPairs = Object.entries(switchPairs).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 5);
  var pairsHtml = '';
  topPairs.forEach(function(p) {
    pairsHtml += '<div style="display:flex;align-items:center;gap:8px;padding:8px;background:#26262c;border-radius:4px;margin-bottom:4px">' +
      '<span style="color:#ce93d8;font-size:12px;flex:1">' + p[0] + '</span>' +
      '<span style="color:#fff;font-weight:bold;font-size:13px">' + p[1] + 'x</span></div>';
  });
  
  // Inject into the viewer share card's placeholder
  return '<script>document.addEventListener("DOMContentLoaded", function() {' +
    'var ph = document.getElementById("game-switch-placeholder");' +
    'if (ph) ph.innerHTML = \'' +
    '<div style="margin-bottom:6px;color:#b0b0b0;font-size:11px;font-weight:600">\ud83d\udd00 Game Switching</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">' +
      '<div style="background:#26262c;padding:8px;border-radius:5px;text-align:center;border-top:2px solid #9146ff">' +
        '<div style="color:#b0b0b0;font-size:10px">Switch Rate</div>' +
        '<div style="font-size:16px;color:#9146ff;font-weight:bold">' + switchRate + '%</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:8px;border-radius:5px;text-align:center;border-top:2px solid #ff9800">' +
        '<div style="color:#b0b0b0;font-size:10px">Avg Games/Stream</div>' +
        '<div style="font-size:16px;color:#ff9800;font-weight:bold">' + avgSegments + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="padding:8px;background:#26262c;border-radius:5px;border-left:3px solid #9146ff;margin-bottom:8px">' +
      '<div style="color:#b0b0b0;font-size:12px">' + switchImpact.replace(/'/g, "\\'") + '</div>' +
    '</div>' +
    (pairsHtml ? '<div style="color:#b0b0b0;font-size:10px;margin-bottom:4px">Common Switches:</div>' + pairsHtml.replace(/'/g, "\\'") : '') +
    '\';' +
    '});<\/script>';
})()}

<div class="card" style="margin-top:15px">
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div>
      <h3 style="margin-top:0">🍩 Time Distribution by Game</h3>
      <div style="height:250px"><canvas id="game-doughnut-chart"></canvas></div>
      <div style="margin-top:12px">
        <div style="color:#b0b0b0;font-size:11px;font-weight:600;margin-bottom:6px">⏱️ Avg Duration per Game</div>
        ${gameDurHtml || '<div style="color:#b0b0b0;text-align:center;padding:10px">No data</div>'}
      </div>
    </div>
    <div>
      <h3 style="margin-top:0">📊 Avg Viewers by Game</h3>
      <div style="height:250px"><canvas id="game-viewers-chart"></canvas></div>
    </div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var gameData = ${JSON.stringify(sortedGames.slice(0, 8).map(([game, data]) => ({
    game: game.length > 20 ? game.substring(0, 18) + '..' : game,
    duration: Math.round(data.totalDuration / 60 * 10) / 10,
    avgViewers: data.avgViewers,
    streams: data.streams,
    peakViewers: data.peakViewers
  })))};

  var gameColors = ['#9146ff', '#4caf50', '#ff9800', '#e91e63', '#2196f3', '#ffd700', '#00bcd4', '#ce93d8'];

  var gdc = document.getElementById('game-doughnut-chart');
  if (gdc && gameData.length > 0) {
    new Chart(gdc, {
      type: 'doughnut',
      data: {
        labels: gameData.map(function(g) { return g.game; }),
        datasets: [{
          data: gameData.map(function(g) { return g.duration; }),
          backgroundColor: gameColors.map(function(c) { return c + 'cc'; }),
          borderColor: gameColors,
          borderWidth: 2
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, position: 'right', labels: { color: '#8b8fa3', padding: 8, font: { size: 11 }, usePointStyle: true } },
          tooltip: { callbacks: { label: function(ctx) { return ctx.label + ': ' + ctx.raw + 'h (' + gameData[ctx.dataIndex].streams + ' streams)'; } } }
        }
      }
    });
  }

  var gvc = document.getElementById('game-viewers-chart');
  if (gvc && gameData.length > 0) {
    new Chart(gvc, {
      type: 'bar',
      data: {
        labels: gameData.map(function(g) { return g.game; }),
        datasets: [{
          label: 'Avg Viewers',
          data: gameData.map(function(g) { return g.avgViewers; }),
          backgroundColor: gameColors.map(function(c) { return c + 'aa'; }),
          borderColor: gameColors,
          borderWidth: 1,
          borderRadius: 4
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        indexAxis: 'y',
        plugins: {
          legend: { display: false },
          tooltip: { callbacks: { afterLabel: function(ctx) { var g = gameData[ctx.dataIndex]; return 'Peak: ' + g.peakViewers + ' | ' + g.streams + ' streams'; } } }
        },
        scales: {
          x: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#8b8fa3' } },
          y: { grid: { display: false }, ticks: { color: '#8b8fa3', font: { size: 11 } } }
        }
      }
    });
  }
});
</script>
  `;
}

// NEW: Viewer Patterns Tab
export function renderViewerPatternsTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  const hourStats = {};
  const dayHourStats = {};
  const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

  h.forEach(s => {
    const d = new Date(s.startedAt || s.date);
    const hour = d.getHours();
    const dow = d.getDay();
    const hourLabel = hour.toString().padStart(2, '0') + ':00';
    if (!hourStats[hour]) hourStats[hour] = { label: hourLabel, streams: 0, viewers: 0, duration: 0, followers: 0 };
    hourStats[hour].streams++;
    hourStats[hour].viewers += (s.peakViewers || 0);
    hourStats[hour].duration += (s.durationMinutes || 0);
    hourStats[hour].followers += (s.followers || s.newFollowers || 0);

    const key = dow + '-' + hour;
    if (!dayHourStats[key]) dayHourStats[key] = { streams: 0, viewers: 0 };
    dayHourStats[key].streams++;
    dayHourStats[key].viewers += (s.peakViewers || 0);
  });

  const hours = [];
  for (let i = 0; i < 24; i++) {
    const label = i.toString().padStart(2, '0') + ':00';
    hours.push({
      hour: i,
      label: label,
      streams: hourStats[i]?.streams || 0,
      avgViewers: hourStats[i] ? Math.round(hourStats[i].viewers / hourStats[i].streams) : 0,
      avgDuration: hourStats[i] ? Math.round(hourStats[i].duration / hourStats[i].streams) : 0,
      avgFollowers: hourStats[i] ? (hourStats[i].followers / hourStats[i].streams).toFixed(1) : '0.0'
    });
  }

  const maxViewers = Math.max(...hours.map(h => h.avgViewers), 1);

  // Weekend vs weekday viewer patterns
  const weekdayHours = {};
  const weekendHours = {};
  h.forEach(s => {
    const d = new Date(s.startedAt || s.date);
    const hour = d.getHours();
    const isWeekend = d.getDay() === 0 || d.getDay() === 6;
    const target = isWeekend ? weekendHours : weekdayHours;
    if (!target[hour]) target[hour] = { count: 0, viewers: 0 };
    target[hour].count++;
    target[hour].viewers += (s.peakViewers || 0);
  });

  // Viewer decay rate (avg vs peak ratio over stream length)
  const avgViewerRatio = h.length > 0 ? (h.reduce((s, x) => s + ((x.averageViewers || x.peakViewers || 0) / Math.max(x.peakViewers || 1, 1)), 0) / h.length * 100).toFixed(1) : '0.0';

  // Optimal stream length analysis
  const durationBuckets = {};
  h.forEach(s => {
    const hrs = Math.floor((s.durationMinutes || 0) / 60);
    const bucket = hrs + 'h';
    if (!durationBuckets[bucket]) durationBuckets[bucket] = { count: 0, viewers: 0, duration: 0 };
    durationBuckets[bucket].count++;
    durationBuckets[bucket].viewers += (s.peakViewers || 0);
    durationBuckets[bucket].duration += (s.durationMinutes || 0);
  });
  const optimalLength = Object.entries(durationBuckets).sort((a, b) => (b[1].viewers / b[1].count) - (a[1].viewers / a[1].count))[0];
  const optimalLengthLabel = optimalLength ? optimalLength[0] : 'N/A';
  const optimalLengthAvg = optimalLength ? Math.round(optimalLength[1].viewers / optimalLength[1].count) : 0;

  // Seasonal patterns (by month)
  const monthlyPatterns = {};
  h.forEach(s => {
    const month = new Date(s.startedAt || s.date).toLocaleString('default', { month: 'short' });
    if (!monthlyPatterns[month]) monthlyPatterns[month] = { count: 0, viewers: 0 };
    monthlyPatterns[month].count++;
    monthlyPatterns[month].viewers += (s.peakViewers || 0);
  });

  let seasonalHtml = '';
  const seasons = { 'Winter': ['Dec', 'Jan', 'Feb'], 'Spring': ['Mar', 'Apr', 'May'], 'Summer': ['Jun', 'Jul', 'Aug'], 'Fall': ['Sep', 'Oct', 'Nov'] };
  const seasonIcons = { 'Winter': '❄️', 'Spring': '🌸', 'Summer': '☀️', 'Fall': '🍂' };
  Object.entries(seasons).forEach(([season, months]) => {
    let totalV = 0, totalC = 0;
    months.forEach(m => { if (monthlyPatterns[m]) { totalV += monthlyPatterns[m].viewers; totalC += monthlyPatterns[m].count; } });
    const avg = totalC > 0 ? Math.round(totalV / totalC) : 0;
    seasonalHtml += '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="font-size:24px">' + seasonIcons[season] + '</div>' +
      '<div style="color:#b0b0b0;font-size:11px;margin-top:5px">' + season + '</div>' +
      '<div style="font-size:20px;color:#fff;font-weight:bold;margin-top:4px">' + avg + '</div>' +
      '<div style="color:#666;font-size:10px">' + totalC + ' streams</div></div>';
  });

  // Time-of-day heatmap
  let heatmapHtml = '';
  hours.forEach(h => {
    const percent = Math.round((h.avgViewers / maxViewers) * 100);
    const intensity = percent > 80 ? '#ef5350' : percent > 60 ? '#ff9800' : percent > 35 ? '#4caf50' : percent > 10 ? '#2e7d32' : '#26262c';
    const durLabel = h.avgDuration >= 60 ? (h.avgDuration / 60).toFixed(1) + 'h' : h.avgDuration + 'min';
    const hourNum = parseInt(h.label);
    const timeLabel = hourNum === 0 ? '12 AM' : hourNum < 12 ? hourNum + ' AM' : hourNum === 12 ? '12 PM' : (hourNum - 12) + ' PM';
    heatmapHtml += '<div style="background:' + intensity + ';padding:6px;border-radius:4px;text-align:center">' +
      '<div style="font-size:10px;color:#fff;font-weight:600">' + timeLabel + '</div>' +
      '<div style="font-weight:bold;color:#fff;font-size:14px">' + h.avgViewers + '</div>' +
      '<div style="font-size:9px;color:#ddd">' + h.streams + ' streams · ' + durLabel + '</div></div>';
  });

  // 7x24 day/hour heatmap grid
  let gridHtml = '<div style="display:grid;grid-template-columns:60px repeat(24, 1fr);gap:2px;font-size:10px">';
  gridHtml += '<div></div>';
  for (let hr = 0; hr < 24; hr++) {
    gridHtml += '<div style="text-align:center;color:#666;padding:2px">' + hr.toString().padStart(2, '0') + '</div>';
  }
  let globalMax = 1;
  for (let d = 0; d < 7; d++) {
    for (let hr = 0; hr < 24; hr++) {
      const k = d + '-' + hr;
      if (dayHourStats[k]) {
        const avg = Math.round(dayHourStats[k].viewers / dayHourStats[k].streams);
        globalMax = Math.max(globalMax, avg);
      }
    }
  }
  for (let d = 0; d < 7; d++) {
    gridHtml += '<div style="color:#b0b0b0;padding:4px;display:flex;align-items:center">' + dayNames[d] + '</div>';
    for (let hr = 0; hr < 24; hr++) {
      const k = d + '-' + hr;
      const data = dayHourStats[k];
      const avg = data ? Math.round(data.viewers / data.streams) : 0;
      const pct = Math.round((avg / globalMax) * 100);
      const opacity = pct > 0 ? Math.max(0.15, pct / 100) : 0.05;
      gridHtml += '<div style="background:rgba(145,70,255,' + opacity + ');border-radius:2px;padding:3px;text-align:center;color:' + (pct > 40 ? '#fff' : '#666') + '">' + (avg > 0 ? avg : '') + '</div>';
    }
  }
  gridHtml += '</div>';

  // Peak time identification
  const bestHour = hours.reduce((best, h) => h.avgViewers > best.avgViewers ? h : best, hours[0]);
  const worstHour = hours.filter(h => h.streams > 0).reduce((worst, h) => h.avgViewers < worst.avgViewers ? h : worst, hours.filter(h => h.streams > 0)[0] || hours[0]);
  const secondBestHour = hours.filter(h => h.hour !== bestHour.hour).reduce((best, h) => h.avgViewers > best.avgViewers ? h : best, hours[0]);

  // Time distribution: morning/afternoon/evening/night
  const timeSlots = { 'Morning (6-12)': { streams: 0, viewers: 0 }, 'Afternoon (12-18)': { streams: 0, viewers: 0 }, 'Evening (18-24)': { streams: 0, viewers: 0 }, 'Night (0-6)': { streams: 0, viewers: 0 } };
  hours.forEach(h => {
    const slot = h.hour < 6 ? 'Night (0-6)' : h.hour < 12 ? 'Morning (6-12)' : h.hour < 18 ? 'Afternoon (12-18)' : 'Evening (18-24)';
    timeSlots[slot].streams += h.streams;
    timeSlots[slot].viewers += (h.avgViewers * h.streams);
  });
  let timeSlotsHtml = '';
  const slotColors = { 'Morning (6-12)': '#ff9800', 'Afternoon (12-18)': '#fdd835', 'Evening (18-24)': '#9146ff', 'Night (0-6)': '#2196f3' };
  const slotIcons = { 'Morning (6-12)': '🌅', 'Afternoon (12-18)': '☀️', 'Evening (18-24)': '🌆', 'Night (0-6)': '🌙' };
  Object.entries(timeSlots).forEach(([slot, data]) => {
    const avg = data.streams > 0 ? Math.round(data.viewers / data.streams) : 0;
    timeSlotsHtml += '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid ' + slotColors[slot] + '">' +
      '<div style="font-size:24px">' + slotIcons[slot] + '</div>' +
      '<div style="color:#b0b0b0;font-size:11px;margin-top:5px">' + slot + '</div>' +
      '<div style="font-size:20px;color:#fff;font-weight:bold;margin-top:4px">' + avg + '</div>' +
      '<div style="color:#666;font-size:10px">' + data.streams + ' streams</div></div>';
  });

  // Viewership consistency over time (5 segments instead of 3)
  const sorted = h.slice().sort((a, b) => new Date(a.startedAt || a.date) - new Date(b.startedAt || b.date));
  let consistencyHtml = '';
  if (sorted.length >= 5) {
    const segSize = Math.ceil(sorted.length / 5);
    const labels = ['Start', 'Early', 'Mid', 'Late', 'Recent'];
    const colors = ['#666', '#ff9800', '#fdd835', '#8bc34a', '#4caf50'];
    for (let i = 0; i < 5; i++) {
      const seg = sorted.slice(i * segSize, (i + 1) * segSize);
      const avg = seg.length > 0 ? Math.round(seg.reduce((s, x) => s + (x.peakViewers || 0), 0) / seg.length) : 0;
      consistencyHtml += '<div style="flex:1;text-align:center;padding:12px;background:#26262c;border-radius:6px">' +
        '<div style="color:#b0b0b0;font-size:10px">' + labels[i] + '</div>' +
        '<div style="font-size:18px;color:' + colors[i] + ';font-weight:bold;margin-top:4px">' + avg + '</div>' +
        '<div style="font-size:9px;color:#666">' + seg.length + ' str</div></div>';
    }
  } else if (sorted.length >= 3) {
    const thirds = [sorted.slice(0, Math.ceil(sorted.length / 3)), sorted.slice(Math.ceil(sorted.length / 3), Math.ceil(sorted.length * 2 / 3)), sorted.slice(Math.ceil(sorted.length * 2 / 3))];
    const labels = ['Early', 'Mid', 'Recent'];
    thirds.forEach((third, idx) => {
      const avg = third.length > 0 ? Math.round(third.reduce((s, x) => s + (x.peakViewers || 0), 0) / third.length) : 0;
      const color = idx === 2 ? '#4caf50' : idx === 1 ? '#ff9800' : '#666';
      consistencyHtml += '<div style="flex:1;text-align:center;padding:15px;background:#26262c;border-radius:6px">' +
        '<div style="color:#b0b0b0;font-size:11px">' + labels[idx] + ' Period</div>' +
        '<div style="font-size:22px;color:' + color + ';font-weight:bold;margin-top:5px">' + avg + '</div>' +
        '<div style="font-size:10px;color:#666">' + third.length + ' streams</div></div>';
    });
  }

  return `
<div class="card">
  <h2>👀 Viewer Patterns</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin:15px 0">
    <div style="background:#26262c;padding:10px;border-radius:6px;text-align:center;border-left:3px solid #ff9800">
      <div style="color:#b0b0b0;font-size:10px">Retention Rate</div>
      <div style="font-size:20px;color:#ff9800;font-weight:bold">${avgViewerRatio}%</div>
      <div style="font-size:10px;color:#666">avg/peak ratio</div>
    </div>
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">🕐 Hourly Heatmap</h3>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 10px">
    <div style="display:inline-flex;align-items:center;gap:6px;background:#26262c;padding:6px 12px;border-radius:5px;border-left:3px solid #4caf50">
      <span style="color:#4caf50;font-weight:bold;font-size:14px">${bestHour.label}</span>
      <span style="color:#b0b0b0;font-size:11px">Best (${bestHour.avgViewers} avg)</span>
    </div>
    <div style="display:inline-flex;align-items:center;gap:6px;background:#26262c;padding:6px 12px;border-radius:5px;border-left:3px solid #2196f3">
      <span style="color:#2196f3;font-weight:bold;font-size:14px">${secondBestHour.label}</span>
      <span style="color:#b0b0b0;font-size:11px">2nd Best (${secondBestHour.avgViewers} avg)</span>
    </div>
    <div style="display:inline-flex;align-items:center;gap:6px;background:#26262c;padding:6px 12px;border-radius:5px;border-left:3px solid #ef5350">
      <span style="color:#ef5350;font-weight:bold;font-size:14px">${worstHour.label}</span>
      <span style="color:#b0b0b0;font-size:11px">Avoid (${worstHour.avgViewers} avg)</span>
    </div>
    <div style="display:inline-flex;align-items:center;gap:6px;background:#26262c;padding:6px 12px;border-radius:5px;border-left:3px solid #9146ff">
      <span style="color:#9146ff;font-weight:bold;font-size:14px">${optimalLengthLabel}</span>
      <span style="color:#b0b0b0;font-size:11px">Optimal Length (${optimalLengthAvg} avg)</span>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(55px,1fr));gap:4px;margin-top:10px">
    ${heatmapHtml}
  </div>
</div>

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">🕰️ Time of Day & Seasonal Performance</h3>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:10px">
    ${timeSlotsHtml}
  </div>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px;margin-top:12px">
    ${seasonalHtml}
  </div>
</div>

${consistencyHtml ? `
<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">📊 Viewer Growth Over Time</h3>
  <p style="color:#666;font-size:11px;margin-bottom:10px">Comparing viewer averages across stream history segments</p>
  <div style="display:flex;gap:10px">
    ${consistencyHtml}
  </div>
</div>` : ''}

${(function() {
  var hm = activityHeatmap || {};
  var keys = Object.keys(hm);
  if (keys.length < 5) return '';
  
  // Build a calendar-style heatmap
  var dates = {};
  keys.forEach(function(k) {
    var parts = k.split('_');
    var date = parts[0];
    var hour = parseInt(parts[1]);
    if (!dates[date]) dates[date] = {};
    var values = hm[k];
    var avg = Array.isArray(values) && values.length > 0 ? Math.round(values.reduce(function(a, b) { return a + b; }, 0) / values.length) : 0;
    dates[date][hour] = avg;
  });
  
  var sortedDates = Object.keys(dates).sort();
  var allAvgs = [];
  keys.forEach(function(k) {
    var values = hm[k];
    if (Array.isArray(values) && values.length > 0) {
      allAvgs.push(Math.round(values.reduce(function(a, b) { return a + b; }, 0) / values.length));
    }
  });
  var maxAvg = Math.max.apply(null, allAvgs.concat([1]));
  
  var activeHours = [];
  for (var ah = 0; ah < 24; ah++) {
    var hasData = keys.some(function(k) { return parseInt(k.split('_')[1]) === ah; });
    if (hasData) activeHours.push(ah);
  }
  
  // Summary stats
  var totalHoursTracked = keys.length;
  var trackDays = sortedDates.length;
  var peakEntry = keys.reduce(function(best, k) {
    var values = hm[k];
    var avg = Array.isArray(values) && values.length > 0 ? Math.round(values.reduce(function(a, b) { return a + b; }, 0) / values.length) : 0;
    return avg > best.avg ? { key: k, avg: avg } : best;
  }, { key: '', avg: 0 });
  var peakDate = peakEntry.key.split('_')[0] || '';
  var peakHour = parseInt(peakEntry.key.split('_')[1] || '0');
  var peakHourLabel = peakHour > 12 ? (peakHour - 12) + ':00 PM' : peakHour === 0 ? '12:00 AM' : peakHour + ':00 AM';
  
  // Build combined Day x Hour grid with real data overlay
  var comboGrid = '<div style="overflow-x:auto"><div style="display:grid;grid-template-columns:60px repeat(24, 1fr);gap:2px;font-size:10px">';
  comboGrid += '<div></div>';
  for (var hr2 = 0; hr2 < 24; hr2++) {
    var tl = hr2 === 0 ? '12a' : hr2 < 12 ? hr2 + 'a' : hr2 === 12 ? '12p' : (hr2 - 12) + 'p';
    comboGrid += '<div style="text-align:center;color:#8b8fa3;padding:2px;font-weight:600">' + tl + '</div>';
  }
  // Day-of-week rows from dayHourStats (historical avg)
  var dayNamesLocal = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  for (var d2 = 0; d2 < 7; d2++) {
    comboGrid += '<div style="color:#b0b0b0;padding:4px;display:flex;align-items:center;font-weight:600">' + dayNamesLocal[d2] + '</div>';
    for (var hr3 = 0; hr3 < 24; hr3++) {
      var kk = d2 + '-' + hr3;
      var dd = dayHourStats[kk];
      var avgVal = dd ? Math.round(dd.viewers / dd.streams) : 0;
      var pctVal = globalMax > 0 ? Math.round((avgVal / globalMax) * 100) : 0;
      var opac = pctVal > 0 ? Math.max(0.15, pctVal / 100) : 0.05;
      comboGrid += '<div style="background:rgba(145,70,255,' + opac + ');border-radius:2px;padding:3px;text-align:center;color:' + (pctVal > 40 ? '#fff' : '#666') + '">' + (avgVal > 0 ? avgVal : '') + '</div>';
    }
  }
  comboGrid += '</div></div>';
  
  // Real data date rows
  var realGridHtml = '<div style="overflow-x:auto;margin-top:12px"><table style="border-collapse:collapse;width:100%">';
  realGridHtml += '<thead><tr><th style="padding:4px 8px;font-size:10px;color:#8b8fa3;text-align:left;font-weight:600">Date</th>';
  activeHours.forEach(function(hr) {
    var label = hr === 0 ? '12a' : hr < 12 ? hr + 'a' : hr === 12 ? '12p' : (hr - 12) + 'p';
    realGridHtml += '<th style="padding:4px;font-size:10px;color:#8b8fa3;text-align:center;font-weight:600">' + label + '</th>';
  });
  realGridHtml += '</tr></thead><tbody>';
  
  sortedDates.slice(-20).forEach(function(date) {
    var day = new Date(date + 'T12:00:00Z');
    var dayLabel = day.toLocaleDateString('en-US', { month: 'short', day: 'numeric', weekday: 'short' });
    realGridHtml += '<tr><td style="padding:3px 8px;font-size:11px;color:#b0b0b0;white-space:nowrap;font-weight:500">' + dayLabel + '</td>';
    activeHours.forEach(function(hr) {
      var val = dates[date] && dates[date][hr] !== undefined ? dates[date][hr] : -1;
      var bg, txt;
      if (val < 0) {
        bg = '#2b2d31'; txt = '';
      } else {
        var intensity = Math.round((val / maxAvg) * 100);
        if (intensity >= 80) { bg = '#9146ff'; txt = val; }
        else if (intensity >= 60) { bg = '#7b3fd4'; txt = val; }
        else if (intensity >= 40) { bg = '#5c2fa0'; txt = val; }
        else if (intensity >= 20) { bg = '#3d1f6d'; txt = val; }
        else { bg = '#2a1540'; txt = val; }
      }
      realGridHtml += '<td style="padding:2px;text-align:center;background:' + bg + ';border:1px solid #111;min-width:28px"><span style="font-size:10px;color:#fff;font-weight:bold">' + txt + '</span></td>';
    });
    realGridHtml += '</tr>';
  });
  realGridHtml += '</tbody></table></div>';
  
  return '<div class="card" style="margin-top:15px">' +
    '<h3 style="margin-top:0">🗓️ Activity Heatmap & Day x Hour Matrix</h3>' +
    '<p style="color:#8b8fa3;font-size:11px;margin-bottom:10px">Viewer averages by day of week (top) and real per-date data from ' + trackDays + ' stream days (' + totalHoursTracked + ' snapshots). Brighter = more viewers.</p>' +
    '<div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:12px">' +
      '<div style="background:#26262c;padding:8px 14px;border-radius:5px;display:flex;align-items:center;gap:6px"><span style="color:#9146ff;font-weight:bold;font-size:16px">' + trackDays + '</span><span style="color:#b0b0b0;font-size:11px">Days Tracked</span></div>' +
      '<div style="background:#26262c;padding:8px 14px;border-radius:5px;display:flex;align-items:center;gap:6px"><span style="color:#2196f3;font-weight:bold;font-size:16px">' + totalHoursTracked + '</span><span style="color:#b0b0b0;font-size:11px">Snapshots</span></div>' +
      '<div style="background:#26262c;padding:8px 14px;border-radius:5px;display:flex;align-items:center;gap:6px"><span style="color:#ffd700;font-weight:bold;font-size:13px">' + peakDate + ' ' + peakHourLabel + '</span><span style="color:#b0b0b0;font-size:11px">Peak (' + peakEntry.avg + ' avg)</span></div>' +
    '</div>' +
    '<div style="margin-bottom:6px;color:#b0b0b0;font-size:11px;font-weight:600">📅 Avg by Day of Week</div>' +
    comboGrid +
    '<div style="margin-top:14px;margin-bottom:6px;color:#b0b0b0;font-size:11px;font-weight:600">📊 Real Viewer Data (Last 20 Sessions)</div>' +
    realGridHtml +
    '<div style="display:flex;gap:6px;align-items:center;margin-top:8px;justify-content:flex-end">' +
      '<span style="font-size:10px;color:#666">Low</span>' +
      '<div style="width:16px;height:12px;background:#2a1540;border-radius:2px"></div>' +
      '<div style="width:16px;height:12px;background:#3d1f6d;border-radius:2px"></div>' +
      '<div style="width:16px;height:12px;background:#5c2fa0;border-radius:2px"></div>' +
      '<div style="width:16px;height:12px;background:#7b3fd4;border-radius:2px"></div>' +
      '<div style="width:16px;height:12px;background:#9146ff;border-radius:2px"></div>' +
      '<span style="font-size:10px;color:#666">High</span>' +
    '</div>' +
  '</div>';
})()}

<div class="card" style="margin-top:15px">
  <h3 style="margin-top:0">📊 Avg Viewers by Hour & Radar</h3>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">
    <div style="height:220px"><canvas id="hourly-viewers-chart"></canvas></div>
    <div style="height:220px"><canvas id="hourly-radar-chart"></canvas></div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
<script>
document.addEventListener('DOMContentLoaded', function() {
  var hourlyData = ${JSON.stringify(hours.filter(h => h.streams > 0).map(h => ({
    label: h.label,
    avgViewers: h.avgViewers,
    streams: h.streams,
    avgDuration: h.avgDuration
  })))};

  var hctx = document.getElementById('hourly-viewers-chart');
  if (hctx && hourlyData.length > 0) {
    new Chart(hctx, {
      type: 'bar',
      data: {
        labels: hourlyData.map(function(d) { return d.label; }),
        datasets: [{
          label: 'Avg Viewers',
          data: hourlyData.map(function(d) { return d.avgViewers; }),
          backgroundColor: hourlyData.map(function(d) {
            var ratio = d.avgViewers / Math.max.apply(null, hourlyData.map(function(x) { return x.avgViewers; }));
            return 'rgba(145, 70, 255, ' + (0.3 + ratio * 0.7) + ')';
          }),
          borderColor: '#9146ff',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y'
        },
        {
          label: 'Stream Count',
          data: hourlyData.map(function(d) { return d.streams; }),
          backgroundColor: 'rgba(76, 175, 80, 0.35)',
          borderColor: '#4caf50',
          borderWidth: 1,
          borderRadius: 4,
          yAxisID: 'y1'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: true, labels: { color: '#8b8fa3', usePointStyle: true, font: { size: 10 } } },
          tooltip: { callbacks: { afterLabel: function(ctx) { var d = hourlyData[ctx.dataIndex]; return d.streams + ' streams | ~' + d.avgDuration + 'min avg'; } } }
        },
        scales: {
          y: { beginAtZero: true, grid: { color: 'rgba(255,255,255,0.05)' }, ticks: { color: '#9146ff' }, title: { display: true, text: 'Avg Viewers', color: '#9146ff', font: { size: 10 } } },
          y1: { beginAtZero: true, position: 'right', grid: { drawOnChartArea: false }, ticks: { color: '#4caf50', stepSize: 1 }, title: { display: true, text: 'Streams', color: '#4caf50', font: { size: 10 } } },
          x: { grid: { display: false }, ticks: { color: '#8b8fa3', font: { size: 9 } } }
        }
      }
    });
  }

  var rctx = document.getElementById('hourly-radar-chart');
  if (rctx && hourlyData.length >= 3) {
    new Chart(rctx, {
      type: 'radar',
      data: {
        labels: hourlyData.map(function(d) { return d.label; }),
        datasets: [{
          label: 'Avg Viewers',
          data: hourlyData.map(function(d) { return d.avgViewers; }),
          borderColor: '#9146ff',
          backgroundColor: 'rgba(145,70,255,0.2)',
          pointBackgroundColor: '#9146ff',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 3,
          borderWidth: 2
        },
        {
          label: 'Stream Count',
          data: hourlyData.map(function(d) { return d.streams; }),
          borderColor: '#4caf50',
          backgroundColor: 'rgba(76,175,80,0.1)',
          pointBackgroundColor: '#4caf50',
          pointBorderColor: '#fff',
          pointBorderWidth: 1,
          pointRadius: 2,
          borderWidth: 2,
          borderDash: [4, 4]
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: { legend: { display: true, labels: { color: '#8b8fa3', usePointStyle: true, font: { size: 10 } } } },
        scales: {
          r: {
            angleLines: { color: 'rgba(255,255,255,0.1)' },
            grid: { color: 'rgba(255,255,255,0.08)' },
            pointLabels: { color: '#8b8fa3', font: { size: 9 } },
            ticks: { color: '#666', backdropColor: 'transparent' },
            beginAtZero: true
          }
        }
      }
    });
  }
});
</script>
  `;
}

// NEW: AI Insights Tab
export function renderAIInsightsTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  if (h.length === 0) {
    return '<div class="card"><h2>🤖 AI Insights</h2><p style="color:#b0b0b0">Stream some content first to see AI insights!</p></div>';
  }

  const recent5 = h.slice(-Math.min(5, h.length));
  const recent5Avg = Math.round(recent5.reduce((sum, s) => sum + (s.peakViewers || 0), 0) / recent5.length);
  const older5 = h.length > 5 ? h.slice(-10, -5) : [];
  const older5Avg = older5.length > 0 ? Math.round(older5.reduce((sum, s) => sum + (s.peakViewers || 0), 0) / older5.length) : recent5Avg;

  const momentum = recent5Avg > older5Avg ? '📈 Growing' : recent5Avg < older5Avg ? '📉 Declining' : '➡️ Stable';
  const momentumPct = older5Avg > 0 ? (((recent5Avg - older5Avg) / older5Avg) * 100).toFixed(1) : '0.0';

  // Game analysis (avg peak per game)
  const topGameData = {};
  h.forEach(s => {
    const game = s.game || s.gameName || 'Unknown';
    if (!topGameData[game]) topGameData[game] = { total: 0, count: 0, maxPeak: 0 };
    topGameData[game].total += (s.peakViewers || 0);
    topGameData[game].count++;
    topGameData[game].maxPeak = Math.max(topGameData[game].maxPeak, s.peakViewers || 0);
  });
  const bestGame = Object.entries(topGameData).map(([g, d]) => [g, Math.round(d.total / d.count), d.maxPeak]).sort((a, b) => b[1] - a[1])[0];
  const worstGame = Object.entries(topGameData).map(([g, d]) => [g, Math.round(d.total / d.count)]).sort((a, b) => a[1] - b[1])[0];

  // Best stream time analysis
  const hourBuckets = {};
  h.forEach(s => {
    const hr = new Date(s.startedAt || s.date).getHours();
    if (!hourBuckets[hr]) hourBuckets[hr] = { total: 0, count: 0 };
    hourBuckets[hr].total += (s.peakViewers || 0);
    hourBuckets[hr].count++;
  });
  const bestHourEntry = Object.entries(hourBuckets).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];
  const bestHour = bestHourEntry ? parseInt(bestHourEntry[0]) : 20;
  const bestHourAvg = bestHourEntry ? Math.round(bestHourEntry[1].total / bestHourEntry[1].count) : 0;
  const bestHourLabel = bestHour.toString().padStart(2, '0') + ':00';

  // Duration vs viewership correlation
  const withDuration = h.filter(s => s.durationMinutes > 0);
  let durationCorrelation = 'No data';
  if (withDuration.length >= 3) {
    const shortStreams = withDuration.filter(s => s.durationMinutes < 120);
    const longStreams = withDuration.filter(s => s.durationMinutes >= 120);
    const shortAvg = shortStreams.length > 0 ? Math.round(shortStreams.reduce((s, x) => s + (x.peakViewers || 0), 0) / shortStreams.length) : 0;
    const longAvg = longStreams.length > 0 ? Math.round(longStreams.reduce((s, x) => s + (x.peakViewers || 0), 0) / longStreams.length) : 0;
    durationCorrelation = longAvg > shortAvg ? 'Longer streams perform better (avg ' + longAvg + ' vs ' + shortAvg + ')' :
                          shortAvg > longAvg ? 'Shorter streams perform better (avg ' + shortAvg + ' vs ' + longAvg + ')' :
                          'Stream length has no notable impact';
  }

  // Consistency score
  const viewers = h.map(s => s.peakViewers || 0);
  const mean = viewers.reduce((a, b) => a + b, 0) / viewers.length;
  const std = Math.sqrt(viewers.reduce((sum, v) => sum + Math.pow(v - mean, 2), 0) / viewers.length);
  const cv = mean > 0 ? (std / mean) : 0;
  const consistencyLabel = cv < 0.2 ? '🟢 Very Consistent' : cv < 0.4 ? '🟡 Moderate' : cv < 0.6 ? '🟠 Variable' : '🔴 Highly Variable';

  // Predicted next stream viewers (simple linear regression on last 10)
  const last10 = h.slice(-Math.min(10, h.length));
  let predictedViewers = mean;
  let predSlope = 0;
  if (last10.length >= 3) {
    const xMean = (last10.length - 1) / 2;
    const yMean = last10.reduce((s, x) => s + (x.peakViewers || 0), 0) / last10.length;
    let num = 0, den = 0;
    last10.forEach((s, i) => { num += (i - xMean) * ((s.peakViewers || 0) - yMean); den += Math.pow(i - xMean, 2); });
    predSlope = den > 0 ? num / den : 0;
    predictedViewers = Math.max(0, Math.round(yMean + predSlope * last10.length));
  }

  // Prediction confidence interval
  const predResiduals = last10.map((s, i) => {
    const yMean2 = last10.reduce((sm, x) => sm + (x.peakViewers || 0), 0) / last10.length;
    const predicted = yMean2 + predSlope * (i - (last10.length - 1) / 2);
    return Math.pow((s.peakViewers || 0) - predicted, 2);
  });
  const predStdErr = Math.sqrt(predResiduals.reduce((a, b) => a + b, 0) / Math.max(1, predResiduals.length - 2));
  const predLow = Math.max(0, Math.round(predictedViewers - 1.96 * predStdErr));
  const predHigh = Math.round(predictedViewers + 1.96 * predStdErr);

  // Day of week recommendation
  const dowStats = {};
  const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
  h.forEach(s => {
    const dow = new Date(s.startedAt || s.date).getDay();
    if (!dowStats[dow]) dowStats[dow] = { total: 0, count: 0 };
    dowStats[dow].total += (s.peakViewers || 0);
    dowStats[dow].count++;
  });
  const bestDow = Object.entries(dowStats).sort((a, b) => (b[1].total / b[1].count) - (a[1].total / a[1].count))[0];
  const bestDayName = bestDow ? dayNames[parseInt(bestDow[0])] : 'N/A';
  const bestDayAvg = bestDow ? Math.round(bestDow[1].total / bestDow[1].count) : 0;

  // Stream health score (weighted composite)
  const healthGrowth = parseFloat(momentumPct) > 0 ? 25 : parseFloat(momentumPct) > -10 ? 15 : 5;
  const healthConsistency = cv < 0.3 ? 25 : cv < 0.5 ? 15 : 5;
  const healthActivity = h.length >= 20 ? 25 : h.length >= 10 ? 15 : 5;
  const healthEngagement = mean > 50 ? 25 : mean > 20 ? 15 : 5;
  const healthScore = healthGrowth + healthConsistency + healthActivity + healthEngagement;
  const healthLabel = healthScore >= 80 ? '🌟 Excellent' : healthScore >= 60 ? '✅ Good' : healthScore >= 40 ? '⚠️ Fair' : '🔻 Needs Work';
  const healthColor = healthScore >= 80 ? '#4caf50' : healthScore >= 60 ? '#8bc34a' : healthScore >= 40 ? '#ff9800' : '#ef5350';

  // --- NEW: Burnout Risk Assessment ---
  const gaps = [];
  for (let i = 0; i < h.length - 1; i++) {
    const d1 = new Date(h[i].startedAt || h[i].date).getTime();
    const d2 = new Date(h[i + 1].startedAt || h[i + 1].date).getTime();
    gaps.push(Math.abs(d1 - d2) / (1000 * 60 * 60 * 24));
  }
  const avgGap = gaps.length > 0 ? gaps.reduce((a, b) => a + b, 0) / gaps.length : 0;
  const recentGaps = gaps.slice(-Math.min(3, gaps.length));
  const recentAvgGap = recentGaps.length > 0 ? recentGaps.reduce((a, b) => a + b, 0) / recentGaps.length : 0;
  const recentDurations = h.slice(-Math.min(5, h.length)).map(s => s.durationMinutes || 0);
  const recentAvgDur = recentDurations.length > 0 ? recentDurations.reduce((a, b) => a + b, 0) / recentDurations.length : 0;
  const olderDurations = h.length > 5 ? h.slice(-10, -5).map(s => s.durationMinutes || 0) : [];
  const olderAvgDur = olderDurations.length > 0 ? olderDurations.reduce((a, b) => a + b, 0) / olderDurations.length : recentAvgDur;
  let burnoutScore = 0;
  if (recentAvgGap > avgGap * 1.5 && avgGap > 0) burnoutScore += 30; // streaming less frequently
  if (recentAvgDur < olderAvgDur * 0.8 && olderAvgDur > 0) burnoutScore += 25; // shorter streams
  if (parseFloat(momentumPct) < -15) burnoutScore += 25; // declining viewers
  if (recentAvgGap > 7) burnoutScore += 20; // big gaps
  burnoutScore = Math.min(100, burnoutScore);
  const burnoutLabel = burnoutScore >= 70 ? '🔴 High Risk' : burnoutScore >= 40 ? '🟠 Moderate' : burnoutScore >= 15 ? '🟡 Low' : '🟢 Healthy';
  const burnoutColor = burnoutScore >= 70 ? '#ef5350' : burnoutScore >= 40 ? '#ff9800' : burnoutScore >= 15 ? '#ffd700' : '#4caf50';

  // --- NEW: Schedule Adherence Score ---
  const streamDows = h.map(s => new Date(s.startedAt || s.date).getDay());
  const dowFreq = {};
  streamDows.forEach(d => { dowFreq[d] = (dowFreq[d] || 0) + 1; });
  const maxDowCount = Math.max(...Object.values(dowFreq), 1);
  const scheduleDays = Object.keys(dowFreq).filter(d => dowFreq[d] >= maxDowCount * 0.5).length;
  const scheduleAdherence = h.length >= 4 ? Math.min(100, Math.round((scheduleDays <= 3 ? 80 : 50) + (gaps.length > 0 ? Math.max(0, 20 - (Math.sqrt(gaps.reduce((s, g) => s + Math.pow(g - avgGap, 2), 0) / Math.max(1, gaps.length)) * 3)) : 0))) : 0;
  const scheduleLabel = scheduleAdherence >= 80 ? '🟢 Very Regular' : scheduleAdherence >= 60 ? '🟡 Somewhat Regular' : scheduleAdherence >= 40 ? '🟠 Irregular' : '🔴 No Pattern';

  // --- NEW: Content Freshness Score ---
  const gamesByRecency = {};
  h.forEach((s, i) => {
    const game = s.game || s.gameName || 'Unknown';
    if (!(game in gamesByRecency)) gamesByRecency[game] = i;
  });
  const uniqueGameCount = Object.keys(gamesByRecency).length;
  const recentGames = Object.values(gamesByRecency).filter(i => i < 10).length;
  const freshnessScore = Math.min(100, Math.round((uniqueGameCount / Math.max(1, h.length)) * 200 + recentGames * 10));
  const freshnessLabel = freshnessScore >= 80 ? '🌈 Very Fresh' : freshnessScore >= 50 ? '🎨 Moderate' : freshnessScore >= 25 ? '🔄 Getting Stale' : '⚠️ Repetitive';

  // --- NEW: Audience Loyalty Estimate ---
  const avgViewersList = h.map(s => s.averageViewers || s.peakViewers || 0);
  const peakViewersList = h.map(s => s.peakViewers || 0);
  const avgRetention = peakViewersList.reduce((s, p, i) => s + (p > 0 ? (avgViewersList[i] / p) : 0), 0) / Math.max(1, h.length);
  const loyaltyScore = Math.min(100, Math.round(avgRetention * 100));
  const loyaltyLabel = loyaltyScore >= 80 ? '💎 Die-hard Fans' : loyaltyScore >= 60 ? '❤️ Loyal' : loyaltyScore >= 40 ? '👋 Casual' : '🚶 Low Retention';

  // --- NEW: Milestone Projections ---
  const totalViewersSoFar = h.reduce((s, x) => s + (x.peakViewers || 0), 0);
  const avgViewersPerStream = totalViewersSoFar / Math.max(1, h.length);
  const milestonesArr = [100, 500, 1000, 5000, 10000, 50000].filter(m => m > totalViewersSoFar);
  let milestonesHtml = '';
  milestonesArr.slice(0, 4).forEach(m => {
    const streamsNeeded = Math.ceil((m - totalViewersSoFar) / Math.max(1, avgViewersPerStream));
    const daysNeeded = Math.ceil(streamsNeeded * Math.max(1, avgGap));
    milestonesHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 15px;background:#26262c;border-radius:6px;margin-bottom:8px">' +
      '<span style="color:#fff;font-weight:bold">' + m.toLocaleString() + ' total peak viewers</span>' +
      '<span style="color:#b0b0b0;font-size:12px">~' + streamsNeeded + ' streams (~' + daysNeeded + ' days)</span></div>';
  });

  // --- NEW: Anomaly Detection ---
  const anomalies = [];
  const upperThresh = mean + 2 * std;
  const lowerThresh = Math.max(0, mean - 2 * std);
  h.forEach(s => {
    const v = s.peakViewers || 0;
    const date = new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    const game = s.game || s.gameName || 'Unknown';
    if (v > upperThresh) anomalies.push({ type: 'spike', date: date, game: game, viewers: v, deviation: ((v - mean) / Math.max(1, std)).toFixed(1) });
    else if (v < lowerThresh && std > 0) anomalies.push({ type: 'dip', date: date, game: game, viewers: v, deviation: ((mean - v) / Math.max(1, std)).toFixed(1) });
  });
  let anomalyHtml = '';
  anomalies.slice(0, 6).forEach(a => {
    const color = a.type === 'spike' ? '#4caf50' : '#ef5350';
    const icon = a.type === 'spike' ? '📈' : '📉';
    anomalyHtml += '<div style="display:flex;justify-content:space-between;align-items:center;padding:10px 15px;background:#26262c;border-radius:6px;margin-bottom:8px;border-left:3px solid ' + color + '">' +
      '<div><span style="font-size:14px">' + icon + '</span> <span style="color:#fff">' + a.date + '</span> <span style="color:#b0b0b0;font-size:12px">(' + a.game + ')</span></div>' +
      '<div><span style="color:' + color + ';font-weight:bold">' + a.viewers + '</span> <span style="color:#666;font-size:11px">' + a.deviation + ' sigma</span></div></div>';
  });

  // --- NEW: Fatigue Analysis ---
  const durBuckets = { short: [], medium: [], long: [], veryLong: [] };
  withDuration.forEach(s => {
    const dur = s.durationMinutes || 0;
    const ratio = (s.averageViewers || s.peakViewers || 0) / Math.max(1, s.peakViewers || 1);
    if (dur < 60) durBuckets.short.push(ratio);
    else if (dur < 180) durBuckets.medium.push(ratio);
    else if (dur < 300) durBuckets.long.push(ratio);
    else durBuckets.veryLong.push(ratio);
  });
  const fatigueData = {};
  Object.entries(durBuckets).forEach(([k, arr]) => {
    fatigueData[k] = arr.length > 0 ? (arr.reduce((a, b) => a + b, 0) / arr.length * 100).toFixed(0) : null;
  });
  const fatiguLabels = { short: 'Under 1h', medium: '1-3h', long: '3-5h', veryLong: '5h+' };
  let fatigueHtml = '';
  Object.entries(fatigueData).forEach(([k, v]) => {
    if (v !== null) {
      const barColor = parseInt(v) >= 70 ? '#4caf50' : parseInt(v) >= 50 ? '#ff9800' : '#ef5350';
      fatigueHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:80px;font-size:12px">' + fatiguLabels[k] + '</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:18px;overflow:hidden"><div style="background:' + barColor + ';height:100%;width:' + v + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:12px;min-width:40px;text-align:right">' + v + '%</span></div>';
    }
  });

  // --- NEW: Stream DNA Profile ---
  const totalHours = h.reduce((s, x) => s + ((x.durationMinutes || 0) / 60), 0);
  const avgDurMins = h.length > 0 ? h.reduce((s, x) => s + (x.durationMinutes || 0), 0) / h.length : 0;
  const dnaVariety = uniqueGameCount >= 5 ? 'Explorer' : uniqueGameCount >= 3 ? 'Versatile' : 'Specialist';
  const dnaSchedule = scheduleAdherence >= 70 ? 'Clockwork' : scheduleAdherence >= 40 ? 'Flexible' : 'Spontaneous';
  const dnaLength = avgDurMins >= 240 ? 'Marathon' : avgDurMins >= 120 ? 'Standard' : 'Sprint';
  const dnaGrowth = parseFloat(momentumPct) > 10 ? 'Rising Star' : parseFloat(momentumPct) > 0 ? 'Steady Climber' : parseFloat(momentumPct) > -10 ? 'Plateau' : 'Rebuilding';

  // --- NEW: Comparative Percentile Analysis ---
  const sortedViewers = [...viewers].sort((a, b) => a - b);
  const p10 = sortedViewers[Math.floor(sortedViewers.length * 0.1)] || 0;
  const p25 = sortedViewers[Math.floor(sortedViewers.length * 0.25)] || 0;
  const p50 = sortedViewers[Math.floor(sortedViewers.length * 0.5)] || 0;
  const p75 = sortedViewers[Math.floor(sortedViewers.length * 0.75)] || 0;
  const p90 = sortedViewers[Math.floor(sortedViewers.length * 0.9)] || 0;

  // --- NEW: Week-over-week trend for last 4 weeks ---
  const now = Date.now();
  const weekData = [0, 1, 2, 3].map(w => {
    const weekStart = now - (w + 1) * 7 * 24 * 60 * 60 * 1000;
    const weekEnd = now - w * 7 * 24 * 60 * 60 * 1000;
    const weekStreams = h.filter(s => {
      const t = new Date(s.startedAt || s.date).getTime();
      return t >= weekStart && t < weekEnd;
    });
    return {
      streams: weekStreams.length,
      avgViewers: weekStreams.length > 0 ? Math.round(weekStreams.reduce((s, x) => s + (x.peakViewers || 0), 0) / weekStreams.length) : 0,
      totalHours: weekStreams.reduce((s, x) => s + ((x.durationMinutes || 0) / 60), 0).toFixed(1)
    };
  });
  let weekTrendHtml = '';
  const weekLabels = ['This Week', '1 Week Ago', '2 Weeks Ago', '3 Weeks Ago'];
  weekData.forEach((w, i) => {
    const prevW = weekData[Math.min(i + 1, weekData.length - 1)];
    const changeIcon = w.avgViewers > prevW.avgViewers ? '🟢' : w.avgViewers < prevW.avgViewers ? '🔴' : '⚪';
    weekTrendHtml += '<tr style="transition:background 0.2s" onmouseenter="this.style.background=\'#2a2f3a\'" onmouseleave="this.style.background=\'transparent\'">' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;color:#b0b0b0;font-size:12px">' + weekLabels[i] + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;color:#fff;text-align:center">' + w.streams + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;color:#9146ff;font-weight:bold;text-align:center">' + w.avgViewers + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;color:#b0b0b0;text-align:center">' + w.totalHours + 'h</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;text-align:center">' + changeIcon + '</td></tr>';
  });

  // Build dynamic suggestions
  const aiSuggestions = [];
  if (parseFloat(momentumPct) < 0) aiSuggestions.push('Your viewership is declining. Try experimenting with new content or streaming times.');
  if (cv > 0.5) aiSuggestions.push('Your viewer count varies a lot. Consistent scheduling can stabilize your audience.');
  if (bestGame && worstGame && bestGame[0] !== worstGame[0]) aiSuggestions.push('Focus more on <strong>' + bestGame[0] + '</strong> — it outperforms other games by ' + Math.round(((bestGame[1] - worstGame[1]) / (worstGame[1] || 1)) * 100) + '%.');
  if (withDuration.length > 0) aiSuggestions.push(durationCorrelation + '.');
  aiSuggestions.push('Your best streaming time is <strong>' + bestHourLabel + '</strong> on <strong>' + bestDayName + '</strong>.');
  if (h.length < 10) aiSuggestions.push('Stream more to unlock better insights! You have only ' + h.length + ' sessions recorded.');
  if (burnoutScore >= 40) aiSuggestions.push('Burnout risk detected! Consider taking a planned break or doing shorter, more fun streams.');
  if (freshnessScore < 30) aiSuggestions.push('Your content is getting repetitive. Mixing in a new game could re-engage viewers.');
  if (loyaltyScore < 50) aiSuggestions.push('Audience retention is low. Engage with chat more and create moments that keep viewers watching.');
  if (scheduleAdherence < 40) aiSuggestions.push('No clear schedule pattern detected. Setting a regular schedule helps viewers know when to tune in.');

  let suggestionsHtml = '';
  const sugIcons = ['💡', '🎯', '📊', '⏰', '🔑', '🚀', '🔥', '🎨', '💬', '📅'];
  const sugColors = ['#9146ff', '#4caf50', '#ff9800', '#2196f3', '#e91e63', '#00bcd4', '#ff5722', '#8bc34a', '#ab47bc', '#009688'];
  aiSuggestions.forEach((s, i) => {
    suggestionsHtml += '<div style="background:#26262c;padding:15px;border-radius:6px;border-left:3px solid ' + sugColors[i % sugColors.length] + '">' +
      '<div style="color:#fff;font-size:13px">' + sugIcons[i % sugIcons.length] + ' ' + s + '</div></div>';
  });

  // --- NEW: Effort / Outcome / ROI Scores ---
  const aiTotalHours = h.reduce((s, x) => s + ((x.durationMinutes || 0) / 60), 0);
  const aiAvgDuration = h.length > 0 ? h.reduce((s, x) => s + (x.durationMinutes || 0), 0) / h.length : 0;
  const consistencyPenalty = 1 + (cv * 0.5); // higher variance = higher effort cost
  const effortScore = Math.min(100, Math.round((aiAvgDuration / 60) * 15 * consistencyPenalty));
  const peakWeight = 0.4, followWeight = 0.3, retentionWeight = 0.3;
  const normPeak = Math.min(100, Math.round((mean / Math.max(1, Math.max(...viewers))) * 100));
  const avgFollows = h.length > 0 ? h.reduce((s, x) => s + (x.followers || x.newFollowers || 0), 0) / h.length : 0;
  const normFollows = Math.min(100, Math.round(avgFollows * 10));
  const normRetention = loyaltyScore;
  const outcomeScore = Math.round(normPeak * peakWeight + normFollows * followWeight + normRetention * retentionWeight);
  const roiRaw = effortScore > 0 ? (outcomeScore / effortScore) : 0;
  const roiRating = roiRaw >= 1.5 ? '🌟 Excellent' : roiRaw >= 1.0 ? '✅ Good' : roiRaw >= 0.7 ? '⚠️ Average' : '🔻 Low';
  const roiColor = roiRaw >= 1.5 ? '#4caf50' : roiRaw >= 1.0 ? '#8bc34a' : roiRaw >= 0.7 ? '#ff9800' : '#ef5350';

  // --- NEW: Stream Warnings ---
  const streamWarnings = [];
  // Viewer Drop After X Minutes
  const vgh = viewerGraphHistory || [];
  vgh.slice(-5).forEach(function(stream) {
    if (!stream.data || stream.data.length < 20) return;
    var pts = stream.data;
    var peak = 0, peakIdx = 0;
    pts.forEach(function(p, i) { if ((p.viewers || 0) > peak) { peak = p.viewers; peakIdx = i; } });
    if (peakIdx < pts.length - 5) {
      var afterPeak = pts.slice(peakIdx, Math.min(peakIdx + 20, pts.length));
      var dropPct = afterPeak.length > 1 ? ((peak - (afterPeak[afterPeak.length - 1].viewers || 0)) / Math.max(1, peak) * 100) : 0;
      if (dropPct > 30) {
        var minMark = Math.round((peakIdx / pts.length) * ((stream.durationMinutes || 0) || pts.length));
        streamWarnings.push({ icon: '📉', label: 'Viewer Drop', detail: Math.round(dropPct) + '% drop after ~' + minMark + ' min (peak: ' + peak + ')', color: '#ef5350' });
      }
    }
  });
  // Underperforming Game Warning
  const overallAvgPeak = mean;
  Object.entries(topGameData).forEach(function(entry) {
    var g = entry[0], d = entry[1];
    var gAvg = d.total / d.count;
    if (gAvg < overallAvgPeak * 0.7 && d.count >= 2) {
      streamWarnings.push({ icon: '🎮', label: 'Underperforming Game', detail: g + ' averages ' + Math.round(gAvg) + ' viewers (' + Math.round((1 - gAvg / overallAvgPeak) * 100) + '% below average)', color: '#ff9800' });
    }
  });
  // Late-Night Performance Penalty
  const lateStreams = h.filter(function(s) { var hr = new Date(s.startedAt || s.date).getHours(); return hr >= 23 || hr < 5; });
  const otherStreams = h.filter(function(s) { var hr = new Date(s.startedAt || s.date).getHours(); return hr >= 5 && hr < 23; });
  if (lateStreams.length >= 2 && otherStreams.length >= 2) {
    var lateAvg = Math.round(lateStreams.reduce(function(s, x) { return s + (x.peakViewers || 0); }, 0) / lateStreams.length);
    var otherAvg = Math.round(otherStreams.reduce(function(s, x) { return s + (x.peakViewers || 0); }, 0) / otherStreams.length);
    if (lateAvg < otherAvg * 0.8) {
      streamWarnings.push({ icon: '😴', label: 'Late-Night Penalty', detail: 'Late streams avg ' + lateAvg + ' vs ' + otherAvg + ' peak viewers (-' + Math.round((1 - lateAvg / otherAvg) * 100) + '%)', color: '#ab47bc' });
    }
  }
  // Repeated Title Word Fatigue
  const titleWordViewers = {};
  h.forEach(function(s) {
    if (!s.title) return;
    var words = s.title.split(/[\s|,!.?]+/).map(function(w) { return w.toLowerCase().trim(); }).filter(function(w) { return w.length > 3; });
    words.forEach(function(w) {
      if (!titleWordViewers[w]) titleWordViewers[w] = [];
      titleWordViewers[w].push(s.peakViewers || 0);
    });
  });
  Object.entries(titleWordViewers).forEach(function(entry) {
    var w = entry[0], arr = entry[1];
    if (arr.length >= 4) {
      var firstHalf = arr.slice(0, Math.floor(arr.length / 2));
      var secondHalf = arr.slice(Math.floor(arr.length / 2));
      var firstAvg = firstHalf.reduce(function(a, b) { return a + b; }, 0) / firstHalf.length;
      var secondAvg2 = secondHalf.reduce(function(a, b) { return a + b; }, 0) / secondHalf.length;
      if (secondAvg2 < firstAvg * 0.75 && firstAvg > 0) {
        streamWarnings.push({ icon: '🔁', label: 'Title Word Fatigue', detail: '"' + w + '" used ' + arr.length + 'x — viewers declining (' + Math.round(firstAvg) + ' → ' + Math.round(secondAvg2) + ')', color: '#ff5722' });
      }
    }
  });
  var warningsHtml = '';
  streamWarnings.slice(0, 6).forEach(function(w) {
    warningsHtml += '<div style="display:flex;align-items:center;gap:12px;padding:12px 15px;background:#26262c;border-radius:6px;margin-bottom:8px;border-left:3px solid ' + w.color + '">' +
      '<span style="font-size:18px">' + w.icon + '</span>' +
      '<div><div style="color:#fff;font-weight:bold;font-size:13px">' + w.label + '</div>' +
      '<div style="color:#b0b0b0;font-size:12px;margin-top:2px">' + w.detail + '</div></div></div>';
  });

  // --- NEW: Stream Type Badges ---
  const classifyStream = function(s, idx, arr) {
    var peak = s.peakViewers || 0;
    var avg = s.averageViewers || s.peakViewers || 0;
    var dur = s.durationMinutes || 0;
    var game = s.game || s.gameName || 'Unknown';
    var prevStreams = arr.slice(Math.max(0, idx - 3), idx);
    var prevAvgPeak = prevStreams.length > 0 ? prevStreams.reduce(function(sm, x) { return sm + (x.peakViewers || 0); }, 0) / prevStreams.length : peak;
    // Breakout: peak significantly above overall average
    if (peak > overallAvgPeak * 1.5) return { badge: '🚀', label: 'Breakout', color: '#4caf50' };
    // Momentum: 3+ consecutive improvements
    if (prevStreams.length >= 2 && prevStreams.every(function(p) { return (p.peakViewers || 0) < peak; })) return { badge: '🔥', label: 'Momentum', color: '#ff9800' };
    // Stable Builder: close to average, good retention
    var retention = peak > 0 ? avg / peak : 0;
    if (Math.abs(peak - overallAvgPeak) < overallAvgPeak * 0.2 && retention > 0.6) return { badge: '🧱', label: 'Stable Builder', color: '#2196f3' };
    // Experimental: game played fewer than 3 times
    var gameCount = topGameData[game] ? topGameData[game].count : 0;
    if (gameCount <= 2) return { badge: '🧪', label: 'Experimental', color: '#ab47bc' };
    // Low Energy: below average peak AND short duration
    if (peak < overallAvgPeak * 0.7 && dur < aiAvgDuration * 0.7) return { badge: '💤', label: 'Low Energy', color: '#ef5350' };
    return { badge: '📊', label: 'Standard', color: '#666' };
  };
  var streamBadges = h.slice(-10).map(function(s, i, arr) {
    var badge = classifyStream(s, i, h.slice(-10));
    return {
      date: new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      game: (s.game || s.gameName || 'Unknown').substring(0, 20),
      peak: s.peakViewers || 0,
      badge: badge.badge,
      label: badge.label,
      color: badge.color
    };
  });
  var badgesHtml = '';
  streamBadges.reverse().forEach(function(b) {
    badgesHtml += '<tr style="transition:background 0.2s" onmouseenter="this.style.background=\'#2a2f3a\'" onmouseleave="this.style.background=\'transparent\'">' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;color:#b0b0b0;font-size:12px">' + b.date + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;color:#fff;font-size:12px">' + b.game + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;color:#9146ff;font-weight:bold;text-align:center">' + b.peak + '</td>' +
      '<td style="padding:8px 12px;border-bottom:1px solid #2a2f3a;text-align:center"><span style="background:' + b.color + '22;color:' + b.color + ';padding:3px 10px;border-radius:12px;font-size:11px;font-weight:bold">' + b.badge + ' ' + b.label + '</span></td>' +
    '</tr>';
  });

  return '<div class="card">' +
  '<h2>🤖 AI-Powered Insights</h2>' +
  '<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin:10px 0">' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">🏥 Health</div>' +
      '<div style="font-size:20px;color:' + healthColor + ';font-weight:bold">' + healthScore + '</div>' +
      '<div style="font-size:10px;color:' + healthColor + '">' + healthLabel + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">📊 Momentum</div>' +
      '<div style="font-size:20px;color:' + (parseFloat(momentumPct) >= 0 ? '#4caf50' : '#ef5350') + ';font-weight:bold">' + (parseFloat(momentumPct) >= 0 ? '+' : '') + momentumPct + '%</div>' +
      '<div style="font-size:10px;color:#b0b0b0">' + momentum + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">🔮 Predicted</div>' +
      '<div style="font-size:20px;color:#9146ff;font-weight:bold">' + predictedViewers + '</div>' +
      '<div style="font-size:10px;color:#666">' + predLow + '-' + predHigh + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">📏 Consistency</div>' +
      '<div style="font-size:14px;color:#fff;font-weight:bold;margin-top:2px">' + consistencyLabel + '</div>' +
      '<div style="font-size:10px;color:#666">CV ' + (cv * 100).toFixed(0) + '%</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">🔥 Burnout</div>' +
      '<div style="font-size:20px;color:' + burnoutColor + ';font-weight:bold">' + burnoutScore + '%</div>' +
      '<div style="font-size:10px;color:' + burnoutColor + '">' + burnoutLabel + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">📅 Schedule</div>' +
      '<div style="font-size:20px;color:#2196f3;font-weight:bold">' + scheduleAdherence + '%</div>' +
      '<div style="font-size:10px;color:#b0b0b0">' + scheduleLabel + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">🎨 Freshness</div>' +
      '<div style="font-size:20px;color:#ab47bc;font-weight:bold">' + freshnessScore + '%</div>' +
      '<div style="font-size:10px;color:#b0b0b0">' + freshnessLabel + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">💎 Loyalty</div>' +
      '<div style="font-size:20px;color:#ffd700;font-weight:bold">' + loyaltyScore + '%</div>' +
      '<div style="font-size:10px;color:#b0b0b0">' + loyaltyLabel + '</div>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🧬 Stream DNA Profile</h3>' +
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:15px;margin-top:15px">' +
    '<div style="background:#26262c;padding:20px;border-radius:8px;text-align:center;border-top:3px solid #9146ff">' +
      '<div style="color:#b0b0b0;font-size:11px;margin-bottom:5px">Content Style</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + dnaVariety + '</div>' +
      '<div style="color:#666;font-size:11px">' + uniqueGameCount + ' unique games</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:20px;border-radius:8px;text-align:center;border-top:3px solid #4caf50">' +
      '<div style="color:#b0b0b0;font-size:11px;margin-bottom:5px">Schedule Type</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + dnaSchedule + '</div>' +
      '<div style="color:#666;font-size:11px">' + scheduleAdherence + '% adherence</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:20px;border-radius:8px;text-align:center;border-top:3px solid #ff9800">' +
      '<div style="color:#b0b0b0;font-size:11px;margin-bottom:5px">Stream Length</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + dnaLength + '</div>' +
      '<div style="color:#666;font-size:11px">avg ' + Math.round(avgDurMins) + ' min</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:20px;border-radius:8px;text-align:center;border-top:3px solid #2196f3">' +
      '<div style="color:#b0b0b0;font-size:11px;margin-bottom:5px">Growth Phase</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + dnaGrowth + '</div>' +
      '<div style="color:#666;font-size:11px">' + momentumPct + '% momentum</div>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">📊 Viewer Distribution (Percentiles)</h3>' +
  '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:10px;margin-top:15px">' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">' +
      '<div style="color:#ef5350;font-size:11px">P10</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + p10 + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">' +
      '<div style="color:#ff9800;font-size:11px">P25</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + p25 + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">' +
      '<div style="color:#ffd700;font-size:11px">P50 (Median)</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + p50 + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">' +
      '<div style="color:#8bc34a;font-size:11px">P75</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + p75 + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center">' +
      '<div style="color:#4caf50;font-size:11px">P90</div>' +
      '<div style="color:#fff;font-weight:bold;font-size:18px">' + p90 + '</div>' +
    '</div>' +
  '</div>' +
  '<div style="color:#666;font-size:11px;margin-top:8px;line-height:1.5">' +
    'P10 = bottom 10% of streams · P25 = lower quartile · P50 = median (typical stream) · P75 = upper quartile · P90 = top 10% of streams. ' +
    'A wide gap between P10 and P90 means your viewership varies a lot between streams.' +
  '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🏆 Key Findings & Insights</h3>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:10px">' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #4caf50">' +
      '<div style="font-weight:bold;color:#fff;font-size:12px">🎮 Best Game</div>' +
      '<div style="color:#b0b0b0;font-size:11px;margin-top:4px">' + (bestGame ? bestGame[0] + ' — <strong style="color:#4caf50">' + bestGame[1] + '</strong> avg (best: ' + bestGame[2] + ')' : 'N/A') + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #ff9800">' +
      '<div style="font-weight:bold;color:#fff;font-size:12px">⏰ Optimal Time</div>' +
      '<div style="color:#b0b0b0;font-size:11px;margin-top:4px"><strong style="color:#ff9800">' + bestDayName + '</strong> at <strong style="color:#ff9800">' + bestHourLabel + '</strong> (' + bestDayAvg + ' / ' + bestHourAvg + ' avg)</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #2196f3">' +
      '<div style="font-weight:bold;color:#fff;font-size:12px">⏱️ Duration Impact</div>' +
      '<div style="color:#b0b0b0;font-size:11px;margin-top:4px">' + durationCorrelation + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #e91e63">' +
      '<div style="font-weight:bold;color:#fff;font-size:12px">🔥 Burnout</div>' +
      '<div style="color:#b0b0b0;font-size:11px;margin-top:4px"><strong style="color:' + burnoutColor + '">' + burnoutLabel + '</strong> (' + burnoutScore + '%) — ' + (burnoutScore >= 40 ? 'Vary content or take breaks.' : 'Sustainable rhythm!') + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #9146ff;grid-column:span 2">' +
      '<div style="font-weight:bold;color:#fff;font-size:12px">💎 Loyalty</div>' +
      '<div style="color:#b0b0b0;font-size:11px;margin-top:4px">Retention: <strong style="color:#ffd700">' + loyaltyScore + '%</strong> — ' + loyaltyLabel + '. ' + (loyaltyScore >= 60 ? 'Viewers stick around!' : 'Engage more to retain viewers.') + '</div>' +
    '</div>' +
  '</div>' +
  (anomalyHtml ?
    '<div style="margin-top:15px;border-top:1px solid #2a2f3a;padding-top:12px">' +
      '<h4 style="margin:0 0 8px 0;color:#e0e0e0;font-size:13px">🔍 Anomaly Detection <span style="color:#666;font-size:11px;font-weight:normal">(+/- 2σ from ' + Math.round(mean) + ' avg)</span></h4>' +
      anomalyHtml +
    '</div>' : '') +
  (fatigueHtml ?
    '<div style="margin-top:15px;border-top:1px solid #2a2f3a;padding-top:12px">' +
      '<h4 style="margin:0 0 8px 0;color:#e0e0e0;font-size:13px">😴 Viewer Fatigue <span style="color:#666;font-size:11px;font-weight:normal">(retention by duration)</span></h4>' +
      fatigueHtml +
    '</div>' : '') +
  '<div style="margin-top:15px;border-top:1px solid #2a2f3a;padding-top:12px">' +
    '<h4 style="margin:0 0 8px 0;color:#e0e0e0;font-size:13px">💡 Smart Suggestions</h4>' +
    '<div style="display:grid;gap:8px">' +
      suggestionsHtml +
    '</div>' +
  '</div>' +
'</div>' +

(milestonesHtml ? '<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🎯 Milestone Projections</h3>' +
  '<p style="color:#b0b0b0;font-size:12px;margin-bottom:10px">Estimated time to reach viewer milestones at current pace (' + Math.round(avgViewersPerStream) + ' avg peak/stream)</p>' +
  milestonesHtml +
'</div>' : '') +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">📈 Health Score & ROI</h3>' +
  '<div style="display:grid;grid-template-columns:1fr auto;gap:20px;margin-top:15px;align-items:start">' +
    '<div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:90px;font-size:11px">Growth</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#4caf50;height:100%;width:' + (healthGrowth * 4) + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:11px;min-width:35px;text-align:right">' + healthGrowth + '/25</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:90px;font-size:11px">Consistency</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#9146ff;height:100%;width:' + (healthConsistency * 4) + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:11px;min-width:35px;text-align:right">' + healthConsistency + '/25</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:90px;font-size:11px">Activity</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#ff9800;height:100%;width:' + (healthActivity * 4) + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:11px;min-width:35px;text-align:right">' + healthActivity + '/25</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:90px;font-size:11px">Engagement</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#2196f3;height:100%;width:' + (healthEngagement * 4) + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:11px;min-width:35px;text-align:right">' + healthEngagement + '/25</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:90px;font-size:11px">Freshness</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#ab47bc;height:100%;width:' + Math.min(100, freshnessScore) + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:11px;min-width:35px;text-align:right">' + freshnessScore + '/100</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:90px;font-size:11px">Loyalty</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#ffd700;height:100%;width:' + Math.min(100, loyaltyScore) + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:11px;min-width:35px;text-align:right">' + loyaltyScore + '/100</span>' +
      '</div>' +
      '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
        '<span style="color:#b0b0b0;width:90px;font-size:11px">Schedule</span>' +
        '<div style="flex:1;background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#00bcd4;height:100%;width:' + Math.min(100, scheduleAdherence) + '%;border-radius:3px"></div></div>' +
        '<span style="color:#fff;font-size:11px;min-width:35px;text-align:right">' + scheduleAdherence + '/100</span>' +
      '</div>' +
    '</div>' +
    '<div style="display:flex;flex-direction:column;gap:8px;min-width:130px">' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #ff9800">' +
        '<div style="color:#b0b0b0;font-size:10px">🧮 Effort</div>' +
        '<div style="font-size:20px;color:#ff9800;font-weight:bold">' + effortScore + '</div>' +
        '<div style="font-size:9px;color:#666">' + Math.round(aiAvgDuration) + 'min × ' + consistencyPenalty.toFixed(1) + '</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #4caf50">' +
        '<div style="color:#b0b0b0;font-size:10px">📊 Outcome</div>' +
        '<div style="font-size:20px;color:#4caf50;font-weight:bold">' + outcomeScore + '</div>' +
        '<div style="font-size:9px;color:#666">P' + normPeak + ' F' + normFollows + ' R' + normRetention + '</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid ' + roiColor + '">' +
        '<div style="color:#b0b0b0;font-size:10px">⚖️ ROI</div>' +
        '<div style="font-size:20px;color:' + roiColor + ';font-weight:bold">' + roiRaw.toFixed(2) + '</div>' +
        '<div style="font-size:10px;color:' + roiColor + '">' + roiRating + '</div>' +
      '</div>' +
    '</div>' +
  '</div>' +
'</div>' +

// Stream Warnings card
(warningsHtml ? '<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">⚠️ Stream Warnings</h3>' +
  '<p style="color:#666;font-size:11px;margin-bottom:10px">Issues detected from your recent stream data that may impact growth</p>' +
  warningsHtml +
'</div>' : '') +

// Stream Type Badges card
'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🏷️ Stream Type Classification</h3>' +
  '<p style="color:#666;font-size:11px;margin-bottom:10px">Each recent stream classified by its performance pattern</p>' +
  '<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:15px">' +
    '<span style="background:#4caf5022;color:#4caf50;padding:4px 10px;border-radius:12px;font-size:11px">🚀 Breakout = Peak &gt; 150% avg</span>' +
    '<span style="background:#ff980022;color:#ff9800;padding:4px 10px;border-radius:12px;font-size:11px">🔥 Momentum = Consecutive growth</span>' +
    '<span style="background:#2196f322;color:#2196f3;padding:4px 10px;border-radius:12px;font-size:11px">🧱 Stable Builder = Consistent</span>' +
    '<span style="background:#ab47bc22;color:#ab47bc;padding:4px 10px;border-radius:12px;font-size:11px">🧪 Experimental = New game</span>' +
    '<span style="background:#ef535022;color:#ef5350;padding:4px 10px;border-radius:12px;font-size:11px">💤 Low Energy = Below avg</span>' +
  '</div>' +
  '<table style="width:100%;border-collapse:collapse">' +
    '<thead><tr style="background:#26262c">' +
      '<th style="padding:8px 12px;text-align:left;font-size:12px;color:#b0b0b0">Date</th>' +
      '<th style="padding:8px 12px;text-align:left;font-size:12px;color:#b0b0b0">Game</th>' +
      '<th style="padding:8px 12px;text-align:center;font-size:12px;color:#b0b0b0">Peak</th>' +
      '<th style="padding:8px 12px;text-align:center;font-size:12px;color:#b0b0b0">Type</th>' +
    '</tr></thead>' +
    '<tbody>' + badgesHtml + '</tbody>' +
  '</table>' +
'</div>' +

// Viewer timeline deep analysis from viewerGraphHistory
(function() {
  var vgh = viewerGraphHistory || [];
  if (vgh.length < 2) return '';
  
  // Analyze viewer curves across all streams
  var firstHalfAvgs = [];
  var secondHalfAvgs = [];
  var startViewers = [];
  var endViewers = [];
  var peakPositions = [];
  var maxDataPoints = 0;
  
  vgh.forEach(function(stream) {
    if (!stream.data || stream.data.length < 10) return;
    maxDataPoints = Math.max(maxDataPoints, stream.data.length);
    var mid = Math.floor(stream.data.length / 2);
    var first = stream.data.slice(0, mid);
    var second = stream.data.slice(mid);
    var firstAvg = first.reduce(function(s, d) { return s + (d.viewers || 0); }, 0) / first.length;
    var secondAvg = second.reduce(function(s, d) { return s + (d.viewers || 0); }, 0) / second.length;
    firstHalfAvgs.push(firstAvg);
    secondHalfAvgs.push(secondAvg);
    startViewers.push(stream.data[0].viewers || 0);
    endViewers.push(stream.data[stream.data.length - 1].viewers || 0);
    
    // Find peak position
    var peak = 0;
    var peakIdx = 0;
    stream.data.forEach(function(dp, idx) {
      if ((dp.viewers || 0) > peak) { peak = dp.viewers; peakIdx = idx; }
    });
    peakPositions.push(Math.round((peakIdx / stream.data.length) * 100));
  });
  
  if (firstHalfAvgs.length === 0) return '';
  
  var avgFirst = Math.round(firstHalfAvgs.reduce(function(a, b) { return a + b; }, 0) / firstHalfAvgs.length);
  var avgSecond = Math.round(secondHalfAvgs.reduce(function(a, b) { return a + b; }, 0) / secondHalfAvgs.length);
  var avgStart = Math.round(startViewers.reduce(function(a, b) { return a + b; }, 0) / startViewers.length);
  var avgEnd = Math.round(endViewers.reduce(function(a, b) { return a + b; }, 0) / endViewers.length);
  var avgPeakPos = Math.round(peakPositions.reduce(function(a, b) { return a + b; }, 0) / peakPositions.length);
  
  var halfTrend = avgSecond >= avgFirst ? '📈 Viewers increase as streams go on (+' + Math.round(((avgSecond - avgFirst) / Math.max(avgFirst, 1)) * 100) + '%)' :
    '📉 Viewers decline in 2nd half (-' + Math.round(((avgFirst - avgSecond) / Math.max(avgFirst, 1)) * 100) + '%)';
  
  var retPct = avgStart > 0 ? Math.round((avgEnd / avgStart) * 100) : 0;
  var retLabel = retPct >= 80 ? '🟢 Excellent' : retPct >= 60 ? '🟡 Good' : retPct >= 40 ? '🟠 Average' : '🔴 Low';
  
  var peakLabel = avgPeakPos <= 25 ? 'Early (first quarter)' : avgPeakPos <= 50 ? 'Mid-early' : avgPeakPos <= 75 ? 'Mid-late' : 'Late (last quarter)';
  
  return '<div class="card" style="margin-top:15px">' +
    '<h3 style="margin-top:0">📡 In-Stream Viewer Flow Analysis</h3>' +
    '<p style="color:#b0b0b0;font-size:12px;margin-bottom:10px">Deep analysis of minute-by-minute viewer data across ' + vgh.length + ' streams (up to ' + maxDataPoints + ' data points per stream)</p>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin-top:10px">' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #4caf50">' +
        '<div style="color:#b0b0b0;font-size:10px">Avg Start Viewers</div>' +
        '<div style="font-size:20px;color:#4caf50;font-weight:bold">' + avgStart + '</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #2196f3">' +
        '<div style="color:#b0b0b0;font-size:10px">1st Half Avg</div>' +
        '<div style="font-size:20px;color:#2196f3;font-weight:bold">' + avgFirst + '</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #9146ff">' +
        '<div style="color:#b0b0b0;font-size:10px">2nd Half Avg</div>' +
        '<div style="font-size:20px;color:#9146ff;font-weight:bold">' + avgSecond + '</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #ef5350">' +
        '<div style="color:#b0b0b0;font-size:10px">Avg End Viewers</div>' +
        '<div style="font-size:20px;color:#ef5350;font-weight:bold">' + avgEnd + '</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #ff9800">' +
        '<div style="color:#b0b0b0;font-size:10px">Start→End Retention</div>' +
        '<div style="font-size:20px;color:#ff9800;font-weight:bold">' + retPct + '%</div>' +
        '<div style="font-size:10px;color:#666">' + retLabel + '</div>' +
      '</div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid #ffd700">' +
        '<div style="color:#b0b0b0;font-size:10px">Peak Position</div>' +
        '<div style="font-size:20px;color:#ffd700;font-weight:bold">' + avgPeakPos + '%</div>' +
        '<div style="font-size:10px;color:#666">' + peakLabel + '</div>' +
      '</div>' +
    '</div>' +
    '<div style="margin-top:12px;padding:10px;background:#26262c;border-radius:6px;border-left:3px solid #9146ff">' +
      '<div style="font-weight:bold;color:#fff">📊 Stream Flow Pattern</div>' +
      '<div style="color:#b0b0b0;margin-top:5px">' + halfTrend + '</div>' +
    '</div>' +
  '</div>';
})() +

// Multi-stream viewer overlay chart
(function() {
  var vgh = viewerGraphHistory || [];
  var usable = vgh.filter(function(s) { return s.data && s.data.length >= 20; });
  if (usable.length < 2) return '';
  
  // Take last 5 streams, normalize to % of stream duration
  var streams = usable.slice(-5);
  var chartColors = ['#9146ff', '#4caf50', '#ff9800', '#e91e63', '#2196f3'];
  var normalizedStreams = [];
  
  streams.forEach(function(stream, idx) {
    var pts = stream.data;
    // Downsample to 50 points normalized across stream length
    var step = Math.max(1, Math.floor(pts.length / 50));
    var sampled = [];
    for (var i = 0; i < pts.length; i += step) sampled.push(pts[i].viewers || 0);
    normalizedStreams.push({
      label: new Date(stream.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      data: sampled,
      peak: stream.peakViewers || Math.max.apply(null, sampled),
      color: chartColors[idx % chartColors.length]
    });
  });
  
  // Generate percentage labels (0% to 100% of stream time)
  var maxLen = Math.max.apply(null, normalizedStreams.map(function(s) { return s.data.length; }));
  var labels = [];
  for (var i = 0; i < maxLen; i++) labels.push(Math.round((i / (maxLen - 1)) * 100) + '%');
  
  // Pad shorter streams with null
  normalizedStreams.forEach(function(s) {
    while (s.data.length < maxLen) s.data.push(null);
  });
  
  var datasets = normalizedStreams.map(function(s) {
    return {
      label: s.label + ' (peak: ' + s.peak + ')',
      data: s.data,
      borderColor: s.color,
      backgroundColor: 'transparent',
      fill: false,
      tension: 0.3,
      pointRadius: 0,
      borderWidth: 2,
      spanGaps: true
    };
  });
  
  return '<div class="card" style="margin-top:15px">' +
    '<h3 style="margin-top:0">🔄 Multi-Stream Viewer Overlay (Last ' + streams.length + ' Streams)</h3>' +
    '<p style="color:#666;font-size:11px;margin-bottom:10px">Viewer curves normalized by stream progress (0% = start, 100% = end). Compare viewer behavior patterns across streams.</p>' +
    '<div style="height:250px"><canvas id="multi-stream-overlay"></canvas></div>' +
  '</div>' +
  '<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>' +
  '<script>' +
  'document.addEventListener("DOMContentLoaded", function() {' +
    'var msCtx = document.getElementById("multi-stream-overlay");' +
    'if (msCtx) {' +
      'new Chart(msCtx, {' +
        'type: "line",' +
        'data: {' +
          'labels: ' + JSON.stringify(labels) + ',' +
          'datasets: ' + JSON.stringify(datasets) +
        '},' +
        'options: {' +
          'responsive: true,' +
          'maintainAspectRatio: false,' +
          'interaction: { mode: "index", intersect: false },' +
          'plugins: { legend: { display: true, labels: { color: "#8b8fa3", usePointStyle: true, font: { size: 10 } } } },' +
          'scales: {' +
            'y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3" }, title: { display: true, text: "Viewers", color: "#666" } },' +
            'x: { grid: { display: false }, ticks: { color: "#8b8fa3", maxTicksLimit: 10 }, title: { display: true, text: "Stream Progress", color: "#666" } }' +
          '}' +
        '}' +
      '});' +
    '}' +
  '});' +
  '<\/script>';
})() +

// Stream health/retention analysis chart
(function() {
  var vgh = viewerGraphHistory || [];
  var usable = vgh.filter(function(s) { return s.data && s.data.length >= 20; });
  if (usable.length < 3) return '';
  
  var healthData = usable.slice(-10).map(function(stream) {
    var pts = stream.data;
    var viewers = pts.map(function(p) { return p.viewers || 0; });
    var peak = Math.max.apply(null, viewers);
    var peakIdx = viewers.indexOf(peak);
    var startV = viewers[0] || 1;
    var endV = viewers[viewers.length - 1] || 0;
    
    // Ramp-up score: how quickly viewers reach peak (earlier = better)
    var rampPct = Math.round((1 - peakIdx / viewers.length) * 100);
    
    // Retention score: end viewers / peak viewers
    var retention = peak > 0 ? Math.round((endV / peak) * 100) : 0;
    
    // Stability score: low coefficient of variation = more stable
    var avg = viewers.reduce(function(a, b) { return a + b; }, 0) / viewers.length;
    var variance = viewers.reduce(function(s, v) { return s + Math.pow(v - avg, 2); }, 0) / viewers.length;
    var cv = avg > 0 ? Math.sqrt(variance) / avg : 0;
    var stability = Math.round(Math.max(0, 100 - cv * 100));
    
    // Growth score: end vs start
    var growth = startV > 0 ? Math.round(((endV - startV) / startV) * 100) : 0;
    
    // Overall health = weighted average
    var health = Math.round(rampPct * 0.2 + retention * 0.3 + stability * 0.3 + Math.min(100, Math.max(0, growth + 50)) * 0.2);
    
    return {
      date: new Date(stream.startedAt).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }),
      ramp: rampPct,
      retention: retention,
      stability: stability,
      health: health,
      peak: peak
    };
  });
  
  return '<div class="card" style="margin-top:15px">' +
    '<h3 style="margin-top:0">❤️ Stream Health Analysis</h3>' +
    '<p style="color:#666;font-size:11px;margin-bottom:10px">Stream quality metrics derived from minute-by-minute viewer data. Higher = better.</p>' +
    '<div style="height:250px"><canvas id="stream-health-chart"></canvas></div>' +
  '</div>' +
  '<script>' +
  'document.addEventListener("DOMContentLoaded", function() {' +
    'var healthData = ' + JSON.stringify(healthData) + ';' +
    'var shCtx = document.getElementById("stream-health-chart");' +
    'if (shCtx && healthData.length > 0) {' +
      'new Chart(shCtx, {' +
        'type: "bar",' +
        'data: {' +
          'labels: healthData.map(function(d) { return d.date; }),' +
          'datasets: [{' +
            'label: "Health Score",' +
            'data: healthData.map(function(d) { return d.health; }),' +
            'backgroundColor: healthData.map(function(d) { return d.health >= 70 ? "#4caf50aa" : d.health >= 40 ? "#ff9800aa" : "#ef5350aa"; }),' +
            'borderColor: healthData.map(function(d) { return d.health >= 70 ? "#4caf50" : d.health >= 40 ? "#ff9800" : "#ef5350"; }),' +
            'borderWidth: 1,' +
            'borderRadius: 4,' +
            'order: 2' +
          '}, {' +
            'label: "Retention %",' +
            'data: healthData.map(function(d) { return d.retention; }),' +
            'type: "line",' +
            'borderColor: "#9146ff",' +
            'backgroundColor: "transparent",' +
            'borderWidth: 2,' +
            'pointRadius: 3,' +
            'pointBackgroundColor: "#9146ff",' +
            'tension: 0.3,' +
            'order: 1' +
          '}, {' +
            'label: "Stability %",' +
            'data: healthData.map(function(d) { return d.stability; }),' +
            'type: "line",' +
            'borderColor: "#2196f3",' +
            'backgroundColor: "transparent",' +
            'borderWidth: 2,' +
            'pointRadius: 3,' +
            'pointBackgroundColor: "#2196f3",' +
            'borderDash: [4, 4],' +
            'tension: 0.3,' +
            'order: 1' +
          '}]' +
        '},' +
        'options: {' +
          'responsive: true,' +
          'maintainAspectRatio: false,' +
          'plugins: {' +
            'legend: { display: true, labels: { color: "#8b8fa3", usePointStyle: true, font: { size: 10 } } },' +
            'tooltip: { callbacks: { afterBody: function(ctx) { var d = healthData[ctx[0].dataIndex]; return "Ramp-up: " + d.ramp + "% | Retention: " + d.retention + "% | Stability: " + d.stability + "% | Peak: " + d.peak; } } }' +
          '},' +
          'scales: {' +
            'y: { beginAtZero: true, max: 100, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3", callback: function(v) { return v + "%"; } } },' +
            'x: { grid: { display: false }, ticks: { color: "#8b8fa3" } }' +
          '}' +
        '}' +
      '});' +
    '}' +
  '});' +
  '<\/script>';
})() +

// Title analysis
(function() {
  var titleLengths = [];
  var titleWords = {};
  h.forEach(function(s) {
    if (s.title) {
      titleLengths.push(s.title.length);
      s.title.split(/[\s|,!.?]+/).forEach(function(w) {
        var word = w.toLowerCase().trim();
        if (word.length > 2 && word !== 'the' && word !== 'and' && word !== 'for' && word !== 'with') {
          titleWords[word] = (titleWords[word] || 0) + 1;
        }
      });
    }
  });
  if (titleLengths.length < 3) return '';
  
  var avgLen = Math.round(titleLengths.reduce(function(a, b) { return a + b; }, 0) / titleLengths.length);
  var shortTitles = h.filter(function(s) { return s.title && s.title.length < avgLen; });
  var longTitles = h.filter(function(s) { return s.title && s.title.length >= avgLen; });
  var shortAvg = shortTitles.length > 0 ? Math.round(shortTitles.reduce(function(s, x) { return s + (x.peakViewers || 0); }, 0) / shortTitles.length) : 0;
  var longAvg = longTitles.length > 0 ? Math.round(longTitles.reduce(function(s, x) { return s + (x.peakViewers || 0); }, 0) / longTitles.length) : 0;
  var titleAdvice = longAvg > shortAvg ? 'Longer titles (' + avgLen + '+ chars) correlate with ' + (longAvg - shortAvg) + ' more peak viewers' :
    shortAvg > longAvg ? 'Shorter titles (<' + avgLen + ' chars) correlate with ' + (shortAvg - longAvg) + ' more peak viewers' :
    'Title length has no significant impact on viewership';
  
  var topWords = Object.entries(titleWords).sort(function(a, b) { return b[1] - a[1]; }).slice(0, 8);
  var topWordsHtml = '';
  topWords.forEach(function(w) {
    topWordsHtml += '<span style="background:#2a1f3d;padding:4px 10px;border-radius:12px;font-size:11px;color:#ce93d8;margin:3px;display:inline-block">' + w[0] + ' <strong style="color:#fff">' + w[1] + 'x</strong></span>';
  });
  
  return '<div class="card" style="margin-top:15px">' +
    '<h3 style="margin-top:0">📝 Title Analysis</h3>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:10px">' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Avg Title Length</div><div style="font-size:20px;color:#ce93d8;font-weight:bold">' + avgLen + ' chars</div></div>' +
      '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Title Impact</div><div style="font-size:14px;color:#fff;font-weight:bold;margin-top:4px">' + titleAdvice + '</div></div>' +
    '</div>' +
    (topWordsHtml ? '<div style="margin-top:10px"><div style="color:#b0b0b0;font-size:11px;margin-bottom:6px">Most used words in titles:</div><div>' + topWordsHtml + '</div></div>' : '') +
  '</div>';
})();
}

// NEW: Reports Tab
export function renderReportsTab() {
  const { stats, isLive, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  const totalStreams = h.length;
  const totalHours = h.reduce((sum, s) => sum + ((s.durationMinutes || 0) / 60), 0);
  const peakViewersAll = Math.max(...h.map(s => s.peakViewers || 0), 0);
  const avgViewers = totalStreams > 0 ? Math.round(h.reduce((s, x) => s + (x.peakViewers || 0), 0) / totalStreams) : 0;
  const totalFollowers = h.reduce((s, x) => s + (x.followers || x.newFollowers || 0), 0);
  const totalSubs = h.reduce((s, x) => s + (x.subscribers || x.newSubs || 0), 0);
  const uniqueGamesArr = [...new Set(h.map(s => s.game || s.gameName || 'Unknown'))];
  const uniqueGames = uniqueGamesArr.length;
  const avgDuration = totalStreams > 0 ? (totalHours / totalStreams).toFixed(1) : '0.0';
  const medianViewers = (() => { const sorted = h.map(s => s.peakViewers || 0).sort((a, b) => a - b); return sorted.length > 0 ? sorted[Math.floor(sorted.length / 2)] : 0; })();
  const totalViewerHours = h.reduce((s, x) => s + ((x.averageViewers || x.peakViewers || 0) * ((x.durationMinutes || 0) / 60)), 0);

  // Longest stream
  const longestStream = h.reduce((best, s) => (s.durationMinutes || 0) > (best.durationMinutes || 0) ? s : best, h[0] || {});
  const longestGame = longestStream.game || longestStream.gameName || 'Unknown';
  const longestHrs = ((longestStream.durationMinutes || 0) / 60).toFixed(1);
  const longestDate = longestStream.startedAt || longestStream.date ? new Date(longestStream.startedAt || longestStream.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'N/A';

  // Most viewed stream
  const bestStream = h.reduce((best, s) => (s.peakViewers || 0) > (best.peakViewers || 0) ? s : best, h[0] || {});
  const bestStreamGame = bestStream.game || bestStream.gameName || 'Unknown';
  const bestStreamDate = bestStream.startedAt || bestStream.date ? new Date(bestStream.startedAt || bestStream.date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';

  // Most followers in one stream
  const bestFollowStream = h.reduce((best, s) => ((s.followers || s.newFollowers || 0) > (best.followers || best.newFollowers || 0)) ? s : best, h[0] || {});
  const bestFollows = bestFollowStream.followers || bestFollowStream.newFollowers || 0;
  const bestFollowGame = bestFollowStream.game || bestFollowStream.gameName || 'Unknown';

  // Most subs in one stream
  const bestSubStream = h.reduce((best, s) => ((s.subscribers || s.newSubs || 0) > (best.subscribers || best.newSubs || 0)) ? s : best, h[0] || {});
  const bestSubsCount = bestSubStream.subscribers || bestSubStream.newSubs || 0;
  const bestSubGame = bestSubStream.game || bestSubStream.gameName || 'Unknown';

  // Shortest stream
  const withDur = h.filter(s => (s.durationMinutes || 0) > 0);
  const shortestStream = withDur.length > 0 ? withDur.reduce((best, s) => (s.durationMinutes || Infinity) < (best.durationMinutes || Infinity) ? s : best, withDur[0]) : {};
  const shortestHrs = ((shortestStream.durationMinutes || 0) / 60).toFixed(1);
  const shortestGame = shortestStream.game || shortestStream.gameName || 'Unknown';

  // Streaker data - hot/cold streaks
  let currentStreak = 0, bestStreak = 0, worstStreak = 0, currentCold = 0, worstCold = 0;
  h.forEach(s => {
    if ((s.peakViewers || 0) >= avgViewers) {
      currentStreak++;
      currentCold = 0;
      if (currentStreak > bestStreak) bestStreak = currentStreak;
    } else {
      currentCold++;
      currentStreak = 0;
      if (currentCold > worstCold) worstCold = currentCold;
    }
  });

  // Streamer Level (gamification)
  const xpTotal = totalStreams * 100 + Math.round(totalHours * 50) + totalFollowers * 10 + totalSubs * 25 + peakViewersAll * 5;
  const levelThresholds = [0, 500, 1500, 3500, 7000, 12000, 20000, 35000, 55000, 80000, 120000];
  let streamerLevel = 1;
  for (let i = levelThresholds.length - 1; i >= 0; i--) { if (xpTotal >= levelThresholds[i]) { streamerLevel = i + 1; break; } }
  const nextLevelXP = levelThresholds[Math.min(streamerLevel, levelThresholds.length - 1)] || xpTotal + 1000;
  const xpProgress = streamerLevel <= levelThresholds.length ? Math.min(100, Math.round(((xpTotal - (levelThresholds[streamerLevel - 1] || 0)) / Math.max(1, (nextLevelXP - (levelThresholds[streamerLevel - 1] || 0)))) * 100)) : 100;
  const levelTitles = ['Newbie', 'Beginner', 'Regular', 'Enthusiast', 'Dedicated', 'Veteran', 'Expert', 'Master', 'Legend', 'Champion', 'Mythic'];
  const levelTitle = levelTitles[Math.min(streamerLevel - 1, levelTitles.length - 1)];

  // Monthly breakdown for report
  const monthlyData = {};
  h.forEach(s => {
    const d = new Date(s.startedAt || s.date);
    const key = d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0');
    if (!monthlyData[key]) monthlyData[key] = { streams: 0, viewers: 0, hours: 0, follows: 0, subs: 0, peak: 0 };
    monthlyData[key].streams++;
    monthlyData[key].viewers += (s.peakViewers || 0);
    monthlyData[key].hours += (s.durationMinutes || 0) / 60;
    monthlyData[key].follows += (s.followers || s.newFollowers || 0);
    monthlyData[key].subs += (s.subscribers || s.newSubs || 0);
    if ((s.peakViewers || 0) > monthlyData[key].peak) monthlyData[key].peak = s.peakViewers;
  });
  let monthlyTableHtml = '';
  const sortedMonths = Object.keys(monthlyData).sort().reverse();
  sortedMonths.forEach(m => {
    const d = monthlyData[m];
    const avgV = d.streams > 0 ? Math.round(d.viewers / d.streams) : 0;
    monthlyTableHtml += '<tr style="transition:background 0.2s" onmouseenter="this.style.background=\'#2a2f3a\'" onmouseleave="this.style.background=\'transparent\'">' +
      '<td style="padding:8px 10px;border-bottom:1px solid #2a2f3a;color:#b0b0b0;font-size:12px">' + m + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #2a2f3a;color:#fff;text-align:center">' + d.streams + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #2a2f3a;color:#9146ff;font-weight:bold;text-align:center">' + avgV + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #2a2f3a;color:#ff9800;text-align:center">' + d.peak + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #2a2f3a;color:#4caf50;text-align:center">' + d.hours.toFixed(1) + 'h</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #2a2f3a;color:#e91e63;text-align:center">' + d.follows + '</td>' +
      '<td style="padding:8px 10px;border-bottom:1px solid #2a2f3a;color:#ffd700;text-align:center">' + d.subs + '</td></tr>';
  });

  // Date range
  const firstStreamDate = h.length > 0 ? new Date(h[h.length - 1].startedAt || h[h.length - 1].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
  const lastStreamDate = h.length > 0 ? new Date(h[0].startedAt || h[0].date).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }) : 'N/A';
  const daySpan = h.length >= 2 ? Math.ceil((new Date(h[0].startedAt || h[0].date).getTime() - new Date(h[h.length - 1].startedAt || h[h.length - 1].date).getTime()) / (1000 * 60 * 60 * 24)) : 0;

  // Achievements/Milestones
  const achievements = [];
  if (totalStreams >= 1) achievements.push({ icon: '🎬', label: 'First Stream', desc: 'Completed your first stream!' });
  if (totalStreams >= 10) achievements.push({ icon: '🔟', label: '10 Streams', desc: 'Reached 10 total streams' });
  if (totalStreams >= 25) achievements.push({ icon: '🎯', label: '25 Streams', desc: 'Quarter century of streams!' });
  if (totalStreams >= 50) achievements.push({ icon: '🏅', label: '50 Streams', desc: 'Half a hundred!' });
  if (totalStreams >= 100) achievements.push({ icon: '💯', label: 'Centurion', desc: '100 streams completed' });
  if (totalHours >= 10) achievements.push({ icon: '⏰', label: '10 Hours', desc: '10 hours of total streaming' });
  if (totalHours >= 50) achievements.push({ icon: '⌛', label: '50 Hours', desc: '50 hours streamed' });
  if (totalHours >= 100) achievements.push({ icon: '🕐', label: '100 Hours', desc: 'Triple digit hours!' });
  if (peakViewersAll >= 50) achievements.push({ icon: '👀', label: '50 Peak', desc: 'Reached 50 peak viewers' });
  if (peakViewersAll >= 100) achievements.push({ icon: '🔥', label: '100 Peak', desc: 'Hit 100 peak viewers' });
  if (peakViewersAll >= 500) achievements.push({ icon: '🌟', label: '500 Peak', desc: '500 viewer milestone!' });
  if (uniqueGames >= 5) achievements.push({ icon: '🎮', label: 'Variety Pro', desc: 'Played 5+ different games' });
  if (uniqueGames >= 10) achievements.push({ icon: '🌈', label: 'Game Explorer', desc: 'Streamed 10+ unique games' });
  if (bestStreak >= 5) achievements.push({ icon: '🔥', label: 'Hot Streak', desc: '5+ above-avg streams in a row' });
  if (totalFollowers >= 100) achievements.push({ icon: '❤️', label: '100 Follows', desc: 'Earned 100 followers' });
  if (totalSubs >= 50) achievements.push({ icon: '⭐', label: '50 Subs', desc: 'Gained 50 subscribers' });
  let achievementsHtml = '';
  achievements.forEach(a => {
    achievementsHtml += '<div style="background:#26262c;padding:12px 15px;border-radius:6px;display:flex;align-items:center;gap:12px">' +
      '<span style="font-size:24px">' + a.icon + '</span>' +
      '<div><div style="color:#fff;font-weight:bold;font-size:13px">' + a.label + '</div>' +
      '<div style="color:#666;font-size:11px">' + a.desc + '</div></div></div>';
  });

  // Stream history table (last 30 now with more columns)
  const last30 = h.slice(-30).reverse();
  let historyTableHtml = '';
  last30.forEach((s, idx) => {
    const date = new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: '2-digit' });
    const game = s.game || s.gameName || 'Unknown';
    const dur = ((s.durationMinutes || 0) / 60).toFixed(1);
    const peak = s.peakViewers || 0;
    const avg = s.averageViewers || peak;
    const fol = s.followers || s.newFollowers || 0;
    const sub = s.subscribers || s.newSubs || 0;
    const viewerColor = peak >= avgViewers ? '#4caf50' : '#ef5350';
    const dayName = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(s.startedAt || s.date).getDay()];
    historyTableHtml += '<tr style="transition:background 0.2s" onmouseenter="this.style.background=\'#2a2f3a\'" onmouseleave="this.style.background=\'transparent\'">' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;color:#b0b0b0;font-size:11px">' + date + '</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;color:#666;font-size:11px">' + dayName + '</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;font-size:12px">' + game + '</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;color:' + viewerColor + ';font-weight:bold;text-align:center;font-size:12px">' + peak + '</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;color:#b0b0b0;text-align:center;font-size:12px">' + avg + '</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;color:#b0b0b0;text-align:center;font-size:12px">' + dur + 'h</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;color:#e91e63;text-align:center;font-size:12px">' + fol + '</td>' +
      '<td style="padding:8px 6px;border-bottom:1px solid #2a2f3a;color:#ffd700;text-align:center;font-size:12px">' + sub + '</td></tr>';
  });

  // Game summary for report
  const gameStats = {};
  h.forEach(s => {
    const g = s.game || s.gameName || 'Unknown';
    if (!gameStats[g]) gameStats[g] = { streams: 0, totalViewers: 0, hours: 0 };
    gameStats[g].streams++;
    gameStats[g].totalViewers += (s.peakViewers || 0);
    gameStats[g].hours += (s.durationMinutes || 0) / 60;
  });
  const topGamesArr = Object.entries(gameStats).sort((a, b) => (b[1].totalViewers / b[1].streams) - (a[1].totalViewers / a[1].streams)).slice(0, 5);
  let topGamesHtml = '';
  topGamesArr.forEach((g, i) => {
    const pct = totalStreams > 0 ? Math.round((g[1].streams / totalStreams) * 100) : 0;
    topGamesHtml += '<div style="display:flex;align-items:center;gap:10px;margin-bottom:8px">' +
      '<span style="color:#ffd700;font-weight:bold;width:20px">#' + (i + 1) + '</span>' +
      '<span style="color:#fff;flex:1">' + g[0] + '</span>' +
      '<span style="color:#9146ff;font-size:12px">' + g[1].streams + ' streams</span>' +
      '<span style="color:#b0b0b0;font-size:12px">' + pct + '%</span></div>';
  });

  return '<div class="card">' +
  '<h2>📋 Reports & Export</h2>' +
  '<div style="display:flex;gap:10px;flex-wrap:wrap;margin:15px 0">' +
    '<button class="small" style="background:#4caf50;color:#fff;border:none;cursor:pointer;padding:10px 20px;border-radius:6px;font-weight:bold" onclick="exportAsJSON()">📥 Export JSON</button>' +
    '<button class="small" style="background:#2196f3;color:#fff;border:none;cursor:pointer;padding:10px 20px;border-radius:6px;font-weight:bold" onclick="exportAsCSV()">📥 Export CSV</button>' +
  '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">📊 Channel Summary</h3>' +
  '<div style="color:#b0b0b0;font-size:12px;margin-bottom:10px">' + firstStreamDate + ' to ' + lastStreamDate + ' (' + daySpan + ' days)</div>' +
  '<div style="display:grid;grid-template-columns:repeat(5,1fr);gap:8px;margin-top:10px">' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Streams</div>' +
      '<div style="font-size:18px;color:#9146ff;font-weight:bold">' + totalStreams + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Hours</div>' +
      '<div style="font-size:18px;color:#4caf50;font-weight:bold">' + totalHours.toFixed(1) + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">All-Time Peak</div>' +
      '<div style="font-size:18px;color:#ff9800;font-weight:bold">' + peakViewersAll + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Avg Peak</div>' +
      '<div style="font-size:18px;color:#2196f3;font-weight:bold">' + avgViewers + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Median</div>' +
      '<div style="font-size:18px;color:#00bcd4;font-weight:bold">' + medianViewers + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Avg Dur</div>' +
      '<div style="font-size:18px;color:#ab47bc;font-weight:bold">' + avgDuration + 'h</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Games</div>' +
      '<div style="font-size:18px;color:#795548;font-weight:bold">' + uniqueGames + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Viewer-Hrs</div>' +
      '<div style="font-size:18px;color:#009688;font-weight:bold">' + Math.round(totalViewerHours).toLocaleString() + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Follows</div>' +
      '<div style="font-size:18px;color:#e91e63;font-weight:bold">' + totalFollowers + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Subs</div>' +
      '<div style="font-size:18px;color:#ffd700;font-weight:bold">' + totalSubs + '</div>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🏅 Personal Records</h3>' +
  '<div style="display:grid;grid-template-columns:repeat(3,1fr);gap:10px;margin-top:10px">' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #ffd700">' +
      '<div style="font-size:12px;color:#fff;font-weight:bold">👑 Most Viewed</div>' +
      '<div style="color:#ffd700;font-weight:bold;font-size:16px;margin-top:4px">' + (bestStream.peakViewers || 0) + ' viewers</div>' +
      '<div style="color:#666;font-size:11px">' + bestStreamGame + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #9146ff">' +
      '<div style="font-size:12px;color:#fff;font-weight:bold">⏱️ Longest</div>' +
      '<div style="color:#9146ff;font-weight:bold;font-size:16px;margin-top:4px">' + longestHrs + 'h</div>' +
      '<div style="color:#666;font-size:11px">' + longestGame + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #4caf50">' +
      '<div style="font-size:12px;color:#fff;font-weight:bold">⚡ Shortest</div>' +
      '<div style="color:#4caf50;font-weight:bold;font-size:16px;margin-top:4px">' + shortestHrs + 'h</div>' +
      '<div style="color:#666;font-size:11px">' + shortestGame + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #e91e63">' +
      '<div style="font-size:12px;color:#fff;font-weight:bold">❤️ Most Follows</div>' +
      '<div style="color:#e91e63;font-weight:bold;font-size:16px;margin-top:4px">' + bestFollows + '</div>' +
      '<div style="color:#666;font-size:11px">' + bestFollowGame + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #ff9800">' +
      '<div style="font-size:12px;color:#fff;font-weight:bold">⭐ Most Subs</div>' +
      '<div style="color:#ff9800;font-weight:bold;font-size:16px;margin-top:4px">' + bestSubsCount + '</div>' +
      '<div style="color:#666;font-size:11px">' + bestSubGame + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;border-left:3px solid #2196f3">' +
      '<div style="font-size:12px;color:#fff;font-weight:bold">🔥 Hot Streak</div>' +
      '<div style="color:#2196f3;font-weight:bold;font-size:16px;margin-top:4px">' + bestStreak + ' above avg</div>' +
      '<div style="color:#666;font-size:11px">Cold: ' + worstCold + '</div>' +
    '</div>' +
  '</div>' +
'</div>' +

(achievementsHtml ? '<div class="card" style="margin-top:15px">' +
  '<div style="display:flex;align-items:center;justify-content:space-between">' +
    '<h3 style="margin-top:0">🎖️ Achievements (' + achievements.length + ')</h3>' +
    '<button onclick="document.getElementById(\'achievements-popup\').style.display=\'flex\'" style="background:#9146ff;color:#fff;border:none;cursor:pointer;padding:8px 16px;border-radius:6px;font-size:12px;font-weight:bold">View All</button>' +
  '</div>' +
  '<div style="display:flex;gap:6px;flex-wrap:wrap;margin-top:8px">' +
    achievements.slice(0, 5).map(function(a) { return '<span style="background:#26262c;padding:6px 10px;border-radius:12px;font-size:11px;color:#ffd700">' + a.icon + ' ' + a.label + '</span>'; }).join('') +
    (achievements.length > 5 ? '<span style="background:#26262c;padding:6px 10px;border-radius:12px;font-size:11px;color:#666">+' + (achievements.length - 5) + ' more</span>' : '') +
  '</div>' +
'</div>' +
'<div id="achievements-popup" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.7);z-index:9999;justify-content:center;align-items:center" onclick="if(event.target===this)this.style.display=\'none\'">' +
  '<div style="background:#1e1e24;border-radius:12px;padding:25px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto">' +
    '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:15px">' +
      '<h3 style="margin:0;color:#fff">🎖️ All Achievements (' + achievements.length + ')</h3>' +
      '<button onclick="document.getElementById(\'achievements-popup\').style.display=\'none\'" style="background:none;border:none;color:#666;font-size:20px;cursor:pointer">✕</button>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px">' +
      achievementsHtml +
    '</div>' +
  '</div>' +
'</div>' : '') +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🎮 Top Games Summary</h3>' +
  '<div style="margin-top:10px">' + topGamesHtml + '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">📅 Monthly Breakdown</h3>' +
  '<div style="overflow-x:auto">' +
  '<table style="width:100%;border-collapse:collapse;margin-top:10px">' +
    '<thead><tr style="background:#26262c">' +
      '<th style="padding:8px 10px;text-align:left;font-size:12px">Month</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Streams</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Avg Peak</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Best</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Hours</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Follows</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Subs</th>' +
    '</tr></thead>' +
    '<tbody>' + (monthlyTableHtml || '<tr><td colspan="7" style="padding:20px;text-align:center;color:#b0b0b0">No data</td></tr>') + '</tbody>' +
  '</table></div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">📜 Stream History</h3>' +
  '<div style="overflow-x:auto;max-height:360px;overflow-y:auto" id="stream-history-scroll">' +
  '<table style="width:100%;border-collapse:collapse;margin-top:10px" id="stream-history-table">' +
    '<thead style="position:sticky;top:0;z-index:1"><tr style="background:#26262c">' +
      '<th style="padding:8px 6px;text-align:left;font-size:11px">Date</th>' +
      '<th style="padding:8px 6px;text-align:left;font-size:11px">Day</th>' +
      '<th style="padding:8px 6px;text-align:left;font-size:11px">Game</th>' +
      '<th style="padding:8px 6px;text-align:center;font-size:11px">Peak</th>' +
      '<th style="padding:8px 6px;text-align:center;font-size:11px">Avg</th>' +
      '<th style="padding:8px 6px;text-align:center;font-size:11px">Dur</th>' +
      '<th style="padding:8px 6px;text-align:center;font-size:11px">Fol</th>' +
      '<th style="padding:8px 6px;text-align:center;font-size:11px">Sub</th>' +
    '</tr></thead>' +
    '<tbody>' + (historyTableHtml || '<tr><td colspan="8" style="padding:20px;text-align:center;color:#b0b0b0">No stream history</td></tr>') + '</tbody>' +
  '</table></div>' +
  '<div style="text-align:center;margin-top:8px" id="history-load-more-wrap">' +
    '<button id="history-load-more" onclick="loadMoreHistory()" style="background:#26262c;color:#b0b0b0;border:1px solid #333;cursor:pointer;padding:8px 24px;border-radius:6px;font-size:12px">Load More ▼</button>' +
  '</div>' +
  '<script>' +
  '(function(){' +
    'var rows=document.querySelectorAll("#stream-history-table tbody tr");' +
    'var shown=4;' +
    'rows.forEach(function(r,i){if(i>=shown)r.style.display="none";});' +
    'window.loadMoreHistory=function(){' +
      'shown+=4;' +
      'rows.forEach(function(r,i){if(i<shown)r.style.display="";});' +
      'if(shown>=rows.length)document.getElementById("history-load-more-wrap").style.display="none";' +
    '};' +
    'if(rows.length<=4)document.getElementById("history-load-more-wrap").style.display="none";' +
  '})();' +
  '<\/script>' +
'</div>' +

(function() {
  var titledStreams = h.filter(function(s) { return s.title && s.title.length > 0; });
  if (titledStreams.length < 2) return '';
  
  var recent15 = titledStreams.slice(-15).reverse();
  var titleTableHtml = '';
  recent15.forEach(function(s, i) {
    var date = new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    var game = s.game || s.gameName || 'Unknown';
    var peak = s.peakViewers || 0;
    var titleLen = s.title.length;
    var rowBg = i % 2 === 0 ? '#26262c' : '#1e1e24';
    titleTableHtml += '<tr style="background:' + rowBg + '">' +
      '<td style="padding:6px 8px;font-size:11px;color:#b0b0b0">' + date + '</td>' +
      '<td style="padding:6px 8px;font-size:11px;color:#fff;max-width:300px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + s.title.replace(/"/g, '&quot;') + '">' + s.title.substring(0, 80) + (s.title.length > 80 ? '...' : '') + '</td>' +
      '<td style="padding:6px 8px;font-size:11px;color:#ce93d8;text-align:center">' + game + '</td>' +
      '<td style="padding:6px 8px;font-size:12px;color:#ffd700;text-align:center;font-weight:bold">' + peak + '</td>' +
      '<td style="padding:6px 8px;font-size:11px;color:#666;text-align:center">' + titleLen + '</td>' +
    '</tr>';
  });
  
  var uniqueTitles = new Set(titledStreams.map(function(s) { return s.title; }));
  var reuseRate = titledStreams.length > 0 ? Math.round(((titledStreams.length - uniqueTitles.size) / titledStreams.length) * 100) : 0;
  
  return '<div class="card" style="margin-top:15px">' +
    '<h3 style="margin-top:0">📝 Stream Title History</h3>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin:10px 0">' +
      '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total Titled</div><div style="font-size:18px;color:#9146ff;font-weight:bold">' + titledStreams.length + '</div></div>' +
      '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Unique Titles</div><div style="font-size:18px;color:#4caf50;font-weight:bold">' + uniqueTitles.size + '</div></div>' +
      '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Reuse Rate</div><div style="font-size:18px;color:#ff9800;font-weight:bold">' + reuseRate + '%</div></div>' +
    '</div>' +
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:8px">' +
      '<thead><tr style="background:#26262c">' +
        '<th style="padding:6px 8px;text-align:left;font-size:11px">Date</th>' +
        '<th style="padding:6px 8px;text-align:left;font-size:11px">Title</th>' +
        '<th style="padding:6px 8px;text-align:center;font-size:11px">Game</th>' +
        '<th style="padding:6px 8px;text-align:center;font-size:11px">Peak</th>' +
        '<th style="padding:6px 8px;text-align:center;font-size:11px">Len</th>' +
      '</tr></thead>' +
      '<tbody>' + titleTableHtml + '</tbody>' +
    '</table></div>' +
  '</div>';
})() +

(function() {
  var sugs = suggestions || [];
  if (sugs.length < 1) return '';
  var totalSugs = sugs.length;
  var statusCounts = {};
  sugs.forEach(function(s) { var st = s.status || 'Pending'; statusCounts[st] = (statusCounts[st] || 0) + 1; });
  var totalUpvotes = sugs.reduce(function(s, x) { return s + (x.upvotes || 0); }, 0);
  var topSug = sugs.slice().sort(function(a, b) { return (b.upvotes || 0) - (a.upvotes || 0); })[0];
  var uniqueSuggesters = new Set(sugs.map(function(s) { return s.user || s.userId; })).size;
  
  var statusHtml = '';
  var statusColors = { 'Pending': '#ff9800', 'In Progress': '#2196f3', 'Completed': '#4caf50', 'Rejected': '#ef5350' };
  Object.entries(statusCounts).forEach(function(e) {
    var color = statusColors[e[0]] || '#666';
    statusHtml += '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center;border-top:3px solid ' + color + '">' +
      '<div style="color:#b0b0b0;font-size:10px">' + e[0] + '</div>' +
      '<div style="font-size:20px;color:' + color + ';font-weight:bold">' + e[1] + '</div></div>';
  });
  
  return '<div class="card" style="margin-top:15px">' +
    '<h3 style="margin-top:0">💡 Suggestion Analytics</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin:10px 0">' +
      '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total</div><div style="font-size:18px;color:#9146ff;font-weight:bold">' + totalSugs + '</div></div>' +
      '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Upvotes</div><div style="font-size:18px;color:#ffd700;font-weight:bold">' + totalUpvotes + '</div></div>' +
      '<div style="background:#26262c;padding:10px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Suggesters</div><div style="font-size:18px;color:#4caf50;font-weight:bold">' + uniqueSuggesters + '</div></div>' +
      statusHtml +
    '</div>' +
    (topSug ? '<div style="padding:10px;background:#26262c;border-radius:6px;border-left:3px solid #ffd700;margin-top:8px">' +
      '<div style="font-size:12px;color:#ffd700;font-weight:bold">Top Suggestion (' + (topSug.upvotes || 0) + ' upvotes)</div>' +
      '<div style="color:#fff;font-size:12px;margin-top:4px">"' + (topSug.suggestion || '').substring(0, 120) + '"</div>' +
      '<div style="color:#666;font-size:10px;margin-top:3px">by ' + (topSug.user || 'Unknown') + ' | ' + (topSug.status || 'Pending') + '</div>' +
    '</div>' : '') +
  '</div>';
})() +

'<div style="text-align:center;margin-top:15px;padding:10px;color:#666;font-size:11px">' +
  'Report generated: ' + new Date().toLocaleString() + ' | ' + totalStreams + ' streams over ' + daySpan + ' days' +
'</div>' +

'<script>' +
'function exportAsJSON() {' +
  'var data = JSON.stringify((window.analyticsData || { history: history }), null, 2);' +
  'var blob = new Blob([data], { type: "application/json" });' +
  'var url = URL.createObjectURL(blob);' +
  'var a = document.createElement("a");' +
  'a.href = url;' +
  'a.download = "stream_analytics_" + new Date().toISOString().split("T")[0] + ".json";' +
  'a.click();' +
  'URL.revokeObjectURL(url);' +
'}' +
'function exportAsCSV() {' +
  'var h = (window.analyticsData || { history: history }).history;' +
  'if (!h || !h.length) { alert("No data to export"); return; }' +
  'var headers = ["Date","Game","Peak Viewers","Avg Viewers","Duration (min)","Followers","Subscribers"];' +
  'var rows = h.map(function(s) { return [' +
    'new Date(s.startedAt || s.date).toISOString().split("T")[0],' +
    '(s.game || s.gameName || "Unknown").replace(/,/g, " "),' +
    's.peakViewers || 0,' +
    's.averageViewers || s.peakViewers || 0,' +
    's.durationMinutes || 0,' +
    's.followers || s.newFollowers || 0,' +
    's.subscribers || s.newSubs || 0' +
  ']; });' +
  'var csv = [headers.join(",")].concat(rows.map(function(r) { return r.join(","); })).join("\\n");' +
  'var blob = new Blob([csv], { type: "text/csv" });' +
  'var url = URL.createObjectURL(blob);' +
  'var a = document.createElement("a");' +
  'a.href = url;' +
  'a.download = "stream_stats_" + new Date().toISOString().split("T")[0] + ".csv";' +
  'a.click();' +
  'URL.revokeObjectURL(url);' +
'}' +
'</script>';
}

export function renderCommunityStatsTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  // ===== LEVELING DATA =====
  const levelEntries = Object.entries(leveling || {});
  const totalMembers = levelEntries.length;
  const totalXP = levelEntries.reduce(function(s, e) { return s + (e[1].xp || 0); }, 0);
  const avgXP = totalMembers > 0 ? Math.round(totalXP / totalMembers) : 0;
  const avgLevel = totalMembers > 0 ? (levelEntries.reduce(function(s, e) { return s + (e[1].level || 0); }, 0) / totalMembers).toFixed(1) : '0.0';
  const maxLevel = levelEntries.reduce(function(best, e) { return (e[1].level || 0) > (best[1].level || 0) ? e : best; }, ['', {level: 0, xp: 0}]);
  const topByXP = levelEntries.map(function(e) { return { id: e[0], xp: e[1].xp || 0, level: e[1].level || 0, lastMsg: e[1].lastMsg || 0 }; }).sort(function(a, b) { return b.xp - a.xp; });
  const top10 = topByXP.slice(0, 10);

  // Level distribution buckets
  var lvlDist = { '0': 0, '1-5': 0, '6-10': 0, '11-15': 0, '16-20': 0, '21-25': 0, '26-30': 0, '31+': 0 };
  levelEntries.forEach(function(e) {
    var lv = e[1].level || 0;
    if (lv === 0) lvlDist['0']++;
    else if (lv <= 5) lvlDist['1-5']++;
    else if (lv <= 10) lvlDist['6-10']++;
    else if (lv <= 15) lvlDist['11-15']++;
    else if (lv <= 20) lvlDist['16-20']++;
    else if (lv <= 25) lvlDist['21-25']++;
    else if (lv <= 30) lvlDist['26-30']++;
    else lvlDist['31+']++;
  });
  var lvlDistMax = Math.max.apply(null, Object.values(lvlDist).concat([1]));
  var lvlDistHtml = '';
  Object.entries(lvlDist).forEach(function(entry) {
    var pct = Math.round((entry[1] / lvlDistMax) * 100);
    lvlDistHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">' +
      '<span style="color:#b0b0b0;width:50px;font-size:12px;text-align:right">Lv ' + entry[0] + '</span>' +
      '<div style="flex:1;background:#2b2d31;border-radius:3px;height:22px;overflow:hidden"><div style="background:linear-gradient(90deg,#9146ff,#ce93d8);height:100%;width:' + pct + '%;border-radius:3px;display:flex;align-items:center;padding-left:6px"><span style="font-size:10px;color:#fff;font-weight:bold">' + (entry[1] > 0 ? entry[1] : '') + '</span></div></div></div>';
  });

  // Active members (messaged in last 7 days)
  var sevenDaysAgo = Date.now() - 7 * 24 * 60 * 60 * 1000;
  var thirtyDaysAgo = Date.now() - 30 * 24 * 60 * 60 * 1000;
  var activeWeek = levelEntries.filter(function(e) { return (e[1].lastMsg || 0) > sevenDaysAgo; }).length;
  var activeMonth = levelEntries.filter(function(e) { return (e[1].lastMsg || 0) > thirtyDaysAgo; }).length;
  var dormant = totalMembers - activeMonth;
  var activityRate = totalMembers > 0 ? Math.round((activeWeek / totalMembers) * 100) : 0;

  // Top 10 table
  var userNameCache = {};
  Object.entries(membersCache?.members || {}).forEach(function(entry) { userNameCache[entry[0]] = entry[1].displayName || entry[1].username || ('User-' + entry[0].slice(-4)); });
  var top10Html = '';
  top10.forEach(function(u, i) {
    var rankIcon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '#' + (i + 1);
    var lastActive = u.lastMsg > 0 ? new Date(u.lastMsg).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'N/A';
    var rowBg = i % 2 === 0 ? '#26262c' : '#1e1e24';
    var displayName = userNameCache[u.id] || ('User-' + u.id.slice(-4));
    top10Html += '<tr style="background:' + rowBg + '">' +
      '<td style="padding:6px 8px;font-size:13px">' + rankIcon + '</td>' +
      '<td style="padding:6px 8px;font-size:12px;color:#e0e0e0;max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + u.id + '">' + displayName + '</td>' +
      '<td style="padding:6px 8px;text-align:center;font-size:13px;color:#9146ff;font-weight:bold">' + u.level + '</td>' +
      '<td style="padding:6px 8px;text-align:center;font-size:13px;color:#ffd700;font-weight:bold">' + u.xp.toLocaleString() + '</td>' +
      '<td style="padding:6px 8px;text-align:center;font-size:11px;color:#666">' + lastActive + '</td>' +
    '</tr>';
  });

  // ===== COMMAND USAGE DATA =====
  var cmdUsage = commandUsage || {};
  var cmdEntries = Object.entries(cmdUsage);
  var totalCmdUses = cmdEntries.reduce(function(s, e) { return s + (e[1].total || 0); }, 0);
  var uniqueCmdUsers = new Set();
  cmdEntries.forEach(function(e) {
    if (e[1].userCounts) Object.keys(e[1].userCounts).forEach(function(uid) { uniqueCmdUsers.add(uid); });
  });
  var cmdsSorted = cmdEntries.map(function(e) {
    var userCount = e[1].userCounts ? Object.keys(e[1].userCounts).length : 0;
    var lastUsedStr = e[1].lastUsed ? new Date(e[1].lastUsed).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : 'Never';
    return { name: e[0], total: e[1].total || 0, users: userCount, lastUsed: lastUsedStr };
  }).sort(function(a, b) { return b.total - a.total; });
  var cmdMaxUse = cmdsSorted.length > 0 ? cmdsSorted[0].total : 1;

  var cmdTableHtml = '';
  cmdsSorted.forEach(function(c, i) {
    var pct = Math.round((c.total / cmdMaxUse) * 100);
    var rowBg = i % 2 === 0 ? '#26262c' : '#1e1e24';
    cmdTableHtml += '<tr style="background:' + rowBg + '">' +
      '<td style="padding:8px 10px;font-size:13px;color:#ce93d8;font-weight:bold">/' + c.name + '</td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:13px;color:#fff;font-weight:bold">' + c.total + '</td>' +
      '<td style="padding:8px 10px"><div style="background:#2b2d31;border-radius:3px;height:16px;overflow:hidden"><div style="background:#9146ff;height:100%;width:' + pct + '%;border-radius:3px"></div></div></td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:12px;color:#b0b0b0">' + c.users + '</td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:11px;color:#666">' + c.lastUsed + '</td>' +
    '</tr>';
  });

  // Top command users across all commands
  var userCmdTotals = {};
  cmdEntries.forEach(function(e) {
    if (e[1].userCounts) {
      Object.entries(e[1].userCounts).forEach(function(uc) {
        if (!userCmdTotals[uc[0]]) userCmdTotals[uc[0]] = { username: uc[1].username || uc[0], total: 0 };
        userCmdTotals[uc[0]].total += uc[1].count || 0;
      });
    }
  });
  var topCmdUsers = Object.entries(userCmdTotals).map(function(e) { return { id: e[0], username: e[1].username, total: e[1].total }; }).sort(function(a, b) { return b.total - a.total; }).slice(0, 5);
  var topCmdUsersHtml = '';
  topCmdUsers.forEach(function(u, i) {
    var icon = i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : '🏅';
    topCmdUsersHtml += '<div style="display:flex;align-items:center;gap:10px;padding:10px;background:#26262c;border-radius:6px;margin-bottom:6px">' +
      '<span style="font-size:18px">' + icon + '</span>' +
      '<span style="color:#fff;font-weight:bold;flex:1">' + u.username + '</span>' +
      '<span style="color:#9146ff;font-weight:bold">' + u.total + ' uses</span></div>';
  });

  // Command usage over time (by day of week)
  var cmdByDay = { Sun: 0, Mon: 0, Tue: 0, Wed: 0, Thu: 0, Fri: 0, Sat: 0 };
  var dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  cmdEntries.forEach(function(e) {
    if (e[1].history) {
      e[1].history.forEach(function(h) {
        if (h.timestamp) {
          var day = new Date(h.timestamp).getDay();
          cmdByDay[dayNames[day]]++;
        }
      });
    }
  });
  var cmdDayMax = Math.max.apply(null, Object.values(cmdByDay).concat([1]));
  var cmdDayHtml = '';
  dayNames.forEach(function(day) {
    var pct = Math.round((cmdByDay[day] / cmdDayMax) * 100);
    var color = cmdByDay[day] === cmdDayMax ? '#9146ff' : '#555';
    cmdDayHtml += '<div style="flex:1;text-align:center">' +
      '<div style="height:80px;display:flex;flex-direction:column;justify-content:flex-end;align-items:center">' +
        '<div style="width:24px;background:' + color + ';height:' + Math.max(pct, 5) + '%;border-radius:3px 3px 0 0"></div>' +
      '</div>' +
      '<div style="font-size:10px;color:#b0b0b0;margin-top:4px">' + day + '</div>' +
      '<div style="font-size:10px;color:#666">' + cmdByDay[day] + '</div></div>';
  });

  // ===== CUSTOM COMMANDS =====
  var custCmds = (customCommands || []).slice().sort(function(a, b) { return (b.uses || 0) - (a.uses || 0); });
  var totalCustUses = custCmds.reduce(function(s, c) { return s + (c.uses || 0); }, 0);
  var custMax = custCmds.length > 0 ? Math.max(custCmds[0].uses || 0, 1) : 1;
  var custCmdsHtml = '';
  custCmds.slice(0, 15).forEach(function(c, i) {
    var uses = c.uses || 0;
    var pct = Math.max(Math.round((uses / custMax) * 100), uses > 0 ? 8 : 2);
    var rankColor = i === 0 ? '#ffd700' : i === 1 ? '#c0c0c0' : i === 2 ? '#cd7f32' : '#666';
    var lastUser = (c.usageHistory && c.usageHistory.length > 0) ? c.usageHistory[0].displayName || c.usageHistory[0].username || '' : '';
    var lastUsedStr = (c.usageHistory && c.usageHistory.length > 0) ? new Date(c.usageHistory[0].timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
    var tooltip = uses > 0 ? (uses + ' uses' + (lastUser ? ' | Last: ' + lastUser + ' (' + lastUsedStr + ')' : '')) : 'No uses yet';
    custCmdsHtml += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:6px" title="' + tooltip + '">' +
      '<span style="color:' + rankColor + ';font-weight:bold;width:18px;text-align:center;font-size:12px">' + (i + 1) + '</span>' +
      '<span style="color:#ce93d8;font-weight:bold;min-width:90px;max-width:120px;font-size:12px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">!' + (c.name || c.command || '???') + '</span>' +
      '<div style="flex:1;background:#2b2d31;border-radius:3px;height:18px;overflow:hidden;position:relative"><div style="background:linear-gradient(90deg,#ff9800,#ffb74d);height:100%;width:' + pct + '%;border-radius:3px;min-width:24px"></div><span style="position:absolute;right:6px;top:50%;transform:translateY(-50%);font-size:10px;color:#e0e0e0;font-weight:bold">' + uses + '</span></div>' +
      (lastUsedStr ? '<span style="font-size:10px;color:#666;min-width:50px;text-align:right">' + lastUsedStr + '</span>' : '') +
    '</div>';
  });

  // ===== GIVEAWAYS =====
  var ga = giveaways || [];
  var totalGiveaways = ga.length;
  var totalGAEntries = ga.reduce(function(s, g) { return s + (g.entryCount || (g._entriesCache ? g._entriesCache.entries.length : 0) || 0); }, 0);
  var avgGAEntries = totalGiveaways > 0 ? (totalGAEntries / totalGiveaways).toFixed(1) : '0';
  var gaHtml = '';
  ga.forEach(function(g, i) {
    var entryCount = g.entryCount || (g._entriesCache ? g._entriesCache.entries.length : 0) || 0;
    var winnerCount = g.winners ? g.winners.length : 0;
    var endDate = g.endTime ? new Date(g.endTime).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }) : 'Unknown';
    var status = g.active ? '🟢 Active' : '🔴 Ended';
    var rowBg = i % 2 === 0 ? '#26262c' : '#1e1e24';
    gaHtml += '<tr style="background:' + rowBg + '">' +
      '<td style="padding:8px 10px;font-size:13px;color:#fff">' + (g.prize || 'Unknown') + '</td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:12px">' + status + '</td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:13px;color:#ffd700;font-weight:bold">' + entryCount + '</td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:13px;color:#4caf50;font-weight:bold">' + winnerCount + '</td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:11px;color:#b0b0b0">' + endDate + '</td>' +
      '<td style="padding:8px 10px;text-align:center;font-size:11px;color:#666">' + (g.createdBy || 'Unknown') + '</td>' +
    '</tr>';
  });

  // ===== POLLS =====
  var pl = polls || [];
  var totalPolls = pl.length;
  var totalPollVotes = pl.reduce(function(s, p) { return s + (p.results ? p.results.reduce(function(vs, r) { return vs + (r.votes || 0); }, 0) : 0); }, 0);
  var pollsHtml = '';
  pl.forEach(function(p) {
    var totalV = p.results ? p.results.reduce(function(s, r) { return s + (r.votes || 0); }, 0) : 0;
    pollsHtml += '<div style="background:#26262c;padding:15px;border-radius:8px;margin-bottom:12px">' +
      '<div style="font-weight:bold;color:#fff;font-size:14px;margin-bottom:10px">📊 ' + (p.question || 'Unknown Poll') + '</div>' +
      '<div style="color:#666;font-size:11px;margin-bottom:10px">' + (p.active ? '🟢 Active' : '🔴 Ended') + ' | ' + totalV + ' total votes</div>';
    if (p.results) {
      p.results.forEach(function(r) {
        var pct = totalV > 0 ? Math.round((r.votes / totalV) * 100) : 0;
        var isWinner = r.votes === Math.max.apply(null, p.results.map(function(x) { return x.votes || 0; })) && r.votes > 0;
        pollsHtml += '<div style="margin-bottom:6px">' +
          '<div style="display:flex;justify-content:space-between;margin-bottom:3px">' +
            '<span style="color:#b0b0b0;font-size:12px">' + (isWinner ? '👑 ' : '') + r.option + '</span>' +
            '<span style="color:#fff;font-size:12px;font-weight:bold">' + r.votes + ' (' + pct + '%)</span>' +
          '</div>' +
          '<div style="background:#2b2d31;border-radius:3px;height:18px;overflow:hidden"><div style="background:' + (isWinner ? 'linear-gradient(90deg,#ffd700,#ffb74d)' : 'linear-gradient(90deg,#9146ff,#ce93d8)') + ';height:100%;width:' + pct + '%;border-radius:3px"></div></div>' +
        '</div>';
      });
    }
    pollsHtml += '</div>';
  });

  // ===== NOTIFICATION HISTORY =====
  var nh = notificationHistory || [];
  var totalNotifs = nh.length;
  var notifTypes = {};
  nh.forEach(function(n) {
    var t = n.type || 'unknown';
    notifTypes[t] = (notifTypes[t] || 0) + 1;
  });
  var notifTypesHtml = '';
  var notifColors = { live: '#4caf50', offline: '#ef5350', follow: '#e91e63', game: '#9146ff', title: '#ff9800', viewer: '#2196f3', raid: '#ffd700', clip: '#00bcd4' };
  Object.entries(notifTypes).sort(function(a, b) { return b[1] - a[1]; }).forEach(function(nt) {
    var color = notifColors[nt[0]] || '#666';
    notifTypesHtml += '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center;border-top:3px solid ' + color + '">' +
      '<div style="color:#b0b0b0;font-size:10px;text-transform:uppercase">' + nt[0] + '</div>' +
      '<div style="font-size:20px;color:' + color + ';font-weight:bold;margin-top:4px">' + nt[1] + '</div></div>';
  });

  // ===== SCHEDULE OVERVIEW =====
  var sched = schedule || {};
  var weekly = sched.weekly || {};
  var schedHtml = '';
  var schedDays = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'];
  var schedLabels = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
  schedDays.forEach(function(day, i) {
    var s = weekly[day];
    if (s) {
      var hour = s.hour || 0;
      var min = s.minute || 0;
      var ampm = hour >= 12 ? 'PM' : 'AM';
      var h12 = hour > 12 ? hour - 12 : (hour === 0 ? 12 : hour);
      var timeStr = h12 + ':' + (min < 10 ? '0' : '') + min + ' ' + ampm;
      var isWeekend = i >= 5;
      var bg = isWeekend ? '#2a1f3d' : '#26262c';
      schedHtml += '<div style="background:' + bg + ';padding:12px;border-radius:6px;text-align:center;border-left:3px solid ' + (isWeekend ? '#e91e63' : '#9146ff') + '">' +
        '<div style="color:#b0b0b0;font-size:11px;font-weight:bold">' + schedLabels[i] + '</div>' +
        '<div style="font-size:16px;color:#fff;font-weight:bold;margin-top:4px">' + timeStr + '</div></div>';
    }
  });

  // ===== VIEWER GRAPH HISTORY =====
  var vgh = viewerGraphHistory || [];
  var avgRampUp = 0;
  var avgPeakTime = 0;
  var avgViewerDrop = 0;
  if (vgh.length > 0) {
    var rampUps = [];
    var peakTimes = [];
    var drops = [];
    vgh.forEach(function(stream) {
      if (stream.data && stream.data.length > 10) {
        var peak = 0;
        var peakIdx = 0;
        stream.data.forEach(function(dp, idx) {
          if ((dp.viewers || 0) > peak) { peak = dp.viewers; peakIdx = idx; }
        });
        if (peakIdx > 0 && stream.data[0].timestamp) {
          var rampMinutes = Math.round((stream.data[peakIdx].timestamp - stream.data[0].timestamp) / 60000);
          rampUps.push(rampMinutes);
          var pctOfStream = Math.round((peakIdx / stream.data.length) * 100);
          peakTimes.push(pctOfStream);
        }
        var lastViewers = stream.data[stream.data.length - 1].viewers || 0;
        if (peak > 0) drops.push(Math.round(((peak - lastViewers) / peak) * 100));
      }
    });
    avgRampUp = rampUps.length > 0 ? Math.round(rampUps.reduce(function(a, b) { return a + b; }, 0) / rampUps.length) : 0;
    avgPeakTime = peakTimes.length > 0 ? Math.round(peakTimes.reduce(function(a, b) { return a + b; }, 0) / peakTimes.length) : 0;
    avgViewerDrop = drops.length > 0 ? Math.round(drops.reduce(function(a, b) { return a + b; }, 0) / drops.length) : 0;
  }

  // Viewer stability score (how much do viewers fluctuate within streams)
  var stabilityScores = [];
  vgh.forEach(function(stream) {
    if (stream.data && stream.data.length > 5) {
      var viewers = stream.data.map(function(dp) { return dp.viewers || 0; });
      var avg = viewers.reduce(function(a, b) { return a + b; }, 0) / viewers.length;
      var variance = viewers.reduce(function(s, v) { return s + Math.pow(v - avg, 2); }, 0) / viewers.length;
      var cv = avg > 0 ? Math.round((Math.sqrt(variance) / avg) * 100) : 0;
      stabilityScores.push(Math.max(0, 100 - cv));
    }
  });
  var avgStability = stabilityScores.length > 0 ? Math.round(stabilityScores.reduce(function(a, b) { return a + b; }, 0) / stabilityScores.length) : 0;

  // ===== COMMUNITY ENGAGEMENT SCORE =====
  var communityScore = 0;
  if (totalMembers > 0) communityScore += Math.min(25, Math.round((totalMembers / 100) * 25));
  if (totalCmdUses > 0) communityScore += Math.min(25, Math.round((totalCmdUses / 50) * 25));
  if (activeWeek > 0) communityScore += Math.min(25, Math.round((activityRate / 50) * 25));
  if (totalGiveaways + totalPolls > 0) communityScore += Math.min(25, (totalGiveaways + totalPolls) * 5);
  communityScore = Math.min(100, communityScore);
  var scoreColor = communityScore >= 75 ? '#4caf50' : communityScore >= 50 ? '#ff9800' : communityScore >= 25 ? '#ffd700' : '#ef5350';
  var scoreLabel = communityScore >= 75 ? 'Thriving' : communityScore >= 50 ? 'Active' : communityScore >= 25 ? 'Growing' : 'Starting';

  return '<div class="card">' +
  '<h2>🤝 Community & Bot Analytics</h2>' +
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:12px;margin:20px 0">' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center;border-top:3px solid ' + scoreColor + '">' +
      '<div style="color:#b0b0b0;font-size:10px">Community Score</div>' +
      '<div style="font-size:26px;color:' + scoreColor + ';font-weight:bold">' + communityScore + '</div>' +
      '<div style="font-size:10px;color:#666">' + scoreLabel + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Total Members</div>' +
      '<div style="font-size:22px;color:#9146ff;font-weight:bold">' + totalMembers + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Active (7d)</div>' +
      '<div style="font-size:22px;color:#4caf50;font-weight:bold">' + activeWeek + '</div>' +
      '<div style="font-size:10px;color:#666">' + activityRate + '% rate</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Active (30d)</div>' +
      '<div style="font-size:22px;color:#2196f3;font-weight:bold">' + activeMonth + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Dormant</div>' +
      '<div style="font-size:22px;color:#ef5350;font-weight:bold">' + dormant + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Total XP Earned</div>' +
      '<div style="font-size:22px;color:#ffd700;font-weight:bold">' + totalXP.toLocaleString() + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Avg XP / Member</div>' +
      '<div style="font-size:22px;color:#ff9800;font-weight:bold">' + avgXP.toLocaleString() + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Avg Level</div>' +
      '<div style="font-size:22px;color:#ce93d8;font-weight:bold">' + avgLevel + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Highest Level</div>' +
      '<div style="font-size:22px;color:#e91e63;font-weight:bold">' + (maxLevel[1].level || 0) + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Bot Commands Used</div>' +
      '<div style="font-size:22px;color:#00bcd4;font-weight:bold">' + totalCmdUses + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Unique Bot Users</div>' +
      '<div style="font-size:22px;color:#ab47bc;font-weight:bold">' + uniqueCmdUsers.size + '</div>' +
    '</div>' +
    '<div style="background:#26262c;padding:15px;border-radius:6px;text-align:center">' +
      '<div style="color:#b0b0b0;font-size:10px">Custom Commands</div>' +
      '<div style="font-size:22px;color:#8bc34a;font-weight:bold">' + custCmds.length + '</div>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div style="display:grid;grid-template-columns:1fr 1fr;gap:15px;margin-top:15px">' +
  '<div class="card">' +
    '<h3 style="margin-top:0;font-size:14px">📊 Level Distribution</h3>' +
    '<div style="margin-top:8px">' + (lvlDistHtml || '<div style="color:#b0b0b0;text-align:center;padding:15px">No leveling data</div>') + '</div>' +
  '</div>' +
  '<div class="card">' +
    '<h3 style="margin-top:0;font-size:14px">🏆 Top Members (by XP)</h3>' +
    '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:6px">' +
      '<thead><tr style="background:#26262c">' +
        '<th style="padding:5px 6px;text-align:left;font-size:11px">Rank</th>' +
        '<th style="padding:5px 6px;text-align:left;font-size:11px">User</th>' +
        '<th style="padding:5px 6px;text-align:center;font-size:11px">Lv</th>' +
        '<th style="padding:5px 6px;text-align:center;font-size:11px">XP</th>' +
        '<th style="padding:5px 6px;text-align:center;font-size:11px">Active</th>' +
      '</tr></thead>' +
      '<tbody>' + (top10Html || '<tr><td colspan="5" style="padding:15px;text-align:center;color:#b0b0b0">No members</td></tr>') + '</tbody>' +
    '</table></div>' +
  '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🤖 Bot Command Usage</h3>' +
  '<div style="display:grid;grid-template-columns:1fr auto;gap:15px;margin-top:10px">' +
    '<div style="overflow-x:auto;max-height:320px;overflow-y:auto"><table style="width:100%;border-collapse:collapse">' +
      '<thead style="position:sticky;top:0;z-index:1"><tr style="background:#26262c">' +
        '<th style="padding:6px 8px;text-align:left;font-size:11px">Command</th>' +
        '<th style="padding:6px 8px;text-align:center;font-size:11px">Uses</th>' +
        '<th style="padding:6px 8px;font-size:11px">Popularity</th>' +
        '<th style="padding:6px 8px;text-align:center;font-size:11px">Users</th>' +
        '<th style="padding:6px 8px;text-align:center;font-size:11px">Last Used</th>' +
      '</tr></thead>' +
      '<tbody>' + (cmdTableHtml || '<tr><td colspan="5" style="padding:15px;text-align:center;color:#b0b0b0">No command usage data</td></tr>') + '</tbody>' +
    '</table></div>' +
    '<div style="min-width:200px">' +
      '<h4 style="margin:0 0 8px 0;color:#e0e0e0;font-size:12px">👑 Top Bot Users</h4>' +
      '<div>' + (topCmdUsersHtml || '<div style="color:#b0b0b0;text-align:center;padding:10px;font-size:12px">No data</div>') + '</div>' +
      '<h4 style="margin:14px 0 8px 0;color:#e0e0e0;font-size:12px">📅 Activity by Day</h4>' +
      '<div style="display:flex;gap:3px;padding:8px;background:#2b2d31;border-radius:6px;height:90px">' +
        cmdDayHtml +
      '</div>' +
    '</div>' +
  '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">⭐ Custom Commands Popularity</h3>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:10px;margin-top:10px">' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total Commands</div><div style="font-size:20px;color:#ff9800;font-weight:bold">' + custCmds.length + '</div></div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total Uses</div><div style="font-size:20px;color:#ffd700;font-weight:bold">' + totalCustUses + '</div></div>' +
  '</div>' +
  '<div style="margin-top:10px">' + (custCmdsHtml || '<div style="color:#b0b0b0;text-align:center;padding:20px">No custom commands</div>') + '</div>' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🎉 Giveaways</h3>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin:10px 0">' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total Giveaways</div><div style="font-size:20px;color:#ffd700;font-weight:bold">' + totalGiveaways + '</div></div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total Entries</div><div style="font-size:20px;color:#4caf50;font-weight:bold">' + totalGAEntries + '</div></div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Avg Entries</div><div style="font-size:20px;color:#2196f3;font-weight:bold">' + avgGAEntries + '</div></div>' +
  '</div>' +
  (gaHtml ? '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;margin-top:10px">' +
    '<thead><tr style="background:#26262c">' +
      '<th style="padding:8px 10px;text-align:left;font-size:12px">Prize</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Status</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Entries</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Winners</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">End Date</th>' +
      '<th style="padding:8px 10px;text-align:center;font-size:12px">Created By</th>' +
    '</tr></thead>' +
    '<tbody>' + gaHtml + '</tbody>' +
  '</table></div>' : '<div style="color:#b0b0b0;text-align:center;padding:15px">No giveaways yet</div>') +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">📊 Polls</h3>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin:10px 0">' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total Polls</div><div style="font-size:20px;color:#9146ff;font-weight:bold">' + totalPolls + '</div></div>' +
    '<div style="background:#26262c;padding:12px;border-radius:6px;text-align:center"><div style="color:#b0b0b0;font-size:10px">Total Votes</div><div style="font-size:20px;color:#ce93d8;font-weight:bold">' + totalPollVotes + '</div></div>' +
  '</div>' +
  (pollsHtml || '<div style="color:#b0b0b0;text-align:center;padding:15px">No polls yet</div>') +
'</div>' +

(totalNotifs > 0 ? '<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🔔 Notification Analytics</h3>' +
  '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(100px,1fr));gap:10px;margin:10px 0">' +
    notifTypesHtml +
  '</div>' +
  '<div style="color:#666;font-size:11px;margin-top:8px">Total notifications sent: ' + totalNotifs + '</div>' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:16px;margin-top:15px">' +
  '<div style="background:#2b2d31;padding:15px;border-radius:8px"><h4 style="margin:0 0 10px 0;color:#e0e0e0;font-size:13px">📊 Notifications by Day</h4><div style="height:180px"><canvas id="notif-timeline-chart"></canvas></div></div>' +
  '<div style="background:#2b2d31;padding:15px;border-radius:8px"><h4 style="margin:0 0 10px 0;color:#e0e0e0;font-size:13px">🎯 Type Breakdown</h4><div style="height:180px"><canvas id="notif-type-chart"></canvas></div></div>' +
  '</div>' +
'</div>' : '') +

'<div style="text-align:center;margin-top:15px;padding:10px;color:#666;font-size:11px">' +
  'Community data as of ' + new Date().toLocaleString() + ' | ' + totalMembers + ' tracked members | ' + totalCmdUses + ' bot command uses' +
'</div>' +

'<div class="card" style="margin-top:15px">' +
  '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +
    '<div><h3 style="margin-top:0">📊 Level Distribution</h3><div style="height:220px"><canvas id="level-dist-chart"></canvas></div></div>' +
    '<div><h3 style="margin-top:0">🤖 Top Commands</h3><div style="height:220px"><canvas id="cmd-usage-chart"></canvas></div></div>' +
  '</div>' +
'</div>' +

'<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>' +
'<script>' +
'document.addEventListener("DOMContentLoaded", function() {' +
  'var lvlData = ' + JSON.stringify(Object.entries(lvlDist).map(function(e) { return { label: 'Lv ' + e[0], count: e[1] }; })) + ';' +
  'var cmdData = ' + JSON.stringify(cmdsSorted.slice(0, 10).map(function(c) { return { name: c.name, total: c.total, users: c.users }; })) + ';' +
  'var lvlCtx = document.getElementById("level-dist-chart");' +
  'if (lvlCtx && lvlData.length > 0) {' +
    'new Chart(lvlCtx, {' +
      'type: "bar",' +
      'data: {' +
        'labels: lvlData.map(function(d) { return d.label; }),' +
        'datasets: [{' +
          'label: "Members",' +
          'data: lvlData.map(function(d) { return d.count; }),' +
          'backgroundColor: ["#ef5350aa","#ff9800aa","#ffd700aa","#4caf50aa","#2196f3aa","#9146ffaa","#e91e63aa","#ce93d8aa"],' +
          'borderColor: ["#ef5350","#ff9800","#ffd700","#4caf50","#2196f3","#9146ff","#e91e63","#ce93d8"],' +
          'borderWidth: 1,' +
          'borderRadius: 4' +
        '}]' +
      '},' +
      'options: {' +
        'responsive: true,' +
        'maintainAspectRatio: false,' +
        'plugins: { legend: { display: false } },' +
        'scales: {' +
          'y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3", stepSize: 1 } },' +
          'x: { grid: { display: false }, ticks: { color: "#8b8fa3", font: { size: 10 } } }' +
        '}' +
      '}' +
    '});' +
  '}' +
  'var cmdCtx = document.getElementById("cmd-usage-chart");' +
  'if (cmdCtx && cmdData.length > 0) {' +
    'new Chart(cmdCtx, {' +
      'type: "doughnut",' +
      'data: {' +
        'labels: cmdData.map(function(d) { return "/" + d.name; }),' +
        'datasets: [{' +
          'data: cmdData.map(function(d) { return d.total; }),' +
          'backgroundColor: ["#9146ffcc","#4caf50cc","#ff9800cc","#e91e63cc","#2196f3cc","#ffd700cc","#00bcd4cc","#ce93d8cc","#ef5350cc","#8bc34acc"],' +
          'borderColor: ["#9146ff","#4caf50","#ff9800","#e91e63","#2196f3","#ffd700","#00bcd4","#ce93d8","#ef5350","#8bc34a"],' +
          'borderWidth: 2' +
        '}]' +
      '},' +
      'options: {' +
        'responsive: true,' +
        'maintainAspectRatio: false,' +
        'plugins: {' +
          'legend: { display: true, position: "right", labels: { color: "#8b8fa3", padding: 6, font: { size: 10 }, usePointStyle: true } },' +
          'tooltip: { callbacks: { label: function(ctx) { return ctx.label + ": " + ctx.raw + " uses (" + cmdData[ctx.dataIndex].users + " users)"; } } }' +
        '}' +
      '}' +
    '});' +
  '}' +
'});' +
'<\/script>' +

'<div class="card" style="margin-top:15px">' +
  '<h3 style="margin-top:0">🏆 Weekly XP vs All-Time XP (Top 10)</h3>' +
  '<div style="height:260px"><canvas id="weekly-xp-chart"></canvas></div>' +
'</div>' +

'<script>' +
'document.addEventListener("DOMContentLoaded", function() {' +
  'var weeklyXPData = ' + JSON.stringify((function() {
    var wk = Object.entries(weeklyLeveling || {});
    var lv = Object.entries(leveling || {});
    // Get top 10 by weekly XP
    var topWeekly = wk.map(function(e) { return { id: e[0], weeklyXp: e[1].xp || 0 }; }).sort(function(a, b) { return b.weeklyXp - a.weeklyXp; }).slice(0, 10);
    // Match with all-time data
    return topWeekly.map(function(u) {
      var allTime = lv.find(function(e) { return e[0] === u.id; });
      var totalXp = allTime ? (allTime[1].xp || 0) : 0;
      var level = allTime ? (allTime[1].level || 0) : 0;
      return { id: u.id.substring(0, 8) + '..', weeklyXp: u.weeklyXp, totalXp: totalXp, level: level };
    });
  })()) + ';' +
  'var wxCtx = document.getElementById("weekly-xp-chart");' +
  'if (wxCtx && weeklyXPData.length > 0) {' +
    'new Chart(wxCtx, {' +
      'type: "bar",' +
      'data: {' +
        'labels: weeklyXPData.map(function(d) { return "Lv" + d.level + " " + d.id; }),' +
        'datasets: [{' +
          'label: "Weekly XP",' +
          'data: weeklyXPData.map(function(d) { return d.weeklyXp; }),' +
          'backgroundColor: "#e91e63aa",' +
          'borderColor: "#e91e63",' +
          'borderWidth: 1,' +
          'borderRadius: 4,' +
          'yAxisID: "y"' +
        '}, {' +
          'label: "All-Time XP",' +
          'data: weeklyXPData.map(function(d) { return d.totalXp; }),' +
          'backgroundColor: "#9146ff44",' +
          'borderColor: "#9146ff",' +
          'borderWidth: 1,' +
          'borderRadius: 4,' +
          'yAxisID: "y1"' +
        '}]' +
      '},' +
      'options: {' +
        'responsive: true,' +
        'maintainAspectRatio: false,' +
        'plugins: { legend: { display: true, labels: { color: "#8b8fa3", usePointStyle: true } } },' +
        'scales: {' +
          'y: { type: "linear", position: "left", beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#e91e63" }, title: { display: true, text: "Weekly XP", color: "#e91e63" } },' +
          'y1: { type: "linear", position: "right", beginAtZero: true, grid: { drawOnChartArea: false }, ticks: { color: "#9146ff" }, title: { display: true, text: "All-Time XP", color: "#9146ff" } },' +
          'x: { grid: { display: false }, ticks: { color: "#8b8fa3", font: { size: 9 } } }' +
        '}' +
      '}' +
    '});' +
  '}' +
'});' +
// Notification charts  
'var nhData = ' + JSON.stringify((() => {
  const dailyCounts = {};
  (notificationHistory || []).forEach(n => {
    const day = new Date(n.timestamp).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    dailyCounts[day] = (dailyCounts[day] || 0) + 1;
  });
  return Object.entries(dailyCounts).slice(-14);
})()) + ';' +
'var ntCtx = document.getElementById("notif-timeline-chart");' +
'if (ntCtx && nhData.length > 0) {' +
  'new Chart(ntCtx, {' +
    'type: "bar",' +
    'data: { labels: nhData.map(function(d){return d[0]}), datasets: [{ label: "Notifications", data: nhData.map(function(d){return d[1]}), backgroundColor: "#5b5bff88", borderColor: "#5b5bff", borderWidth: 1, borderRadius: 3 }] },' +
    'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3", stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: "#8b8fa3", font: { size: 9 } } } } }' +
  '});' +
'}' +
'var ntypeData = ' + JSON.stringify(Object.entries(notifTypes)) + ';' +
'var ntypeColors = ' + JSON.stringify(Object.entries(notifTypes).map(([t]) => ({ live: '#4caf50', offline: '#ef5350', follow: '#e91e63', game: '#9146ff', title: '#ff9800', viewer: '#2196f3', raid: '#ffd700', clip: '#00bcd4' })[t] || '#666')) + ';' +
'var ntpCtx = document.getElementById("notif-type-chart");' +
'if (ntpCtx && ntypeData.length > 0) {' +
  'new Chart(ntpCtx, {' +
    'type: "doughnut",' +
    'data: { labels: ntypeData.map(function(d){return d[0]}), datasets: [{ data: ntypeData.map(function(d){return d[1]}), backgroundColor: ntypeColors, borderWidth: 0 }] },' +
    'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#8b8fa3", font: { size: 11 }, padding: 8, usePointStyle: true } } } }' +
  '});' +
'}' +
'<\/script>';
}

// RPG Economy Tab
export function renderRPGEconomyTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, defenseQuests, giveaways, leveling, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const playersPath = path.join(process.cwd(), 'data', 'players.json');
  const craftingPath = path.join(process.cwd(), 'data', 'crafting.json');
  const guildsPath = path.join(process.cwd(), 'data', 'guilds.json');
  let players = [];
  let craftingData = { materials: [], recipes: [] };
  let guilds = [];
  try {
    if (fs.existsSync(playersPath)) {
      const raw = cachedReadJSON(playersPath);
      players = Object.values(raw).filter(p => p && p.userId);
    }
  } catch(e) {}
  try {
    if (fs.existsSync(craftingPath)) craftingData = cachedReadJSON(craftingPath);
  } catch(e) {}
  try {
    if (fs.existsSync(guildsPath)) {
      const raw = cachedReadJSON(guildsPath);
      const serverId = Object.keys(raw)[0];
      if (serverId) guilds = Object.values(raw[serverId]).filter(g => g && g.id);
    }
  } catch(e) {}

  // === GOLD ECONOMY ===
  const totalGold = players.reduce((s,p) => s + (p.gold || 0), 0);
  const totalGoldEarned = players.reduce((s,p) => s + ((p.progressStats||{}).goldEarned||0), 0);
  const totalGoldSpent = players.reduce((s,p) => s + (p.goldSpentTotal || 0), 0);
  const avgGold = players.length > 0 ? Math.round(totalGold / players.length) : 0;
  const maxGold = players.reduce((m,p) => Math.max(m, p.gold || 0), 0);
  const spendingBreakdown = { shop: 0, crafting: 0, gambling: 0, guild: 0, upgrades: 0, marketplace: 0, other: 0 };
  players.forEach(p => {
    const b = p.goldSpentBreakdown || {};
    Object.keys(spendingBreakdown).forEach(k => { spendingBreakdown[k] += (b[k] || 0); });
  });

  // Gold distribution buckets
  const goldBuckets = { '0-999': 0, '1K-10K': 0, '10K-100K': 0, '100K-1M': 0, '1M+': 0 };
  players.forEach(p => {
    const g = p.gold || 0;
    if (g < 1000) goldBuckets['0-999']++;
    else if (g < 10000) goldBuckets['1K-10K']++;
    else if (g < 100000) goldBuckets['10K-100K']++;
    else if (g < 1000000) goldBuckets['100K-1M']++;
    else goldBuckets['1M+']++;
  });

  // === AUTO-SELL STATS ===
  const totalAutoSold = players.reduce((s,p) => s + ((p.autoSellSettings||{}).itemsSold||0), 0);
  const totalAutoGold = players.reduce((s,p) => s + ((p.autoSellSettings||{}).totalGoldEarned||0), 0);

  // === GATHERING STATS ===
  const gatheringAggs = { mining: [], chopping: [], gathering: [] };
  players.forEach(p => {
    const gl = p.gatheringLevels || {};
    if (gl.mining) gatheringAggs.mining.push({ name: p.username, level: gl.mining });
    if (gl.chopping) gatheringAggs.chopping.push({ name: p.username, level: gl.chopping });
    if (gl.gathering) gatheringAggs.gathering.push({ name: p.username, level: gl.gathering });
  });
  Object.keys(gatheringAggs).forEach(k => gatheringAggs[k].sort((a,b) => b.level - a.level));

  // === PROFESSION STATS ===
  const professionAgg = {};
  players.forEach(p => {
    const pl = p.professionLevels || {};
    Object.entries(pl).forEach(([prof, lvl]) => {
      if (!professionAgg[prof]) professionAgg[prof] = { totalLevel: 0, count: 0, maxLevel: 0, topPlayer: '' };
      professionAgg[prof].totalLevel += lvl;
      professionAgg[prof].count++;
      if (lvl > professionAgg[prof].maxLevel) { professionAgg[prof].maxLevel = lvl; professionAgg[prof].topPlayer = p.username || 'Unknown'; }
    });
  });

  // === EQUIPMENT ANALYTICS ===
  const slotCounts = {};
  const itemPopularity = {};
  players.forEach(p => {
    const eq = p.equippedItems || {};
    Object.entries(eq).forEach(([slot, itemId]) => {
      if (itemId) {
        slotCounts[slot] = (slotCounts[slot] || 0) + 1;
        itemPopularity[itemId] = (itemPopularity[itemId] || 0) + 1;
      }
    });
  });
  const totalSlots = players.length * 10;
  const filledSlots = Object.values(slotCounts).reduce((s,v) => s + v, 0);
  const fillRate = totalSlots > 0 ? ((filledSlots / totalSlots) * 100).toFixed(1) : '0';

  // === INVENTORY STATS ===
  const avgInvSize = players.length > 0 ? (players.reduce((s,p) => s + (Array.isArray(p.inventory) ? p.inventory.length : 0), 0) / players.length).toFixed(1) : '0';
  const maxInvSize = players.reduce((m,p) => Math.max(m, Array.isArray(p.inventory) ? p.inventory.length : 0), 0);

  // === CRAFTING RECIPES ===
  const recipes = Array.isArray(craftingData.recipes) ? craftingData.recipes : [];
  const materials = Array.isArray(craftingData.materials) ? craftingData.materials : [];
  const totalCrafts = players.reduce((s,p) => s + ((p.progressStats||{}).craftsCompleted||0), 0);
  const totalGatheringActions = players.reduce((s,p) => s + ((p.progressStats||{}).gatheringActions||0), 0);

  // === TRADE ACTIVITY ===
  const allTrades = [];
  players.forEach(p => { (p.tradeHistory || []).forEach(t => allTrades.push({ ...t, player: p.username })); });
  allTrades.sort((a,b) => (b.timestamp||0) - (a.timestamp||0));

  // Top gold holders
  const topGold = [...players].sort((a,b) => (b.gold||0) - (a.gold||0)).slice(0, 10);

  // === GUILD TREASURY ===
  const guildTreasury = guilds.map(g => ({ name: g.name || 'Unknown', gold: g.gold || 0, bankItems: (g.bank?.items || []).length, bankMaterials: Object.keys(g.bank?.materials || {}).length }));

  // Spending breakdown labels/data for chart
  const spendLabels = Object.keys(spendingBreakdown).map(k => k.charAt(0).toUpperCase() + k.slice(1));
  const spendData = Object.values(spendingBreakdown);
  const spendColors = ['#e91e63','#ff9800','#f44336','#9c27b0','#2196f3','#4caf50','#607d8b'];

  // Format number helper
  const fmtG = (n) => n >= 1e6 ? (n/1e6).toFixed(1)+'M' : n >= 1e3 ? (n/1e3).toFixed(1)+'K' : String(n);

  return '<div class="card"><h2 style="margin-bottom:25px">💰 RPG Economy</h2>' +
    // Gold overview cards
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:14px;margin-bottom:30px">' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(76,175,80,0.3)"><div style="font-size:26px;font-weight:700;color:#4caf50">' + fmtG(totalGold) + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Gold in Circulation</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(255,152,0,0.3)"><div style="font-size:26px;font-weight:700;color:#ff9800">' + fmtG(totalGoldEarned) + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Total Gold Earned</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(233,30,99,0.3)"><div style="font-size:26px;font-weight:700;color:#e91e63">' + fmtG(totalGoldSpent) + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Total Gold Spent</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(91,91,255,0.3)"><div style="font-size:26px;font-weight:700;color:#5b5bff">' + fmtG(avgGold) + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Avg Gold/Player</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(0,188,212,0.3)"><div style="font-size:26px;font-weight:700;color:#00bcd4">' + fmtG(maxGold) + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Richest Player</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(156,39,176,0.3)"><div style="font-size:26px;font-weight:700;color:#9c27b0">' + fillRate + '%</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Equip Slot Fill Rate</div></div>' +
    '</div>' +
    // Activity stats row
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:30px">' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#4db6ac">🔨 ' + totalCrafts.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Items Crafted</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#81c784">🌿 ' + totalGatheringActions.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Gathering Actions</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ff8a65">🏪 ' + totalAutoSold.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Items Auto-Sold</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ffb74d">💰 ' + fmtG(totalAutoGold) + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Auto-Sell Revenue</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#90caf9">📦 ' + avgInvSize + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Avg Inventory Size</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ce93d8">🔄 ' + allTrades.length + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Market Trades</div></div>' +
    '</div>' +
    // Charts row: Gold Distribution + Spending Breakdown
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">💰 Gold Distribution</h3><div style="height:250px"><canvas id="goldDistChart"></canvas></div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📊 Gold Spending Breakdown</h3><div style="height:250px"><canvas id="goldSpendChart"></canvas></div></div>' +
    '</div>' +
    // Top Gold Holders + Gathering Leaderboard
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">' +
    // Top Gold Holders
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🏆 Top Gold Holders</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Player</th><th style="text-align:right;padding:8px;color:#8b8fa3">Gold</th><th style="text-align:right;padding:8px;color:#8b8fa3">Earned</th><th style="text-align:right;padding:8px;color:#8b8fa3">Spent</th></tr></thead><tbody>' +
    topGold.map(function(p, i) {
      var medal = i < 3 ? ['🥇','🥈','🥉'][i] : '' + (i+1);
      return '<tr style="border-bottom:1px solid #222"><td style="padding:8px;color:#fff">' + medal + ' ' + (p.username||'Unknown') + '</td><td style="text-align:right;padding:8px;color:#4caf50;font-weight:700">' + (p.gold||0).toLocaleString() + '</td><td style="text-align:right;padding:8px;color:#ff9800">' + ((p.progressStats||{}).goldEarned||0).toLocaleString() + '</td><td style="text-align:right;padding:8px;color:#e91e63">' + (p.goldSpentTotal||0).toLocaleString() + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' +
    // Gathering Leaderboard
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">⛏️ Gathering Leaderboard</h3>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">' +
    // Mining
    '<div><h4 style="color:#ff6b6b;font-size:12px;margin:0 0 8px 0">⛏️ Mining</h4>' +
    gatheringAggs.mining.slice(0, 5).map(function(g, i) {
      return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #222"><span style="color:#8b8fa3">' + (i+1) + '.</span> <span style="color:#fff">' + g.name + '</span> <span style="color:#ff6b6b;font-weight:600">Lv' + g.level + '</span></div>';
    }).join('') +
    '</div>' +
    // Chopping
    '<div><h4 style="color:#81c784;font-size:12px;margin:0 0 8px 0">🪓 Chopping</h4>' +
    gatheringAggs.chopping.slice(0, 5).map(function(g, i) {
      return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #222"><span style="color:#8b8fa3">' + (i+1) + '.</span> <span style="color:#fff">' + g.name + '</span> <span style="color:#81c784;font-weight:600">Lv' + g.level + '</span></div>';
    }).join('') +
    '</div>' +
    // Gathering
    '<div><h4 style="color:#4db6ac;font-size:12px;margin:0 0 8px 0">🌿 Gathering</h4>' +
    gatheringAggs.gathering.slice(0, 5).map(function(g, i) {
      return '<div style="font-size:12px;padding:4px 0;border-bottom:1px solid #222"><span style="color:#8b8fa3">' + (i+1) + '.</span> <span style="color:#fff">' + g.name + '</span> <span style="color:#4db6ac;font-weight:600">Lv' + g.level + '</span></div>';
    }).join('') +
    '</div>' +
    '</div></div>' +
    '</div>' +
    // Profession Levels
    (Object.keys(professionAgg).length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🛠️ Profession Analytics</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' +
    Object.entries(professionAgg).map(function(entry) {
      var prof = entry[0];
      var data = entry[1];
      var avgLvl = data.count > 0 ? (data.totalLevel / data.count).toFixed(1) : '0';
      return '<div style="background:#2a2e35;padding:14px;border-radius:8px"><div style="color:#fff;font-weight:600;margin-bottom:6px">' + prof.charAt(0).toUpperCase() + prof.slice(1) + '</div>' +
        '<div style="font-size:12px;color:#8b8fa3">Players: <span style="color:#5b5bff">' + data.count + '</span></div>' +
        '<div style="font-size:12px;color:#8b8fa3">Avg Level: <span style="color:#ff9800">' + avgLvl + '</span></div>' +
        '<div style="font-size:12px;color:#8b8fa3">Highest: <span style="color:#4caf50">Lv' + data.maxLevel + '</span> (' + data.topPlayer + ')</div></div>';
    }).join('') +
    '</div></div>' : '') +
    // Crafting Recipes Available
    (recipes.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📜 Crafting Recipes (' + recipes.length + ' total)</h3>' +
    '<div style="max-height:250px;overflow-y:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:6px;color:#8b8fa3">Recipe</th><th style="text-align:left;padding:6px;color:#8b8fa3">Profession</th><th style="text-align:right;padding:6px;color:#8b8fa3">Level</th><th style="text-align:left;padding:6px;color:#8b8fa3">Output</th><th style="text-align:left;padding:6px;color:#8b8fa3">Class</th></tr></thead><tbody>' +
    recipes.slice(0, 30).map(function(r) {
      return '<tr style="border-bottom:1px solid #222"><td style="padding:6px;color:#fff">' + (r.name||r.id) + '</td><td style="padding:6px;color:#4db6ac">' + (r.profession||'-') + '</td><td style="text-align:right;padding:6px;color:#ff9800">' + (r.level||1) + '</td><td style="padding:6px;color:#81c784">' + ((r.output||{}).item || '-') + '</td><td style="padding:6px;color:#e91e63">' + (r.classRestriction||'Any') + '</td></tr>';
    }).join('') +
    '</tbody></table></div></div>' : '') +
    // Materials Available
    (materials.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">⚒️ Materials Database (' + materials.length + ' types)</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">' +
    materials.slice(0, 20).map(function(m) {
      var rarityColors = { common: '#9e9e9e', uncommon: '#4caf50', rare: '#2196f3', epic: '#9c27b0', legendary: '#ff9800' };
      var c = rarityColors[m.rarity] || '#9e9e9e';
      return '<div style="background:#2a2e35;padding:10px;border-radius:6px;border-left:3px solid ' + c + '"><div style="color:' + c + ';font-weight:600;font-size:12px">' + (m.name||m.id) + '</div><div style="font-size:11px;color:#72767d">' + (m.rarity||'common') + ' • ' + (m.gatheringType||'?') + ' • ' + (m.value||0) + 'g</div></div>';
    }).join('') +
    '</div></div>' : '') +
    // Guild Treasury
    (guildTreasury.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🏰 Guild Treasuries</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Guild</th><th style="text-align:right;padding:8px;color:#8b8fa3">Treasury Gold</th><th style="text-align:right;padding:8px;color:#8b8fa3">Bank Items</th><th style="text-align:right;padding:8px;color:#8b8fa3">Bank Materials</th></tr></thead><tbody>' +
    guildTreasury.map(function(g) {
      return '<tr style="border-bottom:1px solid #222"><td style="padding:8px;color:#fff;font-weight:600">' + g.name + '</td><td style="text-align:right;padding:8px;color:#4caf50;font-weight:700">' + g.gold.toLocaleString() + '</td><td style="text-align:right;padding:8px;color:#5b5bff">' + g.bankItems + '</td><td style="text-align:right;padding:8px;color:#ff9800">' + g.bankMaterials + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' : '') +
    // Recent Market Trades
    (allTrades.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:20px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🔄 Recent Market Activity</h3>' +
    '<div style="max-height:200px;overflow-y:auto">' +
    allTrades.slice(0, 20).map(function(t) {
      var icon = t.type === 'buy' ? '🛒' : t.type === 'sell' ? '💰' : '📋';
      var color = t.type === 'buy' ? '#e91e63' : '#4caf50';
      return '<div style="padding:6px 10px;border-bottom:1px solid #222;font-size:12px"><span style="color:#8b8fa3">' + new Date(t.timestamp||0).toLocaleString() + '</span> ' + icon + ' <strong style="color:#fff">' + (t.player||'') + '</strong> <span style="color:' + color + '">' + t.type + '</span> <span style="color:#b5bac1">' + (t.item||'?') + '</span> for <span style="color:#ff9800">' + (t.price||0) + 'g</span></div>';
    }).join('') +
    '</div></div>' : '') +
    '</div>' +
    // Charts
    '<script>' +
    'document.addEventListener("DOMContentLoaded", function() {' +
    // Gold Distribution Chart
    'var gdCtx = document.getElementById("goldDistChart");' +
    'if (gdCtx) { new Chart(gdCtx, {' +
      'type: "bar",' +
      'data: { labels: ' + JSON.stringify(Object.keys(goldBuckets)) + ', datasets: [{ label: "Players", data: ' + JSON.stringify(Object.values(goldBuckets)) + ', backgroundColor: ["#4caf5088","#ff980088","#5b5bff88","#e91e6388","#00bcd488"], borderColor: ["#4caf50","#ff9800","#5b5bff","#e91e63","#00bcd4"], borderWidth: 1, borderRadius: 4 }] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3", stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: "#8b8fa3" } } } }' +
    '}); }' +
    // Gold Spending Breakdown Chart
    'var gsCtx = document.getElementById("goldSpendChart");' +
    'if (gsCtx) { new Chart(gsCtx, {' +
      'type: "doughnut",' +
      'data: { labels: ' + JSON.stringify(spendLabels) + ', datasets: [{ data: ' + JSON.stringify(spendData) + ', backgroundColor: ' + JSON.stringify(spendColors) + ', borderWidth: 0 }] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#8b8fa3", font: { size: 11 }, padding: 10, usePointStyle: true } } } }' +
    '}); }' +
    '});' +
    '<\/script>';
}

// RPG Quests & Combat Tab
export function renderRPGQuestsCombatTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, giveaways, leveling, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const playersPath = path.join(process.cwd(), 'data', 'players.json');
  const bountiesPath = path.join(process.cwd(), 'data', 'bounties.json');
  const guildQuestsPath = path.join(process.cwd(), 'data', 'guild-quests.json');
  const defenseQuestsPath = path.join(process.cwd(), 'data', 'defense-quests.json');
  const guildsPath = path.join(process.cwd(), 'data', 'guilds.json');
  let players = [];
  let bountyData = { player: [], npc: [], limited: [] };
  let guildQuests = { daily: [], weekly: [], limited: [] };
  let defenseQuests = [];
  let guilds = [];
  try {
    if (fs.existsSync(playersPath)) {
      const raw = cachedReadJSON(playersPath);
      players = Object.values(raw).filter(p => p && p.userId);
    }
  } catch(e) {}
  try { if (fs.existsSync(bountiesPath)) bountyData = cachedReadJSON(bountiesPath); } catch(e) {}
  try { if (fs.existsSync(guildQuestsPath)) guildQuests = cachedReadJSON(guildQuestsPath); } catch(e) {}
  try { if (fs.existsSync(defenseQuestsPath)) defenseQuests = cachedReadJSON(defenseQuestsPath); } catch(e) {}
  try {
    if (fs.existsSync(guildsPath)) {
      const raw = cachedReadJSON(guildsPath);
      const serverId = Object.keys(raw)[0];
      if (serverId) guilds = Object.values(raw[serverId]).filter(g => g && g.id);
    }
  } catch(e) {}
  if (!Array.isArray(defenseQuests)) defenseQuests = [];

  // === COMBAT STATS ===
  var totalWins = 0, totalLosses = 0, totalForfeits = 0;
  var combatByType = { normal: {w:0,l:0}, boss: {w:0,l:0}, worldBoss: {w:0,l:0}, dungeon: {w:0,l:0}, arena: {w:0,l:0}, guildBoss: {w:0,l:0}, raid: {w:0,l:0} };
  var enemyStats = {};
  players.forEach(function(p) {
    var cr = p.combatRecord || {};
    totalWins += cr.totalWins || 0;
    totalLosses += cr.totalLosses || 0;
    totalForfeits += cr.totalForfeits || 0;
    var bt = cr.byType || {};
    Object.keys(combatByType).forEach(function(t) {
      combatByType[t].w += (bt[t]||{}).wins || 0;
      combatByType[t].l += (bt[t]||{}).losses || 0;
    });
    var be = cr.byEnemy || {};
    Object.entries(be).forEach(function(entry) {
      var name = entry[0]; var d = entry[1];
      if (!enemyStats[name]) enemyStats[name] = { wins: 0, losses: 0 };
      enemyStats[name].wins += d.wins || 0;
      enemyStats[name].losses += d.losses || 0;
    });
  });
  var totalCombats = totalWins + totalLosses;
  var overallWinRate = totalCombats > 0 ? ((totalWins / totalCombats) * 100).toFixed(1) : '0';

  // Top enemies by encounters
  var topEnemies = Object.entries(enemyStats).map(function(e) {
    var total = e[1].wins + e[1].losses;
    var wr = total > 0 ? ((e[1].wins / total) * 100).toFixed(1) : '0';
    return { name: e[0], wins: e[1].wins, losses: e[1].losses, total: total, winRate: wr };
  }).sort(function(a,b) { return b.total - a.total; }).slice(0, 15);

  // === DEATH LOG ===
  var allDeaths = [];
  players.forEach(function(p) {
    (p.deathLog || []).forEach(function(d) { allDeaths.push({ player: p.username, enemy: d.enemy, enemyLevel: d.enemyLevel, playerLevel: d.playerLevel, timestamp: d.timestamp, type: d.type }); });
  });
  allDeaths.sort(function(a,b) { return (b.timestamp||0) - (a.timestamp||0); });

  // === SKILL USAGE ===
  var skillAgg = {};
  players.forEach(function(p) {
    var su = p.skillUsageStats || {};
    Object.entries(su).forEach(function(entry) {
      var name = entry[0]; var d = entry[1];
      if (!skillAgg[name]) skillAgg[name] = { timesUsed: 0, totalDamage: 0 };
      skillAgg[name].timesUsed += d.timesUsed || 0;
      skillAgg[name].totalDamage += d.totalDamage || 0;
    });
  });
  var topSkills = Object.entries(skillAgg).map(function(e) {
    return { name: e[0], used: e[1].timesUsed, damage: e[1].totalDamage, avgDmg: e[1].timesUsed > 0 ? Math.round(e[1].totalDamage / e[1].timesUsed) : 0 };
  }).sort(function(a,b) { return b.used - a.used; }).slice(0, 15);

  // === QUEST STATS ===
  var totalDailyCompleted = players.reduce(function(s,p) { return s + (Array.isArray(p.dailyQuestsCompleted) ? p.dailyQuestsCompleted.length : 0); }, 0);
  var totalWeeklyCompleted = players.reduce(function(s,p) { return s + (Array.isArray(p.weeklyQuestsCompleted) ? p.weeklyQuestsCompleted.length : 0); }, 0);
  var totalBountiesCompleted = players.reduce(function(s,p) { return s + (Array.isArray(p.completedBounties) ? p.completedBounties.length : 0); }, 0);
  var totalBountiesActive = players.reduce(function(s,p) { return s + (Array.isArray(p.activeBounties) ? p.activeBounties.length : 0); }, 0);

  // Guild rank distribution
  var rankCounts = {};
  players.forEach(function(p) {
    var r = p.guildRank || 'F';
    rankCounts[r] = (rankCounts[r] || 0) + 1;
  });

  // === ROGUELIKE DEEP STATS ===
  var totalRuns = players.reduce(function(s,p) { return s + ((p.roguelikeStats||{}).totalRunsCompleted||0); }, 0);
  var highestFloor = players.reduce(function(m,p) { return Math.max(m, (p.roguelikeStats||{}).highestFloorReached||0); }, 0);
  var totalRogueDeaths = players.reduce(function(s,p) { return s + ((p.roguelikeStats||{}).deathCount||0); }, 0);
  var totalRogueBosses = players.reduce(function(s,p) { return s + ((p.roguelikeStats||{}).bossesDefeated||0); }, 0);
  var totalVoluntaryExits = players.reduce(function(s,p) { return s + ((p.roguelikeStats||{}).voluntaryExits||0); }, 0);
  var totalCurrencyA = players.reduce(function(s,p) { return s + ((p.roguelikeStats||{}).totalCurrencyEarned||{}).A||0; }, 0);
  var totalCurrencyB = players.reduce(function(s,p) { return s + ((p.roguelikeStats||{}).totalCurrencyEarned||{}).B||0; }, 0);
  var totalCurrencyC = players.reduce(function(s,p) { return s + ((p.roguelikeStats||{}).totalCurrencyEarned||{}).C||0; }, 0);

  // World bosses defeated
  var worldBossAgg = {};
  players.forEach(function(p) {
    (p.worldBossesDefeated || []).forEach(function(b) {
      worldBossAgg[b] = (worldBossAgg[b] || 0) + 1;
    });
  });

  // Guild boss history
  var guildBossHistory = [];
  guilds.forEach(function(g) {
    (g.bossHistory || []).forEach(function(bh) {
      guildBossHistory.push({ guild: g.name, boss: bh.bossName || 'Unknown', tier: bh.tier || 1, damage: bh.totalDamage || 0, participants: Object.keys(bh.participants || {}).length, timestamp: bh.defeatedAt || bh.timestamp || 0 });
    });
  });
  guildBossHistory.sort(function(a,b) { return (b.timestamp||0) - (a.timestamp||0); });

  // Bounty data
  var activeBounties = (bountyData.player || []).filter(function(b) { return !b.completed; });
  var completedBounties = (bountyData.player || []).filter(function(b) { return b.completed; });

  // Combat type labels/data for chart
  var ctLabels = Object.keys(combatByType).map(function(k) { return k.charAt(0).toUpperCase() + k.slice(1); });
  var ctWins = Object.values(combatByType).map(function(v) { return v.w; });
  var ctLosses = Object.values(combatByType).map(function(v) { return v.l; });

  return '<div class="card"><h2 style="margin-bottom:25px">📜 RPG Quests & Combat</h2>' +
    // Combat overview cards
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:14px;margin-bottom:30px">' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(76,175,80,0.3)"><div style="font-size:26px;font-weight:700;color:#4caf50">' + totalWins.toLocaleString() + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Total Victories</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(244,67,54,0.3)"><div style="font-size:26px;font-weight:700;color:#f44336">' + totalLosses.toLocaleString() + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Total Defeats</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(91,91,255,0.3)"><div style="font-size:26px;font-weight:700;color:#5b5bff">' + overallWinRate + '%</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Win Rate</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(233,30,99,0.3)"><div style="font-size:26px;font-weight:700;color:#e91e63">' + allDeaths.length + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Deaths Logged</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(255,152,0,0.3)"><div style="font-size:26px;font-weight:700;color:#ff9800">' + totalBountiesCompleted + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Bounties Done</div></div>' +
    '<div style="background:#2b2d31;padding:18px;border-radius:10px;text-align:center;border:1px solid rgba(156,39,176,0.3)"><div style="font-size:26px;font-weight:700;color:#9c27b0">' + (totalDailyCompleted + totalWeeklyCompleted) + '</div><div style="color:#8b8fa3;font-size:11px;margin-top:4px">Quests Completed</div></div>' +
    '</div>' +
    // Charts row: Combat by Type + Skill Usage
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">⚔️ Combat by Type</h3><div style="height:280px"><canvas id="combatTypeChart"></canvas></div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🏅 Guild Rank Distribution</h3><div style="height:280px"><canvas id="guildRankChart"></canvas></div></div>' +
    '</div>' +
    // Enemy Encounters Table + Skill Usage Table
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">' +
    // Enemy Encounters
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">👾 Top Enemy Encounters</h3>' +
    (topEnemies.length > 0 ?
    '<div style="max-height:350px;overflow-y:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:6px;color:#8b8fa3">Enemy</th><th style="text-align:right;padding:6px;color:#8b8fa3">Wins</th><th style="text-align:right;padding:6px;color:#8b8fa3">Losses</th><th style="text-align:right;padding:6px;color:#8b8fa3">Win%</th></tr></thead><tbody>' +
    topEnemies.map(function(e) {
      var wrColor = parseFloat(e.winRate) >= 70 ? '#4caf50' : parseFloat(e.winRate) >= 40 ? '#ff9800' : '#f44336';
      return '<tr style="border-bottom:1px solid #222"><td style="padding:6px;color:#fff">' + e.name + '</td><td style="text-align:right;padding:6px;color:#4caf50">' + e.wins + '</td><td style="text-align:right;padding:6px;color:#f44336">' + e.losses + '</td><td style="text-align:right;padding:6px;color:' + wrColor + ';font-weight:700">' + e.winRate + '%</td></tr>';
    }).join('') +
    '</tbody></table></div>' : '<div style="color:#72767d;text-align:center;padding:20px">No combat data yet — tracking begins now!</div>') +
    '</div>' +
    // Skill Usage
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">⚡ Most Used Skills</h3>' +
    (topSkills.length > 0 ?
    '<div style="max-height:350px;overflow-y:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:6px;color:#8b8fa3">Skill</th><th style="text-align:right;padding:6px;color:#8b8fa3">Uses</th><th style="text-align:right;padding:6px;color:#8b8fa3">Total Dmg</th><th style="text-align:right;padding:6px;color:#8b8fa3">Avg Dmg</th></tr></thead><tbody>' +
    topSkills.map(function(s) {
      return '<tr style="border-bottom:1px solid #222"><td style="padding:6px;color:#fff">⚡ ' + s.name + '</td><td style="text-align:right;padding:6px;color:#5b5bff;font-weight:600">' + s.used + '</td><td style="text-align:right;padding:6px;color:#ff9800">' + s.damage.toLocaleString() + '</td><td style="text-align:right;padding:6px;color:#4caf50">' + s.avgDmg + '</td></tr>';
    }).join('') +
    '</tbody></table></div>' : '<div style="color:#72767d;text-align:center;padding:20px">No skill usage data yet — tracking begins now!</div>') +
    '</div>' +
    '</div>' +
    // Roguelike Deep Stats
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🗼 Roguelike Deep Stats</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(120px,1fr));gap:10px">' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ba68c8">' + totalRuns + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Total Runs</div></div>' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#5b5bff">F' + highestFloor + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Highest Floor</div></div>' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#f44336">' + totalRogueDeaths + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Deaths</div></div>' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#4caf50">' + totalRogueBosses + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Bosses Killed</div></div>' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ff9800">' + totalVoluntaryExits + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Voluntary Exits</div></div>' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#e91e63">' + totalCurrencyA + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Currency A</div></div>' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#00bcd4">' + totalCurrencyB + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Currency B</div></div>' +
    '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#9c27b0">' + totalCurrencyC + '</div><div style="color:#72767d;font-size:10px;margin-top:3px">Currency C</div></div>' +
    '</div></div>' +
    // Active Bounties + Guild Quests
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">' +
    // Active Bounties
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🎯 Active Bounties (' + activeBounties.length + ')</h3>' +
    (activeBounties.length > 0 ?
    activeBounties.map(function(b) {
      var timeLeft = b.expiresAt ? Math.max(0, Math.round((b.expiresAt - Date.now()) / 3600000)) + 'h left' : 'No expiry';
      return '<div style="background:#2a2e35;padding:12px;border-radius:8px;margin-bottom:8px;border-left:3px solid #ff9800"><div style="color:#fff;font-weight:600">' + (b.title||'Bounty') + '</div><div style="color:#72767d;font-size:11px">' + (b.description||'') + '</div><div style="display:flex;justify-content:space-between;margin-top:6px;font-size:11px"><span style="color:#ff9800">💰 ' + ((b.rewards||{}).gold||0) + 'g</span><span style="color:#8b8fa3">' + timeLeft + '</span></div></div>';
    }).join('') : '<div style="color:#72767d;text-align:center;padding:20px">No active bounties</div>') +
    '</div>' +
    // Guild Quests Available
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📋 Guild Quests Available</h3>' +
    '<h4 style="color:#4caf50;font-size:12px;margin:10px 0 6px 0">Daily (' + (guildQuests.daily||[]).length + ')</h4>' +
    (guildQuests.daily||[]).map(function(q) {
      return '<div style="font-size:12px;padding:4px 8px;border-bottom:1px solid #222"><span style="color:#fff">' + (q.title||q.id) + '</span> <span style="color:#72767d">— ' + (q.description||'') + '</span> <span style="color:#ff9800">+' + ((q.rewards||{}).gold||0) + 'g</span></div>';
    }).join('') +
    '<h4 style="color:#5b5bff;font-size:12px;margin:10px 0 6px 0">Weekly (' + (guildQuests.weekly||[]).length + ')</h4>' +
    (guildQuests.weekly||[]).map(function(q) {
      return '<div style="font-size:12px;padding:4px 8px;border-bottom:1px solid #222"><span style="color:#fff">' + (q.title||q.id) + '</span> <span style="color:#72767d">— ' + (q.description||'') + '</span> <span style="color:#ff9800">+' + ((q.rewards||{}).gold||0) + 'g</span></div>';
    }).join('') +
    '<h4 style="color:#e91e63;font-size:12px;margin:10px 0 6px 0">Limited (' + (guildQuests.limited||[]).length + ')</h4>' +
    (guildQuests.limited||[]).map(function(q) {
      return '<div style="font-size:12px;padding:4px 8px;border-bottom:1px solid #222"><span style="color:#fff">' + (q.title||q.id) + '</span> <span style="color:#72767d">— ' + (q.description||'') + '</span></div>';
    }).join('') +
    '</div>' +
    '</div>' +
    // Defense Quests
    (defenseQuests.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🛡️ Defense Quests</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(250px,1fr));gap:12px">' +
    defenseQuests.map(function(q) {
      var enemy = q.enemy || {};
      return '<div style="background:#2a2e35;padding:14px;border-radius:8px;border-left:3px solid #e91e63"><div style="color:#fff;font-weight:600;margin-bottom:4px">' + (q.name||q.id) + '</div><div style="color:#72767d;font-size:11px;margin-bottom:6px">' + (q.description||'') + '</div><div style="font-size:11px"><span style="color:#8b8fa3">Min Level: </span><span style="color:#ff9800">' + (q.minLevel||1) + '</span> • <span style="color:#8b8fa3">Enemy: </span><span style="color:#f44336">' + (enemy.name||'?') + ' Lv' + (enemy.level||'?') + '</span></div><div style="font-size:11px;margin-top:4px"><span style="color:#8b8fa3">Rewards: </span><span style="color:#4caf50">' + ((q.reward||{}).xp||0) + ' XP, ' + ((q.reward||{}).gold||0) + 'g</span>' + ((q.reward||{}).unlockClass ? ' <span style="color:#9c27b0">Unlocks: ' + q.reward.unlockClass + '</span>' : '') + '</div></div>';
    }).join('') +
    '</div></div>' : '') +
    // World Bosses Defeated
    (Object.keys(worldBossAgg).length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🐉 World Bosses Defeated</h3>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px">' +
    Object.entries(worldBossAgg).map(function(entry) {
      return '<div style="background:#2a2e35;padding:12px;border-radius:8px;text-align:center"><div style="font-size:24px">🐉</div><div style="color:#fff;font-weight:600;font-size:13px">' + entry[0] + '</div><div style="color:#ff9800;font-size:12px">' + entry[1] + ' player' + (entry[1] > 1 ? 's' : '') + '</div></div>';
    }).join('') +
    '</div></div>' : '') +
    // Guild Boss History
    (guildBossHistory.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">👑 Guild Boss History</h3>' +
    '<div style="max-height:250px;overflow-y:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:6px;color:#8b8fa3">Guild</th><th style="text-align:left;padding:6px;color:#8b8fa3">Boss</th><th style="text-align:right;padding:6px;color:#8b8fa3">Tier</th><th style="text-align:right;padding:6px;color:#8b8fa3">Damage</th><th style="text-align:right;padding:6px;color:#8b8fa3">Players</th><th style="text-align:left;padding:6px;color:#8b8fa3">Date</th></tr></thead><tbody>' +
    guildBossHistory.map(function(bh) {
      return '<tr style="border-bottom:1px solid #222"><td style="padding:6px;color:#fff">' + bh.guild + '</td><td style="padding:6px;color:#e91e63">' + bh.boss + '</td><td style="text-align:right;padding:6px;color:#ff9800">T' + bh.tier + '</td><td style="text-align:right;padding:6px;color:#f44336;font-weight:600">' + bh.damage.toLocaleString() + '</td><td style="text-align:right;padding:6px;color:#5b5bff">' + bh.participants + '</td><td style="padding:6px;color:#8b8fa3">' + (bh.timestamp ? new Date(bh.timestamp).toLocaleDateString() : 'N/A') + '</td></tr>';
    }).join('') +
    '</tbody></table></div></div>' : '') +
    // Recent Deaths
    (allDeaths.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:20px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">💀 Recent Deaths</h3>' +
    '<div style="max-height:200px;overflow-y:auto">' +
    allDeaths.slice(0, 25).map(function(d) {
      return '<div style="padding:6px 10px;border-bottom:1px solid #222;font-size:12px"><span style="color:#8b8fa3">' + new Date(d.timestamp||0).toLocaleString() + '</span> 💀 <strong style="color:#fff">' + (d.player||'?') + '</strong> <span style="color:#72767d">(Lv' + d.playerLevel + ')</span> killed by <span style="color:#f44336">' + (d.enemy||'?') + '</span> <span style="color:#72767d">(Lv' + d.enemyLevel + ') [' + (d.type||'combat') + ']</span></div>';
    }).join('') +
    '</div></div>' : '') +
    '</div>' +
    // Charts
    '<script>' +
    'document.addEventListener("DOMContentLoaded", function() {' +
    // Combat by Type grouped bar chart
    'var ctCtx = document.getElementById("combatTypeChart");' +
    'if (ctCtx) { new Chart(ctCtx, {' +
      'type: "bar",' +
      'data: { labels: ' + JSON.stringify(ctLabels) + ', datasets: [' +
      '{ label: "Wins", data: ' + JSON.stringify(ctWins) + ', backgroundColor: "#4caf5088", borderColor: "#4caf50", borderWidth: 1, borderRadius: 4 },' +
      '{ label: "Losses", data: ' + JSON.stringify(ctLosses) + ', backgroundColor: "#f4433688", borderColor: "#f44336", borderWidth: 1, borderRadius: 4 }' +
      '] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#8b8fa3", usePointStyle: true } } }, scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3" } }, x: { grid: { display: false }, ticks: { color: "#8b8fa3" } } } }' +
    '}); }' +
    // Guild Rank Distribution
    'var grCtx = document.getElementById("guildRankChart");' +
    'if (grCtx) { new Chart(grCtx, {' +
      'type: "doughnut",' +
      'data: { labels: ' + JSON.stringify(Object.keys(rankCounts)) + ', datasets: [{ data: ' + JSON.stringify(Object.values(rankCounts)) + ', backgroundColor: ["#9e9e9e","#4caf50","#2196f3","#ff9800","#e91e63","#9c27b0","#ffd700"], borderWidth: 0 }] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#8b8fa3", font: { size: 12 }, padding: 10, usePointStyle: true } } } }' +
    '}); }' +
    '});' +
    '<\/script>';
}

// Stream Comparison tab
export function renderStreamCompareTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, guilds, leveling, players, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const h = history || [];
  if (h.length < 2) {
    return '<div class="card"><h2>🆚 Stream Comparison</h2><p style="color:#b0b0b0">Need at least 2 streams to compare.</p></div>';
  }
  const sortedStreams = h.slice().sort((a, b) => new Date(b.startedAt || b.date) - new Date(a.startedAt || a.date));

  // Build dropdown options
  const buildOptions = (selectedIdx) => sortedStreams.map((s, i) => {
    const date = new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const game = (s.game || 'Unknown').substring(0, 25);
    const peak = s.peakViewers || 0;
    return '<option value="' + i + '"' + (i === selectedIdx ? ' selected' : '') + '>' + date + ' - ' + game + ' (' + peak + ' peak)</option>';
  }).join('');

  const streamOptions = buildOptions(0);
  const streamOptions2 = buildOptions(1);
  const streamOptions3 = '<option value="-1" selected>— None —</option>' + sortedStreams.map((s, i) => {
    const date = new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
    const game = (s.game || 'Unknown').substring(0, 25);
    const peak = s.peakViewers || 0;
    return '<option value="' + i + '">' + date + ' - ' + game + ' (' + peak + ' peak)</option>';
  }).join('');

  // Pre-generate all stream data for JS
  const streamData = JSON.stringify(sortedStreams.map(s => ({
    date: new Date(s.startedAt || s.date).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' }),
    game: s.game || 'Unknown',
    title: s.title || 'No title',
    peakViewers: s.peakViewers || 0,
    avgViewers: s.avgViewers || s.averageViewers || 0,
    duration: s.durationMinutes || 0,
    followers: s.followers || s.newFollowers || 0,
    subs: s.subscribers || s.newSubs || 0,
    engagement: (s.peakViewers || 0) + ((s.subscribers || 0) * 10) + ((s.followers || 0) * 2)
  })));

  return '<div class="card"><h2 style="margin-bottom:25px">🆚 Stream Comparison</h2>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 20px 0">Compare up to three streams side by side. Select Stream C to add a third.</p>' +
    '<div style="display:grid;grid-template-columns:1fr auto 1fr auto 1fr;gap:12px;align-items:end;margin-bottom:30px">' +
    '<div>' +
    '<label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Stream A</label>' +
    '<select id="streamA" onchange="compareStreams()" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #5b5bff44;border-radius:6px;color:#fff;font-size:12px">' + streamOptions + '</select>' +
    '</div>' +
    '<div style="text-align:center;padding-bottom:3px"><span style="font-size:18px;color:#5b5bff;font-weight:700">VS</span></div>' +
    '<div>' +
    '<label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Stream B</label>' +
    '<select id="streamB" onchange="compareStreams()" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #e91e6344;border-radius:6px;color:#fff;font-size:12px">' + streamOptions2 + '</select>' +
    '</div>' +
    '<div style="text-align:center;padding-bottom:3px"><span style="font-size:18px;color:#ff9800;font-weight:700">VS</span></div>' +
    '<div>' +
    '<label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Stream C <span style="color:#666">(optional)</span></label>' +
    '<select id="streamC" onchange="compareStreams()" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #ff980044;border-radius:6px;color:#fff;font-size:12px">' + streamOptions3 + '</select>' +
    '</div>' +
    '</div>' +
    '<div id="compare-result"></div>' +
    '<div style="margin-top:20px;background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📊 Visual Comparison</h3>' +
    '<div style="height:280px"><canvas id="compare-chart"></canvas></div>' +
    '</div>' +
    '</div>' +
    '<script src="https://cdn.jsdelivr.net/npm/chart.js"><\/script>' +
    '<script>' +
    'var allStreams = ' + streamData + ';' +
    'var compareChart = null;' +
    'function compareStreams() {' +
    '  var ai = parseInt(document.getElementById("streamA").value);' +
    '  var bi = parseInt(document.getElementById("streamB").value);' +
    '  var ciEl = document.getElementById("streamC");' +
    '  var ci = ciEl ? parseInt(ciEl.value) : -1;' +
    '  var a = allStreams[ai]; var b = allStreams[bi]; var c = ci >= 0 ? allStreams[ci] : null;' +
    '  if (!a || !b) return;' +
    '  var has3 = !!c;' +
    '  function diff(va, vb) { var d = va - vb; var pct = vb > 0 ? ((d/vb)*100).toFixed(0) : "n/a"; return "<span style=\\"color:" + (d > 0 ? "#4caf50" : d < 0 ? "#ef5350" : "#8b8fa3") + ";font-weight:700\\">" + (d > 0 ? "+" : "") + d + (pct !== "n/a" ? " (" + (d > 0 ? "+" : "") + pct + "%)" : "") + "</span>"; }' +
    '  function best3(va, vb, vc) { var mx = Math.max(va, vb, vc); if (mx === va) return "A"; if (mx === vb) return "B"; return "C"; }' +
    '  var metrics = [' +
    '    { label: "📊 Peak Viewers", key: "peakViewers" },' +
    '    { label: "👥 Avg Viewers", key: "avgViewers" },' +
    '    { label: "⏱️ Duration (min)", key: "duration" },' +
    '    { label: "❤️ Followers", key: "followers" },' +
    '    { label: "⭐ Subs", key: "subs" },' +
    '    { label: "🔥 Engagement", key: "engagement" }' +
    '  ];' +
    // Stream header cards
    '  var gridCols = has3 ? "1fr 1fr 1fr" : "1fr 1fr";' +
    '  var html = "<div style=\\"display:grid;grid-template-columns:" + gridCols + ";gap:16px;margin-bottom:15px\\">";' +
    '  html += "<div style=\\"background:#5b5bff11;border:1px solid #5b5bff33;border-radius:10px;padding:14px\\"><div style=\\"font-size:13px;font-weight:700;color:#5b5bff;margin-bottom:4px\\">🅰️ " + a.date + "</div><div style=\\"color:#b5bac1;font-size:12px\\">" + a.game + "</div><div style=\\"color:#72767d;font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\\">" + a.title + "</div></div>";' +
    '  html += "<div style=\\"background:#e91e6311;border:1px solid #e91e6333;border-radius:10px;padding:14px\\"><div style=\\"font-size:13px;font-weight:700;color:#e91e63;margin-bottom:4px\\">🅱️ " + b.date + "</div><div style=\\"color:#b5bac1;font-size:12px\\">" + b.game + "</div><div style=\\"color:#72767d;font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\\">" + b.title + "</div></div>";' +
    '  if (has3) html += "<div style=\\"background:#ff980011;border:1px solid #ff980033;border-radius:10px;padding:14px\\"><div style=\\"font-size:13px;font-weight:700;color:#ff9800;margin-bottom:4px\\">🅲 " + c.date + "</div><div style=\\"color:#b5bac1;font-size:12px\\">" + c.game + "</div><div style=\\"color:#72767d;font-size:11px;margin-top:3px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis\\">" + c.title + "</div></div>";' +
    '  html += "</div>";' +
    // Metrics table
    '  html += "<table style=\\"width:100%;border-collapse:collapse;font-size:13px\\"><thead><tr style=\\"border-bottom:2px solid #333\\"><th style=\\"text-align:left;padding:10px;color:#8b8fa3\\">Metric</th><th style=\\"text-align:right;padding:10px;color:#5b5bff\\">A</th><th style=\\"text-align:right;padding:10px;color:#e91e63\\">B</th>" + (has3 ? "<th style=\\"text-align:right;padding:10px;color:#ff9800\\">C</th>" : "") + "<th style=\\"text-align:right;padding:10px;color:#8b8fa3\\">Best</th></tr></thead><tbody>";' +
    '  var aWins = 0, bWins = 0, cWins = 0;' +
    '  metrics.forEach(function(m) {' +
    '    var va = a[m.key], vb = b[m.key], vc = has3 ? c[m.key] : 0;' +
    '    var mx = has3 ? Math.max(va, vb, vc) : Math.max(va, vb);' +
    '    if (va === mx) aWins++; else if (vb === mx) bWins++; else if (has3 && vc === mx) cWins++;' +
    '    var bestLabel = va === mx ? "<span style=\\"color:#5b5bff;font-weight:700\\">A</span>" : vb === mx ? "<span style=\\"color:#e91e63;font-weight:700\\">B</span>" : "<span style=\\"color:#ff9800;font-weight:700\\">C</span>";' +
    '    html += "<tr style=\\"border-bottom:1px solid #222\\"><td style=\\"padding:10px;color:#e0e0e0\\">" + m.label + "</td><td style=\\"text-align:right;padding:10px;color:" + (va === mx ? "#5b5bff" : "#8b8fa3") + ";font-weight:" + (va === mx ? "700" : "400") + "\\">" + va + "</td><td style=\\"text-align:right;padding:10px;color:" + (vb === mx ? "#e91e63" : "#8b8fa3") + ";font-weight:" + (vb === mx ? "700" : "400") + "\\">" + vb + "</td>" + (has3 ? "<td style=\\"text-align:right;padding:10px;color:" + (vc === mx ? "#ff9800" : "#8b8fa3") + ";font-weight:" + (vc === mx ? "700" : "400") + "\\">" + vc + "</td>" : "") + "<td style=\\"text-align:right;padding:10px\\">" + bestLabel + "</td></tr>";' +
    '  });' +
    '  html += "</tbody></table>";' +
    // Winner banner
    '  var allWins = [{n:"A",w:aWins,c:"#5b5bff"},{n:"B",w:bWins,c:"#e91e63"}];' +
    '  if (has3) allWins.push({n:"C",w:cWins,c:"#ff9800"});' +
    '  allWins.sort(function(x,y){return y.w-x.w});' +
    '  if (allWins[0].w > allWins[1].w) {' +
    '    html += "<div style=\\"text-align:center;margin-top:15px;padding:12px;background:" + allWins[0].c + "11;border:1px solid " + allWins[0].c + "33;border-radius:8px\\"><span style=\\"font-size:16px;font-weight:700;color:" + allWins[0].c + "\\">🏆 Stream " + allWins[0].n + " wins " + allWins[0].w + "/" + metrics.length + " metrics</span></div>";' +
    '  }' +
    '  document.getElementById("compare-result").innerHTML = html;' +
    // Chart
    '  if (compareChart) compareChart.destroy();' +
    '  var ctx = document.getElementById("compare-chart");' +
    '  if (ctx && typeof Chart !== "undefined") {' +
    '    var datasets = [{' +
    '      label: "A (" + a.date + ")",' +
    '      data: [a.peakViewers, a.avgViewers, a.duration, a.followers, a.subs, a.engagement],' +
    '      backgroundColor: "#5b5bff88",' +
    '      borderColor: "#5b5bff",' +
    '      borderWidth: 1,' +
    '      borderRadius: 4' +
    '    }, {' +
    '      label: "B (" + b.date + ")",' +
    '      data: [b.peakViewers, b.avgViewers, b.duration, b.followers, b.subs, b.engagement],' +
    '      backgroundColor: "#e91e6388",' +
    '      borderColor: "#e91e63",' +
    '      borderWidth: 1,' +
    '      borderRadius: 4' +
    '    }];' +
    '    if (has3) datasets.push({' +
    '      label: "C (" + c.date + ")",' +
    '      data: [c.peakViewers, c.avgViewers, c.duration, c.followers, c.subs, c.engagement],' +
    '      backgroundColor: "#ff980088",' +
    '      borderColor: "#ff9800",' +
    '      borderWidth: 1,' +
    '      borderRadius: 4' +
    '    });' +
    '    compareChart = new Chart(ctx, {' +
    '      type: "bar",' +
    '      data: {' +
    '        labels: ["Peak", "Avg Viewers", "Duration", "Followers", "Subs", "Engagement"],' +
    '        datasets: datasets' +
    '      },' +
    '      options: {' +
    '        responsive: true,' +
    '        maintainAspectRatio: false,' +
    '        plugins: { legend: { display: true, labels: { color: "#8b8fa3", usePointStyle: true } } },' +
    '        scales: {' +
    '          y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3" } },' +
    '          x: { grid: { display: false }, ticks: { color: "#8b8fa3" } }' +
    '        }' +
    '      }' +
    '    });' +
    '  }' +
    '}' +
    'document.addEventListener("DOMContentLoaded", function() { setTimeout(function() { if (allStreams.length >= 2) compareStreams(); }, 100); });' +
    '<\/script>';
}

// RPG Analytics tab
export function renderRPGAnalyticsTab() {
  const { stats, isLive, achievements, auditLogSettings, bounties, commandUsage, crafting, defenseQuests, giveaways, leveling, polls, rpgBot, rpgEvents, schedule, suggestions, viewerCount, welcomeSettings, youtubeAlerts, client, twitchTokens, DATA_DIR, dashboardSettings, startTime, normalizeYouTubeAlertsSettings, cachedReadJSON, logs, membersCache, loadJSON, streamInfo, followerHistory, streamGoals, TWITCH_ACCESS_TOKEN, history, auditLogHistory, STATE_PATH, LOG_FILE, CMD_USAGE_PATH, MODERATION_PATH, logSSEClients, currentStreamViewerData, activityHeatmap, customCommands, levelingConfig, notificationHistory, rpgTestMode, viewerGraphHistory, getRpgSettings, weeklyLeveling, AUDIT_LOG_HISTORY_MAX } = _getState();
  const playersPath = path.join(process.cwd(), 'data', 'players.json');
  const guildsPath = path.join(process.cwd(), 'data', 'guilds.json');
  let players = [];
  let guilds = [];
  try {
    if (fs.existsSync(playersPath)) {
      const raw = cachedReadJSON(playersPath);
      players = Object.values(raw).filter(p => p && p.userId);
    }
  } catch(e) {}
  try {
    if (fs.existsSync(guildsPath)) {
      const raw = cachedReadJSON(guildsPath);
      const serverId = Object.keys(raw)[0];
      if (serverId) guilds = Object.values(raw[serverId]).filter(g => g && g.id);
    }
  } catch(e) {}

  // Aggregate stats
  const totalPlayers = players.length;
  const totalGold = players.reduce((s,p) => s + (p.gold || 0), 0);
  const avgLevel = totalPlayers > 0 ? (players.reduce((s,p) => s + (p.level || 1), 0) / totalPlayers).toFixed(1) : '0';
  const maxLevel = players.reduce((m,p) => Math.max(m, p.level || 1), 0);
  const totalArenaWins = players.reduce((s,p) => s + (p.arenaWins || 0), 0);
  const totalArenaLosses = players.reduce((s,p) => s + (p.arenaLosses || 0), 0);
  const arenaWinRate = (totalArenaWins + totalArenaLosses) > 0 ? ((totalArenaWins / (totalArenaWins + totalArenaLosses)) * 100).toFixed(1) : '0';

  // Class distribution
  const classCounts = {};
  players.forEach(p => { const c = p.class || 'Unknown'; classCounts[c] = (classCounts[c] || 0) + 1; });
  const classLabels = Object.keys(classCounts);
  const classData = Object.values(classCounts);
  const classColors = ['#e91e63','#5b5bff','#4caf50','#ff9800','#00bcd4','#9c27b0','#ffeb3b','#795548'];

  // Level distribution buckets
  const levelBuckets = {'1-10':0,'11-25':0,'26-50':0,'51-75':0,'76-100':0,'101-150':0};
  players.forEach(p => {
    const l = p.level || 1;
    if (l <= 10) levelBuckets['1-10']++;
    else if (l <= 25) levelBuckets['11-25']++;
    else if (l <= 50) levelBuckets['26-50']++;
    else if (l <= 75) levelBuckets['51-75']++;
    else if (l <= 100) levelBuckets['76-100']++;
    else levelBuckets['101-150']++;
  });

  // Profession distribution
  const profCounts = {};
  players.forEach(p => { (p.professions || []).forEach(pr => { profCounts[pr] = (profCounts[pr] || 0) + 1; }); });

  // Progress stats aggregated
  const totalMonsters = players.reduce((s,p) => s + ((p.progressStats||{}).monstersDefeated||0), 0);
  const totalCrafts = players.reduce((s,p) => s + ((p.progressStats||{}).craftsCompleted||0), 0);
  const totalGathering = players.reduce((s,p) => s + ((p.progressStats||{}).gatheringActions||0), 0);
  const totalGoldEarned = players.reduce((s,p) => s + ((p.progressStats||{}).goldEarned||0), 0);
  const totalDungeons = players.reduce((s,p) => s + ((p.progressStats||{}).dungeonsCleared||0), 0);
  const totalCritHits = players.reduce((s,p) => s + ((p.progressStats||{}).criticalHits||0), 0);

  // Roguelike stats
  const totalRuns = players.reduce((s,p) => s + ((p.roguelikeStats||{}).totalRunsCompleted||0), 0);
  const highestFloor = players.reduce((m,p) => Math.max(m, (p.roguelikeStats||{}).highestFloorReached||0), 0);
  const totalRogueDeaths = players.reduce((s,p) => s + ((p.roguelikeStats||{}).deathCount||0), 0);
  const totalRogueBosses = players.reduce((s,p) => s + ((p.roguelikeStats||{}).bossesDefeated||0), 0);

  // Top players by level
  const topByLevel = [...players].sort((a,b) => (b.level||0) - (a.level||0)).slice(0, 10);
  // Top by gold
  const topByGold = [...players].sort((a,b) => (b.gold||0) - (a.gold||0)).slice(0, 10);
  // Top arena
  const topByArena = [...players].filter(p => (p.arenaWins||0) > 0).sort((a,b) => (b.arenaWins||0) - (a.arenaWins||0)).slice(0, 10);

  // ============================================
  // CREATIVE ANALYTICS DATA COMPUTATION
  // ============================================

  // --- 1. SUPERLATIVE AWARDS ---
  const activePlayers = players.filter(p => (p.level||1) > 1 || (p.gold||0) > 0);
  const superlatives = [];
  
  // Goblin Slayer - most monsters defeated
  const topMonsterSlayer = [...players].sort((a,b) => ((b.progressStats||{}).monstersDefeated||0) - ((a.progressStats||{}).monstersDefeated||0))[0];
  if (topMonsterSlayer && (topMonsterSlayer.progressStats||{}).monstersDefeated > 0)
    superlatives.push({ award: 'The Goblin Slayer', emoji: '⚔️', player: topMonsterSlayer.username, value: (topMonsterSlayer.progressStats.monstersDefeated||0).toLocaleString() + ' kills', color: '#ff6b6b' });
  
  // Dungeon Rat - most dungeons cleared
  const topDungeoneer = [...players].sort((a,b) => ((b.progressStats||{}).dungeonsCleared||0) - ((a.progressStats||{}).dungeonsCleared||0))[0];
  if (topDungeoneer && (topDungeoneer.progressStats||{}).dungeonsCleared > 0)
    superlatives.push({ award: 'Dungeon Rat', emoji: '🏰', player: topDungeoneer.username, value: (topDungeoneer.progressStats.dungeonsCleared||0) + ' cleared', color: '#ffb74d' });
  
  // Golden Hands - most crafts
  const topCrafter = [...players].sort((a,b) => ((b.progressStats||{}).craftsCompleted||0) - ((a.progressStats||{}).craftsCompleted||0))[0];
  if (topCrafter && (topCrafter.progressStats||{}).craftsCompleted > 0)
    superlatives.push({ award: 'Golden Hands', emoji: '🔨', player: topCrafter.username, value: (topCrafter.progressStats.craftsCompleted||0) + ' crafts', color: '#4db6ac' });
  
  // Harvest Moon - most gathering actions
  const topGatherer = [...players].sort((a,b) => ((b.progressStats||{}).gatheringActions||0) - ((a.progressStats||{}).gatheringActions||0))[0];
  if (topGatherer && (topGatherer.progressStats||{}).gatheringActions > 0)
    superlatives.push({ award: 'Harvest Moon', emoji: '🌿', player: topGatherer.username, value: (topGatherer.progressStats.gatheringActions||0).toLocaleString() + ' gathers', color: '#81c784' });
  
  // Scrooge McDuck - richest
  const richest = topByGold[0];
  if (richest && (richest.gold||0) > 0)
    superlatives.push({ award: 'Scrooge McDuck', emoji: '💰', player: richest.username, value: (richest.gold||0).toLocaleString() + ' gold', color: '#ffd700' });
  
  // The Hoarder - most inventory items
  const topHoarder = [...players].sort((a,b) => ((b.inventory||[]).reduce((s,i) => s+(i.quantity||1),0)) - ((a.inventory||[]).reduce((s,i) => s+(i.quantity||1),0)))[0];
  if (topHoarder) {
    const hoardCount = (topHoarder.inventory||[]).reduce((s,i) => s+(i.quantity||1),0);
    if (hoardCount > 0) superlatives.push({ award: 'The Hoarder', emoji: '🎒', player: topHoarder.username, value: hoardCount.toLocaleString() + ' items', color: '#ce93d8' });
  }
  
  // Arena Champion - best arena win rate (min 5 fights)
  const arenaChamp = [...players].filter(p => ((p.arenaWins||0)+(p.arenaLosses||0)) >= 5)
    .sort((a,b) => ((b.arenaWins||0)/((b.arenaWins||0)+(b.arenaLosses||1))) - ((a.arenaWins||0)/((a.arenaWins||0)+(a.arenaLosses||1))))[0];
  if (arenaChamp)
    superlatives.push({ award: 'Arena Champion', emoji: '🏆', player: arenaChamp.username, value: ((arenaChamp.arenaWins||0)/((arenaChamp.arenaWins||0)+(arenaChamp.arenaLosses||1))*100).toFixed(0) + '% win rate', color: '#00bcd4' });
  
  // Rogue Runner - highest roguelike floor
  const topRogue = [...players].sort((a,b) => ((b.roguelikeStats||{}).highestFloorReached||0) - ((a.roguelikeStats||{}).highestFloorReached||0))[0];
  if (topRogue && (topRogue.roguelikeStats||{}).highestFloorReached > 0)
    superlatives.push({ award: 'Rogue Runner', emoji: '🗼', player: topRogue.username, value: 'Floor ' + (topRogue.roguelikeStats.highestFloorReached||0), color: '#ba68c8' });
  
  // World Explorer - most worlds unlocked
  const topExplorer = [...players].sort((a,b) => ((b.worldsUnlocked||[]).length) - ((a.worldsUnlocked||[]).length))[0];
  if (topExplorer && (topExplorer.worldsUnlocked||[]).length > 0)
    superlatives.push({ award: 'World Explorer', emoji: '🗺️', player: topExplorer.username, value: (topExplorer.worldsUnlocked||[]).length + ' worlds', color: '#64b5f6' });
  
  // Boss Slayer - most world bosses defeated
  const topBossSlayer = [...players].sort((a,b) => ((b.worldBossesDefeated||[]).length) - ((a.worldBossesDefeated||[]).length))[0];
  if (topBossSlayer && (topBossSlayer.worldBossesDefeated||[]).length > 0)
    superlatives.push({ award: 'Boss Slayer', emoji: '🐉', player: topBossSlayer.username, value: (topBossSlayer.worldBossesDefeated||[]).length + ' bosses', color: '#ef5350' });
  
  // Skill Master - most skills learned
  const topSkillMaster = [...players].sort((a,b) => ((b.skills||[]).length) - ((a.skills||[]).length))[0];
  if (topSkillMaster && (topSkillMaster.skills||[]).length > 0)
    superlatives.push({ award: 'Skill Master', emoji: '📚', player: topSkillMaster.username, value: (topSkillMaster.skills||[]).length + ' skills', color: '#7986cb' });
  
  // Critical Machine - most critical hits  
  const topCrit = [...players].sort((a,b) => ((b.progressStats||{}).criticalHits||0) - ((a.progressStats||{}).criticalHits||0))[0];
  if (topCrit && (topCrit.progressStats||{}).criticalHits > 0)
    superlatives.push({ award: 'Critical Machine', emoji: '💥', player: topCrit.username, value: (topCrit.progressStats.criticalHits||0).toLocaleString() + ' crits', color: '#e57373' });
  
  // Glass Cannon - highest offense stats with lowest defense
  const glassCannonCandidates = players.filter(p => (p.strength||0) > 0 && (p.defense||0) > 0);
  if (glassCannonCandidates.length > 0) {
    const glassCannon = [...glassCannonCandidates].sort((a,b) => {
      const ratioA = ((a.strength||0)+(a.intelligence||0)) / Math.max(1,(a.defense||0)+(a.vitality||0));
      const ratioB = ((b.strength||0)+(b.intelligence||0)) / Math.max(1,(b.defense||0)+(b.vitality||0));
      return ratioB - ratioA;
    })[0];
    if (glassCannon) superlatives.push({ award: 'Glass Cannon', emoji: '🔮', player: glassCannon.username, value: 'ATK:' + ((glassCannon.strength||0)+(glassCannon.intelligence||0)) + ' DEF:' + ((glassCannon.defense||0)+(glassCannon.vitality||0)), color: '#ff8a65' });
  }
  
  // The Tank - highest defense+vitality
  const topTank = [...players].sort((a,b) => ((b.defense||0)+(b.vitality||0)+(b.maxHp||0)) - ((a.defense||0)+(a.vitality||0)+(a.maxHp||0)))[0];
  if (topTank && ((topTank.defense||0)+(topTank.vitality||0)) > 0)
    superlatives.push({ award: 'The Tank', emoji: '🛡️', player: topTank.username, value: (topTank.maxHp||0).toLocaleString() + ' HP', color: '#4fc3f7' });
  
  // Marathon Gatherer - highest auto-gather count
  const topAutoGather = [...players].sort((a,b) => (b.autoGatherCount||0) - (a.autoGatherCount||0))[0];
  if (topAutoGather && (topAutoGather.autoGatherCount||0) > 0)
    superlatives.push({ award: 'Marathon Gatherer', emoji: '⛏️', player: topAutoGather.username, value: (topAutoGather.autoGatherCount||0).toLocaleString() + ' auto-gathers', color: '#a1887f' });

  const superlativeAwardsHtml = superlatives.map(s =>
    '<div style="background:linear-gradient(135deg,' + s.color + '11,' + s.color + '05);border:1px solid ' + s.color + '44;border-radius:12px;padding:16px;text-align:center;min-width:180px">' +
    '<div style="font-size:32px;margin-bottom:6px">' + s.emoji + '</div>' +
    '<div style="font-size:11px;color:' + s.color + ';font-weight:700;text-transform:uppercase;letter-spacing:1px;margin-bottom:6px">' + s.award + '</div>' +
    '<div style="font-size:15px;color:#fff;font-weight:600;margin-bottom:4px">' + (s.player||'Unknown') + '</div>' +
    '<div style="font-size:12px;color:#8b8fa3">' + s.value + '</div></div>'
  ).join('');

  // --- 2. ECONOMY HEALTH INDEX ---
  const goldValues = players.map(p => p.gold || 0).sort((a,b) => a-b);
  const medianGold = goldValues.length > 0 ? goldValues[Math.floor(goldValues.length / 2)] : 0;
  const avgGoldVal = totalPlayers > 0 ? Math.round(totalGold / totalPlayers) : 0;
  
  // Gini coefficient calculation
  let giniCoeff = 0;
  if (goldValues.length > 1) {
    const n = goldValues.length;
    const sumOfDiffs = goldValues.reduce((sum, gi, i) => {
      return sum + goldValues.reduce((s2, gj) => s2 + Math.abs(gi - gj), 0);
    }, 0);
    const meanGold = totalGold / n;
    giniCoeff = meanGold > 0 ? (sumOfDiffs / (2 * n * n * meanGold)) : 0;
  }
  
  // Top 10% wealth share
  const top10Pct = Math.max(1, Math.ceil(goldValues.length * 0.1));
  const top10Gold = goldValues.slice(-top10Pct).reduce((s,g) => s+g, 0);
  const top10Share = totalGold > 0 ? ((top10Gold / totalGold) * 100).toFixed(1) : '0';
  
  // Economy health grade
  let econGrade = 'A';
  let econColor = '#4caf50';
  if (giniCoeff > 0.8) { econGrade = 'F'; econColor = '#ff1744'; }
  else if (giniCoeff > 0.65) { econGrade = 'D'; econColor = '#ff6b6b'; }
  else if (giniCoeff > 0.5) { econGrade = 'C'; econColor = '#ff9800'; }
  else if (giniCoeff > 0.35) { econGrade = 'B'; econColor = '#ffeb3b'; }
  
  // Gold earned vs current gold (spending indicator)
  const totalEverEarned = players.reduce((s,p) => s + ((p.progressStats||{}).goldEarned||0), 0);
  const goldSpentPct = totalEverEarned > 0 ? (((totalEverEarned - totalGold) / totalEverEarned) * 100).toFixed(1) : '0';
  
  // Richest vs poorest ratio
  const richestGold = goldValues.length > 0 ? goldValues[goldValues.length-1] : 0;
  const poorestGold = goldValues.length > 0 ? goldValues[0] : 0;
  const wealthRatio = poorestGold > 0 ? Math.round(richestGold / poorestGold) : richestGold > 0 ? '∞' : '0';
  
  // Lorenz curve data points (10 percentile buckets)
  const lorenzData = [];
  if (goldValues.length > 0) {
    for (let pct = 0; pct <= 100; pct += 10) {
      const idx = Math.min(Math.floor(goldValues.length * pct / 100), goldValues.length);
      const cumGold = goldValues.slice(0, idx).reduce((s,g) => s+g, 0);
      lorenzData.push({ pct, cumGold: totalGold > 0 ? ((cumGold / totalGold) * 100).toFixed(1) : 0 });
    }
  }

  // --- 3. PLAYER PERSONALITY RADAR (AI Tendencies) ---
  const playersWithAI = players.filter(p => p.aiTendencies && typeof p.aiTendencies === 'object');
  const aiLabels = ['Aggression', 'Risk Taking', 'Skill Usage', 'Resource Conservation', 'Defensive Priority', 'Finisher Usage'];
  const aiKeys = ['aggression', 'riskTaking', 'skillUsage', 'resourceConservation', 'defensivePriority', 'finisherUsage'];
  
  // Server averages
  const aiAvgs = aiKeys.map(k => {
    if (playersWithAI.length === 0) return 0;
    return +(playersWithAI.reduce((s,p) => s + (p.aiTendencies[k]||0), 0) / playersWithAI.length).toFixed(2);
  });
  
  // Find extremes
  const mostAggressive = [...playersWithAI].sort((a,b) => (b.aiTendencies.aggression||0) - (a.aiTendencies.aggression||0))[0];
  const mostCautious = [...playersWithAI].sort((a,b) => (b.aiTendencies.defensivePriority||0) - (a.aiTendencies.defensivePriority||0))[0];
  const biggestRiskTaker = [...playersWithAI].sort((a,b) => (b.aiTendencies.riskTaking||0) - (a.aiTendencies.riskTaking||0))[0];
  
  // Top 3 players for individual radar display
  const radarPlayers = playersWithAI.slice(0, 3).map(p => ({
    name: p.username,
    data: aiKeys.map(k => +(p.aiTendencies[k]||0).toFixed(2))
  }));

  // --- 4. THE GRAVEYARD (Death Analytics) ---
  const totalArenaDeaths = players.reduce((s,p) => s + (p.arenaLosses||0), 0);
  const totalDeathsAll = totalRogueDeaths + totalArenaDeaths;
  const deathsByType = {
    'Arena': totalArenaDeaths,
    'Roguelike': totalRogueDeaths
  };
  
  // Players with most combined deaths  
  const topDeathPlayers = [...players].sort((a,b) => {
    const deathsA = (a.arenaLosses||0) + ((a.roguelikeStats||{}).deathCount||0);
    const deathsB = (b.arenaLosses||0) + ((b.roguelikeStats||{}).deathCount||0);
    return deathsB - deathsA;
  }).slice(0, 5);
  
  // Last enemy data (what killed people last)
  const lastEnemyCounts = {};
  players.forEach(p => {
    if (p.lastEnemy && p.lastEnemy.name) {
      lastEnemyCounts[p.lastEnemy.name] = (lastEnemyCounts[p.lastEnemy.name]||0) + 1;
    }
  });
  const topEnemies = Object.entries(lastEnemyCounts).sort((a,b) => b[1]-a[1]).slice(0, 5);
  
  // "Overconfidence index" — players fighting enemies way above their level
  let overconfidentBattles = 0;
  let totalBattleRecords = 0;
  players.forEach(p => {
    if (p.lastEnemy && p.lastEnemy.level) {
      totalBattleRecords++;
      if ((p.lastEnemy.level||0) > (p.level||1) + 10) overconfidentBattles++;
    }
  });
  const overconfidenceRate = totalBattleRecords > 0 ? ((overconfidentBattles / totalBattleRecords) * 100).toFixed(0) : '0';

  // --- 5. RISK & LUCK METERS ---
  // Roguelike risk profiles
  const roguelikePlayers = players.filter(p => (p.roguelikeStats||{}).totalRunsCompleted > 0);
  const chickenScoreAvg = roguelikePlayers.length > 0 
    ? (roguelikePlayers.reduce((s,p) => s + ((p.roguelikeStats.voluntaryExits||0) / Math.max(1, p.roguelikeStats.totalRunsCompleted)), 0) / roguelikePlayers.length * 100).toFixed(0)
    : '0';
  const yoloScoreAvg = roguelikePlayers.length > 0
    ? (roguelikePlayers.reduce((s,p) => s + ((p.roguelikeStats.deathCount||0) / Math.max(1, p.roguelikeStats.totalRunsCompleted)), 0) / roguelikePlayers.length * 100).toFixed(0)
    : '0';
  const rogueBossEfficiency = roguelikePlayers.length > 0
    ? (roguelikePlayers.reduce((s,p) => s + ((p.roguelikeStats.bossesDefeated||0) / Math.max(1, p.roguelikeStats.totalRunsCompleted)), 0) / roguelikePlayers.length).toFixed(1)
    : '0';
  
  // Arena risk   
  const arenaParticipants = players.filter(p => ((p.arenaWins||0)+(p.arenaLosses||0)) > 0);
  const avgArenaWinRate = arenaParticipants.length > 0
    ? (arenaParticipants.reduce((s,p) => s + ((p.arenaWins||0) / Math.max(1, (p.arenaWins||0)+(p.arenaLosses||0))), 0) / arenaParticipants.length * 100).toFixed(0)
    : '0';
  
  // Biggest gambler (most arena fights)
  const biggestGambler = [...players].sort((a,b) => ((b.arenaWins||0)+(b.arenaLosses||0)) - ((a.arenaWins||0)+(a.arenaLosses||0)))[0];
  
  // Risk profile: efficient roguelike runner vs reckless
  const riskProfiles = roguelikePlayers.map(p => ({
    name: p.username,
    chicken: p.roguelikeStats.totalRunsCompleted > 0 ? ((p.roguelikeStats.voluntaryExits||0) / p.roguelikeStats.totalRunsCompleted * 100).toFixed(0) : '0',
    yolo: p.roguelikeStats.totalRunsCompleted > 0 ? ((p.roguelikeStats.deathCount||0) / p.roguelikeStats.totalRunsCompleted * 100).toFixed(0) : '0',
    floor: p.roguelikeStats.highestFloorReached||0,
    bosses: p.roguelikeStats.bossesDefeated||0,
    runs: p.roguelikeStats.totalRunsCompleted||0
  })).sort((a,b) => b.floor - a.floor).slice(0, 8);

  // --- 6. PLAYER ARCHETYPE CLASSIFICATION ---
  const archetypeData = players.filter(p => (p.level||1) > 1).map(p => {
    const combat = ((p.progressStats||{}).monstersDefeated||0) + ((p.progressStats||{}).criticalHits||0);
    const crafting = ((p.progressStats||{}).craftsCompleted||0) * 5;
    const gathering = ((p.progressStats||{}).gatheringActions||0);
    const exploration = ((p.worldsUnlocked||[]).length * 100) + ((p.worldBossesDefeated||[]).length * 50);
    const social = (p.arenaWins||0) * 3 + (p.arenaLosses||0) + (p.guildXP||0);
    const dungeoneering = ((p.progressStats||{}).dungeonsCleared||0) * 10 + ((p.roguelikeStats||{}).totalRunsCompleted||0) * 5;
    
    const scores = { combat, crafting, gathering, exploration, social, dungeoneering };
    const maxKey = Object.entries(scores).sort((a,b) => b[1]-a[1])[0];
    
    const archetypeMap = {
      combat: { name: 'Warrior', emoji: '⚔️', color: '#ff6b6b' },
      crafting: { name: 'Artisan', emoji: '🔨', color: '#4db6ac' },
      gathering: { name: 'Farmer', emoji: '🌾', color: '#81c784' },
      exploration: { name: 'Explorer', emoji: '🗺️', color: '#64b5f6' },
      social: { name: 'Gladiator', emoji: '🏟️', color: '#ffb74d' },
      dungeoneering: { name: 'Delver', emoji: '🏰', color: '#ba68c8' }
    };
    
    // Check if well-rounded (no single category > 40% of total)
    const totalScore = Object.values(scores).reduce((s,v) => s+v, 0);
    const maxPct = totalScore > 0 ? (maxKey[1] / totalScore) : 0;
    
    let archetype;
    if (totalScore === 0) {
      archetype = { name: 'Newcomer', emoji: '🌟', color: '#8b8fa3' };
    } else if (maxPct < 0.35) {
      archetype = { name: 'Completionist', emoji: '👑', color: '#ffd700' };
    } else {
      archetype = archetypeMap[maxKey[0]];
    }
    
    return { username: p.username, level: p.level||1, archetype, scores, totalScore };
  });
  
  // Archetype distribution
  const archetypeCounts = {};
  archetypeData.forEach(p => {
    const n = p.archetype.name;
    archetypeCounts[n] = (archetypeCounts[n]||0) + 1;
  });
  const archetypeLabels = Object.keys(archetypeCounts);
  const archetypeValues = Object.values(archetypeCounts);
  const archetypeColors = archetypeLabels.map(n => {
    const colorMap = { Warrior:'#ff6b6b', Artisan:'#4db6ac', Farmer:'#81c784', Explorer:'#64b5f6', Gladiator:'#ffb74d', Delver:'#ba68c8', Completionist:'#ffd700', Newcomer:'#8b8fa3' };
    return colorMap[n] || '#5b5bff';
  });
  
  // Top archetyped players for display
  const archetypeShowcase = archetypeData.filter(p => p.totalScore > 0).sort((a,b) => b.totalScore - a.totalScore).slice(0, 12);

  // Guild stats
  const guildRows = guilds.map(g => {
    const memberCount = Object.keys(g.members || {}).length;
    return '<tr><td style="color:#fff;font-weight:600">' + (g.name||'Unknown') + '</td><td>' + memberCount + '</td><td>' + (g.level||1) + '</td><td>' + (g.gold||0).toLocaleString() + '</td><td>' + (g.xp||0).toLocaleString() + '</td><td>' + (g.bossHistory||[]).length + '</td></tr>';
  }).join('');

  // Active events summary
  const activeEvts = rpgEvents.activeEvents || [];
  const activeEventsHtml = activeEvts.length > 0 
    ? activeEvts.map(e => '<div style="display:inline-block;padding:6px 14px;background:#5b5bff22;border:1px solid #5b5bff;border-radius:20px;margin:4px;font-size:13px">' + (e.emoji||'🎮') + ' ' + (e.name||'Event') + ' <span style="color:#8b8fa3">(' + Math.max(0, Math.round(((e.endsAt||0) - Date.now()) / 60000)) + 'min left)</span></div>').join('')
    : '<span style="color:#72767d">No active events</span>';

  return '<div class="card"><h2 style="margin-bottom:25px">🎮 RPG Analytics</h2>' +
    // Active events banner
    '<div style="margin-bottom:20px;padding:15px;background:#2b2d31;border-radius:10px;border:1px solid #5b5bff33">' +
    '<h3 style="margin:0 0 10px 0;font-size:14px;color:#8b8fa3">⚡ Active Events</h3>' + activeEventsHtml + '</div>' +
    // Summary cards row
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:30px">' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(91,91,255,0.2)"><div style="font-size:28px;font-weight:700;color:#5b5bff">' + totalPlayers + '</div><div style="color:#8b8fa3;font-size:12px;margin-top:4px">Total Players</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(233,30,99,0.2)"><div style="font-size:28px;font-weight:700;color:#e91e63">' + avgLevel + '</div><div style="color:#8b8fa3;font-size:12px;margin-top:4px">Avg Level</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(255,152,0,0.2)"><div style="font-size:28px;font-weight:700;color:#ff9800">Lv.' + maxLevel + '</div><div style="color:#8b8fa3;font-size:12px;margin-top:4px">Highest Level</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(76,175,80,0.2)"><div style="font-size:28px;font-weight:700;color:#4caf50">' + (totalGold >= 1e6 ? (totalGold/1e6).toFixed(1)+'M' : totalGold.toLocaleString()) + '</div><div style="color:#8b8fa3;font-size:12px;margin-top:4px">Total Gold</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(0,188,212,0.2)"><div style="font-size:28px;font-weight:700;color:#00bcd4">' + arenaWinRate + '%</div><div style="color:#8b8fa3;font-size:12px;margin-top:4px">Arena Win Rate</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(156,39,176,0.2)"><div style="font-size:28px;font-weight:700;color:#9c27b0">' + guilds.length + '</div><div style="color:#8b8fa3;font-size:12px;margin-top:4px">Guilds</div></div>' +
    '</div>' +
    // Progress stats cards
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:12px;margin-bottom:30px">' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ff6b6b">⚔️ ' + totalMonsters.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Monsters Killed</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#4db6ac">🔨 ' + totalCrafts.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Items Crafted</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#81c784">🌿 ' + totalGathering.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Gathering Actions</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ffb74d">🏰 ' + totalDungeons.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Dungeons Cleared</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#e57373">💥 ' + totalCritHits.toLocaleString() + '</div><div style="color:#72767d;font-size:11px;margin-top:4px">Critical Hits</div></div>' +
    '<div style="background:#2a2e35;padding:14px;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ba68c8">🗼 ' + totalRuns + ' runs</div><div style="color:#72767d;font-size:11px;margin-top:4px">Roguelike (Floor ' + highestFloor + ')</div></div>' +
    '</div>' +
    // Charts row
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🎭 Class Distribution</h3><div style="height:250px"><canvas id="classDistChart"></canvas></div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📊 Level Distribution</h3><div style="height:250px"><canvas id="levelDistChart"></canvas></div></div>' +
    '</div>' +
    // Profession chart
    (Object.keys(profCounts).length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🛠️ Profession Popularity</h3><div style="height:200px"><canvas id="profChart"></canvas></div></div>' : '') +
    // Leaderboards
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:30px">' +
    // Top by level
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🏆 Top Players by Level</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Player</th><th style="text-align:left;padding:8px;color:#8b8fa3">Class</th><th style="text-align:right;padding:8px;color:#8b8fa3">Level</th></tr></thead><tbody>' +
    topByLevel.map((p,i) => '<tr style="border-bottom:1px solid #222"><td style="padding:8px;color:#fff">' + (i<3?['🥇','🥈','🥉'][i]:''+(i+1)) + ' ' + (p.username||'Unknown') + '</td><td style="padding:8px;color:#b5bac1">' + (p.class||'-') + '</td><td style="text-align:right;padding:8px;color:#5b5bff;font-weight:700">' + (p.level||1) + '</td></tr>').join('') +
    '</tbody></table></div>' +
    // Top by gold
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">💰 Top Players by Gold</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Player</th><th style="text-align:right;padding:8px;color:#8b8fa3">Gold</th></tr></thead><tbody>' +
    topByGold.map((p,i) => '<tr style="border-bottom:1px solid #222"><td style="padding:8px;color:#fff">' + (i<3?['🥇','🥈','🥉'][i]:''+(i+1)) + ' ' + (p.username||'Unknown') + '</td><td style="text-align:right;padding:8px;color:#ff9800;font-weight:700">' + (p.gold||0).toLocaleString() + '</td></tr>').join('') +
    '</tbody></table></div>' +
    '</div>' +
    // Arena leaderboard
    (topByArena.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">⚔️ Arena Leaderboard</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Player</th><th style="text-align:right;padding:8px;color:#8b8fa3">Wins</th><th style="text-align:right;padding:8px;color:#8b8fa3">Losses</th><th style="text-align:right;padding:8px;color:#8b8fa3">Win Rate</th></tr></thead><tbody>' +
    topByArena.map((p,i) => {
      const w = p.arenaWins||0, l = p.arenaLosses||0;
      const wr = (w+l) > 0 ? ((w/(w+l))*100).toFixed(1) : '0';
      return '<tr style="border-bottom:1px solid #222"><td style="padding:8px;color:#fff">' + (i<3?['🥇','🥈','🥉'][i]:''+(i+1)) + ' ' + (p.username||'Unknown') + '</td><td style="text-align:right;padding:8px;color:#4caf50;font-weight:700">' + w + '</td><td style="text-align:right;padding:8px;color:#ff6b6b">' + l + '</td><td style="text-align:right;padding:8px;color:#00bcd4;font-weight:700">' + wr + '%</td></tr>';
    }).join('') +
    '</tbody></table></div>' : '') +
    // Guilds table
    (guilds.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:30px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🏰 Guilds Overview</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Guild</th><th style="text-align:right;padding:8px;color:#8b8fa3">Members</th><th style="text-align:right;padding:8px;color:#8b8fa3">Level</th><th style="text-align:right;padding:8px;color:#8b8fa3">Gold</th><th style="text-align:right;padding:8px;color:#8b8fa3">XP</th><th style="text-align:right;padding:8px;color:#8b8fa3">Bosses</th></tr></thead><tbody>' +
    guildRows +
    '</tbody></table></div>' : '') +
    // Event history summary
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;margin-bottom:20px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📜 Recent RPG Events</h3>' +
    ((rpgEvents.eventHistory||[]).length > 0 ?
      '<div style="max-height:200px;overflow-y:auto">' +
      (rpgEvents.eventHistory||[]).slice(-15).reverse().map(e => '<div style="padding:8px 12px;border-bottom:1px solid #222;font-size:13px"><span style="color:#8b8fa3">' + new Date(e.triggeredAt||0).toLocaleString() + '</span> ' + (e.emoji||'🎮') + ' <strong style="color:#fff">' + (e.name||'Event') + '</strong> <span style="color:#72767d">@ ' + (e.viewerCount||0) + ' viewers</span></div>').join('')
      + '</div>'
      : '<span style="color:#72767d">No events triggered yet. Events activate when viewer milestones are reached during streams!</span>') +
    '</div>' +
    '</div>' +
    
    // ============================================
    // SECTION: SUPERLATIVE AWARDS WALL
    // ============================================
    '<div class="card" style="margin-top:30px"><h2 style="margin-bottom:20px">🏅 Superlative Awards Wall</h2>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 20px 0">Automatically computed titles awarded to the most outstanding players in each category.</p>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(190px,1fr));gap:14px">' +
    superlativeAwardsHtml +
    '</div></div>' +
    
    // ============================================
    // SECTION: ECONOMY HEALTH INDEX
    // ============================================
    '<div class="card" style="margin-top:30px"><h2 style="margin-bottom:20px">📊 Economy Health Index</h2>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:16px;margin-bottom:25px">' +
    // Econ Grade
    '<div style="background:linear-gradient(135deg,' + econColor + '15,' + econColor + '05);padding:24px;border-radius:12px;text-align:center;border:2px solid ' + econColor + '66">' +
    '<div style="font-size:48px;font-weight:900;color:' + econColor + '">' + econGrade + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Economy Health</div>' +
    '<div style="color:#72767d;font-size:10px;margin-top:2px">Gini: ' + giniCoeff.toFixed(3) + '</div></div>' +
    // Median Gold
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(255,215,0,0.2)">' +
    '<div style="font-size:24px;font-weight:700;color:#ffd700">' + (medianGold >= 1e6 ? (medianGold/1e6).toFixed(1)+'M' : medianGold.toLocaleString()) + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Median Gold</div></div>' +
    // Avg Gold
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(255,152,0,0.2)">' +
    '<div style="font-size:24px;font-weight:700;color:#ff9800">' + (avgGoldVal >= 1e6 ? (avgGoldVal/1e6).toFixed(1)+'M' : avgGoldVal.toLocaleString()) + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Average Gold</div></div>' +
    // Total Circulation
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(76,175,80,0.2)">' +
    '<div style="font-size:24px;font-weight:700;color:#4caf50">' + (totalGold >= 1e9 ? (totalGold/1e9).toFixed(2)+'B' : totalGold >= 1e6 ? (totalGold/1e6).toFixed(1)+'M' : totalGold.toLocaleString()) + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">In Circulation</div></div>' +
    // Gold Spent %
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(233,30,99,0.2)">' +
    '<div style="font-size:24px;font-weight:700;color:#e91e63">' + goldSpentPct + '%</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Gold Spent (of earned)</div></div>' +
    // Top 10% Share
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(156,39,176,0.2)">' +
    '<div style="font-size:24px;font-weight:700;color:#9c27b0">' + top10Share + '%</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Held by Top 10%</div></div>' +
    // Wealth Ratio
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(0,188,212,0.2)">' +
    '<div style="font-size:24px;font-weight:700;color:#00bcd4">' + wealthRatio + 'x</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Rich/Poor Ratio</div></div>' +
    '</div>' +
    // Lorenz Curve
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px">' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📈 Wealth Distribution (Lorenz Curve)</h3><div style="height:250px"><canvas id="lorenzChart"></canvas></div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">💡 Economy Insights</h3>' +
    '<div style="space-y:10px">' +
    '<div style="padding:12px;background:#2a2e35;border-radius:8px;margin-bottom:8px"><span style="color:#ffd700">💰</span> <span style="color:#e0e0e0">Total gold ever earned:</span> <strong style="color:#4caf50">' + (totalEverEarned >= 1e6 ? (totalEverEarned/1e6).toFixed(1)+'M' : totalEverEarned.toLocaleString()) + '</strong></div>' +
    '<div style="padding:12px;background:#2a2e35;border-radius:8px;margin-bottom:8px"><span style="color:#e91e63">🔥</span> <span style="color:#e0e0e0">Gold removed from economy:</span> <strong style="color:#e91e63">' + ((totalEverEarned-totalGold) >= 1e6 ? ((totalEverEarned-totalGold)/1e6).toFixed(1)+'M' : Math.max(0,totalEverEarned-totalGold).toLocaleString()) + '</strong></div>' +
    '<div style="padding:12px;background:#2a2e35;border-radius:8px;margin-bottom:8px"><span style="color:#ff9800">📊</span> <span style="color:#e0e0e0">Median/Average ratio:</span> <strong style="color:#ff9800">' + (avgGoldVal > 0 ? (medianGold/avgGoldVal).toFixed(2) : '0') + '</strong> <span style="color:#72767d;font-size:11px">(closer to 1 = healthier)</span></div>' +
    '<div style="padding:12px;background:#2a2e35;border-radius:8px;margin-bottom:8px"><span style="color:#9c27b0">🏦</span> <span style="color:#e0e0e0">Economy classification:</span> <strong style="color:' + econColor + '">' + (giniCoeff < 0.3 ? 'Egalitarian' : giniCoeff < 0.5 ? 'Moderate' : giniCoeff < 0.7 ? 'Unequal' : 'Oligarchic') + '</strong></div>' +
    '</div></div></div></div>' +
    
    // ============================================
    // SECTION: PLAYER PERSONALITY RADAR
    // ============================================
    (playersWithAI.length > 0 ?
    '<div class="card" style="margin-top:30px"><h2 style="margin-bottom:20px">🧠 Combat Personality Radar</h2>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 20px 0">Each player\'s AI combat DNA mapped across 6 personality axes. Based on how the AI adapts to each player\'s combat style.</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px">' +
    // Server Average Radar
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🌐 Server Average Personality</h3><div style="height:300px"><canvas id="serverRadarChart"></canvas></div></div>' +
    // Player Comparison Radar
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">👥 Top Players Comparison</h3><div style="height:300px"><canvas id="playerRadarChart"></canvas></div></div>' +
    '</div>' +
    // Personality extremes
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:14px">' +
    (mostAggressive ? '<div style="background:linear-gradient(135deg,#ff6b6b15,#ff6b6b05);border:1px solid #ff6b6b44;border-radius:10px;padding:16px;text-align:center">' +
    '<div style="font-size:24px">🔥</div><div style="color:#ff6b6b;font-weight:700;font-size:12px;text-transform:uppercase;margin:6px 0">Most Aggressive</div>' +
    '<div style="color:#fff;font-weight:600">' + (mostAggressive.username||'Unknown') + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px">' + ((mostAggressive.aiTendencies.aggression||0)*100).toFixed(0) + '% aggression</div></div>' : '') +
    (mostCautious ? '<div style="background:linear-gradient(135deg,#4fc3f715,#4fc3f705);border:1px solid #4fc3f744;border-radius:10px;padding:16px;text-align:center">' +
    '<div style="font-size:24px">🛡️</div><div style="color:#4fc3f7;font-weight:700;font-size:12px;text-transform:uppercase;margin:6px 0">Most Defensive</div>' +
    '<div style="color:#fff;font-weight:600">' + (mostCautious.username||'Unknown') + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px">' + ((mostCautious.aiTendencies.defensivePriority||0)*100).toFixed(0) + '% defensive</div></div>' : '') +
    (biggestRiskTaker ? '<div style="background:linear-gradient(135deg,#ff980015,#ff980005);border:1px solid #ff980044;border-radius:10px;padding:16px;text-align:center">' +
    '<div style="font-size:24px">🎲</div><div style="color:#ff9800;font-weight:700;font-size:12px;text-transform:uppercase;margin:6px 0">Biggest Risk Taker</div>' +
    '<div style="color:#fff;font-weight:600">' + (biggestRiskTaker.username||'Unknown') + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px">' + ((biggestRiskTaker.aiTendencies.riskTaking||0)*100).toFixed(0) + '% risk</div></div>' : '') +
    '</div></div>' : '') +
    
    // ============================================
    // SECTION: THE GRAVEYARD
    // ============================================
    '<div class="card" style="margin-top:30px"><h2 style="margin-bottom:20px">💀 The Graveyard</h2>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 20px 0">Death analytics and the most dangerous aspects of the RPG world.</p>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:16px;margin-bottom:25px">' +
    '<div style="background:linear-gradient(135deg,#ff174415,#ff174405);padding:20px;border-radius:10px;text-align:center;border:1px solid #ff174444">' +
    '<div style="font-size:28px;font-weight:700;color:#ff1744">' + totalDeathsAll + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Total Deaths</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(255,107,107,0.2)">' +
    '<div style="font-size:28px;font-weight:700;color:#ff6b6b">' + totalArenaDeaths + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Arena Defeats</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(186,104,200,0.2)">' +
    '<div style="font-size:28px;font-weight:700;color:#ba68c8">' + totalRogueDeaths + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Roguelike Deaths</div></div>' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(255,152,0,0.2)">' +
    '<div style="font-size:28px;font-weight:700;color:#ff9800">' + overconfidenceRate + '%</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Overconfidence Rate</div>' +
    '<div style="color:#72767d;font-size:10px">fighting 10+ levels above</div></div>' +
    '</div>' +
    // Most dangerous enemies
    (topEnemies.length > 0 ?
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px">' +
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">☠️ Most Encountered Enemies</h3>' +
    '<div>' + topEnemies.map((e,i) => 
      '<div style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid #222">' +
      '<span style="color:#fff;font-size:13px">' + (i===0?'💀 ':i===1?'☠️ ':'⚰️ ') + e[0] + '</span>' +
      '<span style="color:#ff6b6b;font-weight:600;font-size:13px">' + e[1] + ' encounters</span></div>'
    ).join('') + '</div></div>' : '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:20px"><div></div>') +
    // Death leaderboard
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🪦 Death Leaderboard (Phoenix Down Award)</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Player</th><th style="text-align:right;padding:8px;color:#8b8fa3">Arena</th><th style="text-align:right;padding:8px;color:#8b8fa3">Roguelike</th><th style="text-align:right;padding:8px;color:#8b8fa3">Total</th></tr></thead><tbody>' +
    topDeathPlayers.map((p,i) => {
      const aDeaths = p.arenaLosses||0;
      const rDeaths = (p.roguelikeStats||{}).deathCount||0;
      return '<tr style="border-bottom:1px solid #222"><td style="padding:8px;color:#fff">' + (i===0?'💀 ':i===1?'☠️ ':'💔 ') + (p.username||'Unknown') + '</td><td style="text-align:right;padding:8px;color:#ff6b6b">' + aDeaths + '</td><td style="text-align:right;padding:8px;color:#ba68c8">' + rDeaths + '</td><td style="text-align:right;padding:8px;color:#ff1744;font-weight:700">' + (aDeaths+rDeaths) + '</td></tr>';
    }).join('') +
    '</tbody></table></div></div></div>' +
    
    // ============================================
    // SECTION: RISK & LUCK METERS
    // ============================================
    '<div class="card" style="margin-top:30px"><h2 style="margin-bottom:20px">🎲 Risk & Luck Meters</h2>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 20px 0">How cautious or reckless are your players? Risk profiles from roguelike and arena data.</p>' +
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;margin-bottom:25px">' +
    // Chicken Score (server avg)
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(255,235,59,0.2)">' +
    '<div style="font-size:32px;margin-bottom:4px">🐔</div>' +
    '<div style="font-size:28px;font-weight:700;color:#ffeb3b">' + chickenScoreAvg + '%</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Chicken Score (Avg)</div>' +
    '<div style="color:#72767d;font-size:10px">voluntary exits / runs</div></div>' +
    // Yolo Score (server avg)
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(255,23,68,0.2)">' +
    '<div style="font-size:32px;margin-bottom:4px">💀</div>' +
    '<div style="font-size:28px;font-weight:700;color:#ff1744">' + yoloScoreAvg + '%</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">YOLO Score (Avg)</div>' +
    '<div style="color:#72767d;font-size:10px">deaths / runs</div></div>' +
    // Boss Efficiency
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(76,175,80,0.2)">' +
    '<div style="font-size:32px;margin-bottom:4px">🐉</div>' +
    '<div style="font-size:28px;font-weight:700;color:#4caf50">' + rogueBossEfficiency + '</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Bosses/Run (Avg)</div>' +
    '<div style="color:#72767d;font-size:10px">roguelike boss efficiency</div></div>' +
    // Arena Win Rate
    '<div style="background:#2b2d31;padding:20px;border-radius:10px;text-align:center;border:1px solid rgba(0,188,212,0.2)">' +
    '<div style="font-size:32px;margin-bottom:4px">⚔️</div>' +
    '<div style="font-size:28px;font-weight:700;color:#00bcd4">' + avgArenaWinRate + '%</div>' +
    '<div style="color:#8b8fa3;font-size:12px;margin-top:4px">Arena Win Rate (Avg)</div>' +
    '<div style="color:#72767d;font-size:10px">' + arenaParticipants.length + ' participants</div></div>' +
    '</div>' +
    // Biggest gambler
    (biggestGambler && ((biggestGambler.arenaWins||0)+(biggestGambler.arenaLosses||0)) > 0 ?
    '<div style="background:linear-gradient(135deg,#ff980015,#ff980005);border:1px solid #ff980044;border-radius:10px;padding:16px;margin-bottom:20px;display:flex;align-items:center;gap:16px">' +
    '<div style="font-size:40px">🎰</div>' +
    '<div><div style="color:#ff9800;font-size:12px;font-weight:700;text-transform:uppercase;letter-spacing:1px">Biggest Arena Gambler</div>' +
    '<div style="color:#fff;font-size:18px;font-weight:600">' + (biggestGambler.username||'Unknown') + '</div>' +
    '<div style="color:#8b8fa3;font-size:13px">' + ((biggestGambler.arenaWins||0)+(biggestGambler.arenaLosses||0)) + ' total fights (' + (biggestGambler.arenaWins||0) + 'W / ' + (biggestGambler.arenaLosses||0) + 'L)</div></div></div>' : '') +
    // Risk profiles table
    (riskProfiles.length > 0 ?
    '<div style="background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📋 Roguelike Risk Profiles</h3>' +
    '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">Player</th><th style="text-align:center;padding:8px;color:#8b8fa3">Runs</th><th style="text-align:center;padding:8px;color:#8b8fa3">Best Floor</th><th style="text-align:center;padding:8px;color:#8b8fa3">Bosses</th><th style="text-align:center;padding:8px;color:#ffeb3b">🐔 Chicken</th><th style="text-align:center;padding:8px;color:#ff1744">💀 YOLO</th></tr></thead><tbody>' +
    riskProfiles.map(p => '<tr style="border-bottom:1px solid #222"><td style="padding:8px;color:#fff">' + p.name + '</td><td style="text-align:center;padding:8px;color:#8b8fa3">' + p.runs + '</td><td style="text-align:center;padding:8px;color:#ba68c8;font-weight:600">' + p.floor + '</td><td style="text-align:center;padding:8px;color:#4caf50">' + p.bosses + '</td><td style="text-align:center;padding:8px;color:#ffeb3b;font-weight:600">' + p.chicken + '%</td><td style="text-align:center;padding:8px;color:#ff1744;font-weight:600">' + p.yolo + '%</td></tr>').join('') +
    '</tbody></table></div>' : '') +
    '</div>' +
    
    // ============================================
    // SECTION: PLAYER ARCHETYPE CLASSIFICATION
    // ============================================
    '<div class="card" style="margin-top:30px"><h2 style="margin-bottom:20px">🎭 Player Archetype Classification</h2>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 20px 0">Players are classified into archetypes based on their dominant activity: combat, crafting, gathering, exploration, PvP, or dungeoneering. Well-rounded players earn the Completionist title.</p>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr;gap:20px;margin-bottom:25px">' +
    // Archetype distribution chart
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">🎭 Archetype Distribution</h3><div style="height:280px"><canvas id="archetypeChart"></canvas></div></div>' +
    // Archetype legend
    '<div style="background:#2b2d31;padding:20px;border-radius:10px"><h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:14px">📖 Archetype Guide</h3>' +
    '<div style="display:grid;gap:8px">' +
    '<div style="padding:10px;background:#2a2e35;border-radius:8px;border-left:3px solid #ff6b6b"><span style="font-size:16px">⚔️</span> <strong style="color:#ff6b6b">Warrior</strong> <span style="color:#8b8fa3;font-size:12px">— Focuses on monster hunting & combat</span></div>' +
    '<div style="padding:10px;background:#2a2e35;border-radius:8px;border-left:3px solid #4db6ac"><span style="font-size:16px">🔨</span> <strong style="color:#4db6ac">Artisan</strong> <span style="color:#8b8fa3;font-size:12px">— Master of crafting professions</span></div>' +
    '<div style="padding:10px;background:#2a2e35;border-radius:8px;border-left:3px solid #81c784"><span style="font-size:16px">🌾</span> <strong style="color:#81c784">Farmer</strong> <span style="color:#8b8fa3;font-size:12px">— Dedicated to gathering resources</span></div>' +
    '<div style="padding:10px;background:#2a2e35;border-radius:8px;border-left:3px solid #64b5f6"><span style="font-size:16px">🗺️</span> <strong style="color:#64b5f6">Explorer</strong> <span style="color:#8b8fa3;font-size:12px">— Unlocks worlds & defeats world bosses</span></div>' +
    '<div style="padding:10px;background:#2a2e35;border-radius:8px;border-left:3px solid #ffb74d"><span style="font-size:16px">🏟️</span> <strong style="color:#ffb74d">Gladiator</strong> <span style="color:#8b8fa3;font-size:12px">— Lives for PvP & guild activities</span></div>' +
    '<div style="padding:10px;background:#2a2e35;border-radius:8px;border-left:3px solid #ba68c8"><span style="font-size:16px">🏰</span> <strong style="color:#ba68c8">Delver</strong> <span style="color:#8b8fa3;font-size:12px">— Dungeon & roguelike specialist</span></div>' +
    '<div style="padding:10px;background:#2a2e35;border-radius:8px;border-left:3px solid #ffd700"><span style="font-size:16px">👑</span> <strong style="color:#ffd700">Completionist</strong> <span style="color:#8b8fa3;font-size:12px">— Well-rounded across all activities</span></div>' +
    '</div></div></div>' +
    // Player archetype showcase
    (archetypeShowcase.length > 0 ?
    '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px">' +
    archetypeShowcase.map(p => 
      '<div style="background:linear-gradient(135deg,' + p.archetype.color + '12,' + p.archetype.color + '04);border:1px solid ' + p.archetype.color + '44;border-radius:10px;padding:14px;display:flex;align-items:center;gap:12px">' +
      '<div style="font-size:28px;min-width:36px;text-align:center">' + p.archetype.emoji + '</div>' +
      '<div><div style="color:#fff;font-weight:600;font-size:14px">' + p.username + '</div>' +
      '<div style="color:' + p.archetype.color + ';font-size:11px;font-weight:700;text-transform:uppercase;letter-spacing:0.5px">' + p.archetype.name + '</div>' +
      '<div style="color:#72767d;font-size:11px">Lv.' + p.level + '</div></div></div>'
    ).join('') +
    '</div>' : '') +
    '</div>' +
    
    // Chart.js scripts
    '<script>' +
    'document.addEventListener("DOMContentLoaded", function() {' +
    // Class distribution chart
    'const classCtx = document.getElementById("classDistChart");' +
    'if (classCtx) { new Chart(classCtx, {' +
      'type: "doughnut",' +
      'data: { labels: ' + JSON.stringify(classLabels) + ', datasets: [{ data: ' + JSON.stringify(classData) + ', backgroundColor: ' + JSON.stringify(classColors.slice(0, classLabels.length)) + ', borderWidth: 0 }] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#8b8fa3", font: { size: 12 }, padding: 12, usePointStyle: true } } } }' +
    '}); }' +
    // Level distribution chart
    'const levelCtx = document.getElementById("levelDistChart");' +
    'if (levelCtx) { new Chart(levelCtx, {' +
      'type: "bar",' +
      'data: { labels: ' + JSON.stringify(Object.keys(levelBuckets)) + ', datasets: [{ label: "Players", data: ' + JSON.stringify(Object.values(levelBuckets)) + ', backgroundColor: ["#5b5bff88","#e91e6388","#4caf5088","#ff980088","#00bcd488","#9c27b088"], borderColor: ["#5b5bff","#e91e63","#4caf50","#ff9800","#00bcd4","#9c27b0"], borderWidth: 1, borderRadius: 4 }] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { y: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3", stepSize: 1 } }, x: { grid: { display: false }, ticks: { color: "#8b8fa3" } } } }' +
    '}); }' +
    // Profession chart
    (Object.keys(profCounts).length > 0 ?
    'const profCtx = document.getElementById("profChart");' +
    'if (profCtx) { new Chart(profCtx, {' +
      'type: "bar",' +
      'data: { labels: ' + JSON.stringify(Object.keys(profCounts).map(k=>k.charAt(0).toUpperCase()+k.slice(1))) + ', datasets: [{ label: "Players", data: ' + JSON.stringify(Object.values(profCounts)) + ', backgroundColor: "#4db6ac88", borderColor: "#4db6ac", borderWidth: 1, borderRadius: 4 }] },' +
      'options: { indexAxis: "y", responsive: true, maintainAspectRatio: false, plugins: { legend: { display: false } }, scales: { x: { beginAtZero: true, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3", stepSize: 1 } }, y: { grid: { display: false }, ticks: { color: "#8b8fa3" } } } }' +
    '}); }' : '') +
    
    // Lorenz Curve chart
    'const lorenzCtx = document.getElementById("lorenzChart");' +
    'if (lorenzCtx) { new Chart(lorenzCtx, {' +
      'type: "line",' +
      'data: { labels: ' + JSON.stringify(lorenzData.map(d => d.pct + '%')) + ', datasets: [' +
        '{ label: "Perfect Equality", data: ' + JSON.stringify(lorenzData.map(d => parseFloat(d.pct))) + ', borderColor: "#ffffff44", borderDash: [5,5], borderWidth: 1, pointRadius: 0, fill: false },' +
        '{ label: "Actual Distribution", data: ' + JSON.stringify(lorenzData.map(d => parseFloat(d.cumGold))) + ', borderColor: "#e91e63", backgroundColor: "#e91e6322", borderWidth: 2, pointRadius: 3, pointBackgroundColor: "#e91e63", fill: true }' +
      '] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#8b8fa3", font: { size: 11 } } } }, scales: { y: { beginAtZero: true, max: 100, grid: { color: "rgba(255,255,255,0.05)" }, ticks: { color: "#8b8fa3", callback: function(v) { return v + "%"; } }, title: { display: true, text: "% of Total Gold", color: "#8b8fa3" } }, x: { grid: { display: false }, ticks: { color: "#8b8fa3" }, title: { display: true, text: "% of Players", color: "#8b8fa3" } } } }' +
    '}); }' +
    
    // Server Personality Radar chart
    (playersWithAI.length > 0 ?
    'const serverRadarCtx = document.getElementById("serverRadarChart");' +
    'if (serverRadarCtx) { new Chart(serverRadarCtx, {' +
      'type: "radar",' +
      'data: { labels: ' + JSON.stringify(aiLabels) + ', datasets: [{ label: "Server Average", data: ' + JSON.stringify(aiAvgs) + ', borderColor: "#5b5bff", backgroundColor: "#5b5bff33", borderWidth: 2, pointBackgroundColor: "#5b5bff", pointRadius: 4 }] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#8b8fa3" } } }, scales: { r: { beginAtZero: true, max: 1, grid: { color: "rgba(255,255,255,0.1)" }, angleLines: { color: "rgba(255,255,255,0.1)" }, pointLabels: { color: "#8b8fa3", font: { size: 11 } }, ticks: { color: "#8b8fa3", backdropColor: "transparent", stepSize: 0.2 } } } }' +
    '}); }' +
    // Player Comparison Radar chart
    'const playerRadarCtx = document.getElementById("playerRadarChart");' +
    'if (playerRadarCtx) {' +
      'const radarColors = ["#e91e63","#4caf50","#ff9800"];' +
      'new Chart(playerRadarCtx, {' +
      'type: "radar",' +
      'data: { labels: ' + JSON.stringify(aiLabels) + ', datasets: ' + JSON.stringify(radarPlayers.map((p,i) => ({
        label: p.name,
        data: p.data,
        borderColor: ['#e91e63','#4caf50','#ff9800'][i] || '#5b5bff',
        backgroundColor: ['#e91e6322','#4caf5022','#ff980022'][i] || '#5b5bff22',
        borderWidth: 2,
        pointRadius: 3
      }))) + ' },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: "#8b8fa3", font: { size: 11 } } } }, scales: { r: { beginAtZero: true, max: 1, grid: { color: "rgba(255,255,255,0.1)" }, angleLines: { color: "rgba(255,255,255,0.1)" }, pointLabels: { color: "#8b8fa3", font: { size: 10 } }, ticks: { color: "#8b8fa3", backdropColor: "transparent", stepSize: 0.2 } } } }' +
    '}); }' : '') +
    
    // Archetype Distribution chart
    'const archetypeCtx = document.getElementById("archetypeChart");' +
    'if (archetypeCtx) { new Chart(archetypeCtx, {' +
      'type: "doughnut",' +
      'data: { labels: ' + JSON.stringify(archetypeLabels) + ', datasets: [{ data: ' + JSON.stringify(archetypeValues) + ', backgroundColor: ' + JSON.stringify(archetypeColors.map(c => c + '88')) + ', borderColor: ' + JSON.stringify(archetypeColors) + ', borderWidth: 2 }] },' +
      'options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { position: "right", labels: { color: "#8b8fa3", font: { size: 12 }, padding: 10, usePointStyle: true } } } }' +
    '}); }' +
    
    '});' +
    '<\/script>';
}


export function renderRPGEventsTab() {
  const { stats, isLive, rpgEvents } = _getState();
  const milestones = rpgEvents.milestoneEvents || [];
  const active = rpgEvents.activeEvents || [];
  const historyEvts = rpgEvents.eventHistory || [];

  // Current viewer count
  const currentViewers = isLive ? (stats.currentViewers || 0) : 0;

  // Active events display
  const activeHtml = active.length > 0
    ? active.map(e => {
        const minsLeft = Math.max(0, Math.round(((e.endsAt||0) - Date.now()) / 60000));
        const pct = e.duration > 0 ? Math.min(100, ((e.duration - minsLeft) / e.duration * 100)).toFixed(0) : 100;
        return '<div style="background:#5b5bff11;border:1px solid #5b5bff44;border-radius:10px;padding:16px;margin-bottom:10px">' +
          '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<span style="font-size:18px;font-weight:700;color:#fff">' + (e.emoji||'🎮') + ' ' + (e.name||'Event') + '</span>' +
          '<span style="color:#4caf50;font-weight:600">' + minsLeft + ' min remaining</span></div>' +
          '<div style="background:#222;border-radius:4px;height:6px;overflow:hidden"><div style="background:linear-gradient(90deg,#5b5bff,#e91e63);height:100%;width:' + pct + '%;transition:width 1s"></div></div>' +
          '<div style="color:#72767d;font-size:12px;margin-top:6px">' + (e.description||'') + '</div></div>';
      }).join('')
    : '<div style="text-align:center;padding:30px;color:#72767d">No active events right now. Events trigger automatically when viewer milestones are reached!</div>';

  // Milestone config rows
  const milestoneRows = milestones.map((m, i) => {
    const isActive = active.some(a => a.id === m.id);
    const wasTriggered = (rpgEvents.triggeredThisStream || {})[m.id];
    let statusBadge = '<span style="padding:3px 10px;border-radius:12px;font-size:11px;background:#33333388;color:#72767d">Waiting</span>';
    if (isActive) statusBadge = '<span style="padding:3px 10px;border-radius:12px;font-size:11px;background:#4caf5022;color:#4caf50;border:1px solid #4caf5044">🔴 LIVE</span>';
    else if (wasTriggered) statusBadge = '<span style="padding:3px 10px;border-radius:12px;font-size:11px;background:#ff980022;color:#ff9800;border:1px solid #ff980044">✓ Triggered</span>';
    
    return '<tr style="border-bottom:1px solid #222">' +
      '<td style="padding:12px;text-align:center;font-size:20px">' + (m.emoji||'🎮') + '</td>' +
      '<td style="padding:12px"><div style="color:#fff;font-weight:600">' + (m.name||'Event') + '</div><div style="color:#72767d;font-size:12px">' + (m.description||'') + '</div></td>' +
      '<td style="padding:12px;text-align:center"><span style="color:#5b5bff;font-weight:700;font-size:18px">' + (m.viewerThreshold||0) + '</span><div style="color:#72767d;font-size:11px">viewers</div></td>' +
      '<td style="padding:12px;text-align:center;color:#8b8fa3">' + (m.type||'').replace(/_/g,' ') + '</td>' +
      '<td style="padding:12px;text-align:center;color:#8b8fa3">' + (m.duration||0) + ' min</td>' +
      '<td style="padding:12px;text-align:center">' + statusBadge + '</td>' +
      '<td style="padding:12px;text-align:center">' +
      '<label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer">' +
      '<input type="checkbox" ' + (m.enabled ? 'checked' : '') + ' onchange="toggleMilestoneEvent(' + i + ', this.checked)" style="opacity:0;width:0;height:0">' +
      '<span style="position:absolute;cursor:pointer;top:0;left:0;right:0;bottom:0;background:' + (m.enabled ? '#4caf50' : '#555') + ';border-radius:22px;transition:.3s"></span>' +
      '<span style="position:absolute;height:16px;width:16px;left:' + (m.enabled ? '20px' : '3px') + ';bottom:3px;background:#fff;border-radius:50%;transition:.3s"></span>' +
      '</label></td>' +
      '</tr>';
  }).join('');

  // Event history
  const historyRows = historyEvts.slice(-20).reverse().map(e => {
    return '<tr style="border-bottom:1px solid #222">' +
      '<td style="padding:8px;color:#8b8fa3;font-size:12px">' + new Date(e.triggeredAt||0).toLocaleString() + '</td>' +
      '<td style="padding:8px">' + (e.emoji||'🎮') + ' <span style="color:#fff">' + (e.name||'Event') + '</span></td>' +
      '<td style="padding:8px;text-align:center;color:#5b5bff">' + (e.viewerCount||0) + '</td>' +
      '<td style="padding:8px;text-align:center;color:#' + (e.completed ? '4caf50' : 'ff9800') + '">' + (e.completed ? '✓ Completed' : '⏱ Expired') + '</td>' +
      '</tr>';
  }).join('');

  return '<div class="card"><h2 style="margin-bottom:25px">⚡ RPG Events Manager</h2>' +
    // Current stream status bar
    '<div style="display:flex;gap:16px;margin-bottom:25px;flex-wrap:wrap">' +
    '<div style="flex:1;min-width:200px;background:' + (isLive ? 'linear-gradient(135deg,#4caf5022,#4caf5011)' : '#2a2e35') + ';padding:18px;border-radius:10px;border:1px solid ' + (isLive ? '#4caf5044' : '#33333388') + ';text-align:center">' +
    '<div style="font-size:12px;color:#8b8fa3;margin-bottom:6px">Stream Status</div>' +
    '<div style="font-size:24px;font-weight:700;color:' + (isLive ? '#4caf50' : '#ff6b6b') + '">' + (isLive ? '🟢 LIVE' : '🔴 OFFLINE') + '</div></div>' +
    '<div style="flex:1;min-width:200px;background:#2b2d31;padding:18px;border-radius:10px;border:1px solid #5b5bff33;text-align:center">' +
    '<div style="font-size:12px;color:#8b8fa3;margin-bottom:6px">Current Viewers</div>' +
    '<div style="font-size:24px;font-weight:700;color:#5b5bff">' + currentViewers + '</div></div>' +
    '<div style="flex:1;min-width:200px;background:#2b2d31;padding:18px;border-radius:10px;border:1px solid #e91e6333;text-align:center">' +
    '<div style="font-size:12px;color:#8b8fa3;margin-bottom:6px">Active Events</div>' +
    '<div style="font-size:24px;font-weight:700;color:#e91e63">' + active.length + '</div></div>' +
    '<div style="flex:1;min-width:200px;background:#2b2d31;padding:18px;border-radius:10px;border:1px solid #ff980033;text-align:center">' +
    '<div style="font-size:12px;color:#8b8fa3;margin-bottom:6px">Events This Stream</div>' +
    '<div style="font-size:24px;font-weight:700;color:#ff9800">' + Object.keys(rpgEvents.triggeredThisStream||{}).length + '</div></div>' +
    '</div>' +
    // Active events
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:16px">🔴 Active Events</h3>' + activeHtml +
    // Milestone config table
    '<div style="margin-top:30px;background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:16px">🎯 Viewer Milestone Events</h3>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 15px 0">Configure RPG events that automatically trigger when viewer milestones are reached during a stream. Each event triggers once per stream.</p>' +
    '<table style="width:100%;border-collapse:collapse"><thead><tr style="border-bottom:2px solid #333">' +
    '<th style="padding:10px;color:#8b8fa3;font-size:12px;width:40px"></th>' +
    '<th style="padding:10px;text-align:left;color:#8b8fa3;font-size:12px">Event</th>' +
    '<th style="padding:10px;text-align:center;color:#8b8fa3;font-size:12px">Threshold</th>' +
    '<th style="padding:10px;text-align:center;color:#8b8fa3;font-size:12px">Type</th>' +
    '<th style="padding:10px;text-align:center;color:#8b8fa3;font-size:12px">Duration</th>' +
    '<th style="padding:10px;text-align:center;color:#8b8fa3;font-size:12px">Status</th>' +
    '<th style="padding:10px;text-align:center;color:#8b8fa3;font-size:12px">Enabled</th>' +
    '</tr></thead><tbody>' + milestoneRows + '</tbody></table></div>' +
    // Add custom event section
    '<div style="margin-top:20px;background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:16px">➕ Add Custom Milestone Event</h3>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:12px;margin-bottom:15px">' +
    '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Event Name</label><input type="text" id="newEventName" placeholder="e.g. XP Party" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
    '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Viewer Threshold</label><input type="number" id="newEventThreshold" placeholder="e.g. 75" min="1" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
    '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Type</label><select id="newEventType" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px"><option value="xp_boost">⚡ XP Boost</option><option value="gold_rain">💰 Gold Rain</option><option value="loot_boost">🎁 Loot Boost</option><option value="secret_dungeon">🏰 Secret Dungeon</option><option value="boss_spawn">🐉 Boss Spawn</option></select></div>' +
    '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Duration (min)</label><input type="number" id="newEventDuration" placeholder="e.g. 30" min="1" max="180" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
    '</div>' +
    '<div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:12px;margin-bottom:15px">' +
    '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Description</label><input type="text" id="newEventDesc" placeholder="e.g. Double XP for all players!" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
    '<div><label style="display:block;color:#8b8fa3;font-size:12px;margin-bottom:6px">Emoji</label><input type="text" id="newEventEmoji" placeholder="e.g. ⚡" maxlength="2" style="width:100%;padding:10px;background:#2a2e35;border:1px solid #444;border-radius:6px;color:#fff;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()"></div>' +
    '<div style="display:flex;align-items:flex-end"><button onclick="addMilestoneEvent()" style="width:100%;padding:10px 20px;background:#5b5bff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:14px">Add Event</button></div>' +
    '</div></div>' +
    // Manual trigger
    '<div style="margin-top:20px;background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:16px">🎮 Manual Trigger</h3>' +
    '<p style="color:#72767d;font-size:13px;margin:0 0 15px 0">Manually trigger an RPG event right now (bypasses viewer threshold).</p>' +
    '<div style="display:flex;gap:12px;flex-wrap:wrap">' +
    milestones.filter(m=>m.enabled).map(m => 
      '<button onclick="manualTriggerEvent(\'' + m.id + '\')" style="padding:10px 20px;background:#2a2e35;border:1px solid #5b5bff44;border-radius:8px;color:#fff;cursor:pointer;font-size:13px;transition:all .2s" onmouseover="this.style.background=\\\'#5b5bff33\\\'" onmouseout="this.style.background=\\\'#2a2e35\\\'">' + (m.emoji||'🎮') + ' ' + (m.name||'Event') + '</button>'
    ).join('') +
    '</div></div>' +
    // Event history
    '<div style="margin-top:30px;background:#2b2d31;padding:20px;border-radius:10px">' +
    '<h3 style="margin:0 0 15px 0;color:#e0e0e0;font-size:16px">📜 Event History</h3>' +
    (historyRows.length > 0 ?
      '<table style="width:100%;border-collapse:collapse;font-size:13px"><thead><tr style="border-bottom:1px solid #333"><th style="text-align:left;padding:8px;color:#8b8fa3">When</th><th style="text-align:left;padding:8px;color:#8b8fa3">Event</th><th style="text-align:center;padding:8px;color:#8b8fa3">Viewers</th><th style="text-align:center;padding:8px;color:#8b8fa3">Status</th></tr></thead><tbody>' + historyRows + '</tbody></table>'
      : '<div style="text-align:center;padding:20px;color:#72767d">No events in history yet</div>') +
    '</div>' +
    '</div>' +
    '<script>' +
    'function toggleMilestoneEvent(index, enabled) {' +
    '  fetch("/api/rpg-events/toggle", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({index, enabled}) })' +
    '  .then(r => r.json()).then(d => { if(d.success) location.reload(); });' +
    '}' +
    'function addMilestoneEvent() {' +
    '  const name = document.getElementById("newEventName").value;' +
    '  const threshold = parseInt(document.getElementById("newEventThreshold").value);' +
    '  const type = document.getElementById("newEventType").value;' +
    '  const duration = parseInt(document.getElementById("newEventDuration").value);' +
    '  const description = document.getElementById("newEventDesc").value;' +
    '  const emoji = document.getElementById("newEventEmoji").value || "🎮";' +
    '  if (!name || !threshold || !duration) return alert("Please fill in all required fields");' +
    '  fetch("/api/rpg-events/add", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({name,threshold,type,duration,description,emoji}) })' +
    '  .then(r => r.json()).then(d => { if(d.success) location.reload(); else alert(d.error||"Error"); });' +
    '}' +
    'function manualTriggerEvent(eventId) {' +
    '  if (!confirm("Manually trigger this event now?")) return;' +
    '  fetch("/api/rpg-events/trigger", { method: "POST", headers: {"Content-Type":"application/json"}, body: JSON.stringify({eventId}) })' +
    '  .then(r => r.json()).then(d => { if(d.success) { alert("Event triggered!"); location.reload(); } else alert(d.error||"Error"); });' +
    '}' +
    '<\/script>';
}

// ====================== ANALYTICS FEATURES TAB ======================
export function renderAnalyticsFeaturesTab() {
  return `
<div class="card">
  <h2>📊 Analytics Tools</h2>
  <p style="color:#8b8fa3;margin-bottom:12px">Role analytics, channel activity tracking, engagement heatmaps, and member retention metrics.</p>
</div>

<div class="card" style="margin-top:10px;border-left:3px solid #2196f3">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:18px">📊</span>
    <div>
      <strong style="color:#e0e0e0;font-size:14px">Role Analytics</strong>
      <div style="color:#8b8fa3;font-size:11px;margin-top:2px">Per-role statistics with member count, active members, and average level.</div>
    </div>
  </div>
  <div id="roleAnalyticsData" style="padding-top:8px;border-top:1px solid #2a2f3a">
    <div style="color:#8b8fa3;font-size:12px">Loading role analytics...</div>
  </div>
  <div style="margin-top:8px"><button onclick="refreshRoleAnalytics()" style="padding:6px 16px;background:#5b5bff;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">🔄 Refresh</button></div>
</div>
<script>
function refreshRoleAnalytics(){
  fetch('/api/features/role-analytics').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;var data=c.data||{};var keys=Object.keys(data);
    if(keys.length===0){document.getElementById('roleAnalyticsData').innerHTML='<div style="color:#8b8fa3;font-size:12px">No role analytics data yet. Data is calculated periodically.</div>';return;}
    var html='<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="border-bottom:1px solid #3a3a42"><th style="text-align:left;padding:4px 8px;color:#8b8fa3">Role</th><th style="text-align:right;padding:4px 8px;color:#8b8fa3">Members</th><th style="text-align:right;padding:4px 8px;color:#8b8fa3">Active</th><th style="text-align:right;padding:4px 8px;color:#8b8fa3">Avg Level</th></tr>';
    keys.forEach(function(k){var r=data[k];html+='<tr style="border-bottom:1px solid #2a2f3a"><td style="padding:4px 8px;color:#e0e0e0">'+(r.name||k)+'</td><td style="text-align:right;padding:4px 8px">'+(r.count||0)+'</td><td style="text-align:right;padding:4px 8px">'+(r.activeCount||0)+'</td><td style="text-align:right;padding:4px 8px">'+((r.avgLevel||0).toFixed(1))+'</td></tr>';});
    html+='</table>';document.getElementById('roleAnalyticsData').innerHTML=html;
  }).catch(function(){document.getElementById('roleAnalyticsData').innerHTML='<div style="color:#ef5350;font-size:12px">Failed to load.</div>';});
}
refreshRoleAnalytics();
</script>

<div class="card" style="margin-top:10px;border-left:3px solid #2196f3">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:18px">📈</span>
    <div>
      <strong style="color:#e0e0e0;font-size:14px">Channel Activity</strong>
      <div style="color:#8b8fa3;font-size:11px;margin-top:2px">Per-channel message volume and top posters — tracked automatically.</div>
    </div>
  </div>
  <div id="channelActivityData" style="padding-top:8px;border-top:1px solid #2a2f3a">
    <div style="color:#8b8fa3;font-size:12px">Loading channel activity...</div>
  </div>
  <div style="margin-top:8px"><button onclick="refreshChannelActivity()" style="padding:6px 16px;background:#5b5bff;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">🔄 Refresh</button></div>
</div>
<script>
function refreshChannelActivity(){
  fetch('/api/features/channel-activity').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;var keys=Object.keys(c).filter(function(k){return k!=='enabled'&&k!=='success'});
    if(keys.length===0){document.getElementById('channelActivityData').innerHTML='<div style="color:#8b8fa3;font-size:12px">No channel activity data yet.</div>';return;}
    var html='<table style="width:100%;border-collapse:collapse;font-size:12px"><tr style="border-bottom:1px solid #3a3a42"><th style="text-align:left;padding:4px 8px;color:#8b8fa3">Channel</th><th style="text-align:right;padding:4px 8px;color:#8b8fa3">Messages</th></tr>';
    keys.slice(0,20).forEach(function(k){var ch=c[k];html+='<tr style="border-bottom:1px solid #2a2f3a"><td style="padding:4px 8px;color:#e0e0e0">'+k+'</td><td style="text-align:right;padding:4px 8px">'+(ch.messages||0)+'</td></tr>';});
    html+='</table>';document.getElementById('channelActivityData').innerHTML=html;
  }).catch(function(){document.getElementById('channelActivityData').innerHTML='<div style="color:#ef5350;font-size:12px">Failed to load.</div>';});
}
refreshChannelActivity();
</script>

<div class="card" style="margin-top:10px;border-left:3px solid #2196f3">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:18px">🗺️</span>
    <div>
      <strong style="color:#e0e0e0;font-size:14px">Engagement Heatmap</strong>
      <div style="color:#8b8fa3;font-size:11px;margin-top:2px">7x24 grid showing message activity by day of week and hour — data collected automatically.</div>
    </div>
  </div>
  <div id="heatmapData" style="padding-top:8px;border-top:1px solid #2a2f3a">
    <div style="color:#8b8fa3;font-size:12px">Loading heatmap data...</div>
  </div>
</div>
<script>
(function(){
  fetch('/api/features/engagement-heatmap').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;var keys=Object.keys(c).filter(function(k){return k!=='enabled'&&k!=='success'});
    if(keys.length===0){document.getElementById('heatmapData').innerHTML='<div style="color:#8b8fa3;font-size:12px">No heatmap data yet. Activity will be tracked over time.</div>';return;}
    var days=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
    var maxVal=Math.max.apply(null,keys.map(function(k){return c[k]||0}))||1;
    var html='<div style="display:grid;grid-template-columns:40px repeat(24,1fr);gap:1px;font-size:9px">';
    html+='<div></div>';for(var h=0;h<24;h++)html+='<div style="text-align:center;color:#8b8fa3">'+h+'</div>';
    for(var d2=0;d2<7;d2++){html+='<div style="color:#8b8fa3;display:flex;align-items:center">'+days[d2]+'</div>';for(var h2=0;h2<24;h2++){var val=c[d2+'-'+h2]||0;var intensity=Math.round((val/maxVal)*255);html+='<div style="height:16px;background:rgba(81,150,255,'+((val/maxVal)*0.8+0.1).toFixed(2)+');border-radius:2px" title="'+days[d2]+' '+h2+':00 — '+val+' msgs"></div>';}}
    html+='</div>';document.getElementById('heatmapData').innerHTML=html;
  }).catch(function(){document.getElementById('heatmapData').innerHTML='<div style="color:#ef5350;font-size:12px">Failed to load.</div>';});
})();
</script>

<div class="card" style="margin-top:10px;border-left:3px solid #2196f3">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">
    <span style="font-size:18px">📉</span>
    <div>
      <strong style="color:#e0e0e0;font-size:14px">Member Retention</strong>
      <div style="color:#8b8fa3;font-size:11px;margin-top:2px">Track member retention rates for 1-day, 7-day, 30-day, and 90-day periods.</div>
    </div>
  </div>
  <div id="retentionData" style="padding-top:8px;border-top:1px solid #2a2f3a">
    <div style="color:#8b8fa3;font-size:12px">Loading retention data...</div>
  </div>
</div>
<script>
(function(){
  fetch('/api/features/member-retention').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;var joins=(c.joins||[]);var leaves=(c.leaves||[]);
    var now=Date.now();
    var periods=[{label:'1 Day',ms:86400000},{label:'7 Days',ms:604800000},{label:'30 Days',ms:2592000000},{label:'90 Days',ms:7776000000}];
    var html='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px">';
    periods.forEach(function(p){
      var recentJoins=joins.filter(function(j){return (now-(j.ts||0))<p.ms}).length;
      var recentLeaves=leaves.filter(function(l){return (now-(l.ts||0))<p.ms}).length;
      var rate=recentJoins>0?Math.round(((recentJoins-recentLeaves)/recentJoins)*100):0;
      html+='<div style="padding:12px;background:#1a1a2e;border-radius:8px;text-align:center"><div style="font-size:20px;font-weight:700;color:'+(rate>=70?'#4caf50':rate>=40?'#ff9800':'#ef5350')+'">'+rate+'%</div><div style="font-size:11px;color:#8b8fa3;margin-top:4px">'+p.label+'</div><div style="font-size:10px;color:#666;margin-top:2px">'+recentJoins+' joined / '+recentLeaves+' left</div></div>';
    });
    html+='</div>';document.getElementById('retentionData').innerHTML=html;
  }).catch(function(){document.getElementById('retentionData').innerHTML='<div style="color:#ef5350;font-size:12px">Failed to load.</div>';});
})();
</script>

`;
}
