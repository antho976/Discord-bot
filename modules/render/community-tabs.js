/**
 * Community Dashboard Render Tabs
 * Extracted from index.js — overview, events, moderation, tickets, reaction roles,
 * automod, starboard, pets, idleon, tools, accounts, audit log, etc.
 */
import fs from 'fs';
import path from 'path';
import { renderGiveawaysTab, renderPollsTab, renderRemindersTab, renderSuggestionsTab, renderSettingsTab, renderCommandsAndConfigTab, renderConfigGeneralTab, renderConfigNotificationsTab, renderConfigTab, renderNotificationsTab, renderYouTubeAlertsTab, renderCustomCommandsTab, renderLevelingTab, renderEmbedsTab, renderWelcomeTab, safeJsonForHtml, renderProfileTab, renderBotConfigTab } from './config-tabs.js';
import { renderHealthTab, renderAnalyticsTab, renderEngagementStatsTab, renderStreaksMilestonesTab, renderTrendsStatsTab, renderGamePerformanceTab, renderViewerPatternsTab, renderAIInsightsTab, renderReportsTab, renderCommunityStatsTab, renderRPGEconomyTab, renderRPGQuestsCombatTab, renderStreamCompareTab, renderRPGAnalyticsTab, renderRPGEventsTab, renderAnalyticsFeaturesTab, renderMemberGrowthTab, renderCommandUsageTab, renderRevenueTab } from './analytics-tabs.js';
import { renderRPGEditorTab } from './rpg-editor-tab.js';
import { renderRPGWorldsTab, renderRPGQuestsTab, renderRPGValidatorsTab, renderRPGSimulatorsTab, renderRPGEntitiesTab, renderRPGSystemsTab, renderRPGAITab, renderRPGFlagsTab, renderRPGGuildTab, renderRPGAdminTab, renderRPGGuildStatsTab } from './rpg-tabs.js';
import { renderSmartBotConfigTab, renderSmartBotKnowledgeTab, renderSmartBotNewsTab, renderSmartBotStatsTab, renderSmartBotLearningTab, renderSmartBotTrainingTab } from '../smartbot-routes.js';
import { renderNotificationsMailTab, renderDMsTab } from './messaging-tabs.js';

let _getState;

export function initCommunityTabs(getStateFn) {
  _getState = getStateFn;
}

// ── Reusable inline-feature section builder ──
// Generates a collapsible card with toggle + custom fields + save for /api/features/{api}
function _inlineFeature(api, stateKey, title, icon, desc, fieldsHTML, opts = {}) {
  const id = api.replace(/[^a-zA-Z0-9]/g, '_');
  return `
<div class="card" style="margin-top:10px;border-left:3px solid ${opts.accent || '#5b5bff'}">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
    <div style="display:flex;align-items:center;gap:8px">
      <span style="font-size:18px">${icon}</span>
      <div>
        <strong style="color:#e0e0e0;font-size:14px">${title}</strong>
        <div style="color:#8b8fa3;font-size:11px;margin-top:2px">${desc}</div>
      </div>
    </div>
    ${opts.noToggle ? '' : `<label style="position:relative;display:inline-block;width:44px;height:24px;cursor:pointer;flex-shrink:0">
      <input type="checkbox" id="if_${id}_enabled" style="opacity:0;width:0;height:0;position:absolute">
      <span style="position:absolute;top:0;left:0;right:0;bottom:0;background:#3a3a42;border-radius:12px;transition:.3s;pointer-events:none"></span>
      <span id="if_${id}_slider" style="position:absolute;top:2px;left:2px;width:20px;height:20px;background:#888;border-radius:50%;transition:.3s;pointer-events:none"></span>
    </label>`}
  </div>
  <div id="if_${id}_body" style="display:grid;gap:8px;padding-top:8px;border-top:1px solid #2a2f3a">
    ${fieldsHTML}
    <div style="display:flex;gap:8px;align-items:center;margin-top:4px">
      <button onclick="ifSave_${id}()" style="padding:6px 16px;background:#5b5bff;color:#fff;border:none;border-radius:6px;font-size:12px;cursor:pointer;font-weight:600">💾 Save</button>
      <span id="if_${id}_status" style="font-size:12px"></span>
    </div>
  </div>
</div>
<script>
(function(){
  fetch('/api/features/${api}').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;
    ${opts.noToggle ? '' : `var en=document.getElementById('if_${id}_enabled');var sl=document.getElementById('if_${id}_slider');if(en){en.checked=!!c.enabled;if(sl){sl.style.transform=c.enabled?'translateX(20px)':'translateX(0)';sl.style.background=c.enabled?'#4caf50':'#888';}en.addEventListener('change',function(){if(sl){sl.style.transform=this.checked?'translateX(20px)':'translateX(0)';sl.style.background=this.checked?'#4caf50':'#888';}});}`}
    if(typeof ifLoad_${id}==='function')ifLoad_${id}(c);
  }).catch(function(){});
})();
</script>`;
}

function _inlineFieldRow(label, inputHTML) {
  return `<div><label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:3px">${label}</label>${inputHTML}</div>`;
}

function _inlineInput(id, placeholder, type = 'text', extra = '') {
  return `<input id="${id}" type="${type}" placeholder="${placeholder}" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px" ${extra}>`;
}

function _inlineTextArea(id, placeholder, rows = 3) {
  return `<textarea id="${id}" placeholder="${placeholder}" rows="${rows}" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px;resize:vertical"></textarea>`;
}

function _inlineSelect(id, options) {
  return `<select id="${id}" style="width:100%;padding:8px 10px;border:1px solid #3a3a42;border-radius:6px;background:#1d2028;color:#e0e0e0;font-size:12px">${options.map(o => `<option value="${o.value}">${o.label}</option>`).join('')}</select>`;
}

function _ifSaveScript(id, api, bodyBuilder) {
  return `
<script>
function ifSave_${id}(){
  var body=${bodyBuilder};
  fetch('/api/features/${api}',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)})
    .then(function(r){return r.json()}).then(function(d){
      var st=document.getElementById('if_${id}_status');
      if(d.success){if(st)st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){if(st)st.innerHTML='';},3000);}
      else{if(st)st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}
    }).catch(function(e){alert('Error: '+e.message);});
}
</script>`;
}

export function renderEventsTab(tab) {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const subTab = tab === 'events' ? 'events-giveaways' : tab;
  const isGiveaways = subTab === 'events-giveaways';
  const isPolls = subTab === 'events-polls';
  const isReminders = subTab === 'events-reminders';
  const isSchedule = subTab === 'events-schedule';
  const isBirthdays = subTab === 'events-birthdays';
  
  return `
<div class="card" style="margin-bottom:20px">
  <div style="display:flex;gap:8px;flex-wrap:wrap;border-bottom:2px solid #3a3a42;padding-bottom:10px">
    <button class="small" style="width:auto;background:${isGiveaways ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-giveaways'">🎁 Giveaways</button>
    <button class="small" style="width:auto;background:${isPolls ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-polls'">📊 Polls</button>
    <button class="small" style="width:auto;background:${isReminders ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-reminders'">⏰ Reminders</button>
    <button class="small" style="width:auto;background:${isSchedule ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-schedule'">📅 Schedule</button>
    <button class="small" style="width:auto;background:${isBirthdays ? '#9146ff' : '#2a2f3a'};color:white" onclick="location.href='/events?tab=events-birthdays'">🎂 Birthdays</button>
  </div>
</div>

${isGiveaways ? renderGiveawaysContent() : isPolls ? renderPollsContent() : isSchedule ? renderScheduledMsgsTab() : isBirthdays ? renderBirthdaysContent() : renderRemindersContent()}
`;
}

function renderBirthdaysContent() {
  const fieldsHTML = `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    ${_inlineFieldRow('Announcement Channel ID', _inlineInput('if_birthdays_ch', 'Channel ID for birthday messages'))}
    ${_inlineFieldRow('Birthday Role ID (optional)', _inlineInput('if_birthdays_role', 'Role ID — assigned on birthday'))}
  </div>
`;
  return `
<div class="card">
  <h2>🎂 Birthday System</h2>
  <p style="color:#8b8fa3;margin-bottom:12px">Daily birthday announcements with optional birthday role.</p>
</div>
${_inlineFeature('birthdays', 'birthdays', 'Birthday System', '🎂', 'Enable daily birthday announcements and optional birthday role assignment.', fieldsHTML, { accent: '#e91e63' })}
<script>
function ifLoad_birthdays(c){document.getElementById('if_birthdays_ch').value=c.channelId||'';document.getElementById('if_birthdays_role').value=c.roleId||'';}
function ifSave_birthdays(){
  var body={enabled:document.getElementById('if_birthdays_enabled').checked,channelId:document.getElementById('if_birthdays_ch').value.trim()||null,roleId:document.getElementById('if_birthdays_role').value.trim()||null};
  fetch('/api/features/birthdays',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_birthdays_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>
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

export function renderTab(tab, userTier, subTab){
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
  const _bestPeak = _recentStreams.reduce((max, s) => Math.max(max, s.peakViewers || s.viewers || 0), 0);
  const _recentStreamsHtml = _recentStreams.length > 0 ? '<div style="overflow-x:auto"><table style="font-size:12px;width:100%;border-collapse:collapse"><thead><tr style="background:#1e1f22;border-bottom:2px solid #9146ff44"><th style="padding:8px 10px;text-align:left;color:#9146ff;font-size:11px;text-transform:uppercase;letter-spacing:.3px">Date</th><th style="padding:8px 10px;text-align:left;color:#9146ff;font-size:11px;text-transform:uppercase;letter-spacing:.3px">Day</th><th style="padding:8px 10px;text-align:left;color:#9146ff;font-size:11px;text-transform:uppercase;letter-spacing:.3px">Game</th><th style="padding:8px 10px;text-align:center;color:#9146ff;font-size:11px;text-transform:uppercase;letter-spacing:.3px">Peak</th><th style="padding:8px 10px;text-align:center;color:#9146ff;font-size:11px;text-transform:uppercase;letter-spacing:.3px">Avg</th><th style="padding:8px 10px;text-align:center;color:#9146ff;font-size:11px;text-transform:uppercase;letter-spacing:.3px">Hours</th><th style="padding:8px 10px;text-align:center;color:#9146ff;font-size:11px;text-transform:uppercase;letter-spacing:.3px">Follows</th></tr></thead><tbody>' + _recentStreams.map((s, idx) => {
    const dur = s.duration ? Math.round(s.duration / 60) : (s.durationMinutes || 0);
    const hrs = (dur / 60).toFixed(1);
    const peak = s.peakViewers || s.viewers || 0;
    const avg = s.avgViewers || s.viewers || 0;
    const fols = s.followers || s.newFollowers || 0;
    const date = s.startedAt ? new Date(s.startedAt) : null;
    const dayName = date ? ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][date.getDay()] : '—';
    const dateStr = date ? date.toLocaleDateString() : '—';
    const game = (s.game || s.gameName || '—').substring(0, 25);
    const isBest = peak === _bestPeak && peak > 0;
    const rowBg = idx % 2 === 0 ? '#1a1d2800' : '#1a1d2866';
    const peakColor = isBest ? '#ffd700' : peak > 0 ? '#ffca28' : '#8b8fa3';
    return '<tr style="background:' + rowBg + ';border-bottom:1px solid #2a2f3a33;transition:background .15s" onmouseover="this.style.background=\'#2a2f3a66\'" onmouseout="this.style.background=\'' + rowBg + '\'"><td style="padding:7px 10px;color:#e0e0e0">' + dateStr + '</td><td style="padding:7px 10px;color:#8b8fa3">' + dayName + '</td><td style="padding:7px 10px;max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"><span style="background:#9146ff22;color:#c4b5fd;padding:2px 8px;border-radius:4px;font-size:11px">' + game + '</span></td><td style="padding:7px 10px;text-align:center;color:' + peakColor + ';font-weight:700">' + (isBest ? '👑 ' : '') + peak + '</td><td style="padding:7px 10px;text-align:center;color:#b0b0b0">' + avg + '</td><td style="padding:7px 10px;text-align:center;color:#5865f2">' + hrs + '</td><td style="padding:7px 10px;text-align:center;color:' + (fols > 0 ? '#4caf50' : '#666') + ';font-weight:' + (fols > 0 ? '600' : '400') + '">' + (fols > 0 ? '+' + fols : '0') + '</td></tr>';
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
  if (!TWITCH_ACCESS_TOKEN) _warnList.push({icon:'🔑', msg:'Twitch token not set', color:'#ef5350', link:'/health', linkLabel:'Fix in Health'});
  if (_tokenWarn) _warnList.push({icon:'⏰', msg:'Token expires in ' + _tokenHoursLeft + 'h', color:'#ffca28', link:'/health', linkLabel:'View Health'});
  if (!_ytHealthy) _warnList.push({icon:'📺', msg:'YouTube checker error', color:'#ef5350', link:'/youtube-alerts', linkLabel:'Fix YouTube'});
  const _warnBanner = _warnList.length > 0 ? '<div data-ov-section="admin" class="card" style="border-color:' + _warnList[0].color + '33;background:' + _warnList[0].color + '08;padding:12px 16px"><div style="display:flex;align-items:center;gap:8px;cursor:pointer" onclick="this.nextElementSibling.style.display=this.nextElementSibling.style.display===\'none\'?\'block\':\'none\'"><span style="font-size:16px">⚠️</span><span style="font-size:13px;font-weight:600;color:#ffca28">' + _warnList.length + ' active warning' + (_warnList.length>1?'s':'') + '</span><span style="margin-left:auto;font-size:11px;color:#8b8fa3">click to toggle</span></div><div style="margin-top:8px">' + _warnList.map(w => '<div style="display:flex;align-items:center;gap:8px;padding:6px 0;font-size:12px;color:' + w.color + '">' + w.icon + ' ' + w.msg + (w.link ? ' <a href="' + w.link + '" style="margin-left:auto;font-size:11px;padding:3px 10px;background:' + w.color + '22;border:1px solid ' + w.color + '44;border-radius:4px;color:' + w.color + ';text-decoration:none;font-weight:600">' + w.linkLabel + ' →</a>' : '') + '</div>').join('') + '</div></div>' : '';

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
  const _isLiveNow = !!isLive;
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
    let _gameLabel = '';
    let _titleLabel = '';
    if (_daySlot) {
      const _sh = _daySlot.hour || 0;
      const _sm = _daySlot.minute || 0;
      const _ampm = _sh >= 12 ? 'PM' : 'AM';
      const _h12 = _sh > 12 ? _sh - 12 : (_sh === 0 ? 12 : _sh);
      _timeLabel = _h12 + ':' + (_sm < 10 ? '0' : '') + _sm + ' ' + _ampm;
      if (_daySlot.game) _gameLabel = String(_daySlot.game).substring(0, 15);
      if (_daySlot.title) _titleLabel = String(_daySlot.title).substring(0, 20);
    }
    _weeklyCalHtml += '<div style="text-align:center;padding:8px 4px;border-radius:6px;background:' + (_isToday ? '#2a2f3a' : '#22222a') + ';' + _border + ';transition:transform .1s" onmouseover="this.style.transform=\'scale(1.05)\'" onmouseout="this.style.transform=\'scale(1)\'">' +
      '<div style="font-size:10px;color:' + (_isToday ? '#fff' : '#8b8fa3') + ';font-weight:' + (_isToday ? '700' : '400') + ';text-transform:uppercase;letter-spacing:.3px">' + _schedLabels[_di] + '</div>' +
      '<div style="width:8px;height:8px;border-radius:50%;background:' + _dotColor + ';margin:4px auto;' + (_hasSlot && _isToday ? 'box-shadow:0 0 6px ' + _dotColor : '') + '"></div>' +
      '<div style="font-size:11px;color:' + (_hasSlot ? '#e0e0e0' : '#555') + ';font-weight:' + (_hasSlot ? '600' : '400') + '">' + _timeLabel + '</div>' +
      (_gameLabel ? '<div style="font-size:9px;color:#9146ff;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _gameLabel + '">🎮 ' + _gameLabel + '</div>' : '') +
      (_titleLabel && !_gameLabel ? '<div style="font-size:9px;color:#8b8fa3;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + _titleLabel + '">' + _titleLabel + '</div>' : '') +
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

<!-- ═══ API RATE LIMITS (full width) ═══ -->
<div style="margin-bottom:10px">
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
${(!_isLiveNow && dashboardSettings.hideStreamWhenOffline) ? '<!-- stream section hidden (offline + hideStreamWhenOffline) -->' : `
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

    <!-- Schedule Card Actions -->
    <div style="margin-top:14px;padding:12px;background:#1a1a24;border:1px solid #3a3a42;border-radius:8px">
      <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
        <span style="font-size:12px;font-weight:600;color:#e0e0e0">📤 Monthly Schedule Card</span>
      </div>
      <div style="margin-bottom:10px">
        <img id="ovSchedulePreview" src="/api/stream-schedule/preview?cb=${Date.now()}" alt="Schedule Preview" style="width:100%;border-radius:6px;border:1px solid #2a2f3a;display:block" onerror="this.style.display='none';document.getElementById('ovSchedulePreviewErr').style.display='block'" />
        <div id="ovSchedulePreviewErr" style="display:none;text-align:center;padding:20px;color:#8b8fa3;font-size:12px">Preview unavailable</div>
      </div>
      <div style="display:flex;gap:8px;flex-wrap:wrap">
        <button onclick="ovSendScheduleToDiscord()" id="ovSendScheduleBtn" style="flex:1;padding:8px 12px;background:#5865f2;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:12px;min-width:140px">📤 Send to Discord</button>
        <button onclick="ovRefreshDailyPost()" style="padding:8px 12px;background:#2a2f3a;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;cursor:pointer;font-size:12px">🔄 Refresh Daily Post</button>
        <button onclick="document.getElementById('ovSchedulePreview').src='/api/stream-schedule/preview?cb='+Date.now()" style="padding:8px 12px;background:#2a2f3a;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;cursor:pointer;font-size:12px">👁️ Refresh Preview</button>
      </div>
      <div id="ovScheduleStatus" style="margin-top:8px;font-size:11px;color:#8b8fa3;display:none"></div>
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
`}


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

// ── Rate Limits (All APIs) ──
function ovLoadRateLimits() {
  fetch('/api/rate-limits').then(function(r){return r.json()}).then(function(d){
    var wrap = document.getElementById('ovRateLimitsWrap');
    if (!wrap) return;
    var tPct = d.twitch ? d.twitch.pct : 100;
    var tColor = tPct > 50 ? '#4caf50' : tPct > 20 ? '#ffca28' : '#ef5350';
    var html = '<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px">';
    // Twitch
    html += '<div style="background:#2a2f3a;padding:8px 10px;border-radius:6px"><div style="font-size:10px;color:#8b8fa3;margin-bottom:4px">🟣 Twitch API</div>';
    html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
    html += '<span style="color:' + tColor + ';font-weight:700">' + (d.twitch ? d.twitch.remaining + '/' + d.twitch.limit : '—') + '</span>';
    html += '<div style="flex:1;min-width:40px;background:#17171b;border-radius:3px;height:4px;overflow:hidden"><div style="background:' + tColor + ';height:100%;width:' + tPct + '%;border-radius:3px"></div></div>';
    html += '</div></div>';
    // Discord
    var dPing = d.discord ? d.discord.wsping : -1;
    var dColor = dPing < 100 ? '#4caf50' : dPing < 300 ? '#ffca28' : '#ef5350';
    html += '<div style="background:#2a2f3a;padding:8px 10px;border-radius:6px"><div style="font-size:10px;color:#8b8fa3;margin-bottom:4px">🔵 Discord</div>';
    html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
    html += '<span style="color:#8b8fa3">WS:</span> <span style="color:' + dColor + ';font-weight:700">' + (dPing >= 0 ? dPing + 'ms' : '—') + '</span>';
    html += '<span style="color:#8b8fa3">Guilds:</span> <span style="color:#5865f2;font-weight:700">' + (d.discord ? d.discord.guilds : 0) + '</span>';
    html += '</div></div>';
    // YouTube
    html += '<div style="background:#2a2f3a;padding:8px 10px;border-radius:6px"><div style="font-size:10px;color:#8b8fa3;margin-bottom:4px">🔴 YouTube Feeds</div>';
    html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
    html += '<span style="color:#8b8fa3">Polls:</span> <span style="color:#ff4444;font-weight:700">' + (d.youtube ? d.youtube.calls : 0) + '</span>';
    html += '<span style="color:#8b8fa3">/min:</span> <span style="color:#ff4444;font-weight:700">' + (d.youtube ? d.youtube.callsMinute : 0) + '</span>';
    html += '</div></div>';
    // Overall
    html += '<div style="background:#2a2f3a;padding:8px 10px;border-radius:6px"><div style="font-size:10px;color:#8b8fa3;margin-bottom:4px">📈 Total</div>';
    html += '<div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">';
    html += '<span style="color:#8b8fa3">Calls/min:</span> <span style="color:#5865f2;font-weight:700">' + d.callsThisMinute + '</span>';
    html += '<span style="color:#8b8fa3">Total:</span> <span style="color:#e0e0e0;font-weight:700">' + d.totalCalls + '</span>';
    html += '</div></div>';
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
  var labels = ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
  var fullLabels = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  fetch('/api/stream-schedule').then(function(r){return r.json()}).then(function(data) {
    var weekly = data.weekly || {};

    // Build day-pill grid (toggle on/off by clicking)
    var dayPills = '';
    days.forEach(function(d, i) {
      var slot = weekly[d];
      var active = !!slot;
      var hour = slot ? (slot.hour || 0) : (i === 0 || i === 6 ? 14 : 17);
      var minute = slot ? (slot.minute || 0) : 0;
      var hVal = (hour < 10 ? '0' : '') + hour + ':' + (minute < 10 ? '0' : '') + minute;
      var isWe = i === 0 || i === 6;
      dayPills += '<div id="schedCard_' + d + '" data-day="' + d + '" style="background:' + (active ? '#1a2a1a' : '#1a1a24') + ';border:2px solid ' + (active ? '#4caf50' : '#3a3a42') + ';border-radius:10px;padding:12px 8px;text-align:center;cursor:pointer;transition:all .15s;user-select:none" onclick="ovToggleDay(\'' + d + '\')">' +
        '<input type="checkbox" id="schedEn_' + d + '" ' + (active ? 'checked' : '') + ' style="display:none">' +
        '<div style="font-size:12px;font-weight:700;color:' + (active ? '#e0e0e0' : '#555') + ';margin-bottom:6px">' + labels[i] + '</div>' +
        '<div style="font-size:10px;color:' + (isWe ? '#9146ff55' : '#55556600') + ';margin-bottom:4px;height:12px">' + (isWe ? 'weekend' : '') + '</div>' +
        '<input type="time" id="schedTime_' + d + '" value="' + hVal + '" style="background:#0f0f14;border:1px solid ' + (active ? '#4caf5044' : '#2a2a32') + ';border-radius:6px;color:' + (active ? '#4caf50' : '#555') + ';padding:6px 4px;font-size:14px;font-weight:700;width:100%;text-align:center;font-family:monospace" onclick="event.stopPropagation();this.focus()" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()">' +
        '<div style="font-size:9px;color:#8b8fa3;margin-top:4px">' + fullLabels[i] + '</div>' +
        '</div>';
    });

    overlay.innerHTML = '<div style="background:#1f1f23;border:1px solid #3a3a42;border-radius:12px;max-width:580px;width:100%;padding:24px;box-shadow:0 20px 60px rgba(0,0,0,0.6)">' +
      // Header
      '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><h3 style="margin:0;color:#e0e0e0;font-size:17px">📅 Edit Weekly Schedule</h3><button onclick="document.getElementById(\\'ovSchedOverlay\\').remove()" style="background:none;border:none;color:#8b8fa3;font-size:22px;cursor:pointer;padding:0;line-height:1">✕</button></div>' +
      '<div style="font-size:12px;color:#8b8fa3;margin-bottom:14px">Click a day to toggle it. Set time for each day or use quick-fill below.</div>' +

      // Day grid (7 columns)
      '<div style="display:grid;grid-template-columns:repeat(7,1fr);gap:6px;margin-bottom:16px">' + dayPills + '</div>' +

      // Quick-fill bar
      '<div style="background:#16161c;border:1px solid #2a2f3a;border-radius:8px;padding:12px;margin-bottom:16px">' +
        '<div style="font-size:11px;color:#8b8fa3;font-weight:600;text-transform:uppercase;letter-spacing:.4px;margin-bottom:8px">⚡ Quick Fill</div>' +
        '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
          '<input type="time" id="schedQuickTime" value="17:00" style="background:#0f0f14;border:1px solid #3a3a42;border-radius:6px;color:#e0e0e0;padding:6px 10px;font-size:14px;font-weight:700;font-family:monospace;width:110px" onkeydown="event.stopPropagation()" onkeypress="event.stopPropagation()" onkeyup="event.stopPropagation()">' +
          '<button onclick="ovQuickFill(\\'weekdays\\')" style="padding:6px 10px;background:#2a2f3a;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap">Mon–Fri</button>' +
          '<button onclick="ovQuickFill(\\'weekend\\')" style="padding:6px 10px;background:#2a2f3a;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap">Sat–Sun</button>' +
          '<button onclick="ovQuickFill(\\'all\\')" style="padding:6px 10px;background:#2a2f3a;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap">All 7</button>' +
          '<button onclick="ovQuickFill(\\'clear\\')" style="padding:6px 10px;background:#2a2020;color:#ef5350;border:1px solid #ef535033;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap">Clear All</button>' +
        '</div>' +
        '<div style="display:flex;align-items:center;gap:8px;margin-top:8px;flex-wrap:wrap">' +
          '<span style="font-size:10px;color:#666">Copy from:</span>' +
          days.map(function(d, i) {
            return '<button onclick="ovCopyFrom(\'' + d + '\')" style="padding:3px 8px;background:#1a1a24;color:#8b8fa3;border:1px solid #2a2f3a;border-radius:4px;cursor:pointer;font-size:10px">' + labels[i] + '</button>';
          }).join('') +
        '</div>' +
      '</div>' +

      // Save / Cancel
      '<div style="display:flex;gap:8px">' +
        '<button onclick="ovSaveSchedule()" style="flex:1;padding:10px;background:#9146ff;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:600;font-size:13px">💾 Save Schedule</button>' +
        '<button onclick="document.getElementById(\\'ovSchedOverlay\\').remove()" style="padding:10px 16px;background:#2a2f3a;color:#8b8fa3;border:1px solid #3a3a42;border-radius:6px;cursor:pointer;font-size:13px">Cancel</button>' +
      '</div>' +
    '</div>';
  }).catch(function() {
    overlay.innerHTML = '<div style="background:#1f1f23;padding:24px;border-radius:10px;color:#ef5350">Failed to load schedule</div>';
  });
  document.body.appendChild(overlay);
}

function ovToggleDay(day) {
  var cb = document.getElementById('schedEn_' + day);
  var card = document.getElementById('schedCard_' + day);
  var timeInput = document.getElementById('schedTime_' + day);
  if (!cb || !card) return;
  cb.checked = !cb.checked;
  if (cb.checked) {
    card.style.background = '#1a2a1a';
    card.style.borderColor = '#4caf50';
    timeInput.style.color = '#4caf50';
    timeInput.style.borderColor = '#4caf5044';
  } else {
    card.style.background = '#1a1a24';
    card.style.borderColor = '#3a3a42';
    timeInput.style.color = '#555';
    timeInput.style.borderColor = '#2a2a32';
  }
}

function ovSetDayActive(day, active, timeVal) {
  var cb = document.getElementById('schedEn_' + day);
  var card = document.getElementById('schedCard_' + day);
  var timeInput = document.getElementById('schedTime_' + day);
  if (!cb || !card || !timeInput) return;
  cb.checked = active;
  if (timeVal) timeInput.value = timeVal;
  if (active) {
    card.style.background = '#1a2a1a';
    card.style.borderColor = '#4caf50';
    timeInput.style.color = '#4caf50';
    timeInput.style.borderColor = '#4caf5044';
  } else {
    card.style.background = '#1a1a24';
    card.style.borderColor = '#3a3a42';
    timeInput.style.color = '#555';
    timeInput.style.borderColor = '#2a2a32';
  }
}

function ovQuickFill(mode) {
  var days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  var qt = document.getElementById('schedQuickTime');
  var time = qt ? qt.value : '17:00';
  days.forEach(function(d, i) {
    var isWeekday = i >= 1 && i <= 5;
    var isWeekend = i === 0 || i === 6;
    if (mode === 'weekdays') ovSetDayActive(d, isWeekday, isWeekday ? time : null);
    else if (mode === 'weekend') ovSetDayActive(d, isWeekend, isWeekend ? time : null);
    else if (mode === 'all') ovSetDayActive(d, true, time);
    else if (mode === 'clear') ovSetDayActive(d, false, null);
  });
}

function ovCopyFrom(srcDay) {
  var srcTime = document.getElementById('schedTime_' + srcDay);
  var srcCb = document.getElementById('schedEn_' + srcDay);
  if (!srcTime || !srcCb) return;
  var time = srcTime.value;
  var active = srcCb.checked;
  var days = ['sunday','monday','tuesday','wednesday','thursday','friday','saturday'];
  days.forEach(function(d) {
    if (d === srcDay) return;
    var cb = document.getElementById('schedEn_' + d);
    if (cb && cb.checked) {
      // Only apply to days that are already enabled
      document.getElementById('schedTime_' + d).value = time;
    }
  });
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

function ovSendScheduleToDiscord() {
  var btn = document.getElementById('ovSendScheduleBtn');
  var status = document.getElementById('ovScheduleStatus');
  if (!btn) return;
  btn.disabled = true;
  btn.textContent = '⏳ Sending...';
  status.style.display = 'block';
  status.style.color = '#8b8fa3';
  status.textContent = 'Posting monthly card + daily embed to Discord...';
  fetch('/api/stream-schedule/send', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      if (d.success) {
        status.style.color = '#4caf50';
        status.textContent = '✅ Schedule posted to Discord!';
        btn.textContent = '✅ Sent!';
        setTimeout(function() { btn.disabled = false; btn.textContent = '📤 Send to Discord'; }, 3000);
      } else {
        status.style.color = '#ef5350';
        status.textContent = '❌ ' + (d.error || 'Failed');
        btn.disabled = false;
        btn.textContent = '📤 Send to Discord';
      }
    })
    .catch(function(e) {
      status.style.color = '#ef5350';
      status.textContent = '❌ ' + e.message;
      btn.disabled = false;
      btn.textContent = '📤 Send to Discord';
    });
}

function ovRefreshDailyPost() {
  fetch('/api/stream-schedule/refresh-daily', { method: 'POST' })
    .then(function(r) { return r.json(); })
    .then(function(d) {
      var status = document.getElementById('ovScheduleStatus');
      if (status) {
        status.style.display = 'block';
        if (d.success) {
          status.style.color = '#4caf50';
          status.textContent = '✅ Daily post refreshed!';
        } else {
          status.style.color = '#ef5350';
          status.textContent = '❌ ' + (d.error || 'Failed');
        }
      }
    })
    .catch(function(e) { alert('Error: ' + e.message); });
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

  <div id="logbox-container" style="max-height:calc(100vh - 380px);min-height:500px;overflow-y:auto;border:1px solid #3a3a42;border-radius:8px;background:#17171b">
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
    fetch('/logs/clear', { method: 'POST' })
      .then(function(r) {
        if (!r.ok) throw new Error('Server returned ' + r.status);
        return r.json().catch(function() { return {}; });
      })
      .then(function(d) {
        if (d.error) { alert('❌ Error clearing logs: ' + d.error); return; }
        alert('✅ Logs cleared successfully.');
        location.reload();
      })
      .catch(function(e) { alert('❌ Failed to clear logs: ' + e.message); });
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
  if (tab === 'stats-revenue') {
    const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
    if ((TIER_LEVELS[userTier] || 0) < TIER_LEVELS.admin) return '<div class="card"><h2>🔒 Access Denied</h2><p style="color:#8b8fa3">Revenue predictions require admin or higher access.</p></div>';
    return renderRevenueTab();
  }

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
  if (tab === 'events' || tab === 'events-giveaways' || tab === 'events-polls' || tab === 'events-reminders' || tab === 'events-schedule' || tab === 'events-birthdays') return renderEventsTab(tab);
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
  if (tab === 'idleon-admin') return renderIdleonAdminTab(userTier);
  if (tab === 'idleon-guild-mgmt') return renderIdleonGuildMgmtTab(userTier);
  if (tab === 'idleon-dashboard') return renderIdleonDashboardTab(userTier);
  if (tab === 'idleon-members') return renderIdleonMembersTab(userTier);
  if (tab === 'idleon-reviews') return renderIdleonReviewsTab(userTier);
  if (tab === 'idleon-stats') return renderIdleonStatsTab(userTier);
  if (tab === 'idleon-activity') return renderIdleonActivityTab(userTier);
  if (tab === 'export') return renderToolsExportTab();
  if (tab === 'backups') return renderToolsBackupsTab();
  if (tab === 'accounts') return renderAccountsTab();
  if (tab === 'moderation') return renderModerationTab();
  if (tab === 'tickets' || tab === 'suggestions') return renderTicketsTab();
  if (tab === 'reaction-roles') return renderReactionRolesTab();
  if (tab === 'scheduled-msgs') return renderRemindersTab();
  if (tab === 'automod') return renderAutomodTab();
  if (tab === 'starboard') return renderStarboardTab();
  if (tab === 'dash-audit') return renderModerationTab();
  if (tab === 'bot-status') return renderHealthTab();
  if (tab === 'timezone') return renderTimezoneTab();
  if (tab === 'bot-messages') return renderBotMessagesTab();
  if (tab === 'smartbot') return renderSmartBotConfigTab(smartBot);
  if (tab === 'smartbot-config') return renderSmartBotConfigTab(smartBot);
  if (tab === 'smartbot-knowledge') return renderSmartBotKnowledgeTab(smartBot);
  if (tab === 'smartbot-news') return renderSmartBotNewsTab(smartBot);
  if (tab === 'smartbot-stats') return renderSmartBotStatsTab(smartBot);
  if (tab === 'smartbot-learning') return renderSmartBotLearningTab(smartBot);
  if (tab === 'smartbot-training') return renderSmartBotTrainingTab(smartBot);
  if (tab === 'stats-features') return renderAnalyticsFeaturesTab();
  if (tab === 'member-growth') return renderMemberGrowthTab();
  if (tab === 'command-usage') return renderCommandUsageTab();
  if (tab === 'profile') return renderProfileTab('overview');
  if (tab === 'profile-customize') return renderProfileTab('customize');
  if (tab === 'profile-security') return renderProfileTab('security');
  if (tab === 'profile-notifications') return renderProfileTab('notifications');
  if (tab === 'mail') return renderProfileTab('mail');
  if (tab === 'dms') return renderProfileTab('dms');
  if (tab === 'bot-config') return renderBotConfigTab();
  if (tab === 'guide-indexer') return renderGuideIndexerTab();

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
  <button onclick="document.querySelectorAll('.mod-subtab').forEach(s=>s.style.display='none');document.getElementById('modSubAudit').style.display='block';this.parentElement.querySelectorAll('button').forEach(b=>{b.style.borderBottom='2px solid transparent';b.style.color='#8b8fa3'});this.style.borderBottom='2px solid #9146ff';this.style.color='#fff'" style="padding:8px 16px;background:none;border:none;border-bottom:2px solid transparent;color:#8b8fa3;cursor:pointer;font-size:13px;font-weight:600">📝 Dashboard Audit</button>
</div>

<!-- Sub-tab: Cases & Warnings -->
<div id="modSubCases" class="mod-subtab" style="display:block">
  <div style="margin-bottom:12px">
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <h3 style="margin:0;font-size:15px">📋 Recent Cases (${totalCases})</h3>
      <span style="font-size:11px;color:#8b8fa3">Click 💬 to open discussion</span>
    </div>
    ${casesHtml}
  </div>

  <!-- Inline Case Discussion Panel -->
  <div id="caseDiscussionPanel" style="display:none;margin-bottom:14px;background:#1e1f22;border:1px solid #9146ff44;border-radius:8px;padding:14px">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:10px">
      <div id="caseDiscussionHeader" style="font-weight:600;font-size:13px"></div>
      <button onclick="document.getElementById('caseDiscussionPanel').style.display='none'" style="padding:4px 10px;background:#3a3a42;color:#ccc;border:none;border-radius:4px;cursor:pointer;font-size:11px;width:auto">✕ Close</button>
    </div>
    <div id="caseDiscussionMessages" style="max-height:250px;overflow-y:auto;padding:8px;background:#2b2d31;border-radius:6px;margin-bottom:10px"></div>
    <div style="display:flex;gap:8px">
      <input type="text" id="caseCommentInput" placeholder="Add a note or comment..." style="flex:1;padding:8px 12px;background:#2b2d31;border:1px solid #3a3d45;border-radius:6px;color:#fff;font-size:13px" onkeydown="if(event.key==='Enter')addCaseComment()">
      <button onclick="addCaseComment()" style="padding:8px 16px;background:#9146ff;color:#fff;border:none;border-radius:6px;font-size:13px;cursor:pointer;font-weight:600">Send</button>
    </div>
  </div>

  <div>
    <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
      <h3 style="margin:0;font-size:15px">⚠️ Warnings (${totalWarnings})</h3>
      <button onclick="if(confirm('Clear ALL warnings?'))fetch('/api/moderation/clear-warnings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({})}).then(()=>location.reload())" style="padding:6px 14px;background:#e74c3c;color:#fff;border:none;border-radius:5px;font-size:12px;cursor:pointer;white-space:nowrap;width:auto">Clear All</button>
    </div>
    ${warnsHtml}
  </div>
</div>

<!-- Sub-tab: Dashboard Audit -->
<style>
#auditTimelineContainer::-webkit-scrollbar{width:6px}
#auditTimelineContainer::-webkit-scrollbar-track{background:transparent}
#auditTimelineContainer::-webkit-scrollbar-thumb{background:#2a2d35;border-radius:3px}
#auditTimelineContainer::-webkit-scrollbar-thumb:hover{background:#3a3d45}
#caseDiscussionMessages::-webkit-scrollbar{width:6px}
#caseDiscussionMessages::-webkit-scrollbar-track{background:transparent}
#caseDiscussionMessages::-webkit-scrollbar-thumb{background:#2a2d35;border-radius:3px}
</style>
<div id="modSubAudit" class="mod-subtab" style="display:none">
  <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:8px;margin-bottom:12px">
    <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#9146ff">${auditEntries.length}</div><div style="font-size:10px;color:#8b8fa3">Total Actions</div></div>
    <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#2ecc71">${auditUsers.length}</div><div style="font-size:10px;color:#8b8fa3">Active Accounts</div></div>
    <div style="padding:10px;background:#2b2d31;border-radius:6px;text-align:center"><div style="font-size:20px;font-weight:700;color:#f39c12">${Object.keys(byDate).length}</div><div style="font-size:10px;color:#8b8fa3">Active Days</div></div>
  </div>
  <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin-bottom:10px"><input type="checkbox" checked onchange="document.getElementById('auditTopActions').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"><span style="font-size:13px;font-weight:600">🔝 Top Actions</span></label>
  <div id="auditTopActions" style="display:block;margin-bottom:12px;background:#2b2d31;border-radius:6px;padding:10px">${topActions.map(([a,c]) => '<div style="display:flex;justify-content:space-between;padding:3px 0;border-bottom:1px solid #1f1f23;font-size:12px"><span>' + a + '</span><span style="color:#9146ff;font-weight:600">' + c + '</span></div>').join('')}</div>

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
  <div id="auditTimelineContainer" style="max-height:700px;overflow-y:auto">${auditHtml}</div>
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
        var actionColor = (e.action||'').indexOf('delete') >= 0 ? '#e74c3c' : (e.action||'').indexOf('create') >= 0 ? '#2ecc71' : (e.action||'').indexOf('update') >= 0 ? '#f39c12' : (e.action||'').indexOf('revert') >= 0 ? '#9b59b6' : '#3498db';
        var hasSnapshot = e.snapshot ? ' <span title="Snapshot available — auto-revert possible" style="color:#2ecc71;font-size:10px">\\u{1f4be}</span>' : '';
        html += '<div style="display:flex;align-items:center;justify-content:space-between;padding:5px 8px;margin-bottom:3px;background:#1e1f22;border-radius:4px;border-left:3px solid ' + actionColor + ';font-size:12px"><div><span style="color:#8b8fa3;font-size:11px">' + time + '</span> <span style="color:#9146ff;font-weight:600">' + (e.user||'Unknown') + '</span> <span style="color:' + actionColor + ';font-weight:500">' + (e.action||'action') + '</span>' + hasSnapshot + (e.details ? ' <span style="color:#8b8fa3">\\u2014 ' + String(e.details).slice(0,80) + '</span>' : '') + '</div><button onclick="revertAuditEntry(\\''+String(e.ts).replace(/'/g,"\\\\'")+'\\',\\''+(e.action||'').replace(/'/g,"\\\\'")+'\\',\\''+(e.user||'').replace(/'/g,"\\\\'")+'\\',\\''+(String(e.details||'').slice(0,60)).replace(/'/g,"\\\\'")+'\\'" style="padding:2px 8px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:4px;cursor:pointer;font-size:10px;width:auto;white-space:nowrap" title="' + (e.snapshot ? 'Auto-revert available' : 'Request manual revert') + '">↩ Revert</button></div>';
      });
    }
  }
  document.getElementById('auditTimelineContainer').innerHTML = html;
  document.getElementById('auditFilterCount').textContent = '(' + filtered.length + ' of ' + _auditAllEntries.length + ')';
}

function revertAuditEntry(ts, action, user, details) {
  if (!confirm('Request to revert action: "' + action + '" by ' + user + '?\\n\\nDetails: ' + details + '\\n\\nThis will attempt to restore the previous state. Proceed?')) return;
  fetch('/api/dashboard-audit/revert', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ts: Number(ts), action: action, user: user })
  }).then(function(r) { return r.json(); }).then(function(d) {
    if (d.success) {
      if (d.reverted) { alert('\\u2705 Revert successful! Previous state has been restored.'); }
      else { alert('\\u26a0\\ufe0f Revert logged but could not auto-restore. ' + (d.message || 'Manual revert may be needed.')); }
      location.reload();
    }
    else { alert('Error: ' + (d.error || 'Unknown')); }
  }).catch(function(e) { alert('Error: ' + e.message); });
}

let _currentCaseId = null;
function openCaseDiscussion(caseId, caseType, userName) {
  const panel = document.getElementById('caseDiscussionPanel');
  // Toggle off if clicking the same case
  if (_currentCaseId === caseId && panel.style.display === 'block') {
    panel.style.display = 'none';
    _currentCaseId = null;
    return;
  }
  _currentCaseId = caseId;
  panel.style.display = 'block';
  document.getElementById('caseDiscussionHeader').innerHTML = '<span style="font-weight:700;font-size:15px">Case: ' + caseType + '</span> <span style="color:#8b8fa3">\u2014 ' + userName + '</span> <span style="font-size:11px;color:#8b8fa3;margin-left:8px">ID: ' + caseId + '</span>';
  loadCaseComments(caseId);
  panel.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
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

<!-- Tools row: Ticket Panel + Cooldown side by side -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-bottom:10px">
  <div style="background:#1e1f22;border-radius:6px;padding:10px">
    <div style="font-size:11px;font-weight:600;color:#e0e0e0;margin-bottom:6px">🎫 Send Ticket Panel</div>
    <div style="display:flex;gap:6px;align-items:center">
      <input id="ticketPanelChannel" placeholder="Channel ID" style="margin:0;padding:4px 8px;font-size:11px;flex:1;min-width:100px">
      <button onclick="sendTicketPanel()" style="padding:4px 10px;background:#9146ff;color:#fff;border:none;border-radius:3px;font-size:10px;cursor:pointer;font-weight:600;white-space:nowrap">📨 Send</button>
    </div>
  </div>
  <div style="background:#1e1f22;border-radius:6px;padding:10px">
    <div style="font-size:11px;font-weight:600;color:#e0e0e0;margin-bottom:6px">⏱️ Suggestion Cooldown</div>
    <div style="display:flex;gap:6px;align-items:center">
      <input type="number" id="suggestionCooldown" value="${cooldownMinutes}" min="0" max="1440" style="width:70px;padding:4px 6px;background:#2b2d31;color:#fff;border:1px solid #3a3d45;border-radius:4px;font-size:11px">
      <span style="font-size:10px;color:#8b8fa3">min</span>
      <button onclick="saveSuggestionCooldown()" style="padding:4px 10px;background:#5b5bff;color:#fff;border:none;border-radius:4px;font-size:10px;cursor:pointer;font-weight:600">Save</button>
    </div>
  </div>
</div>
<!-- Export CSV (standalone) -->
<div style="margin-bottom:10px">
  <button onclick="exportSuggestions()" style="padding:5px 12px;background:#3a3d45;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer">⬇️ Export CSV</button>
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
</script>

<!-- Ticket Idle Warning (compact) -->
<div class="card" style="padding:12px;margin-top:12px">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;margin:0"><input type="checkbox" id="if_ticket_idle_enabled"> <strong>⏰ Ticket Idle Warning</strong></label>
    <span style="font-size:10px;color:#8b8fa3">— warn & auto-close inactive tickets</span>
    <div id="if_ticket_idle_status" style="margin-left:auto;font-size:11px"></div>
  </div>
  <div style="display:grid;grid-template-columns:1fr 1fr 2fr auto;gap:8px;align-items:end;font-size:12px">
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Warn After (min)</label>
      <input id="if_ticket_idle_warn" type="number" min="30" max="10080" value="1440" style="margin:0;font-size:11px;padding:4px 6px">
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Close After (min)</label>
      <input id="if_ticket_idle_close" type="number" min="60" max="43200" value="4320" style="margin:0;font-size:11px;padding:4px 6px">
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Warning Message</label>
      <input id="if_ticket_idle_msg" value="⚠️ This ticket will be auto-closed due to inactivity." style="margin:0;font-size:11px;padding:4px 6px">
    </div>
    <button type="button" onclick="ifSave_ticket_idle()" style="padding:4px 12px;background:#2196f322;color:#2196f3;border:1px solid #2196f344;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600;white-space:nowrap;height:28px">Save</button>
  </div>
</div>
<script>
(function(){fetch('/api/features/ticket-idle').then(function(r){return r.json()}).then(function(d){if(d.config){document.getElementById('if_ticket_idle_enabled').checked=!!d.config.enabled;document.getElementById('if_ticket_idle_warn').value=d.config.warnAfterMinutes||1440;document.getElementById('if_ticket_idle_close').value=d.config.closeAfterMinutes||4320;document.getElementById('if_ticket_idle_msg').value=d.config.warnMessage||'';}}).catch(function(){});})();
function ifSave_ticket_idle(){
  var body={enabled:document.getElementById('if_ticket_idle_enabled').checked,warnAfterMinutes:parseInt(document.getElementById('if_ticket_idle_warn').value)||1440,closeAfterMinutes:parseInt(document.getElementById('if_ticket_idle_close').value)||4320,warnMessage:document.getElementById('if_ticket_idle_msg').value.slice(0,500)};
  fetch('/api/features/ticket-idle',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_ticket_idle_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>

`;
}


// ====================== REACTION ROLES TAB ======================
export function renderReactionRolesTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const data = loadJSON(REACTION_ROLES_PATH, { panels: [] });
  const panels = data.panels || [];
  const guild = client.guilds.cache.first();
  const rrChannels = guild ? Array.from(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({id:c.id,name:c.name})).sort((a,b)=>a.name.localeCompare(b.name)) : [];
  const rrRoles = guild ? Array.from(guild.roles.cache.values()).filter(r => !r.managed && r.name !== '@everyone').map(r => ({id:r.id,name:r.name,color:r.hexColor})).sort((a,b)=>a.name.localeCompare(b.name)) : [];
  const rrChannelsJSON = safeJsonForHtml(rrChannels);
  const rrRolesJSON = safeJsonForHtml(rrRoles);
  const rrPanelsJSON = safeJsonForHtml(panels);
  let html = panels.length === 0 ? '<div style="color:#8b8fa3;padding:12px">No reaction role panels configured.</div>' : '';
  panels.forEach((p, i) => {
    const chName = rrChannels.find(c => c.id === p.channelId);
    const rolesInfo = (p.roles||[]).map(r => { const found = rrRoles.find(x => x.id === r.roleId); return (r.emoji||'🔹') + ' ' + (found ? found.name : r.roleId); }).join(', ');
    html += `<div style="padding:10px;background:#2b2d31;border-radius:6px;margin-bottom:8px;border-left:3px solid #9146ff">
      <div style="display:flex;align-items:center;justify-content:space-between;gap:8px">
        <div style="flex:1;min-width:0"><div style="font-weight:600">${p.title||'Panel '+(i+1)}</div><div style="font-size:12px;color:#8b8fa3">Channel: ${chName ? '#'+chName.name : (p.channelId||'N/A')} | Roles: ${(p.roles||[]).length}${rolesInfo ? ' — '+rolesInfo : ''}</div></div>
        <div style="display:flex;gap:4px;flex-shrink:0">
          <button onclick="rrRepostPanel('${p.id}')" style="padding:4px 10px;background:#9146ff22;color:#9146ff;border:1px solid #9146ff44;border-radius:4px;font-size:11px;cursor:pointer" title="Delete old message and repost at bottom of channel">📌 Repost</button>
          <button onclick="rrEditPanel(${i})" style="padding:4px 10px;background:#5b5bff22;color:#5b5bff;border:1px solid #5b5bff44;border-radius:4px;font-size:11px;cursor:pointer">✏️ Edit</button>
          <button onclick="rrDeletePanel('${p.id}')" style="padding:4px 10px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:4px;font-size:11px;cursor:pointer">🗑️</button>
        </div>
      </div>
    </div>`;
  });
  return `<div class="card"><h2>🎭 Reaction Roles</h2><p style="color:#8b8fa3">Create reaction-based role assignment panels.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:10px">
    <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Title</label><input id="rrTitle" placeholder="Role Menu" style="margin:4px 0"></div>
    <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Channel</label>
      <div style="position:relative">
        <input id="rrChannelSearch" placeholder="Type to search channels..." autocomplete="off" style="margin:4px 0" onfocus="rrShowDrop('rrChannelDrop')" oninput="rrFilterDrop('rrChannelDrop','rrChannelSearch','ch')">
        <input type="hidden" id="rrChannel" value="">
        <div id="rrChannelDrop" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:180px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
      </div>
    </div>
  </div>
  <div style="margin-top:10px">
    <label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Roles & Emojis</label>
    <div id="rrRolesList" style="margin-top:4px"></div>
    <button class="small" type="button" onclick="addRRRow()" style="margin-top:6px">➕ Add Role</button>
  </div>
  <button class="small" onclick="createReactionRole()" style="margin-top:10px">➕ Create Panel</button></div><div class="card"><h3>📋 Active Panels (${panels.length})</h3>${html}</div>
<script>
var _rrChannels=${rrChannelsJSON};
var _rrRoles=${rrRolesJSON};
var _rrPanels=${rrPanelsJSON};

function rrShowDrop(dropId){
  var drop=document.getElementById(dropId);drop.style.display='block';
  setTimeout(function(){document.addEventListener('click',function _h(e){if(!drop.contains(e.target)){drop.style.display='none';document.removeEventListener('click',_h);}});},10);
}

function rrFilterDrop(dropId,inputId,type){
  var drop=document.getElementById(dropId);
  var q=document.getElementById(inputId).value.toLowerCase();
  var items=type==='ch'?_rrChannels:_rrRoles;
  var filtered=items.filter(function(i){return(i.name||'').toLowerCase().includes(q);}).slice(0,15);
  drop.innerHTML='';drop.style.display=filtered.length?'block':'none';
  filtered.forEach(function(item){
    var opt=document.createElement('div');
    opt.style.cssText='padding:6px 10px;cursor:pointer;font-size:12px;color:#e0e0e0;border-bottom:1px solid #2a2f3a';
    opt.onmouseenter=function(){this.style.background='#333';};opt.onmouseleave=function(){this.style.background='';};
    if(type==='ch') opt.textContent='#'+item.name;
    else{opt.textContent='@'+item.name;if(item.color&&item.color!=='#000000')opt.style.color=item.color;}
    opt.onclick=function(){
      drop.style.display='none';
      if(type==='ch'){document.getElementById('rrChannel').value=item.id;document.getElementById('rrChannelSearch').value='#'+item.name;}
      else{drop.dataset.selectedId=item.id;drop.dataset.selectedName=item.name;}
    };
    drop.appendChild(opt);
  });
}

function addRRRow(emoji,roleId){
  var list=document.getElementById('rrRolesList');
  var row=document.createElement('div');
  row.style.cssText='display:grid;grid-template-columns:60px 1fr 30px;gap:6px;align-items:center;margin-bottom:4px';
  var roleName='';if(roleId){var f=_rrRoles.find(function(r){return r.id===roleId;});if(f)roleName='@'+f.name;}
  row.innerHTML='<input class="rr-emoji" type="text" maxlength="10" placeholder="🎮" value="'+(emoji||'')+'" style="text-align:center;font-size:16px;padding:4px">'
    +'<div style="position:relative"><input class="rr-role-search" placeholder="Type to search roles..." autocomplete="off" value="'+roleName+'" style="padding:6px;width:100%;box-sizing:border-box" onfocus="rrShowRoleDrop(this)" oninput="rrFilterRoleDrop(this)"><input type="hidden" class="rr-role" value="'+(roleId||'')+'"><div class="rr-role-drop" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:150px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div></div>'
    +'<button type="button" onclick="this.parentElement.remove()" style="background:none;border:none;color:#ef5350;cursor:pointer;font-size:16px">✕</button>';
  list.appendChild(row);
}

function rrShowRoleDrop(input){
  var drop=input.parentElement.querySelector('.rr-role-drop');drop.style.display='block';
  rrFilterRoleDrop(input);
  setTimeout(function(){document.addEventListener('click',function _h(e){if(!drop.contains(e.target)&&e.target!==input){drop.style.display='none';document.removeEventListener('click',_h);}});},10);
}

function rrFilterRoleDrop(input){
  var drop=input.parentElement.querySelector('.rr-role-drop');
  var hidden=input.parentElement.querySelector('.rr-role');
  var q=input.value.toLowerCase().replace(/^@/,'');
  var filtered=_rrRoles.filter(function(r){return r.name.toLowerCase().includes(q);}).slice(0,12);
  drop.innerHTML='';drop.style.display=filtered.length?'block':'none';
  filtered.forEach(function(r){
    var opt=document.createElement('div');
    opt.style.cssText='padding:6px 10px;cursor:pointer;font-size:12px;color:#e0e0e0;border-bottom:1px solid #2a2f3a';
    opt.onmouseenter=function(){this.style.background='#333';};opt.onmouseleave=function(){this.style.background='';};
    opt.textContent='@'+r.name;if(r.color&&r.color!=='#000000')opt.style.color=r.color;
    opt.onclick=function(){hidden.value=r.id;input.value='@'+r.name;drop.style.display='none';};
    drop.appendChild(opt);
  });
}

addRRRow();
function createReactionRole(){
  var t=document.getElementById('rrTitle').value.trim();
  var ch=document.getElementById('rrChannel').value.trim();
  if(!ch){alert('Select a channel');return;}
  var rows=document.querySelectorAll('#rrRolesList > div');
  var rolePairs=[];
  rows.forEach(function(row){
    var emoji=row.querySelector('.rr-emoji').value.trim();
    var roleId=row.querySelector('.rr-role').value;
    if(emoji&&roleId)rolePairs.push({emoji:emoji,roleId:roleId});
  });
  if(rolePairs.length===0){alert('Add at least one role with emoji');return;}
  fetch('/api/reaction-roles/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:t||'Role Menu',channelId:ch,roles:rolePairs})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Panel created!');location.reload();}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});
}

function rrDeletePanel(panelId){
  if(!confirm('Delete this reaction role panel? The Discord message will also be deleted.'))return;
  fetch('/api/reaction-roles/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({panelId:panelId})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Panel deleted!');location.reload();}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});
}

function rrRepostPanel(panelId){
  if(!confirm('Repost this panel? The old message will be deleted and a new one sent at the bottom of the channel.'))return;
  fetch('/api/reaction-roles/repost',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({panelId:panelId})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Panel reposted!');location.reload();}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});
}

var _rrEditingIndex=null;
function rrEditPanel(idx){
  var p=_rrPanels[idx];if(!p)return;
  _rrEditingIndex=idx;
  document.getElementById('rrTitle').value=p.title||'';
  document.getElementById('rrChannel').value=p.channelId||'';
  var ch=_rrChannels.find(function(c){return c.id===p.channelId;});
  document.getElementById('rrChannelSearch').value=ch?'#'+ch.name:'';
  document.getElementById('rrRolesList').innerHTML='';
  (p.roles||[]).forEach(function(r){addRRRow(r.emoji,r.roleId);});
  var createBtn=document.querySelector('[onclick="createReactionRole()"]');
  if(createBtn){createBtn.textContent='💾 Update Panel';createBtn.setAttribute('onclick','rrUpdatePanel()');}
  window.scrollTo({top:0,behavior:'smooth'});
}

function rrUpdatePanel(){
  if(_rrEditingIndex===null)return;
  var p=_rrPanels[_rrEditingIndex];if(!p)return;
  var t=document.getElementById('rrTitle').value.trim();
  var ch=document.getElementById('rrChannel').value.trim();
  if(!ch){alert('Select a channel');return;}
  var rows=document.querySelectorAll('#rrRolesList > div');
  var rolePairs=[];
  rows.forEach(function(row){
    var emoji=row.querySelector('.rr-emoji').value.trim();
    var roleId=row.querySelector('.rr-role').value;
    if(emoji&&roleId)rolePairs.push({emoji:emoji,roleId:roleId});
  });
  if(rolePairs.length===0){alert('Add at least one role with emoji');return;}
  fetch('/api/reaction-roles/edit',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({panelId:p.id,title:t||'Role Menu',channelId:ch,roles:rolePairs})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Panel updated!');location.reload();}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});
}
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
  const guild = client.guilds.cache.first();
  const amChannels = guild ? Array.from(guild.channels.cache.filter(c => [0,2,4,5,13,15].includes(c.type)).values()).map(c => ({id:c.id,name:c.name,type:c.type,cat:c.parent?.name||''})).sort((a,b)=>a.name.localeCompare(b.name)) : [];
  const amRoles = guild ? Array.from(guild.roles.cache.values()).filter(r => r.name !== '@everyone').map(r => ({id:r.id,name:r.name,color:r.hexColor})).sort((a,b)=>a.name.localeCompare(b.name)) : [];
  const amMembers = Object.values(membersCache.members || {}).map(m => ({id:m.id||'',name:m.displayName||m.username||''})).filter(m => m.id && m.name && m.name !== 'Unknown');
  const amCategories = guild ? Array.from(guild.channels.cache.filter(c => c.type === 4).values()).map(c => ({id:c.id,name:c.name})).sort((a,b)=>a.name.localeCompare(b.name)) : [];
  const amChannelsJSON = safeJsonForHtml(amChannels);
  const amRolesJSON = safeJsonForHtml(amRoles);
  const amMembersJSON = safeJsonForHtml(amMembers);
  const amCategoriesJSON = safeJsonForHtml(amCategories);
  // Find display names for current values
  const logChName = amChannels.find(c => c.id === (data.logChannelId||''));
  const exemptRoleNames = (data.exemptRoles||[]).map(id => { const r = amRoles.find(r => r.id === id); return r ? r.name : id; });
  const exemptChNames = (data.exemptChannels||[]).map(id => { const c = amChannels.find(c => c.id === id); return c ? '#'+c.name : id; });
  const exemptUserNames = (data.exemptUsers||[]).map(id => { const m = amMembers.find(m => m.id === id); return m ? m.name : id; });
  const exemptCatNames = (data.exemptCategories||[]).map(id => { const c = amCategories.find(c => c.id === id); return c ? c.name : id; });
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
    <label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:4px">📋 Log Channel</label>
    <div style="position:relative">
      <input id="amLogChannelSearch" value="${logChName ? '#'+logChName.name : ''}" placeholder="Type to search channels..." autocomplete="off" style="margin:0;font-size:12px" onfocus="amShowDropdown('amLogChannelDrop')" oninput="amFilterDropdown('amLogChannelDrop','amLogChannelSearch','channels')">
      <input type="hidden" id="amLogChannel" value="${data.logChannelId||''}">
      <div id="amLogChannelDrop" class="am-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:180px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
    </div>
  </div>
  <div class="card" style="padding:12px;margin:0">
    <label style="font-size:11px;color:#8b8fa3;display:block;margin-bottom:4px">🔓 Exempt Roles</label>
    <div style="position:relative">
      <input id="amExemptRolesSearch" placeholder="Type to search roles..." autocomplete="off" style="margin:0;font-size:12px" onfocus="amShowDropdown('amExemptRolesDrop')" oninput="amFilterDropdown('amExemptRolesDrop','amExemptRolesSearch','roles')">
      <div id="amExemptRolesDrop" class="am-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:180px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
    </div>
    <div id="amExemptRolesTags" style="display:flex;flex-wrap:wrap;gap:4px;margin-top:4px"></div>
    <input type="hidden" id="amExemptRoles" value="${(data.exemptRoles||[]).join(',')}">
  </div>
</div>

<!-- Exclusions -->
<div class="card" style="padding:12px;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:8px"><span style="font-size:14px">🚧</span><span style="font-size:13px;font-weight:700;color:#e0e0e0">Exclusions</span><span style="font-size:10px;color:#8b8fa3">— channels, users & categories that bypass all automod rules</span></div>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Exempt Channels</label>
      <div style="position:relative">
        <input id="amExChannelSearch" placeholder="Search channels..." autocomplete="off" style="min-height:28px;margin:0;font-size:11px" onfocus="amShowDropdown('amExChannelDrop')" oninput="amFilterDropdown('amExChannelDrop','amExChannelSearch','channels')">
        <div id="amExChannelDrop" class="am-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:150px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
      </div>
      <div id="amExChannelTags" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px"></div>
      <input type="hidden" id="amExemptChannels" value="${(data.exemptChannels||[]).join(',')}">
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Exempt Users</label>
      <div style="position:relative">
        <input id="amExUserSearch" placeholder="Search users..." autocomplete="off" style="min-height:28px;margin:0;font-size:11px" onfocus="amShowDropdown('amExUserDrop')" oninput="amFilterDropdown('amExUserDrop','amExUserSearch','members')">
        <div id="amExUserDrop" class="am-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:150px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
      </div>
      <div id="amExUserTags" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px"></div>
      <input type="hidden" id="amExemptUsers" value="${(data.exemptUsers||[]).join(',')}">
    </div>
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Exempt Categories</label>
      <div style="position:relative">
        <input id="amExCatSearch" placeholder="Search categories..." autocomplete="off" style="min-height:28px;margin:0;font-size:11px" onfocus="amShowDropdown('amExCatDrop')" oninput="amFilterDropdown('amExCatDrop','amExCatSearch','categories')">
        <div id="amExCatDrop" class="am-dropdown" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:150px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
      </div>
      <div id="amExCatTags" style="display:flex;flex-wrap:wrap;gap:3px;margin-top:3px"></div>
      <input type="hidden" id="amExemptCategories" value="${(data.exemptCategories||[]).join(',')}">
    </div>
  </div>
</div>

<!-- ── Auto-Purge (below Exclusions) ── -->
${_inlineFeature('auto-purge', 'autoPurge', 'Auto-Purge', '🗑️', 'Auto-delete old messages in configured channels on a schedule.', `
  <div id="autoPurgeRows"></div>
  <button type="button" onclick="addPurgeRow()" style="margin-top:6px;padding:4px 12px;background:#5865f222;color:#5865f2;border:1px solid #5865f244;border-radius:4px;cursor:pointer;font-size:11px">+ Add Channel</button>
`, { accent: '#ff9800' })}
<script>
var _purgeChannels = ${JSON.stringify((() => { const g = client.guilds.cache.first(); return g ? Array.from(g.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({id:c.id,name:c.name})).sort((a,b) => a.name.localeCompare(b.name)) : []; })())};
function addPurgeRow(chId, days, hours) {
  var container = document.getElementById('autoPurgeRows');
  var row = document.createElement('div');
  row.style.cssText = 'display:flex;align-items:center;gap:6px;margin-bottom:4px;padding:6px 8px;background:#1a1a1d;border:1px solid #2a2f3a;border-radius:6px';
  var selStyle = 'padding:5px 8px;border:1px solid #3a3a42;border-radius:5px;background:#1d2028;color:#e0e0e0;font-size:11px';
  var sel = '<select style="flex:1;min-width:120px;' + selStyle + '">';
  sel += '<option value="">Select channel</option>';
  _purgeChannels.forEach(function(c) { sel += '<option value="' + c.id + '"' + (c.id === chId ? ' selected' : '') + '>#' + c.name + '</option>'; });
  sel += '</select>';
  row.innerHTML = sel
    + '<label style="font-size:10px;color:#8b8fa3;white-space:nowrap">Max Age</label>'
    + '<select class="purge-days" style="width:60px;' + selStyle + '">'
    + [1,2,3,5,7,10,14].map(function(d) { return '<option value="' + d + '"' + (d === (days||7) ? ' selected' : '') + '>' + d + 'd</option>'; }).join('')
    + '</select>'
    + '<label style="font-size:10px;color:#8b8fa3;white-space:nowrap">Every</label>'
    + '<select class="purge-hours" style="width:60px;' + selStyle + '">'
    + [1,2,3,6,12,24].map(function(h) { return '<option value="' + h + '"' + (h === (hours||6) ? ' selected' : '') + '>' + h + 'h</option>'; }).join('')
    + '</select>'
    + '<button type="button" onclick="this.parentElement.remove()" style="padding:3px 8px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:5px;cursor:pointer;font-size:10px;font-weight:600" title="Remove">✕</button>';
  container.appendChild(row);
}
function ifLoad_auto_purge(c){
  document.getElementById('autoPurgeRows').innerHTML = '';
  (c.channels||[]).forEach(function(ch){ addPurgeRow(ch.channelId, ch.maxAgeDays||7, ch.checkIntervalHours||6); });
}
function ifSave_auto_purge(){
  var rows = document.getElementById('autoPurgeRows').children;
  var channels = [];
  for (var i = 0; i < rows.length; i++) {
    var sel = rows[i].querySelector('select');
    var chId = sel ? sel.value : '';
    if (!chId) continue;
    var days = parseInt(rows[i].querySelector('.purge-days').value) || 7;
    var hours = parseInt(rows[i].querySelector('.purge-hours').value) || 6;
    channels.push({ channelId: chId, maxAgeDays: Math.min(14, Math.max(1, days)), checkIntervalHours: Math.min(24, Math.max(1, hours)) });
  }
  var body={enabled:document.getElementById('if_auto_purge_enabled').checked,channels:channels};
  fetch('/api/features/auto-purge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_auto_purge_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>

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
  <div style="display:flex;align-items:center;gap:8px;margin-top:8px;padding-top:8px;border-top:1px solid #2a2f3a">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;font-size:12px;margin:0"><input type="checkbox" id="amWarnExpiry" ${data.warningExpiry?'checked':''}> <strong>⏳ Warning Expiry</strong></label>
    <span style="font-size:10px;color:#8b8fa3">Auto-expire after</span>
    <input id="amWarnExpiryDays" type="number" min="1" max="365" value="${data.warningExpiryDays||30}" style="width:55px;margin:0;padding:2px 4px;font-size:11px">
    <span style="font-size:10px;color:#8b8fa3">days</span>
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
    exemptRoles: (document.getElementById('amExemptRoles').value||'').split(',').filter(Boolean),
    logChannelId: document.getElementById('amLogChannel').value.trim(),
    exemptChannels: (document.getElementById('amExemptChannels').value||'').split(',').filter(Boolean),
    exemptUsers: (document.getElementById('amExemptUsers').value||'').split(',').filter(Boolean),
    exemptCategories: (document.getElementById('amExemptCategories').value||'').split(',').filter(Boolean),
    blockNewAccounts: document.getElementById('amNewAccounts').checked,
    newAccountAgeDays: parseInt(document.getElementById('amNewAccountAge').value)||7,
    newAccountAction: document.getElementById('amNewAccountAction').value,
    antiPhishing: document.getElementById('amAntiPhishing').checked,
    antiEmojiSpam: document.getElementById('amAntiEmojiSpam').checked,
    emojiLimit: parseInt(document.getElementById('amEmojiLimit').value)||15,
    whitelistPatterns: (document.getElementById('amWhitelistPatterns').value||'').split('\\n').map(s=>s.trim()).filter(Boolean),
    warningExpiry: document.getElementById('amWarnExpiry').checked,
    warningExpiryDays: parseInt(document.getElementById('amWarnExpiryDays').value)||30,
    scamProtection: document.getElementById('amScamProtection').checked,
    scamAction: document.getElementById('amScamAction').value
  };
  fetch('/api/automod/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(settings)})
    .then(r=>r.json()).then(d=>{
      if(d.success){document.getElementById('amStatus').innerHTML='<span style="color:#2ecc71">\\u2705 Saved!</span>';setTimeout(()=>{document.getElementById('amStatus').innerHTML='';},3000);}
      else alert(d.error||'Error');
    }).catch(e=>alert(e.message));
}
</script>

<!-- Scam Protection -->
<div class="card" style="padding:12px;margin-bottom:8px">
  <div style="display:flex;align-items:center;gap:6px;margin-bottom:6px"><span style="font-size:14px">🛡️</span><span style="font-size:13px;font-weight:700;color:#e0e0e0">Scam Protection</span><span style="font-size:10px;color:#8b8fa3">— auto-remove messages with scam links or images</span></div>
  <div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap;font-size:12px">
    <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:0"><input type="checkbox" id="amScamProtection" ${data.scamProtection?'checked':''}> <strong>Enable</strong></label>
    <span style="font-size:10px;color:#8b8fa3">Detects known scam/phishing links via API, QR code images, fake nitro links, and suspicious attachments from new accounts.</span>
  </div>
  <div style="display:flex;align-items:center;gap:8px;margin-top:6px;font-size:12px">
    <span style="font-size:10px;color:#8b8fa3">Action:</span>
    <select id="amScamAction" style="margin:0;font-size:11px;padding:2px 8px">
      <option value="delete" ${(data.scamAction||'delete')==='delete'?'selected':''}>Delete message</option>
      <option value="warn" ${data.scamAction==='warn'?'selected':''}>Delete + Warn</option>
      <option value="mute" ${data.scamAction==='mute'?'selected':''}>Delete + Mute</option>
      <option value="kick" ${data.scamAction==='kick'?'selected':''}>Delete + Kick</option>
      <option value="ban" ${data.scamAction==='ban'?'selected':''}>Delete + Ban</option>
    </select>
    <span style="font-size:10px;color:#8b8fa3">Checks: known scam domains, QR codes in images, fake Nitro/Steam links, suspicious Discord webhook URLs</span>
  </div>
</div>

<script>
// ── Automod Autocomplete System ──
var _amChannels = ${amChannelsJSON};
var _amRoles = ${amRolesJSON};
var _amMembers = ${amMembersJSON};
var _amCategories = ${amCategoriesJSON};

function amShowDropdown(dropId){
  var drop = document.getElementById(dropId);
  drop.style.display = 'block';
  setTimeout(function(){ document.addEventListener('click', function _h(e){ if(!drop.contains(e.target) && e.target !== drop.previousElementSibling?.previousElementSibling){ drop.style.display='none'; document.removeEventListener('click',_h); } }); },10);
}

function amFilterDropdown(dropId, inputId, type){
  var drop = document.getElementById(dropId);
  var q = document.getElementById(inputId).value.toLowerCase();
  var items = type==='channels'?_amChannels:type==='roles'?_amRoles:type==='members'?_amMembers:_amCategories;
  var filtered = items.filter(function(i){ return (i.name||'').toLowerCase().includes(q); }).slice(0,15);
  drop.innerHTML = '';
  drop.style.display = filtered.length?'block':'none';
  filtered.forEach(function(item){
    var opt = document.createElement('div');
    opt.style.cssText = 'padding:6px 10px;cursor:pointer;font-size:12px;color:#e0e0e0;border-bottom:1px solid #2a2f3a';
    opt.onmouseenter = function(){ this.style.background='#333'; };
    opt.onmouseleave = function(){ this.style.background=''; };
    var label = type==='channels'?'#'+item.name+(item.cat?' ('+item.cat+')':''):type==='roles'?'@'+item.name:type==='categories'?'📁 '+item.name:item.name;
    if(type==='roles'&&item.color&&item.color!=='#000000') opt.style.color=item.color;
    opt.textContent = label;
    opt.dataset.id = item.id;
    opt.dataset.name = item.name;
    opt.onclick = function(){ amSelectItem(dropId, inputId, type, item); };
    drop.appendChild(opt);
  });
}

function amSelectItem(dropId, inputId, type, item){
  document.getElementById(dropId).style.display = 'none';
  document.getElementById(inputId).value = '';
  // Determine which hidden input / tags container to use
  if(inputId==='amLogChannelSearch'){ document.getElementById('amLogChannel').value=item.id; document.getElementById(inputId).value='#'+item.name; return; }
  var map = {amExemptRolesSearch:{hidden:'amExemptRoles',tags:'amExemptRolesTags',prefix:'@'},amExChannelSearch:{hidden:'amExemptChannels',tags:'amExChannelTags',prefix:'#'},amExUserSearch:{hidden:'amExemptUsers',tags:'amExUserTags',prefix:''},amExCatSearch:{hidden:'amExemptCategories',tags:'amExCatTags',prefix:'📁 '}};
  var cfg = map[inputId]; if(!cfg) return;
  var hid = document.getElementById(cfg.hidden);
  var ids = hid.value ? hid.value.split(',') : [];
  if(ids.includes(item.id)) return;
  ids.push(item.id);
  hid.value = ids.join(',');
  amRenderTags(cfg.tags, cfg.hidden, cfg.prefix, type);
}

function amRenderTags(tagsId, hiddenId, prefix, type){
  var container = document.getElementById(tagsId);
  var hid = document.getElementById(hiddenId);
  var ids = hid.value ? hid.value.split(',').filter(Boolean) : [];
  var items = type==='roles'?_amRoles:type==='channels'?_amChannels:type==='members'?_amMembers:_amCategories;
  container.innerHTML = '';
  ids.forEach(function(id){
    var found = items.find(function(i){ return i.id===id; });
    var tag = document.createElement('span');
    tag.style.cssText = 'display:inline-flex;align-items:center;gap:3px;padding:2px 8px;background:#333;border-radius:4px;font-size:11px;color:#e0e0e0';
    if(type==='roles'&&found&&found.color&&found.color!=='#000000') tag.style.color=found.color;
    tag.innerHTML = (prefix||'')+(found?found.name:id)+' <span style="cursor:pointer;color:#e74c3c;margin-left:2px" onclick="amRemoveTag(\\''+tagsId+'\\',\\''+hiddenId+'\\',\\''+id+'\\',\\''+prefix+'\\',\\''+type+'\\')">✕</span>';
    container.appendChild(tag);
  });
}

function amRemoveTag(tagsId, hiddenId, removeId, prefix, type){
  var hid = document.getElementById(hiddenId);
  var ids = hid.value.split(',').filter(function(id){ return id!==removeId; });
  hid.value = ids.join(',');
  amRenderTags(tagsId, hiddenId, prefix, type);
}

// Initialize tags on load
(function(){
  amRenderTags('amExemptRolesTags','amExemptRoles','@','roles');
  amRenderTags('amExChannelTags','amExemptChannels','#','channels');
  amRenderTags('amExUserTags','amExemptUsers','','members');
  amRenderTags('amExCatTags','amExemptCategories','📁 ','categories');
})();
</script>

`;
}


// ====================== STARBOARD & HIGHLIGHTS TAB ======================
export function renderStarboardTab() {
  const { stats, isLive, client, dashboardSettings, DATA_DIR, giveaways, history, io, leveling, normalizeYouTubeAlertsSettings, polls, reminders, schedule, smartBot, startTime, suggestions, twitchTokens, youtubeAlerts, followerHistory, streamInfo, logs, streamGoals, TWITCH_ACCESS_TOKEN, membersCache, loadJSON, getCachedAnalytics, MODERATION_PATH, DASH_AUDIT_PATH, TICKETS_PATH, REACTION_ROLES_PATH, SCHED_MSG_PATH, AUTOMOD_PATH, STARBOARD_PATH, CMD_USAGE_PATH, PETS_PATH, PAGE_ACCESS_OPTIONS } = _getState();
  const data = loadJSON(STARBOARD_PATH, { settings: {}, posts: [] });
  const s = data.settings || {};
  const adminRepost = data.adminRepost || {};
  const posts = (data.posts || []).slice(-20).reverse();
  const guild = client.guilds.cache.first();
  const sbChannels = guild ? Array.from(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({id:c.id,name:c.name})).sort((a,b)=>a.name.localeCompare(b.name)) : [];
  const sbChannelsJSON = safeJsonForHtml(sbChannels);
  let chOpts = '<option value="">Select channel...</option>';
  sbChannels.forEach(c => { chOpts += `<option value="${c.id}"${c.id === (s.channelId||'') ? ' selected' : ''}>#${c.name}</option>`; });
  const arChName = sbChannels.find(c => c.id === (adminRepost.channelId||''));
  let postsHtml = posts.length === 0 ? '<div style="color:#8b8fa3;padding:12px">No starboard posts yet.</div>' : '';
  posts.forEach(p => {
    postsHtml += `<div style="padding:8px;background:#2b2d31;border-radius:6px;margin-bottom:6px;border-left:3px solid #ffd700"><div style="font-weight:600">⭐ ${p.stars||0} stars</div><div style="font-size:12px;color:#8b8fa3">${(p.content||'').slice(0,100)} — by ${p.authorName||p.authorId||'?'}</div></div>`;
  });
  return `<div class="card" style="padding:16px">
  <h2 style="margin:0">⭐ Highlights & Repost</h2>
  <p style="color:#8b8fa3;margin:4px 0 0;font-size:12px">Starboard for community favorites and admin emoji repost to highlight messages.</p>
</div>

<!-- Sub-tab nav -->
<div style="display:flex;gap:0;margin-bottom:12px;border-bottom:2px solid #2a2f3a">
  <button onclick="sbSwitchTab('starboard')" id="sb-tab-starboard" style="padding:8px 18px;background:none;border:none;border-bottom:2px solid #ffd700;color:#ffd700;font-weight:600;cursor:pointer;font-size:13px;margin-bottom:-2px">⭐ Starboard</button>
  <button onclick="sbSwitchTab('repost')" id="sb-tab-repost" style="padding:8px 18px;background:none;border:none;border-bottom:2px solid transparent;color:#8b8fa3;cursor:pointer;font-size:13px;margin-bottom:-2px">📌 Admin Repost</button>
</div>

<!-- Starboard Section -->
<div id="sb-section-starboard">
<div class="card"><h3 style="margin:0 0 10px">⚙️ Starboard Settings</h3><div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
  <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Channel</label><select id="sbChannel" style="margin:4px 0">${chOpts}</select></div>
  <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Min Stars</label><input id="sbMin" type="number" value="${s.minStars||3}" min="1" style="margin:4px 0"></div>
  <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Emoji</label><input id="sbEmoji" value="${s.emoji||'⭐'}" style="margin:4px 0"></div>
</div><button class="small" onclick="saveStarboard()" style="margin-top:8px">💾 Save</button><div id="sbStatus" style="margin-top:8px"></div></div>
<div class="card"><h3 style="margin:0 0 8px">🌟 Recent Starred Posts (${posts.length})</h3>${postsHtml}</div>
</div>

<!-- Admin Repost Section -->
<div id="sb-section-repost" style="display:none">
<div class="card">
  <h3 style="margin:0 0 4px">📌 Admin Emoji Repost</h3>
  <p style="color:#8b8fa3;font-size:12px;margin:0 0 12px">When an admin reacts with a specific emoji, the message gets reposted to a chosen channel. No threshold needed — one admin reaction triggers it.</p>
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:10px">
    <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Enabled</label><select id="arEnabled" style="margin:4px 0"><option value="false"${!adminRepost.enabled ? ' selected' : ''}>Disabled</option><option value="true"${adminRepost.enabled ? ' selected' : ''}>Enabled</option></select></div>
    <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Target Channel</label>
      <div style="position:relative">
        <input id="arChannelSearch" value="${arChName ? '#'+arChName.name : ''}" placeholder="Type to search channels..." autocomplete="off" style="margin:4px 0;font-size:12px" onfocus="arShowDrop()" oninput="arFilterDrop()">
        <input type="hidden" id="arChannel" value="${adminRepost.channelId||''}">
        <div id="arChannelDrop" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:180px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
      </div>
    </div>
    <div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Emoji</label><input id="arEmoji" value="${adminRepost.emoji||'📌'}" style="margin:4px 0"></div>
  </div>
  <button class="small" onclick="saveAdminRepost()" style="margin-top:8px">💾 Save</button><div id="arStatus" style="margin-top:8px"></div>
</div>
</div>

<script>
var _sbChannels=${sbChannelsJSON};

function sbSwitchTab(tab){
  document.getElementById('sb-section-starboard').style.display=tab==='starboard'?'':'none';
  document.getElementById('sb-section-repost').style.display=tab==='repost'?'':'none';
  document.getElementById('sb-tab-starboard').style.borderBottomColor=tab==='starboard'?'#ffd700':'transparent';
  document.getElementById('sb-tab-starboard').style.color=tab==='starboard'?'#ffd700':'#8b8fa3';
  document.getElementById('sb-tab-repost').style.borderBottomColor=tab==='repost'?'#3498db':'transparent';
  document.getElementById('sb-tab-repost').style.color=tab==='repost'?'#3498db':'#8b8fa3';
}

function arShowDrop(){
  var drop=document.getElementById('arChannelDrop');drop.style.display='block';
  arFilterDrop();
  setTimeout(function(){document.addEventListener('click',function _h(e){if(!drop.contains(e.target)&&e.target!==document.getElementById('arChannelSearch')){drop.style.display='none';document.removeEventListener('click',_h);}});},10);
}
function arFilterDrop(){
  var drop=document.getElementById('arChannelDrop');
  var q=(document.getElementById('arChannelSearch').value||'').toLowerCase();
  var filtered=_sbChannels.filter(function(c){return c.name.toLowerCase().includes(q);}).slice(0,15);
  drop.innerHTML='';drop.style.display=filtered.length?'block':'none';
  filtered.forEach(function(c){
    var opt=document.createElement('div');
    opt.style.cssText='padding:6px 10px;cursor:pointer;font-size:12px;color:#e0e0e0;border-bottom:1px solid #2a2f3a';
    opt.onmouseenter=function(){this.style.background='#333';};opt.onmouseleave=function(){this.style.background='';};
    opt.textContent='#'+c.name;
    opt.onclick=function(){document.getElementById('arChannel').value=c.id;document.getElementById('arChannelSearch').value='#'+c.name;drop.style.display='none';};
    drop.appendChild(opt);
  });
}

function saveStarboard(){fetch('/api/starboard/save',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({channelId:document.getElementById('sbChannel').value.trim(),minStars:parseInt(document.getElementById('sbMin').value)||3,emoji:document.getElementById('sbEmoji').value.trim()||'⭐'})}).then(function(r){return r.json()}).then(function(d){if(d.success){document.getElementById('sbStatus').innerHTML='<div style="color:#2ecc71">✅ Saved!</div>';setTimeout(function(){document.getElementById('sbStatus').innerHTML=''},3000);}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});}
function saveAdminRepost(){fetch('/api/starboard/admin-repost',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById('arEnabled').value==='true',channelId:document.getElementById('arChannel').value.trim(),emoji:document.getElementById('arEmoji').value.trim()||'📌'})}).then(function(r){return r.json()}).then(function(d){if(d.success){document.getElementById('arStatus').innerHTML='<div style="color:#2ecc71">✅ Saved!</div>';setTimeout(function(){document.getElementById('arStatus').innerHTML=''},3000);}else{alert(d.error||'Error');}}).catch(function(e){alert(e.message);});}
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
    <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:0.5px;margin-bottom:8px">Memory (RSS)</div>
    <div style="font-size:28px;font-weight:700;color:#f39c12">${memRss}MB</div>
    <div style="font-size:11px;color:#8b8fa3">Heap: ${memHeap}MB / ${memHeapTotal}MB</div>
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
    + '<select id="filter-rarity" onchange="applyFilters()" style="margin:4px 0"><option value="">All Rarities</option><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="legendary" selected>Legendary</option></select></div>'
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
    + '<div style="margin-bottom:12px"><button onclick="randomSelectAll(true)" style="padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:11px;margin-right:6px">Select All</button><button onclick="randomSelectAll(false)" style="padding:4px 12px;background:#333;color:#ccc;border:1px solid #555;border-radius:4px;cursor:pointer;font-size:11px;margin-right:6px">Deselect All</button><button onclick="randomSelectLegendary()" style="padding:4px 12px;background:#f39c1222;color:#f39c12;border:1px solid #f39c1244;border-radius:4px;cursor:pointer;font-size:11px;font-weight:600">⭐ Legendary Only</button></div>'
    + '<div id="random-pet-list" style="max-height:300px;overflow-y:auto;margin-bottom:16px"></div>'
    + '<button onclick="spinRandom()" style="width:100%;padding:12px;background:#9b59b6;color:#fff;border:none;border-radius:8px;cursor:pointer;font-weight:700;font-size:16px">🎲 SPIN!</button>'
    + '<div id="random-result" style="margin-top:16px;text-align:center;min-height:60px"></div>'
    + '</div></div>'

    // Suggest best modal
    + '<div id="suggest-modal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box">'
    + '<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:480px;width:100%;max-height:80vh;overflow-y:auto">'
    + '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px"><h2 style="margin:0">💡 Suggested Best Pet</h2><button onclick="closeSuggestModal()" style="background:none;border:none;color:#ccc;font-size:24px;cursor:pointer">&times;</button></div>'
    + '<p style="color:#8b8fa3;font-size:12px;margin-top:0">Your best owned pet, based on tier rank and points.</p>'
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
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">📁 Category</label><div id="create-pet-category-display" style="margin:4px 0;padding:8px 12px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:6px;color:#e0e0e0;font-size:13px"></div><input type="hidden" id="create-pet-category"></div>'
    + '<div style="display:grid;grid-template-columns:2fr 1fr;gap:8px"><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Name</label><input type="text" id="create-pet-name" placeholder="Pet name" style="margin:4px 0"></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Emoji</label><input type="text" id="create-pet-emoji" placeholder="🐾" style="margin:4px 0"></div></div>'
    + '<div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Rarity</label><select id="create-pet-rarity" style="margin:4px 0"><option value="common">Common</option><option value="uncommon">Uncommon</option><option value="rare">Rare</option><option value="legendary">Legendary</option></select></div><div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Tier</label><select id="create-pet-tier" style="margin:4px 0"><option value="">No Tier</option><option value="S">S</option><option value="A">A</option><option value="B">B</option><option value="C">C</option><option value="D">D</option></select></div></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Description</label><textarea id="create-pet-desc" rows="2" style="margin:4px 0;resize:vertical" placeholder="Short description..."></textarea></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Bonus / Effect</label><input type="text" id="create-pet-bonus" placeholder="e.g. +10% XP" style="margin:4px 0"></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Static Image <span style="color:#555">(.png, .jpg, .webp)</span></label>'
    + '<div id="create-drop-imageUrl" style="margin:4px 0;border:2px dashed #444;border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px" onclick="document.getElementById(\'create-file-imageUrl\').click()" ondragover="event.preventDefault();this.style.borderColor=\'#9146ff\';this.style.background=\'#9146ff11\'" ondragleave="this.style.borderColor=\'#444\';this.style.background=\'\'" ondrop="event.preventDefault();this.style.borderColor=\'#444\';this.style.background=\'\';handleCreateDrop(event,\'imageUrl\')">'
    + '<div id="create-drop-imageUrl-preview"></div>'
    + '<div id="create-drop-imageUrl-text" style="color:#8b8fa3;font-size:12px">📁 Drag &amp; drop image here or click to browse</div>'
    + '<input type="file" id="create-file-imageUrl" accept="image/png,image/jpeg,image/webp" style="display:none" onchange="handleCreateFileSelect(this,\'imageUrl\')">'
    + '<input type="hidden" id="create-pet-image">'
    + '<div id="create-drop-imageUrl-loading" style="display:none;color:#9146ff;font-size:12px">⏳ Uploading...</div>'
    + '</div></div>'
    + '<div><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Animated Image <span style="color:#555">(.gif) — optional</span></label>'
    + '<div id="create-drop-animatedUrl" style="margin:4px 0;border:2px dashed #444;border-radius:8px;padding:16px;text-align:center;cursor:pointer;transition:border-color .2s,background .2s;min-height:80px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:6px" onclick="document.getElementById(\'create-file-animatedUrl\').click()" ondragover="event.preventDefault();this.style.borderColor=\'#9146ff\';this.style.background=\'#9146ff11\'" ondragleave="this.style.borderColor=\'#444\';this.style.background=\'\'" ondrop="event.preventDefault();this.style.borderColor=\'#444\';this.style.background=\'\';handleCreateDrop(event,\'animatedUrl\')">'
    + '<div id="create-drop-animatedUrl-preview"></div>'
    + '<div id="create-drop-animatedUrl-text" style="color:#8b8fa3;font-size:12px">📁 Drag &amp; drop .gif here or click to browse</div>'
    + '<input type="file" id="create-file-animatedUrl" accept="image/gif" style="display:none" onchange="handleCreateFileSelect(this,\'animatedUrl\')">'
    + '<input type="hidden" id="create-pet-animated">'
    + '<div id="create-drop-animatedUrl-loading" style="display:none;color:#9146ff;font-size:12px">⏳ Uploading...</div>'
    + '</div></div>'
    + '<div id="create-pet-confirm" style="display:none;padding:10px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:6px;margin-bottom:8px"><div style="font-size:12px;color:#f39c12;margin-bottom:6px">⚠️ Review before creating:</div><div id="create-pet-summary" style="font-size:11px;color:#e0e0e0"></div></div>'
    + '<div style="display:flex;gap:8px"><button id="create-pet-review-btn" onclick="reviewCreatePet()" style="flex:1;padding:10px;background:#2ecc71;color:#fff;border:none;border-radius:6px;cursor:pointer;font-weight:700">➕ Create Pet</button><button id="create-pet-submit-btn" onclick="submitCreatePet()" style="display:none;flex:1;padding:10px;background:#555;color:#999;border:none;border-radius:6px;font-weight:700;cursor:not-allowed" disabled>⏳ Confirm (3s)</button><button id="create-pet-back-btn" onclick="cancelConfirmPet()" style="display:none;padding:10px;background:#3a3a42;color:#e0e0e0;border:none;border-radius:6px;cursor:pointer">← Back</button></div>'
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
    + '    var allPending=pendingCnt>0&&pendingCnt>=cnt;'
    + '    html+=\'<div style="border:2px solid \'+bc+\'44;border-radius:8px;padding:6px;background:#1e1f22;text-align:center;min-width:95px;max-width:125px;position:relative;transition:transform .15s;\'+(allPending?"opacity:.4;filter:grayscale(0.3);":"")+\'" onmouseover="this.style.transform=\\\'scale(1.04)\\\'" onmouseout="this.style.transform=\\\'\\\'">\''
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
    + '    html+=\'<div class="card"><div style="display:flex;justify-content:space-between;align-items:center"><h2 style="cursor:pointer;user-select:none;margin:0" onclick="toggleCat(this.dataset.cat)" data-cat="\'+cat+\'">\'+icon+" "+cat+" ("+catPets.length+\') <span style="font-size:12px;color:#8b8fa3;margin-left:8px">\'+arrow+\'</span></h2>\'+(canEdit?\'<div style="display:flex;gap:6px"><button onclick="openCreatePetModal(\\\'\'+cat+\'\\\')" style="padding:4px 10px;background:#2ecc7122;color:#2ecc71;border:1px solid #2ecc7144;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;width:auto" title="Create new pet in this category">➕ Create Pet</button><button data-delcat="\'+cat+\'" onclick="deletePetCategory(this.getAttribute(\\\'data-delcat\\\'))" style="padding:4px 10px;background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;border-radius:6px;cursor:pointer;font-size:11px;font-weight:600;width:auto" title="Delete all pets in this category">🗑️ Delete Category</button></div>\':\'\')+\'</div>\';'
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
    + '        +(canEdit?\'<div style="position:absolute;top:8px;left:8px;display:flex;gap:2px"><button onclick="openEditModal(\\\'\'+p.id+\'\\\')" style="background:none;border:none;color:#8b8fa3;cursor:pointer;font-size:14px;padding:2px" title="Edit pet">✏️</button><button onclick="deletePetType(\\\'\'+p.id+\'\\\')" style="background:none;border:none;color:#e74c3c;cursor:pointer;font-size:14px;padding:2px" title="Delete pet type">🗑️</button></div>\':\'\')'
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

    // Delete pet type
    + 'window.deletePetType=function(petId){'
    + '  var p=catalog.find(function(c){return c.id===petId});'
    + '  if(!p) return;'
    + '  if(!confirm("Delete pet type \\""+p.name+"\\"? This will also remove all owned instances.")) return;'
    + '  fetch("/api/pets/catalog/delete-pet",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:petId})})'
    + '  .then(function(r){return r.json()})'
    + '  .then(function(d){'
    + '    if(d.success){'
    + '      catalog=catalog.filter(function(c){return c.id!==petId});'
    + '      pets=pets.filter(function(p){return p.catalogId!==petId});'
    + '      applyFilters();'
    + '      showToast("Deleted "+d.name+(d.removedOwned?" (+"+d.removedOwned+" owned removed)":""),"success");'
    + '    } else { showToast(d.error||"Failed to delete","error"); }'
    + '  }).catch(function(e){showToast("Error: "+e.message,"error")});'
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

    // Create modal drag-and-drop upload
    + 'function uploadFileCreate(file,field){'
    + '  var loading=document.getElementById("create-drop-"+field+"-loading");'
    + '  loading.style.display="";'
    + '  var fd=new FormData();fd.append("image",file);'
    + '  fetch("/upload/image",{method:"POST",body:fd}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired or server error. Please refresh the page.");}return r.json()}).then(function(d){'
    + '    loading.style.display="none";'
    + '    if(d.success){'
    + '      var inputId=field==="imageUrl"?"create-pet-image":"create-pet-animated";'
    + '      document.getElementById(inputId).value=d.url;'
    + '      var prev=document.getElementById("create-drop-"+field+"-preview");'
    + '      prev.innerHTML=\'<img src="\'+d.url+\'" style="max-width:64px;max-height:64px;border-radius:6px">\';'
    + '      document.getElementById("create-drop-"+field+"-text").textContent="✅ Uploaded! Click or drop to replace.";'
    + '    }else{alert(d.error||"Upload failed");}'
    + '  }).catch(function(e){loading.style.display="none";alert("Upload error: "+e.message)});'
    + '}'
    + 'window.handleCreateDrop=function(e,field){'
    + '  var file=e.dataTransfer.files[0];'
    + '  if(file&&file.type.startsWith("image/")) uploadFileCreate(file,field);'
    + '  else alert("Please drop an image file");'
    + '};'
    + 'window.handleCreateFileSelect=function(input,field){'
    + '  if(input.files[0]) uploadFileCreate(input.files[0],field);'
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
    + 'window.randomSelectLegendary=function(){document.querySelectorAll(".random-check").forEach(function(cb){var c=catalog.find(function(x){return x.id===cb.value});cb.checked=c&&c.rarity==="legendary"});};'
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
    + '  var owned=catalog.filter(function(c){return ownedIds.has(c.id)&&!c.hidden});'
    + '  if(owned.length===0){document.getElementById("suggest-result").innerHTML=\'<div style="color:#e74c3c;font-size:16px;font-weight:700;padding:20px">😿 You don\\\'t own any pets yet!</div>\';document.getElementById("suggest-modal").style.display="flex";return;}'
    + '  owned.sort(function(a,b){'
    + '    var ta=tierOrder[a.tier]||0,tb=tierOrder[b.tier]||0;'
    + '    if(tb!==ta) return tb-ta;'
    + '    return (b.tierPoints||0)-(a.tierPoints||0);'
    + '  });'
    + '  var best=owned[0];'
    + '  var src=best.animatedUrl||best.imageUrl||"";'
    + '  var bc=rarityColors[best.rarity]||"#8b8fa3";'
    + '  var tierColor=best.tier==="S"?"#ff4444":best.tier==="A"?"#f39c12":best.tier==="B"?"#3498db":best.tier==="C"?"#2ecc71":"#8b8fa3";'
    + '  document.getElementById("suggest-result").innerHTML='
    + '    \'<div style="margin-bottom:12px;color:#f39c12;font-size:14px">🏆 Your best pet:</div>\''
    + '    +imgTag(src,best.name,best.emoji,96)'
    + '    +\'<div style="font-weight:700;font-size:20px;margin-top:10px">\'+best.emoji+" "+best.name+\'</div>\''
    + '    +\'<div style="color:\'+bc+\';font-size:12px;text-transform:uppercase">\'+best.rarity+\'</div>\''
    + '    +(best.tier?\'<div style="font-weight:700;color:\'+tierColor+\';font-size:14px;margin-top:4px">\'+best.tier+\' Rank\'+(best.tierPoints?" \\u2022 "+best.tierPoints+"pts":"")+\'</div>\':"<div style=\\"font-size:11px;color:#555;margin-top:4px\\">No tier assigned</div>")'
    + '    +(best.bonus?\'<div style="color:#f1c40f;font-size:11px;margin-top:4px">\\u26a1 \'+best.bonus+\'</div>\':"")'
    + '    +\'<div style="font-size:11px;color:#8b8fa3;margin-top:8px">Owned x\'+ownedCount(best.id)+\'</div>\';'
    + '  document.getElementById("suggest-modal").style.display="flex";'
    + '};'
    + 'window.closeSuggestModal=function(){document.getElementById("suggest-modal").style.display="none";};'

    // Create pet modal
    + 'window.openCreatePetModal=function(cat){'
    + '  document.getElementById("create-pet-category").value=cat;'
    + '  document.getElementById("create-pet-category-display").textContent=(categoryIcons[cat]||"📁")+" "+cat;'
    + '  document.getElementById("create-pet-title").textContent="➕ New Pet in "+cat;'
    + '  document.getElementById("create-pet-name").value="";'
    + '  document.getElementById("create-pet-emoji").value="";'
    + '  document.getElementById("create-pet-rarity").value="common";'
    + '  document.getElementById("create-pet-tier").value="";'
    + '  document.getElementById("create-pet-desc").value="";'
    + '  document.getElementById("create-pet-bonus").value="";'
    + '  document.getElementById("create-pet-image").value="";'
    + '  document.getElementById("create-pet-animated").value="";'
    + '  document.getElementById("create-drop-imageUrl-preview").innerHTML="";'
    + '  document.getElementById("create-drop-imageUrl-text").textContent="📁 Drag & drop image here or click to browse";'
    + '  document.getElementById("create-drop-animatedUrl-preview").innerHTML="";'
    + '  document.getElementById("create-drop-animatedUrl-text").textContent="📁 Drag & drop .gif here or click to browse";'
    + '  document.getElementById("create-pet-modal").style.display="flex";'
    + '};'
    + 'window.closeCreatePetModal=function(){document.getElementById("create-pet-modal").style.display="none";cancelConfirmPet();};'
    + 'window.reviewCreatePet=function(){'
    + '  var name=document.getElementById("create-pet-name").value.trim();'
    + '  if(!name){alert("Please enter a pet name");return;}'
    + '  var rarity=document.getElementById("create-pet-rarity").value;'
    + '  var cat=document.getElementById("create-pet-category").value;'
    + '  var emoji=document.getElementById("create-pet-emoji").value.trim()||"\\ud83d\\udc3e";'
    + '  var tier=document.getElementById("create-pet-tier").value;'
    + '  document.getElementById("create-pet-summary").innerHTML="<b>"+emoji+" "+name+"</b> — "+rarity+(tier?" (Tier "+tier+")":"")+" in <b>"+cat+"</b>";'
    + '  document.getElementById("create-pet-confirm").style.display="block";'
    + '  document.getElementById("create-pet-review-btn").style.display="none";'
    + '  document.getElementById("create-pet-submit-btn").style.display="";'
    + '  document.getElementById("create-pet-back-btn").style.display="";'
    + '  var btn=document.getElementById("create-pet-submit-btn");'
    + '  btn.disabled=true;btn.style.background="#555";btn.style.color="#999";btn.style.cursor="not-allowed";btn.textContent="\\u23F3 Confirm (3s)";'
    + '  var sec=3;window._petConfirmTimer=setInterval(function(){sec--;if(sec>0){btn.textContent="\\u23F3 Confirm ("+sec+"s)";}else{clearInterval(window._petConfirmTimer);btn.disabled=false;btn.style.background="#2ecc71";btn.style.color="#fff";btn.style.cursor="pointer";btn.textContent="\\u2705 Confirm Create";}},1000);'
    + '};'
    + 'window.cancelConfirmPet=function(){'
    + '  if(window._petConfirmTimer)clearInterval(window._petConfirmTimer);'
    + '  document.getElementById("create-pet-confirm").style.display="none";'
    + '  document.getElementById("create-pet-review-btn").style.display="";'
    + '  document.getElementById("create-pet-submit-btn").style.display="none";'
    + '  document.getElementById("create-pet-back-btn").style.display="none";'
    + '};'
    + 'window.submitCreatePet=function(){'
    + '  var name=document.getElementById("create-pet-name").value.trim();'
    + '  var emoji=document.getElementById("create-pet-emoji").value.trim()||"\ud83d\udc3e";'
    + '  var category=document.getElementById("create-pet-category").value;'
    + '  var rarity=document.getElementById("create-pet-rarity").value;'
    + '  var tier=document.getElementById("create-pet-tier").value;'
    + '  var description=document.getElementById("create-pet-desc").value.trim();'
    + '  var bonus=document.getElementById("create-pet-bonus").value.trim();'
    + '  var imageUrl=document.getElementById("create-pet-image").value.trim();'
    + '  var animatedUrl=document.getElementById("create-pet-animated").value.trim();'
    + '  if(!name){alert("Please enter a pet name");return;}'
    + '  var lowerName=name.toLowerCase();'
    + '  var dupeCheck=catalog.filter(function(p){return p.name&&p.name.toLowerCase()===lowerName;});'
    + '  if(dupeCheck.length>0){if(!confirm("⚠️ A pet named \\\""+name+"\\\" already exists! Create a duplicate?")){return;}}'
    + '  if(rarity==="legendary"||rarity==="epic"){var rareDupes=catalog.filter(function(p){return p.rarity===rarity&&p.category===category;});if(rareDupes.length>0){if(!confirm("⚠️ There are already "+rareDupes.length+" "+rarity+" pet(s) in "+category+". Are you sure?")){return;}}}'
    + '  fetch("/api/pets/catalog/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:name,emoji:emoji,category:category,rarity:rarity,tier:tier,description:description,bonus:bonus,imageUrl:imageUrl,animatedUrl:animatedUrl})}).then(function(r){return r.json()}).then(function(d){'
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
    + '<div style="flex:1;min-width:160px;position:relative"><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">Search</label><input id="hist-search" oninput="renderHistory();histAutocomplete(this)" placeholder="Pet name, requester, approver..." style="width:100%;margin:4px 0" autocomplete="off"><div id="hist-search-suggest" style="display:none;position:absolute;top:100%;left:0;right:0;background:#1e1f22;border:1px solid #3a3a42;border-radius:0 0 6px 6px;max-height:120px;overflow-y:auto;z-index:100"></div></div>'
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
    + '    if(search && p.petName.toLowerCase().indexOf(search)===-1 && (p.requestedByName||"").toLowerCase().indexOf(search)===-1 && (p.givenBy||"").toLowerCase().indexOf(search)===-1 && (p.approvedBy||"").toLowerCase().indexOf(search)===-1 && (p.rejectedBy||"").toLowerCase().indexOf(search)===-1) return false;'
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

    + 'window.histAutocomplete=function(input){'
    + '  var val=(input.value||"").trim().toLowerCase();var sugDiv=document.getElementById("hist-search-suggest");'
    + '  if(!val||val.length<2){sugDiv.style.display="none";return;}'
    + '  var names=new Set();history.forEach(function(p){if(p.petName&&p.petName.toLowerCase().indexOf(val)!==-1)names.add(p.petName);if((p.requestedByName||"").toLowerCase().indexOf(val)!==-1&&p.requestedByName)names.add(p.requestedByName);if((p.givenBy||"").toLowerCase().indexOf(val)!==-1&&p.givenBy)names.add(p.givenBy)});'
    + '  var matches=Array.from(names).slice(0,6);'
    + '  if(matches.length===0){sugDiv.style.display="none";return;}'
    + '  sugDiv.innerHTML=matches.map(function(n){var safe=n.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/"/g,"&quot;");return "<div class=\\"hist-sug-item\\" data-val=\\""+safe+"\\" style=\\"padding:5px 8px;cursor:pointer;font-size:11px;border-bottom:1px solid #2a2f3a\\">"+safe+"</div>";}).join("");'
    + '  sugDiv.querySelectorAll(".hist-sug-item").forEach(function(el){el.onmouseover=function(){el.style.background="#333"};el.onmouseout=function(){el.style.background=""};el.onclick=function(){document.getElementById("hist-search").value=el.getAttribute("data-val");sugDiv.style.display="none";renderHistory()}});'
    + '  sugDiv.style.display="block";'
    + '};'

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
    + '  var g=history.find(function(x){return x.id===id});'
    + '  var modal=document.getElementById("giveaway-confirm-modal");'
    + '  if(!modal){'
    + '    modal=document.createElement("div");modal.id="giveaway-confirm-modal";'
    + '    modal.style.cssText="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.85);z-index:2000;align-items:center;justify-content:center;padding:20px;box-sizing:border-box";'
    + '    modal.innerHTML=\'<div style="background:#1e1e1e;padding:30px;border-radius:12px;max-width:450px;width:100%"><h2 style="margin-top:0">✅ Confirm Giveaway</h2><div id="gc-info" style="margin-bottom:12px"></div><div style="margin-bottom:12px"><label style="font-size:11px;color:#8b8fa3;text-transform:uppercase">📸 Proof Screenshot (optional)</label><input type="file" id="gc-proof" accept="image/*" style="margin:4px 0;width:100%;padding:6px;background:#1d2028;border:1px solid #3a3a42;border-radius:6px;color:#e0e0e0;font-size:11px;box-sizing:border-box"><div id="gc-proof-preview" style="display:none;margin:6px 0"><img id="gc-proof-img" style="max-width:100%;max-height:140px;border-radius:6px"></div></div><label style="display:flex;align-items:center;gap:8px;cursor:pointer;font-size:12px;margin-bottom:12px"><input type="checkbox" id="gc-verified" style="accent-color:#2ecc71"> I verify this giveaway/trade actually happened</label><div style="display:flex;gap:10px"><button id="gc-submit" onclick="submitGiveawayConfirm()" style="flex:1;padding:10px;background:#555;color:#999;border:none;border-radius:6px;font-weight:700;cursor:not-allowed" disabled>Confirm</button><button onclick="document.getElementById(\\\'giveaway-confirm-modal\\\').style.display=\\\'none\\\'" style="flex:1;padding:10px;background:#333;color:#ccc;border:1px solid #555;border-radius:6px;cursor:pointer">Cancel</button></div></div>\';'
    + '    document.body.appendChild(modal);'
    + '    document.getElementById("gc-proof").onchange=function(){var f=this.files[0];if(f){var r=new FileReader();r.onload=function(ev){document.getElementById("gc-proof-img").src=ev.target.result;document.getElementById("gc-proof-preview").style.display="block";};r.readAsDataURL(f);}else{document.getElementById("gc-proof-preview").style.display="none";}};'
    + '    document.getElementById("gc-verified").onchange=function(){var btn=document.getElementById("gc-submit");if(this.checked){btn.disabled=false;btn.style.background="#2ecc71";btn.style.color="#fff";btn.style.cursor="pointer";}else{btn.disabled=true;btn.style.background="#555";btn.style.color="#999";btn.style.cursor="not-allowed";}};'
    + '  }'
    + '  document.getElementById("gc-info").innerHTML=g?"<b>"+g.petEmoji+" "+g.petName+"</b> \\u2022 Winner: <b>"+g.winner+"</b> \\u2022 Given by: <b>"+g.giver+"</b>":"Giveaway #"+id;'
    + '  document.getElementById("gc-verified").checked=false;'
    + '  var btn=document.getElementById("gc-submit");btn.disabled=true;btn.style.background="#555";btn.style.color="#999";btn.style.cursor="not-allowed";'
    + '  document.getElementById("gc-proof").value="";document.getElementById("gc-proof-preview").style.display="none";'
    + '  modal.dataset.giveawayId=id;'
    + '  modal.style.display="flex";'
    + '};'
    + 'window.submitGiveawayConfirm=function(){'
    + '  var modal=document.getElementById("giveaway-confirm-modal");'
    + '  var id=modal.dataset.giveawayId;'
    + '  var proofFile=document.getElementById("gc-proof").files[0];'
    + '  var doConfirm=function(proofUrl){'
    + '    fetch("/api/pets/giveaway/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id:id,proofUrl:proofUrl||null})}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired. Please refresh.");}return r.json()}).then(function(d){'
    + '      if(d.success){var g=history.find(function(x){return x.id===id});if(g){g.confirmed=true;g.confirmedBy="You";}modal.style.display="none";filterGiveaways();}'
    + '      else{alert(d.error||"Failed");}'
    + '    }).catch(function(e){alert("Error: "+e.message)});'
    + '  };'
    + '  if(proofFile){'
    + '    var fd=new FormData();fd.append("image",proofFile);'
    + '    fetch("/upload/image",{method:"POST",body:fd}).then(function(r){var ct=r.headers.get("content-type")||"";if(!ct.includes("application/json")){throw new Error("Session expired or server error. Please refresh the page.");}return r.json()}).then(function(d){'
    + '      doConfirm(d.url||null);'
    + '    }).catch(function(e){alert("Upload error: "+e.message)});'
    + '  }else{doConfirm(null);}'
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


export function renderIdleonDashboardTab(userTier) {
  const { membersCache } = _getState();
  const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
  const canWrite = TIER_LEVELS[userTier] >= TIER_LEVELS.admin;
  return `
<style>
.idl-kpi{background:#111116;border:1px solid #23232b;border-radius:12px;padding:16px;position:relative;overflow:hidden}
.idl-kpi::before{content:'';position:absolute;top:0;left:0;right:0;height:3px;border-radius:12px 12px 0 0}
.idl-kpi .label{font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.5px;font-weight:600}.idl-kpi .val{font-size:26px;font-weight:800;margin-top:6px;line-height:1}
.idl-kpi .sub{font-size:11px;color:#8b8fa3;margin-top:4px}
.idl-kpi-members::before{background:#7c3aed}.idl-kpi-members .val{color:#7c3aed}
.idl-kpi-guilds::before{background:#2196f3}.idl-kpi-guilds .val{color:#2196f3}
.idl-kpi-weekly::before{background:#ff9800}.idl-kpi-weekly .val{color:#ff9800}
.idl-kpi-alltime::before{background:#e91e63}.idl-kpi-alltime .val{color:#e91e63}
.idl-kpi-active::before{background:#00bcd4}.idl-kpi-active .val{color:#00bcd4}
.idl-kpi-avg::before{background:#8bc34a}.idl-kpi-avg .val{color:#8bc34a}
.idl-kpi-kick::before{background:#f44336}.idl-kpi-kick .val{color:#f44336}
.idl-status-green{color:#4caf50}.idl-status-yellow{color:#ffc107}.idl-status-orange{color:#ff9800}.idl-status-red{color:#f44336}
.idl-risk-bar{height:8px;border-radius:4px;background:#333;overflow:hidden;margin-top:4px}
.idl-risk-fill{height:100%;border-radius:4px;transition:width .3s}
.idl-alert-card{background:#111116;border:1px solid #23232b;border-radius:10px;padding:12px 16px;margin-bottom:10px}
.idl-alert-card .alert-item{padding:6px 0;font-size:13px;display:flex;align-items:center;gap:8px}
.idl-alert-card .alert-item+.alert-item{border-top:1px solid #23232b}
.idl-alert-warn{color:#ffb74d}.idl-alert-danger{color:#ef9a9a}.idl-alert-info{color:#90caf9}
.idl-guild-breakdown{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px;margin-top:12px}
.idl-guild-card{background:#111116;border:1px solid #23232b;border-radius:8px;padding:10px}
.idl-guild-card h4{margin:0 0 6px;font-size:13px;color:#b794f6;display:flex;align-items:center;justify-content:space-between}
.idl-guild-card .stat{display:flex;justify-content:space-between;font-size:12px;padding:2px 0;color:#ccc}
.idl-guild-card .stat .dim{color:#8b8fa3}
.idl-bonus-btn{background:none;border:1px solid #3a3a42;border-radius:4px;color:#8b8fa3;font-size:9px;padding:1px 3px;cursor:pointer;transition:all .2s;line-height:1.2}
.idl-bonus-btn:hover{background:#23232b;color:#b794f6;border-color:#b794f6}
.idl-modal-overlay{position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,.7);z-index:9999;display:flex;align-items:center;justify-content:center}
.idl-modal{background:#17171b;border:1px solid #3a3a42;border-radius:12px;padding:20px;min-width:320px;max-width:420px;max-height:80vh;overflow-y:auto}
.idl-modal h3{margin:0 0 12px;color:#b794f6;font-size:15px;display:flex;align-items:center;justify-content:space-between}
.idl-modal .close-btn{background:none;border:none;color:#8b8fa3;font-size:18px;cursor:pointer;padding:0 4px}.idl-modal .close-btn:hover{color:#fff}
.idl-modal .bonus-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;font-size:12px;border-bottom:1px solid #23232b;color:#ccc}
.idl-modal .bonus-row:last-child{border-bottom:none}
.idl-modal .bonus-lv{font-weight:700;color:#b794f6;min-width:30px;text-align:right}
.idl-bonus-hover{position:relative;display:inline-block}
.idl-bonus-popup{display:none;position:absolute;z-index:200;top:100%;right:0;background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:10px 12px;width:240px;box-shadow:0 4px 20px rgba(0,0,0,.5);margin-top:4px}
.idl-bonus-hover:hover .idl-bonus-popup{display:block}
.idl-atrisk-row{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2f3a;font-size:13px}
.idl-atrisk-row:last-child{border-bottom:none}
.idl-atrisk-score{font-weight:700;font-size:14px;min-width:32px;text-align:center}
.idl-wow{display:inline-flex;align-items:center;gap:3px;font-size:11px;font-weight:600;padding:2px 6px;border-radius:8px}
.idl-wow.up{background:rgba(76,175,80,.12);color:#4caf50}.idl-wow.down{background:rgba(244,67,54,.12);color:#f44336}.idl-wow.flat{background:rgba(139,143,163,.1);color:#8b8fa3}
</style>

<div class="card" style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px">
  <div>
    <h2 style="margin:0">📊 IdleOn Guild Manager</h2>
    <p style="color:#8b8fa3;margin:4px 0 0">Overview of guild health, activity alerts, and key metrics across all tracked guilds.</p>
  </div>
  <div id="idlLastUpdated" style="font-size:12px;color:#8b8fa3;text-align:right"></div>
</div>

<div id="idlAlerts"></div>

<div id="idlKpis" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(170px,1fr));gap:10px;margin-bottom:16px"></div>

<!-- Guild Breakdown -->
<div class="card">
  <h2>🏰 Guild Breakdown</h2>
  <div id="idlGuildBreakdown" class="idl-guild-breakdown"></div>
</div>

<!-- Top 5 At-Risk right on the dashboard -->
<div class="card">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:8px;margin-bottom:8px">
    <div>
      <h2 style="margin:0">⚠️ Top 5 At-Risk Members</h2>
      <p style="color:#8b8fa3;font-size:12px;margin:4px 0 0">Highest risk members across all guilds.</p>
    </div>
    <button onclick="window.location.href='/idleon-guild-mgmt'" style="background:#f4433620;border:1px solid #f44336;color:#ef9a9a;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;width:auto">📋 Take me to kicks</button>
  </div>
  <div id="idlTopRisk"></div>
</div>

<div class="card">
  <h2>📋 Recent Activity</h2>
  <div id="idlRecentActivity" style="max-height:250px;overflow-y:auto;font-size:13px"></div>
</div>

<script>
(function(){
  var model={members:[],guilds:[],config:{},kickLog:[],waitlist:[],promotionList:[],importLog:[]};
  var _loadedAt=0;
  var bonusNames=['GP Bonus','EXP Bonus','Dungeon Bonus','Drop Bonus','Skill EXP','Damage Bonus','Carry Cap','Mining Bonus','Fishing Bonus','Chopping Bonus','Catching Bonus','Trapping Bonus','Worship Bonus'];
  function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function fmtN(n){return Number(n||0).toLocaleString();}
  function weekKey(){var d=new Date();d.setHours(0,0,0,0);var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return d.toISOString().slice(0,10);}
  function prevWeekKey(){var d=new Date();d.setHours(0,0,0,0);var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd-7);return d.toISOString().slice(0,10);}
  function normHist(r){return(Array.isArray(r)?r:[]).map(function(h){return{weekStart:String(h.weekStart||'').slice(0,10),gp:Math.max(0,Number(h.gp||0))}}).filter(function(h){return /^\\d{4}-\\d{2}-\\d{2}$/.test(h.weekStart)&&Number.isFinite(h.gp)});}
  function allTimeGp(m){var h=normHist(m.weeklyHistory),t=h.reduce(function(s,x){return s+x.gp},0),b=Number(m.allTimeBaseline);return Number.isFinite(b)?Math.max(0,b)+t:Number(m.totalGp||0);}
  function weeklyGp(m){var wk=weekKey();var cur=normHist(m.weeklyHistory).find(function(h){return h.weekStart===wk});return cur?cur.gp:0;}
  function prevWeeklyGp(m){var wk=prevWeekKey();var cur=normHist(m.weeklyHistory).find(function(h){return h.weekStart===wk});return cur?cur.gp:0;}
  function daysSince(m){var h=normHist(m.weeklyHistory).filter(function(x){return x.gp>0});if(!h.length)return m.updatedAt?Math.floor((Date.now()-m.updatedAt)/864e5):999;h.sort(function(a,b){return b.weekStart.localeCompare(a.weekStart)});var d=new Date(h[0].weekStart+'T00:00:00Z');d.setDate(d.getDate()+6);return Math.max(0,Math.floor((Date.now()-d.getTime())/864e5));}
  function statusColor(d){var cfg=model.config||{};var w=cfg.warningDays||7,k=cfg.kickThresholdDays||14;if(d>=k)return'red';if(d>=w)return'orange';if(d>=Math.ceil(w/2))return'yellow';return'green';}
  function streak(m){var h=normHist(m.weeklyHistory);var map={};h.forEach(function(x){map[x.weekStart]=x.gp});var wk=new Date();wk.setHours(0,0,0,0);var wd=(wk.getDay()+6)%7;wk.setDate(wk.getDate()-wd);var cur=0;for(var i=0;i<156;i++){var k=wk.toISOString().slice(0,10);if((map[k]||0)>0)cur++;else break;wk.setDate(wk.getDate()-7);}return cur;}
  function rangeGp(m,w){var d=new Date();d.setHours(0,0,0,0);var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd-((Math.max(1,w)-1)*7));var c=d.toISOString().slice(0,10);return normHist(m.weeklyHistory).filter(function(h){return h.weekStart>=c}).reduce(function(s,x){return s+x.gp},0);}
  function riskScore(m){var cfg=model.config||{};var d=daysSince(m);var th=cfg.kickThresholdDays||14;var inact=Math.min(1,d/Math.max(1,th))*40;var r4=rangeGp(m,4);var p4=rangeGp(m,8)-r4;var trend=0;if(p4>0)trend=Math.max(0,1-r4/p4)*25;else if(r4===0)trend=25;var at=allTimeGp(m);var contrib=Math.max(0,20-Math.min(20,at/5000));var s=streak(m);var consist=Math.max(0,15-Math.min(15,s*3));var total=Math.round(Math.min(100,inact+trend+contrib+consist));if(m.status==='loa')return 0;if(m.status==='exempt')return Math.min(total,10);return total;}
  function guildName(id){var g=(model.guilds||[]).find(function(x){return x.id===id});return g?g.name:(id||'Unassigned');}
  function active(){return model.members.filter(function(m){return m.status!=='kicked'});}
  function wowBadge(cur,prev){if(!prev)return'';var pct=prev?Math.round((cur-prev)/Math.max(1,prev)*100):0;if(pct>0)return'<span class="idl-wow up">▲ +'+pct+'%</span>';if(pct<0)return'<span class="idl-wow down">▼ '+pct+'%</span>';return'<span class="idl-wow flat">— 0%</span>';}
  function gpForLevel(lv){return Math.round(500*lv*(lv+1)/2);}
  function levelFromGp(gp){var lv=0;while(gpForLevel(lv+1)<=gp)lv++;return lv;}
  function guildLevel(g){
    var bl=Array.isArray(g.bonusLevels)?g.bonusLevels:[];
    var total=bl.reduce(function(s,v){return s+(v||0)},0);
    return total;
  }

  function bonusTooltip(g){
    var bl=Array.isArray(g.bonusLevels)?g.bonusLevels:[];
    var total=bl.reduce(function(s,v){return s+(v||0)},0);
    if(!bl.length||total===0)return'<div style="color:#8b8fa3;font-size:11px;padding:4px">No bonus data. Sync with Firebase.</div>';
    var rows=bonusNames.map(function(name,i){
      var lv=bl[i]||0;
      return'<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:11px;color:#ccc"><span>'+safe(name)+'</span><span style="font-weight:700;color:#b794f6">Lv '+lv+'</span></div>';
    }).join('');
    return'<div style="font-size:10px;color:#8b8fa3;margin-bottom:4px">Total: <b style="color:#b794f6">'+total+'</b></div>'+rows;
  }

  function renderLastUpdated(){
    var el=document.getElementById('idlLastUpdated');if(!el)return;
    if(!_loadedAt){el.textContent='';return;}
    function upd(){
      var ago=Math.floor((Date.now()-_loadedAt)/1000);
      var txt=ago<60?ago+'s ago':ago<3600?Math.floor(ago/60)+'m ago':Math.floor(ago/3600)+'h ago';
      el.innerHTML='🕐 Last updated <b>'+txt+'</b>';
    }
    upd();
    setInterval(upd,15000);
  }

  function renderAlerts(){
    var el=document.getElementById('idlAlerts');if(!el)return;var items=[];
    var lastImport=(model.importLog||[]).filter(function(l){return l.importedBy!=='digest-auto'}).sort(function(a,b){return(b.date||0)-(a.date||0)})[0];
    if(!lastImport||Date.now()-(lastImport.date||0)>7*864e5){items.push('<div class="alert-item idl-alert-danger">⚠️ No GP import in 7+ days. Data may be stale.</div>');}
    var red=active().filter(function(m){return daysSince(m)>=(model.config.kickThresholdDays||14)});
    if(red.length>0){items.push('<div class="alert-item idl-alert-warn">🔴 '+red.length+' member'+(red.length>1?'s':'')+' inactive for '+(model.config.kickThresholdDays||14)+'+ days — review kick queue.</div>');}
    var loa=active().filter(function(m){return m.status==='loa'});
    if(loa.length>0){items.push('<div class="alert-item idl-alert-info">🏖️ '+loa.length+' member'+(loa.length>1?'s':'')+' on leave of absence.</div>');}
    var probation=active().filter(function(m){return m.status==='probation'});
    if(probation.length>0){items.push('<div class="alert-item idl-alert-info">🔰 '+probation.length+' member'+(probation.length>1?'s':'')+' on probation.</div>');}
    var curTotal=active().reduce(function(s,m){return s+weeklyGp(m)},0);
    var prevTotal=active().reduce(function(s,m){return s+prevWeeklyGp(m)},0);
    if(prevTotal>0&&curTotal<prevTotal*0.7){items.push('<div class="alert-item idl-alert-danger">📉 Weekly GP dropped >30% vs last week ('+fmtN(curTotal)+' vs '+fmtN(prevTotal)+')</div>');}
    if(items.length){el.innerHTML='<div class="idl-alert-card">'+items.join('')+'</div>';}else{el.innerHTML='';}
  }

  function renderKpis(){
    var el=document.getElementById('idlKpis');if(!el)return;
    var a=active();var cfg=model.config||{};
    var wGp=a.reduce(function(s,m){return s+weeklyGp(m)},0);
    var pGp=a.reduce(function(s,m){return s+prevWeeklyGp(m)},0);
    var tGp=a.reduce(function(s,m){return s+allTimeGp(m)},0);
    var wActive=a.filter(function(m){return weeklyGp(m)>0}).length;
    var avgWeekly=wActive?Math.round(wGp/wActive):0;
    var guildsCount=(model.guilds||[]).length||0;
    var kickCount=a.filter(function(m){return daysSince(m)>=(cfg.kickThresholdDays||14)&&m.status!=='loa'&&m.status!=='exempt'}).length;

    el.innerHTML=
      '<div class="idl-kpi idl-kpi-members"><div class="label">👥 Members</div><div class="val">'+a.length+'</div><div class="sub">'+guildsCount+' guild'+(guildsCount!==1?'s':'')+'</div></div>'
      +'<div class="idl-kpi idl-kpi-weekly"><div class="label">📊 Weekly GP</div><div class="val">'+fmtN(wGp)+'</div><div class="sub">from '+wActive+' active '+wowBadge(wGp,pGp)+'</div></div>'
      +'<div class="idl-kpi idl-kpi-alltime"><div class="label">💎 All-Time GP</div><div class="val">'+fmtN(tGp)+'</div></div>'
      +'<div class="idl-kpi idl-kpi-active"><div class="label">⚡ Active This Week</div><div class="val">'+wActive+'<span style="font-size:14px;font-weight:400;color:#8b8fa3">/'+a.length+'</span></div></div>'
      +'<div class="idl-kpi idl-kpi-avg"><div class="label">📈 Avg Weekly GP</div><div class="val">'+fmtN(avgWeekly)+'</div><div class="sub">per active member</div></div>'
      +'<div class="idl-kpi idl-kpi-kick"><div class="label">⚠️ Smart Kick Queue</div><div class="val">'+kickCount+'</div><div class="sub">'+(kickCount>0?'needs review':'all clear')+'</div></div>';
  }

  function renderGuildBreakdown(){
    var el=document.getElementById('idlGuildBreakdown');if(!el)return;
    var guilds=model.guilds||[];
    if(!guilds.length){el.innerHTML='<div style="color:#8b8fa3">No guilds configured yet.</div>';return;}
    el.innerHTML=guilds.map(function(g){
      var gm=active().filter(function(m){return m.guildId===g.id});
      var gWk=gm.reduce(function(s,m){return s+weeklyGp(m)},0);
      var gPrev=gm.reduce(function(s,m){return s+prevWeeklyGp(m)},0);
      var gAt=gm.reduce(function(s,m){return s+allTimeGp(m)},0);
      var gGreen=gm.filter(function(m){return statusColor(daysSince(m))==='green'}).length;
      var gRed=gm.filter(function(m){return statusColor(daysSince(m))==='red'}).length;
      var hp=gm.length?Math.round(gGreen/gm.length*100):0;
      var totalGp=g.totalGp||gAt;
      var level=guildLevel(g);
      return'<div class="idl-guild-card">'
        +'<h4><span>'+safe(g.name)+'</span><div class="idl-bonus-hover"><button class="idl-bonus-btn" type="button">⬆️ Bonuses</button><div class="idl-bonus-popup">'+bonusTooltip(g)+'</div></div></h4>'
        +'<div class="stat"><span>Level</span><span style="color:#b794f6;font-weight:700">'+level+'</span></div>'
        +'<div class="stat"><span>Members</span><span>'+gm.length+'</span></div>'
        +'<div class="stat"><span>Weekly GP</span><span>'+fmtN(gWk)+' '+wowBadge(gWk,gPrev)+'</span></div>'
        +'<div class="stat"><span>All-Time GP</span><span>'+fmtN(gAt)+'</span></div>'
        +'<div class="stat"><span>Health</span><span style="color:'+(hp>=80?'#4caf50':hp>=50?'#ff9800':'#f44336')+'">'+hp+'%</span></div>'
        +'<div class="stat"><span>Active/Inactive</span><span class="dim">'+gGreen+' / '+gRed+'</span></div>'
        +'</div>';
    }).join('');
  }

  function renderTopRisk(){
    var el=document.getElementById('idlTopRisk');if(!el)return;
    var a=active().filter(function(m){return m.status!=='loa'&&m.status!=='exempt'});
    var top5=a.map(function(m){return{name:m.name,guild:guildName(m.guildId),risk:riskScore(m),days:daysSince(m),wgp:weeklyGp(m)}}).sort(function(a,b){return b.risk-a.risk}).slice(0,5);
    if(!top5.length||top5[0].risk===0){el.innerHTML='<div style="color:#4caf50;font-size:13px">✅ No at-risk members. All members are in good standing.</div>';return;}
    el.innerHTML=top5.map(function(m){
      var c=m.risk>=70?'#f44336':m.risk>=40?'#ff9800':'#ffc107';
      return'<div class="idl-atrisk-row">'
        +'<div class="idl-atrisk-score" style="color:'+c+'">'+m.risk+'</div>'
        +'<div style="flex:1"><b>'+safe(m.name)+'</b> <span style="color:#8b8fa3;font-size:11px">'+safe(m.guild)+'</span></div>'
        +'<div style="font-size:12px;color:#8b8fa3">'+m.days+'d away · '+fmtN(m.wgp)+' GP/wk</div>'
        +'</div>';
    }).join('');
  }

  function renderRecent(){
    var el=document.getElementById('idlRecentActivity');if(!el)return;
    var events=[];
    (model.importLog||[]).slice(-5).reverse().forEach(function(l){events.push({t:l.date,html:'📥 Import: '+l.count+' members ('+safe(l.importedBy||'unknown')+')'});});

    model.members.filter(function(m){return m.status==='loa'}).forEach(function(m){events.push({t:m.loaStart||m.updatedAt,html:'🏖️ <b>'+safe(m.name)+'</b> on leave'+(m.loaReason?' — '+safe(m.loaReason):'')});});
    events.sort(function(a,b){return(b.t||0)-(a.t||0)});
    el.innerHTML=events.slice(0,15).map(function(e){var d=new Date(e.t);var ts=d.toLocaleDateString()+' '+d.toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'});return'<div style="padding:4px 0;border-bottom:1px solid #2a2f3a"><span style="color:#8b8fa3;font-size:11px">'+ts+'</span> '+e.html+'</div>'}).join('')||'<div style="color:#8b8fa3">No recent activity</div>';
  }

  function load(){
    fetch('/api/idleon/gp').then(function(r){if(!r.ok)throw new Error('Server error '+r.status);return r.json()}).then(function(d){
      if(!d.success)throw new Error(d.error||'Load failed');
      model.members=d.members||[];model.guilds=d.guilds||[];model.config=d.config||{};
      model.kickLog=d.kickLog||[];model.waitlist=d.waitlist||[];model.importLog=d.importLog||[];
      _loadedAt=Date.now();
      renderLastUpdated();renderAlerts();renderKpis();renderGuildBreakdown();renderTopRisk();renderRecent();
    }).catch(function(e){console.error('IdleOn load:',e)});
  }

  load();
})();
</script>`;
}


export function renderIdleonMembersTab(userTier) {
  const { membersCache } = _getState();
  const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
  const canWrite = TIER_LEVELS[userTier] >= TIER_LEVELS.admin;
  return `
<style>
  .idl-mem-row{transition:background .15s}
  .idl-mem-row:hover{background:#23232b!important}
  .idl-mem-row.risk-critical{background:rgba(244,67,54,.08);border-left:3px solid #f44336}
  .idl-mem-row.risk-high{background:rgba(255,152,0,.06);border-left:3px solid #ff9800}
  .idl-mem-row.risk-medium{background:rgba(255,193,7,.05);border-left:3px solid #ffc107}
  .idl-mem-row.risk-low{border-left:3px solid #4caf50}
  .idl-mem-row.status-loa{background:rgba(33,150,243,.06)}
  .idl-mem-row.status-kicked{background:rgba(96,96,96,.1);opacity:.6}
  .idl-mem-row.status-exempt{background:rgba(156,39,176,.05)}
  .idl-gp-val{font-weight:600;font-variant-numeric:tabular-nums}
  .idl-gp-val.gp-high{color:#4caf50}
  .idl-gp-val.gp-mid{color:#ffc107}
  .idl-gp-val.gp-low{color:#ff9800}
  .idl-gp-val.gp-zero{color:#f44336}
  .idl-streak-badge{display:inline-block;padding:2px 6px;border-radius:10px;font-size:11px;font-weight:600}
  .idl-streak-badge.streak-hot{background:rgba(255,152,0,.15);color:#ff9800}
  .idl-streak-badge.streak-warm{background:rgba(76,175,80,.12);color:#4caf50}
  .idl-streak-badge.streak-cold{background:rgba(139,143,163,.12);color:#8b8fa3}
  .idl-status-pill{display:inline-block;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
  .idl-status-pill.s-active{background:rgba(76,175,80,.12);color:#4caf50}
  .idl-status-pill.s-probation{background:rgba(255,193,7,.12);color:#ffc107}
  .idl-status-pill.s-watchlist{background:rgba(255,152,0,.12);color:#ff9800}
  .idl-status-pill.s-loa{background:rgba(33,150,243,.12);color:#2196f3}
  .idl-status-pill.s-exempt{background:rgba(156,39,176,.12);color:#9c27b0}
  .idl-status-pill.s-kicked{background:rgba(244,67,54,.12);color:#f44336}
  .idl-rank-badge{display:inline-block;font-size:13px;margin-right:2px;vertical-align:middle;line-height:1}
  #idlMemRows td{padding:8px 10px;font-size:13px}
  #idlMemRows th{padding:8px 10px;font-size:12px;text-transform:uppercase;letter-spacing:.5px;color:#8b8fa3}
  .idl-sortable{cursor:pointer;user-select:none;white-space:nowrap}
  .idl-sortable:hover{color:#b794f6}
  .idl-sort-arrow{font-size:10px;margin-left:3px;opacity:.5}
  .idl-sort-arrow.active{opacity:1;color:#7c3aed}
  .idl-tooltip-wrap{position:relative;display:inline-block;cursor:help}
  .idl-tooltip-wrap .idl-tooltip-text{visibility:hidden;background:#1a1a2e;color:#ccc;font-size:12px;padding:10px 14px;border-radius:8px;border:1px solid #3a3a42;position:absolute;z-index:100;top:125%;left:50%;transform:translateX(-50%);width:260px;box-shadow:0 4px 20px rgba(0,0,0,.5);line-height:1.5;font-weight:400;text-transform:none;letter-spacing:0}
  .idl-tooltip-wrap:hover .idl-tooltip-text{visibility:visible}
  .idl-copy-btn{cursor:pointer;opacity:.5;transition:opacity .15s;font-size:12px;vertical-align:middle;margin-left:4px}
  .idl-copy-btn:hover{opacity:1}
  .idl-risk-tooltip{position:relative;display:inline-block;cursor:help}
  .idl-risk-tooltip .idl-risk-detail{display:none;position:absolute;z-index:200;top:125%;left:50%;transform:translateX(-50%);background:#1a1a2e;border:1px solid #3a3a42;border-radius:8px;padding:10px;width:220px;box-shadow:0 4px 20px rgba(0,0,0,.5);font-size:11px;line-height:1.6}
  .idl-risk-tooltip:hover .idl-risk-detail{display:block}
  @media(max-width:768px){
    #idlProfileModal>div>div{margin:10px auto!important;padding:12px!important;max-width:100%!important}
    #idlProfileModal .idl-kpi{padding:8px!important}
    #idlProfileModal .idl-kpi .val{font-size:14px!important}
  }
</style>

<div class="card">
  <h2>👥 IdleOn Members
    <span class="idl-tooltip-wrap" style="font-size:14px;margin-left:8px">ℹ️
      <span class="idl-tooltip-text">
        <b>Status Guide:</b><br>
        <span style="color:#4caf50">● Active</span> — Contributing normally<br>
        <span style="color:#ffc107">● Probation</span> — New member under review<br>
        <span style="color:#ff9800">● Watchlist</span> — Flagged for low activity<br>
        <span style="color:#2196f3">● LOA</span> — On leave of absence<br>
        <span style="color:#9c27b0">● Exempt</span> — Excluded from kick rules<br>
        <span style="color:#f44336">● Kicked</span> — Removed from guild<br><br>
        <b>Rank Icons:</b><br>
        👑 Guild Leader &nbsp; ⭐ Gold Star<br>
        🥈 Silver Star &nbsp; 🥉 Bronze Star<br><br>
        <b>Risk Score Breakdown:</b><br>
        40% Inactivity &nbsp; 25% GP Trend<br>
        20% Contribution &nbsp; 15% Consistency
      </span>
    </span>
  </h2>
  <p style="color:#8b8fa3">Full member list with inactivity tracking, streaks, kick risk, and profile cards. Click column headers to sort.</p>
</div>

<!-- Member Comparison Tool -->
<div class="card">
  <h2>🔀 Compare Members</h2>
  <p style="color:#8b8fa3;font-size:12px;margin-bottom:8px">Select 2-5 members to compare side by side with a GP graph.</p>
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;position:relative">
    <div style="flex:1;min-width:250px;position:relative">
      <div id="idlCompareTags" style="display:flex;flex-wrap:wrap;gap:4px;margin-bottom:6px"></div>
      <input type="text" id="idlCompareInput" placeholder="Type a member name..." style="width:100%;margin:0" autocomplete="off">
      <div id="idlCompareDropdown" style="display:none;position:absolute;left:0;right:0;top:100%;z-index:500;background:#1e1e24;border:1px solid #3a3a42;border-radius:8px;max-height:180px;overflow-y:auto;margin-top:4px;box-shadow:0 4px 20px rgba(0,0,0,.5)"></div>
    </div>
    <button class="small" id="idlCompareBtn" style="margin:0;background:#7c3aed">🔀 Compare</button>
    <button class="small" id="idlCompareClear" style="margin:0;background:#555;display:none">✕ Clear</button>
  </div>
  <div id="idlCompareResult" style="margin-top:10px"></div>
</div>

<div class="card">
  <div style="display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin-bottom:10px">
    <input type="text" id="idlMemSearch" placeholder="Search by name..." style="flex:1;min-width:200px;margin:0">
    <select id="idlMemGuild" style="margin:0;max-width:180px"><option value="">All Guilds</option></select>
    <select id="idlMemStatus" style="margin:0;max-width:160px">
      <option value="">All Statuses</option><option value="active">Active</option><option value="probation">Probation</option>
      <option value="watchlist">Watchlist</option><option value="loa">On Leave</option><option value="exempt">Exempt</option>
      <option value="kicked">Kicked</option>
    </select>
    ${canWrite ? '<button class="small" id="idlMemSelectAll" style="margin:0;background:#555">☐ Select All</button>' : ''}
  </div>
  ${canWrite ? '<div id="idlBulkBar" style="display:none;padding:8px 12px;background:#2a2f3a;border:1px solid #3a3a42;border-radius:8px;margin-bottom:10px;gap:8px;flex-wrap:wrap;align-items:center"><span id="idlBulkCount" style="font-size:13px;color:#8b8fa3"></span><select id="idlBulkGuildFilter" style="margin:0;max-width:160px;font-size:12px"><option value="">All Selected</option></select><button class="small" id="idlBulkWatchlist" style="margin:0">👁 Watchlist</button><button class="small" id="idlBulkWarn" style="margin:0;background:#ff9800">⚠️ Send Warning</button><button class="small" id="idlBulkLoa" style="margin:0;background:#2196f3">🏖️ Mark LOA</button></div>' : ''}
  <div style="border:1px solid #3a3a42;border-radius:8px;background:#17171b;overflow-x:auto">
    <table style="margin:0;min-width:800px">
      <thead><tr>${canWrite?'<th style="width:30px"></th>':''}
        <th>#</th><th>Member</th><th>Guild</th>
        <th class="idl-sortable" data-sort="weekly">Weekly GP <span class="idl-sort-arrow" id="idlSortArrowWeekly">▼</span></th>
        <th class="idl-sortable" data-sort="alltime">All-Time GP <span class="idl-sort-arrow" id="idlSortArrowAlltime">▼</span></th>
        <th class="idl-sortable" data-sort="days">Days Away <span class="idl-sort-arrow" id="idlSortArrowDays">▼</span></th>
        <th class="idl-sortable" data-sort="streak">Streak <span class="idl-sort-arrow" id="idlSortArrowStreak">▼</span></th>
        <th class="idl-sortable" data-sort="risk">Risk <span class="idl-sort-arrow active" id="idlSortArrowRisk">▼</span></th>
        <th>Status</th>${canWrite?'<th>Actions</th>':''}
      </tr></thead>
      <tbody id="idlMemRows"></tbody>
    </table>
  </div>
  <div style="display:flex;gap:8px;align-items:center;justify-content:space-between;margin-top:10px;flex-wrap:wrap">
    <span id="idlMemInfo" style="font-size:12px;color:#8b8fa3"></span>
    <div style="display:flex;gap:8px;align-items:center">
      <button class="small" id="idlMemPrev" style="margin:0">← Prev</button>
      <span id="idlMemPage" style="font-size:12px;color:#8b8fa3"></span>
      <button class="small" id="idlMemNext" style="margin:0">Next →</button>
    </div>
  </div>
</div>

<!-- Member Profile Modal -->
<div id="idlProfileModal" style="display:none;position:fixed;top:0;left:0;right:0;bottom:0;background:rgba(0,0,0,0.7);z-index:1000;align-items:center;justify-content:center;overflow-y:auto">
  <div style="max-width:700px;width:90%;margin:auto;background:#1e1e24;border:1px solid #3a3a42;border-radius:12px;padding:20px;max-height:90vh;overflow-y:auto">
    <div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:16px">
      <h2 id="idlProfileName" style="margin:0"></h2>
      <button class="small" onclick="document.getElementById('idlProfileModal').style.display='none'" style="margin:0">✕ Close</button>
    </div>
    <div id="idlProfileBody"></div>
  </div>
</div>

<script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
<script>
(function(){
  var model={members:[],guilds:[],config:{},kickLog:[]};
  var canWrite=${canWrite?'true':'false'};
  // Restore from sessionStorage
  var saved=null;try{saved=JSON.parse(sessionStorage.getItem('idlMemState'));}catch(e){}
  var vs=saved||{page:1,ps:25,selected:{},sortCol:'risk',sortAsc:false,search:'',guild:'',status:''};
  function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function fmtN(n){return Number(n||0).toLocaleString();}
  function weekKey(){var d=new Date();d.setHours(0,0,0,0);var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return d.toISOString().slice(0,10);}
  function normHist(r){return(Array.isArray(r)?r:[]).map(function(h){return{weekStart:String(h.weekStart||'').slice(0,10),gp:Math.max(0,Number(h.gp||0))}}).filter(function(h){return /^\\d{4}-\\d{2}-\\d{2}$/.test(h.weekStart)&&Number.isFinite(h.gp)});}
  function allTimeGp(m){var h=normHist(m.weeklyHistory),t=h.reduce(function(s,x){return s+x.gp},0),b=Number(m.allTimeBaseline);return Number.isFinite(b)?Math.max(0,b)+t:Number(m.totalGp||0);}
  function rangeGp(m,w){var d=new Date();d.setHours(0,0,0,0);var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd-((Math.max(1,w)-1)*7));var c=d.toISOString().slice(0,10);return normHist(m.weeklyHistory).filter(function(h){return h.weekStart>=c}).reduce(function(s,x){return s+x.gp},0);}
  function wGp(m){var wk=weekKey();var cur=normHist(m.weeklyHistory).find(function(h){return h.weekStart===wk});var deltaGp=cur?cur.gp:0;var fbStart=Number(m._firebaseGpWeekStartTotal||0);var fbCur=Number(m._firebaseGpTotal||0);var fbWeekly=fbCur>fbStart?fbCur-fbStart:0;return Math.max(deltaGp,fbWeekly);}
  function daysSince(m){var h=normHist(m.weeklyHistory).filter(function(x){return x.gp>0});if(!h.length)return m.updatedAt?Math.floor((Date.now()-m.updatedAt)/864e5):999;h.sort(function(a,b){return b.weekStart.localeCompare(a.weekStart)});var d=new Date(h[0].weekStart+'T00:00:00Z');d.setDate(d.getDate()+6);return Math.max(0,Math.floor((Date.now()-d.getTime())/864e5));}
  function streak(m){var h=normHist(m.weeklyHistory);var map={};h.forEach(function(x){map[x.weekStart]=x.gp});var wk=new Date();wk.setHours(0,0,0,0);var wd=(wk.getDay()+6)%7;wk.setDate(wk.getDate()-wd);var cur=0;for(var i=0;i<156;i++){var k=wk.toISOString().slice(0,10);if((map[k]||0)>0)cur++;else break;wk.setDate(wk.getDate()-7);}return cur;}
  function bestStreak(m){var h=normHist(m.weeklyHistory);var map={};h.forEach(function(x){map[x.weekStart]=x.gp});var wk=new Date();wk.setHours(0,0,0,0);var wd=(wk.getDay()+6)%7;wk.setDate(wk.getDate()-wd);var best=0,cur=0;for(var i=0;i<156;i++){var k=wk.toISOString().slice(0,10);if((map[k]||0)>0){cur++;if(cur>best)best=cur;}else cur=0;wk.setDate(wk.getDate()-7);}return Math.max(best,Number(m.streakBest||0));}
  function riskScore(m){var cfg=model.config||{};var d=daysSince(m);var th=cfg.kickThresholdDays||14;var inact=Math.min(1,d/Math.max(1,th))*40;var r4=rangeGp(m,4);var p4=rangeGp(m,8)-r4;var trend=0;if(p4>0)trend=Math.max(0,1-r4/p4)*25;else if(r4===0)trend=25;var at=allTimeGp(m);var contrib=Math.max(0,20-Math.min(20,at/5000));var s=streak(m);var consist=Math.max(0,15-Math.min(15,s*3));var total=Math.round(Math.min(100,inact+trend+contrib+consist));if(m.status==='loa')return 0;if(m.status==='exempt')return Math.min(total,10);return total;}
  function riskBreakdown(m){var cfg=model.config||{};var d=daysSince(m);var th=cfg.kickThresholdDays||14;var inact=Math.round(Math.min(1,d/Math.max(1,th))*40);var r4=rangeGp(m,4);var p4=rangeGp(m,8)-r4;var trend=0;if(p4>0)trend=Math.round(Math.max(0,1-r4/p4)*25);else if(r4===0)trend=25;var at=allTimeGp(m);var contrib=Math.round(Math.max(0,20-Math.min(20,at/5000)));var s=streak(m);var consist=Math.round(Math.max(0,15-Math.min(15,s*3)));return{inact:inact,trend:trend,contrib:contrib,consist:consist};}
  function statusColor(d){var cfg=model.config||{};var w=cfg.warningDays||7,k=cfg.kickThresholdDays||14;if(d>=k)return'red';if(d>=w)return'orange';if(d>=Math.ceil(w/2))return'yellow';return'green';}
  function statusBadge(m){var s=m.status||'active';var map={active:'',probation:'🔰',watchlist:'👁',loa:'🏖️',exempt:'🛡️',kicked:'🚪'};return map[s]||'';}
  function guildName(id){var g=(model.guilds||[]).find(function(x){return x.id===id});return g?g.name:(id||'-');}
  function rankIcon(m){var r=Number(m._firebaseRank);if(r===0)return'<span class="idl-rank-badge" title="Guild Master">👑</span>';if(r===1)return'<span class="idl-rank-badge" title="Guild Officer">⭐</span>';if(r===2)return'<span class="idl-rank-badge" title="Gold Star">🥇</span>';if(r===3)return'<span class="idl-rank-badge" title="Silver Star">🥈</span>';if(r===4)return'<span class="idl-rank-badge" title="Bronze Star">🥉</span>';return'';}
  function riskBar(score,m){var color=score>=70?'#f44336':score>=40?'#ff9800':score>=20?'#ffc107':'#4caf50';var bd=riskBreakdown(m);return'<div class="idl-risk-tooltip"><div class="idl-risk-bar" style="width:60px"><div class="idl-risk-fill" style="width:'+Math.min(100,score)+'%;background:'+color+'"></div></div><span style="font-size:11px;margin-left:4px">'+score+'</span><div class="idl-risk-detail"><b>Risk Breakdown</b><br><span style="color:#ff9800">Inactivity:</span> '+bd.inact+'/40<br><span style="color:#ffc107">GP Trend:</span> '+bd.trend+'/25<br><span style="color:#2196f3">Contribution:</span> '+bd.contrib+'/20<br><span style="color:#9c27b0">Consistency:</span> '+bd.consist+'/15</div></div>';}
  function saveState(){try{sessionStorage.setItem('idlMemState',JSON.stringify({page:vs.page,ps:vs.ps,sortCol:vs.sortCol,sortAsc:vs.sortAsc,search:vs.search,guild:vs.guild,status:vs.status,selected:{}}));}catch(e){}}

  function updateSortArrows(){
    ['Weekly','Alltime','Days','Streak','Risk'].forEach(function(k){
      var el=document.getElementById('idlSortArrow'+k);
      if(el){el.className='idl-sort-arrow'+(vs.sortCol===k.toLowerCase()?(' active'):'');el.textContent=vs.sortCol===k.toLowerCase()?(vs.sortAsc?'▲':'▼'):'▼';}
    });
  }

  function getFiltered(){
    var search=vs.search||'';
    var gf=vs.guild||'';
    var sf=vs.status||'';
    var sort=vs.sortCol;
    var asc=vs.sortAsc;
    var list=model.members.filter(function(m){
      if(search&&m.name.toLowerCase().indexOf(search.toLowerCase())===-1)return false;
      if(gf&&m.guildId!==gf)return false;
      if(sf){if(sf==='active')return!m.status||m.status==='active';return m.status===sf;}
      return m.status!=='kicked';
    });
    var dir=asc?1:-1;
    list.sort(function(a,b){
      if(sort==='risk')return dir*(riskScore(b)-riskScore(a));
      if(sort==='weekly')return dir*(wGp(b)-wGp(a));
      if(sort==='alltime')return dir*(allTimeGp(b)-allTimeGp(a));
      if(sort==='days')return dir*(daysSince(b)-daysSince(a));
      if(sort==='streak')return dir*(streak(b)-streak(a));
      return a.name.localeCompare(b.name);
    });
    return list;
  }

  function renderRows(){
    var list=getFiltered();var total=list.length;
    var pages=Math.max(1,Math.ceil(total/vs.ps));if(vs.page>pages)vs.page=pages;
    var start=(vs.page-1)*vs.ps;var paged=list.slice(start,start+vs.ps);
    var selCount=Object.keys(vs.selected).filter(function(k){return vs.selected[k]}).length;
    var bulkBar=document.getElementById('idlBulkBar');
    if(bulkBar){bulkBar.style.display=selCount>0?'flex':'none';var bc=document.getElementById('idlBulkCount');if(bc)bc.textContent=selCount+' selected';}
    // Populate bulk guild filter
    var bgf=document.getElementById('idlBulkGuildFilter');
    if(bgf&&bgf.options.length<=1){(model.guilds||[]).forEach(function(g){var o=document.createElement('option');o.value=g.id;o.textContent=g.name;bgf.appendChild(o);});}
    document.getElementById('idlMemRows').innerHTML=paged.map(function(m,i){
      var d=daysSince(m);var sc=statusColor(d);var risk=riskScore(m);var st=streak(m);
      var checked=vs.selected[m.name]?'checked':'';
      var dn=safe(m.name);
      var riskClass=risk>=70?'risk-critical':risk>=40?'risk-high':risk>=20?'risk-medium':'risk-low';
      if(m.status==='loa')riskClass='status-loa';
      if(m.status==='kicked')riskClass='status-kicked';
      if(m.status==='exempt')riskClass='status-exempt';
      var wg=wGp(m);var gpClass=wg>=5000?'gp-high':wg>=2000?'gp-mid':wg>0?'gp-low':'gp-zero';
      var atGp=allTimeGp(m);var atClass=atGp>=50000?'gp-high':atGp>=20000?'gp-mid':atGp>0?'gp-low':'gp-zero';
      var stClass=st>=8?'streak-hot':st>=3?'streak-warm':'streak-cold';
      var sSlug=m.status||'active';
      var statusPill='<span class="idl-status-pill s-'+sSlug+'">'+statusBadge(m)+' '+sSlug+'</span>';
      return'<tr class="idl-mem-row '+riskClass+'" style="cursor:pointer" data-profile="'+dn+'">'
        +(canWrite?'<td><input type="checkbox" '+checked+' data-sel="'+dn+'"></td>':'')
        +'<td>'+(start+i+1)+'</td>'
        +'<td><div style="display:inline-flex;align-items:center;gap:3px">'+rankIcon(m)+'<b class="idl-name-copy" data-copyname="'+dn+'" title="Click to copy name" style="cursor:pointer">'+dn+'</b>'+(m.discordId?' <span style="font-size:10px;color:#7289da">🔗</span>':'')+(m.status==='loa'?' <span style="font-size:10px;color:#2196f3;font-weight:600" title="On Leave of Absence'+(m.loaReason?' — '+safe(m.loaReason):'')+'">LOA</span>':'')+'</div></td>'
        +'<td>'+safe(guildName(m.guildId))+'</td>'
        +'<td><span class="idl-gp-val '+gpClass+'">'+fmtN(wg)+'</span></td>'
        +'<td><span class="idl-gp-val '+atClass+'">'+fmtN(atGp)+'</span></td>'
        +'<td><span class="idl-status-'+sc+'">●</span> '+d+'d</td>'
        +'<td><span class="idl-streak-badge '+stClass+'">'+st+'wk</span></td>'
        +'<td>'+riskBar(risk,m)+'</td>'
        +'<td>'+statusPill+'</td>'
        +(canWrite?'<td style="white-space:nowrap"><button class="small" data-qa="'+dn+'" data-action="watchlist" style="margin:0;padding:2px 6px;font-size:11px" title="Toggle Watchlist">👁</button> <button class="small" data-qa="'+dn+'" data-action="note" style="margin:0;padding:2px 6px;font-size:11px" title="Add Note">📝</button></td>':'')
        +'</tr>';
    }).join('')||'<tr><td colspan="'+(canWrite?'11':'9')+'" style="text-align:center;color:#8b8fa3">No members found</td></tr>';
    document.getElementById('idlMemInfo').textContent='Showing '+(start+1)+'-'+Math.min(start+vs.ps,total)+' of '+total;
    document.getElementById('idlMemPage').textContent='Page '+vs.page+' / '+pages;
    document.getElementById('idlMemPrev').disabled=vs.page<=1;
    document.getElementById('idlMemNext').disabled=vs.page>=pages;
  }

  function populateGuildFilter(){
    var sel=document.getElementById('idlMemGuild');if(!sel)return;
    var current=sel.value;
    while(sel.options.length>1)sel.remove(1);
    (model.guilds||[]).forEach(function(g){
      var opt=document.createElement('option');opt.value=g.id;opt.textContent=g.name;sel.appendChild(opt);
    });
    if(vs.guild)sel.value=vs.guild;
  }

  window._idlToggleSel=function(name,checked){vs.selected[name]=checked;renderRows();};
  // Event delegation for member table
  document.getElementById('idlMemRows').addEventListener('click',function(e){
    // Copy name on click
    var nameEl=e.target.closest('[data-copyname]');
    if(nameEl){e.stopPropagation();var orig=nameEl.textContent;navigator.clipboard.writeText(nameEl.dataset.copyname).then(function(){nameEl.textContent='Copied!';setTimeout(function(){nameEl.textContent=orig},800)}).catch(function(){});return;}
    var btn=e.target.closest('[data-qa]');
    if(btn){e.stopPropagation();window._idlQuickAction(btn.dataset.qa,btn.dataset.action);return;}
    if(e.target.tagName==='INPUT')return;
    var tr=e.target.closest('tr[data-profile]');
    if(tr){
      if(e.ctrlKey||e.metaKey){
        var name=tr.dataset.profile;
        vs.selected[name]=!vs.selected[name];
        renderRows();
        return;
      }
      window._idlOpenProfile(tr.dataset.profile);
    }
  });
  document.getElementById('idlMemRows').addEventListener('change',function(e){
    if(e.target.dataset.sel!=null)window._idlToggleSel(e.target.dataset.sel,e.target.checked);
  });
  // Event delegation for profile modal actions
  document.getElementById('idlProfileBody').addEventListener('click',function(e){
    var btn=e.target.closest('[data-pqa]');
    if(btn)window._idlQuickAction(btn.dataset.pqa,btn.dataset.action);
  });
  window._idlOpenProfile=function(name){
    var m=model.members.find(function(x){return x.name===name});if(!m)return;
    var d=daysSince(m);var sc=riskScore(m);var st=streak(m);var bs=bestStreak(m);var bd=riskBreakdown(m);
    var hist=normHist(m.weeklyHistory).sort(function(a,b){return a.weekStart.localeCompare(b.weekStart)});
    var atGp=allTimeGp(m);

    // Profile header
    document.getElementById('idlProfileName').innerHTML='<div style="display:flex;align-items:center;gap:10px;flex-wrap:wrap"><span data-copyname="'+safe(m.name)+'" title="Click to copy name" style="cursor:pointer;font-size:20px;font-weight:700">'+rankIcon(m)+safe(m.name)+'</span><span class="idl-status-pill s-'+(m.status||'active')+'" style="font-size:12px">'+statusBadge(m)+' '+(m.status||'active')+'</span><span style="font-size:13px;color:#8b8fa3">'+safe(guildName(m.guildId))+'</span>'+(m.discordId?'<span style="font-size:11px;color:#7289da">🔗 Linked</span>':'')+'</div>';
    document.getElementById('idlProfileName').querySelector('[data-copyname]').addEventListener('click',function(){var el=this;var orig=el.innerHTML;navigator.clipboard.writeText(el.dataset.copyname).then(function(){el.textContent='Copied!';setTimeout(function(){el.innerHTML=orig},800)}).catch(function(){});});

    var html='';

    // KPI grid — 2 rows, key stats
    html+='<div style="display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-bottom:16px">';
    html+='<div class="idl-kpi"><div class="label">Weekly GP</div><div class="val" style="font-size:18px;color:'+(wGp(m)>=5000?'#4caf50':wGp(m)>=2000?'#ffc107':wGp(m)>0?'#ff9800':'#f44336')+'">'+fmtN(wGp(m))+'</div></div>';
    html+='<div class="idl-kpi"><div class="label">All-Time GP</div><div class="val" style="font-size:18px;color:#b794f6">'+fmtN(atGp)+'</div></div>';
    html+='<div class="idl-kpi"><div class="label">Days Away</div><div class="val" style="font-size:18px"><span class="idl-status-'+statusColor(d)+'">●</span> '+d+'</div></div>';
    html+='<div class="idl-kpi"><div class="label">Risk Score</div><div class="val" style="font-size:18px;color:'+(sc>=70?'#f44336':sc>=40?'#ff9800':sc>=20?'#ffc107':'#4caf50')+'">'+sc+'<span style="font-size:12px;color:#8b8fa3">/100</span></div></div>';
    html+='<div class="idl-kpi"><div class="label">Streak</div><div class="val" style="font-size:18px">'+st+'<span style="font-size:12px;color:#8b8fa3">wk</span></div></div>';
    html+='<div class="idl-kpi"><div class="label">Best Streak</div><div class="val" style="font-size:18px">'+bs+'<span style="font-size:12px;color:#8b8fa3">wk</span></div></div>';
    html+='<div class="idl-kpi"><div class="label">Risk: Inactivity</div><div class="val" style="font-size:14px">'+bd.inact+'<span style="font-size:11px;color:#8b8fa3">/40</span></div></div>';
    html+='<div class="idl-kpi"><div class="label">Risk: Trend</div><div class="val" style="font-size:14px">'+bd.trend+'<span style="font-size:11px;color:#8b8fa3">/25</span></div></div>';
    html+='</div>';

    // GP over time graph — adaptive
    if(hist.length>=1){
      var showCumulative=hist.length<2;
      html+='<div style="background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:12px;margin-bottom:12px">';
      html+='<div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">';
      html+='<div style="font-size:12px;color:#8b8fa3;font-weight:600" id="idlProfileChartTitle">\ud83d\udcc8 '+(showCumulative?'All-Time GP Progression':'Weekly GP Performance')+'</div>';
      if(hist.length>=2){
        html+='<div style="display:flex;gap:4px"><button class="small idl-prof-tab" data-proftab="weekly" style="margin:0;background:#7c3aed;font-size:10px;padding:2px 8px">Weekly</button><button class="small idl-prof-tab" data-proftab="alltime" style="margin:0;background:#3a3a42;font-size:10px;padding:2px 8px">All-Time</button></div>';
      }
      html+='</div>';
      html+='<div style="height:200px"><canvas id="idlProfileChart" style="width:100%;height:100%"></canvas></div></div>';
    }

    if(m.loaReason){html+='<div style="margin-bottom:12px;font-size:13px;padding:8px 12px;background:#2196f311;border:1px solid #2196f333;border-radius:8px">🏖️ <b>LOA Reason:</b> '+safe(m.loaReason)+'</div>';}

    // Notes
    var notes=Array.isArray(m.notes)?m.notes:[];
    html+='<div style="margin-bottom:8px"><b>📝 Notes</b> <span style="color:#8b8fa3;font-size:12px">('+notes.length+')</span></div>';
    if(notes.length){html+='<div style="max-height:120px;overflow-y:auto;margin-bottom:12px;background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:8px">'+notes.map(function(n){return'<div style="padding:4px 0;border-bottom:1px solid #2a2f3a;font-size:12px"><span style="color:#8b8fa3">'+new Date(n.date).toLocaleDateString()+' — '+safe(n.author||'?')+'</span><br>'+safe(n.text)+'</div>'}).join('')+'</div>';}

    // Timeline
    var tl=Array.isArray(m.timeline)?m.timeline:[];
    if(tl.length){
      html+='<div style="margin-bottom:8px"><b>📜 Timeline</b></div><div style="max-height:150px;overflow-y:auto;background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:8px">';
      tl.slice().sort(function(a,b){return(b.date||0)-(a.date||0)}).slice(0,20).forEach(function(e){
        html+='<div style="padding:3px 0;border-bottom:1px solid #2a2f3a;font-size:12px"><span style="color:#8b8fa3">'+new Date(e.date).toLocaleDateString()+'</span> '+safe(e.event)+(e.details?' — '+safe(e.details):'')+'</div>';
      });
      html+='</div>';
    }

    // Actions
    if(canWrite){
      html+='<div style="display:flex;gap:8px;flex-wrap:wrap;margin-top:16px;padding-top:12px;border-top:1px solid #3a3a42">';
      html+='<button class="small" data-pqa="'+safe(m.name)+'" data-action="note" style="margin:0">📝 Add Note</button>';
      html+='<button class="small" data-pqa="'+safe(m.name)+'" data-action="watchlist" style="margin:0">👁 Watchlist</button>';
      html+='<button class="small" data-pqa="'+safe(m.name)+'" data-action="loa" style="margin:0;background:#2196f3">'+(m.status==='loa'?'✅ Remove LOA':'🏖️ Mark LOA')+'</button>';
      html+='<button class="small" data-pqa="'+safe(m.name)+'" data-action="exempt" style="margin:0;background:#9c27b0">🛡️ Exempt</button>';
      html+='</div>';
    }

    document.getElementById('idlProfileBody').innerHTML=html;
    var modal=document.getElementById('idlProfileModal');
    modal.style.display='flex';
    modal.scrollTop=0;

    // Render adaptive GP chart
    if(hist.length>=1&&typeof Chart!=='undefined'){
      var _profChart=null;
      var showCumulative=hist.length<2;
      function renderProfileChart(mode){
        var ctx=document.getElementById('idlProfileChart');if(!ctx)return;
        if(_profChart){_profChart.destroy();_profChart=null;}
        var titleEl=document.getElementById('idlProfileChartTitle');
        var body=document.getElementById('idlProfileBody');
        if(body){body.querySelectorAll('.idl-prof-tab').forEach(function(b){b.style.background=b.dataset.proftab===mode?'#7c3aed':'#3a3a42';});}
        var dataset;
        if(mode==='alltime'){
          if(titleEl)titleEl.textContent='\ud83d\udcc8 All-Time GP Progression';
          var running=Number(m.allTimeBaseline)||0;
          var cumData=hist.map(function(h){running+=h.gp;return running;});
          dataset={label:'All-Time GP',data:cumData,borderColor:'#b794f6',backgroundColor:'rgba(183,148,246,0.1)',fill:true,tension:0.3,pointBackgroundColor:'#b794f6',pointRadius:Math.min(4,Math.max(1,60/hist.length)),pointHoverRadius:6};
        } else {
          if(titleEl)titleEl.textContent='\ud83d\udcc8 Weekly GP Performance';
          dataset={label:'GP per Week',data:hist.map(function(h){return h.gp}),borderColor:'#7c3aed',backgroundColor:'rgba(124,58,237,0.1)',fill:true,tension:0.3,pointBackgroundColor:'#7c3aed',pointRadius:Math.min(4,Math.max(1,60/hist.length)),pointHoverRadius:6};
        }
        _profChart=new Chart(ctx,{type:'line',data:{labels:hist.map(function(h){
          // Adaptive time label based on data span
          var spanW=hist.length;
          if(spanW<=4) return new Date(h.weekStart).toLocaleDateString('en-US',{month:'short',day:'numeric'});
          if(spanW<=12) return h.weekStart.slice(5);
          return new Date(h.weekStart).toLocaleDateString('en-US',{month:'short'});
        }),datasets:[dataset]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:function(c){return c.parsed.y.toLocaleString()+' GP'}}}},scales:{x:{ticks:{color:'#8b8fa3',font:{size:10},maxTicksLimit:20},grid:{color:'#2a2f3a'}},y:{beginAtZero:mode!=='alltime',ticks:{color:'#8b8fa3',callback:function(v){return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000)+'k':v}},grid:{color:'#2a2f3a'}}}}});
      }
      setTimeout(function(){
        renderProfileChart(showCumulative?'alltime':'weekly');
        document.getElementById('idlProfileBody').querySelectorAll('.idl-prof-tab').forEach(function(btn){
          btn.addEventListener('click',function(){renderProfileChart(btn.dataset.proftab);});
        });
      },100);
    }
  };
  window._idlQuickAction=function(name,action){
    if(action==='note'){var text=prompt('Add note for '+name+':');if(!text)return;
      fetch('/api/idleon/member/note',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,text:text})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Note added');load();}else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
    }else if(action==='loa'){var mem=model.members.find(function(x){return x.name===name});
      if(mem&&mem.status==='loa'){if(!confirm('Remove LOA for '+name+'? They will be set back to active.'))return;
        fetch('/api/idleon/member/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,status:'active'})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('LOA removed — now active');load();}else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
      }else{var reason=prompt('LOA reason (optional):');var days=prompt('LOA duration in days (default 14):','14');
      fetch('/api/idleon/member/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,status:'loa',loaReason:reason||'',loaDays:Number(days)||14})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Marked on leave');load();}else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});}
    }else{
      var m=model.members.find(function(x){return x.name===name});
      var newStatus=(m&&m.status===action)?'active':action;
      fetch('/api/idleon/member/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,status:newStatus})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Status updated to '+newStatus);load();}else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
    }
  };
  window.idlBulkAction=function(action){
    var names=Object.keys(vs.selected).filter(function(k){return vs.selected[k]});
    // Apply bulk guild filter
    var bgf=document.getElementById('idlBulkGuildFilter');
    if(bgf&&bgf.value){var gid=bgf.value;names=names.filter(function(n){var m=model.members.find(function(x){return x.name===n});return m&&m.guildId===gid;});}
    if(!names.length)return alert('Select members first');
    if(action==='warn'&&!confirm('Send warning DMs to '+names.length+' members?'))return;
    if(action==='warn'){
      fetch('/api/idleon/send-warnings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:names})}).then(function(r){return r.json()}).then(function(d){alert(d.success?'Warnings sent: '+d.sent:'Failed: '+(d.error||'unknown'));load();}).catch(function(e){alert(e.message)});
      return;
    }
    fetch('/api/idleon/bulk-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:names,action:action})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Updated '+d.updated+' members');vs.selected={};load();}else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  };

  // Compare members — autocomplete + graph
  var _compareNames=[];
  var _compareCache=null; // Cache last compare result for instant removal
  var _compareDD=document.getElementById('idlCompareDropdown');
  var _compareInput=document.getElementById('idlCompareInput');
  var _compareTags=document.getElementById('idlCompareTags');
  var _compareClear=document.getElementById('idlCompareClear');

  function renderCompareTags(){
    _compareTags.innerHTML=_compareNames.map(function(n,i){
      return'<span style="display:inline-flex;align-items:center;gap:4px;background:#7c3aed22;border:1px solid #7c3aed;color:#b794f6;padding:2px 8px;border-radius:12px;font-size:12px">'+safe(n)+'<span style="cursor:pointer;font-weight:700" data-rmcmp="'+i+'">\u00d7</span></span>';
    }).join('');
    _compareClear.style.display=_compareNames.length?'':'none';
  }
  _compareTags.addEventListener('click',function(e){
    var rm=e.target.dataset.rmcmp;if(rm==null)return;
    _compareNames.splice(Number(rm),1);renderCompareTags();
    // Smart reload: use cached data if available
    if(_compareNames.length>=2&&_compareCache){
      var filtered=_compareCache.filter(function(m){return _compareNames.indexOf(m.name)!==-1});
      if(filtered.length>=2){renderCompareResult(filtered);return;}
    }
    if(_compareNames.length>=2){document.getElementById('idlCompareBtn').click();}
    else{document.getElementById('idlCompareResult').innerHTML='';}
  });
  _compareClear.addEventListener('click',function(){_compareNames=[];_compareCache=null;renderCompareTags();document.getElementById('idlCompareResult').innerHTML='';});

  _compareInput.addEventListener('input',function(){
    var q=this.value.toLowerCase().trim();
    if(!q||_compareNames.length>=5){_compareDD.style.display='none';return;}
    var matches=model.members.filter(function(m){return m.status!=='kicked'&&m.name.toLowerCase().indexOf(q)!==-1&&_compareNames.indexOf(m.name)===-1}).slice(0,8);
    if(!matches.length){_compareDD.style.display='none';return;}
    _compareDD.innerHTML=matches.map(function(m){
      return'<div data-cmpname="'+safe(m.name)+'" style="padding:8px 12px;cursor:pointer;font-size:13px;border-bottom:1px solid #2a2f3a;color:#ccc;transition:background .1s"><b>'+safe(m.name)+'</b> <span style="color:#8b8fa3;font-size:11px">'+safe(guildName(m.guildId))+'</span></div>';
    }).join('');
    _compareDD.style.display='block';
  });

  _compareDD.addEventListener('click',function(e){
    var item=e.target.closest('[data-cmpname]');if(!item)return;
    var name=item.dataset.cmpname;
    if(_compareNames.indexOf(name)===-1&&_compareNames.length<5){_compareNames.push(name);}
    _compareInput.value='';_compareDD.style.display='none';renderCompareTags();
  });

  _compareInput.addEventListener('keydown',function(e){
    if(e.key==='Escape'){_compareDD.style.display='none';}
  });
  document.addEventListener('click',function(e){if(!e.target.closest('#idlCompareDropdown')&&e.target!==_compareInput)_compareDD.style.display='none';});

  // Shared compare result renderer (used by both fetch and cached paths)
  var _cmpChartInst=null;
  function renderCompareResult(ms){
    var el=document.getElementById('idlCompareResult');if(!el)return;
    _compareCache=ms;
    if(ms.length<2){el.innerHTML='<span style="color:#ff9800">Need at least 2 found members.</span>';return;}
    var html='<div style="overflow-x:auto;margin-bottom:16px"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="border-bottom:2px solid #3a3a42"><th style="padding:6px 8px"></th>';
    ms.forEach(function(m){html+='<th style="padding:6px 8px;text-align:center;color:#b794f6">'+safe(m.name)+'</th>';});
    html+='</tr></thead><tbody>';
    var rows=[['Weekly GP',function(m){return fmtN(m.weeklyGp)}],['All-Time GP',function(m){return fmtN(m.allTimeGp)}],['Days Away',function(m){return m.daysAway}],['Streak',function(m){return m.streak+'wk'}],['Risk',function(m){return m.risk}],['Status',function(m){return m.status}]];
    rows.forEach(function(row){html+='<tr style="border-bottom:1px solid #2a2f3a"><td style="padding:4px 8px;color:#8b8fa3;font-weight:600">'+row[0]+'</td>';ms.forEach(function(m){html+='<td style="padding:4px 8px;text-align:center">'+row[1](m)+'</td>';});html+='</tr>';});
    html+='</tbody></table></div>';
    var colors=['#7c3aed','#2196f3','#ff9800','#4caf50','#e91e63'];
    var allWeeks={};
    ms.forEach(function(m){(m.weeklyHistory||[]).forEach(function(h){allWeeks[h.weekStart]=true;});});
    var labels=Object.keys(allWeeks).sort();
    if(labels.length>1){
      html+='<div style="display:flex;gap:6px;margin-bottom:8px"><button class="small idl-cmp-tab" data-cmptab="weekly" style="margin:0;background:#7c3aed;font-size:11px;padding:4px 10px">Weekly GP</button><button class="small idl-cmp-tab" data-cmptab="alltime" style="margin:0;background:#3a3a42;font-size:11px;padding:4px 10px">All-Time GP</button></div>';
      html+='<div style="background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:12px"><div id="idlCmpChartTitle" style="font-size:12px;color:#8b8fa3;margin-bottom:6px;font-weight:600">\ud83d\udcc8 Weekly GP Comparison</div><div style="height:220px"><canvas id="idlCompareChart" style="width:100%;height:100%"></canvas></div></div>';
      // GP progression over time
      html+='<div style="background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:12px;margin-top:8px"><div style="font-size:12px;color:#8b8fa3;margin-bottom:6px;font-weight:600">\ud83d\udcc8 GP Progression Over Time</div><div style="height:220px"><canvas id="idlCompareProgChart" style="width:100%;height:100%"></canvas></div></div>';
    }
    el.innerHTML=html;
    if(_cmpChartInst){try{_cmpChartInst.destroy();}catch(e){}_cmpChartInst=null;}
    var _cmpTab='weekly';
    function renderCmpChart(tab){
      _cmpTab=tab||'weekly';
      el.querySelectorAll('.idl-cmp-tab').forEach(function(b){b.style.background=b.dataset.cmptab===_cmpTab?'#7c3aed':'#3a3a42';});
      var titleEl=document.getElementById('idlCmpChartTitle');
      if(titleEl)titleEl.textContent=_cmpTab==='alltime'?'\ud83d\udcc8 All-Time GP Progression':'\ud83d\udcc8 Weekly GP Comparison';
      var ctx=document.getElementById('idlCompareChart');if(!ctx||typeof Chart==='undefined')return;
      if(_cmpChartInst){try{_cmpChartInst.destroy();}catch(e){}_cmpChartInst=null;}
      var datasets;
      if(_cmpTab==='alltime'){
        datasets=ms.map(function(m,i){
          var hist=(m.weeklyHistory||[]).slice().sort(function(a,b){return a.weekStart.localeCompare(b.weekStart)});
          var cumMap={};var running=Number(m.allTimeBaseline)||0;
          hist.forEach(function(h){running+=h.gp;cumMap[h.weekStart]=running;});
          return{label:m.name,data:labels.map(function(w){
            var v=cumMap[w];if(v!=null)return v;
            var last=0;for(var j=0;j<labels.length;j++){if(labels[j]>w)break;if(cumMap[labels[j]]!=null)last=cumMap[labels[j]];}return last;
          }),borderColor:colors[i%colors.length],backgroundColor:'transparent',tension:0.3,pointRadius:2,pointHoverRadius:5,borderWidth:2,fill:false};
        });
      } else {
        datasets=ms.map(function(m,i){
          var map={};(m.weeklyHistory||[]).forEach(function(h){map[h.weekStart]=h.gp;});
          return{label:m.name,data:labels.map(function(w){return map[w]||0;}),borderColor:colors[i%colors.length],backgroundColor:'transparent',tension:0.3,pointRadius:3,pointHoverRadius:5,borderWidth:2};
        });
      }
      _cmpChartInst=new Chart(ctx,{type:'line',data:{labels:labels.map(function(l){return l.slice(5)}),datasets:datasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#ccc',font:{size:11}}}},scales:{x:{ticks:{color:'#8b8fa3',font:{size:10}},grid:{color:'#2a2f3a'}},y:{beginAtZero:true,ticks:{color:'#8b8fa3',callback:function(v){return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000)+'k':v}},grid:{color:'#2a2f3a'}}}}});
    }
    el.querySelectorAll('.idl-cmp-tab').forEach(function(btn){btn.addEventListener('click',function(){renderCmpChart(btn.dataset.cmptab);});});
    // GP progression chart: cumulative for all members with adaptive time scale
    if(labels.length>1&&typeof Chart!=='undefined'){
      setTimeout(function(){
        renderCmpChart('weekly');
        var progCtx=document.getElementById('idlCompareProgChart');
        if(!progCtx)return;
        var progDatasets=ms.map(function(m,i){
          var hist=(m.weeklyHistory||[]).slice().sort(function(a,b){return a.weekStart.localeCompare(b.weekStart)});
          var cumMap={};var running=Number(m.allTimeBaseline)||0;
          hist.forEach(function(h){running+=h.gp;cumMap[h.weekStart]=running;});
          return{label:m.name,data:labels.map(function(w){
            var v=cumMap[w];if(v!=null)return v;
            var last=0;for(var j=0;j<labels.length;j++){if(labels[j]>w)break;if(cumMap[labels[j]]!=null)last=cumMap[labels[j]];}return last;
          }),borderColor:colors[i%colors.length],backgroundColor:colors[i%colors.length]+'18',tension:0.4,pointRadius:2,pointHoverRadius:5,borderWidth:2,fill:true};
        });
        // Adaptive time label: show day-level if < 4 weeks, else week labels
        var spanDays=labels.length>1?Math.round((new Date(labels[labels.length-1])-new Date(labels[0]))/864e5):0;
        var progLabels=spanDays<28?labels.map(function(l){return new Date(l).toLocaleDateString('en-US',{month:'short',day:'numeric'})}):labels.map(function(l){return l.slice(5)});
        new Chart(progCtx,{type:'line',data:{labels:progLabels,datasets:progDatasets},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#ccc',font:{size:11}}},title:{display:true,text:'Cumulative GP Over Time',color:'#8b8fa3',font:{size:11}}},scales:{x:{ticks:{color:'#8b8fa3',font:{size:10},maxRotation:45},grid:{color:'#2a2f3a'}},y:{beginAtZero:true,ticks:{color:'#8b8fa3',callback:function(v){return v>=1e6?(v/1e6).toFixed(1)+'M':v>=1000?(v/1000)+'k':v}},grid:{color:'#2a2f3a'}}}}});
      },150);
    }
  }

  document.getElementById('idlCompareBtn').addEventListener('click',function(){
    // If no names typed in compare input, use checkbox-selected members
    if(!_compareNames.length){
      var selNames=Object.keys(vs.selected).filter(function(k){return vs.selected[k]});
      if(selNames.length>=2){
        _compareNames=selNames.slice(0,5);
        renderCompareTags();
      }
    }
    if(_compareNames.length<2)return alert('Select at least 2 members to compare');
    var el=document.getElementById('idlCompareResult');
    el.innerHTML='<span style="color:#ff9800">Loading...</span>';
    fetch('/api/idleon/compare?names='+encodeURIComponent(_compareNames.join(','))).then(function(r){return r.json()}).then(function(d){
      if(!d.success){el.innerHTML='<span style="color:#f44336">\u274c '+(d.error||'Failed')+'</span>';return;}
      var ms=d.members.filter(function(m){return m.found});
      _compareCache=ms;
      renderCompareResult(ms);
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">\u274c '+e.message+'</span>';});
  });

  function load(){
    fetch('/api/idleon/gp').then(function(r){if(!r.ok)throw new Error('Server error '+r.status);return r.json()}).then(function(d){
      if(!d.success)throw new Error(d.error||'Load failed');
      model.members=d.members||[];model.guilds=d.guilds||[];model.config=d.config||{};model.kickLog=d.kickLog||[];
      populateGuildFilter();renderRows();
      // Restore filter inputs from state
      if(vs.search)document.getElementById('idlMemSearch').value=vs.search;
      if(vs.guild)document.getElementById('idlMemGuild').value=vs.guild;
      if(vs.status)document.getElementById('idlMemStatus').value=vs.status;
      updateSortArrows();
    }).catch(function(e){console.error('IdleOn members load:',e)});
  }

  document.getElementById('idlMemSearch').addEventListener('input',function(){vs.page=1;vs.search=this.value;saveState();renderRows();});
  ['idlMemGuild','idlMemStatus'].forEach(function(id){
    var el=document.getElementById(id);if(el)el.addEventListener('change',function(){vs.page=1;vs[id==='idlMemGuild'?'guild':'status']=this.value;saveState();renderRows();});
  });
  // Sortable column headers
  document.querySelectorAll('.idl-sortable').forEach(function(th){
    th.addEventListener('click',function(){
      var col=this.dataset.sort;
      if(vs.sortCol===col){vs.sortAsc=!vs.sortAsc;}else{vs.sortCol=col;vs.sortAsc=false;}
      vs.page=1;updateSortArrows();saveState();renderRows();
    });
  });
  document.getElementById('idlMemPrev').addEventListener('click',function(){if(vs.page>1){vs.page--;saveState();renderRows();}});
  document.getElementById('idlMemNext').addEventListener('click',function(){vs.page++;saveState();renderRows();});
  if(document.getElementById('idlMemSelectAll')){
    document.getElementById('idlMemSelectAll').addEventListener('click',function(){
      var list=getFiltered();var allSel=list.every(function(m){return vs.selected[m.name]});
      list.forEach(function(m){vs.selected[m.name]=!allSel});renderRows();
    });
  }
  if(document.getElementById('idlBulkWatchlist'))document.getElementById('idlBulkWatchlist').addEventListener('click',function(){window.idlBulkAction('watchlist')});
  if(document.getElementById('idlBulkWarn'))document.getElementById('idlBulkWarn').addEventListener('click',function(){window.idlBulkAction('warn')});
  if(document.getElementById('idlBulkLoa'))document.getElementById('idlBulkLoa').addEventListener('click',function(){window.idlBulkAction('loa')});
  document.getElementById('idlProfileModal').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
  load();
})();
</script>`;
}


export function renderIdleonAdminTab(userTier) {
  const { membersCache } = _getState();
  const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
  const canWrite = TIER_LEVELS[userTier] >= TIER_LEVELS.admin;
  if (!canWrite) return '<div class="card"><p style="color:#ef5350">🔒 Admin access required.</p></div>';
  return `
<style>
  .idl-admin-btns{display:flex;flex-wrap:wrap;gap:8px}
  .idl-admin-btn{display:inline-flex!important;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:2px solid #3a3a42;background:#1e1e24;color:#ccc;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;width:auto!important;flex-shrink:0}
  .idl-admin-btn:hover{background:#2a2f3a;border-color:#555;color:#fff}
  .idl-admin-btn.active{background:linear-gradient(135deg,#7c3aed22,#7c3aed11);border-color:#7c3aed;color:#b794f6;box-shadow:0 0 12px #7c3aed22}
  .idl-admin-btn .btn-icon{font-size:18px}
</style>
<div class="card" style="position:relative">
  <h2 style="margin:0">🛠️ IdleOn Guild Admin</h2>
  <p style="color:#8b8fa3;margin:4px 0 0">Import data, configure settings, manage Firebase connection, backups, and data tools.</p>
  <button id="idlResetAllHeader" style="position:absolute;top:12px;right:14px;background:#f4433622;color:#f44336;border:1px solid #f4433644;border-radius:6px;padding:4px 10px;font-size:11px;cursor:pointer;font-weight:600;transition:all .15s;width:auto;max-width:120px" title="Clear all IdleOn data">🗑️ Reset</button>
</div>

<!-- Sub-tabs as prominent side-by-side buttons -->
<div class="card" style="padding:12px 14px">
  <div class="idl-admin-btns" id="idlAdminTabs">
    <button class="idl-admin-btn active" data-at="firebase"><span class="btn-icon">🔥</span> Firebase</button>
    <button class="idl-admin-btn" data-at="config"><span class="btn-icon">⚙️</span> Config</button>
    <button class="idl-admin-btn" data-at="backup"><span class="btn-icon">💾</span> Backup & Tools</button>
  </div>
</div>

<!-- Firebase Panel (default) — compact cards + search/polling -->
<div id="idlAdminFirebase" class="idl-admin-panel">
  <!-- Compact status row -->
  <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:10px;margin-bottom:12px">
    <div class="card" style="padding:12px 14px;margin:0">
      <div style="display:flex;align-items:center;gap:8px">
        <span id="fbStatusDot" style="width:10px;height:10px;border-radius:50%;background:#666;flex-shrink:0"></span>
        <div>
          <div id="fbStatusText" style="font-weight:700;font-size:13px">Checking...</div>
          <div id="fbStatusDetail" style="font-size:11px;color:#8b8fa3;margin-top:2px"></div>
        </div>
      </div>
      <div id="fbDisconnectSection" style="display:none;margin-top:8px;padding-top:8px;border-top:1px solid #3a3a42">
        <span style="font-size:11px;color:#8b8fa3">Connected <span id="fbConnectedAt"></span></span>
        <span id="fbEmail" style="display:none"></span>
        <button class="small" id="fbDisconnect" style="margin:4px 0 0;padding:2px 8px;font-size:10px;background:#f44336">🔌 Disconnect</button>
      </div>
    </div>
    <div class="card" style="padding:12px 14px;margin:0">
      <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.3px">Tracked Guilds</div>
      <div id="fbCardGuildCount" style="font-size:20px;font-weight:700;color:#b794f6;margin-top:2px">—</div>
    </div>
    <div class="card" style="padding:12px 14px;margin:0">
      <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.3px">Polling</div>
      <div id="fbCardPollStatus" style="font-size:13px;font-weight:600;color:#4caf50;margin-top:4px">—</div>
      <div id="fbCardLastPoll" style="font-size:11px;color:#8b8fa3;margin-top:2px"></div>
    </div>
    <div class="card" style="padding:12px 14px;margin:0">
      <div style="font-size:11px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.3px">Total Members</div>
      <div id="fbCardMemberCount" style="font-size:20px;font-weight:700;color:#4fc3f7;margin-top:2px">—</div>
    </div>
  </div>

  <div id="fbAuthSection" class="card" style="display:none">
    <h3>🔐 Connect Google Account</h3>
    <p style="font-size:12px;color:#8b8fa3">Uses the Device Code flow — you'll get a code to enter at google.com/device. Only <code>email profile</code> scope is requested. Your token is encrypted at rest.</p>
    <button class="small" id="fbStartAuth" style="margin:0;background:#4285f4">🔑 Start Google Login</button>
    <div id="fbAuthProgress" style="display:none;margin-top:12px;background:#1a1a2e;border:1px solid #3a3a42;border-radius:8px;padding:16px;text-align:center">
      <p style="margin:0 0 8px">Enter this code at:</p>
      <a id="fbAuthUrl" href="" target="_blank" rel="noopener" style="font-size:18px;color:#4285f4"></a>
      <div id="fbAuthCode" style="font-size:36px;font-weight:900;letter-spacing:8px;margin:12px 0;color:#fff"></div>
      <p style="font-size:12px;color:#8b8fa3">Waiting for you to complete login...</p>
    </div>
    <div id="fbAuthResult" style="margin-top:8px;font-size:13px"></div>
  </div>

  <div class="card">
    <h3>🔍 Search & Add Guild</h3>
    <div style="display:flex;gap:8px;align-items:center;margin-bottom:10px">
      <input id="fbGuildSearch" type="text" placeholder="Guild name..." style="margin:0;max-width:250px">
      <button class="small" id="fbSearchBtn" style="margin:0;background:#4caf50">🔍 Search</button>
    </div>
    <div id="fbSearchResults" style="margin-top:6px;font-size:13px"></div>

    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #3a3a42">
      <h4 style="margin:0 0 8px">📋 Tracked Guilds</h4>
      <div id="idlGuildsList"></div>
    </div>

    <div style="margin-top:12px;padding-top:10px;border-top:1px solid #3a3a42">
      <h4 style="margin:0 0 8px">🔄 Data Polling</h4>
      <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap">
        <button class="small" id="fbRefreshNow" style="margin:0;background:#2196f3">🔄 Refresh Now</button>
        <select id="fbPollInterval" style="margin:0;max-width:180px">
          <option value="15" selected>Every 15 min</option>
          <option value="30">Every 30 min</option>
          <option value="60">Every 1 hour</option>
          <option value="120">Every 2 hours</option>
          <option value="240">Every 4 hours</option>
        </select>
        <button class="small" id="fbStartPoll" style="margin:0;background:#4caf50">▶️ Start Polling</button>
        <button class="small" id="fbStopPoll" style="margin:0;background:#f44336">⏹️ Stop Polling</button>
      </div>
      <div id="fbPollStatus" style="margin-top:8px;font-size:12px;color:#8b8fa3"></div>
      <div id="fbRefreshResult" style="margin-top:8px;font-size:13px"></div>
    </div>
  </div>
</div>

<!-- Config Panel — settings only -->
<div id="idlAdminConfig" class="idl-admin-panel" style="display:none">
  <div class="card">
    <h2>⚙️ Guild Manager Settings</h2>
    <p style="color:#8b8fa3;font-size:12px;margin-bottom:12px">Configure how inactivity, kick thresholds, and alerts work for your guilds.</p>
    <div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px">
      <div>
        <label>Warning Days (yellow→orange)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Days of inactivity before a member gets a warning status (yellow ➜ orange).</p>
        <input type="number" id="idlCfgWarnDays" min="1" max="60" style="margin:0;width:100%">
      </div>
      <div>
        <label>Kick Threshold Days (red)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Days of inactivity before a member enters the kick queue (red status).</p>
        <input type="number" id="idlCfgKickDays" min="1" max="90" style="margin:0;width:100%">
      </div>
      <div>
        <label>Min Weekly GP</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Minimum guild points a member should earn per week. Used for at-risk detection.</p>
        <input type="number" id="idlCfgMinGp" min="0" style="margin:0;width:100%">
      </div>
      <div>
        <label>Probation Duration (weeks)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">How many weeks new members stay on probation before becoming full members.</p>
        <input type="number" id="idlCfgProbWeeks" min="1" max="12" style="margin:0;width:100%">
      </div>
      <div>
        <label>Probation Min GP</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Minimum total GP a member must earn during probation to pass.</p>
        <input type="number" id="idlCfgProbGp" min="0" style="margin:0;width:100%">
      </div>
      <div>
        <label>Warning DMs Enabled</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Send automatic Discord DMs to members nearing the kick threshold.</p>
        <select id="idlCfgWarnDms" style="margin:0;width:100%"><option value="false">Off</option><option value="true">On</option></select>
      </div>
      <div>
        <label>Weekly Digest Channel ID</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Discord channel where the weekly activity summary is posted.</p>
        <input type="text" id="idlCfgDigestCh" placeholder="Channel ID" style="margin:0;width:100%">
      </div>
      <div>
        <label>Digest Day</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Day of the week the digest is automatically posted.</p>
        <select id="idlCfgDigestDay" style="margin:0;width:100%"><option value="0">Sunday</option><option value="1">Monday</option><option value="2">Tuesday</option><option value="3">Wednesday</option><option value="4">Thursday</option><option value="5">Friday</option><option value="6">Saturday</option></select>
      </div>
      <div>
        <label>Forum Channel ID (waitlist)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Forum channel to scan for new applicants wanting to join the guild.</p>
        <input type="text" id="idlCfgForumCh" placeholder="Channel ID" style="margin:0;width:100%">
      </div>
      <div>
        <label>LOA Channel ID (time off)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Channel where members post about their leave of absence.</p>
        <input type="text" id="idlCfgLoaCh" placeholder="Channel ID" style="margin:0;width:100%">
      </div>
      <div>
        <label>Review Channel ID (account reviews)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Discord channel where people request Idleon account reviews.</p>
        <input type="text" id="idlCfgReviewCh" placeholder="Channel ID" style="margin:0;width:100%">
      </div>
      <div>
        <label>Twitch Reward ID (review priority)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Select the channel point reward that gives review priority.</p>
        <div style="display:flex;gap:6px;align-items:center">
          <select id="idlCfgReviewRewardId" style="margin:0;flex:1;padding:6px 8px;background:#1e1e24;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;font-size:12px"><option value="">— Select a reward —</option></select>
          <button class="small" id="idlCfgFetchRewards" style="margin:0;white-space:nowrap;background:#9146ff;color:#fff;padding:6px 12px;font-size:11px;border:none;border-radius:6px;cursor:pointer">🔄 Fetch Rewards</button>
        </div>
        <span id="idlCfgRewardStatus" style="font-size:11px;color:#8b8fa3;margin-top:4px;display:block"></span>
        <div style="margin-top:6px;padding:8px 10px;background:#9146ff11;border:1px solid #9146ff33;border-radius:8px">
          <p style="font-size:11px;color:#b388ff;margin:0 0 6px">⚠️ <strong>Important:</strong> Only rewards created by this bot can have their redemptions synced. If the reward was created manually on Twitch, click below to create one through the bot.</p>
          <div style="display:flex;gap:6px;align-items:center">
            <input id="idlCfgNewRewardTitle" placeholder="Reward title" value="Account Review" style="flex:1;padding:5px 8px;background:#0e0e12;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;font-size:11px">
            <input id="idlCfgNewRewardCost" type="number" placeholder="Cost" value="10000" min="1" style="width:80px;padding:5px 8px;background:#0e0e12;color:#e0e0e0;border:1px solid #3a3a42;border-radius:6px;font-size:11px">
            <button class="small" id="idlCfgCreateReward" style="margin:0;white-space:nowrap;background:#9146ff;color:#fff;padding:6px 12px;font-size:11px;border:none;border-radius:6px;cursor:pointer">✨ Create Reward</button>
          </div>
          <span id="idlCfgCreateRewardStatus" style="font-size:11px;color:#8b8fa3;margin-top:4px;display:block"></span>
        </div>
      </div>
      <div>
        <label>Promotion Thread ID</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Forum thread where members post "Name - Guild" to request guild promotion/transfer.</p>
        <input type="text" id="idlCfgPromoThread" placeholder="Thread ID" style="margin:0;width:100%">
      </div>
      <div>
        <label>Promotion Ping (long wait)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Enable pinging the configured channel when someone has been waiting longer than the threshold.</p>
        <select id="idlCfgPromoPing" style="margin:0;width:100%"><option value="false">Off</option><option value="true">On</option></select>
      </div>
      <div>
        <label>Promotion Ping After (hours)</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">How many hours before a long-wait warning appears. Default: 48.</p>
        <input type="number" id="idlCfgPromoPingHrs" value="48" min="1" max="720" style="margin:0;width:100%">
      </div>
      <div>
        <label>Promotion Ping Channel ID</label>
        <p style="font-size:11px;color:#666;margin:2px 0 4px">Discord channel to ping guild leaders when someone waits too long for promotion.</p>
        <input type="text" id="idlCfgPromoPingCh" placeholder="Channel ID" style="margin:0;width:100%">
      </div>
    </div>
    <div style="display:flex;gap:8px;align-items:center;margin-top:12px;flex-wrap:wrap">
      <button class="small" id="idlCfgSave" style="margin:0;background:#4caf50">💾 Save Config</button>
      <button class="small" id="idlCfgExport" style="margin:0;background:#2196f3">📤 Export Config</button>
      <button class="small" id="idlCfgImport" style="margin:0;background:#ff9800">📥 Import Config</button>
      <input type="file" id="idlCfgImportFile" accept=".json" style="display:none">
      <button class="small danger" id="idlCfgReset" style="margin:0">🔄 Reset to Defaults</button>
      <span id="idlCfgStatus" style="margin-left:10px;font-size:12px;color:#8b8fa3"></span>
    </div>
  </div>

  <!-- Per-Guild Overrides -->
  <div class="card">
    <h2>🏰 Per-Guild Config Overrides</h2>
    <p style="color:#8b8fa3;font-size:12px">Override warning/kick thresholds and min GP for specific guilds. Leave blank to use global defaults.</p>
    <div id="idlGuildOverrides"></div>
  </div>

  <!-- Digest -->
  <div class="card">
    <h2>📢 Manual Digest</h2>
    <p style="color:#8b8fa3">Send weekly digest to the configured channel now.</p>
    <button class="small" id="idlSendDigest" style="margin:0;background:#7c3aed">📢 Send Digest Now</button>
    <div id="idlDigestResult" style="margin-top:8px;font-size:12px"></div>
  </div>
</div>

<!-- Backup & Tools Panel (NEW tab) -->
<div id="idlAdminBackup" class="idl-admin-panel" style="display:none">
  <div class="card">
    <h2>💾 Data Backup & Restore</h2>
    <p style="color:#8b8fa3">Create snapshots of all IdleOn data, or restore from a previous backup.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">
      <button class="small" id="idlBackupCreate" style="margin:0;background:#4caf50">📸 Create Backup</button>
      <button class="small" id="idlBackupRefresh" style="margin:0;background:#2196f3">🔄 Refresh List</button>
    </div>
    <div id="idlBackupList" style="max-height:300px;overflow-y:auto;font-size:13px"></div>
    <div id="idlBackupStatus" style="margin-top:8px;font-size:12px"></div>
  </div>

  <div class="card">
    <h2>🔍 Data Integrity Check</h2>
    <p style="color:#8b8fa3">Scan for data anomalies: duplicate names, orphaned guild references, missing dates.</p>
    <button class="small" id="idlIntegrityRun" style="margin:0;background:#ff9800">🔍 Run Check</button>
    <div id="idlIntegrityResult" style="margin-top:10px;font-size:13px"></div>
  </div>

  <div class="card">
    <h2>📤 Export IdleOn Data</h2>
    <p style="color:#8b8fa3">Download members as CSV or JSON.</p>
    <div style="display:flex;gap:8px">
      <button class="small" id="idlExportCsv" style="margin:0;background:#2196f3">📊 Export CSV</button>
      <button class="small" id="idlExportJson" style="margin:0;background:#7c3aed">📋 Export JSON</button>
    </div>
  </div>

</div>

<!-- Reset confirmation overlay (hidden) -->
<div id="idlResetOverlay" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,.7);z-index:9999;display:none;align-items:center;justify-content:center">
  <div style="background:#1e1e24;border:2px solid #f44336;border-radius:12px;padding:24px;max-width:400px;text-align:center">
    <h3 style="color:#f44336;margin:0 0 8px">⚠️ Reset All IdleOn Data</h3>
    <p style="font-size:13px;color:#ccc;margin:0 0 16px">This will permanently clear all member data, guild data, kick logs, and waitlist. Config settings are preserved.</p>
    <div id="idlResetCountdown" style="font-size:24px;font-weight:900;color:#f44336;margin:8px 0"></div>
    <div style="display:flex;gap:8px;justify-content:center;margin-top:12px">
      <button id="idlResetConfirmBtn" disabled style="background:#f44336;color:#fff;border:none;border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:not-allowed;opacity:.4">Wait...</button>
      <button id="idlResetCancelBtn" style="background:#3a3a42;color:#ccc;border:none;border-radius:6px;padding:8px 20px;font-size:13px;font-weight:600;cursor:pointer">Cancel</button>
    </div>
    <span id="idlResetStatus" style="display:block;margin-top:8px;font-size:12px;color:#8b8fa3"></span>
  </div>
</div>

<script>
(function(){
  var model={members:[],guilds:[],config:{},kickLog:[],waitlist:[],promotionList:[],importLog:[]};
  var currentPanel='firebase';
  function _on(id,ev,fn){var el=document.getElementById(id);if(el)el.addEventListener(ev,fn);}
  function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function fmtN(n){return Number(n||0).toLocaleString();}
  function normHist(r){return(Array.isArray(r)?r:[]).map(function(h){return{weekStart:String(h.weekStart||'').slice(0,10),gp:Math.max(0,Number(h.gp||0))}}).filter(function(h){return /^\\d{4}-\\d{2}-\\d{2}$/.test(h.weekStart)&&Number.isFinite(h.gp)});}
  function allTimeGp(m){var h=normHist(m.weeklyHistory),t=h.reduce(function(s,x){return s+x.gp},0),b=Number(m.allTimeBaseline);return Number.isFinite(b)?Math.max(0,b)+t:Number(m.totalGp||0);}
  function weekKey(){var d=new Date();d.setHours(0,0,0,0);var wd=(d.getDay()+6)%7;d.setDate(d.getDate()-wd);return d.toISOString().slice(0,10);}
  function wGp(m){var wk=weekKey();var cur=normHist(m.weeklyHistory).find(function(h){return h.weekStart===wk});var deltaGp=cur?cur.gp:0;var fbStart=Number(m._firebaseGpWeekStartTotal||0);var fbCur=Number(m._firebaseGpTotal||0);var fbWeekly=fbCur>fbStart?fbCur-fbStart:0;return Math.max(deltaGp,fbWeekly);}
  function daysSince(m){var h=normHist(m.weeklyHistory).filter(function(x){return x.gp>0});if(!h.length)return m.updatedAt?Math.floor((Date.now()-m.updatedAt)/864e5):999;h.sort(function(a,b){return b.weekStart.localeCompare(a.weekStart)});var d=new Date(h[0].weekStart+'T00:00:00Z');d.setDate(d.getDate()+6);return Math.max(0,Math.floor((Date.now()-d.getTime())/864e5));}
  function guildName(id){var g=(model.guilds||[]).find(function(x){return x.id===id});return g?g.name:(id||'-');}

  function showPanel(name){
    currentPanel=name;
    document.querySelectorAll('.idl-admin-panel').forEach(function(p){p.style.display='none'});
    var el=document.getElementById('idlAdmin'+name.charAt(0).toUpperCase()+name.slice(1));
    if(el)el.style.display='block';
    if(name==='firebase'){loadFirebaseStatus();renderGuilds();}
    if(name==='config'){renderGuildOverrides();}
    if(name==='backup')renderBackupList();
  }

  // --- Config ---
  function loadConfig(){
    var cfg=model.config||{};
    document.getElementById('idlCfgWarnDays').value=cfg.warningDays||7;
    document.getElementById('idlCfgKickDays').value=cfg.kickThresholdDays||14;
    document.getElementById('idlCfgMinGp').value=cfg.minWeeklyGp||0;
    document.getElementById('idlCfgProbWeeks').value=cfg.probationWeeks||2;
    document.getElementById('idlCfgProbGp').value=cfg.probationMinGp||5000;
    document.getElementById('idlCfgWarnDms').value=String(!!cfg.warningDmsEnabled);
    document.getElementById('idlCfgDigestCh').value=cfg.digestChannelId||'';
    document.getElementById('idlCfgDigestDay').value=String(cfg.digestDay!=null?cfg.digestDay:1);
    document.getElementById('idlCfgForumCh').value=cfg.forumChannelId||'';
    document.getElementById('idlCfgLoaCh').value=cfg.loaChannelId||'';
    document.getElementById('idlCfgReviewCh').value=cfg.reviewChannelId||'';
    /* Reward dropdown: preserve the saved value as an option until fetch populates the full list */
    var rewardSel=document.getElementById('idlCfgReviewRewardId');
    var savedReward=cfg.reviewTwitchRewardId||'';
    if(savedReward&&!rewardSel.querySelector('option[value="'+savedReward+'"]')){
      var opt=document.createElement('option');opt.value=savedReward;opt.textContent='ID: '+savedReward.slice(0,8)+'… (saved)';
      rewardSel.appendChild(opt);
    }
    rewardSel.value=savedReward;
    // Auto-kick fields
    var _ak1=document.getElementById('idlCfgAutoKick');if(_ak1)_ak1.checked=!!cfg.autoKickEnabled;
    var _ak2=document.getElementById('idlCfgAutoKickRisk');if(_ak2)_ak2.value=cfg.autoKickMinRisk||70;
    var _ak3=document.getElementById('idlCfgAutoKickGrace');if(_ak3)_ak3.value=cfg.autoKickGraceDays||3;
    var _ak4=document.getElementById('idlCfgAutoKickMax');if(_ak4)_ak4.value=cfg.autoKickMaxPerCycle||5;
    var _ak5=document.getElementById('idlCfgAutoKickLogCh');if(_ak5)_ak5.value=cfg.autoKickLogChannelId||'';
    // Promotion fields
    document.getElementById('idlCfgPromoThread').value=cfg.promotionThreadId||'';
    document.getElementById('idlCfgPromoPing').value=String(!!cfg.promotionPingEnabled);
    document.getElementById('idlCfgPromoPingHrs').value=cfg.promotionPingAfterHours||48;
    document.getElementById('idlCfgPromoPingCh').value=cfg.promotionPingChannelId||'';
  }
  function saveConfig(){
    var payload={
      warningDays:Number(document.getElementById('idlCfgWarnDays').value)||7,
      kickThresholdDays:Number(document.getElementById('idlCfgKickDays').value)||14,
      minWeeklyGp:Number(document.getElementById('idlCfgMinGp').value)||0,
      probationWeeks:Number(document.getElementById('idlCfgProbWeeks').value)||2,
      probationMinGp:Number(document.getElementById('idlCfgProbGp').value)||5000,
      warningDmsEnabled:document.getElementById('idlCfgWarnDms').value==='true',
      digestChannelId:document.getElementById('idlCfgDigestCh').value.trim(),
      digestDay:Number(document.getElementById('idlCfgDigestDay').value),
      forumChannelId:document.getElementById('idlCfgForumCh').value.trim(),
      loaChannelId:document.getElementById('idlCfgLoaCh').value.trim(),
      reviewChannelId:document.getElementById('idlCfgReviewCh').value.trim(),
      reviewTwitchRewardId:document.getElementById('idlCfgReviewRewardId').value.trim(),
      autoKickEnabled:(document.getElementById('idlCfgAutoKick')||{}).checked||false,
      autoKickMinRisk:Number((document.getElementById('idlCfgAutoKickRisk')||{}).value)||70,
      autoKickGraceDays:Number((document.getElementById('idlCfgAutoKickGrace')||{}).value)||3,
      autoKickMaxPerCycle:Number((document.getElementById('idlCfgAutoKickMax')||{}).value)||5,
      autoKickLogChannelId:(document.getElementById('idlCfgAutoKickLogCh')||{value:''}).value.trim(),
      promotionThreadId:document.getElementById('idlCfgPromoThread').value.trim(),
      promotionPingEnabled:document.getElementById('idlCfgPromoPing').value==='true',
      promotionPingAfterHours:Number(document.getElementById('idlCfgPromoPingHrs').value)||48,
      promotionPingChannelId:document.getElementById('idlCfgPromoPingCh').value.trim(),
      roleMilestones:(model.config||{}).roleMilestones||[],
      guildOverrides:(model.config||{}).guildOverrides||{}
    };
    fetch('/api/idleon/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('idlCfgStatus').textContent=d.success?'✅ Saved':'❌ '+(d.error||'Failed');
      if(d.success)load();
    }).catch(function(e){document.getElementById('idlCfgStatus').textContent='❌ '+e.message;});
  }

  /* --- Create Twitch reward via bot API --- */
  var _btnCreateReward=document.getElementById('idlCfgCreateReward');
  if(_btnCreateReward) _btnCreateReward.addEventListener('click',function(){
    var status=document.getElementById('idlCfgCreateRewardStatus');
    var title=document.getElementById('idlCfgNewRewardTitle').value.trim()||'Account Review';
    var cost=Number(document.getElementById('idlCfgNewRewardCost').value)||10000;
    status.textContent='Creating reward on Twitch...';status.style.color='#8b8fa3';
    fetch('/api/idleon/twitch-rewards/create',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({title:title,cost:cost})}).then(function(r){return r.json()}).then(function(d){
      if(!d.success){status.textContent='❌ '+(d.error||'Failed');status.style.color='#f44336';return;}
      status.innerHTML='<span style="color:#4caf50">✅ Created "'+d.reward.title+'" ('+d.reward.cost+' pts) — auto-saved as reward ID</span>';
      /* Auto-update the dropdown */
      var sel=document.getElementById('idlCfgReviewRewardId');
      var opt=document.createElement('option');opt.value=d.reward.id;opt.textContent='✨ '+d.reward.title+' ('+Number(d.reward.cost).toLocaleString()+' pts)';opt.selected=true;
      sel.appendChild(opt);
    }).catch(function(e){status.textContent='❌ '+e.message;status.style.color='#f44336';});
  });

  /* --- Fetch Twitch rewards for dropdown --- */
  var _btnFetchRewards=document.getElementById('idlCfgFetchRewards');
  if(_btnFetchRewards) _btnFetchRewards.addEventListener('click',function(){
    var status=document.getElementById('idlCfgRewardStatus');
    status.textContent='Fetching rewards from Twitch...';status.style.color='#8b8fa3';
    fetch('/api/idleon/twitch-rewards').then(function(r){return r.json()}).then(function(d){
      if(!d.success){status.textContent='❌ '+(d.error||'Failed');status.style.color='#f44336';return;}
      var sel=document.getElementById('idlCfgReviewRewardId');
      var current=sel.value;
      sel.innerHTML='<option value="">— Select a reward —</option>';
      (d.rewards||[]).forEach(function(rw){
        var opt=document.createElement('option');opt.value=rw.id;
        opt.textContent=(rw.enabled?'':'⛔ ')+(rw.title||'Unnamed')+' ('+Number(rw.cost).toLocaleString()+' pts)';
        sel.appendChild(opt);
      });
      if(current)sel.value=current;
      status.innerHTML='<span style="color:#4caf50">✅ Found '+(d.rewards||[]).length+' reward'+(d.rewards.length!==1?'s':'')+'</span>';
    }).catch(function(e){status.textContent='❌ '+e.message;status.style.color='#f44336';});
  });

  // --- Guilds ---
  function renderGuilds(){
    var el=document.getElementById('idlGuildsList');if(!el)return;
    el.innerHTML=(model.guilds||[]).map(function(g){
      var count=model.members.filter(function(m){return m.guildId===g.id&&m.status!=='kicked'}).length;
      return'<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #2a2f3a"><span style="flex:1"><b>'+safe(g.name)+'</b> <span style="color:#8b8fa3">('+count+' members, id: '+safe(g.id)+')</span></span><button class="small danger" data-delguild="'+safe(g.id)+'" style="margin:0;padding:2px 8px;font-size:11px">🗑️</button></div>';
    }).join('')||'<div style="color:#8b8fa3;padding:8px">No guilds configured yet.</div>';
  }
  window.idlDeleteGuild=function(id){
    if(!confirm('Delete guild '+id+'?'))return;
    var removeMembers=confirm('Also remove all members from this guild?\\n\\nOK = Remove guild AND members\\nCancel = Remove guild only (keep members)');
    fetch('/api/idleon/guilds/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,removeMembers:removeMembers})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Deleted! '+(d.removed?'Removed':'Cleared')+' '+d.membersCleared+' members.');load();}else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  };
  _on('idlGuildsList','click',function(e){
    var btn=e.target.closest('[data-delguild]');
    if(btn)window.idlDeleteGuild(btn.dataset.delguild);
  });

  // --- Kick Queue ---
  function renderKickQueue(){
    var el=document.getElementById('idlKickRows');if(!el)return;
    var slots=Number((document.getElementById('idlKickSlots')||{}).value)||5;
    fetch('/api/idleon/kick-candidates?count='+slots).then(function(r){return r.json()}).then(function(d){
      if(!d.success)return;
      el.innerHTML=(d.candidates||[]).map(function(c,i){
        return'<tr><td>'+(i+1)+'</td><td>'+safe(c.name)+'</td><td>'+safe(guildName(c.guildId))+'</td><td>'+c.daysAway+'d</td><td>'+c.kickRiskScore+'</td><td>'+fmtN(c.allTimeGp)+'</td><td style="font-size:12px;color:#8b8fa3">'+safe(c.reason||'')+'</td></tr>';
      }).join('')||'<tr><td colspan="7" style="text-align:center;color:#8b8fa3">No kick candidates</td></tr>';
      if(d.impact){document.getElementById('idlKickImpact').innerHTML='Impact: avg GP would change from '+fmtN(d.impact.beforeAvg)+' to '+fmtN(d.impact.afterAvg)+' ('+(d.impact.change>=0?'+':'')+d.impact.change+'%)';}
    }).catch(function(){});
  }

  // --- Waitlist ---
  var _waitlistInterval=null;
  function renderWaitlist(){
    var el=document.getElementById('idlWaitRows');if(!el)return;
    var memberNames={};(model.members||[]).filter(function(m){return m.status!=='kicked'}).forEach(function(m){memberNames[m.name.toLowerCase()]=1;});
    var wl=(model.waitlist||[]).sort(function(a,b){return(b.priority||0)-(a.priority||0)});
    el.innerHTML=wl.map(function(w,i){
      var inGuild=memberNames[w.name.toLowerCase()];
      var statusLabel=inGuild?'<span style="color:#4caf50;font-weight:600">✅ In Guild</span>':w.status==='confirmed'?'<span style="color:#2196f3">✔ Confirmed</span>':'<span style="color:#ff9800">⏳ Waiting</span>';
      var waitMs=Date.now()-(w.addedAt||Date.now());var waitHrs=Math.floor(waitMs/36e5);
      var waitStr=waitHrs>=24?Math.floor(waitHrs/24)+'d '+waitHrs%24+'h':waitHrs+'h';
      return'<tr'+(inGuild?' style="opacity:0.5"':'')+'><td>'+(i+1)+'</td><td>'+safe(w.name)+'</td><td>'+new Date(w.addedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' <span style="color:#8b8fa3;font-size:11px">('+waitStr+')</span></td><td>'+safe(w.notes||'-')+'</td><td>'+safe(w.priority||'normal')+'</td><td>'+statusLabel+'</td><td style="white-space:nowrap">'+(w.status!=='confirmed'&&!inGuild?'<button class="small" data-confirmwait="'+safe(w.id)+'" style="margin:0;padding:2px 6px;font-size:11px;background:#2196f3" title="Manually confirm recruited">✅</button> ':'')+'<button class="small danger" data-delwait="'+safe(w.id)+'" style="margin:0;padding:2px 6px;font-size:11px">🗑️</button></td></tr>';
    }).join('')||'<tr><td colspan="7" style="text-align:center;color:#8b8fa3">Waitlist empty. Scan forum or add manually.</td></tr>';
    // Auto-check status label
    var statusEl=document.getElementById('idlWaitAutoStatus');
    if(statusEl)statusEl.innerHTML='<span style="color:#4caf50">🔄 Auto-check: on (15s)</span>';
    // Start auto-check interval if not already running (checks waitlist + scans forum every 15s)
    if(!_waitlistInterval){
      _waitlistInterval=setInterval(function(){
        // First scan forum for new entries, then refresh the waitlist
        fetch('/api/idleon/scan-forum',{method:'POST'}).then(function(r){return r.json()}).then(function(scanResult){
          // Update scan status indicator
          var statusEl=document.getElementById('idlWaitAutoStatus');
          if(statusEl&&scanResult.success&&scanResult.added&&scanResult.added.length>0){
            statusEl.innerHTML='<span style="color:#4caf50">\u2705 Auto-scan found '+scanResult.added.length+' new</span>';
          }
          // Now fetch updated waitlist (also auto-removes members already in guild)
          return fetch('/api/idleon/waitlist').then(function(r){return r.json()});
        }).then(function(d){
          if(d&&d.success){model.waitlist=d.waitlist||[];renderWaitlist();}
        }).catch(function(){});
      },15000);
    }
  }
  window.idlDeleteWait=function(id){
    fetch('/api/idleon/waitlist/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error)}).catch(function(e){alert(e.message)});
  };
  window.idlConfirmWait=function(id){
    fetch('/api/idleon/waitlist/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,status:'confirmed'})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  };
  var _elWaitRows=document.getElementById('idlWaitRows');
  if(_elWaitRows) _elWaitRows.addEventListener('click',function(e){
    var btn=e.target.closest('[data-delwait]');
    if(btn)window.idlDeleteWait(btn.dataset.delwait);
    var cbtn=e.target.closest('[data-confirmwait]');
    if(cbtn)window.idlConfirmWait(cbtn.dataset.confirmwait);
  });

  // --- Promotion List ---
  function renderPromotionList(){
    var el=document.getElementById('idlPromoRows');if(!el)return;
    var pl=(model.promotionList||[]).sort(function(a,b){return(a.addedAt||0)-(b.addedAt||0)});
    el.innerHTML=pl.map(function(p,i){
      var waitMs=Date.now()-(p.addedAt||Date.now());var waitHrs=Math.floor(waitMs/36e5);
      var waitStr=waitHrs>=24?Math.floor(waitHrs/24)+'d '+waitHrs%24+'h':waitHrs+'h';
      var statusLabel=p.status==='confirmed'?'<span style="color:#4caf50">✔ Done</span>':'<span style="color:#ff9800">⏳ Waiting</span>';
      var cfg=model.config||{};var pingThreshold=Number(cfg.promotionPingAfterHours)||48;
      var isLongWait=waitHrs>=pingThreshold&&p.status!=='confirmed';
      return'<tr'+(isLongWait?' style="background:#ff980015"':'')+'><td>'+(i+1)+'</td><td>'+safe(p.name)+'</td><td>'+safe(p.targetGuild||'-')+'</td><td>'+new Date(p.addedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' <span style="color:#8b8fa3;font-size:11px">('+waitStr+')</span>'+(isLongWait?' <span style="color:#f44336;font-size:10px">⚠ long wait</span>':'')+'</td><td>'+safe(p.notes||'-')+'</td><td>'+statusLabel+'</td><td style="white-space:nowrap">'+(p.status!=='confirmed'?'<button class="small" data-confirmpromo="'+safe(p.id)+'" style="margin:0;padding:2px 6px;font-size:11px;background:#2196f3" title="Confirm promoted">✅</button> ':'')+'<button class="small danger" data-delpromo="'+safe(p.id)+'" style="margin:0;padding:2px 6px;font-size:11px">🗑️</button></td></tr>';
    }).join('')||'<tr><td colspan="7" style="text-align:center;color:#8b8fa3">Promotion list empty. Scan thread or add manually.</td></tr>';
  }
  window.idlDeletePromo=function(id){
    fetch('/api/idleon/promotion-list/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error)}).catch(function(e){alert(e.message)});
  };
  window.idlConfirmPromo=function(id){
    fetch('/api/idleon/promotion-list/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,status:'confirmed'})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  };
  var _elPromoRows=document.getElementById('idlPromoRows');
  if(_elPromoRows) _elPromoRows.addEventListener('click',function(e){
    var btn=e.target.closest('[data-delpromo]');
    if(btn)window.idlDeletePromo(btn.dataset.delpromo);
    var cbtn=e.target.closest('[data-confirmpromo]');
    if(cbtn)window.idlConfirmPromo(cbtn.dataset.confirmpromo);
  });

  // --- Roles ---
  function renderRoles(){
    var el=document.getElementById('idlRolesList');if(!el)return;
    var milestones=(model.config&&model.config.roleMilestones)||[];
    milestones.sort(function(a,b){return(a.gpThreshold||0)-(b.gpThreshold||0)});
    el.innerHTML=milestones.map(function(r){
      return'<div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #2a2f3a"><span style="flex:1">🏅 <b>'+fmtN(r.gpThreshold)+' GP</b> → '+safe(r.roleName||r.roleId)+' <span style="color:#8b8fa3;font-size:11px">('+safe(r.roleId)+')</span></span><button class="small danger" onclick="idlRemoveRole('+r.gpThreshold+')" style="margin:0;padding:2px 8px;font-size:11px">🗑️</button></div>';
    }).join('')||'<div style="color:#8b8fa3;padding:8px">No milestones configured.</div>';
  }
  window.idlRemoveRole=function(gp){
    var ms=((model.config||{}).roleMilestones||[]).filter(function(r){return r.gpThreshold!==gp});
    var cfg=Object.assign({},model.config,{roleMilestones:ms});
    fetch('/api/idleon/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)}).then(function(r){return r.json()}).then(function(d){if(d.success)load();}).catch(function(){});
  };

  // --- Ghosts (upgraded) ---
  var ghostData=null;
  var ghostTab='unlinked';
  var ghostSearch='';
  var ghostHideIgnored=true;

  function renderGhostStats(){
    var el=document.getElementById('idlGhostStats');if(!el||!ghostData)return;
    var s=ghostData.stats||{};
    el.innerHTML=[
      {n:s.linked||0,l:'Linked',c:'#4caf50'},
      {n:s.totalActive||0,l:'Total Active',c:'#4fc3f7'},
      {n:s.unlinked||0,l:'Unlinked',c:'#ff9800'},
      {n:s.ghosts||0,l:'Discord Ghosts',c:'#f44336'}
    ].map(function(x){return '<div style="background:#1a1a22;border:1px solid #2a2f3a;border-radius:8px;padding:6px 14px;text-align:center"><div style="font-size:18px;font-weight:700;color:'+x.c+'">'+x.n+'</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">'+x.l+'</div></div>';}).join('');
  }

  function scoreColor(s){return s>=85?'#4caf50':s>=65?'#8bc34a':s>=50?'#ff9800':'#f44336';}
  function scoreLabel(s){return s>=85?'High':s>=65?'Good':s>=50?'Partial':'Low';}

  function renderGhostContent(){
    var el=document.getElementById('idlGhostResults');if(!el||!ghostData)return;
    var q=ghostSearch.toLowerCase();

    if(ghostTab==='unlinked'){
      var items=(ghostData.unlinked||[]).filter(function(n){
        if(ghostHideIgnored&&n.ignored)return false;
        if(q){
          var hay=(n.idleonName||'').toLowerCase();
          var sugHay=n.suggestions?n.suggestions.map(function(s){return(s.displayName||'')+' '+(s.username||'')}).join(' ').toLowerCase():'';
          if(hay.indexOf(q)===-1&&sugHay.indexOf(q)===-1)return false;
        }
        return true;
      });

      if(items.length===0){
        el.innerHTML='<div style="color:#4caf50;padding:12px">\\u2705 '+(q?'No unlinked players match your search':'All players are linked!')+'</div>';
        return;
      }

      var allDiscord=ghostData.allDiscord||[];
      el.innerHTML='<div style="font-size:11px;color:#666;margin-bottom:6px">Showing '+items.length+' unlinked player'+(items.length>1?'s':'')+'</div>'
        +'<div style="border:1px solid #2a2f3a;border-radius:8px;overflow:hidden;background:#17171b">'
        +'<table style="width:100%;border-collapse:collapse;font-size:12px;margin:0">'
        +'<thead><tr style="border-bottom:2px solid #2a2f3a">'
        +'<th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">IdleOn Name</th>'
        +'<th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Guild</th>'
        +'<th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Best Matches</th>'
        +'<th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase;width:220px">Manual Link</th>'
        +'<th style="padding:8px 10px;text-align:center;color:#8b8fa3;font-size:10px;text-transform:uppercase;width:80px">Actions</th>'
        +'</tr></thead><tbody>'
        +items.map(function(n){
          var sugs=n.suggestions||[];
          var sugHtml=sugs.length?sugs.map(function(s){
            return '<div style="display:flex;align-items:center;gap:4px;margin:1px 0">'
              +'<span style="background:'+scoreColor(s.score)+'22;color:'+scoreColor(s.score)+';padding:1px 6px;border-radius:10px;font-size:9px;font-weight:700;min-width:28px;text-align:center">'+s.score+'%</span>'
              +'<span style="font-weight:600">'+safe(s.displayName||s.username)+'</span>'
              +(s.username&&s.displayName&&s.username!==s.displayName?' <span style="color:#8b8fa3;font-size:10px">('+safe(s.username)+')</span>':'')
              +'<button class="small" data-ghost-link="'+safe(n.idleonName)+'" data-ghost-did="'+safe(s.id)+'" style="margin:0;padding:1px 6px;font-size:9px;background:#4caf5022;color:#4caf50;border:1px solid #4caf5044" title="Link '+safe(n.idleonName)+' to '+safe(s.displayName||s.username)+'">\\u2714 Link</button>'
              +'</div>';
          }).join(''):'<span style="color:#555">No matches found</span>';

          var guildLabel=n.guildId?safe(guildName(n.guildId)):'<span style="color:#555">\\u2014</span>';

          return '<tr style="border-bottom:1px solid #1e1e24'+(n.ignored?';opacity:.5':'')+'"><td style="padding:8px 10px;font-weight:600;color:#e8e8ec">'+safe(n.idleonName)+'</td>'
            +'<td style="padding:8px 10px">'+guildLabel+'</td>'
            +'<td style="padding:8px 10px">'+sugHtml+'</td>'
            +'<td style="padding:8px 10px"><select class="ghost-manual-sel" data-ghost-manual="'+safe(n.idleonName)+'" style="width:100%;padding:4px 6px;background:#0e0e12;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0;font-size:11px"><option value="">Select Discord user...</option></select></td>'
            +'<td style="padding:8px 10px;text-align:center"><button class="small" data-ghost-ignore="'+safe(n.idleonName)+'" data-ghost-ignored="'+(n.ignored?'1':'0')+'" style="margin:0;padding:2px 6px;font-size:10px;background:'+(n.ignored?'#ff980022':'#3a3a42')+';color:'+(n.ignored?'#ff9800':'#8b8fa3')+'" title="'+(n.ignored?'Show':'Hide')+' this entry">'+(n.ignored?'\\uD83D\\uDC41 Show':'\\uD83D\\uDEAB Ignore')+'</button></td>'
            +'</tr>';
        }).join('')
        +'</tbody></table></div>';

      // Populate manual-link dropdowns
      var sels=el.querySelectorAll('.ghost-manual-sel');
      sels.forEach(function(sel){
        allDiscord.forEach(function(dm){
          var o=document.createElement('option');
          o.value=dm.id;
          o.textContent=(dm.displayName||dm.username)+' ('+dm.username+')';
          sel.appendChild(o);
        });
      });

    } else {
      // Discord Ghosts tab
      var ghosts=(ghostData.discordGhosts||[]).filter(function(g){
        if(ghostHideIgnored&&g.ignored)return false;
        if(q){
          var hay=((g.displayName||'')+(g.username||'')).toLowerCase();
          if(hay.indexOf(q)===-1)return false;
        }
        return true;
      });

      if(ghosts.length===0){
        el.innerHTML='<div style="color:#4caf50;padding:12px">\\u2705 '+(q?'No Discord ghosts match your search':'No Discord ghosts detected!')+'</div>';
        return;
      }

      el.innerHTML='<div style="font-size:11px;color:#666;margin-bottom:6px">Showing '+ghosts.length+' Discord ghost'+(ghosts.length>1?'s':'')+'</div>'
        +'<div style="border:1px solid #2a2f3a;border-radius:8px;overflow:hidden;background:#17171b">'
        +'<table style="width:100%;border-collapse:collapse;font-size:12px;margin:0">'
        +'<thead><tr style="border-bottom:2px solid #2a2f3a">'
        +'<th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Discord User</th>'
        +'<th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Username</th>'
        +'<th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">User ID</th>'
        +'<th style="padding:8px 10px;text-align:center;color:#8b8fa3;font-size:10px;text-transform:uppercase;width:80px">Actions</th>'
        +'</tr></thead><tbody>'
        +ghosts.map(function(g){
          return '<tr style="border-bottom:1px solid #1e1e24'+(g.ignored?';opacity:.5':'')+'"><td style="padding:8px 10px;font-weight:600;color:#e8e8ec">'+safe(g.displayName||g.username)+'</td>'
            +'<td style="padding:8px 10px;color:#7289da">'+safe(g.username)+'</td>'
            +'<td style="padding:8px 10px;color:#8b8fa3;font-size:11px;font-family:monospace">'+safe(g.id)+'</td>'
            +'<td style="padding:8px 10px;text-align:center"><button class="small" data-ghost-ignore="'+safe(g.id)+'" data-ghost-ignored="'+(g.ignored?'1':'0')+'" style="margin:0;padding:2px 6px;font-size:10px;background:'+(g.ignored?'#ff980022':'#3a3a42')+';color:'+(g.ignored?'#ff9800':'#8b8fa3')+'">'+(g.ignored?'\\uD83D\\uDC41 Show':'\\uD83D\\uDEAB Ignore')+'</button></td>'
            +'</tr>';
        }).join('')
        +'</tbody></table></div>';
    }
  }

  function loadGhosts(){
    var el=document.getElementById('idlGhostResults');if(!el)return;
    el.innerHTML='<div style="color:#8b8fa3;padding:8px">Loading...</div>';
    fetch('/api/idleon/ghosts').then(function(r){return r.json()}).then(function(d){
      if(!d.success)return;
      ghostData=d;
      renderGhostStats();
      renderGhostContent();
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">Error: '+safe(e.message)+'</span>';});
  }

  // Ghost tab switching
  document.querySelectorAll('[data-ghost-tab]').forEach(function(btn){
    btn.addEventListener('click',function(){
      ghostTab=btn.dataset.ghostTab;
      document.querySelectorAll('[data-ghost-tab]').forEach(function(b){b.style.background=b.dataset.ghostTab===ghostTab?'#2196f3':'#3a3a42';});
      renderGhostContent();
    });
  });

  // Ghost search
  var ghostSearchEl=document.getElementById('idlGhostSearch');
  if(ghostSearchEl)ghostSearchEl.addEventListener('input',function(){ghostSearch=this.value;renderGhostContent();});

  // Hide ignored toggle
  var ghostIgnoreEl=document.getElementById('idlGhostHideIgnored');
  if(ghostIgnoreEl)ghostIgnoreEl.addEventListener('change',function(){ghostHideIgnored=this.checked;renderGhostContent();});

  // Ghost action delegation
  _on('idlGhostResults','click',function(e){
    // Link button (from suggestions)
    var linkBtn=e.target.closest('[data-ghost-link]');
    if(linkBtn){
      var name=linkBtn.dataset.ghostLink;
      var did=linkBtn.dataset.ghostDid;
      if(!confirm('Link '+name+' to this Discord user?'))return;
      linkBtn.disabled=true;linkBtn.textContent='...';
      fetch('/api/idleon/link-member',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idleonName:name,discordId:did})}).then(function(r){return r.json()}).then(function(d){
        if(d.success){loadGhosts();}else{alert(d.error||'Failed');linkBtn.disabled=false;linkBtn.textContent='\\u2714 Link';}
      }).catch(function(e){alert(e.message);linkBtn.disabled=false;linkBtn.textContent='\\u2714 Link';});
      return;
    }
    // Ignore/show button
    var ignBtn=e.target.closest('[data-ghost-ignore]');
    if(ignBtn){
      var key=ignBtn.dataset.ghostIgnore;
      var isIgnored=ignBtn.dataset.ghostIgnored==='1';
      fetch('/api/idleon/ghost-ignore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key,ignore:!isIgnored})}).then(function(r){return r.json()}).then(function(d){if(d.success)loadGhosts();}).catch(function(){});
      return;
    }
  });

  // Manual link from dropdown
  _on('idlGhostResults','change',function(e){
    var sel=e.target.closest('[data-ghost-manual]');
    if(!sel||!sel.value)return;
    var name=sel.dataset.ghostManual;
    var did=sel.value;
    var label=sel.options[sel.selectedIndex].textContent;
    if(!confirm('Link '+name+' → '+label+'?'))return;
    fetch('/api/idleon/link-member',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idleonName:name,discordId:did})}).then(function(r){return r.json()}).then(function(d){
      if(d.success)loadGhosts();else{alert(d.error||'Failed');sel.value='';}
    }).catch(function(e){alert(e.message);sel.value='';});
  });

  // Auto-link all confident matches
  _on('idlGhostAutoLink','click',function(){
    if(!confirm('Auto-link all exact name matches? (This only links exact matches via the existing auto-link feature.)'))return;
    var el=document.getElementById('idlGhostResults');
    fetch('/api/idleon/auto-link',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      if(d.success){alert('Linked '+d.linked+' member(s).');loadGhosts();load();}
      else alert(d.error||'Failed');
    }).catch(function(e){alert(e.message);});
  });

  // --- Kick Log (enhanced with search, pagination, undo) ---
  var logState={page:1,ps:20,search:'',guild:''};
  function renderKickLog(){
    var el=document.getElementById('idlKickLog');if(!el)return;
    var logs=(model.kickLog||[]).slice().sort(function(a,b){return(b.date||0)-(a.date||0)});
    // Filter
    var s=logState.search.toLowerCase();
    var gf=logState.guild;
    var filtered=logs.filter(function(l){
      if(s&&(l.memberName||'').toLowerCase().indexOf(s)===-1&&(l.reason||'').toLowerCase().indexOf(s)===-1)return false;
      if(gf&&l.guildId!==gf)return false;
      return true;
    });
    var total=filtered.length;var pages=Math.max(1,Math.ceil(total/logState.ps));
    if(logState.page>pages)logState.page=pages;
    var start=(logState.page-1)*logState.ps;var paged=filtered.slice(start,start+logState.ps);
    el.innerHTML=paged.map(function(l,i){
      return'<div style="display:flex;align-items:center;gap:8px;padding:8px 0;border-bottom:1px solid #2a2f3a">'
        +'<div style="flex:1"><b>'+safe(l.memberName)+'</b> — '+(l.guildId?safe(guildName(l.guildId))+' — ':'')+safe(l.reason||'No reason')
        +' <span style="color:#8b8fa3;font-size:11px">'+new Date(l.date).toLocaleString()+' by '+safe(l.kickedBy||'?')+'</span></div>'
        +'<button class="small" data-undo-kick="'+safe(l.memberName)+'" style="margin:0;padding:2px 8px;font-size:11px;background:#ff9800" title="Undo kick (revert to previous status)">↩️ Undo</button>'
        +'</div>';
    }).join('')||'<div style="color:#8b8fa3">No kicks recorded.</div>';
    var info=document.getElementById('idlLogInfo');if(info)info.textContent='Showing '+(total?start+1:0)+'-'+Math.min(start+logState.ps,total)+' of '+total;
    var pg=document.getElementById('idlLogPage');if(pg)pg.textContent='Page '+logState.page+' / '+pages;
    var prev=document.getElementById('idlLogPrev');if(prev)prev.disabled=logState.page<=1;
    var next=document.getElementById('idlLogNext');if(next)next.disabled=logState.page>=pages;
    // Populate guild filter
    var gsel=document.getElementById('idlLogGuild');
    if(gsel&&gsel.options.length<=1){(model.guilds||[]).forEach(function(g){var o=document.createElement('option');o.value=g.id;o.textContent=g.name;gsel.appendChild(o);});}
  }
  // Undo kick handler
  _on('idlKickLog','click',function(e){
    var btn=e.target.closest('[data-undo-kick]');
    if(!btn)return;
    var name=btn.dataset.undoKick;
    if(!confirm('Undo kick for '+name+'? This will revert their status.'))return;
    btn.disabled=true;btn.textContent='...';
    fetch('/api/idleon/undo-kick',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})}).then(function(r){return r.json()}).then(function(d){
      if(d.success){alert('Kick undone for '+name+'. Status reverted to: '+d.newStatus);load();}
      else alert(d.error||'Failed');
    }).catch(function(e){alert(e.message)}).finally(function(){btn.disabled=false;btn.textContent='↩️ Undo';});
  });
  // Log search/filter
  _on('idlLogSearch','input',function(){logState.search=this.value;logState.page=1;renderKickLog();});
  _on('idlLogGuild','change',function(){logState.guild=this.value;logState.page=1;renderKickLog();});
  _on('idlLogPrev','click',function(){if(logState.page>1){logState.page--;renderKickLog();}});
  _on('idlLogNext','click',function(){logState.page++;renderKickLog();});
  // Export log CSV
  _on('idlLogExport','click',function(){
    window.open('/api/idleon/export?format=csv','_blank');
  });
  // Log stats
  function renderLogStats(){
    var el=document.getElementById('idlLogStats');if(!el)return;
    fetch('/api/idleon/kick-stats').then(function(r){return r.json()}).then(function(d){
      if(!d.success)return;
      el.innerHTML='<div class="idl-kpi"><div class="label">Total Kicks</div><div class="val">'+d.total+'</div></div>'
        +'<div class="idl-kpi"><div class="label">This Week</div><div class="val">'+d.thisWeek+'</div></div>'
        +'<div class="idl-kpi"><div class="label">This Month</div><div class="val">'+d.thisMonth+'</div></div>'
        +'<div class="idl-kpi"><div class="label">Top Reason</div><div class="val" style="font-size:14px">'+safe((d.topReasons&&d.topReasons[0]&&d.topReasons[0].reason)||'N/A')+'</div></div>';
    }).catch(function(){});
  }

  // --- Guild Overrides ---
  function renderGuildOverrides(){
    var el=document.getElementById('idlGuildOverrides');if(!el)return;
    var overrides=(model.config||{}).guildOverrides||{};
    var guilds=model.guilds||[];
    if(!guilds.length){el.innerHTML='<div style="color:#8b8fa3">No guilds tracked yet.</div>';return;}
    el.innerHTML=guilds.map(function(g){
      var ov=overrides[g.id]||{};
      return'<div style="border:1px solid #3a3a42;border-radius:8px;padding:10px;margin-bottom:8px;background:#17171b">'
        +'<b>'+safe(g.name)+'</b> <span style="color:#8b8fa3;font-size:11px">'+safe(g.id)+'</span>'
        +'<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:8px;margin-top:8px">'
        +'<div><label style="font-size:11px">Warning Days</label><input type="number" data-ov-guild="'+safe(g.id)+'" data-ov-key="warningDays" value="'+(ov.warningDays||'')+'" placeholder="global" style="margin:0;width:100%;font-size:12px"></div>'
        +'<div><label style="font-size:11px">Kick Days</label><input type="number" data-ov-guild="'+safe(g.id)+'" data-ov-key="kickThresholdDays" value="'+(ov.kickThresholdDays||'')+'" placeholder="global" style="margin:0;width:100%;font-size:12px"></div>'
        +'<div><label style="font-size:11px">Min Weekly GP</label><input type="number" data-ov-guild="'+safe(g.id)+'" data-ov-key="minWeeklyGp" value="'+(ov.minWeeklyGp||'')+'" placeholder="global" style="margin:0;width:100%;font-size:12px"></div>'
        +'</div></div>';
    }).join('');
    el.innerHTML+='<button class="small" id="idlSaveOverrides" style="margin-top:8px;background:#4caf50">💾 Save Overrides</button><span id="idlOverridesStatus" style="margin-left:8px;font-size:12px;color:#8b8fa3"></span>';
    document.getElementById('idlSaveOverrides').addEventListener('click',function(){
      var ov={};document.querySelectorAll('[data-ov-guild]').forEach(function(inp){
        var gid=inp.dataset.ovGuild,key=inp.dataset.ovKey,val=inp.value.trim();
        if(!ov[gid])ov[gid]={};if(val)ov[gid][key]=Number(val);
      });
      var cfg=Object.assign({},model.config,{guildOverrides:ov});
      fetch('/api/idleon/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)}).then(function(r){return r.json()}).then(function(d){
        document.getElementById('idlOverridesStatus').textContent=d.success?'✅ Saved':'❌ Failed';if(d.success)load();
      }).catch(function(e){document.getElementById('idlOverridesStatus').textContent='❌ '+e.message;});
    });
  }

  // --- Backup & Tools ---
  function renderBackupList(){
    var el=document.getElementById('idlBackupList');if(!el)return;
    el.innerHTML='<span style="color:#8b8fa3">Loading...</span>';
    fetch('/api/idleon/backups').then(function(r){return r.json()}).then(function(d){
      if(!d.success||!d.backups||!d.backups.length){el.innerHTML='<div style="color:#8b8fa3">No backups found.</div>';return;}
      el.innerHTML=d.backups.map(function(b){
        return'<div style="display:flex;align-items:center;gap:8px;padding:8px;border-bottom:1px solid #2a2f3a">'
          +'<span style="flex:1"><b>'+safe(b.name||b)+'</b></span>'
          +'<button class="small" data-restore-bk="'+safe(b.name||b)+'" style="margin:0;padding:2px 8px;font-size:11px;background:#ff9800">↩️ Restore</button>'
          +'</div>';
      }).join('');
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+e.message+'</span>';});
  }
  // Backup restore handler
  _on('idlBackupList','click',function(e){
    var btn=e.target.closest('[data-restore-bk]');if(!btn)return;
    var name=btn.dataset.restoreBk;
    if(!confirm('Restore from backup "'+name+'"? Current data will be overwritten.'))return;
    btn.disabled=true;btn.textContent='Restoring...';
    fetch('/api/idleon/restore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})}).then(function(r){return r.json()}).then(function(d){
      if(d.success){alert('Restored from '+name);load();}else alert(d.error||'Failed');
      btn.disabled=false;btn.textContent='↩️ Restore';
    }).catch(function(e){alert(e.message);btn.disabled=false;btn.textContent='↩️ Restore';});
  });

  // --- Load & Init ---
  function load(){
    fetch('/api/idleon/gp').then(function(r){if(!r.ok)throw new Error('Server error '+r.status);return r.json()}).then(function(d){
      if(!d.success)throw new Error(d.error||'Load failed');
      model.members=d.members||[];model.guilds=d.guilds||[];model.config=d.config||{};
      model.kickLog=d.kickLog||[];model.waitlist=d.waitlist||[];model.promotionList=d.promotionList||[];model.importLog=d.importLog||[];
      model.accountReviews=d.accountReviews||[];
      loadConfig();renderGuilds();renderWaitlist();renderPromotionList();renderRoles();renderKickLog();
      // Update companion cards
      var gcEl=document.getElementById('fbCardGuildCount');if(gcEl)gcEl.textContent=(model.guilds||[]).length;
      var mcEl=document.getElementById('fbCardMemberCount');if(mcEl)mcEl.textContent=(model.members||[]).filter(function(m){return m.status!=='kicked'}).length;
    }).catch(function(e){console.error('IdleOn admin load:',e)});
  }

  // Tab switching
  document.querySelectorAll('#idlAdminTabs .idl-admin-btn').forEach(function(tab){
    tab.addEventListener('click',function(){
      document.querySelectorAll('#idlAdminTabs .idl-admin-btn').forEach(function(t){t.classList.remove('active')});
      tab.classList.add('active');showPanel(tab.dataset.at);
      if(tab.dataset.at==='kicks')renderKickQueue();
      if(tab.dataset.at==='ghosts')loadGhosts();
    });
  });

  // Buttons
  _on('idlCfgSave','click',saveConfig);
  _on('idlAutoKickSave','click',saveConfig);
  _on('idlAutoKickPreviewBtn','click',function(){
    var el=document.getElementById('idlAutoKickPreview');if(!el)return;
    el.innerHTML='<span style="color:#ff9800">Loading...</span>';
    fetch('/api/idleon/auto-kick-status').then(function(r){return r.json()}).then(function(d){
      if(!d.success){el.innerHTML='<span style="color:#f44336">❌ '+(d.error||'Failed')+'</span>';return;}
      if(!d.atRisk.length){el.innerHTML='<span style="color:#4caf50">✅ No members at risk (threshold: '+d.minRisk+')</span>';return;}
      el.innerHTML='<div style="font-size:12px;max-height:200px;overflow-y:auto"><table style="width:100%;border-collapse:collapse"><tr style="background:#1a1d24"><th style="padding:4px 8px;text-align:left">Name</th><th style="padding:4px 8px">Risk</th><th style="padding:4px 8px">Warned</th><th style="padding:4px 8px">Grace Expires</th><th style="padding:4px 8px">Will Kick</th></tr>'+
        d.atRisk.map(function(m){return'<tr style="border-bottom:1px solid #2a2f3a"><td style="padding:4px 8px">'+safe(m.name)+'</td><td style="padding:4px 8px;text-align:center;color:'+(m.risk>=80?'#f44336':'#ff9800')+'">'+m.risk+'</td><td style="padding:4px 8px;text-align:center">'+(m.warned?'✅':'—')+'</td><td style="padding:4px 8px;text-align:center">'+(m.graceExpires?new Date(m.graceExpires).toLocaleDateString():'—')+'</td><td style="padding:4px 8px;text-align:center">'+(m.willKick?'🚫 Yes':'—')+'</td></tr>'}).join('')+
        '</table></div>';
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+e.message+'</span>';});
  });
  // --- Reset All Data (header button → 10s countdown overlay) ---
  var _resetTimer=null;
  _on('idlResetAllHeader','click',function(){
    var overlay=document.getElementById('idlResetOverlay');
    overlay.style.display='flex';
    var confirmBtn=document.getElementById('idlResetConfirmBtn');
    var cdEl=document.getElementById('idlResetCountdown');
    confirmBtn.disabled=true;confirmBtn.style.opacity='.4';confirmBtn.style.cursor='not-allowed';
    var left=10;
    cdEl.textContent=left+'s';
    confirmBtn.textContent='Wait ('+left+'s)';
    if(_resetTimer)clearInterval(_resetTimer);
    _resetTimer=setInterval(function(){
      left--;
      if(left>0){cdEl.textContent=left+'s';confirmBtn.textContent='Wait ('+left+'s)';}
      else{
        clearInterval(_resetTimer);_resetTimer=null;
        cdEl.textContent='';
        confirmBtn.textContent='🗑️ Yes, Reset Everything';
        confirmBtn.disabled=false;confirmBtn.style.opacity='1';confirmBtn.style.cursor='pointer';
      }
    },1000);
  });
  _on('idlResetCancelBtn','click',function(){
    document.getElementById('idlResetOverlay').style.display='none';
    if(_resetTimer){clearInterval(_resetTimer);_resetTimer=null;}
  });
  _on('idlResetConfirmBtn','click',function(){
    var btn=document.getElementById('idlResetConfirmBtn');
    btn.disabled=true;btn.textContent='Clearing...';
    fetch('/api/idleon/reset-all',{method:'POST',headers:{'Content-Type':'application/json'}}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('idlResetOverlay').style.display='none';
      if(d.success){document.getElementById('idlResetStatus').textContent='✅ Data cleared!';load();}
      else{document.getElementById('idlResetStatus').textContent='❌ '+d.error;}
    }).catch(function(e){document.getElementById('idlResetOverlay').style.display='none';alert(e.message);});
  });
  _on('idlKickRefresh','click',renderKickQueue);
  _on('idlKickSendWarnings','click',function(){
    var slots=Number((document.getElementById('idlKickSlots')||{}).value)||5;
    fetch('/api/idleon/kick-candidates?count='+slots).then(function(r){return r.json()}).then(function(d){
      if(!d.success||!d.candidates||!d.candidates.length)return alert('No candidates');
      if(!confirm('Send warning DMs to '+d.candidates.length+' members?'))return;
      var names=d.candidates.map(function(c){return c.name});
      fetch('/api/idleon/send-warnings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:names})}).then(function(r){return r.json()}).then(function(r){alert(r.success?'Sent '+r.sent+' warnings':'Failed: '+(r.error||''));}).catch(function(e){alert(e.message)});
    }).catch(function(e){alert(e.message)});
  });
  _on('idlKickExecute','click',function(){
    var slots=Number((document.getElementById('idlKickSlots')||{}).value)||5;
    fetch('/api/idleon/kick-candidates?count='+slots).then(function(r){return r.json()}).then(function(d){
      if(!d.success||!d.candidates||!d.candidates.length)return alert('No candidates');
      if(!confirm('Execute kick for '+d.candidates.length+' members? This is logged.'))return;
      var names=d.candidates.map(function(c){return c.name});
      fetch('/api/idleon/bulk-action',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:names,action:'kick'})}).then(function(r){return r.json()}).then(function(r){alert(r.success?'Kicked '+r.updated+' members':'Failed: '+(r.error||''));load();}).catch(function(e){alert(e.message)});
    }).catch(function(e){alert(e.message)});
  });
  _on('idlWaitScan','click',function(){
    fetch('/api/idleon/scan-forum',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      alert(d.success?'Found '+d.added+' new waitlist entries'+(d.skipped?' ('+d.skipped+' already known)':''):'Failed: '+(d.error||''));load();
    }).catch(function(e){alert(e.message)});
  });
  _on('idlWaitAdd','click',function(){
    var name=prompt('Player name:');if(!name)return;
    var notes=prompt('Notes (optional):');
    fetch('/api/idleon/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),notes:notes||''})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  });
  _on('idlPromoScan','click',function(){
    fetch('/api/idleon/scan-promotion',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      alert(d.success?'Found '+(d.added||[]).length+' new promotion entries':'Failed: '+(d.error||''));load();
    }).catch(function(e){alert(e.message)});
  });
  _on('idlPromoAdd','click',function(){
    var name=prompt('Player name:');if(!name)return;
    var guild=prompt('Target guild:');if(!guild)return;
    var notes=prompt('Notes (optional):');
    fetch('/api/idleon/promotion-list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),targetGuild:guild.trim(),notes:notes||''})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  });
  _on('idlAddRole','click',function(){
    var gp=Number(document.getElementById('idlNewRoleGp').value);
    var roleId=(document.getElementById('idlNewRoleId').value||'').trim();
    var roleName=(document.getElementById('idlNewRoleName').value||'').trim();
    if(!gp||!roleId)return alert('GP threshold and Role ID required');
    var ms=((model.config||{}).roleMilestones||[]).concat([{gpThreshold:gp,roleId:roleId,roleName:roleName||roleId}]);
    var cfg=Object.assign({},model.config,{roleMilestones:ms});
    fetch('/api/idleon/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)}).then(function(r){return r.json()}).then(function(d){if(d.success){document.getElementById('idlNewRoleGp').value='';document.getElementById('idlNewRoleId').value='';document.getElementById('idlNewRoleName').value='';load();}}).catch(function(){});
  });
  _on('idlSyncRoles','click',function(){
    document.getElementById('idlRolesStatus').textContent='Syncing...';
    fetch('/api/idleon/sync-roles',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('idlRolesStatus').textContent=d.success?'✅ Added: '+d.added+', Removed: '+d.removed+', Errors: '+d.errors:'❌ '+(d.error||'Failed');
    }).catch(function(e){document.getElementById('idlRolesStatus').textContent='❌ '+e.message;});
  });
  _on('idlAutoLink','click',function(){
    document.getElementById('idlRolesStatus').textContent='Linking...';
    fetch('/api/idleon/auto-link',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('idlRolesStatus').textContent=d.success?'✅ Linked '+d.linked+' members ('+d.unlinked+' still unlinked)':'❌ '+(d.error||'Failed');
      load();
    }).catch(function(e){document.getElementById('idlRolesStatus').textContent='❌ '+e.message;});
  });
  _on('idlGhostRefresh','click',loadGhosts);
  // --- Firebase handlers ---
  function loadFirebaseStatus(){
    fetch('/api/idleon/firebase/status').then(function(r){return r.json()}).then(function(d){
      if(!d.success)return;
      var dot=document.getElementById('fbStatusDot');
      var txt=document.getElementById('fbStatusText');
      var det=document.getElementById('fbStatusDetail');
      var pollCard=document.getElementById('fbCardPollStatus');
      var lastPoll=document.getElementById('fbCardLastPoll');
      if(d.connected){
        dot.style.background='#4caf50';
        txt.textContent='Connected';
        det.textContent='Firebase linked';
        document.getElementById('fbAuthSection').style.display='none';
        document.getElementById('fbDisconnectSection').style.display='block';
        document.getElementById('fbEmail').textContent=d.email||'';
        document.getElementById('fbConnectedAt').textContent=d.connectedAt?new Date(d.connectedAt).toLocaleString():'?';
      } else if(d.pendingAuth){
        dot.style.background='#ff9800';
        txt.textContent='Awaiting Login';
        det.textContent='Enter code: '+d.pendingAuth.userCode;
        document.getElementById('fbAuthSection').style.display='block';
        document.getElementById('fbDisconnectSection').style.display='none';
      } else {
        dot.style.background='#f44336';
        txt.textContent='Not Connected';
        det.textContent='Link a Google account to enable data polling.';
        document.getElementById('fbAuthSection').style.display='block';
        document.getElementById('fbDisconnectSection').style.display='none';
      }
      if(pollCard){
        pollCard.textContent=d.polling?'Active':'Stopped';
        pollCard.style.color=d.polling?'#4caf50':'#8b8fa3';
      }
      if(lastPoll){
        lastPoll.textContent=d.lastPolledAt?'Last: '+new Date(d.lastPolledAt).toLocaleTimeString():'No polls yet';
      }
      document.getElementById('fbPollStatus').textContent=d.polling?'✅ Polling is active':'⏸️ Polling is stopped';
      // Update companion cards
      var gcEl=document.getElementById('fbCardGuildCount');
      if(gcEl)gcEl.textContent=(model.guilds||[]).length;
      var mcEl=document.getElementById('fbCardMemberCount');
      if(mcEl)mcEl.textContent=(model.members||[]).filter(function(m){return m.status!=='kicked'}).length;
    }).catch(function(){});
  }
  var fbAuthPollTimer=null;
  _on('fbStartAuth','click',function(){
    var btn=this;btn.disabled=true;
    fetch('/api/idleon/firebase/start-auth',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      if(!d.success)throw new Error(d.error||'Failed');
      document.getElementById('fbAuthProgress').style.display='block';
      document.getElementById('fbAuthUrl').textContent=d.verificationUrl;
      document.getElementById('fbAuthUrl').href=d.verificationUrl;
      document.getElementById('fbAuthCode').textContent=d.userCode;
      document.getElementById('fbAuthResult').textContent='';
      // Poll for completion
      if(fbAuthPollTimer)clearInterval(fbAuthPollTimer);
      fbAuthPollTimer=setInterval(function(){
        fetch('/api/idleon/firebase/check-auth').then(function(r){return r.json()}).then(function(c){
          if(c.status==='success'){
            clearInterval(fbAuthPollTimer);fbAuthPollTimer=null;
            document.getElementById('fbAuthProgress').style.display='none';
            document.getElementById('fbAuthResult').innerHTML='<span style="color:#4caf50">✅ Connected as '+safe(c.email)+'</span>';
            btn.disabled=false;
            loadFirebaseStatus();
          } else if(c.status==='error'){
            clearInterval(fbAuthPollTimer);fbAuthPollTimer=null;
            document.getElementById('fbAuthProgress').style.display='none';
            document.getElementById('fbAuthResult').innerHTML='<span style="color:#f44336">❌ '+safe(c.error)+'</span>';
            btn.disabled=false;
          }
        }).catch(function(){});
      },3000);
    }).catch(function(e){document.getElementById('fbAuthResult').innerHTML='<span style="color:#f44336">❌ '+safe(e.message)+'</span>';btn.disabled=false;});
  });
  _on('fbDisconnect','click',function(){
    if(!confirm('Disconnect Google account? Polling will stop.'))return;
    fetch('/api/idleon/firebase/disconnect',{method:'POST'}).then(function(r){return r.json()}).then(function(){
      loadFirebaseStatus();
    }).catch(function(){});
  });
  _on('fbSearchBtn','click',function(){
    var name=(document.getElementById('fbGuildSearch').value||'').trim();
    if(!name)return;
    var el=document.getElementById('fbSearchResults');
    el.textContent='Searching...';
    fetch('/api/idleon/firebase/search-guild',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name})}).then(function(r){return r.json()}).then(function(d){
      if(!d.success)throw new Error(d.error||'Failed');
      if(!d.guilds||!d.guilds.length){el.textContent='No guilds found matching "'+safe(name)+'"';return;}
      el.innerHTML=d.guilds.map(function(g){
        var already=(model.guilds||[]).find(function(x){return x.id===g.id});
        return '<div style="display:flex;align-items:center;gap:10px;padding:6px 0;border-bottom:1px solid #2a2f3a">' +
          '<strong>'+safe(g.name)+'</strong> <span style="color:#8b8fa3;font-size:12px">ID: '+safe(g.id)+'</span> ' +
          (already ? '<span style="color:#4caf50;font-size:12px">✅ Already tracked</span>' : '<button class="small fb-add-guild" data-gid="'+safe(g.id)+'" data-gname="'+safe(g.name)+'" style="margin:0;font-size:11px;background:#4caf50">➕ Add</button>') +
          '</div>';
      }).join('');
      el.querySelectorAll('.fb-add-guild').forEach(function(btn){
        btn.addEventListener('click',function(){
          var gid=this.dataset.gid,gname=this.dataset.gname;
          fetch('/api/idleon/firebase/add-guild',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:gid,name:gname})}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Added!');location.reload();}else{alert(d.error||'Failed')}}).catch(function(e){alert(e.message)});
        });
      });
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+safe(e.message)+'</span>';});
  });
  _on('fbRefreshNow','click',function(){
    var el=document.getElementById('fbRefreshResult');
    el.textContent='Fetching from Firebase...';
    fetch('/api/idleon/firebase/refresh',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      if(!d.success)throw new Error(d.error||'Failed');
      var html='<span style="color:#4caf50">✅ Polled at '+new Date(d.polledAt).toLocaleTimeString()+'</span><br>';
      (d.results||[]).forEach(function(r){
        html+='<div style="padding:2px 0">'+(r.success?'✅':'❌')+' <strong>'+safe(r.guildName)+'</strong> — '+(r.success?r.memberCount+' members, '+r.changes+' changes':'Error: '+safe(r.error))+'</div>';
      });
      el.innerHTML=html;
      load(); // refresh main data
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+safe(e.message)+'</span>';});
  });
  _on('fbStartPoll','click',function(){
    var mins=Number(document.getElementById('fbPollInterval').value)||60;
    fetch('/api/idleon/firebase/polling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'start',intervalMinutes:mins})}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('fbPollStatus').textContent=d.success?'✅ Polling every '+d.intervalMinutes+' min':'❌ '+(d.error||'Failed');
    }).catch(function(){});
  });
  _on('fbStopPoll','click',function(){
    fetch('/api/idleon/firebase/polling',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({action:'stop'})}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('fbPollStatus').textContent=d.success?'⏸️ Polling stopped':'❌ '+(d.error||'Failed');
    }).catch(function(){});
  });
  if(currentPanel==='firebase')loadFirebaseStatus();

  _on('idlScanForum','click',function(){
    document.getElementById('idlScanForumResult').textContent='Scanning...';
    fetch('/api/idleon/scan-forum',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('idlScanForumResult').innerHTML=d.success?'✅ Added: '+d.added+', Skipped: '+(d.skipped||0):'❌ '+(d.error||'Failed');
      load();
    }).catch(function(e){document.getElementById('idlScanForumResult').textContent='❌ '+e.message;});
  });
  _on('idlSendDigest','click',function(){
    document.getElementById('idlDigestResult').textContent='Sending...';
    fetch('/api/idleon/digest',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('idlDigestResult').innerHTML=d.success?'✅ Digest sent!':'❌ '+(d.error||'Failed');
    }).catch(function(e){document.getElementById('idlDigestResult').textContent='❌ '+e.message;});
  });

  // --- Dry Run Roles ---
  _on('idlSyncRolesDry','click',function(){
    var el=document.getElementById('idlDryRunResult');if(!el)return;
    el.innerHTML='<span style="color:#ff9800">Running dry run...</span>';
    fetch('/api/idleon/sync-roles-dry',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      if(!d.success){el.innerHTML='<span style="color:#f44336">❌ '+(d.error||'Failed')+'</span>';return;}
      if(!d.changes||!d.changes.length){el.innerHTML='<span style="color:#4caf50">✅ No changes needed — all roles are up to date.</span>';return;}
      el.innerHTML='<b>'+d.changes.length+' changes would be made:</b><div style="max-height:200px;overflow-y:auto;margin-top:6px;font-size:12px">'+d.changes.map(function(c){
        return'<div style="padding:3px 0;border-bottom:1px solid #2a2f3a">'+(c.action==='add'?'<span style="color:#4caf50">+ Add</span>':'<span style="color:#f44336">- Remove</span>')+' <b>'+safe(c.roleName)+'</b> → '+safe(c.memberName)+'</div>';
      }).join('')+'</div>';
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+e.message+'</span>';});
  });

  // --- Config Export/Import/Reset ---
  _on('idlCfgExport','click',function(){
    var blob=new Blob([JSON.stringify(model.config,null,2)],{type:'application/json'});
    var a=document.createElement('a');a.href=URL.createObjectURL(blob);a.download='idleon-config.json';a.click();URL.revokeObjectURL(a.href);
  });
  _on('idlCfgImport','click',function(){document.getElementById('idlCfgImportFile').click()});
  _on('idlCfgImportFile','change',function(e){
    var file=e.target.files[0];if(!file)return;
    var reader=new FileReader();reader.onload=function(ev){
      try{var cfg=JSON.parse(ev.target.result);
        fetch('/api/idleon/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)}).then(function(r){return r.json()}).then(function(d){
          document.getElementById('idlCfgStatus').textContent=d.success?'✅ Imported!':'❌ '+(d.error||'Failed');if(d.success)load();
        }).catch(function(err){document.getElementById('idlCfgStatus').textContent='❌ '+err.message;});
      }catch(err){document.getElementById('idlCfgStatus').textContent='❌ Invalid JSON';}
    };reader.readAsText(file);
  });
  _on('idlCfgReset','click',function(){
    if(!confirm('Reset config to defaults? Current settings will be lost.'))return;
    fetch('/api/idleon/config/reset',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      document.getElementById('idlCfgStatus').textContent=d.success?'✅ Reset to defaults':'❌ '+(d.error||'Failed');if(d.success)load();
    }).catch(function(e){document.getElementById('idlCfgStatus').textContent='❌ '+e.message;});
  });

  // --- Backup handlers ---
  _on('idlBackupCreate','click',function(){
    var el=document.getElementById('idlBackupStatus');el.textContent='Creating backup...';
    fetch('/api/idleon/backup',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      el.innerHTML=d.success?'<span style="color:#4caf50">✅ Backup created: '+safe(d.name||'')+'</span>':'<span style="color:#f44336">❌ '+(d.error||'Failed')+'</span>';
      renderBackupList();
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+e.message+'</span>';});
  });
  _on('idlBackupRefresh','click',renderBackupList);

  // --- Integrity ---
  _on('idlIntegrityRun','click',function(){
    var el=document.getElementById('idlIntegrityResult');el.innerHTML='<span style="color:#ff9800">Checking...</span>';
    fetch('/api/idleon/integrity').then(function(r){return r.json()}).then(function(d){
      if(!d.success){el.innerHTML='<span style="color:#f44336">❌ '+(d.error||'Failed')+'</span>';return;}
      var issues=d.issues||[];
      if(!issues.length){el.innerHTML='<span style="color:#4caf50">✅ No issues found. Data integrity OK.</span>';return;}
      el.innerHTML='<b style="color:#ff9800">⚠️ '+issues.length+' issues found:</b><div style="max-height:200px;overflow-y:auto;margin-top:6px">'+issues.map(function(is){
        return'<div style="padding:4px 0;border-bottom:1px solid #2a2f3a;font-size:12px"><span style="color:#ff9800">'+safe(is.type)+'</span> — '+safe(is.detail)+'</div>';
      }).join('')+'</div>';
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+e.message+'</span>';});
  });

  // --- Export data ---
  _on('idlExportCsv','click',function(){window.open('/api/idleon/export?format=csv','_blank');});
  _on('idlExportJson','click',function(){window.open('/api/idleon/export?format=json','_blank');});

  load();
})();
</script>`;
}

export function renderIdleonGuildMgmtTab(userTier) {
  const { membersCache } = _getState();
  const TIER_LEVELS = { owner: 4, admin: 3, moderator: 2, viewer: 1 };
  const canWrite = TIER_LEVELS[userTier] >= TIER_LEVELS.admin;
  if (!canWrite) return '<div class="card"><p style="color:#ef5350">🔒 Admin access required.</p></div>';
  return `
<style>
  .gm-nav-btns{display:flex;flex-wrap:wrap;gap:8px}
  .gm-nav-btn{display:inline-flex!important;align-items:center;gap:6px;padding:10px 16px;border-radius:10px;border:2px solid #3a3a42;background:#1e1e24;color:#ccc;font-size:13px;font-weight:600;cursor:pointer;transition:all .15s;width:auto!important;flex-shrink:0}
  .gm-nav-btn:hover{background:#2a2f3a;border-color:#555;color:#fff}
  .gm-nav-btn.active{background:linear-gradient(135deg,#7c3aed22,#7c3aed11);border-color:#7c3aed;color:#b794f6;box-shadow:0 0 12px #7c3aed22}
  .gm-nav-btn .btn-icon{font-size:18px}
  .gm-scroll-list{max-height:none;overflow:hidden;position:relative;transition:max-height .3s}
  .gm-scroll-list.capped{max-height:260px;overflow-y:auto;scrollbar-width:none;-ms-overflow-style:none}
  .gm-scroll-list.capped::-webkit-scrollbar{display:none}
  .gm-scroll-list.capped::after{content:'';position:sticky;bottom:0;left:0;right:0;height:32px;display:block;background:linear-gradient(transparent,#17171b);pointer-events:none}
  .gm-done-badge{display:inline-flex;align-items:center;gap:3px;background:#4caf5018;color:#4caf50;padding:2px 8px;border-radius:10px;font-size:11px;font-weight:600}
</style>
<div class="card">
  <h2>🏰 Guild Management</h2>
  <p style="color:#8b8fa3">Kick queue, recruitment waitlist, promotions, auto-kick system, roles &amp; member linking.</p>
</div>

<div class="card" style="padding:12px 14px">
  <div class="gm-nav-btns" id="gmNavTabs">
    <button class="gm-nav-btn active" data-gm="kicks"><span class="btn-icon">🚪</span> Kicks &amp; Waitlist</button>
    <button class="gm-nav-btn" data-gm="roles"><span class="btn-icon">🏅</span> Roles &amp; Links</button>
  </div>
</div>

<!-- Kicks & Waitlist Panel (default) -->
<div id="gmKicks" class="gm-panel">
  <div class="card">
    <h2>🚪 Smart Kick Queue</h2>
    <p style="color:#8b8fa3">Members ranked by kick priority. LOA and exempt members excluded.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px">
      <label style="font-size:13px">Free up <input type="number" id="gmKickSlots" value="5" min="1" max="50" style="width:60px;margin:0"> slots</label>
      <button class="small" id="gmKickRefresh" style="margin:0">🔄 Refresh</button>
      <button class="small" id="gmKickSendWarnings" style="margin:0;background:#b8860b;color:#fff">⚠️ Send Warning DMs</button>
    </div>
    <div style="border:1px solid #3a3a42;border-radius:8px;background:#17171b">
      <table style="margin:0"><thead><tr><th style="width:60px">Priority</th><th>Member</th><th>Guild</th><th style="width:90px">Days Away</th><th>Risk</th><th>GP</th><th>Reason</th></tr></thead>
      <tbody id="gmKickRows"><tr><td colspan="7" style="text-align:center;color:#8b8fa3">Loading...</td></tr></tbody></table>
    </div>
    <div id="gmKickImpact" style="margin-top:10px;font-size:13px;color:#8b8fa3"></div>
    <div id="gmKickAutoStatus" style="margin-top:4px;font-size:11px;color:#8b8fa3">Auto-refresh: waiting for Firebase data</div>
  </div>

  <!-- Player Info Modal -->
  <div id="gmPlayerModal" style="display:none;position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,.6);z-index:9999;justify-content:center;align-items:center">
    <div style="background:#1e1e26;border:1px solid #3a3a42;border-radius:12px;max-width:520px;width:92%;max-height:85vh;overflow-y:auto;padding:20px;position:relative">
      <button id="gmPlayerModalClose" style="position:absolute;top:10px;right:14px;background:none;border:none;color:#8b8fa3;font-size:20px;cursor:pointer">&times;</button>
      <div id="gmPlayerModalContent"></div>
    </div>
  </div>

  <div class="card">
    <h2>📋 Recruitment Waitlist</h2>
    <p style="color:#8b8fa3">People waiting to join. Scan forum channel or add manually.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
      <button class="small" id="gmWaitScan" style="margin:0;background:#2196f3">🔍 Scan Forum</button>
      <button class="small" id="gmWaitAdd" style="margin:0;background:#4caf50">+ Add Manually</button>
      <div style="position:relative;margin-left:4px">
        <input id="gmWaitSearch" type="text" placeholder="🔍 Check if in guild..." style="padding:5px 10px;background:#0e0e12;border:1px solid #3a3a42;border-radius:6px;color:#e0e0e0;font-size:12px;width:180px;outline:none">
        <div id="gmWaitSearchResult" style="display:none;position:absolute;top:100%;left:0;margin-top:4px;background:#1e1e26;border:1px solid #3a3a42;border-radius:6px;padding:6px 10px;font-size:12px;white-space:nowrap;z-index:100;min-width:200px;box-shadow:0 4px 12px rgba(0,0,0,.4)"></div>
      </div>
      <span id="gmWaitAutoStatus" style="font-size:11px;color:#8b8fa3;margin-left:auto">⏳ Auto-check: off</span>
    </div>
    <div id="gmWaitListWrap" class="gm-scroll-list" style="border:1px solid #3a3a42;border-radius:8px;background:#17171b">
      <table style="margin:0"><thead><tr><th>#</th><th>Name</th><th>Added</th><th>Notes</th><th>Priority</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="gmWaitRows"></tbody></table>
    </div>
  </div>

  <div class="card">
    <h2>🔼 Guild Promotion List</h2>
    <p style="color:#8b8fa3">People wanting to move to a different guild. Scan the promotion thread or add manually.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:10px;align-items:center">
      <button class="small" id="gmPromoScan" style="margin:0;background:#2196f3">🔍 Scan Promotion Thread</button>
      <button class="small" id="gmPromoAdd" style="margin:0;background:#4caf50">+ Add Manually</button>
      <span id="gmPromoAutoStatus" style="font-size:11px;color:#8b8fa3;margin-left:auto">⏳ Auto-check: off</span>
    </div>
    <div id="gmPromoListWrap" class="gm-scroll-list" style="border:1px solid #3a3a42;border-radius:8px;background:#17171b">
      <table style="margin:0"><thead><tr><th>#</th><th>Name</th><th>Current Guild</th><th>Target Guild</th><th>Status</th><th>Actions</th></tr></thead>
      <tbody id="gmPromoRows"></tbody></table>
    </div>
  </div>

</div>

<!-- Roles & Links Panel -->
<div id="gmRoles" class="gm-panel" style="display:none">
  <div class="card">
    <h2>🏅 GP Role Milestones</h2>
    <p style="color:#8b8fa3">Define GP thresholds that auto-assign Discord roles. Members must be linked to their Discord account.</p>
    <div id="gmRolesList"></div>
    <div style="display:flex;gap:8px;margin-top:12px;flex-wrap:wrap">
      <input type="number" id="gmNewRoleGp" placeholder="GP threshold" style="margin:0;width:140px">
      <input type="text" id="gmNewRoleId" placeholder="Discord Role ID" style="margin:0;width:200px">
      <input type="text" id="gmNewRoleName" placeholder="Role name (display)" style="margin:0;flex:1;min-width:150px">
      <button class="small" id="gmAddRole" style="margin:0;background:#4caf50">+ Add Milestone</button>
    </div>
    <div style="margin-top:12px;display:flex;gap:8px;flex-wrap:wrap">
      <button class="small" id="gmSyncRoles" style="margin:0;background:#7c3aed">🔄 Sync Roles Now</button>
      <button class="small" id="gmSyncRolesDry" style="margin:0;background:#ff9800">👁 Dry Run</button>
      <button class="small" id="gmAutoLink" style="margin:0;background:#2196f3">🔗 Auto-Link Members</button>
    </div>
    <div id="gmRolesStatus" style="margin-top:8px;font-size:13px;color:#8b8fa3"></div>
    <div id="gmDryRunResult" style="margin-top:8px;font-size:13px"></div>
  </div>

  <div class="card">
    <h2>👻 Ghost Detection</h2>
    <p style="color:#8b8fa3">Cross-reference IdleOn members with Discord server members to find mismatches. Fuzzy matching detects similar names.</p>
    <div style="display:flex;gap:10px;flex-wrap:wrap;margin-bottom:10px" id="gmGhostStats"></div>
    <div style="display:flex;gap:8px;align-items:center;flex-wrap:wrap;margin-bottom:10px">
      <button class="small" id="gmGhostRefresh" style="margin:0;background:#2196f3">🔄 Refresh</button>
      <button class="small" id="gmGhostAutoLink" style="margin:0;background:#4caf50">🔗 Auto-Link All Confident Matches</button>
      <input id="gmGhostSearch" type="text" placeholder="🔍 Search by name..." style="padding:5px 10px;background:#0e0e12;border:1px solid #3a3a42;border-radius:6px;color:#e0e0e0;font-size:12px;width:200px;outline:none">
      <label style="font-size:11px;color:#8b8fa3;display:flex;align-items:center;gap:4px"><input type="checkbox" id="gmGhostHideIgnored" checked> Hide ignored</label>
    </div>
    <div style="display:flex;gap:6px;margin-bottom:10px">
      <button class="small" id="gmGhostTabUnlinked" style="margin:0;background:#2196f3;padding:4px 14px;font-size:11px" data-gm-ghost-tab="unlinked">🔗 Unlinked Players</button>
      <button class="small" id="gmGhostTabGhosts" style="margin:0;background:#3a3a42;padding:4px 14px;font-size:11px" data-gm-ghost-tab="ghosts">👻 Discord Ghosts</button>
    </div>
    <div id="gmGhostResults"></div>
  </div>
</div>

<script>
(function(){
  var model={members:[],guilds:[],config:{},kickLog:[],waitlist:[],promotionList:[],importLog:[]};
  var currentPanel='kicks';
  function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function fmtN(n){return Number(n||0).toLocaleString();}
  function normHist(r){return(Array.isArray(r)?r:[]).map(function(h){return{weekStart:String(h.weekStart||'').slice(0,10),gp:Math.max(0,Number(h.gp||0))}}).filter(function(h){return /^\\d{4}-\\d{2}-\\d{2}$/.test(h.weekStart)&&Number.isFinite(h.gp)});}
  function guildName(id){var g=(model.guilds||[]).find(function(x){return x.id===id});return g?g.name:(id||'-');}

  function showPanel(name){
    currentPanel=name;
    document.querySelectorAll('.gm-panel').forEach(function(p){p.style.display='none'});
    var el=document.getElementById('gm'+name.charAt(0).toUpperCase()+name.slice(1));
    if(el)el.style.display='block';
    if(name==='kicks'){renderKickQueue();renderWaitlist();renderPromotionList();startKickAutoRefresh();}
    if(name==='roles'){renderRoles();loadGhosts();}
  }

  // --- Kick Queue (always shows first 5, auto-refreshes on firebase data) ---
  var _kickRefreshTimer=null;
  function renderKickQueue(){
    var el=document.getElementById('gmKickRows');if(!el)return;
    var slots=Number((document.getElementById('gmKickSlots')||{}).value)||5;
    fetch('/api/idleon/kick-candidates?count='+Math.max(slots,5)).then(function(r){return r.json()}).then(function(d){
      if(!d.success)return;
      el.innerHTML=(d.candidates||[]).map(function(c,i){
        return'<tr><td>'+(i+1)+'</td><td><a href="#" data-gm-player="'+safe(c.name)+'" style="color:#4fc3f7;text-decoration:none;cursor:pointer">'+safe(c.name)+'</a></td><td>'+safe(guildName(c.guildId))+'</td><td>'+c.daysAway+'d</td><td>'+c.kickRiskScore+'</td><td>'+fmtN(c.allTimeGp)+'</td><td style="font-size:12px;color:#8b8fa3">'+safe(c.reason||'')+'</td></tr>';
      }).join('')||'<tr><td colspan="7" style="text-align:center;color:#8b8fa3">No kick candidates</td></tr>';
      if(d.impact){document.getElementById('gmKickImpact').innerHTML='Impact: avg GP would change from '+fmtN(d.impact.beforeAvg)+' to '+fmtN(d.impact.afterAvg)+' ('+(d.impact.change>=0?'+':'')+d.impact.change+'%)';}
      var ks=document.getElementById('gmKickAutoStatus');if(ks)ks.innerHTML='<span style="color:#4caf50">✅ Last refreshed: '+new Date().toLocaleTimeString()+'</span>';
    }).catch(function(){});
  }
  // Auto-refresh kick queue when firebase data arrives (poll status every 30s)
  function startKickAutoRefresh(){
    if(_kickRefreshTimer)return;
    var lastPolledAt=0;
    _kickRefreshTimer=setInterval(function(){
      fetch('/api/idleon/firebase/status').then(function(r){return r.json()}).then(function(d){
        if(d.success&&d.lastPolledAt&&d.lastPolledAt!==lastPolledAt){
          lastPolledAt=d.lastPolledAt;
          renderKickQueue();
          // also refresh waitlist & promotion data
          load();
        }
      }).catch(function(){});
    },30000);
  }

  // --- Waitlist (auto-check: remove if in guild, mark done, scrollable >5) ---
  function normalizeName(n){return String(n||'').replace(/[^A-Za-z0-9_]/g,'').toLowerCase();}
  var _waitlistInterval=null;
  function applyCap(wrapperId,count){
    var wrap=document.getElementById(wrapperId);
    if(!wrap)return;
    if(count>5){wrap.classList.add('capped');}else{wrap.classList.remove('capped');}
  }
  function renderWaitlist(){
    var el=document.getElementById('gmWaitRows');if(!el)return;
    var memberNames={};(model.members||[]).filter(function(m){return m.status!=='kicked'}).forEach(function(m){memberNames[normalizeName(m.name)]=1;});
    // Filter out "done" entries from active display but keep them so scanner won't re-add
    var wl=(model.waitlist||[]).sort(function(a,b){
      // done/in-guild go to bottom
      var aInGuild=memberNames[normalizeName(a.name)]||a.status==='done';
      var bInGuild=memberNames[normalizeName(b.name)]||b.status==='done';
      if(aInGuild&&!bInGuild)return 1;if(!aInGuild&&bInGuild)return -1;
      return(b.priority||0)-(a.priority||0);
    });
    el.innerHTML=wl.map(function(w,i){
      var inGuild=memberNames[normalizeName(w.name)];
      var isDone=w.status==='done'||inGuild;
      var statusLabel=isDone?'<span class="gm-done-badge">✅ Done</span>':w.status==='confirmed'?'<span style="color:#2196f3">✔ Confirmed</span>':'<span style="color:#ff9800">⏳ Waiting</span>';
      var waitMs=Date.now()-(w.addedAt||Date.now());var waitHrs=Math.floor(waitMs/36e5);
      var waitStr=waitHrs>=24?Math.floor(waitHrs/24)+'d '+waitHrs%24+'h':waitHrs+'h';
      return'<tr'+(isDone?' style="opacity:0.45"':'')+'><td>'+(i+1)+'</td><td>'+safe(w.name)+'</td><td>'+new Date(w.addedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+' <span style="color:#8b8fa3;font-size:11px">('+waitStr+')</span></td><td>'+safe(w.notes||'-')+'</td><td>'+safe(w.priority||'normal')+'</td><td>'+statusLabel+'</td><td style="white-space:nowrap">'+(isDone?'':'<button class="small" data-gm-confirmwait="'+safe(w.id)+'" style="margin:0;padding:2px 6px;font-size:11px;background:#2196f3" title="Manually confirm recruited">✅</button> ')+'<button class="small danger" data-gm-delwait="'+safe(w.id)+'" style="margin:0;padding:2px 6px;font-size:11px">🗑️</button></td></tr>';
    }).join('')||'<tr><td colspan="7" style="text-align:center;color:#8b8fa3">Waitlist empty. Scan forum or add manually.</td></tr>';
    applyCap('gmWaitListWrap',wl.length);
    var statusEl=document.getElementById('gmWaitAutoStatus');
    if(statusEl)statusEl.innerHTML='<span style="color:#4caf50">🔄 Auto-check: on (15s)</span>';
    if(!_waitlistInterval){
      _waitlistInterval=setInterval(function(){
        // First scan forum for new entries
        fetch('/api/idleon/scan-forum',{method:'POST'}).then(function(r){return r.json()}).then(function(scanResult){
          var statusEl=document.getElementById('gmWaitAutoStatus');
          if(statusEl&&scanResult.success&&scanResult.added&&scanResult.added.length>0){
            statusEl.innerHTML='<span style="color:#4caf50">✅ Auto-scan found '+scanResult.added.length+' new</span>';
          }
          // Fetch updated waitlist
          return fetch('/api/idleon/waitlist').then(function(r){return r.json()});
        }).then(function(d){
          if(d&&d.success){
            model.waitlist=d.waitlist||[];
            // Auto-mark as done if name is in guild members
            var memberNames={};(model.members||[]).filter(function(m){return m.status!=='kicked'}).forEach(function(m){memberNames[normalizeName(m.name)]=1;});
            var changed=false;
            (model.waitlist||[]).forEach(function(w){
              if(w.status!=='done'&&memberNames[normalizeName(w.name)]){
                // Auto-mark as done on the server
                fetch('/api/idleon/waitlist/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:w.id,status:'done'})}).catch(function(){});
                w.status='done';changed=true;
              }
            });
            renderWaitlist();
          }
        }).catch(function(){});
      },15000);
    }
  }
  document.getElementById('gmWaitRows').addEventListener('click',function(e){
    var btn=e.target.closest('[data-gm-delwait]');
    if(btn){fetch('/api/idleon/waitlist/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:btn.dataset.gmDelwait})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error)}).catch(function(e){alert(e.message)});}
    var cbtn=e.target.closest('[data-gm-confirmwait]');
    if(cbtn){fetch('/api/idleon/waitlist/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cbtn.dataset.gmConfirmwait,status:'confirmed'})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});}
  });

  // --- Promotion List (auto-check: detect target guild, scrollable >5) ---
  var _promoInterval=null;
  function renderPromotionList(){
    var el=document.getElementById('gmPromoRows');if(!el)return;
    var pl=(model.promotionList||[]).sort(function(a,b){
      // done items go to bottom
      var aDone=a.status==='confirmed';var bDone=b.status==='confirmed';
      if(aDone&&!bDone)return 1;if(!aDone&&bDone)return -1;
      return(a.addedAt||0)-(b.addedAt||0);
    });
    var memberMap={};(model.members||[]).forEach(function(m){memberMap[normalizeName(m.name)]=m;});
    // Build guild name lookup (lowercase)
    var guildNameToId={};(model.guilds||[]).forEach(function(g){guildNameToId[g.name.toLowerCase()]=g.id;});
    el.innerHTML=pl.map(function(p,i){
      var mem=memberMap[normalizeName(p.name)];
      var curGuild=mem?guildName(mem.guildId):'Unknown';
      // Auto-detect if member is now in target guild
      var targetLower=(p.targetGuild||'').toLowerCase();
      var targetGuildId=guildNameToId[targetLower];
      var isInTarget=mem&&targetGuildId&&mem.guildId===targetGuildId;
      var isDone=p.status==='confirmed'||isInTarget;
      var statusLabel=isDone?'<span class="gm-done-badge">✅ Done</span>':'<span style="color:#ff9800">⏳ Waiting</span>';
      return'<tr'+(isDone?' style="opacity:0.45"':'')+'><td>'+(i+1)+'</td><td>'+safe(p.name)+'</td><td>'+safe(curGuild)+'</td><td>'+safe(p.targetGuild||'-')+'</td><td>'+statusLabel+'</td><td style="white-space:nowrap">'+(isDone?'':'<button class="small" data-gm-confirmpromo="'+safe(p.id)+'" style="margin:0;padding:2px 6px;font-size:11px;background:#2196f3" title="Confirm promoted">✅</button> ')+'<button class="small danger" data-gm-delpromo="'+safe(p.id)+'" style="margin:0;padding:2px 6px;font-size:11px">🗑️</button></td></tr>';
    }).join('')||'<tr><td colspan="6" style="text-align:center;color:#8b8fa3">Promotion list empty. Scan thread or add manually.</td></tr>';
    applyCap('gmPromoListWrap',pl.length);
    // Auto-check promotion list (same interval as waitlist)
    var promoStatus=document.getElementById('gmPromoAutoStatus');
    if(promoStatus)promoStatus.innerHTML='<span style="color:#4caf50">🔄 Auto-check: on (15s)</span>';
    if(!_promoInterval){
      _promoInterval=setInterval(function(){
        // Re-fetch member data and check promotions
        fetch('/api/idleon/gp').then(function(r){return r.json()}).then(function(d){
          if(!d.success)return;
          model.members=d.members||[];model.guilds=d.guilds||[];
          model.promotionList=d.promotionList||[];
          // Auto-confirm promotions where member is in target guild
          var memberMap2={};(model.members||[]).forEach(function(m){memberMap2[m.name.toLowerCase()]=m;});
          var guildNameToId2={};(model.guilds||[]).forEach(function(g){guildNameToId2[g.name.toLowerCase()]=g.id;});
          (model.promotionList||[]).forEach(function(p){
            if(p.status==='confirmed')return;
            var mem2=memberMap2[(p.name||'').toLowerCase()];
            var tId=guildNameToId2[(p.targetGuild||'').toLowerCase()];
            if(mem2&&tId&&mem2.guildId===tId){
              fetch('/api/idleon/promotion-list/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:p.id,status:'confirmed'})}).catch(function(){});
              p.status='confirmed';
            }
          });
          renderPromotionList();
        }).catch(function(){});
      },15000);
    }
  }
  // Promotion list event delegation
  document.getElementById('gmPromoRows').addEventListener('click',function(e){
    var btn=e.target.closest('[data-gm-delpromo]');
    if(btn){fetch('/api/idleon/promotion-list/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:btn.dataset.gmDelpromo})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error)}).catch(function(e){alert(e.message)});}
    var cbtn=e.target.closest('[data-gm-confirmpromo]');
    if(cbtn){fetch('/api/idleon/promotion-list/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:cbtn.dataset.gmConfirmpromo,status:'confirmed'})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});}
  });

  // --- Roles ---
  function renderRoles(){
    var el=document.getElementById('gmRolesList');if(!el)return;
    var milestones=(model.config&&model.config.roleMilestones)||[];
    milestones.sort(function(a,b){return(a.gpThreshold||0)-(b.gpThreshold||0)});
    el.innerHTML=milestones.map(function(r){
      return'<div style="display:flex;align-items:center;gap:8px;padding:6px;border-bottom:1px solid #2a2f3a"><span style="flex:1">🏅 <b>'+fmtN(r.gpThreshold)+' GP</b> → '+safe(r.roleName||r.roleId)+' <span style="color:#8b8fa3;font-size:11px">('+safe(r.roleId)+')</span></span><button class="small danger" data-gm-delrole="'+r.gpThreshold+'" style="margin:0;padding:2px 8px;font-size:11px">🗑️</button></div>';
    }).join('')||'<div style="color:#8b8fa3;padding:8px">No milestones configured.</div>';
  }
  document.getElementById('gmRolesList').addEventListener('click',function(e){
    var btn=e.target.closest('[data-gm-delrole]');if(!btn)return;
    var gp=Number(btn.dataset.gmDelrole);
    var ms=((model.config||{}).roleMilestones||[]).filter(function(r){return r.gpThreshold!==gp});
    var cfg=Object.assign({},model.config,{roleMilestones:ms});
    fetch('/api/idleon/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)}).then(function(r){return r.json()}).then(function(d){if(d.success)load();}).catch(function(){});
  });

  // --- Ghosts ---
  var ghostData=null;var ghostTab='unlinked';var ghostSearch='';var ghostHideIgnored=true;

  function renderGhostStats(){
    var el=document.getElementById('gmGhostStats');if(!el||!ghostData)return;
    var s=ghostData.stats||{};
    el.innerHTML=[
      {n:s.linked||0,l:'Linked',c:'#4caf50'},{n:s.totalActive||0,l:'Total Active',c:'#4fc3f7'},
      {n:s.unlinked||0,l:'Unlinked',c:'#ff9800'},{n:s.ghosts||0,l:'Discord Ghosts',c:'#f44336'}
    ].map(function(x){return '<div style="background:#1a1a22;border:1px solid #2a2f3a;border-radius:8px;padding:6px 14px;text-align:center"><div style="font-size:18px;font-weight:700;color:'+x.c+'">'+x.n+'</div><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase;letter-spacing:.4px">'+x.l+'</div></div>';}).join('');
  }
  function scoreColor(s){return s>=85?'#4caf50':s>=65?'#8bc34a':s>=50?'#ff9800':'#f44336';}
  function renderGhostContent(){
    var el=document.getElementById('gmGhostResults');if(!el||!ghostData)return;
    var q=ghostSearch.toLowerCase();
    if(ghostTab==='unlinked'){
      var items=(ghostData.unlinked||[]).filter(function(n){
        if(ghostHideIgnored&&n.ignored)return false;
        if(q){var hay=(n.idleonName||'').toLowerCase();var sugHay=n.suggestions?n.suggestions.map(function(s){return(s.displayName||'')+' '+(s.username||'')}).join(' ').toLowerCase():'';if(hay.indexOf(q)===-1&&sugHay.indexOf(q)===-1)return false;}
        return true;
      });
      if(!items.length){el.innerHTML='<div style="color:#4caf50;padding:12px">\\u2705 '+(q?'No unlinked players match your search':'All players are linked!')+'</div>';return;}
      var allDiscord=ghostData.allDiscord||[];
      el.innerHTML='<div style="font-size:11px;color:#666;margin-bottom:6px">Showing '+items.length+' unlinked player'+(items.length>1?'s':'')+'</div><div style="border:1px solid #2a2f3a;border-radius:8px;overflow:hidden;background:#17171b"><table style="width:100%;border-collapse:collapse;font-size:12px;margin:0"><thead><tr style="border-bottom:2px solid #2a2f3a"><th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">IdleOn Name</th><th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Guild</th><th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Best Matches</th><th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase;width:220px">Manual Link</th><th style="padding:8px 10px;text-align:center;color:#8b8fa3;font-size:10px;text-transform:uppercase;width:80px">Actions</th></tr></thead><tbody>'+items.map(function(n){
        var sugs=n.suggestions||[];
        var sugHtml=sugs.length?sugs.map(function(s){return '<div style="display:flex;align-items:center;gap:4px;margin:1px 0"><span style="background:'+scoreColor(s.score)+'22;color:'+scoreColor(s.score)+';padding:1px 6px;border-radius:10px;font-size:9px;font-weight:700;min-width:28px;text-align:center">'+s.score+'%</span><span style="font-weight:600">'+safe(s.displayName||s.username)+'</span>'+(s.username&&s.displayName&&s.username!==s.displayName?' <span style="color:#8b8fa3;font-size:10px">('+safe(s.username)+')</span>':'')+'<button class="small" data-gm-ghost-link="'+safe(n.idleonName)+'" data-gm-ghost-did="'+safe(s.id)+'" style="margin:0;padding:1px 6px;font-size:9px;background:#4caf5022;color:#4caf50;border:1px solid #4caf5044" title="Link">\\u2714 Link</button></div>';}).join(''):'<span style="color:#555">No matches found</span>';
        var guildLabel=n.guildId?safe(guildName(n.guildId)):'<span style="color:#555">\\u2014</span>';
        return '<tr style="border-bottom:1px solid #1e1e24'+(n.ignored?';opacity:.5':'')+'"><td style="padding:8px 10px;font-weight:600;color:#e8e8ec">'+safe(n.idleonName)+'</td><td style="padding:8px 10px">'+guildLabel+'</td><td style="padding:8px 10px">'+sugHtml+'</td><td style="padding:8px 10px"><select class="gm-ghost-manual-sel" data-gm-ghost-manual="'+safe(n.idleonName)+'" style="width:100%;padding:4px 6px;background:#0e0e12;border:1px solid #3a3a42;border-radius:4px;color:#e0e0e0;font-size:11px"><option value="">Select Discord user...</option></select></td><td style="padding:8px 10px;text-align:center"><button class="small" data-gm-ghost-ignore="'+safe(n.idleonName)+'" data-gm-ghost-ignored="'+(n.ignored?'1':'0')+'" style="margin:0;padding:2px 6px;font-size:10px;background:'+(n.ignored?'#ff980022':'#3a3a42')+';color:'+(n.ignored?'#ff9800':'#8b8fa3')+'">'+(n.ignored?'\\uD83D\\uDC41 Show':'\\uD83D\\uDEAB Ignore')+'</button></td></tr>';
      }).join('')+'</tbody></table></div>';
      var sels=el.querySelectorAll('.gm-ghost-manual-sel');
      sels.forEach(function(sel){allDiscord.forEach(function(dm){var o=document.createElement('option');o.value=dm.id;o.textContent=(dm.displayName||dm.username)+' ('+dm.username+')';sel.appendChild(o);});});
    } else {
      var ghosts=(ghostData.discordGhosts||[]).filter(function(g){
        if(ghostHideIgnored&&g.ignored)return false;
        if(q){var hay=((g.displayName||'')+(g.username||'')).toLowerCase();if(hay.indexOf(q)===-1)return false;}
        return true;
      });
      if(!ghosts.length){el.innerHTML='<div style="color:#4caf50;padding:12px">\\u2705 '+(q?'No Discord ghosts match your search':'No Discord ghosts detected!')+'</div>';return;}
      el.innerHTML='<div style="font-size:11px;color:#666;margin-bottom:6px">Showing '+ghosts.length+' Discord ghost'+(ghosts.length>1?'s':'')+'</div><div style="border:1px solid #2a2f3a;border-radius:8px;overflow:hidden;background:#17171b"><table style="width:100%;border-collapse:collapse;font-size:12px;margin:0"><thead><tr style="border-bottom:2px solid #2a2f3a"><th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Discord User</th><th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">Username</th><th style="padding:8px 10px;text-align:left;color:#8b8fa3;font-size:10px;text-transform:uppercase">User ID</th><th style="padding:8px 10px;text-align:center;color:#8b8fa3;font-size:10px;text-transform:uppercase;width:80px">Actions</th></tr></thead><tbody>'+ghosts.map(function(g){
        return '<tr style="border-bottom:1px solid #1e1e24'+(g.ignored?';opacity:.5':'')+'"><td style="padding:8px 10px;font-weight:600;color:#e8e8ec">'+safe(g.displayName||g.username)+'</td><td style="padding:8px 10px;color:#7289da">'+safe(g.username)+'</td><td style="padding:8px 10px;color:#8b8fa3;font-size:11px;font-family:monospace">'+safe(g.id)+'</td><td style="padding:8px 10px;text-align:center"><button class="small" data-gm-ghost-ignore="'+safe(g.id)+'" data-gm-ghost-ignored="'+(g.ignored?'1':'0')+'" style="margin:0;padding:2px 6px;font-size:10px;background:'+(g.ignored?'#ff980022':'#3a3a42')+';color:'+(g.ignored?'#ff9800':'#8b8fa3')+'">'+(g.ignored?'\\uD83D\\uDC41 Show':'\\uD83D\\uDEAB Ignore')+'</button></td></tr>';
      }).join('')+'</tbody></table></div>';
    }
  }
  function loadGhosts(){
    var el=document.getElementById('gmGhostResults');if(!el)return;
    el.innerHTML='<div style="color:#8b8fa3;padding:8px">Loading...</div>';
    fetch('/api/idleon/ghosts').then(function(r){return r.json()}).then(function(d){
      if(!d.success)return;ghostData=d;renderGhostStats();renderGhostContent();
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">Error: '+safe(e.message)+'</span>';});
  }
  document.querySelectorAll('[data-gm-ghost-tab]').forEach(function(btn){
    btn.addEventListener('click',function(){ghostTab=btn.dataset.gmGhostTab;document.querySelectorAll('[data-gm-ghost-tab]').forEach(function(b){b.style.background=b.dataset.gmGhostTab===ghostTab?'#2196f3':'#3a3a42';});renderGhostContent();});
  });
  var gmGhostSearchEl=document.getElementById('gmGhostSearch');
  if(gmGhostSearchEl)gmGhostSearchEl.addEventListener('input',function(){ghostSearch=this.value;renderGhostContent();});
  var gmGhostIgnoreEl=document.getElementById('gmGhostHideIgnored');
  if(gmGhostIgnoreEl)gmGhostIgnoreEl.addEventListener('change',function(){ghostHideIgnored=this.checked;renderGhostContent();});
  document.getElementById('gmGhostResults').addEventListener('click',function(e){
    var linkBtn=e.target.closest('[data-gm-ghost-link]');
    if(linkBtn){var name=linkBtn.dataset.gmGhostLink;var did=linkBtn.dataset.gmGhostDid;if(!confirm('Link '+name+' to this Discord user?'))return;linkBtn.disabled=true;linkBtn.textContent='...';fetch('/api/idleon/link-member',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idleonName:name,discordId:did})}).then(function(r){return r.json()}).then(function(d){if(d.success)loadGhosts();else{alert(d.error||'Failed');linkBtn.disabled=false;linkBtn.textContent='\\u2714 Link';}}).catch(function(e){alert(e.message);linkBtn.disabled=false;linkBtn.textContent='\\u2714 Link';});return;}
    var ignBtn=e.target.closest('[data-gm-ghost-ignore]');
    if(ignBtn){var key=ignBtn.dataset.gmGhostIgnore;var isIgnored=ignBtn.dataset.gmGhostIgnored==='1';fetch('/api/idleon/ghost-ignore',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({key:key,ignore:!isIgnored})}).then(function(r){return r.json()}).then(function(d){if(d.success)loadGhosts();}).catch(function(){});return;}
  });
  document.getElementById('gmGhostResults').addEventListener('change',function(e){
    var sel=e.target.closest('[data-gm-ghost-manual]');if(!sel||!sel.value)return;
    var name=sel.dataset.gmGhostManual;var did=sel.value;var label=sel.options[sel.selectedIndex].textContent;
    if(!confirm('Link '+name+' → '+label+'?'))return;
    fetch('/api/idleon/link-member',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({idleonName:name,discordId:did})}).then(function(r){return r.json()}).then(function(d){if(d.success)loadGhosts();else{alert(d.error||'Failed');sel.value='';}}).catch(function(e){alert(e.message);sel.value='';});
  });
  document.getElementById('gmGhostAutoLink').addEventListener('click',function(){
    if(!confirm('Auto-link all exact name matches?'))return;
    fetch('/api/idleon/auto-link',{method:'POST'}).then(function(r){return r.json()}).then(function(d){if(d.success){alert('Linked '+d.linked+' member(s).');loadGhosts();load();}else alert(d.error||'Failed');}).catch(function(e){alert(e.message);});
  });

  // --- Tab switching ---
  document.querySelectorAll('#gmNavTabs .gm-nav-btn').forEach(function(tab){
    tab.addEventListener('click',function(){
      document.querySelectorAll('#gmNavTabs .gm-nav-btn').forEach(function(t){t.classList.remove('active')});
      tab.classList.add('active');showPanel(tab.dataset.gm);
    });
  });

  // --- Button handlers ---
  document.getElementById('gmKickRefresh').addEventListener('click',renderKickQueue);

  // --- Player Info Modal ---
  function openPlayerModal(name){
    var m=(model.members||[]).find(function(x){return x.name===name;});
    if(!m)return;
    var modal=document.getElementById('gmPlayerModal');
    var content=document.getElementById('gmPlayerModalContent');
    if(!modal||!content)return;
    var hist=normHist(m.weeklyHistory).sort(function(a,b){return a.weekStart.localeCompare(b.weekStart)}).slice(-12);
    var atGp=Number(m.allTimeGp||m.totalGp||0);
    var wGp=Number(m.weeklyGp||0);
    var dAway=Number(m.daysAway||0);
    var risk=Number(m.kickRiskScore||0);
    var guild=guildName(m.guildId);
    var status=m.status||'active';
    var statusColors={active:'#4caf50',probation:'#ff9800',watchlist:'#f44336',loa:'#2196f3',exempt:'#9c27b0'};
    var html='<h2 style="margin:0 0 12px;font-size:18px;color:#e0e0e0">'+safe(name)+'</h2>';
    html+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">';
    html+='<div style="background:#0e0e12;border:1px solid #2a2f3a;border-radius:8px;padding:6px 12px;text-align:center;flex:1;min-width:80px"><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Guild</div><div style="font-size:14px;font-weight:600;color:#4fc3f7">'+safe(guild)+'</div></div>';
    html+='<div style="background:#0e0e12;border:1px solid #2a2f3a;border-radius:8px;padding:6px 12px;text-align:center;flex:1;min-width:80px"><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Status</div><div style="font-size:14px;font-weight:600;color:'+(statusColors[status]||'#ccc')+'">'+safe(status)+'</div></div>';
    html+='<div style="background:#0e0e12;border:1px solid #2a2f3a;border-radius:8px;padding:6px 12px;text-align:center;flex:1;min-width:80px"><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Risk</div><div style="font-size:14px;font-weight:600;color:'+(risk>=70?'#f44336':risk>=40?'#ff9800':'#4caf50')+'">'+risk+'</div></div>';
    html+='</div>';
    html+='<div style="display:flex;flex-wrap:wrap;gap:8px;margin-bottom:16px">';
    html+='<div style="background:#0e0e12;border:1px solid #2a2f3a;border-radius:8px;padding:6px 12px;text-align:center;flex:1;min-width:80px"><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase">All-Time GP</div><div style="font-size:14px;font-weight:600;color:#e0e0e0">'+fmtN(atGp)+'</div></div>';
    html+='<div style="background:#0e0e12;border:1px solid #2a2f3a;border-radius:8px;padding:6px 12px;text-align:center;flex:1;min-width:80px"><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Weekly GP</div><div style="font-size:14px;font-weight:600;color:#e0e0e0">'+fmtN(wGp)+'</div></div>';
    html+='<div style="background:#0e0e12;border:1px solid #2a2f3a;border-radius:8px;padding:6px 12px;text-align:center;flex:1;min-width:80px"><div style="font-size:10px;color:#8b8fa3;text-transform:uppercase">Days Away</div><div style="font-size:14px;font-weight:600;color:'+(dAway>=14?'#f44336':dAway>=7?'#ff9800':'#4caf50')+'">'+dAway+'</div></div>';
    html+='</div>';
    // GP over weeks bar chart
    html+='<div style="margin-top:4px"><div style="font-size:12px;color:#8b8fa3;margin-bottom:6px;text-transform:uppercase;letter-spacing:.3px">GP Over Weeks</div>';
    if(hist.length){
      var maxGp=Math.max.apply(null,hist.map(function(h){return h.gp}))||1;
      html+='<div style="display:flex;align-items:flex-end;gap:3px;height:120px;padding:4px 0">';
      hist.forEach(function(h){
        var pct=Math.max(2,Math.round(h.gp/maxGp*100));
        var label=h.weekStart.slice(5);
        html+='<div style="flex:1;display:flex;flex-direction:column;align-items:center;justify-content:flex-end;height:100%">';
        html+='<div style="font-size:9px;color:#8b8fa3;margin-bottom:2px">'+fmtN(h.gp)+'</div>';
        html+='<div style="width:100%;background:#4fc3f7;border-radius:3px 3px 0 0;height:'+pct+'%;min-height:2px;transition:height .3s"></div>';
        html+='<div style="font-size:8px;color:#666;margin-top:3px;white-space:nowrap">'+label+'</div>';
        html+='</div>';
      });
      html+='</div>';
    }else{
      html+='<div style="color:#555;font-size:13px;padding:12px;text-align:center">No GP history available</div>';
    }
    html+='</div>';
    content.innerHTML=html;
    modal.style.display='flex';
  }
  document.getElementById('gmPlayerModalClose').addEventListener('click',function(){document.getElementById('gmPlayerModal').style.display='none';});
  document.getElementById('gmPlayerModal').addEventListener('click',function(e){if(e.target===this)this.style.display='none';});
  document.getElementById('gmKickRows').addEventListener('click',function(e){
    var link=e.target.closest('[data-gm-player]');
    if(link){e.preventDefault();openPlayerModal(link.dataset.gmPlayer);}
  });
  document.getElementById('gmKickSendWarnings').addEventListener('click',function(){
    var slots=Number((document.getElementById('gmKickSlots')||{}).value)||5;
    fetch('/api/idleon/kick-candidates?count='+slots).then(function(r){return r.json()}).then(function(d){
      if(!d.success||!d.candidates||!d.candidates.length)return alert('No candidates');
      if(!confirm('Send warning DMs to '+d.candidates.length+' members?'))return;
      fetch('/api/idleon/send-warnings',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({names:d.candidates.map(function(c){return c.name})})}).then(function(r){return r.json()}).then(function(r){alert(r.success?'Sent '+r.sent+' warnings':'Failed: '+(r.error||''));}).catch(function(e){alert(e.message)});
    }).catch(function(e){alert(e.message)});
  });
  document.getElementById('gmWaitScan').addEventListener('click',function(){
    fetch('/api/idleon/scan-forum',{method:'POST'}).then(function(r){return r.json()}).then(function(d){alert(d.success?'Found '+d.added+' new waitlist entries'+(d.skipped?' ('+d.skipped+' already known)':''):'Failed: '+(d.error||''));load();}).catch(function(e){alert(e.message)});
  });
  document.getElementById('gmWaitAdd').addEventListener('click',function(){
    var name=prompt('Player name:');if(!name)return;var notes=prompt('Notes (optional):');
    fetch('/api/idleon/waitlist',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),notes:notes||''})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  });
  // --- Guild member search in waitlist ---
  (function(){
    var searchInput=document.getElementById('gmWaitSearch');
    var resultEl=document.getElementById('gmWaitSearchResult');
    if(!searchInput||!resultEl)return;
    var debounce=null;
    searchInput.addEventListener('input',function(){
      clearTimeout(debounce);
      var q=searchInput.value.trim().toLowerCase();
      if(!q){resultEl.style.display='none';return;}
      debounce=setTimeout(function(){
        var matches=(model.members||[]).filter(function(m){return m.status!=='kicked'&&m.name.toLowerCase().indexOf(q)!==-1;}).slice(0,5);
        if(!matches.length){
          resultEl.innerHTML='<span style="color:#4caf50">✅ Not found in any guild</span>';
        }else{
          resultEl.innerHTML=matches.map(function(m){
            return'<div style="padding:2px 0"><span style="color:#f44336">⚠</span> <b>'+safe(m.name)+'</b> <span style="color:#8b8fa3">— '+safe(guildName(m.guildId))+'</span></div>';
          }).join('');
        }
        resultEl.style.display='block';
      },250);
    });
    searchInput.addEventListener('blur',function(){setTimeout(function(){resultEl.style.display='none';},200);});
    searchInput.addEventListener('focus',function(){if(searchInput.value.trim())searchInput.dispatchEvent(new Event('input'));});
  })();
  document.getElementById('gmPromoScan').addEventListener('click',function(){
    fetch('/api/idleon/scan-promotion',{method:'POST'}).then(function(r){return r.json()}).then(function(d){alert(d.success?'Found '+(d.added||[]).length+' new promotion entries':'Failed: '+(d.error||''));load();}).catch(function(e){alert(e.message)});
  });
  document.getElementById('gmPromoAdd').addEventListener('click',function(){
    var name=prompt('Player name:');if(!name)return;var guild=prompt('Target guild:');if(!guild)return;var notes=prompt('Notes (optional):');
    fetch('/api/idleon/promotion-list',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name.trim(),targetGuild:guild.trim(),notes:notes||''})}).then(function(r){return r.json()}).then(function(d){if(d.success)load();else alert(d.error||'Failed')}).catch(function(e){alert(e.message)});
  });
  document.getElementById('gmAddRole').addEventListener('click',function(){
    var gp=Number(document.getElementById('gmNewRoleGp').value);var roleId=(document.getElementById('gmNewRoleId').value||'').trim();var roleName=(document.getElementById('gmNewRoleName').value||'').trim();
    if(!gp||!roleId)return alert('GP threshold and Role ID required');
    var ms=((model.config||{}).roleMilestones||[]).concat([{gpThreshold:gp,roleId:roleId,roleName:roleName||roleId}]);
    var cfg=Object.assign({},model.config,{roleMilestones:ms});
    fetch('/api/idleon/config',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(cfg)}).then(function(r){return r.json()}).then(function(d){if(d.success){document.getElementById('gmNewRoleGp').value='';document.getElementById('gmNewRoleId').value='';document.getElementById('gmNewRoleName').value='';load();}}).catch(function(){});
  });
  document.getElementById('gmSyncRoles').addEventListener('click',function(){
    document.getElementById('gmRolesStatus').textContent='Syncing...';
    fetch('/api/idleon/sync-roles',{method:'POST'}).then(function(r){return r.json()}).then(function(d){document.getElementById('gmRolesStatus').textContent=d.success?'✅ Added: '+d.added+', Removed: '+d.removed+', Errors: '+d.errors:'❌ '+(d.error||'Failed');}).catch(function(e){document.getElementById('gmRolesStatus').textContent='❌ '+e.message;});
  });
  document.getElementById('gmSyncRolesDry').addEventListener('click',function(){
    var el=document.getElementById('gmDryRunResult');if(!el)return;
    el.innerHTML='<span style="color:#ff9800">Running dry run...</span>';
    fetch('/api/idleon/sync-roles-dry',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      if(!d.success){el.innerHTML='<span style="color:#f44336">❌ '+(d.error||'Failed')+'</span>';return;}
      if(!d.changes||!d.changes.length){el.innerHTML='<span style="color:#4caf50">✅ No changes needed.</span>';return;}
      el.innerHTML='<b>'+d.changes.length+' changes would be made:</b><div style="max-height:200px;overflow-y:auto;margin-top:6px;font-size:12px">'+d.changes.map(function(c){return'<div style="padding:3px 0;border-bottom:1px solid #2a2f3a">'+(c.action==='add'?'<span style="color:#4caf50">+ Add</span>':'<span style="color:#f44336">- Remove</span>')+' <b>'+safe(c.roleName)+'</b> → '+safe(c.memberName)+'</div>';}).join('')+'</div>';
    }).catch(function(e){el.innerHTML='<span style="color:#f44336">❌ '+e.message+'</span>';});
  });
  document.getElementById('gmAutoLink').addEventListener('click',function(){
    document.getElementById('gmRolesStatus').textContent='Linking...';
    fetch('/api/idleon/auto-link',{method:'POST'}).then(function(r){return r.json()}).then(function(d){document.getElementById('gmRolesStatus').textContent=d.success?'✅ Linked '+d.linked+' members ('+d.unlinked+' still unlinked)':'❌ '+(d.error||'Failed');load();}).catch(function(e){document.getElementById('gmRolesStatus').textContent='❌ '+e.message;});
  });
  document.getElementById('gmGhostRefresh').addEventListener('click',loadGhosts);

  function load(){
    fetch('/api/idleon/gp').then(function(r){if(!r.ok)throw new Error('Server error '+r.status);return r.json()}).then(function(d){
      if(!d.success)throw new Error(d.error||'Load failed');
      model.members=d.members||[];model.guilds=d.guilds||[];model.config=d.config||{};
      model.kickLog=d.kickLog||[];model.waitlist=d.waitlist||[];model.promotionList=d.promotionList||[];model.importLog=d.importLog||[];
      renderWaitlist();renderPromotionList();renderRoles();renderKickQueue();
    }).catch(function(e){console.error('Guild mgmt load:',e)});
  }
  load();startKickAutoRefresh();
})();
</script>`;
}

export function renderIdleonReviewsTab(userTier) {
  return `
<style>
  /* ═══ Theme Variables ═══ */
  .rv-wrap{--bg1:#13131a;--bg2:#1a1a24;--bg3:#0d0d14;--bg-e:#1e1f2e;--brd:#282d3e;--brd-s:#1c1c28;--txt:#e8eaef;--txt2:#8b8fa3;--txt3:#62667a;--acc:#4fc3f7;--acc-d:#4fc3f733;--ok:#4caf50;--ok-d:#4caf5025;--warn:#ff9800;--warn-d:#ff980020;--err:#f44336;--err-d:#f4433620;--twi:#9146ff;--twi-d:#9146ff20;--r-s:6px;--r-m:10px;--r-l:14px;--tr:.18s cubic-bezier(.4,0,.2,1);--sh-s:0 1px 4px rgba(0,0,0,.2);--sh-m:0 4px 16px rgba(0,0,0,.3);--sh-l:0 8px 32px rgba(0,0,0,.45);--glass:rgba(255,255,255,.03)}

  /* ═══ Layout ═══ */
  .rv-wrap{max-width:2400px;margin:auto;padding:14px 18px;display:flex;flex-direction:column;min-height:500px;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Oxygen,sans-serif;color:var(--txt)}
  .rv-header{display:flex;align-items:flex-end;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:8px}
  .rv-header h2{margin:0;font-size:20px;letter-spacing:-.3px;display:flex;align-items:center;gap:6px;font-weight:800}
  .rv-header p{margin:2px 0 0;color:var(--txt2);font-size:12px;line-height:1.4;transition:color var(--tr)}
  .rv-header p .rv-hl{color:var(--acc);font-weight:700}
  .rv-header p .rv-hl-warn{color:var(--warn);font-weight:700}

  /* ═══ Stats Row ═══ */
  .rv-stats{display:grid;grid-template-columns:repeat(10,1fr);gap:5px;margin-bottom:8px}
  .rv-stat{position:relative;background:linear-gradient(135deg,var(--bg2),var(--bg1));border:1px solid var(--brd);border-radius:var(--r-m);padding:7px 6px 6px;text-align:center;cursor:pointer;transition:all var(--tr);backdrop-filter:blur(6px);overflow:hidden;min-width:0}
  .rv-stat::before{content:'';position:absolute;inset:0;background:var(--glass);pointer-events:none}
  .rv-stat::after{content:'';position:absolute;top:0;left:0;right:0;height:2px;border-radius:2px 2px 0 0;opacity:.7;transition:opacity var(--tr)}
  .rv-stat:hover{transform:translateY(-2px);border-color:var(--acc);box-shadow:var(--sh-m)}
  .rv-stat:hover::after{opacity:1}
  .rv-stat.rv-stat-active{border-color:var(--acc);box-shadow:0 0 12px var(--acc-d)}
  .rv-stat .num{font-size:17px;font-weight:800;line-height:1.1;transition:color var(--tr);font-variant-numeric:tabular-nums}
  .rv-stat .lbl{font-size:9px;color:var(--txt2);text-transform:uppercase;letter-spacing:.6px;margin-top:2px;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rv-stat .rv-stat-icon{font-size:10px;margin-bottom:1px;display:block;opacity:.6}
  .rv-stat .rv-stat-delta{position:absolute;top:3px;right:4px;font-size:8px;font-weight:700;padding:0 3px;border-radius:3px;opacity:0;transition:opacity .3s;line-height:1.4}
  .rv-stat .rv-stat-delta.visible{opacity:1}
  .rv-stat .rv-stat-delta.up{color:var(--ok);background:var(--ok-d)}
  .rv-stat .rv-stat-delta.down{color:var(--err);background:var(--err-d)}
  .rv-stat.rv-stat-zero .num{opacity:.35}
  .rv-stat.rv-stat-zero .lbl{opacity:.5}
  /* Stat top-border color by type */
  .rv-stat[data-rvfilter="queue"]::after{background:var(--acc)}
  .rv-stat[data-rvfilter="redeemed"]::after{background:var(--twi)}
  .rv-stat[data-rvfilter="pending"]::after{background:var(--err)}
  .rv-stat[data-rvfilter="in-progress"]::after{background:var(--warn)}
  .rv-stat[data-rvfilter="completed"]::after{background:var(--ok)}
  .rv-stat[data-rvfilter="today"]::after{background:#64b5f6}
  .rv-stat[data-rvfilter="stale"]::after{background:var(--err)}
  /* Stats with no filter */
  .rv-stat:not([data-rvfilter])::after{background:var(--brd)}

  /* Stat tooltip */
  .rv-stat-tip{position:absolute;bottom:calc(100% + 8px);left:50%;transform:translateX(-50%);background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);padding:5px 9px;font-size:10px;color:#ccc;white-space:nowrap;pointer-events:none;opacity:0;transition:opacity .2s;z-index:100;box-shadow:var(--sh-s)}
  .rv-stat:hover .rv-stat-tip{opacity:1}

  /* Pulse animation for stat changes */
  @keyframes rvStatPulse{0%{box-shadow:0 0 0 0 var(--acc-d)}100%{box-shadow:0 0 0 8px transparent}}
  .rv-stat.rv-stat-pulse{animation:rvStatPulse .6s ease-out}

  /* ═══ Sparkline / Cat Chart / Source Bar ═══ */
  .rv-sparkline{display:flex;align-items:flex-end;gap:1px;height:26px;margin-top:4px}
  .rv-sparkline-bar{flex:1;min-width:3px;background:#4fc3f755;border-radius:1px 1px 0 0;transition:height .3s,background .2s}
  .rv-sparkline-bar:hover{background:var(--acc)}
  .rv-cat-chart{display:flex;gap:3px;flex-wrap:wrap;margin-top:4px}
  .rv-cat-chip{font-size:9px;padding:2px 6px;border-radius:3px;font-weight:600;white-space:nowrap}
  .rv-source-bar{display:flex;height:5px;border-radius:3px;overflow:hidden;margin-top:5px}
  .rv-source-seg{height:100%;transition:width .3s}

  /* ═══ Card ═══ */
  .rv-card{background:linear-gradient(180deg,var(--bg2) 0%,var(--bg1) 100%);border:1px solid var(--brd);border-radius:var(--r-l);padding:14px 16px;margin-bottom:10px;display:flex;flex-direction:column;min-height:0;overflow:hidden;box-shadow:var(--sh-s)}

  /* ═══ Toolbar ═══ */
  .rv-toolbar{display:flex;gap:6px;flex-wrap:nowrap;align-items:center;margin-bottom:10px;overflow-x:auto;scrollbar-width:none;-webkit-overflow-scrolling:touch}
  .rv-toolbar::-webkit-scrollbar{display:none}
  .rv-toolbar button{padding:6px 13px;font-size:11px;border-radius:var(--r-s);cursor:pointer;border:none;font-weight:700;transition:all var(--tr);display:inline-flex;align-items:center;gap:4px;white-space:nowrap;flex-shrink:0;letter-spacing:.2px}
  .rv-toolbar button:hover{filter:brightness(1.15);transform:translateY(-1px);box-shadow:var(--sh-s)}
  .rv-toolbar button:active{transform:translateY(0) scale(.97);filter:brightness(.95)}

  /* ═══ Quick Filter Chips (hidden) ═══ */

  /* ═══ Filters Bar ═══ */
  .rv-filters{display:none;gap:6px;flex-wrap:nowrap;align-items:center;margin-bottom:8px;padding:6px 10px;background:var(--bg2);border-radius:var(--r-m);border:1px solid var(--brd);position:sticky;top:0;z-index:20;backdrop-filter:blur(8px);overflow-x:auto;scrollbar-width:none;transition:box-shadow var(--tr)}
  .rv-filters.rv-filters-stuck{box-shadow:var(--sh-m)}
  .rv-filters::-webkit-scrollbar{display:none}
  .rv-filters label{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-right:2px;white-space:nowrap;font-weight:600}
  .rv-filters select,.rv-filters input[type="text"]{background:var(--bg3);color:var(--txt);border:1px solid var(--brd-s);border-radius:var(--r-s);padding:4px 8px;font-size:11px;outline:none;transition:border-color var(--tr),box-shadow var(--tr);-webkit-appearance:none;appearance:none}
  .rv-filters select{padding-right:20px;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238b8fa3'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center}
  .rv-filters select:focus,.rv-filters input:focus{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-d)}
  .rv-filter-group{display:flex;align-items:center;gap:3px;flex-shrink:0;position:relative}
  .rv-filter-group .rv-fbadge{position:absolute;top:-4px;right:-4px;background:var(--acc);color:#000;font-size:7px;font-weight:800;padding:1px 3px;border-radius:6px;min-width:10px;text-align:center;pointer-events:none;opacity:0;transition:opacity .2s;line-height:1.2}
  .rv-filter-group .rv-fbadge.visible{opacity:1}
  .rv-filter-clear{display:none;width:14px;height:14px;border-radius:50%;border:none;background:var(--err-d);color:var(--err);font-size:8px;cursor:pointer;align-items:center;justify-content:center;padding:0;transition:all var(--tr);flex-shrink:0}
  .rv-filter-clear.visible{display:inline-flex}
  .rv-filter-clear:hover{background:var(--err);color:#fff}
  .rv-filter-reset{display:none}

  /* Active filter chips */
  .rv-active-filters{display:flex;gap:4px;flex-wrap:wrap;margin-bottom:6px;min-height:0;transition:all .2s}
  .rv-af-chip{display:inline-flex;align-items:center;gap:4px;padding:2px 8px 2px 6px;border-radius:12px;font-size:10px;font-weight:600;background:var(--acc-d);color:var(--acc);border:1px solid rgba(79,195,247,.2);animation:rvChipIn .2s;cursor:default}
  .rv-af-chip button{background:none;border:none;color:var(--acc);cursor:pointer;font-size:10px;padding:0 0 0 2px;opacity:.6;transition:opacity .15s}
  .rv-af-chip button:hover{opacity:1}
  @keyframes rvChipIn{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}

  /* ═══ Table ═══ */
  .rv-table{width:100%;border-collapse:separate;border-spacing:0;font-size:12px;table-layout:fixed}
  .rv-table th{text-align:left;padding:7px 8px;border-bottom:2px solid var(--brd);color:var(--txt3);font-size:9px;text-transform:uppercase;letter-spacing:.7px;white-space:nowrap;position:sticky;top:0;background:var(--bg2);z-index:5;font-weight:700;user-select:none;transition:color var(--tr)}
  .rv-table th:hover{color:var(--txt2)}
  .rv-table td{padding:6px 8px;border-bottom:1px solid var(--brd-s);vertical-align:middle;transition:background var(--tr)}
  .rv-table td:nth-child(3){max-width:0;overflow:hidden;text-overflow:ellipsis}
  .rv-table tr{transition:all var(--tr)}
  .rv-table tbody tr:nth-child(even){background:rgba(255,255,255,.012)}
  .rv-table tbody tr:hover{background:var(--bg-e) !important;box-shadow:inset 3px 0 0 var(--acc)}
  .rv-table tbody tr.rv-row-selected{background:rgba(79,195,247,.06) !important}
  .rv-table tbody tr.rv-row-selected:hover{background:rgba(79,195,247,.1) !important}

  /* Priority row tinting - redeemed purple removed, only priority badge shown */
  .rv-table tbody tr.rv-row-stale{border-left:2px solid var(--err)}

  /* Row animations */
  .rv-table tbody tr.rv-row-removing{opacity:0;transform:translateX(20px);transition:all .3s;pointer-events:none}
  .rv-table tbody tr.rv-row-adding{animation:rvRowIn .3s}
  @keyframes rvRowIn{from{opacity:0;transform:translateY(-6px)}to{opacity:1;transform:translateY(0)}}

  /* Row success flash */
  @keyframes rvRowFlash{0%{background:var(--ok-d)}100%{background:transparent}}
  .rv-row-flash{animation:rvRowFlash .8s ease-out}

  /* Table wrap with scrollbar */
  .rv-table-wrap{overflow-y:auto;overflow-x:hidden;border-radius:var(--r-m);max-height:58vh;min-height:180px;scrollbar-width:thin;scrollbar-color:var(--brd) transparent}
  .rv-table-wrap::-webkit-scrollbar{width:5px;height:5px}
  .rv-table-wrap::-webkit-scrollbar-track{background:transparent}
  .rv-table-wrap::-webkit-scrollbar-thumb{background:var(--brd);border-radius:3px}
  .rv-table-wrap::-webkit-scrollbar-thumb:hover{background:#555}

  /* ═══ Name Cell ═══ */
  .rv-name{font-weight:700;font-size:13px;color:#fff;display:block;margin-bottom:1px;letter-spacing:.1px;cursor:default;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
  .rv-name-wrap{display:flex;flex-direction:column;gap:1px}
  .rv-name-sub{font-size:10px;color:var(--txt3);display:flex;align-items:center;gap:4px}

  /* Discord avatar */
  .rv-avatar{width:16px;height:16px;border-radius:50%;vertical-align:middle;flex-shrink:0}

  /* ═══ Status ═══ */
  .rv-status-dot{display:inline-flex;align-items:center;gap:5px;font-size:11px;font-weight:600;white-space:nowrap}
  .rv-status-dot::before{content:'';width:7px;height:7px;border-radius:50%;flex-shrink:0}
  .rv-status-dot.pending::before{background:var(--err);box-shadow:0 0 6px var(--err-d)}
  .rv-status-dot.in-progress::before{background:var(--warn);box-shadow:0 0 6px var(--warn-d);animation:rvPulse 2s infinite}
  .rv-status-dot.completed::before{background:var(--ok);box-shadow:0 0 6px var(--ok-d)}
  .rv-status-dot.on-hold::before{background:#607d8b;box-shadow:0 0 6px rgba(96,125,139,.3)}

  /* Old badge styles kept for compatibility */
  .rv-badge{display:inline-block;padding:2px 8px;border-radius:20px;font-size:10px;font-weight:700;letter-spacing:.2px}
  .rv-badge-pending{background:var(--err-d);color:#ef9a9a}
  .rv-badge-inprogress{background:var(--warn-d);color:#ffcc80}
  .rv-badge-completed{background:var(--ok-d);color:#a5d6a7}
  .rv-badge-onhold{background:rgba(96,125,139,.15);color:#90a4ae;border:1px solid rgba(96,125,139,.25)}

  /* Status dropdown */
  .rv-status-sel{margin:0;padding:3px 6px;font-size:10px;background:var(--bg3);color:var(--txt);border:1px solid var(--brd-s);border-radius:var(--r-s);cursor:pointer;outline:none;min-width:90px;transition:border-color var(--tr);-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='10' height='6'%3E%3Cpath d='M0 0l5 6 5-6z' fill='%238b8fa3'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 4px center;padding-right:16px}
  .rv-status-sel:focus{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-d)}

  /* ═══ Priority ═══ */
  .rv-prio-redeemed{background:linear-gradient(135deg,rgba(145,70,255,.15),rgba(145,70,255,.08));color:#c9a6ff;border:1px solid rgba(145,70,255,.3);padding:2px 8px;border-radius:20px;font-size:10px;font-weight:800;display:inline-flex;align-items:center;gap:3px;position:relative;overflow:visible;letter-spacing:.2px}
  .rv-prio-redeemed::after{content:'';position:absolute;inset:-1px;border-radius:inherit;background:rgba(145,70,255,.15);filter:blur(4px);z-index:-1;animation:rvGlow 2.5s ease-in-out infinite}
  .rv-prio-normal{color:var(--txt3);font-size:10px;font-weight:600}
  @keyframes rvGlow{0%,100%{opacity:.4}50%{opacity:.8}}

  /* ═══ Profile Link ═══ */
  .rv-profile-link{display:inline-flex;align-items:center;gap:3px;padding:3px 8px;border-radius:var(--r-s);font-size:10px;font-weight:600;text-decoration:none;transition:all var(--tr);background:rgba(79,195,247,.08);color:var(--acc);border:1px solid rgba(79,195,247,.15);white-space:nowrap;max-width:100%;overflow:hidden;text-overflow:ellipsis}
  .rv-profile-link:hover{background:rgba(79,195,247,.18);border-color:var(--acc);transform:translateY(-1px);box-shadow:var(--sh-s)}

  /* ═══ Notes ═══ */
  .rv-notes{font-size:10px;color:var(--txt3);margin-top:2px;line-height:1.3;word-break:break-word;overflow:hidden;text-overflow:ellipsis;display:-webkit-box;-webkit-line-clamp:2;line-clamp:2;-webkit-box-orient:vertical;max-height:2.6em}

  /* ═══ Actions ═══ */
  .rv-actions{display:flex;gap:3px;align-items:center}
  .rv-btn-sm{padding:0;border-radius:var(--r-s);border:1px solid var(--brd);background:var(--bg2);color:var(--txt);cursor:pointer;font-size:12px;transition:all var(--tr);width:26px;height:26px;display:inline-flex;align-items:center;justify-content:center;flex-shrink:0}
  .rv-btn-sm:hover{background:var(--bg-e);border-color:#555;transform:translateY(-1px)}
  .rv-btn-sm:active{transform:scale(.9)}
  .rv-btn-sm.danger{border-color:rgba(244,67,54,.25);color:#ef9a9a;width:18px;height:22px;font-size:10px}
  .rv-btn-sm.danger:hover{background:var(--err-d);border-color:var(--err)}
  .rv-btn-sm[title]{position:relative}

  /* Hover-reveal extra actions */
  .rv-actions .rv-act-extra{opacity:0;transform:translateX(-4px);transition:all .15s;pointer-events:none}
  .rv-table tbody tr:hover .rv-act-extra{opacity:1;transform:translateX(0);pointer-events:auto}

  /* Copy button */
  .rv-btn-copy{background:transparent;border:1px solid transparent;color:var(--txt3);font-size:10px;cursor:pointer;padding:1px 2px;border-radius:3px;transition:all var(--tr);opacity:0}
  .rv-table tbody tr:hover .rv-btn-copy,.rv-name-wrap:hover .rv-btn-copy{opacity:.85}
  .rv-btn-copy:hover{opacity:1!important;color:var(--acc);background:rgba(255,255,255,.08);border-color:var(--acc)}
  .rv-btn-copy.copied{color:var(--ok)}

  /* ═══ Date ═══ */
  .rv-date{font-family:'SF Mono',SFMono-Regular,Consolas,'Liberation Mono',Menlo,monospace;font-size:10px;letter-spacing:-.2px;white-space:nowrap}
  .rv-date-fresh{color:#a5d6a7}
  .rv-date-recent{color:var(--txt)}
  .rv-date-waiting{color:#ffcc80}
  .rv-date-old{color:var(--warn)}
  .rv-date-stale{color:var(--err)}
  .rv-date-ago{display:block;font-size:9px;color:var(--txt3);margin-top:1px}

  /* ═══ Categories ═══ */
  .rv-cat{display:inline-block;padding:1px 6px;border-radius:3px;font-size:8px;font-weight:700;margin:1px 1px 1px 0;letter-spacing:.3px;text-transform:uppercase;line-height:1.5}
  .rv-cat-more{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;margin:1px 1px 1px 0;background:rgba(255,255,255,.08);color:#aaa;cursor:pointer;position:relative;border:1px solid var(--brd)}
  .rv-cat-more:hover{background:rgba(255,255,255,.15);color:#fff}
  .rv-cat-popup{display:none;position:absolute;bottom:calc(100% + 4px);left:0;z-index:50;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r-s);padding:4px 6px;flex-direction:column;gap:2px;min-width:90px;box-shadow:var(--sh-m)}
  .rv-cat-more:hover .rv-cat-popup{display:flex}
  .rv-cat-popup .rv-cat{display:block;margin:1px 0;white-space:nowrap}
  .rv-cat-conf{display:inline-block;width:4px;height:4px;border-radius:50%;margin-left:2px;vertical-align:middle}
  .rv-cat-conf-high{background:var(--ok)}
  .rv-cat-conf-med{background:var(--warn)}
  .rv-cat-conf-low{background:var(--err)}
  .rv-cat-manual{border:1px dashed currentColor!important}

  /* Category filter bar */
  .rv-cat-filter{display:flex;gap:3px;flex-wrap:nowrap;overflow-x:auto;margin-bottom:6px;padding:4px 8px;background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r-m);max-height:32px;align-items:center;scrollbar-width:none}
  .rv-cat-filter::-webkit-scrollbar{display:none}
  .rv-cat-filter-btn{font-size:9px;padding:2px 7px;border-radius:3px;border:1px solid transparent;cursor:pointer;font-weight:700;transition:all var(--tr);opacity:.55;white-space:nowrap;flex-shrink:0;background:transparent}
  .rv-cat-filter-btn:hover{opacity:.85}
  .rv-cat-filter-btn.active{opacity:1;border-color:currentColor;box-shadow:0 0 4px currentColor}
  .rv-cat-filter-all{font-size:9px;padding:2px 7px;border-radius:3px;border:1px solid var(--brd);background:var(--bg3);color:var(--txt2);cursor:pointer;white-space:nowrap;flex-shrink:0;transition:all var(--tr)}
  .rv-cat-filter-all.active{background:var(--acc-d);color:var(--acc);border-color:var(--acc)}

  /* ═══ Stale Indicators ═══ */
  .rv-stale-dot{display:inline-block;width:6px;height:6px;border-radius:50%;margin-right:3px;flex-shrink:0}
  .rv-stale-ok{background:var(--ok)}
  .rv-stale-warn{background:var(--warn);animation:rvPulse 2s infinite}
  .rv-stale-danger{background:var(--err);animation:rvPulse 1.5s infinite}
  @keyframes rvPulse{0%,100%{opacity:1}50%{opacity:.35}}

  /* ═══ Claim Button ═══ */
  .rv-btn-claim{background:var(--ok-d);border:1px solid rgba(76,175,80,.2);color:#a5d6a7;font-size:9px;padding:2px 7px;border-radius:4px;cursor:pointer;font-weight:700;transition:all var(--tr);letter-spacing:.2px}
  .rv-btn-claim:hover{background:rgba(76,175,80,.25);border-color:var(--ok);box-shadow:0 0 8px var(--ok-d)}
  .rv-btn-claim:active{transform:scale(.95)}
  .rv-btn-move{background:rgba(79,195,247,.06);border:1px solid rgba(79,195,247,.15);color:var(--acc);font-size:9px;padding:2px 5px;border-radius:3px;cursor:pointer;transition:all var(--tr)}
  .rv-btn-move:hover{background:rgba(79,195,247,.2)}

  /* ═══ Batch Bar ═══ */
  .rv-cb{width:14px;height:14px;accent-color:var(--acc);cursor:pointer;margin:0}
  .rv-batch-bar{display:none;align-items:center;gap:8px;padding:7px 12px;background:linear-gradient(135deg,#1e293b,#172033);border:1px solid #334155;border-radius:var(--r-m);margin-bottom:8px;animation:rvSlideIn .2s}
  .rv-batch-bar .rv-batch-count{font-size:12px;font-weight:700;color:var(--acc);min-width:80px}
  .rv-batch-bar button{padding:4px 10px;border-radius:var(--r-s);border:1px solid var(--brd);background:var(--bg3);color:var(--txt);font-size:10px;cursor:pointer;font-weight:700;transition:all var(--tr)}
  .rv-batch-bar button:hover{background:var(--bg-e);border-color:var(--acc)}
  .rv-batch-bar button:active{transform:scale(.95)}
  .rv-batch-bar .danger{color:var(--err);border-color:rgba(244,67,54,.25)}
  .rv-batch-bar .danger:hover{background:var(--err-d)}

  /* ═══ Capacity Bar ═══ */
  .rv-capacity{margin-bottom:5px}
  .rv-capacity-bar{height:3px;background:var(--bg2);border-radius:2px;overflow:hidden;margin-top:2px}
  .rv-capacity-fill{height:100%;border-radius:2px;transition:width .5s cubic-bezier(.4,0,.2,1),background .4s}
  .rv-capacity-label{display:flex;justify-content:space-between;font-size:9px;color:var(--txt3)}

  /* ═══ Empty State ═══ */
  .rv-empty{text-align:center;padding:48px 20px}
  .rv-empty-icon{font-size:48px;margin-bottom:10px;filter:grayscale(.3)}
  .rv-empty-msg{font-size:15px;color:var(--txt2);font-weight:600}
  .rv-empty-sub{font-size:12px;color:var(--txt3);margin-top:4px;line-height:1.5}
  .rv-empty-action{display:inline-block;margin-top:12px;padding:6px 16px;border-radius:var(--r-s);background:var(--acc-d);color:var(--acc);font-size:11px;font-weight:700;cursor:pointer;border:1px solid rgba(79,195,247,.2);transition:all var(--tr)}
  .rv-empty-action:hover{background:rgba(79,195,247,.2);border-color:var(--acc)}

  /* Result count */
  .rv-result-count{font-size:10px;color:var(--txt3);padding:4px 0;transition:opacity .2s}

  /* ═══ Completed Section ═══ */
  .rv-completed-section{margin-top:12px;border-top:1px solid var(--brd);padding-top:10px}
  .rv-completed-item{display:flex;align-items:center;gap:8px;padding:5px 10px;border-radius:var(--r-s);font-size:11px;transition:background .1s}
  .rv-completed-item:hover{background:var(--bg-e)}
  .rv-completed-item+.rv-completed-item{border-top:1px solid var(--brd-s)}

  /* ═══ Row Expand ═══ */
  .rv-row-detail{display:none;padding:0 8px 8px 40px;background:rgba(255,255,255,.015)}
  .rv-row-detail.open{display:table-row}
  .rv-row-detail td{padding:8px 12px;border-bottom:1px solid var(--brd-s)}
  .rv-detail-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:8px;font-size:11px}
  .rv-detail-label{font-size:9px;color:var(--txt3);text-transform:uppercase;letter-spacing:.5px;margin-bottom:2px}
  .rv-detail-value{color:var(--txt);font-weight:600}
  .rv-detail-notes{background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);padding:6px 8px;font-size:11px;color:var(--txt2);line-height:1.4;white-space:pre-wrap;word-break:break-word;max-height:120px;overflow-y:auto}

  /* ═══ Context Menu ═══ */
  .rv-ctx-menu{position:fixed;z-index:10005;background:#1a1a24;border:1px solid var(--brd);border-radius:var(--r-m);padding:4px;min-width:160px;box-shadow:var(--sh-l);animation:rvCtxIn .12s}

  /* ═══ Position Popup ═══ */
  .rv-pos-popup{position:absolute;z-index:10006;background:#1a1a24;border:1px solid var(--brd);border-radius:var(--r-m);padding:4px;min-width:120px;box-shadow:var(--sh-l);animation:rvCtxIn .12s}
  .rv-pos-item{display:flex;align-items:center;gap:6px;padding:5px 10px;border-radius:var(--r-s);font-size:11px;color:var(--txt);cursor:pointer;transition:background .1s;white-space:nowrap}
  .rv-pos-item:hover{background:var(--bg-e)}
  @keyframes rvCtxIn{from{opacity:0;transform:scale(.95)}to{opacity:1;transform:scale(1)}}
  .rv-ctx-item{display:flex;align-items:center;gap:8px;padding:6px 10px;border-radius:var(--r-s);font-size:11px;color:var(--txt);cursor:pointer;transition:background .1s;white-space:nowrap}
  .rv-ctx-item:hover{background:var(--bg-e)}
  .rv-ctx-item.danger{color:var(--err)}
  .rv-ctx-item.danger:hover{background:var(--err-d)}
  .rv-ctx-item.disabled{color:var(--txt3);cursor:default;opacity:.5}
  .rv-ctx-item.disabled:hover{background:transparent}
  .rv-ctx-sep{height:1px;background:var(--brd);margin:3px 6px}

  /* ═══ Modals ═══ */
  .rv-modal-overlay{position:fixed;inset:0;background:rgba(0,0,0,.6);z-index:9999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(6px);opacity:0;transition:opacity .25s;pointer-events:none}
  .rv-modal-overlay.active{opacity:1;pointer-events:all}
  .rv-modal{background:linear-gradient(180deg,var(--bg2),var(--bg1));border:1px solid var(--brd);border-radius:var(--r-l);padding:22px;min-width:360px;max-width:460px;width:90%;box-shadow:var(--sh-l);transform:scale(.93) translateY(8px);transition:transform .25s cubic-bezier(.34,1.56,.64,1),opacity .25s;opacity:0}
  .rv-modal-overlay.active .rv-modal{transform:scale(1) translateY(0);opacity:1}
  .rv-modal h3{margin:0 0 14px;font-size:16px;font-weight:800;display:flex;align-items:center;gap:6px}
  .rv-modal label{display:block;font-size:11px;color:var(--txt2);margin-bottom:3px;margin-top:10px;font-weight:600;letter-spacing:.3px}
  .rv-modal input,.rv-modal textarea,.rv-modal select{width:100%;box-sizing:border-box;padding:7px 10px;background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);color:var(--txt);font-size:12px;outline:none;transition:border-color var(--tr),box-shadow var(--tr)}
  .rv-modal input:focus,.rv-modal textarea:focus,.rv-modal select:focus{border-color:var(--acc);box-shadow:0 0 0 2px var(--acc-d)}
  .rv-modal textarea{resize:vertical;min-height:50px;font-family:inherit;line-height:1.5}
  .rv-modal-footer{display:flex;gap:6px;justify-content:flex-end;margin-top:16px}
  .rv-modal-footer button{padding:7px 16px;border-radius:var(--r-s);border:none;font-weight:700;font-size:11px;cursor:pointer;transition:all var(--tr);letter-spacing:.2px}
  .rv-modal-footer button:hover{filter:brightness(1.1);transform:translateY(-1px)}
  .rv-modal-footer button:active{transform:scale(.97)}

  /* Modal success state */
  .rv-modal-success{text-align:center;padding:24px 0}
  .rv-modal-success-icon{font-size:42px;animation:rvSuccessPop .4s cubic-bezier(.34,1.56,.64,1)}
  .rv-modal-success-msg{font-size:14px;color:var(--ok);margin-top:8px;font-weight:600}
  @keyframes rvSuccessPop{from{transform:scale(0) rotate(-20deg)}to{transform:scale(1) rotate(0)}}

  /* ═══ Toggle ═══ */
  .rv-toggle{display:flex;align-items:center;gap:8px;margin-top:10px;cursor:pointer;font-size:12px;color:var(--txt)}
  .rv-toggle-box{width:34px;height:18px;border-radius:9px;background:var(--brd);position:relative;transition:background .25s}
  .rv-toggle-box.on{background:var(--twi);box-shadow:0 0 10px rgba(145,70,255,.4)}
  .rv-toggle-box::after{content:'';position:absolute;top:2px;left:2px;width:14px;height:14px;border-radius:50%;background:#fff;transition:left .25s cubic-bezier(.4,0,.2,1),box-shadow .25s}
  .rv-toggle-box.on::after{left:18px;box-shadow:0 0 4px rgba(145,70,255,.5)}

  /* ═══ Undo Toast ═══ */
  .rv-undo-toast{position:fixed;bottom:24px;right:24px;background:linear-gradient(135deg,#1e293b,#172033);border:1px solid var(--acc);border-radius:var(--r-m);padding:10px 16px;color:var(--txt);font-size:12px;display:flex;align-items:center;gap:10px;z-index:10001;box-shadow:var(--sh-l);animation:rvSlideIn .25s;overflow:hidden}
  .rv-undo-toast button{padding:4px 12px;border-radius:var(--r-s);border:none;background:var(--acc);color:#000;font-weight:700;cursor:pointer;font-size:11px;transition:all var(--tr)}
  .rv-undo-toast button:hover{filter:brightness(1.1)}
  .rv-undo-timer{position:absolute;bottom:0;left:0;height:2px;background:var(--acc);transition:width linear}
  @keyframes rvSlideIn{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}

  /* ═══ Notification Toasts ═══ */
  .rv-notif{position:fixed;top:16px;right:16px;z-index:10002;display:flex;flex-direction:column;gap:5px;pointer-events:none}
  .rv-notif-item{pointer-events:auto;padding:8px 14px;border-radius:var(--r-s);font-size:11px;font-weight:700;color:#fff;display:flex;align-items:center;gap:6px;animation:rvSlideIn .2s;box-shadow:var(--sh-m);max-width:320px;backdrop-filter:blur(8px)}
  .rv-notif-success{background:rgba(46,125,50,.9);border:1px solid var(--ok)}
  .rv-notif-error{background:rgba(198,40,40,.9);border:1px solid var(--err)}
  .rv-notif-warn{background:rgba(230,81,0,.9);border:1px solid var(--warn)}
  .rv-notif-info{background:rgba(21,101,192,.9);border:1px solid var(--acc)}
  .rv-notif-item.rv-notif-leaving{animation:rvSlideOut .2s forwards}
  @keyframes rvSlideOut{to{opacity:0;transform:translateX(20px)}}

  /* ═══ Banners ═══ */
  .rv-stale-banner{display:none;padding:6px 12px;background:var(--warn-d);border:1px solid rgba(255,152,0,.2);border-radius:var(--r-s);font-size:11px;color:var(--warn);margin-bottom:6px;align-items:center;gap:6px}
  .rv-stale-banner.visible{display:flex}
  .rv-offline-banner{display:none;padding:6px 12px;background:var(--err-d);border:1px solid rgba(244,67,54,.2);border-radius:var(--r-s);font-size:11px;color:var(--err);margin-bottom:6px}
  .rv-offline-banner.visible{display:block}
  .rv-refresh-dot{width:5px;height:5px;border-radius:50%;background:var(--ok);display:inline-block;margin-left:5px;animation:rvPulse 3s infinite}

  /* ═══ Twitch ═══ */
  .rv-twitch-link{color:var(--twi);text-decoration:none;font-size:10px;transition:color var(--tr)}
  .rv-twitch-link:hover{color:#bf94ff}
  .rv-twitch-status{display:inline-flex;align-items:center;gap:4px;font-size:10px;padding:2px 6px;border-radius:4px;background:var(--twi-d)}
  .rv-twitch-dot{width:5px;height:5px;border-radius:50%;background:var(--twi)}
  .rv-twitch-dot.connected{background:var(--ok)}
  .rv-twitch-dot.stale{background:var(--warn)}
  .rv-redeemed-time{font-size:8px;color:#b388ff;margin-top:1px}
  tr[data-twitch-row]{background:rgba(145,70,255,.03)}
  tr[data-twitch-row]:hover{background:rgba(145,70,255,.08)!important}
  .rv-dup-warn{font-size:8px;color:var(--warn);background:var(--warn-d);padding:1px 4px;border-radius:3px;margin-left:3px}

  /* ═══ Thread Link ═══ */
  .rv-thread-link{display:inline-flex;align-items:center;gap:3px;font-size:9px;color:#5865f2;text-decoration:none;padding:2px 5px;border-radius:3px;background:rgba(88,101,242,.06);transition:background var(--tr)}
  .rv-thread-link:hover{background:rgba(88,101,242,.15)}
  .rv-ping-cd{font-size:8px;color:var(--warn);margin-top:1px}

  /* ═══ Confirm Dialog ═══ */
  .rv-confirm-overlay{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:10003;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(5px);animation:rvFadeIn .15s}
  @keyframes rvFadeIn{from{opacity:0}to{opacity:1}}
  .rv-confirm-dialog{background:linear-gradient(180deg,var(--bg2),var(--bg1));border:1px solid var(--brd);border-radius:var(--r-l);padding:18px 22px;max-width:400px;width:90%;box-shadow:var(--sh-l);animation:rvPopIn .2s cubic-bezier(.34,1.56,.64,1)}
  @keyframes rvPopIn{from{transform:scale(.9);opacity:0}to{transform:scale(1);opacity:1}}
  .rv-confirm-dialog h3{margin:0 0 8px;font-size:15px;color:var(--txt);font-weight:800}
  .rv-confirm-dialog p{margin:0 0 10px;font-size:12px;color:var(--txt2);line-height:1.4}
  .rv-confirm-dialog .rv-confirm-details{background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);padding:6px 8px;font-size:10px;color:var(--txt3);max-height:100px;overflow-y:auto;margin-bottom:10px;font-family:monospace}
  .rv-confirm-dialog .rv-confirm-actions{display:flex;gap:6px;justify-content:flex-end}
  .rv-confirm-dialog .rv-confirm-actions button{padding:5px 12px;border-radius:var(--r-s);border:1px solid var(--brd);background:var(--bg3);color:var(--txt);cursor:pointer;font-size:11px;font-weight:700;transition:all var(--tr)}
  .rv-confirm-dialog .rv-confirm-actions button:hover{background:var(--bg-e)}
  .rv-confirm-dialog .rv-confirm-actions button:active{transform:scale(.95)}
  .rv-confirm-dialog .rv-confirm-actions .rv-confirm-danger{background:var(--err-d);border-color:rgba(244,67,54,.25);color:var(--err)}
  .rv-confirm-dialog .rv-confirm-actions .rv-confirm-danger:hover{background:rgba(198,40,40,.3)}
  .rv-confirm-warn{color:var(--warn);font-size:10px;display:flex;align-items:center;gap:4px;margin-bottom:8px}

  /* ═══ Import ═══ */
  .rv-import-zone{border:2px dashed var(--brd);border-radius:var(--r-m);padding:22px;text-align:center;color:var(--txt2);font-size:12px;cursor:pointer;transition:all .25s}
  .rv-import-zone:hover,.rv-import-zone.rv-drag-over{border-color:var(--acc);background:rgba(79,195,247,.05);color:var(--acc)}
  .rv-import-preview{background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);padding:8px;margin-top:8px;max-height:160px;overflow-y:auto;font-size:10px;color:var(--txt2);display:none}
  .rv-import-preview.visible{display:block}
  .rv-import-row{display:flex;justify-content:space-between;padding:2px 0;border-bottom:1px solid rgba(42,47,62,.15)}
  .rv-import-row.rv-import-dup{background:var(--warn-d);color:var(--warn)}
  .rv-import-row.rv-import-valid{color:#a5d6a7}

  /* ═══ Audit Log ═══ */
  .rv-audit-log{background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);padding:8px;max-height:180px;overflow-y:auto;font-size:10px;color:var(--txt2);margin-top:6px;scrollbar-width:thin}
  .rv-audit-entry{padding:3px 0;border-bottom:1px solid rgba(42,47,62,.15);display:flex;gap:6px;align-items:baseline}
  .rv-audit-entry:last-child{border-bottom:none}
  .rv-audit-time{color:var(--txt3);font-family:monospace;font-size:9px;white-space:nowrap}
  .rv-audit-action{font-weight:700}
  .rv-audit-action.rv-audit-delete{color:var(--err)}
  .rv-audit-action.rv-audit-create{color:var(--ok)}
  .rv-audit-action.rv-audit-update{color:var(--acc)}
  .rv-audit-action.rv-audit-clear{color:var(--warn)}

  /* ═══ Form Validation ═══ */
  .rv-field-error{border-color:var(--err)!important;box-shadow:0 0 0 2px var(--err-d)!important;animation:rvShake .3s}
  @keyframes rvShake{0%,100%{transform:translateX(0)}25%{transform:translateX(-4px)}75%{transform:translateX(4px)}}
  .rv-field-ok{border-color:var(--ok)!important}
  .rv-field-hint{font-size:9px;color:var(--txt3);margin-top:1px}
  .rv-field-error-msg{font-size:9px;color:var(--err);margin-top:1px;animation:rvFadeIn .2s}
  .rv-char-count{font-size:9px;color:var(--txt3);text-align:right;margin-top:1px;transition:color .2s}
  .rv-char-count.warning{color:var(--warn)}
  .rv-char-count.danger{color:var(--err)}
  .rv-add-dup{font-size:10px;color:var(--warn);padding:4px 8px;background:var(--warn-d);border-radius:4px;margin-top:3px;display:none;animation:rvSlideIn .2s}
  .rv-add-dup.visible{display:block}
  .rv-toggle-box.on{box-shadow:0 0 8px rgba(145,70,255,.5)}

  /* ═══ Loading ═══ */
  .rv-skeleton{background:linear-gradient(90deg,var(--bg2) 25%,var(--bg-e) 37%,var(--bg2) 63%);background-size:400% 100%;animation:rvShimmer 1.4s ease infinite;border-radius:4px;height:14px;margin:3px 0}
  @keyframes rvShimmer{0%{background-position:100% 50%}100%{background-position:0 50%}}

  /* Search debounce spinner */
  .rv-search-spinner{width:12px;height:12px;border:2px solid var(--brd);border-top-color:var(--acc);border-radius:50%;animation:rvSpin .6s linear infinite;margin-left:4px;display:none}
  .rv-search-spinner.active{display:inline-block}
  @keyframes rvSpin{to{transform:rotate(360deg)}}

  /* Search highlight */
  .rv-highlight{background:rgba(255,235,59,.25);border-radius:2px;padding:0 1px;box-shadow:0 0 0 1px rgba(255,235,59,.15)}

  /* ═══ Compact Mode ═══ */
  .rv-compact .rv-table{font-size:10px}
  .rv-compact .rv-table td{padding:3px 6px}
  .rv-compact .rv-table th{padding:4px 6px;font-size:8px}
  .rv-compact .rv-stat{padding:5px 4px}
  .rv-compact .rv-stat .num{font-size:14px}
  .rv-compact .rv-stat .lbl{font-size:8px}
  .rv-compact .rv-name{font-size:11px}
  .rv-compact .rv-btn-sm{width:22px;height:22px;font-size:10px}
  .rv-compact .rv-cat{font-size:7px;padding:1px 4px}
  .rv-compact .rv-toolbar button{padding:4px 8px;font-size:10px}

  /* Compact toggle */
  .rv-compact-toggle{font-size:10px;padding:3px 8px;border-radius:4px;border:1px solid var(--brd);background:var(--bg3);color:var(--txt2);cursor:pointer;transition:all var(--tr)}
  .rv-compact-toggle:hover{background:var(--bg-e);color:var(--txt)}
  .rv-compact-toggle.active{background:var(--acc-d);color:var(--acc);border-color:var(--acc)}

  /* ═══ Sort Indicators ═══ */
  th[data-sort]{cursor:pointer}
  th[data-sort]::after{content:'\\u2195';margin-left:2px;opacity:.3;font-size:9px;transition:opacity .15s}
  th[data-sort]:hover::after{opacity:.6}
  th[data-sort].rv-sort-asc::after{content:'\\u2191';opacity:1;color:var(--acc)}
  th[data-sort].rv-sort-desc::after{content:'\\u2193';opacity:1;color:var(--acc)}

  /* ═══ Scroll to Top ═══ */
  .rv-scroll-top{position:fixed;bottom:20px;left:20px;width:34px;height:34px;border-radius:50%;background:var(--bg2);border:1px solid var(--brd);color:var(--txt2);font-size:14px;cursor:pointer;display:none;align-items:center;justify-content:center;z-index:100;transition:all var(--tr);box-shadow:var(--sh-m)}
  .rv-scroll-top:hover{background:var(--bg-e);color:var(--acc);border-color:var(--acc);transform:translateY(-2px)}
  .rv-scroll-top.visible{display:flex}

  /* ═══ Rate Limit ═══ */
  .rv-rate-limited{opacity:.5;pointer-events:none;position:relative}

  /* ═══ Inline Edit Form ═══ */
  .rv-edit-form{display:flex;flex-direction:column;gap:3px}
  .rv-edit-form label{font-size:9px;color:var(--txt3);margin:0}
  .rv-edit-form input{padding:3px 6px;background:var(--bg3);border:1px solid var(--acc);border-radius:4px;color:var(--txt);font-size:11px;outline:none;transition:border-color var(--tr)}
  .rv-edit-form input:focus{box-shadow:0 0 0 2px var(--acc-d)}

  /* ═══ Responsive ═══ */
  @media(max-width:1200px){
    .rv-stats{grid-template-columns:repeat(5,1fr)}
    .rv-toolbar{flex-wrap:wrap}
  }
  @media(max-width:900px){
    .rv-stats{grid-template-columns:repeat(4,1fr)}
    .rv-filters{flex-wrap:wrap}
    .rv-table{min-width:0}
  }
  @media(max-width:600px){
    .rv-stats{grid-template-columns:repeat(3,1fr)}
    .rv-wrap{padding:10px 12px}
    .rv-card{padding:10px 12px}
    .rv-toolbar button{padding:5px 8px;font-size:10px}
  }

  /* ═══ Print ═══ */
  @media print{
    .rv-toolbar,.rv-batch-bar,.rv-filters,.rv-scroll-top,.rv-actions,.rv-quick-filters,.rv-cat-filter,.rv-capacity{display:none!important}
    .rv-modal-overlay,.rv-confirm-overlay{display:none!important}
    .rv-wrap{padding:0;max-width:100%}
    .rv-card{border:none;box-shadow:none}
    .rv-table{font-size:9px;min-width:0}
    .rv-table th{background:#fff;color:#333;border-bottom:2px solid #333}
    .rv-table td{border-bottom:1px solid #ddd;padding:4px 6px}
    .rv-stat{border:1px solid #ddd;background:#f9f9f9}
  }

  /* ═══ Misc Animations ═══ */
  @keyframes rvFadeIn{from{opacity:0}to{opacity:1}}
  @keyframes rvBounce{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}
</style>
<div class="rv-wrap">
  <div class="rv-header">
    <div>
      <h2>&#x1F50D; Account Reviews<span class="rv-refresh-dot" id="rvRefreshDot" title="Auto-refreshing every 60s"></span></h2>
      <p id="rvSubtitle">Manage IdleOn account review requests. Twitch redemptions get priority.</p>
    </div>
    <span id="rvStatus" style="font-size:11px;color:var(--txt2)"></span>
    <span class="rv-twitch-status" id="rvTwitchStatus"><span class="rv-twitch-dot" id="rvTwitchDot"></span><span id="rvTwitchLabel">Twitch</span></span>
  </div>

  <!-- Warning banners -->
  <div class="rv-offline-banner" id="rvOfflineBanner">&#x26A0;&#xFE0F; Connection lost &#x2014; changes may not save. <button onclick="load(true)" style="margin-left:6px;padding:2px 6px;border-radius:4px;border:1px solid var(--err);background:transparent;color:var(--err);cursor:pointer;font-size:10px;font-weight:600">Retry</button></div>
  <div class="rv-stale-banner" id="rvStaleBanner"><span>&#x23F0;</span><span id="rvStaleMsg"></span></div>

  <!-- My Review Lookup -->
  <div id="rvMyReviewPanel" style="background:linear-gradient(135deg,var(--bg2),var(--bg1));border:1px solid var(--brd);border-radius:var(--r-m);padding:10px 14px;margin-bottom:8px">
    <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
      <span style="font-size:14px">&#x1F50E;</span>
      <span style="font-size:13px;font-weight:700;color:var(--txt)">Check My Review Status</span>
    </div>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <input id="rvMyLookupName" type="text" placeholder="Your IdleOn name or Discord ID" style="flex:1;min-width:180px;padding:5px 10px;border-radius:var(--r-s);border:1px solid var(--brd);background:var(--bg3);color:var(--txt);font-size:12px;outline:none" autocomplete="off">
      <button id="rvMyLookupBtn" style="padding:5px 14px;border-radius:var(--r-s);border:1px solid var(--acc);background:var(--acc-d);color:var(--acc);font-size:12px;font-weight:700;cursor:pointer;white-space:nowrap">&#x1F50D; Lookup</button>
    </div>
    <div id="rvMyResult" style="margin-top:8px;display:none"></div>
  </div>

  <!-- Stats -->
  <div class="rv-stats" id="rvStatsRow">
    <div class="rv-stat" data-rvfilter="queue"><div class="rv-stat-tip">Click to filter active queue</div><div class="rv-stat-icon">&#x1F4CB;</div><div class="num" id="rvStatTotal" style="color:var(--acc)">0</div><div class="lbl">In Queue</div><span class="rv-stat-delta" id="rvDeltaQueue"></span></div>
    <div class="rv-stat" data-rvfilter="redeemed"><div class="rv-stat-tip">Twitch redemptions</div><div class="rv-stat-icon">&#x2B50;</div><div class="num" id="rvStatRedeemed" style="color:#c9a6ff">0</div><div class="lbl">Redeemed</div><span class="rv-stat-delta" id="rvDeltaRedeemed"></span></div>
    <div class="rv-stat" data-rvfilter="pending"><div class="rv-stat-tip">Waiting for review</div><div class="rv-stat-icon">&#x23F3;</div><div class="num" id="rvStatPending" style="color:#ef9a9a">0</div><div class="lbl">Pending</div><span class="rv-stat-delta" id="rvDeltaPending"></span></div>
    <div class="rv-stat" data-rvfilter="in-progress"><div class="rv-stat-tip">Currently being reviewed</div><div class="rv-stat-icon">&#x1F3AF;</div><div class="num" id="rvStatInProg" style="color:#ffcc80">0</div><div class="lbl">In Progress</div><span class="rv-stat-delta" id="rvDeltaInProg"></span></div>
    <div class="rv-stat" data-rvfilter="completed"><div class="rv-stat-tip">Reviews done</div><div class="rv-stat-icon">&#x2705;</div><div class="num" id="rvStatDone" style="color:#a5d6a7">0</div><div class="lbl">Completed</div><span class="rv-stat-delta" id="rvDeltaDone"></span></div>
    <div class="rv-stat"><div class="rv-stat-tip">Average time in queue</div><div class="rv-stat-icon">&#x23F1;&#xFE0F;</div><div class="num" id="rvStatAvgWait" style="color:var(--warn)">-</div><div class="lbl">Avg Wait</div></div>
    <div class="rv-stat"><div class="rv-stat-tip">Longest time waiting</div><div class="rv-stat-icon">&#x1F534;</div><div class="num" id="rvStatOldest" style="color:var(--err)">-</div><div class="lbl">Oldest</div></div>
    <div class="rv-stat"><div class="rv-stat-tip">Average time to complete</div><div class="rv-stat-icon">&#x26A1;</div><div class="num" id="rvStatAvgComplete" style="color:#81c784">-</div><div class="lbl">Avg Complete</div></div>
    <div class="rv-stat" data-rvfilter="today"><div class="rv-stat-tip">Completed in 24h</div><div class="rv-stat-icon">&#x1F4C5;</div><div class="num" id="rvStatToday" style="color:#64b5f6">0</div><div class="lbl">Done Today</div><span class="rv-stat-delta" id="rvDeltaToday"></span></div>
    <div class="rv-stat" data-rvfilter="stale"><div class="rv-stat-tip">Waiting 7+ days</div><div class="rv-stat-icon">&#x26A0;&#xFE0F;</div><div class="num" id="rvStatStale" style="color:var(--err)">0</div><div class="lbl">Stale (7d+)</div><span class="rv-stat-delta" id="rvDeltaStale"></span></div>
  </div>

  <!-- Mini analytics -->
  <details style="margin-bottom:6px">
    <summary style="font-size:10px;color:var(--txt2);cursor:pointer;padding:3px 0;user-select:none;font-weight:600">&#x1F4CA; Analytics <span style='color:var(--txt3);font-size:9px'>(click to expand)</span></summary>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;margin-top:5px">
      <div style="background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r-s);padding:6px 8px">
        <div style="font-size:9px;color:var(--txt2);font-weight:700;margin-bottom:2px">7-Day Activity</div>
        <div class="rv-sparkline" id="rvSparkline"></div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r-s);padding:6px 8px">
        <div style="font-size:9px;color:var(--txt2);font-weight:700;margin-bottom:2px">Top Categories</div>
        <div class="rv-cat-chart" id="rvCatChart"></div>
      </div>
      <div style="background:var(--bg2);border:1px solid var(--brd);border-radius:var(--r-s);padding:6px 8px">
        <div style="font-size:9px;color:var(--txt2);font-weight:700;margin-bottom:2px">Source Breakdown</div>
        <div id="rvSourceInfo" style="font-size:10px;color:#ccc;margin-bottom:3px"></div>
        <div class="rv-source-bar" id="rvSourceBar"></div>
      </div>
    </div>
  </details>

  <!-- Capacity Bar -->
  <div class="rv-capacity" id="rvCapacity">
    <div class="rv-capacity-label"><span id="rvCapLabel">0 / 500</span><span id="rvCapPct">0%</span></div>
    <div class="rv-capacity-bar"><div class="rv-capacity-fill" id="rvCapFill" style="width:0%"></div></div>
  </div>

  <!-- Category quick-filters -->
  <div class="rv-cat-filter" id="rvCatFilter" style="display:none">
    <button class="rv-cat-filter-all active" id="rvCatAll">All</button>
  </div>

  <div class="rv-card">
    <!-- Toolbar -->
    <div class="rv-toolbar">
      <button id="rvScan" style="background:var(--brd);color:var(--txt)">&#x1F50D; Scan Channel</button>
      <button id="rvSyncTwitch" style="background:var(--twi);color:#fff">&#x1F4FA; Sync Twitch</button>
      <button id="rvAdd" style="background:var(--acc);color:#000">&#x2795; Add</button>
      <button id="rvExportCsv" style="background:rgba(27,154,170,.12);color:#1b9aaa;border:1px solid rgba(27,154,170,.25)">&#x1F4E5; Export</button>
      <button id="rvImportBtn" style="background:var(--ok-d);color:var(--ok);border:1px solid rgba(76,175,80,.25)">&#x1F4C2; Import</button>
      <button id="rvAuditToggle" style="background:rgba(156,39,176,.1);color:#ce93d8;border:1px solid rgba(156,39,176,.2)">&#x1F4CB; Audit</button>
      <button id="rvClearDone" style="background:var(--err-d);color:var(--err);border:1px solid rgba(244,67,54,.25)">&#x1F5D1;&#xFE0F; Clear Done</button>
      <button class="rv-compact-toggle" id="rvCompactToggle" title="Toggle compact view">&#x2630; Compact</button>
    </div>

    <!-- Quick Filter Chips (removed) -->
    <div id="rvQuickFilters" style="display:none"><button class="rv-qf active" data-qf="all">All <span class="rv-qf-count" id="rvQfAll">0</span></button><span id="rvQfRedeemed"></span><span id="rvQfStale"></span><span id="rvQfActive"></span><span id="rvQfPending"></span><span id="rvQfOnHold"></span><span id="rvQfToday"></span></div>

    <!-- Batch Actions Bar -->
    <div class="rv-batch-bar" id="rvBatchBar">
      <span class="rv-batch-count" id="rvBatchCount">0 selected</span>
      <button id="rvBatchProgress">&#x25B6; Progress</button>
      <button id="rvBatchOnHold">&#x23F8; Hold</button>
      <button id="rvBatchComplete">&#x2705; Complete</button>
      <button id="rvBatchSelectFiltered" style="border-color:var(--acc-d);color:var(--acc)">&#x2611; Select Filtered</button>
      <button class="danger" id="rvBatchDelete">&#x1F5D1;&#xFE0F; Delete</button>
      <button id="rvBatchExportSel" style="border-color:rgba(27,154,170,.3);color:#1b9aaa">&#x1F4E5; Export</button>
      <button id="rvBatchDeselect" style="margin-left:auto">&#x2715; Deselect</button>
    </div>

    <!-- Active filter chips -->
    <div class="rv-active-filters" id="rvActiveFilters"></div>

    <!-- Filters -->
    <div class="rv-filters" id="rvFiltersBar">
      <div class="rv-filter-group">
        <label>Search</label>
        <input id="rvFilterSearch" type="text" placeholder="Name, notes..." style="width:130px" autocomplete="off">
        <span class="rv-search-spinner" id="rvSearchSpinner"></span>
      </div>
      <div class="rv-filter-group">
        <label>Status</label>
        <select id="rvFilterStatus"><option value="">All</option><option value="pending">Pending</option><option value="in-progress">In Progress</option><option value="on-hold">On Hold</option><option value="completed">Completed</option></select>
        <button class="rv-filter-clear" data-fclear="status" title="Clear">&#x2715;</button>
      </div>
      <div class="rv-filter-group">
        <label>Priority</label>
        <select id="rvFilterPrio"><option value="">All</option><option value="redeemed">&#x2B50; Redeemed</option><option value="normal">Normal</option></select>
        <button class="rv-filter-clear" data-fclear="priority" title="Clear">&#x2715;</button>
      </div>
      <div class="rv-filter-group">
        <label>Source</label>
        <select id="rvFilterSource"><option value="">All</option><option value="scan">Discord</option><option value="twitch">Twitch</option><option value="manual">Manual</option></select>
        <button class="rv-filter-clear" data-fclear="source" title="Clear">&#x2715;</button>
      </div>
      <div class="rv-filter-group">
        <label>Sort</label>
        <select id="rvFilterSort"><option value="priority-date">Priority + Date</option><option value="date-asc">Date &#x2191;</option><option value="date-desc">Date &#x2193;</option><option value="name-asc">Name A-Z</option><option value="name-desc">Name Z-A</option><option value="status">Status</option></select>
      </div>
      <button class="rv-filter-reset" id="rvFilterReset" title="Reset all filters">&#x2715; Reset</button>
    </div>

    <div id="rvResultCount" class="rv-result-count"></div>

    <!-- Table -->
    <div class="rv-table-wrap" id="rvTableWrap">
      <table class="rv-table" id="rvTable">
        <thead><tr>
          <th style="width:18px;padding:4px 2px"><input type="checkbox" class="rv-cb" id="rvSelectAll" title="Select all"></th>
          <th style="width:32px;padding:4px 2px;text-align:center">#</th>
          <th style="width:28%" data-sort="name">Name</th>
          <th style="width:10%">Profile</th>
          <th style="width:7%" data-sort="priority">Priority</th>
          <th style="width:9%">Category</th>
          <th style="width:9%" data-sort="requestedAt">Date</th>
          <th style="width:7%" data-sort="status">Status</th>
          <th style="width:0;padding:0;border:0;overflow:hidden"></th>
        </tr></thead>
        <tbody id="rvRows"></tbody>
      </table>
    </div>

    <!-- Completed -->
    <div id="rvCompleted" class="rv-completed-section" style="display:none"></div>

    <!-- Audit Log Panel -->
    <div id="rvAuditPanel" style="display:none;margin-top:8px">
      <h4 style="font-size:12px;color:#ce93d8;margin:0 0 4px;font-weight:700">&#x1F4CB; Audit Log <span id="rvAuditCount" style="color:var(--txt3);font-weight:400">(0)</span></h4>
      <div class="rv-audit-log" id="rvAuditLog"><div style="color:var(--txt3);text-align:center;padding:10px">No actions recorded yet</div></div>
    </div>
  </div>
</div>

<!-- Scroll to top -->
<button class="rv-scroll-top" id="rvScrollTop" title="Scroll to top">&#x2191;</button>

<!-- Notification container -->
<div class="rv-notif" id="rvNotifContainer"></div>

<!-- Loading skeleton -->
<div id="rvLoadingSkeleton" style="padding:10px">
  <div class="rv-skeleton" style="width:55%;height:16px"></div>
  <div class="rv-skeleton" style="width:100%;height:32px;margin-top:6px"></div>
  <div class="rv-skeleton" style="width:100%;height:32px"></div>
  <div class="rv-skeleton" style="width:100%;height:32px"></div>
  <div class="rv-skeleton" style="width:75%;height:32px"></div>
</div>

<!-- Complete Modal -->
<div class="rv-modal-overlay" id="rvCompleteModal">
  <div class="rv-modal">
    <h3>&#x2705; Complete Review</h3>
    <p style="color:var(--txt2);font-size:12px;margin:0 0 10px">Post a closing message to the Discord thread before deleting it.</p>
    <div id="rvCompleteInfo" style="background:var(--bg3);border-radius:var(--r-s);padding:8px 10px;margin-bottom:10px;font-size:11px"></div>
    <label>Message Template</label>
    <select id="rvCompleteTpl" style="margin-bottom:6px;padding:5px 8px;background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);color:var(--txt);font-size:11px">
      <option value="default">Default closing</option>
      <option value="quick">Quick close</option>
      <option value="custom">Custom</option>
    </select>
    <label>Closing Message</label>
    <textarea id="rvCompleteMsg" rows="5" placeholder="Write your closing message here..."></textarea>
    <div class="rv-char-count" id="rvCompleteMsgCount">0 chars</div>
    <div style="margin-top:6px;font-size:10px;color:var(--txt3)">&#x1F4A1; This message will be posted in the thread with a <strong>Delete Thread</strong> button.</div>
    <div class="rv-modal-footer">
      <button id="rvCompleteSkip" style="background:var(--brd);color:var(--txt2)">Skip (just mark done)</button>
      <button id="rvCompleteCancel" style="background:var(--brd);color:var(--txt)">Cancel</button>
      <button id="rvCompleteSubmit" style="background:var(--ok);color:#fff">&#x2705; Complete & Send</button>
    </div>
  </div>
</div>

<!-- Add Modal -->
<div class="rv-modal-overlay" id="rvAddModal">
  <div class="rv-modal" id="rvAddModalInner">
    <h3>&#x2795; Add Review Request</h3>
    <label>Account / Player Name *</label>
    <input id="rvAddName" placeholder="e.g. IamEdgar" maxlength="50" tabindex="1">
    <div class="rv-add-dup" id="rvAddDup">&#x26A0;&#xFE0F; Similar name already in queue</div>
    <div class="rv-char-count" id="rvAddNameCount">0 / 50</div>
    <label>Profile Link (optional)</label>
    <input id="rvAddLink" placeholder="e.g. https://idleontoolbox.com/?profile=IamEdgar" tabindex="2">
    <div class="rv-field-hint">IdleonToolbox, Cogstruction, or any profile URL</div>
    <label>Twitch Username (optional)</label>
    <input id="rvAddTwitch" placeholder="e.g. twitchuser123" maxlength="50" tabindex="3">
    <label>Notes (optional)</label>
    <textarea id="rvAddNotes" placeholder="Any extra info..." maxlength="500" tabindex="4"></textarea>
    <div class="rv-char-count" id="rvAddNotesCount">0 / 500</div>
    <div class="rv-toggle" id="rvAddRedeemToggle" tabindex="5">
      <div class="rv-toggle-box" id="rvAddRedeemBox"></div>
      <span>Twitch channel point redemption</span>
    </div>
    <div class="rv-modal-footer">
      <button id="rvAddCancel" style="background:var(--brd);color:var(--txt)">Cancel</button>
      <button id="rvAddSubmit" style="background:var(--acc);color:#000" tabindex="6">Add to Queue</button>
    </div>
  </div>
</div>

<!-- Import Modal -->
<div class="rv-modal-overlay" id="rvImportModal">
  <div class="rv-modal">
    <h3>&#x1F4E5; Import Reviews</h3>
    <p style="color:var(--txt2);font-size:11px;margin:0 0 8px">Import reviews from a CSV or JSON file. CSV must have a <strong>Name</strong> column header.</p>
    <div class="rv-import-zone" id="rvImportZone">
      <div>&#x1F4C1; Drop file here or click to browse</div>
      <div style="font-size:10px;margin-top:3px;color:var(--txt3)">Supports .csv and .json</div>
      <input type="file" id="rvImportFile" accept=".csv,.json" style="display:none">
    </div>
    <div class="rv-import-preview" id="rvImportPreview"></div>
    <div id="rvImportStatus" style="font-size:11px;margin-top:5px;color:var(--txt2)"></div>
    <div class="rv-modal-footer">
      <button id="rvImportCancel" style="background:var(--brd);color:var(--txt)">Cancel</button>
      <button id="rvImportSubmit" style="background:var(--acc);color:#000" disabled>Import 0 Reviews</button>
    </div>
  </div>
</div>
<script>
(function(){
  var safe=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;')};
  var model={};
  var urlRe=/https?:\\/\\/[^\\s<>"']+/gi;

  /* --- Filters state --- */
  var filters={search:'',status:'',priority:'',source:'',category:'',sort:'priority-date'};
  var rvSelected={};
  var rvUndoStack=[];
  var CAPACITY_MAX=500;
  var rvPrevStats={};

  /* === Notification system === */
  function rvNotify(msg,type){
    type=type||'info';
    var container=document.getElementById('rvNotifContainer');
    if(!container)return;
    var item=document.createElement('div');
    item.className='rv-notif-item rv-notif-'+type;
    var icons={success:'\\u2705',error:'\\u274C',warn:'\\u26A0\\uFE0F',info:'\\u2139\\uFE0F'};
    item.textContent=(icons[type]||'')+' '+msg;
    container.appendChild(item);
    setTimeout(function(){
      item.classList.add('rv-notif-leaving');
      setTimeout(function(){if(item.parentNode)item.remove()},200);
    },3500);
  }

  /* === Audit log === */
  var rvAuditLog=[];
  function rvAudit(action,details){

  /* === My Review Lookup === */
  (function(){
    var btn=document.getElementById('rvMyLookupBtn');
    var inp=document.getElementById('rvMyLookupName');
    var res=document.getElementById('rvMyResult');
    if(!btn||!inp||!res)return;
    function doLookup(){
      var val=inp.value.trim();if(!val)return;
      btn.disabled=true;btn.textContent='...';
      var isId=/^\\d{17,20}$/.test(val);
      var url='/api/idleon/account-reviews/my-status?'+(isId?'discordId=':'name=')+encodeURIComponent(val);
      fetch(url).then(function(r){return r.json()}).then(function(d){
        btn.disabled=false;btn.innerHTML='&#x1F50D; Lookup';
        res.style.display='block';
        if(!d.success||!d.found){res.innerHTML='<div style="color:var(--txt3);font-size:12px;padding:6px 0">No review found for <strong>'+safe(val)+'</strong>. You may not have submitted a review request yet.</div>';return;}
        var statusColors={pending:'var(--err)','in-progress':'var(--warn)',completed:'var(--ok)','on-hold':'#607d8b'};
        var statusColor=statusColors[d.status]||'var(--txt2)';
        var html='<div style="background:var(--bg3);border:1px solid var(--brd);border-radius:var(--r-s);padding:10px 12px">';
        html+='<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:6px"><span style="font-size:14px;font-weight:800;color:#fff">'+safe(d.name)+'</span><span style="display:inline-flex;align-items:center;gap:4px;font-size:11px;font-weight:700;color:'+statusColor+'"><span style="width:7px;height:7px;border-radius:50%;background:'+statusColor+'"></span>'+safe(d.status||'pending')+'</span></div>';
        html+='<div style="display:grid;grid-template-columns:1fr 1fr;gap:4px 12px;font-size:11px;color:var(--txt2)">';
        if(d.position)html+='<div>&#x1F4CD; Position: <strong style="color:var(--acc)">#'+d.position+'</strong> of '+d.totalInQueue+'</div>';
        if(d.priority==='redeemed')html+='<div>&#x2B50; <strong style="color:#c9a6ff">Twitch Redeemed</strong></div>';
        html+='<div>&#x1F4C5; Requested: '+new Date(d.requestedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+'</div>';
        if(d.redeemedAt)html+='<div>&#x1F4FA; Redeemed: '+new Date(d.redeemedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+'</div>';
        if(d.completedAt)html+='<div>&#x2705; Completed: '+new Date(d.completedAt).toLocaleDateString('en-US',{month:'short',day:'numeric',year:'numeric'})+'</div>';
        if(d.completedBy)html+='<div>&#x1F464; Reviewer: <strong>'+safe(d.completedBy)+'</strong></div>';
        if(d.notes)html+='<div style="grid-column:1/-1">&#x1F4DD; Notes: '+safe(d.notes)+'</div>';
        html+='</div>';
        if(d.feedback){
          html+='<div style="margin-top:8px;padding:8px 10px;background:var(--ok-d);border:1px solid rgba(76,175,80,.25);border-radius:var(--r-s)">';
          html+='<div style="font-size:10px;font-weight:700;color:var(--ok);margin-bottom:3px">&#x1F4AC; Reviewer Feedback</div>';
          html+='<div style="font-size:12px;color:var(--txt);white-space:pre-wrap;word-break:break-word">'+safe(d.feedback)+'</div>';
          html+='</div>';
        }else if(d.status==='completed'){
          html+='<div style="margin-top:6px;font-size:11px;color:var(--txt3)">&#x2139;&#xFE0F; Feedback may not be available if the thread was deleted.</div>';
        }else if(d.status!=='completed'){
          html+='<div style="margin-top:6px;font-size:11px;color:var(--txt3)">&#x23F3; Your review is in the queue. You will receive feedback once completed.</div>';
        }
        html+='</div>';
        res.innerHTML=html;
      }).catch(function(){btn.disabled=false;btn.innerHTML='&#x1F50D; Lookup';res.style.display='block';res.innerHTML='<div style="color:var(--err);font-size:11px">Failed to fetch. Try again.</div>';});
    }
    btn.addEventListener('click',doLookup);
    inp.addEventListener('keydown',function(e){if(e.key==='Enter')doLookup();});
  })();
    rvAuditLog.unshift({time:Date.now(),action:action,details:details||''});
    if(rvAuditLog.length>200)rvAuditLog.length=200;
    renderAuditLog();
  }
  function renderAuditLog(){
    var el=document.getElementById('rvAuditLog');
    var cnt=document.getElementById('rvAuditCount');
    if(!el)return;
    if(cnt)cnt.textContent='('+rvAuditLog.length+')';
    if(!rvAuditLog.length){el.innerHTML='<div style="color:var(--txt3);text-align:center;padding:10px">No actions recorded yet</div>';return;}
    el.innerHTML=rvAuditLog.map(function(e){
      var t=new Date(e.time);
      var cls='rv-audit-action';
      if(/delet|remov|clear/i.test(e.action))cls+=' rv-audit-delete';
      else if(/add|create|import/i.test(e.action))cls+=' rv-audit-create';
      else if(/updat|edit|mov|status/i.test(e.action))cls+=' rv-audit-update';
      return '<div class="rv-audit-entry"><span class="rv-audit-time">'+t.toLocaleTimeString()+'</span><span class="'+cls+'">'+safe(e.action)+'</span><span>'+safe(e.details)+'</span></div>';
    }).join('');
  }

  /* === Confirm dialog === */
  function rvConfirm(title,message,details,onConfirm,opts){
    opts=opts||{};
    var overlay=document.createElement('div');
    overlay.className='rv-confirm-overlay';
    var html='<div class="rv-confirm-dialog"><h3>'+(opts.icon||'\\u26A0\\uFE0F')+' '+safe(title)+'</h3><p>'+safe(message)+'</p>';
    if(details)html+='<div class="rv-confirm-details">'+safe(details)+'</div>';
    if(opts.warn)html+='<div class="rv-confirm-warn">\\u26A0\\uFE0F '+safe(opts.warn)+'</div>';
    html+='<div class="rv-confirm-actions"><button class="rv-confirm-cancel">Cancel</button><button class="'+(opts.danger?'rv-confirm-danger':'rv-confirm-ok')+'">'+(opts.confirmText||'Confirm')+'</button></div></div>';
    overlay.innerHTML=html;
    document.body.appendChild(overlay);
    overlay.querySelector('.rv-confirm-cancel').addEventListener('click',function(){overlay.remove()});
    overlay.querySelector('.rv-confirm-danger,.rv-confirm-ok').addEventListener('click',function(){overlay.remove();onConfirm()});
    overlay.addEventListener('click',function(ev){if(ev.target===overlay)overlay.remove()});
    /* Focus confirm button */
    var confirmBtn=overlay.querySelector('.rv-confirm-danger,.rv-confirm-ok');
    if(confirmBtn)setTimeout(function(){confirmBtn.focus()},50);
  }

  /* === Rate limiter === */
  var rvApiCalls={};
  function rvRateOk(key,minMs){
    minMs=minMs||1000;
    var now=Date.now();
    if(rvApiCalls[key]&&now-rvApiCalls[key]<minMs){
      rvNotify('Please wait before repeating this action','warn');
      return false;
    }
    rvApiCalls[key]=now;
    return true;
  }

  /* === Backup before destructive actions === */
  function rvBackupBeforeAction(actionName){
    var reviews=model.accountReviews||[];
    if(!reviews.length)return;
    var backup={timestamp:Date.now(),action:actionName,count:reviews.length,data:JSON.parse(JSON.stringify(reviews))};
    try{
      var key='rvBackup_'+Date.now();
      localStorage.setItem(key,JSON.stringify(backup));
      var allKeys=Object.keys(localStorage).filter(function(k){return k.startsWith('rvBackup_')}).sort();
      while(allKeys.length>5){localStorage.removeItem(allKeys.shift())}
    }catch(e){/* storage full */}
  }

  /* === Import parsers === */
  var rvImportData=[];
  function parseImportCSV(text){
    var lines=text.split(/\\r?\\n/).filter(function(l){return l.trim()});
    if(!lines.length)return[];
    var headers=lines[0].split(',').map(function(h){return h.trim().replace(/^"|"$/g,'').toLowerCase()});
    var nameIdx=headers.indexOf('name');
    if(nameIdx<0)nameIdx=0;
    var twitchIdx=headers.indexOf('twitch');if(twitchIdx<0)twitchIdx=headers.indexOf('twitchname');
    var notesIdx=headers.indexOf('notes');
    var prioIdx=headers.indexOf('priority');
    return lines.slice(1).map(function(line){
      var cols=line.split(',').map(function(c){return c.trim().replace(/^"|"$/g,'')});
      var name=cols[nameIdx]||'';
      if(!name)return null;
      return{name:name,twitchName:twitchIdx>=0?cols[twitchIdx]:'',notes:notesIdx>=0?cols[notesIdx]:'',priority:prioIdx>=0&&cols[prioIdx]==='redeemed'?'redeemed':'normal'};
    }).filter(Boolean);
  }
  function parseImportJSON(text){
    try{
      var data=JSON.parse(text);
      var arr=Array.isArray(data)?data:(data.accountReviews||data.reviews||data.data||[]);
      return arr.map(function(r){
        if(!r||!r.name)return null;
        return{name:r.name,twitchName:r.twitchName||r.twitch||'',notes:r.notes||'',priority:r.priority||'normal'};
      }).filter(Boolean);
    }catch(e){return[];}
  }
  function validateImport(items){
    var existing=(model.accountReviews||[]).map(function(r){return(r.name||'').toLowerCase()});
    return items.map(function(item){
      var dup=existing.indexOf(item.name.toLowerCase())>=0;
      var valid=item.name.length>=2&&item.name.length<=50;
      return Object.assign({},item,{isDuplicate:dup,isValid:valid});
    });
  }

  /* === DOM cache & debounce === */
  var rvDom={};
  function rvEl(id){if(!rvDom[id])rvDom[id]=document.getElementById(id);return rvDom[id]}
  function rvDebounce(fn,ms){var t;return function(){var self=this,args=arguments;clearTimeout(t);t=setTimeout(function(){fn.apply(self,args)},ms)}}
  var rvLoadController=null;
  var rvLastLoadTime=0;
  var rvLocalCache=null;
  /* === Category classification === */
  var categoryDefs=[
    {key:'general',label:'General',color:'#4fc3f7',bg:'#4fc3f722',words:['progress','general','direction','stuck','focus','priority','priorities','what to do','what should','advice','tip','guide','help','review','look at','look through','check']},
    {key:'anvil',label:'Anvil',color:'#ef9a9a',bg:'#ef9a9a22',words:['anvil','smith','craft','production']},
    {key:'stamps',label:'Stamps',color:'#dce775',bg:'#dce77522',words:['stamp','gilded','golden stamp']},
    {key:'cards',label:'Cards',color:'#f48fb1',bg:'#f48fb122',words:['card','card set','card bonus']},
    {key:'alchemy',label:'Alchemy',color:'#69f0ae',bg:'#69f0ae22',words:['alchemy','vial','bubble','cauldron','brew','liquid','sigil']},
    {key:'obols',label:'Obols',color:'#bcaaa4',bg:'#bcaaa422',words:['obol','circle','hyper']},
    {key:'worship',label:'Worship',color:'#80deea',bg:'#80deea22',words:['worship','prayer','soul','totem','charge']},
    {key:'printer',label:'Printer',color:'#b0bec5',bg:'#b0bec522',words:['printer','sampling','sample','3d']},
    {key:'refinery',label:'Refinery',color:'#a1887f',bg:'#a1887f22',words:['refinery','salt','rank up','refine']},
    {key:'construction',label:'Construction',color:'#90a4ae',bg:'#90a4ae22',words:['construct','building','shrine','tower def']},
    {key:'breeding',label:'Breeding',color:'#ffab91',bg:'#ffab9122',words:['breed','pet','shiny','egg','territory']},
    {key:'lab',label:'Lab',color:'#ff8a65',bg:'#ff8a6522',words:['lab','mainframe','chip','jewel','console']},
    {key:'cooking',label:'Cooking',color:'#fff176',bg:'#fff17622',words:['cook','meal','kitchen','spice','lad']},
    {key:'sailing',label:'Sailing',color:'#81d4fa',bg:'#81d4fa22',words:['sail','boat','island','captain','artifact','loot']},
    {key:'divinity',label:'Divinity',color:'#ce93d8',bg:'#ce93d822',words:['divinity','god','divin','link','bless','diety','deity']},
    {key:'gaming',label:'Gaming',color:'#aed581',bg:'#aed58122',words:['gaming','bit','snipe','plant','npc']},
    {key:'sneaking',label:'Sneaking',color:'#607d8b',bg:'#607d8b22',words:['sneak','jade','pristine','ninja','floor']},
    {key:'farming',label:'Farming',color:'#66bb6a',bg:'#66bb6a22',words:['farm','crop','seed','plot','OG','magic bean','land rank','evolution']},
    {key:'summoning',label:'Summoning',color:'#7e57c2',bg:'#7e57c222',words:['summon','familiar','essence','spirit','cyan','yellow','white']},
    {key:'equinox',label:'Equinox',color:'#42a5f5',bg:'#42a5f522',words:['equinox','dream','bar','fillrate']},
    {key:'talent',label:'Talents',color:'#e6ee9c',bg:'#e6ee9c22',words:['talent','build','class','preset','skill']},
    {key:'gear',label:'Gear',color:'#ffcc80',bg:'#ffcc8022',words:['gear','equip','armor','weapon','helm','tool','pendant','ring']},
    {key:'quest',label:'Quests',color:'#c5e1a5',bg:'#c5e1a522',words:['quest','npc','task','merit']},
    {key:'boss',label:'Boss',color:'#ff5252',bg:'#ff525222',words:['boss','raid','key','skull','mini boss','chizoar','kattlecruk','troll']},
    {key:'w6',label:'W6',color:'#e040fb',bg:'#e040fb22',words:['w6','world 6','beanstalk','cropius','landrankiii','land rank 3']}
  ];
  function classifyReview(review){
    if(review.categories&&review.categories.length){
      return review.categories.map(function(key){
        var def=categoryDefs.find(function(d){return d.key===key||d.label.toLowerCase()===key.toLowerCase()});
        return{key:key,label:def?def.label:key,color:def?def.color:'#888',bg:def?def.bg:'#88888822',confidence:'manual'};
      });
    }
    var text=((review.name||'')+' '+(review.notes||'')+' '+(review.twitchName||'')).toLowerCase();
    var matches=[];
    categoryDefs.forEach(function(def){
      var score=0;
      def.words.forEach(function(w){if(text.indexOf(w.toLowerCase())>=0)score++});
      if(score>0)matches.push({key:def.key,label:def.label,color:def.color,bg:def.bg,score:score,confidence:score>=3?'high':score>=2?'med':'low'});
    });
    matches.sort(function(a,b){return b.score-a.score});
    return matches.length?matches:[];
  }

  /* === Load data === */
  function load(force){
    var now=Date.now();
    if(!force&&rvLocalCache&&now-rvLastLoadTime<2000){
      model=rvLocalCache;
      renderStats();renderReviews();return;
    }
    if(rvLoadController)rvLoadController.abort();
    rvLoadController=new AbortController();
    return fetch('/api/idleon/gp',{signal:rvLoadController.signal}).then(function(r){return r.json()}).then(function(d){
      rvLoadController=null;
      model=d;rvLocalCache=d;rvLastLoadTime=Date.now();
      renderStats();renderCatFilter();renderReviews();updateQuickFilterCounts();
    }).catch(function(e){
      if(e.name!=='AbortError'){
        rvNotify('Failed to load data: '+e.message,'error');
      }
    });
  }

  /* === Render category filter bar === */
  function renderCatFilter(){
    var el=document.getElementById('rvCatFilter');if(!el)return;
    var reviews=(model.accountReviews||[]).filter(function(r){return r.status!=='completed'});
    var catCounts={};
    reviews.forEach(function(r){
      var cats=classifyReview(r);
      cats.forEach(function(c){catCounts[c.key]=(catCounts[c.key]||0)+1});
    });
    var sorted=Object.keys(catCounts).sort(function(a,b){return catCounts[b]-catCounts[a]});
    var html='<button class="rv-cat-filter-all'+(filters.category?'':' active')+'" id="rvCatAll">All</button>';
    sorted.forEach(function(key){
      var def=categoryDefs.find(function(d){return d.key===key});
      if(!def)return;
      var isActive=filters.category===key;
      html+='<button class="rv-cat-filter-btn'+(isActive?' active':'')+'" data-catkey="'+key+'" style="color:'+def.color+';background:'+(isActive?def.bg:'transparent')+'" title="'+def.label+': '+catCounts[key]+'">'+def.label+' <span style="opacity:.6;font-size:8px">'+catCounts[key]+'</span></button>';
    });
    el.innerHTML=html;
  }

  /* === Render stats === */
  function renderStats(){
    var all=model.accountReviews||[];
    var active=all.filter(function(r){return r.status!=='completed'});
    var pending=all.filter(function(r){return r.status==='pending'||!r.status});
    var inProg=all.filter(function(r){return r.status==='in-progress'});
    var done=all.filter(function(r){return r.status==='completed'});
    var redeemed=active.filter(function(r){return r.priority==='redeemed'});
    var now=Date.now();var day=86400000;
    var today=done.filter(function(r){return r.completedAt&&now-r.completedAt<day});
    var stale=active.filter(function(r){return r.requestedAt&&now-r.requestedAt>7*day});

    function setNum(id,val,deltaId){
      var el=document.getElementById(id);
      if(el){
        var prev=parseInt(el.textContent)||0;
        el.textContent=val;
        /* Zero state styling */
        var stat=el.closest('.rv-stat');
        if(stat)stat.classList.toggle('rv-stat-zero',val===0);
        /* Delta indicator */
        if(deltaId&&rvPrevStats[id]!==undefined&&rvPrevStats[id]!==val){
          var delta=val-rvPrevStats[id];
          var deltaEl=document.getElementById(deltaId);
          if(deltaEl){
            deltaEl.textContent=(delta>0?'+':'')+delta;
            deltaEl.className='rv-stat-delta visible '+(delta>0?'up':'down');
            setTimeout(function(){deltaEl.classList.remove('visible')},3000);
          }
          /* Pulse animation */
          if(stat){stat.classList.remove('rv-stat-pulse');void stat.offsetWidth;stat.classList.add('rv-stat-pulse');}
        }
        rvPrevStats[id]=val;
      }
    }
    setNum('rvStatTotal',active.length,'rvDeltaQueue');
    setNum('rvStatRedeemed',redeemed.length,'rvDeltaRedeemed');
    setNum('rvStatPending',pending.length,'rvDeltaPending');
    setNum('rvStatInProg',inProg.length,'rvDeltaInProg');
    setNum('rvStatDone',done.length,'rvDeltaDone');
    setNum('rvStatToday',today.length,'rvDeltaToday');
    setNum('rvStatStale',stale.length,'rvDeltaStale');

    /* Avg wait time */
    var waitTimes=active.filter(function(r){return r.requestedAt}).map(function(r){return now-r.requestedAt});
    var avgWait=waitTimes.length?waitTimes.reduce(function(a,b){return a+b},0)/waitTimes.length:0;
    var avgEl=document.getElementById('rvStatAvgWait');
    if(avgEl)avgEl.textContent=avgWait>day?Math.round(avgWait/day)+'d':avgWait>3600000?Math.round(avgWait/3600000)+'h':avgWait>60000?Math.round(avgWait/60000)+'m':'-';

    var oldest=waitTimes.length?Math.max.apply(null,waitTimes):0;
    var oldEl=document.getElementById('rvStatOldest');
    if(oldEl)oldEl.textContent=oldest>day?Math.round(oldest/day)+'d':oldest>3600000?Math.round(oldest/3600000)+'h':'-';

    var compTimes=done.filter(function(r){return r.requestedAt&&r.completedAt}).map(function(r){return r.completedAt-r.requestedAt});
    var avgComp=compTimes.length?compTimes.reduce(function(a,b){return a+b},0)/compTimes.length:0;
    var compEl=document.getElementById('rvStatAvgComplete');
    if(compEl)compEl.textContent=avgComp>day?Math.round(avgComp/day)+'d':avgComp>3600000?Math.round(avgComp/3600000)+'h':avgComp>60000?Math.round(avgComp/60000)+'m':'-';

    /* Sparkline - 7 day activity */
    var spark=document.getElementById('rvSparkline');
    if(spark){
      var days=[];for(var i=6;i>=0;i--){var ds=now-i*day;var de=ds+day;
        days.push(all.filter(function(r){return(r.completedAt&&r.completedAt>=ds&&r.completedAt<de)||(r.requestedAt&&r.requestedAt>=ds&&r.requestedAt<de)}).length);
      }
      var max=Math.max.apply(null,days)||1;
      spark.innerHTML=days.map(function(d,idx){
        var h=Math.max(2,Math.round(d/max*24));
        var dayNames=['Sun','Mon','Tue','Wed','Thu','Fri','Sat'];
        var dt=new Date(now-(6-idx)*day);
        return '<div class="rv-sparkline-bar" style="height:'+h+'px" title="'+dayNames[dt.getDay()]+': '+d+'"></div>';
      }).join('');
    }

    /* Category chart */
    var catChart=document.getElementById('rvCatChart');
    if(catChart){
      var catCounts={};
      active.forEach(function(r){var cats=classifyReview(r);cats.slice(0,1).forEach(function(c){catCounts[c.label]=(catCounts[c.label]||{count:0,color:c.color,bg:c.bg});catCounts[c.label].count++})});
      var sorted=Object.keys(catCounts).sort(function(a,b){return catCounts[b].count-catCounts[a].count}).slice(0,6);
      catChart.innerHTML=sorted.map(function(k){return '<span class="rv-cat-chip" style="background:'+catCounts[k].bg+';color:'+catCounts[k].color+'">'+k+' '+catCounts[k].count+'</span>'}).join('');
    }

    /* Source bar */
    var srcInfo=document.getElementById('rvSourceInfo');
    var srcBar=document.getElementById('rvSourceBar');
    if(srcBar){
      var scan=active.filter(function(r){return r.source==='scan'}).length;
      var twitch=active.filter(function(r){return r.source==='twitch'}).length;
      var manual=active.length-scan-twitch;
      var total=active.length||1;
      srcBar.innerHTML='<div class="rv-source-seg" style="width:'+Math.round(scan/total*100)+'%;background:#5865f2"></div><div class="rv-source-seg" style="width:'+Math.round(twitch/total*100)+'%;background:#9146ff"></div><div class="rv-source-seg" style="width:'+Math.round(manual/total*100)+'%;background:#4fc3f7"></div>';
      if(srcInfo)srcInfo.innerHTML='<span style="color:#5865f2">\\u25CF Discord '+scan+'</span> &middot; <span style="color:#9146ff">\\u25CF Twitch '+twitch+'</span> &middot; <span style="color:#4fc3f7">\\u25CF Manual '+manual+'</span>';
    }

    /* Twitch status */
    var tDot=document.getElementById('rvTwitchDot');var tLabel=document.getElementById('rvTwitchLabel');
    if(tDot&&tLabel){
      var hasTwitch=all.some(function(r){return r.source==='twitch'});
      var recentTwitch=all.some(function(r){return r.source==='twitch'&&r.requestedAt&&now-r.requestedAt<3600000});
      tDot.className='rv-twitch-dot'+(recentTwitch?' connected':hasTwitch?' stale':'');
      tLabel.textContent=recentTwitch?'Live':hasTwitch?'Synced':'Twitch';
    }

    /* Stale banner */
    var staleBanner=document.getElementById('rvStaleBanner');
    var staleMsg=document.getElementById('rvStaleMsg');
    if(staleBanner&&staleMsg){
      if(stale.length>0){
        staleBanner.classList.add('visible');
        staleMsg.textContent=stale.length+' review'+(stale.length>1?'s':'')+' waiting 7+ days. Oldest: '+(stale[0]?stale[0].name:'?');
      }else{staleBanner.classList.remove('visible')}
    }

    /* Capacity bar */
    var capLabel=document.getElementById('rvCapLabel');
    var capPct=document.getElementById('rvCapPct');
    var capFill=document.getElementById('rvCapFill');
    if(capLabel&&capPct&&capFill){
      var pct=Math.min(100,Math.round(active.length/CAPACITY_MAX*100));
      capLabel.textContent=active.length+' / '+CAPACITY_MAX;
      capPct.textContent=pct+'%';
      capFill.style.width=pct+'%';
      capFill.style.background=pct>90?'var(--err)':pct>70?'var(--warn)':'var(--acc)';
    }

    /* Subtitle with context */
    var sub=document.getElementById('rvSubtitle');
    if(sub){
      if(active.length===0&&done.length===0){
        sub.innerHTML='No reviews yet. <span class="rv-hl">Scan a channel</span> or <span class="rv-hl">add manually</span> to get started.';
      }else if(active.length===0){
        sub.innerHTML='All caught up! <span class="rv-hl">'+done.length+'</span> reviews completed.';
      }else{
        sub.innerHTML='<span class="rv-hl">'+active.length+'</span> in queue'+(redeemed.length?' (<span class="rv-hl-warn">'+redeemed.length+' redeemed</span>)':'')+(stale.length?' \\u2022 <span style="color:var(--err)">'+stale.length+' stale</span>':'');
      }
    }
  }
  /* === Quick filter counts === */
  function updateQuickFilterCounts(){
    var all=model.accountReviews||[];
    var active=all.filter(function(r){return r.status!=='completed'});
    var now=Date.now();var day=86400000;
    var counts={
      all:active.length,
      redeemed:active.filter(function(r){return r.priority==='redeemed'}).length,
      stale:active.filter(function(r){return r.requestedAt&&now-r.requestedAt>7*day}).length,
      'in-progress':active.filter(function(r){return r.status==='in-progress'}).length,
      pending:active.filter(function(r){return r.status==='pending'||!r.status}).length,
      'on-hold':active.filter(function(r){return r.status==='on-hold'}).length,
      today:all.filter(function(r){return r.status==='completed'&&r.completedAt&&now-r.completedAt<day}).length
    };
    var idMap={all:'rvQfAll',redeemed:'rvQfRedeemed',stale:'rvQfStale','in-progress':'rvQfActive',pending:'rvQfPending','on-hold':'rvQfOnHold',today:'rvQfToday'};
    Object.keys(idMap).forEach(function(k){
      var el=document.getElementById(idMap[k]);
      if(el)el.textContent=counts[k]||0;
    });
  }

  /* === Apply filters === */
  function applyFilters(){
    var all=model.accountReviews||[];
    var active=all.filter(function(r){return r.status!=='completed'});
    var completed=all.filter(function(r){return r.status==='completed'});
    var filtered=active;
    var now=Date.now();var day=86400000;

    /* Quick filter special handling */
    var qf=document.querySelector('.rv-qf.active');
    var qfVal=qf?qf.dataset.qf:'all';

    if(filters.search){
      var q=filters.search.toLowerCase();
      filtered=filtered.filter(function(r){
        return(r.name||'').toLowerCase().indexOf(q)>=0||(r.notes||'').toLowerCase().indexOf(q)>=0||(r.twitchName||'').toLowerCase().indexOf(q)>=0||(r.redeemedBy||'').toLowerCase().indexOf(q)>=0;
      });
    }
    if(filters.status){filtered=filtered.filter(function(r){return(r.status||'pending')===filters.status})}
    if(filters.priority){filtered=filtered.filter(function(r){return(r.priority||'normal')===filters.priority})}
    if(filters.source){filtered=filtered.filter(function(r){return r.source===filters.source})}
    if(filters.category){filtered=filtered.filter(function(r){var cats=classifyReview(r);return cats.some(function(c){return c.key===filters.category})})}

    /* Quick filter overrides */
    if(qfVal==='redeemed')filtered=filtered.filter(function(r){return r.priority==='redeemed'});
    else if(qfVal==='stale')filtered=filtered.filter(function(r){return r.requestedAt&&now-r.requestedAt>7*day});
    else if(qfVal==='in-progress')filtered=filtered.filter(function(r){return r.status==='in-progress'});
    else if(qfVal==='pending')filtered=filtered.filter(function(r){return r.status==='pending'||!r.status});
    else if(qfVal==='on-hold')filtered=filtered.filter(function(r){return r.status==='on-hold'});
    else if(qfVal==='today'){/* Show completed today instead */
      filtered=completed.filter(function(r){return r.completedAt&&now-r.completedAt<day});
    }

    /* Sort */
    var sort=filters.sort||'priority-date';
    if(sort==='priority-date'){
      filtered.sort(function(a,b){
        var pa=a.priority==='redeemed'?0:1;var pb=b.priority==='redeemed'?0:1;
        if(pa!==pb)return pa-pb;
        return(a.requestedAt||0)-(b.requestedAt||0);
      });
    }else if(sort==='date-asc'){filtered.sort(function(a,b){return(a.requestedAt||0)-(b.requestedAt||0)})}
    else if(sort==='date-desc'){filtered.sort(function(a,b){return(b.requestedAt||0)-(a.requestedAt||0)})}
    else if(sort==='name-asc'){filtered.sort(function(a,b){return(a.name||'').localeCompare(b.name||'')})}
    else if(sort==='name-desc'){filtered.sort(function(a,b){return(b.name||'').localeCompare(a.name||'')})}
    else if(sort==='status'){
      var order={pending:0,'in-progress':1,'on-hold':2,completed:3};
      filtered.sort(function(a,b){return(order[a.status||'pending']||0)-(order[b.status||'pending']||0)});
    }
    return{filtered:filtered,completed:completed,active:active};
  }

  /* === Render reviews table === */
  function renderReviews(){
    var result=applyFilters();
    var filtered=result.filtered;
    var completed=result.completed;
    var rows=document.getElementById('rvRows');
    var countEl=document.getElementById('rvResultCount');
    if(!rows)return;

    var now=Date.now();var day=86400000;

    if(countEl){
      var total=(model.accountReviews||[]).filter(function(r){return r.status!=='completed'}).length;
      countEl.textContent=filtered.length===total?total+' reviews':filtered.length+' of '+total+' reviews';
    }

    if(!filtered.length){
      var hasFilters=filters.search||filters.status||filters.priority||filters.source||filters.category;
      rows.innerHTML='<tr><td colspan="9"><div class="rv-empty"><div class="rv-empty-icon">'+(hasFilters?'\\uD83D\\uDD0D':'\\uD83D\\uDCCB')+'</div><div class="rv-empty-msg">'+(hasFilters?'No reviews match your filters':'No reviews in queue yet')+'</div><div class="rv-empty-sub">'+(hasFilters?'Try adjusting or <a href="#" onclick="document.getElementById(&#39;rvFilterReset&#39;).click();return false" style="color:var(--acc)">resetting filters</a>':'Scan a channel, sync Twitch, or add one manually')+'</div>'+(hasFilters?'':'<button class="rv-empty-action" onclick="document.getElementById(&#39;rvAdd&#39;).click()">\\u2795 Add Review</button>')+'</div></td></tr>';
      return;
    }

    rows.innerHTML=filtered.map(function(r,idx){
      var cats=classifyReview(r);
      var age=r.requestedAt?now-r.requestedAt:0;
      var dateClass=age<day?'rv-date-fresh':age<3*day?'rv-date-recent':age<7*day?'rv-date-waiting':age<14*day?'rv-date-old':'rv-date-stale';
      var staleClass=age>14*day?'rv-stale-danger':age>7*day?'rv-stale-warn':'rv-stale-ok';
      var isRedeemed=r.priority==='redeemed';
      var isSelected=rvSelected[r.id];
      var isStale=age>7*day;
      var isTwitch=r.source==='twitch';
      var status=r.status||'pending';

      /* Name cell with avatar & sub-info */
      var displayName=r.discordName||r.name||'';
      var profileNameText=r.name||'';
      var nameHtml='<div class="rv-name-wrap"><div style="display:flex;align-items:center;gap:4px">';
      if(r.discordAvatar)nameHtml+='<img class="rv-avatar" src="'+safe(r.discordAvatar)+'" alt="" loading="lazy">';
      nameHtml+='<span class="rv-name" title="'+safe(displayName)+'">'+safe(displayName)+'</span>';
      nameHtml+='<button class="rv-btn-copy" data-copy="'+safe(r.name)+'" title="Copy name">\\uD83D\\uDCCB</button>';
      nameHtml+='</div>';
      /* Profile/account name in grey below discord username */
      if(profileNameText&&profileNameText!==displayName)nameHtml+='<div style="font-size:10px;color:var(--txt3);margin-top:1px">'+safe(profileNameText)+'</div>';
      /* Sub-info line */
      var subParts=[];
      if(r.redeemedBy||r.twitchName)subParts.push('<a class="rv-twitch-link" href="https://twitch.tv/'+safe(r.twitchName||r.redeemedBy)+'" target="_blank" rel="noopener">\\uD83D\\uDCFA '+safe(r.twitchName||r.redeemedBy)+'</a>');
      if(r.source)subParts.push('<span style="opacity:.5">'+safe(r.source)+'</span>');
      if(isRedeemed&&r.redeemedAt)subParts.push('<span class="rv-redeemed-time">\\u2B50 '+new Date(r.redeemedAt).toLocaleDateString()+'</span>');
      if(subParts.length)nameHtml+='<div class="rv-name-sub">'+subParts.join(' \\u2022 ')+'</div>';
      /* Notes preview */
      if(r.notes){
        var noteText=(r.notes||'').replace(urlRe,'').trim();
        if(noteText)nameHtml+='<div class="rv-notes" title="'+safe(r.notes)+'">'+safe(noteText)+'</div>';
      }
      nameHtml+='</div>';

      /* Profile link */
      var profileHtml='';
      var links=(r.notes||'').match(urlRe);
      if(links&&links[0]){
        var url=links[0];
        var isIdleon=url.indexOf('idleontoolbox')>=0||url.indexOf('idleonefficiency')>=0;
        var isCogstools=url.indexOf('cogstools')>=0||url.indexOf('cogstruction')>=0;
        var label=isIdleon?'\\uD83D\\uDCCA Toolbox':isCogstools?'\\uD83E\\uDDE9 Cogs':'\\uD83D\\uDD17 Link';
        profileHtml='<a class="rv-profile-link" href="'+safe(url)+'" target="_blank" rel="noopener" title="'+safe(url)+'">'+label+'</a>';
      }else if(r.source==='scan'){
        profileHtml='<span style="color:var(--warn);font-size:10px" title="Thread has no profile link">\\u26A0\\uFE0F No link</span>';
      }

      /* Priority cell */
      var prioHtml=isRedeemed?'<span class="rv-prio-redeemed">\\u2B50 Redeemed</span>':'<span class="rv-prio-normal">Normal</span>';

      /* Category pills */
      var catHtml='';
      if(cats.length){
        var visible=cats.slice(0,2);
        var hidden=cats.slice(2);
        catHtml=visible.map(function(c){
          var confDot=c.confidence?'<span class="rv-cat-conf rv-cat-conf-'+c.confidence+'"></span>':'';
          return '<span class="rv-cat'+(c.confidence==='manual'?' rv-cat-manual':'')+'" style="background:'+c.bg+';color:'+c.color+'">'+safe(c.label)+confDot+'</span>';
        }).join('');
        if(hidden.length){
          catHtml+='<span class="rv-cat-more">+'+hidden.length+'<div class="rv-cat-popup">'+hidden.map(function(c){
            return '<span class="rv-cat" style="background:'+c.bg+';color:'+c.color+'">'+safe(c.label)+'</span>';
          }).join('')+'</div></span>';
        }
      }

      /* Date cell */
      var dateHtml='';
      if(r.requestedAt){
        var d=new Date(r.requestedAt);
        var ageStr=age<60000?'just now':age<3600000?Math.round(age/60000)+'m ago':age<day?Math.round(age/3600000)+'h ago':Math.round(age/day)+'d ago';
        dateHtml='<span class="rv-stale-dot '+staleClass+'"></span><span class="rv-date '+dateClass+'">'+d.toLocaleDateString('en-US',{month:'short',day:'numeric'})+'</span><span class="rv-date-ago">'+ageStr+'</span>';
      }
      if(status==='completed'&&r.completedAt){
        dateHtml+='<span class="rv-date-ago" style="color:var(--ok)">\\u2705 '+new Date(r.completedAt).toLocaleDateString('en-US',{month:'short',day:'numeric'})+'</span>';
      }

      /* Status cell */
      var statusHtml='<span class="rv-status-dot '+status+'">'+({pending:'Pending','in-progress':'Active',completed:'Done','on-hold':'On Hold'}[status]||status)+'</span>';

      /* Queue position for pending */
      var queuePos='';
      if(status==='pending'||!r.status){queuePos='<span style="font-size:9px;color:var(--txt3);display:block">#'+(idx+1)+' in queue</span>';}

      /* Actions */
      var actions='<div class="rv-actions">';
      if(status==='pending'||!r.status)actions+='<button class="rv-btn-claim" data-claimreview="'+safe(r.id)+'" title="Start review">\\u25B6</button>';
      actions+='<button class="rv-btn-sm" data-editreview="'+safe(r.id)+'" title="Edit">\\u270F\\uFE0F</button>';
      if(status!=='completed')actions+='<button class="rv-btn-sm rv-act-extra" data-completereview="'+safe(r.id)+'" title="Complete">\\u2705</button>';
      var lastPing=r.lastPingedAt||0;var canPing=now-lastPing>1800000;
      if(r.messageUrl&&status!=='completed')actions+='<button class="rv-btn-sm rv-act-extra'+(canPing?'':' rv-rate-limited')+'" data-pingreview="'+safe(r.id)+'" title="'+(canPing?'Send reminder':'Ping cooldown (30m)')+'">\\uD83D\\uDD14</button>';
      actions+='<button class="rv-btn-sm danger rv-act-extra" data-delreview="'+safe(r.id)+'" title="Delete">\\uD83D\\uDDD1</button>';
      actions+='</div>';

      var rowClass='';
      if(isSelected)rowClass+=' rv-row-selected';
      if(isRedeemed)rowClass+=' rv-row-redeemed';
      if(isStale)rowClass+=' rv-row-stale';

      return '<tr class="'+rowClass.trim()+'" data-rvid="'+safe(r.id)+'"'+(isTwitch?' data-twitch-row':'')+'>'
        +'<td style="padding:4px 2px"><input type="checkbox" class="rv-cb rv-row-cb" data-rvcheck="'+safe(r.id)+'"'+(isSelected?' checked':'')+'></td>'
        +'<td style="padding:4px 2px;text-align:center;cursor:pointer;position:relative" data-posctl="'+safe(r.id)+'"><span style="color:var(--acc);font-size:12px;font-weight:700">'+(idx+1)+'</span> <span style="font-size:9px;color:var(--acc);opacity:.7">&#x25BC;</span></td>'
        +'<td>'+nameHtml+'</td>'
        +'<td>'+profileHtml+'</td>'
        +'<td>'+prioHtml+'</td>'
        +'<td>'+catHtml+'</td>'
        +'<td>'+dateHtml+queuePos+'</td>'
        +'<td>'+statusHtml+'</td>'
        +'<td style="width:0;padding:0;border:0;overflow:hidden;position:absolute;opacity:0;pointer-events:none">'+actions+'</td>'
        +'</tr>';
    }).join('');

    /* Completed section — collapsible */
    var compEl=document.getElementById('rvCompleted');
    if(compEl){
      if(completed.length>0){
        compEl.style.display='';
        var recent=completed.sort(function(a,b){return(b.completedAt||0)-(a.completedAt||0)}).slice(0,10);
        var wasCollapsed=compEl.dataset.collapsed==='1';
        compEl.innerHTML='<h4 style="font-size:12px;color:var(--ok);margin:0 0 6px;font-weight:700;cursor:pointer;user-select:none;display:flex;align-items:center;gap:6px" id="rvCompletedToggle"><span id="rvCompletedArrow" style="transition:transform .2s;display:inline-block;font-size:10px;'+(wasCollapsed?'transform:rotate(-90deg)':'')+'">\\u25BC</span>\\u2705 Recently Completed ('+completed.length+')</h4>'
          +'<div id="rvCompletedBody" style="'+(wasCollapsed?'display:none':'')+'">' 
          +recent.map(function(r){
            return '<div class="rv-completed-item"><span style="color:var(--ok)">\\u2713</span><span style="font-weight:600;flex:1">'+safe(r.name)+'</span>'
              +(r.completedBy?'<span style="color:var(--txt3);font-size:10px">by '+safe(r.completedBy)+'</span>':'')
              +(r.completedAt?'<span style="color:var(--txt3);font-size:10px">'+new Date(r.completedAt).toLocaleDateString()+'</span>':'')
              +'</div>';
          }).join('')+'</div>';
        document.getElementById('rvCompletedToggle').addEventListener('click',function(){
          var body=document.getElementById('rvCompletedBody');
          var arrow=document.getElementById('rvCompletedArrow');
          var isHidden=body.style.display==='none';
          body.style.display=isHidden?'':'none';
          arrow.style.transform=isHidden?'':'rotate(-90deg)';
          compEl.dataset.collapsed=isHidden?'0':'1';
        });
      }else{compEl.style.display='none'}
    }
  }
  /* === Filter event listeners === */
  var searchHandler=rvDebounce(function(){
    filters.search=document.getElementById('rvFilterSearch').value.trim();
    var spinner=document.getElementById('rvSearchSpinner');
    if(spinner)spinner.classList.remove('active');
    renderReviews();updateActiveFilters();
  },250);

  document.getElementById('rvFilterSearch').addEventListener('input',function(){
    var spinner=document.getElementById('rvSearchSpinner');
    if(spinner&&this.value.length>=2)spinner.classList.add('active');
    searchHandler();
  });

  ['rvFilterStatus','rvFilterPrio','rvFilterSource','rvFilterSort'].forEach(function(id){
    var el=document.getElementById(id);if(!el)return;
    el.addEventListener('change',function(){
      var map={rvFilterStatus:'status',rvFilterPrio:'priority',rvFilterSource:'source',rvFilterSort:'sort'};
      filters[map[id]]=this.value;
      renderReviews();updateActiveFilters();updateFilterClears();
    });
  });

  document.getElementById('rvFilterReset').addEventListener('click',function(){
    filters={search:'',status:'',priority:'',source:'',category:'',sort:'priority-date'};
    document.getElementById('rvFilterSearch').value='';
    document.getElementById('rvFilterStatus').value='';
    document.getElementById('rvFilterPrio').value='';
    document.getElementById('rvFilterSource').value='';
    document.getElementById('rvFilterSort').value='priority-date';
    /* Reset quick filters */
    document.querySelectorAll('.rv-qf').forEach(function(b){b.classList.remove('active')});
    var allBtn=document.querySelector('[data-qf="all"]');if(allBtn)allBtn.classList.add('active');
    /* Reset category filter */
    document.querySelectorAll('.rv-cat-filter-btn').forEach(function(b){b.classList.remove('active')});
    var catAll=document.getElementById('rvCatAll');if(catAll)catAll.classList.add('active');
    renderReviews();updateActiveFilters();updateFilterClears();
    rvNotify('Filters reset','info');
  });

  /* Per-filter clear buttons */
  document.querySelectorAll('.rv-filter-clear').forEach(function(btn){
    btn.addEventListener('click',function(){
      var key=btn.dataset.fclear;
      var map={status:'rvFilterStatus',priority:'rvFilterPrio',source:'rvFilterSource'};
      filters[key]='';
      var sel=document.getElementById(map[key]);if(sel)sel.value='';
      renderReviews();updateActiveFilters();updateFilterClears();
    });
  });

  function updateFilterClears(){
    var map={status:'rvFilterStatus',priority:'rvFilterPrio',source:'rvFilterSource'};
    Object.keys(map).forEach(function(key){
      var btn=document.querySelector('[data-fclear="'+key+'"]');
      if(btn)btn.classList.toggle('visible',!!filters[key]);
    });
  }

  /* Active filter chips */
  function updateActiveFilters(){
    var el=document.getElementById('rvActiveFilters');if(!el)return;
    var chips=[];
    if(filters.search)chips.push({label:'Search: "'+filters.search+'"',key:'search'});
    if(filters.status)chips.push({label:'Status: '+filters.status,key:'status'});
    if(filters.priority)chips.push({label:'Priority: '+filters.priority,key:'priority'});
    if(filters.source)chips.push({label:'Source: '+filters.source,key:'source'});
    if(filters.category)chips.push({label:'Category: '+filters.category,key:'category'});
    el.innerHTML=chips.map(function(c){
      return '<span class="rv-af-chip">'+safe(c.label)+'<button data-afclear="'+c.key+'" title="Remove">&times;</button></span>';
    }).join('');
    /* Chip remove listeners */
    el.querySelectorAll('[data-afclear]').forEach(function(btn){
      btn.addEventListener('click',function(){
        var key=btn.dataset.afclear;
        filters[key]='';
        if(key==='search')document.getElementById('rvFilterSearch').value='';
        if(key==='status')document.getElementById('rvFilterStatus').value='';
        if(key==='priority')document.getElementById('rvFilterPrio').value='';
        if(key==='source')document.getElementById('rvFilterSource').value='';
        if(key==='category'){
          document.querySelectorAll('.rv-cat-filter-btn').forEach(function(b){b.classList.remove('active')});
          var catAll=document.getElementById('rvCatAll');if(catAll)catAll.classList.add('active');
        }
        renderReviews();updateActiveFilters();updateFilterClears();
      });
    });
  }

  /* Category filter clicks */
  document.getElementById('rvCatFilter').addEventListener('click',function(e){
    var btn=e.target.closest('.rv-cat-filter-btn');
    var allBtn=e.target.closest('.rv-cat-filter-all');
    if(allBtn){
      filters.category='';
      document.querySelectorAll('.rv-cat-filter-btn').forEach(function(b){b.classList.remove('active')});
      allBtn.classList.add('active');
      renderReviews();updateActiveFilters();return;
    }
    if(btn){
      var key=btn.dataset.catkey;
      var wasActive=btn.classList.contains('active');
      document.querySelectorAll('.rv-cat-filter-btn,.rv-cat-filter-all').forEach(function(b){b.classList.remove('active')});
      if(wasActive){
        filters.category='';
        document.getElementById('rvCatAll').classList.add('active');
      }else{
        filters.category=key;
        btn.classList.add('active');
      }
      renderReviews();updateActiveFilters();
    }
  });

  /* Quick filter clicks */
  document.getElementById('rvQuickFilters').addEventListener('click',function(e){
    var btn=e.target.closest('.rv-qf');if(!btn)return;
    document.querySelectorAll('.rv-qf').forEach(function(b){b.classList.remove('active')});
    btn.classList.add('active');
    renderReviews();
  });

  /* Stat cards click-to-filter */
  document.querySelectorAll('.rv-stat[data-rvfilter]').forEach(function(stat){
    stat.addEventListener('click',function(){
      var fv=stat.dataset.rvfilter;
      var wasActive=stat.classList.contains('rv-stat-active');

      /* Clear all stat active states */
      document.querySelectorAll('.rv-stat').forEach(function(s){s.classList.remove('rv-stat-active')});

      if(wasActive){
        filters.status='';filters.priority='';
        document.getElementById('rvFilterStatus').value='';
        document.getElementById('rvFilterPrio').value='';
      }else{
        stat.classList.add('rv-stat-active');
        if(fv==='queue'){filters.status='';filters.priority=''}
        else if(fv==='redeemed'){filters.priority='redeemed';filters.status='';document.getElementById('rvFilterPrio').value='redeemed'}
        else if(fv==='pending'){filters.status='pending';document.getElementById('rvFilterStatus').value='pending'}
        else if(fv==='in-progress'){filters.status='in-progress';document.getElementById('rvFilterStatus').value='in-progress'}
        else if(fv==='completed'){filters.status='completed';document.getElementById('rvFilterStatus').value='completed'}
        else if(fv==='today'){filters.status='completed';document.getElementById('rvFilterStatus').value='completed'}
        else if(fv==='stale'){filters.status='';filters.priority=''}
      }
      renderReviews();updateActiveFilters();updateFilterClears();
    });
  });

  /* === Complete Modal logic === */
  var rvCompleteTarget=null;
  var templates={
    default:'Hey {name} \\uD83D\\uDC4B\\n\\nYour account review has been completed! Here is a summary of what I found and my recommendations:\\n\\n{summary}\\n\\nFeel free to ask any follow-up questions. Good luck! \\uD83C\\uDF1F',
    quick:'Review completed for {name}. Thread will be archived.',
    custom:''
  };

  document.getElementById('rvRows').addEventListener('click',function(e){
    var compBtn=e.target.closest('[data-completereview]');
    if(!compBtn)return;
    var rid=compBtn.dataset.completereview;
    var rv=(model.accountReviews||[]).find(function(r){return r.id===rid});
    if(!rv)return;
    rvCompleteTarget=rv;
    var modal=document.getElementById('rvCompleteModal');
    modal.classList.add('active');
    document.getElementById('rvCompleteInfo').innerHTML='<strong>'+safe(rv.name)+'</strong>'+(rv.twitchName?' <span style="color:var(--twi)">\u2022 '+safe(rv.twitchName)+'</span>':'')+'<br><span style="color:var(--txt3)">Status: '+(rv.status||'pending')+' \u2022 Added: '+new Date(rv.requestedAt||Date.now()).toLocaleDateString()+'</span>';
    document.getElementById('rvCompleteTpl').value='default';
    document.getElementById('rvCompleteMsg').value=templates.default.replace('{name}',rv.name).replace('{summary}','[Your review notes here]');
    updateCompleteMsgCount();
  });

  document.getElementById('rvCompleteTpl').addEventListener('change',function(){
    var tpl=templates[this.value]||'';
    var name=rvCompleteTarget?rvCompleteTarget.name:'';
    document.getElementById('rvCompleteMsg').value=tpl.replace('{name}',name).replace('{summary}','[Your review notes here]');
    updateCompleteMsgCount();
  });

  function updateCompleteMsgCount(){
    var msg=document.getElementById('rvCompleteMsg');
    var cnt=document.getElementById('rvCompleteMsgCount');
    if(msg&&cnt){
      cnt.textContent=msg.value.length+' chars';
      cnt.className='rv-char-count'+(msg.value.length>1800?' danger':msg.value.length>1500?' warning':'');
    }
  }
  document.getElementById('rvCompleteMsg').addEventListener('input',updateCompleteMsgCount);

  document.getElementById('rvCompleteCancel').addEventListener('click',function(){document.getElementById('rvCompleteModal').classList.remove('active')});
  document.getElementById('rvCompleteModal').addEventListener('click',function(e){if(e.target===this)this.classList.remove('active')});

  document.getElementById('rvCompleteSubmit').addEventListener('click',function(){
    if(!rvCompleteTarget)return;
    var msg=document.getElementById('rvCompleteMsg').value;
    var btn=this;btn.disabled=true;btn.textContent='Sending...';
    fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rvCompleteTarget.id,status:'completed',completionMessage:msg})}).then(function(r){return r.json()}).then(function(d){
      btn.disabled=false;btn.textContent='\u2705 Complete & Send';
      if(d.success){
        document.getElementById('rvCompleteModal').classList.remove('active');
        rvAudit('Completed',rvCompleteTarget.name);
        rvNotify('Completed: '+rvCompleteTarget.name,'success');
        load();
      }else{rvNotify(d.error||'Failed','error')}
    }).catch(function(e){btn.disabled=false;btn.textContent='\u2705 Complete & Send';rvNotify(e.message,'error')});
  });

  document.getElementById('rvCompleteSkip').addEventListener('click',function(){
    if(!rvCompleteTarget)return;
    var btn=this;btn.disabled=true;btn.textContent='Marking...';
    fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rvCompleteTarget.id,status:'completed'})}).then(function(r){return r.json()}).then(function(d){
      btn.disabled=false;btn.textContent='Skip (just mark done)';
      if(d.success){
        document.getElementById('rvCompleteModal').classList.remove('active');
        rvAudit('Completed (skip)',rvCompleteTarget.name);
        rvNotify('Marked complete: '+rvCompleteTarget.name,'success');
        load();
      }else{rvNotify(d.error||'Failed','error')}
    }).catch(function(e){btn.disabled=false;btn.textContent='Skip (just mark done)';rvNotify(e.message,'error')});
  });

  /* === Status change via dropdown / inline === */
  document.getElementById('rvRows').addEventListener('change',function(e){
    var sel=e.target.closest('.rv-status-sel');
    if(sel){
      var rid=sel.dataset.rvstatus;
      var newStatus=sel.value;
      if(newStatus==='completed'){
        /* Open complete modal instead */
        var compBtn=document.querySelector('[data-completereview="'+rid+'"]');
        if(compBtn){compBtn.click();sel.value=sel.dataset.prev||'pending';return;}
      }
      sel.dataset.prev=sel.value;
      fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rid,status:newStatus})}).then(function(r){return r.json()}).then(function(d){
        if(d.success){rvAudit('Status \u2192 '+newStatus,(model.accountReviews||[]).find(function(r){return r.id===rid})?.name||'');load();}
        else{rvNotify(d.error||'Failed','error');load();}
      }).catch(function(e){rvNotify(e.message,'error')});
      return;
    }
  });

  /* === Ping handler === */
  document.getElementById('rvRows').addEventListener('click',function(e){
    var pingBtn=e.target.closest('[data-pingreview]');
    if(pingBtn){
      var rid=pingBtn.dataset.pingreview;
      var rv=(model.accountReviews||[]).find(function(r){return r.id===rid});
      if(!rv)return;
      if(rv.lastPingedAt&&Date.now()-rv.lastPingedAt<1800000){
        var mins=Math.ceil((1800000-(Date.now()-rv.lastPingedAt))/60000);
        rvNotify('Ping cooldown: '+mins+'m remaining','warn');
        return;
      }
      pingBtn.disabled=true;pingBtn.textContent='...';
      fetch('/api/idleon/account-reviews/ping',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rid})}).then(function(r){return r.json()}).then(function(d){
        if(d.success){rvAudit('Pinged',rv.name);rvNotify('Pinged: '+rv.name,'success');load();}
        else{rvNotify(d.error||'Failed','error');pingBtn.disabled=false;pingBtn.textContent='\uD83D\uDD14';}
      }).catch(function(e){rvNotify(e.message,'error');pingBtn.disabled=false;pingBtn.textContent='\uD83D\uDD14';});
      return;
    }
  });
  /* === Delete handler === */
  document.getElementById('rvRows').addEventListener('click',function(e){
    var btn=e.target.closest('[data-delreview]');
    if(btn){
      if(!rvRateOk('delete',1500))return;
      var rid=btn.dataset.delreview;
      var rv=(model.accountReviews||[]).find(function(r){return r.id===rid});
      var name=rv?rv.name:'this review';
      rvConfirm('Delete Review','Are you sure you want to delete "'+name+'"?',rv?'Status: '+(rv.status||'pending')+' | Added: '+new Date(rv.requestedAt||Date.now()).toLocaleDateString():null,function(){
        rvBackupBeforeAction('delete-single');
        fetch('/api/idleon/account-reviews/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rid})}).then(function(r){return r.json()}).then(function(d){
          if(d.success){rvAudit('Deleted',name);rvNotify('Deleted: '+name,'success');load();}
          else{rvNotify(d.error||'Failed','error');}
        }).catch(function(e){rvNotify(e.message,'error')});
      },{danger:true,confirmText:'Delete',icon:'\uD83D\uDDD1\uFE0F',warn:'This action cannot be undone'});
      return;
    }

    /* === Edit (inline) === */
    var editBtn=e.target.closest('[data-editreview]');
    if(editBtn){
      var rid=editBtn.dataset.editreview;
      var rv=(model.accountReviews||[]).find(function(r){return r.id===rid});
      if(!rv)return;
      var cell=editBtn.closest('td');
      if(!cell||cell.querySelector('.rv-edit-form'))return;
      cell.innerHTML='<div class="rv-edit-form">'
        +'<label>Player / Beneficiary name</label>'
        +'<input id="rvEditName-'+safe(rid)+'" value="'+safe(rv.name)+'" placeholder="Who is the review for?" style="font-weight:600">'
        +'<label>Redeemed by (who paid)</label>'
        +'<input id="rvEditRedeemedBy-'+safe(rid)+'" value="'+safe(rv.redeemedBy||rv.twitchName||'')+'" style="border-color:rgba(145,70,255,.3);color:#b388ff" placeholder="Twitch username who redeemed">'
        +'<label>Notes</label>'
        +'<input id="rvEditNotes-'+safe(rid)+'" value="'+safe(rv.notes||'')+'" placeholder="Profile link, notes...">'
        +'<label>Category override (comma-separated)</label>'
        +'<input id="rvEditCats-'+safe(rid)+'" value="'+safe((rv.categories||[]).join(', '))+'" style="border-color:rgba(255,152,0,.3);color:#ffcc80" placeholder="e.g. alchemy, lab (blank = auto-detect)">'
        +'<div style="display:flex;gap:4px;margin-top:2px">'
        +'<button class="rv-btn-sm" data-saveedit="'+safe(rid)+'" style="background:var(--ok-d);border-color:rgba(76,175,80,.3);color:#a5d6a7;width:auto;padding:2px 8px">\u2714 Save</button>'
        +'<button class="rv-btn-sm" data-canceledit="'+safe(rid)+'" style="width:auto;padding:2px 8px">\u2716 Cancel</button>'
        +'</div></div>';
      document.getElementById('rvEditName-'+rid).focus();
      return;
    }

    /* === Save edit === */
    var saveBtn=e.target.closest('[data-saveedit]');
    if(saveBtn){
      var rid=saveBtn.dataset.saveedit;
      var newName=(document.getElementById('rvEditName-'+rid)||{}).value||'';
      var newRedeemedBy=(document.getElementById('rvEditRedeemedBy-'+rid)||{}).value||'';
      var newNotes=(document.getElementById('rvEditNotes-'+rid)||{}).value||'';
      var newCats=(document.getElementById('rvEditCats-'+rid)||{}).value||'';
      var catsArr=newCats?newCats.split(',').map(function(s){return s.trim().toLowerCase()}).filter(Boolean):[];
      if(!newName.trim()){rvNotify('Name is required','error');return;}
      if(!rvRateOk('edit',800))return;
      fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rid,name:newName.trim(),redeemedBy:newRedeemedBy.trim(),notes:newNotes,categories:catsArr})}).then(function(r){return r.json()}).then(function(d){
        if(d.success){rvAudit('Updated',newName.trim());rvNotify('Updated: '+newName.trim(),'success');load();}
        else rvNotify(d.error||'Failed','error');
      }).catch(function(e){rvNotify(e.message,'error')});
      return;
    }

    /* === Cancel edit === */
    var cancelBtn=e.target.closest('[data-canceledit]');
    if(cancelBtn){renderReviews();return;}
  });

  /* === Copy name button === */
  document.getElementById('rvRows').addEventListener('click',function(e){
    var copyBtn=e.target.closest('.rv-btn-copy');
    if(copyBtn){
      var text=copyBtn.dataset.copy;
      if(navigator.clipboard&&navigator.clipboard.writeText){
        var p=navigator.clipboard.writeText(text);
        if(p&&p.then)p.then(function(){
          copyBtn.classList.add('copied');copyBtn.textContent='\u2705';
          setTimeout(function(){copyBtn.classList.remove('copied');copyBtn.textContent='\uD83D\uDCCB'},1500);
        });
      }
      return;
    }
  });

  /* === Context menu on right-click === */
  var activeCtxMenu=null;
  document.getElementById('rvRows').addEventListener('contextmenu',function(e){
    var row=e.target.closest('tr[data-rvid]');
    if(!row)return;
    e.preventDefault();
    if(activeCtxMenu)activeCtxMenu.remove();
    var rid=row.dataset.rvid;
    var rv=(model.accountReviews||[]).find(function(r){return r.id===rid});
    if(!rv)return;
    /* Backdrop overlay */
    var overlay=document.createElement('div');
    overlay.style.cssText='position:fixed;inset:0;z-index:10004;background:rgba(0,0,0,.35)';
    document.body.appendChild(overlay);
    var menu=document.createElement('div');
    menu.className='rv-ctx-menu';
    menu.style.left=e.clientX+'px';menu.style.top=e.clientY+'px';
    var items=[];
    if(rv.status==='pending')items.push({icon:'\u25B6',text:'Start Review',action:function(){var b=document.querySelector('[data-claimreview="'+rid+'"]');if(b)b.click()}});
    items.push({icon:'\u270F\uFE0F',text:'Edit',action:function(){var b=document.querySelector('[data-editreview="'+rid+'"]');if(b)b.click()}});
    if(rv.status!=='completed')items.push({icon:'\u2705',text:'Mark Complete',action:function(){var b=document.querySelector('[data-completereview="'+rid+'"]');if(b)b.click()}});
    var lastPing=rv.lastPingedAt||0;var canPing=Date.now()-lastPing>1800000;
    if(rv.messageUrl&&rv.status!=='completed')items.push({icon:'\uD83D\uDD14',text:canPing?'Send Reminder':'Ping cooldown (30m)',cls:canPing?'':'disabled',action:function(){if(!canPing)return;var b=document.querySelector('[data-pingreview="'+rid+'"]');if(b)b.click()}});
    items.push({icon:'\uD83D\uDCCB',text:'Copy Name',action:function(){if(navigator.clipboard)navigator.clipboard.writeText(rv.name)}});
    if(rv.notes){var link=(rv.notes||'').match(urlRe);if(link)items.push({icon:'\uD83D\uDD17',text:'Open Profile',action:function(){window.open(link[0],'_blank')}});}
    items.push({sep:true});
    items.push({icon:'\uD83D\uDDD1',text:'Delete',cls:'danger',action:function(){var b=document.querySelector('[data-delreview="'+rid+'"]');if(b)b.click()}});

    menu.innerHTML=items.map(function(i){
      if(i.sep)return '<div class="rv-ctx-sep"></div>';
      return '<div class="rv-ctx-item'+(i.cls?' '+i.cls:'')+'"><span>'+i.icon+'</span><span>'+i.text+'</span></div>';
    }).join('');

    document.body.appendChild(menu);
    activeCtxMenu=menu;
    function removeCtx(){if(menu.parentNode)menu.remove();if(overlay.parentNode)overlay.remove();activeCtxMenu=null;}
    overlay.addEventListener('click',removeCtx);
    overlay.addEventListener('contextmenu',function(ev){ev.preventDefault();removeCtx();});

    /* Position adjustment if off-screen */
    var rect=menu.getBoundingClientRect();
    if(rect.right>window.innerWidth)menu.style.left=(e.clientX-rect.width)+'px';
    if(rect.bottom>window.innerHeight)menu.style.top=(e.clientY-rect.height)+'px';

    var itemEls=menu.querySelectorAll('.rv-ctx-item');
    var actionIdx=0;
    items.forEach(function(i,idx){
      if(i.sep)return;
      var el=itemEls[actionIdx++];
      if(el&&i.action)el.addEventListener('click',function(){removeCtx();i.action()});
    });
  });
  document.addEventListener('click',function(){if(activeCtxMenu){activeCtxMenu.remove();activeCtxMenu=null;var ov=document.querySelector('[style*="z-index:10004"]');if(ov)ov.remove();}});

  /* === Scan channel === */
  document.getElementById('rvScan').addEventListener('click',function(){
    if(!rvRateOk('scan',5000))return;
    var el=document.getElementById('rvStatus');
    var btn=document.getElementById('rvScan');
    btn.disabled=true;btn.textContent='Scanning...';
    el.textContent='Scanning channel...';
    fetch('/api/idleon/account-reviews/scan',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      btn.disabled=false;btn.textContent='\uD83D\uDD0D Scan Channel';
      if(d.success){
        var addedNames=d.added&&d.added.length?d.added.map(function(a){return typeof a==='string'?a:(a.name||'?')}).join(', '):'none';
        var dupCount=d.skipped||0;
        el.innerHTML='<span style="color:var(--ok)">\u2705 +'+d.added.length+' new'+(dupCount?' <span class="rv-dup-warn">'+dupCount+' duplicates skipped</span>':'')+' | Total: '+d.total+'</span>';
        if(d.added.length)el.innerHTML+='<div style="font-size:9px;color:var(--txt3);margin-top:2px">Added: '+safe(addedNames)+'</div>';
        rvAudit('Scanned channel','+'+d.added.length+' new, '+dupCount+' dupes');
        load();
      }else{
        el.innerHTML='<span style="color:var(--err)">\u274C '+(d.error||'Failed')+'</span>';
      }
    }).catch(function(e){
      btn.disabled=false;btn.textContent='\uD83D\uDD0D Scan Channel';
      el.innerHTML='<span style="color:var(--err)">\u274C '+e.message+'</span>';
    });
  });

  /* === Twitch sync === */
  document.getElementById('rvSyncTwitch').addEventListener('click',function(){
    if(!rvRateOk('sync-twitch',5000))return;
    var el=document.getElementById('rvStatus');
    var btn=document.getElementById('rvSyncTwitch');
    btn.disabled=true;btn.textContent='Syncing...';
    el.textContent='Syncing Twitch redemptions...';
    fetch('/api/idleon/account-reviews/sync-twitch',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
      btn.disabled=false;btn.textContent='\uD83D\uDCFA Sync Twitch';
      el.innerHTML=d.success?'<span style="color:var(--twi)">\uD83D\uDCFA +'+d.added+' added, '+d.upgraded+' upgraded ('+d.totalRedemptions+' redemptions scanned)</span>':'<span style="color:var(--err)">\u274C '+(d.error||'Failed')+'</span>';
      if(d.success){rvAudit('Twitch sync','+'+d.added+' added, '+d.upgraded+' upgraded');load();}
    }).catch(function(e){
      btn.disabled=false;btn.textContent='\uD83D\uDCFA Sync Twitch';
      el.innerHTML='<span style="color:var(--err)">\u274C '+e.message+'</span>';
    });
  });
  /* === Add Modal === */
  var addModal=document.getElementById('rvAddModal');
  var isRedeemed=false;

  document.getElementById('rvAdd').addEventListener('click',function(){
    addModal.classList.add('active');
    document.getElementById('rvAddName').value='';
    document.getElementById('rvAddLink').value='';
    document.getElementById('rvAddTwitch').value='';
    document.getElementById('rvAddNotes').value='';
    isRedeemed=false;
    document.getElementById('rvAddRedeemBox').classList.remove('on');
    document.getElementById('rvAddDup').classList.remove('visible');
    document.getElementById('rvAddNameCount').textContent='0 / 50';
    document.getElementById('rvAddNotesCount').textContent='0 / 500';
    setTimeout(function(){document.getElementById('rvAddName').focus()},100);
  });
  document.getElementById('rvAddCancel').addEventListener('click',function(){addModal.classList.remove('active')});
  addModal.addEventListener('click',function(e){if(e.target===addModal)addModal.classList.remove('active')});

  document.getElementById('rvAddRedeemToggle').addEventListener('click',function(){
    isRedeemed=!isRedeemed;
    document.getElementById('rvAddRedeemBox').classList.toggle('on',isRedeemed);
  });

  document.getElementById('rvAddSubmit').addEventListener('click',function(){
    var nameEl=document.getElementById('rvAddName');
    var name=nameEl.value.trim();
    if(!name){
      nameEl.classList.add('rv-field-error');
      rvNotify('Name is required','error');
      return;
    }
    name=name.charAt(0).toUpperCase()+name.slice(1);
    var link=document.getElementById('rvAddLink').value.trim();
    if(link&&!/^https?:\\/\\//.test(link)){
      document.getElementById('rvAddLink').classList.add('rv-field-error');
      rvNotify('Invalid URL format','error');
      return;
    }
    var twitch=document.getElementById('rvAddTwitch').value.trim();
    var notes=document.getElementById('rvAddNotes').value.trim();
    if(link){notes=link+(notes?'\\n'+notes:'');}
    var btn=document.getElementById('rvAddSubmit');
    btn.disabled=true;btn.textContent='Adding...';
    fetch('/api/idleon/account-reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:name,twitchName:twitch,notes:notes,priority:isRedeemed?'redeemed':'normal'})}).then(function(r){return r.json()}).then(function(d){
      btn.disabled=false;btn.textContent='Add to Queue';
      if(d.success){addModal.classList.remove('active');rvAudit('Added',name);rvNotify('Added: '+name,'success');load();}
      else rvNotify(d.error||'Failed','error');
    }).catch(function(e){btn.disabled=false;btn.textContent='Add to Queue';rvNotify(e.message,'error')});
  });

  /* Add form enhancements */
  (function(){
    var nameEl=document.getElementById('rvAddName');
    var notesEl=document.getElementById('rvAddNotes');
    var nameCountEl=document.getElementById('rvAddNameCount');
    var notesCountEl=document.getElementById('rvAddNotesCount');
    var dupEl=document.getElementById('rvAddDup');
    function updateCount(input,counter,max){
      var len=input.value.length;
      counter.textContent=len+' / '+max;
      counter.className='rv-char-count'+(len>max*0.9?' danger':len>max*0.7?' warning':'');
    }
    if(nameEl&&nameCountEl)nameEl.addEventListener('input',function(){
      updateCount(nameEl,nameCountEl,50);
      nameEl.classList.remove('rv-field-error');
      if(dupEl){
        var val=nameEl.value.trim().toLowerCase();
        if(val.length>=2){
          var exists=(model.accountReviews||[]).some(function(r){return r.name.toLowerCase()===val&&r.status!=='completed'});
          dupEl.classList.toggle('visible',exists);
        }else{dupEl.classList.remove('visible')}
      }
    });
    if(notesEl&&notesCountEl)notesEl.addEventListener('input',function(){updateCount(notesEl,notesCountEl,500)});
    var linkEl=document.getElementById('rvAddLink');
    if(linkEl)linkEl.addEventListener('focus',function(){linkEl.classList.remove('rv-field-error')});
  })();

  /* === Select All === */
  var selectAllEl=document.getElementById('rvSelectAll');
  if(selectAllEl)selectAllEl.addEventListener('change',function(){
    var checked=this.checked;
    document.querySelectorAll('.rv-row-cb').forEach(function(cb){
      cb.checked=checked;
      var id=cb.dataset.rvcheck;
      if(checked)rvSelected[id]=true;else delete rvSelected[id];
      /* Highlight row */
      var row=cb.closest('tr');
      if(row)row.classList.toggle('rv-row-selected',checked);
    });
    updateBatchBar();
  });

  /* Row checkbox delegation */
  document.getElementById('rvRows').addEventListener('change',function(e){
    var cb=e.target.closest('.rv-row-cb');
    if(cb){
      if(cb.checked)rvSelected[cb.dataset.rvcheck]=true;
      else delete rvSelected[cb.dataset.rvcheck];
      var row=cb.closest('tr');
      if(row)row.classList.toggle('rv-row-selected',cb.checked);
      updateBatchBar();
      return;
    }
  });

  function updateBatchBar(){
    var count=Object.keys(rvSelected).length;
    var bar=document.getElementById('rvBatchBar');
    var cnt=document.getElementById('rvBatchCount');
    if(bar)bar.style.display=count>0?'flex':'none';
    if(cnt)cnt.textContent=count+' selected';
  }

  /* Batch status updates */
  ['rvBatchProgress','rvBatchOnHold','rvBatchComplete'].forEach(function(btnId){
    var btn=document.getElementById(btnId);if(!btn)return;
    btn.addEventListener('click',function(){
      var ids=Object.keys(rvSelected);if(!ids.length)return;
      var statusMap={rvBatchProgress:'in-progress',rvBatchOnHold:'on-hold',rvBatchComplete:'completed'};
      var newStatus=statusMap[btnId];
      if(newStatus==='completed'){
        rvConfirm('Batch Complete','Mark '+ids.length+' reviews as completed?',null,function(){doBatchStatus(ids,newStatus)});
        return;
      }
      doBatchStatus(ids,newStatus);
    });
  });

  function doBatchStatus(ids,newStatus){
    var undoData=ids.map(function(id){
      var rv=(model.accountReviews||[]).find(function(r){return r.id===id});
      return rv?{id:id,oldStatus:rv.status}:null;
    }).filter(Boolean);
    Promise.all(ids.map(function(id){
      return fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id,status:newStatus})}).then(function(r){return r.json()});
    })).then(function(){
      rvUndoStack.push({action:'batch-status',data:undoData,timestamp:Date.now()});
      showUndoToast('Changed '+ids.length+' to '+newStatus);
      rvAudit('Batch status \u2192 '+newStatus,ids.length+' reviews');
      rvSelected={};updateBatchBar();load();
    }).catch(function(e){rvNotify(e.message,'error')});
  }

  /* Batch delete */
  var batchDelBtn=document.getElementById('rvBatchDelete');
  if(batchDelBtn)batchDelBtn.addEventListener('click',function(){
    var ids=Object.keys(rvSelected);if(!ids.length)return;
    if(!rvRateOk('batch-delete',2000))return;
    var names=ids.map(function(id){var rv=(model.accountReviews||[]).find(function(r){return r.id===id});return rv?rv.name:'?'});
    rvConfirm('Batch Delete','Delete '+ids.length+' reviews permanently?',
      names.slice(0,15).join(', ')+(names.length>15?' ... and '+(names.length-15)+' more':''),
      function(){
        rvBackupBeforeAction('batch-delete');
        Promise.all(ids.map(function(id){
          return fetch('/api/idleon/account-reviews/delete',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:id})}).then(function(r){return r.json()});
        })).then(function(){
          rvAudit('Batch deleted',ids.length+' reviews');
          rvNotify('Deleted '+ids.length+' reviews','success');
          rvSelected={};updateBatchBar();load();
        }).catch(function(e){rvNotify(e.message,'error')});
      },{danger:true,confirmText:'Delete '+ids.length,icon:'\uD83D\uDDD1\uFE0F',warn:'This action cannot be undone. A backup will be saved locally.'}
    );
  });

  /* Batch deselect */
  var deselectBtn=document.getElementById('rvBatchDeselect');
  if(deselectBtn)deselectBtn.addEventListener('click',function(){
    rvSelected={};
    document.querySelectorAll('.rv-row-cb').forEach(function(cb){cb.checked=false;var row=cb.closest('tr');if(row)row.classList.remove('rv-row-selected')});
    if(selectAllEl)selectAllEl.checked=false;
    updateBatchBar();
  });

  /* Batch select all filtered */
  var selFilteredBtn=document.getElementById('rvBatchSelectFiltered');
  if(selFilteredBtn)selFilteredBtn.addEventListener('click',function(){
    document.querySelectorAll('.rv-row-cb').forEach(function(cb){
      cb.checked=true;rvSelected[cb.dataset.rvcheck]=true;
      var row=cb.closest('tr');if(row)row.classList.add('rv-row-selected');
    });
    updateBatchBar();
  });

  /* Batch export selected */
  var batchExportBtn=document.getElementById('rvBatchExportSel');
  if(batchExportBtn)batchExportBtn.addEventListener('click',function(){
    var ids=Object.keys(rvSelected);if(!ids.length)return;
    var selected=(model.accountReviews||[]).filter(function(r){return ids.indexOf(r.id)>=0});
    var headers=['Name','Twitch','Priority','Status','Source','Category','Notes'];
    var rows=selected.map(function(r){
      var cats=classifyReview(r).map(function(c){return c.label}).join('; ');
      return [r.name||'',r.twitchName||'',r.priority||'',r.status||'',r.source||'',cats,(r.notes||'').replace(/[\\n\\r]+/g,' ')].map(function(v){return '"'+String(v).replace(/"/g,'""')+'"'}).join(',');
    });
    var csv=headers.join(',')+'\\n'+rows.join('\\n');
    var blob=new Blob([csv],{type:'text/csv'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='reviews-selected-'+ids.length+'.csv';
    a.click();URL.revokeObjectURL(a.href);
    rvNotify('Exported '+ids.length+' reviews','success');
  });
  /* === Claim (start review) === */
  document.getElementById('rvRows').addEventListener('click',function(e){
    var claimBtn=e.target.closest('[data-claimreview]');
    if(claimBtn){
      var rid=claimBtn.dataset.claimreview;
      claimBtn.disabled=true;claimBtn.textContent='...';
      fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rid,status:'in-progress'})}).then(function(r){return r.json()}).then(function(d){
        if(d.success){rvNotify('Review started','success');load();}
        else{rvNotify(d.error||'Failed','error');claimBtn.disabled=false;claimBtn.textContent='\u25B6';}
      }).catch(function(e){rvNotify(e.message,'error');claimBtn.disabled=false;claimBtn.textContent='\u25B6';});
      return;
    }
    /* Move to top */
    var moveBtn=e.target.closest('[data-movetop]');
    if(moveBtn){
      var rid=moveBtn.dataset.movetop;
      moveBtn.disabled=true;moveBtn.textContent='...';
      var allActive=(model.accountReviews||[]).filter(function(r){return r.status!=='completed'});
      var earliest=allActive.reduce(function(min,r){return Math.min(min,r.requestedAt||Date.now())},Date.now());
      fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rid,requestedAt:earliest-1000})}).then(function(r){return r.json()}).then(function(d){
        if(d.success){showUndoToast('Moved to top');load();}
        else{rvNotify(d.error||'Failed','error');moveBtn.disabled=false;moveBtn.textContent='\u2B06';}
      }).catch(function(e){rvNotify(e.message,'error');moveBtn.disabled=false;moveBtn.textContent='\u2B06';});
      return;
    }

    /* Position control popup on # column */
    var posCtl=e.target.closest('[data-posctl]');
    if(posCtl){
      var rid=posCtl.dataset.posctl;
      /* Remove any existing popup */
      var oldPopup=document.querySelector('.rv-pos-popup');
      if(oldPopup)oldPopup.remove();
      var oldOv=document.querySelector('.rv-pos-overlay');
      if(oldOv)oldOv.remove();
      /* Overlay */
      var overlay=document.createElement('div');
      overlay.className='rv-pos-overlay';
      overlay.style.cssText='position:fixed;inset:0;z-index:10005;background:transparent';
      document.body.appendChild(overlay);
      /* Popup */
      var popup=document.createElement('div');
      popup.className='rv-pos-popup';
      var rect=posCtl.getBoundingClientRect();
      popup.style.left=(rect.right+4)+'px';
      popup.style.top=rect.top+'px';
      popup.style.position='fixed';
      popup.innerHTML='<div class="rv-pos-item" data-posact="top">\u2B06 Move to top</div>'
        +'<div class="rv-pos-item" data-posact="up">\u25B2 Move up by 1</div>'
        +'<div class="rv-pos-item" data-posact="down">\u25BC Move down by 1</div>';
      document.body.appendChild(popup);
      /* Adjust if offscreen */
      var pr=popup.getBoundingClientRect();
      if(pr.right>window.innerWidth)popup.style.left=(rect.left-pr.width-4)+'px';
      if(pr.bottom>window.innerHeight)popup.style.top=(rect.bottom-pr.height)+'px';
      function removePopup(){popup.remove();overlay.remove();}
      overlay.addEventListener('click',removePopup);
      overlay.addEventListener('contextmenu',function(ev){ev.preventDefault();removePopup()});
      popup.querySelectorAll('.rv-pos-item').forEach(function(item){
        item.addEventListener('click',function(){
          var act=item.dataset.posact;
          var allActive=(model.accountReviews||[]).filter(function(r){return r.status!=='completed'});
          allActive.sort(function(a,b){return(a.requestedAt||0)-(b.requestedAt||0)});
          var curIdx=allActive.findIndex(function(r){return r.id===rid});
          var rv=allActive[curIdx];
          if(!rv){removePopup();return;}
          var newTime;
          if(act==='top'){
            var earliest=allActive.reduce(function(min,r){return Math.min(min,r.requestedAt||Date.now())},Date.now());
            newTime=earliest-1000;
          } else if(act==='up'&&curIdx>0){
            var prev=allActive[curIdx-1];
            newTime=(prev.requestedAt||0)-1;
          } else if(act==='down'&&curIdx<allActive.length-1){
            var next=allActive[curIdx+1];
            newTime=(next.requestedAt||0)+1;
          } else {removePopup();return;}
          removePopup();
          fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:rid,requestedAt:newTime})}).then(function(r){return r.json()}).then(function(d){
            if(d.success){showUndoToast(act==='top'?'Moved to top':act==='up'?'Moved up':'Moved down');load();}
            else rvNotify(d.error||'Failed','error');
          }).catch(function(e){rvNotify(e.message,'error')});
        });
      });
      return;
    }
  });

  /* === Clear completed === */
  document.getElementById('rvClearDone').addEventListener('click',function(){
    var completed=(model.accountReviews||[]).filter(function(r){return r.status==='completed'});
    if(!completed.length){rvNotify('No completed reviews to clear','warn');return;}
    if(!rvRateOk('clear',3000))return;
    rvConfirm('Clear Completed Reviews','Remove all '+completed.length+' completed reviews from the queue?',
      completed.slice(0,10).map(function(r){return r.name}).join(', ')+(completed.length>10?' ... and '+(completed.length-10)+' more':''),
      function(){
        rvBackupBeforeAction('clear-completed');
        fetch('/api/idleon/account-reviews/clear-completed',{method:'POST'}).then(function(r){return r.json()}).then(function(d){
          var el=document.getElementById('rvStatus');
          if(d.success){el.innerHTML='<span style="color:var(--ok)">\u2705 Cleared '+d.cleared+' completed reviews</span>';rvAudit('Cleared completed',d.cleared+' reviews');rvNotify('Cleared '+d.cleared+' reviews','success');load();}
          else el.innerHTML='<span style="color:var(--err)">\u274C '+(d.error||'Failed')+'</span>';
        }).catch(function(e){document.getElementById('rvStatus').innerHTML='<span style="color:var(--err)">\u274C '+e.message+'</span>';});
      },{danger:true,confirmText:'Clear All',icon:'\uD83D\uDDD1\uFE0F',warn:'A local backup will be saved automatically'}
    );
  });

  /* === Export CSV === */
  var exportBtn=document.getElementById('rvExportCsv');
  if(exportBtn)exportBtn.addEventListener('click',function(){
    var all=model.accountReviews||[];
    if(!all.length){rvNotify('No reviews to export','warn');return;}
    var headers=['Name','Twitch','Priority','Status','Source','Category','RequestedAt','CompletedAt','CompletedBy','Notes'];
    var rows=all.map(function(r){
      var cats=classifyReview(r).map(function(c){return c.label}).join('; ');
      return [r.name||'',r.twitchName||'',r.priority||'',r.status||'',r.source||'',cats,
        r.requestedAt?new Date(r.requestedAt).toISOString():'',
        r.completedAt?new Date(r.completedAt).toISOString():'',
        r.completedBy||'',(r.notes||'').replace(/[\\n\\r]+/g,' ')].map(function(v){return '"'+String(v).replace(/"/g,'""')+'"'}).join(',');
    });
    var csv=headers.join(',')+'\\n'+rows.join('\\n');
    var blob=new Blob([csv],{type:'text/csv'});
    var a=document.createElement('a');
    a.href=URL.createObjectURL(blob);
    a.download='reviews-export-'+new Date().toISOString().split('T')[0]+'.csv';
    a.click();URL.revokeObjectURL(a.href);
    rvAudit('Exported CSV',all.length+' reviews');
    rvNotify('Exported '+all.length+' reviews','success');
  });

  /* === Undo toast with timer === */
  function showUndoToast(msg){
    var existing=document.querySelector('.rv-undo-toast');
    if(existing)existing.remove();
    var toast=document.createElement('div');
    toast.className='rv-undo-toast';
    toast.innerHTML='<span>'+msg+'</span><button id="rvUndoBtn">Undo</button><div class="rv-undo-timer" style="width:100%"></div>';
    document.body.appendChild(toast);
    /* Animate timer bar */
    var timer=toast.querySelector('.rv-undo-timer');
    if(timer)requestAnimationFrame(function(){timer.style.width='0%';timer.style.transitionDuration='8s'});
    toast.querySelector('#rvUndoBtn').addEventListener('click',function(){
      performUndo();toast.remove();
    });
    setTimeout(function(){if(toast.parentNode){toast.classList.add('rv-notif-leaving');setTimeout(function(){if(toast.parentNode)toast.remove()},200)}},8000);
  }

  function performUndo(){
    var last=rvUndoStack.pop();
    if(!last){rvNotify('Nothing to undo','warn');return;}
    if(last.action==='batch-status'){
      Promise.all(last.data.map(function(d){
        return fetch('/api/idleon/account-reviews/update',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id:d.id,status:d.oldStatus})}).then(function(r){return r.json()});
      })).then(function(){rvNotify('Undo successful','success');load()}).catch(function(e){rvNotify('Undo failed: '+e.message,'error')});
    }
  }

  /* === Import modal === */
  var importModal=document.getElementById('rvImportModal');
  var importBtn=document.getElementById('rvImportBtn');
  var importZone=document.getElementById('rvImportZone');
  var importFile=document.getElementById('rvImportFile');
  var importPreview=document.getElementById('rvImportPreview');
  var importSubmit=document.getElementById('rvImportSubmit');
  var importStatus=document.getElementById('rvImportStatus');
  if(importBtn)importBtn.addEventListener('click',function(){
    rvImportData=[];
    if(importPreview)importPreview.classList.remove('visible');
    if(importPreview)importPreview.innerHTML='';
    if(importStatus)importStatus.textContent='';
    if(importSubmit){importSubmit.disabled=true;importSubmit.textContent='Import 0 Reviews';}
    if(importFile)importFile.value='';
    importModal.classList.add('active');
  });
  document.getElementById('rvImportCancel').addEventListener('click',function(){importModal.classList.remove('active')});
  importModal.addEventListener('click',function(e){if(e.target===importModal)importModal.classList.remove('active')});

  if(importZone){
    importZone.addEventListener('click',function(){importFile.click()});
    importZone.addEventListener('dragover',function(e){e.preventDefault();importZone.classList.add('rv-drag-over')});
    importZone.addEventListener('dragleave',function(){importZone.classList.remove('rv-drag-over')});
    importZone.addEventListener('drop',function(e){
      e.preventDefault();importZone.classList.remove('rv-drag-over');
      if(e.dataTransfer.files.length)handleImportFile(e.dataTransfer.files[0]);
    });
  }
  if(importFile)importFile.addEventListener('change',function(){
    if(this.files.length)handleImportFile(this.files[0]);
  });

  function handleImportFile(file){
    if(!file)return;
    var ext=file.name.split('.').pop().toLowerCase();
    if(ext!=='csv'&&ext!=='json'){rvNotify('Unsupported file type. Use .csv or .json','error');return;}
    var reader=new FileReader();
    reader.onload=function(ev){
      var text=ev.target.result;
      var items=ext==='csv'?parseImportCSV(text):parseImportJSON(text);
      if(!items.length){
        if(importStatus)importStatus.textContent='No valid entries found in file';
        return;
      }
      rvImportData=validateImport(items);
      var validCount=rvImportData.filter(function(i){return i.isValid&&!i.isDuplicate}).length;
      var dupCount=rvImportData.filter(function(i){return i.isDuplicate}).length;
      if(importPreview){
        importPreview.classList.add('visible');
        importPreview.innerHTML=rvImportData.slice(0,30).map(function(i){
          var cls='rv-import-row';
          if(i.isDuplicate)cls+=' rv-import-dup';
          else if(i.isValid)cls+=' rv-import-valid';
          return '<div class="'+cls+'"><span>'+safe(i.name)+'</span><span>'+(i.isDuplicate?'\u26A0 duplicate':i.isValid?'\u2713':'\u2717 invalid')+'</span></div>';
        }).join('')+(rvImportData.length>30?'<div style="text-align:center;padding:3px;color:var(--txt3)">... and '+(rvImportData.length-30)+' more</div>':'');
      }
      if(importStatus)importStatus.textContent=validCount+' valid, '+dupCount+' duplicates of '+rvImportData.length+' total';
      if(importSubmit){importSubmit.disabled=validCount===0;importSubmit.textContent='Import '+validCount+' Reviews';}
    };
    reader.readAsText(file);
  }

  if(importSubmit)importSubmit.addEventListener('click',function(){
    var toImport=rvImportData.filter(function(i){return i.isValid&&!i.isDuplicate});
    if(!toImport.length)return;
    if(!rvRateOk('import',3000))return;
    importSubmit.disabled=true;importSubmit.textContent='Importing...';
    var idx=0;var imported=0;
    function importNext(){
      if(idx>=toImport.length){
        importModal.classList.remove('active');
        rvAudit('Imported',imported+' reviews from file');
        rvNotify('Imported '+imported+' reviews','success');
        load();
        return;
      }
      var item=toImport[idx++];
      fetch('/api/idleon/account-reviews',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({name:item.name,twitchName:item.twitchName||'',notes:item.notes||'',priority:item.priority||'normal'})}).then(function(r){return r.json()}).then(function(d){
        if(d.success)imported++;
        if(importStatus)importStatus.textContent='Imported '+imported+'/'+toImport.length+'...';
        importNext();
      }).catch(function(){importNext()});
    }
    importNext();
  });
  /* === Compact mode toggle === */
  var compactBtn=document.getElementById('rvCompact');
  if(compactBtn)compactBtn.addEventListener('click',function(){
    var tbl=document.getElementById('rvTable');
    if(!tbl)return;
    tbl.classList.toggle('rv-compact');
    this.textContent=tbl.classList.contains('rv-compact')?'\uD83D\uDD0D Normal':'Compact';
    try{localStorage.setItem('rv-compact',tbl.classList.contains('rv-compact')?'1':'0')}catch(e){}
  });
  /* Restore compact preference */
  try{if(localStorage.getItem('rv-compact')==='1'){
    var tbl=document.getElementById('rvTable');
    if(tbl)tbl.classList.add('rv-compact');
    if(compactBtn)compactBtn.textContent='\uD83D\uDD0D Normal';
  }}catch(e){}

  /* === Scroll to top button === */
  var scrollTop=document.getElementById('rvScrollTop');
  var wrap=document.getElementById('rvWrap');
  if(scrollTop&&wrap){
    var scrollThrottled=false;
    wrap.addEventListener('scroll',function(){
      if(scrollThrottled)return;
      scrollThrottled=true;
      requestAnimationFrame(function(){
        scrollTop.classList.toggle('visible',wrap.scrollTop>300);
        scrollThrottled=false;
      });
    });
    scrollTop.addEventListener('click',function(){wrap.scrollTo({top:0,behavior:'smooth'})});
  }

  /* === Keyboard shortcuts === */
  document.addEventListener('keydown',function(e){
    /* Escape closes modals */
    if(e.key==='Escape'){
      var openModal=document.querySelector('.rv-modal.active,.rv-confirm-overlay');
      if(openModal){openModal.classList.remove('active');openModal.remove&&openModal.remove();e.preventDefault();return;}
      /* Close context menu */
      var ctx=document.querySelector('.rv-ctx-menu');
      if(ctx)ctx.remove();
    }
    /* Ctrl/Cmd+F focuses search */
    if((e.ctrlKey||e.metaKey)&&e.key==='f'){
      var search=document.getElementById('rvSearch');
      if(search){e.preventDefault();search.focus();search.select();}
    }
    /* Ctrl/Cmd+Z triggers undo */
    if((e.ctrlKey||e.metaKey)&&e.key==='z'&&!e.shiftKey){
      if(rvUndoStack.length&&document.activeElement.tagName!=='INPUT'&&document.activeElement.tagName!=='TEXTAREA'){
        e.preventDefault();performUndo();
      }
    }
  });

  /* === Column sort === */
  var rvSortCol='requestedAt';var rvSortDir='asc';
  document.getElementById('rvTable').addEventListener('click',function(e){
    var th=e.target.closest('th[data-sort]');
    if(!th)return;
    var col=th.dataset.sort;
    if(rvSortCol===col)rvSortDir=rvSortDir==='asc'?'desc':'asc';
    else{rvSortCol=col;rvSortDir='asc';}
    /* Update header indicators */
    document.querySelectorAll('#rvTable th[data-sort]').forEach(function(h){
      h.classList.remove('rv-sort-asc','rv-sort-desc');
    });
    th.classList.add('rv-sort-'+(rvSortDir));
    /* Sort model in place */
    var reviews=model.accountReviews||[];
    reviews.sort(function(a,b){
      var va,vb;
      switch(col){
        case'name':va=(a.name||'').toLowerCase();vb=(b.name||'').toLowerCase();break;
        case'priority':var po={redeemed:0,high:1,normal:2,low:3};va=po[a.priority]!==undefined?po[a.priority]:2;vb=po[b.priority]!==undefined?po[b.priority]:2;break;
        case'requestedAt':va=a.requestedAt||0;vb=b.requestedAt||0;break;
        case'status':va=a.status||'';vb=b.status||'';break;
        default:va=a[col]||'';vb=b[col]||'';
      }
      if(va<vb)return rvSortDir==='asc'?-1:1;
      if(va>vb)return rvSortDir==='asc'?1:-1;
      return 0;
    });
    renderReviews(applyFilters());
  });

  /* === Search highlighting === */
  var origRenderReviews=renderReviews;
  renderReviews=function(items){
    origRenderReviews(items);
    var term=(document.getElementById('rvSearch')||{}).value||'';
    if(!term.trim())return;
    var escaped=term.replace(/[{}.*+?^$()|\\[\\]\\\\]/g,'\\\\$&');
    var regex=new RegExp('('+escaped+')','gi');
    document.querySelectorAll('#rvRows .rv-name-main, #rvRows .rv-name-sub').forEach(function(el){
      if(el.querySelector('button,a'))return; /* skip interactive elements */
      var walk=document.createTreeWalker(el,NodeFilter.SHOW_TEXT,null,false);
      var textNodes=[];
      while(walk.nextNode())textNodes.push(walk.currentNode);
      textNodes.forEach(function(node){
        if(!regex.test(node.textContent))return;
        regex.lastIndex=0;
        var span=document.createElement('span');
        span.innerHTML=node.textContent.replace(regex,'<mark class="rv-hl">$1</mark>');
        node.parentNode.replaceChild(span,node);
      });
    });
  };

  /* === Audit log toggle === */
  var auditToggle=document.getElementById('rvAuditToggle');
  var auditPanel=document.getElementById('rvAuditPanel');
  if(auditToggle&&auditPanel){
    auditToggle.addEventListener('click',function(){
      var isOpen=auditPanel.classList.toggle('visible');
      this.textContent=isOpen?'\uD83D\uDCCB Hide Log':'\uD83D\uDCCB Audit Log';
      if(isOpen)renderAuditLog();
    });
  }

  /* === Auto-refresh every 60s === */
  var rvAutoRefresh=setInterval(function(){
    if(document.hidden)return;
    if(document.querySelector('.rv-modal.active'))return;
    load();
  },60000);

  /* === Connection monitoring === */
  var connBanner=document.getElementById('rvOfflineBanner');
  if(connBanner){
    window.addEventListener('offline',function(){connBanner.classList.add('visible')});
    window.addEventListener('online',function(){connBanner.classList.remove('visible');load()});
  }

  /* === Data integrity check after load === */
  var origLoad=load;
  load=function(force){
    var result=origLoad(force);
    if(result&&result.then){
      return result.then(function(){
        var reviews=model.accountReviews||[];
        var issues=[];
        reviews.forEach(function(r,i){
          if(!r.name||!r.name.trim())issues.push('Review #'+(i+1)+' missing name');
          if(r.status==='completed'&&!r.completedAt)issues.push(safe(r.name)+' marked completed but no date');
        });
        if(issues.length){
          console.warn('[Reviews] Data integrity issues:',issues);
        }
      });
    }
    /* Cache path — origLoad returned synchronously */
    var reviews=model.accountReviews||[];
    var issues=[];
    reviews.forEach(function(r,i){
      if(!r.name||!r.name.trim())issues.push('Review #'+(i+1)+' missing name');
      if(r.status==='completed'&&!r.completedAt)issues.push(safe(r.name)+' marked completed but no date');
    });
    if(issues.length){
      console.warn('[Reviews] Data integrity issues:',issues);
    }
    return Promise.resolve();
  };

  /* === Dark/light mode detect for CSS vars === */
  (function(){
    var root=document.getElementById('rvWrap');
    if(!root)return;
    if(window.matchMedia&&window.matchMedia('(prefers-color-scheme:light)').matches){
      root.classList.add('rv-light');
    }
    window.matchMedia('(prefers-color-scheme:light)').addEventListener('change',function(e){
      root.classList.toggle('rv-light',e.matches);
    });
  })();

  /* === Initial data load === */
  load();

  /* === Cleanup on page leave === */
  window.addEventListener('beforeunload',function(){
    if(rvAutoRefresh)clearInterval(rvAutoRefresh);
    if(rvLoadController)rvLoadController.abort();
  });

})();
</script>`;
}

export function renderIdleonStatsTab(userTier) {
  return `
<style>
  .idl-stat-card{background:#17171b;border:1px solid #3a3a42;border-radius:10px;padding:14px}
  .idl-stat-card h4{margin:0 0 8px;font-size:13px;color:#b794f6}
  .idl-stat-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
  .idl-stat-row{display:flex;justify-content:space-between;padding:3px 0;font-size:12px;border-bottom:1px solid #2a2f3a}
  .idl-stat-row:last-child{border-bottom:none}
  .idl-stat-row .dim{color:#8b8fa3}
  .idl-lb-item{display:flex;align-items:center;gap:8px;padding:6px 0;border-bottom:1px solid #2a2f3a;font-size:13px}
  .idl-lb-item:last-child{border-bottom:none}
  .idl-lb-rank{font-weight:800;min-width:24px;text-align:center}
  .idl-guild-lv{display:flex;align-items:center;gap:12px;padding:12px;background:#17171b;border:1px solid #3a3a42;border-radius:10px;margin-bottom:10px}
  .idl-guild-lv .lv-num{font-size:32px;font-weight:900;color:#7c3aed}
  .idl-guild-lv .lv-bar{flex:1}
  .idl-bonus-bar{display:flex;align-items:center;gap:6px;font-size:12px;padding:3px 0}
  .idl-bonus-fill{height:14px;border-radius:4px;min-width:2px}
</style>

<div class="card">
  <h2>📊 Comprehensive IdleOn Stats</h2>
  <p style="color:#8b8fa3">Deep analytics across all guilds: distributions, leaderboards, level predictions, and guild bonuses.</p>
</div>

<!-- Overview KPIs -->
<div id="idlStatsKpis" class="idl-stat-grid" style="margin-bottom:16px"></div>

<!-- Distributions -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(280px,1fr));gap:12px;margin-bottom:16px">
  <div class="card">
    <h3>📈 Risk Distribution</h3>
    <div id="idlStatsRiskDist"></div>
  </div>
  <div class="card">
    <h3>🏷️ Status Distribution</h3>
    <div id="idlStatsStatusDist"></div>
  </div>
  <div class="card">
    <h3>⚡ Level Distribution</h3>
    <div id="idlStatsLevelDist"></div>
  </div>
  <div class="card">
    <h3>🔥 Streak Stats</h3>
    <div id="idlStatsStreaks"></div>
  </div>
</div>

<!-- Weekly GP Trend -->
<div class="card">
  <h3>📉 Weekly GP Trend (last 16 weeks)</h3>
  <div style="height:280px;background:#17171b;border:1px solid #3a3a42;border-radius:8px;padding:10px;margin-top:8px">
    <canvas id="idlStatsTrendChart" style="width:100%;height:250px"></canvas>
  </div>
</div>

<!-- Guild Level Predictions -->
<div class="card">
  <h3>🏰 Guild Level Predictions</h3>
  <p style="color:#8b8fa3;font-size:12px;margin-bottom:10px">Current guild levels based on total GP, with time-to-next-level predictions.</p>
  <div id="idlStatsGuildLevels"></div>
</div>

<!-- Guild Bonuses -->
<div class="card">
  <h3>🎁 Guild Bonus Preferences</h3>
  <p style="color:#8b8fa3;font-size:12px;margin-bottom:10px">What bonuses guild members have selected (from Firebase data).</p>
  <div id="idlStatsBonuses"></div>
</div>

<!-- Guild Bonus Levels (invested) -->
<div class="card">
  <h3>⬆️ Guild Bonus Levels</h3>
  <p style="color:#8b8fa3;font-size:12px;margin-bottom:10px">Actual invested bonus levels per guild (from Firebase). Higher = stronger bonus.</p>
  <div id="idlStatsBonusLevels"></div>
</div>

<!-- Per-Guild Breakdown -->
<div class="card">
  <h3>🏰 Per-Guild Comparison</h3>
  <div id="idlStatsGuildCompare" style="display:grid;grid-template-columns:repeat(auto-fit,minmax(220px,1fr));gap:10px"></div>
</div>

<!-- Leaderboards -->
<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(320px,1fr));gap:12px;margin-bottom:16px">
  <div class="card">
    <h3>🏆 Top All-Time GP</h3>
    <div id="idlStatsTopAllTime"></div>
  </div>
  <div class="card">
    <h3>📊 Top Weekly GP</h3>
    <div id="idlStatsTopWeekly"></div>
  </div>
  <div class="card">
    <h3>🔥 Top Streaks</h3>
    <div id="idlStatsTopStreaks"></div>
  </div>
  <div class="card">
    <h3>⚠️ Most At-Risk</h3>
    <div id="idlStatsMostRisk"></div>
  </div>
</div>

<!-- Kick Stats -->
<div class="card">
  <h3>🚪 Kick Statistics</h3>
  <div id="idlStatsKicks" class="idl-stat-grid"></div>
</div>

<script>
(function(){
  function safe(v){return String(v==null?'':v).replace(/[&<>"']/g,function(c){return({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'})[c];});}
  function fmtN(n){return Number(n||0).toLocaleString();}

  function renderBar(label,val,max,color){
    var pct=max?Math.round(val/max*100):0;
    return'<div class="idl-bonus-bar"><span style="min-width:120px;color:#ccc">'+safe(label)+'</span><div style="flex:1;background:#333;border-radius:4px;overflow:hidden;height:14px"><div class="idl-bonus-fill" style="width:'+pct+'%;background:'+color+'"></div></div><span style="min-width:40px;text-align:right;color:#8b8fa3">'+val+'</span></div>';
  }

  function renderLeaderboard(el,items,valFn){
    el.innerHTML=items.map(function(m,i){
      var medal=i===0?'🥇':i===1?'🥈':i===2?'🥉':''+(i+1);
      return'<div class="idl-lb-item"><span class="idl-lb-rank" style="color:'+(i<3?'#ff9800':'#8b8fa3')+'">'+medal+'</span><span style="flex:1"><b>'+safe(m.name)+'</b></span><span style="color:#8b8fa3;font-size:12px">'+valFn(m)+'</span></div>';
    }).join('')||'<div style="color:#8b8fa3">No data</div>';
  }

  var _trendChart=null;

  Promise.all([
    fetch('/api/idleon/stats').then(function(r){return r.json()}),
    fetch('/api/idleon/guild-info').then(function(r){return r.json()})
  ]).then(function(results){
    var st=results[0],gi=results[1];
    if(!st.success)throw new Error('Stats load failed');

    var o=st.overview;
    // KPIs
    document.getElementById('idlStatsKpis').innerHTML=
      '<div class="idl-kpi idl-kpi-members"><div class="label">👥 Total Members</div><div class="val">'+o.totalMembers+'</div></div>'
      +'<div class="idl-kpi idl-kpi-weekly"><div class="label">📊 Weekly GP</div><div class="val">'+fmtN(o.totalWeekly)+'</div></div>'
      +'<div class="idl-kpi idl-kpi-alltime"><div class="label">💎 All-Time GP</div><div class="val">'+fmtN(o.totalAllTime)+'</div></div>'
      +'<div class="idl-kpi idl-kpi-active"><div class="label">⚡ Active This Week</div><div class="val">'+o.activeThisWeek+'<span style="font-size:14px;color:#8b8fa3">/'+o.totalMembers+'</span></div></div>'
      +'<div class="idl-kpi idl-kpi-avg"><div class="label">📈 Avg GP/Active</div><div class="val">'+fmtN(o.avgWeeklyPerActive)+'</div></div>'
      +'<div class="idl-kpi idl-kpi-kick"><div class="label">⚠️ Avg Risk</div><div class="val">'+o.avgRisk+'</div><div class="sub">median: '+o.medianRisk+'</div></div>';

    // Risk distribution
    var rb=st.riskBuckets;var rMax=Math.max(rb.safe,rb.low,rb.medium,rb.high,rb.critical,1);
    document.getElementById('idlStatsRiskDist').innerHTML=
      renderBar('Safe (0)',rb.safe,rMax,'#4caf50')
      +renderBar('Low (1-19)',rb.low,rMax,'#8bc34a')
      +renderBar('Medium (20-39)',rb.medium,rMax,'#ffc107')
      +renderBar('High (40-69)',rb.high,rMax,'#ff9800')
      +renderBar('Critical (70+)',rb.critical,rMax,'#f44336');

    // Status distribution
    var sd=st.statusDist;var sMax=Math.max.apply(null,Object.values(sd).concat([1]));
    var sColors={active:'#4caf50',probation:'#ffc107',watchlist:'#ff9800',loa:'#2196f3',exempt:'#9c27b0',kicked:'#f44336'};
    document.getElementById('idlStatsStatusDist').innerHTML=Object.entries(sd).map(function(e){return renderBar(e[0],e[1],sMax,sColors[e[0]]||'#777')}).join('');

    // Level distribution
    var ld=st.levelBuckets;var lMax=Math.max.apply(null,Object.values(ld).concat([1]));
    var lColors={'Unknown':'#555','1-99':'#8bc34a','100-199':'#4caf50','200-299':'#2196f3','300-399':'#7c3aed','400+':'#ff9800'};
    document.getElementById('idlStatsLevelDist').innerHTML=Object.entries(ld).map(function(e){return renderBar(e[0],e[1],lMax,lColors[e[0]]||'#777')}).join('')||'<div style="color:#8b8fa3">No level data (connect Firebase)</div>';

    // Streak stats
    var ss=st.streakStats;
    document.getElementById('idlStatsStreaks').innerHTML=
      '<div class="idl-stat-row"><span>Average Streak</span><span>'+ss.avg+' weeks</span></div>'
      +'<div class="idl-stat-row"><span>Max Streak</span><span style="color:#ff9800">🔥 '+ss.max+' weeks</span></div>'
      +'<div class="idl-stat-row"><span>Zero Streaks</span><span style="color:#f44336">'+ss.zeroCount+' members</span></div>';

    // Weekly Trend Chart
    if(typeof Chart!=='undefined'&&st.weeklyTrend.length>1){
      var ctx=document.getElementById('idlStatsTrendChart');
      if(ctx){
        if(_trendChart){_trendChart.destroy();_trendChart=null;}
        _trendChart=new Chart(ctx,{type:'line',data:{labels:st.weeklyTrend.map(function(w){return w.week.slice(5)}),datasets:[{label:'Total GP',data:st.weeklyTrend.map(function(w){return w.gp}),borderColor:'#7c3aed',backgroundColor:'#7c3aed33',fill:true,tension:0.3,pointBackgroundColor:'#7c3aed',pointRadius:4}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b8fa3',font:{size:10}},grid:{color:'#2a2f3a'}},y:{ticks:{color:'#8b8fa3'},grid:{color:'#2a2f3a'}}}}});
      }
    }

    // Guild Level Predictions
    if(gi.success&&gi.guilds.length){
      document.getElementById('idlStatsGuildLevels').innerHTML=gi.guilds.map(function(g){
        var pct=g.nextLevelGp?Math.min(100,Math.round((g.totalGp/(g.nextLevelGp||1))*100)):100;
        var predTxt=g.weeksToNextLevel?'~'+g.weeksToNextLevel+' week'+(g.weeksToNextLevel>1?'s':''):'N/A (no weekly data)';
        return'<div class="idl-guild-lv">'
          +'<div class="lv-num">Lv.'+g.currentLevel+'</div>'
          +'<div class="lv-bar">'
          +'<div style="font-weight:700;margin-bottom:4px">'+safe(g.name)+' <span style="color:#8b8fa3;font-size:12px">('+g.members+' members)</span></div>'
          +'<div style="display:flex;align-items:center;gap:8px;margin-bottom:4px"><div style="flex:1;background:#333;border-radius:4px;height:10px;overflow:hidden"><div style="width:'+pct+'%;background:#7c3aed;height:100%;border-radius:4px"></div></div><span style="font-size:12px;color:#8b8fa3">'+pct+'%</span></div>'
          +'<div style="font-size:12px;color:#8b8fa3">'+fmtN(g.totalGp)+' / '+fmtN(g.nextLevelGp)+' GP · Need '+fmtN(g.gpNeeded)+' more · Avg '+fmtN(g.avgWeeklyGp)+'/wk</div>'
          +'<div style="font-size:12px;color:#ff9800;margin-top:2px">⏱️ ETA to Lv.'+(g.currentLevel+1)+': '+predTxt+'</div>'
          +(g.bonusLevels&&g.bonusLevels.length?'<div style="font-size:11px;color:#8b8fa3;margin-top:4px">Bonus levels: '+g.bonusLevels.reduce(function(s,v){return s+v},0)+' total ('+g.bonusLevels.filter(function(v){return v>0}).length+'/'+g.bonusLevels.length+' active)</div>':'')
          +'</div></div>';
      }).join('');
    } else {
      document.getElementById('idlStatsGuildLevels').innerHTML='<div style="color:#8b8fa3">No guild data available. Connect Firebase and add guilds.</div>';
    }

    // Guild Bonuses
    if(gi.success&&gi.guilds.length){
      var bonusColors=['#4caf50','#2196f3','#9c27b0','#ff9800','#e91e63','#f44336','#00bcd4','#795548','#607d8b','#8bc34a','#ffeb3b','#ff5722','#673ab7'];
      document.getElementById('idlStatsBonuses').innerHTML=gi.guilds.map(function(g){
        var entries=Object.entries(g.bonuses||{}).sort(function(a,b){return b[1]-a[1]});
        var maxB=entries.length?entries[0][1]:0;
        if(!entries.length)return'<div class="idl-stat-card"><h4>'+safe(g.name)+'</h4><div style="color:#8b8fa3;font-size:12px">No bonus data</div></div>';
        return'<div class="idl-stat-card"><h4>'+safe(g.name)+' <span style="color:#8b8fa3;font-size:11px">('+g.members+' members)</span></h4>'
          +entries.map(function(e,i){return renderBar(e[0],e[1],maxB,bonusColors[i%bonusColors.length])}).join('')
          +'</div>';
      }).join('');
    } else {
      document.getElementById('idlStatsBonuses').innerHTML='<div style="color:#8b8fa3">No bonus data. Connect Firebase to fetch guild member bonuses.</div>';
    }

    // Guild Bonus Levels (invested)
    var blNames=['GP Bonus','EXP Bonus','Dungeon Bonus','Drop Bonus','Skill EXP','Damage Bonus','Carry Cap','Mining Bonus','Fishing Bonus','Chopping Bonus','Catching Bonus','Trapping Bonus','Worship Bonus'];
    if(gi.success&&gi.guilds.length){
      var hasAny=gi.guilds.some(function(g){return g.bonusLevels&&g.bonusLevels.length});
      if(hasAny){
        document.getElementById('idlStatsBonusLevels').innerHTML=gi.guilds.map(function(g){
          var bl=g.bonusLevels||[];
          if(!bl.length)return'<div class="idl-stat-card"><h4>'+safe(g.name)+'</h4><div style="color:#8b8fa3;font-size:12px">No bonus level data yet</div></div>';
          var maxLv=Math.max.apply(null,bl.concat([1]));
          return'<div class="idl-stat-card"><h4>'+safe(g.name)+' <span style="color:#8b8fa3;font-size:11px">('+g.members+' members)</span></h4>'
            +bl.map(function(lv,i){
              var name=blNames[i]||('Bonus #'+i);
              var pct=maxLv?Math.round(lv/maxLv*100):0;
              var color=lv>=15?'#4caf50':lv>=10?'#8bc34a':lv>=5?'#ff9800':'#f44336';
              return'<div class="idl-bonus-bar"><span style="min-width:120px;color:#ccc">'+safe(name)+'</span><div style="flex:1;background:#333;border-radius:4px;overflow:hidden;height:14px"><div class="idl-bonus-fill" style="width:'+pct+'%;background:'+color+'"></div></div><span style="min-width:40px;text-align:right;font-weight:700;color:'+color+'">Lv.'+lv+'</span></div>';
            }).join('')
            +'<div style="font-size:11px;color:#8b8fa3;margin-top:6px">Total levels invested: '+bl.reduce(function(s,v){return s+v},0)+'</div></div>';
        }).join('');
      } else {
        document.getElementById('idlStatsBonusLevels').innerHTML='<div style="color:#8b8fa3">Bonus levels not yet available. They will appear after the next Firebase poll.</div>';
      }
    } else {
      document.getElementById('idlStatsBonusLevels').innerHTML='<div style="color:#8b8fa3">No guild data. Connect Firebase to fetch bonus levels.</div>';
    }

    // Per-Guild Comparison
    var gs=st.guildStats;
    document.getElementById('idlStatsGuildCompare').innerHTML=gs.map(function(g){
      return'<div class="idl-stat-card"><h4>'+safe(g.name)+'</h4>'
        +'<div class="idl-stat-row"><span class="dim">Members</span><span>'+g.members+'</span></div>'
        +'<div class="idl-stat-row"><span class="dim">Weekly GP</span><span>'+fmtN(g.weeklyGp)+'</span></div>'
        +'<div class="idl-stat-row"><span class="dim">All-Time GP</span><span>'+fmtN(g.allTimeGp)+'</span></div>'
        +'<div class="idl-stat-row"><span class="dim">Active This Week</span><span>'+g.activeThisWeek+'/'+g.members+'</span></div>'
        +'<div class="idl-stat-row"><span class="dim">Avg Risk</span><span style="color:'+(g.avgRisk>=40?'#f44336':g.avgRisk>=20?'#ff9800':'#4caf50')+'">'+g.avgRisk+'</span></div>'
        +'</div>';
    }).join('')||'<div style="color:#8b8fa3">No guilds configured.</div>';

    // Leaderboards
    renderLeaderboard(document.getElementById('idlStatsTopAllTime'),st.leaderboards.topAllTime,function(m){return fmtN(m.gp)+' GP'});
    renderLeaderboard(document.getElementById('idlStatsTopWeekly'),st.leaderboards.topWeekly,function(m){return fmtN(m.gp)+' GP'});
    renderLeaderboard(document.getElementById('idlStatsTopStreaks'),st.leaderboards.topStreaks,function(m){return'🔥 '+m.streak+'wk (best: '+m.best+')'});
    renderLeaderboard(document.getElementById('idlStatsMostRisk'),st.leaderboards.mostAtRisk,function(m){return'Risk: '+m.risk+' · '+m.days+'d away'});

    // Kick stats
    var ks=st.kickStats;
    document.getElementById('idlStatsKicks').innerHTML=
      '<div class="idl-kpi"><div class="label">Total Kicks</div><div class="val" style="color:#f44336">'+ks.total+'</div></div>'
      +'<div class="idl-kpi"><div class="label">Last 7 Days</div><div class="val" style="color:#ff9800">'+ks.last7d+'</div></div>'
      +'<div class="idl-kpi"><div class="label">Last 30 Days</div><div class="val" style="color:#ffc107">'+ks.last30d+'</div></div>';

  }).catch(function(e){
    console.error('Stats load error:',e);
    document.getElementById('idlStatsKpis').innerHTML='<div class="card" style="grid-column:1/-1"><p style="color:#f44336">❌ Failed to load stats: '+e.message+'</p></div>';
  });
})();
</script>`;
}

export function renderIdleonActivityTab(userTier) {
  return `
<style>
  .idl-act-card{background:#17171b;border:1px solid #3a3a42;border-radius:10px;padding:14px;margin-bottom:12px}
  .idl-act-card h3{margin:0 0 10px;font-size:14px;color:#b794f6}
  .idl-act-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(160px,1fr));gap:10px}
  .idl-act-hm-row{display:flex;align-items:center;gap:4px;margin-bottom:2px}
  .idl-act-hm-cell{width:28px;height:28px;border-radius:4px;display:flex;align-items:center;justify-content:center;font-size:9px;color:#888;transition:transform .15s}
  .idl-act-hm-cell:hover{transform:scale(1.3);z-index:5}
  .idl-act-hm-label{width:32px;font-size:10px;color:#8b8fa3;text-align:right;flex-shrink:0}
  .idl-act-legend{display:flex;gap:4px;align-items:center;font-size:10px;color:#8b8fa3;margin-top:6px}
  .idl-act-legend-box{width:12px;height:12px;border-radius:2px}
</style>

<div class="card">
  <h2>🔥 Activity & Trends</h2>
  <p style="color:#8b8fa3">Track member activity patterns, retention, and growth trends across all guilds.</p>
</div>

<!-- Activity Heatmap -->
<div class="idl-act-card">
  <h3>📅 Weekly Activity Heatmap</h3>
  <p style="color:#8b8fa3;font-size:11px;margin:0 0 10px">GP contributions by week for all active members. Brighter = more GP.</p>
  <div id="idlActHeatmap"></div>
  <div class="idl-act-legend">
    <span>Less</span>
    <div class="idl-act-legend-box" style="background:#1a1a2e"></div>
    <div class="idl-act-legend-box" style="background:#2d1f6b"></div>
    <div class="idl-act-legend-box" style="background:#5a3aad"></div>
    <div class="idl-act-legend-box" style="background:#7c3aed"></div>
    <div class="idl-act-legend-box" style="background:#a78bfa"></div>
    <span>More</span>
  </div>
</div>

<!-- Retention -->
<div class="idl-act-card">
  <h3>📊 Member Retention</h3>
  <p style="color:#8b8fa3;font-size:11px;margin:0 0 10px">How many members stayed active (contributed GP) over consecutive weeks.</p>
  <div style="height:250px"><canvas id="idlActRetentionChart" style="width:100%;height:100%"></canvas></div>
</div>

<!-- Growth Trends -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
  <div class="idl-act-card">
    <h3>📈 GP Growth Rate</h3>
    <p style="color:#8b8fa3;font-size:11px;margin:0 0 10px">Week-over-week GP change percentage.</p>
    <div style="height:200px"><canvas id="idlActGrowthChart" style="width:100%;height:100%"></canvas></div>
  </div>
  <div class="idl-act-card">
    <h3>👥 Active Members Trend</h3>
    <p style="color:#8b8fa3;font-size:11px;margin:0 0 10px">Number of members contributing GP each week.</p>
    <div style="height:200px"><canvas id="idlActActiveChart" style="width:100%;height:100%"></canvas></div>
  </div>
</div>

<!-- Top Improvers & Decliners -->
<div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-bottom:12px">
  <div class="idl-act-card">
    <h3>🚀 Top Improvers</h3>
    <p style="color:#8b8fa3;font-size:11px;margin:0 0 8px">Members who improved the most this week vs last.</p>
    <div id="idlActImprovers"></div>
  </div>
  <div class="idl-act-card">
    <h3>📉 Biggest Decliners</h3>
    <p style="color:#8b8fa3;font-size:11px;margin:0 0 8px">Members whose GP dropped the most this week vs last.</p>
    <div id="idlActDecliners"></div>
  </div>
</div>

<!-- Inactivity Forecast -->
<div class="idl-act-card">
  <h3>⏰ Inactivity Forecast</h3>
  <p style="color:#8b8fa3;font-size:11px;margin:0 0 10px">Members likely to become inactive based on their recent trend.</p>
  <div id="idlActForecast"></div>
</div>

<script>
(function(){
  var safe=function(s){return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');};
  var fmtN=function(n){return Number(n||0).toLocaleString();};

  Promise.all([
    fetch('/api/idleon/stats').then(function(r){return r.json();}),
    fetch('/api/idleon/gp').then(function(r){return r.json();})
  ]).then(function(results){
    var st=results[0],gp=results[1];
    if(!st.success||!gp.success)throw new Error('Data load failed');
    var members=gp.members||[];
    var trend=st.weeklyTrend||[];

    // === Activity Heatmap ===
    var hmEl=document.getElementById('idlActHeatmap');
    if(hmEl&&members.length){
      var allWeeks={};
      members.forEach(function(m){(m.weeklyHistory||[]).forEach(function(h){allWeeks[h.weekStart]=true;});});
      var weeks=Object.keys(allWeeks).sort().slice(-12);
      // Compute max GP for color scaling
      var maxGp=0;
      members.forEach(function(m){(m.weeklyHistory||[]).forEach(function(h){if(h.gp>maxGp)maxGp=h.gp;});});
      // Take top 20 most active members for display
      var sorted=members.filter(function(m){return m.status!=='kicked'}).sort(function(a,b){return(b.weeklyGp||0)-(a.weeklyGp||0)}).slice(0,20);
      var html='<div style="overflow-x:auto"><div style="display:inline-block;min-width:400px">';
      // Header row
      html+='<div class="idl-act-hm-row"><div class="idl-act-hm-label"></div>';
      weeks.forEach(function(w){html+='<div class="idl-act-hm-cell" style="background:transparent;color:#8b8fa3;font-size:8px">'+w.slice(5)+'</div>';});
      html+='</div>';
      sorted.forEach(function(m){
        var map={};(m.weeklyHistory||[]).forEach(function(h){map[h.weekStart]=h.gp;});
        html+='<div class="idl-act-hm-row"><div class="idl-act-hm-label" title="'+safe(m.name)+'">'+safe(m.name.slice(0,6))+'</div>';
        weeks.forEach(function(w){
          var gp=map[w]||0;var intensity=maxGp?gp/maxGp:0;
          var bg=intensity<=0?'#1a1a2e':intensity<0.2?'#2d1f6b':intensity<0.4?'#5a3aad':intensity<0.7?'#7c3aed':'#a78bfa';
          html+='<div class="idl-act-hm-cell" style="background:'+bg+'" title="'+safe(m.name)+': '+fmtN(gp)+' GP">'+( gp>0?Math.round(gp/1000)+'k':'')+'</div>';
        });
        html+='</div>';
      });
      html+='</div></div>';
      hmEl.innerHTML=html;
    }

    // === Retention Chart ===
    if(typeof Chart!=='undefined'&&trend.length>2){
      var retCtx=document.getElementById('idlActRetentionChart');
      if(retCtx){
        // Calculate retention: active members each week
        var totalActive=members.filter(function(m){return m.status!=='kicked'}).length;
        var retData=trend.map(function(w){
          var count=0;
          members.forEach(function(m){
            var h=m.weeklyHistory||[];var found=h.some(function(e){return e.weekStart===w.week&&e.gp>0;});
            if(found)count++;
          });
          return{week:w.week,active:count,pct:totalActive?Math.round(count/totalActive*100):0};
        });
        new Chart(retCtx,{type:'line',data:{labels:retData.map(function(r){return r.week.slice(5);}),datasets:[{label:'Active Members',data:retData.map(function(r){return r.active;}),borderColor:'#4caf50',backgroundColor:'#4caf5022',fill:true,tension:0.3,pointRadius:3},{label:'% of Total',data:retData.map(function(r){return r.pct;}),borderColor:'#7c3aed',backgroundColor:'transparent',tension:0.3,pointRadius:3,yAxisID:'pct'}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{labels:{color:'#ccc',font:{size:11}}}},scales:{x:{ticks:{color:'#8b8fa3',font:{size:10}},grid:{color:'#2a2f3a'}},y:{beginAtZero:true,ticks:{color:'#8b8fa3'},grid:{color:'#2a2f3a'}},pct:{position:'right',beginAtZero:true,max:100,ticks:{color:'#8b8fa3',callback:function(v){return v+'%'}},grid:{display:false}}}}});
      }
    }

    // === Growth Rate Chart ===
    if(typeof Chart!=='undefined'&&trend.length>2){
      var growCtx=document.getElementById('idlActGrowthChart');
      if(growCtx){
        var growData=[];
        for(var i=1;i<trend.length;i++){
          var prev=trend[i-1].gp||1;var cur=trend[i].gp||0;
          growData.push({week:trend[i].week,change:Math.round((cur-prev)/prev*100)});
        }
        new Chart(growCtx,{type:'bar',data:{labels:growData.map(function(g){return g.week.slice(5);}),datasets:[{label:'GP Change %',data:growData.map(function(g){return g.change;}),backgroundColor:growData.map(function(g){return g.change>=0?'#4caf5088':'#f4433688';}),borderColor:growData.map(function(g){return g.change>=0?'#4caf50':'#f44336';}),borderWidth:1}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b8fa3',font:{size:10}},grid:{color:'#2a2f3a'}},y:{ticks:{color:'#8b8fa3',callback:function(v){return v+'%'}},grid:{color:'#2a2f3a'}}}}});
      }
    }

    // === Active Members Trend ===
    if(typeof Chart!=='undefined'&&trend.length>1){
      var actCtx=document.getElementById('idlActActiveChart');
      if(actCtx){
        var actData=trend.map(function(w){
          var count=0;
          members.forEach(function(m){
            var h=m.weeklyHistory||[];if(h.some(function(e){return e.weekStart===w.week&&e.gp>0;}))count++;
          });
          return{week:w.week,count:count};
        });
        new Chart(actCtx,{type:'line',data:{labels:actData.map(function(a){return a.week.slice(5);}),datasets:[{label:'Active Members',data:actData.map(function(a){return a.count;}),borderColor:'#2196f3',backgroundColor:'#2196f322',fill:true,tension:0.3,pointRadius:3}]},options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false}},scales:{x:{ticks:{color:'#8b8fa3',font:{size:10}},grid:{color:'#2a2f3a'}},y:{beginAtZero:true,ticks:{color:'#8b8fa3',stepSize:1},grid:{color:'#2a2f3a'}}}}});
      }
    }

    // === Top Improvers & Decliners ===
    var allWeeks=[];members.forEach(function(m){(m.weeklyHistory||[]).forEach(function(h){if(allWeeks.indexOf(h.weekStart)===-1)allWeeks.push(h.weekStart);});});
    allWeeks.sort();
    if(allWeeks.length>=2){
      var lastWeek=allWeeks[allWeeks.length-1];var prevWeek=allWeeks[allWeeks.length-2];
      var changes=members.filter(function(m){return m.status!=='kicked'}).map(function(m){
        var h=m.weeklyHistory||[];
        var cur=(h.find(function(e){return e.weekStart===lastWeek})||{}).gp||0;
        var prev=(h.find(function(e){return e.weekStart===prevWeek})||{}).gp||0;
        return{name:m.name,cur:cur,prev:prev,diff:cur-prev};
      });
      var improvers=changes.filter(function(c){return c.diff>0}).sort(function(a,b){return b.diff-a.diff}).slice(0,8);
      var decliners=changes.filter(function(c){return c.diff<0}).sort(function(a,b){return a.diff-b.diff}).slice(0,8);
      var impEl=document.getElementById('idlActImprovers');
      if(impEl)impEl.innerHTML=improvers.map(function(c,i){return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2a2f3a;font-size:12px"><span>'+(i+1)+'. <b>'+safe(c.name)+'</b></span><span style="color:#4caf50">+'+fmtN(c.diff)+' GP</span></div>';}).join('')||'<div style="color:#8b8fa3;font-size:12px">No improvements this week</div>';
      var decEl=document.getElementById('idlActDecliners');
      if(decEl)decEl.innerHTML=decliners.map(function(c,i){return '<div style="display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid #2a2f3a;font-size:12px"><span>'+(i+1)+'. <b>'+safe(c.name)+'</b></span><span style="color:#f44336">'+fmtN(c.diff)+' GP</span></div>';}).join('')||'<div style="color:#8b8fa3;font-size:12px">No declines this week</div>';
    }

    // === Inactivity Forecast ===
    var fcEl=document.getElementById('idlActForecast');
    if(fcEl){
      var atRisk=members.filter(function(m){return m.status!=='kicked'&&m.kickRiskScore>=30}).sort(function(a,b){return(b.kickRiskScore||0)-(a.kickRiskScore||0)}).slice(0,10);
      if(atRisk.length){
        fcEl.innerHTML='<div style="display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:8px">'+atRisk.map(function(m){
          var risk=m.kickRiskScore||0;
          var color=risk>=70?'#f44336':risk>=50?'#ff9800':'#ffc107';
          var wGp=m.weeklyGp||0;
          var trend=m.weeklyHistory&&m.weeklyHistory.length>=2?m.weeklyHistory[m.weeklyHistory.length-1].gp-m.weeklyHistory[m.weeklyHistory.length-2].gp:0;
          return '<div style="background:#1e1e24;border:1px solid '+color+'33;border-radius:8px;padding:8px 10px"><div style="display:flex;justify-content:space-between;margin-bottom:4px"><b style="font-size:13px">'+safe(m.name)+'</b><span style="color:'+color+';font-size:12px;font-weight:700">Risk: '+risk+'</span></div><div style="font-size:11px;color:#8b8fa3">Days away: '+m.daysAway+' · Weekly: '+fmtN(wGp)+' · Trend: <span style="color:'+(trend>=0?'#4caf50':'#f44336')+'">'+( trend>=0?'+':'')+fmtN(trend)+'</span></div></div>';
        }).join('')+'</div>';
      }else{
        fcEl.innerHTML='<div style="color:#4caf50;font-size:12px">✅ All members are in good standing! No one is at significant risk of inactivity.</div>';
      }
    }

  }).catch(function(e){
    console.error('Activity tab error:',e);
    var hmEl=document.getElementById('idlActHeatmap');
    if(hmEl)hmEl.innerHTML='<div style="color:#f44336">❌ Failed to load: '+safe(e.message)+'</div>';
  });
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
  const { dashboardSettings, auditLogHistory = [], client } = _getState();
  const als = dashboardSettings.auditLogSettings || {};
  const guild = client.guilds.cache.first();
  const alChannels = guild ? Array.from(guild.channels.cache.filter(c => c.type === 0 || c.type === 5).values()).map(c => ({id:c.id,name:c.name})).sort((a,b)=>a.name.localeCompare(b.name)) : [];
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
  <div style="display:grid;grid-template-columns:repeat(6,1fr);gap:5px;margin-bottom:10px">
    <div style="background:#1a1a1d;padding:4px 6px;border-radius:5px;text-align:center">
      <div style="font-size:15px;font-weight:700;color:#9146ff">${sd.week}</div>
      <div style="font-size:9px;color:#888">This Week</div>
    </div>
    <div style="background:#1a1a1d;padding:4px 6px;border-radius:5px;text-align:center">
      <div style="font-size:15px;font-weight:700;color:#E74C3C">${sd.bans}</div>
      <div style="font-size:9px;color:#888">Bans</div>
    </div>
    <div style="background:#1a1a1d;padding:4px 6px;border-radius:5px;text-align:center">
      <div style="font-size:15px;font-weight:700;color:#E67E22">${sd.timeouts}</div>
      <div style="font-size:9px;color:#888">Timeouts</div>
    </div>
    <div style="background:#1a1a1d;padding:4px 6px;border-radius:5px;text-align:center">
      <div style="font-size:15px;font-weight:700;color:#2ECC71">${sd.joins}</div>
      <div style="font-size:9px;color:#888">Joins</div>
    </div>
    <div style="background:#1a1a1d;padding:4px 6px;border-radius:5px;text-align:center">
      <div style="font-size:15px;font-weight:700;color:#F39C12">${sd.warns}</div>
      <div style="font-size:9px;color:#888">New Acct</div>
    </div>
    <div style="background:#1a1a1d;padding:4px 6px;border-radius:5px;text-align:center">
      <div style="font-size:15px;font-weight:700;color:#3498DB">${sd.total}</div>
      <div style="font-size:9px;color:#888">Total</div>
    </div>
  </div>

  <!-- Core Settings -->
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px;margin-bottom:8px">
    <div>
      <label style="font-size:10px;color:#8b8fa3;display:block;margin-bottom:2px">Log Channel</label>
      <select id="auditChannelId" style="margin:0">
        <option value="">Select channel...</option>
        ${alChannels.map(c => `<option value="${c.id}"${c.id === (auditLogSettings.channelId||'') ? ' selected' : ''}>#${c.name}</option>`).join('')}
      </select>
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
  <div id="mlEvents" style="padding:8px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:6px">
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;font-size:11px">
      <div style="background:#1a1a1d;padding:5px 6px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:4px;font-size:10px;color:#9146ff">👥 Join/Leave</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberJoins" ${auditLogSettings.logMemberJoins?'checked':''}><span>Joins & position</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberLeaves" ${auditLogSettings.logMemberLeaves?'checked':''}><span>Leaves</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="warnNewAccounts" ${auditLogSettings.warnNewAccounts?'checked':''}><span>New account warn</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberBoosts" ${auditLogSettings.logMemberBoosts?'checked':''}><span>Boosts</span></label>
        <div style="margin-top:4px"><label style="font-size:10px;color:#8b8fa3">New acct threshold (days)</label><input id="newAccountThresholdDays" type="number" min="1" max="365" value="${auditLogSettings.newAccountThresholdDays || 7}" style="margin:2px 0;width:80px"></div>
      </div>
      <div style="background:#1a1a1d;padding:5px 6px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:4px;font-size:10px;color:#E74C3C">🛡️ Moderation</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberBans" ${auditLogSettings.logMemberBans?'checked':''}><span>Bans & unbans</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberTimeouts" ${auditLogSettings.logMemberTimeouts?'checked':''}><span>Timeouts</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMemberMutes" ${auditLogSettings.logMemberMutes?'checked':''}><span>Mutes</span></label>
      </div>
      <div style="background:#1a1a1d;padding:5px 6px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:4px;font-size:10px;color:#1ABC9C">👤 Profile</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logUsernameChanges" ${auditLogSettings.logUsernameChanges?'checked':''}><span>Name changes</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logAvatarChanges" ${auditLogSettings.logAvatarChanges?'checked':''}><span>Avatar changes</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logRoleChanges" ${auditLogSettings.logRoleChanges?'checked':''}><span>Role updates</span></label>
      </div>
    </div>
    <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:4px;margin-top:4px;font-size:11px">
      <div style="background:#1a1a1d;padding:5px 6px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:4px;font-size:10px;color:#3498DB">💬 Messages</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMessageEdits" ${auditLogSettings.logMessageEdits?'checked':''}><span>Edits</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMessageDeletes" ${auditLogSettings.logMessageDeletes?'checked':''}><span>Deletes & bulk</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logMessagePins" ${auditLogSettings.logMessagePins?'checked':''}><span>Pins / unpins</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="storeDeletedImages" ${auditLogSettings.storeDeletedImages?'checked':''}><span>📸 Store deleted images</span></label>
      </div>
      <div style="background:#1a1a1d;padding:5px 6px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:4px;font-size:10px;color:#7289DA">⚙️ Server</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logServerUpdates" ${auditLogSettings.logServerUpdates?'checked':''}><span>Settings updates</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logIntegrations" ${auditLogSettings.logIntegrations?'checked':''}><span>Bots add/remove</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logChannelChanges" ${auditLogSettings.logChannelChanges?'checked':''}><span>Channel changes</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logEmojiChanges" ${auditLogSettings.logEmojiChanges?'checked':''}><span>Emoji/sticker</span></label>
      </div>
      <div style="background:#1a1a1d;padding:5px 6px;border-radius:4px">
        <div style="font-weight:600;margin-bottom:4px;font-size:10px;color:#F47FFF">🔊 Voice & Threads</div>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logVoiceChanges" ${auditLogSettings.logVoiceChanges?'checked':''}><span>Voice join/leave/move</span></label>
        <label style="display:flex;align-items:center;gap:6px;cursor:pointer;margin:3px 0"><input type="checkbox" id="logThreadChanges" ${auditLogSettings.logThreadChanges?'checked':''}><span>Thread create/archive</span></label>
      </div>
    </div>
  </div>

  <!-- Action Grouping - always visible -->
  <label style="display:flex;align-items:center;gap:8px;cursor:pointer;margin:8px 0 4px;font-weight:600;font-size:12px;color:#9146ff">
    <input type="checkbox" onchange="document.getElementById('mlGrouping').style.display=this.checked?'block':'none'" style="accent-color:#9146ff"> ⏱️ Action Grouping & Performance
  </label>
  <div id="mlGrouping" style="display:none;padding:8px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:6px">
    <p style="color:#8b8fa3;font-size:10px;margin:0 0 6px">Group rapid events into summaries instead of flooding the log channel.</p>
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
  <div id="mlExclusions" style="display:none;padding:8px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:6px">
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
  <div id="mlAlerts" style="display:${auditLogSettings.alertEnabled?'block':'none'};padding:8px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:6px">
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
  <div id="mlCritical" style="display:${auditLogSettings.dmNotificationsEnabled?'block':'none'};padding:8px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:6px">
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
  <div id="mlRetention" style="display:none;padding:8px;background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:6px">
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

  <button onclick="saveAuditLogSettings()" style="margin-top:8px">💾 Save Member Log Settings</button>
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

<!-- ── Member Config Section ── -->
<div class="card" style="margin-top:10px;padding:8px 12px">
  <div style="display:flex;align-items:center;justify-content:space-between">
    <div><h3 style="margin:0;font-size:13px">👥 Member Config</h3><p style="color:#8b8fa3;font-size:10px;margin:2px 0 0">Quarantine, anti-alt, notes, modmail, and more.</p></div>
  </div>
</div>
<style>
.mc-section{background:#1e1f22;border:1px solid #2a2f3a;border-radius:6px;margin-bottom:3px;overflow:hidden}
.mc-header{display:flex;align-items:center;gap:6px;padding:7px 10px;cursor:pointer;user-select:none}
.mc-header:hover{background:#26262c}
.mc-header .mc-icon{font-size:14px;flex-shrink:0}
.mc-header .mc-title{font-size:12px;font-weight:600;color:#e0e0e0}
.mc-header .mc-desc{font-size:9px;color:#8b8fa3}
.mc-body{padding:6px 10px 8px;border-top:1px solid #2a2f3a;display:none}
.mc-body.open{display:block}
.mc-row{display:grid;grid-template-columns:1fr 1fr;gap:5px;margin-bottom:4px}
.mc-lbl{font-size:10px;color:#8b8fa3;display:block;margin-bottom:1px}
.mc-sel,.mc-inp{width:100%;padding:5px 7px;border:1px solid #3a3a42;border-radius:4px;background:#1d2028;color:#e0e0e0;font-size:11px;box-sizing:border-box}
.mc-toggle{position:relative;display:inline-block;width:32px;height:18px;cursor:pointer;flex-shrink:0;margin-left:auto}
.mc-toggle input{opacity:0;width:0;height:0;position:absolute}
.mc-toggle .mc-sl{position:absolute;inset:0;background:#3a3a42;border-radius:9px;transition:.3s}
.mc-toggle .mc-dot{position:absolute;top:2px;left:2px;width:14px;height:14px;background:#888;border-radius:50%;transition:.3s}
.mc-toggle input:checked+.mc-sl{background:#4caf5044}
.mc-toggle input:checked+.mc-sl+.mc-dot{transform:translateX(14px);background:#4caf50}
.mc-save{padding:4px 12px;background:#5b5bff;color:#fff;border:none;border-radius:4px;font-size:11px;cursor:pointer;font-weight:600}
.mc-tags{display:flex;flex-wrap:wrap;gap:3px;margin-top:3px}
.mc-tag{display:inline-flex;align-items:center;gap:3px;padding:2px 6px;background:#2b2d31;border-radius:3px;font-size:10px;color:#e0e0e0}
.mc-tag .mc-rm{cursor:pointer;color:#e74c3c;margin-left:2px}
#mc_media_drop::-webkit-scrollbar{width:5px}
#mc_media_drop::-webkit-scrollbar-track{background:transparent}
#mc_media_drop::-webkit-scrollbar-thumb{background:#2a2d35;border-radius:3px}
#mc_media_drop::-webkit-scrollbar-thumb:hover{background:#3a3d45}
.mc-sel::-webkit-scrollbar{width:5px}
.mc-sel::-webkit-scrollbar-track{background:transparent}
.mc-sel::-webkit-scrollbar-thumb{background:#2a2d35;border-radius:3px}
</style>
<div style="display:flex;flex-direction:column;gap:0">

<!-- Quarantine -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">🔒</span>
    <div style="flex:1"><span class="mc-title">Quarantine System</span><div class="mc-desc">Auto-assign quarantine role to new members</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_quarantine_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div class="mc-row">
      <div><span class="mc-lbl">Quarantine Role</span><select id="mc_quarantine_role" class="mc-sel"><option value="">Select role...</option>${(() => { const g = client.guilds.cache.first(); return g ? Array.from(g.roles.cache.values()).filter(r => !r.managed && r.name !== '@everyone').sort((a,b) => a.name.localeCompare(b.name)).map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('') : ''; })()}</select></div>
      <div><span class="mc-lbl">Duration (minutes)</span><input type="number" id="mc_quarantine_dur" class="mc-inp" value="60" min="5" max="10080"></div>
    </div>
    <div><span class="mc-lbl">Log Channel</span><select id="mc_quarantine_log" class="mc-sel"><option value="">Select channel...</option>${alChannels.map(c => '<option value="' + c.id + '">#' + c.name + '</option>').join('')}</select></div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveQuarantine()">💾 Save</button><span id="mc_quarantine_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Media-Only -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">📷</span>
    <div style="flex:1"><span class="mc-title">Media-Only Channels</span><div class="mc-desc">Only allow images/videos/files in chosen channels</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_media_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div><span class="mc-lbl">Channels (type to search, max 20)</span>
      <div style="position:relative">
        <input id="mc_media_search" class="mc-inp" placeholder="Search channels..." autocomplete="off" onfocus="mcFilterChDrop('mc_media_drop','mc_media_search');mcShowDrop('mc_media_drop')" oninput="mcFilterChDrop('mc_media_drop','mc_media_search')">
        <div id="mc_media_drop" style="display:none;position:absolute;top:100%;left:0;right:0;max-height:150px;overflow-y:auto;background:#1e1f22;border:1px solid #444;border-radius:6px;z-index:100;margin-top:2px"></div>
      </div>
      <div id="mc_media_tags" class="mc-tags"></div>
      <input type="hidden" id="mc_media_ids" value="">
    </div>
    <div style="margin-top:6px"><span class="mc-lbl">Warning Message</span><input id="mc_media_msg" class="mc-inp" value="⚠️ This channel only allows images, videos, and files."></div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveMedia()">💾 Save</button><span id="mc_media_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Anti-Alt -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">🕵️</span>
    <div style="flex:1"><span class="mc-title">Anti-Alt Detector</span><div class="mc-desc">Flag accounts younger than configurable age</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_antialt_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div class="mc-row" style="grid-template-columns:1fr 1fr 1fr">
      <div><span class="mc-lbl">Min Age (days)</span><input type="number" id="mc_antialt_age" class="mc-inp" value="7" min="1" max="90"></div>
      <div><span class="mc-lbl">Action</span><select id="mc_antialt_action" class="mc-sel"><option value="log">Log Only</option><option value="kick">Kick</option><option value="quarantine">Quarantine</option></select></div>
      <div><span class="mc-lbl">Log Channel</span><select id="mc_antialt_log" class="mc-sel"><option value="">Select...</option>${alChannels.map(c => '<option value="' + c.id + '">#' + c.name + '</option>').join('')}</select></div>
    </div>
    <div><span class="mc-lbl">Quarantine Role (if action=quarantine)</span><select id="mc_antialt_qrole" class="mc-sel"><option value="">Select role...</option>${(() => { const g = client.guilds.cache.first(); return g ? Array.from(g.roles.cache.values()).filter(r => !r.managed && r.name !== '@everyone').sort((a,b) => a.name.localeCompare(b.name)).map(r => '<option value="' + r.id + '">' + r.name + '</option>').join('') : ''; })()}</select></div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveAntiAlt()">💾 Save</button><span id="mc_antialt_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Member Notes -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">📝</span>
    <div style="flex:1"><span class="mc-title">Member Notes</span><div class="mc-desc">Private mod-only notes per member</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_notes_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div style="color:#8b8fa3;font-size:11px">Notes are managed per-member via Discord commands or the moderation panel.</div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveSimple('member-notes','mc_notes_on','mc_notes_st')">💾 Save</button><span id="mc_notes_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Modmail -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">📬</span>
    <div style="flex:1"><span class="mc-title">Mod Mail</span><div class="mc-desc">DM-to-channel moderation mail system</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_modmail_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div class="mc-row">
      <div><span class="mc-lbl">Category</span><select id="mc_modmail_cat" class="mc-sel"><option value="">Select category...</option>${(() => { const g = client.guilds.cache.first(); return g ? Array.from(g.channels.cache.filter(c => c.type === 4).values()).sort((a,b) => a.name.localeCompare(b.name)).map(c => '<option value="' + c.id + '">' + c.name + '</option>').join('') : ''; })()}</select></div>
      <div><span class="mc-lbl">Log Channel</span><select id="mc_modmail_log" class="mc-sel"><option value="">Select...</option>${alChannels.map(c => '<option value="' + c.id + '">#' + c.name + '</option>').join('')}</select></div>
    </div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveModmail()">💾 Save</button><span id="mc_modmail_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Bookmarks -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">🔖</span>
    <div style="flex:1"><span class="mc-title">Message Bookmarks</span><div class="mc-desc">React with emoji to DM the message link</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_bookmarks_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div><span class="mc-lbl">Bookmark Emoji (max 4 chars)</span><input id="mc_bookmarks_emoji" class="mc-inp" value="🔖" style="width:80px"></div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveBookmarks()">💾 Save</button><span id="mc_bookmarks_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Auto-Role Rejoin -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">🔄</span>
    <div style="flex:1"><span class="mc-title">Auto-Role on Rejoin</span><div class="mc-desc">Restore member roles when they rejoin</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_rejoin_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div style="color:#8b8fa3;font-size:11px">Roles are saved on leave and restored on rejoin. Toggle to enable.</div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveSimple('auto-role-rejoin','mc_rejoin_on','mc_rejoin_st')">💾 Save</button><span id="mc_rejoin_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Invite Tracker -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">🔗</span>
    <div style="flex:1"><span class="mc-title">Invite Tracker</span><div class="mc-desc">Track which invite link brought each member</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_invite_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div><span class="mc-lbl">Log Channel ID</span><input id="mc_invite_ch" class="mc-inp" placeholder="Channel ID" style="width:200px"></div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveInvite()">💾 Save</button><span id="mc_invite_st" style="font-size:11px"></span></div>
  </div>
</div>

<!-- Scheduled Roles -->
<div class="mc-section">
  <div class="mc-header" onclick="mcToggle(this)">
    <span class="mc-icon">🗓️</span>
    <div style="flex:1"><span class="mc-title">Scheduled Roles</span><div class="mc-desc">Give or remove roles at scheduled times</div></div>
    <label class="mc-toggle" onclick="event.stopPropagation()"><input type="checkbox" id="mc_schedr_on"><span class="mc-sl"></span><span class="mc-dot"></span></label>
  </div>
  <div class="mc-body">
    <div class="mc-row" style="grid-template-columns:1fr 1fr 1fr">
      <div><span class="mc-lbl">Role ID</span><input id="mc_schedr_role" class="mc-inp" placeholder="Role ID"></div>
      <div><span class="mc-lbl">Action</span><select id="mc_schedr_action" class="mc-sel"><option value="add">Add Role</option><option value="remove">Remove Role</option></select></div>
      <div><span class="mc-lbl">Cron Hour (0-23)</span><input type="number" id="mc_schedr_hour" class="mc-inp" value="12" min="0" max="23"></div>
    </div>
    <div class="mc-row" style="grid-template-columns:1fr 1fr 1fr">
      <div><span class="mc-lbl">Cron Minute</span><input type="number" id="mc_schedr_min" class="mc-inp" value="0" min="0" max="59"></div>
      <div><span class="mc-lbl">Day (0-6 or *)</span><input id="mc_schedr_day" class="mc-inp" value="*"></div>
      <div><span class="mc-lbl">Label</span><input id="mc_schedr_label" class="mc-inp" placeholder="Label"></div>
    </div>
    <div class="mc-row">
      <div><span class="mc-lbl">Target Type</span><select id="mc_schedr_target" class="mc-sel"><option value="all">All Members</option><option value="role">Members with Role</option><option value="users">Specific Users</option></select></div>
      <div><span class="mc-lbl">Target Value</span><input id="mc_schedr_targetval" class="mc-inp" placeholder="Role/user IDs"></div>
    </div>
    <div style="margin-top:6px;display:flex;align-items:center;gap:8px"><button class="mc-save" onclick="mcSaveSchedRoles()">💾 Save</button><span id="mc_schedr_st" style="font-size:11px"></span></div>
  </div>
</div>

</div><!-- end member config -->

<script>
var _mcChannels = ${safeJsonForHtml(alChannels)};

function mcToggle(header){var body=header.nextElementSibling;body.classList.toggle('open');}

function mcShowDrop(id){var d=document.getElementById(id);d.style.display='block';setTimeout(function(){document.addEventListener('click',function _h(e){if(!d.contains(e.target)){d.style.display='none';document.removeEventListener('click',_h);}});},10);}

function mcFilterChDrop(dropId,inputId){
  var d=document.getElementById(dropId),q=document.getElementById(inputId).value.toLowerCase();
  var items=_mcChannels.filter(function(c){return c.name.toLowerCase().includes(q);}).slice(0,12);
  d.innerHTML='';d.style.display=items.length?'block':'none';
  items.forEach(function(c){
    var o=document.createElement('div');o.style.cssText='padding:5px 10px;cursor:pointer;font-size:11px;color:#e0e0e0;border-bottom:1px solid #2a2f3a';
    o.onmouseenter=function(){this.style.background='#333';};o.onmouseleave=function(){this.style.background='';};
    o.textContent='#'+c.name;
    o.onclick=function(){
      d.style.display='none';document.getElementById(inputId).value='';
      var hid=document.getElementById('mc_media_ids'),ids=hid.value?hid.value.split(','):[];
      if(ids.indexOf(c.id)===-1&&ids.length<20){ids.push(c.id);hid.value=ids.join(',');mcRenderMediaTags();}
    };
    d.appendChild(o);
  });
}

function mcRenderMediaTags(){
  var tags=document.getElementById('mc_media_tags'),hid=document.getElementById('mc_media_ids');
  var ids=hid.value?hid.value.split(',').filter(Boolean):[];
  tags.innerHTML='';ids.forEach(function(id){
    var ch=_mcChannels.find(function(c){return c.id===id;});
    var t=document.createElement('span');t.className='mc-tag';
    t.innerHTML='#'+(ch?ch.name:id)+' <span class="mc-rm" onclick="mcRemoveMediaCh(\\''+id+'\\')">✕</span>';
    tags.appendChild(t);
  });
}

function mcRemoveMediaCh(id){
  var hid=document.getElementById('mc_media_ids');
  hid.value=hid.value.split(',').filter(function(i){return i!==id;}).join(',');
  mcRenderMediaTags();
}

function mcStatus(id,ok,msg){var s=document.getElementById(id);s.innerHTML='<span style="color:'+(ok?'#2ecc71':'#ef5350')+'">'+(ok?'✅ ':'❌ ')+msg+'</span>';setTimeout(function(){s.innerHTML='';},3000);}

function mcSaveSimple(api,toggleId,stId){
  fetch('/api/features/'+api,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById(toggleId).checked})}).then(function(r){return r.json()}).then(function(d){mcStatus(stId,d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus(stId,false,e.message);});
}

function mcSaveQuarantine(){
  fetch('/api/features/quarantine',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById('mc_quarantine_on').checked,roleId:document.getElementById('mc_quarantine_role').value||null,durationMinutes:parseInt(document.getElementById('mc_quarantine_dur').value)||60,logChannelId:document.getElementById('mc_quarantine_log').value||null})}).then(function(r){return r.json()}).then(function(d){mcStatus('mc_quarantine_st',d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus('mc_quarantine_st',false,e.message);});
}

function mcSaveMedia(){
  var ids=document.getElementById('mc_media_ids').value.split(',').filter(Boolean);
  fetch('/api/features/media-only',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById('mc_media_on').checked,channels:ids,warningMessage:document.getElementById('mc_media_msg').value.slice(0,500)})}).then(function(r){return r.json()}).then(function(d){mcStatus('mc_media_st',d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus('mc_media_st',false,e.message);});
}

function mcSaveAntiAlt(){
  fetch('/api/features/anti-alt',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById('mc_antialt_on').checked,minAccountAgeDays:parseInt(document.getElementById('mc_antialt_age').value)||7,action:document.getElementById('mc_antialt_action').value,logChannelId:document.getElementById('mc_antialt_log').value||null,quarantineRoleId:document.getElementById('mc_antialt_qrole').value||null})}).then(function(r){return r.json()}).then(function(d){mcStatus('mc_antialt_st',d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus('mc_antialt_st',false,e.message);});
}

function mcSaveModmail(){
  fetch('/api/features/modmail',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById('mc_modmail_on').checked,categoryId:document.getElementById('mc_modmail_cat').value||null,logChannelId:document.getElementById('mc_modmail_log').value||null})}).then(function(r){return r.json()}).then(function(d){mcStatus('mc_modmail_st',d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus('mc_modmail_st',false,e.message);});
}

function mcSaveBookmarks(){
  fetch('/api/features/bookmarks',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById('mc_bookmarks_on').checked,emoji:document.getElementById('mc_bookmarks_emoji').value.slice(0,4)})}).then(function(r){return r.json()}).then(function(d){mcStatus('mc_bookmarks_st',d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus('mc_bookmarks_st',false,e.message);});
}

function mcSaveInvite(){
  fetch('/api/features/invite-tracker',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({enabled:document.getElementById('mc_invite_on').checked,channelId:document.getElementById('mc_invite_ch').value.trim()||null})}).then(function(r){return r.json()}).then(function(d){mcStatus('mc_invite_st',d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus('mc_invite_st',false,e.message);});
}

function mcSaveSchedRoles(){
  var body={enabled:document.getElementById('mc_schedr_on').checked};
  var rId=document.getElementById('mc_schedr_role').value.trim();
  if(rId){body.addSchedule={roleId:rId,action:document.getElementById('mc_schedr_action').value,cronHour:parseInt(document.getElementById('mc_schedr_hour').value)||12,cronMinute:parseInt(document.getElementById('mc_schedr_min').value)||0,cronDay:document.getElementById('mc_schedr_day').value.trim()||'*',label:document.getElementById('mc_schedr_label').value.slice(0,50),targetType:document.getElementById('mc_schedr_target').value,targetValue:document.getElementById('mc_schedr_targetval').value.trim()};}
  fetch('/api/features/scheduled-roles',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){mcStatus('mc_schedr_st',d.success,d.success?'Saved!':d.error||'Error');}).catch(function(e){mcStatus('mc_schedr_st',false,e.message);});
}

// Load all member config feature states
(function(){
  var features=['quarantine','media-only','anti-alt','member-notes','modmail','bookmarks','auto-role-rejoin','invite-tracker','scheduled-roles'];
  features.forEach(function(api){
    fetch('/api/features/'+api).then(function(r){return r.json()}).then(function(d){
      var c=d.config||d;
      if(api==='quarantine'){document.getElementById('mc_quarantine_on').checked=!!c.enabled;document.getElementById('mc_quarantine_role').value=c.roleId||'';document.getElementById('mc_quarantine_dur').value=c.durationMinutes||60;document.getElementById('mc_quarantine_log').value=c.logChannelId||'';}
      else if(api==='media-only'){document.getElementById('mc_media_on').checked=!!c.enabled;document.getElementById('mc_media_ids').value=(c.channels||[]).join(',');document.getElementById('mc_media_msg').value=c.warningMessage||'';mcRenderMediaTags();}
      else if(api==='anti-alt'){document.getElementById('mc_antialt_on').checked=!!c.enabled;document.getElementById('mc_antialt_age').value=c.minAccountAgeDays||7;document.getElementById('mc_antialt_action').value=c.action||'log';document.getElementById('mc_antialt_log').value=c.logChannelId||'';document.getElementById('mc_antialt_qrole').value=c.quarantineRoleId||'';}
      else if(api==='member-notes'){document.getElementById('mc_notes_on').checked=!!c.enabled;}
      else if(api==='modmail'){document.getElementById('mc_modmail_on').checked=!!c.enabled;document.getElementById('mc_modmail_cat').value=c.categoryId||'';document.getElementById('mc_modmail_log').value=c.logChannelId||'';}
      else if(api==='bookmarks'){document.getElementById('mc_bookmarks_on').checked=!!c.enabled;document.getElementById('mc_bookmarks_emoji').value=c.emoji||'🔖';}
      else if(api==='auto-role-rejoin'){document.getElementById('mc_rejoin_on').checked=!!c.enabled;}
      else if(api==='invite-tracker'){document.getElementById('mc_invite_on').checked=!!c.enabled;document.getElementById('mc_invite_ch').value=c.channelId||'';}
      else if(api==='scheduled-roles'){document.getElementById('mc_schedr_on').checked=!!c.enabled;}
    }).catch(function(){});
  });
})();
</script>
`;
}

// ====================== TIMEZONE TAB ======================
export function renderTimezoneTab() {
  return `
<div class="card">
  <h2>🕐 Timezone Helper</h2>
  <p style="color:#8b8fa3;margin-bottom:12px">Members can register their timezone and look up other members' local times.</p>
</div>
${_inlineFeature('timezones', 'timezones', 'Timezone Helper', '🕐', 'Enable timezone registration and lookup commands for your community.', `
  <div style="color:#8b8fa3;font-size:12px;padding:8px;background:#1a1a2e;border-radius:6px">
    <strong style="color:#e0e0e0">How it works:</strong><br>
    • Members use <code>/timezone set America/New_York</code> to register their timezone<br>
    • Use <code>/timezone lookup @user</code> to see someone's local time<br>
    • Toggle below enables/disables the timezone system
  </div>
`, { accent: '#2196f3' })}
<script>
function ifLoad_timezones(c){}
function ifSave_timezones(){
  var body={enabled:document.getElementById('if_timezones_enabled').checked};
  fetch('/api/features/timezones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_timezones_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>
`;
}

// ====================== BOT MESSAGES CONFIG TAB ======================
export function renderBotMessagesTab() {
  return `
<style>
.bm-wrap .card{padding:8px 12px;margin-top:6px}
.bm-wrap .card strong{font-size:12px!important}
.bm-wrap .card>div:first-child{margin-bottom:4px!important}
.bm-wrap .card>div:first-child>div>div:last-child{font-size:10px!important}
.bm-wrap .card>div:first-child span{font-size:14px!important}
.bm-wrap [id$="_body"]{gap:5px!important;padding-top:5px!important}
.bm-wrap [id$="_body"] button{padding:4px 12px!important;font-size:11px!important}
.bm-wrap [id$="_body"] input,.bm-wrap [id$="_body"] textarea,.bm-wrap [id$="_body"] select{padding:5px 8px!important;font-size:11px!important}
.bm-wrap [id$="_body"] label{font-size:10px!important}
</style>
<div class="card" style="padding:10px 14px">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:6px">
    <div><h2 style="margin:0;font-size:15px">📨 Bot Messages Config</h2><p style="color:#8b8fa3;font-size:11px;margin:2px 0 0">Automated messages, threads, scheduling, integrations & tracking.</p></div>
  </div>
  <div style="display:flex;gap:0;margin-top:8px;border-bottom:2px solid #2a2f3a">
    <button onclick="bmTab('automation')" id="bm-tab-automation" style="padding:6px 12px;background:none;border:none;color:#9c27b0;font-size:11px;font-weight:600;cursor:pointer;border-bottom:2px solid #9c27b0;margin-bottom:-2px">⚙️ Automation</button>
    <button onclick="bmTab('scheduling')" id="bm-tab-scheduling" style="padding:6px 12px;background:none;border:none;color:#8b8fa3;font-size:11px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px">📅 Scheduling</button>
    <button onclick="bmTab('integrations')" id="bm-tab-integrations" style="padding:6px 12px;background:none;border:none;color:#8b8fa3;font-size:11px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px">🔗 Integrations</button>
    <button onclick="bmTab('tracking')" id="bm-tab-tracking" style="padding:6px 12px;background:none;border:none;color:#8b8fa3;font-size:11px;font-weight:600;cursor:pointer;border-bottom:2px solid transparent;margin-bottom:-2px">📊 Tracking</button>
  </div>
</div>
<div class="bm-wrap">

<script>
function bmTab(t){
  ['automation','scheduling','integrations','tracking'].forEach(function(s){
    document.getElementById('bm-section-'+s).style.display=s===t?'block':'none';
    var btn=document.getElementById('bm-tab-'+s);
    btn.style.color=s===t?'#9c27b0':'#8b8fa3';
    btn.style.borderBottomColor=s===t?'#9c27b0':'transparent';
  });
}
</script>

<!-- ═══ Automation Tab ═══ -->
<div id="bm-section-automation">
${_inlineFeature('sticky-messages', 'stickyMessages', 'Sticky Messages', '📌', 'Pin messages that re-send automatically when pushed up by new messages.', `
  <div style="color:#8b8fa3;font-size:12px;padding:8px;background:#1a1a2e;border-radius:6px">
    Sticky messages are managed per-channel via commands. Use <code>/sticky set #channel Your message</code> to create one.<br>
    Active stickies are automatically maintained by the bot.
  </div>
`, { accent: '#9c27b0', noToggle: true })}
<script>function ifSave_sticky_messages(){alert('Sticky messages are managed via commands. No global config needed.');}</script>

${_inlineFeature('auto-thread', 'autoThread', 'Auto-Thread', '🧵', 'Auto-create threads on messages in configured channels.', `
  ${_inlineFieldRow('Channels (one per line: channelId, nameTemplate, archiveMinutes)', _inlineTextArea('if_auto_thread_channels', 'channelId, {user}-{date}, 1440', 3))}
  <div style="color:#8b8fa3;font-size:10px">Format: <code>channelId, nameTemplate, archiveMinutes (60-10080)</code>. Template vars: <code>{user}</code>, <code>{date}</code></div>
`, { accent: '#9c27b0' })}
<script>
function ifLoad_auto_thread(c){
  var lines=(c.channels||[]).map(function(ch){return ch.channelId+', '+(ch.nameTemplate||'{user}-{date}')+', '+(ch.archiveMinutes||1440)});
  document.getElementById('if_auto_thread_channels').value=lines.join('\\n');
}
function ifSave_auto_thread(){
  var channels=(document.getElementById('if_auto_thread_channels').value||'').split('\\n').map(function(l){var p=l.split(',').map(function(s){return s.trim()});return{channelId:p[0],nameTemplate:p[1]||'{user}-{date}',archiveMinutes:parseInt(p[2])||1440}}).filter(function(c){return c.channelId});
  var body={enabled:document.getElementById('if_auto_thread_enabled').checked,channels:channels};
  fetch('/api/features/auto-thread',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_auto_thread_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>

${_inlineFeature('lockdown', 'lockedChannels', 'Channel Lockdown', '🔐', 'Quick-lock or unlock channels from the dashboard.', `
  <div style="color:#8b8fa3;font-size:12px;padding:8px;background:#1a1a2e;border-radius:6px">
    Channels are locked/unlocked via the <code>/lockdown</code> command or the moderation panel.<br>
    Locked channels have send permissions disabled for @everyone.
  </div>
`, { accent: '#9c27b0', noToggle: true })}
<script>function ifSave_lockdown(){alert('Channel lockdowns are managed via commands.');}</script>

${_inlineFeature('auto-purge', 'autoPurge', 'Auto-Purge', '🗑️', 'Auto-delete old messages in configured channels (also available in Auto-Mod).', `
  ${_inlineFieldRow('Channels (one per line: channelId, maxAgeDays, checkIntervalHours)', _inlineTextArea('if_auto_purge2_channels', 'channelId, 7, 6', 3))}
  <div style="color:#8b8fa3;font-size:10px">Format: <code>channelId, maxAgeDays (1-14), checkIntervalHours (1-24)</code></div>
`, { accent: '#9c27b0' })}
<script>
function ifLoad_auto_purge2(c){
  var lines=(c.channels||[]).map(function(ch){return ch.channelId+', '+(ch.maxAgeDays||7)+', '+(ch.checkIntervalHours||6)});
  document.getElementById('if_auto_purge2_channels').value=lines.join('\\n');
}
(function(){
  fetch('/api/features/auto-purge').then(function(r){return r.json()}).then(function(d){
    var c=d.config||d;
    var en=document.getElementById('if_auto_purge2_enabled');var sl=document.getElementById('if_auto_purge2_slider');
    if(en){en.checked=!!c.enabled;if(sl){sl.style.transform=c.enabled?'translateX(20px)':'translateX(0)';sl.style.background=c.enabled?'#4caf50':'#888';}en.addEventListener('change',function(){if(sl){sl.style.transform=this.checked?'translateX(20px)':'translateX(0)';sl.style.background=this.checked?'#4caf50':'#888';}});}
    if(typeof ifLoad_auto_purge2==='function')ifLoad_auto_purge2(c);
  }).catch(function(){});
})();
function ifSave_auto_purge2(){
  var channels=(document.getElementById('if_auto_purge2_channels').value||'').split('\\n').map(function(l){var p=l.split(',').map(function(s){return s.trim()});return{channelId:p[0],maxAgeDays:parseInt(p[1])||7,checkIntervalHours:parseInt(p[2])||6}}).filter(function(c){return c.channelId});
  var body={enabled:document.getElementById('if_auto_purge2_enabled')?.checked,channels:channels};
  fetch('/api/features/auto-purge',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_auto_purge2_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>
</div><!-- end automation -->

<!-- ═══ Scheduling Tab ═══ -->
<div id="bm-section-scheduling" style="display:none">
${_inlineFeature('scheduled-announcements', 'scheduledAnnouncements', 'Scheduled Announcements', '📢', 'Cron-like recurring announcements with templates.', `
  ${_inlineFieldRow('Channel ID', _inlineInput('if_sched_ann_ch', 'Channel ID for announcements'))}
  ${_inlineFieldRow('Message (max 2000 chars)', _inlineTextArea('if_sched_ann_msg', 'Your announcement message...', 3))}
  <div style="display:grid;grid-template-columns:1fr 1fr 1fr;gap:8px">
    ${_inlineFieldRow('Cron Hour (0-23)', _inlineInput('if_sched_ann_hour', '12', 'number', 'min="0" max="23"'))}
    ${_inlineFieldRow('Cron Minute (0-59)', _inlineInput('if_sched_ann_min', '0', 'number', 'min="0" max="59"'))}
    ${_inlineFieldRow('Cron Day (0-6 or * for daily)', _inlineInput('if_sched_ann_day', '*'))}
  </div>
  ${_inlineFieldRow('Label', _inlineInput('if_sched_ann_label', 'My Announcement'))}
`, { accent: '#9c27b0' })}
<script>
function ifLoad_scheduled_announcements(c){}
function ifSave_scheduled_announcements(){
  var body={enabled:document.getElementById('if_scheduled_announcements_enabled').checked};
  var ch=document.getElementById('if_sched_ann_ch').value.trim();
  if(ch){
    body.addAnnouncement={channelId:ch,message:document.getElementById('if_sched_ann_msg').value.slice(0,2000),cronHour:parseInt(document.getElementById('if_sched_ann_hour').value)||12,cronMinute:parseInt(document.getElementById('if_sched_ann_min').value)||0,cronDay:document.getElementById('if_sched_ann_day').value.trim()||'*',label:document.getElementById('if_sched_ann_label').value.slice(0,50)};
  }
  fetch('/api/features/scheduled-announcements',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_scheduled_announcements_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>

<div class="card" style="margin-top:10px;border-left:3px solid #9c27b0">
  <div style="display:flex;align-items:center;gap:8px;margin-bottom:4px">
    <span style="font-size:18px">📅</span>
    <div>
      <strong style="color:#e0e0e0;font-size:14px">Scheduled Messages</strong>
      <div style="color:#8b8fa3;font-size:11px;margin-top:2px">Cron-like message scheduling — configure in the <a href="/scheduled-msgs" style="color:#5b5bff">Scheduled Messages</a> tab or the Reminders sub-tab in Events.</div>
    </div>
  </div>
</div>

${_inlineFeature('event-sync', 'eventSync', 'Scheduled Events Sync', '📅', 'Sync Discord scheduled events from your stream schedule.', `
  ${_inlineFieldRow('Sync Channel ID', _inlineInput('if_event_sync_ch', 'Channel ID'))}
`, { accent: '#9c27b0' })}
<script>
function ifLoad_event_sync(c){document.getElementById('if_event_sync_ch').value=c.syncChannel||'';}
function ifSave_event_sync(){
  var body={enabled:document.getElementById('if_event_sync_enabled').checked,syncChannel:document.getElementById('if_event_sync_ch').value.trim()||null};
  fetch('/api/features/event-sync',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_event_sync_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>
</div><!-- end scheduling -->

<!-- ═══ Integrations Tab ═══ -->
<div id="bm-section-integrations" style="display:none">
${_inlineFeature('webhook-forwarding', 'webhookForwarding', 'Webhook Forwarding', '🔗', 'Forward bot events to an external webhook URL.', `
  ${_inlineFieldRow('Webhook URL (HTTPS)', _inlineInput('if_webhook_fwd_url', 'https://...'))}
  ${_inlineFieldRow('Events to Forward (comma-separated)', _inlineInput('if_webhook_fwd_events', 'stream, moderation, giveaway, leveling'))}
`, { accent: '#9c27b0' })}
<script>
function ifLoad_webhook_forwarding(c){document.getElementById('if_webhook_fwd_url').value=c.url||'';document.getElementById('if_webhook_fwd_events').value=(c.events||[]).join(', ');}
function ifSave_webhook_forwarding(){
  var body={enabled:document.getElementById('if_webhook_forwarding_enabled').checked,url:document.getElementById('if_webhook_fwd_url').value.trim()||null,events:(document.getElementById('if_webhook_fwd_events').value||'').split(',').map(function(s){return s.trim()}).filter(Boolean)};
  fetch('/api/features/webhook-forwarding',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_webhook_forwarding_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>

${_inlineFeature('twitch-clips', 'twitchClips', 'Twitch Clip Auto-Post', '🎬', 'Auto-post new Twitch clips to a channel.', `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    ${_inlineFieldRow('Post Channel ID', _inlineInput('if_twitch_clips_ch', 'Channel ID'))}
    ${_inlineFieldRow('Check Interval (minutes, 5-120)', _inlineInput('if_twitch_clips_interval', '15', 'number', 'min="5" max="120"'))}
  </div>
`, { accent: '#9c27b0' })}
<script>
function ifLoad_twitch_clips(c){document.getElementById('if_twitch_clips_ch').value=c.channelId||'';document.getElementById('if_twitch_clips_interval').value=c.checkIntervalMin||15;}
function ifSave_twitch_clips(){
  var body={enabled:document.getElementById('if_twitch_clips_enabled').checked,channelId:document.getElementById('if_twitch_clips_ch').value.trim()||null,checkIntervalMin:parseInt(document.getElementById('if_twitch_clips_interval').value)||15};
  fetch('/api/features/twitch-clips',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_twitch_clips_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>

${_inlineFeature('auto-backup-discord', 'autoBackupDiscord', 'Auto-Backup to Discord', '💾', 'Periodically send JSON backups to a Discord channel. Also available on the Backups page.', `
  <div style="display:grid;grid-template-columns:1fr 1fr;gap:8px">
    ${_inlineFieldRow('Backup Channel ID', _inlineInput('if_auto_backup_ch', 'Channel ID'))}
    ${_inlineFieldRow('Interval (hours, 1-168)', _inlineInput('if_auto_backup_interval', '24', 'number', 'min="1" max="168"'))}
  </div>
`, { accent: '#9c27b0' })}
<script>
function ifLoad_auto_backup_discord(c){document.getElementById('if_auto_backup_ch').value=c.channelId||'';document.getElementById('if_auto_backup_interval').value=c.intervalHours||24;}
function ifSave_auto_backup_discord(){
  var body={enabled:document.getElementById('if_auto_backup_discord_enabled').checked,channelId:document.getElementById('if_auto_backup_ch').value.trim()||null,intervalHours:parseInt(document.getElementById('if_auto_backup_interval').value)||24};
  fetch('/api/features/auto-backup-discord',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_auto_backup_discord_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>
</div><!-- end integrations -->

<!-- ═══ Tracking Tab ═══ -->
<div id="bm-section-tracking" style="display:none">
${_inlineFeature('voice-activity', 'voiceActivity', 'Voice Activity', '🎤', 'Track per-user voice time in channels.', `
  <div style="color:#8b8fa3;font-size:12px;padding:8px;background:#1a1a2e;border-radius:6px">
    Voice activity is tracked automatically when enabled. View stats in the Analytics pages.
  </div>
`, { accent: '#9c27b0', noToggle: true })}
<script>function ifSave_voice_activity(){alert('Voice activity tracking is automatic — no configuration needed.');}</script>

${_inlineFeature('member-milestones', 'memberMilestones', 'Member Milestones', '🎉', 'Celebrate member count milestones and join anniversaries automatically.', `
  ${_inlineFieldRow('Announcement Channel ID', _inlineInput('if_mm_ch', 'Channel ID for milestone messages'))}
  <div style="display:flex;align-items:center;gap:8px;margin:6px 0">
    <input type="checkbox" id="if_mm_anniv" style="accent-color:#9c27b0">
    <label for="if_mm_anniv" style="font-size:12px;color:#e0e0e0">Announce member join anniversaries</label>
  </div>
  ${_inlineFieldRow('Count Milestones (comma-separated)', _inlineInput('if_mm_counts', '100, 500, 1000, 5000'))}
`, { accent: '#9c27b0' })}
<script>
function ifLoad_member_milestones(c){
  document.getElementById('if_mm_ch').value=c.channelId||'';
  document.getElementById('if_mm_anniv').checked=c.anniversaries!==false;
  document.getElementById('if_mm_counts').value=(c.countMilestones||[]).join(', ');
}
function ifSave_member_milestones(){
  var body={enabled:document.getElementById('if_member_milestones_enabled').checked,channelId:document.getElementById('if_mm_ch').value.trim()||null,anniversaries:document.getElementById('if_mm_anniv').checked,countMilestones:(document.getElementById('if_mm_counts').value||'').split(',').map(function(s){return parseInt(s.trim())}).filter(function(n){return n>0})};
  fetch('/api/features/member-milestones',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}).then(function(r){return r.json()}).then(function(d){var st=document.getElementById('if_member_milestones_status');if(d.success){st.innerHTML='<span style="color:#2ecc71">✅ Saved!</span>';setTimeout(function(){st.innerHTML=''},3000);}else{st.innerHTML='<span style="color:#ef5350">❌ '+(d.error||'Error')+'</span>';}}).catch(function(e){alert(e.message)});
}
</script>
</div><!-- end tracking -->
</div><!-- end bm-wrap -->

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
  return _renderFeaturePage('Safety & Moderation', '🛡️', 'These features have been moved to their dedicated tabs (AutoMod, Leveling, Member Logs/Config) for better inline configuration.', [], userTier);
}

// ── Tab 2: Engagement & Social ──
export function renderFeaturesEngagementTab(userTier) {
  return _renderFeaturePage('Engagement & Social', '🔥', 'Leveling enhancements, milestones, and community features. Features have been moved to their dedicated tabs (Giveaways, Bot Messages).', [], userTier);
}

// ── Tab 3: Server Management ──
export function renderFeaturesServerTab(userTier) {
  return _renderFeaturePage('Server Management', '🔧', 'Server stats and management tools. Features have been moved to dedicated tabs (Analytics, Bot Messages, Tickets).', [], userTier);
}

// ── Tab 4: Integrations ──
export function renderFeaturesIntegrationsTab(userTier) {
  return _renderFeaturePage('Integrations', '🔗', 'All integration features have been moved to dedicated tabs (Welcome, Bot Messages, Tickets, SmartBot News, Health, Analytics).', [], userTier);
}

// ── Tab 5: Monitoring & Logging ──
export function renderFeaturesMonitoringTab(userTier) {
  return _renderFeaturePage('Monitoring & Logging', '📈', 'Monitoring tools. Most features moved to dedicated tabs (Analytics Features, Health, Bot Messages).', [
    { id: 'F18', name: 'Log Search & Filter', icon: '🔍', api: null, builtin: true, tier: 'moderator', desc: 'Search logs by user, type, date, keyword' },
  ], userTier);
}

// ── Tab 6: Dashboard & Bot ──
export function renderFeaturesDashboardTab(userTier) {
  return _renderFeaturePage('Dashboard & Bot', '🎨', 'Dashboard appearance, notifications, and bot configuration.', [
    { id: 'F3', name: 'Dashboard Themes', icon: '🎨', api: 'theme', tier: 'viewer', desc: 'Dark/light/custom theme toggle' },
    { id: 'F11', name: 'Push Notifications', icon: '🔔', api: 'push-notifications', tier: 'moderator', desc: 'Browser push notifications for events' },
    { id: 'F16', name: 'Dashboard Prefs', icon: '📱', api: 'dashboard-prefs', tier: 'viewer', desc: 'Mobile layout and widget preferences' },
    { id: 'F48', name: 'Auto-Responder', icon: '💬', api: 'auto-responder', tier: 'admin', desc: 'Pattern-based auto-reply rules' },
  ], userTier);
}

// ====================== GUIDE INDEXER TAB ======================
export function renderGuideIndexerTab() {
  return `
<style>
  .gi-card-collapsible > summary { cursor:pointer; user-select:none; }
  .gi-card-collapsible > summary::-webkit-details-marker { display:none; }
  .gi-card-collapsible > summary::before { content:'▶  '; font-size:10px; transition:transform .2s; display:inline-block; }
  .gi-card-collapsible[open] > summary::before { transform:rotate(90deg); }
  .gi-fade-in { animation: giFadeIn .3s ease; }
  @keyframes giFadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
  .gi-skeleton { background:linear-gradient(90deg,rgba(255,255,255,0.04) 25%,rgba(255,255,255,0.08) 50%,rgba(255,255,255,0.04) 75%); background-size:200% 100%; animation:giShimmer 1.5s infinite; border-radius:6px; height:20px; margin:4px 0; }
  @keyframes giShimmer { 0% { background-position:200% 0; } 100% { background-position:-200% 0; } }
  .gi-status-dot { width:8px;height:8px;border-radius:50%;display:inline-block;margin-right:4px; }
  .gi-status-dot.online { background:#2ecc71; box-shadow:0 0 4px #2ecc71; }
  .gi-status-dot.warning { background:#f5a623; box-shadow:0 0 4px #f5a623; }
  .gi-status-dot.offline { background:#e74c3c; box-shadow:0 0 4px #e74c3c; }
  .gi-kbd { display:inline-block;padding:1px 6px;border-radius:3px;background:rgba(255,255,255,0.08);border:1px solid rgba(255,255,255,0.15);font-family:monospace;font-size:11px;color:#aaa; }
  .gi-row-hover { transition:background .15s; }
  .gi-row-hover:hover { background:rgba(145,70,255,0.05); }
  .gi-steam-row:hover { background:rgba(27,154,170,0.05); }
  .gi-analysis-row:hover { background:rgba(245,166,35,0.05); }
  .gi-wrap { max-width:100%; overflow-x:hidden; box-sizing:border-box; }
  .gi-wrap .card { max-width:100%; overflow-x:auto; box-sizing:border-box; }
  .gi-stats-grid { display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-bottom:18px; }
  @media(max-width:1100px){ .gi-stats-grid{grid-template-columns:repeat(3,1fr)} }
  @media(max-width:600px){ .gi-stats-grid{grid-template-columns:repeat(2,1fr)} }
</style>
<div class="gi-wrap">
<div class="card gi-fade-in" style="margin-bottom:18px;background:linear-gradient(135deg,#1a1b2e,#1e1f2e);border:1px solid #2a2f3a">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:12px">
    <div>
      <h2 style="margin:0;display:flex;align-items:center;gap:8px"><span class="gi-status-dot" id="gi-status-indicator"></span> 📚 Guide Indexer & Patch Analyzer</h2>
      <p style="margin:4px 0 0;opacity:0.7;font-size:13px">Index your forum guides and analyze patch notes to find what needs updating
        <span style="margin-left:12px;opacity:0.5;font-size:11px">Shortcuts: <span class="gi-kbd">S</span> Scan <span class="gi-kbd">B</span> Bump <span class="gi-kbd">I</span> IdleOn <span class="gi-kbd">P</span> Patches <span class="gi-kbd">/</span> Search</span>
      </p>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn btn-sm" onclick="guideIndexerScan()" id="gi-scan-btn" style="background:#2ecc7122;color:#2ecc71;border:1px solid #2ecc7144">🔄 Scan Guides</button>
      <button class="btn btn-sm" onclick="guideIndexerBump()" id="gi-bump-btn" style="background:#3498db22;color:#3498db;border:1px solid #3498db44">📌 Bump All Threads</button>
      <button class="btn btn-sm" onclick="guideIndexerFetchIdleon()" id="gi-idleon-btn" style="background:#e67e2222;color:#e67e22;border:1px solid #e67e2244">🎮 Fetch IdleOn Data</button>
      <button class="btn btn-sm" onclick="guideIndexerFetchSteam()" id="gi-steam-btn" style="background:#1b9aaa22;color:#1b9aaa;border:1px solid #1b9aaa44">🎮 Fetch Steam Patches</button>
      <button class="btn btn-sm btn-primary" onclick="document.getElementById('gi-patch-modal').style.display='flex'" style="background:#9b59b622;color:#9b59b6;border:1px solid #9b59b644">📋 Analyze Patch Notes</button>
    </div>
  </div>
</div>

<div class="gi-stats-grid">
  <div class="card" style="text-align:center;padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border:1px solid #2a2f3a">
    <div style="font-size:28px;font-weight:700;color:#9b59b6" id="gi-stat-guides">—</div>
    <div style="font-size:12px;opacity:0.6">Guides Indexed</div>
  </div>
  <div class="card" style="text-align:center;padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border:1px solid #2a2f3a">
    <div style="font-size:28px;font-weight:700;color:#f39c12" id="gi-stat-analyses">—</div>
    <div style="font-size:12px;opacity:0.6">Analyses Run</div>
  </div>
  <div class="card" style="text-align:center;padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border:1px solid #2a2f3a">
    <div style="font-size:28px;font-weight:700;color:#e67e22" id="gi-stat-idleon">—</div>
    <div style="font-size:12px;opacity:0.6">IdleOn Terms</div>
  </div>
  <div class="card" style="text-align:center;padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border:1px solid #2a2f3a">
    <div style="font-size:28px;font-weight:700;color:#1b9aaa" id="gi-stat-steam">—</div>
    <div style="font-size:12px;opacity:0.6">Steam Patches</div>
  </div>
  <div class="card" style="text-align:center;padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border:1px solid #2a2f3a">
    <div style="font-size:14px;font-weight:600;color:#2ecc71" id="gi-stat-scan">Never</div>
    <div style="font-size:12px;opacity:0.6">Last Scan</div>
  </div>
  <div class="card" style="text-align:center;padding:16px;background:linear-gradient(135deg,#2b2d31,#232428);border:1px solid #2a2f3a">
    <div style="font-size:14px;font-weight:600;color:#3498db" id="gi-stat-bump">Never</div>
    <div style="font-size:12px;opacity:0.6">Last Bump</div>
  </div>
</div>

<!-- Config -->
<div class="card" style="margin-bottom:18px">
  <h3 style="margin:0 0 12px">⚙️ Configuration</h3>
  <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap">
    <div style="flex:1;min-width:250px">
      <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Forum Channel IDs (comma-separated)</label>
      <input type="text" id="gi-channels" class="input" placeholder="123456789012345678" style="width:100%">
    </div>
    <div style="width:140px">
      <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Auto-scan (hours, 0=off)</label>
      <input type="number" id="gi-autoscan" class="input" min="0" max="168" value="0" style="width:100%">
    </div>
    <div style="width:140px">
      <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Auto-bump (hours)</label>
      <input type="number" id="gi-autobump-hours" class="input" min="1" max="168" value="23" style="width:100%">
    </div>
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" id="gi-autobump-on"> Auto-bump
    </label>
    <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
      <input type="checkbox" id="gi-autonotify-on" checked> Auto-notify guides
    </label>
    <button class="btn btn-sm" onclick="guideIndexerSaveConfig()">Save</button>
  </div>
  <details style="margin-top:14px">
    <summary style="cursor:pointer;font-size:13px;opacity:0.85">📌 Bump Settings</summary>
    <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-top:10px">
      <div style="width:140px">
        <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Stagger delay (ms)</label>
        <input type="number" id="gi-bump-stagger" class="input" min="500" max="10000" value="2000" style="width:100%">
      </div>
      <div style="width:140px">
        <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Skip recent (hours)</label>
        <input type="number" id="gi-bump-skip-recent" class="input" min="0" max="168" value="2" style="width:100%">
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="gi-bump-msg-on"> Send message
      </label>
      <div style="flex:1;min-width:200px">
        <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Bump message</label>
        <input type="text" id="gi-bump-msg" class="input" placeholder="📌 Keeping this guide thread active!" maxlength="200" style="width:100%">
      </div>
    </div>
  </details>
  <details style="margin-top:14px">
    <summary style="cursor:pointer;font-size:13px;opacity:0.85">🔔 Notification Settings</summary>
    <div style="display:flex;gap:12px;align-items:end;flex-wrap:wrap;margin-top:10px">
      <div style="flex:1;min-width:200px">
        <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Notify Channel ID (optional override)</label>
        <input type="text" id="gi-notify-channel" class="input" placeholder="Leave empty for guide threads" style="width:100%">
      </div>
      <div style="width:140px">
        <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Cooldown (hours)</label>
        <input type="number" id="gi-notify-cooldown" class="input" min="0" max="720" value="12" style="width:100%">
      </div>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="gi-notify-digest"> Digest mode
      </label>
      <label style="display:flex;align-items:center;gap:6px;font-size:13px;cursor:pointer">
        <input type="checkbox" id="gi-notify-dm-authors"> DM authors
      </label>
    </div>
  </details>
  </div>

<!-- Notification History -->
<div class="card" style="margin-bottom:18px">
  <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:10px">
    <h3 style="margin:0">🔔 Notification History</h3>
    <span style="font-size:12px;opacity:0.6" id="gi-notify-history-count"></span>
  </div>
  <div id="gi-notify-history" style="max-height:300px;overflow-y:auto"><em style="color:#8b8fa3;padding:8px;display:block">No notifications sent yet.</em></div>
</div>

<!-- IdleOn Data Manager -->
<div class="card" style="margin-bottom:18px">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
    <h3 style="margin:0">🎮 IdleOn Game Data</h3>
    <div style="display:flex;gap:6px;align-items:center">
      <input type="text" id="gi-idleon-search" class="input" placeholder="🔍 Search terms..." oninput="guideIndexerSearchIdleon()" style="width:160px;padding:6px 10px;font-size:12px">
      <span style="font-size:12px;opacity:0.5" id="gi-idleon-fetched-at"></span>
    </div>
  </div>
  <div id="gi-idleon-stats" style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px;font-size:12px"></div>
  <div style="display:flex;gap:12px;flex-wrap:wrap;margin-bottom:12px">
    <div style="flex:1;min-width:200px">
      <div style="font-size:11px;opacity:0.6;margin-bottom:6px">📊 Categories</div>
      <div id="gi-idleon-categories" style="display:flex;flex-wrap:wrap;gap:4px"></div>
    </div>
    <div style="flex:1;min-width:200px">
      <div style="font-size:11px;opacity:0.6;margin-bottom:6px">🔥 Most Used in Guides</div>
      <div id="gi-idleon-most-used" style="display:flex;flex-wrap:wrap;gap:4px"></div>
    </div>
  </div>
  <div id="gi-idleon-terms-list" style="max-height:200px;overflow-y:auto;font-size:12px"></div>
</div>

<!-- Guides Table -->
<div class="card" style="margin-bottom:18px">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
    <h3 style="margin:0">📖 Indexed Guides</h3>
    <div style="display:flex;gap:6px;align-items:center;flex-wrap:wrap">
      <input type="text" id="gi-search" class="input" placeholder="🔍 Search guides..." oninput="guideIndexerFilter()" style="width:180px;padding:6px 12px;font-size:12px">
      <select id="gi-tag-filter" class="input" onchange="guideIndexerFilter()" style="width:130px;padding:5px;font-size:12px">
        <option value="">All tags</option>
      </select>
      <select id="gi-health-filter" class="input" onchange="guideIndexerFilter()" style="width:130px;padding:5px;font-size:12px">
        <option value="">All health</option>
        <option value="good">🟢 Good (80+)</option>
        <option value="fair">🟡 Fair (50-79)</option>
        <option value="poor">🔴 Poor (&lt;50)</option>
      </select>
      <button class="btn btn-xs" onclick="guideBulkDelete()" style="background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;padding:4px 8px;font-size:11px" title="Delete selected">🗑 Selected</button>
      <a href="/api/features/guide-indexer/guides/export-all" target="_blank" style="background:#1b9aaa22;color:#1b9aaa;border:1px solid #1b9aaa44;padding:4px 8px;border-radius:4px;cursor:pointer;font-size:11px;text-decoration:none;display:inline-block" title="Export all guides as JSON">📥 Export</a>
    </div>
  </div>
  <div id="gi-guides-list" style="font-size:13px"><span style="opacity:0.6">Loading...</span></div>
</div>

<!-- Analyses History -->
<div class="card" style="margin-bottom:18px">
  <h3 style="margin:0 0 12px">📊 Analysis History</h3>
  <div id="gi-analyses-list" style="font-size:13px"><span style="opacity:0.6">Loading...</span></div>
</div>

<!-- Steam Patch Notes -->
<div class="card" style="margin-bottom:18px">
  <div style="display:flex;align-items:center;justify-content:space-between;flex-wrap:wrap;gap:10px;margin-bottom:12px">
    <h3 style="margin:0">🎮 Steam Patch Notes <span style="font-size:12px;opacity:0.5;font-weight:400" id="gi-steam-last-fetch"></span></h3>
    <div style="display:flex;gap:8px;align-items:center">
      <span style="font-size:11px;opacity:0.65" id="gi-steam-info"></span>
    </div>
  </div>
  <!-- Steam stats bar -->
  <div id="gi-steam-stats" style="display:none;margin-bottom:12px;display:flex;gap:8px;flex-wrap:wrap"></div>
  <!-- Search & filter -->
  <div style="display:flex;gap:8px;margin-bottom:10px;flex-wrap:wrap;align-items:center">
    <input type="text" id="gi-steam-search" class="input" placeholder="🔍 Search patches..." oninput="filterSteamPatches()" style="width:200px;padding:5px 10px;font-size:12px">
    <select id="gi-steam-type-filter" class="input" onchange="filterSteamPatches()" style="width:120px;padding:5px;font-size:12px">
      <option value="">All types</option>
      <option value="buff">📈 Buffs</option>
      <option value="nerf">📉 Nerfs</option>
      <option value="fix">🔧 Fixes</option>
      <option value="added">✨ Added</option>
      <option value="change">🔄 Changes</option>
      <option value="ui">🖥️ UI</option>
    </select>
    <select id="gi-steam-analyzed-filter" class="input" onchange="filterSteamPatches()" style="width:130px;padding:5px;font-size:12px">
      <option value="">All status</option>
      <option value="analyzed">✓ Analyzed</option>
      <option value="unanalyzed">○ Not analyzed</option>
    </select>
    <button class="btn btn-xs" onclick="steamBatchAnalyze()" id="gi-steam-batch-btn" style="background:#9b59b622;color:#9b59b6;border:1px solid #9b59b644;padding:4px 10px;font-size:11px" title="Analyze all unanalyzed patches">🔍 Batch Analyze</button>
  </div>
  <div id="gi-steam-list" style="font-size:13px"><span style="opacity:0.6">Click "Fetch Steam Patches" to load patch notes from Steam.</span></div>
  <!-- Steam pagination -->
  <div id="gi-steam-pag" style="display:none;margin-top:8px"></div>
</div>

<!-- Steam Patch Detail Modal -->
<div id="gi-steam-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;padding:20px">
  <div style="background:var(--bg-card,#1e1e2e);border-radius:12px;max-width:800px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;position:relative">
    <button onclick="this.parentElement.parentElement.style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;color:inherit;font-size:20px;cursor:pointer">&times;</button>
    <h3 style="margin:0 0 4px" id="gi-steam-detail-title">Patch Notes</h3>
    <div style="font-size:12px;opacity:0.7;margin-bottom:12px" id="gi-steam-detail-meta"></div>
    <div id="gi-steam-detail-parsed" style="margin-bottom:16px"></div>
    <details style="margin-bottom:16px">
      <summary style="cursor:pointer;opacity:0.7;font-size:13px">📄 Raw patch notes</summary>
      <pre id="gi-steam-detail-raw" style="white-space:pre-wrap;font-size:12px;background:rgba(0,0,0,0.3);padding:12px;border-radius:8px;max-height:400px;overflow-y:auto;margin-top:8px"></pre>
    </details>
    <div style="display:flex;justify-content:flex-end;gap:8px">
      <button class="btn btn-sm" onclick="document.getElementById('gi-steam-modal').style.display='none'">Close</button>
      <button class="btn btn-sm btn-primary" id="gi-steam-analyze-btn" onclick="guideIndexerAnalyzeSteamPatch()" style="background:#9b59b622;color:#9b59b6;border:1px solid #9b59b644">🔍 Analyze This Patch</button>
      <button class="btn btn-sm" id="gi-steam-notify-btn" onclick="guideIndexerNotifyPatch(_viewingPatchGid)" style="background:#f5a62322;color:#f5a623;border:1px solid #f5a62344">📢 Notify Guides</button>
    </div>
  </div>
</div>

<!-- Guide Editor Modal -->
<div id="gi-editor-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;padding:20px">
  <div style="background:var(--bg-card,#1e1e2e);border-radius:12px;max-width:800px;width:100%;max-height:85vh;overflow-y:auto;padding:24px;position:relative">
    <button onclick="this.parentElement.parentElement.style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;color:inherit;font-size:20px;cursor:pointer">&times;</button>
    <h3 style="margin:0 0 4px" id="gi-editor-title">Edit Guide</h3>
    <div style="font-size:12px;opacity:0.5;margin-bottom:16px" id="gi-editor-meta"></div>
    <!-- Images -->
    <div id="gi-editor-images" style="margin-bottom:16px"></div>
    <!-- Sections -->
    <div id="gi-editor-sections"></div>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="btn btn-sm" onclick="document.getElementById('gi-editor-modal').style.display='none'">Cancel</button>
      <button class="btn btn-sm" onclick="guideEditorSave()" id="gi-editor-save-btn">💾 Save</button>
      <button class="btn btn-sm btn-primary" onclick="guideEditorRepost()" id="gi-editor-repost-btn">📤 Save & Re-post to Discord</button>
    </div>
  </div>
</div>

<!-- Analysis Detail Modal -->
<div id="gi-analysis-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;padding:20px">
  <div style="background:var(--bg-card,#1e1e2e);border-radius:12px;max-width:700px;width:100%;max-height:80vh;overflow-y:auto;padding:24px;position:relative">
    <button onclick="this.parentElement.parentElement.style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;color:inherit;font-size:20px;cursor:pointer">&times;</button>
    <div id="gi-analysis-detail">Loading...</div>
  </div>
</div>

<!-- Patch Notes Modal -->
<div id="gi-patch-modal" style="display:none;position:fixed;inset:0;background:rgba(0,0,0,0.7);z-index:9999;align-items:center;justify-content:center;padding:20px">
  <div style="background:var(--bg-card,#1e1e2e);border-radius:12px;max-width:600px;width:100%;padding:24px;position:relative">
    <button onclick="this.parentElement.parentElement.style.display='none'" style="position:absolute;top:12px;right:16px;background:none;border:none;color:inherit;font-size:20px;cursor:pointer">&times;</button>
    <h3 style="margin:0 0 16px">📋 Paste Patch Notes</h3>
    <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Patch Title / Version</label>
    <input type="text" id="gi-patch-title" class="input" placeholder="Patch 3.2" style="width:100%;margin-bottom:12px">
    <label style="font-size:12px;opacity:0.7;display:block;margin-bottom:4px">Patch Notes</label>
    <textarea id="gi-patch-text" class="input" rows="12" placeholder="Paste the patch notes here..." style="width:100%;resize:vertical;font-family:monospace;font-size:12px"></textarea>
    <div style="display:flex;justify-content:flex-end;gap:8px;margin-top:16px">
      <button class="btn btn-sm" onclick="document.getElementById('gi-patch-modal').style.display='none'">Cancel</button>
      <button class="btn btn-sm btn-primary" onclick="guideIndexerAnalyze()" id="gi-analyze-btn">🔍 Analyze</button>
    </div>
  </div>
</div>

<script>
(function(){
  const API = '/api/features/guide-indexer';
  let _editGuideId = null;
  let _allGuides = [];
  let _giPage = 0;
  let _giPerPage = 10;
  let _giSortCol = null;
  let _giSortAsc = false;
  let _giFiltered = [];

  var showToast = window.showToast = function(msg, type) {
    var t = document.createElement('div');
    t.textContent = msg;
    t.style.cssText = 'position:fixed;bottom:24px;right:24px;padding:10px 20px;border-radius:8px;color:#fff;font-size:13px;z-index:99999;box-shadow:0 4px 12px rgba(0,0,0,.4);transition:opacity .3s;' +
      (type === 'error' ? 'background:#e74c3c' : type === 'success' ? 'background:#2ecc71' : 'background:#3498db');
    document.body.appendChild(t);
    setTimeout(function(){ t.style.opacity = '0'; setTimeout(function(){ t.remove(); }, 400); }, 3000);
  };

  var SORT_COLS = [
    { key: 'title', label: 'Title', get: function(g){ return (g.title||'').toLowerCase(); }, type: 'str' },
    { key: 'health', label: '❤️', get: function(g){ return g.health||0; }, type: 'num' },
    { key: 'sections', label: 'Sec', get: function(g){ return g.sections||0; }, type: 'num' },
    { key: 'values', label: 'Val', get: function(g){ return g.values||0; }, type: 'num' },
    { key: 'terms', label: 'Trm', get: function(g){ return g.gameTerms||0; }, type: 'num' },
    { key: 'images', label: 'Img', get: function(g){ return g.images||0; }, type: 'num' },
    { key: 'words', label: 'Words', get: function(g){ return g.wordCount||0; }, type: 'num' },
    { key: 'tags', label: 'Tags', get: function(g){ return (g.tags||[]).length; }, type: 'num' },
    { key: 'indexed', label: 'Indexed', get: function(g){ return g.lastIndexed||''; }, type: 'str' },
  ];

  function sortGuides(guides) {
    if (!_giSortCol) return guides;
    var col = SORT_COLS.find(function(c){ return c.key === _giSortCol; });
    if (!col) return guides;
    var sorted = guides.slice().sort(function(a, b) {
      var va = col.get(a), vb = col.get(b);
      if (col.type === 'num') return _giSortAsc ? va - vb : vb - va;
      return _giSortAsc ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
    });
    return sorted;
  }

  function renderGuidesTable(guides) {
    var gl = document.getElementById('gi-guides-list');
    if (guides.length === 0) { gl.innerHTML = '<em style="padding:12px;display:block;color:#8b8fa3">No guides found.</em>'; return; }

    var sorted = sortGuides(guides);
    var totalPages = Math.ceil(sorted.length / _giPerPage);
    if (_giPage >= totalPages) _giPage = totalPages - 1;
    if (_giPage < 0) _giPage = 0;
    var pageGuides = sorted.slice(_giPage * _giPerPage, (_giPage + 1) * _giPerPage);

    // Header with sortable columns
    var hdrCols = '<th style="padding:6px 4px;width:28px"><input type="checkbox" onchange="giSelectAll(this.checked)"></th>' + SORT_COLS.map(function(c) {
      var arrow = _giSortCol === c.key ? (_giSortAsc ? ' ▲' : ' ▼') : '';
      var w = c.key === 'title' ? 'min-width:120px;' : '';
      return '<th style="padding:6px 4px;cursor:pointer;user-select:none;white-space:nowrap;' + w + '" onclick="giSort(&#39;' + c.key + '&#39;)">' + c.label + '<span style="font-size:9px;opacity:0.6">' + arrow + '</span></th>';
    }).join('') + '<th style="padding:6px 4px;width:56px"></th>';

    var rows = pageGuides.map(function(g) {
      var tagHtml = (g.tags||[]).slice(0,2).map(function(t) {
        return '<span style="background:rgba(145,70,255,0.15);padding:1px 5px;border-radius:8px;font-size:9px;color:#b07fff;border:1px solid rgba(145,70,255,0.3);white-space:nowrap;max-width:60px;overflow:hidden;text-overflow:ellipsis;display:inline-block">' + esc(t) + '</span>';
      }).join(' ');
      if ((g.tags||[]).length > 2) tagHtml += '<span style="font-size:9px;opacity:0.4">+' + ((g.tags||[]).length - 2) + '</span>';

      var hClr = (g.health||0) >= 80 ? '#2ecc71' : (g.health||0) >= 50 ? '#f39c12' : '#e74c3c';
      var healthBar = '<div style="display:flex;align-items:center;gap:3px" title="Health: ' + (g.health||0) + '/100"><div style="width:30px;height:6px;background:rgba(255,255,255,0.1);border-radius:3px;overflow:hidden"><div style="width:' + (g.health||0) + '%;height:100%;background:' + hClr + ';border-radius:3px"></div></div><span style="font-size:9px;color:' + hClr + '">' + (g.health||0) + '</span></div>';

      var daysInfo = g.daysSinceIndex !== undefined ? '<span style="font-size:9px;opacity:0.4;margin-left:2px">(' + g.daysSinceIndex + 'd)</span>' : '';
      var readInfo = g.readingTime ? '<span style="font-size:9px;opacity:0.4">' + g.readingTime + 'min</span>' : '';

      return '<tr class="gi-row-hover" style="border-bottom:1px solid rgba(255,255,255,0.05)">' +
        '<td style="padding:6px 4px;text-align:center"><input type="checkbox" class="gi-guide-cb" value="' + g.id + '"></td>' +
        '<td style="padding:6px 4px;font-weight:600;color:#e0e0e0;max-width:180px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(g.title) + '">' + esc(g.title) + '</td>' +
        '<td style="text-align:center">' + healthBar + '</td>' +
        '<td style="color:#9b59b6;font-weight:600;text-align:center">' + g.sections + '</td>' +
        '<td style="color:#f39c12;font-weight:600;text-align:center">' + g.values + '</td>' +
        '<td style="color:#e67e22;font-weight:600;text-align:center">' + (g.gameTerms||0) + '</td>' +
        '<td style="color:#3498db;text-align:center">' + (g.images||0) + '</td>' +
        '<td style="text-align:center;font-size:11px;opacity:0.7">' + (g.wordCount||0).toLocaleString() + ' ' + readInfo + '</td>' +
        '<td style="max-width:100px;overflow:hidden">' + tagHtml + '</td>' +
        '<td style="opacity:0.5;font-size:10px;white-space:nowrap">' + new Date(g.lastIndexed).toLocaleDateString() + daysInfo + '</td>' +
        '<td style="white-space:nowrap">' +
        '<button onclick="guideIndexerEdit(&#39;' + g.id + '&#39;)" style="background:#3498db22;color:#3498db;border:1px solid #3498db44;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:10px;margin-right:2px" title="Edit">✏️</button>' +
        '<button onclick="guideIndexerReindex(&#39;' + g.id + '&#39;)" style="background:#2ecc7122;color:#2ecc71;border:1px solid #2ecc7144;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:10px;margin-right:2px" title="Re-index from Discord">🔄</button>' +
        '<a href="' + API + '/guide/' + g.id + '/export" target="_blank" style="background:#1b9aaa22;color:#1b9aaa;border:1px solid #1b9aaa44;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:10px;text-decoration:none;display:inline-block;margin-right:2px" title="Export as Markdown">📥</a>' +
        '<button onclick="guideIndexerDeleteGuide(&#39;' + g.id + '&#39;)" style="background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;padding:2px 5px;border-radius:3px;cursor:pointer;font-size:10px" title="Delete">🗑</button></td></tr>';
    }).join('');

    // Pagination
    var pag = '';
    if (sorted.length > _giPerPage) {
      pag = '<div style="display:flex;align-items:center;justify-content:space-between;padding:8px 4px;font-size:12px;opacity:0.7">' +
        '<span>Showing ' + (_giPage * _giPerPage + 1) + '-' + Math.min((_giPage + 1) * _giPerPage, sorted.length) + ' of ' + sorted.length + '</span>' +
        '<div style="display:flex;gap:4px">' +
        '<button onclick="giPrev()"' + (_giPage <= 0 ? ' disabled' : '') + ' style="padding:3px 10px;border-radius:4px;border:1px solid rgba(255,255,255,' + (_giPage <= 0 ? '0.08' : '0.15') + ');background:' + (_giPage <= 0 ? 'transparent' : 'rgba(255,255,255,0.05)') + ';color:inherit;cursor:pointer;font-size:11px;opacity:' + (_giPage <= 0 ? '0.3' : '1') + '">← Prev</button>' +
        '<button onclick="giNext()"' + (_giPage >= totalPages - 1 ? ' disabled' : '') + ' style="padding:3px 10px;border-radius:4px;border:1px solid rgba(255,255,255,' + (_giPage >= totalPages - 1 ? '0.08' : '0.15') + ');background:' + (_giPage >= totalPages - 1 ? 'transparent' : 'rgba(255,255,255,0.05)') + ';color:inherit;cursor:pointer;font-size:11px;opacity:' + (_giPage >= totalPages - 1 ? '0.3' : '1') + '">Next →</button>' +
        '</div></div>';
    }

    gl.innerHTML = '<div style="overflow-x:auto"><table style="width:100%;border-collapse:collapse;font-size:12px"><thead><tr style="text-align:left;opacity:0.6;border-bottom:2px solid rgba(145,70,255,0.2)">' + hdrCols + '</tr></thead><tbody>' + rows + '</tbody></table></div>' + pag;
  }

  window.giSort = function(col) {
    if (_giSortCol === col) { _giSortAsc = !_giSortAsc; }
    else { _giSortCol = col; _giSortAsc = false; }
    _giPage = 0;
    renderGuidesTable(_giFiltered.length > 0 ? _giFiltered : _allGuides);
  };
  window.giPrev = function() { if (_giPage > 0) { _giPage--; renderGuidesTable(_giFiltered.length > 0 ? _giFiltered : _allGuides); } };
  window.giNext = function() { _giPage++; renderGuidesTable(_giFiltered.length > 0 ? _giFiltered : _allGuides); };

  window.guideIndexerFilter = function() {
    var q = (document.getElementById('gi-search').value || '').toLowerCase().trim();
    var tagF = (document.getElementById('gi-tag-filter').value || '').toLowerCase();
    var healthF = document.getElementById('gi-health-filter').value;
    _giPage = 0;
    if (!q && !tagF && !healthF) { _giFiltered = []; renderGuidesTable(_allGuides); return; }
    _giFiltered = _allGuides.filter(function(g) {
      if (q && g.title.toLowerCase().indexOf(q) === -1 && !(g.tags || []).some(function(t) { return t.toLowerCase().indexOf(q) !== -1; }) && (g.authorTag || '').toLowerCase().indexOf(q) === -1) return false;
      if (tagF && !(g.tags || []).some(function(t) { return t.toLowerCase() === tagF; })) return false;
      if (healthF === 'good' && (g.health || 0) < 80) return false;
      if (healthF === 'fair' && ((g.health || 0) < 50 || (g.health || 0) >= 80)) return false;
      if (healthF === 'poor' && (g.health || 0) >= 50) return false;
      return true;
    });
    renderGuidesTable(_giFiltered);
  };

  window.giSelectAll = function(checked) {
    document.querySelectorAll('.gi-guide-cb').forEach(function(cb) { cb.checked = checked; });
  };

  window.guideBulkDelete = async function() {
    var selected = [];
    document.querySelectorAll('.gi-guide-cb:checked').forEach(function(cb) { selected.push(cb.value); });
    if (selected.length === 0) return showToast('No guides selected', 'error');
    if (!confirm('Delete ' + selected.length + ' selected guide(s)?')) return;
    try {
      var r = await fetch(API + '/guides/bulk-delete', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ ids: selected }) });
      var d = await r.json();
      if (d.success) { showToast('Deleted ' + d.deleted + ' guide(s)', 'success'); load(); }
      else showToast(d.error || 'Failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  window.guideIndexerReindex = async function(id) {
    try {
      showToast('Re-indexing...', 'info');
      var r = await fetch(API + '/guide/' + id + '/reindex', { method: 'POST', headers: {'Content-Type':'application/json'} });
      var d = await r.json();
      if (d.success) { showToast('Re-indexed: ' + d.guide.title + ' (' + d.guide.sections + ' sections, ' + d.guide.values + ' values)', 'success'); load(); }
      else showToast(d.error || 'Failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  // Populate tag filter dropdown
  function populateTagFilter(guides) {
    var tags = new Set();
    guides.forEach(function(g) { (g.tags || []).forEach(function(t) { tags.add(t); }); });
    var sel = document.getElementById('gi-tag-filter');
    var val = sel.value;
    sel.innerHTML = '<option value="">All tags</option>' + [...tags].sort().map(function(t) {
      return '<option value="' + esc(t).toLowerCase() + '"' + (val === t.toLowerCase() ? ' selected' : '') + '>' + esc(t) + '</option>';
    }).join('');
  }

  async function load() {
    try {
      const r = await fetch(API);
      const d = await r.json();
      if (!d.success) return;

      document.getElementById('gi-stat-guides').textContent = d.stats.totalGuides;
      document.getElementById('gi-stat-analyses').textContent = d.stats.totalAnalyses;
      document.getElementById('gi-stat-scan').textContent = d.config.lastScanAt ? new Date(d.config.lastScanAt).toLocaleString() : 'Never';
      document.getElementById('gi-stat-bump').textContent = d.config.lastBumpAt ? new Date(d.config.lastBumpAt).toLocaleString() : 'Never';

      // Load IdleOn terms count
      try {
        const ir = await fetch(API + '/idleon-data');
        const id = await ir.json();
        if (id.success) {
          document.getElementById('gi-stat-idleon').textContent = id.termCount || 0;
          document.getElementById('gi-idleon-fetched-at').textContent = id.fetchedAt ? 'Last fetched: ' + new Date(id.fetchedAt).toLocaleString() : 'Not fetched yet';
          // Stats row
          document.getElementById('gi-idleon-stats').innerHTML =
            '<span style="background:#e67e2222;color:#e67e22;padding:2px 8px;border-radius:8px">' + id.termCount + ' terms</span>' +
            '<span style="background:#9b59b622;color:#9b59b6;padding:2px 8px;border-radius:8px">' + id.staticCount + ' static</span>' +
            '<span style="background:#2ecc7122;color:#2ecc71;padding:2px 8px;border-radius:8px">' + (id.sources || []).length + ' sources</span>' +
            (id.errors && id.errors.length ? '<span style="background:#e74c3c22;color:#e74c3c;padding:2px 8px;border-radius:8px">' + id.errors.length + ' errors</span>' : '') +
            '<span style="background:#1b9aaa22;color:#1b9aaa;padding:2px 8px;border-radius:8px">' + id.unusedCount + ' unused</span>';
          // Categories
          var CAT_CLR = {Classes:'#9b59b6',Skills:'#2ecc71',Collectibles:'#f39c12',Talents:'#3498db',World:'#e74c3c',Items:'#1b9aaa',Alchemy:'#e67e22',Other:'#666'};
          document.getElementById('gi-idleon-categories').innerHTML = Object.entries(id.categories || {}).map(function(e) {
            return '<span style="padding:2px 8px;border-radius:8px;font-size:11px;background:' + (CAT_CLR[e[0]]||'#666') + '22;color:' + (CAT_CLR[e[0]]||'#aaa') + ';border:1px solid ' + (CAT_CLR[e[0]]||'#666') + '33">' + e[0] + ': ' + e[1] + '</span>';
          }).join('');
          // Most used
          document.getElementById('gi-idleon-most-used').innerHTML = (id.mostUsed || []).slice(0, 12).map(function(e) {
            return '<span style="padding:2px 8px;border-radius:8px;font-size:11px;background:#f5a62322;color:#f5a623;border:1px solid #f5a62333" title="Used in ' + e[1] + ' guides">' + esc(e[0]) + ' <small style="opacity:0.6">(' + e[1] + ')</small></span>';
          }).join('');
          // Terms preview
          document.getElementById('gi-idleon-terms-list').innerHTML = (id.terms || []).slice(0, 100).map(function(t) {
            return '<span style="display:inline-block;padding:2px 6px;margin:2px;border-radius:4px;background:rgba(255,255,255,0.06);font-size:11px">' + esc(t) + '</span>';
          }).join('');
        }
      } catch(e) { document.getElementById('gi-stat-idleon').textContent = '0'; }

      // Load Steam patches count
      try {
        const sr = await fetch(API + '/steam-patches');
        const sd = await sr.json();
        if (sd.success) {
          document.getElementById('gi-stat-steam').textContent = (sd.patches || []).length;
          document.getElementById('gi-steam-last-fetch').textContent = sd.lastFetchedAt ? '(fetched ' + new Date(sd.lastFetchedAt).toLocaleString() + ')' : '';
          renderSteamPatches(sd.patches || [], sd.stats || null);
        }
      } catch(e) { document.getElementById('gi-stat-steam').textContent = '0'; }
      document.getElementById('gi-channels').value = (d.config.forumChannelIds || []).join(', ');
      document.getElementById('gi-autoscan').value = d.config.autoScanInterval || 0;
      document.getElementById('gi-autobump-hours').value = d.config.autoBumpIntervalHours || 23;
      document.getElementById('gi-autobump-on').checked = !!d.config.autoBumpEnabled;
      document.getElementById('gi-bump-stagger').value = d.config.bumpStaggerMs || 2000;
      document.getElementById('gi-bump-skip-recent').value = d.config.bumpSkipRecentHours || 2;
      document.getElementById('gi-bump-msg-on').checked = !!d.config.bumpMessageEnabled;
      document.getElementById('gi-bump-msg').value = d.config.bumpMessage || '';
      document.getElementById('gi-autonotify-on').checked = d.config.autoNotifyEnabled !== false;
      document.getElementById('gi-notify-channel').value = d.config.notifyChannelId || '';
      document.getElementById('gi-notify-cooldown').value = d.config.notifyCooldownHours || 12;
      document.getElementById('gi-notify-digest').checked = !!d.config.notifyDigestMode;
      document.getElementById('gi-notify-dm-authors').checked = !!d.config.notifyDmAuthors;

      // Load notification history
      try {
        const nhr = await fetch(API + '/notification-history');
        const nhd = await nhr.json();
        if (nhd.success && nhd.history.length > 0) {
          document.getElementById('gi-notify-history-count').textContent = nhd.total + ' total';
          document.getElementById('gi-notify-history').innerHTML = nhd.history.slice(0, 50).map(function(h) {
            var sevClr = h.severity === 'CRITICAL' ? '#e74c3c' : h.severity === 'WARNING' ? '#f5a623' : '#1b9aaa';
            return '<div style="display:flex;align-items:center;gap:8px;padding:6px 10px;border-bottom:1px solid rgba(255,255,255,0.04);font-size:12px">' +
              '<span style="color:' + sevClr + ';font-weight:600;width:70px;text-transform:uppercase;font-size:10px">' + (h.severity||'INFO') + '</span>' +
              '<span style="flex:1;color:#e0e0e0;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap" title="' + esc(h.guideTitle||'') + '">' + esc(h.guideTitle||h.threadId||'?') + '</span>' +
              '<span style="opacity:0.5;flex-shrink:0">' + (h.matchedTerms||0) + ' terms</span>' +
              '<span style="opacity:0.5;flex-shrink:0">' + (h.status||'sent') + '</span>' +
              '<span style="opacity:0.4;flex-shrink:0;width:140px;text-align:right">' + new Date(h.date).toLocaleString() + '</span>' +
            '</div>';
          }).join('');
        }
      } catch(e) { /* notification history optional */ }

      // Guides table
      _allGuides = d.guides;
      populateTagFilter(d.guides);
      if (d.guides.length === 0) { document.getElementById('gi-guides-list').innerHTML = '<em style="padding:12px;display:block;color:#8b8fa3">No guides indexed yet. Configure a forum channel and click Scan.</em>'; }
      else { renderGuidesTable(d.guides); }

      // Analyses list
      const al = document.getElementById('gi-analyses-list');
      if (d.analyses.length === 0) { al.innerHTML = '<em style="color:#8b8fa3;padding:12px;display:block">No analyses yet. Paste patch notes to analyze.</em>'; }
      else {
      al.innerHTML = d.analyses.map(a => {
          var sevBadges = '';
          if (a.impactBreakdown) {
            var sevClr = { CRITICAL: '#e74c3c', HIGH: '#e67e22', MEDIUM: '#f39c12', LOW: '#2ecc71' };
            for (var sev in a.impactBreakdown) {
              sevBadges += '<span style="font-size:9px;padding:1px 5px;border-radius:8px;background:' + sevClr[sev] + '22;color:' + sevClr[sev] + ';border:1px solid ' + sevClr[sev] + '33;margin-left:3px">' + sev + ':' + a.impactBreakdown[sev] + '</span>';
            }
          }
          var statsInfo = a.stats ? '<span style="font-size:10px;opacity:0.45;margin-left:6px">' + (a.stats.elapsedMs ? a.stats.elapsedMs + 'ms' : '') + (a.stats.guidesRelevant ? ' | ' + a.stats.guidesRelevant + '/' + a.stats.guidesScanned + ' guides' : '') + '</span>' : '';
          var verBadge = (a.version || 1) > 1 ? '<span style="font-size:9px;padding:1px 5px;border-radius:8px;background:#3498db22;color:#3498db;margin-left:3px">v' + a.version + '</span>' : '';
          return '<div class="gi-analysis-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);border-radius:6px;transition:background .15s">' +
          '<div><strong style="color:#e0e0e0">' + esc(a.patchTitle) + '</strong>' + verBadge + '<span style="opacity:0.65;font-size:11px;margin-left:8px">' + new Date(a.date).toLocaleString() + '</span>' + statsInfo + '<div style="margin-top:2px">' + sevBadges + '</div></div>' +
          '<div style="display:flex;align-items:center;gap:6px"><span style="font-size:12px;padding:2px 8px;background:' + (a.guidesAffected > 0 ? '#f39c1222' : '#2ecc7122') + ';color:' + (a.guidesAffected > 0 ? '#f39c12' : '#2ecc71') + ';border-radius:10px;font-weight:600">' + a.guidesAffected + ' guide(s)</span>' +
          '<button class="btn btn-xs" onclick="guideIndexerViewAnalysis(&#39;'+a.id+'&#39;)" style="background:#9b59b622;color:#9b59b6;border:1px solid #9b59b644;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px">📊 View</button>' +
          '<button class="btn btn-xs" onclick="guideIndexerReanalyze(&#39;'+a.id+'&#39;)" style="background:#e67e2222;color:#e67e22;border:1px solid #e67e2244;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px" title="Re-analyze">🔄</button>' +
          '<a href="' + API + '/analysis/' + a.id + '/export" target="_blank" style="background:#1b9aaa22;color:#1b9aaa;border:1px solid #1b9aaa44;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px;text-decoration:none;display:inline-block" title="Export as Markdown">📥</a>' +
          '<button class="btn btn-xs" onclick="guideIndexerDeleteAnalysis(&#39;'+a.id+'&#39;)" style="background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;padding:3px 8px;border-radius:4px;cursor:pointer;font-size:11px" title="Delete">🗑</button></div></div>';
        }).join('');
      }
    } catch(e) { console.error('Guide indexer load error:', e); }
  }

  function esc(s) { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }

  window.guideIndexerScan = async function() {
    const btn = document.getElementById('gi-scan-btn');
    btn.disabled = true; btn.textContent = '⏳ Scanning...';
    try {
      const r = await fetch(API + '/scan', { method: 'POST', headers: {'Content-Type':'application/json'} });
      const d = await r.json();
      if (d.success) { showToast('Indexed ' + d.indexed + ' guides from ' + d.total + ' threads', 'success'); load(); }
      else showToast(d.error || 'Scan failed', 'error');
    } catch(e) { showToast('Scan error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '🔄 Scan Guides';
  };

  window.guideIndexerBump = async function() {
    const btn = document.getElementById('gi-bump-btn');
    btn.disabled = true; btn.textContent = '⏳ Bumping...';
    try {
      const r = await fetch(API + '/bump', { method: 'POST', headers: {'Content-Type':'application/json'} });
      const d = await r.json();
      if (d.success) {
        var msg = 'Bumped ' + d.bumped + '/' + d.total + ' threads';
        if (d.skipped) msg += ' (' + d.skipped + ' skipped - recently active)';
        if (d.failed) msg += ' (' + d.failed + ' failed)';
        showToast(msg, 'success');
        load();
      }
      else showToast(d.error || 'Bump failed', 'error');
    } catch(e) { showToast('Bump error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '📌 Bump All Threads';
  };

  window.guideIndexerFetchIdleon = async function() {
    const btn = document.getElementById('gi-idleon-btn');
    btn.disabled = true; btn.textContent = '⏳ Fetching...';
    try {
      const r = await fetch(API + '/fetch-idleon-data', { method: 'POST', headers: {'Content-Type':'application/json'} });
      const d = await r.json();
      if (d.success) {
        showToast('Fetched ' + d.termCount + ' IdleOn terms from ' + d.sources.length + ' sources' + (d.errors.length ? ' (' + d.errors.length + ' errors)' : ''), 'success');
        document.getElementById('gi-stat-idleon').textContent = d.termCount;
        load(); // Refresh to show updated data
      } else showToast(d.error || 'Fetch failed', 'error');
    } catch(e) { showToast('Fetch error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '🎮 Fetch IdleOn Data';
  };

  var _idleonSearchTimer = null;
  window.guideIndexerSearchIdleon = function() {
    clearTimeout(_idleonSearchTimer);
    _idleonSearchTimer = setTimeout(async function() {
      var q = document.getElementById('gi-idleon-search').value.trim();
      if (!q) { load(); return; }
      try {
        var r = await fetch(API + '/idleon-data?q=' + encodeURIComponent(q));
        var d = await r.json();
        if (d.success) {
          document.getElementById('gi-idleon-terms-list').innerHTML =
            '<div style="margin-bottom:6px;font-size:11px;opacity:0.6">' + d.totalFiltered + ' matching terms</div>' +
            (d.terms || []).slice(0, 200).map(function(t) {
              return '<span style="display:inline-block;padding:2px 6px;margin:2px;border-radius:4px;background:rgba(255,255,255,0.08);font-size:11px;border:1px solid #f5a62333">' + esc(t) + '</span>';
            }).join('');
        }
      } catch(e) { /* ignore search errors */ }
    }, 300);
  };

  window.guideIndexerSaveConfig = async function() {
    const channels = document.getElementById('gi-channels').value.split(',').map(s => s.trim()).filter(Boolean);
    const autoScan = parseInt(document.getElementById('gi-autoscan').value) || 0;
    const autoBumpOn = document.getElementById('gi-autobump-on').checked;
    const autoBumpHrs = parseInt(document.getElementById('gi-autobump-hours').value) || 23;
    const autoNotifyOn = document.getElementById('gi-autonotify-on').checked;
    const notifyChannelId = document.getElementById('gi-notify-channel').value.trim() || null;
    const notifyCooldownHours = parseInt(document.getElementById('gi-notify-cooldown').value) || 12;
    const notifyDigestMode = document.getElementById('gi-notify-digest').checked;
    const notifyDmAuthors = document.getElementById('gi-notify-dm-authors').checked;
    try {
      // Save main config
      var r1 = await fetch(API + '/config', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ enabled: true, forumChannelIds: channels, autoScanInterval: autoScan, autoNotifyEnabled: autoNotifyOn,
          notifyChannelId: notifyChannelId, notifyCooldownHours: notifyCooldownHours, notifyDigestMode: notifyDigestMode, notifyDmAuthors: notifyDmAuthors }) });
      var d1 = await r1.json();
      if (!d1.success) { showToast('Config save failed: ' + (d1.error || r1.status), 'error'); return; }
      // Save bump config
      var bumpStagger = parseInt(document.getElementById('gi-bump-stagger').value) || 2000;
      var bumpSkipRecent = parseInt(document.getElementById('gi-bump-skip-recent').value) || 2;
      var bumpMsgOn = document.getElementById('gi-bump-msg-on').checked;
      var bumpMsg = document.getElementById('gi-bump-msg').value.trim();
      var r2 = await fetch(API + '/bump-config', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ autoBumpEnabled: autoBumpOn, autoBumpIntervalHours: autoBumpHrs,
          bumpStaggerMs: bumpStagger, bumpSkipRecentHours: bumpSkipRecent, bumpMessageEnabled: bumpMsgOn, bumpMessage: bumpMsg }) });
      var d2 = await r2.json();
      if (!d2.success) { showToast('Bump config save failed: ' + (d2.error || r2.status), 'error'); return; }
      showToast('Config saved', 'success');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  window.guideIndexerEdit = async function(id) {
    _editGuideId = id;
    document.getElementById('gi-editor-sections').innerHTML = '<em>Loading...</em>';
    document.getElementById('gi-editor-modal').style.display = 'flex';
    try {
      const r = await fetch(API + '/guide/' + id);
      const d = await r.json();
      if (!d.success) { document.getElementById('gi-editor-sections').innerHTML = '<em>Not found</em>'; return; }
      const g = d.guide;
      document.getElementById('gi-editor-title').textContent = '✏️ ' + g.title;
      document.getElementById('gi-editor-meta').textContent = 'Thread: ' + g.threadId + ' | Author: ' + (g.authorTag||'?') + ' | Messages: ' + g.messageCount + (g.lastEdited ? ' | Last edited: ' + new Date(g.lastEdited).toLocaleString() : '');

      // Images gallery
      const imgDiv = document.getElementById('gi-editor-images');
      if (g.images && g.images.length > 0) {
        imgDiv.innerHTML = '<div style="font-size:12px;opacity:0.7;margin-bottom:6px">📷 ' + g.images.length + ' image(s) saved locally</div>' +
          '<div style="display:flex;flex-wrap:wrap;gap:8px">' +
          g.images.map(img => '<div style="position:relative"><img src="' + esc(img.local) + '" style="width:120px;height:80px;object-fit:cover;border-radius:6px;border:1px solid rgba(255,255,255,0.1)" title="' + esc(img.name) + '"></div>').join('') +
          '</div>';
      } else {
        imgDiv.innerHTML = '<div style="font-size:12px;opacity:0.5">No images found in this guide</div>';
      }

      // Section editor
      const sectDiv = document.getElementById('gi-editor-sections');
      sectDiv.innerHTML = g.sections.map((s, i) =>
        '<div style="margin-bottom:14px;background:rgba(255,255,255,0.02);border-radius:8px;padding:12px">' +
        '<input type="text" class="input gi-section-heading" value="' + esc(s.heading).replace(/"/g, '&quot;') + '" style="width:100%;font-weight:600;margin-bottom:6px" placeholder="Section heading">' +
        '<textarea class="input gi-section-content" rows="6" style="width:100%;resize:vertical;font-family:monospace;font-size:12px" placeholder="Section content...">' + esc(s.content) + '</textarea>' +
        '</div>'
      ).join('') +
      '<button class="btn btn-xs" onclick="guideEditorAddSection()" style="margin-top:4px">+ Add Section</button>';
    } catch(e) { document.getElementById('gi-editor-sections').innerHTML = '<em>Error: ' + e.message + '</em>'; }
  };

  window.guideEditorAddSection = function() {
    const container = document.getElementById('gi-editor-sections');
    const btn = container.querySelector('button:last-child');
    const block = document.createElement('div');
    block.style.cssText = 'margin-bottom:14px;background:rgba(255,255,255,0.02);border-radius:8px;padding:12px';
    block.innerHTML = '<input type="text" class="input gi-section-heading" value="" style="width:100%;font-weight:600;margin-bottom:6px" placeholder="Section heading">' +
      '<textarea class="input gi-section-content" rows="6" style="width:100%;resize:vertical;font-family:monospace;font-size:12px" placeholder="Section content..."></textarea>';
    container.insertBefore(block, btn);
  };

  function collectEditorSections() {
    const headings = document.querySelectorAll('.gi-section-heading');
    const contents = document.querySelectorAll('.gi-section-content');
    const sections = [];
    for (let i = 0; i < headings.length; i++) {
      const h = headings[i].value.trim();
      const c = contents[i].value.trim();
      if (h || c) sections.push({ heading: h || 'Untitled', content: c });
    }
    return sections;
  }

  window.guideEditorSave = async function() {
    if (!_editGuideId) return;
    const btn = document.getElementById('gi-editor-save-btn');
    btn.disabled = true; btn.textContent = '⏳ Saving...';
    try {
      const sections = collectEditorSections();
      const r = await fetch(API + '/guide/' + _editGuideId + '/update', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sections })
      });
      const d = await r.json();
      if (d.success) { showToast('Guide saved', 'success'); load(); }
      else showToast(d.error || 'Save failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '💾 Save';
  };

  window.guideEditorRepost = async function() {
    if (!_editGuideId) return;
    if (!confirm('This will delete the old messages in the thread and re-post the updated content with images. Continue?')) return;
    const btn = document.getElementById('gi-editor-repost-btn');
    btn.disabled = true; btn.textContent = '⏳ Re-posting...';
    try {
      // Save first
      const sections = collectEditorSections();
      await fetch(API + '/guide/' + _editGuideId + '/update', {
        method: 'POST', headers: {'Content-Type': 'application/json'},
        body: JSON.stringify({ sections })
      });
      // Then repost
      const r = await fetch(API + '/guide/' + _editGuideId + '/repost', {
        method: 'POST', headers: {'Content-Type': 'application/json'}
      });
      const d = await r.json();
      if (d.success) {
        showToast('Guide re-posted: ' + d.messagesSent + ' message(s), ' + d.imagesSent + ' image(s)', 'success');
        document.getElementById('gi-editor-modal').style.display = 'none';
        load();
      } else showToast(d.error || 'Re-post failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '📤 Save & Re-post to Discord';
  };

  window.guideIndexerAnalyze = async function() {
    const title = document.getElementById('gi-patch-title').value.trim();
    const text = document.getElementById('gi-patch-text').value.trim();
    if (!text) return showToast('Please paste patch notes', 'error');
    const btn = document.getElementById('gi-analyze-btn');
    btn.disabled = true; btn.textContent = '⏳ Analyzing...';
    try {
      const r = await fetch(API + '/analyze', { method: 'POST', headers: {'Content-Type':'application/json'},
        body: JSON.stringify({ patchTitle: title || 'Untitled', patchText: text }) });
      const d = await r.json();
      if (d.success) {
        showToast(d.analysis.guidesAffected + ' guide(s) affected', 'success');
        document.getElementById('gi-patch-modal').style.display = 'none';
        renderAnalysisDetail(d.analysis);
        load();
      } else showToast(d.error || 'Analysis failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '🔍 Analyze';
  };

  window.guideIndexerViewAnalysis = async function(id) {
    document.getElementById('gi-analysis-detail').innerHTML = '<em>Loading...</em>';
    document.getElementById('gi-analysis-modal').style.display = 'flex';
    try {
      const r = await fetch(API + '/analysis/' + id);
      const d = await r.json();
      if (d.success) renderAnalysisDetail(d.analysis);
      else document.getElementById('gi-analysis-detail').innerHTML = '<em>Not found</em>';
    } catch(e) { document.getElementById('gi-analysis-detail').innerHTML = '<em>Error loading</em>'; }
  };

  function renderAnalysisDetail(a) {
    const icons = { CERTAIN: '🔴', PROBABLE: '🟡', POSSIBLE: '🟠' };
    const sevIcons = { CRITICAL: '🚨', HIGH: '🔴', MEDIUM: '🟡', LOW: '🟢' };
    const sevClr = { CRITICAL: '#e74c3c', HIGH: '#e67e22', MEDIUM: '#f39c12', LOW: '#2ecc71' };
    let html = '<h3 style="margin:0 0 8px">📋 ' + esc(a.patchTitle) + '</h3>';
    html += '<div style="font-size:12px;opacity:0.5;margin-bottom:8px">' + new Date(a.date).toLocaleString() + ' — ' + a.guidesAffected + ' guide(s) affected';
    if (a.version > 1) html += ' — <span style="color:#3498db">v' + a.version + '</span>';
    html += '</div>';

    // Stats bar
    if (a.stats) {
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:12px">';
      html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(155,89,182,0.1);border:1px solid rgba(155,89,182,0.2)">' + a.stats.totalChanges + ' changes</span>';
      html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(230,126,34,0.1);border:1px solid rgba(230,126,34,0.2)">' + a.stats.uniqueTerms + ' terms</span>';
      html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(52,152,219,0.1);border:1px solid rgba(52,152,219,0.2)">' + a.stats.guidesRelevant + '/' + a.stats.guidesScanned + ' guides</span>';
      html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.2)">' + a.stats.elapsedMs + 'ms</span>';
      html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(149,165,166,0.1);border:1px solid rgba(149,165,166,0.2)">' + a.stats.aiModel + '</span>';
      html += '</div>';
    }

    if (!a.results || a.results.length === 0) {
      html += '<p>✅ No guides need updating.</p>';
    } else {
      for (const r of a.results) {
        if (!r.changes?.length) continue;
        const sev = r.impactSeverity || 'LOW';
        html += '<div style="background:rgba(255,255,255,0.03);border-radius:8px;padding:12px;margin-bottom:12px;border-left:3px solid ' + (sevClr[sev] || '#666') + '">';
        html += '<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px;flex-wrap:wrap"><span style="font-size:18px">' + (icons[r.confidence]||'⚪') + '</span>';
        html += '<strong>' + esc(r.guideTitle) + '</strong>';
        html += '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:rgba(145,70,255,0.2)">' + r.confidence + '</span>';
        html += '<span style="font-size:11px;padding:2px 8px;border-radius:4px;background:' + (sevClr[sev] || '#666') + '22;color:' + (sevClr[sev] || '#aaa') + ';border:1px solid ' + (sevClr[sev] || '#666') + '33">' + (sevIcons[sev] || '') + ' ' + sev + '</span>';
        if (r.overlapTerms) html += '<span style="font-size:10px;opacity:0.5">' + r.overlapTerms + ' term overlap (score: ' + r.overlapScore + ')</span>';
        html += '</div>';
        for (const c of r.changes) {
          html += '<div style="padding:4px 0 4px 28px;font-size:13px;border-bottom:1px solid rgba(255,255,255,0.04)">';
          html += '<strong>' + esc(c.section) + '</strong> → ' + esc(c.item);
          if (c.oldValue && c.newValue) html += ' <code style="font-size:11px">' + esc(c.oldValue) + '</code> → <code style="font-size:11px">' + esc(c.newValue) + '</code>';
          if (c.note) html += '<div style="font-size:11px;opacity:0.6;font-style:italic;margin-top:2px">' + esc(c.note) + '</div>';
          html += '</div>';
        }
        html += '</div>';
      }
    }

    // Action buttons
    html += '<div style="display:flex;gap:8px;margin-top:12px;justify-content:flex-end">';
    html += '<button class="btn btn-xs" onclick="guideIndexerReanalyze(&#39;' + a.id + '&#39;)" style="background:#e67e2222;color:#e67e22;border:1px solid #e67e2244;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">🔄 Re-analyze</button>';
    html += '<a href="' + API + '/analysis/' + a.id + '/export" target="_blank" style="background:#1b9aaa22;color:#1b9aaa;border:1px solid #1b9aaa44;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px;text-decoration:none;display:inline-block">📥 Export MD</a>';
    html += '<button class="btn btn-xs" onclick="guideIndexerDeleteAnalysis(&#39;' + a.id + '&#39;)" style="background:#e74c3c22;color:#e74c3c;border:1px solid #e74c3c44;padding:4px 12px;border-radius:4px;cursor:pointer;font-size:11px">🗑 Delete</button>';
    html += '</div>';

    document.getElementById('gi-analysis-detail').innerHTML = html;
    document.getElementById('gi-analysis-modal').style.display = 'flex';
  }

  window.guideIndexerDeleteGuide = async function(id) {
    if (!confirm('Remove this guide from the index?')) return;
    try {
      const r = await fetch(API + '/guide/' + id, { method: 'DELETE' });
      const d = await r.json();
      if (d.success) { showToast('Guide removed', 'success'); load(); }
      else showToast(d.error || 'Failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  window.guideIndexerReanalyze = async function(id) {
    if (!confirm('Re-run AI analysis on this patch?')) return;
    try {
      showToast('Re-analyzing...', 'info');
      var r = await fetch(API + '/analysis/' + id + '/reanalyze', { method: 'POST', headers: {'Content-Type':'application/json'} });
      var d = await r.json();
      if (d.success) { showToast('Re-analysis complete: ' + d.analysis.guidesAffected + ' guide(s) affected (v' + d.analysis.version + ')', 'success'); renderAnalysisDetail(d.analysis); load(); }
      else showToast(d.error || 'Re-analysis failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  window.guideIndexerDeleteAnalysis = async function(id) {
    if (!confirm('Delete this analysis permanently?')) return;
    try {
      var r = await fetch(API + '/analysis/' + id, { method: 'DELETE' });
      var d = await r.json();
      if (d.success) { showToast('Analysis deleted', 'success'); document.getElementById('gi-analysis-modal').style.display = 'none'; load(); }
      else showToast(d.error || 'Failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  // ══════════════════════ STEAM PATCH NOTES UI ══════════════════════

  let _steamPatches = [];
  let _viewingPatchGid = null;
  let _steamPage = 0;
  let _steamPerPage = 15;
  let _steamFiltered = [];

  const TYPE_ICONS = { fix: '🔧', added: '✨', nerf: '📉', buff: '📈', change: '🔄', ui: '🖥️', info: 'ℹ️' };
  const TYPE_CLR = { fix: '#2ecc71', added: '#3498db', nerf: '#e74c3c', buff: '#f39c12', change: '#9b59b6', ui: '#1abc9c', info: '#95a5a6' };
  const CAT_CLR = { major: '#e74c3c', minor: '#f39c12', hotfix: '#2ecc71', micro: '#95a5a6' };
  const SIZE_CLR = { large: '#e74c3c', medium: '#f39c12', small: '#2ecc71' };

  window.filterSteamPatches = function() {
    var q = (document.getElementById('gi-steam-search').value || '').toLowerCase().trim();
    var typeF = document.getElementById('gi-steam-type-filter').value;
    var analyzedF = document.getElementById('gi-steam-analyzed-filter').value;
    _steamPage = 0;
    _steamFiltered = _steamPatches.filter(function(p) {
      if (q && p.title.toLowerCase().indexOf(q) === -1 && !(p.parsed && p.parsed.allTerms && p.parsed.allTerms.some(function(t){ return t.toLowerCase().indexOf(q) !== -1; }))) return false;
      if (typeF && (!p.parsed || !p.parsed.types || !p.parsed.types[typeF])) return false;
      if (analyzedF === 'analyzed' && !p.analyzedAt) return false;
      if (analyzedF === 'unanalyzed' && p.analyzedAt) return false;
      return true;
    });
    renderSteamPatchesList(_steamFiltered);
  };

  function renderSteamStats(stats) {
    if (!stats) return;
    var el = document.getElementById('gi-steam-stats');
    el.style.display = 'flex';
    var html = '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(27,154,170,0.1);border:1px solid rgba(27,154,170,0.2)">📦 ' + stats.total + ' total</span>';
    html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(46,204,113,0.1);border:1px solid rgba(46,204,113,0.2)">✓ ' + stats.analyzed + ' analyzed</span>';
    html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(243,156,18,0.1);border:1px solid rgba(243,156,18,0.2)">📢 ' + stats.notified + ' notified</span>';
    html += '<span style="font-size:11px;padding:3px 8px;border-radius:6px;background:rgba(149,165,166,0.1);border:1px solid rgba(149,165,166,0.2)">≈ ' + stats.avgChanges + ' avg changes</span>';
    for (var t in (stats.typeBreakdown || {})) {
      html += '<span style="font-size:10px;padding:2px 6px;border-radius:10px;background:' + (TYPE_CLR[t]||'#666') + '15;color:' + (TYPE_CLR[t]||'#aaa') + '">' + (TYPE_ICONS[t]||'') + ' ' + stats.typeBreakdown[t] + ' ' + t + '</span>';
    }
    el.innerHTML = html;
  }

  function renderSteamPatchesList(patches) {
    var el = document.getElementById('gi-steam-list');
    if (!patches.length) { el.innerHTML = '<em style="color:#8b8fa3;padding:12px;display:block">No patches match your filters.</em>'; document.getElementById('gi-steam-pag').style.display='none'; return; }

    var totalPages = Math.ceil(patches.length / _steamPerPage);
    if (_steamPage >= totalPages) _steamPage = totalPages - 1;
    if (_steamPage < 0) _steamPage = 0;
    var page = patches.slice(_steamPage * _steamPerPage, (_steamPage + 1) * _steamPerPage);

    el.innerHTML = '<div style="display:flex;flex-direction:column;gap:2px">' + page.map(function(p) {
      var types = p.parsed ? p.parsed.types || {} : {};
      var typeBadges = Object.entries(types).sort(function(a,b){return b[1]-a[1]}).slice(0,5).map(function(e) {
        return '<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:'+(TYPE_CLR[e[0]]||'#666')+'22;color:'+(TYPE_CLR[e[0]]||'#aaa')+';border:1px solid '+(TYPE_CLR[e[0]]||'#666')+'33">' + (TYPE_ICONS[e[0]]||'') + ' ' + e[1] + '</span>';
      }).join(' ');
      var termCount = p.parsed ? (p.parsed.allTerms || []).length : 0;
      var analyzed = p.analyzedAt ? '<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:#2ecc7122;color:#2ecc71;border:1px solid #2ecc7133">✓ analyzed</span>' : '';
      var notified = p.notifiedAt ? '<span style="font-size:10px;padding:1px 6px;border-radius:10px;background:#f5a62322;color:#f5a623;border:1px solid #f5a62333">📢 notified</span>' : '';
      var daysAgo = Math.floor((Date.now() - new Date(p.date).getTime()) / 86400000);
      var catBadge = p.category ? '<span style="font-size:9px;padding:1px 5px;border-radius:8px;background:' + (CAT_CLR[p.category]||'#666') + '22;color:' + (CAT_CLR[p.category]||'#aaa') + ';border:1px solid ' + (CAT_CLR[p.category]||'#666') + '33;text-transform:uppercase">' + p.category + '</span>' : '';
      var sizeBadge = p.sizeLabel ? '<span style="font-size:9px;padding:1px 5px;border-radius:8px;background:' + (SIZE_CLR[p.sizeLabel]||'#666') + '15;color:' + (SIZE_CLR[p.sizeLabel]||'#aaa') + '">' + p.sizeLabel + '</span>' : '';

      return '<div class="gi-steam-row" style="display:flex;align-items:center;justify-content:space-between;padding:10px 12px;border-bottom:1px solid rgba(255,255,255,0.05);border-radius:6px;transition:background .15s;gap:8px">' +
        '<div style="flex:1;min-width:0">' +
          '<div style="display:flex;align-items:center;gap:8px;flex-wrap:wrap">' +
            '<strong style="color:#e0e0e0;white-space:nowrap;overflow:hidden;text-overflow:ellipsis;max-width:300px">' + esc(p.title) + '</strong>' +
            catBadge + sizeBadge +
            '<span style="font-size:11px;opacity:0.55">' + daysAgo + 'd ago</span> ' + analyzed + ' ' + notified +
          '</div>' +
          '<div style="display:flex;gap:4px;margin-top:4px;flex-wrap:wrap">' + typeBadges +
            '<span style="font-size:10px;opacity:0.65">' + (p.parsed ? p.parsed.totalChanges : 0) + ' changes</span>' +
            '<span style="font-size:10px;opacity:0.55">' + termCount + ' terms</span>' +
            '<span style="font-size:10px;opacity:0.55">' + (p.charCount||0).toLocaleString() + ' chars</span>' +
          '</div>' +
        '</div>' +
        '<div style="display:flex;gap:6px;flex-shrink:0">' +
          '<button class="btn btn-xs" onclick="guideIndexerViewSteamPatch(&#39;' + p.gid + '&#39;)" style="background:#1b9aaa22;color:#1b9aaa;border:1px solid #1b9aaa44;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px">👁️ View</button>' +
          '<button class="btn btn-xs" onclick="guideIndexerAnalyzeSteamPatchDirect(&#39;' + p.gid + '&#39;)" style="background:#9b59b622;color:#9b59b6;border:1px solid #9b59b644;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px">🔍 Analyze</button>' +
          '<button class="btn btn-xs" onclick="guideIndexerNotifyPatch(&#39;' + p.gid + '&#39;)" style="background:#f5a62322;color:#f5a623;border:1px solid #f5a62344;padding:3px 10px;border-radius:4px;cursor:pointer;font-size:11px"' + (p.notifiedAt ? ' title="Last notified: ' + new Date(p.notifiedAt).toLocaleString() + '"' : '') + '>' + (p.notifiedAt ? '✅ Notified' : '📢 Notify') + '</button>' +
        '</div>' +
      '</div>';
    }).join('') + '</div>';

    // Pagination
    var pagEl = document.getElementById('gi-steam-pag');
    if (patches.length > _steamPerPage) {
      pagEl.style.display = 'flex';
      pagEl.innerHTML = '<div style="display:flex;align-items:center;justify-content:space-between;width:100%;font-size:12px;opacity:0.7">' +
        '<span>Showing ' + (_steamPage * _steamPerPage + 1) + '-' + Math.min((_steamPage + 1) * _steamPerPage, patches.length) + ' of ' + patches.length + '</span>' +
        '<div style="display:flex;gap:4px">' +
        '<button onclick="steamPrev()"' + (_steamPage <= 0 ? ' disabled' : '') + ' style="padding:3px 10px;border-radius:4px;border:1px solid rgba(255,255,255,' + (_steamPage <= 0 ? '0.08' : '0.15') + ');background:' + (_steamPage <= 0 ? 'transparent' : 'rgba(255,255,255,0.05)') + ';color:inherit;cursor:pointer;font-size:11px;opacity:' + (_steamPage <= 0 ? '0.3' : '1') + '">← Prev</button>' +
        '<button onclick="steamNext()"' + (_steamPage >= totalPages - 1 ? ' disabled' : '') + ' style="padding:3px 10px;border-radius:4px;border:1px solid rgba(255,255,255,' + (_steamPage >= totalPages - 1 ? '0.08' : '0.15') + ');background:' + (_steamPage >= totalPages - 1 ? 'transparent' : 'rgba(255,255,255,0.05)') + ';color:inherit;cursor:pointer;font-size:11px;opacity:' + (_steamPage >= totalPages - 1 ? '0.3' : '1') + '">Next →</button>' +
        '</div></div>';
    } else { pagEl.style.display = 'none'; }
  }

  function renderSteamPatches(patches, stats) {
    _steamPatches = patches;
    _steamFiltered = patches;
    if (stats) renderSteamStats(stats);
    _steamPage = 0;
    var el = document.getElementById('gi-steam-list');
    if (!patches.length) { el.innerHTML = '<em style="color:#8b8fa3;padding:12px;display:block">No patches loaded. Click "Fetch Steam Patches" to load from Steam API.</em>'; return; }
    document.getElementById('gi-steam-info').textContent = patches.length + ' patch notes loaded';
    renderSteamPatchesList(patches);
  }

  window.steamPrev = function() { if (_steamPage > 0) { _steamPage--; renderSteamPatchesList(_steamFiltered); } };
  window.steamNext = function() { _steamPage++; renderSteamPatchesList(_steamFiltered); };

  window.steamBatchAnalyze = async function() {
    var unanalyzed = _steamPatches.filter(function(p) { return !p.analyzedAt; });
    if (unanalyzed.length === 0) return showToast('All patches already analyzed', 'info');
    var count = Math.min(unanalyzed.length, 10);
    if (!confirm('Batch analyze ' + count + ' unanalyzed patches? (max 10 at once)')) return;
    var btn = document.getElementById('gi-steam-batch-btn');
    btn.disabled = true; btn.textContent = '⏳ Batch...';
    try {
      var gids = unanalyzed.slice(0, 10).map(function(p) { return p.gid; });
      var r = await fetch(API + '/batch-analyze', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ patchGids: gids }) });
      var d = await r.json();
      if (d.success) {
        var ok = d.results.filter(function(r) { return r.success; }).length;
        showToast('Batch analyzed ' + ok + '/' + gids.length + ' patches', 'success');
        load();
      } else showToast(d.error || 'Batch failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '🔍 Batch Analyze';
  };

  window.guideIndexerFetchSteam = async function() {
    var btn = document.getElementById('gi-steam-btn');
    btn.disabled = true; btn.textContent = '⏳ Fetching...';
    try {
      var r = await fetch(API + '/steam-patches/fetch', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ days: 365 }) });
      var d = await r.json();
      if (d.success) {
        showToast('Loaded ' + d.totalCount + ' patches (' + d.newCount + ' new)', 'success');
        document.getElementById('gi-stat-steam').textContent = d.totalCount;
        renderSteamPatches(d.patches || [], null);
        load();
      } else showToast(d.error || 'Fetch failed', 'error');
    } catch(e) { showToast('Steam fetch error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '🎮 Fetch Steam Patches';
  };

  window.guideIndexerViewSteamPatch = async function(gid) {
    _viewingPatchGid = gid;
    document.getElementById('gi-steam-detail-title').textContent = 'Loading...';
    document.getElementById('gi-steam-detail-meta').textContent = '';
    document.getElementById('gi-steam-detail-parsed').innerHTML = '';
    document.getElementById('gi-steam-detail-raw').textContent = '';
    document.getElementById('gi-steam-modal').style.display = 'flex';
    try {
      var r = await fetch(API + '/steam-patches/' + gid);
      var d = await r.json();
      if (!d.success) { document.getElementById('gi-steam-detail-title').textContent = 'Not found'; return; }
      var p = d.patch;
      document.getElementById('gi-steam-detail-title').textContent = '🎮 ' + p.title;
      document.getElementById('gi-steam-detail-meta').innerHTML = new Date(p.date).toLocaleString() + ' — by ' + esc(p.author || '?') +
        ' — <a href="' + esc(p.url) + '" target="_blank" rel="noopener" style="color:#1b9aaa">View on Steam</a>' +
        (p.analyzedAt ? ' — <span style="color:#2ecc71">✓ Analyzed ' + new Date(p.analyzedAt).toLocaleString() + '</span>' : '');
      document.getElementById('gi-steam-detail-raw').textContent = p.contents;

      // Render parsed summary
      var parsed = p.parsed || {};
      var types = parsed.types || {};
      var html = '<div style="margin-bottom:12px">';
      html += '<div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">';
      for (var t in types) {
        html += '<div style="text-align:center;padding:8px 14px;border-radius:8px;background:' + (TYPE_CLR[t]||'#666') + '15;border:1px solid ' + (TYPE_CLR[t]||'#666') + '33">';
        html += '<div style="font-size:18px;font-weight:700;color:' + (TYPE_CLR[t]||'#aaa') + '">' + types[t] + '</div>';
        html += '<div style="font-size:10px;opacity:0.7;text-transform:uppercase">' + t + '</div></div>';
      }
      html += '</div>';
      if (parsed.allTerms && parsed.allTerms.length > 0) {
        html += '<div style="font-size:12px;opacity:0.7;margin-bottom:4px">Game terms detected (' + parsed.allTerms.length + '):</div>';
        html += '<div style="display:flex;gap:4px;flex-wrap:wrap">';
        parsed.allTerms.slice(0, 60).forEach(function(term) {
          html += '<span style="font-size:10px;padding:2px 8px;border-radius:10px;background:rgba(230,126,34,0.12);color:#e67e22;border:1px solid rgba(230,126,34,0.25)">' + esc(term) + '</span>';
        });
        if (parsed.allTerms.length > 60) html += '<span style="font-size:10px;opacity:0.5">+' + (parsed.allTerms.length - 60) + ' more</span>';
        html += '</div>';
      }
      html += '</div>';
      document.getElementById('gi-steam-detail-parsed').innerHTML = html;
    } catch(e) { document.getElementById('gi-steam-detail-title').textContent = 'Error: ' + e.message; }
  };

  window.guideIndexerAnalyzeSteamPatch = async function() {
    if (!_viewingPatchGid) return;
    var btn = document.getElementById('gi-steam-analyze-btn');
    btn.disabled = true; btn.textContent = '⏳ Analyzing...';
    try {
      var r = await fetch(API + '/steam-patches/' + _viewingPatchGid + '/analyze', { method: 'POST', headers: {'Content-Type':'application/json'} });
      var d = await r.json();
      if (d.success) {
        showToast(d.analysis.guidesAffected + ' guide(s) affected', 'success');
        document.getElementById('gi-steam-modal').style.display = 'none';
        renderAnalysisDetail(d.analysis);
        load();
      } else showToast(d.error || 'Analysis failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
    btn.disabled = false; btn.textContent = '🔍 Analyze This Patch';
  };

  window.guideIndexerAnalyzeSteamPatchDirect = async function(gid) {
    if (!confirm('Run AI analysis on this patch note?')) return;
    try {
      showToast('Analyzing patch...', 'info');
      var r = await fetch(API + '/steam-patches/' + gid + '/analyze', { method: 'POST', headers: {'Content-Type':'application/json'} });
      var d = await r.json();
      if (d.success) {
        showToast(d.analysis.guidesAffected + ' guide(s) affected', 'success');
        renderAnalysisDetail(d.analysis);
        load();
      } else showToast(d.error || 'Analysis failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  window.guideIndexerNotifyPatch = async function(gid) {
    if (!gid) return;
    // Show preview first
    try {
      var pr = await fetch(API + '/steam-patches/' + gid + '/notify-preview', { method: 'POST', headers: {'Content-Type':'application/json'} });
      var pd = await pr.json();
      if (pd.success) {
        var msg = 'Notification Preview:\\n\\n';
        msg += 'Will notify: ' + pd.wouldNotify + ' guide(s)\\n';
        if (pd.preview.filter(function(p){return p.onCooldown}).length > 0) msg += 'On cooldown (skipped): ' + pd.preview.filter(function(p){return p.onCooldown}).length + '\\n';
        msg += '\\nGuides to notify:\\n';
        pd.preview.filter(function(p){return !p.onCooldown}).slice(0,15).forEach(function(p) {
          msg += '  • ' + p.title + ' (' + p.matches + ' matching terms)\\n';
        });
        if (pd.wouldNotify === 0) { showToast('No guides to notify (all on cooldown or no matches)', 'info'); return; }
        if (!confirm(msg + '\\nSend notifications?')) return;
      }
    } catch(e) { /* preview failed, fallback to direct confirm */ if (!confirm('Post patch update notifications in all affected guide threads?')) return; }
    try {
      showToast('Notifying guide threads...', 'info');
      var r = await fetch(API + '/steam-patches/' + gid + '/notify', { method: 'POST', headers: {'Content-Type':'application/json'} });
      var d = await r.json();
      if (d.success) {
        var details = d.results ? ' (Sent: ' + (d.results.filter(function(r){return r.status==='sent'}).length) + ', Skipped: ' + d.skipped + ')' : '';
        showToast('Notified ' + d.notified + ' guide(s)' + details, 'success');
        load();
      } else showToast(d.error || 'Notify failed', 'error');
    } catch(e) { showToast('Error: ' + e.message, 'error'); }
  };

  // ── Keyboard Shortcuts ──
  document.addEventListener('keydown', function(e) {
    // Skip if user is typing in an input/textarea
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.tagName === 'SELECT') return;
    // Skip if any modal is open
    if (document.querySelector('[id$="-modal"][style*="flex"]')) return;
    var key = e.key.toLowerCase();
    if (key === 's' && !e.ctrlKey && !e.metaKey) { e.preventDefault(); guideIndexerScan(); }
    else if (key === 'b') { e.preventDefault(); guideIndexerBump(); }
    else if (key === 'i') { e.preventDefault(); guideIndexerFetchIdleon(); }
    else if (key === 'p') { e.preventDefault(); document.getElementById('gi-patch-modal').style.display = 'flex'; }
    else if (key === '/') { e.preventDefault(); var si = document.getElementById('gi-search'); if (si) { si.focus(); si.select(); } }
    else if (key === 'escape') {
      var modals = document.querySelectorAll('[id$="-modal"]');
      modals.forEach(function(m) { if (m.style.display === 'flex') m.style.display = 'none'; });
    }
  });

  // ── Status Indicator ──
  function updateStatusIndicator() {
    var dot = document.getElementById('gi-status-indicator');
    if (!dot) return;
    var guideCount = parseInt(document.getElementById('gi-stat-guides').textContent) || 0;
    if (guideCount > 0) { dot.className = 'gi-status-dot online'; dot.title = 'Active - ' + guideCount + ' guides indexed'; }
    else { dot.className = 'gi-status-dot warning'; dot.title = 'No guides indexed yet'; }
  }

  // ── Loading skeletons ──
  var skeletonTargets = ['gi-guides-list', 'gi-analyses-list', 'gi-notify-history', 'gi-idleon-terms-list'];
  skeletonTargets.forEach(function(id) {
    var el = document.getElementById(id);
    if (el && (!el.innerHTML || el.innerHTML.includes('Loading') || el.innerHTML.includes('No '))) {
      el.innerHTML = '<div class="gi-skeleton" style="width:80%"></div><div class="gi-skeleton" style="width:60%"></div><div class="gi-skeleton" style="width:70%"></div>';
    }
  });

  // Wrap load to update status indicator after loading
  var _origLoad = load;
  load = async function() {
    await _origLoad();
    updateStatusIndicator();
  };

  load();
})();
</script>
</div>`;
}

