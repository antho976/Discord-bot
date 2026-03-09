/**
 * Community Dashboard Render Tabs
 * Extracted from index.js — overview, events, moderation, tickets, reaction roles,
 * automod, starboard, pets, idleon, tools, accounts, audit log, etc.
 */
import fs from 'fs';
import path from 'path';
import { renderGiveawaysTab, renderPollsTab, renderRemindersTab, renderSuggestionsTab, renderSettingsTab, renderCommandsAndConfigTab, renderConfigGeneralTab, renderConfigNotificationsTab, renderConfigTab, renderNotificationsTab, renderYouTubeAlertsTab, renderCustomCommandsTab, renderLevelingTab, renderEmbedsTab, renderWelcomeTab, safeJsonForHtml } from './config-tabs.js';
import { renderHealthTab, renderAnalyticsTab, renderEngagementStatsTab, renderStreaksMilestonesTab, renderTrendsStatsTab, renderGamePerformanceTab, renderViewerPatternsTab, renderAIInsightsTab, renderReportsTab, renderCommunityStatsTab, renderRPGEconomyTab, renderRPGQuestsCombatTab, renderStreamCompareTab, renderRPGAnalyticsTab, renderRPGEventsTab } from './analytics-tabs.js';
import { renderRPGEditorTab } from './rpg-editor-tab.js';
import { renderRPGWorldsTab, renderRPGQuestsTab, renderRPGValidatorsTab, renderRPGSimulatorsTab, renderRPGEntitiesTab, renderRPGSystemsTab, renderRPGAITab, renderRPGFlagsTab, renderRPGGuildTab, renderRPGAdminTab, renderRPGGuildStatsTab } from './rpg-tabs.js';
import { renderSmartBotConfigTab, renderSmartBotKnowledgeTab, renderSmartBotNewsTab, renderSmartBotStatsTab, renderSmartBotAITab, renderSmartBotLearningTab } from '../smartbot-routes.js';

let _getState;

export function initCommunityTabs(getStateFn) {
  _getState = getStateFn;
}

export function renderEventsTab(tab) {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const subTab = tab === 'events' ? 'events-giveaways' : tab;
  const isGiveaways = subTab === 'events-giveaways';
  const isPolls = subTab === 'events-polls';
  const isReminders = subTab === 'events-reminders';
  
  return `
<div class="card" style="margin-bottom:20px">
  <div style="display:flex;gap:8px;flex-wrap:wrap;border-bottom:2px solid #3a3a42;padding-bottom:10px">
    <button class="small" style="width:auto;background:${isGiveaways ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-giveaways'">🎁 Giveaways</button>
    <button class="small" style="width:auto;background:${isPolls ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-polls'">📊 Polls</button>
    <button class="small" style="width:auto;background:${isReminders ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-reminders'">⏰ Reminders</button>
  </div>
</div>

${isGiveaways ? renderGiveawaysContent() : isPolls ? renderPollsContent() : renderRemindersContent()}
`;
}

function renderGiveawaysContent() {
  return renderGiveawaysTab();
}

function renderPollsContent() {
  return renderPollsTab();
}

function renderRemindersContent() {
  return renderRemindersTab();
}

export function renderTab(tab, userTier){
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
 const yaStatus = normalizeYouTubeAlertsSettings(dashboardSettings.youtubeAlerts || {});
 if(tab==='overview') {
  // ── Compute overview data ──
  const _h = Array.isArray(history) ? history : [];
  const _now = Date.now();
  const _totalGiveaways = giveaways.length;
  const _activeGiveaways = giveaways.filter(g => g.active && g.endTime > _now && !g.paused).length;
  const _avgEntries = _totalGiveaways === 0 ? 0 : Math.round(giveaways.reduce((sum, g) => {
    const count = Number.isFinite(g.entryCount) ? g.entryCount : (Array.isArray(g.entries) ? g.entries.length : (Array.isArray(g.participants) ? g.participants.length : 0));
    return sum + count;
  }, 0) / _totalGiveaways);

  // Follower growth
  const _fh = Array.isArray(followerHistory) ? followerHistory : [];
  const _latestFollowers = _fh.length > 0 ? _fh[_fh.length - 1].count : 0;
  const _fh7d = _fh.filter(f => _now - new Date(f.timestamp).getTime() < 7 * 86400000);
  const _fh30d = _fh.filter(f => _now - new Date(f.timestamp).getTime() < 30 * 86400000);
  const _followGain7d = _fh7d.length >= 2 ? _fh7d[_fh7d.length-1].count - _fh7d[0].count : 0;
  const _followGain30d = _fh30d.length >= 2 ? _fh30d[_fh30d.length-1].count - _fh30d[0].count : 0;
  const _sparkData = _fh.slice(-14).map(f => f.count);
  const _sparkMin = _sparkData.length ? Math.min(..._sparkData) : 0;
  const _sparkMax = _sparkData.length ? Math.max(..._sparkData) : 1;
  const _sparkRange = Math.max(_sparkMax - _sparkMin, 1);
  const _sparkPoints = _sparkData.map((v, i) => {
    const x = _sparkData.length > 1 ? (i / (_sparkData.length - 1)) * 120 : 60;
    const y = 30 - ((v - _sparkMin) / _sparkRange) * 28;
    return x.toFixed(1) + ',' + y.toFixed(1);
  }).join(' ');

  // Recent streams (last 10)
  const _recentStreams = _h.slice(-10).reverse();
  const _recentStreamsHtml = _recentStreams.length > 0 ? '<div style="overflow-x:auto"><table style="font-size:12px;width:100%"><thead><tr><th>Date</th><th>Day</th><th>Game</th><th>Peak</th><th>Avg</th><th>Hours</th><th>Follows</th></tr></thead><tbody>' + _recentStreams.map(s => {
    const dur = s.duration ? Math.round(s.duration / 60) : (s.durationMinutes || 0);
    const hrs = (dur / 60).toFixed(1);
    const peak = s.peakViewers || s.viewers || 0;
    const avg = s.avgViewers || s.viewers || 0;
    const fols = s.followers || s.newFollowers || 0;
    const date = s.startedAt ? new Date(s.startedAt) : null;
    const dayName = date ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()] : '—';
    const dateStr = date ? date.toLocaleDateString() : '—';
    const game = (s.game || s.gameName || '—').substring(0, 25);
    return '<tr><td>' + dateStr + '</td><td>' + dayName + '</td><td style="max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">' + game + '</td><td style="color:#ffca28;font-weight:600">' + peak + '</td><td>' + avg + '</td><td>' + hrs + '</td><td style="color:#4caf50">' + (fols > 0 ? '+' + fols : '0') + '</td></tr>';
  }).join('') + '</tbody></table></div>' : '<div style="color:#8b8fa3;font-size:12px;text-align:center;padding:16px">No stream history yet</div>';

  // Day-of-week performance
  const _dowPerf = {};
  _h.forEach(s => { const d = s.startedAt ? new Date(s.startedAt).getDay() : null; if (d === null) return; if (!_dowPerf[d]) _dowPerf[d] = { count: 0, viewers: 0 }; _dowPerf[d].count++; _dowPerf[d].viewers += (s.peakViewers || s.viewers || 0); });
  const _dowNames = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const _bestDay = Object.entries(_dowPerf).sort((a,b) => (b[1].viewers / b[1].count) - (a[1].viewers / a[1].count))[0];
  const _bestDayHtml = _bestDay ? '<span style="font-size:11px;font-weight:400;color:#8b8fa3;margin-left:8px">Best day: ' + _dowNames[_bestDay[0]] + ' (avg ' + Math.round(_bestDay[1].viewers / _bestDay[1].count) + ' peak)</span>' : '';

  // Stream uptime
  const _uptimeMs = streamInfo.startedAt ? _now - new Date(streamInfo.startedAt).getTime() : 0;
  const _uptimeH = Math.floor(_uptimeMs / 3600000);
  const _uptimeM = Math.floor((_uptimeMs % 3600000) / 60000);
  const _uptimeStr = streamInfo.startedAt ? _uptimeH + 'h ' + _uptimeM + 'm' : '—';

  // Token expiry
  const _tokenExpiresAt = twitchTokens.expires_at ? new Date(twitchTokens.expires_at).getTime() : 0;
  const _tokenHoursLeft = _tokenExpiresAt ? Math.max(0, Math.round((_tokenExpiresAt - _now) / 3600000)) : null;
  const _tokenWarn = _tokenHoursLeft !== null && _tokenHoursLeft < 24;

  // YouTube health
  const _ytHealthy = !yaStatus.health?.lastError;
  const _ytLastCheck = yaStatus.health?.lastCheckAt ? new Date(yaStatus.health.lastCheckAt).toLocaleString() : '—';

  // Warnings banner
  const _warnList = [];
  if (!TWITCH_ACCESS_TOKEN) _warnList.push({icon:'🔑', msg:'Twitch token not set', color:'#ef5350'});
  if (_tokenWarn) _warnList.push({icon:'⏰', msg:'Token expires in ' + _tokenHoursLeft + 'h', color:'#ffca28'});
  if (!_ytHealthy) _warnList.push({icon:'📺', msg:'YouTube checker error', color:'#ef5350'});
  const _warnBanner = _warnList.length > 0 ? '<div data-ov-section="admin" class="card" style="border-color:' + _warnList[0].color + '33;background:' + _warnList[0].color + '08;padding:12px 16px"><div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'"><span style="font-size:16px">⚠️</span><span style="font-size:13px;font-weight:600;color:#ffca28">' + _warnList.length + ' active warning' + (_warnList.length>1?'s':'') + '</span><span style="margin-left:auto;font-size:11px;color:#8b8fa3">click to toggle</span></div><div style="margin-top:8px">' + _warnList.map(w => '<div style="padding:6px 0;font-size:12px;color:' + w.color + '">' + w.icon + ' ' + w.msg + '</div>').join('') + '</div></div>' : '';

  // Goals
  const _g = streamGoals || {};
  const _thisMonth = _h.filter(s => { const d = s.startedAt ? new Date(s.startedAt) : null; return d && d.getMonth() === new Date().getMonth() && d.getFullYear() === new Date().getFullYear(); });
  const _goalStreams = _thisMonth.length;
  const _goalHours = _thisMonth.reduce((s, x) => s + ((x.duration || 0) / 3600), 0).toFixed(1);
  const _goalPeak = _thisMonth.reduce((s, x) => Math.max(s, x.peakViewers || x.viewers || 0), 0);
  const _goalFollowers = _thisMonth.reduce((s, x) => s + (x.followers || x.newFollowers || 0), 0);
  const _twitchChannel = process.env.TWITCH_CHANNEL || '';

  // Recent errors/warnings
  const _allLogs = Array.isArray(logs) ? logs : [];
  const _recentErrors = _allLogs.filter(l => l.type === 'error' || l.type === 'warn').slice(-5).reverse();
  const _recentEventsHtml = _recentErrors.length > 0 ? _recentErrors.map(l => {
    const col = l.type === 'error' ? '#ef5350' : '#ffca28';
    const icon = l.type === 'error' ? '❌' : '⚠️';
    const ts = l.ts ? new Date(l.ts).toLocaleTimeString() : '—';
    return '<div style="padding:6px 8px;font-size:11px;border-bottom:1px solid #222228;display:flex;gap:8px;align-items:flex-start"><span style="color:' + col + ';flex-shrink:0">' + icon + '</span><span style="color:#8b8fa3;flex-shrink:0;min-width:60px">' + ts + '</span><span style="color:' + col + ';word-break:break-word">' + String(l.msg || l.message || '—').substring(0, 120) + '</span></div>';
  }).join('') : '<div style="padding:16px;text-align:center;color:#8b8fa3;font-size:12px">No recent warnings or errors 🎉</div>';

  // Next stream schedule data
  const _sched = schedule || {};
  const _nextStreamAt = _sched.nextStreamAt ? new Date(_sched.nextStreamAt).getTime() : null;
  const _nextStreamISO = _sched.nextStreamAt || '';
  const _schedWeekly = _sched.weekly || {};
  const _schedDays = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  const _schedLabels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  const _isLiveNow = !!streamInfo.startedAt;
  const _schedNoStream = !!_sched.noStreamToday;
  const _schedDelayed = !!_sched.streamDelayed;

  // Build weekly mini-calendar HTML
  let _weeklyCalHtml = '';
  const _todayDow = new Date().getDay();
  for (let _di = 0; _di < 7; _di++) {
    const _dayKey = _schedDays[_di];
    const _daySlot = _schedWeekly[_dayKey];
    const _isToday = _di === _todayDow;
    const _hasSlot = !!_daySlot;
    const _dotColor = _hasSlot ? (_isToday ? '#4caf50' : '#9146ff') : '#3a3a42';
    const _border = _isToday ? 'border:1px solid #9146ff44;' : '';
    let _timeLabel = '—';
    if (_daySlot) {
      const _sh = _daySlot.hour || 0;
      const _sm = _daySlot.minute || 0;
      const _ampm = _sh >= 12 ? 'PM' : 'AM';
      const _h12 = _sh > 12 ? _sh - 12 : (_sh === 0 ? 12 : _sh);
      _timeLabel = _h12 + ':' + (_sm < 10 ? '0' : '') + _sm + ' ' + _ampm;
    }
    _weeklyCalHtml += '<div style="text-align:center;padding:6px 4px;border-radius:6px;background:' + (_isToday ? '#2a2f3a' : '#22222a') + ';' + _border + '">' +
      '<div style="font-size:10px;color:' + (_isToday ? '#fff' : '#8b8fa3') + ';font-weight:' + (_isToday ? '700' : '400') + ';text-transform:uppercase;letter-spacing:.3px">' + _schedLabels[_di] + '</div>' +
      '<div style="width:6px;height:6px;border-radius:50%;background:' + _dotColor + ';margin:4px auto"></div>' +
      '<div style="font-size:11px;color:' + (_hasSlot ? '#e0e0e0' : '#555') + ';font-weight:' + (_hasSlot ? '600' : '400') + '">' + _timeLabel + '</div>' +
      '</div>';
  }

  // Streams left this month to meet goal
  const _goalStreamTarget = (_g.monthlyStreams || 0);
  const _streamsRemaining = Math.max(0, _goalStreamTarget - _goalStreams);
  const _daysLeftInMonth = new Date(new Date().getFullYear(), new Date().getMonth() + 1, 0).getDate() - new Date().getDate();
  const _scheduledDaysLeft = _schedDays.filter((d, i) => {
    const today = new Date();
    for (let off = 0; off <= _daysLeftInMonth; off++) {
      const future = new Date(today);
      future.setDate(future.getDate() + off);
      if (future.getDay() === i && _schedWeekly[d]) return true;
    }
    return false;
  }).length;

  // Goal bars HTML
  let _goalBarsHtml = '';
  if (_g.monthlyStreams > 0) _goalBarsHtml += '<div style="background:#2a2f3a;padding:12px;border-radius:6px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#8b8fa3;margin-bottom:6px"><span>Streams</span><span>' + _goalStreams + ' / ' + _g.monthlyStreams + '</span></div><div style="background:#17171b;border-radius:4px;height:8px;overflow:hidden"><div style="background:#9146ff;height:100%;width:' + Math.min(100, (_goalStreams / _g.monthlyStreams) * 100) + '%;border-radius:4px;transition:width .5s"></div></div></div>';
  if (_g.monthlyHours > 0) _goalBarsHtml += '<div style="background:#2a2f3a;padding:12px;border-radius:6px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#8b8fa3;margin-bottom:6px"><span>Hours Streamed</span><span>' + _goalHours + ' / ' + _g.monthlyHours + '</span></div><div style="background:#17171b;border-radius:4px;height:8px;overflow:hidden"><div style="background:#4caf50;height:100%;width:' + Math.min(100, (_goalHours / _g.monthlyHours) * 100) + '%;border-radius:4px;transition:width .5s"></div></div></div>';
  if (_g.monthlyPeakViewers > 0) _goalBarsHtml += '<div style="background:#2a2f3a;padding:12px;border-radius:6px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#8b8fa3;margin-bottom:6px"><span>Peak Viewers</span><span>' + _goalPeak + ' / ' + _g.monthlyPeakViewers + '</span></div><div style="background:#17171b;border-radius:4px;height:8px;overflow:hidden"><div style="background:#ffca28;height:100%;width:' + Math.min(100, (_goalPeak / _g.monthlyPeakViewers) * 100) + '%;border-radius:4px;transition:width .5s"></div></div></div>';
  if (_g.monthlyFollowers > 0) _goalBarsHtml += '<div style="background:#2a2f3a;padding:12px;border-radius:6px"><div style="display:flex;justify-content:space-between;font-size:12px;color:#8b8fa3;margin-bottom:6px"><span>New Followers</span><span>' + _goalFollowers + ' / ' + _g.monthlyFollowers + '</span></div><div style="background:#17171b;border-radius:4px;height:8px;overflow:hidden"><div style="background:#e91e63;height:100%;width:' + Math.min(100, (_goalFollowers / _g.monthlyFollowers) * 100) + '%;border-radius:4px;transition:width .5s"></div></div></div>';
  if (!_goalBarsHtml) _goalBarsHtml = '<div style="color:#8b8fa3;font-size:12px;padding:12px;text-align:center">No goals set. <a href="/stats">Set monthly goals in Analytics</a></div>';

  // Sparkline SVG
  const _sparkSvg = _sparkData.length >= 2 ? '<svg width="120" height="30" viewBox="0 0 120 30"><polyline fill="none" stroke="#9146ff" stroke-width="1.5" points="' + _sparkPoints + '"/></svg>' : '<span style="color:#8b8fa3;font-size:11px">Not enough data</span>';

  // YouTube health line
  const _ytHealthLine = yaStatus.health?.lastError ? '<span style="color:#ef5350">⚠️ YouTube error: ' + yaStatus.health.lastError + '</span>' : '<span style="color:#4caf50">✅ YouTube checker healthy</span>';

  // Quick links
  const _twitchLink = _twitchChannel ? '<a href="https://twitch.tv/' + _twitchChannel + '" target="_blank" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#9146ff20;border:1px solid #9146ff33;border-radius:6px;font-size:12px;color:#9146ff;text-decoration:none">📺 Twitch Channel</a>' : '';

return `
<!-- Sub-page tabs for Overview -->
<div style="display:flex;gap:2px;margin-bottom:14px;border-bottom:2px solid #2a2f3a;padding-bottom:0;overflow:hidden;flex-wrap:nowrap;scrollbar-width:none;-ms-overflow-style:none">
  <button class="small" onclick="ovSubPage('all')" data-ov-sub="all" style="width:auto;padding:6px 14px;font-size:11px;border-radius:6px 6px 0 0;background:#5b5bff;border-bottom:2px solid #5b5bff;margin-bottom:-2px">📋 All</button>
  <button class="small" onclick="ovSubPage('status')" data-ov-sub="status" style="width:auto;padding:6px 14px;font-size:11px;border-radius:6px 6px 0 0;background:transparent;border-bottom:2px solid transparent;margin-bottom:-2px">🤖 Status</button>
  <button class="small" onclick="ovSubPage('metrics')" data-ov-sub="metrics" style="width:auto;padding:6px 14px;font-size:11px;border-radius:6px 6px 0 0;background:transparent;border-bottom:2px solid transparent;margin-bottom:-2px">📈 Metrics</button>
  <button class="small" onclick="ovSubPage('community')" data-ov-sub="community" style="width:auto;padding:6px 14px;font-size:11px;border-radius:6px 6px 0 0;background:transparent;border-bottom:2px solid transparent;margin-bottom:-2px">👥 Community</button>
  <button class="small" onclick="ovSubPage('admin')" data-ov-sub="admin" style="width:auto;padding:6px 14px;font-size:11px;border-radius:6px 6px 0 0;background:transparent;border-bottom:2px solid transparent;margin-bottom:-2px">🔧 Admin</button>
  <span style="flex:1"></span>
  <button class="small" onclick="ovExpandAll()" style="width:auto;padding:4px 8px;font-size:10px;background:#2a2f3a" title="Expand all">▼</button>
  <button class="small" onclick="ovCollapseAll()" style="width:auto;padding:4px 8px;font-size:10px;background:#2a2f3a" title="Collapse all">▶</button>
</div>

${_warnBanner}

<!-- Quick Links Bar -->
<div data-ov-section="status" class="card" style="padding:10px 16px">
  <div style="display:flex;gap:10px;flex-wrap:wrap;align-items:center">
    ${_twitchLink}
    <a href="/commands" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#5865f220;border:1px solid #5865f233;border-radius:6px;font-size:12px;color:#5865f2;text-decoration:none">📋 Commands</a>
    <a href="/stats" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#4caf5020;border:1px solid #4caf5033;border-radius:6px;font-size:12px;color:#4caf50;text-decoration:none">📈 Analytics</a>
    <a href="/logs" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#ffca2820;border:1px solid #ffca2833;border-radius:6px;font-size:12px;color:#ffca28;text-decoration:none">📋 Logs</a>
    <a href="/notifications" style="display:inline-flex;align-items:center;gap:4px;padding:6px 12px;background:#e91e6320;border:1px solid #e91e6333;border-radius:6px;font-size:12px;color:#e91e63;text-decoration:none">🔔 Notifications</a>
  </div>
</div>

<!-- ═══ COMPACT CARDS ROW (moved to top) ═══ -->
<div data-ov-section="community" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-bottom:10px">
  <div class="card" style="padding:10px 14px;margin:0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:13px">👥</span><span style="font-size:11px;font-weight:700;color:#e0e0e0">Community</span></div>
    <div style="display:flex;gap:12px;align-items:center;font-size:11px">
      <div><span style="color:#8b8fa3">VIPs</span> <span style="color:#9146ff;font-weight:700" id="ovVipCount">—</span></div>
      <div><span style="color:#8b8fa3">Giveaways</span> <span style="color:#4caf50;font-weight:700">${_activeGiveaways}</span></div>
      <div><span style="color:#8b8fa3">Servers</span> <span style="color:#5865f2;font-weight:700">${client.guilds.cache.size}</span></div>
    </div>
  </div>
  <div class="card" style="padding:10px 14px;margin:0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:13px">🎯</span><span style="font-size:11px;font-weight:700;color:#e0e0e0">Monthly Goals</span></div>
    <div id="ovGoalsCompact" style="display:flex;gap:8px;flex-wrap:wrap;font-size:11px">${_goalBarsHtml}</div>
  </div>
</div>

<!-- ═══ TOP CHATTERS & API RATE LIMITS (moved to top) ═══ -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
  <div data-ov-section="community" class="card" style="padding:10px 14px;margin:0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:13px">💬</span><span style="font-size:11px;font-weight:700;color:#e0e0e0">Top Chatters & Emote</span></div>
    <div id="ovChatStatsWrap" style="font-size:11px">
      <span style="color:#8b8fa3">Loading…</span>
    </div>
  </div>
  <div data-ov-section="admin" class="card" style="padding:10px 14px;margin:0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:13px">📊</span><span style="font-size:11px;font-weight:700;color:#e0e0e0">API Rate Limits</span></div>
    <div id="ovRateLimitsWrap" style="font-size:11px">
      <span style="color:#8b8fa3">Loading…</span>
    </div>
  </div>
</div>

<!-- ═══ METRICS & ANALYTICS ═══ -->
<div data-ov-section="metrics" class="card ov-collapsible" data-collapsed="false">
  <h2 style="cursor:pointer;user-select:none" onclick="ovToggle(this)">📈 Metrics & Analytics <span class="ov-chevron" style="font-size:14px;margin-left:auto;transition:transform .2s">▼</span></h2>
  <div class="ov-body">
    <div style="margin-bottom:16px">
      <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:8px">👤 Follower Growth</div>
      <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:10px">
        <div style="background:#2a2f3a;padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:11px;color:#8b8fa3">Current</div>
          <div style="font-size:20px;font-weight:700;color:#4caf50">${_latestFollowers.toLocaleString()}</div>
        </div>
        <div style="background:#2a2f3a;padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:11px;color:#8b8fa3">7-Day</div>
          <div style="font-size:20px;font-weight:700;color:${_followGain7d >= 0 ? '#4caf50' : '#ef5350'}">${_followGain7d >= 0 ? '+' : ''}${_followGain7d}</div>
        </div>
        <div style="background:#2a2f3a;padding:10px;border-radius:6px;text-align:center">
          <div style="font-size:11px;color:#8b8fa3">30-Day</div>
          <div style="font-size:20px;font-weight:700;color:${_followGain30d >= 0 ? '#4caf50' : '#ef5350'}">${_followGain30d >= 0 ? '+' : ''}${_followGain30d}</div>
        </div>
        <div style="background:#2a2f3a;padding:10px;border-radius:6px;text-align:center;display:flex;flex-direction:column;align-items:center;justify-content:center">
          <div style="font-size:11px;color:#8b8fa3;margin-bottom:4px">Trend</div>
          ${_sparkSvg}
        </div>
      </div>
    </div>

    <div>
      <div style="font-size:13px;font-weight:600;color:#e0e0e0;margin-bottom:8px">📋 Recent Streams ${_bestDayHtml}</div>
      ${_recentStreamsHtml}
    </div>
  </div>
</div>

<!-- (Stream Health merged into Bot & System Health panel above) -->

<!-- ═══ NEXT STREAM INDICATOR ═══ -->
<div data-ov-section="status" class="card ov-collapsible" data-collapsed="false">
  <h2 style="cursor:pointer;user-select:none" onclick="ovToggle(this)">📅 Next Stream <span class="ov-chevron" style="font-size:14px;margin-left:auto;transition:transform .2s">▼</span></h2>
  <div class="ov-body">
    <div id="ovNextStreamWrap">
      ${_isLiveNow ? `
      <!-- Currently live -->
      <div style="background:linear-gradient(135deg,#1a3a1a,#1a2a1a);border:1px solid #4caf5033;border-radius:8px;padding:20px;text-align:center">
        <div style="display:inline-flex;align-items:center;gap:8px;margin-bottom:8px">
          <span style="width:10px;height:10px;border-radius:50%;background:#4caf50;animation:ovPulse 1.5s ease-in-out infinite"></span>
          <span style="font-size:18px;font-weight:700;color:#4caf50">You're LIVE right now!</span>
        </div>
        <div style="font-size:13px;color:#8b8fa3">Stream uptime: <strong style="color:#e0e0e0">${_uptimeStr}</strong></div>
      </div>` : _schedNoStream ? `
      <!-- No stream today -->
      <div style="background:#2a2020;border:1px solid #ef535033;border-radius:8px;padding:20px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px">🚫</div>
        <div style="font-size:15px;font-weight:600;color:#ef5350">No stream today</div>
        <div style="font-size:12px;color:#8b8fa3;margin-top:4px">Schedule was cancelled for today</div>
      </div>` : _schedDelayed ? `
      <!-- Delayed -->
      <div style="background:#2a2a20;border:1px solid #ffca2833;border-radius:8px;padding:20px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px">⏳</div>
        <div style="font-size:15px;font-weight:600;color:#ffca28">Stream delayed</div>
        <div style="font-size:12px;color:#8b8fa3;margin-top:4px">Check back soon for an updated time</div>
      </div>` : _nextStreamAt ? `
      <!-- Countdown -->
      <div style="background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid #9146ff33;border-radius:8px;padding:20px;text-align:center">
        <div style="font-size:12px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:8px">Next Scheduled Stream</div>
        <div id="ovCountdown" style="display:flex;justify-content:center;gap:12px;margin-bottom:12px" data-target="${_nextStreamISO}"></div>
        <div style="font-size:13px;color:#b0b0b0">
          <span id="ovNextDate"></span>
        </div>
      </div>` : `
      <!-- No schedule -->
      <div style="background:#26262c;border-radius:8px;padding:20px;text-align:center">
        <div style="font-size:28px;margin-bottom:8px">📅</div>
        <div style="font-size:14px;color:#8b8fa3">No stream scheduled</div>
        <div style="font-size:12px;color:#666;margin-top:4px">Set up your weekly schedule below</div>
      </div>`}

    <!-- Weekly mini-calendar -->
    <div style="margin-top:14px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">
        <span style="font-size:12px;font-weight:600;color:#e0e0e0">📆 Weekly Schedule</span>
        <button class="small" onclick="ovEditSchedule()" style="width:auto;padding:3px 10px;font-size:11px">✏️ Edit</button>
      </div>
      <div style="display:grid;grid-template-columns:repeat(7,1fr);gap:4px">
        ${_weeklyCalHtml}
      </div>
    </div>

    ${_goalStreamTarget > 0 ? `
    <!-- Goal tie-in -->
    <div style="margin-top:12px;padding:10px 12px;background:#2a2f3a;border-radius:6px;display:flex;align-items:center;gap:10px">
      <span style="font-size:18px">🎯</span>
      <div style="flex:1">
        <div style="font-size:12px;color:#e0e0e0;font-weight:600">${_streamsRemaining > 0 ? _streamsRemaining + ' stream' + (_streamsRemaining > 1 ? 's' : '') + ' left to hit your monthly goal' : '✅ Monthly stream goal reached!'}</div>
        <div style="font-size:11px;color:#8b8fa3">${_goalStreams} / ${_goalStreamTarget} streams · ${_daysLeftInMonth} day${_daysLeftInMonth !== 1 ? 's' : ''} remaining</div>
      </div>
      <div style="background:#17171b;border-radius:4px;height:6px;width:80px;overflow:hidden"><div style="background:#9146ff;height:100%;width:${Math.min(100, _goalStreamTarget > 0 ? (_goalStreams / _goalStreamTarget) * 100 : 0)}%;border-radius:4px"></div></div>
    </div>` : ''}
    </div>
  </div>
</div>


<!-- (Quick Actions & Twitch Auth merged into Bot & System Health panel) -->

<!-- ═══ GETTING STARTED ═══ -->
<div data-ov-section="status" class="card ov-collapsible" data-collapsed="true">
  <h2 style="cursor:pointer;user-select:none" onclick="ovToggle(this)">📖 Getting Started <span class="ov-chevron" style="font-size:14px;margin-left:auto;transition:transform .2s">▶</span></h2>
  <div class="ov-body" style="display:none">
    <p style="font-size:13px;color:#b0b0b0">Common tasks:</p>
    <ul style="font-size:13px;color:#b0b0b0">
      <li><a href="/commands">View all slash commands</a></li>
      <li><a href="/options">Configure notification role</a></li>
      <li><a href="/settings">Manage notification preferences</a></li>
      <li><a href="/logs">View bot activity logs</a></li>
      <li><a href="/stats">View stream statistics</a></li>
    </ul>
  </div>
</div>

<div id="vipModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.8);z-index:1000;align-items:center;justify-content:center">
  <div style="background:#1f1f23;padding:30px;border-radius:8px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto;position:relative">
    <button onclick="closeVIPModal()" style="position:absolute;top:10px;right:10px;width:auto;padding:5px 10px;background:#c43c3c">✖</button>
    <h2 style="margin-top:0;color:#9146ff">👑 Channel VIPs</h2>
    <div id="vipContent">Loading...</div>
  </div>
</div>

<script>
function ovToggle(h2) {
  var card = h2.closest('.ov-collapsible');
  if (!card) return;
  var body = card.querySelector('.ov-body');
  var chev = card.querySelector('.ov-chevron');
  var collapsed = body.style.display === 'none';
  body.style.display = collapsed ? '' : 'none';
  card.setAttribute('data-collapsed', collapsed ? 'false' : 'true');
  if (chev) chev.textContent = collapsed ? '▼' : '▶';
}
function ovExpandAll() {
  document.querySelectorAll('.ov-collapsible').forEach(function(c) {
    var body = c.querySelector('.ov-body');
    var chev = c.querySelector('.ov-chevron');
    if (body) body.style.display = '';
    if (chev) chev.textContent = '▼';
    c.setAttribute('data-collapsed', 'false');
  });
}
function ovCollapseAll() {
  document.querySelectorAll('.ov-collapsible').forEach(function(c) {
    var body = c.querySelector('.ov-body');
    var chev = c.querySelector('.ov-chevron');
    if (body) body.style.display = 'none';
    if (chev) chev.textContent = '▶';
    c.setAttribute('data-collapsed', 'true');
  });
}
function ovSubPage(section) {
  document.querySelectorAll('[data-ov-section]').forEach(function(el) {
    if (section === 'all') { el.style.display = ''; return; }
    var cats = (el.getAttribute('data-ov-section') || '').split(' ');
    el.style.display = cats.indexOf(section) !== -1 ? '' : 'none';
  });
  document.querySelectorAll('[data-ov-sub]').forEach(function(btn) {
    var active = btn.getAttribute('data-ov-sub') === section;
    btn.style.background = active ? '#5b5bff' : 'transparent';
    btn.style.borderBottomColor = active ? '#5b5bff' : 'transparent';
  });
}

function showVIPs() {
  var modal = document.getElementById('vipModal');
  modal.style.display = 'flex';
  fetch('/api/vips')
    .then(function(r) { return r.json(); })
    .then(function(data) {
      var content = document.getElementById('vipContent');
      if (data.error) {
        content.innerHTML = '<p style="color:#ef5350">Error: ' + data.error + '</p><p style="color:#999;font-size:13px">Your Twitch token may need channel:read:vips scope</p>';
      } else if (data.vips && data.vips.length > 0) {
        var el = document.getElementById('ovVipCount');
        if (el) el.textContent = data.vips.length;
        content.innerHTML = '<div style="display:grid;gap:8px">' +
          data.vips.map(function(vip) {
            return '<div style="background:#2a2f3a;padding:10px 14px;border-radius:6px;display:flex;justify-content:space-between;align-items:center">' +
              '<div><div style="font-weight:bold;color:#e0e0e0;font-size:13px">' + vip.user_name + '</div>' +
              '<div style="font-size:11px;color:#999">ID: ' + vip.user_id + '</div></div>' +
              '<span style="background:#9146ff;color:#fff;padding:3px 8px;border-radius:4px;font-size:11px">VIP</span></div>';
          }).join('') +
          '</div><p style="color:#999;margin-top:12px;font-size:12px">Total: ' + data.vips.length + '</p>';
      } else {
        content.innerHTML = '<p style="color:#999;font-style:italic">No VIPs found.</p>';
      }
    })
    .catch(function(err) {
      document.getElementById('vipContent').innerHTML = '<p style="color:#ef5350">Failed: ' + err.message + '</p>';
    });
}
function closeVIPModal() { document.getElementById('vipModal').style.display = 'none'; }
function testAlert(type) {
  fetch('/api/test-alert/' + type, { method: 'POST' })
    .then(function(r) { if (!r.ok) throw new Error('Server error'); return r.json(); })
    .then(function() { alert('Test alert sent: ' + type); })
    .catch(function(err) { console.error(err); alert('Failed to send test alert'); });
}
fetch('/api/vips').then(function(r){return r.json()}).then(function(d){
  var el = document.getElementById('ovVipCount');
  if (el && d.vips) el.textContent = d.vips.length;
}).catch(function(){});

// ── Stream Thumbnail Preview (refreshes every 5 min) ──
var _thumbInterval = null;
function ovRefreshThumb() {
  fetch('/api/stream-thumbnail').then(function(r){return r.json()}).then(function(d){
    var img = document.getElementById('ovThumbImg');
    var off = document.getElementById('ovThumbOffline');
    var loading = document.getElementById('ovThumbLoading');
    if (loading) loading.style.display = 'none';
    if (d.url && d.isLive) {
      img.src = d.url;
      img.style.display = 'block';
      off.style.display = 'none';
    } else {
      img.style.display = 'none';
      off.style.display = 'block';
    }
    var timer = document.getElementById('ovThumbTimer');
    if (timer) timer.textContent = 'Last refresh: ' + new Date().toLocaleTimeString() + ' · Next in 5 min';
  }).catch(function(){
    var loading = document.getElementById('ovThumbLoading');
    if (loading) loading.innerHTML = '<span style="color:#ef5350">Failed to load preview</span>';
  });
}
ovRefreshThumb();
_thumbInterval = setInterval(ovRefreshThumb, 5 * 60 * 1000);

// ── Chat Stats ──
function ovLoadChatStats() {
  fetch('/api/chat-stats').then(function(r){return r.json()}).then(function(d){
    var wrap = document.getElementById('ovChatStatsWrap');
    if (!wrap) return;
    if (!d.tracking) {
      wrap.innerHTML = '<span style="color:#8b8fa3;font-size:11px">Starts when live</span>';
      return;
    }
    var html = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
    // Top 3 chatters
    var top3 = (d.topChatters||[]).slice(0,3);
    if (top3.length === 0) {
      html += '<span style="color:#8b8fa3">No messages yet</span>';
    } else {
      top3.forEach(function(c, i) {
        var medal = i === 0 ? '🥇' : i === 1 ? '🥈' : '🥉';
        html += '<span style="display:inline-flex;align-items:center;gap:3px">' + medal + ' <span style="color:#e0e0e0;max-width:70px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;display:inline-block">' + c.name + '</span><span style="color:#9146ff;font-weight:700">' + c.count + '</span></span>';
      });
    }
    // Top 1 emote
    if (d.topEmotes && d.topEmotes.length > 0) {
      var e = d.topEmotes[0];
      html += '<span style="margin-left:4px;background:#2a2f3a;padding:2px 6px;border-radius:8px">' + e.emote + ' <span style="color:#8b8fa3">' + e.count + '</span></span>';
    }
    html += '</div>';
    wrap.innerHTML = html;
  }).catch(function(){
    var wrap = document.getElementById('ovChatStatsWrap');
    if (wrap) wrap.innerHTML = '<span style="color:#ef5350;font-size:11px">Failed</span>';
  });
}
ovLoadChatStats();
setInterval(ovLoadChatStats, 60000);

// ── Rate Limits ──
function ovLoadRateLimits() {
  fetch('/api/rate-limits').then(function(r){return r.json()}).then(function(d){
    var wrap = document.getElementById('ovRateLimitsWrap');
    if (!wrap) return;
    var pct = d.twitch.pct;
    var barColor = pct > 50 ? '#4caf50' : pct > 20 ? '#ffca28' : '#ef5350';
    var html = '<div style="display:flex;gap:10px;align-items:center;flex-wrap:wrap">';
    html += '<span style="color:#8b8fa3">Twitch:</span> <span style="color:' + barColor + ';font-weight:700">' + d.twitch.remaining + '/' + d.twitch.limit + '</span>';
    html += '<span style="color:#8b8fa3">Calls/min:</span> <span style="color:#5865f2;font-weight:700">' + d.callsThisMinute + '</span>';
    html += '<span style="color:#8b8fa3">Quota:</span> <span style="color:' + barColor + ';font-weight:700">' + pct + '%</span>';
    html += '<div style="flex:1;min-width:60px;background:#17171b;border-radius:3px;height:5px;overflow:hidden"><div style="background:' + barColor + ';height:100%;width:' + pct + '%;border-radius:3px"></div></div>';
    html += '</div>';
    wrap.innerHTML = html;
  }).catch(function(){
    var wrap = document.getElementById('ovRateLimitsWrap');
    if (wrap) wrap.innerHTML = '<span style="color:#ef5350;font-size:11px">Failed</span>';
  });
}
ovLoadRateLimits();
setInterval(ovLoadRateLimits, 30000);

// ── Next Stream Countdown ──
(function initCountdown() {
  var cd = document.getElementById('ovCountdown');
  if (!cd) return;
  var target = new Date(cd.dataset.target).getTime();
  var dateEl = document.getElementById('ovNextDate');
  if (dateEl) {
    var d = new Date(target);
    var opts = { weekday:'long', month:'long', day:'numeric', hour:'numeric', minute:'2-digit' };
    dateEl.textContent = d.toLocaleDateString('en-US', opts);
  }
  function pad(n) { return n < 10 ? '0' + n : n; }
  function tick() {
    var now = Date.now();
    var diff = target - now;
    if (diff <= 0) {
      cd.innerHTML = '<div style="font-size:16px;color:#4caf50;font-weight:700">Starting any moment now!</div>';
      return;
    }
    var days = Math.floor(diff / 86400000);
    var hours = Math.floor((diff % 86400000) / 3600000);
    var mins = Math.floor((diff % 3600000) / 60000);
    var secs = Math.floor((diff % 60000) / 1000);
    function unit(val, label) {
      return '<div style="text-align:center"><div style="font-size:28px;font-weight:800;color:#e0e0e0;font-variant-numeric:tabular-nums;background:#1a1a2e;border:1px solid #9146ff33;border-radius:8px;padding:6px 12px;min-width:48px">' + pad(val) + '</div><div style="font-size:10px;color:#8b8fa3;margin-top:4px;text-transform:uppercase;letter-spacing:.5px">' + label + '</div></div>';
    }
    var html = '';
    if (days > 0) html += unit(days, 'days');
    html += unit(hours, 'hrs') + unit(mins, 'min') + unit(secs, 'sec');
    cd.innerHTML = html;
  }
  tick();
  setInterval(tick, 1000);
})();

// ── Edit Schedule Modal ──
function ovEditSchedule() {
  var overlay = document.createElement('div');
  overlay.id = 'ovSchedOverlay';
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.75);z-index:2000;display:flex;align-items:center;justify-content:center;padding:20px';
  var days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  var labels = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  fetch('/api/stream-schedule').then(function(r){return r.json()}).then(function(data) {
    var weekly = data.weekly || {};
    var rows = '';
    days.forEach(function(d, i) {
      var slot = weekly[d];
      var checked = slot ? 'checked' : '';
      var hour = slot ? (slot.hour || 0) : (i === 0 || i === 6 ? 14 : 17);
      var minute = slot ? (slot.minute || 0) : 0;
      var hVal = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
      rows += '<div style="display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid #2a2f3a">' +
        '<label style="display:flex;align-items:center;gap:8px;width:130px;cursor:pointer"><input type="checkbox" id="schedEn_' + d + '" ' + checked + ' style="accent-color:#9146ff"> <span style="color:#e0e0e0;font-size:13px;font-weight:' + (i === 0 || i === 6 ? '400' : '600') + '">' + labels[i] + '</span></label>' +
        '<input type="time" id="schedTime_' + d + '" value="' + hVal + '" style="background:#1a1a1f;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0;padding:4px 8px;font-size:13px" onclick="this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()">' +
        '</div>';
    });
    overlay.innerHTML = '<div style="background:#1f1f23;border:1px solid #3a3a42;border-radius:10px;max-width:420px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.6)">' +
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h3 style="margin:0;color:#e0e0e0;font-size:16px">📅 Edit Weekly Schedule</h3><button onclick="document.getElementById(\\'ovSchedOverlay\\').remove()" style="background:none;border:none;color:#8b8fa3;font-size:20px;cursor:pointer;padding:0">✕</button></div>' +
      '<div style="font-size:12px;color:#8b8fa3;margin-bottom:12px">Set the days and times you normally stream. The countdown will automatically calculate the next upcoming stream.</div>' +
      rows +
      '<div style="display:flex;gap:8px;margin-top:16px"><button onclick="ovSaveSchedule()" style="flex:1;padding:10px;background:#9146ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">💾 Save Schedule</button><button onclick="document.getElementById(\\'ovSchedOverlay\\').remove()" style="padding:10px 16px;background:#2a2f3a;color:#8b8fa3;border:1px solid #3a3a42;border-radius:6px;cursor:pointer;font-size:13px">Cancel</button></div>' +
      '</div>';
  }).catch(function() {
    overlay.innerHTML = '<div style="background:#1f1f23;padding:24px;border-radius:10px;color:#ef5350">Failed to load schedule</div>';
  });
  document.body.appendChild(overlay);
}

function ovSaveSchedule() {
  var days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  var weekly = {};
  days.forEach(function(d) {
    var en = document.getElementById('schedEn_' + d);
    var time = document.getElementById('schedTime_' + d);
    if (en && en.checked && time && time.value) {
      var parts = time.value.split(':');
      weekly[d] = { hour: parseInt(parts[0]) || 0, minute: parseInt(parts[1]) || 0 };
    }
  });
  fetch('/api/stream-schedule', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ weekly: weekly })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) { location.reload(); } else { alert(d.error || 'Failed to save'); }
  }).catch(function(e) { alert('Error: ' + e.message); });
}

// ── Export Snapshot ──
function ovExportSnapshot() {
  var btn = event.target;
  btn.disabled = true;
  btn.textContent = '⏳ Capturing…';
  // Load html2canvas from CDN if not already loaded
  if (typeof html2canvas === 'undefined') {
    var script = document.createElement('script');
    script.src = 'https://cdnjs.cloudflare.com/ajax/libs/html2canvas/1.4.1/html2canvas.min.js';
    script.onload = function() { doCapture(btn); };
    script.onerror = function() {
      btn.disabled = false;
      btn.textContent = '📸 Export Snapshot';
      alert('Failed to load screenshot library. Check your internet connection.');
    };
    document.head.appendChild(script);
  } else {
    doCapture(btn);
  }
}
function doCapture(btn) {
  var target = document.querySelector('.main-content') || document.querySelector('main') || document.body;
  html2canvas(target, {
    backgroundColor: '#17171b',
    scale: 2,
    useCORS: true,
    logging: false
  }).then(function(canvas) {
    var link = document.createElement('a');
    link.download = 'dashboard-overview-' + new Date().toISOString().slice(0,10) + '.png';
    link.href = canvas.toDataURL('image/png');
    link.click();
    btn.disabled = false;
    btn.textContent = '📸 Export Snapshot';
  }).catch(function(err) {
    console.error('Snapshot failed:', err);
    btn.disabled = false;
    btn.textContent = '📸 Export Snapshot';
    alert('Snapshot failed: ' + err.message);
  });
}
</script>
`;
  }


  if(tab==='logs') return `
<div class="card">
  <h2>📋 Activity Logs</h2>
  <p style="color:#b0b0b0;margin-top:-6px">Real-time log viewer with lazy loading, source tagging, and live trail.</p>

  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(130px,1fr));gap:8px;margin:14px 0 16px 0">
    <div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">
      <div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">Total</div>
      <div id="stat-total" style="font-size:20px;font-weight:700;color:#fff;margin-top:4px">0</div>
    </div>
    <div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">
      <div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">Errors</div>
      <div id="stat-error" style="font-size:20px;font-weight:700;color:#ef5350;margin-top:4px">0</div>
    </div>
    <div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">
      <div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">Warnings</div>
      <div id="stat-warn" style="font-size:20px;font-weight:700;color:#ffca28;margin-top:4px">0</div>
    </div>
    <div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">
      <div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">Live Events</div>
      <div id="stat-live" style="font-size:20px;font-weight:700;color:#4caf50;margin-top:4px">0</div>
    </div>
    <div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">
      <div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">Twitch</div>
      <div id="stat-twitch" style="font-size:20px;font-weight:700;color:#9146ff;margin-top:4px">0</div>
    </div>
    <div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">
      <div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">Discord</div>
      <div id="stat-discord" style="font-size:20px;font-weight:700;color:#5865f2;margin-top:4px">0</div>
    </div>
  </div>

  <!-- Controls Row 1 -->
  <div style="display:grid;grid-template-columns:1fr auto auto auto;gap:8px;align-items:center;margin-bottom:8px">
    <input id="log-search" placeholder="🔍 Search message, type, or source..." style="margin:0">
    <select id="log-sort" style="width:auto;margin:0">
      <option value="newest">Newest first</option>
      <option value="oldest">Oldest first</option>
    </select>
    <select id="log-source" style="width:auto;margin:0">
      <option value="all">All sources</option>
      <option value="twitch">📺 Twitch</option>
      <option value="discord">💬 Discord</option>
      <option value="rpg">🎮 RPG</option>
      <option value="system">⚙️ System</option>
    </select>
    <button class="small" id="log-reset" style="width:auto;margin:0">Reset</button>
  </div>

  <!-- Controls Row 2 -->
  <div style="display:grid;grid-template-columns:auto auto auto 1fr;gap:8px;align-items:center;margin-bottom:10px">
    <select id="log-time-range" style="width:auto;margin:0">
      <option value="all">All time</option>
      <option value="15m">Last 15m</option>
      <option value="1h">Last 1h</option>
      <option value="6h">Last 6h</option>
      <option value="24h">Last 24h</option>
      <option value="7d">Last 7d</option>
    </select>
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#b0b0b0;background:#2a2f3a;border:1px solid #3a3a42;border-radius:6px;padding:6px 10px;cursor:pointer">
      <input id="log-important-only" type="checkbox"> Important only
    </label>
    <label style="display:flex;align-items:center;gap:6px;font-size:12px;color:#b0b0b0;background:#2a2f3a;border:1px solid #3a3a42;border-radius:6px;padding:6px 10px;cursor:pointer">
      <input id="log-group-similar" type="checkbox"> Group similar
    </label>
    <span></span>
  </div>

  <!-- Type filter buttons & Live Trail controls -->
  <div style="display:flex;gap:6px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
    <button class="small" data-type="all" style="width:auto;margin:0;background:#5b5bff">All</button>
    <button class="small" data-type="info" style="width:auto;margin:0">ℹ️ Info</button>
    <button class="small" data-type="live" style="width:auto;margin:0">🔴 Live</button>
    <button class="small" data-type="offline" style="width:auto;margin:0">⚫ Offline</button>
    <button class="small" data-type="error" style="width:auto;margin:0">❌ Error</button>
    <button class="small" data-type="warn" style="width:auto;margin:0">⚠️ Warn</button>
    <button class="small" data-type="milestone" style="width:auto;margin:0">🏆 Milestone</button>
    <span style="flex:1"></span>
    <button class="small" id="log-export" style="width:auto;margin:0">⬇️ Export</button>
    <button class="small danger" id="log-clear" style="width:auto;margin:0">🗑️ Clear</button>
  </div>

  <!-- Live Trail / Refresh Mode -->
  <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px;padding:8px 12px;background:#1a1d28;border:1px solid #2a2f3a;border-radius:6px">
    <div style="display:flex;align-items:center;gap:12px">
      <span style="font-size:12px;font-weight:600;color:#e0e0e0">🔄 Update Mode:</span>
      <div style="display:flex;gap:4px" id="log-refresh-modes">
        <button class="small" data-mode="live" onclick="setLogRefreshMode('live')" style="width:auto;padding:3px 10px;font-size:10px;margin:0;background:#4caf50">🟢 Live</button>
        <button class="small" data-mode="5" onclick="setLogRefreshMode('5')" style="width:auto;padding:3px 10px;font-size:10px;margin:0">5 min</button>
        <button class="small" data-mode="10" onclick="setLogRefreshMode('10')" style="width:auto;padding:3px 10px;font-size:10px;margin:0">10 min</button>
        <button class="small" data-mode="30" onclick="setLogRefreshMode('30')" style="width:auto;padding:3px 10px;font-size:10px;margin:0">30 min</button>
        <button class="small" data-mode="off" onclick="setLogRefreshMode('off')" style="width:auto;padding:3px 10px;font-size:10px;margin:0">⏸ Off</button>
      </div>
    </div>
    <div style="display:flex;align-items:center;gap:12px">
      <label style="display:flex;align-items:center;gap:4px;font-size:11px;color:#8b8fa3;cursor:pointer">
        <input type="checkbox" id="log-auto-scroll" checked> Auto-scroll
      </label>
      <span id="log-results" style="font-size:12px;color:#8b8fa3">0 results</span>
    </div>
  </div>

  <!-- Status bar -->
  <div style="display:flex;justify-content:space-between;align-items:center;font-size:11px;color:#8b8fa3;margin-bottom:6px;padding:0 4px">
    <span id="log-last-event">Last event: —</span>
    <span id="log-live-status" style="display:inline-flex;align-items:center;gap:6px;padding:3px 8px;border-radius:999px;background:#1f2a1f;border:1px solid #2f5f2f;color:#9fe6a0;font-weight:600;font-size:10px">🟢 Live Connected</span>
  </div>

  <div id="logbox-container" style="max-height:620px;overflow-y:auto;border:1px solid #3a3a42;border-radius:8px;background:#17171b">
    <div id="logbox" style="padding:4px"></div>
    <div id="log-load-more" style="text-align:center;padding:12px;display:none">
      <button class="small" onclick="loadMoreLogs()" style="width:auto;padding:8px 24px;font-size:12px;background:#2a2f3a;border:1px solid #3a3a42">📥 Load more logs...</button>
      <div style="font-size:11px;color:#8b8fa3;margin-top:4px"><span id="log-loaded-count">0</span> / <span id="log-total-filtered">0</span> loaded</div>
    </div>
    <div id="log-end-marker" style="text-align:center;padding:8px;color:#8b8fa3;font-size:11px;display:none">— All logs loaded —</div>
  </div>
</div>

<script>
// ── Initial batch: load only first 50 entries ──
const allServerLogs = ${JSON.stringify(logs.slice(0, 200))}.map((entry, idx) => {
  const ts = Number(entry && entry.ts);
  return {
    ...entry,
    _id: idx,
    ts: Number.isFinite(ts) && ts > 0 ? ts : (Date.now() - idx * 1000)
  };
});

const LOG_BATCH_SIZE = 50;
let logDisplayOffset = 0;
let logFilterType = 'all';
let logSort = 'newest';
let logSource = 'all';
let logTimeRange = 'all';
let logImportantOnly = false;
let logGroupSimilar = false;
let logRefreshMode = 'live';
let logRefreshTimer = null;
let logAutoScroll = true;

const sourceIcons = { twitch: '📺', discord: '💬', rpg: '🎮', system: '⚙️' };
const sourceColors = { twitch: '#9146ff', discord: '#5865f2', rpg: '#e91e63', system: '#8b8fa3' };

const badgeStyles = {
  info: 'background:#1a2a3a;color:#6ab7ff;border:1px solid #29465f',
  live: 'background:#1a2f1a;color:#4caf50;border:1px solid #2f5f2f',
  offline: 'background:#2f2a1a;color:#ffca28;border:1px solid #5a4e20',
  error: 'background:#2f1a1a;color:#ef5350;border:1px solid #6a2b2b',
  warn: 'background:#2f2a1a;color:#ffca28;border:1px solid #5a4e20',
  warning: 'background:#2f2a1a;color:#ffca28;border:1px solid #5a4e20',
  milestone: 'background:#2f2a1a;color:#ffd700;border:1px solid #7a6720'
};

function escapeHtml(text) {
  return String(text).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#039;');
}

function normalizeType(type) {
  const t = String(type || '').toLowerCase();
  return t === 'warning' ? 'warn' : t;
}

function detectSource(entry) {
  const text = String(entry && entry.msg || '').toLowerCase();
  if (text.includes('twitch') || text.includes('oauth') || text.includes('helix') || text.includes('token')) return 'twitch';
  if (text.includes('discord') || text.includes('guild') || text.includes('slash command') || text.includes('member')) return 'discord';
  if (text.includes('rpg') || text.includes('quest') || text.includes('dungeon') || text.includes('guild boss') || text.includes('crafting')) return 'rpg';
  return 'system';
}

function timeAgo(ts) {
  const diff = Date.now() - ts;
  if (diff < 60000) return Math.floor(diff / 1000) + 's ago';
  if (diff < 3600000) return Math.floor(diff / 60000) + 'm ago';
  if (diff < 86400000) return Math.floor(diff / 3600000) + 'h ago';
  return Math.floor(diff / 86400000) + 'd ago';
}

function inTimeWindow(entryTs) {
  if (logTimeRange === 'all') return true;
  const now = Date.now();
  const msMap = { '15m': 15*60*1000, '1h': 60*60*1000, '6h': 6*60*60*1000, '24h': 24*60*60*1000, '7d': 7*24*60*60*1000 };
  const limit = msMap[logTimeRange] || 0;
  return !limit || Number(entryTs || 0) >= (now - limit);
}

function isImportantType(type) {
  const t = normalizeType(type);
  return t === 'error' || t === 'warn' || t === 'milestone' || t === 'live' || t === 'offline';
}

function matchType(entryType) {
  if (logFilterType === 'all') return true;
  return normalizeType(entryType) === logFilterType;
}

function getFilteredLogs() {
  const query = (document.getElementById('log-search')?.value || '').trim().toLowerCase();
  return allServerLogs.filter(function(entry) {
    var typeOk = matchType(entry.type);
    var src = detectSource(entry);
    var sourceOk = logSource === 'all' || src === logSource;
    var windowOk = inTimeWindow(entry.ts);
    var importantOk = !logImportantOnly || isImportantType(entry.type);
    var text = ('[' + (entry.time || '') + '] ' + (entry.msg || '') + ' ' + (entry.type || '')).toLowerCase();
    var textOk = !query || text.includes(query);
    return typeOk && sourceOk && windowOk && importantOk && textOk;
  });
}

function updateStats() {
  var byType = {};
  var bySrc = {};
  allServerLogs.forEach(function(entry) {
    var t = normalizeType(entry.type);
    byType[t] = (byType[t] || 0) + 1;
    var s = detectSource(entry);
    bySrc[s] = (bySrc[s] || 0) + 1;
  });
  document.getElementById('stat-total').textContent = allServerLogs.length;
  document.getElementById('stat-error').textContent = byType.error || 0;
  document.getElementById('stat-warn').textContent = byType.warn || 0;
  document.getElementById('stat-live').textContent = byType.live || 0;
  var twitchEl = document.getElementById('stat-twitch');
  var discordEl = document.getElementById('stat-discord');
  if (twitchEl) twitchEl.textContent = bySrc.twitch || 0;
  if (discordEl) discordEl.textContent = bySrc.discord || 0;
}

function updateTypeButtonsUI() {
  document.querySelectorAll('#log-type-buttons button[data-type], [data-type]').forEach(function(btn) {
    if (!btn.dataset.type) return;
    var active = btn.dataset.type === logFilterType;
    btn.style.background = active ? '#5b5bff' : '';
  });
}

function renderLogEntry(entry) {
  var normalizedType = normalizeType(entry.type || 'info');
  var style = badgeStyles[normalizedType] || badgeStyles.info;
  var src = detectSource(entry);
  var srcIcon = sourceIcons[src] || '⚙️';
  var srcColor = sourceColors[src] || '#8b8fa3';
  var age = timeAgo(entry.ts);

  return '<div style="display:grid;grid-template-columns:28px 80px 60px 60px 1fr;gap:6px;align-items:center;padding:8px 10px;border-bottom:1px solid #1e222a;font-size:12px;transition:background .1s" onmouseover="this.style.background=\\'#1a1e28\\'" onmouseout="this.style.background=\\'\\'">'
    + '<span style="font-size:14px;text-align:center" title="' + escapeHtml(src) + '">' + srcIcon + '</span>'
    + '<span style="font-family:monospace;font-size:10px;color:#8b8fa3;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="' + escapeHtml(entry.time || '') + '">' + escapeHtml(entry.time || '--:--:--') + '</span>'
    + '<span style="font-size:9px;color:#666;white-space:nowrap">' + age + '</span>'
    + '<span style="font-size:9px;font-weight:700;letter-spacing:.3px;border-radius:999px;padding:2px 6px;white-space:nowrap;text-align:center;' + style + '">' + escapeHtml(normalizedType.toUpperCase()) + '</span>'
    + '<span style="font-family:monospace;font-size:11px;color:#d8dbe2;line-height:1.4;word-break:break-word;overflow:hidden">' + escapeHtml(entry.msg || '') + '</span>'
    + '</div>';
}

function renderLogs() {
  logDisplayOffset = 0;
  var filtered = getFilteredLogs();
  var sorted = logSort === 'oldest' ? filtered.slice().reverse() : filtered;
  var batch = sorted.slice(0, LOG_BATCH_SIZE);
  logDisplayOffset = batch.length;

  document.getElementById('log-results').textContent = filtered.length + ' results (from ' + allServerLogs.length + ')';
  document.getElementById('log-total-filtered').textContent = sorted.length;
  document.getElementById('log-loaded-count').textContent = batch.length;

  var html = batch.map(renderLogEntry).join('');
  document.getElementById('logbox').innerHTML = html || '<div style="padding:20px;text-align:center;color:#8b8fa3">No logs match your filters.</div>';

  // Show/hide load more button
  var loadMoreEl = document.getElementById('log-load-more');
  var endMarker = document.getElementById('log-end-marker');
  if (batch.length < sorted.length) {
    loadMoreEl.style.display = 'block';
    endMarker.style.display = 'none';
  } else {
    loadMoreEl.style.display = 'none';
    endMarker.style.display = sorted.length > 0 ? 'block' : 'none';
  }
}

function loadMoreLogs() {
  var filtered = getFilteredLogs();
  var sorted = logSort === 'oldest' ? filtered.slice().reverse() : filtered;
  var nextBatch = sorted.slice(logDisplayOffset, logDisplayOffset + LOG_BATCH_SIZE);
  logDisplayOffset += nextBatch.length;

  document.getElementById('log-loaded-count').textContent = logDisplayOffset;
  var logbox = document.getElementById('logbox');
  nextBatch.forEach(function(entry) {
    logbox.insertAdjacentHTML('beforeend', renderLogEntry(entry));
  });

  var loadMoreEl = document.getElementById('log-load-more');
  var endMarker = document.getElementById('log-end-marker');
  if (logDisplayOffset >= sorted.length) {
    loadMoreEl.style.display = 'none';
    endMarker.style.display = 'block';
  }
}

// Infinite scroll: load more when nearing the bottom
var logContainer = document.getElementById('logbox-container');
if (logContainer) {
  logContainer.addEventListener('scroll', function() {
    var el = this;
    if (el.scrollHeight - el.scrollTop - el.clientHeight < 150) {
      var filtered = getFilteredLogs();
      var sorted = logSort === 'oldest' ? filtered.slice().reverse() : filtered;
      if (logDisplayOffset < sorted.length) {
        loadMoreLogs();
      }
    }
  });
}

function exportLogs() {
  var json = JSON.stringify(allServerLogs, null, 2);
  var blob = new Blob([json], { type: 'application/json' });
  var url = URL.createObjectURL(blob);
  var a = document.createElement('a');
  a.href = url;
  a.download = 'logs_' + new Date().toISOString().split('T')[0] + '.json';
  a.click();
  URL.revokeObjectURL(url);
}

function clearLogs() {
  if (confirm('⚠️ Are you sure? This will delete ALL logs.')) {
    fetch('/logs/clear', { method: 'POST' }).then(function() { location.reload(); });
  }
}

// ── Refresh Mode Logic ──
function setLogRefreshMode(mode) {
  logRefreshMode = mode;
  if (logRefreshTimer) { clearInterval(logRefreshTimer); logRefreshTimer = null; }
  document.querySelectorAll('#log-refresh-modes button').forEach(function(btn) {
    var active = btn.getAttribute('data-mode') === mode;
    btn.style.background = active ? (mode === 'live' ? '#4caf50' : mode === 'off' ? '#ef5350' : '#5b5bff') : '';
  });
  if (mode === 'live') {
    // SSE handles live updates
    if (typeof logsStream !== 'undefined' && logsStream.readyState === EventSource.CLOSED) {
      initSSE();
    }
  } else if (mode !== 'off') {
    var mins = parseInt(mode);
    if (mins > 0) {
      logRefreshTimer = setInterval(function() {
        fetch('/api/logs/paginated?offset=0&limit=200').then(function(r) { return r.json(); }).then(function(data) {
          if (data.logs) {
            allServerLogs.length = 0;
            data.logs.forEach(function(l, i) {
              var ts = Number(l.ts);
              allServerLogs.push({ ...l, _id: i, ts: Number.isFinite(ts) && ts > 0 ? ts : Date.now() - i * 1000 });
            });
            updateStats();
            renderLogs();
            var lastEventEl = document.getElementById('log-last-event');
            if (lastEventEl) lastEventEl.textContent = 'Refreshed: ' + new Date().toLocaleTimeString();
          }
        }).catch(function() {});
      }, mins * 60 * 1000);
    }
  }
}

// ── Event Listeners ──
document.getElementById('log-search').addEventListener('input', renderLogs);
document.getElementById('log-sort').addEventListener('change', function(e) { logSort = e.target.value; renderLogs(); });
document.getElementById('log-source').addEventListener('change', function(e) { logSource = e.target.value || 'all'; renderLogs(); });
document.getElementById('log-time-range').addEventListener('change', function(e) { logTimeRange = e.target.value || 'all'; renderLogs(); });
document.getElementById('log-important-only').addEventListener('change', function(e) { logImportantOnly = !!e.target.checked; renderLogs(); });
document.getElementById('log-group-similar').addEventListener('change', function(e) { logGroupSimilar = !!e.target.checked; renderLogs(); });
document.getElementById('log-auto-scroll').addEventListener('change', function(e) { logAutoScroll = !!e.target.checked; });
document.getElementById('log-export').addEventListener('click', exportLogs);
document.getElementById('log-clear').addEventListener('click', clearLogs);

document.querySelectorAll('button[data-type]').forEach(function(btn) {
  btn.addEventListener('click', function() {
    logFilterType = btn.dataset.type || 'all';
    updateTypeButtonsUI();
    renderLogs();
  });
});

document.getElementById('log-reset').addEventListener('click', function() {
  logFilterType = 'all';
  logSort = 'newest';
  logSource = 'all';
  logTimeRange = 'all';
  logImportantOnly = false;
  logGroupSimilar = false;
  document.getElementById('log-search').value = '';
  document.getElementById('log-sort').value = 'newest';
  document.getElementById('log-source').value = 'all';
  document.getElementById('log-time-range').value = 'all';
  document.getElementById('log-important-only').checked = false;
  document.getElementById('log-group-similar').checked = false;
  updateTypeButtonsUI();
  renderLogs();
});

updateStats();
updateTypeButtonsUI();
renderLogs();

// ── SSE Live Stream ──
var logsStream;
function initSSE() {
  if (!window.EventSource) return;
  var statusEl = document.getElementById('log-live-status');
  var lastEventEl = document.getElementById('log-last-event');
  function setStatus(state) {
    if (!statusEl) return;
    if (state === 'connected') {
      statusEl.innerHTML = '🟢 Live Connected';
      statusEl.style.background = '#1f2a1f';
      statusEl.style.borderColor = '#2f5f2f';
      statusEl.style.color = '#9fe6a0';
    } else if (state === 'reconnecting') {
      statusEl.innerHTML = '🟡 Reconnecting...';
      statusEl.style.background = '#2f2a1a';
      statusEl.style.borderColor = '#5a4e20';
      statusEl.style.color = '#ffdf6b';
    } else if (state === 'paused') {
      statusEl.innerHTML = '⏸ Paused (' + logRefreshMode + (logRefreshMode !== 'off' ? ' min refresh' : '') + ')';
      statusEl.style.background = '#1a1a2f';
      statusEl.style.borderColor = '#3a3a5f';
      statusEl.style.color = '#8b8fcc';
    } else {
      statusEl.innerHTML = '🔴 Disconnected';
      statusEl.style.background = '#2f1a1a';
      statusEl.style.borderColor = '#6a2b2b';
      statusEl.style.color = '#ff9a9a';
    }
  }

  logsStream = new EventSource('/api/logs/stream');
  logsStream.onmessage = function(event) {
    try {
      var entry = JSON.parse(event.data || '{}');
      if (!entry || entry.type === 'connected' || !entry.msg) return;
      if (logRefreshMode !== 'live') return; // Ignore SSE events if not in live mode
      setStatus('connected');
      if (lastEventEl) lastEventEl.textContent = 'Last event: ' + new Date().toLocaleTimeString();
      if (!entry.ts) entry.ts = Date.now();
      entry._id = allServerLogs.length;
      allServerLogs.unshift(entry);
      if (allServerLogs.length > 500) allServerLogs.pop();
      updateStats();
      // Prepend new entry to visible list if it matches filters
      var filtered = getFilteredLogs();
      if (filtered.indexOf(entry) !== -1) {
        var logbox = document.getElementById('logbox');
        if (logSort === 'newest') {
          logbox.insertAdjacentHTML('afterbegin', renderLogEntry(entry));
          logDisplayOffset++;
          document.getElementById('log-loaded-count').textContent = logDisplayOffset;
        } else {
          logbox.insertAdjacentHTML('beforeend', renderLogEntry(entry));
        }
        document.getElementById('log-results').textContent = filtered.length + ' results (from ' + allServerLogs.length + ')';
        document.getElementById('log-total-filtered').textContent = filtered.length;
        // Auto-scroll
        if (logAutoScroll) {
          var container = document.getElementById('logbox-container');
          if (logSort === 'newest') container.scrollTop = 0;
          else container.scrollTop = container.scrollHeight;
        }
      }
    } catch(e) {}
  };
  logsStream.onopen = function() { setStatus('connected'); };
  logsStream.onerror = function() { setStatus('reconnecting'); };
  window.addEventListener('beforeunload', function() {
    setStatus('disconnected');
    logsStream.close();
  });
}
initSSE();
</script>`;


  if(tab==='options' || tab==='settings' || tab==='config') return renderConfigTab();
  if (tab === 'stats') return getCachedAnalytics('stats', renderAnalyticsTab);
  if (tab === 'stats-engagement') return getCachedAnalytics('stats-engagement', renderEngagementStatsTab);
  if (tab === 'stats-trends') return getCachedAnalytics('stats-trends', renderTrendsStatsTab);
  if (tab === 'stats-games') return getCachedAnalytics('stats-games', renderGamePerformanceTab);
  if (tab === 'stats-viewers') return getCachedAnalytics('stats-viewers', renderViewerPatternsTab);
  if (tab === 'stats-ai') return getCachedAnalytics('stats-ai', renderAIInsightsTab);
  if (tab === 'stats-reports') return getCachedAnalytics('stats-reports', renderReportsTab);
  if (tab === 'stats-community') return getCachedAnalytics('stats-community', renderCommunityStatsTab);
  if (tab === 'stats-rpg') return getCachedAnalytics('stats-rpg', renderRPGAnalyticsTab);
  if (tab === 'stats-rpg-events') return renderRPGEventsTab();
  if (tab === 'stats-rpg-economy') return getCachedAnalytics('stats-rpg-economy', renderRPGEconomyTab);
  if (tab === 'stats-rpg-quests') return getCachedAnalytics('stats-rpg-quests', renderRPGQuestsCombatTab);
  if (tab === 'stats-compare') return getCachedAnalytics('stats-compare', renderStreamCompareTab);
  if (tab === 'stats-streaks') return getCachedAnalytics('stats-streaks', renderStreaksMilestonesTab);

  if (tab === 'suggestions') return renderSuggestionsTab();
  if (tab === 'settings') return renderSettingsTab();
  if (tab === 'commands' || tab === 'commands-config' || tab === 'config-commands') return renderCommandsAndConfigTab(tab);
  if (tab === 'config' || tab === 'config-general') return renderConfigGeneralTab();
  if (tab === 'config-notifications') return renderConfigNotificationsTab();
  if (tab === 'notifications') return renderNotificationsTab();
  if (tab === 'youtube-alerts') return renderYouTubeAlertsTab();
  if (tab === 'customcmds') return renderCustomCommandsTab();
  if (tab === 'leveling') return renderLevelingTab();
  if (tab === 'giveaways') return renderGiveawaysTab();
  if (tab === 'polls') return renderPollsTab();
  if (tab === 'reminders') return renderRemindersTab();
  if (tab === 'events' || tab === 'events-giveaways' || tab === 'events-polls' || tab === 'events-reminders') return renderEventsTab(tab);
  if (tab === 'embeds') return renderEmbedsTab();
  if (tab === 'welcome') return renderWelcomeTab();
  if (tab === 'audit') return renderAuditLogTab();
  if (tab === 'health') return renderHealthTab();
  if (tab === 'rpg-editor') return renderRPGEditorTab();
  if (tab === 'rpg-worlds') return renderRPGWorldsTab();
  if (tab === 'rpg-entities') return renderRPGEntitiesTab();
  if (tab === 'rpg-systems') return renderRPGSystemsTab();
  if (tab === 'rpg-ai') return renderRPGAITab();
  if (tab === 'rpg-flags') return renderRPGFlagsTab();
  if (tab === 'rpg-simulators') return renderRPGSimulatorsTab();
  if (tab === 'rpg-guild') return renderRPGGuildTab();
  if (tab === 'rpg-guild-stats') return renderRPGGuildStatsTab();
  if (tab === 'rpg-admin') return renderRPGAdminTab();
  if (tab === 'pets') return renderPetsTab(userTier);
  if (tab === 'pet-approvals') return renderPetApprovalsTab(userTier);
  if (tab === 'pet-giveaways') return renderPetGiveawaysTab(userTier);
  if (tab === 'pet-stats') return renderPetStatsTab(userTier);
  if (tab === 'idleon-admin') return renderIdleonMainTab();
  if (tab === 'idleon-stats') return renderIdleonStatsTab(userTier);
  if (tab === 'export') return renderToolsExportTab();
  if (tab === 'backups') return renderToolsBackupsTab();
  if (tab === 'accounts') return renderAccountsTab();
  if (tab === 'moderation') return renderModerationTab();
  if (tab === 'tickets') return renderTicketsTab();
  if (tab === 'reaction-roles') return renderReactionRolesTab();
  if (tab === 'scheduled-msgs') return renderRemindersTab();
  if (tab === 'automod') return renderAutomodTab();
  if (tab === 'starboard') return renderStarboardTab();
  if (tab === 'dash-audit') return renderModerationTab();
  if (tab === 'bot-status') return renderHealthTab();
  if (tab === 'smartbot') return renderSmartBotConfigTab(smartBot);
  if (tab === 'smartbot-config') return renderSmartBotConfigTab(smartBot);
  if (tab === 'smartbot-knowledge') return renderSmartBotKnowledgeTab(smartBot);
  if (tab === 'smartbot-news') return renderSmartBotNewsTab(smartBot);
  if (tab === 'smartbot-stats') return renderSmartBotStatsTab(smartBot);
  if (tab === 'smartbot-ai') return renderSmartBotAITab(smartBot);
  if (tab === 'smartbot-learning') return renderSmartBotLearningTab(smartBot);
  if (tab === 'features-safety') return renderFeaturesSafetyTab(userTier);
  if (tab === 'features-engagement') return renderFeaturesEngagementTab(userTier);
  if (tab === 'features-server') return renderFeaturesServerTab(userTier);
  if (tab === 'features-integrations') return renderFeaturesIntegrationsTab(userTier);
  if (tab === 'features-monitoring') return renderFeaturesMonitoringTab(userTier);
  if (tab === 'features-dashboard') return renderFeaturesDashboardTab(userTier);

  return `<div class="card"><h2>Unknown Tab</h2></div>`;
}

// ====================== MODERATION TAB ======================
export function renderModerationTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const modData = loadJSON(MODERATION_PATH, { warnings: [], cases: [], caseComments: {} });
  const auditData = loadJSON(DASH_AUDIT_PATH, { entries: [] });
  const cases = (modData.cases || []).slice(-100).reverse();
  const warnings = (modData.warnings || []).slice(-100).reverse();
  const caseComments = modData.caseComments || {};
  const auditEntries = (auditData.entries || []).slice(0, 100);

  // Stats
  const totalCases = cases.length;
  const totalWarnings = warnings.length;
  const bans = cases.filter(c => c.type === 'ban').length;
  const kicks = cases.filter(c => c.type === 'kick').length;
  const timeouts = cases.filter(c => c.type === 'timeout').length;
  const uniqueMods = [...new Set([...cases.map(c=>c.moderator),...warnings.map(w=>w.warnedBy)].filter(Boolean))];

  // Audit stats
  const auditUsers = [...new Set(auditEntries.map(e => e.user).filter(Boolean))];
  const actionCounts = {};
  auditEntries.forEach(e => { const a = e.action || 'unknown'; actionCounts[a] = (actionCounts[a] || 0) + 1; });
  const topActions = Object.entries(actionCounts).sort((a, b) => b[1] - a[1]).slice(0, 6);

  // Group audit by date
  const byDate = {};
  auditEntries.forEach(e => {
    const date = new Date(e.ts).toLocaleDateString();
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(e);
  });
  let auditHtml = '';
  if (auditEntries.length === 0) {
    auditHtml = '<div style="color:#8b8fa3;padding:12px">No dashboard activity recorded yet.</div>';
  } else {
    for (const [date, items] of Object.entries(byDate)) {
      auditHtml += '<div style="padding:4px 0;color:#8b8fa3;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #2a2f3a;margin:12px 0 6px">' + date + '</div>';
      items.forEach(e => {
        const time = new Date(e.ts).toLocaleTimeString();
        const actionColor = (e.action||'').includes('delete') ? '#e74c3c' : (e.action||'').includes('create') ? '#2ecc71' : (e.action||'').includes('update') ? '#f39c12' : '#3498db';
        auditHtml += '<div style="padding:5px 8px;margin-bottom:3px;background:#1e1f22;border-radius:4px;border-left:3px solid ' + actionColor + ';font-size:12px"><span style="color:#8b8fa3;font-size:11px">' + time + '</span> <span style="color:#9146ff;font-weight:600">' + (e.user||'Unknown') + '</span> <span style="color:' + actionColor + ';font-weight:500">' + (e.action||'action') + '</span>' + (e.details ? ' <span style="color:#8b8fa3">\u2014 ' + String(e.details).slice(0,80) + '</span>' : '') + '</div>';
      });
    }
  }

  // Build cases table
  let casesHtml = '';
  if (cases.length === 0) {
    casesHtml = '<div style="color:#8b8fa3;padding:12px;text-align:center">No moderation cases yet.</div>';
  } else {
    casesHtml = '<div style="max-height:400px;overflow-y:auto"><table style="width:100%;font-size:12px"><thead style="position:sticky;top:0;background:#1a1a2e;z-index:1"><tr><th style="padding:6px 8px;text-align:left">#</th><th style="padding:6px 8px;text-align:left">Type</th><th style="padding:6px 8px;text-align:left">User</th><th style="padding:6px 8px;text-align:left">Moderator</th><th style="padding:6px 8px;text-align:left">Reason</th><th style="padding:6px 8px;text-align:left">Date</th><th style="padding:6px 8px;text-align:left">💬</th></tr></thead><tbody>';
    cases.forEach((c, idx) => {
      const d = c.timestamp ? new Date(c.timestamp).toLocaleString() : 'N/A';
      const typeColor = c.type === 'ban' ? '#e74c3c' : c.type === 'kick' ? '#e67e22' : c.type === 'timeout' ? '#f39c12' : '#3498db';
      const caseId = c.id || c.timestamp || idx;
      const commentCount = (caseComments[caseId] || []).length;
      casesHtml += '<tr style="cursor:pointer;border-bottom:1px solid #1f1f23" onclick="openCaseDiscussion(\'' + String(caseId).replace(/'/g,"\\'") + '\',\'' + ((c.type||'action').toUpperCase()) + '\',\'' + (c.userName||c.userId||'?').replace(/'/g,"\\'") + '\')"><td style="padding:5px 8px;color:#8b8fa3;font-size:11px">' + (totalCases - idx) + '</td><td style="padding:5px 8px"><span style="color:' + typeColor + ';font-weight:600;font-size:11px">' + (c.type||'action').toUpperCase() + '</span></td><td style="padding:5px 8px">' + (c.userName||c.userId||'?') + '</td><td style="padding:5px 8px;color:#8b8fa3">' + (c.moderator||'?') + '</td><td style="padding:5px 8px;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;color:#8b8fa3;font-size:12px">' + (c.reason||'-') + '</td><td style="padding:5px 8px;font-size:11px;color:#8b8fa3">' + d + '</td><td style="padding:5px 8px;text-align:center">' + (commentCount > 0 ? '<span style="background:#9146ff;color:#fff;padding:1px 6px;border-radius:10px;font-size:10px">' + commentCount + '</span>' : '<span style="color:#3a3a4a">0</span>') + '</td></tr>';
    });
    casesHtml += '</tbody></table></div>';
  }

  // Warnings table
  let warnsHtml = '';
  if (warnings.length === 0) {
    warnsHtml = '<div style="color:#8b8fa3;padding:12px;text-align:center">No warnings.</div>';
  } else {
    warnsHtml = '<div style="max-height:300px;overflow-y:auto"><table style="width:100%;font-size:12px"><thead style="position:sticky;top:0;background:#1a1a2e;z-index:1"><tr><th style="padding:6px 8px;text-align:left">User</th><th style="padding:6px 8px;text-align:left">Warned By</th><th style="padding:6px 8px;text-align:left">Reason</th><th style="padding:6px 8px;text-align:left">Date</th></tr></thead><tbody>';
    warnings.forEach(w => {
      const d = w.timestamp ? new Date(w.timestamp).toLocaleString() : 'N/A';
      warnsHtml += '<tr style="border-bottom:1px solid #1f1f23"><td style="padding:5px 8px">' + (w.userName||w.userId||'?') + '</td><td style="padding:5px 8px;color:#8b8fa3">' + (w.warnedBy||'?') + '</td><td style="padding:5px 8px;color:#8b8fa3;font-size:12px">' + (w.reason||'-') + '</td><td style="padding:5px 8px;font-size:11px;color:#8b8fa3">' + d + '</td></tr>';
    });
    warnsHtml += '</tbody></table></div>';
  }

  return `<div class="card" style="padding:16px">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
  <div><h2 style="margin:0;font-size:20px">⚖️ Moderation & Audit</h2><p style="color:#8b8fa3;margin:4px 0 0;font-size:12px">Moderation cases, warnings, case discussions & dashboard activity log</p></div>
</div>

<!-- Stats Row -->
<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px">
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#9146ff">${totalCases}</div><div style="font-size:10px;color:#8b8fa3">Cases</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#f39c12">${totalWarnings}</div><div style="font-size:10px;color:#8b8fa3">Warnings</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#e74c3c">${bans}</div><div style="font-size:10px;color:#8b8fa3">Bans</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#e67e22">${kicks}</div><div style="font-size:10px;color:#8b8fa3">Kicks</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#f39c12">${timeouts}</div><div style="font-size:10px;color:#8b8fa3">Timeouts</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#2ecc71">${uniqueMods.length}</div><div style="font-size:10px;color:#8b8fa3">Moderators</div></div>
</div>

<!-- Sub-tab navigation -->
<div style="display:flex;gap:0;border-bottom:2px solid #2a2d35;margin-bottom:14px">
  <button onclick="document.querySelectorAll('.mod-subtab').forEach(s=>s.style.display='none');document.getElementById('modSubCases').style.display='block';this.parentElement.querySelectorAll('button').forEach(b=>{b.style.borderBottom='2px solid transparent';b.style.color='#8b8fa3'});this.style.borderBottom='2px solid #9146ff';this.style.color='#fff'" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid #9146ff;color:#fff;cursor:pointer;font-size:13px;font-weight:600">📋 Cases & Warnings</button>
  <button onclick="document.querySelectorAll('.mod-subtab').forEach(s=>s.style.display='none');document.getElementById('modSubDiscuss').style.display='block';this.parentElement.querySelectorAll('button').forEach(b=>{b.style.borderBottom='2px solid transparent';b.style.color='#8b8fa3'});this.style.borderBottom='2px solid #9146ff';this.style.color='#fff'" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#8b8fa3;cursor:pointer;font-size:13px;font-weight:600">💬 Case Discussion</button>
  <button onclick="document.querySelectorAll('.mod-subtab').forEach(s=>s.style.display='none');document.getElementById('modSubAudit').style.display='block';this.parentElement.querySelectorAll('button').forEach(b=>{b.style.borderBottom='2px solid transparent';b.style.color='#8b8fa3'});this.style.borderBottom='2px solid #9146ff';this.style.color='#fff'" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#8b8fa3;cursor:pointer;font-size:13px;font-weight:600">📝 Dashboard Audit</button>
</div>

<!-- Sub-tab: Cases & Warnings -->
<div id="modSubCases" class="mod-subtab" style="display:block">
  <div style="margin-bottom:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <h3 style="margin:0;font-size:15px">📋 Recent Cases (${totalCases})</h3>
      <span style="font-size:11px;color:#8b8fa3">Click a case to open discussion</span>
    </div>
    ${casesHtml}
  </div>
  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <h3 style="margin:0;font-size:15px">⚠️ Warnings (${totalWarnings})</h3>
      <button onclick="if(confirm('Clear ALL warnings?'))fetch('/api/moderation/clear-warnings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).then(()=>location.reload())" style="padding:6px 14px;background:#e74c3c;color:#fff;border:none;border-radius:5px;font-size:12px;cursor:pointer;white-space:nowrap;width:auto">Clear All</button>
    </div>
    ${warnsHtml}
  </div>
</div>

<!-- Sub-tab: Case Discussion -->
<div id="modSubDiscuss" class="mod-subtab" style="display:none">
  <div style="text-align:center;padding:30px;color:#8b8fa3">
    <div style="font-size:36px;margin-bottom:10px">💬</div>
    <div style="font-size:14px;margin-bottom:6px">Select a case from the <strong style="color:#fff">Cases & Warnings</strong> tab to start a discussion</div>
    <div style="font-size:12px">Case discussions allow moderators to collaborate and add notes per case</div>
  </div>
  <div id="caseDiscussionPanel" style="display:none">
    <div id="caseDiscussionHeader" style="padding:10px 12px;background:#2b2d31;border-radius:6px;margin-bottom:10px"></div>
    <div id="caseDiscussionMessages" style="max-height:350px;overflow-y:auto;padding:8px;background:#1e1f22;border-radius:6px;margin-bottom:10px"></div>
    <div style="display:flex;gap:8px">
      <input type="text" id="caseCommentInput" placeholder="Add a note or comment..." style="flex:1;padding:8px 12px;background:#2b2d31;border:1px solid #3a3d45;border-radius:6px;color:#fff;font-size:13px" onkeydown="if(event.key==='Enter')addCaseComment()">
      <button onclick="addCaseComment()" style="padding:8px 16px;background:#9146ff;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">Send</button>
    </div>
  </div>
</div>

<!-- Sub-tab: Dashboard Audit -->
<div id="modSubAudit" class="mod-subtab" style="display:none">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
    <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#9146ff">${auditEntries.length}</div><div style="font-size:10px;color:#8b8fa3">Total Actions</div></div>
    <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#2ecc71">${auditUsers.length}</div><div style="font-size:10px;color:#8b8fa3">Active Accounts</div></div>
    <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#f39c12">${Object.keys(byDate).length}</div><div style="font-size:10px;color:#8b8fa3">Active Days</div></div>
  </div>
  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:10px"><input type="checkbox" onchange="document.getElementById('auditTopActions').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"><span style="font-size:13px;font-weight:600">🔝 Top Actions</span></label>
  <div id="auditTopActions" style="display:none;margin-bottom:12px;background:#2b2d31;border-radius:6px;padding:10px">${topActions.map(([a,c]) => '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1f1f23;font-size:12px"><span>' + a + '</span><span style="color:#9146ff;font-weight:600">' + c + '</span></div>').join('')}</div>

  <!-- Filters -->
  <div style="background:#2b2d31;border-radius:8px;padding:12px;margin-bottom:12px">
    <div style="font-size:13px;font-weight:700;margin-bottom:8px;color:#e0e0e0">🔍 Filters</div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:8px;align-items:end">
      <div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase;display:block;margin-bottom:3px">From Date</label><input type="date" id="auditFilterFrom" onchange="filterAuditTimeline()" style="width:100%;padding:6px 8px;font-size:12px;background:#1e1f22;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0"></div>
      <div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase;display:block;margin-bottom:3px">To Date</label><input type="date" id="auditFilterTo" onchange="filterAuditTimeline()" style="width:100%;padding:6px 8px;font-size:12px;background:#1e1f22;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0"></div>
      <div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase;display:block;margin-bottom:3px">Account</label><select id="auditFilterUser" onchange="filterAuditTimeline()" style="width:100%;padding:6px 8px;font-size:12px;background:#1e1f22;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0"><option value="">All accounts</option>${auditUsers.map(u => '<option value="' + u + '">' + u + '</option>').join('')}</select></div>
      <div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase;display:block;margin-bottom:3px">Action</label><select id="auditFilterAction" onchange="filterAuditTimeline()" style="width:100%;padding:6px 8px;font-size:12px;background:#1e1f22;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0"><option value="">All actions</option>${Object.keys(actionCounts).sort().map(a => '<option value="' + a + '">' + a + '</option>').join('')}</select></div>
      <button onclick="document.getElementById('auditFilterFrom').value='';document.getElementById('auditFilterTo').value='';document.getElementById('auditFilterUser').value='';document.getElementById('auditFilterAction').value='';filterAuditTimeline()" style="padding:6px 12px;background:#3a3a42;color:#ccc;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:11px;width:auto;white-space:nowrap">Clear</button>
    </div>
  </div>

  <h3 style="font-size:14px;margin:0 0 8px">📜 Activity Timeline <span id="auditFilterCount" style="font-size:11px;color:#8b8fa3;font-weight:400"></span></h3>
  <div id="auditTimelineContainer" style="max-height:400px;overflow-y:auto">${auditHtml}</div>
</div>
</div>

<script type="application/json" id="auditEntriesData">${safeJsonForHtml(auditEntries)}</script>

<!-- Case Discussion Script -->
<script>
var _auditAllEntries = JSON.parse(document.getElementById('auditEntriesData')?.textContent || '[]');
function filterAuditTimeline() {
  var fromVal = document.getElementById('auditFilterFrom').value;
  var toVal = document.getElementById('auditFilterTo').value;
  var userVal = document.getElementById('auditFilterUser').value;
  var actionVal = document.getElementById('auditFilterAction').value;
  var fromTs = fromVal ? new Date(fromVal).getTime() : 0;
  var toTs = toVal ? new Date(toVal + 'T23:59:59').getTime() : Infinity;
  var filtered = _auditAllEntries.filter(function(e) {
    if (e.ts < fromTs || e.ts > toTs) return false;
    if (userVal && e.user !== userVal) return false;
    if (actionVal && e.action !== actionVal) return false;
    return true;
  });
  var byDate = {};
  filtered.forEach(function(e) {
    var date = new Date(e.ts).toLocaleDateString();
    if (!byDate[date]) byDate[date] = [];
    byDate[date].push(e);
  });
  var html = '';
  if (filtered.length === 0) {
    html = '<div style="color:#8b8fa3;padding:12px;text-align:center">No matching entries.</div>';
  } else {
    for (var date in byDate) {
      html += '<div style="padding:4px 0;color:#8b8fa3;font-size:11px;text-transform:uppercase;letter-spacing:0.5px;border-bottom:1px solid #2a2f3a;margin:12px 0 6px">' + date + '</div>';
      byDate[date].forEach(function(e) {
        var time = new Date(e.ts).toLocaleTimeString();
        var actionColor = (e.action||'').indexOf('delete') >= 0 ? '#e74c3c' : (e.action||'').indexOf('create') >= 0 ? '#2ecc71' : (e.action||'').indexOf('update') >= 0 ? '#f39c12' : '#3498db';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;margin-bottom:3px;background:#1e1f22;border-radius:4px;border-left:3px solid ' + actionColor + ';font-size:12px"><div><span style="color:#8b8fa3;font-size:11px">' + time + '</span> <span style="color:#9146ff;font-weight:600">' + (e.user||'Unknown') + '</span> <span style="color:' + actionColor + ';font-weight:500">' + (e.action||'action') + '</span>' + (e.details ? ' <span style="color:#8b8fa3">\\u2014 ' + String(e.details).slice(0,80) + '</span>' : '') + '</div><button onclick="revertAuditEntry(\\''+String(e.ts).replace(/'/g,"\\\\'")+'\\',\\''+(e.action||'').replace(/'/g,"\\\\'")+'\\',\\''+(e.user||'').replace(/'/g,"\\\\'")+'\\',\\''+(String(e.details||'').slice(0,60)).replace(/'/g,"\\\\'")+'\\'" style="padding:2px 8px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:4px;cursor:pointer;font-size:10px;width:auto;white-space:nowrap" title="Request revert">↩ Revert</button></div>';
      });
    }
  }
  document.getElementById('auditTimelineContainer').innerHTML = html;
  document.getElementById('auditFilterCount').textContent = '(' + filtered.length + ' of ' + _auditAllEntries.length + ')';
}

function revertAuditEntry(ts, action, user, details) {
  if (!confirm('Request to revert action: "' + action + '" by ' + user + '?\\n\\nDetails: ' + details + '\\n\\nThis will log a revert request. Proceed?')) return;
  fetch('/api/dashboard-audit/revert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ts: Number(ts), action: action, user: user })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) { alert('Revert request logged successfully.'); location.reload(); }
    else { alert('Error: ' + (d.error || 'Unknown')); }
  }).catch(function(e) { alert('Error: ' + e.message); });
}

let _currentCaseId = null;
function openCaseDiscussion(caseId, caseType, userName) {
  // Switch to discussion sub-tab
  document.querySelectorAll('.mod-subtab').forEach(s=>s.style.display='none');
  document.getElementById('modSubDiscuss').style.display='block';

  _currentCaseId = caseId;
  document.querySelector('#modSubDiscuss > div:first-child').style.display = 'none';
  document.getElementById('caseDiscussionPanel').style.display = 'block';
  document.getElementById('caseDiscussionHeader').innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between"><div><span style="font-weight:700;font-size:15px">Case: ' + caseType + '</span> <span style="color:#8b8fa3">\u2014 ' + userName + '</span></div><span style="font-size:11px;color:#8b8fa3">ID: ' + caseId + '</span></div>';
  loadCaseComments(caseId);

  // Update sub-tab button styles
  const allBtns = document.querySelectorAll('div[style*="border-bottom:2px"] button');
  allBtns.forEach(b => { b.style.borderBottom = '2px solid transparent'; b.style.color = '#8b8fa3'; });
  if (allBtns[1]) { allBtns[1].style.borderBottom = '2px solid #9146ff'; allBtns[1].style.color = '#fff'; }
}

function loadCaseComments(caseId) {
  fetch('/api/moderation/case/comments?caseId=' + encodeURIComponent(caseId))
    .then(r => r.json())
    .then(data => {
      const container = document.getElementById('caseDiscussionMessages');
      if (!data.comments || data.comments.length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#8b8fa3;font-size:13px">No comments yet. Be the first to add a note.</div>';
        return;
      }
      container.innerHTML = data.comments.map(c => {
        const time = new Date(c.ts).toLocaleString();
        return '<div style="padding:8px 10px;margin-bottom:6px;background:#2b2d31;border-radius:6px"><div style="display:flex;justify-content:space-between;margin-bottom:3px"><span style="color:#9146ff;font-weight:600;font-size:12px">' + (c.user||'Unknown') + '</span><span style="color:#8b8fa3;font-size:10px">' + time + '</span></div><div style="font-size:13px;color:#e0e0e0">' + (c.text||'') + '</div></div>';
      }).join('');
      container.scrollTop = container.scrollHeight;
    }).catch(() => {});
}

function addCaseComment() {
  const input = document.getElementById('caseCommentInput');
  const text = input.value.trim();
  if (!text || !_currentCaseId) return;
  input.value = '';
  fetch('/api/moderation/case/comment', {
    method: 'POST',
    headers: {'Content-Type':'application/json'},
    body: JSON.stringify({ caseId: _currentCaseId, text: text })
  }).then(r => r.json()).then(() => {
    loadCaseComments(_currentCaseId);
  }).catch(() => {});
}
</script>`;
}


// ====================== SUPPORT & FEEDBACK TAB (TICKETS + SUGGESTIONS) ======================
export function renderTicketsTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const tickData = loadJSON(TICKETS_PATH, { tickets: [], settings: {} });
  const tickets = (tickData.tickets || []).slice(-100).reverse();
  const settings = tickData.settings || {};
  const sgs = (typeof suggestions !== 'undefined' ? suggestions : []);
  const cooldownMinutes = dashboardSettings.suggestionCooldownMinutes || 60;

  // AI Priority keywords for auto-classification
  const criticalWords = ['harassment','abuse','threat','hate','racist','sexist','violence','doxx','nsfw','illegal','scam','hack','exploit','ddos','raid'];
  const highWords = ['bug','broken','error','crash','urgent','blocked','offensive','toxic','spam','cheat','inappropriate'];
  const medWords = ['issue','problem','fix','improve','change','update','wrong','missing','slow','confusing'];

  function classifyPriority(text) {
    const lower = (text||'').toLowerCase();
    if (criticalWords.some(w => lower.includes(w))) return 'Critical';
    if (highWords.some(w => lower.includes(w))) return 'High';
    if (medWords.some(w => lower.includes(w))) return 'Medium';
    return 'Low';
  }

  // Combined items: merge tickets & suggestions into a unified feed  
  const allItems = [];
  tickets.forEach(t => {
    allItems.push({ type:'ticket', id:t.id, user:t.userName||t.userId||'?', text:t.reason||t.topic||'Support ticket', status:t.status==='open'?'Open':'Closed', priority: classifyPriority(t.reason||t.topic||''), ts:t.openedAt||t.timestamp||0, raw:t });
  });
  sgs.forEach((s,idx) => {
    const autoPriority = s.priority || classifyPriority(s.suggestion||'');
    allItems.push({ type:'suggestion', id:idx, user:s.user||'?', text:s.suggestion||'', status:s.status||'Pending', priority:autoPriority, ts:s.timestamp||0, notes:s.notes, contacts:s.contacts, raw:s });
  });

  // Stats
  const totalTickets = tickets.length;
  const openTickets = tickets.filter(t => t.status==='open').length;
  const totalSuggestions = sgs.length;
  const pendingSuggestions = sgs.filter(s => !s.status || s.status==='Pending').length;
  const criticalCount = allItems.filter(i => i.priority === 'Critical').length;
  const highCount = allItems.filter(i => i.priority === 'High').length;

  const priorityColors = { Critical:'#ed4245', High:'#e67e22', Medium:'#faa61a', Low:'#3ba55c' };
  const statusColors = { Open:'#2ecc71', Closed:'#e74c3c', Pending:'#5b5bff', 'In Progress':'#faa61a', Completed:'#3ba55c', Rejected:'#ed4245' };
  const typeIcons = { ticket:'🎫', suggestion:'💡' };

  // Build unified items HTML  
  let itemsHtml = '';
  if (allItems.length === 0) {
    itemsHtml = '<div style="text-align:center;padding:40px;color:#8b8fa3"><div style="font-size:36px;margin-bottom:8px">📭</div><div>No tickets or suggestions yet</div></div>';
  } else {
    allItems.forEach((item, i) => {
      const pColor = priorityColors[item.priority] || '#3ba55c';
      const sColor = statusColors[item.status] || '#5b5bff';
      const timeStr = item.ts ? new Date(item.ts).toLocaleString() : 'N/A';
      itemsHtml += '<div class="sf-item" data-type="' + item.type + '" data-priority="' + item.priority + '" data-status="' + item.status + '" data-ts="' + item.ts + '" style="background:#1e1f22;border-radius:8px;margin-bottom:8px;overflow:hidden;border:1px solid #2a2f3a">';
      itemsHtml += '<div style="height:3px;background:' + pColor + '"></div>';
      itemsHtml += '<div style="padding:12px 14px">';
      // Top row: type badge, user, priority, status, time
      itemsHtml += '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;margin-bottom:6px">';
      itemsHtml += '<span style="font-size:11px;padding:2px 8px;border-radius:10px;background:' + (item.type==='ticket'?'#9146ff22':'#5b5bff22') + ';color:' + (item.type==='ticket'?'#9146ff':'#5b5bff') + ';font-weight:700;text-transform:uppercase">' + typeIcons[item.type] + ' ' + item.type + '</span>';
      itemsHtml += '<span style="font-weight:600;color:#fff;font-size:13px">' + item.user + '</span>';
      itemsHtml += '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:' + pColor + '22;color:' + pColor + ';font-weight:700">' + item.priority + '</span>';
      itemsHtml += '<span style="font-size:10px;padding:2px 7px;border-radius:10px;background:' + sColor + '22;color:' + sColor + ';font-weight:700">' + item.status + '</span>';
      itemsHtml += '<span style="color:#8b8fa3;font-size:10px;margin-left:auto">' + timeStr + '</span>';
      itemsHtml += '</div>';
      // Text
      itemsHtml += '<div style="color:#d0d0d0;font-size:13px;line-height:1.5;margin-bottom:8px;white-space:pre-wrap;word-break:break-word;max-height:80px;overflow:hidden">' + String(item.text).slice(0,300) + '</div>';
      // Notes if any
      if (item.notes) {
        itemsHtml += '<div style="padding:6px 8px;background:#26262c;border-radius:4px;margin-bottom:6px;border-left:3px solid #5b5bff;font-size:11px"><span style="color:#8b8fa3">Notes: </span><span style="color:#b0b0b0">' + String(item.notes).slice(0,150) + '</span></div>';
      }
      // Actions row
      itemsHtml += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
      if (item.type === 'ticket' && item.status === 'Open') {
        itemsHtml += '<button onclick="closeTicket(\'' + item.raw.id + '\')" style="padding:3px 10px;background:#e74c3c;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">Close</button>';
      }
      if (item.type === 'suggestion') {
        itemsHtml += '<select onchange="sgSetPriority(' + item.id + ',this.value)" style="padding:3px 8px;background:#2b2d31;color:#fff;border:1px solid #3a3d45;border-radius:4px;font-size:11px;cursor:pointer">';
        ['Low','Medium','High','Critical'].forEach(function(p) { itemsHtml += '<option value="' + p + '"' + (item.priority===p?' selected':'') + '>' + p + '</option>'; });
        itemsHtml += '</select>';
        itemsHtml += '<select onchange="sgSetStatus(' + item.id + ',this.value)" style="padding:3px 8px;background:#2b2d31;color:#fff;border:1px solid #3a3d45;border-radius:4px;font-size:11px;cursor:pointer">';
        ['Pending','In Progress','Completed','Rejected'].forEach(function(st) { itemsHtml += '<option value="' + st + '"' + (item.status===st?' selected':'') + '>' + st + '</option>'; });
        itemsHtml += '</select>';
        itemsHtml += '<button onclick="sgOpenNotes(' + item.id + ')" style="padding:3px 8px;background:#3a3d45;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">📝</button>';
        itemsHtml += '<button onclick="sgOpenContact(' + item.id + ')" style="padding:3px 8px;background:#5b5bff;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">📬</button>';
        itemsHtml += '<button onclick="sgDelete(' + item.id + ')" style="padding:3px 8px;background:#e74c3c;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;margin-left:auto">🗑️</button>';
      }
      itemsHtml += '</div></div></div>';
    });
  }

  return `<div class="card" style="padding:16px">
<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:14px">
  <div><h2 style="margin:0;font-size:20px">🎫 Support & Feedback</h2><p style="color:#8b8fa3;margin:4px 0 0;font-size:12px">Unified tickets + suggestions with AI priority classification</p></div>
</div>

<!-- Stats Row -->
<div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px">
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#9146ff">${totalTickets}</div><div style="font-size:10px;color:#8b8fa3">Tickets</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#2ecc71">${openTickets}</div><div style="font-size:10px;color:#8b8fa3">Open</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#5b5bff">${totalSuggestions}</div><div style="font-size:10px;color:#8b8fa3">Suggestions</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#faa61a">${pendingSuggestions}</div><div style="font-size:10px;color:#8b8fa3">Pending</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#ed4245">${criticalCount}</div><div style="font-size:10px;color:#8b8fa3">Critical</div></div>
  <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#e67e22">${highCount}</div><div style="font-size:10px;color:#8b8fa3">High</div></div>
</div>

<!-- Toolbar -->
<div style="display:flex;gap:6px;align-items:center;margin-bottom:12px;flex-wrap:nowrap;overflow-x:auto">
  <input type="text" id="sfSearch" placeholder="Search..." oninput="sfFilter()" style="min-width:120px;max-width:200px;padding:6px 10px;background:#1e1f22;color:#fff;border:1px solid #3a3d45;border-radius:6px;font-size:11px">
  <select id="sfTypeFilter" onchange="sfFilter()" style="padding:6px 8px;background:#1e1f22;color:#fff;border:1px solid #3a3d45;border-radius:6px;font-size:11px;min-width:90px">
    <option value="">All Types</option><option value="ticket">🎫 Tickets</option><option value="suggestion">💡 Suggestions</option>
  </select>
  <select id="sfPriorityFilter" onchange="sfFilter()" style="padding:6px 8px;background:#1e1f22;color:#fff;border:1px solid #3a3d45;border-radius:6px;font-size:11px;min-width:90px">
    <option value="">All Priority</option><option value="Critical">🔴 Critical</option><option value="High">🟠 High</option><option value="Medium">🟡 Medium</option><option value="Low">🟢 Low</option>
  </select>
  <select id="sfStatusFilter" onchange="sfFilter()" style="padding:6px 8px;background:#1e1f22;color:#fff;border:1px solid #3a3d45;border-radius:6px;font-size:11px;min-width:90px">
    <option value="">All Status</option><option value="Open">Open</option><option value="Pending">Pending</option><option value="In Progress">In Progress</option><option value="Completed">Completed</option><option value="Rejected">Rejected</option><option value="Closed">Closed</option>
  </select>
  <select id="sfSort" onchange="sfFilter()" style="padding:6px 8px;background:#1e1f22;color:#fff;border:1px solid #3a3d45;border-radius:6px;font-size:11px;min-width:90px">
    <option value="priority">By Priority</option><option value="newest">Newest</option><option value="oldest">Oldest</option>
  </select>
</div>

<!-- AI Classification info -->
<div style="padding:8px 12px;background:linear-gradient(135deg,#1a1a2e,#16213e);border:1px solid #2a2f4a;border-radius:6px;margin-bottom:12px;display:flex;align-items:center;gap:8px">
  <span style="font-size:14px">🤖</span>
  <span style="font-size:11px;color:#8b8fa3">AI auto-classifies priority: <span style="color:#ed4245">harassment/threats = Critical</span>, <span style="color:#e67e22">bugs/issues = High</span>, <span style="color:#faa61a">improvements = Medium</span>, <span style="color:#3ba55c">suggestions = Low</span></span>
</div>

<!-- Ticket Panel Sender -->
<label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:6px"><input type="checkbox" onchange="document.getElementById('sfTicketPanel').style.display=this.checked?'flex':'none'" style="accent-color:#9146ff"><span style="font-size:11px;font-weight:600">🎫 Send Ticket Panel</span></label>
<div id="sfTicketPanel" style="display:none;gap:6px;align-items:center;margin-bottom:8px;padding:6px 8px;background:#1e1f22;border-radius:4px;max-width:360px">
  <input id="ticketPanelChannel" placeholder="Channel ID" style="margin:0;padding:4px 8px;font-size:11px;flex:1;min-width:120px">
  <button onclick="sendTicketPanel()" style="padding:4px 10px;background:#9146ff;color:#fff;border:none;border-radius:3px;font-size:10px;cursor:pointer;font-weight:600;white-space:nowrap">📨 Send</button>
</div>

<!-- Suggestion Cooldown -->
<label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:8px"><input type="checkbox" onchange="document.getElementById('sfCooldown').style.display=this.checked?'flex':'none'" style="accent-color:#9146ff"><span style="font-size:12px;font-weight:600">⏱️ Suggestion Cooldown</span></label>
<div id="sfCooldown" style="display:none;gap:8px;align-items:center;margin-bottom:12px;padding:10px;background:#1e1f22;border-radius:6px">
  <input type="number" id="suggestionCooldown" value="${cooldownMinutes}" min="0" max="1440" style="width:80px;padding:6px;background:#2b2d31;color:#fff;border:1px solid #3a3d45;border-radius:4px;font-size:12px">
  <span style="font-size:11px;color:#8b8fa3">minutes</span>
  <button onclick="saveSuggestionCooldown()" style="padding:5px 12px;background:#5b5bff;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600">Save</button>
  <button onclick="exportSuggestions()" style="padding:5px 12px;background:#3a3d45;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;margin-left:auto">⬇️ Export CSV</button>
</div>

<!-- Items List -->
<div id="sfContainer" style="max-height:600px;overflow-y:auto">
  ${itemsHtml}
</div>
</div>

<!-- Contact Modal -->
<div id="sgContactModal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2000;justify-content:center;align-items:center" onclick="if(event.target===this)this.style.display='none'">
  <div style="background:#23232b;border-radius:10px;padding:20px;max-width:440px;width:90%;border:2px solid #5b5bff">
    <h3 style="margin:0 0 12px;color:#fff;font-size:15px">📬 Contact User</h3>
    <input type="hidden" id="sgContactId">
    <div id="sgContactInfo" style="padding:8px;background:#1e1f22;border-radius:4px;margin-bottom:10px;color:#8b8fa3;font-size:12px"></div>
    <div style="display:flex;gap:8px;margin-bottom:10px">
      <label style="display:flex;align-items:center;gap:4px;padding:6px 12px;background:#2b2d31;border-radius:4px;font-size:12px;cursor:pointer"><input type="radio" name="sgContactMethod" value="dm" checked> DM</label>
      <label style="display:flex;align-items:center;gap:4px;padding:6px 12px;background:#2b2d31;border-radius:4px;font-size:12px;cursor:pointer"><input type="radio" name="sgContactMethod" value="ping"> Ping</label>
    </div>
    <textarea id="sgContactMessage" placeholder="Your message..." style="width:100%;min-height:80px;padding:8px;background:#1e1f22;color:#fff;border:1px solid #3a3d45;border-radius:4px;font-size:13px;resize:vertical;margin-bottom:10px"></textarea>
    <div style="display:flex;gap:8px">
      <button onclick="sgSendContact()" style="flex:1;padding:8px;background:#5b5bff;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer">Send</button>
      <button onclick="document.getElementById('sgContactModal').style.display='none'" style="flex:1;padding:8px;background:#3a3d45;color:#fff;border:none;border-radius:4px;cursor:pointer">Cancel</button>
    </div>
  </div>
</div>

<!-- Notes Modal -->
<div id="sgNotesModal" style="display:none;position:fixed;top:0;left:0;width:100vw;height:100vh;background:rgba(0,0,0,0.7);z-index:2000;justify-content:center;align-items:center" onclick="if(event.target===this)this.style.display='none'">
  <div style="background:#23232b;border-radius:10px;padding:20px;max-width:440px;width:90%;border:2px solid #5b5bff">
    <h3 style="margin:0 0 12px;color:#fff;font-size:15px">📝 Admin Notes</h3>
    <input type="hidden" id="sgNotesId">
    <textarea id="sgNotesText" placeholder="Internal notes..." style="width:100%;min-height:100px;padding:8px;background:#1e1f22;color:#fff;border:1px solid #3a3d45;border-radius:4px;font-size:13px;resize:vertical;margin-bottom:10px"></textarea>
    <div style="display:flex;gap:8px">
      <button onclick="sgSaveNotes()" style="flex:1;padding:8px;background:#5b5bff;color:#fff;border:none;border-radius:4px;font-weight:600;cursor:pointer">Save</button>
      <button onclick="document.getElementById('sgNotesModal').style.display='none'" style="flex:1;padding:8px;background:#3a3d45;color:#fff;border:none;border-radius:4px;cursor:pointer">Cancel</button>
    </div>
  </div>
</div>

<script>
const sfPriorityOrder = { Critical:0, High:1, Medium:2, Low:3 };
function sfFilter() {
  const search = (document.getElementById('sfSearch').value||'').toLowerCase();
  const typeF = document.getElementById('sfTypeFilter').value;
  const prioF = document.getElementById('sfPriorityFilter').value;
  const statusF = document.getElementById('sfStatusFilter').value;
  const sort = document.getElementById('sfSort').value;
  const container = document.getElementById('sfContainer');
  if (!container) return;
  const items = Array.from(container.querySelectorAll('.sf-item'));
  items.forEach(item => {
    let show = true;
    if (search && !item.textContent.toLowerCase().includes(search)) show = false;
    if (typeF && item.dataset.type !== typeF) show = false;
    if (prioF && item.dataset.priority !== prioF) show = false;
    if (statusF && item.dataset.status !== statusF) show = false;
    item.style.display = show ? '' : 'none';
  });
  const visible = items.filter(i => i.style.display !== 'none');
  if (sort === 'priority') visible.sort((a,b) => (sfPriorityOrder[a.dataset.priority]??3) - (sfPriorityOrder[b.dataset.priority]??3));
  else if (sort === 'newest') visible.sort((a,b) => Number(b.dataset.ts) - Number(a.dataset.ts));
  else if (sort === 'oldest') visible.sort((a,b) => Number(a.dataset.ts) - Number(b.dataset.ts));
  visible.forEach(item => container.appendChild(item));
}
// Initial sort by priority
setTimeout(function(){ document.getElementById('sfSort').value='priority'; sfFilter(); }, 100);

function sendTicketPanel(){var ch=document.getElementById('ticketPanelChannel').value.trim();if(!ch){alert('Enter a channel ID');return;}fetch('/api/tickets/send-panel',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channelId:ch})}).then(r=>r.json()).then(d=>{if(d.success)alert('Panel sent!');else alert(d.error||'Error');}).catch(e=>alert(e.message));}
function closeTicket(id){if(!confirm('Close this ticket?'))return;fetch('/api/tickets/close',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({ticketId:id})}).then(r=>r.json()).then(d=>{if(d.success)location.reload();else alert(d.error||'Error');}).catch(e=>alert(e.message));}

function sgSetPriority(idx, priority) {
  fetch('/suggestions/priority', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:idx,priority})}).then(r=>r.json()).then(d=>{if(d.success&&typeof showToast==='function')showToast('Priority updated','success');});
}
function sgSetStatus(idx, status) {
  fetch('/suggestions/status', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:idx,status})}).then(r=>r.json()).then(d=>{if(d.success&&typeof showToast==='function')showToast('Status updated','success');});
}
function sgDelete(idx) {
  if(!confirm('Delete this suggestion?'))return;
  fetch('/suggestions/delete', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:idx})}).then(r=>r.json()).then(d=>{if(d.success)location.reload();});
}
function sgOpenNotes(idx) {
  document.getElementById('sgNotesId').value=idx;
  document.getElementById('sgNotesText').value='';
  document.getElementById('sgNotesModal').style.display='flex';
}
function sgSaveNotes() {
  var idx=parseInt(document.getElementById('sgNotesId').value);
  var notes=document.getElementById('sgNotesText').value;
  fetch('/suggestions/notes', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:idx,notes})}).then(r=>r.json()).then(d=>{if(d.success){document.getElementById('sgNotesModal').style.display='none';location.reload();}});
}
function sgOpenContact(idx) {
  document.getElementById('sgContactId').value=idx;
  document.getElementById('sgContactMessage').value='';
  document.getElementById('sgContactInfo').textContent='Contacting suggestion #'+(idx+1);
  document.getElementById('sgContactModal').style.display='flex';
}
function sgSendContact() {
  var idx=parseInt(document.getElementById('sgContactId').value);
  var message=document.getElementById('sgContactMessage').value.trim();
  if(!message)return alert('Enter a message');
  var method=document.querySelector('input[name="sgContactMethod"]:checked')?.value||'dm';
  fetch('/suggestions/contact', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:idx,message,method})}).then(r=>r.json()).then(d=>{if(d.success){document.getElementById('sgContactModal').style.display='none';location.reload();}else{alert(d.error||'Failed');}}).catch(()=>alert('Failed'));
}
function exportSuggestions() {
  const sgs = ${JSON.stringify(sgs)};
  const csv='User,Text,Status,Priority,Date\\n'+sgs.map(s=>'"'+s.user+'","'+(s.suggestion||'').replace(/"/g,'""')+'","'+(s.status||'Pending')+'","'+(s.priority||'Low')+'",'+new Date(s.timestamp).toISOString()).join('\\n');
  const b=new Blob([csv],{type:'text/csv'});const u=URL.createObjectURL(b);const a=document.createElement('a');a.href=u;a.download='feedback-export.csv';a.click();
}
function saveSuggestionCooldown() {
  var cooldown=document.getElementById('suggestionCooldown').value;
  fetch('/suggestions/cooldown', {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({minutes:parseInt(cooldown)||0})}).then(r=>r.json()).then(d=>{if(d.success&&typeof showToast==='function')showToast('Cooldown saved!','success');});
}
</script>`;
}


// ====================== REACTION ROLES TAB ======================
export function renderReactionRolesTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const data = loadJSON(REACTION_ROLES_PATH, { panels: [] });
  const panels = data.panels || [];
  let html = panels.length === 0 ? '<div style="color:#8b8fa3;padding:12px">No reaction role panels configured.</div>' : '';
  panels.forEach((p, i) => {
    html += `<div style="padding:10px;background:#2b2d31;border-radius:6px;margin-bottom:8px;border-left:3px solid #9146ff"><div style="font-weight:600">${p.title||'Panel '+(i+1)}</div><div style="font-size:12px;color:#8b8fa3">Message: ${p.messageId||'N/A'} | Channel: ${p.channelId||'N/A'} | Roles: ${(p.roles||[]).length}</div></div>`;
  });
  return `<div class="card"><h2>🎭 Reaction Roles</h2><p style="color:#8b8fa3">Create reaction-based role assignment panels.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px"><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Title</label><input id="rrTitle" placeholder="Role Menu" style="margin:4px 0"></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Channel ID</label><input id="rrChannel" placeholder="Channel ID" style="margin:4px 0"></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Roles (emoji:roleId, ...)</label><input id="rrRoles" placeholder="🎮:123,🎵:456" style="margin:4px 0"></div></div><button class="small" onclick="createReactionRole()" style="margin-top:8px">➕ Create Panel</button></div><div class="card"><h3>📋 Active Panels (${panels.length})</h3>${html}</div>
<script>
function createReactionRole(){var t=document.getElementById('rrTitle').value.trim();var ch=document.getElementById('rrChannel').value.trim();var roles=document.getElementById('rrRoles').value.trim();if(!ch||!roles){alert('Fill in channel and roles');return;}var rolePairs=roles.split(',').map(function(r){var parts=r.trim().split(':');return {emoji:parts[0],roleId:parts[1]};}).filter(function(r){return r.emoji&&r.roleId;});fetch('/api/reaction-roles/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t||'Role Menu',channelId:ch,roles:rolePairs})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Panel created!');location.reload();}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});}
</script>`;
}

// ====================== SCHEDULED MESSAGES TAB ======================
export function renderScheduledMsgsTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const data = loadJSON(SCHED_MSG_PATH, { messages: [] });
  const msgs = (data.messages || []).slice(-50).reverse();
  let html = msgs.length === 0 ? '<div style="color:#8b8fa3;padding:12px">No scheduled messages.</div>' : '<table><thead><tr><th>Content</th><th>Channel</th><th>Send At</th><th>Status</th><th>Actions</th></tr></thead><tbody>';
  msgs.forEach(m => {
    const d = m.sendAt ? new Date(m.sendAt).toLocaleString() : 'N/A';
    const status = m.sent ? '<span style="color:#2ecc71">✅ Sent</span>' : '<span style="color:#f39c12">⏳ Pending</span>';
    html += `<tr><td style="max-width:200px;overflow:hidden;text-overflow:ellipsis">${(m.content||'').slice(0,60)}</td><td>${m.channelId||'?'}</td><td style="font-size:12px">${d}</td><td>${status}</td><td>${!m.sent?`<button class="small danger" style="margin:0;font-size:11px;padding:4px 8px" onclick="deleteScheduledMsg('${m.id}')">Delete</button>`:''}</td></tr>`;
  });
  if (msgs.length > 0) html += '</tbody></table>';
  return `<div class="card"><h2>📅 Scheduled Messages</h2><p style="color:#8b8fa3">Schedule messages to be sent at a specific time.</p>
  <div style="display:grid;grid-template-columns:2fr 1fr 1fr;gap:10px;margin-top:10px"><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Message</label><input id="schedContent" placeholder="Your message..." style="margin:4px 0"></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Channel ID</label><input id="schedChannel" placeholder="Channel ID" style="margin:4px 0"></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Send At</label><input id="schedTime" type="datetime-local" style="margin:4px 0"></div></div><button class="small" onclick="createScheduledMsg()" style="margin-top:8px">📅 Schedule</button></div><div class="card"><h3>📋 Messages (${msgs.length})</h3>${html}</div>
<script>
function createScheduledMsg(){var c=document.getElementById('schedContent').value.trim();var ch=document.getElementById('schedChannel').value.trim();var t=document.getElementById('schedTime').value;if(!c||!ch||!t){alert('Fill all fields');return;}fetch('/api/scheduled-messages/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({content:c,channelId:ch,sendAt:new Date(t).getTime()})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Scheduled!');location.reload();}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});}
function deleteScheduledMsg(id){if(!confirm('Delete?'))return;fetch('/api/scheduled-messages/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}).then(function(r){return r.json()}).then(function(d){if(d.success)location.reload();else alert(d.error||'Error');}).catch(function(e){alert(e.message);});}
</script>`;
}

// ====================== AUTOMOD TAB ======================
export function renderAutomodTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const data = loadJSON(AUTOMOD_PATH, {});
  const ruleCount = [data.antiSpam, data.blockLinks, data.blockCaps, data.blockInvites, data.blockMassMentions, data.blockDuplicates, (data.bannedWords||[]).length>0, (data.regexFilters||[]).length>0, data.raidProtection, data.blockNewAccounts, data.antiPhishing].filter(Boolean).length;
  return `
<!-- Automod Header -->
<div class="card" style="padding:16px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:4px">
    <h2 style="margin:0">🤖 Auto-Moderation</h2>
    <div style="display:flex;align-items:center;gap:8px">
      <span style="padding:3px 10px;background:${ruleCount>0?'#2ecc7122':'#e74c3c22'};color:${ruleCount>0?'#2ecc71':'#e74c3c'};border-radius:12px;font-size:11px;font-weight:700">${ruleCount} active</span>
      <button onclick="saveAutomod()" style="padding:6px 16px;background:#5b5bff;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">💾 Save</button>
      <div id="amStatus" style="font-size:12px"></div>
    </div>
  </div>
  <p style="color:#8b8fa3;font-size:12px;margin:0">Configure automatic moderation rules. Changes apply after saving.</p>
</div>

<!-- Quick Config Row -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">
  <div class="card" style="padding:12px;margin:0">
    <label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:4px">📋 Log Channel ID</label>
    <input id="amLogChannel" value="${data.logChannelId||''}" placeholder="Where automod logs go" style="margin:0;font-size:12px">
  </div>
  <div class="card" style="padding:12px;margin:0">
    <label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:4px">🔓 Exempt Roles (comma-separated IDs)</label>
    <input id="amExemptRoles" value="${(data.exemptRoles||[]).join(', ')}" placeholder="Role IDs that bypass automod" style="margin:0;font-size:12px">
  </div>
</div>

<!-- Exclusions -->
<div class="card" style="padding:12px;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="font-size:14px">🚧</span><span style="font-size:13px;font-weight:700;color:#e0e0e0">Exclusions</span><span style="font-size:10px;color:#8b8fa3">— channels & users that bypass all automod rules</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Exempt Channel IDs</label>
      <textarea id="amExemptChannels" style="min-height:40px;margin:0;font-size:11px" placeholder="One channel ID per line">${(data.exemptChannels||[]).join('\n')}</textarea>
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Exempt User IDs</label>
      <textarea id="amExemptUsers" style="min-height:40px;margin:0;font-size:11px" placeholder="One user ID per line">${(data.exemptUsers||[]).join('\n')}</textarea>
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Exempt Categories (ID)</label>
      <textarea id="amExemptCategories" style="min-height:40px;margin:0;font-size:11px" placeholder="Category channel IDs">${(data.exemptCategories||[]).join('\n')}</textarea>
    </div>
  </div>
</div>

<!-- Two-column layout for rules -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:8px">

  <!-- Left: Spam & Flood -->
  <div class="card" style="padding:12px;margin:0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px"><span style="font-size:14px">🛡️</span><span style="font-size:13px;font-weight:700;color:#e0e0e0">Spam & Flood</span></div>
    <div style="display:grid;gap:6px;font-size:12px">
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amSpam" ${data.antiSpam?'checked':''}> <strong>Anti-Spam</strong></label>
        <div style="display:flex;gap:8px;margin-top:4px;align-items:center">
          <span style="font-size:10px;color:#8b8fa3">Max</span><input id="amSpamThreshold" type="number" min="2" max="20" value="${data.spamThreshold||5}" style="width:50px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">msgs/5s \u2192</span>
          <select id="amSpamAction" style="margin:0;font-size:10px;padding:2px 4px"><option value="warn" ${data.spamAction==='warn'?'selected':''}>Warn</option><option value="mute" ${data.spamAction==='mute'?'selected':''}>Mute</option><option value="kick" ${data.spamAction==='kick'?'selected':''}>Kick</option><option value="delete" ${(data.spamAction||'delete')==='delete'?'selected':''}>Delete</option></select>
        </div>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amMassMention" ${data.blockMassMentions?'checked':''}> <strong>Mass Mentions</strong></label>
        <div style="display:flex;gap:6px;margin-top:4px;align-items:center"><span style="font-size:10px;color:#8b8fa3">Max</span><input id="amMentionLimit" type="number" min="2" max="50" value="${data.mentionLimit||5}" style="width:50px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">per msg</span></div>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amDuplicates" ${data.blockDuplicates?'checked':''}> <strong>Block Duplicates</strong></label>
        <div style="font-size:10px;color:#8b8fa3;margin-top:2px">Delete repeated messages within 30s</div>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amSlowmode" ${data.autoSlowmode?'checked':''}> <strong>Auto Slowmode</strong></label>
        <div style="display:flex;gap:4px;margin-top:4px;align-items:center;flex-wrap:wrap">
          <input id="amSlowmodeThreshold" type="number" min="5" max="50" value="${data.slowmodeThreshold||15}" style="width:45px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">msgs/10s \u2192</span>
          <input id="amSlowmodeDuration" type="number" min="1" max="120" value="${data.slowmodeDuration||5}" style="width:45px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">sec</span>
        </div>
      </div>
    </div>
  </div>

  <!-- Right: Security -->
  <div class="card" style="padding:12px;margin:0">
    <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px"><span style="font-size:14px">🚨</span><span style="font-size:13px;font-weight:700;color:#e0e0e0">Security</span></div>
    <div style="display:grid;gap:6px;font-size:12px">
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amRaidProtection" ${data.raidProtection?'checked':''}> <strong>Raid Protection</strong></label>
        <div style="font-size:10px;color:#8b8fa3;margin-top:2px">Auto-lock on mass joins</div>
        <div style="display:flex;gap:4px;margin-top:4px;align-items:center">
          <input id="amRaidJoins" type="number" min="3" max="30" value="${data.raidJoinThreshold||10}" style="width:45px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">joins in</span>
          <input id="amRaidWindow" type="number" min="5" max="120" value="${data.raidWindowSec||30}" style="width:45px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">sec</span>
        </div>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amNewAccounts" ${data.blockNewAccounts?'checked':''}> <strong>New Account Filter</strong></label>
        <div style="font-size:10px;color:#8b8fa3;margin-top:2px">Flag accounts younger than:</div>
        <div style="display:flex;gap:4px;margin-top:4px;align-items:center">
          <input id="amNewAccountAge" type="number" min="1" max="30" value="${data.newAccountAgeDays||7}" style="width:50px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">days</span>
          <select id="amNewAccountAction" style="margin:0;font-size:10px;padding:2px 4px"><option value="flag" ${(data.newAccountAction||'flag')==='flag'?'selected':''}>Flag only</option><option value="kick" ${data.newAccountAction==='kick'?'selected':''}>Kick</option><option value="ban" ${data.newAccountAction==='ban'?'selected':''}>Ban</option></select>
        </div>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amAntiPhishing" ${data.antiPhishing?'checked':''}> <strong>Anti-Phishing</strong></label>
        <div style="font-size:10px;color:#8b8fa3;margin-top:2px">Block known phishing/scam links</div>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amAntiEmojiSpam" ${data.antiEmojiSpam?'checked':''}> <strong>Emoji Spam</strong></label>
        <div style="display:flex;gap:4px;margin-top:4px;align-items:center">
          <span style="font-size:10px;color:#8b8fa3">Max</span><input id="amEmojiLimit" type="number" min="3" max="50" value="${data.emojiLimit||15}" style="width:50px;margin:0;padding:2px 4px"> <span style="font-size:10px;color:#8b8fa3">emojis/msg</span>
        </div>
      </div>
    </div>
  </div>
</div>

<!-- Content Filters -->
<div class="card" style="padding:12px;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px"><span style="font-size:14px">🔤</span><span style="font-size:13px;font-weight:700;color:#e0e0e0">Content Filters</span></div>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:#1a1a1d;padding:6px 10px;border-radius:6px;font-size:12px"><input type="checkbox" id="amLinks" ${data.blockLinks?'checked':''}> 🔗 Block Links</label>
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:#1a1a1d;padding:6px 10px;border-radius:6px;font-size:12px"><input type="checkbox" id="amCaps" ${data.blockCaps?'checked':''}> 🔠 Block Caps</label>
    <label style="display:flex;align-items:center;gap:5px;cursor:pointer;background:#1a1a1d;padding:6px 10px;border-radius:6px;font-size:12px"><input type="checkbox" id="amInvites" ${data.blockInvites?'checked':''}> ✉️ Block Invites</label>
    <div style="display:flex;align-items:center;gap:4px;background:#1a1a1d;padding:4px 10px;border-radius:6px;font-size:11px">
      <span style="color:#8b8fa3">Caps ></span><input id="amCapsThreshold" type="number" min="50" max="100" value="${data.capsThreshold||70}" style="width:40px;margin:0;padding:2px"><span style="color:#8b8fa3">%</span>
      <input type="checkbox" id="amCapsPercent" ${data.capsPercent?'checked':''} style="margin-left:4px">
    </div>
    <select id="amContentAction" style="margin:0;font-size:11px;padding:4px 8px;background:#1a1a1d;border:1px solid #333;border-radius:6px;color:#e0e0e0">
      <option value="delete" ${(data.contentAction||'delete')==='delete'?'selected':''}>Delete</option>
      <option value="warn" ${data.contentAction==='warn'?'selected':''}>Warn+Del</option>
      <option value="mute" ${data.contentAction==='mute'?'selected':''}>Mute+Del</option>
      <option value="timeout" ${data.contentAction==='timeout'?'selected':''}>Timeout+Del</option>
    </select>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">🚫 Banned Words (one per line)</label>
      <textarea id="amBannedWords" style="min-height:50px;margin:0;font-size:11px" placeholder="bad words...">${(data.bannedWords||[]).join('\n')}</textarea>
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">🔧 Regex Filters (one per line)</label>
      <textarea id="amRegexFilters" style="min-height:50px;margin:0;font-size:11px;font-family:monospace" placeholder="discord\\.gg\\/[a-zA-Z0-9]+">${(data.regexFilters||[]).join('\n')}</textarea>
    </div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:6px">
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">✅ Whitelisted Domains</label>
      <textarea id="amWhitelistDomains" style="min-height:36px;margin:0;font-size:11px" placeholder="youtube.com&#10;twitch.tv">${(data.whitelistDomains||[]).join('\n')}</textarea>
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">✅ Whitelisted Link Patterns</label>
      <textarea id="amWhitelistPatterns" style="min-height:36px;margin:0;font-size:11px" placeholder="https://docs\\.google\\.com/.*">${(data.whitelistPatterns||[]).join('\n')}</textarea>
    </div>
  </div>
</div>

<!-- Warn Escalation -->
<div class="card" style="padding:12px;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:10px"><span style="font-size:14px">⚡</span><span style="font-size:13px;font-weight:700;color:#e0e0e0">Warn Escalation</span><span style="font-size:10px;color:#8b8fa3">— auto-escalate based on warning count</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;font-size:12px">
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center;border-top:2px solid #faa61a">
      <div style="font-weight:600;color:#faa61a;margin-bottom:4px;font-size:11px">3 warnings</div>
      <select id="amEscalate3" style="margin:0;font-size:11px;width:100%"><option value="mute" ${(data.escalate3||'mute')==='mute'?'selected':''}>Mute (1h)</option><option value="timeout" ${data.escalate3==='timeout'?'selected':''}>Timeout</option><option value="kick" ${data.escalate3==='kick'?'selected':''}>Kick</option></select>
    </div>
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center;border-top:2px solid #e67e22">
      <div style="font-weight:600;color:#e67e22;margin-bottom:4px;font-size:11px">5 warnings</div>
      <select id="amEscalate5" style="margin:0;font-size:11px;width:100%"><option value="timeout" ${(data.escalate5||'timeout')==='timeout'?'selected':''}>Timeout (24h)</option><option value="kick" ${data.escalate5==='kick'?'selected':''}>Kick</option><option value="ban" ${data.escalate5==='ban'?'selected':''}>Ban</option></select>
    </div>
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center;border-top:2px solid #e74c3c">
      <div style="font-weight:600;color:#e74c3c;margin-bottom:4px;font-size:11px">10 warnings</div>
      <select id="amEscalate10" style="margin:0;font-size:11px;width:100%"><option value="ban" ${(data.escalate10||'ban')==='ban'?'selected':''}>Ban</option><option value="kick" ${data.escalate10==='kick'?'selected':''}>Kick</option><option value="timeout" ${data.escalate10==='timeout'?'selected':''}>Timeout (7d)</option></select>
    </div>
  </div>
</div>

<script>
function saveAutomod(){
  const settings = {
    antiSpam: document.getElementById('amSpam').checked,
    blockLinks: document.getElementById('amLinks').checked,
    blockCaps: document.getElementById('amCaps').checked,
    blockInvites: document.getElementById('amInvites').checked,
    blockMassMentions: document.getElementById('amMassMention').checked,
    blockDuplicates: document.getElementById('amDuplicates').checked,
    spamThreshold: parseInt(document.getElementById('amSpamThreshold').value)||5,
    spamAction: document.getElementById('amSpamAction').value,
    mentionLimit: parseInt(document.getElementById('amMentionLimit').value)||5,
    autoSlowmode: document.getElementById('amSlowmode').checked,
    slowmodeThreshold: parseInt(document.getElementById('amSlowmodeThreshold').value)||15,
    slowmodeDuration: parseInt(document.getElementById('amSlowmodeDuration').value)||5,
    raidProtection: document.getElementById('amRaidProtection').checked,
    raidJoinThreshold: parseInt(document.getElementById('amRaidJoins').value)||10,
    raidWindowSec: parseInt(document.getElementById('amRaidWindow').value)||30,
    bannedWords: (document.getElementById('amBannedWords').value||'').split('\\n').map(s=>s.trim()).filter(Boolean),
    regexFilters: (document.getElementById('amRegexFilters').value||'').split('\\n').map(s=>s.trim()).filter(Boolean),
    whitelistDomains: (document.getElementById('amWhitelistDomains').value||'').split('\\n').map(s=>s.trim()).filter(Boolean),
    contentAction: document.getElementById('amContentAction').value,
    capsPercent: document.getElementById('amCapsPercent').checked,
    capsThreshold: parseInt(document.getElementById('amCapsThreshold').value)||70,
    escalate3: document.getElementById('amEscalate3').value,
    escalate5: document.getElementById('amEscalate5').value,
    escalate10: document.getElementById('amEscalate10').value,
    exemptRoles: document.getElementById('amExemptRoles').value.split(',').map(s=>s.trim()).filter(Boolean),
    logChannelId: document.getElementById('amLogChannel').value.trim(),
    exemptChannels: (document.getElementById('amExemptChannels').value||'').split('\\n').map(s=>s.trim()).filter(Boolean),
    exemptUsers: (document.getElementById('amExemptUsers').value||'').split('\\n').map(s=>s.trim()).filter(Boolean),
    exemptCategories: (document.getElementById('amExemptCategories').value||'').split('\\n').map(s=>s.trim()).filter(Boolean),
    blockNewAccounts: document.getElementById('amNewAccounts').checked,
    newAccountAgeDays: parseInt(document.getElementById('amNewAccountAge').value)||7,
    newAccountAction: document.getElementById('amNewAccountAction').value,
    antiPhishing: document.getElementById('amAntiPhishing').checked,
    antiEmojiSpam: document.getElementById('amAntiEmojiSpam').checked,
    emojiLimit: parseInt(document.getElementById('amEmojiLimit').value)||15,
    whitelistPatterns: (document.getElementById('amWhitelistPatterns').value||'').split('\\n').map(s=>s.trim()).filter(Boolean)
  };
  fetch('/api/automod/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)})
    .then(r=>r.json()).then(d=>{
      if(d.success){document.getElementById('amStatus').innerHTML='<span style="color:#2ecc71">\\u2705 Saved!</span>';setTimeout(()=>{document.getElementById('amStatus').innerHTML='';},3000);}
      else alert(d.error||'Error');
    }).catch(e=>alert(e.message));
}
</script>`;
}


// ====================== STARBOARD TAB ======================
export function renderStarboardTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const data = loadJSON(STARBOARD_PATH, { settings: {}, posts: [] });
  const s = data.settings || {};
  const posts = (data.posts || []).slice(-20).reverse();
  let postsHtml = posts.length === 0 ? '<div style="color:#8b8fa3;padding:12px">No starboard posts yet.</div>' : '';
  posts.forEach(p => {
    postsHtml += `<div style="padding:8px;background:#2b2d31;border-radius:6px;margin-bottom:6px;border-left:3px solid #ffd700"><div style="font-weight:600">⭐ ${p.stars||0} stars</div><div style="font-size:12px;color:#8b8fa3">${(p.content||'').slice(0,100)} — by ${p.authorName||p.authorId||'?'}</div></div>`;
  });
  return `<div class="card"><h2>⭐ Starboard</h2><p style="color:#8b8fa3">Messages with enough star reactions get posted to a highlight channel.</p></div>
<div class="card"><h3>⚙️ Settings</h3><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-top:10px">
  <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Channel ID</label><input id="sbChannel" value="${s.channelId||''}" placeholder="Starboard channel ID" style="margin:4px 0"></div>
  <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Min Stars</label><input id="sbMin" type="number" value="${s.minStars||3}" min="1" style="margin:4px 0"></div>
  <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Emoji</label><input id="sbEmoji" value="${s.emoji||'⭐'}" style="margin:4px 0"></div>
</div><button class="small" onclick="saveStarboard()" style="margin-top:8px">💾 Save</button><div id="sbStatus" style="margin-top:8px"></div></div>
<div class="card"><h3>🌟 Recent Starred Posts (${posts.length})</h3>${postsHtml}</div>
<script>
function saveStarboard(){fetch('/api/starboard/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channelId:document.getElementById('sbChannel').value.trim(),minStars:parseInt(document.getElementById('sbMin').value)||3,emoji:document.getElementById('sbEmoji').value.trim()||'⭐'})}).then(function(r){return r.json()}).then(function(d){if(d.success){document.getElementById('sbStatus').innerHTML='<div style="color:#2ecc71">✅ Saved!</div>';setTimeout(function(){document.getElementById('sbStatus').innerHTML=''},3000);}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});}
</script>`;
}



// ====================== BOT STATUS TAB ======================
export function renderBotStatusTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const mem = process.memoryUsage();
  const memRss = Math.round(mem.rss / 1024 / 1024);
  const memHeap = Math.round(mem.heapUsed / 1024 / 1024);
  const memHeapTotal = Math.round(mem.heapTotal / 1024 / 1024);
  const cpuUsage = process.cpuUsage();
  const uptimeMs = Date.now() - startTime;
  const uptimeDays = Math.floor(uptimeMs / (1000 * 60 * 60 * 24));
  const uptimeHours = Math.floor((uptimeMs % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const uptimeMins = Math.floor((uptimeMs % (1000 * 60 * 60)) / (1000 * 60));
  const wsPing = client?.ws?.ping ?? 0;
  const guildCount = client?.guilds?.cache?.size ?? 0;
  const guild = client.guilds.cache.first();
  const memberCount = guild?.memberCount || Object.keys(membersCache.members || {}).length || 0;
  const channelCount = guild?.channels?.cache?.size || 0;
  const roleCount = guild?.roles?.cache?.size || 0;
  const cacheAge = membersCache.lastFullSync ? Math.round((Date.now() - membersCache.lastFullSync) / (1000 * 60)) : null;
  const cmdData = loadJSON(CMD_USAGE_PATH, { commands: {}, hourly: [] });
  const totalCmds = Object.values(cmdData.commands || {}).reduce((s, c) => s + (c.count || 0), 0);
  const hourlyData = (cmdData.hourly || []).slice(-24);

  // Mod stats
  const modData = loadJSON(MODERATION_PATH, { warnings: [], cases: [] });
  const totalCases = (modData.cases || []).length;
  const totalWarnings = (modData.warnings || []).length;

  return `<div class="card"><h2>🤖 Bot Status</h2><p style="color:#8b8fa3">Real-time bot health, Discord stats, and performance metrics.</p>
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:12px;margin-top:12px">
  <div style="padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border-radius:8px;border:1px solid #2a2f3a">
    <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Uptime</div>
    <div style="font-size:28px;font-weight:700;color:#2ecc71">${uptimeDays}d ${uptimeHours}h ${uptimeMins}m</div>
  </div>
  <div style="padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border-radius:8px;border:1px solid #2a2f3a">
    <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Gateway Ping</div>
    <div style="font-size:28px;font-weight:700;color:#3498db">${wsPing}ms</div>
  </div>
  <div style="padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border-radius:8px;border:1px solid #2a2f3a">
    <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Memory</div>
    <div style="font-size:28px;font-weight:700;color:#f39c12">${memHeap}MB</div>
    <div style="font-size:11px;color:#8b8fa3">Heap Total: ${memHeapTotal}MB • RSS: ${memRss}MB</div>
  </div>
  <div style="padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border-radius:8px;border:1px solid #2a2f3a">
    <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Discord</div>
    <div style="font-size:13px;color:#e0e0e0">Guilds: <b>${guildCount}</b></div>
    <div style="font-size:13px;color:#e0e0e0">Members: <b>${memberCount}</b></div>
    <div style="font-size:13px;color:#e0e0e0">Channels: <b>${channelCount}</b> • Roles: <b>${roleCount}</b></div>
    <div style="font-size:11px;color:#8b8fa3">Member cache: ${cacheAge !== null ? cacheAge + 'm ago' : 'N/A'}</div>
  </div>
  <div style="padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border-radius:8px;border:1px solid #2a2f3a">
    <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Usage</div>
    <div style="font-size:13px;color:#e0e0e0">Commands used: <b>${totalCmds}</b></div>
    <div style="font-size:13px;color:#e0e0e0">Recent points: <b>${hourlyData.length}</b></div>
    <div style="font-size:13px;color:#e0e0e0">Cases: <b>${totalCases}</b> • Warnings: <b>${totalWarnings}</b></div>
  </div>
</div></div>`;
}

// ====================== PETS TAB ======================
export function renderPetsTab(userTier) {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const canEdit = userTier !== 'viewer';
  const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
  const catalog = petsData.catalog || [];
  const pets = petsData.pets || [];
  const categories = petsData.categories || [...new Set(catalog.map(p => p.category).filter(Boolean))];
  const giveawaysData = loadJSON(path.join(DATA_DIR, 'pet-giveaways.json'), { history: [] });
  const pendingGiveaways = (giveawaysData.history || []).filter(g => !g.confirmed);

  // Serialize data for client-side use — safeJsonForHtml escapes <, >, & and
  // Unicode line separators so the JSON is safe inside <script> blocks
  const catalogJSON = safeJsonForHtml(catalog);
  const petsJSON = safeJsonForHtml(pets);
  const categoriesJSON = safeJsonForHtml(categories);
  const pendingJSON = safeJsonForHtml(pendingGiveaways.map(g => ({ petId: g.petId, winner: g.winner, giver: g.giver })));
  // Build Discord member names list from members cache for autocomplete
  const discordNames = Object.values(membersCache.members || {}).map(m => ({ username: m.username || '', displayName: m.displayName || '' })).filter(m => m.username && m.username !== 'Unknown');
  const discordNamesJSON = safeJsonForHtml(discordNames);
  // Build text channels list for channel selector
  const guild = client.guilds.cache.first();
  const textChannels = guild ? Array.from(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({ id: c.id, name: c.name, category: c.parent?.name || '' })).sort((a,b) => (a.category||'zzz').localeCompare(b.category||'zzz') || a.name.localeCompare(b.name)) : [];
  const channelsJSON = safeJsonForHtml(textChannels);
  console.log('[Pets Server] Rendering tab with', catalog.length, 'catalog pets,', pets.length, 'owned,', categories.length, 'categories');

  return '<div class="card">'
    + '<h2>🐾 Server Pets</h2>'
    + '<p style="color:#8b8fa3;font-size:13px;margin-top:-4px">Manage your server\'s pet collection. Members can add pets via the <code>/pet add</code> command.</p>'
    + '<div id="pets-stats" style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap"></div>'
    + '</div>'

    // Filters
    + '<div class="card">'
    + '<h2>🔍 Filters</h2>'
    + '<div style="margin-bottom:12px"><input type="text" id="filter-search" oninput="applyFilters()" placeholder="Search pets by name..." style="width:100%;padding:8px 14px;background:#1e1f22;border:1px solid #333;border-radius:8px;color:#e0e0e0;font-size:14px;outline:none;box-sizing:border-box" onfocus="this.style.borderColor=\'#9146ff\'" onblur="this.style.borderColor=\'#333\'"></div>'
    + '<div style="display:flex;gap:12px;flex-wrap:wrap;align-items:end">'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Rarity</label>'
    + '<select id="filter-rarity" onchange="applyFilters()" style="margin:4px 0"><option value="">All Rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="legendary">Legendary</option></select></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Category</label>'
    + '<select id="filter-category" onchange="applyFilters()" style="margin:4px 0"><option value="">All Categories</option></select></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Owned Count ≥</label>'
    + '<input type="number" id="filter-count" min="0" value="" placeholder="e.g. 1" onchange="applyFilters()" style="margin:4px 0;width:80px"></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Show Hidden</label>'
    + '<select id="filter-hidden" onchange="applyFilters()" style="margin:4px 0"><option value="no">Hide Hidden</option><option value="yes">Show All</option></select></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px">Given By</label>'
    + '<select id="filter-givenby" onchange="applyFilters()" style="margin:4px 0"><option value="">All Givers</option></select></div>'
    + '<button onclick="clearFilters()" style="padding:6px 14px;background:#333;color:#ccc;border:1px solid #555;border-radius:6px;cursor:pointer;margin-bottom:4px;height:36px">Clear</button>'
    + '</div></div>'

    // Our Pets section
    + '<div class="card">'
    + '<h2 style="cursor:pointer;user-select:none" onclick="toggleSection(\'owned-section\',this)">📦 Our Pets (<span id="owned-count">0</span>) <span style="font-size:12px;color:#8b8fa3;margin-left:8px">▼</span></h2>'
    + (canEdit ? '<div style="display:flex;flex-direction:row;gap:8px;margin-bottom:12px;align-items:center">'
    + '<button onclick="openCreatePetModal(\'General\')" style="padding:8px 16px;background:#2ecc7122;color:#2ecc71;border:1px solid #2ecc7144;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">➕ Create New Pet</button>'
    + '<button onclick="clearAllPets()" style="padding:8px 16px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">🗑️ Clear All Pets</button>'
    + '<button onclick="openRandomPicker()" style="padding:8px 16px;background:#9b59b622;color:#9b59b6;border:1px solid #9b59b644;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">🎲 Random Pet</button>'
    + '<button onclick="openSuggestBest()" style="padding:8px 16px;background:#f39c1222;color:#f39c12;border:1px solid #f39c1244;border-radius:6px;cursor:pointer;font-size:13px;font-weight:600;white-space:nowrap">💡 Suggest Best</button>'
    + '</div>' : '')
    + '<div id="owned-section"></div>'
    + '</div>'

    // Catalog sections (dynamically rendered)
    + '<div id="catalog-sections"></div>'

    // Edit modal
    + '<div id="edit-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h2 id="edit-title" style="margin:0">Edit Pet</h2><button onclick="closeEditModal()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">&times;</button></div>'
    + '<input type="hidden" id="edit-id">'
    + '<div style="display:grid;gap:12px">'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Rarity</label><select id="edit-rarity" style="margin:4px 0"><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="legendary">Legendary</option></select></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Category</label><select id="edit-category" style="margin:4px 0"></select></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Tier Rank</label><select id="edit-tier" style="margin:4px 0"><option value="">No Tier</option><option value="S">S Rank</option><option value="A">A Rank</option><option value="B">B Rank</option><option value="C">C Rank</option><option value="D">D Rank</option></select></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Tier Points (0-100)</label><input type="number" id="edit-tierPoints" min="0" max="100" value="" placeholder="0-100" style="margin:4px 0;width:100%"></div></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Description</label><textarea id="edit-description" rows="3" style="margin:4px 0;resize:vertical"></textarea></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Bonus / Effect</label><input type="text" id="edit-bonus" placeholder="e.g. +10% XP, +5 Luck" style="margin:4px 0"></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Static Image <span style="color:#555">(.png, .jpg, .webp)</span></label>'
    + '<div id="drop-imageUrl" style="margin:4px 0;border:2px dashed #444;border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px" onclick="document.getElementById(\'file-imageUrl\').click()" ondragover="event.preventDefault();this.style.borderColor=\'#9146ff\';this.style.background=\'#9146ff11\'" ondragleave="this.style.borderColor=\'#444\';this.style.background=\'\'" ondrop="event.preventDefault();this.style.borderColor=\'#444\';this.style.background=\'\';handleDrop(event,\'imageUrl\')">'  
    + '<div id="drop-imageUrl-preview"></div>'
    + '<div id="drop-imageUrl-text" style="color:#8b8fa3;font-size:12px">📁 Drag &amp; drop image here or click to browse</div>'
    + '<input type="file" id="file-imageUrl" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="handleFileSelect(this,\'imageUrl\')">'
    + '<input type="hidden" id="edit-imageUrl">'
    + '<div id="drop-imageUrl-loading" style="display:none;color:#9146ff;font-size:12px">⏳ Uploading...</div>'
    + '</div></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Animated Image <span style="color:#555">(.gif) — optional override</span></label>'
    + '<div id="drop-animatedUrl" style="margin:4px 0;border:2px dashed #444;border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px" onclick="document.getElementById(\'file-animatedUrl\').click()" ondragover="event.preventDefault();this.style.borderColor=\'#9146ff\';this.style.background=\'#9146ff11\'" ondragleave="this.style.borderColor=\'#444\';this.style.background=\'\'" ondrop="event.preventDefault();this.style.borderColor=\'#444\';this.style.background=\'\';handleDrop(event,\'animatedUrl\')">'  
    + '<div id="drop-animatedUrl-preview"></div>'
    + '<div id="drop-animatedUrl-text" style="color:#8b8fa3;font-size:12px">📁 Drag &amp; drop .gif here or click to browse</div>'
    + '<input type="file" id="file-animatedUrl" accept="image/gif" style="display:none" onchange="handleFileSelect(this,\'animatedUrl\')">'
    + '<input type="hidden" id="edit-animatedUrl">'
    + '<div id="drop-animatedUrl-loading" style="display:none;color:#9146ff;font-size:12px">⏳ Uploading...</div>'
    + '</div></div>'
    + '<div style="display:flex;align-items:center;gap:8px"><input type="checkbox" id="edit-hidden"><label for="edit-hidden" style="font-size:12px;color:#b0b0b0;cursor:pointer">Hidden (hide from catalog & our pets)</label></div>'
    + '<div id="edit-preview" style="text-align:center;padding:10px;background:#111;border-radius:8px;min-height:80px"></div>'
    + '<div style="display:flex;gap:10px;margin-top:8px">'
    + '<button onclick="saveEdit()" style="flex:1;padding:10px;background:#9146ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">💾 Save Changes</button>'
    + '<button onclick="closeEditModal()" style="flex:1;padding:10px;background:#333;color:#ccc;border:1px solid #555;border-radius:6px;cursor:pointer">Cancel</button>'
    + '</div></div></div></div>'

    // Giveaway modal - compact design, no scrollbar
    + '<div id="giveaway-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:20px 24px;border-radius:12px;max-width:480px;width:100%">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:12px"><h2 style="margin:0;font-size:18px">🎁 Pet Giveaway</h2><button onclick="closeGiveawayModal()" style="background:none;border:none;color:#ccc;font-size:20px;cursor:pointer">&times;</button></div>'
    + '<input type="hidden" id="giveaway-petId">'
    + '<div id="giveaway-pet-info" style="text-align:center;margin-bottom:10px"></div>'
    + '<div style="display:grid;gap:8px">'

    // Winner Name with autocomplete
    + '<div style="position:relative">'
    + '<label style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Winner Name</label>'
    + '<input type="text" id="giveaway-winner" placeholder="Start typing a Discord username..." style="margin:3px 0;padding:6px 8px;font-size:12px" oninput="giveawayNameHelper(this,\'winner\')" autocomplete="off">'
    + '<div id="giveaway-winner-suggestions" style="display:none;position:absolute;left:0;right:0;max-height:100px;overflow-y:auto;background:#2b2d31;border:1px solid #444;border-radius:6px;z-index:10"></div>'
    + '<p style="margin:2px 0 0;font-size:9px;color:#72767d">💡 Type to auto-suggest from server members • Right-click in Discord → Copy Username</p>'
    + '</div>'

    // Given By
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:6px">'
    + '<div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Given By</label>'
    + '<select id="giveaway-giver-select" onchange="onGiveawayGiverChange()" style="margin:3px 0;width:100%;font-size:12px;padding:6px"><option value="">(select)</option></select></div>'
    + '<div id="giveaway-giver-other-wrap" style="display:none"><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Custom Name</label>'
    + '<input type="text" id="giveaway-giver-other" placeholder="Type a name..." style="margin:3px 0;width:100%;box-sizing:border-box;font-size:12px;padding:6px 8px"></div>'
    + '<div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Notes (optional)</label>'
    + '<input type="text" id="giveaway-notes" placeholder="Extra info..." style="margin:3px 0;font-size:12px;padding:6px 8px"></div>'
    + '</div>'

    // Notification section - improved layout
    + '<div style="background:#2b2d31;border:1px solid #3a3d45;border-radius:8px;padding:12px;margin-top:4px">'
    + '<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">'
    + '<span style="font-size:13px;color:#e0e0e0;font-weight:700">🔔 Notification Settings</span>'
    + '<label style="display:flex;align-items:center;gap:4px;cursor:pointer;font-size:11px;color:#b0b0b0"><input type="checkbox" id="giveaway-notify-enabled" checked onchange="document.getElementById(\'giveaway-notify-opts\').style.display=this.checked?\'block\':\'none\'"><span>Enable</span></label>'
    + '</div>'
    + '<div id="giveaway-notify-opts">'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 10px;background:#1e1f22;border:1px solid #3a3a42;border-radius:6px;font-size:12px;color:#e0e0e0"><input type="checkbox" id="giveaway-ping-receiver" checked style="accent-color:#2ecc71">🎯 Ping Receiver</label>'
    + '<label style="display:flex;align-items:center;gap:6px;cursor:pointer;padding:8px 10px;background:#1e1f22;border:1px solid #3a3a42;border-radius:6px;font-size:12px;color:#e0e0e0"><input type="checkbox" id="giveaway-ping-giver" style="accent-color:#3498db">📤 Ping Giver</label>'
    + '</div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">'
    + '<div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:block">Notification Type</label>'
    + '<select id="giveaway-ping-reason" style="margin:0;width:100%;font-size:12px;padding:7px;background:#1e1f22;border:1px solid #3a3a42;border-radius:6px;color:#e0e0e0">'
    + '<option value="pet-ready">🎁 Pet ready to claim</option>'
    + '<option value="giveaway-announced">📢 Giveaway announced</option>'
    + '<option value="reminder">⏰ Unclaimed reminder</option>'
    + '<option value="custom">✏️ Custom message</option>'
    + '</select></div>'
    + '<div><label style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;margin-bottom:4px;display:block">Send To Channel</label>'
    + '<select id="giveaway-ping-channel" style="margin:0;width:100%;font-size:12px;padding:7px;background:#1e1f22;border:1px solid #3a3a42;border-radius:6px;color:#e0e0e0">'
    + '<option value="1462225342881071307">📌 Stream Chat (default)</option>'
    + '<option value="dm">📩 DM to winner</option>'
    + '</select></div>'
    + '</div>'
    + '</div>'
    + '</div>'

    + '<button onclick="submitGiveaway()" style="padding:8px;background:#2ecc71;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px">🎁 Submit Giveaway</button>'
    + '</div></div></div>'

    // Random picker modal
    + '<div id="random-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0">🎲 Random Pet Picker</h2><button onclick="closeRandomModal()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">&times;</button></div>'
    + '<p style="color:#8b8fa3;font-size:12px;margin-top:0">Select which owned pets to include, then spin!</p>'
    + '<div style="margin-bottom:12px"><button onclick="randomSelectAll(true)" style="padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:11px;margin-right:6px">Select All</button><button onclick="randomSelectAll(false)" style="padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:11px">Deselect All</button></div>'
    + '<div id="random-pet-list" style="max-height:300px;overflow-y:auto;margin-bottom:16px"></div>'
    + '<button onclick="spinRandom()" style="width:100%;padding:12px;background:#9b59b6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px">🎲 SPIN!</button>'
    + '<div id="random-result" style="margin-top:16px;text-align:center;min-height:60px"></div>'
    + '</div></div>'

    // Suggest best modal
    + '<div id="suggest-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0">💡 Suggested Best Pet</h2><button onclick="closeSuggestModal()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">&times;</button></div>'
    + '<p style="color:#8b8fa3;font-size:12px;margin-top:0">The best pet you do not own yet, based on tier rank and points.</p>'
    + '<div id="suggest-result" style="text-align:center;min-height:100px"></div>'
    + '</div></div>'

    // GivenBy selector modal
    + '<div id="givenby-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:400px;width:100%">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0">🎁 Given By</h2><button onclick="closeGivenByModal()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">&times;</button></div>'
    + '<p style="color:#8b8fa3;font-size:12px;margin-top:0">Who gave this pet? Pick from the list or type a new name.</p>'
    + '<div style="display:grid;gap:12px">'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Select Giver</label>'
    + '<select id="givenby-select" onchange="onGivenBySelectChange()" style="margin:4px 0;width:100%"><option value="">(no one)</option></select></div>'
    + '<div><input type="text" id="givenby-other" placeholder="Type a name..." style="margin:4px 0;width:100%;display:none;box-sizing:border-box"></div>'
    + '<div style="display:flex;gap:10px;margin-top:8px">'
    + '<button onclick="confirmAddPet()" style="flex:1;padding:10px;background:#9146ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">➕ Add Pet</button>'
    + '<button onclick="closeGivenByModal()" style="flex:1;padding:10px;background:#333;color:#ccc;border:1px solid #555;border-radius:6px;cursor:pointer">Cancel</button>'
    + '</div></div></div></div>'

    // Remove picker modal
    + '<div id="remove-picker-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:400px;width:100%">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 id="remove-picker-title" style="margin:0">Remove Pet</h2><button onclick="document.getElementById(\'remove-picker-modal\').style.display=\'none\'" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">&times;</button></div>'
    + '<p style="color:#8b8fa3;font-size:12px;margin-top:0">Choose which giver\'s pet to remove:</p>'
    + '<div id="remove-picker-list"></div>'
    + '<button onclick="document.getElementById(\'remove-picker-modal\').style.display=\'none\'" style="margin-top:12px;width:100%;padding:8px;background:#333;color:#ccc;border:1px solid #555;border-radius:6px;cursor:pointer">Cancel</button>'
    + '</div></div>'

    // Script
    + '<div id="create-pet-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:520px;width:100%;max-height:80vh;overflow-y:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:20px"><h2 id="create-pet-title" style="margin:0">➕ New Pet</h2><button onclick="closeCreatePetModal()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">&times;</button></div>'
    + '<div style="display:grid;gap:12px">'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">📁 Section / Category</label><select id="create-pet-category" style="margin:4px 0;width:100%"></select><p style="margin:2px 0 0;font-size:10px;color:#72767d">Choose which section this pet belongs to (e.g. Exclusive Companions, Legacy Companions...)</p></div>'
    + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px"><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Name</label><input type="text" id="create-pet-name" placeholder="Pet name" style="margin:4px 0"></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Emoji</label><input type="text" id="create-pet-emoji" placeholder="🐾" style="margin:4px 0"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Rarity</label><select id="create-pet-rarity" style="margin:4px 0"><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="legendary">Legendary</option></select></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Tier</label><select id="create-pet-tier" style="margin:4px 0"><option value="">No Tier</option><option value="S">S</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Description</label><textarea id="create-pet-desc" rows="2" style="margin:4px 0;resize:vertical" placeholder="Short description..."></textarea></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Bonus / Effect</label><input type="text" id="create-pet-bonus" placeholder="e.g. +10% XP" style="margin:4px 0"></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Image URL (optional)</label><input type="text" id="create-pet-image" placeholder="https://..." style="margin:4px 0"></div>'
    + '<button onclick="submitCreatePet()" style="padding:10px;background:#2ecc71;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">➕ Create Pet</button>'
    + '</div></div></div>'

    + '<script>'
    + 'console.log("[Pets] Script tag loaded");'
    + '(function(){'
    + 'console.log("[Pets] IIFE starting");'
    + '["edit-modal","giveaway-modal","random-modal","suggest-modal","givenby-modal","remove-picker-modal","create-pet-modal"].forEach(function(id){var m=document.getElementById(id);if(m)document.body.appendChild(m);});'
    + 'try{'
    + 'console.log("[Pets] Initializing...");'
    + 'var catalog=' + catalogJSON + ';'
    + 'var pets=' + petsJSON + ';'
    + 'var categories=' + categoriesJSON + ';'
    + 'var canEdit=' + (canEdit ? 'true' : 'false') + ';'
    + 'var pendingGiveaways=' + pendingJSON + ';'
    + 'var discordNames=' + discordNamesJSON + ';'
    + 'var serverChannels=' + channelsJSON + ';'
    + 'console.log("[Pets] Loaded:",catalog.length,"pets in catalog,",pets.length,"owned,",categories.length,"categories");'
    + 'var rarityColors={common:"#8b8fa3",uncommon:"#2ecc71",rare:"#3498db",legendary:"#f39c12"};'
    + 'var categoryIcons={"Legacy Companions":"🏛️","Fallen Spirits":"👻","Shallow Waters":"🌊","Exclusive Companions":"⭐"};'
    + 'var collapsedCats={};'
    + 'window._petCatalog=catalog;'
    + 'window._petPets=pets;'

    // Populate category filter
    + 'var catSel=document.getElementById("filter-category");'
    + 'categories.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=c;catSel.appendChild(o);});'

    // Image helper — handle broken images gracefully
    + 'function imgTag(src,name,emoji,size){'
    + '  size=size||80;'
    + '  if(!src) return \'<div style="width:\'+size+\'px;height:\'+size+\'px;display:flex;align-items:center;justify-content:center;font-size:\'+(size*0.6)+\'px;border-radius:8px;background:#2b2d31">\'+emoji+\'</div>\';'
    + '  return \'<img src="\'+src+\'" alt="\'+name+\'" style="width:\'+size+\'px;height:\'+size+\'px;object-fit:contain;border-radius:8px;image-rendering:auto;image-rendering:high-quality" onerror="this.style.display=\\\'none\\\';this.insertAdjacentHTML(\\\'afterend\\\',\\\'<div style=&quot;width:\'+size+\'px;height:\'+size+\'px;display:flex;align-items:center;justify-content:center;font-size:\'+(size*0.6)+\'px;border-radius:8px;background:#2b2d31&quot;>\'+emoji+\'</div>\\\')"/>\';'
    + '}'

    // Render stats
    + 'function renderStats(){'
    + '  var owned=pets.length,total=catalog.length,leg=catalog.filter(function(c){return c.rarity==="legendary"}).length;'
    + '  document.getElementById("pets-stats").innerHTML='
    + '    \'<div style="padding:10px 18px;background:#9146ff15;border:1px solid #9146ff33;border-radius:8px;text-align:center"><div style="font-size:22px;font-weight:700;color:#9146ff">\'+owned+\'</div><div style="font-size:11px;color:#8b8fa3">Pets Owned</div></div>\''
    + '    +\'<div style="padding:10px 18px;background:#2ecc7115;border:1px solid #2ecc7133;border-radius:8px;text-align:center"><div style="font-size:22px;font-weight:700;color:#2ecc71">\'+total+\'</div><div style="font-size:11px;color:#8b8fa3">Available</div></div>\''
    + '    +\'<div style="padding:10px 18px;background:#3498db15;border:1px solid #3498db33;border-radius:8px;text-align:center"><div style="font-size:22px;font-weight:700;color:#3498db">\'+categories.length+\'</div><div style="font-size:11px;color:#8b8fa3">Categories</div></div>\''
    + '    +\'<div style="padding:10px 18px;background:#f39c1215;border:1px solid #f39c1233;border-radius:8px;text-align:center"><div style="font-size:22px;font-weight:700;color:#f39c12">\'+leg+\'</div><div style="font-size:11px;color:#8b8fa3">Legendary</div></div>\';'
    + '}'

    // Count how many times a catalogId is owned
    + 'function ownedCount(petId){return pets.filter(function(p){return p.petId===petId}).length;}'

    // Apply filters
    + 'window.applyFilters=function(){'
    + '  var rarity=document.getElementById("filter-rarity").value;'
    + '  var category=document.getElementById("filter-category").value;'
    + '  var minCount=parseInt(document.getElementById("filter-count").value)||0;'
    + '  var showHidden=document.getElementById("filter-hidden").value==="yes";'
    + '  var search=(document.getElementById("filter-search").value||"").toLowerCase().trim();'
    + '  var givenBy=document.getElementById("filter-givenby").value;'
    + '  populateGiverFilter(givenBy);'
    + '  renderOwned(rarity,category,minCount,showHidden,search,givenBy);'
    + '  renderCatalog(rarity,category,minCount,showHidden,search);'
    + '};'
    + 'window.clearFilters=function(){'
    + '  document.getElementById("filter-rarity").value="";'
    + '  document.getElementById("filter-category").value="";'
    + '  document.getElementById("filter-count").value="";'
    + '  document.getElementById("filter-hidden").value="no";'
    + '  document.getElementById("filter-search").value="";'
    + '  document.getElementById("filter-givenby").value="";'
    + '  applyFilters();'
    + '};'

    // Populate giver filter dropdown dynamically
    + 'function populateGiverFilter(currentVal){'
    + '  var sel=document.getElementById("filter-givenby");'
    + '  if(!sel) return;'
    + '  var givers={};'
    + '  pets.forEach(function(p){if(p.givenBy && p.givenBy.trim()){givers[p.givenBy.trim()]=true}});'
    + '  var sorted=Object.keys(givers).sort();'
    + '  sel.innerHTML=\'<option value="">All Givers</option>\';'
    + '  sorted.forEach(function(g){var o=document.createElement("option");o.value=g;o.textContent=g;sel.appendChild(o)});'
    + '  if(currentVal) sel.value=currentVal;'
    + '}'

    // Render owned pets — compact grid grouped by pet type
    + 'function renderOwned(fRarity,fCat,fMinCount,showHidden,search,fGivenBy){'
    + '  var container=document.getElementById("owned-section");'
    + '  if(!container) return;'
    + '  var grouped={};'
    + '  pets.forEach(function(op){'
    + '    var c=catalog.find(function(x){return x.id===op.petId});'
    + '    if(!c) return;'
    + '    if(!showHidden && c.hidden) return;'
    + '    if(fRarity && c.rarity!==fRarity) return;'
    + '    if(fCat && c.category!==fCat) return;'
    + '    if(search && c.name.toLowerCase().indexOf(search)===-1) return;'
    + '    if(fGivenBy && (!op.givenBy || op.givenBy.trim()!==fGivenBy)) return;'
    + '    if(!grouped[c.id]) grouped[c.id]={cat:c,count:0};'
    + '    grouped[c.id].count++;'
    + '  });'
    + '  var keys=Object.keys(grouped);'
    + '  if(fMinCount>0) keys=keys.filter(function(k){return grouped[k].count>=fMinCount});'
    + '  var totalOwned=keys.reduce(function(s,k){return s+grouped[k].count},0);'
    + '  document.getElementById("owned-count").textContent=totalOwned;'
    + '  if(keys.length===0){container.innerHTML=\'<p style="color:#8b8fa3;font-size:13px">No pets yet. Use the catalog below or <code>/pet add</code> in Discord!</p>\';return;}'
    + '  var html="";'
    + '  keys.forEach(function(k){'
    + '    var g=grouped[k],c=g.cat,cnt=g.count;'
    + '    var bc=rarityColors[c.rarity]||"#8b8fa3";'
    + '    var src=c.animatedUrl||c.imageUrl||"";'
    + '    var bonusTag=c.bonus?\'<div style="font-size:9px;color:#f1c40f;margin-top:2px">⚡ \'+c.bonus+\'</div>\':"";'
    + '    var tierTag=c.tier?\'<div style="font-size:10px;font-weight:700;margin-top:2px;color:\'+(c.tier==="S"?"#ff4444":c.tier==="A"?"#f39c12":c.tier==="B"?"#3498db":c.tier==="C"?"#2ecc71":"#8b8fa3")+\'">\'+c.tier+\' Rank\'+(c.tierPoints?\" \u2022 \"+c.tierPoints+\"pts\":\"\")+\'</div>\':"";'
    + '    var givers=[];pets.forEach(function(op){if(op.petId===c.id && op.givenBy && op.givenBy.trim()){var g=op.givenBy.trim();if(givers.indexOf(g)===-1)givers.push(g)}});'
    + '    var giverTag=givers.length>0?\'<div style="font-size:9px;color:#9b59b6;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis" title="\'+givers.join(", ")+\'">🎁 \'+givers.join(", ")+\'</div>\':"";'
    + '    var pendingCnt=pendingGiveaways.filter(function(pg){return pg.petId===c.id}).length;'
    + '    var pendingTag=pendingCnt>0?\'<div style="font-size:9px;color:#e67e22;margin-top:2px;font-weight:700">⏳ Pending: \'+pendingCnt+\'</div>\':"";'
    + '    html+=\'<div style="border:2px solid \'+bc+\'44;border-radius:8px;padding:6px;background:#1e1f22;text-align:center;min-width:95px;max-width:125px;position:relative;transition:transform .15s" onmouseover="this.style.transform=\\\'scale(1.04)\\\'" onmouseout="this.style.transform=\\\'\\\'">\''
    + '      +(cnt>1?\'<div style="position:absolute;top:-6px;right:-6px;background:#9146ff;color:#fff;font-size:11px;font-weight:700;min-width:22px;height:22px;line-height:22px;border-radius:12px;text-align:center;padding:0 4px">x\'+cnt+\'</div>\':"")'
    + '      +\'<div style="position:absolute;top:4px;right:4px;display:flex;gap:2px">\''
    + '      +(canEdit?\'<button onclick="event.stopPropagation();addPet(\\\'\'+c.id+\'\\\')" style="background:none;border:none;color:#2ecc71;cursor:pointer;font-size:18px;padding:2px 4px;line-height:1" title="Add another">+</button>\':"")'
    + '      +(canEdit?\'<button onclick="event.stopPropagation();removeOnePet(\\\'\'+c.id+\'\\\')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:18px;padding:2px 4px;line-height:1" title="Remove one">&minus;</button>\':"")'
    + '      +(canEdit?\'<button onclick="event.stopPropagation();openGiveawayModal(\\\'\'+c.id+\'\\\')" style="background:none;border:none;color:#f39c12;cursor:pointer;font-size:18px;padding:2px 4px;line-height:1" title="Giveaway">🎁</button>\':"")'
    + '      +\'</div>\''
    + '      +\'<div style="margin:4px auto">\'+imgTag(src,c.name,c.emoji,56)+\'</div>\''
    + '      +\'<div style="font-weight:700;font-size:12px;margin:2px 0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis">\'+c.emoji+" "+c.name+\'</div>\''
    + '      +\'<div style="font-size:9px;color:\'+bc+\';text-transform:uppercase;letter-spacing:.5px">\'+c.rarity+\'</div>\''
    + '      +tierTag'
    + '      +bonusTag'
    + '      +giverTag'
    + '      +pendingTag'
    + '      +\'</div>\';'
    + '  });'
    + '  container.innerHTML=\'<div style="display:flex;flex-wrap:wrap;gap:10px">\'+html+\'</div>\';'
    + '}'

    // Render catalog
    + 'function renderCatalog(fRarity,fCat,fMinCount,showHidden,search){'
    + '  var container=document.getElementById("catalog-sections");'
    + '  if(!container){console.error("[Pets] catalog-sections not found!");return;}'
    + '  var html="";'
    + '  var catsToShow=fCat?[fCat]:categories;'
    + '  console.log("[Pets] Categories to show:",catsToShow);'
    + '  catsToShow.forEach(function(cat){'
    + '    var icon=categoryIcons[cat]||"📂";'
    + '    var catPets=catalog.filter(function(p){'
    + '      if(p.category!==cat) return false;'
    + '      if(!showHidden && p.hidden) return false;'
    + '      if(fRarity && p.rarity!==fRarity) return false;'
    + '      if(search && p.name.toLowerCase().indexOf(search)===-1) return false;'
    + '      if(fMinCount>0 && ownedCount(p.id)<fMinCount) return false;'
    + '      return true;'
    + '    });'
    + '    console.log("[Pets] Category",cat,"has",catPets.length,"pets after filtering");'
    + '    var collapsed=collapsedCats[cat];'
    + '    var arrow=collapsed?"▶":"▼";'
    + '    html+=\'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="cursor:pointer;user-select:none;margin:0" onclick="toggleCat(this.dataset.cat)" data-cat="\'+cat+\'">\'+icon+" "+cat+" ("+catPets.length+\') <span style="font-size:12px;color:#8b8fa3;margin-left:8px">\'+arrow+\'</span></h2>\'+(canEdit?\'<button data-delcat="\'+cat+\'" onclick="deletePetCategory(this.getAttribute(\\\'data-delcat\\\'))" style="padding:4px 10px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;width:auto" title="Delete all pets in this category">🗑️ Delete Category</button>\':\'\')+\'</div>\';'
    + '    html+=\'<div id="cat-\'+cat.replace(/[^a-zA-Z]/g,"")+\'" style="display:\'+(collapsed?"none":"flex")+\';flex-wrap:wrap;gap:8px;margin-top:8px">\';'
    + '    catPets.forEach(function(p){'
    + '      var owned=pets.find(function(op){return op.petId===p.id});'
    + '      var bc=rarityColors[p.rarity]||"#8b8fa3";'
    + '      var src=p.animatedUrl||p.imageUrl||"";'
    + '      var cnt=ownedCount(p.id);'
    + '      var ownedHtml="";'
    + '      if(cnt>0){ownedHtml=\'<div style="display:flex;align-items:center;justify-content:center;gap:6px"><span style="color:#2ecc71;font-size:11px;font-weight:600">✅ x\'+cnt+\'</span>\'+(canEdit?\'<button onclick="addPet(\\\'\'+p.id+\'\\\')" style="background:none;border:none;color:#2ecc71;cursor:pointer;font-size:16px;padding:0;line-height:1" title="Add another">+</button>\':\'\')+\'</div>\';}'    + '      else if(canEdit){ownedHtml=\'<button onclick="addPet(\\\'\'+p.id+\'\\\')" style="padding:6px 16px;background:#9146ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-size:12px;font-weight:600;transition:background .2s" onmouseover="this.style.background=\\\'#a955ff\\\'" onmouseout="this.style.background=\\\'#9146ff\\\'">➕ Add Pet</button>\';}'
    + '      var bonusTag=p.bonus?\'<div style="font-size:10px;color:#f1c40f;margin:4px 0">⚡ \'+p.bonus+\'</div>\':"";'
    + '      var tierTag=p.tier?\'<div style="font-size:10px;font-weight:700;margin:2px 0;color:\'+(p.tier==="S"?"#ff4444":p.tier==="A"?"#f39c12":p.tier==="B"?"#3498db":p.tier==="C"?"#2ecc71":"#8b8fa3")+\'">\'+p.tier+\' Rank\'+(p.tierPoints?\" \u2022 \"+p.tierPoints+\"pts\":\"\")+\'</div>\':"";'
    + '      var hiddenBadge=p.hidden?\'<div style="font-size:9px;color:#e74c3c;margin-top:4px">🚫 HIDDEN</div>\':"";'
    + '      html+=\'<div style="border:2px solid \'+bc+\';border-radius:10px;padding:10px;background:#1e1f22;text-align:center;position:relative;min-width:120px;max-width:150px;transition:transform .2s,box-shadow .2s;\'+(p.hidden?"opacity:.5;":"")+\'" onmouseover="this.style.transform=\\\'translateY(-4px)\\\';this.style.boxShadow=\\\'0 8px 24px rgba(0,0,0,.4)\\\'" onmouseout="this.style.transform=\\\'\\\';this.style.boxShadow=\\\'\\\'">\''
    + '        +\'<div style="position:absolute;top:8px;right:8px;font-size:10px;font-weight:700;text-transform:uppercase;color:\'+bc+\';letter-spacing:1px">\'+p.rarity+\'</div>\''
    + '        +(canEdit?\'<div style="position:absolute;top:8px;left:8px"><button onclick="openEditModal(\\\'\'+p.id+\'\\\')" style="background:none;border:none;color:#8b8fa3;cursor:pointer;font-size:14px;padding:2px" title="Edit pet">✏️</button></div>\':\'\')'
    + '        +\'<div style="margin:8px auto">\'+imgTag(src,p.name,p.emoji,64)+\'</div>\''
    + '        +\'<div style="font-weight:700;font-size:15px;margin:6px 0">\'+p.emoji+" "+p.name+\'</div>\''
    + '        +\'<div style="font-size:11px;color:#8b8fa3;margin-bottom:4px">\'+p.description+\'</div>\''
    + '        +bonusTag+tierTag+hiddenBadge'
    + '        +ownedHtml'
    + '        +\'</div>\';'
    + '    });'
    + '    html+=\'</div></div>\';'
    + '  });'
    + '  console.log("[Pets] Generated",html.length,"chars of HTML for",catsToShow.length,"categories");'
    + '  if(html.length===0||html.indexOf("<div")===  -1){'
    + '    container.innerHTML=\'<div style="padding:20px;background:#ff6b6b22;border:1px solid #ff6b6b;border-radius:8px;color:#ff6b6b"><strong>⚠️ Debug:</strong> No HTML generated. Categories: \'+catsToShow.length+\', Total catalog: \'+catalog.length+\'</div>\';'
    + '    return;'
    + '  }'
    + '  container.innerHTML=html;'
    + '  console.log("[Pets] Catalog rendered successfully");'
    + '}'

    // Toggle category collapse
    + 'window.toggleCat=function(el){'
    + '  var cat=typeof el==="string"?el:el.getAttribute("data-cat");'
    + '  collapsedCats[cat]=!collapsedCats[cat];'
    + '  applyFilters();'
    + '};'
    + 'window.toggleSection=function(id,el){'
    + '  var sec=document.getElementById(id);'
    + '  if(sec.style.display==="none"){sec.style.display="";el.querySelector("span:last-child").textContent="▼";}else{sec.style.display="none";el.querySelector("span:last-child").textContent="▶";}'
    + '};'

    // Edit modal
    + 'window.openEditModal=function(petId){'
    + '  var p=catalog.find(function(c){return c.id===petId});'
    + '  if(!p) return;'
    + '  document.getElementById("edit-id").value=p.id;'
    + '  document.getElementById("edit-title").textContent="✏️ Edit "+p.name;'
    + '  document.getElementById("edit-rarity").value=p.rarity||"common";'
    + '  var catSel=document.getElementById("edit-category");'
    + '  catSel.innerHTML=categories.map(function(c){return "<option value=\\""+c+"\\""+(c===p.category?" selected":"")+">"+c+"</option>"}).join("");'
    + '  document.getElementById("edit-description").value=p.description||"";'
    + '  document.getElementById("edit-bonus").value=p.bonus||"";'
    + '  document.getElementById("edit-tier").value=p.tier||"";'
    + '  document.getElementById("edit-tierPoints").value=p.tierPoints||"";'
    + '  document.getElementById("edit-imageUrl").value=p.imageUrl||"";'
    + '  document.getElementById("edit-animatedUrl").value=p.animatedUrl||"";'
    + '  document.getElementById("edit-hidden").checked=!!p.hidden;'
    + '  setDropPreview("imageUrl",p.imageUrl,p.emoji);'
    + '  setDropPreview("animatedUrl",p.animatedUrl,p.emoji);'
    + '  updateEditPreview(p);'
    + '  var modal=document.getElementById("edit-modal");'
    + '  modal.style.display="flex";'
    + '};'
    + 'function updateEditPreview(p){'
    + '  var src=document.getElementById("edit-animatedUrl").value||document.getElementById("edit-imageUrl").value||"";'
    + '  var prev=document.getElementById("edit-preview");'
    + '  if(src){prev.innerHTML=\'<img src="\'+src+\'" style="max-width:120px;max-height:120px;border-radius:8px" onerror="this.outerHTML=\\\'<div style=&amp;quot;color:#e74c3c;font-size:12px&amp;quot;>Image failed to load. Use a direct image URL (.png, .jpg, .gif)</div>\\\'"/>\';}'
    + '  else{prev.innerHTML=\'<div style="font-size:48px">\'+p.emoji+\'</div><div style="font-size:11px;color:#555">No image set</div>\';}'
    + '}'

    // Drag-and-drop / file upload helpers
    + 'function setDropPreview(field,url,emoji){'
    + '  var prev=document.getElementById("drop-"+field+"-preview");'
    + '  var txt=document.getElementById("drop-"+field+"-text");'
    + '  document.getElementById("edit-"+field).value=url||"";'
    + '  if(url){'
    + '    prev.innerHTML=\'<img src="\'+url+\'" style="max-width:80px;max-height:80px;border-radius:6px"><button onclick="event.stopPropagation();clearDrop(\\\'\'+field+\'\\\')" style="display:block;margin:4px auto 0;background:none;border:none;color:#e74c3c;cursor:pointer;font-size:11px">Remove</button>\';'
    + '    txt.style.display="none";'
    + '  }else{'
    + '    prev.innerHTML="";'
    + '    txt.style.display="";'
    + '  }'
    + '}'
    + 'window.clearDrop=function(field){'
    + '  document.getElementById("edit-"+field).value="";'
    + '  setDropPreview(field,"","");'
    + '  var p=catalog.find(function(c){return c.id===document.getElementById("edit-id").value});'
    + '  if(p) updateEditPreview(p);'
    + '};'
    + 'function uploadFile(file,field){'
    + '  var loading=document.getElementById("drop-"+field+"-loading");'
    + '  loading.style.display="";'
    + '  var fd=new FormData();fd.append("image",file);'
    + '  fetch("/upload/image",{method:"POST",body:fd}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired or server error. Please refresh the page.");}return r.json()}).then(function(d){'
    + '    loading.style.display="none";'
    + '    if(d.success){'
    + '      document.getElementById("edit-"+field).value=d.url;'
    + '      var p=catalog.find(function(c){return c.id===document.getElementById("edit-id").value});'
    + '      setDropPreview(field,d.url,p?p.emoji:"");'
    + '      if(p) updateEditPreview(p);'
    + '    }else{alert(d.error||"Upload failed");}'
    + '  }).catch(function(e){loading.style.display="none";alert("Upload error: "+e.message)});'
    + '}'
    + 'window.handleDrop=function(e,field){'
    + '  var file=e.dataTransfer.files[0];'
    + '  if(file&&file.type.startsWith("image/")) uploadFile(file,field);'
    + '  else alert("Please drop an image file");'
    + '};'
    + 'window.handleFileSelect=function(input,field){'
    + '  if(input.files[0]) uploadFile(input.files[0],field);'
    + '};'

    + 'window.closeEditModal=function(){document.getElementById("edit-modal").style.display="none";};'
    + 'window.saveEdit=function(){'
    + '  var id=document.getElementById("edit-id").value;'
    + '  var newCat=document.getElementById("edit-category").value;'
    + '  var p=catalog.find(function(c){return c.id===id});'
    + '  var body={id:id,rarity:document.getElementById("edit-rarity").value,description:document.getElementById("edit-description").value,bonus:document.getElementById("edit-bonus").value,tier:document.getElementById("edit-tier").value,tierPoints:parseInt(document.getElementById("edit-tierPoints").value)||0,imageUrl:document.getElementById("edit-imageUrl").value,animatedUrl:document.getElementById("edit-animatedUrl").value,hidden:document.getElementById("edit-hidden").checked};'
    + '  var promises=[];'
    + '  promises.push(fetch("/api/pets/catalog/edit",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired or server error. Please refresh the page.");}return r.json()}));'
    + '  if(p && newCat && newCat!==p.category){promises.push(fetch("/api/pets/catalog/move",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,newCategory:newCat})}).then(function(r){return r.json()}));}'
    + '  Promise.all(promises).then(function(results){'
    + '    var d=results[0];'
    + '    if(d.success){var idx=catalog.findIndex(function(c){return c.id===id});if(idx>=0){Object.assign(catalog[idx],body);if(results[1]&&results[1].success)catalog[idx].category=newCat;}renderStats();applyFilters();closeEditModal();}'
    + '    else{alert(d.error||"Failed to save");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    // Collect known givers for the selector
    + 'function getKnownGivers(){'
    + '  var givers={};'
    + '  pets.forEach(function(p){if(p.givenBy && p.givenBy.trim()){givers[p.givenBy.trim()]=true}});'
    + '  return Object.keys(givers).sort();'
    + '}'

    // Add / Remove pet — opens a givenBy selector modal
    + 'window._pendingAddPetId=null;'
    + 'window.addPet=function(petId){'
    + '  window._pendingAddPetId=petId;'
    + '  var givers=getKnownGivers();'
    + '  var sel=document.getElementById("givenby-select");'
    + '  sel.innerHTML="<option value=\\\"\\\">(no one)</option>";'
    + '  givers.forEach(function(g){var o=document.createElement("option");o.value=g;o.textContent=g;sel.appendChild(o)});'
    + '  var otherOpt=document.createElement("option");otherOpt.value="__other__";otherOpt.textContent="✏️ Other (type a name)";sel.appendChild(otherOpt);'
    + '  document.getElementById("givenby-other").style.display="none";'
    + '  document.getElementById("givenby-other").value="";'
    + '  sel.value="";'
    + '  document.getElementById("givenby-modal").style.display="flex";'
    + '};'
    + 'window.onGivenBySelectChange=function(){'
    + '  var v=document.getElementById("givenby-select").value;'
    + '  document.getElementById("givenby-other").style.display=v==="__other__"?"block":"none";'
    + '};'
    + 'window.closeGivenByModal=function(){document.getElementById("givenby-modal").style.display="none";window._pendingAddPetId=null;};'
    + 'window.confirmAddPet=function(){'
    + '  var petId=window._pendingAddPetId;'
    + '  if(!petId) return;'
    + '  var sel=document.getElementById("givenby-select").value;'
    + '  var givenBy=sel==="__other__"?document.getElementById("givenby-other").value.trim():sel;'
    + '  fetch("/api/pets/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({petId:petId,givenBy:givenBy||""})}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired or server error. Please refresh the page.");}return r.json()}).then(function(d){'
    + '    if(d.success){pets.push(d.pet);renderStats();applyFilters();closeGivenByModal();}'
    + '    else{alert(d.error||"Failed to add pet");}'
    + '  }).catch(function(e){alert("Error adding pet: "+e.message)});'
    + '};'
    + 'window.removeOnePet=function(petId){'
    + '  var instances=pets.filter(function(p){return p.petId===petId});'
    + '  if(instances.length===0){alert("No owned instance found");return;}'
    + '  var petName=(catalog.find(function(c){return c.id===petId})||{}).name||petId;'
    + '  var giverMap={};instances.forEach(function(p){var g=p.givenBy&&p.givenBy.trim()?p.givenBy.trim():"(no giver)";if(!giverMap[g])giverMap[g]=[];giverMap[g].push(p)});'
    + '  var giverNames=Object.keys(giverMap);'
    + '  if(giverNames.length<=1){'
    + '    var entry=instances[instances.length-1];'
    + '    var gLabel=entry.givenBy&&entry.givenBy.trim()?" (given by "+entry.givenBy.trim()+")":"";'
    + '    if(!confirm("Remove one "+petName+gLabel+"?")) return;'
    + '    doRemovePet(entry.id);'
    + '  } else {'
    + '    var html="<div style=\\"display:grid;gap:8px\\">";'
    + '    giverNames.forEach(function(g){'
    + '      var cnt=giverMap[g].length;'
    + '      html+=\'<button onclick="event.stopPropagation();doRemoveByGiver(\\\'\'+(g==="(no giver)"?"":g)+\'\\\',\\\'\'+ petId +\'\\\')" style="padding:10px;background:#2a2a2e;border:1px solid #444;border-radius:8px;color:#e0e0e0;cursor:pointer;text-align:left"><span style="font-weight:700">\'+ g +\'</span> <span style="color:#8b8fa3;font-size:11px">(x\'+ cnt +\')</span></button>\';'
    + '    });'
    + '    html+="</div>";'
    + '    var m=document.getElementById("remove-picker-modal");'
    + '    document.getElementById("remove-picker-title").textContent="Remove one "+petName;'
    + '    document.getElementById("remove-picker-list").innerHTML=html;'
    + '    m.style.display="flex";'
    + '  }'
    + '};'
    + 'window.doRemoveByGiver=function(giverName,petId){'
    + '  var entry=pets.slice().reverse().find(function(p){return p.petId===petId&&(giverName===""?(!(p.givenBy)||!p.givenBy.trim()):p.givenBy&&p.givenBy.trim()===giverName)});'
    + '  if(!entry){alert("No matching instance found");return;}'
    + '  doRemovePet(entry.id);'
    + '  document.getElementById("remove-picker-modal").style.display="none";'
    + '};'
    + 'window.doRemovePet=function(entryId){'
    + '  fetch("/api/pets/"+entryId,{method:"DELETE"}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired or server error. Please refresh the page.");}return r.json()}).then(function(d){'
    + '    if(d.success){pets.splice(pets.findIndex(function(p){return p.id===entryId}),1);renderStats();applyFilters();}'
    + '    else{alert(d.error||"Failed to remove pet");}'
    + '  }).catch(function(e){alert("Error removing pet: "+e.message)});'
    + '};'

    // Clear all pets
    + 'window.clearAllPets=function(){'
    + '  if(!confirm("Are you sure you want to remove ALL owned pets? This cannot be undone!")) return;'
    + '  if(!confirm("Really? This will clear the entire collection!")) return;'
    + '  fetch("/api/pets/clear-all",{method:"POST",headers:{"Content-Type":"application/json"}}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired.");}return r.json()}).then(function(d){'
    + '    if(d.success){pets.length=0;renderStats();applyFilters();}'
    + '    else{alert(d.error||"Failed to clear");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    // Delete entire category
    + 'window.deletePetCategory=function(cat){'
    + '  var count=catalog.filter(function(p){return p.category===cat}).length;'
    + '  if(!confirm("Delete the entire \\""+cat+"\\" category? This will remove "+count+" pet(s) from the catalog and all owned copies. This cannot be undone!")) return;'
    + '  fetch("/api/pets/catalog/delete-category",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({category:cat})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){location.reload();}else{alert(d.error||"Failed");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    // Move pet to different category
    + 'window.movePetCategory=function(petId,newCat){'
    + '  if(!newCat) return;'
    + '  fetch("/api/pets/catalog/move",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:petId,newCategory:newCat})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){var p=catalog.find(function(c){return c.id===petId});if(p)p.category=newCat;applyFilters();alert("Pet moved to "+newCat);}'
    + '    else{alert(d.error||"Failed");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    // Giveaway modal
    + 'window.onGiveawayGiverChange=function(){'
    + '  var v=document.getElementById("giveaway-giver-select").value;'
    + '  var wrap=document.getElementById("giveaway-giver-other-wrap");'
    + '  if(wrap) wrap.style.display=v==="__other__"?"block":"none";'
    + '  document.getElementById("giveaway-giver-other").style.display=v==="__other__"?"block":"none";'
    + '};'
    + 'window.openGiveawayModal=function(petId){'
    + '  var c=catalog.find(function(x){return x.id===petId});'
    + '  if(!c) return;'
    + '  document.getElementById("giveaway-petId").value=petId;'
    + '  var src=c.animatedUrl||c.imageUrl||"";'
    + '  document.getElementById("giveaway-pet-info").innerHTML=imgTag(src,c.name,c.emoji,64)+\'<div style="font-weight:700;margin-top:6px">\'+c.emoji+" "+c.name+\'</div><div style="font-size:11px;color:#8b8fa3">\'+c.rarity+\'</div>\';'
    + '  document.getElementById("giveaway-winner").value="";'
    + '  var givers=getKnownGivers();'
    + '  var sel=document.getElementById("giveaway-giver-select");'
    + '  sel.innerHTML="<option value=\\\"\\\">(select)</option>";'
    + '  givers.forEach(function(g){var o=document.createElement("option");o.value=g;o.textContent=g;sel.appendChild(o)});'
    + '  var otherOpt=document.createElement("option");otherOpt.value="__other__";otherOpt.textContent="✏️ Other (type a name)";sel.appendChild(otherOpt);'
    + '  sel.value="";'
    + '  document.getElementById("giveaway-giver-other").style.display="none";'
    + '  document.getElementById("giveaway-giver-other").value="";'
    + '  var otherWrap=document.getElementById("giveaway-giver-other-wrap");if(otherWrap)otherWrap.style.display="none";'
    + '  document.getElementById("giveaway-notes").value="";'
    + '  document.getElementById("giveaway-ping-giver").checked=false;'
    + '  document.getElementById("giveaway-ping-receiver").checked=true;'
    + '  document.getElementById("giveaway-ping-reason").value="pet-ready";'
    + '  var chSel=document.getElementById("giveaway-ping-channel");'
    + '  chSel.innerHTML="<option value=\\"1462225342881071307\\">📌 Stream Chat (default)</option><option value=\\"dm\\">📩 DM to winner</option>";'
    + '  var lastCat="";'
    + '  (serverChannels||[]).forEach(function(ch){'
    + '    if(ch.category&&ch.category!==lastCat){lastCat=ch.category;var og=document.createElement("optgroup");og.label=ch.category;chSel.appendChild(og)}'
    + '    var o=document.createElement("option");o.value=ch.id;o.textContent="# "+ch.name;'
    + '    if(lastCat){chSel.querySelector("optgroup:last-of-type").appendChild(o)}else{chSel.appendChild(o)}'
    + '  });'
    + '  chSel.value="1462225342881071307";'
    + '  document.getElementById("giveaway-winner-suggestions").style.display="none";'
    + '  document.getElementById("giveaway-modal").style.display="flex";'
    + '};'
    + 'window.closeGiveawayModal=function(){document.getElementById("giveaway-modal").style.display="none";};'

    // Name helper for autocomplete suggestions
    + 'window._knownNames=null;'
    + 'window._buildKnownNames=function(discordOnly){'
    + '  if(discordOnly){'
    + '    if(window._discordOnlyNames) return window._discordOnlyNames;'
    + '    var dn={};'
    + '    (discordNames||[]).forEach(function(m){'
    + '      if(m.username) dn[m.username.toLowerCase()]=m.username;'
    + '      if(m.displayName&&m.displayName!==m.username) dn[m.displayName.toLowerCase()]=m.displayName;'
    + '    });'
    + '    window._discordOnlyNames=Object.values(dn);'
    + '    return window._discordOnlyNames;'
    + '  }'
    + '  if(window._knownNames) return window._knownNames;'
    + '  var names={};'
    + '  pets.forEach(function(p){'
    + '    if(p.givenBy&&p.givenBy.trim()) names[p.givenBy.trim().toLowerCase()]=p.givenBy.trim();'
    + '    if(p.winner&&p.winner.trim()) names[p.winner.trim().toLowerCase()]=p.winner.trim();'
    + '  });'
    + '  pendingGiveaways.forEach(function(g){'
    + '    if(g.winner&&g.winner.trim()) names[g.winner.trim().toLowerCase()]=g.winner.trim();'
    + '    if(g.giver&&g.giver.trim()) names[g.giver.trim().toLowerCase()]=g.giver.trim();'
    + '  });'
    + '  (discordNames||[]).forEach(function(m){'
    + '    if(m.username) names[m.username.toLowerCase()]=m.username;'
    + '    if(m.displayName&&m.displayName!==m.username) names[m.displayName.toLowerCase()]=m.displayName;'
    + '  });'
    + '  window._knownNames=Object.values(names);'
    + '  return window._knownNames;'
    + '};'
    + 'window.giveawayNameHelper=function(input,field){'
    + '  var val=input.value.trim().toLowerCase();'
    + '  var sugDiv=document.getElementById("giveaway-"+field+"-suggestions");'
    + '  if(!val||val.length<1){sugDiv.style.display="none";return;}'
    + '  var names=window._buildKnownNames(field==="winner");'
    + '  var matches=names.filter(function(n){return n.toLowerCase().indexOf(val)!==-1});'
    + '  if(matches.length===0||matches.length===1&&matches[0].toLowerCase()===val){sugDiv.style.display="none";return;}'
    + '  sugDiv.innerHTML="";'
    + '  matches.slice(0,6).forEach(function(m){'
    + '    var d=document.createElement("div");'
    + '    d.textContent="\ud83d\udc64 "+m;'
    + '    d.style.cssText="padding:6px 10px;cursor:pointer;font-size:12px;color:#e0e0e0;border-bottom:1px solid #333";'
    + '    d.onmouseover=function(){d.style.background="#3a3d45"};'
    + '    d.onmouseout=function(){d.style.background=""};'
    + '    d.onclick=function(){input.value=m;sugDiv.style.display="none"};'
    + '    sugDiv.appendChild(d);'
    + '  });'
    + '  sugDiv.style.display="block";'
    + '};'

    + 'window.submitGiveaway=function(){'
    + '  var petId=document.getElementById("giveaway-petId").value;'
    + '  var winner=document.getElementById("giveaway-winner").value.trim();'
    + '  var selVal=document.getElementById("giveaway-giver-select").value;'
    + '  var giver=selVal==="__other__"?document.getElementById("giveaway-giver-other").value.trim():selVal;'
    + '  var notes=document.getElementById("giveaway-notes").value.trim();'
    + '  var pingGiver=document.getElementById("giveaway-ping-giver").checked;'
    + '  var pingReceiver=document.getElementById("giveaway-ping-receiver").checked;'
    + '  var pingReason=document.getElementById("giveaway-ping-reason").value;'
    + '  var pingChannel=document.getElementById("giveaway-ping-channel").value;'
    + '  if(!winner||!giver){alert("Please fill in winner and giver names.");return;}'
    + '  if(winner.length<2){alert("Winner name seems too short. Use their Discord username (e.g. johndoe) or display name.");return;}'
    + '  if(winner.includes(" ")&&!winner.includes("#")){if(!confirm("The winner name contains spaces but no # tag. Discord usernames usually don\\\'t have spaces.\\n\\nDid you mean to use their Discord username instead?\\n\\nClick OK to submit anyway, or Cancel to fix it.")) return;}'
    + '  window._knownNames=null;'
    + '  fetch("/api/pets/giveaway",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({petId:petId,winner:winner,giver:giver,notes:notes,pingGiver:pingGiver,pingReceiver:pingReceiver,pingReason:pingReason,pingChannel:pingChannel})}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired.");}return r.json()}).then(function(d){'
    + '    if(d.success){alert("Giveaway submitted! An admin can confirm it in the Pet Giveaway History tab.");closeGiveawayModal();}'
    + '    else{alert(d.error||"Failed");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    // Random pet picker
    + 'window.openRandomPicker=function(){'
    + '  var ownedIds=[...new Set(pets.map(function(p){return p.petId}))];'
    + '  if(ownedIds.length===0){alert("No pets owned to pick from!");return;}'
    + '  var html="";'
    + '  ownedIds.forEach(function(id){'
    + '    var c=catalog.find(function(x){return x.id===id});'
    + '    if(!c) return;'
    + '    html+=\'<label style="display:flex;align-items:center;gap:8px;padding:6px 8px;border-radius:6px;cursor:pointer;margin-bottom:4px;background:#1e1f22"><input type="checkbox" class="random-check" value="\'+c.id+\'" checked><span>\'+c.emoji+" "+c.name+\'</span><span style="font-size:10px;color:#8b8fa3">\'+c.rarity+\'</span></label>\';'
    + '  });'
    + '  document.getElementById("random-pet-list").innerHTML=html;'
    + '  document.getElementById("random-result").innerHTML="";'
    + '  document.getElementById("random-modal").style.display="flex";'
    + '};'
    + 'window.closeRandomModal=function(){document.getElementById("random-modal").style.display="none";};'
    + 'window.randomSelectAll=function(v){document.querySelectorAll(".random-check").forEach(function(cb){cb.checked=v});};'
    + 'window.spinRandom=function(){'
    + '  var selected=[];document.querySelectorAll(".random-check:checked").forEach(function(cb){selected.push(cb.value)});'
    + '  if(selected.length===0){alert("Select at least one pet!");return;}'
    + '  var resultEl=document.getElementById("random-result");'
    + '  var spins=0,maxSpins=15,interval=setInterval(function(){'
    + '    var rId=selected[Math.floor(Math.random()*selected.length)];'
    + '    var c=catalog.find(function(x){return x.id===rId});'
    + '    if(c) resultEl.innerHTML=\'<div style="font-size:40px;animation:pulse .3s">\'+c.emoji+\'</div><div style="font-weight:700">\'+c.name+\'</div>\';'
    + '    spins++;'
    + '    if(spins>=maxSpins){clearInterval(interval);'
    + '      var winnerId=selected[Math.floor(Math.random()*selected.length)];'
    + '      var w=catalog.find(function(x){return x.id===winnerId});'
    + '      if(w){var src=w.animatedUrl||w.imageUrl||"";'
    + '        resultEl.innerHTML=\'<div style="font-size:14px;color:#f39c12;margin-bottom:8px">🎉 Winner!</div>\'+imgTag(src,w.name,w.emoji,80)+\'<div style="font-weight:700;font-size:18px;margin-top:8px">\'+w.emoji+" "+w.name+\'</div><div style="font-size:12px;color:\'+rarityColors[w.rarity]+\'">\'+w.rarity+\'</div>\';'
    + '      }'
    + '    }'
    + '  },100);'
    + '};'

    // Suggest best pet (highest tier/points not owned)
    + 'window.openSuggestBest=function(){'
    + '  var ownedIds=new Set(pets.map(function(p){return p.petId}));'
    + '  var tierOrder={S:5,A:4,B:3,C:2,D:1};'
    + '  var unowned=catalog.filter(function(c){return !ownedIds.has(c.id)&&!c.hidden});'
    + '  if(unowned.length===0){document.getElementById("suggest-result").innerHTML=\'<div style="color:#2ecc71;font-size:16px;font-weight:700;padding:20px">🎉 You own all available pets!</div>\';document.getElementById("suggest-modal").style.display="flex";return;}'
    + '  unowned.sort(function(a,b){'
    + '    var ta=tierOrder[a.tier]||0,tb=tierOrder[b.tier]||0;'
    + '    if(tb!==ta) return tb-ta;'
    + '    return (b.tierPoints||0)-(a.tierPoints||0);'
    + '  });'
    + '  var best=unowned[0];'
    + '  var src=best.animatedUrl||best.imageUrl||"";'
    + '  var bc=rarityColors[best.rarity]||"#8b8fa3";'
    + '  var tierColor=best.tier==="S"?"#ff4444":best.tier==="A"?"#f39c12":best.tier==="B"?"#3498db":best.tier==="C"?"#2ecc71":"#8b8fa3";'
    + '  document.getElementById("suggest-result").innerHTML='
    + '    \'<div style="margin-bottom:12px;color:#f39c12;font-size:14px">We recommend getting:</div>\''
    + '    +imgTag(src,best.name,best.emoji,96)'
    + '    +\'<div style="font-weight:700;font-size:20px;margin-top:10px">\'+best.emoji+" "+best.name+\'</div>\''
    + '    +\'<div style="color:\'+bc+\';font-size:12px;text-transform:uppercase">\'+best.rarity+\'</div>\''
    + '    +(best.tier?\'<div style="font-weight:700;color:\'+tierColor+\';font-size:14px;margin-top:4px">\'+best.tier+\' Rank\'+(best.tierPoints?" \\u2022 "+best.tierPoints+"pts":"")+\'</div>\':"<div style=\\"font-size:11px;color:#555;margin-top:4px\\">No tier assigned</div>")'
    + '    +(best.bonus?\'<div style="color:#f1c40f;font-size:11px;margin-top:4px">\\u26a1 \'+best.bonus+\'</div>\':"")'
    + '    +\'<div style="margin-top:12px"><button onclick="addPet(\\\'\'+best.id+\'\\\');closeSuggestModal()" style="padding:8px 24px;background:#9146ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">\\u2795 Add This Pet</button></div>\';'
    + '  document.getElementById("suggest-modal").style.display="flex";'
    + '};'
    + 'window.closeSuggestModal=function(){document.getElementById("suggest-modal").style.display="none";};'

    // Create pet modal
    + 'window.openCreatePetModal=function(cat){'
    + '  var sel=document.getElementById("create-pet-category");'
    + '  sel.innerHTML="";'
    + '  categories.forEach(function(c){var o=document.createElement("option");o.value=c;o.textContent=(categoryIcons[c]||"📁")+" "+c;sel.appendChild(o)});'
    + '  if(categories.indexOf(cat)===-1){var o2=document.createElement("option");o2.value=cat;o2.textContent="📁 "+cat;sel.insertBefore(o2,sel.firstChild)}'
    + '  sel.value=cat;'
    + '  document.getElementById("create-pet-title").textContent="\u2795 New Pet";'
    + '  sel.onchange=function(){document.getElementById("create-pet-title").textContent="\u2795 New Pet in "+sel.value};'
    + '  document.getElementById("create-pet-name").value="";'
    + '  document.getElementById("create-pet-emoji").value="";'
    + '  document.getElementById("create-pet-rarity").value="common";'
    + '  document.getElementById("create-pet-tier").value="";'
    + '  document.getElementById("create-pet-desc").value="";'
    + '  document.getElementById("create-pet-bonus").value="";'
    + '  document.getElementById("create-pet-image").value="";'
    + '  document.getElementById("create-pet-modal").style.display="flex";'
    + '};'
    + 'window.closeCreatePetModal=function(){document.getElementById("create-pet-modal").style.display="none";};'
    + 'window.submitCreatePet=function(){'
    + '  var name=document.getElementById("create-pet-name").value.trim();'
    + '  var emoji=document.getElementById("create-pet-emoji").value.trim()||"\ud83d\udc3e";'
    + '  var category=document.getElementById("create-pet-category").value;'
    + '  var rarity=document.getElementById("create-pet-rarity").value;'
    + '  var tier=document.getElementById("create-pet-tier").value;'
    + '  var description=document.getElementById("create-pet-desc").value.trim();'
    + '  var bonus=document.getElementById("create-pet-bonus").value.trim();'
    + '  var imageUrl=document.getElementById("create-pet-image").value.trim();'
    + '  if(!name){alert("Please enter a pet name");return;}'
    + '  fetch("/api/pets/catalog/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name,emoji:emoji,category:category,rarity:rarity,tier:tier,description:description,bonus:bonus,imageUrl:imageUrl})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){catalog.push(d.pet);renderStats();applyFilters();closeCreatePetModal();alert("Pet created!");}'
    + '    else{alert(d.error||"Failed to create pet");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    // Initial render
    + 'console.log("[Pets] Calling initial render...");'
    + 'renderStats();applyFilters();'
    + 'console.log("[Pets] Initial render complete");'

    // Instant updates via Server-Sent Events
    + 'var petsEventSource=new EventSource("/api/pets/stream");'
    + 'petsEventSource.onmessage=function(ev){'
    + '  if(ev.data==="update"){'
    + '    fetch("/api/pets").then(function(r){return r.json()}).then(function(d){'
    + '      if(d && d.pets && d.catalog){'
    + '        pets.length=0;d.pets.forEach(function(p){pets.push(p)});'
    + '        catalog.length=0;d.catalog.forEach(function(c){catalog.push(c)});'
    + '        if(d.pendingGiveaways){pendingGiveaways.length=0;d.pendingGiveaways.forEach(function(pg){pendingGiveaways.push(pg)});}'
    + '        renderStats();applyFilters();'
    + '        console.log("[Pets] Live update: "+pets.length+" pets");'
    + '      }'
    + '    }).catch(function(){});'
    + '  }'
    + '};'
    + 'petsEventSource.onerror=function(){console.warn("[Pets] SSE connection lost, retrying...");};'

    + '}catch(err){console.error("[Pets] Error:",err);alert("Pet system error: "+err.message);}'
    + '})();'
    + '</script>';
}

// ====================== PET APPROVALS TAB ======================
export function renderPetApprovalsTab(userTier) {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const isAdmin = userTier === 'admin' || userTier === 'owner';
  const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [], pendingPets: [] });
  const pending = (petsData.pendingPets || []).filter(p => p.status === 'pending');
  // Build history: include formal approvals/rejections AND legacy pets added before approval system
  const formalHistory = (petsData.pendingPets || []).filter(p => p.status !== 'pending');
  const legacyPets = (petsData.pets || []).filter(p => {
    // Only include pets that don't already have a matching pendingPets entry
    return !formalHistory.some(h => h.status === 'approved' && h.petId === p.petId && h.requestedBy === p.addedBy && h.approvedAt === p.addedAt);
  }).map(p => ({
    id: p.id,
    petId: p.petId,
    requestedBy: p.addedBy || 'unknown',
    requestedByName: p.addedByName || p.givenBy || 'Legacy',
    requestedAt: p.addedAt || new Date(0).toISOString(),
    givenBy: p.givenBy || p.addedByName || 'Unknown',
    status: 'approved',
    approvedBy: p.approvedBy || 'Legacy (pre-approval system)',
    approvedAt: p.addedAt || new Date(0).toISOString(),
    isLegacy: true
  }));
  const recentHistory = [...formalHistory, ...legacyPets].sort((a, b) => new Date(b.approvedAt || b.rejectedAt || 0) - new Date(a.approvedAt || a.rejectedAt || 0)).slice(0, 50);
  const catalog = petsData.catalog || [];

  return '<div class="card">'
    + '<h2>🐾 Pending Pet Approvals</h2>'
    + '<p style="color:#8b8fa3;font-size:13px;margin-top:-4px">Review and approve pets submitted by members via the <code>/pet add</code> command.</p>'
    + '<div id="pending-stats" style="display:flex;gap:12px;margin:16px 0;flex-wrap:wrap">'
    + '<div style="padding:10px 18px;background:#f39c1215;border:1px solid #f39c1233;border-radius:8px;text-align:center"><div style="font-size:22px;font-weight:700;color:#f39c12" id="pending-count">' + pending.length + '</div><div style="font-size:11px;color:#8b8fa3">Pending</div></div>'
    + '<div style="padding:10px 18px;background:#2ecc7115;border:1px solid #2ecc7133;border-radius:8px;text-align:center"><div style="font-size:22px;font-weight:700;color:#2ecc71">' + (petsData.pendingPets || []).filter(p => p.status === 'approved').length + '</div><div style="font-size:11px;color:#8b8fa3">Approved</div></div>'
    + '<div style="padding:10px 18px;background:#e74c3c15;border:1px solid #e74c3c33;border-radius:8px;text-align:center"><div style="font-size:22px;font-weight:700;color:#e74c3c">' + (petsData.pendingPets || []).filter(p => p.status === 'rejected').length + '</div><div style="font-size:11px;color:#8b8fa3">Rejected</div></div>'
    + '</div>'
    + (isAdmin && pending.length > 0 ? '<div style="display:flex;gap:8px;margin-bottom:16px"><button onclick="approveAllPending()" style="padding:8px 16px;background:#2ecc7122;color:#2ecc71;border:1px solid #2ecc7144;border-radius:6px;cursor:pointer;font-weight:600">✅ Approve All (' + pending.length + ')</button><button onclick="rejectAllPending()" style="padding:8px 16px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:6px;cursor:pointer;font-weight:600">❌ Reject All</button></div>' : '')
    + '</div>'

    // Pending list
    + '<div class="card">'
    + '<h3 style="margin-top:0">⏳ Pending Requests</h3>'
    + '<div id="pending-list"></div>'
    + '</div>'

    // Recent history
    + '<div class="card">'
    + '<h3 style="margin-top:0">📋 Approval History</h3>'
    + '<div style="display:flex;gap:8px;margin-bottom:12px;flex-wrap:wrap;align-items:end">'
    + '<div style="flex:1;min-width:160px"><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Search</label><input id="hist-search" oninput="renderHistory()" placeholder="Pet name or requester..." style="width:100%;margin:4px 0"></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Status</label><select id="hist-status" onchange="renderHistory()" style="margin:4px 0"><option value="">All</option><option value="approved">Approved</option><option value="rejected">Rejected</option></select></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Type</label><select id="hist-type" onchange="renderHistory()" style="margin:4px 0"><option value="">All</option><option value="formal">Formal</option><option value="legacy">Legacy</option></select></div>'
    + '</div>'
    + '<div id="approval-history"></div>'
    + '<div id="hist-sentinel" style="height:1px"></div>'
    + '<div id="hist-loading" style="display:none;text-align:center;padding:12px;color:#8b8fa3">Loading more...</div>'
    + '</div>'

    // Reject reason modal
    + '<div id="reject-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:400px;width:100%">'
    + '<h2 style="margin-top:0">❌ Reject Pet</h2>'
    + '<input type="hidden" id="reject-pending-id">'
    + '<div id="reject-pet-info" style="margin-bottom:12px"></div>'
    + '<label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Reason (optional)</label>'
    + '<input type="text" id="reject-reason" placeholder="Why is this being rejected?" style="margin:4px 0;width:100%;box-sizing:border-box">'
    + '<div style="display:flex;gap:10px;margin-top:12px">'
    + '<button onclick="confirmReject()" style="flex:1;padding:10px;background:#e74c3c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">❌ Reject</button>'
    + '<button onclick="document.getElementById(\'reject-modal\').style.display=\'none\'" style="flex:1;padding:10px;background:#333;color:#ccc;border:1px solid #555;border-radius:6px;cursor:pointer">Cancel</button>'
    + '</div></div></div>'

    + '<script>'
    + '(function(){'
    + 'var pending=' + safeJsonForHtml(pending.map(p => {
      const cat = catalog.find(c => c.id === p.petId);
      return { ...p, petName: cat?.name || p.petId, petEmoji: cat?.emoji || '🐾', petRarity: cat?.rarity || 'common', petImage: cat?.animatedUrl || cat?.imageUrl || '', petBonus: cat?.bonus || '' };
    })) + ';'
    + 'var history=' + safeJsonForHtml(recentHistory.map(p => {
      const cat = catalog.find(c => c.id === p.petId);
      return { ...p, petName: cat?.name || p.petId, petEmoji: cat?.emoji || '🐾', petRarity: cat?.rarity || 'common' };
    })) + ';'
    + 'var isAdmin=' + (isAdmin ? 'true' : 'false') + ';'
    + 'var rarityColors={common:"#8b8fa3",uncommon:"#2ecc71",rare:"#3498db",legendary:"#f39c12"};'

    + 'function timeAgo(d){if(!d)return"";var s=Math.floor((Date.now()-new Date(d).getTime())/1000);if(s<60)return s+"s ago";if(s<3600)return Math.floor(s/60)+"m ago";if(s<86400)return Math.floor(s/3600)+"h ago";return Math.floor(s/86400)+"d ago";}'

    + 'function renderPending(){'
    + '  var el=document.getElementById("pending-list");'
    + '  if(pending.length===0){el.innerHTML=\'<div style="text-align:center;padding:30px;color:#8b8fa3"><div style="font-size:48px;margin-bottom:12px">✅</div><div>No pending pet requests!</div></div>\';return;}'
    + '  var html=\'<div style="display:grid;gap:10px">\';'
    + '  pending.forEach(function(p){'
    + '    var bc=rarityColors[p.petRarity]||"#8b8fa3";'
    + '    html+=\'<div style="display:flex;align-items:center;gap:14px;padding:14px;background:#1e1f22;border-radius:10px;border-left:4px solid \'+bc+\'">\''
    + '      +\'<div style="font-size:36px;flex-shrink:0">\'+p.petEmoji+\'</div>\''
    + '      +\'<div style="flex:1;min-width:0">\''
    + '        +\'<div style="font-weight:700;font-size:15px">\'+p.petEmoji+\' \'+p.petName+\'</div>\''
    + '        +\'<div style="font-size:11px;color:\'+bc+\';text-transform:uppercase;letter-spacing:.5px">\'+p.petRarity+\'</div>\''
    + '        +(p.petBonus?\'<div style="font-size:10px;color:#f1c40f;margin-top:2px">⚡ \'+p.petBonus+\'</div>\':"")'
    + '        +\'<div style="font-size:11px;color:#8b8fa3;margin-top:4px">Requested by <b>\'+p.requestedByName+\'</b> \u2022 \'+timeAgo(p.requestedAt)+\'</div>\''
    + '        +(p.givenBy&&p.givenBy!==p.requestedByName?\'<div style="font-size:10px;color:#9b59b6;margin-top:2px">🎁 Given by \'+p.givenBy+\'</div>\':"")'
    + '      +\'</div>\''
    + '      +(isAdmin?\'<div style="display:flex;gap:6px;flex-shrink:0">\''
    + '        +\'<button onclick="approvePet(\\\'\'+p.id+\'\\\')" style="padding:8px 14px;background:#2ecc71;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px" title="Approve">✅</button>\''
    + '        +\'<button onclick="openRejectModal(\\\'\'+p.id+\'\\\',\\\'\'+p.petName+\'\\\')" style="padding:8px 14px;background:#e74c3c;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700;font-size:13px" title="Reject">❌</button>\''
    + '      +\'</div>\':"")'
    + '    +\'</div>\';'
    + '  });'
    + '  html+=\'</div>\';'
    + '  el.innerHTML=html;'
    + '}'

    + 'var histPage=0;var histPageSize=50;var filteredHistory=[];'
    + 'function getFilteredHistory(){'
    + '  var search=(document.getElementById("hist-search").value||"").toLowerCase().trim();'
    + '  var status=document.getElementById("hist-status").value;'
    + '  var htype=document.getElementById("hist-type").value;'
    + '  return history.filter(function(p){'
    + '    if(status && p.status!==status) return false;'
    + '    if(htype==="legacy" && !p.isLegacy) return false;'
    + '    if(htype==="formal" && p.isLegacy) return false;'
    + '    if(search && p.petName.toLowerCase().indexOf(search)===-1 && (p.requestedByName||"").toLowerCase().indexOf(search)===-1) return false;'
    + '    return true;'
    + '  });'
    + '}'
    + 'function renderHistory(){'
    + '  histPage=0;'
    + '  filteredHistory=getFilteredHistory();'
    + '  var el=document.getElementById("approval-history");'
    + '  if(filteredHistory.length===0){el.innerHTML=\'<div style="text-align:center;padding:20px;color:#8b8fa3">No matching history.</div>\';return;}'
    + '  el.innerHTML="";'
    + '  loadMoreHistory();'
    + '}'
    + 'function loadMoreHistory(){'
    + '  var el=document.getElementById("approval-history");'
    + '  var start=histPage*histPageSize;'
    + '  var batch=filteredHistory.slice(start,start+histPageSize);'
    + '  if(batch.length===0){document.getElementById("hist-loading").style.display="none";return;}'
    + '  var html="";'
    + '  batch.forEach(function(p){'
    + '    var statusColor=p.status==="approved"?"#2ecc71":"#e74c3c";'
    + '    var statusIcon=p.status==="approved"?"✅":"❌";'
    + '    var actionBy=p.status==="approved"?p.approvedBy:p.rejectedBy;'
    + '    var actionAt=p.status==="approved"?p.approvedAt:p.rejectedAt;'
    + '    var legacyBadge=p.isLegacy?\'<span style="font-size:9px;background:#f39c1222;color:#f39c12;padding:1px 6px;border-radius:8px;margin-left:6px">legacy</span>\':"";'
    + '    html+=\'<div style="display:flex;align-items:center;gap:10px;padding:8px 12px;background:#1e1f22;border-radius:6px;border-left:3px solid \'+statusColor+\';margin-bottom:4px">\''
    + '      +\'<span>\'+statusIcon+\'</span>\''
    + '      +\'<span style="font-weight:600">\'+p.petEmoji+\' \'+p.petName+legacyBadge+\'</span>\''
    + '      +\'<span style="font-size:11px;color:#8b8fa3">by \'+p.requestedByName+\'</span>\''
    + '      +\'<span style="font-size:11px;color:\'+statusColor+\';margin-left:auto">\'+p.status+\' by \'+(actionBy||"?")+\' \u2022 \'+timeAgo(actionAt)+\'</span>\''
    + '      +(p.rejectReason?\'<span style="font-size:10px;color:#e74c3c" title="Reason: \'+p.rejectReason+\'">📝</span>\':"")'
    + '    +\'</div>\';'
    + '  });'
    + '  el.insertAdjacentHTML("beforeend",html);'
    + '  histPage++;'
    + '  document.getElementById("hist-loading").style.display=(start+histPageSize<filteredHistory.length)?"block":"none";'
    + '}'
    + 'var histObserver=new IntersectionObserver(function(entries){if(entries[0].isIntersecting)loadMoreHistory()},{rootMargin:"200px"});'
    + 'var sentinel=document.getElementById("hist-sentinel");if(sentinel)histObserver.observe(sentinel);'

    + 'window.approvePet=function(id){'
    + '  fetch("/api/pets/pending/approve",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){pending=pending.filter(function(p){return p.id!==id});renderPending();document.getElementById("pending-count").textContent=pending.length;}'
    + '    else{alert(d.error||"Failed to approve");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    + 'window.openRejectModal=function(id,name){'
    + '  document.getElementById("reject-pending-id").value=id;'
    + '  document.getElementById("reject-pet-info").innerHTML="<b>"+name+"</b>";'
    + '  document.getElementById("reject-reason").value="";'
    + '  document.getElementById("reject-modal").style.display="flex";'
    + '};'

    + 'window.confirmReject=function(){'
    + '  var id=document.getElementById("reject-pending-id").value;'
    + '  var reason=document.getElementById("reject-reason").value.trim();'
    + '  fetch("/api/pets/pending/reject",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,reason:reason})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){pending=pending.filter(function(p){return p.id!==id});renderPending();document.getElementById("pending-count").textContent=pending.length;document.getElementById("reject-modal").style.display="none";}'
    + '    else{alert(d.error||"Failed to reject");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    + 'window.approveAllPending=function(){'
    + '  if(!confirm("Approve all "+pending.length+" pending pets?"))return;'
    + '  fetch("/api/pets/pending/approve-all",{method:"POST",headers:{"Content-Type":"application/json"}}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){pending=[];renderPending();document.getElementById("pending-count").textContent="0";alert("✅ "+d.approved+" pets approved!");}'
    + '    else{alert(d.error||"Failed");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    + 'window.rejectAllPending=function(){'
    + '  var reason=prompt("Reject all "+pending.length+" pending pets? Enter reason (optional):");'
    + '  if(reason===null)return;'
    + '  fetch("/api/pets/pending/reject-all",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reason:reason})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){pending=[];renderPending();document.getElementById("pending-count").textContent="0";alert("❌ "+d.rejected+" pets rejected.");}'
    + '    else{alert(d.error||"Failed");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    + 'renderPending();renderHistory();'
    + '})();'
    + '</script>';
}

// ====================== PET GIVEAWAY HISTORY TAB ======================
export function renderPetGiveawaysTab(userTier) {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const giveaways = loadJSON(path.join(DATA_DIR, 'pet-giveaways.json'), { history: [] });
  const bans = loadJSON(path.join(DATA_DIR, 'pet-giveaway-bans.json'), { banned: [] });
  const history = giveaways.history || [];
  const giveawaysJSON = safeJsonForHtml(history);
  const bansJSON = safeJsonForHtml(bans.banned || []);
  const isAdmin = userTier === 'admin' || userTier === 'owner';

  return '<div class="card">'
    + '<h2>🎁 Pet Giveaway Management</h2>'
    + '<p style="color:#8b8fa3;font-size:13px;margin-top:-4px">Track pet giveaways, comments, stats, and manage banned givers.</p>'
    + '</div>'
    + '<div class="card">'
    + '<div style="display:flex;gap:8px;margin-bottom:20px;border-bottom:1px solid #333;padding-bottom:12px;flex-wrap:wrap;align-items:center;justify-content:flex-start">'
    + '<button onclick="switchGiveawayTab(\'history\')" id="tab-history" style="padding:8px 16px;background:#9146ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;width:auto;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;white-space:nowrap;">📋 History</button>'
    + '<button onclick="switchGiveawayTab(\'comments\')" id="tab-comments" style="padding:8px 16px;background:#1e1f22;color:#ccc;border:1px solid #333;border-radius:4px;cursor:pointer;width:auto;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;white-space:nowrap;">💬 Comments</button>'
    + '<button onclick="switchGiveawayTab(\'stats\')" id="tab-stats" style="padding:8px 16px;background:#1e1f22;color:#ccc;border:1px solid #333;border-radius:4px;cursor:pointer;width:auto;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;white-space:nowrap;">📊 Stats</button>'
    + (isAdmin ? '<button onclick="switchGiveawayTab(\'bans\')" id="tab-bans" style="padding:8px 16px;background:#1e1f22;color:#ccc;border:1px solid #333;border-radius:4px;cursor:pointer;width:auto;display:inline-flex;align-items:center;justify-content:center;flex:0 0 auto;white-space:nowrap;">🚫 Ban List</button>' : '')
    + '</div>'
    
    // History Tab
    + '<div id="giveaway-history-tab" style="display:block">'
    + '<div style="display:flex;gap:12px;margin-bottom:16px;flex-wrap:wrap;align-items:center">'
    + '<select id="giveaway-filter" onchange="filterGiveaways()" style="padding:6px 12px"><option value="">All</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option></select>'
    + '<input type="text" id="giveaway-search" oninput="filterGiveaways()" placeholder="Search by pet, winner, giver..." style="padding:6px 12px;background:#1e1f22;border:1px solid #333;border-radius:6px;color:#e0e0e0;flex:1;min-width:200px">'
    + '</div>'
    + '<div id="giveaway-list"></div>'
    + '<div id="giveaway-sentinel" style="height:1px"></div>'
    + '<div id="giveaway-loading" style="display:none;text-align:center;padding:12px;color:#8b8fa3">Loading more...</div>'
    + '</div>'
    
    // Comments Tab
    + '<div id="giveaway-comments-tab" style="display:none">'
    + '<p style="color:#8b8fa3;margin-bottom:16px">Click on a giveaway to view and manage comments. Admins/Mods can add comments.</p>'
    + '<div id="giveaway-comments-list"></div>'
    + '</div>'
    
    // Stats Tab
    + '<div id="giveaway-stats-tab" style="display:none">'
    + '<div id="giveaway-stats-content"></div>'
    + '</div>'
    
    // Bans Tab (admin only)
    + (isAdmin ? '<div id="giveaway-bans-tab" style="display:none">'
    + '<div style="margin-bottom:20px;padding:12px;background:#e74c3c22;border:1px solid #e74c3c44;border-radius:8px">'
    + '<label style="color:#e0e0e0;display:block;margin-bottom:8px">Ban a giver from giving out pets:</label>'
    + '<div style="display:flex;gap:8px;flex-wrap:wrap">'
    + '<input type="text" id="ban-user-id" placeholder="User ID or Discord name" style="padding:6px 12px;background:#1e1f22;border:1px solid #333;border-radius:6px;color:#e0e0e0;flex:1;min-width:200px">'
    + '<input type="text" id="ban-reason" placeholder="Reason (optional)" style="padding:6px 12px;background:#1e1f22;border:1px solid #333;border-radius:6px;color:#e0e0e0;flex:1;min-width:200px">'
    + '<button onclick="addBan()" style="padding:6px 16px;background:#e74c3c;color:#fff;border:none;border-radius:4px;cursor:pointer;font-weight:600;">Ban User</button>'
    + '</div>'
    + '</div>'
    + '<div id="giveaway-bans-list"></div>'
    + '</div>' : '')
    
    + '</div>'
    + '<script>'
    + '(function(){'
    + 'var history=' + giveawaysJSON + ';'
    + 'var bans=' + bansJSON + ';'
    + 'var isAdmin=' + (isAdmin ? 'true' : 'false') + ';'
    + 'var rarityColors={common:"#8b8fa3",uncommon:"#2ecc71",rare:"#3498db",epic:"#9146ff",legendary:"#f39c12"};'

    + 'window.switchGiveawayTab=function(tab){'
    + '  document.getElementById("giveaway-history-tab").style.display=(tab==="history"?"block":"none");'
    + '  document.getElementById("giveaway-comments-tab").style.display=(tab==="comments"?"block":"none");'
    + '  document.getElementById("giveaway-stats-tab").style.display=(tab==="stats"?"block":"none");'
    + '  if(isAdmin) document.getElementById("giveaway-bans-tab").style.display=(tab==="bans"?"block":"none");'
    + '  ["history","comments","stats"' + (isAdmin ? ',"bans"' : '') + '].forEach(function(t){'
    + '    var el=document.getElementById("tab-"+t);'
    + '    if(el) el.style.background=(t===tab?"#9146ff":"#1e1f22");'
    + '    if(el) el.style.color=(t===tab?"#fff":"#ccc");'
    + '    if(el) el.style.border=(t===tab?"none":"1px solid #333");'
    + '  });'
    + '  if(tab==="stats") renderStatsTab();'
    + '  if(tab==="comments") renderCommentsTab();'
    + '  if(tab==="bans") renderBansTab();'
    + '};'

    + 'function renderStatsTab(){'
    + '  fetch("/api/pets/giveaway/stats").then(function(r){return r.json()}).then(function(stats){'
    + '    var html="<div style=\\"display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px;margin-bottom:20px\\">";'
    + '    html+="<div style=\\"padding:16px;background:#9146ff15;border:1px solid #9146ff33;border-radius:8px;text-align:center\\">";'
    + '      html+="<div style=\\"font-size:24px;font-weight:700;color:#9146ff\\">"+stats.totalGiveaways+"</div>";'
    + '      html+="<div style=\\"font-size:11px;color:#8b8fa3;margin-top:4px\\">Total Giveaways</div>";'
    + '    html+="</div>";'
    + '    html+="<div style=\\"padding:16px;background:#2ecc7115;border:1px solid #2ecc7133;border-radius:8px;text-align:center\\">";'
    + '      html+="<div style=\\"font-size:24px;font-weight:700;color:#2ecc71\\">"+stats.confirmedGiveaways+"</div>";'
    + '      html+="<div style=\\"font-size:11px;color:#8b8fa3;margin-top:4px\\">Confirmed</div>";'
    + '    html+="</div>";'
    + '    html+="<div style=\\"padding:16px;background:#f39c1215;border:1px solid #f39c1233;border-radius:8px;text-align:center\\">";'
    + '      html+="<div style=\\"font-size:24px;font-weight:700;color:#f39c12\\">"+stats.pendingGiveaways+"</div>";'
    + '      html+="<div style=\\"font-size:11px;color:#8b8fa3;margin-top:4px\\">Pending</div>";'
    + '    html+="</div>";'
    + '    html+="<div style=\\"padding:16px;background:#3498db15;border:1px solid #3498db33;border-radius:8px;text-align:center\\">";'
    + '      html+="<div style=\\"font-size:24px;font-weight:700;color:#3498db\\">"+stats.confirmationRate+"%</div>";'
    + '      html+="<div style=\\"font-size:11px;color:#8b8fa3;margin-top:4px\\">Confirmation Rate</div>";'
    + '    html+="</div>";'
    + '    html+="</div>";'
    + '    html+="<h3 style=\\"margin:20px 0 12px\\">🏆 Top Givers</h3>";'
    + '    if(stats.topGivers.length>0){'
    + '      html+="<div style=\\"background:#1e1f22;border:1px solid #2a2a3a;border-radius:8px;padding:12px\\">";'
    + '      stats.topGivers.forEach(function(g,i){'
    + '        html+="<div style=\\"display:flex;justify-content:space-between;padding:8px 0;border-bottom:"+(i<stats.topGivers.length-1?"1px solid #333":"none")+"\\">";'
    + '        html+="<span style=\\"color:#e0e0e0\\">"+g.name+"</span>";'
    + '        html+="<span style=\\"color:#9146ff;font-weight:600\\">"+g.count+" pets</span>";'
    + '        html+="</div>";'
    + '      });'
    + '      html+="</div>";'
    + '    }'
    + '    html+="<h3 style=\\"margin:20px 0 12px\\">🐾 Most Given Pets</h3>";'
    + '    if(stats.topPets.length>0){'
    + '      html+="<div style=\\"background:#1e1f22;border:1px solid #2a2a3a;border-radius:8px;padding:12px\\">";'
    + '      stats.topPets.forEach(function(p,i){'
    + '        html+="<div style=\\"display:flex;justify-content:space-between;padding:8px 0;border-bottom:"+(i<stats.topPets.length-1?"1px solid #333":"none")+"\\">";'
    + '        html+="<span style=\\"color:#e0e0e0\\">"+p.name+"</span>";'
    + '        html+="<span style=\\"color:#2ecc71;font-weight:600\\">"+p.count+" times</span>";'
    + '        html+="</div>";'
    + '      });'
    + '      html+="</div>";'
    + '    }'
    + '    html+="<h3 style=\\"margin:20px 0 12px\\">💎 Rarity Breakdown</h3>";'
    + '    if(stats.rarityBreakdown.length>0){'
    + '      html+="<div style=\\"background:#1e1f22;border:1px solid #2a2a3a;border-radius:8px;padding:12px\\">";'
    + '      stats.rarityBreakdown.forEach(function(r,i){'
    + '        var rColor=rarityColors[r.rarity]||"#8b8fa3";'
    + '        var pct=Math.round((r.count/stats.totalGiveaways)*100);'
    + '        html+="<div style=\\"display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:"+(i<stats.rarityBreakdown.length-1?"1px solid #333":"none")+"\\">";'
    + '        html+="<span style=\\"color:"+rColor+";font-weight:600;min-width:70px\\">"+r.rarity+"</span>";'
    + '        html+="<div style=\\"flex:1;height:24px;background:#333;border-radius:4px;overflow:hidden\\"><div style=\\"height:100%;background:"+rColor+";width:"+pct+"%\\"></div></div>";'
    + '        html+="<span style=\\"color:#8b8fa3;font-size:12px;min-width:60px\\">" + r.count + " ("+pct+"%)</span>";'
    + '        html+="</div>";'
    + '      });'
    + '      html+="</div>";'
    + '    }'
    + '    document.getElementById("giveaway-stats-content").innerHTML=html;'
    + '  });'
    + '};'

    + 'function renderCommentsTab(){'
    + '  var html="";'
    + '  var withComments=history.filter(function(g){return g.comments&&g.comments.length>0});'
    + '  if(withComments.length===0){html="<p style=\\"color:#8b8fa3\\">No giveaways have comments yet.</p>";document.getElementById("giveaway-comments-list").innerHTML=html;return;}'
    + '  withComments.forEach(function(g){'
    + '    var bc=rarityColors[g.petRarity]||"#8b8fa3";'
    + '    html+="<div style=\\"padding:12px;background:#1e1f22;border:1px solid #2a2a3a;border-left:4px solid "+bc+";border-radius:8px;margin-bottom:12px\\">";'
    + '    html+="<div style=\\"font-weight:700;color:#e0e0e0\\">"+g.petEmoji+" "+g.petName+" ("+g.winner+" ← "+g.giver+")</div>";'
    + '    if(g.comments.length>0){'
    + '      g.comments.forEach(function(c){'
    + '        html+="<div style=\\"margin-top:8px;padding:8px;background:#0a0a0e;border-left:2px solid #9146ff;border-radius:4px\\">";'
    + '        html+="<div style=\\"font-weight:600;color:#9146ff;font-size:11px\\">"+c.author+"</div>";'
    + '        html+="<div style=\\"color:#ccc;font-size:12px;margin-top:4px\\">"+c.text+"</div>";'
    + '        html+="<div style=\\"color:#555;font-size:10px;margin-top:4px\\">"+new Date(c.timestamp).toLocaleString()+"</div>";'
    + '      });'
    + '    }'
    + '    html+="<div style=\\"margin-top:8px\\">";'
    + '    html+="<input type=\\"text\\" placeholder=\\"Add comment...\\" id=\\"comment-input-"+g.id+"\\" style=\\"padding:6px;background:#0a0a0e;border:1px solid #333;color:#e0e0e0;width:100%;border-radius:4px;\\"/>";'
    + '    html+="<button onclick=\\"addComment(\'"+g.id+"\')\\" style=\\"margin-top:4px;padding:4px 10px;background:#9146ff;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px\\">Post Comment</button>";'
    + '    html+="</div>";'
    + '    html+="</div>";'
    + '  });'
    + '  document.getElementById("giveaway-comments-list").innerHTML=html;'
    + '};'

    + 'window.addComment=function(id){'
    + '  var input=document.getElementById("comment-input-"+id);'
    + '  var text=input?input.value.trim():"";'
    + '  if(!text){alert("Comment cannot be empty");return;}'
    + '  fetch("/api/pets/giveaway/"+id+"/comment",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({comment:text})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){var g=history.find(function(x){return x.id===id});if(g){if(!g.comments)g.comments=[];g.comments.push({author:"You",text:text,timestamp:new Date().toISOString()});renderCommentsTab();}}'
    + '    else{alert(d.error||"Failed");}'
    + '  });'
    + '};'

    + 'function renderBansTab(){'
    + '  if(!isAdmin){document.getElementById("giveaway-bans-list").innerHTML="<p style=\\"color:#8b8fa3\\">Admin only.</p>";return;}'
    + '  var html="<h3 style=\\"margin-bottom:12px\\">Banned Givers ("+bans.length+")</h3>";'
    + '  if(bans.length===0){html+="<p style=\\"color:#8b8fa3\\">No banned users.</p>";document.getElementById("giveaway-bans-list").innerHTML=html;return;}'
    + '  html+="<div style=\\"background:#1e1f22;border:1px solid #2a2a3a;border-radius:8px\\">";'
    + '  bans.forEach(function(b,i){'
    + '    html+="<div style=\\"display:flex;justify-content:space-between;align-items:center;padding:12px;border-bottom:"+(i<bans.length-1?"1px solid #333":"none")+"\\">";'
    + '    html+="<div style=\\"flex:1\\">";'
    + '    html+="<div style=\\"color:#e0e0e0;font-weight:600\\">"+b.userId+"</div>";'
    + '    html+="<div style=\\"color:#8b8fa3;font-size:12px;margin-top:2px\\">Reason: "+b.reason+"</div>";'
    + '    html+="<div style=\\"color:#555;font-size:10px;margin-top:2px\\">Banned by "+b.bannedBy+" on "+new Date(b.bannedAt).toLocaleDateString()+"</div>";'
    + '    html+="</div>";'
    + '    html+="<button onclick=\\\"removeBan(\"+b.userId+\")\\\" style=\\\"padding:4px 12px;background:#2ecc7122;color:#2ecc71;border:1px solid #2ecc7144;border-radius:4px;cursor:pointer;font-size:11px\\\">Unban</button>";'
    + '    html+="</div>";'
    + '  });'
    + '  html+="</div>";'
    + '  document.getElementById("giveaway-bans-list").innerHTML=html;'
    + '};'

    + 'window.addBan=function(){'
    + '  var userId=document.getElementById("ban-user-id").value.trim();'
    + '  var reason=document.getElementById("ban-reason").value.trim();'
    + '  if(!userId){alert("User ID required");return;}'
    + '  fetch("/api/pets/giveaway/ban/add",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:userId,reason:reason})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){bans.push({userId:userId,reason:reason,bannedAt:new Date().toISOString(),bannedBy:"You"});document.getElementById("ban-user-id").value="";document.getElementById("ban-reason").value="";renderBansTab();}'
    + '    else{alert(d.error||"Failed");}'
    + '  });'
    + '};'

    + 'window.removeBan=function(userId){'
    + '  if(!confirm("Unban this user?")) return;'
    + '  fetch("/api/pets/giveaway/ban/remove",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:userId})}).then(function(r){return r.json()}).then(function(d){'
    + '    if(d.success){bans=bans.filter(function(b){return b.userId!==userId});renderBansTab();}'
    + '    else{alert(d.error||"Failed");}'
    + '  });'
    + '};'

    + 'var gvPage=0;var gvPageSize=50;var gvFiltered=[];'
    + 'window.filterGiveaways=function(){'
    + '  gvPage=0;'
    + '  var filter=document.getElementById("giveaway-filter").value;'
    + '  var search=(document.getElementById("giveaway-search").value||"").toLowerCase().trim();'
    + '  gvFiltered=history.filter(function(g){'
    + '    if(filter==="pending"&&g.confirmed) return false;'
    + '    if(filter==="confirmed"&&!g.confirmed) return false;'
    + '    if(search){'
    + '      var haystack=(g.petName+" "+g.winner+" "+g.giver+" "+g.notes+" "+g.petEmoji).toLowerCase();'
    + '      if(haystack.indexOf(search)===-1) return false;'
    + '    }'
    + '    return true;'
    + '  });'
    + '  document.getElementById("giveaway-list").innerHTML="";'
    + '  loadMoreGiveaways();'
    + '};'
    + 'function loadMoreGiveaways(){'
    + '  var start=gvPage*gvPageSize;'
    + '  var batch=gvFiltered.slice(start,start+gvPageSize);'
    + '  if(batch.length===0&&gvPage===0){document.getElementById("giveaway-list").innerHTML=\'<p style="color:#8b8fa3">No giveaways found.</p>\';document.getElementById("giveaway-loading").style.display="none";return;}'
    + '  if(batch.length===0){document.getElementById("giveaway-loading").style.display="none";return;}'
    + '  var html="";'
    + '  batch.forEach(function(g){'
    + '    var bc=rarityColors[g.petRarity]||"#8b8fa3";'
    + '    var statusBadge=g.confirmed'
    + '      ?\'<span style="background:#2ecc7122;color:#2ecc71;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600">✅ Confirmed</span>\''
    + '      :\'<span style="background:#f39c1222;color:#f39c12;padding:2px 8px;border-radius:4px;font-size:10px;font-weight:600">⏳ Pending</span>\';'
    + '    var date=new Date(g.submittedAt).toLocaleDateString();'
    + '    var timeLeft="";'
    + '    if(g.expiresAt){var diff=g.expiresAt-Date.now();if(diff>0){var mins=Math.floor(diff/60000);timeLeft=" | ⏰ Expires in "+mins+"m";}else{timeLeft=" | ⏰ Expired";}}'
    + '    var pingIcons=(g.pingGiver?"🔔":"")+(g.pingReceiver?"🔔":"");'
    + '    html+=\'<div style="display:flex;align-items:center;gap:16px;padding:12px;background:#1e1f22;border:1px solid #2a2a3a;border-left:4px solid \'+bc+\';border-radius:8px;margin-bottom:8px">\''
    + '      +\'<div style="font-size:32px;min-width:40px;text-align:center">\'+g.petEmoji+\'</div>\''
    + '      +\'<div style="flex:1">\''
    + '      +\'<div style="font-weight:700;font-size:14px">\'+g.petName+\' <span style="font-weight:400;color:\'+bc+\';font-size:11px">\'+g.petRarity+\'</span></div>\''
    + '      +\'<div style="font-size:12px;color:#ccc;margin-top:2px">🏆 Winner: <b>\'+g.winner+\'</b> • 🎁 Given by: <b>\'+g.giver+\'</b>\' + (pingIcons ? \' \' + pingIcons : \"\") + \'</div>\''
    + '      +(g.notes?\'<div style="font-size:11px;color:#8b8fa3;margin-top:2px">📝 \'+g.notes+\'</div>\':"")'
    + '      +\'<div style="font-size:10px;color:#555;margin-top:4px">\'+date+timeLeft+\' • Submitted by \'+g.submittedBy+(g.confirmed?" • Confirmed by "+g.confirmedBy:"")+\'</div>\''
    + '      +\'</div>\''
    + '      +\'<div style="display:flex;flex-direction:column;gap:4px;align-items:end">\'+statusBadge'
    + '      +(!g.confirmed?\'<button onclick="confirmGiveaway(\\\'\'+g.id+\'\\\')" style="padding:4px 10px;background:#2ecc71;color:#fff;border:none;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600">Confirm</button>\':"")'
    + '      +\'<button onclick="deletePetGiveaway(\\\'\'+g.id+\'\\\')" style="padding:4px 10px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:4px;cursor:pointer;font-size:11px">Delete</button>\''
    + '      +\'</div></div>\';'
    + '  });'
    + '  document.getElementById("giveaway-list").insertAdjacentHTML("beforeend",html);'
    + '  gvPage++;'
    + '  document.getElementById("giveaway-loading").style.display=(start+gvPageSize<gvFiltered.length)?"block":"none";'
    + '};'
    + 'var gvObserver=new IntersectionObserver(function(entries){if(entries[0].isIntersecting)loadMoreGiveaways()},{rootMargin:"200px"});'
    + 'var gvSentinel=document.getElementById("giveaway-sentinel");if(gvSentinel)gvObserver.observe(gvSentinel);'

    + 'window.confirmGiveaway=function(id){'
    + '  if(!confirm("Confirm this giveaway/trade happened?")) return;'
    + '  fetch("/api/pets/giveaway/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id})}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired. Please refresh.");}return r.json()}).then(function(d){'
    + '    if(d.success){var g=history.find(function(x){return x.id===id});if(g){g.confirmed=true;g.confirmedBy="You";}filterGiveaways();}'
    + '    else{alert(d.error||"Failed");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    + 'window.deletePetGiveaway=function(id){'
    + '  if(!confirm("Delete this giveaway entry?")) return;'
    + '  fetch("/api/pets/giveaway/delete",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id})}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired. Please refresh.");}return r.json()}).then(function(d){'
    + '    if(d.success){history=history.filter(function(x){return x.id!==id});filterGiveaways();}'
    + '    else{alert(d.error||"Failed");}'
    + '  }).catch(function(e){alert("Error: "+e.message)});'
    + '};'

    + 'filterGiveaways();'
    + '})();'
    + '</script>';
}

// ====================== PET STATS TAB ======================
export function renderPetStatsTab(userTier) {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const petsData = loadJSON(PETS_PATH, { pets: [], catalog: [] });
  const pets = petsData.pets || [];
  const catalog = petsData.catalog || [];
  const categories = petsData.categories || [];
  
  // Calculate statistics
  const totalPets = pets.length;
  const uniquePets = new Set(pets.map(p => p.petId)).size;
  const catalogSize = catalog.length;
  const collectionPercentage = catalogSize > 0 ? Math.round((uniquePets / catalogSize) * 100) : 0;
  
  // Category breakdown
  const categoryStats = {};
  pets.forEach(p => {
    const catEntry = catalog.find(c => c.id === p.petId);
    if (catEntry && catEntry.category) {
      categoryStats[catEntry.category] = (categoryStats[catEntry.category] || 0) + 1;
    }
  });
  
  // Rarity breakdown
  const rarityStats = {};
  pets.forEach(p => {
    const catEntry = catalog.find(c => c.id === p.petId);
    if (catEntry && catEntry.rarity) {
      rarityStats[catEntry.rarity] = (rarityStats[catEntry.rarity] || 0) + 1;
    }
  });
  
  // Top 10 most owned pets
  const petCounts = {};
  pets.forEach(p => {
    petCounts[p.petId] = (petCounts[p.petId] || 0) + 1;
  });
  const topPets = Object.entries(petCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([petId, count]) => {
      const catEntry = catalog.find(c => c.id === petId);
      return { id: petId, name: catEntry?.name || petId, emoji: catEntry?.emoji || '❓', count, rarity: catEntry?.rarity || 'unknown' };
    });
    
  // Giver statistics
  const giverStats = {};
  pets.forEach(p => {
    if (p.givenBy) {
      giverStats[p.givenBy] = (giverStats[p.givenBy] || 0) + 1;
    }
  });
  const topGivers = Object.entries(giverStats)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([name, count]) => ({ name, count }));
    
  // Prepare data for charts
  const categoryData = JSON.stringify(categoryStats);
  const rarityData = JSON.stringify(rarityStats);
  const topPetsData = JSON.stringify(topPets.map(p => ({ label: p.emoji + ' ' + p.name, value: p.count })));
  const topGiversData = JSON.stringify(topGivers.map(g => ({ label: g.name, value: g.count })));
  
  const rarityColors = {
    common: '#95a5a6',
    uncommon: '#2ecc71',
    rare: '#3498db',
    epic: '#9b59b6',
    legendary: '#f39c12',
    mythic: '#e74c3c'
  };
  
  return '<div class="card">'
    + '<h2>📊 Pet Collection Statistics</h2>'
    + '<p style="color:#8b8fa3;font-size:13px;margin-top:-4px">Comprehensive overview of your pet collection with charts and analytics.</p>'
    + '</div>'
    
    // Overview stats
    + '<div class="card">'
    + '<h3 style="margin-top:0">📈 Overview</h3>'
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(150px,1fr));gap:12px">'
    + '<div style="padding:16px;background:#9146ff15;border:1px solid #9146ff33;border-radius:8px;text-align:center">'
    + '<div style="font-size:24px;font-weight:700;color:#9146ff">' + totalPets + '</div>'
    + '<div style="font-size:11px;color:#8b8fa3;margin-top:4px">Total Pets Owned</div>'
    + '</div>'
    + '<div style="padding:16px;background:#2ecc7115;border:1px solid #2ecc7133;border-radius:8px;text-align:center">'
    + '<div style="font-size:24px;font-weight:700;color:#2ecc71">' + uniquePets + '</div>'
    + '<div style="font-size:11px;color:#8b8fa3;margin-top:4px">Unique Species</div>'
    + '</div>'
    + '<div style="padding:16px;background:#3498db15;border:1px solid #3498db33;border-radius:8px;text-align:center">'
    + '<div style="font-size:24px;font-weight:700;color:#3498db">' + catalogSize + '</div>'
    + '<div style="font-size:11px;color:#8b8fa3;margin-top:4px">Total Available</div>'
    + '</div>'
    + '<div style="padding:16px;background:#f39c1215;border:1px solid #f39c1233;border-radius:8px;text-align:center">'
    + '<div style="font-size:24px;font-weight:700;color:#f39c12">' + collectionPercentage + '%</div>'
    + '<div style="font-size:11px;color:#8b8fa3;margin-top:4px">Collection Complete</div>'
    + '</div>'
    + '</div>'
    + '</div>'
    
    // Charts
    + '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(400px,1fr));gap:15px">'
    
    // Category breakdown chart
    + '<div class="card">'
    + '<h3 style="margin-top:0">📦 By Category</h3>'
    + '<canvas id="categoryChart" style="max-height:300px"></canvas>'
    + '</div>'
    
    // Rarity breakdown chart
    + '<div class="card">'
    + '<h3 style="margin-top:0">💎 By Rarity</h3>'
    + '<canvas id="rarityChart" style="max-height:300px"></canvas>'
    + '</div>'
    
    + '</div>'
    
    // Top 10 pets
    + '<div class="card">'
    + '<h3 style="margin-top:0">🏆 Top 10 Most Owned Pets</h3>'
    + '<div style="background:#1e1f22;border:1px solid #2a2a3a;border-radius:8px;padding:12px">'
    + (topPets.length > 0 ? topPets.map((p, i) => {
      const rarityColor = rarityColors[p.rarity] || '#8b8fa3';
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:' + (i < topPets.length - 1 ? '1px solid #333' : 'none') + '">'
        + '<span style="color:#e0e0e0"><span style="color:#8b8fa3;margin-right:8px">#' + (i + 1) + '</span>' + p.emoji + ' ' + p.name + ' <span style="font-size:10px;color:' + rarityColor + '">' + p.rarity + '</span></span>'
        + '<span style="color:#9146ff;font-weight:600">' + p.count + ' owned</span>'
        + '</div>';
    }).join('') : '<div style="color:#8b8fa3;text-align:center;padding:20px">No pets owned yet</div>')
    + '</div>'
    + '</div>'
    
    // Top givers
    + '<div class="card">'
    + '<h3 style="margin-top:0">🎁 Top 10 Pet Givers</h3>'
    + '<div style="background:#1e1f22;border:1px solid #2a2a3a;border-radius:8px;padding:12px">'
    + (topGivers.length > 0 ? topGivers.map((g, i) => {
      return '<div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:' + (i < topGivers.length - 1 ? '1px solid #333' : 'none') + '">'
        + '<span style="color:#e0e0e0"><span style="color:#8b8fa3;margin-right:8px">#' + (i + 1) + '</span>' + g.name + '</span>'
        + '<span style="color:#2ecc71;font-weight:600">' + g.count + ' pets</span>'
        + '</div>';
    }).join('') : '<div style="color:#8b8fa3;text-align:center;padding:20px">No givers recorded yet</div>')
    + '</div>'
    + '</div>'
    
    // Script for charts
    + '<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>'
    + '<script>'
    + '(function(){'
    + '  var categoryData=' + categoryData + ';'
    + '  var rarityData=' + rarityData + ';'
    
    // Category chart
    + '  if(Object.keys(categoryData).length>0){'
    + '    var ctxCat=document.getElementById("categoryChart").getContext("2d");'
    + '    new Chart(ctxCat,{'
    + '      type:"doughnut",'
    + '      data:{'
    + '        labels:Object.keys(categoryData),'
    + '        datasets:[{data:Object.values(categoryData),backgroundColor:["#9146ff","#2ecc71","#3498db","#f39c12","#e74c3c","#9b59b6","#1abc9c"]}]'
    + '      },'
    + '      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{labels:{color:"#e0e0e0"}}}}'
    + '    });'
    + '  }'
    
    // Rarity chart
    + '  if(Object.keys(rarityData).length>0){'
    + '    var ctxRar=document.getElementById("rarityChart").getContext("2d");'
    + '    var rarityColors={common:"#95a5a6",uncommon:"#2ecc71",rare:"#3498db",epic:"#9b59b6",legendary:"#f39c12",mythic:"#e74c3c"};'
    + '    var rarityBgColors=Object.keys(rarityData).map(function(r){return rarityColors[r]||"#8b8fa3"});'
    + '    new Chart(ctxRar,{'
    + '      type:"bar",'
    + '      data:{'
    + '        labels:Object.keys(rarityData),'
    + '        datasets:[{label:"Count",data:Object.values(rarityData),backgroundColor:rarityBgColors}]'
    + '      },'
    + '      options:{responsive:true,maintainAspectRatio:true,plugins:{legend:{display:false}},scales:{y:{beginAtZero:true,ticks:{color:"#e0e0e0"}},x:{ticks:{color:"#e0e0e0"}}}}'
    + '    });'
    + '  }'
    
    + '})();'
    + '</script>';
}

export function renderIdleonMainTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  return `
<div class="card">
  <h2>🧱 IdleOn Main — Import Hub</h2>
  <p style="color:#8b8fa3">Import-only mode. Each import adds to the current internal weekly bucket and auto-saves.</p>
</div>

<div class="card">
  <h2>📥 Import JSON String</h2>
  <p style="color:#8b8fa3">Paste member data JSON (supports <code>members[].gpEarned</code>). Multiple imports stack into the same current week.</p>
  <textarea id="idleonImportJson" rows="7" placeholder='Example:\n{"date":"25/02/2026 21:00:00","members":[{"name":"PlayerA","gpEarned":12450}]}'></textarea>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
    <button class="small" id="idleonImportBtn" style="margin:0;background:#4caf50">Import & Add</button>
    <span style="font-size:12px;color:#8b8fa3;align-self:center">No manual edits. Import updates and saves automatically.</span>
  </div>
  <div id="idleonImportStatus" style="margin-top:8px;font-size:12px;color:#8b8fa3"></div>
</div>

<div class="card">
  <h2>🏆 Members Leaderboard</h2>
  <div id="idleonSummary" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:8px;margin-bottom:10px"></div>
  <div style="border:1px solid #3a3a42;border-radius:8px;background:#17171b">
    <table style="margin:0">
      <thead><tr><th>#</th><th>Member</th><th>Total GP</th><th>GP This Week</th><th>Updated</th></tr></thead>
      <tbody id="idleonRows"></tbody>
    </table>
  </div>
  <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px">
    <button class="small" id="idleonPrevPage" style="margin:0">← Prev</button>
    <span id="idleonPageInfo" style="font-size:12px;color:#8b8fa3"></span>
    <button class="small" id="idleonNextPage" style="margin:0">Next →</button>
  </div>
</div>

<script>
(function(){
  var model = { members: [], guilds: [], entries: [], notes: '' };
  var viewState = { page: 1, pageSize: 20 };

  function fmtDate(ts){ var d = new Date(Number(ts || 0)); return isNaN(d.getTime()) ? '-' : d.toLocaleString(); }
  function weekKeyFromDate(d){ var x = new Date(d || Date.now()); x.setHours(0,0,0,0); var wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x.toISOString().slice(0,10); }
  function currentWeekKey(){ return weekKeyFromDate(Date.now()); }

  function normalizeImportPayload(input){
    var payload = input;
    if (typeof payload === 'string') payload = JSON.parse(payload);

    var rows = [];

    if (Array.isArray(payload)) {
      rows = payload;
    } else if (payload && typeof payload === 'object') {
      if (Array.isArray(payload.members) && payload.members.length) {
        rows = payload.members;
      } else if (Array.isArray(payload.data)) {
        rows = payload.data;
      }
    }

    var normalizedMembers = rows.map(function(e){
      var name = String((e && (e.name || e.member || e.player || e.username)) || '').trim();
      var weeklyVal = Number(e && (e.gpEarned != null ? e.gpEarned : (e.weeklyGp != null ? e.weeklyGp : (e.weekly != null ? e.weekly : 0))));
      var hasTotal = e && (e.totalGp != null || e.gpTotal != null || e.currentGp != null || e.gp != null || e.points != null);
      var totalVal = Number(e && (e.totalGp != null ? e.totalGp : (e.gpTotal != null ? e.gpTotal : (e.currentGp != null ? e.currentGp : (e.gp != null ? e.gp : e.points)))));
      return {
        name: name,
        weeklyGp: Number.isFinite(weeklyVal) ? Math.max(0, weeklyVal) : 0,
        totalGp: Number.isFinite(totalVal) ? Math.max(0, totalVal) : 0,
        hasTotal: !!hasTotal
      };
    }).filter(function(m){ return m.name; });

    return normalizedMembers.slice(0, 1000);
  }

  function safeText(v){ return String(v==null?'':v).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }

  function normalizeWeeklyHistory(raw){
    return (Array.isArray(raw) ? raw : []).map(function(h){
      return {
        weekStart: String(h.weekStart || '').slice(0, 10),
        gp: Math.max(0, Number(h.gp || 0))
      };
    }).filter(function(h){ return /^\d{4}-\d{2}-\d{2}$/.test(h.weekStart) && Number.isFinite(h.gp); });
  }

  function historySum(m){
    return normalizeWeeklyHistory(m.weeklyHistory).reduce(function(sum, h){ return sum + Number(h.gp || 0); }, 0);
  }

  function ensureBaseline(m){
    var hist = normalizeWeeklyHistory(m.weeklyHistory);
    var histTotal = hist.reduce(function(sum, h){ return sum + Number(h.gp || 0); }, 0);
    if (!Number.isFinite(Number(m.allTimeBaseline))) {
      if (hist.length) {
        m.allTimeBaseline = Math.max(0, Number(m.totalGp || 0) - histTotal);
      } else {
        m.allTimeBaseline = Math.max(0, Number(m.totalGp || 0) - Number(m.weeklyGp || 0));
      }
    }
    m.allTimeBaseline = Math.max(0, Number(m.allTimeBaseline || 0));
    m.weeklyHistory = hist;
    m.totalGp = m.allTimeBaseline + histTotal;
  }

  function refreshWeeklyFromHistory(){
    var wk = currentWeekKey();
    model.members.forEach(function(m){
      ensureBaseline(m);
      var hist = m.weeklyHistory;
      var cur = hist.find(function(h){ return h.weekStart === wk; });
      m.weeklyGp = cur ? Number(cur.gp || 0) : 0;
      m.totalGp = Number(m.allTimeBaseline || 0) + historySum(m);
    });
  }

  function renderSummary(){
    var totalMembers = model.members.length;
    var totalGp = model.members.reduce(function(sum, m){ return sum + Number(m.totalGp || 0); }, 0);
    var weeklyGp = model.members.reduce(function(sum, m){ return sum + Number(m.weeklyGp || 0); }, 0);
    var topWeekly = model.members.slice().sort(function(a,b){
      if (Number(b.weeklyGp) !== Number(a.weeklyGp)) return Number(b.weeklyGp) - Number(a.weeklyGp);
      return Number(b.totalGp) - Number(a.totalGp);
    })[0];
    var topOverall = model.members.slice().sort(function(a,b){
      return Number(b.totalGp || 0) - Number(a.totalGp || 0);
    })[0];
    var hasWeekly = Number(weeklyGp || 0) > 0;
    var topLabel = hasWeekly ? 'Top This Week' : 'Top Overall';
    var topValue = hasWeekly
      ? (topWeekly ? (topWeekly.name + ' (' + Number(topWeekly.weeklyGp).toLocaleString() + ')') : '-')
      : (topOverall ? (topOverall.name + ' (' + Number(topOverall.totalGp).toLocaleString() + ')') : '-');
    var cards = [
      { label: 'Members', value: Number(totalMembers).toLocaleString() },
      { label: 'Total GP', value: Number(totalGp).toLocaleString() },
      { label: 'Weekly GP', value: Number(weeklyGp).toLocaleString() },
      { label: topLabel, value: topValue }
    ].map(function(card){
      return '<div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">'
        + '<div style="font-size:12px;color:#8b8fa3">'+safeText(card.label)+'</div>'
        + '<div style="font-size:20px;font-weight:700;margin-top:4px">'+safeText(card.value)+'</div>'
      + '</div>';
    }).join('');
    document.getElementById('idleonSummary').innerHTML = cards;
  }

  function renderRows(){
    var rows = model.members.slice().sort(function(a,b){
      if (Number(b.weeklyGp) !== Number(a.weeklyGp)) return Number(b.weeklyGp) - Number(a.weeklyGp);
      if (Number(b.totalGp) !== Number(a.totalGp)) return Number(b.totalGp) - Number(a.totalGp);
      return String(a.name).localeCompare(String(b.name));
    });
    var totalPages = Math.max(1, Math.ceil(rows.length / viewState.pageSize));
    if (viewState.page > totalPages) viewState.page = totalPages;
    var start = (viewState.page - 1) * viewState.pageSize;
    var paged = rows.slice(start, start + viewState.pageSize);

    document.getElementById('idleonRows').innerHTML = paged.map(function(e, i){
      return '<tr>'
        + '<td>'+(start + i + 1)+'</td>'
        + '<td>'+safeText(e.name)+'</td>'
        + '<td>'+Number(e.totalGp||0).toLocaleString()+'</td>'
        + '<td>'+Number(e.weeklyGp||0).toLocaleString()+'</td>'
        + '<td>'+safeText(fmtDate(e.updatedAt))+'</td>'
      + '</tr>';
    }).join('') || '<tr><td colspan="5" style="text-align:center;color:#8b8fa3">No members yet. Import JSON to start.</td></tr>';

    document.getElementById('idleonPageInfo').textContent = 'Page ' + viewState.page + ' / ' + totalPages;
    document.getElementById('idleonPrevPage').disabled = viewState.page <= 1;
    document.getElementById('idleonNextPage').disabled = viewState.page >= totalPages;
  }

  function renderAll(){ renderSummary(); renderRows(); }

  function load(){
    fetch('/api/idleon/gp').then(function(r){ return r.json(); }).then(function(d){
      if (!d.success) throw new Error(d.error || 'Failed to load IdleOn GP');
      model.members = Array.isArray(d.members) ? d.members.map(function(m){
        return {
          name: String(m.name || '').trim(),
          totalGp: Math.max(0, Number(m.totalGp != null ? m.totalGp : (m.gp != null ? m.gp : 0)) || 0),
          weeklyGp: Math.max(0, Number(m.weeklyGp != null ? m.weeklyGp : (m.weekly != null ? m.weekly : 0)) || 0),
          allTimeBaseline: Number(m.allTimeBaseline != null ? m.allTimeBaseline : NaN),
          weeklyHistory: normalizeWeeklyHistory(m.weeklyHistory),
          updatedAt: Number(m.updatedAt || Date.now())
        };
      }).filter(function(m){ return m.name; }) : [];
      model.guilds = Array.isArray(d.guilds) ? d.guilds : [];
      model.entries = Array.isArray(d.entries) ? d.entries : [];
      model.notes = d.notes || '';
      refreshWeeklyFromHistory();
      renderAll();
    }).catch(function(e){ alert(e.message); });
  }

  function save(){
    return fetch('/api/idleon/gp/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(model)})
      .then(function(r){ return r.json(); })
      .then(function(d){ if(!d.success) throw new Error(d.error||'Save failed'); return d; });
  }

  function runImport(){
    var raw = (document.getElementById('idleonImportJson').value || '').trim();
    if (!raw) return alert('Paste a JSON string first.');
    try {
      var imported = normalizeImportPayload(raw);
      if (!imported.length) return alert('No usable member data found in JSON.');
      var wk = currentWeekKey();
      var map = {};
      model.members.forEach(function(m){ map[String(m.name || '').toLowerCase()] = m; });

      imported.forEach(function(incoming){
        var key = String(incoming.name || '').toLowerCase();
        if (!key) return;
        var existing = map[key];
        if (!existing) {
          existing = {
            name: incoming.name,
            totalGp: 0,
            weeklyGp: 0,
            allTimeBaseline: 0,
            weeklyHistory: [],
            updatedAt: Date.now()
          };
          map[key] = existing;
          model.members.push(existing);
        }

        ensureBaseline(existing);
        var hist = normalizeWeeklyHistory(existing.weeklyHistory);
        var weekEntry = hist.find(function(h){ return h.weekStart === wk; });
        if (!weekEntry) {
          weekEntry = { weekStart: wk, gp: 0 };
          hist.push(weekEntry);
        }

        var gain = Math.max(0, Number(incoming.weeklyGp || 0));
        weekEntry.gp += gain;
        existing.weeklyHistory = hist.slice(-156);

        if (incoming.hasTotal) {
          var newHistTotal = historySum(existing);
          var proposedBaseline = Math.max(0, Number(incoming.totalGp || 0) - newHistTotal);
          existing.allTimeBaseline = Math.max(Number(existing.allTimeBaseline || 0), proposedBaseline);
        }

        existing.totalGp = Number(existing.allTimeBaseline || 0) + historySum(existing);
        existing.weeklyGp = weekEntry.gp;
        existing.updatedAt = Date.now();
      });

      refreshWeeklyFromHistory();
      viewState.page = 1;
      renderAll();
      document.getElementById('idleonImportStatus').textContent = 'Imported ' + imported.length + ' members into week ' + wk + '. Saving...';
      save().then(function(){
        document.getElementById('idleonImportStatus').textContent = '✅ Imported ' + imported.length + ' members and saved successfully (' + wk + ').';
      }).catch(function(e){
        document.getElementById('idleonImportStatus').textContent = '❌ Import applied locally but save failed: ' + e.message;
      });
    } catch (e) {
      alert('❌ Invalid JSON: ' + e.message);
    }
  }

  document.getElementById('idleonImportBtn').addEventListener('click', runImport);
  document.getElementById('idleonPrevPage').addEventListener('click', function(){ if (viewState.page > 1) { viewState.page--; renderRows(); } });
  document.getElementById('idleonNextPage').addEventListener('click', function(){ viewState.page++; renderRows(); });

  load();
})();
</script>`;
}

export function renderIdleonStatsTab(userTier) {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
  const canWrite = TIER_LEVELS[userTier] >= TIER_LEVELS.admin;
  return `
<div class="card">
  <h2>📊 IdleOn Stats — Multi-Period Analytics</h2>
  <p style="color:#8b8fa3">Weekly, 4-week, 12-week, and all-time GP insights from internal weekly buckets.</p>
</div>

<div class="card">
  <div id="idleonStatsKpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(180px,1fr));gap:10px"></div>
</div>

<div class="card">
  <h2>🏆 Advanced Leaderboard</h2>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    <select id="idleonStatsSort" style="margin:0;max-width:230px">
      <option value="weekly">Sort: Weekly GP (desc)</option>
      <option value="4w">Sort: 4-Week GP (desc)</option>
      <option value="12w">Sort: 12-Week GP (desc)</option>
      <option value="alltime">Sort: All-Time GP (desc)</option>
      <option value="name">Sort: Name (A-Z)</option>
    </select>
    <button class="small" id="idleonStatsCopy" style="margin:0;background:#2196f3">📋 Copy Summary</button>
    <button class="small" id="idleonStatsExportCsv" style="margin:0;background:#4caf50">⬇️ Export CSV</button>
    ${canWrite ? '<button class="small danger" id="idleonStatsResetWeekly" style="margin:0">♻️ Reset Current Week</button>' : ''}
  </div>
  <div style="border:1px solid #3a3a42;border-radius:8px;background:#17171b">
    <table style="margin:0">
      <thead><tr><th>#</th><th>Member</th><th>Weekly GP</th><th>4-Week GP</th><th>12-Week GP</th><th>All-Time GP</th><th>All-Time Share</th></tr></thead>
      <tbody id="idleonStatsRows"></tbody>
    </table>
  </div>
  <div style="display:flex;gap:8px;align-items:center;justify-content:flex-end;margin-top:10px">
    <button class="small" id="idleonStatsPrevPage" style="margin:0">← Prev</button>
    <span id="idleonStatsPageInfo" style="font-size:12px;color:#8b8fa3"></span>
    <button class="small" id="idleonStatsNextPage" style="margin:0">Next →</button>
  </div>
</div>

<div class="card">
  <h2>📦 Weekly Gain Distribution</h2>
  <div id="idleonStatsDistribution" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px"></div>
</div>

<div class="card">
  <h2>📉 GP Charts</h2>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px">
    <div style="background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:10px;height:300px;max-height:300px;overflow:hidden">
      <div style="font-size:12px;color:#8b8fa3;margin-bottom:8px">Top 10 Weekly Gains</div>
      <canvas id="idleonChartWeeklyBar" style="width:100%;height:240px"></canvas>
    </div>
    <div style="background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:10px;height:300px;max-height:300px;overflow:hidden">
      <div style="font-size:12px;color:#8b8fa3;margin-bottom:8px">All-Time Top Contributors</div>
      <canvas id="idleonChartAllTimeTop" style="width:100%;height:240px"></canvas>
    </div>
    <div style="background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:10px;height:260px;max-height:260px;overflow:hidden;grid-column:1/-1">
      <div style="font-size:12px;color:#8b8fa3;margin-bottom:8px">Guild Weekly Trend (last 16 weeks)</div>
      <canvas id="idleonChartWeeklyTrend" style="width:100%;height:200px"></canvas>
    </div>
  </div>
</div>

<div class="card">
  <h2>🧠 Insights</h2>
  <div id="idleonStatsInsights" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:8px"></div>
</div>
${!canWrite ? '<div class="card"><p style="color:#8b8fa3;margin:0">🔒 Read-only: viewer access cannot modify IdleOn GP data.</p></div>' : ''}

<script>
(function(){
  var model = { members: [], guilds: [], entries: [], notes: '' };
  var charts = { weeklyBar: null, allTimeTop: null, weeklyTrend: null };
  var canWrite = ${canWrite ? 'true' : 'false'};
  var viewState = { page: 1, pageSize: 20 };

  function safeText(v){ return String(v==null?'':v).replace(/[&<>"']/g, function(c){ return ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c]; }); }
  function weekKeyFromDate(d){ var x = new Date(d || Date.now()); x.setHours(0,0,0,0); var wd = (x.getDay() + 6) % 7; x.setDate(x.getDate() - wd); return x.toISOString().slice(0,10); }
  function currentWeekKey(){ return weekKeyFromDate(Date.now()); }
  function normalizeWeeklyHistory(raw){
    return (Array.isArray(raw) ? raw : []).map(function(h){
      return { weekStart: String(h.weekStart || '').slice(0,10), gp: Math.max(0, Number(h.gp || 0)) };
    }).filter(function(h){ return /^\d{4}-\d{2}-\d{2}$/.test(h.weekStart) && Number.isFinite(h.gp); });
  }
  function weekCutoffKey(weeks){
    var now = new Date();
    now.setHours(0,0,0,0);
    var wd = (now.getDay() + 6) % 7;
    now.setDate(now.getDate() - wd - ((Math.max(1,weeks)-1) * 7));
    return now.toISOString().slice(0,10);
  }

  function memberAllTimeGp(m){
    var hist = normalizeWeeklyHistory(m.weeklyHistory);
    var histTotal = hist.reduce(function(sum,h){ return sum + Number(h.gp || 0); }, 0);
    var baseline = Number(m.allTimeBaseline != null ? m.allTimeBaseline : NaN);
    if (Number.isFinite(baseline)) return Math.max(0, baseline) + histTotal;
    if (!hist.length) return Number(m.totalGp || 0);
    return histTotal;
  }
  function memberRangeGp(m, weeks){
    var cutoff = weekCutoffKey(weeks);
    return normalizeWeeklyHistory(m.weeklyHistory)
      .filter(function(h){ return h.weekStart >= cutoff; })
      .reduce(function(sum,h){ return sum + Number(h.gp || 0); }, 0);
  }
  function refreshWeeklyFromHistory(){
    var wk = currentWeekKey();
    model.members.forEach(function(m){
      var hist = normalizeWeeklyHistory(m.weeklyHistory);
      m.weeklyHistory = hist;
      var cur = hist.find(function(h){ return h.weekStart === wk; });
      m.weeklyGp = cur ? Number(cur.gp || 0) : 0;
    });
  }

  function load(){
    fetch('/api/idleon/gp').then(function(r){ return r.json(); }).then(function(d){
      if(!d.success) throw new Error(d.error || 'Failed to load IdleOn data');
      model.members = Array.isArray(d.members) ? d.members.map(function(m){
        var hist = normalizeWeeklyHistory(m.weeklyHistory);
        var histTotal = hist.reduce(function(sum,h){ return sum + Number(h.gp || 0); }, 0);
        var baseline = Number(m.allTimeBaseline != null ? m.allTimeBaseline : NaN);
        if (!Number.isFinite(baseline)) {
          baseline = hist.length
            ? Math.max(0, Number(m.totalGp != null ? m.totalGp : (m.gp != null ? m.gp : 0)) - histTotal)
            : Math.max(0, Number(m.totalGp != null ? m.totalGp : (m.gp != null ? m.gp : 0)) - Number(m.weeklyGp != null ? m.weeklyGp : (m.weekly != null ? m.weekly : 0)));
        }
        return {
          name: String(m.name || '').trim(),
          totalGp: Math.max(0, Number(m.totalGp != null ? m.totalGp : (m.gp != null ? m.gp : 0)) || 0),
          weeklyGp: Math.max(0, Number(m.weeklyGp != null ? m.weeklyGp : (m.weekly != null ? m.weekly : 0)) || 0),
          allTimeBaseline: Math.max(0, Number(baseline || 0)),
          weeklyHistory: hist,
          updatedAt: Number(m.updatedAt || Date.now())
        };
      }).filter(function(m){ return m.name; }) : [];
      model.guilds = Array.isArray(d.guilds) ? d.guilds : [];
      model.entries = Array.isArray(d.entries) ? d.entries : [];
      model.notes = typeof d.notes === 'string' ? d.notes : '';
      refreshWeeklyFromHistory();
      renderAll();
    }).catch(function(e){
      document.getElementById('idleonStatsRows').innerHTML = '<tr><td colspan="7" style="color:#ef5350">'+safeText(e.message)+'</td></tr>';
    });
  }

  function save(){
    if (!canWrite) return Promise.resolve({ success: true });
    return fetch('/api/idleon/gp/save', {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(model)
    }).then(function(r){ return r.json(); })
      .then(function(d){ if(!d.success) throw new Error(d.error || 'Save failed'); return d; });
  }

  function memberScore(m){
    return {
      weekly: Number(m.weeklyGp || 0),
      gp4w: memberRangeGp(m, 4),
      gp12w: memberRangeGp(m, 12),
      allTime: memberAllTimeGp(m)
    };
  }

  function sortedMembers(){
    var sortBy = (document.getElementById('idleonStatsSort') || {}).value || 'weekly';
    return model.members.slice().sort(function(a,b){
      var sa = memberScore(a), sb = memberScore(b);
      if (sortBy === 'name') return String(a.name).localeCompare(String(b.name));
      if (sortBy === '4w') return sb.gp4w - sa.gp4w || sb.allTime - sa.allTime;
      if (sortBy === '12w') return sb.gp12w - sa.gp12w || sb.allTime - sa.allTime;
      if (sortBy === 'alltime') return sb.allTime - sa.allTime || sb.weekly - sa.weekly;
      return sb.weekly - sa.weekly || sb.allTime - sa.allTime;
    });
  }

  function percentile(values, p){
    if (!values.length) return 0;
    var sorted = values.slice().sort(function(a,b){ return a-b; });
    var idx = Math.min(sorted.length - 1, Math.max(0, Math.ceil((p / 100) * sorted.length) - 1));
    return sorted[idx] || 0;
  }

  function buildWeeklyGuildSeries(){
    var byWeek = {};
    model.members.forEach(function(m){
      normalizeWeeklyHistory(m.weeklyHistory).forEach(function(h){
        byWeek[h.weekStart] = (byWeek[h.weekStart] || 0) + Number(h.gp || 0);
      });
    });
    var weeks = Object.keys(byWeek).sort();
    var last = weeks.slice(-16);
    return {
      labels: last,
      values: last.map(function(w){ return Number(byWeek[w] || 0); })
    };
  }

  function renderKpis(){
    var totalMembers = model.members.length;
    var weeklyGp = model.members.reduce(function(sum,m){ return sum + Number(m.weeklyGp || 0); }, 0);
    var gp4w = model.members.reduce(function(sum,m){ return sum + memberRangeGp(m, 4); }, 0);
    var gp12w = model.members.reduce(function(sum,m){ return sum + memberRangeGp(m, 12); }, 0);
    var allTime = model.members.reduce(function(sum,m){ return sum + memberAllTimeGp(m); }, 0);
    var activeMembers = model.members.filter(function(m){ return Number(m.weeklyGp || 0) > 0; }).length;
    var participation = totalMembers ? ((activeMembers / totalMembers) * 100).toFixed(1) + '%' : '0%';
    var weeklyValues = model.members.map(function(m){ return Number(m.weeklyGp || 0); });
    var medianWeekly = Math.round(percentile(weeklyValues, 50));
    var p90Weekly = Math.round(percentile(weeklyValues, 90));
    var series = buildWeeklyGuildSeries();

    var cards = [
      { label: 'Members', value: Number(totalMembers).toLocaleString() },
      { label: 'Current Week GP', value: Number(weeklyGp).toLocaleString() },
      { label: 'Last 4 Weeks GP', value: Number(gp4w).toLocaleString() },
      { label: 'Last 12 Weeks GP', value: Number(gp12w).toLocaleString() },
      { label: 'All-Time GP', value: Number(allTime).toLocaleString() },
      { label: 'Tracked Weeks', value: Number(series.labels.length).toLocaleString() },
      { label: 'Avg GP / Week (12w)', value: Number(Math.round(gp12w / 12)).toLocaleString() },
      { label: 'Avg GP / Member (4w)', value: Number(totalMembers ? Math.round(gp4w / totalMembers) : 0).toLocaleString() },
      { label: 'Weekly Participation', value: participation },
      { label: 'Weekly Median / P90', value: Number(medianWeekly).toLocaleString() + ' / ' + Number(p90Weekly).toLocaleString() }
    ];

    document.getElementById('idleonStatsKpis').innerHTML = cards.map(function(c){
      return '<div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">'
        + '<div style="font-size:12px;color:#8b8fa3">'+safeText(c.label)+'</div>'
        + '<div style="font-size:22px;font-weight:700;margin-top:6px">'+safeText(c.value)+'</div>'
      + '</div>';
    }).join('');
  }

  function renderRows(){
    var members = sortedMembers();
    var totalAllTime = members.reduce(function(sum,m){ return sum + memberAllTimeGp(m); }, 0) || 1;
    var totalPages = Math.max(1, Math.ceil(members.length / viewState.pageSize));
    if (viewState.page > totalPages) viewState.page = totalPages;
    var start = (viewState.page - 1) * viewState.pageSize;
    var paged = members.slice(start, start + viewState.pageSize);

    document.getElementById('idleonStatsRows').innerHTML = paged.map(function(m, idx){
      var s = memberScore(m);
      var share = ((s.allTime / totalAllTime) * 100).toFixed(2) + '%';
      return '<tr>'
        + '<td>' + (start + idx + 1) + '</td>'
        + '<td>' + safeText(m.name) + '</td>'
        + '<td>' + Number(s.weekly).toLocaleString() + '</td>'
        + '<td>' + Number(s.gp4w).toLocaleString() + '</td>'
        + '<td>' + Number(s.gp12w).toLocaleString() + '</td>'
        + '<td>' + Number(s.allTime).toLocaleString() + '</td>'
        + '<td>' + share + '</td>'
      + '</tr>';
    }).join('') || '<tr><td colspan="7" style="text-align:center;color:#8b8fa3">No member data.</td></tr>';

    document.getElementById('idleonStatsPageInfo').textContent = 'Page ' + viewState.page + ' / ' + totalPages;
    document.getElementById('idleonStatsPrevPage').disabled = viewState.page <= 1;
    document.getElementById('idleonStatsNextPage').disabled = viewState.page >= totalPages;
  }

  function renderDistribution(){
    var buckets = [
      { label: '0 GP', min: 0, max: 0 },
      { label: '1 - 9,999', min: 1, max: 9999 },
      { label: '10,000 - 24,999', min: 10000, max: 24999 },
      { label: '25,000 - 49,999', min: 25000, max: 49999 },
      { label: '50,000+', min: 50000, max: Infinity }
    ];

    var html = buckets.map(function(b){
      var count = model.members.filter(function(m){
        var w = Number(m.weeklyGp || 0);
        return w >= b.min && w <= b.max;
      }).length;
      return '<div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px">'
        + '<div style="font-size:12px;color:#8b8fa3">'+safeText(b.label)+'</div>'
        + '<div style="font-size:20px;font-weight:700;margin-top:6px">'+count+'</div>'
      + '</div>';
    }).join('');

    document.getElementById('idleonStatsDistribution').innerHTML = html;
  }

  function destroyCharts(){
    Object.keys(charts).forEach(function(k){
      if (charts[k]) {
        charts[k].destroy();
        charts[k] = null;
      }
    });
  }

  function renderCharts(){
    if (!window.Chart) return;
    destroyCharts();

    var members = model.members.slice();
    var topWeekly = members.slice().sort(function(a,b){ return Number(b.weeklyGp || 0) - Number(a.weeklyGp || 0); }).slice(0,10);
    var topAll = members.slice().sort(function(a,b){ return memberAllTimeGp(b) - memberAllTimeGp(a); }).slice(0,10);
    var trend = buildWeeklyGuildSeries();

    var weeklyCtx = document.getElementById('idleonChartWeeklyBar');
    if (weeklyCtx && topWeekly.length) {
      charts.weeklyBar = new Chart(weeklyCtx, {
        type: 'bar',
        data: {
          labels: topWeekly.map(function(m){ return m.name; }),
          datasets: [{ label: 'Weekly GP', data: topWeekly.map(function(m){ return Number(m.weeklyGp || 0); }), backgroundColor: 'rgba(145,70,255,0.7)', borderColor: '#9146ff', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e0e0e0' } } }, scales: { x: { ticks: { color: '#8b8fa3' } }, y: { ticks: { color: '#8b8fa3' }, beginAtZero: true } } }
      });
    }

    var allCtx = document.getElementById('idleonChartAllTimeTop');
    if (allCtx && topAll.length) {
      charts.allTimeTop = new Chart(allCtx, {
        type: 'bar',
        data: {
          labels: topAll.map(function(m){ return m.name; }),
          datasets: [{ label: 'All-Time GP', data: topAll.map(function(m){ return memberAllTimeGp(m); }), backgroundColor: 'rgba(76,175,80,0.7)', borderColor: '#4caf50', borderWidth: 1 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e0e0e0' } } }, scales: { x: { ticks: { color: '#8b8fa3' } }, y: { ticks: { color: '#8b8fa3' }, beginAtZero: true } } }
      });
    }

    var trendCtx = document.getElementById('idleonChartWeeklyTrend');
    if (trendCtx && trend.labels.length) {
      charts.weeklyTrend = new Chart(trendCtx, {
        type: 'line',
        data: {
          labels: trend.labels,
          datasets: [{ label: 'Guild Weekly GP', data: trend.values, borderColor: '#26c6da', backgroundColor: 'rgba(38,198,218,0.15)', fill: true, tension: 0.25, pointRadius: 3 }]
        },
        options: { responsive: true, maintainAspectRatio: false, plugins: { legend: { labels: { color: '#e0e0e0' } } }, scales: { x: { ticks: { color: '#8b8fa3' } }, y: { ticks: { color: '#8b8fa3' }, beginAtZero: true } } }
      });
    }
  }

  function renderInsights(){
    var members = model.members.slice();
    var topWeekly = members.slice().sort(function(a,b){ return Number(b.weeklyGp || 0) - Number(a.weeklyGp || 0); }).slice(0,3);
    var top4w = members.slice().sort(function(a,b){ return memberRangeGp(b,4) - memberRangeGp(a,4); })[0];
    var topAll = members.slice().sort(function(a,b){ return memberAllTimeGp(b) - memberAllTimeGp(a); })[0];
    var totalWeekly = members.reduce(function(sum,m){ return sum + Number(m.weeklyGp || 0); }, 0) || 1;
    var top3Weekly = topWeekly.reduce(function(sum,m){ return sum + Number(m.weeklyGp || 0); }, 0);
    var concentration = ((top3Weekly / totalWeekly) * 100).toFixed(1) + '%';

    var insights = [
      '<strong>Top 3 weekly concentration:</strong> ' + concentration + ' of current week GP.',
      '<strong>Best 4-week performer:</strong> ' + (top4w ? safeText(top4w.name) + ' (' + Number(memberRangeGp(top4w,4)).toLocaleString() + ')' : '-'),
      '<strong>Top all-time contributor:</strong> ' + (topAll ? safeText(topAll.name) + ' (' + Number(memberAllTimeGp(topAll)).toLocaleString() + ')' : '-')
    ];

    document.getElementById('idleonStatsInsights').innerHTML = insights.map(function(txt){
      return '<div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:10px;font-size:13px;line-height:1.5">'+txt+'</div>';
    }).join('');
  }

  function renderAll(){
    renderKpis();
    renderRows();
    renderDistribution();
    renderCharts();
    renderInsights();
  }

  document.getElementById('idleonStatsSort').addEventListener('change', function(){ viewState.page = 1; renderAll(); });
  document.getElementById('idleonStatsPrevPage').addEventListener('click', function(){ if (viewState.page > 1) { viewState.page--; renderRows(); } });
  document.getElementById('idleonStatsNextPage').addEventListener('click', function(){ viewState.page++; renderRows(); });

  document.getElementById('idleonStatsCopy').addEventListener('click', function(){
    var ranked = sortedMembers();
    var top5 = ranked.slice(0,5).map(function(m, i){ return (i+1)+'. '+m.name+' — W:'+Number(m.weeklyGp||0).toLocaleString()+' | 4W:'+Number(memberRangeGp(m,4)).toLocaleString(); }).join('\\n');
    var summary = 'IdleOn Summary\\nCurrent Week: ' + Number(model.members.reduce(function(s,m){ return s + Number(m.weeklyGp || 0); }, 0)).toLocaleString() + '\\nLast 4 Weeks: ' + Number(model.members.reduce(function(s,m){ return s + memberRangeGp(m,4); }, 0)).toLocaleString() + '\\nAll-Time: ' + Number(model.members.reduce(function(s,m){ return s + memberAllTimeGp(m); }, 0)).toLocaleString() + '\\n\\nTop 5:\\n' + (top5 || 'No members');
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(summary).then(function(){ alert('✅ Summary copied.'); }).catch(function(){ alert('❌ Copy failed.'); });
    } else {
      alert(summary);
    }
  });

  document.getElementById('idleonStatsExportCsv').addEventListener('click', function(){
    var ranked = sortedMembers();
    var lines = ['rank,name,weekly_gp,gp_4w,gp_12w,all_time_gp,all_time_share_percent'];
    var totalAll = ranked.reduce(function(sum,m){ return sum + memberAllTimeGp(m); }, 0) || 1;
    ranked.forEach(function(m, idx){
      var safeName = '"' + String(m.name || '').replace(/"/g, '""') + '"';
      var all = memberAllTimeGp(m);
      var share = ((all / totalAll) * 100).toFixed(4);
      lines.push((idx+1)+','+safeName+','+Number(m.weeklyGp||0)+','+memberRangeGp(m,4)+','+memberRangeGp(m,12)+','+all+','+share);
    });
    var csv = lines.join('\\n');
    var blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    var url = URL.createObjectURL(blob);
    var a = document.createElement('a');
    a.href = url;
    a.download = 'idleon_gp_stats_extended.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  });

  if (canWrite) {
    var resetBtn = document.getElementById('idleonStatsResetWeekly');
    if (resetBtn) {
      resetBtn.addEventListener('click', function(){
        if (!confirm('Reset current week GP to 0 for all members?')) return;
        var wk = currentWeekKey();
        model.members.forEach(function(m){
          var hist = normalizeWeeklyHistory(m.weeklyHistory);
          var weekEntry = hist.find(function(h){ return h.weekStart === wk; });
          if (weekEntry) weekEntry.gp = 0;
          m.weeklyHistory = hist;
          m.weeklyGp = 0;
          m.updatedAt = Date.now();
        });
        save().then(function(){ renderAll(); alert('✅ Current week reset and saved.'); }).catch(function(e){ alert('❌ ' + e.message); });
      });
    }
  }

  load();
})();
</script>`;
}

export function renderToolsExportTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const exportTypes = [
    { key: 'members', label: 'Members' },
    { key: 'moderation', label: 'Moderation Cases' },
    { key: 'audit-log', label: 'Dashboard Audit Log' },
    { key: 'member-growth', label: 'Member Growth' },
    { key: 'command-usage', label: 'Command Usage' },
    { key: 'warnings', label: 'Warnings' },
    { key: 'starboard', label: 'Starboard' }
  ];

  return `
<div class="card">
  <h2>📤 Tools — Export Data</h2>
  <p style="color:#8b8fa3">Download bot datasets as JSON or CSV.</p>
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:10px;margin-top:8px">
    ${exportTypes.map(t => `<div style="background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;padding:12px">
      <div style="font-weight:700;margin-bottom:8px">${t.label}</div>
      <div style="display:flex;gap:8px">
        <button class="small" style="margin:0" onclick="window.location.href='/api/export/${t.key}?format=json'">JSON</button>
        <button class="small" style="margin:0;background:#2196f3" onclick="window.location.href='/api/export/${t.key}?format=csv'">CSV</button>
      </div>
    </div>`).join('')}
  </div>
</div>

<div class="card">
  <h2>💾 Data Backups</h2>
  <p style="color:#8b8fa3">Need full settings/data snapshots? Use the <a href="/backups">Backups tab</a>.</p>
</div>`;
}

export function renderToolsBackupsTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  return `
<div class="card">
  <h2>💾 Tools — Full Backup & Restore</h2>
  <p style="color:#8b8fa3">Create a full snapshot of all bot JSON data, restore existing backups, or upload a backup file.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:8px">
    <button class="small" id="backupCreateBtn" style="margin:0">➕ Create Backup</button>
    <button class="small" id="backupRefreshBtn" style="margin:0;background:#2196f3">🔄 Refresh List</button>
    <label class="small" style="margin:0;background:#2a2f3a;border:1px solid #3a3a42;cursor:pointer">📤 Upload Backup
      <input id="backupUploadInput" type="file" accept="application/json,.json" style="display:none">
    </label>
  </div>
</div>

<div class="card">
  <h2>🗂️ Available Backups</h2>
  <div id="backupList" style="margin-top:10px;color:#8b8fa3">Loading backups...</div>
</div>

<script>
(function(){
  function fmtSize(bytes){ if(!bytes) return '0 B'; var units=['B','KB','MB','GB']; var i=0; var n=bytes; while(n>=1024&&i<units.length-1){n/=1024;i++;} return n.toFixed(i?1:0)+' '+units[i]; }

  function loadBackups(){
    fetch('/api/backups').then(function(r){ return r.json(); }).then(function(d){
      if(!d.success) throw new Error(d.error||'Failed to load backups');
      var rows = (d.backups||[]).map(function(b){
        var dt = new Date(b.date).toLocaleString();
        return '<tr>'
          + '<td>'+b.name+'</td>'
          + '<td>'+fmtSize(b.size)+'</td>'
          + '<td>'+dt+'</td>'
          + '<td style="display:flex;gap:6px">'
            + '<button class="small" style="margin:0;background:#4caf50" onclick="restoreBackup(\\\'' + b.name.replace(/\'/g, "\\\\\'") + '\\\')">Restore</button>'
            + '<button class="small danger" style="margin:0" onclick="deleteBackup(\\\'' + b.name.replace(/\'/g, "\\\\\'") + '\\\')">Delete</button>'
          + '</td>'
        + '</tr>';
      }).join('');

      document.getElementById('backupList').innerHTML = rows
        ? '<table><thead><tr><th>Name</th><th>Size</th><th>Date</th><th>Actions</th></tr></thead><tbody>'+rows+'</tbody></table>'
        : '<div style="color:#8b8fa3">No backups yet.</div>';
    }).catch(function(e){
      document.getElementById('backupList').innerHTML = '<div style="color:#ef5350">'+e.message+'</div>';
    });
  }

  window.restoreBackup = function(name){
    if(!confirm('Restore '+name+'? This will overwrite current data files.')) return;
    fetch('/api/backups/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})})
      .then(function(r){ return r.json(); })
      .then(function(d){ if(!d.success) throw new Error(d.error||'Restore failed'); alert('✅ Backup restored.'); })
      .catch(function(e){ alert('❌ '+e.message); });
  };

  window.deleteBackup = function(name){
    if(!confirm('Delete '+name+'?')) return;
    fetch('/api/backups/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})})
      .then(function(r){ return r.json(); })
      .then(function(d){ if(!d.success) throw new Error(d.error||'Delete failed'); loadBackups(); })
      .catch(function(e){ alert('❌ '+e.message); });
  };

  document.getElementById('backupCreateBtn').addEventListener('click', function(){
    fetch('/api/backups/create',{method:'POST'}).then(function(r){ return r.json(); }).then(function(d){
      if(!d.success) throw new Error(d.error||'Create failed');
      alert('✅ Created ' + d.name);
      loadBackups();
    }).catch(function(e){ alert('❌ '+e.message); });
  });

  document.getElementById('backupRefreshBtn').addEventListener('click', loadBackups);

  document.getElementById('backupUploadInput').addEventListener('change', function(ev){
    var file = ev.target.files && ev.target.files[0];
    if(!file) return;
    var reader = new FileReader();
    reader.onload = function(){
      try {
        var parsed = JSON.parse(String(reader.result || '{}'));
        fetch('/api/backups/upload',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:file.name,backup:parsed})})
          .then(function(r){ return r.json(); })
          .then(function(d){ if(!d.success) throw new Error(d.error||'Upload failed'); alert('✅ Uploaded ' + d.name); loadBackups(); })
          .catch(function(e){ alert('❌ '+e.message); });
      } catch(e) {
        alert('❌ Invalid JSON backup file');
      }
    };
    reader.readAsText(file);
  });

  loadBackups();
})();
</script>`;
}

// Account Management Tab (Owner-only)
export function renderAccountsTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  return `
<div class="card">
  <h2>🔐 Account Management</h2>
  <p style="color:#8b8fa3;font-size:13px;margin-top:-4px">Create, manage and control access for dashboard accounts. Only owners can access this page.</p>
</div>

<div class="card">
  <h2>➕ Create New Account</h2>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr auto;gap:10px;align-items:end">
    <div>
      <label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px">Username</label>
      <input type="text" id="newUsername" placeholder="e.g. moderator1" style="margin:4px 0">
    </div>
    <div>
      <label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px">Display Name</label>
      <input type="text" id="newDisplayName" placeholder="e.g. John (optional)" style="margin:4px 0">
    </div>
    <div>
      <label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px">Password</label>
      <input type="password" id="newPassword" placeholder="Min 6 characters" style="margin:4px 0">
    </div>
    <div>
      <label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px">Tier</label>
      <select id="newTier" style="margin:4px 0">
        <option value="viewer">👁️ Viewer (read-only)</option>
        <option value="moderator">🛡️ Moderator</option>
        <option value="admin">⚡ Admin</option>
        <option value="owner">👑 Owner</option>
      </select>
    </div>
    <div>
      <button class="small" onclick="createAccount()" style="margin:4px 0;height:38px;padding:0 16px">Create</button>
    </div>
  </div>
  <div style="margin-top:10px">
    <label style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px">Page Access (restrict to specific pages — leave empty for default tier access)</label>
    <div style="margin-top:6px;border:1px solid #2a2f3a;border-radius:8px;background:#17171b;padding:10px">
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:8px">
        <button type="button" class="small" style="width:auto;margin:0;background:#2a2f3a" onclick="setAllPageAccessModes('full')">All Full</button>
        <button type="button" class="small" style="width:auto;margin:0;background:#2a2f3a" onclick="setAllPageAccessModes('read')">All Read-only</button>
        <button type="button" class="small" style="width:auto;margin:0;background:#2a2f3a" onclick="clearPageAccessSelector()">Clear</button>
      </div>
      <div id="newPageAccessList" style="max-height:220px;overflow:auto;padding-right:4px"></div>
    </div>
  </div>
  <div id="createResult" style="margin-top:8px"></div>
</div>

<div class="card">
  <h2>📋 Existing Accounts</h2>
  <div id="accountsList" style="margin-top:10px">
    <div style="text-align:center;padding:20px;color:#8b8fa3">Loading accounts...</div>
  </div>
</div>

<div class="card">
  <h2>🔑 Tier Permissions Reference</h2>
  <table>
    <thead>
      <tr>
        <th>Tier</th>
        <th>Access</th>
        <th>Can Edit</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td><span style="color:#ff4444;font-weight:700">👑 Owner</span></td>
        <td>All sections + Account Management</td>
        <td>✅ Yes</td>
      </tr>
      <tr>
        <td><span style="color:#9146ff;font-weight:700">⚡ Admin</span></td>
        <td>Core, Community, Analytics, RPG, Config</td>
        <td>✅ Yes</td>
      </tr>
      <tr>
        <td><span style="color:#4caf50;font-weight:700">🛡️ Moderator</span></td>
        <td>Core, Community, Analytics</td>
        <td>✅ Yes</td>
      </tr>
      <tr>
        <td><span style="color:#8b8fa3;font-weight:700">👁️ Viewer</span></td>
        <td>Core, Analytics</td>
        <td>❌ Read-only</td>
      </tr>
    </tbody>
  </table>
</div>

<script>
const tierColors = {owner:'#ff4444',admin:'#9146ff',moderator:'#4caf50',viewer:'#8b8fa3'};
const tierIcons = {owner:'👑',admin:'⚡',moderator:'🛡️',viewer:'👁️'};
const tierLabels = {owner:'Owner',admin:'Admin',moderator:'Moderator',viewer:'Viewer'};
const pageAccessOptions = ${JSON.stringify(PAGE_ACCESS_OPTIONS)};

function _pageLabel(slug) {
  return slug.split('-').map(function(part){ return part ? (part.charAt(0).toUpperCase() + part.slice(1)) : ''; }).join(' ');
}

function renderPageAccessSelector() {
  var root = document.getElementById('newPageAccessList');
  if (!root) return;
  root.innerHTML = pageAccessOptions.map(function(p, idx){
    var id = 'pa-' + idx;
    return '<div style="display:grid;grid-template-columns:auto 1fr 120px;gap:8px;align-items:center;padding:6px 4px;border-bottom:1px solid #222228">'
      + '<input type="checkbox" id="' + id + '" data-page-slug="' + p.slug + '" onchange="togglePageAccessMode(this)">'
      + '<label for="' + id + '" style="margin:0;font-size:12px;color:#d0d0d0">' + _pageLabel(p.slug) + ' <span style="color:#8b8fa3;font-size:11px">(' + p.category + ')</span></label>'
      + '<select data-page-mode="' + p.slug + '" disabled style="margin:0;padding:6px 8px;font-size:12px"><option value="full">Full</option><option value="read">Read-only</option></select>'
      + '</div>';
  }).join('');
}

function togglePageAccessMode(checkbox) {
  if (!checkbox) return;
  var slug = checkbox.getAttribute('data-page-slug');
  var sel = document.querySelector('select[data-page-mode="' + slug + '"]');
  if (!sel) return;
  sel.disabled = !checkbox.checked;
}

function collectPageAccess() {
  var access = {};
  var checks = document.querySelectorAll('#newPageAccessList input[type="checkbox"][data-page-slug]');
  checks.forEach(function(cb){
    if (!cb.checked) return;
    var slug = cb.getAttribute('data-page-slug');
    var modeSel = document.querySelector('select[data-page-mode="' + slug + '"]');
    var mode = modeSel ? String(modeSel.value || 'full') : 'full';
    access[slug] = mode === 'read' ? 'read' : 'full';
  });
  return access;
}

function clearPageAccessSelector() {
  var checks = document.querySelectorAll('#newPageAccessList input[type="checkbox"][data-page-slug]');
  checks.forEach(function(cb){
    cb.checked = false;
    togglePageAccessMode(cb);
  });
}

function setAllPageAccessModes(mode) {
  var normalized = mode === 'read' ? 'read' : 'full';
  var checks = document.querySelectorAll('#newPageAccessList input[type="checkbox"][data-page-slug]');
  checks.forEach(function(cb){
    cb.checked = true;
    togglePageAccessMode(cb);
    var slug = cb.getAttribute('data-page-slug');
    var sel = document.querySelector('select[data-page-mode="' + slug + '"]');
    if (sel) sel.value = normalized;
  });
}

function loadAccounts() {
  fetch('/api/accounts').then(r=>r.json()).then(d=>{
    if(!d.success) { document.getElementById('accountsList').innerHTML='<div style="color:#ff6b6b">Error loading accounts</div>'; return; }
    const accts = d.accounts;
    if(accts.length===0) { document.getElementById('accountsList').innerHTML='<div style="color:#8b8fa3">No accounts found.</div>'; return; }
    let html = '<table><thead><tr><th>Username</th><th>Display Name</th><th>Tier</th><th>Page Access</th><th>Last Login</th><th>Created</th><th style="width:300px">Actions</th></tr></thead><tbody>';
    accts.forEach(function(a) {
      const lastLogin = a.lastLogin ? new Date(a.lastLogin).toLocaleString() : 'Never';
      const created = new Date(a.createdAt).toLocaleDateString();
      const color = tierColors[a.tier]||'#8b8fa3';
      const icon = tierIcons[a.tier]||'';
      const pageAccess = (a.pageAccess && typeof a.pageAccess === 'object') ? a.pageAccess : {};
      const pageAccessEntries = Object.entries(pageAccess);
      const chAccess = pageAccessEntries.length
        ? pageAccessEntries.map(function(entry){ return entry[0] + (entry[1] === 'read' ? ' (read-only)' : ''); }).join(', ')
        : '<span style="color:#8b8fa3">Default</span>';
      html += '<tr>';
      html += '<td style="font-weight:600">' + a.username + '</td>';
      html += '<td style="color:#8b8fa3;font-size:12px">' + (a.displayName || '-') + '</td>';
      html += '<td><span style="color:' + color + ';font-weight:700">' + icon + ' ' + (tierLabels[a.tier]||a.tier) + '</span></td>';
      html += '<td style="font-size:12px;color:#8b8fa3;max-width:150px;overflow:hidden;text-overflow:ellipsis">' + chAccess + '</td>';
      html += '<td style="font-size:12px;color:#8b8fa3">' + lastLogin + '</td>';
      html += '<td style="font-size:12px;color:#8b8fa3">' + created + '</td>';
      html += '<td style="display:flex;gap:6px;flex-wrap:wrap">';
      html += '<button class="small" style="margin:0;padding:4px 10px;font-size:11px;background:#3498db" onclick="previewAsAccount(\\'' + a.tier + '\\')">👁️ Preview</button>';
      html += '<select id="tier-' + a.id + '" style="width:auto;margin:0;padding:4px 8px;font-size:11px">';
      ['owner','admin','moderator','viewer'].forEach(function(t) {
        html += '<option value="' + t + '"' + (a.tier===t?' selected':'') + '>' + (tierLabels[t]||t) + '</option>';
      });
      html += '</select>';
      html += '<button class="small" style="margin:0;padding:4px 10px;font-size:11px" onclick="changeTier(\\'' + a.id + '\\')">Update</button>';
      html += '<button class="small" style="margin:0;padding:4px 10px;font-size:11px;background:#e67e22" onclick="resetPassword(\\'' + a.id + '\\',\\'' + a.username + '\\')">Reset PW</button>';
      html += '<button class="small danger" style="margin:0;padding:4px 10px;font-size:11px" onclick="deleteAccount(\\'' + a.id + '\\',\\'' + a.username + '\\')">Delete</button>';
      html += '</td></tr>';
    });
    html += '</tbody></table>';
    document.getElementById('accountsList').innerHTML = html;
  });
}

function createAccount() {
  var un = document.getElementById('newUsername').value.trim();
  var pw = document.getElementById('newPassword').value;
  var tier = document.getElementById('newTier').value;
  var dn = document.getElementById('newDisplayName').value.trim();
  var pageAccess = collectPageAccess();
  if(!un||!pw) { showResult('createResult','Please fill all fields','#ff6b6b'); return; }
  fetch('/api/accounts/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({username:un,password:pw,tier:tier,displayName:dn||undefined,pageAccess:Object.keys(pageAccess).length?pageAccess:undefined})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success) {
        showResult('createResult','Account created successfully!','#4caf50');
        document.getElementById('newUsername').value='';
        document.getElementById('newPassword').value='';
        document.getElementById('newDisplayName').value='';
        clearPageAccessSelector();
        loadAccounts();
      } else {
        showResult('createResult',d.error||'Error creating account','#ff6b6b');
      }
    });
}

function changeTier(id) {
  var sel = document.getElementById('tier-'+id);
  if(!sel) return;
  var newTier = sel.value;
  fetch('/api/accounts/update-tier',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,tier:newTier})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success) { loadAccounts(); } else { alert(d.error||'Error updating tier'); }
    });
}

function resetPassword(id, username) {
  var newPw = prompt('Enter new password for '+username+' (min 8 chars, must include A-Z, a-z, 0-9):');
  if(!newPw) return;
  if(newPw.length<8) { alert('Password must be at least 8 characters'); return; }
  fetch('/api/accounts/reset-password',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,newPassword:newPw})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success) { alert('Password reset successfully for '+username); } else { alert(d.error||'Error resetting password'); }
    });
}

function deleteAccount(id, username) {
  if(!confirm('Are you sure you want to delete the account "'+username+'"? This cannot be undone.')) return;
  fetch('/api/accounts/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})})
    .then(function(r){return r.json()}).then(function(d){
      if(d.success) { loadAccounts(); } else { alert(d.error||'Error deleting account'); }
    });
}

function previewAsAccount(tier) {
  window.open('/?previewTier=' + tier, '_blank');
}

function showResult(elId, msg, color) {
  var el = document.getElementById(elId);
  if(!el) return;
  el.innerHTML = '<div style="color:'+color+';font-size:13px;padding:6px 12px;background:'+color+'15;border:1px solid '+color+'33;border-radius:4px">'+msg+'</div>';
  setTimeout(function(){ el.innerHTML=''; }, 5000);
}

loadAccounts();
renderPageAccessSelector();
</script>`;
}



// NEW: Member Logs tab
export function renderAuditLogTab() {
  const { dashboardSettings, auditLogHistory = [] } = _getState();
  const als = dashboardSettings.auditLogSettings || {};
  const auditLogSettings = {
    enabled: false,
    channelId: '',
    logMessageEdits: true,
    logMessageDeletes: true,
    logMessageBulkDeletes: true,
    logMessagePins: true,
    logUsernameChanges: true,
    logAvatarChanges: true,
    logNicknameChanges: true,
    logRoleChanges: true,
    logMemberJoins: true,
    logMemberLeaves: true,
    logMemberBans: true,
    logMemberUnbans: true,
    logMemberTimeouts: true,
    logMemberMutes: true,
    logMemberBoosts: true,
    logJoinPosition: true,
    logServerUpdates: true,
    logIntegrations: true,
    logVoiceChanges: true,
    logChannelChanges: true,
    logEmojiChanges: true,
    logStickerChanges: true,
    logThreadChanges: true,
    warnNewAccounts: true,
    newAccountThresholdDays: 7,
    excludedChannels: [],
    excludedRoles: [],
    excludedUsers: [],
    muteRoleIds: [],
    logRetentionDays: 30,
    autoCleanupEnabled: false,
    eventColors: {},
    alertKeywords: [],
    alertUserId: '',
    alertEnabled: false,
    dmNotificationsEnabled: false,
    dmNotifyUserId: '',
    dmNotifyEvents: { bans: true, newAccounts: true, serverChanges: false, botChanges: true },
    webhookUrl: '',
    webhookEnabled: false,
    groupActions: true,
    groupIntervalSec: 5,
    storeDeletedImages: true,
    ...als
  };

  const now = new Date();
  const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
  const weekLogs = auditLogHistory.filter(e => new Date(e.timestamp) >= weekAgo);
  const sd = {
    week: weekLogs.length,
    bans: weekLogs.filter(e => e.action === 'member_ban').length,
    timeouts: weekLogs.filter(e => e.action === 'member_timeout').length,
    joins: weekLogs.filter(e => e.action === 'member_join').length,
    warns: weekLogs.filter(e => e.action === 'member_join' && e.type === 'warn').length,
    total: auditLogHistory.length
  };

  return `
<div class="card" style="padding:16px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:12px">
    <h2 style="margin:0">🕵️ Member Logs</h2>
    <div style="display:flex;gap:6px;align-items:center">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:13px">
        <input type="checkbox" id="auditEnabled" ${auditLogSettings.enabled ? 'checked' : ''} style="accent-color:#9146ff"> Enable
      </label>
    </div>
  </div>

  <!-- Stats Row - compact -->
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:8px;margin-bottom:14px">
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#9146ff">${sd.week}</div>
      <div style="font-size:10px;color:#888">This Week</div>
    </div>
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#E74C3C">${sd.bans}</div>
      <div style="font-size:10px;color:#888">Bans</div>
    </div>
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#E67E22">${sd.timeouts}</div>
      <div style="font-size:10px;color:#888">Timeouts</div>
    </div>
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#2ECC71">${sd.joins}</div>
      <div style="font-size:10px;color:#888">Joins</div>
    </div>
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#F39C12">${sd.warns}</div>
      <div style="font-size:10px;color:#888">New Acct</div>
    </div>
    <div style="background:#1a1a1d;padding:8px;border-radius:6px;text-align:center">
      <div style="font-size:20px;font-weight:700;color:#3498DB">${sd.total}</div>
      <div style="font-size:10px;color:#888">Total</div>
    </div>
  </div>

  <!-- Core Settings -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px;margin-bottom:12px">
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Log Channel ID</label>
      <input id="auditChannelId" type="text" value="${auditLogSettings.channelId || ''}" placeholder="Channel ID" style="margin:0" oninput="updateAuditChannelName();">
      <small id="auditChannelName" style="color:#888;font-size:10px;display:block"></small>
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Log Level</label>
      <select id="auditLogLevel" style="margin:0">
        <option value="all" ${auditLogSettings.logLevel === 'all' ? 'selected' : ''}>All Events</option>
        <option value="important" ${auditLogSettings.logLevel === 'important' ? 'selected' : ''}>Important Only</option>
        <option value="minimal" ${auditLogSettings.logLevel === 'minimal' ? 'selected' : ''}>Minimal</option>
      </select>
    </div>
    <div style="display:flex;flex-direction:column;gap:6px;justify-content:center">
      <div style="display:flex;gap:6px">
        <button class="small" type="button" onclick="openPerEventChannelsModal()" style="margin:0;width:auto;padding:4px 8px;font-size:10px">🔗 Channels</button>
        <button class="small" type="button" onclick="openPerEventPingsModal()" style="margin:0;width:auto;padding:4px 8px;font-size:10px">📢 Pings</button>
        <button class="small" type="button" onclick="openEventColorsModal()" style="margin:0;width:auto;padding:4px 8px;font-size:10px">🎨 Colors</button>
      </div>
    </div>
  </div>

  <!-- Event Toggles - Compact Grid -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" checked onchange="document.getElementById('mlEvents').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 📋 Event Toggles
  </label>
  <div id="mlEvents" style="padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:8px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;font-size:12px">
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:6px;font-size:11px;color:#9146ff">👥 Join/Leave</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberJoins" ${auditLogSettings.logMemberJoins?'checked':''}><span>Joins & position</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberLeaves" ${auditLogSettings.logMemberLeaves?'checked':''}><span>Leaves</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="warnNewAccounts" ${auditLogSettings.warnNewAccounts?'checked':''}><span>New account warn</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberBoosts" ${auditLogSettings.logMemberBoosts?'checked':''}><span>Boosts</span></label>
        <div style="margin-top:4px"><label style="font-size:10px;color:#8b8fa3">New acct threshold (days)</label><input id="newAccountThresholdDays" type="number" min="1" max="365" value="${auditLogSettings.newAccountThresholdDays || 7}" style="margin:2px 0;width:80px"></div>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:6px;font-size:11px;color:#E74C3C">🛡️ Moderation</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberBans" ${auditLogSettings.logMemberBans?'checked':''}><span>Bans & unbans</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberTimeouts" ${auditLogSettings.logMemberTimeouts?'checked':''}><span>Timeouts</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberMutes" ${auditLogSettings.logMemberMutes?'checked':''}><span>Mutes</span></label>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:6px;font-size:11px;color:#1ABC9C">👤 Profile</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logUsernameChanges" ${auditLogSettings.logUsernameChanges?'checked':''}><span>Name changes</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logAvatarChanges" ${auditLogSettings.logAvatarChanges?'checked':''}><span>Avatar changes</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logRoleChanges" ${auditLogSettings.logRoleChanges?'checked':''}><span>Role updates</span></label>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:6px;font-size:12px">
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:6px;font-size:11px;color:#3498DB">💬 Messages</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMessageEdits" ${auditLogSettings.logMessageEdits?'checked':''}><span>Edits</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMessageDeletes" ${auditLogSettings.logMessageDeletes?'checked':''}><span>Deletes & bulk</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMessagePins" ${auditLogSettings.logMessagePins?'checked':''}><span>Pins / unpins</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="storeDeletedImages" ${auditLogSettings.storeDeletedImages?'checked':''}><span>📸 Store deleted images</span></label>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:6px;font-size:11px;color:#7289DA">⚙️ Server</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logServerUpdates" ${auditLogSettings.logServerUpdates?'checked':''}><span>Settings updates</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logIntegrations" ${auditLogSettings.logIntegrations?'checked':''}><span>Bots add/remove</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logChannelChanges" ${auditLogSettings.logChannelChanges?'checked':''}><span>Channel changes</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logEmojiChanges" ${auditLogSettings.logEmojiChanges?'checked':''}><span>Emoji/sticker</span></label>
      </div>
      <div style="background:#1a1a1d;padding:8px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:6px;font-size:11px;color:#F47FFF">🔊 Voice & Threads</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logVoiceChanges" ${auditLogSettings.logVoiceChanges?'checked':''}><span>Voice join/leave/move</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logThreadChanges" ${auditLogSettings.logThreadChanges?'checked':''}><span>Thread create/archive</span></label>
      </div>
    </div>
  </div>

  <!-- Action Grouping - always visible -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" onchange="document.getElementById('mlGrouping').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> ⏱️ Action Grouping & Performance
  </label>
  <div id="mlGrouping" style="display:none;padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:8px">
    <p style="color:#8b8fa3;font-size:11px;margin:0 0 8px">Group rapid events (role changes, joins, etc.) into summaries instead of flooding the log channel. Reduces API calls and RAM spikes.</p>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
      <div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
          <input type="checkbox" id="groupActions" ${auditLogSettings.groupActions?'checked':''}>
          <span>Enable grouping</span>
        </label>
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Group interval (seconds)</label>
        <input id="groupIntervalSec" type="number" min="2" max="30" value="${auditLogSettings.groupIntervalSec || 5}" style="margin:0;width:80px">
      </div>
      <div style="font-size:11px;color:#8b8fa3;padding-top:10px">
        Groups: role changes, joins/leaves, message deletes. Bans/timeouts always instant.
      </div>
    </div>
  </div>

  <!-- Exclusions - tick-box -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" onchange="document.getElementById('mlExclusions').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 🚫 Exclusions
  </label>
  <div id="mlExclusions" style="display:none;padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:8px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:8px">
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Excluded Channels</label>
        <textarea id="excludedChannelsInput" style="min-height:50px;margin:0;font-size:11px" placeholder="Channel IDs...">${(auditLogSettings.excludedChannels || []).join(', ')}</textarea>
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Excluded Roles</label>
        <textarea id="excludedRolesInput" style="min-height:50px;margin:0;font-size:11px" placeholder="Role IDs...">${(auditLogSettings.excludedRoles || []).join(', ')}</textarea>
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Excluded Users</label>
        <textarea id="excludedUsersInput" style="min-height:50px;margin:0;font-size:11px" placeholder="User IDs...">${(auditLogSettings.excludedUsers || []).join(', ')}</textarea>
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Mute Roles <button class="small" type="button" onclick="autoDetectMuteRoles()" style="width:auto;padding:1px 6px;font-size:9px;margin:0">🔍 Detect</button></label>
        <textarea id="muteRoleIdsInput" style="min-height:50px;margin:0;font-size:11px" placeholder="Mute role IDs...">${(auditLogSettings.muteRoleIds || []).join(', ')}</textarea>
      </div>
    </div>
  </div>

  <!-- Keyword Alerts - only show content when ticked -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" id="alertEnabled" ${auditLogSettings.alertEnabled ? 'checked' : ''} onchange="document.getElementById('mlAlerts').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 🔔 Keyword/Phrase Alerts
  </label>
  <div id="mlAlerts" style="display:${auditLogSettings.alertEnabled?'block':'none'};padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:8px">
    <div style="display:grid;grid-template-columns:2fr 1fr;gap:10px">
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Alert Keywords (comma-separated)</label>
        <textarea id="alertKeywords" style="min-height:40px;margin:0;font-size:11px" placeholder="ban, raid, spam...">${(auditLogSettings.alertKeywords || []).join(', ')}</textarea>
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Your User ID (for DM)</label>
        <input id="alertUserId" type="text" value="${auditLogSettings.alertUserId || ''}" placeholder="Discord User ID" style="margin:0">
      </div>
    </div>
  </div>

  <!-- Critical Event Notifications - only show content when ticked -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" id="dmNotificationsEnabled" ${auditLogSettings.dmNotificationsEnabled ? 'checked' : ''} onchange="document.getElementById('mlCritical').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 📲 Critical Event Notifications
  </label>
  <div id="mlCritical" style="display:${auditLogSettings.dmNotificationsEnabled?'block':'none'};padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:8px">
    <div style="display:grid;grid-template-columns:1fr 2fr;gap:10px;margin-bottom:8px">
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">DM User ID</label>
        <input id="dmNotifyUserId" type="text" value="${auditLogSettings.dmNotifyUserId || ''}" placeholder="User ID" style="margin:0">
      </div>
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:4px">DM me on:</label>
        <div style="display:flex;gap:12px;flex-wrap:wrap;font-size:12px">
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="dmNotifyBans" ${auditLogSettings.dmNotifyEvents?.bans !== false ? 'checked' : ''}> Bans</label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="dmNotifyNewAccounts" ${auditLogSettings.dmNotifyEvents?.newAccounts !== false ? 'checked' : ''}> New Accounts</label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="dmNotifyServerChanges" ${auditLogSettings.dmNotifyEvents?.serverChanges ? 'checked' : ''}> Server Changes</label>
          <label style="display:flex;align-items:center;gap:4px;cursor:pointer"><input type="checkbox" id="dmNotifyBotChanges" ${auditLogSettings.dmNotifyEvents?.botChanges !== false ? 'checked' : ''}> Bot Changes</label>
        </div>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:auto 1fr;gap:10px;align-items:center">
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px">
        <input type="checkbox" id="webhookEnabled" ${auditLogSettings.webhookEnabled ? 'checked' : ''}>
        <span>Webhook</span>
      </label>
      <input id="webhookUrl" type="text" value="${auditLogSettings.webhookUrl || ''}" placeholder="https://discord.com/api/webhooks/..." style="margin:0">
    </div>
  </div>

  <!-- Retention - tick-box -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" onchange="document.getElementById('mlRetention').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> 🗑️ Retention & Cleanup
  </label>
  <div id="mlRetention" style="display:none;padding:12px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:8px">
    <div style="display:flex;gap:12px;align-items:center;flex-wrap:wrap">
      <div>
        <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Keep logs (days)</label>
        <input id="logRetentionDays" type="number" min="1" max="365" value="${auditLogSettings.logRetentionDays || 30}" style="margin:0;width:80px">
      </div>
      <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;margin-top:12px">
        <input type="checkbox" id="autoCleanupEnabled" ${auditLogSettings.autoCleanupEnabled ? 'checked' : ''}>
        <span>Auto-cleanup (daily)</span>
      </label>
      <button class="small" type="button" onclick="manualCleanupLogs()" style="margin-top:12px;width:auto">🧹 Cleanup Now</button>
      <button class="small" type="button" onclick="exportAuditLogs()" style="margin-top:12px;width:auto">📥 Export</button>
    </div>
  </div>

  <div id="auditLogData" data-per-event-channels='${JSON.stringify(auditLogSettings.perEventChannels || {}).replace(/"/g, '&quot;')}' data-per-event-pings='${JSON.stringify(auditLogSettings.perEventPings || {}).replace(/"/g, '&quot;')}' data-event-colors='${JSON.stringify(auditLogSettings.eventColors || {}).replace(/"/g, '&quot;')}' style="display:none"></div>

  <button onclick="saveAuditLogSettings()" style="margin-top:12px">💾 Save Member Log Settings</button>
</div>

<script>
function openEventColorsModal() {
  const defaultColors = {
    ban: '#E74C3C', timeout: '#E67E22', mute: '#F39C12', kick: '#E74C3C',
    join: '#2ECC71', leave: '#95A5A6', boost: '#F47FFF', edit: '#3498DB',
    delete: '#E74C3C', roleChange: '#9B59B6', nameChange: '#1ABC9C', serverUpdate: '#7289DA'
  };
  const dataEl = document.getElementById('auditLogData');
  let savedColors = {};
  try { savedColors = JSON.parse(dataEl.getAttribute('data-event-colors').replace(/&quot;/g, '"') || '{}'); } catch {}
  const colorLabels = {
    ban:'Bans',timeout:'Timeouts',mute:'Mutes',join:'Joins',leave:'Leaves',
    boost:'Boosts',edit:'Edits',delete:'Deletes',roleChange:'Roles',nameChange:'Names',serverUpdate:'Server'
  };
  const rows = Object.entries(colorLabels).map(([key, label]) => {
    const color = savedColors[key] || defaultColors[key];
    return '<div style="display:flex;align-items:center;gap:8px;margin:4px 0"><input type="color" id="eventColor_'+key+'" value="'+color+'" style="width:36px;height:24px;border:none;cursor:pointer"><span style="color:#ddd;font-size:12px">'+label+'</span></div>';
  }).join('');
  showCustomModal('<div><h3 style="margin-top:0">Event Colors</h3>'+rows+'</div>', () => {
    const colors = {};
    Object.keys(colorLabels).forEach(key => {
      const input = document.getElementById('eventColor_'+key);
      if(input) colors[key] = input.value;
    });
    document.getElementById('auditLogData').setAttribute('data-event-colors', JSON.stringify(colors).replace(/"/g,'&quot;'));
    hideCustomModal();
  });
}

function autoDetectMuteRoles() {
  fetch('/api/detect-mute-role').then(r=>r.json()).then(data=>{
    if(data.success && data.roles.length>0){
      const ids=data.roles.map(r=>r.id).join(', ');
      if(confirm('Found: '+data.roles.map(r=>r.name).join(', ')+'\\nAdd these?')){
        document.getElementById('muteRoleIdsInput').value=ids;
      }
    } else alert('No mute roles detected.');
  }).catch(e=>alert('Error: '+e.message));
}

function manualCleanupLogs() {
  const days=document.getElementById('logRetentionDays').value||30;
  if(!confirm('Delete logs older than '+days+' days?')) return;
  fetch('/api/audit-log-cleanup',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({days:parseInt(days)})})
    .then(r=>r.json()).then(d=>{if(d.success){alert('Removed '+d.removed+' entries.');location.reload();}else alert(d.error||'Error');}).catch(e=>alert(e.message));
}

function exportAuditLogs() { window.location.href='/api/audit-log-export?format=json'; }

const originalSaveAuditLogSettings = typeof saveAuditLogSettings === 'function' ? saveAuditLogSettings : null;
window.saveAuditLogSettings = function() {
  const nameChangesChecked = document.getElementById('logUsernameChanges').checked;
  const bansChecked = document.getElementById('logMemberBans').checked;
  const joinsChecked = document.getElementById('logMemberJoins').checked;
  const deletesChecked = document.getElementById('logMessageDeletes').checked;

  const perEventChannels = {};
  const perEventPings = {};
  let eventColors = {};

  const channelInputs = document.querySelectorAll('[id^="perEventChannel_"]');
  if (channelInputs.length) {
    channelInputs.forEach(input => {
      const eventId = input.id.replace('perEventChannel_', '');
      const value = input.value.trim();
      if (value) perEventChannels[eventId] = value;
    });
  } else if (typeof auditPerEventChannelsDraft !== 'undefined') {
    Object.keys(auditPerEventChannelsDraft || {}).forEach(eventId => {
      const value = (auditPerEventChannelsDraft[eventId] || '').trim();
      if (value) perEventChannels[eventId] = value;
    });
  }

  const pingInputs = document.querySelectorAll('[id^="perEventPing_"]');
  if (pingInputs.length) {
    pingInputs.forEach(input => {
      const eventId = input.id.replace('perEventPing_', '');
      if (input.value.trim()) perEventPings[eventId] = splitIdTokens(input.value);
    });
  } else if (typeof auditPerEventPingsDraft !== 'undefined') {
    Object.keys(auditPerEventPingsDraft || {}).forEach(eventId => {
      const list = Array.isArray(auditPerEventPingsDraft[eventId]) ? auditPerEventPingsDraft[eventId] : splitIdTokens(String(auditPerEventPingsDraft[eventId] || ''));
      if (list.length) perEventPings[eventId] = list;
    });
  }

  const dataEl = document.getElementById('auditLogData');
  if (dataEl) {
    try { eventColors = JSON.parse(dataEl.getAttribute('data-event-colors').replace(/&quot;/g, '"') || '{}'); } catch {}
  }

  const settings = {
    enabled: document.getElementById('auditEnabled').checked,
    channelId: document.getElementById('auditChannelId').value.trim(),
    logLevel: document.getElementById('auditLogLevel').value,
    logMessageEdits: document.getElementById('logMessageEdits').checked,
    logMessageDeletes: deletesChecked,
    logMessageBulkDeletes: deletesChecked,
    logMessagePins: document.getElementById('logMessagePins').checked,
    logUsernameChanges: nameChangesChecked,
    logAvatarChanges: document.getElementById('logAvatarChanges').checked,
    logNicknameChanges: nameChangesChecked,
    logRoleChanges: document.getElementById('logRoleChanges').checked,
    logMemberJoins: joinsChecked,
    logMemberLeaves: document.getElementById('logMemberLeaves').checked,
    logMemberBans: bansChecked,
    logMemberUnbans: bansChecked,
    logMemberTimeouts: document.getElementById('logMemberTimeouts').checked,
    logMemberMutes: document.getElementById('logMemberMutes').checked,
    logMemberBoosts: document.getElementById('logMemberBoosts').checked,
    logJoinPosition: joinsChecked,
    logServerUpdates: document.getElementById('logServerUpdates').checked,
    logIntegrations: document.getElementById('logIntegrations').checked,
    logVoiceChanges: document.getElementById('logVoiceChanges')?.checked || false,
    logChannelChanges: document.getElementById('logChannelChanges')?.checked || false,
    logEmojiChanges: document.getElementById('logEmojiChanges')?.checked || false,
    logThreadChanges: document.getElementById('logThreadChanges')?.checked || false,
    warnNewAccounts: document.getElementById('warnNewAccounts').checked,
    newAccountThresholdDays: parseInt(document.getElementById('newAccountThresholdDays').value, 10) || 7,
    excludedChannels: parseIdList('excludedChannelsInput'),
    excludedRoles: parseIdList('excludedRolesInput'),
    excludedUsers: parseIdList('excludedUsersInput'),
    muteRoleIds: parseIdList('muteRoleIdsInput'),
    perEventChannels,
    perEventPings,
    logRetentionDays: parseInt(document.getElementById('logRetentionDays').value, 10) || 30,
    autoCleanupEnabled: document.getElementById('autoCleanupEnabled').checked,
    eventColors,
    alertKeywords: (document.getElementById('alertKeywords').value || '').split(',').map(s => s.trim()).filter(Boolean),
    alertUserId: document.getElementById('alertUserId').value.trim() || null,
    alertEnabled: document.getElementById('alertEnabled').checked,
    dmNotificationsEnabled: document.getElementById('dmNotificationsEnabled').checked,
    dmNotifyUserId: document.getElementById('dmNotifyUserId').value.trim() || null,
    dmNotifyEvents: {
      bans: document.getElementById('dmNotifyBans').checked,
      newAccounts: document.getElementById('dmNotifyNewAccounts').checked,
      serverChanges: document.getElementById('dmNotifyServerChanges').checked,
      botChanges: document.getElementById('dmNotifyBotChanges').checked
    },
    webhookUrl: document.getElementById('webhookUrl').value.trim() || null,
    webhookEnabled: document.getElementById('webhookEnabled').checked,
    groupActions: document.getElementById('groupActions')?.checked || false,
    groupIntervalSec: parseInt(document.getElementById('groupIntervalSec')?.value, 10) || 5,
    storeDeletedImages: document.getElementById('storeDeletedImages')?.checked || false
  };

  fetch('/api/audit-log-settings', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(settings)
  })
  .then(r => r.json())
  .then(data => {
    if (data.success) { alert('\\u2705 Member log settings saved!'); location.reload(); }
    else alert('\\u274C Error: ' + (data.error || 'Unknown error'));
  })
  .catch(err => alert('\\u274C Error: ' + err.message));
};
</script>
`;
}

// ====================== FEATURE TABS (split into 6 focused tabs) ======================

// Shared feature key map for mapping API slugs to state keys
const _featKeyMap = {
  'smart-slowmode': 'smartSlowmode', 'xp-blacklist': 'xpBlacklist', 'warning-expiry': 'warningExpiry',
  'quarantine': 'quarantine', 'media-only': 'mediaOnly', 'anti-alt': 'antiAlt', 'member-notes': 'memberNotes',
  'streaks': 'streaks', 'giveaway-requirements': 'giveawayRequirements', 'member-milestones': 'memberMilestones',
  'auto-role-rejoin': 'autoRoleRejoin', 'invite-tracker': 'inviteTracker', 'birthdays': 'birthdays',
  'timezones': 'timezones', 'theme': 'theme', 'push-notifications': 'pushNotifications',
  'dashboard-prefs': 'dashboardPrefs', 'changelog': 'changelog', 'stats-channels': 'statsChannels',
  'sticky-messages': 'stickyMessages', 'auto-thread': 'autoThread', 'lockdown': 'lockdown',
  'auto-purge': 'autoPurge', 'scheduled-announcements': 'scheduledAnnouncements', 'scheduled-roles': 'scheduledRoles',
  'modmail': 'modmail', 'bookmarks': 'bookmarks', 'status-rotation': 'statusRotation',
  'auto-responder': 'autoResponder', 'auto-backup-discord': 'autoBackupDiscord',
  'channel-activity': 'channelActivity', 'engagement-heatmap': 'engagementHeatmap',
  'member-retention': 'memberRetention', 'server-health': 'serverHealth', 'voice-activity': 'voiceActivity',
  'welcome-image': 'welcomeImage', 'event-sync': 'eventSync', 'webhook-forwarding': 'webhookForwarding',
  'twitch-clips': 'twitchClips', 'ticket-idle': 'ticketIdle', 'rss-feeds': 'rssFeeds',
  'api-polling': 'apiPolling', 'role-analytics': 'roleAnalytics'
};

function _renderFeatureCards(features, canEdit) {
  return features.map(f => `
    <div class="feat-row" data-feat-id="${f.id}" data-feat-name="${f.name}" style="display:flex;align-items:center;gap:12px;padding:12px;background:#17171b;border:1px solid #2a2f3a;border-radius:8px">
      <span style="font-size:20px;min-width:28px;text-align:center">${f.icon}</span>
      <div style="flex:1;min-width:0">
        <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">
          <strong style="color:#e0e0e0;font-size:13px">${f.id} — ${f.name}</strong>
          <span style="font-size:10px;padding:2px 6px;border-radius:3px;background:${f.tier === 'owner' ? '#ff444420;color:#ff4444' : f.tier === 'admin' ? '#9146ff20;color:#9146ff' : f.tier === 'moderator' ? '#4caf5020;color:#4caf50' : '#8b8fa320;color:#8b8fa3'};text-transform:uppercase;letter-spacing:0.5px">${f.tier}</span>
          ${f.builtin ? '<span style="font-size:10px;padding:2px 6px;border-radius:3px;background:#ffca2820;color:#ffca28">BUILT-IN</span>' : ''}
        </div>
        <div style="color:#8b8fa3;font-size:11px;margin-top:4px">${f.desc}</div>
      </div>
      ${f.api && canEdit ? `
      <div style="display:flex;gap:6px;align-items:center;flex-shrink:0">
        <label style="position:relative;display:inline-block;width:40px;height:22px;cursor:pointer">
          <input type="checkbox" data-feat-toggle="${f.api}" style="opacity:0;width:0;height:0" onchange="featToggle('${f.api}',this.checked)">
          <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:#3a3a42;border-radius:11px;transition:.3s"></span>
          <span class="feat-slider" style="position:absolute;top:2px;left:2px;width:18px;height:18px;background:#888;border-radius:50%;transition:.3s"></span>
        </label>
        <button class="small" onclick="featConfigure('${f.api}')" style="width:auto;padding:4px 10px;font-size:11px;background:#2a2f3a" title="Configure">⚙️</button>
      </div>` : f.builtin ? '<span style="color:#8b8fa3;font-size:11px;white-space:nowrap">✅ Active</span>' : ''}
    </div>`).join('\n  ');
}

function _renderFeatureScript() {
  return `
<div id="feat-modal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:9999;align-items:center;justify-content:center">
  <div style="background:#1a1a2e;border:1px solid #3a3a42;border-radius:12px;padding:24px;max-width:600px;width:90%;max-height:80vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h3 id="feat-modal-title" style="margin:0">Configure Feature</h3>
      <button class="small" onclick="featCloseModal()" style="width:auto;padding:4px 12px;background:#ef5350">✕</button>
    </div>
    <div id="feat-modal-body" style="color:#ccc;font-size:13px">Loading...</div>
    <div style="display:flex;gap:8px;margin-top:16px">
      <button class="small" id="feat-modal-save" onclick="featSaveConfig()" style="width:auto;background:#4caf50">💾 Save</button>
      <button class="small" onclick="featCloseModal()" style="width:auto;background:#3a3a42">Cancel</button>
    </div>
  </div>
</div>
<script>
var _featCurrentApi = null, _featCurrentConfig = null;
var _featKeyMap = ${JSON.stringify(_featKeyMap)};

function featToggle(api, enabled) {
  fetch('/api/features/' + api, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ enabled: enabled })
  }).then(function(r) { return r.json(); }).then(function(d) { if (!d.success) alert('Failed to toggle: ' + (d.error || 'Unknown')); }).catch(function(e) { alert('Error: ' + e.message); });
}

function featConfigure(api) {
  _featCurrentApi = api;
  document.getElementById('feat-modal').style.display = 'flex';
  document.getElementById('feat-modal-title').textContent = 'Configure: ' + api;
  document.getElementById('feat-modal-body').innerHTML = '<span style="color:#8b8fa3">Loading...</span>';
  fetch('/api/features/' + api).then(function(r) { return r.json(); }).then(function(d) {
    if (!d.success && !d.config) { document.getElementById('feat-modal-body').innerHTML = '<span style="color:#ef5350">Failed to load config</span>'; return; }
    _featCurrentConfig = d.config || d;
    var j = JSON.stringify(_featCurrentConfig, null, 2).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
    document.getElementById('feat-modal-body').innerHTML = '<pre style="background:#0e0e10;padding:12px;border-radius:8px;overflow-x:auto;font-size:12px;color:#e0e0e0;max-height:400px;overflow-y:auto">' + j + '</pre><p style="color:#8b8fa3;font-size:11px;margin-top:8px">Edit the JSON below to update configuration:</p><textarea id="feat-config-edit" style="width:100%;min-height:200px;padding:12px;border:1px solid #3a3a42;border-radius:8px;background:#0e0e10;color:#e0e0e0;font-family:monospace;font-size:12px;resize:vertical">' + j + '</textarea>';
  }).catch(function(e) { document.getElementById('feat-modal-body').innerHTML = '<span style="color:#ef5350">Error: ' + e.message + '</span>'; });
}

function featSaveConfig() {
  if (!_featCurrentApi) return;
  var raw = document.getElementById('feat-config-edit')?.value;
  if (!raw) return alert('No configuration to save');
  try {
    var parsed = JSON.parse(raw);
    fetch('/api/features/' + _featCurrentApi, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(parsed)
    }).then(function(r) { return r.json(); }).then(function(d) {
      if (d.success) { alert('Saved!'); featCloseModal(); location.reload(); } else alert('Error: ' + (d.error || 'Save failed'));
    }).catch(function(e) { alert('Error: ' + e.message); });
  } catch(e) { alert('Invalid JSON: ' + e.message); }
}

function featCloseModal() { document.getElementById('feat-modal').style.display = 'none'; _featCurrentApi = null; _featCurrentConfig = null; }

(function() {
  fetch('/api/features').then(function(r) { return r.json(); }).then(function(d) {
    if (!d.success) return;
    var features = d.features || {};
    document.querySelectorAll('[data-feat-toggle]').forEach(function(toggle) {
      var api = toggle.getAttribute('data-feat-toggle');
      var key = _featKeyMap[api];
      var enabled = key && features[key] ? features[key].enabled : false;
      toggle.checked = !!enabled;
      var slider = toggle.parentElement.querySelector('.feat-slider');
      if (slider) { slider.style.transform = enabled ? 'translateX(18px)' : 'translateX(0)'; slider.style.background = enabled ? '#4caf50' : '#888'; }
      toggle.addEventListener('change', function() {
        var s = this.parentElement.querySelector('.feat-slider');
        if (s) { s.style.transform = this.checked ? 'translateX(18px)' : 'translateX(0)'; s.style.background = this.checked ? '#4caf50' : '#888'; }
      });
    });
  }).catch(function() {});
})();
</script>`;
}

function _renderFeaturePage(title, icon, desc, features, userTier) {
  const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
  const canEdit = TIER_LEVELS[userTier] >= TIER_LEVELS.admin;
  return `
<div class="card">
  <h2>${icon} ${title} <span style="color:#8b8fa3;font-size:14px;font-weight:400">(${features.length} features)</span></h2>
  <p style="color:#8b8fa3;margin-bottom:12px">${desc}</p>
  <div style="display:flex;gap:8px;margin-bottom:12px">
    <input type="text" id="feat-search" placeholder="Search features..." style="flex:1;padding:10px 14px;border:1px solid #3a3a42;border-radius:8px;background:#1d2028;color:#fff;font-size:13px">
  </div>
</div>
<div class="card" style="margin-top:12px">
  <div style="display:grid;gap:8px">
  ${_renderFeatureCards(features, canEdit)}
  </div>
</div>
${_renderFeatureScript()}
<script>
document.getElementById('feat-search').addEventListener('input', function() {
  var q = this.value.toLowerCase().trim();
  document.querySelectorAll('.feat-row').forEach(function(row) {
    var name = (row.getAttribute('data-feat-name') || '').toLowerCase();
    var id = (row.getAttribute('data-feat-id') || '').toLowerCase();
    row.style.display = (!q || name.includes(q) || id.includes(q)) ? '' : 'none';
  });
});
</script>`;
}

// ── Tab 1: Safety & Moderation ──
export function renderFeaturesSafetyTab(userTier) {
  return _renderFeaturePage('Safety & Moderation', '🛡️', 'Auto-moderation, safety filters, and moderation tools.', [
    { id: 'F1', name: 'Moderation Auto-Escalation', icon: '⚖️', api: null, builtin: true, tier: 'admin', desc: 'Automatic warn → mute → kick → ban progression based on infraction count' },
    { id: 'F6', name: 'Smart Slowmode', icon: '🐌', api: 'smart-slowmode', tier: 'admin', desc: 'Auto-adjusts channel slowmode based on message velocity' },
    { id: 'F12', name: 'XP Blacklist', icon: '🚫', api: 'xp-blacklist', tier: 'admin', desc: 'Exclude channels/roles from earning XP' },
    { id: 'F34', name: 'Warning Expiry', icon: '⏳', api: 'warning-expiry', tier: 'admin', desc: 'Warnings auto-expire after configurable days' },
    { id: 'F35', name: 'Quarantine System', icon: '🔒', api: 'quarantine', tier: 'admin', desc: 'Auto-assign quarantine role to new members' },
    { id: 'F37', name: 'Media-Only Channels', icon: '📷', api: 'media-only', tier: 'admin', desc: 'Only allow images/videos/files in configured channels' },
    { id: 'F58', name: 'Anti-Alt Detector', icon: '🕵️', api: 'anti-alt', tier: 'admin', desc: 'Flags new accounts younger than configurable days' },
    { id: 'F60', name: 'Member Notes', icon: '📝', api: 'member-notes', tier: 'moderator', desc: 'Private mod-only notes per member' },
    { id: 'F36', name: 'Mod Mail', icon: '📬', api: 'modmail', tier: 'admin', desc: 'DM-to-channel moderation mail system' },
    { id: 'F47', name: 'Message Bookmarks', icon: '🔖', api: 'bookmarks', tier: 'moderator', desc: 'React with 🔖 to bookmark messages via DM' },
  ], userTier);
}

// ── Tab 2: Engagement & Social ──
export function renderFeaturesEngagementTab(userTier) {
  return _renderFeaturePage('Engagement & Social', '🔥', 'Leveling enhancements, streaks, milestones, and community features.', [
    { id: 'F2', name: 'Leveling Streaks', icon: '🔥', api: 'streaks', tier: 'admin', desc: 'Daily XP bonus for consecutive-day activity' },
    { id: 'F10', name: 'Giveaway Requirements', icon: '🎁', api: 'giveaway-requirements', tier: 'admin', desc: 'Require minimum level and activity to enter giveaways' },
    { id: 'F20', name: 'Member Milestones', icon: '🎉', api: 'member-milestones', tier: 'admin', desc: 'Auto-announce member count milestones and anniversaries' },
    { id: 'F28', name: 'Auto-Role on Rejoin', icon: '🔄', api: 'auto-role-rejoin', tier: 'admin', desc: 'Saves roles on leave, restores on rejoin' },
    { id: 'F53', name: 'Invite Tracker', icon: '🔗', api: 'invite-tracker', tier: 'admin', desc: 'Track which invite link brought each member' },
    { id: 'F29', name: 'Birthday System', icon: '🎂', api: 'birthdays', tier: 'admin', desc: 'Daily birthday announcements with optional role' },
    { id: 'F45', name: 'Timezone Helper', icon: '🕐', api: 'timezones', tier: 'moderator', desc: 'Members register timezone, lookup local time' },
  ], userTier);
}

// ── Tab 3: Server Management ──
export function renderFeaturesServerTab(userTier) {
  return _renderFeaturePage('Server Management', '🔧', 'Channel management, auto-purge, scheduled messages, and server tools.', [
    { id: 'F4', name: 'Suggestion Statuses', icon: '💡', api: null, builtin: true, tier: 'moderator', desc: 'Mark suggestions as accepted/denied/implemented' },
    { id: 'F5', name: 'Stats Channels', icon: '📊', api: 'stats-channels', tier: 'admin', desc: 'Auto-updating voice channels with server stats' },
    { id: 'F8', name: 'Sticky Messages', icon: '📌', api: 'sticky-messages', tier: 'admin', desc: 'Pin messages that re-send when pushed up' },
    { id: 'F9', name: 'Auto-Thread', icon: '🧵', api: 'auto-thread', tier: 'admin', desc: 'Auto-create threads on messages in configured channels' },
    { id: 'F15', name: 'Channel Lockdown', icon: '🔐', api: 'lockdown', tier: 'admin', desc: 'Lock/unlock channels from dashboard' },
    { id: 'F17', name: 'Bulk Moderation', icon: '👥', api: null, builtin: true, tier: 'admin', desc: 'Multi-select users for batch kick/ban/timeout' },
    { id: 'F38', name: 'Auto-Purge', icon: '🗑️', api: 'auto-purge', tier: 'admin', desc: 'Auto-delete old messages in configured channels' },
    { id: 'F49', name: 'Scheduled Announcements', icon: '📢', api: 'scheduled-announcements', tier: 'admin', desc: 'Cron-like recurring announcements with templates' },
    { id: 'F57', name: 'Scheduled Roles', icon: '🗓️', api: 'scheduled-roles', tier: 'admin', desc: 'Give/remove roles at scheduled times' },
  ], userTier);
}

// ── Tab 4: Integrations ──
export function renderFeaturesIntegrationsTab(userTier) {
  return _renderFeaturePage('Integrations', '🔗', 'External services, webhooks, RSS feeds, and API connections.', [
    { id: 'F7', name: 'Welcome Image', icon: '🖼️', api: 'welcome-image', tier: 'admin', desc: 'Canvas-generated welcome images config' },
    { id: 'F22', name: 'Scheduled Events Sync', icon: '📅', api: 'event-sync', tier: 'admin', desc: 'Sync Discord scheduled events from stream schedule' },
    { id: 'F24', name: 'Webhook Forwarding', icon: '🔗', api: 'webhook-forwarding', tier: 'admin', desc: 'Forward bot events to external webhook URL' },
    { id: 'F25', name: 'Twitch Clip Auto-Post', icon: '🎬', api: 'twitch-clips', tier: 'admin', desc: 'Auto-post new Twitch clips to channel' },
    { id: 'F26', name: 'Ticket Idle Warning', icon: '⏰', api: 'ticket-idle', tier: 'admin', desc: 'Warn and auto-close inactive tickets' },
    { id: 'F43', name: 'RSS Feeds', icon: '📰', api: 'rss-feeds', tier: 'admin', desc: 'Up to 15 RSS feed URLs auto-posted as embeds' },
    { id: 'F44', name: 'Custom API Polling', icon: '🌐', api: 'api-polling', tier: 'admin', desc: 'Poll up to 10 external JSON APIs on schedule' },
    { id: 'F46', name: 'Role Analytics', icon: '📊', api: 'role-analytics', tier: 'moderator', desc: 'Per-role statistics with member count and average level' },
  ], userTier);
}

// ── Tab 5: Monitoring & Logging ──
export function renderFeaturesMonitoringTab(userTier) {
  return _renderFeaturePage('Monitoring & Logging', '📈', 'Activity tracking, analytics, retention, and automated backups.', [
    { id: 'F18', name: 'Log Search & Filter', icon: '🔍', api: null, builtin: true, tier: 'moderator', desc: 'Search logs by user, type, date, keyword' },
    { id: 'F19', name: 'Auto-Backup to Discord', icon: '💾', api: 'auto-backup-discord', tier: 'owner', desc: 'Periodically send JSON backups to Discord channel' },
    { id: 'F21', name: 'Channel Activity', icon: '📈', api: 'channel-activity', tier: 'moderator', desc: 'Per-channel message volume and top posters' },
    { id: 'F39', name: 'Engagement Heatmap', icon: '🗺️', api: 'engagement-heatmap', tier: 'moderator', desc: '7×24 grid of message activity by day/hour' },
    { id: 'F40', name: 'Member Retention', icon: '📉', api: 'member-retention', tier: 'admin', desc: 'Track retention rates for 1d/7d/30d/90d periods' },
    { id: 'F41', name: 'Server Health Score', icon: '❤️', api: 'server-health', tier: 'moderator', desc: 'Composite 0-100 server health score' },
    { id: 'F42', name: 'Voice Activity', icon: '🎤', api: 'voice-activity', tier: 'moderator', desc: 'Per-user voice time tracking' },
  ], userTier);
}

// ── Tab 6: Dashboard & Bot ──
export function renderFeaturesDashboardTab(userTier) {
  return _renderFeaturePage('Dashboard & Bot', '🎨', 'Dashboard appearance, notifications, SmartBot enhancements, and bot status rotation.', [
    { id: 'F3', name: 'Dashboard Themes', icon: '🎨', api: 'theme', tier: 'viewer', desc: 'Dark/light/custom theme toggle' },
    { id: 'F11', name: 'Push Notifications', icon: '🔔', api: 'push-notifications', tier: 'moderator', desc: 'Browser push notifications for events' },
    { id: 'F16', name: 'Dashboard Prefs', icon: '📱', api: 'dashboard-prefs', tier: 'viewer', desc: 'Mobile layout and widget preferences' },
    { id: 'F59', name: 'Dashboard Changelog', icon: '📜', api: 'changelog', tier: 'moderator', desc: 'Auto-generated changelog from audit log' },
    { id: 'F13', name: 'SmartBot Memory', icon: '🧠', api: null, builtin: true, tier: 'admin', desc: 'Remember context from previous conversations' },
    { id: 'F14', name: 'Status Rotation', icon: '🔄', api: 'status-rotation', tier: 'admin', desc: 'Cycle through custom bot status messages' },
    { id: 'F48', name: 'Auto-Responder', icon: '💬', api: 'auto-responder', tier: 'admin', desc: 'Pattern-based auto-reply rules' },
  ], userTier);
}

